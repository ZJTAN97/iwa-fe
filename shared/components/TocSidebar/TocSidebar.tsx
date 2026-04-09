import classes from "./TocSidebar.module.css";

export interface TocEntry {
	id: string;
	label: string;
}

interface TocSidebarProps {
	entries: TocEntry[];
	activeSectionId: string | null;
	onEntryClick: (id: string) => void;
}

export function TocSidebar({
	entries,
	activeSectionId,
	onEntryClick,
}: TocSidebarProps) {
	return (
		<nav className={classes.sidebar}>
			<h2 className={classes.title}>Table of Contents</h2>
			{entries.map((entry) => (
				<button
					key={entry.id}
					type="button"
					className={`${classes.link} ${entry.id === activeSectionId ? classes.active : ""}`}
					onClick={() => onEntryClick(entry.id)}
				>
					{entry.label}
				</button>
			))}
		</nav>
	);
}
