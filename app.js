const els = {
  fileInput: document.querySelector("#fileInput"),
  secondFileInput: document.querySelector("#secondFileInput"),
  dropZone: document.querySelector("#dropZone"),
  mainCanvas: document.querySelector("#mainCanvas"),
  emptyState: document.querySelector("#emptyState"),
  bgColor: document.querySelector("#bgColor"),
  secondBgColor: document.querySelector("#secondBgColor"),
  pickBgBtn: document.querySelector("#pickBgBtn"),
  pickSecondBgBtn: document.querySelector("#pickSecondBgBtn"),
  solveStatus: document.querySelector("#solveStatus"),
  tolerance: document.querySelector("#tolerance"),
  toleranceValue: document.querySelector("#toleranceValue"),
  softness: document.querySelector("#softness"),
  softnessValue: document.querySelector("#softnessValue"),
  despill: document.querySelector("#despill"),
  despillValue: document.querySelector("#despillValue"),
  minArea: document.querySelector("#minArea"),
  minAreaValue: document.querySelector("#minAreaValue"),
  splitMode: document.querySelector("#splitMode"),
  keepShadows: document.querySelector("#keepShadows"),
  processBtn: document.querySelector("#processBtn"),
  aiSecondBgBtn: document.querySelector("#aiSecondBgBtn"),
  downloadAllBtn: document.querySelector("#downloadAllBtn"),
  prepFileInput: document.querySelector("#prepFileInput"),
  pairedAutoFileInput: document.querySelector("#pairedAutoFileInput"),
  prepMode: document.querySelector("#prepMode"),
  prepTolerance: document.querySelector("#prepTolerance"),
  prepToleranceValue: document.querySelector("#prepToleranceValue"),
  prepFeather: document.querySelector("#prepFeather"),
  prepFeatherValue: document.querySelector("#prepFeatherValue"),
  prepMaskCanvas: document.querySelector("#prepMaskCanvas"),
  prepGreenCanvas: document.querySelector("#prepGreenCanvas"),
  prepMagentaCanvas: document.querySelector("#prepMagentaCanvas"),
  downloadPrepGreenBtn: document.querySelector("#downloadPrepGreenBtn"),
  downloadPrepMagentaBtn: document.querySelector("#downloadPrepMagentaBtn"),
  sendPrepBtn: document.querySelector("#sendPrepBtn"),
  assetGrid: document.querySelector("#assetGrid"),
  countBadge: document.querySelector("#countBadge"),
  assetTemplate: document.querySelector("#assetTemplate"),
};

const ACCESS_PASSWORD = "ui-cutout-2026";
const ACCESS_KEY = "ai_ui_cutout_access_ok";

const ctx = els.mainCanvas.getContext("2d", { willReadFrequently: true });
let sourceImage = null;
let secondImage = null;
let prepImage = null;
let prepOutputs = null;
let sourceName = "ui";
let assets = [];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function setupAccessGate() {
  if (localStorage.getItem(ACCESS_KEY) === "1") return;

  const gate = document.createElement("section");
  gate.className = "access-gate";
  gate.innerHTML = `
    <form class="access-box">
      <h2>访问验证</h2>
      <p>请输入访问密码后继续使用。</p>
      <input type="password" autocomplete="current-password" placeholder="访问密码" />
      <button type="submit">进入网站</button>
      <span class="access-error" aria-live="polite"></span>
    </form>
  `;
  document.body.append(gate);

  const form = gate.querySelector("form");
  const input = gate.querySelector("input");
  const error = gate.querySelector(".access-error");
  input.focus();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (input.value === ACCESS_PASSWORD) {
      localStorage.setItem(ACCESS_KEY, "1");
      gate.remove();
      return;
    }
    error.textContent = "密码不正确";
    input.value = "";
    input.focus();
  });
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function colorDistance(data, index, bg) {
  const r = data[index] - bg.r;
  const g = data[index + 1] - bg.g;
  const b = data[index + 2] - bg.b;
  return Math.sqrt(r * r + g * g + b * b);
}

function estimateScreenAlpha(data, index, bg, despill) {
  const channels = [bg.r, bg.g, bg.b];
  const dominant = channels.indexOf(Math.max(...channels));
  const secondBg = Math.max(...channels.filter((_, i) => i !== dominant));
  const bgDominance = channels[dominant] - secondBg;
  if (bgDominance < 35) return 255;

  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  const pixel = [r, g, b];
  const secondPixel = Math.max(...pixel.filter((_, i) => i !== dominant));
  const pixelDominance = pixel[dominant] - secondPixel;
  if (pixelDominance <= 0) return 255;

  const screenAmount = clamp(pixelDominance / bgDominance, 0, 1);
  const brightness = (r + g + b) / 765;
  const strength = (0.5 + brightness * 0.34) * despill;
  return Math.round(255 * (1 - Math.pow(screenAmount, 1.18) * strength));
}

function removeScreenSpill(data, index, bg, alpha, despill) {
  if (alpha <= 0) return { r: 0, g: 0, b: 0 };
  const a = alpha / 255;
  let r = data[index];
  let g = data[index + 1];
  let b = data[index + 2];

  if (alpha < 252) {
    r = (r - bg.r * (1 - a)) / a;
    g = (g - bg.g * (1 - a)) / a;
    b = (b - bg.b * (1 - a)) / a;
  }

  const channels = [bg.r, bg.g, bg.b];
  const dominant = channels.indexOf(Math.max(...channels));
  const values = [r, g, b];
  const otherMax = Math.max(...values.filter((_, i) => i !== dominant));
  const excess = values[dominant] - otherMax;
  if (excess > 0) {
    values[dominant] -= excess * 0.82 * despill;
  }

  return {
    r: clamp(Math.round(values[0]), 0, 255),
    g: clamp(Math.round(values[1]), 0, 255),
    b: clamp(Math.round(values[2]), 0, 255),
  };
}

