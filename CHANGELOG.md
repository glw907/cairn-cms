## 0.80.0

<!-- release-size: minor -->

### Waymark starter components (showcase/template only; no consumer action)

- The starter template gains six content components, each a worked `defineComponent` with a
  schema-driven picker form: `icon` (renders only names from the adapter's declared icon set,
  loud failure on an unknown name), `video` (a zero-request static facade that links out;
  in-page embedding would need `iframe` through the sanitize floor and is deliberately not
  done), `pull-quote`, `cta`, and `faq` (native `details`, markdown-capable answer slot).
- The converter island demo is retired. Its replacement exemplar is an expiring-announcement
  banner: frontmatter-date-driven, hides itself after expiry (checked at both build and
  hydration), renders nothing on an invalid date.
- Not shipped, recorded: `figure` needs no component (the engine owns `:::figure` natively;
  the name is reserved), and `gallery` waits on the component-attribute image gap filed in
  ROADMAP.

# Changelog

All notable changes to this project are recorded here, most recent first.

## Unreleased

### Showcase (Waymark template; no consumer action)

- The starter template's default theme is neutral. The display face is Figtree, a humanist
  sans matching the body's Source Sans 3, in place of the display serif Fraunces; the paper
  ladder drops its warm hue tint for a clean near-white/near-black progression; and the
  display type steps (`h3` through `h1`) sit one step back on the scale. The three signature
  prose gestures, the cairn-glyph `hr`, the diamond `ul` bullet, and the margin-hanging
  pull-quote, move behind an opt-in `.prose[data-flourish]` hook in `prose.css`, kept in place
  for the planned cairn theme layer to re-enable with one attribute.
- A design-review craft pass on the neutral template: the header and footer inner content now
  caps at the same reading measure as the article and home body, so the chrome's left edge
  lines up with the body copy instead of centering independently at a wider band; the uppercase
  eyebrow label is dosed down to where it differentiates two sections on the same page (the
  home's new "Latest"/"Archive" split) rather than repeating on every masthead; the home gives
  its newest entry a lead treatment above a tightened archive index; and the styleguide now
  demonstrates the full component kit (`icon`, `cta`, `video`, `faq`, and the real `pull-quote`
  directive in place of a hand-styled paragraph), a lone FAQ renders in its own bordered
  container, an empty callout points list no longer leaves a phantom gap, markdown nested in a
  callout/alert/FAQ slot scales down instead of rendering at full display size, and the two
  demo code samples are reworded to fit the column instead of clipping mid-word.
- A viewport-extremes audit at 320px and 2560px: a markdown table used to satisfy its own
  `width: 100%` by wrapping words inside a cell, breaking an inline code token like
  `[text](address)` across lines at a narrow width. Every other hunted surface (the video
  facade, the CTA button, FAQ, the banner island, image figures, code blocks, and the
  tag-filter chips) held up at both extremes with no change needed.
- That audit is now a permanent gate: `site-visual.spec.ts` adds light-theme pixel baselines for
  the home page and the reading-surface article at 320px and 2560px, plus one mid-width (1920px)
  baseline on the article that pins the fluid root-scale clamp's active interpolation slope, not
  just its floor and cap.
- A follow-up a11y review of that audit's own fix found it fixed the 320px squeeze but broke
  WCAG 1.3.1: putting `display: block; overflow-x: auto` directly on the `<table>` strips its
  row/cell roles from the accessibility tree in every current engine. Every rendered table now
  sits inside a `.table-scroll` wrapper instead, a small rehype step in the showcase's own render
  pipeline (`table-scroll.ts`, composed onto `renderMarkdown`'s output in `cairn.config.ts`); the
  wrapper carries `role="region"`, a `tabindex` and an `aria-label` naming the table, and the
  scroll, while the table itself keeps `display: table`. The same review flagged the footer nav
  for WCAG 2.5.8: it now carries the same `flex-wrap` and 44px-class tap targets the header nav
  already had. The pixel baselines above are regenerated for both changes.
- The header gains a manual light/dark toggle (`SiteHeader.svelte`), the template's answer to a
  known extensible-lens gap: a returning visitor's choice persists to a `cairn-site-theme` cookie,
  read by a no-flash inline script in `app.html` before first paint; with no stored choice,
  `data-theme` stays unset and the existing `prefers-color-scheme` default still drives the page
  live, with no JS at all. `theme.css`'s dark custom-token block (the on-surface inks, the
  elevation pair, the CTA, the code ramp) gains a `:not([data-theme])` guard alongside a new
  unconditional `[data-theme='cairn-dark']` block, so an explicit choice overrides the system
  scheme for the custom tokens the same way it already does for DaisyUI's own compiled role
  tokens. The added control widens the header row slightly, so the nav wraps onto its own line a
  little earlier at the standard desktop width; the affected pixel baselines are regenerated.

### Editor

- Pasting rich text from Word, Google Docs, or a web page now converts headings, emphasis,
  links, and lists to markdown instead of dropping all formatting; plain-text and image
  paste are unchanged.
- Component blocks open folded when an entry loads; the touch-to-unfold safety invariant is
  unchanged.
- The editor footer shows a live count of open check issues beside the word count (visible
  counterpart of the screen-reader announcer).
- The in-editor cheat-sheet lists undo and redo.
- Editor-facing vocabulary: the create dialog, rename dialog, and media forms say "Address"
  (formerly "Slug"), and the admin sidebar's media item says "Library".

### Added

- `createRenderer`'s `RendererOptions` gains a `remarkPlugins`/`rehypePlugins` seam: a site's own
  unified plugins run after cairn's own markdown- and hast-stage steps, over the already-built
  tree, in place of re-parsing `renderMarkdown`'s output string. Both owned sites' local
  table-scroll post-processing (a hand-rolled `unified().use(rehypeParse, ...)` pipeline run over
  the returned HTML) migrates onto `rehypePlugins`. No consumer action required; the addition is
  additive.
- Every rendered table is now wrapped in a labeled, keyboard-reachable `role="region"` scroll
  region by default (the same `table-scroll` fix both owned sites independently hand-wired), a new
  `RendererOptions.tableScroll` (default `true`) opts out. The showcase and both owned sites delete
  their local `table-scroll.ts` wiring in favor of the built-in default. No consumer action
  required for a site with no local table-scroll wiring of its own; a site that already wraps
  tables itself sets `tableScroll: false` to avoid a doubled wrapper.
- `sitemapView` gains a fourth `extraRoutes` argument: a site's own bespoke, non-concept pages (an
  about page, a tag index), as root-relative paths, become origin-anchored `SitemapUrl`s ahead of
  the concept URLs, so a whole sitemap route can come from one call instead of a hand-built array.
  A new `unlistedRoutes` helper flags a site's static page-route ids missing from that same list, so
  a forgotten page directory fails the site's own test suite instead of shipping a silent sitemap
  gap. No consumer action required; both additions are additive.
- `CairnHead` gains an optional `titleTemplate`, a `(title: string) => string` callback carrying
  a site's own title-suffix convention (for example the `· 907.life` or `— ECXC` pattern each
  owned site was hand-building at every call site). It applies to `seo.title` only when `title`
  is left undefined, so an explicit `title` or `title={false}` still wins. Both owned sites'
  entry pages migrate their inline title-suffix string onto it. No consumer action required; the
  addition is additive.

### Fixed

- `examples/showcase/svelte.config.js` now sets `csrf: { checkOrigin: false }`, matching the
  deploy guide's instruction (cairn's guard owns admin CSRF).
- The `media.upload_failed` log event's documented-but-never-populated `code` field is
  reconciled with the emitters.
