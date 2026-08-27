# Foundations B: Narrowing and Closure (remediation initiative, slice 2b)

> **For agentic workers:** three tasks, SERIAL. Dispatch the `cairn-implementer` /
> `diff-reviewer` chain per task with the Agent tool; the full gate inside the chain. Task 1
> is the pass's `model: opus` candidate (a public-signature change the initiative builds on).

**Token ceiling (WHOLE pass, chains plus ritual): 1.8M.** **Checkpoint interval:** every
task. **Worktree:** `foundations-b` off `main` after the foundations-a merge (its committed
`docs/internal/api-surface.md` is this pass's derivation input). **Detailed task bodies are
FINALIZED against foundations A's merged state before dispatch; this draft encodes the
structure and the ruled design.**
**Shared files:** `docs/internal/engine-rulings.md` (Tasks 1, 2), `CHANGELOG.md` (every
task), `docs/reference/sveltekit.md` (Tasks 1, 3).
**Initiative frame:** `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md`
(slice 2b; its standing-constraints block applies).
**Evidence base, read from source, never memory:** `coherence-v2.md` (C3 at `:225-231`, C10),
`rank-route-factories.md` (ranks 1-30 at `:58-`; rank 74 at `:635-644`),
`verify-route-factories.md` IN FULL (it overturns verdicts in both directions: rank 47
`InboundLink` retire-to-keep, rank 62 `PublishActionLink` keep-to-retire, rank 38
`UploadResult` reshape-to-retire, ranks 66/69/72/78 reshape-to-keep, rank 99 `SlotDef`
reshape-to-keep; a re-derivation that skips it re-proposes settled flips), the ledger
(shapes repaired by foundations A), `docs/internal/api-surface.md`.

**Goal:** the deliberate `ContentRoutes` narrowing (C3's sanctioned exception, done the way
C3 actually prescribes), then the single R4 closure re-derivation over the settled surface,
emitting the retires pass's input with its ratification gate.

---

## Task 1: Narrow the factory's PUBLIC return; the composer keeps the wide INTERNAL one

**Files:** `src/lib/sveltekit/content-routes.ts`, `src/lib/sveltekit/cairn-admin.ts`, the
five janitorial-action test files (`content-routes-media-bulk`, `-media-replace`,
`-media-orphan`, `-media-alt`, `cairn-admin-actions`) plus any of the 38
`createContentRoutes`-referencing test files the repoint touches, a new compile-only
hand-mount fixture, `docs/reference/sveltekit.md` (the return block regenerates),
`docs/internal/api-surface.md`, `docs/internal/engine-rulings.md`
(`audit-sveltekit-contentroutes`, shape repaired by foundations A), `CHANGELOG.md`.

**The structural decision, ruled after two reviews (the cosmetic alternative fails
silently):** `check:surface` renders the full declared return of every public callable, so a
public factory with a wide return keeps every janitorial type publicly named and the closure
retires NOTHING. Therefore: an UNEXPORTED `createContentRoutesInternal` returns the wide
object (the composer `cairn-admin.ts` drives ALL 35 members and repoints to it); the public
`createContentRoutes` is a thin wrapper whose DECLARED return is the narrow `ContentRoutes`
interface, exactly as C3 prescribes ("declare the narrow type deliberately and have the
factory's signature return it, rather than hand-mirroring a wide one",
`coherence-v2.md:230-231`). The pinned key-order comment stays true of the public shape.
Count honesty: the return has 35 members (the audit's own documents say 30, 35, and 36 in
different places; 35 is measured).

- [ ] Membership rule, positive and enumerable (the "driven set" cannot discriminate; the
      composer drives all 35): a member is OUT iff it is reachable only from the engine's
      own Media Library screen AND its result/failure types sit in the ranks 1-30 retire
      closure (this covers the janitorial trio AND the four media-mutation actions,
      `mediaReplaceAction`/`mediaAltPropagateAction`/`mediaDeleteAction`/`mediaUpdateAction`,
      whose failure types are ranks 14-30 retires); everything the hand-mount path
      legitimately wires is IN, and `ContentFormFailure` (a keep) stays in the public unions
      it already inhabits. The task report enumerates every excluded member with its rank
      citation; the diff review checks the enumeration against the rule.
- [ ] The executable proof, both directions: a compile-only hand-mount fixture (in the
      pattern of `env-genericity.test.ts`, including its no-suite Vitest workaround block)
      wires every narrow-set member the way the reference teaches, loads and actions alike
      (actions assignability into kit's `Actions` slot is checkable); dropping an IN member
      reds it. It imports internal paths, so it proves the SOURCE type; `check:surface`'s
      diff proves the PUBLISHED narrowing and carries the too-wide direction (the excluded
      members must be absent from the rendered signature).
- [ ] `check:reference:signatures` in the acceptance by name (the reference return block
      must regenerate or CI reds).
- [ ] CHANGELOG `Consumers must:` for anyone naming the wide type or an internalized member.
- [ ] Acceptance: full gate green including the fixture; the api-surface diff shows the
      narrow public return; ledger entry closed against the repaired shape; entries whose
      retirement this task already consumed close here as consequences (the standing
      constraint puts the close in the executing task; Task 2 verifies).

## Task 2: The single R4 closure re-derivation; the retires pass's input

**Files:** a new record document `docs/internal/record/<date>-r4-rederivation.md`,
`docs/internal/engine-rulings.md` (progress annotations; closes belong to Tasks 1 and
foundations A's Task 2, which this task VERIFIES against the `check:surface` diff).

- [ ] Derivation input is `docs/internal/api-surface.md` as of Task 1; the original audit
      derivation was MANUAL (no closure tooling exists under `scripts/`; proceed by hand or
      write a scratch script and say which).
- [ ] Re-test the `C2_READDED` keeps (`root-barrel-prune.test.ts:89-112`, 22 names) and the
      three closure leaks (`NavIcon`, `EngineScreenId`, `SlotKind`;
      `2026-08-26-any-site-audit.md:93-97`), READING the verifier corpus first (its
      overturns are settled; do not re-propose them).
- [ ] Reconciliation, premise corrected: the ledger's bucket totals reproduce the record's
      (535/384/57/94 exact; nine of eleven buckets exact); the entire discrepancy is ONE
      item in each of two buckets in opposite directions (route-factories 72/52 vs 71/53;
      admin-shell-toolkit 35/19 vs 36/18). A two-item hunt, not a 94-slug enumeration; the
      48 in `coherence-v2.md:496` is the pre-verification tally, superseded by the 33
      verification overturns.
- [ ] The three lists: (a) retires already consumed by foundations A Task 2 and this pass's
      Task 1, VERIFIED against the `check:surface` diff (their closes happened in the
      executing tasks; this task audits them); (b) retires still requiring manual execution
      (the retires pass's work list), including the re-evaluation of foundations A's
      recorded R4 re-exports against the narrowed closure; (c) PROPOSED verdict changes,
      each argued in one sentence with evidence, diffed against foundations A's recorded
      move set so churn on moved names is visible.
- [ ] THE RATIFICATION GATE: list (c) goes to Geoff at the pass-end checkpoint BEFORE the
      retires pass plan is authored; the charter adjudicates, the ledger records.
- [ ] Acceptance: `check:docs` green; the three lists plus the named exclusion
      (`DEFAULT_ROLES`) partition the 94 exactly; list (a) matches the surface diff.

## Task 3: Drift for the internalized names

**Files:** every `docs/` page and `src/` comment naming an internalized member (scope:
`docs/`, `src/`, `examples/`, `templates/`), `docs/extend/migration-notes.md`.

- [ ] `grep -rn` per internalized name across the four trees; repoint or rewrite every hit;
      the gate-coverage residual stated honestly as in foundations A.
- [ ] `migration-notes.md` gains the narrowing entry.
- [ ] Acceptance: full gate green; the sweep's zero-hit proof recorded per name class.

---

## Pass-end notes

`diff-reviewer` per task plus a pass-end `engine-triage` dispatch verifying Task 2's lists
against the ledger and the repaired shapes (an error multiplies into the retires pass). The
retires pass plan is authored AFTER Geoff rules on list (c), never from the audit's original
94-item list.
