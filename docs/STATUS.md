# cairn-cms status

Present tense only; past tense lives in [`docs/HISTORY.md`](HISTORY.md), durable orientation in
`CLAUDE.md`. `cairn-pass` rewrites this at each pass-end.

## Current state

Published: **`0.96.0`** on npm `latest`. `main` carries every pass through the Go tool's B2 (PR
#71), the doctor-retirement pre-task, and retire-1, unpublished under `## Unreleased`; the window
holds for one cut and includes the tool's 1.0 (`tool/v1.0.0` and `tool/v1.0.1`, commit `9b479e8d`).
Held majors: `devalue` 6, TypeScript 7, Vitest 5. CI on `main` is green.

**`cairn doctor` is the Go half of the retirement, merged by the retire-1 PR from `doctor-go` with
no tool tag** (plan `docs/superpowers/plans/2026-09-21-doctor-retire-1-go.md`; HISTORY records the
merge SHA at the next close). It runs eleven checks over a directory and exits 0, 1, 2, or 3.
`tool/docs/reference/` holds seven schemas and four pages. Retire-2a removes the engine's doctor.

Live contracts from the pre-task: `tool/internal/spine/conditions.json` and
`tool/internal/doctor/site-config-path.json`, held by `check:tool-conditions`; and
`.cairn/site-facts.json`, written by `cairn-manifest` and verified in the plugin's `buildStart`.
`cairn-pub`, on `pass-d-docs-tracks`, stays un-pinnable against the registry since `0.95.0`.

## Immediate next action

**Draft docs pass A**, plan `docs/superpowers/plans/2026-09-21-draft-docs-pass-a.md`, moves the
tool's pages and schemas under `docs/reference/` and repoints its help and tests. Its inventory
(`docs/internal/record/2026-09-21-doctor-retire-1-pass-a-inventory.md`) gets the merge SHA at the merge.

**The `0.97.0` cut HOLDS on five steps, in order (Geoff, 2026-09-21):** the tool's 1.0 (DONE, with
the pre-task behind it); retire-1 (DONE); draft docs pass A; one `tool/v1.1.0`, tagged from a commit
carrying retire-1 and pass A; the engine removal, retire-2a then retire-2b. Each close writes only
its own line, and **ONLY retire-2b's close, the last to land, releases `0.97.0` from this hold**. A
cut session finding no such line does not cut, whatever any mechanical gate says.

Retire-1's one carry-forward belongs to the tag session: **before the `tool/v1.1.0` tag, confirm
each distinct `https://cairn.pub/docs/admin/<page>` a failure block prints resolves on the deployed
cairn.pub.** One that does not means the tool prints the anchor text without a URL, and a `v1.1.x`
patch adds the link after the pin bump. Retire-2a owns two more: `site-facts.md:36` links
`doctor.md`, which it deletes, and `doctor.md:79-86` plus `facts/reference.md`'s doctor section
still say the two config checks share `config.bindings-missing`.

## Open decisions and watches

- Node 26 becomes the floor at beta only if it is Active LTS by then (Current until Oct 2026), and
  TypeScript 7 stays held until `svelte-check --tsgo` runs green (`tsgo.yml` checks weekly).
- extend-1's two advisory audit rules go to error tier at `0.98.0`; `cairn-audit --rendered` counts
  differently on identical runs (133 then 116), so stabilize before trusting either number.
- Monthly routines: a Cloudflare capability review (`trig_01GnFPkfx7EjrWKAuTBrXVdx`); a Claude Code
  guidance-schema check (`trig_01UyjoYo9hbGqm7qTeb7HGVH`), emailing only on a mismatch.
- `CAIRN_GH_READ_TOKEN` expires 2026-10-19; `cairn-tripwire` runs daily to catch it early.
- A consumer `guard.rejected` with `detail: 'mismatch'`, `witness: 'field'` can be the known
  double-mint residual; the discriminator names any genuinely new one.
- Three ASC staging harvest docs are folded into cairn, deletable once `email-announce` settles;
  the heavy gate runs the component project serially (`--no-file-parallelism`).

## Resume prompt

In a fresh session, conduct draft docs pass A from its plan and the retire-1 inventory. Then the
`tool/v1.1.0` tag session, retire-2a, and retire-2b, each on its own branch and worktree. Cut
`0.97.0` last; `ROADMAP.md`'s "The window after the cut" sequences what follows.
