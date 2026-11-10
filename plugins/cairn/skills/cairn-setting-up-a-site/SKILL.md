---
name: cairn-setting-up-a-site
description: Sets up a new cairn site with `cairn new`. Use when a person asks to create, set up, or start a cairn site, to resume a setup that stopped, or to run setup without a terminal. Not for changing a site that already exists; that is `cairn-extending-a-site`.
---

# Set up a cairn site

`cairn new` creates the site's GitHub repository, its Cloudflare Worker, database, and media bucket, and signs the person in as the owner. The person approves each step in their browser. This skill covers how to run it for them. `cairn new --help` lists the flags, `cairn help agents` lists the events and exit codes, and the [set up with an agent](https://github.com/glw907/cairn-cms/blob/main/docs/admin/set-up-with-an-agent.md) page is the human-readable version. Read those instead of guessing.

## Before you run it

1. Ask the person for the site's name, the owner's email address, and whether the site should decline or invite AI crawlers. Ask for the address too if they have one in mind. It must be a domain on their Cloudflare account or a subdomain of one. Do not choose for them.
2. Check the person has a GitHub account, a Cloudflare account with a domain on it, and Cloudflare's Workers Paid plan. The [before you start](https://github.com/glw907/cairn-cms/blob/main/docs/admin/before-you-start.md) page says what each costs.
3. Find out how to run it. If `cairn` is installed, run `cairn new --help`. If it isn't, install nothing: `npx create-cairn-site` takes the same flags as `cairn new`, and `npx create-cairn-site --help` lists them.

## How to run `cairn`

Run it as one bare call. It has to end up outside the sandbox: setup serves its approval page on a local port, and a sandboxed command's localhost is private to the sandbox, so the person's browser can't reach the page.

Make the call before you ask the person anything about the sandbox. With the sandbox off, it runs as it is. With `cairn *` and `npx create-cairn-site *` in the person's `sandbox.excludedCommands`, a bare call runs outside the sandbox with no prompt. With neither, `cairn` stops at once with a message that says it ran inside the sandbox. Run the same call again with the Bash tool's `dangerouslyDisableSandbox` parameter, and Claude Code asks the person to approve it. Don't ask first: that prompt is their approval ([Claude Code sandboxing](https://code.claude.com/docs/en/sandboxing)). If the retry stops with the same message, the person has switched it off (`allowUnsandboxedCommands: false`). Only an exclusion works then, so ask the person to add the two above, and make the same call again.

Keep the call bare, so that an exclusion the person already set for `cairn` still matches the text of the call:

- Put no `cd`, redirect, pipe, or `$(...)` in it. Change to an empty folder in a separate call first.
- Never run it from inside a clone of the cairn-cms repository. npx matches the package name against the local project first, and a clone holds an uninstalled package of the same name, so the call fails with `command not found`.
- Put no npx option in front of the package name, not even the one that answers npx's install prompt, and add no version or tag to it.
- Write no `new` after the package name. The launcher already runs `cairn new`.

Start the call with the Bash tool's `run_in_background`, so you can relay each `waiting` sentence to the person while the run blocks.

## Plan, then apply

1. `cairn new --plan plan.json --name "<name>" --email <email> --posture <decline|invite>` runs the questions and the browser approvals, writes the plan, and creates nothing. Add every choice you already know in this same call: `--host`, `--account`, `--zone`, `--site-theme`. A `--host` that is a domain on the account, or a subdomain of one, names its zone, so give `--zone` only when it doesn't. `--account` takes the account's id, never its name.
2. Show the person the plan. For a choice it leaves open, ask the person which account or domain to use, and never pick one. They edit the plan's open fields (`account`, `zone`, `address`), or you run `cairn new --resume <id> --account <a> --zone <z>`. Never run `--plan` again or add `--new` to change an answer: that starts a second setup with new approvals and a new GitHub App.
3. `cairn new --apply plan.json` creates the site.

Each `waiting` event carries a `sentence`. Show that sentence to the person as written. The event stays open until the person finishes the browser step, however long that takes, so keep waiting. Never click for them. With no Cloudflare token, the first approval is Cloudflare's and the next three are GitHub's.

## With a Cloudflare token

The person can put a Cloudflare API token in the `CAIRN_CF_SETUP_TOKEN` environment variable. Never take it as a flag, and never print it. Setup then skips the Cloudflare approval, uses the token for every Cloudflare call, and stores it as the site's deploy key. `--email` is required, a resume needs the variable again, and the person still approves three GitHub steps in their browser. The [set up with an agent](https://github.com/glw907/cairn-cms/blob/main/docs/admin/set-up-with-an-agent.md) page lists the token's permissions.

If the variable is already set when you start, the person set it for this run. Setup reports `credential: token`. Tell the person that setup is using their token, and go on. There is nothing to confirm.

## While it runs

- A run usually takes a few minutes. The last step waits for the new address to answer over HTTPS and can take up to 15 more. It prints no `waiting` event, so a quiet stream there is not a stuck run.
- Leave the new address alone until the `summary` event: no `curl`, `dig`, or browser visit. A lookup before setup has created the record makes the computer remember that the name doesn't exist, for up to 30 minutes, and the person's first visit fails. When the `summary` event arrives, visit the address to check the site answers.

## Read the result

- Events are one JSON object per line on stdout. A stream that ends without a `summary` event is unfinished.
- Exit codes: 0 finished, 1 stopped at a step, 2 interrupted or timed out, 3 usage error (stdout is empty). A `step_failed` event carries four parts: what happened, why, what setup kept, and what to do. Whenever a provider returned an error, it also carries a `detail` with the provider's status, its error code, and the failed request, such as `cloudflare: forbidden (status 403, code 10000) on GET /zones/<id>/dns_records`. Pass the four parts on in order, then the detail.
- To resume, run `cairn new --resume <id>` (`cairn new status` lists the ids), or `--new` to start a different site.

## Hard rules

- Never print, log, or paste a sign-in link, a token, a code, or a key. Setup shows none in its events; do not go looking for one. One exception: when no browser opens, setup prints the setup tab's one-time link to stderr. Give that link to the person to open on this computer, and keep it out of any log or record.
- Never create the Cloudflare grant, the GitHub App, or its installation for the person.
- Never edit the plan's names after the person approved it, or run `--apply` on a plan they have not read.
- On a failure, do not retry with different flags to get past it. Report the failure and the fix the event names. When that fix is a wait or a permission the person gives, tell the person, and when they have done it, run the same command again with the same flags.

## When setup finishes

Install the plugins the site's `.claude/settings.json` offers, one `claude plugin marketplace add` and `claude plugin install` per plugin, and tell the person each one. The [suggested plugins](https://github.com/glw907/cairn-cms/blob/main/docs/admin/suggested-plugins.md) page lists them. Then hand off: to change the site, use `cairn-extending-a-site`, which the site carries.
