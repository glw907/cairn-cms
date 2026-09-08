# Chassis-B fold brief (2026-09-07)

Consolidated from the four-lens review in `chassis-b-plan-review.md`; the plans `2026-09-07-chassis-b1-pass.md` and `2026-09-07-chassis-b2-pass.md` were rewritten from it, superseding `chassis-b-plan-draft-1.md`. Write-once.


One document, folded from four adversarial reviews (grounding G1-G24, risk R1-R17, hygiene
H1-H15, visual V1-V14) of `docs/superpowers/plans/2026-09-07-chassis-b-pass.md` and the spec
section `docs/superpowers/specs/2026-09-04-chassis-passes-design.md` "Chassis-B". The plan author
rewrites the plan from this file. Every one of the 70 findings lands below: folded, merged into a
neighbour, or dismissed with a reason. Section 1 is ordered by plan section, not by severity.

---

## 1. Corrections, by plan section

### 1.0 Header and execution line

**C1 (R6, H1) - the ceiling is 20 per cent below chassis-A's for a strictly heavier pass.**
`plan:40` sets 6M for twelve tasks; chassis-A is 7.5M for twelve tasks after its own review raised
it from 6.5M, and chassis-B adds the create-cairn-site suite to every task gate, ~144 per-task image
reads, an unbounded 140-image verifier loop, and thirteen content-gated posts. See section 3 for the
adjudicated number and shape. If the pass holds at twelve tasks the header line reads (H1's text,
which is stronger than R6's 8M because it prices the create-cairn-site suite as well as the images):

> **Token ceiling:** 9M (12 tasks; the gate is heavier than chassis-A's by the create-cairn-site
> suite and image reads dominate; the pass-end verifier alone reads 140 images and may loop).

Name in the header the four tasks expected to exceed 0.7M (3, 7, 9, 11) with their split points
pre-agreed, so the checkpoint has a decision rather than a question.

**C2 (H12) - the checkpoint interval is named and its content is not (REGRESSION, unfolded twice).**
Append to `plan:41`:

> At each checkpoint, at any split, and before any question to Geoff, the conductor writes STATUS:
> the task ledger, decisions taken, spend against the ceiling, and the next task, then continues.

**C3 (R12, G11) - five Ruled inputs assert chassis-A outcomes that have not landed.** Add a
"Reconciliation at dispatch" block to the header naming each dependency, the A task that produces
it, and the fallback:

1. the `createSectionAction` "raw shape is deliberate" comment (A Task 10): Task 10 deletes whatever
   comment exists, or none.
2. the `.js` specifier sweep (A Task 10): **A's grep `from '\$chassis/[a-z-]*'` cannot match
   `$theme/cairn.config` (the `.` is outside the class), so all five bare sites -
   `(site)/+page.server.ts:4`, `feed.xml/+server.ts:4`, `feed.json/+server.ts:4`,
   `(site)/[...path=md]/+server.ts:4`, `(site)/styleguide/+page.server.ts:2` - survive A.** Raise it
   to the chassis-A conductor now; the fallback is that chassis-B closes the five itself, with those
   files named in a task's Files list.
3. `archive.test.ts`'s table shape (A Task 9): if absent, Task 7 writes the 27-entry case standalone
   and reports it.
4. the ring count (A Task 5): re-derived by the task's own grep, never taken from the spec's "20".
5. the `// prettier-ignore` pin above `backend:` (A Task 1 remedy `de93536c`): **A Task 6 splits
   `cairn.config.ts`**; re-locate the pin after the split and confirm the ignore comment travelled.
6. **A Task 7 creates `siteMeta` in `$chassis/content.ts` as the single composition point for site
   metadata.** Task 5 must state whether the wordmark and titles read `siteConfig.siteName` or
   `siteMeta.title`, decided against A's single-source rule, rather than forking it.
7. A Task 11 rewrites the type-scale derivation comment and both stale 220-post comments; B Task 8
   and B Task 7 rewrite the same comments again. Name the overlap and say which pass owns the final
   wording.

### 1.1 Ruled inputs

**C4 (V11) - `--update-snapshots` by file path may rewrite all 30 baselines with a workstation
render.** Replace in "Baselines are CI-canonical":

> ...regenerates the moved baselines locally with the mode pinned explicitly,
> `CI=1 npx playwright test e2e/site-visual.spec.ts --update-snapshots=changed`, by FILE PATH. The
> mode is pinned because the bare flag's default has changed across Playwright releases and `all`
> would rewrite all thirty site-visual baselines with a workstation render, in direct violation of
> the CI-canonical rule two sentences above. Task 1 verifies the installed Playwright accepts the
> `=changed` form and reports the version; if it does not, the implementer regenerates by deleting
> only the named baseline files and re-running, and says so.

**C5 (R7) - baseline provenance is unenforceable; sub-floor drift accumulates invisibly.** Local and
CI renders share `-linux.png` (no `snapshotPathTemplate`, both hosts Linux), ten of twelve tasks
commit workstation renders, and the only guard catches drift PAST the 120px floor. Add three
sentences to the same Ruled input:

1. A task's locally regenerated baselines are provisional; the pass-end CI regen's diff over them is
   READ, and any surface whose CI image differs from the committed local one is named in the pass-end
   report. (This is the sub-floor detector the protocol lacks.)
2. Pin the pass-end order: simplifier -> CI regen -> pull -> capture the after set from the pulled
   head -> verifier loop -> Geoff's read.
3. Add a third CI regen after the width-matrix task, which adds new surfaces that would otherwise
   ride to pass end locally baselined only.

**C6 (G14) - the site-visual baseline count is 31, not 30, and 1920 is outside the capture matrix.**
`ls e2e/site-visual.spec.ts-snapshots | wc -l` = 31; the extra is
`site-article-light-1920-linux.png`, written by the standalone clamp-slope test at
`site-visual.spec.ts:66-73`. Say 31 wherever the count appears, add 1920 to the capture tool's
article surface (or state that the clamp-slope baseline is graded by the e2e suite alone and why),
and name `site-article-light-1920` in Task 8's "every baseline unchanged" check.

**C7 (G22) - the `@utility` fallback's real constraint is stated wrong.** Both `tokens.css` and
`composition.css` sit inside the Tailwind-processed tree (`@import 'tailwindcss'` at
`tokens.css:42`, `composition.css` imported at `:44`), so "which file holds the activation" is not
the question. The constraint is that `composition.css` wraps its entire body in
`@layer components { ... }` and Tailwind v4 requires `@utility` at a stylesheet's top level.
Replacement: "`@utility` goes at the top level, above `composition.css`'s `@layer components` block,
or in `tokens.css` outside its own `@layer components` at `:146`. Keep the plain-class fallback."
Add H11.4's tie-breaker: say which file wins on a tie, so two implementers on a fix round do not
choose differently.

**C8 (R16) - "the `.site-main` width block deleted" is ambiguous and eighteen rules depend on the
rest of that declaration.** Replacement text (R16):

> the `width: 100%` and `min-width: 0` declarations and the comment above them are deleted from
> `.site-main` (they become the chassis pair's job); `max-width`, `margin-inline` and `padding`
> stay, since eighteen `.site-main`-scoped figure and breakout rules measure against them.

**C9 (G10, H11.2) - the sidebar-layout condition tests the wrong thing.** `ArticleView.svelte:50`
does derive `related` and `:129-138` renders it, so H11.2's "replace the conditional with the
instruction" is literally true but lands on the wrong design: it renders as
`<nav class="related">` inside `<article>` after the body, a block in the reading flow, not a rail;
and the capture surface `/posts/the-reading-surface` carries no `related:` key (only
`2026-01-15-hello.md` does), so it would appear in no capture. **G10 is the stronger reading.**
Ruled input becomes: "the article has no sidebar-shaped region, so `.cairn-sidebar-layout` lands on
the styleguide composition section only. An article rail is a design change with its own
before/after, not a primitive adoption."

**C10 (R4, G18) - two primitives are proven on routes the template excludes.** `.cairn-template.json`
excludes `src/members` and `src/routes/members`; `.cairn-card`'s only real-site adoption is there, so
the scaffold inherits the primitive with zero call sites, which is the state the pass exists to end,
and Task 9 would promote an excluded fixture into the "public surface" width matrix. G18 offers
"drop, or sanction it as a second exception"; **R4 is stronger** because it also names the
replacement. Ruled input becomes: `.cairn-card`'s real adoption moves to a surface the scaffold
receives (the styleguide composition section for the demonstration, plus one real use - the home
page's `.lead` is the candidate), or the plan states plainly that `.cairn-card` has no real site use
in this theme and records that as a chassis harvest item rather than manufacturing one. Drop
`members-login` from the width matrix and the surface list.

**C11 (R3) - the primitive call-site list hides the two largest paint moves.** Numbers, not hedges,
in the Ruled input:

- `.cairn-section` is `margin-block: var(--cairn-section-gap)` plus `> * + * { margin-top: ... }`
  (`composition.css:44-50`). `.index` (`(site)/+page.svelte:82`) carries **no box geometry at all**,
  so the plan's "the scoped margins those blocks hand-roll deleted" describes something that does
  not exist: adoption is pure addition there, roughly 32px per boundary at 320/390, plus a new gap
  between `.index__head` and every year group. On `.lead` it adds a top margin that does not exist
  and swaps a non-collapsing `padding-bottom` for a collapsible `margin-block-end`.
- `.cairn-card` declares `padding: var(--cairn-card-padding)` on the card element while the current
  markup keeps padding on an inner `p-6` wrapper, and declares no width and no shadow: adoption
  means dropping `shadow`, moving `p-6`, and keeping `w-full max-w-sm`. "The members card border
  replaces the shadow" names one of four differences.

State per adoption which is expected to trip "a site where adoption forces a visible redesign is
reported, not forced".

**C12 (G24) - the degenerate-clamp rule as stated covers only one of the two clamps.** Values are
correct; the reason is partial. Replacement: "Both clamps have a constant preferred value and so
resolve to that constant: `clamp(0.84rem, 0.84rem, 0.80rem)` -> `0.84rem` (the max is below the
min), and `clamp(1.06rem, 1.06rem, 1.0625rem)` -> `1.06rem`."

**C13 (H11.6) - the `--text-step-1`/`-2` coin flip.** Decide it here: keep both declarations with
one comment stating the shared value is deliberate. Smaller diff, honest record.

**C14 (H11.5) - `site.css` literal handling needs a stated default.** Append: "default to a named
`--site-*` custom property; reach for an existing token only where its name means the same thing the
rule means."

**C15 (G1, R1, G2, R2) - `createSectionAction` IS adopted: the ruled input is unexecutable.** See
Task 10 (C48) for the corrected design. The Ruled input line must be replaced by whichever branch is
chosen, stated as a ruling, because the current text reads as a drop-in.

**C16 (G11) - the `siteConfig` one-door input is closed by an A grep that cannot match.** Folded
into C3.2.

**C17 (H14, on the `ORIGIN` comment) - the instructed comment cites a ruling document.** That is
what internals-C's comment-citation purge removed from `src/lib`, and this one ships into every
scaffolded site. Replacement comment text:

> The public origin as a literal: it is read at build time by the feed and sitemap, and
> `PUBLIC_ORIGIN` in `wrangler.jsonc` is the Worker's runtime value for the same host.

**C18 (H11.3) - `email.from` is deferred to the implementer and should not be.** Decide in the Ruled
inputs: "stays its own literal, with a comment naming the verified-sender constraint", since
deriving a sender from a URL host is exactly what `E_SENDER_NOT_VERIFIED` punishes (the repo's own
durable gotcha).

**C19 (G19) - `status: published` on thirteen of twenty-seven posts.** No existing post carries the
key, nothing in delivery reads it (`content.ts` hands raw globs to `createSiteIndexes` with no
filter). Drop it from the ruled input, or add it to all twenty-seven and say why the exemplar now
demonstrates the field. The split is not defensible. **Recommend dropping.**

**C20 (R5) - thirteen posts written to prove pagination ship as every scaffolded site's starter
corpus.** `src/content/` is in no exclude list and `bake-template.mjs` never touches it, so
`templates/waymark/src/content/posts/` goes 14 -> 27, at 150-300 real words each. This is the spec's
own rule 1 ("the fixture job is marked or excluded") inverted at the largest scale in the pass, and
the ledger has no ruling on scaffold seed content. Rule it explicitly with the trade named, choosing
one of R5's three: (a) the thirteen ship and the plan says in one sentence why 27 starter posts
serve a scaffolded site better than 14; (b) the thirteen are marked with
`cairn-template:exclude-start`/`-end` or added to `.cairn-template.json` so the showcase proves the
archive and the scaffold still ships 14, with `ARCHIVE_PAGE_SIZE` documented as the site's own knob;
(c) the corpus grows by the minimum that crosses the boundary. **(b) is the reading most consistent
with the pass's own rule 1; (a) is defensible only if written down as a product decision.** Whichever
is chosen, add `docs/extend/what-the-scaffold-wrote.md` (its `(14 sample entries)` line) to the
corpus task's Files.

**C21 (R9, H11.1) - the archive page count is left to dispatch and is knowable now.** Settle it in
the Ruled inputs: `(site)/+page.server.ts:15` paginates `entries.slice(1)` and
`(site)/archive/[page]/+page.server.ts:11` slices the same way (its header comment says the counts
always agree), so 27 posts minus the featured lead is 26, which at page size 13 is **exactly two
pages of thirteen**, and `/archive/3` correctly 404s via the clamp guard at `:27-29`. No `archive3`
surface is needed. Add the acceptance line R9 asks for: "the home page's and the archive route's page
counts agree, asserted in `archive.test.ts`."

**C22 (R10) - `menus.footer` is invisible to `/admin/nav` by construction, so the fork is moved, not
removed.** `createNavRoutes` reads and writes only `runtime.navMenu.menuName`, and the showcase
declares one menu config, `primary`. After Task 5 the yaml carries two menus that look symmetric and
are not, which is a worse affordance than the labelled array in the component, and it ships to every
scaffolded site. Decide it in the Ruled inputs rather than in a task report. R10's lean answer:
move the footer list into `site.config.yaml` as `menus.footer`, AND write the yaml comment saying it
is developer-edited because the nav editor is bound to one menu, AND record the second-menu editing
question as a chassis harvest item. If the answer is instead "the footer stays a code array", say so
and close review 4.7's nav half as declined with the reason.

**C23 (R13, V6) - the pass's evidence base lives outside the repo.** Merged into C27 (global
constraints), since both reviews land the same artifact.

### 1.2 Global constraints

**C24 (V1) - the capture format is unreadable by any grader (the single largest integrity hole).**
Measured from the committed baselines: `styleguide-light-320` is 320x12516, which a vision model
resizes to about 40x1568; `site-article-light-2560` is 3.5MB and 9713px tall. Replacement for Task
1's Create line (V1's text):

> writes, per surface/scheme/width, BOTH `full/<surface>-<scheme>-<width>.png` (fullPage, the
> archival record and the Playwright-comparable artifact) AND a readable tile set
> `tiles/<surface>-<scheme>-<width>-<nn>.png`, the full-page image sliced into bands of at most
> 1400 CSS px of height with a 60px overlap, numbered from the top. A grader reads TILES, never a
> full-page file. The tool also writes `manifest.json` (every file, its surface, scheme, width, tile
> index, pixel dimensions, and sha256) so a consumer can name exactly which tiles it read.

Add to Global constraints: "Every image budget below counts TILES, and every dispatch that hands a
grader images names the tile paths, never a directory." R14's variant (a viewport-clipped mode plus
named region crops, with a maximum capture height beyond which a surface is graded in sections)
proposes the same fix in weaker form; **V1's tiling with a manifest is stronger** because it is
deterministic and self-describing. Fold R14's "state the maximum capture height" as the tile band
height, already specified.