- `theme.css`'s fluid type scale was compounding with `site.css`'s root clamp: both are
  viewport-driven, and a step expressed in `rem` multiplies whatever the root's own clamp
  currently is, so body text overshot to about 21 to 22px at desktop-and-up widths instead of the
  intended high-17s. Every `--text-step-*` ceiling is rescaled by the same factor (holding every
  step-to-step ratio) so body tops out at 17px on its own before the root clamp takes over, landing
  at about 17px at 1440px and about 19px at 2560px. A site that copied `theme.css` during
  scaffolding (as a re-skin's starting point) and did not touch the type scale should pull the
  same rescale.
- Follow-up to the type-scale fix above: rescaling the ceiling by the same factor as the floor also
  shrank the mobile size (body would have read about 14.85px at 320px), and the mobile end never
  had the overshoot problem the ceiling rescale fixes. Every `--text-step-*` floor now keeps its
  original, pre-rescale value, with each step's middle term recomputed for a smooth interpolation
  between that floor and the rescaled ceiling; body stays a comfortable ~17px from 320px up. A site
  that already pulled the ceiling rescale should pull this floor correction too.

### Documentation

- The documentation tree rewritten end to end against the approved information
  architecture: new front doors, the editor arm, 25 guides, a consolidated explanation arm,
  reference restructures, and a rewritten ten-milestone tutorial with typechecked snippets.
  No consumer action required.
- New doc gates: `check:snippets` typechecks every fenced code block against the built
  package; the suspended reference, signature, and link gates are re-enabled; a monthly
  cloud drift routine samples published pages against the code
  (`docs/internal/docs-maintenance.md` records the system).

### Chassis boundary (showcase; internal reorganization, no consumer action)

- The showcase's `src/lib` splits into `src/chassis/` (the genre-free layer: delivery content
  and feed wiring, the one server-side runtime composition point, the dev-backend feature
  flag, the component-grammar icon wiring, the light/dark toggle mechanism, the token system,
  the prose foundation, and the card/band/section/hero/sidebar composition primitives) and
  `src/theme/` (Waymark's own adapter config, chrome components, and real color/type values),
  with `$chassis`/`$theme` SvelteKit aliases mirroring the split. `src/chassis/README.md`
  states the boundary rule ("a theme is everything that isn't chassis"), every override seam,
  and a removal note per element proving the chassis is subtractable, not a fixed contract; a
  new `check:chassis-boundary` gate fails any theme import that reaches chassis internals
  instead of one of the documented seams. Both owned sites (907.life, ecxc.ski) restructured
  onto the identical split in their own repos, verified against their live sitemaps with an
  exact permalink crawl and no rendering change. No consumer action required: the package's
  public API is unaffected, and a site that has not adopted this showcase reorganization loses
  nothing.
- `composition.css` gains a sticky-footer flex-column recipe, `.cairn-site-shell` /
  `.cairn-site-main`, harvested from the first theme port (AstroPaper): a flex item's own width
  is auto and does not resolve against the flex line the way a plain block's width does, so a
  wide descendant anywhere inside a growing `<main>` silently breaks the layout at narrow
  viewports unless the item carries an explicit width. `.cairn-site-main` bakes the fix in so
  the next theme adopting this shape gets it for free. No consumer action required.

### Editor experience

- The create dialog, the Change URL control, and the media library's asset metadata form now
  label an entry or asset's URL field "Address" rather than "Slug", matching the vocabulary the
  docs already used. The matching validation errors (an invalid value, a collision, a no-op
  rename) read "address" instead of "slug" too. The stored field name and every internal
  identifier stay `slug`; only the editor-facing copy changed.
- Pasting rich text from Word, Google Docs, or a web page now converts its formatting to
  markdown instead of dropping it: headings, bold and italic emphasis (including Google Docs'
  style-attribute runs), links, and bulleted or numbered lists all arrive as the matching
  marks. Anything else (a table, an image, code, a blockquote, strikethrough) degrades to its
  plain text. Plain-text paste and image paste are unchanged. New dependencies: `rehype-parse`
  and `rehype-remark`, both official unified.js packages already alongside `rehype-sanitize`
  and `remark-rehype`.

## 0.79.0

<!-- release-size: minor -->

The pre-beta surface-pruning pass shrinks and firms the public contract to exactly what the beta
freeze will promise. An adversarial audit (19 agents: a prosecutor per export subpath, an Opus
defender, three shape auditors) convicted every demoted name for having no real consumer import
across the showcase, ecxc-ski, and 907-life; `docs/internal/api-surface.md`'s diff for this pass is
the exhaustive, generated list, since the counts below summarize rather than enumerate.

The root `@glw907/cairn-cms` barrel sheds 72 content-graph, manifest, component-grammar, and
field-arm internals plus the duplicate `ResolvedReference` re-export (its home is `/delivery`);
every demoted symbol keeps living in its module for the engine's own relative imports, nothing is
deleted. `/sveltekit` loses `isPublicAdminPath`, `parseAdminPath`, `AdminView`, and `NavRoutesDeps`,
and `ContentRoutesDeps` loses its `backend` test-injection member from the published type (the
factories now resolve their backend from `event.locals.backend`, the same seam the dev double
already rides). `/components` loses `ComponentInsertDialog`, `ComponentForm`, `IconPicker`, and
`LinkPicker`, plus the three `spellcheck-worker`/`spellcheck-assets` export-map keys;
`MarkdownEditor` already resolves the spellcheck worker and its two assets itself through a
module-relative `new URL(..., import.meta.url)`, so no consumer needs a frozen public subpath for
them, and the showcase's spike route that imported them is deleted. `/delivery` and
`/delivery/data` each lose `createSiteResolver`, `ConceptIndex`, `createContentIndex`, `RawFile`,
`fromGlob`, `wordCount`, and `permalink`, all internals of the `createSiteIndexes` hand-assembly
escape hatch. `/media` loses 14 names: the manifest CRUD, the content-hash naming helpers, the
Cloudflare Images transform-URL builders, and `manifestMediaResolver`. `/vite` loses
`writeManifest`, `readAdapterFacts`, `AdapterFacts`, `verifyManifestFromVite`,
`buildManifestFromVite`, and `stripCairnManifest`, keeping only `cairnManifest` and
`CairnManifestOptions`.

Five shape reshapes ride the same window. `ConceptConfig.routing` closes to the
`'feed' | 'page' | 'embedded'` shorthand union; the `RoutingRule` object form leaves the barrel, and
`resolveRouting` now throws on a defined-but-unrecognized routing value instead of silently
resolving to `undefined`, closing the runtime edge a cast can still reach around the closed
compile-time union. `parseSiteConfig` becomes loud about the config boundary: an unrecognized
top-level `site.config.yaml` key throws, and a closed set of adapter-owned keys
(`content`, `backend`, `email`, `rendering`, `media`, `editor`) names `cairn.config.ts` as their
correct home. `createMediaRoute` now takes the composed `runtime` and reads `resolvedAssets`
itself, matching every other route factory's convention, so `ResolvedAssetConfig` stops being
load-bearing `/sveltekit` surface (it stays exported from `/media`). `CairnAdminDeps` and
`ContentRoutesDeps` regroup their flat `branding`/`send`/`anthropic`/`tidyTimeoutMs` members into
two cohesive bags, `auth` and `tidy`. A new `CairnPlatformBindings` interface names every binding
the engine reads off `platform.env` at runtime: `AUTH_DB`, `EMAIL`, `PUBLIC_ORIGIN`, and
`GITHUB_APP_PRIVATE_KEY_B64` are required, and the opt-in tidy action's `ANTHROPIC_API_KEY` is
optional, so an `app.d.ts` intersection missing a required binding now fails at compile time
instead of surfacing as a runtime `config.bindings-missing` error. The GitHub App's id and
installation id are not runtime bindings; they are compile-time adapter config passed to
`githubApp({ appId, installationId })`. A separate `CairnMediaBindings` carries `MEDIA_BUCKET`,
present only on a media-enabled site. Finally, `src/lib` leaves the npm tarball's `files` array; the package ships only `dist` and
`CHANGELOG.md`, and a packaging boundary test locks a deep import of shipped source or an
unexported `dist` path to fail closed with `ERR_PACKAGE_PATH_NOT_EXPORTED`.

The pass also lands the gate-enforced three-tier stability vocabulary: `Extension API` and
`Scaffold API` (both existing) are the frozen contract, and a new `Unstable API` tier marks an
export that stays importable with no stability promise across minors. `check:reference` now fails
on any enumerated export missing a tier and on any backticked name in a page's export table or
heading that no longer exists in that subpath's exports (the reverse stale-prose lock). The sweep
assigns `Unstable API` to the eleven page-level components, the four piecewise route factories and
their config/deps/result satellite types, and `feedView`; `MarkdownEditor`'s stable contract
narrows to eleven props (`value`, `name`, `registerInsert`, `registerFormat`,
`completionSources`, `focusMode`, `typewriter`, `surface`, `spellcheck`, `spellcheckDictionary`,
`siteDictionary`), with every other prop documented as `Unstable API` `EditPage` wiring.

This is breaking. Consumers must:

- Import `ResolvedReference` from `@glw907/cairn-cms/delivery`, not the root barrel (no known
  consumer imported it from root).
- Pass the runtime to `createMediaRoute(runtime)` instead of `runtime.resolvedAssets`.
- Regroup `createCairnAdmin` deps: `anthropic` becomes `tidy.client`, `tidyTimeoutMs` becomes
  `tidy.timeoutMs`, and `branding`/`send` become `auth.branding`/`auth.send`.
- Declare a concept's `routing` with only the string shorthand; the `RoutingRule` object form no
  longer type-checks or resolves at runtime (no known consumer used the object form).
- Fix a `site.config.yaml` that carries an adapter-owned or otherwise unrecognized top-level key;
  `parseSiteConfig` now throws with the key's correct home.
- Declare `Platform.env` via `CairnPlatformBindings & CairnMediaBindings & { /* the site's own
  bindings */ }` (recommended, not strictly required) instead of hand-listing each binding.
- Stop importing any name demoted above; `docs/internal/api-surface.md`'s diff for this pass is
  the authoritative list, and grepping the showcase, ecxc-ski, and 907-life found no consumer
  import touching any of them, so no site is known to need this action.

The code-polish pass converges the whole engine, the gate scripts, the tests, the Wayfinder
showcase, and the dev package on one agent-facing idiom charter (`docs/internal/code-idioms.md`),
behavior-preserving throughout: a survey of ~10 subsystems catalogued every divergent pattern
family (error and result shapes, validation, factory anatomy, module layout, naming, async
patterns, logging, test structure, Svelte component anatomy), and a module-by-module sweep applied
the picked convention with `check:surface` and the signatures gate as a machine-checked invariant
at every cluster. `content-routes.ts`, the codebase's largest file at 3,435 lines and its densest
duplication cluster, decomposes into per-domain internal modules (media, tidy, settings and
vocabulary, dictionary, core content actions) behind an unchanged `createContentRoutes` composer.
The sweep also dedupes real duplication across clusters: the sveltekit-routes cluster's dead
exports and entry-action preamble, the tests cluster's shared harnesses, the admin cluster's
dialog and segmented-control and typed-confirm and fetch idioms (dropping redundant ARIA roles the
convergence made unnecessary), the editor cluster's async-race guards and fetch round trips, the
content and nav-config clusters' shared helpers, the media and delivery clusters' error-message
idiom, the auth-github and tooling and scripts clusters' module layout and indentation, and the
showcase's structural idioms. A new root gate, `check:consumers`, typechecks the showcase and the
dev package against the published surface so a public reshape can no longer silently break either,
closing the incident class the pruning pass's Task 6 surfaced. The admin CSS build's Tailwind
content detection now scopes to the components glob instead of scanning the whole repo, shrinking
the shipped `dist/components/cairn-admin.css` by 31% (415,976 to 286,719 bytes) with the
`admin-visual` baseline proving no real utility dropped. A guarded rider wrote a component-test
suite pinning the leaf-field-rendering family's two deliberately different conventions
(`FieldInput`'s native uncontrolled form participation, `ComponentForm`'s controlled
touched-tracking validation, and the phase-3a multi-instance focus model) before evaluating whether
to merge them; the merge proved architecturally wrong on all four walls the guard suite now pins
permanently, so it did not land (see `ROADMAP.md`, "Later," for the narrower prop-context dedup
that remains).

This is breaking. Consumers must: rename any direct call onto the `createContentRoutes` return that
dropped the `Action` suffix (`mediaLibraryUpload` to `mediaLibraryUploadAction`, `mediaBulkDelete`
to `mediaBulkDeleteAction`, `mediaOrphanScan` to `mediaOrphanScanAction`, `mediaPurgeOrphans` to
`mediaPurgeOrphansAction`, `mediaReplacePreview` to `mediaReplacePreviewAction`,
`mediaReplaceApply` to `mediaReplaceApplyAction`, `mediaAltPreview` to `mediaAltPreviewAction`,
`mediaAltApply` to `mediaAltApplyAction`, `addDictionaryWord` to `addDictionaryWordAction`); the
SvelteKit named-action wire names (`?/mediaBulkDelete` and kin) are unchanged. Unstable API tier
makes the rename legal across minors, and this pre-beta window makes it cheap.

The owner-gated editor-management actions (add, remove, role change) now log `editor.added`,
`editor.removed`, and `editor.role_changed`, each carrying the acting owner's and the target
editor's email and, where relevant, the role, closing the one route-layer path with no audit
trail (`docs/reference/log-events.md`). No consumer action.

## 0.78.2

<!-- release-size: patch -->

The editor's spellcheck and objective-error suggestion popover is now cairn's own recipe DOM, rendered
through CodeMirror's public `showTooltip` facet instead of the skinned `@codemirror/lint` tooltip. It
matches the admin design language (the Warm Stone surface, DaisyUI buttons, the body face) and gains the
keyboard and screen-reader path it never had: the popover appears when the caret enters a flagged word
without stealing focus, a polite live region announces it, `Alt-Enter` moves focus into the popover, and
Escape returns focus to the editor. The misspelling underline keeps its locked amber color, now tuned for
weight and offset. A `check:cm-internals` gate holds the editor theme's coupling to CodeMirror's internal
classes at a by-name floor, so a future CodeMirror major stays cheap to absorb.

The public API and every other runtime behavior are unchanged, so an upgrading site needs no action.

The editor also gains a coherent accessibility model beyond that popover. A debounced, polite live
region speaks a settled summary of the document's diagnostics ("2 spelling suggestions, 1 style
issue"), so an author knows issues exist without hunting for them. `F8` and `Shift-F8` jump the
caret to the next or previous flagged range and land in the existing popover, bound through
CodeMirror's own exported `nextDiagnostic` / `previousDiagnostic` commands. The directive-fold
control now carries `aria-expanded` alongside a state-neutral name, so a screen reader hears the
fold state instead of a verb-shaped label. The editing surface itself (`.cm-content`) carries an
accessible name, "Markdown source", closing a WCAG 4.1.2 gap the surface had from the start.

The public API is unchanged and every addition is on by default with no new prop, so an upgrading
site needs no action.

The showcase starter template is re-expressed in the same native DaisyUI 5.6 and Tailwind 4 idiom as
the admin. Its design-scale tokens moved into Tailwind's `@theme` namespaces (`--text-step-*`,
`--spacing-*`, `--color-muted`), its chrome folded onto named utilities, and its bespoke custom
surface reached the same zero floor the admin holds, gated by `check:custom-surface` on both trees.
The developer-facing role vocabulary is now published as the versioned seam in
`docs/internal/admin-design-system.md`. The template governs newly scaffolded sites; an upgrading
site needs no action.

The Media Library gains direct image upload. Its two Upload buttons and a drop target that accepts a
file anywhere on the page now open the same name-and-describe capture the editor's insert flow uses,
then store the file and commit its record to `main` in one step, so a new image appears in the
Library without opening a post first. Upload is single-file for now, and a re-upload of identical
bytes is a no-op. A freshly uploaded image is unreferenced until you place it, so its where-used
reads "No references found" until then. The change is admin-side and additive, with no public API,
delivery, or manifest-schema change, so an upgrading site needs no action.

## 0.78.1

<!-- release-size: patch -->

The admin interface is re-expressed in native DaisyUI 5.6 and Tailwind 4. The idiomatic re-expression
sweep (Phases 2 through 6) retired the admin's bespoke arbitrary-token color classes (the
`var(--color-muted)` and `var(--color-subtle)` references a component wrapped in square brackets) to the
named `text-muted` and `text-subtle` role utilities across every admin component, ending at a zero
retired-token floor that a `check:custom-surface` gate now holds. The work changes only the admin's
internal styling, which a consumer never imports.

The public API and runtime behavior are unchanged, so an upgrading site needs no action. Phases 0 and 1
of the same sweep (the gate and the role vocabulary, and the vocabulary-screen pilot) shipped in `0.78.0`.

## 0.78.0

<!-- release-size: minor -->

The taxonomy marker now drives a concept's tags. A concept declares its tag field by marking one
top-level multiselect `taxonomy: true`, and the content index reads that field's validated value for
each entry's tags. The content index and the feed categories both read the marked field.
The old behavior read a field hardcoded as `tags`, so a concept whose tag field has another name now
needs the marker. Released as `0.78.0`, the first free minor after the held `0.77.0`; since `0.77.0`
was never published, this publish rolls both windows for a site upgrading from `0.76.0`.

A concept marks at most one top-level field, and the marker is top-level only. The field set
constructor throws at startup on a second marked field or a marker nested inside an `object` or
`array`, the mirror of the single-SEO-image rule. An unmarked multiselect named `tags`, `freetags`, or
`categories` is legal but draws a `taxonomy.unmarked_field` build advisory, since it reads as a tag
field a site forgot to mark.

This is breaking. Consumers must: mark each concept's tag field by adding `taxonomy: true` to its
top-level multiselect. A concept with no tag field needs no change.

`createPublicRoutes` resolves one entry per request path. It returns `{ entryLoad, entries }`;
`entryLoad(event)` returns the entry payload and throws `error(404)` on a miss. The pre-`0.77.0`
`archiveLoad`, `tagIndexLoad`, and `tagLoad` loaders are removed: cairn ships no public tag pages, and a
site renders an archive from `site.concept(id).all()` and a tag list from the tags-as-data on
`ContentSummary.tags`.

