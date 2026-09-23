# Review: the docs reset spec against repo reality

Artifact: `docs/superpowers/specs/2026-09-23-docs-reset-design.md` (cited as `spec:N`). Lens:
feasibility, internal consistency, rule conflicts, plannability. Reviewer: Opus 5.5, read-only.

## Critical

**C1. The structural reader ceiling (`spec:67-68`, `spec:89-91`) cannot be enforced by the
mechanism the chain uses.**
- The Workflow `agent()` call takes only label, phase, schema, model, effort, isolation, and
  agentType. It has no cwd option, and the script has no filesystem access, so the runner cannot
  prepare or tear down a directory itself.
- Workflow and Agent subagents get the session's `CLAUDE.md` files injected. Here that is the
  cairn-cms `CLAUDE.md` plus the global one, and both describe cairn at length.
- `Read` and `Glob` accept absolute paths. A `tools:` list in an agent definition limits which
  tools the reader has. It does not limit which paths it can open.
- The clean isolation path is a headless `claude -p --bare` run from the prepared directory, since
  `--bare` skips CLAUDE.md discovery and auto-memory. Its help text says "Anthropic auth is
  strictly ANTHROPIC_API_KEY or apiKeyHelper (OAuth and keychain are never read)". That moves
  readers off the Max pool and onto API billing, and neither the budgets nor the tooling doc
  covers it. Such a run also escapes `budget.spent()`.
- `--restricted` removes Bash, which the binary reader needs.

**Fix:** state the isolation mechanism and its billing as a pass 1 decision. Options: a
`claude -p` launched from the prepared directory with `--setting-sources` excluding user and
project, plus deny rules, or an OS sandbox such as bwrap. Add a pass 1 acceptance test in which
a reader tries to `Read` a known repo path and fails. Budget the readers' tokens explicitly.

**C2. The `cairn` binary reader has no offline mode.** `tool/internal/providers/cloudflare.go:15-19`
reads "There is no base-URL variable and no environment override … the RoundTripper passed to
NewCloudflare is this client's only test seam". `github.go:19` pins `api.github.com` the same way.
The fixtures in `tool/internal/render/fixtures/fixtures.go:1-3` are test-only.
- Without real `CAIRN_*` tokens, the binary reader can exercise only `help`, `doctor` on a
  checkout, `sites` (through `CAIRN_STATE_DIR`), and `auth check` skip lines.
- Pass B's literal walk used real tokens against a real scratch site (`draft-docs-plans`, pass B
  plan lines 270-308).
- `spec:217-218` leaves this open as if it were a detail. The answer is either a tool code change
  (a fake-API build tag, which means scope in `tool/`, the tool gate, and possibly a tool release)
  or a scoped real read token. The operator trial page (`schedule-a-check`, `spec:135`) depends
  on it.

**Fix:** rule in the spec: (a) scoped real read-only tokens against a scratch site, sourced
through the age store, or (b) a named `tool/` task adding an env-gated API base, marked as
touching a released binary.

**C3. The trial's inputs do not exist when the trial runs.** The trial (`spec:134-143`) precedes
the jobs ledger and the outline (`spec:144-151`), and the per-page harvest is out of scope
(`spec:202`).
- The container holds one scheduler bullet (`docs/internal/facts/admin.md:106-109`). All of them
  cite `tool/docs/tripwire.md`, an old page that ruling 1 bars (`spec:35-37`). The per-platform
  steps live only there.
- "Theme" appears in 11 extend bullets and "chassis" in 10. No bullet describes a site designer's
  theme task.
- The draft-docs spec measured the container at 40 percent of actionable claims on two admin
  pages (`2026-09-21-draft-docs-design.md`, "How a page gets made").
- The trial pages also have no page contracts, since contracts come from the outline, and no jobs
  or done signals, since those come from the ledger.
- The trial therefore measures arm P against arm O on hand-invented contracts over thin facts.
  Fact holes will dominate the stalls.

**Fix:** add a trial-prep stage: a scoped harvest for the three pages, including a sanctioned
mining read of `tool/docs/tripwire.md`, plus hand-authored trial contracts to the `spec:158-173`
shape, with named paths for the theme guide and the building-blocks page. Otherwise move the
trial after the ledger.

## Major

**M1. The budgets contradict the repo's own record.**
- Pass A had a 3.5M ceiling and spent about 6.1M on 12 tasks and two pages, with the chain alone
  at 2.64M (`docs/superpowers/plans/2026-09-21-draft-docs-pass-a.md:476,489,509`).
