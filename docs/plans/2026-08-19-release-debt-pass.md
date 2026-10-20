# Release-Debt Pass Implementation Plan (the six consumer-facing engine defects)

> **For agentic workers:** execute task-by-task via `cairn-implementer` per the `cairn-pass`
> skill, the main loop reviewing each diff and verifying the full gate between dispatches.
> Steps use checkbox (`- [ ]`) syntax for tracking. Every task is one or two files; none needs
> a model upshift.

**Goal:** Close the six library defects a real site feels, so the release Geoff cuts next can go
out and every current site can be updated onto it without inheriting a known break.

**Why these six and not the Now tier:** Geoff scoped this directly on 2026-08-19, choosing the
consumer-facing engine defects over two larger alternatives. The four `create-cairn-site`
first-run defects, the site-name slug collision, and the four verification holes are all
deliberately OUT and stay filed in `ROADMAP.md`'s Now tier. Do not widen this pass to reach them;
route anything discovered to the pass that first leans on it.

**Sequencing this pass sits in (Geoff, 2026-08-19):** this pass, then the release, then Geoff
updates all current sites, then live site work with the docs updated in parallel. This supersedes
the 2026-08-15 "release one waits for the visual layer" ruling. `docs/STATUS.md` carries both,
the older one marked superseded.

**Evidence base:** every claim below was re-verified against `main` on 2026-08-19 by a read-only
sweep, after the ROADMAP entries were written. All six were still true, with the file and line
numbers given per task. Verify again at the first task that touches each file rather than trusting
these lines, since a plan's paths rot.

## The rule this pass turns on

**Five of the six defects have no test that would catch them, and the sixth is covered only by a
loose regex that passes either way.** That is why they survived. So a fix here is not done when the
behavior changes; it is done when a test fails first against the current code and passes after.
Write or tighten that test before the fix, and prove it fails, in every task. A task that reports a
green suite without having watched its own new assertion go red has not finished.

## Global constraints

- One worktree off `main`, one executor. Run the one-executor check before starting
  (`pgrep -f cairn-cms`, warm `git status`).
- **Derive the gate list from CI, never from memory, and run it BEFORE committing.** This repo's
  gates are not `npm run check` plus `npm test`: `grep -l pull_request .github/workflows/*.yml`
  for the workflows, then `grep -nE "run: npm( run)? " .github/workflows/test.yml` for the steps.
  The session that wrote this plan shipped `main` red on `check:surface` by running a remembered
  subset. Any exported-type change additionally needs `npm run check:surface -- --update` with the
  regenerated `docs/internal/api-surface.md` committed.
- `CHANGELOG.md` gets an entry per task under `## Unreleased`, each carrying its `Consumers must:`
  line (most will read "nothing"; task 1 and task 4 may not).
- No version bump, no publish. The release is a separate act via the `cairn-release` skill.

---

### Task 1: the admin resolves its own media base

**Files:** Modify: `src/lib/sveltekit/content-routes-core.ts`,
`src/lib/components/CairnAdminShell.svelte`. Test: `src/tests/component/media-public-base.test.ts`.

**The defect:** a site with a non-default `assets.publicBase` has broken admin thumbnails today.
`media/config.ts` makes the base configurable and `render/resolve-media.ts` honors it for rendered
output, but no admin mount provides it. `CairnAdminShell.svelte:66` sets only `CSRF_CONTEXT_KEY`,
so every reader (`MediaHeroField`, `MarkdownEditor`, `MediaPicker`, `CairnMediaLibrary`) falls back
to `DEFAULT_MEDIA_BASE = '/media'`. The seam pass made the base injectable through
`MEDIA_BASE_CONTEXT_KEY` and wired only the fixture value, in `ReproContext.svelte`.

- [ ] Failing test first: mount `CairnAdminShell` with a shell payload whose resolved base is NOT
  `/media` and assert a media surface under it composes its `img` src from that base. The existing
  file proves each component honors an injected value and defaults without one; what is missing is
  that the real shell injects anything at all.
- [ ] `AdminShellData`'s authed branch carries the resolved base, populated in `shellLoad` from
  `runtime.resolvedAssets.publicBase`, which is already in scope there.
