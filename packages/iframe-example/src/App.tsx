import { useCallback, useState } from "react";
import { NewsEmbed } from "./components/NewsEmbed";
import { bookmarkArticle } from "./api/progress";
import { useReadProgress } from "./hooks/use-read-progress";

interface EventLogEntry {
	timestamp: string;
	message: string;
}

function App() {
	const [events, setEvents] = useState<EventLogEntry[]>([]);
	const [darkMode, setDarkMode] = useState(false);
	const [isRead, setIsRead] = useState(false);
	const { percentage } = useReadProgress("AA/123/1234/ZZ");
	const isComplete = percentage === 100;

	const handleNewsAction = useCallback(
		(detail: { type: string; title: string }) => {
			setEvents((prev) => [
				{
					timestamp: new Date().toLocaleTimeString(),
					message: `[${detail.type}] "${detail.title}"`,
				},
				...prev,
			]);
		},
		[],
	);

	const handleBookmark = useCallback(
		(articleId: string) => bookmarkArticle(articleId),
		[],
	);

	return (
		<div className={`app${darkMode ? " app-dark" : ""}`}>
			{/* Article header toolbar — part of the host React app, NOT in the iframe */}
			<header className="article-toolbar">
				<div
					className={`toolbar-progress-bar${isComplete ? " toolbar-progress-bar--complete" : ""}`}
					style={{ width: `${percentage}%` }}
				/>
				<button className="toolbar-btn toolbar-back" type="button">
					<span className="toolbar-back-arrow">&larr;</span> Back
				</button>
				<div className="toolbar-actions">
					<button
						className="toolbar-btn toolbar-icon"
						type="button"
						title="People"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-label="People"
						>
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
							<path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
					</button>
					<button
						className="toolbar-btn toolbar-icon"
						type="button"
						title="Font size"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-label="Font size"
						>
							<polyline points="4 7 4 4 20 4 20 7" />
							<line x1="9" y1="20" x2="15" y2="20" />
							<line x1="12" y1="4" x2="12" y2="20" />
						</svg>
					</button>
					<button
						className="toolbar-btn toolbar-icon"
						type="button"
						title="Like"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-label="Like"
						>
							<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
						</svg>
					</button>
					<button
						className={`toolbar-btn toolbar-mark-read${isRead || isComplete ? " toolbar-mark-read--active" : ""}`}
						type="button"
						onClick={() => setIsRead((r) => !r)}
					>
						{isRead || isComplete
							? "✓ Read"
							: `Mark Read${percentage > 0 ? ` (${percentage}%)` : ""}`}
					</button>
					<button
						className="toolbar-btn toolbar-dark-toggle"
						type="button"
						onClick={() => setDarkMode((d) => !d)}
					>
						{darkMode ? "☀" : "☾"}
					</button>
				</div>
			</header>

			<div className="app-content">
				<div className="embed-container">
					<NewsEmbed onNewsAction={handleNewsAction} darkMode={darkMode} onBookmark={handleBookmark} />
				</div>

				<div className="event-log">
					<h2>Event Log (postMessage from iframe)</h2>
					<div className="event-log-entries">
						{events.length === 0 ? (
							<div className="event-log-empty">
								Interact with the article to see events...
							</div>
						) : (
							events.map((e, i) => (
								<div key={i} className="event-log-entry">
									<strong>{e.timestamp}</strong> {e.message}
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
