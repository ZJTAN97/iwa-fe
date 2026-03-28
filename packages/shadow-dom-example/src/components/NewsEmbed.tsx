import { useEffect } from "react";
import { useShadowDom } from "../hooks/use-shadow-dom";
import articleHtml from "../../../../shared/news-content/article.html?raw";
import articleCss from "../../../../shared/news-content/article.css?raw";
import articleJs from "../../../../shared/news-content/article.js?raw";

interface NewsEmbedProps {
  onNewsAction?: (detail: { type: string; title: string }) => void;
  darkMode?: boolean;
}

export function NewsEmbed({ onNewsAction, darkMode }: NewsEmbedProps) {
  const { hostRef, shadowRef } = useShadowDom({
    html: articleHtml,
    css: articleCss,
    js: articleJs,
  });

  // Listen for composed custom events crossing the shadow boundary
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const handler = ((e: CustomEvent) => {
      onNewsAction?.(e.detail);
    }) as EventListener;

    host.addEventListener("news-action", handler);
    return () => host.removeEventListener("news-action", handler);
  }, [hostRef, onNewsAction]);

  // Toggle dark mode directly on the shadow DOM content — no messaging needed
  useEffect(() => {
    const shadow = shadowRef.current;
    if (!shadow) return;
    const article = shadow.querySelector(".news-article");
    article?.classList.toggle("dark-mode", !!darkMode);
  }, [shadowRef, darkMode]);


  return (
    <div
      ref={hostRef}
      data-news-shadow-host
      style={{ minHeight: 200 }}
    />
  );
}
