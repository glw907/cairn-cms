# Using Claude Code with cairn

A developer building an organization's site on cairn's seams may choose Claude Code as their coding assistant, and cairn ships guidance for Claude Code to read while it works on the site. The guidance is a tree of files under `.claude/`, plus a root [`CLAUDE.md`](https://code.claude.com/docs/en/memory) that imports the tree's fragment. You arrive at this page from one of two situations:

- A site scaffolded by `create-cairn-site` already carries the tree, and you want to know what Claude Code reads and which [skill](https://code.claude.com/docs/en/skills) loads for each task.
- Your existing site adopts the tree, or refreshes it after an engine upgrade. You want to know what `install` writes and what it leaves to you.

The other cairn docs assume you work without a coding assistant. What's specific to Claude Code lives in this section of the docs. The guidance ships in Claude Code's format only, with no `AGENTS.md` and no file for any other coding agent, so a developer who uses another agent has no cairn guidance to read.

The engine stops at the tree. It never edits Claude Code's settings, never rewrites the root `CLAUDE.md`, and never fails a CI build over a stale tree unless you choose that. The page's steps and its diagnosis rows leave the following edits to you, each one yours to make or decline:

- On a site that adopts the tree, the import line in the root `CLAUDE.md`.
- Excluding `.claude/` from the site's Tailwind build, when that build would scan `.claude/`. `check` reports such a build as not excluded or unknown.
- Reading and deleting each `.orig` file that `install` reports.
- Removing a path that `install` reports the package no longer ships.
- Committing the `.claude/` tree and the root `CLAUDE.md`.
- The [`Stop` hook](https://code.claude.com/docs/en/hooks) in [`.claude/settings.json`](https://code.claude.com/docs/en/settings).
- On a site that lacks them, the `check:cairn` script and the CI workflow.
- The `cairn-audit` config file, when `check` reports it missing.
- A CI gate on a stale tree, if you want one.

What `install` and `check` print is how you learn what they did. The page covers the following:

- What the guidance tree under `.claude/` holds, and the root `CLAUDE.md` that imports it.
- Which of the four packaged skills loads for which task.
- Where the review agent's file sits.
- How to wire the `Stop` hook that runs `check:cairn` when a Claude Code turn ends, and add that script where it's missing.
- How to adopt, refresh, and check the tree with `cairn-guidance install` and `cairn-guidance check`, and how to read their exit codes.
- What `check` reports when a site lacks the scaffold's gate wiring.
- How to make the scaffold's CI step gate on a stale tree, including starting the workflow on a site without one.

The page assumes a running cairn site with the engine installed, familiarity with package scripts and GitHub Actions workflow files, and working knowledge of Claude Code itself. That knowledge covers starting a session in a project, what a [skill](https://code.claude.com/docs/en/skills) and a [subagent](https://code.claude.com/docs/en/sub-agents) are, and where a project's [`.claude/settings.json`](https://code.claude.com/docs/en/settings) lives. No knowledge of the engine's internals is needed. The page leaves the following to other pages:

- For the scaffolded files outside `.claude/`, one by one, see [Scaffolded site files](../extend/scaffolded-site-files.md).
- For running the audit and reading its findings, see [Run cairn-audit on your site](../extend/run-cairn-audit-on-your-site.md).
- For the upgrade procedure and when to refresh the tree, see [Upgrade cairn](../extend/upgrade-cairn.md).
- For what the review agent checks, see [What ships under `claude/`](../reference/guidance.md#what-ships-under-claude).
- For the full option and output listing of `cairn-guidance`, and its trust boundary, see [The `cairn-guidance` CLI](../reference/guidance.md).
- For the protocol of a consultation brief, see the `cairn-consult` skill itself.

## Before you begin

Working through this page takes a cairn site with the engine installed, and Claude Code able to start a session in the site's root. The following pages set each one up:

- For a site scaffolded by `create-cairn-site`, see [The scaffold](../extend/scaffolded-site-files.md#the-scaffold).
- For a site built by hand, see [Add cairn to a SvelteKit app](../extend/add-cairn-to-a-sveltekit-app.md).
- For Claude Code, see [Install Claude Code](https://code.claude.com/docs/en/setup#install-claude-code).

With both in place, [The guidance tree](#the-guidance-tree) describes what cairn puts under `.claude/`.

## The guidance tree

Apart from the root `CLAUDE.md` that imports the tree's fragment, the guidance for Claude Code sits entirely under `.claude/`. A scaffolded site starts with all of it installed. The skills and the review agent sit where Claude Code discovers them. The rest of the tree sits in `.claude/cairn/`, and the root `CLAUDE.md` pulls in the fragment from there with an [`@` import](https://code.claude.com/docs/en/memory) line.

cairn's guidance sits at the following paths:

- `.claude/skills/`, with one directory for each packaged skill.
- `.claude/agents/cairn-extension-reviewer.md`, the review agent, a Claude Code subagent. For what the agent checks, see [What ships under `claude/`](../reference/guidance.md#what-ships-under-claude) in the `cairn-guidance` reference.
- `.claude/cairn/CLAUDE.md`, the fragment of cairn's guidance that the root `CLAUDE.md` imports.
- `.claude/cairn/VERSION`, the version stamp.
- `.claude/cairn/MANIFEST`, the list of installed paths.
- `CLAUDE.md` at the project root.

On a scaffolded site, the root `CLAUDE.md` is the one import line, then a `# Your site` section for the site's guidance. `install` rewrites the fragment under `.claude/cairn/` when it refreshes the tree, and it never rewrites the root file. The site's guidance for Claude Code therefore belongs in the root file, under `# Your site` on a scaffolded site.

On a scaffolded site, `VERSION` holds the engine dependency spec with its caret stripped, fixed when the scaffold's template was built rather than read from `node_modules`. For the stamp `install` writes, see [`install`](../reference/guidance.md#install) in the `cairn-guidance` reference.

Of the files in the tree, the skills are the ones Claude Code loads by task.

### Skills by task

Each of the four packaged skills carries a [description](https://code.claude.com/docs/en/skills) that says when to load it, so the skill that loads depends on what you ask for. The following table pairs each skill with the task it loads for.

| Skill | Loads for |
| --- | --- |
| `cairn-admin-screens` | Building or reviewing a screen inside `/admin`. |
| `cairn-consult` | Writing a consultation brief after you work around an engine behavior twice, or want something the seams don't reach. |
| `cairn-extend` | Changing anything that touches `/admin`, a form action, logging, or an engine seam. |
| `cairn-public` | Restyling or extending the public side of the site. |

`cairn-public` also carries one catalogue page for each public piece cairn ships, under its `references/` directory. A `cairn-consult` consultation brief follows the protocol inside the skill. For what each skill teaches, see [The four skills](../reference/guidance.md#the-four-skills) in the `cairn-guidance` reference.

A site without the tree, or one whose engine was upgraded, installs or refreshes it next.

## Adopt or refresh the guidance tree

`cairn-guidance install` writes the guidance tree into an existing site and refreshes it after an engine upgrade. A scaffolded site skips this section until its first upgrade.

To adopt or refresh the tree, follow these steps:

1. In the project root, run `npx cairn-guidance install`.
2. If the root `CLAUDE.md` lacks the import line, add the following as its first line:

   ```text
   @.claude/cairn/CLAUDE.md
   ```

   `install` writes the fragment to `.claude/cairn/CLAUDE.md` and never rewrites the root `CLAUDE.md`, so the import line is yours to add. On a site with no root `CLAUDE.md`, create the file in the project root with that line.

3. If the site builds CSS with Tailwind v4 using automatic source detection, and its `.gitignore` doesn't ignore `.claude/`, exclude `.claude/` from that build. In each stylesheet that imports Tailwind with automatic source detection, add an `@source not` line whose path leads from that stylesheet to the project root's `.claude/`. In a stylesheet in `src/`, the line reads as follows:

   ```css
   @source not "../.claude";
   ```

   Tailwind resolves the path against the stylesheet that carries it, and the directive needs Tailwind 4.1 or later. A scaffolded site already carries the exclusion. For why the build must skip `.claude/`, see [The `.claude/` exclusion from the Tailwind build](../reference/guidance.md#the-claude-exclusion-from-the-tailwind-build) in the `cairn-guidance` reference.

4. Read each `.orig` file that `install` reported, keep any edit you need, then delete it. If `install` printed a path as removable, delete that path.

5. In the project root, commit the `.claude/` tree, the root `CLAUDE.md`, and any stylesheet you changed.

`install` never deletes. A path an earlier `MANIFEST` listed that the package no longer ships is printed as removable, and removing it is left to you, as the steps above say.

`install` exits 0 even when it refuses an entry or fails to write a destination, and it prints each case to stderr. A script that must detect a partial install therefore reads stderr. When `install` stops with an error and exits nonzero, see [Diagnose an install or check failure](#diagnose-an-install-or-check-failure).

[The steps in Upgrade cairn](../extend/upgrade-cairn.md#steps) include the refresh and say when to run it.

With the tree in place, the `Stop` hook is the one Claude Code setting left to you.

## Wire the Stop hook

The `Stop` hook runs `npm run check:cairn --if-present` [when a Claude Code turn ends](https://code.claude.com/docs/en/hooks#stop). It lives in `.claude/settings.json`, a file `install` never writes. Because a hook would give the package's code unattended execution inside a Claude Code session, the engine leaves that edit to you. [The trust boundary](../reference/guidance.md#the-trust-boundary) in the `cairn-guidance` reference records the reasoning.

The package ships the whole hook block as `claude/snippets/settings-hook.json`, ready to merge into `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "npm run check:cairn --if-present"
          }
        ]
      }
    ]
  }
}
```

To wire the hook, follow these steps:

1. In `.claude/settings.json`, merge in the `Stop` entry from the snippet.
2. In `package.json`, confirm that the scripts include a `check:cairn` entry.

   If none does, merge in the following script entries, which the package ships for a site without them:

   ```json
   {
     "build:admin-css": "npx --no-install @tailwindcss/cli -i src/admin.css -o .cairn/admin.css",
     "precheck": "npm run build:admin-css",
     "prebuild": "npm run build:admin-css",
     "predev": "npm run build:admin-css",
     "dev:admin-css": "npx --no-install @tailwindcss/cli -i src/admin.css -o .cairn/admin.css --watch",
     "check:cairn": "npm run build:admin-css && cairn-audit",
     "check:cairn:rendered": "cairn-audit --rendered"
   }
   ```

   A scaffolded site already carries them.

   > **Caution:** Merging the entries replaces any existing `precheck`, `prebuild`, or `predev` script. If the site already has one, chain its command after `npm run build:admin-css &&` instead of replacing it. The entries compile `src/admin.css` with `@tailwindcss/cli`, so have both in place before you merge them.

The hook runs the script under `--if-present`, so on a site without a `check:cairn` script it runs nothing and reports nothing. For the flag's behavior, see [`--if-present`](https://docs.npmjs.com/cli/v11/commands/npm-run#if-present) in npm's `npm run` reference.

The `check:cairn` script runs the admin stylesheet build, then `cairn-audit` over its whole static registry. Public-scope findings print as advisories and never change the exit code. The run needs the `daisyui` and `tailwindcss` peers installed, and a missing one fails the run by name. [Diagnose an install or check failure](#diagnose-an-install-or-check-failure) covers that failure. For reading the audit's report, see [Run the static pass](../extend/run-cairn-audit-on-your-site.md#run-the-static-pass).

The scaffold's CI workflow also checks the guidance tree, and how strictly it checks is a second choice.

## Make the CI step gate on a stale tree

The scaffold's workflow reports a stale or missing guidance tree in its job log without failing the build. Making it fail the build is a choice you make in `.github/workflows/check.yml`. The workflow's guidance step runs `npx cairn-guidance check` without `--strict`, under `continue-on-error: true`. Once its arguments parse, `check` exits 0 whatever the report says, and `--strict` exits 1 only when the guidance tree is stale or missing. Gating the build therefore takes both `--strict` and removing the `continue-on-error` line.

To make the step gate, follow these steps:

1. If the site has no `.github/workflows/check.yml`, create it from the package's `check.yml` snippet.

   The snippet carries the same guidance step as the scaffold's workflow. It reads as follows, with the comment above the guidance step left out. The comments that remain describe the scaffold.

   ```yaml
   name: check

   on:
     push:
     pull_request:

   jobs:
     check:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v7
         - uses: actions/setup-node@v7
           with:
             # The scaffold ships neither .nvmrc nor an engines field, so this pins the version
             # directly rather than reading it from the tree it checks out.
             node-version: 24
         # The scaffold ships no lockfile (the bake deletes it), so this installs from
         # package.json rather than npm ci.
         - run: npm install
         # svelte-check's precheck compiles the admin stylesheet before type-checking.
         - run: npm run check
         - run: npm run check:cairn
         - run: npx cairn-guidance check
           continue-on-error: true
   ```

   For every file the package ships under `claude/`, see [What ships under `claude/`](../reference/guidance.md#what-ships-under-claude) in the `cairn-guidance` reference.

2. In `.github/workflows/check.yml`, replace the guidance step that the workflow ends on with the following:

   ```yaml
   - run: npx cairn-guidance check --strict
   ```

   The scaffold ships that step as follows:

   ```yaml
   - run: npx cairn-guidance check
     continue-on-error: true
   ```

`--strict` changes only the step's exit code. Whether a failing step then fails the job is up to GitHub's `continue-on-error` setting. For the setting, see [`continue-on-error`](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepscontinue-on-error) in GitHub's workflow syntax reference.

Removing `continue-on-error: true` also widens what fails the build. The setting passes the job on any nonzero exit of the step. Without it, any nonzero exit fails the build, not only the `--strict` exit on a stale or missing tree.

Whichever you choose, [Verify the guidance setup](#verify-the-guidance-setup) checks the setup locally first, then in CI if you gated it.

## Verify the guidance setup

A healthy setup reports the tree fresh and every other line satisfied, apart from any wiring you chose to leave out, and `check --strict` exits 0.

To verify the setup, follow these steps:

1. In the project root, run `npx cairn-guidance check`.

   The check prints seven report lines. Under `--strict`, it exits 1 only when the guidance tree is stale or missing. For an unknown command or flag, it prints the usage to stderr and exits 2. A run that ends in an uncaught error exits nonzero with a code this page doesn't give.

   One line reports whether the root `CLAUDE.md` carries the import line. The freshness line ignores the `VERSION` stamp, so a tree that differs only there reads fresh. For every line `check` prints, see [`check`](../reference/guidance.md#check) in the `cairn-guidance` reference.

2. In the same shell, run `npx cairn-guidance check --strict; echo $?` to print the strict run's exit code.

   A healthy setup prints 0.

3. In a Claude Code session in the site's root, end a turn.

   The `Stop` hook runs `check:cairn` as the turn ends, and its output is the admin stylesheet build's log followed by the audit's report. For where that output appears, see [Claude Code's hooks reference](https://code.claude.com/docs/en/hooks).

4. If you gated CI, push a commit from the project root.

   In the `check` job's log, the guidance check's first report line says whether the tree is fresh.

When a line reports a problem, [Diagnose an install or check failure](#diagnose-an-install-or-check-failure) maps it to its fix.

## Diagnose an install or check failure

The setup's failures surface in four places:

- `install` reports a partial run on stderr, or stops with a nonzero exit.
- The hook's `check:cairn` run names a missing peer, or prints nothing.
- A gated CI job fails at the guidance step, on a stale tree or on any other nonzero exit.
- `check` reports each problem on a separate line.

`install` refuses a path in the following cases, and none of them changes the exit code:

- A component of the path, or the destination itself, is a symlink.
- A component exists as something other than a directory, such as a regular file.
- The destination exists as something other than a regular file, such as a directory.
- The destination falls outside `.claude`.
- A `<path>.orig` recovery copy could not be made, which refuses the destination beside it too.
- The `.claude/cairn/MANIFEST` path is itself refused, so no `MANIFEST` is written.

The following table covers what `install` prints and how it stops.

| Symptom | Cause | Fix |
| --- | --- | --- |
| `install` prints a `refused <path>` or `refused packaged entry <path>` line on stderr and still exits 0. | A `refused <path>` line names a path in one of the refusal cases. A `refused packaged entry` line names an entry the installed package ships that isn't a regular file. The run refuses each path by name and continues. | See [`install`](../reference/guidance.md#install) in the `cairn-guidance` reference. |
| `install` prints a `write error <path>: <code>` line on stderr and still exits 0. | A disk or permissions error stopped the write, not a containment refusal. The printed line names its errno code, such as `ENOSPC` or `EACCES`. | See [`install`](../reference/guidance.md#install) in the `cairn-guidance` reference. |
| `install` stops with an error instead of finishing, and exits nonzero. | The run hit a failure it can't continue past. Examples are a failure creating a directory, writing the `MANIFEST`, reading an existing destination, or resolving or reading the installed package's guidance. Unlike a refusal or a write error, this failure ends the run. | See [`install`](../reference/guidance.md#install) in the `cairn-guidance` reference. |

The following table covers the `Stop` hook's `check:cairn` run.

| Symptom | Cause | Fix |
| --- | --- | --- |
| The hook's `check:cairn` run stops and names a missing `daisyui` or `tailwindcss` peer. | The named peer isn't installed in the site. | Install the named peer with the command the message gives, as [Run cairn-audit on your site](../extend/run-cairn-audit-on-your-site.md#diagnose-a-run-that-exits-2) describes. |
| The turn ends and no `check:cairn` output appears. | `package.json` has no `check:cairn` script, so `--if-present` skips the run. Or the `Stop` entry is missing from the hooks in `.claude/settings.json`. | Merge in the script entries that [Wire the Stop hook](#wire-the-stop-hook) shows. If the script is there, compare the `Stop` entry in `.claude/settings.json` with the snippet in that section, then end another turn. |

The following table covers a gated `check` job that fails at the guidance step.

| Symptom | Cause | Fix |
| --- | --- | --- |
| The guidance check's first line in the job log reports the tree stale or missing. | The committed tree is stale or missing. Under `--strict`, the check exits 1 on exactly that, and with `continue-on-error` removed, that exit fails the job. | Run the install step in [Adopt or refresh the guidance tree](#adopt-or-refresh-the-guidance-tree), commit the refreshed `.claude/` tree, and push again. |
| The guidance check's first line doesn't report the tree stale or missing, or the step prints no report lines at all. | The step exited nonzero for another reason, such as exit 2 for an unknown flag or a file read that failed and ended the run. Without `continue-on-error`, any nonzero exit of the step fails the job. [Make the CI step gate on a stale tree](#make-the-ci-step-gate-on-a-stale-tree) describes this wider failure. | Read the guidance step's output in the job log, and compare it with what the [`check`](../reference/guidance.md#check) reference says the command reports. To keep the build passing while you work on it, put the `continue-on-error: true` line back under the step, then push again. The build then no longer fails on a stale tree either, until you remove the line again. |

The following table covers the lines `check` reports and the errors that stop it. For every line, see [`check`](../reference/guidance.md#check) in the `cairn-guidance` reference.

| Symptom | Cause | Fix |
| --- | --- | --- |
| The freshness line reports the guidance tree stale or missing. | The installed tree differs from the tree the installed package ships, apart from the `VERSION` stamp, or no tree is installed. | In the project root, run `npx cairn-guidance install`. |
| A line reports the root `CLAUDE.md` missing the import line. | The root `CLAUDE.md` lacks the `@.claude/cairn/CLAUDE.md` line. `install` never rewrites the root file, so it never adds the line. | Add `@.claude/cairn/CLAUDE.md` as the root `CLAUDE.md`'s first line, creating the file in the project root if the site has none. |
| A line reports a missing `check:cairn` script, `cairn-audit` config file, or `.github/workflows/check.yml`. | The site lacks the named script or file. `install` writes under `.claude/` alone, so it writes none of them. | Paste the snippet `check` prints under that line, as [`check`](../reference/guidance.md#check) in the `cairn-guidance` reference describes. |
| A line names a `.orig` file still present. | An earlier `install` made a `<path>.orig` recovery copy beside a destination before overwriting it, and the copy is still there. | Read the `.orig` file, keep any edit you need, then delete it. See [`install`](../reference/guidance.md#install) in the `cairn-guidance` reference. |
| The Tailwind line reports `.claude/` not excluded from the site's Tailwind build, or reports unknown and names the paths it checked. | No `.gitignore` line ignores `.claude`. The first of `src/admin.css` and the `admin.css` under `src/theme/` that carries `@source` or `source(none)` holds neither the literal `@source not "./.claude";` line nor `source(none)`. The line reports unknown when neither stylesheet carries `@source` or `source(none)`. `check` reads no other stylesheet and accepts no other `@source not` path, so it can report a correct exclusion written another way or in another stylesheet. | If the site's Tailwind build scans `.claude/`, add the exclusion as the Tailwind step in [Adopt or refresh the guidance tree](#adopt-or-refresh-the-guidance-tree) describes. If the site already carries an `@source not` line, confirm that its path resolves from its stylesheet to the project root's `.claude/`. See [The `.claude/` exclusion from the Tailwind build](../reference/guidance.md#the-claude-exclusion-from-the-tailwind-build) in the `cairn-guidance` reference. |
| `npx cairn-guidance check`, with or without `--strict`, stops with an error instead of finishing, and exits nonzero. | A file read failed for a reason other than a missing file, or a read would have left the project directory. Or the installed package's guidance couldn't be resolved or read. Each ends the run. | See [`check`](../reference/guidance.md#check) in the `cairn-guidance` reference. |

## See also

The following pages explain the scaffolded tree around the guidance and cover the work this page leaves out:

- [Scaffolded site files](../extend/scaffolded-site-files.md) describes the scaffolded files outside `.claude/`.
- [Run cairn-audit on your site](../extend/run-cairn-audit-on-your-site.md) covers running the audit and reading its findings.
- [Upgrade cairn](../extend/upgrade-cairn.md) covers the upgrade procedure and when to refresh the tree.
- [The `cairn-guidance` CLI](../reference/guidance.md) lists its options and output and records its trust boundary.
