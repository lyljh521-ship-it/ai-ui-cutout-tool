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
  cutoutTabBtn: document.querySelector("#cutoutTabBtn"),
  prepareTabBtn: document.querySelector("#prepareTabBtn"),
  cutoutPage: document.querySelector("#cutoutPage"),
  preparePage: document.querySelector("#preparePage"),
  cropSourceInput: document.querySelector("#cropSourceInput"),
  cropUploadBox: document.querySelector("#cropUploadBox"),
  cropUploadText: document.querySelector("#cropUploadText"),
  removeCropImageBtn: document.querySelector("#removeCropImageBtn"),
  cropPreset: document.querySelector("#cropPreset"),
  pairDirection: document.querySelector("#pairDirection"),
  liblibAccessKey: document.querySelector("#liblibAccessKey"),
  liblibSecretKey: document.querySelector("#liblibSecretKey"),
  liblibModelMode: document.querySelector("#liblibModelMode"),
  pairAdvice: document.querySelector("#pairAdvice"),
  pairAdviceText: document.querySelector("#pairAdviceText"),
  aiPromptText: document.querySelector("#aiPromptText"),
  cropCanvas: document.querySelector("#cropCanvas"),
  generateDualBgBtn: document.querySelector("#generateDualBgBtn"),
  downloadCropBtn: document.querySelector("#downloadCropBtn"),
  copyPromptBtn: document.querySelector("#copyPromptBtn"),
};

const ACCESS_PASSWORD = "ui-cutout-2026";

let latestAiDualBgImage = "";
let latestAiDualBgPanelReady = false;

function forceInstallAiPreviewPanel() {
  let panel = document.getElementById("aiGeneratedDualBgPanel");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "aiGeneratedDualBgPanel";
    panel.className = "ai-generated-preview-panel force-ai-preview-panel";
    panel.innerHTML = `
      <div class="ai-generated-preview-head">
        <div>
          <h3>AI 生成结果预览</h3>
          <p>这里会显示 AI 返回的双底色图，可下载、自动对齐，或送去拆分。</p>
        </div>
        <div class="ai-generated-preview-actions">
          <button type="button" id="alignAiDualBgBtn">自动对齐</button>
          <button type="button" id="downloadAiDualBgBtn">下载生成图</button>
          <button type="button" id="sendAiDualBgToCutoutBtn">送去拆分</button>
        </div>
      </div>
      <div id="aiAlignmentStatus" class="ai-alignment-status" hidden></div>
      <div class="ai-generated-preview-canvas ai-generated-preview-empty">
        <img id="aiGeneratedDualBgImage" alt="AI 生成的双底色图预览">
        <span id="aiGeneratedPreviewEmptyText">等待 AI 生成图片</span>
      </div>
    `;
  }

  const anchors = Array.from(document.querySelectorAll("div, section, label, p"))
    .filter((node) => node.offsetParent !== null && /左右排列：输出约|上下排列：输出约|双底色排列|裁切预设/.test(node.textContent || ""));
  const anchor = anchors[anchors.length - 1];
  const host = anchor ? anchor.closest("section, .panel, .card, div") : null;
  const target = host && host.parentElement ? host.parentElement : (document.querySelector("main") || document.body);
  if (panel.parentElement !== target) target.appendChild(panel);
  bindAiGeneratedPreviewActions();
  latestAiDualBgPanelReady = true;
  return panel;
}

