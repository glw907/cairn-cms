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

**Execution amendments (Geoff, 2026-09-23, after Task 2):** (1) packed engine tarballs are cached
by commit plus a clean-tree check of every path the tarball ships (Task 3); (2) implementers get the
unit tests and the gate green first, then run each live check once, rerunning only on failure or a
later podman or preparation change, and every dispatch prompt says so; (3) each segment's
pre-flight also lists every open choice a task leaves the implementer, and the conductor pins each
in the dispatch; (4) after Task 4's verdicts, three parallel lanes: facts (Tasks 5 to 7, own
worktree off `docs-reset-system`), drafting (Tasks 8 and 9 in `~/.dotfiles`; Task 9's dry run
after Task 6), harness (Task 10, own worktree), each merged back before Task 11; (5) Task 7 fans out
to one Sonnet agent per container file, then the one Opus read; (6) reader concurrency 4 in Tasks
4 and 11, backing off on `rateLimit`. (7) Ceiling raised to 16M, flag at 12.8M (Geoff, 2026-09-23, after the
spend estimate showed every task needing one fix round). (8) Four lanes, superseding (4): A,
Tasks 5 then 6 (own worktree); B, Task 7 fanned out (own worktree off Task 5's commit, since 6 and
7 both need 5's ids but not each other, and they edit different bullets); C, Tasks 8 then 9 in
`~/.dotfiles`, Task 9's dry run after Task 6; D, Task 10 (own worktree). All start only after Task
4's record rules build or defer. Segment 1 ran as per-task Agent chains because the auto-mode
classifier refused an edited copy of `pass-execute.js`; later segments do the same.

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
| 1 | done | `23462d84`..`ed333528` | impl opus ~735k subagent tokens incl. fix round; review ~117k; live reader runs 80.7k counted | Accepted after one fix round (teardown race on a worker throw or signal; plus a quote on an unread docs-set page now fails, and live-check summaries are scrubbed). Plan corrections the reviewer ruled on: WebFetch and WebSearch are removed by `--disallowedTools`, so their refusal shows as absence from the pinned init `tools`, not a `denials[]` entry; the docs-only class has no Bash, so its `cat`, `npm`, and `curl` escape checks are enforced by the init check; the npm-script escape check passes on the missing file and the absent secret, not a denial. Carry-forwards: the CLI auto-allows read-only Bash inside cwd regardless of the allowlist, so the container and scoped tokens are the boundary and Task 3 adds a live check that `cairn auth set` is refused; outcomes gain `aborted` (with `abortReason`) and `error`, and a halted batch throws without writing `report.json`, which Tasks 4, 9, and 11 handle; a halt during `startNetwork` is missed by `runReader` (fold into Task 2). Workflow launch was denied by the auto-mode classifier (self-modification, the edited runner copy), so segment 1 runs as per-task Agent chains. Per-run reader cost: docs-only about 4k counted warm, repository about 10k warm, plus about 3.3k per batch token check. |
| 2 | done | `a787b26b`..`fb530c09` | impl sonnet ~804k subagent tokens incl. fix round; review ~94k plus re-read; live reader runs about 40k counted | Accepted after one fix round (the scaffold copied `examples/showcase` with a dangling `cairn-cms-dev` link and tracked agent memory; now `git archive HEAD templates/waymark` with both packages repointed at worktree tarballs; the site smoke job now quotes and probes outside its directory). Conductor ruling: the prepared site also drops the template's own `CLAUDE.md` and `.claude/`, so the reader sees only the docs set; pass 2b may need a class variant that keeps them, since the spec treats the scaffolded `CLAUDE.md` as an agent entry point. `make -C tool check` dropped from the repository class (no Go in the image). Carry-forwards: `check:facts` inside a repository export fails on facts citing `docs/internal/record/` (excluded by design), so no core-developer job may use a passing `check:facts` as its done signal until Tasks 5 to 7 handle excluded provenance; the allowlist refuses compound commands, so Task 4's jobs name bare commands or expect `stalled`; a startup sweep that reaps orphaned `dr-*` containers and networks and stale run and scratch dirs moves into Task 3 (the runner cannot clean up after SIGKILL). |
| 3 | done | `a7e655fd`..`9a00bb18` | impl sonnet ~1.0M subagent tokens incl. fix round; review ~94k plus re-read; live reader runs about 69k counted | Accepted after one fix round (the sweep reaped live runs, missed the `docs-and-binary` stem, and the tarball cache key omitted the shipped `files`; plus the Zone row was a weak pass). Scratch site scaffolded with the setup command's own functions over `templates/waymark`, deployed as version `9d591b21`, repo HEAD `5ed23f8b`; the interactive App chapter was skipped (the site reuses installation `135372268`); `APP_DB`, `MEDIA_BUCKET`, and `send_email` were dropped. `cairn auth check` under the scoped tokens: Workers Scripts, Zone (weak: zero zones), and Metadata pass; Builds Configuration and Observability fail as expected (so `cairn logs` fails); Zone Settings, DNS, and Email Sending skip. `auth set` is refused by the allowlist and, independently, by the container's missing keyring. The host CLI moved to 2.1.281 mid-pass; the baseline is keyed per version and fails closed on drift. Clock: implementer 56 min for six deliverables, fix round 23 min (Task 2's was 80). Carry to Task 4 preparation: a failed token mint stays cached and is never retried (retry on rejection); a folder without a marker counts as dead (write the marker by temp and rename); labeled containers whose run dir is gone are not reaped. |
| checkpoint 1 | done | — | — | Segment 1 closed; per-run cost for Task 4's estimate: warm docs-only about 4k counted, repository about 10k, docs-and-site about 12k, docs-and-binary about 12k, plus about 3.3k per batch token check. |
| 4 pre-flight | done | — | one sonnet agent | Claims hold except two. (a) Pass A's 14 defects are not itemized anywhere: HISTORY records 15 verifier findings (13 closed by redraft, one the parser's own error) plus 3 from a later read, and the pages at `3bfaac37` (`docs/reference/cli-cairn-json-output.md`), `3453668f` (`cli-cairn-doctor.md`), `29a03eff` (`cli-cairn-exit-codes.md`). Ruling: one `claude-opus-5-5` agent at `high` reconstructs the itemized list from the fix diffs and HISTORY, never from reader runs (scoring readers against a reader-made list is circular), records the real count, and splits it with a recorded seed before the scripter runs. (b) `docs/admin/is-it-working.md` documents `cairn doctor`, which needs a site directory. Ruling: the docs-and-binary prepared dir gets a `git archive` copy of `glw907/cairn-scratch-b` at `5ed23f8b`; the job uses a natural `doctor` condition if one exists, else one planted change in the per-run copy, recorded. Pinned choices: batch writer drafts job texts to a template (real task, bare commands, stated done signal) and the conductor reads them before launch; "found" means the defect's subject appears in a stall, an `assumed[]` entry, a check, or the report text, confirmed by the record writer against the ground truth; rot script at `scripts/docs-readers/rot.ts`, test `src/tests/unit/docs-readers-rot.test.ts`; `aborted` and `error` jobs rerun once, then count as failures in the record; the scripter's three pages go into one repository-class export as three subdirectories, each page from its own commit; concurrency 4; no site-round logs exist. Cost estimate: real jobs are heavier than smoke runs, so about 5x the warm figures, about 380k counted per round, 1.15M for three rounds, plus about 1.3M for the four agents: about 2.5M for Task 4. Spend so far is uncertain: subagent totals include cache reads, which the counting rule excludes, so they overstate; an upper bound puts spend near 5M, leaving at least 7M. |
| 4 prep | done | `0e7f4eb9`, `1a163d85`..`78f6b6be` | impl sonnet ~1.34M subagent tokens over three rounds; ground truth opus ~134k; reviews ~295k | Ground truth (`0e7f4eb9`, from pass A's surviving scratchpad and the fix diffs): 19 scripter-visible defects, not the spec's 14, which was the verifier's ranked summary that merged or left out five; split by `sha256("docs-reset-baseline"+id)`, tuning D02 D04 D05 D07 D11 D13 D14 D15 D17 D19, held out D01 D03 D06 D08 D09 D10 D12 D16 D18. The json-output page was tested at `29a03eff`, not `3bfaac37`. Spec correction for the close: "14 page defects" is 19. Preparation accepted after one fix round (designer and extender docs sets dropped linked pages, now derived-and-tested; the orphan reap could kill a live or cross-cache-root run, now owner-labelled; two vacuous sweep tests). Conductor rulings: the core-developer export installs dependencies at preparation (`npm ci`) and says so, since a stall on `npm install` measures the harness; repository exports exclude `scripts/docs-readers/`; the core-developer tree keeps the repo's own `CLAUDE.md` files, which `--safe-mode` never loads (reviewer verified in 2.1.281). Operator condition is natural: `cairn doctor` on the scratch checkout fails `config.bindings-missing` (no `send_email`), covered by `is-it-working.md`. Rot: 16 of 63 anchored `Source:` pointers (25.4%) are off their cited line, so Task 6 builds symbol-anchored sources for `src/`. The scripter job writes its wrapper and parser without executing them (the repository class cannot run arbitrary scripts). Batch launched 2026-09-23 about 20:22, concurrency 4, budget 1.5M. |
| 4 batch | run | — | 742k counted, 7.7M cache read | Batch ran 20:18 to 20:28 (10 min at concurrency 4), `stopReason: complete`, teardown clean. 9 of 18 reports unverified (evaluator-2, -3; operator-1, -2, -3; designer-1; extender-3; scripter-2, -3), which fails Task 4's "every report verified"; a Sonnet diagnosis classifies each as harness, reader, or job-design before any rerun, and harness defects are re-verified offline from the saved transcripts. |
| 4 record | reviewed | `274c257e` | writer opus ~220k; review ~180k; adjudicator opus ~128k | Record written; diff-reviewer escalated four verdicts; an Opus 5.5 adjudicator (the Agent tool cannot set `xhigh`, a recorded deviation) upheld all four as defer with traced reasons: Task 6 reverse mode (F1, R4, F3 are page-vs-code drift that no brief-citation index sees; Task 10's title check catches F1 and R4); "editor reports every finding" (pass A's triad was reported non-blocking in round 2 and dropped by the conductor's blocking-only round-3 prompt, the applied-findings class); the separate filter (no finding contradicted the register or brief); Task 8's profile skill (pass A's drafter already received its profile verbatim). Conductor rulings: the five final attempts still unverified after one rerun are excluded from docs evidence, a recorded deviation from "every report verified"; Task 5 gains the acceptance bullet "`check:facts` is green inside a repository-class export" (the Task 2 carry-forward, `front-door.md:26`, `:50`, `:108`); Task 6's `--cited-by` bullet and the second half of Review focus 5 are struck; spec amendment for the close: pass 2a defines the profile-file format with the profiles, and folds go to the profile files and the drafter agent; Task 9 passes the profile and exemplars in the drafter's dispatch prompt. Record corrections in flight. Verdicts: build Tasks 5, 6 (minus reverse mode and the `tool/` resolver), 7, 8 (drafter agent and v2 default only), 10 (scoped); chain changes build `sentences` plus `check:provenance`, Vale and `tellgrader` to the editor, the omission checklist, the applied-findings read, profile grader removed, the reader stage, the two-round cap; defer everything else. |
| seg 3 pre-flight | done | — | one sonnet agent | Drift: 182 candidates and 135 sourced only to a page (plan said 179 and 134); `[vendor-figure]` means the `[vendor]` tag; the profile grader is an inline prompt in `docs-page-chain.js:188`, not an agent. Pinned choices. Task 5: ids are `f:` plus 6 lowercase base36 characters from `crypto.randomBytes`, minted by an exported `mintFactId` in `check-facts.mjs` with a `--mint` CLI flag the README names; no ids on Harvest or Provenance bullets; the migration is idempotent; `check:facts` skips a pointer under `docs/internal/record/` only when that directory is absent (the export case) and fails when it exists but the file is missing. Task 6: brief `{ page, sentences: [{ text, id | "no-claim" }] }` at `docs/internal/briefs/<track>/<page>.json`; a deterministic regex extractor with a documented miss list; `src/` symbol anchors as `path#Symbol` resolved by the TypeScript compiler API; the owner tier is `front-door.md`'s owner-brief-sourced bullets. Task 7: one Sonnet agent per container file, each writing its own disposition slice file, merged by the conductor, then the one Opus read; a bullet that is both owner-tier and candidate belongs to lane A. Task 8: agent without `skills:`, profile and exemplars arrive in the dispatch prompt, no template. Task 9: the two stages hand off through a JSON file the second run takes as an arg; a text-only final turn is its report. Task 10: harness under `scripts/docs-readers/harness/`; a state-changing command is checked against `cairn <cmd> --help`, never run; the title check pairs each jump-list title with its condition id's `title` in `tool/internal/spine/conditions.json`; the quote-aware Bash split fix at `transcript.ts:298` lands here; Doc Detective 4.38.1. Shared files: lanes A and B both edit the container files (lane B merges after A, conductor checks `front-door.md`), lanes A and D both add `package.json` scripts. |
| 4 done | done | `274c257e`, `433ae6b4` | — | Record corrected after review and adjudication (F6 added: CONTRIBUTING omits the showcase install that CI does). Conductor ruling on the record writer's open point: the chain change "Vale and `tellgrader` output fed to the register editor" is now DEFER, since its only stated failure ("the bar rises on each read") is a conductor gloss the adjudication found no withheld finding behind; Task 9 builds six chain changes, not seven. Conduct miss for the close: the conductor's `git commit -a` swept the record writer's uncommitted rewrap into `1cbf8076` (harmless here); from now on the conductor commits named files only while an agent works in the same worktree. Lanes launched 2026-09-23 about 22:25: A (Task 5, `docs-reset-facts`), C (Task 8, `~/.dotfiles`), D (Task 10, `docs-reset-harness`); B (Task 7) starts on Task 5's commit. |
| 8 | done | dotfiles `2a2c9e4` (unpushed: three older foreign commits sit ahead of `origin/main`) | impl sonnet ~157k; review ~? | Accepted first round. `cairn-docs-drafter` (Opus 5.5, `effort: high`, no `skills:`, five prompt rules, profile and exemplars in the dispatch prompt) and `docs-page-chain-v2.js` (differs from v1 only in the `drafterType` default and its doc text); v1 untouched. The init tool list omits Grep and Glob because 2.1.281 routes search through Bash whenever Bash is granted, not a frontmatter fault. Carry to Task 9: the agent description should say "the v2 page chain", and its closing section repeats the `<example>` instructions. For Geoff's morning read: `~/.claude/CLAUDE.md` is about 7.2k tokens against its hook's 6k budget, which predates this pass. |
| 9 | code accepted; dry run pending Task 6 | dotfiles `61dc7d0`, `dbcc7cc`, `914f0a6` (unpushed) | sonnet ~351k; opus fix ~178k; reviews ~? | First build dropped v1's fact read (restored on conductor correction: it caught pass A's P1) and put the handoff in the site's docs tree (moved to `$XDG_CACHE_HOME/docs-page-chain/handoffs/`). Review then found eight stage-2 wiring breaks that the fixture harness hid by hand-building a stage-2 input shape stage 1 never produced; an Opus fix round closed all eight (harness now 20 checks, every stage-2 fixture uses stage 1's captured handoff, stub outputs validated against their schemas). Reader job ids are `<pageId>--<n>` (the runner's id pattern forbids colons). Built: `check:provenance` in the page gate, the omission checklist, the applied-findings read (the script's own blocking flags, per finding id), profile grader removed, two stages around the reader runner, the one-redraft cap, the profile and exemplars in the drafter prompt; the fact read and v1's gate kept. Carry to the dry run: validate page ids against the runner's full id pattern; say in the header that runner-caused aborts can be struck; check exemplar text survives the handoff verbatim. |
| 5 | done | `f3cbc9c9`..`d7f7169c` on `docs-reset-facts` | sonnet ~224k; review ~66k | Accepted first round. 810 facts carry `f:` ids, all unique; the word diff is id insertions only; the migration is idempotent; `check:facts` is green inside a repository export, and the record-dir skip cannot mask a broken pointer in the real repository. |
| 6 | done | `eb08be12`..`298a7e54` on `docs-reset-facts` | opus ~274k over two rounds; review ~120k | Accepted after one fix round (fences indented under a list item were read as page prose). Built `check:provenance` (per-sentence fact check, page coverage, uncitable tags), the briefs README, `path#Symbol` anchors for `src/` (10 of 14 off-line pointers migrated; 4 Svelte ones cannot be anchored; rot now 6 of 53), owner-tier key phrases checked verbatim. Conductor rulings: lane A retagged the owner-tier candidates (8 verified against owner-brief lines, 4 excluded); `check:provenance` runs in CI. Reverse mode and the `tool/` resolver are filed in ROADMAP with triggers. For the close: amend the docs-standard spec's provenance line to the per-sentence reading; Geoff's owner brief `what-cairn-is-and-is-not.md:49` says "all 28 registered rules" and the audit now has 36 rule modules. |
| 7 | done | `368d1ebc` on `docs-reset-triage` | five sonnet triage agents ~920k; Opus read and assembly ~? | 159 candidates triaged (the pre-flight's 135 counted one tag wording; 11 owner-tier bullets went to lane A): 137 retained on code sources, 2 rejected with proving code lines (admin `f:n68dn6`, `cairn-admin.ts:232,251,260`; reference `f:7l8ysb`, one real `register="outline"` use at `EditPage.svelte:1456`, its true half refiled as `f:hdebf7`), 20 excluded. The Opus read upheld both rejects, excluded two retains whose support was not code, re-sourced two to code, qualified six overstated tags, split a vendor price into `f:wxe8fc`, confirmed five claim-text corrections, and spot-checked about 55 anchors. Record: `docs/internal/record/2026-09-23-candidate-dispositions.md`. Flagged for the close or Geoff: `front-door.md` `f:ab9kzr` says the published version is `0.96.0` (package.json says `0.97.0`); `extend.md` `f:75hawi` free-tier claim is probably docs drift; `docs/why-cairn.md:41` contradicts its own line 84. |
| 10 | done | `5a9ae82b`..`23eb059c` on `docs-reset-harness` | sonnet ~476k over three rounds; reviews ~100k | Accepted after one fix round plus two silent-pass follow-ups. Doc Detective spiked and rejected (it needs published-page annotations and duplicates the runner's confinement; `docs/internal/record/2026-09-23-doc-detective-spike.md`). Harness under `scripts/docs-readers/harness/`: runs fenced `cairn` procedures on `docs/admin/` pages in the docs-and-binary container (today only `is-it-working.md` has one); a state-changing command is checked via `--help` only; pass means non-empty stdout with no cobra help block and, for `cairn doctor`, its tally line (the tool exits 0 to 3 on a real verdict). The title check pairs only within a jump-list item and compares only the 11 conditions `cairn doctor` raises (derived from the Go sources; throws on an unresolved or empty set); on today's `is-it-working.md` it finds exactly 13 real drift lines (it first reported 30, 17 of them false). `run-live.ts` exits nonzero on any failure. The quote-aware Bash split landed. Filed: health-only and no-command titles on the page match nothing any report prints; inline prose commands count once pages adopt fences. |
| lane merge | done | `f0b6787f`, `3809181d`, `28617164` | merge sonnet ~99k; cross-lane review ~47k | Lanes A, B, D merged into `docs-reset-system` in that order; nine adjacent-hunk conflicts in `extend.md` and `front-door.md`, each resolved to the one lane that changed the bullet. The cross-lane review compared all 812 ids at base, both lane tips, and HEAD: 628 unchanged, 23 lane A only, 161 lane B only, none changed by both, none damaged. 810 facts, all ids unique; light gate green (305 tests); gitleaks over `d971c976..HEAD` clean. Lane C stays in `~/.dotfiles`. |
| 9 dry run | done (acceptance met); fix round in flight | scratch branch `docs-reset-dryrun` (never merges) | stage 1 ~476k; readers 37k counted; stage 2 ~468k | Both stages ran end to end on a new scratch page (`docs/admin/dryrun-is-it-working.md`): stage 1 (drafter, gate, editor and fact read) handed off 25 findings and 3 reader jobs in 14 min; the runner ran them (docs-only class, a dry-run choice); stage 2 redrafted, the gate went green (172 sentences, 143 cited), the applied read caught 2 new blocking issues, and the page escalated rather than taking a third round. The runner's reports reached the redraft. Two design gaps found and sent to one Task 9 fix round: (1) the drafter filed 15 new facts as candidates and cited them in 110 sentences, `check:provenance` rejected all 110, and no stage traced them, so the stage-2 redraft retagged 19 facts [verified] itself (the chain grading its own citations); the fix gives tracing and retagging to the independent fact read; (2) reader jobs needing a shell ran as docs-only readers and their harness stalls reached the redraft as blocking; the fix makes each proposed reader job carry its class. The dry run also showed fact ids surviving a merge: the brief's ids resolved unchanged after merging the triaged container. |
| 11 pre-flight | done | — | one sonnet agent | Claims hold. Conductor rulings made BEFORE any validation run (pre-registered, not fitted to results): (1) line verification accepts a quote whose text sits within one line of its cited line, either direction; a miss of two or more lines, a paraphrase given as a quote, or a wrong file still fails; the report request also asks readers to cite the line number the Read tool prints beside the quote's first words. The check's purpose (the reader saw real text on that page) is kept; the tolerance absorbs the counting habit behind 14 of the baseline's 18 bad quotes. (2) An unverified final attempt gets one rerun before scoring, and a run still unverified does not count toward "2 of 3". (3) Planted copies live outside the repository at `$XDG_CACHE_HOME/docs-readers/planted/<job>/<page path>` and replace the original only inside that job's prepared directory; published pages are never edited; the plant record is `docs/internal/record/2026-09-23-docs-reset-planted-defects.md` (excluded from repository exports). (4) Planted jobs are the six baseline jobs; controls are the same six jobs on unmodified pages; each runs three times (two `claude-opus-5-5`, one `claude-sonnet-5`); the scripter's held-out scoring uses the baseline record's ground truth and rule. (5) "Caught" means the defect's specific subject appears in a stall, `assumed[]`, a check, or the report text, confirmed against the plant record by the scoring read, never the planter or the reader. (6) A control-page finding is a false positive unless it matches a baseline failure (F1 to F6, R1 to R4) by page and line, or the one Opus read confirms it as a real defect. Cost estimate: about 36 runs at 30k to 60k counted, 1.1M to 2.2M, plus the planter, the preparation, the scoring read, and one possible tuning round, about 2M to 3.5M in all. |
| 9 | done | dotfiles `61dc7d0`..`927a510` (unpushed) plus cairn-cms `check:provenance -- <brief>` (in flight) | four implementer rounds (sonnet, then opus x3) ~1.2M; reviews ~500k | Accepted after the dry run and two more rounds. The dry run's gaps are closed: the drafter and redraft file facts only as [candidate] and never retag; the independent fact read (stage 1) and applied read (stage 2) trace and retag them; each page's gate runs after those reads and checks only its own brief; both reads compare every fact the page cites against HEAD and flag and restore any tag change no read reported; reader jobs carry their class. Conductor decision on the third blocking round (a second `fix`-class verdict on this task): one more round, since the findings were consequences of the dry-run fixes and precisely specified. Carry-forward to pass 2b (the first multi-page run): a stage-1 read on page A can undo a legitimate retag by page B's read in the same run when A cites B's newly filed fact; share each run's retag list across its pages. |
| 11 prep | done | plant record `1099ab8f`; `cec4f391`..`c76b34e0`; `check:provenance` per-brief `43e316ab` | planter opus ~148k; prep sonnet ~630k over three rounds; reviews ~90k | 17 defects planted across 8 page copies by an Opus planter blind to readers (record excluded from repository exports; the conductor has not read it). Built the pre-registered one-line citation tolerance, the report-contract wording, the planted overlay, and `batches/validation.json` (39 jobs: six jobs planted and control, three runs each, plus three scripter held-out runs; texts byte-identical to baseline). Two silent-miss defects caught before any run: the docs-only evaluator would have read the unplanted repo page (fixed by an optional `prepared` source for docs-set jobs), and the scripter's plants landed outside its bundle subdirectories so its readers saw unplanted pages (caught by a conductor byte check on the built directories after tests, gate, and review had all passed; fixed with a bundle-aware overlay and a guard that throws when a plant's target is absent). A final byte check confirms all eight planted files reach their readers' pages and differ from control. Validation batch launched 2026-09-24 about 00:12. |
| 11 | FAILED; paused for Geoff before the fix round | record `4f69a52b` (`docs/internal/record/2026-09-23-docs-reset-validation.md`) | batch 1.40M counted plus rerun 0.35M; scoring opus ~? | All four classes fail Task 11's bar (only the replay bar passes). Plants: docs-only pass; docs-and-binary misses P04, P05; docs-and-site misses P06, P07, P08, P10; repository misses P12, P14. Held-out: 1 of 9 caught (D18). Baseline failures on control pages: F5 and F3 missed. False positives: 9, 4, 12, 23 against a cap of 3 (35 of 48 come only from `ruleCandidates[]`). Every miss comes from verified Opus runs; the plants missed sit off the path each job takes. Reliability: Opus 26 of 26 final attempts verified, Sonnet 8 of 13. Readers did find real defects on control pages (seven in the scripter pages). Conductor decision: pause before the plan's one fix round, because that round (tuning on the tuning half only) cannot address these failures (only the scripter has a tuning set; the misses trace to the validation design, blind plants anywhere on a page versus readers doing one job, and the false positives to counting rule candidates as findings); changing where plants go or how findings count after seeing results would be post-hoc. This is a method decision for Geoff; options and a recommendation are in STATUS. |
| decision | Geoff, 2026-09-24 | — | — | Geoff chose option (b) in a fresh pass, with pass 1 closed first. Sequence: (1) close pass 1 now through Task 12, recording Task 11 as a failed validation of the original design (the built system is reviewed and sound; the failure is a finding about the method); (2) pass 1b, a validation redesign: brainstorm, then a pre-registered plan, then a rerun on the merged system; (3) pass 2a only after pass 1b passes. Pass 1b's open design questions: "on path" conflicts with the planter's blindness (candidate: derive each job's path from the pages baseline readers actually opened); counting rule candidates apart from findings needs a new pre-registered false-positive cap; the bar may belong in terms of what a job tester should catch rather than exhaustive detection; Sonnet readers verified 8 of 13, so decide whether runs stay two Opus plus one Sonnet. Task 12 as amended: skip the plan's "Validation" pass condition; record the failed validation in HISTORY, the post-mortem, and ROADMAP; name pass 1b as the next action. |
| 12 | fold done; diff-reviewer read and merge pending | `76ddff28` (merge of `main`), then the fold commits on `docs-reset-system` | fold agent opus, one session (figure in the conductor's `/cost`) | Merged `main` into the branch (no conflict). Amended both specs (six docs reset corrections; the docs-standard provenance line now reads per sentence, as built). Filed the pass's deferrals to `ROADMAP.md` (the docs reset in Now with pass 1b; the deferred chain and harness items, the Waymark theme comments, and the readers' real page defects in Next) and deleted the finished page-only candidate entry; the friction log's whole-log triage found no open entry. Facts and briefs READMEs current. HISTORY entry and this post-mortem written. STATUS names pass 1b. The facts id migration re-ran as the last content commit. The plan's "Validation" pass condition was skipped, per the decision row. Post-merge steps stay with the conductor: the id rule in the shared agent definitions, any `cairn-register-editor` change, the `~/.dotfiles` push, and `claude-tooling-sync verify`. |

## Post-mortem (2026-09-24)

**Built.** Every component Task 4's record ruled build. The reader runner and four confined reader
classes (Tasks 1 to 3), with the scratch site and scoped tokens behind the operator class. The
baseline failure record (Task 4). Fact ids on all 810 bullets (Task 5). `check:provenance`, page
briefs, owner-tier key phrases, and `path#Symbol` anchors for `src/` (Task 6). The candidate
triage, 159 bullets (Task 7). The `cairn-docs-drafter` agent and the v2 page chain in `~/.dotfiles`
(Tasks 8 and 9). The docs-as-tests harness for `docs/admin/` procedures (Task 10). The validation
batch, its planted and control pages, and its regression batch (Task 11).

**Verified, with evidence.** Each build task passed its light gate and a `diff-reviewer` accept,
recorded in its ledger row. The escape suite ran live against each class, with transcripts attached
to the task reports. The lane merge's cross-lane review compared all 812 ids at base, both lane
tips, and HEAD, and found none damaged. Task 9's dry run completed both stages on a scratch page,
with the runner's reports reaching the redraft. The regression batch replays (validation record,
Bar 5). The close ran `check:docs`, `check:facts`, `check:arm-indexes`, `check:reference`, and the
full heavy gate; their results are in the fold agent's report to the conductor.

**Decisions locked.**

- Readers run confined in podman under `env -i` with a plan token, and the container plus scoped
  tokens are the boundary, since the CLI auto-allows read-only Bash in its working directory.
- A fact id is opaque, minted once, and never changes with the bullet's text.
- `check:provenance` judges each sentence against the bullet it cites.
- The page chain's drafter and redraft file new facts only as `[candidate]`. The independent fact
  read and applied read trace and retag them.
- Pass 2a defines the profile-file format with the profiles. The drafter ships without a
  `skills:` preload.
- Deferred with no recorded failure behind them: the reverse mode, the Go resolver, five chain
  changes, and two harness scopes. Each is filed in `ROADMAP.md` with a trigger.

**The failed validation.** Task 11 failed every class on its original design
(`docs/internal/record/2026-09-23-docs-reset-validation.md`). The built system is reviewed and
sound. The failure is a finding about the method: blind plants anywhere on a page against readers
doing one job, and rule candidates counted as findings. Geoff ruled on 2026-09-24 to close pass 1
without the "Validation" pass condition and run pass 1b, a validation redesign with a
pre-registered plan and a rerun on the merged system, before pass 2a. Pass 1b's open questions are
in the "decision" row above and in `ROADMAP.md`'s Now tier.

**Blockers and carried items.** No blocker remains for pass 1b. Carried to STATUS as open items for
Geoff: the owner brief's "all 28 registered rules" (`what-cairn-is-and-is-not.md:49`) against 36
rule modules; the stale facts `f:ab9kzr` (published version `0.96.0`) and `f:75hawi` (the
free-tier claim), and `docs/why-cairn.md:41` against its own line 84; the unpushed `~/.dotfiles`
commits; the earlier Cloudflare token mints to revoke; and the global `CLAUDE.md` over its 6k
budget. The scratch site stands through pass 2a, with its teardown in the scratch-site record.

**Planning misses and budgets.** 12 planning misses and 4 execution sittings, itemized in
`docs/HISTORY.md`'s pass 1 entry. Tokens: about 9M counted by the conductor's estimate, against a
16M ceiling raised from 12M.
