import {
	ActionIcon,
	Box,
	Button,
	Container,
	Group,
	Paper,
	Progress,
	ScrollArea,
	Stack,
	Text,
} from "@mantine/core";
import { useMantineColorScheme } from "@mantine/core";
import {
	IconArrowLeft,
	IconMoon,
	IconSun,
	IconThumbUp,
	IconTypography,
	IconUsers,
} from "@tabler/icons-react";
import { useCallback, useRef, useState } from "react";
import { TocSidebar } from "../../../shared/components/TocSidebar/TocSidebar";
import classes from "./App.module.css";
import { bookmarkArticle } from "./api/progress";
import { NewsEmbed } from "./components/NewsEmbed";
import { useReadProgress } from "./hooks/use-read-progress";
import { useToc } from "./hooks/use-toc";

interface EventLogEntry {
	timestamp: string;
	message: string;
}

function App() {
	const [events, setEvents] = useState<EventLogEntry[]>([]);
	const [isRead, setIsRead] = useState(false);
	const { colorScheme, toggleColorScheme } = useMantineColorScheme();
	const isDark = colorScheme === "dark";
	const iframeRef = useRef<HTMLIFrameElement | null>(null);
	const { percentage } = useReadProgress("AA/123/1234/ZZ");
	const { entries, activeSectionId, scrollToSection } = useToc({ iframeRef });
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
		<Container size="md" p={0}>
			<Box component="header" className={classes.toolbar}>
				<Progress
					value={percentage}
					size={3}
					color={isComplete ? "green" : "blue.7"}
					className={classes.progressBar}
				/>
				<Button
					variant="subtle"
					leftSection={<IconArrowLeft size={18} />}
					size="compact-sm"
				>
					Back
				</Button>
				<Group gap="xs">
					<ActionIcon variant="subtle" color="gray" title="People">
						<IconUsers size={20} />
					</ActionIcon>
					<ActionIcon variant="subtle" color="gray" title="Font size">
						<IconTypography size={20} />
					</ActionIcon>
					<ActionIcon variant="subtle" color="gray" title="Like">
						<IconThumbUp size={20} />
					</ActionIcon>
					<Button
						size="compact-sm"
						fw={600}
						color={isRead || isComplete ? "green" : "blue.7"}
						onClick={() => setIsRead((r) => !r)}
					>
						{isRead || isComplete
							? "✓ Read"
							: `Mark Read${percentage > 0 ? ` (${percentage}%)` : ""}`}
					</Button>
					<ActionIcon
						variant="subtle"
						color="gray"
						onClick={() => toggleColorScheme()}
						title="Toggle dark mode"
					>
						{isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
					</ActionIcon>
				</Group>
			</Box>

			<Stack gap={0}>
				<div className={classes.contentLayout}>
					<Box className={classes.embedContainer}>
						<NewsEmbed
							onNewsAction={handleNewsAction}
							darkMode={isDark}
							onBookmark={handleBookmark}
							onIframeReady={(iframe) => {
								iframeRef.current = iframe;
							}}
						/>
					</Box>
					<TocSidebar
						entries={entries}
						activeSectionId={activeSectionId}
						onEntryClick={scrollToSection}
					/>
				</div>

				<Paper p="lg" radius={0} className={classes.eventLog}>
					<Text size="lg" fw={600} mb="md">
						Event Log (postMessage from iframe)
					</Text>
					<ScrollArea h={200}>
						{events.length === 0 ? (
							<Text c="dimmed" fs="italic">
								Interact with the article to see events...
							</Text>
						) : (
							events.map((e, i) => (
								<Box key={i} py={6} className={classes.eventEntry}>
									<Text span fw={700}>
										{e.timestamp}
									</Text>{" "}
									<Text span size="sm" ff="monospace">
										{e.message}
									</Text>
								</Box>
							))
						)}
					</ScrollArea>
				</Paper>
			</Stack>
		</Container>
	);
}

export default App;
