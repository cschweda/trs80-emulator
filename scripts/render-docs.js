#!/usr/bin/env node
/**
 * Render markdown design documents to HTML
 * Outputs to public/docs/ for inclusion in the built site
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve, join, extname, basename } from "path";
import { marked } from "marked";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const docsDir = resolve(projectRoot, "docs");
const outputDir = resolve(projectRoot, "public");

// Configure marked for better HTML output
marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: true,
  mangle: false,
});

// HTML template for rendered markdown
function createHTMLTemplate(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - TRS-80 Emulator</title>
  <style>
    html {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background: #1a1a1a;
      color: #e0e0e0;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      overflow-y: auto;
      overflow-x: hidden;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #4CAF50;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    h1 {
      border-bottom: 2px solid #4CAF50;
      padding-bottom: 0.3em;
    }
    h2 {
      border-bottom: 1px solid #333;
      padding-bottom: 0.3em;
    }
    code {
      background: #2a2a2a;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      color: #ff6b6b;
    }
    pre {
      background: #2a2a2a;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      border-left: 4px solid #4CAF50;
    }
    pre code {
      background: transparent;
      padding: 0;
      color: #e0e0e0;
    }
    a {
      color: #4CAF50;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    blockquote {
      border-left: 4px solid #4CAF50;
      margin: 0;
      padding-left: 20px;
      color: #b0b0b0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #333;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #2a2a2a;
      color: #4CAF50;
    }
    tr:nth-child(even) {
      background: #222;
    }
    .back-link {
      display: inline-block;
      margin-bottom: 20px;
      padding: 8px 16px;
      background: #4CAF50;
      color: #000;
      border-radius: 4px;
      font-weight: bold;
    }
    .back-link:hover {
      background: #45a049;
      text-decoration: none;
    }
    hr {
      border: none;
      border-top: 1px solid #333;
      margin: 2em 0;
    }
  </style>
  <script>
    // Detect if we're in an iframe
    const isInIframe = window.self !== window.top;
    
    // Handle back link based on context
    function handleBackLink(event) {
      if (isInIframe) {
        // If in iframe, try to close the design doc in parent window
        event.preventDefault();
        try {
          if (window.parent && typeof window.parent.hideDesignDoc === 'function') {
            window.parent.hideDesignDoc();
          } else {
            // Fallback: try to navigate parent to root
            window.parent.location.href = window.parent.location.origin + window.parent.location.pathname.replace(/\\/[^\\/]*$/, '') + '/';
          }
        } catch (e) {
          // Cross-origin or other error - open in new window
          window.open('/', '_blank');
        }
      }
      // If not in iframe, normal link behavior (no preventDefault)
    }
    
    // Hide back link when in iframe (since parent has close button)
    window.addEventListener('DOMContentLoaded', function() {
      const backLink = document.querySelector('.back-link');
      const footerLinks = document.querySelectorAll('p a[href="/"]');
      
      if (isInIframe) {
        // Hide the back link when in iframe
        if (backLink) {
          backLink.style.display = 'none';
        }
        // Update footer links to open in new window
        footerLinks.forEach(link => {
          link.addEventListener('click', function(e) {
            e.preventDefault();
            window.open('/', '_blank');
          });
        });
      } else {
        // Not in iframe - add click handler to back link
        if (backLink) {
          backLink.addEventListener('click', handleBackLink);
        }
      }
    });
  </script>
</head>
<body>
  <a href="/" class="back-link">← Back to Emulator</a>
  ${content}
  <hr>
  <p style="text-align: center; color: #666;">
    <a href="/">TRS-80 Model III Emulator</a> | 
    <a href="https://github.com/cschweda/trs80-emulator">GitHub</a>
  </p>
</body>
</html>`;
}

// Process a single markdown file
function renderMarkdownFile(filePath, outputPath) {
  try {
    const content = readFileSync(filePath, "utf-8");
    const html = marked.parse(content);
    const title = basename(filePath, extname(filePath))
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    const fullHTML = createHTMLTemplate(title, html);
    writeFileSync(outputPath, fullHTML, "utf-8");
    console.log(`✅ Rendered: ${basename(filePath)} → ${basename(outputPath)}`);
  } catch (error) {
    console.error(`❌ Error rendering ${filePath}:`, error.message);
  }
}

// Main function
function renderDocs() {
  // Create output directory
  mkdirSync(outputDir, { recursive: true });

  // Find all markdown files in docs directory
  const files = readdirSync(docsDir);
  const markdownFiles = files.filter(
    (file) => extname(file).toLowerCase() === ".md"
  );

  if (markdownFiles.length === 0) {
    console.log("⚠️  No markdown files found in docs/");
    return;
  }

  console.log(`📄 Found ${markdownFiles.length} markdown file(s) to render\n`);

  // Render each markdown file
  markdownFiles.forEach((file) => {
    const inputPath = join(docsDir, file);
    const outputFileName = basename(file, extname(file)) + ".html";
    const outputPath = join(outputDir, outputFileName);
    renderMarkdownFile(inputPath, outputPath);
  });

  console.log(`\n✨ Rendered ${markdownFiles.length} document(s) to public/`);
}

// Run if called directly
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  renderDocs();
} else {
  // Also run if this is the main module
  const isMainModule =
    process.argv[1] &&
    import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
  if (isMainModule || !process.argv[1]) {
    renderDocs();
  }
}

export { renderDocs };
