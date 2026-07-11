---
title: Multi-Framework Demo
description: A working reference implementation composing React, Vue, and vanilla JS slices at runtime through import maps.
---

[`rmc-demo-architecture`](https://github.com/runtime-module-composition/rmc-demo-architecture) is a full, runnable reference implementation of the pattern described in [Getting Started](/getting-started/) — a real host shell composing three independently-built slices, each written in a different framework, entirely through import maps.

## What it proves

- **`rmc-shell`** — a React Router host that resolves routes to slices and mounts/unmounts them via [`createReactAdapter`](/api-reference/#createreactadapterreact).
- **`rmc-react-app`**, **`rmc-vue-app`**, **`rmc-vanilla-app`** — three independently-built slices, one per framework (React, Vue, and no framework at all), each built and deployed separately from the shell and from each other.
- **`rmc-manifest`** — the single shared manifest package every workspace imports, so the namespace, external dependency versions, and slice contract stay consistent across the whole system.
- **`rmc-index`** — a production-style static asset host, built with [`includeRuntimeImportMap()`](/api-reference/#includeruntimeimportmapoptions), matching how a real production deployment would generate and serve the import map.

This is the same shape as the production system `rmc-toolkit` was extracted from: an independently deployed host and slices, sharing dependencies through the browser's own module resolution rather than a bundler.

## Run it locally

```bash
git clone https://github.com/runtime-module-composition/rmc-demo-architecture.git
cd rmc-demo-architecture
npm install
npm start
```

This builds the three slices and starts all four servers together:

- `rmc-shell` — http://localhost:5304
- `rmc-react-app` — http://localhost:5301 (served by `vite preview`)
- `rmc-vue-app` — http://localhost:5302 (served by `vite preview`)
- `rmc-vanilla-app` — http://localhost:5303 (served by `vite preview`)

Visit `http://localhost:5304` and navigate between the React, Vue, and vanilla demo links to see each slice mount independently.
