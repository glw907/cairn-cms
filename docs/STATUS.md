# cairn-cms status

Present tense only; history lives in git and PR bodies, orientation in `CLAUDE.md`.

## Current state

Published stable: **`0.98.0`** on npm `latest` for `@glw907/cairn-cms` and `@glw907/cairn-cms-dev`;
the Go tool is `tool/v1.1.0`. The `0.99.0` release is in its candidate phase:

- `0.99.0-rc.3` (cut commit `4644cd35b`) is on the hidden `gate` dist-tag for all three packages. It
  carries the setup fix (PR #193): a declined domain continues to Workers Builds, and a domain or email
  change after Builds is committed and deployed by Builds.
- `next` still serves `0.99.0-rc.2` on all three, and `create-cairn-site@latest` serves `0.99.0-rc.1`.
  Both candidates carry the workers.dev publish-never-deploys defect, and neither is deprecated.
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

Plan, in a fresh session. Geoff stopped the gate's live trial and error on 2026-11-03: no more live
gate runs until a plan finds the remaining gaps from the source. Launch prompt:

> You are the planner for the cairn-cms `0.99.0` release's next pass, in a fresh session (Opus,
> high). Read `docs/STATUS.md`, the run sheet's steps 11 to 20, and the ledger's 2026-11-03 entries.
> Design one pass for Geoff's approval, through the `pass-core` and `cairn-pass` skills:
> 1. A desk walkthrough of the four gate legs (A1, A2, B1, B2 in `scripts/gate/legs.mjs`) against
>    the `create-cairn-site` source. For each leg: every prompt it meets given its flags, every URL it
>    opens and the page GitHub really shows, every wait against the driver's limits, the DNS
>    behavior, and each teardown step. Run 4's open findings come first: the harness clicks Save
>    instead of Publish; the closing block lacks the not-connected sentence on A1 (product or
>    expectation, unknown); an auto-approved OAuth authorize is held needlessly; the 600-second
>    no-output limit did not fire during a 30-minute domain hold; and this host's resolver
>    negative-caches `carin-test.org` for the zone's 1,800-second SOA minimum after a domain attach,
>    which a real owner could hit too.
> 2. Headless by default, with a `--headed` switch. An unrecognised page fails the leg, saving a
>    screenshot and its control labels (Geoff, 2026-11-03).
> 3. Backlog #341, and #345 to #349.
> 4. The gaps in `~/.local/state/cairn-agent-first/release-process-research.md`. Bring the four it
>    marks contestable to Geoff as decisions.
> 5. Run sheet step 20: the release process documented and moved into scripts where mechanical, and
>    Claude infra tuned for it through the `claude-infra` skill.
> The pass ends at `rc.4`, gated once. Standing constraints: no stable without Geoff's "install
> passed"; promotion only on a passed gate; Geoff's 2026-11-03 waiver of PR ceremony covered only the
> two harness fixes already landed; vault and secrets work belongs to the security session
> (`vault-key-setup-pass-cli`), and the gate reads only the age store.

## Open decisions and watches

- `BACKLOG.md` lists open items, each with a `Placement` line, and `## Won't do` holds Geoff's
  rulings. The full backlog sweep ran at the close of pass 8 and wrote
  `~/.local/state/cairn-agent-first/2026-11-02-backlog-triage.json` for the sitting (four drop rows,
  fifteen defer rows); it landed nothing.
- Docs: the human gate design is approved and unbuilt, outside this run. The 94 boundary-test
  verdicts and the capture runbook are at the `pre-agent-first` tag.
- Routines: sveltejs/kit#17368 merged on 2026-10-14, so its routine (`trig_01KPzLTU7rzLMQUp2y6bjZtm`)
  is due for deletion at claude.ai/code/routines (an agent cannot); held majors
  (`trig_01UCoKqxRXVwAfMdnF913E4v`); remote functions reaching stable
  (`trig_0193pPNoyxsTGeUhF1xx7woa`).
- Node 26 floor only if Active LTS; TypeScript 7 waits on `tsgo.yml`; the release runs `check:dev-package` and `npm pkg fix`
  (four `./` `bin` entries).