This is breaking. Consumers must: drop any call to the removed `archiveLoad`, `tagIndexLoad`, or
`tagLoad`; render those surfaces from `site.concept(id).all()` and `ContentSummary.tags` in site code.
The catch-all keeps calling `entryLoad`; no `data.kind` branching is needed.

A site can now configure an editor-owned tag vocabulary. A new `vocabulary` key in `site.config.yaml`
lists the allowed tags as `{ value, label }` entries, validated at build through the new public
`validateVocabulary`, `extractVocabulary`, and `setVocabulary` functions and the `VocabularyEntry` type.
Once a site configures a vocabulary, the concept's taxonomy field (the multiselect it marks
`taxonomy: true`) becomes a closed picker on save and on edit: the editor picks from the configured
tags, and a save of a value that is neither in the vocabulary nor already on the entry is rejected. A
value already on an entry that the vocabulary does not list, an orphan, is preserved, never silently
dropped, and renders flagged "not in your tag list." `ManifestEntry.tags` now carries each entry's
projected tags.

This is opt-in and non-breaking. A site with no `vocabulary` key is unaffected: the taxonomy field
stays the open creatable multiselect it is today. The build read is unchanged, since tags-as-data is
identical with or without a vocabulary; enforcement is a save-and-edit concern only. Consumers must:
nothing.

An editor can now curate the vocabulary from the admin. A new `vocabulary` admin view at
`/admin/vocabulary`, with a `saveVocabulary` action, lets an editor add a tag, rename a tag's label,
delete an unused tag, and seed the list from tags already in use on posts but absent from the
vocabulary. Deleting a tag that is in use across the default branch or any open edit branch is
rejected, failing closed, so a tag stays until the posts that use it drop it. The screen commits the
curated list to the `vocabulary` key in `site.config.yaml`. The size-gated archive tag filter is a
showcase and template surface, the site's own design over `ContentSummary.tags`; cairn ships no public
filter component.

This is opt-in and non-breaking. The screen appears for any site, and edits it only when an editor
saves; a site that configures no vocabulary simply curates an empty list. Consumers must: nothing.

## 0.77.0

<!-- release-size: minor -->

The developer-extensibility seam: a site can add its own admin screen as a normal SvelteKit route under
`/admin/`, rendered inside cairn's chrome, behind the editor login, with a data-only sidebar entry. This
entry covers Plan 1 (the capability); the boundary-enforcement work (Plan 2) lands under the same `0.77.0`
and the release ships once both are in, so this version stays unpublished until then. cairn is still `0.x`
and the contract may change again before a stable 1.0; this release is breaking and applies the "Consumers
must" steps below.

What changed. cairn's admin chrome moves out of the `CairnAdmin` view switch into a shared
`/admin/+layout.svelte` that renders the new exported `CairnAdminShell` component. The catch-all
`/admin/[...path]` route now renders bare inside that shell. A concrete route you add, such as
`/admin/signups`, wins over the catch-all and inherits the admin guard, so `locals.editor` and the
exported `requireSession`/`requireOwner` helpers work with no extra wiring. A new `adminNav` config field
on the adapter's `editor` group adds a sidebar entry as plain data, validated at startup against a typed
icon allowlist and the built-in routes. See [Add a custom admin screen](docs/guides/add-a-custom-admin-screen.md).

The enforced boundary (Plan 2). The public surface is now a versioned, enforced contract, not merely a
documented one, so an extension survives engine updates and a surface change is a deliberate, visible event.
Every export is labeled `Stability tier: Extension API` (hand-author against this; promised hardest) or
`Stability tier: Scaffold API` (generated by `create-cairn-site`), and a build-time gate snapshots the full
declared shape of every export and fails loud on undisclosed drift. `cairn-doctor` gains a best-effort,
non-blocking check that nudges when the four-file `/admin` mount looks incomplete. These are engine-internal
gates; the consumer-visible change is the per-export stability tiers in the reference docs and the
`LayoutData` removal below.

This is breaking. Consumers must, in order:

1. Add the shell layout mount. Create `src/routes/admin/+layout.server.ts` with `export const load =
   admin.shellLoad;` and `src/routes/admin/+layout.svelte` that renders `<CairnAdminShell
   data={data.shell}>{@render children()}</CairnAdminShell>`. The chrome no longer rides the catch-all
   load; it rides this layout. Copy the showcase files at `examples/showcase/src/routes/admin/`.
2. Rename `AdminLayout` to `CairnAdminShell`. The component export is renamed. A site on the canonical
   single-mount never imported it directly, so this affects only a hand-rolled per-route mount.
3. Read `siteName` and other shell fields from `page.data.shell`, not `data.layout`. The per-view
   `AdminData` members no longer carry a `layout` field; the shell payload is the one source.
4. No action for `requireOwner`. It now accepts a minimal `{ locals: { editor } }` event, which widens
   the old signature, so existing callers keep working and a custom route can pass its standard load
   event.
5. Remove any `import type { LayoutData }`. `LayoutData` is removed from `@glw907/cairn-cms/sveltekit`;
   read the admin payload from `AdminShellData` (via `page.data.shell`) instead.

## 0.76.0

<!-- release-size: minor -->

The Contract v2 rollup, plus content islands, published as one release. cairn is still `0.x` and the
contract may change again before a stable 1.0. This consolidates the unpublished `0.69.0`–`0.75.0`
development minors plus islands into one published `0.76.0` release. The last published release was
`0.68.0`, so a consumer crosses the whole window in a single jump and applies the "Consumers must" steps
below; the granular per-phase history lives in `docs/STATUS.md` and the plan post-mortems.

What changed. The field system unifies on the `fieldset({...})` record built from the `fields.*`
constructors, the one live field system for concepts and directive components alike, with the leaf
vocabulary (`text`, `textarea`, `number`, `select`, `multiselect`, `url`, `email`, `date`, `datetime`,
`boolean`, `image`, `icon`, `reference`) plus the `object` and `array` containers. The adapter moves from
flat keys into six subsystem groups (`content`, `backend`, `email`, `rendering`, `media`, `editor`), and a
concept owns its own URL policy through `defineConcept`. The `backend` becomes a `Backend` interface behind
a `githubApp(...)` provider, so content stays build-time over the committed manifest and no runtime database
slips in. The `render` seam becomes the entry-aware `render({ body, concept?, frontmatter?, resolve?,
resolveMedia? }) => Promise<string>`. Content islands add opt-in client interactivity over a static, no-JS
fallback. References and structured fields arrive additively.

This is breaking. Consumers must, in order:

The field system (replaces the v1 `defineFields`):

1. Move each concept's `schema` from `defineFields([...])` (an array) to `fieldset({...})` (a record).
2. Drop the per-field `name`; the record key is now the frontmatter key.
3. Rename field help from `description` to `help`.
4. Move a closed `tags` field to `fields.multiselect({ options: [...] })`, and an open `freetags` field to
   `fields.multiselect({ creatable: true })` (its `placeholder` is preserved).
5. Preserve each field's frontmatter key, especially `tags`, or tag pages and feeds read empty.
6. Extract a frontmatter type with `InferFieldset`, and drop imports of the removed `defineFields`,
   `ConceptSchema`, `Infer`, `InferFields`, `DefineFieldsOptions`, `FrontmatterField`, `TagsField`, and
   `FreeTagsField`.

The adapter and concepts:

7. Regroup the adapter into `content`/`backend`/`email`/`rendering`/`media`/`editor` (`sender` to `email`,
   `render`/`registry`/`icons` to `rendering.{render,components,icons}`, `assets` to `media`,
   `navMenu`/`preview`/`supportContact` to `editor.{nav,preview,supportContact}`).
8. Rename each concept's `schema:` to `fields:` and declare it through `defineConcept`.
9. Move `permalink` and `datePrefix` from the YAML `content:` block onto the concept via `defineConcept`,
   and declare each concept's routing with the routing shorthand. A leftover YAML `content:` block now
   throws at `parseSiteConfig`.
10. Move `siteName` out of the adapter into the YAML site-config.

Directive components:

11. Declare each component's `attributes` as a `fields.*` record (was an `AttributeField[]` array), a
    repeatable slot's `itemFields` the same way, and wrap each component in `defineComponent({ ... })`.
12. Move any cross-field attribute `validate` into the component's `behavior` table with the
    `validate(value, siblings)` signature, reading `siblings.min` rather than `all.attributes.min`.
13. Replace a `pattern: { source, message }` attribute with `fields.text({ pattern })` plus a
    `behavior.validate` for a custom message, and drop imports of `AttributeField` and `FieldType`.
    Attribute validation now format-checks every value, so a directive that previously saved a malformed
    value now fails `validateComponent`.

The backend:

14. Change the adapter's `backend` from a `{ owner, repo, branch, appId, installationId }` object literal to
    `backend: githubApp({ ... })`, importing `githubApp` from `@glw907/cairn-cms`. Drop imports of the
    removed `BackendConfig`, `RepoRef`, and `AppCredentials`, and replace `GithubKeyEnv` (from the
    `/sveltekit` subpath) with `BackendEnv`.

The render seam:

15. Change the adapter `render` from `(md, opts) => ...` to
    `({ body, resolve, resolveMedia }) => ...`, read the markdown from `body`, and return a
    `Promise<string>` (a typical body is `renderMarkdown(body, { resolve, resolveMedia })`). Drop any
    `stagger` option; `data-rise` is now always emitted and is inert without `[data-rise]` CSS. The
    attribute now appears in all rendered output, including the syndication feeds and prerendered pages,
    so a consumer that snapshots rendered HTML sees it.

Additive in this window, with no action required to keep working: reference fields (`fields.reference` and
`fields.array(fields.reference(...))`), structured fields (`fields.object` and the generalized
`fields.array`), and content islands (`hydrate` on a component, `rendering.islands`, and the `./islands`
runtime). Adopt them through their guides: [references](docs/guides/link-content-with-references.md),
[structured fields](docs/guides/structured-fields.md), and [islands](docs/guides/add-an-island.md).

ecxc-ski and 907-life stay pinned to the prior version range until they cut over. See [Upgrading
cairn](docs/guides/upgrade-cairn.md) for the per-change actions.

## 0.68.0

<!-- release-size: minor -->

The second pre-cutover engine-hardening pass clears eight engine-misc items: two admin accessibility
fixes, an engine default-icon fallback, and gate, doc, and tooling hygiene.

The component picker dialog now caps its height at 85vh and scrolls its catalog within a held header
and footer, so a long catalog no longer takes the page over. A repeated content-lifecycle error in the
concept list now re-announces to a screen reader: the errors route through one polite live region that
re-speaks an identical message through an invisible nonce, and the visible alerts drop their redundant
`role` so the message announces once.

The component registry ships a default role-to-glyph fallback for the conventional admonition roles
(`note`, `tip`, `important`, `warning`, `caution`, `info`, `danger`). A component that declares an icon
field but no `defaultIconByRole` entry for a role now resolves the engine default, which a site's icon
set styles; a component's own `defaultIconByRole` still wins. The `ComponentDef.icon` and
`defaultIconByRole` guidance now states the "logically representative, prefer distinct" rule.

Three gates and one doc tightened: the admin-prose gate now scans the `.ts` copy modules it skipped, a
new `check:dev-package` gate type-checks and comment-lints `packages/**` in CI, the two
`rehype-dispatch` helpers gained real doc contracts, and the friction log marks its killed and shipped
items resolved so it stops resurfacing dead work.

No consumer action is required. The accessibility fixes and the icon fallback are additive; a site using
the registry's `defaultIcon` may now see an engine default glyph where it previously saw none.

## 0.67.0

<!-- release-size: minor -->

The Contract v2 `fieldset` validator reaches constraint parity with `defineFields`, the first of two
pre-cutover engine-hardening passes. Both validators now call one shared constraint module, so they
cannot drift, and a v1-vs-v2 parity matrix proves they agree on the overlapping field types.

The `fieldset` validator gains the checks it lacked. A `text` or `textarea` field now enforces its
`min`, `max`, `length`, and `pattern`, and a `date` field enforces its `min` and `max`, with the same
messages `defineFields` produces. A malformed `pattern` now fails at `fieldset()` call time, not on
every save, the way `defineFields` already compiled patterns at declaration. The validator also reads a
parsed value, not only a form string: a numeric `number` (a finite `0` included), a `Date` on a
`datetime` field, the way the `date` field already coerced a parsed `Date`. A `multiselect` given a lone
scalar (a single hand-edited `tags: news`) coerces it to a single-element list rather than dropping it
or reporting a misleading "required".

No consumer action is required. The `fieldset` surface is still additive and not yet wired into the
adapter or editor, and the new behavior brings it in line with the long-standing `defineFields` checks.

## 0.66.0

<!-- release-size: minor -->

