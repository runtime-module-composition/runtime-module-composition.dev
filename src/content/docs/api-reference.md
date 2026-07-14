---
title: API Reference
description: Every exported method in rmc-toolkit, with usage examples and implementation notes.
---

[`rmc-toolkit`](https://github.com/runtime-module-composition/rmc-toolkit) is split into a framework-agnostic core plus adapters, published as four independent packages. This reference covers every public export. New to the library? Start with [Quick Start](/quick-start/).

```ts
import { createExternalMatcher, createImportMap /* ... */ } from "@rmc-toolkit/core";
import { runtimeComposition /* ... */ } from "@rmc-toolkit/vite";
import { createReactAdapter, createDynamicModuleBoundary } from "@rmc-toolkit/react";
import { createVueAdapter } from "@rmc-toolkit/vue";
```

There is no root/meta package — install `@rmc-toolkit/core`, `@rmc-toolkit/vite`, `@rmc-toolkit/react`, and `@rmc-toolkit/vue` directly, and only the ones you need. `@rmc-toolkit/vite`, `@rmc-toolkit/react`, and `@rmc-toolkit/vue` all depend on `@rmc-toolkit/core`; neither `@rmc-toolkit/react` nor `@rmc-toolkit/vue` has a runtime dependency on React or Vue themselves (see [`createReactAdapter`](#createreactadapterreact) for why).

## Manifest fields

`RuntimeCompositionManifest` is the single source of truth for import-map generation, route resolution, and build externalization.

| Field | Required | Purpose |
| --- | --- | --- |
| `namespace` | yes | Bare module scope your application owns, e.g. `@acme`. |
| `assetsOrigin` | yes | Production origin conventionally-resolved slices are served from. |
| `externalDepsOrigin` | no | CDN origin for external dependencies, e.g. `https://esm.sh`. |
| `externalDepsPrefix` | no | Import-map prefix for external deps. Defaults to `@esm.sh/`. |
| `entryFile` | no | Entry file name for conventionally-resolved slices. Defaults to `index.mjs`. |
| `environments` | no | Per-environment (`development`/`preview`/`production`) overrides for `assetsOrigin`, `externalDepsOrigin`, and per-slice `sliceOrigins`. |
| `exactImports` | no | Escape hatch: exact specifier &rarr; URL entries, for dependencies that don't fit the namespace or external-deps conventions. |
| `sliceOverrides` | no | Escape hatch: explicit slice definitions (route, specifier, entry) for slices that don't fit convention-based routing. |
| `routeOverrides` | no | Escape hatch: explicit route &rarr; specifier mappings that take priority over convention-based resolution. |
| `externalDeps` | no | List of external dependency entries (`{ name, version, peerDeps? }`) to include in the generated import map. This is how framework packages (React, Vue) and shared libraries (Lodash, Zustand, a design system) get onto the import map in the first place — see [External Dependencies](#external-dependencies) below. |
| `defaultPeerDeps` | no | Peer package **names** (not versions) applied automatically to every `externalDeps` entry that doesn't set its own `peerDeps`. See [External Dependencies](#external-dependencies) below. |

### External Dependencies

`externalDeps` is the manifest field that actually puts framework packages and shared libraries onto the import map — this is the mechanism that lets every slice import the same copy of React, Vue, Lodash, Zustand, or a UI kit, instead of each slice bundling (and shipping) its own. Get this wrong and the failure mode isn't a build error — it's a duplicate framework instance at runtime, breaking hooks, Context, or reactivity in ways that are hard to trace back to "the import map".

Every entry is an object with a required version, kept entirely separate from the specifier the rest of your code imports:

```ts
export type ExternalDepEntry = {
  /** Bare package name, or a subpath import, e.g. "react" or "react-dom/client". */
  name: string;
  /** Always required. */
  version: string;
  /** Peer package NAMES (not versions) to pin via esm.sh's `?deps=` query. */
  peerDeps?: string[] | false;
};
```

This split matters: the import-map **key** never includes a version (`@esm.sh/react`, stable across every version bump), while the **URL** it resolves to does (`https://esm.sh/react@19.2.4`). Versioning the key itself — an earlier, buggier shape this toolkit used to have — meant every dependency version bump required touching every import statement across every slice that imported it. Worse, a bare entry with no version field at all could silently resolve to whatever "latest" a CDN serves at request time, while a *different* entry pinned a peer to a specific version of the same underlying package — two different URLs serving two genuinely separate module instances of what should be one shared dependency, breaking hooks/Context/reactivity across the split in ways that are painful to trace back to an import map. Requiring `version` on every entry closes that hole structurally: there's no field left to omit it from.

**Why `peerDeps` exists:** some CDN-served packages (esm.sh in particular) have peer dependencies of their own — a UI kit like `@radix-ui/themes` depends on `react`/`react-dom` as peers, and the CDN needs to be told which exact version to resolve those peer imports to, via a `?deps=` query on the URL, or it may resolve them to a different version than the rest of your app uses. `peerDeps` (and `defaultPeerDeps`, applied automatically when an entry doesn't set its own) takes only peer **names** — never versions. Each name's version is looked up from that name's own `externalDeps` entry at generation time, so there's exactly one place each dependency's version is declared, and bumping it there automatically updates every `?deps=` query that references it. Packages that shouldn't inherit `defaultPeerDeps` — the framework packages themselves, or dependency-free libraries like Lodash — opt out with `peerDeps: false`.

A subpath import like `react-dom/client` is its own full `externalDeps` entry — the version gets inserted between the base package and the subpath (`react-dom@19.2.4/client`), not appended to the end.

```ts
// runtime-composition.manifest.ts
import { defineManifest } from "@rmc-toolkit/core";

export const manifest = defineManifest({
  namespace: "@acme",
  assetsOrigin: "https://assets.example.com",
  externalDepsOrigin: "https://esm.sh",
  // Applied automatically to every entry below that doesn't set its own
  // `peerDeps`, unless that entry opts out with `peerDeps: false`.
  defaultPeerDeps: ["react", "react-dom"],
  externalDeps: [
    // Framework packages: nothing to pin against themselves.
    { name: "react", version: "19.2.4", peerDeps: false },
    { name: "react-dom", version: "19.2.4", peerDeps: false },
    { name: "react-dom/client", version: "19.2.4", peerDeps: false },
    { name: "vue", version: "3.5.0", peerDeps: false },
    // Dependency-free utility libraries: also opt out.
    { name: "lodash-es", version: "4.17.21", peerDeps: false },
    { name: "zustand", version: "4.5.0", peerDeps: false },
    // A React UI library with a real peer dependency on react/react-dom:
    // no peerDeps set, so it inherits defaultPeerDeps automatically —
    // versions come from the react/react-dom entries above, not typed here.
    { name: "@radix-ui/themes", version: "3.0.0" },
  ],
});
```

`createImportMap(manifest)` turns that into:

```json
{
  "imports": {
    "@acme/": "https://assets.example.com/",
    "@esm.sh/": "https://esm.sh/",
    "@esm.sh/react": "https://esm.sh/react@19.2.4",
    "@esm.sh/react-dom": "https://esm.sh/react-dom@19.2.4",
    "@esm.sh/react-dom/client": "https://esm.sh/react-dom@19.2.4/client",
    "@esm.sh/vue": "https://esm.sh/vue@3.5.0",
    "@esm.sh/lodash-es": "https://esm.sh/lodash-es@4.17.21",
    "@esm.sh/zustand": "https://esm.sh/zustand@4.5.0",
    "@esm.sh/@radix-ui/themes": "https://esm.sh/@radix-ui/themes@3.0.0?deps=react@19.2.4,react-dom@19.2.4"
  }
}
```

Every slice imports these through the stable, version-free `@esm.sh/` specifiers rather than installing the packages themselves — none of these import statements need to change when a version bumps in the manifest:

```ts
import React from "@esm.sh/react";
import { createRoot } from "@esm.sh/react-dom/client";
import * as Vue from "@esm.sh/vue";
import { debounce } from "@esm.sh/lodash-es";
import { create } from "@esm.sh/zustand";
import { Theme } from "@esm.sh/@radix-ui/themes";
```

Note that only the exact specifier is mapped (no trailing-slash prefix mapping, unlike the namespace or slice-origin entries) — a deep import like `@esm.sh/lodash-es/debounce` won't resolve through this import map, so import named exports from the package's main entry instead (as above), or give the subpath its own `externalDeps` entry the way `react-dom/client` does here.

**What happens with bad input:** `createImportMap` never throws. Two entries sharing a base package (e.g. `react-dom` and `react-dom/client`) that declare *different* versions each still generate their own well-formed URL from their own version — the mismatch stays visible in the output rather than being silently resolved one way or the other. A `peerDeps` name with no matching entry is silently dropped from that entry's `?deps=` query. Both cases are exactly what [`validateManifest`](#validatemanifestmanifest) exists to catch — as warnings, not build failures, so a manifest mistake shows up in CI without ever blocking a build. Run it whenever you add or change `externalDeps`.

## Core (`@rmc-toolkit/core`)

### `defineManifest(manifest)`

Identity function that preserves the exact TypeScript shape of your manifest while checking it against `RuntimeCompositionManifest`.

```ts
import { defineManifest } from "@rmc-toolkit/core";

export const manifest = defineManifest({
  namespace: "@acme",
  assetsOrigin: "https://assets.example.com",
  externalDepsOrigin: "https://esm.sh",
  environments: {
    development: {
      sliceOrigins: { search: "http://localhost:5174" },
    },
  },
});
```

### `createImportMap(manifest, options?)`

Generates a browser import map object (`{ imports: Record<string, string> }`) from the manifest.

```ts
import { createImportMap } from "@rmc-toolkit/core";

const importMap = createImportMap(manifest, { environment: "development" });
const script = `<script type="importmap">${JSON.stringify(importMap)}</script>`;
```

Options: `environment` (`"development" | "preview" | "production"`, defaults to `"production"`) and `devDeps` (append a `?dev` query flag to external-dependency URLs).

Notes:

- Import maps must be present in the initial HTML before any dependent module script executes — never inject one after startup with `document.head.appendChild()`.
- In Vite projects, prefer `runtimeComposition()` or `includeRuntimeImportMap()` so the HTML is transformed before the browser receives it.
- Resolution order: namespace prefix &rarr; external-deps prefix and `externalDeps` entries &rarr; `exactImports` &rarr; `sliceOverrides` &rarr; per-environment `sliceOrigins`.

### `createImportMapBootstrapScript(manifest, options?)`

Generates a self-contained JavaScript string that appends the import map to `document.head` at runtime. Use this when you need to serve the import map as a standalone asset rather than have Vite transform your HTML — see [`includeHostedImportMap`](#includehostedimportmapoptions) below.

```ts
import { createImportMapBootstrapScript } from "@rmc-toolkit/core";

const script = createImportMapBootstrapScript(manifest, { environment: "production" });
```

The generated script detects a `?dev` query parameter on its own `<script src>` at runtime (via `document.currentScript`) and appends `?dev` to external-dependency URLs when present, so the same deployed script can serve both a normal and a dev-flagged import map.

### `resolveImportMapSpecifier(importMap, specifier)`

Resolves a specifier against an already-generated `ImportMap` the same way a browser resolves import maps: an exact key wins; otherwise the longest key ending in `/` that the specifier starts with (a prefix mapping), with the remainder appended to that prefix's target. Returns `undefined` if nothing matches.

```ts
import { createImportMap, resolveImportMapSpecifier } from "@rmc-toolkit/core";

const importMap = createImportMap(manifest, { environment: "development" });
resolveImportMapSpecifier(importMap, "@esm.sh/react"); // -> "https://esm.sh/react@19.2.4"
resolveImportMapSpecifier(importMap, "@acme/search/index.mjs"); // -> prefix-matched via "@acme/"
```

Used internally by `externalizeRuntimeComposition()`'s dev-mode resolution (see above) — reach for it directly only if you're building a similar Vite-dev-server integration this toolkit doesn't already cover.

### `resolveRoute(manifest, path)`

Maps a URL path to the slice that owns it.

```ts
import { resolveRoute } from "@rmc-toolkit/core";

const match = resolveRoute(manifest, window.location.pathname);
if (match) {
  await import(/* @vite-ignore */ match.specifier);
}
```

Notes:

- Convention: the first path segment becomes the slice name, so `/search/anything` resolves to `@acme/search/index.mjs` when `entryFile` is unset.
- `routeOverrides` and `sliceOverrides` are checked first and win over convention-based resolution — routes support exact paths and `/prefix/*` wildcards, and ties are broken by specificity.
- Returns `null` for `/` and any path with no matching segment or override.
- Most hosts don't call this directly — `createRuntimeHost()` (below) calls it internally. Use it directly only if you're hand-rolling the load/mount lifecycle yourself.

### `createRuntimeHost(options)`

Owns the resolve → import → mount/unmount lifecycle for one DOM target, so hosts stop hand-rolling it. Replaces a manual `resolveRoute()` + `importModule()` + `unwrapDefault()` loop, and additionally fixes a real rapid-navigation race: without it, if a user navigates twice in quick succession and the *first* import happens to resolve *after* the second, the first (stale) module can silently overwrite the second (correct) one — and the module it overwrote never gets `unmount()` called, leaking anything it registered. `createRuntimeHost` discards stale in-flight imports via an internal sequence token so only the most recently requested navigation ever mounts.

```ts
export type RuntimeHostOptions = {
  manifest: RuntimeCompositionManifest;
  target: Element;
  onLoading?: (path: string) => void;
  onReady?: (path: string) => void;
  onError?: (error: unknown, path: string) => void;
  importer?: DynamicImporter;
};

export type RuntimeHost = {
  resolveAndMount(path: string): Promise<void>;
  destroy(): Promise<void>;
};

export const createRuntimeHost: (options: RuntimeHostOptions) => RuntimeHost;
```

`onReady(path)` fires exactly when a non-stale `resolveAndMount()` call finishes mounting successfully — never for a call that was discarded because a newer navigation started first. It's the signal that a `"loading"` state should end; there's no separate "loading finished" callback because the loading UI is naturally replaced once either `mount()` or `onError` writes into `target`.

**Plain host, no framework router:**

```ts
import { createRuntimeHost } from "@rmc-toolkit/core";

const host = createRuntimeHost({ manifest, target: document.getElementById("app")! });

window.addEventListener("popstate", () => {
  void host.resolveAndMount(window.location.pathname);
});
void host.resolveAndMount(window.location.pathname); // initial load
```

**React or Vue host:** don't wire `createRuntimeHost` by hand with `useEffect`/`onMounted`/`watch` — that boilerplate (create on mount, forward path changes, tear down on unmount) is exactly what [`createReactAdapter`](#createreactadapterreact) and [`createVueAdapter`](#createvueadaptervue) below do for you, on top of `createRuntimeHostObservable`. Use `createRuntimeHost` directly only when neither adapter fits — a framework those packages don't cover, or a host with no framework at all (as above).

Behavior notes:

- `resolveAndMount(path)` is a no-op if `path` resolves to the specifier that's already mounted — everything past "which module owns this path" is that module's own responsibility (its own internal sub-routing, if any), not the host's.
- If no route matches, or the import/mount throws, `onError(error, path)` is called and internal state resets so the next navigation isn't blocked. The default `onError` logs to the console and sets `target.textContent` to a generic failure message; pass your own to customize it or distinguish no-match from a real failure.
- `onLoading(path)` fires right before a genuinely new module starts importing; `onReady(path)` fires once that module has actually finished mounting. Neither fires for a stale, superseded call.
- One `createRuntimeHost` instance manages exactly one `target`/region. An app with more than one independently-loading region (e.g. a dynamic sidebar and a dynamic main area) creates one instance per region.
- `createRuntimeHost` does not intercept clicks or call `history.pushState()` itself — it only reacts to a path you give it. Wire it to whatever produces navigation events: a raw `popstate` listener, a router's navigation callback, anything.
- `destroy()` unmounts the current module (if any) and resets internal state — call it on host teardown or in tests.

### `createRuntimeHostObservable(options)`

A thin, subscribable status wrapper around `createRuntimeHost` — one `createRuntimeHost` instance internally, translating its `onLoading`/`onReady`/`onError` callbacks into a single observable `RuntimeHostStatus`. It's the primitive the React and Vue adapters below are built on; reach for it directly only if you're building a similar adapter for a framework this toolkit doesn't cover yet.

```ts
export type RuntimeHostStatus =
  | { type: "idle" }
  | { type: "loading"; path: string }
  | { type: "ready"; path: string }
  | { type: "error"; path: string; error: unknown };

export type RuntimeHostObservableOptions = Pick<
  RuntimeHostOptions,
  "manifest" | "target" | "importer"
>;

export type RuntimeHostObservable = {
  next(path: string): void;
  subscribe(observer: (status: RuntimeHostStatus) => void): () => void;
  getSnapshot(): RuntimeHostStatus;
  destroy(): Promise<void>;
};

export const createRuntimeHostObservable: (
  options: RuntimeHostObservableOptions,
) => RuntimeHostObservable;
```

```ts
import { createRuntimeHostObservable } from "@rmc-toolkit/core";

const observable = createRuntimeHostObservable({
  manifest,
  target: document.getElementById("app")!,
});

const unsubscribe = observable.subscribe((status) => {
  console.log(status); // { type: "idle" | "loading" | "ready" | "error", ... }
});

observable.next(window.location.pathname);
window.addEventListener("popstate", () => observable.next(window.location.pathname));

// later: unsubscribe(); void observable.destroy();
```

Notes:

- Status starts at `{ type: "idle" }` before the first `next()` call, and only ever transitions on a non-stale outcome — a `next()` call superseded by a newer one before it settles never changes the status, matching `createRuntimeHost`'s own stale-call discarding.
- `getSnapshot()` returns the *same object reference* across calls until a real transition happens. This matters if you build your own adapter on top of `getSnapshot()`/`subscribe()` with React's `useSyncExternalStore` — a fresh object on every call would look like a change on every render and loop forever.
- `next()` is fire-and-forget by design — it never throws or rejects, since `createRuntimeHost.resolveAndMount()` already catches everything internally and reports failures through `onError`, which becomes an `"error"` status here.

### `notifyInternalNavigation(path)`

Formalizes the `pushState` + synthetic-`popstate` pattern a slice's own internal navigation (e.g. a `Link` component) uses to tell whatever host router is listening that a navigation happened, instead of hand-rolling it:

```ts
import { notifyInternalNavigation } from "@rmc-toolkit/core";

notifyInternalNavigation("/search/results?q=ferries");
```

It calls `window.history.pushState({}, "", path)` and dispatches a `popstate` event on `window` — plain DOM APIs that work regardless of which router (if any) the host uses, since every real router listens for `popstate`. The host still needs something listening for that event (a `createRuntimeHost` wiring, or its own router) — this function only announces the navigation, it doesn't handle it.

### `listExternalSpecifiers(manifest)`

Returns a concrete array of every import-map-owned specifier or prefix: the namespace prefix, the external-deps prefix (when `externalDepsOrigin` is set), and any `exactImports`/`sliceOverrides` entries not explicitly opted out with `external: false`.

```ts
import { listExternalSpecifiers } from "@rmc-toolkit/core";

const externals = listExternalSpecifiers(manifest);
```

### `createExternalMatcher(manifest)`

Returns a `(source: string) => boolean` predicate for Rollup/Vite `external` configuration, built from the same manifest that generates the import map — this is what keeps import-map and build-externalization rules from drifting apart.

```ts
import { createExternalMatcher } from "@rmc-toolkit/core";

const isExternal = createExternalMatcher(manifest);
```

### `importModule(specifier, importer?)`

Thin, injectable wrapper around dynamic `import()`. Has no opinion about what the module exports.

```ts
import { importModule } from "@rmc-toolkit/core";

const namespace = await importModule("@acme/search/index.mjs");
```

Pass a custom `importer` in tests, or when a host needs custom loading behavior. Returns the raw module namespace unmodified — deliberate, since some consumers (`React.lazy()`) need the namespace as-is rather than unwrapped. Most hosts don't call this directly — `createRuntimeHost()` and `DynamicModuleBoundary` both use it internally.

### `unwrapDefault(moduleNamespace)`

Returns `namespace.default` if present, otherwise the namespace itself. Pure, with no shape validation.

```ts
import { importModule, unwrapDefault } from "@rmc-toolkit/core";

const namespace = await importModule("@acme/search/index.mjs");
const exported = unwrapDefault(namespace);
```

Pair this with whatever module convention your host chooses — `RuntimeModule` (`{ mount(target, context), unmount?() }`) is one option, not an enforced contract; `createRuntimeHost()` uses exactly this convention. Not needed with React's `DynamicModuleBoundary`, which needs the un-unwrapped namespace for `React.lazy()`.

### `validateManifest(manifest)`

Returns an array of `{ level: "error" | "warning", code, message }` diagnostics. Run it in CI, tests, or startup checks.

```ts
import { validateManifest } from "@rmc-toolkit/core";

const diagnostics = validateManifest(manifest);
const errors = diagnostics.filter((d) => d.level === "error");
if (errors.length > 0) {
  throw new Error(errors.map((d) => d.message).join("\n"));
}
```

Errors: `assetsOrigin` or `externalDepsOrigin` isn't an absolute HTTP(S) URL. Warnings: non-`@`-prefixed namespace, `externalDepsPrefix` missing a trailing slash, slice or route override specifiers that don't start with the namespace, slice entries that don't look like ESM assets, `externalDeps` entries that share a base package but declare different versions, and `peerDeps`/`defaultPeerDeps` names with no matching `externalDeps` entry (see [External Dependencies](#external-dependencies) above). Both new `externalDeps` checks are warnings, not errors — deliberately, so a mistake here shows up in CI without blocking a build.

### URL helpers

`joinUrl(origin, path)`, `trimLeadingSlash(value)`, and `trimTrailingSlash(value)` are small utilities used internally by import-map generation. They're exported for deployment adapters that need to resolve asset URLs consistently with core.

`splitPackageSpecifier(name)` splits a package specifier into its base package and an optional subpath, handling scoped packages: `splitPackageSpecifier("react-dom/client")` returns `{ basePackage: "react-dom", subpath: "client" }`; `splitPackageSpecifier("@radix-ui/themes")` returns `{ basePackage: "@radix-ui/themes", subpath: null }`. Used internally to group `externalDeps` entries that share a base package (for the version-conflict check in `validateManifest`) and to insert a version between the base package and subpath when generating a URL (`react-dom@19.2.4/client`, not `react-dom/client@19.2.4`).

## Vite adapter (`@rmc-toolkit/vite`)

### `runtimeComposition(options)`

The default Vite integration for a **host**. Returns an array of plugins combining HTML import-map generation and dependency externalization.

```ts
import { defineConfig } from "vite";
import { runtimeComposition } from "@rmc-toolkit/vite";
import { manifest } from "./runtime-composition.manifest";

export default defineConfig({
  plugins: [
    ...runtimeComposition({ manifest, environment: "development" }),
  ],
});
```

Options: `manifest` (required), `environment`, `includeImportMap` (default `true`), `externalize` (default `true`).

### `includeRuntimeImportMap(options)`

Vite HTML-transform plugin only — adds a `<script type="importmap" data-runtime-module-composition>` tag to `<head>`, replacing an existing one from this plugin if present. Runs before the browser receives `index.html`; does not externalize imports and does not mutate the DOM at runtime.

```ts
import { includeRuntimeImportMap } from "@rmc-toolkit/vite";

export default defineConfig({
  plugins: [includeRuntimeImportMap({ manifest, environment: "development" })],
});
```

### `externalizeRuntimeComposition(options)`

Dependency-externalization plugin only — prevents Vite from bundling or rewriting manifest-owned specifiers during dev and build. Pair with an import map that's already present in the initial HTML.

```ts
import { externalizeRuntimeComposition } from "@rmc-toolkit/vite";

export default defineConfig({
  plugins: [externalizeRuntimeComposition({ manifest })],
});
```

Marking a specifier `external: true` is enough for a production build — Rollup preserves it untouched in the output bundle for the browser's import map to resolve. Vite's dev server does not honor a bare specifier the same way: its import-analysis step rewrites anything merely marked external into an internal, unresolvable `/@id/<specifier>` placeholder request instead of leaving it for the browser. So in dev mode specifically, this plugin resolves each externalized specifier to its real absolute URL (via `resolveImportMapSpecifier()`, against the same import map `createImportMap()` would generate) before returning it, rather than returning the bare specifier as-is. This is transparent to callers — `runtimeComposition()`/`externalizeRuntimeComposition()` handle it internally — but it's why dev and build resolve the same specifier to different-looking `resolveId` results if you inspect them directly.

### `defineSliceBuild(options)`

Mode-aware Vite config for a **slice's** own `vite.config.ts`, replacing hand-copied build boilerplate. It does not externalize import-map-owned dependencies by itself — pair it with `createRollupExternal()` for that (see [Quick Start: React](/quick-start/react/#9-build-the-slice-as-an-esm-library)).

```ts
export type SliceBuildOptions = {
  mode: string;      // pass through from defineConfig(({ mode }) => ...)
  devPort: number;
  sliceName: string; // determines the production outDir: dist/{sliceName}
  entry?: string;    // defaults to auto-detected src/index.tsx or src/index.ts
};

export const defineSliceBuild: (options: SliceBuildOptions) => UserConfig;
```

```ts
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

Behavior:

- In `development` mode, returns only `{ server: { port: devPort } }` — `sliceName` has no effect here.
- In any other mode (production, or a custom mode), returns a library-build config: `build.outDir` (`dist/{sliceName}`), `build.lib` (entry, `formats: ["es"]`, `fileName: () => "index.mjs"`), `preview: { cors: true }` (needed for cross-origin loading by the host), and a `define` for `process.env.NODE_ENV` — Vite's library-build mode doesn't auto-replace this the way its app-build mode does, which otherwise leaves a raw `process` reference in the bundle and throws `ReferenceError: process is not defined` when the browser loads it directly via native `import()`.
- `sliceName` is required, with no derivation from `package.json`'s own `name` field — every slice states it explicitly, matching the same slice-name concept the manifest's route resolution and `sliceOrigins` already treat as first-class. The resulting `dist/{sliceName}/index.mjs` matches the `{assetsOrigin}/{sliceName}/index.mjs` path convention `resolveRoute()`/`createImportMap()` already assume for a conventionally-resolved slice, so a production deploy needs no separate step to rename or nest each slice's build output — only to collect multiple slices' `dist/` directories into one upload (a deploy-pipeline concern this helper doesn't own).
- Entry resolution: uses `entry` if provided; otherwise checks for `src/index.tsx`, then `src/index.ts`, relative to the current working directory. Throws synchronously if neither exists and no `entry` was given.

### `createRollupExternal(manifest)`

Standalone external predicate for a slice's production library build — this is what `defineSliceBuild()` doesn't do for you.

```ts
import { createRollupExternal } from "@rmc-toolkit/vite";

export default defineConfig({
  build: {
    lib: { entry: ["src/index.tsx"], formats: ["es"], fileName: () => "index.mjs" },
    rollupOptions: { external: createRollupExternal(manifest) },
  },
});
```

### `includeHostedImportMap(options)`

Returns an array of two plugins for setups that deliver the import map as a standalone hosted asset (e.g. `/js/importmap.js`) rather than through Vite's HTML transform:

1. Dev-server middleware that serves a dynamically generated import-map script from a configurable path (default `/js/importmap.js`).
2. A dev-only HTML-ordering-safety plugin (wraps the published [`vite-plugin-js-importmap-script`](https://github.com/runtime-module-composition/vite-plugin-js-importmap-script)) that repositions the import-map script tag to the very front of `<head>` and appends a `?dev`/`&dev` flag, on every dev request.

```ts
import { includeHostedImportMap } from "@rmc-toolkit/vite";

export default defineConfig({
  plugins: [
    ...includeHostedImportMap({
      manifest,
      path: "/js/importmap.js",
      localSlice: { name: "search", port: 5174 },
    }),
  ],
});
```

Options: `manifest` (required), `path` (default `/js/importmap.js`), `localSlice` (`{ name, port }`) — overrides one slice's dev-server origin in the served manifest without editing the shared manifest file. The middleware only responds to `GET`/`HEAD` requests at the exact configured path.

**Your HTML must declare the hosted import map as a plain external script, in this exact attribute order, for the second plugin to find and reposition it:**

```html
<script data-src-type="importmap" src="/js/importmap.js"></script>
```

Why this matters: per the HTML spec, a document's "import maps allowed" state flips to `false` — permanently, for that page load — the moment the first module script (or module preload) is fetched. Vite's dev server always injects its own `type="module"` scripts (the HMR client, and the React refresh preamble under `@vitejs/plugin-react`). If either of those gets prepared before the import-map script tag is parsed, the import map is rejected outright, not merely reordered, and every bare-specifier import in the app fails. The ordering-safety plugin closes this by actively moving the tag to the front of `<head>` on every dev request instead of relying on Vite's internal plugin-hook ordering (undocumented, not guaranteed across versions). It's dev-only (`apply: "serve"`) since it always appends the dev-flag query unconditionally and has no build-mode awareness of its own — never wire it into a production build.

### `buildLocalImportMapScript(manifest, localSlice)`

Helper used internally by `includeHostedImportMap`: derives a manifest with one slice's `development.sliceOrigins` entry overridden to `http://localhost:{port}`, then returns its bootstrap script via `createImportMapBootstrapScript()`. Exposed for adapters that need the same derivation outside of the middleware.

## React adapter (`@rmc-toolkit/react`)

Both exports below are **factories**, not ready-to-use values: you pass in your host app's own already-resolved `React` module, and get back hooks/components closed over that exact instance. This is deliberate, not incidental ceremony — see "Why a factory, not a direct import" under `createReactAdapter` below.

### `createReactAdapter(React)`

Wraps `createRuntimeHostObservable` in a React hook, eliminating the `useRef`/`useEffect` boilerplate a host would otherwise hand-write to create the observable on mount, forward path changes, subscribe to status, and tear down on unmount.

```ts
export const createReactAdapter: (
  React: typeof import("react"),
) => {
  useRuntimeHost<T extends Element>(
    path: string,
    options: Pick<RuntimeHostObservableOptions, "manifest" | "importer">,
  ): { ref: React.RefObject<T | null>; status: RuntimeHostStatus };
};
```

Instantiate the adapter once, at module scope, with your app's own React instance — however it was resolved (bundled locally, loaded from a CDN via an import map, anything):

```ts
// src/rmc-adapter.ts
import React from "react";
import { createReactAdapter } from "@rmc-toolkit/react";

export const { useRuntimeHost } = createReactAdapter(React);
```

Then use the returned `useRuntimeHost` hook in the host component, driven by whatever router the app already uses:

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
      {status.type === "error" && <ErrorBanner error={status.error} />}
      <SiteFooter />
    </div>
  );
}
```

`ref` attaches to whatever DOM element should host the mounted slice — an existing layout element, same as `createRuntimeHost`'s `target`, not necessarily a dedicated wrapper. `status` is a `RuntimeHostStatus` (`idle` / `loading` / `ready` / `error`), kept in sync via `React.useSyncExternalStore` under the hood, so it re-renders the component exactly when the status actually changes.

**Why a factory, not a direct import:** an earlier version of this package's `DynamicModuleBoundary` (below) called `import React from "react"` directly. If a host app externalizes its own React differently than the adapter package resolves its import (a different bundler, a different CDN convention, or the adapter loaded from a CDN itself), the two can silently end up as two separate React copies — breaking hooks, Context, and Suspense across the boundary between them. Passing in the host's own already-resolved `React` instance removes the possibility entirely: there's no import path for the adapter package to get wrong, because it never imports React as a value at all (only as a type, which TypeScript erases). The same reasoning applies to `@rmc-toolkit/vue`'s `createVueAdapter` below.

### `createDynamicModuleBoundary(React)`

Same factory pattern as `createReactAdapter`, for the simpler component-convention loader: loads and renders a React slice module inside the host's component tree — no iframes. Unlike `createRuntimeHost`/`createReactAdapter`, it expects the slice to default-export a plain React component rather than a `mount()`/`unmount()` pair; use whichever convention matches how your slices are written, not both for the same slice.

```ts
export const createDynamicModuleBoundary: (
  React: typeof import("react"),
) => {
  DynamicModuleBoundary: (props: DynamicModuleBoundaryProps) => React.ReactElement;
};
```

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

Props: `specifier` (required), `context?` (passed to the loaded component as `{ context }`), `fallback?` (shown during load), `errorFallback?` (shown if the import or render throws), `importer?` (custom `DynamicImporter`, mainly for tests).

Notes:

- The slice module must default-export a React component.
- Built on `React.lazy()` and `React.Suspense`, using `importModule()` internally.
- An internal error boundary catches both import failures and render failures.

## Vue adapter (`@rmc-toolkit/vue`)

### `createVueAdapter(Vue)`

The Vue counterpart to `createReactAdapter` — same factory pattern, same underlying `createRuntimeHostObservable`, same reasoning for why the host's own `Vue` instance is passed in rather than imported by the package (see `createReactAdapter` above).

```ts
export const createVueAdapter: (
  Vue: typeof import("vue"),
) => {
  useRuntimeHost(
    path: () => string,
    options: Pick<RuntimeHostObservableOptions, "manifest" | "importer">,
  ): { target: import("vue").Ref<Element | null>; status: import("vue").Ref<RuntimeHostStatus> };
};
```

Instantiate once, with the app's own Vue instance:

```ts
// src/rmc-adapter.ts
import * as Vue from "vue";
import { createVueAdapter } from "@rmc-toolkit/vue";

export const { useRuntimeHost } = createVueAdapter(Vue);
```

`path` is a getter (`() => string`), not a plain string, so the adapter can watch it reactively:

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
  template: `
    <div class="app-shell">
      <SiteHeader :loading="status.type === 'loading'" />
      <main ref="target"></main>
      <ErrorBanner v-if="status.type === 'error'" :error="status.error" />
      <SiteFooter />
    </div>
  `,
};
```

Internally: `useRuntimeHost` creates one `createRuntimeHostObservable` in `onMounted` (once `target.value` is available), subscribes it to a reactive `status` ref, calls `observable.next()` once immediately and again on every reactive change to `path()` via `watch()`, and calls `observable.destroy()` in `onUnmounted`.

## Recommended order

1. Define the manifest with `defineManifest()`.
2. Validate it with `validateManifest()` in tests or CI.
3. Generate the browser import map with `createImportMap()`, or via Vite with `runtimeComposition()` / `includeHostedImportMap()`.
4. Build each slice with `defineSliceBuild()` plus `createRollupExternal()`.
5. Bootstrap the host:
   - React host, slices share the DOM `mount()`/`unmount()` convention: `createReactAdapter()`'s `useRuntimeHost()`.
   - React host, slices are plain React components: `createDynamicModuleBoundary()`'s `DynamicModuleBoundary`.
   - Vue host, slices share the DOM `mount()`/`unmount()` convention: `createVueAdapter()`'s `useRuntimeHost()`.
   - No framework, or a framework without a dedicated adapter yet: `createRuntimeHost()` directly (or `createRuntimeHostObservable()` if you want subscribable status without hand-rolling your own adapter).
   - A fully custom lifecycle none of the above cover: `resolveRoute()`, `importModule()`, and `unwrapDefault()` directly.
6. Have slices call `notifyInternalNavigation()` when they navigate internally, so the host's router notices.
