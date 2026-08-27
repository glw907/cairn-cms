# Narrowing Pass (remediation initiative, slice 2)

> **For agentic workers:** five tasks, SERIAL (Task 2 consumes Task 1's narrowed type; Task 3
> is independent but shares the ledger file with Tasks 4 and 5). Below six tasks: dispatch
> the `cairn-implementer` / `diff-reviewer` chain per task with the Agent tool; the full
> gate inside the chain. Task 1 is the pass's one `model: opus` candidate (it declares a new
> public type shape the whole initiative builds on).

**Token ceiling (WHOLE pass, chains plus ritual): 1.4M.** **Checkpoint interval:** four
tasks. **Worktree:** `narrowing` off `main` after the csrf-hardening merge.
**Initiative frame:** `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md`
(the narrowing slice; its standing-constraints block applies to every task here).
**Evidence base:** the audit's coherence findings, read from the source files, not from
memory: `docs/internal/record/2026-08-26-any-site-audit/coherence-v2.md` (the sequencing
section at `:509-521` and `:844-861`) and the `rank-*.md` files it cites; the ledger's audit
section.

**Goal:** settle the surface's load-bearing type before anything is deleted. `ContentRoutes`
is currently `ReturnType<typeof createContentRoutes>` including ~30 action keys no site
drives; closing the R4 nameability rule over that wide type is what over-generated the
route-factory retires. This pass declares the narrow return deliberately, re-derives the R4
closure over it, and emits the DEFINITIVE retire list the retires pass executes. It also
repairs the ledger as infrastructure so every later slice can read its assigned shapes.

**Why this slice leads (ratified 2026-08-27, superseding literal retire-first):** ~30 of the
53 route-factory retires fall out of the narrowing as consequences, and the retire list's
membership is not settled until the closure re-derives; hand-deleting first would touch the
same files twice against an unstable list.

---

## Task 1: Narrow `ContentRoutes`, deliberately

**Files:** `src/lib/sveltekit/content-routes.ts` (the type declaration and the factory
return), `docs/reference/sveltekit.md`, `docs/internal/api-surface.md` (via
`check:surface -- --update`), `docs/internal/engine-rulings.md` (the C3 coherence entry this
executes), tests that pin the narrowed shape.

- [ ] Read the C3 recommendation in `coherence-v2.md` and the relevant `rank-*.md` sections
      FIRST; the narrow type is declared explicitly (an interface naming what a site
      legitimately drives), never re-derived as `ReturnType` of anything. The factory's
      return is annotated with it; excess members become internal.
- [ ] The declared type is the plan's one novel design act: it must cover every documented
      consumer usage (grep `docs/extend/` and `docs/reference/` for `ContentRoutes` and every
      factory-return member the docs teach; the showcase and `templates/waymark` compile
      unchanged, which is the executable proof of coverage).
- [ ] A type-level test pins the narrowed shape (an `Expect`-style assertion or the
      `check:surface` snapshot serves; state which carries it).
- [ ] CHANGELOG entry with `Consumers must:` for anyone who closed over the wide type (the
      documented migration: name the narrow type; internal members are no longer reachable).
- [ ] Acceptance: full gate green; both in-tree consumers compile; reference page documents
      the deliberate type; ledger entry closed with the seam-fit line.

## Task 2: Re-derive the R4 closure; emit the definitive retire list

**Files:** a new record document
`docs/internal/record/2026-08-27-r4-rederivation.md`, `docs/internal/engine-rulings.md`
(annotations, not yet deletions), the closure tooling if any exists (locate how the original
audit computed nameability before hand-rolling anything).

- [ ] Recompute the R4 nameability closure over the NARROWED type: which `/sveltekit` leaves
      are still named by public signatures, which fall out.
- [ ] Re-test the adapter's ~22 `C2_READDED` keeps and the three closure leaks the audit
      names (`ROADMAP.md:298-301`); any keep that loses its ground or any new retire is
      RECORDED as a proposed verdict change, not executed here (the retires pass executes).
- [ ] The record document is the retires pass's input: three lists with slugs — (a) retires
      that fell out with the narrowing (already gone; their ledger entries close as
      consequences of Task 1), (b) retires still requiring manual execution, (c) proposed
      verdict changes from the re-test (each argued in one sentence with its evidence).
      Every one of the 94 audit retire slugs appears in exactly one list or in the named
      exclusions (the `DEFAULT_ROLES` coupled pair, owned by the conventions pass).
- [ ] Acceptance: `check:docs` green; the ledger's touched entries carry progress notes; the
      record document's list (a) matches what Task 1 actually removed (verified by
      `check:surface` diff, not by intention).

## Task 3: Ledger repair (the truncated shapes)

**Files:** `docs/internal/engine-rulings.md`, the `rank-*.md` sources under
`docs/internal/record/2026-08-26-any-site-audit/`, a one-off verification script (scratch,
not shipped) or an extension to an existing docs gate if one fits.

- [ ] ~30 reshape entries carry `shape:` fields truncated mid-sentence at ~200 characters
      (`engine-rulings.md:3851`, `:136`, `:1487`, `:2298`, `:2418`, `:2523`, `:2562`,
      `:3094`, and siblings with the same signature). Regenerate each from its `rank-*.md`
      source so the assigned shape is complete; where the source itself is ambiguous, mark
      the entry `shape-needs-rederivation` rather than inventing.
- [ ] Verification that can red: a scan (script or test) asserting no `shape:` field ends
      mid-word or with an unbalanced parenthesis; run it, show the current count, fix, show
      zero. State whether the scan ships as a gate or stays a one-off (recommend: ship it
      beside the docs gates; it is cheap and the ledger is now load-bearing
      infrastructure for four more slices).
- [ ] Acceptance: the scan reports zero; `check:docs` green.

## Task 4: File the `MediaInsertPopover` deferral as a first-class ledger entry

**Files:** `docs/internal/engine-rulings.md`.

- [ ] The deferral currently survives only as a sub-clause inside another item's verdict
      (`engine-rulings.md:39-40`). File it under its own heading with the standing form:
      the evidence (ASC's insert-flow need, the toolkit-seams pass's decline reasoning), the
      verdict (internal, deferred), and `Reopens on: the MarkdownEditor seam collapse (the
      internals pass)`, so the trigger has a listener.
- [ ] Acceptance: ledger formatting consistent; `check:docs` green.

## Task 5: Drift and docs for the narrowed surface

**Files:** every `docs/` page and `src/` comment naming a member that Task 1 internalized
(the drift-hunt scope is `docs/`, `src/`, `examples/`, `templates/` per the initiative
spec), `docs/extend/migration-notes.md`.

- [ ] `grep -rn` per internalized member name across the four trees; repoint or rewrite
      every hit (the reference-coverage gate catches the reference arm only; the prose arms,
      `src/lib` comments, and the showcase are ungated).
- [ ] `migration-notes.md` gains the narrowing's entry (the same `Consumers must:` content
      as the CHANGELOG, in the per-version record's form).
- [ ] Acceptance: full gate green including `check:docs` and `check:snippets` (docs code
      blocks may name internalized members; they compile against the built package, so this
      gate is the falsifier).

---

## Pass-end notes

Reviewer fan-out: `svelte-reviewer` is not needed (no component work); the review gate is
`diff-reviewer` per task plus a pass-end `engine-triage` dispatch verifying the record
document's three lists against the ledger (the retires pass builds on them; an error here
multiplies). No visual work, no admin smoke (no `/admin` behavior change). The retires pass
plan is authored AFTER this pass's record document exists, never from the audit's original
94-item list.