Contract v2 begins with an additive `fields.*` field vocabulary, exported beside the existing
`defineFields` model. The new surface is opt-in and does not yet wire into the adapter or editor, so a
site on the current field model is unaffected.

A concept can declare its fields as a record of `fields.*` constructors, each returning a plain-data
descriptor. The scalars are `text`, `textarea`, `number`, `select`, `multiselect`, `url`, `email`,
`date`, `datetime`, and `boolean`, with `image` as the rich leaf. `fieldset(record)` derives a
server-side validator from those descriptors, returning field-keyed errors or normalized data, and
exposes Standard Schema v1 at its boundary. `InferFieldset` reads the inferred frontmatter type from a
fieldset, and `initialValues` resolves each field's `default` for the editor form, including the
`'today'` sentinel on a date field through an injected clock. The new root-barrel exports are `fields`,
`fieldset`, `initialValues`, and the types `FieldDescriptor`, `Fieldset`, `InferFieldset`,
`FieldsetOptions`, and `BehaviorTable`.

No consumer action is required. The vocabulary is a foundation; the contract-v2 cutover, a later
breaking release, migrates concepts off `defineFields` and carries the "Consumers must:" line then.

## 0.65.0

<!-- release-size: minor -->

Build-time syntax highlighting moves into the engine render pipeline, and the public side gains the
Waymark design foundation in the showcase template (the scaffolder's Part B2).

Fenced code is now highlighted at build time. The render pipeline runs Shiki at build and SSR and
emits role-bound `.cairn-tok-*` token classes with no inline style and no client highlighter, so the
reading route ships no highlighter JavaScript and the colors come from the site's theme. The engine
owns the `.cairn-tok-*` class contract (the way it owns `.cairn-place-*` for figures); a site styles
the classes from its own `--cairn-code-*` variables. Adds `shiki` and `hast-util-to-string` to the
engine's dependencies.

GFM task-list checkboxes now carry an `aria-label` from their item text, so a screen reader names the
read-only control. This clears an axe `label` violation on every site while keeping the real disabled
input the design calls for.

No consumer action is required. A site gets highlighting automatically; to color the tokens, style the
`.cairn-tok-*` classes from a `--cairn-code-*` ramp (the Waymark showcase template does this, bound to
the DaisyUI roles). The broader Waymark design foundation (the oklch token layer, the bespoke reading
surface, the chrome, the `/styleguide` route, and the dual-gamut contrast, token-resolution, and
re-skin CI gates) ships in `examples/showcase`, the deployable starter, not the published engine.

## 0.64.0

<!-- release-size: minor -->

A small pre-Part-B DX pass fixes two engine warts the scaffolder's template would otherwise bake in,
and retires a third item that was already resolved.

`readCommittedManifest`, exported from `/media`, reads a committed media manifest from an
`import.meta.glob` result and degrades a missing file to an empty manifest. A fresh site with no
`src/content/.cairn/media.json` no longer fails its build: the static import that crashed gives way to
the glob, which returns `{}` for no match. The showcase reads its manifest this way.

A new `media.resolver_absent` log event (level `warn`) makes a silently-broken public-image setup
diagnosable. The public route emits it once, at construction, when media is configured on but no
`resolveMedia` reached it, so a forgotten resolver wiring becomes a queryable Workers Logs event
instead of a bare `media:` token on every hero image. `PublicRoutesDeps` gains an optional
`assetsEnabled` flag a site threads from its resolved asset config.

No consumer action is required. A site that wants the no-crash manifest read can adopt
`readCommittedManifest`, and a site that wants the resolver diagnostic threads `assetsEnabled` into
`createPublicRoutes`.

## 0.63.0

<!-- release-size: minor -->

The local-development fake backend moves out of the engine and the showcase into a separate, dev-only
package, `@glw907/cairn-cms-dev`, the first part of the `create-cairn-site` scaffolder. The package
holds the in-memory GitHub, R2, D1, and Anthropic doubles and a blessed `devBackendHandle()` that
installs them and an owner-session bypass, so a site runs `/admin` locally with no cloud accounts. A
consumer installs it as a `devDependency` and activates it from `hooks.server.ts` behind a
build-foldable `dev` gate, so a production build eliminates it from the bundle.

The auth guard gains a fail-closed tripwire. If `CAIRN_DEV_BACKEND` is set in a deployed runtime, the
guard refuses the request with a 503 and logs `guard.rejected` with `reason: "dev_backend_in_prod"`.
It reads the flag from both the Worker `platform.env` and `process.env`, so it fires on Cloudflare and
adapter-node alike. `AuthEnv` carries a new optional `CAIRN_DEV_BACKEND?: string | boolean` field for
it.

No consumer action is required. The tripwire fires only when the flag is set, and the new package is
opt-in for sites that want the local dev backend.

## 0.62.2

The edit-load address-collision advisory now checks the published corpus only. It fires when an entry
you are editing collides with an entry already published on `main`, and it no longer reads sibling
`cairn/<concept>/<id>` branches when an editor opens an entry, so opening the editor adds no GitHub
reads. The publish-time re-check is unchanged: it stays full cross-branch and still emits the
`publish.address_collision` log event when a publish overrides another entry's address. No consumer
action is required.

## 0.62.1

The entry editor gains an advisory channel and its first notice: a cross-branch address-collision
warning. When another entry already resolves to the same public address, the editor shows a
non-blocking warning that names that entry and links to it. The warning never blocks Publish. It makes
the last-write-wins outcome visible instead of silent, since publishing replaces whatever currently
lives at that address.

The check runs at edit-load across `main` and every open `cairn/<concept>/<id>` branch. A publish
re-checks the address and emits a `publish.address_collision` log event (level `warn`, fields `editor`,
`address`, `displacedConcept`, `displacedId`) when it overrides one. The existing needs-alt notice now
renders through the same advisory region, with its live count and per-row actions unchanged.

This adds two exported types on `/sveltekit`, `AdvisoryNotice` and `AdvisoryAction`, the shape
`EditData.advisories` carries. No consumer action is required.

## 0.62.0

<!-- release-size: minor -->

The admin gains a Help home, the pull half of the in-admin editor help. It is a standing screen at
`/admin/help`, reached from a labeled Help home pinned at the foot of the office sidebar (and from the
Ctrl+K command palette).

The screen carries three sections. A getting-started checklist derives its progress from what is
really on the site: writing a post, publishing one, and creating a page. The count is never stored, so
it always reflects the corpus, and the whole section drops away once all three steps are done. A hide
control tucks it away per device. A formatting reference promotes the editor's Ctrl+/ cheat sheet to a
standing two-column table. A support hand-off points a stuck author at the site's `supportContact`,
shaped to the contact (an email opens a `mailto`, a URL opens a link, anything else shows as a note),
and it renders only when the adapter sets one.

This adds two exports: the `HelpHome` component on the `/components` subpath and the `HelpData` type on
`/sveltekit`. The new `/admin/help` route is additive.

No consumer action is required. A site that sets no `supportContact` sees the Help home with a
self-serve line in place of the contact hand-off.

This release also fixes the admin-copy prose gate (`check:prose`): a component whose `@component` doc
comment wrote the literal `<style>` tag had its whole markup silently skipped, so its copy was never
scanned. The gate now strips comments before the script and style blocks.

## 0.61.0

<!-- release-size: minor -->

The editor gains the groundwork for in-admin help. This pass adds the engine seams and one built-in
clarity default the help layer will build on.

A frontmatter field can now carry a `description`: one author-facing sentence shown under the field in
the editor's Details panel and tied to the input with `aria-describedby`. Set it on any field in a
concept's `defineFields` schema.

The `date` field ships a built-in publish-clarity hint ("Sets the date for this post. Publishing is a
separate step you choose.") when the field sets no `description`, so a new site gets the reassurance
without writing per-field copy. A field-level `description` overrides it; the hint cannot be turned
off, only replaced.

The adapter gains an optional `supportContact`: an email, a URL, or a name and instruction the
in-admin help points a stuck editor to. It passes through to the runtime untouched, and the help
renders the hand-off only when it is set, so there is never a button to a blank contact.

The admin design system documents the recipes the help shell will follow, including the non-modal help
region, the single right-slide-over slot, the disclosure-button ARIA contract, the getting-started
progress checklist, and the empty-state starter slot.

No consumer action is required. Every change is additive: the new field and adapter members are
optional, and a site that sets neither sees only the date field's new default hint.

## 0.60.1

A packaging fix so the library bundles cleanly in a Vite 8 consumer. It supersedes `0.60.0`, whose
consumer build failed on Vite 8 / Rolldown. `svelte-package` ships `.svelte` with `<script lang="ts">`
and the TypeScript intact, and Rolldown parses that `<script>` as JavaScript before the Svelte plugin
compiles the file, failing on a TypeScript optional parameter (`registry?: T` loses its type but keeps
the `?`). The shipped `.svelte` now carry a plain-JavaScript `<script>` body. The `lang="ts"` tag
stays, because the component markup still uses TypeScript that the Svelte compiler reads (typed
`{#snippet}` parameters and `{@const x = y as T}` casts).

No consumer action is required. The change is to the published `dist` only; the public API and the
types are unchanged.

## 0.60.0

<!-- release-size: minor -->

The editor learns to copy-edit. Two features land together on the markdown source: a spellcheck that
runs as you write, and an opt-in tidy that reads a draft once with a language model and proposes a
light copy-edit you review before any of it lands.

Spellcheck is on by default. Misspelled words pick up a quiet amber underline, and the correction
popover offers ranked suggestions, an add-to-dictionary action, and an ignore-for-this-session
action, all keyboard-reachable. It runs locally on a Web Worker, so no text leaves the browser, and
it reads the markdown structure: code, links, frontmatter, layout-block machinery, and `media:`
tokens are never flagged. A second quiet layer catches the objective slips spellcheck misses: a
doubled word, a double space inside a line, a stray run of punctuation. The dialect is declared once
per site under `spellcheck.dialect` (default `en-us`), so a British site loads the British word list
and "colour" reads as correct. The personal dictionary is a git-committed file at
`src/content/.cairn/dictionary.txt`, so a word one editor adds is shared with the rest through the
same commit pipeline the content uses.

Tidy is opt-in and off until a developer enables it. When on, an editor runs it over the whole
document or a selection, and cairn reads the draft once through the Anthropic API and computes the
diff locally. The review is a step-in diff dialog: insertions show in green, deletions struck through
in red, and the author's original stays in the buffer until they apply. Objective fixes come pre-kept;
a judgment edit (a configured style normalization, a grammar reword) carries a review-this treatment
and a plain-language reason, and it is not swept by Accept fixes until confirmed. The prompt is built
from the site's own convention config and never harmonizes to the author's habits or guesses an
undeclared style, so an author's voice is preserved. Output is validated as a proofread, not a
restructure: a result that changes the heading structure, the frontmatter, a `media:` token, a code
block, or more than a bounded fraction of the wording is discarded with an honest message and the
document is left untouched. Conventions are edited in a two-tier settings screen and stored in the
committed site config under `tidy.conventions`.

New dependencies: `@codemirror/lint` (the surfacing layer for both spellcheck and the objective-error
underlines), `@anthropic-ai/sdk` (the Worker-side tidy model call, guarded off the client), and
`spellchecker-wasm` plus its bundled English dictionary asset (the spellcheck engine, delivered from
the packaged `dist` so the Worker and the word list reach a consumer build).

No consumer action is required for an existing site. Both features are additive. Spellcheck replaces
the browser's native spell checking with cairn's own, so an upgrading editor sees the new amber
underline and the in-editor correction popover in place of the browser's right-click menu, with no
config change needed. Tidy gives a site nothing until a developer turns it on: set `tidy.enabled: true`
in the site config, add the `ANTHROPIC_API_KEY` Worker secret, and optionally pick a model and
conventions. `cairn doctor` checks that the key is configured once tidy is enabled. The editor
walkthrough is in [write in the editor](docs/guides/write-in-the-editor.md), the developer setup is in
[enable tidy and the editor copy-edit](docs/guides/enable-tidy.md), and the design rationale is in
[the editor copy-edit](docs/explanation/editor-copyedit.md).

## 0.59.0

<!-- release-size: minor -->

The Media Library learns to clear out images in bulk and to collect the files nothing uses any more.
Two surfaces ship together, sharing one safety floor: a strict cross-branch usage index built fresh
per action, and a refusal that commits nothing when usage cannot be verified.

Multi-select lands in both the grid and the table. Tick the images you mean, a sticky bar shows the
count, and one Delete runs the single safe-delete gate across the whole selection. cairn deletes the
assets nothing references and skips any still in use, reporting them rather than force-deleting one.
The batch is one commit that removes the manifest rows before the R2 objects, so a bulk delete is
recoverable from git history the same way a single safe-delete is. The dialog is a plain confirm with
the count, since nothing in use can be removed this way.

Find orphaned files collects stored bytes that drifted loose from content. It pairs a storage
reconcile with a strict usage read and reports two populations. Orphaned files are stored R2 bytes
with no manifest row and no reference anywhere across `main` and every open branch; a branch-only
upload is excluded, because the branch that uploaded it still references it. Broken references are the
reverse, a manifest row whose bytes are gone, shown as a read-only data-integrity readout with no
delete. The scan fails closed at detection: a branch it cannot read produces no result and an offer
to check again, rather than a half-answer that might call an in-use file orphaned.

The byte purge is the one irreversible media action. Everything else in the Library edits git-tracked
state and can be walked back from history, but raw R2 bytes carry no git record, so a purge cannot be
undone. It gates on a typed-count confirm, and at action time it re-derives the orphan set and
re-checks the strict usage index, so a key claimed by a new manifest row or referenced on a branch
since the scan is skipped, never purged. The shipped "Unused" triage facet is renamed to "No
references found", with the raw-HTML caveat stated where an editor acts: absence of a found reference
is not proof of disuse, since cairn cannot see an image hidden in raw HTML or a URL hardcoded in a
template.

No consumer action is required. The whole surface is admin-side and additive, with no public surface
change and no content-format change. An editor walkthrough is in
[manage the media library](docs/guides/manage-the-media-library.md), and the design rationale is in
[media storage](docs/explanation/media-storage.md).

## 0.58.0

<!-- release-size: minor -->

The Media Library learns to fix an image everywhere it is used. Two new operations rewrite every
placement of one asset in a single commit to `main`, each behind a preview an editor confirms before
anything changes. Both read usage across `main` and every open edit branch, both report the held edits
they will not touch, and both fail closed when usage cannot be verified.

Replace swaps the file behind an image without revisiting the pages that use it. cairn is
content-addressed, so a corrected upload is a new object with a new content hash; replace repoints
every published reference from the old hash to the new one and keeps the slug, so `media:first-light.<old>`
becomes `media:first-light.<new>` and the name an author sees is unchanged. The old row and its R2 bytes
are kept, recoverable from git history, rather than erased. A typed-slug confirm gates the apply, since
it rewrites published content and can break a draft, and the preview names the open edit branches still
on the old file. Those branches keep the old file until they republish; they are never rewritten.

Push alt fills missing descriptions from one place. An image's default alt copies into every placement
that has none, in one atomic commit. An explicit opt-in, off by default, also overwrites placements
that already carry a custom alt, since that replaces an author's words. A frontmatter hero marked
decorative is skipped, because its empty alt is deliberate. The media manifest is not changed: the
default alt is read from the row, never rewritten there. Alt fill is reversible and frequent, so it
carries no typed-slug gate.

No consumer action is required. Both operations are admin-side and additive, with no public surface
change and no content-format change. An editor walkthrough is in
[manage the media library](docs/guides/manage-the-media-library.md), and the design rationale is in
[media storage](docs/explanation/media-storage.md).

## 0.57.1

Media polish and cutover DX, the first follow-on after the `0.57.0` media stack. The Media Library
gains the action feedback it lacked: a delete, a rename, and a commit conflict now land on a strip
that confirms the result or shows the error, instead of a silent page. With the detail slide-over open
and focus in the search box, Escape now clears the search and leaves the panel open, rather than doing
both at once. A frontmatter hero marked decorative persists that choice as an additive `decorative` key
on the `image` object, so a deliberately decorative hero stops reading as needs-alt after a reload (a
decorative body image still cannot persist the choice, since markdown alt text has no slot for it). The
reserved-`figure` build error now names the colliding component and points at the fix.

The rest is documentation. The public media resolver wiring moved into the required media setup steps
in both the upgrade guide and the wire-the-delivery guide, since a published `media:` token ships bare
without it. The reserved-`figure` collision is now a prominent breaking callout. A new
[content authoring syntax reference](docs/reference/authoring-syntax.md) documents the `cairn:` and
`media:` token schemes together. The guides now show the `wrangler.toml` binding dialect, the
`@glw907/cairn-cms/media` import path, the empty-`media.json` bootstrap, and the `.site-main` re-scope
for the figure placement CSS.

No consumer action is required. The `decorative` key is additive and optional, so existing content
parses and builds unchanged, and the feedback strip, the Escape fix, and the registry error message
are admin or build-time with no public surface change.

## 0.57.0

Images become first-class. An editor can paste, drag, or insert an image straight into a post, and
cairn stores it, names it by its content, commits it with the entry, and serves it from the site's
own R2 bucket. This is the whole media stack landing together: the foundation that models a stored
image, the infrastructure that ingests and delivers the bytes, and the insert UI that puts it in an
editor's hands. It is additive to the public API, but it needs per-site wiring, so it is a minor.

The foundation models an image as a logical reference, not a path. Content commits a `media:` token
keyed to the first 16 hex characters of the bytes' sha256, so the same image resolves no matter where
it is stored or what it is named, and identical bytes always land at one key. A small git-committed
manifest (`media.json`) carries the human layer the bytes cannot: the display name, the alt text, the
original filename, and the pixel facts. A render-time resolver reads that manifest and rewrites each
`media:` token to its delivery URL, optionally through a Cloudflare Images transform URL when a site
turns transforms on. The adapter's `AssetConfig` grew to declare the R2 bucket binding, the URL form,
the upload limits, and the named variants.

The infrastructure ingests and serves the bytes. A locked-down `/media` delivery route, built from
`createMediaRoute`, streams content-addressed bytes from R2: it validates the hash and extension
before any read, derives the object key from the validated values alone, carries the load-bearing
security headers (nosniff, inline disposition, a `default-src 'none'; sandbox` CSP, a one-year
immutable cache), and forwards `If-None-Match` and `Range` for 304 and 206 responses. An admin
`uploadAction` takes the editor's bytes, hashes them, dedups against the manifest with a put-first
head check, and rejects a hash collision with a 409. A client ingest helper normalizes a HEIC to a
web format before upload. A save merges the editor's optimistic records into `media.json` at commit
time, and the edit load hands the admin preview a lean `mediaTargets` projection so an in-session
image renders before it is committed.

The insert UI puts it in an editor's hands. Three gestures start an insert: paste from the clipboard,
drag a file onto the editor, or the toolbar's Insert image button. A paste or drag opens an at-caret
popover on the capture card with the dropped file; the button opens a chooser with upload first and a
combobox picker below it for reusing an image already on the site. The capture card pre-fills the name
from the filename and never blocks on alt text, so an editor can insert now and describe later. The
inserted reference renders in the editor as an atomic chip (thumbnail, name, and a needs-alt marker),
and an upload still in flight shows a widget-only placeholder with a determinate progress bar that
writes no document text until it resolves. A non-blocking needs-alt notice on the edit page counts the
images still waiting for a description and jumps to each one, never blocking a save or a Publish. The
edit-page preview renders inserted images through the same resolver the live site uses.

Figures land in the same release. An inline image can carry a caption and a placement through a
cairn-reserved `:::figure` directive that wraps the image as a child node. The caption is the
directive's body text, rendered to a real `<figcaption>`, and the placement is a closed role set
(`center`, `wide`, `full`, plus the bare measure default) carried as a class on the `<figure>`. A
persistent editor control wraps a bare image, edits an existing figure's caption and role, or unwraps
it, writing the markdown source the author can read and hand-edit, and the source chip shows the
figure's role so the decoration agrees with the source. `figure` and `figcaption` join the base
sanitize floor, so a captioned figure survives on every site, and `figure` is a reserved directive
name the registry refuses to let a site component shadow. cairn ships default `.cairn-place-*` CSS in
the showcase reference, and a site restyles those classes to own the placement pixels. A guide section
covers it in [add an image](docs/guides/add-an-image.md).

Hero images land in the same release. A Post or Page carries a lead image in frontmatter as a nested
`image: { src, alt, caption }` object, where `src` is a `media:` reference, `alt` is the screen-reader
description, and `caption` is an optional line the template may show. `image` is a new built-in field
type declared through `defineFields` like `text` or `date`. The editor renders it in the details panel
as a one-row resting field that opens the same picker and capture flow the body insert uses. Alt stays
debt, and the needs-alt notice now counts a hero with an empty alt alongside the body images. One
image serves two jobs: the delivery read path resolves the frontmatter reference into a derived
`heroImage` projection the template lays out, and the SEO head reads the same resolved image as the
`og:image` and `twitter:image`. The on-disk `media:` token stays canonical, since resolution is a
separate projection that is never written back. `resolveImageUrl` now rejects a non-http(s) result, so
an unresolved `media:` token degrades to no social image rather than shipping a broken tag. The site
template owns the hero layout: cairn ships the resolved data and the social-card wiring, not a hero
render step. A required `image` field is enforced on the presence of its `src`, never on its alt.

The Media Library lands in the same release. A first-class admin screen at `/admin/media`, a peer of
Posts and Pages, browses every committed asset, shows where each one is used, edits its name and
default alt, and deletes it safely. The resting surface is a contact-sheet grid with a list-density
toggle; a non-modal detail slide-over carries the preview, the alt editor, the grouped where-used
list, and the actions. The Library computes where-used by content hash across `main` and every open
edit branch, so a not-yet-published upload still shows and a renamed slug still resolves. The content
manifest gained an additive `mediaRefs` field per entry to feed the `main` side of that index; an
existing manifest without it still parses and builds. Safe-delete rechecks usage server-side against
a fresh read at delete time, refuses an in-use asset (the in-use face names what would break and
requires typing the slug), commits the manifest row removal before deleting the R2 object, and fails
closed if it cannot verify usage. Rename and default-alt are a single `media.json` row commit with no
reference rewrite, since the resolver and route key on the hash; the default alt is the value
prefilled into the next placement, not a rewrite of alt already committed. Replace, bulk actions, and
tags are deferred.

Consumers must: bind an R2 bucket and mount the delivery route before media works. Add an
`r2_buckets` binding named `MEDIA_BUCKET` in `wrangler.jsonc`, and mount the delivery route at
`src/routes/media/[...path]/+server.ts` with `createMediaRoute(runtime.resolvedAssets)`. Declare the
adapter's `assets` block naming that binding, and regenerate nothing else; media stays off until the
`assets` block is present. Cloudflare Images transforms stay behind the `transformations: false`
default, so a site serves full-size bytes until it opts in. The wiring steps are in
[the upgrade guide](docs/guides/upgrade-cairn.md) and the
[wire the delivery surface guide](docs/guides/wire-the-delivery-surface.md); the surface is documented
in [the media reference](docs/reference/media.md) and
[the sveltekit reference](docs/reference/sveltekit.md).

Consumers must also wire the public media resolver for any public image. The bucket, route, and
`assets` block make media work for the editor, but a published `![](media:...)` (a body image or a
frontmatter hero) ships a bare token to the live page unless the site threads a resolver into the
render path and `createPublicRoutes`. Build one with
`makeMediaResolver(mediaManifest, normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' }))` from
`@glw907/cairn-cms/media`, where `mediaManifest` is the committed `src/content/.cairn/media.json`
(create it as `{}` on a fresh site so the import resolves). The
[upgrade guide](docs/guides/upgrade-cairn.md) gives the full snippet.

Breaking: `figure` is now a reserved directive name. `defineRegistry` throws if a site registers a
component named `figure`, which hard-fails both `cairn-manifest` and the build. A custom `figure` that
the engine's built-in figure now covers should be removed so the site adopts the engine's; a `figure`
that does something else should be renamed. Check too for any hand-authored `:::figure` block in your
content, which now renders as an engine figure.

Recommended, not required: regenerate the content manifest (`cairn-manifest`) and commit it so the
Media Library's `main` where-used is accurate. The `mediaRefs` field is additive, so a site builds
without it, but an un-regenerated manifest reads every published media reference as absent until it
is regenerated. Save and publish keep the field current from then on.

## 0.56.2

The component insert picker gains a live preview and round-trip editing, and the component contract
grows the optional fields that make a good picker possible. These refine the existing
component-editing surface and are all additive, so it is a patch; existing definitions compile
unchanged with no action required.

How the design was reached. Two research arms ran first. One surveyed how comparable systems build
their insert pickers (Gutenberg, Sanity, Wagtail, Payload, Contentful, Builder, and the git-backed and
document tools). The other hunted documented complaints from both the editor and the developer, then
paired each with a correction. Five pains recur across systems that share no code, and cairn already
beats four of them by its existing architecture: a single `ComponentDef` co-locates render and schema
(no schema-render drift), content is markdown in git (no database-migration tax), and the parser reads
real directives (lossless re-edit stays reachable). The fifth pain, configuring a block without seeing
the result, no system has solved. An adversarial critique of the first mockup then caught the preview
faked with static HTML and an ironic "Untitled" placeholder, which the shipped design corrects.

What an editor gets. The picker lists components in one column, grouped under headings, each row a
glyph, a description, and a line on when to reach for it; a search box appears once a site declares
more than eight. Picking a component that declares a `preview` opens a two-pane configure step: the
fill form on the left, and on the right the configured component rendered through the site's own
pipeline, the same machinery the edit page preview uses. This is the part no comparable CMS offers,
and cairn can offer it because it already owns the render path. The preview settles on a debounce
rather than re-rendering on every keystroke, and it stays honest: a still-empty required field shows
the skeleton with the empty region called out rather than a fabricated result, and a render that
throws shows a failed-to-render surface and keeps the form. A component that declares no `preview`
keeps the single-column form. Required fields are marked and block Insert with inline messages, and
the modal collapses to one column on a narrow screen.

Round-trip editing closes the loop. With the cursor in a placed component, an Edit block control opens
it back into the same guided form, pre-filled, and Update rewrites that block in place. It is offered
only when the round-trip is provably lossless for that block: one that carries an attribute or a child
the component does not declare is left for hand-editing rather than silently rewritten, the failure
that corrupts content in the git-backed editors the research surveyed. A guided edit that does run
preserves content and normalizes formatting to the canonical serialization. A consumer site that
mounts `CairnAdmin` gets this with no change.

For consumers, the `ComponentDef` contract gains optional fields, so existing definitions compile
unchanged with no action required:

- `icon` shows a glyph from the site icon set beside the label in the picker.
- `group` puts a component under a category heading, in declaration order.
- `hidden` keeps a component out of the top-level picker (for a nested-only component).
- `preview` is a structured sample (`attributes` and `slots`) the picker seeds the form with and
  renders. Declaring it is what opts a component into the two-pane preview layout.
- `pattern` and `validate` on an attribute field add inline validation, the regex case and a pure
  cross-field escape hatch.
- `itemLabel` on a repeatable slot derives a row's label, so a list of items is not a column of blanks.

Round-trip editing of a placed component, a persistent catalog rail, and a slash-trigger are designed
for but deferred to a later pass.

## 0.56.1

Test and CI reliability only; the published library is unchanged from 0.56.0. The component test job
flaked in CI on the editor's heavier pages because the editor's per-browser preferences live in
localStorage and nothing cleared it between tests, so a leaked zen preference could hide the toolbar a
later test waited for. localStorage is now isolated before each component test, with a regression
guard, plus a retry on the browser test project and steadier waits in the insert-dialog tests. No
consumer action.

## 0.56.0

Two passes ship together: the markdown editor's folding gets a proper home, and the engine's gates,
tooling, and docs harden.

The editor folds directive containers (`:::name` blocks), and the fold control now lives in a real
gutter column to the left of the text rather than a chevron hidden in the line. At rest the gutter is
empty; the chevron reveals when you hover the gutter cell, stays while a block is folded, and shows
while the caret is inside a block. The control is a real button now, so folding is reachable by
keyboard and screen reader, where before only unfolding was. The folded-row tint and the "N lines"
pill carry over unchanged, and the fold scope is the same: directive containers only.

For consumers, two additive surface touches from the tooling pass. A concept can now set an optional
`singular` label, so the create affordances read "New post" instead of "New Posts"; it defaults to the
concept's `label`, so a concept that sets nothing is unchanged. And `AuthEnv` is now exported from
`@glw907/cairn-cms/sveltekit` as well as the root, so the `app.d.ts` Platform block can import it from
the subpath the auth helpers live on (the deploy guide now shows that block verbatim).

The rest hardens the engine's own gates and docs. A new `check:reference:signatures` gate compares
each reference page's declared type signature against the export's real type, so a stale signature in
an existing page is caught (it found and fixed two on its first run). A plain-Node dist-spawn test
rot-proofs the `/delivery/data` node-safety guarantee, an admin-shell DOM check guards the drawer
layout against a silent scoping regression, and the `cairn-manifest` bin now resolves the Vite root
from the loaded config rather than the current directory. A docs sweep documents the preview frame's
dual stylesheet emission, the `cairnManifest`-derived `cairn-doctor` inputs, the prerender policy for
the feed routes, and an interim security contact.

No consumer action: every change is additive, the `singular` field is optional, and the folding
redesign is internal to the admin editor.

## 0.55.0

The office list rises to the gold standard. The post and page list gains a triage filter layer and
self-describing rows, so a concept with a handful of entries reads as content rather than a few bare
titles.

Above the list, a triage bar filters by publish state in the admin's segmented check-and-tint
grammar: All, Pending edits (the entries on a `cairn/` branch, whether branch-only or live with held
edits), and Published, each with a live count, plus an orthogonal Hidden toggle for the draft
entries. The counts come from the loaded set, so they are exact, and the filtering runs client-side
over the entries already in hand. Search composes with the active filter.

Each row now describes itself. A summary line sits under the title, drawn from the entry's
description or, lacking one, a short excerpt of its body. The Edited badge tints in the brand violet
as the one state to act on, mirroring the "Publish site (N)" count; Hidden reads as a de-emphasized
row with an eye-off tag rather than a competing badge; and the foot of the list carries a quiet
"New" row so a short list always shows its next step. A concept with no entries centers its empty
state on the page.

One data change feeds the rows: the content manifest now indexes a per-entry `summary`, built by the
same excerpt helper the public delivery already uses. Because the manifest is verified whole-string,
a site's committed manifest is stale until it is regenerated once.

Consumers must: regenerate the content manifest (`npm run cairn:manifest` or `npx cairn-manifest`,
then commit). The `cairnManifest` build fails closed until the regenerated manifest with the new
`summary` keys is committed.

## 0.54.0

The editor takes the shell. On an edit route the page is now one context, the desk: the edit page's
sticky header dissolves into the single topbar (one band in three clusters, the way back and the
status and the lifecycle actions), the nav drawer opens closed and the breadcrumb is the way out,
the frontmatter fields move behind a right slide-over panel, and a zen toggle (and `Ctrl+Shift+.`)
fades the remaining chrome to leave the manuscript alone, with a floating chip carrying the save
state and the way out. List and settings pages keep the office chrome unchanged.

The editor ergonomics round out alongside it: the directive rail pitch widens to 8px and the
caret-active rail reads by strength alone (no width step), wrapped quote and list lines hang under
their content, directive containers fold from the rail band (a chevron on the opener row, a folded
row with an `N lines` pill, the safety invariant that an edit or selection never hides text), the
format keymap completes (inline code, quote, both lists, the heading pair) and the page-level
actions get keys, a `Ctrl+/` sheet lists every shortcut, and `####` gains a real heading size step.
The everyday formats (inline code, strikethrough, table) promote onto the strip, and the footer
controls dress as what they are: a segmented posture control, check-and-tint mode toggles, and a
plain Markdown-help link. The whole admin picks up the same grade of polish, including a scoped
reset so every bare admin button sheds its native chrome.

Consumers may: nothing is required, the new chrome and the editor behaviors apply in place. A site
that embeds `MarkdownEditor` directly gets the rail, hang, fold, and keymap changes automatically;
the editor's public props are unchanged.

## 0.53.0

An iterative design session on the editor-as-home direction, shipped as one window.

The admin's UI face is now IBM Plex Sans (self-hosted, SIL OFL), replacing Figtree: the editor
writes in iA Writer Mono, which descends from IBM Plex Mono, so the chrome and the manuscript
share one type skeleton. The brand display face (Bricolage Grotesque) is unchanged.

The editor gains two surface postures, persisted and toggled from the card footer: Prose (the
default) is the writing instrument, a 72ch centered measure at a larger type step; Markup is the
working surface, a wide dense fill for tables, attributed directives, and long URLs. The footer
is now the writing-environment strip (word count, postures, focus mode, typewriter, help), the
insert actions joined the toolbar as icons, and the document title sits on the manuscript's left
edge. Focus mode now also eases the directive rails and the title back with the dimmed field.

The chrome cedes the stage: a narrower nav sidebar and details column, a wider gutter around the
editor, a quieter details card, rebalanced surface margins, and the topbar pinned to the brand
band's height so the header hairline meets across the seam.

Consumers may: pass the new optional `surface` prop ('prose' | 'markup') when embedding
`MarkdownEditor` directly. No action required; the release is additive.

## 0.52.1

Two field reports from the first 0.52.0 session, both in-editor polish with no consumer action.
In Write mode the editor card now hugs the manuscript (the column caps at 48rem and centers), so
a wide window no longer frames empty space inside the card; Preview keeps the full column for
its device widths. The directive rails take a 4px gap between nested bars (twice the bar
weight, so two rails read as two lines), and directive text gains a matching step of gutter.

## 0.52.0

The editor became a quiet writing surface. The manuscript renders in self-hosted iA Writer Mono
(SIL OFL) at a centered 70-character measure, heading sizes step by level, every syntax marker
and URL recedes to the muted ink while the content keeps full strength, inline code sits on a
soft chip, and quote text reads in full ink with only the `>` dimmed. The editor also parses
GFM now, so the toolbar's strikethrough, tables, and task lists highlight as you type.

Directive machinery trades its row bands for bracket rails: a container draws a depth-stepped
rail from opener to closer, nested containers draw nested rails, the fence line's name and label
keep the accent while the colons and braces fade, and the block holding your caret reads one
step stronger. The treatment is AA-checked in both themes.

Two writing modes join the toolbar's overflow menu, each persisted per browser: focus mode fades
every paragraph but the caret's (a deliberate, documented sub-AA dim with chip backgrounds
flattened), and typewriter scrolling holds the caret line at vertical center.

Consumers may: pass the new optional `focusMode` and `typewriter` booleans when embedding
`MarkdownEditor` directly; sites on the stock `EditPage` get the toggles and persistence for
free. No action required; the release is additive.

## 0.51.0

The `svelte` peer dependency floor rises from `^5.0.0` to `^5.56.3`, turning the 0.40.0 advisory
into an enforced range: consumer sites compile the shipped `.svelte` sources, and svelte `5.56.1`
miscompiles parenthesized boolean groupings. `cairn-doctor` gains a `config.dependency-floors`
check in its default set, which compares the lockfile's resolved `svelte` and `@sveltejs/kit`
versions against the peer ranges the installed engine declares.

Consumers must: raise the `svelte` devDependency range to at least `^5.56.3` (and `@sveltejs/kit`
to `^2.12` where it sits lower) and reinstall so the lockfile re-resolves. A site pinning svelte
below the floor now draws an npm peer warning or resolution failure on install, and the doctor
reports the below-floor version as a blocker.

The edit page's preview now renders inside a sandboxed iframe whose document links the site's own
stylesheets, so an entry proofs in the site's real styling without that CSS ever touching the
admin document. The adapter gains an optional `preview` member naming the compiled CSS URLs (a
Vite `?url` import resolves the hashed asset) plus `bodyClass` and `containerClass` for the site's
body classes and content wrapper, and a `byConcept` map overrides either class per concept for a
site whose posts and pages wrap content differently. While Preview shows, the sidebar steps aside
so the document takes the full width, and a width menu on the Preview tab sizes the frame to
Desktop, Tablet, Phone, or Small phone, persisted per browser.

Consumers should: wire `preview` in the adapter, referencing the sheet only through `?url` and
linking the same URL from the site layout, the way
[the adapter guide](docs/guides/define-an-adapter-and-schema.md) shows. Without the knob the
preview renders unstyled markup behind a one-line hint.

The editor's directive highlighting now recognizes labeled and attributed `:::` openers and fences
of four or more colons, where before only bare closers matched, and nested containers step their
band and rail tint by depth. No consumer action.

`cairn-doctor` derives its missing inputs from the repo it runs in: the backend owner and repo
plus the sender address come from evaluating the site's config module through the manifest bin's
Vite machinery, and the Cloudflare account id comes from the wrangler config, with flags and
environment variables taking precedence. A new `--probe <url>` flag runs a zero-side-effect live
check against the deployed admin's sign-in surface: the login envelope, the CSRF cookie and field,
and the uniform non-leak answer to a stranger's sign-in request. Consumers may: drop the `--from`
and `--repo` flags from doctor invocations and run `npx cairn-doctor --probe <url>` after a
deploy.

## 0.50.0

The admin now mounts as one catch-all route. A new `createCairnAdmin(runtime, deps)` facade
serves every admin view through a single `load` and a single `actions` record, the new
`CairnAdmin` component switches the views on the discriminated `AdminData`, and `parseAdminPath`
is the one path authority behind both. A site's whole `/admin` surface is now three files (the
`$lib/cairn.server.ts` composer plus the `/admin/[...path]` route pair) instead of a per-route
tree of shims whose action names coupled to engine components by bare string. The admin URLs are
unchanged. The per-surface factories (`createContentRoutes` and friends) stay public as the
advanced seam.

