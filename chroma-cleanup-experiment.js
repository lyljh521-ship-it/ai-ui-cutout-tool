(() => {
  "use strict";

  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const CLEAN_FLAG = Symbol("chromaCleanupInProgress");

  function isGreenSpill(r, g, b) {
    return g > 45 && g - Math.max(r, b) > 22 && g > r * 1.22 && g > b * 1.18;
  }

  function isMagentaSpill(r, g, b) {
    return r > 45 && b > 45 && Math.min(r, b) - g > 22 && r > g * 1.2 && b > g * 1.2;
  }

  function hasNearbyTransparency(alpha, w, h, x, y, radius) {
    for (let oy = -radius; oy <= radius; oy += 1) {
      const yy = y + oy;
      if (yy < 0 || yy >= h) continue;
      for (let ox = -radius; ox <= radius; ox += 1) {
        const xx = x + ox;
        if (xx < 0 || xx >= w) continue;
        if (alpha[yy * w + xx] < 235) return true;
      }
    }
    return false;
  }

  function neighborColor(data, alpha, w, h, x, y, spillType) {
    let rr = 0, gg = 0, bb = 0, weight = 0;
    for (let radius = 1; radius <= 5; radius += 1) {
      for (let oy = -radius; oy <= radius; oy += 1) {
        for (let ox = -radius; ox <= radius; ox += 1) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== radius) continue;
          const xx = x + ox, yy = y + oy;
          if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
          const p = yy * w + xx;
          if (alpha[p] < 80) continue;
          const i = p * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          if (spillType === "green" ? isGreenSpill(r, g, b) : isMagentaSpill(r, g, b)) continue;
          const localWeight = (alpha[p] / 255) / (1 + Math.hypot(ox, oy));
          rr += r * localWeight;
          gg += g * localWeight;
          bb += b * localWeight;
          weight += localWeight;
        }
      }
      if (weight > 1.8) break;
    }
    return weight ? [rr / weight, gg / weight, bb / weight] : null;
  }

  function cleanupCanvas(sourceCanvas) {
    const w = sourceCanvas.width, h = sourceCanvas.height;
    if (!w || !h || w * h > 30000000) return null;
    let sourceCtx;
    try {
      sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
      const probe = sourceCtx.getImageData(0, 0, w, h);
      let transparent = 0;
      for (let i = 3; i < probe.data.length; i += 16) if (probe.data[i] < 250) transparent += 1;
      if (transparent < probe.data.length / 4 / 80) return null;

      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      const outCtx = out.getContext("2d", { willReadFrequently: true });
      const image = probe;
      const original = new Uint8ClampedArray(image.data);
      const alpha = new Uint8Array(w * h);
      for (let p = 0; p < alpha.length; p += 1) alpha[p] = original[p * 4 + 3];

      let changed = 0;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const p = y * w + x;
          const a = alpha[p];
          if (a < 8 || !hasNearbyTransparency(alpha, w, h, x, y, 4)) continue;
          const i = p * 4;
          const r = original[i], g = original[i + 1], b = original[i + 2];
          const type = isGreenSpill(r, g, b) ? "green" : isMagentaSpill(r, g, b) ? "magenta" : "";
          if (!type) continue;
          const replacement = neighborColor(original, alpha, w, h, x, y, type);
          if (replacement) {
            const strength = Math.min(0.92, 0.48 + (255 - a) / 420);
            image.data[i] = r * (1 - strength) + replacement[0] * strength;
            image.data[i + 1] = g * (1 - strength) + replacement[1] * strength;
            image.data[i + 2] = b * (1 - strength) + replacement[2] * strength;
          } else if (type === "green") {
            image.data[i + 1] = Math.max(r, b) + 4;
          } else {
            const cap = g + 8;
            image.data[i] = Math.min(r, cap);
            image.data[i + 2] = Math.min(b, cap);
          }
          changed += 1;
        }
      }
      if (!changed) return null;
      outCtx.putImageData(image, 0, 0);
      return out;
    } catch (_) {
      return null;
    }
  }

  HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
    if (this[CLEAN_FLAG] || (type && type !== "image/png")) {
      return originalToBlob.call(this, callback, type, quality);
    }
    const cleaned = cleanupCanvas(this);
    if (!cleaned) return originalToBlob.call(this, callback, type, quality);
    cleaned[CLEAN_FLAG] = true;
    return originalToBlob.call(cleaned, callback, type || "image/png", quality);
  };

  HTMLCanvasElement.prototype.toDataURL = function (type, quality) {
    if (this[CLEAN_FLAG] || (type && type !== "image/png")) {
      return originalToDataURL.call(this, type, quality);
    }
    const cleaned = cleanupCanvas(this);
    if (!cleaned) return originalToDataURL.call(this, type, quality);
    cleaned[CLEAN_FLAG] = true;
    return originalToDataURL.call(cleaned, type || "image/png", quality);
  };
})();
