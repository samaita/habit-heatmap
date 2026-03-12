# Habit Heatmap

This repo is a vibe-coded project with a specific purpose: test a structured vibe coding workflow instead of doing random prompting. I would like to see what is the best workflow to replicate a software as custom.

The focus here is not "ask AI to build something and see what happens." The focus is:
- define the product clearly in a PRD
- review and tighten the scope
- translate that scope into a TRD
- review the technical design before implementation

The current artifact set is intentionally docs-first. The repo is being used to validate whether vibe coding works better when guided by explicit product and technical review loops.

Product direction for the MVP:
- local-first PWA habit tracker
- heatmap-first UX inspired by GitHub contribution graphs
- no account system
- no cloud sync
- simplified MVP scope driven by PRD/TRD alignment

Key working principle:
- review `artefacts/prd.md` and `artefacts/trd.md` first
- use implementation as a follow-on step
- avoid unscoped feature prompting

## Stack
- Vanilla JavaScript (ES modules), mobile-first PWA
- Primer CSS + small custom CSS (heatmap states and mobile layout tuning)
- IndexedDB for primary local persistence
- Service Worker + `manifest.webmanifest` for offline/installable behavior
- Cloudflare Pages for deployment

## Run Locally
Current repository status: docs-first (implementation scaffold not committed yet).

When the app scaffold is present, use:

```bash
npm install
npm run dev
```

Expected local URL (default Vite): `http://localhost:5173`

Production preview:

```bash
npm run build
npm run preview
```

## Deploy
Target platform: Cloudflare Pages.

1. Build static assets:
```bash
npm run build
```
2. In Cloudflare Pages, create a project connected to this repository.
3. Configure:
- Build command: `npm run build`
- Build output directory: `dist`
4. Deploy and verify:
- PWA manifest is served
- Service worker is registered
- Main habit flows work offline after first load

## Workflow Intent
This repository exists to test a more disciplined AI-assisted workflow:

- start with product requirements
- review and simplify acceptance criteria
- align the technical design to the real MVP
- only then move into implementation

If you are using this repo as context for an AI coding session, the expected behavior is to inspect and reconcile the PRD and TRD before generating product code.
