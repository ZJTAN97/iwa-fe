import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// biome-ignore lint/style/noNonNullAssertion: <explanation>
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<MantineProvider defaultColorScheme="light">
			<App />
		</MantineProvider>
	</StrictMode>,
);
