---
title: Technical Implementation
description: How Runtime Module Composition works in production with a host shell, import maps, route resolution, and dynamic ESM loading.
---

Runtime Module Composition is a browser-native micro frontend strategy for composing independently built and deployed JavaScript modules at runtime. Instead of producing one application bundle, a host shell loads a shared import map, resolves route ownership, and dynamically imports the frontend module responsible for the current user journey.

This document describes the reusable technical implementation pattern itself, independent of any specific tooling. If you want a ready-made implementation instead of hand-rolling one, [`rmc-toolkit`](https://github.com/runtime-module-composition/rmc-toolkit) implements everything below as `defineManifest()`, `createImportMap()`, `createRuntimeHost()`, and framework adapters — see [Getting Started](/getting-started/) and the [API Reference](/api-reference/).

## Goals

- Compose independently deployed frontend slices into one product experience.
- Keep shared runtime dependencies centralized and versioned in one import map.
- Preserve native ESM semantics in development and production.
- Allow each product slice to build, test, and deploy independently.
- Avoid duplicating framework dependencies such as React, routing, state, and UI libraries across slices.
- Keep local development close to production behavior.

## Core Idea

Runtime Module Composition has four moving parts:

1. A host shell owns the document, root React tree, global routing context, theme providers, navigation, and footer.
2. An import map defines where bare module specifiers resolve at runtime.
3. Feature slices build ESM outputs, usually as `*.mjs` files, and publish them to a static asset origin.
4. A runtime loader maps the current route to a module specifier and imports it dynamically.

The result is one user-facing application made from many independently owned modules.

```mermaid
flowchart LR
  Browser["Browser"] --> Shell["Host shell"]
  Shell --> ImportMap["Runtime import map"]
  Shell --> Router["Route resolver"]
  Router --> Loader["Dynamic module loader"]
  Loader --> Slice["Feature slice ESM module"]
  ImportMap --> Shared["Shared dependencies and app modules"]
  Slice --> Shared
```

## Runtime Request Flow

1. The browser requests the host application HTML.
2. The host HTML loads the import map script before the application entry module.
3. The import map registers shared dependency URLs and application module prefixes.
4. The host application boots its root providers: router, theme, locale, navigation, and shell layout.
5. The current route is converted into a module specifier.
6. The dynamic loader imports the resolved module specifier.
7. The browser resolves that specifier through the import map.
8. The remote ESM module is fetched, evaluated, and rendered inside the shell.

## Import Map Ownership

The import map is the runtime contract between independently deployed modules. It should be treated as product infrastructure, not as a convenience file.

It owns:

- framework versions, such as React and React DOM;
- shared state and routing dependencies;
- design system and UI package URLs;
- internal app module prefixes;
- static asset origins;
- exact-version dependency pinning;
- environment-specific URL behavior, such as development flags.

Example shape:

```js
{
  "imports": {
    "@esm.sh/react": "https://esm.sh/react@19.2.4",
    "@esm.sh/react-dom/client": "https://esm.sh/react-dom@19.2.4/client",
    "@acme/runtime": "https://assets.example.com/runtime/index.mjs",
    "@acme/ui": "https://assets.example.com/ui/index.mjs",
    "@acme/booking/": "https://assets.example.com/booking/"
  }
}
```

This allows a slice to import shared dependencies with stable bare specifiers:

```js
import React from "@esm.sh/react";
import { createRoot } from "@esm.sh/react-dom/client";
import { useTranslate } from "@acme/runtime";
```

The slice does not need to bundle these runtime dependencies. The browser resolves them from the shared import map.

### Escape Hatches

Namespace and route conventions should cover most slices without any per-slice configuration. Some dependencies and routes won't fit the convention — a shared library outside the CDN convention, a route that needs to point at a nonstandard specifier, a slice whose asset path doesn't match its route. Rather than special-casing the resolver or build config, keep these as small, explicit entries alongside the manifest:

- an exact-specifier override for a dependency that needs a specific URL instead of the namespace or external-dependency convention;
- an explicit slice definition (route, module specifier, entry path) for a slice that doesn't fit convention-based routing;
- an explicit route-to-specifier override for a route that should win over convention-based resolution.

Treat these as escape hatches, not the primary mechanism. If the list of overrides grows to rival the number of conventionally-resolved slices, that's a signal the convention itself needs to change instead.

## Host Shell Responsibilities

The host shell should stay thin but decisive. It owns the application shell and the runtime composition boundary.

Host responsibilities:

- serve the HTML document;
- load the import map before module execution;
- bootstrap the root application;
- initialize global providers;
- normalize locale-aware paths;
- own global navigation and persistent layout;
- resolve URLs to slice module specifiers;
- render loading and error boundaries around remote modules.

The host should not own feature-specific UI or business workflows. Those belong in slices.

Runtime Module Composition does not use iframes. Slices are native JavaScript modules imported into the same browser page and rendered inside the host application's component tree.

## Route-to-Module Resolution

Runtime Module Composition needs a deterministic way to decide which slice owns a route.

One practical pattern is namespace-based routing:

| Route prefix | Module specifier |
| --- | --- |
| `/page/...` | `@acme/page/index.mjs` |
| `/search/...` | `@acme/search/index.mjs` |
| `/booking/...` | `@acme/booking/index.mjs` |
| `/tickets/...` | `@acme/tickets/index.mjs` |

The route resolver should be small, predictable, and tested. It is part of the runtime contract.

Example:

```ts
export const getImportPath = ({ path, source }) => {
  const [namespace = "page"] = path.split("/").filter(Boolean);

  if (source === "local") {
    return "../src/index";
  }

  return `@acme/${namespace}/index.mjs`;
};
```

Production and local development can use the same resolver while returning different module specifiers.

Convention-based resolution should stay the default path. Reserve explicit route-to-specifier overrides for the routes that genuinely don't fit the namespace convention, and keep overrides small enough to audit at a glance — a resolver with more exceptions than conventions has stopped being a convention.

## Dynamic Module Loading

The dynamic loader imports the resolved module specifier and renders the default export.

Important loader behavior:

- use `import()` so slices are fetched on demand;
- preserve the module specifier so the import map can resolve it;
- use an error boundary for failed remote modules;
- show a lightweight loading state during fetch and evaluation;
- key the loaded module by resolved module path so route changes remount correctly when needed.

Example:

```jsx
const DynamicModuleLoader = ({ modulePath }) => {
  if (!modulePath) return null;

  const DynamicModule = React.lazy(async () => {
    return import(/* @vite-ignore */ modulePath);
  });

  return (
    <React.Suspense fallback={<LoadingState />}>
      <ErrorBoundary fallback={<NotFound modulePath={modulePath} />}>
        <DynamicModule />
      </ErrorBoundary>
    </React.Suspense>
  );
};
```

The `@vite-ignore` comment is important when using Vite because the module specifier is intentionally resolved by the browser import map at runtime.

A hand-rolled loader like this one has a sharp edge that's easy to miss: if a user navigates twice in quick succession, nothing guarantees the two `import()` calls resolve in the order they were requested. If the first (stale) one resolves *after* the second, it can silently overwrite the correct module — and since the overwritten module's cleanup never runs, anything it registered (listeners, timers, subscriptions) leaks. Guard against this with a sequence token: capture a per-call counter before each import, and discard the result if a newer call has started by the time it resolves. A ready-made loader that already does this is a reasonable thing to reach for instead of re-deriving it per host — [`createRuntimeHost()`](/api-reference/#createruntimehostoptions) is one example.

A second, unrelated sharp edge shows up specifically in a framework-aware loading helper (a hook, a composable, a boundary component) shipped as its own package rather than written inline in the host: if that helper package imports its framework directly (`import React from "react"`, `import * as Vue from "vue"`), it depends on the helper's own module resolution landing on the exact same framework instance the host app is already using. A different bundler, a different CDN-externalization convention, or the helper package itself being loaded from a CDN can all resolve that import to a second, separate copy of the framework — which silently breaks hooks, Context, or reactivity across the boundary between the two copies, since they're not really the same runtime. The structural fix is dependency injection rather than any import convention: have the helper export a factory that takes the framework instance as a parameter, and close every hook/composable it returns over that exact instance, so there's no import path left for the helper to get wrong. [`createReactAdapter()`](/api-reference/#createreactadapterreact) and [`createVueAdapter()`](/api-reference/#createvueadaptervue) are built this way.

## Slice Responsibilities

A slice is an independently owned frontend module. It should expose a stable entry point and assume the host provides global composition context.

Slice responsibilities:

- own feature-specific UI and state;
- publish ESM outputs;
- externalize shared runtime dependencies;
- avoid shipping duplicate React or shared UI libraries;
- integrate with shared runtime utilities through import-map specifiers;
- provide local development entry points;
- keep its public module entry stable.

Slices should not:

- mutate the global import map;
- bootstrap a second application root in production;
- bundle shared runtime dependencies already owned by the import map;
- assume they are the only application on the page.

## Build Configuration

Each slice should build as an ESM library.

Typical Vite production build:

```js
export default defineConfig({
  build: {
    outDir: "build/web-search",
    lib: {
      entry: ["src/index.tsx"],
      formats: ["es"],
      fileName: (_, entryName) => `${entryName}.mjs`
    },
    rollupOptions: {
      external: isExternal
    }
  }
});
```

The externalization rule is what keeps shared dependencies out of the slice bundle:

```js
export const isExternal = (moduleName) => {
  return [
    /^@esm\.sh/,
    /^@acme/
  ].some((pattern) => pattern.test(moduleName));
};
```

In mature implementations, this behavior should be centralized in shared tooling so slices do not invent their own dependency policy — a mode-aware config helper (dev-server port, the library-build `process.env.NODE_ENV` fix, entry auto-detection) paired with a manifest-driven externalization predicate, rather than every slice hand-copying `vite.config.ts`. [`defineSliceBuild()`](/api-reference/#defineslicebuildoptions) plus [`createRollupExternal()`](/api-reference/#createrollupexternalmanifest) is one example of that pairing.

## Dependency Policy

Runtime dependencies belong in the import map, not in each slice package.

Correct:

```js
import { create } from "@esm.sh/zustand";
import { Theme } from "@esm.sh/@radix-ui/themes";
```

Incorrect:

```json
{
  "dependencies": {
    "zustand": "^4.3.0",
    "@radix-ui/themes": "^3.0.0"
  }
}
```

Individual packages may still own development dependencies such as Vite, TypeScript, test tools, and deployment tooling.

## Local Development

Local development should preserve the same architecture:

- use the same host HTML template;
- inject the import map before local entry modules;
- externalize import-map-owned dependencies in Vite;
- allow local source entry points for the active slice;
- use development import-map URLs when needed.

This keeps the feedback loop fast while still testing the runtime composition model.

## Deployment Model

Each slice deploys static ESM assets to a stable asset origin.

Recommended deployment flow:

1. Build the slice as ESM.
2. Upload the build output to a versioned or stable asset path.
3. Update the import map when a public module URL changes.
4. Deploy the import map.
5. Deploy or invalidate the host shell if the composition contract changed.

For low-risk updates, a slice can often deploy independently if its public entry point remains stable.

### Standalone Import Map Delivery

Injecting the import map through the build's HTML transform works well when the host and the import map are built together. Some setups need the import map served as its own asset instead — a dev server proxying to a shared manifest, a host that isn't built with the same tool that generates the map, or a team that wants one import-map endpoint several local dev servers can point at.

In that shape, the import map is generated as a small bootstrap script (rather than inlined HTML) and served from its own path, such as `/js/importmap.js`. The script detects a dev-mode flag from its own `<script src>` at request time and appends it to relevant URLs, so the same served script can answer both a plain request and a dev-flagged one without the caller needing two separate assets. A local dev server can further override a single slice's origin in the served script — useful when one engineer is actively developing one slice locally against an otherwise-shared, deployed manifest.

The script must still land in `<head>` before any dependent module script runs, same as the inline-HTML approach — only the delivery mechanism changes, not the ordering constraint.

## Versioning Strategy

The import map is the coordination point for versions.

Use exact versions for core framework dependencies. Avoid unpinned `latest` URLs for critical runtime libraries because independently deployed slices need deterministic behavior.

Recommended rules:

- pin React, React DOM, router, state, and UI libraries;
- review import map changes like application infrastructure changes;
- test host and affected slices together when shared dependency versions change;
- keep rollback simple by preserving previous import map versions or asset paths.

## Failure Modes

Common failure modes and mitigations:

| Failure | Cause | Mitigation |
| --- | --- | --- |
| Remote module fails to load | Missing asset, bad import-map URL, CDN issue | Error boundary, asset health checks, rollback import map |
| Duplicate framework instance (hooks/Context/reactivity break) | Slice bundled the framework instead of externalizing it, *or* a published loading-helper package (hook/composable/boundary) imported the framework itself instead of receiving it from the host | Shared externalization helper and build checks for slices; dependency injection (factory takes the framework instance as a parameter) for published helper packages |
| Route loads wrong slice | Resolver rule drift | Unit tests for route-to-module mapping |
| Rapid navigation mounts the wrong (stale) module and leaks the discarded one's cleanup | Two `import()` calls race and resolve out of request order | Discard stale in-flight imports via a per-call sequence token instead of trusting resolution order |
| Local dev differs from production | Dev server rewrites bare imports | Import-map-aware Vite plugin and externalization |
| Breaking shared dependency upgrade | Import map changed without slice compatibility checks | Cross-slice smoke tests before release |

## Operational Checklist

Before adding a new slice:

- define its route namespace;
- add or confirm its import-map prefix;
- expose a stable ESM entry point;
- externalize import-map-owned dependencies;
- add a local development entry point;
- add route resolver tests;
- verify host loading, loading state, and error state;
- document ownership and deployment path;
- run manifest validation (checking origin URLs, namespace formatting, and override/entry shape) in CI so drift is caught before it ships.

Before changing a shared dependency:

- update the import map;
- confirm externalization still matches the import-map specifier;
- build affected slices;
- smoke test host navigation across affected routes;
- prepare rollback to the previous import map.

## Why This Strategy Works

Runtime Module Composition keeps the browser as the composition runtime. The host shell provides the stable product structure. The import map provides the dependency and module resolution contract. Slices remain independently owned and deployed, but they render as one coherent application because they share the same runtime graph.

The strategy is deliberately small: standard ESM, standard import maps, static assets, and dynamic imports. That makes it understandable, portable, and operationally friendly.
