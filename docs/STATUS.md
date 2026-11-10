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
- **Order change (Geoff, 2026-11-10, in chat).** The goal is setup working end to end with no blockers, as
  fast as possible, and only then a naive agent on the working system. So the scripted leg (T3.4) runs
  first and loops: each failed run's fixes, and what can be seen coming in the stages after it, go in one PR
  with a whole-branch review and green CI, the conductor merging promptly. Naive runs wait until a scripted
  run gets an owner signed in on `gate.carin-test.org`; there is no "stops yielding fixes" exit, and a stall
  that cannot be fixed goes to the conductor. A scripted run is outside the ten-run cap and its ledger rows
  count toward the $100 (clean room only). Local builds are allowed when a snapshot slows the loop
  (`run-gate.sh scripted --cairn-bin tool/cairn`, merged in #228, recorded as a local build and never the
  release gate's scripted row); an engine-side fix gets a proposed local equivalent first, then one
  published snapshot confirms at the end. The leg targets `gate.carin-test.org` only, never the bare
  `carin-test.org` (a record on it or `www` is a standing stop), and nothing is confirmed until the summary
  shows the subdomain.
- **Scripted loop: an owner signed in (2026-11-10).** Run `2611101858`, a local build of the r11 branch
  (`run-gate.sh scripted --cairn-bin tool/cairn`), graded pass: setup finished in 2:40 on
  `gate.carin-test.org`, the stand-in clicked sign in and reached the admin, `GET /` and `GET /admin`
  answered 200, the sign-in email from `no-reply@gate.carin-test.org` reached the gate mailbox, and the
  site's engine pin was `0.99.0-dev.1`. The apex and `www` stayed untouched in every run (the sweep counted
  no records on them), and the summary was confirmed only after it showed the subdomain. Ten scripted runs
  in all (`2611101759` to `2611101858`); scripted runs use no model, so they added nothing to the clean-room
  spend. What the runs found, all fixed on `setup-tooling-r11` with tests:
  1. `cairn new` takes no `--host` or `--zone` (agent lane only): the driver picks the domain on its screen
     and types the subdomain on the summary, in stages, and never confirms a bare summary.
  2. A local binary has no `npm_config_tag` (npm exports it to the launcher), so the tool fetched the engine at
     `latest`, which has no template: the scripted shell now passes `--env npm_config_tag=gate`.
  3. The stand-in died on the done page, whose `<h1>` leads with a check-mark glyph in its own span.
  4. The watch's "Connect <host>" step showed the zone after the owner saved a subdomain (tool, `newview`).
  5. The tool's HTTPS wait timed out on a live site, because its early requests made the machine's resolver
     cache "no such host" for the zone's 1800-second negative TTL. The domain step now asks the zone's
     nameserver first, inside the same 15 minutes (tool, `setup`); the end-to-end build turns it off.
  6. The driver's Enter, delayed by its screenshot, landed on the "Choose a domain" screen and accepted the
     first domain, `907.life` (production). That was the "A request to Cloudflare failed" stops: the token
     reads DNS on `carin-test.org` only, so the check got a 403. Nothing was created, and `907.life` was only
     read. The driver now answers only the screen still showing. #438 files the TUI side.
  7. The grader read the bare domain as the live origin and judged a scripted run as a naive one: it now reads
     the gate subdomain, finds the repository from the run name and the test token, compares only the engine
     pin for a local build (an unread launcher or platform still fails a published-snapshot run), reads the
     sign-in mail from the run's start with a 60-second wait, and judges a scripted run on its end state and
     its done screen. Runs 5, 7, and 8 used throwaway instrumented binaries (never committed) to read the
     hidden `Failure.Err` (#439).
- **Not done, in order (a fresh session takes these).** (a) The friction pre-pass below. (b) One published
  snapshot, `gh workflow run tool.yml --ref main -f snapshot=2.0.0-dev.5 -R glw907/cairn-cms`, then one scripted
  run on the published `npm create` path (`run-gate.sh scripted`, no `--cairn-bin`), which must pass with the
  launcher and platform versions read. (c) Naive round seven, then up to three more of the ten, only on the
  conductor's go. (d) The dependency sweep, the final candidate, and the runbook (T3.4 to T3.6). A scripted run:
  `bash scripts/gate/run-gate.sh sweep`, `make -C tool build`, flush the resolver (`resolvectl flush-caches`,
  and never query the new host yourself before the run), `run-gate.sh scripted --cairn-bin tool/cairn`, a
  Monitor on `<run dir>/scripted.jsonl` and `stand-in.jsonl`, then `cleanroom stop <id>`, `grade <run dir>`,
  `sweep`, `sweep --apply`. Tool tests bind port 49152: never run `make -C tool check` while a run is live.
- **Friction pre-pass inputs (Geoff's ruling: fix what a naive agent will meet before round seven, in the skill,
  the docs, `cairn --help` and `cairn new --help`, and the agent lane's messages; cobra-style plain writing, no
  marketing words, no em dashes in terminal output).** What I expect a naive agent to trip on:
  - *Running outside the sandbox (#427).* Every naive run asked the owner how. Claude Code's sandbox is off by
    default; `sandbox.excludedCommands` patterns match the text of the call; a blocked call can be retried with
    `dangerouslyDisableSandbox`, which the owner approves in a "Bash command (unsandboxed)" prompt unless an
    allow rule covers it (code.claude.com/docs/en/sandboxing). The skill's "How to run cairn" paragraph is one
    dense block; say in two sentences to make the call and let the prompt be the owner's approval, and split the
    rules into a short list.
  - *A token already set (#431).* An agent that finds `credential: token` and did not set the variable stops to
    ask. Say that setup reads `CAIRN_CF_SETUP_TOKEN`, reports `credential: token`, and the agent relays it and
    goes on.
  - *No cause on a provider failure (#439).* "A request to Cloudflare failed" reads as a network fault; the real
    cause was a 403 on `GET /zones/<id>/dns_records`. A detail line with the status and endpoint, and wording
    the Cloudflare 403 by the missing permission, is the small form. `Failure` is fixed copy that goes into events
    as it is, so it touches the event schema, `cairn help agents`, the goldens, and `check-copy`.
  - *Several domains (#436, #438).* A plan for a subdomain leaves `zone` empty when the account holds several
    domains, and `--apply` refuses it; the page now says to give `--zone`, and the tool could fill it from the
    host's suffix. In the TUI the browser frame says "Enter open your browser" before setup arms it, and the
    domain list preselects the first domain.
  - *The agent's own lookups.* An agent that polls the new address with `curl` or `dig` before the record exists
    makes the computer's resolver cache "no such host" for up to 30 minutes, which defeats the tool's later check.
    The skill and the page should say to leave the address alone until the `summary` event.
  - *Time.* Setup took 2:40 here and can take 15 minutes at the HTTPS step with no `waiting` event; say so, and
    say that the run is not stuck. The agent page and skill also say the first approval is Cloudflare's; in a
    token run it is three GitHub approvals.
  - *Help text.* `cairn --help` and `cairn new --help` should name the two lanes (a person at a terminal, an
    agent with `--plan` and `--apply`), say when to use each, list the agent flags with one example invocation,
    and point to the setup skill and `docs/admin/set-up-with-an-agent.md`. `cairn help agents` is the generated
    guide (`make agent-guide`).
  - *Already fixed and merged, do not redo:* no `--yes`, `-y`, tag, `new`, or `cd` with `npx`; the install-button
    name; the stand-in's `failed` line; `grade` finishing; the sandbox stop (#224); the subdomain check (#225);
    the bare-address mail records (#227); `--cairn-bin` and the subdomain target (#228).
  - *Open on the lists, still true:* #433 (probe a plain `npx create-cairn-site` on both sides of the sandbox),
    #434 (agents write `new` after the name), #435 (stand-ins left running; end a run when the stand-in's `failed`
    line appears), #420 (`cairn new` inside a Linux sandbox waits on an unreachable tab).
- **Clock.** T3.3's clock (reset once, 645 minutes) stopped at 476 minutes at 09:20 AKST, and no new clock started.
  The final PR's `## Decisions` records the reset.
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
