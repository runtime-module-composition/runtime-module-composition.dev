---
title: "Advanced: No Manifest Host"
description: What works and what doesn't when a host skips the manifest entirely.
---

A [No Manifest Host](/glossary/#no-manifest-host) loads one known module directly — a hand-rolled import map entry, or a direct URL import — instead of adopting a [manifest](/glossary/#manifest) and resolving routes against it. There's no `defineManifest()`, no `resolveRoute()`, no `createImportMap()`. The host just names, once, where the one module it cares about lives.

This page is the honest accounting of what that buys you, and what it doesn't.

## What works today

[Module Boundary](/glossary/#module-boundary) — either export style, Direct or Injected — works with no manifest involved. [Decoupling a Slice from an Existing App](/quick-start/module-boundary/existing-app/) is the complete worked example: a host with a hardcoded `<script type="importmap">` entry pointing one specifier at one URL, and a boundary wrapper (`createInjectedModuleBoundary` in that guide, but `createDynamicModuleBoundary` for Direct works the same way) that imports it. No manifest object exists anywhere in that host's code. This isn't a reduced or unsupported mode of Module Boundary — it's the same `createDynamicModuleBoundary`/`createInjectedModuleBoundary` factories a Manifest Host uses, pointed at a specifier the host wrote by hand instead of one a manifest generated.

## The gap: No Manifest Host + Independent Mount isn't implemented

[Independent Mount](/glossary/#independent-mount) has no No Manifest Host path. `createRuntimeHost()`'s options type is:

```ts
export type RuntimeHostOptions = {
  manifest: RuntimeCompositionManifest;
  target: Element;
  onLoading?: (path: string) => void;
  onReady?: (path: string) => void;
  onError?: (error: unknown, path: string) => void;
  importer?: DynamicImporter;
};
```

`manifest` is required, typed as a full `RuntimeCompositionManifest` — not optional, not a narrower single-slice shape. There's no manifest-free constructor, and no lower-level primitive that gets you mount/unmount lifecycle management (stale-navigation discarding, `onLoading`/`onReady`/`onError`) without one. `createRuntimeHostObservable()` takes the same required `manifest` field, so the adapters built on it — `createReactAdapter()`, `createVueAdapter()` — inherit the same requirement.

**The workaround:** adopt a Manifest Host with a manifest that routes exactly one slice. A one-entry `externalDeps` list and a single `namespace` segment is a complete, valid `RuntimeCompositionManifest` — nothing requires a manifest to describe more than one slice. See [Quick Start: Independent Mount](/quick-start/independent-mount/) for the full setup; the manifest it walks through scales down to one slice without any change in shape.

## The other gap: Module Boundary — Direct has no Vue equivalent

Independent of the manifest question: [Module Boundary — Direct](/quick-start/module-boundary/direct/) (`createDynamicModuleBoundary`) is React-only. There is no `@rmc-toolkit/vue` function that takes a plain default-exported Vue component the way `createDynamicModuleBoundary` takes a plain default-exported React component. This holds with or without a manifest — it's a gap in the Direct convention itself, not something No Manifest Host specifically triggers.

**The workaround:** [Module Boundary — Injected](/quick-start/module-boundary/injected/) (`createInjectedModuleBoundary`) supports both React and Vue, with or without a manifest. A Vue slice that needs to render inside a host's own component tree uses Injected's default-exported-factory convention instead of Direct's default-exported-component convention.

## These are gaps, not a roadmap

Nothing above is "coming soon." No Manifest Host + Independent Mount and Module Boundary Direct for Vue are both things the toolkit doesn't do today, with no committed timeline to add either. The workarounds above — a one-slice manifest, or Injected instead of Direct — aren't stopgaps pending a future release; they're the actual, complete way to get the equivalent result with what exists right now.