Consumers must: delete the admin route tree and replace it with the two-file mount plus the
composer; the exact files are in
[the canonical admin mount](docs/reference/admin-routes.md) and the migration is the `0.50.0`
section of [the upgrade guide](docs/guides/upgrade-cairn.md). The engine's auth and shell forms
now post named actions (`?/request`, `?/confirm`, `?/logout`, `?/publishAll`), so a site that
mounts `LoginPage`, `ConfirmPage`, or `AdminLayout` directly must register those names, and the
`/admin/auth/logout` server route leaves the contract.

Consumers must: rename `createSiteIndex` to `createSiteResolver` and `SiteIndex` to
`SiteResolver` where imported from `/delivery/data`; the `paginate` helper is deleted.

Consumers must: read `form.error` where they read `form.renameError`. Every action failure now
carries `error: string` as its one-line summary; the structured extras (`brokenLinks`,
`inboundLinks`) keep their keys beside it.

Consumers must: replace the hand-written `App.Locals` block in `src/app.d.ts` with
`import '@glw907/cairn-cms/ambient';`, the new type-only subpath that ships the
`App.Locals.editor` augmentation.

The diagnostics registry reaches its remaining runtime sites. A missing `AUTH_DB` on a gated
admin request renders a branded condition page instead of a silent login redirect, and a missing
email binding, missing GitHub App credentials, and an invalid site config now carry their
registered condition ids through the error chain and the logs.
`deps.mintToken` widens to accept a plain string return. The concept list reads published rows
from the committed manifest in one call, falling back to the per-file crawl only on a repo with
no manifest yet. Internal layering rides along (one home each for the link rewriter, the escape
helpers, and the conflict check) with no consumer surface change.

