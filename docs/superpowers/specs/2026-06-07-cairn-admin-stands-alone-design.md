# The admin stands on its own (design)

A design for making cairn's `/admin` surface a self-contained CMS admin: free of the host site's
chrome, fully self-styled with Tailwind and DaisyUI independent of the host, and polished out of the
box. This spec is the design record for a multi-pass initiative. It settles the architecture and the
product decisions, and it outlines the plan decomposition that follows.

## Goal

cairn's admin should behave like a real CMS admin, the way wp-admin stands apart from the active
theme. Three properties define done.

1. The admin (the login page, the auth pages, and the authed shell) renders with none of the
   container site's nav, footer, or width constraints.
2. The admin draws all of its CSS from the engine. It looks identical on every host and needs
   nothing from the host's Tailwind or DaisyUI build.
3. The admin's layout and components reach a professional bar, modeled on a battle-tested reference
   and built in idiomatic DaisyUI.

## Why now

Two production sites already run the admin, and both leak their chrome into it. ecnordic-ski is the
worked example. Its root layout (`src/routes/+layout.svelte`) renders `<Nav>`, a width-constrained
`<main class="container mx-auto max-w-5xl py-8">`, and a `<footer>` around `{@render children()}`.
SvelteKit wraps every route in the root layout with no exception, so `/admin/login` renders the
engine's full-screen centered sign-in card inside the site nav, boxed into the article column, with
the footer below. The authed shell has the same problem. This is the most visible defect a new
adopter hits, and it undercuts the embedded-CMS promise.

The work also lands a deeper correctness improvement. The admin's styling is currently borrowed from
the host, which is fragile (see the next section), and the admin's list and shell UX is thin compared
to a mature admin. Fixing all three together is coherent, because the self-styling pipeline is what
lets the rebuilt, chrome-free admin render correctly on any site.

## The problem, precisely

Three separate gaps, found together while tracing the chrome leak.

### Chrome leak

The host root layout always wraps `/admin`. There is no route-naming escape. `+layout@.svelte` resets
up to the root layout, and nothing escapes the root layout itself. The engine cannot fix this from
inside its components, because it does not own the host's `src/routes/+layout.svelte`. The fix is a
constraint on how the host structures its routes, which the engine has to teach, scaffold, and
demonstrate, plus a one-time retrofit on the two live sites.

### Host-CSS dependence

The engine ships `cairn-admin.css`, which carries only the Warm Stone theme variables
(`[data-theme='cairn-admin'] { --color-primary: ... }`). It carries no classes. Every visible class
the admin uses comes from outside the engine. The DaisyUI component classes (`.drawer`, `.navbar`,
`.menu`, `.btn`, `.input`, `.alert`) come from the host's `@plugin "daisyui"`, and the Tailwind
utilities (`.min-h-screen`, `.flex`, `.p-4`) come from the host's Tailwind build. The engine has no
Tailwind or DaisyUI dependency at all, and its `package` script is a plain `svelte-package` that
copies files. So the admin only looks right by borrowing the host's CSS. The showcase has no Tailwind
and no DaisyUI, so its admin is unstyled today. ecnordic and 907 look fine only because they import
DaisyUI in their root layout. A site that styled itself any other way would get a broken admin.

### Thin UX