- [ ] `CairnAdminShell` sets `MEDIA_BASE_CONTEXT_KEY` alongside the CSRF key. No component that
  reads the key changes.
- [ ] `ReproContext` keeps setting the fixture value and keeps working unchanged.
- [ ] Acceptance: the new test red then green; `AdminShellData` is public surface, so
  `check:surface -- --update` and `check:reference`/`check:reference:signatures` all run and the
  regenerated snapshot is committed. Deliverables: one field, one provider, one test.

### Task 2: the Edit block control is guarded, not disabled

**Files:** Modify: `src/lib/components/EditPage.svelte`. Test: `src/tests/component/EditPage.test.ts`.

**The defect:** `EditPage.svelte:2084-2095` disables the Edit block control with
`class:btn-disabled`, which DaisyUI gives `pointer-events: none`, so the `title` naming why it is
off never reaches a mouse user, and the icon sits at the treatment `cairn-admin.css:695` describes
as reading "as an empty gap rather than a disabled control". The Figure control at `:2173-2182`
does it correctly with `cairn-btn-guarded`, and its comment at `:2162-2172` states the rule Edit
block breaks in as many words.

- [ ] Failing test first: assert the unavailable Edit block keeps `pointer-events` reachable, the
  way `EditPage.test.ts:3239-3259` already does for Figure. The existing Edit block tests at
  `:2646-2692` assert `aria-disabled`, `disabled`, and `control.focus()`, none of which sees this:
  programmatic focus ignores `pointer-events: none`.
- [ ] The fix follows Figure's shape rather than inventing a third one: `cairn-btn-guarded`
  unconditional, `cursor-not-allowed` conditional, `class:btn-disabled` gone.
- [ ] **Check whether the `editor/toolbar` reproduction transcribes this control as it is today.**
  ROADMAP records that fixing this updates that story. If it does, update it in this task and say
  so; if it does not, say that too rather than leaving it unstated.
- [ ] Acceptance: the new assertion red then green; the reproduction suites still pass.
  Deliverables: one control, one test, plus the reproduction check.

### Task 3: a delete refusal names one entry, not the concept

**Files:** Modify: `src/lib/components/ConceptList.svelte`. Test:
`src/tests/component/ConceptList.test.ts`.

**The defect:** `ConceptList.svelte:255` (the live-region announcement) and `:316` (the visible
banner) both interpolate the PLURAL concept label into a singular sentence. For the showcase's
Posts concept the rendered sentence is "This posts could not be deleted." The same component
already derives the correct singular one line away, at `:211`.

- [ ] Tighten the assertions first, and watch them fail. `ConceptList.test.ts:306,327`,
  `reproductions-stories.test.ts:654`, and `EditPage.test.ts:777,795,818` all match
  `/could not be deleted/i`, which passes whichever noun renders. Assert the whole sentence for a
  concept whose singular and plural differ.
- [ ] Both call sites use `(data.singular ?? data.label)`, matching `:211`'s existing pattern.
- [ ] Acceptance: tightened assertions red then green in every file that carries one.
  Deliverables: two lines, assertions tightened in three test files.

### Task 4: `SiteConfig`'s doc matches its parser

**Files:** Modify: `src/lib/nav/site-config.ts`.

**The defect:** the doc comment at `:74-76` says "Unknown keys are ignored so the file can grow
without an engine change", and the index signature at `:104` (`[key: string]: unknown`) advertises
the same openness. `parseSiteConfig` at `:318-341` throws on anything outside
`KNOWN_TOP_LEVEL_KEYS`. The strict behavior is the deliberate half, and it has its own
`ADAPTER_MISPLACEMENTS` table for the common misplacement case, so the doc is what is wrong.

- [ ] Rewrite the doc comment to state the strict, throwing behavior and why it is strict.
- [ ] **Decide the index signature rather than leaving it.** It advertises openness the parser
  refuses. Removing it is a public-surface change and needs `check:surface -- --update`; keeping it
  needs a comment saying why a type-level escape hatch survives a runtime refusal. Either is
  acceptable; silently leaving it as-is is not.
