---
title: Getting Started
description: Install rmc-toolkit and wire up a host shell and a slice in a few steps.
---

[`rmc-toolkit`](https://github.com/runtime-module-composition/rmc-toolkit) is a small toolkit that implements the [Runtime Module Composition](/) pattern: a manifest-driven way to generate import maps, resolve routes to slice modules, and load those modules dynamically. It ships a framework-agnostic core plus Vite and React adapters.

This guide wires up a minimal host and a minimal slice. See the [API Reference](/api-reference/) for every method, and [Technical Implementation](/technical-implementation/) for the architecture behind it.

## Install

Each package is published independently — install the ones you need:

```bash
npm install @rmc-toolkit/core @rmc-toolkit/vite @rmc-toolkit/react
```

A host that isn't React-based (or a slice that doesn't use Vite) can skip the adapters it doesn't need — `@rmc-toolkit/core` has no dependency on either.

```ts
import { defineManifest, createRuntimeHost } from "@rmc-toolkit/core";
import { runtimeComposition, defineSliceBuild } from "@rmc-toolkit/vite";
import { DynamicModuleBoundary } from "@rmc-toolkit/react";
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

## 3. Bootstrap the host with `createRuntimeHost`

`createRuntimeHost()` owns the resolve → import → mount/unmount lifecycle for one target element, including error recovery and protection against rapid-navigation races (see [API Reference](/api-reference/#createruntimehostoptions) for what that means). This example assumes each slice exports a `mount(target, context)`/`unmount()` pair — one convention you can choose, not something the library enforces:

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

`createRuntimeHost` only reacts to a path string — it doesn't intercept clicks or call `pushState` itself. If the host already has its own router (React Router, Vue Router, or similar), call `resolveAndMount()` from that router's navigation callback instead of adding a `popstate` listener. See [API Reference](/api-reference/#createruntimehostoptions) for a React Router and a Vue Router example.

React hosts whose slices simply default-export a plain component (rather than a `mount()`/`unmount()` pair) can skip `createRuntimeHost` entirely and use `DynamicModuleBoundary` instead:

```tsx
import { resolveRoute } from "@rmc-toolkit/core";
import { DynamicModuleBoundary } from "@rmc-toolkit/react";
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

These are two different slice conventions, not competing versions of the same thing: pick `createRuntimeHost` when slices (possibly written in different frameworks) share the DOM `mount()`/`unmount()` contract, or `DynamicModuleBoundary` when every slice is a plain React component and the host is React too.

## 4. Build a slice

Each slice builds as an ESM library and externalizes anything the import map owns, so it never bundles a second copy of React or other shared dependencies. `defineSliceBuild()` handles the mode-aware boilerplate (dev-server port, the library-build `process.env.NODE_ENV` fix, entry auto-detection); combine it with `createRollupExternal()` for the externalization itself:

```ts
// vite.config.ts (inside the slice)
import { defineConfig } from "vite";
import { defineSliceBuild, createRollupExternal } from "@rmc-toolkit/vite";
import { manifest } from "./runtime-composition.manifest";

export default defineConfig(({ mode }) => {
  const sliceBuild = defineSliceBuild({ mode, devPort: 5174 });

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

`defineSliceBuild` looks for `src/index.tsx`, then `src/index.ts`, unless you pass an explicit `entry`.

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
