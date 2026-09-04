# Chassis passes design (audit remediation, slices 8 and 9)

**Status:** ratified in brainstorm 2026-09-04 (Geoff); revised the same day after a three-lens
adversarial review (grounding, risk, hygiene and sizing) whose corrections are folded below and
whose report is banked with the inputs. Plans follow through `writing-plans`, chassis-A first,
chassis-B authored after A lands.

**Numbering.** STATUS numbers the slices as executed (internals-B is 6, internals-C is 7, so
chassis-A and chassis-B are 8 and 9). The 2026-08-27 initiative design numbers the chassis pass
as its item 6; this document says "the initiative design's item 6" whenever that is meant.

**Inputs.** The fresh showcase review at the exemplar bar (2026-09-04, Opus, read-only; ten
ranked findings on top of the recorded fourteen, every recorded item verified still open), the
compiled chassis inputs (every item routed to chassis by ROADMAP, STATUS, the internals,
internals-B, and internals-C plans, the rulings ledger, the any-site audit record, and the
harvest records), and the spec review. All three are banked at
`docs/internal/record/2026-09-04-chassis-inputs/` (`showcase-review-at-the-exemplar-bar.md`,
`routed-inputs.md`, `spec-review.md`). That directory is the chassis-inputs record internals-C's
Task 10 names. The recorded fourteen are
`docs/internal/record/2026-08-26-any-site-audit/int-rank-site-chassis.md`.

## What the review found

`examples/showcase` is the chassis: the seed every theme copy and the `templates/waymark`
scaffold descend from. The scaffold is emitted wholesale by `scripts/build/emit-template.mjs`,
composed by `packages/create-cairn-site/scripts/emit-template-dir.mjs`, and baked by
`packages/create-cairn-site/scripts/bake-template.mjs`. The standing mandate (Geoff, 2026-09-01)
is that the chassis sets the code bar, so its quality bar equals the engine's, every line
copy-paste-taught exemplar code.

The tree is closer to that bar than its finding count suggests, and it fails in one specific
way. The showcase carries three jobs at once: exemplar template, engine e2e fixture, and design
scratchpad. Only the first is stated. Every top-ranked finding is one of the other two leaking
into the first. A design-acceptance fixture route with deliberate defects and an e2e sentinel
value are emitted into every scaffolded site. Pass codenames sit in a stylesheet header.
Test-coverage rationales annotate a content model. A script's own header says it should be
gone. The second cause is that the exemplar does not use its own chassis: zero of seven
composition primitives appear in any markup, the shell is hand-rolled beside a comment
admitting the chassis bakes it, and the focus ring is written 22 times across nine files.
Nothing needs rearchitecting. The chassis/theme split is real and gate-enforced, the `$chassis`
and `$theme` aliases make the boundary visible, and the five-viewport matrix is a real gate.

The one structural gap is that no linter or formatter runs on the showcase. The root `lint`
script and `check-comments.sh` both hardcode `src/lib`, the ESLint comment globs are `.ts`
only, no Svelte parser is installed, and no Prettier config exists. Every register fix there
drifts again.

## Two organizing rules

The passes work under two rules rather than a flat finding list:

1. **The fixture job is marked or excluded.** Anything in the tree that exists for the engine's
   tests or the design probes is either excluded by path (`.cairn-template.json` removes the
   file from the emitted set) or marked by the `cairn-template:exclude-start`/`-end` line
   markers (which remove lines from a kept file; `wrangler.jsonc:44-55` is the worked example
   that keeps the stripped file syntactically whole). Exclusion is the default; markers are for
   a file the scaffold needs in part. The committed template always equals a fresh bake
   (`check:template` diffs the two), so an unmarked fixture becomes visible as a
   `templates/waymark` diff in review, and the scaffold CI job additionally asserts that named
   fixtures are absent from a scaffolded tree.
2. **The exemplar uses the chassis it ships.** A primitive the chassis provides is used by the
   showcase's own markup, rendered, baselined, and proven at 320 and 2560. A device with one
   source (the focus ring, the shell, the site name) has one source.

## Decisions ratified 2026-09-04, as revised by the review

- **Two passes.** Chassis-A is structural; chassis-B makes the exemplar use its chassis.
  Polish follows B. One plan of the whole would double mid-flight.
- **Fixtures stay in-tree, excluded or marked**, per rule 1. The fixtures themselves stay in
  the showcase, so the engine's e2e suites are untouched (the leak-sentinel e2e keeps asserting
  `cairn-showcase-site-layout` on the showcase; only the emitted copy loses it, and the
  craft-chapter acceptance protocol keeps driving `src/routes/probe-craft/` by path). A separate
  fixture site was rejected as a second site to install, build, and baseline.