- Other passes: `docs/HISTORY.md:225` (6.1M against 3.5M), `:302` (4.7M against 2.4M), and `:439`
  (a 14M ceiling raised six times to 28.5M).
- Pass 1 at 3M (`spec:209`) holds seven components, four of them new agents, a chain rewrite, an
  810-bullet ID migration, a harness, and validation across four classes and N planted pages. At
  typical chain costs of implementer plus diff-reviewer plus gate, the build alone reaches 3M
  before validation runs.
- The trial has 3 pages × (2 P drafts + 2 O drafts × 2 efforts) = about 18 drafts, 36 reader
  runs, 18 grader runs, and redraft rounds "to clear the reader". Against 900K per page in pass A,
  5M does not cover it.

**Fix:** re-derive the budgets from HISTORY's per-task numbers, or cut the trial matrix and state
the cut, for example one draft per arm and an effort comparison on one page.

**M2. The spec never disposes of the 2026-09-08 docs-standard spec and cites an artifact that
does not exist.**
- The page contract names "page type from the nine-type registry" (`spec:164`). That registry
  exists only in `2026-09-08-docs-standard-design.md:237-270`, whose toolset "never ran, and this
  initiative does not build it" (`2026-09-21-draft-docs-design.md`, Rulings, "Working drafts").
- The live register has five anatomies (`docs/internal/docs-register.md:232-258`).
- That spec already designed claim IDs as `check:provenance` (docs-standard `:567-586`): a
  per-sentence ID list in a sidecar brief, "Ids never appear in the published markdown", with
  unique IDs enforced by `check:ledger`. It also designed staged per-track delivery with tuning
  checkpoints (`:777-803`) and a reader test (`:636-642`).
- `spec:191-198` supersedes only the draft-docs sections and the 08-14 and 08-15 records.

**Fix:** add a ruling saying which parts of the docs-standard spec are superseded or adopted.
Replace "nine-type registry" with the register's anatomies, or make the registry a pass 2
deliverable. Evaluate the sidecar design against "strip IDs at the gate" (`spec:100-101`).

**M3. The pinned-anchor inventory (`spec:180-183`) misses most readers of arm paths.**
- 13 gate scripts hardcode the arm directories (for example `check-snippets.mjs:47`,
  `transcript-blocks.mjs:23`, `check-package-files.mjs:66-82`, `docs-links.mjs`,
  `check-visuals.mjs`, `check-editor-quotes.mjs`, `check-readiness.mjs`, and
  `reference-coverage.mjs`).
- `package.json:190-203` `files` ships exactly the four arms, and cairn.pub renders docs only from
  the tarball.
- `.vale.ini` maps styles by track directory.
- `claude/CLAUDE.md` and the skills carry 15 arm-page links.
- Released binaries embed `cairn.pub/docs/reference/cli-cairn-*` URLs (`tool/cmd/cairn/messages.go:82-84,256-258`).
  Those URLs cannot change, so a structure that moves them needs cairn.pub redirects, and
  cairn.pub is out of scope (`spec:203`).
- The schema `$id`s froze at 1.0 (draft-docs Rulings, "Schemas ship with the docs").

**Fix:** widen the inventory to "every reader of a docs path: gates, `files`, Vale, the tarball
consumer, shipped guidance, and URLs in released binaries". Add an outline constraint: a path in
a released binary or a frozen `$id` either keeps its location or gets a named redirect owner.

**M4. The facts-ID migration has conflicts the spec does not surface.**
- The container holds 810 facts across 5 files (`check:facts` output: 86, 83, 335, 42, and 264),
  grouped under 79 old-page headings (`## docs/extend/…`).
- The grammar forbids any bracket outside a code span except the trailing tag
  (`docs/internal/facts/README.md:19-26`, `check-facts.mjs` `checkTag`), which rules out a `[F-12]`
  form.
- Every agent that files bullets must mint IDs. That includes the chain drafter
  (`docs-page-chain.js:166-167`), site-pass engine-docs fixes (README `:88-91`), and every pass
  under "Documentation is a pass dimension". Parallel worktrees collide on sequential numbers.
- Page-derived IDs break when pages retire.
- The README defers a filing command "until the shape has stopped moving" (`:107-110`), and the
  draft-docs `[vendor-figure]` tag ruling never landed in `TAG_VOCABULARY`.

