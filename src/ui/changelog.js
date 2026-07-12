/**
 * The in-app changelog: CHANGELOG.md is the single source (also what
 * GitHub shows). Vite inlines it at build time via ?raw; a deliberately
 * tiny renderer handles just the markdown that file uses — headings,
 * bullet lists (with wrapped lines), links, bold. Anything fancier
 * belongs in the file only if this renderer learns it first.
 */
import changelogText from "../../CHANGELOG.md?raw";

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
}

export function renderChangelogHtml(md) {
  const out = [];
  let items = null; // open <ul> item list, last entry may absorb wraps

  const closeList = () => {
    if (items) {
      out.push("<ul>" + items.map((i) => `<li>${i}</li>`).join("") + "</ul>");
      items = null;
    }
  };

  for (const raw of md.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const h = line.match(/^(#{1,3}) (.*)$/);
    const li = line.match(/^- (.*)$/);
    if (h) {
      closeList();
      const level = h[1].length + 1; // # -> h2 ... ### -> h4 (modal owns h1)
      out.push(`<h${level}>${inline(escapeHtml(h[2]))}</h${level}>`);
    } else if (li) {
      if (!items) items = [];
      items.push(inline(escapeHtml(li[1])));
    } else if (items && /^\s+\S/.test(line)) {
      items[items.length - 1] += " " + inline(escapeHtml(line.trim()));
    } else if (line === "") {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(escapeHtml(line))}</p>`);
    }
  }
  closeList();
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
