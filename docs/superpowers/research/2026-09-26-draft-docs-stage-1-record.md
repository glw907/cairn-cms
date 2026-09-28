# Draft docs, stage 1 record: reference claim check

Task 10 of `docs/superpowers/plans/2026-09-26-draft-docs-pass-0-1.md`. One `claude-opus-5-5`
fact-read agent (or one per chunk, for the five largest pages) checked every prose claim on each
of the 28 in-scope `docs/reference/*.md` pages against the facts container, `dist`, and
`docs/internal/api-surface.md`. Five batches of up to six pages ran sequentially; after each batch
one `cairn-implementer` applied that batch's proposed edits and committed, and one `diff-reviewer`
read the commit before the next batch dispatched. Source: the workflow journal at
`wf_1d4cd37c-170/journal.jsonl` (91 lines, one `started`/`result` pair per agent, keyed by label).

## Scope and the pass B split

Geoff split the task on 2026-09-27 (`docs/superpowers/plans/2026-09-26-draft-docs-pass-0-1.md`
line 446): `docs/reference/components.md` (the page the theme identity pass B renames to
`admin.md`) and the `./public` page pass B creates are excluded from this stage. Both get a short
follow-up fact-read batch after pass B lands, with the same acceptance this stage used. This
leaves 28 of the 29 non-README pages in `docs/reference/` checked here: `ls docs/reference/*.md`
minus `README.md` and `components.md` matches the 28 pages the scout step planned and every batch
below actually read, with no page missed.

## Batches and commits

| Batch | Pages | Apply commit | Review verdict |
|---|---|---|---|
| 1 | render, site-facts, vite, cli-cairn-manifest, ambient, cli-cairn-media-seed | `716cd90e` | escalate (wrong worktree; see incident below), resolved by conductor move |
| 2 | log, islands, supported-toolchain, cli-cairn-exit-codes, media, auth-crypto | `f179aea5` | accept |
| 3 | guidance, cli-cairn-doctor, auth-store, delivery, admin-grammar-tokens, cloudflare | `e75e4062` | accept (three non-blocking findings, not fixed; see Carried) |
| 4 | admin-routes, auth-channel, reproductions, cli-cairn-json-output, delivery-data, log-events | `dd5e2e90` | fix, one round (folded in `11bd4809`) |
| 5 | cairn-audit (2 chunks), admin-toolkit (2 chunks), core (2 chunks), sveltekit (4 chunks) | `ff696efa` | fix, one round (folded in `11bd4809`) |

The batch 4 and 5 `fix` findings (the untraced admin-routes.md conditional clause, the
`f:hqhp14`/`f:mzqvrt` grep-undercount misattribution, the stale `f:yubpho` phrasing, the untraced
admin-toolkit.md contrast numbers, and eight rewrap spots) were applied in a separate task and
commit (`11bd4809`, `docs(reference): fold the stage 1 batch 4 and 5 reviews`), gated by
`check:docs-gate` and `check:facts` green.

## Per-page results

Counts are each page's fact-read record: claims checked, discrepancies found (all applied unless
noted), and unsettled items left for a later pass. A split page's chunk counts are summed.

| Page | Claims checked | Discrepancies | Applied | Skipped | Unsettled |
|---|---|---|---|---|---|
| render.md | 9 | 1 | 1 (716cd90e) | 0 | 0 |
| site-facts.md | 16 | 0 | 0 | 0 | 1 |
| vite.md | 9 | 0 | 0 | 0 | 0 |
| cli-cairn-manifest.md | 14 | 1 | 1 (716cd90e) | 0 | 0 |
| ambient.md | 17 | 0 | 0 | 0 | 0 |
| cli-cairn-media-seed.md | 27 | 2 | 2 (716cd90e) | 0 | 1 |
| log.md | 20 | 1 | 1 (f179aea5, structural: facts container) | 0 | 0 |
| islands.md | 19 | 0 | 0 | 0 | 0 |
| supported-toolchain.md | 30 | 1 | 1 (f179aea5) | 0 | 2 |
| cli-cairn-exit-codes.md | 30 | 0 | 0 | 0 | 0 |
| media.md | 32 | 0 | 0 | 0 | 0 |
| auth-crypto.md | 17 | 0 | 0 | 0 | 2 |
| guidance.md | 34 | 1 | 1 (e75e4062) | 0 | 0 |
| cli-cairn-doctor.md | 46 | 2 | 1 (e75e4062) | 1 (frozen check-id table; filed as fact instead) | 0 |
| auth-store.md | 23 | 4 | 4 (e75e4062) | 0 | 2 |
| delivery.md | 34 | 3 | 3 (e75e4062) | 0 | 1 |
| admin-grammar-tokens.md | 22 | 0 | 0 | 0 | 2 |
| cloudflare.md | 22 | 0 | 0 | 0 | 2 |
| admin-routes.md | 52 | 4 | 4 (dd5e2e90, one text fix in 11bd4809) | 0 | 2 |
| auth-channel.md | 42 | 0 | 0 | 0 | 0 |
| reproductions.md | 33 | 0 | 0 | 0 | 1 |
| cli-cairn-json-output.md | 42 | 0 | 0 | 0 | 0 |
| delivery-data.md | 46 | 1 | 1 (dd5e2e90, rewrapped in 11bd4809) | 0 | 0 |
| log-events.md | 45 | 0 | 0 | 0 | 3 |
| cairn-audit.md | 54 | 2 | 2 (ff696efa) | 0 | 1 |
| admin-toolkit.md | 84 | 5 | 4 (ff696efa), 1 numbers-only clause fixed in 11bd4809 | 1 contrast numbers untraceable, filed to friction log | 2 |
| core.md | 125 | 1 | 1 (ff696efa) | 0 | 6 |
| sveltekit.md | 260 | 6 | 6 (ff696efa) | 0 | 7 |
| **Total** | **1204** | **35** | **33 applied** | **2 skipped** | |

