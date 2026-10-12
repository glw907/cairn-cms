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
| T4 (run 2, 4 pages) | `wf_56a8b4d2-660` | | | |

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

## Framing A/B

See `docs/superpowers/research/2026-10-11-draft-docs-2b-part1-ab/README.md` once T2 lands.

## Consistency read

Added at T10.

## Rulings for Geoff

1. The executor added the empty "## Model content" heading to `docs/extend/README.md` so the helper could link content-model. A part-2 index task would otherwise find it missing.
2. The pass is runner class because `scripts/checks/check-symbols-allowlist.mjs` gained the entry `scripts/check-announce.ts`.
3. Found, not done:
   - Fact sources drifted: f:6a32oy's source file moved to `examples/showcase/src/routes/admin/signups/`; f:hsk70g's quoted `ACCESS_FIXED_SCREENS` line; f:x84fah's Source range `findings.ts:214-245` ends before the tier logic at line 274 (repoint to `findings.ts#resolveRenderedFindings`); f:smbsa6 and f:zyjzeg line numbers drifted about five lines.
   - The act-on page reader found `buildNewlyPublished` in npm 0.98.0's delivery/data while an earlier read found it absent. The unreleased-engine disposition for that page is unsettled; Geoff should check.
   - CI flakes on the e2e suite (dictionary-word specs; main's latest e2e run is also red), retried per the rerun rule.
