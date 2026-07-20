/* =========================================================
   FileDetective — Image Analysis Module
   Extracts browser-accessible image metadata.
   Never fabricates data the browser cannot expose (e.g. EXIF
   camera details) — architecture is ready to add that later
   via a dedicated binary EXIF parser.
   ========================================================= */

window.FD = window.FD || {};

(function () {
  'use strict';

  function readImageDimensions(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not decode image.'));
      };
      img.src = url;
    });
  }

  function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
  }

  function aspectRatio(width, height) {
    const divisor = gcd(width, height) || 1;
    return `${width / divisor}:${height / divisor}`;
  }

  async function detectTransparency(file) {
    // Only PNG, GIF, WEBP, and SVG can meaningfully carry transparency.
    const transparencyCapable = ['image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!transparencyCapable.includes(file.type)) return 'Not applicable';

    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const sampleSize = 64;
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(bitmap, 0, 0, sampleSize, sampleSize);
      const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          bitmap.close();
          return 'Yes';
        }
      }
      bitmap.close();
      return 'No';
    } catch (e) {
      return 'Could not be determined';
    }
  }

  async function analyze(file) {
    const result = {};

    let dims;
    try {
      dims = await readImageDimensions(file);
    } catch (e) {
      dims = null;
    }

    if (dims) {
      result['Dimensions'] = `${dims.width} × ${dims.height} px`;
      result['Aspect ratio'] = aspectRatio(dims.width, dims.height);
      result['Orientation'] = dims.width === dims.height
        ? 'Square'
        : dims.width > dims.height ? 'Landscape' : 'Portrait';
      const megapixels = (dims.width * dims.height) / 1_000_000;
      result['Estimated megapixels'] = `${megapixels.toFixed(2)} MP`;
    } else {
      result['Dimensions'] = 'Could not be decoded by this browser';
    }

    result['Transparency'] = await detectTransparency(file);
    result['Format'] = file.type || 'Not reported by browser';

    return result;
  }

  FD.image = { analyze };
})();
