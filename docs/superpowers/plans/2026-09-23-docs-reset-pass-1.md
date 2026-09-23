# Docs reset pass 1: the writing system

> **For agentic workers:** thirteen tasks (0 to 12) in five segments. Tasks 0, 4, 11, and 12 are
> conductor-run. Every other task runs as the per-task chain: `cairn-implementer` (`sonnet`,
> `high`) implements, `diff-reviewer` (`claude-opus-5-5`, `high`) reads the diff against the
> task's acceptance criteria, and the task's gate runs inside the chain through `cairn-run-gate`.
> **Execution mode:** `pass-execute.js` runs the chain tasks (1 to 3, 5 to 10), one segment per
> run, tasks sequential within it because each depends on the one before; copy the script to the
> session scratchpad first, since the Workflow tool refuses a `~/.claude/workflows` path. Task 0
> is the one owner sitting. Tasks 4 and 11 (the baseline run and validation) are conductor-run
> measurements, dispatched as named in each. Task 12, the close, is authored by one fold agent
> with one independent `diff-reviewer` read. Tasks name `opus` where the logic is novel and
> correctness-critical. The conductor is thin: it reads reports, never diffs, pages, or logs.
>
> **Plan author:** `claude-opus-5-5` at `high` (Geoff, 2026-09-23, the first plan under that
> rule). Folded once from three review lenses (see "Review fold" at the foot). The close records
> this plan's planning misses.

**Date:** 2026-09-23.

**Goal:** A validated writing system for the docs reset: confined reader agents that attempt real
jobs, stable fact ids with sentence-level provenance, a drafter that always receives its profile
and exemplars, a page chain that tests pages with readers, and a docs-as-tests floor. Every
component is built only where a recorded failure justifies it. The failure record is Task 4's
baseline plus pass A's documented failures; a component with no failure behind it is deferred, and
the record says which.

**Spec:** [`docs/superpowers/specs/2026-09-23-docs-reset-design.md`](../specs/2026-09-23-docs-reset-design.md),
"Pass 1: the writing system", rulings 9, 10, and 13, "Evidence the method follows", and
"Relation to existing designs". Executors read the spec's pass 1 section before their task. Where
this plan and the spec disagree, stop and report.

**Token ceiling:** 12M, flag at 9.6M. **Counting rule:** input, output, and cache-creation tokens
count against the ceiling; cache-read tokens are reported separately and do not count. Reader runs
report their own usage outside the Workflow counter; the runner's ledger totals them into this
ceiling by the same rule. Before Tasks 4 and 11, the conductor writes a cost estimate (runs times
the measured per-run figure from Tasks 1 to 3) against the remaining ceiling into the ledger.

