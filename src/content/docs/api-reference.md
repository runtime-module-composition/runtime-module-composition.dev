---
title: API Reference
description: Every exported method in runtime-module-composition, with usage examples and implementation notes.
---

`runtime-module-composition` is split into a framework-agnostic core plus adapters. This reference covers every public export. New to the library? Start with [Getting Started](/getting-started/).

```ts
import { createExternalMatcher, createImportMap /* ... */ } from "runtime-module-composition/core";
import { runtimeComposition /* ... */ } from "runtime-module-composition/vite";
import { DynamicModuleBoundary } from "runtime-module-composition/react";
```

The root package (`runtime-module-composition`) re-exports everything from `/core`.

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

## Core (`runtime-module-composition/core`)

### `defineManifest(manifest)`

Identity function that preserves the exact TypeScript shape of your manifest while checking it against `RuntimeCompositionManifest`.

```ts
import { defineManifest } from "runtime-module-composition/core";

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
import { createImportMap } from "runtime-module-composition/core";

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
import { createImportMapBootstrapScript } from "runtime-module-composition/core";

const script = createImportMapBootstrapScript(manifest, { environment: "production" });
```

The generated script detects a `?dev` query parameter on its own `<script src>` at runtime (via `document.currentScript`) and appends `?dev` to external-dependency URLs when present, so the same deployed script can serve both a normal and a dev-flagged import map.

### `resolveRoute(manifest, path)`

Maps a URL path to the slice that owns it.

```ts
import { resolveRoute } from "runtime-module-composition/core";

const match = resolveRoute(manifest, window.location.pathname);
if (match) {
  await import(/* @vite-ignore */ match.specifier);
}
```

Notes:

- Convention: the first path segment becomes the slice name, so `/search/anything` resolves to `@acme/search/index.mjs` when `entryFile` is unset.
- `routeOverrides` and `sliceOverrides` are checked first and win over convention-based resolution — routes support exact paths and `/prefix/*` wildcards, and ties are broken by specificity.
- Returns `null` for `/` and any path with no matching segment or override.

### `listExternalSpecifiers(manifest)`

Returns a concrete array of every import-map-owned specifier or prefix: the namespace prefix, the external-deps prefix (when `externalDepsOrigin` is set), and any `exactImports`/`sliceOverrides` entries not explicitly opted out with `external: false`.

```ts
import { listExternalSpecifiers } from "runtime-module-composition/core";

const externals = listExternalSpecifiers(manifest);
```

### `createExternalMatcher(manifest)`

Returns a `(source: string) => boolean` predicate for Rollup/Vite `external` configuration, built from the same manifest that generates the import map — this is what keeps import-map and build-externalization rules from drifting apart.

```ts
import { createExternalMatcher } from "runtime-module-composition/core";

const isExternal = createExternalMatcher(manifest);
```

### `importModule(specifier, importer?)`

Thin, injectable wrapper around dynamic `import()`. Has no opinion about what the module exports.

```ts
import { importModule } from "runtime-module-composition/core";

const namespace = await importModule("@acme/search/index.mjs");
```

Pass a custom `importer` in tests, or when a host needs custom loading behavior. Returns the raw module namespace unmodified — deliberate, since some consumers (`React.lazy()`) need the namespace as-is rather than unwrapped.

### `unwrapDefault(moduleNamespace)`

Returns `namespace.default` if present, otherwise the namespace itself. Pure, with no shape validation.

```ts
import { importModule, unwrapDefault } from "runtime-module-composition/core";

const namespace = await importModule("@acme/search/index.mjs");
const exported = unwrapDefault(namespace);
```

Pair this with whatever module convention your host chooses — `RuntimeModule` (`{ mount(target, context), unmount?() }`) is one option, not an enforced contract. Not needed with React's `DynamicModuleBoundary`, which needs the un-unwrapped namespace for `React.lazy()`.

### `validateManifest(manifest)`

Returns an array of `{ level: "error" | "warning", code, message }` diagnostics. Run it in CI, tests, or startup checks.

```ts
import { validateManifest } from "runtime-module-composition/core";

const diagnostics = validateManifest(manifest);
const errors = diagnostics.filter((d) => d.level === "error");
if (errors.length > 0) {
  throw new Error(errors.map((d) => d.message).join("\n"));
}
```

Errors: `assetsOrigin` or `externalDepsOrigin` isn't an absolute HTTP(S) URL. Warnings: non-`@`-prefixed namespace, `externalDepsPrefix` missing a trailing slash, slice or route override specifiers that don't start with the namespace, slice entries that don't look like ESM assets.

### URL helpers

`joinUrl(origin, path)`, `trimLeadingSlash(value)`, and `trimTrailingSlash(value)` are small utilities used internally by import-map generation. They're exported for deployment adapters that need to resolve asset URLs consistently with core.

## Vite adapter (`runtime-module-composition/vite`)

### `runtimeComposition(options)`

The default Vite integration. Returns an array of plugins combining HTML import-map generation and dependency externalization.

```ts
import { defineConfig } from "vite";
import { runtimeComposition } from "runtime-module-composition/vite";
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
import { includeRuntimeImportMap } from "runtime-module-composition/vite";

export default defineConfig({
  plugins: [includeRuntimeImportMap({ manifest, environment: "development" })],
});
```

### `externalizeRuntimeComposition(options)`

Dependency-externalization plugin only — prevents Vite from bundling or rewriting manifest-owned specifiers during dev and build. Pair with an import map that's already present in the initial HTML.

```ts
import { externalizeRuntimeComposition } from "runtime-module-composition/vite";

export default defineConfig({
  plugins: [externalizeRuntimeComposition({ manifest })],
});
```

### `createRollupExternal(manifest)`

Standalone external predicate for a slice's production library build.

```ts
import { createRollupExternal } from "runtime-module-composition/vite";

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
import { includeHostedImportMap } from "runtime-module-composition/vite";

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

## React adapter (`runtime-module-composition/react`)

### `DynamicModuleBoundary(props)`

Loads and renders a React slice module inside the host's component tree — no iframes.

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

Props: `specifier` (required), `context?` (passed to the loaded component as `{ context }`), `fallback?` (shown during load), `errorFallback?` (shown if the import or render throws), `importer?` (custom `DynamicImporter`, mainly for tests).

Notes:

- The slice module must default-export a React component.
- Built on `React.lazy()` and `React.Suspense`, using `importModule()` internally.
- An internal error boundary catches both import failures and render failures.

## Recommended order

1. Define the manifest with `defineManifest()`.
2. Validate it with `validateManifest()` in tests or CI.
3. Generate the browser import map with `createImportMap()`, or via Vite with `runtimeComposition()` / `includeHostedImportMap()`.
4. Use `createRollupExternal()` in each slice's production build.
5. Resolve routes with `resolveRoute()` in the host shell.
6. Load the resolved slice with a framework adapter such as `DynamicModuleBoundary()`, or directly via `importModule()` and `unwrapDefault()` using whatever module convention the host chooses.
