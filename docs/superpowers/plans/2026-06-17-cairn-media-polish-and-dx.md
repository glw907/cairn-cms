# Plan: Pass A, media polish, the decorative-hero alt fix, and DX docs

> **For agentic workers:** Execute task-by-task by dispatching each task to `cairn-implementer`
> (pinned Sonnet), test-first against the suite. The main loop reviews each diff and clears the full
> gate before the next dispatch. Tasks 1 through 5 are mostly independent and low blast, so this pass
> is a good `Workflow` candidate on Geoff's opt-in. Honor the cairn conventions and the `cairn-pass`
> ritual. Steps are tracked with checkboxes (`- [ ]`).

**Goal:** Clear the small polish and DX debt that accumulated across the media passes, in one
low-risk pass. The Media Library gets the action feedback it lacks, the slide-over Escape stops
fighting the search box, a decorative hero stops reading as needs-alt after a reload, and three
standing doc gaps close. The pass also refreshes the ROADMAP, which has gone stale (the gallery is
done, the `0.56.0` gates pass landed, and the `singular` descriptor it lists already shipped).

**Architecture:** Every item is additive and contained. The feedback strip threads URL flash flags
through `mediaLibraryLoad` into `MediaLibraryData` and renders them in `CairnMediaLibrary`, the same
pattern `listLoad`/`editLoad` already use. The Escape fix narrows one window keydown guard. The
decorative-hero fix persists an additive optional `decorative` key on the stored `ImageValue` and
feeds the `MediaHeroField` seam that already exists (`decorativeInitial`), so a deliberate empty alt
survives a reload as a choice rather than as debt. The docs are prose, no code. Nothing changes a
public signature in a breaking way, so this ships as a patch.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, the cairn admin dispatch/composer, the frontmatter
form/validate/serialize seam (`content/frontmatter.ts`, `content/validate.ts`, `content/types.ts`),
the hero field (`components/MediaHeroField.svelte`), the Media Library
(`components/CairnMediaLibrary.svelte`), the loader (`sveltekit/content-routes.ts`), DaisyUI v5,
Vitest (unit + real-browser component).

Source: the 3c post-mortem and review fold-in carry-forwards
(`docs/superpowers/plans/2026-06-17-cairn-media-3c-library.md`), the 3b hero carry-forwards, and the
friction log (`docs/internal/docs-friction-log.md`). Builds on the whole media stack on `main`
(`0.57.0`, the bundled media window).

**Version:** a patch, `0.57.1`. This pass executes after the `0.57.0` release and the first site
cutover, so it is its own small release, not part of the bundled `0.57.0` window. The decorative key
is additive and optional, so a site needs no action; the feedback strip and the Escape fix are
admin-only with no consumer surface.

---

## Execution

Standard loop: one `cairn-implementer` per task, test-first, on a worktree off `main`, the main loop
reviewing each diff and clearing the full gate (`npm run check` 0/0, `npm test` exit 0, plus the
reference, signature, package, docs, readiness, prose, and version gates) between dispatches. Effort:
low to medium. No task is high-blast; review the decorative-hero task (Task 3) most closely, since it
touches the committed frontmatter shape.

The tasks are mostly independent: Task 1 (the feedback strip), Task 2 (the Escape fix), and Task 3
(the decorative hero) touch different surfaces; Tasks 4 and 5 are docs. Sequence is free; do the docs
(4, 5) last so they describe what shipped.

Two media carry-forwards are deliberately left out of this pass, with reasons:

- The `singular` concept descriptor (a friction-log item) already shipped. `normalizeConcepts`
  resolves `singular: config.singular ?? label` and `ConceptList` renders `New {createNoun}` from it.
  Task 5 marks the friction-log entry resolved rather than re-doing it.
- Resolving a renamed `seo:true` hero field in `deriveHeroImage` at delivery (a 3b carry-forward) is
  deferred, not dropped. It has zero impact today, since every consumer names its hero `image`, and
  the fix would thread per-concept field declarations into the cross-concept delivery read path,
  which the schema-source-of-truth boundary keeps clean on purpose. Revisit when a site renames its
  hero, or fold it into a future delivery pass. It stays a documented carry-forward (below).

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

- `mediaLibraryLoad` reads `event.url.searchParams`: a `deleted=1` or `updated=1` flag and an
  `error` string, mirroring how `listLoad` reads `error`/`publishedAll`. Return them on
  `MediaLibraryData` (for example `flash: 'deleted' | 'updated' | null` plus the error string; if the
  conflict error shares the existing `error` slot with the degraded-load error, keep them
  distinguishable or document the shared slot).