**Checkpoints and STATUS:** at each segment boundary (after Task 3, Task 7, Task 11, and at the
close), at any split, and before any owner question, the conductor writes the ledger at the foot
of this plan (task states, decisions, spend including the runner's ledger, next task) and commits
one STATUS line to `main` pointing at it, pushed at the boundary, per the repository's practice
of STATUS commits on `main`. The ledger carries the detail; STATUS carries only the pointer and
the next action.

**Segments:** 0 to 3 (the owner sitting and the reader instrument), 4 to 7 (the baseline and the
fact layer), 8 to 11 (the drafter, the chain, docs-as-tests, validation), 12 (close). Every
boundary sits on a commit the gate proved green. Task 4's failure record is the one scope decision
point: it may defer parts of Tasks 5 to 10, recorded in the ledger, with no owner question.

**Branches:** cairn-cms `docs-reset-system` off `main` after the `docs-reset` branch (spec, this
plan, the `CLAUDE.md` model line) merges, in `.claude/worktrees/docs-reset-system`. Workstation
artifacts land as a commit series on `~/.dotfiles`'s `main`, the stowed checkout, since a branch
there would switch live files. **One-executor check,** before every task and before any dotfiles
commit or push: `pgrep -f` on the worktree path and on `.dotfiles`, `git status` in both
checkouts for changes this pass did not author, and `docs/STATUS.md` on `main` for a live `0.97.0`
cut session. A live executor stops the task and goes to the conductor.

**Models (aligned with Anthropic's model guidance, 2026-09-23):** implementers `sonnet` at `high`
(their pinned effort); `diff-reviewer` and every review read on `claude-opus-5-5` at `high`;
readers on `claude-opus-5-5` at its default `medium`, and also on `claude-sonnet-5` where a task
says so. `opus` upshifts are named per task. A hedged verdict on a correctness-critical point, or
a failure-record verdict the `diff-reviewer` disputes, is re-run on `claude-opus-5-5` at `xhigh`;
only if that still falls short does it go to one `fable` dispatch.

## Pre-flight findings (2026-09-23, from the plan author's reads and the review probes)

1. `tool/v1.1.0` is tagged and released (2026-09-22T16:35:40Z), with
   `cairn_1.1.0_linux_amd64.tar.gz` and `SHA256SUMS`. The revision-2 reviewer's "tag pending"
   claim was wrong.
2. `podman` 5.8.4 (rootless, SELinux on, netavark) and `bwrap` are installed.
   `@anthropic-ai/claude-code@2.1.280` exists on npm.
3. The facts container holds 810 facts by `check-facts.mjs`'s count (`admin.md` 86, `editors.md`
   83, `extend.md` 335, `front-door.md` 42, `reference.md` 264); the 845 line count includes the
   skipped `## Harvest record` and `## Provenance` sections. `check-facts.mjs` has a unit test at
   `src/tests/unit/check-facts.test.ts` and fixtures under `scripts/checks/fixtures/facts/`. Code
   spans are stripped before its bracket scan (`check-facts.mjs:17-23`), and it enforces a 10-line
   anchor window (`check-facts.mjs:62, 296-326`), so window rot is zero by construction.
4. `docs-page-chain.js` is 274 lines at `~/.dotfiles/claude/.claude/workflows/`; its
   `drafterModel` default is already `claude-opus-5-5`. The unmerged draft-docs pass B and C plans
   and the `register-check` skill depend on it and on `cairn-register-editor` as they stand.
5. Workstation agents, skills, and workflows follow `~/.claude/docs/claude-tooling.md`: agents and
   skills are their own manifests under `~/.dotfiles/claude/.claude/`, and every addition gets a
   governing `CLAUDE.md` line and `claude-tooling-sync verify`. Stow makes a dotfiles edit live the
   moment it is saved.
6. The headless reader flags were probed on Claude Code 2.1.280 (spec ruling 9). Under
   `--safe-mode --restricted --strict-mcp-config` the init event still lists 18 built-in skills,
   the `telemetry` plugin, four built-in agents, and 53 slash commands, and no field reports
   `CLAUDE.md` or memory. `--tools` is variadic and swallows a trailing prompt; `stream-json`
   requires `--verbose`; the result event's `permission_denials` array records refusals. The
   conductor's shell sets `ANTHROPIC_API_KEY`, so `env -i` is load-bearing.
7. GitHub has no API to create personal access tokens. The cairn-cms GitHub App can mint
   installation tokens (`POST /app/installations/{id}/access_tokens`) scoped to one repository;
   they expire in one hour. `cairn auth check` probes account-scope rows
   (`tool/cmd/cairn/permissions.go:35-43`) that a narrowly scoped token may fail.
8. Cloudflare per-Worker token scope (changelog 2026-09-15) needs an account-owned token and an
   existing Worker; product-level roles still span every Worker; per-database D1 scope is
   unverified. The estate inventory's admin token cannot manage API tokens, so the owner mints.
9. `npm run check:comments` lints only `src/lib` and the showcase (`check-comments.sh:10`).
10. Live podman runs inside `cairn-run-gate` escape its cgroup cap (conmon runs in its own scope).

## Global constraints

- Pass 1 changes no published page (`docs/admin/`, `docs/editors/`, `docs/extend/`,
  `docs/reference/`, `docs/why-cairn.md`, `README.md`), no `package.json` version, and nothing in
  the npm tarball's `files` list.
- Readers authenticate with one long-lived plan token from `claude setup-token`, stored in the age
  store as `DOCS_READER_OAUTH_TOKEN` and passed into the container as `CLAUDE_CODE_OAUTH_TOKEN`. No
  credential file is mounted or copied, and no task sets or reads `ANTHROPIC_API_KEY` for a reader.
- Container egress goes through a host allowlisting proxy: `api.anthropic.com` for every class;
  the Cloudflare API and the GitHub API additionally for the operator class only. `npm install`
  happens at preparation, never inside a reader run. The proxy's blocked requests go into the
  report.
- No reader, test, or fixture touches a production site, the production repositories, or the
  owner's keyring. The scratch site is the only live target.
- Every reader job is phrased as a real task, never as a test, and is passed on stdin.
- Reader directories live under a neutral path that never names the project
  (`$XDG_CACHE_HOME/docs-readers/<run-id>/`). Teardown deletes each per-run directory, including
  any `.claude/` state the CLI writes. Transcripts are scrubbed of token patterns before anything
  from them is written to the repository.
- No shared `:Z` mount: every container gets per-run copies of what it mounts.
- Captured exemplars live at `~/.local/share/cairn/exemplars/`, never in the repository.
- Code comments follow TSDoc (`npm run check:comments`, extended to `scripts/docs-readers/` in
  Task 1); Go is untouched.
- Every gate runs through `cairn-run-gate`; a gate that launches no browser sets
  `CAIRN_GATE_LANE=light`. Live container checks run outside `cairn-run-gate`, and their
  transcripts are attached to the task report.
- Shared workstation files that other repositories read (`cairn-implementer`, `site-implementer`,
  `cairn-register-editor`, `docs-page-chain.js`) are not edited before the cairn-cms PR merges.
  New agents, skills, and workflows that nothing reads yet may land earlier.

## Review focus

1. **A reader escaping its container:** a job whose natural path leads outside the directory (a
   build script, a `node_modules` read, an absolute path in a page). Expected: refused, and the
   report shows the refusal rather than a silent success. Pinned in Task 1's escape suite.
2. **A clean report from a reader that read nothing, or read more than it quoted:** Expected: the
   runner fails it. Pinned in Task 1.
3. **The reader token failing mid-batch:** Expected: the runner detects the auth failure, stops the
   batch, and reports it; it never reports the jobs as stalled, and the owner's own login is
   untouched. Pinned in Task 1.
4. **Two worktrees filing facts at once:** Expected: ids never collide, and `check:facts` rejects a
   duplicate. Pinned in Task 5.
5. **A fact edited after a page cites it:** Expected: the id is unchanged and the reverse mode lists
   the citing page. Pinned in Task 6.
6. **A reader seeing the answer key:** Expected: a repository-class checkout holds no
   `docs/internal/record/`, `docs/superpowers/`, or `.git`. Pinned in Task 2.

---

### Task 0: The owner sitting

**Conductor-run.** The one attended sitting of the pass.

**Outcome.** The conductor first creates, by API, the private repository `glw907/cairn-scratch-b`,
a placeholder Worker `cairn-scratch-b`, and its D1, with email sending off. It then writes STATUS
(the sitting's purpose and what it asks) and opens the sitting, in which the owner: runs `claude
setup-token`, received through `secret-receive DOCS_READER_OAUTH_TOKEN`; confirms adding
`cairn-scratch-b` to the cairn-cms GitHub App's installation, recorded as an owner-confirmed change
to a production App; and mints an account-owned Cloudflare token scoped to the `cairn-scratch-b`
Worker plus the narrowest D1 scope available, with an expiry, received through
`secret-receive CAIRN_SCRATCH_CF_TOKEN`. Each token gets a row in `~/.dotfiles/secrets/registry.md`
with its scope and rotation.

**Acceptance.**
- The repository is private; the Worker and D1 exist; email sending is off.
- `~/.dotfiles/secrets/registry.md` carries rows for both tokens with scope, expiry, and rotation;
  `sync.sh --verify` is green; `~/.local/secrets` names both (a name-only check).
- The ledger records the App installation change as owner-confirmed, with the date.
- STATUS on `main` was committed before the sitting opened.
- Gate: `sync.sh --verify` and a name-only check of `~/.local/secrets`.

### Task 1: The reader runner and the container

**Files:** Create `scripts/docs-readers/` (the runner, the class-declaration schema, the docs-only
and repository class declarations, a `Containerfile`, the egress-proxy config, the pinned init
baseline, and `batches/` for batch files), `src/tests/unit/docs-readers-*.test.ts`; extend
`scripts/checks/check-comments.sh` and `eslint.config.js`'s comment globs to
`scripts/docs-readers/`. Model: `opus` (novel, correctness-critical confinement).

**Outcome.** A Node script, run by the conductor in the background, takes a batch file from
`scripts/docs-readers/batches/` (jobs, each with class, job text, arrival state, docs set, and
reader model; plus a concurrency limit and a per-batch token budget) and runs each reader in a
podman container built from the `Containerfile`: Node plus the Claude Code CLI pinned to the host's
version. Task 1 defines the class-declaration schema (contents, tools, Bash allowlist, environment,
egress class) and the docs-only and repository classes; Task 2 adds the other two. Each container
mounts only a per-run copy of the job's prepared directory, runs with `env -i` plus
`CLAUDE_CODE_OAUTH_TOKEN` and the class's declared variables, has no D-Bus socket or keyring, and
reaches the network only through the egress proxy. Inside, the reader is the headless process of
spec ruling 9 with the job on stdin and `--verbose` set. Before each batch the runner checks the
token with one minimal call. It parses the `stream-json` output; checks the init event; derives the
pages read from the transcript's Read and Grep calls; verifies each report's `path:line` quotes
against the prepared directory; scans the transcript for fetches of cairn's package or repository;
merges the proxy's blocked-request log; totals usage into a ledger file by the plan's counting rule;
scrubs token patterns from the transcript; and tears the container and directory down. A batch
stops on an auth failure, a rate limit, or its budget, each a distinct stop reason.

**Report shape (produced for Tasks 4, 9, and 11):** one JSON object per job: `outcome`
(`done`, `stalled`, `refused`), `stalls[]`, `assumed[]` (terms or steps the reader inferred),
`pagesRead[]` (derived from the transcript), `quotes[]` (`path`, `line`, `text`), `checks[]`
(deterministic check results, if any), `ruleCandidates[]`, `denials[]` (from
`permission_denials`), `proxyBlocked[]`, `packageFetches[]`, `usage` (counted and cache-read
separately), `verified` (the runner's quote and init checks). The batch carries `stopReason`
(`complete`, `auth`, `rateLimit`, `budget`).

**Acceptance.**
- The escape suite, run live against a docs-only and a repository-class reader: a file-tool read of
  a known host path fails; `cat` of it through Bash fails; an `npm` script that reads it fails; a
  `WebFetch` and a `WebSearch` call are refused; a `curl` to a host off the allowlist is blocked by
  the proxy. Each refusal appears in the report's `denials[]` or `proxyBlocked[]`.
- The init check, against a baseline pinned per CLI version: `tools` equals the class declaration,
  `mcp_servers` is empty, `skills` and `plugins` equal the pinned baseline, and `apiKeySource` is
  `"none"`; any mismatch fails the run. The escape suite places a canary `CLAUDE.md` and a canary
  memory file where each would load, and the transcript contains neither canary string.
- A report with no quote, a quote not found at its `path:line`, or a page in `pagesRead[]` without
  a quote is marked unverified and fails; a fixture covers each.
- A fixture transcript containing a fetch of `@glw907/cairn-cms` or `github.com/glw907/cairn-cms`
  lands in `packageFetches[]`.
- A credential-failure test: a batch whose token is revoked partway through stops with
  `stopReason: "auth"`, no job is reported as `stalled`, and the host's own `claude` login still
  works afterwards. A fixture rate-limit response yields `stopReason: "rateLimit"`, and a batch
  over its budget yields `stopReason: "budget"`.
- A written transcript fixture holding a token-shaped string comes out scrubbed.
- Teardown leaves no per-run directory and no container.
- Unit tests cover batch parsing, the quote verifier, the pages-read derivation, the init check, the
  scrubber, the stop reasons, and the ledger total by the counting rule.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-readers && npm run check:comments'`,
  with `scripts/docs-readers/` in `check-comments.sh`'s path list; the live escape suite runs
  outside the gate, and its transcript is attached to the report.

### Task 2: The two remaining reader classes and preparation

**Files:** the docs-and-site and docs-and-binary class declarations under `scripts/docs-readers/`,
a class-preparation module, tests.

**Outcome.** The four classes of the spec's pass 1 item 2 all exist, each a declaration under Task
1's schema. Preparation builds each per-run directory: the published docs set for every class;
for docs-and-site, a scaffolded site with the engine installed from a packed tarball of the
worktree, with the installed package's `docs/`, `claude/`, and `skills/` directories removed and
`npm install` done at preparation; for repository, a `git archive` export at a named commit that
excludes `docs/internal/record/`, `docs/superpowers/`, and `.git`. Preparation fails if any of
those paths is present. The docs-and-binary class is declared here and wired in Task 3. Before
pass 2a's profiles exist, each class supplies one neutral sentence describing its reader.

**Acceptance.**
- A docs-and-site reader can run the job's named `npm run` scripts and cannot read
  `node_modules/@glw907/cairn-cms/docs` (absent) or any path outside its directory; an `npm
  install` it attempts is blocked by the proxy.
- A repository reader can run `npm run check:facts` and cannot reach the host checkout; a test
  fails preparation when a planted `docs/superpowers/` path survives the export.
- Each class declaration carries its neutral sentence.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-readers && npm run check:comments'`;
  one live run per class of a trivial job runs outside the gate, transcripts attached.

### Task 3: The scratch site and the operator class

**Files:** `scripts/docs-readers/` operator wiring and GitHub installation-token minting; a record
at `docs/internal/record/2026-09-23-scratch-site.md`.

**Outcome.** The scratch site of spec ruling 10 is scaffolded by the setup command into the Task 0
repository and deployed over the placeholder Worker. The runner mints a GitHub App installation
token scoped to `cairn-scratch-b` (contents and metadata read) once per batch; before relying on
it, the task verifies that `cairn auth check` accepts an installation token and records any row
that fails. The docs-and-binary class installs `cairn` `tool/v1.1.0` from its release archive,
verified against `SHA256SUMS`, sets a reader-local `CAIRN_STATE_DIR` that names only the scratch
site, and allowlists only `sites list`, `health`, `logs` (scratch site), `doctor` (the reader's
own directory), `auth list`, and `auth check`. The record states which `cairn auth check` rows are
expected to fail under the scoped tokens and why, and the teardown for pass 2a's close: a dry-run
listing of the repository, Worker, D1, and tokens, then deletion only on owner confirmation.

**Acceptance.**
- An operator reader runs `cairn health` against the scratch site and gets a result; `cairn auth
  set` and any production site name are refused.
- One denied call each: the Cloudflare token against another Worker, and the installation token
  against another repository.
- The reader's `CAIRN_STATE_DIR` lists only `cairn-scratch-b`.
- The record lists each `cairn auth check` row with its expected result under the scoped tokens.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-readers && npm run check:comments'`;
  one live operator run outside the gate, transcript attached.

**Checkpoint 1** (after Task 3): the ledger and the STATUS line, per the header.

### Task 4: The baseline run

**Conductor-run.** The conductor writes the cost estimate first. Dispatch one `sonnet` agent at
`medium` to write the batch file and the rot-measure script, then run the runner in the
background; one `claude-opus-5-5` agent at `high` writes the failure record from the reports; one
`diff-reviewer` (`claude-opus-5-5`, `high`) reads the record against the reports, and a verdict
it disputes is re-run at `xhigh`, then goes to one `fable` dispatch if still unsettled.

**Outcome.** "Through today's chain" is read as today's pages as they stand: the current
`docs-page-chain.js` is not run, since today's pages already passed it. Readers attempt real jobs,
each job run three times, twice on `claude-opus-5-5` and once on `claude-sonnet-5`: an evaluator
job on `docs/why-cairn.md` (docs-only); an operator job on `docs/admin/is-it-working.md` (for
example, a scratch-site condition to diagnose and act on; docs-and-binary); a designer job on
`docs/extend/design-your-site.md` and an extender job on `docs/extend/add-a-custom-admin-screen.md`
(docs-and-site); a core-developer job on `CONTRIBUTING.md` (repository); and the scripter job
(write a wrapper and parser; repository) on pass A's three contract pages at commits `3bfaac37`,
`3453668f`, and `29a03eff`, whose 14 page defects are known from the pass A plan's task 9 record.
Before the scripter runs, the 14 are split at random into a tuning half and a held-out half,
recorded in the failure record. A script measures exact-line rot: the share of container `Source:`
pointers whose quoted anchor does not sit on the cited line itself at `HEAD`. The failure record,
`docs/internal/record/2026-09-23-docs-reset-baseline.md`, lists each failure with its evidence;
folds in the site round's extender source-read log and per-page reports if any exist by then, or
says none exist; carries pass A's documented failures (from the pass A plan's post-mortem: the fact
read catching sentences the drafter composed by joining neighbouring manifest entries, the false
version line, and Sonnet drafts needing a third round); counts how many of pass A's 14 the
scripter readers found; states the rot share; and names, for each of Tasks 5 to 10, the failure
behind it (build) or none (defer, with the reason).

**Acceptance.**
- Every report is verified by the runner; the batch's `stopReason` is `complete`.
- The record names a build-or-defer verdict with its failure for each of Tasks 5 to 10, each chain
  change in the spec's pass 1 item 6, and the harness scope of item 7.
- The record states the site-round evidence it folded, or that none exists.
- The record carries the tuning and held-out halves, and the ledger carries the cost estimate.
- The `diff-reviewer` verdict on the record is recorded in the ledger, with any `fable`
  adjudication.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-readers'`
  for the rot-measure script's test.

### Task 5: Fact ids

**Files:** `scripts/checks/check-facts.mjs`, `docs/internal/facts/README.md`, the five container
files, a re-runnable migration script under `scripts/checks/`, `src/tests/unit/check-facts.test.ts`,
fixtures. The agent-definition id rule lands in Task 12, not here. Before starting, run the
one-executor check for a live `0.97.0` cut session.

**Outcome.** Every fact bullet carries an opaque id, minted once and never derived from content, as
a leading code span (for example, `` - `f:7k3q9x` <claim> ``), which the bracket scan already skips;
the `## Harvest record` and `## Provenance` sections are skipped. The facts README defines the form
and tells a filer how to mint one, and carries the one-line id rule Task 12 copies into the agent
definitions. `check:facts` fails a bullet without an id and a duplicate id anywhere in the
container. The migration script adds ids to all 810 facts without changing any other byte, is
idempotent, and is re-run immediately before the PR merges (Task 12).

**Acceptance.**
- Two ids minted in separate worktrees at the same moment do not collide (a test mints many in
  parallel processes and checks uniqueness).
- A duplicate-id fixture fails `check:facts`; an id-less bullet fixture fails it.
- Editing a bullet's text leaves its id unchanged (a test and the README say so).
- The migration diff changes only id insertions (`git diff --word-diff` shows nothing else), and a
  second run of the script changes nothing.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit src/tests/unit/check-facts.test.ts && npm run check:facts'`.

### Task 6: Provenance, briefs, and the reverse mode

**Files:** a new `scripts/checks/check-provenance.mjs` and its `package.json` script,
`docs/internal/briefs/` (with a README), `check-facts.mjs`'s reverse mode, the owner-tier key
phrases in the container, tests. Model: `opus` for the extractor.

**Outcome.** `check:provenance` is built to the docs-standard spec (lines 569-586): a page's brief
at `docs/internal/briefs/<track>/<page>.json` carries a `sentences` list, each sentence with a fact
id or `no-claim`; the check fails an unclassified sentence, an id that does not resolve, and a
machine-extractable fact (numerals, versions, paths, commands, flags, export and config names, and
owner-tier claims) that no cited bullet contains. The owner tier is the bullets sourced to an owner
brief; each carries a quoted key phrase, and the extractor matches those phrases. A cited id whose
bullet is `[candidate]` or marked excluded fails; a cited `[docs-drift]` bullet fails until
resolved; `[external]` and `[vendor-figure]` bullets stay citable. `check:facts --cited-by <id>`
lists the pages whose briefs cite it. If Task 4's exact-line rot share exceeds ten percent,
symbol-anchored sources are built for `src/` (TypeScript compiler) in this task and filed for
`tool/`; otherwise both are filed in ROADMAP.

**Acceptance.**
- Fixtures cover each failure mode above and a passing brief, including an `[external]` citation
  that passes, a `[docs-drift]` citation that fails, and an owner-tier key phrase missing from its
  cited bullet that fails.
- A fact edited after citation keeps its id and appears in `--cited-by` for its page.
- Every owner-tier bullet carries a quoted key phrase (a test counts them).
- If rot exceeds ten percent, a `src/` fixture resolves its source by symbol; otherwise ROADMAP
  carries both filings.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit src/tests/unit/check-facts.test.ts src/tests/unit/check-provenance.test.ts && npm run check:facts'`.

### Task 7: Candidate triage

**Files:** the five container files, a disposition record at
`docs/internal/record/2026-09-23-candidate-dispositions.md`.

**Outcome.** Each of the 134 `[candidate]` bullets sourced only to an old page is traced to code
(retagged with the new source), rejected, or marked excluded. A bullet is deleted only with a cited
code line proving it false; every bullet that cannot be traced is marked excluded with a reason.
The record carries every verdict, the source for each retained bullet, and the full verbatim text
and original source of every rejected bullet. `[docs-drift]` bullets are listed for resolution
before any page cites them. One `claude-opus-5-5` read at `high` covers the rejected list against
its cited code lines.

**Acceptance.**
- The record lists all 134 with a verdict; each retained bullet has a source; each rejected bullet
  has its verbatim text and a cited code line.
- No bullet is deleted without a cited code line (the Opus read confirms, and its verdict is in the
  ledger).
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:facts'`.

**Checkpoint 2** (after Task 7): the ledger and the STATUS line, per the header.

### Task 8: The drafter agent and the audience-profile skill

**Files (dotfiles):** `claude/.claude/agents/cairn-docs-drafter.md`,
`claude/.claude/skills/audience-profile/SKILL.md` and its profile-file template,
`claude/.claude/workflows/docs-page-chain-v2.js` (created here as a copy of `docs-page-chain.js`
differing only in its default `drafterType`), the governing `CLAUDE.md` line;
`claude-tooling-sync verify`. Run the one-executor check on `~/.dotfiles` first.

**Outcome.** The drafter agent of the spec's pass 1 item 5 (tools Read, Write, Edit, Grep, Glob,
Bash; `model: claude-opus-5-5`; `effort: high`; preloads the skill through `skills:`). The skill
defines the profile-file format (one-sentence persona, vocabulary contract, knowledge and tool
ceiling, arrival states, success criterion, and an exemplar list of two or three pages with the
local paths under `~/.local/share/cairn/exemplars/`) and how a brief hands a profile and exemplars
to the drafter (exemplars in `<example>` tags, source material wrapped as content). The agent's
prompt carries the Opus 5.5 rules from the spec's evidence section: the first sentence of each
section states its answer, the named tells to avoid, a no-padding line, the `sentences` list
written with the page, and plain instructions without emphasis capitals. `cairn-docs-drafter`
becomes the default `drafterType` of `docs-page-chain-v2.js`, unconditionally; `docs-page-chain.js`
is untouched.

