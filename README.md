# Todo Cards

A lightweight, card-based todo Chrome extension. Click the toolbar icon and your tasks slide in as a side panel — alongside whatever page you're on. Open it in a full tab when you want more room.

Built for one purpose: glance at what you need to do today, without leaving your current page.

## Features

- **Side panel by default** — one click on the toolbar icon opens the board next to any page. No new-tab override, no popup.
- **Open in a full tab** — `↗` button in the side-panel header opens the same board as a standalone, full-width page.
- **Card-based UI** — each task is a card with a colored left border indicating its type.
- **Customizable task types** — manage types in the gear panel: rename, pick from 12 colors, add or remove. Defaults: Work / Personal / Errand.
- **Quick add** — a single input at the top: type a title, optionally pick a type and date (defaults to tomorrow), press Enter.
- **Markdown notes** — click `+ note` on any card. A small toolbar (**B** / **I** / **H** / **•** / **1.** / **`</>`** / **🔗**) plus a textarea. Supports headings, bold/italic, inline & fenced code, lists, and links. URLs are auto-linkified.
  - Plain click on a rendered link → opens the note editor (prevents accidental navigation).
  - **Cmd-click** (or Ctrl-click) → opens the link in a new tab.
- **Always-visible selectors** — task type is a styled dropdown in the type's color; due date is a button that opens the native date picker via `showPicker()` while displaying friendly labels ("Today", "Tomorrow", weekday name, or "Mar 15").
- **Drag to reorder** — grab any card and drop it where you want it. Order persists.
- **Done today strip** — checked tasks slide into a collapsible strip at the bottom of the page. The strip auto-clears at local midnight.
- **Cross-device sync** — tasks are stored in `chrome.storage.sync`, so your list follows your Chrome profile across machines.
- **Auto dark mode** — follows your OS color scheme via `prefers-color-scheme`.

## Install

Personal use, no Chrome Web Store needed:

1. Open `chrome://extensions`
2. Toggle **Developer mode** on (top right)
3. Click **Load unpacked**
4. Select this folder (`todo-task/`)
5. Pin the **Todo Cards** icon in the toolbar
6. Click the icon — the side panel slides in

Requires Chrome 114 or newer (when the Side Panel API shipped).

After editing the code, click the 🔄 refresh icon on the extension's card. For structural manifest changes (permissions, service worker, etc.), do a full **Remove** + **Load unpacked**.

## Tests

```bash
npm test
```

Runs the pure-logic test suite (markdown parser, type helpers, done-task purge) via Node's built-in test runner — no framework, no `node_modules`. Tests live in `tests/*.test.js`.

UI behavior (drag-and-drop, side panel, chrome.* APIs) is verified manually by reloading the extension.

## Keyboard shortcuts (note editor)

| Key | Action |
|---|---|
| `Cmd/Ctrl+Enter` | Save the note |
| `Esc` | Cancel the edit |
| `Cmd/Ctrl+B` | Bold the selection |
| `Cmd/Ctrl+I` | Italicize the selection |
| `Cmd/Ctrl+K` | Insert a markdown link template |
| `Tab` | Insert two spaces |

## Tech notes

By design this app is small enough to read in one sitting.

```
todo-task/
├── manifest.json           # MV3, two permissions: storage + sidePanel
├── icons/                  # 16/48/128 PNG, drawn programmatically
└── src/
    ├── app.html            # Single page used by both side panel and tab
    ├── app-init.js         # Reads ?mode=... from URL, calls init()
    ├── app.js              # ~500 lines: state, render, all task handlers
    ├── background.js       # 3 lines: openPanelOnActionClick: true
    ├── storage.js          # chrome.storage.sync wrapper + midnight purge
    ├── types.js            # Task type helpers + color palette
    ├── markdown.js         # Hand-rolled markdown → HTML (no library)
    ├── note-editor.js      # Toolbar + textarea + selection helpers
    ├── dom.js              # 20-line el() / clear() helpers
    └── styles.css          # All styles
```

**Total source: ~1.5K lines, no build step, no dependencies, no remote scripts.**

### Architecture

- **No framework.** Plain JS, ES modules, full re-render on each state change. With ~tens of tasks the re-render is well under a millisecond.
- **Single source of truth.** One object in `chrome.storage.sync`. `loadState` / `saveState` are the only storage touchpoints. Both surfaces (side panel and full tab) subscribe to `chrome.storage.onChanged`, so a change in one updates the other instantly.
- **Markdown** is a small block tokenizer + an inline pass that stashes parsed HTML behind private-use-area Unicode placeholders (so subsequent regex passes can't accidentally match inside parsed code/links/URLs).
- **Side panel vs tab** is just a URL query param (`?mode=sidepanel`) and a corresponding CSS class on `<main>`. The full tab is the broader, centered layout; the side panel is the same UI with tighter padding and a stacked quick-add row.
- **No service worker tricks.** The worker has one line: enable "open side panel on icon click". Everything else lives in the page.

### Storage shape

```js
{
  tasks: [
    { id, title, note, typeId, dueDate, done, doneAt, order }
  ],
  types: [
    { id, name, color }
  ],
  settings: { theme, lastTypeId }
}
```

`chrome.storage.sync` has a ~100 KB total quota — enough for thousands of tasks.

## Privacy

- No network requests. No analytics. No telemetry.
- Data lives only in your Chrome profile (`chrome.storage.sync`) and syncs through Google's own sync mechanism when you're signed in.
- The extension declares two permissions: `storage` (for the task list) and `sidePanel` (for the panel UI). That's it — no `tabs`, no `host_permissions`, no content scripts.

## License

Personal project. Use it however you like.
