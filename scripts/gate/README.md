# The release gate harness

Drives the real `create-cairn-site` CLI the way an editor would and proves the result by fetching
the live address. Nothing here ships in a package.

## Run it

```sh
bash scripts/gate/run-gate.sh --smoke
bash scripts/gate/run-gate.sh --all --version 0.99.0-rc.3
bash scripts/gate/run-gate.sh --leg A1 --leg A2 --version 0.99.0-rc.3
bash scripts/gate/run-gate.sh --all --version 0.99.0-rc.3 --headed
bash scripts/gate/run-gate.sh --all --version 0.99.0-rc.3 --cli /abs/create-cairn-site.tgz --record-file /abs/rehearsal-gate.md
bash scripts/gate/run-gate.sh --teardown-stale
```

`run-gate.sh` is the one entry. It sources `~/.local/secrets`, makes a run directory
`~/.local/state/cairn-gate/runs/<timestamp>` with mode 0700 (never in the worktree), and starts
`gate.mjs` under an environment built from an allowlist, not from the calling shell. It never
prints a value. The allowlist names the gate token `CF_WS_CAIRN_GATE_TOKEN`, the build token
`CF_CI_CAIRN_BUILD_TOKEN`, `STALWART_PASSWORD_CAIRN_GATE`, the `GITHUB_TEST_*` names, the `GATE_*`
names, and the display and session-bus names a headed browser needs.

### Output, the lock, and the exit file

The first line the run prints is `run dir: <path>`. One run goes at a time: `run-gate.sh` holds a
`flock` on `~/.local/state/cairn-gate/lock` and writes `<pid> <run dir>` to `lock.holder`. A second
run refuses at once, names that line, and says whether the holder's process is alive. The lock
dies with the script, so a killed run frees it even if a child lives on. When the run ends,
however it ends, the script tears down what the run recorded and then writes its final status to
`<run dir>/exit`. Read that file to learn how a backgrounded run finished.

### Headless, `--headed`, and `--cli`

The browser is headless by default. `--headed` opens a window, which a first sign-in to a new
machine account or a new page kind may need.

`--cli <absolute .tgz> --record-file <absolute path>` is rehearsal mode: the legs run the packed
CLI (`npx --yes file:<tgz>`) in place of the published version, and every row goes to the record
file, never to a release body and never through `gh`. The two flags go together, and the record
file's directory must exist; otherwise the run exits 2 before any leg. `verdict.mjs <version> --file
<path>` then reads that file.

`--smoke` prints the host name and one verdict per check, never a value:

- the gate token at `/user/tokens/verify` and `/accounts/<id>/tokens/verify`;
- the build token at `/user/tokens/verify`, which fails when `CF_CI_CAIRN_BUILD_TOKEN` is absent
  because every Builds leg needs it;
- the CLI's own `makeApi` routes: the `carin-test.org` zone, the Builds tokens list, and the zone's
  email sending subdomains;
- `wrangler whoami` and `wrangler whoami --json` on the wrangler the template pins;
- the machine account's `GET /user` (login and the `repo` and `delete_repo` scopes), or `skipped`
  when `GITHUB_TEST_TOKEN` is not in the store;
- a TOTP code computes;
- three throwaway writes named `cairn-e2e-gate-probe-<time>`, each deleted by the id its create
  returned: a D1 database and an R2 bucket, both sent with the build token's bearer, and a Builds
  token registration. The registration is sent with the gate token, since registering needs
  Workers CI, which only the gate token holds. It registers the build token as the secret and its
  verify id as `cloudflare_token_id`, under the probe name and never `cairn-build`;
- one `info` line that never fails the smoke: `cairn-build registrations: <count>`, each entry's
  `uuid=<build_token_uuid> token-id-match=<yes|no>` (whether its `cloudflare_token_id` equals the
  build token's verify id), then `probe registrations: <count>` for leftover
  `cairn-e2e-gate-probe-*` entries.

A failed check does not stop the rest. The exit code is 1 when any check failed. A probe whose
delete failed names the resource it left behind.

## The parts

| File | Role |
|---|---|
| `run-gate.sh` | The entry: secrets, run directory, allowlisted environment. |
| `gate.mjs` | Builds each child's environment (`buildCliEnv`) and runs the smoke. |
| `driver.mjs` | Runs the CLI on a 100 by 40 pty and answers prompts by their text. |
| `xdg-open` | A shim for the CLI's browser opener: it appends the URL to `$GATE_URL_LOG`. |
| `fetch-check.mjs` | Polls a live URL for a marker, or proves a page stayed unchanged. |
| `totp.mjs` | RFC 6238 codes for the machine account's sign-in. |
| `browser.mjs` | Playwright: classifies each URL the CLI opens, clicks GitHub's pages, fails an unknown one through `failPage`, publishes through the admin. |
| `legs.mjs` | The four legs, their verdict (`evaluateLeg`), and the sign-in mail read over JMAP. |
| `teardown.mjs` | Removes one recorded install, by recorded name or uuid only. |
| `record.mjs` | Writes the `## Gate` table (with its `Run` column) to the release body, or to a rehearsal file. |
| `verdict.mjs` | Reads that table and exits 0 only when each leg has one `pass` row under one run id. |

