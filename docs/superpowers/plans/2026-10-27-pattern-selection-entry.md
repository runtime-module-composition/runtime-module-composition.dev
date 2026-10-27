# Pattern-Selection Entry Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the docs site a prominent pattern-selection entry flow that routes a newcomer to the right pattern-specific quick start, and restructure Quick Start around pattern (Module Boundary, Independent Mount) instead of framework.

**Architecture:** An Astro Starlight content site. No changes to the toolkit (`rmc-toolkit`) itself — this is docs-site content, navigation, and one new interactive component. The interactive flow is a small vanilla-TS state machine in an `.astro` component (no new framework dependency — the project has no `@astrojs/react`/`@astrojs/vue` integration installed, and one small quiz widget doesn't warrant adding one).

**Tech Stack:** Astro + `@astrojs/starlight` (already installed, `latest`). Starlight's built-in `Tabs`/`TabItem`/`CardGrid`/`Card` components (already used elsewhere in this repo, e.g. `quick-start/index.mdx`). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-27-pattern-selection-entry-design.md`

## Global Constraints

- No redirect mechanism exists in `astro.config.mjs` today (verified: no `redirects` key). Astro's `redirects` is a **top-level** key in `defineConfig({...})`, not nested inside `starlight({...})`.
- `glossary.md`'s terms are alphabetical by heading text; every new/changed entry must stay in alphabetical order and use the existing cross-link style (`[text](#anchor)`, anchor = lowercased, hyphenated heading).
- **Independent Mount** must never be described as providing CSS isolation, sandboxing, or a separate JS environment (anti-goal, spec).
- **No Manifest Host** paths are "discouraged," never "unsupported" or "equally recommended" (anti-goal, spec) — exact wording matters wherever this distinction appears.
- Both known gaps — Vue + Module Boundary Direct, No Manifest Host + Independent Mount — must be stated honestly wherever relevant, never hidden (anti-goal, spec).
- The three existing URLs `/quick-start/react/`, `/quick-start/vue/`, `/quick-start/existing-app/` must redirect, not 404 (anti-goal, spec).
- No test framework exists in this repo (`package.json` has no `devDependencies`). Verification throughout this plan is `npm run build` (catches Astro/content errors) plus explicit manual browser verification for the interactive component — do not introduce a test framework as part of this plan; that's out of scope.

## Review Focus

- A visitor who answers "Module Boundary" then "Injected" and is on Vue, vs. one who answers "Module Boundary" then "Direct" on Vue: the first must land on working content (Injected supports Vue); the flow itself never asks "which framework," so the Vue+Direct gap is never actually reachable through the flow — it only needs to be correct in the Module Boundary: Direct page's own content and the advanced reference page, not in the flow's branching logic.
- A visitor who follows an old bookmarked/indexed link (`/quick-start/react/`, `/quick-start/vue/`, `/quick-start/existing-app/`) after this ships — must redirect, not 404.
- A visitor who reads the rewritten `glossary.md` `### Host` entry, then immediately reads `technical-implementation.md` — must not hit unqualified "Host" language describing manifest/route behavior that contradicts what they just read.
- A visitor who clicks "Back" partway through the question flow, then changes their answer — must land on the *new* answer's result, with no stale state from the first path.
- A visitor who lands on `module-boundary/direct.md` expecting a Vue option (since Independent Mount offers both frameworks) — must be told plainly, near the top, that Direct is React-only, not discover it by dead-ending in a code sample.

---

## File Structure

```
src/components/PatternChooser.astro          # new — interactive question flow
src/content/docs/choose-a-pattern.mdx         # new — hosts the component
src/content/docs/glossary.md                  # modified — rewritten/new terms
src/content/docs/technical-implementation.md  # modified — terminology pass
src/content/docs/index.mdx                    # modified — hero link + terminology pass
src/content/docs/quick-start/index.mdx        # modified — pattern-first index
src/content/docs/quick-start/independent-mount/index.mdx   # new
src/content/docs/quick-start/independent-mount/react.md    # new
src/content/docs/quick-start/independent-mount/vue.md      # moved from quick-start/vue.md
src/content/docs/quick-start/module-boundary/index.mdx     # new
src/content/docs/quick-start/module-boundary/direct.md     # moved+relabeled from quick-start/react.md
src/content/docs/quick-start/module-boundary/injected.md   # new
src/content/docs/quick-start/module-boundary/existing-app.md # moved from quick-start/existing-app.md
src/content/docs/quick-start/advanced/no-manifest-host.md  # new
astro.config.mjs                              # modified — sidebar restructure + redirects
```

---

### Task 1: Terminology foundation (glossary + cross-page consistency)

**Files:**
- Modify: `src/content/docs/glossary.md`
- Modify: `src/content/docs/technical-implementation.md`
- Modify: `src/content/docs/index.mdx`

**Interfaces:**
- Produces: the glossary anchors every later task links to — `#host`, `#manifest-host`, `#no-manifest-host`, `#module-boundary`, `#independent-mount`, `#slice-conventions` (existing, content changes).

- [ ] **Step 1: Rewrite `### Host` in `glossary.md`** (currently line 42-44) to:

```markdown
### Host

A role, not a specific implementation: any application that loads and renders a [slice](#slice) — the document, the routing, the region a slice occupies. Every host is one of two kinds:

- **[Manifest Host](#manifest-host)** — adopts a manifest and resolves routes across it.
- **[No Manifest Host](#no-manifest-host)** — loads one known module, no manifest involved.
```

- [ ] **Step 2: Insert `### Manifest Host` immediately after `### Import map`, before `### Manifest`** (keeps alphabetical order: Host, Import map, Independent Mount, Manifest, Manifest Host, Module Boundary, Namespace, No Manifest Host — insert both new I/M-section terms now):

```markdown
### Independent Mount

An integration pattern: the slice mounts into a DOM element and owns its own rendering lifecycle and DOM subtree; the host interacts with it only through [`mount`/`unmount`](#slice-conventions). Framework-agnostic to the host — it never needs to know what rendered the slice. Independent Mount does not imply CSS isolation, sandboxing, or a separate JavaScript environment: it's still the same page, the same `document`, the same global scope.
```

(Place `### Independent Mount` directly after `### Import map`: comparing the two strings character by character, `"Import"` and `"Independent"` first differ at the second letter — `m` vs. `n` — and `m` sorts before `n`, so `Import map` precedes `Independent Mount`.)

- [ ] **Step 3: Insert `### Manifest Host` immediately after `### Manifest`:**

```markdown
### Manifest Host

A [host](#host) that adopts a [manifest](#manifest): generates its [import map](#import-map) from it, and resolves the current path to a slice via [`resolveRoute(manifest, path)`](#route). This is what earlier versions of these docs called "Host" — now the specific, manifest-adopting case, not the generic role.
```

- [ ] **Step 4: Insert `### Module Boundary` immediately after `### Manifest Host`:**

```markdown
### Module Boundary

An integration pattern: the slice renders as a first-class node inside the host's own framework render tree, loaded through the host's native lazy/Suspense/error-boundary machinery. Host and slice must share a framework. Two export styles — see [Slice conventions](#slice-conventions).
```

- [ ] **Step 5: Insert `### No Manifest Host` immediately after `### Namespace`, before `### Route`:**

```markdown
### No Manifest Host

A [host](#host) that loads one known module without a [manifest](#manifest) or route resolution — a hand-rolled [import map](#import-map) entry, or a direct URL import. Already works today for [Module Boundary](#module-boundary) slices (see [Decoupling a Slice from an Existing App](/quick-start/module-boundary/existing-app/)). There's no equivalent for [Independent Mount](#independent-mount) yet — `createRuntimeHost()` requires a full manifest. See the [No Manifest Host reference page](/quick-start/advanced/no-manifest-host/) for exactly what's supported.
```

- [ ] **Step 6: Rewrite `### Slice conventions`** (currently lines 76-84) to:

```markdown
### Slice conventions

A slice is built for exactly one of three contracts, and they aren't interchangeable:

- **mount/unmount** — the slice exports an object with `mount(target)` and `unmount()`. The literal interface behind the [Independent Mount](#independent-mount) pattern. Used by `createRuntimeHost()`, `createReactAdapter()`, and `createVueAdapter()`.
- **Direct** — the slice default-exports a component. One of two [Module Boundary](#module-boundary) export styles. Used by React's `createDynamicModuleBoundary()` — no Vue equivalent exists.
- **Injected** — the slice default-exports a factory, `(deps) => Component`, that receives the host's own framework instance instead of importing its own. The other [Module Boundary](#module-boundary) export style. Used by `createInjectedModuleBoundary()` (React and Vue). This one is for a specific situation — see [Decoupling a Slice from an Existing App](/quick-start/module-boundary/existing-app/) for when to reach for it instead of Direct or mount/unmount.

Pick the one matching how a given slice is written — not both for the same slice.
```

- [ ] **Step 7: In `index.mdx`, update the "Architecture Model" bullet** (currently: `- **Host shell**: owns the document, root providers, global navigation, layout, route resolver, loading states, and error boundaries.`) to:

```markdown
- **Manifest Host**: owns the document, root providers, global navigation, layout, route resolver, loading states, and error boundaries.
```

- [ ] **Step 8: In `technical-implementation.md`, apply these required swaps** (exact lines, by current content — line numbers may shift after Step 7, match by text):
  - `description:` frontmatter: `"...in production with a host shell..."` → `"...in production with a Manifest Host..."`
  - Line 6 opening sentence: `"a host shell loads a shared import map, resolves route ownership, and dynamically imports..."` → `"a Manifest Host loads a shared import map, resolves route ownership, and dynamically imports..."`
  - Line 23 numbered list item 1: `"A host shell owns the document..."` → `"A Manifest Host owns the document..."`
  - Line 32 Mermaid diagram label: `Shell["Host shell"]` → `Shell["Manifest Host"]`
  - `## Host Shell Responsibilities` heading → `## Manifest Host Responsibilities`
  - Line 104 `Host responsibilities:` → `Manifest Host responsibilities:`

- [ ] **Step 9: Read the rest of `technical-implementation.md` top to bottom and apply the same swap wherever "host"/"host shell" specifically describes manifest-generation or route-resolution behavior** (e.g. the closing paragraph's "The host shell provides the stable product structure... import map provides the dependency and module resolution contract"). Leave generic uses of "host" alone — a sentence like "test host and affected slices together" or "the host provides global composition context" is about the role in general, not the manifest-specific behavior, and does not need to change. Use judgment; the criterion is whether swapping to "Manifest Host" is accurate or whether "Host" was already correct as the generic role.

- [ ] **Step 10: Verify.** Run:
```bash
npm run build
```
Expected: build succeeds, no errors.
```bash
grep -n "Host Shell\|host shell" src/content/docs/technical-implementation.md
```
Expected: no matches (both required occurrences from Step 8 were swapped; Step 9 may have caught more).

- [ ] **Step 11: Commit**

```bash
git add src/content/docs/glossary.md src/content/docs/technical-implementation.md src/content/docs/index.mdx
git commit -m "docs: rewrite terminology — Host becomes generic role, add Manifest Host/No Manifest Host/Module Boundary/Independent Mount"
```

---

### Task 2: Independent Mount quick starts

**Files:**
- Move: `src/content/docs/quick-start/vue.md` → `src/content/docs/quick-start/independent-mount/vue.md`
- Create: `src/content/docs/quick-start/independent-mount/react.md`
- Create: `src/content/docs/quick-start/independent-mount/index.mdx`

**Interfaces:**
- Consumes: `createReactAdapter(React)` → `{ useRuntimeHost }`, where `useRuntimeHost<T extends Element>(path: string, options: UseRuntimeHostOptions): { ref: RefObject<T | null>, status: RuntimeHostStatus }` and `UseRuntimeHostOptions = Omit<RuntimeHostObservableOptions, "target">` (verified against `rmc-toolkit/packages/react/src/create-react-adapter.ts`).
- Produces: `/quick-start/independent-mount/`, `/quick-start/independent-mount/react/`, `/quick-start/independent-mount/vue/` — Task 6 (flow component) and Task 5 (sidebar/redirects) link to these exact paths.

- [ ] **Step 1: Move the file.**
```bash
mkdir -p src/content/docs/quick-start/independent-mount
git mv src/content/docs/quick-start/vue.md src/content/docs/quick-start/independent-mount/vue.md
```

- [ ] **Step 2: In the moved `vue.md`, update every internal link that pointed at `/quick-start/react/`** to point at `/quick-start/independent-mount/react/` instead, and its link text from "Quick Start: React" to "Quick Start: Independent Mount — React" (it was the Independent Mount sibling before; it still is, just at the new path — the old `react.md` is no longer that sibling, see Task 3). Grep the file for `/quick-start/react/` first to find every occurrence (intro line and any "Next steps" section) before editing.

- [ ] **Step 3: Write `independent-mount/react.md`** — new content, mirroring `vue.md`'s structure exactly (same section headings: title/description frontmatter, intro paragraph, "What you'll build", "Prerequisites", numbered steps 1 through however many `vue.md` has, "Next steps"). Substitute the React equivalents for Vue's:
  - `createVueAdapter(Vue)` → `{ useRuntimeHost }` becomes `createReactAdapter(React)` → `{ useRuntimeHost }`.
  - Vue's composable call `useRuntimeHost(() => route.fullPath, { manifest })` returning `{ target, status }` (a `target` ref bound to the mount element) becomes the React hook call `useRuntimeHost(path, { manifest })` returning `{ ref, status }` (a `ref` bound to a `<div ref={ref} />`).
  - The slice-side `mount()`/`unmount()` example: Vue's used `app.mount(target)`/`app?.unmount()`; the React equivalent uses `ReactDOM.createRoot(target).render(<...>)` for `mount(target)` and `root.unmount()` for `unmount()`.
  - Frontmatter: `title: "Quick Start: Independent Mount — React"`, `description: "Stand up a React host and one slice locally, composed at runtime through import maps, using the mount/unmount convention."`
  - Intro paragraph's cross-link points to `/quick-start/independent-mount/vue/` with text "Quick Start: Independent Mount — Vue".

- [ ] **Step 4: Write `independent-mount/index.mdx`** — overview page, frontmatter `title: "Quick Start: Independent Mount"`, short intro (1-2 sentences) stating this pattern mounts a slice into a DOM element via `mount`/`unmount`, framework-agnostic to the host, then a `CardGrid` with two `Card`s (React, Vue) linking to the two pages above — follow the existing `CardGrid`/`Card` import pattern already used in `quick-start/index.mdx`.

- [ ] **Step 5: Verify.**
```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 6: Commit**
```bash
git add src/content/docs/quick-start/independent-mount/
git commit -m "docs: add pattern-first Independent Mount quick starts (React new, Vue moved)"
```

---

### Task 3: Module Boundary quick starts

**Files:**
- Move: `src/content/docs/quick-start/react.md` → `src/content/docs/quick-start/module-boundary/direct.md`
- Move: `src/content/docs/quick-start/existing-app.md` → `src/content/docs/quick-start/module-boundary/existing-app.md`
- Create: `src/content/docs/quick-start/module-boundary/injected.md`
- Create: `src/content/docs/quick-start/module-boundary/index.mdx`

**Interfaces:**
- Consumes: `createDynamicModuleBoundary(React)` → `{ DynamicModuleBoundary }` (React only); `createInjectedModuleBoundary(React | Vue, extraDeps?)` → `{ InjectedModuleBoundary }`, slice default-exports `(deps) => Component` (both verified against `api-reference.md` and `rmc-toolkit` source).
- Produces: `/quick-start/module-boundary/`, `/quick-start/module-boundary/direct/`, `/quick-start/module-boundary/injected/`, `/quick-start/module-boundary/existing-app/` — Task 6 links to these exact paths.

- [ ] **Step 1: Move and relabel `react.md` → `direct.md`.**
```bash
mkdir -p src/content/docs/quick-start/module-boundary
git mv src/content/docs/quick-start/react.md src/content/docs/quick-start/module-boundary/direct.md
```
Edit the moved file:
- Frontmatter: `title: "Quick Start: Module Boundary — Direct"`, `description: "Stand up a React host that renders a slice directly inside its own component tree, as a plain default-exported component."`
- Replace the intro's cross-link sentence (`"See Quick Start: Vue for the same walkthrough with Vue instead."`) with: `"Direct is React only — there's no Vue equivalent (see [Slice conventions](/glossary/#slice-conventions)). Building a Vue slice into your component tree? Use [Module Boundary — Injected](/quick-start/module-boundary/injected/) instead."` This is the one place this page must honestly name the Vue + Direct gap (anti-goal, Review Focus).
- Add one sentence near the top of "What you'll build" clarifying this builds the **Module Boundary — Direct** pattern specifically (the page existed before this redesign without naming its own pattern — that's the bug this whole project fixes).

- [ ] **Step 2: Move and recontextualize `existing-app.md`.**
```bash
git mv src/content/docs/quick-start/existing-app.md src/content/docs/quick-start/module-boundary/existing-app.md
```
Edit the moved file:
- Replace the intro paragraph (currently: `"The React and Vue quick starts both assume you're starting from nothing... This guide is for the opposite situation..."`) with a version contrasting against the new from-scratch Injected guide instead: `"[Module Boundary — Injected](/quick-start/module-boundary/injected/) assumes you're building a slice from scratch, resolving its own dependencies the standard way. This guide is for the opposite situation: you already have a working, normally-bundled application..."` (keep the rest of that paragraph as-is).
- In the "Staying here is fine — or use it as a stepping stone" section, update the sentence naming the migration targets: `"the mount/unmount convention"` → link it to `/quick-start/independent-mount/`; `"the plain-component convention (createDynamicModuleBoundary...)"` → call it "Direct" and link to `/quick-start/module-boundary/direct/`.
- In "Next steps", replace the `Quick Start: React` / `Quick Start: Vue` links with `Quick Start: Module Boundary — Injected` (`/quick-start/module-boundary/injected/`) and `Quick Start: Module Boundary — Direct` (`/quick-start/module-boundary/direct/`).

- [ ] **Step 3: Write `injected.md`** — new content for a from-scratch Injected walkthrough covering both React and Vue in one page using Starlight's `Tabs`/`TabItem` (import `{ Tabs, TabItem } from '@astrojs/starlight/components'`, same convention as `CardGrid`/`Card` in `quick-start/index.mdx`). Structure: frontmatter `title: "Quick Start: Module Boundary — Injected"`, intro explaining Injected's purpose (slice receives the host's framework instance instead of importing its own — cross-link `/glossary/#slice-conventions`), "What you'll build", "Prerequisites", then numbered steps with a `<Tabs>` block at each step that differs between React and Vue (host setup, `createInjectedModuleBoundary(React)` vs `createInjectedModuleBoundary(Vue)`, the slice's default-exported factory `(deps) => Component`), "Next steps" linking to `existing-app.md` ("the retrofit scenario this pattern was built for") and `direct.md` ("the React-only alternative that doesn't need injection").

- [ ] **Step 4: Write `module-boundary/index.mdx`** — overview page, frontmatter `title: "Quick Start: Module Boundary"`, short intro (slice renders as a node inside the host's own tree, host and slice share a framework), then a `CardGrid` with three `Card`s: Direct, Injected, Existing App — linking to the three pages above.

- [ ] **Step 5: Verify.**
```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 6: Commit**
```bash
git add src/content/docs/quick-start/module-boundary/
git commit -m "docs: add pattern-first Module Boundary quick starts (Direct relabeled, Injected new, Existing App recontextualized)"
```

---

### Task 4: No Manifest Host reference page

**Files:**
- Create: `src/content/docs/quick-start/advanced/no-manifest-host.md`

**Interfaces:**
- Consumes: glossary's `#no-manifest-host`, `#module-boundary`, `#independent-mount` anchors (Task 1); `RuntimeHostOptions.manifest: RuntimeCompositionManifest` as a required field of `createRuntimeHost()` (verified, `api-reference.md`).
- Produces: `/quick-start/advanced/no-manifest-host/` — linked from Task 1's glossary entry, Task 3's `direct.md`, and Task 5/6's nav.

- [ ] **Step 1: Write the page.** Frontmatter: `title: "Advanced: No Manifest Host"`, `description: "What works and what doesn't when a host skips the manifest entirely."` Required content, in this order:
  1. Define No Manifest Host (reuse the glossary wording from Task 1, don't duplicate it verbatim — cross-link `/glossary/#no-manifest-host`).
  2. **What works today:** Module Boundary (Direct or Injected) used directly with a hardcoded specifier, no manifest — cross-link `/quick-start/module-boundary/existing-app/` as a complete worked example.
  3. **The gap:** No Manifest Host + Independent Mount is not implemented. State plainly: `createRuntimeHost()`'s `RuntimeHostOptions` requires `manifest: RuntimeCompositionManifest` — there is no manifest-free variant. Workaround: adopt a Manifest Host with a one-slice manifest — cross-link `/quick-start/independent-mount/`.
  4. **The other gap:** Module Boundary — Direct has no Vue equivalent (manifest or not) — cross-link `/quick-start/module-boundary/direct/` and `/quick-start/module-boundary/injected/` (the Vue-compatible alternative).
  5. Close with one line stating these are current gaps, not roadmap promises — per the anti-goal, don't imply either is coming soon.

- [ ] **Step 2: Verify.**
```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 3: Commit**
```bash
git add src/content/docs/quick-start/advanced/
git commit -m "docs: document No Manifest Host and both known pattern gaps honestly"
```

---

### Task 5: Quick Start index, sidebar restructure, redirects

**Files:**
- Modify: `src/content/docs/quick-start/index.mdx`
- Modify: `astro.config.mjs`

**Interfaces:**
- Consumes: exact paths from Tasks 2-4 (`/quick-start/independent-mount/`, `/quick-start/module-boundary/`, `/quick-start/advanced/no-manifest-host/`, plus their sub-pages).

- [ ] **Step 1: Rewrite `quick-start/index.mdx`** to be pattern-first. Keep the existing `CardGrid`/`Card` import. Replace the three framework cards with two pattern cards:
  - Card "Module Boundary": `"Render the slice as a component inside your own framework tree."` → links to `/quick-start/module-boundary/`.
  - Card "Independent Mount": `"Mount the slice into a DOM element with its own rendering lifecycle."` → links to `/quick-start/independent-mount/`.
  Keep the closing paragraph but update it to explain the pattern-first split instead of the old framework-first one, and add one sentence pointing to `/choose-a-pattern/` for anyone unsure which card to pick (that page doesn't exist until Task 6 — this link is forward-declared and will resolve once Task 6 lands; do not let this block the build, Astro does not validate markdown link targets at build time).

- [ ] **Step 2: Add `redirects` to `astro.config.mjs`** as a top-level key in `defineConfig({...})` (not inside `starlight({...})`):

```js
export default defineConfig({
  site: "https://runtime-module-composition.dev",
  redirects: {
    "/quick-start/react": "/quick-start/module-boundary/direct",
    "/quick-start/vue": "/quick-start/independent-mount/vue",
    "/quick-start/existing-app": "/quick-start/module-boundary/existing-app",
  },
  integrations: [
    // ...unchanged
  ],
});
```

- [ ] **Step 3: Restructure the `"Quick Start"` sidebar group** in `astro.config.mjs` to:

```js
{
  label: "Quick Start",
  items: [
    { label: "Overview", slug: "quick-start" },
    {
      label: "Module Boundary",
      items: [
        { label: "Overview", slug: "quick-start/module-boundary" },
        { label: "Direct (React)", slug: "quick-start/module-boundary/direct" },
        { label: "Injected", slug: "quick-start/module-boundary/injected" },
        { label: "Existing App", slug: "quick-start/module-boundary/existing-app" },
      ],
    },
    {
      label: "Independent Mount",
      items: [
        { label: "Overview", slug: "quick-start/independent-mount" },
        { label: "React", slug: "quick-start/independent-mount/react" },
        { label: "Vue", slug: "quick-start/independent-mount/vue" },
      ],
    },
    {
      label: "Advanced",
      items: [{ label: "No Manifest Host", slug: "quick-start/advanced/no-manifest-host" }],
    },
  ],
},
```

- [ ] **Step 4: Verify.**
```bash
npm run build
```
Expected: build succeeds, no broken-route errors.
```bash
npm run preview
```
Then, using the Browser tool, navigate to `http://localhost:<preview-port>/quick-start/react/`, `/quick-start/vue/`, `/quick-start/existing-app/` — expect each to redirect to its new path (check via `read_network_requests` or the final URL in the address bar).

- [ ] **Step 5: Commit**
```bash
git add src/content/docs/quick-start/index.mdx astro.config.mjs
git commit -m "docs: restructure Quick Start sidebar pattern-first, add redirects for moved URLs"
```

---

### Task 6: Pattern-chooser component and entry page

**Files:**
- Create: `src/components/PatternChooser.astro`
- Create: `src/content/docs/choose-a-pattern.mdx`
- Modify: `astro.config.mjs`
- Modify: `src/content/docs/index.mdx`

**Interfaces:**
- Consumes: `/quick-start/independent-mount/`, `/quick-start/module-boundary/direct/`, `/quick-start/module-boundary/injected/` (Tasks 2-3's exact produced paths).

- [ ] **Step 1: Write `src/components/PatternChooser.astro`.** No props. Contains:
  - A question container (`<div id="pc-question">`) showing the current question's text and its options as buttons.
  - A "Back" button (`<button id="pc-back">`, hidden on the first question).
  - A result container (`<div id="pc-result" hidden>`) showing the recommended pattern's title and a link to its quick start.
  - An inline `<script>` (TypeScript, Astro compiles it) implementing this exact state machine — pin this data and logic shape, the DOM wiring is the implementer's choice:

```ts
type StepId = "render-style" | "framework-receipt";
type ResultId = "independent-mount" | "module-boundary-direct" | "module-boundary-injected";

type Option = { label: string; next: { type: "step"; id: StepId } | { type: "result"; id: ResultId } };
type Step = { id: StepId; question: string; options: Option[] };

const STEPS: Record<StepId, Step> = {
  "render-style": {
    id: "render-style",
    question: "How should the slice render?",
    options: [
      { label: "As a component inside my framework tree", next: { type: "step", id: "framework-receipt" } },
      { label: "Into a DOM element, with its own rendering lifecycle", next: { type: "result", id: "independent-mount" } },
    ],
  },
  "framework-receipt": {
    id: "framework-receipt",
    question: "How does the slice receive its framework?",
    options: [
      { label: "It imports its own copy, resolved through the import map", next: { type: "result", id: "module-boundary-direct" } },
      { label: "It receives the host's instance instead of importing one", next: { type: "result", id: "module-boundary-injected" } },
    ],
  },
};

const RESULTS: Record<ResultId, { title: string; href: string }> = {
  "independent-mount": { title: "Independent Mount", href: "/quick-start/independent-mount/" },
  "module-boundary-direct": { title: "Module Boundary — Direct", href: "/quick-start/module-boundary/direct/" },
  "module-boundary-injected": { title: "Module Boundary — Injected", href: "/quick-start/module-boundary/injected/" },
};
```
  Maintain a history array of visited `StepId`s so "Back" from `framework-receipt` returns to `render-style`, and "Back" from a result returns to whichever step produced it (pop the history). Changing an answer after going back must re-render from that point — no stale result left showing.

- [ ] **Step 2: Write `src/content/docs/choose-a-pattern.mdx`.** Frontmatter: `title: "Choose a Pattern"`, `description: "Answer two questions to find out which Runtime Module Composition pattern your application needs."`. Import and render `PatternChooser` (`import PatternChooser from '../../components/PatternChooser.astro'` — adjust relative path to match actual file location). One short intro paragraph above the component explaining what the two patterns are in one sentence each, so the page isn't just a bare widget.

- [ ] **Step 3: Add the `"Start Here"` sidebar group to `astro.config.mjs`**, as the first entry in the `sidebar` array, before `"Architecture"`:
```js
{
  label: "Start Here",
  items: [{ label: "Choose a Pattern", slug: "choose-a-pattern" }],
},
```

- [ ] **Step 4: Update the hero's "Get Started" action in `index.mdx`** from `link: /quick-start/` to `link: /choose-a-pattern/` (keep `text: "Get started"` and `variant: primary` unchanged).

- [ ] **Step 5: Verify — manual browser walkthrough.** Run `npm run dev`, then using the Browser tool:
  1. Navigate to the site root, click "Get started" — expect to land on `/choose-a-pattern/`.
  2. On the question flow, click "Into a DOM element, with its own rendering lifecycle" — expect the result card to show "Independent Mount" linking to `/quick-start/independent-mount/`.
  3. Click "Back" — expect the first question to reappear, no result shown.
  4. Click "As a component inside my framework tree" — expect the second question to appear.
  5. Click "It imports its own copy..." — expect the result to show "Module Boundary — Direct" linking to `/quick-start/module-boundary/direct/`.
  6. Click "Back" twice, then retake the flow choosing "It receives the host's instance..." — expect "Module Boundary — Injected" linking to `/quick-start/module-boundary/injected/`.
  7. Click through each of the three result links and confirm each loads its real page (not a 404).

- [ ] **Step 6: Commit**
```bash
git add src/components/PatternChooser.astro src/content/docs/choose-a-pattern.mdx astro.config.mjs src/content/docs/index.mdx
git commit -m "feat: add pattern-selection entry flow, point Get Started at it"
```

---

### Task 7: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Full production build.**
```bash
npm run build
```
Expected: succeeds with no errors or warnings about broken routes.

- [ ] **Step 2: Run `npm run preview` and, using the Browser tool, walk the sidebar top to bottom** — confirm every new/moved entry (Start Here, Quick Start → Module Boundary → Direct/Injected/Existing App, Quick Start → Independent Mount → React/Vue, Quick Start → Advanced → No Manifest Host) resolves to a real page, no 404s.

- [ ] **Step 3: Confirm the three redirects** (`/quick-start/react/`, `/quick-start/vue/`, `/quick-start/existing-app/`) each land on their new URL.

- [ ] **Step 4: Spot-check the two gap callouts render as written** — `module-boundary/direct.md`'s Vue-gap sentence, and `advanced/no-manifest-host.md`'s Independent-Mount-gap section — confirm neither reads as "coming soon" or implies the gap is supported.

- [ ] **Step 5: Confirm `glossary.md` renders with correct alphabetical order and all new cross-links resolve** (click each `[text](#anchor)` added in Task 1 and confirm it jumps to the right entry, not a missing anchor).

No commit for this task — it's verification of the five prior commits, not a new change. If any check fails, fix it in a new commit before considering the plan complete.
