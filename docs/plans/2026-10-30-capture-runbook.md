# Capture runbook: the live `create-cairn-site` and `cairn doctor` run

Task 2.5 of `docs/plans/2026-10-30-docs-finalization.md`. The operator session
`cairn-cms-docs-capture` follows this runbook literally while Geoff watches and handles the browser
moments. The captures it produces replace the stale fixtures under
`packages/create-cairn-site/test/fixtures/transcripts/` and become the source of truth for the admin
arm (pass 4).

Sources: the finalization plan's "The capture sitting", "Rulings", and "Standing answers"; the
2026-08-15 capture brief; Part A of `docs/plans/2026-08-16-capture-pass.md` and its post-mortem; the
fixtures README and `ptycapture.py`; and the code of `packages/create-cairn-site` (`bin.mjs`, `src/`)
and `tool/cmd/cairn` as of pass 2's head. Every prompt string below is quoted from that code. Where
the code cannot settle a point, the step says **unverified, confirm live**.

## Who does what

- `[you]` is Geoff, in his own browser (Chromium, his profile). The operator never drives a browser.
- `[operator]` is the capture session. It runs every command, watches the capture, relays each link
  to Geoff in chat, and writes the ledger.
- `[conductor]` marks the prerelease cut in Part 0, which the plan's ruling gives to the conductor
  when the sitting starts. The operator verifies it in Part 1 and does not cut it.

## Rules that hold for the whole sitting

1. **No invented output.** A fixture is real pty bytes or it does not ship. A fixture is never
   edited. A run that needs different bytes is captured again, whole.
2. **The ledger comes first.** `~/.local/state/cairn-docs-final/ledger.md` lists every resource
   before it exists (as `planned`) and is updated the moment the capture shows it was created. A
   crash at any point leaves a complete teardown list.
3. **No typing into the capture.** `ptycapture.py` reads the pty and writes only its queued
   `--answer` replies. It does not pass the operator's or Geoff's keystrokes through. A prompt the
   answer list does not expect stalls the run, which then goes to the failure answers.
4. **Answers are strictly ordered.** `ptycapture.py` only ever watches for the first unused answer's
   prompt. If that prompt never appears, no later answer is sent either.
5. **No secret on a captured command line.** Nothing in this runbook passes a token to a captured
   command.
6. **workers.dev only.** The run answers No at the domain admission. No zone, no token paste, no
   email chapter, no Workers Builds chapter. own-your-domain takes its DNS-admin branch in pass 4,
   since the sitting connects no domain.
7. **Upload nothing to the site during the sitting.** An empty media bucket is what lets teardown
   delete it in one call.

## Names used throughout

| Thing | Value |
| --- | --- |
| Site name (answered at `Site name`) | `cairn-docs-capture` |
| Site directory (the `Directory` default) | `cairn-docs-capture` |
| GitHub App (the `GitHub App name` default, `cairn-<slug>`) | `cairn-cairn-docs-capture` |
| Repository (the `Repository name` default) | `glw907/cairn-docs-capture`, private |
| Worker (`workerNameFor`) | `cairn-docs-capture` |
| D1 database (`nameWranglerResources`) | `cairn-docs-capture-auth`, binding `AUTH_DB` |
| R2 bucket | `cairn-docs-capture-media`, binding `MEDIA_BUCKET` |
| Worker secret | `GITHUB_APP_PRIVATE_KEY_B64` |
| State record | `~/.config/cairn/sites/cairn-docs-capture-<six characters>.json` |
| Sign-in email (answered at `Sign-in email`) | `my-owner@example.org`, the placeholder the 2026-08-17 run used |
| Cloudflare account id | `120c269ad6d3dfbe6d63a0bb53758ca0` (checked against the record in step 7.1) |

The template carries one D1 binding. `APP_DB` and `MEMBER_DB` sit inside the showcase's
`cairn-template:exclude` markers, so a scaffold gets one database, not the two the August run made.
The tool's consent and closing copy say "one database" too.

A rerun after a failure uses the suffix `-2` on the site name (so every derived name above gains
`-2`). Never reuse a name from an earlier attempt, since a GitHub App name stays taken until Geoff
deletes that App.

## Paths

The operator writes this file in step 1.1 and starts every later command block with
`source ~/.local/state/cairn-docs-final/capture.env`, since shell state does not carry between
commands.

```bash
export REPO=/var/home/glw907/Projects/cairn-cms
export CAP=$REPO/.claude/worktrees/docs-final-capture
export TX=$CAP/packages/create-cairn-site/test/fixtures/transcripts
export STATE=/var/home/glw907/.local/state/cairn-docs-final
export SCRATCH=/var/home/glw907/Projects/cairn-scratch/docs-final-capture
export SITE=$SCRATCH/cairn-docs-capture
export CLEAN=$STATE/clean-env
export ACCT=120c269ad6d3dfbe6d63a0bb53758ca0
```

