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

## Iteration 3
### Timestamp
2026-03-13 23:18:16 WIB

### Request
- Read `artefacts`, use `artefacts/log.md` as the append-only iteration log.
- Apply the 17 UI and behavior review items for spacing, CTA copy, archived visibility, empty-state cleanup, picker cleanup, icon behavior, form layout, advanced options default state, tracking mode contrast, input focus stability, category toast, reminder/notification hiding, mini view hiding, unchecked new habits, year heatmap correctness, yearly-only detail, and spacing consistency.

### Work Log
- Reviewed the current artefacts and mapped each review item to `public/app.js` and `public/styles.css`.
- Refactored the habit form into a two-column layout with a larger visual picker on the right and name/description on the left.
- Removed full modal rerenders during normal typing and picker searching so input focus is preserved while editing.
- Reworked the picker UI to render icon-only tiles and switched colorable icons to SVG-based visuals.
- Simplified the dashboard and detail views to hide unfinished or unnecessary surfaces.
- Rebuilt spacing rules around the shell, header actions, cards, and field groupings for more consistent 10px separation.
- Ran `npm run build` after the changes and confirmed a successful production build.

### Findings
- The one-character typing bug came from re-rendering the entire modal on every `input` event.
- The habit detail year issue was likely caused by local-date iteration drift; the yearly heatmap is now generated with UTC date stepping.
- The existing icon model did not support recoloring because the "icon" tab used emoji-like glyphs rather than vector icons.
- The app currently serves `public/app.js` directly, so using a bundled npm icon package would require a broader entrypoint restructure; a local SVG icon set was the lowest-risk way to satisfy the colorable icon requirement now.

### Changes Made
- Updated the header and page spacing to use consistent gaps and added visible separation between the top actions and the selected-year card.
- Replaced the empty-state dual CTA with a single `Create first habit` button.
- Hid the archive panel trigger when there are zero archived habits and skipped rendering the archived panel when empty.
- Hid `Today` and `Reminders` cards on the first page when there are no active habits.
- Reworked the picker so each tile shows only a larger icon or emoji with no redundant text labels.
- Added a local SVG icon set for the icon tab so icon color follows the selected habit accent color.
- Changed the create/edit modal into a two-column layout and enlarged the visual preview on the right side.
- Set `Advanced options` to be collapsed by default.
- Improved select/input contrast with dark color-scheme styling and explicit `option` colors.
- Fixed focus loss while typing by updating draft state without rerendering the whole modal on every keystroke.
- Added a toast for successful category creation.
- Hid reminder and notification controls from the habit form for now.
- Removed the mini view from the visible view switcher and kept only cards and weekly.
- Adjusted the single-step action button so incomplete habits no longer look pre-checked.
- Switched yearly heatmap date generation to UTC stepping to avoid rolling into the wrong year.
- Simplified habit detail to show only the yearly heatmap.
- Tightened spacing consistency around advanced fields such as categories and unit label.

### Next Step
- Validate the updated flows interactively in the browser, especially create/edit, category creation toast, and yearly heatmap behavior across multiple browser timezones.

## Iteration 4
### Timestamp
2026-03-13 23:33:52 WIB

### Request
- Address the follow-up review:
  - consistent gap between view switcher and habit cards
  - modal should not scroll back to top when selecting accent or icon/emoji
  - selected categories should use the same notable highlight family as primary buttons
  - keep the icon area on the right in the modal two-column layout
  - keep icon and accent as basic options, with advanced limited to categories and tracking mode
  - make modal section spacing more consistent
  - use neutral color for unchecked round action and primary highlight when checked
  - ensure the heatmap updates when a habit is completed

### Work Log
- Re-reviewed the form layout, card spacing, and completion rendering paths in `public/app.js` and `public/styles.css`.
- Found that the compact card heatmap was showing the final 140 days of the year, which often excluded today entirely and made completion appear not to update.
- Added modal scroll preservation around picker open/close and picker selection flows.
- Rebalanced the modal layout so the right visual column is explicitly sized and aligned on desktop.
- Reworked selection and completion styling to better match the primary orange action treatment.
- Rebuilt the app with Vite after the changes.

### Findings
- The heatmap update problem was primarily a visibility bug, not a persistence bug: the compact heatmap window was anchored to year-end rather than to today for the current year.
- Accent changes already avoided full rerendering, but picker transitions still needed explicit form-scroll restoration.
- The prior modal layout was technically two-column but too loose in sizing, which made the right-side visual area feel unstable.

