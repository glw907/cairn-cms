# Plan: Pass A, media polish, the decorative-hero alt fix, and the cutover DX debt

> **For agentic workers:** Execute task-by-task by dispatching each task to `cairn-implementer`
> (pinned Sonnet), test-first against the suite. The main loop reviews each diff and clears the full
> gate before the next dispatch. Tasks 1 through 6 are mostly independent and low blast, so this pass
> is a good `Workflow` candidate on Geoff's opt-in. Honor the cairn conventions and the `cairn-pass`
> ritual. Steps are tracked with checkboxes (`- [ ]`).

**Goal:** Clear the small polish and DX debt the media work left, plus the friction the two site
cutovers (ecxc and 907-life) surfaced. The Media Library gets the action feedback it lacks, the
slide-over Escape stops fighting the search box, a decorative hero stops reading as needs-alt after a
reload, the reserved-`figure` build break gets a clearer error, and the media-cutover docs stop
leading a developer into broken public images. The pass also refreshes the stale ROADMAP.

**Architecture:** Every item is additive and contained. The feedback strip threads URL flash flags
through `mediaLibraryLoad` into `MediaLibraryData` and renders them, the pattern `listLoad`/`editLoad`
already use. The Escape fix narrows one window keydown guard. The decorative fix persists an additive
optional `decorative` key on `ImageValue` and feeds the `MediaHeroField` seam that already exists. The
registry-error fix names the colliding component in an existing throw. The rest is docs. Nothing
changes a public signature in a breaking way, so this ships as a patch.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, the cairn admin dispatch/composer, the frontmatter
form/validate/serialize seam (`content/frontmatter.ts`, `content/validate.ts`, `content/types.ts`),
the hero field (`components/MediaHeroField.svelte`), the Media Library
(`components/CairnMediaLibrary.svelte`), the loader (`sveltekit/content-routes.ts`), the registry
(`render/registry.ts`), DaisyUI v5, Vitest (unit + real-browser component).

Source: the 3c post-mortem and review carry-forwards
(`docs/superpowers/plans/2026-06-17-cairn-media-3c-library.md`), the 3b hero carry-forwards, and the
friction log (`docs/internal/docs-friction-log.md`), which now holds six entries from the ecxc and
907-life 0.57.0 cutovers. Builds on the whole media stack on `main` (`0.57.0`, published).

**Version:** a patch, `0.57.1`. Both site cutovers landed on `feat/media-cutover` branches against
`0.57.0` (held for the live smoke and deploy), so this pass can execute now; the sites pick up the
polish on a later bump. The decorative key is additive and optional, so a site needs no action; the
feedback strip, the Escape fix, and the registry-error message are admin or build-time with no
consumer surface.

---

## Execution

Standard loop: one `cairn-implementer` per task, test-first, on a worktree off `main`, the main loop
reviewing each diff and clearing the full gate (`npm run check` 0/0, `npm test` exit 0, plus the
reference, signature, package, docs, readiness, prose, and version gates) between dispatches. Effort:
low to medium. No task is high-blast; review the decorative-hero task (Task 3) most closely, since it
touches the committed frontmatter shape.

The tasks are mostly independent. Tasks 1, 2, 3, and 5 touch different code surfaces; Task 4 and the
docs half of Task 6's ritual are prose. Do the docs (Task 4) and the ROADMAP (Task 6's tracking) last
so they describe what shipped.

Two media carry-forwards are deliberately left out of this pass, with reasons:

- The `singular` concept descriptor (a friction-log item) already shipped. `normalizeConcepts`
  resolves `singular: config.singular ?? label` and `ConceptList` renders `New {createNoun}` from it.
  Task 4 marks the friction-log entry resolved rather than re-doing it.
- Resolving a renamed `seo:true` hero field in `deriveHeroImage` at delivery (a 3b carry-forward) is
  deferred. It has zero impact today, since every consumer names its hero `image`, and the fix would
  thread per-concept field declarations into the cross-concept delivery read path, which the
  schema-source-of-truth boundary keeps clean on purpose. It stays a carry-forward (below).

---

## Task 1: the Media Library action feedback strip