- **Prettier ships in the chassis; the engine keeps its own gates.** Prettier config and
  `format`/`format:check` scripts live in the showcase and therefore in the scaffold, since the
  emitted site is the developer's own repo and `sv create` offers the same choice; engine gates
  never depend on the scaffold's formatter. The config is pinned here so the task is sized
  honestly: `printWidth: 100`, `singleQuote: true`, `useTabs: false`, `trailingComma: 'all'`,
  `prettier-plugin-svelte`. Measured against the tree, 68 of 100 showcase source files
  reformat at width 100, so the adoption is a whole-showcase rewrap and lands as chassis-A's
  FIRST commit, reviewed as a mechanical change, so every later diff is clean. The engine's own
  indentation gate, `check:idioms` (born in internals-C Task 2, scoped to `src/lib` and
  `scripts`), stays the engine's only formatting enforcement; the two do not overlap, and on the
  one axis both police (tabs) they agree. The scaffold's format check runs in the engine's own
  gate over the showcase; in the scaffold CI job it runs only after the bake's generated files
  (`SITE_README`, the dev shim, the rewritten `package.json`, marker-stripped files) are either
  formatted by the bake or listed in the emitted `.prettierignore`; the plan says which.
- **Lint reaches the showcase in two halves.** The engine's comment gate (`eslint-plugin-tsdoc`,
  `eslint-plugin-jsdoc`, `jsdoc/informative-docs`, the em-dash ban) runs over
  `examples/showcase/src/**/*.ts` through `lint` and `check-comments.sh`, which today hardcode
  `src/lib`. The `.svelte` half wires `svelte-eslint-parser` and `eslint-plugin-svelte` scoped to
  `examples/showcase/src/**/*.svelte` (the engine's own `src/lib/components` stays unwired and is
  filed to polish). CSS comments (the theme's derivation narrative) and string residue are swept
  by hand, since no linter reads them.
- **The archive is proven by growing the corpus.** The exemplar's tag filter renders only when
  the home page holds more than 12 entries, and the home page paginates the corpus minus one
  featured entry, so a page size under 13 kills a taught feature and fails `tag-filter.spec.ts`.
  The corpus grows from 14 to 27 posts and `ARCHIVE_PAGE_SIZE` becomes 13: page one keeps 13
  entries (the tag filter and the home baseline are unchanged) and `/archive/2` exists, is
  prerendered, and enters the visual matrix. This amends the brainstorm's "5 or 6" figure on the
  reviewer's arithmetic.
- **The `handleUnseenRoutes` exception stays.** It is not showcase dead weight. A scaffolded
  site whose owner trims the sample posts below one page has an archive `entries()` of `[]`,
  and without the exception SvelteKit's unseen-route check fails the build. The exception is the
  starter's affordance for the small corpus every new site passes through; its stale 220-post
  comment is rewritten to say that. This amends the brainstorm's "drop the exception".
- **Render trio re-homing shape.** The three retire rulings (`audit-render-cardshell`,
  `audit-render-iconspan`, `audit-render-headrow`) require re-home, template rebake, guide
  rewrite, and engine deletion in one change. The shape: `headRow` (the only real logic)
  becomes a chassis-local export in `src/chassis/render.ts`; `cardShell` and `iconSpan` are
  inlined at their single call sites (`iconSpan` into `makeIconRenderer`, `cardShell` into the
  `alert` component); `configure-rendering.md` rewrites its worked example against plain `h()`,
  which eight of nine showcase components already use. The trio and its `authoring.ts` barrel
  line leave the engine, together with the four engine test files that name them, the two
  reference pages, the `src/lib/index.ts` comment, and the `NARRATIVE_CONTEXT_ALLOWLIST` entry in
  `scripts/checks/reference-coverage.mjs` (under `check:reference`) with the two unit tests that
  pin it. `/render` survives as a type-only subpath (its remaining export is `ComponentContext`)
  with its barrel header rewritten to say so, and `docs/reference/render.md` keeps the emitted
  class registry internals-C's Task 4 places there. All four production sites import at least
  two of the three, so the `Consumers must:` line hands each site the replacement: the chassis
  `render.ts` shape and the inline forms of `cardShell` and `iconSpan` verbatim, with the note
  that the emitted class names are `cairn-*` after internals-C. The chassis README's
  component-grammar paragraph gains the new export.
- **Release.** ONE cut after polish (Geoff, 2026-09-01), not after chassis as the 2026-08-27
  initiative design still says (STATUS calling it "amended" is stale); chassis-A amends that
  spec's item-6 and publish paragraphs.

## Chassis-A: structural (slice 8)

Branches off `main` after internals-C merges (its Task 4 renames the emitted `ec-*` classes and
re-emits the template; chassis-A inherits `cairn-*`). Worktree `.claude/worktrees/chassis-a`.

**Execution shape.** Sequential, one worktree. `check:template` diffs the committed
`templates/waymark` against a fresh bake, so every task that touches an emitted file ends with
`npm run emit:template` and a commit of the regenerated tree; the template is the contended
resource and parallel chains do not exist for this pass. Every task's gate is the showcase's own
lint, format check, unit, and e2e suites plus the engine's `check:chassis-boundary`,
`check:public-tokens`, `check:template`, `check:consumers`, `check:reference`, and the scaffold
CI job; the from-scratch showcase install rule from `cairn-pass` applies at pass end.

Tasks (the plan fixes the steps):

1. **Prettier adoption and the tab fixes.** The pinned config, `.prettierignore`, the scripts,
   the whole-showcase reformat as the first commit, `playwright.config.ts` and the three
   tab-indented e2e specs, the scaffold's format check with the bake-artifact answer above.
2. **The comment gate reaches the showcase.** Both halves of the lint decision; the findings the
   extension surfaces are fixed in the same task; if they exceed one task's scope, the remainder
   is recorded at the checkpoint as a named follow-on rather than lowering the bar.
3. **Fixtures out of the scaffold.** `src/routes/probe-craft/` and `(site)/+layout.server.ts`
   excluded by path (the layout load exists only for the sentinel, so exclusion beats a marker
   that would leave a vacuous exported `load`); the fixture convention stated in the showcase
   README; `docs/extend/what-the-scaffold-wrote.md` loses its `probe-craft/` tree line and
   public-routes row; `.github/workflows/create-site.yml`'s leftover assertion gains
   `src/routes/probe-craft` and the string `siteLayoutSentinel`; re-emit. Recorded rank 2.
4. **Dead code out.** `IntroLedger.svelte` and `Carousel.svelte` (464 unimported lines, each
   carrying one of the 22 focus rings) and `scripts/reference-capture.mjs`, whose header says it
   was to be deleted (under the excluded `scripts/`, so hygiene rather than a leak);
   `what-the-scaffold-wrote.md` stops describing the two components as registered. Recorded
   rank 5, review 2.6.
5. **`cairn.config.ts` split.** The icon set and the nine `defineComponent` declarations move to
   their own theme modules; the adapter file keeps adapter, concepts, backend, and `navLayout`
   under a true header; the `$theme` self-import residue goes. Pure move, no rendered change.
   Recorded rank 10, review 2.1.
6. **Archive proven.** Thirteen new posts written to the showcase's content guide,
   `ARCHIVE_PAGE_SIZE` 13 with its derivation comment rewritten, `/archive/2` baselined at the
   five viewports in both schemes, the `svelte.config.js` exception comment rewritten,
   `sortNewestFirst` removed with the engine's newest-first ordering for dated concepts
   documented as a contract in `docs/reference/delivery.md` in the same task. The entry-row
   extraction and the CSS de-duplication move to chassis-B (they change rendered output).
   Recorded ranks 1 and 11.
7. **Single-source public routes.** The `[...path=md]` twin route and the `feed.xml`/`feed.json`
   handlers consume the chassis `PublicRoutesConfig` instead of retyping it. Recorded rank 3.
8. **Render trio re-homing** per the decision above, one change, ledger rows closed with the
   seam-fit line, `Consumers must:` and migration note carrying the replacement code.
9. **Showcase unit tests.** A standalone vitest config inside `examples/showcase` (not a project
   in the engine's root config) with a `test:unit` script, covering the chassis's pure logic
   (`paginateArchive`, `formatDate`, `isBannerExpired`, `isAdminHref`, and what task 5 exposes).
   The script, the devDependency, and the test files ship to the scaffold on purpose: a
   scaffolded site inherits the chassis logic and should inherit its tests. Recorded rank 4.
10. **Idiom conformance.** Import specifiers one way (`.js`) across `$chassis`/`$theme`; route
    handler and error idioms one way; the `fail` literal onto the sanctioned shape; the
    `cairn-cms:` header prefix on every chassis module; the `../../members` traversals left as
    they are, recorded as fixture-only (a `$members` alias would ship a dangling pointer into
    every scaffold); the hand-mounted `+page.server.ts` against generated `./$types`
    carry-forward closed; the `createSectionAction` showcase half conditional on internals-C's
    Task 10 ruling (adopt it in `admin/signups` if the docs keep teaching it, otherwise keep
    the raw shape and say so), reconciled at dispatch. Recorded ranks 9, 12, 13, 14b-d; audit
    finding 8's showcase half.
11. **Register purge of shipped exemplar comments.** Pass and plan citations, history narration
    about code no longer present, the derivation narrative in `theme.css`, the `@component`
    blocks past the standard's length, the `ec-*` residue the rename steps over. Review 3.1 to
    3.6. The `.ts` half is gate-enforced after task 2; the CSS and string halves are hand-swept.
12. **Records.** The spec-review findings that name docs (`what-the-scaffold-wrote.md`,
    STATUS's stale "amended"); the initiative design amended on the release ruling; the
    rulings ledger closed for the trio; `ROADMAP.md`'s chassis improvement round marked done
    for what shipped, with the rest carried to chassis-B by name; the harvest banked.

Ceiling 6.5M (twelve tasks with a heavier gate than internals-C's, at the observed 0.3M to
0.55M per task); checkpoints at 4, 8, 12; the three-lens adversarial plan review before
approval; authorship of task 10's conditional is reconciled against internals-C's Task 10
output at dispatch, so the plan can be written before C lands.

## Chassis-B: the exemplar uses its chassis (slice 9)

Branches off `main` after chassis-A merges. Worktree `.claude/worktrees/chassis-b`. This is
visual work: the `visual-fidelity` skill governs it (reference capture before the build, the
fresh-context `visual-verifier` gate, the one-check deploy rule, the five-viewport standard).

Scope:

1. **The shell from the chassis.** `(site)/+layout.svelte` and `+error.svelte` use
   `.cairn-site-shell`/`.cairn-site-main`; the triplicated gotcha prose collapses to the one
   place the chassis states it. Recorded rank 8, review 2.7.
2. **The remaining five composition primitives used and proven.** Each appears in showcase
   markup, is baselined, and is proven at 320 and 2560. Review 5.5.
3. **One focus ring.** A chassis primitive replaces the 20 hand-written rings that remain after
   A's deletions, and as a primitive it meets item 2's proof rule. Review 4.2.
4. **The entry row once.** The `<article class="entry">` block written three times and its CSS
   twice become one component with one stylesheet, carried here from A because it changes the
   two most-baselined pages. Recorded rank 6.
5. **Site identity from `siteConfig`.** The five hardcoded "Waymark" sites (header, footer,
   error page, archive, styleguide) read `siteConfig.siteName`; the two unexplained origin
   literals are explained or derived; the footer nav stops forking from the header nav.
   Recorded rank 7, review 4.7.
6. **CSS conformance.** The two degenerate `clamp()` declarations, the two theme-only chrome
   tokens a second theme would dangle, `site.css` literals brought under the token gate, a
   stated class namespace convention, one page-title separator. Review 4.1 to 4.6, 5.2.
7. **Width matrix coverage.** The four unproven surfaces including the 404 baseline enter the
   matrix; the documented screenshot floor is compensated or the doc says why not. Review 5.3,
   5.6.
8. **Small idiom items.** `siteConfig` imported through one door; `feed.ts`'s mixed optional
   chaining and non-null assertions; the three `platform!` assertions in the custom-screen
   exemplar; the design-system doc's stale file paths. Review 1.2 to 1.4, 2.8.
9. **Waymark's deliberate adaptation and final rebake.** The initiative design's item 6 second
   half: `templates/waymark` adapted to the changed engine on purpose, not only kept compiling,
   then the final `emit:template` before the release window closes.
10. **Harvest.** The chassis harvest per the family rule: frictions and gaps land in the
    chassis first, the engine where deeper; the polish slice's inputs filed, including the
    engine's own `src/lib/components` Svelte lint wiring.

Ceiling 6M with a stated screenshot budget per task (image reads dominate); checkpoints every
four tasks; the three-lens review; Geoff's before/after on the rendered showcase at the five
viewports before merge.

## Out of scope for both

The four production sites' own chassis copies (each site's `ec-*` rename, trio replacement, and
chassis re-adoption ride its own site pass, with the `Consumers must:` line as their sheet);
the polish slice's cover-to-cover reads; any engine feature. The chassis's single-theme identity
(review 1.5) is a boundary observation, not a defect, and is recorded for polish rather than
acted on.

## Risks

- The comment-gate extension may surface more findings than one task can carry; the checkpoint
  records the remainder as a named follow-on, never a lowered bar.
- The render trio deletion is a public-surface removal inside the batching window touching four
  consumer sites; it lands with the replacement code in its `Consumers must:` line and the
  migration note, and `check:surface` regenerates.
- The whole-showcase reformat is a one-time large diff; it is first on the branch and reviewed
  as mechanical so no later review reads reflow.
- Chassis-A and internals-C both touch `examples/showcase/src/chassis/prose.css` (the `ec-*`
  rename); A branches only after C merges, so there is no contention.
