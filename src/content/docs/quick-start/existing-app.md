---
title: Decoupling a Slice from an Existing App
description: Extract one piece of an already-bundled React or Vue app into an independently deployed slice — as the start of a migration, or just to give that piece its own release cadence.
---

The [React](/quick-start/react/) and [Vue](/quick-start/vue/) quick starts both assume you're starting from nothing — a host that resolves *all* of its shared dependencies through the import map, same as its slices. This guide is for the opposite situation: you already have a working, normally-bundled application, and you want to peel off one piece of it into an independently built and deployed slice, today, without first re-architecting how the rest of the app resolves React or Vue.

That piece doesn't have to be heading toward a larger migration. A panel that changes on a different schedule than the rest of the app, that a different team owns, or that you'd simply rather stop coordinating releases around, is reason enough on its own — the toolkit doesn't need to become your whole architecture to be worth using for one thing.

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

## Worked example: extracting a panel from a monolith

Here's what this looks like on a real host, not a from-scratch demo — a marketing page in a React SPA where one panel (a pricing plans feature) is handed off to another team to own and ship independently. Everything the application team touches to make that handoff happen — nothing else in the host's build, pipeline, or architecture changes.

**1. One dependency** (`package.json`) — `@rmc-toolkit/core` is its peer:

```jsonc
"devDependencies": {
  "@rmc-toolkit/core": "0.4.0",
  "@rmc-toolkit/react": "0.4.0"
}
```

**2. A hardcoded import map** (`index.html`) — the late-binding reference to the slice, and the *only* place the host names where it lives. Must come before any module script:

```html
<head>
  <script type="importmap">
    { "imports": { "@acme/pricing-plans": "https://slices.example.com/pricing-plans/index.mjs" } }
  </script>
  <!-- …rest of head… -->
</head>
```

**3. A small boundary wrapper** — the whole integration. It creates the boundary once with the host's React, and maps the host's own locale into `context`:

```tsx
// pricing-plans-slice.tsx  (host-owned; the only new host file)
import React from 'react'
import { createInjectedModuleBoundary } from '@rmc-toolkit/react'
import { useLocale } from '@web-main/locale'

// The host's own React instance, so the slice shares it instead of loading a
// second copy.
const { InjectedModuleBoundary } = createInjectedModuleBoundary(React)

export const PricingPlansSlice = () => {
  const { locale } = useLocale()
  return (
    <InjectedModuleBoundary
      specifier="@acme/pricing-plans"                    // resolved by the import map at runtime
      context={{ data: { locale } }}
      fallback={null}
      errorFallback={null}                                // a slice failure renders nothing
    />
  )
}
```

**4. Render it where the feature used to be:**

```tsx
// marketing-page.tsx — the ONLY change to existing host code
-import { PricingPlansContainer } from './pricing-plans-container'
+import { PricingPlansSlice } from './pricing-plans-slice'

   case PanelType.Plans:
     return (
       <Panel {...panel}>
-        <PricingPlansContainer />
+        <PricingPlansSlice />
       </Panel>
     )
```

That's the whole host-side change: **+1 dependency, +1 import-map tag, +1 wrapper file, and a one-line render swap.** The application team never touches the pricing domain's code again — it lives in the other team's repository and ships on their own pipeline.

## Staying here is fine — or use it as a stepping stone

If the goal was to isolate one piece — give it its own release cadence, its own repository, one less thing to coordinate — there's no obligation to go any further. A slice built this way is a complete, working piece of Runtime Module Composition on its own, and it's fine to leave it exactly as it is.

If you *do* want to go further, there's a path off it: once a slice built this way — or the host itself — moves its *own* React or Vue usage onto the import-map convention too (the same `@esm.sh/react`-style specifier every other slice already uses), there's no more need for the factory indirection. At that point, drop the deps bag and switch the slice to the mount/unmount convention (React or Vue), or — for a React slice specifically — the plain-component convention (`createDynamicModuleBoundary`; there's no Vue equivalent of this one, see [Slice conventions](/glossary/#slice-conventions)). `createInjectedModuleBoundary` makes that first extraction possible before the rest of a migration happens, if a migration is where you're headed — it just isn't the only reason to use it.

## Next steps

- [Quick Start: React](/quick-start/react/) — the full from-scratch walkthrough, if you want to build a slice the standard way
- [Quick Start: Vue](/quick-start/vue/)
- [Glossary](/glossary/#slice-conventions) — all three slice conventions in one place
- [API Reference](/api-reference/) — full signatures for both `createInjectedModuleBoundary` functions
