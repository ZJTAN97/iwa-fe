import { useEffect, useRef, useState } from "react";
import articleCss from "../../../../shared/news-content/article.css?raw";
import articleHtml from "../../../../shared/news-content/article.html?raw";
import articleJs from "../../../../shared/news-content/article.js?raw";

interface NewsEmbedProps {
	onNewsAction?: (detail: { type: string; title: string }) => void;
	darkMode?: boolean;
	onBookmark?: (articleId: string) => Promise<void>;
}

export function NewsEmbed({ onNewsAction, darkMode, onBookmark }: NewsEmbedProps) {
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
    // Forward news-action events to parent via postMessage
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

    // Track read progress via IntersectionObserver and send to parent
    (function() {
      var sections = document.querySelectorAll('section[id]');
      if (sections.length === 0) return;
      var totalSections = sections.length;
      var readSet = {};

      var observer = new IntersectionObserver(function(entries) {
        var changed = false;
        entries.forEach(function(entry) {
          if (entry.isIntersecting && !readSet[entry.target.id]) {
            readSet[entry.target.id] = true;
            changed = true;
          }
        });
        if (changed) {
          var readIds = Object.keys(readSet);
          window.parent.postMessage({
            type: 'read-progress',
            percentage: Math.round((readIds.length / totalSections) * 100),
            sectionsRead: readIds
          }, '*');
        }
      }, { threshold: 0.5 });

      sections.forEach(function(s) { observer.observe(s); });
    })();

    // Send height to parent for auto-resizing
    function sendHeight() {
      window.parent.postMessage({
        type: 'resize',
        height: document.documentElement.scrollHeight
      }, '*');
    }

    new ResizeObserver(sendHeight).observe(document.body);
    window.addEventListener('load', sendHeight);

    // Bookmark button: notify the host on click so it can make the API call.
    // The host sends 'bookmark-saved' back when the call completes.
    (function() {
      var btn = document.querySelector('.bookmark-btn');
      if (!btn) return;
      btn.addEventListener('click', function() {
        btn.disabled = true;
        btn.textContent = 'Saving...';
        window.parent.postMessage({ type: 'bookmark-clicked', articleId: 'AA/123/1234/ZZ' }, '*');
      });
      window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'bookmark-saved') {
          btn.textContent = 'Bookmarked!';
        }
      });
    })();

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
			"*",
		);
	}, [darkMode]);

	useEffect(() => {
		async function handleMessage(event: MessageEvent) {
			if (event.data?.type === "resize") {
				setHeight(event.data.height);
			} else if (event.data?.type === "news-action" && onNewsAction) {
				onNewsAction(event.data.detail);
			} else if (event.data?.type === "bookmark-clicked" && onBookmark) {
				// Host makes the API call, then notifies the iframe so it can update its UI.
				// Roundtrip postMessage is required because the host has no direct DOM access.
				await onBookmark(event.data.articleId);
				iframeRef.current?.contentWindow?.postMessage({ type: "bookmark-saved" }, "*");
			}
		}

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [onNewsAction, onBookmark]);

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
