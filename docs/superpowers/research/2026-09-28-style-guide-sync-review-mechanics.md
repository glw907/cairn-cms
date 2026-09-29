# Style-guide sync spec review: mechanics, feasibility, and failure risk

**Target:** `docs/superpowers/specs/2026-09-28-style-guide-sync-design.md` (branch
`style-guide-sync`, commit `99535b08`). **Lens:** can each mechanism be built as stated, and what
breaks when it lands. **Method:** probes against a scratch snapshot of `draft-docs-0`'s committed
tree (`git archive`), with the workstation Vale 3.23.0 and the CI pin 3.15.1 (downloaded from the
same GitHub release URL `test.yml` uses), markdownlint-cli2 0.23.3 (markdownlint 0.41.1) installed
in scratch, and a read of `~/.claude/workflows/docs-page-chain.js`. Probe rules are prototypes, not
proposals for final wording.

**Counts:** 1 blocker, 5 major, 8 minor; 1 over-ceremony item.

## What the probes settled

- **Vocab suppresses `Google.Headings` and `Microsoft.Headings`.** Adding `GitHub App`, `GitHub`,
  `Cloudflare`, `Workers Builds`, `CSRF`, `SEO`, `Tidy`, `AuditSink`, `navLayout` to
  `accept.txt` cleared 16 of 19 tree-wide heading findings under both 3.15.1 and 3.23.0,
  including `Using Tidy` under Microsoft. No Cairn copy of the rule is needed for proper nouns.
  The spec's "Open for the plan" item on this can close.
- **`Cairn.ProseProcedure` is writable without flooding.** An `occurrence` rule at `scope:
  paragraph`, `max: 1`, counting an imperative verb after a sentence boundary, a conditional
  clause (`If …,`), `otherwise`, or `then`, fires on both trigger passages under both pins, and
  hits 13 paragraphs across the 81 published-arm pages, most of them real prose procedures.
- **A `scope: list` rule checks item capitalization** per item, and skips items that open with
  inline code.
- **markdownlint custom rules work on the micromark token API.** A table-intro rule and a
  heading-after-heading rule are about 25 lines together, and MD055, MD056, and MD058 exist in
  the installed version.
- **Vale's `--filter` works in 3.15.1 and 3.23.0**, and Vale exits 0 when only warnings fire.
  markdownlint-cli2 accepts `"warning"` severity per rule, which also exits 0.

## Correctness gaps, ranked by consequence

### B1 (blocker). R2 and R4 name levels Vale cannot give per invocation

- **Where:** spec:103-114, spec:122-126, acceptance 6 (spec:188).
- **Defect:** a rule's level lives in its YAML or in `.vale.ini`, and one `.vale.ini` serves both
  the `--page` gate and the tree-wide run. CI runs the tree-wide form: `test.yml` on
  `draft-docs-0` runs `npm run check:docs-gate` with no `--page`, which runs `vale
  --minAlertLevel=error docs README.md examples/showcase/README.md`
  (`scripts/checks/docs-gate.mjs:62-66`). Measured on published arms: a heading-form prototype
  fires 149 times (69 wh-word openers, 80 `-ing` openers). `Google.Headings` keeps one finding
  that vocab cannot clear (`docs/extend/debug-your-site.md:36`, see M-list). So a rule declared
  `error` breaks CI on frozen pages R4 says stay unfixed. A rule declared `warning` never fails
  the `--page` gate, since Vale exits 0 on warnings. R4's "error on `--page`, warning elsewhere"
  has no mechanism, and acceptance 6 cannot be met without contradicting R4.
- **Fold:** ship every new rule, and the two Headings rules, at `warning` in `.vale.ini`. In
  `--page` mode, `docs-gate.mjs` adds a second Vale pass, `vale --output=JSON
  --filter='.Name in [<promoted rules>]' <page>`, and fails on any alert. markdownlint runs only in
  `--page` mode, or tree-wide with a warning-severity config and in page mode with an error
  config through `--config`. Name the promoted-rule list in one place both the gate and the
  chain's `valeErrorRules` read. A page-mode second `.vale.ini` also works, but it duplicates
  every section and drifts; the filter pass does not.

