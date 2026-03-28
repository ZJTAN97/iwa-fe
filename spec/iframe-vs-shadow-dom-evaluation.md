# iframe vs Shadow DOM Evaluation for News Embedding

## Context

We are building a news reading application where external news content (HTML, CSS, and JavaScript produced by a separate internal team) needs to be embedded into a React host application. This document captures the evaluation process and decision rationale for choosing between iframe and Shadow DOM as the embedding strategy.

## Requirements

| Requirement         | Detail                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Content source      | External team (same org, trusted). API contract is negotiable but not fully enforceable.                             |
| Content complexity  | HTML article markup + opinionated CSS + light JS (DOM manipulation, scroll tracking, analytics calls to our backend) |
| Embed count         | One article at a time (reading view)                                                                                 |
| DOM accessibility   | Very important — Cmd+F (find-on-page) and screen reader access must work                                             |
| Security isolation  | Not required — same org, trusted content                                                                             |
| JS scope            | Light — no heavy framework, no reliance on `window`/`localStorage`/cookies. Some `document.querySelector` usage.     |
| Future interactions | Bidirectional host-to-article interaction on the roadmap (dark mode toggling, text annotation, highlighting)         |

## POC Structure

Both approaches were prototyped in a pnpm monorepo with Vite 8 + React 19 + TypeScript:

```
shadowdom-iframe/
├── shared/news-content/         # Shared external article (HTML/CSS/JS)
├── packages/iframe-example/     # iframe approach — port 5173
└── packages/shadow-dom-example/ # Shadow DOM approach — port 5174
```

Both POCs embed the same external news article and demonstrate:
- Style isolation (host app uses conflicting global styles)
- Event communication (share/bookmark buttons fire events to the host)
- Bidirectional interaction (dark mode toggle from host into article)

## Comparison

### Style Isolation

|               | iframe                         | Shadow DOM                                 |
| ------------- | ------------------------------ | ------------------------------------------ |
| Mechanism     | Separate browsing context      | Shadow boundary                            |
| Effectiveness | Complete — no leakage possible | Complete — styles don't cross the boundary |
| Verdict       | Equivalent                     | Equivalent                                 |

Both approaches fully isolate the article's opinionated CSS (serif fonts, color resets, aggressive `*` selectors) from the host app's sans-serif styling.

### JavaScript Isolation

|               | iframe                                   | Shadow DOM                                                                                      |
| ------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Mechanism     | Separate `window` context                | Shared `window` context                                                                         |
| DOM scoping   | Automatic — JS scoped to iframe document | Requires adaptation — `document.querySelector` must be redirected to `shadowRoot.querySelector` |
| Global access | Fully isolated                           | JS can access host `window`, globals                                                            |

**For our case:** Security isolation is not required (trusted same-org team). The external JS is light and the API contract is partially negotiable, so scoping `document.querySelector` calls is manageable. The regex-based scoping shim in the POC works for the current content but is fragile — a better long-term approach is to negotiate an init contract with the external team where they receive a root element and scope all queries to it.

### Communication & Events

|                   | iframe                                                                     | Shadow DOM                                                             |
| ----------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Article-to-host   | `postMessage` (must serialize data)                                        | `CustomEvent` with `composed: true` (crosses shadow boundary natively) |
| Host-to-article   | `postMessage` (must add listener in iframe)                                | Direct DOM access via `shadowRoot.querySelector()`                     |
| Protocol overhead | Every new interaction requires a new message type + handlers on both sides | Standard DOM APIs — no protocol needed                                 |

**Key finding from dark mode prototype:**

iframe required:
1. A `window.addEventListener('message', ...)` handler inside the iframe's `<script>` to receive toggle commands
2. A `useEffect` in React to `postMessage({ type: 'set-dark-mode', enabled })` to the iframe
3. Both sides agreeing on the message format

Shadow DOM required:
1. A `useEffect` in React: `shadowRoot.querySelector('.news-article')?.classList.toggle('dark-mode', darkMode)` — 3 lines, no protocol.

