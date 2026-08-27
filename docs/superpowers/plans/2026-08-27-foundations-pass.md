# Foundations Pass (remediation initiative, slice 2)

> **For agentic workers:** five tasks, SERIAL, in numeric order (Task 1's ledger repair is a
> PREREQUISITE of Tasks 2-4: the assigned shapes they execute are among the truncated
> entries). Below six tasks: dispatch the `cairn-implementer` / `diff-reviewer` chain per
> task with the Agent tool; the full gate inside the chain. Tasks 2 and 3 are the pass's
> `model: opus` candidates (each declares public shape the whole initiative builds on).

**Token ceiling (WHOLE pass, chains plus ritual): 3M** (calibration: toolkit-seams spent
~4.3M for six lighter-read tasks; Tasks 1 and 4 here consume the ~660KB rank corpus and the
3,981-line ledger). **Checkpoint interval:** three tasks. **Worktree:** `foundations` off
`main` after BOTH the harvest-detection and csrf-hardening merges (a two-branch chain;
neither is merged at authoring time). **Shared files (supersedes any independence claim):**
`docs/internal/engine-rulings.md` (Tasks 1, 2, 3, 4), `CHANGELOG.md` (every task),
`docs/reference/sveltekit.md` (Tasks 2, 3, 5), `docs/internal/api-surface.md` (Tasks 2, 3
via `check:surface -- --update`).
**Initiative frame:** `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md`
(the foundations slice; its standing-constraints block applies to every task here).
**Evidence base, read from source, never memory:**
`docs/internal/record/2026-08-26-any-site-audit/coherence-v2.md` (the canonical-home rule at
`:130-140` and `:844-847`; C3's narrow-view exception at `:228-231`; the sequencing notes at
`:509-521`), `rank-route-factories.md` (ranks 1-13 at `:58-150`; rank 74 at `:635-644`), the
ledger's audit section.