### M1 (major). The branch base is moving, and R3 edits the contested file

- **Where:** spec:200-202, spec:230-231.
- **Defect:** the spec's trigger, "once the session running there commits its stage 0-1 close",
  has already fired (`140e8208`, 10:14 local), but that session is still working. At 10:18 the
  `draft-docs-0` worktree held uncommitted edits to `scripts/checks/docs-gate.mjs`,
  `scripts/checks/gate-tier.mjs`, and `scripts/docs-review/{embed,runtime}.mjs`, and
  `pgrep` showed its `check:docs-gate` gate running. `origin/draft-docs-0` is at `bd935c9d`
  ("simplify the draft docs gate and review scripts"), ahead of the local ref `140e8208`. R3
  rewrites `docs-gate.mjs`, the file in flight. `style-guide-sync` itself branches from `main`
  (`b492cd17`), so the two spec commits must move onto the new base.
- **Fold:** replace the trigger with verified conditions: the `draft-docs-0` worktree is clean,
  `pgrep -f draft-docs-0` is empty, the local ref equals `origin/draft-docs-0`, and that
  session's STATUS records the close as done. Branch from `origin/draft-docs-0` at that moment
  and rebase the spec and audit commits onto it. The register is unchanged between `b8bfd30f`
  and `bd935c9d`, so the spec's planned-against copy still holds.

### M2 (major). CI and workstation Vale disagree on the new rules, and fixtures cannot run in `npm test`

- **Where:** spec:124-126, acceptance 2 (spec:181-182).
- **Defect:** the drift is real on exactly these rule shapes. The list-capitalization prototype
  fires on a nested list item under 3.23.0 and stays silent under 3.15.1. The imperative-run
  prototype gives 195 hits over `docs/` under 3.23.0 and 182 under 3.15.1 (the published arms
  agree, 13 and 13). The chain's `--page` gate and `vale-hook` run the workstation 3.23.0, so a
  fixture proven only under the CI pin leaves the drafter's own gate unproven, and a finding can
  block a drafter that CI would pass, or the reverse. Separately, a vitest fixture suite cannot
  call Vale in CI: `npm test` runs at `test.yml:48`, and Vale is installed at `test.yml:94-98`.
- **Fold:** bump the CI pin to 3.23.0 in this pass through the `dependency-upgrade` skill (a
  minor, taken by default), with the fixture suite as its regression net, and update the
  `.vale.ini` arbiter note. If the bump is refused, run every fixture under both binaries. Run the
  fixture suite as a `docs-gate.mjs` component or its own step after the Vale install, never
  inside `npm test`.

### M3 (major). No qualifying external exemplar exists, and the pre-check passes external pages vacuously

- **Where:** spec:168-175 (Exemplars), spec:151-152 (W1 pre-check).
- **Defect:** the corpus at `~/.local/share/cairn/exemplars/` holds 68 captures across six
  audiences, and none comes from Google Cloud or Microsoft Learn. The nearest candidates are
  Cloudflare docs (`operators/cloudflare-create-token`), GitHub docs, and a Microsoft *support*
  page (`editors/microsoft-word-recover-files`), none written to either base guide. Vale on an
  exemplar's own path returns 0 alerts, since no `.vale.ini` section matches a path outside the
  repo. The same file copied under `docs/extend/` returns 19, including Cairn house rules that do
  not apply to a foreign page. So the pre-check either passes every external exemplar untested or
  fails it on rules that are not about structure.
- **OWNER FORK**, the stage 2a anatomy source:
  - (a) Capture two or three Google Cloud how-to pages and one Microsoft Learn procedure page into
    the corpus before stage 2a.
  - (b) Use the nearest existing captures (Cloudflare, GitHub) after a guide-conformance read.
  - (c) Take no anatomy exemplar; the drafter works from the W2 digest alone until an in-repo page
    qualifies.
  - Recommendation: (a). It is small, and it is the only option that matches the spec's own
    premise that the base guide's pages model the anatomy.