**Acceptance.**
- A fresh headless session's transcript shows the agent resolving to `claude-opus-5-5` with the
  skill preloaded.
- A grep of the agent file finds `effort: high` and each of the five prompt rules above.
- The profile template requires two or three exemplars; a test profile with one fails validation,
  and one with two validates.
- `docs-page-chain-v2.js` defaults `drafterType` to `cairn-docs-drafter`, and `git -C ~/.dotfiles
  diff` shows no change to `docs-page-chain.js`.
- Gate: `claude-tooling-sync verify` green, plus the profile validation run.

### Task 9: The revised page chain

**Files (dotfiles):** `claude/.claude/workflows/docs-page-chain-v2.js`, with the protocol for
splitting the chain around the reader stage and a compatibility note in its header. Scope per Task
4's record. `cairn-register-editor.md` is not edited here: the v2 chain passes the editor its new
inputs in the dispatch prompt, and any definition change waits for Task 12.

**Outcome.** The changes of the spec's pass 1 item 6 that Task 4 marked build, in the v2 file:
`check:provenance` in the page gate; the register editor fed Vale and `tellgrader` output and an
omission checklist, reporting every finding; a separate Opus 5.5 filter that drops only findings
that contradict the register or the brief; an applied-findings read after each redraft; the profile
grader removed; the chain split into a draft-and-read stage and a redraft stage with the reader
runner between them, run by the conductor; source material wrapped as content; a text-only turn
end treated as a report; bounded auto-continue of two; the two-round cap. Every existing gate
stays.

