/* =========================================================
   FileDetective — Core Application Logic
   Handles UI wiring, file intake, orchestration of analysis
   modules, and report rendering.
   ========================================================= */

window.FD = window.FD || {};

(function () {
  'use strict';

  /* ---------------------------------------------------------
     Utilities
  --------------------------------------------------------- */

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / Math.pow(1024, i);
    return `${i === 0 ? bytes : value.toFixed(2)} ${units[i]}`;
  }

  function formatDate(date) {
    if (!date || isNaN(date.getTime())) return 'Not available';
    return date.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function categorizeFile(file) {
    const type = file.type || '';
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    if (type.startsWith('image/') || ['svg', 'ico', 'bmp', 'tiff', 'webp'].includes(ext)) return 'image';
    if (type === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(ext)) return 'audio';
    if (type.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
    if (ext === 'json' || type === 'application/json') return 'json';
    if (ext === 'xml' || type === 'application/xml' || type === 'text/xml') return 'xml';
    if (ext === 'html' || ext === 'htm') return 'html';
    if (['txt', 'md', 'csv', 'css', 'js', 'rtf'].includes(ext) || type.startsWith('text/')) return 'text';
    if (['exe', 'dll', 'msi', 'apk', 'ipa'].includes(ext)) return 'executable';
    return 'unknown';
  }

  const EXECUTABLE_EXTS = ['exe', 'dll', 'msi', 'bat', 'cmd', 'com', 'scr', 'apk', 'ipa', 'sh', 'ps1', 'jar'];
  const COMMON_EXTS = [
    'png','jpg','jpeg','gif','webp','bmp','svg','ico','tiff','pdf','txt','csv','json',
    'xml','html','htm','css','js','md','rtf','mp3','wav','ogg','aac','flac','mp4','webm',
    'mov','avi','mkv','zip','rar','7z','doc','docx','xls','xlsx','ppt','pptx'
  ];

  /* ---------------------------------------------------------
     Header: scroll shadow + active link + mobile menu
  --------------------------------------------------------- */

  const header = $('#siteHeader');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });

  const menuToggle = $('#menuToggle');
  const mobileNav = $('#mobileNav');
  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!expanded));
    mobileNav.classList.toggle('open', !expanded);
  });
  $$('.mobile-nav .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      mobileNav.classList.remove('open');
    });
  });

  const sections = $$('main section[id]');
  const navLinks = $$('.nav-link');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px' });
  sections.forEach(section => sectionObserver.observe(section));

  /* ---------------------------------------------------------
     Reveal on scroll
  --------------------------------------------------------- */

  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  $$('.feature-card, .step, .privacy-item').forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });

  /* ---------------------------------------------------------
     Accordion (FAQ)
  --------------------------------------------------------- */

  $$('.accordion-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const panel = document.getElementById(trigger.getAttribute('aria-controls'));
      const item = trigger.closest('.accordion-item');
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';

      trigger.setAttribute('aria-expanded', String(!isOpen));
      item.classList.toggle('open', !isOpen);

      if (!isOpen) {
        panel.style.maxHeight = panel.scrollHeight + 'px';
      } else {
        panel.style.maxHeight = '0px';
      }
    });
  });

  /* ---------------------------------------------------------
     Toast
  --------------------------------------------------------- */

  const toast = $('#toast');
  let toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
  }
  FD.showToast = showToast;

  /* ---------------------------------------------------------
     File intake: dropzone, input, drag & drop
  --------------------------------------------------------- */

  const dropZone = $('#dropZone');
  const fileInput = $('#fileInput');
  const dropContent = $('#dropContent');
  const dropProcessing = $('#dropProcessing');
  const processingLabel = $('#processingLabel');
  const reportSection = $('#reportSection');
  const reportGrid = $('#reportGrid');
  const reportFilename = $('#reportFilename');
  const newFileBtn = $('#newFileBtn');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      handleFile(fileInput.files[0]);
    }
  });

  ['dragenter', 'dragover'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'dragend'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  newFileBtn.addEventListener('click', () => {
    reportSection.hidden = true;
    fileInput.value = '';
    dropZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => fileInput.click(), 400);
  });

  function setProcessing(isProcessing, label) {
    dropContent.hidden = isProcessing;
    dropProcessing.hidden = !isProcessing;
    if (label) processingLabel.textContent = label;
  }

  /* ---------------------------------------------------------
     Main analysis pipeline
  --------------------------------------------------------- */

  let currentReportData = null;
  FD.getCurrentReport = () => currentReportData;

  async function handleFile(file) {
    dropZone.classList.remove('has-error');
    setProcessing(true, 'Reading file…');

    try {
      const category = categorizeFile(file);

      setProcessing(true, 'Computing hash…');
      const hash = await FD.hash.sha256(file).catch(() => null);

      setProcessing(true, 'Extracting metadata…');
      const metadata = await extractMetadata(file, category);

      setProcessing(true, 'Running security checks…');
      const security = runSecurityChecks(file, category);

      const general = buildGeneralInfo(file, category);

      currentReportData = { file, category, general, security, metadata, hash };

      renderReport(currentReportData);

      setProcessing(false);
      reportSection.hidden = false;

      requestAnimationFrame(() => {
        reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      showToast('Analysis complete');
    } catch (err) {
      setProcessing(false);
      dropZone.classList.add('has-error');
      showToast('Could not analyze this file');
    }
  }

  async function extractMetadata(file, category) {
    try {
      if (category === 'image' && FD.image) return await FD.image.analyze(file);
      if (category === 'pdf' && FD.pdf) return await FD.pdf.analyze(file);
      if (category === 'audio' && FD.audio) return await FD.audio.analyze(file);
      if (category === 'video' && FD.video) return await FD.video.analyze(file);
      if (['text', 'json', 'xml', 'html'].includes(category)) return await analyzeTextLike(file, category);
    } catch (e) {
      return null;
    }
    return null;
  }

  async function analyzeTextLike(file, category) {
    const text = await file.text();
    const lines = text.split(/\r\n|\r|\n/);
    const words = text.trim().length ? text.trim().split(/\s+/) : [];
    const base = {
      'Characters': text.length.toLocaleString(),
      'Words': words.length.toLocaleString(),
      'Lines': lines.length.toLocaleString(),
      'Encoding (estimated)': 'UTF-8'
    };

    if (category === 'json') {
      try {
        const parsed = JSON.parse(text);
        base['Valid JSON'] = 'Yes';
        base['Root type'] = Array.isArray(parsed) ? 'Array' : typeof parsed;
        base['Node count'] = String(countJSONNodes(parsed));
      } catch (e) {
        base['Valid JSON'] = 'No';
      }
    }

    if (category === 'xml') {
      try {
        const doc = new DOMParser().parseFromString(text, 'application/xml');
        const errorNode = doc.querySelector('parsererror');
        base['Valid XML'] = errorNode ? 'No' : 'Yes';
        if (!errorNode) {
          base['Root element'] = doc.documentElement ? doc.documentElement.tagName : 'Not available';
          base['Element count'] = String(doc.getElementsByTagName('*').length);
        }
      } catch (e) {
        base['Valid XML'] = 'No';
      }
    }

    if (category === 'html') {
      try {
        const doc = new DOMParser().parseFromString(text, 'text/html');
        base['Title'] = doc.title || 'Not set';
        base['Meta tags'] = String(doc.querySelectorAll('meta').length);
        base['Links'] = String(doc.querySelectorAll('a').length);
        base['Images'] = String(doc.querySelectorAll('img').length);
        base['Scripts'] = String(doc.querySelectorAll('script').length);
        base['Stylesheets'] = String(doc.querySelectorAll('link[rel="stylesheet"], style').length);
      } catch (e) { /* leave base as-is */ }
    }

    return base;
  }

  function countJSONNodes(value) {
    if (value === null || typeof value !== 'object') return 1;
    let count = 1;
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        count += countJSONNodes(value[key]);
      }
    }
    return count;
  }

  function buildGeneralInfo(file, category) {
    const ext = (file.name.split('.').pop() || 'none').toLowerCase();
    return {
      'File name': file.name,
      'Extension': ext ? `.${ext}` : 'None',
      'Category': category.charAt(0).toUpperCase() + category.slice(1),
      'MIME type': file.type || 'Not reported by browser',
      'Size': formatBytes(file.size),
      'Bytes': file.size.toLocaleString(),
      'Last modified': formatDate(new Date(file.lastModified))
    };
  }

  function runSecurityChecks(file, category) {
    const flags = [];
    const nameParts = file.name.split('.');
    const ext = (nameParts.pop() || '').toLowerCase();
    const secondExt = nameParts.length > 1 ? (nameParts.pop() || '').toLowerCase() : null;

    let overall = { level: 'safe', label: 'No issues detected' };

    if (secondExt && EXECUTABLE_EXTS.includes(ext) && COMMON_EXTS.includes(secondExt)) {
      flags.push({
        level: 'danger',
        title: 'Double extension detected',
        detail: `Filename ends in .${secondExt}.${ext} — a pattern sometimes used to disguise executables.`
      });
      overall = { level: 'danger', label: 'Review before opening' };
    }

    if (EXECUTABLE_EXTS.includes(ext)) {
      flags.push({
        level: 'warning',
        title: 'Executable file type',
        detail: `Files with a .${ext} extension can run code on your system when opened.`
      });
      if (overall.level === 'safe') overall = { level: 'warning', label: 'Executable file' };
    }

    if (!ext) {
      flags.push({
        level: 'warning',
        title: 'No file extension',
        detail: 'This file has no extension, so its type cannot be confirmed from the name alone.'
      });
      if (overall.level === 'safe') overall = { level: 'warning', label: 'Unknown type' };
    } else if (!COMMON_EXTS.includes(ext) && !EXECUTABLE_EXTS.includes(ext)) {
      flags.push({
        level: 'info',
        title: 'Uncommon extension',
        detail: `.${ext} is not among the commonly analyzed formats. Metadata support may be limited.`
      });
    }

    if (file.size > 500 * 1024 * 1024) {
      flags.push({
        level: 'warning',
        title: 'Large file',
        detail: `At ${formatBytes(file.size)}, this file is large enough that browser analysis may be slow.`
      });
    }

    if (/[\u200B-\u200F\u202A-\u202E]/.test(file.name)) {
      flags.push({
        level: 'danger',
        title: 'Hidden Unicode characters in filename',
        detail: 'This filename contains invisible or directional characters, sometimes used to obscure the real extension.'
      });
      overall = { level: 'danger', label: 'Review before opening' };
    }

    if (flags.length === 0) {
      flags.push({
        level: 'safe',
        title: 'No filename or extension issues found',
        detail: 'This check only covers filename patterns — it is not malware scanning.'
      });
    }

    return { overall, flags };
  }

  /* ---------------------------------------------------------
     Rendering
  --------------------------------------------------------- */

  function badgeClass(level) {
    return { safe: 'badge-safe', warning: 'badge-warning', danger: 'badge-danger', info: 'badge-info' }[level] || 'badge-info';
  }

  function renderRows(obj) {
    return Object.entries(obj).map(([label, value]) => `
      <div class="report-row">
        <span class="report-row-label">${escapeHTML(label)}</span>
        <span class="report-row-value">${escapeHTML(value)}</span>
      </div>
    `).join('');
  }

  function renderReport(data) {
    reportFilename.textContent = data.file.name;

    const generalCard = `
      <div class="report-card">
        <h3 class="report-card-title">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 6H13M5 9H13M5 12H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          General information
        </h3>
        ${renderRows(data.general)}
      </div>
    `;

    const securityCard = `
      <div class="report-card">
        <h3 class="report-card-title">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L15 4.5V8.5C15 12 12.5 14.5 9 16C5.5 14.5 3 12 3 8.5V4.5L9 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
          Security
        </h3>
        <span class="badge ${badgeClass(data.security.overall.level)}" style="margin-bottom:16px;">${escapeHTML(data.security.overall.label)}</span>
        ${data.security.flags.map(f => `
          <div class="security-flag">
            <span class="badge ${badgeClass(f.level)}">${f.level}</span>
            <div>
              <strong style="font-size:0.85rem;">${escapeHTML(f.title)}</strong>
              <p>${escapeHTML(f.detail)}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    const metadataCard = data.metadata ? `
      <div class="report-card">
        <h3 class="report-card-title">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M9 5.5V9L11.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Metadata
        </h3>
        ${renderRows(data.metadata)}
      </div>
    ` : `
      <div class="report-card">
        <h3 class="report-card-title">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M9 5.5V9L11.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Metadata
        </h3>
        <p style="color:var(--text-muted); font-size:0.88rem;">No additional metadata is exposed by the browser for this file type.</p>
      </div>
    `;

    const hashCard = `
      <div class="report-card">
        <h3 class="report-card-title">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 3V15M8 3V15M12 6H3M13 12H4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          Hash
        </h3>
        <span class="badge badge-info" style="margin-bottom:12px;">SHA-256</span>
        <div class="hash-value">
          <span id="hashText" style="flex:1;">${data.hash ? escapeHTML(data.hash) : 'Could not be computed'}</span>
          ${data.hash ? '<button class="btn-copy" id="copyHashBtn" type="button">Copy</button>' : ''}
        </div>
      </div>
    `;

    reportGrid.innerHTML = generalCard + securityCard + metadataCard + hashCard;

    const copyBtn = $('#copyHashBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(data.hash);
          showToast('Hash copied to clipboard');
          const el = $('.hash-value');
          el.classList.add('copy-flash');
          setTimeout(() => el.classList.remove('copy-flash'), 650);
        } catch (e) {
          showToast('Could not copy — select the text manually');
        }
      });
    }
  }

  /* ---------------------------------------------------------
     Export button
  --------------------------------------------------------- */

  $('#exportBtn').addEventListener('click', () => {
    if (!currentReportData) return;
    if (FD.exportReport) {
      FD.exportReport(currentReportData);
    }
  });

  /* ---------------------------------------------------------
     Misc
  --------------------------------------------------------- */

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  FD.utils = { formatBytes, formatDate, escapeHTML, categorizeFile };
})();
