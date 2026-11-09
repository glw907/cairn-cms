# cairn-cms status

Present tense only; history lives in git and PR bodies, orientation in `CLAUDE.md`.

## Current state

Published stable: **`0.98.0`** on npm `latest` for `@glw907/cairn-cms` and `@glw907/cairn-cms-dev`;
the Go tool is `tool/v1.1.0`. The newest candidate is **`0.99.0-rc.4`** (cut commit `275892869`):

- It passed the release gate (run `20261107T151545`, four legs, one run id) and was promoted by the
  `publish.yml` dispatch run 42430858765. `next` and `gate` serve it on all three packages, and
  `create-cairn-site@latest` serves it.
- It carries the narrow Workers Builds token (#341), the name-clash guard and true DMARC copy (PR
  #200), every minor and patch through the 2026-11-07 sweep, and vitest 5. Node stays 24 (#333).
- Geoff ran the real install on it, a clean-room setup of 907.life, and it went badly: five setup
  defects the gate never exercised, and a wizard he called "way too manual, user-hostile, and
  apparently quite fragile". He ruled on 2026-11-07 that `0.99.0` takes **no stable from rc.4**.
  The lessons form the next release, and nothing ships in the meantime.
- The 907.life site from that run is torn down; its rerun waits on the setup fixes.

## Immediate next action

The cairn-setup run's six passes are merged on `main`, conducted unattended by `conductor-cairn-cms`
(session `e82b126f`) under the plan's Decide 11 gates
(`~/Projects/initiatives/cairn-setup/plans/2026-11-08-cairn-new-plan.md`). P7, the cairn.pub docs
pass, was dropped by Geoff on 2026-11-08.

- Merged: P1 (#201, `1f131f871`, the setup engine), P2 (#203, `3345cfccb`, the command and its agent
  lane), P3 (#204, `2cdae8485`, the terminal view), P4 (#202, `a55cf548e`, the standard starter
  set), P5 (#205, `2665adbff`, the setup skill, plugin, and docs), and P6 (#206, `a9664caed`, the
  launcher and platform packages, the tool release's npm publish, the wizard retired, and `cairn new`
  shown). Review records are in `~/Projects/initiatives/cairn-setup/reviews/`.
- No release is cut until the tooling gates in
  `~/Projects/initiatives/cairn-setup/research/handoff-tooling.md` exist; the agent-driven runs come
  first, then Geoff's human test build. The first tool tag also needs two GitHub settings and the
  first publish of the six platform packages, both owner steps (`cairn-releasing`, "The launcher and
  its platform packages").
- Next: Geoff's record packet in the Approval Queue (item `20261109T022112-3127080`), which also carries the theme-garden plan
  (`~/Projects/initiatives/theme-garden/plans/2026-11-08-theme-garden-plan.md`). On its approval the
  conductor re-checks the plan's citations against `main` and launches G1.

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