`ConceptList` is a flat DaisyUI `menu` of links with a title, an optional date, and a draft badge,
plus an inline create form. It has no search, no sort, no pagination, and no inline row actions.
`AdminLayout` is a single-level drawer with a flat menu and a bare sign-out button. The admin is
light-only. `EditPage`, by contrast, is already strong and keeps its behavior (see "What we
preserve").

## Design

### 1. Self-contained admin styling (the foundation)

The engine ships the admin's CSS precompiled and self-contained, the way a real CMS ships its own
admin theme.

The engine gains `tailwindcss` and `daisyui` as dev dependencies (build-time only, never a consumer
peer dependency). A build step compiles one stylesheet from the admin component source, including the
Tailwind utilities the components use, the DaisyUI component classes they use, and the Warm Stone
theme variables. Tailwind reads the components through an `@source` pointing at `src/lib/components`,
so it emits exactly the classes in use. DaisyUI runs with its built-in themes disabled
(`@plugin "daisyui" { themes: false; }`), so it emits component structure that reads variables at the
point of use, and the hand-authored Warm Stone variables supply the palette.

The whole compiled sheet is scoped so it cannot leak onto the host's pages, and it omits Tailwind's
global Preflight reset in favor of a small reset scoped to the same root. The scope root covers both
the light and dark themes, matching `[data-theme='cairn-admin']` and `[data-theme='cairn-admin-dark']`.
The host's CSS and the admin's CSS then never touch each other, even when both use DaisyUI.

The scoping mechanism is the one open implementation question, resolved by a short spike at the start
of the build pass. The two candidates are native CSS `@scope ([data-theme='cairn-admin'], ...)` around
the compiled output, and a PostCSS pass that prefixes each selector with the scope root (rewriting
`:root` to the scope root and handling the `*` reset). Both give the same guarantee. The spike picks
whichever keeps the build simplest and the output cleanest, and proves no rule escapes the scope root.

The build wiring matters and is itself spike-worthy, because the showcase and the engine's own dev
tooling resolve the engine through its `svelte` export condition, which points at `dist`. The source
keeps a theme-variables partial. The compile step runs after `svelte-package` in the `package` script
and writes the full scoped sheet into the packaged components directory in `dist`, where the
components import it (`import './cairn-admin.css'`). The showcase reads `dist`, so it gets the fully
styled admin with zero Tailwind or DaisyUI of its own. The engine's component tests render from source
against the variables-only partial, which is fine, because they assert markup and behavior rather than
pixels.

Dark mode is a second hand-authored variable block (`[data-theme='cairn-admin-dark']`) mirroring Warm
Stone in dark tones. DaisyUI reads variables at the point of use, so the same compiled component
classes work under either theme. A toggle in the topbar switches the `data-theme` on the admin root
and persists the choice, and the default follows `prefers-color-scheme`. The toggle is implemented
without the `mode-watcher` dependency. A minor hydration adjustment on first paint is acceptable, or a
cookie read in the layout load removes it, and the plan decides on cost.

### 2. The admin UX, rebuilt in DaisyUI

cairn already has working DaisyUI admin components, so this builds on them rather than starting over.
SvelteForge (`ColorlibHQ/svelteforge-admin`) is the visual reference for general layout, structure,
and modal and dialog placement. The build is idiomatic DaisyUI v5 and does not aim for pixel fidelity,
because idiomatic DaisyUI is easier to maintain long term. Each screen is refined with the Playwright
render-and-compare loop (render the screen, screenshot it, compare against the reference, adjust).
Lucide (`@lucide/svelte`) is the admin icon set, added as an engine dependency with per-icon imports
so only used glyphs ship.

Four enhancements land beyond restyling what exists.

- The list becomes a DaisyUI `table` with a search filter, a result count, sortable column headers (an
  ascending and descending indicator), status badges, a formatted date column (`Intl.DateTimeFormat`),
  per-row edit and delete actions, a search-aware empty state, and pagination with a page-size control.
  Filtering, sorting, and pagination run client side over the loaded entries, which suits typical
  content sizes. The new-entry affordance moves to a header primary-action button, and the create flow
  keeps cairn's slug auto-derive behavior.
- The sidebar gets a Lucide icon per nav item and a footer user menu (avatar initials, display name,
  email, role) with sign-out, replacing the bare name in the topbar and the loose sign-out button. The
  nav stays driven by the enabled concepts and role-gated as it is today.
- The topbar becomes sticky and carries path-derived breadcrumbs for orientation inside
  `/admin/<concept>/<id>`, alongside the dark-mode toggle and the user context.
- Dark mode, covered by the styling foundation above.

Two SvelteForge behaviors are worth borrowing as polish, both cheap: a Cmd or Ctrl+B shortcut to
toggle the sidebar, and closing the mobile drawer on navigation. cairn keeps its DaisyUI drawer, so
these are additive behaviors rather than a new component system.

**Shipped beyond this spec.** Plan 2 and the design passes that followed it grew a full visual identity
the original SvelteForge look-only reference did not specify: self-hosted display and body fonts, a brand
tile and wordmark, grouped collapsible nav, a command palette, and the warm-neutral surface treatment.
That identity is documented for an implementing agent in `docs/internal/admin-design-system.md`, which is
the living reference for continued interface work. This spec stays the design intent; the design-system
doc stays the current state.

### 3. The chrome-leak dev guard

The engine cannot prevent the host mistake, so it catches it. `AdminLayout` and `LoginPage`, in dev
only (`import.meta.env.DEV`), walk their ancestor chain on mount. When they find host chrome wrapping
them (sibling elements at the top of `<body>`, or a width-constraining ancestor between the admin root
and `<body>`), they emit a precise `console.error` that names the problem and points at
`docs/admin-route-structure.md`. The guard has zero production cost and changes no rendering. It
surfaces the structural mistake rather than masking it, which is why it is preferred over forcing the
admin to a fixed full-viewport overlay.

**Resolved detection (plan 3).** The primary signal is a width-constraining ancestor: walking from the
admin root to `<body>`, an ancestor whose computed `max-width` is not `none`, or whose width is
narrower than the viewport, is the reliable tell of a host container wrapping the admin. The sibling
signal (substantial elements in `<body>` outside the admin subtree) is noisier, so it rides along as
context inside the one grouped `console.error` rather than firing on its own. The guard never throws.

### 4. The route-structure pattern

The canonical structure gains one rule. The host root layout must be chrome-free, and all public
chrome plus the host's `app.css` live in a public route group.

```
src/routes/
  +layout.svelte        bare: {@render children()} (and, after self-styling, nothing else)
  +layout.server.ts     prerender unchanged
  (site)/               URL-transparent group; URLs unchanged
    +layout.svelte      import '../../app.css' + Nav + <main class="container..."> + footer
    +page.svelte ...    home and the public pages, moved in
  admin/   ...          unchanged; now outside the chrome
  feed.xml/ feed.json/ sitemap.xml/ robots.txt/ healthz/   endpoints; no layout, stay at root
```

Group folders are invisible in the URL, so moving the public pages into `(site)/` changes no paths.
Endpoints render no layout, so they stay where they are. Once the admin self-styles, the host root
layout no longer needs `app.css` for the admin, so `app.css` moves into the group with the chrome and
the root layout becomes bare.

The rule is documented in `docs/admin-route-structure.md` (a new top section on the root-layout
constraint and the group), in the tutorial's chrome milestone, and as the recorded rule for the P4
scaffolder so a fresh scaffold emits the bare root and the `(site)` group from the start.

### 5. The showcase as proof

The showcase stays free of Tailwind and DaisyUI. That is the strongest demonstration that the admin
self-styles, because the admin renders fully styled on a site that has neither. The showcase gains a
`(site)` group with a small amount of plain CSS for a real nav and footer, which demonstrates the
chrome separation without pulling in a framework. The showcase's public routes (`+page`, `[...path]`,
`calendar`) move into the group, and its root layout stays bare.