function solveTwoBackgroundPixel(firstData, secondData, index, bgA, bgB) {
  const db = [bgA.r - bgB.r, bgA.g - bgB.g, bgA.b - bgB.b];
  const dp = [firstData[index] - secondData[index], firstData[index + 1] - secondData[index + 1], firstData[index + 2] - secondData[index + 2]];
  const denom = db[0] * db[0] + db[1] * db[1] + db[2] * db[2];
  if (denom < 1600) return null;

  const backgroundAmount = clamp((dp[0] * db[0] + dp[1] * db[1] + dp[2] * db[2]) / denom, 0, 1);
  const alpha = Math.round((1 - backgroundAmount) * 255);
  if (alpha <= 2) return { r: 0, g: 0, b: 0, a: 0 };

  const a = alpha / 255;
  return {
    r: clamp(Math.round((firstData[index] - bgA.r * (1 - a)) / a), 0, 255),
    g: clamp(Math.round((firstData[index + 1] - bgA.g * (1 - a)) / a), 0, 255),
    b: clamp(Math.round((firstData[index + 2] - bgA.b * (1 - a)) / a), 0, 255),
    a: alpha,
  };
}

function loadImageFromFile(file) {
  sourceName = file.name.replace(/\.[^.]+$/, "") || "ui";
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    setSource(image);
  };
  image.src = url;
}

function loadSecondImageFromFile(file) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    secondImage = image;
    autoPickSecondBackground();
    processImage();
  };
  image.src = url;
}

function setSource(image) {
  sourceImage = image;
  els.mainCanvas.width = image.naturalWidth || image.width;
  els.mainCanvas.height = image.naturalHeight || image.height;
  ctx.clearRect(0, 0, els.mainCanvas.width, els.mainCanvas.height);
  ctx.drawImage(image, 0, 0);
  els.emptyState.hidden = true;
  els.processBtn.disabled = false;
  els.aiSecondBgBtn.disabled = false;
  autoPickBackground();
  processImage();
}

function autoPickBackground() {
  if (!sourceImage) return;
  const imageData = getImageDataFromImage(sourceImage);
  const { width, height } = imageData;
  const points = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
    [Math.floor(width / 2), 2],
    [Math.floor(width / 2), height - 3],
  ];
  const samples = points.map(([x, y]) => {
    const i = (clamp(y, 0, height - 1) * width + clamp(x, 0, width - 1)) * 4;
    return {
      r: imageData.data[i],
      g: imageData.data[i + 1],
      b: imageData.data[i + 2],
    };
  });
  const bg = samples
    .map((sample) => ({
      sample,
      score: samples.reduce((sum, other) => {
        return sum + Math.abs(sample.r - other.r) + Math.abs(sample.g - other.g) + Math.abs(sample.b - other.b);
      }, 0),
    }))
    .sort((a, b) => a.score - b.score)[0].sample;
  els.bgColor.value = rgbToHex(bg);
}

function autoPickSecondBackground() {
  if (!secondImage) return;
  const imageData = getImageDataFromImage(secondImage);
  const { width, height } = imageData;
  const points = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
    [Math.floor(width / 2), 2],
    [Math.floor(width / 2), height - 3],
  ];
  const samples = points.map(([x, y]) => {
    const i = (clamp(y, 0, height - 1) * width + clamp(x, 0, width - 1)) * 4;
    return {
      r: imageData.data[i],
      g: imageData.data[i + 1],
      b: imageData.data[i + 2],
    };
  });
  const bg = samples
    .map((sample) => ({
      sample,
      score: samples.reduce((sum, other) => {
        return sum + Math.abs(sample.r - other.r) + Math.abs(sample.g - other.g) + Math.abs(sample.b - other.b);
      }, 0),
    }))
    .sort((a, b) => a.score - b.score)[0].sample;
  els.secondBgColor.value = rgbToHex(bg);
}

function getImageDataFromImage(image, width = image.naturalWidth || image.width, height = image.naturalHeight || image.height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const canvasCtx = canvas.getContext("2d", { willReadFrequently: true });
  canvasCtx.drawImage(image, 0, 0, width, height);
  return canvasCtx.getImageData(0, 0, width, height);
}

function loadPrepImageFromFile(file) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    prepImage = image;
    processPrepImage();
  };
  image.src = url;
}

function loadPairedImageFromFile(file) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = async () => {
    URL.revokeObjectURL(url);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const halfWidth = Math.floor(width / 2);
    const greenCanvas = document.createElement("canvas");
    const magentaCanvas = document.createElement("canvas");
    greenCanvas.width = halfWidth;
    greenCanvas.height = height;
    magentaCanvas.width = halfWidth;
    magentaCanvas.height = height;
    greenCanvas.getContext("2d").drawImage(image, 0, 0, halfWidth, height, 0, 0, halfWidth, height);
    magentaCanvas.getContext("2d").drawImage(image, halfWidth, 0, halfWidth, height, 0, 0, halfWidth, height);

    const [greenImage, magentaImage] = await Promise.all([loadDataUrlImage(greenCanvas.toDataURL("image/png")), loadDataUrlImage(magentaCanvas.toDataURL("image/png"))]);
    sourceName = file.name.replace(/\.[^.]+$/, "") || "paired_ui";
    secondImage = magentaImage;
    els.bgColor.value = "#00ff00";
    els.secondBgColor.value = "#ff00ff";
    setSource(greenImage);
    autoPickSecondBackground();
    processImage();
  };
  image.src = url;
}

