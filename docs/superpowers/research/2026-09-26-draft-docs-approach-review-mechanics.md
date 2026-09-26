# Draft docs approach, spec review: mechanics and feasibility lens

**Target:** `docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md` at `e00fcf70`.
**Input read:** `docs/internal/record/2026-09-26-docs-approach-handoff.md`.
**Lens:** does every mechanism behave as stated. Every finding below was checked by running the
command or quoting the source on 2026-09-26; nothing is from memory.

**Counts:** 0 blocker, 7 major, 6 minor. One OWNER FORK (M1).

Top finding: `check:procedures` as specified cannot tell a working command from a broken one.
Against `examples/showcase`, `cairn doctor` exits 3, and so do an unknown flag, an unknown
subcommand, and a missing directory (M2).

---

## Major

### M1. The 350K-per-page basis is below the chain's own best case, and the shares do not add up. OWNER FORK

**Location:** spec `:52-63` (stage table and share basis), `:155-160` (stops).

**Evidence.**
- Measured per-agent cost: draft docs pass A's page chain cost "2.64M over 24 agents"
  (`docs/HISTORY.md:415-416`), about 110K per agent. The pages were 1.1K to 3K words
  (`wc -w docs/reference/cli-cairn-*.md`: 1146, 1526, 2967). Extend averages about 1.5K words a
  page (48,670 words over 33 files). `security-model.md` is 5,649 words and
  `build-a-site-by-hand.md` is 3,612.
- Agent count in the new chain (spec `:108-121`). Page inputs is 1, draft 1, and two reviews make 4
  agents when round 1 accepts. With the one redraft and a second review round it is 7. At the
  measured ~110K per agent, that is about 440K on the best path and about 770K on the
  one-redraft path. Neither figure includes planning, the consistency read, or the owner fold.
- Pass A accepted no page in round 1 or 2. "The page chain escalated all three pages after two
  rounds, and each needed a conductor-directed third round" (`docs/HISTORY.md:363-365`). "Three
  rounds per page was the shape that converged" (`:409-410`).
- The spec's own arithmetic. Line 61 says shares "include each pass's planning and close" and
  "start from about 350K per page". Extend: 33 x 350K = 11.55M, against an 11M share, so the
  share sits below its own basis before any overhead. Admin: 9 x 350K = 3.15M of 3.5M. Editors:
  8 x 350K = 2.8M of 3M.
- The shares sum to exactly 20.0M (0.7 + 0.8 + 11 + 3.5 + 3 + 1), with no reserve. Stages 0 to 3
  total 16.0M, which is exactly the 80 percent global stop (`:159-160`). An on-budget run
  therefore hits the global stop at stage 3's close, before editors and the front door.

**Consequence.** At a realistic 500 to 800K per page, the 50 narrative pages alone cost 25 to 40M,
against R2's 20M ceiling. The 25-percent-over stop (`:158`) would fire in stage 2.

