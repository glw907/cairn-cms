# Design infrastructure Pass 3: capture

> **For agentic workers:** execute task-by-task by dispatching each task to
> `cairn-implementer` (pinned Sonnet); the orchestrator reviews each diff and confirms the
> full gate before the next dispatch (this pass runs the dispatches through a sanctioned
> workflow with a fresh-context Opus review stage per task). Steps use checkbox (`- [ ]`)
> syntax for tracking. The plan commits on `main`; everything else runs on the feature
> worktree `design-infrastructure-pass-3` branched from LOCAL `main` (which is ahead of
> origin), with `npm install` run in the worktree root AND `examples/showcase` before any
> gate (the CLAUDE.md symlink gotcha).

**Goal:** the capture ships: the two-register chip recipe lands and cairn's own error tier
goes clean, the audit gains the ratified demotion and the post-hydration page-identity
guard, and the package gains `skills/` carrying the standard doc, the two annotated
exemplars, the form-anatomy contract, the craft chapter, the extension grammar, and the
calibrated grader prompt, with the coverage contract, rationale doc, README positioning,
and the upgrade rename recipe alongside.

**Architecture:** engine work first (Tasks 1–5) so the capture describes a settled toolkit;
then the skill package (Tasks 6–11), whose always-loaded core is budget-gated and whose
heavy material loads on demand; then the trial instrumentation and narrative (Tasks 12–14).
The skill lives at `skills/cairn-admin-screens/` (SKILL.md plus `references/`), joins the
package `files` array, and is installed and freshness-checked by `cairn-doctor`.

**Spec:** `docs/superpowers/specs/2026-07-27-cairn-design-infrastructure-design.md`,
sections 5, 7, 8, 10, and the **2026-07-28 amendments** (the three rulings and two scope
decisions; read them before starting). Evidence:
`docs/internal/2026-07-design-infrastructure-audit-calibration.md` section 12.

## Global constraints

- **Rule formulas are untouched.** The only audit-engine diffs this pass may carry:
  `chip-ground-collision`'s `tier` field and header note (Task 3), the
  `stock-default-hazards` guidance string (Task 2), and the harness page-identity guard
  (Task 4). Every other repair stays filed in ROADMAP. A reviewer finding a formula edit
  outside these three rejects the task.
- **No invented values.** The chip registers' exact colors/mixes are measured and ratified
  by the Task 1 probe read before Task 2 writes them anywhere.
- **Visual drift only from the ratified recipe and the Task 5 fixes**, landing in ONE
  baseline regeneration at pass end (CI dispatch on `main`, eyes-on read). From Task 2
  until then the showcase `admin-visual` suite is expected red; every other showcase e2e
  spec stays green at every commit.
- **Full gate per task:** targeted tests green, `npm run check` 0/0, `npm test` exit 0.
  Tasks changing public surface also clear `npm run check:reference` and
  `npm run check:package`; packaging tasks also `npm run check:surface`.
- **Prose budget is enforced, not aspirational.** The skill's always-loaded core
  (SKILL.md) stays within 3,500 estimated tokens, gated by a counting check (Task 7).
- Suppression discipline unchanged: counted directives with reasons, only ratified
  exceptions.
- CHANGELOG entries under `## Unreleased` (the `<!-- release-size: minor -->` marker
  already stands). No version bump, no publish; the release is a separate deliberate act
  after the voice sitting.
- Comments follow TSDoc; the em dash is banned in comments. Published docs prose follows
  the Google standard plus `docs/internal/docs-register.md`; Task 13's artifacts
  additionally pass the register gates before merge.

---

## Phase 1: the engine slice

### Task 1: The chip-register probe (values ratified before implementation)

**Files:**
- Create: `examples/showcase/src/routes/probe-chips/+page.svelte` (temporary; deleted in
  this same task after the read)

**Outcome:** ratified exact recipes for the two registers, recorded in the task's commit
message and consumed verbatim by Task 2.

- [ ] **Step 1:** Build a probe page rendering candidate recipes side by side in BOTH
  themes, on card ground and page ground: (a) BOUNDED candidates, `badge-outline` re-tuned
  so the border clears 3:1 against its ground in both themes (candidate axis: the
  `status-chip` border demote percentage, currently 35% of currentColor, raised until the
  measured ratio clears 3.0, plus one full-token candidate using `--color-base-content`
  mixes); (b) QUIET candidates, borderless tinted grounds derived from tokens (candidate
  axis: `color-mix` of the theme's neutral/`base-content` over `base-200`/`base-300` at
  two or three percentages), each visibly distinct from both grounds in both themes.
