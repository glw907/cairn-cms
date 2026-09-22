# cairn-cms status

Present tense only; past tense lives in [`docs/HISTORY.md`](HISTORY.md), durable orientation in
`CLAUDE.md`. `cairn-pass` rewrites this at each pass-end.

## Current state

Published: **`0.96.0`** on npm `latest`. `main` carries every pass through the Go tool's B2 (PR #71),
the doctor-retirement pre-task, retire-1, and draft docs pass A, unpublished under `## Unreleased`;
the window holds for one cut and includes the tool's 1.0 (`tool/v1.0.0`, `tool/v1.0.1`, commit
`9b479e8d`). Held majors: `devalue` 6, TypeScript 7, Vitest 5. CI is green.

**The doctor retirement is half done.** `cairn doctor`, eleven checks over a directory exiting 0 to
3, merged untagged from `doctor-go`; retire-2a removes the engine's doctor. **Draft docs pass A is
merged**: the tool's three contract pages and its seven JSON schemas live under `docs/reference/`
and `docs/reference/schema/`, inside the npm tarball, `tool/docs/reference/` holds only a stub, and
the Go side cites cairn.pub URLs and schema `$id`s. HISTORY takes both merge SHAs at the next
close; cairn.pub's own debt is
[this handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md), and it stays un-pinnable
against the registry since `0.95.0` on `pass-d-docs-tracks`.

Live contracts from the pre-task: `tool/internal/spine/conditions.json` and
`tool/internal/doctor/site-config-path.json` under `check:tool-conditions`, and
`.cairn/site-facts.json`, written by `cairn-manifest`, verified in the plugin's `buildStart`.

## Immediate next action

**Tag `tool/v1.1.0`** from pass A's merge SHA or later, by this session under Geoff's pre-grant;
the runbook is Tasks 22b and 23 of
`docs/superpowers/plans/2026-09-14-cairn-tool-1-0-pass.md`. Four things happen before it: confirm
each distinct `https://cairn.pub/docs/admin/<page>` a failure block prints resolves on deployed
cairn.pub (one that does not means the tool prints anchor text without a URL, and a `v1.1.x` patch
adds it after the pin bump); bump `version.Documented` only if the pages' stated version changes,
`1.1.0` today; correct `tool/docs/release-candidate-notes.md:68`, still saying the schemas live in
`docs/reference/`; and add the ADR-0002 addendum for the `pflag` promotion
(`otherDirectRequires` 5 to 6). Pass A's plan froze that addendum and that notes correction.

**The `0.97.0` cut HOLDS on five steps, in order (Geoff, 2026-09-21):** the tool's 1.0 (DONE, with
the pre-task behind it); retire-1 (DONE); draft docs pass A (DONE); one `tool/v1.1.0` tagged from a
commit carrying retire-1 and pass A; the engine removal, retire-2a then retire-2b. Each close writes
only its own line, and **ONLY retire-2b's close, the last to land, releases `0.97.0` from this
hold**. A cut session finding no such line does not cut, whatever any mechanical gate says.
Retire-2a owns two carry-forwards: `site-facts.md:36` links the `doctor.md` it deletes, and
`doctor.md:79-86` and `facts/reference.md`'s doctor section still share `config.bindings-missing`
between the two config checks.

## Open decisions and watches

- Node 26 becomes the floor at beta only if it is Active LTS by then (Current until Oct 2026);
  TypeScript 7 stays held until `svelte-check --tsgo` runs green (`tsgo.yml` checks weekly).
- extend-1's two advisory audit rules go to error tier at `0.98.0`; `cairn-audit --rendered` counts
  differently on identical runs (133 then 116), so stabilize it before trusting either number.
- Monthly routines: a Cloudflare capability review (`trig_01GnFPkfx7EjrWKAuTBrXVdx`) and a Claude
  Code guidance-schema check (`trig_01UyjoYo9hbGqm7qTeb7HGVH`), emailing only on a mismatch.
  `CAIRN_GH_READ_TOKEN` expires 2026-10-19; the daily `cairn-tripwire` catches it early.
- A consumer `guard.rejected` with `detail: 'mismatch'`, `witness: 'field'` can be the known
  double-mint residual; the discriminator names any genuinely new one. Three ASC staging harvest
  docs are folded into cairn, deletable once `email-announce` settles; the heavy gate runs the
  component project serially (`--no-file-parallelism`).

## Resume prompt

In a fresh session, tag `tool/v1.1.0` from its runbook above, then conduct retire-2a and retire-2b,
each on its own branch and worktree. Cut `0.97.0` last; `ROADMAP.md` sequences what follows.