**Goal (ratified 2026-08-27, foundations-first, superseding both retire-first and
narrowing-first):** settle everything the retire list depends on, in the audit's own order —
the canonical-home rule first among code changes ("it changes which subpath each surviving
item is published from, so doing it second means touching every reshaped item twice"), the
deliberate `ContentRoutes` narrowing (C3's sanctioned exception), then ONE R4 closure
re-derivation over the settled surface, emitting the retire list the retires pass executes.
The audit's fall-out claims are unreconciled (13 itemized as ranks 1-13; "~30" asserted at
bucket level; buckets themselves drift 48/52/53 across documents), so this pass SETTLES the
number rather than assuming it.

---

## Task 1: Ledger repair (prerequisite infrastructure)

**Files:** `docs/internal/engine-rulings.md`, the `rank-*.md` sources under
`docs/internal/record/2026-08-26-any-site-audit/`, a scan script shipped beside the docs
gates (`scripts/checks/`), `package.json` (the script entry).

**The defect, measured:** 67 ledger entries carry a `(shape: …)` parenthetical inside their
`Reopens on:` line (there is no `shape:` field in the entry format); 55 of them are truncated
to exactly 162 characters (160 plus a synthetically appended `).`), all ending balanced, many
mid-word. The truncation cut off, among others, the `audit-sveltekit-contentroutes` shape at
`:1487` exactly where it named the internal wide shape and its consumer — the fact Task 3
depends on.

- [ ] The detector keys on the REAL signature: the fixed 162-character length (a mid-word or
      unbalanced-paren heuristic passes 10 of the 55, measured). Run it, record the count
      (expect 55), repair, show zero.
- [ ] Repair is RE-AUTHORING, not lookup: the shape texts were synthesized from the rank
      entries' prose, not copied (verified on samples), so each of the 55 means reading its
      rank entry and rewriting the assigned shape in substance. This is the pass's largest
      single unit of work; budget and checkpoint accordingly. Where the rank source itself
      is ambiguous, mark the entry `shape-needs-rederivation` rather than inventing.
- [ ] The scan ships as a docs gate (the ledger is load-bearing infrastructure for four more
      slices); wire it beside the existing `check:docs`-family scripts and name it in the
      task report.
- [ ] File the `MediaInsertPopover` deferral as its own ledger entry (today a sub-clause at
      `:39-40` inside the `mediaherofield-export` verdict): evidence, verdict (internal,
      deferred), `Reopens on: the MarkdownEditor seam collapse`, cross-referencing
      `audit-admin-markdowneditor` (`:2295`) by slug so the trigger has an in-ledger
      listener.
- [ ] Acceptance: scan reports zero at 162; `check:docs` green; the repaired
      `audit-sveltekit-contentroutes` shape names the internal-shape consumer in full.

## Task 2: The canonical-home rule, ratified and executed

**Files:** `src/lib/*/index.ts` barrels per the rule's moves, `src/lib/sveltekit/index.ts`
re-exports where R4 requires them, `docs/reference/` pages per moved item,
`docs/internal/api-surface.md` (via `check:surface -- --update`),
`docs/internal/engine-rulings.md` (the R-1 family entry closes), `CHANGELOG.md`
(`Consumers must:` per moved import path), `docs/extend/migration-notes.md`.

- [ ] Read the R-1 recommendation (`coherence-v2.md:130-140`, `:844-847`) and the ledger's
      canonical-home entries FIRST; the rule is ratified as written there (one canonical
      home per item; re-exports only where the R4 closure requires them from a second
      subpath, in the toolkit-seams `MediaLibraryEntry` mold: a re-export from the stated
      canonical home is not a second home).
- [ ] Execute the moves for SURVIVING items only (no retire is executed here; an item whose
      audit verdict is retire keeps its current home until the retires pass deletes it —
      moving it first would be the double-touch this ordering exists to prevent).
- [ ] Both in-tree consumers and the docs compile/link throughout (`check:consumers`, the
      scaffold job's waymark compile, `check:docs`, `check:snippets`).
- [ ] Acceptance: full gate green; every moved item's reference page shows the canonical
      home; one `Consumers must:` block enumerating the import-path changes; ledger entry
      closed with the executed rule's statement.

## Task 3: Narrow `ContentRoutes`, deliberately

**Files:** `src/lib/sveltekit/content-routes.ts` (the exported type and factory),
`src/lib/sveltekit/cairn-admin.ts` (the composer consumes the WIDE internal shape),
`docs/reference/sveltekit.md` (the 36-member return block regenerates),
`docs/internal/api-surface.md`, `docs/internal/engine-rulings.md`
(`audit-sveltekit-contentroutes`, shape repaired by Task 1), a new compile-only hand-mount
fixture, `CHANGELOG.md`, tests.

**The design decision, made here and cited so the conventions pass cannot reopen it:** the
factory keeps an INTERNAL wide return (the composer `cairn-admin.ts` drives 35 of the 36
members, including every janitorial action; rank 74's "components import them directly"
parenthetical is false for the composer, which reaches them through the factory return), and
the PUBLIC surface narrows: `ContentRoutes` becomes a deliberately declared interface of
what a hand-mounting site legitimately wires, per C3's own sanctioned exception for exactly
this case (`coherence-v2.md:228-231`, "declare the narrow type deliberately"). The pinned
key-order comment at `content-routes.ts:99-101` stays true of the public shape.

- [ ] Membership comes from the audit's driven-set analysis (ranks 1-13's undriven members
      are out; the hand-mount set `docs/reference/sveltekit.md` documents for wiring is the
      candidate in-set), NOT from "what the docs teach" (the docs teach all 36, so that
      criterion cannot discriminate). The task report lists every excluded member with its
      rank citation.
- [ ] The internal wide shape is exported from no subpath; the composer imports it via the
      internal module path; `check:surface` proves the public narrowing.
- [ ] The executable coverage proof is a NEW compile-only hand-mount fixture (a `.ts` file
      in the test tree wiring every narrow-set member the way `docs/reference/sveltekit.md`
      teaches, compiled by the gate): dropping a legitimately-wired member from the narrow
      type reds it. The in-tree consumers compiling is NOT proof (both use `createCairnAdmin`
      and never touch the factory; verified).
- [ ] `check:reference:signatures` is in the acceptance by name (the 36-member block at
      `sveltekit.md:884-924` must regenerate or CI reds).
- [ ] CHANGELOG `Consumers must:` for anyone naming the wide type or an internalized member.
- [ ] Acceptance: full gate green including the fixture and `check:reference:signatures`;
      ledger entry closed against the repaired shape.

## Task 4: The single R4 closure re-derivation; the retire list

**Files:** a new record document `docs/internal/record/2026-08-27-r4-rederivation.md`,
`docs/internal/engine-rulings.md` (progress annotations only, no deletions).

- [ ] Derivation input is `docs/internal/api-surface.md` as of Tasks 2-3 (the committed
      golden of every export's rendered shape); the original audit derivation was MANUAL (no
      closure tooling exists under `scripts/`; say so and proceed by hand, or write a scratch
      script and say which).
- [ ] Re-test the adapter's `C2_READDED` keeps (the list lives in
      `src/tests/unit/root-barrel-prune.test.ts`) and the three closure leaks the audit
      names (`NavIcon`, `EngineScreenId`, `SlotKind`;
      `2026-08-26-any-site-audit.md:93-97`).