This release publishes together with `0.41.0`, so a site crossing from `0.40.0` takes both
windows in one upgrade.

## 0.41.0

`cairn-doctor` ships as a second bin: a setup preflight that runs nine checks over the local config
files (the wrangler bindings, observability, the CSRF handoff, the site config), the Cloudflare
account (the onboarded sending domain, Always Use HTTPS, HSTS, the D1 auth store with its schema
and an owner row), and the GitHub App's full reachability chain. Every check reports into one
plain-text report, a failure prints its condition's why and remediation from the diagnostics
registry, and the exit code is 1 on any failure, so the command slots into a deploy script as a
gate. A missing credential makes the affected checks skip rather than fail, and
`--send-test <address>` opts into one real email through the Email Sending API. The new
[Cloudflare readiness guide](docs/guides/cloudflare-readiness.md) walks the same conditions
manually, a `check:readiness` gate pins that guide to the condition registry, and
[the doctor reference](docs/reference/doctor.md) covers the flags, the checks, and the CI wiring.

The admin layout's GitHub degrade gains a signal. When the pending-entries read fails, the layout
logs a warn-level `github.unreachable` record and the topbar's Publish site button hides instead
of showing a count it cannot know.

Consumers may: run `npx cairn-doctor --from <address> --repo <owner/name>` as a pre-launch gate,
work through the readiness guide when standing up a fresh account, and filter Workers Logs on
`github.unreachable` when the publish button goes missing.

