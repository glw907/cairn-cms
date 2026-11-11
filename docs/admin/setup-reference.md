# The cairn new setup reference

This page is generated from the code by `make reference`. Do not edit it by hand.

It describes how to run `cairn new` without a terminal: the flags that answer each question, the
names setup derives, the steps it takes, the events it writes, and the exit codes it returns.
Run `cairn new --plan plan.json` with the answers as flags, review the plan, and then run
`cairn new --apply plan.json`. [Set up a site with an agent](./set-up-with-an-agent.md) walks
through the two calls.

## Flags

| Flag | Value | Meaning |
| --- | --- | --- |
| `--name` | string | the site's name, from which the repository, Worker, and database names derive; required with --plan and --dry-run |
| `--email` | string | the first owner's email address; required with --plan and --dry-run |
| `--posture` | string | decline or invite: what the site does about AI crawlers; required with --plan and --dry-run |
| `--site-theme` | string | the theme id, when the template offers several |
| `--account` | string | the Cloudflare account id, not its name, when setup finds several accounts |
| `--zone` | string | the Cloudflare domain to serve the site from, when the account has several and --host doesn't name one |
| `--host` | string | the site's address: a domain the account holds, or a subdomain of one |
| `--plan` | string | run the questions and approvals, write the plan to this file, and create nothing |
| `--apply` | string | create the site from a plan file |
| `--resume` | string | continue the unfinished setup with this site id |
| `--new` | none | start a new site instead of continuing an unfinished one |
| `--dry-run` | none | print the names setup would use and create nothing |
| `--json` | none | write the dry run as a JSON payload on stdout |
| `--tag` | string | the engine's npm dist-tag to build the site from, or npm's own tag setting when it is set (default "latest") |

## Environment

| Variable | Meaning |
| --- | --- |
| `CAIRN_CF_SETUP_TOKEN` | A Cloudflare API token that setup uses in place of the Cloudflare approval, read from the environment only, never a flag. Setup uses it for every Cloudflare call, stores it as the site's deploy key, and mints no token. The token can't read the owner's email, so give `--email` with it. A resume needs the same variable. |

Setup never reads `CLOUDFLARE_API_TOKEN`.

## Derived names

Setup derives every name from the site name. For the site name "My Site":

| Name | Example |
| --- | --- |
| Repository | `my-site` |
| Worker | `my-site` |
| D1 database | `my-site-auth` |
| R2 bucket | `my-site-media` |
| GitHub App | `cairn-my-site` |
| Folder | `./my-site` |

A taken name adds a suffix such as `-2` to the repository, Worker, database, and bucket names.
The App name never takes the suffix.

## Steps

| Step | Who | What happens |
| --- | --- | --- |
| `opening-checks` | tool | Check git, Node 24 or later, port 49152, the keyring, the template, and the folder |
| `approve-cloudflare` | owner | Approve Cloudflare sign-in |
| `cloudflare-checks` | tool | Check accounts, zones, names, and the address |
| `approve-create-app` | owner | Create the GitHub App |
| `approve-install-all` | owner | Install and authorize the App on all repositories |
| `approve-install-repo` | owner | Approve, install, and authorize the App on the new repository only |
| `summary` | owner | Read the summary and press Enter |
| `scaffold` | tool | Scaffold the site folder |
| `provision` | tool | Create the D1 database, the R2 bucket, and the email sending subdomain |
| `commit` | tool | Write the config and commit locally |
| `deploy-key` | tool | Mint the deploy key and store it as a repository secret |
| `push` | tool | Recheck the Worker name and push to GitHub |
| `first-deploy` | tool | Deploy for the first time and set the Worker secret |
| `domains` | tool | Attach the custom domains and wait for HTTPS |
| `sign-in` | tool | Check the sign-in row and redirect |

## Events

With `--apply`, setup writes one JSON object per line to stdout. Each carries `schemaVersion`,
`kind`, and `timestamp`.

| Kind | Meaning |
| --- | --- |
| `step_started` | a step began |
| `step_done` | a step finished |
| `step_failed` | a step stopped the run, with the four-part failure |
| `waiting` | setup waits on the owner in the browser |
| `resumed` | the run picked up an unfinished record |
| `summary` | every derived value, for the owner to review |

The `step_done` event of `approve-cloudflare` and every `summary` carry `credential`: `token`
when the run used the setup token, and `approval` otherwise.

A `waiting` event carries one of these states:

| State | Sentence |
| --- | --- |
| `approve-cloudflare` | On the Cloudflare page, turn on API Tokens Write under Sensitive scopes, and then select Authorize. Cloudflare leaves API Tokens Write off, and setup needs it to create your site's deploy key. |
| `approve-create-app` | Select Create GitHub App to add the App for <name>. The admin saves changes to your site through the App. |
| `approve-install-all` | Select Install & Authorize to let setup create the <repo> repository. This access covers all your repositories. Setup removes it within seconds. |
| `approve-install-repo` | Select Approve, Install, & Authorize to give the App access to <repo> only. Setup uses this access to push your site and store the deploy key. |
| `reconsent-cloudflare` | On the Cloudflare page, turn on API Tokens Write under Sensitive scopes, and then select Authorize. The earlier approval no longer works, so setup asks again. |

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | the run finished, the plan file was written, or the command only listed or printed |
| 1 | setup stopped at a step, including a refusal found after the run began; the run is saved, and cairn new --resume continues it |
| 2 | setup stopped: interrupted or timed out; cairn new --resume continues it |
| 3 | a usage error: a flag or the plan file was refused before anything ran, and stdout is empty |

A stream of events that does not end with a summary is unfinished.
