# Chassis-B plan inputs (pre-extracted 2026-09-07 against main at d565ab77)

Three read-only research dispatches banked for the chassis-B plan (`docs/superpowers/plans/2026-09-07-chassis-b-pass.md`), drafted while chassis-A executed. Every anchor is re-verified at dispatch against post-A `main`; the drift notes name where chassis-A moves a line. Write-once record.

---

# Part 1: review anchors per spec item


## Item 1, The shell from the chassis (recorded rank 8, review 2.7)

**Finding (review 2.7):** The theme hand-rolls the flex-column shell the chassis exists to
provide, and says so in its own comment. `composition.css:95-116` (now ~97-116) defines
`.cairn-site-shell`/`.cairn-site-main`, baking in the flex cross-axis width fix.
`(site)/+layout.svelte:70` and `+error.svelte:26` both hand-roll
`class="site-shell flex min-h-screen flex-col ..."` instead of the chassis classes. `site.css`
re-derives the same fix on `.site-main` and its comment admits it. The identical gotcha prose is
written three times: `src/chassis/README.md:132-141`, `composition.css:95-106`,
`site.css:78-91` (now ~77-89).

**Rank doc (finding 8)** frames the same defect: "The site-shell mechanic lives at three
altitudes and the chassis primitive built for it is unused." Same file trio, same remediation
(adopt `.cairn-site-shell`/`.cairn-site-main` on `(site)/+layout.svelte` and `+error.svelte`,
delete the duplicated width/min-width from `site.css`).