A debt batch rides along. The editor's link autocomplete no longer
pulls CodeMirror into the server bundle, the edit page's load reads its GitHub probes in parallel,
concurrent cold-start token mints coalesce into one, publish-all pluralizes its commit message and
an empty publish-all explains itself instead of redirecting silently, the unsaved-changes warning
tracks client-side navigation and no longer double-fires on a full page unload, the toolbar's
keyboard tab stop holds across Preview round trips, the word count ignores markdown and directive
syntax, and the list's publish flash announces reliably to screen readers.

Consumers must: be on `@sveltejs/kit` 2.12 or later before taking this release. The edit page now
reads `$app/state`, which shipped in kit 2.12.0, and the peer range says so (`^2.12`); a site on
an older kit must upgrade kit first.

## 0.40.0

The edit page is redesigned around the manuscript. A sticky translucent header carries the
breadcrumb, the status badge (New, Edited, or Published, with Hidden beside it when the `draft`
flag is set), an unsaved-changes indicator, Publish and Save, and an overflow menu holding Discard
changes and Delete. The editor sits in one card frame: a full GFM toolbar (bold, italic, two
heading levels, lists, quote, and a More menu with strikethrough, inline code, code block, a table
starter, horizontal rule, and task list), the writing surface, and a footer with a word count and
a Markdown help cheat sheet. Write/Preview tabs replace the stacked preview. When the schema
declares a `title` field, the document title hoists above the card, and the sidebar groups into
Details, Visibility (the `draft` flag as the Hidden toggle), and Address (the slug beside a Change
URL button). On the surface itself: markdown syntax highlighting in the admin palette, a soft
accent band with a plain-language tooltip on `:::` directive machinery, and native browser spell
check.
Ctrl/Cmd+B and Ctrl/Cmd+I format the selection, Ctrl/Cmd+K opens a new web-link dialog,
Ctrl/Cmd+S saves, and leaving the page with unsaved edits asks first.

The component surface grows additively. `MarkdownEditor` gains `registerFormat` and
`registerGetSelection`, and it no longer renders its own toolbar or card chrome; the host frames
it, and `EditPage` does. `DeleteDialog` and `RenameDialog` gain an exported `open()` and a
`trigger` prop, `LinkPicker` gains an exported `open()` and a `disabled` prop, and
`ComponentInsertDialog` gains `disabled`. The light theme's `--color-accent` darkened to
`oklch(54% 0.16 300)` so the editor's directive ink holds AA contrast.

Consumers must: nothing for a site mounting the admin through the route factories and `EditPage`;
no shim, action, or load changes. A site that renders `MarkdownEditor` directly, outside
`EditPage`, no longer gets an embedded toolbar or card frame; it may host its own controls through
the new `registerFormat` seam or accept the plain surface. One advisory for every consumer: sites
compile the shipped `.svelte` sources, and svelte `5.56.1` has a compiler bug that misprints
parenthesized boolean groupings, so use svelte `5.56.3` or newer. The editor-facing walkthrough is
[the write-in-the-editor guide](docs/guides/write-in-the-editor.md).

## 0.39.0

Content edits are now held until a deliberate Publish. A save commits to the entry's pending
branch, `cairn/<concept>/<id>`, cut lazily from the default branch's head, and the live site does
not change. The per-page Publish validates and holds the posted form like a save, then commits
that markdown to the default branch, with its manifest row upserted, in one commit; that commit
triggers the deploy. The pending branch is then deleted, guarded by a head-sha check so a save
landing mid-publish is never destroyed. A
site-wide "Publish site (N)" action in the admin topbar ships every pending entry in one atomic
commit. Discard deletes the pending branch, restoring the live version of a published entry or
removing a never-published one entirely. The ref's existence is the only pending state; there is
no metadata file and no database row.

The admin shows the new state everywhere. List rows carry a status badge (New, Edited, or
Published), with the `draft:` flag re-presented as a separate Hidden badge whose mechanics are
unchanged. The edit page gains a pending banner, a Publish button, and a Discard changes confirm.
Deleting an entry cascades to its pending branch, and renaming is refused while one exists.
`EntrySummary`, `ListData`, `EditData`, and `LayoutData` widen accordingly, `createContentRoutes`
returns the three new actions, and three log events join the vocabulary (`entry.published`,
`entry.discarded`, `publish.failed`), with `commit.succeeded`/`commit.failed` carrying a `branch`
field on the save path.

Consumers must: add publish/discard to the edit shim's actions and publishAll to the list shim's actions; saves no longer deploy the site, Publish does.
The exact lines are in
[the upgrade guide](docs/guides/upgrade-cairn.md) and
[the admin route structure](docs/reference/admin-routes.md). The editor-facing walkthrough is
[the publish and discard guide](docs/guides/publish-and-discard.md).

## 0.38.0

The magic-link send is now awaited rather than fire-and-forget, so a delivery failure reaches the
login response instead of being swallowed. `requestAction` returns a `status` discriminant
(`sent` | `send_error` | `throttled`) alongside the existing `sent` boolean, and `LoginPage` renders
a send-error and a throttled state. The `auth.link.send_failed` log record gains a `code` (the
Cloudflare binding error code) and a `conditionId` (the mapped diagnostic condition).

Consumers may: read `form.status` to render the new states. A site rendering against `form.sent` is
unaffected, since `sent` is unchanged.

## 0.37.1

Internal groundwork and a docs overhaul; nothing in the public surface or runtime behavior
changes, and no consumer action is needed.

The diagnostics foundation lands as an internal module: a condition registry
(`CairnCondition`), a `CairnError` throw primitive, and a shared condition-response renderer
that the admin guard's three rejection responses (the two CSRF reasons and the HTTPS check) now
route through. Those responses are unchanged and regression-pinned, and the module exports from
no package subpath. This is Pass 1 of the diagnostics initiative, the base the upcoming
`cairn doctor` and readiness checks build on.

Docs are reorganized and rewritten. A new README front door tells the save-flow story, says
what cairn is not, names the chosen stack, and then opens three doors: the tutorial, the
showcase, and the docs map. Stray top-level pages joined their Diátaxis arms (the admin route
contract is `docs/reference/admin-routes.md`, the sanitize floor is
`docs/explanation/render-safety.md`, key rotation is
`docs/guides/rotate-the-github-app-key.md`), and every adopter-facing page is rewritten in a
second-person, example-first voice with its technical content intact.

The magic-link sign-in confirmation is now a branded panel in place of the flat success bar. After an
editor requests a link, the page shows a mail icon in a soft success tile, a "Check your email"
heading, and the ten-minute expiry note, all in the admin's Warm Stone styling. Below a divider it
adds guidance for the link that never arrives: check the spam folder first, then confirm the address
matches the one the site owner added. This covers the common fat-finger case, where a mistyped address
gets the same neutral confirmation and no email. A "Use a different email" action returns to the form
so the address gets corrected without a reload. The confirmation copy stays identical whether or not
the email is on the allowlist, so the page still never leaks membership.

The change is internal to the `LoginPage` component and needs no action.

## 0.36.0

cairn now emits structured diagnostic events. The engine had three bare `console.error` calls and no
queryable diagnostics. An internal logger assembles a JSON record for each event, with an envelope
(`level`, `event`, `timestamp`) and event-specific fields, and writes it to `console`. Cloudflare
Workers Logs ingests and indexes those records when a site sets `observability.enabled = true`, so
each field filters. The event vocabulary covers the auth flow, the commit pipeline, and the admin
guard's pre-resolve refusals. The records carry an editor's email for attribution and never carry a
magic-link token, a session id, or a magic-link's contents; a standing redaction test pins that.

