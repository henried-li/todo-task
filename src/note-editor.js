import { el } from "./dom.js";

function wrapSelection(ta, before, after, placeholder) {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end);
  const inner = selected || placeholder;
  ta.setRangeText(before + inner + after, start, end, "end");
  if (!selected) {
    ta.selectionStart = start + before.length;
    ta.selectionEnd = start + before.length + placeholder.length;
  }
}

function expandToLines(ta) {
  const { selectionStart, selectionEnd, value } = ta;
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  let lineEnd = value.indexOf("\n", selectionEnd);
  if (lineEnd === -1) lineEnd = value.length;
  return { lineStart, lineEnd, block: value.slice(lineStart, lineEnd) };
}

function prefixLines(ta, prefix) {
  const { lineStart, lineEnd, block } = expandToLines(ta);
  const out = block.split("\n").map(l => prefix + l).join("\n");
  ta.setRangeText(out, lineStart, lineEnd, "end");
}

function prefixLinesNumbered(ta) {
  const { lineStart, lineEnd, block } = expandToLines(ta);
  const out = block.split("\n").map((l, i) => `${i + 1}. ${l}`).join("\n");
  ta.setRangeText(out, lineStart, lineEnd, "end");
}

function prefixLineHeading(ta) {
  const { lineStart, lineEnd, block } = expandToLines(ta);
  const lines = block.split("\n");
  const out = lines.map(l => /^#{1,3}\s/.test(l) ? l.replace(/^#{1,3}\s/, "") : `## ${l}`).join("\n");
  ta.setRangeText(out, lineStart, lineEnd, "end");
}

function insertCode(ta) {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end);
  if (selected.includes("\n")) {
    ta.setRangeText("```\n" + selected + "\n```", start, end, "end");
  } else {
    wrapSelection(ta, "`", "`", "code");
  }
}

function insertLink(ta) {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end);
  const text = selected || "text";
  ta.setRangeText(`[${text}](url)`, start, end, "end");
  const urlStart = start + text.length + 3;
  ta.selectionStart = urlStart;
  ta.selectionEnd = urlStart + 3;
}

function buildToolbar(ta) {
  const bar = el("div", { class: "note-toolbar" });
  bar.addEventListener("mousedown", e => e.preventDefault());

  const btn = (label, title, action) => el("button", {
    class: "note-tb-btn",
    type: "button",
    title,
    onmousedown: e => e.preventDefault(),
    onclick: () => { action(); ta.focus(); }
  }, label);

  bar.appendChild(btn("B", "Bold (Cmd+B)", () => wrapSelection(ta, "**", "**", "bold")));
  bar.appendChild(btn("I", "Italic (Cmd+I)", () => wrapSelection(ta, "*", "*", "italic")));
  bar.appendChild(btn("H", "Heading", () => prefixLineHeading(ta)));
  bar.appendChild(btn("•", "Bulleted list", () => prefixLines(ta, "- ")));
  bar.appendChild(btn("1.", "Numbered list", () => prefixLinesNumbered(ta)));
  bar.appendChild(btn("</>", "Code", () => insertCode(ta)));
  bar.appendChild(btn("🔗", "Link (Cmd+K)", () => insertLink(ta)));
  return bar;
}

export function openNoteEditor(task, mountNode, onCommit, onCancel) {
  const textarea = el("textarea", {
    class: "note-textarea",
    placeholder: "Markdown supported · Cmd+Enter to save · Esc to cancel",
    spellcheck: "true"
  });
  textarea.value = task.note || "";

  let settled = false;
  const commit = () => {
    if (settled) return;
    settled = true;
    onCommit(textarea.value.trim());
  };
  const cancel = () => {
    if (settled) return;
    settled = true;
    onCancel();
  };

  textarea.addEventListener("keydown", e => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    } else if (mod && e.key.toLowerCase() === "b") {
      e.preventDefault();
      wrapSelection(textarea, "**", "**", "bold");
    } else if (mod && e.key.toLowerCase() === "i") {
      e.preventDefault();
      wrapSelection(textarea, "*", "*", "italic");
    } else if (mod && e.key.toLowerCase() === "k") {
      e.preventDefault();
      insertLink(textarea);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const start = textarea.selectionStart;
      textarea.setRangeText("  ", start, textarea.selectionEnd, "end");
    }
  });
  textarea.addEventListener("blur", commit);

  const toolbar = buildToolbar(textarea);
  const editor = el("div", { class: "note-editor" }, [toolbar, textarea]);
  editor.addEventListener("click", e => e.stopPropagation());
  editor.addEventListener("dragstart", e => { e.preventDefault(); e.stopPropagation(); });

  mountNode.replaceWith(editor);
  textarea.focus();
  if (textarea.value) {
    textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
  }
}
