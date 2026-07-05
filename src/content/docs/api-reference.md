---
title: API Reference
description: Every exported method in rmc-toolkit, with usage examples and implementation notes.
---

[`rmc-toolkit`](https://github.com/runtime-module-composition/rmc-toolkit) is split into a framework-agnostic core plus adapters, published as three independent packages. This reference covers every public export. New to the library? Start with [Getting Started](/getting-started/).

```ts
import { createExternalMatcher, createImportMap /* ... */ } from "@rmc-toolkit/core";
import { runtimeComposition /* ... */ } from "@rmc-toolkit/vite";
import { DynamicModuleBoundary } from "@rmc-toolkit/react";
```

There is no root/meta package — install `@rmc-toolkit/core`, `@rmc-toolkit/vite`, and `@rmc-toolkit/react` directly, and only the ones you need. `@rmc-toolkit/vite` and `@rmc-toolkit/react` both depend on `@rmc-toolkit/core`.

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
| `externalDeps` | no | List of external dependency package names (or `{ name, peerDeps }`) to include in the generated import map. |
| `defaultPeerDeps` | no | Peer-dependency query params applied to string entries in `externalDeps`. |

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
  onError?: (error: unknown, path: string) => void;
  importer?: DynamicImporter;
};

export type RuntimeHost = {
  resolveAndMount(path: string): Promise<void>;
  destroy(): Promise<void>;
};

export const createRuntimeHost: (options: RuntimeHostOptions) => RuntimeHost;
```

**Plain host, no framework router:**

```ts
import { createRuntimeHost } from "@rmc-toolkit/core";

const host = createRuntimeHost({ manifest, target: document.getElementById("app")! });

window.addEventListener("popstate", () => {
  void host.resolveAndMount(window.location.pathname);
});
void host.resolveAndMount(window.location.pathname); // initial load
```

**React host, using React Router:** React Router owns link interception, `pushState`, and `popstate`; `createRuntimeHost` only reacts to the resulting path via `useLocation()`. `target` can be an element the host was already rendering as part of its layout — it doesn't need to be a dedicated wrapper, but nothing else may render children into it once handed over.

```tsx
function App() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const hostRef = useRef<ReturnType<typeof createRuntimeHost> | null>(null);

  useEffect(() => {
    if (!mainRef.current) return;
    hostRef.current = createRuntimeHost({
      manifest,
      target: mainRef.current,
      onLoading: (path) => setStatus("loading"),
      onError: (error, path) => setStatus("error"),
    });
    return () => void hostRef.current?.destroy();
  }, []);

  useEffect(() => {
    void hostRef.current?.resolveAndMount(location.pathname);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <SiteHeader />
      <main ref={mainRef} />
      <SiteFooter />
    </div>
  );
}
```

**Vue host, using Vue Router:** the same shape — forward Vue Router's reactive `route.fullPath` to `resolveAndMount()` via `watch()`.

```ts
export default {
  setup() {
    const target = ref<HTMLElement | null>(null);
    const route = useRoute();
    let host: ReturnType<typeof createRuntimeHost> | null = null;

    onMounted(() => {
      host = createRuntimeHost({
        manifest,
        target: target.value!,
        onLoading: (path) => { /* set a reactive loading flag */ },
        onError: (error, path) => { /* set a reactive error flag */ },
      });
      void host.resolveAndMount(route.fullPath);
    });

    watch(() => route.fullPath, (newPath) => void host?.resolveAndMount(newPath));
    onUnmounted(() => void host?.destroy());

    return { target };
  },
  template: `<div ref="target"></div>`,
};
```

Behavior notes:

- `resolveAndMount(path)` is a no-op if `path` resolves to the specifier that's already mounted — everything past "which module owns this path" is that module's own responsibility (its own internal sub-routing, if any), not the host's.
- If no route matches, or the import/mount throws, `onError(error, path)` is called and internal state resets so the next navigation isn't blocked. The default `onError` logs to the console and sets `target.textContent` to a generic failure message; pass your own to customize it or distinguish no-match from a real failure.
- `onLoading(path)` fires right before a genuinely new module starts importing — there's no matching "loading finished" callback, since the loading UI is naturally replaced once the module's `mount()` (or `onError`) writes into `target`.
- One `createRuntimeHost` instance manages exactly one `target`/region. An app with more than one independently-loading region (e.g. a dynamic sidebar and a dynamic main area) creates one instance per region.
- `createRuntimeHost` does not intercept clicks or call `history.pushState()` itself — it only reacts to a path you give it. Wire it to whatever produces navigation events: a raw `popstate` listener, a router's navigation callback, anything.
- `destroy()` unmounts the current module (if any) and resets internal state — call it on host teardown or in tests.

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

Errors: `assetsOrigin` or `externalDepsOrigin` isn't an absolute HTTP(S) URL. Warnings: non-`@`-prefixed namespace, `externalDepsPrefix` missing a trailing slash, slice or route override specifiers that don't start with the namespace, slice entries that don't look like ESM assets.

### URL helpers

`joinUrl(origin, path)`, `trimLeadingSlash(value)`, and `trimTrailingSlash(value)` are small utilities used internally by import-map generation. They're exported for deployment adapters that need to resolve asset URLs consistently with core.

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

### `defineSliceBuild(options)`

Mode-aware Vite config for a **slice's** own `vite.config.ts`, replacing hand-copied build boilerplate. It does not externalize import-map-owned dependencies by itself — pair it with `createRollupExternal()` for that (see [Getting Started](/getting-started/#4-build-a-slice)).

```ts
export type SliceBuildOptions = {
  mode: string;      // pass through from defineConfig(({ mode }) => ...)
  devPort: number;
  entry?: string;    // defaults to auto-detected src/index.tsx or src/index.ts
};