**C25 (V2) - "nothing else moved" has no instrument.** New Global constraints bullet (V2's text):

> **The moved-baseline list is produced, not asserted.** Before any regeneration, the implementer
> runs the visual suite unmodified (`CI=1 npx playwright test e2e/site-visual.spec.ts
> e2e/admin-visual.spec.ts`) and pastes the exact list of FAILING snapshot names into the report
> under the fixed line `MOVED BASELINES:`, one name per line. Only then does it regenerate. The
> report's `INTENDED MOVES:` list and its `MOVED BASELINES:` list are compared name by name by the
> reviewer; a name in one and not the other is a blocking finding. For surfaces not yet in the
> baseline matrix the instrument is instead an exact pixel compare of the captured before/after
> tiles: `magick compare -metric AE before.png after.png null:` (ImageMagick is installed), whose
> per-tile count goes in the report as `TILE DIFF:`. A non-zero count on a tile the report does not
> enumerate is a stop-and-report.

**C26 (V4, H9) - the reviewer cannot reach the protocol.** The `diff-reviewer` agent card forbids
reading the plan file while `pass-execute-chains.js`'s prompt asks for it, `t.notes` is passed to the
implementer and not the reviewer, `IMPL_SCHEMA` has no field for any of this, and the capture
directory's `<task>` token is never defined. Fold both rewrites:

- Pin the directory literally in Global constraints: `~/.cache/cairn-chassis-b/task-<N>/`, `<N>` the
  plan's task number.
- Add to Execution (V4): every paint task's `criteria` string carries, inline and verbatim, the
  acceptance criteria, the capture root, the sentence "Read the tiles named in the report's
  `READ ME:` line (at most twelve) and verify the report's `INTENDED MOVES:` list equals its
  `MOVED BASELINES:` list name for name", and the stop-and-report rule. The conductor writes these
  strings when it assembles the chain.
- Add the fixed report contract (V4): the implementer's `summary` carries, verbatim and in order,
  `CAPTURES:` / `INTENDED MOVES:` (one `surface width scheme: what moves` per line) /
  `MOVED BASELINES:` / `TILE DIFF:` / `READ ME:` (at most twelve tile paths).
- Add to each paint task's acceptance criteria (H9): "the reviewer's summary names each image pair
  it read", the only enforcement `REVIEW_SCHEMA` affords.

**C27 (V6, R13) - the intended-moves list is never written down.** The `visual-fidelity` skill
requires the manifest to be a committed file that verifiers verify against, never the plan. New
Global constraint (V6's text, with R13's provenance clause folded in):

> **The intended-moves manifest is a committed file**,
> `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`, created by Task 1
> with the before-set inventory (surface, width, scheme, the `.missing` entries, and the commit sha
> each before capture came from) and appended by every paint task in the same commit as its change:
> surface, width, scheme, what moves, why, and the baseline names it moves. The pass-end verifier
> reads this file, never the task reports. A task that moves a baseline without appending its row is
> a blocking finding at the diff gate.

Add R13's one line to STATUS's resume prompt naming the manifest as the recovery artifact.

**C28 (V12) - the task before set and the pass before set are conflated.** Fold V12's text: the PASS
before set is captured once by Task 1 at the branch point and is the verifier's reference; the TASK
before set is captured at the START of the task on the clean worktree at the task's parent commit
(equivalent to and far cheaper than checking the parent out) and is the reviewer's reference; a task
whose upstream neighbours moved no paint may symlink the pass set and say so; both directories are
write-once, the tool refuses to write into a non-empty directory, and the implementer reports the
collision rather than clearing it.

**C29 (V8) - `.missing` is defined for the writer and undefined for every reader.** Fold V8's text
into Global constraints: a `.missing` in the BEFORE set means the surface is NEW in this pass and is
graded on its own against the five-viewport standard at 320 and 2560 in both schemes, with the
verdict line `NEW: composed | NEW: unbroken-only | NEW: broken`; a `.missing` in the AFTER set is
always a stop-and-report; Task 1's report lists the before-set markers by name and the records task
confirms every one is gone or says why.

**C30 (R11) - the pass changes an engine gate script while declaring "no engine code changes".**
`scripts/checks/check-public-tokens.mjs` is engine code by every other reckoning in the repo, and
the script's own header reasons that definition layers are excluded on purpose. Amend the constraint
(R11's wording): "one engine gate script changes (`check-public-tokens.mjs`'s scanned set); no
engine runtime code and no public export changes", with one sentence answering the definitions-layer
argument (`site.css` is a consumer of tokens, not a definer of them, which is the honest and
probably winning argument). The alternative R11 offers, dropping the extension to polish with the
argument attached, is weaker: Task 8's planted-literal proof is the right evidence and only the
boundary statement is wrong.

**C31 (G15) - the create-cairn-site test count is pinned wrong.** The suite collects 741 on `main`,
not 806, and chassis-A Task 2 moves it again. Replace the number with "green, with the collected
count recorded in the task report".

**C32 (H8) - Interfaces blocks declare Produces and never Consumes (REGRESSION of the chassis-A
round's H3).** Add: Task 6 "Consumes: the `cairn-focus-ring` utility (Task 4)"; Tasks 3, 5, 7, 9
"Consumes: `scripts/capture-surfaces.mjs` (Task 1)"; Task 7 "Consumes: the `archive.test.ts` table
(chassis-A Task 9); if absent at dispatch, write the case standalone and report it".

### 1.3 The visual protocol (Architecture paragraph, screenshot budget, verifier)

**C33 (V5) - the verifier's verdict vocabulary inverts on a changed-by-design pass and the loop
cannot exit.** Replace the Architecture sentence and the ritual's verifier sentence with V5's text:
the verifier runs with an ADAPTED vocabulary stated in the dispatch, receives three inputs (before
tiles, after tiles, and the committed intended-moves manifest), and returns per surface and width one
of **INTENDED-AND-CORRECT / INTENDED-BUT-WRONG / UNINTENDED (the STRUCTURAL/COSMETIC split applies
here) / UNCHANGED**; the contrast probe of `visual-verifier.md:26-31` stays MANDATORY and is named in
the dispatch, since this pass changes a card recipe, a full-bleed band ground and the focus ring; the
loop is bounded at verify, fix, FRESH verify, and a second FAIL is the conductor's decision. R6's
"cap the verifier loop at three iterations" is superseded by V5's two-round bound, which is stronger
because it also fixes the vocabulary that would cause the loop in the first place.

**C34 (V3) - four tasks accept on "every baseline unchanged", a claim the 120px floor cannot
carry.** Tasks 2, 4, 6 and 8 are precisely the sub-floor class the config's own comment measures
("a 1.5px shift on a 16px icon measured 51 differing pixels, which passes at 120"). Replace their
criterion with V3's text: "every baseline unchanged AND paint proven identical at the floor-free
level: the task's before/after tiles for every touched surface compare at `magick compare -metric
AE` = 0 for every tile, reported per tile. A non-zero count is enumerated and justified or it is a
stop-and-report."

**C35 (V9) - composition at the extremes has one judge and it is the builder.** Four surfaces new to
the matrix (the styleguide composition section, `/archive/2`, the 404, and whatever survives of the
members decision) get baselines that certify stability and nothing that certifies composition.
Fold V9: the implementer captures the extremes and names the tile paths and makes NO composition
claim; the pass-end verifier returns a per-surface `COMPOSED | UNBROKEN-ONLY | BROKEN` line for every
new surface, and `UNBROKEN-ONLY` is a FAIL for a surface this pass adds.

**C36 (V10) - Geoff's merge read has no artifact, and `gh` cannot attach PNGs to a PR.** Fold V10's
new step into the records task: contact sheets per changed surface (before tile and after tile side
by side per width, with a caption from the intended-moves manifest, plus a dark sheet for any surface
whose dark render moved), composed with `magick montage` into
`docs/internal/record/2026-09-04-chassis-inputs/chassis-b-contact-sheets/<surface>.png`, committed;
the PR body links each sheet by its `raw.githubusercontent.com` URL under the branch, lists the
surfaces that did not move, and carries the verifier verdict inline. Acceptance: Geoff's read is one
page per changed surface, in order, with no build step on his side.

**C37 (V13, R14) - the one-check rule and the thin-conductor rule collide, unreconciled.** Both
reviews land the same line; V13's is more precise about the bound. Add to the ritual after the
verifier loop:

> **The one-check read (the conductor's one sanctioned image read).** The thin-conductor rule
> excludes source files, diffs and gate transcripts; it does not excuse the one-check rule. After the
> verifier returns PASS and before the PR, the conductor reads each changed surface's after tiles at
> 320 and 2560, light, one screenful each, from the contact sheets. That is the read, it is bounded,
> and it is named here so it is neither skipped nor allowed to grow into a diff read.

### 1.4 Task 1 (CSS format half and the capture tool)

**C38 (G12) - the counts are wrong.** Prettier reflows **three** CSS files, not four
(`prose.css`, `tokens.css`, `theme.css`; `composition.css`, `site.css` and `probe-craft.css` are
already clean), and `.prettierignore` carries **three** CSS lines (`*.css`, `src/chassis/*.css`,
`src/theme/*.css`), all of which must go. The acceptance criterion "the four files differ from their
parents by whitespace only" becomes three.

**C39 (G13, V7) - the capture tool cannot render the admin surface and mislabels every dark admin
capture.** Three provable defects: a default build folds the dev backend out; there is no "e2e
session helper" (the dev handle mints the owner, `custom-screen.spec.ts:9`); the admin's scheme is
COOKIE-driven, so `emulateMedia` alone writes a light admin into every `signups-dark-*.png`. V7 adds
the fact G13 misses: `examples/showcase/scripts/reference-capture.mjs` (531 lines) already solves the
server recipe and the theme cookie, and chassis-A Task 5 is scheduled to delete it. **V7's rewrite is
stronger** and is the replacement text:

> `capture-surfaces.mjs` derives from `scripts/reference-capture.mjs`, which already solves the
> server recipe and the theme cookie; read it first and reuse its `newPage`/`shot` shape. The server
> is started with the EXACT `playwright.config.ts:29-34` recipe (`VITE_CAIRN_E2E=1 npm run build`,
> then `npm run preview -- --port 4173` with `CAIRN_DEV_BACKEND=1`), never a default build: a default
> build folds the dev backend out and every `/admin` surface would silently write `.missing`. There
> is no session helper and none is needed. For the `signups` surface the scheme is set by the
> `cairn-admin-theme` cookie (`cairn-admin` / `cairn-admin-dark`) AND `emulateMedia`; for the public
> surfaces `emulateMedia` alone.

Reconcile against chassis-A Task 5 (C3): if A deleted `reference-capture.mjs`, derive from its last
committed version; the records task says whether it stays or goes.

**C40 (G8, H7) - the 404's renderability is pre-declared as a known expectation and consumed from a
report a later implementer cannot see.** The `/archive/2` half of the expectation is verified true;
the 404 half is unsourced, and SvelteKit's preview server runs the SSR `respond` for an unmatched
path, so the likely truth is the opposite of what the plan pre-declares. Fold both corrections:

- G8: delete the pre-declared expectation. "Record every `.missing`; `/archive/2` at page size 50 is
  the one known expectation, and any other is a finding the task reports before proceeding."
- H7: make the finding an artifact, not a report line. Task 1 Step 1 gains "record the surface
  availability findings as a comment block at the top of `scripts/capture-surfaces.mjs` (which
  surfaces render under `vite preview`, which need a different server, and why)", and the width-matrix
  task cites that header instead of "Task 1's before set says". Apply the same fix wherever a task
  says "the report says" (H7 names Task 5's `/admin/nav` finding, which C22 already settles).

**C41 (H5) - one commit mixes a mechanical reformat with a ~150-line Playwright tool.** The spec's
own risk register is the reason the reformat is first and reviewed as mechanical. Rewrite the steps
as two commits in one task (or two tasks): (1) the capture tool alone, committed; (2) the before set
banked with it; (3) the ignore and target-set edits, `format` run, whitespace-only proof, committed
separately as the mechanical reformat; (4) re-emit and gate. Say "two commits" in the step text,
since the workflow implementer commits at each marked step boundary and will otherwise fold them.

### 1.5 Task 2 (the shell)

**C42 (G23) - two paint-neutral edits have unstated carriers.** `(site)/+layout.svelte:84` carries
`tabindex="-1"` and `+error.svelte:29` does not; the attribute is load-bearing and documented at
`public-design-system.md:125-126`. Replacement: "the `main` element gains `cairn-site-main`;
`(site)`'s `tabindex=\"-1\"` is preserved." Also see C8 for the `.site-main` deletion boundary.

### 1.6 Task 3 (the five composition primitives)

**C43 (R3) - the enumeration omits its two largest moves and the task then halts on its own stop
rule.** Folded as C11; Task 3's Step 1 enumeration is rewritten from those numbers, per adoption.

**C44 (R4, G18) - `.cairn-card` and the members pages.** Folded as C10; Task 3's Files lose the two
members routes unless the exception is written down.

**C45 (G23, second half) - two more places assert that nothing uses the primitives.**
`composition.css:5-6` ("Nothing in the showcase's current markup uses any of these yet") and
`README.md:196` both become false in this task and are distinct from the removal-table rows at `:38`
and `:122`. Add `src/chassis/composition.css` to the Files and name `README.md:196`.

**C46 (H6) - the task accepts on a baseline diff that does not exist for two of its five surfaces.**
`site-visual.spec.ts:26-55` covers home, article and styleguide only; `error404` and `members-login`
do not enter the matrix until the width-matrix task, so the pass never captures a committed before
state for two surfaces it redesigns. **Move the width-matrix task to run immediately after Task 1**
(it needs only the capture tool and Task 1's preview-404 answer), renumber, and let every later
adoption land against a complete matrix.

**C47 (H10) - two untestable acceptance criteria.** "the `daisyui-a11y-reviewer` finds no regression
... at pass end" is not a task-gate criterion; move it to the ritual list, where the reviewer is
already named. The baseline-diff match becomes satisfiable once C46 lands.

### 1.7 Task 4 (one focus ring)

**C48 (H3, V3) - Step 2 asks a tools-limited implementer to keyboard-tab through a browser it does
not have.** `cairn-implementer` has Read, Write, Edit, Bash, Grep, Glob. Two rewrites were proposed.
**H3's is stronger** (deterministic, survives the pass, runnable under Bash, checkable by the
reviewer):

> Step 2 becomes: extend `e2e/site-visual.spec.ts`'s focus assertion into a loop over the home,
> article, and styleguide: `page.keyboard.press('Tab')` three times per page, asserting a non-`none`
> computed `outline-style` and the token-resolved `outline-offset` on each `:focus-visible` element;
> the spec is the report's evidence.

Fold V3's supplement on top: the capture tool gains a `--focus <selector>` mode, Task 4 banks focused
tiles for the three named controls on home, article and styleguide in both schemes at 390 and 1440,
and the implementer reports the paths and makes no fidelity claim. Also apply C34's tile-compare
criterion, since the ring is a 2px footprint under the 120px floor.

**C49 (G22)** - folded as C7.

### 1.8 Task 5 (site identity)

**C50 (G5) - `footerNav` is wired into the wrong layout load, and that file no longer ships.**
`primaryNav` is loaded by the ROOT `+layout.server.ts:13-18`, whose header says why (both mounts of
`SiteHeader`, including `+error.svelte`, sit above and beside the `(site)` layout); `SiteFooter` is
imported by both `(site)/+layout.svelte:40` and `+error.svelte:17`; and chassis-A Task 4 has already
excluded `(site)/+layout.server.ts` from the emitted template. Replacement: use
`src/routes/+layout.server.ts`, whose `load` returns `{ hasIslands, nav: primaryNav, footerNav }`,
and state that `(site)/+layout.server.ts` is now a template-excluded fixture that must not gain
product wiring.

**C51 (G6) - reading `siteConfig` in a `.svelte` component ships the YAML parser to the browser.**
`siteConfig` is `parseSiteConfig(siteYaml)`, and `parseSiteConfig` imports the `yaml` package; the
root layout server's header records this as the reason the nav is read server-side. Route `siteName`
through `page.data` from the root layout server load alongside `nav` and `footerNav`, and state that
a direct `siteConfig` import into a `.svelte` component is forbidden for this reason. Reconcile with
C3.6 (A Task 7's `siteMeta`).

**C52 (R10)** - folded as C22.

**C53 (H10) - "zero renderable 'Waymark' literals" is not a runnable check.** Replace with either the
exact command and its expected hit list, or "the five renderable sites named in the Files list read
the site name", which a read verifies. Note the verified fact that the grep prints six lines for five
renderable hits (`ArticleView.svelte:2` is a comment).

**C54 (H15) - `SiteFooter.svelte` appears twice in the Files list** (once for the wordmark, once for
the nav array). Merge them.

**C55 (H11.3)** - folded as C18.

### 1.9 Task 6 (the entry row)

**C56 (R17) - "the two style blocks deleted" takes the pagination and index rules with it.** The
extraction claim itself is verified sound (the two rule sets are byte-identical including the
`@media (max-width: 34rem)` block), but those line ranges also hold `.pagination`,
`.pagination__link` (+ `:hover`, `:focus-visible`), `.pagination__status`, `.index__head`,
`.index__count`, `.index__year` and `.index__year--first`. Replacement (R17):

> `.entry`, `.entry--undated`, `.entry__date`, `.entry__title` (with its `a`, `:hover` and
> `:focus-visible`), `.entry__excerpt` and the `@media (max-width: 34rem)` block move into the
> component, renamed under the `site-*` convention; `.pagination*` and `.index__*` stay on their
> pages.

Add the acceptance line "`grep -n 'pagination__link' examples/showcase/src/routes` still returns both
pages." Also finish the rename: the plan renames the root and `--undated` but leaves `.entry__date`,
`.entry__title`, `.entry__excerpt`, shipping a half-migrated BEM family under a convention this same
pass states.

### 1.10 Task 7 (the archive on a real corpus)

**C57 (G7) - the `admin-office-*` enumeration is false.** `ConceptList.svelte:66` paginates at ten
rows client-side, so going from 14 to 27 posts leaves the visible row count at ten. Replacement:
"`admin-office-*` moves only in the list's count line and pagination control; the visible row count
stays at ten (`ConceptList.svelte:66`)."

**C58 (V14) - the Step 2 enumeration cannot be true as written.** "the home page's page 1 shows the
fourteen 2026 posts" against `ARCHIVE_PAGE_SIZE = 13`. C21 settles the arithmetic (13 rows plus the
featured lead), so the enumeration is rewritten to the settled numbers rather than V14's "state the
rule you found, then the count", which is now unnecessary.

**C59 (G20) - the content-index regeneration is conditional on a settled fact and the command is
unnamed.** The index is committed and a stale one fails the build. Replacement: "`src/content/.cairn/index.json`
regenerated with `npm --prefix examples/showcase run cairn:manifest` (committed; a stale manifest
fails the build)."

**C60 (H10) - "thirteen dated 2025 and reviewed" is unfalsifiable from a diff.** Replace with "each
post's `content-review` findings are recorded in the report with the fix or the reason it was
declined", plus the two mechanical halves: thirteen files matching `src/content/posts/2025-*.md`,
each 150-300 words by `wc -w` on the body.

**C61 (H15, R8) - the implementer pushes a branch and waits on CI inside a Sonnet dispatch.** No
polling command is given, the wait is unbounded, and it puts a push inside a task while the merge
discipline is the conductor's. Move the CI regen to the conductor as a named checkpoint action
between this task and the next, matching how the pass-end regen is already treated. Add R8's rule to
the Ruled input: "a regen dispatch suspends the chain: the implementer commits and pushes, the
CONDUCTOR dispatches, waits, pulls, and only then dispatches the next task."

**C62 (R5, C20)** - the scaffold-corpus ruling; `what-the-scaffold-wrote.md:48` joins the Files.

**C63 (R9, C21)** - the page-count acceptance line.

### 1.11 Task 8 (CSS conformance)

**C64 (G3) - the gate extension names three literals the gate cannot see and misses the one it will
fail on.** `check-public-tokens.mjs` bans literal colours and absolute font-sizes only; `:140`
(`max-height: 32rem`), `:193` (`border-left: 3px solid var(--cairn-info-ink)`) and `:194`
(`border-radius: 0.25rem`) are none of those, while the one real hit is **`site.css:34`
`font-size: clamp(1rem, 0.7631rem + 0.2631vw, 1.125rem)`**, the root fluid-type formula, which cannot
be tokenized. Rewrite the item as: add `site.css` to `scannedFiles` (`:79`) and decide `:34`
explicitly, either exempting `html { font-size }` in the rule with a stated reason (the definitions-layer
argument `theme.css` and `tokens.css` already carry at `:66-67, 80-81`) or excluding the `html` rule
by name; drop `:140`, `:193`, `:194` from the gate justification, and if they are still wanted as
tokens say plainly that this is hygiene the gate does not enforce. The acceptance criterion names
what makes `:34` green.

**C65 (G4) - the change breaks `checkTokenResolution`'s second caller.** Adding `site.css` to the
`sources` array means a fourth parameter; `scripts/lab/reskin-fixture.mjs:136-140` calls it with
three and is absent from the Files list, run by `design.yml` rather than by the per-task gate. Add
that file to the Files and Step 1, or make the new parameter optional with a documented default, and
add `design.yml`'s fixture run to the pass-end CI-only gate list by name.

**C66 (R11)** - folded as C30 (the boundary statement).

**C67 (G14, C6)** - `site-article-light-1920` named in this task's "every baseline unchanged" check.

**C68 (C34)** - the tile-compare criterion replaces the bare "every baseline unchanged".

### 1.12 Task 9 (width matrix; runs early after C46)

**C69 (G9, H4) - the alignment spec has no devices to measure.**
`public-design-system.md:253-312` states in bold that "the measured public corpus found ZERO rows
above the 2px bar" and that what follows is doctrine, not a record of repairs. Both lenses reach the
same conclusion; **H4's replacement text is the stronger form** because it is a single doc sentence
with a named trigger:

> in `docs/internal/public-design-system.md`, the "Vertical alignment mechanics" section gains one
> sentence stating that the public corpus measured zero rows above the 2px bar in 2026-08, that no
> numeric compensation test exists for that reason, and that the trigger for writing one is the first
> public row that fails a read (the admin's
> `src/tests/component/vertical-alignment-recipes.test.ts` is the shape it would take).

Delete `e2e/public-alignment.spec.ts` from the Files list. G9's alternative (respecify it as an
invariant test on a named row, for example the header's wordmark-to-nav row) is a defensible smaller
version; take it only if the pass holds at one and has budget, which section 3 says it does not.

**C70 (V14) - the 404 escape hatch and the acceptance criterion contradict each other.** Replacement
(V14): "the 404 is either baselined at five widths in both schemes, or the report names the server
recipe that cannot render it under the suite's webServer, records the cost of the `wrangler dev`
second server, and the 404 is carried to polish by name. The criterion is a decision with evidence,
not an outcome the implementer cannot control." Note that C40 makes the answer known before this task
runs.

**C71 (R4)** - `members-login` leaves the width matrix; the acceptance criterion's "every public
surface" becomes true rather than aspirational.

**C72 (H6, second instance) - `/admin/signups` is baselined here and its route is rewritten in Task
10.** Add to Task 10: "the `admin-office-*` and `admin-signups-*` baselines are unchanged; if either
moves, the access-path change altered the render and the move is enumerated."

### 1.13 Task 10 (small idioms and the custom-screen exemplar)

**C73 (G1, R1) - the adoption cannot pass: the showcase has no access map and the dev backend never
attaches one.** The mechanism, verified twice: `createSectionAction` returns
`misconfigured(...)` -> `fail(500)` when `locals.cairnAccess` is undefined
(`section-action.ts:288-291`); `requireAccess` throws `error(403)` for every editor including the
owner when `hasAccessRule` is false (`guard.ts:302-310`, doc at `:288-291`); the showcase declares no
`defineAccess`/`defineRoles`; and **`packages/cairn-cms-dev/src/handle.ts:128-137` sets only
`locals.cairnEditor`**, so the showcase's e2e build never runs the guard that would attach a map at
all. R1's mitigation (declare a map in `cairn.config.ts` with `ownerOnly: true`) is necessary and
**not sufficient**: with no handle reading it, `cairnAccess` stays undefined. G1's evidence governs.
The corrected task design is one of:

- **(A) Defer the adoption (recommended).** Task 10 keeps its non-auth halves (`feed.ts`, the
  design-system doc paths, `platform!`), leaves the raw shape with the comment recording it as
  deliberate, and files the adoption to polish with a one-line entry naming what it needs: a
  dev-package seam that attaches `locals.cairnAccess` and selects a role. Cheapest, keeps "no engine
  code changes" true, and the pass is already over-sized (section 3).
- **(B) Do it properly, as its own task.** Files gain `examples/showcase/src/theme/cairn.config.ts`
  (a `defineRoles`/`defineAccess` map naming `/admin/signups`, admitting `owner` only, with
  `createSectionAction` passed `ownerOnly: true` so adoption is authorization-neutral against
  today's `requireOwner`) AND `packages/cairn-cms-dev/src/handle.ts` (attach `cairnAccess` from the
  adapter) with the dev package's own tests updated; the "no engine code changes" constraint is
  amended by name; the access-map declaration gets its own step because it ships to every scaffolded
  site; and the acceptance gains R1's line: "the route's admitted role set before and after adoption
  is identical, named in the report."

Whichever is chosen, it is a ruling in the Ruled inputs, not a Files-list line. Note R1's REGRESSION
flag: the chassis-A plan review routed this here precisely because the adopt branch changes the
route's auth and audit path over a D1 table of names and email addresses, and chassis-B still prices
only the mechanical half.

**C74 (G2, R2) - the new 403 test names a mechanism that does not exist.** `access-map.spec.ts` mints
no session (its own comment: "`canReach` is pure, so no page or browser fixture is needed") and the
dev backend hard-mints an owner with no role selection. Under (A) the test is dropped with the
adoption. Under (B), replace it with R2's reachable form: keep `custom-screen.spec.ts`'s owner-path
cases green and cover the denial branch as a showcase unit test asserting `canReach`/`hasAccessRule`
against the showcase's committed access map for the `/admin/signups` target, with a comment naming
the dev-backend limitation as the reason the HTTP 403 is not driven end to end. If an HTTP 403 case
is wanted, it is a dev-backend role-selection seam with its own pass and an engine consultation.

**C75 (G16) - "the existing four assertions" misdescribes the spec.** `custom-screen.spec.ts` holds
**two tests, five assertions** (four in the first at `:14-16, :18, :28, :30`, one in the second at
`:35`). Replacement: "the two existing tests (five assertions) green unchanged".

**C76 (G17) - the design-system doc has four stale paths, not three, and three correct engine paths
that must not be repointed.** Replacement: "the four stale `examples/showcase/src/lib/*` occurrences
at `:5`, `:316`, and `:317` are repointed to `src/theme/theme.css`, `src/chassis/prose.css`, and
`src/theme/components/`; `:5`'s unpathed references to `prose.css` and 'the `(site)` chrome
components' are made explicit; the engine's own `src/lib/render/*` and
`src/lib/components/cairn-admin.css` references at `:46-47`, `:237` and `:321` are correct and stay."

**C77 (H6/C72)** - the baseline-unchanged line for the admin surfaces.

### 1.14 Task 11 (waymark's adaptation)

**C78 (H2, H10) - the task has no bound.** "List every sentence that describes the showcase rather
than a scaffolded site" is a finding population equal to whatever the tree holds, in a Sonnet
dispatch, at the end of a pass. Bound it to the README, the `src/chassis` and `src/theme` file
headers, `cairn.config.ts`, `site.config.yaml`, and `what-the-scaffold-wrote.md`, and replace
"no scaffold file describes itself as the showcase" with a runnable check:
`grep -rn "showcase\|examples/" <scaffold>/src <scaffold>/README.md` returns nothing outside a named
allowlist.

### 1.15 Task 12 (records and harvest)

**C79 (G21) - a file listed under Modify does not exist.** `chassis-b-harvest.md` is not in
`docs/internal/record/2026-09-04-chassis-inputs/`. Move it to a `Create:` line.

**C80 (R8) - `e2e.yml` is in no task's Files and its dispatch input's description is wrong.** The
input description says it regenerates "the admin-visual baseline snapshots" while the step it gates
runs both specs. Add `.github/workflows/e2e.yml` to this task's Files with the one-line fix:
"Regenerate the admin-visual and site-visual baselines instead of asserting against them." Fold R8's
second half into the header: `on: push` covers only `main` and `rebuild`, so a push to `chassis-b`
triggers nothing and the bot's own commit fires no run; **open the PR immediately after Task 1's
commit** so every later push carries a `pull_request` run and the merge gate accumulates evidence
rather than needing it manufactured at the end.

**C81 (V10)** - the contact-sheet step, folded as C36, lands here as Step 1.

**C82 (V8)** - the `.missing` reconciliation line ("every before-set marker is gone from the final
after set or the record says why") lands here.

### 1.16 Pass-end ritual

**C83 (H13) - five named gates, the migration record, and the two closing steps are missing.**
- Write the six CI-only gates BY NAME, not by the phrase: `check:comments`,
  `check:reference:signatures`, `check:surface`, `check:snippets`, `check:transcripts`,
  `check:symbols` (`check:snippets` short-circuits five later gates in `test.yml`).
- Name the four doc gates once: `check:package`, `check:reference`, `check:reference:signatures`,
  `check:docs`.
- Add `docs/extend/migration-notes.md`: the exemplar's auth/audit path (if C73 branch B is taken)
  and the `menus.footer` key in the site config schema are both behaviour a scaffolded-site owner
  meets, even with no `Consumers must:` line.
- Add the live admin smoke (required for any plan touching `/admin`), or say in the ritual why the
  dev-backend build substitutes here.
- Add the skill's steps 8 and 9: draft the next plan, and pre-bake the context clear. "What this
  pass hands forward" is the raw material, not the step.

**C84 (R7, second half) - the ritual's order lets the simplifier invalidate the verifier's grade.**
Pin: simplifier -> CI regen -> pull -> capture the after set from the pulled head -> verifier loop ->
conductor's one-check read -> PR -> Geoff. Folded with C5.

**C85 (V5, C33)** - the adapted verdict vocabulary and the two-round bound replace "exits only on
PASS".

**C86 (V13/R14, C37)** - the conductor's one-check read is a named ritual line.

**C87 (H10, first item)** - the `daisyui-a11y-reviewer` criterion moves here from Task 3.

**C88 (G4, C65)** - `design.yml`'s fixture run joins the CI-only gate list by name.

### 1.17 What this pass hands forward

**C89 (R11, R10, R4, G18, C73)** - the hands-forward list gains, by name: the
`check-public-tokens` scope argument if C30's amendment is declined; the second-menu editing
question from C22; the `.cairn-card` real-use question if C10 lands on "no real site use in this
theme"; and, under C73 branch (A), the `createSectionAction` adoption with the dev-package
`cairnAccess` seam it needs. Keep the existing entries.

### 1.18 Dismissed

- **H11.4 (the `@utility` file choice may stay a verified branch)** - superseded by C7, which
  removes the branch entirely; only the tie-breaker sentence survives.
- **R6's "cap the loop at three iterations" and "8M ceiling"** - superseded by V5's two-round bound
  and H1's 9M respectively (both stronger, see C33 and section 2.3).
- **R14's capture-legibility half** - merged into V1's tiling (C24); its one-check half survives as
  C37.
- **H11 item 2 (make the sidebar adoption unconditional)** - dismissed on G10's evidence; see C9.
- **G18's "sanction the members routes as a second exception"** - dismissed in favour of R4's
  removal; a sanctioned fixture baseline buys ten permanent CI images for a page no consumer sees.

---

## 2. Conflicts between lenses, adjudicated

**2.1 Where the 404 baseline comes from.** G8 says delete the pre-declared "the 404 is `.missing`"
expectation and determine it in Task 1; H7 says the finding must be an artifact in the tree because
no later implementer sees an earlier report; H6 says move the width-matrix task before the adoptions
so a before baseline exists at all; V14 says the acceptance criterion must be a decision with
evidence, not an outcome. **Adjudication: all four, in that order.** They are not in conflict; they
are four layers of one defect (C40, C46, C70). The only genuine tension is G8's "make Task 3's
error-page adoption conditional on Task 1's answer" versus H6's "move the matrix task first".
**H6 is stronger**: a conditional adoption still leaves the 404 without a committed before baseline,
while an early matrix task gives every later adoption a real diff to accept against.

**2.2 Whether the styleguide composition section stays.** The plan and spec sanction it as the one
non-site adoption; H2's cut list defers it to the second half ("it is the one item that is not 'the
exemplar uses its chassis'"); R4 depends on it as the home for `.cairn-card` once the members
adoption is dropped, and G10 depends on it as the only home for `.cairn-sidebar-layout`.
**Adjudication: the section stays, in the same half as the primitive adoptions.** Deferring it would
strand two of the five primitives with no proof surface at all, which converts H2's saving into the
exact failure the pass exists to end. If a cut is needed, cut the alignment spec (C69) and the
members adoption (C10) instead - both of which every lens agrees are unfounded.

**2.3 The ceiling number.** R6 says 8M ("the gate is A's plus the visual loop; images dominate");
H1 says 9M at twelve tasks or 5M per half on a split. **Adjudication: H1.** R6 prices the images and
the loop; H1 prices those plus the create-cairn-site `prepack` and 806-test suite that chassis-B adds
to every task gate and chassis-A never ran. The arithmetic in section 3 lands above 8M before any
retry.

**2.4 How the focus ring is verified.** H3 converts the implementer's tab-through into a Playwright
focus loop; V3 makes the capture tool take focused tiles graded by the pass-end verifier.
**Adjudication: H3 primary, V3 supplementary** (C48). H3's is deterministic, runnable under the
implementer's actual toolset, checkable by the reviewer, and survives the pass as a regression test;
V3's focused tiles add the human-eye check the test cannot give, at four images.

**2.5 The gate-extension boundary.** G3 treats Task 8's `check-public-tokens` change as a scoping
bug to fix; R11 treats it as a boundary violation of the pass's own "no engine code changes".
**Adjudication: both, in R11's "keep it and amend the constraint" branch** (C30, C64). The
definitions-layer counter-argument R11 supplies (`site.css` consumes tokens, it does not define
them) is the winning one, and Task 8's planted-literal proof is already the right evidence.

**2.6 What Task 10's adoption needs.** R1 says declare an access map with `ownerOnly: true`; G1 says
that is not enough because the dev handle never attaches `cairnAccess` at all, and offers three
branches including deferral. **Adjudication: G1's evidence governs, and branch (A), deferral, is
recommended** (C73). R1's posture requirement ("the admitted role set before and after adoption is
identical") is folded into branch (B) if Geoff wants the adoption in this pass.

**2.7 Sizing.** H2 says split at the Task 6/7 boundary; R6 and H1 say the ceiling is wrong; no lens
argues for the current shape. **Adjudication: section 3.**

---

## 3. The sizing decision

### 3.1 The hygiene lens's split proposal

Split at the Task 6/7 boundary, because the pass holds two kinds of work with different cost profiles
and different risk. Tasks 1-6 are chassis ADOPTION (shell, five primitives, focus ring, entry row),
paint-adjacent, provable against a small matrix, cheap in images. Tasks 7-12 are CORPUS AND
CONFORMANCE (thirteen authored posts, page size and baselines, identity, CSS conformance, matrix
extension, idioms, rebake, records), where the authored-output cost, the CI regen round-trips and the
seven-surface verifier live. The trigger is the sizing rule itself: Tasks 3, 5 and 7 each carry eight
deliverables and Task 11 has no bound, so the honest fix is four more tasks, making fifteen in place,
which is the accretion signal rather than discipline.

### 3.2 The risk lens's ceiling finding

6M for twelve tasks reinstates the figure the chassis-A review rejected, for a pass whose per-task
gate is A's plus the showcase visual suite plus a capture run, plus ~144 per-task image reads, plus an
uncapped 140-image verifier loop, plus thirteen content-gated posts, with the conductor at Fable
rates. Roughly 0.9M-1.2M of the ceiling is image reads alone, leaving under 0.4M per task against
internals-C's observed 0.55M. The 80 per cent stop fires at the second checkpoint for a reason that is
arithmetic at authoring time.

### 3.3 What each half carries after all the corrections above

Several tasks shrink or move: the alignment spec is deleted (C69), the members adoption and its ten
baselines are deleted (C10), the Task 10 auth adoption is deferred (C73A), Task 1 becomes two commits
(C41), the width-matrix task moves to position 2 (C46), and the CI regen moves to the conductor
(C61).

**B1, adoption (8 tasks):** 1a capture tool (V1/V7-corrected, with the surface-availability header);
1b the mechanical CSS reformat; 2 the width matrix moved forward (error404 and `/admin/signups` only;
no alignment spec, no members); 3 the shell; 4a the five site adoptions with R3's numbers; 4b the
styleguide composition section; 5 the focus ring (Playwright focus loop plus focused tiles); 6 the
entry row (R17-corrected). Verifier grades **five** surfaces (home, article, styleguide, error404,
signups).

**B2, corpus and conformance (8 tasks):** 1 the thirteen posts alone; 2 page size, comments,
`archive.test.ts`, the `archive2` surface and its baselines; 3 identity (titles and wordmark through
`page.data`); 4 the footer-nav decision per C22; 5 CSS conformance (C64/C65/C30); 6 small idioms
(C73A: no auth adoption); 7 waymark, bounded per C78; 8 records, contact sheets, `e2e.yml`. Verifier
grades **six** surfaces (the five plus `archive2`).

### 3.4 Ceilings, with the image budget made explicit

Assumption, stated so it can be argued with: **one image read costs ~1.6k tokens** (a vision model's
~1568px long edge), a paired before/after read ~3.2k, and agent prose plus the per-turn context
re-buy multiplies a grading agent's image cost by roughly 1.5. Tiling (C24) raises the image COUNT
but is what makes the tokens buy evidence; bound it by grading one above-the-fold tile per
surface/width/scheme plus tiles only for enumerated regions.

- Per-task `diff-reviewer`: 12 tiles ≈ 12 x 1.6k x 1.5 ≈ **30k per paint task**.
- Pass-end verifier, bounded set: ~70 surface/width/scheme combos, one above-the-fold tile each plus
  ~60 region tiles, before and after ≈ 130 paired reads ≈ 0.31M raw, ≈ **0.45M per iteration**;
  two rounds ≈ **0.9M**.
- Non-image work at chassis-A's accepted 0.63M per task.

**One pass, twelve tasks:** 12 x 0.63M + 0.35M (per-task images) + 0.9M (verifier) ≈ **8.5M**,
before a single retry or fix round. Ceiling **9M**, which is H1's number and leaves ~6 per cent
headroom. The 80 per cent stop lands around task 10.

**Split:** B1 ≈ 8 x 0.63M + 0.2M images + 0.5M verifier (five surfaces, one round expected)
≈ **5.7M**; ceiling **5M is too tight - set B1 at 6M**. B2 ≈ 8 x 0.63M + 0.15M + 0.55M ≈ **5.7M**;
ceiling **6M**. Total 12M against one pass's 9M: the split costs ~3M more in absolute tokens (two
pass-end rituals, two verifier runs, two sets of records) and buys two passes that each finish inside
their ceiling with a real margin.

### 3.5 The alternative: hold at one pass with a raised ceiling and named cuts

Twelve tasks at 9M, with: the alignment spec cut (C69); the members adoption cut (C10); the Task 10
auth adoption deferred (C73A); Task 11 bounded (C78); the width matrix moved to position 2 (C46); and
Tasks 3, 5 and 7 pre-split at dispatch with their split points written into the header now rather than
discovered at the checkpoint. That is the minimum honest one-pass version, and it is close: the
corrections above remove roughly one task's worth of work, which is most of what the sizing rule is
complaining about.

### 3.6 Recommendation

**Split at the Task 6/7 boundary, B1 at 6M and B2 at 6M.** Three reasons. The corrections do not
shrink the pass enough: they remove the alignment spec, the members adoption and the auth adoption
(perhaps 0.9M) while ADDING the tiling tool, the intended-moves manifest, the contact sheets, the
focus-loop spec, the third CI regen and a second verifier input, which cost most of that back. The
two halves have genuinely different contended resources: B1 contends on baselines and the template,
B2 additionally on the content corpus and two CI regen round-trips, and the pass already declares no
parallel chains for that reason. And the release window is not pressing: the plan's own hands-forward
says the window holds for one cut after polish, so a second pass boundary costs schedule, not
shipping. If Geoff prefers one pass, section 3.5 is the version to take, and it must carry the 9M
ceiling and every named cut, not the ceiling alone.

---

## 4. Spec amendments

**4.1 Risks - the section carries no chassis-B risk at all** (R15). All four current bullets are
chassis-A risks, so the spec implies B is the safer pass, which is the opposite of true. Append four
bullets:

> - The primitive adoptions can force a visible redesign: `.cairn-section` adds box geometry to a
>   home-page block that has none, and `.cairn-card` doubles the padding of a card whose padding sits
>   on an inner wrapper. The task enumerates each delta with numbers and reports rather than forces a
>   redesign.
> - The exemplar's custom-screen adoption changes the signups route's authorization over a D1 table
>   of names and email addresses, and the showcase declares no access map while the dev backend
>   attaches none. The adoption lands only with an access map admitting the same role set as today's
>   `requireOwner`, and with the dev-package seam that attaches it; otherwise it is deferred to
>   polish by name.
> - Thirteen new posts enter every scaffolded site's starter corpus, since `src/content/` is in no
>   exclude list. The corpus decision is ruled explicitly rather than made inside an execution pass.
> - Baselines are regenerated locally per task and CI-canonically only twice, and local and CI
>   renders share one filename, so sub-floor drift below the 120px floor can accumulate invisibly.
>   The pass-end CI regen's diff over the committed local baselines is READ and any differing
>   surface is named.

**4.2 Chassis-B scope item 2 (composition primitives)** - amend for C9 and C10:

> 2. **The remaining five composition primitives used and proven.** Each appears in showcase markup,
>    is baselined, and is proven at 320 and 2560. The article carries no sidebar-shaped region, so
>    `.cairn-sidebar-layout` is proven on the styleguide composition section; `.cairn-card`'s real
>    adoption lands on a surface the scaffold receives, never on the excluded `src/routes/members`
>    fixtures, or the pass records that this theme has no real use for it. Review 5.5.

**4.3 Chassis-B scope item 4 (the archive)** - amend for C20 and C21:

> ...Thirteen new posts (written under the site content method), `ARCHIVE_PAGE_SIZE` 13, the home
> page's pagination block and `/archive/2` baselined at the five viewports in both schemes. The
> archive route paginates the same `entries.slice(1)` the home route does, so 27 posts give exactly
> two pages and `/archive/3` correctly 404s. Whether the thirteen ship to the scaffold or are
> excluded by path is ruled in the plan's Ruled inputs, since `src/content/` is in no exclude list
> today and the corpus otherwise doubles in every scaffolded site.

**4.4 Chassis-B scope item 7 (width matrix)** - amend for C69 and C10:

> 7. **Width matrix coverage.** The unproven emitted public surfaces including the 404 baseline enter
>    the matrix. The documented screenshot floor is not compensated by a new test: the 2026-08
>    measurement found zero public rows above the 2px bar, so `public-design-system.md` records that
>    fact and the trigger that would make a compensation test worth writing. Review 5.3, 5.6.

**4.5 Chassis-B scope item 8 (small idioms)** - amend for C73:

> ... `createSectionAction` adopted in `admin/signups` ONLY if the pass also lands the access-map
> declaration and the dev-package `cairnAccess` attachment the adoption requires; otherwise the raw
> shape stays with its comment and the adoption is filed to polish with the seam it needs named.

**4.6 Chassis-B ceiling line** - replace with the number section 3 lands on, and state the image
assumption:

> Ceiling per section 3 of the fold brief, with the screenshot budget counted in TILES and the
> pass-end verifier's per-iteration image count stated in the plan header; checkpoints every four
> tasks, each writing STATUS; the four-lens review; Geoff's before/after read from committed contact
> sheets before merge.

**4.7 "Out of scope for both"** - no change needed; the reviews found nothing false there.

---

## 5. Verified sound (do not re-litigate)

- The archive arithmetic: 14 posts today, `ARCHIVE_PAGE_SIZE = 50`, the home excludes the featured
  post, 27 posts at page size 13 gives exactly two pages, page 1 keeps 13 index rows, the tag filter
  survives its `> 12` threshold, `tag-filter.spec.ts` still counts 14 `[data-cairn-post]`, and the
  home baseline moves only by the pagination block.
- Thirteen 2025-dated posts give the claimed shape: page 1 stays the 2026 posts under one year
  heading, `/archive/2` carries the 2025 posts under one heading.
- The five renderable "Waymark" literals and the three genuinely disagreeing title separators.
- 22 hand-written focus rings today (20 after chassis-A's two deletions), six of them in `prose.css`;
  the `.lead__title a` focus assertion accepts outline OR box-shadow, so a token-valued outline keeps
  it green; `checkTokenResolution` reads the whole of `tokens.css`, so new `--cairn-focus-ring-*`
  tokens resolve.
- The shell wrapper strings verbatim, both `main` elements, the `.site-main` block and its
  re-derivation comment, the chassis README's removal table and AstroPaper aside.
- The five composition primitives exist under the names the plan uses, at the lines it cites.
- `--text-step-1` and `-2` are byte-identical; both clamp target values (`0.84rem`, `1.06rem`) are
  arithmetically correct.
- The entry-row extraction is a true pure extraction: the two rule sets are byte-identical in every
  declaration including the `@media (max-width: 34rem)` block, and no e2e selector reads `.entry`.
- `readMenu(siteConfig, 'footer', 1)` is a valid call; the three footer entries all pass `SAFE_URL`;
  `setMenu` round-trips the document so a `menus.footer` block survives a nav save.
- `feed.ts`'s mixed `?.`/`!`, the three `platform!` assertions, and the fact that
  `add-a-custom-admin-screen.md` teaches `createSectionAction` and `requireAccess` with no shipped
  wirer.
- `e2e.yml`'s regen dispatch mechanics: the input, the two-spec step, and the bot's commit back to
  the dispatched ref; `gh workflow run e2e.yml --ref chassis-b -f update_snapshots=true` is the right
  invocation.
- `scripts/` is template-excluded, so `capture-surfaces.mjs` cannot leak into the scaffold.
- Every gate, workflow and artifact the plan names exists, including
  `~/.claude/workflows/pass-execute-chains.js` (created after the chassis-A review said otherwise).
- `~/.cache` is durable on this workstation and reachable by every local subagent (the mechanism
  works; only the write-once and provenance rules are missing).
- ImageMagick is installed and `pixelmatch`/`pngjs` are not, so `magick compare` is the available
  instrument.
- The plan carries zero em dashes, names its primitive call sites in the Ruled inputs rather than
  deferring them, states the baseline-regen protocol per task, and folds the archive item it
  inherited. Three of four lenses said in their own words that it is better authored than chassis-A's
  was at the same stage.
- Every prior chassis-A correction held: no REGRESSION on the page-size/tag-filter interaction, the
  `handleUnseenRoutes` exception, the content-guide authority, or the post-interleaving ruling. The
  four flagged regressions are the ceiling (C1), the missing Consumes lines (C32), the checkpoint
  content (C2), and the `createSectionAction` adoption pricing (C73).