## The driver

A prompt is a rendered screen line, with ANSI stripped, that carries clack's active-prompt symbol
`◆` followed by a table key, on a screen that ends in clack's bare `└` line. Any other line is
never answered, so a log line that repeats a prompt's wording does nothing. A table entry never
shown is simply never used. A prompt with no entry, or no screen change for 10 minutes (spinner frames and counters do not count as change), fails the run, as does a run past its 90-minute wall clock, and
names the last screen. Output alone is not progress, since a spinner writes forever: the idle
limit re-arms only when the screen, with spinner glyphs, elapsed counters, and trailing dots
removed, differs from the last one. While the CLI holds a `Watch progress at` page, the idle limit
rises to the propagation budget plus five minutes.

Each entry names its kind:

| Kind | Keystrokes |
|---|---|
| `confirm` | `y` or `n`, with no carriage return: clack submits a confirm on the key alone, so a carriage return would answer the next prompt. |
| `select` | Arrow keys to the named label, then a carriage return. |
| `text` | The value, or nothing for the default, then a carriage return. |
| `password` | The value, then a carriage return. |

The driver never passes `--yes`. A secret value never reaches the driver's log, and the typed
characters are not echoed by the pty, so the token is in neither the log nor the capture.

The pty comes from util-linux `script`; Node has no pty of its own. The gate host needs it on
`PATH`.

## The environments

The CLI child (and through it npm, Vite, and wrangler) gets `PATH` with this directory first, `HOME`,
`TERM`, `LANG`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CAIRN_STATE_DIR` under the run
directory, and `GATE_URL_LOG`. It never gets a `GITHUB_TEST_*` name, and the build token is not in
it either. The CLI reads its tokens at the paste prompts, not from the environment, because
`CAIRN_CF_API_TOKEN` is read only under `--yes`. The prompt `Paste your Cloudflare API token` is
answered with the gate token, and `Paste your Workers Builds deploy token` with the build token.

## The legs

`--leg` takes A1, A2, B1, or B2 (repeat it for several, earlier leg first: A2 and B2 need the install A1 and B1 make in the same run) and needs `--version`, the exact version the CLI is installed at. Every run, `--leg` or `--all`, first tears down any earlier run's resources, then writes `pending` rows for the legs it will run. `--all` runs A1 and A2, teardown A, B1 and B2, teardown B. A leg passes only on what `evaluateLeg` reads: the closing text, the admin alert, and the fetch results; a CLI exit code never passes a leg. After each leg `record.mjs` writes its row to release `v<version>`, or, under `--cli` with `--record-file`, to that file and never to a release.

The browser uses the machine account's stored session (`~/.local/state/cairn-gate/github-session.json`, mode 0600). A page it does not recognise is never held for a click. `failPage` fails the leg at once: it writes a screenshot (never of a sign-in page or an address carrying `token=` or `code=`) and a controls file to the run directory, and throws a message naming the page by host and path with at most 200 characters of its text. The `failed` marker keeps those captures through teardown, and the row records the reason.

Each Builds leg (A2 and B1) logs, before teardown, one line `trigger build token: <build_token_uuid>` read from the install's Builds trigger, or `trigger build token: read failed: <reason>`. It also logs the key names of the newest build's `build_trigger_metadata`, which confirm that `build_trigger_uuid` is present. A failed read never fails the leg.

On B2 the gate also requests a real sign-in link for the owner email (`cairn-gate@probe.907.life` by default; `GATE_OWNER_EMAIL` overrides it), reads it from the gate mailbox over JMAP (`STALWART_PASSWORD_CAIRN_GATE`), and publishes through that session.

## Resolving the test domain

This workstation's resolver (a home router) caches a negative answer for `carin-test.org` for up to 30 minutes, because the name is queried before its record exists. The gate therefore pins its own traffic to the address the zone's authoritative nameservers give (`resolve.mjs`). Its fetches (`gateFetch`) try the global `fetch` first and, on a network error, retry over TLS pinned to that address with the certificate still verified. B2's browser steps run in a Chromium launched with a `--host-resolver-rules` mapping for the domain. When no authoritative address is found, both behave as before.

## Cleanup

The URL log, the per-run captures (`capture-<leg>-<n>.bin`), and the state record live only in the run directory. A failed leg's `failed` marker keeps its captures and URL log through teardown. A sign-in URL in
them carries a token, so nothing there is committed or pasted.

`run-gate.sh` traps exit and runs `--teardown-run`, which removes every install this run recorded and did not already remove. Teardown deletes only the uuids and names the state record and the install's `wrangler.jsonc` hold, each checked against the `cairn-e2e-gate-` prefix first, and never a build token registration, whether `cairn-build` or a probe's. It leaves the `carin-test.org` zone and its Email Sending. `--teardown-stale` does the same for every earlier run directory.
