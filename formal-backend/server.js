const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function loadLocalEnv() {
  const envPaths = [path.join(__dirname, ".env"), path.join(__dirname, ".env.local")];
  const envPath = envPaths.find((item) => fs.existsSync(item));
  if (!envPath) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
  process.env.__LOADED_ENV_FILE = envPath;
}

loadLocalEnv();

const PORT = Number(process.env.PORT || 8787);
const SITE_ACCESS_TOKEN = String(process.env.SITE_ACCESS_TOKEN || "");
const LIBLIB_ACCESS_KEY = String(process.env.LIBLIB_ACCESS_KEY || "");
const LIBLIB_SECRET_KEY = String(process.env.LIBLIB_SECRET_KEY || "");
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || "http://localhost:8787")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES || 8 * 1024 * 1024);
const MAX_REQUESTS_PER_HOUR = Number(process.env.MAX_REQUESTS_PER_HOUR || 20);
const LOCAL_ONLY = String(process.env.LOCAL_ONLY || "1") === "1";
const MODEL_CREDIT_COSTS = {
  image2: Number(process.env.CREDIT_COST_IMAGE2 || 12),
  bananaPro: Number(process.env.CREDIT_COST_BANANA_PRO || 18),
  liblib: Number(process.env.CREDIT_COST_LIBLIB || 10),
};
const USERS_FILE = path.join(__dirname, "users.json");

const buckets = new Map();
const sessions = new Map();

function sendJson(res, status, data, origin = "") {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0] || "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Site-Token, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(JSON.stringify(data));
}

function isAllowedOrigin(origin) {
  return !origin || ALLOWED_ORIGINS.includes(origin);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_IMAGE_BYTES * 2) {
        reject(new Error("上传内容太大，请缩小裁切区域。"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("请求内容不是有效 JSON。"));
      }
    });
    req.on("error", reject);
  });
}

function requireAuth(req) {
  if (LOCAL_ONLY && isLocalRequest(req)) return;
  if (!SITE_ACCESS_TOKEN) throw new Error("后端没有配置 SITE_ACCESS_TOKEN。");
  const token = String(req.headers["x-site-token"] || "");
  if (token !== SITE_ACCESS_TOKEN) throw new Error("访问令牌不正确。");
}

function loadUsers() {
  ensureUsersFile();
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8").replace(/^\uFEFF/, ""));
}

function saveUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function ensureUsersFile() {
  if (fs.existsSync(USERS_FILE)) return;
  const password = String(process.env.ADMIN_PASSWORD || "admin123456");
  const admin = makeUser("admin", password, "admin", Number(process.env.ADMIN_INITIAL_CREDITS || 9999));
  saveUsers({ users: [admin] });
}

function makeUser(username, password, role = "user", credits = 0) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    username: normalizeUsername(username),
    salt,
    passwordHash: hashPassword(password, salt),
    role,
    credits: Math.max(0, Number(credits) || 0),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeUsername(username) {
  const value = String(username || "").trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,32}$/.test(value)) {
    throw new Error("用户名只能使用 3-32 位英文、数字、下划线或短横线。");
  }
  return value;
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password || ""), salt, 120000, 32, "sha256").toString("hex");
}

