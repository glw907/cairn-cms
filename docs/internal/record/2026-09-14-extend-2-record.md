# extend-2: what the gate caught, and what a later pass would be wrong to rediscover

Written at the close of chain A, Task 4, after chain B (`extend-2-skills`: the budget check's
`skills/**` and `claude/**` extension, `cairn-extend`, `cairn-consult`) merges into this branch at
the ritual. The guidance layer's own rulings live in `docs/internal/engine-rulings.md`
(`guidance-layer`, and the reconciling Note on `audit-cli-skill-admin-screens-check-and-cairn-doctor-fix`).
This record is the narrative behind those rows, plus the process lessons the ledger's own format
has no room for.

## The 3c escalate ruling

The 2026-09-19 amendment granted the engine-owned Tailwind sources file
(`@glw907/cairn-cms/admin-sources.css`) so no site's `src/admin.css` names the engine's `dist`
layout in its `@source` line. At Task 3c's escalate, the conductor ruled the amendment's own
acceptance grep and its "no site file names the engine's `dist` layout" line bind the `@source`
line alone. `cairn-audit.config.json`'s `sheet` entry still names the precompiled admin sheet
under `dist/components/cairn-admin.css`, a different artifact; relocating it is packaging scope
the amendment did not grant, so it is filed as a follow-up in `ROADMAP.md` rather than executed
here. Task 3c's own `admin-visual` gate was accepted for the task on that ruling; the ritual's
FULL gate covers the remainder.

## What a later pass would be wrong to rediscover

**The unknown-exclusion case in `cairn-guidance check` prints the `@source not "./.claude";` line
from a constant, never a sixth packaged snippet file.** `check.ts` exports
`SOURCE_EXCLUSION_LINE` as a literal string; there is no `claude/snippets/tailwind-exclude.txt` or
equivalent to keep in sync with it. A later pass adding a snippet file for this line would be
adding a second copy of a fact that already has one home.

**`MANIFEST` lists only the paths the current install wrote, and a stopped-shipping path drops out
after one report.** `install.ts`'s `report.removable` is the previous `MANIFEST`'s paths minus the
current run's written paths; the write always replaces `MANIFEST` with the current run's own list.
A path the package stops shipping is named removable exactly once, on the first install after the
package drops it, then no longer appears in any later `MANIFEST` to be reported again. A consumer
who ignores the one removable line loses the prompt, not a standing warning.

**Both transcript re-captures this pass would have needed took the fallback instead: the fixtures
stay as recorded, with a dated staleness note.** `03-doctor-credentialed.txt` (Task 1b, the
`skill.admin-screens` retirement) and `01-create-cairn-site.txt`/`01b`/`01c`/`01d-resume.txt`
(Task 3a, the guidance bake) both predate the change their own docs page now describes. Neither
re-capture ran, because the capture harness needs a live GitHub App and repository creation
outside this repo; `packages/create-cairn-site/test/fixtures/transcripts/README.md` carries both
dated staleness notes, and the docs pages that quote these fixtures elide or annotate the stale
line rather than editing the fixture, per the fixtures' own never-edit rule. `check:transcripts`
compares a quoted block against its named fixture, not against the current tool's behavior, so it
stays green either way.

**The shipped skills land on `extend-2-skills`, a sibling branch, merging into this one at the
close.** `cairn-extend`, `cairn-consult`, the budget check's extension to `skills/**` and
`claude/**`, and `check:docs` over the same paths are chain B's own deliverables (plan tasks 5
through 7), built and gated independently of chain A's engine work. This branch (`extend-2`)
carries chain A alone until the merge; a reader diffing this branch against the plan's full task
list before the merge is not missing work, only reading it out of order.

## What the gate caught

**The doctor's `03-doctor-credentialed.txt` and `Is it working?`'s quoted block needed
reconciling, not re-capturing.** The retired `skill.admin-screens` check's SKIP line still counts
toward the fixture's own totals; the doc elides the one line with a `[...]` marker inside its
quoted block and says so in its own prose, rather than silently presenting a total that no longer
matches a fresh run's real check count.

**`check-rulings-format` has no location requirement beyond the labeled-line shape.** The new
`guidance-layer` accept row sits immediately after the retire row it relocates, rather than at the
ledger's chronological tail; the gate reads every entry's own labels, never file position, so
placing a new row beside the ruling it answers is a legitimate choice, not a workaround.
