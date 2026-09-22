# cairn-cms status

Present tense only; past tense lives in [`docs/HISTORY.md`](HISTORY.md), durable orientation in
`CLAUDE.md`. `cairn-pass` rewrites this at each pass-end.

## Current state

Published: **`0.96.0`** on npm `latest`. `main` carries every pass through the Go tool's B2
(PR #71) and the doctor-retirement pre-task, unpublished under `## Unreleased`; the window holds
for one cut and includes the tool's 1.0, released as `tool/v1.0.0` and `tool/v1.0.1` (commit
`9b479e8d`), both reachable from `main`. Held majors: `devalue` 6, TypeScript 7, Vitest 5; two
`npm audit` findings need `--force` or a downgrade and are held. CI on `main` is green.

The pre-task's contracts are live: `tool/internal/spine/conditions.json` and
`tool/internal/doctor/site-config-path.json`, generated and held by `check:tool-conditions`; and
`.cairn/site-facts.json`, written by the `cairn-manifest` bin and verified in the plugin's
`buildStart` (`docs/reference/site-facts.md`). Beside the engine: the tool's post-1.0 course is
`docs/superpowers/specs/2026-09-21-cairn-tool-after-1-0-framing.md` (`cairn-tripwire` runs daily
here, `CAIRN_GH_READ_TOKEN` expiring 2026-10-19); `cairn-pub`, on `pass-d-docs-tracks`, stays
un-pinnable against the registry since `0.95.0`.

## Immediate next action

**retire-1, the retirement's Go half.** Branch `doctor-go` off `main`, plan on `main` at
`docs/superpowers/plans/2026-09-21-doctor-retire-1-go.md` (PR #76), workflow mode, light gate lane,
merged WITHOUT a tool tag. The plan's tool-side citations were pinned on branch `cairn-tool-b2` at
`3dc2520f`; its pre-flight re-verifies them against merged `main`, which carries the tool tree
through `tool/v1.0.1` (`9b479e8d`).

**The `0.97.0` cut HOLDS on five steps, in order (Geoff, 2026-09-21):** the tool's 1.0 (DONE, with
the pre-task merged behind it); retire-1; draft docs pass A (`2026-09-21-draft-docs-pass-a.md`),
moving the tool's contract pages and schemas under `docs/reference/`; one `tool/v1.1.0`, tagged and
released from a commit carrying retire-1 and pass A; the engine removal, retire-2a then retire-2b.
Each close writes only its own line, and **ONLY retire-2b's close, the last to land, writes the
line releasing `0.97.0` from this hold**. A cut session finding no such line does not cut, and
every mechanical gate in Task 6 of the pre-cut plan must pass whatever any line says.

Two carry-forwards are retire-2a's: `site-facts.md:36` links `doctor.md`, which retire-2a deletes;
and `doctor.md:79-86` plus `facts/reference.md`'s doctor section still say the two config checks
share `config.bindings-missing`.

## Open decisions and watches

- Node 26 becomes the floor at beta only if it is Active LTS by then (Current until Oct 2026), and
  TypeScript 7 stays held until `svelte-check --tsgo` runs green (`tsgo.yml` checks weekly).
- extend-1's two advisory audit rules go to error tier at `0.98.0`.
- Monthly routines: a Cloudflare capability review (`trig_01GnFPkfx7EjrWKAuTBrXVdx`); a Claude
  Code guidance-schema check (`trig_01UyjoYo9hbGqm7qTeb7HGVH`), emailing only on a mismatch.
- A consumer `guard.rejected` with `detail: 'mismatch'`, `witness: 'field'` can be the known
  double-mint residual; the discriminator names any genuinely new one.
- Three ASC staging harvest docs are folded into cairn, deletable there once `email-announce` settles.
- `cairn-audit --rendered` counts differently on identical runs (133 then 116); stabilize first.
- The heavy gate runs the component project serially (`--no-file-parallelism`); the parallel run stalls here.

## Resume prompt

In a fresh session, conduct retire-1 from its plan, the retirement spec, and the
`doctor-retirement-pass` memory. Then draft docs pass A, the `tool/v1.1.0` tag session, retire-2a,
and retire-2b, each on its own branch and worktree. Cut `0.97.0` last; `ROADMAP.md`'s "The window
after the cut" sequences what follows.
