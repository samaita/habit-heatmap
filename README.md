# Habit Heatmap

Habit Heatmap is a local-first PWA habit tracker inspired by GitHub contribution graphs.  
Core value: make consistency visible with a heatmap-first experience, minimal friction check-ins, and no account/cloud sync.

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
