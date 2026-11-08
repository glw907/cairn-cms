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

Geoff starts a fresh session with a brainstorm (`standards:brainstorming`) on how to work the new
site-build issues. The inputs are the `## High` items in `BACKLOG.md`, all tagged
`#initiative:907-rebuild`:

- **#365**: a stated AI posture leaves `site-facts.json` stale, so the first deploy fails.
- **#364**: the GitHub App's two browser steps.
- **#363**: the no-browser path. Geoff's rule: "any copy and paste of urls required during the
  setup process is a failure."
- **#362**: the wizard as its own design session, held to the web admin's UI bar, collecting
  everything up front.
- **#366**: a fast setup test suite that would have caught these.
- **#361**: theme choice at setup, the 907.life rerun's first need.

#360 (agent-ready setup planning) and the builders' friction files
(`~/Projects/initiatives/907-rebuild/plans/2026-11-08-friction-builder-{A,B}.md`) sit beside them.
The 907.life rerun's prerequisites, per Geoff, are #361, #362, #364, #365, and #366. The
rc.4 round's record is the ledger (`~/.local/state/cairn-agent-first/ledger.md`, entries dated
2026-11-07).

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