- [ ] Acceptance: the existing `unrecognized key` tests still pass untouched (the behavior does not
  move); `check:comments`, and `check:surface` if the signature goes. Deliverables: one doc
  comment, one signature decision.

### Task 5: a free-tier bundle warning that can actually fire

**Files:** Add: a `src/lib/doctor/` check. Modify: `.github/workflows/e2e.yml`,
`docs/admin/create-your-site.md`, `docs/admin/own-your-domain.md`. Test: the doctor check's own
unit test.

**The defect:** the showcase Worker bundle measures about 3.17 MiB gzipped against Cloudflare's
3 MiB Workers Free script limit, and the scaffolded site inherits that bundle through the emitted
template. The only tripwire, `.github/workflows/e2e.yml:74`, budgets 5 MiB
(`budget=$((5 * 1024 * 1024))`), so it cannot fail until well past the point a free-plan deploy
already has. `src/lib/doctor/` has no size check at all. Meanwhile
`docs/admin/create-your-site.md:90` tells a reader "All of this runs on Cloudflare's free plan" and
`docs/admin/own-your-domain.md:25` says "the connection both run on the free plan".

- [ ] **The ask is a calibrated warning, not a resolver rewrite.** Do not attempt to get the bundle
  under 3 MiB in this pass; that is a different problem with a different owner.
- [ ] A doctor check measures the built Worker's gzipped size against the free-tier ceiling and
  warns with the real number, following the existing `checks-*.ts` shape. Its unit test proves it
  fires above the ceiling and stays quiet below, both directions.
- [ ] The CI budget gains a second, free-tier-calibrated threshold near 3 MiB that warns, keeping
  the existing 5 MiB hard failure. A gate that cannot fail at the limit it documents is the defect
  class this pass exists to close, so make the new threshold observable in the log.
- [ ] Both doc claims gain one caveat sentence naming the size ceiling. Google style, admin arm
  register per `docs/internal/docs-register.md`.
- [ ] Acceptance: the check's test red then green in both directions; `check:vale`, `check:docs`,
  `check:readiness` (the doctor's conditions are anchored in `is-it-working.md`, so a new check may
  owe an anchor there). Deliverables: one check, one test, one CI threshold, two doc sentences.

### Task 6: a scaffolded build stops printing a refusal at its owner

**Files:** Modify:
`packages/create-cairn-site/template/src/theme/components/SiteFooter.svelte`.

**The defect:** the baked template's footer links `/admin` on every page (`SiteFooter.svelte:17`,
rendered at `:33-42`), the prerender crawler follows it, `src/lib/sveltekit/guard.ts:115` answers
with `log.warn('guard.rejected', { reason: 'https' })` and a branded 400, and
`template/svelte.config.js:24-25` has `handleHttpError: 'warn'`, so every new owner's first build
prints a security-shaped refusal and a `400 /admin (linked from /)` that no doc explains. Two live
records corroborate it independently:
`docs/internal/record/2026-08-13-t5-task8-live-e2e.md:152` and
`docs/superpowers/plans/2026-08-12-create-cairn-site-t5.md:521`.

- [ ] The fix is in the template, not the guard: the guard is behaving correctly and its own
  integration test (`src/tests/integration/auth-guard.test.ts:510-514`) pins that. Suppress the
  crawl instead, with `data-sveltekit-prerender="false"` on the link or the narrowest equivalent.
- [ ] The Admin link stays in the footer and stays clickable for a reader. Removing it is not the
  fix.
- [ ] Prove it: the scaffold's own build should no longer print the 400 line. `create-site.yml`
  builds the real scaffolded site on CI, so that is the gate that sees this; state plainly in the
  post-mortem how it was verified, since nothing local reaches the baked template.
- [ ] Acceptance: `npm run check:dev-package`, the scaffold and create-site workflows green on the
  branch push. Deliverables: one attribute, one verification note.

### Task 7: pass close

