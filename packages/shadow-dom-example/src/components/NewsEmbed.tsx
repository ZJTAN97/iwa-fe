import { useRef, useEffect } from "react";
import articleHtml from "../../../../shared/news-content/article.html?raw";
import articleCss from "../../../../shared/news-content/article.css?raw";
import articleJs from "../../../../shared/news-content/article.js?raw";

interface NewsEmbedProps {
  onNewsAction?: (detail: { type: string; title: string }) => void;
  darkMode?: boolean;
}

export function NewsEmbed({ onNewsAction, darkMode }: NewsEmbedProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<ShadowRoot | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || shadowRef.current) return;

    // Attach shadow DOM
    const shadow = host.attachShadow({ mode: "open" });
    shadowRef.current = shadow;

    // Inject styles
    const style = document.createElement("style");
    style.textContent = articleCss;
    shadow.appendChild(style);

    // Inject HTML
    const container = document.createElement("div");
    container.innerHTML = articleHtml;
    shadow.appendChild(container);

    // Execute the article's JavaScript within the shadow DOM context.
    // We create a scoped proxy for `document` that redirects DOM queries
    // to the shadow root, while falling through to the real document for
    // everything else (createElement, readyState, addEventListener, etc.).
    const scriptFn = new Function(
      "shadowRoot",
      "document",
      "window",
      articleJs
    );

    const docProxy = new Proxy(document, {
      get(target, prop) {
        if (prop === "querySelector") return shadow.querySelector.bind(shadow);
        if (prop === "querySelectorAll") return shadow.querySelectorAll.bind(shadow);
        if (prop === "body") return shadow;
        const val = Reflect.get(target, prop);
        return typeof val === "function" ? val.bind(target) : val;
      },
    });

    scriptFn(shadow, docProxy, window);

    // Listen for composed custom events crossing the shadow boundary
    host.addEventListener("news-action", ((e: CustomEvent) => {
      if (onNewsAction) {
        onNewsAction(e.detail);
      }
    }) as EventListener);
  }, [onNewsAction]);

  // Toggle dark mode directly on the shadow DOM content — no messaging needed
  useEffect(() => {
    const shadow = shadowRef.current;
    if (!shadow) return;
    const article = shadow.querySelector(".news-article");
    article?.classList.toggle("dark-mode", !!darkMode);
  }, [darkMode]);

  return (
    <div
      ref={hostRef}
      data-news-shadow-host
      style={{ minHeight: 200 }}
    />
  );
}
