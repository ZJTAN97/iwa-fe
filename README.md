# Research on ShadowDOM vs iframe.

## Context

A reading application where external news content (HTML, CSS, and JavaScript produced by a separate internal team) needs to be embedded into a React host application. This document captures the evaluation process and decision rationale for choosing between iframe and Shadow DOM as the embedding strategy.

## Requirements

1. Must be able to run JS
2. Can prevent bleeding of parent app's CSS into product
3. Ideally can interact with product's html easily.
4. Can integrate with Table Of Contents (TOC) (**this will most likely need to be handled by upstream, Digital Production?)
5. Must integrate with Digital Production (**need to clarify what this means actually)
6. Content source: External team (same org, trustable-ish). API contract is negotiable but not fully enforceable.
7. DOM accessibility: Very important — Ctrl+F (find-on-page) and screen reader access must work
8. Future interactions: Bidirectional host-to-product interaction on the roadmap (dark mode toggling, text annotation, highlighting)

## Evaluation Approach

Both approaches were prototyped in a pnpm monorepo with Vite 8 + React 19 + TypeScript to ensure that it aligns with the current technology stack:

```md
shadowdom-iframe/
├── shared/news-content/         # Shared external mock product (HTML/CSS/JS)
├── packages/iframe-example/     # iframe approach — port 5173
└── packages/shadow-dom-example/ # Shadow DOM approach — port 5174
```

Both POCs embed the same external news article and demonstrate:
- Style isolation (host app uses conflicting global styles)
- Event communication (share/bookmark buttons fire events to the host)
- Bidirectional interaction (dark mode toggle from host into product)

## Introduction to Shadow DOM

The Shadow DOM is a web standard designed to provide encapsulation in web development. It allows developers to create a private, isolated DOM tree within an element, ensuring that the internal structure, styles, and behavior of a component do not interfere with—and are not affected by—the rest of the web page.

Some terminologies:
- Shadow Tree: The hidden DOM tree inside the Shadow DOM.
- Shadow Boundary: The line where the Shadow DOM ends and the regular DOM begins.
- Shadow Root: The starting node of the internal tree.

```js
// 1. Select the host element
const host = document.querySelector('#host-element');

// 2. Attach a shadow root (mode: 'open' allows access via JS if needed)
const shadow = host.attachShadow({ mode: 'open' });

// 3. Add internal content and styles
shadow.innerHTML = `
  <style>
    p { color: red; font-weight: bold; } /* Only affects <p> inside this shadow */
  </style>
  <p>I am protected by the Shadow DOM!</p>
`;
```

## Detailed Comparison

### 1. Style Isolation

Both approaches fully isolate the article's opinionated CSS (serif fonts, color resets, aggressive `*` selectors) from the host app's sans-serif styling.

|               | iframe                         | Shadow DOM                                 |
| ------------- | ------------------------------ | ------------------------------------------ |
| Mechanism     | Separate browsing context      | Shadow boundary                            |
| Effectiveness | Complete — no leakage possible | Complete — styles don't cross the boundary |
| Verdict       | Equivalent                     | Equivalent                                 |

### 2. JavaScript Isolation

|               | iframe                                   | Shadow DOM                                                                                      |
| ------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Mechanism     | Separate `window` context                | Shared `window` context                                                                         |
| DOM scoping   | Automatic — JS scoped to iframe document | Requires adaptation — `document.querySelector` must be redirected to `shadowRoot.querySelector` |
| Global access | Fully isolated                           | JS can access host `window`, globals                                                            |


**For our case:** Security isolation is not required (trusted same-org team). The external JS is light and the API contract is partially negotiable, so scoping `document.querySelector` calls is manageable. 

### 3. Communication & Events

**Note to readers: Dive into the code examples to better understand and feel the differences in DX when implementing JS related requirements for embedded documents.

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

**Every future bidirectional feature (annotations, highlighting, theming) multiplies this DX gap.**

Shadow DOM required:
1. A `useEffect` in React: `shadowRoot.querySelector('.news-article')?.classList.toggle('dark-mode', darkMode)` — 3 lines, no protocol.


### 4. Layout & Sizing