function showAiGeneratedDualBgPreview(imageLike) {
  const imageUrl = typeof imageLike === "string" ? imageLike : URL.createObjectURL(imageLike);
  latestAiDualBgImage = imageUrl;
  try {
    localStorage.setItem("latest_ai_dual_bg_image", imageUrl);
  } catch {
  }

  forceInstallAiPreviewPanel();
  ensureAiPreviewPanelInActivePage();
  let panel = document.getElementById("aiGeneratedDualBgPanel");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "aiGeneratedDualBgPanel";
    panel.className = "ai-generated-preview-panel";
    panel.innerHTML = `
      <div class="ai-generated-preview-head">
        <div>
          <h3>AI 生成结果预览</h3>
          <p>先检查双底色图质量，满意后再手动送去拆分。</p>
        </div>
        <div class="ai-generated-preview-actions">
          <button type="button" id="downloadAiDualBgBtn">下载生成图</button>
          <button type="button" id="sendAiDualBgToCutoutBtn">送去拆分</button>
        </div>
      </div>
      <div class="ai-generated-preview-canvas">
        <img id="aiGeneratedDualBgImage" alt="AI 生成的双底色图预览">
      </div>
    `;
    const host = document.querySelector("#ai-dual-bg-page") || document.querySelector("[data-page='ai-dual-bg']") || document.querySelector(".ai-dual-bg-page") || document.body;
    host.appendChild(panel);
  }

  bindAiGeneratedPreviewActions();
  document.getElementById("aiGeneratedDualBgImage").src = imageUrl;
  const emptyText = document.getElementById("aiGeneratedPreviewEmptyText");
  const canvas = document.querySelector("#aiGeneratedDualBgPanel .ai-generated-preview-canvas");
  if (emptyText) emptyText.hidden = true;
  if (canvas) canvas.classList.remove("ai-generated-preview-empty");
  panel.hidden = false;
  panel.style.display = "block";
  showFloatingAiPreview(imageUrl);
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function ensureAiPreviewPanelInActivePage() {
  let panel = document.getElementById("aiGeneratedDualBgPanel");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "aiGeneratedDualBgPanel";
    panel.className = "ai-generated-preview-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="ai-generated-preview-head">
        <div>
          <h3>AI 生成结果预览</h3>
          <p>先检查双底色图质量；有重影时先自动对齐，再送去拆分。</p>
        </div>
        <div class="ai-generated-preview-actions">
          <button type="button" id="alignAiDualBgBtn">自动对齐</button>
          <button type="button" id="downloadAiDualBgBtn">下载生成图</button>
          <button type="button" id="sendAiDualBgToCutoutBtn">送去拆分</button>
        </div>
      </div>
      <div id="aiAlignmentStatus" class="ai-alignment-status" hidden></div>
      <div class="ai-generated-preview-canvas">
        <img id="aiGeneratedDualBgImage" alt="AI 生成的双底色图预览">
      </div>
    `;
  }

  const activePanels = Array.from(document.querySelectorAll("section, main, div"))
    .filter((node) => node.offsetParent !== null);
  const aiHost = activePanels.find((node) => /AI\s*双底色|双底色制备|裁切预设|上下排列|左右排列/.test(node.textContent || ""));
  const target = aiHost || document.querySelector("main") || document.body;
  if (panel.parentElement !== target) target.appendChild(panel);
  bindAiGeneratedPreviewActions();
}

function showFloatingAiPreview(imageUrl) {
  let floating = document.getElementById("floatingAiDualBgPreview");
  if (!floating) {
    floating = document.createElement("div");
    floating.id = "floatingAiDualBgPreview";
    floating.className = "floating-ai-preview";
    floating.innerHTML = `
      <div class="floating-ai-preview-head">
        <strong>AI 生成图</strong>
        <button type="button" id="closeFloatingAiPreviewBtn">×</button>
      </div>
      <img id="floatingAiDualBgImage" alt="AI 生成图预览">
      <div class="floating-ai-preview-actions">
        <button type="button" id="floatingDownloadAiDualBgBtn">下载</button>
        <button type="button" id="floatingSendAiDualBgBtn">送拆分</button>
      </div>
    `;
    document.body.appendChild(floating);
    document.getElementById("closeFloatingAiPreviewBtn").addEventListener("click", () => {
      floating.hidden = true;
    });
    document.getElementById("floatingDownloadAiDualBgBtn").addEventListener("click", downloadLatestAiDualBg);
    document.getElementById("floatingSendAiDualBgBtn").addEventListener("click", sendLatestAiDualBgToCutout);
  }
  document.getElementById("floatingAiDualBgImage").src = imageUrl;
  floating.hidden = false;
}

function bindAiGeneratedPreviewActions() {
  const sendBtn = document.getElementById("sendAiDualBgToCutoutBtn");
  const downloadBtn = document.getElementById("downloadAiDualBgBtn");
  const alignBtn = document.getElementById("alignAiDualBgBtn");
  if (sendBtn && !sendBtn.dataset.bound) {
    sendBtn.addEventListener("click", sendLatestAiDualBgToCutout);
    sendBtn.dataset.bound = "true";
  }
  if (downloadBtn && !downloadBtn.dataset.bound) {
    downloadBtn.addEventListener("click", downloadLatestAiDualBg);
    downloadBtn.dataset.bound = "true";
  }
  if (alignBtn && !alignBtn.dataset.bound) {
    alignBtn.addEventListener("click", alignLatestAiDualBg);
    alignBtn.dataset.bound = "true";
  }
}

async function alignLatestAiDualBg() {
  if (!latestAiDualBgImage) return alert("还没有 AI 生成图。");
  const status = document.getElementById("aiAlignmentStatus");
  if (status) {
    status.hidden = false;
    status.textContent = "正在自动对齐...";
  }
  try {
    const aligned = await autoAlignDualBackgroundImage(latestAiDualBgImage);
    showAiGeneratedDualBgPreview(aligned.dataUrl);
    if (status) {
      status.hidden = false;
      status.textContent = `已自动对齐：${aligned.direction === "vertical" ? "上下" : "左右"}，偏移 ${aligned.dx}px / ${aligned.dy}px，差异评分 ${aligned.score.toFixed(2)}`;
    }
  } catch (error) {
    if (status) {
      status.hidden = false;
      status.textContent = `自动对齐失败：${error.message || error}`;
    }
  }
}

async function autoAlignDualBackgroundImage(imageUrl) {
  const image = await loadImageElement(imageUrl);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  ctx.drawImage(image, 0, 0);

  const orientation = detectDualBgOrientation(ctx, canvas.width, canvas.height);
  const vertical = orientation === "vertical";
  const halfW = vertical ? canvas.width : Math.floor(canvas.width / 2);
  const halfH = vertical ? Math.floor(canvas.height / 2) : canvas.height;
  const first = ctx.getImageData(0, 0, halfW, halfH);
  const second = ctx.getImageData(vertical ? 0 : halfW, vertical ? halfH : 0, halfW, halfH);
  const maskA = buildForegroundMask(first);
  const maskB = buildForegroundMask(second);
  const best = findBestMaskOffset(maskA, maskB, halfW, halfH, 18);

  const output = document.createElement("canvas");
  output.width = canvas.width;
  output.height = canvas.height;
  const out = output.getContext("2d");
  out.drawImage(canvas, 0, 0);
  const sx = vertical ? 0 : halfW;
  const sy = vertical ? halfH : 0;
  out.clearRect(sx, sy, halfW, halfH);
  out.drawImage(canvas, sx, sy, halfW, halfH, sx + best.dx, sy + best.dy, halfW, halfH);
  return {
    dataUrl: output.toDataURL("image/png"),
    direction: orientation,
    dx: best.dx,
    dy: best.dy,
    score: best.score,
  };
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败，无法自动对齐。"));
    img.src = src;
  });
}

function detectDualBgOrientation(ctx, width, height) {
  const sample = (x, y) => {
    const p = ctx.getImageData(Math.max(0, Math.min(width - 1, x)), Math.max(0, Math.min(height - 1, y)), 1, 1).data;
    return { r: p[0], g: p[1], b: p[2] };
  };
  const left = sample(Math.floor(width * 0.08), Math.floor(height * 0.5));
  const right = sample(Math.floor(width * 0.92), Math.floor(height * 0.5));
  const top = sample(Math.floor(width * 0.5), Math.floor(height * 0.08));
  const bottom = sample(Math.floor(width * 0.5), Math.floor(height * 0.92));
  const chromaDistance = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
  return chromaDistance(top, bottom) > chromaDistance(left, right) ? "vertical" : "horizontal";
}

function buildForegroundMask(imageData) {
  const data = imageData.data;
  const mask = new Uint8Array(imageData.width * imageData.height);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    const greenBg = g > 150 && r < 110 && b < 130 && g > r * 1.35 && g > b * 1.35;
    const magentaBg = r > 150 && b > 130 && g < 120 && r > g * 1.35 && b > g * 1.2;
    mask[j] = a > 10 && !greenBg && !magentaBg ? 1 : 0;
  }
  return mask;
}

function findBestMaskOffset(maskA, maskB, width, height, radius) {
  let best = { dx: 0, dy: 0, score: Infinity };
  const step = Math.max(2, Math.floor(Math.min(width, height) / 360));
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      let diff = 0;
      let count = 0;
      for (let y = radius; y < height - radius; y += step) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let x = radius; x < width - radius; x += step) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          diff += maskA[y * width + x] === maskB[yy * width + xx] ? 0 : 1;
          count += 1;
        }
      }
      const score = count ? diff / count : Infinity;
      if (score < best.score) best = { dx: -dx, dy: -dy, score };
    }
  }
  return best;
}

async function sendLatestAiDualBgToCutout() {
  if (!latestAiDualBgImage) return alert("还没有 AI 生成图。");
  const normalized = await normalizeDualBgSize(latestAiDualBgImage);
  const file = await imageUrlToFile(normalized, "ai-dual-background.png");
  if (typeof loadPairedAutoImageFromFile === "function") {
    await loadPairedAutoImageFromFile(file);
  } else if (typeof loadDualBackgroundImage === "function") {
    await loadDualBackgroundImage(file);
  } else {
    alert("没有找到双底色拆分入口，请把生成图下载后手动上传到“上传双底色图”。");
  }
}

async function normalizeDualBgSize(imageUrl) {
  const image = await loadImageElement(imageUrl);
  const orientation = detectImageOrientationBySize(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  if (orientation === "vertical") {
    const halfH = Math.floor(h / 2);
    canvas.width = w;
    canvas.height = halfH * 2;
    ctx.drawImage(image, 0, 0, w, halfH, 0, 0, w, halfH);
    ctx.drawImage(image, 0, halfH, w, halfH, 0, halfH, w, halfH);
  } else {
    const halfW = Math.floor(w / 2);
    canvas.width = halfW * 2;
    canvas.height = h;
    ctx.drawImage(image, 0, 0, halfW, h, 0, 0, halfW, h);
    ctx.drawImage(image, halfW, 0, halfW, h, halfW, 0, halfW, h);
  }
  return canvas.toDataURL("image/png");
}

function detectImageOrientationBySize(width, height) {
  return height > width * 1.15 ? "vertical" : "horizontal";
}

async function downloadLatestAiDualBg() {
  if (!latestAiDualBgImage) return alert("还没有 AI 生成图。");
  const a = document.createElement("a");
  a.href = latestAiDualBgImage;
  a.download = "ai-dual-background.png";
  a.click();
}

async function imageUrlToFile(url, filename) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

setTimeout(() => {
  forceInstallAiPreviewPanel();
  try {
    const savedAiImage = localStorage.getItem("latest_ai_dual_bg_image");
    if (savedAiImage) {
      latestAiDualBgImage = savedAiImage;
      showAiGeneratedDualBgPreview(savedAiImage);
    }
  } catch {
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    const requestUrl = String(args[0] && args[0].url ? args[0].url : args[0]);
    if (requestUrl.includes("/api/liblib/generate-dual-bg") || requestUrl.includes("/api/generate-dual-bg")) {
      response.clone().json().then((data) => {
        const image = data && (data.image || data.imageUrl || data.url);
        if (image) {
          window.__aiDualBgPreviewPending = true;
          showAiGeneratedDualBgPreview(image);
          setTimeout(() => {
            window.__aiDualBgPreviewPending = false;
          }, 15000);
        }
      }).catch(() => {});
    }
    return response;
  };

  try {
  if (typeof loadPairedAutoImageFromFile === "function" && !loadPairedAutoImageFromFile.__aiPreviewWrapped) {
    const originalLoadPairedAutoImageFromFile = loadPairedAutoImageFromFile;
    loadPairedAutoImageFromFile = async function patchedLoadPairedAutoImageFromFile(file, ...rest) {
      if (window.__aiDualBgPreviewPending) {
        showAiGeneratedDualBgPreview(file);
        window.__aiDualBgPreviewPending = false;
        return;
      }
      return originalLoadPairedAutoImageFromFile.call(this, file, ...rest);
    };
    loadPairedAutoImageFromFile.__aiPreviewWrapped = true;
  }
  } catch {
  }
}, 0);
const ACCESS_KEY = "ai_ui_cutout_access_ok";
const AUTH_TOKEN_KEY = "ai_ui_cutout_auth_token";
const LIBLIB_ACCESS_STORAGE = "ai_ui_cutout_liblib_access_key";
const LIBLIB_SECRET_STORAGE = "ai_ui_cutout_liblib_secret_key";
const MODEL_CHOICE_STORAGE = "dualBgModelChoice";

const ctx = els.mainCanvas.getContext("2d", { willReadFrequently: true });
let sourceImage = null;
let secondImage = null;
let prepImage = null;
let prepOutputs = null;
let sourceName = "ui";
let assets = [];
let cropImage = null;
let cropName = "crop";
let cropRect = { x: 0, y: 0, width: 1024, height: 768 };
let cropDrag = null;
let currentUser = null;
let creditCosts = { image2: 12, bananaPro: 18, liblib: 10 };

function currentModelChoice() {
  const allowed = new Set(["image2", "bananaPro"]);
  const saved = localStorage.getItem(MODEL_CHOICE_STORAGE);
  if (allowed.has(saved)) return saved;
  localStorage.setItem(MODEL_CHOICE_STORAGE, "image2");
  return "image2";
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

async function setupAccessGate() {
  const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (savedToken) {
    try {
      const data = await authFetch("/api/me");
      currentUser = data.user;
      creditCosts = data.creditCosts || creditCosts;
      renderAccountBar();
      return;
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }

  const gate = document.createElement("section");
  gate.className = "access-gate";
  gate.innerHTML = `
    <form class="access-box">
      <h2>访问验证</h2>
      <p>请输入账号和密码后继续使用。</p>
      <input name="username" autocomplete="username" placeholder="用户名" />
      <input name="password" type="password" autocomplete="current-password" placeholder="密码" />
      <button type="submit">进入网站</button>
      <span class="access-error" aria-live="polite"></span>
    </form>
  `;
  document.body.append(gate);

  const form = gate.querySelector("form");
  const usernameInput = gate.querySelector("input[name='username']");
  const passwordInput = gate.querySelector("input[name='password']");
  const error = gate.querySelector(".access-error");
  usernameInput.focus();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    try {
      const response = await fetch(`${apiBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameInput.value,
          password: passwordInput.value,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "登录失败");
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      currentUser = data.user;
      creditCosts = data.creditCosts || creditCosts;
      renderAccountBar();
      gate.remove();
      return;
    } catch (errorValue) {
      error.textContent = errorValue.message || "登录失败";
      passwordInput.value = "";
      passwordInput.focus();
    }
  });
}

