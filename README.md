# Lexis — Research Briefs, Instantly

> Type any topic. Get a structured, beautiful research brief from multiple sources in seconds.

Built by [Praise](https://hhhpraise.github.io/portfolio/) · [GitHub](https://github.com/Hhhpraise)

---

## What it does

Lexis solves information overload. Instead of opening 10 tabs and losing track, type a topic and get a single structured brief from:

| Source | What it provides |
|---|---|
| **Wikipedia** | Definition, summary, and cover image |
| **Open Library** | Books worth reading on the topic |
| **DEV.to** | Practitioner articles and tutorials |
| **Semantic Scholar** | Academic papers with hover-to-preview abstracts |
| **CrossRef** | Fallback paper source when Semantic Scholar rate-limits |
| **Curated quotes** | A relevant quote to anchor the brief (instant, no API) |

All sources are fetched in parallel. All are free and require no API keys.

## Why it's different

Most aggregators dump results. Lexis imposes editorial structure — every brief follows the same five-section format:

**Definition → Perspective → Deep Reading → Practitioner View → Research Frontier**

That structure is the product.

## Features

- **Abstract tooltip** — hover any research paper card on desktop to preview the abstract. Touch devices see nothing (detected via `@media (hover: hover) and (pointer: fine)`, not user-agent sniffing).
- **History** — saved briefs stored in `localStorage`, accessible from the History panel.
- **Staggered loading** — each API source resolves independently; a broken source never blocks the brief.
- **15-minute cache** — repeat searches skip the network entirely.

## Run locally

```bash
npm install
npm run dev
# → http://localhost:5173
```

## Deploy to GitHub Pages

```bash
npm run build
# Upload dist/ to your gh-pages branch
```

Or use a one-liner with the `gh-pages` package:

```bash
npm install -D gh-pages
npx gh-pages -d dist
```

## Project structure

```
lexis-brief/
├── index.html
├── vite.config.js
├── package.json
├── public/
│   └── favicon.svg
└── src/
    ├── main.js                    # App controller, view transitions, events
    ├── style.css                  # Design system, animations, tooltip styles
    ├── api/
    │   └── index.js               # All API fetchers + parallel orchestrator
    ├── components/
    │   ├── brief.js               # Pure render function for brief view
    │   └── abstractTooltip.js     # Hover tooltip — desktop only, matchMedia-gated
    └── utils/
        └── history.js             # localStorage history, 30-entry limit
```

## Roadmap

- [ ] Export brief as PDF
- [ ] Share brief via URL (encode topic in query string)
- [ ] News section via GNews API
- [ ] Dark/light theme toggle
- [ ] Keyboard shortcut reference modal
- [ ] Hacker News section (top HN discussion threads per topic)
- [ ] GitHub repos section (find relevant open-source projects)

## License

MIT
