import { useEffect, useRef, useState } from "react";
import articleCss from "../../../../shared/news-content/article.css?raw";
import articleHtml from "../../../../shared/news-content/article.html?raw";
import articleJs from "../../../../shared/news-content/article.js?raw";

interface NewsEmbedProps {
	onNewsAction?: (detail: { type: string; title: string }) => void;
	darkMode?: boolean;
	onBookmark?: (articleId: string) => Promise<void>;
	onIframeReady?: (iframe: HTMLIFrameElement) => void;
}

export function NewsEmbed({
	onNewsAction,
	darkMode,
	onBookmark,
	onIframeReady,
}: NewsEmbedProps) {
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

    // Respond to TOC section requests from host
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'request-toc-sections') {
        var sections = [];
        var meta = document.querySelector('#article-meta');
        if (meta) {
          sections.push({ id: meta.id, label: 'Cover', offsetTop: meta.offsetTop });
        }
        var sectionEls = document.querySelectorAll('section[id]');
        sectionEls.forEach(function(s) {
          var heading = s.querySelector('.section-header-label em, .section-label, .numbered-heading');
          var label = heading ? heading.textContent.trim() : s.id;
          sections.push({ id: s.id, label: label, offsetTop: s.offsetTop });
        });
        window.parent.postMessage({ type: 'toc-sections', sections: sections }, '*');
      }
    });

    // Track active section and report to host
    (function() {
      var allTargets = [];
      var meta = document.querySelector('#article-meta');
      if (meta) allTargets.push(meta);
      var sectionEls = document.querySelectorAll('section[id]');
      sectionEls.forEach(function(s) { allTargets.push(s); });
      if (allTargets.length === 0) return;

      var observer = new IntersectionObserver(function(entries) {
        var topmost = null;
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            var top = entries[i].boundingClientRect.top;
            if (!topmost || top < topmost.top) {
              topmost = { id: entries[i].target.id, top: top };
            }
          }
        }
        if (topmost) {
          window.parent.postMessage({
            type: 'active-section-changed',
            sectionId: topmost.id
          }, '*');
        }
      }, { threshold: 0.1 });

      allTargets.forEach(function(el) { observer.observe(el); });
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

	console.log(iframeRef.current?.contentDocument);

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
				iframeRef.current?.contentWindow?.postMessage(
					{ type: "bookmark-saved" },
					"*",
				);
			}
		}

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [onNewsAction, onBookmark]);

	return (
		<iframe
			ref={iframeRef}
			srcDoc={srcdoc}
			onLoad={() => {
				if (iframeRef.current) onIframeReady?.(iframeRef.current);
			}}
			style={{
				width: "100%",
				height: `${height}px`,
				border: "none",
				display: "block",
			}}
			title="Embedded news article"
			// sandbox="allow-scripts"
			sandbox="allow-scripts allow-same-origin"
		/>
	);
}
