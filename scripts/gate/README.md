# The release gate harness

The tools that prove a cairn release the way an owner meets it: a credential smoke, a sweep that
cleans up what a proving run left, a mailbox reader, and the browser half a stand-in drives. Nothing
here ships in a package.

## Run it

```sh
bash scripts/gate/run-gate.sh --smoke
bash scripts/gate/run-gate.sh sweep
bash scripts/gate/run-gate.sh sweep --check-scopes
bash scripts/gate/run-gate.sh sweep --apply
bash scripts/gate/run-gate.sh probe
bash scripts/gate/run-gate.sh naive
bash scripts/gate/run-gate.sh scripted [--cairn-bin <path>]
bash scripts/gate/run-gate.sh grade <run dir> [--end stall|budget]
bash scripts/gate/run-gate.sh shell <name> [-c <command>]
```

`run-gate.sh` is the one entry. It sources `~/.local/secrets`, makes a run directory
`~/.local/state/cairn-gate/runs/<timestamp>` with mode 0700 (never in the worktree), and starts
`gate.mjs` under an environment built from an allowlist, not from the calling shell. It never
prints a value. The allowlist names the cleanroom token `CF_WS_CAIRN_CLEANROOM_TOKEN`,
`STALWART_PASSWORD_CAIRN_GATE`, the `GITHUB_TEST_*` names, the `GATE_*` names, and the display and
session-bus names a headed browser needs. `--headed` opens the browser window the sweep uses for
the Apps.

### Output, the lock, and the exit file

The first line the run prints is `run dir: <path>`. One run goes at a time: `run-gate.sh` holds a
`flock` on `~/.local/state/cairn-gate/lock` and writes `<pid> <run dir>` to `lock.holder`. A second
run refuses at once, names that line, and says whether the holder's process is alive. The lock
dies with the script, so a killed run frees it even if a child lives on. When the run ends,
however it ends, the script writes its final status to `<run dir>/exit`. Read that file to learn
how a backgrounded run finished.

## The runs

`probe`, `naive`, and `scripted` start a run in the clean room and return at once, printing the run
id, the tmux session, and the run directory. Watch with a Monitor, never `run_in_background`. The
run id is `YYMMDDHHMM` in UTC, so the owner card's site name is `Cairn gate <run id>`, and setup's
derived names follow: the repository and Worker `cairn-gate-<run id>` (with a `-<2-9>` suffix when a
name is taken), `-auth`, `-media`, and the App `cairn-cairn-gate-<run id>`. A run id whose directory
exists is refused.

`naive` runs `cleanroom init <run id>`, writes `harness.json` beside the run (the leg, the commit
this checkout is at, the engine and launcher versions the `gate` dist-tag resolves to, and the
harness's start time), starts the stand-in in tmux session `cleanroom-<run id>-stand-in`, and starts
`cleanroom run` with the goal sentence, the setup token and the Claude credential by name,
`npm_config_tag=gate`, and the caps. The stand-in's names go through a 0600 hand-off file it
sources and removes, so no value sits in argv; the Cloudflare token never reaches it. `scripted`
starts `scripted.mjs` as session `cleanroom-<run id>`, and that driver starts the stand-in itself. `probe` runs
`cleanroom init probe --fresh --discard` and `cleanroom probe probe` with the generic command list.
Neither `naive` nor `scripted` takes an EXIT teardown, since the run goes on after they return.

`scripted` sets up `gate.carin-test.org` in zone `carin-test.org` (`--host` and `--zone`), never the bare
domain: a record on the bare address or `www` is a standing stop, and the apex holds the mail records.
`--cairn-bin <path>` swaps the registry launcher for a `cairn` binary built from the branch
(`make -C tool build`, then `--cairn-bin tool/cairn`), so a fix is proved before it publishes. The run
keeps a copy of the binary, and its `harness.json` says `local` with the tool recorded as `local build at
<commit>` (the commit of the checkout the harness runs from, so build there), and `verdict.mjs` refuses a row whose tool reads `local build`. A local run is never the release gate's `scripted` row, which runs the published candidate.
A fix to the engine package (the template, the scaffold's output) still needs an engine snapshot, since
the build resolves the engine from the registry.

### What refuses a start

`naive`, `scripted`, `probe`, and `sweep --apply` refuse, naming what they found, while a
`cleanroom-*` tmux session is live on either socket, a ledger row reads `running`, or a process of
the clean room's user is alive. `naive` also refuses:

- while the sweep's dry run lists any target, any old-gate name, or any address record (it never
  deletes);
- a sixteenth naive run (every ledger row named for a run id counts, except a scripted one);
- when the remaining budget is under $5. The cap is the lower of $20 and $100 less the spend so far:
  every ledger row (a `running` row at its full cap), probe sessions included, and nothing else: the
  executor's own session no longer counts (Geoff, 2026-11-10, Approval Queue item
  `20261110T032922-1565189`). `--conductor-transcript` is still accepted and ignored;
