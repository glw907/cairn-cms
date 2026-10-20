# Draft docs stage 2b, part 1: stage record

Plan: `docs/superpowers/plans/2026-10-11-draft-docs-2b-part1.md`. The executor is session `7cc9f249`
(job name `draft-docs-2b-part1`). Relaunch: `claude attach 7cc9f249`.

## Launch facts

| Fact | Value |
| --- | --- |
| cairn tooling head | `4dbe392b4fd9d1caa73cc536a5fd655da16a0801` (PR #116) |
| dotfiles tooling head | `112906de460ffd8ad5e1b1f0967ab2ddb10c8fee` (PR #25) |
| dotfiles gate | pass (`bash scripts/gate.sh` exit 0) |
| pinned script sha256 | `2d23feb8e982a29197d2544e360d235cf43258c0ef10b0fed35b6b337493e6a3` |
| `night_tokens_at_launch` (S0) | 2.67M (input + output + cache creation, no cache reads) |
| first `<total_tokens>` reading | 14,930,167 left of 15,000,000 |

## T0 checks

- (a) Branch `draft-docs-2b-part1` contains the cairn tooling head and `origin/overnight-2b-plan`.
- (b) `ci-green 4dbe392b --pr 116` exits 0. Retried tests: `admin-visual.spec.ts` "admin command
  palette, light, 320px" (e2e shard 1); "EditorToolbar > Write/Preview tab sizing ... keeps each tab
  its own width across the selected/unselected swap" (test).
- (c) The dotfiles worktree HEAD equals the recorded head. `git show` of the script at that head is
  `cmp`-identical to the pinned copy, and the pinned copy's sha256 equals `script_sha256`.
- (d) `TMPDIR`, `NODE_OPTIONS`, and `tellgrader` on PATH read as launched. `/tmp` is far under 4.5G.
- (e) The dotfiles branch's diff against `origin/main` touches only `cairn-register-editor.md`
  among the agents, no `cairn-figure` skill path, and not `cairn-docs-outline`.
- (f) `extraChecks` appears in the pinned script only in the header comment (line 63). The D7 and
  D8b caveats ride in each page's `inputs`.
- (g) Setup ran: `npm ci`, `npm ci --prefix examples/showcase`, `npx svelte-kit sync`.

## Ledger

| Task | Run id | Commits | Tokens | Count after |
| --- | --- | --- | --- | --- |
| S0 (night before launch) | | | 2.67M | 2.67M |
| T0 | | `2b1-T0` | 0.11M (loop drop) | 2.78M |
| T1 (run 1, 6 pages) | `wf_7016a184-bd0` | `5b50978b7` (WIP) | 6.63M | 9.41M |
| T2 (framing A/B) | | `d6e6c5c2e` | about 0.24M (framing at high 0.14M, intros 0.09M) | 9.65M |
| T3 (run 1 closes) | | `2b1-T3` | about 3.5M (closes) plus 0.4M executor loop (`<total_tokens>` 15.0M to 14.59M since T0) | about 13.5M |
| T4 (run 2, 4 pages) | `wf_56a8b4d2-660` | `83591a74d` (WIP) | 3.20M | |
| T5 (run 2 closes) | | `64c689ea4` | about 4.5M (closes) plus 0.2M executor loop | about 21.4M |
| T6 (run 3, 3 pages) | `wf_8abfb19a-064` | `888906cd6` (WIP) | 3.23M | |
| T7 (run 3 closes) | | `518ee1e77` | about 4.5M (closes) plus 0.15M executor loop | about 29.4M |
| T8 (run 4, 1 page) | `wf_7ef2ce8f-59b` | `4f3b437a2` (WIP) | 1.82M | |
| T9 (run 4 closes) | | `41aea1d3a` | about 0.45M (close) plus 0.1M executor loop | about 32.2M |

## Runs

### Run 1 (`wf_7016a184-bd0`, six pages, run base `45eb830fa`)

The chain accepted none of the six pages (0/6): every record ended `escalate`. T3 closed each
page, three by a targeted close after the round cap and three by hand-run seats (R5 ruling 1) after
an escalation on the plan read. The whole-tree gate (`CAIRN_GATE_LANE=light cairn-run-gate 'npm run
check:docs-gate'`) exits 0 with `check:docs-gate: OK (19 check(s))`, `check:options: OK (263 option
paths)`, and `check:tellgrader: OK (53 page(s))`.

Pending option-map rows, run base against now: received and disposed per page below. 47 `pending`
rows remain in `docs/internal/option-map.json`; its `pendingCount` field reads 48, so the two
figures disagree by one.

| Page | rowsReceived | rowsDisposed | End state |
| --- | --- | --- | --- |
| act-on-newly-published-entries | 4 | 4 | accepted, targeted close |
| content-model | 27 | 27 | accepted, targeted close |
| share-a-draft-preview | 3 | 3 | accepted, targeted close |
| arrange-the-admin-sidebar | 15 | 15 | accepted, hand-run |
| run-cairn-audit-on-your-site | 0 | 0 | accepted, hand-run |
| configure-media | 6 | 6 | accepted, hand-run |

#### act-on-newly-published-entries

- Status: chain `escalate` ("second fix verdict or red gate"), rounds 2. End state: accepted by targeted close.
- Plan read: structural fix, revised, then accept.
- Round 1: structural fix, register fix, fact fix. Round 2 (scoped, changed sentences): structural accept, register fix, fact accept. crossRegression: false.
- Escalation and close: one cairn-docs-drafter fixed the two final-round blocking findings. Scoped register read accept; scoped fact read FIX (one blocking: line about 206 overreached f:gkrell for an older post without the stamp), and the drafter applied the reviewer's own rewrite. The final reader returned FIX (three blocking: no run command and unreplaced placeholders; an offline check with no save path or run command; a failed send unstated). One scoped redraft applied the reader's rewrites. Facts f:rh53a2 and f:5ys4my were filed, tagged [external: Node.js]. The drafter added `scripts/check-announce.ts` to `scripts/checks/check-symbols-allowlist.mjs`, which makes the pass runner class. Scoped register accept, fact accept, re-test accept.
- frictionFiled: none recorded in the chain record. Facts filed: f:rh53a2, f:5ys4my.
- Unexercised: the unreleased-engine disposition is unsettled (see Rulings, item 3).

#### content-model

- Status: chain `escalate` (round cap), rounds 2. End state: accepted by targeted close.
- Plan read: structural fix, revised, then accept.
- Round 1: structural fix, register fix, fact fix. Round 2 (scoped): structural accept, register accept, fact fix. crossRegression: false.
- Escalation and close: the drafter fixed two blocking fact-read findings (f:a8ecm0 dropped from the manifest section; a vague rename 409 sentence with an unlinked pointer). Scoped register accept (advisories), scoped fact accept, final reader accept. The index lacked a "Model content" heading, so `cairn-docs-outline link` failed with 'the index has no heading "Model content"'. The executor added the empty heading to `docs/extend/README.md` between "Start" and "Public site" (the outline's group order) and ran the helper, which linked the page.
- frictionFiled: none recorded. Facts filed: none new.
- Unexercised: none recorded.

#### share-a-draft-preview

- Status: chain `escalate` (round cap), rounds 2; its plan read accepted. End state: accepted by targeted close.
- Plan read: structural accept, not revised.
- Round 1: structural fix, register fix, fact accept. Round 2 (scoped): structural fix, register accept, fact accept. crossRegression: false.
- Escalation and close: the drafter fixed one blocking structural finding (the `draft_invalid` row's cause cell). Scoped register accept. Scoped fact FIX (two blocking: f:2awy1w named the reason but not its meaning; a fields claim uncited), and the drafter applied the reviewer's rewrites and filed f:546jja and f:r2qi1y. Final reader accept (advisories).
- frictionFiled: none recorded. Facts filed: f:546jja, f:r2qi1y.
- Unexercised: the unreleased engine for the `0003_preview.sql` migration in the scaffold.

#### arrange-the-admin-sidebar

- Status: chain `escalate` ("second fix verdict on the plan read"), rounds 0. End state: accepted by hand-run.
- Plan read: structural fix, revised, fix again (escalated).
- Hand-run seats: plan revised from the plan read's rewrites (one blocking: the introduction omitted the collapsed/cookie section). Framing at xhigh; departure: the plan's "every way hides without locking" was false because the access map hides and locks (f:altcjp), so the line is scoped to four controls. frictionFiled: `ownerOnly` names opposite behaviors.
- Round 1 (gate pass): structural accept, register accept, fact accept, figure verifier accept (live repro fence `nav/worked-navlayout`). Round 2: none needed.
- Final reader: FIX (one blocking: the page never defined or linked "A section action's `ownerOnly` option"). One scoped redraft named and linked `createSectionAction`. Scoped register accept, scoped fact accept, re-test accept.
- crossRegression: not run (no chain rounds). Facts filed: none new (f:altcjp cited).
- Unexercised: the unreleased engine for the roles steps.

#### run-cairn-audit-on-your-site

- Status: chain `escalate` ("second fix verdict on the plan read"), rounds 0. End state: accepted by hand-run.
- Plan read: structural fix, revised, fix again (escalated).
- Hand-run seats: plan revised (one blocking: three steps held two actions each). Framing; frictionFiled: the scaffold's audit gate runs beside the Workers Builds deploy, not ahead of it.
- Round 1: structural FIX (two blocking), register FIX (blocking: single-step procedures as prose, one long list item), fact accept. Round 2 redraft applied all; scoped register accept, fact accept.
- Final reader: FIX (one blocking: stale/dead entry findings undefined). One scoped redraft; facts f:04daga and f:h5wrph filed. The code differed from the reader's rewrite in one place: a dead entry reports at advisory tier when the run never reached the interaction state. Scoped reads accept, re-test accept.
- D8b caveat carried: the page states the limitation (no `--json`, line format not a designed contract) twice, cited to f:5y3prw [verified].
- crossRegression: not run. Unexercised: none recorded.

#### configure-media

- Status: chain `escalate` ("second fix verdict on the plan read"), rounds 0. End state: accepted by hand-run.
- Plan read: structural fix, revised, fix again (escalated).
- Hand-run seats: plan revised (two blocking: diagnosis order, and a wrong pointer for `length_required`). Framing filed f:qifl9g (the scaffold wires `publicMediaResolver`); frictionFiled: the scaffold's unannotated `media` constant breaks typechecking once `urlForm` is added.
- Round 1: structural FIX (one blocking: the adapter path did not say which site), register FIX (two blocking: a teaser heading, a one-step procedure as prose), fact FIX (one blocking: the route "sets security headers on every non-404 response" is wrong for the bare 503; f:fjnszk rewritten and tagged [docs-drift]). Round 2 redraft; scoped register accept; scoped fact accept, with f:fjnszk retagged [verified]. Final reader accept.
- crossRegression: not run. Facts filed: f:qifl9g; f:fjnszk rewritten. Unexercised: none recorded.

#### Caveat check

- D8b on run-cairn-audit-on-your-site: the page says twice that the report has no machine-readable output and a line format that is not yet a designed contract (lines 9 and 74). f:5y3prw in `docs/internal/facts/extend.md` carries the claim and the D8b citation, tagged [verified].
- Adapter path names its site: act-on-newly-published-entries (line 232), arrange-the-admin-sidebar (line 30), configure-media (lines 14, 48, 82), and content-model each say scaffold `src/theme/cairn.config.ts` versus tutorial `src/lib/cairn.config.ts`. share-a-draft-preview and run-cairn-audit-on-your-site never name the file.
- The sidebar figure is a `repro` fence on story `nav/worked-navlayout` (`docs/extend/arrange-the-admin-sidebar.md` line 109).
- The build-the-public-routes D7 caveat is not in this run.

### Run 2 (`wf_56a8b4d2-660`, four pages, run base `cc442ffc3`)

The chain accepted none of the four pages (0/4): every record ended `escalate`. T5 closed each page,
one by a targeted close after the round cap and three by hand-run seats after an escalation on the
plan read. The whole-tree gate (`CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:docs-gate'`)
exits 0 with `check:docs-gate: OK (19 check(s))`, `check:options: OK (263 option paths)`, and
`check:tellgrader: OK (57 page(s))`.

Pending option-map rows, run base against now: 31 `pending` rows remain in
`docs/internal/option-map.json` (8 build-the-public-routes, 7 configure-rendering, 16 turn-on-tidy);
its `pendingCount` field reads 32, so the two figures disagree by one.

| Page | rowsReceived | rowsDisposed | End state |
| --- | --- | --- | --- |
| reuse-content-across-entries | 0 | 0 | accepted, targeted close |
| link-content-with-references | 1 | 1 | accepted, hand-run |
| define-an-adapter-and-schema | 15 | 15 | accepted, hand-run |
| add-an-island | 0 | 0 | accepted, hand-run |

#### reuse-content-across-entries

- Status: chain `escalate` ("second fix verdict or red gate"), rounds 2; its plan read accepted. End state: accepted by targeted close.
- Plan read: structural accept, not revised.
- Round 1: structural fix, register fix, fact fix. Round 2 (scoped): structural fix, register accept, fact accept. crossRegression: false.
- Escalation and close: the drafter fixed the one blocking structural finding (restore the introduction's second paragraph as prose per the framing record's three-paragraph plan; it had become a four-item list). The scoped register read returned FIX (blocking: restore the list, because parallel items need a list per the guide), which conflicted with the structural finding. The executor overruled the register finding on the introduction's form, because the framing record plans three prose paragraphs and the structural read had demanded prose (Rulings, item 1). Scoped fact accept; final reader accept (advisories).
- frictionFiled: none recorded. Facts filed: none new.
- Unexercised: the unreleased engine for the fragments surface.

#### link-content-with-references

- Status: chain `escalate` ("second fix verdict on the plan read"), rounds 0. End state: accepted by hand-run.
- Plan read: structural fix, revised, fix again (escalated).
- Hand-run seats: plan revised (one blocking: the Pick-a-target step never said targets must be published). Framing; frictionFiled: 'permanent id' contradicts rename.
- Round 1: structural FIX (one blocking: a three-action step), register FIX (three blocking: a three-action step, a two-action step, a wh-clause heading renamed to "`cairn:` body links and reference fields"), fact accept. Round 2 redraft; scoped register FIX (blocking: a false contrast between a cairn: link and a reference at prerender), applied the register editor's rewrite; scoped fact accept.
- Final reader: FIX (one blocking: the introduction still carried the false contrast); one scoped redraft. Scoped fact read FIX (blocking: 'a stored id can outlive its target' was backed by no fact); the executor applied the fact reader's own rewrite (Rulings, item 3 of the close) plus the register's naming advisory. Re-test accept.
- crossRegression: not run (no chain rounds). Facts filed: none new. Unexercised: none recorded.

#### define-an-adapter-and-schema

- Status: chain `escalate` ("second fix verdict on the plan read"), rounds 0. End state: accepted by hand-run.
- Plan read: structural fix, revised, fix again (escalated).
- Hand-run seats: plan revised (one blocking: the identity and sender section was unconditional). Framing; frictionFiled: 'Adapter' names two things in one file.
- Round 1: structural FIX (two blocking: a misleading cross-reference; an adapter path not naming its site), register FIX (blocking: two one-step procedures lacked an introducing sentence), fact FIX (two blocking: f:6a32oy's source file moved; a missing fact id on the GitHub App precondition). Round 2 redraft; scoped register accept; scoped fact FIX (one blocking: the configModule sentence needed a clause on f:q07rd5), applied.
- Final reader: FIX (one blocking: no step said where a `behavior` entry goes); one scoped redraft, fact f:k7v2qe filed. Scoped register accept, scoped fact accept, re-test accept.
- crossRegression: not run. Facts filed: f:k7v2qe. Unexercised: none recorded.

#### add-an-island

- Status: chain `escalate` ("second fix verdict on the plan read"), rounds 0. End state: accepted by hand-run.
- Plan read: structural fix, revised, fix again (escalated).
- Hand-run seats: plan revised (one blocking: the verify step assumed an entry using the directive that nothing earlier produced). Framing; frictionFiled: the tutorial's and a scaffolded site's modules sit at different paths.
- Round 1: the first gate run failed `check:symbols` and the drafter added entries to the allowlist. Reads: structural FIX (one blocking: a precondition lacked its link), register FIX (two blocking: a positional step reference; condition after instruction), fact FIX (one blocking: the tutorial has no root layout files). Round 2 redraft; scoped register accept; scoped fact FIX (one blocking: sv's root layout exists on the tutorial's site). The drafter applied the fact reader's rewrite and cut the import-specifier sentence, removing the two allowlist entries for `#theme/cairn.config.js` and `#lib/cairn.config.js`.
- Final reader: accept.
- crossRegression: not run. Facts filed: none new. Unexercised: none.

#### Caveat check

- Pages that name `cairn.config.ts` name the site beside it: reuse-content-across-entries (lines 27, 29, 56), link-content-with-references (lines 22, 25, 54), add-an-island (lines 16, 20, 42, 118), and define-an-adapter-and-schema (lines 96, 193, 263, 328). Two sites in define-an-adapter-and-schema name the file without a site: line 4 (the `defineAdapter` call "in the site's `cairn.config.ts`", generic by design) and line 442 (the engine's own rejection message). Code-comment path labels name no site by design.
- The pending rows above went to define-an-adapter-and-schema (15) and link-content-with-references (1); the remaining 31 belong to later pages.

### Run 3 (`wf_8abfb19a-064`, three pages, run base `6d5586716`)

The chain accepted none of the three pages (0/3): every record ended `escalate`. T7 closed each
page, one by a targeted close after the round cap and two by hand-run seats after an escalation on
the plan read. The whole-tree gate (`CAIRN_GATE_LANE=light cairn-run-gate 'npm run
check:docs-gate'`) exits 0 with `check:docs-gate: OK (19 check(s))`, `check:options: OK (263 option
paths)`, and `check:tellgrader: OK (60 page(s))`.

Pending option-map rows, run base against now: all 31 rows the run received are disposed, and 0
`pending <slug>` rows remain in `docs/internal/option-map.json`. Its `pendingCount` field reads 2,
so the field and the row count disagree by two (stale field; flag for part 2).

| Page | rowsReceived | rowsDisposed | End state |
| --- | --- | --- | --- |
| configure-rendering | 7 | 7 | accepted, targeted close |
| turn-on-tidy | 16 | 16 | accepted, hand-run |
| build-the-public-routes | 8 | 8 | accepted, hand-run |

#### configure-rendering

- Status: chain `escalate` ("second fix verdict or red gate"), rounds 2. End state: accepted by targeted close.
- Plan read: structural fix, revised, then accept.
- Round 1: gate pass; structural fix, register fix, fact fix. Round 2 (scoped, changed sentences): gate pass; structural fix, register fix, fact fix. crossRegression: false.
- Escalation and close: the drafter fixed two blocking fact-read findings (the component picker gets the registry only through CairnAdmin's `registry` prop, f:rrvh33; Diagnose item 2). Scoped register FIX (blocking: Diagnose item 2 stated one possible cause as settled fact); the executor applied the register editor's own rewrite (Rulings, item 7). Scoped fact accept. Final reader accept.
- frictionFiled (plan step): the component registry goes to two untied seams (`createRenderer`'s argument and `rendering.components`); `ComponentDef.insertTemplate` is read only for a component with no attributes and no slots; the scaffold's alert component reuses DaisyUI's `.alert` class names; `debug-your-site.md` has no render or component row. Facts filed: none recorded.
- Unexercised: the unreleased engine for the sanitize floor and the scaffold excerpts.

#### turn-on-tidy

- Status: chain `escalate` ("second fix verdict on the plan read"), rounds 0. End state: accepted by hand-run.
- Plan read: structural fix, revised, fix again (escalated).
- Hand-run seats: plan revised (one blocking: the local-development explanation section sent the tutorial reader forward to a later task section). Framing filed f:4gnt5j and f:9y46v0; friction: tidy has two `tidy` blocks in two files.
- Round 1: structural accept, register FIX (four blocking: a teaser heading renamed "Limits on a tidy result"; a one-step procedure as prose; one-step bullets with no introducing sentence; a positional reference), fact accept. Round 2 redraft; scoped register FIX (blocking: the table lead-in separated from the table) and fact FIX (f:avtt69's source line pointer stale), both applied by the executor with the reviewers' own rewrites (Rulings, item 7).
- Final reader: FIX (one blocking: the add-cairn reader had no scaffold module to copy for the local-development gate). One scoped redraft showed the scaffold's gate excerpt and the tutorial's own hooks test; facts f:qx13ec and f:dqnblw filed. Scoped reads accept, re-test accept.
- crossRegression: not run (no chain rounds). frictionFiled (plan step): tidy is off by default in the engine but the scaffold ships `tidy.enabled: true` with no SDK and an empty key; the key probe reads a missing SDK as unknown; the tidy client seam carries two stability tiers; a Settings save says "Tidy settings saved." but changes nothing. Unexercised: none recorded.

#### build-the-public-routes

- Status: chain `escalate` ("second fix verdict on the plan read"), rounds 0. End state: accepted by hand-run.
- Plan read: structural fix, revised, fix again (escalated).
- Hand-run seats: plan revised (one blocking: a promised `defaultImage` member never shown). Framing.
- Round 1: structural accept, register FIX (one blocking: a UI label not bold), fact FIX (one blocking: f:rnwver no longer matched its source; rewritten and restored to [verified]). Round 2 redraft; scoped register FIX (blocking: a repeated "also" sentence) and fact FIX (blocking: the `markdownUrl` snippet advertised a twin for noindex entries), both applied with the executor's own rewrites (the engine's own noindex test, `readSeoFields(...).robots`; Rulings, item 7).
- Final reader: FIX (one blocking: the feeds step never showed the render input shape, so the add-cairn reader could not write it). One scoped redraft; fact f:cu48t5 filed. Scoped reads accept, re-test accept.
- crossRegression: not run. frictionFiled (plan step): a site's public origin has two homes (the `ORIGIN` literal and `PUBLIC_ORIGIN`) that the scaffold ships different; `markdownResponse`'s Content-Type never reaches production from a prerendered twin on adapter-cloudflare; `PublicRoutesConfig.feeds` only adds head alternate links; `createSiteIndexes` requires a site-config argument it ignores; `createPublicRoutes` builds no head for non-entry pages. Unexercised: none recorded.

#### Caveat check

- D7 on build-the-public-routes: the page states that delivery reads the hero and the share image only from the frontmatter key `image` in the introduction (line 22) and in "Declare the fields the head reads" (line 327). The claim is f:k5uws5 in `docs/internal/facts/extend.md` (line 1043), tagged [verified], with source `public-routes.ts#deriveHeroImage`. The page itself carries no fact id and does not name `deriveHeroImage`; the citation lives in the facts container.
- Pages that name `cairn.config.ts` name the site beside it: configure-rendering (lines 17-18, 52, 97, 256, 275, 279, 559), turn-on-tidy (lines 54-55, 207) and build-the-public-routes (lines 49-50). Exceptions: none found. configure-rendering lines 275 and 559 and turn-on-tidy line 207 give the tutorial path in a step or comment under a section whose lead-in already names the site.

### Run 4 (`wf_7ef2ce8f-59b`, one page, run base `812cf9c44`)

The chain accepted no page (0/1): the record ended `escalate`. T9 closed the page by a targeted
close after the round cap. The whole-tree gate (`CAIRN_GATE_LANE=light cairn-run-gate 'npm run
check:docs-gate'`) exits 0 with `check:docs-gate: OK (19 check(s))`, `check:options: OK (263 option
paths)`, and `check:tellgrader: OK (61 page(s))`.

Pending option-map rows, run base against now: the run received 0 `pending <slug>` rows and
disposed 0; none remain in `docs/internal/option-map.json`.

| Page | rowsReceived | rowsDisposed | End state |
| --- | --- | --- | --- |
| migrate-existing-content | 0 | 0 | accepted, targeted close |

#### migrate-existing-content

- Status: chain `escalate` ("second fix verdict or red gate"), rounds 2. End state: accepted by targeted close.
- Plan read: structural fix, revised, then accept.
- Round 1: gate red only on `check:facts` (f:g8rbmt's Source line named `editLoad`, which has two declarations at the same level); structural fix, register fix, fact accept. Round 2 (scoped): gate pass; structural fix (blocking: the redraft cut "A migrated file outlives the script that wrote it."), register accept (advisories), fact accept. crossRegression: false.
- Escalation and close: one drafter repointed f:g8rbmt's Source to `content-routes-entry-read.ts:313` and restored the cut sentence. Scoped register accept (advisories) and scoped fact accept. The final reader ran the page's script on sample files and found one blocking defect: an undated file for an undated concept with an optional `date` produced `date: undefined`, because `JSON.stringify(undefined)` is the text `undefined`, which fails the build with "must be a valid date". One scoped redraft replaced the date line with `const day = toDay(old.date) ?? toDay(filename); if (day) fm.date = day;` (reproduced, fixed, rerun). No prose changed, so the scoped register and fact reads were skipped for the one-line script change (Rulings, item 10). The re-test reader ran the script on dated, undated, malformed-date and offset-timestamp files and accepts.
- frictionFiled (plan step): an invalid migrated draft disappears with no signal from the build or the admin (the build's manifest skips invalid entries and logs nothing); f:qd7iat's Source pointed at the `ComposeInput` export and nothing backed its "same parser" clause. Facts filed: f:g8rbmt (parseMarkdown's three readers) and f:ht7tdd (Jekyll, Hugo, and Eleventy front matter, [external]).
- Unexercised: the `content.field_undeclared` warning (CHANGELOG Unreleased; not in 0.98.0).

#### Caveat check

- The page names `cairn.config.ts` at lines 24-25 and 63. Both sentences name the site beside the path (`src/theme/cairn.config.ts` on a scaffolded site, `src/lib/cairn.config.ts` on the add-cairn tutorial's site). Exceptions: none found.

## Framing A/B

See `docs/superpowers/research/2026-10-11-draft-docs-2b-part1-ab/README.md` once T2 lands.

## Consistency read

Consistency read findings (T10). Applied unless noted.

1. Applied to the page only. The engine already labels `media` "Library" by default (`f:gponkz`, `admin-nav.ts` `ENGINE_SCREEN_DEFAULTS`), so the code comment and caption now say Library keeps its default label and Site settings is the relabeled entry. The repro fence, story id, and fixture are unchanged; the fixture change is deferred (Found, not done).
2. Applied: "menu editor" links to build-the-public-routes.md#add-an-editable-menu in turn-on-tidy.
3. Applied: "tidy's conventions" links to turn-on-tidy.md#let-editors-change-the-conventions in build-the-public-routes.
4. Refused: needs two outline crossLinks and the outline is out of scope. Deferred (Found, not done).
5. Applied: "menu editor" in define-an-adapter-and-schema, turn-on-tidy, and build-the-public-routes ("nav screen" became "menu editor").
6. Applied: **Settings** bolded in turn-on-tidy at the four named lines plus the one in the Where next list.
7. Applied: "holding branch" in share-a-draft-preview at the three lines.
8. Applied: "hand-built site" throughout; act-on-newly-published-entries now reads "on the Add cairn to a SvelteKit app tutorial's site".
9. Applied: "a private preview link" in share-a-draft-preview.
10. Applied at configure-media ("literal `media:` reference"). Not applied at build-the-public-routes:305, where the sentence says "raw token" for the src value and no `media:` phrase is involved.
11. Deferred: structural cut.
12. Deferred: structural cut.
13. Refused: check:visuals requires a repro alt to match /^reproduction\b/i, so "Reproduction of" stays.

Scoped register and fact verdicts: the one prose change (arrange-the-admin-sidebar's snippet comment and
figure caption, finding 1) got one scoped register read that also checked the claim: accept, with
two advisories not applied (`// same as the default label, Library` and a caption recast). The
claim holds: `admin-nav.ts:419` labels the media screen "Library" and `f:gponkz` states it. Every
other applied finding is a term or link substitution. The batch's global "hand-built site"
substitution also touched `scaffolded-site-files` and `theme-your-public-site` (2a pages outside
the 14); the executor reverted both and their briefs in `ce2c00e15`, so the two phrasings
("hand-built site" on the 2b pages, the 2a pages' own wording) stay different until part 2. The
T10 change's `diff-reviewer` read folds into T11's whole-branch review.

Left for the PR's "Found, not done": finding 1's fixture (the `nav/worked-navlayout` story relabels
`media` to the engine's own default, so the figure cannot show a real relabel of Library; the
fixture is engine code under `src/lib/reproductions/`); finding 4 (the outline needs crossLinks
from `share-a-draft-preview` and `act-on-newly-published-entries` to `build-the-public-routes`);
findings 11 and 12 (the `siteConfigPath` and glob explanations repeat across define, tidy, build,
and reuse); finding 13 (`check:visuals` requires repro alt text to start with "Reproduction").

## Rulings for Geoff

1. The executor added the empty "## Model content" heading to `docs/extend/README.md` so the helper could link content-model. A part-2 index task would otherwise find it missing.
2. The pass is runner class because `scripts/checks/check-symbols-allowlist.mjs` gained the entry `scripts/check-announce.ts`.
3. Found, not done:
   - Fact sources drifted: f:6a32oy's source file moved to `examples/showcase/src/routes/admin/signups/`; f:hsk70g's quoted `ACCESS_FIXED_SCREENS` line; f:x84fah's Source range `findings.ts:214-245` ends before the tier logic at line 274 (repoint to `findings.ts#resolveRenderedFindings`); f:smbsa6 and f:zyjzeg line numbers drifted about five lines.
   - The act-on page reader found `buildNewlyPublished` in npm 0.98.0's delivery/data while an earlier read found it absent. The unreleased-engine disposition for that page is unsettled; Geoff should check.
   - CI flakes on the e2e suite (dictionary-word specs; main's latest e2e run is also red), retried per the rerun rule.

Run 2 rulings and findings:

4. The reuse page's introduction: the register read demanded a list and the structural read demanded prose. The executor overruled the register finding in favor of the framing record's three-prose-paragraph plan.
5. `configure-rendering` is linked from add-an-island as a forward link and lands in run 3.
6. Found, not done: the add-cairn tutorial imports from `#lib/...` but never declares a `#lib` subpath import in package.json (found by the define fact read); sv's current minimal template ships a root `+layout.svelte` the tutorial does not mention; f:6a32oy's source line moved; the register read flagged "whatever the type's doc comment says" as a defect in a TSDoc comment on a type (the clause was cut from the page); CI flakes on the e2e suite retried per the rerun rule (they also fail on main).

Run 3 rulings and findings:

7. The executor applied the reviewers' own rewrites without a further round for the final-round fact and register findings on configure-rendering, turn-on-tidy, and build-the-public-routes (R5 ruling 3).
8. Found, not done: the add-cairn tutorial site has no media block, R2 binding or resolver, so configure-media's tutorial-site coverage rests on a doc-only source; the file tree in build-the-public-routes omits `src/chassis/feed-items.ts`; the turn-on-tidy refusal table omits the 422 and empty-result refusals; the fact f:ssdn1f said "by default" for effort (corrected).
9. The first whole-tree gate run on build-the-public-routes' redraft failed `check:reference` on `admin-toolkit.md` (28 stale exports) and passed on rerun, a stale reference artifact; flag for part 2.

Run 4 rulings and findings:

10. The one-line script fix on migrate-existing-content (the date line) was re-tested by the re-test reader only; the scoped register and fact reads were skipped because no prose changed.
11. The whole-tree `check:facts` was red in round 1 from a fact filed by the framing step (f:g8rbmt's Source named `editLoad`, two declarations at the same level); the close repointed it and it cleared.
12. The first drafter edited `scripts/checks/check-symbols-allowlist.mjs` (runner class) to add `scripts/migrate-content.mjs` and its three script constants and to remove two stale entries.
