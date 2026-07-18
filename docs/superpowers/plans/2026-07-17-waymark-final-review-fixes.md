# Waymark final review: the fix plan (2026-07-17)

Executes the surviving audit findings and the seven ratified verdicts from
`docs/internal/2026-07-17-waymark-final-design-review-audit.md`. Branch:
`waymark-final-design-review`. The fixture corpus (220 posts) stays on this branch for
verification and never merges to `main`; the template fixes cherry-pick or merge without the
`src/content/posts` fixture commits and the manifest regen.

Method: one `cairn-implementer` dispatch per task, disjoint file sets per parallel pair, the
main loop reviews each diff, full gate between dispatches (`npm run check` 0/0 in the showcase,
the engine gate where an engine file changes). Tasks specify outcomes and acceptance criteria,
never implementation code. Render verification against the live preview (port 4180) and the
banked renders; the pass-end re-render and verifier gate close the plan.

## T1: the reading surface's interaction and rhythm batch

Files: `examples/showcase/src/chassis/prose.css`, `examples/showcase/src/theme/site.css`.

Outcomes:
- Every off-grid decimal-rem spacing value lands on a `--spacing-*` token (the audit's list:
  0.6rem cite/figcaption, 0.4rem list gaps and video caption, 0.55rem checkbox and table cell
  padding, 0.7rem table cell inline padding, 0.3rem callout/ec heads; the site.css figcaption
  duplicate goes with them).
- In-prose body links get an identity at rest (the token-layer accent underline treatment the
  styleguide's own copy promises) and a hover change; CTA links, the video facade, and the FAQ
  summary get hover states; every custom interactive element gets an `:active` pressed cue.
- Hover/state changes transition inside the 150-250ms band with ease-out entrances; the FAQ
  chevron's rotation gates behind `prefers-reduced-motion`.
- Headings that can wrap use `text-wrap: balance`; flow paragraphs get `text-wrap: pretty`.
- `.prose` tables set `font-variant-numeric: tabular-nums`; the fenced-code line-height reads
  the sheet's leading token instead of a literal.
- The full-bleed figure caption keeps a viewport gutter at every width (never x=0).
- The standalone icon directive renders at a legible size aligned to the type (the audit
  measured ~11x9px; the styleguide sample must read as a designed marker).
- The pull-quote's opening quotation mark hangs (second line aligns with the first line's
  text, not the mark).

Acceptance: the styleguide and reading-surface pages re-render with the changes visible at
1440 and 320 in both schemes; `npm run check` 0/0; the reskin fixture still passes
(`test:reskin`), since every new color-bearing declaration must read tokens.

## T2: chrome mechanical batch (header, footer, layout, toggle)

Files: `examples/showcase/src/theme/components/SiteHeader.svelte`, `SiteFooter.svelte`,
`examples/showcase/src/routes/(site)/+layout.svelte`, `examples/showcase/src/chassis/theme-toggle.ts`,
`examples/showcase/src/theme/theme.css`.

Outcomes:
- The footer pins: short pages compose as a full-height column (content grows, footer sits at
  the viewport bottom, no background seam below it).
- `gap-[0.55rem]` becomes the named utility in both chrome components; the skip link's three
  arbitrary brackets land on tokens.
- Brand links get the hover state their sibling nav links have and the touch-height class they
  lack; footer nav links get the horizontal padding SiteHeader's carry; the theme toggle gets
  `cursor: pointer`.
- The theme toggle gains the verdict-7 cross-fade: a ~200ms color transition applied through a
  temporary class during the flip only (no transitions at page load or scheme-media changes),
  instant under `prefers-reduced-motion`.
- Internal navigation gains the verdict-7 extension: a subtle root cross-fade (~150-200ms) via
  SvelteKit `onNavigate` + the View Transitions API in the site layout, a plain cross-fade
  only, no-op where unsupported, instant under `prefers-reduced-motion`.
- The focus-ring radius and caption tracking literals consolidate into tokens (one source, three
  consumers).
- Verdict 1's neutral wordmark slot: the chrome renders the site name from config with a plain
  glyph-free lockup by default; the stacked-stones SVG leaves both components (cairn.pub's theme
  re-adds identity at the theme layer).

The two-row mobile lockup does NOT land here; it waits on the T6 probe verdict and lands as T7.

Acceptance: About/calendar-successor/404 short pages show the pinned footer at 1440 and 390;
toggle flip cross-fades live and is instant under emulated reduced-motion; `npm run check` 0/0.

## T3: routes batch (article meta, archive shape, calendar cut, 404)

Files: `examples/showcase/src/routes/(site)/+page.svelte`, `+page.server.ts`,
`[...path]/+page.svelte`, the calendar route dir, `+error.svelte`,
`examples/showcase/src/routes/(site)/styleguide/+page.svelte`, `src/theme/site.config.yaml`,
the flagship post's frontmatter.

