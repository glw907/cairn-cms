# Set up a site with an agent

A coding agent can set up a cairn site from flags and a plan file, with no prompt in a terminal. The agent runs `cairn new` in two calls: one writes a plan and creates nothing on Cloudflare, and the second creates the site from that plan once the owner has reviewed it. The owner still approves each browser step, because setup reaches into the owner's Cloudflare and GitHub accounts and the agent can't consent for them.

This page is for two readers. If you own the site, hand this page to your agent. If you are the agent, it is the whole contract, and the generated [setup reference](./setup-reference.md) lists every flag, derived name, step, event, and exit code. To answer the questions yourself in a terminal, start with `npm create cairn-site` instead, which installs the `cairn` CLI and runs `cairn new`. A run with no terminal and no mode flag prints the agent guide.

The owner needs the accounts and the computer that [Before you start](./before-you-start.md) lists, and the agent needs a terminal on that computer. The owner's browser opens on the same computer.

## Teach your agent the steps

The `cairn` plugin for Claude Code holds a skill, `cairn-setting-up-a-site`, that carries this page's rules into the agent's session. Install it once for each person:

1. In Claude Code, add the marketplace: `/plugin marketplace add glw907/cairn-cms`.
2. Install the plugin: `/plugin install cairn@cairn`.

The plugin is optional. This page works without it. [Suggested plugins](./suggested-plugins.md) covers the other plugins a new site offers.

## Run the command

Run `cairn` as one bare call, and make the call before you ask the owner anything about the sandbox. Setup serves its approval tab on a local port, and a sandboxed command's localhost is private to the sandbox, so the owner's browser can reach the tab only when the call runs outside the sandbox. What happens to the bare call depends on the owner's Claude Code settings ([Claude Code sandboxing](https://code.claude.com/docs/en/sandboxing)):

- With the sandbox off, the call runs as it is.
- With `cairn *` and `npx create-cairn-site *` in `sandbox.excludedCommands`, a bare call runs outside the sandbox with no prompt.
- With neither, the call runs inside the sandbox, and `--plan`, `--apply`, and `--resume` stop at once, before they serve the tab, with a message that says so. A dry run still runs.

When the call stops that way, take these steps in order:

1. Run the same call again, bare. An exclusion matches only the text of the call, so a call that has a `cd`, a pipe, a redirect, `;`, `&&`, an option before the package name, or a version or tag runs inside the sandbox even when the exclusions are set. This step needs no prompt and no change to the owner's settings.
2. If the call was already bare, run it again with the Bash tool's `dangerouslyDisableSandbox` parameter. Don't ask first. Claude Code asks the owner to approve the call in a prompt titled `Bash command (unsandboxed)`, and that prompt is the owner's approval, unless an allow rule already covers it.
3. The owner can switch the parameter off with `allowUnsandboxedCommands: false`. The retry then runs inside the sandbox too and stops with the same message. When it does, ask the owner to add the two exclusions above, and make the same call again.

Claude Code matches a sandbox exclusion against the text of the call, so keep the call bare:

- Write no `cd`, redirect, pipe, `;`, `&&`, or `$(...)` in it. Change to the folder in a separate call first. Don't pipe the output through `tail` or `head` to shorten it: the pipe is what stops the exclusion from matching.
- Put no npx option in front of the package name, not `--yes` and not `-y`, and add no version or tag to it. With no terminal, npx installs the package without asking, so an option adds nothing.
- Write no `new` after the package name. The launcher already runs `cairn new`, and it drops a leading `new`.
- Run the call from an empty folder, and never from inside a clone of the cairn-cms repository. npx matches the package name against the local project before it fetches anything, and a clone holds a package of the same name that isn't installed, so the call fails at once with `command not found`.

Start the command in the background, so you can read each `waiting` sentence to the owner while the run blocks. In Claude Code, that's the Bash tool's `run_in_background` option. When `cairn` isn't installed, run `npx create-cairn-site` followed by the flags.

## Use a Cloudflare token for an unattended run

An owner who runs setup from CI, or who doesn't want the Cloudflare browser approval, can put a Cloudflare API token in the `CAIRN_CF_SETUP_TOKEN` environment variable. Set it in the environment only, because there is no flag for it. Setup trims spaces and line breaks around the value and refuses one with a space or line break inside. With it set when a setup starts, setup skips the first approval and uses the token for every Cloudflare call. The GitHub approvals still need the owner's browser.

If the variable is already set when you start, the owner set it for this run. Setup reports `credential: token`. Tell the owner that setup is using their token, and go on. There is nothing to confirm, and you never print the value.

Create the token as an account-owned token, with these permissions:

- On the account: Workers Scripts Edit, D1 Edit, Workers R2 Storage Edit, Email Sending Edit, and Account Settings Read.
- On the site's zone: Zone Read, DNS Edit, and Workers Routes Edit.

