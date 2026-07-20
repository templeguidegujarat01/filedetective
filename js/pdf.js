/* =========================================================
   FileDetective — PDF Analysis Module
   Parses PDF structure directly from bytes using no external
   library, since the project avoids dependencies where
   possible. Reads the header version, the Info dictionary,
   and encryption / page-count signals. Any field the parser
   cannot confidently locate is reported as not available
   rather than guessed.
   ========================================================= */

window.FD = window.FD || {};

(function () {
  'use strict';

  function bytesToLatin1String(bytes) {
    // PDF structural syntax (outside of streams) is ASCII/Latin-1 safe.
    let str = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      str += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return str;
  }

  function extractHeaderVersion(text) {
    const match = text.slice(0, 32).match(/%PDF-(\d+\.\d+)/);
    return match ? match[1] : null;
  }

  function extractInfoField(text, field) {
    // Matches: /Author (Some Text) or /Author <FEFF...>
    const literalRegex = new RegExp(`/${field}\\s*\\(([^)]*)\\)`);
    const literalMatch = text.match(literalRegex);
    if (literalMatch) return decodePdfLiteralString(literalMatch[1]);

    const hexRegex = new RegExp(`/${field}\\s*<([0-9A-Fa-f]+)>`);
    const hexMatch = text.match(hexRegex);
    if (hexMatch) return decodePdfHexString(hexMatch[1]);

    return null;
  }

  function decodePdfLiteralString(raw) {
    return raw
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .trim();
  }

  function decodePdfHexString(hex) {
    try {
      const clean = hex.replace(/\s/g, '');
      let out = '';
      for (let i = 0; i < clean.length; i += 2) {
        out += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
      }
      // Strip a UTF-16 BOM if present.
      return out.replace(/^\uFEFF/, '').trim();
    } catch (e) {
      return null;
    }
  }

  function countOccurrences(text, pattern) {
    const matches = text.match(pattern);
    return matches ? matches.length : 0;
  }

  function estimatePageCount(text) {
    const countMatch = text.match(/\/Count\s+(\d+)/);
    if (countMatch) return parseInt(countMatch[1], 10);

    const pageTypeCount = countOccurrences(text, /\/Type\s*\/Page[^s]/g);
    return pageTypeCount > 0 ? pageTypeCount : null;
  }

  function detectEncryption(text) {
    return /\/Encrypt\b/.test(text);
  }

  async function analyze(file) {
    const result = {};

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const text = bytesToLatin1String(bytes);

    const version = extractHeaderVersion(text);
    result['PDF version'] = version || 'Not available';

    const pageCount = estimatePageCount(text);
    result['Pages'] = pageCount != null ? String(pageCount) : 'Not available';

    result['Encrypted'] = detectEncryption(text) ? 'Yes' : 'No';

    const title = extractInfoField(text, 'Title');
    const author = extractInfoField(text, 'Author');
    const creator = extractInfoField(text, 'Creator');
    const producer = extractInfoField(text, 'Producer');

    result['Title'] = title || 'Not set';
    result['Author'] = author || 'Not set';
    result['Creator application'] = creator || 'Not available';
    result['Producer'] = producer || 'Not available';

    return result;
  }

  FD.pdf = { analyze };
})();
