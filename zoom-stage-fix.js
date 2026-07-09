(function () {
  "use strict";

  // The experimental full-workspace zoom overlay is intentionally disabled.
  // It caused duplicate image layers and could hide the crop preset frame.
  // Keep this file as a harmless compatibility shim because index.html may
  // still reference it while the stable cropper owns upload, zoom, and dragging.
})();
