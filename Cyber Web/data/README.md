# Content data files

All editable content lives here as plain JSON. `assets/app.js` loads these files with `fetch()` when the site is served over HTTP, and falls back to the generated `assets/data-inline.js` when opened directly from disk.

| File | Purpose |
|---|---|
| `site.json` | Brand, stats, domains, tips, self-check, Defense Center content, paths, glossary, timeline, resources, leaderboard, simulated threat map, achievements, arena missions |
| `attacks.json` | Threat Library entries — one object per attack page |
| `games.json` | Arena content — phishing scenarios, SOC alerts, CTF puzzles, trivia, flashcards, branching scenarios, network-defense waves |

After editing any JSON file, regenerate the offline fallback:

```bash
node tools/build-inline-data.js
```

## Attack record schema

```jsonc
{
  "id": "unique-slug",                 // used in #/threat/<id>
  "name": "Display Name",
  "domain": "exact domain name from site.json → domains[].id",
  "type": "Deception | Injection | Exposure | ...",
  "difficulty": "Beginner | Intermediate | Advanced",
  "severity": "Low | Medium | High | Critical",
  "aliases": ["Other names"],
  "summary": "One-line description for cards and search",
  "definition": "Plain-English explanation",
  "analogy": "Real-world comparison",
  "mitre": [{ "id": "T1566", "name": "Phishing", "note": "Short mapping note" }],
  "killChain": ["Stage name", "..."],
  "flow": [{ "n": 1, "title": "Step", "text": "What happens" }],
  "caseStudy": { "title": "", "year": "", "summary": "", "impact": "", "lesson": "" },
  "indicators": ["Warning sign"],
  "defense": {
    "prevention": ["Control"],
    "detection": ["Signal / log source"],
    "response": ["IR action"]
  },
  "tools": [{ "category": "Category", "examples": "Examples" }],
  "cheatSheet": {
    "quick": "One-line action",
    "redFlags": ["..."],
    "ifClicked": ["..."]
  },
  "variants": [{ "name": "Variant", "text": "Description" }],
  "deepDives": [{ "title": "Advanced topic", "text": "Optional extra detail" }],
  "related": ["other-attack-id"],
  "quiz": [{
    "q": "Question",
    "options": ["A", "B", "C", "D"],
    "answer": 1,                        // zero-based index
    "explain": "Why the answer is correct"
  }],
  "featured": false
}
```

Only `id`, `name`, `domain`, `summary`, `definition`, and `analogy` are required; the page renderer gracefully hides empty optional sections. Keep everything conceptual and defensive — no exploit code, malware source, or actionable attack instructions.
