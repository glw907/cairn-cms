# Recorded-run transcripts

Real stdout from a live `create-cairn-site` run against a scratch site, plus two
`cairn doctor` reports against that site. The admin track's transcript blocks quote
these files, and `check:transcripts` compares every marked block against the fixture it names.

Two rules govern this directory. **No invented output, ever**: a transcript is real stdout or it
does not ship. **A fixture is never edited**: the gate normalizes the pty control stream, and a
run that needs different bytes is re-captured, never patched.

## The run

- **Date:** 2026-10-31
- **Source commit:** `4471dbde3010bd0bc73394e0a388492f34820ba5` on `docs-final-capture` (tree clean
  at capture time), the version commit on top of pass 2's head
- **Packages:** `@glw907/cairn-cms` and `@glw907/cairn-cms-dev` at `0.98.1-rc.1`, published under
  the `next` dist-tag. `latest` stayed at `0.98.0` throughout.
- **Site:** `cairn-docs-capture-2`, workers.dev only, on the glw907 Cloudflare account
- **Live at:** `https://cairn-docs-capture-2.glw907.workers.dev` (torn down after capture)
- **Scratch directory:** `~/Projects/cairn-scratch/docs-final-capture`, outside this repo, since
  removed

The `-2` suffix comes from a first attempt that timed out at the browser step, because the App was
not created from the printed link. That attempt created nothing on GitHub or Cloudflare, and its
capture stayed out of this repo. App names stay taken, so a rerun never reuses a name.

The template was baked against the published prerelease so the scaffold installed from the
registry exactly as its specs dictate, rather than from a vendored tarball no reader gets:

```
node scripts/bake-template.mjs --to template --engine-spec '^0.98.1-rc.1' --dev-spec '^0.98.1-rc.1'
```

## Capture method

Every invocation ran on a pseudo-terminal pinned to **100 columns by 40 rows**, recorded by
`ptycapture.py`, committed beside these files. A pty is what a real reader has: the
sign-in link prints, clack renders its prompts, and the hold loop behaves as documented.

The pass plan specified `script -q`, on the understanding that `-q` suppresses its banner. That
is wrong for util-linux 2.39.3, whose man page scopes `-q` to "do not write start and done
messages **to standard output**"; the `Script started on ...` and `Script done on ...` lines
still land inside the log file, along with a leading NUL byte. Because a fixture is committed
unedited, that banner would have become permanent non-tool content in the source of truth, so
the method changed to deliver the ruling's intent. The recorded width is unchanged at 100, and
pinning the size on the pty itself means no caller's terminal is resized.

The clack prompts were answered by a pattern-matched driver that waits for each prompt's
text before sending that prompt's answer, so a slow step or a browser moment delays the next
match rather than desynchronising the run. Driver progress went to stdout; the capture files
hold pty bytes only.

## Environment

Every invocation ran under `clean-env`, an `env -u` wrapper that cleared the variables below plus
every name in `~/.local/secrets`, so no ambient credential or test seam reached the tool:

```
CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_KEY CLOUDFLARE_EMAIL
CF_API_TOKEN CF_ACCOUNT_ID CF_API_KEY CF_EMAIL
GITHUB_TOKEN GH_TOKEN GITHUB_APP_ID GITHUB_APP_INSTALLATION_ID GITHUB_APP_PRIVATE_KEY_B64
CAIRN_GITHUB_API_BASE CAIRN_GITHUB_WEB_BASE CAIRN_CLOUDFLARE_API_BASE CAIRN_CF_API_TOKEN
CAIRN_STATE_DIR CAIRN_NPM_BIN CAIRN_WRANGLER_BIN CAIRN_FORCE_HOLD
CAIRN_CF_ACCOUNT_ID CAIRN_CF_READ_TOKEN CAIRN_GH_READ_TOKEN CMS_BOT_PAT CAIRN_DOCS_READER_OAUTH_TOKEN
HTTPS_PROXY https_proxy HTTP_PROXY http_proxy
```

