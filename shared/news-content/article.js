/**
 * External news article JavaScript.
 * Simulates third-party JS that comes with the embedded content.
 */

(() => {
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
			initBackToTop();
		});
	} else {
		initBackToTop();
	}
})();
