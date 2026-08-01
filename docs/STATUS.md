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

## Immediate next action (2026-08-01: design-ratchet SHIPPED as 0.92.0; next is the optical-centering pass plan)

**The design-ratchet pass is MERGED and RELEASED.** PR #13 merged to `main` (`e70f295b`) with
all five CI checks green, and **`0.92.0` published as `latest`** (Geoff's 2026-07-31 go
superseded the 2026-07-30 hold). The pass converted the six Assets-trial harvest findings
into engine repairs, then its review gate earned its cost twice over: the A2 verify caught an
inverted `@layer` order behind green gates, and three independent Opus reviews measured the
ratified A1 dark `.btn-active` repair failing WCAG 1.4.11 photometrically, which the D-wave
(D1 hairline device, D2 reset narrowings + docs, D3 re-check fallout) repaired to measured
3:1+ margins on both themes. Fix C proved `container-inset-asymmetry` was never broken (the
corpus miss was an empty-state leg; the recipe correction is standing in the plan). The norms
freshness gate was made deterministic (the generator now settles streamed data and hydration
before counting; two CI dispatches green back-to-back). Full record: the post-mortem in
`docs/superpowers/plans/2026-07-30-design-ratchet.md`. The `design-ratchet` worktree is
mergeable-clean and can be removed.

**NEXT: draft the optical-centering ratchet plan** (a Fable sitting per the model economy;
execution then runs Opus). Seed, from the post-mortem: `text-box-trim` as a silent engine
default, measurement-first — capture Geoff's ASC chip sighting FIRST (page/chip/theme
unknown; ask or survey), decide trim breadth (chips + buttons minimum; "more broadly" is an
explicit scope question for Geoff), corpus-style validation; fold in the `.list-row`
`grid-row-start` pin (ROADMAP Next) and any genuinely small friction-log items verified
against code first, each with a deliverable count. ROADMAP's new promotion-prerequisites
block (the audit-rule refinements) is standing material for whichever pass promotes the
geometry rules.

The cairn.pub voice sitting stays queued behind that plan; its resume prompt below remains
valid.

## Superseded 2026-07-30 (the voice sitting, still queued)

**The 0.91.1 hotfix is SHIPPED and issue #12 is closed.** The mechanical diff of the published
0.90.1 and 0.91.0 sheets (the audit's own `parseSheet` tokenizer) found NINETEEN dropped
classes, not the six one consumer measured: the named type steps, `gap-6`, `tracking-tight`,
`badge-ghost`, and ten bracketed arbitrary sizes. All nineteen are restored through a labeled
compatibility safelist in `scripts/admin-css.input.css` (`badge-ghost` stays retired from
cairn's own tree but ships for consumers), and the failure earned its gate:
`admin-sheet-inventory.test.ts` diffs the built sheet's full 812-class inventory against the
committed `src/tests/unit/fixtures/admin-sheet-inventory.txt` in both directions, with regen an
explicit `npm run update-admin-sheet-inventory`, so a class leaves the shipped sheet only as a
deliberate changelog-carried act. The shipped-sheet inventory is now a gated de facto public
API. Upgrade guide corrected, `Consumers must:` line carried, full gate plus CI green,
`v0.91.1` published via OIDC and serving as `latest`. **The ASC Assets trial's substrate is
UNBLOCKED at its upgrade step** (ASC is the only consumer with an extended admin today, so it
was the whole practical blast radius).

**The ten-finding ASC harvest is folded** (two batches; the staging file in the ASC repo is
deleted). Finding 1 was the hotfix; the status-flattening finding repointed ROADMAP's standing
kit entry from the closed kit#12533 to the open kit#12987 with severity raised and a cairn-side
mitigation now on the table; the other eight are filed in ROADMAP's Next tier (see the ASC
harvest block there). Two carry-forward corrections from the same harvest: the ASC edit-desk
hydration defect DOES NOT EXIST (corpus C had configured cairn's internal route shape, which
404s on ASC's single-mount admin; the real desks proved hydration-clean across 24 runs), and
what replaced it is worse, the kit#12987 status flattening composing with the 0.91.0 identity
guard to reopen the audited-404 hole (ROADMAP holds both).

**NEXT: the cairn.pub front-page voice sitting** (Fable sitting). **Resume prompt**, from
`~/Projects/cairn-cms`: "Brainstorm the cairn.pub front-page copy with me per
superpowers:brainstorming. This is the voice sitting Pass 3 deliberately carved out: the sixth
principle is ratified (the design language is enforced; the payoff is a developer less burdened,
never freed) and its substance lives in `docs/explanation/enforced-design.md` and the README's
'An enforced design language' section. The front page distills those in the site's own personal
voice; the `cairn-pub-front-page-voice` memory governs (personal voice over neutral definitional
intro, no pitch, brainstorm the copy with Geoff rather than drafting solo). The skills claim is
publishable: 0.91.1 ships `skills/`. Scope is the front-page treatment only; the principle-pages
pass (T1a through T1f) stays a separate queued pass. Ratified copy lands through the cairn.pub
repo's own deploy as the closing step."

Prior entry follows.

## Superseded same-day (2026-07-29: 0.91.0 published)

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

**Carry-forwards (live):** admin error statuses flattening to HTTP 200 under the shell's streamed
pending count (upstream sveltejs/kit#12987, OPEN; the previously tracked kit#12533 closed without
the shipped behavior changing, so the scheduled kit-watch routine needs repointing at #12987;
severity raised and a cairn-side mitigation weighed in ROADMAP's entry, 2026-07-29 ASC rendered
baseline); mermaid diagrams near-illegible at 320/390 (candidate: tap-to-expand in the Topo pass);
section-index breadcrumbs duplicating the arm name; the cairn.pub live admin smoke (Geoff's magic
link plus publish round-trip) is owed; the `/admin/help` first-steps card overlap. (The ASC
edit-desk hydration failure is REMOVED: the 2026-07-29 ASC rendered baseline disproved it, corpus
C had configured cairn's internal route shape, which 404s on ASC's single-mount admin, and the
real desks proved hydration-clean across 24 runs.)

**THEN, after the release: the Topo design pass.** Open with
`docs/internal/2026-07-18-topo-inspiration-review.md` (four-system synthesis, devices table, Starlight
anatomy checklist, section 5's open questions for Geoff; mockup candidates go to Geoff BEFORE any
build); the cairn.pub design arc ratified seed vocabulary for it: the four-door landing, the docs rail
on /help, the step-down doc heading scale, and the micro-cta device. After Topo: the scaffolder.

**Published state:** `0.92.0` is `latest` (2026-08-01): the design-ratchet minor (UA reset
layer, stacked field register with breaking default flip, narrowed `one-filled-action` with
the conformant dark selected state, three advisory geometry rules, the skill-exemplar compile
gate), on top of `0.91.1`. Nothing is held unpublished; `main` equals the registry.

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