**Acceptance,** one bullet per change Task 4 marked build:
- The v2 source's page gate names `check:provenance`.
- The register editor's dispatch prompt carries the Vale output, the `tellgrader` output, and the
  omission checklist.
- The filter's prompt states it drops only findings that contradict the register or the brief, and
  a fixture finding that contradicts neither survives the filter.
- The applied-findings read returns a verdict per finding on a fixture redraft.
- The v2 source names no profile-grader agent.
- A fixture turn ending text-only is parsed as a report.
- A fixture agent that stalls is auto-continued at most twice.
- A third round is never dispatched (a fixture with findings after round two escalates).
- A dry run of both stages on one scratch page (a copy of a current page on a scratch branch that
  never merges) completes, with the runner's reports passed into the redraft stage.
- Every gate in `docs-page-chain.js` also appears in the v2 source.
- Gate: `claude-tooling-sync verify` green, plus the dry run's report attached.

### Task 10: Docs-as-tests

**Files:** a spike record at `docs/internal/record/2026-09-23-doc-detective-spike.md`; the harness
under `scripts/docs-readers/` or the adopted tool's config; tests. Scope per Task 4's record.

**Outcome.** A time-boxed Doc Detective spike against two current operator pages records a
build-or-adopt decision with evidence. Either way, every shell procedure and `--json` output on an
operator page runs literally in the docs-and-binary container under ruling 10's tiers and is checked
in code, with state-changing commands checked as dry runs against `cairn`'s command tree.

