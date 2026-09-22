# cairn-cms status

Present tense only; past tense lives in [`docs/HISTORY.md`](HISTORY.md), durable orientation in
`CLAUDE.md`. `cairn-pass` rewrites this at each pass-end.

## Current state

Published: **`0.96.0`** on npm `latest`. `main` carries every pass through the Go tool's B2 (PR
#71), the doctor-retirement pre-task, retire-1, and draft docs pass A, unpublished under
`## Unreleased`; the window holds for one cut and includes the tool's 1.0 (`tool/v1.0.0`,
`tool/v1.0.1`, commit `9b479e8d`). Held majors: `devalue` 6, TypeScript 7, Vitest 5. CI is green.

**The doctor retirement is half done**, the Go half merged untagged from `doctor-go`; retire-2a
removes the engine's doctor. **Draft docs pass A is merged**, the tool's contract pages and
schemas now shipping inside the npm tarball; cairn.pub's own debt is
[this handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md), un-pinnable against the
registry since `0.95.0` on `pass-d-docs-tracks`. Live contracts from the pre-task:
`tool/internal/{spine/conditions,doctor/site-config-path}.json` under `check:tool-conditions`,
and `.cairn/site-facts.json`, written by `cairn-manifest`, verified in the plugin's `buildStart`.

## Immediate next action

**Tag `tool/v1.1.0` HOLDS for Geoff's morning call.** The pre-tag URL check (2026-09-22, 06:20)
found `is-it-working` (the page every doctor failure block and 1.0.1 health fix line prints), the
three new reference URLs, and the schema `$id`s all 404 on deployed cairn.pub, while
`cli-cairn-manifest` returns 200; cairn.pub is pinned to `0.94.0-rc.1` and un-pinnable since
`0.95.0`, so no pin bump follows the cut. Ruling needed: ship 1.1.0 printing the URLs as 1.0.1
already does (consistent, 404 until cairn.pub is fixed), or have `cairn doctor` print anchor text
without a URL and add the link in a `v1.1.x` patch (the plan's carry-forward). Recommendation:
ship the URLs as 1.0.1 does. Once tagged, the runbook (Tasks 22b/23,
`docs/superpowers/plans/2026-09-14-cairn-tool-1-0-pass.md`) bumps `version.Documented` to `1.1.0`
if the pages' version changed, corrects `release-candidate-notes.md:68`'s stale `docs/reference/`
claim, and adds the ADR-0002 addendum for the `pflag` promotion (`otherDirectRequires` 5 to 6).

**The `0.97.0` cut HOLDS on five steps, in order (Geoff, 2026-09-21):** the tool's 1.0 (DONE, with
the pre-task behind it); retire-1 (DONE); draft docs pass A (DONE); one `tool/v1.1.0` tagged from a
commit carrying retire-1 and pass A; the engine removal, retire-2a then retire-2b. Each close
writes only its own line, and **ONLY retire-2b's close, the last, releases `0.97.0`**; a cut
session finding no such line does not cut. Retire-2a owns two carry-forwards: `site-facts.md:36`
links the deleted `doctor.md`, and `doctor.md:79-86`/`facts/reference.md` share `config.bindings-missing`.

## Open decisions and watches

- Node 26 becomes the floor at beta only if it is Active LTS by then (Current until Oct 2026);
  TypeScript 7 stays held until `svelte-check --tsgo` runs green (`tsgo.yml` checks weekly).
- extend-1's two advisory audit rules go to error tier at `0.98.0`; `cairn-audit --rendered`
  counts differently on identical runs (133 then 116), stabilize before trusting either.
- Monthly routines: a Cloudflare capability review (`trig_01GnFPkfx7EjrWKAuTBrXVdx`) and a Claude
  Code guidance-schema check (`trig_01UyjoYo9hbGqm7qTeb7HGVH`), emailing only on a mismatch.
  `CAIRN_GH_READ_TOKEN` expires 2026-10-19; the daily `cairn-tripwire` catches it early.
- A consumer `guard.rejected` with `detail: 'mismatch'`, `witness: 'field'` can be the known
  double-mint residual; the discriminator names any genuinely new one. Three ASC staging harvest
  docs are folded into cairn, deletable once `email-announce` settles; the heavy gate runs the
  component project serially (`--no-file-parallelism`).

## Resume prompt

In a fresh session, get Geoff's ruling on the `tool/v1.1.0` URL fork above, tag it, then conduct
retire-2a and retire-2b, each on its own branch and worktree. Cut `0.97.0` last;
`ROADMAP.md` sequences what follows.