- [ ] `code-simplifier` over everything this pass changed.
- [ ] The CI-derived gate list in full, run before the commit.
- [ ] Reviewer fan-out: `svelte-reviewer` and `daisyui-a11y-reviewer` at minimum (tasks 1, 2, 3 are
  all component work); add `cloudflare-workers-reviewer` for task 5's size check.
- [ ] Docs: `CHANGELOG.md` entries under `## Unreleased`, the per-version record in
  `docs/extend/migration-notes.md`, and the reference page for task 1's `AdminShellData` change.
- [ ] `ROADMAP.md`: remove the six shipped entries from the Now tier. Leave the deferred ones.
- [ ] Post-mortem appended here; `docs/STATUS.md` updated to point at the release as the next
  action, naming the open question below.
- [ ] Score both budgets: tokens spent, and the human interaction points this pass cost.

## The open question this pass hands to the release, and does not answer

Geoff's reordering puts the cut ahead of the editors rewrite. The four same-cut obligations
(engine, `create-cairn-site`, `@glw907/cairn-cms-dev`, the template repo) plus T5a' were written
against the OLD ordering, and `ROADMAP.md` records the four `create-cairn-site` first-run defects
as "owed before release one publishes the tool" — one of which strands a reader outright, since
after a failed first run the resume refuses to continue because the repository the tool itself
created already exists, and recovery needs a `delete_repo` permission the reader may not have.

**So the cut must decide whether the tool ships in it or holds.** That is a `cairn-release` gate
question for Geoff. This pass does not settle it, and must not quietly assume either answer.

---

## Post-mortem (2026-08-19, executed and closed)

**All six defects are closed, on branch `release-debt` off `main`, nine commits `8832920b` through
`5086d184`. No version bump, no publish.** The pass ran as planned through task 6, then closed at
Geoff's ruling rather than absorbing a seventh thing it found.

### What shipped

1. **The admin resolves its own media base.** `AdminShellData`'s authed branch carries the resolved
   base, `shellLoad` populates it from `runtime.resolvedAssets`, `CairnAdminShell` provides it
   through the existing context key. No reader changed. The test mounts the real shell around a
   `MediaPicker`, so it proves the shell *injects* rather than that a component *honors*.
2. **The Edit block control is guarded, not disabled.** `cairn-btn-guarded` plus
   `cursor-not-allowed`, matching Figure. The test injects the compiled admin stylesheet and reads
   `getComputedStyle().pointerEvents`, the only harness that can see the defect.
3. **A delete refusal names one entry.** Four components, not the one the plan named: `ConceptList`,
   `EditPage`, `DeleteDialog`, `RenameDialog`. `EditData` gained the `singular` field `ListData`
   already had.
4. **`SiteConfig`'s doc and type match its parser.** The index signature is gone and the doc states
   the throwing behavior.
5. **A free-tier bundle warning that can fire, and a corrected cost story.** The doctor check was
   dropped as unbuildable; CI reports the real number; the CLI preamble, its fixture, and three
   admin pages now state Workers Paid as the baseline.
6. **The scaffold stops printing a refusal.** Three `/admin` link sources carry `rel="external"`,
   behind one shared predicate, and `handleHttpError` now throws unless a case is named.

### Evidence

Full CI-derived gate list green, derived from the workflows rather than memory: `check`, `test:emit`,
the `create-cairn-site` suite, `check:package`, `check:reference`, `check:reference:signatures`,
`check:surface`, `check:custom-surface`, `check:chassis-boundary`, `check:cm-internals`,
`check:invisible-craft`, `check:admin-css-classes`, `check:readiness`, `check:docs`,
`check:arm-indexes`, `check:visuals`, `check:transcripts`, `check:symbols`, `check:snippets`,
`check:prose`, `check:version`, `check:dev-package`, `check:consumers`, the showcase's own `check`,
`check:vale`, `check:comments`, `check:public-tokens`, `test:reskin`. `npm test` exits 0 at 426 files
and 5664 tests. `npm --prefix examples/showcase run build` succeeds.

Every fix was proven red first. The measurement that task 5 turns on was taken, not cited: a fresh
showcase install in this worktree, a real build, `wrangler deploy --dry-run`, `gzip -9`, giving
**3,246,163 bytes against the 3,145,728-byte Workers Free limit**.

