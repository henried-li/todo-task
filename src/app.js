import { loadState, saveState, subscribe } from "./storage.js";
import { el, clear } from "./dom.js";
import { PALETTE, findType, newTypeId } from "./types.js";
import { renderMarkdown } from "./markdown.js";
import { openNoteEditor } from "./note-editor.js";

let state = null;
let rootEl = null;
let mode = "tab";
let typeManagerOpen = false;
let doneStripOpen = false;
let dragId = null;

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayISO() {
  return toISO(new Date());
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toISO(d);
}

function dueDateClass(dueDate) {
  if (!dueDate) return null;
  const today = todayISO();
  if (dueDate < today) return "due-overdue";
  if (dueDate === today) return "due-today";
  return "due-later";
}

function formatDueDate(dueDate) {
  if (!dueDate) return null;
  const today = todayISO();
  if (dueDate === today) return "Today";
  const d = new Date(dueDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d - now) / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function persist() {
  await saveState(state);
}

async function addTask({ title, typeId, dueDate, note }) {
  const maxOrder = state.tasks.reduce((m, t) => Math.max(m, t.order || 0), 0);
  const task = {
    id: crypto.randomUUID(),
    title: title.trim(),
    note: (note || "").trim(),
    typeId: typeId || state.settings.lastTypeId || state.types[0].id,
    dueDate: dueDate || null,
    done: false,
    doneAt: null,
    order: maxOrder + 1
  };
  if (!task.title) return;
  state.tasks.push(task);
  state.settings.lastTypeId = task.typeId;
  await persist();
  render();
}

async function toggleDone(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  task.doneAt = task.done ? new Date().toISOString() : null;
  await persist();
  render();
}

async function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  await persist();
  render();
}

async function updateTask(id, patch) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  Object.assign(task, patch);
  await persist();
  render();
}

async function reorderTask(draggedId, targetId, before) {
  if (draggedId === targetId) return;
  const active = state.tasks.filter(t => !t.done).sort((a, b) => (a.order || 0) - (b.order || 0));
  const dragged = active.find(t => t.id === draggedId);
  const targetIdx = active.findIndex(t => t.id === targetId);
  if (!dragged || targetIdx < 0) return;
  const without = active.filter(t => t.id !== draggedId);
  const insertIdx = without.findIndex(t => t.id === targetId) + (before ? 0 : 1);
  without.splice(insertIdx, 0, dragged);
  without.forEach((t, i) => { t.order = i + 1; });
  await persist();
  render();
}

async function addType(name, color) {
  const t = { id: newTypeId(name), name: name.trim() || "Type", color };
  state.types.push(t);
  state.settings.lastTypeId = t.id;
  await persist();
  render();
}

async function updateType(id, patch) {
  const t = state.types.find(x => x.id === id);
  if (!t) return;
  Object.assign(t, patch);
  await persist();
  render();
}

async function deleteType(id) {
  if (state.types.length <= 1) return;
  state.types = state.types.filter(t => t.id !== id);
  const fallback = state.types[0].id;
  state.tasks.forEach(t => { if (t.typeId === id) t.typeId = fallback; });
  if (state.settings.lastTypeId === id) state.settings.lastTypeId = fallback;
  await persist();
  render();
}

function renderQuickAdd() {
  const input = el("input", {
    class: "qa-input",
    type: "text",
    placeholder: "Add a task and press Enter",
    autofocus: mode === "tab" ? true : null
  });
  const dateInput = el("input", { class: "qa-date", type: "date", value: tomorrowISO() });
  const typeSelect = el("select", { class: "qa-type" },
    state.types.map(t => {
      const opt = el("option", { value: t.id }, t.name);
      if (t.id === (state.settings.lastTypeId || state.types[0].id)) opt.selected = true;
      return opt;
    })
  );
  const submit = async () => {
    if (!input.value.trim()) return;
    await addTask({
      title: input.value,
      typeId: typeSelect.value,
      dueDate: dateInput.value || null
    });
    input.value = "";
    dateInput.value = tomorrowISO();
    input.focus();
  };
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); submit(); }
  });
  const addBtn = el("button", { class: "qa-add", onclick: submit }, "Add");
  return el("div", { class: "quick-add" }, [input, typeSelect, dateInput, addBtn]);
}

