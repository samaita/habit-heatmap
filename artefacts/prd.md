# PRD — PWA Replica of HabitKit-Style Habit Tracker

## 1. Background

The purpose of this product is to replicate a habit tracking app whose main appeal is a **GitHub-style heatmap** that shows consistency over time.

The emotional job of the product is not “task management.”
It is:

- make consistency visible
- make streak behavior satisfying
- provide a simple “commit history” for personal habits
- create confidence through visual proof of repetition

The product will be implemented as a **PWA** deployed on **Cloudflare Pages**.

Constraints:

- no cloud sync
- no account system
- no backend user storage
- data stays on device/browser
- reminders should still be supported using a Cloudflare-compatible approach for web push / scheduled reminder orchestration where feasible
- product should feel close to native mobile UX, especially on iPhone

This is a **reverse engineering replica**, so priority is matching the observed product behavior, interaction model, and visual hierarchy rather than inventing new features.

---

## 2. Goal

Build a fully working PWA replica of the referenced habit tracker with the following characteristics:

- local-only habit tracking
- GitHub-like heatmap as primary visual anchor
- support for both single-completion and counted-completion habits
- create, edit, archive, and view habits
- category, icon, emoji, color, streak, and reminder configuration
- multiple list/grid/time views
- mobile-first dark UI
- installable PWA behavior

The replica should achieve **feature-complete MVP parity** with the observed screenshots, except for explicitly ignored analytics/graph-heavy features not required for the core experience.

---

## 3. Product Principles

### 3.1 Local-first
All core habit data must work without login or sync.

### 3.2 Heatmap-first
The heatmap is the center of the product, not a side widget.

### 3.3 One-hand mobile interaction
Common actions must be reachable and fast on a phone.

### 3.4 Native-feeling dark UI
The experience should feel like an iOS dark-mode app, even though it is a PWA.

### 3.5 Minimal friction
Creating a habit and checking in must be fast.

---

## 4. Scope

## In Scope

- onboarding/info screen
- empty state
- create habit flow
- edit habit flow
- reorder habits
- icon picker
- emoji picker
- color selection
- advanced options expansion/collapse
- category selection
- create custom category
- binary completion mode
- counted completion mode
- heatmap card
- habit detail modal/view
- month navigation in detail view
- weekly/recent compact view
- multiple layout modes
- archive action
- local persistence
- PWA installability
- reminders

## Out of Scope for MVP

- cloud sync
- authentication
- multi-device sync
- paid subscription flow
- import/export
- theme customization beyond dark default
- widgets
- deep analytics graphs
- external integrations like Apple Health
- collaborative/social features
- onboarding / marketing, this is a self use, no need to market it yet

Note:
Some of these appear in screenshots as menu items or upsell surfaces, but they are not necessary for replica MVP unless explicitly included later.

---

## 5. User Personas

### 5.1 Solo consistency tracker
Wants to visually prove they are showing up every day.

### 5.2 Minimalist habit logger
Does not want bloated productivity software.

### 5.3 “Commit confidence” user
Wants a contribution-style board that shows they are building discipline.

---

## 6. Core User Jobs

Users should be able to:

- create a habit
- choose a color and icon/emoji
- optionally attach categories
- define how completion is counted
- mark progress daily
- view consistency through a heatmap
- inspect a habit in more detail
- share the habit card as an image
- archive habits they no longer track
- receive reminders without needing cloud sync

---

## 7. Observed Feature Set from Screenshots

The following features are directly visible in the provided reference:

### 7.1 Onboarding / marketing screen
A one-page intro lists major app capabilities:
- build habits
- check off completions
- heatmap visualization
- streaks
- reminders
- dashboard customization
- edit history
- sharing
- widgets
- privacy / local-only storage

### 7.2 Empty state
If no habits exist:
- branded header
- settings button
- plus button
- graph icon
- PRO badge
- central CTA “Get started”

### 7.3 New Habit creation
Fields visible:
- icon preview area
- name
- optional description
- color picker
- advanced options accordion
- save button disabled until valid

