# cairn-cms status

Present tense only; history lives in git and PR bodies, orientation in `CLAUDE.md`.

## Current state

Published stable: **`0.98.0`** on npm `latest` for `@glw907/cairn-cms` and `@glw907/cairn-cms-dev`;
the Go tool is `tool/v1.1.0`. The `0.99.0` release is in its candidate phase:

- `0.99.0-rc.3` (cut commit `4644cd35b`) is on the hidden `gate` dist-tag for all three packages. It
  carries the setup fix (PR #193): a declined domain continues to Workers Builds, and a domain or email
  change after Builds is committed and deployed by Builds.
- `next` still serves `0.99.0-rc.2` on all three, and `create-cairn-site@latest` serves `0.99.0-rc.1`.
  Both candidates carry the workers.dev publish-never-deploys defect, and since 2026-11-04 both are
  deprecated on all three packages. The stale `rc` dist-tag is gone. Each package's trusted publisher
  is bound to the `npm-publish` GitHub environment, which takes only `v*` tags.
- The release gate (`scripts/gate/`, run by `bash scripts/gate/run-gate.sh`) has run four times on
  `rc.3` and never passed. Each run found one harness gap, fixed in `fc91768c5` and `a8cdf5944`. Run 4
  went end to end, and its teardown removes everything. Its open findings are in the ledger
  (`~/.local/state/cairn-agent-first/ledger.md`, the entries dated 2026-11-03).
- Geoff ruled on 2026-11-03 that #341 (a narrow Workers Builds build token) lands before the stable,
  as its own pass and `rc.4`. Run sheet step 11a records it.

**The sequence (Geoff, 2026-11-01).** One conductor runs the approved run sheet
(`~/.local/state/cairn-agent-first/design-audit/run-sheet.md`, rulings in `ledger.md` beside it).
Steps 11 to 15 were rewritten on 2026-11-03 for the gated release, and step 20 adds the close-out
Geoff asked for: a documented release process and Claude infra tuned for it.

## Immediate next action

The release round runs under `conductor-cairn-cms` (launched 2026-11-04). Geoff approved the design
and both plans in packet `20261103T221624-3306025`, with the ceiling at 2,210 path minutes, and ran the
pre-flight sitting the same day. The conductor launches two passes in parallel: pass A (gate and
product, `auth-data`, branch `release-gate-a`) and pass B (release process and infra, `runner`, branch
`release-process-b`). It sends one packet when both reach PR-ready, then cuts `rc.4`, gates it once,
and promotes it on four passes before Geoff's real install. Its prompt, the plans, the spec, and the fold
records are under `~/Projects/initiatives/shared-standards/plans/` and `specs/` (2026-11-03). A session
resuming the round reads the conductor prompt
(`shared-standards/plans/2026-11-03-release-conductor-prompt.txt`) and the ledger.

## Pass B (release-process-b)

Session `cairn-cms-release-process-b` (job fac6c195), conductor `conductor-cairn-cms`. Stops land here.
Base `3dd158c67`. Task in flight: B1.

## Open decisions and watches

- `BACKLOG.md` lists open items, each with a `Placement` line, and `## Won't do` holds Geoff's
  rulings. The full backlog sweep ran at the close of pass 8 and wrote
  `~/.local/state/cairn-agent-first/2026-11-02-backlog-triage.json` for the sitting (four drop rows,
  fifteen defer rows). Geoff's release sitting landed its two drops (#284, #190) under `## Won't do`.
  The 2026-11-03 full sweep (`2026-11-03-backlog-triage.json`) is not yet decided.
- Docs: the human gate design is approved and unbuilt, outside this run. The 94 boundary-test
  verdicts and the capture runbook are at the `pre-agent-first` tag.
- Routines: sveltejs/kit#17368 merged on 2026-10-14, so its routine (`trig_01KPzLTU7rzLMQUp2y6bjZtm`)
  is due for deletion at claude.ai/code/routines (an agent cannot); held majors
  (`trig_01UCoKqxRXVwAfMdnF913E4v`); remote functions reaching stable
  (`trig_0193pPNoyxsTGeUhF1xx7woa`).
- Node 26 floor only if Active LTS; TypeScript 7 waits on `tsgo.yml`; the release runs `check:dev-package` and `npm pkg fix`
  (four `./` `bin` entries).