function renderCard(task) {
  const type = findType(state.types, task.typeId);
  const card = el("div", {
    class: `card ${task.done ? "card-done" : ""}`,
    draggable: task.done ? "false" : "true",
    style: { borderLeftColor: type.color },
    dataset: { id: task.id }
  });

  if (!task.done) {
    card.addEventListener("dragstart", e => {
      dragId = task.id;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", task.id);
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      document.querySelectorAll(".card").forEach(c => c.classList.remove("drop-before", "drop-after"));
      dragId = null;
    });
    card.addEventListener("dragover", e => {
      if (!dragId || dragId === task.id) return;
      e.preventDefault();
      const rect = card.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      card.classList.toggle("drop-before", before);
      card.classList.toggle("drop-after", !before);
    });
    card.addEventListener("dragleave", () => {
      card.classList.remove("drop-before", "drop-after");
    });
    card.addEventListener("drop", e => {
      e.preventDefault();
      if (!dragId || dragId === task.id) return;
      const rect = card.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      reorderTask(dragId, task.id, before);
    });
  }

  const checkbox = el("button", {
    class: "card-check",
    title: task.done ? "Mark not done" : "Mark done",
    onclick: () => toggleDone(task.id)
  });

  const titleEl = el("div", {
    class: "card-title",
    title: "Click to edit",
    onclick: () => startEdit(task, titleEl, "title")
  }, task.title);

  const hasNote = !!(task.note && task.note.trim());
  const noteEl = el("div", {
    class: hasNote ? "card-note markdown" : "card-note card-note-empty",
    title: hasNote ? "Click to edit · Cmd-click links to open" : "Click to add a note",
    onclick: (e) => {
      const a = e.target.closest("a");
      if (a) {
        if (e.metaKey || e.ctrlKey) return; // let browser follow link in new tab
        e.preventDefault(); // plain click on link → don't navigate, open editor
      }
      startEdit(task, noteEl, "note");
    }
  });
  if (hasNote) {
    noteEl.innerHTML = renderMarkdown(task.note);
  } else if (!task.done) {
    noteEl.textContent = "+ note";
  }

  const meta = el("div", { class: "card-meta" });

  const typeSelect = el("select", {
    class: "card-type",
    style: { color: type.color },
    title: task.done ? null : "Change type",
    disabled: task.done ? "" : null,
    onclick: (e) => e.stopPropagation(),
    onchange: (e) => updateTask(task.id, { typeId: e.target.value })
  }, state.types.map(t => {
    const opt = el("option", { value: t.id }, t.name);
    if (t.id === task.typeId) opt.selected = true;
    return opt;
  }));
  meta.appendChild(typeSelect);

  const hiddenDate = el("input", {
    class: "card-due-hidden",
    type: "date",
    value: task.dueDate || "",
    tabindex: "-1",
    onchange: (e) => {
      e.stopPropagation();
      updateTask(task.id, { dueDate: e.target.value || null });
    }
  });
  const dueLabel = task.dueDate ? formatDueDate(task.dueDate) : "+ date";
  const dueClass = task.dueDate
    ? `card-due ${dueDateClass(task.dueDate)}`
    : "card-due card-due-add";
  const dueButton = el("button", {
    class: dueClass,
    type: "button",
    title: task.done ? null : "Change date",
    disabled: task.done ? "" : null,
    onclick: (e) => {
      e.stopPropagation();
      if (task.done) return;
      if (typeof hiddenDate.showPicker === "function") {
        try { hiddenDate.showPicker(); return; } catch {}
      }
      hiddenDate.focus();
      hiddenDate.click();
    }
  }, dueLabel);
  const dueWrap = el("span", { class: "card-due-wrap" }, [dueButton, hiddenDate]);
  meta.appendChild(dueWrap);

  const del = el("button", {
    class: "card-del",
    title: "Delete",
    onclick: () => deleteTask(task.id)
  }, "×");

  const main = el("div", { class: "card-main" }, [titleEl, noteEl, meta]);
  card.appendChild(checkbox);
  card.appendChild(main);
  card.appendChild(del);
  return card;
}

function startEdit(task, node, field) {
  if (task.done) return;
  if (field === "note") {
    openNoteEditor(
      task,
      node,
      (newValue) => updateTask(task.id, { note: newValue }),
      () => render()
    );
    return;
  }
  const current = task[field] || "";
  const input = el("input", {
    class: `edit-${field}`,
    type: "text",
    value: current,
    placeholder: field === "note" ? "Add a note" : "Title"
  });
  let settled = false;
  const finish = (commit) => {
    if (settled) return;
    settled = true;
    if (commit) {
      const v = input.value.trim();
      if (field === "title" && !v) { render(); return; }
      updateTask(task.id, { [field]: v });
    } else {
      render();
    }
  };
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); finish(true); }
    else if (e.key === "Escape") { e.preventDefault(); finish(false); }
  });
  input.addEventListener("blur", () => finish(true));
  node.replaceWith(input);
  input.focus();
  input.select();
}

