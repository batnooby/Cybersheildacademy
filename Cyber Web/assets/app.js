/* ==========================================================================
   CyberShield Academy — application shell, router, progress and content pages
   ========================================================================== */
window.CSA = (function () {
  'use strict';

  var DATA = window.CSA_DATA || { site: {}, attacks: [], games: {} };
  var SITE = DATA.site || {};
  var ATTACKS = DATA.attacks || [];
  var GAMES = DATA.games || {};

  var STORE_KEY = 'csa.progress.v1';
  var THEME_KEY = 'csa.theme';
  var XP_PER_LEVEL = 500;

  var defaultProgress = {
    xp: 0,
    level: 1,
    streak: 0,
    lastActive: null,
    badges: [],
    bookmarks: [],
    quizDone: [],
    pathProgress: {},
    gameBest: {},
    selfCheck: {},
    hintsUsed: 0
  };

  var state = {
    route: '',
    booted: false,
    domainFilter: '',
    difficultyFilter: '',
    libraryQuery: '',
    glossaryQuery: '',
    selfCheck: {},
    listRendered: false,
    mapFilter: '',
    mapRegion: ''
  };

  /* ---------- tiny helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function attr(value) { return esc(value); }
  function byId(id) { return ATTACKS.find(function (a) { return a.id === id; }); }
  function levelClass(level) {
    return ({ Beginner: 'success', Intermediate: 'accent', Advanced: 'violet' })[level] || '';
  }
  function severityClass(sev) {
    return ({ Low: 'success', Medium: 'warning', High: 'warning', Critical: 'danger' })[sev] || '';
  }
  function badge(text, cls) { return '<span class="badge ' + (cls || '') + '">' + esc(text) + '</span>'; }
  function levelFromXp(xp) { return Math.floor(xp / XP_PER_LEVEL) + 1; }
  function xpInLevel(xp) { return xp % XP_PER_LEVEL; }
  function todayKey() { return new Date().toISOString().slice(0, 10); }
  function yesterdayKey() { var d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }
  function toast(message) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('show'); }, 2800);
  }

  /* ---------- persistence ---------- */
  var store = {
    load: function () {
      try {
        var raw = localStorage.getItem(STORE_KEY);
        if (!raw) return Object.assign({}, defaultProgress);
        return Object.assign({}, defaultProgress, JSON.parse(raw));
      } catch (e) { return Object.assign({}, defaultProgress); }
    },
    save: function (p) {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch (e) { /* private mode */ }
      updateHeader();
    },
    get: function () { return this._p || (this._p = this.load()); },
    update: function (fn) {
      var p = this.get();
      fn(p);
      p.level = levelFromXp(p.xp);
      this.save(p);
      return p;
    },
    reset: function () {
      this._p = Object.assign({}, defaultProgress);
      this.save(this._p);
    }
  };

  function addXp(amount, reason) {
    var p = store.update(function (x) { x.xp += amount; });
    if (reason) toast('+' + amount + ' XP — ' + reason);
    checkAchievements(p);
    updateHeader();
    return p;
  }

  function unlock(id) {
    var p = store.get();
    if (p.badges.indexOf(id) !== -1) return false;
    var def = (SITE.achievements || []).find(function (a) { return a.id === id; });
    store.update(function (x) { x.badges.push(id); });
    if (def) toast('Badge unlocked: ' + def.icon + ' ' + def.name);
    return true;
  }

  function checkAchievements(p) {
    if (p.quizDone.length >= 1) unlock('scholar');
    if (p.gameBest.phish && p.gameBest.phish.score >= 80) unlock('phish-spotter');
    if (p.gameBest.ir) unlock('calm-under-fire');
    if (p.gameBest.password && p.gameBest.password.strong) unlock('key-master');
    if (p.gameBest.ctf && p.gameBest.ctf.solved >= (GAMES.ctf || []).length) unlock('codebreaker');
    if (p.gameBest.defend && p.gameBest.defend.score >= 100) unlock('network-guardian');
    if (p.gameBest.scenario) unlock('decision-maker');
    if (p.gameBest.trivia && p.gameBest.trivia.score >= 150) unlock('quiz-master');
    if (p.badges.length >= 3) unlock('first-steps');
  }

  function updateHeader() {
    var p = store.get();
    var el = $('#headerXp');
    if (el) el.textContent = p.level + ' · ' + p.xp + ' XP';
  }

  function updateStreak() {
    store.update(function (p) {
      var today = todayKey();
      if (p.lastActive === today) return;
      p.streak = p.lastActive === yesterdayKey() ? (p.streak || 0) + 1 : 1;
      p.lastActive = today;
    });
  }

  /* ---------- data loading (JSON when served, inline fallback otherwise) ---------- */
  function loadRemoteData() {
    if (location.protocol === 'file:' || typeof fetch !== 'function') return;
    Promise.all([
      fetch('data/site.json').then(function (r) { return r.json(); }),
      fetch('data/attacks.json').then(function (r) { return r.json(); }),
      fetch('data/games.json').then(function (r) { return r.json(); })
    ]).then(function (res) {
      DATA = { site: res[0], attacks: res[1].attacks, games: res[2] };
      SITE = DATA.site; ATTACKS = DATA.attacks; GAMES = DATA.games;
      if (window.Games && window.Games.setData) window.Games.setData(GAMES);
      renderRoute();
    }).catch(function () { /* keep inline data */ });
  }

  /* ---------- chrome ---------- */
  function initChrome() {
    var savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    $('#themeToggle').addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(THEME_KEY, next);
    });

    $('#menuToggle').addEventListener('click', function () {
      var nav = $('#mobileNav');
      var open = nav.hidden;
      nav.hidden = !open;
      this.setAttribute('aria-expanded', String(open));
    });

    $('#searchOpen').addEventListener('click', openSearch);
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-close-search]')) closeSearch();
      var mobileLink = e.target.closest('#mobileNav a');
      if (mobileLink) { $('#mobileNav').hidden = true; $('#menuToggle').setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', function (e) {
      var typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if (e.key === '/' && !typing && $('#searchPanel').hidden) { e.preventDefault(); openSearch(); }
      if (e.key === 'Escape') { closeSearch(); }
      var mapTarget = e.target.closest && e.target.closest('[data-map-region]');
      if (mapTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectMapRegion(mapTarget.getAttribute('data-map-region')); }
    });

    $('#filterDomain').innerHTML += (SITE.domains || []).map(function (d) {
      return '<option value="' + attr(d.id) + '">' + esc(d.id) + '</option>';
    }).join('');

    var searchInput = $('#searchInput');
    searchInput.addEventListener('input', renderSearchPanel);
    $('#filterDomain').addEventListener('change', renderSearchPanel);
    $('#filterDifficulty').addEventListener('change', renderSearchPanel);

    window.addEventListener('scroll', function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
      var bar = $('#readingProgress');
      if (bar) bar.style.width = pct + '%';
    }, { passive: true });

    $('#year').textContent = new Date().getFullYear();
    updateHeader();
  }

  function openSearch() {
    $('#searchPanel').hidden = false;
    $('#searchInput').focus();
    renderSearchPanel();
  }
  function closeSearch() { $('#searchPanel').hidden = true; }

  function searchAll(query, domain, difficulty) {
    var q = (query || '').trim().toLowerCase();
    var results = [];
    ATTACKS.forEach(function (a) {
      if (domain && a.domain !== domain) return;
      if (difficulty && a.difficulty !== difficulty) return;
      var hay = [a.name, a.summary, a.domain, a.type, (a.aliases || []).join(' '), (a.indicators || []).join(' ')].join(' ').toLowerCase();
      if (!q || hay.indexOf(q) !== -1) results.push({ type: 'Attack', title: a.name, sub: a.domain + ' · ' + a.difficulty + ' · ' + a.severity, href: '#/threat/' + a.id });
    });
    (SITE.glossary || []).forEach(function (g) {
      if (q && (g.term + ' ' + g.full + ' ' + g.def).toLowerCase().indexOf(q) === -1) return;
      results.push({ type: 'Term', title: g.term + ' — ' + g.full, sub: g.def.slice(0, 110) + '…', href: '#/glossary' });
    });
    [{ title: 'Incident Response Lifecycle', href: '#/defense' }, { title: 'SOC Roles', href: '#/defense' },
     { title: 'Zero Trust & Defense in Depth', href: '#/defense' }, { title: 'Learning Paths', href: '#/paths' },
     { title: 'Game Arena', href: '#/arena' }, { title: 'Spot the Phish', href: '#/arena/phish' },
     { title: 'Incident Responder', href: '#/arena/ir' }, { title: 'Responsible Learning', href: '#/responsible' }
    ].forEach(function (p) {
      if (!q || p.title.toLowerCase().indexOf(q) !== -1) results.push({ type: 'Guide', title: p.title, sub: 'Guide and training material', href: p.href });
    });
    return results;
  }

  function renderSearchPanel() {
    var q = $('#searchInput').value;
    var d = $('#filterDomain').value;
    var diff = $('#filterDifficulty').value;
    var results = searchAll(q, d, diff).slice(0, 30);
    $('#searchResults').innerHTML = results.length ? results.map(function (r) {
      return '<a class="search-result" href="' + attr(r.href) + '" data-close-search>' +
        '<div><strong>' + esc(r.title) + '</strong><span>' + esc(r.sub) + '</span></div>' + badge(r.type, 'accent') + '</a>';
    }).join('') : '<div class="callout">No matches. Try a broader term or clear the filters.</div>';
  }

  /* ---------- sidebar ---------- */
  function sidebarFor(route) {
    var parts = route.split('/');
    var side = $('#sidebar');
    var layout = $('.page-layout');
    var html = '';
    if (route.indexOf('threat/') === 0) {
      var a = byId(parts[1]);
      html += '<h4>In this page</h4>';
      var toc = [
        ['overview', 'Overview'], ['how-it-works', 'How it works'], ['case-study', 'Case study'],
        ['indicators', 'Warning signs'], ['defense', 'Defensive response'], ['tools', 'Tools'],
        ['deep-dive', 'Deep dives'], ['quiz', 'Mini quiz']
      ];
      html += toc.map(function (t) { return '<a href="#' + t[0] + '" data-jump="' + t[0] + '">' + t[1] + '</a>'; }).join('');
      html += '<hr class="divider">';
    }
    if (route.indexOf('library') === 0 || route.indexOf('threat/') === 0 || route.indexOf('domain/') === 0) {
      var activeDomain = a && a.domain ? a.domain : (route.indexOf('domain/') === 0 ? decodeURIComponent(route.split('/')[1]) : '');
      html += '<h4>Knowledge domains</h4>' + (SITE.domains || []).map(function (d) {
        var active = activeDomain === d.id ? ' active' : '';
        return '<a class="' + active.trim() + '" href="#/domain/' + encodeURIComponent(d.id) + '"><span class="side-icon">' + esc(d.icon) + '</span>' + esc(d.id) + '</a>';
      }).join('');
    } else if (route.indexOf('defense') === 0) {
      html += '<h4>Defense Center</h4>' + [
        ['soc', 'SOC roles'], ['lifecycle', 'IR lifecycle'], ['layers', 'Defense in depth'],
        ['principles', 'Core principles'], ['teams', 'Red / Blue / Purple'], ['frameworks', 'Frameworks']
      ].map(function (t) { return '<a href="#' + t[0] + '" data-jump="' + t[0] + '">' + t[1] + '</a>'; }).join('');
    } else if (route.indexOf('arena') === 0) {
      html += '<h4>Game modes</h4>' + [
        ['arena', 'Arena hub', '#/arena'], ['phish', 'Spot the Phish', '#/arena/phish'],
        ['ir', 'Incident Responder', '#/arena/ir'], ['password', 'Password Fortress', '#/arena/password'],
        ['ctf', 'Beginner CTF', '#/arena/ctf']
      ].map(function (t) { return '<a href="' + t[2] + '" class="' + (route.indexOf('arena/' + t[0]) === 0 || (route === 'arena' && t[0] === 'arena') ? 'active' : '') + '">' + t[1] + '</a>'; }).join('');
    } else {
      side.hidden = true;
      if (layout) layout.classList.add('no-sidebar');
      return;
    }
    side.innerHTML = html;
    side.hidden = false;
    if (layout) layout.classList.remove('no-sidebar');
  }

  /* ---------- page: home ---------- */
  function homePage() {
    var featured = ATTACKS.find(function (a) { return a.featured; }) || ATTACKS[0];
    var tip = (SITE.tips || [])[new Date().getDate() % (SITE.tips || [1]).length];
    return '' +
    '<section class="hero">' +
      '<div class="container hero-grid">' +
        '<div>' +
          '<span class="eyebrow">Free cybersecurity awareness training</span>' +
          '<h1>Understand the threat.<br><em>Master the defense.</em></h1>' +
          '<p class="hero-lead">' + esc(SITE.description) + ' Built for beginners, IT teams, and security pros who want one clear place to learn how attacks really work.</p>' +
          '<div class="hero-actions">' +
            '<a class="btn btn-primary btn-lg" href="#/library">Start Learning <span aria-hidden="true">→</span></a>' +
            '<a class="btn btn-ghost btn-lg" href="#/arena">Play the Arena <span aria-hidden="true">◆</span></a>' +
          '</div>' +
          '<div class="hero-trust"><span>No signup required</span><span>Progress saved locally</span><span>Defensive & ethical</span></div>' +
        '</div>' +
        '<div class="hero-visual" aria-hidden="true">' +
          '<div class="shield-orbit">' +
            '<div class="orbit-ring"></div><div class="orbit-ring two"></div>' +
            '<span class="orbit-dot a"></span><span class="orbit-dot b"></span><span class="orbit-dot c"></span>' +
            '<div class="shield-core"><svg viewBox="0 0 32 32" fill="none"><path d="M16 2 27 7v8c0 7-4.6 12.6-11 15C9.6 27.6 5 22 5 15V7L16 2Z" stroke="currentColor" stroke-width="1.5"/><path d="m10.5 16 3.7 3.7L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>' +
            '<span class="orbit-label one">DETECT</span><span class="orbit-label two">RESPOND</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>' +

    '<section class="section-tight"><div class="container grid grid-4">' +
      (SITE.stats || []).map(function (s) {
        return '<div class="stat"><strong>' + esc(s.value) + '</strong><span>' + esc(s.label) + '</span><small>' + esc(s.detail) + '</small></div>';
      }).join('') +
    '</div></section>' +

    '<section class="section"><div class="container">' +
      '<div class="section-head"><span class="eyebrow">Today&apos;s briefing</span><h2>Learn something useful in five minutes</h2></div>' +
      '<div class="feature-grid">' +
        '<article class="card card-hover spotlight">' +
          '<div class="spotlight-top"><div>' + badge('Threat of the week', 'danger') + '<h3 style="margin-top:12px">' + esc(featured.name) + '</h3></div>' + badge(featured.severity, severityClass(featured.severity)) + '</div>' +
          '<p class="muted">' + esc(featured.summary) + '</p>' +
          '<div class="row" style="margin-top:18px"><a class="btn btn-primary btn-sm" href="#/threat/' + attr(featured.id) + '">Read the briefing →</a><a class="btn btn-ghost btn-sm" href="#/arena/phish">Practice spotting it</a></div>' +
        '</article>' +
        '<article class="card tip-card">' + badge('Daily security tip', 'warning') +
          '<h3 style="margin-top:12px">Small habit, big difference</h3><p class="muted">' + esc(tip) + '</p>' +
          '<p class="tiny muted">Refreshes daily · source: awareness library</p>' +
        '</article>' +
      '</div>' +
      '<div class="card selfcheck" style="margin-top:20px">' +
        '<div class="spread"><div>' + badge('60-second check', 'success') + '<h3 style="margin-top:12px">Am I Safe Online?</h3><p class="muted">Answer honestly — this is private and never leaves your browser.</p></div>' +
        '<div><div class="score-ring" id="selfScore" style="--pct:0"><span id="selfScoreText">0%</span></div><p class="tiny center muted" id="selfScoreLabel">Start when ready</p></div></div>' +
        '<div id="selfCheckList">' + (SITE.selfCheck || []).map(function (q, i) {
          var answer = state.selfCheck[i];
          return '<div class="check-row"><label for="sc' + i + '">' + esc(q.q) + '</label><div class="mini-actions">' +
            '<button type="button" class="mini-btn yes" data-self="' + i + '" data-answer="yes" aria-pressed="' + (answer === 'yes') + '">Yes</button>' +
            '<button type="button" class="mini-btn no" data-self="' + i + '" data-answer="no" aria-pressed="' + (answer === 'no') + '">No</button>' +
          '</div></div>';
        }).join('') + '</div>' +
        '<div id="selfFeedback" class="callout success" hidden></div>' +
      '</div>' +
    '</div></section>' +

    '<section class="section"><div class="container">' +
      '<div class="spread section-head" style="max-width:none"><div><span class="eyebrow">Knowledge library</span><h2>Explore the attack domains</h2><p class="muted">Every domain follows the same structure: what it is, how it works, how we detect it, and how we respond.</p></div><a class="btn btn-ghost" href="#/library">View all attacks →</a></div>' +
      '<div class="grid grid-4">' + (SITE.domains || []).map(function (d) {
        var count = ATTACKS.filter(function (a) { return a.domain === d.id; }).length;
        return '<a class="card card-hover domain-card" href="#/domain/' + encodeURIComponent(d.id) + '">' +
          '<div class="domain-icon" aria-hidden="true">' + esc(d.icon) + '</div><h3>' + esc(d.id) + '</h3><p>' + esc(d.blurb) + '</p><span class="count">' + count + ' attack' + (count === 1 ? '' : 's') + ' covered →</span></a>';
      }).join('') + '</div>' +
    '</div></section>' +

    '<section class="section"><div class="container grid grid-2">' +
      '<div class="card"><span class="eyebrow">Defense Center</span><h3>Think like a defender</h3><p class="muted">Learn how SOC teams triage alerts, run the NIST incident response lifecycle, and build layered controls that actually hold up.</p><a class="btn btn-primary btn-sm" href="#/defense">Enter the Defense Center →</a></div>' +
      '<div class="card" style="background:linear-gradient(150deg,rgba(34,211,238,.12),var(--surface))"><span class="eyebrow">Game Arena</span><h3>Learn by doing, safely</h3><p class="muted">Spot phishing, triage a fake SOC queue, build a strong password, and solve beginner puzzles. All simulations run in your browser with synthetic data.</p><a class="btn btn-ghost btn-sm" href="#/arena">Play the Arena ◆</a></div>' +
    '</div></section>';
  }

  function updateSelfCheck() {
    var total = SITE.selfCheck.length;
    var answered = Object.keys(state.selfCheck).length;
    var score = 0;
    SITE.selfCheck.forEach(function (q, i) { if (state.selfCheck[i] === 'yes') score += q.yes; });
    var pct = Math.round(score);
    var ring = $('#selfScore');
    if (!ring) return;
    ring.style.setProperty('--pct', pct);
    $('#selfScoreText').textContent = pct + '%';
    $('#selfScoreLabel').textContent = answered === total ? 'Self-check complete' : answered + '/' + total + ' answered';
    if (answered === total) {
      var missed = SITE.selfCheck.filter(function (q, i) { return state.selfCheck[i] !== 'yes'; });
      var box = $('#selfFeedback');
      box.hidden = false;
      box.innerHTML = '<strong>' + (pct >= 80 ? 'Strong foundation.' : 'Good start — pick one habit to improve.') + '</strong>' +
        (missed.length ? '<p>' + esc(missed[0].tip) + '</p>' : '<p>Keep practicing. Revisit the Arena weekly to stay sharp.</p>');
      store.update(function (p) { p.selfCheck = state.selfCheck; });
      if (!store.get().selfCheckDone) {
        store.update(function (p) { p.selfCheckDone = true; });
        addXp(20, 'self-check completed');
      }
    }
  }

  /* ---------- page: library ---------- */
  function libraryPage() {
    return '' +
    '<div class="breadcrumb"><a href="#/">Home</a><span aria-hidden="true">/</span><span>Threat Library</span></div>' +
    '<div class="section-head"><span class="eyebrow">Knowledge base</span><h1>Threat Library</h1><p class="muted">Clear, defensive explanations of how attacks work and what good defenders do about them. Choose a domain or search below.</p></div>' +
    '<div class="library-toolbar">' +
      '<input type="search" id="libraryQuery" placeholder="Search attacks, e.g. phishing, ransomware…" aria-label="Search attacks">' +
      '<select id="libraryDifficulty" aria-label="Filter by difficulty"><option value="">Any difficulty</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select>' +
      '<select id="librarySeverity" aria-label="Filter by severity"><option value="">Any severity</option><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select>' +
    '</div>' +
    '<div class="filter-chips" id="domainChips">' +
      '<button type="button" class="chip' + (state.domainFilter ? '' : ' active') + '" data-domain="">All domains</button>' +
      (SITE.domains || []).map(function (d) {
        return '<button type="button" class="chip' + (state.domainFilter === d.id ? ' active' : '') + '" data-domain="' + attr(d.id) + '">' + esc(d.icon) + ' ' + esc(d.id) + '</button>';
      }).join('') +
    '</div>' +
    '<p class="muted small" id="libraryCount" aria-live="polite"></p>' +
    '<div class="grid grid-3" id="libraryGrid"></div>' +
    '<div id="libraryEmpty" class="callout" hidden>No attacks match those filters. Try clearing one.</div>';
  }

  function attackCard(a) {
    var bookmarked = store.get().bookmarks.indexOf(a.id) !== -1;
    return '<article class="card card-hover attack-card">' +
      '<div class="card-top"><div>' + badge(a.domain, 'accent') + '</div>' +
      '<button type="button" class="bookmark" data-bookmark="' + attr(a.id) + '" aria-pressed="' + bookmarked + '" aria-label="Bookmark ' + attr(a.name) + '">' + (bookmarked ? '★' : '☆') + '</button></div>' +
      '<h3><a href="#/threat/' + attr(a.id) + '">' + esc(a.name) + '</a></h3>' +
      '<p>' + esc(a.summary) + '</p>' +
      '<div class="card-foot">' + badge(a.difficulty, levelClass(a.difficulty)) + badge(a.severity, severityClass(a.severity)) + badge(a.type) + '</div>' +
      '<a class="btn btn-ghost btn-sm btn-block" href="#/threat/' + attr(a.id) + '">Open briefing →</a>' +
    '</article>';
  }

  function renderLibraryGrid() {
    var grid = $('#libraryGrid');
    if (!grid) return;
    var q = (state.libraryQuery || '').toLowerCase();
    var list = ATTACKS.filter(function (a) {
      if (state.domainFilter && a.domain !== state.domainFilter) return false;
      if (state.difficultyFilter && a.difficulty !== state.difficultyFilter) return false;
      if (state.severityFilter && a.severity !== state.severityFilter) return false;
      if (q && (a.name + ' ' + a.summary + ' ' + a.domain + ' ' + (a.aliases || []).join(' ')).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    grid.innerHTML = list.map(attackCard).join('');
    $('#libraryCount').textContent = 'Showing ' + list.length + ' of ' + ATTACKS.length + ' attack briefings.';
    $('#libraryEmpty').hidden = list.length > 0;
  }

  /* ---------- page: threat template ---------- */
  function threatPage(a) {
    if (!a) return notFound();
    var bookmarked = store.get().bookmarks.indexOf(a.id) !== -1;
    var related = (a.related || []).map(byId).filter(Boolean);
    var idx = ATTACKS.indexOf(a);
    var prev = ATTACKS[idx - 1];
    var next = ATTACKS[idx + 1];
    return '' +
    '<div class="breadcrumb"><a href="#/">Home</a><span aria-hidden="true">/</span><a href="#/library">Threat Library</a><span aria-hidden="true">/</span><a href="#/library?domain=' + encodeURIComponent(a.domain) + '">' + esc(a.domain) + '</a><span aria-hidden="true">/</span><span>' + esc(a.name) + '</span></div>' +

    '<header class="threat-header" id="overview">' +
      '<div><div class="threat-title-row">' + badge(a.domain, 'accent') + badge(a.type) + '</div>' +
      '<h1>' + esc(a.name) + '</h1><p class="prose muted">' + esc(a.summary) + '</p>' +
      '<div class="threat-meta">' + badge('Difficulty: ' + a.difficulty, levelClass(a.difficulty)) + badge('Severity: ' + a.severity, severityClass(a.severity)) +
      (a.aliases || []).map(function (x) { return badge(x); }).join('') + '</div></div>' +
      '<button type="button" class="bookmark" data-bookmark="' + attr(a.id) + '" aria-pressed="' + bookmarked + '" aria-label="Bookmark this briefing">' + (bookmarked ? '★ Saved' : '☆ Save') + '</button>' +
    '</header>' +

    '<section class="card cheat-sheet">' +
      '<div class="spread"><h3 style="margin:0">⚡ Quick-reference cheat sheet</h3>' + badge('Cheat sheet', 'accent') + '</div>' +
      '<p class="muted" style="margin-top:10px"><strong>' + esc((a.cheatSheet || {}).quick || a.summary) + '</strong></p>' +
      '<div class="cheat-grid">' +
        '<div><h4>Red flags</h4><ul>' + ((a.cheatSheet || {}).redFlags || a.indicators || []).slice(0, 5).map(li).join('') + '</ul></div>' +
        '<div><h4>If you clicked / were affected</h4><ul>' + ((a.cheatSheet || {}).ifClicked || ['Report it', 'Contain the account or host', 'Rotate credentials']).map(li).join('') + '</ul></div>' +
        '<div><h4>Remember</h4><p class="small muted">Attacks are stopped by layers: verify identity, limit access, watch behavior, and rehearse the response.</p></div>' +
      '</div>' +
    '</section>' +

    '<section class="section-tight"><div class="grid grid-2">' +
      '<article class="card"><span class="eyebrow">Plain English</span><h3>What it is</h3><p class="muted">' + esc(a.definition) + '</p></article>' +
      '<article class="card"><span class="eyebrow">Real-world analogy</span><h3>Think of it like this</h3><p class="muted">' + esc(a.analogy) + '</p></article>' +
    '</div></section>' +

    '<section class="section-tight" id="how-it-works">' +
      '<div class="section-head"><span class="eyebrow">How the attack works</span><h2>Step by step, mapped to defender frameworks</h2><p class="muted">This is a conceptual overview for awareness and detection — never a set of instructions for attacking systems.</p></div>' +
      '<div class="card"><h3>Attack flow</h3><div class="flow">' +
        (a.flow || []).map(function (s) {
          return '<div class="flow-step"><b>' + esc(s.n) + '</b><h4>' + esc(s.title) + '</h4><p>' + esc(s.text) + '</p></div>';
        }).join('') +
      '</div></div>' +
      '<div class="grid grid-2" style="margin-top:18px">' +
        '<div class="card"><h3>MITRE ATT&amp;CK mapping</h3><div class="stack">' +
          (a.mitre || []).map(function (m) {
            return '<div class="tool-row"><b>' + esc(m.id) + '</b><span><strong>' + esc(m.name) + '</strong> — ' + esc(m.note) + '</span></div>';
          }).join('') +
        '</div></div>' +
        '<div class="card"><h3>Cyber Kill Chain stages</h3><div class="row">' +
          (a.killChain || []).map(function (k, i) { return '<span class="badge ' + (i % 2 ? 'accent' : '') + '">' + esc(k) + '</span>'; }).join('') +
        '</div><p class="small muted" style="margin-top:16px">Frameworks help defenders talk precisely about where an attack is happening and which control should stop it.</p></div>' +
      '</div>' +
    '</section>' +

    (a.caseStudy ? '<section class="section-tight" id="case-study"><article class="card case-study"><span class="eyebrow">Real-world case study · ' + esc(a.caseStudy.year) + '</span><h2>' + esc(a.caseStudy.title) + '</h2><p class="muted">' + esc(a.caseStudy.summary) + '</p><p class="muted"><strong>Impact:</strong> ' + esc(a.caseStudy.impact) + '</p><p class="muted"><strong>Lesson:</strong> ' + esc(a.caseStudy.lesson) + '</p></article></section>' : '') +

    '<section class="section-tight" id="indicators">' +
      '<div class="section-head"><span class="eyebrow">Warning signs</span><h2>Indicators of compromise</h2><p class="muted">No single signal proves an incident. Correlate several indicators before deciding how to respond.</p></div>' +
      '<div class="card"><ul class="ioc-list">' + (a.indicators || []).map(li).join('') + '</ul></div>' +
    '</section>' +

    '<section class="section-tight" id="defense">' +
      '<div class="section-head"><span class="eyebrow">Defensive response</span><h2>Prevent, detect, respond</h2><p class="muted">A balanced program invests in all three. Controls fail; detection and response are what make failure survivable.</p></div>' +
      '<div class="defense-grid">' +
        '<div class="defense-col"><h3>🛡 Prevention</h3><ul>' + ((a.defense || {}).prevention || []).map(li).join('') + '</ul></div>' +
        '<div class="defense-col"><h3>🔎 Detection</h3><ul>' + ((a.defense || {}).detection || []).map(li).join('') + '</ul></div>' +
        '<div class="defense-col"><h3>🚑 Incident response</h3><ul>' + ((a.defense || {}).response || []).map(li).join('') + '</ul></div>' +
      '</div>' +
    '</section>' +

    '<section class="section-tight" id="tools">' +
      '<div class="section-head"><span class="eyebrow">Toolbox</span><h2>Recommended tools by category</h2><p class="muted">Examples only — choose tools that fit your environment, budget, and threat model.</p></div>' +
      '<div class="card">' + (a.tools || []).map(function (t) { return '<div class="tool-row"><b>' + esc(t.category) + '</b><span>' + esc(t.examples) + '</span></div>'; }).join('') + '</div>' +
    '</section>' +

    ((a.variants && a.variants.length) ? '<section class="section-tight"><div class="section-head"><span class="eyebrow">Variations</span><h2>Related forms</h2></div><div class="grid grid-3">' +
      a.variants.map(function (v) { return '<div class="card"><h3>' + esc(v.name) + '</h3><p class="muted small">' + esc(v.text) + '</p></div>'; }).join('') + '</div></section>' : '') +

    ((a.deepDives && a.deepDives.length) ? '<section class="section-tight" id="deep-dive"><div class="section-head"><span class="eyebrow">Deep dive</span><h2>For advanced readers</h2></div>' +
      a.deepDives.map(function (d) { return '<details class="accordion"><summary>' + esc(d.title) + '</summary><div class="acc-body">' + esc(d.text) + '</div></details>'; }).join('') + '</section>' : '') +

    (related.length ? '<section class="section-tight"><div class="section-head"><span class="eyebrow">Keep exploring</span><h2>Related attacks</h2></div><div class="related-links">' +
      related.map(function (r) { return '<a class="btn btn-ghost btn-sm" href="#/threat/' + attr(r.id) + '">' + esc(r.name) + ' →</a>'; }).join('') + '</div></section>' : '') +

    '<section class="section-tight" id="quiz"><div class="card">' +
      '<span class="eyebrow">Check your understanding</span><h2>Mini quiz</h2><p class="muted">Instant explanations — you cannot break anything here.</p>' +
      (a.quiz || []).map(function (q, qi) { return quizMarkup(a, q, qi); }).join('') +
    '</div></section>' +

    '<nav class="spread section-tight" aria-label="Adjacent briefings">' +
      (prev ? '<a class="btn btn-ghost btn-sm" href="#/threat/' + attr(prev.id) + '">← ' + esc(prev.name) + '</a>' : '<span></span>') +
      (next ? '<a class="btn btn-ghost btn-sm" href="#/threat/' + attr(next.id) + '">' + esc(next.name) + ' →</a>' : '<span></span>') +
    '</nav>';
  }

  function li(text) { return '<li>' + esc(text) + '</li>'; }

  function quizMarkup(attack, q, qi) {
    var letters = ['A', 'B', 'C', 'D', 'E'];
    return '<div class="ctf-puzzle" data-quiz-block="' + attr(attack.id) + '-' + qi + '">' +
      '<p class="quiz-q">' + (qi + 1) + '. ' + esc(q.q) + '</p>' +
      '<div class="quiz-options">' + q.options.map(function (o, oi) {
        return '<button type="button" class="quiz-option" data-quiz="' + attr(attack.id) + '" data-q="' + qi + '" data-o="' + oi + '"><span class="key">' + letters[oi] + '</span>' + esc(o) + '</button>';
      }).join('') + '</div><div class="quiz-feedback" aria-live="polite"></div></div>';
  }

  function handleQuizClick(btn) {
    var attackId = btn.getAttribute('data-quiz');
    var qi = Number(btn.getAttribute('data-q'));
    var oi = Number(btn.getAttribute('data-o'));
    var attack = byId(attackId);
    var q = attack.quiz[qi];
    var block = btn.closest('[data-quiz-block]');
    if (block.dataset.answered === 'true') return;
    block.dataset.answered = 'true';
    $$('.quiz-option', block).forEach(function (b, i) {
      b.disabled = true;
      if (i === q.answer) b.classList.add('correct');
      else if (i === oi) b.classList.add('wrong');
    });
    $('.quiz-feedback', block).innerHTML = '<div class="quiz-explain"><strong>' + (oi === q.answer ? 'Correct.' : 'Not quite — the answer is ' + String.fromCharCode(65 + q.answer) + '.') + '</strong> ' + esc(q.explain) + '</div>';
    var key = attackId + ':' + qi;
    var p = store.get();
    if (p.quizDone.indexOf(key) === -1) {
      store.update(function (x) {
        x.quizDone.push(key);
        if (x.quizDone.filter(function (k) { return k.indexOf(attackId + ':') === 0; }).length === attack.quiz.length && x.quizDone.indexOf(attackId) === -1) {
          x.quizDone.push(attackId);
        }
      });
      addXp(15, 'quiz answer');
      checkAchievements(store.get());
    }
  }

  /* ---------- page: defense center ---------- */
  function defensePage() {
    var d = SITE.defense || {};
    return '' +
    '<div class="breadcrumb"><a href="#/">Home</a><span aria-hidden="true">/</span><span>Defense Center</span></div>' +
    '<div class="section-head"><span class="eyebrow">Blue team operations</span><h1>Defense Center</h1><p class="muted">How real defensive teams are organized, how incidents flow, and which layers and frameworks turn good intentions into repeatable security.</p></div>' +

    '<section class="section-tight" id="soc"><div class="section-head"><span class="eyebrow">People</span><h2>How a SOC works</h2><p class="muted">A Security Operations Center is a team, a process, and a set of tools working together. Each role has a different time horizon.</p></div>' +
      '<div class="grid grid-3">' + (d.socRoles || []).map(function (r) {
        return '<article class="card card-hover">' + badge(r.tag, 'accent') + '<h3 style="margin-top:12px">' + esc(r.name) + '</h3><p class="muted small">' + esc(r.text) + '</p></article>';
      }).join('') + '</div>' +
    '</section>' +

    '<section class="section-tight" id="lifecycle"><div class="section-head"><span class="eyebrow">Process</span><h2>Incident Response lifecycle</h2><p class="muted">Based on the NIST model. Select a phase to see what happens and what it produces. Preparation and lessons learned are what make the next incident easier.</p></div>' +
      '<div class="interactive-ir"><div class="stack" role="group" aria-label="Incident response phases">' +
        (d.lifecycle || []).map(function (p, i) {
          return '<button type="button" class="ir-node' + (i === 0 ? ' active' : '') + '" data-ir="' + i + '" aria-pressed="' + (i === 0) + '"><span class="num">' + p.n + '</span><span><strong>' + esc(p.name) + '</strong><small>' + esc(p.text.slice(0, 72)) + '…</small></span></button>';
        }).join('') +
      '</div><div class="ir-detail" id="irDetail" aria-live="polite"></div></div>' +
    '</section>' +

    '<section class="section-tight" id="layers"><div class="section-head"><span class="eyebrow">Architecture</span><h2>Defense in depth</h2><p class="muted">Each layer assumes the one above it can fail. Together they slow an attacker and create more chances to detect them.</p></div>' +
      '<div class="grid grid-2"><div class="layer-stack">' + (d.layers || []).map(function (l) {
        return '<div class="layer-item"><span class="layer-icon" aria-hidden="true">' + esc(l.icon) + '</span><div><b>' + esc(l.name) + '</b><span>' + esc(l.text) + '</span></div></div>';
      }).join('') + '</div><div class="card"><h3>Why layering works</h3><p class="muted">A phishing message may bypass email filters, but MFA stops credential reuse, EDR spots suspicious execution, segmentation limits spread, and backups enable recovery. No single control is perfect — the system is.</p><div class="callout"><strong>Think in terms of blast radius:</strong> if this control fails, how far can an attacker get?</div></div></div>' +
    '</section>' +

    '<section class="section-tight" id="principles"><div class="section-head"><span class="eyebrow">Fundamentals</span><h2>Five principles to carry everywhere</h2></div><div class="grid grid-3">' +
      (d.principles || []).map(function (p, i) { return '<article class="card"><span class="badge accent">' + (i + 1) + '</span><h3 style="margin-top:12px">' + esc(p.name) + '</h3><p class="muted small">' + esc(p.text) + '</p></article>'; }).join('') +
    '</div></section>' +

    '<section class="section-tight" id="teams"><div class="section-head"><span class="eyebrow">Working together</span><h2>Red, Blue, Purple</h2></div><div class="grid grid-3">' +
      (d.teams || []).map(function (t) { return '<article class="card"><h3>' + esc(t.name) + '</h3><p class="muted small">' + esc(t.text) + '</p></article>'; }).join('') +
    '</div><div class="callout" style="margin-top:16px"><strong>Authorized exercises only.</strong> Red team work requires written scope, legal review, and a stop condition. Curiosity is not permission to test systems you do not own.</div></section>' +

    '<section class="section-tight" id="frameworks"><div class="section-head"><span class="eyebrow">Governance</span><h2>Compliance & frameworks, briefly</h2><p class="muted">Frameworks are maps, not destinations. Pick what fits your risk and regulatory context.</p></div>' +
      '<div class="card" style="overflow-x:auto"><table class="framework-table"><thead><tr><th>Framework</th><th>What it helps with</th></tr></thead><tbody>' +
      (d.frameworks || []).map(function (f) { return '<tr><td>' + esc(f.name) + '</td><td>' + esc(f.text) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' +
    '</section>' +

    '<section class="section-tight"><div class="card" style="background:linear-gradient(140deg,var(--accent-soft),var(--surface))"><div class="spread"><div><h3>Ready to practice triage?</h3><p class="muted">Play a simulated SOC shift: read synthetic logs, decide containment steps, and see instant explanations.</p></div><a class="btn btn-primary" href="#/arena/ir">Open Incident Responder →</a></div></div></section>';
  }

  function threatMapPage() {
    var spots = SITE.threatMap || [];
    var total = spots.reduce(function (sum, s) { return sum + (Number(s.count) || 0); }, 0);
    var filters = ['', 'Critical', 'High', 'Medium', 'Low'].map(function (sev) {
      var label = sev || 'All';
      return '<button type="button" class="tab' + (state.mapFilter === sev ? ' active' : '') + '" data-map-filter="' + attr(sev) + '" aria-pressed="' + (state.mapFilter === sev) + '">' + esc(label) + '</button>';
    }).join('');
    return '' +
    '<div class="breadcrumb"><a href="#/">Home</a><span aria-hidden="true">/</span><a href="#/defense">Defense Center</a><span aria-hidden="true">/</span><span>Threat Map</span></div>' +
    '<div class="section-head"><span class="eyebrow">Situational awareness</span><h1>Threat Map</h1><p class="muted">A stylized training view of where different attack patterns are being reported. Signals are synthetic examples designed to practice triage, not live intelligence.</p></div>' +
    '<section class="section-tight">' +
      '<div class="map-toolbar"><div class="tabs" role="group" aria-label="Filter threat map by severity">' + filters + '</div><span class="tiny muted">' + total.toLocaleString() + ' synthetic signals</span></div>' +
      '<div class="threat-map-layout">' +
        '<div class="map-canvas">' +
          '<svg class="world-map" viewBox="0 0 100 50" role="img" aria-label="Stylized world map with simulated threat signals">' +
            '<g class="map-grid"><path d="M0 10H100M0 20H100M0 30H100M0 40H100M10 0V50M25 0V50M40 0V50M55 0V50M70 0V50M85 0V50"/></g>' +
            '<g class="map-land"><path d="M8 11 19 7 29 10 33 16 27 23 19 23 14 18Z"/><path d="M26 27 34 25 37 33 32 45 27 39Z"/><path d="M46 12 55 9 62 12 60 18 50 19Z"/><path d="M50 21 62 20 66 31 59 42 51 36Z"/><path d="M62 10 87 8 94 17 84 26 69 25 62 18Z"/><path d="M85 35 94 34 96 40 88 43Z"/></g>' +
            spots.map(function (s) {
              var visible = !state.mapFilter || s.severity === state.mapFilter;
              return '<g class="map-marker severity-' + attr(String(s.severity).toLowerCase()) + (state.mapRegion === s.id ? ' selected' : '') + '" data-map-region="' + attr(s.id) + '" data-map-severity="' + attr(s.severity) + '" style="display:' + (visible ? '' : 'none') + ';' + '" transform="translate(' + Number(s.x) + ' ' + Number(s.y) + ')" tabindex="0" role="button" aria-label="' + attr(s.region + ': ' + s.signal + ', ' + s.severity) + '"><title>' + esc(s.region + ' — ' + s.signal) + '</title><circle class="marker-pulse" r="4"/><circle class="marker-core" r="1.6"/></g>';
            }).join('') +
          '</svg>' +
          '<div class="map-legend"><span><i class="dot severity-critical"></i>Critical</span><span><i class="dot severity-high"></i>High</span><span><i class="dot severity-medium"></i>Medium</span><span><i class="dot severity-low"></i>Low</span></div>' +
        '</div>' +
        '<aside class="map-detail" id="mapDetail" aria-live="polite"></aside>' +
      '</div>' +
      '<div class="grid grid-4" style="margin-top:18px">' + spots.map(function (s) {
        var visible = !state.mapFilter || s.severity === state.mapFilter;
        return '<button type="button" class="map-region-card' + (state.mapRegion === s.id ? ' active' : '') + '" data-map-region="' + attr(s.id) + '" data-map-severity="' + attr(s.severity) + '"' + (visible ? '' : ' hidden') + '>' +
          '<span class="eyebrow">' + esc(s.region) + '</span><strong>' + esc(s.signal) + '</strong>' +
          '<div class="row" style="margin:8px 0">' + badge(s.severity, severityClass(s.severity)) + badge(s.trend, 'accent') + '</div>' +
          '<span class="tiny muted">' + Number(s.count).toLocaleString() + ' simulated reports</span></button>';
      }).join('') + '</div>' +
      '<div class="callout warning" style="margin-top:18px"><strong>Demo data:</strong> markers, counts, and trends are fixed teaching examples. Connect an approved, consented threat-intel feed before using any map operationally.</div>' +
    '</section>';
  }

  function renderMapDetail(id) {
    var el = $('#mapDetail');
    var spot = (SITE.threatMap || []).find(function (s) { return s.id === id; });
    if (!el || !spot) return;
    var attack = byId(spot.attack);
    el.innerHTML = '<span class="eyebrow">Selected region</span><h3>' + esc(spot.region) + '</h3>' +
      '<h4 style="margin:10px 0">' + esc(spot.signal) + '</h4>' +
      '<div class="row" style="margin-bottom:12px">' + badge(spot.severity, severityClass(spot.severity)) + badge(spot.trend, 'accent') + '</div>' +
      '<p class="muted small">' + esc(spot.text) + '</p>' +
      '<div class="stat"><strong>' + Number(spot.count).toLocaleString() + '</strong><span>simulated reports</span></div>' +
      '<div class="row" style="margin-top:16px">' + (attack ? '<a class="btn btn-sm btn-primary" href="#/threat/' + encodeURIComponent(attack.id) + '">Study ' + esc(attack.name) + ' →</a>' : '') + '<a class="btn btn-sm btn-ghost" href="#/arena/ir">Practice triage</a></div>';
  }

  function selectMapRegion(id) {
    var spots = SITE.threatMap || [];
    var chosen = spots.find(function (s) { return s.id === id; });
    if (!chosen || (state.mapFilter && chosen.severity !== state.mapFilter)) return;
    state.mapRegion = id;
    $$('[data-map-region]').forEach(function (el) {
      el.classList.toggle('selected', el.getAttribute('data-map-region') === id);
      el.classList.toggle('active', el.getAttribute('data-map-region') === id);
    });
    renderMapDetail(id);
  }

  function applyMapFilter(filter, preferredId) {
    state.mapFilter = filter || '';
    $$('[data-map-filter]').forEach(function (b) {
      var active = b.getAttribute('data-map-filter') === state.mapFilter;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    var visible = (SITE.threatMap || []).filter(function (s) { return !state.mapFilter || s.severity === state.mapFilter; });
    $$('[data-map-region]').forEach(function (el) {
      var show = visible.some(function (s) { return s.id === el.getAttribute('data-map-region'); });
      if (el.tagName.toLowerCase() === 'g') el.style.display = show ? '' : 'none';
      else el.hidden = !show;
    });
    var chosen = visible.find(function (s) { return s.id === preferredId; }) || visible[0];
    if (chosen) selectMapRegion(chosen.id);
    else if ($('#mapDetail')) $('#mapDetail').innerHTML = '<div class="callout">No signals match this severity filter.</div>';
  }

  function renderIrDetail(index) {
    var el = $('#irDetail');
    var phase = (SITE.defense.lifecycle || [])[index];
    if (!el || !phase) return;
    $$('.ir-node').forEach(function (b, i) {
      b.classList.toggle('active', i === index);
      b.setAttribute('aria-pressed', String(i === index));
    });
    el.innerHTML = '<span class="eyebrow">Phase ' + phase.n + ' of ' + (SITE.defense.lifecycle || []).length + '</span><h3>' + esc(phase.name) + '</h3><p class="muted">' + esc(phase.text) + '</p><div class="callout success"><strong>Key outputs:</strong> ' + esc(phase.outputs) + '</div>';
  }

  /* ---------- pages: paths, glossary, timeline, resources, responsible, search ---------- */
  function pathsPage() {
    return '' +
    '<div class="breadcrumb"><a href="#/">Home</a><span aria-hidden="true">/</span><span>Learning Paths</span></div>' +
    '<div class="section-head"><span class="eyebrow">Structured learning</span><h1>Learning Paths</h1><p class="muted">Follow a track or build your own. Completing the mini quiz on a threat page marks that topic complete here. Progress is saved in this browser.</p></div>' +
    '<div class="grid grid-3">' + (SITE.paths || []).map(function (path) {
      var done = (path.steps || []).filter(function (id) { return store.get().quizDone.indexOf(id) !== -1; }).length;
      var pct = Math.round(done / Math.max(1, path.steps.length) * 100);
      var started = store.get().pathProgress[path.id];
      return '<article class="card path-card">' + badge(path.level, levelClass(path.level)) + (started ? badge('In progress', 'accent') : '') +
        '<h3 style="margin-top:12px">' + esc(path.title) + '</h3><p class="muted small">' + esc(path.desc) + '</p>' +
        '<p class="tiny muted">⏱ ' + esc(path.duration) + '</p>' +
        '<div class="path-steps">' + (path.steps || []).map(function (id) {
          var a = byId(id);
          var complete = store.get().quizDone.indexOf(id) !== -1;
          return a ? '<a href="#/threat/' + attr(id) + '" style="' + (complete ? 'color:var(--success);border-color:var(--success)' : '') + '">' + (complete ? '✓ ' : '') + esc(a.name) + '</a>' : '';
        }).join('') + '</div>' +
        '<div class="progress"><span style="width:' + pct + '%"></span></div>' +
        '<p class="tiny muted" style="margin:8px 0 14px">' + done + '/' + path.steps.length + ' topics complete</p>' +
        '<div class="row"><button type="button" class="btn btn-ghost btn-sm" data-path="' + attr(path.id) + '">' + (started ? 'Continue' : 'Start path') + '</button>' +
        '<button type="button" class="btn btn-primary btn-sm" data-certificate="' + attr(path.id) + '"' + (pct < 100 ? ' disabled title="Complete all topics to unlock"' : '') + '>Certificate</button></div>' +
      '</article>';
    }).join('') + '</div>' +
    '<div class="callout" style="margin-top:28px"><strong>Certificates are demo artifacts.</strong> They show completed practice in this local environment and are not an accredited certification.</div>';
  }

  function glossaryPage() {
    return '' +
    '<div class="breadcrumb"><a href="#/">Home</a><span aria-hidden="true">/</span><span>Glossary</span></div>' +
    '<div class="section-head"><span class="eyebrow">Shared language</span><h1>Security Glossary</h1><p class="muted">Hover or focus an underlined term anywhere in the library for a quick definition. Here is the full list.</p></div>' +
    '<input type="search" id="glossaryQuery" placeholder="Filter terms…" aria-label="Filter glossary" style="max-width:420px;margin-bottom:20px">' +
    '<div class="glossary-grid" id="glossaryGrid"></div>';
  }
  function renderGlossary() {
    var el = $('#glossaryGrid');
    if (!el) return;
    var q = (state.glossaryQuery || '').toLowerCase();
    var list = (SITE.glossary || []).filter(function (g) { return !q || (g.term + ' ' + g.full + ' ' + g.def).toLowerCase().indexOf(q) !== -1; });
    el.innerHTML = list.map(function (g) {
      return '<div class="glossary-item"><b>' + esc(g.term) + '</b> <span class="muted tiny">' + esc(g.full) + '</span><small>' + esc(g.def) + '</small></div>';
    }).join('') || '<div class="callout">No terms found.</div>';
  }

  function timelinePage() {
    return '' +
    '<div class="breadcrumb"><a href="#/">Home</a><span aria-hidden="true">/</span><span>Threat Timeline</span></div>' +
    '<div class="section-head"><span class="eyebrow">Context</span><h1>Threat Timeline</h1><p class="muted">A short, educational timeline showing how tactics have evolved. Dates and summaries are illustrative and simplified.</p></div>' +
    '<div class="timeline">' + (SITE.timeline || []).map(function (t) {
      return '<article class="timeline-item"><div class="timeline-year">' + esc(t.year) + '</div><h3>' + esc(t.title) + '</h3><p class="muted">' + esc(t.text) + '</p>' + badge(t.domain, 'accent') + '</article>';
    }).join('') + '</div>' +
    '<div class="callout warning"><strong>Simulated data note:</strong> the timeline and all statistics on this site are for teaching purposes and are not a live intelligence feed.</div>';
  }

  function resourcesPage() {
    return '' +
    '<div class="breadcrumb"><a href="#/">Home</a><span aria-hidden="true">/</span><span>Resources</span></div>' +
    '<div class="section-head"><span class="eyebrow">Keep going</span><h1>Resources Library</h1><p class="muted">Books, courses, certifications, and references worth knowing about. No affiliate links, no product endorsements.</p></div>' +
    '<div class="grid grid-3">' + (SITE.resources || []).map(function (r) {
      return '<article class="card card-hover">' + badge(r.type, r.type === 'Certification' ? 'violet' : 'accent') + '<h3 style="margin-top:12px">' + esc(r.title) + '</h3><p class="muted small">' + esc(r.author) + '</p><p class="small">' + esc(r.note) + '</p></article>';
    }).join('') + '</div>' +
    '<section class="section-tight"><div class="card"><div class="spread"><div><span class="eyebrow">API-ready</span><h3>Latest Threats feed</h3><p class="muted">Placeholder cards. In production, connect a vetted threat-intel or vendor advisory API here and show source + timestamp.</p></div><span class="badge warning">Demo data</span></div>' +
      '<div class="grid grid-3" style="margin-top:16px">' +
        '<div class="callout"><strong>Advisory · Demo</strong><p class="small muted">Increased phishing activity using look-alike domains. Source: sample feed.</p></div>' +
        '<div class="callout"><strong>Advisory · Demo</strong><p class="small muted">Patch priority: internet-facing VPN appliances. Source: sample feed.</p></div>' +
        '<div class="callout"><strong>Advisory · Demo</strong><p class="small muted">Reminder: verify payment changes out of band. Source: sample feed.</p></div>' +
      '</div></div></section>' +
    '<section class="section-tight"><div class="grid grid-2">' +
      '<article class="card"><span class="eyebrow">Stay in the loop</span><h3>Threat briefing newsletter</h3><p class="muted small">Demo form — no email is collected or sent. Connect a consented mailing provider and privacy notice before going live.</p>' +
        '<form id="newsletterForm" class="row" style="align-items:flex-end"><label style="flex:1;min-width:200px"><span class="small muted">Email address</span><input type="email" name="email" placeholder="you@example.com" required style="width:100%"></label>' +
        '<button type="submit" class="btn btn-primary">Subscribe (demo)</button></form><p id="newsletterMsg" class="small muted" style="margin-top:10px" aria-live="polite"></p></article>' +
      '<article class="card"><span class="eyebrow">Community</span><h3>Discussion guidelines</h3><p class="muted small">A future discussion area should be moderated with clear rules:</p><ul class="muted small">' +
        '<li>Ask questions and share defensive takeaways; never post exploitable details.</li>' +
        '<li>No personal data, credentials, or real incident artifacts.</li>' +
        '<li>Assume good intent, cite sources, and keep tone welcoming to beginners.</li>' +
        '<li>Moderators remove harmful content and escalate credible threat reports.</li>' +
      '</ul></article>' +
    '</div></section>';
  }

  function responsiblePage() {
    return '' +
    '<div class="breadcrumb"><a href="#/">Home</a><span aria-hidden="true">/</span><span>Responsible Learning</span></div>' +
    '<div class="section-head"><span class="eyebrow">Read this first</span><h1>Responsible Learning & Legal Notice</h1><p class="muted">CyberShield Academy exists to improve awareness and defensive capability. Everything here is written with that goal in mind.</p></div>' +
    '<div class="grid grid-2">' +
      '<article class="card"><h3>Our commitments</h3><ul class="muted">' +
        '<li>Attacks are described conceptually, at an awareness level.</li>' +
        '<li>No working exploit code, malware source, or instructions for attacking real systems are provided.</li>' +
        '<li>All games run locally in your browser using synthetic, fictional data.</li>' +
        '<li>Nothing is sent to a server; progress stays in your browser storage.</li>' +
        '<li>Every answer includes an explanation so the learning comes first.</li>' +
      '</ul></article>' +
      '<article class="card"><h3>Your responsibilities</h3><ul class="muted">' +
        '<li>Use this knowledge only for systems you own or are explicitly authorized to assess.</li>' +
        '<li>Follow your organization&apos;s policies and obtain written permission for any testing.</li>' +
        '<li>Respect privacy and applicable laws, including computer misuse and data protection rules.</li>' +
        '<li>Report suspected incidents through official channels; do not attempt unauthorized retaliation.</li>' +
        '<li>Do not use fictional scenarios here as a blueprint for real-world harm.</li>' +
      '</ul></article>' +
    '</div>' +
    '<section class="section-tight"><div class="callout danger"><h3>Legal disclaimer</h3><p class="muted">This site is provided for general education and awareness. It is not legal advice, not a substitute for professional security services, and not an authorization to test, scan, or access any system. Laws governing computer use vary by jurisdiction. You are solely responsible for your actions and for complying with all applicable laws, regulations, and organizational policies.</p></div></section>' +
    '<section class="section-tight"><div class="card"><h3>Safe practice rules for the Arena</h3><ol class="muted">' +
      '<li>Use only the in-browser simulations provided here.</li>' +
      '<li>Never paste real passwords, tokens, or personal data into the password or quiz tools.</li>' +
      '<li>Treat all names, domains, logs, and alerts in the games as fictional examples.</li>' +
      '<li>If a lesson mentions a real event, read it as a case study — not as a how-to guide.</li>' +
    '</ol><a class="btn btn-primary btn-sm" href="#/arena">Back to the Arena →</a></div></section>';
  }

  function searchPage() {
    var q = new URLSearchParams((location.hash.split('?')[1] || '')).get('q') || '';
    return '' +
    '<div class="breadcrumb"><a href="#/">Home</a><span aria-hidden="true">/</span><span>Search</span></div>' +
    '<div class="section-head"><span class="eyebrow">Find anything</span><h1>Global Search</h1><p class="muted">Search across attack briefings, glossary terms, and guides.</p></div>' +
    '<div class="library-toolbar"><input type="search" id="pageSearchQuery" placeholder="Type a term…" value="' + attr(q) + '" aria-label="Search query">' +
      '<select id="pageSearchDomain"><option value="">All domains</option>' + (SITE.domains || []).map(function (d) { return '<option>' + attr(d.id) + '</option>'; }).join('') + '</select>' +
      '<select id="pageSearchDifficulty"><option value="">Any difficulty</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>' +
    '<div id="pageSearchResults" aria-live="polite"></div>';
  }
  function renderPageSearch() {
    var el = $('#pageSearchResults');
    if (!el) return;
    var q = $('#pageSearchQuery').value;
    var results = searchAll(q, $('#pageSearchDomain').value, $('#pageSearchDifficulty').value);
    el.innerHTML = '<p class="muted small">' + results.length + ' result' + (results.length === 1 ? '' : 's') + '</p>' +
      (results.length ? '<div class="grid grid-3">' + results.map(function (r) {
        return '<a class="card card-hover" href="' + attr(r.href) + '">' + badge(r.type, 'accent') + '<h3 style="margin-top:10px">' + esc(r.title) + '</h3><p class="muted small">' + esc(r.sub) + '</p></a>';
      }).join('') + '</div>' : '<div class="callout">No results. Try a shorter term.</div>');
  }

  function decorateGlossary(root) {
    if (!root || !root.querySelectorAll) return;
    var terms = (SITE.glossary || []).slice().sort(function (a, b) { return b.term.length - a.term.length; });
    if (!terms.length) return;
    var skip = 'a, button, code, pre, h1, h2, h3, h4, .tooltip, .tip, .badge, .mock-email, .log-panel, .quiz-option, .glossary-item, .flow-step, .defense-col';
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      if (node.nodeType !== 3 || node.nodeValue.trim().length < 8) return;
      var parent = node.parentElement;
      if (!parent || (parent.closest && parent.closest(skip))) return;
      var text = node.nodeValue;
      var lower = text.toLowerCase();
      var found = null;
      terms.forEach(function (t) {
        var idx = lower.indexOf(t.term.toLowerCase());
        if (idx !== -1 && (!found || idx < found.idx)) found = { term: t, idx: idx };
      });
      if (!found) return;
      var before = text.slice(0, found.idx);
      var match = text.slice(found.idx, found.idx + found.term.term.length);
      var after = text.slice(found.idx + found.term.term.length);
      var frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      var span = document.createElement('span');
      span.className = 'tooltip gloss';
      span.tabIndex = 0;
      span.setAttribute('role', 'note');
      span.setAttribute('aria-label', found.term.full + ': ' + found.term.def);
      span.innerHTML = esc(match) + '<span class="tip"><strong>' + esc(found.term.full) + '</strong> — ' + esc(found.term.def) + '</span>';
      frag.appendChild(span);
      if (after) frag.appendChild(document.createTextNode(after));
      node.parentNode.replaceChild(frag, node);
    });
  }

  function domainPage(domainId) {
    var domain = (SITE.domains || []).find(function (d) { return d.id === domainId; });
    if (!domain) return notFound();
    var list = ATTACKS.filter(function (a) { return a.domain === domain.id; });
    var counts = { Beginner: 0, Intermediate: 0, Advanced: 0 };
    list.forEach(function (a) { if (counts[a.difficulty] !== undefined) counts[a.difficulty]++; });
    var sample = list[0];
    var paths = (SITE.paths || []).filter(function (p) {
      return (p.steps || []).some(function (id) { return list.some(function (a) { return a.id === id; }); });
    }).slice(0, 3);
    return '' +
    '<div class="breadcrumb"><a href="#/">Home</a><span aria-hidden="true">/</span><a href="#/library">Threat Library</a><span aria-hidden="true">/</span><span>' + esc(domain.id) + '</span></div>' +
    '<section class="domain-hero">' +
      '<div class="domain-hero-icon" aria-hidden="true">' + esc(domain.icon) + '</div>' +
      '<div><span class="eyebrow">Knowledge domain</span><h1>' + esc(domain.id) + '</h1><p class="muted">' + esc(domain.blurb) + '</p>' +
      '<div class="row" style="margin-top:16px">' + badge(list.length + ' briefings', 'accent') + badge(counts.Beginner + ' beginner', 'success') + badge(counts.Intermediate + ' intermediate', 'warning') + badge(counts.Advanced + ' advanced', 'violet') + '</div></div>' +
    '</section>' +
    '<section class="section-tight"><div class="section-head"><span class="eyebrow">In this domain</span><h2>Attack briefings</h2><p class="muted">Every briefing follows the same structure so you can compare threats without relearning the layout.</p></div>' +
      '<div class="grid grid-3">' + list.map(attackCard).join('') + '</div></section>' +
    (sample ? '<section class="section-tight"><div class="grid grid-2">' +
      '<article class="card"><span class="eyebrow">Defensive mindset</span><h3>What good looks like</h3><ul class="muted">' +
        ((sample.defense || {}).prevention || []).slice(0, 3).map(li).join('') +
      '</ul><p class="tiny muted">Examples drawn from ' + esc(sample.name) + '. Open that briefing for the full plan.</p></article>' +
      '<article class="card"><span class="eyebrow">Practice</span><h3>Turn reading into skill</h3><p class="muted">Apply the ideas in a safe, simulated arena. No real systems are involved.</p>' +
        '<div class="row"><a class="btn btn-primary btn-sm" href="#/arena">Play the Arena →</a><a class="btn btn-ghost btn-sm" href="#/defense">Defense Center</a></div></article>' +
    '</div></section>' : '') +
    (paths.length ? '<section class="section-tight"><div class="section-head"><span class="eyebrow">Where it fits</span><h2>Learning paths covering this domain</h2></div><div class="grid grid-3">' +
      paths.map(function (p) { return '<a class="card card-hover" href="#/paths">' + badge(p.level, levelClass(p.level)) + '<h3 style="margin-top:10px">' + esc(p.title) + '</h3><p class="muted small">' + esc(p.desc) + '</p></a>'; }).join('') +
    '</div></section>' : '') +
    '<div class="row"><a class="btn btn-ghost" href="#/library">← All attack domains</a><a class="btn btn-primary" href="#/library?domain=' + encodeURIComponent(domain.id) + '">Filter library to this domain →</a></div>';
  }

  function notFound() {
    return '<div class="section-head"><span class="eyebrow">404</span><h1>Page not found</h1><p class="muted">That route does not exist. Try the library or the arena.</p></div><div class="row"><a class="btn btn-primary" href="#/library">Browse the library</a><a class="btn btn-ghost" href="#/arena">Play the arena</a></div>';
  }

  /* ---------- certificate ---------- */
  function downloadCertificate(pathId) {
    var path = (SITE.paths || []).find(function (p) { return p.id === pathId; });
    if (!path) return;
    var name = (store.get().learnerName || 'Curious Learner');
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — ' + esc(path.title) + '</title>' +
      '<style>body{font-family:Inter,Arial,sans-serif;text-align:center;padding:70px;color:#0b1a2d;background:#f7fbff}' +
      '.box{border:3px solid #0891b2;border-radius:18px;padding:60px;max-width:800px;margin:auto}' +
      'h1{font-size:44px;margin:0 0 10px;color:#0891b2}.name{font-size:32px;margin:30px 0}' +
      'p{color:#52657e;font-size:16px}.tiny{font-size:12px;margin-top:40px}</style></head><body><div class="box">' +
      '<h1>CyberShield Academy</h1><p>Certificate of Practice Completion</p><div class="name">' + esc(name) + '</div>' +
      '<p>has completed all practice topics in</p><h2>' + esc(path.title) + '</h2><p>' + esc(path.level) + ' · ' + esc(path.duration) + '</p>' +
      '<p class="tiny">Demo certificate issued locally by CyberShield Academy. Not an accredited certification. Date: ' + new Date().toLocaleDateString() + '</p>' +
      '</div></body></html>';
    var blob = new Blob([html], { type: 'text/html' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'cybershield-' + pathId + '-certificate.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Certificate downloaded');
  }

  /* ---------- router ---------- */
  function parseRoute() {
    var raw = location.hash.replace(/^#\/?/, '');
    var query = '';
    var qIndex = raw.indexOf('?');
    if (qIndex !== -1) { query = raw.slice(qIndex + 1); raw = raw.slice(0, qIndex); }
    return { path: raw.replace(/\/$/, ''), query: new URLSearchParams(query) };
  }

  function renderRoute() {
    var parsed = parseRoute();
    var route = parsed.path;
    state.route = route;
    var main = $('#main');
    var html = '';
    var navKey = route.split('/')[0] || 'home';

    if (!route) html = homePage();
    else if (route === 'library') {
      state.domainFilter = parsed.query.get('domain') || '';
      state.difficultyFilter = ''; state.severityFilter = ''; state.libraryQuery = '';
      html = libraryPage();
    }
    else if (route.indexOf('threat/') === 0) html = threatPage(byId(route.split('/')[1]));
    else if (route.indexOf('domain/') === 0) html = domainPage(decodeURIComponent(route.split('/')[1]));
    else if (route === 'defense') html = defensePage();
    else if (route === 'map') html = threatMapPage();
    else if (route === 'paths') html = pathsPage();
    else if (route === 'glossary') html = glossaryPage();
    else if (route === 'timeline') html = timelinePage();
    else if (route === 'resources') html = resourcesPage();
    else if (route === 'responsible') html = responsiblePage();
    else if (route === 'search') html = searchPage();
    else if (route === 'arena' || route.indexOf('arena/') === 0) {
      html = window.Games ? window.Games.render(route) : '<div class="callout">Games are loading…</div>';
    }
    else html = notFound();

    if (window.Games && window.Games.stop) window.Games.stop();
    main.innerHTML = html;
    if (route.indexOf('threat/') === 0 || route === 'defense' || route.indexOf('domain/') === 0) decorateGlossary(main);
    document.body.classList.toggle('arena-mode', route.indexOf('arena') === 0);
    sidebarFor(route);

    $$('.desktop-nav a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === navKey);
    });

    if (route === 'library') {
      renderLibraryGrid();
      var queryInput = $('#libraryQuery');
      queryInput.addEventListener('input', function () { state.libraryQuery = this.value; renderLibraryGrid(); });
      $('#libraryDifficulty').addEventListener('change', function () { state.difficultyFilter = this.value; renderLibraryGrid(); });
      $('#librarySeverity').addEventListener('change', function () { state.severityFilter = this.value; renderLibraryGrid(); });
    }
    if (route.indexOf('threat/') === 0 && SITE.defense) { /* threat page ready */ }
    if (route === 'defense') renderIrDetail(0);
    if (route === 'map') {
      var spots = SITE.threatMap || [];
      var preferred = spots.find(function (s) { return s.id === state.mapRegion; });
      applyMapFilter(state.mapFilter, preferred ? preferred.id : (spots[0] || {}).id);
    }
    if (route === 'glossary') renderGlossary();
    if (route === 'search') renderPageSearch();
    if (route.indexOf('arena') === 0 && window.Games && window.Games.afterRender) window.Games.afterRender(route);

    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    if (main.focus) { main.setAttribute('tabindex', '-1'); }
  }

  /* ---------- delegated interactions ---------- */
  function initDelegation() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action], [data-bookmark], [data-self], [data-domain], [data-quiz], [data-ir], [data-path], [data-certificate], [data-jump], [data-game], [data-answer], [data-next], [data-hint], [data-restart], [data-check-pw], [data-ctf], [data-ir-action], [data-phish-answer], [data-trivia-answer], [data-trivia-next], [data-trivia-mode], [data-card-flip], [data-card-nav], [data-scenario-select], [data-scenario-mode], [data-scenario-choice], [data-scenario-next], [data-defense-select], [data-defense-place], [data-defense-remove], [data-defense-clear], [data-defense-start], [data-defense-next], [data-map-filter], [data-map-region], [data-leader-scope]');
      if (!el) return;
      var action = el.getAttribute('data-action');

      if (el.hasAttribute('data-bookmark')) {
        var id = el.getAttribute('data-bookmark');
        var p = store.get();
        var i = p.bookmarks.indexOf(id);
        store.update(function (x) {
          if (i === -1) x.bookmarks.push(id); else x.bookmarks.splice(i, 1);
        });
        var on = i === -1;
        $$('[data-bookmark="' + id + '"]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(on));
          b.textContent = on ? (b.textContent.indexOf('Save') !== -1 ? '★ Saved' : '★') : (b.textContent.indexOf('Saved') !== -1 ? '☆ Save' : '☆');
        });
        toast(on ? 'Saved to bookmarks' : 'Removed from bookmarks');
        return;
      }
      if (el.hasAttribute('data-self')) {
        var qi = Number(el.getAttribute('data-self'));
        var ans = el.getAttribute('data-answer');
        var was = state.selfCheck[qi];
        state.selfCheck[qi] = was === ans ? undefined : ans;
        if (!state.selfCheck[qi]) delete state.selfCheck[qi];
        $$('[data-self="' + qi + '"]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b.getAttribute('data-answer') === state.selfCheck[qi]));
        });
        updateSelfCheck();
        return;
      }
      if (el.hasAttribute('data-domain')) {
        state.domainFilter = el.getAttribute('data-domain');
        $$('#domainChips .chip').forEach(function (c) { c.classList.toggle('active', c === el); });
        renderLibraryGrid();
        return;
      }
      if (el.hasAttribute('data-map-filter')) { applyMapFilter(el.getAttribute('data-map-filter')); return; }
      if (el.hasAttribute('data-map-region')) { selectMapRegion(el.getAttribute('data-map-region')); return; }
      if (el.hasAttribute('data-quiz')) { handleQuizClick(el); return; }
      if (el.hasAttribute('data-ir')) { renderIrDetail(Number(el.getAttribute('data-ir'))); return; }
      if (el.hasAttribute('data-path')) {
        var pid = el.getAttribute('data-path');
        store.update(function (x) { x.pathProgress[pid] = Date.now(); });
        el.textContent = 'Continue';
        toast('Path started — progress is saved locally');
        return;
      }
      if (el.hasAttribute('data-certificate')) { downloadCertificate(el.getAttribute('data-certificate')); return; }
      if (el.hasAttribute('data-jump')) {
        e.preventDefault();
        var target = document.getElementById(el.getAttribute('data-jump'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (action === 'reset-progress') {
        if (confirm('Reset all local progress, badges, and bookmarks?')) { store.reset(); renderRoute(); toast('Progress reset'); }
        return;
      }
      if (window.Games && window.Games.handleClick && window.Games.handleClick(el, e)) return;
    });

    document.addEventListener('input', function (e) {
      if (e.target.id === 'glossaryQuery') { state.glossaryQuery = e.target.value; renderGlossary(); }
    });
    document.addEventListener('submit', function (e) {
      if (e.target.id !== 'newsletterForm') return;
      e.preventDefault();
      var msg = $('#newsletterMsg');
      if (msg) msg.textContent = 'Demo only: no email was stored or sent. Connect a consented provider before launch.';
      e.target.reset();
    });
  }

  /* ---------- public ---------- */
  function boot() {
    if (state.booted) return;
    state.booted = true;
    state.selfCheck = Object.assign({}, store.get().selfCheck || {});
    initChrome();
    initDelegation();
    if (window.Games && window.Games.setData) window.Games.setData(GAMES);
    window.addEventListener('hashchange', renderRoute);
    updateStreak();
    renderRoute();
    loadRemoteData();
  }

  return {
    boot: boot,
    store: store,
    addXp: addXp,
    unlock: unlock,
    checkAchievements: checkAchievements,
    toast: toast,
    esc: esc,
    data: function () { return DATA; },
    renderRoute: renderRoute,
    byId: byId
  };
})();
