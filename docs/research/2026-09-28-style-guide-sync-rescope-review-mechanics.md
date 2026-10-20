# Style-guide sync re-scope review: mechanics and feasibility

**Targets:** the re-scoped spec and plan at `e0d5f954` (`docs/superpowers/specs/2026-09-28-style-guide-sync-design.md`,
`docs/superpowers/plans/2026-09-28-style-guide-sync.md`). **Lens:** does every mechanism behave as
stated. **Method:** probes only in the session scratchpad: a clone of the dotfiles branch at
`4461c1f` (revert applied there), a `git archive` of this worktree's HEAD with prototype Vale
rules, markdownlint-cli2 0.23.3 installed in scratch, workstation Vale 3.23.0 (the CI pin), and a
read of `~/.claude/workflows/pass-execute-chains.js` on dotfiles `main`. Neither real worktree
was touched.

**Counts:** 0 blocker, 4 major, 7 minor. One major is also an over-ceremony item.

## What the probes confirmed

- **`git revert 79c5e23` applies cleanly** on top of `b44f414`, `ead04af`, and `4461c1f`: 3 files,
  71 insertions, 905 deletions, `scripts/docs-chain-render.mjs` deleted, no conflict. W2 and W3
  touch no file W1 introduced. After the revert, `node tests/docs-page-chain-derivation.test.mjs`
  prints `ALL PASS`, and `scripts/check.sh` passes every step except the tellgrader Go test, which
  fails identically at `4461c1f` in the scratch clone and passes in the real worktree (a
  clone-path artifact, not a revert effect). W2 and W3 do depend on W1 in their text; see M2.
- **The pre-W1 chain already sends the drafter to the register file.** Its `common` block, which
  every stage prompt includes, reads: "The register is ${registerPaths}: read the universal
  contract and the track section before anything else" (`docs-page-chain.js:155-156` after the
  revert). `cairn-docs-drafter` has `tools: Read, Write, Edit, Grep, Glob, Bash`, and the register
  editor has `Read, Grep, Glob, Bash`. `registerPaths` and `exemplarSources` are free-form string
  lists interpolated into prompts, so any repo path works, `docs/internal/exemplars/` included.
- **Scoping a Cairn rule off under `docs/editors/**` works.** Adding `Cairn.Headings = NO` to the
  existing `[docs/editors/**]` section took the prototype's editors hits from 35 to 0 and left
  the Google-arm hits unchanged.
- **One `existence` rule expresses the merged heading rule.** `scope: heading`, `nonword: true`,
  and three tokens (`^[A-Z][a-z]+ing\b`, `\?$`, `^(?:What|Why|How|When|Where|Which|Who)\b`) fire
  as intended. The count is the problem; see M3.
- **markdownlint-cli2 0.23.3 is current** (`npm view`: latest 0.23.3, MIT, modified 2026-09-20)
  and supports the described config. Its README: "`.markdownlint-cli2.jsonc` ... The format of
  this file is a JSONC object", with a `config` key holding the markdownlint rule object, so
  `"MD013": false` with a `//` count comment is valid.
- **The plan's Gates block matches the runner.** `resolveGate` returns `t.gate || a.gate` when
  `t.gateTier` is set or the chain's classifier is off (`pass-execute-chains.js:444-450`);
  `args.gate`, `args.implementer`, and `args.planPath` are the required args (`:591-592`); a
  chain's own `classifier` wins over `args.classifier`, else one cached `haiku` probe; `gateLane`
  is read per task (`:262`). `scripts` is a real tier in `scripts/checks/gate-tier.mjs:73` and
  maps to the `SCRIPTS_GATE` string the plan quotes.

## Major

### M1. Vale 3.23.0 ships `vale test`; the spec says it does not and builds a script in its place

- **Where:** spec:94-95 and spec:153-156; plan:122-130 (`scripts/checks/vale-rule-examples.mjs`).
- **Defect:** the spec states "Vale 3.23.0 has no `vale test` command, so a short script runs
  Vale over the example pairs." The command exists in the pinned version; it is only absent from
  the top-level "Commands" list. Under ruling 15, a home-grown runner that duplicates the tool's
  own test command is invented machinery.
- **Evidence:** `vale --help` lists `--coverage  With 'vale test': fail when a rule produced no
  alert in any case.` `vale test --help` prints "vale test - Run the test cases kept beside a
  configuration's rules." A probe with `Headings.test.yml` beside the rule, cases shaped
  `name`/`input`/`contains: <string>` or `absent: [<list>]` (also `want`, `format`), ran:
  `SUCCESS 1 file — 2 passed, 0 failed`; a deliberately wrong case failed with exit 1 and
  `output does not contain "Cairn.Headings"`. A `*.test.yml` beside the rules does not disturb
  normal linting (the tree run at `--minAlertLevel=error` still exits 0).
- **The one catch:** the test input matches no `.vale.ini` section, so under the repo config it
  raises no alert at all. `vale --config=.vale/tests/vale.ini test .vale/styles/Cairn`, with a
  four-line config (`StylesPath = ../styles`, `[*]`, `BasedOnStyles = Cairn`), passed. The same
  trap hits the spec's script design: fixtures "outside the docs globs" linted with the repo
  config get no styles (probe: exit 0, no output).