function loadPairedVerticalImageFromFile(file) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = async () => {
    URL.revokeObjectURL(url);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const halfHeight = Math.floor(height / 2);
    const greenCanvas = document.createElement("canvas");
    const magentaCanvas = document.createElement("canvas");
    greenCanvas.width = width;
    greenCanvas.height = halfHeight;
    magentaCanvas.width = width;
    magentaCanvas.height = halfHeight;
    greenCanvas.getContext("2d").drawImage(image, 0, 0, width, halfHeight, 0, 0, width, halfHeight);
    magentaCanvas.getContext("2d").drawImage(image, 0, halfHeight, width, halfHeight, 0, 0, width, halfHeight);

    const [greenImage, magentaImage] = await Promise.all([loadDataUrlImage(greenCanvas.toDataURL("image/png")), loadDataUrlImage(magentaCanvas.toDataURL("image/png"))]);
    sourceName = file.name.replace(/\.[^.]+$/, "") || "paired_vertical_ui";
    secondImage = magentaImage;
    els.bgColor.value = "#00ff00";
    els.secondBgColor.value = "#ff00ff";
    setSource(greenImage);
    autoPickSecondBackground();
    processImage();
  };
  image.src = url;
}

function loadPairedAutoImageFromFile(file) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = async () => {
    URL.revokeObjectURL(url);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const pairedLayout = detectPairedLayout(image, width, height);
    const isHorizontalPair = pairedLayout.orientation === "horizontal";
    const greenCanvas = document.createElement("canvas");
    const magentaCanvas = document.createElement("canvas");

    if (isHorizontalPair) {
      const halfWidth = Math.floor(width / 2);
      greenCanvas.width = halfWidth;
      greenCanvas.height = height;
      magentaCanvas.width = halfWidth;
      magentaCanvas.height = height;
      const firstCanvas = pairedLayout.greenFirst ? greenCanvas : magentaCanvas;
      const secondCanvas = pairedLayout.greenFirst ? magentaCanvas : greenCanvas;
      firstCanvas.getContext("2d").drawImage(image, 0, 0, halfWidth, height, 0, 0, halfWidth, height);
      secondCanvas.getContext("2d").drawImage(image, halfWidth, 0, halfWidth, height, 0, 0, halfWidth, height);
    } else {
      const halfHeight = Math.floor(height / 2);
      greenCanvas.width = width;
      greenCanvas.height = halfHeight;
      magentaCanvas.width = width;
      magentaCanvas.height = halfHeight;
      const firstCanvas = pairedLayout.greenFirst ? greenCanvas : magentaCanvas;
      const secondCanvas = pairedLayout.greenFirst ? magentaCanvas : greenCanvas;
      firstCanvas.getContext("2d").drawImage(image, 0, 0, width, halfHeight, 0, 0, width, halfHeight);
      secondCanvas.getContext("2d").drawImage(image, 0, halfHeight, width, halfHeight, 0, 0, width, halfHeight);
    }

    const [greenImage, magentaImage] = await Promise.all([loadDataUrlImage(greenCanvas.toDataURL("image/png")), loadDataUrlImage(magentaCanvas.toDataURL("image/png"))]);
    sourceName = file.name.replace(/\.[^.]+$/, "") || "paired_ui";
    secondImage = magentaImage;
    els.bgColor.value = "#00ff00";
    els.secondBgColor.value = "#ff00ff";
    setSource(greenImage);
    autoPickSecondBackground();
    processImage();
  };
  image.src = url;
}

function detectPairedLayout(image, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const canvasCtx = canvas.getContext("2d", { willReadFrequently: true });
  canvasCtx.drawImage(image, 0, 0);
  const data = canvasCtx.getImageData(0, 0, width, height).data;
  const left = sampleRegion(data, width, 0, 0, Math.floor(width / 2), height);
  const right = sampleRegion(data, width, Math.floor(width / 2), 0, Math.floor(width / 2), height);
  const top = sampleRegion(data, width, 0, 0, width, Math.floor(height / 2));
  const bottom = sampleRegion(data, width, 0, Math.floor(height / 2), width, Math.floor(height / 2));
  const horizontalScore = pairColorScore(left, right);
  const verticalScore = pairColorScore(top, bottom);

  if (Math.abs(horizontalScore - verticalScore) > 0.06) {
    const orientation = horizontalScore > verticalScore ? "horizontal" : "vertical";
    const first = orientation === "horizontal" ? left : top;
    return { orientation, greenFirst: chromaScore(first, "green") >= chromaScore(first, "magenta") };
  }
  const orientation = width >= height * 1.35 ? "horizontal" : "vertical";
  const first = orientation === "horizontal" ? left : top;
  return { orientation, greenFirst: chromaScore(first, "green") >= chromaScore(first, "magenta") };
}

function sampleRegion(data, imageWidth, startX, startY, width, height) {
  const stepX = Math.max(1, Math.floor(width / 32));
  const stepY = Math.max(1, Math.floor(height / 32));
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let y = startY; y < startY + height; y += stepY) {
    for (let x = startX; x < startX + width; x += stepX) {
      const i = (y * imageWidth + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count += 1;
    }
  }
  return { r: r / count, g: g / count, b: b / count };
}

function pairColorScore(a, b) {
  const greenMagentaA = chromaScore(a, "green") + chromaScore(b, "magenta");
  const greenMagentaB = chromaScore(a, "magenta") + chromaScore(b, "green");
  return Math.max(greenMagentaA, greenMagentaB);
}

