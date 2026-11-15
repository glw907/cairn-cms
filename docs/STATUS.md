# cairn-cms status

Present tense only; history lives in git and PR bodies, orientation in `CLAUDE.md`.

## Current state

Published stable: **`0.98.0`** on npm `latest` for `@glw907/cairn-cms` and `@glw907/cairn-cms-dev`; the Go tool is
`tool/v1.1.0`. `next` and `create-cairn-site@latest` serve **`0.99.0-rc.4`** (cut `275892869`), which passed the
release gate and was promoted. Geoff's real install on it went badly, and he ruled on 2026-11-07 that `0.99.0` takes
no stable from rc.4: the setup rebuild (`cairn new`) forms the next release, and nothing ships until then. `gate`
carries the dev snapshots named below.

## Immediate next action

Setup-tooling pass 3 is closed (#244, merged at `e17c3c47e`). Its dev snapshots stay on `gate`: engine 0.99.0-dev.2
and `create-cairn-site` 2.0.0-dev.9 with its six platform packages. `latest` and `next` have not moved. On that
candidate the scripted leg passed (`2611140406`) and the naive leg passed (`2611140542`, 14 of 15 naive runs used).
The gate rows sit in the private record `~/.local/state/cairn-gate/records/gate-0.99.0-dev.2.md`; only `owner` is
missing.

1. Round `tui-language` is running under `conductor-cairn-cms` (prompt `initiatives/cairn-setup/plans/2026-11-13-tui-language-conductor-prompt.txt`).
   Pass 1 `style` is executed by session `cairn-cms-tui-language-1` (cdc9fb8d-7d0b-43ec-afb3-f7459f63d928), draft PR #245.
2. Geoff's 907.life live setup waits for Survey (his ruling, 2026-11-14): theme-garden G3 in the theme round he
   starts, probably after cairn.pub work so the site can show themes, then an installer step with no plan yet. That setup writes the release's `owner` row. It runs on
   the candidate that installs Survey, with the wide All-repositories grant accepted (#473 looks for a narrower
   order), and starts with `npm_config_tag=gate npm create cairn-site`.
3. At the start of that sitting, in order:
   - Claude rehearses the tokenless path on that candidate as Geoff's account; his step is the passkey. Claude
     reads every screenshot, refreshes the private walk-through at
     `~/.local/state/cairn-rehearsal/907-walkthrough/`, then deletes the App and the test site.
   - Claude deletes the old leftovers after a dry run: two Cloudflare user tokens named "cairn create-cairn-site"
     and seven test Apps on Geoff's account, one of them (cairn-rc2-install) installed.
   - On Geoff's "starting", Claude shows the dry run of the two DNS deletions (`dns-prep.md` in the walk-through
     folder) and deletes them. No `make -C tool check` runs while his setup is live (port 49152).

What a session needs to know:

- The clean room: the approved template's sha256 is `5975706c2e4524371c3c743ec7b59aa31811c6e75951cb389a830e38e8871386`
  (glw907/workstation#226, Geoff, Approval Queue item `20261110T200035-16373`): `allowUnsandboxedCommands` is on, with
  the ask rule `Bash(dangerouslyDisableSandbox:true)` so every unsandboxed retry raises a prompt. `cairn-proving-setup`
  says how the conductor answers that prompt, and that a finished run ends with `/exit`, never `cleanroom stop`.
- A scripted run: `bash scripts/gate/run-gate.sh sweep`; `resolvectl flush-caches`, and never query the new host
  yourself before the run; `run-gate.sh scripted` (no `--cairn-bin` for the published path); a Monitor of `grep
  --line-buffered` alone on `<run dir>/scripted.jsonl`; then `cleanroom stop geoff`, `grade` on the run dir the
  launcher prints (`/var/tmp/cleanroom/<id>/run`, never the gate-state `runs/<id>-scripted` directory), `sweep`, and
  `sweep --apply`. Tool tests bind port 49152: run no `make -C tool check` while a run is live. This host's Go lags the
  vulnerability database, so `make -C tool vulncheck` needs `GOTOOLCHAIN=go1.27.4` until Homebrew ships 1.27.4.
- Held paths go to Geoff in one small packet: `.github/**`, `scripts/release/**`, `.claude/settings*`, the sweep's
  name matcher, and `cleanroom`'s secret, environment, user, and stop code.
- No release is cut until the tooling gates in `~/Projects/initiatives/cairn-setup/research/handoff-tooling.md`
  exist. The owner steps for the first tool tag are done (2026-11-09).
- theme-garden: G1 (#207) and G2 (#208) are merged. G3's design is approved (item `20261109T194535-695594`) and its plan
  (`initiatives/theme-garden/plans/2026-11-09-theme-garden-3-plan.md`) has never launched. It was read at `68eb92ecf`,
  so its pre-flight re-check runs against `main` first. Geoff's theme round takes it up; no conductor holds it.
- theme-catalog-1 is merged (#246, `ef9e37206`; `conductor-theme-catalog`, executor `cairn-cms-theme-catalog-1`). The
  `catalog` run published Waymark 1.1.0: index https://catalog.cairn.pub/index.json, demo
  https://demo-waymark.cairn.pub/. Nothing reads the catalog yet, and BACKLOG #486 comes before a second theme joins
  `themes/`.
- Round `events` (`conductor-events`): pass 1 `feed` is merged (#250, `buildICalendarResponse` in `/delivery`; no
  engine release). Passes 2 and 3 wait on Pennant pass 4's accepted review. Resume from
  `initiatives/theme-garden/plans/2026-11-14-events-conductor-prompt.txt`.
- Round `pennant` (`conductor-pennant`): pass 1 `cards` is PR #251 (checks green, review `escalate` with one open
  finding on the `scripts/checks/gate-table.json` runner path, two calls for Geoff) and waits for the close packet. Pass 2
  `home` is draft PR #253, executor `cairn-cms-pennant-2` relaunched after the 2026-11-15 12:40Z API outage. Passes 3 and
  4 follow; pass 4 waits for a close packet. Resume from
  `initiatives/theme-garden/plans/2026-11-14-pennant-conductor-prompt.txt`.

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
