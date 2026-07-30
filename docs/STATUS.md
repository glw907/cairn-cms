# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`. This doc holds
ONLY the current entry; a superseded entry moves to the archives under `docs/internal/history/`
(see the Archives section at the end of this file),
never accumulates here.

**Standalone repo (2026-06-04).** cairn-cms now lives at `~/Projects/cairn-cms` as a standalone repo.
Its consumer sites (ecnordic-ski, 907-life) install `@glw907/cairn-cms` from the npm registry by
version range. The old `~/Projects/cairn/` meta-workspace and its symlink-dev loop are retired, and the
library's own development proves changes against `examples/showcase`.

## Immediate next action (2026-07-29: HOTFIX 0.91.1 before anything else)

**0.91.0 shipped a silent consumer-breaking regression: the admin sheet dropped named Tailwind
utilities cairn's own tree stopped using (`text-sm`, `text-xs`, `text-lg`, `text-2xl`, `gap-6`,
`tracking-tight`; verified one-rule-each in 0.90.1's published sheet, zero in 0.91.0's), so
consumer markup riding them lost its styling, roughly 300 sites on the first consumer measured,
while the upgrade guide promises no rendering change. The canonical record and four-step fix plan
is [issue #12](https://github.com/glw907/cairn-cms/issues/12).** The ASC Assets trial's substrate
is blocked at its upgrade step until 0.91.1; everything else in the trial brief stands.

**Resume prompt (fresh session, from `~/Projects/cairn-cms`):** "Execute the 0.91.1 hotfix per
issue #12: enumerate the FULL dropped class set by diffing the published 0.90.1 and 0.91.0
sheets with the audit's own `sheet.ts` tokenizer (the six named utilities are one consumer's
usage, not the whole delta); restore the dropped set via a labeled compatibility block in
`scripts/admin-css.input.css`'s `@source inline(...)`; add the regression gate the failure
earned (the built sheet's class inventory diffed against a committed snapshot, so a class leaves
the shipped sheet only as a deliberate changelog-carried act); correct the upgrade guide's
'keep rendering exactly as they did' sentence and carry a `Consumers must:` line describing
0.91.0's actual behavior; cut 0.91.1 via `cairn-release` (patch); comment on and close #12;
tell the ASC side the trial's upgrade step is unblocked. Also: a friction-gates batch commit
(`feat(gates): the friction-log tightenings...`) may sit unpushed on `main` from the prior
session's dispatched agent; verify it landed green and push it with the hotfix."

The voice sitting (below) moves to SECOND. Prior entry follows.

## Superseded same-day (2026-07-29: 0.91.0 published; the voice sitting)

**The design-infrastructure build is COMPLETE and RELEASED.** Pass 3 merged to `main`
(`8fa01eba`), the pass-end ritual ran in full (code-simplifier, the two-reviewer fan-out whose
triage batch landed as `08ae3a0a`, the full gate battery, the post-mortem appended to the plan),
`main` is pushed, and **`0.91.0` is on the registry as `latest`** (OIDC publish green; the
release is `v0.91.0` on GitHub). The `norms.yml` freshness check ran green on CI for the first
time, after correctly catching a stale manifest the triage batch caused; the regenerated
`admin-visual` baselines landed via CI dispatch and passed the orchestrator's eyes-on read
(quiet Published chips, edit-page pill, vocabulary actions, media checkbox plates, both themes).

**NEXT: the cairn.pub front-page voice sitting** (Fable sitting). **Resume prompt**, from
`~/Projects/cairn-cms`: "Brainstorm the cairn.pub front-page copy with me per
superpowers:brainstorming. This is the voice sitting Pass 3 deliberately carved out: the sixth
principle is ratified (the design language is enforced; the payoff is a developer less burdened,
never freed) and its substance lives in `docs/explanation/enforced-design.md` and the README's
'An enforced design language' section. The front page distills those in the site's own personal
voice; the `cairn-pub-front-page-voice` memory governs (personal voice over neutral definitional
intro, no pitch, brainstorm the copy with Geoff rather than drafting solo). The skills claim is
publishable: 0.91.0 ships `skills/`. Scope is the front-page treatment only; the principle-pages
pass (T1a through T1f) stays a separate queued pass. Ratified copy lands through the cairn.pub
repo's own deploy as the closing step."

