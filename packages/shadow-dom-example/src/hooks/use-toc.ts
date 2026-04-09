import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import type { TocEntry } from "../../../../shared/components/TocSidebar/TocSidebar";

interface UseTocOptions {
	shadowRef: RefObject<ShadowRoot | null>;
}

interface UseTocResult {
	entries: TocEntry[];
	activeSectionId: string | null;
	scrollToSection: (id: string) => void;
}

function extractLabel(el: Element): string {
	const headerLabel = el.querySelector(".section-header-label em");
	if (headerLabel?.textContent) return headerLabel.textContent.trim();

	const sectionLabel = el.querySelector(".section-label");
	if (sectionLabel?.textContent) return sectionLabel.textContent.trim();

	const numberedHeading = el.querySelector(".numbered-heading");
	if (numberedHeading?.textContent) return numberedHeading.textContent.trim();

	return el.id;
}

export function useToc({ shadowRef }: UseTocOptions): UseTocResult {
	const [entries, setEntries] = useState<TocEntry[]>([]);
	const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
	const observerRef = useRef<IntersectionObserver | null>(null);

	// Extract sections and set up active tracking
	useEffect(() => {
		const shadow = shadowRef.current;
		if (!shadow) return;

		const elements: Element[] = [];

		const meta = shadow.querySelector("#article-meta");
		if (meta) elements.push(meta);

		const sections = shadow.querySelectorAll("section[id]");
		for (const s of sections) elements.push(s);

		if (elements.length === 0) return;

		// Build entries
		const tocEntries: TocEntry[] = elements.map((el) => ({
			id: el.id,
			label: el.id === "article-meta" ? "Cover" : extractLabel(el),
		}));
		setEntries(tocEntries);

		// Track active section
		const visibleSections = new Map<string, IntersectionObserverEntry>();

		observerRef.current = new IntersectionObserver(
			(ioEntries) => {
				for (const entry of ioEntries) {
					if (entry.isIntersecting) {
						visibleSections.set(entry.target.id, entry);
					} else {
						visibleSections.delete(entry.target.id);
					}
				}

				// Pick the topmost visible section
				let topmost: { id: string; top: number } | null = null;
				for (const [id, entry] of visibleSections) {
					const top = entry.boundingClientRect.top;
					if (!topmost || top < topmost.top) {
						topmost = { id, top };
					}
				}
				if (topmost) {
					setActiveSectionId(topmost.id);
				}
			},
			{ threshold: 0.1 },
		);

		for (const el of elements) {
			observerRef.current.observe(el);
		}

		return () => {
			observerRef.current?.disconnect();
		};
	}, [shadowRef]);

	const scrollToSection = useCallback(
		(id: string) => {
			const shadow = shadowRef.current;
			if (!shadow) return;
			const el = shadow.querySelector(`#${id}`);
			el?.scrollIntoView({ behavior: "smooth", block: "start" });
		},
		[shadowRef],
	);

	return { entries, activeSectionId, scrollToSection };
}
