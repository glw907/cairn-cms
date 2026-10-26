---
page: Using Claude Code with cairn
type: task guide
exemplar: operators/gh-exit-codes
---

# Using Claude Code with cairn

:::reader
**Who reads it.** The page has no register track, so its reader is the extend track's profile, per
the outline's `job`: a Svelte-fluent web developer building an organization's site on cairn's
seams, who has chosen Claude Code as their coding assistant. Two arrivals:

1. **The scaffolded-site developer.** The site already carries the guidance tree, and the
   reader wants to know what Claude Code now reads and which skill fires for which task.
2. **The adopting or refreshing developer.** The reader adopts the tree on an existing site,
   or refreshes it after an engine upgrade, and needs to know what `install` writes and what
   it leaves to them.

A developer using another coding agent arrives in the wrong place: cairn ships no guidance
for that agent (`f:pmmtrm`), and the introduction says so in one line.

**Background.** cairn's guidance for Claude Code is a tree of files under `.claude/` that a scaffolded site is born with and that `cairn-guidance install` writes on any other site, and the engine stops at that tree: it never edits Claude Code's settings, never rewrites the site's root `CLAUDE.md`, and never makes CI fail on a stale tree unless the developer chooses that. A developer who works with Claude Code therefore needs three things from this page: what the tree holds and which skill loads for which task, the two deliberate edits the engine leaves to them (the `Stop` hook and, if they want it, a CI gate), and how `cairn-guidance install` and `cairn-guidance check` report what they did, since `install` exits 0 even when it refuses an entry or a destination write fails. :fact[0ygumq] :fact[4nccq6] :fact[6ro1n9] :fact[jd54ph] :fact[5ohm23]

**What the page does for them.** How to work on a cairn site with Claude Code: the guidance tree cairn installs under
`.claude/` and the root `CLAUDE.md` that imports it, which of the four packaged skills loads
for which task, where the review agent sits (its file, with a link to the reference for what
it checks), how to wire the `Stop` hook that runs the site's `check:cairn` script when a
Claude Code turn ends (adding that script on a site without one), and how to adopt, refresh,
and check the tree with `cairn-guidance install` and `cairn-guidance check`, including their
exit codes, what `check` reports when a site lacks the scaffold's gate wiring, and the
scaffold's CI step and how to make it gate (starting the workflow on a site without one). The
reader is the extend track's developer (a Svelte-fluent web developer
building an organization's site on cairn's seams) who has chosen Claude Code as their coding
assistant. Two arrivals are named: a developer whose scaffolded site already carries the tree
and wants to know what Claude Code now reads, and a developer adopting the tree on an
existing site or refreshing it after an upgrade. The framing states that the rest of the
docs assume no coding assistant and that this page is the one that teaches working with
Claude Code, and that cairn ships its guidance in Claude Code's format only, with no
`AGENTS.md` and no file for any other coding agent, so a developer using another agent has
no cairn guidance to read (one line, f:pmmtrm). :fact[pmmtrm]
The sections run in the order the reader meets the guidance: what the tree holds, the install that writes it, the two edits the engine leaves to the developer, then the verification of all of them and the failures it surfaces. See also closes the page.

**What they already know.** A running cairn site with the engine installed, and working knowledge of Claude Code itself:
starting a session in a project, what a skill and a subagent are, and where a project's
`.claude/settings.json` lives. Package scripts and a GitHub Actions workflow file are assumed.
No knowledge of the engine's internals is needed.

**What it leaves to other pages.** Any coding assistant other than Claude Code, which cairn ships nothing for. The review agent's
purpose and how it relates to the audit gate: the page places only the agent's file, and the
`cairn-guidance` reference page describes what the agent checks. The scaffolded
tree outside `.claude/`, file by file, which Scaffolded site files covers. Running the audit
and reading its findings, which Run cairn-audit on your site covers. The upgrade procedure and
when to refresh, which Upgrade cairn covers. Writing a consultation brief, whose protocol
lives in the `cairn-consult` skill itself. The CLI's full option and output listing and the
trust boundary, which the `cairn-guidance` reference page covers.

**How the introduction runs.** Two paragraphs, then the bounds (prior knowledge and what the page leaves out). No heading.

