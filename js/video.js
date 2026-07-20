/* =========================================================
   FileDetective — Video Analysis Module
   Extracts browser-accessible video properties using the
   HTMLMediaElement API. Frame rate is estimated via the
   requestVideoFrameCallback API where the browser supports
   it; otherwise it is reported as not available rather than
   guessed.
   ========================================================= */

window.FD = window.FD || {};

(function () {
  'use strict';

  function readVideoMetadata(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;

      const cleanup = () => URL.revokeObjectURL(url);

      video.onloadedmetadata = () => {
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration
        });
        cleanup();
      };
      video.onerror = () => {
        cleanup();
        reject(new Error('Could not read video metadata.'));
      };
      video.src = url;
    });
  }

  function estimateFrameRate(file, video) {
    return new Promise((resolve) => {
      if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype)) {
        resolve(null);
        return;
      }

      let frameCount = 0;
      let startTime = null;
      const sampleWindowMs = 600;
      const el = document.createElement('video');
      el.muted = true;
      el.src = URL.createObjectURL(file);

      const onFrame = (now, metadata) => {
        if (startTime === null) startTime = metadata.mediaTime;
        frameCount++;
        const elapsedMediaTime = metadata.mediaTime - startTime;
        if (elapsedMediaTime * 1000 < sampleWindowMs && frameCount < 60) {
          el.requestVideoFrameCallback(onFrame);
        } else {
          const fps = elapsedMediaTime > 0 ? frameCount / elapsedMediaTime : null;
          URL.revokeObjectURL(el.src);
          resolve(fps ? Math.round(fps) : null);
        }
      };

      el.addEventListener('loadeddata', () => {
        el.play().then(() => {
          el.requestVideoFrameCallback(onFrame);
        }).catch(() => resolve(null));
      });
      el.addEventListener('error', () => resolve(null));

      setTimeout(() => resolve(null), 2500);
    });
  }

  function formatDuration(seconds) {
    if (!isFinite(seconds) || seconds < 0) return 'Not available';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = h > 0 ? [h, m, s] : [m, s];
    return parts.map((p, i) => (i === 0 ? String(p) : String(p).padStart(2, '0'))).join(':');
  }

  function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
  }

  async function analyze(file) {
    const result = {};

    let meta;
    try {
      meta = await readVideoMetadata(file);
    } catch (e) {
      result['Duration'] = 'Could not be decoded by this browser';
      result['Format'] = file.type || 'Not reported by browser';
      return result;
    }

    result['Duration'] = formatDuration(meta.duration);

    if (meta.width && meta.height) {
      result['Resolution'] = `${meta.width} × ${meta.height} px`;
      const divisor = gcd(meta.width, meta.height) || 1;
      result['Aspect ratio'] = `${meta.width / divisor}:${meta.height / divisor}`;
    } else {
      result['Resolution'] = 'Not available';
    }

    result['Format'] = file.type || 'Not reported by browser';

    const fps = await estimateFrameRate(file);
    result['Estimated frame rate'] = fps ? `${fps} fps (approximate)` : 'Not available in this browser';

    return result;
  }

  FD.video = { analyze };
})();
