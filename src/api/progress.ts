export interface ReadProgress {
	articleId: string;
	percentage: number;
	lastUpdated: string;
}

export async function saveReadProgress(progress: ReadProgress): Promise<void> {
	await new Promise((r) => setTimeout(r, 300 + Math.random() * 300));
	// console.log("[mock-api] POST /api/read-progress", progress);
}
