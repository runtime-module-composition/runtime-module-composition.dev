---
title: "Quick Start: Independent Mount — React"
description: Stand up a React host and one slice locally, composed at runtime through import maps, using the mount/unmount convention.
---

This guide gets a single React host and one React slice running on your machine as fast as possible. There's no separate production asset host involved — the host itself takes on that responsibility. See [Quick Start: Independent Mount — Vue](/quick-start/independent-mount/vue/) for the same walkthrough with Vue instead.

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

`@rmc-toolkit/core` provides the manifest and import map primitives. `@rmc-toolkit/vite` is the Vite plugin that generates and injects the import map. `@rmc-toolkit/react` is the adapter that mounts slices into a React app.

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

`createReactAdapter` is a factory: pass it your app's own `React` instance and it returns a `useRuntimeHost` hook. Unlike a component-boundary adapter, this hook doesn't render the slice as a React component — it drives the same explicit `mount(target)`/`unmount()` contract Vue's adapter uses, which is what keeps the host framework-agnostic to whatever the slice is built with. It exposes a `ref` to bind to the element the slice mounts into, plus a `status` for loading and error state.

```ts
import * as React from "react";
import { createReactAdapter } from "@rmc-toolkit/react";

export const { useRuntimeHost } = createReactAdapter(React);
```

Save this as `src/rmc-adapter.ts`.

## 6. Mount a slice by route

`useLocation()` gives the current path reactively; it's passed to `useRuntimeHost` as a plain string, and the hook re-resolves whenever that string changes on navigation. This component is set up as the catch-all page every route renders, so it always resolves whatever the current path is.

```tsx
import { useLocation } from "react-router";
import { useRuntimeHost } from "./rmc-adapter";
import { manifest } from "./runtime-composition.manifest";

function SliceSlot() {
  const location = useLocation();
  const { ref, status } = useRuntimeHost<HTMLDivElement>(location.pathname, { manifest });
  return <div ref={ref} />;
}

export default SliceSlot;
```

Save this as `src/SliceSlot.tsx`.

`react-router` needs a catch-all route pointing at `SliceSlot`, installed when the app is created.

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import SliceSlot from "./SliceSlot";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="*" element={<SliceSlot />} />
    </Routes>
  </BrowserRouter>,
);
```

Replace the contents of `src/main.tsx` with this. The host is done — the next steps build the slice it's pointing at.

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

A slice built for the `mount()`/`unmount()` convention exports an object with both methods rather than a default component. It imports React and `react-dom/client` through the import map's external prefix rather than the bare `"react"`/`"react-dom/client"` specifiers, since the prefixed form is what the host's import map actually owns.

```tsx
import React from "@esm.sh/react";
import ReactDOM from "@esm.sh/react-dom/client";

const SliceComponent = () => <div data-slice="search">Search slice loaded</div>;

let root: ReactDOM.Root | null = null;

const slice = {
  mount(target: Element): void {
    root = ReactDOM.createRoot(target);
    root.render(<SliceComponent />);
  },
  unmount(): void {
    root?.unmount();
    root = null;
  },
};

export default slice;
```

Replace the contents of `src/index.tsx` with this. `defineSliceBuild()` looks for `src/index.tsx` first, then `src/index.ts` — this component uses JSX, so `src/index.tsx` is the natural fit.

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

- [Quick Start: Independent Mount — Vue](/quick-start/independent-mount/vue/) — the same walkthrough with Vue instead
- [API Reference](/api-reference/) — every exported method, with implementation notes
- [Multi-Framework Demo](/demo/) — a larger, multi-framework reference implementation