`wrangler` was logged out at the start, so the run entered Cloudflare's OAuth sign-in the way a
first-time reader does. The capture printed Node.js 26.13.0 and wrangler 4.156.0.

## The invocations

| File | Command | Outcome |
| --- | --- | --- |
| `01-create-cairn-site.txt` | `node bin.mjs`, the `--answer` list below | Exit 0, `This site is set up end to end.` Step `live`, `/` answered 200, `/admin` answered 303 |
| `04-doctor-report.txt` | `bash -x -c 'cairn doctor .'` | Exit 0, `10 passed, 0 failed, 1 skipped, 0 info, 0 unchecked` |
| `04b-doctor-report-failing.txt` | `bash -x -c 'cairn doctor .'` with one induced failure | Exit 1, `9 passed, 1 failed, 1 skipped, 0 info, 0 unchecked` |

The scaffold capture, from the scratch directory:

```
python3 -I ptycapture.py \
  --answer 'Site name=cairn-docs-capture-2' \
  --answer 'Short description=' \
  --answer 'Brand color=' \
  --answer 'AI training crawlers=' \
  --answer 'Directory=' \
  --answer 'Create the GitHub App and repository now?=' \
  --answer 'Where should the GitHub App and repository live?=' \
  --answer 'Repository name=' \
  --answer 'GitHub App name=' \
  --answer 'Install, build, and deploy your site now?=' \
  --answer 'Sign-in email=my-owner@example.org' \
  --answer 'Connect a domain you own to this site now?=n' \
  01-create-cairn-site.txt -- node packages/create-cairn-site/bin.mjs
```

The App was installed with "All repositories", since the run creates the repository after the
install page.

## The doctor capture

Both reports ran before teardown, in the deployed site's directory, with the `cairn` binary built
from the source commit and `npx cairn-manifest` run first, so the facts-derived checks report rather
than falling back to `unknown`. The site installed the engine from the registry, so the
dependency-floor line reads `PASS` on a real copy.

`04-doctor-report.txt` is the site as deployed. A fresh site is healthy, so it shows no `FAIL`.
`04b-doctor-report-failing.txt` exists to show one: for that capture alone, `observability.enabled`
was set to `false` in the scratch copy of `wrangler.jsonc`, then restored. The failure is induced
and the output is real. The August plan's reason for needing no induced failure was a credentialed
doctor, and today's doctor reads no credentials.

## The captured sign-in token is dead

`01-create-cairn-site.txt` records the bootstrap magic link with its one-time token, which the
redaction ruling keeps verbatim rather than scrubbing. The owner's click consumed it. `--sign-in`
then ran uncaptured to supersede it.

That the token is dead was verified rather than assumed. Magic links are stored as `token_hash`,
never raw: `SELECT COUNT(*) AS n FROM magic_token WHERE token_hash = '<sha256 of the captured
token>'` against the site's auth database returned **0**. The site's teardown closes the rest.

## The secret sweep

Run over every capture before any copy-in:

```
-----BEGIN    CLOUDFLARE_API_TOKEN=    Bearer     ghp_    gho_    ghu_    ghr_    ghs_
github_pat_    ?token=    \b[0-9a-fA-F]{40}\b    clientSecret    client_secret
```

Result: one hit, `?token=` in `01-create-cairn-site.txt`, the bootstrap magic link retired above.
Every other file was clean on every pattern.

A name-only comparison against `~/.local/secrets` showed one name,
`GITHUB_APP_PRIVATE_KEY_B64`, in `01-create-cairn-site.txt`. It is the secret upload's label, and
no secret value appears in any fixture.

## Deliberately unconsumed

No documentation block quotes these; `check:transcripts` treats this list as their citation.

## Identifiers

Kept verbatim by ruling. The worker, the database, the bucket, the App, and the repository
were torn down after capture and their names name nothing that still exists. The account
identity, the workers.dev subdomain, the GitHub owner name, and the sign-in address are
permanent and knowingly published.