- when the stowed template's `sha256` differs from the last passing row in
  `/var/tmp/cleanroom/probes.jsonl`.

## The grader and the record

`grade <run dir>` writes `run-record.json` and `run-record.md` in the run directory from the
transcript, `stand-in.jsonl`, `state.json`, `harness.json`, the registry record and npx cache in the
clean home, `cairn new status`, the new repository's `package.json` and first deploy's job steps, the
mailbox, and the live site. It copies the JSON to `~/.local/state/cairn-gate/proving/<run id>.json`
and diffs each step against the last record there. `cleanroom scan` then runs over both files, and a
match rewrites the record without its content and fails it. The home's keyrings are deleted last.

A read that fails is a failed check, and the record lists each by name. The outcome is `pass`, or
`fail` with `cost`, `time`, `stall`, `page`, `budget`, or `other`; a version unlike the candidate's
is `other: wrong candidate`. The four end-state checks are live, owner signed in, sign-in mail in
the mailbox, and installed versions equal to the candidate's, each with an evidence line.

The deploy phases come from the first `deploy` workflow run's job steps: install is a step named for
`npm install`, build is `npm run check` and `npm run build`, and deploy is the two `wrangler`
steps. The HTTPS wait is the `domains` step's minutes in setup's events. Provider waits are the
`first-deploy` and `domains` steps, and the agent's minutes are what remains of the goal-to-signed-in
time after setup's own steps. A missing source, phase, or HTTPS time fails the timing check and the
run as `other`. Permission prompts are read from the session log, and the flailing notes (a command
that failed three times, a file read three times, a doc question put to the owner, three prompts)
are cues for the conductor, each with the lines read.

## The release rule

The release body's `## Gate` table has one row per leg, `naive`, `scripted`, and `owner`, each with
the cairn-cms commit, the engine version, the tool version, the verdict, and the run id.
`verdict.mjs` exits 0 only with one `pass` row per leg: `scripted` at the release's own commit, and
`naive` and `owner` at commits with no change under a rerun path up to it. It reads each diff through
`gh api repos/glw907/cairn-cms/compare/<row commit>...<release commit>` and fails closed on a compare
that lists 300 files or more. `node scripts/gate/record.mjs carry --version <v> --from <commit>
--to <commit>` copies the `naive` and `owner` rows forward only across a diff that touches none of
the rerun paths, which `RERUN_PATHS` in `record.mjs` names.

## The smoke

`--smoke` prints the host name and one verdict per check, never a value:

- the cleanroom token at `/accounts/<id>/tokens/verify`;
- one read per permission group, each failing by name: Workers Scripts, D1, Workers R2 Storage,
  Account Settings, Zone, DNS, Email Sending, and Workers Routes;
- the machine account's `GET /user` (login and the `repo` and `delete_repo` scopes);
- a TOTP code computes;
- the mailbox answers over JMAP, and no method returns an error.