function renderActiveCards() {
  const active = state.tasks
    .filter(t => !t.done)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  if (active.length === 0) {
    return el("div", { class: "empty" }, [
      el("div", { class: "empty-icon" }, "✶"),
      el("div", { class: "empty-text" }, "No active tasks. Add one above."),
    ]);
  }
  return el("div", { class: "cards" }, active.map(renderCard));
}

function renderDoneStrip() {
  const done = state.tasks.filter(t => t.done).sort((a, b) =>
    (b.doneAt || "").localeCompare(a.doneAt || "")
  );
  if (done.length === 0) return null;
  const header = el("button", {
    class: "done-header",
    onclick: () => { doneStripOpen = !doneStripOpen; render(); }
  }, [
    el("span", { class: "done-caret" }, doneStripOpen ? "▾" : "▸"),
    el("span", {}, `Done today (${done.length})`),
  ]);
  const items = doneStripOpen
    ? el("div", { class: "done-cards" }, done.map(renderCard))
    : null;
  return el("div", { class: "done-strip" }, [header, items]);
}

function renderTypeManager() {
  if (!typeManagerOpen) return null;
  const list = el("div", { class: "tm-list" }, state.types.map(t => {
    const nameInput = el("input", {
      class: "tm-name",
      type: "text",
      value: t.name,
      onchange: e => updateType(t.id, { name: e.target.value.trim() || t.name })
    });
    const swatches = el("div", { class: "tm-swatches" }, PALETTE.map(c => el("button", {
      class: `tm-swatch ${t.color === c ? "tm-swatch-active" : ""}`,
      style: { background: c },
      title: c,
      onclick: () => updateType(t.id, { color: c })
    })));
    const del = el("button", {
      class: "tm-del",
      title: "Delete type",
      disabled: state.types.length <= 1 ? "" : null,
      onclick: () => deleteType(t.id)
    }, "×");
    return el("div", { class: "tm-row" }, [
      el("span", { class: "tm-dot", style: { background: t.color } }),
      nameInput,
      swatches,
      del
    ]);
  }));

  const newName = el("input", { class: "tm-name", type: "text", placeholder: "New type name" });
  const usedColors = new Set(state.types.map(t => t.color));
  const nextColor = PALETTE.find(c => !usedColors.has(c)) || PALETTE[0];
  const addBtn = el("button", {
    class: "tm-add",
    onclick: () => {
      if (!newName.value.trim()) return;
      addType(newName.value, nextColor);
    }
  }, "+ Add type");
  newName.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); addBtn.click(); }
  });
  const addRow = el("div", { class: "tm-row tm-add-row" }, [newName, addBtn]);

  return el("div", { class: "type-manager" }, [
    el("div", { class: "tm-title" }, "Task types"),
    list,
    addRow
  ]);
}

async function openInTab() {
  const url = chrome.runtime.getURL("src/app.html");
  try {
    const { appTabId } = await chrome.storage.local.get("appTabId");
    if (appTabId) {
      try {
        const tab = await chrome.tabs.get(appTabId);
        await chrome.tabs.update(appTabId, { active: true });
        if (tab && tab.windowId !== undefined) {
          await chrome.windows.update(tab.windowId, { focused: true });
        }
        return;
      } catch {
        // stored tab id no longer valid; fall through to create
      }
    }
    const newTab = await chrome.tabs.create({ url });
    await chrome.storage.local.set({ appTabId: newTab.id });
  } catch (e) {
    window.open(url, "_blank");
  }
}

function renderHeader() {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric"
  });
  const children = [
    el("div", { class: "title" }, "Todo Cards"),
    el("div", { class: "today" }, today),
  ];
  if (mode === "sidepanel") {
    children.push(el("button", {
      class: "icon-btn open-in-tab",
      title: "Open in full tab",
      onclick: openInTab
    }, "↗"));
  }
  children.push(el("button", {
    class: "icon-btn gear",
    title: "Manage task types",
    onclick: () => { typeManagerOpen = !typeManagerOpen; render(); }
  }, "⚙"));
  return el("header", { class: "app-header" }, children);
}

function render() {
  if (!rootEl) return;
  clear(rootEl);
  rootEl.classList.add(`mode-${mode}`);
  const container = el("div", { class: "container" }, [
    renderHeader(),
    renderTypeManager(),
    renderQuickAdd(),
    renderActiveCards(),
    renderDoneStrip()
  ]);
  rootEl.appendChild(container);
}

export async function init(root, surfaceMode) {
  rootEl = root;
  mode = surfaceMode || "tab";
  state = await loadState();
  render();
  subscribe(newState => {
    if (!newState) return;
    state = newState;
    if (!state.tasks) state.tasks = [];
    if (!state.types) state.types = [];
    render();
  });
}
