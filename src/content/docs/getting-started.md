---
title: Getting Started
description: Install rmc-toolkit and wire up a host shell and a slice in a few steps.
---

[`rmc-toolkit`](https://github.com/runtime-module-composition/rmc-toolkit) is a small toolkit that implements the [Runtime Module Composition](/) pattern: a manifest-driven way to generate import maps, resolve routes to slice modules, and load those modules dynamically. It ships a framework-agnostic core plus Vite, React, and Vue adapters.

This guide wires up a minimal host and a minimal slice. See the [API Reference](/api-reference/) for every method, and [Technical Implementation](/technical-implementation/) for the architecture behind it.

## Install

Each package is published independently — install the ones you need:

```bash
npm install @rmc-toolkit/core @rmc-toolkit/vite @rmc-toolkit/react @rmc-toolkit/vue
```

A host that isn't React- or Vue-based (or a slice that doesn't use Vite) can skip the adapters it doesn't need — `@rmc-toolkit/core` has no dependency on any of them.

```ts
import { defineManifest, createRuntimeHost } from "@rmc-toolkit/core";
import { runtimeComposition, defineSliceBuild } from "@rmc-toolkit/vite";
import { createReactAdapter, createDynamicModuleBoundary } from "@rmc-toolkit/react";
import { createVueAdapter } from "@rmc-toolkit/vue";
```

## 1. Define a manifest

The manifest is the runtime contract: it declares your namespace, where slices are hosted in production, and where external dependencies come from.

```ts
// runtime-composition.manifest.ts
import { defineManifest } from "@rmc-toolkit/core";

export const manifest = defineManifest({
  namespace: "@acme",
  assetsOrigin: "https://assets.example.com",
  externalDepsOrigin: "https://esm.sh",
  environments: {
    development: {
      sliceOrigins: {
        search: "http://localhost:5174",
      },
    },
  },
});
```

With `entryFile` left at its default (`index.mjs`), a request for `/search/anything` resolves to the module specifier `@acme/search/index.mjs`, served from `https://assets.example.com/search/index.mjs` in production or `http://localhost:5174/index.mjs` in development.

## 2. Wire the Vite plugin into the host

The host is whatever application owns the page: the document, routing, and the region where slices render.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { runtimeComposition } from "@rmc-toolkit/vite";
import { manifest } from "./runtime-composition.manifest";

export default defineConfig({
  plugins: [
    ...runtimeComposition({
      manifest,
      environment: "development",
    }),
  ],
});
```

`runtimeComposition()` returns two plugins: one that injects the generated import map into `index.html` before any module script runs, and one that tells Vite not to bundle or rewrite specifiers the import map owns.

## 3. Bootstrap the host

Every option below shares the same underlying lifecycle — resolve the route, import the slice, mount/unmount it, with built-in error recovery and protection against rapid-navigation races (see [API Reference](/api-reference/#createruntimehostoptions) for what that means). Pick based on your host's framework and which slice convention you're using (DOM `mount()`/`unmount()`, or a plain default-exported component).

**React host, slices share the `mount()`/`unmount()` convention:** use `createReactAdapter`, which wraps the lifecycle in a `useRuntimeHost` hook — no manual `useEffect`/`useRef` wiring needed. Instantiate it once with your app's own `React` instance:

```ts
// src/rmc-adapter.ts
import React from "react";
import { createReactAdapter } from "@rmc-toolkit/react";

export const { useRuntimeHost } = createReactAdapter(React);
```

```tsx
// App.tsx
import { useLocation } from "react-router-dom";
import { useRuntimeHost } from "./rmc-adapter";
import { manifest } from "./runtime-composition.manifest";

function App() {
  const location = useLocation();
  const { ref, status } = useRuntimeHost<HTMLElement>(location.pathname, { manifest });

  return (
    <div className="app-shell">
      <SiteHeader loading={status.type === "loading"} />
      <main ref={ref} />
      <SiteFooter />
    </div>
  );
}
```

**Vue host, slices share the `mount()`/`unmount()` convention:** the same shape, via `createVueAdapter`. `path` is a getter so the adapter can watch it reactively:

```ts
// src/rmc-adapter.ts
import * as Vue from "vue";
import { createVueAdapter } from "@rmc-toolkit/vue";

export const { useRuntimeHost } = createVueAdapter(Vue);
```

```ts
// App.vue (render-function form)
import { useRoute } from "vue-router";
import { useRuntimeHost } from "./rmc-adapter";
import { manifest } from "./runtime-composition.manifest";

