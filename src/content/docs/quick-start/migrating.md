---
title: Migrating an Existing App
description: Extract one piece of an already-bundled React or Vue app into an independently deployed slice, without adopting import maps everywhere first.
---

The [React](/quick-start/react/) and [Vue](/quick-start/vue/) quick starts both assume you're starting from nothing — a host that resolves *all* of its shared dependencies through the import map, same as its slices. This guide is for the opposite situation: you already have a working, normally-bundled application, and you want to peel off one piece of it into an independently built and deployed slice, today, without first re-architecting how the rest of the app resolves React or Vue.

## Why this needs its own convention

A slice built for the plain-component or mount/unmount conventions is expected to bring its own React or Vue, typically resolved through the import map (`@esm.sh/react`). That's fine for a slice with no hooks or reactive state. It breaks the moment the slice calls `React.useEffect` or uses a Vue `ref` — those look up state that lives inside the *specific* React or Vue module instance driving the render, and an already-bundled host's own copy is a different module instance than whatever the slice fetched separately.

`createInjectedModuleBoundary` solves this the direct way: the slice doesn't import React or Vue at all. It default-exports a factory that *receives* the host's own instance as an argument.

## The slice's shape

Instead of a ready component, the slice exports a factory:

```tsx
export default (deps) => {
  const { React } = deps;

  return () => {
    React.useEffect(() => {
      console.log("mounted with the host's own React");
    }, []);

    return React.createElement("h1", null, "Hello");
  };
};
```

## Wiring it into your existing app

In your existing, already-bundled host:

```tsx
import React from "react";
import { createInjectedModuleBoundary } from "@rmc-toolkit/react";

const { InjectedModuleBoundary } = createInjectedModuleBoundary(React);
```

```tsx
<InjectedModuleBoundary specifier="@fastflights/hello/index.mjs" />
```

That's the entire integration. `specifier` still resolves through the import map exactly the way any other slice does — the only difference is what happens once the module is loaded: instead of treating the loaded value as a ready component, `InjectedModuleBoundary` calls its default export with `{ React }` and renders whatever comes back.

The Vue shape is identical in spirit:

```ts
import * as Vue from "vue";
import { createInjectedModuleBoundary } from "@rmc-toolkit/vue";

const { InjectedModuleBoundary } = createInjectedModuleBoundary(Vue);
```

```html
<InjectedModuleBoundary specifier="@fastflights/hello/index.mjs" />
```

## This is a starting point, not a permanent choice

Once a slice built this way — or the host itself — moves its *own* React or Vue usage onto the import-map convention too (the same `@esm.sh/react`-style specifier every other slice already uses), there's no more need for the factory indirection. At that point, drop the deps bag and switch the slice to the mount/unmount convention (React or Vue), or — for a React slice specifically — the plain-component convention (`createDynamicModuleBoundary`; there's no Vue equivalent of this one, see [Slice conventions](/glossary/#slice-conventions)). `createInjectedModuleBoundary` exists specifically to make that first extraction possible before the rest of the migration happens — not to be the convention every slice ends up on permanently.

## Next steps

- [Quick Start: React](/quick-start/react/) — the full from-scratch walkthrough, once you're ready to build a slice the standard way
- [Quick Start: Vue](/quick-start/vue/)
- [Glossary](/glossary/#slice-conventions) — all three slice conventions in one place
- [API Reference](/api-reference/) — full signatures for both `createInjectedModuleBoundary` functions