Of the two skips, one is a true skip (not a fact-only reroute): admin-toolkit.md's outline-chip
contrast numbers (2.4:1/2.97:1): the fact-read agent itself flagged them as untraceable to any
source in the repo, the batch 5 apply agent left them unedited rather than commit an unverified
number, and the batch 4/5 fix round removed the numbers from the page and filed the gap in
`docs/internal/docs-friction-log.md` for a future re-measure. cli-cairn-doctor.md's one skip is a
reroute, not a drop: the `auth.role-wiring` INFO-settlement finding sits inside the frozen
check-id table (`cli-cairn-doctor.md`, `cli-cairn-exit-codes.md`, and `cli-cairn-json-output.md`
report released tool contract content but never edit it), so it was filed as fact `f:0ms9c1`
instead of a page edit.

## Structural and contract flags

Every fact-read record marked `contract: false` and `structural: false` on every discrepancy: no
page needed a rebuild, and no released tool contract page (`docs/reference/schema/**`, or the
exit codes, payloads, and check ids on `cli-cairn-doctor.md`, `cli-cairn-exit-codes.md`, and
`cli-cairn-json-output.md`) was edited. The one structural finding of the stage was on the facts
container itself, not a reference page: `f:avc1a2` (the `createLogger` redaction, key-normalization,
and freeze facts) sat inside the `## docs/reference/auth-store.md` section with no
`## docs/reference/log.md` heading anywhere in the container, even though `log.md` carries
substantial checkable prose. Batch 2 moved the bullet to a new `## docs/reference/log.md` section
(`f179aea5`), leaving its content unchanged.

## The batch 1 wrong-worktree incident

The batch 1 apply agent inherited the conductor's shell working directory rather than the
worktree named in its dispatch: it applied and left uncommitted all four batch 1 edits (three
reference pages plus the facts container) in
`.claude/worktrees/draft-docs-0-proof` on branch `draft-docs-0-proof`, a throwaway worktree the
plan's chain-proof step (task 6) also uses, rather than in `.claude/worktrees/draft-docs-0` on
branch `draft-docs-0`. `draft-docs-0` itself stayed clean with no task 10 commit. The
`diff-reviewer` caught this and returned `escalate`, since only the conductor could decide which
branch the batch belonged on, whether `-proof`'s own unrelated uncommitted changes
(`docs/extend/choose-an-ai-posture.md`, `docs/internal/facts/extend.md`, both from the chain-proof
step) should be disturbed, and how to handle `-proof`'s red `check:provenance` gate. The reviewer
independently confirmed the content itself was correct against source before escalating.

The conductor moved the four touched files from `draft-docs-0-proof` to `draft-docs-0` and
committed them there as `716cd90e`, leaving `draft-docs-0-proof` untouched otherwise, and added an
explicit branch guard to the apply-agent dispatch prompt for batches 2 through 5 (confirm the
worktree and branch before editing, matching this task's own preflight step). No batch after 1
repeated the mistake.

## Carried, not fixed

Batch 3's review (`e75e4062`, verdict accept) named three non-blocking, cosmetic findings that
this stage's fix rounds did not reach, since only batch 4 and 5 carried a `fix` verdict:

- `auth-store.md:12`, `:65`, `cli-cairn-doctor.md:52`, and `delivery.md:28` run past the page's
  roughly 100-column wrap after their batch 3 insertions.
- `docs/internal/facts/reference.md`'s retagged `f:plng3z` cites `fileread.go:89-104`; the
  devDependency check it now also describes sits closer to lines 107-110.
- `delivery.md:99`'s worked-example comment ("unchanged from before that layer existed") reads
  unclearly and matches nothing in the real showcase file; a candidate for the docs rebuild rather
  than a fact-check fix.

These are page-polish items, not open discrepancies (the review verdict was accept), so they are
recorded here for whichever pass next touches these pages rather than filed to the friction log.

## Cost

Reported `subagent_tokens`, conductor-summed per the plan's pre-flight counting method: batch 1
about 0.78M, batches 2 through 5 about 4.1M, roughly 4.9M total against the plan's 4.5M
first-batch-projection checkpoint. The projection ran past its checkpoint; Geoff was not asked
mid-pass per the plan's own framing (a projection past 4.5M is the checkpoint question, not a
hard stop), and the overrun is recorded here as an input to the stage 2 pilot checkpoint rather
than a new question.

## Gate

`CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:docs-gate'` and `make -C tool check` ran
green after every apply commit (716cd90e, f179aea5, e75e4062, dd5e2e90, ff696efa) and after the
batch 4/5 fold (`11bd4809`); `npm run check:facts` is green as of the fold commit.
