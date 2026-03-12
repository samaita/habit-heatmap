# TRD - Habit Heatmap MVP

## 1. Scope Alignment
This TRD maps directly to PRD acceptance criteria `12.1` through `12.15`.

Scope exclusions carried from PRD:
- no streak feature
- no sharing feature
- no onboarding flow in MVP

## 2. Architecture Baseline
- Frontend: mobile-first PWA built with vanilla JavaScript modules (no frontend framework).
- Hosting: Cloudflare Pages (static assets).
- Local data: IndexedDB (primary), localStorage (UI preferences only).
- Offline: Service Worker with app shell and static asset caching.
- No auth, no cloud sync, no remote habit data storage.

Core entities:
- `Habit`: id, name, description, iconType, iconValue, color, archived, createdAt, updatedAt, trackingType, targetPerDay, unitLabel.
- `Category`: id, name, iconType, iconValue, isSystem, createdAt.
- `Completion`: id, habitId, dateLocal, value, createdAt, updatedAt.
- `Reminder` (local capability model): id, habitId, time, enabled, deliverySupport.

Derived read models:
- `DailyProgress(habitId, dateLocal) = sum(completion.value)`.
- `HeatmapCellState` from progress ratio: `0`, `low`, `medium`, `full`.

## 3. Stack
- Runtime/Language: Vanilla JavaScript (ES modules) on modern mobile browsers.
- UI Architecture: framework-free component pattern using reusable template/render functions.
- Build Tooling: Vite (or equivalent static bundler) for asset bundling and Cloudflare Pages output.
- Styling: Primer CSS (GitHub design system) for base UI patterns + small custom CSS for heatmap cells, dark theme tuning, and mobile-specific layout details.
- PWA Layer: `manifest.webmanifest` + native Service Worker for installability and offline app-shell caching.
- Client Data: native IndexedDB as the primary persistence layer; localStorage only for lightweight UI preferences.
- Date/Time: native `Date` with strict local-date keying (`YYYY-MM-DD`) to avoid UTC bucket drift.
- Icons/Emoji: SVG icon set (local assets) plus native emoji rendering for the dual picker model.
- Deployment: Cloudflare Pages for static hosting; optional Cloudflare Worker only for reminder delivery mechanics where supported, never for habit data storage.
- Testing: manual testing only for MVP. Validation is done by checking the PRD acceptance flows directly in the running app.

## 4. Acceptance Criteria Design

### 12.1 App Structure
Design:
- `manifest.webmanifest` + install icons + theme color.
- Service worker registration on app bootstrap.
- Cloudflare Pages deploy target with static bundle.
- No auth routes/components.
- No sync client/service endpoints.

```text
[User opens app]
        |
        v
[Installed PWA?] -- yes --> [Launch standalone app shell]
        | no
        v
[Launch in mobile browser]
        |
        v
[Load local IndexedDB data]
        |
        v
[Render habits without login]
        |
        v
[All writes stay local]
```

### 12.2 Empty State
Design:
- Empty state shown when `activeHabits.count == 0`.
- Two triggers route to same create habit modal: central CTA and plus button.

```text
[Load active habits]
        |
        v
[Any active habit?] -- yes --> [Render main habit views]
        | no
        v
[Render empty state CTA + plus]
        |                    |
        | tap central CTA    | tap plus
        v                    v
          [Open create habit flow]
```

### 12.3 Create Habit
Design:
- Form fields: name, icon/emoji selector, color (required); description/categories/reminder/etc optional.
- Validation gate controls Save enabled state.
- On save: insert habit into IndexedDB, refresh in-memory store, render card immediately.

```text
[Open create habit]
        |
        v
[Input name/icon/color]
        |
        v
[Required valid?] -- no --> [Save disabled]
        | yes
        v
[Save enabled]
        |
        v
[Persist Habit to IndexedDB]
        |
        v
[Update UI store]
        |
        v
[Show new habit in main view]
```

### 12.4 Edit Habit
Design:
- Edit screen preloads existing habit values.
- Save writes update transaction in IndexedDB.
- Post-save rehydrates store from update result; persisted values survive refresh.

```text
[Open habit detail]
        |
        v
[Tap Edit]
        |
        v
[Modify fields]
        |
        v
[Save changes]
        |
        v
[Update habit in IndexedDB]
        |
        v
[Refresh local UI state]
        |
        v
[Reload app]
        |
        v
[Edited values still present]
```

### 12.5 Icon and Emoji Picker
Design:
- Bottom sheet picker with segmented tabs `Icon | Emoji`.
- Search filter applied to currently selected tab dataset.
- Selected value updates form preview and habit card/icon tile.

```text
[Open picker]
        |
        v
[Tab selected?] -- Icon --> [Show icon grid]
        | Emoji
        v
[Show emoji grid]

[Show icon grid / Show emoji grid]
        |
        v
[Search/filter]
        |
        v
[Tap item]
        |
        v
[Set iconType + iconValue]
        |
        v
[Reflect selection in habit UI]
```

### 12.6 Categories
Design:
- Multi-select categories in selector modal.
- "Create category" path: name + icon required.
- New category written to IndexedDB then immediately available in selection list for current/future habits.

```text
[Open category selector]
        |
        v
[Choose existing or create new]
        | existing                  | create
        v                           v
[Toggle one/many categories]   [Enter category name + icon]
        |                           |
        |                           v
        |                     [Save category to IndexedDB]
        |                           |
        |                           v
        |                     [Append to selector list]
        |___________________________|
                    |
                    v
         [Save habit category links]
                    |
                    v
     [Category selectable in future flows]
```

