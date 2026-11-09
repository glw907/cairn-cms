# Set up a site with an agent

A coding agent can set up a cairn site from flags and a plan file, with no prompt in a terminal. The agent runs `cairn new` in two calls: one writes a plan and creates nothing on Cloudflare, and the second creates the site from that plan once the owner has reviewed it. The owner still approves each browser step, because setup reaches into the owner's Cloudflare and GitHub accounts and the agent can't consent for them.

This page is for two readers. If you own the site, hand this page to your agent. If you are the agent, it is the whole contract, and the generated [setup reference](./setup-reference.md) lists every flag, derived name, step, event, and exit code. To answer the questions yourself in a terminal, start with `npm create cairn-site` instead, which installs the `cairn` CLI and runs `cairn new`. A run with no terminal and no mode flag prints the agent guide.

The owner needs the accounts and the computer that [Before you start](./before-you-start.md) lists, and the agent needs a terminal on that computer. The owner's browser opens on the same computer.

## Teach your agent the steps

The `cairn` plugin for Claude Code holds a skill, `cairn-setting-up-a-site`, that carries this page's rules into the agent's session. Install it once for each person:

1. In Claude Code, add the marketplace: `/plugin marketplace add glw907/cairn-cms`.
2. Install the plugin: `/plugin install cairn@cairn`.

The plugin is optional. This page works without it. [Suggested plugins](./suggested-plugins.md) covers the other plugins a new site offers.

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

This call runs the owner's four browser approvals. The first signs in to Cloudflare. The other three create the site's GitHub App and give it access to the repository. The call then stops where the summary would appear and writes `plan.json`. Nothing exists on Cloudflare yet. The plan holds no credential.

Give the flags only for the choices that apply:

- `--account` names the Cloudflare account, by id, when the sign-in lists several.
- `--zone` names the Cloudflare domain to serve the site from, when the account has several.
- `--host` sets the site's address: the zone itself, or a subdomain of it.
- `--site-theme` names the theme, when the template offers several.

An account or domain that no flag answered stays open. The call exits 0 and its stream has no `summary` event. The plan lists the options, and it lists no domains while the account is open, so give `--account` with `--plan`. A theme that no flag answered is a usage error, because setup asks for it before it writes a record.

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
| `step_failed` | The run stopped. The `failure` field holds the four-part reason: what happened, what setup already did, what it left in place, and what to do. |
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