- **Fold:** cut `vale-rule-examples.mjs`. Put `Headings.test.yml` and `ProseProcedure.test.yml`
  beside the rules, with one `contains` and one `absent` case each (the `ProseProcedure` fail
  cases verbatim from the two passages). The docs gate's tree mode runs `vale
  --config=<fixture ini> test .vale/styles/Cairn`. Correct the Sources bullet (spec:91-95) and the
  leanness record's wording stands as written. The arm scoping (editors off) is config, not rule
  behavior, and `vale test` has no path field, so it stays untested, as at GitLab.

### M2. After the revert, the drafter definition forbids what W1r's prompt asks

- **Where:** spec:192-195 (W2r); plan:153-157 (W2r acceptance).
- **Defect:** `b44f414` was written against W1's extraction. The definition it leaves says "The
  dispatch carries the drafting brief for the page's track ... Do not open the register file or
  look for its path; the dispatch extracted every part of it you need"
  (`cairn-docs-drafter.md:25-29` after the revert). The first paragraph still promises "two
  trimmed exemplar excerpts" and says "You do not go looking for a fact or an exemplar
  elsewhere." W1r's prompt, and the pre-W1 `common` block, tell the drafter to read the register
  file. The agent receives a direct contradiction. W2r's spec text keeps `b44f414` "in substance",
  and its acceptance ("no reference to exemplar roles, rendered sections, or the render script")
  does not name this sentence. The same dependency sits in the register editor: "The dispatch
  hands you its `## Provenance`, `## The tightening test`, and both `## Recorded exceptions`
  sections with the markers kept" (`cairn-register-editor.md:35-36`), and those sections are the
  ones R1t merges away. W3r's acceptance names only `source`, `q:`, and coercion.
- **Fold:** W2r's outcome adds: the definition tells the drafter to read the brief section the
  dispatch names from the register file, and drops "the dispatch extracted" and the "voice-role /
  anatomy-role" sentence. W3r's acceptance adds: no reference to `## Provenance`, `## The
  tightening test`, `## Recorded exceptions`, or a dispatch-extracted section; the editor reads
  `## Deviations from the base guides` from the file. Review focus 3 (plan:75-76) gains
  "a dispatch-extracted section".

### M3. The merged heading rule's "wh-clause teaser" is undefined, and its count is not 77 (OWNER FORK)

