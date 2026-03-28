# Research on ShadowDOM vs iframe.

## Shadow DOM 

- Encapsulation as Composability.
  
- Shadow DOM came into existence not as a security tool but as a response to the internal complexity of modern web applications.
  
- Termed also as webcomponents?

- Shadow DOM provides a scoped subtree of the DOM attached to a host element. It has the following feature:
  - Own encapsulated structure and styles
  - Invisible to outer document by default
  - Lives within the same page and JavaScript context.

- Shadow DOM makes it possible to build components that are protected from the global environment while still cooperating with it.


## IFrame

- Each iframe creates a separate browsing context, which means its own rendering engine, layout calculations and memory overhead.

### JavaScript

Have to make use of `postMessage` API as such

```js
document.addEventListener('news-action', function(e) {
    window.parent.postMessage({
    type: 'news-action',
    detail: e.detail
    }, '*');
});
```

### Responsiveness

Have to do weird tweaks as such

```js
// Send height to parent for auto-resizing
function sendHeight() {
    window.parent.postMessage({
    type: 'resize',
    height: document.documentElement.scrollHeight
    }, '*');
}

new ResizeObserver(sendHeight).observe(document.body);
window.addEventListener('load', sendHeight);
```