### Changes Made
- Set the main habit card list gap to match the surrounding 10px rhythm and removed the extra bottom margin from individual cards.
- Added form-modal scroll restoration so opening the picker, selecting a visual, or closing the picker returns to the previous scroll position.
- Updated selected category chips to use the same orange highlight family as the primary CTA buttons.
- Tightened the two-column modal layout with a dedicated right visual column and a slightly wider modal width.
- Moved `Target per day` and `Unit label` into the basic form area so advanced options now focus on tracking mode and categories.
- Standardized modal block spacing and field-grid spacing for more consistent section rhythm.
- Swapped the single-step action button colors so unchecked is neutral and checked uses the primary highlight.
- Fixed compact habit-card heatmaps to show a window ending at today for the current year, so completion changes are visible immediately.

### Next Step
- Validate the revised modal behavior and compact heatmap visually in-browser, especially on smaller desktop widths and mobile breakpoints.

## Iteration 5
### Timestamp
2026-03-13 23:45:12 WIB

### Request
- Apply the next review pass:
  - add visible gap between the view-switch card and habit list
  - hide reminder section on home
  - make the full home habit card open edit
  - move icon selection to the right of name and description inside the modal form section
  - move Goal back under advanced options and recheck PRD for the default tracking behavior
  - improve vertical spacing between modal section blocks

### Work Log
- Rechecked `artefacts/prd.md` around completion tracking modes and the binary completion expectations.
- Updated the home dashboard composition and card interaction flow in `public/app.js`.
- Restructured the form so the main habit section contains a two-column split: left for name/description, right for icon selection.
- Moved goal controls back into advanced options and kept tracking mode there as well.
- Adjusted modal spacing and home section spacing in `public/styles.css`.
- Rebuilt with Vite to verify the changes compile cleanly.

### Findings
- The PRD still supports the current default behavior through the binary completion path: `trackingType = step` with `targetPerDay = 1`, which yields done vs not done by default.
- The missing gap between the switcher and the list came from the wrapper section lacking its own top spacing even though inner card spacing had already been tightened.
- The previous modal change placed icon selection in a separate right column at the page level, but your requested structure is specifically within the main form section beside name and description.

### Changes Made
- Added explicit spacing between the view-switcher card and the habit list section.
- Removed the reminder stat card from the home dashboard and kept only the Today summary.
- Changed the full habit card tap target in cards view to open edit directly.
- Updated the `edit-habit` action to accept a habit id from the card tap target.
- Moved icon selection into the same main form section as name and description, with a two-column inline layout.
- Moved Goal back under Advanced options alongside tracking mode and categories.
- Added more consistent spacing within the advanced/details block and between adjacent section blocks.

### Next Step
- Validate the new card-to-edit flow and the restructured modal visually in-browser, especially around desktop width changes and the advanced section spacing.

## Iteration 6
### Timestamp
2026-03-14 00:09:00 WIB

### Request
- Hide categories because they are making the flow messy.
- Reorder Advanced options to focus on:
  - Goal
  - Set daily target
  - Tracking mode
  - small tooltip explaining each tracking mode
  - Target per day
  - Unit label

### Work Log
- Reviewed the current Advanced options block and the remaining visible category surfaces in the habit card and habit form.
- Removed category selection and category creation from the visible habit form while leaving the underlying data model untouched.
- Reordered the Advanced options content so the goal section leads with tracking mode, then the daily target inputs.
- Added inline helper copy to explain when `Step by step` and `Custom value` should be used.

### Findings
- Categories were still exposed in two user-facing places: the Advanced options form section and the habit card subtitle fallback.
- Hiding categories cleanly only required UI changes; no data migration or storage changes were necessary.

### Changes Made
- Updated the habit card subtitle to show description only, with no category fallback.
- Removed the visible Categories section from Advanced options.
- Reordered Advanced options to show the goal header, tracking mode, helper text, target per day, and unit label.
- Added muted helper-text styling for the tracking mode explanation.

### Next Step
- Validate the simplified Advanced options flow in-browser and confirm the helper text is clear on both mobile and desktop widths.

## Iteration 7
### Timestamp
2026-03-14 00:14:00 WIB

### Request
- Fix the empty page regression after Iteration 6.
- Browser console reports: `app.js:729 Uncaught SyntaxError: Unexpected number`

