---
title: "Which is the best pattern for micro frontends: a new React DOM tree, or injecting into the existing one?"
description: The two ways to render a React micro frontend — its own createRoot tree versus injecting into the host's existing tree — what each costs, and a rule of thumb for choosing.
sidebar:
  label: React DOM Tree vs Injection
---

If you're building micro frontends with React, you'll hit a fork in the road very early. You have a piece of UI — a sub-app owned by another team, a widget, a slice of a larger page — and you need to get it onto the screen. There are two fundamentally different ways to do it:

1. **Give it its own React DOM tree.** You call `createRoot()` a second time and mount the micro frontend into its own root, living inside a DOM node that the host app happens to own. *With **rmc-toolkit**, this is the isolated mode — you get a self-contained tree without hand-wiring the root yourself.*
2. **Inject it into the host's existing tree.** You render it as part of the same React tree the host is already using — as ordinary components. *With **rmc-toolkit**, this is the integrated mode — the micro frontend shares the host's tree, context, and lifecycle.*

They look almost identical on screen. Under the hood they could not be more different. The key thing to know up front: **rmc-toolkit handles both patterns behind a single API**, so you choose the trade-off you want rather than rewriting your integration code. This article walks through what actually happens in each case, in plain terms, and gives you a rule of thumb for choosing.

---

## The one idea you need first: what `createRoot` actually does

Every time you call `createRoot()`, React builds a completely self-contained world:

- its own internal tree of components (React calls these "fibers"),
- its own render-and-commit cycle,
- its own error boundaries, its own `Suspense` boundaries, its own context.

The crucial part: **when you nest a second `createRoot` inside the first one's DOM, React has no idea the two are related.** The only thing connecting them is the raw DOM node they share. To React, they're two strangers who happen to live in the same building.

```
createRoot(hostContainer).render(<HostApp/>)
        │  (HostApp renders a <div/> somewhere)
        ▼
   [ a DOM node ]  ◄── the ONLY thing linking the two worlds
        ▲
createRoot(thatDiv).render(<MicroApp/>)   // HostApp never finds out
```

Hold onto that picture. Almost every pro and con below falls out of it.

---

## Option 1: The micro frontend as its own React DOM tree

This is the "two separate worlds" approach. The host renders a container, and the micro frontend mounts itself into that container with its own `createRoot`.

### What you get

**Real isolation.** The micro frontend re-renders on its own schedule. When the host re-renders, the micro frontend does *not* re-render — and vice versa. A crash in one tree (an error thrown during render) won't take down the other. This is the whole reason the pattern exists: two teams can ship two apps that share a page without stepping on each other.

**Freedom to be different.** Because the worlds are separate, the micro frontend can even ship its *own copy of React* — a different version, potentially — without conflict. That's common when independent teams deploy on independent timelines.

### What it costs you

Everything that normally "just works" in React works by traveling *through the React tree*. Since there is no shared tree, none of it crosses the boundary automatically:

- **React Context doesn't cross.** A theme provider, a router, a Redux `<Provider>` in the host is invisible to the micro frontend. You have to bridge every shared value by hand.
- **Suspense and error boundaries don't cross.** A loading spinner (`Suspense`) or error boundary in the host will never catch something happening inside the micro frontend. Each tree needs its own.
- ⚠️ **The host can silently orphan the micro frontend.** This is the big one. If the host re-renders and removes the container node, the browser rips the micro frontend's HTML off the page — but its React root is *still running in memory*. Its effects keep firing, its subscriptions stay open, it leaks. **React will never clean this up for you.** You have to manually call `root.unmount()` at the right moment.
- **Events get subtle.** React attaches its event handling to each root's container. With two roots stacked on the same page, things like `stopPropagation` and event ordering across the seam can behave in ways that surprise you.

Think of it as two separate houses that share a wall. Great for privacy. But nothing flows between them unless you install the plumbing yourself.

---

## Option 2: Injecting into the host's existing tree

Here the micro frontend is part of the *same* React tree as the host. Most often this is done with a **portal** (`createPortal`), which lets you render into a different physical spot in the DOM while keeping the component logically inside the host's tree.

### What you get

Basically the mirror image of Option 1's costs — everything flows for free:

- **Context just works.** The micro frontend can read the host's theme, router, and stores with a plain `useContext`, because it's in the same tree.
- **Suspense and error boundaries just work.** A host-level boundary catches loading states and errors from the injected UI.
- **Lifecycle is automatic.** When the host removes the component, React unmounts it properly — effects clean up, no leaks, no manual `unmount()`.
- **Events behave normally.** Even with a portal placing the DOM elsewhere, React deliberately keeps events bubbling through the *React* tree, so it behaves the way you'd expect.