**Acceptance.**
- The spike record names build or adopt, with the evidence for the choice.
- The harness runs every operator page's procedures (every page under `docs/admin/` with a shell
  procedure or `--json` output) against the scratch site and reports each step's result.
- A deliberately broken command in a fixture page fails.
- A fixture page with a state-changing command is checked as a dry run and never executed.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-readers && npm run check:comments'`;
  the live harness run outside the gate, transcript attached.

### Task 11: Validation

**Conductor-run,** as Task 4: the cost estimate first, then the dispatches named below.

**Outcome.** One `claude-opus-5-5` agent at `high` that never sees a reader prompt plants the
defects: copies of Task 4's baseline pages, each carrying defects drawn from a removed step, an
undefined term, a wrong flag, and a stale path, planting on each class's pages only the types that
class's contents can reveal. Their locations go in
`docs/internal/record/2026-09-23-docs-reset-planted-defects.md` (outside every docs arm and the
tarball, and excluded from repository-class checkouts). Unmodified control pages run alongside.
Each reader class runs its jobs on its planted pages and its control pages three times (twice Opus
5.5, once Sonnet 5), and the scripter job runs on the held-out half of pass A's 14. A finding on a
control page is a false positive unless it matches a failure in Task 4's record or one Opus read,
which sees the page and the finding but no reader prompt, confirms it as a real defect. The planted
set and the control pages become a standing regression batch in `scripts/docs-readers/batches/`.

