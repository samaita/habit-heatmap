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
- Testing: framework-agnostic unit tests (if added) plus Playwright mobile viewport tests for acceptance flows.

## 4. Acceptance Criteria Design

### 12.1 App Structure
Design:
- `manifest.webmanifest` + install icons + theme color.
- Service worker registration on app bootstrap.
- Cloudflare Pages deploy target with static bundle.
- No auth routes/components.
- No sync client/service endpoints.

```mermaid
flowchart TD
  A[User opens app] --> B{Installed PWA?}
  B -->|Yes| C[Launch standalone app shell]
  B -->|No| D[Launch in mobile browser]
  C --> E[Load local IndexedDB data]
  D --> E
  E --> F[Render habits without login]
  F --> G[All writes stay local]
```

### 12.2 Empty State
Design:
- Empty state shown when `activeHabits.count == 0`.
- Two triggers route to same create habit modal: central CTA and plus button.

```mermaid
flowchart TD
  A[Load active habits] --> B{Any active habit?}
  B -->|No| C[Render empty state CTA + plus]
  B -->|Yes| D[Render main habit views]
  C --> E[Tap central CTA]
  C --> F[Tap plus]
  E --> G[Open create habit flow]
  F --> G
```

### 12.3 Create Habit
Design:
- Form fields: name, icon/emoji selector, color (required); description/categories/reminder/etc optional.
- Validation gate controls Save enabled state.
- On save: insert habit into IndexedDB, refresh in-memory store, render card immediately.

```mermaid
flowchart TD
  A[Open create habit] --> B[Input name/icon/color]
  B --> C{Required valid?}
  C -->|No| D[Save disabled]
  C -->|Yes| E[Save enabled]
  E --> F[Persist Habit to IndexedDB]
  F --> G[Update UI store]
  G --> H[Show new habit in main view]
```

### 12.4 Edit Habit
Design:
- Edit screen preloads existing habit values.
- Save writes update transaction in IndexedDB.
- Post-save rehydrates store from update result; persisted values survive refresh.

```mermaid
flowchart TD
  A[Open habit detail] --> B[Tap Edit]
  B --> C[Modify fields]
  C --> D[Save changes]
  D --> E[Update habit in IndexedDB]
  E --> F[Refresh local UI state]
  F --> G[Reload app]
  G --> H[Edited values still present]
```

### 12.5 Icon and Emoji Picker
Design:
- Bottom sheet picker with segmented tabs `Icon | Emoji`.
- Search filter applied to currently selected tab dataset.
- Selected value updates form preview and habit card/icon tile.

```mermaid
flowchart TD
  A[Open picker] --> B{Tab selected}
  B -->|Icon| C[Show icon grid]
  B -->|Emoji| D[Show emoji grid]
  C --> E[Search/filter]
  D --> E
  E --> F[Tap item]
  F --> G[Set iconType + iconValue]
  G --> H[Reflect selection in habit UI]
```

### 12.6 Categories
Design:
- Multi-select categories in selector modal.
- "Create category" path: name + icon required.
- New category written to IndexedDB then immediately available in selection list for current/future habits.

```mermaid
flowchart TD
  A[Open category selector] --> B{Choose existing or create new}
  B -->|Existing| C[Toggle one/many categories]
  B -->|Create| D[Enter category name + icon]
  D --> E[Save category to IndexedDB]
  E --> F[Append to selector list]
  C --> G[Save habit category links]
  F --> G
  G --> H[Category selectable in future flows]
```

### 12.7 Completion Modes
Design:
- Mode selector: `step` or `custom`.
- `targetPerDay` required positive integer.
- Progress calculation:
  - Step mode entries contribute value `1` each.
  - Custom mode entries contribute user numeric value.
- Daily progress ratio drives heatmap state.

```mermaid
flowchart TD
  A[Configure habit] --> B[Pick tracking mode]
  B --> C[Set targetPerDay]
  C --> D[Log completion entries]
  D --> E[Aggregate daily total]
  E --> F[Compute ratio total/target]
  F --> G[Set cell state 0/low/medium/full]
```

### 12.8 Single Entry Habit
Design:
- For `targetPerDay = 1`, card action is single-tap complete.
- Action writes completion for today local date.
- UI store updates instantly; heatmap current cell rerenders in same frame budget.

```mermaid
flowchart TD
  A[Habit target=1] --> B[Tap check button]
  B --> C[Write today's completion]
  C --> D[Recompute today's progress]
  D --> E[Update current heatmap cell]
  E --> F[Show completed state immediately]
```

