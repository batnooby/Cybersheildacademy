# CyberShield Academy

A production-quality, static cybersecurity awareness and training site. No build step, no dependencies to install.

**Stack choice:** plain HTML + CSS + vanilla JavaScript (ES2020+). Content lives in JSON files; a generated inline fallback makes the site work even when opened directly with `file://`.

> Suggested alternative names: **Sentinel Academy**, **CyberWise Academy**, **Barrier Academy**, **Signal Range**. "CyberShield Academy" is used throughout; rename via `data/site.json` → `brand`.

---

## 1. Site map / information architecture

```
/  (index.html — hash router, one semantic shell)
├── #/                     Home
│   ├── hero (Start Learning / Play the Arena)
│   ├── live-style stats
│   ├── Featured Threat of the Week  →  #/threat/<id>
│   ├── Daily Security Tip
│   ├── "Am I Safe Online?" self-check
│   └── domain preview cards
├── #/library              Threat Library (search + domain/difficulty/severity filters)
│   ├── #/domain/<id>      Domain overview page (all 13 domains)
│   └── #/threat/<id>      Attack template (consistent structure on all 50 briefings)
│       ├── definition + analogy, difficulty/severity, cheat sheet
│       ├── MITRE ATT&CK / Kill Chain mapping + visual flow
│       ├── case study, IOCs, warning signs
│       ├── defense: prevention / detection / incident response / tools
│       ├── deep dives, related attacks, mini quiz
│       ├── hover definitions for glossary terms in prose
│       └── breadcrumb + domain sidebar + reading progress
├── #/defense              Blue Team / Defense Center
│   ├── SOC roles (L1/L2/L3, hunter, IR lead)
│   ├── NIST IR lifecycle — interactive clickable diagram
│   ├── defense in depth, Zero Trust, least privilege, patching, backups
│   ├── Red / Blue / Purple team comparison
│   └── compliance: NIST, ISO 27001, CIS, GDPR
├── #/map                  Simulated Threat Map (severity filters, region drill-down)
├── #/arena                Game Arena hub (dark, energetic)
│   ├── XP / level / streak / badges / achievements
│   ├── skill radar (canvas) + daily challenge + leaderboard tabs (all/weekly/teams)
│   ├── #/arena/phish      Spot the Phish (playable)
│   ├── #/arena/ir         Incident Responder SOC simulator (playable)
│   ├── #/arena/password   Password Fortress (playable, local only)
│   ├── #/arena/ctf        Beginner CTF: decode + log analysis (playable)
│   ├── #/arena/defend     Defend the Network: place controls, survive 3 waves (playable)
│   ├── #/arena/scenario   Branching choose-your-response stories (playable)
│   └── #/arena/trivia     Timed trivia + flip-through flashcards (playable)
├── #/paths                Learning Paths (beginner→advanced, role-based, certificates)
├── #/glossary             Glossary with hover definitions + filter
├── #/timeline             Interactive threat timeline (simulated data)
├── #/resources            Books, courses, certifications, demo feed, newsletter + community rules
├── #/search               Global search with filters
└── #/responsible          Responsible Learning + legal disclaimer
```

**Global UI:** sticky header with skip link, theme toggle, search, progress chip; breadcrumbs; domain sidebar on knowledge pages; bookmark buttons; footer.

---

## 2. Design system

| Token | Dark (default) | Light | Use |
|---|---|---|---|
| `--bg` | `#07111f` | `#f4f8fc` | page background |
| `--surface` | `#0d1b2e` | `#ffffff` | cards/panels |
| `--surface-2` | `#12243c` | `#e8eef6` | nested panels |
| `--text` | `#e8f1ff` | `#10233b` | body text |
| `--muted` | `#9fb0c8` | `#52657e` | secondary text |
| `--border` | `#233c5c` | `#d4dfec` | dividers |
| `--accent` | `#22d3ee` cyan | `#0891b2` | primary actions, links |
| `--success` | `#34d399` | `#059669` | correct / safe |
| `--warning` | `#fbbf24` | `#b45309` | caution |
| `--danger` | `#f87171` | `#dc2626` | threats / incorrect |
| `--glow` | cyan radial glows | none | arena only |

- **Fonts:** Inter (UI/body), JetBrains Mono (logs, code-like labels, IOCs), with system fallbacks. Loaded from Google Fonts; degrades gracefully offline.
- **Radius:** 14px cards, 999px pills, 10px inputs. **Spacing scale:** 4/8/12/16/24/32/48/64px.
- **Components:** `.btn` (+ `.btn-primary/.btn-ghost/.btn-danger`), `.card`, `.badge`, `.pill`, `.breadcrumb`, `.sidebar`, `.progress`, `.accordion`, `.tabs`, `.callout`, `.stat`, `.domain-card`, `.game-card`, `.quiz`, `.tooltip`, `.flow-step`, `.alert-row`, `.radar`.
- **Motion:** 150–250ms ease transitions, subtle fade-up on route change. `@media (prefers-reduced-motion: reduce)` disables it.
- **Accessibility target:** WCAG 2.1 AA — visible focus rings, semantic landmarks, `aria-live` for game feedback, keyboard-operable controls, 4.5:1 text contrast, decorative SVG `aria-hidden`.

### Component rules
- Knowledge pages = calm, high-readability, max-width 76ch for prose, left domain sidebar.
- Arena = dark regardless of global theme (`.arena` scope), neon accents, arcade-style cards.
- Every interactive answer shows an immediate explanation — learning before scoring.

---

## 3. Run

```bash
# Option A (recommended: JSON fetched at runtime)
python -m http.server 8000
# then open http://localhost:8000

# Option B: double-click index.html (uses generated inline fallback data)
```

No installation, build, or API keys required.

## 4. Customize

1. **Branding/navigation/stats/tips/glossary/paths/defense content:** edit `data/site.json`.
2. **Add an attack:** copy an object in `data/attacks.json`, give it a unique `id`, fill the fields (schema documented in `data/README.md`), optionally set `"featured": true`.
3. **Add game content:** edit `data/games.json` (phish scenarios, SOC alerts, CTF puzzles).
4. **Regenerate the offline fallback after any JSON edit:**

   ```bash
   node tools/build-inline-data.js
   ```

5. **Colors/fonts:** edit tokens at the top of `assets/styles.css`.

## 5. Expand

- **Backend-ready:** all progress is read/written through `CSA.store` in `assets/app.js` (localStorage now). Replace that adapter with API calls for accounts, cloud saves, and real leaderboards. The leaderboard already has a `source` field.
- **New games:** add content to `data/games.json`, a render/show handler in `assets/games.js`, register the mode in `render()`, `afterRender()`, and `handleClick()`, then add a card to the hub and a mission entry in `site.json`.
- **New pages:** add a route in `App.routes` in `assets/app.js`.
- **New languages:** wrap user-facing strings in `t()` and add locale files; the data layer is already separate from the UI.
- **Classroom mode:** add a shared code in `CSA.store`; progress can be aggregated server-side later.

## 6. Safety / ethics

All content is conceptual and defensive. No working exploit code, malware source, or attacking instructions are included. Every hands-on activity runs locally in the browser with simulated data. See `#/responsible` for the full policy and legal disclaimer.
