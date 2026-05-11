import { test } from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown } from "../src/markdown.js";

test("empty input returns empty string", () => {
  assert.equal(renderMarkdown(""), "");
  assert.equal(renderMarkdown(null), "");
  assert.equal(renderMarkdown(undefined), "");
});

test("plain paragraph wraps in <p>", () => {
  assert.equal(renderMarkdown("hello world"), "<p>hello world</p>");
});

test("headings h1/h2/h3", () => {
  assert.equal(renderMarkdown("# Title"), "<h1>Title</h1>");
  assert.equal(renderMarkdown("## Sub"), "<h2>Sub</h2>");
  assert.equal(renderMarkdown("### Smaller"), "<h3>Smaller</h3>");
});

test("bold and italic", () => {
  assert.equal(renderMarkdown("**bold**"), "<p><strong>bold</strong></p>");
  assert.equal(renderMarkdown("*italic*"), "<p><em>italic</em></p>");
  assert.equal(renderMarkdown("_italic_"), "<p><em>italic</em></p>");
  assert.equal(
    renderMarkdown("**bold** and *italic*"),
    "<p><strong>bold</strong> and <em>italic</em></p>"
  );
});

test("inline code", () => {
  assert.equal(renderMarkdown("`x = 1`"), "<p><code>x = 1</code></p>");
});

test("fenced code block", () => {
  const out = renderMarkdown("```\nlet x = 1;\nlet y = 2;\n```");
  assert.equal(out, "<pre><code>let x = 1;\nlet y = 2;</code></pre>");
});

test("unordered list", () => {
  assert.equal(
    renderMarkdown("- a\n- b\n- c"),
    "<ul><li>a</li><li>b</li><li>c</li></ul>"
  );
});

test("ordered list", () => {
  assert.equal(
    renderMarkdown("1. first\n2. second"),
    "<ol><li>first</li><li>second</li></ol>"
  );
});

test("markdown link opens in new tab with noopener", () => {
  const out = renderMarkdown("[Google](https://google.com)");
  assert.match(out, /<a href="https:\/\/google\.com"/);
  assert.match(out, /target="_blank"/);
  assert.match(out, /rel="noopener noreferrer"/);
  assert.match(out, />Google</);
});

test("bare URLs are autolinked and display as hostname", () => {
  const out = renderMarkdown("Check https://example.com out");
  assert.match(out, /<a href="https:\/\/example\.com"/);
  assert.match(out, /class="autolink"/);
  assert.match(out, /title="https:\/\/example\.com"/);
  assert.match(out, />example\.com<\/a>/);
});

test("autolink strips www. prefix from displayed hostname", () => {
  const out = renderMarkdown("see https://www.example.com/foo");
  assert.match(out, />example\.com<\/a>/);
  // full URL still preserved in href + title
  assert.match(out, /href="https:\/\/www\.example\.com\/foo"/);
});

test("long URL display collapses to just the hostname", () => {
  const out = renderMarkdown("https://doordash.slack.com/archives/C04LU23A27N/p1778368006860889");
  assert.match(out, />doordash\.slack\.com<\/a>/);
  assert.match(out, /href="https:\/\/doordash\.slack\.com\/archives\/C04LU23A27N\/p1778368006860889"/);
});

test("trailing punctuation is stripped from autolinks", () => {
  const out = renderMarkdown("Visit https://example.com.");
  // The . should be outside the <a>; display is hostname
  assert.match(out, /<a href="https:\/\/example\.com"[^>]*>example\.com<\/a>\./);
});

test("Wikipedia-style URL keeps trailing close-paren in href", () => {
  const out = renderMarkdown("See https://en.wikipedia.org/wiki/Foo_(bar) here");
  assert.match(out, /href="https:\/\/en\.wikipedia\.org\/wiki\/Foo_\(bar\)"/);
  assert.match(out, />en\.wikipedia\.org<\/a>/);
});

test("explicit [text](url) markdown link keeps the user-provided text and no autolink class", () => {
  const out = renderMarkdown("[Google](https://google.com)");
  assert.match(out, />Google<\/a>/);
  assert.doesNotMatch(out, /class="autolink"/);
});

test("HTML in source is escaped, not executed", () => {
  const out = renderMarkdown("<script>alert(1)</script>");
  assert.match(out, /&lt;script&gt;/);
  assert.match(out, /alert\(1\)/);
  assert.doesNotMatch(out, /<script>/);
});

test("javascript: URLs are neutralized", () => {
  const out = renderMarkdown("[click](javascript:alert(1))");
  assert.match(out, /href="#"/);
  assert.doesNotMatch(out, /href="javascript:/);
});

test("digits in body text are preserved (PUA placeholder regression)", () => {
  // Catches the bug where empty-string placeholders made the restore
  // regex match any digit in user text.
  assert.equal(renderMarkdown("Buy 3 milks"), "<p>Buy 3 milks</p>");
  assert.equal(renderMarkdown("Year 2026"), "<p>Year 2026</p>");
  assert.equal(renderMarkdown("alert(1)"), "<p>alert(1)</p>");
});

test("digit text survives alongside an autolinked URL", () => {
  const out = renderMarkdown("Buy 3 milks at https://shop.com");
  assert.match(out, />Buy 3 milks at /);
  assert.match(out, /<a href="https:\/\/shop\.com"/);
});

test("multiple paragraphs split on blank line", () => {
  const out = renderMarkdown("para one\n\npara two");
  assert.equal(out, "<p>para one</p><p>para two</p>");
});

test("single newline inside paragraph becomes <br>", () => {
  const out = renderMarkdown("line a\nline b");
  assert.equal(out, "<p>line a<br>line b</p>");
});

test("code regions are not parsed for further markdown", () => {
  const out = renderMarkdown("`**not bold**`");
  assert.equal(out, "<p><code>**not bold**</code></p>");
});

test("inline code with URLs is not autolinked", () => {
  const out = renderMarkdown("see `https://nope.com` later");
  assert.match(out, /<code>https:\/\/nope\.com<\/code>/);
  assert.doesNotMatch(out, /<a href/);
});