- [ ] **Step 2:** Measure every candidate with the audit's own contrast measurement (the
  `border-contrast` / `chip-ground-collision` helpers), print the ratio table, and capture
  labeled screenshots of both themes.
- [ ] **Step 3:** Orchestrator eyes-on read picks one bounded and one quiet recipe.
  Acceptance: bounded border ≥3.0 measured in both themes; quiet ground distinct in both
  themes while claiming no border (border-width 0). Record the ratified values.
- [ ] **Step 4:** Delete the probe route; commit the probe evidence (screenshots under
  `docs/internal/probes/2026-07-28-chip-registers/`, ratio table in the commit message).

### Task 2: The two-register StatusChip, and the ghost retirement

**Files:**
- Modify: `src/lib/admin-toolkit/StatusChip.svelte` (registers; the line 15-22 refuted
  note rewrites to record the new ruling)
- Modify: `src/lib/components/EditPage.svelte:989` (statusBadge derivation) and the pill
  markup at `:1465-1468`
- Modify: `src/lib/components/cairn-admin.css` (DELETE the pinned rule at 607-610 and its
  "rule 5 of 5" comment block at 595-606; add the register recipes in `@layer components`)
- Modify: `src/lib/components/CairnAdminShell.svelte:774` (CMS pill re-tokens onto the
  quiet register's recipe, dropping raw `border-base-300`)
- Modify: `src/lib/components/ReferenceField.svelte`, `MediaCaptureCard.svelte`,
  `ManageEditors.svelte` (bare `badge-outline` sites move onto the bounded register)
- Modify: `src/lib/audit/rules/static/stock-default-hazards.ts:11-14` (`BADGE_GHOST_MESSAGE`
  now points at the two registers, naming quiet as the sanctioned put-away recipe)
- Modify: `src/lib/components/admin-css-safelist.ts`, `scripts/admin-css.input.css` (class
  inventory follows the recipe; nothing ships unscanned or unsafelisted)
- Modify: `src/lib/audit/norms-manifest.json` via `npm run norms:generate`
- Test: StatusChip unit fixtures; static-audit fixture proving the ghost error is gone

**Interfaces:**
- Produces: `StatusChip` prop `register: 'bounded' | 'quiet'` (default `'bounded'`),
  emitting the Task 1 ratified recipes. Tasks 5, 7, and 8 consume this API and vocabulary.

- [ ] **Step 1:** Failing tests first: StatusChip emits the ratified class strings per
  register; `badge-ghost` appears nowhere in `src/lib`; the built sheet carries no
  unlayered `.badge-ghost` rule.
- [ ] **Step 2:** Implement the registers and migrate every listed site. EditPage's
  settled states (Published) take quiet; attention states stay bounded. The audit's OWN
  static run over the tree must lose its one error without gaining any.
- [ ] **Step 3:** `npm run norms:generate`; full gate; `admin-visual` goes expected-red
  here and stays red until the pass-end regen.
- [ ] **Step 4:** Commit (`feat(admin): StatusChip carries the two ratified chip registers`).

### Task 3: Demote chip-ground-collision

**Files:**
- Modify: `src/lib/audit/rules/rendered/chip-ground-collision.ts` (tier: `'advisory'`;
  header gains the corpus C demotion note and the filed repair pointer)
- Modify: `docs/reference/cairn-audit.md` (tier tables)
- Modify: `CHANGELOG.md`
- Test: tier fixture; a run whose only findings are chip-ground findings exits 0

- [ ] **Step 1:** Failing test: the rule reports `advisory` and does not gate the exit code.
- [ ] **Step 2:** Change the tier, update header, reference tables, changelog; full gate.
- [ ] **Step 3:** Commit (`fix(audit): demote chip-ground-collision to advisory pending the
  chroma repair`).

### Task 4: The post-hydration page-identity guard

**Files:**
- Modify: `src/lib/audit/rendered.ts` (guard after hydration settles, before rules run)
- Modify: `docs/reference/cairn-audit.md` (rendered-mode contract documents the guard)
- Test: fixture page that SSRs admin content then client-swaps into foreign chrome (the
  ASC hydrated-404 shape), proving the guard trips

**Outcome:** a page whose post-hydration DOM no longer matches its SSR identity is
reported as UNMEASURABLE for that route (a named harness finding, not rule findings), and
the run says so; it never silently audits the wrong page again.

- [ ] **Step 1:** Failing test with the swap fixture: rules must NOT run on the swapped
  page; the report must carry the page-identity refusal with the route name.
- [ ] **Step 2:** Implement: capture an SSR identity marker per route (the served HTML's
  admin shell/main landmark identity), re-check after hydration settle; on mismatch, emit
  the refusal and skip the page's rules. The mechanism must not depend on cairn-only
  markup (consumer custom routes and the shell-less login page both stay auditable).
- [ ] **Step 3:** Full gate; reference page updated in the same task.
- [ ] **Step 4:** Commit (`fix(audit): rendered mode refuses pages that lose their
  identity after hydration`).

### Task 5: Own-tree error-clean

**Files:**
- Modify: `src/lib/components/ConceptList.svelte:216,343-361` (sort controls reach a 24x24
  effective target; expanded hit area, not font inflation)
- Modify: `src/lib/admin-toolkit/ListToolbar.svelte:357-373,555-563` (segmented control
  composes at 320/390 without horizontal overflow)
- Test: targeted rendered-audit runs over the affected routes

**Outcome:** the full rendered audit over cairn's own admin (both themes, the default
route list) reports ZERO error-tier findings, no new suppressions.