### Work Log
- Inspected the rendered source location around the reported line in `public/app.js`.
- Traced the parse failure to the new helper text added inside a JavaScript template literal.
- Replaced the raw backtick-wrapped `1` with plain text so the template literal parses correctly again.

### Findings
- The regression was not a build failure; it was a runtime parse error caused by unescaped backticks inside a template string.
- Vite still completed the build because the file was copied as a public asset rather than being transformed as an imported JS module.

### Changes Made
- Fixed the helper text in `public/app.js` by removing the raw backticks around `1`.
- Appended this regression fix as a new iteration in the development log.

### Next Step
- Rebuild and reload the app to confirm the page renders normally and the simplified Advanced options flow still matches the requested structure.

## Iteration 8
### Timestamp
2026-03-14 00:21:00 WIB

### Request
- Show the tracking tooltip only for the currently selected mode.
- When `Custom value` is selected, the helper should explain custom value usage.
- When `Step by step` is selected, hide `Target per day` and `Unit label`, and default them to `1` and empty.
- Change the header copy so `Habit Heatmap` is the main title and the tagline reads `Track your habit with GitHub style commit`.
- Hide the button on the left side of `Selected year`.

### Work Log
- Updated the form rendering so tracking-mode helper text is generated from the selected option instead of showing both explanations at once.
- Changed the advanced goal section to only render target/unit inputs for `custom` tracking.
- Added draft-state defaults so switching back to `step` resets the hidden fields to the binary default.
- Revised the top header copy and removed the left-side year navigation button.

### Findings
- Contextual helper text is clearer than a combined explanation because the form now only explains the mode the user has actually chosen.
- Hiding custom-only inputs requires resetting their values in state as well, otherwise old values can silently persist into later saves.

### Changes Made
- Added selected-mode helper text rendering for tracking mode.
- Hid `Target per day` and `Unit label` unless `Custom value` is selected.
- Defaulted `step` mode back to `targetPerDay = 1` and `unitLabel = ""` when selected.
- Updated the main header title/tagline copy.
- Removed the left year-navigation button from the selected-year card.

### Next Step
- Validate the tracking-mode switch behavior in-browser, especially switching from `custom` back to `step` before saving.

## Iteration 9
### Timestamp
2026-03-14 00:35:00 WIB

### Request
- Remove year switching entirely.
- Since the current year is 2026, there is no need to show 2025 or 2027.
- Hide the selected-year UI after simplifying this behavior.

### Work Log
- Removed the selected-year card from the main shell.
- Deleted the year-switch action path from the click handler.
- Pinned compact and detail heatmaps to a single `CURRENT_YEAR` constant.
- Updated the detail modal label to always show the current year.

### Findings
- The shift bug came from keeping mutable year state while the UI was being partially hidden.
- Fixing the app to the current year removes that inconsistent state and matches the simplified product behavior you asked for.

### Changes Made
- Added `CURRENT_YEAR` and used it for year-based heatmap rendering.
- Removed selected-year rendering from the home screen.
- Removed year-switch behavior from the event handler.
- Cleaned up styles that only existed for the removed year bar.

### Next Step
- Reload and confirm there is no year control visible and both home/detail heatmaps remain fixed to the current year.

## Iteration 10
### Timestamp
2026-03-14 00:43:00 WIB

### Request
- When `Tracking mode` is changed to `Step by step`, the tooltip should switch immediately to the step explanation.
- `Target per day` and `Unit label` should hide immediately for `step`.
- `step` should save as `targetPerDay = 1` and empty `unitLabel`.

### Work Log
- Reviewed the modal event flow for the `Tracking mode` select.
- Found that the select used `data-field`, but select changes were not being handled by the generic draft update path.
- Added explicit `select[data-field]` handling so changing the tracking mode rerenders the form immediately.
- Added save-time normalization so `step` mode always persists binary defaults.

### Findings
- The conditional UI logic was already present, but it depended on draft state updating through a select change path that was missing.
- Save-time normalization is still necessary as a safeguard so stale custom values never persist into `step` habits.

### Changes Made
- Added select change handling for `data-field` controls.
- Ensured `step` mode always saves with `targetPerDay = 1` and `unitLabel = ""`.
- Logged the fix as a new iteration.

### Next Step
- Reload the form and verify that switching to `Step by step` immediately changes the helper text, hides the custom-only fields, and saves the binary defaults.
