# Chassis passes design (audit remediation, slices 8 and 9)

**Status:** ratified in brainstorm 2026-09-04 (Geoff); plans follow through `writing-plans`,
chassis-A first, chassis-B authored after A lands.

**Inputs:** the fresh showcase review at the exemplar bar (2026-09-04, Opus, read-only; ten
ranked findings on top of the recorded fourteen, every recorded item verified still open) and
the compiled chassis inputs (every item routed to chassis by ROADMAP, STATUS, the internals,
internals-B, and internals-C plans, the rulings ledger, the any-site audit record, and the
harvest records). Both are banked at `docs/internal/record/2026-09-04-chassis-inputs/` (`showcase-review-at-the-exemplar-bar.md`, `routed-inputs.md`)
(the record internals-C's Task 10 names and this spec creates). The recorded fourteen:
`docs/internal/record/2026-08-26-any-site-audit/int-rank-site-chassis.md`.

## What the review found

`examples/showcase` is the chassis: the seed every theme copy and the `templates/waymark`
scaffold descend from, emitted wholesale by `scripts/build/emit-template.mjs`. The standing
mandate (Geoff, 2026-09-01) is that the chassis sets the code bar, so its quality bar equals
the engine's, every line copy-paste-taught exemplar code.

The tree is closer to that bar than its finding count suggests, and it fails in one specific
way. The showcase carries three jobs at once, exemplar template, engine e2e fixture, and
design scratchpad, and only the first is stated. Every top-ranked finding is one of the other
two leaking into the first: a design-acceptance fixture route with deliberate defects and an
e2e sentinel value emitted into every scaffolded site, pass codenames in a stylesheet header,
test-coverage rationales annotating a content model, a script whose own header says it should
be gone. The second cause is that the exemplar does not use its own chassis: zero of seven
composition primitives appear in any markup, the shell is hand-rolled beside a comment
admitting the chassis bakes it, the focus ring is written 22 times across nine files. Nothing
needs rearchitecting. The chassis/theme split is real and gate-enforced, the `$chassis` and
`$theme` aliases make the boundary visible, and the five-viewport matrix is a real gate.

The one structural gap is that no linter or formatter runs on the showcase (root `lint` is
`eslint src/lib`, no Prettier config exists), so every register fix there drifts again.

## Two organizing rules

The passes work under two rules rather than a flat finding list:

1. **The fixture job is marked or excluded.** Anything in the tree that exists for the
   engine's tests or the design probes is either marked by a convention the template emitter
   skips, or moved out of the emitted set. Nothing marked reaches `templates/waymark`.
2. **The exemplar uses the chassis it ships.** A primitive the chassis provides is used by the
   showcase's own markup, rendered, baselined, and proven at 320 and 2560. A device with one
   source (the focus ring, the shell, the site name) has one source.

## Decisions ratified 2026-09-04

- **Two passes.** Chassis-A is structural; chassis-B makes the exemplar use its chassis.
  Polish follows B. Sizing by the pass-sizing rule: one plan of fourteen to sixteen tasks
  would double mid-flight.
- **Fixtures stay in-tree, marked and excluded.** The `.cairn-template.json` exclude list and
  the `cairn-template:exclude-start`/`-end` marker idiom the tree already uses (`src/app.d.ts`,
  `src/hooks.server.ts`) are the convention; `check:template` proves nothing marked is emitted.
  A separate fixture site was rejected as a second site to install, build, and baseline.
- **ESLint extends to the showcase; Prettier ships in the chassis only.** The engine's comment
  gate (`eslint.config.js` `COMMENT_GLOBS`) covers `examples/showcase/src/**`. A Prettier config
  and `format`/`format:check` scripts live in the showcase and therefore in the scaffold, since
  a developer copying a SvelteKit site expects one and the emitted site is theirs. The engine
  stays on `check:idioms` (internals-C's formatter ruling stands; no repo-wide rewrap).
- **The archive is proven, not retired.** `ARCHIVE_PAGE_SIZE` drops to a value the 14-post
  corpus crosses (5 or 6), `/archive/2` enters the visual matrix, and the permanent
  `handleUnseenRoutes` exception in `svelte.config.js` is removed. Pagination is a pattern a
  starter site needs taught, and proving it costs one constant.
- **Render trio re-homing shape.** The three retire rulings (`audit-render-cardshell`,
  `audit-render-iconspan`, `audit-render-headrow`) require re-home, template rebake, guide
  rewrite, and engine deletion in one change. The shape: `headRow` (the only real logic)
  becomes a chassis-local export in `src/chassis/render.ts`; `cardShell` and `iconSpan` are
  inlined at their single call sites (`iconSpan` into `makeIconRenderer`, `cardShell` into the
  `alert` component); `configure-rendering.md` rewrites its worked example against plain `h()`,
  which eight of nine showcase components already use; the trio and its `authoring.ts` barrel
  line leave the engine; the `check:surface-leaks` narrative-context allowlist entry for the
  trio goes with it. The chassis README's rule that a theme never imports render helpers from
  the engine directly becomes true.
- **Release.** ONE cut after polish (Geoff, 2026-09-01), not after chassis as the 2026-08-27
  initiative design still says; chassis-A amends that spec's slice-6 and publish paragraphs.

## Chassis-A: structural (slice 8)

Branches off `main` after internals-C merges (its Task 4 renames the emitted `ec-*` classes
and re-emits the template; chassis-A inherits `cairn-*`). Worktree `.claude/worktrees/chassis-a`.

Scope, each a task or a task's step; the plan fixes the grouping and the chains:

1. **Fixtures out of the scaffold.** `src/routes/probe-craft/` added to the exclude list; the
   `siteLayoutSentinel` return in `(site)/+layout.server.ts` wrapped in exclude markers so the
   scaffold's load returns nothing it does not use; a fixture convention stated in the showcase
   README; re-emit; `check:template` green. Recorded rank 2.
2. **Lint and format reach the showcase.** `COMMENT_GLOBS` extended; Prettier config,
   `.prettierignore`, and scripts in the showcase; the tab and space forks fixed
   (`playwright.config.ts`, three e2e specs); the comment findings the extension surfaces fixed
   in the same task or split by directory if the volume demands; the scaffold job runs the
   format check. Review 5.1, recorded rank 14a.
3. **`cairn.config.ts` split.** The icon set and the nine `defineComponent` declarations move
   to their own theme modules; the adapter file keeps adapter, concepts, backend, and
   `navLayout` under a true header; the `$theme` self-import residue goes. Recorded rank 10,
   review 2.1.
4. **Dead code out.** `IntroLedger.svelte` and `Carousel.svelte` (464 unimported lines) and the
   leftover one-off script whose header says it was to be deleted. Recorded rank 5, review 2.6.
5. **Archive proven.** The page size, the exception removal, `/archive/2` baselined, the
   entry-row component written once instead of three times with its CSS once instead of twice,
   `sortNewestFirst` removed in favour of the engine's guarantee. Recorded ranks 1, 6, 11.
6. **Single-source public routes.** The `[...path=md]` twin route consumes the chassis
   `PublicRoutesConfig` instead of retyping seven of nine fields. Recorded rank 3, review 1.1.
7. **Render trio re-homing** per the decision above, one change, ledger rows closed with the
   seam-fit line.
8. **Chassis unit test project.** A vitest project in the showcase for the chassis's pure logic
   (`paginateArchive`, `formatDate`, `isBannerExpired`, `isAdminHref`, and what the split in
   item 3 exposes). Recorded rank 4.
9. **Idiom conformance.** Import specifiers one way (`.js`) across `$chassis`/`$theme`; route
   handler and error idioms one way; the `fail` literal onto the sanctioned shape; the
   `cairn-cms:` header prefix on every chassis module; a `$members` alias instead of `../../`
   traversal; the `createSectionAction` showcase half per whatever internals-C's Task 10 rules
   (adopt it in `admin/signups` if the docs keep teaching it, otherwise leave the raw shape and
   say so). Recorded ranks 9, 12, 13, 14b-d; audit finding 8's showcase half.
10. **Register purge of shipped exemplar comments.** Pass and plan citations, history
    narration about code no longer present, the 35-line derivation narrative in the
    site-owner file, the 46-line `@component` blocks, the `ec-*` residue the rename steps
    over. Review 3.1 to 3.6. Enforceable after item 2.
11. **Records.** The chassis-inputs record banked; the initiative-design spec amended on the
    release ruling; `ROADMAP.md`'s chassis improvement round marked done as its items ship;
    the hand-mounted `+page.server.ts` against generated `./$types` carry-forward closed in
    the showcase (foundations-B's routed follow-up).

Gate per task: the showcase's own lint, format check, unit, and e2e suites plus the engine's
`check:chassis-boundary`, `check:public-tokens`, `check:template`, `check:consumers`, and the
scaffold CI job; the from-scratch showcase install rule from `cairn-pass` applies. Ceiling
about 5M, checkpoints every four tasks, workflow mode with disjoint-file chains marked in the
plan; the three-lens adversarial plan review before approval.

## Chassis-B: the exemplar uses its chassis (slice 9)

Branches off `main` after chassis-A merges. Worktree `.claude/worktrees/chassis-b`. This is
visual work: the `visual-fidelity` skill governs it (reference capture before the build, the
fresh-context `visual-verifier` gate, the one-check deploy rule, the five-viewport standard).

Scope:

1. **The shell from the chassis.** `(site)/+layout.svelte` and `+error.svelte` use
   `.cairn-site-shell`/`.cairn-site-main`; the triplicated gotcha prose collapses to the one
   place the chassis states it. Recorded rank 8, review 2.7.
2. **Composition primitives used and proven.** Each of the seven primitives appears in
   showcase markup, is baselined, and is proven at 320 and 2560. Review 5.5.
3. **One focus ring.** A single chassis source replaces the 22 hand-written rings. Review 4.2.
4. **Site identity from `siteConfig`.** The five hardcoded "Waymark" sites read
   `siteConfig.siteName`; the two unexplained origin literals are explained or derived; the
   footer nav stops forking from the header nav. Recorded rank 7, review 4.7.
5. **CSS conformance.** The two degenerate `clamp()` declarations, the two theme-only chrome
   tokens a second theme would dangle, `site.css` literals brought under the token gate, a
   stated class namespace convention, one page-title separator. Review 4.1 to 4.6, 5.2.
6. **Width matrix coverage.** The four unproven surfaces including the 404 baseline enter the
   matrix; the documented screenshot floor is compensated or the doc says why not. Review 5.3,
   5.6.
7. **Small idiom items.** `siteConfig` imported through one door; `feed.ts`'s mixed optional
   chaining and non-null assertions; the three `platform!` assertions in the custom-screen
   exemplar; the design-system doc's stale file paths. Review 1.2 to 1.4, 2.8.
8. **Waymark's deliberate adaptation and final rebake.** The initiative design's slice-6
   second half: `templates/waymark` adapted to the changed engine on purpose, not only kept
   compiling, then the final `emit:template` before the release window closes.
9. **Harvest.** The chassis harvest per the family rule: frictions and gaps land in the
   chassis first, the engine where deeper; the polish slice's inputs filed.

Ceiling about 5M, checkpoints every four tasks; the three-lens review; Geoff's before/after on
the rendered showcase at the five viewports before merge.

## Out of scope for both

The four production sites' own chassis copies (each site's `ec-*` rename and chassis
re-adoption ride its own site pass); the polish slice's cover-to-cover reads; any engine
feature. The chassis's single-theme identity (review 1.5) is a boundary observation, not a
defect, and is recorded for polish rather than acted on.

## Risks

- The lint extension may surface more comment findings than one task can carry; the plan
  splits by directory rather than lowering the bar.
- The render trio deletion is a public-surface removal inside the batching window; it lands
  with its `Consumers must:` line and the migration note, and `check:surface` regenerates.
- Chassis-A and internals-C both touch `examples/showcase/src/chassis/prose.css` (the `ec-*`
  rename); A branches only after C merges, so there is no contention.