`$CAP` is the worktree the conductor creates in Part 0. Confirm its path with
`git -C $REPO worktree list` and correct `capture.env` if it differs (unverified, confirm live).

## Part 0: the prerelease cut `[conductor]`

The plan's ruling: a `--tag next` prerelease cut from pass 2's head is the source. The version commit
lives only on `docs-final-capture`. `main`, the `latest` dist-tag, and the stacked `## Unreleased`
entries stay untouched, so this commit changes no `CHANGELOG.md`.

0.1. Cut the branch and worktree from pass 2's head:

```bash
git -C $REPO fetch origin
git -C $REPO worktree add $REPO/.claude/worktrees/docs-final-capture -b docs-final-capture origin/docs-final-2
```

0.2. Record the registry before the cut, then derive the number:

```bash
npm view @glw907/cairn-cms dist-tags
npm view @glw907/cairn-cms-dev dist-tags
npm view @glw907/cairn-cms versions --json
```

Derive `<RC>` per `cairn-release` step 4 (size against the window, first free number), with the
suffix `-rc.1`. Write `latest`'s current value for both packages into the ledger.

0.3. Bump both packages and the lockfile, then commit only those files:

```bash
cd $CAP
npm version <RC> --no-git-tag-version
cd packages/cairn-cms-dev && npm version <RC> --no-git-tag-version && cd $CAP
git diff --stat   # expect package.json, package-lock.json, packages/cairn-cms-dev/package.json
git add package.json package-lock.json packages/cairn-cms-dev/package.json
git commit -m "Cut <RC> for the docs capture"
git push -u origin docs-final-capture
```

0.4. Publish the release against that exact commit. This fires `publish.yml`, whose publish step tags
any version with a `-` suffix as `next`:

```bash
SHA=$(git -C $CAP rev-parse HEAD)
gh release create v<RC> --prerelease --target "$SHA" \
  --title "v<RC>: docs capture prerelease" \
  --notes "Prerelease for the docs capture sitting, cut from pass 2's head. Not a stable release."
gh run list --workflow publish.yml --limit 1
gh run watch <run-id> --exit-status
```

0.5. Write `<RC>`, `$SHA`, the release URL, and the run id into the ledger's capture section, then
tell the operator the cut is done.

## Part 1: pre-flight `[operator]`

1.1. Write `capture.env` (the block under "Paths") into `$STATE`. Write `$STATE/clean-env`, the
wrapper every capture runs under. It clears the no-fake list the tool reads, the ambient credentials
this workstation exports, and the doctor's own read variables:

```bash
#!/usr/bin/env bash
# Run a command with the capture's ambient credentials and test seams cleared.
args=()
for v in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_KEY CLOUDFLARE_EMAIL \
  CF_API_TOKEN CF_ACCOUNT_ID CF_API_KEY CF_EMAIL \
  GITHUB_TOKEN GH_TOKEN GITHUB_APP_ID GITHUB_APP_INSTALLATION_ID GITHUB_APP_PRIVATE_KEY_B64 \
  CAIRN_GITHUB_API_BASE CAIRN_GITHUB_WEB_BASE CAIRN_CLOUDFLARE_API_BASE CAIRN_CF_API_TOKEN \
  CAIRN_STATE_DIR CAIRN_NPM_BIN CAIRN_WRANGLER_BIN CAIRN_FORCE_HOLD \
  CAIRN_CF_ACCOUNT_ID CAIRN_CF_READ_TOKEN CAIRN_GH_READ_TOKEN CMS_BOT_PAT \
  HTTPS_PROXY https_proxy HTTP_PROXY http_proxy; do
  args+=(-u "$v")
done
exec env "${args[@]}" "$@"
```

`chmod +x $STATE/clean-env`. The `GITHUB_APP_*` entries are load-bearing: this workstation exports
the production `cairn-cms` App's credentials, which turned an August doctor report into a failure no
reader sees.

1.2. Check the wrapper leaves nothing behind. This prints names only and must print nothing:

```bash
source $STATE/capture.env
$CLEAN env | cut -d= -f1 | grep -E '^(CLOUDFLARE_|CF_API|CF_ACCOUNT|CF_EMAIL|GITHUB_|GH_TOKEN|CAIRN_|CMS_BOT_PAT|HTTPS?_PROXY|https?_proxy)'
```

1.3. One executor per worktree: `pgrep -af "$CAP"` shows no other process working it, and
`git -C $CAP status --porcelain` prints nothing. A warm tree you did not author stops the sitting.

1.4. Record the tool commit and confirm the tool tree is clean:

```bash
git -C $CAP rev-parse HEAD                       # must equal the SHA the release targets
git -C $CAP status --porcelain packages/create-cairn-site tool   # must print nothing
node -p "require('$CAP/package.json').version"   # must print <RC>
```

1.5. Verify the prerelease on the registry before anything is baked:

```bash
npm view @glw907/cairn-cms dist-tags        # next: <RC>; latest unchanged from the ledger
npm view @glw907/cairn-cms-dev dist-tags    # next: <RC>; latest unchanged from the ledger
npm view "@glw907/cairn-cms@^<RC>" version  # resolves <RC>
npm view "@glw907/cairn-cms-dev@^<RC>" version
```

If either package is missing `<RC>` under `next`, stop and tell the conductor. The publish workflow
runs the two packages in separate jobs, so one can land without the other.

1.6. Machine checks: `node --version` reports 24 or later (the package's `engines.node`), `go version`
runs, and `gh auth status` shows `glw907`. Note whether the `gh` token carries `delete_repo`; teardown
step 8.2 needs it.

1.7. Install the capture worktree and bake the template against the prerelease. The bake needs the
engine's `dist/` (it imports `dist/guidance/install.js`), which `npm ci` builds through the root
`prepare` script:

```bash
cd $CAP && npm ci
cd $CAP/packages/create-cairn-site
node scripts/bake-template.mjs --to template --engine-spec '^<RC>' --dev-spec '^<RC>'
grep -n '"@glw907/cairn-cms' template/package.json   # both specs read ^<RC>
```

1.8. Wrangler is logged out, so the run meets Cloudflare's sign-in the way a first-time reader does:

```bash
mkdir -p $SCRATCH && cd $SCRATCH
$CLEAN npx --yes wrangler whoami
```

It must report that you are not authenticated. If it reports a login, run
`$CLEAN npx --yes wrangler logout` and check again.

1.9. The names are free. Each of these must come back empty or 404:

```bash
source ~/.local/secrets
T="Authorization: Bearer $CLOUDFLARE_API_TOKEN"
curl -s -H "$T" "https://api.cloudflare.com/client/v4/accounts/$ACCT/workers/scripts" | jq -r '.result[].id' | grep cairn-docs-capture
curl -s -H "$T" "https://api.cloudflare.com/client/v4/accounts/$ACCT/d1/database?name=cairn-docs-capture-auth" | jq '.result'
curl -s -H "$T" "https://api.cloudflare.com/client/v4/accounts/$ACCT/r2/buckets" | jq -r '.result.buckets[].name' | grep cairn-docs-capture
gh repo view glw907/cairn-docs-capture        # must fail: not found
gh api /apps/cairn-cairn-docs-capture         # must 404
ls ~/.config/cairn/sites/ 2>/dev/null | grep cairn-docs-capture
test ! -e $SITE && echo "site dir free"
```

The `/apps` check only sees a private App Geoff owns, so a stranger's private App of the same name
would still pass it. The manifest page would then report the name taken, which the failure answers
cover.

1.10. Rehearse the first five answers with a dry run. A dry run touches neither the network nor the
state store, and writes no site. Its output is thrown away:

```bash
cd $SCRATCH
$CLEAN python3 -I $TX/ptycapture.py \
  --answer 'Site name=cairn-docs-capture' \
  --answer 'Short description=' \
  --answer 'Brand color=' \
  --answer 'AI training crawlers=' \
  --answer 'Directory=' \
  $STATE/rehearsal.txt -- node $CAP/packages/create-cairn-site/bin.mjs --dry-run
echo "exit $?"
```

Expect `exit 0` and five `matched` lines on stderr. Then `rm $STATE/rehearsal.txt` and confirm
`ls $SCRATCH` is empty.

1.11. `[you]` Before the run, confirm four things in chat:

- Your browser is signed in to GitHub as `glw907`, and you can sign in to the Cloudflare dashboard.
- The Cloudflare account has the Workers Paid plan on. The deploy consent states the plan as a
  requirement, and the estate inventory records it as on since 2026-10-25.
- Your Cloudflare login sees exactly one account. The August run printed
  `Using your Cloudflare account: glw907.` With more than one, the tool asks
  `Which Cloudflare account should this site deploy to?`, which the answer list below does not
  expect (unverified for today, confirm live).
- Whether the August App `cairn-cairn-capture-scratch` (id `4625928`) still exists at
  github.com/settings/apps. If it does, delete it during teardown step 8.6 too.

1.12. Write the ledger's capture section with every resource from "Names used throughout" marked
`planned`, plus the scratch directory, the wrangler OAuth session, and the local `cairn` binary
(step 6.1). Set the capture state to `running`.

## Part 2: the scaffold capture

### The command

2.1. `[operator]` Start the capture in the background (Bash `run_in_background: true`), since it waits
on the browser for up to ten minutes per trip:

```bash
source /var/home/glw907/.local/state/cairn-docs-final/capture.env
cd $SCRATCH
$CLEAN python3 -I $TX/ptycapture.py \
  --answer 'Site name=cairn-docs-capture' \
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
  $SCRATCH/01-create-cairn-site.txt -- node $CAP/packages/create-cairn-site/bin.mjs \
  2> $SCRATCH/01-create-cairn-site.driver.log
```

What each answer does, from the code:

| Prompt (`@clack/prompts`) | Reply | Effect |
| --- | --- | --- |
| `Site name` (text, default `Waymark`) | `cairn-docs-capture` | The display name every slug derives from |
| `Short description (optional), one line` | empty | No description |
| `Brand color (optional): ...` | empty | The Waymark default |
| `AI training crawlers: what should this site's robots.txt tell them?` (select, initial `none`) | Enter | No preference |
| `Directory` (text, default the slug) | Enter | `cairn-docs-capture` |
| `Create the GitHub App and repository now?` (confirm, initial Yes) | Enter | Yes |
| `Where should the GitHub App and repository live?` (select, first option) | Enter | My personal account |
| `Repository name` (text, default the slug) | Enter | `cairn-docs-capture` |
| `GitHub App name` (text, default `cairn-<slug>`) | Enter | `cairn-cairn-docs-capture` |
| `Install, build, and deploy your site now?` (confirm, initial Yes) | Enter | Yes |
| `Sign-in email (you will use this to sign in to your site)` | `my-owner@example.org` | The owner row's address |
| `Connect a domain you own to this site now? (Free.)` (confirm) | `n` | No: workers.dev only |

An empty reply sends a bare carriage return, which accepts a prompt's default. In `@clack/core`
1.5.1 the `y` and `n` keys submit a confirm at once, so the carriage return that follows `n` arrives
after the last prompt has closed and nothing reads it.

### Watching it

2.2. `[operator]` Follow the capture with a Monitor on these two commands, and post each new link to
Geoff the moment it appears:

```bash
tr -d '\r' < $SCRATCH/01-create-cairn-site.txt | grep -a -E 'Open this link|Opening a link|Waiting for|Signed in as|Pushing|Using your Cloudflare|Applying database|Uploaded secret|Writing your sign-in|set up end to end|Your site is live|Next( step)?:|Error' | tail -n 8
cat $SCRATCH/01-create-cairn-site.driver.log
```

The tool opens each page with `xdg-open` and also prints it after
`Open this link if the browser did not open:`. Whether `xdg-open` reaches Geoff's desktop from a
background process is unverified, so the operator always relays the printed link.

If nothing new arrives for ten minutes and no browser trip is pending, read the screen with
`tail -c 2000 $SCRATCH/01-create-cairn-site.txt | cat -v`. A prompt that the answer list does not
expect is a stall: go to the failure answers.

### The browser moments, in order

2.3. **Create the GitHub App.** The terminal prints `Create your GitHub App`, then a paragraph naming
the "Create GitHub App" page, then `Open this link if the browser did not open: http://127.0.0.1:<port>`
and `Waiting for the browser step to finish creating cairn-cairn-docs-capture...`.

- `[you]` Open the `127.0.0.1` link. It is a local page that posts the App manifest to GitHub on
  its own. On GitHub's "Create GitHub App" page, check the name reads `cairn-cairn-docs-capture` and
  click the create button. Its exact label is unverified; the tool's copy calls it the
  "Create the GitHub App" button.
- If GitHub shows "We didn't find an App Manifest for your request", you were signed out. Sign in,
  return to the `127.0.0.1` tab, and click its **Create the GitHub App** button again.
- If GitHub says the name is taken, stop and tell the operator: that is a failure answer.
- `[you]` Done when the browser shows "Step 1 of 2 is done: your GitHub App has been created. Return
  to the terminal."
- `[operator]` Waits for `Install the App and sign in` in the capture. Mark the App `created` in the
  ledger, with the slug from the install URL that follows.

2.4. **Install and authorize the App.** The terminal prints
`Your browser will open GitHub's install page for cairn-cairn-docs-capture; choose where to install it and approve.`,
then the link `https://github.com/apps/<slug>/installations/new`.

- `[you]` On the install page, install on your personal account `glw907`.
- `[you]` **Choose "All repositories".** This is the step the August run got wrong. The run creates
  the repository after this page, so "Only select repositories" has nothing to select, the tool's
  coverage check then fails, and its printed remedy names the same dead end.
- `[you]` Click **Install & Authorize** (GitHub's label, per the tool's code comments).
- `[you]` Done when the browser shows "Step 2 of 2 is done: the App is installed and authorized.
  Return to the terminal."
- `[operator]` Waits for `Signed in as glw907`. Mark the installation `created` in the ledger.
  `Pushing <n> files` follows; mark the repository `created`.

2.5. **Optional `[you]`: narrow the installation.** With "All repositories", this App can write
contents and administer every `glw907` repository until it is deleted. Once the capture shows
`Pushing <n> files`, nothing later in the run calls GitHub with the App. You can open
github.com/settings/installations, configure `cairn-cairn-docs-capture`, switch it to "Only select
repositories" with `cairn-docs-capture` selected, and save. Deleting the App at teardown removes the
access either way.

2.6. **Nothing to do while it installs.** The terminal prints `Install, build, and deploy` consent
copy, the sign-in email prompt (answered by the driver), then
`Installing your site's dependencies; this can take a few minutes.` This is a plain `npm install` of
the baked template against `^<RC>`.

2.7. **Sign in to Cloudflare.** The tool runs `wrangler whoami`, gets no session, prints
`Your browser will open Cloudflare's sign-in; approve wrangler's access`, and runs `wrangler login`,
which prints `Opening a link in your default browser: https://dash.cloudflare.com/oauth2/auth?...`
and listens on `localhost:8976`.

- `[you]` Open that link, sign in to Cloudflare if asked, and allow Wrangler's access. The page's
  wording is unverified.
- `[operator]` Waits for `Successfully logged in.` and then `Using your Cloudflare account: <name>.`
  (wrangler's wording, as the August capture recorded it). Mark the wrangler OAuth session `created`.

2.8. **Nothing to do while it builds and deploys.** The capture shows `Build your site`,
`Deploy to workers.dev`, `Deploying to Cloudflare; this can take a few minutes.`, wrangler's deploy
output, `Applying database migrations to AUTH_DB.`, and a second deploy.

- `[operator]` On the first `Deploying to Cloudflare`, mark the Worker, the D1 database, and the R2
  bucket `possibly created`: wrangler provisions the id-less bindings by name during that deploy. On
  `Applying database migrations to AUTH_DB.`, mark all three `created`.
- `[operator]` On `Success! Uploaded secret GITHUB_APP_PRIVATE_KEY_B64`, mark the secret `created`
  (it goes with the Worker).

2.9. **Sign in to the new site.** The capture shows `Writing your sign-in row to the site's database.`,
then `Open this link if the browser did not open: https://cairn-docs-capture.<subdomain>.workers.dev/admin/auth/confirm?token=...`,
then `A sign-in page just opened; click Sign in there. The link works for ten minutes; if it expires, re-run with --sign-in for a fresh one.`

- `[you]` Open that link and click **Sign in**. The admin should load. The run does not wait for
  this click, so it may already have finished by the time you do it.
- If ten minutes pass first, the operator runs step 4.2's `--sign-in` command for a fresh link. That
  run is not captured.

2.10. **The end of the run.** The capture shows `This site is set up end to end.`, the domain
admission (answered `n`), `No domain connected. Re-run npx create-cairn-site --dir cairn-docs-capture any time to connect one.`,
and the closing block from `printLiveInfo`: the repository and App links, `Your site is live at:`,
`Sign in at:`, the "What exists now" line, the domain and email hint, and the `cairn doctor` reminder.

2.11. `[operator]` The background command reports `exit 0`. Anything else is a failure answer. Then:

```bash
source /var/home/glw907/.local/state/cairn-docs-final/capture.env
tr -d '\r' < $SCRATCH/01-create-cairn-site.txt | grep -a -o 'Your site is live at: https://[^ ]*'
curl -s -o /dev/null -w '%{http_code}\n' <that URL>/
curl -s -o /dev/null -w '%{http_code}\n' <that URL>/admin
ls ~/.config/cairn/sites/ | grep cairn-docs-capture
jq -r '.step' ~/.config/cairn/sites/cairn-docs-capture-*.json   # must print live
```

The record holds the App's client secret, so read only `.step`, never the whole file. Record the URL,
both status codes, and the record's file name in the ledger. August saw 200 and 303; any other code
gets a note in the ledger and a look before the doctor runs.

`[you]` Confirm in chat that the admin loaded after **Sign in**.

## Part 3: what the run created

Mark each one `created` in the ledger with the identifier read from the capture or the API, not from
memory.

| Resource | Created at | Teardown step |
| --- | --- | --- |
| State record `~/.config/cairn/sites/cairn-docs-capture-*.json` | `Save the site record` | 8.4 |
| Site directory `$SITE` (and the scratch directory) | `Create cairn-docs-capture from the template` | 8.5 |
| GitHub App `cairn-cairn-docs-capture` and its installation | 2.3, 2.4 | 8.6 `[you]` |
| Repository `glw907/cairn-docs-capture` (with `.github/workflows/check.yml`) | `Create the private repository` | 8.2 |
| Worker `cairn-docs-capture` and its secret | `Deploy to workers.dev`, `Protect your site's App key` | 8.1 |
| D1 `cairn-docs-capture-auth` (owner row, token rows) | `Deploy to workers.dev`, `Sign you in` | 8.1 |
| R2 `cairn-docs-capture-media` | `Deploy to workers.dev` | 8.1 |
| Wrangler OAuth session | 2.7 | 8.3 |
| Local `cairn` binary `$STATE/bin/cairn` | 6.1 | 8.5 |
| npm `<RC>` of both packages, GitHub release and tag `v<RC>` | Part 0 | Not torn down: published versions are permanent and stay under `next` |
| Branch `docs-final-capture` | Part 0 | Not torn down: the fixtures merge from it into pass 4 |

## Part 4: retire the captured sign-in token

The capture holds the bootstrap link's one-time token, kept verbatim by the redaction ruling. It must
be dead before anything is pushed.

4.1. `[operator]` Hash the captured token. The engine stores only the SHA-256 hex of the raw token
(`seedOwnerAndToken`), and the base64url token needs no URL decoding:

```bash
source /var/home/glw907/.local/state/cairn-docs-final/capture.env
TOKEN=$(tr -d '\r' < $SCRATCH/01-create-cairn-site.txt | grep -a -o 'confirm?token=[A-Za-z0-9_-]*' | head -1 | cut -d= -f2)
HASH=$(printf %s "$TOKEN" | sha256sum | cut -d' ' -f1)
echo "$HASH"
```

4.2. `[operator]` Supersede it with an uncaptured `--sign-in` run. At step `live`, `--sign-in` deletes
every token row for the owner's address, writes a fresh one, opens it, and prints the closing block
without reaching the domain admission. From a non-interactive shell the new link's URL is withheld.

```bash
cd $SCRATCH
$CLEAN node $CAP/packages/create-cairn-site/bin.mjs --dir cairn-docs-capture --sign-in
```

`[you]` A sign-in page may open. Clicking it is fine and not needed.

4.3. `[operator]` Prove the captured token is gone:

```bash
cd $SITE
$CLEAN npx --no-install wrangler d1 execute AUTH_DB --remote \
  --command "SELECT COUNT(*) AS n FROM magic_token WHERE token_hash = '$HASH'"
```

It must report `n` as 0. Record the query and its result for the fixtures README.

## Part 5: the secret sweep

5.1. `[operator]` Sweep both captures before anything is copied into the repo. Run it after Part 6
too, over the doctor capture.

```bash
cd $SCRATCH
grep -a -n -E -e '-----BEGIN' -e 'CLOUDFLARE_API_TOKEN=' -e 'Bearer ' \
  -e 'ghp_' -e 'gho_' -e 'ghu_' -e 'ghr_' -e 'ghs_' -e 'github_pat_' \
  -e '\?token=' -e '\b[0-9a-fA-F]{40}\b' -e 'clientSecret' -e 'client_secret' \
  01-create-cairn-site.txt 04-doctor-report.txt | cut -c1-160
```

The one expected hit is `?token=` on the bootstrap link that Part 4 retired. Any other hit refuses
the copy-in: the capture is redone, never edited.

5.2. `[operator]` A name-only comparison against the workstation store, which prints names, never
values:

```bash
grep -oE '^(export )?[A-Za-z_][A-Za-z0-9_]*=' ~/.local/secrets | sed 's/^export //; s/=$//' > $STATE/secret-names.txt
grep -a -o -w -F -f $STATE/secret-names.txt $SCRATCH/01-create-cairn-site.txt $SCRATCH/04-doctor-report.txt | sort | uniq -c
rm $STATE/secret-names.txt
```

A name appearing in a capture is acceptable only where the tool prints it as an instruction or a
label, such as the `GITHUB_APP_PRIVATE_KEY_B64` secret upload line. Record each hit and why it is
safe.

## Part 6: the doctor capture

The doctor is `cairn doctor`, a subcommand of the Go `cairn` tool. It is a credential-less
preflight over a site's checked-in configuration, and it fetches the live site's `robots.txt` from
the `PUBLIC_ORIGIN` the run wrote into `wrangler.jsonc`. It runs before any teardown.

6.1. `[operator]` Build the tool from the capture commit and record that commit:

```bash
source /var/home/glw907/.local/state/cairn-docs-final/capture.env
mkdir -p $STATE/bin
cd $CAP/tool && go build -o $STATE/bin/cairn ./cmd/cairn
git -C $CAP rev-parse HEAD
```

6.2. `[operator]` Write the site facts first. Without them the facts-derived checks report
`unknown` with "needs engine 0.97.0 or later, and one build", a degraded state that must not become
the published report. The run already built the site.

```bash
cd $SITE
$CLEAN npx --no-install cairn-manifest
ls src/content/.cairn/site-facts.json
```

6.3. `[operator]` Capture the report through the committed recorder, with Bash's `-x` trace as the
fixture's first line:

```bash
cd $SITE
$CLEAN env PATH="$STATE/bin:$PATH" python3 -I $TX/ptycapture.py \
  $SCRATCH/04-doctor-report.txt -- bash -x -c 'cairn doctor .'
echo "exit $?"
```

The exit code follows the report's verdict, so a nonzero exit is not by itself a failure. Read the
whole report. A `FAIL` that names a credential, an App, or a repository from this workstation's
environment rather than the site means the wrapper leaked: fix `clean-env` and capture again. The
summary counts go in the README from the fixture's own text.

The site installed the engine from the registry, so `node_modules/@glw907/cairn-cms` is a real
copy. The showcase capture's `UNCHECKED` dependency-floor line came from a symlink and is not
expected here (unverified, confirm live).

6.4. `[operator]` Run step 5.1 again so it covers `04-doctor-report.txt`.

## Part 7: copy in, record, commit

7.1. `[operator]` Check the record's account matches the account teardown will target:
`jq -r '.cloudflare.accountId' ~/.config/cairn/sites/cairn-docs-capture-*.json` must print `$ACCT`.
If it differs, correct `ACCT` in `capture.env` and the ledger.

7.2. `[operator]` Copy the captures in unedited and retire the superseded August files. The new
`01-create-cairn-site.txt` holds the whole run in one invocation, so `01b`, `01c`, and `01d` describe
a run that no longer has a first half in the repo:

```bash
cp $SCRATCH/01-create-cairn-site.txt $SCRATCH/04-doctor-report.txt $TX/
cd $CAP
git rm packages/create-cairn-site/test/fixtures/transcripts/01b-resume.txt \
  packages/create-cairn-site/test/fixtures/transcripts/01c-resume.txt \
  packages/create-cairn-site/test/fixtures/transcripts/01d-resume.txt
cmp $SCRATCH/01-create-cairn-site.txt $TX/01-create-cairn-site.txt
cmp $SCRATCH/04-doctor-report.txt $TX/04-doctor-report.txt
```

7.3. `[operator]` Rewrite the fixtures README for this run. The README is a record, not a fixture,
so it changes. Keep "Capture method" and "Identifiers" and the two rules at the top. Replace the
run-specific sections, and drop the staleness notes and the August doctor and recapture sections,
since every fixture they describe is gone. The new sections record:

- **The run:** the date, the source commit (`git -C $CAP rev-parse HEAD`, tree clean), `<RC>` for
  both packages under `next` with `latest` unchanged and its value, the site name, the workers.dev
  URL, and the scratch directory outside the repo.
- **The bake command**, exactly as run in step 1.7.
- **Environment:** the `clean-env` variable list, wrangler logged out at the start, Node and wrangler
  versions as the capture printed them.
- **The invocations:** a table of both files with the exact command lines from steps 2.1 and 6.3,
  including the `--answer` list, and each outcome (the live summary, and the doctor's counts quoted
  from the fixture).
- **The doctor capture:** the `cairn` binary built from the same commit, `npx cairn-manifest` run
  first, and why the dependency-floor line reads as it does.
- **The captured sign-in token is dead:** the supersede run from step 4.2 and the zero-row query from
  step 4.3.
- **The secret sweep:** both patterns and both results from Part 5.
- **Deliberately unconsumed:** keep the heading. List nothing unless a resume file exists. Pass 4
  decides what its pages quote.

7.4. `[operator]` Run the transcript gate. The admin arm holds no page yet, so its floors and the
uncited-fixture rule wait for pass 4, and the gate checks the rest:

```bash
cd $CAP && npm run check:transcripts
```

7.5. `[operator]` Commit the fixtures and the README on `docs-final-capture`, by file, and push. The
message ends with the session's attribution lines.

```bash
cd $CAP
git add packages/create-cairn-site/test/fixtures/transcripts/01-create-cairn-site.txt \
  packages/create-cairn-site/test/fixtures/transcripts/04-doctor-report.txt \
  packages/create-cairn-site/test/fixtures/transcripts/README.md
git commit -m "Recapture the create-cairn-site and doctor fixtures from <RC>"
git push origin docs-final-capture
```

Record the commit in the ledger and set the capture state to `captured`. The fixtures merge into pass
4's branch from here; the conductor handles that.

## Part 8: teardown

Teardown runs after Part 7's push. Verify by listing, never from memory. Mark each resource
`deleted` as its command succeeds and `verified gone` after step 8.7.

8.1. `[operator]` The Worker (its secret goes with it), the D1 database, and the R2 bucket, through
the API token, which carries Workers scripts, D1, and R2 per the estate inventory:

```bash
source /var/home/glw907/.local/state/cairn-docs-final/capture.env
source ~/.local/secrets
T="Authorization: Bearer $CLOUDFLARE_API_TOKEN"
API=https://api.cloudflare.com/client/v4/accounts/$ACCT
curl -s -X DELETE -H "$T" "$API/workers/scripts/cairn-docs-capture" | jq '.success'
DB=$(curl -s -H "$T" "$API/d1/database?name=cairn-docs-capture-auth" | jq -r '.result[] | select(.name=="cairn-docs-capture-auth") | .uuid')
echo "$DB"
curl -s -X DELETE -H "$T" "$API/d1/database/$DB" | jq '.success'
curl -s -X DELETE -H "$T" "$API/r2/buckets/cairn-docs-capture-media" | jq '.success, .errors'
```

The bucket delete refuses a bucket that holds objects. If it does, name the error in the ledger and
stop for the conductor rather than improvising an object purge.

8.2. `[operator]` The repository:

```bash
gh repo delete glw907/cairn-docs-capture --yes
```

If `gh` lacks the `delete_repo` scope, run `gh auth refresh -h github.com -s delete_repo`. `[you]`
That opens GitHub's device sign-in in your browser: enter the code the terminal shows and approve.
Or delete the repository yourself under its Settings, Danger Zone.

8.3. `[operator]` Sign wrangler out. Run it under the wrapper, so wrangler signs out the OAuth
session rather than seeing the API token:

```bash
cd $SITE && $CLEAN npx --no-install wrangler logout
$CLEAN npx --no-install wrangler whoami    # must report not authenticated
```

8.4. `[operator]` The state record, including any record a `--start-over` set aside:

```bash
ls ~/.config/cairn/sites/ | grep cairn-docs-capture
rm ~/.config/cairn/sites/cairn-docs-capture-*.json
```

8.5. `[operator]` The scratch directory and the local binary:

```bash
rm -rf /var/home/glw907/Projects/cairn-scratch/docs-final-capture
rm -f /var/home/glw907/.local/state/cairn-docs-final/bin/cairn
```

8.6. `[you]` Delete the GitHub App. Open github.com/settings/apps, choose `cairn-cairn-docs-capture`,
go to **Advanced**, click **Delete GitHub App**, and type the name to confirm. Deleting the App also
removes its installation. Delete `cairn-cairn-capture-scratch` the same way if step 1.11 found it.
Tell the operator when it is done.

8.7. `[operator]` Verify every class is gone:

```bash
source ~/.local/secrets
T="Authorization: Bearer $CLOUDFLARE_API_TOKEN"
API=https://api.cloudflare.com/client/v4/accounts/120c269ad6d3dfbe6d63a0bb53758ca0
curl -s -H "$T" "$API/workers/scripts" | jq -r '.result[].id' | grep cairn-docs-capture
curl -s -H "$T" "$API/d1/database?name=cairn-docs-capture-auth" | jq '.result'
curl -s -H "$T" "$API/r2/buckets" | jq -r '.result.buckets[].name' | grep cairn-docs-capture
gh repo view glw907/cairn-docs-capture        # not found
gh api /apps/cairn-cairn-docs-capture         # 404
ls ~/.config/cairn/sites/ 2>/dev/null | grep cairn-docs-capture
ls /var/home/glw907/Projects/cairn-scratch/docs-final-capture   # no such directory
```

Every listing comes back empty or not found. Set the capture state to `torn down` in the ledger.

## Failure answers

These mirror the plan's "The capture sitting" and "Standing answers".

- **A half-done run** (any exit before the live summary, a browser trip that times out after ten
  minutes, a stall at an unexpected prompt, GitHub refusing the App name, the coverage check's
  "installation does not include" error, or the resume's "repository already exists" refusal): stop
  the capture if it is still running (`pkill -INT -f "$CAP/packages/create-cairn-site/bin.mjs"`),
  keep its file out of the repo, tear down what the ledger lists (Part 8, with `[you]` deleting the
  App if one was made), and rerun once from Part 2 under the `-2` names. Do not resume a half-done
  run with `--dir`: a resume across repository creation is not idempotent, and the plan reruns
  whole.
- **An unexpected prompt with a known answer** (for example the Cloudflare account select): add its
  `--answer` in the right position for the rerun and record why in the README.
- **A bug in the engine:** stop, file it, and hand it to the conductor. It is fixed on the stack,
  published from this branch as the next prerelease (`-rc.2`, same Part 0 procedure), the template is
  baked again against it, and the run is redone whole.
- **A second failure** escalates. Write a STATUS line in the ledger, run `notify-send -u normal`, and
  stop. Pass 4 then writes `create-your-site` from what is proven.
- **An expired sign-in link** is not a failure. Step 4.2's `--sign-in` issues a fresh one.
- **A leaked credential in a doctor report** points at the harness. Fix `clean-env` and capture Part
  6 again; the scaffold capture stands.

## Unverified points, to confirm live

- The worktree path `$CAP` the conductor creates in Part 0.
- That `npm version` inside `packages/cairn-cms-dev` also updates the root lockfile's workspace entry
  (step 0.3's `git diff --stat` shows it).
- The label of GitHub's create button on the manifest page.
- The wording of Cloudflare's wrangler consent page.
- That Geoff's Cloudflare login sees one account, so no account select appears.
- That `xdg-open` from the background capture reaches Geoff's desktop. The relayed link covers it
  either way.
- The site's HTTP status codes after deploy (August: 200 and 303).
- The doctor's dependency-floor line on a registry install.
