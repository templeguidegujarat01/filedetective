/* =========================================================
   FileDetective — Hash Module
   Computes cryptographic hashes using the Web Crypto API.
   Architecture supports adding SHA-1 / SHA-512 / MD5 later
   by extending the `algorithms` map below.
   ========================================================= */

window.FD = window.FD || {};

(function () {
  'use strict';

  const algorithms = {
    'SHA-256': 'SHA-256'
  };

  function bufferToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  async function digest(file, algorithmName) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API is not available in this browser.');
    }
    const algo = algorithms[algorithmName];
    if (!algo) {
      throw new Error(`Unsupported algorithm: ${algorithmName}`);
    }
    const buffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest(algo, buffer);
    return bufferToHex(hashBuffer);
  }

  FD.hash = {
    sha256: (file) => digest(file, 'SHA-256'),
    digest,
    supportedAlgorithms: () => Object.keys(algorithms)
  };
})();