### What the plan got wrong, and how it was caught

The plan was verified against the tree before dispatching, per the `cairn-plan-assumptions-need-verifying`
memory. That verification paid for itself four times:

- **Task 3 was half its real size.** The plan named two call sites in one component. The defect was in
  four components. Its own acceptance criterion (tighten `EditPage.test.ts`'s assertions) could not
  have gone green at the scope it specified.
- **Task 6's paths did not exist.** `packages/create-cairn-site/template/` is not a directory; the
  template is emitted from `examples/showcase`. This cut in our favor: the plan assumed nothing local
  reached the baked template, so a local build turned out to be a real gate.
- **Task 6's mechanism did not work.** `data-sveltekit-prerender="false"` does not stop the crawl; it
  governs whether an already-reached route is written to disk. The implementer read kit's `crawl.js`
  and switched to `rel="external"`. Shipping the plan's attribute would have left every gate green and
  the build still printing the refusal.
- **Task 5's doctor check could not be built at all.** A `DoctorCheck` gets `readFile` only, and the
  deployable bundle exists only after a wrangler dry-run.

### What the review gate caught that the pass did not

The four-lens habit earned its cost. Two reviewers, fresh context, found a regression the pass had
introduced and a component it had missed.

- **Task 2 made a control lie.** Guarding the Edit block restored the tooltip `btn-disabled` had
  suppressed, but `editBlockLabel` branches only on `editable` and never sees `insertDisabled`, so in
  Preview the control announced "Edit the component at the cursor" over a click it had made inert.
  Figure did not have this bug: `figureAvailable` folds in `!insertDisabled`. **The pass copied the
  pattern's class list and missed its behavior**, with every gate green.
- **`DeleteDialog` rendered "Delete this posts?" as an alertdialog's accessible name, and "2 postss
  link here".** Worse than the defect task 3 fixed, on the surface an author hits on every delete.
- **Five comments described the code the pass replaced**, including four at the exact line a
  maintainer reads to decide whether the media-base context is wired.
- **A copy-in template documented a SvelteKit attribute that does not exist.** That error was the
  orchestrator's, written into a dispatch and propagated faithfully.

### Decisions

- **The doctor bundle check is dropped, not deferred silently** (Geoff, 2026-08-19). Filed with the
  exec-seam blocker named, so nobody re-plans it blind.
- **Workers Paid is the expectation** (Geoff, 2026-08-19), stated as a baseline with no apology, no
  hedge, and no pitch. This supersedes the 2026-08-18 B0 ruling that the copy should hedge; that
  ruling addressed a total that was uncertain, not a claim that was false. The reader-facing copy
  deliberately does NOT justify the price by the bundle measurement, so it will not rot when the
  number moves; the measurement lives in the CI comment and the changelog.
- **The pass closes at task 6** (Geoff, 2026-08-19). The CLI's own consent prompt still promises a
  free deploy, which is flow-and-consent work rather than copy, and it is filed as its own pass.

### Budgets

Human interaction points: **five.** One batched two-part question (the doctor check and the
free-plan claim), two unprompted rulings from Geoff reframing the cost copy, and one approval to
close at task 6. The batched question was load-bearing, since both halves changed what got built.
The pass-split proposal came **one growth too late**, which is the process defect to carry forward.

Task growth, counted honestly because the count is the evidence: task 3 grew from two call sites to
four components; task 5 changed shape entirely (a check dropped, a docs correction enlarged); 5b was
added outright; and a fourth growth was proposed and declined. The doctrine says a second growth
prompts the split proposal and a third makes it overdue. It was raised at the fourth.

### Carried forward

Four ROADMAP entries filed: the CLI money narrative as its own pass, `check:surface`'s blindness to
an index signature, the now-fired `checkOrigin` deprecation watch, and the dropped doctor check.
Left unfixed and named in the reviews: the focus-ring contrast under the toolbar's `opacity-50`
wrapper, a `cairn-audit` static rule for this defect class, `VocabularyAdmin`'s retired dimming, and
`components.md`'s missing `RenameDialog.routable` prop.
