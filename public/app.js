const DB_NAME = "habit-heatmap-db";
const DB_VERSION = 1;
const TODAY = () => formatDateKey(new Date());

const SYSTEM_CATEGORIES = [
  { name: "Art", iconValue: "🎨" },
  { name: "Finances", iconValue: "💸" },
  { name: "Fitness", iconValue: "💪" },
  { name: "Health", iconValue: "🩺" },
  { name: "Nutrition", iconValue: "🥗" },
  { name: "Social", iconValue: "💬" },
  { name: "Study", iconValue: "📚" },
  { name: "Work", iconValue: "💼" },
  { name: "Other", iconValue: "🧩" },
  { name: "Morning", iconValue: "🌅" },
  { name: "Day", iconValue: "☀️" },
  { name: "Evening", iconValue: "🌙" },
];

const COLORS = [
  "#52c41a",
  "#1f6feb",
  "#ff9f1c",
  "#ff5d8f",
  "#00bfa5",
  "#a371f7",
  "#f78166",
  "#d29922",
];

const ICON_OPTIONS = [
  { label: "Bolt", value: "⚡" },
  { label: "Book", value: "📘" },
  { label: "Brush", value: "🖌️" },
  { label: "Coffee", value: "☕" },
  { label: "Code", value: "💻" },
  { label: "Dumbbell", value: "🏋️" },
  { label: "Drop", value: "💧" },
  { label: "Heart", value: "♥" },
  { label: "Leaf", value: "🍃" },
  { label: "Moon", value: "☾" },
  { label: "Run", value: "🏃" },
  { label: "Sun", value: "☀" },
];

const EMOJI_OPTIONS = [
  "🔥", "✅", "📚", "🧘", "🏃", "💧", "🥗", "💼", "🎯", "🛌", "🧠", "🪴",
  "🧹", "🎵", "📓", "🚶", "🍎", "☕", "✍️", "📵", "🧺", "🧴", "🫗", "🪥",
];

const appState = {
  habits: [],
  categories: [],
  completions: [],
  reminders: [],
  activeView: "cards",
  selectedYear: new Date().getFullYear(),
  selectedMonth: new Date().getMonth(),
  activeModal: null,
  formDraft: null,
  pickerTab: "icon",
  pickerQuery: "",
  selectedHabitId: null,
  installPrompt: null,
  archivedOpen: false,
  reminderCapability: "unsupported",
};

let db;
let reminderTimers = [];

async function init() {
  db = await openDatabase();
  appState.reminderCapability = detectReminderCapability();
  await loadState();
  await seedDefaultsIfNeeded();
  bindGlobalEvents();
  registerServiceWorker();
  scheduleReminders();
  render();
}

function detectReminderCapability() {
  if ("Notification" in window && "serviceWorker" in navigator) {
    if (Notification.permission === "granted") {
      return "supported";
    }
    if (Notification.permission === "default") {
      return "needs-permission";
    }
    return "blocked";
  }
  return "unsupported";
}

async function loadState() {
  const [habits, categories, completions, reminders] = await Promise.all([
    getAll("habits"),
    getAll("categories"),
    getAll("completions"),
    getAll("reminders"),
  ]);

  appState.habits = habits.sort(sortByUpdatedAt);
  appState.categories = categories.sort((a, b) => a.name.localeCompare(b.name));
  appState.completions = completions;
  appState.reminders = reminders;
}

async function seedDefaultsIfNeeded() {
  if (appState.categories.length > 0) {
    return;
  }

  const tx = db.transaction(["categories"], "readwrite");
  const store = tx.objectStore("categories");
  SYSTEM_CATEGORIES.forEach((category) => {
    store.add({
      id: crypto.randomUUID(),
      name: category.name,
      iconType: "emoji",
      iconValue: category.iconValue,
      isSystem: true,
      createdAt: nowIso(),
    });
  });

  await txDone(tx);
  appState.categories = await getAll("categories");
}

function bindGlobalEvents() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    appState.installPrompt = event;
    renderHeaderActions();
  });

  window.addEventListener("appinstalled", () => {
    appState.installPrompt = null;
    renderHeaderActions();
  });

  document.addEventListener("click", handleClick);
  document.addEventListener("change", handleChange);
  document.addEventListener("input", handleInput);
}

function handleInput(event) {
  const target = event.target;
  if (target.matches("[data-field]")) {
    updateDraftField(target.dataset.field, target.type === "checkbox" ? target.checked : target.value);
  }

  if (target.matches("[data-picker-query]")) {
    appState.pickerQuery = target.value;
    renderModalLayer();
  }

  if (target.matches("[data-quick-custom-value]")) {
    updateDraftField("quickCustomValue", target.value);
  }
}

