# cairn-cms status

Present tense only; history lives in git and PR bodies, orientation in `CLAUDE.md`.

## Current state

Published stable: **`0.98.0`** on npm `latest` (`@glw907/cairn-cms`, `@glw907/cairn-cms-dev`); the Go tool is `tool/v1.1.0`.
`next` and `create-cairn-site@latest` serve **`0.99.0-rc.4`**. Geoff ruled on 2026-11-07 that `0.99.0` takes no stable
from it: the setup rebuild (`cairn new`) forms the next release, and nothing ships until then.

## Immediate next action

Dev snapshots (engine 0.99.0-dev.2, `create-cairn-site` 2.0.0-dev.9) stay on `gate`. The scripted and naive legs passed;
only `owner` is missing from `~/.local/state/cairn-gate/records/gate-0.99.0-dev.2.md`.

<!-- round-report 20261115-203300-0f2b03 -->
Round tui-language: every cairn command speaks one terminal language, and all four passes are merged
All four passes are merged. Pass 1 landed as #245, and passes 2 to 4 (#247, #249, #252) merged after your two close packets, in that order, with checks green. The round gives cairn health, logs, sites, doctor, auth, adopt, help and errors one layout, one palette and three tuning variables (CAIRN_THEME, COLORFGBG, CAIRN_PLAIN), and clears the debt in the packages it opened. Output on a pipe stays byte for byte what main prints, except one sentence in cairn --help and one newline on the piped auth set prompt. The installer round is next, after theme-garden G3, on the package this round built.

Open documents: none.
Resume from: /var/home/glw907/Projects/initiatives/cairn-setup/plans/2026-11-13-tui-language-conductor-prompt.txt
<!-- /round-report -->

Open follow-ups from the round: the C11 comment leftovers (#508, #524), H2 (#515), the light-health cosmetic findings (#523), and pass 2's changelog undercount (#522); filings run #491 to #524.

1. Geoff's 907.life live setup waits for Survey (his ruling, 2026-11-14): theme-garden G3 in the theme round he
   starts, then an installer step with no plan yet. It writes the release's `owner` row, runs on the candidate that
   installs Survey with the wide All-repositories grant accepted (#473), and starts with `npm_config_tag=gate npm create cairn-site`.
2. At the start of that sitting, in order: Claude rehearses the tokenless path as Geoff's account (his step is the
   passkey), refreshes the walk-through at `~/.local/state/cairn-rehearsal/907-walkthrough/`, and deletes the App and
   test site; deletes the old leftovers after a dry run (two Cloudflare user tokens, seven test Apps); on Geoff's "starting", shows the two-DNS-deletion dry run (`dns-prep.md`) and deletes them. No
   `make -C tool check` runs while his setup is live (port 49152).

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
  engine release). Passes 2 and 3 wait on Pennant pass 4's accepted review. Resume from
  `initiatives/theme-garden/plans/2026-11-14-events-conductor-prompt.txt`.
- Round `pennant` (`conductor-pennant`): pass 1 `cards` is PR #251 (review `escalate`, one open finding on the
  `scripts/checks/gate-table.json` path class, two calls for Geoff) and waits for the pennant close packet. Pass 2 `home`
  is draft PR #253 on `pennant-2` (cut from `pennant-1`), executor `cairn-cms-pennant-2`. Passes 3 and 4 follow; pass 4
  waits for a close packet. Resume from `initiatives/theme-garden/plans/2026-11-14-pennant-conductor-prompt.txt`.

## Open decisions and watches

- `BACKLOG.md` lists open items, each with a `Placement` line; `## Won't do` holds Geoff's rulings. The 2026-11-03
  full sweep (`2026-11-03-backlog-triage.json`) is not yet decided.
- Docs: the human gate design is approved and unbuilt; the boundary-test verdicts are at the `pre-agent-first` tag.
- Routines: sveltejs/kit#17368 merged, so its routine (`trig_01KPzLTU7rzLMQUp2y6bjZtm`) is due for deletion at
  claude.ai/code/routines (an agent cannot); held majors (`trig_01UCoKqxRXVwAfMdnF913E4v`); remote functions
  (`trig_0193pPNoyxsTGeUhF1xx7woa`).
- Node 26 floor only if Active LTS; TypeScript 7 waits on `tsgo.yml`; the release runs `check:dev-package` and `npm pkg fix`
  (four `./` `bin` entries).