function authHeaders(extra = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function authFetch(path, options = {}) {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...options,
    headers: authHeaders(options.headers || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.error || "请求失败");
  return data;
}

function renderAccountBar() {
  let bar = document.querySelector("#accountBar");
  if (!bar) {
    bar = document.createElement("section");
    bar.id = "accountBar";
    bar.className = "account-bar";
    document.body.insertBefore(bar, document.body.firstChild);
  }
  const isAdmin = currentUser?.username === "admin" && currentUser?.role === "admin";
  const selectedModel = currentModelChoice();
  const selectedCost = creditCosts[selectedModel] || creditCosts.image2;
  bar.innerHTML = `
    <div class="account-summary">
      <strong>${currentUser?.username || ""}</strong>
      <span>积分：<b id="creditBadge">${currentUser?.credits ?? 0}</b></span>
      <span id="modelCreditCost">当前模型预计消耗：${selectedCost} 分/张</span>
      <span>规则：Image2 ${creditCosts.image2} 分，Banana Pro ${creditCosts.bananaPro} 分，Liblib AI ${creditCosts.liblib} 分</span>
    </div>
    <div class="account-actions">
      ${isAdmin ? '<button type="button" id="toggleAdminPanelBtn">积分管理</button>' : ""}
      <button type="button" id="logoutBtn">退出</button>
    </div>
  `;
  bar.querySelector("#logoutBtn").addEventListener("click", () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    location.reload();
  });
  const adminButton = bar.querySelector("#toggleAdminPanelBtn");
  if (adminButton) adminButton.addEventListener("click", renderAdminPanel);
}

function updateCurrentUser(user) {
  if (!user) return;
  currentUser = user;
  const badge = document.querySelector("#creditBadge");
  if (badge) badge.textContent = user.credits;
}

function updateModelCreditCost() {
  const selectedModel = currentModelChoice();
  const selectedCost = creditCosts[selectedModel] || creditCosts.image2;
  const label = document.querySelector("#modelCreditCost");
  if (label) label.textContent = `当前模型预计消耗：${selectedCost} 分/张`;
}

function setupModelChoice() {
  if (!els.liblibModelMode) return;
  els.liblibModelMode.value = currentModelChoice();
  els.liblibModelMode.addEventListener("change", () => {
    const value = els.liblibModelMode.value === "bananaPro" ? "bananaPro" : "image2";
    localStorage.setItem(MODEL_CHOICE_STORAGE, value);
    els.liblibModelMode.value = value;
    updateModelCreditCost();
  });
}

async function renderAdminPanel() {
  let panel = document.querySelector("#adminCreditPanel");
  if (panel) {
    panel.remove();
    return;
  }
  panel = document.createElement("section");
  panel.id = "adminCreditPanel";
  panel.className = "admin-credit-panel";
  panel.innerHTML = `
    <div class="admin-credit-head">
      <h2>积分管理</h2>
      <button type="button" id="closeAdminPanelBtn">关闭</button>
    </div>
    <form id="adminUserForm" class="admin-user-form">
      <input name="username" placeholder="用户名" required />
      <input name="password" placeholder="新用户密码 / 留空不改" />
      <input name="credits" type="number" min="0" step="1" placeholder="积分" required />
      <button type="submit">保存/赠送积分</button>
    </form>
    <div id="adminUserList" class="admin-user-list">正在读取用户...</div>
    <span class="access-error" id="adminCreditError"></span>
  `;
  document.body.insertBefore(panel, document.body.children[1] || null);
  panel.querySelector("#closeAdminPanelBtn").addEventListener("click", () => panel.remove());
  panel.querySelector("#adminUserForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const error = panel.querySelector("#adminCreditError");
    error.textContent = "";
    try {
      await authFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.value,
          password: form.password.value,
          credits: Number(form.credits.value),
        }),
      });
      form.password.value = "";
      await refreshAdminUsers(panel);
    } catch (errorValue) {
      error.textContent = errorValue.message || "保存失败";
    }
  });
  await refreshAdminUsers(panel);
}

async function refreshAdminUsers(panel = document.querySelector("#adminCreditPanel")) {
  if (!panel) return;
  const list = panel.querySelector("#adminUserList");
  const data = await authFetch("/api/admin/users");
  list.innerHTML = data.users.map((user) => `
    <article class="admin-user-row">
      <span>${user.username}</span>
      <span>${user.role === "admin" ? "管理员" : "用户"}</span>
      <strong>${user.credits} 分</strong>
    </article>
  `).join("");
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

function switchPage(page) {
  const prepare = page === "prepare";
  els.preparePage.classList.toggle("is-hidden", !prepare);
  els.cutoutPage.classList.toggle("is-hidden", prepare);
  els.prepareTabBtn.classList.toggle("is-active", prepare);
  els.cutoutTabBtn.classList.toggle("is-active", !prepare);
}

function parsePreset() {
  const [width, height] = els.cropPreset.value.split("x").map(Number);
  return { width, height };
}

function loadCropSource(file) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    cropImage = image;
    cropName = file.name.replace(/\.[^.]+$/, "") || "crop";
    els.cropCanvas.hidden = false;
    els.cropSourceInput.disabled = true;
    els.removeCropImageBtn.hidden = false;
    els.cropUploadBox.classList.add("has-image");
    resetCropRect();
    drawCropCanvas();
    updateCropTools();
  };
  image.src = url;
}

function clearCropSource() {
  cropImage = null;
  cropName = "crop";
  cropDrag = null;
  els.cropSourceInput.value = "";
  els.cropSourceInput.disabled = false;
  els.cropCanvas.hidden = true;
  els.removeCropImageBtn.hidden = true;
  els.cropUploadBox.classList.remove("has-image");
  els.generateDualBgBtn.disabled = true;
  els.downloadCropBtn.disabled = true;
  els.copyPromptBtn.disabled = true;
  els.aiPromptText.value = "";
  els.pairAdvice.textContent = "等待上传图片";
  els.pairAdviceText.textContent = "选择裁切区域后，这里会提示建议使用左右还是上下双底色。";
  const canvasCtx = els.cropCanvas.getContext("2d");
  canvasCtx.clearRect(0, 0, els.cropCanvas.width, els.cropCanvas.height);
}

function resetCropRect() {
  if (!cropImage) return;
  const preset = parsePreset();
  const imageWidth = cropImage.naturalWidth || cropImage.width;
  const imageHeight = cropImage.naturalHeight || cropImage.height;
  cropRect.width = Math.min(preset.width, imageWidth);
  cropRect.height = Math.min(preset.height, imageHeight);
  cropRect.x = Math.round((imageWidth - cropRect.width) / 2);
  cropRect.y = Math.round((imageHeight - cropRect.height) / 2);
}

function getCropScale() {
  const canvas = els.cropCanvas;
  const imageWidth = cropImage?.naturalWidth || cropImage?.width || canvas.width;
  const displayWidth = canvas.clientWidth || canvas.width;
  return displayWidth / imageWidth;
}

function drawCropCanvas() {
  if (!cropImage) return;
  const canvas = els.cropCanvas;
  const canvasCtx = canvas.getContext("2d");
  const imageWidth = cropImage.naturalWidth || cropImage.width;
  const imageHeight = cropImage.naturalHeight || cropImage.height;
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  canvasCtx.clearRect(0, 0, imageWidth, imageHeight);
  canvasCtx.drawImage(cropImage, 0, 0);

  canvasCtx.save();
  canvasCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
  canvasCtx.fillRect(0, 0, imageWidth, cropRect.y);
  canvasCtx.fillRect(0, cropRect.y + cropRect.height, imageWidth, imageHeight - cropRect.y - cropRect.height);
  canvasCtx.fillRect(0, cropRect.y, cropRect.x, cropRect.height);
  canvasCtx.fillRect(cropRect.x + cropRect.width, cropRect.y, imageWidth - cropRect.x - cropRect.width, cropRect.height);
  canvasCtx.fillStyle = "rgba(255, 255, 255, 0.1)";
  canvasCtx.fillRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
  canvasCtx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  canvasCtx.lineWidth = Math.max(3, imageWidth / 500);
  canvasCtx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
  canvasCtx.restore();
}

function clampCropRect() {
  const imageWidth = cropImage.naturalWidth || cropImage.width;
  const imageHeight = cropImage.naturalHeight || cropImage.height;
  cropRect.x = clamp(cropRect.x, 0, imageWidth - cropRect.width);
  cropRect.y = clamp(cropRect.y, 0, imageHeight - cropRect.height);
}

function recommendedPairDirection() {
  const { width, height } = cropRect;
  const canHorizontal = width * 2 <= 1536 && height <= 1024;
  const canVertical = height * 2 <= 1536 && width <= 1024;
  if (els.pairDirection.value !== "auto") return els.pairDirection.value;
  if (canHorizontal && !canVertical) return "horizontal";
  if (canVertical && !canHorizontal) return "vertical";
  if (canHorizontal && canVertical) return width >= height ? "horizontal" : "vertical";
  return width >= height ? "vertical" : "horizontal";
}

function updateCropTools() {
  const hasImage = Boolean(cropImage);
  els.generateDualBgBtn.disabled = !hasImage;
  els.downloadCropBtn.disabled = !hasImage;
  els.copyPromptBtn.disabled = !hasImage;
  if (!hasImage) return;

  const direction = recommendedPairDirection();
  const outputWidth = direction === "horizontal" ? cropRect.width * 2 : cropRect.width;
  const outputHeight = direction === "horizontal" ? cropRect.height : cropRect.height * 2;
  const directionText = direction === "horizontal" ? "左右排列" : "上下排列";
  const tooLarge = outputWidth > 1536 || outputHeight > 1536;
  els.pairAdvice.textContent = `${directionText}：输出约 ${outputWidth} x ${outputHeight}`;
  els.pairAdviceText.textContent = tooLarge
    ? "这个裁切尺寸合成后可能超过常见 AI 输出尺寸，建议换更小预设或手动改另一种排列。"
    : "这个尺寸适合交给 AI 生成双底色图，后续可直接上传到拆分页。";
  els.aiPromptText.value = buildCropPrompt(direction);
}