Outcomes:
- Verdict 3: articles render one meta line under the h1 (date in the "9 Jul 2026" vocabulary,
  byline when an author resolves); the archive and every other date surface share that
  vocabulary through one formatting helper.
- Verdict 2: the archive year-groups its entries and paginates (year markers as the composed
  rhythm; a page size that keeps the home document well under the audit's weight flag; the
  lead + latest treatment stays on page one).
- Verdict 4: the calendar route leaves the template nav and the route dir goes; the e2e specs
  that reference it re-point (the custom-route seam stays proven by `custom-screen.spec.ts`
  and the admin Signups screen).
- The flagship post renders its frontmatter hero (the article template honors `image.src`),
  and its byline resolves to a sensible display name rather than "By About".
- The 404 page gets template-voice copy and the same composed treatment as other short pages.
- Styleguide touch targets: the accordion summary and tab buttons reach 44px; the demonstrated
  DaisyUI buttons note their stock size or size up; tag-filter pills on home reach the floor
  with invisible padding and get hover/transition treatment consistent with T1.
- Home list titles get styled focus-visible rings (no browser default).

Acceptance: long-title, no-hero, and typical post renders show the meta line composed at 320
and 1440; home at 320/2560 shows year groups and pagination with the fixture corpus;
`/calendar` 404s and nothing in the template links it; `npm run check` 0/0 and the e2e nav
specs green.

## T4: the measured floor (engine-adjacent; full engine gates)

Files: `examples/showcase/src/routes/+layout.svelte` (and the chassis module it imports),
`src/lib/render/resolve-media.ts` and the figure pipeline (ENGINE), showcase vite config,
`examples/showcase/src/chassis/render.ts`.

Outcomes, one dispatch each:
- T4a: the root layout stops importing the site adapter client-side; the one flag it needs
  arrives via a server `load` (or a split server-only module), and the 745KB chunk leaves the
  public bundle. Acceptance: a clean build's largest public chunk drops accordingly and no
  public page's decoded JS exceeds ~150KB; the weigh script re-run records the numbers.
- T4b (ENGINE): rendered images carry intrinsic dimensions or reserved `aspect-ratio`, and
  managed media emits `srcset`/`sizes` through the delivery variants; raw external URLs keep
  their single source but still reserve layout. Test-first against the engine suite; the
  reference docs update if any public surface moves (none expected).
- T4c: verdict 6, punctuation smartening in the chassis render pipeline (typographic quotes,
  dashes, ellipses at render; source untouched; code spans and blocks exempt).
- T4d: the unused DaisyUI component CSS leaves the public payload (scope the plugin to the
  surfaces that use it, or split the styleguide's demo CSS); acceptance is the compiled
  theme.css size drop with `test:reskin` green.

## T5: the standing gates

Files: `scripts/check-invisible-craft.mjs`, `scripts/invisible-craft-budget.json`, the
contrast gate script, the showcase e2e visual suite.

Outcomes:
- `check:invisible-craft` recognizes `s`-suffixed durations, scans the template tree
  (chassis + theme + site routes) alongside `src/lib/components`, and the budget file carries
  the deliberate exceptions (the theme.css hue-free ladder among them) each with a reason.
- The dual-gamut contrast gate's scan set includes `examples/cairn-theme/cairn.css`.
- The audit's two numeric probes land as repo scripts in the `check:*` idiom (interactive
  color-vs-background equality; 390 touch targets), runnable against a preview server.
- The visual suite asserts the pinned footer (no background seam below it on a short page) and
  no browser-default focus ring on the home list titles.

## T6: header lockup probes (design, main loop)

Two or three composed two-row lockup candidates at 320/390, built as a probe page against the
live preview, screenshots to Geoff, one verdict. Then:

## T7: the mobile header restructure

Implements the picked lockup in `SiteHeader.svelte` (after T2 lands, same file). Acceptance:
320/390/768 renders show the composed chrome within ~120px of vertical rhythm before content,
no orphaned nav items, both schemes.

## Close

Pass-end: full gate (`check` 0/0, `npm test` exit 0, every `check:*`, e2e via CI), fresh
five-viewport re-render of the audit's page set for the verifier gate, the audit doc gains the
outcome record, CHANGELOG under `## Unreleased`, ROADMAP prunes the shipped items (the
"Waymark final design review" entry and the pre-B3 calendar line), STATUS advances to cairn.pub
(step 5).

## Post-mortem (pass close, 2026-07-17)

