import { useEffect } from "react";
import articleCss from "../../../../shared/news-content/article.css?raw";
import articleHtml from "../../../../shared/news-content/article.html?raw";
import articleJs from "../../../../shared/news-content/article.js?raw";
import { useShadowDom } from "../hooks/use-shadow-dom";

interface NewsEmbedProps {
	onShadowReady?: (shadow: ShadowRoot) => void;
	darkMode?: boolean;
	onBookmark?: (articleId: string) => Promise<void>;
}

export function NewsEmbed({ onShadowReady, darkMode, onBookmark }: NewsEmbedProps) {
	const { hostRef, shadowRef } = useShadowDom({
		html: articleHtml,
		css: articleCss,
		js: articleJs,
	});

	// Notify parent when shadow root is ready
	useEffect(() => {
		if (shadowRef.current) {
			onShadowReady?.(shadowRef.current);
		}
	}, [shadowRef, onShadowReady]);

	// Toggle dark mode directly on the shadow DOM content
	useEffect(() => {
		const shadow = shadowRef.current;
		if (!shadow) return;
		const article = shadow.querySelector(".news-article");
		article?.classList.toggle("dark-mode", !!darkMode);
	}, [shadowRef, darkMode]);

	// Bind host API call directly to the bookmark button in the shadow DOM.
	// No changes needed in the embedded JS — the host owns this binding entirely.
	useEffect(() => {
		const shadow = shadowRef.current;
		if (!shadow || !onBookmark) return;

		const btn = shadow.querySelector<HTMLButtonElement>(".bookmark-btn");
		if (!btn) return;

		const handleClick = async () => {
			btn.disabled = true;
			btn.textContent = "Saving...";
			await onBookmark("AA/123/1234/ZZ");
			// Direct DOM update — no message passing needed
			btn.textContent = "Bookmarked!";
		};

		btn.addEventListener("click", handleClick);
		return () => btn.removeEventListener("click", handleClick);
	}, [shadowRef, onBookmark]);

	return <div ref={hostRef} data-news-shadow-host style={{ minHeight: 200 }} />;
}
