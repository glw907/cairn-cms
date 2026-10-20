# Foundations A: Ledger and Canonical Home (remediation initiative, slice 2a)

**Session handoff (2026-08-29):** foundations A and B run as ONE paired fresh session
(Geoff's call, 2026-08-29); execute A first through the cairn-pass ritual; at A's merge,
finalize B's task bodies against A's merged surface (B's own header requires this) and
re-verify both plans' csrf-window items (listed in each plan's pre-flight section) against
the merged tree before dispatching; then, before any B dispatch, run one `engine-triage`
adversarial review over the FINALIZED B plan against the rulings ledger and fold its
verdicts (Geoff's call, 2026-08-29; the harvest-detection precedent, where two such
pre-approval reviews cut a no-op task and an unbuildable extension); then execute B in the
same session. Resume prompt for
the fresh session, verbatim on its own line:

In ~/Projects/cairn-cms, execute the foundations A pass (docs/superpowers/plans/2026-08-28-foundations-a-pass.md) and then foundations B in the same session, per the Session handoff note in the A plan.

> **For agentic workers:** three tasks, SERIAL. Dispatch the `cairn-implementer` /
> `diff-reviewer` chain per task with the Agent tool; the full gate inside the chain. Task 2
> is the pass's `model: opus` candidate (it ratifies and executes a surface-wide rule).

**Token ceiling (WHOLE pass, chains plus ritual): 2M.** **Checkpoint interval:** after Task 1,
then every task. **Worktree:** `foundations-a` off `main` after BOTH the harvest-detection and
csrf-hardening merges (a two-branch chain; neither is merged at authoring time).
**Shared files:** `docs/internal/engine-rulings.md` (Tasks 1, 2), `CHANGELOG.md` (every
task), `docs/internal/api-surface.md` and many `docs/reference/` pages (Task 2),
`scripts/checks/check-surface.mjs` (Task 2's enforcement rule).
**Initiative frame:** `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md`
(slice 2a; its standing-constraints block applies to every task here).
**Evidence base, read from source, never memory:** `coherence-v2.md` (R-0 at `:839-842`; R-1
at `:130-140` and `:844-847`), `verify-route-factories.md:143-149` (the rank-99 `SlotDef`
dissent), the ledger's per-item entries, `docs/internal/api-surface.md` (the committed golden
this pass's move set derives from).

**Goal:** the audit's first two ordered recommendations, executed as infrastructure for every
later slice: repair the ledger shapes the NEXT TWO slices consume, then ratify and execute the
canonical-home rule (R-0 and R-1) for surviving keeps, with the enforcement gate that keeps it
true. Split from the original foundations pass on its second adversarial review (the move set
measured ~117 multi-subpath names against the audit's ~44 estimate; four natural cut points in
five tasks).

---

## Task 1: Ledger repair, scoped; the format gate; the missing filing

**Files:** `docs/internal/engine-rulings.md`, the `rank-*.md` sources, a new format gate under
`scripts/checks/` wired beside the docs gates, `package.json`.

**The defect, measured precisely:** 67 entries carry a `(shape: …)` parenthetical inside their
`Reopens on:` line; in 55 of them the text BETWEEN `(shape: ` and the closing `).` is exactly
160 characters, truncated mid-thought (the parenthetical totals 170; nothing in the file
measures 162, so never key a detector on that). Distribution by verdict: 43 reshape, 12
retire, ZERO keep, so the canonical-home work (Task 2, keeps only) consumes none of them.

- [ ] Repair NOW only the entries the next two slices execute: the 10 `audit-sveltekit-*`
      and 4 `audit-admin-*` truncated shapes (foundations B's narrowing and closure read
      them; `audit-sveltekit-contentroutes` at `:1487` is cut off exactly where it names the
      internal-shape consumer). Repair is RE-AUTHORING from the rank entries' prose, not
      lookup (verified on samples); where the source is ambiguous, mark
      `shape-needs-rederivation`. The remaining 41 (cli 16, log 10, auth 7, tail 8) are
      repaired by the slice that executes them; record that assignment in the ledger's
      header note so no slice assumes the repair is done.
- [ ] The SHIPPED gate asserts FORMAT, not the artifact (a 160-length scan means nothing
      after repair): a `Reopens on:` line carries no `(shape:` parenthetical; an assigned
      shape lives in its own labeled `Shape:` line. Migrate the 14 repaired entries to that
      format as part of the repair; the 41 unrepaired parentheticals are allowlisted by slug
      until their owning slice repairs them (the gate's allowlist shrinks to zero across the
      initiative, which is its progress meter).
- [ ] File the `MediaInsertPopover` deferral as its own ledger entry (today a sub-clause at
      `:39-40`): evidence, verdict (internal, deferred), `Reopens on: the MarkdownEditor
      seam collapse`, cross-referencing `audit-admin-markdowneditor` (`:2295`) by slug.
- [ ] Acceptance: the format gate is green with its allowlist at 41; the 14 repaired shapes
      are complete sentences naming what the rank source names; `check:docs` green.

## Task 2: R-0 and R-1: the canonical-home rule, ratified, executed, enforced

**Files:** the barrels under `src/lib/*/index.ts` per the move set,
`src/lib/sveltekit/index.ts` re-exports where R4 requires them, the affected
`docs/reference/` pages, `docs/internal/api-surface.md` (via `check:surface -- --update`),
`scripts/checks/check-surface.mjs` (the new enforcement rule),
`docs/internal/engine-rulings.md`, `CHANGELOG.md`, `docs/extend/migration-notes.md`.

**The measured move set (derivable today; no dependency on the closure re-derivation):** of
410 exported names, 122 publish from two or more subpaths (63 from two, 10 from three, 44
from four, 5 from five); by ledger verdict 114 keep, 3 reshape, 5 retire.

- [ ] R-0 first (`coherence-v2.md:839-842`): the zero-cost premise paragraph, executed as
      written there; it is the premise of half of C3.
- [ ] The ledger has NO family entry for R-1 (the sole canonical-home reasoning lives inside
      one item's verdict at `:1208`, the "rule wearing a single item's clothes" defect).
      OPEN the R-1 family entry as a ratification (the rule, its grounds, the `SlotDef`
      dissent at `verify-route-factories.md:143-149` cited and overruled via the
      `MediaLibraryEntry` re-export mold), execute, then CLOSE it.
- [ ] The move rule: KEEPS move to their canonical home (114 names); RESHAPES do not move
      (their home settles when the conventions pass reshapes them, or they would be touched
      twice); RETIRES die in place (the retires pass deletes them where they stand).
      Re-exports only where the R4 closure requires a name from a second subpath, judged
      against the PRE-narrowing surface; some will be unjustified after foundations B
      narrows `/sveltekit`, so the task RECORDS its re-export set and routes the
      re-evaluation to foundations B's list (b) rather than claiming finality.
- [ ] The enforcement half ships in the same task (`coherence-v2.md:134-135`): a
      `check:surface` rule failing when a name appears in two barrels' export lists, except
      the recorded R4 re-exports (the script already builds the per-subpath name map;
      the rule is a small reduction over it). Falsifiability: add a duplicate export,
      show the red, remove.
- [ ] The task RECORDS its move set (name, old homes, new home) in the task report so
      foundations B's list (c) can be diffed against it (a later keep-to-retire flip on a
      moved name is changelog churn, not rework; make it visible).
- [ ] Both in-tree consumers and the docs hold throughout (`check:consumers`, the scaffold
      job's waymark compile, `check:docs`, `check:snippets`, `check:reference:signatures`).
- [ ] Acceptance: full gate green including the new enforcement rule; every moved name's
      reference page shows the canonical home; one `Consumers must:` block enumerating the
      import-path changes; the R-1 family entry closed.

## Task 3: Drift for the moved names

**Files:** every `docs/` page and `src/` comment naming a moved name (scope: `docs/`,
`src/`, `examples/`, `templates/`), `docs/extend/migration-notes.md`.

- [ ] `grep -rn` per moved name across the four trees; repoint every hit. The gates cover
      only slices of this (`check:snippets`: fenced ts/svelte in the four published arms;
      `check:reference:signatures`: callable signature blocks); prose, `docs/internal`,
      `src/lib` comments, `examples/`, `templates/` rely on the sweep; state the residual
      honestly in the task report.
- [ ] `migration-notes.md` gains the canonical-home entry in the per-version record's form.
- [ ] Acceptance: full gate green; the sweep's zero-hit proof recorded per name class.

---

## Pass-end notes

`diff-reviewer` per task plus a pass-end `engine-triage` dispatch verifying the R-1 entry,
the move-set record, and the enforcement rule against the ledger. No component work, no
visual read, no admin smoke. Foundations B is authored against THIS pass's committed
`api-surface.md`; it must not be planned in detail before this pass merges.

---

## Pre-flight verification (2026-08-29)

Verified against `main` at `49914d9d`, before the csrf-hardening merge.

**Corrections**

- Task 2, "The measured move set" note claims "of 410 exported names, 122 publish from two
  or more subpaths: 63 from two, 10 from three, 44 from four, 5 from five."
  `docs/internal/api-surface.md` is not on csrf-hardening's edit list, so this is a plain
  drift, not a csrf-window item. As of `49914d9d`: total exported names is 411, not 410. The
  multi-subpath breakdown is exact (122 total: 63 from two, 10 from three, 44 from four, 5
  from five); only the 410 total is off by one.

**Re-verify after the csrf-hardening merge**

- Task 1, first bullet + defect note ("67 entries... 55 of them exactly 160 chars"):
  `docs/internal/engine-rulings.md`. As of `49914d9d`: 66 entries carry a `(shape: …)`
  parenthetical (not 67), and 54 of them (not 55) measure exactly 160 characters between
  `(shape: ` and the closing `).`.
- Task 1, defect note ("distribution of the 55 truncated shapes: 43 reshape, 12 retire, zero
  keep"): `docs/internal/engine-rulings.md`. As of `49914d9d`, among the 54 entries measuring
  exactly 160 chars: 42 reshape, 12 retire, 0 keep (reshape count is 42, not 43; total is 54,
  not 55).
- Task 1, first bullet ("the 10 `audit-sveltekit-*` and 4 `audit-admin-*` truncated shapes
  are the ones the next two slices consume and get repaired now"):
  `docs/internal/engine-rulings.md`. As of `49914d9d` this count verifies exactly: 10
  `audit-sveltekit-*` and 4 `audit-admin-*` entries have the exact-160-char truncated shape.
- Task 1, first bullet (`audit-sveltekit-contentroutes` at `:1487`, cut off exactly where it
  names the internal-shape consumer): `docs/internal/engine-rulings.md`. As of `49914d9d` the
  entry heading "`## audit-sveltekit-contentroutes: ContentRoutes`" is at line 1510 (not
  1487), and its truncated `Reopens on:` line is at 1513: "...keeping the media-janitorial
  actions on an engine-internal shape the adm)." The content and truncation-point claim
  holds; only the line number is stale.
- Task 1, first bullet ("the remaining 41 unrepaired truncated shapes break down as cli 16,
  log 10, auth 7, tail 8"): `docs/internal/engine-rulings.md`. As of `49914d9d` the actual
  breakdown of the 40 non-sveltekit/non-admin truncated-shape entries is cli 15 (not 16), log
  10, auth 7, tail (adapter 2 + cloudflare 2 + media 1 + delivery 2 + render 1) 8; total 40,
  not 41.
- Task 1, third bullet (the `MediaInsertPopover` deferral exists today only as a sub-clause
  at `:39-40`): `docs/internal/engine-rulings.md`. As of `49914d9d` this verifies exactly:
  lines 39-40 of the `mediaherofield-export` entry read "...sustained against
  `MediaInsertPopover`, which also / stays internal, deferred until the `MarkdownEditor` seam
  collapse."
- Task 2, second bullet (the ledger has no family entry for R-1; the sole canonical-home
  reasoning lives inside one item's verdict at `:1208`, the `MediaLibraryEntry` re-export
  mold): `docs/internal/engine-rulings.md`. As of `49914d9d` the relevant entry is
  `audit-sveltekit-medialibraryentry` with heading at line 1232 and the canonical-home
  reasoning ("Canonical home is `/admin-toolkit`... A re-export from the stated canonical
  home is not a second home, so C1 holds.") at line 1234, not 1208. No standalone R-1 family
  entry exists (confirmed: no heading matching an R-1/canonical-home slug).
- Task 1, third bullet (`audit-admin-markdowneditor` entry at `:2295`, cross-referenced by
  the `MediaInsertPopover` filing): `docs/internal/engine-rulings.md`. As of `49914d9d` the
  heading "`## audit-admin-markdowneditor: MarkdownEditor`" is at line 2321, not 2295.
- Task 2, "The measured move set" note ("by ledger verdict, the 122 multi-subpath names split
  114 keep, 3 reshape, 5 retire"): `docs/internal/engine-rulings.md` (cross-referenced
  verdicts). As of `49914d9d` this verifies exactly against `docs/internal/api-surface.md`'s
  122 multi-subpath names: 114 keep, 3 reshape, 5 retire, with every name found in the
  ledger.
- Header, Shared files line (`CHANGELOG.md` is a shared file touched by every task in this
  pass): `CHANGELOG.md` is on csrf-hardening's edit list; its "Unreleased" section state
  should be re-read after that merge before Task 1 adds to it.
- Header, Shared files line (`docs/internal/engine-rulings.md` is a shared file touched by
  Tasks 1 and 2): `docs/internal/engine-rulings.md` is on csrf-hardening's edit list (that
  pass files a login-CSRF ledger entry per the initiative design doc's slice-1 description);
  re-read the file fresh after that merge before Task 1's repair work and Task 2's R-1 family
  entry work.

---

## Post-mortem (pass closed 2026-08-29)

**What was built.** All three tasks landed: T1 repaired 14 truncated ledger shapes and stood
up `check:rulings-format` (`632cca35`), T2 ratified and executed the canonical-home rule (R-0
accept, R-1 executed against the pre-narrowing R4 closure), moving 18 names and recording 120
re-exports with a `check:surface` enforcement rule (`a7f9510a`), T3 swept the surface for
residual moved-name drift, found zero, and removed 14 pre-existing stale rows from
`docs/reference/delivery-data.md` (`b065ea51`). The move-set record
(`docs/internal/record/2026-08-29-foundations-a-move-set.md`) carries the executed detail and
is foundations B's diff base.

**A laptop crash interrupted the session between Task 1's checkpoint and Task 2's close,**
leaving Task 2 warm and uncommitted on disk. Recovery ran a triage assessment rather than a
blind re-dispatch: the warm tree was substantively complete and gate-green except one
environmental failure, `check:consumers`, which was the known worktree showcase symlink
collision (a worktree's `examples/showcase/node_modules` resolves to `main`'s build until a
from-scratch install repoints it), repaired with that install rather than any code change.
Task 2 then closed through one fix cycle: the diff review caught `MediaResolve`'s canonical
home mislabeled as `/media` instead of `.` across three docs (the ledger, the move-set record,
and the reference page), fixed in `35dea8b0`.

**Task 3's sweep found the drift Task 2's own record predicted and nothing else:** zero
residual hits for any of the 18 moved names anywhere the reference gate does not already
cover, and the 14 stale `delivery-data.md` rows the move-set record had flagged as known,
unfixed drift. The fold commit `2700d4bf` (dropping the literal NUL byte the JSON-parse error
framing had been emitting, and fixing the parse-error message's own framing) and the
simplifier pass `e9105d12` closed the task.

**The pass-end engine-triage verification returned "holds" on all three artifacts** (the
ledger repair, the canonical-home record, the drift sweep), with four follow-ups routed to
foundations B as inheritance notes rather than reopened here: `staleNames`'s union-over-all-
subpaths scoping (exactly how the 14 dead rows survived undetected, and the reason to scope it
per-subpath before `/sveltekit` narrows), the record-membership-is-not-justification warning
(a green `check:surface` proves a duplicate is recorded, never that it is still required), the
122-multi-subpath-count invariance (publications-per-name fell; the count of names publishing
from two-plus subpaths did not, so the audit's literal "fail on any two-barrel name" ask
shipped as fail-unless-recorded, not fail), and R-0's second direction (ratified, not yet
discharged; no owning slice). All four are now written into the move-set record's own
"Inheritance notes for foundations B" subsection rather than only in this post-mortem, so B
reads them from the artifact it already owes a diff against.

**Decisions locked this pass:** the canonical-home rule ships as fail-unless-recorded (a
deliberate, documented divergence from the audit's literal "no duplicate publication, ever"
reading, since 96 of the 114 keeps carry a closure-justified second publication the rule would
otherwise have to break); the `--update` regeneration path is gated by the same rule, so a
duplicate cannot be written into the golden and left for a later plain run to find; the third
failure shape the gate can produce, a record entry whose `home` field the surface no longer
supports, is misfiled rather than silently accepted.

**Known cosmetic defect, not worth a fourth commit:** `2700d4bf`'s subject line reads
inverted against its own body (the body correctly describes dropping the NUL separator and
framing the JSON-parse error; the subject transposes the two clauses). Left as-is; the body is
the record of truth and a history rewrite was not worth the churn for a one-line subject typo.

**Close-out repairs (this session):** the move-set record's "about fifteen" self-contradiction
against its own fourteen-row count, softened `PublishActionEntry`'s "not closure-justified"
framing to "derivatively closure-justified," the inheritance-notes subsection itself, a header
warning on the ledger's one entry whose `Progress:` prose sits inside a still-truncated
parenthetical, and the `check:rulings-format` exit ratchet: the 40 allowlisted slugs plus the
14 foundations A already repaired are now a fixed, embedded population, and any of them found
off the allowlist must carry a real `- **Shape:**` line or the `shape-needs-rederivation`
marker, not merely lack the raw `(shape:` text. Falsified by deleting a repaired entry's
`Shape:` line, confirming the gate goes red with the new `missing-shape` message, and
restoring it.

**Budget.** Roughly 1.6M of the 2M ceiling: the prior session's ~0.4M through Task 1's
checkpoint, the crash-recovery workflow (triage plus Task 2's fix cycle plus Task 3) ~0.83M,
and this close-out dispatch ~0.36M.
