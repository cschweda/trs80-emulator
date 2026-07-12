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
    expect(html).toContain("<h2>");
    expect(html).toContain("<h3>[1.0.0] - 2026-01-01</h3>");
    expect(html).toContain("<h4>Added</h4>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one <strong>bold</strong> ");
    expect(html).toContain('<a href="https://x.example/"');
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

  it("renders the real CHANGELOG.md and mentions the current version", () => {
    const html = renderChangelogHtml(changelogText);
    expect(html).toContain(pkg.version);
    expect(html).toContain("<h3>");
  });
});
