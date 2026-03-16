const DB_NAME = "habit-heatmap-db";
const DB_VERSION = 1;
const TODAY = () => formatDateKey(new Date());
const CURRENT_YEAR = new Date().getFullYear();

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
  { label: "Bolt", value: "bolt", path: "M14 2 5 13h6l-1 9 9-11h-6z" },
  { label: "Book", value: "book", path: "M6 4.5A2.5 2.5 0 0 1 8.5 2H20v18H8.5A2.5 2.5 0 0 0 6 22z M6 4v18H4V6a2 2 0 0 1 2-2" },
  { label: "Brush", value: "brush", path: "M9 18c-1.5 0-3 1-3 3 0 .6.4 1 1 1 2 0 4-1.5 4-3.5 0-.7-.2-1.2-.5-1.5L19 8.5a2.1 2.1 0 0 0-3-3L7.5 14c-.4.3-.7.8-.9 1.3-.2.6-.1 1.4.4 1.9.5.5 1.2.8 2 .8z" },
  { label: "Coffee", value: "coffee", path: "M18 8h1a4 4 0 0 1 0 8h-1 M2 8h16v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z M6 2v3 M10 2v3 M14 2v3" },
  { label: "Code", value: "code", path: "m8 9-5 3 5 3 M16 9l5 3-5 3 M14 4l-4 16" },
  { label: "Dumbbell", value: "dumbbell", path: "M4 10v4 M7 8v8 M17 8v8 M20 10v4 M7 12h10" },
  { label: "Drop", value: "drop", path: "M12 2s6 6 6 11a6 6 0 1 1-12 0c0-5 6-11 6-11z" },
  { label: "Heart", value: "heart", path: "m12 21-1.3-1.2C5.2 14.8 2 11.9 2 8.3 2 5.4 4.3 3 7.2 3c1.7 0 3.4.8 4.5 2.1C12.9 3.8 14.6 3 16.3 3 19.2 3 21.5 5.4 21.5 8.3c0 3.6-3.2 6.5-8.7 11.5z" },
  { label: "Leaf", value: "leaf", path: "M6 20c6 0 12-4 12-12V4h-4C8 4 4 8 4 14c0 2.2.7 4.2 2 6z M8 16c2-2 5-5 9-7" },
  { label: "Moon", value: "moon", path: "M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" },
  { label: "Run", value: "run", path: "M13 5a2 2 0 1 0 0 .01 M9 22l1-5 2-2 2 1 2 6 M8 13l3-2 1-3 3 2 2 1" },
  { label: "Sun", value: "sun", path: "M12 4V2 M12 22v-2 M4.9 4.9 3.5 3.5 M20.5 20.5l-1.4-1.4 M2 12h2 M20 12h2 M4.9 19.1l-1.4 1.4 M20.5 3.5l-1.4 1.4 M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" },
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
  selectedMonth: new Date().getMonth(),
  activeModal: null,
  formDraft: null,
  pickerTab: "icon",
  pickerQuery: "",
  selectedHabitId: null,
  installPrompt: null,
  reminderCapability: "unsupported",
  toast: null,
  formModalScroll: 0,
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
    renderInstallBanner();
  });

  window.addEventListener("appinstalled", () => {
    appState.installPrompt = null;
    renderHeaderActions();
    renderInstallBanner();
  });

  document.addEventListener("click", handleClick);
  document.addEventListener("change", handleChange);
  document.addEventListener("input", handleInput);
}

function handleInput(event) {
  const target = event.target;
  if (target.matches("[data-field]")) {
    updateDraftField(target.dataset.field, target.type === "checkbox" ? target.checked : target.value, { render: false });
    syncDraftControls();
  }

  if (target.matches("[data-picker-query]")) {
    appState.pickerQuery = target.value;
    renderPickerItems();
  }

  if (target.matches("[data-quick-custom-value]")) {
    updateDraftField("quickCustomValue", target.value, { render: false });
  }
}

