# Draft docs stage 2b, part 1: stage record

Plan: `docs/superpowers/plans/2026-10-11-draft-docs-2b-part1.md`. The executor is session `7cc9f249`
(job name `draft-docs-2b-part1`). Relaunch: `claude attach 7cc9f249`.

## Launch facts

| Fact | Value |
| --- | --- |
| cairn tooling head | `4dbe392b4fd9d1caa73cc536a5fd655da16a0801` (PR #116) |
| dotfiles tooling head | `112906de460ffd8ad5e1b1f0967ab2ddb10c8fee` (PR #25) |
| dotfiles gate | pass (`bash scripts/gate.sh` exit 0) |
| pinned script sha256 | `2d23feb8e982a29197d2544e360d235cf43258c0ef10b0fed35b6b337493e6a3` |
| `night_tokens_at_launch` (S0) | 2.67M (input + output + cache creation, no cache reads) |
| first `<total_tokens>` reading | 14,930,167 left of 15,000,000 |

## T0 checks

- (a) Branch `draft-docs-2b-part1` contains the cairn tooling head and `origin/overnight-2b-plan`.
- (b) `ci-green 4dbe392b --pr 116` exits 0. Retried tests: `admin-visual.spec.ts` "admin command
  palette, light, 320px" (e2e shard 1); "EditorToolbar > Write/Preview tab sizing ... keeps each tab
  its own width across the selected/unselected swap" (test).
- (c) The dotfiles worktree HEAD equals the recorded head. `git show` of the script at that head is
  `cmp`-identical to the pinned copy, and the pinned copy's sha256 equals `script_sha256`.
- (d) `TMPDIR`, `NODE_OPTIONS`, and `tellgrader` on PATH read as launched. `/tmp` is far under 4.5G.
- (e) The dotfiles branch's diff against `origin/main` touches only `cairn-register-editor.md`
  among the agents, no `cairn-figure` skill path, and not `cairn-docs-outline`.
- (f) `extraChecks` appears in the pinned script only in the header comment (line 63). The D7 and
  D8b caveats ride in each page's `inputs`.
- (g) Setup ran: `npm ci`, `npm ci --prefix examples/showcase`, `npx svelte-kit sync`.

## Ledger

| Task | Run id | Commits | Tokens | Count after |
| --- | --- | --- | --- | --- |
| S0 (night before launch) | | | 2.67M | 2.67M |
| T0 | | | 0.11M (loop drop) | 2.78M |

## Runs

Per-run page tables are added as each run closes.

## Framing A/B

See `docs/superpowers/research/2026-10-11-draft-docs-2b-part1-ab/README.md` once T2 lands.

## Consistency read

Added at T10.

## Rulings for Geoff

None yet.
