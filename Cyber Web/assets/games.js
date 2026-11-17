/* ==========================================================================
   CyberShield Academy — Game Arena and client-side game logic
   All data is synthetic. No network calls. No real credentials are stored.
   ========================================================================== */
window.Games = (function () {
  'use strict';

  var G = {};
  var timer = null;
  var local = {};
  var App = null;
  var leaderScope = 'all';

  function setData(games) { G = games || {}; App = window.CSA; }
  function esc(s) { return window.CSA ? window.CSA.esc(s) : String(s); }
  function badge(text, cls) { return '<span class="badge ' + (cls || '') + '">' + esc(text) + '</span>'; }
  function site() { return (window.CSA && window.CSA.data().site) || {}; }
  function store() { return window.CSA.store.get(); }
  function clearTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function leaderRows(scope) {
    var p = store();
    var source = site().leaderboard || [];
    var rows;
    if (scope === 'weekly') {
      rows = source.map(function (b) { return { name: b.name, xp: Number(b.weekly) || Math.round((Number(b.xp) || 0) * 0.18), team: b.team }; });
      rows.push({ name: 'You', xp: p.xp || 0, team: 'Local player', me: true });
    } else if (scope === 'teams') {
      var teams = {};
      source.forEach(function (b) {
        var key = b.team || 'Unassigned';
        teams[key] = teams[key] || { name: key, xp: 0, members: 0 };
        teams[key].xp += Number(b.xp) || 0;
        teams[key].members += 1;
      });
      teams['Local player'] = teams['Local player'] || { name: 'Local player', xp: 0, members: 0 };
      teams['Local player'].xp += p.xp || 0;
      teams['Local player'].members += 1;
      rows = Object.keys(teams).map(function (key) { return teams[key]; });
    } else {
      rows = source.map(function (b) { return { name: b.name, xp: Number(b.xp) || 0, team: b.team }; });
      rows.push({ name: 'You', xp: p.xp || 0, team: 'Local player', me: true });
    }
    return rows.sort(function (a, b) { return b.xp - a.xp; }).slice(0, 8);
  }

  function leaderboardHtml() {
    var labels = { all: 'All time', weekly: 'This week', teams: 'Teams' };
    var tabs = Object.keys(labels).map(function (key) {
      return '<button type="button" class="tab' + (leaderScope === key ? ' active' : '') + '" data-leader-scope="' + key + '" aria-pressed="' + (leaderScope === key) + '">' + labels[key] + '</button>';
    }).join('');
    var isTeams = leaderScope === 'teams';
    var headers = isTeams ? ['#', 'Team', 'Members', 'XP'] : ['#', 'Learner', 'Team', 'XP'];
    var rows = leaderRows(leaderScope);
    return '<span class="eyebrow">Leaderboard</span><h3>' + labels[leaderScope] + '</h3>' +
      '<div class="tabs" role="group" aria-label="Leaderboard scope">' + tabs + '</div>' +
      '<table class="leaderboard"><thead><tr>' + headers.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (b, i) {
        return '<tr class="' + (b.me ? 'me' : '') + '"><td>' + (i + 1) + '</td><td>' + esc(b.name) + '</td><td>' + (isTeams ? b.members : esc(b.team || '—')) + '</td><td>' + b.xp + '</td></tr>';
      }).join('') +
      '</tbody></table><p class="tiny muted">' + (isTeams ? 'Sample team totals plus your local team. A backend can replace this with real data.' : 'Sample entries plus your local score. A backend can replace this with real data.') + '</p>';
  }

  function renderLeaderboard() {
    var panel = document.getElementById('leaderboardPanel');
    if (panel) panel.innerHTML = leaderboardHtml();
  }

  /* ---------- Arena hub ---------- */
  function hub() {
    var p = store();
    var level = p.level || 1;
    var pct = Math.round((p.xp % 500) / 5);
    var games = [
      { id: 'phish', icon: '🎣', title: 'Spot the Phish', desc: 'Judge emails, texts, chats, and fake login pages. Learn the tells behind every trick.', meta: '6 scenarios · ~4 min', color: 'danger' },
      { id: 'ir', icon: '🚨', title: 'Incident Responder', desc: 'Read synthetic SOC alerts and logs, then choose containment steps under pressure.', meta: '4 alerts · ~6 min', color: 'warning' },
      { id: 'password', icon: '🏰', title: 'Password Fortress', desc: 'Build a stronger password and see a safe, local strength estimate. Nothing is saved.', meta: 'Unlimited · ~2 min', color: 'success' },
      { id: 'ctf', icon: '🔎', title: 'Beginner CTF', desc: 'Decode simple encodings and analyze tiny log snippets in a sandboxed puzzle set.', meta: '4 puzzles · ~8 min', color: 'violet' },
      { id: 'defend', icon: '🧱', title: 'Defend the Network', desc: 'Place controls on network layers, then survive three waves of simulated attacks.', meta: '3 waves · ~6 min', color: 'accent' },
      { id: 'scenario', icon: '🧭', title: 'Scenario Mode', desc: 'Branching stories where every response changes what happens next. No right answer without context.', meta: '2 stories · ~5 min', color: 'warning' },
      { id: 'trivia', icon: '⚡', title: 'Trivia & Flashcards', desc: 'Timed quick-fire questions, then flip through key terms to reinforce what stuck.', meta: '12 questions + cards · ~5 min', color: 'success' }
    ];

    return '' +
    '<div class="breadcrumb"><a href="#/">Home</a><span aria-hidden="true">/</span><span>Game Arena</span></div>' +
    '<section class="arena-hero">' +
      '<span class="eyebrow">Gamified learning zone</span>' +
      '<h1>Welcome to the <span>Arena</span></h1>' +
      '<p class="muted" style="max-width:62ch">Short, safe simulations that teach judgment. Every answer gets an explanation — the point is not the score, it is the reason behind it.</p>' +
      '<div class="xp-bar"><div class="spread small"><span class="badge accent">Level ' + level + '</span><span class="muted">' + p.xp + ' / ' + ((level) * 500) + ' XP to next level</span></div><div class="progress"><span style="width:' + pct + '%"></span></div></div>' +
      '<div class="row" style="margin-top:22px"><a class="btn btn-primary btn-lg" href="#/arena/phish">Play today&apos;s challenge →</a><a class="btn btn-ghost btn-lg" href="#/paths">See learning paths</a></div>' +
    '</section>' +

    '<div class="player-stats">' +
      '<div class="player-stat"><b>' + level + '</b><span>Level</span></div>' +
      '<div class="player-stat"><b>' + p.xp + '</b><span>Total XP</span></div>' +
      '<div class="player-stat"><b>' + (p.streak || 1) + '🔥</b><span>Day streak</span></div>' +
      '<div class="player-stat"><b>' + (p.badges || []).length + '</b><span>Badges</span></div>' +
    '</div>' +

    '<div class="grid grid-2" style="margin-bottom:34px">' +
      '<section class="game-card" style="min-height:0">' +
        '<span class="eyebrow">Your skill radar</span><h3>Where you are strongest</h3>' +
        '<div class="radar-wrap"><canvas id="skillRadar" width="420" height="320" role="img" aria-label="Skill radar chart showing your progress across six security domains"></canvas></div>' +
      '</section>' +
      '<section class="game-card" style="min-height:0">' +
        '<div class="spread"><div><span class="eyebrow">Daily challenge</span><h3>Quick win</h3></div>' + badge('+40 XP', 'success') + '</div>' +
        '<p>A message says: “Your account will close in 30 minutes. Enter your password here to keep it.” What do you do?</p>' +
        '<div class="callout success"><strong>Answer:</strong> Close it and go to the service through your own bookmark or app. Urgency + password request is a phishing pattern.</div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="daily-claim"' + (store().dailyClaimed === new Date().toISOString().slice(0, 10) ? ' disabled' : '') + '>' +
          (store().dailyClaimed === new Date().toISOString().slice(0, 10) ? 'Claimed today' : 'Claim 40 XP') + '</button>' +
      '</section>' +
    '</div>' +

    '<section class="section-tight"><div class="section-head"><span class="eyebrow">Playable now</span><h2>Choose your game mode</h2></div>' +
      '<div class="grid grid-4">' + games.map(function (g) {
        var best = (p.gameBest || {})[g.id];
        return '<a class="game-card" href="#/arena/' + g.id + '"><div class="game-icon" aria-hidden="true">' + g.icon + '</div>' +
          '<h3>' + esc(g.title) + '</h3><p>' + esc(g.desc) + '</p>' +
          '<div class="game-foot"><span>' + esc(g.meta) + '</span>' + badge(best ? 'Best: ' + best.label : 'New', g.color) + '</div></a>';
      }).join('') + '</div>' +
    '</section>' +

    '<section class="section-tight"><div class="grid grid-2">' +
      '<div class="card"><span class="eyebrow">Missions</span><h3>Progress by domain</h3>' +
        (site().arenaMissions || []).map(function (m) {
          return '<div class="mission-block"><div><strong>' + esc(m.domain) + '</strong><div class="row" style="margin-top:6px">' +
            m.games.map(function (id) {
              var g = games.find(function (x) { return x.id === id; });
              return g ? '<a class="badge accent" href="#/arena/' + id + '">' + esc(g.title) + ' →</a>' : '';
            }).join('') +
            m.locked.map(function (l) { return '<span class="badge">' + esc(l) + '</span>'; }).join('') +
          '</div></div>' + badge(m.games.length ? 'Unlocked' : 'Locked', m.games.length ? 'success' : '') + '</div>';
        }).join('') +
      '</div>' +
      '<div><div class="card" id="leaderboardPanel">' + leaderboardHtml() + '</div>' +
        '<div class="card" style="margin-top:16px"><span class="eyebrow">Achievements</span><h3>Badges</h3><div class="grid grid-2">' +
        (site().achievements || []).map(function (a) {
          var has = (p.badges || []).indexOf(a.id) !== -1;
          return '<div class="badge-item ' + (has ? '' : 'locked') + '"><span class="bi" aria-hidden="true">' + esc(a.icon) + '</span><div><b>' + esc(a.name) + '</b><small>' + esc(a.desc) + '</small></div></div>';
        }).join('') + '</div>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="reset-progress" style="margin-top:16px">Reset local progress</button>' +
        '</div></div>' +
    '</div></section>';
  }

  function drawRadar() {
    var canvas = document.getElementById('skillRadar');
    if (!canvas || !canvas.getContext) return;
    var ctx = null;
    try { ctx = canvas.getContext('2d'); } catch (e) { ctx = null; }
    if (!ctx) return;
    var p = store();
    var axes = [
      { label: 'Social', v: scoreDomain(['phishing', 'business-email-compromise', 'ai-phishing']) },
      { label: 'Identity', v: scoreDomain(['credential-stuffing', 'mfa-fatigue', 'broken-auth']) },
      { label: 'Blue Team', v: Math.min(100, ((p.gameBest.ir ? p.gameBest.ir.score : 0) || 0) + (p.badges || []).length * 5) },
      { label: 'Web / App', v: scoreDomain(['sql-injection', 'xss', 'broken-auth']) },
      { label: 'Network', v: scoreDomain(['ddos', 'mitm', 'evil-twin']) },
      { label: 'Crypto', v: scoreDomain(['weak-crypto']) + ((p.gameBest.ctf ? p.gameBest.ctf.solved : 0) || 0) * 10 }
    ];
    function scoreDomain(ids) {
      return ids.filter(function (id) { return p.quizDone.indexOf(id) !== -1; }).length * 25;
    }
    var cx = canvas.width / 2, cy = canvas.height / 2 + 8, r = 105;
    var css = getComputedStyle(document.documentElement);
    var accent = css.getPropertyValue('--accent').trim() || '#22d3ee';
    var border = css.getPropertyValue('--border').trim() || '#233c5c';
    var muted = css.getPropertyValue('--muted').trim() || '#9fb0c8';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1;
    for (var ring = 1; ring <= 4; ring++) {
      ctx.beginPath();
      axes.forEach(function (_, i) {
        var ang = -Math.PI / 2 + i * Math.PI * 2 / axes.length;
        var rr = r * ring / 4;
        var x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = border;
      ctx.stroke();
    }
    axes.forEach(function (ax, i) {
      var ang = -Math.PI / 2 + i * Math.PI * 2 / axes.length;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
      ctx.strokeStyle = border; ctx.stroke();
      var lx = cx + Math.cos(ang) * (r + 26), ly = cy + Math.sin(ang) * (r + 20);
      ctx.fillStyle = muted;
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = Math.abs(Math.cos(ang)) < .2 ? 'center' : (Math.cos(ang) > 0 ? 'left' : 'right');
      ctx.textBaseline = 'middle';
      ctx.fillText(ax.label, lx, ly);
    });
    ctx.beginPath();
    axes.forEach(function (ax, i) {
      var ang = -Math.PI / 2 + i * Math.PI * 2 / axes.length;
      var rr = r * Math.max(6, Math.min(100, ax.v)) / 100;
      var x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = accent + '33';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    axes.forEach(function (ax, i) {
      var ang = -Math.PI / 2 + i * Math.PI * 2 / axes.length;
      var rr = r * Math.max(6, Math.min(100, ax.v)) / 100;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = accent; ctx.fill();
    });
  }

  /* ---------- shared game shell ---------- */
  function shell(title, subtitle, icon, backLabel) {
    return '<div class="game-shell">' +
      '<div class="game-head"><div><span class="eyebrow">' + esc(icon) + ' Game mode</span><h1 style="margin-bottom:6px">' + esc(title) + '</h1><p class="muted">' + esc(subtitle) + '</p></div>' +
      '<a class="btn btn-ghost btn-sm" href="#/arena">← ' + esc(backLabel || 'Arena hub') + '</a></div>' +
      '<div class="game-stage" id="gameStage"></div>' +
      '<p class="tiny muted center" style="margin-top:16px">All content in this game is fictional and runs locally in your browser. No real systems are involved.</p>' +
    '</div>';
  }
  function stage() { return document.getElementById('gameStage'); }

  /* ---------- Spot the Phish ---------- */
  function phishShow() {
    var items = G.phish || [];
    var s = local.phish;
    var el = stage();
    if (!el) return;
    if (s.index >= items.length) {
      var pct = Math.round(s.score / items.length * 100);
      var awarded = false;
      if (!s.awarded) {
        s.awarded = true;
        window.CSA.addXp(Math.max(10, Math.round(pct / 5)), 'phish round complete');
        window.CSA.store.update(function (x) {
          x.gameBest.phish = { score: pct, label: pct + '%' };
        });
        window.CSA.unlock('first-steps');
        if (pct >= 80) window.CSA.unlock('phish-spotter');
        window.CSA.checkAchievements(store());
        awarded = true;
      }
      el.innerHTML = '<div class="result-score"><span class="eyebrow">Round complete</span><div class="big">' + pct + '%</div>' +
        '<h2 style="margin-top:12px">' + s.score + ' of ' + items.length + ' correct</h2>' +
        '<p class="muted">' + (pct >= 80 ? 'Excellent — you are reading the signals well.' : 'Good practice. The explanation after each scenario is the real lesson.') + '</p>' +
        '<div class="row" style="justify-content:center"><button type="button" class="btn btn-primary" data-restart="phish">Play again</button><a class="btn btn-ghost" href="#/arena">Back to Arena</a></div></div>';
      return;
    }
    var item = items[s.index];
    el.innerHTML =
      '<div class="hud"><span class="hud-item">Scenario <b>' + (s.index + 1) + '/' + items.length + '</b></span>' +
      '<span class="hud-item">Score <b>' + s.score + '</b></span><span class="hud-item">Channel <b>' + esc(item.channel) + '</b></span></div>' +
      '<div class="timer-bar"><span id="phishTimer" style="width:100%"></span></div>' +
      '<div class="progress-dots" style="margin-bottom:18px">' + items.map(function (_, i) {
        return '<i class="' + (i < s.index ? 'done' : i === s.index ? 'current' : '') + '"></i>';
      }).join('') + '</div>' +
      '<div class="mock-email"><div class="mock-email-head">' +
        '<div><b>From</b><span>' + esc(item.from) + '</span></div>' +
        '<div><b>Subject</b><span>' + esc(item.subject) + '</span></div>' +
      '</div><div class="mock-email-body"><p>' + esc(item.body) + '</p>' +
        (item.link && item.link !== '—' ? '<span class="mock-link">↗ ' + esc(item.link) + '</span>' : '') +
      '</div></div>' +
      '<div class="choice-row">' +
        '<button type="button" class="choice-btn safe" data-phish-answer="safe">✓ Looks legitimate</button>' +
        '<button type="button" class="choice-btn threat" data-phish-answer="phish">⚠ Suspicious / phishing</button>' +
      '</div>' +
      '<div id="gameFeedback" aria-live="polite"></div>';
    startTimer(20, 'phishTimer');
  }

  function phishAnswer(choice) {
    var s = local.phish;
    var item = (G.phish || [])[s.index];
    if (!item || s.answered) return;
    s.answered = true;
    clearTimer();
    var correct = choice === item.answer;
    if (correct) s.score++;
    var fb = document.getElementById('gameFeedback');
    if (!fb) return;
    fb.innerHTML = '<div class="feedback ' + (correct ? 'good' : 'bad') + '"><h3>' + (correct ? 'Correct.' : 'Watch out — this one is ' + item.answer + '.') + '</h3>' +
      '<p>' + esc(item.explain) + '</p><div class="flag-row">' + (item.flags || []).map(function (f) { return '<span class="badge warning">' + esc(f) + '</span>'; }).join('') + '</div></div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-next="phish" style="margin-top:14px">' + (s.index + 1 >= (G.phish || []).length ? 'See results →' : 'Next scenario →') + '</button>';
  }
  function phishNext() {
    var s = local.phish;
    s.index++; s.answered = false;
    phishShow();
  }

  function startTimer(seconds, id) {
    clearTimer();
    var left = seconds;
    var bar = document.getElementById(id);
    timer = setInterval(function () {
      left--;
      if (bar) bar.style.width = Math.max(0, left / seconds * 100) + '%';
      if (left <= 0) {
        clearTimer();
        if (id === 'phishTimer' && local.phish && !local.phish.answered) phishAnswer('timeout');
        if (id === 'triviaTimer' && local.trivia && !local.trivia.answered) triviaAnswer(-1);
      }
    }, 1000);
  }

  /* ---------- Incident Responder ---------- */
  function irShow() {
    var items = G.incidents || [];
    var s = local.ir;
    var el = stage();
    if (!el) return;
    if (s.index >= items.length) {
      var pct = Math.round(Math.max(0, s.score) / (items.length * 40) * 100);
      if (!s.awarded) {
        s.awarded = true;
        window.CSA.addXp(Math.max(15, Math.round(pct / 4)), 'SOC shift complete');
        window.CSA.store.update(function (x) {
          x.gameBest.ir = { score: pct, label: pct + '%' };
        });
        window.CSA.unlock('calm-under-fire');
        window.CSA.unlock('first-steps');
        window.CSA.checkAchievements(store());
      }
      el.innerHTML = '<div class="result-score"><span class="eyebrow">Shift complete</span><div class="big">' + pct + '%</div>' +
        '<h2 style="margin-top:12px">Triage score: ' + Math.max(0, s.score) + ' pts</h2><p class="muted">Real IR is about measured decisions, not speed alone. Review each explanation before moving on.</p>' +
        '<div class="row" style="justify-content:center"><button type="button" class="btn btn-primary" data-restart="ir">New shift</button><a class="btn btn-ghost" href="#/arena">Back to Arena</a></div></div>';
      return;
    }
    var a = items[s.index];
    el.innerHTML =
      '<div class="hud"><span class="hud-item">Alert <b>' + (s.index + 1) + '/' + items.length + '</b></span>' +
      '<span class="hud-item">Score <b>' + Math.max(0, s.score) + '</b></span><span class="hud-item">Time <b>' + esc(a.time) + '</b></span></div>' +
      '<div class="alert-banner"><div><strong>' + esc(a.title) + '</strong><div class="small muted">Asset / account: ' + esc(a.user) + '</div></div>' + badge(a.severity + ' severity', 'danger') + '</div>' +
      '<h3>Log excerpt</h3><div class="log-panel">' + a.logs.map(function (line) {
        var parts = line.split('  ');
        return '<div><span class="log-time">' + esc(parts[0]) + '</span>  ' + esc(parts.slice(1).join('  ')) + '</div>';
      }).join('') + '</div>' +
      '<h3 style="margin-top:20px">What is your next action?</h3>' +
      '<div class="action-list">' + a.options.map(function (o, i) {
        return '<button type="button" class="action-btn" data-ir-action="' + i + '"><span class="badge">' + String.fromCharCode(65 + i) + '</span> ' + esc(o.label) + '</button>';
      }).join('') + '</div>' +
      '<div id="gameFeedback" aria-live="polite"></div>';
  }

  function irAction(index) {
    var s = local.ir;
    var a = (G.incidents || [])[s.index];
    if (!a || s.answered) return;
    s.answered = true;
    var o = a.options[index];
    s.score += o.score;
    var best = Math.max.apply(null, a.options.map(function (x) { return x.score; }));
    var good = o.score === best;
    var fb = document.getElementById('gameFeedback');
    fb.innerHTML = '<div class="feedback ' + (good ? 'good' : 'bad') + '"><h3>' + (good ? 'Strong call.' : (o.score >= 0 ? 'Defensible, but there is a better option.' : 'That would make things worse.')) + ' (' + (o.score > 0 ? '+' : '') + o.score + ' pts)</h3>' +
      '<p>' + esc(o.explain) + '</p></div>' +
      '<div class="callout" style="margin-top:12px"><strong>Lesson:</strong> ' + esc(a.lesson) + '</div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-next="ir" style="margin-top:14px">' + (s.index + 1 >= (G.incidents || []).length ? 'See shift results →' : 'Next alert →') + '</button>';
  }
  function irNext() { local.ir.index++; local.ir.answered = false; irShow(); }

  /* ---------- Password Fortress ---------- */
  function passwordShow() {
    var el = stage();
    if (!el) return;
    el.innerHTML =
      '<span class="eyebrow">Safe, local simulation</span><h2>Build a password fortress</h2>' +
      '<p class="muted">Type a test password below to see an estimated strength. Do not use a real password — nothing is transmitted or saved, but why risk it?</p>' +
      '<div class="callout warning"><strong>Education note:</strong> Length plus unpredictability beats complexity theater. A memorable passphrase of random words is often better than a short string of symbols.</div>' +
      '<div style="margin-top:20px"><label for="pwInput"><strong>Test password</strong></label>' +
      '<div class="pw-input-wrap"><input id="pwInput" type="password" autocomplete="off" placeholder="Type a test passphrase…" style="width:100%" aria-describedby="pwHelp"></div>' +
      '<p id="pwHelp" class="tiny muted">Never paste real credentials into any training tool.</p></div>' +
      '<div class="pw-meter"><span id="pwMeterBar"></span></div>' +
      '<div class="spread small"><span id="pwLabel" class="muted">Waiting for input…</span>' + badge('Local only', 'success') + '</div>' +
      '<div class="pw-checks" id="pwChecks">' +
        ['12+ characters', 'Upper & lowercase', 'Contains a number', 'Contains a symbol', 'Not a common password', 'No repeated patterns'].map(function (c) {
          return '<div class="pw-check">' + esc(c) + '</div>';
        }).join('') +
      '</div>' +
      '<div class="crack-card"><div><b id="pwEntropy">0 bits</b><span>Estimated entropy</span></div>' +
      '<div><b id="pwCrack">instantly</b><span>Simulated offline guess time</span></div>' +
      '<div><b id="pwVerdict">—</b><span>Verdict</span></div></div>' +
      '<div id="pwTip" class="callout success">Start typing to build your fortress.</div>';
    var input = document.getElementById('pwInput');
    if (input) input.addEventListener('input', updatePassword);
    updatePassword();
  }

  function updatePassword() {
    var input = document.getElementById('pwInput');
    if (!input) return;
    var v = input.value;
    var common = ['password', '123456', 'qwerty', 'letmein', 'admin', 'welcome', 'iloveyou', 'abc123', 'password1', 'monkey', 'dragon', 'sunshine', 'princess', 'football', 'baseball', 'trustno1', 'passw0rd'];
    var lower = v.toLowerCase();
    var checks = [
      v.length >= 12,
      /[a-z]/.test(v) && /[A-Z]/.test(v),
      /\d/.test(v),
      /[^A-Za-z0-9]/.test(v),
      v.length > 0 && common.every(function (c) { return lower.indexOf(c) === -1; }),
      v.length > 0 && !/(.)\1{2,}/.test(v) && !/1234|abcd|qwer/i.test(v)
    ];
    var labels = ['12+ characters', 'Upper & lowercase', 'Contains a number', 'Contains a symbol', 'Not a common password', 'No repeated patterns'];
    var nodes = document.querySelectorAll('#pwChecks .pw-check');
    nodes.forEach(function (n, i) { n.classList.toggle('met', checks[i]); n.textContent = labels[i]; });

    var pool = 0;
    if (/[a-z]/.test(v)) pool += 26;
    if (/[A-Z]/.test(v)) pool += 26;
    if (/\d/.test(v)) pool += 10;
    if (/[^A-Za-z0-9]/.test(v)) pool += 32;
    var bits = v.length && pool ? Math.log2(pool) * v.length : 0;
    if (!checks[4]) bits = Math.min(bits, 18);
    if (!checks[5]) bits *= .6;
    bits = Math.max(0, Math.round(bits));
    var score = Math.min(100, Math.round(bits / 1.1));
    var bar = document.getElementById('pwMeterBar');
    bar.style.width = score + '%';
    bar.style.background = score < 40 ? 'var(--danger)' : score < 70 ? 'var(--warning)' : 'var(--success)';
    var label = score < 25 ? 'Very weak' : score < 45 ? 'Weak' : score < 70 ? 'Fair' : score < 88 ? 'Strong' : 'Excellent';
    document.getElementById('pwLabel').textContent = v ? label + ' · ' + score + '/100' : 'Waiting for input…';
    document.getElementById('pwEntropy').textContent = bits + ' bits';
    document.getElementById('pwCrack').textContent = crackTime(bits);
    document.getElementById('pwVerdict').textContent = v ? label : '—';

    var tip = document.getElementById('pwTip');
    if (!v) tip.innerHTML = 'Start typing to build your fortress.';
    else if (score >= 88) {
      tip.innerHTML = '<strong>Excellent.</strong> Long, varied, and not a known pattern. Store it in a password manager so each account can have its own.';
      var p = store();
      if (!p.gameBest.password || !p.gameBest.password.strong) {
        window.CSA.store.update(function (x) { x.gameBest.password = { strong: true, label: 'Strong' }; });
        window.CSA.addXp(30, 'strong password built');
        window.CSA.unlock('key-master');
        window.CSA.unlock('first-steps');
        window.CSA.checkAchievements(store());
      }
    } else {
      var missing = labels.filter(function (_, i) { return !checks[i]; });
      tip.innerHTML = '<strong>Next improvement:</strong> ' + esc(missing[0] || 'Keep going — length helps most.') + '. Try a passphrase of 4–6 unusual words plus a separator.';
    }
  }

  function crackTime(bits) {
    if (bits <= 0) return 'instantly';
    var guesses = Math.pow(2, bits) / 2;
    var seconds = guesses / 1e11;
    if (seconds < 1) return 'instantly';
    var units = [[31536000, 'centuries'], [2592000, 'months'], [86400, 'days'], [3600, 'hours'], [60, 'minutes']];
    for (var i = 0; i < units.length; i++) {
      if (seconds >= units[i][0]) return Math.round(seconds / units[i][0]) + ' ' + units[i][1];
    }
    return Math.round(seconds) + ' seconds';
  }

  /* ---------- Beginner CTF ---------- */
  function ctfShow() {
    var items = G.ctf || [];
    var s = local.ctf;
    var el = stage();
    if (!el) return;
    if (s.index >= items.length) {
      if (!s.awarded) {
        s.awarded = true;
        window.CSA.addXp(s.solved * 10, 'CTF puzzles solved');
        window.CSA.store.update(function (x) { x.gameBest.ctf = { solved: s.solved, label: s.solved + '/' + items.length }; });
        window.CSA.unlock('first-steps');
        if (s.solved >= items.length) window.CSA.unlock('codebreaker');
        window.CSA.checkAchievements(store());
      }
      el.innerHTML = '<div class="result-score"><span class="eyebrow">Flag captured</span><div class="big">' + s.solved + '/' + items.length + '</div>' +
        '<h2 style="margin-top:12px">Puzzle set complete</h2><p class="muted">Encoding is not encryption, and behavior anomalies are often more useful than signatures.</p>' +
        '<div class="row" style="justify-content:center"><button type="button" class="btn btn-primary" data-restart="ctf">Try again</button><a class="btn btn-ghost" href="#/arena">Back to Arena</a></div></div>';
      return;
    }
    var puzzle = items[s.index];
    el.innerHTML =
      '<div class="hud"><span class="hud-item">Puzzle <b>' + (s.index + 1) + '/' + items.length + '</b></span>' +
      '<span class="hud-item">Solved <b>' + s.solved + '</b></span><span class="hud-item">Type <b>' + esc(puzzle.type) + '</b></span></div>' +
      '<div class="progress-dots" style="margin-bottom:18px">' + items.map(function (_, i) {
        return '<i class="' + (i < s.index ? 'done' : i === s.index ? 'current' : '') + '"></i>';
      }).join('') + '</div>' +
      '<div class="ctf-puzzle"><h3>' + esc(puzzle.title) + '</h3><p>' + esc(puzzle.prompt) + '</p></div>' +
      '<div class="answer-form"><input type="text" id="ctfAnswer" placeholder="Your answer…" autocomplete="off" aria-label="Puzzle answer">' +
      '<button type="button" class="btn btn-primary" data-ctf="check">Submit</button></div>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-hint="ctf" style="margin-top:10px">💡 Need a hint?</button>' +
      '<div id="gameFeedback" aria-live="polite"></div>';
    var input = document.getElementById('ctfAnswer');
    if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') ctfCheck(); });
  }

  function ctfCheck() {
    var s = local.ctf;
    var puzzle = (G.ctf || [])[s.index];
    var input = document.getElementById('ctfAnswer');
    if (!puzzle || !input || s.answered) return;
    var value = input.value.toLowerCase().trim().replace(/\s+/g, ' ');
    var target = puzzle.answer.toLowerCase().trim().replace(/\s+/g, ' ');
    var ok = value === target
      || (target.indexOf('safe-learning') !== -1 && value.indexOf('safe-learning') !== -1)
      || (target === 'b' && (value === 'b' || value.indexOf('new inbox rule') !== -1 || value.indexOf('forwarding') !== -1));
    s.answered = true;
    if (ok) s.solved++;
    var fb = document.getElementById('gameFeedback');
    fb.innerHTML = '<div class="feedback ' + (ok ? 'good' : 'bad') + '"><h3>' + (ok ? 'Flag captured.' : 'Not this time — the intended idea is below.') + '</h3><p>' + esc(puzzle.explain) + '</p></div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-next="ctf" style="margin-top:14px">' + (s.index + 1 >= (G.ctf || []).length ? 'See results →' : 'Next puzzle →') + '</button>';
  }
  function ctfNext() { local.ctf.index++; local.ctf.answered = false; ctfShow(); }

  /* ---------- Trivia & flashcards ---------- */
  function triviaShow() {
    var s = local.trivia;
    if (s.mode === 'cards') { cardsShow(); return; }
    var items = G.trivia || [];
    var el = stage();
    if (!el) return;
    if (s.index >= items.length) {
      if (!s.awarded) {
        s.awarded = true;
        window.CSA.addXp(Math.max(10, s.score), 'trivia round complete');
        window.CSA.store.update(function (x) { x.gameBest.trivia = { score: s.score, label: s.score + ' pts' }; });
        window.CSA.unlock('first-steps');
        window.CSA.checkAchievements(store());
      }
      el.innerHTML = '<div class="result-score"><span class="eyebrow">Quick-fire round complete</span><div class="big">' + s.score + '</div>' +
        '<h2 style="margin-top:12px">points scored</h2><p class="muted">Longest streak: ' + s.bestStreak + '. Review the flashcards to make the ideas stick.</p>' +
        '<div class="row" style="justify-content:center"><button type="button" class="btn btn-primary" data-trivia-mode="cards">Study flashcards →</button>' +
        '<button type="button" class="btn btn-ghost" data-restart="trivia">Play again</button></div></div>';
      return;
    }
    var q = items[s.index];
    el.innerHTML =
      '<div class="spread" style="margin-bottom:14px"><div class="hud"><span class="hud-item">Question <b>' + (s.index + 1) + '/' + items.length + '</b></span>' +
      '<span class="hud-item">Score <b>' + s.score + '</b></span><span class="hud-item">Streak <b>' + s.streak + '🔥</b></span></div>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-trivia-mode="cards">Flashcards instead</button></div>' +
      '<div class="timer-bar"><span id="triviaTimer" style="width:100%"></span></div>' +
      '<p class="quiz-q">' + esc(q.q) + '</p>' +
      '<div class="quiz-options">' + q.options.map(function (o, i) {
        return '<button type="button" class="quiz-option" data-trivia-answer="' + i + '"><span class="key">' + String.fromCharCode(65 + i) + '</span>' + esc(o) + '</button>';
      }).join('') + '</div><div id="gameFeedback" aria-live="polite"></div>';
    startTimer(12, 'triviaTimer');
  }

  function triviaAnswer(index) {
    var s = local.trivia;
    var q = (G.trivia || [])[s.index];
    if (!q || s.answered) return;
    s.answered = true;
    clearTimer();
    var correct = index === q.answer;
    if (correct) {
      s.streak++;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      s.score += 10 + Math.min(10, (s.streak - 1) * 2);
    } else { s.streak = 0; }
    var fb = document.getElementById('gameFeedback');
    if (!fb) return;
    fb.innerHTML = '<div class="feedback ' + (correct ? 'good' : 'bad') + '"><h3>' + (correct ? 'Correct — +' + (10 + Math.min(10, (s.streak - 1) * 2)) + ' pts' : (index < 0 ? 'Time is up.' : 'Not quite.')) + '</h3>' +
      '<p>' + esc(q.explain) + '</p></div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-trivia-next style="margin-top:14px">' + (s.index + 1 >= (G.trivia || []).length ? 'See results →' : 'Next question →') + '</button>';
  }
  function triviaNext() { local.trivia.index++; local.trivia.answered = false; triviaShow(); }

  function cardsShow() {
    var s = local.trivia;
    s.mode = 'cards';
    var items = G.flashcards || [];
    var el = stage();
    if (!el) return;
    var c = items[s.cardIndex % Math.max(1, items.length)];
    if (!c) return;
    el.innerHTML =
      '<div class="spread" style="margin-bottom:16px"><div><span class="eyebrow">Study mode</span><h2>Flashcards</h2></div>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-trivia-mode="quiz">← Back to trivia</button></div>' +
      '<p class="muted small">Card ' + (s.cardIndex % items.length + 1) + ' of ' + items.length + '. Try to answer before flipping.</p>' +
      '<button type="button" class="flashcard' + (s.flipped ? ' flipped' : '') + '" data-card-flip aria-label="Flip flashcard">' +
      '<span class="fc-label">' + (s.flipped ? 'DEFINITION' : 'TERM') + '</span>' +
      '<strong>' + esc(s.flipped ? c.back : c.front) + '</strong>' +
      '<span class="fc-hint">Click to flip ↻</span></button>' +
      '<div class="row" style="justify-content:center;margin-top:18px"><button type="button" class="btn btn-ghost btn-sm" data-card-nav="-1">← Previous</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-card-nav="1">Next card →</button></div>';
  }

  /* ---------- Scenario mode ---------- */
  function scenarioFor(id) { return (G.scenarios || []).find(function (s) { return s.id === id; }) || (G.scenarios || [])[0]; }
  function scenarioMax(scenario) {
    var nodeId = scenario.start, total = 0, guard = 0;
    while (scenario.nodes[nodeId] && !scenario.nodes[nodeId].end && guard++ < 20) {
      var best = scenario.nodes[nodeId].choices.reduce(function (a, b) { return b.score > a.score ? b : a; });
      total += best.score;
      nodeId = best.next;
    }
    return Math.max(1, total);
  }
  function scenarioShow() {
    var s = local.scenario;
    var scenario = scenarioFor(s.id);
    var el = stage();
    if (!el || !scenario) return;
    var node = scenario.nodes[s.node];
    if (!node || node.end) {
      var pct = Math.round(Math.max(0, s.score) / Math.max(1, s.max) * 100);
      if (!s.awarded) {
        s.awarded = true;
        window.CSA.addXp(Math.max(10, Math.round(pct / 5)), 'scenario complete');
        window.CSA.store.update(function (x) { x.gameBest.scenario = { score: pct, label: pct + '%' }; });
        window.CSA.unlock('first-steps');
        window.CSA.checkAchievements(store());
      }
      el.innerHTML = '<div class="result-score"><span class="eyebrow">Debrief</span><div class="big">' + s.score + '/' + s.max + '</div>' +
        '<h2 style="margin-top:12px">' + esc(scenario.title) + '</h2><p class="muted">' + esc(scenario.lesson) + '</p>' +
        '<div class="row" style="justify-content:center"><button type="button" class="btn btn-primary" data-restart="scenario">Try another path</button>' +
        '<button type="button" class="btn btn-ghost" data-scenario-mode>Other scenario</button></div></div>';
      return;
    }
    el.innerHTML =
      '<div class="spread" style="margin-bottom:14px"><div><span class="eyebrow">' + esc(scenario.subtitle) + '</span><h2>' + esc(scenario.title) + '</h2></div>' + badge('Step ' + (s.history.length + 1), 'accent') + '</div>' +
      '<div class="scenario-node"><p>' + esc(node.text) + '</p></div>' +
      '<div class="action-list">' + node.choices.map(function (c, i) {
        return '<button type="button" class="action-btn" data-scenario-choice="' + i + '"><span class="badge">' + String.fromCharCode(65 + i) + '</span> ' + esc(c.label) + '</button>';
      }).join('') + '</div><div id="gameFeedback" aria-live="polite"></div>';
  }
  function scenarioChoice(index) {
    var s = local.scenario;
    var scenario = scenarioFor(s.id);
    var node = scenario.nodes[s.node];
    if (!node || s.answered) return;
    s.answered = true;
    var choice = node.choices[index];
    s.score += choice.score;
    s.history.push({ node: s.node, choice: index });
    s.nextNode = choice.next;
    var fb = document.getElementById('gameFeedback');
    if (!fb) return;
    fb.innerHTML = '<div class="feedback ' + (choice.score > 0 ? 'good' : 'bad') + '"><h3>' + esc(choice.feedback) + '</h3><p class="tiny">Score change: ' + (choice.score > 0 ? '+' : '') + choice.score + '</p></div>' +
      '<button type="button" class="btn btn-primary btn-sm" data-scenario-next style="margin-top:14px">Continue →</button>';
  }
  function scenarioNext() {
    var s = local.scenario;
    s.node = s.nextNode || 'end';
    s.answered = false;
    scenarioShow();
  }
  function scenarioPicker() {
    var el = stage();
    if (!el) return;
    el.innerHTML = '<span class="eyebrow">Choose a story</span><h2>Scenario Mode</h2><p class="muted">Each decision changes what happens next. There are no trick questions — only trade-offs worth discussing.</p>' +
      '<div class="grid grid-2">' + (G.scenarios || []).map(function (s) {
        return '<button type="button" class="game-card" data-scenario-select="' + attrSafe(s.id) + '"><div class="game-icon">🧭</div><h3>' + esc(s.title) + '</h3><p>' + esc(s.subtitle) + '</p><div class="game-foot"><span>Choose this story</span>' + badge('Play', 'accent') + '</div></button>';
      }).join('') + '</div>';
  }
  function attrSafe(v) { return String(v).replace(/"/g, '&quot;'); }

  /* ---------- Defend the Network ---------- */
  function defendShow() {
    var cfg = G.defenseGame || {};
    var s = local.defend;
    var el = stage();
    if (!el) return;
    var waves = cfg.waves || [];
    if (s.wave >= waves.length) {
      if (!s.awarded) {
        s.awarded = true;
        var pct = Math.round(Math.max(0, s.score) / Math.max(1, waves.reduce(function (n, w) { return n + w.attacks.length; }, 0) * 10) * 100);
        window.CSA.addXp(Math.max(15, Math.round(pct / 3)), 'network defended');
        window.CSA.store.update(function (x) { x.gameBest.defend = { score: pct, label: pct + '%' }; });
        window.CSA.unlock('first-steps');
        window.CSA.checkAchievements(store());
      }
      el.innerHTML = '<div class="result-score"><span class="eyebrow">All waves resolved</span><div class="big">' + Math.max(0, s.score) + '</div>' +
        '<h2 style="margin-top:12px">defense points</h2><p class="muted">The lesson: controls must match the threat and the layer it reaches. Coverage beats collection.</p>' +
        '<div class="row" style="justify-content:center"><button type="button" class="btn btn-primary" data-restart="defend">Rebuild defenses</button><a class="btn btn-ghost" href="#/arena">Back to Arena</a></div></div>';
      return;
    }
    var wave = waves[s.wave];
    var controlById = {};
    (cfg.controls || []).forEach(function (c) { controlById[c.id] = c; });
    var placedNodeIds = Object.keys(s.placements || {});
    el.innerHTML =
      '<div class="spread" style="margin-bottom:14px"><div><span class="eyebrow">Tower-defense style planning</span><h2>Defend the Network</h2></div>' +
      '<div class="hud"><span class="hud-item">Wave <b>' + (s.wave + 1) + '/' + waves.length + '</b></span>' +
      '<span class="hud-item">Budget <b>' + s.budget + '</b></span><span class="hud-item">Score <b>' + s.score + '</b></span></div></div>' +
      (s.resolved ? s.resolutionHtml :
        '<div class="callout"><strong>Incoming:</strong> ' + esc(wave.name) + '. Place controls on the layers the attacks will reach, then launch the wave.</div>' +
        '<h3 style="margin-top:18px">1. Choose a control</h3>' +
        '<div class="control-palette">' + (cfg.controls || []).map(function (c) {
          var affordable = s.budget >= c.cost;
          return '<button type="button" class="control-btn' + (s.selected === c.id ? ' active' : '') + (affordable ? '' : ' unaffordable') + '" data-defense-select="' + c.id + '"' + (affordable ? '' : ' disabled') + '>' +
            '<span class="ctrl-icon">' + esc(c.icon) + '</span><b>' + esc(c.name) + '</b><span class="tiny muted">' + esc(c.desc) + '</span><span class="badge accent">' + c.cost + ' tokens</span></button>';
        }).join('') + '</div>' +
        '<h3 style="margin-top:18px">2. Place it on a layer</h3>' +
        '<div class="defense-grid-nodes">' + (cfg.nodes || []).map(function (n) {
          var placed = s.placements[n.id] ? controlById[s.placements[n.id]] : null;
          return '<div class="def-node' + (placed ? ' occupied' : '') + '"><div class="node-icon">' + esc(n.icon) + '</div><b>' + esc(n.name) + '</b>' +
            '<span class="tiny muted">' + esc(n.hint) + '</span>' +
            (placed ? '<button type="button" class="placed-control" data-defense-remove="' + n.id + '">' + esc(placed.icon) + ' ' + esc(placed.name) + ' ✕</button>' :
              '<button type="button" class="btn btn-ghost btn-sm" data-defense-place="' + n.id + '"' + (s.selected ? '' : ' disabled') + '>Place here</button>') +
            '</div>';
        }).join('') + '</div>' +
        '<div class="row" style="margin-top:20px"><button type="button" class="btn btn-primary" data-defense-start>Launch wave →</button>' +
        (placedNodeIds.length ? '<button type="button" class="btn btn-ghost btn-sm" data-defense-clear>Clear placements</button>' : '') + '</div>' +
        '<h3 style="margin-top:22px">Threats in this wave</h3><div class="wave-list">' + wave.attacks.map(function (a) {
          return '<div class="wave-card"><b>' + esc(a.name) + '</b><span class="tiny muted">' + esc(a.text) + '</span>' + badge(nodeName(cfg, a.node), 'warning') + '</div>';
        }).join('') + '</div>');
    if (s.resolved) {
      el.insertAdjacentHTML('beforeend', '<button type="button" class="btn btn-primary" data-defense-next style="margin-top:18px">' + (s.wave + 1 >= waves.length ? 'See final score →' : 'Next wave →') + '</button>');
    }
  }
  function nodeName(cfg, id) {
    var n = (cfg.nodes || []).find(function (x) { return x.id === id; });
    return n ? n.name : id;
  }
  function defensePlace(nodeId) {
    var s = local.defend;
    var cfg = G.defenseGame || {};
    var c = (cfg.controls || []).find(function (x) { return x.id === s.selected; });
    if (!c || s.placements[nodeId] || s.budget < c.cost) return;
    s.placements[nodeId] = c.id;
    s.budget -= c.cost;
    s.selected = null;
    defendShow();
  }
  function defenseRemove(nodeId) {
    var s = local.defend;
    var cfg = G.defenseGame || {};
    var c = (cfg.controls || []).find(function (x) { return x.id === s.placements[nodeId]; });
    if (!c) return;
    s.budget += c.cost;
    delete s.placements[nodeId];
    defendShow();
  }
  function defenseStart() {
    var s = local.defend;
    var cfg = G.defenseGame || {};
    var wave = (cfg.waves || [])[s.wave];
    if (!wave) return;
    var controls = {};
    (cfg.controls || []).forEach(function (c) { controls[c.id] = c; });
    var lines = wave.attacks.map(function (a) {
      var control = controls[s.placements[a.node]];
      var blocked = !!control && control.counters.indexOf(a.type) !== -1;
      s.score += blocked ? 10 : -5;
      return '<li class="' + (blocked ? 'good' : 'bad') + '"><strong>' + esc(a.name) + '</strong> → ' + esc(nodeName(cfg, a.node)) +
        ': ' + (blocked ? '<span style="color:var(--success)">Blocked by ' + esc(control.name) + '</span>' : '<span style="color:var(--danger)">Breached — no matching control</span>') +
        '<div class="tiny muted">' + esc(blocked ? control.desc : 'Place a control that counters this threat on the targeted layer.') + '</div></li>';
    }).join('');
    s.resolved = true;
    s.resolutionHtml = '<h3>Wave report</h3><ul class="wave-report">' + lines + '</ul>';
    defendShow();
  }
  function defenseNext() {
    var s = local.defend;
    s.wave++;
    s.resolved = false;
    s.resolutionHtml = '';
    s.budget = (G.defenseGame || {}).budget || 11;
    s.placements = {};
    s.selected = null;
    defendShow();
  }

  /* ---------- public API ---------- */
  function render(route) {
    clearTimer();
    if (route === 'arena') return hub();
    var mode = route.split('/')[1];
    if (mode === 'phish') {
      local.phish = { index: 0, score: 0, answered: false, awarded: false };
      return shell('Spot the Phish', 'Is each message legitimate or a lure? Read carefully — every answer teaches a signal to watch for.', '🎣');
    }
    if (mode === 'ir') {
      local.ir = { index: 0, score: 0, answered: false, awarded: false };
      return shell('Incident Responder', 'You are the on-call analyst. Triage synthetic alerts using log excerpts and choose the safest next step.', '🚨');
    }
    if (mode === 'password') {
      return shell('Password Fortress', 'Experiment with password patterns safely in-browser. No password is stored or transmitted.', '🏰');
    }
    if (mode === 'ctf') {
      local.ctf = { index: 0, solved: 0, answered: false, awarded: false };
      return shell('Beginner CTF', 'Sandboxed decoding and log-analysis puzzles. No real systems, no exploits — just careful thinking.', '🔎');
    }
    if (mode === 'defend') {
      var cfg = G.defenseGame || {};
      local.defend = { wave: 0, budget: cfg.budget || 11, placements: {}, selected: null, score: 0, resolved: false, resolutionHtml: '', awarded: false };
      return shell('Defend the Network', 'Choose controls, place them on network layers, and stop three waves of simulated attacks.', '🧱');
    }
    if (mode === 'scenario') {
      var sid = route.split('/')[2];
      var scenario = sid ? scenarioFor(sid) : null;
      local.scenario = { id: sid || null, node: scenario ? scenario.start : '', score: 0, max: scenario ? scenarioMax(scenario) : 30, history: [], answered: false, awarded: false };
      return shell('Scenario Mode', 'Branching stories about everyday security decisions. Your response changes what happens next.', '🧭');
    }
    if (mode === 'trivia') {
      local.trivia = { mode: 'quiz', index: 0, score: 0, streak: 0, bestStreak: 0, answered: false, cardIndex: 0, flipped: false, awarded: false };
      return shell('Trivia & Flashcards', 'Timed quick-fire questions followed by key-term flashcards. Fast rounds, lasting recall.', '⚡');
    }
    return '<div class="callout">Unknown game mode. <a href="#/arena">Back to the Arena</a>.</div>';
  }

  function afterRender(route) {
    if (route === 'arena') { drawRadar(); return; }
    var mode = route.split('/')[1];
    if (mode === 'phish') phishShow();
    if (mode === 'ir') irShow();
    if (mode === 'password') passwordShow();
    if (mode === 'ctf') ctfShow();
    if (mode === 'defend') defendShow();
    if (mode === 'scenario') { if (local.scenario.id) scenarioShow(); else scenarioPicker(); }
    if (mode === 'trivia') triviaShow();
  }

  function handleClick(el) {
    if (el.hasAttribute('data-phish-answer')) { phishAnswer(el.getAttribute('data-phish-answer')); return true; }
    if (el.hasAttribute('data-ir-action')) { irAction(Number(el.getAttribute('data-ir-action'))); return true; }
    if (el.hasAttribute('data-next')) {
      var n = el.getAttribute('data-next');
      if (n === 'phish') phishNext();
      if (n === 'ir') irNext();
      if (n === 'ctf') ctfNext();
      return true;
    }
    if (el.hasAttribute('data-restart')) {
      var r = el.getAttribute('data-restart');
      if (r === 'phish') { local.phish = { index: 0, score: 0, answered: false, awarded: true }; phishShow(); }
      if (r === 'ir') { local.ir = { index: 0, score: 0, answered: false, awarded: true }; irShow(); }
      if (r === 'ctf') { local.ctf = { index: 0, solved: 0, answered: false, awarded: true }; ctfShow(); }
      if (r === 'trivia') { local.trivia = { mode: 'quiz', index: 0, score: 0, streak: 0, bestStreak: 0, answered: false, cardIndex: 0, flipped: false, awarded: true }; triviaShow(); }
      if (r === 'defend') {
        var cfg = G.defenseGame || {};
        local.defend = { wave: 0, budget: cfg.budget || 11, placements: {}, selected: null, score: 0, resolved: false, resolutionHtml: '', awarded: true };
        defendShow();
      }
      if (r === 'scenario') {
        var sc = scenarioFor(local.scenario.id);
        local.scenario = { id: sc.id, node: sc.start, score: 0, max: scenarioMax(sc), history: [], answered: false, awarded: true };
        scenarioShow();
      }
      return true;
    }
    if (el.hasAttribute('data-hint')) {
      var box = document.getElementById('gameFeedback');
      var puzzle = (G.ctf || [])[(local.ctf || {}).index || 0];
      if (box && puzzle) {
        box.innerHTML = '<div class="hint-box"><strong>Hint:</strong> ' + esc(puzzle.hint) + '</div>';
        window.CSA.store.update(function (x) { x.hintsUsed = (x.hintsUsed || 0) + 1; });
      }
      return true;
    }
    if (el.hasAttribute('data-ctf')) { ctfCheck(); return true; }
    if (el.hasAttribute('data-trivia-answer')) { triviaAnswer(Number(el.getAttribute('data-trivia-answer'))); return true; }
    if (el.hasAttribute('data-trivia-next')) { triviaNext(); return true; }
    if (el.hasAttribute('data-trivia-mode')) {
      var tm = el.getAttribute('data-trivia-mode');
      local.trivia.mode = tm;
      if (tm === 'quiz') { local.trivia.index = 0; local.trivia.score = 0; local.trivia.streak = 0; local.trivia.answered = false; }
      triviaShow();
      return true;
    }
    if (el.hasAttribute('data-card-flip')) { local.trivia.flipped = !local.trivia.flipped; cardsShow(); return true; }
    if (el.hasAttribute('data-card-nav')) {
      local.trivia.cardIndex = (local.trivia.cardIndex + Number(el.getAttribute('data-card-nav')) + (G.flashcards || []).length) % Math.max(1, (G.flashcards || []).length);
      local.trivia.flipped = false;
      cardsShow();
      return true;
    }
    if (el.hasAttribute('data-scenario-select')) { window.location.hash = '#/arena/scenario/' + el.getAttribute('data-scenario-select'); return true; }
    if (el.hasAttribute('data-scenario-mode')) { scenarioPicker(); return true; }
    if (el.hasAttribute('data-scenario-choice')) { scenarioChoice(Number(el.getAttribute('data-scenario-choice'))); return true; }
    if (el.hasAttribute('data-scenario-next')) { scenarioNext(); return true; }
    if (el.hasAttribute('data-defense-select')) { local.defend.selected = el.getAttribute('data-defense-select'); defendShow(); return true; }
    if (el.hasAttribute('data-defense-place')) { defensePlace(el.getAttribute('data-defense-place')); return true; }
    if (el.hasAttribute('data-defense-remove')) { defenseRemove(el.getAttribute('data-defense-remove')); return true; }
    if (el.hasAttribute('data-defense-clear')) {
      var cfg = G.defenseGame || {};
      Object.keys(local.defend.placements).forEach(function (n) {
        var c = (cfg.controls || []).find(function (x) { return x.id === local.defend.placements[n]; });
        if (c) local.defend.budget += c.cost;
      });
      local.defend.placements = {};
      defendShow();
      return true;
    }
    if (el.hasAttribute('data-defense-start')) { defenseStart(); return true; }
    if (el.hasAttribute('data-defense-next')) { defenseNext(); return true; }
    if (el.hasAttribute('data-leader-scope')) {
      leaderScope = el.getAttribute('data-leader-scope');
      renderLeaderboard();
      return true;
    }
    if (el.getAttribute('data-action') === 'daily-claim') {
      var today = new Date().toISOString().slice(0, 10);
      var p = store();
      if (p.dailyClaimed !== today) {
        window.CSA.store.update(function (x) { x.dailyClaimed = today; });
        window.CSA.addXp(40, 'daily challenge');
        el.textContent = 'Claimed today';
        el.disabled = true;
      }
      return true;
    }
    return false;
  }

  return { setData: setData, render: render, afterRender: afterRender, handleClick: handleClick, stop: clearTimer };
})();