**Acceptance.**
- Every class catches every defect planted for it in at least two of three runs.
- The scripter readers catch every held-out defect in at least two of three runs.
- Every class catches the baseline's real failures on its pages in at least two of three runs.
- **False-positive cap:** no class reports more than three false positives across its three control
  runs.
- The regression batch replays through the runner.
- **Failure rule:** a class that cannot meet these after one fix round stops the pass; the fix round
  tunes on the tuning half of pass A's 14 only, never on the planted, control, or held-out sets.
  On a stop, the conductor writes STATUS and reports to the owner rather than closing.
- Gate: the runner's verified reports for every run, attached; the ledger carries the cost
  estimate and the scores.

**Checkpoint 3** (after Task 11): the ledger and the STATUS line, per the header.

### Task 12: Close

One fold agent, one independent `diff-reviewer` read.

**Outcome.** Immediately before the PR merges, the migration script is re-run on a rebase onto
`main` and any new bullets gain ids. The branch's PR carries: a `docs/HISTORY.md` entry (what
landed, what the gate caught, what a later pass would be wrong to rediscover, this plan's planning
misses and both budgets); a post-mortem at the foot of this plan; the docs-friction log and ROADMAP
updated for deferred items (Task 4's defers, Task 6's filed anchors); no `CHANGELOG.md` entry
unless a published surface changed (none should); the facts and briefs READMEs current. After
merge, and only then, the one-executor check runs and the dotfiles edits to shared files land:
the id rule in `cairn-implementer`, `site-implementer`, and any other agent the grep of
`~/.dotfiles/claude/.claude/agents/` finds naming `docs/internal/facts`; any
`cairn-register-editor` change the v2 chain needs. Each changed shared file carries a
compatibility note in its header. `docs/STATUS.md` on `main` names pass 2a as the next action with
its resume prompt: a fresh `claude-opus-5-5` session, where Opus 5.5 at `high` authors the pass 2a
plan from the spec. The full gate runs once, heavy lane: `cairn-run-gate 'npm run check && npm
test'`.

