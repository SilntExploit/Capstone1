(function () {
  const launchLinks = Array.from(document.querySelectorAll(".launch-btn"));

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function saveLastLab(card) {
    if (!card) return;
    window.localStorage.setItem("irsp-last-lab", JSON.stringify({
      id: card.getAttribute("data-lab-id") || "",
      title: card.getAttribute("data-title") || "",
      launchedAt: new Date().toISOString()
    }));
  }

  /* ──────────────────────────────────────────────────────────────
     KIOSK LAUNCHER (ported from the VM lab launcher).
     Opens an integrated lab environment in a dedicated popup window
     and requests fullscreen. Shared by every in-browser lab (Lab A's
     VM environment and Lab B's endpoint investigation console) so
     they behave identically from the trainee's point of view.
  ────────────────────────────────────────────────────────────── */
  // Kiosk URLs, relative to /pages/labs.html.
  const KIOSK_URLS = {
    "lab-a": "../lab/index.html?kiosk=1",
    "lab-b": "../lab-b/index.html?kiosk=1"
  };

  function openLabKiosk(url, windowName, event) {
    event.preventDefault();

    const features = [
      'popup=yes',
      'width=1440',
      'height=900',
      'menubar=no',
      'toolbar=no',
      'location=no',
      'status=no',
      'scrollbars=no',
      'resizable=yes'
    ].join(',');

    const labWindow = window.open(url, windowName, features);

    if (!labWindow) {
      window.alert('Popup was blocked. Please allow popups and try again.');
      return;
    }

    labWindow.focus();

    const requestFull = () => {
      try {
        if (labWindow.document && labWindow.document.documentElement &&
            labWindow.document.documentElement.requestFullscreen) {
          labWindow.document.documentElement
            .requestFullscreen({ navigationUI: 'hide' })
            .catch(() => {});
        }
      } catch (e) {
        /* Cross-window timing restrictions: index.html auto-requests fullscreen too. */
      }
    };

    setTimeout(requestFull, 120);
    setTimeout(requestFull, 450);
  }

  launchLinks.forEach(link => {
    const labId = link.getAttribute("data-lab-id");
    const kioskUrl = KIOSK_URLS[labId];

    if (kioskUrl) {
      // Lab A (VM environment) and Lab B (endpoint investigation console)
      // both launch as dedicated kiosk popups.
      link.setAttribute("href", kioskUrl);
      link.removeAttribute("target");
      link.addEventListener("click", (event) => {
        saveLastLab(link.closest(".lab-card"));
        openLabKiosk(kioskUrl, `responsegrid_kiosk_${labId}`, event);
      });
      return;
    }

    link.addEventListener("click", () => {
      saveLastLab(link.closest(".lab-card"));
    });
  });

  refreshIcons();
})();
