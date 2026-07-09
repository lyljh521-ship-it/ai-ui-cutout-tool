(function () {
  "use strict";

  const MODEL_OPTIONS = {
    image2: {
      label: "Image2",
      cost: 12
    },
    bananaPro: {
      label: "Nano Banana Pro",
      cost: 18
    }
  };

  let currentChoice = localStorage.getItem("dualBgModelChoice") || "image2";
  if (!MODEL_OPTIONS[currentChoice]) currentChoice = "image2";

  function modelField() {
    const labels = Array.from(document.querySelectorAll("label, div, span, p"));
    const label = labels.find((node) => (node.textContent || "").trim() === "生成模型");
    if (!label) return null;
    const parent = label.parentElement || label;
    return parent.querySelector("select") || parent.nextElementSibling?.querySelector?.("select");
  }

  function statusFor(select) {
    let status = document.getElementById("selectedModelStatus");
    if (!status) {
      status = document.createElement("div");
      status.id = "selectedModelStatus";
      status.className = "actual-model-status";
      select.insertAdjacentElement("afterend", status);
    }
    return status;
  }

  function showStatus(text, state) {
    const select = document.getElementById("dualBgModelSelect") || modelField();
    if (!select) return;
    const item = MODEL_OPTIONS[currentChoice];
    const status = statusFor(select);
    status.dataset.state = state || "idle";
    status.textContent = `${text || "当前选择"}：${item.label}（消耗 ${item.cost} 分/张）`;
  }

  function installModelSelector() {
    const select = document.getElementById("dualBgModelSelect") || modelField();
    if (!select) return false;
    if (select.dataset.modelSwitchReady === "1") return true;

    select.id = "dualBgModelSelect";
    select.dataset.modelSwitchReady = "1";
    select.replaceChildren();
    Object.entries(MODEL_OPTIONS).forEach(([value, item]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = item.label;
      select.appendChild(option);
    });
    select.value = currentChoice;
    select.addEventListener("change", () => {
      currentChoice = select.value;
      localStorage.setItem("dualBgModelChoice", currentChoice);
      showStatus("当前选择", "idle");
    });
    showStatus("当前选择", "idle");
    return true;
  }

  // Add the selected model to every local AI generation request. Existing
  // image/crop requests are left untouched.
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function modelAwareFetch(input, init = {}) {
    const url = typeof input === "string" ? input : input?.url || "";
    const isLocalApi = /\/api\//i.test(url);
    const isGenerate = isLocalApi && /(?:generate|dual|image|background|prepare)/i.test(url);
    if (!isGenerate) return originalFetch(input, init);

    const item = MODEL_OPTIONS[currentChoice];
    let nextInit = { ...init };
    const headers = new Headers(init.headers || {});
    headers.set("X-AI-Model-Choice", currentChoice);
    nextInit.headers = headers;

    if (typeof init.body === "string") {
      try {
        const body = JSON.parse(init.body);
        body.modelChoice = currentChoice;
        nextInit.body = JSON.stringify(body);
      } catch (_) {}
    } else if (init.body instanceof FormData) {
      const body = new FormData();
      for (const [key, value] of init.body.entries()) body.append(key, value);
      body.set("modelChoice", currentChoice);
      nextInit.body = body;
    }

    showStatus("正在请求", "running");
    const response = await originalFetch(input, nextInit);
    showStatus(response.ok ? "本次请求指定模型" : "请求失败，所选模型", response.ok ? "done" : "idle");
    return response;
  };

  const observer = new MutationObserver(installModelSelector);
  function start() {
    installModelSelector();
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