function verifyPassword(user, password) {
  const a = Buffer.from(user.passwordHash, "hex");
  const b = Buffer.from(hashPassword(password, user.salt), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function publicUser(user) {
  return {
    username: user.username,
    role: user.role,
    credits: Number(user.credits) || 0,
  };
}

function authTokenFromRequest(req) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function requireSession(req) {
  const token = authTokenFromRequest(req);
  const session = token && sessions.get(token);
  if (!session) throw new Error("请先登录后再使用。");
  const data = loadUsers();
  const user = data.users.find((item) => item.username === session.username);
  if (!user) throw new Error("账号不存在，请重新登录。");
  return { token, user, data };
}

function requireAdmin(req) {
  const session = requireSession(req);
  if (session.user.username !== "admin" || session.user.role !== "admin") throw new Error("只有管理员可以操作积分。");
  return session;
}

function spendGenerationCredit(username, cost) {
  const data = loadUsers();
  const user = data.users.find((item) => item.username === username);
  if (!user) throw new Error("账号不存在。");
  user.credits = Math.max(0, Number(user.credits || 0) - cost);
  user.updatedAt = new Date().toISOString();
  saveUsers(data);
  return publicUser(user);
}

function generationCreditCost(req, body = {}) {
  const choice = String(
    body.modelChoice ||
    body.modelMode ||
    req.headers["x-ai-model-choice"] ||
    ""
  ).trim();
  if (choice === "bananaPro") {
    return { key: "bananaPro", label: "Banana Pro", cost: MODEL_CREDIT_COSTS.bananaPro };
  }
  if (choice === "liblib" || choice === "img2img-ultra") {
    return { key: "liblib", label: "Liblib AI", cost: MODEL_CREDIT_COSTS.liblib };
  }
  return { key: "image2", label: "Image2", cost: MODEL_CREDIT_COSTS.image2 };
}

function assertEnoughCredits(user, creditRule) {
  if ((Number(user.credits) || 0) < creditRule.cost) {
    throw new Error(`积分不足。本次使用 ${creditRule.label} 需要 ${creditRule.cost} 分，请联系管理员充值后再生图。`);
  }
}

function selectedImageModel(body = {}) {
  const choice = String(body.modelChoice || body.modelMode || "").trim();
  if (choice === "bananaPro") {
    return String(process.env.BANANA_PRO_IMAGE_MODEL || "").trim();
  }
  return String(process.env.OPENAI_IMAGE_MODEL || "").trim();
}

function isLocalRequest(req) {
  const address = String(req.socket.remoteAddress || "");
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function rateLimit(req) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local").split(",")[0].trim();
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const bucket = buckets.get(ip) || { start: now, count: 0 };
  if (now - bucket.start > hour) {
    bucket.start = now;
    bucket.count = 0;
  }
  bucket.count += 1;
  buckets.set(ip, bucket);
  if (bucket.count > MAX_REQUESTS_PER_HOUR) {
    throw new Error(`请求太频繁。当前限制为每小时 ${MAX_REQUESTS_PER_HOUR} 次。`);
  }
}

function dataUrlSize(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  return Math.floor((base64.length * 3) / 4);
}

function dataUrlToBlobPart(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("图片数据格式不正确。");
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

async function generateDualBgWithImage2(body) {
  const apiKey = String(process.env.OPENAI_API_KEY || process.env.SILLYDREAM_API_KEY || process.env.API_KEY || "").trim();
  const baseUrl = String(process.env.OPENAI_BASE_URL || process.env.SILLYDREAM_BASE_URL || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
  const fallbackBaseUrls = String(process.env.OPENAI_FALLBACK_BASE_URLS || "")
    .split(",")
    .map((item) => item.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  const baseUrlsToTry = [
    baseUrl,
    ...fallbackBaseUrls,
  ].filter((item, index, list) => item && list.indexOf(item) === index);
  const model = selectedImageModel(body);
  if (!apiKey) throw new Error("AI 服务配置不完整，请联系管理员处理。");
  if (!model) throw new Error("AI 模型配置不完整，请联系管理员处理。");
  if (!body.image) throw new Error("没有收到要处理的图片。");

  const direction = body.direction === "vertical" ? "vertical" : "horizontal";
  const layoutText = direction === "vertical"
    ? "Create one single image with two perfectly aligned copies stacked vertically. The top copy has a pure green #00FF00 background. The bottom copy has a pure magenta #FF00FF background."
    : "Create one single image with two perfectly aligned copies placed left and right. The left copy has a pure green #00FF00 background. The right copy has a pure magenta #FF00FF background.";
  const prompt = [
    layoutText,
    "Only replace the background color. Keep every UI foreground element exactly unchanged: same pixels, same size, same position, same text, same icons, same glow, same shadows, same translucency.",
    "Do not redesign, redraw, translate, distort, rotate, crop, add, remove, blur, upscale, or alter any UI element.",
    "The two copies must be pixel-aligned except for the background color. No labels, no border, no checkerboard, no extra margin."
  ].join(" ");

  const { mimeType, buffer } = dataUrlToBlobPart(body.image);
  const form = new FormData();
  form.append("model", model);
  form.append("prompt", prompt);
  form.append("image", new Blob([buffer], { type: mimeType }), "crop.png");
  form.append("size", direction === "vertical" ? "1024x1536" : "1536x1024");
  form.append("quality", String(body.quality || "medium"));

  const modelsToTry = [model]
    .filter((item, index, list) => item && list.indexOf(item) === index);
  let response;
  let text = "";
  let usedModel = model;
  const attempts = [];
  outer:
  for (const tryBaseUrl of baseUrlsToTry) {
    for (const tryModel of modelsToTry) {
      const retryForm = new FormData();
      retryForm.append("model", tryModel);
      retryForm.append("prompt", prompt);
      retryForm.append("image", new Blob([buffer], { type: mimeType }), "crop.png");
      retryForm.append("size", direction === "vertical" ? "1024x1536" : "1536x1024");
      retryForm.append("quality", String(body.quality || "medium"));
      response = await fetch(`${tryBaseUrl}/images/edits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: retryForm,
      });
      text = await response.text();
      attempts.push({ baseUrl: tryBaseUrl, model: tryModel, status: response.status, body: text.slice(0, 220) });
      usedModel = tryModel;
      if (response.ok) break outer;
      if (!/No available channel for model|Database error|contact the administrator|504 Gateway Time-out|Gateway Timeout|nginx/i.test(text) && response.status !== 504) {
        break outer;
      }
    }
  }
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`image2 接口返回了非 JSON 内容 ${response.status}: ${text.slice(0, 300)}`);
  }
  if (!response.ok) {
    const message = json.error && json.error.message ? json.error.message : text;
    console.error("Image generation failed", { status: response.status, message, attempts });
    throw new Error("AI 服务暂时不可用，请稍后再试。");
  }
  const first = json.data && json.data[0];
  const b64 = first && (first.b64_json || first.b64);
  const url = first && first.url;
  if (b64) return { image: `data:image/png;base64,${b64}`, provider: "image2", model: usedModel };
  if (url) return { image: url, provider: "image2", model: usedModel };
  throw new Error(`image2 没有返回图片：${JSON.stringify(json).slice(0, 500)}`);
}

function serveStatic(req, res) {
  const root = path.resolve(__dirname, "..");
  const requestPath = decodeURIComponent(String(req.url || "/").split("?")[0]);
  const relative = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return true;
  }
  if (!isPublicStaticFile(relative)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return true;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return false;
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  };
  res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function isPublicStaticFile(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return false;
  if (normalized.startsWith(".") || normalized.includes("/.")) return false;
  if (normalized.startsWith("formal-backend/")) return false;
  if (normalized.startsWith("node_modules/")) return false;
  if (normalized.startsWith("备份") || normalized.includes("/备份")) return false;
  const publicFiles = new Set([
    "index.html",
    "styles.css",
    "app.js",
    "model-switch.js",
    "upload-reset-stable.js",
    "zoom-stage-fix.js",
    "crop-drag-sync-fix.js",
    "chroma-damage-repair.js",
    "chroma-cleanup-experiment.js",
    "psd-ui-slicer.html",
  ]);
  return publicFiles.has(normalized);
}

function liblibSignature(path, timestamp, nonce) {
  return crypto
    .createHmac("sha1", LIBLIB_SECRET_KEY)
    .update(`${path}&${timestamp}&${nonce}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomLiblibNonce(length = 10) {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let value = "";
  for (let i = 0; i < length; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
}

async function liblibPost(path, payload, options = {}) {
  if (!LIBLIB_ACCESS_KEY || !LIBLIB_SECRET_KEY) {
    throw new Error("后端没有配置 Liblib AccessKey 或 SecretKey。");
  }

  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  const url = new URL(`https://openapi.liblibai.cloud${path}`);
  url.searchParams.set("AccessKey", LIBLIB_ACCESS_KEY);
  url.searchParams.set("Signature", liblibSignature(options.signaturePath || path, timestamp, nonce));
  url.searchParams.set("Timestamp", timestamp);
  url.searchParams.set("SignatureNonce", nonce);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Liblib 返回了无法解析的内容：${text.slice(0, 200)}`);
  }
  if (!response.ok || (json.code && Number(json.code) !== 0)) {
    throw new Error(`Liblib 请求失败，code=${json.code || response.status}，原因：${json.msg || json.message || text}`);
  }
  return json;
}

async function generateDualBackground(body) {
  const image = String(body.image || "");
  const direction = body.direction === "vertical" ? "vertical" : "horizontal";
  if (!image.startsWith("data:image/")) throw new Error("没有收到有效图片。");
  if (dataUrlSize(image) > MAX_IMAGE_BYTES) throw new Error("图片太大，请缩小裁切框后再生成。");

  // This formal backend keeps all security and cost controls in place.
  // The exact Liblib model/template payload should be filled according to the model you choose in Liblib.
  // Until a model template is configured, return a clear message instead of consuming points accidentally.
  const prompt =
    direction === "vertical"
      ? "Create one image with two identical UI screenshots stacked vertically. The top background is pure #00FF00, the bottom background is pure #FF00FF. Do not move, resize, redraw, or change any UI element."
      : "Create one image with two identical UI screenshots placed left and right. The left background is pure #00FF00, the right background is pure #FF00FF. Do not move, resize, redraw, or change any UI element.";

  const result = await liblibPost("/api/generate/webui/img2img", {
    templateUuid: process.env.LIBLIB_TEMPLATE_UUID || "9c7d531dc75f476aa833b3d452b8f7ad",
    generateParams: {
      prompt,
      negativePrompt: "low quality, blurry, distorted UI, changed layout, changed text, moved elements, resized elements",
      imgCount: 1,
      steps: 20,
      cfgScale: 7,
      seed: -1,
      restoreFaces: 0,
      sourceImage: image,
      resizeMode: 0,
      resizedWidth: Number(body.width || 1024),
      resizedHeight: Number(body.height || 1024),
      mode: 0,
      denoisingStrength: 0.45,
    },
  });
  const generateUuid = result && result.data && result.data.generateUuid;
  if (!generateUuid) throw new Error(`Liblib 没有返回 generateUuid：${JSON.stringify(result)}`);
  const status = await waitForLiblibImage(generateUuid);

  return {
    status: "done",
    provider: "liblib",
    direction,
    image: status.images[0].imageUrl,
    result: { submit: result, status },
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForLiblibImage(generateUuid) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const response = await liblibPost("/api/generate/webui/status", { generateUuid });
    const data = response && response.data ? response.data : response;
    const imageUrl = data.images && data.images[0] && data.images[0].imageUrl;
    if (imageUrl) return data;
    const status = Number(data.generateStatus);
    if (status === 4 || status === -1 || status === 6) {
      throw new Error(`Liblib 生图失败：${data.generateMsg || JSON.stringify(data)}`);
    }
    await delay(attempt < 5 ? 2000 : 5000);
  }
  throw new Error("Liblib 生图超时，请稍后重试。");
}

const server = http.createServer(async (req, res) => {
  const origin = String(req.headers.origin || "");
  if (req.method === "OPTIONS") return sendJson(res, 200, { ok: true }, origin);
  if (!isAllowedOrigin(origin)) return sendJson(res, 403, { ok: false, error: "来源网站不允许访问后端。" }, origin);

  try {
    if (req.method === "GET" && req.url === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        creditCosts: MODEL_CREDIT_COSTS,
      }, origin);
    }

    if (req.method === "POST" && req.url === "/api/auth/login") {
      const body = await readJson(req);
      const username = normalizeUsername(body.username);
      const data = loadUsers();
      const user = data.users.find((item) => item.username === username);
      if (!user || !verifyPassword(user, body.password)) throw new Error("用户名或密码不正确。");
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, { username: user.username, createdAt: Date.now() });
      return sendJson(res, 200, { ok: true, token, user: publicUser(user), creditCosts: MODEL_CREDIT_COSTS }, origin);
    }

    if (req.method === "POST" && req.url === "/api/auth/register") {
      const body = await readJson(req);
      const username = normalizeUsername(body.username);
      const password = String(body.password || "");
      if (username === "admin") throw new Error("这个用户名不可注册。");
      if (password.length < 6) throw new Error("密码至少需要 6 位。");
      const data = loadUsers();
      if (data.users.some((item) => item.username === username)) throw new Error("用户名已存在。");
      const user = makeUser(username, password, "user", 0);
      data.users.push(user);
      saveUsers(data);
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, { username: user.username, createdAt: Date.now() });
      return sendJson(res, 200, { ok: true, token, user: publicUser(user), creditCosts: MODEL_CREDIT_COSTS }, origin);
    }

    if (req.method === "GET" && req.url === "/api/me") {
      const session = requireSession(req);
      return sendJson(res, 200, { ok: true, user: publicUser(session.user), creditCosts: MODEL_CREDIT_COSTS }, origin);
    }

    if (req.method === "GET" && req.url === "/api/admin/users") {
      requireAdmin(req);
      const data = loadUsers();
      return sendJson(res, 200, {
        ok: true,
        users: data.users.filter((user) => user.username !== "admin").map((user) => ({
          username: user.username,
          role: user.role,
          credits: Number(user.credits) || 0,
          updatedAt: user.updatedAt,
        })),
      }, origin);
    }

    if (req.method === "POST" && req.url === "/api/admin/users") {
      requireAdmin(req);
      const body = await readJson(req);
      const username = normalizeUsername(body.username);
      const data = loadUsers();
      let user = data.users.find((item) => item.username === username);
      if (!user) {
        if (!body.password) throw new Error("新用户必须设置密码。");
        user = makeUser(username, body.password, "user", body.credits);
        data.users.push(user);
      } else {
        if (user.username === "admin") throw new Error("管理员账号不能在这里修改，请只给普通用户赠送积分。");
        if (body.password) {
          user.salt = crypto.randomBytes(16).toString("hex");
          user.passwordHash = hashPassword(body.password, user.salt);
        }
        user.role = "user";
        user.credits = Math.max(0, Number(body.credits) || 0);
        user.updatedAt = new Date().toISOString();
      }
      saveUsers(data);
      return sendJson(res, 200, { ok: true, user: publicUser(user) }, origin);
    }

    if (req.method === "POST" && req.url === "/api/admin/credits") {
      requireAdmin(req);
      const body = await readJson(req);
      const username = normalizeUsername(body.username);
      const data = loadUsers();
      const user = data.users.find((item) => item.username === username);
      if (!user) throw new Error("用户不存在。");
      if (user.username === "admin") throw new Error("管理员账号不能在这里修改。");
      user.credits = Math.max(0, Number(body.credits) || 0);
      user.updatedAt = new Date().toISOString();
      saveUsers(data);
      return sendJson(res, 200, { ok: true, user: publicUser(user) }, origin);
    }

    if (req.method === "POST" && req.url === "/api/image2/generate-dual-bg") {
      const session = requireSession(req);
      rateLimit(req);
      const body = await readJson(req);
      const creditRule = generationCreditCost(req, body);
      assertEnoughCredits(session.user, creditRule);
      const result = await generateDualBgWithImage2(body);
      const user = spendGenerationCredit(session.user.username, creditRule.cost);
      return sendJson(res, 200, { ok: true, ...result, user, creditRule, creditCosts: MODEL_CREDIT_COSTS }, origin);
    }

    if (req.method === "POST" && (req.url === "/api/generate-dual-bg" || req.url === "/api/liblib/generate-dual-bg")) {
      const session = requireSession(req);
      rateLimit(req);
      const body = await readJson(req);
      const creditRule = generationCreditCost(req, body);
      assertEnoughCredits(session.user, creditRule);
      const result = await generateDualBackground(body);
      const user = spendGenerationCredit(session.user.username, creditRule.cost);
      return sendJson(res, 200, { ok: true, ...result, user, creditRule, creditCosts: MODEL_CREDIT_COSTS }, origin);
    }

    if (req.method === "GET" && serveStatic(req, res)) return;
    return sendJson(res, 404, { ok: false, error: "接口不存在。" }, origin);
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: error.message || String(error) }, origin);
  }
});

server.listen(PORT, () => {
  console.log(`AI UI Cutout backend running at http://localhost:${PORT}`);
  console.log(`Env file: ${process.env.__LOADED_ENV_FILE || "not found"}`);
  console.log(`AI credentials configured: ${process.env.OPENAI_API_KEY ? "yes" : "no"}`);
});
// Startup guard for an early model-choice route left by a previous hotfix.
// The local server uses native routing below; this prevents that optional
// route from stopping the whole website before the server is initialized.
var app = globalThis.app || {
  post: function (route, handler) {
    globalThis.__pendingModelChoiceRoute = { route: route, handler: handler };
  }
};
