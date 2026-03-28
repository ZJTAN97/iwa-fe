import { useEffect, useRef, useState } from "react";
import { saveReadProgress } from "../api/progress";

interface UseReadProgressResult {
	percentage: number;
	sectionsRead: string[];
}

/**
 * Listens for 'read-progress' postMessage events from the iframe
 * and debounces mock API calls.
 */
export function useReadProgress(articleId: string): UseReadProgressResult {
	const [percentage, setPercentage] = useState(0);
	const [sectionsRead, setSectionsRead] = useState<string[]>([]);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => {
		function handleMessage(event: MessageEvent) {
			if (event.data?.type === "read-progress") {
				setPercentage(event.data.percentage);
				setSectionsRead(event.data.sectionsRead);
			}
		}

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

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
