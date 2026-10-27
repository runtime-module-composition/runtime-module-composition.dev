---
title: Glossary
description: What each term means, in one place — manifest fields, runtime concepts, and the different lenses on "slice".
---

Every other page in these docs assumes the terms below. This page defines them once, so nothing has to re-explain itself. Terms are alphabetical — use your browser's find-in-page, or search, to jump straight to one.

## Runtime Module Composition terms

### Adapter

A framework-specific wrapper around the core resolve/import/mount lifecycle — `@rmc-toolkit/react`'s `createReactAdapter()`/`createDynamicModuleBoundary()`, `@rmc-toolkit/vue`'s `createVueAdapter()`. Each is a factory: it takes the host's own already-resolved framework instance (`React`, `Vue`) as an argument, rather than importing one itself, so the adapter package never bundles a second, conflicting copy of the framework.

### assetsOrigin

A [manifest](#manifest) field: the base URL slices are served from in production, e.g. `https://assets.fastflights.com`. Combined with a slice's name and [entryFile](#entryfile) to produce its production import map entry.

### Dynamic import

The browser's native `import()` function, called with a [specifier](#specifier). `@rmc-toolkit/core`'s `importModule()` wraps this as the one primitive every host and adapter loads a slice through.

### entryFile

A [manifest](#manifest) field, default `index.mjs`: the file name every slice is expected to expose at its own namespace path, e.g. `@fastflights/search/index.mjs`.

### externalDeps

A [manifest](#manifest) field: the shared dependencies (React, Vue, and so on) available through the [import map](#import-map), each with a name, an exact version, and optional peer dependencies. Generates the CDN-facing entries in the import map so slices never bundle their own copy.

### externalDepsOrigin

A [manifest](#manifest) field: the CDN external dependencies resolve through, e.g. `https://esm.sh`.

### externalDepsPrefix

A [manifest](#manifest) field, default `@esm.sh/`: the specifier prefix external dependencies are addressed under, e.g. `@esm/react`. A slice imports through this prefix, never the bare package name — that prefixed form is what the import map actually owns.

### Externalize

Marking an import specifier `external: true` in a Vite/Rollup build, so the bundler leaves it untouched in the output for the browser to resolve at runtime instead of bundling it. `createRollupExternal()` and `createExternalMatcher()` do this for anything the manifest owns.

### Host

A role, not a specific implementation: any application that loads and renders a [slice](#slice) — the document, the routing, the region a slice occupies. Every host is one of two kinds:

- **[Manifest Host](#manifest-host)** — adopts a manifest and resolves routes across it.
- **[No Manifest Host](#no-manifest-host)** — loads one known module, no manifest involved.

### Import map

A browser-native `<script type="importmap">` mechanism that maps bare module specifiers to real URLs. Must be present in the page before any module script executes. `createImportMap()` generates one from a manifest; `@rmc-toolkit/vite`'s plugins inject it into the host's HTML.

### Independent Mount

An integration pattern: the slice mounts into a DOM element and owns its own rendering lifecycle and DOM subtree; the host interacts with it only through [`mount`/`unmount`](#slice-conventions). Framework-agnostic to the host — it never needs to know what rendered the slice. Independent Mount does not imply CSS isolation, sandboxing, or a separate JavaScript environment: it's still the same page, the same `document`, the same global scope.

### Manifest

The single source of truth: namespace, origins, external dependencies, slice and route overrides. Every other piece — import map generation, route resolution, the Vite build config — reads from the same manifest object.

### Manifest Host

A [host](#host) that adopts a [manifest](#manifest): generates its [import map](#import-map) from it, and resolves the current path to a slice via [`resolveRoute(manifest, path)`](#route). This is what earlier versions of these docs called "Host" — now the specific, manifest-adopting case, not the generic role.

### Module Boundary

An integration pattern: the slice renders as a first-class node inside the host's own framework render tree, loaded through the host's native lazy/Suspense/error-boundary machinery. Host and slice must share a framework. Two export styles — see [Slice conventions](#slice-conventions).

### Namespace

A [manifest](#manifest) field: the specifier prefix every slice is addressed under, e.g. `@fastflights`. Combined with a slice's name and [entryFile](#entryfile) to form its full [specifier](#specifier).

### No Manifest Host

A [host](#host) that loads one known module without a [manifest](#manifest) or route resolution — a hand-rolled [import map](#import-map) entry, or a direct URL import. Supported, but discouraged in favor of a [Manifest Host](#manifest-host) except for a single hand-wired slice. Already works today for [Module Boundary](#module-boundary) slices (see [Decoupling a Slice from an Existing App](/quick-start/module-boundary/existing-app/)). There's no equivalent for [Independent Mount](#independent-mount) — `createRuntimeHost()` requires a full manifest. See the [No Manifest Host reference page](/quick-start/advanced/no-manifest-host/) for exactly what's supported.

### Route

What `resolveRoute(manifest, path)` does: matches a URL path against the manifest to find which slice owns it. Returns a `RuntimeRouteMatch` — the slice's module specifier, its name, and the matched route pattern. Host routing is deliberately coarse (exact paths and `/prefix/*` wildcards, no path params) — everything after the matched prefix belongs to the slice's own router.

### Runtime Module Composition

The pattern this toolkit implements: composing independently built and deployed modules together in the browser, at runtime, through native ESM and import maps — not a bundler-level build step. "Composition," specifically, because the browser resolves everything through native module resolution the moment a page runs, rather than a build tool federating a dependency graph across separately compiled bundles ahead of time.

### Slice

An independently built and deployed unit of a composed application. The same thing shows up under different names depending on which lens you're using:

- as a **module**, it's just an ES module the host dynamically imports
- as an **application**, it's a standalone project with its own repo, build, and release cadence
- as an **architecture concept**, it's what's commonly called a micro frontend

None of these is more correct than the others — a slice genuinely is all three at once. The word picks a neutral term rather than committing to one framing.

### Slice conventions

A slice is built for exactly one of three contracts, and they aren't interchangeable:

- **mount/unmount** — the slice exports an object with `mount(target)` and `unmount()`. The literal interface behind the [Independent Mount](#independent-mount) pattern. Used by `createRuntimeHost()`, `createReactAdapter()`, and `createVueAdapter()`.
- **Direct** — the slice default-exports a component. One of two [Module Boundary](#module-boundary) export styles. Used by React's `createDynamicModuleBoundary()` — no Vue equivalent exists.
- **Injected** — the slice default-exports a factory, `(deps) => Component`, that receives the host's own framework instance instead of importing its own. The other [Module Boundary](#module-boundary) export style. Used by `createInjectedModuleBoundary()` (React and Vue). This one is for a specific situation — see [Decoupling a Slice from an Existing App](/quick-start/module-boundary/existing-app/) for when to reach for it instead of Direct or mount/unmount.

Pick the one matching how a given slice is written — not both for the same slice.

### sliceName

The identifying name for a single slice. Used both when building it (`defineSliceBuild({ sliceName })`, which determines its output path) and when the manifest routes to it (its namespace path segment, and its [sliceOrigins](#sliceorigins) key in development).

### sliceOrigins

A [manifest](#manifest) field, scoped to `environments.development`: maps a slice name to its local dev server origin, e.g. `search: "http://localhost:5174"`. Points the host's import map at a live dev server instead of the production [assetsOrigin](#assetsorigin) while developing.

### Specifier

The string identifier a module is imported by, e.g. `@fastflights/search/index.mjs`. Resolved to a real URL by the [import map](#import-map). A slice's naming ([namespace](#namespace) + [sliceName](#slicename) + [entryFile](#entryfile)) and its own build output path have to agree on this string exactly, or resolution fails.