Carry-forward from the 3c review (svelte-reviewer finding 5, the opus finding on the unread conflict
redirect). The one rough edge in the new screen's feedback loop.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (`mediaLibraryLoad` reads the flash flags into
  `MediaLibraryData`; the `MediaLibraryData` type gains the flash fields)
- Modify: `src/lib/components/CairnMediaLibrary.svelte` (render the confirmation and error strip)
- Test: `src/tests/unit/content-routes-media.test.ts` (extend), `src/tests/component/CairnMediaLibrary.test.ts` (extend)

`mediaDeleteAction` redirects to `/admin/media?deleted=1`, `mediaUpdateAction` to
`/admin/media?updated=1`, and a commit conflict redirects to `/admin/media?error=<message>`, but
`mediaLibraryLoad` reads none of them, so a delete, a rename, and a conflict all land on a silent
page.

- `mediaLibraryLoad` reads `event.url.searchParams`: a `deleted=1` or `updated=1` flag and an `error`
  string, mirroring how `listLoad` reads `error`/`publishedAll`. Return them on `MediaLibraryData`
  (for example `flash: 'deleted' | 'updated' | null` plus the error string; if the conflict error
  shares the existing `error` slot with the degraded-load error, keep them distinguishable or document
  the shared slot).
- `CairnMediaLibrary` renders a dismissible success strip ("Asset deleted." / "Changes saved.") and
  shows the error in the existing inline error treatment. The strip is polite (an `aria-live` region)
  and does not steal focus. Match the office flash grammar the list and edit pages use.

**Tests:**
- `mediaLibraryLoad` returns the parsed flash flag and the error from the URL.
- The component renders the success strip for `deleted` and `updated`, and the error strip for an
  `error`.

**Gate:** full gate green.

---

## Task 2: the slide-over Escape edge

Carry-forward from the 3c review (daisyui-a11y-reviewer finding 5).

**Files:**
- Modify: `src/lib/components/CairnMediaLibrary.svelte` (`onWindowKeydown`)
- Test: `src/tests/component/CairnMediaLibrary.test.ts` (extend)

With the slide-over open and focus in the search box, one Escape both clears the native `<input
type="search">` and closes the slide-over. Narrow the window Escape handler so it closes the
slide-over only when focus is within the panel (test `panelEl.contains(document.activeElement)`), so
Escape in the search box clears the search and leaves the panel as the user left it. Keep the dialog
precedence (the handler already yields to an open `deleteDialog`).

**Tests:**
- Escape with focus in the search input does not close an open slide-over.
- Escape with focus inside the slide-over closes it and returns focus to the origin (the existing
  behavior stays green).

**Gate:** full gate green.

---

## Task 3 (review closely): persist the decorative-hero alt choice

Carry-forward from 3b. A decorative hero commits `alt: ''`, indistinguishable from a left-blank alt,
so on reload the needs-alt notice flags a deliberately decorative hero. The `MediaHeroField` already
carries the `decorativeInitial` seam, but it always reads `false` because the frontmatter never
persists the choice.

**Files:**
- Modify: `src/lib/content/types.ts` (`ImageValue` gains `decorative?: boolean`, additive optional)
- Modify: `src/lib/content/frontmatter.ts` (`frontmatterFromForm` image arm decodes a
  `${field.name}.decorative` form flag; when set, store `decorative: true` with the empty alt; omit
  the key otherwise to keep committed frontmatter minimal)
- Modify: `src/lib/content/validate.ts` (the image arm normalizes and permits the `decorative` key;
  it is never required and never a save block)
- Modify: the `formValues` read-back (wherever `editLoad` projects the image field back to the form,
  so `MediaHeroField` receives `decorativeInitial` from the stored value)
- Modify: `src/lib/components/MediaHeroField.svelte` (write the `decorative` form flag on submit;
  seed `decorativeInitial` from the stored value so the resting alt-status reads Decorative, not Needs
  alt, after a reload)
- Modify: the editor needs-alt notice path so a decorative hero is not counted as needs-alt across a
  reload (it already is in-session; persistence makes it survive)
- Test: `src/tests/unit/*frontmatter*` and `*validate*` (the round trip), `src/tests/component/MediaHeroField.test.ts` (the resting status)

