---
title: Architecture Diagrams
description: How the five RMC Toolkit mechanisms converge in the browser — using one explicit route, specifier, URL, and mounted slice.
---

Every diagram uses the same running example: the browser is at `https://fastflights.com/search`, the application namespace is `@fastflights`, deployed slices live at `https://assets.fastflights.com`, and the active slice is named `search`.

The terminology stays deliberately consistent throughout:

- **URL path:** `/search`
- **resolved module specifier:** `@fastflights/search/index.mjs`
- **resolved module URL:** `https://assets.fastflights.com/search/index.mjs`
- **runtime module:** the evaluated module whose default export is mounted

## 1. The five RMC Toolkit mechanisms

The toolkit is held together by five mechanisms. They contribute different things — configuration, browser resolution, deployable ESM, runtime orchestration, and framework lifecycle integration — but they all converge in one browser document.

<div class="rmc-diagram rmc-diagram--wide">
<svg width="100%" viewBox="0 0 960 640" role="img">
<title>Five RMC Toolkit mechanisms converging in the browser</title>
<desc>Manifest, import-map, build, runtime composition, and framework bridge mechanisms feed specific layers of a browser that renders one composed FastFlights application.</desc>
<defs><marker id="overview-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>

<g class="c-gray">
  <rect x="350" y="20" width="260" height="76" rx="12"/>
  <text class="eyebrow" x="480" y="44" text-anchor="middle">MANIFEST CONTRACT</text>
  <text class="tm" x="480" y="69" text-anchor="middle">defineManifest(&#123; ... &#125;)</text>
</g>
<g class="c-teal">
  <rect x="20" y="170" width="250" height="86" rx="12"/>
  <text class="eyebrow" x="145" y="196" text-anchor="middle">IMPORT-MAP CONTRACT</text>
  <text class="tm" x="145" y="221" text-anchor="middle">key → remote source</text>
  <text class="ts" x="145" y="241" text-anchor="middle">Browser-native resolution</text>
</g>
<g class="c-gray">
  <rect x="20" y="386" width="250" height="86" rx="12"/>
  <text class="eyebrow" x="145" y="412" text-anchor="middle">BUILD CONTRACT</text>
  <text class="tm" x="145" y="437" text-anchor="middle">dist/search/index.mjs</text>
  <text class="ts" x="145" y="457" text-anchor="middle">ESM output + external imports</text>
</g>
<g class="c-teal">
  <rect x="690" y="170" width="250" height="86" rx="12"/>
  <text class="eyebrow" x="815" y="196" text-anchor="middle">RUNTIME COMPOSITION</text>
  <text class="tm" x="815" y="221" text-anchor="middle">resolveAndMount("/search")</text>
  <text class="ts" x="815" y="241" text-anchor="middle">Route → import → lifecycle</text>
</g>
<g class="c-teal">
  <rect x="690" y="386" width="250" height="86" rx="12"/>
  <text class="eyebrow" x="815" y="412" text-anchor="middle">FRAMEWORK BRIDGE</text>
  <text class="tm" x="815" y="437" text-anchor="middle">createReactAdapter(React)</text>
  <text class="ts" x="815" y="457" text-anchor="middle">Host lifecycle integration</text>
</g>

<line x1="480" y1="96" x2="480" y2="126" class="arr" marker-end="url(#overview-arrow)"/>
<line x1="270" y1="213" x2="310" y2="213" class="arr" marker-end="url(#overview-arrow)"/>
<line x1="270" y1="429" x2="310" y2="429" class="arr" marker-end="url(#overview-arrow)"/>
<line x1="690" y1="213" x2="650" y2="213" class="arr" marker-end="url(#overview-arrow)"/>
<line x1="690" y1="429" x2="650" y2="429" class="arr" marker-end="url(#overview-arrow)"/>

<g class="browser-shell">
  <rect x="310" y="126" width="340" height="450" rx="16"/>
  <rect class="browser-chrome" x="310" y="126" width="340" height="48" rx="16"/>
  <circle cx="330" cy="150" r="5"/><circle cx="347" cy="150" r="5"/><circle cx="364" cy="150" r="5"/>
  <rect class="address" x="382" y="138" width="250" height="24" rx="7"/>
  <text class="tm browser-muted" x="396" y="154">fastflights.com/search</text>

  <text class="eyebrow" x="334" y="204">DOCUMENT / HEAD</text>
  <rect class="browser-layer" x="330" y="216" width="300" height="58" rx="9"/>
  <text class="tm" x="480" y="240" text-anchor="middle">&lt;script type="importmap"&gt;</text>
  <text class="ts" x="480" y="260" text-anchor="middle">stable keys → remote module URLs</text>

  <text class="eyebrow" x="334" y="304">NATIVE MODULE GRAPH</text>
  <rect class="browser-layer" x="330" y="316" width="300" height="58" rx="9"/>
  <text class="tm" x="480" y="340" text-anchor="middle">import(match.specifier)</text>
  <text class="ts" x="480" y="360" text-anchor="middle">fetch + evaluate ESM</text>

  <text class="eyebrow" x="334" y="404">RUNTIME MOUNT BOUNDARY</text>
  <rect class="browser-layer" x="330" y="416" width="300" height="58" rx="9"/>
  <text class="tm" x="480" y="440" text-anchor="middle">runtimeModule.mount(target, context)</text>
  <text class="ts" x="480" y="460" text-anchor="middle">loading · ready · error · cleanup</text>

  <rect class="browser-result" x="330" y="500" width="300" height="52" rx="9"/>
  <text class="th" x="480" y="522" text-anchor="middle">One composed FastFlights application</text>
  <text class="ts" x="480" y="542" text-anchor="middle">Host shell + mounted Search slice</text>
</g>
</svg>
</div>

## 2. Manifest contract: derive the same module identity everywhere

`defineManifest()` is executable configuration shared by import-map generation, route resolution, and build externalization. Its value is not merely that fields live together; the same values derive the same module identity at every boundary.

**Involves:** `@rmc-toolkit/core` (`defineManifest`, `validateManifest`)

<div class="rmc-diagram">
<svg width="100%" viewBox="0 0 960 600" role="img">
<title>Manifest values derive matching module identifiers and URLs</title>
<desc>The namespace, slice name, entry file, and assets origin derive the resolved module specifier, remote module URL, and build artifact for the search slice.</desc>
<defs><marker id="manifest-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>

<g class="c-gray">
  <rect x="70" y="40" width="820" height="112" rx="12"/>
  <text class="eyebrow" x="100" y="68">MANIFEST INPUT</text>
  <text class="tm" x="100" y="94">defineManifest(&#123; namespace: "@fastflights",</text>
  <text class="tm" x="100" y="118">  assetsOrigin: "https://assets.fastflights.com", entryFile: "index.mjs" &#125;)</text>
  <text class="tm" x="100" y="140">sliceName = "search"</text>
</g>

<line x1="480" y1="152" x2="480" y2="195" class="arr" marker-end="url(#manifest-arrow)"/>
<text class="ts" x="500" y="180">same values, three derived contracts</text>

<g class="c-teal">
  <rect x="40" y="210" width="280" height="126" rx="12"/>
  <text class="eyebrow" x="180" y="238" text-anchor="middle">ROUTE / IMPORT IDENTITY</text>
  <text class="ts" x="180" y="265" text-anchor="middle">namespace + sliceName + entryFile</text>
  <text class="tm" x="180" y="294" text-anchor="middle">@fastflights/search/</text>
  <text class="tm" x="180" y="316" text-anchor="middle">index.mjs</text>
</g>
<g class="c-teal">
  <rect x="340" y="210" width="280" height="126" rx="12"/>
  <text class="eyebrow" x="480" y="238" text-anchor="middle">REMOTE MODULE URL</text>
  <text class="ts" x="480" y="265" text-anchor="middle">assetsOrigin + sliceName + entryFile</text>
  <text class="tm" x="480" y="294" text-anchor="middle">https://assets.fastflights.com/</text>
  <text class="tm" x="480" y="316" text-anchor="middle">search/index.mjs</text>
</g>
<g class="c-gray">
  <rect x="640" y="210" width="280" height="126" rx="12"/>
  <text class="eyebrow" x="780" y="238" text-anchor="middle">SLICE BUILD ARTIFACT</text>
  <text class="ts" x="780" y="265" text-anchor="middle">dist + sliceName + entryFile</text>
  <text class="tm" x="780" y="305" text-anchor="middle">dist/search/index.mjs</text>
</g>

<line x1="180" y1="336" x2="420" y2="420" class="arr" marker-end="url(#manifest-arrow)"/>
<line x1="480" y1="336" x2="480" y2="420" class="arr" marker-end="url(#manifest-arrow)"/>
<line x1="780" y1="336" x2="540" y2="420" class="arr" marker-end="url(#manifest-arrow)"/>

<g class="c-teal">
  <rect x="250" y="420" width="460" height="100" rx="12"/>
  <text class="eyebrow" x="480" y="450" text-anchor="middle">PROTECTED INVARIANT</text>
  <text class="th" x="480" y="480" text-anchor="middle">The specifier, deployed URL, and build path agree</text>
  <text class="ts" x="480" y="504" text-anchor="middle">Changing a shared manifest value updates every derived contract</text>
</g>
</svg>
</div>

## 3. Import-map contract: module specifier to module URL

The browser receives an import map before any dependent module executes. Application modules use a prefix mapping; external dependencies use exact, version-pinned mappings.

**Involves:** `@rmc-toolkit/core` (`createImportMap`, `resolveImportMapSpecifier`), `@rmc-toolkit/vite` (`runtimeComposition`, `includeRuntimeImportMap`)

<div class="rmc-diagram">
<svg width="100%" viewBox="0 0 960 650" role="img">
<title>Import-map prefix and exact-key resolution</title>
<desc>The application prefix @fastflights maps to the asset origin and resolves the search module specifier, while the exact dependency key @esm.sh/react maps to a pinned esm.sh URL.</desc>
<defs><marker id="map-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>

<g class="c-gray">
  <rect x="100" y="30" width="760" height="108" rx="12"/>
  <text class="eyebrow" x="130" y="58">BROWSER DOCUMENT / &lt;HEAD&gt;</text>
  <text class="tm" x="130" y="84">&lt;script type="importmap"&gt;</text>
  <text class="tm" x="130" y="110">&#123; "imports": &#123; "@fastflights/": "https://assets.fastflights.com/", ... &#125; &#125;</text>
</g>

<text class="eyebrow" x="235" y="185" text-anchor="middle">APPLICATION PREFIX MAPPING</text>
<g class="c-gray">
  <rect x="40" y="205" width="390" height="76" rx="10"/>
  <text class="tm" x="235" y="235" text-anchor="middle">import("@fastflights/search/index.mjs")</text>
  <text class="ts" x="235" y="259" text-anchor="middle">module specifier passed unchanged to import()</text>
</g>
<line x1="235" y1="281" x2="235" y2="325" class="arr" marker-end="url(#map-arrow)"/>
<g class="c-teal">
  <rect x="40" y="325" width="390" height="104" rx="10"/>
  <text class="tm" x="235" y="354" text-anchor="middle">"@fastflights/"</text>
  <text class="ts" x="235" y="377" text-anchor="middle">+ remainder: "search/index.mjs"</text>
  <text class="tm" x="235" y="405" text-anchor="middle">https://assets.fastflights.com/search/index.mjs</text>
</g>

<text class="eyebrow" x="725" y="185" text-anchor="middle">EXACT DEPENDENCY MAPPING</text>
<g class="c-gray">
  <rect x="530" y="205" width="390" height="76" rx="10"/>
  <text class="tm" x="725" y="235" text-anchor="middle">import React from "@esm.sh/react"</text>
  <text class="ts" x="725" y="259" text-anchor="middle">stable dependency specifier</text>
</g>
<line x1="725" y1="281" x2="725" y2="325" class="arr" marker-end="url(#map-arrow)"/>
<g class="c-teal">
  <rect x="530" y="325" width="390" height="104" rx="10"/>
  <text class="tm" x="725" y="354" text-anchor="middle">"@esm.sh/react"</text>
  <text class="ts" x="725" y="377" text-anchor="middle">exact key — version stays out of application code</text>
  <text class="tm" x="725" y="405" text-anchor="middle">https://esm.sh/react@19.2.7</text>
</g>

<line x1="235" y1="429" x2="420" y2="510" class="arr" marker-end="url(#map-arrow)"/>
<line x1="725" y1="429" x2="540" y2="510" class="arr" marker-end="url(#map-arrow)"/>
<g class="browser-shell">
  <rect x="300" y="510" width="360" height="104" rx="14"/>
  <rect class="browser-chrome" x="300" y="510" width="360" height="34" rx="14"/>
  <text class="eyebrow" x="480" y="570" text-anchor="middle">BROWSER MODULE GRAPH</text>
  <text class="th" x="480" y="594" text-anchor="middle">One resolved Search module · one resolved React module</text>
</g>
</svg>
</div>

## 4. Build contract: emit the path and preserve browser-owned imports

The slice build has two responsibilities: produce the ESM artifact at the path the runtime contract expects, and leave manifest-owned specifiers untouched for the browser to resolve.

**Involves:** `@rmc-toolkit/vite` (`defineSliceBuild`, `createRollupExternal`)

<div class="rmc-diagram">
<svg width="100%" viewBox="0 0 960 650" role="img">
<title>Slice build output and dependency externalization</title>
<desc>defineSliceBuild emits dist/search/index.mjs, while createRollupExternal preserves the @esm.sh/react import in that artifact for the browser import map.</desc>
<defs><marker id="build-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>

<text class="eyebrow" x="245" y="48" text-anchor="middle">ARTIFACT PATH</text>
<g class="c-gray">
  <rect x="40" y="66" width="410" height="80" rx="10"/>
  <text class="tm" x="245" y="98" text-anchor="middle">defineSliceBuild(&#123; sliceName: "search" &#125;)</text>
  <text class="ts" x="245" y="123" text-anchor="middle">Vite library build · ESM format</text>
</g>
<line x1="245" y1="146" x2="245" y2="190" class="arr" marker-end="url(#build-arrow)"/>
<g class="c-gray">
  <rect x="40" y="190" width="410" height="94" rx="10"/>
  <text class="tm" x="245" y="220" text-anchor="middle">outDir: "dist/search"</text>
  <text class="tm" x="245" y="246" text-anchor="middle">fileName: () =&gt; "index.mjs"</text>
  <text class="th" x="245" y="270" text-anchor="middle">→ dist/search/index.mjs</text>
</g>

<text class="eyebrow" x="715" y="48" text-anchor="middle">DEPENDENCY EXTERNALIZATION</text>
<g class="c-gray">
  <rect x="510" y="66" width="410" height="80" rx="10"/>
  <text class="tm" x="715" y="98" text-anchor="middle">import React from "@esm.sh/react"</text>
  <text class="ts" x="715" y="123" text-anchor="middle">source import encountered by Rollup</text>
</g>
<line x1="715" y1="146" x2="715" y2="190" class="arr" marker-end="url(#build-arrow)"/>
<g class="c-teal">
  <rect x="510" y="190" width="410" height="94" rx="10"/>
  <text class="tm" x="715" y="220" text-anchor="middle">createRollupExternal(manifest)</text>
  <text class="tm" x="715" y="246" text-anchor="middle">("@esm.sh/react") → true</text>
  <text class="th" x="715" y="270" text-anchor="middle">→ import stays in the emitted ESM</text>
</g>

<line x1="245" y1="284" x2="420" y2="370" class="arr" marker-end="url(#build-arrow)"/>
<line x1="715" y1="284" x2="540" y2="370" class="arr" marker-end="url(#build-arrow)"/>
<g class="c-teal">
  <rect x="230" y="370" width="500" height="112" rx="12"/>
  <text class="eyebrow" x="480" y="400" text-anchor="middle">DEPLOYED SLICE ESM</text>
  <text class="tm" x="480" y="428" text-anchor="middle">https://assets.fastflights.com/search/index.mjs</text>
  <text class="ts" x="480" y="454" text-anchor="middle">contains import React from "@esm.sh/react"</text>
</g>
<line x1="480" y1="482" x2="480" y2="528" class="arr" marker-end="url(#build-arrow)"/>
<g class="browser-shell">
  <rect x="300" y="528" width="360" height="86" rx="14"/>
  <text class="eyebrow" x="480" y="560" text-anchor="middle">BROWSER-IMPORTABLE MODULE</text>
  <text class="th" x="480" y="588" text-anchor="middle">Matching asset path · shared React resolved once</text>
</g>
</svg>
</div>

## 5. Runtime composition: URL path to mounted runtime module

`createRuntimeHost()` owns this entire lifecycle. The expanded flow below keeps each value named consistently: the route resolver returns a **module specifier**, `import()` passes that same specifier to the browser, and the browser resolves it to a **module URL**.

**Involves:** `@rmc-toolkit/core` (`resolveRoute`, `createRuntimeHost`, `importModule`, `unwrapDefault`)

<div class="rmc-diagram">
<svg width="100%" viewBox="0 0 960 900" role="img">
<title>Explicit runtime flow from URL path to mounted module</title>
<desc>The URL path search is resolved to the module specifier @fastflights/search/index.mjs. Dynamic import passes that specifier to the browser, which resolves it through the import map to the asset URL, fetches and evaluates it, unwraps the runtime module, and mounts it into the target.</desc>
<defs><marker id="runtime-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>

<g class="c-gray"><rect x="130" y="30" width="700" height="76" rx="11"/><text class="eyebrow" x="160" y="56">URL PATH</text><text class="tm" x="160" y="84">"/search"</text></g>
<line x1="480" y1="106" x2="480" y2="138" class="arr" marker-end="url(#runtime-arrow)"/>

<g class="c-gray"><rect x="130" y="138" width="700" height="88" rx="11"/><text class="eyebrow" x="160" y="164">ROUTE RESOLUTION</text><text class="tm" x="160" y="194">const match = resolveRoute(manifest, "/search")</text><text class="ts" x="160" y="214">Returns a RuntimeRouteMatch — not a URL</text></g>
<line x1="480" y1="226" x2="480" y2="258" class="arr" marker-end="url(#runtime-arrow)"/>

<g class="c-teal"><rect x="130" y="258" width="700" height="88" rx="11"/><text class="eyebrow" x="160" y="284">RESOLVED MODULE SPECIFIER</text><text class="tm" x="160" y="316">match.specifier = "@fastflights/search/index.mjs"</text><text class="ts" x="160" y="336">This exact string is passed unchanged to import()</text></g>
<line x1="480" y1="346" x2="480" y2="378" class="arr" marker-end="url(#runtime-arrow)"/>

<g class="c-teal"><rect x="130" y="378" width="700" height="76" rx="11"/><text class="eyebrow" x="160" y="404">DYNAMIC IMPORT</text><text class="tm" x="160" y="432">const moduleNamespace = await import(match.specifier)</text></g>
<line x1="480" y1="454" x2="480" y2="486" class="arr" marker-end="url(#runtime-arrow)"/>

<g class="c-teal"><rect x="130" y="486" width="700" height="100" rx="11"/><text class="eyebrow" x="160" y="512">BROWSER IMPORT-MAP RESOLUTION</text><text class="tm" x="160" y="542">"@fastflights/" → "https://assets.fastflights.com/"</text><text class="tm" x="160" y="568">+ remainder: "search/index.mjs"</text></g>
<line x1="480" y1="586" x2="480" y2="618" class="arr" marker-end="url(#runtime-arrow)"/>

<g class="c-teal"><rect x="130" y="618" width="700" height="88" rx="11"/><text class="eyebrow" x="160" y="644">RESOLVED MODULE URL</text><text class="tm" x="160" y="674">https://assets.fastflights.com/search/index.mjs</text><text class="ts" x="160" y="694">Browser fetches and evaluates this ESM resource</text></g>
<line x1="480" y1="706" x2="480" y2="738" class="arr" marker-end="url(#runtime-arrow)"/>

<g class="c-gray"><rect x="130" y="738" width="700" height="64" rx="11"/><text class="eyebrow" x="160" y="764">RUNTIME MODULE</text><text class="tm" x="160" y="788">const runtimeModule = moduleNamespace.default</text></g>
<line x1="480" y1="802" x2="480" y2="834" class="arr" marker-end="url(#runtime-arrow)"/>

<g class="c-teal"><rect x="130" y="834" width="700" height="56" rx="11"/><text class="eyebrow" x="160" y="858">MOUNT</text><text class="tm" x="300" y="858">await runtimeModule.mount(target, &#123; route: match, manifest &#125;)</text></g>
</svg>
</div>

The public API intentionally collapses that expanded implementation into one operation:

```js
const host = createRuntimeHost({ manifest, target });
await host.resolveAndMount("/search");
```

It also prevents a stale import from winning after a later navigation, reports `loading` / `ready` / `error`, and calls the mounted module's cleanup before replacing it.

## 6. Framework bridge: connect runtime state to host UI

The framework adapters do not change module resolution. They connect `createRuntimeHost()` to a host framework's lifecycle and reactive state. RMC Toolkit supports two distinct React integration models; they should not be conflated.

**Involves:** `@rmc-toolkit/react` (`createReactAdapter`, `createDynamicModuleBoundary`), `@rmc-toolkit/vue` (`createVueAdapter`)

<div class="rmc-diagram">
<svg width="100%" viewBox="0 0 960 670" role="img">
<title>Framework bridge integration models</title>
<desc>The DOM lifecycle adapters connect a framework host to a target element and mount-unmount runtime modules. The React DynamicModuleBoundary instead renders a default-exported React component directly inside the host React tree.</desc>
<defs><marker id="framework-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>

<text class="eyebrow" x="245" y="48" text-anchor="middle">DOM LIFECYCLE MODEL</text>
<g class="c-gray"><rect x="40" y="66" width="410" height="100" rx="11"/><text class="tm" x="65" y="98">const &#123; useRuntimeHost &#125; =</text><text class="tm" x="65" y="122">  createReactAdapter(React)</text><text class="ts" x="65" y="148">Vue uses createVueAdapter(Vue) with the same runtime host</text></g>
<line x1="245" y1="166" x2="245" y2="202" class="arr" marker-end="url(#framework-arrow)"/>
<g class="c-teal"><rect x="40" y="202" width="410" height="112" rx="11"/><text class="tm" x="65" y="234">const &#123; ref, status &#125; =</text><text class="tm" x="65" y="258">  useRuntimeHost(path, &#123; manifest &#125;)</text><text class="tm" x="65" y="286">&lt;main ref=&#123;ref&#125; /&gt;</text><text class="ts" x="65" y="304">status: idle · loading · ready · error</text></g>
<line x1="245" y1="314" x2="245" y2="350" class="arr" marker-end="url(#framework-arrow)"/>
<g class="c-teal"><rect x="40" y="350" width="410" height="92" rx="11"/><text class="eyebrow" x="65" y="378">RUNTIME MODULE CONTRACT</text><text class="tm" x="65" y="408">mount(target, context) · unmount()</text><text class="ts" x="65" y="430">Host controls the target and observes lifecycle state</text></g>

<text class="eyebrow" x="715" y="48" text-anchor="middle">REACT COMPONENT MODEL</text>
<g class="c-gray"><rect x="510" y="66" width="410" height="100" rx="11"/><text class="tm" x="535" y="98">const &#123; DynamicModuleBoundary &#125; =</text><text class="tm" x="535" y="122">  createDynamicModuleBoundary(React)</text><text class="ts" x="535" y="148">Factory closes over the host's existing React instance</text></g>
<line x1="715" y1="166" x2="715" y2="202" class="arr" marker-end="url(#framework-arrow)"/>
<g class="c-teal"><rect x="510" y="202" width="410" height="112" rx="11"/><text class="tm" x="535" y="234">&lt;DynamicModuleBoundary</text><text class="tm" x="535" y="258">  specifier=&#123;match.specifier&#125;</text><text class="tm" x="535" y="282">  context=&#123;&#123; route: match, manifest &#125;&#125; /&gt;</text><text class="ts" x="535" y="304">React.lazy + Suspense + error boundary</text></g>
<line x1="715" y1="314" x2="715" y2="350" class="arr" marker-end="url(#framework-arrow)"/>
<g class="c-teal"><rect x="510" y="350" width="410" height="92" rx="11"/><text class="eyebrow" x="535" y="378">COMPONENT EXPORT CONTRACT</text><text class="tm" x="535" y="408">export default function SearchSlice()</text><text class="ts" x="535" y="430">Rendered directly inside the host React tree</text></g>

<line x1="245" y1="442" x2="420" y2="510" class="arr" marker-end="url(#framework-arrow)"/>
<line x1="715" y1="442" x2="540" y2="510" class="arr" marker-end="url(#framework-arrow)"/>
<g class="browser-shell"><rect x="290" y="510" width="380" height="120" rx="14"/><rect class="browser-chrome" x="290" y="510" width="380" height="34" rx="14"/><text class="eyebrow" x="480" y="574" text-anchor="middle">SHARED ARCHITECTURAL OUTCOME</text><text class="th" x="480" y="600" text-anchor="middle">One browser document · one shared module graph</text><text class="ts" x="480" y="620" text-anchor="middle">A host-controlled composition boundary with explicit lifecycle</text></g>
</svg>
</div>

## 7. Browser-rendered outcome

The mechanisms disappear into the final product. The browser owns native module resolution and one JavaScript module graph; the host owns the document and composition boundary; the resolved slice contributes the active feature experience.

<div class="rmc-diagram rmc-diagram--wide">
<svg width="100%" viewBox="0 0 960 600" role="img">
<title>Final browser-rendered FastFlights application</title>
<desc>The browser document contains an import map, host shell, shared module graph, runtime mount boundary, and rendered Search slice, producing one coherent FastFlights application.</desc>
<g class="browser-shell">
  <rect x="120" y="36" width="720" height="520" rx="18"/>
  <rect class="browser-chrome" x="120" y="36" width="720" height="58" rx="18"/>
  <circle cx="146" cy="65" r="6"/><circle cx="166" cy="65" r="6"/><circle cx="186" cy="65" r="6"/>
  <rect class="address" x="214" y="50" width="600" height="30" rx="8"/>
  <text class="tm browser-muted" x="232" y="70">https://fastflights.com/search</text>

  <rect class="browser-host" x="120" y="94" width="720" height="62"/>
  <text class="th" x="150" y="132">FastFlights</text>
  <text class="eyebrow" x="810" y="132" text-anchor="end">HOST SHELL · ROUTER · PROVIDERS</text>

  <rect class="browser-layer" x="150" y="180" width="660" height="58" rx="10"/>
  <text class="eyebrow" x="174" y="204">BROWSER MODULE RESOLUTION</text>
  <text class="tm" x="174" y="226">@fastflights/search/index.mjs → https://assets.fastflights.com/search/index.mjs</text>

  <rect class="browser-layer" x="150" y="258" width="660" height="58" rx="10"/>
  <text class="eyebrow" x="174" y="282">SHARED MODULE GRAPH</text>
  <text class="tm" x="174" y="304">@esm.sh/react → https://esm.sh/react@19.2.7</text>

  <rect class="browser-result" x="150" y="340" width="660" height="176" rx="12"/>
  <text class="eyebrow" x="174" y="370">RUNTIME MOUNT TARGET</text>
  <text class="th" x="174" y="404">Search flights</text>
  <rect class="browser-input" x="174" y="424" width="190" height="56" rx="8"/>
  <rect class="browser-input" x="378" y="424" width="190" height="56" rx="8"/>
  <rect class="browser-button" x="582" y="424" width="204" height="56" rx="8"/>
  <text class="ts" x="192" y="447">From</text><text class="th" x="192" y="468">Toronto · YYZ</text>
  <text class="ts" x="396" y="447">To</text><text class="th" x="396" y="468">Vancouver · YVR</text>
  <text class="th" x="684" y="457" text-anchor="middle">Search flights</text>
</g>
</svg>
</div>

The user sees one application. The architecture remains independently buildable and deployable because the contracts between its parts are explicit: manifest values, module specifiers, import-map entries, ESM output paths, runtime lifecycle, and framework integration.