**The ASC Assets trial is unblocked and briefed.** The trial brief, with the pre-trial upgrade
chores, the pre-registered controls, the pinned-grader measurement recipe, and the edit-desk
hydration defect as separate work, is committed in the ASC repo:
`aksailingclub-org/docs/plans/2026-07-29-cairn-design-trial-assets.md`. It runs in ASC's own
sessions against the published `0.91.0`; its classified verdict returns here as the initiative
post-mortem. The principle-pages pass can ride in parallel (docs-only, unblocked now that
`skills/` ships); after the trial, the rule-repair pass (armed with the trial's ratchet evidence,
the sheet-parser fix already landed in-pass, the stock-hairline retune as the border-contrast
promotion path); then Topo. Pre-release DX calls Geoff has not yet made, filed in ROADMAP: the
`cairn-doctor --fix` flag semantics and the type-scale rename codemod.

The pass record below is superseded by the plan's post-mortem where they differ.

**Pass 3 (capture) execution record.** The plan, with every step and the post-mortem, is
`docs/superpowers/plans/2026-07-28-design-infrastructure-pass-3-capture.md`; spec:
`docs/superpowers/specs/2026-07-27-cairn-design-infrastructure-design.md`.

**What Pass 3 shipped.** The Task 1 probe ratified two `StatusChip` chip registers, measured
against both themes and both grounds (`docs/internal/probes/2026-07-28-chip-registers/`); Task 2
built them (`register: 'bounded' | 'quiet'`) and retired `badge-ghost` from cairn's own tree
(EditPage's Published pill, the CairnAdminShell CMS pill, and every bare `badge-outline` site).
Task 3 demoted `chip-ground-collision` to advisory (its formula has no chroma term; the repair
stays filed in ROADMAP). Task 4 gave the rendered harness a post-hydration page-identity guard, so
a page that hydrates into foreign chrome (the ASC edit-desk shape) reports unmeasurable rather than
being audited silently. Task 5 cleared cairn's own admin's rendered error tier to zero
(`touch-targets`, `viewport-overflow`, and the `one-filled-action`/`screen-anatomy` VocabularyAdmin
pair, all fixed at the code; no rule formula changed). Tasks 6-11 shipped the packaged skill,
`skills/cairn-admin-screens/` (in the `files` array, doctored by `cairn-doctor`'s
`skill.admin-screens` check and its `--fix` install): a budget-gated standard doc core, two
annotated exemplar screens, a form-anatomy contract, an extension grammar, a calibrated grader
prompt, and a craft chapter. Task 12 wrote the pre-registered coverage contract for the ASC Assets
trial. Task 13 wrote the rationale doc (`docs/explanation/enforced-design.md`), the README's sixth
principle, and the upgrade guide's grammar-rename recipe. This task (14) folded every shipped item
into ROADMAP and CHANGELOG (`## Unreleased`, still unpublished).

**Two ratified deviations from the plan draft, for the post-mortem:**

1. **The grader calibration set (Task 10) was RECONSTRUCTED, not reused as archived.** The plan
   assumed the archived aksailingclub-org probes carried the labeled captures themselves; the
   archive held only prose descriptions of the known FAIL. Calibration proceeded by constructing
   FAIL fixtures from that prose and taking a fresh, read-only capture of the current (refined)
   consumer state for the PASS leg. Ledger, with the pinned prompt and every round:
   `docs/internal/2026-07-grader-calibration-ledger.md`.
2. **The craft chapter (Task 11) passed acceptance criterion 5 at round 3, after two FAILs.** Round
   1's narrow-width guidance collided under flex's `min-width: auto` default and reused one type
   role for two distinct purposes; round 2's fix regressed the same table-overflow mechanism
   further. Round 3 closed it with a structural recipe (column-priority hiding plus
   fold-into-primary-cell markup) rather than another paragraph, and passed 3-of-3 states against
   the calibrated grader. Protocol record, every round kept:
   `docs/internal/2026-07-craft-chapter-acceptance.md`.

**NEXT, in order:**

1. **The cairn.pub front-page voice sitting** (a Fable sitting; `docs/explanation/enforced-design.md`
   is the source material for the sixth principle's copy, deliberately not written by Task 13).
2. **Rehearse `norms.yml`**: `gh workflow run norms.yml --ref main`. It has still never run on CI.
3. **ONE release via the `cairn-release` skill** (minor: Pass 1's grammar layer, Pass 2's
   `cairn-audit` bin, and Pass 3's `skills/` package and chip registers are all still unpublished
   public surface). Verify the next number is free with `npm view @glw907/cairn-cms versions --json`
   before promising it.
4. **The ASC Assets trial**, in aksailingclub-org's own sessions, graded against the pre-registered
   coverage contract (`docs/internal/2026-07-assets-trial-coverage-contract.md`).

**Carry-forwards (live):** the ASC edit-desk hydration failure (SSR correct, hydrates to public 404
under local `wrangler dev`; for an aksailingclub-org session, now that Task 4's guard reports it as
unmeasurable rather than auditing it silently); admin error statuses flattening to HTTP 200 under
the shell's streamed pending count (upstream sveltejs/kit#12533, scheduled routine watches it);
mermaid diagrams near-illegible at 320/390 (candidate: tap-to-expand in the Topo pass); section-index
breadcrumbs duplicating the arm name; the cairn.pub live admin smoke (Geoff's magic link plus
publish round-trip) is owed; the `/admin/help` first-steps card overlap.

**THEN, after the release: the Topo design pass.** Open with
`docs/internal/2026-07-18-topo-inspiration-review.md` (four-system synthesis, devices table, Starlight
anatomy checklist, section 5's open questions for Geoff; mockup candidates go to Geoff BEFORE any
build); the cairn.pub design arc ratified seed vocabulary for it: the four-door landing, the docs rail
on /help, the step-down doc heading scale, and the micro-cta device. After Topo: the scaffolder.

**Published state:** `0.90.1` is `latest` (2026-07-24). Passes 1, 2, and 3 are all unpublished (Pass
3 not yet merged to `main`). When the cut comes it is a MINOR: Pass 1 added the grammar layer as
public surface, Pass 2 adds the `cairn-audit` bin, and Pass 3 adds the `skills/` package and the
StatusChip register prop. Verify the next number is free with
`npm view @glw907/cairn-cms versions --json` before promising it, and cut with the `cairn-release`
skill.

**Prior pass detail (design-infrastructure Pass 2, enforcement, and the ASC admin corpus C
calibration that closed its calibration gap) is preserved in full in
`docs/superpowers/plans/2026-07-27-design-infrastructure-pass-2-enforcement.md`'s post-mortem,
`docs/superpowers/plans/2026-07-28-asc-admin-corpus-calibration.md`'s post-mortem, and
`docs/internal/2026-07-design-infrastructure-audit-calibration.md` (section 12 governs where it
disagrees with earlier sections); this entry no longer restates it now that Pass 3 has resolved or
absorbed every open item corpus C and the Pass 2 calibration left (the `badge-ghost` design call;
`screen-anatomy`'s affirmative half, ratified as guidance in the skill's standard doc rather than a
mechanical lint, since the rule cannot know whether a screen has a primary action to place; the
`chip-ground-collision` repair-or-demote call; and the error-tier defects), per this file's own
one-current-entry convention.**

## Archives

Superseded entries live under `docs/internal/history/`:
`STATUS-archive-2026-05-to-2026-07.md`, `STATUS-archive-2026-07-02-to-2026-07-16.md`,
`STATUS-archive-2026-07-17-to-2026-07-18.md` (the cairn.pub step-5 launch and the Waymark
final-review entries), `STATUS-archive-2026-07-19-to-2026-07-20.md` (the chassis-nav pass and the
v0.88.3 safelist publish), and `STATUS-archive-2026-07-21-to-2026-07-28.md` (design-infrastructure
Passes 1 and 2 phase by phase, the `0.89.x` and `0.90.x` publishes, and the admin-toolkit
organization pass).
