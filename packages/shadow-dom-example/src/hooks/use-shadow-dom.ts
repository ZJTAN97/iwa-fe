import { type RefObject, useEffect, useRef } from "react";

interface UseShadowDomOptions {
	html: string;
	css: string;
	js?: string;
}

interface UseShadowDomResult {
	hostRef: RefObject<HTMLDivElement | null>;
	shadowRef: RefObject<ShadowRoot | null>;
}

export function useShadowDom({
	html,
	css,
	js,
}: UseShadowDomOptions): UseShadowDomResult {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const shadowRef = useRef<ShadowRoot | null>(null);

	useEffect(() => {
		const host = hostRef.current;
		if (!host || shadowRef.current) return;

		const shadow = host.attachShadow({ mode: "open" });
		shadowRef.current = shadow;

		// Inject styles
		const style = document.createElement("style");
		style.textContent = css;
		shadow.appendChild(style);

		// Inject HTML
		const container = document.createElement("div");
		container.innerHTML = html;
		shadow.appendChild(container);

		// Execute external JS with a document proxy that scopes
		// DOM queries to the shadow root
		if (js) {
			const scriptFn = new Function("shadowRoot", "document", "window", js);

			const docProxy = new Proxy(document, {
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

			scriptFn(shadow, docProxy, window);
		}
	}, [html, css, js]);

	return { hostRef, shadowRef };
}