**Fix:** require opaque, collision-free IDs in a non-bracket form. Put the rule where filing
happens: the README, the `cairn-implementer` and drafter definitions, and `site-pass`.

**M5. The trial's grader comparison contradicts pass 1's chain.**
- Pass 1 replaces the profile grader with the reader test (`spec:101-102`), yet the trial runs
  "the current profile grader … unchanged" and decides whether the reader replaces it
  (`spec:140-143`). That decision is already taken in pass 1.
- The evidence keeps a grader "for register and tone only, with an explicit omission checklist"
  (`spec:63-64`), and no pass 1 component builds that checklist.

**Fix:** keep the old grader invocable as a trial-only step and make the chain swap conditional
on the trial. Otherwise drop the grader comparison. Assign the omission checklist to a component.

**M6. Site-round and freeze sequencing are unruled.**
- The project `CLAUDE.md` and the facts README (`:72-86`) put the docs rebuild after the site
  round. They also have site passes fix frozen pages in place.
- The draft-docs order had pass C closing before the site round (`2026-09-21-draft-docs-design.md:28-31`).
- The reset replans B and C (`spec:195-196`) but does not say whether the site round waits. It
  also does not say whether in-place fixes continue on pages the retirement map will retire.
- The docs-infra currency pass, which moves the docs sections of `CLAUDE.md` into
  `.claude/rules/`, has not run (no `.claude/rules/`). The owner-stop-3 PR edits that same section
  (`spec:191`).

**Fix:** add a sequencing ruling covering the site round, the freeze, docs-infra, and the
`0.97.0` cut.

**M7. Pass 2 is seven stages with three owner stops in one pass** (`spec:115-156`). The
workstation rule segments a pass at three to four tasks, and the trial is an experiment whose
result can change the rest.

**Fix:** split into 2a (audience record, review, trial) and 2b (ledger, bake-off, outline, review),
each with its own ceiling.

## Minor

- **The harness is a new build.** `check:snippets` typechecks and `check:transcripts` compares
  recorded fixtures; neither executes a procedure (headers of both). Say "new harness, borrowing
  the marker conventions".
- **"Verified facts survive" (`spec:8`) is ambiguous.** The container holds 179 `[candidate]`
  bullets, 137 of them "sourced to the page only". Rule how those are treated.
- **"The mined skeleton" (`spec:160-162`) needs an owner.** Mining reads the old page, which
  appears to contradict ruling 1. Name who mines and when.
- **The core-developer audience conflicts with the contributor zone.** The zone is "unpublished,
  and Vale does not lint it … nothing … ships in the tarball" (`docs-register.md:343-350`). Rule
  whether the core developer's docs publish.
- **Charter floor.** The audience review should hold large-org profiles to the charter's
  "small editorial team, by default … floor, not a ceiling" (`what-cairn-is-and-is-not.md:36-41`).
- **Missing gates in the chain.** `spec:99-103` omits the docs gate, Vale, `check:reference`,
  and the figure path (`cairn-figure`, `figure-verifier`). State that they carry over.
- **Unnamed model.** "Sonnet 5" (`spec:139`) needs a model ID.
- **Unscheduled human reads.** Human reads for editors and evaluators are "the gold standard"
  (`spec:79-80`), but none is scheduled.

## Plannability: guesses a zero-context planner must make

1. The map from each of the six audiences to one of the four reader classes, in particular the
   extender and the editor.
2. The profiles and pages pass 1 validation runs against, since pass 1 precedes profiles and
   drafters cannot open old pages.
3. The ID syntax, where IDs live (inline or sidecar), and the strip point relative to the fact
   read and the gates.
4. For the applied-findings check: its agent type, model, schema, and action on failure.
5. For the step that filters the register editor's findings: who runs it and by what criteria.
6. For the drafter agent: its tools, whether it replaces `drafterType: cairn-implementer`, and
   its effort setting.
7. The bound on auto-continue.
8. The harness scope: which procedure classes, network or offline, and CI or local lane.
9. The trial pages' paths, contracts, and reader class, plus where scratch pages live.
10. The retirement map's scope: whether `tool/docs/*`, `README.md`, `CONTRIBUTING.md`,
    `claude/`, and `skills/` count.
11. For pass 1: one branch or two (`spec:221`), and who re-stows and verifies tooling.
12. Whether pass 1 runs concurrently with the `0.97.0` cut or after it.
