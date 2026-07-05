---
title: Getting Started
description: Install runtime-module-composition and wire up a host shell and a slice in a few steps.
---

`runtime-module-composition` is a small toolkit that implements the [Runtime Module Composition](/) pattern: a manifest-driven way to generate import maps, resolve routes to slice modules, and load those modules dynamically. It ships a framework-agnostic core plus Vite and React adapters.

This guide wires up a minimal host and a minimal slice. See the [API Reference](/api-reference/) for every method, and [Technical Implementation](/technical-implementation/) for the architecture behind it.

## Install

```bash
npm install runtime-module-composition
```

The package exposes subpath imports so you only pull in what you need:

```ts
import { defineManifest } from "runtime-module-composition"; // core, from the root import
import { defineManifest } from "runtime-module-composition/core";
import { runtimeComposition } from "runtime-module-composition/vite";
import { DynamicModuleBoundary } from "runtime-module-composition/react";
```

## 1. Define a manifest

The manifest is the runtime contract: it declares your namespace, where slices are hosted in production, and where external dependencies come from.

```ts
// runtime-composition.manifest.ts
import { defineManifest } from "runtime-module-composition";

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
import { runtimeComposition } from "runtime-module-composition/vite";
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

## 3. Resolve the route and load the slice

Framework-agnostic hosts use `resolveRoute()` to map the current path to a slice, then `importModule()` and `unwrapDefault()` to load it. This example assumes each slice exports a `mount(target, context)` function — one convention you can choose, not something the library enforces:

```ts
// src/main.ts
import {
  importModule,
  resolveRoute,
  unwrapDefault,
  type RuntimeModule,
} from "runtime-module-composition/core";
import { manifest } from "../runtime-composition.manifest";

const bootstrap = async (): Promise<void> => {
  const match = resolveRoute(manifest, window.location.pathname);
  if (!match) return;

  const target = document.getElementById("app");
  if (!target) return;

  const runtimeModule = unwrapDefault(
    await importModule(match.specifier),
  ) as RuntimeModule;

  await runtimeModule.mount(target, { route: match, manifest });
};

void bootstrap();
```

React hosts can skip the manual `importModule()`/`unwrapDefault()` wiring and use `DynamicModuleBoundary` instead, which expects the slice to default-export a component:

```tsx
import { resolveRoute } from "runtime-module-composition";
import { DynamicModuleBoundary } from "runtime-module-composition/react";
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

## 4. Build a slice

Each slice builds as an ESM library and externalizes anything the import map owns, so it never bundles a second copy of React or other shared dependencies.

```ts
// vite.config.ts (inside the slice)
import { defineConfig } from "vite";
import { createRollupExternal } from "runtime-module-composition/vite";
import { manifest } from "./runtime-composition.manifest";

export default defineConfig({
  build: {
    lib: {
      entry: ["src/index.tsx"],
      formats: ["es"],
      fileName: () => "index.mjs",
    },
    rollupOptions: {
      external: createRollupExternal(manifest),
    },
  },
});
```

A React slice imports its dependencies through the import map's external prefix and default-exports a component:

```tsx
// src/index.tsx
import React from "@esm.sh/react";
import type { RuntimeModuleContext } from "runtime-module-composition/core";

const SearchSlice = ({ context }: { context?: RuntimeModuleContext }) => (
  <div data-slice="search">
    Search slice loaded for route {context?.route?.route ?? "unknown"}
  </div>
);

export default SearchSlice;
```

## 5. Validate the manifest in CI

`validateManifest()` catches drift — malformed origins, specifiers that don't match the namespace, entries that don't look like ESM assets — before it ships:

```ts
import { validateManifest } from "runtime-module-composition/core";
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
