# Development Log

## Iteration 1
### Timestamp
2026-03-13 22:53:23 WIB

### Request
- Review `artefacts` first, then the entire repo.
- Make all necessary updates until the app can run with Vite.
- Keep this file as the ongoing SDLC loop log for work and feedback.

### Work Log
- Reviewed repository structure and existing artefacts:
  - `artefacts/prd.md`
  - `artefacts/trd.md`
  - app entrypoints and Vite config
- Confirmed the repo already contains a vanilla JS PWA implementation and Vite scripts.
- Validated the current local environment state:
  - `node_modules` was missing
  - `npm run build` failed because `vite` was not installed yet
- Installed npm dependencies and re-ran the Vite production build successfully.
- Audited implementation details against PRD/TRD acceptance criteria and patched reliability issues.
- Re-ran the Vite build after code changes and confirmed it still completes successfully.
- Checked local dev-server startup path and confirmed sandbox policy blocks opening a listening port in this environment.

### Findings
- The first blocker was environment setup, not application code:
  - build error: `sh: 1: vite: not found`
- The app builds with Vite once dependencies are installed.
- Runtime improvements were needed for acceptance reliability:
  - default category seeding was asynchronous without being awaited
  - reminder capability handling did not distinguish blocked vs unsupported notifications
  - reminder delivery only scheduled a single timeout and did not reschedule after firing
- Local dev-server bind attempts in this environment fail due to sandbox restriction:
  - `Error: listen EPERM: operation not permitted 127.0.0.1:5173`

### Changes Made
- Added this log file for the SDLC loop record.
- Installed project dependencies and generated `package-lock.json`.
- Updated `public/app.js`:
  - awaited default category seeding during app initialization
  - improved reminder permission state handling
  - added reminder rescheduling after a notification fires
- Added `.gitignore` entries for `node_modules` and `dist`.

### Next Step
- Wait for acceptance review feedback and continue with the next loop as a new append-only iteration.

## Iteration 2
### Timestamp
2026-03-13 22:53:30 WIB

### Request
- Revisit `artefacts/log.md`.
- Make every loop time-based with date and timestamp.
- Use this iteration format:
  - `Request`
  - `Work Log`
  - `Findings`
  - `Changes Made`
  - `Next Step`
- Append new iterations instead of rewriting prior ones.

### Work Log
- Reviewed the existing log structure.
- Identified that the previous version behaved like a rolling status summary rather than an append-only development log.
- Restructured the file into explicit iterations with timestamps.
- Preserved the prior work as `Iteration 1`.
- Added this feedback handling as `Iteration 2` instead of merging it into the previous entry.

### Findings
- The previous log format was not suitable for an SDLC loop history because it collapsed multiple actions into one rewritten state.
- Future entries need to be appended as new iterations, even when the change is only about process or logging format.

### Changes Made
- Renamed the document heading from a task-style log to a development log.
- Converted the existing content into a timestamped iteration.
- Added a second timestamped iteration to record your feedback and the logging format correction.
- Standardized the section structure for future iterations.

### Next Step
- Continue appending all future work and feedback as new timestamped iterations without rewriting prior entries.
