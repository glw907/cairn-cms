# Recorded-run transcripts

Real stdout from a live `create-cairn-site` run against a scratch site, plus two
`cairn-doctor` reports against the deployed result. The admin track's transcript blocks quote
these files, and `check:transcripts` compares every marked block against the fixture it names.

Two rules govern this directory. **No invented output, ever**: a transcript is real stdout or it
does not ship. **A fixture is never edited**: the gate normalizes the pty control stream, and a
run that needs different bytes is re-captured, never patched.

## The run

- **Date:** 2026-08-17
- **Tool commit:** `4e725be1b752f75ba2fba8b778775708ffceb5d8` (tree clean at capture time)
- **Site:** `cairn-capture-scratch`, workers.dev only, on the glw907 Cloudflare account
- **Live at:** `https://cairn-capture-scratch.glw907.workers.dev` (torn down after capture)
- **Scratch directory:** `~/Projects/cairn-scratch/2026-08-16-capture/`

The template was baked against the published prerelease so the scaffold installed from the
registry exactly as its own specs dictate, rather than from a vendored tarball no reader gets:

```
node scripts/bake-template.mjs --to template --engine-spec '^0.95.0-rc.1' --dev-spec '^0.95.0-rc.1'
```

Both specs resolve to `0.95.0-rc.1`, published under the `next` dist-tag. Engine `latest` stayed
at `0.94.0` throughout.

## Capture method

Every invocation ran on a pseudo-terminal pinned to **100 columns by 40 rows**, recorded by
`ptycapture.py` (kept with the run, outside this repo). A pty is what a real reader has: the
sign-in link prints, clack renders its prompts, and the hold loop behaves as documented.

The pass plan specified `script -q`, on the understanding that `-q` suppresses its banner. That
is wrong for util-linux 2.39.3, whose man page scopes `-q` to "do not write start and done
messages **to standard output**"; the `Script started on ...` and `Script done on ...` lines
still land inside the log file, along with a leading NUL byte. Because a fixture is committed
unedited, that banner would have become permanent non-tool content in the source of truth, so
the method changed to deliver the ruling's intent. The recorded width is unchanged at 100, and
pinning the size on the pty itself means no caller's terminal is resized.

The clack prompts were answered by a pattern-matched driver that waits for each prompt's own
text before sending that prompt's answer, so a slow step or a browser moment delays the next
match rather than desynchronising the run. Driver progress went to stdout; the capture files
hold pty bytes only.

## Environment

Every invocation ran under an `env -u` wrapper clearing the no-fake preflight list and the
ambient credentials this workstation exports:

```
CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
GITHUB_APP_ID GITHUB_APP_INSTALLATION_ID GITHUB_APP_PRIVATE_KEY_B64
CAIRN_GITHUB_API_BASE CAIRN_GITHUB_WEB_BASE CAIRN_CLOUDFLARE_API_BASE
CAIRN_CF_API_TOKEN CAIRN_STATE_DIR CAIRN_NPM_BIN CAIRN_WRANGLER_BIN HTTPS_PROXY
```

`wrangler` was logged out at the start, so the run entered Cloudflare's OAuth sign-in the way a
first-time reader does.

The `GITHUB_APP_*` entries are not ceremony, and the pass plan's list omitted them. This
workstation exports the **production** `cairn-cms` App's credentials, so the first bare doctor
run inherited them, authenticated as the wrong App, and reported
`FAIL GitHub App: repo glw907/cairn-capture-scratch returned 404`. A reader has none of those
variables set and sees a SKIP. That first report was discarded and re-captured rather than
edited, per the never-edit rule.

## The invocations

| File | Invocation | Outcome |
|---|---|---|
| `01-create-cairn-site.txt` | `node bin.mjs` | Failed creating the repository |
| `01b-resume.txt` | `node bin.mjs --dir cairn-capture-scratch` | Failed: repository already exists |
| `01c-resume.txt` | `node bin.mjs --dir cairn-capture-scratch` | Stopped at the sign-in email prompt |
| `01d-resume.txt` | `node bin.mjs --dir cairn-capture-scratch` | Reached the live summary |
| `02-doctor-bare.txt` | `npx cairn-doctor` | 8 passed, 0 failed, 11 skipped |
| `03-doctor-credentialed.txt` | `npx cairn-doctor` | 8 passed, 3 failed, 8 skipped |