function chromaScore(color, type) {
  const total = Math.max(1, color.r + color.g + color.b);
  if (type === "green") {
    return clamp((color.g - Math.max(color.r, color.b)) / 255, 0, 1) + color.g / total;
  }
  return clamp((Math.min(color.r, color.b) - color.g) / 255, 0, 1) + (color.r + color.b) / (total * 2);
}

function estimateEdgeBackground(imageData) {
  const { width, height, data } = imageData;
  const samples = [];
  const step = Math.max(1, Math.round(Math.min(width, height) / 80));

  for (let x = 0; x < width; x += step) {
    samples.push(readPixel(data, width, x, 0), readPixel(data, width, x, height - 1));
  }
  for (let y = 0; y < height; y += step) {
    samples.push(readPixel(data, width, 0, y), readPixel(data, width, width - 1, y));
  }

  samples.sort((a, b) => luminance(a) - luminance(b));
  const mid = samples.slice(Math.floor(samples.length * 0.2), Math.ceil(samples.length * 0.8));
  const color = {
    r: Math.round(mid.reduce((sum, p) => sum + p.r, 0) / mid.length),
    g: Math.round(mid.reduce((sum, p) => sum + p.g, 0) / mid.length),
    b: Math.round(mid.reduce((sum, p) => sum + p.b, 0) / mid.length),
  };
  color.palette = samples.filter((_, index) => index % Math.max(1, Math.floor(samples.length / 48)) === 0).slice(0, 64);
  return color;
}

function readPixel(data, width, x, y) {
  const i = (y * width + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

function luminance({ r, g, b }) {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function colorGap(data, index, color) {
  const colors = color.palette?.length ? color.palette : [color];
  let best = Infinity;
  for (const sample of colors) {
    const dr = data[index] - sample.r;
    const dg = data[index + 1] - sample.g;
    const db = data[index + 2] - sample.b;
    best = Math.min(best, Math.sqrt(dr * dr + dg * dg + db * db));
  }
  return best;
}

function processPrepImage() {
  if (!prepImage) return;
  const width = prepImage.naturalWidth || prepImage.width;
  const height = prepImage.naturalHeight || prepImage.height;
  const imageData = getImageDataFromImage(prepImage);
  const { data } = imageData;
  const bg = estimateEdgeBackground(imageData);
  const tolerance = Number(els.prepTolerance.value);
  const feather = Number(els.prepFeather.value);
  const background = floodBackground(data, width, height, bg, tolerance, feather);
  const weights = makeBackgroundWeights(data, width, height, bg, background, tolerance, feather);
  const preview = composeBackgroundWeightPreview(data, width, height, weights);
  const green =
    els.prepMode.value === "locked"
      ? composePixelLockedBackground(data, width, height, weights, { r: 0, g: 255, b: 0 })
      : composeFusedBackgroundReplace(data, width, height, bg, weights, { r: 0, g: 255, b: 0 });
  const magenta =
    els.prepMode.value === "locked"
      ? composePixelLockedBackground(data, width, height, weights, { r: 255, g: 0, b: 255 })
      : composeFusedBackgroundReplace(data, width, height, bg, weights, { r: 255, g: 0, b: 255 });

  drawImageDataToCanvas(els.prepMaskCanvas, preview);
  drawImageDataToCanvas(els.prepGreenCanvas, green);
  drawImageDataToCanvas(els.prepMagentaCanvas, magenta);
  prepOutputs = {
    green: canvasToImage(els.prepGreenCanvas),
    magenta: canvasToImage(els.prepMagentaCanvas),
    greenUrl: els.prepGreenCanvas.toDataURL("image/png"),
    magentaUrl: els.prepMagentaCanvas.toDataURL("image/png"),
  };
  els.downloadPrepGreenBtn.disabled = false;
  els.downloadPrepMagentaBtn.disabled = false;
  els.sendPrepBtn.disabled = false;
}

function floodBackground(data, width, height, bg, tolerance, feather) {
  const background = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const limit = tolerance + feather * 0.8;

  function push(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const p = y * width + x;
    if (background[p]) return;
    const gap = colorGap(data, p * 4, bg);
    if (gap > limit) return;
    background[p] = 1;
    queue[tail++] = p;
  }

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const y = Math.floor(p / width);
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }
  return background;
}

function makeBackgroundWeights(data, width, height, bg, background, tolerance, feather) {
  const weights = new Float32Array(width * height);
  const range = Math.max(1, feather);
  for (let p = 0; p < background.length; p += 1) {
    if (!background[p]) {
      weights[p] = 0;
      continue;
    }
    const gap = colorGap(data, p * 4, bg);
    weights[p] = 1 - clamp((gap - tolerance) / range, 0, 1);
  }
  return blurWeights(weights, width, height, Math.max(1, Math.round(feather / 14)));
}

function blurWeights(weights, width, height, radius) {
  if (radius <= 0) return weights;
  const out = new Float32Array(weights.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let oy = -radius; oy <= radius; oy += 1) {
        const yy = y + oy;
        if (yy < 0 || yy >= height) continue;
        for (let ox = -radius; ox <= radius; ox += 1) {
          const xx = x + ox;
          if (xx < 0 || xx >= width) continue;
          sum += weights[yy * width + xx];
          count += 1;
        }
      }
      out[y * width + x] = sum / count;
    }
  }
  return out;
}

function composeBackgroundWeightPreview(sourceData, width, height, weights) {
  const out = new ImageData(width, height);
  for (let p = 0; p < weights.length; p += 1) {
    const i = p * 4;
    const w = weights[p];
    out.data[i] = Math.round(sourceData[i] * (1 - w) + 0 * w);
    out.data[i + 1] = Math.round(sourceData[i + 1] * (1 - w) + 150 * w);
    out.data[i + 2] = Math.round(sourceData[i + 2] * (1 - w) + 255 * w);
    out.data[i + 3] = 255;
  }
  return out;
}

