import { PieChart } from "@mantine/charts";
import {
	ActionIcon,
	Box,
	Button,
	Container,
	Flex,
	Group,
	Stack,
	Text,
	useMantineColorScheme,
} from "@mantine/core";
import {
	IconArrowLeft,
	IconArrowUp,
	IconMoon,
	IconSun,
	IconThumbUp,
	IconTypography,
	IconUsers,
} from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import css from "../../shared/news-content/article.css?raw";
import html from "../../shared/news-content/article.html?raw";
import js from "../../shared/news-content/article.js?raw";
import { useReadProgress } from "../hooks/use-read-progress";
import classes from "./NewsEmbed.module.css";
import { TocSidebar } from "./TocSidebar";

export function NewsEmbed() {
	const styleRef = useRef(document.createElement("style"));
	const containerRef = useRef(document.createElement("div"));

	const hostRef = useRef<HTMLDivElement | null>(null);
	const shadowRef = useRef<ShadowRoot | null>(null);
	const [isRead, setIsRead] = useState(false);
	const { colorScheme, toggleColorScheme } = useMantineColorScheme();
	const isDark = colorScheme === "dark";
	const { percentage } = useReadProgress(hostRef, "AA/123/1234/ZZ");
	const isComplete = percentage === 100;

	// TODO: Research if its better to use useLayoutEffect or useSyncExternalStore instead
	useLayoutEffect(() => {
		const host = hostRef.current;
		if (!host || shadowRef.current) return;

		const shadow = host.attachShadow({ mode: "open" });
		shadowRef.current = shadow;

		// Inject styles
		styleRef.current.textContent = `${css} section { scroll-margin-top: 75px; }`;

		shadow.appendChild(styleRef.current);

		// Inject HTML
		containerRef.current.innerHTML = html;
		shadow.appendChild(containerRef.current);

		// Execute external JS with a document proxy that scopes DOM queries to the shadow root
		// this is the "contract" we will need to discuss cross teams, basically what APIs are we gona define instead of us trying to catch all
		if (js) {
			const scriptFn = new Function("shadowRoot", "document", "window", js);

			const docProxy = new Proxy(document, {
				// The 'get' trap intercepts property access
				get(target, prop) {
					if (prop === "querySelector")
						return shadow.querySelector.bind(shadow);
					if (prop === "querySelectorAll")
						return shadow.querySelectorAll.bind(shadow);
					if (prop === "body") return shadow;
					const val = Reflect.get(target, prop);
					return typeof val === "function" ? val.bind(target) : val;
				},
			});

			// this "activates" the JS
			scriptFn(shadow, docProxy, window);
		}
	}, []);

	// Toggle dark mode directly on the shadow DOM content
	useEffect(() => {
		const shadow = shadowRef.current;
		if (!shadow) return;
		const article = shadow.querySelector(".news-article");

		if (article) {
			article.classList.toggle("dark-mode", !!isDark);
		}
	}, [isDark]);

	return (
		<div>
			<Box component="header" className={classes.toolbar}>
				{/* <Progress
					value={percentage}
					size={3}
					color={isComplete ? "green" : "blue.7"}
					className={classes.progressBar}
				/> */}
				<Button variant="transparent" leftSection={<IconArrowLeft size={18} />}>
					Back
				</Button>
				{percentage > 7 ? (
					<Stack gap={2}>
						<Flex gap="xs" align="center">
							<PieChart
								size={12}
								data={[
									{ name: "Read", value: 100 - percentage, color: "gray.0" },
									{ name: "Unread", value: percentage, color: "blue.6" },
								]}
								startAngle={-270}
							/>
							<Text size="xs" c="blue.6">
								In Progress · 4 minutes
							</Text>
						</Flex>

						<Text size="sm" c="blue.9">
							The Impact of Quantum Computing on Modern Information Security
						</Text>
					</Stack>
				) : null}

				<Group gap="lg">
					<ActionIcon variant="subtle" color="blue.9" title="People">
						<IconUsers size={20} />
					</ActionIcon>
					<ActionIcon variant="subtle" color="blue.9" title="Font size">
						<IconTypography size={20} />
					</ActionIcon>
					<ActionIcon variant="subtle" color="blue.9" title="Like">
						<IconThumbUp size={20} />
					</ActionIcon>
					<Button
						size="xs"
						color={isRead || isComplete ? "green" : "blue.8"}
						onClick={() => setIsRead((r) => !r)}
					>
						{isRead || isComplete ? "✓ Read" : "Mark Read"}
					</Button>
					<ActionIcon
						variant="subtle"
						color="gray.8"
						onClick={() => toggleColorScheme()}
						title="Toggle dark mode"
					>
						{isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
					</ActionIcon>
				</Group>
			</Box>
			<Container size="md" p={0}>
				<div className={classes.contentLayout}>
					<Box className={classes.embedContainer}>
						<Flex>
							<div ref={hostRef} data-news-shadow-host />
						</Flex>
					</Box>
					<TocSidebar shadowRef={shadowRef} />
				</div>
			</Container>
			{percentage > 10 ? (
				<Box
					className={classes.backToTop}
					onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
				>
					<IconArrowUp size={18} color="var(--mantine-color-dimmed)" />
					<Text size="xs" c="dimmed">
						Back to top
					</Text>
				</Box>
			) : null}
		</div>
	);
}
