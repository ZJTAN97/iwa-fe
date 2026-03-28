import { useState, useCallback } from "react";
import { NewsEmbed } from "./components/NewsEmbed";

interface EventLogEntry {
  timestamp: string;
  message: string;
}

function App() {
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [darkMode, setDarkMode] = useState(false);

  const handleNewsAction = useCallback((detail: { type: string; title: string }) => {
    setEvents((prev) => [
      {
        timestamp: new Date().toLocaleTimeString(),
        message: `[${detail.type}] "${detail.title}"`,
      },
      ...prev,
    ]);
  }, []);

  return (
    <div className={`app${darkMode ? " app-dark" : ""}`}>
      <header className="app-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <span className="app-badge">iframe Approach</span>
            <h1>News Reader — iframe Example</h1>
            <p>
              External news content is embedded via an iframe. The content runs in a
              completely separate browsing context with full style and JS isolation.
            </p>
          </div>
          <button className="dark-mode-toggle" onClick={() => setDarkMode((d) => !d)}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
        <p className="dark-mode-hint">
          Dark mode uses <strong>postMessage</strong> to tell the iframe to toggle its theme.
        </p>
      </header>

      <div className="app-content">
        <div>
          <div className="embed-container">
            <div className="embed-label">
              Embedded Content (iframe with srcdoc)
            </div>
            <NewsEmbed onNewsAction={handleNewsAction} darkMode={darkMode} />
          </div>

          <div className="event-log">
            <h2>Event Log (postMessage from iframe)</h2>
            <div className="event-log-entries">
              {events.length === 0 ? (
                <div className="event-log-empty">
                  Click Share or Bookmark in the article to see events...
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

        <aside className="app-sidebar">
          <h2>Host App Sidebar</h2>
          <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: "1rem" }}>
            This sidebar uses host app styles. Notice how the embedded article
            has completely different typography and colors — no leakage.
          </p>
          <ul>
            <li>Trending: AI in Healthcare</li>
            <li>Trending: Climate Tech 2026</li>
            <li>Trending: Quantum Computing</li>
            <li>Trending: Space Tourism</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

export default App;
