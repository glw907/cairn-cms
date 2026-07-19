# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`. This doc holds
ONLY the current entry; a superseded entry moves to the archives under `docs/internal/history/`
(currently `STATUS-archive-2026-05-to-2026-07.md` and `STATUS-archive-2026-07-02-to-2026-07-16.md`),
never accumulates here.

**Standalone repo (2026-06-04).** cairn-cms now lives at `~/Projects/cairn-cms` as a standalone repo.
Its consumer sites (ecnordic-ski, 907-life) install `@glw907/cairn-cms` from the npm registry by
version range. The old `~/Projects/cairn/` meta-workspace and its symlink-dev loop are retired, and the
library's own development proves changes against `examples/showcase`.


## Immediate next action (2026-07-18, latest: CAIRN.PUB IS LIVE — step 5 SHIPPED; next = step 6, the scaffolder, fresh session under Opus)

**CAIRN.PUB SHIPPED 2026-07-18.** The pre-beta ladder's step 5 is live at https://cairn.pub:
v0.87.2 cut and published at pass open; the repo reset onto the post-review template wearing
the cairn theme; Geoff-led content brainstorm produced the ratified five-point identity, the
`IntroLedger` hero (probe-designed, fresh-context visual-verified), the frozen-outline front
page, and the charter paragraph (now also the docs README opener, replacing "writing room");
three R2-backed figures on /waymark; the full register machinery on all prose (the banked
rules: `cairn-pub-front-page-voice` memory — encyclopedic register, never marketing, no
em-dash rhythm). The `IntroLedger` component is banked in the showcase. Deploys are manual
`wrangler deploy` until GitHub Actions private-repo billing is fixed (or go-public); the
live admin smoke (Geoff's magic link + publish round-trip) is owed; Geoff refines content
post-launch. Site-side record: cairn-pub `docs/STATUS.md`.

**Round 2 (same day, Geoff-led): the question-title hero ("What is cairn?" + the mark, the
identity line as its answer), the stories columns under the hero, ledger-ordered numbered
sections, the site-wide link grammar (ink prose links, tinted underlines, 180ms ease),
smooth anchors; point 05 de-jargoned ("One sign-in covers everything the site does"). All
live. TWO INITIATIVES QUEUED BY GEOFF (see cairn-pub docs/STATUS.md for the briefs): (1)
docs+help rendered on-site with TOCs, likely starting the TOPO theme; (2) a DEDICATED
docs-register sweep, brainstorm-first — the docs must read like documentation, not
marketing (his specimens: "writing room", "the four arms", "Eight words the docs use
precisely", the when-something-breaks setup-colon triad; the last three still live in
docs/README.md until the sweep). The docs README's charter opener still says "The whole
organization works in one place... one admin" — fix rides the sweep with point-05's new
wording. These likely PRECEDE the scaffolder now; confirm priority with Geoff at next
session start.**

**NEXT (fresh session; the Fable window closed 2026-07-19, so OPUS CONDUCTS per
`~/.claude/docs/fable-post-cutoff-system.md`): Geoff's queued initiatives above, then the
pre-beta ladder's step 6, the scaffolder** (`create-cairn-site`: the pre-B3 DX slot first, then B3/B4, then the Part C
generator; plans under `docs/superpowers/plans/2026-06-2*-cairn-scaffolder-*`, re-verify
their baselines). Resume prompt: "Run the scaffolder effort, the pre-beta ladder's step 6:
read cairn-cms docs/STATUS.md's next-action entry and the existing scaffolder plans, verify
their baselines against main, then plan and execute the pre-B3 DX slot." Launch in
~/Projects/cairn-cms.

## The archived step-5 launch entry (superseded content below)