This pass makes one design decision: persist `decorative` only on the frontmatter hero, which has an
object slot for it. A decorative body image (`![](media:...)`) cannot persist the choice, since
markdown alt text has no slot, so a decorative body image still reads as needs-alt on reload. The
asymmetry is inherent to the two storage formats and is accepted; the hero fix stands on its own and
matches the `MediaHeroField` seam already in place. Document the asymmetry in the field's doc comment
and the explanation arm.

**Tests:**
- A decorative hero round-trips: the form's decorative choice commits `decorative: true` with
  `alt: ''`, parses back, and seeds `MediaHeroField` so the resting status is Decorative.
- A described hero commits its alt and no `decorative` key; a left-blank hero commits no `decorative`
  key and still reads as Needs alt (the needs-alt signal is unchanged for the non-decorative empty
  case).
- An existing committed hero without the key still parses and renders (additivity).

**Gate:** full gate green, the prose gate (the field copy) green.

---

## Task 4: the DX docs, including the cutover doc debt

The original three friction-log candidates, plus the six findings the ecxc and 907-life cutovers
surfaced (logged 2026-06-17). All developer-facing prose. The two cutover findings marked HIGH are the
priority: a developer following the current media docs ships broken public images.

**Files:**
- Modify: `docs/guides/upgrade-cairn.md` and `docs/guides/wire-the-delivery-surface.md` (the media
  steps), `docs/reference/media.md` and `docs/reference/sveltekit.md` (as the resolver wiring is
  described), `CHANGELOG.md` (the figure-collision callout), plus a new content-authoring syntax
  reference page and the contributor or plan-authoring guidance.

The doc fixes, by priority:

1. HIGH. Move the public media resolver wiring into the REQUIRED media steps. The current guide makes
   media work for the editor after binding the bucket, mounting the route, and declaring `assets`, but
   a published body `![](media:...)` ships a bare `media:` token on the live site unless the site
   threads a `makeMediaResolver` into both `render` and `createPublicRoutes`. That wiring sits under
   the OPTIONAL "adopt the hero" section, so a developer who does only the required steps ships broken
   public images with no error. State it as required for any public media, body or hero.
2. HIGH. Raise the reserved-`figure` collision to a prominent breaking callout in the upgrade guide
   and the changelog. Upgrading to 0.57 hard-fails the build for any site with a registry component
   named `figure`. The current note is a mid-paragraph aside, and it says "rename" without the case
   that matters more: a custom figure superseded by 3a should be removed, adopting the engine's, not
   renamed. (Task 5 improves the thrown error itself.)
3. Name the `@glw907/cairn-cms/media` import path for `makeMediaResolver` and `normalizeAssets` in the
   guide snippet; today only the showcase source shows where they come from.
4. Document the empty-`media.json` bootstrap: a fresh site needs `src/content/.cairn/media.json` as
   `{}` before the build's JSON import resolves. (The Task-5b carry-forward may make this unnecessary;
   document it for now.)
5. Show the R2 binding in both `wrangler.jsonc` and `wrangler.toml` (both production sites use
   `.toml`), or note the translation.
6. Note that the figure placement CSS reference is scoped to `.site-main`, so a site whose content
   container differs must re-scope the selectors, not just "adjust the pixels."
7. The original three: a content-authoring syntax reference covering the `cairn:` and `media:` tokens
   together (both author-facing, both engine-internal codecs with no export-keyed home); a "writing an
   admin fetch action" note (the 2a transport: a form action 415s a non-form content type, the result
   rides a 200 JSON envelope, the shipped transport posts `text/plain` with `X-Cairn-CSRF`); a
   one-line note that tests live under `src/tests/{unit,integration,component}/`.

**Gate:** `npm run check:reference`, `check:package`, `check:docs` green; the prose-guard clean on the
new prose (no em dashes, the developer-docs register). A new reference page must be linked from the
index.

---

## Task 5: the reserved-directive throw names the colliding component

Cutover finding 1 (engine half). The ecxc cutover hit `cairn: "figure" is a reserved directive name
... a component cannot use it` from both `cairn-manifest` and the build, but the error names neither
the offending registry nor a fix, so a developer must grep to find which component collides.