export const defineSliceBuild: (options: SliceBuildOptions) => UserConfig;
```

```ts
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

Behavior:

- In `development` mode, returns only `{ server: { port: devPort } }`.
- In any other mode (production, or a custom mode), returns a library-build config: `build.lib` (entry, `formats: ["es"]`, `fileName: () => "index.mjs"`), `preview: { cors: true }` (needed for cross-origin loading by the host), and a `define` for `process.env.NODE_ENV` — Vite's library-build mode doesn't auto-replace this the way its app-build mode does, which otherwise leaves a raw `process` reference in the bundle and throws `ReferenceError: process is not defined` when the browser loads it directly via native `import()`.
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

Dev-server middleware that serves a dynamically generated import-map script from a configurable path (default `/js/importmap.js`), for setups that deliver the import map as a standalone hosted asset rather than through Vite's HTML transform.

```ts
import { includeHostedImportMap } from "@rmc-toolkit/vite";

export default defineConfig({
  plugins: [
    includeHostedImportMap({
      manifest,
      path: "/js/importmap.js",
      localSlice: { name: "search", port: 5174 },
    }),
  ],
});
```

Options: `manifest` (required), `path` (default `/js/importmap.js`), `localSlice` (`{ name, port }`) — overrides one slice's dev-server origin in the served manifest without editing the shared manifest file. Only responds to `GET`/`HEAD` requests at the exact configured path.

### `buildLocalImportMapScript(manifest, localSlice)`

Helper used internally by `includeHostedImportMap`: derives a manifest with one slice's `development.sliceOrigins` entry overridden to `http://localhost:{port}`, then returns its bootstrap script via `createImportMapBootstrapScript()`. Exposed for adapters that need the same derivation outside of the middleware.

## React adapter (`@rmc-toolkit/react`)

### `DynamicModuleBoundary(props)`

Loads and renders a React slice module inside the host's component tree — no iframes. Unlike `createRuntimeHost`, it expects the slice to default-export a plain React component rather than a `mount()`/`unmount()` pair; use whichever convention matches how your slices are written, not both for the same slice.

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

Props: `specifier` (required), `context?` (passed to the loaded component as `{ context }`), `fallback?` (shown during load), `errorFallback?` (shown if the import or render throws), `importer?` (custom `DynamicImporter`, mainly for tests).

Notes:

- The slice module must default-export a React component.
- Built on `React.lazy()` and `React.Suspense`, using `importModule()` internally.
- An internal error boundary catches both import failures and render failures.

## Recommended order

1. Define the manifest with `defineManifest()`.
2. Validate it with `validateManifest()` in tests or CI.
3. Generate the browser import map with `createImportMap()`, or via Vite with `runtimeComposition()` / `includeHostedImportMap()`.
4. Build each slice with `defineSliceBuild()` plus `createRollupExternal()`.
5. Bootstrap the host with `createRuntimeHost()` — resolving routes, importing, and mounting/unmounting slices that share the DOM `mount()`/`unmount()` convention — or with `DynamicModuleBoundary()` for a React host whose slices are plain React components. Use `resolveRoute()`, `importModule()`, and `unwrapDefault()` directly only if you need a custom lifecycle neither covers.
6. Have slices call `notifyInternalNavigation()` when they navigate internally, so the host's router notices.