**Proposed fold.** State the per-agent basis (pass A's ~110K) and the agent count per path in the
spec. Make the first three extend pages an explicit pilot whose measured cost resets every share
before the rest of stage 2 is planned. Then put the fork to Geoff at spec approval, not at the
80 percent stop:
- (a) Keep 20M and cut scope. Merge or retire extend pages at the outline; the outline already
  lists removals.
- (b) Raise the ceiling to about 30M.
- (c) Thin the chain: drop the second review round and send a second `fix` straight to the
  conductor, which saves about 3 agents on the redraft path.

**Recommendation:** (a) plus the pilot, with (b) as a pre-stated fallback. Also keep a stated
reserve so the 80 percent stop does not coincide with the plan.

### M2. `check:procedures` cannot assert an exit code: everything exits 3 against the showcase

**Location:** spec `:139-146`.

**Evidence** (installed `cairn 1.1.0 (59b920f1)`, repo root):

```
cairn doctor examples/showcase        -> exit=3 (8 passed, 0 failed, 1 skipped, 0 info, 2 unchecked)
cairn doctor examples/showcase --json -> "verdict":"UNKNOWN","exitCode":3
cairn doctor --bogus                  -> exit=3, stderr "cairn: unknown flag: --bogus."
cairn nosuch                          -> exit=3
cairn doctor /nonexistent             -> exit=3
```

The showcase's two UNCHECKED lines are structural. The first is "refusing to read outside the
directory: node_modules/@glw907/cairn-cms/package.json": the showcase links the engine as
`file:../..`, so the path escapes the directory. The second is "could not reach the resolved
origin's /robots.txt": `PUBLIC_ORIGIN` is `http://localhost:4173` (`examples/showcase/wrangler.jsonc:61`),
so the result depends on whether a preview server is listening. `playwright.config.ts:30-31`
starts one on that port. The exit code therefore differs between a CI run and a workstation
that is running e2e.

**Consequence.** An exit-code assertion either hardcodes 3, which passes a broken command, or
fails every run. No docs page states an expected code for the check to take as its oracle.

**Proposed fold.** Add `--json` to the run and validate stdout against
`docs/reference/schema/cairn-doctor.schema.json` (the schema exists). Assert that stderr carries
no `unknown flag` or `unknown command` line. Do not assert the exit code or the verdict.
Document that the showcase is not a clean-verdict fixture.

### M3. The "runs for real" tier has almost nothing to run, and nothing names which commands are read-only

**Location:** spec `:139-146`, and its reliance on `2026-09-23-doc-detective-spike.md`.

**Evidence.**
- No read-only marker exists in the command tree. `grep -rn "Annotations\|readOnly" tool/cmd/cairn/*.go`
  outside the tests returns nothing.
- `cairn health`, `cairn logs`, `cairn sites list`, `cairn adopt list`, and `cairn auth check`
  are read-only, but each needs a registry, keyring credentials, or a live Cloudflare account.
  `cairn doctor --help` states that doctor alone "needs no credential and no adopted site".
- The spike sized the check at "a few dozen lines" because this repo already had the confinement
  primitives. It names a podman image with `cairn` baked in, a scratch-site registry record, and
  the docs-and-binary class's `bashAllowlist`, "already the single source of truth for what is
  read-only" (`docs/internal/record/2026-09-23-doc-detective-spike.md:52-72`). That allowlist
  (`git show origin/docs-reset-2a:scripts/docs-readers/classes/docs-and-binary.json`) ran
  `cairn health*`, `cairn logs*`, and `cairn auth check*` with `CAIRN_CF_READ_TOKEN` and
  `CAIRN_GH_READ_TOKEN` and operator egress. All of it was retired (handoff `:216-218`). The
  spec's "needs no container and no scratch site" therefore drops the premise the sizing
  rested on.
- Today's corpus. Across `docs/admin`, `docs/extend`, and `docs/editors`, the only fenced `cairn`
  command is `cairn doctor`: `is-it-working.md:16`, `add-cairn-to-a-sveltekit-app.md:185`,
  `build-a-site-by-hand.md:657`, and `upgrade-cairn.md:50`. There is also one `+ cairn doctor .`
  transcript line at `is-it-working.md:32`. The admin arm's actual procedures are
  `npx create-cairn-site ...` (`create-your-site.md:24`, `own-your-domain.md:13,134`,
  `setup-recovery.md:17,87`). The spec puts those out of scope ("Fenced commands that are not
  `cairn`").

**Consequence.** Stage 3's "procedures under `check:procedures`" (`:57`) overstates the coverage.
The live tier is `doctor` plus `--help`. The setup command's procedures, which are the admin
arm's core, get no procedure check.

**Proposed fold.** Replace "read-only" with an explicit, committed run-list: `doctor [--json]`,
`--help`, `--version`, and `help agents`. Put every other `cairn` command in the flag-check tier,
and have the check fail on a command it cannot classify. State in the spec that the tier gives
admin pages parse-level coverage only. Decide whether `npx create-cairn-site` flags join the
flag-check tier. `check:symbols` already resolves them against the package's own argument
parser; see minor m3.

### M4. `check:procedures` has no Go toolchain in the CI job it would run in, and locally it proves the installed binary

**Location:** spec `:80` ("runs in the docs gate and CI"), `:139`.

**Evidence.**
- `.github/workflows/test.yml` runs every docs check but sets up only Node. `grep setup-go` finds
  the action only in `tool.yml:62,136`. `test.yml` also carries `paths-ignore: ['tool/**']`
  (`:6,8`), so a flag rename in `tool/` never reruns the docs checks.
- `tool.yml` triggers on `tool/**` and only one arm page, `docs/admin/is-it-working.md`
  (`:13-25`). A docs edit under `docs/extend/` never reaches the Go job.
- `which cairn` resolves to `~/.local/bin/cairn`, which is 1.1.0 and not built from the worktree.
  A check that shells out to `cairn` from PATH proves the installed release, not the branch.
  This is the same trap as the durable gotcha "a worktree showcase silently proves MAIN's
  engine".

**Proposed fold.** Choose one of two paths:
- (a) Build from the worktree (`go build -C tool -o <tmp>/cairn ./cmd/cairn`) and add
  `actions/setup-go` to `test.yml`.
- (b) Implement the live `doctor` run as a Go test in `tool/cmd/cairn`, following the
  `contract_pages_test.go` precedent, and widen `tool.yml`'s `paths` to `docs/admin/**` and
  `docs/extend/**`. For the flag tier, have `make -C tool flags` emit a per-command tree into
  `tool/testdata/`, so the Node side checks `cairn <sub> --flag` pairs with no Go and no
  `--help` scraping.

**Recommendation:** (b). It reuses two existing mechanisms and needs no new CI toolchain.

### M5. `is-it-working.md` heading slugs are a shipped contract that a redirect row cannot carry

**Location:** spec `:86-90` (redirect rows for renames), `:56-57` (admin rebuild).

**Evidence.**
- The released binary prints fragment URLs: `docsBaseAdmin = "https://cairn.pub/docs/admin/"`
  plus a condition's `docsAnchor` (`tool/internal/doctor/report.go:70-80`).
  `report_test.go:230` pins `is-it-working#deploy-the-worker-with-its-bindings`.
  `src/lib/diagnostics/conditions.ts` carries 26 `docsAnchor` lines of the form
  `'is-it-working.md#force-https-at-the-edge'`. `check_referrer.go:36` hardcodes
  `docs/admin/is-it-working.md#scope-a-site-wide-no-referrer-policy`.
- Three gates read those headings: `check:readiness` (`scripts/checks/check-readiness.mjs:3-13`,
  `DOC = 'docs/admin/is-it-working.md'`), `tool/internal/health/fixes_test.go:146-168`, and
  `check:docs` anchors.
- A server redirect never sees a `#fragment`, so a rebuilt page that renames a heading breaks
  every URL the installed 1.1.0 binary prints. No redirect row can repair that.
- The existing chain already supports this through `pinned` slugs
  (`~/.claude/workflows/docs-page-chain.js:32,164`). The spec's chain never mentions it.

**Proposed fold.** Add to the outline step: "list every heading slug a shipped binary, a gate, or
`conditions.ts` names; the chain passes them as `pinned`, and the page keeps them verbatim."
Add `make -C tool check` to the gate of any page carrying pinned slugs. The runner's `toolGate`
already does that.

### M6. Facts filed at page inputs fail `check:provenance` at step 3 unless their tag is specified

**Location:** spec `:108-112` (page inputs files "a sourced container bullet"), `:115-119`
(gate at step 3, fact read at step 4).

**Evidence.**
- `check:provenance` fails "a cited bullet tagged `[candidate]`" (`docs/internal/briefs/README.md`,
  "What the check fails"; `check-provenance.mjs:88`).
- The standing rule says the reverse of what the spec needs. A drafter "files a new fact only as
  `[candidate]` and never retags one. The chain's independent fact read ... traces it to code
  and retags it, so a page never vouches for its own citations"
  (`docs/internal/facts/README.md:76-79`). `cairn-docs-drafter` says the same: "File a new fact
  only as `[candidate]` ... a provenance failure on your own new facts is expected until then"
  (`~/.claude/agents/cairn-docs-drafter.md:66-68`).
- The spec runs the gate (step 3) before the fact read (step 4). If a page-inputs bullet lands as
  `[candidate]`, round 1's gate is red by construction.

**Proposed fold.** Specify the flow. The page-inputs agent traces each new fact to code and files
it `[verified]`. That agent is independent of the drafter, so "a page never vouches for its own
citations" still holds. The step-4 fact read re-confirms it. The drafter files nothing; a missing
fact is a `couldNotDo` for the conductor. Update the facts README "New facts from the page chain"
paragraph and the drafter definition in stage 0.

### M7. Every post-chain edit breaks `check:provenance`, and no step re-syncs the brief

**Location:** spec `:91-97` (consistency read batch fix, owner-note fold), `:147-148` (site round
fixes pages), `:70-72` (site-pass rule).

**Evidence.** The check fails "a sentence on the page that the brief leaves out, or a brief
sentence the page does not carry", and the brief holds "each [sentence] copied exactly as the
markdown writes it" (`docs/internal/briefs/README.md`). `check:provenance` with no path runs
every brief in CI (`test.yml`, `npm run check:provenance`). Three later edit sources would each
change sentences after the chain accepts the page: the consistency read's batch, Geoff's fold
across the arm, and the site round's fixes. The site round's fixes arrive through a
`cairn-implementer` dispatch on `site-docs/<site>-<pass>` (`CLAUDE.md`, and
`docs/internal/facts/README.md:134-137`). None of those three is told to update
`docs/internal/briefs/<track>/<page>.json`, and a changed or new claim also needs a citable fact.

**Proposed fold.** State in the spec that any edit to a page with a brief updates the brief's
`sentences` in the same change. The edit re-cites every changed sentence, and a new claim first
gets a `[verified]` bullet. Land the rule where it executes: the consistency-read and fold
dispatch prompts, the `site-pass` skill text that stage 0 already edits (`:70-72`), and the
cross-repo `cairn-implementer` dispatch. `check:provenance` in CI is the tripwire.

---

## Minor

### m1. The chain's gate list omits CI docs gates that a rebuilt page must pass

**Location:** spec `:115-116`.

The list names `check:docs`, `check:vale`, `check:facts`, `check:provenance`,
`check:procedures`, and `check:reference`. CI also runs `check:arm-indexes`,
`check:editor-quotes`, `check:visuals`, `check:transcripts`, `check:symbols`, `check:snippets`,
and `check:readiness` over these arms (`test.yml:80-89` and `:75`). Each reads arm pages:
- `check:symbols` scopes `docs/admin`, `docs/editors`, and `docs/extend`
  (`check-symbols.mjs:59-62`).
- `check:snippets` typechecks every `ts` and `svelte` fence, which matters for extend.
- `check:transcripts` resolves the admin arm's transcript markers.
- `check:editor-quotes` pins `docs/editors/when-something-goes-wrong.md`.

Stage 1 edits to the three contract pages also trip `make -C tool check` (`tool.yml:19-24`).

A page can pass the chain and fail CI at merge. **Fold:** make the chain's gate string the full
docs subset of CI, plus `toolGate` for pinned and contract pages.

### m2. The docs-page-chain and drafter changes stage 0 needs are larger than the acceptance names

**Location:** spec `:81-82`.

The acceptance names only removing the grader, swapping the drafter, and adding the brief path.
The runner and the drafter need more:
- The runner throws without `args.profile` (`docs-page-chain.js:122-124`).
- `common` injects the profile into every prompt (`:130-132`).
- `editorPrompt` demands a "Profile" section (`:179-181`).
- `factPrompt` traces claims to `p.inputs` manifests, not to the brief's fact ids and their
  sources (`:200-208`).
- The runner has no page-inputs step and passes the exemplar as a path (`:163`).
- `cairn-docs-drafter` expects a profile and says "Do not run the page gate"
  (`cairn-docs-drafter.md:9-13,66`). That conflicts with the runner's `gateLine` and with spec
  step 3.
- The drafter's description and `docs/internal/briefs/README.md` ("The drafter writes it") both
  cite `docs-page-chain-v2.js`, which the handoff records as removed (`:216`).

Per-brief `check:provenance` mode exists as the spec assumes
(`npm run check:provenance -- <brief path>`, `briefs/README.md:10-14`).

**Fold:** list these edits in the stage 0 acceptance so the plan sizes them.

### m3. `check:symbols` already covers `check:procedures`' flag half

`check:symbols` resolves every `--flag` in a shell fence against `tool/testdata/flags.json` and
the setup command's own parser (`check-symbols.mjs:14-19`), and it runs in CI. The flag list is
a flat union, so it does not check subcommand existence or scope a flag to its subcommand. The
new check's added value is that pairing plus the `doctor` run.

**Fold:** say so in the spec, and build the pairing as an extension of `flags.json` (see M4b)
rather than as `--help` scraping.

### m4. Three pages in flight share whole-container gates

The per-brief mode makes only `check:provenance` page-scoped. `check:vale`
(`vale ... docs README.md`), `check:docs`, and `check:facts` read the whole tree. One page's
in-progress draft or half-written bullet can turn a sibling page's gate red.

Fact ids do not collide in practice. `mintFactId` draws six random base36 characters
(`check-facts.mjs:140-143`), about 2.2 billion values, and `check:facts` fails any duplicate
across files. Concurrent edits to one `facts/<track>.md` are guarded by the Edit tool's
modified-since-read refusal, but a Bash append would not be.

**Fold:** run Vale on the page path only inside the chain. Tell page-inputs agents to use Edit,
never a shell append. Treat a red whole-container gate whose failure names another page's file as
"not this page", which the runner's gate line can state.

### m5. Stage 1 cannot run through the page chain at its share

The chain's gate step includes "`check:reference` in stage 1" (`:116`), which implies stage 1
uses the chain. The chain writes a brief per page. The reference arm has 30 files and about 94K
words, and 0.8M comes to about 27K per page.

**Fold:** state that stage 1 is an in-place edit task outside the chain, writes no briefs, and
gates on `check:reference`, `check:reference:signatures`, `check:snippets`, and `make -C tool
check`.

### m6. The page counts and the exemplar mapping need small corrections

- The 9, 8, and 33 counts include each arm's `README.md`, which stage 5 also owns.
- Extend's 33 includes `migration-notes.md` and `upgrade-cairn.md`. Those are per-version records
  outside the freeze (`CLAUDE.md`), and the spec does not say whether they are rebuilt.
- The corpus supports "two per page type from different sources" for most types. Parsing
  `docs-exemplars.md` by section, these types fall short:
  - Editors, Concept: 2 captures, both `wordpress.com`.
  - Evaluators, support and versioning promise: 1 capture.
  - Core, Agent-facing contributor file: 2 captures, both `raw.githubusercontent.com`.
  - Operators: no concept or front-door type.
  - Extenders: no troubleshooting type (`debug-your-site.md` needs one).
- The corpus is keyed to the six audiences R1 dropped (`editors/`, `operators/`, `designers/`,
  `extenders/`, `core/`, `evaluators/`). The outline needs an arm-to-slice map, for example
  admin to operators, and extend to extenders plus designers.
- No step owns the trimming ("trimmed to the relevant excerpt", `:131`). The runner cannot embed
  a file's text by itself.

**Fold:** name the page-inputs agent as the trimmer, with its excerpts returned in its structured
report. List these gaps as the known "no capture fits" cases.