### 7.4 Edit Habit
Editable:
- name
- color
- streak goal interval
- reminder
- categories
- completion tracking mode
- completions per day
- maybe icon/category refinement

### 7.5 Icon / Emoji picker
Two-tab selector:
- Icon
- Emoji

Includes:
- search input
- categorized grid
- selectable items
- reusable in category creation and habit editing

### 7.6 Categories
User can:
- pick one or multiple categories
- choose from predefined categories
- create a custom category
- custom category requires icon + name

### 7.7 Completion tracking modes
Observed modes:
- Step By Step
- Custom Value

Step By Step:
- increments by 1 per completion
- user configures target count per day

Custom Value:
- user enters custom value for completion
- likely for metrics such as pages read, minutes studied, liters drank, etc.

### 7.8 Streak goal
Selectable interval options:
- None
- Daily
- Week
- Month

### 7.9 Main habit card
Card includes:
- icon block
- habit name
- description/subtitle
- check/completion action button
- heatmap block beneath header
- color-driven styling
- bottom tab/view switcher

### 7.10 Detail view / modal
Expanded habit detail shows:
- larger heatmap with month labels
- day-of-week labels
- streak goal pill
- streak count / flame metric
- edit action
- settings/menu action
- share option
- archive option
- monthly calendar view below
- month picker
- previous/next month controls

### 7.11 Alternate display modes
Visible bottom navigation suggests 3 modes:
- grid/card mode
- compact recent-days mode
- list/small-card mode

### 7.12 Weekly/recent view
Compact strip with:
- date headers
- recent N-day filter (visible “Last 5 days”)
- one row per habit
- colored cells showing recent progress

### 7.13 Archive action
Habit can be archived from detail menu.

### 7.14 Share action
Habit can be shared from detail menu.

### 7.15 Privacy promise
Data remains on device.

---

## 8. Product Requirements

## 8.1 Platform Requirements

The product must be:

- a responsive mobile-first web app
- installable as a PWA
- deployable on Cloudflare Pages
- usable on modern mobile browsers, especially iOS Safari
- functional without login
- functional offline after first install/load for main tracking flows

---

## 8.2 Data Storage Requirements

Habit data must be stored locally in the browser.

Preferred storage:
- IndexedDB for primary data
- localStorage only for trivial UI preferences if needed

No remote database for habit data.

Data entities must persist across:
- browser refresh
- reopening the PWA
- offline use

---

## 8.3 Habit Entity

Each habit must support these fields:

- `id`
- `name`
- `description` optional
- `iconType` (`icon` or `emoji`)
- `iconValue`
- `color`
- `archived`
- `createdAt`
- `updatedAt`
- `streakGoalInterval` (`none`, `daily`, `weekly`, `monthly`)
- `reminders[]`
- `categories[]`
- `trackingType` (`step`, `custom`)
- `targetPerDay`
- `unitLabel` optional for custom value mode

---

## 8.4 Category Entity

Each category must support:

- `id`
- `name`
- `iconType`
- `iconValue`
- `isSystem`
- `createdAt`

System categories observed:
- Art
- Finances
- Fitness
- Health
- Nutrition
- Social
- Study
- Work
- Other
- Morning
- Day
- Evening

---

## 8.5 Completion Entity

Each completion log must support:

- `id`
- `habitId`
- `date` (local date, not UTC bucket)
- `value`
- `createdAt`
- `updatedAt`

For step-by-step habits:
- each check increments by 1

For custom value habits:
- user supplies numeric value when entering completion

Aggregated daily value determines heatmap fill state.

---

## 9. Functional Requirements

## 9.1 Onboarding

This is not an mvp scope, we can ignore it.
The app should show an onboarding/info screen at first launch or when manually reopened from settings.

Acceptance behavior:
- user can proceed from onboarding to app
- onboarding highlights main features
- onboarding does not block future use after completion unless manually reopened

---

## 9.2 Empty State

When no active habits exist:

- app shows branded header
- app shows CTA to create first habit
- plus button opens create flow
- central “Let's track a new habit” button also opens create flow

---

## 9.3 Create Habit