**Every future bidirectional feature (annotations, highlighting, theming) multiplies this DX gap.**

### Layout & Sizing

|                 | iframe                                                          | Shadow DOM                                 |
| --------------- | --------------------------------------------------------------- | ------------------------------------------ |
| Height handling | Must sync height via `ResizeObserver` + `postMessage` to parent | Content flows naturally in document layout |
| Overflow        | Scrolls independently unless height is synced                   | Participates in parent scroll              |

Shadow DOM eliminates the height-syncing boilerplate entirely.

### DOM Accessibility (Cmd+F, Screen Readers)

|                      | iframe                                   | Shadow DOM                               |
| -------------------- | ---------------------------------------- | ---------------------------------------- |
| Find-on-page (Cmd+F) | Works for same-origin / `srcdoc` iframes | Works — shadow DOM content is searchable |
| Screen readers       | Traverse into same-origin iframes        | Traverse into shadow DOM                 |
| SEO                  | Content hidden from parent document      | Content in same document                 |

**Note:** Initial assumption that Cmd+F wouldn't work in iframes was incorrect — `srcdoc` iframes are same-origin, so browser find-on-page searches into them. Both approaches are equivalent here for our use case. However, if the content were served cross-origin, iframe would lose this capability.

### Performance

|                  | iframe                                 | Shadow DOM                                |
| ---------------- | -------------------------------------- | ----------------------------------------- |
| Rendering        | Separate rendering pipeline per iframe | Shares main document's rendering pipeline |
| Memory           | Full browsing context per instance     | Lightweight — same document               |
| Relevance for us | Low — only 1 embed at a time           | Low — only 1 embed at a time              |

With only one article at a time, the performance difference is negligible.

## Decision Matrix

| Factor                                      | Weight        | iframe                           | Shadow DOM             | Winner         |
| ------------------------------------------- | ------------- | -------------------------------- | ---------------------- | -------------- |
| Style isolation                             | High          | Full                             | Full                   | Tie            |
| DX for bidirectional interaction            | High          | postMessage protocol per feature | Direct DOM access      | **Shadow DOM** |
| Future extensibility (annotations, theming) | High          | Linear protocol growth           | Standard DOM APIs      | **Shadow DOM** |
| Layout integration                          | Medium        | Requires height syncing          | Natural flow           | **Shadow DOM** |
| JS scoping simplicity                       | Medium        | Automatic                        | Requires shim/contract | **iframe**     |
| DOM accessibility (Cmd+F, a11y)             | High          | Works (same-origin)              | Works                  | Tie            |
| Security isolation                          | Low (trusted) | Full                             | Partial                | N/A            |
| Performance                                 | Low (1 embed) | Heavier                          | Lighter                | N/A            |

## Decision

**Shadow DOM** is the recommended approach for this project.

### Primary reasons
1. **Bidirectional interaction DX** — direct DOM access is dramatically simpler than postMessage protocols, and this gap widens with every new feature (dark mode, annotations, highlighting, theming)
2. **Natural layout flow** — no height-syncing boilerplate
3. **Future-friendly** — standard DOM APIs mean new features don't require building messaging infrastructure

### Accepted tradeoffs
- **JS scoping requires adaptation** — external content's `document.querySelector` calls must be redirected to the shadow root. Short-term: regex shim. Long-term: negotiate an init contract with the external team (`init(rootElement)` pattern where all DOM queries scope to the provided root).
- **`position: fixed` behaves differently** — fixed-position elements inside shadow DOM position relative to the shadow host, not the viewport. The external team should avoid fixed overlays, or we adapt case-by-case. This is acceptable.
- **No JS isolation** — external JS runs in the same `window` context. Acceptable because the content is from a trusted internal team.

### Recommended next steps
1. Define an init contract with the external team: `initArticle(rootElement: HTMLElement)` where all DOM access is scoped to `rootElement`
2. Build out the Shadow DOM integration layer as a reusable React component
3. Prototype text annotation/highlighting to validate the DX advantage for the next planned feature