function composeFusedBackgroundReplace(sourceData, width, height, sourceBg, weights, targetBg) {
  const out = new ImageData(width, height);
  for (let p = 0; p < weights.length; p += 1) {
    const i = p * 4;
    const w = weights[p];
    const baseR = clamp(targetBg.r + (sourceData[i] - sourceBg.r) * 0.22, 0, 255);
    const baseG = clamp(targetBg.g + (sourceData[i + 1] - sourceBg.g) * 0.22, 0, 255);
    const baseB = clamp(targetBg.b + (sourceData[i + 2] - sourceBg.b) * 0.22, 0, 255);
    out.data[i] = Math.round(sourceData[i] * (1 - w) + baseR * w);
    out.data[i + 1] = Math.round(sourceData[i + 1] * (1 - w) + baseG * w);
    out.data[i + 2] = Math.round(sourceData[i + 2] * (1 - w) + baseB * w);
    out.data[i + 3] = 255;
  }
  return out;
}

function composePixelLockedBackground(sourceData, width, height, weights, targetBg) {
  const out = new ImageData(width, height);
  for (let p = 0; p < weights.length; p += 1) {
    const i = p * 4;
    const w = weights[p] >= 0.5 ? 1 : 0;
    out.data[i] = w ? targetBg.r : sourceData[i];
    out.data[i + 1] = w ? targetBg.g : sourceData[i + 1];
    out.data[i + 2] = w ? targetBg.b : sourceData[i + 2];
    out.data[i + 3] = 255;
  }
  return out;
}

function drawImageDataToCanvas(canvas, imageData) {
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext("2d").putImageData(imageData, 0, 0);
}

function canvasToImage(canvas) {
  const image = new Image();
  image.src = canvas.toDataURL("image/png");
  return image;
}

function loadDataUrlImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = url;
  });
}

function processImage() {
  if (!sourceImage) return;

  const width = sourceImage.naturalWidth || sourceImage.width;
  const height = sourceImage.naturalHeight || sourceImage.height;
  els.mainCanvas.width = width;
  els.mainCanvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(sourceImage, 0, 0);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const bg = hexToRgb(els.bgColor.value);
  const secondBg = hexToRgb(els.secondBgColor.value);
  const tolerance = Number(els.tolerance.value);
  const softness = Number(els.softness.value);
  const despill = Number(els.despill.value) / 100;
  const minArea = Number(els.minArea.value);
  const keepShadows = els.keepShadows.checked;
  const mask = new Uint8Array(width * height);
  const keyed = new Uint8ClampedArray(data);
  const secondData = secondImage ? getImageDataFromImage(secondImage, width, height).data : null;
  updateSolveStatus(Boolean(secondData), secondImage && ((secondImage.naturalWidth || secondImage.width) !== width || (secondImage.naturalHeight || secondImage.height) !== height), bg, secondBg);

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    let alpha;
    const solved = secondData ? solveTwoBackgroundPixel(data, secondData, i, bg, secondBg) : null;

    if (solved) {
      alpha = clamp(solved.a, 0, data[i + 3]);
      keyed[i] = solved.r;
      keyed[i + 1] = solved.g;
      keyed[i + 2] = solved.b;
    } else {
      const distance = colorDistance(data, i, bg);
      if (distance <= tolerance) {
        alpha = 0;
      } else if (softness > 0 && distance < tolerance + softness) {
        alpha = Math.round(((distance - tolerance) / softness) * 255);
      } else {
        alpha = 255;
      }

      if (keepShadows && distance > tolerance * 0.62 && distance <= tolerance + softness + 32) {
        alpha = Math.max(alpha, Math.round((distance / (tolerance + softness + 32)) * 170));
      }

      alpha = Math.min(alpha, estimateScreenAlpha(data, i, bg, despill));
      alpha = clamp(alpha, 0, data[i + 3]);
      if (alpha > 0) {
        const clean = removeScreenSpill(data, i, bg, alpha, despill);
        keyed[i] = clean.r;
        keyed[i + 1] = clean.g;
        keyed[i + 2] = clean.b;
      }
    }
    keyed[i + 3] = alpha;
    mask[p] = keyed[i + 3] > 18 ? 1 : 0;
  }

  imageData.data.set(keyed);
  ctx.putImageData(imageData, 0, 0);
  const groupedMask = dilateMask(mask, width, height, Math.max(2, Math.round(Math.min(width, height) / 180)));
  assets = extractComponents(keyed, groupedMask, width, height, minArea, els.splitMode.value);
  renderAssets();
}

function updateSolveStatus(hasSecond, resizedSecond, bg, secondBg) {
  if (!sourceImage) {
    els.solveStatus.classList.remove("is-good");
    els.solveStatus.textContent = "当前：等待上传图片";
    return;
  }

  if (!hasSecond) {
    els.solveStatus.classList.remove("is-good");
    els.solveStatus.textContent = "当前：单图估算，半透明区域可能偏色";
    return;
  }

  const bgGap = Math.sqrt((bg.r - secondBg.r) ** 2 + (bg.g - secondBg.g) ** 2 + (bg.b - secondBg.b) ** 2);
  if (bgGap < 140) {
    els.solveStatus.classList.remove("is-good");
    els.solveStatus.textContent = "当前：第 2 张背景色和第 1 张太接近，请改用洋红色、蓝色或红色纯色背景";
    return;
  }

  els.solveStatus.classList.add("is-good");
  els.solveStatus.textContent = resizedSecond
    ? "当前：双图精算已启用；第 2 张已自动缩放对齐，若仍偏色请确保两张 UI 没有位移"
    : "当前：双图精算已启用，正在按两张纯色背景反算原色和透明度";
}