User must be able to create a new habit.

Required:
- name
- color
- icon or default icon

Optional:
- description
- streak goal interval
- reminder(s)
- categories
- completion tracking mode
- target completions per day
- custom value mode

Rules:
- save button disabled until required fields are valid
- after save, habit appears in main view immediately

---

## 9.4 Edit Habit

User must be able to edit an existing habit.

Editable:
- name
- description
- icon / emoji
- color
- streak goal interval
- reminders
- categories
- tracking type
- target per day

Changes must reflect immediately in UI after save.

---

## 9.5 Icon / Emoji Picker

User must be able to choose either:
- icon
- emoji

Features:
- tab switch between icon and emoji
- search field
- categorized grids
- tap to select
- picker usable for both habit and custom category creation

---

## 9.6 Color Selection

User must be able to assign a habit color from a predefined palette.

Behavior:
- exactly one color selected at a time
- selected color affects:
  - habit icon tile
  - completion/check button
  - filled heatmap cells
  - recent compact cells
  - selected accent states where relevant

---

## 9.7 Categories

User must be able to:

- assign zero, one, or multiple categories to a habit
- open category selector bottom sheet/modal
- create a custom category
- save custom category and reuse it later

---

## 9.8 Streak Goal

This is not an mvp scope, we can ignore it.
User must be able to choose one interval:
- None
- Daily
- Week
- Month

Observed interpretation:
This is not just “show streak.”
It appears to define the cadence expectation.

Expected behavior for MVP:
- `None`: no streak requirement logic beyond general history
- `Daily`: streak depends on hitting daily target each day
- `Week`: streak depends on hitting at least one completion target per week
- `Month`: streak depends on hitting at least one completion target per month

If exact streak behavior is ambiguous, replica should document the chosen interpretation and keep it internally consistent.

---

## 9.9 Reminders

User must be able to add local reminder schedules to a habit.

Reminder capabilities for MVP:
- create reminder time(s)
- enable/disable reminder
- associate reminder with a habit
- surface reminder count, e.g. “0 Active Reminders”

Technical note:
Since this is a PWA with no cloud sync, reminder delivery depends on browser/device capability.

Expected implementation approach:
- use Web Push where supported
- use service worker
- use Cloudflare Worker / scheduled orchestration only for delivery mechanics, not for storing user habit data
- if exact scheduled push is not fully supported on target environment, app must degrade gracefully and clearly expose unsupported state

Product requirement:
- habit reminder configuration must exist in UI
- reminder must work on supported environments
- unsupported environments must not break core app

---

## 9.10 Completion Tracking Modes

### Mode A — Step By Step
- each completion increments daily progress by 1
- daily cell becomes “complete” when total for the day reaches `targetPerDay`

Example:
- targetPerDay = 2
- first entry today => partially complete
- second entry today => fully complete

### Mode B — Custom Value
- user enters numeric value
- daily total is sum of entered values
- heatmap fill is based on progress toward target

Example:
- targetPerDay = 10
- entry values 3 and 4 => partial fill
- total 10+ => full fill

---

## 9.11 Daily Check-In UI

For binary/single-entry habits:
- prominent check button on card
- tapping marks today complete
- tapping again may unmark or decrement depending on selected mode and UX design

For counted habits:
- prominent plus/progress action on card
- action should support incremental entry
- if more detailed entry is needed, a quick input surface may appear

Observed from screenshots:
- single-entry habit uses a check button
- counted mode uses a plus/progress radial action

---

## 9.12 Heatmap

The heatmap is a grid of small rounded cells showing history over time.

Requirements:
- months labeled across top in detailed view
- weekday labels shown in detailed view
- cells use habit color for progress intensity
- empty/uncompleted days use darker muted tone
- today/current date should be representable in detail calendar context
- data should display by local date

For MVP, heatmap must support at least:
- binary state for completed vs not completed
- partial progress state for counted habits
- full progress state when target hit

Suggested fill states:
- 0% = dark muted
- 1–49% = low fill, brighter than 0%
- 50–99% = medium fill, brighter than 49%
- 100%+ = full fill, the same color as the icon or habit color

