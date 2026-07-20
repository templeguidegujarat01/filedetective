/* =========================================================
   FileDetective — Audio Analysis Module
   Extracts browser-accessible audio properties using the
   HTMLMediaElement and Web Audio APIs. Bitrate is estimated
   from file size and duration since browsers do not expose
   the encoded bitrate directly.
   ========================================================= */

window.FD = window.FD || {};

(function () {
  'use strict';

  function readDuration(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const audio = document.createElement('audio');
      audio.preload = 'metadata';

      const cleanup = () => URL.revokeObjectURL(url);

      audio.onloadedmetadata = () => {
        resolve(audio.duration);
        cleanup();
      };
      audio.onerror = () => {
        cleanup();
        reject(new Error('Could not read audio metadata.'));
      };
      audio.src = url;
    });
  }

  async function readChannelInfo(file) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;

      const arrayBuffer = await file.arrayBuffer();
      const ctx = new AudioContextClass();
      const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
      const info = {
        channels: decoded.numberOfChannels,
        sampleRate: decoded.sampleRate,
        duration: decoded.duration
      };
      ctx.close();
      return info;
    } catch (e) {
      return null;
    }
  }

  function formatDuration(seconds) {
    if (!isFinite(seconds) || seconds < 0) return 'Not available';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = h > 0 ? [h, m, s] : [m, s];
    return parts.map((p, i) => (i === 0 ? String(p) : String(p).padStart(2, '0'))).join(':');
  }

  async function analyze(file) {
    const result = {};

    let duration = null;
    try {
      duration = await readDuration(file);
    } catch (e) { /* fall through */ }

    const decoded = await readChannelInfo(file);
    if (decoded && !duration) duration = decoded.duration;

    result['Duration'] = duration != null ? formatDuration(duration) : 'Not available';
    result['Format'] = file.type || 'Not reported by browser';

    if (decoded) {
      result['Channels'] = decoded.channels === 1 ? 'Mono (1)' : decoded.channels === 2 ? 'Stereo (2)' : String(decoded.channels);
      result['Sample rate'] = `${decoded.sampleRate.toLocaleString()} Hz`;
    } else {
      result['Channels'] = 'Could not be determined';
      result['Sample rate'] = 'Could not be determined';
    }

    if (duration && duration > 0) {
      const estimatedBitrateKbps = Math.round((file.size * 8) / duration / 1000);
      result['Estimated bitrate'] = `${estimatedBitrateKbps.toLocaleString()} kbps (approximate)`;
    } else {
      result['Estimated bitrate'] = 'Not available';
    }

    return result;
  }

  FD.audio = { analyze };
})();