- **Where:** spec:144-145; leanness record:55.
- **Defect:** "77" is the audit's uncalibrated Python count of `-ing` headings over all 82 pages,
  editors and reference included (`2026-09-28-style-guide-sync-audit.md:231`: "These counts are
  uncalibrated. The scanner is `scratchpad/scan.py`, heuristic only"). It never measured the
  merged rule. The prototype on the Google arms, editors off, fires 115 times: 48 `-ing` leads, 1
  `?`, and 66 wh-openers. Most wh-openers are noun clauses the base guide allows, for example
  `enable-tidy.md:99` "What Tidy can't do to a document", `:111`, and `:121`. The first
  mechanics review raised the same fork (its M5) with a recommendation; the re-scope folded
  "wh-clause teaser" in without choosing. The spec's own teaser example class also escapes the
  rule: "You know it worked when" (`enable-tidy.md:127`, `rotate-the-github-app-key.md:97`)
  starts with no wh-word.
- **OWNER FORK**, what the rule's third token catches:
  - (a) Only `-ing` leads and a trailing `?`, about 49 Google-arm hits. The wh-clause judgment
    stays with the register editor's checklist. **Recommended:** it matches the Elastic tiering
    the spec cites (a regex rule for high-confidence forms, judgment for context-dependent ones).
  - (b) Every wh-opener as well, about 115 hits, most of them noun-clause headings the stage
    sweeps would rewrite.
- **Fold:** define the token set in R2 by the chosen option, drop "About 77" from spec:145 and
  the leanness table, and let the `WATCH` comment carry the measured count (plan:127 already asks
  for it).

### M4. J2 as written cannot be launched, and the chain trims the whole-page exemplar

- **Where:** plan:235-240; spec:226-230; ruling 17 (spec:73-74).
- **Defect:** `docs-page-chain` throws without `args.worktree`, `args.gate`, and `args.pages`
  (`docs-page-chain.js:150-151`), and each page's prompts interpolate `p.job` ("from the stage
  outline, verbatim"), `p.track`, and `p.inputs`. The plan supplies only `exemplarSources` and
  "the page's existing facts". There is no stage outline for `enable-tidy.md` in this pass. The
  page-inputs prompt reads "Read these two exemplar sources in full and trim each to the excerpt
  this page's type should imitate" (`:232-235`), while the developer brief's list has four
  entries and ruling 17 makes the AI posture page an exemplar "as a whole page". Nothing in W1r
  changes the two-and-trim step. Facts exist (`docs/internal/facts/extend.md:228-244`, about 14
  bullets), and the brief file is created by the drafter, so the gate itself is reachable.
- **Fold:** J2 names its args: `worktree` (the new `style-guide-proof` worktree), `gate: "npm run
  check:docs-gate -- --page {page} --brief {brief}"`, `gateLane: "light"`, and one page with
  `track: "extend"`, a `job` written in J2 (one paragraph: enable-tidy's job as a how-to), and
  `inputs` pointing at `docs/internal/facts/extend.md#docs/extend/enable-tidy.md` and the source
  files those facts cite. For the exemplar, either (a) accept the trim for this run and pass
  `choose-an-ai-posture.md` plus one Google capture as the two sources, or (b) have W1r's
  page-inputs prompt pass an exemplar through whole when the brief marks it so. (a) needs no new
  machinery; recommend (a), and record in J2's report that the whole-page form is untested.

## Minor

1. **`docs/internal/**` is not skipped by `check:docs`** (spec:178-179, "the other docs checks
   skip it too"). `docs-links.mjs` walks all of `docs/` except `superpowers`
   (`filesInScope`, `:49`), and it counts images as links. A probe capture with
   `[procedures](/style/procedures)` and `[lists](lists.md#numbered)` under
   `docs/internal/exemplars/` made it exit 1: "target not found: /style/procedures". Vale,
   `check:arm-indexes` (non-recursive for `docs/internal`), `check:snippets`, `check:visuals`,
   `check:transcripts`, and `check:symbols` do skip it. **Fold:** R9 rewrites every relative and
   root-relative link and image in a capture to its absolute `https://` URL (or strips images),
   and the spec sentence names `check:docs` as the one check that reads the directory. R9's
   existing gate acceptance catches it either way.
2. **`Cairn.ProseProcedure`'s "about 52" is the audit's heuristic** ("52 paragraphs with sequence
   words next to an imperative"), not the rule. The first mechanics review measured 13 with its
   prototype; this probe's `occurrence` prototype (`scope: paragraph`, `max: 1`) measured 31 and
   fired on both triggers only after `look`, `re-push`, `re-check`, and `redeploy` joined the verb
   list. The count tracks the verb list. **Fold:** drop "About 52" from spec:146; the `WATCH`
   comment records it.
3. **Microsoft Learn's CC BY 4.0 holds per source repo, not site-wide.** `gh api` shows
   `MicrosoftDocs/azure-docs`, `windows-dev-docs`, and `microsoft-365-docs` as public
   `CC-BY-4.0`, and `MicrosoftDocs/OfficeDocs-Support` returns 404. **Fold:** R9 picks a Learn
   page whose public MicrosoftDocs repo carries a CC-BY-4.0 `LICENSE`, and captures that repo's
   markdown source directly (cleaner than `curl` plus `pandoc` over rendered HTML). Google's
   footer license note covers the two Google captures.
4. **Four of the nine rules markdownlint would disable are settings, not a ratchet.** A stock run
   over the published arms and root README hits MD013 7,219 times, MD060 130, MD033 40, MD040 21,
   MD004 3, MD038 2, MD024 2, MD034 1, and MD032 1. "Re-enabled once its hits are fixed" does not
   fit MD013 (the tree hard-wraps at 100, the rule defaults to 80), MD033 (anchors), or MD024
   (repeated sibling headings). **Fold:** set `MD013.line_length: 100` (or leave it off, stated as
   a setting), `MD024.siblings_only: true`, and an MD033 allowed-element list, each with a comment;
   only the rest carry counts for the ratchet. This is the markdownlint README's own config
   surface, no new machinery.
5. **W1r's prompt names only the brief section.** The anatomies (`## The page anatomies`), Names,
   Visuals, and the track sections sit outside the two briefs (`docs-register.md:394-745`). The
   pre-W1 `common` line sends the agent to "the universal contract and the track section", which
   after R1t has no heading of that name. **Fold:** W1r's prompt names the brief section, `## The
   page anatomies`, and the page's track section by heading; the test maps each track to that
   set.
6. **R1t's "plain sources list" conversion must move content out of `## Provenance`.** That
   section holds `### The cairn docs voice` (the Google departure table and the editor-brief
   test) and `### Specimens` (`docs-register.md:841-878`). **Fold:** R1t's outcome says the
   departure table moves into `## Deviations from the base guides` and the specimen notes into
   the developer brief's voice subsection, so the disposition list shows them as moved.
7. **The J2 worktree needs its dependencies.** `check:docs-gate` builds `dist` and runs
   `check:reference`, `check:snippets`, and the other node checks against `node_modules`.
   **Fold:** J2's setup runs `npm ci` in the new worktree before the chain starts.

## Not findings

- Chain W runs under `cairn-implementer`, since `args.implementer` is shared across chains.
  W1 to W3 landed that way, and the plan's "criteria name no npm command" rule already covers
  the risk.
- R2 and R3 both edit `docs-gate.mjs` and `src/tests/unit/docs-gate.test.ts`, but they are
  sequential in chain R, so there is no contention.
