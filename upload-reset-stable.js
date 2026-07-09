(function () {
  "use strict";

  function isAiPreparationPage() {
    return Array.from(document.querySelectorAll("button, [role=tab], a"))
      .some((node) => /AI\s*双底色制备/.test(node.textContent || "") &&
        (node.classList.contains("active") || node.getAttribute("aria-selected") === "true" ||
         getComputedStyle(node).backgroundColor !== "rgba(0, 0, 0, 0)"));
  }

  function isImageCloseButton(button) {
    const text = (button.textContent || "").trim();
    const label = `${button.getAttribute("aria-label") || ""} ${button.title || ""}`;
    const rect = button.getBoundingClientRect();
    const color = getComputedStyle(button).backgroundColor;
    const isCloseMark = text === "×" || text.toLowerCase() === "x" || /删除|移除|关闭图片|清除图片/.test(label);
    const isTopRightControl = rect.right > window.innerWidth * 0.72 && rect.top < window.innerHeight * 0.45;
    const looksRed = /rgb\(\s*(?:1[8-9]\d|2\d\d)\s*,\s*(?:0|[1-8]?\d)\s*,\s*(?:0|[1-8]?\d)\s*\)/.test(color);
    return isCloseMark && isTopRightControl && looksRed;
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || !isAiPreparationPage() || !isImageCloseButton(button)) return;

    // Let the existing close handler finish first, then reload the local page.
    // A reload is intentional here: canvas, bitmap, zoom and crop-frame state
    // must be recreated together; partially clearing them caused stale images.
    sessionStorage.setItem("reopenAiPreparationTab", "1");
    setTimeout(() => window.location.reload(), 120);
  }, true);

  window.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem("reopenAiPreparationTab") !== "1") return;
    sessionStorage.removeItem("reopenAiPreparationTab");
    const tab = Array.from(document.querySelectorAll("button, [role=tab], a"))
      .find((node) => /AI\s*双底色制备/.test(node.textContent || ""));
    if (tab && tab.getAttribute("aria-selected") !== "true") tab.click();
  });
})();