## What we preserve, and what we skip

cairn's `EditPage` is more capable than the reference's editor and keeps all of its behavior. It
carries the live debounced markdown preview with latest-wins guarding, the schema-driven frontmatter
form that renders by field type, the broken-link and draft and inbound-link guard banners with their
actionable fixes, the slug auto-derive-until-edited, and the accessible polite and assertive live
regions. The live regions stay in preference to toasts, because they announce results more reliably to
screen readers. cairn keeps its own dialogs (`DeleteDialog`, `RenameDialog`, `ComponentInsertDialog`)
and its inline alert banners. This pass restyles these surfaces and does not change their logic.

The reference's machinery that does not fit is skipped, including the bits-ui-backed dropdown, select,
and dialog primitives (cairn uses DaisyUI and its own dialogs), the command palette, the notification
bell, the apps menu, the analytics and charts, the Go Pro CTA, and the `svelte-sonner` and
`mode-watcher` dependencies. cairn stays dep-light, adding only Lucide at runtime and Tailwind and
DaisyUI at build time.

## Reference provenance and license

SvelteForge is used as a rendered visual and layout reference only, and no SvelteForge code is copied.
Its component layer is shadcn-svelte on bits-ui, a different system from DaisyUI, so the DaisyUI
rebuild is an independent implementation by construction. SvelteForge's README claims MIT, but the
repository ships no LICENSE file, which is one more reason to treat it as a look reference rather than
a code source. The dependencies this pass adds are permissively licensed: `@lucide/svelte` is MIT with
a Svelte 5 peer, and `tailwindcss` and `daisyui` are MIT.

## Sequencing and relationship to the roadmap

This initiative is a larger sibling of the planned "Pass C (admin and consumer alignments)" in
`docs/STATUS.md`, and it supersedes the admin half of that pass. The current roadmap (DX-sweep Pass B
next, then the gallery, then the P4 scaffolder) is not reordered by this spec. The user decides where
this initiative slots, and the P4 scaffolder must template the route pattern and consume the
self-styling admin whenever it runs.

The work decomposes into plans by verification surface, which matches this repo's pass-sizing rule.

1. Engine, self-styling and UX (the big pass). The scoped-CSS pipeline, the UX rebuild in DaisyUI with
   the four enhancements, and the dark-mode theme and toggle. The verification surface is the admin
   rendering correctly and self-styled on the framework-free showcase.
2. Engine, chrome isolation. The dev guard, the route-structure docs and tutorial update and
   scaffolder note, and the showcase `(site)` demonstration. The verification surface is the admin
   isolated from host chrome.
3. Site retrofits. ecnordic-ski and 907-life, each its own `site-pass`, pinning the published engine
   version, baring the root layout, moving chrome and `app.css` into `(site)`, and verifying the admin
   and login stand alone.

