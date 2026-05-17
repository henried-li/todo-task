# Changelog

Notable changes to Todo Cards. Each entry is a one-liner.

## Unreleased

- Display autolinked URLs in notes by hostname; full URL stays in href + tooltip ([#1](https://github.com/henried-li/todo-task/pull/1))
- Document cursor-grab gutter as the drag affordance ([#1](https://github.com/henried-li/todo-task/pull/1))
- Smoothly reorder cards in flight while dragging instead of showing a static insertion line ([#4](https://github.com/henried-li/todo-task/pull/4))
- Preserved the new-card type dropdown selection across re-renders (aborted drags and cross-surface storage sync no longer snap it back to the last-used type)
- Defaulted the new-card type dropdown to Work on every fresh app load, regardless of the last-used type

## 0.2.0 — 2026-05-10

- Initial release: card-based todo with markdown notes, side panel + full-tab modes, drag-to-reorder, customizable task types, `chrome.storage.sync` persistence.
