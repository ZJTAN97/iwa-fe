import { type RefObject, useCallback, useEffect, useState } from "react";
import type { TocEntry } from "../../../../shared/components/TocSidebar/TocSidebar";

interface TocSectionData extends TocEntry {
	offsetTop: number;
}

interface UseTocOptions {
	iframeRef: RefObject<HTMLIFrameElement | null>;
}

interface UseTocResult {
	entries: TocEntry[];
	activeSectionId: string | null;
	scrollToSection: (id: string) => void;
}

export function useToc({ iframeRef }: UseTocOptions): UseTocResult {
	const [sections, setSections] = useState<TocSectionData[]>([]);
	const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

	// Request TOC data from iframe and listen for responses
	useEffect(() => {
		const iframe = iframeRef.current;
		if (!iframe) return;

		function handleMessage(event: MessageEvent) {
			if (event.data?.type === "toc-sections") {
				setSections(event.data.sections);
			} else if (event.data?.type === "active-section-changed") {
				setActiveSectionId(event.data.sectionId);
			}
		}

		window.addEventListener("message", handleMessage);

		// Request sections once iframe is loaded
		const requestSections = () => {
			iframe.contentWindow?.postMessage(
				{ type: "request-toc-sections" },
				"*",
			);
		};

		// If iframe is already loaded, request immediately; otherwise wait for load
		if (iframe.contentDocument?.readyState === "complete") {
			requestSections();
		} else {
			iframe.addEventListener("load", requestSections);
		}

		return () => {
			window.removeEventListener("message", handleMessage);
			iframe.removeEventListener("load", requestSections);
		};
	}, [iframeRef]);

	const scrollToSection = useCallback(
		(id: string) => {
			const iframe = iframeRef.current;
			if (!iframe) return;

			const section = sections.find((s) => s.id === id);
			if (!section) return;

			const iframeTop =
				iframe.getBoundingClientRect().top + window.scrollY;
			window.scrollTo({
				top: iframeTop + section.offsetTop,
				behavior: "smooth",
			});
		},
		[iframeRef, sections],
	);

	const entries: TocEntry[] = sections.map(({ id, label }) => ({ id, label }));

	return { entries, activeSectionId, scrollToSection };
}
