import { useEffect } from "react";
import articleCss from "../../../../shared/news-content/article.css?raw";
import articleHtml from "../../../../shared/news-content/article.html?raw";
import articleJs from "../../../../shared/news-content/article.js?raw";
import { useShadowDom } from "../hooks/use-shadow-dom";

interface NewsEmbedProps {
	onShadowReady?: (shadow: ShadowRoot) => void;
	darkMode?: boolean;
}

export function NewsEmbed({ onShadowReady, darkMode }: NewsEmbedProps) {
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

	return <div ref={hostRef} data-news-shadow-host style={{ minHeight: 200 }} />;
}