**What was built.** All eight tasks landed on `waymark-final-design-review`: T1 the reading
surface's interaction and rhythm batch (link identity, hover/active everywhere, in-band
transitions, reduced-motion gates, off-grid spacing to tokens, the icon-stroke and
caption-gutter root-cause fixes); T2 the chrome mechanical batch (footer pin, bracket
retirement, the neutral wordmark, the toggle cross-fade, the navigation view-transition);
T3 the routes batch (year-grouped paginated archive at page size 50, the article meta line on
one date vocabulary, the calendar cut, the 404 voice, the styleguide touch floors, the
flagship post's hero and byline); T4a the client-bundle fix (the adapter left the public
graph: ~856-864KB to ~112-120KB decoded JS per page); T4b engine image delivery (intrinsic
dimensions plus an honest srcset/sizes ladder, zero surface drift); T4c render-time
typographic punctuation through the new `proseTypography` chassis seam; T4d the DaisyUI prune
(compiled public CSS 116KB to 61KB, and the `.hero` class collision bug found and fixed by
exclusion); T7 the two-row tracked-eyebrow header lockup (probe variant B). The chassis README
gained `archive.ts` and `date.ts` as documented seams; the touch and contrast probes landed as
`check:*` scripts and their first real run caught and closed three touch-floor stragglers.

**What was verified, with evidence.** Final tree: `npm run check` 0/0 (1386 files), showcase
check 0/0 (558 files), `npm test` 313/313 files and 3660/3660 tests exit 0 (captured
un-piped), and every check gate green by name: comments, reference, reference:signatures,
docs, package, surface, invisible-craft (now scanning the template tree with seconds-suffixed
durations), public-tokens (including cairn.css: 30/30 AA pairs both gamuts), chassis-boundary
(11 seams), custom-surface, test:reskin. Live probes against the final build:
design:probe pass, check:interactive-contrast PASS, check:touch-targets PASS. Page weight
against the 220-post fixture corpus: home document 53.1KB (was 195KB), per-page decoded JS
~112-120KB (was ~856-864KB), compiled public CSS 61KB (was 116KB).

**Decisions locked.** The seven verdicts in the audit record, including the navigation
cross-fade extension and the calendar cut. The upgrade-guide entry lands at the next cut with
the derived number, per the per-version convention.

**The verifier gate reopened the pass (the fresh-context grader earning its keep).** The first
close attempt failed the visual gate: the pass had un-clipped wide content without giving it
scroll containers, so four pages (the flagship article, the styleguide, the code-blocks and
gear-checklist fixtures) overflowed horizontally at 320/390 where the pre-fix template did not;
the 404 page missed the footer pin; long code lines clipped at 1440 with no affordance; and the
merge rehearsal surfaced a prerender break at a one-page corpus (nothing links deeper archive
pages, so the route pattern is never crawled). The reopen batch fixed all four: the root cause
of both the overflow and a cosmetic column drift was `.site-main` as a shrink-to-fit flex item
(one `width: 100%; min-width: 0` change; the chassis's own `.cairn-site-main` recipe had
already documented this exact bug from the AstroPaper port, and the showcase's hand-rolled copy
never adopted it — the harvest lesson is that a chassis recipe fix must sweep the copies);
scrollable code and table boxes gained a token-derived right-edge fade; the error page adopted
the layout's pinned column; and a scoped `handleUnseenRoutes` handler keeps the archive route
green at any corpus size. Re-verified: zero page-level overflow on all thirteen page keys at
320 and 390 (mechanical loop), plus the targeted fresh-context re-grade.

**Process notes.** Two agent-infrastructure failures (one API connection close, one stream
stall) were both recovered by resuming the same agent with its context intact; neither lost
work. The shared-worktree collision class (a concurrent dispatch's build or test tearing
another's run) surfaced four times and was absorbed by the documented re-run-once discipline;
two dispatches independently caught the pipe-masked-exit-code trap. One acceptance criterion
(the calendar nav entries) stranded between two tasks' file boundaries and was closed by the
orchestrator inline: a plan that cuts a route must own the links to it in the same task. The
first merge attempt chained its gates with `;` before the commit and masked a manifest-regen
failure (the shell-gate-hygiene trap, hit live); the merge redo runs each gate un-chained. The
runaway guard's first alarm was a mis-calibrated tier (an image-reading scan agent against the
1MB text tier); the v2 tiers held after correction.

**Budgets.** Tokens: the audit workflow ~5.9M; the nine implementer/simplifier dispatches
~1.8M combined; the register edit and probe/verifier work beside the main loop. Geoff
interaction points: the launch, the mid-run model directive, the findings read, one verdict
sitting (five forks ratified in one message), the toggle-motion question resolved with one
research pass, the navigation-motion extension, and one "continue" (read as proceed on the
standing header recommendation). No mid-execution check-ins.