---

## 9.13 Habit Detail View

Opening a habit should show an expanded detail view/modal with:

- habit icon and title
- larger heatmap
- streak goal pill
- streak count metric
- edit button
- menu button
- monthly calendar section
- selected month label
- month navigation arrows

Menu must include:
- Share Habit
- Archive

---

## 9.14 Calendar View

The detail screen must include a month calendar.

Behavior:
- displays current selected month
- user can navigate previous/next month
- dates align by weekday
- selected/current day can be highlighted
- completion history maps to dates

---

## 9.15 Main View Modes

App must support 3 presentation modes, selectable by bottom switcher.

### View 1 — Standard Heatmap Card
Large card with icon, name, subtitle, action button, heatmap.

### View 2 — Recent Days / Weekly Compact
Compact strip by recent date range, likely configurable like “Last 5 days.”

### View 3 — Mini Card / Grid List
Smaller overview cards with condensed monthly mini heatmap.

All three must reflect the same underlying habit data.

---

## 9.16 Archive Habit

User must be able to archive a habit.

Behavior:
- archived habit removed from active main views
- archived habits accessible later through settings or archive section
- archived data preserved locally

---

## 9.17 Share Habit

This is not an mvp scope, we can ignore it.
User must be able to generate a shareable image of a habit.

Minimum MVP interpretation:
- render a stylized habit summary card
- include habit name
- include heatmap snapshot
- use Web Share API where supported
- fallback to image export/download

---

## 9.18 Settings

This is not an mvp scope, we can ignore it.
Observed settings menu includes many items. For MVP replica, settings should include at least:

- show onboarding
- archived habits
- reminder settings overview
- app information / privacy note

Optional later:
- theme
- data import/export
- reorder habits
- website / about links

---

## 10. UX Requirements

## 10.1 Visual Style

The product must visually match the reference style:

- dark background
- rounded cards
- subtle borders
- minimal gradients
- bright accent colors
- large touch targets
- iOS-inspired spacing and typography
- clean iconography
- high contrast white text
- muted secondary text

---

## 10.2 Interaction Patterns

The product should use:

- bottom sheets for selection flows
- segmented controls for tabs/options
- floating/anchored bottom view switcher
- modal/detail presentation for habit inspection
- immediate local UI updates after actions

---

## 10.3 Mobile UX Constraints

Must be usable on small mobile screens without:
- zooming
- horizontal scroll in normal flows
- tiny tap targets

---

## 11. Non-Functional Requirements

### Performance
- first meaningful paint on repeat visit should feel instant
- habit toggle/check-in should update UI in under 100ms locally
- switching views should not feel sluggish with up to 100 habits

### Reliability
- local data must not vanish on refresh
- offline mode must continue to work for viewing and logging
- unsupported push environments must fail gracefully

### Accessibility
- sufficient contrast
- icon-only actions should still have labels/tooltips/accessibility names
- buttons must be keyboard reachable where browser supports

---

## 12. Acceptance Criteria

The MVP is accepted only if all of the following are true.

## 12.1 App Structure
- App runs as a PWA on mobile browser.
- App is deployable on Cloudflare Pages.
- App works without account creation.
- No cloud sync exists.

## 12.2 Empty State
- If there are no active habits, the user sees an empty state with CTA to create one.
- Both central CTA and plus button open the new habit flow.

## 12.3 Create Habit
- User can create a habit with name, icon/emoji, and color.
- Save remains disabled until minimum required data is entered.
- New habit appears immediately after save.

## 12.4 Edit Habit
- User can edit an existing habit’s name, color, icon, streak goal, categories, reminder, and tracking mode.
- Changes persist locally after refresh.

## 12.5 Icon and Emoji Picker
- User can switch between icon and emoji tabs.
- User can search available icons/emojis.
- Selected icon/emoji is reflected in the habit UI.

## 12.6 Categories
- User can assign one or more categories to a habit.
- User can create a custom category with name and icon.
- Created category becomes selectable for future habits.