function handleChange(event) {
  const target = event.target;

  if (target.matches("[data-category-checkbox]")) {
    const next = new Set(appState.formDraft.categoryIds || []);
    if (target.checked) {
      next.add(target.value);
    } else {
      next.delete(target.value);
    }
    updateDraftField("categoryIds", [...next]);
  }

  if (target.matches("[data-reminder-enabled]")) {
    const reminderId = target.dataset.reminderEnabled;
    const reminder = appState.formDraft.reminders.find((item) => item.id === reminderId);
    if (reminder) {
      reminder.enabled = target.checked;
      renderModalLayer();
    }
  }

  if (target.matches("[data-view-mode]")) {
    appState.activeView = target.value;
    renderMain();
  }
}

async function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }

  const action = target.dataset.action;

  if (action === "open-create") {
    openHabitForm();
  } else if (action === "close-modal") {
    closeModal();
  } else if (action === "pick-color") {
    updateDraftField("color", target.dataset.color);
  } else if (action === "open-picker") {
    appState.activeModal = "picker";
    appState.pickerTab = target.dataset.tab || "icon";
    appState.pickerQuery = "";
    renderModalLayer();
  } else if (action === "picker-tab") {
    appState.pickerTab = target.dataset.tab;
    renderModalLayer();
  } else if (action === "select-picker-item") {
    updateDraftField("iconType", appState.pickerTab);
    updateDraftField("iconValue", target.dataset.value);
    appState.activeModal = "form";
    renderModalLayer();
  } else if (action === "save-habit") {
    await saveHabit();
  } else if (action === "edit-habit") {
    openHabitForm(appState.selectedHabitId);
  } else if (action === "open-detail") {
    appState.selectedHabitId = target.dataset.habitId;
    appState.activeModal = "detail";
    renderModalLayer();
  } else if (action === "complete-habit") {
    await completeHabit(target.dataset.habitId);
  } else if (action === "decrement-habit") {
    await decrementHabit(target.dataset.habitId);
  } else if (action === "archive-habit") {
    await archiveHabit(target.dataset.habitId || appState.selectedHabitId);
  } else if (action === "restore-habit") {
    await restoreHabit(target.dataset.habitId);
  } else if (action === "toggle-archived") {
    appState.archivedOpen = !appState.archivedOpen;
    renderMain();
  } else if (action === "switch-month") {
    appState.selectedMonth = Number(target.dataset.month);
    renderModalLayer();
  } else if (action === "switch-year") {
    appState.selectedYear += Number(target.dataset.delta);
    renderMain();
    renderModalLayer();
  } else if (action === "set-view") {
    appState.activeView = target.dataset.view;
    renderMain();
  } else if (action === "add-reminder-row") {
    appState.formDraft.reminders.push({
      id: crypto.randomUUID(),
      habitId: appState.formDraft.id,
      time: "08:00",
      enabled: true,
      deliverySupport: appState.reminderCapability,
    });
    renderModalLayer();
  } else if (action === "remove-reminder-row") {
    appState.formDraft.reminders = appState.formDraft.reminders.filter(
      (item) => item.id !== target.dataset.reminderId
    );
    renderModalLayer();
  } else if (action === "save-category") {
    await saveCustomCategory();
  } else if (action === "open-category-create") {
    updateDraftField("categoryDraft", { name: "", iconType: "emoji", iconValue: "🏷️" });
    renderModalLayer();
  } else if (action === "pick-category-icon") {
    const draft = appState.formDraft.categoryDraft || { name: "", iconType: "emoji", iconValue: "🏷️" };
    draft.iconValue = target.dataset.value;
    draft.iconType = "emoji";
    updateDraftField("categoryDraft", draft);
  } else if (action === "request-notification-permission") {
    await requestNotificationPermission();
  } else if (action === "install-app") {
    await promptInstall();
  }
}

