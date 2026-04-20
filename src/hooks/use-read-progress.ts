import { type RefObject, useEffect, useRef, useState } from "react";
import { saveReadProgress } from "../api/progress";

export function useReadProgress(
	hostRef: RefObject<HTMLDivElement | null>,
	articleId: string,
): { percentage: number } {
	const [percentage, setPercentage] = useState(0);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;

		const onScroll = () => {
			const scrollTop = window.scrollY;
			const maxScroll =
				document.documentElement.scrollHeight - window.innerHeight;
			const raw = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
			setPercentage(Math.min(100, Math.max(0, Math.round(raw))));
		};

		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, [hostRef]);

	useEffect(() => {
		if (percentage === 0) return;
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			saveReadProgress({
				articleId,
				percentage,
				lastUpdated: new Date().toISOString(),
			});
		}, 500);

		return () => clearTimeout(debounceRef.current);
	}, [articleId, percentage]);

	return { percentage };
}
