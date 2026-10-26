# Using Claude Code with cairn

A developer building an organization's site on cairn's seams may choose Claude Code as their coding assistant, and cairn ships guidance for Claude Code to read while it works on the site. The guidance is a tree of files under `.claude/`, plus a root `CLAUDE.md` that imports the tree's fragment. A developer arrives at this page from one of two situations:

- A site scaffolded by `create-cairn-site` already carries the tree, and the developer wants to know what Claude Code now reads and which skill loads for which task.
- An existing site adopts the tree, or refreshes it after an engine upgrade, and the developer wants to know what `install` writes and what it leaves to them.

The rest of cairn's docs assume you work without a coding assistant, and this page is the one that covers working with Claude Code. The guidance ships in Claude Code's format only, with no `AGENTS.md` and no file for any other coding agent, so a developer who uses another agent has no cairn guidance to read.

The engine stops at the tree. It never edits Claude Code's settings, never rewrites the root `CLAUDE.md`, and never fails a CI build over a stale tree unless you choose that. Two edits are left to you: the `Stop` hook in `.claude/settings.json`, and a CI gate if you want one. `install` exits 0 even when it refuses an entry or fails to write a destination, so what `install` and `check` print is how you learn what they did. The page covers the following:

- What the guidance tree under `.claude/` holds, and the root `CLAUDE.md` that imports it.
- Which of the four packaged skills loads for which task.
- Where the review agent's file sits.
- How to wire the `Stop` hook that runs the site's `check:cairn` script when a Claude Code turn ends, including adding that script on a site without one.
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

Apart from the root `CLAUDE.md` that imports the tree's fragment, the guidance for Claude Code sits entirely under `.claude/`. A scaffolded site is born with all of it installed. Each file sits where Claude Code looks for it: the root `CLAUDE.md` pulls in the fragment with an [`@` import](https://code.claude.com/docs/en/memory) line, and the skills and the review agent sit in `.claude/skills/` and `.claude/agents/`.

The tree holds the following paths:

- `.claude/skills/`, with one directory for each packaged skill.
- `.claude/agents/cairn-extension-reviewer.md`, the review agent. For what the agent checks, see [What ships under `claude/`](../reference/guidance.md#what-ships-under-claude) in the `cairn-guidance` reference.
- `.claude/cairn/CLAUDE.md`, the fragment of cairn's guidance that the root `CLAUDE.md` imports.
- `.claude/cairn/VERSION`, the version stamp.
- `.claude/cairn/MANIFEST`, the list of installed paths.
- `CLAUDE.md` at the project root.

The root `CLAUDE.md` is the one import line, then a `# Your site` section for the site's guidance. The site's guidance for Claude Code belongs under `# Your site`, because the root file is the site's and the fragment under `.claude/cairn/` is the package's to refresh.

On a scaffolded site, `VERSION` holds the engine dependency spec with its caret stripped. The scaffold resolved that spec when its template was built, and the stamp isn't a version read from `node_modules`. For the stamp `install` writes, see [`install`](../reference/guidance.md#install) in the `cairn-guidance` reference.

The skills are the part of the tree that acts on the task you ask for.

### Skills by task

Each of the four packaged skills carries a [description](https://code.claude.com/docs/en/skills) that says when to load it, so the skill that loads depends on what you ask for. The following table pairs each skill with the task it loads for.

| Skill | Loads for |
| --- | --- |
| `cairn-admin-screens` | Building or reviewing a screen inside `/admin`. |
| `cairn-consult` | Writing a consultation brief after you work around an engine behavior twice, or want something the seams don't reach. |
| `cairn-extend` | Changing anything that touches `/admin`, a form action, logging, or an engine seam. |
| `cairn-public` | Restyling or extending the public side of the site. |

`cairn-public` also carries one catalogue page for each public piece cairn ships, under its `references/` directory. The protocol a `cairn-consult` consultation brief follows lives inside the skill, and this page doesn't teach it. For what each skill teaches, see [The four skills](../reference/guidance.md#the-four-skills) in the `cairn-guidance` reference.

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

`install` never deletes. A path an earlier `MANIFEST` listed that the package no longer ships is printed as removable, and removing it is left to you.

`install` exits 0 even when it refuses an entry or fails to write a destination, and it prints each case to stderr. A script that must detect a partial install therefore reads stderr. When `install` stops with an error and exits nonzero, see [Diagnose an install or check failure](#diagnose-an-install-or-check-failure).

[The steps in Upgrade cairn](../extend/upgrade-cairn.md#steps) include the refresh and say when to run it.

With the tree in place, the one Claude Code setting it needs is yours to add.

## Wire the Stop hook

The `Stop` hook runs `npm run check:cairn --if-present` [when a Claude Code turn ends](https://code.claude.com/docs/en/hooks#stop). You add it to `.claude/settings.json` yourself, because `install` never writes that file. The package ships the hook as a snippet, `claude/snippets/settings-hook.json`, for you to paste in deliberately.

A hook would give the package's code unattended execution inside a Claude Code session, so the engine leaves that one edit to you. [The trust boundary](../reference/guidance.md#the-trust-boundary) in the `cairn-guidance` reference records the reasoning.

The snippet holds the whole hook block, ready to merge into `.claude/settings.json`:

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

The hook runs the script under `--if-present`, so on a site without a `check:cairn` script it runs nothing and reports nothing. For the flag's behavior, see [`--if-present`](https://docs.npmjs.com/cli/v11/commands/npm-run#if-present) in npm's `npm run` reference.

The `check:cairn` script runs the admin stylesheet build, then `cairn-audit` over its whole static registry. Public-scope findings print as advisories and never change the exit code. The run needs the `daisyui` and `tailwindcss` peers installed, and a missing one fails the run by name. [Diagnose an install or check failure](#diagnose-an-install-or-check-failure) covers that failure. For reading the audit's report, see [Run the static pass](../extend/run-cairn-audit-on-your-site.md#run-the-static-pass).

The scaffold's CI workflow also checks the guidance tree, and how strictly it checks is a second choice.

## Make the CI step gate on a stale tree

The scaffold's workflow reports a stale or missing guidance tree in its job log without failing the build. Making it fail the build is a choice you make in `.github/workflows/check.yml`. The workflow's guidance step runs `npx cairn-guidance check` without `--strict`, under `continue-on-error: true`. Gating the build takes both `--strict` and removing the `continue-on-error` line.

To make the step gate, follow these steps:

1. If the site has no `.github/workflows/check.yml`, create it from the package's `check.yml` snippet.

   The snippet carries the same guidance step as the scaffold's workflow. It reads as follows, with the comment above the guidance step left out:

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

The choice turns on the exit codes. Once its arguments parse, `check` exits 0 whatever the report says, and `--strict` exits 1 only when the guidance tree is stale or missing. The scaffold's workflow ends on this step:

```yaml
- run: npx cairn-guidance check
  continue-on-error: true
```

2. In `.github/workflows/check.yml`, change the guidance step to run `npx cairn-guidance check --strict` with no `continue-on-error: true` line.

`--strict` sets the step's exit code, and GitHub's `continue-on-error` setting decides whether a failing step fails the job. [`continue-on-error`](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepscontinue-on-error) in GitHub's workflow syntax reference defines the setting.

Removing `continue-on-error: true` also widens what fails the build. The setting passes the job on any nonzero exit of the step. Without it, any nonzero exit fails the build, not only the `--strict` exit on a stale or missing tree.

Whichever you choose, [Verify the guidance setup](#verify-the-guidance-setup) checks the setup locally first, then in CI if you gated it.

## Verify the guidance setup

A healthy setup reports the tree fresh and every other line satisfied, and `check --strict` exits 0.

To verify the setup, follow these steps:

1. In the project root, run `npx cairn-guidance check`.

   The check prints seven report lines, and its exit code follows these rules:

   - Once its arguments parse, it exits 0, whatever the report says.
   - Under `--strict`, it exits 1 only when the guidance tree is stale or missing.
   - For an unknown command or flag, it prints the usage to stderr and exits 2.

   A run that ends in an uncaught error exits nonzero with a code the list doesn't give.

   One line reports whether the root `CLAUDE.md` carries the import line. The Tailwind line judges whether `.claude/` is excluded from the site's Tailwind build in a fixed order:

   1. A `.gitignore` line that ignores `.claude` counts as excluded before any stylesheet is read.
   2. Otherwise, the check reads `src/admin.css`, then the `admin.css` under `src/theme/`, and the first of them that contains `@source` or `source(none)` decides.
   3. That file reads as excluded when it holds the literal `@source not "./.claude";` line or `source(none)` anywhere.
   4. When neither file carries either, the line reports unknown and names the paths it checked.

   The freshness line ignores the `VERSION` stamp, so a tree that differs only there reads fresh. For every line `check` prints, see [`check`](../reference/guidance.md#check) in the `cairn-guidance` reference.

2. In the same shell, run `npx cairn-guidance check --strict; echo $?` to print the strict run's exit code.

   A healthy setup prints 0.

3. In a Claude Code session in the site's root, end a turn.

   The `Stop` hook runs `check:cairn` as the turn ends, and its output is the audit's report. For where that output appears, see [Claude Code's hooks reference](https://code.claude.com/docs/en/hooks).

4. If you gated CI, push a commit from the project root.

   In the `check` job's log, the guidance check's first report line says whether the tree is fresh.

When a line reports a problem, [Diagnose an install or check failure](#diagnose-an-install-or-check-failure) maps it to its fix.

## Diagnose an install or check failure

The setup's failures surface in four places:

- `install` reports a partial run on stderr, or stops with a nonzero exit.
- `check` reports each problem on a separate line.
- The hook's `check:cairn` run names a missing peer, or prints nothing.
- A gated CI job fails at the guidance step, on a stale tree or on any other nonzero exit.

The following tables match each symptom to its cause and its fix.

The following table covers what `install` prints and how it stops.

| Symptom | Cause | Fix |
| --- | --- | --- |
| `install` prints a `refused <path>` line on stderr and still exits 0. | The path is one `install` won't write. The run refuses it by name and continues. | See [`install`](../reference/guidance.md#install) in the `cairn-guidance` reference. |
| `install` prints a `write error <path>: <code>` line on stderr and still exits 0. | A disk or permissions error stopped the write, not a containment refusal. The printed line names its errno code, such as `ENOSPC` or `EACCES`. | See [`install`](../reference/guidance.md#install) in the `cairn-guidance` reference. |
| `install` stops with an error instead of finishing, and exits nonzero. | The run hit a filesystem failure it can't step past, such as a failure creating a directory, writing the `MANIFEST`, or reading a destination that already exists. Unlike a refusal or a write error, this failure ends the run. | See [`install`](../reference/guidance.md#install) in the `cairn-guidance` reference. |

`install` refuses a path in the following cases, and none of them changes the exit code:

- A component of the path, or the destination itself, is a symlink.
- A component exists as something other than a directory, such as a regular file.
- The destination exists as something other than a regular file, such as a directory.
- The destination falls outside `.claude`.
- A `<path>.orig` recovery copy could not be made, which refuses the destination beside it too.
- The `.claude/cairn/MANIFEST` path is itself refused, so no `MANIFEST` is written.

The following table covers the `Stop` hook's `check:cairn` run.

| Symptom | Cause | Fix |
| --- | --- | --- |
| The hook's `check:cairn` run stops and names a missing `daisyui` or `tailwindcss` peer. | The named peer isn't installed in the site. | Install the named peer with the command the message gives, as [Run cairn-audit on your site](../extend/run-cairn-audit-on-your-site.md#diagnose-a-run-that-exits-2) describes. |
| The turn ends and no `check:cairn` output appears. | `package.json` has no `check:cairn` script, so `--if-present` skips the run. Or the `Stop` entry is missing from the hooks in `.claude/settings.json`. | Merge in the script entries that [Wire the Stop hook](#wire-the-stop-hook) shows. If the script is there, compare the `Stop` entry in `.claude/settings.json` with the snippet in that section, then end another turn. |

The following table covers a gated `check` job that fails at the guidance step.

| Symptom | Cause | Fix |
| --- | --- | --- |
| The guidance check's first line in the job log reports the tree stale or missing. | The committed tree is stale or missing. Under `--strict`, the check exits 1 on exactly that, and with `continue-on-error` removed, that exit fails the job. | Run the install step in [Adopt or refresh the guidance tree](#adopt-or-refresh-the-guidance-tree), commit the refreshed `.claude/` tree, and push again. |
| The guidance check's first line doesn't report the tree stale or missing, or the step prints no report lines at all. | The step exited nonzero for another reason, such as exit 2 for an unknown flag or a file read that failed and ended the run. Without `continue-on-error`, any nonzero exit of the step fails the job. That is the trade [Make the CI step gate on a stale tree](#make-the-ci-step-gate-on-a-stale-tree) describes. | Read the guidance step's output in the job log, and compare it with what the [`check`](../reference/guidance.md#check) reference says the command reports. To keep the build passing while you work on it, put the `continue-on-error: true` line back under the step, then push again. The build then no longer fails on a stale tree either, until you remove the line again. |

The following table covers the lines `check` reports and the errors that stop it. For every line, see [`check`](../reference/guidance.md#check) in the `cairn-guidance` reference.

| Symptom | Cause | Fix |
| --- | --- | --- |
| The first line reports the guidance tree stale or missing. | The installed tree differs from the tree the installed package ships, apart from the `VERSION` stamp, or no tree is installed. | In the project root, run `npx cairn-guidance install`. |
| The second line reports the root `CLAUDE.md` missing the import line. | The root `CLAUDE.md` lacks the `@.claude/cairn/CLAUDE.md` line. `install` never rewrites the root file, so it never adds the line. | Add `@.claude/cairn/CLAUDE.md` as the root `CLAUDE.md`'s first line, creating the file in the project root if the site has none. |
| A line reports a missing `check:cairn` script, `cairn-audit` config file, or `.github/workflows/check.yml`. | The site lacks the named script or file. `install` writes under `.claude/` alone, so it writes none of them. | Paste the snippet `check` prints under that line, as [`check`](../reference/guidance.md#check) in the `cairn-guidance` reference describes. |
| The seventh line names a `.orig` file still present. | An earlier `install` made a `<path>.orig` recovery copy beside a destination before overwriting it, and the copy is still there. | See [`install`](../reference/guidance.md#install) in the `cairn-guidance` reference. |
| The Tailwind line reports `.claude/` not excluded from the site's Tailwind build, or reports unknown and names the paths it checked. | No `.gitignore` line ignores `.claude`, and the first of `src/admin.css` and the `admin.css` under `src/theme/` that carries `@source` or `source(none)` holds neither the `@source not "./.claude";` line nor `source(none)`. The line reports unknown when neither stylesheet carries `@source` or `source(none)`. | See [The `.claude/` exclusion from the Tailwind build](../reference/guidance.md#the-claude-exclusion-from-the-tailwind-build) in the `cairn-guidance` reference. |
| `npx cairn-guidance check`, with or without `--strict`, stops with an error instead of finishing, and exits nonzero. | A file read failed for a reason other than a missing file, or a read would have left the project directory. Either ends the run. | See [`check`](../reference/guidance.md#check) in the `cairn-guidance` reference. |

## See also

The following pages explain the scaffolded tree around the guidance and cover the work this page leaves out:

- [Scaffolded site files](../extend/scaffolded-site-files.md) describes the scaffolded files outside `.claude/`.
- [Run cairn-audit on your site](../extend/run-cairn-audit-on-your-site.md) covers running the audit and reading its findings.
- [Upgrade cairn](../extend/upgrade-cairn.md) covers the upgrade procedure and when to refresh the tree.
- [The `cairn-guidance` CLI](../reference/guidance.md) lists its options and output and records its trust boundary.
