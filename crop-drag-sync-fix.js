(function () {
  "use strict";

  const state = {
    frame: null,
    dragging: null,
    raf: 0,
  };

  function rect(el) {
    return el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
  }

  function isVisible(el) {
    const r = rect(el);
    if (!r || r.width < 2 || r.height < 2) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0.01;
  }

  function overlapArea(a, b) {
    const x1 = Math.max(a.left, b.left);
    const y1 = Math.max(a.top, b.top);
    const x2 = Math.min(a.right, b.right);
    const y2 = Math.min(a.bottom, b.bottom);
    return Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  }

  function removeOldExperimentalFrames() {
    document.querySelectorAll("[data-crop-sync-frame]").forEach((node) => node.remove());
  }

  function getMainImage() {
    const images = Array.from(document.images)
      .filter(isVisible)
      .map((img) => ({ img, r: rect(img) }))
      .filter((item) => item.r.width > 160 && item.r.height > 120)
      .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height);

    return images[0] || null;
  }

  function unlockClipping(el) {
    let node = el;
    let count = 0;
    while (node && node !== document.body && count < 10) {
      if (node instanceof HTMLElement) {
        node.style.setProperty("overflow", "visible", "important");
        node.style.setProperty("overflow-x", "visible", "important");
        node.style.setProperty("overflow-y", "visible", "important");
        node.style.setProperty("clip-path", "none", "important");
        node.style.setProperty("-webkit-clip-path", "none", "important");
        node.style.setProperty("mask-image", "none", "important");
        node.style.setProperty("-webkit-mask-image", "none", "important");
        node.style.setProperty("contain", "none", "important");
      }
      node = node.parentElement;
      count += 1;
    }
  }

  function unlockPreviewImage() {
    const main = getMainImage();
    if (!main) return;

    const img = main.img;
    unlockClipping(img);
    unlockClipping(img.parentElement);

    img.style.setProperty("object-fit", "contain", "important");
    img.style.setProperty("max-width", "none", "important");
    img.style.setProperty("max-height", "none", "important");
    img.style.setProperty("transform-origin", "center center", "important");
  }

  function looksLikeCropFrame(el, mainRect) {
    if (!(el instanceof HTMLElement)) return false;
    if (el.dataset.cropSyncFrame === "true") return false;
    if (!isVisible(el)) return false;

    const r = rect(el);
    if (!r || r.width < 40 || r.height < 40) return false;
    if (r.width > window.innerWidth * 0.9 || r.height > window.innerHeight * 0.85) return false;

    if (mainRect && overlapArea(r, mainRect) < Math.min(r.width * r.height, mainRect.width * mainRect.height) * 0.08) {
      return false;
    }

    const style = window.getComputedStyle(el);
    const border = `${style.borderTopColor} ${style.borderRightColor} ${style.borderBottomColor} ${style.borderLeftColor}`.toLowerCase();
    const hasLightBorder =
      border.includes("255") ||
      border.includes("white") ||
      border.includes("rgba(255") ||
      Number.parseFloat(style.borderTopWidth || "0") > 0;
    const classHint = /crop|select|rect|frame|box|preset|cut/i.test(el.className || "");

    return hasLightBorder || classHint;
  }

  function findCropFrame() {
    const main = getMainImage();
    const mainRect = main && main.r;

    const candidates = Array.from(document.querySelectorAll("div, canvas"))
      .filter((el) => looksLikeCropFrame(el, mainRect))
      .map((el) => {
        const r = rect(el);
        const overlap = mainRect ? overlapArea(r, mainRect) : 0;
        const area = r.width * r.height;
        return { el, r, overlap, area };
      })
      .filter((item) => item.overlap > 0 || !mainRect)
      .sort((a, b) => {
        if (b.overlap !== a.overlap) return b.overlap - a.overlap;
        return b.area - a.area;
      });

    return candidates[0] ? candidates[0].el : null;
  }

  function styleCropFrame(frame) {
    unlockClipping(frame);
    frame.classList.add("crop-drag-sync-target");
    frame.style.position = window.getComputedStyle(frame).position === "static" ? "absolute" : frame.style.position;
    frame.style.boxSizing = "border-box";
    frame.style.cursor = "move";
    frame.style.touchAction = "none";
    frame.style.userSelect = "none";
    frame.style.pointerEvents = "auto";
    frame.style.zIndex = "9999";
    frame.style.background = "rgba(255,255,255,0.10)";
    frame.style.border = "1px solid rgba(255,255,255,0.86)";
    frame.style.outline = "1px solid rgba(255,255,255,0.36)";
    frame.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.32), inset 0 0 0 1px rgba(255,255,255,0.18)";
  }

  function refreshCropFrame() {
    removeOldExperimentalFrames();
    unlockPreviewImage();

    const frame = findCropFrame();
    if (!frame) {
      state.frame = null;
      return;
    }

    state.frame = frame;
    styleCropFrame(frame);
  }

  function scheduleRefresh() {
    if (state.raf) return;
    state.raf = window.requestAnimationFrame(() => {
      state.raf = 0;
      refreshCropFrame();
    });
  }

  function getPositionParent(frame) {
    return frame.offsetParent instanceof HTMLElement ? frame.offsetParent : frame.parentElement || document.body;
  }

  function pinFrameToCurrentScreenPosition(frame) {
    const parent = getPositionParent(frame);
    const frameRect = rect(frame);
    const parentRect = rect(parent);
    if (!frameRect || !parentRect) return null;

    const left = frameRect.left - parentRect.left + parent.scrollLeft;
    const top = frameRect.top - parentRect.top + parent.scrollTop;

    frame.style.position = "absolute";
    frame.style.left = `${left}px`;
    frame.style.top = `${top}px`;
    frame.style.right = "auto";
    frame.style.bottom = "auto";
    frame.style.margin = "0";
    frame.style.transform = "none";

    return { parent, parentRect, left, top };
  }

  function beginDrag(event) {
    const frame = state.frame || findCropFrame();
    if (!frame || !frame.contains(event.target)) return;

    const pinned = pinFrameToCurrentScreenPosition(frame);
    if (!pinned) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    state.frame = frame;
    state.dragging = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: pinned.left,
      startTop: pinned.top,
      frame,
      parent: pinned.parent,
    };

    frame.setPointerCapture && frame.setPointerCapture(event.pointerId);
    document.documentElement.classList.add("crop-drag-sync-active");
  }

  function moveDrag(event) {
    const drag = state.dragging;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    const parentRect = rect(drag.parent);
    const frameRect = rect(drag.frame);
    if (!parentRect || !frameRect) return;

    const nextLeft = drag.startLeft + (event.clientX - drag.startX);
    const nextTop = drag.startTop + (event.clientY - drag.startY);

    drag.frame.style.left = `${nextLeft}px`;
    drag.frame.style.top = `${nextTop}px`;
  }

  function endDrag(event) {
    const drag = state.dragging;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    state.dragging = null;
    document.documentElement.classList.remove("crop-drag-sync-active");
  }

  document.addEventListener("pointerdown", beginDrag, true);
  document.addEventListener("pointermove", moveDrag, true);
  document.addEventListener("pointerup", endDrag, true);
  document.addEventListener("pointercancel", endDrag, true);
  document.addEventListener("input", scheduleRefresh, true);
  document.addEventListener("change", scheduleRefresh, true);
  document.addEventListener("click", scheduleRefresh, true);

  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });

  window.addEventListener("load", scheduleRefresh);
  window.addEventListener("resize", scheduleRefresh);
  setInterval(scheduleRefresh, 1000);
  scheduleRefresh();
})();
