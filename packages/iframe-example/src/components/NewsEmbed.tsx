import { useRef, useEffect, useState } from "react";
import articleHtml from "../../../../shared/news-content/article.html?raw";
import articleCss from "../../../../shared/news-content/article.css?raw";
import articleJs from "../../../../shared/news-content/article.js?raw";

interface NewsEmbedProps {
  onNewsAction?: (detail: { type: string; title: string }) => void;
  darkMode?: boolean;
}

export function NewsEmbed({ onNewsAction, darkMode }: NewsEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);

  // Build the full HTML document for srcdoc
  const srcdoc = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${articleCss}</style>
</head>
<body>
  ${articleHtml}
  <script>
    // Override the news-action custom event to use postMessage instead,
    // since custom events can't cross iframe boundaries.
    document.addEventListener('news-action', function(e) {
      window.parent.postMessage({
        type: 'news-action',
        detail: e.detail
      }, '*');
    });

    // Listen for dark mode toggle from parent (postMessage protocol)
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'set-dark-mode') {
        var article = document.querySelector('.news-article');
        if (article) {
          article.classList.toggle('dark-mode', e.data.enabled);
        }
      }
    });

    // Send height to parent for auto-resizing
    function sendHeight() {
      window.parent.postMessage({
        type: 'resize',
        height: document.documentElement.scrollHeight
      }, '*');
    }

    new ResizeObserver(sendHeight).observe(document.body);
    window.addEventListener('load', sendHeight);

    ${articleJs}
  </script>
</body>
</html>`;

  // Send dark mode state to iframe via postMessage whenever it changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { type: "set-dark-mode", enabled: !!darkMode },
      "*"
    );
  }, [darkMode]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "resize") {
        setHeight(event.data.height);
      } else if (event.data?.type === "news-action" && onNewsAction) {
        onNewsAction(event.data.detail);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onNewsAction]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcdoc}
      style={{
        width: "100%",
        height: `${height}px`,
        border: "none",
        display: "block",
      }}
      title="Embedded news article"
      sandbox="allow-scripts"
    />
  );
}
