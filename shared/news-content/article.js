/**
 * External news article JavaScript.
 * Simulates third-party JS that comes with the embedded content.
 */

(function () {
  // Track reading progress
  function initReadingProgress() {
    const article = document.querySelector(".news-article");
    if (!article) return;

    const progressBar = document.createElement("div");
    progressBar.style.cssText =
      "position:fixed;top:0;left:0;height:3px;background:#e94560;transition:width 0.2s;z-index:9999;width:0%";
    document.body.appendChild(progressBar);

    function updateProgress() {
      const rect = article.getBoundingClientRect();
      const totalHeight = rect.height - window.innerHeight;
      const progress = Math.min(
        100,
        Math.max(0, (-rect.top / totalHeight) * 100)
      );
      progressBar.style.width = progress + "%";
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
  }

  // Handle share/bookmark buttons
  function initButtons() {
    document.querySelectorAll(".news-share-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const action = this.getAttribute("data-action");
        if (action === "share") {
          // Dispatch a custom event that the host app can listen to
          const event = new CustomEvent("news-action", {
            bubbles: true,
            composed: true, // crosses shadow DOM boundary
            detail: { type: "share", title: getArticleTitle() },
          });
          this.dispatchEvent(event);
          this.textContent = "Link Copied!";
          setTimeout(
            function () {
              this.textContent = "Share Article";
            }.bind(this),
            2000
          );
        } else if (action === "bookmark") {
          const event = new CustomEvent("news-action", {
            bubbles: true,
            composed: true,
            detail: { type: "bookmark", title: getArticleTitle() },
          });
          this.dispatchEvent(event);
          this.textContent = this.textContent === "Bookmarked ✓" ? "Bookmark" : "Bookmarked ✓";
        }
      });
    });
  }

  function getArticleTitle() {
    const titleEl = document.querySelector(".news-title");
    return titleEl ? titleEl.textContent : "Unknown Article";
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initReadingProgress();
      initButtons();
    });
  } else {
    initReadingProgress();
    initButtons();
  }
})();