**Acceptance.**
- The migration re-run is the last content commit before merge, and `npm run check:facts` is green
  on it.
- The PR merges on green CI; STATUS on `main` names pass 2a.
- Every shared-file dotfiles commit is dated after the PR's merge commit (checked by timestamp), and
  each changed shared file carries its compatibility note.
- `claude-tooling-sync verify` is green.
- The scratch site stands for pass 2a with its teardown recorded.
- Gate: `cairn-run-gate 'npm run check && npm test'`.

## Review fold (2026-09-23)

Three lenses, folded under the conductor's rulings. Task numbers below are the new ones: the
candidate triage became Task 7, so former Tasks 7 to 11 are now 8 to 12, and Task 0 is new.

- **Contract C1** (failure-first exemption): applied; no exemption, Goal line fixed, Task 4 names
  the failure behind each of Tasks 5 to 10, pass A's post-mortem failures included.
- **Contract C2** (drafter swap deferrable): applied; the swap is unconditional in Task 8, in the v2
  chain.
- **Contract M1** (pass 2a authorship): applied; spec amended. The global `CLAUDE.md` line is not
  edited here (outside this fold's two files).
- **Contract M2** (quote per page read): applied; `pagesRead[]` and its fixture in Task 1.
- **Contract M3** (site-round evidence): applied in Task 4.
- **Contract M4** (self-graded verdicts): applied; `diff-reviewer` read of Task 4's record,
  disputes to `fable`; Task 11's false positives get an independent Opus read.
- **Contract M5** (Task 8 acceptance): applied as Task 9's per-change bullets and filter criterion.
- **Contract M6** (Task 1 gaps): applied; transcript and proxy scan, memory canary,
  credential-failure test.
- **Contract M7** (execution mode): applied in the header.
- **Contract M8** (STATUS at checkpoints): applied; ledger plus a STATUS line on `main`, and STATUS
  before the Task 0 sitting.
- **Contract m1** (interfaces): applied; schema and two classes in Task 1, batch path named, the
  scripter's class is repository, the evaluator job gives docs-only a baseline job.
- **Contract m2** (thresholds): applied as ruling 7's held-out design in Task 11.
- **Contract m3** (tag citability): applied in Task 6.
- **Contract m4** (Task 6 bundling, rot criterion): applied; triage split to Task 7, rot criterion
  added.
- **Contract m5** (drafter effort and exemplars): applied in Task 8.
- **Contract m6** (duplicate-id fixture): applied in Task 5.
- **Contract m7** (gates, branch, efforts): applied; every task names a gate, the dotfiles branch
  is `main` with the reason, efforts named.
- **Contract m8** (Task 9 coverage): applied in Task 10.
- **Contract m9** (today's chain): applied; Task 4 states the reading.
- **Mechanics C1** (credential copy): applied; `claude setup-token` token, no file mounted.
- **Mechanics C2** (init acceptance): applied; per-version baseline, canary, `env -i`.
- **Mechanics M1** (GitHub PAT API): applied; installation tokens per batch, verified against
  `cairn auth check` first.
- **Mechanics M2** (Cloudflare scope): applied; Worker and D1 first, owner mints in Task 0,
  expected-failing rows stated.
- **Mechanics M3** (rot zero by construction): applied; exact-line measure.
- **Mechanics M4** (network): applied; allowlisting proxy, install at preparation.
- **Mechanics M5** (ceiling): applied; 12M, flag 9.6M, counting rule, rate-limit stop; spec
  amended.
- **Mechanics M6** (fact count and id form): applied; 810, leading code span, sections skipped.
- **Mechanics M7** (owner-tier phrases): applied in Task 6.
- **Mechanics m1** (stdin, `--verbose`, denials): applied in Task 1 and the constraints.
- **Mechanics m2** (comment lint path): applied; Task 1 extends `check:comments`.
- **Mechanics m3** (podman outside the gate): applied in the constraints and every live task.
- **Mechanics m4** (`:Z` mounts): applied; per-run copies.
- **Mechanics m5** (feasibility confirmations): recorded in the pre-flight findings.
- **Domain C1** (credential leak and logout): applied; token, proxy, scrubbing, teardown.
- **Domain C2** (shared tooling live early): applied; v2 chain file, shared agent edits after merge
  in Task 12 with compatibility notes.
- **Domain C3** (no false-positive measure): applied; controls, numeric cap, held-out half,
  separate planter, class-appropriate defect types.
- **Domain M1** (token mints): applied; Task 0 sitting, expiries, honest `auth check` residual.
- **Domain M2** (migration collisions): partly applied; idempotent migration re-run before merge.
  Not taken: a facts freeze announcement and a warn-only grace mode, since the re-run and the
  post-merge agent rule close the window.
- **Domain M3** (triage deletes facts): applied in Task 7.
- **Domain M4** (answer key): applied; `git archive` exclusions and a failing preparation check.
- **Domain M5** (spend stop): applied; per-batch budget, concurrency limit, cost estimates.
- **Domain m1** (repository visibility, App change, email): applied in Task 0.
- **Domain m2** (teardown): applied; token expiry plus a dry-run listing and owner confirmation.
- **Domain m3** (live cut session): applied in the one-executor check.
- **Domain m4** (neutral paths persist): applied; teardown deletes per-run directories and `.claude/`
  state.

## Ledger

| Task | State | Commit | Spend | Notes |
| --- | --- | --- | --- | --- |
| 0 | done | dotfiles `494c900` | conductor only | Reader token already stored as `CAIRN_DOCS_READER_OAUTH_TOKEN` (the plan's `DOCS_READER_OAUTH_TOKEN`; STATUS and registry are canonical). Provisioned 2026-09-23: private repo `glw907/cairn-scratch-b` (id 1384270163); D1 `cairn-scratch-b-auth` (`1fe11784-f64e-408f-8bc2-029e997c11a9`); placeholder Worker `cairn-scratch-b` (version `0ae80c09`, workers.dev, `AUTH_DB` bound, no email binding), deployed on Geoff's approval after an auto-mode denial. App installation `135372268` change owner-confirmed 2026-09-23; the API refuses `gh`'s OAuth token for it (community discussion 27280), so Geoff added the repo in settings (2026-09-23); verified by a minted installation token scoped to `cairn-scratch-b` (contents and metadata read) whose repository list is exactly `glw907/cairn-scratch-b`. `CAIRN_SCRATCH_CF_TOKEN` stored 2026-09-23 (third mint): account-owned, one policy, Individual Workers `cairn-scratch-b`, Metadata Read-only; 200 on its settings, 403 on `907-life` and on its own content, 401 on D1. Deviations: no TTL (a dashboard TTL edit produced a one-day window; the pass 2a teardown deletes it instead), and the account-level telemetry query returned 403, so Task 3 must confirm `cairn logs` under it and record the result. Registry row and `sync.sh --verify` green; `~/.local/secrets` names both tokens. |
| seg 1 pre-flight | done | — | one sonnet agent | All Task 1 to 3 claims hold at HEAD, with one amendment: finding 6's init counts drift with workstation config (a host probe now shows 17 skills and 49 commands, not 18 and 53), so Task 1 pins its init baseline from a fresh probe inside the container under `env -i`, never from finding 6. The runner copy takes `planGate: true` so each task runs the plan's light gate, not the gate-tier classifier's. |