- [ ] **Step 1:** Failing evidence first: run the rendered audit on the two routes and
  record the current `touch-targets` and `viewport-overflow` errors.
- [ ] **Step 2:** Fix both sites; re-run: error tier zero on the full default route list,
  both themes. Advisories are recorded, not chased.
- [ ] **Step 3:** Full gate; capture a local (uncommitted) `admin-visual` reference set as
  the phase's drift yardstick.
- [ ] **Step 4:** Commit (`fix(admin): clear the audit's own-tree error tier`).

## Phase 2: the packaged skill

### Task 6: skills/ scaffold, packaging, and cairn-doctor delivery

**Files:**
- Create: `skills/cairn-admin-screens/SKILL.md` (frontmatter, the tier map, the done-gate;
  the standard-doc body arrives in Task 7)
- Create: `skills/cairn-admin-screens/references/` (empty except a README naming the
  on-demand files Tasks 8–11 add)
- Modify: `package.json` (`files` gains `"skills"`), `scripts/check-package-files.mjs`
- Modify: `src/lib/doctor/assemble.ts` plus a new check module (install + freshness:
  copies the packaged skill into the consumer's `.claude/skills/cairn-admin-screens/` on
  `--fix`, reports missing/stale by content hash otherwise)
- Modify: `docs/reference/doctor.md`, `docs/reference/cairn-audit.md` cross-pointer
- Test: doctor check fixtures (missing, stale, fresh); packaging test that `npm pack`
  carries `skills/`

- [ ] **Step 1:** Failing tests: pack-list includes `skills/**`; doctor reports the three
  states correctly.
- [ ] **Step 2:** Implement scaffold, files array, doctor checks; reference pages in the
  same task. Full gate including `check:package` and `check:surface`.
- [ ] **Step 3:** Commit (`feat(skill): the package ships and doctors the admin-screens
  skill`).

### Task 7: The standard doc (the always-loaded core)

**Files:**
- Modify: `skills/cairn-admin-screens/SKILL.md`
- Create: `scripts/check-skill-budget.mjs`; wire into `npm test` (unit) and the `check:package`
  chain
- Test: budget check red above 3,500 estimated tokens