### 12.7 Completion Modes
Design:
- Mode selector: `step` or `custom`.
- `targetPerDay` required positive integer.
- Progress calculation:
  - Step mode entries contribute value `1` each.
  - Custom mode entries contribute user numeric value.
- Daily progress ratio drives heatmap state.

```text
[Configure habit]
        |
        v
[Pick tracking mode]
        |
        v
[Set targetPerDay]
        |
        v
[Log completion entries]
        |
        v
[Aggregate daily total]
        |
        v
[Compute ratio total/target]
        |
        v
[Set cell state 0/low/medium/full]
```

### 12.8 Single Entry Habit
Design:
- For `targetPerDay = 1`, card action is single-tap complete.
- Action writes completion for today local date.
- UI store updates instantly; heatmap current cell rerenders in same frame budget.

```text
[Habit target=1]
        |
        v
[Tap check button]
        |
        v
[Write today's completion]
        |
        v
[Recompute today's progress]
        |
        v
[Update current heatmap cell]
        |
        v
[Show completed state immediately]
```

### 12.9 Counted Habit
Design:
- For `targetPerDay > 1`, card action increments progress (or opens quick input for custom values).
- Each entry updates daily aggregate.
- Heatmap transitions through partial and full intensity states.

```text
[Habit target>1]
        |
        v
[Tap plus/progress action]
        |
        v
[Mode?] -- Step --> [Add value 1]
   | Custom
   v
[Enter numeric value]

[Add value 1 / Enter numeric value]
        |
        v
[Persist completion]
        |
        v
[Aggregate day total]
        |
        v
[Total >= target?] -- no --> [Render partial fill]
        | yes
        v
[Render full fill]
```

### 12.10 Heatmap
Design:
- Compact heatmap on main card, expanded heatmap in detail.
- Each heatmap cell represents exactly one calendar date.
- The heatmap sequence starts at `January 1` of the selected year and continues day by day through `December 31`.
- Expanded view includes month headers and weekday labels.
- Cell color derives from habit color palette with intensity tiers.
- Zero-progress days use muted baseline tone.

```text
[Load habit + completions]
        |
        v
[Build date grid for Jan 1 -> Dec 31 of selected year]
        |
        v
[Map each date to daily progress]
        |
        v
[Derive state by ratio]
        |
        v
[Apply habit color intensity]
        |
        +--> [Render compact heatmap]
        |
        +--> [Render expanded heatmap + month labels]
```

### 12.11 Detail View
Design:
- Opening a habit presents detail modal/page containing:
  - large heatmap
  - month calendar
  - edit action
  - archive action
- Detail receives live updates from the same local store as main views.

```text
[Tap habit card]
        |
        v
[Open detail view]
        |
        +--> [Render large heatmap]
        |
        +--> [Render month calendar]
        |
        +--> [Render Edit action] ----> [Open edit flow]
        |
        +--> [Render Archive action] -> [Archive habit]
```

### 12.12 Archive
Design:
- Archive action toggles `habit.archived = true`.
- Active queries filter `archived = false`.
- Archived list reads `archived = true` from same local DB.
- Completion history remains untouched.

```text
[Open habit menu]
        |
        v
[Select Archive]
        |
        v
[Set habit.archived=true]
        |
        v
[Persist to IndexedDB]
        |
        +--> [Refresh active habits query]
        |           |
        |           v
        |   [Habit disappears from active views]
        |
        +--> [Archived query still returns habit + history]
```

### 12.13 View Modes
Design:
- Bottom switcher selects among 3 presentations backed by the same habit/query model.
- Views:
  - standard heatmap cards
  - recent-days compact strip
  - mini-card/grid list
- Switching views changes presentation only, never the underlying data.

```text
[Load active habits]
        |
        v
[Read current view mode]
        |
        v
[Selected mode?] -- Standard --> [Render heatmap cards]
        | Recent --------------> [Render compact recent-days view]
        | Mini ----------------> [Render mini-card grid]
        |
        v
[All views read same habit data]
```

### 12.14 Persistence
Design:
- IndexedDB stores habits, categories, completions, and reminders.
- Service worker caches the app shell for repeat load and offline access.
- App boot rehydrates local state entirely from browser storage with no server dependency.

```text
[User creates/edits/logs data]
        |
        v
[Write to IndexedDB]
        |
        v
[Refresh local UI state]
        |
        v
[User closes app]
        |
        v
[User reopens app offline or online]
        |
        v
[Load app shell from cache]
        |
        v
[Load data from IndexedDB]
        |
        v
[Render same local state]
```

### 12.15 Reminder
Design:
- Reminder configuration is stored per habit in local data.
- UI supports multiple reminder times, enable/disable, and supported/unsupported-state messaging.
- Delivery is best-effort based on browser/platform capability; unsupported environments keep configuration visible without breaking core tracking.

```text
[Open habit reminder settings]
        |
        v
[Add or edit reminder time]
        |
        v
[Persist reminder config locally]
        |
        v
[Environment supports delivery?] -- yes --> [Register reminder delivery path]
        | no
        v
[Show unsupported state]
        |
        v
[Core app still local-first]
```

## 5. Cross-Cutting Technical Decisions
- Date handling: local date keys (`YYYY-MM-DD` in device locale context) to avoid UTC day shifts.
- State model: optimistic local updates first, DB commit second, rollback only on hard failure.
- Performance target: completion action to visible UI update under 100 ms.
- Accessibility: icon-only actions include aria-labels; color states not solely color-dependent when possible.

## 6. Non-Implementation Deliverable Boundary
This document is design-only and intentionally excludes implementation tasks, migrations, and source code changes.
