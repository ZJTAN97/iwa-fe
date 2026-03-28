import { type RefObject, useEffect, useRef, useState } from "react";
import { saveReadProgress } from "../api/progress";

interface UseReadProgressResult {
	percentage: number;
	sectionsRead: string[];
}

export function useReadProgress(
	shadowRef: RefObject<ShadowRoot | null>,
	articleId: string,
): UseReadProgressResult {
	const [percentage, setPercentage] = useState(0);
	const [sectionsRead, setSectionsRead] = useState<string[]>([]);
	const readSetRef = useRef(new Set<string>());
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => {
		const shadow = shadowRef.current;
		if (!shadow) return;

		const sections = shadow.querySelectorAll("section[id]");
		if (sections.length === 0) return;

		const totalSections = sections.length;

		const observer = new IntersectionObserver(
			(entries) => {
				let changed = false;
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const id = entry.target.id;
						if (!readSetRef.current.has(id)) {
							readSetRef.current.add(id);
							changed = true;
						}
					}
				}

				if (changed) {
					const newPercentage = Math.round(
						(readSetRef.current.size / totalSections) * 100,
					);
					const newSections = [...readSetRef.current];
					setPercentage(newPercentage);
					setSectionsRead(newSections);
				}
			},
			{ threshold: 0.5 },
		);

		for (const section of sections) {
			observer.observe(section);
		}

		return () => observer.disconnect();
	}, [shadowRef]);

	// Debounced API call when progress changes
	useEffect(() => {
		if (percentage === 0) return;

		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			saveReadProgress({
				articleId,
				percentage,
				sectionsRead,
				lastUpdated: new Date().toISOString(),
			});
		}, 1000);

		return () => clearTimeout(debounceRef.current);
	}, [articleId, percentage, sectionsRead]);

	return { percentage, sectionsRead };
}