- [ ] The record document is the retires pass's input: three lists with slugs — (a) retires
      already consumed by Tasks 2-3 (their ledger entries close as consequences, verified by
      `check:surface` diff, not intention); (b) retires still requiring manual execution;
      (c) PROPOSED verdict changes from the re-test, each argued in one sentence with
      evidence. Reconcile the counts while at it (the record says 53 route-factory retires,
      `coherence-v2.md:496` says 48, the ledger prefix yields 52; slug prefix does not map
      to bucket — resolve by slug enumeration). Every one of the 94 retire slugs appears in
      exactly one list or in the named exclusion (`DEFAULT_ROLES`, owned by the conventions
      pass's coupled pair).
- [ ] THE RATIFICATION GATE, named: list (c) is proposals, not rulings. The conductor
      batches every keep-to-retire flip on a public export into the pass-end checkpoint
      question to Geoff, BEFORE the retires pass plan is authored; the charter adjudicates,
      the ledger records the outcome.
- [ ] Acceptance: `check:docs` green; the three lists partition the 94 exactly; list (a)
      matches the `check:surface` diff.

## Task 5: Drift and docs for the settled surface

**Files:** every `docs/` page and `src/` comment naming a moved or internalized member
(drift-hunt scope: `docs/`, `src/`, `examples/`, `templates/`),
`docs/extend/migration-notes.md`.

- [ ] `grep -rn` per moved/internalized name across the four trees; repoint or rewrite every
      hit. The gates cover only slices of this: `check:snippets` sees fenced ts/svelte
      blocks under the four published doc arms only; `check:reference:signatures` sees
      callable signature blocks; prose, `docs/internal`, `src/lib` comments, `examples/`,
      and `templates/` are UNGATED and rely on the grep sweep (state the residual honestly
      in the task report; do not claim a gate proves this task).
- [ ] `migration-notes.md` gains the pass's entries (canonical-home moves; the narrowing) in
      the per-version record's form.
- [ ] Acceptance: full gate green; the grep sweep's zero-hit proof recorded per name class.

---

## Pass-end notes

Reviewer fan-out: `diff-reviewer` per task plus a pass-end `engine-triage` dispatch
verifying Task 4's three lists against the ledger AND the repaired shapes (an error here
multiplies into the retires pass). No component work, no visual read, no admin smoke. The
retires pass plan is authored AFTER this pass's record document exists and Geoff has ruled
on list (c), never from the audit's original 94-item list.