function render() {
  const app = document.querySelector("#app");
  app.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Habit Heatmap</p>
          <h1>Consistency, visible.</h1>
        </div>
        <div class="header-actions" id="header-actions"></div>
      </header>
      <section class="year-bar card">
        <button class="ghost-btn" data-action="switch-year" data-delta="-1" aria-label="Previous year">‹</button>
        <div>
          <p class="eyebrow">Selected year</p>
          <strong>${appState.selectedYear}</strong>
        </div>
        <button class="ghost-btn" data-action="switch-year" data-delta="1" aria-label="Next year">›</button>
      </section>
      <main id="main-content"></main>
      <section id="modal-layer"></section>
    </div>
  `;

  renderHeaderActions();
  renderMain();
  renderModalLayer();
}

function renderHeaderActions() {
  const root = document.querySelector("#header-actions");
  if (!root) {
    return;
  }

  root.innerHTML = `
    <button class="ghost-btn" data-action="toggle-archived" aria-label="Archived habits">Archive</button>
    ${appState.installPrompt ? '<button class="primary-btn" data-action="install-app">Install</button>' : ""}
    <button class="primary-btn" data-action="open-create" aria-label="Create habit">+</button>
  `;
}

function renderMain() {
  const root = document.querySelector("#main-content");
  if (!root) {
    return;
  }

  const activeHabits = getActiveHabits();
  const archived = getArchivedHabits();

  root.innerHTML = `
    ${renderDashboardStats(activeHabits)}
    ${activeHabits.length === 0 ? renderEmptyState() : renderHabits(activeHabits)}
    ${appState.archivedOpen ? renderArchived(archived) : ""}
  `;
}

function renderDashboardStats(activeHabits) {
  const completedToday = activeHabits.filter((habit) => getDailyTotal(habit.id, TODAY()) >= habit.targetPerDay).length;
  const totalToday = activeHabits.length;
  const reminderCount = appState.reminders.filter((reminder) => reminder.enabled).length;

  return `
    <section class="stats-grid">
      <article class="card stat-card">
        <p class="eyebrow">Today</p>
        <strong>${completedToday}/${totalToday}</strong>
        <span>habits reached target</span>
      </article>
      <article class="card stat-card">
        <p class="eyebrow">Reminders</p>
        <strong>${reminderCount}</strong>
        <span>active times saved</span>
      </article>
    </section>
  `;
}

function renderEmptyState() {
  return `
    <section class="card empty-state">
      <div class="empty-icon">▦</div>
      <p class="eyebrow">No active habits yet</p>
      <h2>Let's track a new habit.</h2>
      <p>Start with one habit, one color, one visible trail across the year.</p>
      <div class="empty-actions">
        <button class="primary-btn" data-action="open-create">Get started</button>
        <button class="ghost-btn" data-action="open-create">Create first habit</button>
      </div>
    </section>
  `;
}

function renderHabits(activeHabits) {
  return `
    <section class="view-switcher card">
      <div class="segmented">
        ${renderViewButton("cards", "Cards")}
        ${renderViewButton("recent", "Recent")}
        ${renderViewButton("mini", "Mini")}
      </div>
      <span class="caption">${activeHabits.length} active habit${activeHabits.length === 1 ? "" : "s"}</span>
    </section>
    <section>
      ${appState.activeView === "cards" ? renderCardsView(activeHabits) : ""}
      ${appState.activeView === "recent" ? renderRecentView(activeHabits) : ""}
      ${appState.activeView === "mini" ? renderMiniView(activeHabits) : ""}
    </section>
  `;
}

function renderViewButton(view, label) {
  return `
    <button class="${appState.activeView === view ? "segmented-btn active" : "segmented-btn"}" data-action="set-view" data-view="${view}">
      ${label}
    </button>
  `;
}

function renderCardsView(habits) {
  return `
    <div class="habit-list">
      ${habits.map((habit) => renderHabitCard(habit)).join("")}
    </div>
  `;
}

function renderHabitCard(habit) {
  const today = getDailyTotal(habit.id, TODAY());
  const progressLabel = `${today}/${habit.targetPerDay}`;
  const accent = habit.color;
  const categories = habit.categoryIds
    .map((id) => appState.categories.find((category) => category.id === id))
    .filter(Boolean);

  return `
    <article class="card habit-card" style="--accent:${accent}">
      <button class="card-tap-area" data-action="open-detail" data-habit-id="${habit.id}" aria-label="Open ${escapeHtml(habit.name)} detail"></button>
      <div class="habit-card-header">
        <div class="habit-meta">
          <div class="icon-tile" style="background:${accent}20;color:${accent}">${habit.iconValue}</div>
          <div>
            <h3>${escapeHtml(habit.name)}</h3>
            <p>${habit.description ? escapeHtml(habit.description) : renderCategoryLine(categories)}</p>
          </div>
        </div>
        <div class="habit-card-actions">
          ${habit.targetPerDay > 1 ? `<button class="ghost-btn small" data-action="decrement-habit" data-habit-id="${habit.id}" aria-label="Decrease ${escapeHtml(habit.name)}">−</button>` : ""}
          <button class="primary-btn action-btn" data-action="complete-habit" data-habit-id="${habit.id}" aria-label="Complete ${escapeHtml(habit.name)}">
            ${habit.trackingType === "custom" ? "+" : habit.targetPerDay === 1 ? "✓" : "+"}
          </button>
        </div>
      </div>
      <div class="progress-row">
        <strong>${progressLabel}</strong>
        <span>${habit.trackingType === "custom" && habit.unitLabel ? escapeHtml(habit.unitLabel) : "today"}</span>
      </div>
      ${renderCompactHeatmap(habit)}
    </article>
  `;
}

function renderCategoryLine(categories) {
  if (categories.length === 0) {
    return "No category";
  }
  return categories.slice(0, 2).map((category) => `${category.iconValue} ${category.name}`).join(" · ");
}

function renderCompactHeatmap(habit) {
  const cells = buildYearCells(habit.id, appState.selectedYear).slice(-140);
  return `
    <div class="heatmap compact-heatmap">
      ${cells.map((cell) => renderHeatCell(cell, habit.color, true)).join("")}
    </div>
  `;
}

function renderRecentView(habits) {
  const dates = getLastNDates(5);
  return `
    <div class="card recent-board">
      <div class="recent-header">
        <h2>Last 5 days</h2>
        <span>Compact daily progress</span>
      </div>
      <div class="recent-grid">
        <div class="recent-row head">
          <span>Habit</span>
          ${dates.map((date) => `<span>${formatShortDate(date)}</span>`).join("")}
        </div>
        ${habits
          .map(
            (habit) => `
              <div class="recent-row">
                <button class="recent-habit-label" data-action="open-detail" data-habit-id="${habit.id}">
                  <span>${habit.iconValue}</span>
                  <span>${escapeHtml(habit.name)}</span>
                </button>
                ${dates
                  .map((date) =>
                    renderHeatCell(
                      {
                        dateKey: formatDateKey(date),
                        ratio: ratioForDate(habit.id, formatDateKey(date), habit.targetPerDay),
                      },
                      habit.color,
                      false
                    )
                  )
                  .join("")}
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderMiniView(habits) {
  return `
    <div class="mini-grid">
      ${habits
        .map(
          (habit) => `
            <article class="card mini-card" style="--accent:${habit.color}">
              <button class="card-tap-area" data-action="open-detail" data-habit-id="${habit.id}" aria-label="Open ${escapeHtml(habit.name)} detail"></button>
              <div class="mini-header">
                <span class="icon-tile mini" style="background:${habit.color}20;color:${habit.color}">${habit.iconValue}</span>
                <div>
                  <h3>${escapeHtml(habit.name)}</h3>
                  <p>${getDailyTotal(habit.id, TODAY())}/${habit.targetPerDay} today</p>
                </div>
              </div>
              <div class="heatmap mini-heatmap">
                ${buildYearCells(habit.id, appState.selectedYear).slice(-63).map((cell) => renderHeatCell(cell, habit.color, true)).join("")}
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderArchived(archivedHabits) {
  return `
    <section class="card archived-panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Archived</p>
          <h2>${archivedHabits.length} habit${archivedHabits.length === 1 ? "" : "s"}</h2>
        </div>
      </div>
      ${archivedHabits.length === 0 ? "<p class='muted'>No archived habits yet.</p>" : ""}
      <div class="archived-list">
        ${archivedHabits
          .map(
            (habit) => `
              <div class="archived-item">
                <div>
                  <strong>${habit.iconValue} ${escapeHtml(habit.name)}</strong>
                  <p>${habit.description ? escapeHtml(habit.description) : "Archived locally"}</p>
                </div>
                <button class="ghost-btn" data-action="restore-habit" data-habit-id="${habit.id}">Restore</button>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderModalLayer() {
  const root = document.querySelector("#modal-layer");
  if (!root) {
    return;
  }

  if (appState.activeModal === "form" && appState.formDraft) {
    root.innerHTML = renderHabitFormModal();
    return;
  }

  if (appState.activeModal === "picker" && appState.formDraft) {
    root.innerHTML = renderPickerModal();
    return;
  }

  if (appState.activeModal === "detail" && appState.selectedHabitId) {
    root.innerHTML = renderDetailModal();
    return;
  }

  root.innerHTML = "";
}

function renderHabitFormModal() {
  const draft = appState.formDraft;
  const canSave = validateHabitDraft(draft);
  const reminderStatus = reminderSupportLabel();

  return `
    <div class="modal-backdrop">
      <section class="modal-card form-modal">
        <div class="modal-header">
          <div>
            <p class="eyebrow">${draft.id ? "Edit habit" : "Create habit"}</p>
            <h2>${draft.id ? "Update your habit" : "New habit"}</h2>
          </div>
          <button class="ghost-btn" data-action="close-modal" aria-label="Close modal">✕</button>
        </div>
        <div class="form-section">
          <label>Name
            <input data-field="name" maxlength="60" placeholder="Read 10 pages" value="${escapeAttr(draft.name)}" />
          </label>
          <label>Description
            <input data-field="description" maxlength="120" placeholder="Optional note" value="${escapeAttr(draft.description || "")}" />
          </label>
          <div class="picker-row">
            <button class="picker-preview" data-action="open-picker" data-tab="${draft.iconType}">
              <span class="icon-preview" style="background:${draft.color}20;color:${draft.color}">${draft.iconValue}</span>
              <span>${draft.iconType === "emoji" ? "Emoji" : "Icon"} picker</span>
            </button>
          </div>
        </div>

        <div class="form-section">
          <div class="section-header">
            <div>
              <p class="eyebrow">Color</p>
              <h3>Pick one accent</h3>
            </div>
          </div>
          <div class="color-grid">
            ${COLORS.map((color) => renderColorOption(color, color === draft.color)).join("")}
          </div>
        </div>

        <details class="form-section details-block" open>
          <summary>Advanced options</summary>
          <div class="field-grid">
            <label>Tracking mode
              <select data-field="trackingType">
                <option value="step" ${draft.trackingType === "step" ? "selected" : ""}>Step by step</option>
                <option value="custom" ${draft.trackingType === "custom" ? "selected" : ""}>Custom value</option>
              </select>
            </label>
            <label>Target per day
              <input data-field="targetPerDay" type="number" min="1" max="999" value="${escapeAttr(String(draft.targetPerDay))}" />
            </label>
            <label>Unit label
              <input data-field="unitLabel" maxlength="18" placeholder="minutes" value="${escapeAttr(draft.unitLabel || "")}" />
            </label>
          </div>

          <div class="section-block">
            <div class="section-header">
              <div>
                <p class="eyebrow">Categories</p>
                <h3>Attach context</h3>
              </div>
              <button class="ghost-btn" data-action="open-category-create">New category</button>
            </div>
            <div class="chip-grid">
              ${appState.categories.map((category) => renderCategoryCheck(category, draft.categoryIds)).join("")}
            </div>
            ${renderCategoryDraft(draft.categoryDraft)}
          </div>

          <div class="section-block">
            <div class="section-header">
              <div>
                <p class="eyebrow">Reminders</p>
                <h3>${draft.reminders.length} configured</h3>
              </div>
              <button class="ghost-btn" data-action="add-reminder-row">Add time</button>
            </div>
            <p class="caption">${reminderStatus}</p>
            ${appState.reminderCapability === "needs-permission" ? '<button class="ghost-btn" data-action="request-notification-permission">Allow notifications</button>' : ""}
            <div class="reminder-list">
              ${draft.reminders.map((reminder) => renderReminderRow(reminder)).join("") || "<p class='muted'>No reminder times saved.</p>"}
            </div>
          </div>
        </details>

        <div class="modal-footer">
          <button class="ghost-btn" data-action="close-modal">Cancel</button>
          <button class="primary-btn" data-action="save-habit" ${canSave ? "" : "disabled"}>Save habit</button>
        </div>
      </section>
    </div>
  `;
}

function renderColorOption(color, selected) {
  return `
    <button
      class="${selected ? "color-option selected" : "color-option"}"
      data-action="pick-color"
      type="button"
      data-color="${color}"
      aria-label="Select color ${color}"
      style="background:${color}">
    </button>
  `;
}

function renderCategoryCheck(category, selectedIds) {
  const checked = selectedIds.includes(category.id);
  return `
    <label class="${checked ? "chip selected" : "chip"}">
      <input type="checkbox" data-category-checkbox value="${category.id}" ${checked ? "checked" : ""} />
      <span>${category.iconValue} ${escapeHtml(category.name)}</span>
    </label>
  `;
}

function renderCategoryDraft(categoryDraft) {
  if (!categoryDraft) {
    return "";
  }

  return `
    <div class="category-draft">
      <label>New category name
        <input
          value="${escapeAttr(categoryDraft.name)}"
          oninput="window.__habitHeatmapCategoryDraft('name', this.value)"
          placeholder="Deep Work"
        />
      </label>
      <div class="section-header inline">
        <span>Pick emoji icon</span>
        <span class="icon-preview small">${categoryDraft.iconValue}</span>
      </div>
      <div class="category-icon-grid">
        ${["🏷️", "🧠", "🛠️", "📗", "🧘", "🏃", "☀️", "🌙"].map((value) => `
          <button class="ghost-btn icon-only" data-action="pick-category-icon" data-value="${value}">${value}</button>
        `).join("")}
      </div>
      <button class="primary-btn wide" data-action="save-category">Save category</button>
    </div>
  `;
}

window.__habitHeatmapCategoryDraft = (field, value) => {
  const next = appState.formDraft.categoryDraft || { name: "", iconType: "emoji", iconValue: "🏷️" };
  next[field] = value;
  updateDraftField("categoryDraft", next);
};

function renderReminderRow(reminder) {
  return `
    <div class="reminder-row">
      <input
        type="time"
        value="${escapeAttr(reminder.time)}"
        onchange="window.__habitHeatmapUpdateReminder('${reminder.id}', 'time', this.value)"
      />
      <label class="toggle">
        <input type="checkbox" data-reminder-enabled="${reminder.id}" ${reminder.enabled ? "checked" : ""} />
        <span>Enabled</span>
      </label>
      <button class="ghost-btn" data-action="remove-reminder-row" data-reminder-id="${reminder.id}">Remove</button>
    </div>
  `;
}

window.__habitHeatmapUpdateReminder = (reminderId, field, value) => {
  const reminder = appState.formDraft.reminders.find((item) => item.id === reminderId);
  if (reminder) {
    reminder[field] = value;
    renderModalLayer();
  }
};

function renderPickerModal() {
  const list = getFilteredPickerItems();
  return `
    <div class="modal-backdrop">
      <section class="modal-card picker-modal">
        <div class="modal-header">
          <div>
            <p class="eyebrow">Picker</p>
            <h2>Choose ${appState.pickerTab}</h2>
          </div>
          <button class="ghost-btn" data-action="close-modal">✕</button>
        </div>
        <div class="segmented">
          <button class="${appState.pickerTab === "icon" ? "segmented-btn active" : "segmented-btn"}" data-action="picker-tab" data-tab="icon">Icon</button>
          <button class="${appState.pickerTab === "emoji" ? "segmented-btn active" : "segmented-btn"}" data-action="picker-tab" data-tab="emoji">Emoji</button>
        </div>
        <input class="search-input" data-picker-query placeholder="Search" value="${escapeAttr(appState.pickerQuery)}" />
        <div class="picker-grid">
          ${list
            .map(
              (item) => `
                <button class="picker-item" data-action="select-picker-item" data-value="${item.value}">
                  <span>${item.value}</span>
                  <small>${escapeHtml(item.label)}</small>
                </button>
              `
            )
            .join("")}
        </div>
      </section>
    </div>
  `;
}

function renderDetailModal() {
  const habit = appState.habits.find((item) => item.id === appState.selectedHabitId);
  if (!habit) {
    return "";
  }

  const yearCells = buildYearCells(habit.id, appState.selectedYear);
  const months = buildMonthOptions(appState.selectedYear);
  const monthCalendar = buildMonthCalendar(habit.id, appState.selectedYear, appState.selectedMonth, habit.targetPerDay);

  return `
    <div class="modal-backdrop">
      <section class="modal-card detail-modal">
        <div class="modal-header">
          <div class="detail-title">
            <span class="icon-tile" style="background:${habit.color}20;color:${habit.color}">${habit.iconValue}</span>
            <div>
              <p class="eyebrow">Habit detail</p>
              <h2>${escapeHtml(habit.name)}</h2>
            </div>
          </div>
          <button class="ghost-btn" data-action="close-modal">✕</button>
        </div>
        <div class="detail-actions">
          <button class="ghost-btn" data-action="edit-habit">Edit</button>
          <button class="ghost-btn danger" data-action="archive-habit" data-habit-id="${habit.id}">Archive</button>
        </div>
        <section class="detail-section">
          <div class="section-header">
            <div>
              <p class="eyebrow">Year heatmap</p>
              <h3>${appState.selectedYear}</h3>
            </div>
          </div>
          <div class="month-labels">
            ${months.map((month) => `<span>${month}</span>`).join("")}
          </div>
          <div class="heatmap detail-heatmap">
            ${yearCells.map((cell) => renderHeatCell(cell, habit.color, true)).join("")}
          </div>
        </section>
        <section class="detail-section">
          <div class="section-header">
            <div>
              <p class="eyebrow">Month calendar</p>
              <h3>${monthName(appState.selectedMonth)}</h3>
            </div>
          </div>
          <div class="month-switcher">
            ${Array.from({ length: 12 }, (_, index) => `
              <button class="${appState.selectedMonth === index ? "month-chip active" : "month-chip"}" data-action="switch-month" data-month="${index}">
                ${monthName(index).slice(0, 3)}
              </button>
            `).join("")}
          </div>
          <div class="calendar-grid">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            ${monthCalendar.map((cell) => renderCalendarCell(cell, habit.color)).join("")}
          </div>
        </section>
      </section>
    </div>
  `;
}

function renderCalendarCell(cell, color) {
  if (!cell.day) {
    return `<span class="calendar-cell empty"></span>`;
  }

  const opacity = cell.ratio <= 0 ? 0.1 : cell.ratio < 0.5 ? 0.35 : cell.ratio < 1 ? 0.65 : 1;
  return `
    <span class="calendar-cell" style="background:${hexToRgba(color, opacity)}">
      <strong>${cell.day}</strong>
      <small>${Math.round(cell.ratio * 100)}%</small>
    </span>
  `;
}

function closeModal() {
  if (appState.activeModal === "picker") {
    appState.activeModal = "form";
  } else {
    appState.activeModal = null;
    appState.formDraft = null;
  }
  renderModalLayer();
}

function openHabitForm(habitId = null) {
  const habit = habitId ? appState.habits.find((item) => item.id === habitId) : null;
  const habitReminders = habit ? appState.reminders.filter((reminder) => reminder.habitId === habit.id) : [];

  appState.formDraft = habit
    ? {
        ...structuredClone(habit),
        reminders: structuredClone(habitReminders),
        categoryDraft: null,
      }
    : {
        id: "",
        name: "",
        description: "",
        iconType: "emoji",
        iconValue: "✅",
        color: COLORS[0],
        archived: false,
        createdAt: "",
        updatedAt: "",
        trackingType: "step",
        targetPerDay: 1,
        unitLabel: "",
        categoryIds: [],
        reminders: [],
        categoryDraft: null,
      };

  appState.activeModal = "form";
  renderModalLayer();
}

function updateDraftField(field, value) {
  if (!appState.formDraft) {
    return;
  }

  if (field === "targetPerDay") {
    appState.formDraft[field] = Math.max(1, Number(value || 1));
  } else {
    appState.formDraft[field] = value;
  }

  if (field === "trackingType" && value === "step" && !appState.formDraft.unitLabel) {
    appState.formDraft.unitLabel = "";
  }

  renderModalLayer();
}

async function saveHabit() {
  const draft = appState.formDraft;
  if (!validateHabitDraft(draft)) {
    return;
  }

  const isNew = !draft.id;
  const habit = {
    id: draft.id || crypto.randomUUID(),
    name: draft.name.trim(),
    description: draft.description.trim(),
    iconType: draft.iconType,
    iconValue: draft.iconValue,
    color: draft.color,
    archived: false,
    createdAt: draft.createdAt || nowIso(),
    updatedAt: nowIso(),
    trackingType: draft.trackingType,
    targetPerDay: Number(draft.targetPerDay),
    unitLabel: draft.unitLabel.trim(),
    categoryIds: draft.categoryIds || [],
  };

  await put("habits", habit);

  const existingReminders = appState.reminders.filter((item) => item.habitId === habit.id);
  await Promise.all(existingReminders.map((item) => remove("reminders", item.id)));
  await Promise.all(
    draft.reminders.map((reminder) =>
      put("reminders", {
        ...reminder,
        habitId: habit.id,
        deliverySupport: appState.reminderCapability,
      })
    )
  );

  await loadState();
  scheduleReminders();
  appState.activeModal = null;
  appState.formDraft = null;

  if (isNew) {
    appState.selectedHabitId = habit.id;
  }

  renderMain();
  renderModalLayer();
}

async function saveCustomCategory() {
  const draft = appState.formDraft.categoryDraft;
  if (!draft || !draft.name.trim()) {
    return;
  }

  const category = {
    id: crypto.randomUUID(),
    name: draft.name.trim(),
    iconType: draft.iconType,
    iconValue: draft.iconValue,
    isSystem: false,
    createdAt: nowIso(),
  };

  await put("categories", category);
  await loadState();
  const nextIds = new Set(appState.formDraft.categoryIds);
  nextIds.add(category.id);
  appState.formDraft.categoryIds = [...nextIds];
  appState.formDraft.categoryDraft = null;
  renderModalLayer();
}

async function completeHabit(habitId) {
  const habit = appState.habits.find((item) => item.id === habitId);
  if (!habit) {
    return;
  }

  const dateKey = TODAY();
  const todayTotal = getDailyTotal(habit.id, dateKey);

  if (habit.targetPerDay === 1) {
    if (todayTotal > 0) {
      await clearCompletionsForDate(habit.id, dateKey);
    } else {
      await put("completions", buildCompletion(habit.id, dateKey, 1));
    }
  } else if (habit.trackingType === "custom") {
    const raw = window.prompt(`Add ${habit.unitLabel || "value"} for today`, "1");
    if (!raw) {
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }
    await put("completions", buildCompletion(habit.id, dateKey, value));
  } else {
    await put("completions", buildCompletion(habit.id, dateKey, 1));
  }

  await loadState();
  renderMain();
  renderModalLayer();
}

async function decrementHabit(habitId) {
  const habit = appState.habits.find((item) => item.id === habitId);
  if (!habit) {
    return;
  }

  const dateKey = TODAY();
  const todayItems = appState.completions
    .filter((item) => item.habitId === habit.id && item.dateLocal === dateKey)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (todayItems.length === 0) {
    return;
  }

  if (habit.trackingType === "custom") {
    await remove("completions", todayItems[0].id);
  } else {
    await remove("completions", todayItems[0].id);
  }

  await loadState();
  renderMain();
  renderModalLayer();
}

async function clearCompletionsForDate(habitId, dateKey) {
  const matches = appState.completions.filter((item) => item.habitId === habitId && item.dateLocal === dateKey);
  await Promise.all(matches.map((item) => remove("completions", item.id)));
}

async function archiveHabit(habitId) {
  const habit = appState.habits.find((item) => item.id === habitId);
  if (!habit) {
    return;
  }

  await put("habits", { ...habit, archived: true, updatedAt: nowIso() });
  await loadState();
  appState.activeModal = null;
  renderMain();
  renderModalLayer();
}

async function restoreHabit(habitId) {
  const habit = appState.habits.find((item) => item.id === habitId);
  if (!habit) {
    return;
  }

  await put("habits", { ...habit, archived: false, updatedAt: nowIso() });
  await loadState();
  renderMain();
}

function buildCompletion(habitId, dateLocal, value) {
  return {
    id: crypto.randomUUID(),
    habitId,
    dateLocal,
    value,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function validateHabitDraft(draft) {
  return Boolean(draft && draft.name.trim() && draft.iconValue && draft.color && Number(draft.targetPerDay) > 0);
}

function getActiveHabits() {
  return appState.habits.filter((habit) => !habit.archived);
}

function getArchivedHabits() {
  return appState.habits.filter((habit) => habit.archived);
}

function buildYearCells(habitId, year) {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const cells = [];

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateKey = formatDateKey(date);
    const habit = appState.habits.find((item) => item.id === habitId);
    cells.push({
      dateKey,
      ratio: ratioForDate(habitId, dateKey, habit ? habit.targetPerDay : 1),
      isToday: dateKey === TODAY(),
    });
  }

  return cells;
}

function ratioForDate(habitId, dateKey, target) {
  const total = getDailyTotal(habitId, dateKey);
  if (target <= 0) {
    return 0;
  }
  return Math.min(total / target, 1);
}

function getDailyTotal(habitId, dateKey) {
  return appState.completions
    .filter((item) => item.habitId === habitId && item.dateLocal === dateKey)
    .reduce((sum, item) => sum + Number(item.value), 0);
}

function renderHeatCell(cell, color, compact) {
  const opacity = cell.ratio <= 0 ? 0.12 : cell.ratio < 0.5 ? 0.35 : cell.ratio < 1 ? 0.65 : 1;
  return `
    <span
      class="${compact ? "heat-cell compact" : "heat-cell"} ${cell.isToday ? "today" : ""}"
      style="background:${hexToRgba(color, opacity)}"
      title="${cell.dateKey}">
    </span>
  `;
}

function buildMonthOptions(year) {
  return Array.from({ length: 12 }, (_, index) => monthName(index).slice(0, 3));
}

function buildMonthCalendar(habitId, year, month, target) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cells = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    cells.push({ day: 0, ratio: 0 });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const dateKey = formatDateKey(new Date(year, month, day));
    cells.push({
      day,
      ratio: ratioForDate(habitId, dateKey, target),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ day: 0, ratio: 0 });
  }

  return cells;
}

function getLastNDates(days) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index - 1));
    return date;
  });
}

function getFilteredPickerItems() {
  const source = appState.pickerTab === "icon" ? ICON_OPTIONS : EMOJI_OPTIONS.map((value) => ({ label: value, value }));
  const query = appState.pickerQuery.trim().toLowerCase();

  if (!query) {
    return source;
  }

  return source.filter((item) => item.label.toLowerCase().includes(query) || item.value.includes(query));
}

async function promptInstall() {
  if (!appState.installPrompt) {
    return;
  }

  await appState.installPrompt.prompt();
  appState.installPrompt = null;
  renderHeaderActions();
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    appState.reminderCapability = "supported";
  } else if (permission === "default") {
    appState.reminderCapability = "needs-permission";
  } else {
    appState.reminderCapability = "blocked";
  }
  scheduleReminders();
  renderModalLayer();
}

function reminderSupportLabel() {
  if (appState.reminderCapability === "supported") {
    return "Notifications are allowed in this browser. Reminders are best-effort while the app is installed and supported.";
  }

  if (appState.reminderCapability === "needs-permission") {
    return "Notification capability detected. Grant permission to enable best-effort reminders.";
  }

  if (appState.reminderCapability === "blocked") {
    return "Notifications were blocked in this browser. Reminder settings stay saved locally, but delivery is disabled until permission is allowed.";
  }

  return "This browser environment does not support reliable local reminders. Habit tracking still works normally.";
}

function scheduleReminders() {
  reminderTimers.forEach((timer) => clearTimeout(timer));
  reminderTimers = [];

  if (appState.reminderCapability !== "supported") {
    return;
  }

  appState.reminders
    .filter((reminder) => reminder.enabled)
    .forEach((reminder) => {
      const habit = appState.habits.find((item) => item.id === reminder.habitId);
      if (!habit) {
        return;
      }

      const delay = msUntilTime(reminder.time);
      const timer = setTimeout(() => {
        new Notification(habit.name, {
          body: habit.description || "Time to log today's progress.",
          icon: "/icons/icon.svg",
          badge: "/icons/icon.svg",
        });
        scheduleReminders();
      }, delay);
      reminderTimers.push(timer);
    });
}

function msUntilTime(timeValue) {
  const [hours, minutes] = timeValue.split(":").map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch (error) {
      console.error("Service worker registration failed", error);
    }
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains("habits")) {
        const habits = database.createObjectStore("habits", { keyPath: "id" });
        habits.createIndex("updatedAt", "updatedAt");
      }

      if (!database.objectStoreNames.contains("categories")) {
        database.createObjectStore("categories", { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains("completions")) {
        const completions = database.createObjectStore("completions", { keyPath: "id" });
        completions.createIndex("habitId", "habitId");
        completions.createIndex("dateLocal", "dateLocal");
      }

      if (!database.objectStoreNames.contains("reminders")) {
        const reminders = database.createObjectStore("reminders", { keyPath: "id" });
        reminders.createIndex("habitId", "habitId");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function put(storeName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const request = tx.objectStore(storeName).put(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function remove(storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const request = tx.objectStore(storeName).delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function nowIso() {
  return new Date().toISOString();
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthName(index) {
  return new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2025, index, 1));
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function sortByUpdatedAt(a, b) {
  return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value ?? "");
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

init().catch((error) => {
  console.error(error);
  document.querySelector("#app").innerHTML = `
    <main class="shell">
      <section class="card empty-state">
        <p class="eyebrow">Load error</p>
        <h1>Unable to initialize Habit Heatmap</h1>
        <p>${escapeHtml(error.message)}</p>
      </section>
    </main>
  `;
});