- **Fold (mechanics, any option):** the pre-check copies each exemplar into a scratch path and
  runs a structure-only config (R2's structural rules plus R3), never the house rules.

### M4 (major). The exemplar pre-check has no place to run in the workflow

- **Where:** spec:151-152, pass shape spec:197 (W1 as `engine-logic`, fixture-first).
- **Defect:** the chain is a sequence of `agent()` calls, and its own source says the runtime "has
  no filesystem access and no module loader for this script" (the `deriveCrossRegression` doc
  comment, `docs-page-chain.js`, the CROSS-REGRESSION block). A pre-check that "runs … before page
  inputs, and stops" cannot run Vale from the script. Fixture-first tests for W1 face the same
  constraint: node cannot import the file, which ends in a top-level `return`.
- **Fold:** fold the pre-check into the page-inputs agent (`general-purpose`, has Bash). Add a
  `exemplarCheck: [{ source, pass, failures }]` field to `PAGE_INPUTS_SCHEMA`, and have `chain()`
  return `escalate` with the named reason when any entry fails. Test the new pure pieces (the
  track-to-guide derivation, the `source` coercion in M-list item 5) with the existing
  marker-extraction pattern in `~/.dotfiles/tests/docs-page-chain-derivation.test.mjs`.

### M5 (major). `Cairn.HeadingForm` is three rules with different arm scopes, and "question heading" is undefined

- **Where:** spec:106-107, spec:87-89, ruling 4 (spec:57-60).
- **Defect:** a Vale rule carries no path scope. The spec's "question heading outside
  `docs/editors/**`" needs its own rule, turned off in a `[docs/editors/**]` section
  (`Cairn.X = NO`); a probe confirms this works under both pins. The `-ing` check has no stated arm
  scope: the editors arm has 32 `-ing` headings, and ruling 4 gives editors Microsoft unmodified,
  so the spec must say whether the ban reaches it. The reference arm has 17. The larger gap is
  the definition. On published arms, 69 headings open with a wh-word and only 2 end in `?`. Most
  are noun clauses: "What it costs" (`admin/before-you-start.md:48`), "Where to go next"
  (`extend/define-an-adapter-and-schema.md:162`), "Why `/healthz` lives at the site root"
  (`reference/admin-routes.md:273`). The audit counts "Why there's no downtime window" as
  question-shaped, which pulls every wh-clause in.
- **OWNER FORK**, what the Vale rule treats as a question heading:
  - (a) Only a heading that ends in `?`. Mechanical, near-zero noise, and the wh-clause
    judgment stays with the guide lens in the register editor.
  - (b) Every wh-word opener too. This means about 60 Google-arm headings to rewrite across the
    stage sweeps, and an exception list for the noun-clause forms kept.
  - Recommendation: (a) for the gate, with the register stating which wh-clause forms it keeps.
- **Fold:** split into `Cairn.HeadingIng`, `Cairn.HeadingQuestion`, and `Cairn.HeadingTeaser`,
  and state each one's arm scope in R2.

## Minor

