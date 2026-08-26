# Pre-pass engine consultation: design (2026-08-26)

Ratified in the 2026-08-26 brainstorm over
`docs/internal/record/2026-08-26-engine-consultation-inputs.md`. This spec supersedes that inputs
brief; the brief stays as the record of the problem framing and Geoff's four rulings, which
this design implements. The worked examples live in
`docs/internal/record/2026-08-26-asc-harvest-triage.md`.

## The problem, one paragraph

Site development harvests engine friction reactively: a site pass builds against whatever
the engine ships, hand-rolls around gaps, files a staging doc, and the engine absorbs the
findings later, so the site pays for the workaround and the engine pays again to replace
it. This design moves the exchange before the pass: the site files what its pass will
press on the engine, an adversarial engine voice triages each item, and accepted work
lands ahead of the site task that needs it.

## The standard (codified; extends the 2026-08-26 triage test)

An item reaches the engine only when:

- the site **cannot legally reach or patch the surface** (engine-owned CSS, an unexported
  component, a component's internal event contract), or
- a **ratified, measured grammar has diverged** from what the engine ships.

Constraints on top of that gate:

1. **No accept-by-default.** Decline-with-reason is a normal, recorded outcome.
2. **The bar is the anonymous consumer.** Family recurrence ("three of my sites need it")
   is evidence toward generality, never sufficient by itself. The test is whether a cairn
   consumer with no knowledge of this family plausibly hits the same edge.
3. **Shape, not just membership.** Accepted functionality is re-derived in the form
   easiest for any site, never transplanted from the requesting site's implementation,
   even when that leaves the requesting site doing some hand-rolling. Worked example: the
   StatusChip absorption takes ASC's ratified grammar but re-tunes every measured value
   against the engine's own themes.
4. **The standard applies retroactively** (the audit, below).

An item fails the gate when the hand-roll is small, domain-shaped, or a discoverability
problem an export would not fix.

## 1. The consultation protocol

**Trigger.** `site-pass` pass-start gains a mandatory step between the brainstorm and
plan-writing: the engine-contact enumeration. For each thing the pass will build, the
conductor asks whether it presses an engine edge (admin surface, engine CSS, an exported
component's contract, auth, any seam). Exactly two outcomes: a consultation brief, or a
recorded one-line "no engine asks" in the plan header. The null outcome is deliberately
cheap; the trigger is reliable because it is a numbered step in a skill that already fires
at every pass start, not prose in a backlog.

**The brief.** One document per consulting pass, filed engine-side at
`cairn-cms/docs/internal/consultations/YYYY-MM-DD-<site>-<pass>.md`. The site plan links
to it. Filed engine-side because that is where the ledger lives and where a later engine
session will look; the brief and the engine's verdicts are one document.

Per item, four fields:

1. **What the pass builds** (the site feature, one paragraph).
2. **The engine edge it presses** (surface, `file:line` where known).
3. **Evidence for the any-site case** (recurrence, measurements, prior instances).
4. **The site's fallback if declined**, with its rough size. This field prices the
   decline for the triage, and on a decline it becomes the sanctioned end state.

**The triage.** The `engine-triage` agent (fresh-context, read-only, pinned
`claude-opus-5`) argues each item against the standard above, reading the rulings ledger
first. The conductor adjudicates its verdicts and records them in the same document.

**The three verdicts.**

- **Accept**: with shape notes (the any-site form, re-derived) and a sequencing call
  (mini pass now, or queued engine pass with the fallback sanctioned interim and a
  retirement trigger).
- **Decline**: with a recorded reason, into the ledger. The site's declared fallback is
  thereby sanctioned as the proper end state, not debt.
- **Defer**: names the evidence that would reopen it (usually a second consumer) and
  records that trigger.

## 2. The rulings ledger

A standing file, `cairn-cms/docs/internal/engine-rulings.md`: one entry per ruled item,
carrying the verdict, the reason, and what new evidence would qualify to reopen it. The
triage agent reads it before arguing anything, so a settled decline is never re-litigated
for free.

Seeded at birth from the 2026-08-26 triage's "Ruled out" section and the older standing
rulings scattered through the record docs (the iCal exclusion, the D1 test-tier "out of
scope", the blanket admin list reset). The retroactive audit's verdicts land in the same
ledger, so consultation and audit share one memory.

## 3. Session topology (ratified: one conductor, agent voice)

The site pass session holds both sides. Triage is an agent dispatch, not a session
boundary; independence comes from fresh context plus model diversity, the same pattern as
`diff-reviewer`.

**Accepted work, sized at a task or two and additive**, runs as a mini engine pass from
the same session:

- Fresh worktree off cairn `main`, after the one-executor check (`pgrep` on the path,
  warm-changes check, cairn STATUS read).
- `cairn-implementer` and `diff-reviewer` chains as normal; both are user-scoped agents,
  available from any cwd, and subagents start with zero context regardless.
- The `engine-consult` skill carries the cross-repo checklist compensating for the cairn
  context a site-launched session does not auto-load: cairn `docs/STATUS.md`, the
  changelog `Consumers must:` convention, and the full CI gate list including the six
  CI-only checks named in `cairn-pass`.
- The site consumes via `npm run link:consumer` during development; the engine change is
  on the registry before the site pass closes (the existing "a consumer needs it now"
  release trigger). A site branch cannot merge on a `file:` pin.

**Anything that breaks public surface or adds a subsystem** is initiative-scoped by the
existing rules and queues as its own cairn-cms-launched pass; the site's fallback is
sanctioned interim state with a recorded retirement trigger. The size threshold and the
session threshold are the same line.

## 4. The retroactive any-site audit (ratified: whole surface, this pass)

**Scope.** The entire public surface, enumerated mechanically from
`docs/internal/api-surface.md` (the `check:surface` snapshot) plus the `package.json`
export map, grouped into subsystems: the adapter and concept model, the route factories,
the admin shell and toolkit components, the auth family (`/auth-store`, `/auth-crypto`,
`createAuthChannel`), `/cloudflare` and the audit sink, media, delivery (`publishedAt`,
`newlyPublishedEntries`), the log vocabulary, and the doctor. Nothing is exempt. The six
2026-08-01 suspects (`createAuthChannel`, `createSectionAction`, `createD1AuditSink`,
`/auth-store`, `/cloudflare`, `publishedAt`/`newlyPublishedEntries`) get the deepest
argument because their shaping evidence was a requirement rather than a consumer;
`docs/internal/engine-harvest-candidates.md` flagged exactly that risk.

**Shape.** A workflow, named in the pass plan (which is the opt-in): one agent per
subsystem argues the anonymous-consumer case per export (would a consumer with no
knowledge of this family plausibly hit this edge, and is this the leanest shape for
them), a fresh verifier adversarially checks each non-keep verdict, and the conductor
adjudicates. The standard runaway guard applies.

**Verdicts** are *keep*, *reshape* (right membership, wrong form), or *retire*, each with
its argument recorded in the rulings ledger.

**Execution of verdicts.** The audit produces verdicts and a remediation plan, not
diffs. Trivial retires may inline into this pass; anything reshape-sized queues as engine
work filed into `ROADMAP.md`, sequenced before beta while reshaping is a cheap 0.x
event. `Consumers must:` batching covers the rollout.

## 5. Claude infrastructure deliverables

- **New user-scoped skill `engine-consult`**: the canonical protocol. The brief template,
  the codified standard, the verdict vocabulary, the ledger conventions, and the
  cross-repo mini-pass checklist. Both pass skills reference it rather than duplicating
  it.
- **New user-scoped agent `engine-triage`**: read-only, pinned `claude-opus-5`, prompted
  with the standard, instructed to read the ledger first. The engine voice for
  consultation triage and the audit's verifier role.
- **`site-pass` edit**: the mandatory engine-contact enumeration step at pass-start,
  pointing at `engine-consult`.
- **`cairn-pass` edit**: a pass-start check for unanswered consultation briefs, and a
  note that consultations and the audit write the ledger.
- **The rulings ledger**, created and seeded as described in section 2.
- **Workstation `~/.claude/CLAUDE.md` edit**: revise the "Engine-level UI mechanics"
  section. Consultation becomes the named primary path; the mid-pass filing duty stays
  as the fallback with its automatic-trigger language intact; the staging-doc
  instructions repoint at the four-field schema and the ledger-backed triage. Without
  this edit the workstation rule and the skill would describe two different protocols.
- **cairn-cms `CLAUDE.md` edit**: a short durable-orientation section naming the
  protocol, the consultations directory, the ledger (which adjudicates scope questions
  alongside the charter), and the `engine-consult` skill.
- **No site-repo CLAUDE.md edits**, deliberately. The trigger lives in `site-pass`,
  user-scoped, firing at every pass start regardless of repo; four copies would be four
  drift surfaces guarding one mechanism that cannot be skipped. Revisit only if a site
  grows a pass ritual outside `site-pass`.
- **A memory entry** so a cold session recalls the protocol and the ledger location.

## 6. The reactive harvest, and the two held plans

The reactive harvest duty stays as the mid-pass fallback; consultation cannot foresee
what a pass discovers while building. What changes is format and destination: a mid-pass
staging doc adopts the same four-field item schema as the brief, and its later triage
runs through the same `engine-triage` agent against the same ledger. One standard, one
memory. The paste-then-delete staging mechanics stay as they are.

The two held absorption plans (`2026-08-26-toolkit-seams-pass.md`,
`2026-08-26-harvest-detection-pass.md`) are re-reviewed against the ratified standard and
any audit rulings touching their surfaces before approval. That re-review is a task in
this pass, not a separate event.

## 7. Acceptance

The pass is done when:

- the `engine-consult` skill and `engine-triage` agent exist;
- both pass skills carry their hooks, and both CLAUDE.md edits have landed;
- the ledger exists, seeded;
- the audit has run over the whole surface, every verdict recorded, and the remediation
  plan filed into `ROADMAP.md`;
- the two held plans carry their re-review verdicts;
- the cold-start test passes: a fresh site-pass session, reading only its skills, hits
  the consultation gate unprompted.

The first live consultation (likely the next ASC or 907-life pass) is the real proof;
the protocol's first run gets a short post-mortem appended to the ledger.