1. **The task and the reader.** State the task from the reader's situation: setting up and
   working with Claude Code on a cairn site. Say who the page is for, the extend track's
   developer who has chosen Claude Code, and name the two arrivals: a scaffolded site that
   already carries the tree, and an existing site adopting the tree or refreshing it after an
   upgrade. State that the rest of the docs assume no coding assistant and that this page is
   the one that teaches working with Claude Code. Give one line, and only one, to other
   agents: cairn ships its guidance in Claude Code's format only, with no `AGENTS.md` and no
   file for any other coding agent, so a developer using another agent has no cairn guidance
   to read (`f:pmmtrm`).
2. **The contract.** Name what the reader does with the page: learn the guidance tree under
   `.claude/` and the root `CLAUDE.md` that imports it, which of the four packaged skills
   loads for which task, and where the review agent sits (its file, with the reference for
   what it checks); wire the `Stop` hook that runs the site's `check:cairn` script when a
   Claude Code turn ends, adding that script on a site without one; adopt, refresh, and
   check the tree with `cairn-guidance install` and `cairn-guidance check`, including their
   exit codes and what `check` reports when a site lacks the scaffold's gate wiring; and make
   the scaffold's CI step gate, starting the workflow on a site without one, if they choose
   to.

Then the bounds. The page assumes a running cairn site with the engine installed, working
knowledge of Claude Code (starting a session, what a skill and a subagent are, where a
project's `.claude/settings.json` lives), package scripts, and a GitHub Actions workflow
file; it needs no knowledge of the engine's internals. It leaves out the review agent's
purpose and its relation to the audit gate, placing only the agent's file and linking the
`cairn-guidance` reference page for what the agent checks. It leaves to other pages the
scaffolded tree outside `.claude/` (Scaffolded site files), running the audit and reading its
findings (Run cairn-audit on your site), the upgrade procedure and when to refresh (Upgrade
cairn), the consultation brief's protocol (the `cairn-consult` skill itself), and the CLI's
full option and output listing and the trust boundary (the `cairn-guidance` reference page).

Cautions for the drafter, introduction only:

- Name no other coding agent, and teach none.
- Promise only where the review agent sits, never what it reviews.
- Address the human developer, never Claude Code.

:::

:::constraints
- This is the one cairn docs page that teaches working with Claude Code. Every other page follows the register's rule that the general docs assume no coding assistant, so this page never rewrites another page's prose and nothing here implies the reader of other pages uses Claude Code.
- The page documents Claude Code only. Other coding agents get exactly one line, in the introduction, stating that cairn ships no guidance for them; the page teaches no other agent and names none. :fact[pmmtrm]
- The page addresses the human developer in the docs voice, never Claude Code. It does not borrow the agent-addressed voice of the fragment, the skills, or the review agent.
- Claude Code's behavior (when a `Stop` hook fires, how skills are discovered, where hook output appears) gets a link to Claude Code's docs, never a restated detail, per the vendor rule. The `Stop` timing sentence in "Wire the Stop hook" stays at "when a Claude Code turn ends" with the hooks link beside it.
- The `install` exit-code fact's exit-0 half is placed only for a refused entry or a failed destination write, and its nonzero half only as the failure row where `install` stops with an error and exits nonzero. Do not widen the exit-0 half to "every failure", and give the nonzero case no fix beyond its link to the `install` reference: no fact names one. :fact[5ohm23]
- The `cairn-public` catalogue fact is placed only for `cairn-public`'s catalogue pages. Its `check:public-skill` half is an engine-repository script that a site does not run, and never appears on this page. :fact[hiif6u]
- The refusal and write-error facts are placed only for what the reader sees (a refusal by name, the run continuing, a write error naming its errno code). The `.orig` case is placed only as a copy that could not be made refusing the destination beside it; the realpath and lstat mechanics, the exclusive no-follow open, and `InstallReport.writeErrors` stay on the reference page. :fact[vhxkab] :fact[x5grdm]
- The review agent is one bullet in "The guidance tree", with no heading: its location and the link to the reference's "What ships under `claude/`" section, nothing on what it reviews or how it relates to `cairn-audit` until a fact states that. :fact[0ygumq]
- The hand-off bullet that closes each section, and the Fix lines of the rows for a silent hook, a stale tree in CI, and another CI failure, carry no extractable fact (the restored `continue-on-error` line in the last of those rests on the CI workflow fact, which that row cites); the closing bullets of "Before you begin" and "The guidance tree" name `.claude/` and the skills, which earlier or later bullets back. :fact[jd54ph]
- GitHub's `continue-on-error` behavior and npm's `--if-present` behavior are vendor behavior with no `[vendor]` fact, so each gets its link (GitHub's workflow syntax in "Make the CI step gate on a stale tree", npm's `npm run` page in "Wire the Stop hook") and only the minimal statement this blueprint's bullets word; the drafter adds no further claim about either.
- The `check:cairn` script step and the starting-workflow step, and the symptoms and fixes of the row for missing gate wiring and the whole row for a leftover `.orig` file, rest on the reference page they link (`docs/reference/guidance.md`, the `check` and "What ships under `claude/`" sections) and on the snippet files the `check-cairn.json` and `check.yml` code examples quote, not on a fact; the drafter words them no wider than that page and those files state.
- From the exemplar, take the exit code stated flat beside the condition that produces it, and the closing caution that a command may carry codes the table does not list; leave the gh-specific codes and the page's bare list shape.
:::

## Before you begin

*The reader confirms the two things every later section rests on, a cairn site and Claude Code, before the page describes what cairn installs.*

- Working through this page takes a cairn site with the engine installed and Claude Code installed on the machine you develop on.
- A cairn site, either scaffolded by `create-cairn-site` or built by hand with the engine installed, is the first precondition, each linked to the page that produces it.
- See [The scaffold](../extend/scaffolded-site-files.md#the-scaffold).
- See [Add cairn to a SvelteKit app](../extend/add-cairn-to-a-sveltekit-app.md).
- Claude Code installed and able to start a session in the site's root is the second precondition, linked to Claude Code's installation page and never restated.
- See [Install Claude Code](https://code.claude.com/docs/en/setup#install-claude-code).
- With both in place, the next section describes what cairn puts under `.claude/`.

## The guidance tree

*Both arrivals need the tree before they act: the scaffolded-site reader already has it and needs to know what Claude Code reads, and the adopting reader needs to know what `install` is about to write. The review agent is one bullet of the tree, with a link to the reference.*

- cairn's guidance for Claude Code is a set of files under `.claude/`, plus the root `CLAUDE.md` that imports it, and a scaffolded site is born with all of it installed.
- The tree is written under `.claude/` plus the root `CLAUDE.md`, in Claude Code's locations (`@` import, `.claude/skills/`, `.claude/agents/`), and no `AGENTS.md` or other agent's file ships. This fact also backs the introduction's one line on other agents. :fact[pmmtrm]
- The tree's paths are `.claude/skills/<skill>/`, `.claude/agents/cairn-extension-reviewer.md`, `.claude/cairn/CLAUDE.md`, `.claude/cairn/VERSION`, `.claude/cairn/MANIFEST`, and the root `CLAUDE.md` importing the fragment. Present them as a bulleted list or a short text tree. :fact[0ygumq]
- The root `CLAUDE.md` is the one import line, then a `# Your site` section for the site's guidance. :fact[6ro1n9]
- The site's guidance for Claude Code belongs under `# Your site` in the root `CLAUDE.md`, because that file is the site's and the fragment under `.claude/cairn/` is the package's to refresh. :fact[6ro1n9]
- On a scaffolded site, `VERSION` stamps the engine dependency spec with its caret stripped, resolved when the scaffold was baked, not a version read from `node_modules`. :fact[dy5cfj]
- See [`install`](../reference/guidance.md#install) in the `cairn-guidance` reference.
- The review agent's file, `.claude/agents/cairn-extension-reviewer.md`, is one bullet of the tree, with the reference link beside it for what the agent checks. The agent's purpose and its relation to the audit gate are outside this page's outline entry, and no fact states either, so the bullet says nothing about them. :fact[0ygumq]
- See [What ships under `claude/`](../reference/guidance.md#what-ships-under-claude) in the `cairn-guidance` reference.
- The part of the tree that acts on each task you ask for is the skills.

### Skills by task

*The skills are part of the tree, not a task, so they sit under The guidance tree as its one subsection and say which skill fires for which task.*

- Claude Code loads each of the four packaged skills when a task matches the description the skill carries, so the skill that fires depends on what you ask for.
- The scaffold's `.claude/skills/` holds four skills whose descriptions say when to load them: `cairn-admin-screens` (build or review a screen inside `/admin`), `cairn-consult` (write a consultation brief after working around an engine behavior twice or wanting something the seams do not reach), `cairn-extend` (change anything that touches `/admin`, a form action, logging, or an engine seam), and `cairn-public` (restyle or extend the public side). Present them as a bulleted list or a two-column table of skill and task. :fact[o7bkm0]
- `cairn-public` carries one catalogue page per public piece cairn ships, under its `references/` directory. :fact[hiif6u]
- The consultation brief `cairn-consult` writes follows the protocol inside the skill itself, and this page does not teach it.
- See [The four skills](../reference/guidance.md#the-four-skills) in the `cairn-guidance` reference.
- A site without the tree, or one that has upgraded the engine, installs or refreshes it next.

## Adopt or refresh the guidance tree

*The first task, since every later step reads the tree it produces. It carries the root `CLAUDE.md` import line because `install` never writes that line, and the check's second line would otherwise report it missing on an adopting site.*

- `cairn-guidance install` writes the guidance tree into an existing site and refreshes it after an engine upgrade; a scaffolded site skips this section until its first upgrade.
- `npx cairn-guidance install` is how an existing site adopts the same tree a scaffolded site is born with, or refreshes it after an upgrade. :fact[0ygumq]
1. In the project root, run `npx cairn-guidance install`.
- `install` writes the fragment to `.claude/cairn/CLAUDE.md` and never rewrites the root `CLAUDE.md`, so an adopting site adds the import line by hand. :fact[6ro1n9]
2. If the root `CLAUDE.md` lacks it, add `@.claude/cairn/CLAUDE.md` as its first line, creating the file in the project root if the site has none.
- Code: the one import line the root `CLAUDE.md` needs. :source[/claude/snippets/claude-md-import.txt]
- `cairn-guidance install` never deletes: a path an earlier `MANIFEST` listed that the package no longer ships is printed as removable and left for the site to remove. :fact[4h9fz4]
- On a partial run, `install` exits 0 even when an entry is refused or a destination write fails, each printed to stderr, so a script that must detect a partial install reads stderr. The nonzero half is the failure row in [Diagnose an install or check failure](#diagnose-an-install-or-check-failure). :fact[5ohm23]
- When to run the refresh after an upgrade is the upgrade procedure's call, and that page places it among its steps.
- See [the steps in Upgrade cairn](../extend/upgrade-cairn.md#steps).
- The tree is now in place, and the one Claude Code setting it needs is yours to add.

## Wire the Stop hook

*The hook is the one edit `install` leaves out on purpose, and the reader makes it once the tree and the import exist.*

- The `Stop` hook runs `npm run check:cairn --if-present` when a Claude Code turn ends, and you paste it into `.claude/settings.json` yourself because `install` never writes that file.
- `cairn-guidance install` never writes `.claude/settings.json`, so the `Stop` hook that runs `npm run check:cairn --if-present` is a snippet, `claude/snippets/settings-hook.json`, that the developer pastes in deliberately. :fact[4nccq6]
- The paste is deliberate by design: a hook would give the package's code unattended execution inside a Claude Code session, so the engine leaves that one edit to the developer, and the trust-boundary section of the reference records the reasoning.
- See [The trust boundary](../reference/guidance.md#the-trust-boundary) in the `cairn-guidance` reference.
- Code: the whole `Stop` hook block as the package ships it, framed as the snippet to merge into `.claude/settings.json`. :source[/claude/snippets/settings-hook.json]
1. In `.claude/settings.json`, add the `Stop` entry from the snippet under `hooks`.
- See [the `Stop` hook](https://code.claude.com/docs/en/hooks#stop) in Claude Code's hooks reference.
2. In `package.json`, check that `scripts` holds a `check:cairn` entry. If it has none, merge in the script entries from the package's `check-cairn.json` snippet, shown below.
- Code: the script entries a site needs for the admin stylesheet build and the `check:cairn` gates, as the package ships them; a scaffolded site already carries them. :source[/claude/snippets/check-cairn.json]
- The hook runs the site's `check:cairn` script under `--if-present`, so on a site without that script the hook runs nothing and reports nothing, which is why the step above checks for it. :fact[4nccq6]
- See [`--if-present`](https://docs.npmjs.com/cli/v11/commands/npm-run#if-present) in npm's `npm run` reference.
- The hook's `check:cairn` runs the admin stylesheet build, then `cairn-audit`'s whole static registry, with public-scope findings as advisories that never change the exit code, and a missing `daisyui` or `tailwindcss` peer failing the run by name. :fact[mrv24k]
- The `check:cairn` run therefore needs the `daisyui` and `tailwindcss` peers installed; a missing one fails the run by name, and [Diagnose an install or check failure](#diagnose-an-install-or-check-failure) covers that case. :fact[mrv24k]
- See [Run the static pass](../extend/run-cairn-audit-on-your-site.md#run-the-static-pass).
- The scaffold's CI workflow also checks the guidance tree, and how strictly is a second choice.

## Make the CI step gate on a stale tree

*The CI gate is the second deliberate, optional choice, so it follows the hook, and it introduces the check's exit codes where the reader decides whether to gate on them.*

- The scaffold's workflow reports a stale or missing guidance tree in its job log without failing the build, and making it fail the build is a choice you make in `.github/workflows/check.yml`.
- The scaffold's guidance step runs without `--strict` under `continue-on-error: true`, so a stale or missing tree surfaces in the job log without failing the build, and gating takes both `--strict` and removing the `continue-on-error` line. :fact[jd54ph]
1. If the site has no `.github/workflows/check.yml`, create it from the package's `check.yml` snippet, which carries the same guidance step as the scaffold's workflow.
- Code: the starting workflow as the package ships it, for a site that has none, with the comment above the guidance step left out. :source[/claude/snippets/check.yml]
- See [What ships under `claude/`](../reference/guidance.md#what-ships-under-claude) in the `cairn-guidance` reference.
- The exit codes the choice turns on: once its arguments parse, `check` exits 0 whatever the report says, and `--strict` exits 1 only when the guidance tree is stale or missing. :fact[4ax489]
- Code: only the workflow's last step, `npx cairn-guidance check` with `continue-on-error: true`, as the scaffold ships it, without the comment above it. :source[/templates/waymark/.github/workflows/check.yml]
2. In `.github/workflows/check.yml`, add `--strict` to the `cairn-guidance check` step and remove its `continue-on-error: true` line.
- Both edits are needed: `--strict` sets the step's exit code, and whether a failing step fails the job is GitHub's `continue-on-error` setting, which the linked workflow-syntax reference defines and this page does not restate.
- See [`continue-on-error`](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepscontinue-on-error) in GitHub's workflow syntax reference.
- Removing `continue-on-error: true` is a trade: that setting passes the job on any nonzero exit of the step, so without it any nonzero exit fails the build, not only the `--strict` exit on a stale or missing tree. :fact[jd54ph] :fact[4ax489]
- Whichever you chose, verify the setup locally first, then in CI if you gated it.

## Verify the guidance setup

*Verification runs `cairn-guidance check` over everything the earlier sections produced and reads its seven lines, ends a Claude Code turn to see the hook run, and reads the CI log for a reader who gated it, so it comes only after them.*

- A healthy setup reports the tree fresh and every other line satisfied, and `check --strict` exits 0.
1. In the project root, run `npx cairn-guidance check`.
- The check prints seven report lines. Its exit codes: once its arguments parse, 0 whatever the report says, and 1 under `--strict` only on a stale or missing tree; an unknown command or flag exits 2. :fact[4ax489]
- One line reports whether the root `CLAUDE.md` carries the import line. :fact[6ro1n9]
- Two clauses on the check's judgments. First, the order in which the `.claude/` Tailwind exclusion line judges: a `.gitignore` line that ignores `.claude` counts as excluded before any stylesheet is read; otherwise only `src/admin.css`, then `src/theme/admin.css`, is read, and the first of them that contains `@source` or `source(none)` decides, excluded when it holds the literal `@source not "./.claude";` line or `source(none)` anywhere; when neither file carries either, the line reports unknown and names the paths it checked. Second, the tree's freshness ignores the `VERSION` stamp, so a tree differing only there reads fresh. :fact[1kwkl0]
- See [`check`](../reference/guidance.md#check) in the `cairn-guidance` reference.
2. In the same shell, run `npx cairn-guidance check --strict`, then print the exit code with `echo $?`.
3. In a Claude Code session in the site's root, end a turn, and read the `check:cairn` output the `Stop` hook produced.
- See [Claude Code's hooks reference](https://code.claude.com/docs/en/hooks).
4. If you gated CI, push a commit from the project root, and read the guidance check's report lines in the `check` job's log, starting with the first, which reports whether the tree is fresh.
- When a line reports a problem, the next section maps it to its fix.

## Diagnose an install or check failure

*It collects the step-linked failures from the install, the hook, the check, and the gated CI job, after the verification that surfaces most of them.*

- `install` reports a partial run on stderr or stops with a nonzero exit, `check` reports each problem on its own line, the hook's `check:cairn` run names a missing peer or prints nothing, and a gated CI job fails at the guidance step on a stale tree or on any other nonzero exit, and each row below points at its fix.

:::row
**Symptom.** `install` prints a `refused <path>` or `refused packaged entry <path>` line on stderr and still exits 0.
**Cause.** The path has a symlinked component or destination, has a component that exists as something other than a directory (a regular file, say), exists as something other than a regular file (a directory, say), or falls outside `.claude`; or a `<path>.orig` recovery copy could not be made, which refuses the destination beside it too; or the `.claude/cairn/MANIFEST` path is itself refused (a symlinked `MANIFEST`, say), so no `MANIFEST` is written; or, for `refused packaged entry`, the installed package's own entry is not a regular file. The run refuses each path by name and continues.
**Fix.** See [`install`](../reference/guidance.md#install) in the `cairn-guidance` reference.
:::

- The refusal cases a reader sees, each refused by name while the run continues and none changing the exit code: a symlinked component or destination, a component that exists as something other than a directory, a destination that exists as something other than a regular file, a destination outside `.claude`, a `.orig` copy that could not be made (which refuses the destination beside it too), and a refused `MANIFEST` path, after which no `MANIFEST` is written. :fact[vhxkab]

:::row
**Symptom.** `install` prints a `write error <path>: <code>` line on stderr and still exits 0.
**Cause.** A disk or permissions error, named by its errno code, not a containment refusal.
**Fix.** See [`install`](../reference/guidance.md#install) in the `cairn-guidance` reference.
:::

- A write failure is reported separately from a refusal, and its printed line names the errno code, such as `ENOSPC` or `EACCES`. :fact[x5grdm]

:::row
**Symptom.** `install` stops with an error instead of finishing, and exits nonzero.
**Cause.** A filesystem failure the run can't step past, such as creating a directory, writing the `MANIFEST`, reading a destination that already exists, or resolving or reading the installed package's guidance. Unlike a refusal or a write error, which the run prints and continues past, this failure ends the run. :fact[5ohm23]
**Fix.** See [`install`](../reference/guidance.md#install) in the `cairn-guidance` reference.
:::

:::row
**Symptom.** The hook's `check:cairn` run stops and names a missing `daisyui` or `tailwindcss` peer.
**Cause.** The named peer is not installed in the site, and `check:cairn` fails its run when the `daisyui` or `tailwindcss` peer is missing. :fact[mrv24k]
**Fix.** See [Diagnose a run that exits 2](../extend/run-cairn-audit-on-your-site.md#diagnose-a-run-that-exits-2).
:::

:::row
**Symptom.** The turn ends and no `check:cairn` output appears.
**Cause.** `package.json` has no `check:cairn` script, so `--if-present` skips the run, or the `Stop` entry is not under `hooks` in `.claude/settings.json`. :fact[4nccq6]
**Fix.** Add the missing script as the `check:cairn` step in [Wire the Stop hook](#wire-the-stop-hook) shows; if the script is there, compare the `Stop` entry in `.claude/settings.json` with the snippet in that section, then end another turn.
:::

:::row
**Symptom.** The `check` job fails at the guidance step, and the guidance check's first line in the job log reports the guidance tree stale or missing.
**Cause.** The committed tree is stale or missing. Under `--strict` the check exits 1 on exactly that, and with `continue-on-error` removed the exit fails the job. :fact[4ax489] :fact[jd54ph]
**Fix.** Run the install step in [Adopt or refresh the guidance tree](#adopt-or-refresh-the-guidance-tree), commit the refreshed `.claude/` tree, and push again.
:::

:::row
**Symptom.** The `check` job fails at the guidance step, but the guidance check's first line in the job log does not report the guidance tree stale or missing, or the step prints no report lines at all.
**Cause.** The step exited nonzero for a reason other than a stale or missing tree, such as exit 2 for an unknown flag or a file read that failed and ended the run. `--strict` exits 1 only on a stale or missing tree, so this exit is not the gate's, and with `continue-on-error` removed any nonzero exit of the step fails the job: the trade [Make the CI step gate on a stale tree](#make-the-ci-step-gate-on-a-stale-tree) describes. :fact[4ax489] :fact[jd54ph]
**Fix.** Read the guidance step's output in the job log, and compare it with what the `cairn-guidance check` reference says the command reports. To keep the build passing while you work on it, put the `continue-on-error: true` line back under the step, which passes the job on any nonzero exit, then push again; the build then no longer fails on a stale tree either until you remove the line again.
:::

- See [`check`](../reference/guidance.md#check) in the `cairn-guidance` reference.

:::row
**Symptom.** The first line reports the guidance tree stale or missing.
**Cause.** The installed guidance tree differs from the tree the installed package ships, apart from the `VERSION` stamp, or no tree is installed. :fact[1kwkl0] :fact[4ax489]
**Fix.** In the project root, run `npx cairn-guidance install`.
:::

:::row
**Symptom.** The second line reports the root `CLAUDE.md` missing the import line.
**Cause.** The root `CLAUDE.md` lacks the `@.claude/cairn/CLAUDE.md` line, and `install` never adds it, since it never rewrites the root file. :fact[6ro1n9]
**Fix.** If the root `CLAUDE.md` lacks it, add `@.claude/cairn/CLAUDE.md` as its first line, creating the file in the project root if the site has none.
:::

:::row
**Symptom.** A line reports a missing `check:cairn` script, `cairn-audit.config.json`, or `.github/workflows/check.yml`; `check` prints the snippet to paste under that line.
**Cause.** The site lacks the named script or file, and `install` writes none of them, since it writes under `.claude/` alone. :fact[mrv24k] :fact[pmmtrm]
**Fix.** See [`check`](../reference/guidance.md#check) in the `cairn-guidance` reference.
:::

:::row
**Symptom.** The seventh line names a `.orig` file still present.
**Cause.** An earlier `install` made a `<path>.orig` recovery copy beside a destination before overwriting it, and the copy is still there.
**Fix.** See [`install`](../reference/guidance.md#install) in the `cairn-guidance` reference.
:::

:::row
**Symptom.** The Tailwind line reports `.claude/` not excluded from the site's Tailwind build, or reports unknown and names the paths it checked.
**Cause.** No `.gitignore` line ignores `.claude`, and the first of `src/admin.css` and `src/theme/admin.css` that carries `@source` or `source(none)` holds neither the `@source not "./.claude";` line nor `source(none)`. The line reports unknown when neither stylesheet carries `@source` or `source(none)`. :fact[1kwkl0]
**Fix.** See [The `.claude/` exclusion from the Tailwind build](../reference/guidance.md#the-claude-exclusion-from-the-tailwind-build) in the `cairn-guidance` reference.
:::

:::row
**Symptom.** `npx cairn-guidance check`, with or without `--strict`, stops with an error instead of finishing, and exits nonzero.
**Cause.** A file read failed with anything but the file being absent, a read would have left the project directory, or the installed package's guidance could not be resolved or read. Each ends the run. Unlike the stale-tree exit, which needs `--strict`, this failure happens with or without it. :fact[4ax489]
**Fix.** See [`check`](../reference/guidance.md#check) in the `cairn-guidance` reference.
:::

## See also

*The task-guide anatomy closes the page with its related task, concept, and reference pages and its limitations. The outline's one concept page on this subject is Scaffolded site files, which explains the scaffolded tree the guidance sits in. The outline holds no limitations page for the guidance tree or for Claude Code, so the section links none, and the page's limits are the introduction's `notCovered` list, whose other homes the remaining links reach: the audit, the upgrade, and the `cairn-guidance` reference.*

- The following pages explain the scaffolded tree around the guidance and cover the work this page leaves out.
- See [Scaffolded site files](../extend/scaffolded-site-files.md).
- See [Run cairn-audit on your site](../extend/run-cairn-audit-on-your-site.md).
- See [Upgrade cairn](../extend/upgrade-cairn.md).
- See [The `cairn-guidance` CLI](../reference/guidance.md).