function buildCropPrompt(direction) {
  const directionText = direction === "horizontal" ? "左右排列" : "上下排列";
  const firstText = direction === "horizontal" ? "左半边" : "上半边";
  const secondText = direction === "horizontal" ? "右半边" : "下半边";
  return [
    `请将我上传的这张裁切图处理成一张${directionText}的双底色图。`,
    `${firstText}背景改成纯绿色 #00FF00，${secondText}背景改成纯洋红色 #FF00FF。`,
    "两边的 UI 元素、文字、图标、光效、阴影、大小、位置、比例、裁切范围必须尽量完全一致。",
    "不要压缩 UI 元素，不要改变 UI 元素样式，不要新增内容，不要删除内容，只替换背景颜色。",
    "两块区域尺寸必须完全一致，方便后续从中间一刀裁开做双底色抠图。",
  ].join("\n");
}

function makeCropBlob() {
  const canvas = document.createElement("canvas");
  canvas.width = cropRect.width;
  canvas.height = cropRect.height;
  canvas.getContext("2d").drawImage(cropImage, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, cropRect.width, cropRect.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

async function generateDualBackgroundFromCrop() {
  if (!cropImage) return;
  els.generateDualBgBtn.disabled = true;
  els.generateDualBgBtn.textContent = "AI抠图中...";

  try {
    await ensureBackendReady();
    const cropBlob = await makeCropBlob();
    const cropDataUrl = await blobToDataUrl(cropBlob);
    const direction = recommendedPairDirection();
    const response = await fetch(`${apiBaseUrl()}/api/image2/generate-dual-bg`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        image: cropDataUrl,
        direction,
        width: cropRect.width,
        height: cropRect.height,
        prompt: buildCropPrompt(direction),
        modelMode: currentModelChoice(),
        modelChoice: currentModelChoice(),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "AI 生成失败");
    creditCosts = result.creditCosts || creditCosts;
    updateCurrentUser(result.user);
    updateModelCreditCost();

    const file = dataUrlToFile(result.image, `${cropName}_dual_bg.png`);
    switchPage("cutout");
    loadPairedAutoImageFromFile(file);
  } catch (error) {
    alert(`AI抠图失败：${error.message}`);
  } finally {
    els.generateDualBgBtn.disabled = false;
    els.generateDualBgBtn.textContent = "AI抠图";
  }
}

function setupLiblibKeyInputs() {
  els.liblibAccessKey.value = localStorage.getItem(LIBLIB_ACCESS_STORAGE) || "";
  els.liblibSecretKey.value = localStorage.getItem(LIBLIB_SECRET_STORAGE) || "";
  els.liblibAccessKey.addEventListener("input", () => {
    localStorage.setItem(LIBLIB_ACCESS_STORAGE, els.liblibAccessKey.value.trim());
  });
  els.liblibSecretKey.addEventListener("input", () => {
    localStorage.setItem(LIBLIB_SECRET_STORAGE, els.liblibSecretKey.value.trim());
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToFile(dataUrl, name) {
  const blob = dataUrlToBlob(dataUrl);
  return new File([blob], name, { type: blob.type || "image/png" });
}

function canvasPointToImagePoint(event) {
  const rect = els.cropCanvas.getBoundingClientRect();
  const scale = getCropScale();
  return {
    x: (event.clientX - rect.left) / scale,
    y: (event.clientY - rect.top) / scale,
  };
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
  if (!status.hasApiKey) throw new Error("本地 AI 服务配置不完整，请检查后端配置后重新启动服务。");
}

async function ensureBackendReady() {
  let response;
  try {
    response = await fetch(`${apiBaseUrl()}/api/health`, { cache: "no-store" });
  } catch {
    throw new Error("本地后端没有连接上。请先双击运行 start-ai-server.bat，然后用 http://localhost:8787 打开网站。");
  }

  const status = await response.json();
  if (!status.ok) throw new Error("本地后端状态异常。");
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
els.cutoutTabBtn.addEventListener("click", () => switchPage("cutout"));
els.prepareTabBtn.addEventListener("click", () => switchPage("prepare"));

els.cropSourceInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) loadCropSource(file);
});

els.removeCropImageBtn.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  clearCropSource();
});

els.cropPreset.addEventListener("change", () => {
  resetCropRect();
  drawCropCanvas();
  updateCropTools();
});

els.pairDirection.addEventListener("change", updateCropTools);

els.cropCanvas.addEventListener("pointerdown", (event) => {
  if (!cropImage) return;
  event.preventDefault();
  event.stopPropagation();
  const point = canvasPointToImagePoint(event);
  const inside =
    point.x >= cropRect.x &&
    point.x <= cropRect.x + cropRect.width &&
    point.y >= cropRect.y &&
    point.y <= cropRect.y + cropRect.height;
  if (!inside) return;
  cropDrag = { offsetX: point.x - cropRect.x, offsetY: point.y - cropRect.y };
  els.cropCanvas.classList.add("is-dragging");
  els.cropCanvas.setPointerCapture(event.pointerId);
});

els.cropCanvas.addEventListener("pointermove", (event) => {
  if (!cropImage || !cropDrag) return;
  event.preventDefault();
  event.stopPropagation();
  const point = canvasPointToImagePoint(event);
  cropRect.x = Math.round(point.x - cropDrag.offsetX);
  cropRect.y = Math.round(point.y - cropDrag.offsetY);
  clampCropRect();
  drawCropCanvas();
});

els.cropCanvas.addEventListener("pointerup", (event) => {
  if (!cropDrag) return;
  event.preventDefault();
  event.stopPropagation();
  cropDrag = null;
  els.cropCanvas.classList.remove("is-dragging");
  els.cropCanvas.releasePointerCapture(event.pointerId);
  updateCropTools();
});

els.downloadCropBtn.addEventListener("click", async () => {
  if (!cropImage) return;
  const blob = await makeCropBlob();
  await saveBlob(blob, `${cropName}_${cropRect.width}x${cropRect.height}.png`);
});

els.generateDualBgBtn.addEventListener("click", generateDualBackgroundFromCrop);

els.copyPromptBtn.addEventListener("click", async () => {
  if (!els.aiPromptText.value) return;
  await navigator.clipboard.writeText(els.aiPromptText.value);
  els.copyPromptBtn.textContent = "已复制";
  setTimeout(() => {
    els.copyPromptBtn.textContent = "复制提示词";
  }, 1200);
});

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
setupLiblibKeyInputs();
setupModelChoice();
updateLabels();
document.addEventListener("change", (event) => {
  if (event.target?.id === "dualBgModelSelect" || event.target?.id === "liblibModelMode") updateModelCreditCost();
});
/* AI dual-bg preview and alignment hotfix.
   This block is intentionally appended so it can repair older page layouts
   without depending on the current HTML structure. */
(() => {
  const PREVIEW_PANEL_ID = "aiGeneratedDualBgPanel";
  const PREVIEW_IMG_ID = "aiGeneratedDualBgPreview";
  let latestPreviewUrl = window.latestAiDualBgImage || "";
  let originalPreviewUrl = "";
  let latestAlignmentQuality = null;
  let autoAlignRunning = false;

  function ensureAiPreviewPanel() {
    let panel = document.getElementById(PREVIEW_PANEL_ID);
    if (!panel) {
      panel = document.createElement("section");
      panel.id = PREVIEW_PANEL_ID;
      panel.className = "ai-generated-preview-panel force-ai-preview-panel";
      const main = document.querySelector("main") || document.body;
      const anchors = Array.from(document.querySelectorAll("section, div, form"));
      const anchor = anchors.reverse().find((node) => {
        const text = node.textContent || "";
        return text.includes("左右排列：输出约") || text.includes("上下排列：输出约") || text.includes("生成模型");
      });
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(panel, anchor.nextSibling);
      } else {
        main.appendChild(panel);
      }
    }

    if (
      !panel.querySelector(`#${PREVIEW_IMG_ID}`) ||
      !panel.querySelector("#aiPreviewDownloadBtn") ||
      !panel.querySelector("#aiPreviewResetBtn")
    ) {
      panel.innerHTML = `
        <div class="ai-generated-preview-head">
          <div>
            <h3>AI 返回图预览</h3>
            <p>AI 生成完成后会显示在这里。先看质量，再下载或送去拆分。</p>
          </div>
          <div class="ai-generated-preview-actions">
            <button type="button" id="aiPreviewAlignBtn" class="secondary-button">自动校正</button>
            <button type="button" id="aiPreviewResetBtn" class="secondary-button">重置校正</button>
            <button type="button" id="aiPreviewSendBtn" class="primary-button">送去拆分</button>
            <button type="button" id="aiPreviewDownloadBtn" class="secondary-button">下载返回图</button>
          </div>
        </div>
        <div id="aiPreviewStatus" class="ai-alignment-status">等待 AI 返回双底色图。</div>
        <div id="aiPreviewEmpty" class="ai-generated-preview-empty">这里会显示生成后的绿底/洋红底图</div>
        <img id="${PREVIEW_IMG_ID}" alt="AI 生成的双底色图预览">
      `;
    }

    panel.style.display = "block";
    bindPreviewActions(panel);
    // Do not render from inside panel installation. Rendering calls this
    // installer again and would otherwise create an infinite recursion.
    return panel;
  }

  function bindPreviewActions(panel) {
    const downloadBtn = panel.querySelector("#aiPreviewDownloadBtn");
    const sendBtn = panel.querySelector("#aiPreviewSendBtn");
    const alignBtn = panel.querySelector("#aiPreviewAlignBtn");
    const resetBtn = panel.querySelector("#aiPreviewResetBtn");
    if (downloadBtn && !downloadBtn.dataset.bound) {
      downloadBtn.dataset.bound = "1";
      downloadBtn.addEventListener("click", () => downloadPreviewImage());
    }
    if (sendBtn && !sendBtn.dataset.bound) {
      sendBtn.dataset.bound = "1";
      sendBtn.addEventListener("click", () => sendPreviewToCutout());
    }
    if (alignBtn && !alignBtn.dataset.bound) {
      alignBtn.dataset.bound = "1";
      alignBtn.addEventListener("click", () => safeAlignPreviewImage());
    }
    if (resetBtn && !resetBtn.dataset.bound) {
      resetBtn.dataset.bound = "1";
      resetBtn.addEventListener("click", () => {
        if (!originalPreviewUrl) return alert("还没有可以重置的 AI 返回图。");
        latestAlignmentQuality = null;
        renderAiPreview(originalPreviewUrl, "已恢复 AI 最初返回图。", true);
      });
    }
  }

  function renderAiPreview(imageUrl, statusText, keepOriginal = false) {
    if (!keepOriginal) {
      originalPreviewUrl = imageUrl;
      latestAlignmentQuality = null;
    }
    latestPreviewUrl = imageUrl;
    window.latestAiDualBgImage = imageUrl;
    try { localStorage.setItem("latest_ai_dual_bg_image", imageUrl); } catch (_) {}
    const panel = ensureAiPreviewPanel();
    const img = panel.querySelector(`#${PREVIEW_IMG_ID}`);
    const empty = panel.querySelector("#aiPreviewEmpty");
    const status = panel.querySelector("#aiPreviewStatus");
    if (img) {
      img.src = imageUrl;
      img.style.display = "block";
    }
    if (empty) empty.style.display = "none";
    if (status) status.textContent = statusText || "AI 返回图已生成。";
    panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  async function imageUrlToFile(url, filename) {
    const res = await fetch(url);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || "image/png" });
  }

  async function downloadPreviewImage() {
    if (!latestPreviewUrl) return alert("还没有 AI 返回图。");
    const a = document.createElement("a");
    a.href = latestPreviewUrl;
    a.download = `ai-dual-bg-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function sendPreviewToCutout() {
    if (!latestPreviewUrl) return alert("还没有 AI 返回图。");
    if (latestAlignmentQuality !== null && latestAlignmentQuality < 62) {
      const proceed = confirm(`当前局部匹配度只有 ${latestAlignmentQuality}%，继续拆分可能出现彩色重影。仍然送去拆分吗？`);
      if (!proceed) return;
    }
    try {
      const file = await imageUrlToFile(latestPreviewUrl, `ai-dual-bg-${Date.now()}.png`);
      if (typeof window.loadPairedAutoImageFromFile === "function") {
        await window.loadPairedAutoImageFromFile(file);
      } else if (typeof loadPairedAutoImageFromFile === "function") {
        await loadPairedAutoImageFromFile(file);
      } else {
        alert("拆分入口还没准备好，请先切到图素拆分页再试。");
      }
    } catch (error) {
      alert(`送去拆分失败：${error.message || error}`);
    }
  }

  function loadImg(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function foregroundMask(data) {
    const mask = new Uint8Array(data.width * data.height);
    const px = data.data;
    let greenScore = 0;
    let magentaScore = 0;
    const sampleStep = Math.max(1, Math.floor((data.width * data.height) / 5000));
    for (let p = 0; p < data.width * data.height; p += sampleStep) {
      const i = p * 4;
      greenScore += Math.abs(px[i]) + Math.abs(255 - px[i + 1]) + Math.abs(px[i + 2]);
      magentaScore += Math.abs(255 - px[i]) + Math.abs(px[i + 1]) + Math.abs(255 - px[i + 2]);
    }
    const greenBackground = greenScore < magentaScore;
    for (let i = 0, p = 0; i < px.length; i += 4, p += 1) {
      const r = px[i], g = px[i + 1], b = px[i + 2];
      const distance = greenBackground
        ? Math.abs(r) + Math.abs(255 - g) + Math.abs(b)
        : Math.abs(255 - r) + Math.abs(g) + Math.abs(255 - b);
      mask[p] = distance > 115 ? 1 : 0;
    }
    return mask;
  }

  function scoreTransform(maskA, maskB, w, h, dx, dy, scale) {
    let score = 0;
    let count = 0;
    const cx = w / 2;
    const cy = h / 2;
    const step = Math.max(2, Math.floor(Math.min(w, h) / 220));
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (!maskA[y * w + x]) continue;
        const bx = Math.round((x + dx - cx) / scale + cx);
        const by = Math.round((y + dy - cy) / scale + cy);
        if (bx < 0 || bx >= w || by < 0 || by >= h) continue;
        count += 1;
        if (maskB[by * w + bx]) score += 1;
      }
    }
    return count ? score / count : 0;
  }

  function bestTransform(maskA, maskB, w, h) {
    let best = { dx: 0, dy: 0, scale: 1, score: -1 };
    const scales = [0.98, 0.99, 1, 1.01, 1.02];
    const radius = 24;
    for (const scale of scales) {
      for (let dy = -radius; dy <= radius; dy += 4) {
        for (let dx = -radius; dx <= radius; dx += 4) {
          const score = scoreTransform(maskA, maskB, w, h, dx, dy, scale);
          if (score > best.score) best = { dx, dy, scale, score };
        }
      }
    }
    return best;
  }

  async function alignPreviewImage() {
    if (!latestPreviewUrl) return alert("还没有 AI 返回图。");
    const panel = ensureAiPreviewPanel();
    const status = panel.querySelector("#aiPreviewStatus");
    if (status) status.textContent = "正在自动校正两半图的位置和轻微缩放...";
    autoAlignRunning = true;
    try {
      // Always calculate from the untouched AI return image. Repeated clicks
      // must never accumulate transforms from an earlier correction.
      const img = await loadImg(originalPreviewUrl || latestPreviewUrl);
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const vertical = h > w;
      const halfW = vertical ? w : Math.floor(w / 2);
      const halfH = vertical ? Math.floor(h / 2) : h;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const a = ctx.getImageData(0, 0, halfW, halfH);
      const bX = vertical ? 0 : halfW;
      const bY = vertical ? halfH : 0;
      const b = ctx.getImageData(bX, bY, halfW, halfH);
      const best = bestTransform(foregroundMask(a), foregroundMask(b), halfW, halfH);
      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      const outCtx = out.getContext("2d");
      outCtx.drawImage(canvas, 0, 0);
      outCtx.clearRect(bX, bY, halfW, halfH);
      const dw = Math.round(halfW * best.scale);
      const dh = Math.round(halfH * best.scale);
      outCtx.drawImage(
        canvas,
        bX,
        bY,
        halfW,
        halfH,
        bX - best.dx + Math.round((halfW - dw) / 2),
        bY - best.dy + Math.round((halfH - dh) / 2),
        dw,
        dh
      );
      const quality = Math.round(Math.max(0, Math.min(1, best.score)) * 100);
      const qualityText = quality >= 82 ? "匹配良好" : quality >= 68 ? "匹配一般，请检查重影" : "差异较大，建议重新生成";
      renderAiPreview(
        out.toDataURL("image/png"),
        `已从原始返图重新校正：位移 ${-best.dx}, ${-best.dy}，缩放 ${(best.scale * 100).toFixed(1)}%，匹配度 ${quality}%（${qualityText}）。`,
        true
      );
    } catch (error) {
      if (status) status.textContent = `自动校正失败：${error.message || error}`;
    } finally {
      autoAlignRunning = false;
    }
  }

  function nextPaint() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function median3(a, b, c) {
    return Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
  }

  function makeEdgeMap(imageData) {
    const { width: w, height: h, data } = imageData;
    const lum = new Float32Array(w * h);
    const edge = new Float32Array(w * h);
    for (let p = 0, i = 0; p < lum.length; p += 1, i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const nearGreen = g > 150 && g > r * 1.45 && g > b * 1.35;
      const nearMagenta = r > 145 && b > 145 && g < Math.min(r, b) * 0.7;
      lum[p] = nearGreen || nearMagenta ? 0 : (r * 0.299 + g * 0.587 + b * 0.114);
    }
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const p = y * w + x;
        const gx = lum[p + 1] - lum[p - 1];
        const gy = lum[p + w] - lum[p - w];
        edge[p] = Math.min(255, Math.abs(gx) + Math.abs(gy));
      }
    }
    return edge;
  }

  function localOffset(edgeA, edgeB, w, h, x0, y0, x1, y1, radius) {
    let best = { dx: 0, dy: 0, score: -Infinity };
    const step = 5;
    for (let dy = -radius; dy <= radius; dy += 3) {
      for (let dx = -radius; dx <= radius; dx += 3) {
        let same = 0;
        let energy = 0;
        for (let y = y0 + 3; y < y1 - 3; y += step) {
          const by = y + dy;
          if (by < 1 || by >= h - 1) continue;
          for (let x = x0 + 3; x < x1 - 3; x += step) {
            const bx = x + dx;
            if (bx < 1 || bx >= w - 1) continue;
            const a = edgeA[y * w + x];
            const b = edgeB[by * w + bx];
            if (a < 18 && b < 18) continue;
            same += Math.min(a, b);
            energy += Math.max(a, b);
          }
        }
        const score = (energy ? same / energy : 0) - Math.hypot(dx, dy) * 0.0015;
        if (score > best.score) best = { dx, dy, score };
      }
    }
    return best;
  }

  function sampleBilinear(data, w, h, x, y, channel) {
    x = Math.max(0, Math.min(w - 1.001, x));
    y = Math.max(0, Math.min(h - 1.001, y));
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
    const tx = x - x0, ty = y - y0;
    const p00 = data[(y0 * w + x0) * 4 + channel];
    const p10 = data[(y0 * w + x1) * 4 + channel];
    const p01 = data[(y1 * w + x0) * 4 + channel];
    const p11 = data[(y1 * w + x1) * 4 + channel];
    return (p00 * (1 - tx) + p10 * tx) * (1 - ty) + (p01 * (1 - tx) + p11 * tx) * ty;
  }

  function interpolateGrid(grid, cols, rows, w, h, x, y) {
    const gx = Math.max(0, Math.min(cols - 1.001, x / w * cols - 0.5));
    const gy = Math.max(0, Math.min(rows - 1.001, y / h * rows - 0.5));
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const x1 = Math.min(cols - 1, x0 + 1), y1 = Math.min(rows - 1, y0 + 1);
    const tx = gx - x0, ty = gy - y0;
    const a = grid[y0 * cols + x0], b = grid[y0 * cols + x1];
    const c = grid[y1 * cols + x0], d = grid[y1 * cols + x1];
    return {
      dx: (a.dx * (1 - tx) + b.dx * tx) * (1 - ty) + (c.dx * (1 - tx) + d.dx * tx) * ty,
      dy: (a.dy * (1 - tx) + b.dy * tx) * (1 - ty) + (c.dy * (1 - tx) + d.dy * tx) * ty
    };
  }

  async function advancedAlignPreviewImage() {
    if (autoAlignRunning) return;
    const sourceUrl = originalPreviewUrl || latestPreviewUrl;
    if (!sourceUrl) return alert("还没有 AI 返回图。");
    const panel = ensureAiPreviewPanel();
    const status = panel.querySelector("#aiPreviewStatus");
    autoAlignRunning = true;
    if (status) status.textContent = "正在进行分区域对齐和透明颜色重建，请稍候...";
    try {
      const img = await loadImg(sourceUrl);
      const fullW = img.naturalWidth || img.width;
      const fullH = img.naturalHeight || img.height;
      const vertical = fullH > fullW;
      const w = vertical ? fullW : Math.floor(fullW / 2);
      const h = vertical ? Math.floor(fullH / 2) : fullH;
      const canvas = document.createElement("canvas");
      canvas.width = fullW;
      canvas.height = fullH;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const bx = vertical ? 0 : w;
      const by = vertical ? h : 0;
      const first = ctx.getImageData(0, 0, w, h);
      const second = ctx.getImageData(bx, by, w, h);
      const edgeA = makeEdgeMap(first);
      const edgeB = makeEdgeMap(second);
      const cols = 7, rows = 7;
      const grid = [];
      let scoreSum = 0;
      for (let gy = 0; gy < rows; gy += 1) {
        for (let gx = 0; gx < cols; gx += 1) {
          const x0 = Math.floor(gx * w / cols);
          const y0 = Math.floor(gy * h / rows);
          const x1 = Math.floor((gx + 1) * w / cols);
          const y1 = Math.floor((gy + 1) * h / rows);
          const offset = localOffset(edgeA, edgeB, w, h, x0, y0, x1, y1, 9);
          if (offset.score < 0.08) {
            offset.dx = 0;
            offset.dy = 0;
          }
          grid.push(offset);
          scoreSum += offset.score;
        }
        await nextPaint();
      }
      const warped = new ImageData(w, h);
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const flow = interpolateGrid(grid, cols, rows, w, h, x, y);
          const p = (y * w + x) * 4;
          for (let c = 0; c < 3; c += 1) warped.data[p + c] = sampleBilinear(second.data, w, h, x + flow.dx, y + flow.dy, c);
          warped.data[p + 3] = 255;
        }
        if (y % 80 === 0) await nextPaint();
      }

      // Reconstruct one canonical foreground/alpha pair from the two aligned
      // chroma backgrounds, then render both halves from exactly that pair.
      const greenFirst = (() => {
        let g = 0, m = 0;
        for (let p = 0; p < first.data.length; p += 160) {
          g += Math.abs(first.data[p]) + Math.abs(255 - first.data[p + 1]) + Math.abs(first.data[p + 2]);
          m += Math.abs(255 - first.data[p]) + Math.abs(first.data[p + 1]) + Math.abs(255 - first.data[p + 2]);
        }
        return g < m;
      })();
      const green = greenFirst ? first : warped;
      const magenta = greenFirst ? warped : first;
      let sourceReference = null;
      const sourceCropUrl = window.__latestAiSourceCrop || (() => {
        try { return localStorage.getItem("latest_ai_source_crop"); } catch (_) { return null; }
      })();
      if (sourceCropUrl) {
        try {
          const sourceImg = await loadImg(sourceCropUrl);
          const sourceCanvas = document.createElement("canvas");
          sourceCanvas.width = w;
          sourceCanvas.height = h;
          sourceCanvas.getContext("2d").drawImage(sourceImg, 0, 0, w, h);
          sourceReference = sourceCanvas.getContext("2d").getImageData(0, 0, w, h);
        } catch (_) {}
      }
      const outFirst = new ImageData(w, h);
      const outSecond = new ImageData(w, h);
      for (let p = 0; p < green.data.length; p += 4) {
        const tR = (magenta.data[p] - green.data[p]) / 255;
        const tG = (green.data[p + 1] - magenta.data[p + 1]) / 255;
        const tB = (magenta.data[p + 2] - green.data[p + 2]) / 255;
        const transparency = Math.max(0, Math.min(1, median3(tR, tG, tB)));
        const alpha = 1 - transparency;
        const fg = [0, 0, 0];
        if (alpha > 0.025) {
          fg[0] = Math.max(0, Math.min(255, ((green.data[p] + magenta.data[p] - transparency * 255) / 2) / alpha));
          fg[1] = Math.max(0, Math.min(255, ((green.data[p + 1] + magenta.data[p + 1] - transparency * 255) / 2) / alpha));
          fg[2] = Math.max(0, Math.min(255, ((green.data[p + 2] + magenta.data[p + 2] - transparency * 255) / 2) / alpha));
        }
        // Opaque UI pixels should keep the uploaded crop's original RGB.
        // Semi-transparent edge pixels instead use the two-background solve,
        // followed by a conservative chroma-spill cleanup.
        if (sourceReference && alpha > 0.82) {
          const mix = Math.min(1, (alpha - 0.82) / 0.16);
          for (let c = 0; c < 3; c += 1) fg[c] = fg[c] * (1 - mix) + sourceReference.data[p + c] * mix;
        } else if (alpha > 0.04 && alpha < 0.9) {
          const maxRB = Math.max(fg[0], fg[2]);
          const greenExcess = fg[1] - maxRB;
          if (greenExcess > 22) fg[1] -= greenExcess * Math.min(0.72, (0.9 - alpha) * 0.9);
          const minRB = Math.min(fg[0], fg[2]);
          const magentaExcess = minRB - fg[1];
          if (magentaExcess > 22) {
            const amount = magentaExcess * Math.min(0.62, (0.9 - alpha) * 0.8);
            fg[0] -= amount;
            fg[2] -= amount;
          }
        }
        for (let c = 0; c < 3; c += 1) {
          outFirst.data[p + c] = greenFirst
            ? alpha * fg[c] + transparency * (c === 1 ? 255 : 0)
            : alpha * fg[c] + transparency * (c === 1 ? 0 : 255);
          outSecond.data[p + c] = greenFirst
            ? alpha * fg[c] + transparency * (c === 1 ? 0 : 255)
            : alpha * fg[c] + transparency * (c === 1 ? 255 : 0);
        }
        outFirst.data[p + 3] = 255;
        outSecond.data[p + 3] = 255;
        if ((p / 4) % (w * 100) === 0) await nextPaint();
      }
      const out = document.createElement("canvas");
      out.width = fullW;
      out.height = fullH;
      const outCtx = out.getContext("2d");
      outCtx.putImageData(outFirst, 0, 0);
      outCtx.putImageData(outSecond, bx, by);
      const quality = Math.round(scoreSum / grid.length * 100);
      latestAlignmentQuality = quality;
      const label = quality >= 78 ? "匹配良好" : quality >= 62 ? "仍有局部差异，请放大检查" : "两半差异过大，建议重新生成";
      renderAiPreview(out.toDataURL("image/png"), `局部校正完成：匹配度 ${quality}%（${label}）。`, true);
    } catch (error) {
      if (status) status.textContent = `局部校正失败：${error.message || error}`;
    } finally {
      autoAlignRunning = false;
    }
  }

  function globalEdgeScore(edgeA, edgeB, w, h, dx, dy) {
    let same = 0;
    let energy = 0;
    const step = Math.max(3, Math.floor(Math.min(w, h) / 260));
    for (let y = 3; y < h - 3; y += step) {
      const by = y + dy;
      if (by < 1 || by >= h - 1) continue;
      for (let x = 3; x < w - 3; x += step) {
        const bx = x + dx;
        if (bx < 1 || bx >= w - 1) continue;
        const a = edgeA[y * w + x];
        const b = edgeB[by * w + bx];
        if (a < 20 && b < 20) continue;
        same += Math.min(a, b);
        energy += Math.max(a, b);
      }
    }
    return energy ? same / energy : 0;
  }

  async function safeAlignPreviewImage() {
    if (autoAlignRunning) return;
    const sourceUrl = originalPreviewUrl || latestPreviewUrl;
    if (!sourceUrl) return alert("还没有 AI 返回图。");
    const panel = ensureAiPreviewPanel();
    const status = panel.querySelector("#aiPreviewStatus");
    autoAlignRunning = true;
    if (status) status.textContent = "正在进行保守对齐检测...";
    try {
      const img = await loadImg(sourceUrl);
      const fullW = img.naturalWidth || img.width;
      const fullH = img.naturalHeight || img.height;
      const vertical = fullH > fullW;
      const w = vertical ? fullW : Math.floor(fullW / 2);
      const h = vertical ? Math.floor(fullH / 2) : fullH;
      const bx = vertical ? 0 : w;
      const by = vertical ? h : 0;
      const canvas = document.createElement("canvas");
      canvas.width = fullW;
      canvas.height = fullH;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const first = ctx.getImageData(0, 0, w, h);
      const second = ctx.getImageData(bx, by, w, h);
      const edgeA = makeEdgeMap(first);
      const edgeB = makeEdgeMap(second);
      const baseScore = globalEdgeScore(edgeA, edgeB, w, h, 0, 0);
      let best = { dx: 0, dy: 0, score: baseScore };
      for (let dy = -8; dy <= 8; dy += 1) {
        for (let dx = -8; dx <= 8; dx += 1) {
          const score = globalEdgeScore(edgeA, edgeB, w, h, dx, dy) - Math.hypot(dx, dy) * 0.0008;
          if (score > best.score) best = { dx, dy, score };
        }
        if (dy % 4 === 0) await nextPaint();
      }
      const improvement = best.score - baseScore;
      const basePercent = Math.round(baseScore * 100);
      if ((best.dx === 0 && best.dy === 0) || improvement < 0.012) {
        latestAlignmentQuality = basePercent;
        renderAiPreview(sourceUrl, `检测完成：两半图不需要整体移动，保持 AI 原图。匹配度 ${basePercent}%。`, true);
        return;
      }
      const out = document.createElement("canvas");
      out.width = fullW;
      out.height = fullH;
      const outCtx = out.getContext("2d");
      outCtx.drawImage(canvas, 0, 0);
      outCtx.clearRect(bx, by, w, h);
      // dx/dy describe where matching pixels were found in the second half;
      // move the second half in the opposite direction to overlap the first.
      outCtx.drawImage(canvas, bx, by, w, h, bx - best.dx, by - best.dy, w, h);
      const quality = Math.round(best.score * 100);
      latestAlignmentQuality = quality;
      renderAiPreview(out.toDataURL("image/png"), `保守校正完成：移动 ${-best.dx}, ${-best.dy}，匹配度由 ${basePercent}% 提升到 ${quality}%。`, true);
    } catch (error) {
      if (status) status.textContent = `校正失败，已保留 AI 原图：${error.message || error}`;
    } finally {
      autoAlignRunning = false;
    }
  }

  function extractImageFromResponse(data) {
    return data?.image || data?.imageUrl || data?.url || data?.result?.image || data?.result?.imageUrl || data?.data?.image || data?.data?.imageUrl || data?.data?.url;
  }

  if (typeof window.fetch === "function" && !window.fetch.__aiPreviewRepairPatched) {
    const rawFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const response = await rawFetch(...args);
      try {
        const url = String(args[0]?.url || args[0] || "");
        const isDualBgApi = url.includes("/api/image2/generate-dual-bg") || url.includes("/api/liblib/generate-dual-bg") || url.includes("/api/generate-dual-bg");
        if (isDualBgApi) {
          try {
            const body = args[1]?.body;
            if (typeof body === "string") {
              const parsed = JSON.parse(body);
              if (parsed?.image) {
                window.__latestAiSourceCrop = parsed.image;
                localStorage.setItem("latest_ai_source_crop", parsed.image);
              }
            }
          } catch (_) {}
          response.clone().json().then((data) => {
            const image = extractImageFromResponse(data);
            if (image) {
              setTimeout(() => renderAiPreview(image, "AI 返回图已生成。"), 80);
            }
          }).catch(() => {});
        }
      } catch (_) {}
      return response;
    };
    window.fetch.__aiPreviewRepairPatched = true;
  }

  window.showAiGeneratedDualBgPreview = renderAiPreview;
  window.alignLatestAiDualBg = alignPreviewImage;
  window.addEventListener("DOMContentLoaded", ensureAiPreviewPanel);
  setTimeout(ensureAiPreviewPanel, 120);
  setTimeout(ensureAiPreviewPanel, 800);
})();

/* AI preparation UX enhancements. Runs once and never observes/scans the page
   continuously, so it cannot block the main UI. */
(() => {
  const PRESETS = {
    ui: `请将裁切区域制作为一张双底色图。除背景外，UI 控件、文字、图标、半透明面板、光效、阴影、尺寸、比例、位置与裁切范围必须完全一致。不要重绘、增删、移动或缩放任何前景内容。绿色背景使用 #00FF00，洋红背景使用 #FF00FF，两块区域大小必须完全相同。`,
    character: `请将裁切区域中的人物及其服装、头发、饰品、武器和附属特效完整保留，制作为一张双底色图。人物姿势、表情、轮廓、大小和位置必须完全一致，不得重绘或改变细节。绿色背景使用 #00FF00，洋红背景使用 #FF00FF，两块区域大小必须完全相同。`,
    effect: `请将裁切区域中的光效、粒子、烟雾、火焰、拖尾、辉光和半透明特效完整保留，制作为一张双底色图。不得改变特效形状、亮度、透明度、颜色、大小和位置。绿色背景使用 #00FF00，洋红背景使用 #FF00FF，两块区域大小必须完全相同。`
  };

  function findTextElement(text) {
    return Array.from(document.querySelectorAll("h1,h2,h3,h4,label,p,div,span")).find((el) => (el.textContent || "").trim() === text);
  }

  function movePreviewBelowImport() {
    const panel = document.getElementById("aiGeneratedDualBgPanel");
    const title = findTextElement("AI 双底色图导入");
    if (!panel || !title) return;
    let box = title;
    while (box.parentElement && box.parentElement !== document.body) {
      const text = box.textContent || "";
      if (text.includes("上传双底色图") && text.includes("推荐流程")) break;
      box = box.parentElement;
    }
    if (box.parentNode) box.parentNode.insertBefore(panel, box.nextSibling);
  }

  function hideProviderKeyInputs() {
    const keyInputs = Array.from(document.querySelectorAll(
      'input[id*="liblib" i], input[name*="liblib" i], input[placeholder*="liblib" i], input[id*="accesskey" i], input[id*="secretkey" i]'
    ));
    for (const input of keyInputs) {
      input.style.display = "none";
      if (input.id) {
        const linked = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
        if (linked) linked.style.display = "none";
      }
      const row = input.parentElement;
      if (row && !row.querySelector("button,textarea,select") && row.querySelectorAll("input").length === 1) {
        row.style.display = "none";
      }
    }
    const labels = Array.from(document.querySelectorAll("label,div,p,span"));
    for (const el of labels) {
      const text = (el.textContent || "").trim();
      if (text !== "Liblib AccessKey" && text !== "Liblib SecretKey") continue;
      el.style.display = "none";
      const parent = el.parentElement;
      const input = parent && parent.querySelector("input");
      if (input) input.style.display = "none";
    }
  }

  function installPromptPresets() {
    const textareas = Array.from(document.querySelectorAll("textarea"));
    const textarea = textareas.find((el) => {
      const value = el.value || el.textContent || "";
      return value.includes("双底色图") || value.includes("#00FF00") || value.includes("洋红");
    }) || textareas.sort((a, b) => (b.value || "").length - (a.value || "").length)[0];
    if (!textarea || document.getElementById("aiPromptPresetBar")) return;
    const wrap = document.createElement("div");
    wrap.id = "aiPromptPresetBar";
    wrap.className = "ai-prompt-preset-wrap";
    wrap.innerHTML = `
      <label for="aiPromptPreset">提示词方案</label>
      <select id="aiPromptPreset">
        <option value="ui">UI 控件</option>
        <option value="character">人物资源</option>
        <option value="effect">特效资源</option>
        <option value="custom">自定义</option>
      </select>
      <p>选择预设后仍可直接修改下面的提示词。</p>
    `;
    textarea.parentNode.insertBefore(wrap, textarea);
    wrap.insertBefore(textarea, wrap.querySelector("p"));
    textarea.style.width = "100%";
    textarea.style.maxWidth = "100%";
    textarea.style.boxSizing = "border-box";
    const select = wrap.querySelector("select");
    select.addEventListener("change", () => {
      textarea.disabled = false;
      textarea.readOnly = false;
      textarea.removeAttribute("disabled");
      textarea.removeAttribute("readonly");
      textarea.style.pointerEvents = "auto";
      textarea.style.userSelect = "text";
      if (select.value !== "custom") textarea.value = PRESETS[select.value];
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      if (select.value === "custom") {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    });
    textarea.disabled = false;
    textarea.readOnly = false;
    textarea.removeAttribute("disabled");
    textarea.removeAttribute("readonly");
  }

  function installCropZoom() {
    if (document.getElementById("cropImageZoom")) return;
    const presetTitle = findTextElement("裁切预设");
    if (!presetTitle) return;
    const control = document.createElement("div");
    control.className = "crop-zoom-control";
    control.innerHTML = `
      <label for="cropImageZoom">画面缩放 <strong id="cropImageZoomValue">100%</strong></label>
      <input id="cropImageZoom" type="range" min="40" max="200" value="100" step="1">
      <button type="button" id="cropImageZoomReset" class="secondary-button">恢复 100%</button>
    `;
    presetTitle.parentNode.insertBefore(control, presetTitle);
    const slider = control.querySelector("input");
    const value = control.querySelector("strong");
    const reset = control.querySelector("button");
    const apply = () => {
      const scale = Number(slider.value) / 100;
      value.textContent = `${slider.value}%`;
      window.__cropImageZoom = scale;
      document.documentElement.style.setProperty("--crop-image-zoom", String(scale));
      let scope = presetTitle.parentElement;
      while (scope && scope.parentElement && !scope.querySelector("img,canvas")) scope = scope.parentElement;
      const allVisibleMedia = Array.from(document.querySelectorAll("canvas,img")).filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 300 && rect.height > 180 && style.display !== "none" && style.visibility !== "hidden";
      });
      const scopedMedia = scope ? Array.from(scope.querySelectorAll("canvas,img")) : [];
      const mediaList = scopedMedia.length ? scopedMedia : allVisibleMedia;
      const media = mediaList
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 300 && rect.height > 180;
        })
        .sort((a, b) => (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight))[0];
      if (media) {
        if (media.tagName === "CANVAS") {
          window.__cropZoomCanvas = media;
          media.dataset.cropZoomTarget = "1";
          media.style.transform = "none";
          updateSeparatedCropPreview(media, scale);
        } else {
          media.style.transformOrigin = "center center";
          media.style.transform = `scale(${scale})`;
          media.style.willChange = "transform";
          media.style.transition = "transform 80ms linear";
        }

        // The crop frame is a separate overlay in the current editor. Keep it
        // at its fixed preset size while the bitmap/canvas underneath zooms.
        const candidates = scope ? Array.from(scope.querySelectorAll("div,section")) : [];
        for (const el of candidates) {
          if (el.contains(media) || media.contains(el)) continue;
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          const looksLikeCropFrame =
            (style.position === "absolute" || style.position === "fixed") &&
            rect.width > 120 && rect.height > 120 &&
            (parseFloat(style.borderTopWidth) > 0 || parseFloat(style.outlineWidth) > 0);
          if (looksLikeCropFrame) {
            el.style.transform = "none";
            el.style.transformOrigin = "center center";
          }
        }
      }
      // Give the existing crop editor a chance to redraw its canvas using the
      // new scale without changing the fixed selection dimensions.
      window.dispatchEvent(new Event("resize"));
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
      window.dispatchEvent(new CustomEvent("cropimagezoomchange", { detail: { scale } }));
    };
    slider.addEventListener("input", apply);
    reset.addEventListener("click", () => { slider.value = "100"; apply(); });
    apply();
  }

  function installCanvasImageZoomHook() {
    if (CanvasRenderingContext2D.prototype.__cropZoomHooked) return;
    const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
    if (!window.__cropCanvasSources) window.__cropCanvasSources = new WeakMap();
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      const scale = Number(window.__cropImageZoom || 1);
      const target = window.__cropZoomCanvas;
      const source = args[0];
      const isBitmap = source && (
        source.tagName === "IMG" ||
        source.tagName === "CANVAS" ||
        source.tagName === "VIDEO" ||
        (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap)
      );
      if (isBitmap && this.canvas.width > 500 && this.canvas.height > 250) {
        window.__cropCanvasSources.set(this.canvas, { source, args: args.slice(1) });
      }
      return originalDrawImage.apply(this, args);
    };
    CanvasRenderingContext2D.prototype.__cropZoomHooked = true;
  }

  function detectCropRect(canvas) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const w = canvas.width, h = canvas.height;
    if (!w || !h) return null;
    const data = ctx.getImageData(0, 0, w, h).data;
    const xs = new Map(), ys = new Map();
    const step = Math.max(1, Math.floor(Math.max(w, h) / 1400));
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const p = (y * w + x) * 4;
        const r = data[p], g = data[p + 1], b = data[p + 2], a = data[p + 3];
        if (a > 150 && r > 155 && g > 155 && b > 155 && Math.max(r, g, b) - Math.min(r, g, b) < 28) {
          xs.set(x, (xs.get(x) || 0) + 1);
          ys.set(y, (ys.get(y) || 0) + 1);
        }
      }
    }
    const xLines = Array.from(xs).filter(([, n]) => n > h / step * 0.24).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([v]) => v).sort((a, b) => a - b);
    const yLines = Array.from(ys).filter(([, n]) => n > w / step * 0.18).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([v]) => v).sort((a, b) => a - b);
    if (xLines.length < 2 || yLines.length < 2) return null;
    const left = xLines[0], right = xLines[xLines.length - 1];
    const top = yLines[0], bottom = yLines[yLines.length - 1];
    if (right - left < w * 0.12 || bottom - top < h * 0.12) return null;
    return { left, top, right, bottom };
  }

  function updateSeparatedCropPreview(canvas, scale) {
    const parent = canvas.parentElement;
    if (!parent) return;
    canvas.style.visibility = "visible";
    canvas.style.opacity = "0";
    canvas.style.pointerEvents = "auto";
    let layer = parent.querySelector(":scope > .crop-image-zoom-layer");
    if (!layer) {
      const rect = detectCropRect(canvas);
      layer = document.createElement("canvas");
      layer.className = "crop-image-zoom-layer";
      layer.width = canvas.width;
      layer.height = canvas.height;
      layer.dataset.cropRect = rect ? JSON.stringify(rect) : "";
      parent.style.position = "relative";
      layer.style.position = "absolute";
      layer.style.inset = "0";
      layer.style.width = "100%";
      layer.style.height = "100%";
      layer.style.pointerEvents = "none";
      parent.insertBefore(layer, canvas.nextSibling);
      canvas.style.opacity = "0";
      canvas.style.pointerEvents = "auto";
      const sync = () => requestAnimationFrame(() => updateSeparatedCropPreview(canvas, Number(window.__cropImageZoom || 1)));
      canvas.addEventListener("pointerdown", sync);
      canvas.addEventListener("pointermove", (event) => { if (event.buttons) sync(); });
      canvas.addEventListener("pointerup", sync);
      canvas.addEventListener("mousedown", sync);
      canvas.addEventListener("mousemove", (event) => { if (event.buttons) sync(); });
      canvas.addEventListener("mouseup", sync);
      parent.addEventListener("change", sync);
      parent.addEventListener("input", (event) => {
        if (event.target !== document.getElementById("cropImageZoom")) sync();
      });
    }
    const ctx = layer.getContext("2d");
    const sourceW = canvas.width, sourceH = canvas.height;
    ctx.clearRect(0, 0, sourceW, sourceH);
    const captured = window.__cropCanvasSources && window.__cropCanvasSources.get(canvas);
    ctx.save();
    ctx.translate(sourceW / 2, sourceH / 2);
    ctx.scale(scale, scale);
    ctx.translate(-sourceW / 2, -sourceH / 2);
    if (captured && captured.source) {
      ctx.drawImage(captured.source, ...captured.args);
    } else {
      // Ask the crop editor to redraw once so the drawImage hook can capture
      // its raw uploaded bitmap. Avoid copying the composited frame canvas.
      window.dispatchEvent(new Event("resize"));
      const retry = window.__cropCanvasSources && window.__cropCanvasSources.get(canvas);
      if (retry && retry.source) ctx.drawImage(retry.source, ...retry.args);
    }
    ctx.restore();

    // Read the latest frame after every drag/preset change. The raw bitmap
    // above never contains a frame, so only this fixed overlay frame remains.
    const latestRect = detectCropRect(canvas);
    if (latestRect) layer.dataset.cropRect = JSON.stringify(latestRect);
    let cropRect = latestRect;
    if (!cropRect) {
      try { cropRect = JSON.parse(layer.dataset.cropRect || "null"); } catch (_) {}
    }
    if (cropRect) {
      const { left, top, right, bottom } = cropRect;
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,.82)";
      ctx.lineWidth = Math.max(1, sourceW / 1100);
      ctx.fillStyle = "rgba(255,255,255,.10)";
      ctx.fillRect(left, top, right - left, bottom - top);
      ctx.strokeRect(left, top, right - left, bottom - top);
      ctx.restore();
    }
  }

  function clearSeparatedCropPreview() {
    document.querySelectorAll(".crop-image-zoom-layer").forEach((layer) => layer.remove());
    document.querySelectorAll('canvas[data-crop-zoom-target="1"]').forEach((canvas) => {
      canvas.style.opacity = "";
      canvas.style.visibility = "";
      canvas.style.transform = "";
      canvas.style.pointerEvents = "";
      delete canvas.dataset.cropZoomTarget;
      if (window.__cropCanvasSources) window.__cropCanvasSources.delete(canvas);
    });
    window.__cropZoomCanvas = null;
  }

  function installOnce() {
    installCanvasImageZoomHook();
    movePreviewBelowImport();
    hideProviderKeyInputs();
    installPromptPresets();
    installCropZoom();
  }

  window.addEventListener("DOMContentLoaded", () => setTimeout(installOnce, 180));
  setTimeout(installOnce, 900);
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button, [role='tab']");
    if (!button) return;
    const text = (button.textContent || "").trim();
    if (text.includes("界面抠图")) setTimeout(installOnce, 120);
    const isRemoveButton =
      text === "×" || text === "✕" || text === "X" ||
      /remove|delete|close|清除|删除|移除/i.test(button.getAttribute("aria-label") || button.getAttribute("title") || "");
    if (isRemoveButton) {
      clearSeparatedCropPreview();
      const zoom = document.getElementById("cropImageZoom");
      if (zoom) {
        zoom.value = "100";
        zoom.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  });
  document.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.type !== "file") return;
    clearSeparatedCropPreview();
    setTimeout(() => {
      installCropZoom();
      const zoom = document.getElementById("cropImageZoom");
      if (zoom) zoom.dispatchEvent(new Event("input", { bubbles: true }));
    }, 350);
  });
})();