function dilateMask(mask, width, height, radius) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = y * width + x;
      if (!mask[p]) continue;
      for (let oy = -radius; oy <= radius; oy += 1) {
        const yy = y + oy;
        if (yy < 0 || yy >= height) continue;
        for (let ox = -radius; ox <= radius; ox += 1) {
          const xx = x + ox;
          if (xx < 0 || xx >= width) continue;
          out[yy * width + xx] = 1;
        }
      }
    }
  }
  return out;
}

function extractComponents(data, mask, width, height, minArea, splitMode = "controls") {
  const visited = new Uint8Array(mask.length);
  const found = [];
  const queue = new Int32Array(mask.length);
  const padding = 3;

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;

    let head = 0;
    let tail = 0;
    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    visited[start] = 1;
    queue[tail++] = start;

    while (head < tail) {
      const p = queue[head++];
      const x = p % width;
      const y = Math.floor(p / width);
      area += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      const neighbors = [p - 1, p + 1, p - width, p + width];
      for (const next of neighbors) {
        if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;
        if ((p % width === 0 && next === p - 1) || (p % width === width - 1 && next === p + 1)) continue;
        visited[next] = 1;
        queue[tail++] = next;
      }
    }

    if (area < minArea) continue;
    minX = clamp(minX - padding, 0, width - 1);
    minY = clamp(minY - padding, 0, height - 1);
    maxX = clamp(maxX + padding, 0, width - 1);
    maxY = clamp(maxY + padding, 0, height - 1);
    found.push({ area, minX, minY, width: maxX - minX + 1, height: maxY - minY + 1 });
  }

  const boxes = splitMode === "controls" ? mergeControlBoxes(found, width, height) : found;

  return boxes
    .sort((a, b) => b.area - a.area)
    .slice(0, 80)
    .map((box, index) => makeAsset(data, width, box, index));
}

function mergeControlBoxes(boxes, imageWidth, imageHeight) {
  const maxGap = Math.max(10, Math.round(Math.min(imageWidth, imageHeight) / 90));
  const maxCardGap = Math.max(18, Math.round(Math.min(imageWidth, imageHeight) / 45));
  let merged = boxes.map((box) => ({ ...box }));
  let changed = true;

  while (changed) {
    changed = false;
    outer: for (let i = 0; i < merged.length; i += 1) {
      for (let j = i + 1; j < merged.length; j += 1) {
        if (!shouldMergeBoxes(merged[i], merged[j], maxGap, maxCardGap, imageWidth, imageHeight)) continue;
        merged[i] = unionBox(merged[i], merged[j]);
        merged.splice(j, 1);
        changed = true;
        break outer;
      }
    }
  }

  return merged.map((box) => padBox(box, 4, imageWidth, imageHeight));
}

function shouldMergeBoxes(a, b, maxGap, maxCardGap, imageWidth, imageHeight) {
  const ax2 = a.minX + a.width;
  const ay2 = a.minY + a.height;
  const bx2 = b.minX + b.width;
  const by2 = b.minY + b.height;
  const overlapX = Math.min(ax2, bx2) - Math.max(a.minX, b.minX);
  const overlapY = Math.min(ay2, by2) - Math.max(a.minY, b.minY);
  const gapX = Math.max(0, Math.max(a.minX, b.minX) - Math.min(ax2, bx2));
  const gapY = Math.max(0, Math.max(a.minY, b.minY) - Math.min(ay2, by2));
  const minW = Math.min(a.width, b.width);
  const minH = Math.min(a.height, b.height);
  const near = gapX <= maxGap && gapY <= maxGap;
  const rowGroup = overlapY > minH * 0.36 && gapX <= maxCardGap && Math.max(a.height, b.height) < imageHeight * 0.24;
  const columnGroup = overlapX > minW * 0.36 && gapY <= maxCardGap && Math.max(a.width, b.width) < imageWidth * 0.24;
  const containedOrTouching = overlapX > 0 && overlapY > 0;
  return containedOrTouching || near || rowGroup || columnGroup;
}