**Files:**
- Modify: `src/lib/render/registry.ts` (the reserved-name throw in `defineRegistry`)
- Test: `src/tests/unit/*registry*` (extend)

- Improve the thrown message to name the colliding component (it already knows the name it is
  rejecting) and add a short "rename it or remove it if the engine now provides the directive" hint.
  Keep it one clear sentence; this is a build-time developer error, so it should point at the fix.

**Tests:**
- `defineRegistry` with a component named `figure` throws an error whose message includes the
  component name and the remove-or-rename hint.

**Gate:** full gate green.

---

## Task 6: refresh the ROADMAP, triage the friction log, then the pass-end ritual

The ROADMAP "Now" still reads as the in-progress `0.56.0` gates pass, the gallery sits in "Next"
though it shipped through 3c, and the `singular` item it lists already shipped.

**Files:**
- Modify: `ROADMAP.md` (retire the completed `0.56.0` "Now" block; move "Image and gallery management"
  out of "Next" as shipped through Phase 3; record the post-media series of passes: Pass A this plan,
  Pass B replace-in-place plus alt propagation, Pass C bulk operations plus orphan collection, then
  the scaffolder as the capstone, with the CSRF migration and the on-demand items in the watch bucket)
- Modify: `docs/internal/docs-friction-log.md` (mark the `singular`-descriptor entry resolved; mark
  the cutover findings this pass addresses as closed, and the resolver-ergonomic one as carried)

Then the pass-end ritual: simplify (code-simplifier over the changed code), the proportionate review
gate (`svelte-reviewer` and `daisyui-a11y-reviewer` for the feedback strip and the Escape fix, plus a
focused correctness look at the decorative round trip; the `cloudflare-workers` and
`web-auth-security` reviewers are not needed, since no commit, branch, or auth code changes; suggest
the adversarial review-gate workflow for Geoff's opt-in), the docs arm (this pass is largely docs; run
the three doc gates), the version bump to `0.57.1` with the changelog entry and the upgrade-guide
entry (the decorative key is additive, so the changelog states no consumer action is required), and
the tracking (the post-mortem in this plan, STATUS on `main`, the gallery and 3c memories). No live
admin smoke is owed: the feedback strip and the Escape fix are covered by the component suite, and the
decorative round trip by the unit and component suites.

**Gate:** full gate green; the three doc gates green.

---

## Carry-forward (beyond Pass A)

- **The `runtime.publicMediaResolver` ergonomic (needs a brainstorm before it is planned).** Cutover
  findings 2 and 4 share one deeper fix: have `composeRuntime` expose a ready-built public media
  resolver so a site writes `resolveMedia: runtime.publicMediaResolver` instead of hand-assembling
  `makeMediaResolver(mediaManifest, normalizeAssets(...))` from `/media` and hand-seeding an empty
  `media.json`. The open design question is how the engine gets the committed media manifest at the
  composition point (the site imports the JSON at build time today; `composeRuntime` takes the adapter
  and the site config, not the manifest), and whether the read tolerates an absent manifest so the
  bootstrap file is unnecessary. This would subsume the Task 4 doc fixes 1, 3, and 4 for future sites
  and the scaffolder. Settle the design with Geoff before planning it.
- Resolving a renamed `seo:true` hero field in `deriveHeroImage` at delivery (deferred from 3b and
  from this pass). Thread the per-concept SEO image field name into the delivery read path, or revisit
  the boundary. Zero impact until a site renames its hero.
- Pass B, replace-in-place plus alt propagation, is the next media pass: upload-new plus a `main`-only
  repoint with a branch-delta report, and propagating an alt fix across every placement. High blast
  (cross-branch rewrites), mockup-first (the Replace control).
- Pass C, bulk operations plus orphan collection: multi-select, usage-aware bulk delete, the
  destructive `reconcileMedia` sweep, and the broadened needs-alt scanner. Mockup-first.
- The decorative body-image case stays out of scope: a decorative `![](media:...)` cannot persist the
  choice in markdown alt, so it still reads as needs-alt on reload, unless a syntax or media.json
  convention for it is designed.
