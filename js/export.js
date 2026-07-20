/* =========================================================
   FileDetective — Export Module
   Builds a branded, print-friendly standalone report and
   opens it in a new tab so the user can print or save as PDF
   using the browser's native print dialog. Architecture
   leaves room for future JSON / CSV export.
   ========================================================= */

window.FD = window.FD || {};

(function () {
  'use strict';

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function rowsToHTML(obj) {
    return Object.entries(obj).map(([label, value]) => `
      <tr>
        <td class="label">${escapeHTML(label)}</td>
        <td class="value">${escapeHTML(value)}</td>
      </tr>
    `).join('');
  }

  function flagsToHTML(flags) {
    return flags.map(f => `
      <div class="flag flag-${f.level}">
        <span class="tag">${escapeHTML(f.level)}</span>
        <div>
          <strong>${escapeHTML(f.title)}</strong>
          <p>${escapeHTML(f.detail)}</p>
        </div>
      </div>
    `).join('');
  }

  function buildReportHTML(data) {
    const generatedAt = new Date().toLocaleString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>FileDetective Report — ${escapeHTML(data.file.name)}</title>
<meta name="robots" content="noindex, nofollow">
<style>
  :root {
    --ink: #0B0E14;
    --muted: #5C6883;
    --border: #DDE2EC;
    --accent: #3E63A8;
    --safe: #1E8E5A;
    --warning: #B07600;
    --danger: #C23A3A;
    --info: #3E63A8;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    color: var(--ink);
    max-width: 820px;
    margin: 48px auto;
    padding: 0 32px;
    line-height: 1.5;
  }
  header.doc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid var(--ink);
    padding-bottom: 20px;
    margin-bottom: 28px;
  }
  .brand { font-family: 'Space Grotesk', Arial, sans-serif; font-weight: 700; font-size: 1.3rem; }
  .doc-meta { text-align: right; font-size: 0.8rem; color: var(--muted); }
  h1.filename { font-size: 1.4rem; margin: 0 0 4px; word-break: break-all; }
  .summary-badge {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 4px 12px;
    border-radius: 999px;
    margin-bottom: 32px;
  }
  .summary-safe { background: #E4F6EC; color: var(--safe); }
  .summary-warning { background: #FCF1DA; color: var(--warning); }
  .summary-danger { background: #FBE6E6; color: var(--danger); }
  section { margin-bottom: 30px; page-break-inside: avoid; }
  h2 {
    font-size: 0.95rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
    margin-bottom: 12px;
  }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 0.88rem; vertical-align: top; }
  td.label { color: var(--muted); width: 40%; }
  td.value { font-family: 'SFMono-Regular', Consolas, monospace; word-break: break-word; }
  .hash-block {
    font-family: 'SFMono-Regular', Consolas, monospace;
    font-size: 0.82rem;
    background: #F4F6FA;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px;
    word-break: break-all;
  }
  .flag { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
  .flag:last-child { border-bottom: none; }
  .flag p { margin: 2px 0 0; color: var(--muted); }
  .tag {
    flex-shrink: 0;
    font-size: 0.68rem;
    text-transform: uppercase;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 999px;
    height: fit-content;
  }
  .flag-safe .tag { background: #E4F6EC; color: var(--safe); }
  .flag-warning .tag { background: #FCF1DA; color: var(--warning); }
  .flag-danger .tag { background: #FBE6E6; color: var(--danger); }
  .flag-info .tag { background: #E7EDF9; color: var(--info); }
  footer.doc-footer {
    margin-top: 48px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    font-size: 0.75rem;
    color: var(--muted);
    display: flex;
    justify-content: space-between;
  }
  .print-hint {
    text-align: center;
    font-size: 0.8rem;
    color: var(--muted);
    margin-bottom: 24px;
  }
  @media print {
    .print-hint { display: none; }
    body { margin: 0; padding: 0 8mm; }
  }
</style>
</head>
<body>
  <p class="print-hint">Use your browser's Print dialog (Ctrl/Cmd + P) and choose "Save as PDF" to export this report.</p>

  <header class="doc-header">
    <span class="brand">FileDetective</span>
    <span class="doc-meta">Report generated<br>${escapeHTML(generatedAt)}</span>
  </header>

  <h1 class="filename">${escapeHTML(data.file.name)}</h1>
  <span class="summary-badge summary-${data.security.overall.level}">${escapeHTML(data.security.overall.label)}</span>

  <section>
    <h2>General information</h2>
    <table>${rowsToHTML(data.general)}</table>
  </section>

  <section>
    <h2>Security</h2>
    ${flagsToHTML(data.security.flags)}
  </section>

  ${data.metadata ? `
  <section>
    <h2>Metadata</h2>
    <table>${rowsToHTML(data.metadata)}</table>
  </section>
  ` : ''}

  <section>
    <h2>Hash — SHA-256</h2>
    <div class="hash-block">${data.hash ? escapeHTML(data.hash) : 'Could not be computed'}</div>
  </section>

  <footer class="doc-footer">
    <span>FileDetective — Report version 1.0</span>
    <span>Generated locally · No data was uploaded</span>
  </footer>
</body>
</html>`;
  }

  function exportReport(data) {
    const html = buildReportHTML(data);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'noopener,noreferrer');

    if (!win) {
      FD.showToast && FD.showToast('Enable pop-ups to export the report');
      URL.revokeObjectURL(url);
      return;
    }

    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  FD.exportReport = exportReport;
  FD.export = { buildReportHTML, exportReport };
})();
