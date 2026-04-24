import { PieChart } from "@mantine/charts";
import {
	ActionIcon,
	Box,
	Button,
	Container,
	Flex,
	Group,
	Modal,
	Slider,
	Stack,
	Text,
	useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
	IconArrowLeft,
	IconArrowUp,
	IconMoon,
	IconSun,
	IconThumbUp,
	IconTypography,
	IconUsers,
} from "@tabler/icons-react";
import { useLayoutEffect, useRef, useState } from "react";
import Lightbox, { type Slide } from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import css from "../../shared/news-content/article.css?raw";
import html from "../../shared/news-content/article.html?raw";
import js from "../../shared/news-content/article.js?raw";
import { useReadProgress } from "../hooks/use-read-progress";
import classes from "./NewsEmbed.module.css";
import { TocSidebar } from "./TocSidebar";

export function NewsEmbed() {
	const styleRef = useRef(document.createElement("style"));
	const containerRef = useRef(document.createElement("div"));


	const isMobile = useMediaQuery("(max-width: 48em)", true);

	const hostRef = useRef<HTMLDivElement | null>(null);
	const shadowRef = useRef<ShadowRoot | null>(null);
	const [isRead, setIsRead] = useState(false);
	const [slides, setSlides] = useState<Slide[]>([]);
	const [lightboxIndex, setLightboxIndex] = useState(-1);
	const fontScaleRef = useRef(1);
	const [fontModalOpened, { open: openFontModal, close: closeFontModal }] =
		useDisclosure(false);

	const { colorScheme, toggleColorScheme } = useMantineColorScheme();
	const isDark = colorScheme === "dark";
	const { percentage } = useReadProgress(hostRef, "AA/123/1234/ZZ");
	const isComplete = percentage === 100;

	const applyFontScale = (scale: number) => {
		fontScaleRef.current = scale;
		const article =
			shadowRef.current?.querySelector<HTMLElement>(".news-article");
		if (article) article.style.zoom = String(scale);
	};

	const applyDarkMode = (dark: boolean) => {
		const article = shadowRef.current?.querySelector(".news-article");
		article?.classList.toggle("dark-mode", dark);
	};

	const handleToggleColorScheme = () => {
		applyDarkMode(!isDark);
		toggleColorScheme();
	};

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

		// Apply initial dark mode state; subsequent toggles update the shadow DOM
		// imperatively via handleToggleColorScheme.
		applyDarkMode(isDark);

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

		// Discover images in embedded doc, build slide list.
		// Controls + index state live in host React — lightbox renders via portal to document.body.
		const imgs = Array.from(shadow.querySelectorAll<HTMLImageElement>("img"));
		const discovered: Slide[] = imgs.map((img) => ({
			src: img.currentSrc || img.src,
			alt: img.alt,
			description: img.dataset.caption || img.alt || undefined,
		}));
		setSlides(discovered);

		// Event delegation on shadow root — clicks bubble across shadow boundary
		// but target is retargeted; use composedPath to find actual <img>.
		const handleClick = (e: Event) => {
			const path = e.composedPath();
			const img = path.find(
				(el): el is HTMLImageElement =>
					el instanceof HTMLImageElement && imgs.includes(el),
			);
			if (!img) return;
			e.preventDefault();
			setLightboxIndex(imgs.indexOf(img));
		};
		shadow.addEventListener("click", handleClick);
		return () => shadow.removeEventListener("click", handleClick);
	}, []);

	return (
		<div>
			<Box component="header" className={classes.toolbar}>
				<Button variant="transparent" leftSection={<IconArrowLeft size={18} />}>
					Back
				</Button>
				{percentage > 7 && !isMobile ? (
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
					<ActionIcon
						variant="subtle"
						color="blue.9"
						title="Font size"
						onClick={openFontModal}
					>
						<IconTypography size={20} />
					</ActionIcon>
					<ActionIcon variant="subtle" color="blue.9" title="Like">
						<IconThumbUp size={20} />
					</ActionIcon>

					<ActionIcon
						variant="subtle"
						color="gray.8"
						onClick={handleToggleColorScheme}
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
			<Modal
				opened={fontModalOpened}
				onClose={closeFontModal}
				title="Adjust font size"
				centered
				size="sm"
			>
				<Stack gap="xl">
					<Text size="sm" c="dimmed">
						Drag the slider to adjust the article text size. Changes apply
						immediately.
					</Text>
					<Flex align="center" gap="md">
						<Text size="xs" c="dimmed">
							A
						</Text>
						<Slider
							flex={1}
							defaultValue={fontScaleRef.current}
							onChange={applyFontScale}
							min={0.75}
							max={1.75}
							step={0.05}
							label={(v) => `${Math.round(v * 100)}%`}
							marks={[
								{ value: 0.75 },
								{ value: 1, label: "Default" },
								{ value: 1.25 },
								{ value: 1.5 },
								{ value: 1.75 },
							]}
						/>
						<Text size="xl" c="dimmed">
							A
						</Text>
					</Flex>
				</Stack>
			</Modal>
			<Lightbox
				open={lightboxIndex >= 0}
				index={lightboxIndex}
				close={() => setLightboxIndex(-1)}
				slides={slides}
				plugins={[Zoom]}
				zoom={{
					maxZoomPixelRatio: 3,
					zoomInMultiplier: 2,
					doubleTapDelay: 300,
					doubleClickDelay: 300,
					doubleClickMaxStops: 2,
					keyboardMoveDistance: 50,
					wheelZoomDistanceFactor: 100,
					pinchZoomDistanceFactor: 100,
					scrollToZoom: true,
				}}
			/>
		</div>
	);
}