- `CairnMediaLibrary` renders a dismissible success strip ("Asset deleted." / "Changes saved.") and
  shows the error in the existing inline error treatment. The strip is polite (an `aria-live`
  region) and does not steal focus. Match the office flash grammar the list and edit pages use.

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
  seed `decorativeInitial` from the stored value so the resting alt-status reads Decorative, not
  Needs alt, after a reload)
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

## Task 4: the DX doc gaps

Three friction-log candidates, all developer-facing prose.

**Files:**
- Create or extend: a content-authoring syntax reference covering the `cairn:` and `media:` tokens
  together (both are author-facing syntax whose codecs are engine-internal, so neither has a natural
  home in the export-keyed reference). Place it where the reference index can link it.
- Extend: the SvelteKit reference or a guide with a short "writing an admin fetch action" note. A
  form action 415s a non-form content type, the result rides a 200 JSON envelope (`{ type, status,
  data }`) so a `fail(status)` is not an HTTP status, and the shipped transport posts `text/plain`
  with the CSRF in an `X-Cairn-CSRF` header. This is the 2a upload-transport lesson, so a future
  fetch-style admin action builds against it from the start.
- Extend: the contributor or plan-authoring guidance with a one-line note that tests live under
  `src/tests/{unit,integration,component}/`, since the vitest config does not run a co-located
  `src/lib/**/*.test.ts`.

**Gate:** `npm run check:reference`, `check:package`, `check:docs` green; the prose-guard clean on
the new prose (no em dashes, the developer-docs register).

---

## Task 5: refresh the ROADMAP and triage the friction log

The ROADMAP "Now" still reads as the in-progress `0.56.0` gates pass, the gallery sits in "Next"
though it shipped through 3c, and the `singular` item it lists already shipped.

**Files:**
- Modify: `ROADMAP.md` (retire the completed `0.56.0` "Now" block, move "Image and gallery
  management" out of "Next" as shipped through Phase 3, and record the post-media series of passes:
  Pass A this plan, Pass B replace-in-place plus alt propagation, Pass C bulk operations plus orphan
  collection, then the scaffolder as the capstone, with the CSRF migration and the on-demand items in
  the watch bucket)
- Modify: `docs/internal/docs-friction-log.md` (mark the `singular`-descriptor entry resolved, since
  it shipped; note the three Task 4 doc gaps as addressed)

**Gate:** `check:docs` green.

---

## Task 6: pass-end ritual

Simplify (code-simplifier over the pass's changed code), the proportionate review gate (the relevant
reviewers in parallel: `svelte-reviewer` and `daisyui-a11y-reviewer` for the feedback strip and the
Escape fix, plus a focused correctness look at the decorative round trip; the `cloudflare-workers`
and `web-auth-security` reviewers are not needed, since no commit, branch, or auth code changes;
suggest the adversarial review-gate workflow for Geoff's opt-in), the docs arm (this pass is largely
docs; run the three doc gates), the version bump to `0.57.1` with the changelog entry and the
upgrade-guide entry (the decorative key is additive, so the changelog states no consumer action is
required), and the tracking (the post-mortem in this plan, STATUS on `main`, the gallery and 3c
memories). No live admin smoke is owed: the feedback strip and the Escape fix are covered by the
component suite, the decorative round trip by the unit and component suites, and the first site
cutover already runs the live media smoke this pass does not change.

---

## Carry-forward (beyond Pass A)

- Resolving a renamed `seo:true` hero field in `deriveHeroImage` at delivery stays deferred (from 3b
  and from this pass). Thread the per-concept SEO image field name into the delivery read path so a
  hero named other than `image` resolves at delivery, or revisit the boundary. Zero impact until a
  site renames its hero.
- Pass B, replace-in-place plus alt propagation, is the next media pass: upload-new plus a `main`-only
  repoint with a branch-delta report, and propagating an alt fix across every placement. High blast
  (cross-branch rewrites), mockup-first (the Replace control).
- Pass C, bulk operations plus orphan collection: multi-select, usage-aware bulk delete, the
  destructive `reconcileMedia` sweep, and the broadened needs-alt scanner. Mockup-first.
- The decorative body-image case stays out of scope: a decorative `![](media:...)` cannot persist the
  choice in markdown alt, so it still reads as needs-alt on reload, unless a syntax or media.json
  convention for it is designed.