function handleChange(event) {
  const target = event.target;

  if (target.matches("select[data-field]")) {
    updateDraftField(target.dataset.field, target.value);
    syncDraftControls();
    return;
  }

  if (target.matches("[data-category-checkbox]")) {
    const next = new Set(appState.formDraft.categoryIds || []);
    if (target.checked) {
      next.add(target.value);
    } else {
      next.delete(target.value);
    }
    updateDraftField("categoryIds", [...next], { render: false });
    target.closest(".chip")?.classList.toggle("selected", target.checked);
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
    updateDraftField("color", target.dataset.color, { render: false });
    syncFormVisuals();
  } else if (action === "open-picker") {
    appState.formModalScroll = getModalScrollTop();
    appState.activeModal = "picker";
    appState.pickerTab = target.dataset.tab || "icon";
    appState.pickerQuery = "";
    renderModalLayer();
  } else if (action === "set-icon-type") {
    appState.formDraft.iconType = target.dataset.tab || "icon";
    appState.formModalScroll = getModalScrollTop();
    appState.activeModal = "picker";
    appState.pickerTab = appState.formDraft.iconType;
    appState.pickerQuery = "";
    renderModalLayer();
  } else if (action === "picker-tab") {
    appState.pickerTab = target.dataset.tab;
    renderModalLayer();
  } else if (action === "select-picker-item") {
    updateDraftField("iconType", appState.pickerTab, { render: false });
    updateDraftField("iconValue", target.dataset.value, { render: false });
    appState.activeModal = "form";
    renderModalLayer();
    setModalScrollTop(appState.formModalScroll);
  } else if (action === "save-habit") {
    await saveHabit();
  } else if (action === "edit-habit") {
    openHabitForm(target.dataset.habitId || appState.selectedHabitId);
  } else if (action === "open-detail") {
    appState.selectedHabitId = target.dataset.habitId;
    appState.activeModal = "detail";
    renderModalLayer();
  } else if (action === "prompt-delete-habit") {
    appState.selectedHabitId = target.dataset.habitId || appState.selectedHabitId;
    appState.activeModal = "delete-confirm";
    renderModalLayer();
  } else if (action === "cancel-delete-habit") {
    appState.activeModal = "detail";
    renderModalLayer();
  } else if (action === "delete-habit") {
    await deleteHabit(target.dataset.habitId || appState.selectedHabitId);
  } else if (action === "complete-habit") {
    await completeHabit(target.dataset.habitId);
  } else if (action === "decrement-habit") {
    await decrementHabit(target.dataset.habitId);
  } else if (action === "archive-habit") {
    await archiveHabit(target.dataset.habitId || appState.selectedHabitId);
  } else if (action === "restore-habit") {
    await restoreHabit(target.dataset.habitId);
  } else if (action === "toggle-archived") {
    appState.activeModal = "archived";
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
          <h1>Habit Heatmap</h1>
          <p class="tagline">Track your habit with GitHub style commit</p>
        </div>
        <div class="header-actions" id="header-actions"></div>
      </header>
      <main id="main-content"></main>
      <section id="modal-layer"></section>
      <section id="toast-layer"></section>
      <section id="install-banner-layer"></section>
    </div>
  `;

  renderHeaderActions();
  renderMain();
  renderModalLayer();
  renderToast();
  renderInstallBanner();
}

function renderHeaderActions() {
  const root = document.querySelector("#header-actions");
  if (!root) {
    return;
  }

  const archivedCount = getArchivedHabits().length;

  root.innerHTML = `
    ${archivedCount > 0 ? '<button class="ghost-btn warn-outline" data-action="toggle-archived" aria-label="Archived habits">Archives</button>' : ""}
    <button class="ghost-btn warn-outline" data-action="open-create" aria-label="Create habit">✨ New Habit</button>
  `;
}

function renderInstallBanner() {
  const root = document.querySelector("#install-banner-layer");
  if (!root) {
    return;
  }

  if (!appState.installPrompt) {
    root.innerHTML = "";
    return;
  }

  root.innerHTML = `
    <div class="install-banner">
      <span>Install Habit Heatmap for faster access</span>
      <button class="install-banner-btn" data-action="install-app">Install</button>
    </div>
  `;
}

function renderMain() {
  const root = document.querySelector("#main-content");
  if (!root) {
    return;
  }

  const activeHabits = getActiveHabits();

  root.innerHTML = `
    ${activeHabits.length > 0 ? renderDashboardStats(activeHabits) : ""}
    ${activeHabits.length === 0 ? renderEmptyState() : renderHabits(activeHabits)}
  `;
}

function renderDashboardStats(activeHabits) {
  const completedToday = activeHabits.filter((habit) => getDailyTotal(habit.id, TODAY()) >= habit.targetPerDay).length;
  const totalToday = activeHabits.length;

  return `
    <section class="stats-grid">
      <article class="card stat-card">
        <p class="eyebrow">Today</p>
        <strong>${completedToday}/${totalToday}</strong>
        <span>habits reached target</span>
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
        <button class="primary-btn" data-action="open-create">Create first habit</button>
      </div>
    </section>
  `;
}

function renderHabits(activeHabits) {
  return `
    <section class="habit-list-section">
      ${renderCardsView(activeHabits)}
    </section>
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
  const isComplete = today >= habit.targetPerDay;
  const subtitle = habit.description ? escapeHtml(habit.description) : "";

  return `
    <article class="card habit-card" style="--accent:${accent}" data-action="open-detail" data-habit-id="${habit.id}" aria-label="Open ${escapeHtml(habit.name)} detail">
      <div class="habit-card-header">
        <div class="habit-meta">
          <div class="icon-tile" style="background:${accent}20;color:${accent}">${renderVisual(habit.iconType, habit.iconValue, accent, "md")}</div>
          <div>
            <h3>${escapeHtml(habit.name)}</h3>
            ${subtitle ? `<p>${subtitle}</p>` : ""}
          </div>
        </div>
        <div class="habit-card-actions">
          ${habit.targetPerDay > 1 ? `<button class="ghost-btn small card-action-control" data-action="decrement-habit" data-habit-id="${habit.id}" aria-label="Decrease ${escapeHtml(habit.name)}">−</button>` : ""}
          <button class="${isComplete ? "primary-btn action-btn" : "ghost-btn action-btn neutral"} card-action-control" data-action="complete-habit" data-habit-id="${habit.id}" aria-label="Complete ${escapeHtml(habit.name)}">
            ${habit.trackingType === "custom" ? "+" : habit.targetPerDay === 1 ? (isComplete ? "✓" : "○") : "+"}
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

function renderCompactHeatmap(habit) {
  const cells = getCompactHeatmapCells(habit.id, CURRENT_YEAR);
  return `
    <div class="heatmap compact-heatmap">
      ${cells.map((cell) => renderHeatCell(cell, habit.color, true)).join("")}
    </div>
  `;
}

function renderArchived(archivedHabits) {
  return `
    <section class="modal-card archived-panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Archived</p>
          <h2>${archivedHabits.length} habit${archivedHabits.length === 1 ? "" : "s"}</h2>
        </div>
        <button class="ghost-btn" data-action="close-modal">✕</button>
      </div>
      ${archivedHabits.length === 0 ? "<p class='muted'>No archived habits yet.</p>" : ""}
      <div class="archived-list">
        ${archivedHabits
          .map(
            (habit) => `
              <div class="archived-item">
                <div>
                  <strong>${renderVisual(habit.iconType, habit.iconValue, habit.color, "sm")} ${escapeHtml(habit.name)}</strong>
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

  const scrollState = captureModalScroll();

  if (appState.activeModal === "form" && appState.formDraft) {
    root.innerHTML = renderHabitFormModal();
    restoreModalScroll(scrollState);
    return;
  }

  if (appState.activeModal === "picker" && appState.formDraft) {
    root.innerHTML = renderPickerModal();
    restoreModalScroll(scrollState);
    return;
  }

  if (appState.activeModal === "detail" && appState.selectedHabitId) {
    root.innerHTML = renderDetailModal();
    restoreModalScroll(scrollState);
    return;
  }

  if (appState.activeModal === "archived") {
    root.innerHTML = `<div class="modal-backdrop">${renderArchived(getArchivedHabits())}</div>`;
    restoreModalScroll(scrollState);
    return;
  }

  if (appState.activeModal === "delete-confirm" && appState.selectedHabitId) {
    root.innerHTML = renderDeleteConfirmModal();
    restoreModalScroll(scrollState);
    return;
  }

  root.innerHTML = "";
}

function captureModalScroll() {
  const backdrop = document.querySelector(".modal-backdrop");
  if (!backdrop) {
    return null;
  }

  return {
    top: backdrop.scrollTop,
    left: backdrop.scrollLeft,
  };
}

function restoreModalScroll(scrollState) {
  if (!scrollState) {
    return;
  }

  const backdrop = document.querySelector(".modal-backdrop");
  if (!backdrop) {
    return;
  }

  backdrop.scrollTop = scrollState.top;
  backdrop.scrollLeft = scrollState.left;
}

function getModalScrollTop() {
  return document.querySelector(".modal-backdrop")?.scrollTop || 0;
}

function setModalScrollTop(value) {
  const backdrop = document.querySelector(".modal-backdrop");
  if (!backdrop) {
    return;
  }

  backdrop.scrollTop = value || 0;
}

function renderToast() {
  const root = document.querySelector("#toast-layer");
  if (!root) {
    return;
  }

  root.innerHTML = appState.toast ? `<div class="toast" role="status" aria-live="polite">${escapeHtml(appState.toast)}</div>` : "";
}

function showToast(message) {
  appState.toast = message;
  renderToast();
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    appState.toast = null;
    renderToast();
  }, 2200);
}

function syncDraftControls() {
  const saveButton = document.querySelector("[data-save-habit]");
  if (saveButton) {
    saveButton.disabled = !validateHabitDraft(appState.formDraft);
  }
}

function syncFormVisuals() {
  if (!appState.formDraft || appState.activeModal !== "form") {
    return;
  }

  const preview = document.querySelector(".icon-preview.large");
  if (preview) {
    preview.style.background = `${appState.formDraft.color}20`;
    preview.style.color = appState.formDraft.color;
    preview.innerHTML = renderVisual(appState.formDraft.iconType, appState.formDraft.iconValue, appState.formDraft.color, "lg");
  }

  document.querySelectorAll(".color-option").forEach((button) => {
    button.classList.toggle("selected", button.dataset.color === appState.formDraft.color);
  });

  document.querySelectorAll("[data-action='set-icon-type']").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === appState.formDraft.iconType);
  });
}

function renderPickerItems() {
  const grid = document.querySelector("#picker-grid");
  if (!grid || !appState.formDraft) {
    return;
  }

  grid.innerHTML = getFilteredPickerItems()
    .map(
      (item) => `
        <button
          class="picker-item ${appState.formDraft.iconValue === item.value && appState.formDraft.iconType === appState.pickerTab ? "selected" : ""}"
          data-action="select-picker-item"
          data-value="${item.value}"
          aria-label="${escapeAttr(item.label)}">
          <span>${renderVisual(appState.pickerTab, item.value, appState.formDraft.color, "lg")}</span>
        </button>
      `
    )
    .join("");
}

function renderHabitFormModal() {
  const draft = appState.formDraft;
  const canSave = validateHabitDraft(draft);
  const isCustomTracking = draft.trackingType === "custom";

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

        <div class="form-layout">
          <div class="form-column">
            <div class="form-section">
              <button class="picker-preview visual-preview" data-action="open-picker" data-tab="${draft.iconType}">
                <span class="icon-preview large" style="background:${draft.color}20;color:${draft.color}">
                  ${renderVisual(draft.iconType, draft.iconValue, draft.color, "lg")}
                </span>
              </button>
              <div class="picker-toggle segmented">
                <button class="${draft.iconType === "icon" ? "segmented-btn active" : "segmented-btn"}" data-action="set-icon-type" data-tab="icon">Icon</button>
                <button class="${draft.iconType === "emoji" ? "segmented-btn active" : "segmented-btn"}" data-action="set-icon-type" data-tab="emoji">Emoji</button>
              </div>
            </div>
            <div class="form-section">
              <label>Name
                <input data-field="name" maxlength="60" placeholder="Read 10 pages" value="${escapeAttr(draft.name)}" />
              </label>
            </div>

            <div class="form-section">
              <label>Description
                <input data-field="description" maxlength="120" placeholder="Optional note" value="${escapeAttr(draft.description || "")}" />
              </label>
            </div>

            <div class="form-section">
              <div class="color-grid">
                ${COLORS.map((color) => renderColorOption(color, color === draft.color)).join("")}
              </div>
            </div>

            <details class="form-section details-block">
              <summary>Advanced options</summary>
              <div class="section-block">
                <div class="section-header">
                  <div>
                    <p class="eyebrow">Goal</p>
                    <h3>Set daily target</h3>
                  </div>
                </div>
                <label>Tracking mode
                  <select data-field="trackingType">
                    <option value="step" ${draft.trackingType === "step" ? "selected" : ""}>Step by step</option>
                    <option value="custom" ${draft.trackingType === "custom" ? "selected" : ""}>Custom value</option>
                  </select>
                </label>
                <p class="field-hint">${renderTrackingModeHint(draft.trackingType)}</p>
                ${isCustomTracking ? `
                  <div class="field-grid basic-grid">
                    <label>Target per day
                      <input data-field="targetPerDay" type="number" min="1" max="999" value="${escapeAttr(String(draft.targetPerDay))}" />
                    </label>
                    <label>Unit label
                      <input data-field="unitLabel" maxlength="18" placeholder="minutes" value="${escapeAttr(draft.unitLabel || "")}" />
                    </label>
                  </div>
                ` : ""}
              </div>
            </details>
          </div>
        </div>

        <div class="modal-footer">
          <button class="ghost-btn" data-action="close-modal">Cancel</button>
          <button class="primary-btn" data-action="save-habit" data-save-habit ${canSave ? "" : "disabled"}>Save habit</button>
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
      <span>${renderVisual(category.iconType, category.iconValue, "#f5a623", "sm")} ${escapeHtml(category.name)}</span>
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
        <span class="icon-preview small">${renderVisual(categoryDraft.iconType, categoryDraft.iconValue, "#f5a623", "sm")}</span>
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
  updateDraftField("categoryDraft", next, { render: false });
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
        <div class="picker-grid" id="picker-grid">
          ${list
            .map(
              (item) => `
                <button
                  class="picker-item ${appState.formDraft.iconValue === item.value && appState.formDraft.iconType === appState.pickerTab ? "selected" : ""}"
                  data-action="select-picker-item"
                  data-value="${item.value}"
                  aria-label="${escapeAttr(item.label)}">
                  <span>${renderVisual(appState.pickerTab, item.value, appState.formDraft.color, "lg")}</span>
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

  const yearCells = buildYearCells(habit.id, CURRENT_YEAR);
  const filledCells = yearCells.filter((cell) => cell.ratio > 0).length;
  const totalCells = yearCells.length;

  return `
    <div class="modal-backdrop">
      <section class="modal-card detail-modal">
        <div class="modal-header">
          <div class="detail-title">
            <span class="icon-tile" style="background:${habit.color}20;color:${habit.color}">${renderVisual(habit.iconType, habit.iconValue, habit.color, "md")}</span>
            <div>
              <p class="eyebrow">Habit detail</p>
              <h2>${escapeHtml(habit.name)}</h2>
            </div>
          </div>
          <button class="ghost-btn" data-action="close-modal">✕</button>
        </div>
        <div class="detail-actions">
          <button class="ghost-btn" data-action="edit-habit">Edit</button>
          <div class="detail-actions-right">
            <button class="ghost-btn warn-outline" data-action="archive-habit" data-habit-id="${habit.id}">Archive</button>
            <button class="ghost-btn danger" data-action="prompt-delete-habit" data-habit-id="${habit.id}">Delete</button>
          </div>
        </div>
        <section class="detail-section">
          <div class="section-header">
            <div>
              <p class="eyebrow">Year heatmap</p>
              <h3>${filledCells}/${totalCells} filled this year</h3>
            </div>
          </div>
          <div class="heatmap detail-heatmap">
            ${yearCells.map((cell) => renderHeatCell(cell, habit.color, true)).join("")}
          </div>
        </section>
      </section>
    </div>
  `;
}

function renderDeleteConfirmModal() {
  const habit = appState.habits.find((item) => item.id === appState.selectedHabitId);
  if (!habit) {
    return "";
  }

  const description = habit.description ? escapeHtml(habit.description) : "No description";

  return `
    <div class="modal-backdrop">
      <section class="modal-card confirm-modal">
        <div class="modal-header">
          <div>
            <p class="eyebrow">Delete habit</p>
            <h2>Delete ${escapeHtml(habit.name)}?</h2>
          </div>
          <button class="ghost-btn" data-action="cancel-delete-habit" aria-label="Close delete confirmation">✕</button>
        </div>
        <div class="confirm-copy">
          <p>Are you sure you want to delete <strong>${escapeHtml(habit.name)}</strong>?</p>
          <p class="muted">${description}</p>
        </div>
        <div class="detail-actions">
          <button class="ghost-btn" data-action="cancel-delete-habit">Cancel</button>
          <button class="ghost-btn danger" data-action="delete-habit" data-habit-id="${habit.id}">Delete</button>
        </div>
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
  } else if (appState.activeModal === "delete-confirm") {
    appState.activeModal = "detail";
  } else {
    appState.activeModal = null;
    appState.formDraft = null;
  }
  renderModalLayer();
  if (appState.activeModal === "form") {
    setModalScrollTop(appState.formModalScroll);
  }
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
        iconType: "icon",
        iconValue: "bolt",
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

function updateDraftField(field, value, options = {}) {
  if (!appState.formDraft) {
    return;
  }

  const { render = true } = options;

  if (field === "targetPerDay") {
    appState.formDraft[field] = Math.max(1, Number(value || 1));
  } else {
    appState.formDraft[field] = value;
  }

  if (field === "trackingType" && value === "step") {
    appState.formDraft.targetPerDay = 1;
    appState.formDraft.unitLabel = "";
  }

  if (field === "trackingType" && value === "custom" && Number(appState.formDraft.targetPerDay) <= 1) {
    appState.formDraft.targetPerDay = 2;
  }

  if (render) {
    renderModalLayer();
  }
}

function renderTrackingModeHint(trackingType) {
  if (trackingType === "custom") {
    return "Custom value records a numeric amount for each entry, such as minutes, pages, glasses, or kilometers.";
  }

  return "Step by step is the simple check-off mode. Each tap adds 1 and the habit is treated as once per day.";
}

async function saveHabit() {
  const draft = appState.formDraft;
  if (!validateHabitDraft(draft)) {
    return;
  }

  const trackingType = draft.trackingType === "custom" ? "custom" : "step";
  const targetPerDay = trackingType === "custom" ? Number(draft.targetPerDay) : 1;
  const unitLabel = trackingType === "custom" ? draft.unitLabel.trim() : "";

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
    trackingType,
    targetPerDay,
    unitLabel,
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
  renderHeaderActions();
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
  showToast(`Category "${category.name}" created`);
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
  renderHeaderActions();
}

async function restoreHabit(habitId) {
  const habit = appState.habits.find((item) => item.id === habitId);
  if (!habit) {
    return;
  }

  await put("habits", { ...habit, archived: false, updatedAt: nowIso() });
  await loadState();
  if (getArchivedHabits().length === 0) {
    appState.activeModal = null;
  }
  renderMain();
  renderModalLayer();
  renderHeaderActions();
}

async function deleteHabit(habitId) {
  const habit = appState.habits.find((item) => item.id === habitId);
  if (!habit) {
    return;
  }

  const completions = appState.completions.filter((item) => item.habitId === habit.id);
  const reminders = appState.reminders.filter((item) => item.habitId === habit.id);

  await Promise.all(completions.map((item) => remove("completions", item.id)));
  await Promise.all(reminders.map((item) => remove("reminders", item.id)));
  await remove("habits", habit.id);

  appState.activeModal = null;
  appState.selectedHabitId = null;
  await loadState();
  scheduleReminders();
  renderMain();
  renderModalLayer();
  renderHeaderActions();
  showToast(`Deleted "${habit.name}"`);
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
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year, 11, 31);
  const cells = [];
  const habit = appState.habits.find((item) => item.id === habitId);

  for (let time = start; time <= end; time += 86400000) {
    const dateKey = formatUtcDateKey(new Date(time));
    cells.push({
      dateKey,
      ratio: ratioForDate(habitId, dateKey, habit ? habit.targetPerDay : 1),
      isToday: dateKey === TODAY(),
    });
  }

  return cells;
}

function getCompactHeatmapCells(habitId, year) {
  const cells = buildYearCells(habitId, year);
  const compactLength = 21;
  const todayKey = TODAY();
  const currentYear = new Date().getFullYear();

  if (year === currentYear) {
    const todayIndex = cells.findIndex((cell) => cell.dateKey === todayKey);
    if (todayIndex >= 0) {
      return cells.slice(Math.max(0, todayIndex - (compactLength - 1)), todayIndex + 1);
    }
  }

  return cells.slice(-compactLength);
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
  renderInstallBanner();
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

function renderVisual(type, value, color, size = "md") {
  if (type === "icon") {
    const icon = ICON_OPTIONS.find((item) => item.value === value) || ICON_OPTIONS[0];
    const pixelSize = size === "lg" ? 44 : size === "sm" ? 18 : 24;
    return `
      <svg class="app-icon app-icon-${size}" viewBox="0 0 24 24" width="${pixelSize}" height="${pixelSize}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="${icon.path}"></path>
      </svg>
    `;
  }

  return `<span class="emoji-mark emoji-${size}">${escapeHtml(value)}</span>`;
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

function formatUtcDateKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
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