It only reads. A failed check does not stop the rest, and the exit code is 1 when any failed. It
also writes the keys and types of the replies, never a value, to
`src/tests/unit/fixtures/gate-reply-shapes.json`, which the setup tool's fakes are checked against.

## The sweep

`sweep` lists what proving runs left, by anchored name and never a substring. `GATE_NAME` in
`sweep.mjs` matches a repository, Worker, database, or bucket named for a run id, and `APP_NAME`
matches its GitHub App. A custom domain is listed only when its `service` names a matched Worker.

| Mode | What it does |
|---|---|
| `sweep` | A dry run: prints the delete list, the retired gate's `cairn-e2e-gate-` names in a report section, and any address record (A, AAAA, or CNAME) left on `carin-test.org` or `www` that no listed domain explains. Deletes nothing. Exits 1 when a record is named. |
| `sweep --apply` | Checks `tokens/verify`, then deletes in order: each repository (its queued and in-progress Actions runs cancelled first, so no deploy brings a Worker back), the custom domains, Workers, databases, buckets (emptied first), and Apps. A target already gone is skipped, and each step is logged to `sweep.log` in the run directory. |
| `sweep --check-scopes` | Removes probe leftovers, then creates and deletes one `cairn-gate-probe-<time>` resource per family (Worker, custom domain, D1, R2, repository), reads one endpoint per other group, and checks the Apps family by the settings page listing Apps with sudo passing. A missing scope fails it naming the family. |

The sweep deletes no DNS record: setup only reads records, and Cloudflare removes a custom domain's
record with the domain. The zone's Email Sending records are never candidates. Run
`--check-scopes` after any token change.

## The parts

| File | Role |
|---|---|
| `run-gate.sh` | The entry: secrets, run directory, allowlisted environment, and the `probe`, `naive`, `scripted`, `grade`, and `shell` forms. |
| `grade.mjs` | Reads a finished run and writes its record. |
| `gate.mjs` | The smoke, the browser session, and the command line. |
| `sweep.mjs` | Lists, deletes, and probes, over the Cloudflare and GitHub APIs. |
| `mail.mjs` | Reads the gate mailbox over JMAP; a method error throws. |
| `browser.mjs` | Playwright: classifies each URL, clicks GitHub's pages, fails an unknown one through `failPage`, lists and deletes Apps, publishes through the admin. |
| `stand-in.mjs` | The person at the browser while `cairn new` runs: tails `urls.log`, follows the setup tab by each page's next-step control after a 3 second pause, answers GitHub's pages, reads the sign-in mail when the tab offers the login page, ends on a signed-in admin page, and writes `stand-in.jsonl`. A page it cannot clear in 2 minutes fails through `failPage`. |
| `totp.mjs` | RFC 6238 codes for the machine account's sign-in. |
| `fetch-check.mjs` | Polls a live URL for a marker, or proves a page stayed unchanged. |
| `resolve.mjs` | Finds the test domain's authoritative address, for a resolver that caches a negative answer. |
| `record.mjs` | Writes the `## Gate` table to the release body, or to a rehearsal file, and carries rows forward. |
| `verdict.mjs` | Reads that table and exits 0 only when each leg has one `pass` row at a commit that holds. |

## The browser

The browser uses the machine account's stored session (`~/.local/state/cairn-gate/github-session.json`,
mode 0600). A page it does not recognise is never held for a click. `failPage` fails at once: it
writes a screenshot (never of a sign-in page or an address carrying `token=` or `code=`) and a
controls file to the run directory, and throws a message naming the page by host and path with at
most 200 characters of its text.

## Resolving the test domain

This workstation's resolver (a home router) caches a negative answer for `carin-test.org` for up to
30 minutes, because the name is queried before its record exists. The gate therefore pins its own
traffic to the address the zone's authoritative nameservers give (`resolve.mjs`). Its fetches
(`gateFetch`) try the global `fetch` first and, on a network error, retry over TLS pinned to that
address with the certificate still verified. When no authoritative address is found, they behave as
before.