function unionBox(a, b) {
  const minX = Math.min(a.minX, b.minX);
  const minY = Math.min(a.minY, b.minY);
  const maxX = Math.max(a.minX + a.width, b.minX + b.width);
  const maxY = Math.max(a.minY + a.height, b.minY + b.height);
  return {
    area: a.area + b.area,
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function padBox(box, padding, imageWidth, imageHeight) {
  const minX = clamp(box.minX - padding, 0, imageWidth - 1);
  const minY = clamp(box.minY - padding, 0, imageHeight - 1);
  const maxX = clamp(box.minX + box.width + padding, 0, imageWidth);
  const maxY = clamp(box.minY + box.height + padding, 0, imageHeight);
  return {
    ...box,
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function makeAsset(data, sourceWidth, box, index) {
  const canvas = document.createElement("canvas");
  canvas.width = box.width;
  canvas.height = box.height;
  const assetCtx = canvas.getContext("2d");
  const out = assetCtx.createImageData(box.width, box.height);

  for (let y = 0; y < box.height; y += 1) {
    for (let x = 0; x < box.width; x += 1) {
      const sourceIndex = ((box.minY + y) * sourceWidth + box.minX + x) * 4;
      const targetIndex = (y * box.width + x) * 4;
      out.data[targetIndex] = data[sourceIndex];
      out.data[targetIndex + 1] = data[sourceIndex + 1];
      out.data[targetIndex + 2] = data[sourceIndex + 2];
      out.data[targetIndex + 3] = data[sourceIndex + 3];
    }
  }

  assetCtx.putImageData(out, 0, 0);
  return {
    name: `${sourceName}_asset_${String(index + 1).padStart(2, "0")}.png`,
    width: box.width,
    height: box.height,
    canvas,
    url: canvas.toDataURL("image/png"),
  };
}

function renderAssets() {
  els.assetGrid.replaceChildren();
  els.countBadge.textContent = `${assets.length} 个`;
  els.downloadAllBtn.disabled = assets.length === 0;

  for (const asset of assets) {
    const node = els.assetTemplate.content.firstElementChild.cloneNode(true);
    const img = node.querySelector("img");
    const label = node.querySelector("span");
    const button = node.querySelector("button");
    img.src = asset.url;
    img.alt = asset.name;
    label.textContent = `${asset.width} x ${asset.height}`;
    button.addEventListener("click", () => saveBlob(dataUrlToBlob(asset.url), asset.name));
    els.assetGrid.append(node);
  }
}

function dataUrlToBlob(url) {
  const [meta, base64] = url.split(",");
  const mime = meta.match(/data:(.*?);/)?.[1] || "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function imageToDataUrl(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  canvas.getContext("2d").drawImage(image, 0, 0);
  return canvas.toDataURL("image/png");
}

function apiBaseUrl() {
  if (location.protocol === "http:" || location.protocol === "https:") return location.origin;
  return "http://localhost:8787";
}

async function ensureAiServerReady() {
  let response;
  try {
    response = await fetch(`${apiBaseUrl()}/api/health`, { cache: "no-store" });
  } catch {
    throw new Error("本地 AI 服务没有连接上。请先启动 server.js，然后用 http://localhost:8787 打开网站。");
  }

  const status = await response.json();
  if (!status.ok) throw new Error("本地 AI 服务状态异常。");
  if (!status.hasApiKey) throw new Error("本地 AI 服务没有读取到 OPENAI_API_KEY。请设置 API Key 后重新启动服务。");
}

async function generateSecondBackground() {
  if (!sourceImage) return;
  alert(
    [
      "AI 自动生成第 2 底色功能暂未开放。",
      "",
      "当前公开版支持：",
      "1. 上传单张纯色背景图快速拆分。",
      "2. 上传第 2 张不同底色图进行双底色精算。",
      "3. 上传左右/上下双底色图自动裁分拆解。",
      "",
      "后续接入图片模型 API 后，这个按钮会自动生成第 2 底色图并拆分。",
    ].join("\n"),
  );
}

els.aiSecondBgBtn.addEventListener("click", generateSecondBackground);

async function saveBlob(blob, name) {
  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: "PNG 图片", accept: { [blob.type || "image/png"]: [`.${name.split(".").pop()}`] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadAll() {
  if (!assets.length) return;
  await saveBlob(makeZip(assets), `${sourceName}_assets.zip`);
}

function dataUrlToBytes(url) {
  const base64 = url.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function makeZip(items) {
  const encoder = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;

  for (const item of items) {
    const nameBytes = encoder.encode(item.name);
    const fileBytes = dataUrlToBytes(item.url);
    const crc = crc32(fileBytes);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, fileBytes.length, true);
    localView.setUint32(22, fileBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    parts.push(local, fileBytes);

    const record = new Uint8Array(46 + nameBytes.length);
    const recordView = new DataView(record.buffer);
    recordView.setUint32(0, 0x02014b50, true);
    recordView.setUint16(4, 20, true);
    recordView.setUint16(6, 20, true);
    recordView.setUint16(8, 0x0800, true);
    recordView.setUint16(10, 0, true);
    recordView.setUint32(16, crc, true);
    recordView.setUint32(20, fileBytes.length, true);
    recordView.setUint32(24, fileBytes.length, true);
    recordView.setUint16(28, nameBytes.length, true);
    recordView.setUint32(42, offset, true);
    record.set(nameBytes, 46);
    central.push(record);
    offset += local.length + fileBytes.length;
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, items.length, true);
  endView.setUint16(10, items.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: "application/zip" });
}

function makeRawZip(files) {
  const encoder = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const fileBytes = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
    const crc = crc32(fileBytes);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, fileBytes.length, true);
    localView.setUint32(22, fileBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    parts.push(local, fileBytes);

    const record = new Uint8Array(46 + nameBytes.length);
    const recordView = new DataView(record.buffer);
    recordView.setUint32(0, 0x02014b50, true);
    recordView.setUint16(4, 20, true);
    recordView.setUint16(6, 20, true);
    recordView.setUint16(8, 0x0800, true);
    recordView.setUint16(10, 0, true);
    recordView.setUint32(16, crc, true);
    recordView.setUint32(20, fileBytes.length, true);
    recordView.setUint32(24, fileBytes.length, true);
    recordView.setUint16(28, nameBytes.length, true);
    recordView.setUint32(42, offset, true);
    record.set(nameBytes, 46);
    central.push(record);
    offset += local.length + fileBytes.length;
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: "application/zip" });
}

async function backupStableVersion() {
  const files = await Promise.all(
    ["index.html", "styles.css", "app.js", "备份-双底色精算稳定版.md"].map(async (name) => {
      const response = await fetch(`./${name}?v=${Date.now()}`);
      return { name, content: await response.text() };
    }),
  );
  await saveBlob(makeRawZip(files), "双底色精算稳定版.zip");
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function updateLabels() {
  els.toleranceValue.textContent = els.tolerance.value;
  els.softnessValue.textContent = els.softness.value;
  els.despillValue.textContent = els.despill.value;
  els.minAreaValue.textContent = els.minArea.value;
  els.prepToleranceValue.textContent = els.prepTolerance.value;
  els.prepFeatherValue.textContent = els.prepFeather.value;
}

function createSample() {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 680;
  const c = canvas.getContext("2d");
  c.fillStyle = "#15d719";
  c.fillRect(0, 0, canvas.width, canvas.height);

  c.shadowColor = "rgba(0,0,0,.32)";
  c.shadowBlur = 22;
  c.fillStyle = "rgba(24, 63, 74, .72)";
  roundRect(c, 645, 70, 410, 58, 8);
  c.fill();
  c.shadowBlur = 0;

  c.fillStyle = "rgba(255,255,255,.88)";
  c.font = "700 30px Microsoft YaHei";
  c.fillText("基础属性", 675, 109);

  c.fillStyle = "rgba(10, 110, 62, .9)";
  roundRect(c, 692, 185, 310, 126, 8);
  c.fill();
  c.fillStyle = "rgba(255,255,255,.92)";
  c.font = "700 26px Microsoft YaHei";
  c.fillText("极 · 白衣渡江 I阶", 735, 235);
  c.font = "22px Microsoft YaHei";
  c.fillText("发动概率: 30%   冷却回合: 3", 735, 278);

  c.fillStyle = "rgba(248, 238, 220, .95)";
  roundRect(c, 1046, 74, 48, 220, 22);
  c.fill();
  c.fillStyle = "#202323";
  c.font = "700 28px Microsoft YaHei";
  c.fillText("属", 1056, 165);
  c.fillText("性", 1056, 202);

  c.save();
  c.translate(330, 344);
  c.shadowColor = "rgba(0,0,0,.35)";
  c.shadowBlur = 18;
  c.fillStyle = "#f6f1e8";
  c.beginPath();
  c.ellipse(0, 0, 110, 185, -0.18, 0, Math.PI * 2);
  c.fill();
  c.shadowBlur = 0;
  c.fillStyle = "#27323b";
  c.beginPath();
  c.ellipse(28, 18, 92, 178, -0.1, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#d4c2a6";
  c.beginPath();
  c.arc(-20, -92, 54, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#2b2b32";
  c.beginPath();
  c.arc(-20, -112, 68, 0.1, Math.PI * 1.15);
  c.fill();
  c.restore();

  for (let i = 0; i < 5; i += 1) {
    c.fillStyle = "rgba(24, 50, 66, .82)";
    c.beginPath();
    c.arc(105, 110 + i * 104, 38, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = i === 1 ? "rgba(0,0,0,.45)" : "#f3d2c8";
    c.beginPath();
    c.arc(105, 110 + i * 104, 28, 0, Math.PI * 2);
    c.fill();
  }

  const image = new Image();
  image.onload = () => {
    sourceName = "sample_ui";
    setSource(image);
  };
  image.src = canvas.toDataURL("image/png");
}

function roundRect(c, x, y, width, height, radius) {
  c.beginPath();
  c.moveTo(x + radius, y);
  c.arcTo(x + width, y, x + width, y + height, radius);
  c.arcTo(x + width, y + height, x, y + height, radius);
  c.arcTo(x, y + height, x, y, radius);
  c.arcTo(x, y, x + width, y, radius);
  c.closePath();
}

["dragenter", "dragover"].forEach((eventName) => {
  els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.add("is-hot");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.remove("is-hot");
  });
});

els.dropZone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (file) loadImageFromFile(file);
});

els.fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) loadImageFromFile(file);
});

els.prepFileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) loadPrepImageFromFile(file);
});

