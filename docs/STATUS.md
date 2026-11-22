# cairn-cms status

Present tense only; history lives in git and PR bodies, orientation in `CLAUDE.md`.

## Current state

Published stable: **`0.98.0`** on npm `latest` (`@glw907/cairn-cms`, `@glw907/cairn-cms-dev`).
The Go `cairn` tool and the `create-cairn-site` launcher are deleted from `main` (pass `tool-delete`, #260); the `cairn` command is being rebuilt inside the engine package.
`next` serves **`0.99.0-rc.4`**; the launcher is deleted from `main` and nothing new is published. Geoff ruled on 2026-11-07 that `0.99.0` takes no stable
from it: the setup rebuild (`cairn new`) forms the next release, and nothing ships until then.

## Immediate next action

Dev snapshots (engine 0.99.0-dev.2) stay on `gate`; nothing new is published. The next design is the route that
rebuilds the `cairn` command inside the engine package.

<!-- round-report route -->
Cairn route, round checks: one list of checks and one runner have landed, and CI still calls its own commands
Round `checks` has closed. `checks-1` (#261) made `scripts/checks/registry.mjs` the one list with `run.mjs` as its runner, and `checks-2` (#262) gave every check script one form. `checks-3`, which makes CI call the runner, was dropped on Geoff's answer. Nothing waits for Geoff.

Open documents: none (report `20261122-002054-18a85a` sent).
Resume from: /var/home/glw907/Projects/initiatives/theme-garden/plans/2026-11-17-route-checks-conductor-prompt.txt
Next launch: /var/home/glw907/Projects/initiatives/theme-garden/plans/2026-11-17-route-surface-conductor-prompt.txt (round `surface`; the desk launches it once its start line holds).
<!-- /round-report -->

<!-- round-report pennant -->
Pennant 1.0.0 and Waymark 1.2.0 are published, and the Pennant demo is live
All four passes are merged: #251, #253, #254 and #255. The catalog lists Pennant 1.0.0 and Waymark 1.2.0, and https://demo-pennant.cairn.pub/ serves the Turnagain Geographic Society with the Pennant theme. Nothing waits for Geoff.

Open documents: none.
Resume from: /var/home/glw907/Projects/initiatives/theme-garden/plans/2026-11-14-pennant-conductor-prompt.txt
<!-- /round-report -->

Open follow-ups from the round: the C11 comment leftovers (#508, #524), H2 (#515), the light-health cosmetic findings (#523), and pass 2's changelog undercount (#522); filings run #491 to #524.

1. Geoff's 907.life live setup waits for Survey (his ruling, 2026-11-14): theme-garden G3 in the theme round he
   starts, then an installer step with no plan yet. It writes the release's `owner` row, runs on the candidate that
   installs Survey with the wide All-repositories grant accepted (#473), and starts with `npm_config_tag=gate npm create cairn-site`.
2. At the start of that sitting, in order: Claude rehearses the tokenless path as Geoff's account (his step is the
   passkey), refreshes the walk-through at `~/.local/state/cairn-rehearsal/907-walkthrough/`, and deletes the App and
   test site; deletes the old leftovers after a dry run (two Cloudflare user tokens, seven test Apps); on Geoff's "starting", shows the two-DNS-deletion dry run (`dns-prep.md`) and deletes them.

What a session needs to know:
- Held paths go to Geoff in one small packet: `.github/**`, `scripts/release/**`, `.claude/settings*`, the sweep's
  name matcher, and `cleanroom`'s secret, environment, user, and stop code.
- No release is cut until the gates in `~/Projects/initiatives/cairn-setup/research/handoff-tooling.md` exist.
- theme-garden G3's design is approved (item `20261109T194535-695594`); its plan
  (`initiatives/theme-garden/plans/2026-11-09-theme-garden-3-plan.md`) has never launched and re-checks against `main`
  first. Geoff's theme round takes it up.
- theme-catalog-1 is merged (#246; `conductor-theme-catalog`). The `catalog` run published Waymark 1.1.0: index
  https://catalog.cairn.pub/index.json. Nothing reads the catalog yet, and BACKLOG #486 comes before a second theme.
- Round `events` (`conductor-events`): pass 1 `feed` is merged (#250, `buildICalendarResponse` in `/delivery`; no
  engine release). Passes 2 and 3 are held (the design's `Held:` line) and launch nothing. Round two's design, site basics, retires them and builds events as a feature layer. Resume from
  `initiatives/theme-garden/plans/2026-11-14-events-conductor-prompt.txt`.
- Round `pennant` is closed. Pennant 1.0.0 and Waymark 1.2.0 are published; backlog #539 holds the banner-split hardening for 1.0.1.
- Next action: round `checks` is running under `conductor-cairn-cms`; see the route block above.

## Open decisions and watches

- `BACKLOG.md` lists open items, each with a `Placement` line; `## Won't do` holds Geoff's rulings. The 2026-11-03
  full sweep (`2026-11-03-backlog-triage.json`) is not yet decided.
- Docs: the human gate design is approved and unbuilt; the boundary-test verdicts are at the `pre-agent-first` tag.
- Routines: sveltejs/kit#17368 merged, so its routine (`trig_01KPzLTU7rzLMQUp2y6bjZtm`) is due for deletion at
  claude.ai/code/routines (an agent cannot); held majors (`trig_01UCoKqxRXVwAfMdnF913E4v`); remote functions
  (`trig_0193pPNoyxsTGeUhF1xx7woa`).
- Node 26 floor only if Active LTS; TypeScript 7 waits on `tsgo.yml`; the release runs `check:dev-package` and `npm pkg fix`
  (four `./` `bin` entries).

## checks-2 executor

Session `cairn-cms-checks-2`, PR #262, branch `checks-2`, class `runner`. `scripts/checks/shared.mjs` (`ROOT`,
`runCheck`) is in and every check script a registry row runs ends in one `<name>: OK` or `<name>: FAIL` line;
`check-form.test.ts` holds the registry to it. The pass edits one held line (`scripts/release/preflight.mjs:15`) and
carries three `[advisor]` calls, so it lands through a `merge` document. The conductor lands it.
