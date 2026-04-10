import { useEffect, useRef, useState } from "react";
import classes from "./TocSidebar.module.css";

export const entries = [
	{
		id: "article-meta",
		label: "Cover",
	},
	{
		id: "executive-summary",
		label: "Executive Summary",
	},
	{
		id: "section-heightened-terror",
		label: "Heightened terror in China Section header",
	},
	{
		id: "section-diverging-views",
		label: "Diverging views",
	},
	{
		id: "section-video-briefing",
		label: "Video briefing section header",
	},
	{
		id: "section-russian-dolls",
		label: "Russian dolls and G.I Joes section header",
	},
];

interface TocSidebarProps {
	shadowRef: React.RefObject<ShadowRoot | null>;
}

export function TocSidebar({ shadowRef }: TocSidebarProps) {
	const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
	const observerRef = useRef<IntersectionObserver | null>(null);

	useEffect(() => {
		const shadow = shadowRef.current;
		if (!shadow) return;

		const elements: Element[] = [];

		entries.forEach((entry) => {
			const section = shadow.querySelector(`#${entry.id}`);
			if (section) {
				elements.push(section);
			}
		});

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
			{ threshold: 0.1, rootMargin: "-150px" },
		);

		for (const el of elements) {
			observerRef.current.observe(el);
		}

		return () => {
			observerRef.current?.disconnect();
		};
	}, [shadowRef]);

	const scrollToSection = (id: string) => {
		const shadow = shadowRef.current;
		if (!shadow) return;
		const el = shadow.querySelector(`#${id}`);
		el?.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	return (
		<nav className={classes.sidebar}>
			<h2 className={classes.title}>Table of Contents</h2>
			{entries.map((entry) => (
				<button
					key={entry.id}
					type="button"
					className={`${classes.link} ${entry.id === activeSectionId ? classes.active : ""}`}
					onClick={() => scrollToSection(entry.id)}
				>
					{entry.label}
				</button>
			))}
		</nav>
	);
}
