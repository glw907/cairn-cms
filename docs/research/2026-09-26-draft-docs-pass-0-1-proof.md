# Draft docs pass 0+1, task 9: chain proof and review-page round trip

Conductor-led sitting for the plan's task 9 (`docs/superpowers/plans/2026-09-26-draft-docs-pass-0-1.md`).
Owner facts (step 1) landed as `6ad6dee8` before this record; this record covers steps 2 and 3
and the landing of the approved page onto `draft-docs-0`.

## 1. Chain proof

The proof worktree (`.claude/worktrees/draft-docs-0-proof`, branch `draft-docs-0-proof`, off
`6ad6dee8`) ran `npm ci` once, then `docs-page-chain` on one short extend page,
`docs/extend/choose-an-ai-posture.md`, drafted to its real path.

- **Brief:** `docs/internal/briefs/extend/choose-an-ai-posture.json`, 31 sentences, each cited to
  a fact id (`check:provenance` confirms all 31 cited, 0 no-claim, on `draft-docs-0` after landing;
  see "Gates" below).
- **Page-inputs output:** the claim inventory carried in the brief above; every claim was either
  cited to an existing fact or filed new by the page-inputs agent as `[verified]` with a `Source:`
  line (`f:6g7mpp`, `f:s62pyb`, `f:fd7rln`, `f:gnlib7`, `f:65atya`, `f:k4p9ws`, `f:87pdbt`,
  `f:tno8hh`, `f:b970xo`, `f:m2v7qd`) or `[external]` with the vendor URL (`f:87pdbt`,
  `f:tno8hh`), never `[candidate]`.