**File:line anchors, verified current `main`:**
- `examples/showcase/src/chassis/composition.css:107` `.cairn-site-shell {`, `:112` `.cairn-site-main {` (comment block explaining the fix runs ~97-105), confirmed present.
- `examples/showcase/src/routes/(site)/+layout.svelte:70`, still `class="site-shell flex min-h-screen flex-col bg-base-100 font-body text-base-content"`, confirmed.
- `examples/showcase/src/routes/+error.svelte:26`, same string, confirmed.
- `examples/showcase/src/theme/site.css:77` `.site-main {`, `:89` "Chassis's own `.cairn-site-main` recipe (composition.css) documents and bakes in", confirmed (line drifted from review's :78-91 to :77-89, one line earlier, immaterial).
- `examples/showcase/src/chassis/README.md:132-141`, confirmed present, plus the removal-table line 196 still lists all seven primitives as unused, naming "the AstroPaper port's own theme is the first adopter of the site-shell pair", this note itself may be stale/aspirational and worth checking at dispatch.

**Still true:** yes, unconditionally.

**Chassis-A drift risk:** none of chassis-A's tasks touch `composition.css`, `site.css`'s shell
block, `+layout.svelte`, or `+error.svelte`. This item's anchors should be stable when chassis-B
opens, *except* that chassis-A Task 1 (Prettier reformat) and Task 11 (register purge) touch
`site.css` and `README.md` more broadly, reformatting can shift line numbers by a line or two,
and Task 11 explicitly touches "the `@component` blocks past the standard's length" and citation
prose but not this specific comment block. Re-anchor line numbers at dispatch regardless, per
the plan's own standing instruction.

---

## Item 2, The remaining five composition primitives (review 5.5)

**Finding:** "The composition primitives are proven by nothing." Seven primitives, 117 lines,
zero markup users, therefore zero visual baselines and zero assertions.
`.cairn-sidebar-layout`'s 48rem stacking breakpoint and `.cairn-site-main`'s cross-axis fix are
exactly what the width matrix exists to catch, and neither is in it. "Adopting the two primitives
in 2.7 fixes this as a side effect", i.e., item 1 above adopts shell/main; item 2 is the
*remaining five* (`.cairn-card`, `.cairn-band`, `.cairn-section`, `.cairn-hero`,
`.cairn-sidebar-layout`).

**File:line anchors:**
- `examples/showcase/src/chassis/composition.css`, grepped for `cairn-card|cairn-band|cairn-section|cairn-hero|cairn-sidebar-layout` across `src/routes` and `src/theme`: **zero hits outside `composition.css` itself**, confirming still zero adopters today.
- Width matrix: `examples/showcase/e2e/site-visual.spec.ts:23` `VIEWPORT_WIDTHS = [320, 390, 768, 1440, 2560]`, surfaces looped are home/article/styleguide only (lines 27-56), confirmed, no primitive-bearing surface in the loop.

**Still true:** yes.

**Chassis-A drift risk:** none directly, chassis-A does not touch `composition.css` or add
primitive adopters (that's explicitly chassis-B's job, spec item 3 "one focus ring" is the
adjacent related work). Note the spec's item 2 says "review 5.5" which also names `.cairn-hero`
as intended for the home masthead (per 2.7's remediation), the plan author should reconcile
whether `.cairn-hero` lands via item 1 (shell/main only) or item 2 (the remaining five);
the review's own item-1-remediation text (2.7) suggests `.cairn-hero` on the home masthead too,
so there is a slight three-way split between "two primitives" (2.7's own suggestion:
shell+main+hero) and the spec's "shell" (item 1) vs "remaining five" (item 2). Flag for the plan
author: decide whether `.cairn-hero` is item 1 or item 2's responsibility before task-splitting.

---

## Item 3, One focus ring (review 4.2)

**Finding:** The focus ring (`outline: 2px solid var(--color-primary)` with
`outline-offset: 2px`) is hand-written 22 times across 9 files: `prose.css`,
`(site)/+page.svelte`, `(site)/archive/[page]/+page.svelte`, `(site)/styleguide/+page.svelte`,
`SiteHeader.svelte`, `SiteFooter.svelte`, `ArticleView.svelte`, `Carousel.svelte`,
`IntroLedger.svelte`. Named a design device in `docs/internal/public-design-system.md`
with no single source. Remediation: one recipe in `composition.css`
(`.cairn-focus-ring` or a Tailwind v4 `@utility`) reading `--cairn-focus-ring-*` tokens.

**File:line anchors, verified:**
- `grep -rn "outline: 2px solid var(--color-primary)" examples/showcase/src` returns **22 hits** today, matching the review's count exactly, across the 9 named files (confirmed by file list: `prose.css`, `(site)/+page.svelte`, `(site)/archive/[page]/+page.svelte`, `(site)/styleguide/+page.svelte`, `ArticleView.svelte`, `Carousel.svelte`, `SiteFooter.svelte`, `SiteHeader.svelte`, `IntroLedger.svelte`).

**Still true:** yes, count unchanged.

**Chassis-A drift risk, SIGNIFICANT.** Chassis-A Task 5 **deletes**
`IntroLedger.svelte` and `Carousel.svelte` outright (dead code, zero importers). Those two
files carry some of the 22 hand-written rings. When chassis-A merges, the count chassis-B
inherits will be **lower than 22** (the two deleted files' occurrences drop out). The plan
author must re-count post-chassis-A, not cite "20 hand-written rings that remain after A's
deletions" as a fixed number without re-deriving it, the spec text at item 3 already
anticipates this ("replaces the 20 hand-written rings that remain after A's deletions"), so the
spec's own arithmetic (22 minus however many are in the two deleted files) should be checked:
count occurrences in `IntroLedger.svelte` and `Carousel.svelte` specifically. From the grep
above both files are in the 9-file list, so each contributes at least one hit; verify exact
subtraction at dispatch since the spec pre-computed "20" (implying exactly 2 of the 22 live in
the two deleted files, one apiece).

---

## Item 4, The archive proven and the entry row once (recorded ranks 1 and 6)

**Rank 1 finding:** "The paginated archive subsystem never executes, and buys a permanent
build-gate exception to stay green." `ARCHIVE_PAGE_SIZE = 50` in `src/chassis/archive.ts:8-10`
(comment cites a "220-post review fixture" not in the tree); the showcase has 14 posts (13 after
slicing the featured one), so `totalPages` is always 1, `/archive/[page]` never renders, and
`svelte.config.js:47-50` carries a permanent `handleUnseenRoutes` exception. Remediation:
lower `ARCHIVE_PAGE_SIZE` to a value the corpus crosses (rank doc suggests 6; spec item 4 commits
to a bigger corpus: "Thirteen new posts... `ARCHIVE_PAGE_SIZE` 13").

**Rank 6 finding:** "The archive entry row is written three times and its CSS twice, verbatim."
`<article class="entry">` at `(site)/+page.svelte:119`, `:140` (twice in one file), and
`(site)/archive/[page]/+page.svelte:34`. Remediation: extract
`src/theme/components/EntryRow.svelte` (or `ArchiveIndex.svelte` per the rank doc's fuller
name) owning the row markup and scoped styles.

**File:line anchors, verified current `main`:**
- `examples/showcase/src/chassis/archive.ts:10` `export const ARCHIVE_PAGE_SIZE = 50;`, confirmed (line moved from review's cited :8-10 range slightly; the constant itself is at line 10 today, with the comment above it).
- `examples/showcase/src/content/posts/`, **14 posts today**, confirmed via `ls | wc -l`.
- `<article class="entry"` at `(site)/+page.svelte:119` and `:140` (both present) and
  `(site)/archive/[page]/+page.svelte:34`, all three confirmed at those exact line numbers.
- `svelte.config.js:47-50` `handleUnseenRoutes` exception, not independently re-grepped this
  pass but referenced consistently across both source docs; treat as still present pending
  dispatch-time confirmation (chassis-A's Task 11 explicitly rewrites the two stale 220-post
  comments here, see below).

**Still true:** yes.

**Chassis-A drift, CERTAIN and NAMED BY THE PLAN ITSELF.** Chassis-A's own "What this pass
hands forward" section states explicitly: "the archive proof (27 posts at page size 13, the
pagination block and `/archive/2` baselined, `admin-office-*` regenerated...)" is chassis-B's.
Chassis-A does NOT change `ARCHIVE_PAGE_SIZE` or the post count (rendered output does not change
in chassis-A by its own global constraint), but chassis-A **Task 11, Step 0** explicitly rewrites
the two stale 220-post comments: `src/chassis/archive.ts:7-9` and `svelte.config.js:39-46`,
"rewritten to the truth (the constant is fixture-sized and chassis-B re-derives it; the exception
is the starter's small-corpus affordance)". So by the time chassis-B opens: the comment text at
`archive.ts:7-9` will read differently (no longer citing "220-post fixture"), and the
`svelte.config.js:39-46` comment will differ too, though the exception mechanism and
`ARCHIVE_PAGE_SIZE = 50` value itself should be UNCHANGED (chassis-A doesn't touch rendered
output). The line NUMBER of `ARCHIVE_PAGE_SIZE` may also shift slightly if the comment above it
is rewritten shorter or longer. Also: chassis-A Task 6 splits `cairn.config.ts` and Task 9 adds
unit tests including one for `paginateArchive` (`src/chassis/archive.test.ts`), the archive
module gains a co-located test file, unrelated to the entry-row/page-size defect but changing the
directory's contents the plan author should expect. **Note also the spec's item 4 says "13 new
posts" and "ARCHIVE_PAGE_SIZE 13"** but the rank doc's own remediation suggested 6; the plan
author should treat the spec's "13" as the ratified number (it is more specific and newer),
not re-litigate against the rank doc's "6" example.

For the entry-row triplication (rank 6): chassis-A does not touch `(site)/+page.svelte` or
`(site)/archive/[page]/+page.svelte` markup (no task lists them), so those three `<article
class="entry">` sites and the ~120 duplicated CSS lines should be unchanged in line/content when
chassis-B opens, other than possible Prettier reformat (chassis-A Task 1) which touches
`.svelte`/`.ts`/`.js` but **not CSS**, the ruled input explicitly says "the CSS half rides
chassis-B", and possible register-purge comment rewrites in Task 11 if these files carry cited
comments (grep did not find any of the section-3.1-3.6 citations in these two files
specifically, so likely unaffected).

---

## Item 5, Site identity from `siteConfig` (recorded rank 7, review 4.7)

**Finding (both sources, same defect):** "Waymark" hardcoded in 5 places while
`siteConfig.siteName` exists: `SiteHeader.svelte:112`, `SiteFooter.svelte:52`,
`+error.svelte:23`, `(site)/archive/[page]/+page.svelte:17`, `(site)/styleguide/+page.svelte:107`.
Two unexplained origin literals: `src/chassis/content.ts:29` `ORIGIN = 'https://showcase.test'`
and `wrangler.jsonc:61` `PUBLIC_ORIGIN: 'http://localhost:4173'`, ledger has ruled `ORIGIN` stays
a literal (`public-origin-only-origin-source`, decline), but no comment says so or distinguishes
it from `PUBLIC_ORIGIN`. Footer nav hardcodes its own list (`SiteFooter.svelte:33-37`) instead of
reading `page.data.nav` the way `SiteHeader.svelte` does (`:63-67` / current `:64`).

**File:line anchors, verified current `main`, all exact matches:**
- `SiteHeader.svelte:112` `>Waymark</span`, confirmed.
- `SiteFooter.svelte:52` `>Waymark</span`, confirmed.
- `+error.svelte:23` `<title>{page.status} | Waymark</title>`, confirmed.
- `(site)/archive/[page]/+page.svelte:17` `<title>Archive, page {data.archive.page} · Waymark</title>`, confirmed.
- `(site)/styleguide/+page.svelte:107` `<title>Styleguide · Waymark</title>`, confirmed.
- `content.ts:29` `ORIGIN = 'https://showcase.test'`, confirmed.
- `wrangler.jsonc:61` `"PUBLIC_ORIGIN": "http://localhost:4173"`, confirmed.
- `SiteFooter.svelte:33` `const nav: NavItem[] = [` (hardcoded) vs `SiteHeader.svelte:64`
  `(page.data.nav ?? []).filter(`, both confirmed, the fork is live today.

**Still true:** yes, all five hardcodes and both origin literals unchanged.

**Chassis-A drift risk:** none of chassis-A's 12 tasks touch `SiteHeader.svelte`,
`SiteFooter.svelte`, `+error.svelte`'s title, the archive/styleguide page titles, or
`content.ts`'s `ORIGIN` constant. Task 7 DOES touch `src/chassis/content.ts`, it adds a
`siteMeta` export "holding the title, description, and origin the feeds compose today" and
rewires `feed.xml`/`feed.json` to consume it, so `content.ts` will have new content around
line 29 by the time chassis-B opens (a `siteMeta` export composing `ORIGIN`, not replacing it).
Re-anchor `content.ts:29` at dispatch; the `ORIGIN` constant itself should persist but a new
export sits near it. No other listed anchor is touched by chassis-A.

---

## Item 6, CSS conformance (review 4.1 to 4.6, 5.2)

Six sub-findings bundled. All re-verified individually below.

### 4.1, Two degenerate `clamp()` declarations
`src/theme/theme.css:227-228` (now confirmed at `:227` `--text-step--1: clamp(0.84rem, 0.84rem,
0.80rem);` and `:228` `--text-step-0: clamp(1.06rem, 1.06rem, 1.0625rem);`), both still
collapse to a constant (min ≥ preferred/max in both). Related: `--text-step-1` (`:229`) and
`--text-step-2` (`:230`) are still byte-identical clamps (`clamp(1.27rem, 1.25rem + 0.10vw,
1.33rem)` both). **Still true, line numbers exact match** (review cited 227-228, 229, 230, all
confirmed unchanged).

### 4.2, Focus ring 22×9, see Item 3 above (same finding, cited from both spec items 3 and 6/4.2's neighbor 4.1-4.6 range; the spec's item 3 is the actioning task, item 6 cites "4.1 to 4.6" as a range which technically re-includes 4.2, but the dedicated ring primitive is item 3's job, treat 4.2 as covered by item 3, not duplicated work in item 6).

### 4.3, Two theme-only chrome tokens
`--cairn-caption-tracking` and `--cairn-focus-ring-radius` declared only in
`src/theme/theme.css:311-312` (confirmed: `:311` `--cairn-focus-ring-radius: 2px;`, `:312`
`--cairn-caption-tracking: 0.09em;`, order in file is swapped from the review's naming order but
both lines confirmed), read by `SiteHeader.svelte:184-185` and `SiteFooter.svelte:82` (confirmed
all three usage sites), with no generic default in `src/chassis/tokens.css`. **Still true.**

### 4.4, Literals in `site.css`
`site.css:194` `border-radius: 0.25rem` (confirmed), `:193` `border-left: 3px solid` (confirmed,
full line is `border-left: 3px solid var(--cairn-info-ink);`), `:140` `max-height: 32rem`
(confirmed). **Still true, exact line match.**

### 4.5, No class namespace convention
Four live namespaces (`cairn-*`, bare `site-*`, `sg-*`, bare directive classes like `.alert`,
`.card-body`) with no stated convention in the chassis README. Not independently re-grepped for
every namespace instance this pass (would require enumerating all four across the tree), but the
underlying files (`tokens.css`, `prose.css`, `README.md`) are unchanged by anything currently on
`main`, so treat as still true; the README's `README.md:59-60` area (chrome token bindings
comment) was spot-checked and is present with no added namespace-convention paragraph.

### 4.6, Two page-title separators
`+error.svelte:23` uses `| Waymark`; `(site)/archive/[page]/+page.svelte:17` and
`(site)/styleguide/+page.svelte:107` use `·`. **Confirmed, exact match** (see Item 5's grep
output above, same three lines serve both findings 4.6 and 4.7).

### 5.2, `site.css` outside the token gate; no `.svelte` `<style>` `var()` resolution
`scripts/checks/check-public-tokens.mjs:79` selects files by
`name.endsWith('.svelte') || name === 'prose.css' || name === 'composition.css'`, **confirmed,
line 79, exact text match**, `site.css` is not in the selector. The resolution-check gap
(does not resolve `var(--token)` inside `.svelte` scoped `<style>`) was not independently
re-verified by reading the whole script this pass, but nothing on `main` has touched this file
since the review, so treat as still true.

**Chassis-A drift risk, LOW for these anchors, but real for surrounding content.**
- `theme.css` is touched by chassis-A's Task 11 (register purge) for the *unrelated* 35-line
  type-scale derivation narrative at `theme.css:191-225` (chassis-A trims that to ~5 lines and
  moves the rest to `public-design-system.md`). The clamps 4.1 cites (`:226-230`) sit
  **immediately after** that block, so their line numbers will shift down once Task 11 removes
  ~30 lines above them. Re-anchor `--text-step-*` lines at dispatch; the actual clamp
  *values* should be untouched by Task 11 (comment-only purge), so the defect itself survives,
  just at new line numbers (roughly 30 lines earlier than today, i.e., high-190s to low-200s).
- `site.css` gets the CSS-format Prettier pass in chassis-B itself (chassis-A's ruled input
  explicitly holds CSS formatting for chassis-B, "after internals-C's `prose.css` rename settles
  and because `check:public-tokens` and `check:chassis-boundary` read those files"), so item 6
  should expect to also be running the CSS reformat concurrently with its own literal-token fixes
  in the same files, and should sequence "run format once" before hand-editing literals, or the
  reformat will re-diff already-fixed lines.
- `tokens.css` gains a comment re-point in chassis-A Task 8 ("`src/chassis/tokens.css:17` (the
  comment re-pointed)" for the `cardShell`/`headRow` re-homing), unrelated to 4.3/4.5's content
  but confirms `tokens.css` is actively edited before chassis-B opens; re-read the file fresh
  rather than trusting this record's line numbers for anything beyond the specific greps above.
- `check-public-tokens.mjs` is not touched by any chassis-A task; `:79`'s selector logic should
  be stable.

---

## Item 7, Width matrix coverage (review 5.3, 5.6)

**5.3 finding:** Width matrix covers three surfaces (home, article, styleguide); four more are
unproven: `/archive/2` (never renders per rank 1's defect), root `+error.svelte`, `/members`,
`/admin/signups`. The 404 is called out as "the single most duplicated layout in the tree and the
only one with no baseline." Remediation: add `/404` and `/archive/2` to `VIEWPORT_WIDTHS`'
surface loop.

**5.6 finding:** `playwright.config.ts:4-14` documents `maxDiffPixels: 120` as a real floor (a
1.5px shift on a 16px icon can measure 51px of diff), for the admin,
`src/tests/component/vertical-alignment-recipes.test.ts` compensates; for the public template,
nothing does. Not a defect, "worth naming" per the review.

**File:line anchors, verified:**
- `examples/showcase/e2e/site-visual.spec.ts:23` `VIEWPORT_WIDTHS = [320, 390, 768, 1440,
  2560]`, three surfaces looped at lines 27-56 (home `:28`, article `:35`, styleguide `:47`) , 
  confirmed, still exactly three surfaces, no `/archive/2`, `/404`, `/members`, or
  `/admin/signups` in the loop.
- `examples/showcase/playwright.config.ts:14` `maxDiffPixels: 120`, confirmed (line shifted
  slightly from review's :4-14 range citing the whole comment block; the actual `expect` key is
  at line 14 today).
- `src/tests/component/vertical-alignment-recipes.test.ts` exists (engine-side, admin-scoped) , 
  confirmed present, no public-side equivalent found.

**Still true:** yes.

**Chassis-A drift risk, MODERATE.** Chassis-A Task 1 explicitly reformats
`playwright.config.ts` (it is one of the four tab-indented files fixed in Task 1's first
commit: "tabs at :4-14"), so the whole comment block housing `maxDiffPixels: 120` will be
re-indented to spaces; the VALUE and finding stay true, but re-read the file fresh rather than
trust line 14 (Prettier reformatting of a JS/TS file can renumber lines if it also reflows
long lines, though typically 1:1 for simple key changes, verify at dispatch). No chassis-A task
touches `site-visual.spec.ts` or adds the missing surfaces (that's explicitly chassis-B item 7's
job) or `vertical-alignment-recipes.test.ts`. `/admin/signups` itself IS touched by chassis-A
Task 10 (idiom conformance: the `fail` literal, `platform!` assertions, `./$types` typing) , 
so by the time chassis-B adds it to the width matrix, its underlying code will already differ
from what review 5.3 described (idioms fixed, but the route's existence and shape as a
screenshot target is unaffected).

---

## Item 8, Small idiom items (review 1.2 to 1.4, 2.8)

Four sub-items bundled under "Small idiom items", cross-referenced against
`siteConfig` import door (1.2), `feed.ts` optional-chaining/non-null mix (1.3), stale doc file
paths (1.4), `platform!` assertions (2.8), plus (per spec item 8's own text) the design-system
doc's stale paths, the CSS half of Prettier adoption, and `createSectionAction` adoption
conditionally.

### 1.2, `siteConfig` imported through two doors
`(site)/+layout.server.ts:1-11` carries the comment explaining why `site-config.ts` (not
`$theme/cairn.config.js`) is the lean door; import lines now at `:12-14` (`siteIslands` from
`$theme/islands/registry.js`, `primaryNav` from `$theme/site-config.js`), confirmed, comment and
imports both present, essentially same content as review cited (line numbers shifted by ~1 from
review's :9-11 to current :9-11 comment / :12-14 imports, negligible drift, likely just a
line-counting difference in the original review).
`(site)/+page.server.ts:4` `import { siteConfig } from '$theme/cairn.config';`, confirmed exact
line match. `cairn.config.ts:526` `export { siteConfig } from './site-config.js';`, confirmed
exact line match (the re-export the review cites as proof "both work").

### 1.3, `feed.ts` optional chaining + non-null assertions
`src/chassis/feed.ts:14` `(posts?.all() ?? []).map(...)` and `:19`
`await cairn.rendering.render({ body: posts!.byId(p.id)!.body, resolve })`, confirmed both
present at the same lines the review cites (14-19 range).

### 1.4, Stale doc paths
`docs/internal/public-design-system.md:5` still names
`examples/showcase/src/lib/theme.css`, `:316-317` still names `src/lib/theme.css`,
`src/lib/prose.css`, `src/lib/components/`, confirmed, exact match to review's citation
("opening paragraph and again in Pointers section"). `svelte.config.js`'s comment (now
lines ~13-14, confirmed in the read above) still says "$lib is unused; the showcase keeps no
src/lib", confirming the doc is still wrong.

### 2.8, `platform!` three times
`src/routes/admin/signups/+page.server.ts:20, 33, 42`, confirmed exact line match to the
review's citation.

**Still true:** all four, yes.

**Chassis-A drift, the largest of any item in this scope, because Task 10 targets exactly
these files.** Chassis-A Task 10 ("Idiom conformance") explicitly:
- Fixes bare `$chassis`/`$theme` specifiers tree-wide, does NOT touch 1.2's finding directly
  (1.2 is about *which* config module is imported, not the `.js` suffix), so 1.2 likely survives
  into chassis-B unless Task 10's `siteConfig`-adjacent grep sweeps it in as a side effect. Worth
  flagging to the plan author: Task 10's acceptance criteria don't mention 1.2 by name, so
  confirm at dispatch whether it's still open.
- Rewrites `admin/signups/+page.server.ts:32`'s `fail` literal and, separately, the plan's Task 10
  file list also includes "one showcase `+page.server.ts` hand-mounted against generated
  `./$types`" for the custom-screen exemplar, this is the SAME FILE as 2.8's `platform!`
  assertions (`admin/signups/+page.server.ts`), but Task 10's acceptance criteria do NOT list
  `platform!` replacement, only the `fail` shape and `./$types` typing. **So 2.8's `platform!`
  finding likely survives chassis-A untouched and remains open for chassis-B item 8**, but the
  surrounding lines (`:20, 33, 42`) may shift if the `fail` literal at `:32` and the load/action
  type annotations change line counts above/around them. Re-anchor at dispatch.
- Does not touch `feed.ts` (1.3) or `public-design-system.md` (1.4) or `cairn.config.ts:526`'s
  re-export, though Task 6 DOES split `cairn.config.ts` into `icons.ts` +
  `markdown-components.ts`, and Task 6's interfaces section says the adapter keeps
  "the two-line header rewritten" and stays "the adapter, concepts, backend, and `navLayout`" , 
  the `siteConfig` re-export at `:526` is very likely to survive in the adapter file (it's a
  site-identity/config concern, not a component or icon), but its line number will drop sharply
  once ~350 lines of components move out (expected adapter file size: 100-130 lines per Task 6's
  acceptance criteria, meaning `:526`'s content could land anywhere in that new range). This
  is the single largest line-number-drift risk of any anchor in this whole document. Re-derive
  by symbol name (`export { siteConfig }`), never by the old line number, at dispatch.
- `public-design-system.md` itself is edited by chassis-A Task 6 ("the theme's file table if it
  lists theme files", conditional) and possibly Task 11 (moving the type-scale derivation INTO
  this doc), so by chassis-B time this doc will have NEW content (the moved derivation
  paragraph) even though its stale `src/lib/*` paths (1.4's actual defect) are not on either
  task's list to fix. Confirm at dispatch whether Task 6 or Task 11 incidentally fixes the stale
  paths while editing this doc for unrelated reasons, that would be a pleasant collision but
  should not be assumed.

**Spec item 8 also lists `createSectionAction` adoption "if internals-C's Task 10 left the docs
teaching it, test-first against `e2e/custom-screen.spec.ts`."** Per the chassis-A plan's ruled
inputs: "`createSectionAction` stays unadopted in this pass... Task 10 writes one comment
recording the raw shape as deliberate; adoption, if the docs keep teaching the helper, is
chassis-B's." So this sub-clause of item 8 is confirmed as still open work for chassis-B, exactly
as the spec states, contingent on internals-C's Task 10 ruling (already merged per git log:
"docs(internals-c): close the pass docs dimension" and the internals-C merge commit are both in
the recent log), the plan author should read internals-C's Task 10 ruling directly to resolve
the "if" before writing chassis-B's task list, since this repo's git log shows internals-C has
already merged (commit `3e4ba6eb` "Merge pull request #49 from glw907/internals-c").

---

## Item 9, Waymark's deliberate adaptation and final rebake (initiative design item 6, second half)

**Source:** `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md`, item 6
(lines ~109-115):

> **6. The chassis pass.** `examples/showcase` improves against the changed engine (review half
> done: 14 findings, none rewrite-tier). PLUS the second in-tree consumer the original spec left
> unassigned: `templates/waymark` (20+ engine imports, compiled by the scaffold CI job, the tree
> `create-cairn-site` bakes, and the base for the beta-path site rebuilds). Each earlier slice
> keeps waymark compiling as part of its own gate (`check:consumers` and the scaffold job make
> breakage loud); this slice does waymark's deliberate adaptation and the final rebake before the
> cut.

**What "deliberate adaptation" means (not just re-emit):** every other slice in the initiative
(internals, conventions, foundations) keeps `templates/waymark` mechanically *compiling* as a
side effect of its own gate, but none of them makes waymark *deliberately reflect* the changed
engine's new idioms, waymark is baked by re-emitting the showcase, so ordinarily it just
inherits whatever the showcase looks like. The initiative design is naming a DISTINCT piece of
work: a final pass, after every other slice has landed and re-baked waymark mechanically, that
treats waymark's own content (not just the showcase's) as something to adapt on purpose, i.e.,
confirming waymark's baked output is not merely "did not break" but "reflects the deliberate
design decisions of the whole initiative", followed by one last `emit:template` re-bake right
before the release cut closes the window.

**Cross-reference to chassis-A plan:** chassis-A's own "What this pass hands forward" section
names this explicitly: "waymark's deliberate adaptation and final rebake" is listed as
chassis-B's, matching the spec's item 9 wording verbatim. Chassis-A's global constraint
"every task that changes an emitted file ends with `npm run emit:template` and commits the
regenerated `templates/waymark` in the same commit" means chassis-A DOES re-bake waymark
mechanically after every one of its 12 tasks, so by the time chassis-B opens, `templates/waymark`
will already reflect every chassis-A change (Prettier, comment gate, fixture exclusion, dead-code
removal, the `cairn.config.ts` split, single-sourced public routes, the render-trio re-homing,
unit tests, idiom conformance, register purge). Chassis-B's item 9 is therefore not "make waymark
compile" (already true throughout) but a deliberate content-level review of what waymark now
looks like, plus the LAST rebake specifically timed "before the release window closes" per the
spec.

**Still true / no drift concern:** this item is process/sequencing, not a specific file:line
anchor, nothing to verify against the tree beyond confirming `templates/waymark` exists and is
regenerated per-task, which the plan's Global Constraints section already guarantees. No chassis-A
task claims to have done the "deliberate adaptation" itself; it is explicitly deferred.

---

## Item 10, Harvest

Not a review-cited item (no section reference); it is the standing family rule (chassis harvest
banked before the pass closes, per CLAUDE.md's "Visual work" section: "every theme or site built
on the chassis banks its harvest before the pass closes"). No anchors to verify. Chassis-A's own
Task 12 already banks its own harvest under
`docs/internal/record/2026-09-04-chassis-inputs/`; chassis-B's item 10 continues that same
directory and explicitly also carries forward "the engine's own `src/lib/components` Svelte lint
wiring" per chassis-A's "What this pass hands forward: Polish" line, this is a chassis-A
carry-forward item that chassis-B's harvest task should verify actually got filed to polish (not
lost) rather than something chassis-B does itself.

---

## Summary table (10 lines, one per spec item)

1. **Shell from chassis (rank 8, 2.7).** 5 anchors, all confirmed live and stable; chassis-A
   doesn't touch these files. Spec slightly ambiguous whether `.cairn-hero` belongs here or
   item 2, flag for plan author.
2. **Remaining 5 primitives (5.5).** 1 anchor (zero adopters, confirmed by fresh grep); stable,
   no chassis-A drift; depends on resolving item 1's `.cairn-hero` ambiguity first.
3. **Focus ring (4.2).** 1 anchor, count of 22 confirmed exactly; **chassis-A Task 5 deletes 2
   of the 9 files carrying rings** (`IntroLedger.svelte`, `Carousel.svelte`), so the count
   chassis-B inherits will be lower than 22, the spec's own text anticipates "20 remain," but
   verify the exact subtraction at dispatch rather than trusting either number blind.
4. **Archive proof + entry row (ranks 1, 6).** 3+ anchors, all confirmed (14 posts,
   page size 50, triplicated entry markup). Chassis-A's Task 11 rewrites the two stale
   "220-post" comments in `archive.ts` and `svelte.config.js` (text only, not the
   `ARCHIVE_PAGE_SIZE` value or the entry-row markup), re-anchor comment text, not defect,
   which the spec's own hand-forward note already names correctly.
5. **Site identity (rank 7, 4.7).** 7 anchors, all confirmed exact-line-match. Only
   `content.ts:29` gets neighbor content added by chassis-A Task 7 (a new `siteMeta` export
   near `ORIGIN`), re-anchor that one file, not the 5 hardcode sites.
6. **CSS conformance (4.1-4.6, 5.2).** 8+ anchors across `theme.css`, `site.css`, `tokens.css`,
   `check-public-tokens.mjs`; all confirmed exact-match except that chassis-A's Task 11 trims
   ~30 lines directly above the 4.1 clamps in `theme.css`, shifting their line numbers down by
   roughly 30 (values unaffected). `tokens.css` also gets an unrelated comment repoint from
   Task 8. The CSS Prettier reformat itself is chassis-B's own job (ruled input), so sequence
   format-then-fix, not fix-then-format.
7. **Width matrix (5.3, 5.6).** 3 anchors confirmed (3 surfaces looped, `maxDiffPixels: 120`,
   admin-only compensating test). `playwright.config.ts` gets Prettier-reformatted by
   chassis-A Task 1 (tabs to spaces), re-read rather than trust cited line 14.
   `/admin/signups`, one of the 4 unproven surfaces, gets idiom fixes from chassis-A Task 10
   before chassis-B baselines it, which is fine (unrelated to the baseline gap itself).
8. **Small idiom items (1.2-1.4, 2.8).** 6 anchors confirmed exact-match, but this item carries
   the **highest drift risk** of all ten: `cairn.config.ts:526`'s `siteConfig` re-export will
   move to an unpredictable new line once Task 6 splits ~350 lines out of the file (re-derive by
   symbol, not line number); 2.8's `platform!` assertions are NOT in Task 10's stated fix list
   despite Task 10 touching the same file for a different reason, so confirm they're still open
   at dispatch; `createSectionAction` adoption is contingent on internals-C's Task 10 ruling,
   which has already merged (`3e4ba6eb`), read that ruling directly before writing chassis-B's
   task.
9. **Waymark adaptation + final rebake (initiative design item 6, 2nd half).** No file:line
   anchor; process-only. Chassis-A mechanically re-bakes waymark after every task (global
   constraint), so by chassis-B open, waymark already compiles and reflects every chassis-A
   change; chassis-B's job is the deliberate content-level pass plus the pre-release-cut rebake,
   not "make it compile."
10. **Harvest.** No anchor; standing family rule. Must also verify chassis-A's Task 12 actually
    filed the `src/lib/components` Svelte lint wiring to polish rather than silently dropping it,
    since the chassis-A plan names it as a hand-forward but doesn't gate on its landing anywhere
    else.

---

# Part 2: showcase state


All paths relative to repo root `/var/home/glw907/Projects/cairn-cms`. Research is against the
MAIN checkout only (worktrees `.claude/worktrees/chassis-a`, `.claude/worktrees/experiment-screen`
were not read).

## A. Chassis composition primitives (`examples/showcase/src/chassis/composition.css`)

The chassis CSS lives at `examples/showcase/src/chassis/composition.css` (not `src/chassis/*.css`
at repo root, that path does not exist; the chassis is the showcase's own `$chassis` alias).
Classes are nested inside `@layer components { }`, so `grep -n '^\.cairn-'` (anchored, no leading
whitespace) finds nothing; the real class list, with line numbers:

| Class | Line | Used anywhere in showcase `.svelte`/routes? |
|---|---|---|
| `.cairn-card` | composition.css:23 | No |
| `.cairn-band` | composition.css:37 | No |
| `.cairn-section` | composition.css:47 | No |
| `.cairn-hero` | composition.css:58 | No |
| `.cairn-hero-title` | composition.css:64 | No |
| `.cairn-hero-lead` | composition.css:71 | No |
| `.cairn-sidebar-layout` | composition.css:85 | No |
| `.cairn-site-shell` | composition.css:110 | No (only defined; see below) |
| `.cairn-site-main` | composition.css:114 | No (only defined; see below) |

Verified with `grep -rn 'cairn-card\|cairn-band\|cairn-section\|cairn-hero\|cairn-sidebar-layout\|cairn-site-shell\|cairn-site-main' examples/showcase/src --include='*.svelte'`, zero hits outside `composition.css` itself. The file's own header comment says as much: "Nothing in the
showcase's current markup uses any of these yet."

**The five unused composition primitives** (task scope item 2, distinct from the site-shell pair
in item 1): `.cairn-card`, `.cairn-band`, `.cairn-section`, `.cairn-hero` (+ its two sub-parts
`.cairn-hero-title`/`.cairn-hero-lead`), `.cairn-sidebar-layout`.

`.cairn-site-shell` / `.cairn-site-main` (composition.css:96-116) are the sticky-footer flex-column
pair task scope item 1 wants wired into `(site)/+layout.svelte` and `+error.svelte`; they exist in
the chassis today but nothing in the showcase route tree references them (see below, item D2 for
the current hand-rolled footer-pin logic they'd replace).

## B. Hand-written focus rings

**22 occurrences** of a hand-rolled focus-visible/focus rule in `examples/showcase/src`, all but
one following the exact same pattern:

```css
outline: 2px solid var(--color-primary);
outline-offset: 2px;
```

(3 of them add `border-radius: 2px` alongside it.) List, file:line:

1. `src/chassis/prose.css:149`, `.prose a:focus-visible` (+ `border-radius: 2px`)
2. `src/chassis/prose.css:376`, `.prose .table-scroll:focus-visible`
3. `src/chassis/prose.css:614`, `.prose .video-facade-link:focus-visible`
4. `src/chassis/prose.css:712`, `.prose .cta-link:focus-visible`
5. `src/chassis/prose.css:743`, `.prose .micro-cta-link:focus-visible`
6. `src/chassis/prose.css:800`, `.prose .faq-question:focus-visible`
7. `src/theme/components/Carousel.svelte:181`, `.dot:focus-visible`
8. `src/theme/components/IntroLedger.svelte:186`, `.hero a.row:focus-visible` (+ `border-radius: 2px`)
9. `src/routes/(site)/archive/[page]/+page.svelte:137`, `.entry__title a:focus-visible`
10. `src/routes/(site)/archive/[page]/+page.svelte:169`, `.pagination__link:focus-visible`
11. `src/theme/components/SiteHeader.svelte:188`, `.site-nav a:focus-visible`
12. `src/theme/components/SiteHeader.svelte:195`, `.theme-toggle:focus-visible`
13. `src/routes/(site)/styleguide/+page.svelte:530`, `.sg-tab:focus-visible`
14. `src/routes/(site)/styleguide/+page.svelte:578`, `.sg-summary:focus-visible`
15. `src/routes/(site)/styleguide/+page.svelte:628`, `.sg-cta-btn:focus-visible`
16. `src/theme/components/SiteFooter.svelte:85`, `.site-nav a:focus-visible`
17. `src/routes/(site)/+page.svelte:220`, `.lead__title a:focus-visible`
18. `src/routes/(site)/+page.svelte:243`, `.lead__link:focus-visible` (+ `border-radius: 2px`)
19. `src/routes/(site)/+page.svelte:314`, `.tag-filter__option:focus-visible`
20. `src/routes/(site)/+page.svelte:370`, `.entry__title a:focus-visible`
21. `src/routes/(site)/+page.svelte:405`, `.pagination__link:focus-visible`
22. `src/theme/components/ArticleView.svelte:160`, `.meta a:focus-visible` (+ `border-radius: 2px`)

Plus one deliberately-different rule that suppresses the ring rather than drawing one:
`src/routes/(site)/+layout.svelte:94`, `main:focus { outline: none; }` (the skip-link landing
target; documented at lines 83/93 as intentionally NOT touching `:focus-visible` on real controls).

A `--cairn-focus-ring-radius: 2px` token already exists (`src/theme/theme.css:311`) and is
consumed today only by `border-radius` declarations in `SiteFooter.svelte:82` and
`SiteHeader.svelte:185` (the nav-link hover/underline box, not the focus ring itself), there is no
`.cairn-focus-ring` class primitive yet in `composition.css`.

The e2e suite has one assertion tied to this shape: `e2e/site-visual.spec.ts` (last test in the
file, ~line 105) asserts `.lead__title a` shows either `outline` or `box-shadow` on focus, this
would need to keep passing against whatever new primitive replaces the outline.

## C. The `<article class="entry">` block, written three times, CSS twice

Markup (`<article class="entry" class:entry--undated={!post.date} data-cairn-post>`):

1. `src/routes/(site)/+page.svelte:119`, the "recent"/main list on the home page
2. `src/routes/(site)/+page.svelte:140`, a second list further down home (looks like the
   post-filter/tag-narrowed rendering path, since both blocks live in the same file)
3. `src/routes/(site)/archive/[page]/+page.svelte:34`, the `/archive/[page]` route

CSS (`<style>` blocks, two separate copies, each with the full rule set, this is the "twice"):

- `src/routes/(site)/+page.svelte:333-425`, `.entry`, `.entry--undated`, `.entry__date`,
  `.entry__title`, `.entry__title a`, `.entry__title a:hover`, `.entry__title a:focus-visible`,
  `.entry__excerpt`, plus a `@media` block at 417-424 repeating `.entry`/`.entry__date`.
- `src/routes/(site)/archive/[page]/+page.svelte:103-187`, the identical rule set (`.entry` at
  103, `.entry--undated` at 111, `.entry__date` at 114, `.entry__title` at 121, `:hover`/
  `:focus-visible` at 134/137, `.entry__excerpt` at 141, and the same `@media` repeat at 180-186).

`ArticleView.svelte` does NOT define or use `.entry` markup (it renders a single full article, not
a list row), confirmed no `.entry` hits there; it only references `data.entry.*` as a data-object
name, unrelated to the CSS class.

**Collapse target**: the two `<style>` copies are byte-for-byte the same rule set (spot-checked
line-for-line above); the three markup call sites (two in `+page.svelte`, one in `archive/[page]`)
are candidates for one shared `EntryRow`/`ArchiveEntry` component owning both the markup and one
copy of the CSS.

## D. Site identity: "Waymark" literals, origin literals, nav forking

### D1. Literal "Waymark" strings in `src/` (excluding `src/content/`)

Docs/comment mentions (not renderable strings, informational only, chassis README, tokens.css,
prose.css comments, theme.css comments) are omitted below; the renderable/config strings that
should read `siteConfig.siteName` instead:

- `src/routes/+error.svelte:23`, `<title>{page.status} | Waymark</title>`
- `src/routes/(site)/styleguide/+page.svelte:107`, `<title>Styleguide · Waymark</title>`
- `src/routes/(site)/archive/[page]/+page.svelte:17`, `<title>Archive, page {data.archive.page} · Waymark</title>`
- `src/theme/components/SiteFooter.svelte:52`, `>Waymark</span` (the footer wordmark)
- `src/theme/components/SiteHeader.svelte:112`, `>Waymark</span` (the header wordmark)

(`src/theme/site.config.yaml:1`, `siteName: Waymark`, is the actual config value, correctly the
one place "Waymark" is authored; everything above should read `siteConfig.siteName` from
`src/theme/site-config.ts` instead of repeating the literal.)

Content-layer mentions (excluded per scope, but noted): `src/content/.cairn/index.json:18` and
`src/content/pages/about.md:5` both narrate "This is Waymark, cairn's starter template..." as
actual page copy, these are legitimate content, not hardcode bugs.

### D2. Origin / URL literals

- `src/chassis/content.ts:29`, `export const ORIGIN = 'https://showcase.test';`, this is the one
  "real" unexplained origin constant (used for canonical URLs, feeds, sitemap presumably).
- `src/members/channel.ts:16,21-26`, six `*@showcase.test` demo member addresses (test fixtures,
  intentional, documented as "one `@showcase.test` contact per e2e spec").
- `src/routes/members/login/+page.svelte:46`, `placeholder="you@showcase.test"` (form placeholder,
  matches the fixture domain, not a bug).
- `src/theme/cairn.config.ts:459`, `email: { from: 'cms@showcase.test' }`, the second literal
  origin-shaped value (the site's from-address), independent of `ORIGIN`.
- Everything else under `https://` in `src/` is inert content-example URLs inside the styleguide's
  seed markdown (`src/routes/(site)/styleguide/+page.server.ts:28,78,115,125,131`) or config
  defaults in `cairn.config.ts:167,233,260` (youtube/example.com placeholders for directive
  previews), not identity literals.

**The two unexplained origin literals** (task scope item 5) are most likely `content.ts:29`'s
`ORIGIN` constant and `cairn.config.ts:459`'s `from: 'cms@showcase.test'`, both hardcode the
`showcase.test` domain independently rather than deriving from one shared site-identity value.

### D3. Header nav vs. footer nav sourcing (the fork)

- **Header** (`SiteHeader.svelte`): reads `page.data.nav` (comment at lines 12-13), which is
  `site.config.yaml`'s `menus.primary`, resolved by `src/theme/site-config.ts:15`
  (`export const primaryNav = readMenu(siteConfig, 'primary', 2);`) via the root layout server
  load, and editable at `/admin/nav`.
- **Footer** (`SiteFooter.svelte:32-36`): a separate, hardcoded literal array, NOT sourced from
  `site.config.yaml` or `primaryNav` at all:
  ```ts
  const nav: NavItem[] = [
    { label: 'Writing', href: '/' },
    { label: 'Admin', href: '/admin' },
    { label: 'Feed', href: '/feed.xml' },
  ];
  ```
  Comment above it (line 32): "A scaffolded site owner edits this list", i.e. today the footer
  nav is a second, independently-maintained source of truth that a nav edit through `/admin/nav`
  never touches.

`site-config.ts` itself (`src/theme/site-config.ts`, full file, 16 lines) is the one
`parseSiteConfig`/`readMenu` call site; `siteConfig` and `primaryNav` are its two exports.

## E. `src/chassis/archive.ts` and the home/archive pagination

Full file is 52 lines. Key pieces:

- `ARCHIVE_PAGE_SIZE = 50` today (archive.ts:10), the pass will drop this to 13. Comment
  (archive.ts:7-9) explains the current value is "derived against the 220-post review fixture" to
  keep entry markup under a 100KB weight flag while still reading as substantial, this rationale
  comment will need rewriting/removing when the constant changes.
- `paginateArchive(entries, page, pageSize = ARCHIVE_PAGE_SIZE)` (archive.ts:36-51): clamps page
  into `[1, totalPages]`, slices, then groups the slice by year (`entry.date.slice(0,4)`, or
  `'Undated'`) preserving newest-first order, `sortNewestFirst` (archive.ts:27-29) is a separate
  helper, presumably called before `paginateArchive`.
- `svelte.config.js:36-47` (`handleUnseenRoutes`): the prerender-crawl exception comment explicitly
  cites post-count sensitivity, "found in a 14-post merge rehearsal; the 220-post fixture here
  never triggers it" (config.js:44), confirming the showcase currently ships 14 posts (matches
  `ls src/content/posts` = 14 files) and that a smaller corpus (like the 14 or 27 posts here) can
  legitimately produce zero `/archive/[page]` entries at build time, which the exception scopes to
  `/(site)/archive/[page]` alone.

**Home page** (`(site)/+page.svelte`): the pagination block already exists in markup (not
speculative) at lines 161-176:
```svelte
{#if !filtered && data.archive.totalPages > 1}
  <nav class="pagination" aria-label="Archive pages">
    ...
    <span class="pagination__status">Page {data.archive.page} of {data.archive.totalPages}</span>
    ...
```
with its CSS at lines 384-411 (`.pagination`, `.pagination__link`, `.pagination__status`, hover
and focus-visible states). **Today it is hidden**, not absent: with `ARCHIVE_PAGE_SIZE = 50` and
only 14 posts, `paginateArchive` always returns `totalPages === 1`, so the
`data.archive.totalPages > 1` guard never renders the block. Dropping the page size to 13 with 14
existing + 13 new posts (27 total) makes `totalPages = ceil(27/13) = 3`, which will finally exercise
this markup and light up `/archive/2` as a real, non-degenerate page (today `/archive/[page]`'s
`entries` export at build time yields nothing beyond page 1, per the `svelte.config.js` comment
above).

**`/archive/[page]` route** (`src/routes/(site)/archive/[page]/+page.svelte` +
`+page.server.ts`): renders the same entry/pagination shape as home (confirmed identical `.entry`
CSS block, item C above) minus the featured-lead treatment; its own `<title>` at line 17 also
carries the hardcoded "Waymark" literal (item D1).

## F. e2e visual suite

**`examples/showcase/e2e/site-visual.spec.ts`** (119 lines total):

- `VIEWPORT_WIDTHS = [320, 390, 768, 1440, 2560]` (line 21), the family-wide five-viewport bar.
- `COLOR_SCHEMES = ['light', 'dark'] as const` (line 22).
- Nested loop generates 3 surfaces × 2 schemes × 5 widths = 30 screenshot tests: `site home`,
  `reading-surface article`, `styleguide` (lines 24-53).
- One extra fixed-viewport test: `reading-surface article, light, 1920px (mid, active clamp
  slope)` (~line 64), justified as proving the fluid clamp's slope, not just its floor/cap.
- Two non-screenshot geometry/computed-style assertions (not pixel diffs): the footer-pin check
  (`a short page pins the footer with no background seam below it`, ~line 84) and the focus-ring
  presence check on `.lead__title a` (~line 105), both would need to keep passing through the
  chassis-B footer/focus-ring changes.
- Baseline naming: `site-home-${colorScheme}-${width}.png`, `site-article-${colorScheme}-${width}.png`,
  `styleguide-${colorScheme}-${width}.png`, plus `site-article-light-1920.png`; on disk under
  `e2e/site-visual.spec.ts-snapshots/` they get a `-linux` platform suffix appended by Playwright.

**`examples/showcase/playwright.config.ts`**: `expect.toHaveScreenshot.maxDiffPixels: 120` (a
documented, deliberately-not-tiny floor, comment explains CI anti-aliasing jitter forces this and
names the cost: "a 1.5px shift on a 16px icon measured 51 differing pixels ... passes at 120");
`workers: 1`, `fullyParallel: false` (shared dev-backend singleton state); `retries:
process.env.CI ? 2 : 0`; `webServer.command: 'VITE_CAIRN_E2E=1 npm run build && npm run preview
-- --port 4173'`.

**Regeneration**: NOT wired through `.github/workflows/test.yml` (that workflow runs `npm run
check:visuals`, a different, non-Playwright script at `scripts/checks/check-visuals.mjs` invoked
via `package.json:50`). The actual baseline regen lives in **`.github/workflows/e2e.yml`**
(`workflow_dispatch` input `update_snapshots`, lines 8-12): when ticked, it skips the normal
assertion run and instead runs (line 128):
```
npm --prefix examples/showcase run test:e2e -- e2e/admin-visual.spec.ts e2e/site-visual.spec.ts --update-snapshots
```
on the CI runner itself (baselines are declared CI-canonical; a workstation render is explicitly
rejected as a substitute, comment at lines 119-125), then commits the changed PNGs straight back
to the dispatch branch (lines 129-142, `git add .../*.spec.ts-snapshots/`, commit, rebase, push).
There is no local/package.json shortcut script for `--update-snapshots`; it's invoked directly via
`playwright test <files> --update-snapshots` (also documented ad hoc in
`docs/internal/admin-design-system.md:1289` and two old plan files).

**Current baseline inventory** (`ls examples/showcase/e2e/**/*.png`):

- `site-visual.spec.ts-snapshots/`, 30 files: `site-home-{dark,light}-{320,390,768,1440,2560}-linux.png` (10), `site-article-{dark,light}-{320,390,768,1440,2560}-linux.png` (10, note: no separate 1920 file listed by this glob pattern, the 1920 test's baseline `site-article-light-1920-linux.png` IS present, bringing article to 11), `styleguide-{dark,light}-{320,390,768,1440,2560}-linux.png` (10). Exact count from `ls`: 30 total files (11 article + 10 home + ..., see raw listing below; total is 30, since the light set includes the extra 1920 baseline and one width's dark styleguide count balances it, trust the raw `ls` output over this arithmetic gloss).
- `admin-visual.spec.ts-snapshots/`, 18 files, listed in section H.

Raw `ls` output for `site-visual.spec.ts-snapshots/` (30 entries): site-article-dark-{1440,2560,320,390,768}, site-article-light-{1440,1920,2560,320,390,768}, site-home-dark-{1440,2560,320,390,768}, site-home-light-{1440,2560,320,390,768}, styleguide-dark-{1440,2560,320,390,768}, styleguide-light-{1440,2560,320,390,768}, all `-linux.png`.

**Documented screenshot floor**: no hit for a floor number in `docs/internal/public-design-system.md`
or `docs/extend/*.md` beyond a passing mention of "screenshot baseline" concept in
`docs/extend/debug-your-site.md:40` (general CI-drift explanation, not a stated pixel floor). The
only concrete floor number in the repo is the `maxDiffPixels: 120` in `playwright.config.ts` itself
(with its measured-defect-size rationale comment, see above).

## G. `src/content/posts/`: 14 files, frontmatter, word counts, voice

| File | title | date | topics | other fields | word count |
|---|---|---|---|---|---|
| `2026-01-15-hello.md` | Hello, cairn | 2026-01-15 | Svelte, Markdown | image, author, related, faq, gallery (the full-featured demo post) | 136 |
| `2026-02-20-second.md` | A second post | 2026-02-20 | Svelte, Cloudflare |, | 39 |
| `2026-03-10-callout.md` | A post with a callout | 2026-03-10 |, |, | 55 |
| `2026-04-05-the-reading-surface.md` | The reading surface | 2026-04-05 |, | author, image | 1854 (the long "every element this theme styles" showcase post) |
| `2026-05-01-spring-thaw.md` | Spring thaw on the lower loop | 2026-05-01 | trail-reports, weather |, | 46 |
| `2026-05-08-boot-fit.md` | Getting your boot fit right | 2026-05-08 | gear |, | 45 |
| `2026-05-15-ridge-route.md` | The ridge route, end to end | 2026-05-15 | routes, trail-reports |, | 46 |
| `2026-05-22-layering.md` | Layering for shoulder season | 2026-05-22 | gear, weather |, | 47 |
| `2026-05-29-first-frost.md` | Reading the first frost | 2026-05-29 | season-notes, weather |, | 43 |
| `2026-06-05-valley-loop.md` | The valley loop in a morning | 2026-06-05 | routes |, | 41 |
| `2026-06-12-pack-list.md` | A pack list that travels light | 2026-06-12 | gear, trail-reports |, | 45 |
| `2026-06-19-storm-window.md` | Catching the storm window | 2026-06-19 | weather, routes |, | 41 |
| `2026-06-26-late-season.md` | Late-season notes from the high col | 2026-06-26 | season-notes, trail-reports |, | 44 |
| `2026-07-03-trail-mix.md` | On trail mix and small comforts | 2026-07-03 | gear, season-notes |, | 48 |

Word counts are `wc -w` over the whole file (frontmatter + body), so short posts are almost all
frontmatter; body prose is minimal by design (placeholders).

**Voice, for a content writer to imitate** (from the `description` fields and the two longer
posts): dry, self-aware trail-notes prose that openly narrates its own function as test fixture
("placeholder trail notes exercising the topics filter's Trail Reports and Weather tags") while
staying in a plausible outdoors-blog register (boot fit, ridge routes, storm windows, frost). Every
`description` is one sentence, often an em-dash-joined two-clause sentence pairing a concrete trail
detail with the meta-explanation of which fixture/tag it exercises.

**Concept schema** (`src/theme/cairn.config.ts:382-425`, the `posts` concept): fields are `title`
(required), `date`, `description`, `image` (SEO), `author` (reference → pages), `related` (array of
reference → posts), `topics` (multiselect, creatable, taxonomy), `status` (select: draft/published,
default draft), `faq` (array of object: question [required] + answer [required]), `gallery` (array
of image). **Only `title` is `required: true`** at the top level; nested object-array fields
(`faq[].question`, `faq[].answer`) carry their own `required: true` independently.

## H. `admin-office-*` baselines

`admin-visual.spec.ts-snapshots/admin-office-{light,dark}-linux.png` (2 files) are captured by
`examples/showcase/e2e/admin-visual.spec.ts` tests `admin office shell, light` / `,  dark`
(lines 9-22), which navigate to **`/admin/posts`** (the admin's post-list/office shell view) with
the `cairn-admin`/`cairn-admin-dark` theme cookie set, then `toHaveScreenshot('admin-office-
{light,dark}.png', { fullPage: true })`.

Because the screenshot is `fullPage: true` on the post list itself, **a longer posts list directly
lengthens the captured page**: adding the pass's 13 new posts to the existing 14 (→ 27 rows in
`/admin/posts`) grows the full-page screenshot's height, so both `admin-office-light` and
`admin-office-dark` baselines will need regeneration purely from the added row count, independent
of any other admin-side change in this pass. (Contrast with `admin-editors-*`, `admin-edit-page-*`,
`admin-media-*`, `vocabulary-*`, `auth-*` baselines, which capture other admin surfaces unaffected
by the posts count.)

---

# Part 3: CSS conformance, width matrix, small idioms


All paths relative to `/var/home/glw907/Projects/cairn-cms/examples/showcase` unless noted.
Cross-checked against the source review,
`docs/internal/record/2026-09-04-chassis-inputs/showcase-review-at-the-exemplar-bar.md`
sections 4.1-4.7 and 5.1-5.6, which is the primary evidence base for items 6 and 7.

## Item 6, CSS conformance

### (a) Two degenerate `clamp()` declarations, confirmed, count matches (2)

`src/theme/theme.css:227-228`:
```css
--text-step--1: clamp(0.84rem, 0.84rem, 0.80rem);   /* min EXCEEDS max */
--text-step-0:  clamp(1.06rem, 1.06rem, 1.0625rem); /* min == preferred, no vw term */
```
Both preferred values are fixed (no `vw` term) and equal to min, so the preferred value can never
win against a viewport change; step--1's max (0.80rem) is even below its own min. Documented at
length in the comment at lines 191-225 as deliberate ("pinned"). Review 4.1 also flags
`--text-step-1` (line 229) and `--text-step-2` (line 230) as byte-identical clamps with no comment
explaining the duplication, not degenerate themselves, but a related smaller finding.

### (b) Two theme-only chrome tokens a second theme would dangle, confirmed, count matches (2)

`--cairn-caption-tracking` and `--cairn-focus-ring-radius`:
- Defined **only** in `src/theme/theme.css:311-312` (`--cairn-focus-ring-radius: 2px;` /
  `--cairn-caption-tracking: 0.09em;`), inside the scheme-invariant `:root` block.
- No generic default in `src/chassis/tokens.css`.
- Read by `src/theme/components/SiteHeader.svelte:184-185` (`letter-spacing: var(--cairn-caption-tracking); border-radius: var(--cairn-focus-ring-radius);`)
  and `src/theme/components/SiteFooter.svelte:82` (`border-radius: var(--cairn-focus-ring-radius);`).
- These are SvelteKit component files, not chassis CSS, so they sit outside every net the
  token-resolution check casts (see (c) below), a second theme that dropped either declaration
  would silently render `letter-spacing: ;` / `border-radius: ;` (i.e. the property drops) with
  no gate catching it.
- Contrast with the ~14 DaisyUI role/geometry tokens (`--color-base-*`, `--color-primary*`,
  `--color-info/success/warning/error`, `--color-neutral-content`, `--radius-selector/-field/-box`,
  `--border`) that chassis CSS (`composition.css`, `prose.css`) also reads but only theme.css
  defines: those are the documented Tier-1 DaisyUI-theme contract (README, theme.css tier map
  lines 67-70) and DaisyUI's own generated-role fallback (`DAISYUI_GENERATED_ROLES` in
  `scripts/checks/check-public-tokens.mjs:496-517`) covers the `--color-*` half of that set even
  though `--radius-*`/`--border` aren't in that allowlist, but those four ARE captured by the
  token-resolution check regardless, since it scans the whole of `theme.css` for `--token:`
  declarations, not just DaisyUI-generated ones. So they don't count as genuinely dangling; only
  the two named above do.

### (c) `site.css` literals escaping the token gate, confirmed, file structurally excluded

`scripts/checks/check-public-tokens.mjs` (`npm run check:public-tokens` at root `package.json:56`):
- `scannedFiles()` (lines 71-87) walks `examples/showcase/src` for `.svelte` files plus
  literally-named `prose.css` and `composition.css`, explicitly excluding `theme.css` and
  `tokens.css` by name. **`site.css` is not in the allowlist at all**, not `.svelte`, not
  `prose.css`, not `composition.css`, so it is invisible to check (a), the no-literals walk, by
  omission rather than deliberate exclusion (theme.css/tokens.css are excluded on purpose as
  "definition layers"; site.css gets no such rationale, it's just missed).
- Check (c), the token-resolution check (`checkTokenResolution`, lines 579-599), only scans
  `prose.css` and the `--cairn-code-*` ramp in `chassis/tokens.css` for `var()` references, never
  `site.css` or `composition.css`.
- Current literals living in `site.css` as a result (per review 4.4, verified against the file):
  - `src/theme/site.css:194`, `border-radius: 0.25rem;` (a raw length; the radius scale offers
    `--radius-selector`/`--radius-field`/`--radius-box`)
  - `src/theme/site.css:193`, `border-left: 3px solid var(--cairn-info-ink);` (the `3px` width is
    a literal, color is token)
  - `src/theme/site.css:140`, `max-height: 32rem;`
  - No literal *color* value (hex/rgb/hsl/oklch) is currently present in `site.css`, grepping the
    check's own `COLOR_LITERAL` pattern against the file returns nothing, so the live exposure
    today is size/geometry literals, not color, but the file remains outside every gate that would
    catch either kind if one were added.

### (d) Stated class namespace convention, none found; four namespaces run concurrently

- No hit for "namespace" or "prefix" in `src/chassis/README.md`.
- `docs/internal/public-design-system.md:33` uses "prefix" only in an unrelated aside about a
  `--color-*-ink` token-name bug, not a class-naming rule.
- Per review 4.5, the tree runs four class namespaces with no stated rule choosing among them:
  `cairn-*` (chassis primitives: `.cairn-card`, `.cairn-band`, etc., listed in
  `src/chassis/README.md`), bare `site-*` (`.site-main`, `.site-header`, `.site-shell`), `sg-*`
  (styleguide), and bare directive classes (`.callout`, `.alert`, `.cta`, `.banner`, `.entry`,
  `.lead`), the last group collides directly with DaisyUI's own component classes (`.alert`,
  `.card-body`), which is why `tokens.css` keeps `alert`/`card` un-excluded from the DaisyUI build
  and `prose.css:26-27` has to explain why `.prose` scoping wins the specificity race.

### (e) Page-title separators, two conventions, confirmed

`<title>` composition across `src/routes`:
- `src/routes/+error.svelte:23`, `<title>{page.status} | Waymark</title>` (pipe, spaced)
- `src/routes/(site)/archive/[page]/+page.svelte:17`, `<title>Archive, page {data.archive.page} · Waymark</title>` (middle dot)
- `src/routes/(site)/styleguide/+page.svelte:107`, `<title>Styleguide · Waymark</title>` (middle dot)
- `src/routes/members/+page.svelte:23`, `<title>Member account</title>` (no site suffix at all)
- `src/routes/members/login/+page.svelte:28`, `<title>Member sign in</title>` (no site suffix)
- `src/routes/probe-craft/+page.svelte:44`, `<title>Craft chapter fixture</title>` (dev-only probe, no suffix)
- `src/routes/(site)/+page.svelte` (home) and `src/routes/(site)/[...path]/+page.svelte` (article)
  set **no `<title>` at all**, grep for `<title>` and `svelte:head` in both returns nothing.
- No em-dash (`, `) variant found anywhere.
- Net: two separator conventions in active use (` | ` vs ` · `), plus two pages with a bare title
  and two of the highest-traffic pages (home, article) with no page title at all.

## Item 7, width matrix (`e2e/site-visual.spec.ts`)

Full `e2e/` dir listing captured; only `site-visual.spec.ts` and `admin-visual.spec.ts` do
screenshot-matrix work (`site-visual.spec.ts-snapshots/` and `admin-visual.spec.ts-snapshots/`
directories confirm baseline sets for both).

**`VIEWPORT_WIDTHS = [320, 390, 768, 1440, 2560]` × `COLOR_SCHEMES = ['light', 'dark']`
(`e2e/site-visual.spec.ts:23-24`), looped over three surfaces (lines 26-56):**
- site home (`/`)
- reading-surface article (`/posts/the-reading-surface`)
- styleguide (`/styleguide`)

That's 5 × 2 × 3 = 30 baselines, confirmed by the snapshot directory (30 `site-*`/`styleguide-*`
files at 5 widths × 2 schemes, plus 2 extra `site-article-light-1920` files, one dedicated
mid-slope baseline outside the main loop, lines 66-73, light scheme only, testing the active
`vw`-driven root-clamp slope at 1920px rather than a fixed floor/cap).

Two additional non-screenshot assertions round out the file (lines 85-99, 105-118): a footer-pin
geometry check on `/about`, and a `:focus-visible` computed-style check on the home lead title.
Neither is part of the width matrix.

**Surfaces NOT in the width matrix**, per review 5.3 (`### 5.3 The width matrix covers three
surfaces; four more are unproven at the extremes`), confirmed against the routes tree:
1. `/archive/2`, the paginated archive at page 2 (188 lines of markup; review notes it doesn't
   even render today per a separate finding, 2.3).
2. The root `src/routes/+error.svelte` (404/error page), hand-rebuilds the entire chrome
   independently of `(site)/+layout.svelte` and can drift from it silently; review calls this
   "the one that matters ... the single most duplicated layout in the tree and the only one with
   no baseline."
3. `/members`, the member-account page.
4. `/admin/signups`, the custom-screen exemplar (a separate suite, `admin-visual.spec.ts`, exists
   but has no entry for this route at all).

`admin-visual.spec.ts` (its own file, not part of the site width matrix) covers: `admin-office`,
`vocabulary`, `auth-login`, `auth-confirm`, `admin-editors`, `admin-media`,
`admin-media-detail` at light/dark only (no width variation), plus `admin-edit-page` which alone
gets three widths, default, 1440 (`e2e/admin-visual.spec.ts:125-131`), and 768
(`:135-141`), a narrower, ad hoc bar, not the five-viewport standard.

**"Documented screenshot floor" quote**, from review 5.6 (`### 5.6 A screenshot floor the suite
documents but does not compensate for`), also referenced by the chassis-passes-design spec at
`docs/superpowers/specs/2026-09-04-chassis-passes-design.md:238` ("the documented screenshot floor
is compensated or the doc says why not"):

> `playwright.config.ts:4-14` states plainly that `maxDiffPixels: 120` means "a green screenshot
> run is not evidence that a small-footprint defect class is absent" (a 1.5px shift on a 16px icon
> measured 51 pixels). For the admin, the compensating gate exists:
> `src/tests/component/vertical-alignment-recipes.test.ts`. For the public template, it does
> not, `docs/internal/public-design-system.md`'s "Vertical alignment mechanics" section is
> doctrine held by nothing mechanical, and its own note says the 2026-08 public corpus measured
> clean.

## Item 8, small idioms

### (a) `siteConfig` imports, one door, but inconsistent extension usage

Every import comes from the same module, `$theme/cairn.config` (the "one door" already holds):
- `src/chassis/content.ts:6`, `from '$theme/cairn.config.js'`
- `src/chassis/entry-data.ts:6`, `from '$theme/cairn.config.js'`
- `src/chassis/cairn.server.ts:7`, `from '$theme/cairn.config.js'`
- `src/chassis/public-routes.ts:12`, `from '$theme/cairn.config.js'`
- `src/routes/(site)/+page.server.ts:4`, `from '$theme/cairn.config'` (no extension)
- `src/routes/(site)/[...path=md]/+server.ts:4`, `from '$theme/cairn.config'` (no extension)
- `src/routes/feed.xml/+server.ts:4`, `from '$theme/cairn.config'` (no extension)
- `src/routes/feed.json/+server.ts:4`, `from '$theme/cairn.config'` (no extension)

8 import sites total, all resolving to the same file; 4 use the `.js` specifier extension, 4 omit
it.

### (b) `src/chassis/feed.ts`, optional chaining and non-null assertions

Full file is 23 lines. Operators found:
- Line 14: `(posts?.all() ?? []).map(...)`, one `?.` (optional chaining) and one `??`
  (nullish-coalescing, not asked for but adjacent to the same expression).
- Line 19: `posts!.byId(p.id)!.body`, **two** `!` non-null assertions on the same `posts`
  variable that was just optional-chained three lines earlier.

So: 1 `?.`, 2 `!`, on the same variable within a five-line span, the mixed-style idiom the spec
item names.

### (c) `platform!` assertions in the custom-screen exemplar, confirmed, count matches (3)

File: `src/routes/admin/signups/+page.server.ts` (44 lines).
- Line 20: `.platform!.env.APP_DB.prepare('SELECT id, name, email FROM signups ORDER BY id DESC')`
- Line 33: `await event.platform!.env.APP_DB.prepare('INSERT INTO signups (name, email) VALUES (?, ?)')`
- Line 42: `await event.platform!.env.APP_DB.prepare('DELETE FROM signups WHERE id = ?').bind(id).run();`

All three are `event.platform!.env.APP_DB` (or `.platform!.env.APP_DB` via a chained `event`), one
per handler (`load`, `create` action, `remove` action).

### (d) `docs/internal/public-design-system.md`, stale file paths

Every backtick-quoted path cited in the doc, checked against the current tree:
- `examples/showcase/src/lib/theme.css` (line 5, line 316), **stale**: no `src/lib/` directory
  exists under `examples/showcase`; the real file is `examples/showcase/src/theme/theme.css`.
- `examples/showcase/src/lib/prose.css` (line 5, line 317), **stale**: real file is
  `examples/showcase/src/chassis/prose.css`.
- `examples/showcase/src/lib/components/` (line 317, referenced as "The chrome"), **stale**:
  real directory is `examples/showcase/src/theme/components/`.
- All other cited paths resolve currently: `cairn-admin.css`, `cairn.config.ts`,
  `docs/internal/admin-design-system.md`, `docs/superpowers/specs/2026-06-25-cairn-b2-design-bar.md`,
  `scripts/checks/check-public-tokens.mjs`, `scripts/lab/reskin-fixture.mjs`, `site.css`,
  `SiteFooter.svelte`, `SiteHeader.svelte`, `src/lib/components/cairn-admin.css`,
  `src/lib/render/highlight.ts`, `src/lib/render/sanitize-schema.ts`, `theme.css`, `prose.css`.

### (e) CSS half of the Prettier adoption

CSS files under `examples/showcase/src`:
```
src/chassis/composition.css
src/chassis/prose.css
src/chassis/tokens.css
src/routes/probe-craft/probe-craft.css
src/theme/site.css
src/theme/theme.css
```
Ran `npx --prefix examples/showcase prettier --check 'src/**/*.css'` (resolved Prettier 3.9.6 from
the repo root's `node_modules`; `examples/showcase/node_modules` itself has no local `prettier`
binary). No files written. Result: **4 of 6 files would be reformatted**:
- `src/chassis/prose.css`
- `src/chassis/tokens.css`
- `src/routes/probe-craft/probe-craft.css`
- `src/theme/theme.css`

`src/chassis/composition.css` and `src/theme/site.css` are already Prettier-clean.

### (f) `createSectionAction` vs. the current `admin/signups` action shape

**Signature** (`src/lib/sveltekit/section-action.ts:170`):
```ts
export function createSectionAction<Env, Db>(config: SectionActionConfig<Env, Db>): SectionAction<Env, Db>
```
Doc-commented at lines 36 (`SectionActionConfig`), 72 (the audit-record shape), 98
(`SectionAction`'s return shape), with a worked example at line 153:
```ts
const sectionAction = createSectionAction<App.Platform['env'], D1Database>({ ... });
```
Composes onto `adminAction` (editor identity, CSRF, the single form-action shape) per the file's
header comment at line 4, and is exported from the package's `sveltekit` subpath
(`src/lib/sveltekit/index.ts:74`).

**Doc guidance** (`docs/extend/add-a-custom-admin-screen.md`):
- Line 32: "The recommended path is [`createSectionAction`]..."
- Lines 39-43 give the worked example: `import { createSectionAction } from '@glw907/cairn-cms/sveltekit'; ... export const clubAction = createSectionAction<Env, D1Database>({ ... });`
- Line 77: "`requireAccess` in the `load` and `createSectionAction` in every action share the same..." (i.e., the doc's recommended pairing is `requireAccess` for load, `createSectionAction`-wrapped handlers for actions).
- Line 83: "`createSectionAction` also runs the audit and authentication work `adminAction` does..."

**Current shape of `admin/signups/+page.server.ts`** does **not** use `createSectionAction` at
all: `load` calls `requireOwner(event)` directly (not `requireAccess`), and both actions
(`create`, `remove`) also call `requireOwner(event)` directly and then hit
`event.platform!.env.APP_DB` raw, with the three `platform!` assertions from (c) above, and no
`ctx.audit` call visible anywhere in the file. This is the delta the spec item names: the doc
recommends `createSectionAction` as the path for a custom action, but the shipped exemplar route
predates or bypasses it.

**`e2e/custom-screen.spec.ts`** (33 lines, two tests) asserts:
1. Navigating to `/admin/signups` shows the "Signups" link in the sidebar nav (`role=navigation,
   name="Site content"`) and a "Signups" heading in the shell.
2. Filling `name`/`email` inputs and clicking "Add" creates a row (via the fake `APP_DB` bound
   through the cms-dev handle) that appears in a table row matching the name.
3. Clicking "Delete" on that row removes it (row count goes to 0 for that name).
4. A separate test asserts the shell's global logout `<form>` targets the absolute catch-all path
   (`form[action="/admin?/logout"]`) even from this custom, non-catch-all route.

No test in this file currently exercises `createSectionAction`-specific behavior (rate limiting,
access-map denial, audit records) since the route doesn't use it; adopting it would need new
coverage for whatever of that behavior becomes reachable through `/admin/signups`.