### 12.9 Counted Habit
Design:
- For `targetPerDay > 1`, card action increments progress (or opens quick input for custom values).
- Each entry updates daily aggregate.
- Heatmap transitions through partial and full intensity states.

```mermaid
flowchart TD
  A[Habit target>1] --> B[Tap plus/progress action]
  B --> C{Mode}
  C -->|Step| D[Add value 1]
  C -->|Custom| E[Enter numeric value]
  D --> F[Persist completion]
  E --> F
  F --> G[Aggregate day total]
  G --> H{Total >= target?}
  H -->|No| I[Render partial fill]
  H -->|Yes| J[Render full fill]
```

### 12.10 Heatmap
Design:
- Compact heatmap on main card, expanded heatmap in detail.
- Expanded view includes month headers and weekday labels.
- Cell color derives from habit color palette with intensity tiers.
- Zero-progress days use muted baseline tone.

```mermaid
flowchart TD
  A[Load habit + completions] --> B[Build date grid]
  B --> C[Map each date to daily progress]
  C --> D[Derive state by ratio]
  D --> E[Apply habit color intensity]
  E --> F[Render compact heatmap]
  E --> G[Render expanded heatmap + month labels]
```

### 12.11 Detail View
Design:
- Opening a habit presents detail modal/page containing:
  - large heatmap
  - month calendar
  - edit action
  - archive action
- Detail receives live updates from the same local store as main views.

```mermaid
flowchart TD
  A[Tap habit card] --> B[Open detail view]
  B --> C[Render large heatmap]
  B --> D[Render month calendar]
  B --> E[Render Edit action]
  B --> F[Render Archive action]
  E --> G[Open edit flow]
  F --> H[Archive habit]
```

### 12.12 Archive
Design:
- Archive action toggles `habit.archived = true`.
- Active queries filter `archived = false`.
- Archived list reads `archived = true` from same local DB.
- Completion history remains untouched.

```mermaid
flowchart TD
  A[Open habit menu] --> B[Select Archive]
  B --> C[Set habit.archived=true]
  C --> D[Persist to IndexedDB]
  D --> E[Refresh active habits query]
  E --> F[Habit disappears from active views]
  D --> G[Archived query still returns habit + history]
```

### 12.13 View Modes
Design:
- Bottom switcher selects among 3 presentations backed by the same habit/query model.
- Views:
  - standard heatmap cards
  - recent-days compact strip
  - mini-card/grid list
- Switching views changes presentation only, never the underlying data.

```mermaid
flowchart TD
  A[Load active habits] --> B[Read current view mode]
  B --> C{Selected mode}
  C -->|Standard| D[Render heatmap cards]
  C -->|Recent| E[Render compact recent-days view]
  C -->|Mini| F[Render mini-card grid]
  D --> G[All views read same habit data]
  E --> G
  F --> G
```

### 12.14 Persistence
Design:
- IndexedDB stores habits, categories, completions, and reminders.
- Service worker caches the app shell for repeat load and offline access.
- App boot rehydrates local state entirely from browser storage with no server dependency.

```mermaid
flowchart TD
  A[User creates/edits/logs data] --> B[Write to IndexedDB]
  B --> C[Refresh local UI state]
  C --> D[User closes app]
  D --> E[User reopens app offline or online]
  E --> F[Load app shell from cache]
  F --> G[Load data from IndexedDB]
  G --> H[Render same local state]
```

### 12.15 Reminder
Design:
- Reminder configuration is stored per habit in local data.
- UI supports multiple reminder times, enable/disable, and supported/unsupported-state messaging.
- Delivery is best-effort based on browser/platform capability; unsupported environments keep configuration visible without breaking core tracking.

```mermaid
flowchart TD
  A[Open habit reminder settings] --> B[Add or edit reminder time]
  B --> C[Persist reminder config locally]
  C --> D{Environment supports delivery?}
  D -->|Yes| E[Register reminder delivery path]
  D -->|No| F[Show unsupported state]
  E --> G[Core app still local-first]
  F --> G
```

## 5. Cross-Cutting Technical Decisions
- Date handling: local date keys (`YYYY-MM-DD` in device locale context) to avoid UTC day shifts.
- State model: optimistic local updates first, DB commit second, rollback only on hard failure.
- Performance target: completion action to visible UI update under 100 ms.
- Accessibility: icon-only actions include aria-labels; color states not solely color-dependent when possible.

## 6. Non-Implementation Deliverable Boundary
This document is design-only and intentionally excludes implementation tasks, migrations, and source code changes.
