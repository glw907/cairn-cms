# The retires pass: executing list (b) (remediation initiative, slice 3)

> **For agentic workers:** three tasks, SERIAL (Tasks 1 and 2 both move the surface snapshot
> and the ledger; Task 3 verifies the settled result). Dispatch the `cairn-implementer` /
> `diff-reviewer` chain per task with the Agent tool; the full gate inside the chain. No task
> is an `opus` candidate: every deletion is verdict-settled and mechanically specified by the
> ratified record; judgment calls route to the conductor, not to a stronger implementer.

**Token ceiling (WHOLE pass, chains plus ritual): 2.5M** (foundations B spent ~2.4M on a
narrower diff; this pass is wider but mechanical, and its reviews verify enumerations rather
than re-derive closures). **Checkpoint interval:** every task; the conductor writes STATUS
and re-states spend at each checkpoint, and flags at 80% by name. **Worktree:** `retires` off
`main` at the commit that carries the ratified record (the ruling section is the pass's
input; verify `docs/internal/record/2026-08-30-r4-rederivation.md` section 7 contains "RULED
(Geoff, 2026-08-30)" before the first dispatch).
**Shared files (why the tasks are serial):** `docs/internal/engine-rulings.md`,
`docs/internal/api-surface.md`, `scripts/checks/check-surface-reexports.json`,
`CHANGELOG.md`, `docs/extend/migration-notes.md`.
**Spec:** `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md` (slice
3; its standing-constraints block applies verbatim, including `templates/waymark` compiling
at the gate and the drift-hunt scope of `docs/`, `src/` comments, `examples/`, and
`templates/`).
**The ratified input, read from source, never memory:**
`docs/internal/record/2026-08-30-r4-rederivation.md` — section 3's list (b) table (63 rows
as written), section 5's F-1 table (19 rows), and section 7's RULED subsection, which
supersedes both counts: list (b) as executed is **62** (the 63 minus `AdminActionOptions`,
`audit-sveltekit-adminactionoptions` at ledger `:1887`, which moved to list (c) Tier 3), of
which **18 are the sanctioned F-1 rows** (section 5's table minus `AdminActionOptions`) and
**44 are unsanctioned** (plain deletions with no leak consequence). List (c) is 32 (Tier 1:
25, Tier 2: 6, Tier 3: 1) and is NOT touched by this pass beyond progress annotations.
`DEFAULT_ROLES` (`audit-adapter-default-roles`, ledger `:276`) is the named exclusion and
must survive the pass unchanged.

**Goal:** delete the 62 ratified retires from the public surface where they stand, close
their ledger entries, record the 18 accepted closure leaks by name, and re-derive the
re-export record so the surface snapshot, the ledger, and the leak record agree.

## Global constraints

- Retires die in place: delete the export (and the declaration, when nothing internal still
  uses it) where it stands. No relocations, no reshapes, no new exports. A declaration still
  consumed internally loses only its `export` keyword and its barrel/subpath publication.
- Every deletion closes its ledger entry in the established form (`Reopens on: closed.
  Executed by the retires pass, Task N: ...`). An entry whose `Shape:` line is still
  truncated (on `scripts/checks/check-rulings-format-allowlist.json`) is repaired from its
  rank source in the same edit and removed from the allowlist; `npm run check:rulings-format`
  green after every task.
- `npm run check:surface -- --update` with the regenerated `docs/internal/api-surface.md`
  committed in the same task as the deletions it reflects; the re-export record only ever
  SHRINKS this pass (the re-derivation removes entries the closure no longer requires; it
  records nothing new — a green gate proves membership, never justification).
- Per deleted name, the drift hunt: `grep -rn` across `docs/`, `src/` (comments), `examples/`,
  `templates/`, and `scripts/`; repoint or delete every hit; retained-hit classes are the ones
  foundations B's Task 3 established (implementation history, tests being deleted alongside,
  ledger, CHANGELOG, historical plans/specs/records), enumerated per name class in the task
  report. `devDelivery` alone is cited in six showcase files (initiative design §3).
- The reference arm must drop each deleted name's rows in the same task
  (`check:reference`/`check:reference:signatures` stay green precisely because coverage and
  the export map move together), and `check:docs` guards the inbound links.
- One rolled `CHANGELOG.md` entry per task under `## Unreleased`, each with the `Consumers
  must:` lines for its names (a deleted type a consumer might reference is a breaking change;
  the sanctioned 18 name their indexed-access replacement, e.g.
  `ListData['entries'][number]`).
- Full gate per task: `npm run check` 0/0, `npm test` exit 0, plus the CI-derived list
  (`check:comments`, `check:transcripts`, `check:symbols`, `check:reference`,
  `check:reference:signatures`, `check:package`, `check:docs`, `check:surface`,
  `check:snippets`, `check:rulings-format`, `check:consumers`); `templates/waymark` compiles.