Setup stores the token as the site's `CLOUDFLARE_API_TOKEN` Actions secret, which the deploy uses. It mints no token and revokes no Cloudflare approval. When you no longer want the site to deploy, revoke the token yourself. Because the token can't read the owner's email address, `--email` is required. A resume needs the variable set again. `CLOUDFLARE_API_TOKEN` in the environment never selects this mode. The `step_done` event for the first approval and the `summary` event carry `credential`, which is `token` for this run and `approval` otherwise.

## Preview the names

A dry run prints the names setup would use and creates nothing. It needs `--name`, `--email`, and `--posture`, which is `decline` or `invite` and sets what the site does about AI crawlers. It reads no registry, makes no network call, and asks for no approval, so it is a safe first call.

```bash
cairn new --dry-run --json --name "My Site" --host example.com --email me@example.com --posture decline
```

With `--json`, the dry run writes one payload to stdout:

<!-- transcript: tool/testdata/transcripts/06-cairn-new-dry-run-json.txt -->
```
{"schemaVersion":1,"kind":"dryRun","siteName":"My Site","repository":"my-site","worker":"my-site","database":"my-site-auth","bucket":"my-site-media","app":"cairn-my-site","folder":"./my-site","ownerEmail":"me@example.com","posture":"decline"}
```

A taken repository, Worker, database, or bucket name takes a suffix such as `-2` at run time. The dry run reads no account, so it can't show one.

## Write the plan

Answer every question with a flag, and name a file for the plan:

```bash
cairn new --plan plan.json --name "My Site" --email me@example.com --posture decline
```

This call runs the owner's four browser approvals, or three when the owner sets a Cloudflare token. The first signs in to Cloudflare. The other three create the site's GitHub App and give it access to the repository. The call then stops where the summary would appear and writes `plan.json`. Nothing exists on Cloudflare yet. The plan holds no credential.

Give the flags only for the choices that apply:

- `--account` names the Cloudflare account by its id, never by its name, when the sign-in lists several.
- `--zone` names the Cloudflare domain to serve the site from, when the account has several.
- `--host` sets the site's address: a domain the account holds, or a subdomain of one. The host names its zone: the longest domain the account holds that is the host or a parent of it. `--host blog.example.com` serves from `example.com` when the account holds that domain and no closer one. Give `--zone` only when the host doesn't name one.
- `--site-theme` names the theme, when the template offers several.

An account that no flag answered, or a domain that neither `--zone` nor `--host` answered, stays open. The call exits 0 and its stream has no `summary` event. The plan lists the options, and it lists no domains while the account is open, so give `--account` with `--plan`. A theme that no flag answered is a usage error, because setup asks for it before it writes a record.

A second `--plan` refuses to start while an unfinished setup exists. It names the unfinished setup and asks you to resume it or add `--new`.

## Review the plan with the owner

Show the owner `plan.json` before anything is created. The fields that derive from the site's name are closed, and `--apply` refuses a plan that changed one. Four fields are open, and the owner or the agent may edit them:

| Field | What it holds |
| --- | --- |
| `account` | The Cloudflare account id. Fill it in when the plan lists several `accounts`. |
| `zone` | The Cloudflare domain. Fill it in when the plan lists several `zones`. |
| `address` | The site's address: the zone, or a subdomain of it. |
| `ownerEmail` | The first owner's email address, which setup takes from `--email`. |

Confirm the email address with the owner. Setup sends the sign-in link there.

## Apply the plan

Create the site from the reviewed plan. This command creates the site:

```bash
cairn new --apply plan.json
```

`--apply` takes no answer flags, because the plan holds the answers. It refuses a plan that leaves the account or the domain open, before anything runs. Apply can still wait on the owner for a browser approval.

## Wait for the run

A run usually takes a few minutes. The step that connects the domain waits for the new address to answer over HTTPS, and that wait can last up to 15 more minutes. It needs nothing from the owner, so it prints no `waiting` event. A stream that goes quiet there isn't stuck.

