---
name: cairn-setting-up-a-site
description: Sets up a new cairn site with `cairn new`. Use when a person asks to create, set up, or start a cairn site, to resume a setup that stopped, or to run setup without a terminal. Not for changing a site that already exists; that is `cairn-extending-a-site`.
---

# Set up a cairn site

`cairn new` creates the site's GitHub repository, its Cloudflare Worker, database, and media bucket, and signs the person in as the owner. The person approves each step in their browser. This skill covers how to run it for them. The flags, events, and exit codes are in `cairn help agents`, and the human-readable version is the [set up with an agent](https://github.com/glw907/cairn-cms/blob/main/docs/admin/set-up-with-an-agent.md) page. Read those instead of guessing.

## Before you run it

1. Run `cairn help agents` and follow it. If `cairn` is not installed, run `npm create cairn-site`, which installs it.
2. Ask the person for the site's name, the owner's email address, and whether the site should decline or invite AI crawlers. Do not choose for them.
3. Check the person has a GitHub account, a Cloudflare account, and Cloudflare's Workers Paid plan. The [before you start](https://github.com/glw907/cairn-cms/blob/main/docs/admin/before-you-start.md) page says what each costs.

## How to run `cairn`

Run `cairn` as one bare command, with no `cd`, redirect, pipe, or `$(...)`. A redirect to a file, a `cd`, or a command substitution such as `$(...)` keeps the whole call sandboxed ([Claude Code sandboxing](https://code.claude.com/docs/en/sandboxing)), and `cairn` must run outside an agent's sandbox, because a sandboxed command's localhost is private and the person's browser can't reach setup's approval tab. Start it with the Bash tool's `run_in_background`, so you can relay each `waiting` sentence to the person while the run blocks.

## Attended: the person is at the keyboard

Plan first, then apply.

1. `cairn new --plan plan.json --name "<name>" --email <email> --posture <decline|invite>` runs the questions and the browser approvals, writes the plan, and creates nothing.
2. Show the person the plan. Give every choice you already know (`--account`, `--zone`, `--host`, `--site-theme`) on the first `--plan` call. For a choice the plan leaves open, the person edits the plan's open fields (`account`, `zone`, `address`), or you run `cairn new --resume <id> --account <a> --zone <z>`. Ask before you decide. Never run `--plan` again or add `--new` to change an answer: that starts a second setup with new approvals and a new GitHub App.
3. `cairn new --apply plan.json` creates the site.

Each `waiting` event carries a `sentence`. Show that sentence to the person as written, and wait. The run blocks until the browser step lands. Never click for them.

## Unattended

An unattended run still needs the person for the GitHub browser approvals. Start it only when the person will be at their browser. To skip the Cloudflare approval, the person puts a Cloudflare API token in the `CAIRN_CF_SETUP_TOKEN` environment variable. Never take it as a flag, and never print it. Setup then uses the token for every Cloudflare call and stores it as the site's deploy key, `--email` is required, and a resume needs the variable again. The [set up with an agent](https://github.com/glw907/cairn-cms/blob/main/docs/admin/set-up-with-an-agent.md) page lists the token's permissions. Write each event's `sentence` where they will see it, and treat a `waiting` event with no reply as a pause, not a failure.

## Read the result

- Events are one JSON object per line on stdout. A stream that ends without a `summary` event is unfinished.
- Exit codes: 0 finished, 1 stopped at a step, 2 interrupted or timed out, 3 usage error (stdout is empty). A `step_failed` event carries four parts: what happened, why, what setup kept, and what to do. Pass the four parts on in order.
- To resume, run `cairn new --resume <id>` (`cairn new status` lists the ids), or `--new` to start a different site.

## Hard rules

- Never print, log, or paste a sign-in link, a token, a code, or a key. Setup shows none in its events; do not go looking for one. One exception: when no browser opens, setup prints the setup tab's one-time link to stderr. Give that link to the person to open on this computer, and keep it out of any log or record.
- Never create the Cloudflare grant, the GitHub App, or its installation for the person.
- Never edit the plan's names after the person approved it, or run `--apply` on a plan they have not read.
- On a failure, do not retry with different flags to get past it. Report the failure and the fix the event names.

## When setup finishes

Install the plugins the site's `.claude/settings.json` offers, one `claude plugin marketplace add` and `claude plugin install` per plugin, and tell the person each one. The [suggested plugins](https://github.com/glw907/cairn-cms/blob/main/docs/admin/suggested-plugins.md) page lists them. Then hand off: to change the site, use `cairn-extending-a-site`, which the site carries.
