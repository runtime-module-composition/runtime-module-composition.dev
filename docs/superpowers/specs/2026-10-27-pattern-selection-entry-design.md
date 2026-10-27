# Pattern-selection entry flow — design

## Intent and why

Today, a visitor arriving at the docs via the hero's "Get Started" button lands directly in
`/quick-start/`, a Quick Start section organized by framework (React, Vue, Existing App) rather
than by pattern. That split obscures which pattern each guide actually teaches: `vue.md` builds
**Independent Mount** with a **Manifest Host** (`createVueAdapter`'s `useRuntimeHost`,
`mount`/`unmount`), but `react.md` actually builds **Module Boundary — Direct**
(`createDynamicModuleBoundary`), not Independent Mount — confirmed against both files and the
`rmc-toolkit` source during a builder-check pass on this document. So Module Boundary already has
a real walkthrough today, it's just mislabeled by framework instead of pattern; what's actually
missing is an Independent Mount walkthrough for React (the toolkit has `createReactAdapter`'s
`useRuntimeHost` for exactly this, it's just never been written up).

This leaves a newcomer with no explicit moment to ask "which of these two patterns does my
application actually need?" before picking a walkthrough — they either guess from the framework
split (which doesn't map to the real decision) or stumble into Module Boundary accidentally via
Existing App. This project adds that self-identification step as the new, prominent entry point,
and restructures Quick Start around pattern first, framework second, so every destination the new
flow can send someone to actually has a real landing page.

## Goals

- A short, interactive question flow — at most two questions, one of them conditional — reachable
  as the site's new primary "Get Started" destination, ending on an explicit pattern
  recommendation with a direct link into that pattern's quick start.
- Quick Start reorganized pattern-first: **Module Boundary** (Direct, Injected) and
  **Independent Mount**, each with framework-scoped walkthroughs underneath.
- Module Boundary — Direct is relabeled from the existing `react.md` (already correct content, no
  rewrite needed); Injected gets a new walkthrough, alongside the existing Existing App guide
  (which becomes Injected's featured retrofit scenario, not a fourth sibling path); Independent
  Mount gets a net-new React walkthrough (`createReactAdapter`'s `useRuntimeHost`, mirroring
  `vue.md`'s structure) alongside the existing, unchanged `vue.md`.
- Glossary brought in line with final terminology (below), including a rewrite of the existing
  `Host` entry, which currently bakes in manifest/`resolveRoute` behavior that now belongs to the
  narrower `Manifest Host` term.
- A light terminology pass on `technical-implementation.md` and `index.mdx`, swapping unqualified
  "Host"/"host shell" for "Manifest Host" wherever they specifically describe manifest-generation
  and route-resolution behavior — otherwise those pages contradict the rewritten glossary entry
  the moment someone cross-references it.
- Both known toolkit gaps — **Vue + Module Boundary Direct** (doesn't exist) and **No Manifest
  Host + Independent Mount** (no lightweight single-slice mount/unmount helper without a manifest)
  — documented honestly in reference material. Never hidden, never presented as available today.

## Non-goals

- Building the "Cross-Framework Module Boundary" pattern discussed earlier in the toolkit's
  history — nothing exists for it in code or docs; out of scope here.
- Closing either toolkit gap in `rmc-toolkit` itself — this is docs-site work only.
- Redesigning Architecture, Technical Implementation, API Reference, Demo, or Articles beyond the
  glossary rewrite and the terminology pass on `technical-implementation.md`/`index.mdx` described
  above — no structural or content changes to those pages beyond that mechanical term swap.
- Giving **No Manifest Host** its own quick start or its own branch in the primary flow — per the
  documentation direction decided with the user, it's reference material, reachable from the
  relevant pattern pages, not a flow destination.

## Anti-goals

Things that would make this a failure even if it technically works:

- Copy that implies **Independent Mount** provides CSS isolation, sandboxing, or a separate JS
  environment — it explicitly does not, and this must be stated, not just avoided.
- Any page that silently omits the two known gaps instead of naming them.
- Copy that presents a **No Manifest Host** path as equally recommended alongside the Manifest
  Host paths. The decided direction is "discouraged," not "unsupported" — that distinction has to
  survive into the actual prose, not collapse into either "fully fine" or "doesn't work."
- Breaking the existing inbound URLs (`/quick-start/react/`, `/quick-start/vue/`,
  `/quick-start/existing-app/`) without redirects.

## Constraints

- Astro Starlight site. Sidebar config lives in `astro.config.mjs`; content in
  `src/content/docs/**`. Starlight supports custom components embedded in MDX — the question flow
  should be built as one of those, not static prose, since it needs branching and back-navigation.
- No redirect mechanism is currently configured in `astro.config.mjs` (verified — no `redirects`
  key present today). Starlight accepts a `redirects` map in the integration config; this project
  adds one for the three moved URLs.
- `glossary.md`'s existing `### Host` entry currently reads: "The application that owns the page...
  Generates and serves the import map... resolves the current route, and hands off to an adapter
  or `createRuntimeHost()`..." — this needs a genuine rewrite to describe the generic role, not an
  appended caveat.

## Decided: terminology (final — from direct discussion with the user and a sibling session working the toolkit side)

| Term | Meaning |
|---|---|
| **Host** | Generic role: any application that loads and renders a slice. (Site's current glossary entry needs rewriting — it currently describes what's now `Manifest Host` specifically.) |
| **Manifest Host** | Adopts a manifest, generates its import map from it, resolves the current path via `resolveRoute(manifest, path)`. |
| **No Manifest Host** | Loads one known module without a manifest or route resolution — a hand-rolled import-map entry, or a direct URL import. Reference material, not a flow destination. |
| **Module Boundary** | Slice renders as a component inside the host's own framework tree, via the host's native lazy/Suspense/error-boundary machinery. Host and slice share a framework. |
| **Independent Mount** | Slice mounts into a DOM element and owns its own rendering lifecycle/DOM subtree; host interacts only through `mount`/`unmount`. Does *not* imply isolation of any kind. |
| **mount contract** (lowercase, unchanged) | The literal exported interface — `mount(target, context?)` / `unmount()` — distinct from the Independent Mount pattern name. |
| **Direct** | Module Boundary export style: slice's default export *is* the component. React only (`createDynamicModuleBoundary()`). |
| **Injected** | Module Boundary export style: slice's default export is `(deps) => Component`. React and Vue (`createInjectedModuleBoundary()`). Existing App is a featured *use case* of this, not a separate pattern. |

## Decided: flow logic (final)

Two questions, no host-type question in the primary flow — every currently-recommended path uses
a Manifest Host, so that axis doesn't need to gate the flow:

1. **How should the slice render?** → Module Boundary / Independent Mount.
2. **(Module Boundary only) How does the slice receive its framework?** → Direct / Injected.

Every real answer links straight into that pattern's quick start. Neither gap (Vue + Direct,
No Manifest Host + Independent Mount) is a flow destination; both are documented honestly in
reference material linked from the relevant pattern pages.

## Decisions made as part of writing this document (implementer's calls — flag if any feel wrong)

- **New entry page slug:** `/choose-a-pattern/`.
- **Nav placement:** a new top sidebar group, "Start Here," containing just that one page,
  positioned above "Architecture." Hero's "Get Started" button points here instead of
  `/quick-start/`.
- **Quick Start restructure:**
  - `/quick-start/` stays as a short pattern-first index (links into both sections below) — kept
    for direct nav access by someone who already knows their pattern, not the primary flow entry.
  - `/quick-start/independent-mount/` — `index.mdx` (overview), `react.md` (**new** — written from
    scratch using `createReactAdapter`'s `useRuntimeHost`, mirroring `vue.md`'s structure; this is
    the walkthrough that was missing, not the existing `react.md`), `vue.md` (moved unchanged from
    `/quick-start/vue.md`).
  - `/quick-start/module-boundary/` — `index.mdx` (overview, Direct vs. Injected), `direct.md`
    (moved from the existing `/quick-start/react.md`, relabeled — content is already correct,
    light edit only), `injected.md` (new, React + Vue), `existing-app.md` (moved from
    `/quick-start/existing-app.md`, recontextualized as Injected's featured retrofit scenario).
  - Redirects: `/quick-start/react/` → `/quick-start/module-boundary/direct/`,
    `/quick-start/vue/` → `/quick-start/independent-mount/vue/`,
    `/quick-start/existing-app/` → `/quick-start/module-boundary/existing-app/`.
- **Advanced/reference page:** new page covering No Manifest Host and the gaps, e.g.
  `/quick-start/advanced/no-manifest-host.md`. Linked from the Independent Mount quick starts
  ("want this without a manifest?") and inline from the Module Boundary Direct page specifically
  for the Vue gap.
- **Glossary updates:** rewrite `### Host`; add `### Manifest Host`, `### No Manifest Host`,
  `### Module Boundary`, `### Independent Mount`; update the existing `### Slice conventions`
  entry, which currently says "mount/unmount," "plain component," "injected component" — align
  that language with Direct/Injected/mount contract.

## Left to the builder

- Exact visual design and copy voice of the question-flow component (progressive disclosure,
  back-navigation, results state).
- Exact prose for the net-new Independent Mount: React guide and the net-new Module Boundary:
  Injected guide — structure should mirror the existing `vue.md` (What you'll build / Prerequisites
  / numbered steps). `direct.md` needs only a light relabeling edit of the existing `react.md`
  content, not a rewrite.
- The exact terminology-pass diff for `technical-implementation.md`/`index.mdx` (which specific
  "Host"/"host shell" mentions mean Manifest Host vs. generic Host).
- Exact prose for the new advanced/reference No Manifest Host page.
- Final wording for the "Start Here" sidebar group label if it doesn't fit the site's voice.
- Exact copy for both gap callouts (Vue + Direct; No Manifest Host + Independent Mount) — tone
  should match the rest of the site's direct, unhedged style (see how `existing-app.md` already
  states its own scope limits).

## Builder-check resolutions

A builder-check pass against the actual `react.md`/`vue.md` content and `rmc-toolkit` source
found the content-mapping error described in Intent above, plus the terminology-pass scope
question. Both were brought to the user directly and resolved:

1. `direct.md` is built from the existing `react.md` (light relabel); a genuinely new
   `independent-mount/react.md` gets written using `createReactAdapter` — confirmed buildable by
   reading `packages/react/src/create-react-adapter.ts`.
2. `technical-implementation.md` and `index.mdx` do get the light "Host" → "Manifest Host"
   terminology pass, scoped to a mechanical term swap only.

## Status

Approved terminology and flow logic came from direct conversation with the user plus a shared
decisions document from a sibling session. The builder-check pass above has been resolved and
folded into the sections above. Nothing has been built yet — this document is ready for final
review.
