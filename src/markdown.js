function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeHref(url) {
  const decoded = url.replace(/&amp;/g, "&");
  if (/^(https?:|mailto:|\/|\.\/|\.\.\/|#)/i.test(decoded)) return url;
  return "#";
}

function tokenize(src) {
  const lines = src.split("\n");
  const blocks = [];
  let buffer = [];
  const flush = () => {
    if (buffer.length > 0) {
      blocks.push({ type: "para", lines: buffer });
      buffer = [];
    }
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      flush();
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: "code", lines: code });
    } else if (line.trim() === "") {
      flush();
      i++;
    } else {
      buffer.push(line);
      i++;
    }
  }
  flush();
  return blocks;
}

// Placeholders use Unicode Private Use Area chars so they never collide
// with user-typed text. Inline parsing stashes HTML segments behind these
// markers, runs further regex passes on the rest of the text, then restores.
const PH_OPEN = "\uE000";
const PH_CLOSE = "\uE001";
const RESTORE_RE = new RegExp(PH_OPEN + "(\\d+)" + PH_CLOSE, "g");

function renderInline(s) {
  const stash = [];
  const place = (html) => {
    const idx = stash.length;
    stash.push(html);
    return PH_OPEN + idx + PH_CLOSE;
  };

  // 1. Inline code first (protect from further parsing)
  s = s.replace(/`([^`\n]+)`/g, (_, c) => place(`<code>${c}</code>`));

  // 2. Markdown links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) =>
    place(`<a href="${safeHref(u)}" target="_blank" rel="noopener noreferrer">${t}</a>`));

  // 3. Autolink bare URLs (http/https)
  s = s.replace(/\bhttps?:\/\/[^\s<>"]+/g, (url) => {
    let trail = "";
    while (/[.,;:!?]$/.test(url)) {
      trail = url.slice(-1) + trail;
      url = url.slice(0, -1);
    }
    return place(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`) + trail;
  });

  // 4. Bold then italic
  s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(?<![*\w])\*([^*\n]+)\*(?![*\w])/g, "<em>$1</em>");
  s = s.replace(/(?<![_\w])_([^_\n]+)_(?![_\w])/g, "<em>$1</em>");

  // Restore protected segments
  return s.replace(RESTORE_RE, (_, i) => stash[+i]);
}

function renderBlock(block) {
  if (block.type === "code") {
    return `<pre><code>${block.lines.join("\n")}</code></pre>`;
  }
  const lines = block.lines;
  if (lines.length === 1) {
    const m = lines[0].match(/^(#{1,3})\s+(.+)$/);
    if (m) {
      const level = m[1].length;
      return `<h${level}>${renderInline(m[2])}</h${level}>`;
    }
  }
  if (lines.every(l => /^[-*]\s+/.test(l))) {
    const items = lines.map(l => `<li>${renderInline(l.replace(/^[-*]\s+/, ""))}</li>`).join("");
    return `<ul>${items}</ul>`;
  }
  if (lines.every(l => /^\d+\.\s+/.test(l))) {
    const items = lines.map(l => `<li>${renderInline(l.replace(/^\d+\.\s+/, ""))}</li>`).join("");
    return `<ol>${items}</ol>`;
  }
  return `<p>${lines.map(renderInline).join("<br>")}</p>`;
}

export function renderMarkdown(src) {
  if (!src) return "";
  const escaped = escapeHtml(src);
  return tokenize(escaped).map(renderBlock).join("");
}