- **Both reviews:** the register editor and the fact read ran in parallel on the first draft. The
  chain escalated to the conductor after round 2 on one sentence (the round-1 "fix" persisted
  through the redraft, so the reviewer that flagged it re-read and flagged it again, which the
  chain's design routes to the conductor rather than a third automated round).
- **No grader read:** none was run; the chain proof exercises the drafter and review path only.
- **Cost:** folded into the pass ledger's task 9 line (about 0.65M against the plan's 0.2M
  review-page estimate, see the plan header's "Token ceiling" derivation); not re-measured here.

## 2. Owner Firefox review and the register fix it forced

The conductor published the drafted page through task 8's review-page template. Geoff's own
Firefox review (not Chromium, per the workstation's browser-first convention) found the first
published review artifact broken in Firefox: the page code was fixed and republished as version 3.

Geoff left four comments on v3, read back with `ArtifactComments`:

1. The page turned from steps to explanation with no lead-in.
2. The heading "What each posture emits" read as AI phrasing.
3. The heading "What declining doesn't buy" read as AI phrasing.
4. The heading "You know it worked when" read as AI phrasing.

**Why the register editor didn't catch them:** the register itself mis-scoped the academic voice
to the front door only, and had no heading rule and no "you know it worked when" mandate to catch
against. The fix went into the standard, not the page:

- `docs/internal/docs-register.md` commit `07d5c87e` ("scope the academic voice to every page, add
  the heading rule"): moves the academic voice into the universal contract governing every page
  (not only the front door), adds the heading rule the three flagged headings violated, and states
  the task-guide anatomy that keeps explanation subordinate to the steps (Geoff's comment 1).
- `docs/internal/docs-register.md` commit `fb5238d1` ("limit the academic voice to public-facing
  writing"): a same-day correction narrowing that scope to public-facing prose.
- `~/.dotfiles` commit `51c0f31` ("cairn-register-editor: the academic voice and heading rule
  govern every page"): the `cairn-register-editor` agent definition names the new rule directly,
  landing it where it executes rather than only in a side doc.

## 3. Redraft under the amended register

The redraft (`ba1cc7c1`) ran under the amended register. Round 2 flagged three sentences that
needed conductor fixes before the redraft was correct:

1. **The unset-posture doctor claim.** The draft asserted a behavior for `cairn doctor`'s
   `ai.posture-effective` check with an unset posture that does not match
   `tool/internal/doctor/check_posture.go`; corrected against the source and re-cited (`f:b970xo`).
2. **Byte-identical output.** A claim about `robots.txt` output being byte-identical across two
   states needed a narrower, source-checked statement.
3. **The managed robots.txt combined response.** The claim about Cloudflare's managed `robots.txt`
   needed to state the combined-response behavior precisely, matching Cloudflare's own page
   (`f:tno8hh`).

The redraft moved the crawler-decline listing and the limits of declining into the `buildRobots`
reference entry (`docs/reference/delivery-data.md`), and merged cleanly with task 10's prior
claim-check fixes to that same page and to `docs/reference/core.md`: the isolated diff
(`fb5238d1..draft-docs-0`, this task's own two cherry-picked commits) shows task 10's existing
claim-check content preserved and the redraft's `buildRobots` additions layered onto it, with no
conflict markers and no dropped content on either side.

Geoff approved version 4 with no edits (2026-09-28: "That pass worked wonders... I have no edits").

## 4. Landing the approved page

Per this closing task's direction, the approved page is not disposable: `82ec4217` (the chain's
first draft, brief, and facts) and `ba1cc7c1` (the redraft, brief, facts, and the `core.md` /
`delivery-data.md` reference edits) were cherry-picked onto `draft-docs-0` as `82c906e2` and
`c634f43c`, resolving the reference-file merges in favor of `ba1cc7c1`'s end state while keeping
task 10's claim-check fixes already on `draft-docs-0`. `137155f2` and `6e915701` were skipped: the
same register content already landed on `draft-docs-0` as `07d5c87e` and `fb5238d1`.

The narrative-arm freeze (`docs/extend/` frozen until its stage merges) does not block this: this
page is the owner-approved stage 0-1 proof the plan's task 9 itself governs, and CLAUDE.md's
sanctioned-deficiency-fix exception is the same mechanism that already let task 10 touch
`configure-rendering.md` in flight.

## 5. Gates

- `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:docs-gate'`: gate exit 0 (`check:docs-gate:
  OK (15 check(s))`, log `/tmp/cairn-gate-1000/1421b457a0049644/gate.log`). A concurrent light-lane
  gate invocation queued behind the same lock and reported the same green result; only one gate
  process actually ran.
- `npm run check:facts`: OK (`extend.md: 348 facts (verified 304, docs-drift 2, external 28, vendor
  1, candidate 12, rejected 1)`, no error).
- `npm run check:provenance`: OK (`docs/internal/briefs/extend/choose-an-ai-posture.json: 31
  sentences (cited 31, no-claim 0)`).

## 6. No-leak check

The plan's acceptance names `git diff <pre-proof>..draft-docs-0` from `6ad6dee8` (the owner-facts
commit, this task's `<pre-proof>`). Run literally, that diff spans everything landed on
`draft-docs-0` since `6ad6dee8`, which by now includes all of task 10 (the stage 1 claim-check
batches) and unrelated task 11-adjacent work (the go-tool chores plan and its records), not only
this task's own commits. Read at that scope:

- `docs/extend/` touches: `choose-an-ai-posture.md` (this task, landing the approved page — see
  "Landing the approved page" above) and `configure-rendering.md` (`cd6bf2d3`, a sanctioned
  deficiency fix from task 10's claim-check pass on a frozen page per `CLAUDE.md`, already on
  `draft-docs-0` before this task and not one of its commits).
- `docs/internal/briefs/extend/`: only `choose-an-ai-posture.json`, new, from this task.
- `briefs-rebuilt.json`: unchanged; no entry for `choose-an-ai-posture` anywhere in the file.
- `docs/internal/facts/extend.md`: changed well beyond `f:75hawi` alone, because this task lands
  the approved page for real rather than discarding it. The literal acceptance line ("changes only
  at `f:75hawi`") assumed the throwaway design in the plan's task 9 text; the dispatch for this
  closing task supersedes that by directing the page to land.

Isolating this task's own two commits instead (`git diff fb5238d1..draft-docs-0`, `fb5238d1` being
`draft-docs-0`'s tip immediately before the cherry-picks) shows exactly what this task added:
`docs/extend/choose-an-ai-posture.md`, `docs/internal/briefs/extend/choose-an-ai-posture.json`,
`docs/internal/facts/extend.md` (the new posture facts plus two line-number corrections to
existing ones), `docs/reference/core.md`, and `docs/reference/delivery-data.md` (the
`buildRobots`-additions merge described above). No other file changed. No conflict markers remain
anywhere in `docs/` (checked with a repo-wide grep for `<<<<<<<`/`=======`/`>>>>>>>`).

**Result: no unsanctioned leak.** The only `docs/extend/` and `briefs/extend/` touches are this
task's own intended landing of the approved page and a prior task's already-sanctioned deficiency
fix; nothing else crossed the freeze boundary.

## Finding: the page-chain's brief format and the register's anatomy disagree

The redraft moved carried claims (the crawler-decline listing, the limits of declining) out of the
extend page and into the `buildRobots` reference entry, which is exactly what the amended
register's task-guide anatomy wants (explanation subordinate to the steps, detail pushed to the
reference the steps link). But the page's own brief still lists those moved sentences as claims
"carried" on the extend page, because the page-inputs step's claim inventory format has no
disposition for "carried, but by a linked reference entry, not this page." A fact reader checking
the brief against the page sees claims the brief marks carried that the page no longer states,
which reads as dropped content even though the register correctly moved it. This is a chain design
gap, not a content error: the brief format (page-inputs step, `docs-page-chain.js`) and the
register's task-guide anatomy (`docs-register.md`) disagree about where a claim "lives" once a
redraft relocates it to a linked reference page. Filed to `docs/internal/docs-friction-log.md`
(see that file's new entry) for the page chain to resolve: either the claim inventory needs a
"carried by a linked page" disposition, or the fact-read step needs to follow a claim's citation to
wherever the current page text actually states it before flagging it dropped.

## Follow-up owed once PR #96 (setup-paid) merges

The redraft's page still carries one manual step (setting `posture` as the `robotsResponse`
option in the scaffold's own robots route) that a later engine change removes: fact `f:1ij5h5`,
recorded on the `setup-paid` branch, states that the scaffold's `robots.txt` route already passes
`cairn.aiPosture` through, cast to `CairnAdapter` because `defineAdapter`'s exact-literal return
type drops an omitted key rather than typing it `undefined`. Once PR #96 merges and this ships,
`choose-an-ai-posture.md`'s "wire it through" step is redundant for a scaffolded site and should be
removed in the pass that lands that engine change, with the brief updated in the same change.

## Review-page versions

- v1/v2: the drafted page, then the Firefox-breakage fix (page code, not content).
- v3: Geoff's four comments (see "Owner Firefox review" above).
- v4: the redraft under the amended register; approved with no edits.

## Owner facts (step 1, landed before this record at `6ad6dee8`)

The four STATUS items were checked and applied before the chain proof: `check:facts` green, the
STATUS lines for all four are gone (verified above by their absence from `docs/STATUS.md` on
`draft-docs-0`). No further action from this record.
