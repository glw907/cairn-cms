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

Pass 3 of the cairn-setup run is paused at the owner install. `main` holds #239 (`b3d0c2062`). `create-cairn-site`
2.0.0-dev.8 and its six platform packages are on `gate` (engine 0.99.0-dev.1), and `latest` and `next` have not
moved. dev.8 is the candidate: its scripted run passed (`2611110722`, done screen "Setup took 1:47") and naive run 10
passed on a regrade (`2611110815`, goal to signed in 3.8 minutes, no permission prompts), which ends the naive leg at
10 of 15 runs with no cairn fix PR. Runs 9 and 10 first failed on the grader (#238, #239), never on cairn. The
conductor's notes are `~/Projects/initiatives/cairn-setup/research/2026-11-09-conductor-end-packet-notes.md`.

Geoff ruled on 2026-11-11 that the Survey theme is built first, so the owner install of 907.life uses it. Nothing is
live from the harness, and no run or sweep is due.

1. The Survey theme (theme-garden), then Geoff's install of 907.life on dev.8 or a later snapshot. Its prep is in
   `~/.local/state/cairn-rehearsal/907-walkthrough/`: the picture walk-through (`index.html`), the DNS prep
   (`dns-prep.md`: delete the apex `AAAA 100::` placeholder and the `www` CNAME by record id only when Geoff starts,
   then drop `cloudflare/dns/apex` in `~/Projects/servers`), and `morning-message.md`. The text walk-through is
   `~/Projects/initiatives/cairn-setup/research/907-live-walkthrough.md`. Recheck the record ids before deleting,
   since the snapshot may change, and check the three `/.well-known` 308s to ward after setup. His friction log
   outranks the naive lists, and its fixes ship as one PR per sitting.
2. T3.4's close (#366 to `## Done`), T3.5 (the dependency sweep, the final candidate, a scripted leg on it, and one
   naive run only if the sweep touched a rerun path), and the end packet. The end packet carries #461's done-screen
   line (Cloudflare keeps a "cairn" Connected Applications row after the revoke, though the tokens are dead), the
   open question of the Install step briefly granting All repositories, and #239's watcher match, which is not yet
   seen on a live room.

What a session needs to know:

- The clean room: the approved template's sha256 is `5975706c2e4524371c3c743ec7b59aa31811c6e75951cb389a830e38e8871386`
  (glw907/workstation#226, Geoff, Approval Queue item `20261110T200035-16373`): `allowUnsandboxedCommands` is on, with
  the ask rule `Bash(dangerouslyDisableSandbox:true)` so every unsandboxed retry raises a prompt. The part-one probe
  passed on it with no leak. `cairn-proving-setup` says how the executor answers that prompt.
- Not yet proved live: #233's dead-tab mail sign-in; #234's retry and authority wait (unit tests only).
  Open on the lists: #453 (no HTTPS-wait time on a scripted grade), #454, #456.
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
- theme-garden: G1 (#207) and G2 (#208) are merged. G3's design session waits for Geoff to attach. The Survey theme is next (Geoff, 2026-11-11), and theme-garden
  launches hold during pass 3's T3.5 dependency sweep.

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