## 12.7 Streak Goal
- User can choose one of None, Daily, Week, Month.
- Selected streak goal persists and is shown in habit detail.

## 12.8 Completion Modes
- User can configure a habit as Step By Step or Custom Value.
- User can set target completions per day.
- Daily progress is computed correctly against the target.

## 12.9 Single Entry Habit
- For a habit with target 1/day, user can complete today with a single interaction.
- Heatmap updates the current day cell immediately.

## 12.10 Counted Habit
- For a habit with target >1/day, user can increment today’s progress.
- Heatmap visually reflects partial and full progress.

## 12.11 Heatmap
- Main card shows compact heatmap history.
- Detail view shows expanded heatmap with month labels.
- Heatmap color matches habit color.
- Uncompleted days are visually distinct from completed days.

## 12.12 Detail View
- User can open a habit detail view.
- Detail view includes larger heatmap, month calendar, edit action, and archive/share menu.

## 12.13 Archive
- User can archive a habit.
- Archived habit disappears from active views.
- Archived habit data is still available locally.

## 12.14 Share
This is not an mvp scope, we can ignore it.
- User can generate a shareable representation of a habit card.
- Sharing works through supported browser capabilities or fallback export.

## 12.15 View Modes
- User can switch between 3 main display modes.
- All modes reflect the same habit data accurately.

## 12.16 Persistence
- All data persists across refresh and reopening the PWA.
- App remains usable offline after initial load.

## 12.17 Reminder
- User can configure reminder UI per habit.
- Reminder scheduling works on supported environments.
- Unsupported environments are clearly handled without breaking the app.

---

## 13. Success Criteria

This MVP is successful if:

### Primary success criterion
- The replica achieves **100% feature completeness for the observed MVP surface area** from the provided screenshots, excluding explicitly ignored analytics and non-core premium extras.

### Secondary success criteria
- User can create first habit in under 60 seconds.
- User can mark today’s completion in under 2 taps for binary habits.
- Heatmap meaning is understandable without documentation.
- App remains fully usable without login or sync.
- Offline/local-only value proposition is preserved.
- The product visually feels close enough to the reference that a user immediately recognizes the pattern.

### Technical success criteria
- PWA installs successfully on mobile-supported browsers.
- Habit data persists locally with no server-side user database.
- Core flows work after refresh and in offline mode.
- Reminder support is implemented or gracefully degraded based on browser support.

---

## 14. Known Ambiguities to Resolve During Build

The screenshots reveal product surface, but not all internal rules. These must be decided explicitly during implementation:

1. Whether tapping a completed day decrements, removes, or opens edit? the answer is toggle it back to 0. Ex. Today is monday, i did 7/7 of target, if i accidentally cick, it back to 0/7.
2. Exact intensity logic for counted habits? already answered for the fill  color.
3. Exact streak computation for week/month intervals? the answer is ignore, no streak feature.
4. Whether multiple reminders per habit are supported in MVP? the answer is yes.
5. Whether share exports full detail card or summary card only? the answer is ignore for mvp
6. Whether edit history includes editing past day entries from the calendar? There is no edit history, once the day passed, the last stated for the D-1 will be kept and cannot be changed. Then new habit tracking track for today only. NO BACKDATE.

These are not excuses to stall.
They are implementation decisions that must be written down and kept consistent.

---

## 15. Recommended MVP Cutline

If delivery speed matters, build in this order:

### Phase 1 — Core usable replica
- empty state
- create habit
- edit habit
- icon/emoji picker
- color picker
- binary tracking
- heatmap card
- local persistence
- one main view mode

### Phase 2 — True feature parity
- categories
- custom category creation
- counted/custom value mode
- detail modal
- month calendar
- archive
- additional display modes

### Phase 3 — PWA polish
- offline caching
- install prompt
- reminder support
- graceful unsupported-state handling

---

## 16. Explicit Product Constraints

- No cloud sync
- No authentication
- Must deploy on Cloudflare Pages
- Must behave as a PWA
- Must prioritize mobile UX
- Must keep data local
- Must center the “GitHub contribution confidence” feeling