Leave the new address alone until the `summary` event arrives. Then visit it to [verify the site](#verify-the-site). A `curl`, `dig`, or browser visit to the address before setup has created the address's record makes the computer's resolver remember that the name doesn't exist. The computer can then keep answering that way for up to 30 minutes after the record is live, and the owner's first visit fails.

## Read a usage error

A usage error exits 3 before anything runs and leaves stdout empty. The message goes to stderr, and this block merges both streams:

<!-- transcript: tool/testdata/transcripts/08-cairn-new-usage-error.txt -->
```
cairn: --posture is required with --dry-run.
Run `cairn new --help` for the flags
```

The command that produced it left out `--posture`:

```bash
cairn new --dry-run --name "My Site" --host example.com --email me@example.com --color never
```

## Read the event stream

`--plan`, `--apply`, and `--resume` write one JSON object per line to stdout. Each carries `schemaVersion`, `kind`, and `timestamp`. A stream is finished only when its last line is a `summary` event, so a stream that ends any other way is unfinished.

| Kind | What the agent does |
| --- | --- |
| `step_started`, `step_done` | Track progress. The `step` field names the step. |
| `waiting` | Read the `sentence` field to the owner, word for word. The run blocks until the owner finishes that browser step. |
| `step_failed` | The run stopped. The `failure` field holds the four-part reason: what happened, what setup already did, what it left in place, and what to do. When a request to a provider failed, `failure` also carries a `detail` field. |
| `resumed` | The run picked up an unfinished record. |
| `summary` | Every derived value. The run finished. |

A `waiting` event names one approval: `approve-cloudflare`, `approve-create-app`, `approve-install-all`, `approve-install-repo`, or `reconsent-cloudflare`. The last one means an earlier Cloudflare approval no longer works, so the owner approves again. The whole chain of approvals has a 30-minute limit.

## Handle a stop

Check the exit code first.

| Code | Meaning |
| --- | --- |
| 0 | The run finished, the plan file was written, or the command only listed or printed. |
| 1 | Setup stopped at a step. A stop after setup saved its record resumes with `cairn new --resume`. |
| 2 | Setup stopped because it was interrupted or timed out. `cairn new --resume` continues it. |
| 3 | A usage error. A flag or the plan file was refused before anything ran, and stdout is empty. |

On exit 1 or 2, setup prints the four-part failure to stderr. Show the owner what it says to do.

When a provider answered a request with an error, setup adds a fifth line with the cause: the provider, its reason, the HTTP status, the error code when the provider gives one, and the request. For example, `cloudflare: forbidden (status 403, code 10000) on GET /zones/<id>/dns_records` means the credential lacks a permission for that request. Pass the line on with the four parts. In a token run, it means the token lacks one of the permissions this page lists.

When a request got no answer at all, the same line names the method, the host, and the kind of failure, such as `cloudflare: Get request to api.cloudflare.com: DNS lookup of api.cloudflare.com failed: i/o timeout`. The kinds are a failed lookup, a timeout, a refused or unreachable connection, a connection that could not be made, a TLS error, a proxy error, a connection that closed unexpectedly, and a plain transport error. That is a problem on the owner's computer or network, not a refusal. Setup already tried a lookup or connection that failed before the request left up to three times, and it repeats a read-only request that timed out or dropped the same way. It never repeats a write that may have reached the provider, so a stop with this line after a write can be the first and only attempt. Run the setup command again.

To find an unfinished run, including one the agent didn't start, list the setup records. The command reads the local record only, with no network and no keyring:

```bash
cairn new status
```

Each row names a site id, whether the run is finished, and its current step. Continue an unfinished run with its id:

```bash
cairn new --resume <id>
```

A resume confirms the summary as the record holds it, with no second review, so the owner reviews the plan before `--apply`. `--resume` takes `--account` and `--zone`, for a run that stopped at one of those choices. To start another site while one is unfinished, add `--new` to `--plan`. `--new` can't combine with `--resume` or `--apply`.

## Follow the hard rules

1. Never print a sign-in link, in output, in a log, or in a message to the owner. No event carries one. Setup emails the sign-in link to the owner, and the link works once, for 10 minutes. If it has expired, the owner requests a new one on the site's sign-in page.
2. If no browser opens, setup prints a link to stderr for the owner to open on this computer. It is the setup tab's one-time link. Hand it to the owner and keep it out of any record.
3. The owner approves each browser step. The agent reads each `waiting` sentence to the owner and waits.
4. The owner reviews the plan before `--apply`.
5. Fill in no choice for the owner. An unanswered required flag is a usage error that names the flag, and setup never prompts.

## Verify the site

A finished run ends its stream with a `summary` event and exits 0. Check these results:

1. The `summary` event is the last line of the stream.
2. The site answers at the address the summary lists.
3. The owner received the sign-in email, and can sign in to `/admin` at the address.

The deploy runs in GitHub Actions, and the admin doesn't show its status. [Deploys](./deploys.md) says where to read it and what a failed first deploy means.

## If something fails

A stopped run keeps what it created and resumes from the last completed step. [Recover a setup that stopped](./setup-recovery.md) covers each stop by name, and [Troubleshoot a live site](./troubleshooting.md) covers a site that is up and misbehaves.

## See also

- [Setup reference](./setup-reference.md) lists every flag, name, step, event, and exit code.
- [Deploys](./deploys.md) explains how the site deploys and how to move to Cloudflare's own builds.
- [Suggested plugins](./suggested-plugins.md) lists the plugins a new site offers.
- [Invite editors](./invite-editors.md) adds the people who write on the site.
