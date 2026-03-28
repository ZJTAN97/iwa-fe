/**
 * External news article JavaScript.
 * Simulates third-party JS that comes with the embedded content.
 */

(() => {
	// Handle TOC navigation (scroll within shadow root container)
	function initTocNavigation() {
		const tocLinks = document.querySelectorAll(".toc-link[data-target]");
		tocLinks.forEach((link) => {
			link.addEventListener("click", function (e) {
				e.preventDefault();
				const targetId = this.getAttribute("data-target");
				const target = document.querySelector(`#${targetId}`);
				if (target) {
					target.scrollIntoView({ behavior: "smooth", block: "start" });
				}

				// Update active state
				for (const l of tocLinks) {
					l.classList.remove("toc-active");
				}
				this.classList.add("toc-active");
			});
		});
	}

	// Handle back to top
	function initBackToTop() {
		const backToTop = document.querySelector("#back-to-top");
		if (!backToTop) return;

		backToTop.addEventListener("click", (e) => {
			e.preventDefault();
			const article = document.querySelector(".news-article");
			if (article) {
				article.scrollIntoView({ behavior: "smooth", block: "start" });
			}
		});
	}

	// Initialize when DOM is ready
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", () => {
			initTocNavigation();
			initBackToTop();
		});
	} else {
		initTocNavigation();
		initBackToTop();
	}
})();
