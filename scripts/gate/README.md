# The release gate harness

Drives the real `create-cairn-site` CLI the way an editor would and proves the result by fetching
the live address. Nothing here ships in a package.

## Run it

```sh
bash scripts/gate/run-gate.sh --smoke
```

`run-gate.sh` is the one entry. It sources `~/.local/secrets`, makes a run directory
`~/.local/state/cairn-gate/runs/<timestamp>` with mode 0700 (never in the worktree), and starts
`gate.mjs` under an environment built from an allowlist, not from the calling shell. It never
prints a value.

`--smoke` prints the host name and one verdict per check, never a value:

- the gate token at `/user/tokens/verify` and `/accounts/<id>/tokens/verify`;
- the CLI's own `makeApi` routes: the `carin-test.org` zone, the Builds tokens list, and the zone's
  email sending subdomains;
- `wrangler whoami` and `wrangler whoami --json` on the wrangler the template pins;
- the machine account's `GET /user` (login and the `repo` and `delete_repo` scopes), or `skipped`
  when `GITHUB_TEST_TOKEN` is not in the store;
- a TOTP code computes;
- three throwaway writes named `cairn-e2e-gate-probe-<time>`, each deleted by the id its create
  returned: a D1 database, an R2 bucket, and a Builds token registration (which proves Builds
  accepts the gate token).

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

## The driver

A prompt is a rendered screen line, with ANSI stripped, that carries clack's active-prompt symbol
`◆` followed by a table key, on a screen that ends in clack's bare `└` line. Any other line is
never answered, so a log line that repeats a prompt's wording does nothing. A table entry never
shown is simply never used. A prompt with no entry, or no output for 10 minutes, fails the run and
names the last screen. While the CLI holds a `Watch progress at` page, the idle limit rises to the
propagation budget plus five minutes.

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
directory, and `GATE_URL_LOG`. It never gets a `GITHUB_TEST_*` name. The CLI reads its token at the
paste prompt, not from the environment, because `CAIRN_CF_API_TOKEN` is read only under `--yes`.

## Cleanup

The URL log, the capture, and the state record live only in the run directory. A sign-in URL in
them carries a token, so nothing there is committed or pasted.