The event names are a stable contract, so renaming one is a breaking change later. The full list, with
each event's level, trigger, and fields, is in the new [log events reference](docs/reference/log-events.md),
and the [read cairn's logs guide](docs/guides/read-cairn-logs.md) covers the one setup line and the
dashboard query.

Consumers may: set `observability.enabled = true` in `wrangler.jsonc` to read the events in Workers
Logs. The change is otherwise additive and needs no action.

## 0.35.0

cairn now owns CSRF for the admin. A consuming site disables SvelteKit's global `checkOrigin`, and
cairn's guard becomes the single authority. Every unsafe admin form POST must carry a valid
`__Host-cairn_csrf` double-submit token (the cookie name is `cairn_csrf` bare on local http). The
token is issued lazily and stably by the login, confirm, and admin shell loads, rendered as a hidden
`csrf` field by the new `CsrfField` export, and validated centrally in the guard. A failed check
serves a branded 403 page in place of the framework's raw text. The session cookie stays a second
layer. The token tolerates a missing `Origin`, so the JS-free magic-link sign-in works from a
browser that omits the header. The guard restores the strict `Origin === url.origin` check for the
site's own non-admin form POSTs, so handing cairn the admin authority is not a net loss elsewhere.

The `CsrfField` component is a new export from `@glw907/cairn-cms/components`. The `LoginPage` and
`ConfirmPage` data now carries `csrf`, and `AdminLayout`'s `LayoutData` now carries `csrf`, which the
shell provides to its descendant forms through context.

Consumers must: set `csrf: { checkOrigin: false }` in `kit` in `svelte.config.js`. Without it the
framework's global check rejects the JS-free auth POST and the admin sign-in fails.

## 0.34.0

A deployed admin request that arrives over http now gets a clear, branded help page instead of the
framework's opaque CSRF 403. The magic-link sign-in posts a JS-free form, and the framework rejects a
form POST unless the request carries a matching https origin, so an admin reached over http cannot sign
in. The auth guard detects that case on a deployed host and serves a self-contained page that names the
problem, links to the https version for one-click recovery, and gives the exact Cloudflare fix (Always
Use HTTPS). The page matches the admin design system in light and dark. Local `wrangler dev` over http
is exempt.

The release also adds a `check:prose` gate (`scripts/check-admin-prose.mjs`, in CI) that scans the admin
components' user-facing strings for AI-writing tells, since the component copy ships compiled and a
consuming site's prose tooling never sees it.

Consumers may: force HTTPS at the edge (Always Use HTTPS plus HSTS), which the deploy guide now requires.
The help page is a fallback for the window before that is set, not a substitute.

## 0.33.0

The admin isolates itself from host chrome. A dev-only guard in the admin and login roots walks the
ancestor chain on mount and logs one `console.error` when a width-constraining ancestor sits between the
admin root and `<body>`, the sign that a site's root layout is wrapping the admin in its own nav, footer,
or container. The guard compiles out of production and changes no rendering. The canonical route pattern
is documented and demonstrated: a chrome-free root layout plus a URL-transparent `(site)` group that
holds the public chrome and `app.css`, so the host chrome never wraps `/admin`. The showcase gains a
`(site)` group with plain-CSS chrome, which proves the admin renders fully styled on a site that uses
neither Tailwind nor DaisyUI.

This closes the global at-rule note carried since the self-styling foundation. The compiled admin sheet
holds DaisyUI `@keyframes` and Tailwind `@property` rules that are document-global by CSS spec, but the
sheet is code-split to the admin roots that import it, so it loads only on `/admin`, and the route pattern
keeps the host's CSS off `/admin` from the other side. A boundary test pins that the admin sheet is
imported only by the admin roots.

Consumers must: keep the host root layout chrome-free and move the public chrome plus `app.css` into a
`(site)` route group, so the host chrome never wraps `/admin`. A site already on this structure needs no
change. The dev guard names the problem in the console if a root layout still wraps the admin.

## 0.32.0

The admin gets a real CMS UX. The concept list is now a searchable, sortable data-table with status
badges, formatted dates, per-row delete, and pagination. The sidebar carries an icon per nav item and
a user menu with sign-out. The topbar is sticky and shows breadcrumbs. The admin has a dark mode, with
a topbar toggle that persists through a cookie and follows the OS preference on a first visit. The admin
icons are Lucide, added as a runtime dependency.

This release also fixes the self-styled admin so its drawer sidebar renders: the stylesheet build now
flattens CSS nesting before scoping (so DaisyUI's `lg:drawer-open` reveal is not severed from its
parent), and the admin layout carries `data-theme` on a wrapper so the drawer's own classes are scoped
descendants. The build gained `lightningcss` as a build-only devDependency for the flatten step; this
does not affect a consumer's runtime.

A frontend-design polish pass then refined the look. The Warm Stone light and dark palettes gained
clearer surface layering and crisper borders, the sidebar an active state in a soft primary tint, and
the list table refined column labels, row hover, and cleaner entry-title links. The list now defaults
to newest-first. A reduced-motion preference is honored inside the admin. A scoped anchor reset
restores the no-underline, inherit-color default the omitted Preflight used to provide.

A design-identity pass then gave the admin its own look. Cairn has a wordmark set in Bricolage
Grotesque over a body face of Figtree, both self-hosted as variable woff2 under the SIL Open Font
License, so the admin makes no webfont network call. An app-icon brand tile sits at the top of the
sidebar with the Cairn cairn-stack mark, a CC0 public-domain glyph, beside a CMS chip. The surfaces
moved to softer radii and floating cards over a calm warm-neutral ground, with a soft violet lift on
the primary button. The sidebar and the topbar share one flat header strip, so their intersection
reads as a single plane.

The nav now groups its entries. The core Cairn functions live in one collapsible group, and a
developer's own admin extensions sit in their own custom-named groups at the same level. Each group's
open or collapsed state persists through a `cairn-admin-nav-collapsed` cookie that the layout load
reads for a no-flash first paint, the way the theme cookie already works. A command palette opens with
Cmd/Ctrl+K or the topbar search box, jumps to any admin destination, and runs a couple of actions like
the theme toggle. The login and confirm screens carry the same wordmark, voice, and favicon.

Two more rendering fixes landed in this window. The login and confirm screens centered on a wrapper
rather than the themed element, so they now fill the viewport like the rest of the admin. The command
palette closed its dialog from a result link's own click handler, and closing a native dialog mid-click
cancelled the navigation, so a destination did nothing; a destination now navigates and the palette
closes once the new route lands.

This is additive for a consumer that mounts the admin through the documented routes. The engine now
depends on `@lucide/svelte`, which installs transitively, so no consumer action is required. A new
`listDeleteAction` is available on the content routes for wiring per-row delete on the list page; the
showcase wires it as the list `?/delete` action.

## 0.31.0

The admin now ships its own stylesheet. The engine compiles the admin's Tailwind utilities and
DaisyUI component classes, scoped under the admin `data-theme`, and the admin styles itself on any
host with no Tailwind or DaisyUI of its own. The compiled sheet leaks no global rule, so it never
touches the host's pages.

Consumers may: remove any Tailwind `@source` entry that existed only to generate the admin's classes;
the admin no longer depends on the host's Tailwind or DaisyUI build. A host that already provides
DaisyUI globally keeps working, since the engine's scoped rules are low-specificity (`:where`) and
the class names match; a later pass moves the admin out of the host's chrome entirely.

## 0.30.0

Carved a `@glw907/cairn-cms/render` authoring subpath for the component-authoring toolkit. `iconSpan`,
`cardShell`, `headRow`, the re-homed `isElement`, and the new `strAttr` now live there, so the root barrel
stays lean and a component `build()` imports its helpers from one obvious place. Added `strAttr(ctx, key)`,
a string-attribute reader, a configurable `headRow` heading level that defaults to 2, a
`registry.iconField(name)` accessor, and a `defineRegistry` guard that fails a component declaring
`defaultIconByRole` with no `type:'icon'` attribute. Dropped `rehypeDispatch` from the public surface, so
`createRenderer` is the one public render pipeline.

Consumers must: import `iconSpan`, `cardShell`, `headRow`, `isElement`, and `strAttr` from
`@glw907/cairn-cms/render` instead of the package root, and replace any direct `rehypeDispatch` use with
`createRenderer`. A component that sets `defaultIconByRole` with no `type:'icon'` attribute now fails
`defineRegistry`; give it an icon attribute or drop `defaultIconByRole`.

## 0.29.0

Consolidated the URL-identity model. A content entry's id, slug, date, and permalink are now derived in
one place (`entryIdentity`), so the content index and the manifest cannot drift on an entry's URL, and a
site's concept descriptors are resolved through one path shared by the admin runtime and the delivery
layer. No public surface changed.

The YAML URL policy is now validated at build. A permalink pattern must be root-relative and use only the
tokens `:slug`, `:year`, `:month`, and `:day`, a date token is valid only on a dated concept, a
`datePrefix` must be `year`, `month`, or `day`, and a policy keyed to an undeclared concept fails the
build.

Behavior note: a site whose `content:` URL policy was malformed and silently defaulted will now fail the
build with a named error. A valid policy is unaffected.

## 0.28.0

### Security
Closed the render attribute-sink residual by construction. A new post-dispatch guard runs last in
`createRenderer` and neutralizes the sinks a component `build()` could route a raw author attribute
value into, including the unsafe URL schemes `javascript:`, `data:`, and `vbscript:` in `href`,
`src`, `srcset`, `xlink:href`, `poster`, `formaction`, `action`, `object`'s `data`, and
`background`, the inline `on*` event handlers, and inline `style`, which is stripped wholesale. Safe
schemes, relative URLs, anchors, and the `cairn:` token are preserved. The guard is gated by the
existing `unsafeDisableSanitize` switch.

Behavior note: a site whose component `build()` emits a non-standard URL scheme, an `on*` handler,
or inline `style` will see that output neutralized. Route dynamic styling through a class or an
inert `data-*` attribute instead.

## 0.27.0

### Changed (breaking)
Narrowed the public export surface so each symbol has one canonical home. The `.` root and
`/sveltekit` no longer re-export another subpath's symbols, and the internal GitHub, signing, and
hast helpers left the public API. No symbol changed behavior; only where it exports from.

- Consumers must: import the delivery read helpers (`createContentIndex`, `createSiteIndexes`, the
  feed, sitemap, robots, SEO, and pagination builders, `permalink`) from `@glw907/cairn-cms/delivery/data`
  instead of the `.` root.
- Consumers must: import the public route loaders and the `*Response` helpers (`createPublicRoutes`,
  `rssResponse`, `jsonFeedResponse`, `sitemapResponse`, `robotsResponse`) and the public route types
  (`PublicRoutesDeps`, the public `ListData`, `TagData`, `TagIndexData`, `EntryData`) from
  `@glw907/cairn-cms/delivery` instead of the `.` root or `/sveltekit`.
- Consumers must: stop importing the internal helpers that left the public API (`appJwt`,
  `installationToken`, `signingSelfTest`, `appCredentials`, `treeUrl`, `contentsUrl`, `readRaw`,
  `fileSha`, `listMarkdown`, `markdownFilesIn`, `commitFile`, `isElement`, `strProp`, `markFirstList`);
  the engine wires GitHub token minting and the render pipeline internally, so no consumer needs them.

## 0.26.0

### Added
- A `cairnManifest()` Vite plugin (`@glw907/cairn-cms/vite`) verifies the committed content manifest on
  every build and fails the build with a diff naming what drifted. The check runs outside the prerender
  lifecycle, so `handleHttpError` cannot mask it. Consumers must: add `cairnManifest({ configModule,
  content, manifestPath })` to the Vite config.
- A `cairn-manifest` bin regenerates the committed manifest from a Vite context. Consumers must: set the
  regenerate script to `"cairn:manifest": "cairn-manifest"` and delete the hand-written
  `scripts/build-manifest.mjs`.
- A node-safe `@glw907/cairn-cms/delivery/data` entry exposes the pure delivery projections with no
  `@sveltejs/kit` in the graph. Consumers must: move any plain-Node import of a delivery data helper
  (such as `buildSiteManifest`) from `@glw907/cairn-cms/delivery` to `@glw907/cairn-cms/delivery/data`.

### Changed
- `verifyManifest` now throws an error that names the added, removed, and changed entries. Consumers
  must: nothing. The message is strictly more informative.

## 0.25.0

### Changed (breaking)
- `composeRuntime` now takes a single object, `composeRuntime({ adapter, siteConfig, extensions? })`,
  and derives the per-concept URL policy from `siteConfig`. The loose third `urlPolicy` argument is
  gone, and a missing `siteConfig` throws. Consumers must: pass the parsed site config to every
  `composeRuntime` call and drop any hand-passed URL policy.

### Changed
- `createRenderer()` now defaults its registry to the empty registry, so a plain-prose site calls
  `createRenderer()` with no argument. Consumers must: nothing; passing a built registry is unchanged.

### Docs
- A render sanitize-floor reference (`docs/render-sanitize-floor.md`) states what the floor keeps,
  strips, and rewrites, including the `target="_blank"` rel policy.
- An upgrade guide (`docs/upgrading.md`) collects the `0.x` renames with a consumer action each.

## 0.24.0

### Added
- `headRow(title, icon?)` builds the icon-plus-heading component head, exported beside `cardShell` and
  `iconSpan`.
- A `createRenderer` `anchorRel` option sets the `rel` value forced on `target="_blank"` anchors
  (default `'noopener noreferrer'`), or disables the injection when set to `false`.

### Changed
- A component's `defaultIconByRole` default now reaches the build through the declared `type: 'icon'`
  attribute (`ctx.attributes`), so a role default no longer needs a hardcoded fallback in the build. A
  component using `defaultIconByRole` must declare a `type: 'icon'` attribute.
- The engine drops an unclaimed directive `[label]` when a component has no `title` slot, so a stray
  `[]` no longer renders an empty paragraph.

### Removed
- The internal `data-icon` marker, which no build read. The resolved icon now travels on the declared
  attribute path.

## 0.23.0

### Changed (breaking)
- A `date` field now validates a real `YYYY-MM-DD` calendar date. A site adopting this version whose
  committed content holds a malformed or impossible date will see it fail validation, which is the loud
  failure this restores.
- A `tags` field now enforces its declared `options` as a closed vocabulary. A committed value outside
  the list fails validation. Use a `freetags` field for free-form tags.
- `normalizeConcepts` now throws when a `summaryFields` key names no declared field, so a typo fails at
  config load instead of silently producing an empty list card.

### Changed
- `AttributeField.options` is now `readonly string[]`, so a site can share one frozen `as const`
  vocabulary across components. Read-only by use, so no call site changes.

## 0.22.0

### Added
- `ContentSummary.concept` and `EntryData.concept`: the read model carries its resolved concept id, so a
  list or page branches per concept without re-deriving it from `entry.date`.
- A `summaryFields` knob on a concept config surfaces named frontmatter keys on `ContentSummary.fields`,
  so a list card reads an authored field with no per-entry detail read.
- The package root re-exports the delivery route loaders (`createPublicRoutes`) and the response helpers
  (`rssResponse`, `jsonFeedResponse`, `sitemapResponse`, `robotsResponse`).

### Changed (breaking)
- `CairnHead` moved off the `@glw907/cairn-cms/delivery` barrel to its own `@glw907/cairn-cms/delivery/head`
  entry, so a node-environment data import from `/delivery` stays component-free. Update the import:
  `import { CairnHead } from '@glw907/cairn-cms/delivery/head'`.