One house, many rooms. Everything is wired together already.

### What it costs you

- **No real isolation.** The micro frontend shares the host's render cycles and, critically, the host's *single copy of React*. It can't run a different React version.
- **Tighter coupling.** Because they're one tree, a badly-behaved micro frontend (an unhandled error, a runaway render) can affect the host more directly. You lean on shared boundaries to contain it.
- **Requires cooperation.** This pattern assumes the host and the micro frontend are built to live in the same runtime — same React, compatible tooling. That's fine within one organization; it's often unrealistic across fully independent teams.

---

## Head to head

| | **Own DOM tree** (`createRoot` again) | **Injected into host tree** (portal / components) |
|---|---|---|
| Re-render cycles | Fully independent | Shared with the host |
| React Context | Manual bridging required | Works automatically |
| Suspense / error boundaries | Each tree needs its own | Host boundaries cover it |
| Unmount / cleanup | **You must do it by hand** | Automatic |
| Events across the seam | Can be surprising | Behaves normally |
| Separate React version | Possible | No — one shared React |
| Isolation / fault tolerance | Strong | Weak (relies on boundaries) |
| Best when… | Independent teams & deploys | One team, one runtime |

---

## So which should you choose?

Here's the rule of thumb:

> **Choose a separate DOM tree when you need genuine isolation. Choose injection when you want convenience and everything shared.**

More concretely:

**Reach for a separate React DOM tree when:**
- The micro frontend is owned and deployed by a *different team*.
- It may need a *different version of React* than the host.
- You're embedding into a page (or a Shadow DOM, or a third-party container) you don't fully control.
- Fault isolation matters — one app crashing must not take the other down.

**Reach for injecting into the existing tree when:**
- It's your app, your team, one shared runtime.
- You want shared context, routing, theming, and stores with zero glue code.
- You mainly need to render UI into a *different spot on the page* (a modal, a sidebar, a slot) — this is exactly what portals are for.
- You'd rather React manage cleanup and errors for you.

A useful gut check: **if the only reason you were considering a second root is "I need to render this somewhere else in the DOM," you almost certainly want a portal, not a second root.** Portals give you the relocation without giving up any of React's built-in wiring. Save the second root for when you truly need two separate worlds.

---

## If you go with a separate tree: do it safely

The single most common bug with the separate-tree pattern is the orphaned root — mounting a second `createRoot` and forgetting to tear it down. Tie the root's life to a host component's life, and clean up on unmount:

```tsx
import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';

function MicroFrontendHost({ theme }: { theme: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<Root | null>(null);

  // Create the root exactly once, and — crucially — tear it down on unmount.
  useEffect(() => {
    const root = createRoot(containerRef.current!);
    rootRef.current = root;

    return () => {
      // Without this, the micro frontend leaks when the host removes the node.
      // Defer to avoid React's "unmount during render" warning.
      queueMicrotask(() => root.unmount());
      rootRef.current = null;
    };
  }, []);

  // Bridge shared values across the seam by re-rendering the child root.
  // The micro frontend re-provides the value through its OWN context.
  useEffect(() => {
    rootRef.current?.render(
      <ThemeContext.Provider value={theme}>
        <MicroApp />
      </ThemeContext.Provider>
    );
  }, [theme]);

  return <div ref={containerRef} />;
}
```

Two things to notice:

1. **The empty `[]` on the first effect** means you create the root once and only once. Calling `createRoot` twice on the same node is an error.
2. **The "bridge" is just prop-passing plus a manual re-render.** That's the honest reality of separate trees: any shared value you want, you wire up by hand — value in, `root.render()` out.

If you have more than a value or two to share, or the values change rapidly, don't push everything through `root.render()`. Put a small shared store between the two worlds and let each side subscribe:

```tsx
// A framework-agnostic store both worlds can see.
const themeStore = createStore('light'); // zustand, a plain emitter, anything

// Host writes:            themeStore.set('dark')
// Micro frontend reads:   useSyncExternalStore(themeStore.subscribe, themeStore.get)
```

Now the shared store *is* the seam. The host writes to it, the micro frontend re-renders itself from its subscription, and you only ever call `root.render()` once. This scales far better than manually re-rendering on every change.

---

## The takeaway

Two React DOM trees give you **isolation**; one shared tree gives you **integration**. Neither is "more correct" — they're answers to different questions.

If different teams ship on different schedules and must not break each other, pay the cost of a separate tree and wire the seams carefully. If it's one team in one runtime and you just want your UI in a different place, stay in one tree and use a portal. The moment you find yourself hand-building context bridges, manual unmount logic, and cross-root event workarounds *for your own app*, that's the signal you reached for isolation you didn't actually need.
