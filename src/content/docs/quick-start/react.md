---
title: "Quick Start: React"
description: Stand up a React host and one slice locally, composed at runtime through import maps.
---

This guide gets a single React host and one React slice running on your machine as fast as possible. There's no separate production asset host involved — the host itself takes on that responsibility. See [Quick Start: Vue](/quick-start/vue/) for the same walkthrough with Vue instead.

## What you'll build

Two Vite dev servers running side by side: a host app that owns the page and generates its own import map, and a slice app — a completely separate project — that the host mounts at a route without ever bundling it.

## Prerequisites

Node.js 20 or later, and npm.

## 1. Scaffold the host

The host is an ordinary Vite + React app. In this pattern the host does more than render UI — it also generates and serves the browser import map that lets it resolve a slice's bare specifier at runtime. In a larger production deployment that responsibility might live in its own static asset host; folding it directly into the host here keeps this guide to a single app instead of two.

```bash
npm create vite@latest rmc-quickstart-host -- --template react-ts
cd rmc-quickstart-host
npm install
```

## 2. Install rmc-toolkit into the host

`@rmc-toolkit/core` provides the manifest and import map primitives. `@rmc-toolkit/vite` is the Vite plugin that generates and injects the import map. `@rmc-toolkit/react` is the adapter that mounts slices into a React tree.

```bash
npm install @rmc-toolkit/core @rmc-toolkit/vite @rmc-toolkit/react react-router
```

## 3. Define the manifest

`namespace` is the specifier prefix every slice is addressed under. `assetsOrigin` is where slices are served from in production. `externalDepsOrigin` is the CDN shared dependencies resolve through. `externalDeps` pins the exact version of each shared dependency the import map serves — `react-dom/client` and `react-router` both need the same `react` instance, which `defaultPeerDeps` applies automatically to every entry that doesn't declare its own `peerDeps`. `environments.development.sliceOrigins` points a slice's namespace entry at its local dev server instead, only in development.

```ts
import { defineManifest } from "@rmc-toolkit/core";

export const manifest = defineManifest({
  namespace: "@acme",
  assetsOrigin: "https://assets.example.com",
  externalDepsOrigin: "https://esm.sh",
  externalDeps: [
    { name: "react", version: "19.2.7", peerDeps: false },
    { name: "react-dom/client", version: "19.2.7" },
    { name: "react-router", version: "8.1.0" },
  ],
  defaultPeerDeps: ["react"],
  environments: {
    development: {
      sliceOrigins: {
        search: "http://localhost:5174",
      },
    },
  },
});
```

Save this as `src/runtime-composition.manifest.ts`.

## 4. Wire the import map into the host's Vite config

`runtimeComposition()` returns two plugins: one injects the generated import map into `index.html` before any module script runs, the other tells Vite not to bundle or rewrite specifiers the import map owns. This is the piece standing in for a separate asset host.

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { runtimeComposition } from "@rmc-toolkit/vite";
import { manifest } from "./src/runtime-composition.manifest";

export default defineConfig({
  plugins: [
    react(),
    ...runtimeComposition({
      manifest,
      environment: "development",
    }),
  ],
});
```

Replace the contents of `vite.config.ts` with this.

## 5. Add the adapter

`createDynamicModuleBoundary` is a factory: pass it your app's own `React` instance and it returns a `DynamicModuleBoundary` component that resolves a specifier, dynamically imports it, and renders it inside a `Suspense` boundary with error handling. Being a factory is what lets this package avoid ever bundling a second copy of React.

```ts
import React from "react";
import { createDynamicModuleBoundary } from "@rmc-toolkit/react";

export const { DynamicModuleBoundary } = createDynamicModuleBoundary(React);
```

Save this as `src/rmc-adapter.ts`.

## 6. Mount a slice by route

Real navigation goes through a router rather than reading `window.location` directly, so slices resolve on every navigation without a full page reload. `useLocation` gives the current path reactively; `resolveRoute` matches that path against the manifest and returns the matching slice's module specifier, or `null` if nothing matches.

```tsx
import { BrowserRouter, Routes, Route, useLocation } from "react-router";
import { resolveRoute } from "@rmc-toolkit/core";
import { DynamicModuleBoundary } from "./rmc-adapter";
import { manifest } from "./runtime-composition.manifest";

function SliceSlot() {
  const location = useLocation();
  const match = resolveRoute(manifest, location.pathname);

  if (!match) {
    return <p>No slice for this route.</p>;
  }

  return (
    <DynamicModuleBoundary
      specifier={match.specifier}
      context={{ route: match, manifest }}
      fallback={<p>Loading...</p>}
      errorFallback={<p>Unable to load this section.</p>}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<SliceSlot />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

Replace the contents of `src/App.tsx` with this. The host is done — the next steps build the slice it's pointing at.

## 7. Scaffold the slice

A slice is a separate, independently built project with its own `package.json` — the host never bundles it. Scaffold it as a sibling directory to the host, not inside it.

```bash
npm create vite@latest rmc-quickstart-search -- --template react-ts
cd rmc-quickstart-search
npm install @rmc-toolkit/vite @rmc-toolkit/core
```

## 8. Copy the manifest into the slice

Both the host and the slice need to agree on the same manifest. Copy `runtime-composition.manifest.ts` from the host project into this one's `src/` directory unchanged. In a larger project this file would live in a package both sides import instead of being duplicated.

## 9. Build the slice as an ESM library

`defineSliceBuild()` handles the mode-aware setup a slice needs: the dev-server port, a library-build fix for `process.env.NODE_ENV`, and entry-file auto-detection. `createRollupExternal()` externalizes anything the import map owns, so the production build never bundles its own copy of React. `sliceName` determines where that production build lands, matching the URL the host's manifest expects.

```ts
import { defineConfig } from "vite";
import { defineSliceBuild, createRollupExternal } from "@rmc-toolkit/vite";
import { manifest } from "./src/runtime-composition.manifest";

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

Replace the contents of `vite.config.ts` with this.

## 10. Write the slice

A slice built for `DynamicModuleBoundary` default-exports a plain component. It imports React through the import map's external prefix rather than the bare `"react"` specifier, since the prefixed form is what the host's import map actually owns.

```tsx
import React from "@esm.sh/react";

const SearchSlice = () => <div data-slice="search">Search slice loaded</div>;

export default SearchSlice;
```

Replace the contents of `src/App.tsx` with this, or delete it and put this in `src/index.tsx` instead — either is fine, `defineSliceBuild()` looks for `src/index.tsx` first.

## 11. Run both together

Start the slice first, then the host, in two separate terminals.

```bash
npm run dev
```

Run this in the slice's directory (`rmc-quickstart-search`) — it starts on port 5174, matching `devPort` above.

```bash
npm run dev
```

Run this in the host's directory (`rmc-quickstart-host`).

Visit `http://localhost:5173/search`. The host resolves the route, fetches the slice through the import map, and mounts it.

## Next steps

- [Quick Start: Vue](/quick-start/vue/) — the same walkthrough with Vue instead
- [API Reference](/api-reference/) — every exported method, with implementation notes
- [Multi-Framework Demo](/demo/) — a larger, multi-framework reference implementation
