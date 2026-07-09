(function () {
  "use strict";

  const originalPutImageData = CanvasRenderingContext2D.prototype.putImageData;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

  function shouldRepair(imageData) {
    const data = imageData.data;
    let translucent = 0;
    let darkDamage = 0;
    const total = data.length / 4;

    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a > 0 && a < 250) translucent += 1;
      if (a > 40 && r < 38 && g < 38 && b < 38) darkDamage += 1;
    }

    return translucent > total * 0.002 || darkDamage > total * 0.0005;
  }

  function luminance(r, g, b) {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function isSuspiciousDark(data, idx) {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    return a > 35 && max < 48 && max - min < 22;
  }

  function repairImageData(imageData) {
    if (!imageData || !imageData.data || !shouldRepair(imageData)) return imageData;

    const width = imageData.width;
    const height = imageData.height;
    const src = new Uint8ClampedArray(imageData.data);
    const dst = imageData.data;

    const radius = 2;
    const minGoodNeighbors = 5;

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const idx = (y * width + x) * 4;
        if (!isSuspiciousDark(src, idx)) continue;

        let count = 0;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let sumA = 0;
        let brightEnough = 0;
        let similarDark = 0;

        for (let oy = -radius; oy <= radius; oy += 1) {
          for (let ox = -radius; ox <= radius; ox += 1) {
            if (ox === 0 && oy === 0) continue;
            const nx = x + ox;
            const ny = y + oy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const nIdx = (ny * width + nx) * 4;
            const nr = src[nIdx];
            const ng = src[nIdx + 1];
            const nb = src[nIdx + 2];
            const na = src[nIdx + 3];
            const nl = luminance(nr, ng, nb);

            if (na > 45 && nr < 55 && ng < 55 && nb < 55) {
              similarDark += 1;
            }

            if (na > 45 && nl > 58 && !(nr > 0 && ng > 220 && nb < 80) && !(nr > 220 && ng < 80 && nb > 220)) {
              count += 1;
              sumR += nr;
              sumG += ng;
              sumB += nb;
              sumA += na;
              if (nl > 86) brightEnough += 1;
            }
          }
        }

        if (count >= minGoodNeighbors && brightEnough >= 2 && similarDark < 10) {
          dst[idx] = Math.round(sumR / count);
          dst[idx + 1] = Math.round(sumG / count);
          dst[idx + 2] = Math.round(sumB / count);
          dst[idx + 3] = Math.max(src[idx + 3], Math.round(sumA / count));
        }
      }
    }

    return imageData;
  }

  CanvasRenderingContext2D.prototype.putImageData = function patchedPutImageData(imageData, ...args) {
    try {
      repairImageData(imageData);
    } catch (error) {
      // Keep the original export path working even if repair cannot run.
    }
    return originalPutImageData.call(this, imageData, ...args);
  };

  function repairedCanvas(canvas) {
    try {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return canvas;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      repairImageData(imageData);

      const copy = document.createElement("canvas");
      copy.width = canvas.width;
      copy.height = canvas.height;
      copy.getContext("2d").putImageData(imageData, 0, 0);
      return copy;
    } catch (error) {
      return canvas;
    }
  }

  HTMLCanvasElement.prototype.toBlob = function patchedToBlob(callback, type, quality) {
    const canvas = type === "image/png" || !type ? repairedCanvas(this) : this;
    return originalToBlob.call(canvas, callback, type, quality);
  };

  HTMLCanvasElement.prototype.toDataURL = function patchedToDataURL(type, quality) {
    const canvas = type === "image/png" || !type ? repairedCanvas(this) : this;
    return originalToDataURL.call(canvas, type, quality);
  };
})();