els.pairedAutoFileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) loadPairedAutoImageFromFile(file);
});

els.secondFileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) loadSecondImageFromFile(file);
});

els.pickBgBtn.addEventListener("click", () => {
  autoPickBackground();
  processImage();
});
els.pickSecondBgBtn.addEventListener("click", () => {
  autoPickSecondBackground();
  processImage();
});
els.processBtn.addEventListener("click", processImage);
els.downloadAllBtn.addEventListener("click", downloadAll);
els.keepShadows.addEventListener("change", processImage);
els.splitMode.addEventListener("change", processImage);
els.downloadPrepGreenBtn.addEventListener("click", () => {
  if (prepOutputs) saveBlob(dataUrlToBlob(prepOutputs.greenUrl), "复杂背景转绿色版.png");
});
els.downloadPrepMagentaBtn.addEventListener("click", () => {
  if (prepOutputs) saveBlob(dataUrlToBlob(prepOutputs.magentaUrl), "复杂背景转洋红版.png");
});
els.sendPrepBtn.addEventListener("click", async () => {
  if (!prepOutputs) return;
  const [greenImage, magentaImage] = await Promise.all([loadDataUrlImage(prepOutputs.greenUrl), loadDataUrlImage(prepOutputs.magentaUrl)]);
  sourceName = "prepared_icon";
  sourceImage = greenImage;
  secondImage = magentaImage;
  els.bgColor.value = "#00ff00";
  els.secondBgColor.value = "#ff00ff";
  setSource(sourceImage);
});

[els.tolerance, els.softness, els.despill, els.minArea].forEach((input) => {
  input.addEventListener("input", () => {
    updateLabels();
    processImage();
  });
});

[els.prepMode, els.prepTolerance, els.prepFeather].forEach((input) => {
  input.addEventListener("input", () => {
    updateLabels();
    processPrepImage();
  });
});

els.bgColor.addEventListener("input", processImage);
setupAccessGate();
updateLabels();