**THE WAYMARK FINAL DESIGN REVIEW IS DONE AND MERGED (PR #4, all CI green).** The pre-beta
ladder's step 4, run at the invisible-craft rigor: a two-track opening audit as a workflow (ten
mechanical scans + five Fable optical lenses over 130 renders of the 220-post fixture corpus at
the five-viewport bar, both schemes; 90 findings, 82 surviving adversarial verify, ~110
confirmed-right claims), seven verdicts ratified in one sitting, tasks T1-T7 plus the standing
gates executed, a verifier-gate reopen (the fresh-context grader caught a pass-introduced
overflow regression; all four reopen items fixed and re-verified PASS). The record:
`docs/internal/2026-07-17-waymark-final-design-review-audit.md` (findings, verdicts, the
verbatim review brief); the plan and post-mortem:
`docs/superpowers/plans/2026-07-17-waymark-final-review-fixes.md`.

**What shipped:** the year-grouped paginated archive + article meta line (one date
vocabulary); the neutral wordmark (cairn's brand off the template chrome); the two-row
tracked-eyebrow header; the motion verdicts (toggle cross-fade + navigation view transitions,
reduced-motion-gated); the calendar cut; per-page decoded JS ~856KB to ~112KB (the adapter
left the public client graph); ENGINE: managed images emit intrinsic dimensions + honest
srcset/sizes (zero surface drift; in the changelog under Unreleased); render-time typographic
punctuation via the new `proseTypography` chassis seam; public CSS 116KB to 61KB (DaisyUI
pruned; a `.hero` class-collision bug fixed by it); `check:invisible-craft` extended
family-wide (seconds durations); the dual-gamut contrast gate covers cairn.css (30/30 AA);
two new live probes (`check:interactive-contrast`, `check:touch-targets`, BASE_URL-driven).
**Held unpublished** per the release cadence; the window sits under `## Unreleased`.

**Standing artifacts:** the review branch `waymark-final-design-review` stays as the harness
(the 220-post fixture corpus + its own green baselines); `wayfinder-review-fixtures` and
`wayfinder-retheme-lab` remain banked.

**NEXT (fresh session): cairn.pub, the pre-beta ladder's step 5.** The pass OPENS WITH A
RELEASE CUT (the `cairn-release` skill; derive the number at the cut): the site repo
(`~/Projects/cairn-pub`, currently pinned `^0.79.0`) consumes from the registry, and the
reviewed template depends on this window's unpublished engine changes (the srcset/dimensions
emission, the render seam behavior), which is the cadence's trigger 1. **The cut is DONE:
v0.87.2 published 2026-07-18 (patch; the srcset/dimensions window), publish.yml green, the
registry serves it.** Then the Phase-1
finalization per the approved architecture (the `cairn-template-effort` memory's queue: nav
WAYMARK/Docs/Help/Blog + GitHub icon, the template page with the one-CSS-file reveal, the
home narrative's Waymark section, /help in site chrome, docs links interim, blog dogfoods
Posts), wearing the cairn theme; the self-documenting placeholder content's full treatment
rides here by ruling (ROADMAP, the step-5 rider), and the front door writes to the
broad-audience framing (audience-per-surface, Geoff 2026-07-02). Deploy gates: the one-check
rule plus Geoff's before/after (public face). Resume prompt: "Run the cairn.pub pass, the
pre-beta ladder's step 5: read cairn-cms docs/STATUS.md's next-action entry, the
cairn-template-effort memory's queue, and ~/Projects/cairn-pub's own docs; open with the
release cut, then the Phase-1 finalization." Launch inside ~/Projects/cairn-pub (a site-pass
in its own repo; the release cut runs in ~/Projects/cairn-cms first).

**Carry-forwards:** the dev backend still cannot exercise fragments and renders media tiles
as "Image missing" (ROADMAP Now seed item); the friction log gained six entries at this pass
(remark-figure caption promotion is media-token-only; glyph.ts fill-only paths; the dead
`menus:` config key; heroImage projection resolves media: only; the admin preview iframe
consumes public theme.css; the engine-owned `sizes` constants) — triage at the next
friction-log clearing; `check:custom-surface`/`check:chassis-boundary` remain CI-dark.

## The archived 0.87.0 entry (superseded 2026-07-17)

Moved to `docs/internal/history/STATUS-archive-2026-07-02-to-2026-07-16.md` per the archive
rule.

