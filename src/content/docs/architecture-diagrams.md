---
title: Architecture Diagrams
description: Visual walkthroughs of how the manifest, the host, and a slice connect — built around one worked example.
---

Every diagram on this page uses the same running example: a namespace of `@fastflights`, a host at `https://fastflights.com`, an asset origin at `https://assets.fastflights.com`, and one slice named `search`. See the [Glossary](/glossary/) for what any individual term means.

## 1. Manifest Fan-out

The `@fastflights` manifest is the one object every other part of the toolkit reads from. This shows its three consumers: import map generation for external dependencies, import map generation for slice routing, and the Vite plugins that inject and enforce both.

**Involves:** `@rmc-toolkit/core` (`defineManifest`, `createImportMap`), `@rmc-toolkit/vite` (`runtimeComposition`)

<div class="rmc-diagram">
<svg width="100%" viewBox="0 0 680 252" role="img">
<title>Diagram 1: Manifest Fan-out</title>
<desc>The @fastflights manifest fans out to import map generation for external dependencies, import map generation for slice routing, and Vite plugin configuration.</desc>
<defs><marker id="arrow1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
<g class="c-gray">
<rect x="220" y="40" width="240" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="58" text-anchor="middle" dominant-baseline="central">Manifest</text>
<text class="ts" x="340" y="76" text-anchor="middle" dominant-baseline="central">namespace: @fastflights</text>
</g>
<line x1="300" y1="96" x2="140" y2="156" class="arr" marker-end="url(#arrow1)"/>
<line x1="340" y1="96" x2="340" y2="156" class="arr" marker-end="url(#arrow1)"/>
<line x1="380" y1="96" x2="540" y2="156" class="arr" marker-end="url(#arrow1)"/>
<g class="c-teal">
<rect x="50" y="156" width="180" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="140" y="174" text-anchor="middle" dominant-baseline="central">External deps</text>
<text class="ts" x="140" y="192" text-anchor="middle" dominant-baseline="central">esm.sh/react@19.2.7</text>
</g>
<g class="c-teal">
<rect x="250" y="156" width="180" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="174" text-anchor="middle" dominant-baseline="central">Slice routing</text>
<text class="ts" x="340" y="192" text-anchor="middle" dominant-baseline="central">@fastflights/search/*</text>
</g>
<g class="c-teal">
<rect x="450" y="156" width="180" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="540" y="174" text-anchor="middle" dominant-baseline="central">Vite plugins</text>
<text class="ts" x="540" y="192" text-anchor="middle" dominant-baseline="central">inject + externalize</text>
</g>
</svg>
</div>

## 1b. External Dependencies Detail

Traces one branch of Diagram 1 — external dependencies — from manifest field all the way to the import statement a slice actually writes. The origin, the namespace prefix, and each package name assemble into an import map entry; that exact entry is what a slice's own import has to match.

**Involves:** `@rmc-toolkit/core` (`createImportMap`, the `externalDeps` and `externalDepsPrefix` manifest fields)

<div class="rmc-diagram">
<svg width="100%" viewBox="0 0 680 634" role="img">
<title>Diagram 1b: External Dependencies Detail</title>
<desc>The external deps origin https://esm.sh/ combines with the namespace prefix @esm/ and three package names, react, ramda, and react-dom, to produce three matching import map entries. A slice then imports through one of those prefixed specifiers, for example import React from "@esm/react".</desc>
<defs><marker id="arrow1b" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
<g class="c-gray">
<rect x="180" y="40" width="320" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="58" text-anchor="middle" dominant-baseline="central">External deps origin</text>
<text class="ts" x="340" y="76" text-anchor="middle" dominant-baseline="central">https://esm.sh/</text>
</g>
<line x1="340" y1="96" x2="340" y2="156" class="arr" marker-end="url(#arrow1b)"/>
<g class="c-gray">
<rect x="180" y="156" width="320" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="174" text-anchor="middle" dominant-baseline="central">Namespace prefix</text>
<text class="ts" x="340" y="192" text-anchor="middle" dominant-baseline="central">@esm/</text>
</g>
<line x1="340" y1="212" x2="340" y2="272" class="arr" marker-end="url(#arrow1b)"/>
<g class="c-gray">
<rect x="180" y="272" width="320" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="290" text-anchor="middle" dominant-baseline="central">Dependency packages</text>
<text class="ts" x="340" y="308" text-anchor="middle" dominant-baseline="central">react, ramda, react-dom</text>
</g>
<line x1="340" y1="328" x2="340" y2="388" class="arr" marker-end="url(#arrow1b)"/>
<g class="c-teal">
<rect x="150" y="388" width="380" height="90" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="406" text-anchor="middle" dominant-baseline="central">Import map entries</text>
<text class="ts" x="340" y="426" text-anchor="middle" dominant-baseline="central">"@esm/react": "https://esm.sh/react"</text>
<text class="ts" x="340" y="442" text-anchor="middle" dominant-baseline="central">"@esm/ramda": "https://esm.sh/ramda"</text>
<text class="ts" x="340" y="458" text-anchor="middle" dominant-baseline="central">"@esm/react-dom": "https://esm.sh/react-dom"</text>
</g>
<line x1="340" y1="478" x2="340" y2="538" class="arr" marker-end="url(#arrow1b)"/>
<g class="c-teal">
<rect x="180" y="538" width="320" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="556" text-anchor="middle" dominant-baseline="central">Usage in a slice</text>
<text class="ts" x="340" y="574" text-anchor="middle" dominant-baseline="central">import React from "@esm/react"</text>
</g>
</svg>
</div>

## 1c. Import Exclusion Detail

Traces the second branch of Diagram 1 — the Vite plugins — for the exclusion half specifically. `createRollupExternal()` checks every import a slice's build encounters against the manifest: anything the manifest owns is left for the browser to resolve; anything else gets bundled normally, same as any other Vite project.

**Involves:** `@rmc-toolkit/vite` (`createRollupExternal`), `@rmc-toolkit/core` (`createExternalMatcher`)

<div class="rmc-diagram">
<svg width="100%" viewBox="0 0 680 368" role="img">
<title>Diagram 1c: Import Exclusion Detail</title>
<desc>createRollupExternal checks every import specifier against the manifest. A specifier matching the namespace or external deps prefix, like @esm/react, is marked external: true so the browser resolves it instead. A specifier that doesn't match, like a local ./Button import, is bundled into the output normally.</desc>
<defs><marker id="arrow1c" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
<g class="c-gray">
<rect x="180" y="40" width="320" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="58" text-anchor="middle" dominant-baseline="central">createRollupExternal()</text>
<text class="ts" x="340" y="76" text-anchor="middle" dominant-baseline="central">checks every import specifier</text>
</g>
<line x1="340" y1="96" x2="340" y2="156" class="arr" marker-end="url(#arrow1c)"/>
<g class="c-gray">
<rect x="180" y="156" width="320" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="174" text-anchor="middle" dominant-baseline="central">Specifier check</text>
<text class="ts" x="340" y="192" text-anchor="middle" dominant-baseline="central">"@esm/react" vs "./Button"</text>
</g>
<line x1="260" y1="212" x2="190" y2="272" class="arr" marker-end="url(#arrow1c)"/>
<line x1="420" y1="212" x2="490" y2="272" class="arr" marker-end="url(#arrow1c)"/>
<g class="c-teal">
<rect x="50" y="272" width="280" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="190" y="290" text-anchor="middle" dominant-baseline="central">Matches the convention</text>
<text class="ts" x="190" y="308" text-anchor="middle" dominant-baseline="central">"@esm/react" → external: true</text>
</g>
<g class="c-gray">
<rect x="350" y="272" width="280" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="490" y="290" text-anchor="middle" dominant-baseline="central">Local module</text>
<text class="ts" x="490" y="308" text-anchor="middle" dominant-baseline="central">"./Button" → bundled normally</text>
</g>
</svg>
</div>

## 1d. Slice Build Targeting Detail

Traces the other half of the Vite plugins branch: how a slice's own build gets aimed at the exact file path its namespace expects. `sliceName` flows from `defineSliceBuild()` through Vite's library-build config to a fixed output path — the same path the naming convention in Diagram 2 depends on matching.

**Involves:** `@rmc-toolkit/vite` (`defineSliceBuild`)

<div class="rmc-diagram">
<svg width="100%" viewBox="0 0 680 600" role="img">
<title>Diagram 1d: Slice Build Targeting Detail</title>
<desc>defineSliceBuild takes a sliceName of search, which sets Vite's build.lib fileName to index.mjs and the output directory to dist/search, producing the build artifact dist/search/index.mjs. That is the exact same path the import map expects for this slice.</desc>
<defs><marker id="arrow1d" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
<g class="c-gray">
<rect x="180" y="40" width="320" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="58" text-anchor="middle" dominant-baseline="central">defineSliceBuild()</text>
<text class="ts" x="340" y="76" text-anchor="middle" dominant-baseline="central">sliceName: "search"</text>
</g>
<line x1="340" y1="96" x2="340" y2="156" class="arr" marker-end="url(#arrow1d)"/>
<g class="c-gray">
<rect x="180" y="156" width="320" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="174" text-anchor="middle" dominant-baseline="central">Vite build.lib config</text>
<text class="ts" x="340" y="192" text-anchor="middle" dominant-baseline="central">fileName: () =&gt; "index.mjs"</text>
</g>
<line x1="340" y1="212" x2="340" y2="272" class="arr" marker-end="url(#arrow1d)"/>
<g class="c-gray">
<rect x="180" y="272" width="320" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="290" text-anchor="middle" dominant-baseline="central">Output directory</text>
<text class="ts" x="340" y="308" text-anchor="middle" dominant-baseline="central">outDir: "dist/search"</text>
</g>
<line x1="340" y1="328" x2="340" y2="388" class="arr" marker-end="url(#arrow1d)"/>
<g class="c-gray">
<rect x="180" y="388" width="320" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="406" text-anchor="middle" dominant-baseline="central">Build artifact</text>
<text class="ts" x="340" y="424" text-anchor="middle" dominant-baseline="central">dist/search/index.mjs</text>
</g>
<line x1="340" y1="444" x2="340" y2="504" class="arr" marker-end="url(#arrow1d)"/>
<g class="c-teal">
<rect x="180" y="504" width="320" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="522" text-anchor="middle" dominant-baseline="central">Matches the specifier</text>
<text class="ts" x="340" y="540" text-anchor="middle" dominant-baseline="central">same path the import map expects</text>
</g>
</svg>
</div>

## 2. Naming Convention Contract

The manifest's `namespace`, a slice's `sliceName`, and its `entryFile` combine into one specifier. That exact specifier is what the import map resolves to a production URL — and, independently, what the slice's own build has to produce as its output path. Nothing enforces these two stay in sync besides both sides using the same three values.

**Involves:** `@rmc-toolkit/core` (`defineManifest`, `createImportMap`), `@rmc-toolkit/vite` (`defineSliceBuild`)

<div class="rmc-diagram">
<svg width="100%" viewBox="0 0 680 388" role="img">
<title>Diagram 2: Naming Convention Contract</title>
<desc>namespace @fastflights, sliceName search, and entryFile index.mjs combine into the specifier @fastflights/search/index.mjs. That exact specifier is what the import map resolves to https://assets.fastflights.com/search/index.mjs, and what the slice's own Vite build must produce as dist/search/index.mjs — the two must match exactly.</desc>
<defs><marker id="arrow2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
<g class="c-gray">
<rect x="80" y="40" width="160" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="160" y="58" text-anchor="middle" dominant-baseline="central">namespace</text>
<text class="ts" x="160" y="76" text-anchor="middle" dominant-baseline="central">@fastflights</text>
</g>
<g class="c-gray">
<rect x="260" y="40" width="160" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="58" text-anchor="middle" dominant-baseline="central">sliceName</text>
<text class="ts" x="340" y="76" text-anchor="middle" dominant-baseline="central">search</text>
</g>
<g class="c-gray">
<rect x="440" y="40" width="160" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="520" y="58" text-anchor="middle" dominant-baseline="central">entryFile</text>
<text class="ts" x="520" y="76" text-anchor="middle" dominant-baseline="central">index.mjs (default)</text>
</g>
<line x1="160" y1="96" x2="260" y2="156" class="arr" marker-end="url(#arrow2)"/>
<line x1="340" y1="96" x2="340" y2="156" class="arr" marker-end="url(#arrow2)"/>
<line x1="520" y1="96" x2="420" y2="156" class="arr" marker-end="url(#arrow2)"/>
<g class="c-gray">
<rect x="210" y="156" width="260" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="174" text-anchor="middle" dominant-baseline="central">Specifier</text>
<text class="ts" x="340" y="192" text-anchor="middle" dominant-baseline="central">@fastflights/search/index.mjs</text>
</g>
<line x1="280" y1="212" x2="200" y2="272" class="arr" marker-end="url(#arrow2)"/>
<line x1="400" y1="212" x2="480" y2="272" class="arr" marker-end="url(#arrow2)"/>
<g class="c-teal">
<rect x="70" y="272" width="260" height="76" rx="8" stroke-width="0.5"/>
<text class="th" x="200" y="290" text-anchor="middle" dominant-baseline="central">Import map entry</text>
<text class="ts" x="200" y="308" text-anchor="middle" dominant-baseline="central">https://assets.fastflights.com</text>
<text class="ts" x="200" y="324" text-anchor="middle" dominant-baseline="central">/search/index.mjs</text>
</g>
<g class="c-teal">
<rect x="350" y="272" width="260" height="76" rx="8" stroke-width="0.5"/>
<text class="th" x="480" y="298" text-anchor="middle" dominant-baseline="central">Slice build output</text>
<text class="ts" x="480" y="320" text-anchor="middle" dominant-baseline="central">dist/search/index.mjs</text>
</g>
</svg>
</div>

## 3. Browser Resolution

Puts the browser itself at the center. Everything above the dashed line happens inside `fastflights.com`'s own page: the path gets resolved to a specifier, entirely in the toolkit's own code. The one arrow crossing that dashed boundary is the only step that isn't toolkit code at all — the browser's own native import map resolution — landing on a completely different origin to fetch the actual module.

**Involves:** `@rmc-toolkit/core` (`resolveRoute`, `importModule`), the browser's native `<script type="importmap">` resolution

<div class="rmc-diagram">
<svg width="100%" viewBox="0 0 680 536" role="img">
<title>Diagram 3: Browser Resolution</title>
<desc>The browser has fastflights.com/search loaded. Inside the browser, resolveRoute resolves that path to the specifier @fastflights/search/index.mjs, then the browser's own import map resolution takes over. The browser then leaves its own page and fetches the actual module from a completely different origin: https://assets.fastflights.com/search/index.mjs.</desc>
<defs><marker id="arrow3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
<g class="c-gray">
<rect x="90" y="60" width="380" height="320" rx="12" stroke-width="0.5" stroke-dasharray="4 3"/>
<text class="th" x="110" y="86">Browser</text>
</g>
<g class="c-gray">
<rect x="120" y="110" width="320" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="280" y="128" text-anchor="middle" dominant-baseline="central">Page loaded</text>
<text class="ts" x="280" y="146" text-anchor="middle" dominant-baseline="central">https://fastflights.com/search</text>
</g>
<line x1="280" y1="166" x2="280" y2="206" class="arr" marker-end="url(#arrow3)"/>
<g class="c-gray">
<rect x="120" y="206" width="320" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="280" y="224" text-anchor="middle" dominant-baseline="central">resolveRoute()</text>
<text class="ts" x="280" y="242" text-anchor="middle" dominant-baseline="central">→ @fastflights/search/index.mjs</text>
</g>
<line x1="280" y1="262" x2="280" y2="302" class="arr" marker-end="url(#arrow3)"/>
<g class="c-teal">
<rect x="120" y="302" width="320" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="280" y="320" text-anchor="middle" dominant-baseline="central">import(specifier)</text>
<text class="ts" x="280" y="338" text-anchor="middle" dominant-baseline="central">checks the import map</text>
</g>
<line x1="280" y1="358" x2="340" y2="440" class="arr" marker-end="url(#arrow3)"/>
<g class="c-teal">
<rect x="120" y="440" width="440" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="458" text-anchor="middle" dominant-baseline="central">Network fetch</text>
<text class="ts" x="340" y="476" text-anchor="middle" dominant-baseline="central">https://assets.fastflights.com/search/index.mjs</text>
</g>
</svg>
</div>

## 4. Slice Build and Runtime

What the `search` slice actually is, seen from its own side: its own Vite build producing a fixed output path, and, at runtime, what it imports and what it exports for the host to mount. This is the same `dist/search/index.mjs` path from Diagrams 1d and 2, now shown alongside the slice's own runtime behavior rather than the host's.

**Involves:** `@rmc-toolkit/vite` (`defineSliceBuild`), the slice's own `mount()`/`unmount()` or component export contract (see [Slice conventions](/glossary/#slice-conventions))

<div class="rmc-diagram">
<svg width="100%" viewBox="0 0 680 484" role="img">
<title>Diagram 4: Slice Build and Runtime</title>
<desc>The search slice's own Vite config builds it to dist/search/index.mjs. At runtime it imports React through the exact specifier @esm.sh/react, and exports a mount and unmount function pair for the host to call.</desc>
<defs><marker id="arrow4" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
<g class="c-gray">
<rect x="210" y="40" width="260" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="58" text-anchor="middle" dominant-baseline="central">defineSliceBuild()</text>
<text class="ts" x="340" y="76" text-anchor="middle" dominant-baseline="central">sliceName: "search"</text>
</g>
<line x1="340" y1="96" x2="340" y2="156" class="arr" marker-end="url(#arrow4)"/>
<g class="c-gray">
<rect x="210" y="156" width="260" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="174" text-anchor="middle" dominant-baseline="central">Build output</text>
<text class="ts" x="340" y="192" text-anchor="middle" dominant-baseline="central">dist/search/index.mjs</text>
</g>
<line x1="340" y1="212" x2="340" y2="272" class="arr" marker-end="url(#arrow4)"/>
<g class="c-teal">
<rect x="210" y="272" width="260" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="290" text-anchor="middle" dominant-baseline="central">Imports shared deps</text>
<text class="ts" x="340" y="308" text-anchor="middle" dominant-baseline="central">from "@esm.sh/react"</text>
</g>
<line x1="340" y1="328" x2="340" y2="388" class="arr" marker-end="url(#arrow4)"/>
<g class="c-teal">
<rect x="210" y="388" width="260" height="56" rx="8" stroke-width="0.5"/>
<text class="th" x="340" y="406" text-anchor="middle" dominant-baseline="central">Exports mount contract</text>
<text class="ts" x="340" y="424" text-anchor="middle" dominant-baseline="central">mount(target), unmount()</text>
</g>
</svg>
</div>
