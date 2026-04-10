import { Flex } from "@mantine/core";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import css from "../../../../shared/news-content/article.css?raw";
import html from "../../../../shared/news-content/article.html?raw";
import js from "../../../../shared/news-content/article.js?raw";

interface NewsEmbedProps {
	onShadowReady?: (shadow: ShadowRoot) => void;
	darkMode?: boolean;
}

export function NewsEmbed({ onShadowReady, darkMode }: NewsEmbedProps) {
	const styleRef = useRef(document.createElement("style"));
	const containerRef = useRef(document.createElement("div"));

	const hostRef = useRef<HTMLDivElement | null>(null);
	const shadowRef = useRef<ShadowRoot | null>(null);
	const [, setShadowReady] = useState(false);

	// TODO: Research if its better to use useLayoutEffect or useSyncExternalStore instead
	useLayoutEffect(() => {
		const host = hostRef.current;
		if (!host || shadowRef.current) return;

		const shadow = host.attachShadow({ mode: "open" });
		shadowRef.current = shadow;

		// Inject styles
		styleRef.current.textContent = `${css} section { scroll-margin-top: 70px; }`;

		console.log(css);
		shadow.appendChild(styleRef.current);

		// Inject HTML
		containerRef.current.innerHTML = html;
		shadow.appendChild(containerRef.current);

		// Execute external JS with a document proxy that scopes DOM queries to the shadow root
		// this is the "contract" we will need to discuss cross teams, basically what APIs are we gona define instead of us trying to catch all
		if (js) {
			const scriptFn = new Function("shadowRoot", "document", "window", js);

			const docProxy = new Proxy(document, {
				// The 'get' trap intercepts property access
				get(target, prop) {
					if (prop === "querySelector")
						return shadow.querySelector.bind(shadow);
					if (prop === "querySelectorAll")
						return shadow.querySelectorAll.bind(shadow);
					if (prop === "body") return shadow;
					const val = Reflect.get(target, prop);
					return typeof val === "function" ? val.bind(target) : val;
				},
			});

			// this "activates" the JS
			scriptFn(shadow, docProxy, window);
		}

		onShadowReady?.(shadow);
		setShadowReady(true);
	}, [onShadowReady]);

	// Toggle dark mode directly on the shadow DOM content
	useEffect(() => {
		const shadow = shadowRef.current;
		if (!shadow) return;
		const article = shadow.querySelector(".news-article");

		if (article) {
			article.classList.toggle("dark-mode", !!darkMode);
		}
	}, [darkMode]);

	return (
		<Flex>
			<div ref={hostRef} data-news-shadow-host style={{ minHeight: 200 }} />
		</Flex>
	);
}
