/**
 * The in-app changelog: CHANGELOG.md is the single source (also what
 * GitHub shows). Vite inlines it at build time via ?raw; a deliberately
 * tiny renderer handles just the markdown that file uses — headings,
 * bullet lists (with wrapped lines), paragraphs (with wrapped lines),
 * links, bold, code spans. Anything fancier belongs in the file only if
 * this renderer learns it first.
 */
import changelogText from "../../CHANGELOG.md?raw";
import { onUiModalOpen } from "@ui/emulator-ui.js";

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s) {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
}

export function renderChangelogHtml(md) {
  const out = [];
  let items = null; // open <ul> item list, last entry may absorb wraps
  let para = null; // open <p> lines, joined with a space on close
  let atStart = true; // true until the first non-blank line is seen

  const closeList = () => {
    if (items) {
      out.push("<ul>" + items.map((i) => `<li>${i}</li>`).join("") + "</ul>");
      items = null;
    }
  };
  const closePara = () => {
    if (para) {
      out.push(`<p>${para.join(" ")}</p>`);
      para = null;
    }
  };

  for (const raw of md.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const h = line.match(/^(#{1,3}) (.*)$/);
    const li = line.match(/^- (.*)$/);
    if (h) {
      closeList();
      closePara();
      // The modal chrome already renders its own <h2> title, so a single
      // leading level-1 heading (CHANGELOG.md's own `# Changelog`) would
      // otherwise double it up — skip just that one. Deeper headings (and
      // any level-1 heading that isn't the document's very first line)
      // keep the existing level+1 mapping.
      const skipLeadingTitle = atStart && h[1] === "#";
      atStart = false;
      if (!skipLeadingTitle) {
        const level = h[1].length + 1; // # -> h2 ... ### -> h4 (modal owns h1)
        out.push(`<h${level}>${inline(escapeHtml(h[2]))}</h${level}>`);
      }
    } else if (li) {
      atStart = false;
      closePara();
      if (!items) items = [];
      items.push(inline(escapeHtml(li[1])));
    } else if (items && /^\s+\S/.test(line)) {
      items[items.length - 1] += " " + inline(escapeHtml(line.trim()));
    } else if (line === "") {
      closeList();
      closePara();
    } else {
      atStart = false;
      closeList();
      if (!para) para = [];
      para.push(inline(escapeHtml(line.trim())));
    }
  }
  closeList();
  closePara();
  return out.join("\n");
}

export function initChangelog() {
  const modal = document.getElementById("changelog-modal");
  const body = document.getElementById("changelog-modal-body");
  const openBtn = document.getElementById("status-bar-changelog");
  const closeBtn = document.getElementById("changelog-modal-close");
  if (!modal || !body || !openBtn || !closeBtn) return;

  let rendered = false;
  const open = () => {
    if (!rendered) {
      body.innerHTML = renderChangelogHtml(changelogText);
      rendered = true;
    }
    modal.style.display = "block";
    // The emulator owns the key matrix; tell it a modal just covered
    // the screen so a key the user was mid-holding doesn't stay stuck
    // down for the rest of the session (same cleanup as losing window
    // focus) — see onUiModalOpen in emulator-ui.js.
    onUiModalOpen();
    closeBtn.focus();
  };
  const close = () => {
    modal.style.display = "none";
  };

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.style.display === "block") close();
  });
}