Four invocations reached a live site where the plan expected one. Three of the four stops have
causes worth naming, since two of them are tool behavior a reader can hit:

1. **`01` could not have succeeded.** At GitHub's install step the App was approved for "Only
   select repositories". A first run creates the repository itself, so there is no repository to
   select yet, and the install can never include it. The remedy the tool prints names that same
   option, which is the dead end rather than the way out. A first run needs "All repositories".
2. **`01b` hit a non-idempotent resume.** The failed first run had already created the
   repository, and the resume refused to continue because a repository of that name exists,
   rather than adopting one the tool owns. Recovery took deleting the repository and resuming
   again.
3. **`01c` stopped for a harness reason, not a tool one.** The driver's prompt table was built
   from a survey that missed `Sign-in email`, so it waited for a later prompt. No tool defect;
   the table was corrected and the run resumed.

## The two doctor environments

`02-doctor-bare.txt` ran with no Cloudflare credentials: the reader's default, showing passes
alongside credential and structural skips.

`03-doctor-credentialed.txt` ran with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
exported in a separate, uncaptured step, so no token ever reached a captured command line. It
carries pass, fail, and skip lines together, which is what the page's contract needs. The three
failures are honest and come from the scaffold's placeholder from-address `cms@showcase.test`,
which belongs to no zone.

The token used was this workstation's existing account-scoped token, not a freshly minted
read-scoped one. The output is identical either way, and the reason is visible in the report:
the zone checks fail with "no zone named showcase.test is visible to this token", which holds
for any token because the zone does not exist, and the D1 checks skip structurally on "no
AUTH_DB database_id in wrangler.jsonc" rather than on any credential. Minting a narrower token
would have produced the same bytes, so none was minted and none is owed at teardown.

## The captured sign-in token is dead

`01d-resume.txt` records the bootstrap magic link with its one-time token, which the redaction
ruling keeps verbatim rather than scrubbing. After capture, `--sign-in` ran uncaptured to
supersede it.

That the token is dead was verified rather than assumed. Magic links are stored as
`token_hash`, never raw, and are single-use: `SELECT COUNT(*) FROM magic_token` against the
site's auth database returned **0 rows**, so no magic link could authenticate, the captured one
included. The ten-minute expiry and the site's teardown close the rest.

## The secret sweep

Run over every capture before any copy-in:

```
-----BEGIN    CLOUDFLARE_API_TOKEN=    Bearer     ghp_    github_pat_
ghs_    ?token=    \b[0-9a-fA-F]{40}\b    clientSecret
```

Result: one hit, `?token=` in `01d-resume.txt`, the bootstrap magic link handled by the
supersede above. Every other file was clean on every pattern.

A name-only comparison against `~/.local/secrets` showed `CLOUDFLARE_API_TOKEN`,
`GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, and `GITHUB_APP_PRIVATE_KEY_B64` appearing by
name. Those are the doctor's own SKIP lines telling a reader which variables to set, so they are
instructions rather than values. No secret value appears in any fixture.

## Deliberately unconsumed

No documentation block quotes these; `check:transcripts` treats this list as their citation.

- `01b-resume.txt`, kept as the record of the non-idempotent resume above.
- `01c-resume.txt`, kept so the run history is complete and auditable, superseded entirely by
  `01d-resume.txt`.
- `02-doctor-bare.txt`, kept as the counterpart environment to the credentialed report the
  admin page does quote.

## Identifiers

Kept verbatim by ruling. The worker, both databases, the bucket, the App, and the repository
were torn down after capture and their names name nothing that still exists. The account
identity, the workers.dev subdomain, the GitHub owner name, and the sign-in address are
permanent and knowingly published.
