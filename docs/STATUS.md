# cairn-cms status

Present tense only; history lives in git and PR bodies, orientation in `CLAUDE.md`.

## Current state

Published stable: **`0.98.0`** on npm `latest` for `@glw907/cairn-cms` and `@glw907/cairn-cms-dev`;
the Go tool is `tool/v1.1.0`. The newest candidate is **`0.99.0-rc.4`** (cut commit `275892869`):

- It passed the release gate (run `20261107T151545`, four legs, one run id) and was promoted by the
  `publish.yml` dispatch run 42430858765. `next` serves it on the two engine packages and
  `create-cairn-site@latest` serves it. `gate` now carries the dev snapshots named under "Immediate next action".
- It carries the narrow Workers Builds token (#341), the name-clash guard and true DMARC copy (PR
  #200), every minor and patch through the 2026-11-07 sweep, and vitest 5. Node stays 24 (#333).
- Geoff ran the real install on it, a clean-room setup of 907.life, and it went badly: five setup
  defects the gate never exercised, and a wizard he called "way too manual, user-hostile, and
  apparently quite fragile". He ruled on 2026-11-07 that `0.99.0` takes **no stable from rc.4**.
  The lessons form the next release, and nothing ships in the meantime.
- The 907.life site from that run is torn down; its rerun waits on the setup fixes.

## Immediate next action

Pass 3 of the cairn-setup run is closing. `main` holds the dependency sweep (#243, `34b614466`). Its dev snapshots are
on `gate`: engine 0.99.0-dev.2 and `create-cairn-site` 2.0.0-dev.9 with its six platform packages. `latest` and
`next` have not moved. On that candidate the scripted leg passed (`2611140406`) and the naive leg passed
(`2611140542`, 14 of the 15 naive runs used). The gate rows sit in the private record
`~/.local/state/cairn-gate/records/gate-0.99.0-dev.2.md`, and `verdict.mjs` lists only the `owner` row missing.

1. The close PR (branch `setup-tooling-r22`): the stand-in's throttle fix, the grader's timing from background
   output files, the `/exit` rule in `cairn-proving-setup`, and BACKLOG #469 and #470 from run 14.
2. The owner-path proof on this candidate: a tokenless `cairn new` in the clean room, driven by Claude in its own
   Chromium profile as the test account, every page screenshotted and read, then the 907.life walk-through refreshed.
3. The end packet, which asks Geoff for his live 907.life setup and whether it also writes the `owner` row. The
   Survey-or-Waymark question for that setup is in the packet, since Geoff said on 2026-11-11 that Survey comes first.

What a session needs to know:

- The clean room: the approved template's sha256 is `5975706c2e4524371c3c743ec7b59aa31811c6e75951cb389a830e38e8871386`
  (glw907/workstation#226, Geoff, Approval Queue item `20261110T200035-16373`): `allowUnsandboxedCommands` is on, with
  the ask rule `Bash(dangerouslyDisableSandbox:true)` so every unsandboxed retry raises a prompt. `cairn-proving-setup`
  says how the conductor answers that prompt, and that a finished run ends with `/exit`, never `cleanroom stop`.
- Run 14's HTTPS wait took 11.4 minutes because an early lookup cached "no such host" on this host (#469, #470).
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
- theme-garden: G1 (#207) and G2 (#208) are merged. G3's design session waits for Geoff to attach. The T3.5
  dependency sweep that theme-garden launches held for merged as #243.

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
