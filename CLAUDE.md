# CLAUDE.md

Todo Cards — a personal Chrome extension (Manifest V3) for daily task reminders. Side panel by default, full-tab on demand.

## Core principles — preserve these

This app exists because the user wanted something **lightweight and easy to use**. Every change should defend that property.

- **Lightweight**: ~1.5K lines total across all source. No framework, no build step, no `node_modules` for the extension itself, no remote scripts, no analytics. Do not introduce a bundler, transpiler, or runtime dependency without strong justification — the markdown parser is hand-rolled for exactly this reason.
- **Easy to use**: the flow is one-input + one-click. Do not add nested projects, modals, multi-step wizards, settings pages, onboarding, or anything else that asks the user to think about state. If a feature can't be expressed as a card or a chip, push back before adding it.
- **Low Chrome footprint**: full re-render on every state change is intentional. It is fast enough at the scale of "a person's daily todo list". Don't introduce surgical DOM diffing, virtual DOM, or memoization without first measuring a real perf problem.

## Architecture in 30 seconds

- One single source of truth in `chrome.storage.sync` — see `src/storage.js`.
- One render function in `src/app.js` that rebuilds the DOM from state on every change. Both surfaces subscribe to `chrome.storage.onChanged`, so side panel and full tab stay in sync live.
- Two entry surfaces, one renderer: `?mode=sidepanel` vs no param (`tab`). Layout differences are CSS-only.
- Service worker (`src/background.js`) has one job: `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`.
- Markdown is parsed in `src/markdown.js` via a small block tokenizer + an inline pass that stashes parsed HTML behind Private Use Area unicode placeholders (so subsequent regex passes can't accidentally match inside parsed segments). Tests in `tests/markdown.test.js` lock down this behavior, including the digit-preservation regression that the placeholders fix.

## Tests

```
npm test
```

Pure-logic tests only — markdown parser, type helpers, `purgeOldDone`. Uses Node's built-in test runner (`node --test`). No framework, no dependencies. Tests live in `tests/*.test.js`.

UI / drag-and-drop / chrome.* API behavior is verified manually: reload the extension in `chrome://extensions` and reload the side panel / full tab.

When adding new pure functions, add tests for them. When touching `markdown.js`, run the suite — it's specifically designed to catch regressions.

## When making changes

- Keep new source files under ~200 lines. If you're approaching that, you're probably adding too much.
- Prefer editing existing files to creating new ones.
- Default to writing no comments. Only explain *why* if non-obvious.
- For UI changes, reload the side panel in Chrome to confirm before reporting done. Type-checking and tests verify code correctness, not feature correctness.
- For structural manifest changes (adding/removing permissions, the service worker, `chrome_url_overrides`, etc.), the user must fully **Remove** + **Load unpacked** the extension — Chrome's reload icon doesn't reliably pick those up. Tell them.
- Manifest V3 forbids inline `<script>` blocks (even `type="module"`) under the default CSP. Always use external script files.
- Add a one-line entry to `CHANGELOG.md` under `## Unreleased` for every user-visible change. Use past tense, link the PR number. Skip docs-only edits, internal refactors with no behavior change, test-only changes, and tooling tweaks (`.gitignore`, `package.json` scripts, etc.).

## Out of scope

These have been intentionally declined; don't add them without an explicit request:

- Recurring tasks, projects/folders, nested lists, search.
- Daily notifications / calendar integration / natural-language date parsing.
- Bundled markdown libraries (marked, markdown-it, etc.) — hand-rolled parser stays.
- New-tab override or browser-action popup — the user explicitly removed both.
