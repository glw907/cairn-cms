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
| `run-gate.sh` | The entry: secrets, run directory, allowlisted environment. |
| `gate.mjs` | The smoke, the browser session, and the command line. |
| `sweep.mjs` | Lists, deletes, and probes, over the Cloudflare and GitHub APIs. |
| `mail.mjs` | Reads the gate mailbox over JMAP; a method error throws. |
| `browser.mjs` | Playwright: classifies each URL, clicks GitHub's pages, fails an unknown one through `failPage`, lists and deletes Apps, publishes through the admin. |
| `totp.mjs` | RFC 6238 codes for the machine account's sign-in. |
| `fetch-check.mjs` | Polls a live URL for a marker, or proves a page stayed unchanged. |
| `resolve.mjs` | Finds the test domain's authoritative address, for a resolver that caches a negative answer. |
| `record.mjs` | Writes the `## Gate` table to the release body, or to a rehearsal file. |
| `verdict.mjs` | Reads that table and exits 0 only when each leg has one `pass` row under one run id. |

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
