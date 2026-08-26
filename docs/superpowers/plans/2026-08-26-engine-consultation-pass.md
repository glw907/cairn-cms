# Pre-pass engine consultation: implementation plan

**Goal:** Build the consultation protocol (skill, agent, ledger, pass-skill hooks, CLAUDE.md
edits), run the whole-surface retroactive any-site audit, and re-review the two held
absorption plans, per the ratified spec.

**Spec:** `docs/superpowers/specs/2026-08-26-engine-consultation-design.md` (read it first;
tasks argue from it). Worked examples:
`docs/internal/record/2026-08-26-asc-harvest-triage.md`. Inputs record:
`docs/internal/record/2026-08-26-engine-consultation-inputs.md`.

**Token ceiling:** 12M (main loop plus subagents; the audit is the deliberate bulk, per the
sitting's thoroughness ruling). **Checkpoint interval:** 3 tasks (write STATUS at each
checkpoint, at any split, and before any question to Geoff).

**Execution model:** Main-loop conductor in this session. Tasks 1 to 7 are prose
infrastructure: governance-prose edits (Tasks 4 to 7) are surgical and land inline; the two
new authored artifacts (Tasks 2 and 3) are drafted inline against the required-content lists
below (they are governance prose, where the conductor's judgment is the work), then gated
through `cairn-register-editor`. Task 8 is the audit workflow (the plan names the workflow
mode here, which is the opt-in; the mandatory runaway guard applies). Tasks run in order; 8
depends on 1, 9 depends on 8.

**This is a docs-and-infrastructure pass:** no engine code changes, so the engine
check/test gate is skipped per `cairn-pass`; the doc gates (`check:docs`,
`check:arm-indexes`) run at every task that touches `docs/`, and the full CI-only gate
list runs at close as usual.

## Global constraints (from the spec; every task inherits these)

- The standard's two limbs and four constraints are quoted verbatim from the spec wherever
  they are restated; no paraphrase drift.
- The ledger records; it does not adjudicate. The charter adjudicates.
- Migration cost never discounts a verdict (standing ruling; churn is free until beta).
- Em dashes: banned in replies/commits; Google style (no surrounding spaces) in published
  docs; these deliverables are internal docs and skills, where the comment/agent-file
  conventions apply.
- Commit per task, specific files, `Co-Authored-By: Claude <noreply@anthropic.com>`.

---

### Task 1: The rulings ledger and the consultations directory

**Files:**
- Create: `docs/internal/engine-rulings.md`
- Create: `docs/internal/consultations/README.md`
- Modify: `docs/internal/README.md` (index both)

**Produces:** the ledger path and entry format every later task cites.

- [ ] **Step 1: Write `docs/internal/engine-rulings.md`.** Header states, in substance: one
  entry per ruled item; the ledger records rulings the charter has produced and the
  evidence that would reopen each; it is read before re-arguing a settled item, never in
  place of the charter's own test; entries are evidence for an argument, never a
  substitute for one. Entry format (a heading plus three labeled lines):

  ```markdown
  ## <slug>: <one-line item>  (verdict, YYYY-MM-DD, source)
  - **Verdict:** accept | decline | defer | keep | reshape | retire — one-sentence reason.
  - **Reopens on:** the named evidence that would qualify (or "closed" for executed accepts).
  - **Record:** link to the consultation, triage, or audit document holding the full argument.
  - **Any-site case:** (audit entries; required on every keep) the concrete anonymous-consumer scenario.
  - **Verified:** (audit entries; required on every family-originated export and every non-keep) the verifier pass that checked it.
  ```

- [ ] **Step 2: Seed it** from the 2026-08-26 triage's "Ruled out" section (eight entries:
  copy-to-clipboard control; `siteToday(timeZone)`; per-entry dead-body declaration;
  SQLite-backed D1 test tier; ExpandableRow `colspan` variant; warning button tier, held
  for Geoff; blanket admin list reset, superseded by the scoped form; the two below-bar
  toolkit idioms) plus the older standing rulings: the iCal-builder exclusion ("events are
  site domain"; source: the ASC consumer-brief scope check via
  `docs/internal/engine-harvest-candidates.md` §3) and the xcathletes multi-team-isolation
  deferral (same doc, §3, deferred at the site's own request). Every entry cites its source
  doc; reopen evidence comes from the source's own wording where it names one.
- [ ] **Step 3: Write `docs/internal/consultations/README.md`**: the filing rule
  (`YYYY-MM-DD-<site>-<pass>.md`, one document per consulting pass, brief and verdicts
  together; entries are never edited after the pass, matching `record/`'s convention), the
  four-field item schema quoted from the spec, and one sentence distinguishing this from
  `feedback/` (prospective per-item consultation vs retrospective DX measurement).
- [ ] **Step 4: Index both in `docs/internal/README.md`**, following its existing entry
  style.
- [ ] **Step 5: Gates.** Run `npm run check:arm-indexes` and `npm run check:docs`; both OK.
- [ ] **Step 6: Commit** (`docs: create the engine rulings ledger and consultations arm`).

### Task 2: The `engine-consult` skill

**Files:**
- Create: `~/.claude/skills/engine-consult/SKILL.md`

**Consumes:** ledger format from Task 1. **Produces:** the skill name both pass-skill edits
reference.

- [ ] **Step 1: Read `superpowers:writing-skills`** and follow it for structure and
  description wording (the description must trigger on pass-plan authoring for any
  engine-consuming repo, and on "consultation", "engine ask", "consult the engine").
- [ ] **Step 2: Author the skill.** Required content, each item present:
  - The protocol summary and when it fires (both hooks: authoring-time enumeration,
    pass-start backstop; quoted from spec §1).
  - Repos bound: any repo whose pass builds against the engine (the four sites, cairn-pub,
    future consumers), wherever the plan is authored.
  - The brief template (spec §1's four fields, as a copyable markdown skeleton) and the
    engine-side filing path `cairn-cms/docs/internal/consultations/YYYY-MM-DD-<site>-<pass>.md`.
  - The codified standard, verbatim from the spec (two limbs, four constraints, the
    fails-when line, the clean/even/beautiful goal).
  - The verdict vocabulary with the accept report-back rule (entry stays open until the
    consuming task lands; the consuming pass closes it with a one-line seam-fit report).
  - Triage mechanics: dispatch `engine-triage` (read-only, ledger-first); the conductor
    adjudicates; verdicts recorded in the brief document; ledger entries appended per
    Task 1's format.
  - The sequencing rule: accepted work sized at a task or two and additive runs as a mini
    engine pass now; public-surface breaks or new subsystems queue as a cairn-cms-launched
    pass with the fallback sanctioned interim plus a retirement trigger.
  - The cross-repo mini-pass checklist: one-executor check (`pgrep` on the worktree path,
    warm uncommitted changes, cairn STATUS read); register the worktree in cairn
    `docs/STATUS.md` before the first commit; fresh worktree off cairn `main`;
    `cairn-implementer` + `diff-reviewer` chains; read cairn `docs/STATUS.md` and the
    `Consumers must:` changelog convention; run the full gate list by name including the
    six CI-only checks (`check:comments`, `check:reference:signatures`, `check:surface`,
    `check:snippets`, `check:transcripts`, `check:symbols`); the ordered close: engine
    merge to `main`, `cairn-release`, `npm run link:consumer -- --restore`, then the site
    merge.
  - The reactive-harvest fallback: mid-pass discoveries still file, using the same
    four-field schema, triaged later through `engine-triage` against the same ledger;
    paste-then-delete staging mechanics unchanged.
  - First-run rule: the protocol's first live consultation appends a short post-mortem to
    the ledger.
- [ ] **Step 3: Verbatim check.** Compare the skill's standard block against the spec's
  "The standard" section with a literal diff (`diff` over the extracted blocks); only
  heading level and list markers may differ, every sentence of the two limbs, the four
  constraints, the fails-when line, and the clean/even/beautiful goal must match word for
  word. Mark the block with an HTML comment naming its source section so a later editor
  knows it is quoted, not authored.
- [ ] **Step 4: Register gate, advisory.** Dispatch `cairn-register-editor` over the file;
  its exemplars are cairn published prose, and this is an agent-facing instruction file,
  so fold only findings that hold for that genre and discard ones arguing from the editor
  or positioning registers.
- [ ] **Step 5: Commit.** The live file at `~/.claude/skills/` is a real file (verified;
  not a stow symlink); the dotfiles tree carries synced copies under
  `~/.dotfiles/claude/.claude/skills/`. Edit live, mirror the copy into the dotfiles
  tree, and commit there.

### Task 3: The `engine-triage` agent

**Files:**
- Create: `~/.claude/agents/engine-triage.md`

**Consumes:** the standard and ledger path from Tasks 1 and 2.

- [ ] **Step 1: Author the agent definition.** Follow the workstation charter's
  agent-facing register (Anthropic's Claude Code best practices), with
  `~/.claude/agents/diff-reviewer.md` as the in-tree shape exemplar (frontmatter fields,
  scope-limiting opening, output-shape section). Frontmatter: `name: engine-triage`,
  `model: claude-opus-5`, read-only tools (`Read, Grep, Glob, Bash`), description
  triggering on consultation triage and audit verification for cairn. Body, required
  content:
  - Role: the adversarial engine voice; independence comes from fresh context and model
    diversity.
  - First action: read `cairn-cms/docs/internal/engine-rulings.md`; a settled ruling is
    cited, not re-argued, unless the brief presents the named reopen evidence.
  - The codified standard, verbatim (same block as the skill).
  - Per-item output shape: verdict (accept/decline/defer), the argument with quoted
    evidence, shape notes on accept, reopen evidence on defer, reason on decline.
  - Both-directions framing, verbatim: "defending everything is as useless as condemning
    everything"; no accept-by-default and no decline-by-reflex.
  - The dual role note: in audit mode it verifies ranked verdicts per the audit brief it
    is handed.
- [ ] **Step 2: Verbatim checks.** Literal-diff the agent's standard block against the
  spec's section (same rules as Task 2 Step 3), and against Task 2's skill block, since
  the spec requires them to be the same block.
- [ ] **Step 3: Coverage gate, both files.** One fresh-context dispatch
  (`general-purpose`, `model: sonnet`; presence-checking, not judgment), handed the spec,
  both authored files, and both required-content lists verbatim from this plan, returning
  per bullet `present | absent | partial` with one quoted line as evidence. Fold any
  `absent` or `partial` before the register gate. This is the only gate these files get:
  they live at `~/.claude/`, out of reach of every repo check.
- [ ] **Step 4: Register gate, advisory** (same genre rule as Task 2 Step 4).
- [ ] **Step 5: Verify the agent resolves.** Dispatch `engine-triage` with a two-line smoke
  prompt ("read the ledger, return its entry count and format check as JSON") and confirm
  it runs read-only and returns.
- [ ] **Step 6: Commit** per Task 2 Step 5's live-then-mirror rule.

### Task 4: `site-pass` hooks

**Files:**
- Modify: `~/.claude/skills/site-pass/SKILL.md`

- [ ] **Step 0: Bank the negative control.** Copy the pre-edit
  `~/.claude/skills/site-pass/SKILL.md` and `plan-template.md` to the pass scratchpad as
  `site-pass-preedit.md` / `plan-template-preedit.md`; Task 10's cold-start test needs
  them, and the dotfiles copies are script-synced, so git is not a guaranteed source of
  what a session actually read.
- [ ] **Step 1: Add the authoring-time hook.** In "Starting a pass" step 2, immediately
  before "write a plan at": run the engine-contact enumeration per the `engine-consult`
  skill; the plan header records either the consultation-brief link or the one-line
  "no engine asks". Also add the same instruction to the pass-end step 8 sentence that
  runs the next pass's brainstorm while context is warm, since a plan drafted there must
  carry the line too.
- [ ] **Step 2: Add the backstop.** New numbered step between reading the plan and the
  first dispatch: if the plan header carries neither the brief link nor the null line,
  run the enumeration now, append the line to the committed plan, and only then dispatch;
  state it as a blocking precondition on the first dispatch.
- [ ] **Step 3: Update `plan-template.md`** in the same skill directory: add the
  consultation line to the plan header skeleton.
- [ ] **Step 4: Reread the diff for drift** (the skill's step numbering, the starter-prompt
  format section) and commit per Task 2's location rules.

### Task 5: `cairn-pass` hook

**Files:**
- Modify: `~/.claude/skills/cairn-pass/SKILL.md`

- [ ] **Step 1: Add to "Starting a plan"**: check `docs/internal/consultations/` for briefs
  whose verdicts are unrecorded or whose accepted items are queued for this pass; STATUS
  should name them, and an unanswered brief is worked before unrelated tasks.
- [ ] **Step 2: Add one line to the pass-end documentation step**: a pass that rules on a
  consultation item or executes an audit verdict updates `docs/internal/engine-rulings.md`
  in the same pass (accepts close with the seam-fit report line).
- [ ] **Step 3: Commit** per Task 2's location rules.

### Task 6: Workstation CLAUDE.md revision

**Files:**
- Modify: `~/.dotfiles/claude/.claude/CLAUDE.md` (the stowed source of
  `~/.claude/CLAUDE.md`; verify with `ls -la ~/.claude/CLAUDE.md` that it is the stow
  symlink and edit the dotfiles source)

- [ ] **Step 1: Revise the "Engine-level UI mechanics, every cairn site" section.**
  Consultation is the named primary path: engine edges are enumerated at plan-authoring
  time through the `engine-consult` skill, and accepted work lands ahead of the site task.
  The mid-pass filing duty stays as the fallback, keeping the automatic-trigger language
  ("a repeated local workaround is the loudest signal") intact. The staging-doc
  instructions repoint at the four-field schema and the ledger-backed triage
  (`cairn-cms/docs/internal/engine-rulings.md`). Keep the section's mechanic-vs-choice
  definitions and the worked-example pointer unchanged.
- [ ] **Step 2:** `cd ~/.dotfiles && stow -R claude`, confirm `~/.claude/CLAUDE.md` shows
  the edit, and commit in the dotfiles repo.

### Task 7: cairn-cms CLAUDE.md section

**Files:**
- Modify: `CLAUDE.md` (cairn-cms)

- [ ] **Step 1: Add a short section** (after "What cairn is"): the consultation protocol
  exists; briefs arrive at `docs/internal/consultations/`; rulings live in
  `docs/internal/engine-rulings.md`, the record of rulings the charter has produced and
  the evidence that would reopen each, read before re-arguing a settled item, never in
  place of the charter's own test; the `engine-consult` skill is canonical. Three to six
  sentences, no protocol duplication.
- [ ] **Step 2: Gates.** `npm run check:docs`. Commit.

### Task 8: The retroactive any-site audit (workflow mode; runaway guard armed)

**Files:**
- Create: `docs/internal/record/2026-08-26-any-site-audit.md` (the audit record)
- Modify: `docs/internal/engine-rulings.md` (verdict entries)

**Consumes:** ledger format (Task 1), `engine-triage` (Task 3).

- [ ] **Step 1: Enumerate the inventory mechanically, then derive the partition from it.**
  The spec's nine subsystem names are the grouping, not an exhaustive partition; "Nothing
  is exempt" sanctions extending them to span the real surface.
  - **(a) Regenerate first.** Run `npm run check:surface -- --update` and confirm zero
    diff, so the audit runs against HEAD (`api-surface.md` is a generated snapshot).
  - **(b) Unit.** One audit item is one unique symbol line in `api-surface.md`, deduped
    across subpaths, carrying a `surfaced at` list of every subpath exporting it. One
    symbol gets one verdict and one ledger entry. Two entries sharing a name with
    differing signatures stay two items, flagged to the coherence read. Derive the live
    counts at execution and record them in the audit record, not here.
  - **(c) Buckets, covering all 18 subpath headings exactly once:** adapter/concept
    model (`.`, `/ambient`); route factories (`/sveltekit`; note `createSectionAction`
    and `createD1AuditSink` live here, not under `/cloudflare`, despite the spec's
    bucket phrasing); admin shell + toolkit (`/components`, `/admin-toolkit`); auth
    family (`/auth-store`, `/auth-channel`, `/auth-crypto`); cloudflare + audit sink
    (`/cloudflare`); media (`/media`); delivery (`/delivery`, `/delivery/head`,
    `/delivery/data`); **render and build tooling** (new: `/render`, `/islands`,
    `/vite`); **reproductions harness** (new: `/reproductions`,
    `/reproductions/manifest`; family-originated by construction, so spec §4's
    provenance flag applies to every item in it).
  - **(d) The two export-less subsystems enumerate from named non-export sources, on
    contract shape rather than symbols:** the log vocabulary from
    `docs/reference/log-events.md` and `src/lib/log/` (one item per event name; the
    event names are the public-observable contract per `CLAUDE.md`); the spec's
    "doctor" slot widens to the CLI surface, all four `bin` commands (`cairn-doctor`,
    `cairn-manifest`, `cairn-media-seed`, `cairn-audit`), one item per check, command,
    flag-set, and output contract, from their `docs/reference/` pages plus `src/`.
  - **(e) Falsifiable reconciliation, blocking on Step 2.** The union of bucket
    membership equals the 18 `api-surface.md` subpath headings exactly, none omitted,
    none in two buckets; every `docs/reference/README.md` page maps to exactly one
    bucket (coverage direction only; do not reconcile page counts against export
    counts). A bucket that should carry exports or contract items and enumerates zero
    fails this step and is fixed before the workflow launches; the two export-less
    buckets are expected and still get ranking agents.
- [ ] **Step 2: Author and launch the workflow**, implementing all seven points of spec
  §4's shape, enumerated here so a miscount is visible on the page: (1) per-subsystem
  ranking agents, weakest-to-strongest anonymous-consumer case, quoted shaping evidence,
  verdicts on top of the ranking; (2) a provenance field per item; (3) verification
  following the ranking (weakest-ranked N per subsystem, every non-keep, every keep on a
  family-originated item; both-directions prompt); (4) the keep burden: a keep's return
  states the concrete anonymous-consumer scenario, and a keep whose argument is the
  absence of an objection routes to the verifier automatically, not at the conductor's
  discretion; (5) the second-vantage agent on the six 2026-08-01 suspects asking the
  wrong-premise question; (6) the whole-surface coherence read; (7) the trustworthiness
  auditor with authority to condemn the run, with two named condemn signatures:
  near-all-keep, and a missing or empty subsystem. Reviewer roles run on
  `claude-opus-5`. Arm the background runaway-guard poll on the workflow transcript dir
  (stall past ~25 min, or any agent file past ~900KB and growing).
- [ ] **Step 3: Adjudicate.** Read the trustworthiness verdict first; if it condemns the
  run, fix and resume via `resumeFromRunId` before reading anything else. Then adjudicate
  per-export verdicts, write the audit record (rankings, provenance, verdicts, arguments,
  the coherence findings), and append ledger entries per Task 1's format. Then run the
  completeness check that is the mechanical read of spec §7's acceptance bullet: no
  family-originated item's entry missing **Verified:**, no keep missing **Any-site
  case:**.
- [ ] **Step 4: File the remediation plan.** Reshape/retire items land in `ROADMAP.md`
  (Now tier, one entry for the audit remediation, itemized, sequenced before beta,
  batched into one `Consumers must:` window). Trivial retires (if any verdict is a pure
  deletion with no consumer) may execute inline here with the full gate list; anything
  else queues.
- [ ] **Step 5: Gates.** `npm run check:arm-indexes`, `npm run check:docs`. Commit.

### Task 8b: The internals audit (added mid-pass by Geoff, 2026-08-26)

**Scope addition, recorded per the pass-sizing rule.** Geoff's directives, verbatim: "We
should look at more than just the engine surface. Internals should be clean, beautiful,
and idiomatic sveltekit to the greatest degree that's reasonable." And: "The engine
itself needs to be inviting and comprehensible to for new developers and easy for AI
agents to extend." And, third: "The site chassis is also a critical part of this effort,
and deservices an agressive review an round of improvement based on the changes in the
egine." [sic] This extends the audit's altitude, not its posture: the same standing
goal (clean, even, beautiful), the same thoroughness ruling, the same trustworthiness
gate. The internals bar has three limbs: idiomatic SvelteKit, inviting and comprehensible
to a new developer, easy for an AI agent to extend. The chassis (`examples/showcase`, the
starting copy every next theme receives) gets the aggressive REVIEW inside this pass's
workflow; its round of IMPROVEMENT depends on the engine changes the audits produce, so it
files into the audit-remediation initiative as its own pass, sequenced after the engine
reshapes and before beta (the third scope addition to this pass; the split is the
pass-sizing rule applied, raised to Geoff in-session).

**Files:**
- Extend: `docs/internal/record/2026-08-26-any-site-audit.md` (internals section)
- Modify: `ROADMAP.md` (remediation items fold into the same audit-remediation entry)

- [ ] **Step 1: Enumerate the internals mechanically** (src/ module map with sizes; the
  partition mirrors the surface buckets where the code does, plus the engine-only areas:
  log internals, CLI implementations, build scripts, tests layout).
- [ ] **Step 2: Author and launch the internals workflow** after the surface workflow
  completes (serial, never concurrent with it). Standards handed to every agent: the
  idiom charter (`docs/internal/code-idioms.md`), Svelte 5 runes and SvelteKit 2 idiom,
  and the three-limb bar (idiomatic; inviting and comprehensible to a new developer;
  easy for an AI agent to extend). Per-area rankers (findings ranked worst-first, no
  empty returns), two blind vantage walks (a cold new-developer comprehension walk, and
  an AI-agent extension walk that attempts a plausible extension task and reports where
  the path breaks), a verification pass on the worst-ranked and every rewrite-tier
  finding, a whole-codebase coherence read (one designed codebase), and the
  trustworthiness auditor with the same condemn signatures. Reviewer roles on
  `claude-opus-5`; runaway guard armed. An eleventh ranker area covers the site chassis
  (`examples/showcase`, file list banked): judged on the same three limbs PLUS its two
  chassis-specific duties, exemplifying how a site should consume the engine (the
  anonymous consumer's first artifact) and serving as the starting copy every theme
  receives; both vantage walks include the chassis in their path.
- [ ] **Step 3: Adjudicate and record** in the audit record; remediation items fold into
  the same ROADMAP entry and, where consumer-visible, the same `Consumers must:` window.

### Task 9: Re-review the two held plans

**Files:**
- Modify: `docs/superpowers/plans/2026-08-26-toolkit-seams-pass.md`
- Modify: `docs/superpowers/plans/2026-08-26-harvest-detection-pass.md`

**Consumes:** the ratified standard, the audit rulings (Task 8).

- [ ] **Step 1: Dispatch `engine-triage`** once per plan: verify each task against the
  codified standard and any audit ruling touching its surface (the StatusChip grammar
  item is the worked example of ruling 3: engine re-tunes, never transplants). Output:
  per-task verdict (stands / revise with the change named / drop with reason).
- [ ] **Step 2: Fold the verdicts** into each plan (revise or annotate tasks; a dropped
  task's ledger entry records the reason) and stamp each plan header
  "re-reviewed against the consultation standard, 2026-08-26".
- [ ] **Step 3: Commit.**

### Task 10: Ledgers, ROADMAP, memory, close

**Files:**
- Modify: `ROADMAP.md`, `docs/STATUS.md`, `docs/HISTORY.md`
- Create: memory `engine-consultation-protocol.md` + `MEMORY.md` line

- [ ] **Step 1: ROADMAP.** Update the "Toward 1.0" framing: beta waits for the new ASC
  site and ecxc deliberately (the consultation runway); the "seams have held" clock
  starts after those consultations stop producing accepts. Mark the Now-tier consultation
  entry done and remove it (the remediation entry from Task 8 replaces it).
- [ ] **Step 2: Cold-start test, both paths (dispatched, never walked by this session).**
  The conductor authored Task 4's wording and cannot grade a cold read of it. Three
  dispatches, `general-purpose`, `model: sonnet` (explicit; an unpinned dispatch inherits
  Fable). Each prompt hands only the file path to read, the scenario, and "report your
  first five actions in order, each quoting the skill line it came from, then stop
  without acting." The prompt names no engine, consultation, or `engine-consult` term,
  or it cues the answer it is testing.
  - **(a) No-plan path.** Scenario: a site repo whose `docs/STATUS.md` names pass N with
    a starter prompt and no plan file exists. Reads the edited `SKILL.md` plus
    `plan-template.md`. Pass: an enumeration action appears before the "write a plan at"
    action. Fail: plan-writing first, or no enumeration in five actions.
  - **(b) Committed-plan path.** Scenario: STATUS names pass N, its plan is committed,
    and the plan header carries neither a brief link nor the "no engine asks" line.
    Pass: no `site-implementer` dispatch before an enumerate-and-append action. Fail: a
    dispatch precedes it.
  - **(c) Negative control.** Run (b)'s prompt verbatim against Task 4 Step 0's pre-edit
    copy. It must fail (dispatch first); a control that passes means the probe is
    reading the agent's prior rather than the wording, and (a) and (b) prove nothing
    until the prompt is reshaped and all three re-run.
  On any failure, fix the skill wording and dispatch a new agent; never re-prompt a
  graded one. Paste all three action lists into the Step 4 post-mortem verbatim; they
  are the acceptance evidence for spec §7's last bullet.
- [ ] **Step 3: Memory entry** (`type: project`): the protocol exists, the ledger and
  consultations paths, the both-hooks trigger, the sequencing rule, beta-waits-for-two-
  sites. Index line in `MEMORY.md`.
- [ ] **Step 4: Close per `cairn-pass`** (docs-only variant): post-mortem appended to this
  plan; STATUS rewritten (present tense; the held plans' next action now reads "approved
  pending Geoff" or their revised state); HISTORY entry; full doc-gate list
  (`check:docs`, `check:arm-indexes`); commit; prep the context clear with the exact
  resume prompt.