1. **`ProseProcedure` wording would miss both triggers (spec:108-111, acceptance 3).**
   "Sentence-initial imperatives" matches neither passage well. Every imperative in
   `rotate-the-github-app-key.md:99-102` follows a conditional clause ("If step 4 doesn't
   produce that commit, check …"). `choose-an-ai-posture.md:99-103` has one sentence-initial
   imperative. The audit's connector `existence` rule ("check first", "if both hold") is
   fixture-overfit: 7 tree-wide hits, mostly the triggers. **Fold:** define the token as an
   imperative after a clause boundary (the probe's shape). Add a held-out must-fire fixture from
   a page the rule was not tuned on (`docs/editors/publish-and-history.md:93-109`, per the audit).
   Record the measured baseline: 13 of 81 published pages.
2. **One `Google.Headings` false positive survives vocab.** A heading opening "A" plus a
   hyphenated word ("A visual-regression baseline fails …", `debug-your-site.md:36`) fires under
   both pins. The same heading without the hyphen passes. **Fold:** under B1's warning-tree
   design it is harmless; if tree-wide promotion is ever wanted, use a Cairn copy of the rule.
   Never edit the vendored `.vale/styles/Google/Headings.yml`, since `Packages = Google,
   Microsoft` means `vale sync` overwrites it. Vocab entries carry no `Vale.Terms` side effect in
   `docs/`, since the `Vale` style runs only on `examples/showcase/README.md` (probed:
   lowercase "tidy" drew no finding).
3. **The list-capitalization rule needs a `cairn` exception.** The Names rule keeps "cairn"
   lowercase, and the probe flags a list item opening "cairn is …". Add a nested-item fixture
   (see M2).
4. **The docs-gate unit test pins the step list.** `src/tests/unit/docs-gate.test.ts:41-55` asserts
   Vale's exact args. R3's task owns updating it. The tree-wide counts confirm markdownlint must
   not gate tree-wide: 24 table-intro, 18 heading-after-heading, 20 MD040, and 1 MD032 on
   published arms. One token-API gotcha for the plan: a paragraph shows up at top level as token
   type `content`, not `paragraph`.
5. **"A guide violation is blocking" is prompt-only (spec:147-148).** **Fold:** `runReads`
   coerces `blocking = blocking || source === "guide"`, and `combined()` prints the source, so
   the redrafter sees which lens raised a finding. The base-guide derivation is easy, but `common`
   is a module-level constant (`docs-page-chain.js:154-164`) and must become a function of the
   page. A page whose `track` is outside the four arms (the front door, the root README) defaults
   to Google.
6. **W4 misses a routing row that contradicts ruling 1.** `skills/writing-voice/SKILL.md:24`
   routes "End-user and editor product copy, admin walkthroughs" to `editor.md` (Microsoft), while
   ruling 1 puts cairn's admin arm under Google. Other repos load both files: SKILL.md:22-23
   route every SvelteKit or web repo's developer docs and changelogs to `technical-doc-web.md`,
   `~/Projects/dubplate/docs/superpowers/plans/2026-09-23-rung-5c-pages-member-verb.md:1535`
   names `editor.md`, and so does `tool/docs/design/copy-standard.md:734`. The added list rule is
   safe for them. **Fold:** W4 also qualifies row 24 to UI-only walkthroughs. It notes that
   `writing-voice/evals/evals.json` routes three cases to `technical-doc-web`, and says whether
   those evals re-run; the dotfiles gate runs `tellgrader` but not the evals.
7. **W3's guide lens reaches artifacts with no track.** `register-check` dispatches the register
   editor on "any cairn prose artifact" (its SKILL.md description): specs, plans, and positioning
   prose. **Fold:** the dispatcher passes the track. With no track, the lens applies Google to
   `docs/**` published arms and stays off for internal records, except the register itself
   (ruling 6).
8. **R4 has no ratchet.** Once R5 passes at `--page`, nothing in CI keeps it passing, since CI runs
   tree-wide at warning. A later reference-maintenance pass or a site-docs fix batch can regress
   it silently. **Fold:** `docs-gate.mjs` reads a promoted-pages list (chain-accepted pages) and
   runs B1's filter pass over those pages in tree mode too.

## Over-ceremony, ranked by cost

1. **The W1 exemplar pre-check this pass (moderate: a schema field, an agent-prompt step, a
   structure-only config, tests).** No in-repo exemplar passes (spec:170-171), and external ones
   need M3's special config first. Until a chain-accepted page qualifies, a plan-time step does
   the same job at near-zero cost: the conductor runs the page-mode gate once per exemplar before
   dispatch. Defer the in-chain pre-check to the stage where in-repo exemplars exist, or keep it
   and accept M4's fold.