|                 | iframe                                                          | Shadow DOM                                 |
| --------------- | --------------------------------------------------------------- | ------------------------------------------ |
| Height handling | Must sync height via `ResizeObserver` + `postMessage` to parent | Content flows naturally in document layout |
| Overflow        | Scrolls independently unless height is synced                   | Participates in parent scroll              |

Shadow DOM eliminates the height-syncing boilerplate entirely.


### 5. DOM Accessibility (Cmd+F, Screen Readers)

|                      | iframe                                   | Shadow DOM                               |
| -------------------- | ---------------------------------------- | ---------------------------------------- |
| Find-on-page (Cmd+F) | Works for same-origin / `srcdoc` iframes | Works — shadow DOM content is searchable |
| Screen readers       | Traverse into same-origin iframes        | Traverse into shadow DOM                 |
| SEO                  | Content hidden from parent document      | Content in same document                 |

**Note:** Initial assumption that Cmd+F wouldn't work in iframes was incorrect — `srcdoc` iframes are same-origin, so browser find-on-page searches into them. Both approaches are equivalent here for our use case. However, if the content were served cross-origin, iframe would lose this capability.


### 6. Performance

|                  | iframe                                 | Shadow DOM                                |
| ---------------- | -------------------------------------- | ----------------------------------------- |
| Rendering        | Separate rendering pipeline per iframe | Shares main document's rendering pipeline |
| Memory           | Full browsing context per instance     | Lightweight — same document               |
| Relevance for us | Low — only 1 embed at a time           | Low — only 1 embed at a time              |

With only one article at a time, the performance difference is negligible.


## Decision Matrix

| Factor                                      | Weight        | iframe                                                 | Shadow DOM        | Winner         |
| ------------------------------------------- | ------------- | ------------------------------------------------------ | ----------------- | -------------- |
| Style isolation                             | High          | Full                                                   | Full              | Tie            |
| DX for bidirectional interaction            | High          | postMessage protocol per feature (worst case scenario) | Direct DOM access | **Shadow DOM** |
| Future extensibility (annotations, theming) | High          | Linear protocol growth                                 | Standard DOM APIs | **Shadow DOM** |
| Layout integration                          | Medium        | Requires height syncing                                | Natural flow      | **Shadow DOM** |
| JS scoping simplicity                       | Medium        | Automatic                                              | Requires scoping  | **iframe**     |
| DOM accessibility (Cmd+F, a11y)             | High          | Works (same-origin)                                    | Works             | Tie            |
| Security isolation                          | Low (trusted) | Full                                                   | Partial           | N/A            |
| Performance                                 | Low (1 embed) | Heavier                                                | Lighter           | N/A            |


## Final Decision & Recommendation

I personally recommend **Shadow DOM** as the approach for our use case.

### Primary reasons
1. **Bidirectional interaction DX** — direct DOM access is dramatically simpler than postMessage protocols (granted, this is worst case scenario for iframe), and this gap widens with every new feature (dark mode, annotations, highlighting, theming)
2. **Natural layout flow** — no height-syncing boilerplate
3. **Future-friendly** — standard DOM APIs mean new features don't require building messaging infrastructure in the event theres cross origin resource.

### Accepted tradeoffs
- **JS scoping requires adaptation** — external content's `document.querySelector` calls must be redirected to the shadow root. Short-term: regex shim. Long-term: negotiate an init contract with the external team (`init(rootElement)` pattern where all DOM queries scope to the provided root).
- **`position: fixed` behaves differently** — fixed-position elements inside shadow DOM position relative to the shadow host, not the viewport. The external team should avoid fixed overlays, or we adapt case-by-case. This is acceptable.
- **No JS isolation** — external JS runs in the same `window` context. Acceptable because the content is from a trusted internal team.

### Probable Next Steps
1. Define an init contract with the external team: `initArticle(rootElement: HTMLElement)` where all DOM access is scoped to `rootElement`
2. Build out the Shadow DOM integration layer as a reusable React component


## Things to find out / follow up

- get the full product file from YY

- CSS Variables will it bleed?

```css
var(--color-black);
```

- handling of video
  - do a poc on it
  - see whether the paint process gets stuck

- If TOC has to be handled by host App how should it be handled by shadowdom and iframe
  - mock the json response and render directly from host app

- bubbling events from shadow dom to host app

- continuous (just purely rely on intersection observer)

- how does it handle `body` and `head` tags, right now is just rendered as string on the DOM.

