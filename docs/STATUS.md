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
  first, then Geoff's human test build. The owner steps for the first tool tag are done
  (2026-11-09): the two GitHub settings, the six platform packages published and bound to `tool.yml`,
  and the wizard's `next` tag removed and every version below 1.0.0 deprecated.
- theme-garden: Geoff approved the plan and ruled Decide G-1 yes (2026-11-09, Approval Queue item
  `20261109T022112-3127080`). G1 merged (#207, `64cbe711d`, the theme contract and Waymark's port);
  G2 merged (#208, `412900111`, the conformance set, viewer, check, and CI) under the plan's gates
  (`~/Projects/initiatives/theme-garden/plans/2026-11-08-theme-garden-plan.md`). Packet B
  (Approval Queue item `20261109T162647-560953`) carried the garden record: Geoff ruled that G3's
  planner starts now, and the garden grant's removal is his `[you]` step.
- cairn-setup tooling: Geoff approved the setup tooling design on 2026-11-09
  (`~/Projects/initiatives/cairn-setup/specs/2026-11-09-setup-tooling-design.md`) and packet A
  (item `20261109T122948-4007611`), then reversed S-3 at the sitting, so the clean room uses a
  subscription token (`CLAUDE_CLEANROOM_OAUTH_TOKEN`). Pre-flight items 1 to 9 are done and checked.
  Packet B (item `20261109T162647-560953`) was approved with all three asks as recommended: pass 1
  merged as glw907/workstation#215 (`0ed69fb`, the clean room, installed with `stow -R bin`), and
  pass 2 merged as #210 (`3774597a6`, the token option, the three-leg gate, and the proving skill).
  The token-mode deploy secret merged as built, with the narrow deploy token filed as #424, due
  before the stable cut.
- Approved clean-room template: `bin/.local/share/cleanroom/settings.json` in ~/.dotfiles, sha256
  `a779f417d273985ebcb095fcf3623f6b44634a2e7c39747bc256612e6a27720c`. Pass 3's probe proceeds
  without a packet while this holds (S-1); a change follows S-5.
- Pass 3 (`cairn-cms-setup-tooling-3`, session `6500d57b`, the polish loop) launched 2026-11-09
  after its launch checks. Geoff ruled that no rc is cut until the install is tested (initiatives `782a946`):
  each round publishes a `dev` test build under `gate` (#214). The overnight packet (item
  `20261109T202146-796403`) set the budget stop at ten naive runs or $100 and lets a held-path round PR
  merge after a fresh review. A fresh `conductor-cairn-cms` runs the night from
  `~/Projects/initiatives/cairn-setup/plans/2026-11-09-setup-tooling-overnight-conductor-prompt.txt`. G3's design session (`cairn-cms-theme-garden-3-design`, session
  `5013bd5e`) prepares the design and waits for Geoff to attach. Theme-garden launches hold during pass 3's T3.5 dependency sweep.

- **Pass 3 resumed on 2026-11-10 under Geoff's rulings** (executor `cairn-cms-setup-tooling-3`; Approval
  Queue item `20261110T032922-1565189`, then chat). The $100 line counts only the clean room, every ledger
  row, probe sessions included; the executor's session is no longer priced, and the ten-run cap stays, so
  four naive runs remain. Setup's opening counts only A, AAAA, and CNAME records on an address (#430, closed).
  S-2 stays narrow: rely on the sandbox stop and the docs, and revisit after round seven with its evidence.
  The test build on `gate` is engine `0.99.0-dev.1` and tool `2.0.0-dev.4`; `latest` and `next` never moved.
- **Order change (Geoff, 2026-11-10, in chat).** The scripted leg (T3.4) runs before round seven, on the next
  snapshot (`2.0.0-dev.5`), because no naive run has passed the GitHub App install and the deploy, DNS and
  HTTPS, and sign-in stages have never run live. Scripted runs loop, each fix going through one PR, a
  whole-branch review, the conductor's merge, and a new snapshot, until one reaches an owner signed in on
  `gate.carin-test.org` or stops yielding fixes. Then the four naive runs. A scripted run is outside the
  ten-run cap, and its ledger rows count toward the $100.
- The loop's lists are `~/Projects/initiatives/cairn-setup/research/proving/round-1.md` to `round-6.md`. No run
  has reached a deploy, so the three speed fixes have no reading yet. The final PR carries `## Decisions` (the
  clock reset, the process point, this reorder) and the runbook, T3.6, which is not written.

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