**Outcome:** the thin core an agent always loads: screen anatomy (including the ratified
affirmative half, "the primary action sits in the header slot", stated as guidance with
its judgment condition), the per-component contract pointers (`cairn-audit norms` queries,
never inlined tables), the register rules (one filled action per surface; chip passivity
naming the two registers and when each applies; facet quietness), and the section 7
done-gate verbatim (static audit, rendered audit both themes, grader self-run for novel
compositions; green audit reported as vocabulary-clean, never design-done; builder-added
suppressions flagged in the builder's own report).

- [ ] **Step 1:** Budget check first (failing on an over-budget fixture), then draft the
  core. Every rule that is mechanical points at the audit rather than restating it.
- [ ] **Step 2:** Full gate plus budget check green on the real SKILL.md.
- [ ] **Step 3:** Commit (`feat(skill): the standard doc core within its token budget`).

### Task 8: The two annotated exemplars and the form-anatomy contract

**Files:**
- Create: `skills/cairn-admin-screens/references/exemplar-list.md` (the Members list
  screen), `references/exemplar-detail.md` (the members/[id] detail/slide-over),
  `references/form-anatomy.md`
- Source material (read-only): `~/Projects/aksailingclub-org/src/routes/admin/club/members/+page.svelte`
  and `[id]/+page.svelte`; `docs/design-benchmark/decisions.md` (the two-level label
  ruling); cairn's ClassForm label-wrap debt record

**Outcome:** each exemplar carries the real markup skeleton annotated line by line with
WHY (which register rule, token, or contract each choice serves), covering the three trial
genres (list, detail/slide-over, form). The form-anatomy contract states the row/label
register as normative rules, not description.

- [ ] **Step 1:** Draft all three from the named sources; annotations reference the
  Task 2 register vocabulary and the grammar roles by name.
- [ ] **Step 2:** Full gate (`check:package` carries the new files); commit
  (`feat(skill): the annotated exemplars and the form-anatomy contract`).

### Task 9: The extension grammar and the grader prompt

**Files:**
- Create: `skills/cairn-admin-screens/references/extension-grammar.md` (the derivation
  ladder; ONE worked derivation shown step by step; the graduation feedback loop)
- Create: `skills/cairn-admin-screens/references/grader-prompt.md` (the coherence-read
  prompt: multi-state captures, 390 and 1440 plus an interaction state, both themes,
  per-device verdicts, tell list output)

- [ ] **Step 1:** Draft both; the worked derivation derives a real component the toolkit
  lacks (pick from the trial's expected Assets needs) from tokens + norms + register
  rules, each step naming its source.
- [ ] **Step 2:** Full gate; commit (`feat(skill): the extension grammar and grader
  prompt`).

### Task 10: Grader calibration against the archived labeled captures

**Files:**
- Create: `docs/internal/2026-07-grader-calibration-ledger.md`
- Modify (if calibration demands): `skills/cairn-admin-screens/references/grader-prompt.md`
- Source (read-only): `~/Projects/aksailingclub-org/docs/design-benchmark/probes/`
  (`2026-07-20-members-toolkit/`, `2026-07-21-classes/`) and `decisions.md`

**Outcome:** the shipped prompt, run k=3 on a pinned model against the archived captures,
reproduces the known verdicts (Members read 1 FAIL with the 8-tell family; the Classes
reads; the refinement-round PASSes) by consensus. The ledger records prompt hash, exact
model ID, k, per-run verdicts, and the consensus rule. Calibration failures amend the
prompt and re-run; the ledger keeps every round.

- [ ] **Step 1:** Assemble the labeled set with its known verdicts; run k=3; record.
- [ ] **Step 2:** Iterate the prompt until the known verdicts reproduce; pin and hash.
- [ ] **Step 3:** Commit (`docs(internal): the grader calibration ledger; prompt pinned`).

### Task 11: The craft chapter, proven by its acceptance protocol

**Files:**
- Create: `skills/cairn-admin-screens/references/craft.md`
- Create: `examples/showcase/src/routes/probe-craft/+page.svelte` (the fixed plain-daisy
  fixture; kept, it is the protocol's standing fixture)
- Create: `docs/internal/2026-07-craft-chapter-acceptance.md` (protocol record)
- Source (read-only): `~/Projects/aksailingclub-org/docs/2026-07-15-asc-invisible-polish-brief.md`

**Outcome:** the chapter translates the invisible-polish catalogue through the four
ratified forms (tokenize / numeric rule / before-after paired render / audit-rule
pointer), and PASSES spec criterion 5: a fresh Sonnet agent that has never seen a cairn
screen, given the fixture and the chapter alone, produces an after-state the calibrated
grader (k=3, pinned prompt and model) judges measurably moved toward the cairn feel, with
the pass condition stated in the protocol record BEFORE the run.

- [ ] **Step 1:** Draft the chapter; build the fixture; write the pre-stated pass
  condition into the protocol record.
- [ ] **Step 2:** Run the protocol (fresh agent, before/after captures, k=3 grader).
  A FAIL amends the chapter and re-runs; the record keeps every round.
- [ ] **Step 3:** Full gate; commit (`feat(skill): the craft chapter, acceptance-proven`).

## Phase 3: instrumentation and narrative

### Task 12: The pre-registered coverage contract

**Files:**
- Create: `docs/internal/2026-07-assets-trial-coverage-contract.md`

**Outcome:** the enumerated claim perimeter, written from the SHIPPED artifacts (not
intentions): the type and gap roles by name, the register rules, the anatomy of the three
exemplar genres, the craft chapter's named phenomena, the done-gate steps. The (a)/(b)
tell classification of spec section 9 runs against this document.

- [ ] **Step 1:** Draft strictly from Tasks 7–11's landed content; anything not shipped is
  not claimed.
- [ ] **Step 2:** Commit (`docs(internal): the Assets trial coverage contract`).

### Task 13: Rationale doc, README positioning, upgrade recipe (orchestrator-drafted)

Main-loop drafting, NOT a Sonnet dispatch; gated by `register-check` (mechanical slop
gate, `cairn-register-editor`, logic pass) plus Vale before commit.

**Files:**
- Create: `docs/explanation/enforced-design.md` (the rationale: section 1's thesis, the
  bet, the condition, ASC as the proof case; the no-pitch keystone governs)
- Modify: `README.md:7-23` (the ledger goes five to six; the sixth principle states
  ENFORCED, not merely documented, and the payoff as LESS burdened, per the STATUS ruling;
  the skills claim is now true and lands here, never earlier)
- Modify: `docs/guides/upgrade-cairn.md` (the grammar-release entry: the `type-scale`
  rename recipe, `text-sm`-family to `type-*` roles, stated as the mechanical rename it
  is, with the safelist reachability note)
- Modify: `docs/reference/admin-toolkit.md` (StatusChip registers), `docs/reference/README.md`
  index if pages were added

**The cairn.pub front-page copy is explicitly NOT here** (spec amendment: a dedicated
voice sitting after this task's rationale doc exists; STATUS carries the pointer).

- [ ] **Step 1:** Draft all three; run the register gates; fold findings.
- [ ] **Step 2:** `check:reference` green (StatusChip register prop documented); commit
  (`docs: the rationale doc, the six-principle ledger, and the rename recipe`).

### Task 14: Consolidation (ROADMAP, CHANGELOG, STATUS)

**Files:**
- Modify: `ROADMAP.md` (absorbed items OUT: page-identity guard, ConceptList targets,
  ListToolbar overflow, StatusChip recipe, chip-ground repair-or-demote flag resolves to
  the demotion with the chroma repair staying filed; rule-formula repairs and the
  stock-hairline mass stay, with the demotion noted on the chip line)
- Modify: `CHANGELOG.md` (every consumer-visible change under `## Unreleased`, one
  `Consumers must:` line per breaking edge; the ghost retirement and register migration
  land here)
- Modify: `docs/STATUS.md` (the pass entry; NEXT = the front-page voice sitting, then the
  norms.yml rehearsal, then the release via `cairn-release`, then the ASC Assets trial)

- [ ] **Step 1:** Update all three; verify no absorbed ROADMAP line survives.
- [ ] **Step 2:** Commit (`docs(status): Pass 3 consolidation`).

## Pass end (the cairn-pass ritual, on the worktree then main)

- [ ] `code-simplifier` over the pass's changed code; apply; full gate.
- [ ] Reviewer fan-out (fresh contexts, parallel): `svelte-reviewer`,
  `daisyui-a11y-reviewer` over the UI diffs; findings triaged, fixes gated.
- [ ] Full gate battery: `npm run check` 0/0, `npm test`, `check:reference`,
  `check:package`, `check:surface`, `check:comments`, static + rendered audit own-tree
  (error tier zero), norms freshness.
- [ ] Post-mortem appended to this plan; merge worktree to `main` (no squash, per repo
  convention); delete worktree.
- [ ] Push `main` to origin (Geoff-sanctioned this pass; batches the 41 held commits plus
  Pass 3).
- [ ] CI baseline regeneration: `e2e.yml` `workflow_dispatch` with `update_snapshots` on
  `main`; eyes-on read of every changed image against the ratified recipe and Task 5
  fixes; land; confirm `e2e` green.
- [ ] STATUS and the initiative memory refreshed; the next-session resume prompt recorded
  (the voice sitting).