**Resolved when written just-in-time (2026-06-07).** The decomposition runs as three engine plans, not
two. Plan 1 (the self-styling CSS pipeline) shipped standalone as `0.31.0`, because the `@source` scan
makes the pipeline pick up whatever classes the later UX rebuild adds with no build change, so the
pipeline did not have to wait for the rebuilt components. Plan 2 is the UX rebuild plus dark mode in one
pass: its verification surface is unified (the styled admin on the framework-free showcase, gated by the
Playwright render-compare loop, which captures light and dark together), dark mode is small now that
plan 1 laid the scope root and reset, and the dark toggle lives in the new sticky topbar, so building
the topbar and the toggle together avoids a second touch. Plan 3 is chrome isolation. The engine work
publishes before the site retrofits, so the retrofits can drop `app.css` from `/admin` safely against a
self-styling admin.

**Resolved for plan 3 (2026-06-07).** Brainstorming the plan against the current tree settled four
things. First, the at-rule leak (the carried plan-1 item) is treated as already fixed by chrome
isolation, not by name-mangling. The admin sheet is code-split per route, so it loads only on `/admin`,
and isolation moves the host's `app.css` out of `/admin`, so the admin sheet and any host sheet stop
co-occurring on a page and the global `@keyframes` and `@property` rules have nothing to collide with.
The `engine-isolation` test extends to pin that boundary, and the route-structure doc carries a
known-limitation note (keep `app.css` in `(site)`; do not import admin components onto host pages).
Rewriting 42 `--tw-*` properties and 10 keyframes plus every reference, re-run on each Tailwind or
DaisyUI upgrade, is effort against a collision the route pattern already prevents.

Second, the existing tree narrows the work. `docs/admin-route-structure.md` already exists and covers
the `(app)` group, healthz, and the nested editor path, so plan 3 adds the chrome-isolation section
rather than a new doc. The showcase root layout is already bare with no `app.css`, so plan 3 adds the
`(site)` demo group to prove the pattern rather than to fix a current leak. Third, the dev guard uses
the width-constraint heuristic above as its primary signal. Fourth, plan 3 is engine-only and folds into
the held window as `0.33.0` over the unpublished `0.32.0`; the two production-site retrofits stay
separate `site-pass` work after the engine version publishes.

## Versioning and release

The engine passes bump the minor version (features plus internal change, in the `0.x` line). The held
publish window in `docs/STATUS.md` is respected, this initiative's engine version publishes as part of
that discipline, and it must publish before either site retrofit consumes it. No public API is removed
by the styling work, and the admin components keep their props. New runtime behavior (Lucide icons,
dark mode) is additive for a consumer that mounts the admin through the documented routes. The
changelog carries a `Consumers must:` line for the route-structure change, because a site that hosts
the admin under a chrome-bearing root layout has to adopt the `(site)` group to get the standalone
admin.

## Testing and verification

- The engine isolation test (`src/tests/unit/engine-isolation.test.ts`) extends to assert the compiled
  admin sheet is scoped under the admin root and leaks no global rule (no bare `*`, `:root`, `html`, or
  `body` selector outside the scope), and that it contains the DaisyUI component classes and Tailwind
  utilities the admin uses.
- Component tests cover the new data-table list (search, sort, pagination, empty state, row actions)
  and the sidebar user menu, and they confirm `EditPage` behavior is unchanged.
- The Playwright render-and-compare loop drives the styled admin on the framework-free showcase and
  captures screenshots for the visual gate, which also proves the self-styling guarantee end to end.
- The dev guard is unit-tested for both the wrapped and the standalone ancestor shapes.
- The full engine gate runs at each pass end (`npm run check` 0/0, `npm test` exit 0,
  `check:reference`, `check:package`, `check:docs`), plus the live `/admin` smoke for the UI change.
- Each site retrofit verifies a production build green and the admin and login standing alone against
  the published engine.

## Scope boundaries

This initiative does not add a command palette, a notification center, analytics, or charts. It does
not change the auth flow, the commit pipeline, the content model, or any delivery surface. It does not
change `EditPage` behavior or the content-graph guards. It restyles and restructures the admin, ships
the admin's CSS, isolates the admin from host chrome, and retrofits the two sites.

## Open questions and spikes

- The CSS scoping mechanism (native `@scope` versus a PostCSS selector-prefix pass) and the
  dist-compile plus showcase-consumption chain are validated by a spike at the start of plan 1, before
  the UX rebuild leans on them. This is the Plan-07 locked-build-assumption lesson applied first.
- For dark-mode first paint, the plan-2 decision (2026-06-07) is the cookie read in the layout load. The
  toggle writes a cookie and the admin layout load reads it to SSR the initial `data-theme`, so a
  dark-mode user sees no light flash on first paint. The admin layout load already runs for auth, so the
  added cost is one cookie write and one read. The default still follows `prefers-color-scheme` when no
  cookie is set.