export default {
  setup() {
    const route = useRoute();
    const { target, status } = useRuntimeHost(() => route.fullPath, { manifest });
    return { target, status };
  },
  template: `<main ref="target"></main>`,
};
```

Both adapters are factories, not ready-to-use values — you pass in your host's own already-resolved `React`/`Vue` instance rather than the package importing one itself. That's what lets a React or Vue adapter published as its own npm package avoid ever bundling a second, conflicting copy of the framework: see [API Reference](/api-reference/#createreactadapterreact) for why this matters.

**React host, slices are plain default-exported components (not `mount()`/`unmount()`):** use `createDynamicModuleBoundary` instead — same factory pattern, simpler contract:

```tsx
// src/rmc-adapter.ts
import React from "react";
import { createDynamicModuleBoundary } from "@rmc-toolkit/react";

export const { DynamicModuleBoundary } = createDynamicModuleBoundary(React);
```

```tsx
// RouteSlot.tsx
import { resolveRoute } from "@rmc-toolkit/core";
import { DynamicModuleBoundary } from "./rmc-adapter";
import { manifest } from "./runtime-composition.manifest";

export function RouteSlot() {
  const match = resolveRoute(manifest, window.location.pathname);
  if (!match) return null;

  return (
    <DynamicModuleBoundary
      specifier={match.specifier}
      context={{ route: match, manifest }}
      fallback={<div>Loading...</div>}
      errorFallback={<div>Unable to load this section.</div>}
    />
  );
}
```

These are different slice conventions, not competing versions of the same thing — pick the adapter matching how your slices are written, not both for the same slice.

**No framework, or a framework without a dedicated adapter yet:** use `createRuntimeHost` directly.

```ts
// src/main.ts
import { createRuntimeHost } from "@rmc-toolkit/core";
import { manifest } from "../runtime-composition.manifest";

const host = createRuntimeHost({
  manifest,
  target: document.getElementById("app")!,
});

window.addEventListener("popstate", () => {
  void host.resolveAndMount(window.location.pathname);
});
void host.resolveAndMount(window.location.pathname); // initial load
```

`createRuntimeHost` only reacts to a path string — it doesn't intercept clicks or call `pushState` itself. Wire it to whatever produces navigation events: a raw `popstate` listener (as above), or a router's navigation callback.

## 4. Build a slice

Each slice builds as an ESM library and externalizes anything the import map owns, so it never bundles a second copy of React or other shared dependencies. `defineSliceBuild()` handles the mode-aware boilerplate (dev-server port, the library-build `process.env.NODE_ENV` fix, entry auto-detection); combine it with `createRollupExternal()` for the externalization itself:

```ts
// vite.config.ts (inside the slice)
import { defineConfig } from "vite";
import { defineSliceBuild, createRollupExternal } from "@rmc-toolkit/vite";
import { manifest } from "./runtime-composition.manifest";

export default defineConfig(({ mode }) => {
  const sliceBuild = defineSliceBuild({ mode, devPort: 5174, sliceName: "search" });

  return mode === "development"
    ? sliceBuild
    : {
        ...sliceBuild,
        build: {
          ...sliceBuild.build,
          rollupOptions: { external: createRollupExternal(manifest) },
        },
      };
});
```

`sliceName` is required and determines where the production build lands: `dist/{sliceName}/index.mjs`, matching the same `{assetsOrigin}/{sliceName}/index.mjs` path `resolveRoute()`/`createImportMap()` already assume for conventionally-resolved slices — so a slice's own build output requires no separate assembly step to match the production URL it will be deployed at. `defineSliceBuild` looks for `src/index.tsx`, then `src/index.ts`, unless you pass an explicit `entry`.

A React slice imports its dependencies through the import map's external prefix and default-exports a component:

```tsx
// src/index.tsx
import React from "@esm.sh/react";
import type { RuntimeModuleContext } from "@rmc-toolkit/core";

const SearchSlice = ({ context }: { context?: RuntimeModuleContext }) => (
  <div data-slice="search">
    Search slice loaded for route {context?.route?.route ?? "unknown"}
  </div>
);

export default SearchSlice;
```

If a slice needs to push its own internal navigation (a route change within its own path space) so the host's router notices it, call `notifyInternalNavigation()` instead of hand-rolling `history.pushState()` — see [API Reference](/api-reference/#notifyinternalnavigationpath).

## 5. Validate the manifest in CI

`validateManifest()` catches drift — malformed origins, specifiers that don't match the namespace, entries that don't look like ESM assets — before it ships:

```ts
import { validateManifest } from "@rmc-toolkit/core";
import { manifest } from "./runtime-composition.manifest";

const diagnostics = validateManifest(manifest);
const errors = diagnostics.filter((d) => d.level === "error");

if (errors.length > 0) {
  throw new Error(errors.map((d) => d.message).join("\n"));
}
```

## Next steps

- [API Reference](/api-reference/) — every exported method, with implementation notes.
- [Technical Implementation](/technical-implementation/) — the architecture, failure modes, and operational checklist behind the pattern.