- try directly in OA Dev

- **by Wednesday 15th April**

---

## Rendering HTML Document Strings in Shadow DOM

When you inject a full HTML string (containing <html>, <head>, and <body>) into a shadowRoot via innerHTML, the browser treats it as a document fragment, not a standalone document. This results in the following behavior:

## 1. Structural Tags (<html>, <head>, <body>)

* Behavior: Ignored or Stripped.
* Reason: A document can only have one root <html> and one <body>. Since the Shadow DOM is a "mini DOM" attached to an existing page, the parser ignores these top-level structural tags.
* Result: Only the contents inside these tags are parsed and added to the Shadow Tree.

## 2. Header Content (<style>, <link>)

* Behavior: Parsed and Applied.
* Reason: Even though the <head> tag itself is stripped, the browser still processes <style> and <link rel="stylesheet"> tags found within the string.
* Encapsulation: These styles are locally scoped. They will style elements inside the Shadow DOM but will not leak out to the main page.

## 3. Metadata and Scripts (<title>, <meta>, <script>)

* <title> & <meta>: Ignored. A Shadow DOM cannot modify the global document's title or metadata (like viewport or charset).
* <script>: Will not execute. When using innerHTML, the HTML5 specification dictates that <script> tags should not run for security reasons. To run scripts, you must manually create and append them.

## Comparison Table: Behavior Summary

| Tag in String | Status in Shadow DOM | Resulting Behavior                               |
| ------------- | -------------------- | ------------------------------------------------ |
| <html>        | Stripped             | The wrapper is removed; content is flattened.    |
| <head>        | Stripped             | Container is removed; children are processed.    |
| <body>        | Stripped             | Container is removed; children are rendered.     |
| <style>       | Kept                 | Styles are applied locally within the component. |
| <header>      | Kept                 | Treated as a normal, semantic block element.     |
| <script>      | Kept                 | Present in the DOM, but does not execute.        |

## Key Takeaway
If you are rendering a full document string inside a Shadow DOM, the browser effectively "unwraps" the content. You end up with a flat list of elements (the styles and the body content) living inside the Shadow Root, isolated from the rest of the page's CSS.



---

For events to move from a Shadow DOM to the host application, they must pass through the shadow boundary. This process is governed by two main concepts: propagation properties and event retargeting. [1, 2, 3] 

## 1. Two Key Event Properties

For an event to reach the "Light DOM" (the main app), it needs specific settings: [1, 4] 

* bubbles: true: Allows the event to travel up from the target element to its parents within the same DOM tree.
* composed: true: This is the "magic key" that allows an event to cross the shadow boundary into the standard DOM. [3, 5, 6, 7] 

Most standard UI events (like click, touch, mousedown) are both bubbles: true and composed: true by default, so they "just work". However, Custom Events default to false for both and must be manually configured: [5, 6, 8, 9] 

this.dispatchEvent(new CustomEvent('my-event', {
  bubbles: true,
  composed: true,
  detail: { key: 'value' }
}));

## 2. Event Retargeting (The "Masking" Effect)

To maintain encapsulation, the browser retargets events as they cross the shadow boundary. [9, 10] 

* Inside the Shadow DOM: The event.target is the actual element that was clicked (e.g., a <button> inside your component).
* Outside (in the Host App): The event.target is reset to the shadow host element itself. The main app sees the event as coming from your component as a whole, hiding the internal implementation details. [9, 11, 12, 13] 

## 3. Seeing the Full Path

If you need to know exactly which internal element was clicked from the outside, you can use event.composedPath(). [6, 14] 

* This returns an array of all nodes the event passed through, including those inside the Shadow DOM.
* Note: If the Shadow DOM is in mode: 'closed', the path will be truncated and will not show internal elements to the outside world. [4, 8, 9, 14] 

## Summary for your Notes

| Property [1, 3, 5, 15] | Default (Custom Events) | Role                                             |
| ---------------------- | ----------------------- | ------------------------------------------------ |
| bubbles                | false                   | Propagates up the current DOM tree.              |
| composed               | false                   | Breaks through the Shadow DOM boundary.          |
| target                 | N/A                     | Changes to the host element once outside.        |
| composedPath()         | N/A                     | Reveals the true origin (if the shadow is open). |


