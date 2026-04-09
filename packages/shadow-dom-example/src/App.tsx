import {
	ActionIcon,
	Box,
	Button,
	Container,
	Group,
	Progress,
	useMantineColorScheme,
} from "@mantine/core";
import {
	IconArrowLeft,
	IconMoon,
	IconSun,
	IconThumbUp,
	IconTypography,
	IconUsers,
} from "@tabler/icons-react";
import { useRef, useState } from "react";
import { TocSidebar } from "../../../shared/components/TocSidebar/TocSidebar";
import classes from "./App.module.css";
import { NewsEmbed } from "./components/NewsEmbed";
import { useReadProgress } from "./hooks/use-read-progress";
import { useToc } from "./hooks/use-toc";

function App() {
	const [isRead, setIsRead] = useState(false);
	const { colorScheme, toggleColorScheme } = useMantineColorScheme();
	const isDark = colorScheme === "dark";
	const shadowRef = useRef<ShadowRoot | null>(null);
	const { percentage } = useReadProgress(shadowRef, "AA/123/1234/ZZ");
	const { entries, activeSectionId, scrollToSection } = useToc({ shadowRef });
	const isComplete = percentage === 100;

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

			<div className={classes.contentLayout}>
				<Box className={classes.embedContainer}>
					<NewsEmbed
						onShadowReady={(shadow) => {
							shadowRef.current = shadow;
						}}
						darkMode={isDark}
					/>
				</Box>
				<TocSidebar
					entries={entries}
					activeSectionId={activeSectionId}
					onEntryClick={scrollToSection}
				/>
			</div>
		</Container>
	);
}

export default App;
