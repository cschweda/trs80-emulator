/**
 * The in-app changelog: the real CHANGELOG.md must render, and it must
 * mention the version we're shipping — a release without a changelog
 * entry fails here.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { renderChangelogHtml } from "@ui/changelog.js";

const changelogText = fs.readFileSync(
  path.resolve(process.cwd(), "CHANGELOG.md"),
  "utf8"
);
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")
);

describe("renderChangelogHtml", () => {
  it("renders headings, lists, links, and bold", () => {
    const html = renderChangelogHtml(
      "# T\n\n## [1.0.0] - 2026-01-01\n\n### Added\n\n- one **bold** [link](https://x.example/)\n- two\n"
    );
    expect(html).toContain("<h3>[1.0.0] - 2026-01-01</h3>");
    expect(html).toContain("<h4>Added</h4>");
    expect(html).toContain("<ul>");
    expect(html).toContain(
      '<li>one <strong>bold</strong> <a href="https://x.example/" target="_blank" rel="noopener">link</a></li>'
    );
    expect(html).toContain("<li>two</li>");
  });

  it("escapes HTML in the source", () => {
    const html = renderChangelogHtml("- <script>alert(1)</script>\n");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("joins wrapped list-item lines", () => {
    const html = renderChangelogHtml("- first line\n  continues here\n");
    expect(html).toContain("<li>first line continues here</li>");
  });

  it("skips a single leading level-1 heading (the modal chrome already shows a title)", () => {
    const html = renderChangelogHtml(
      "# Changelog\n\n## [1.0.0] - 2026-01-01\n\n### Added\n\n- one\n"
    );
    expect(html).not.toContain("<h2>");
    expect(html).not.toContain("Changelog</h");
    expect(html).toContain("<h3>[1.0.0] - 2026-01-01</h3>");
    expect(html).toContain("<h4>Added</h4>");
  });

  it("joins consecutive plain-text lines into one paragraph", () => {
    const html = renderChangelogHtml(
      "All notable changes\nare documented here.\n\n## [1.0.0] - 2026-01-01\n"
    );
    expect(html).toContain("<p>All notable changes are documented here.</p>");
    expect(html).not.toContain("<p>All notable changes</p>");
  });

  it("renders backticked code spans", () => {
    const html = renderChangelogHtml(
      "- see `scripts/build-cas.js` for details\n"
    );
    expect(html).toContain(
      "<li>see <code>scripts/build-cas.js</code> for details</li>"
    );
  });

  it("does not linkify non-http(s) URL schemes", () => {
    const html = renderChangelogHtml("- [x](javascript:alert(1))\n");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("javascript:alert(1)\"");
    expect(html).toContain("[x](javascript:alert(1))");
  });

  it("renders the real CHANGELOG.md and mentions the current version", () => {
    const html = renderChangelogHtml(changelogText);
    expect(html).toContain(pkg.version);
    expect(html).toContain("<h3>");
  });
});