- No version bump, no publish (the initiative's one cut comes after the chassis pass).

---

## Task 1: The 44 unsanctioned deletions

**Files:** the declaration and barrel files for the 44 (enumerate from the record's list (b)
table minus section 5's F-1 rows; the ledger anchors in the table name each entry), the
touched reference pages, `docs/internal/engine-rulings.md`, `docs/internal/api-surface.md`,
`CHANGELOG.md`, plus every drift-hunt hit.

- [ ] Enumerate the 44 by subtracting the 18 sanctioned F-1 rows and `AdminActionOptions`
      from the record's 63-row list (b) table; the task report carries the enumeration with
      each name's ledger anchor, and the diff review checks it against the record before
      anything else.
- [ ] Delete each where it stands; close each ledger entry; repair-and-delist any truncated
      shape among them; per-name drift hunt with retained classes reported.
- [ ] Tests that exist only to exercise a deleted export are deleted with it; tests that
      exercise surviving behavior through a deleted TYPE are repointed to the structural
      form. `npm test` exit 0 is the proof either way.
- [ ] Acceptance: full gate green including `check:consumers` and the scaffold-compiled
      `templates/waymark`; the api-surface diff shows every one of the 44 gone and NO other
      export changed; the 44 ledger closes verified by the diff review; the re-export record
      shrank by exactly the entries whose requiring signatures died with the 44 (named in the
      report).

## Task 2: The 18 sanctioned-leak deletions and the leak record

**Files:** as Task 1 for the 18, PLUS a new record document
`docs/internal/record/<date>-retires-move-record.md` (the manual leak ledger the F-1 ruling
requires until the internals pass lands the gate rider).

- [ ] The 18 are section 5's F-1 table minus `AdminActionOptions`. Delete each where it
      stands; close each ledger entry with the close naming the accepted leak ("survives
      structurally inside `<keep parent>`; accepted `NavIcon`-class leak per the F-1 ruling,
      r4-rederivation section 7").
- [ ] The move record lists all 18, each with its keep parent(s) and api-surface anchor
      (copy the F-1 table's citations), the indexed-access form a consumer uses instead, and
      the ruling citation. It also restates the standing total: 23 recorded leaks (the 5
      pre-existing: `NavIcon`, `EngineScreenId`, `SlotKind`, `DictionaryAddFailure`,
      `TidyFailure`, plus these 18), and names the internals pass as the gate rider's owner.
- [ ] The executable proof of "survives structurally": a compile-only fixture (or an
      extension of an existing type-level test under `src/tests/unit/`) that reads one
      representative field per keep parent via indexed access
      (`ListData['entries'][number]`, `EditData['publishActions'][number]`, ...) so the
      structural forms the changelog teaches are proven against the built types, not
      asserted.
- [ ] Per-name drift hunt as in Task 1; the reference arm additionally rewrites any prose
      that NAMES a deleted type for a keep parent's field into the indexed-access form.
- [ ] Acceptance: full gate green; the api-surface diff shows the 18 export entries gone
      while their names still appear inside the keep parents' rendered shapes (that is the
      sanctioned leak, verified per name by the diff review); ledger closes and move record
      agree row-for-row.

## Task 3: Closure verification and consolidation

**Files:** `scripts/checks/check-surface-reexports.json`,
`docs/internal/api-surface.md` (final), `docs/internal/engine-rulings.md` (progress
annotations only), `docs/extend/migration-notes.md`, `CHANGELOG.md` (consolidation),
`docs/internal/record/2026-08-30-r4-rederivation.md` (a short "executed" annotation at the
top of section 3, pointing at the move record; NOTHING else in that file changes).

- [ ] Re-derive the re-export record against the shrunk surface as a whole: every surviving
      entry's requiring signature still exists and still names the duplicate; every entry
      whose justification died is removed. Report the before/after count and the removed
      entries by name.
- [ ] Verify the ledger totals: exactly 62 retire entries closed by this pass, 32 retires
      still open (list (c)), `DEFAULT_ROLES` still a keep, untouched. The 32 open entries
      gain no annotation beyond what Tasks 1-2 already wrote; the retires-pass input record
      gains its "executed" pointer.
- [ ] Verify the leak arithmetic against the final api-surface: exactly 23 recorded leaks,
      each present in a rendered shape and absent from every export list; zero UNRECORDED
      leaks introduced by this pass (test the keep-parent formulation over the final
      surface: every retire-or-absent name inside any rendered public shape is one of the
      23).
- [ ] `docs/extend/migration-notes.md` gains the pass's entry in the per-version record's
      form under `## Unreleased`; the CHANGELOG's task entries consolidate into one coherent
      block whose `Consumers must:` lines cover all 62 names grouped by family, indexed-access
      replacements included.
- [ ] Acceptance: the full gate battery green by name (Global constraints list); a from-CI
      consumer proof (push the branch / open the PR for the e2e run) before the pass is
      called releasable.

---

## Pass-end notes

`diff-reviewer` per task plus a pass-end `engine-triage` dispatch that verifies, against the
ledger and the ruled record: the 62 closes, the 44/18 split, the move record's 18 rows, the
23-leak arithmetic, and that list (c)'s 32 and `DEFAULT_ROLES` are untouched. The
conventions pass (slice 4) is next and owns: the `ContentFormFailure` reshape (which
unblocks Tier 2's 6), the `DEFAULT_ROLES`/`defineAccess` coupled pair, and the auth-family
items STATUS routes there. The internals pass owns the leak-class gate rider (F-1 ruling),
the `staleNames` rescope, R-0's second direction, and the six stale `content-routes-*`
header wordings foundations B carried.
