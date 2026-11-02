# p2-p4 plan review: contract and criteria lens

- **Target:** `2026-11-02-p2-p4-plan.md` and `2026-11-02-p2-p4-design.md` at `925d9ca0c`.
- **Checked against:** run sheet Brief lines 66-104 and pass 7 lines 397-416, ledger "## Rulings",
  and BACKLOG #180, #182, #238, #255, #256. Line references are to the plan unless named.
- **Counts:** 1 blocker, 12 major, 17 minor. 2 findings are OWNER FORKs.

The ledger holds no ruling later than the sheet that changes pass 7. Its approval entry repeats the
sheet's answers: zero states with no new surface, 320 and 2560 for eight screens, restrained email,
keyboard walk with Orca filed.

## Verdict on the deliberate stops

| Point | Can the conductor rule on it as framed? |
| --- | --- |
| S1 (paste and trim) | Yes. The options are real and the recommendation is clear. It needs three small corrections: finding 20. |
| S2 (#276) | Not yet. It omits that the sheet lists "composed at 320 and 2560" under May not, its costs are wrong, and it may not be the conductor's to rule: finding 2. |
| Contestable: full document load | Yes. The trade and the reason are stated. Its test is the weak part: finding 3. |
| Contestable: #276 | Same as S2. |
| Contestable: #248 leaves Pass 7 | Nearly. The sheet never scoped #248, so the move holds, but its stated reason is wrong and it gives no alternative: finding 21. |
| Contestable: light-only zero states | No. Its backstop does not exist and it carries no cost: finding 10. |

## Blocker

### 1. `correctness`: "composed at 320 and 2560" fell out of the May-not list, and the acceptance lets a non-composed screen pass

**Location:** plan:123-124, 107, 394-395, 430-432; run-sheet.md:407, 78.

**Defect:** The sheet's May-not list has four items, including "composed at 320 and 2560". Line 124
merges two of them into "the zero-state proof at 320 and 2560", so the composed bar is gone. T8 then
says "fix none past the editors table", and T10 says the executor "lists any it would not call
composed". An image the executor judges broken therefore still meets T10's acceptance. The pass can
close having set aside a May-not item, and the criterion cannot fail. The sheet says "composed means
composed, never merely unbroken."

Line 124 also contradicts the cut at lines 107 and 432. Past 780, the 2560 zero-state baselines go,
yet the zero-state proof "at 320 and 2560" may not be set aside.

**Proposed fold:** Restore the sheet's wording at line 124: "the zero-state proof, composed at 320 and
2560, the email, the keyboard walk". Add that the cut drops 2560 baselines, never the 2560 read. Change
T10's acceptance to: "every new image reads as composed; each that does not is fixed in this pass or
named by an S2 ruling". Change T8 so a composition find on one of the eight screens is fixed, with a
find past the path headroom going to `cairn-cms-9b` as a stop. Finds off the eight screens stay filed.

## Major

### 2. `correctness`, OWNER FORK: S2 recommends setting aside what the sheet says may not be set aside

**Location:** plan:53-55; design:22, 160-162; run-sheet.md:407.

**Defect:** S2 says the clipped filter "stays out" and that it could fail "composed", but it never
says "composed at 320 and 2560" is a May-not item. Line 38 then lets the conductor take the
recommendation by default as a reversible call. A May-not exception is a different kind of decision
from a reversible reading. The costs are also wrong:

- "Two 320 baselines" is four: office and media, each in light and dark.
- "The path gains 30 minutes" is 20. T8 goes from 60 to 90 in a pair with T7's 70, so step 6 rises
  from 70 to 90.

Neither S2 nor the design notes that `golden-path.spec.ts:785` pins one row and allows scrolling, so a
scroll cue does not break that pin.

**Options:**

- A. Leave it out and record four baselines of a clipped filter, to regenerate in the Cleanup round.
  This needs an explicit exception to the May-not.
- B. Fold the scroll cue into T8, at +20 on the path. `ListToolbar.svelte` joins T8's files, and the
  pair's file check at line 493 needs rereading.

**Recommendation:** B. The path is 505 against a ceiling of 780, it meets the sheet as written, and it
avoids a second regeneration in pass 8. Whichever is taken, S2's text should name the May-not and
correct both numbers, and the ruling should say whether it came from the conductor or from Geoff.

### 3. `correctness`: the sixth T6 test can pass under the regression it pins

**Location:** plan:336-338; design:98-102.

**Defect:** The design's hazard is that under Kit's `goto`, a second save stays on `?saved=1`, the
text does not change, and nothing is voiced. The test asserts the region "holds `Navigation saved.`"
after each save. Under that regression the region still holds the text from the first save, so the
assertion passes. The words "after each document load" name no mechanism that proves a load happened.

**Proposed fold:** Before the second save, set a marker on `window` and assert it is gone afterward,
or count `load` events. State the failure reason: "fails if the redirect runs through `goto`, because
the marker survives."

### 4. `correctness`: T6 names no fixture for two screens, and a mocked refusal fails first for the wrong reason

**Location:** plan:328-336.

**Defect:** Source gives real refusals for Nav (`Each item needs a label`, `site-config.ts:56`) and
Editors (`That editor already exists`, `editors-routes.ts:118`). "Rename a tag so the save refuses"
and "change a convention, refuse the save" name no input and no refusal, and the choice is left to the
executor. The fallback also weakens "each failing before the change". With `page.route`, the pre-change
full-page POST receives a JSON envelope and renders it as a document, so the test fails because of the
mock's shape, not because state was lost.

**Proposed fold:** Name each screen's fixture now, from `content-routes-settings.ts:298,418,447`, and
mark which are mocked. For a mocked screen, replace "fails before the change" with a named reason: the
pre-change run shows the working copy gone.

### 5. `correctness`: T5's "true for every status" is false, and 11 of the 13 strings go untested

**Location:** plan:288-297; design:133-134.

**Defect:** The constant's advice is to check the App's install, then the status page, and line 290
calls that true for every status. `branches.ts:52-54` says that its 422 covers "a malformed ref, an
unknown sha", where neither helps. The acceptance tests one `branches.ts` failure and one `repo.ts`
failure, so 11 strings can go unchanged and pass.

Two other clauses cannot fail. "No thrown text gains a token, key, or header value" is a static
constant, so it has nothing to detect. "So log parsing that reads the status still matches" has no
reader: a search of `src/lib` found no code parsing these messages, and four of the `repo.ts` strings
have no body to stay last.

**Proposed fold:** Word the constant conditionally ("If this keeps happening, check ...") and give
`branches.ts:54` its own text. Add one source-level check that every `GitHub ... failed` throw in both
files carries the constant, with a count of 13. Drop the two clauses, keeping "status stays in the
string" as the shape rule.

### 6. `correctness`: T9's "the spec passes" can be met by scripting around a finding

**Location:** plan:414-418.

**Defect:** A finding too large for one file is filed, and the spec must still pass. The executor can
only do that by asserting the defect, skipping the step, or rerouting focus, and the criterion cannot
tell those apart. A walk meant to find faults therefore has a green outcome that hides them. The walk
is a May-not item.

The refusal step also names no fixture. Under S1's warn reading the client blocks length, and
`required` blocks an empty title, so it is unclear what reaches the server by keyboard alone.

**Proposed fold:** Each filed finding gets a `test.fail` or `test.fixme` carrying its BACKLOG number,
so the spec shows it. Name the refusal fixture (the ROADMAP's taxonomy-validation case, or a `page.route`
failure envelope) and the field it lands on.

### 7. `correctness`: T4's acceptance skips the confirm page and undercounts the retired copy

**Location:** plan:262-272; `ConfirmPage.svelte:63-75`; `content-routes-shell.ts:310`.

**Defect:** The outcome changes `ConfirmPage`, yet the acceptance tests only the two `?error` codes,
which are `LoginPage`'s. `ConfirmPage.test.ts` is in the file list with no criterion. "Neither retired
sentence" names two, while the task retires at least six strings:

- `This browser has no pending sign-in` as a heading
- `Request a new sign-in link and open it in this browser.`
- `This sign-in link is invalid or expired.`
- `That link expired. Request a new link below and open it in this browser.`
- `That link expired. Request a new one below.`
- the title `Sign-in link expired · Cairn` (`LoginPage.svelte:65`)

The plan does not say what the confirm page's `h1` becomes. `ConfirmPage` offers a link, not a form,
so "below" needs checking there. `content-routes-shell.ts:310` uses `error=expired` as its example and
is missing from T4's files.

**Proposed fold:** Add a `ConfirmPage` no-token test asserting the shared sentence and title. List the
strings in the grep. State the `h1`. Add the shell comment to T4's files.

### 8. `correctness`: the T2 help fix has no test at the widths it claims, and the zero-state guard may be vacuous

**Location:** plan:198-205; design:17.

**Defect:** "At 320 and 2560 the help panel shows three cards with no counter glyph" has no fixture or
test, and T2 commits no baseline. The other help test bans `class="steps"`, which proves a name, not
the defect. Any other DaisyUI collision would pass it. "Each test first asserts the screen's heading
text" can mean the page heading, which also renders on a seeded site. If the `'empty'` harness broke,
T10 would then record populated screens as zero-state baselines under `--update-snapshots`.

**Proposed fold:** On the empty port, add a Playwright assertion at both widths of the design's own
evidence: `grid-auto-flow` is not `column` on the list, and `::after` content is `none` on each row.
Require each zero-state test to assert the zero-state text (`No posts yet`, `No tags yet`, `No menu
items yet`, the media empty heading, `Your first steps`).

### 9. `correctness`: T1's second test has no home, and its failure reason is not behavioral

**Location:** plan:163-168.

**Defect:** `devBackendContent()` lives in `examples/showcase/src/chassis/dev-gate.ts`, which imports
`cloudflare:workers`. No test reaches that module today, and T1's file list adds none, so the test
cannot sit in `npm test -w packages/cairn-cms-dev`. The first test's stated reason, "`seedEmptySite`
does not exist", is a name failure, and that function appears nowhere in the outcome. The behavior it
replaces is `handle.ts:135`, where anything but `'fixtures'` selects the repository backend. "One
`npx playwright test` smoke" names no spec.

**Proposed fold:** Cut the second test. The two ports prove both arms, which saves about 5 minutes and
a harness for one line. Restate the first reason as "`content: 'empty'` selects the repository backend
today". Point the port smoke at T2's zero-state tests, or name the spec.

### 10. `correctness`: the dark zero-state backstop does not exist

**Location:** design:46-47, 164; plan:461-462.

**Defect:** The design justifies light-only by saying "the close render read covers dark by eye". T12
reads "the ten zero-state images", which are all light, plus the eight screens. Nothing renders a dark
zero state, so the promise is undelivered and the screens T2 redesigns are never seen in dark. The
contestable point carries no cost, so the conductor cannot weigh it.

**Proposed fold:** Add to T12: render nav, tags, and help on the empty port in dark at 320 and 2560,
for six uncommitted images read in the main loop. Give the contestable point its cost: 10 more
committed images, against 6 uncommitted ones.

### 11. `correctness`: T8's test line cannot pass, and CI stays red by design from T2 to T10

**Location:** plan:399-400, 200, 429; `playwright.config.ts`.

**Defect:** `--grep editors` also selects T8's four new editors screenshot tests. The config sets no
`updateSnapshots`, so under Playwright's default a missing baseline fails the test and writes a local
PNG into the snapshot folder that T10 says never to commit. The same missing baselines make `e2e.yml`
red on every push from T2 until T10. The standing answer at line 106 says to trace CI red, and red by
design can hide a real failure from T6, T7, or T9.

**Proposed fold:** Give the T8 layout assertion its own test name and grep that. State that until
T10, the only accepted `e2e` failures are missing-baseline failures on the named new tests, and each
push's CI check confirms that list.

### 12. `correctness`: no task reads the eight screens at the other widths

**Location:** plan:393; run-sheet.md:78.

**Defect:** The approved Brief says "The sweep reads the other widths by eye either way." T8's eye
read covers other screens at 320 and 2560. Nothing reads the eight at 390, 768, or 1440, and CLAUDE.md
holds every family artifact to that five-viewport bar.

**Proposed fold:** Add one line to T8: read the eight at 390, 768, and 1440, in one theme, and apply
finding 1's rule to any find. No baselines.

### 13. `correctness`: the live smoke can pass #255 with no `messageId`

**Location:** plan:465, 470; design:84-86.

**Defect:** T12 asserts that `auth.link.sent` appears. T3 reads `messageId` as optional, so a record
without one passes, and #255's whole value is that field. Local `wrangler` writes the message to
`.wrangler/tmp/email/`, and I could not confirm whether its binding returns an ID, because the file
was not at the path I checked. The acceptance also says only that the "result" is quoted, which any
result meets.

**Proposed fold:** Assert the field and quote the record. If the local binding returns no ID, say so
in `## Decisions` and name where it gets proven, such as #245's real-install sitting, in a backlog
line.

## Minor

### 14. `correctness`: tags has no zero-state criterion

**Location:** plan:191-194, 202-203. "Both" Save behaviors and the tags `EmptyState` have no test;
only nav does. **Fold:** extend the sentence to `vocabulary-admin.test.ts`.

### 15. `correctness`: T3's criteria stop short of its outcome

**Location:** plan:221-226, 232-236. Nothing tests the `Sign in` label, `role="presentation"`, the
ignore line, the site name in the text part, or the subject, though the Brief names most of these.
**Fold:** one test listing the Brief's five elements, in the HTML and the text part.

### 16. `correctness`: T7's S1 criteria do not cover what they claim

**Location:** plan:365-375.

- The paste test names "a field", while three inputs change (`EditPage:2024`, `FieldInput:233,394`).
- "A value within bounds after trimming saves" cannot be shown by a component test.
- `edit-page-state-reset-coverage.test.ts` is a coverage check on state, and a validity message lives
  in the DOM, so it says nothing here.
- Nothing asserts that the invalid value survives the refusal, though T11 must answer exactly that for
  the ROADMAP entry.

**Fold:** a table over the three inputs; move "saves" to the integration test; assert the refused value
stays in the focused control; drop the reset-coverage clause.

### 17. `correctness`: T6's design promises go unpinned

**Location:** plan:320-321, 326-333; design:103-107.

- The identical repeat refusal has no test.
- The no-JS focus move has no test.
- Three of ManageEditors' forms have no criterion.
- "Its polite region" is ambiguous. `VocabularyAdmin:19` keeps a separate status region as its "a11y
  spine", and `CairnTidySettings:419,468` hold others.

**Fold:** in the Nav test, save twice and assert focus each time; grep `use:enhance` for a count of 4
on ManageEditors; name `{liveError}` as the only region removed; add the polite-region removal to the
Orca item, since no session can hear it.

### 18. `correctness`: T11 records more than the pass delivers

**Location:** plan:442-445.

- "Close #238" ignores S1's defer option.
- "Mark ... walkthrough ... done" is false while Orca stays open.
- "Say in that entry whether the gap still holds" has no failure state, and finding 16's assertion
  supplies the answer.

**Fold:** branch #238 on S1; mark only the keyboard half done and point at the Orca item.

### 19. `correctness`: the baselines can go stale after T10

**Location:** plan:94, 425, 454. Line 94 says T10 runs after the last `main` merge, and T12 merges
`main` again. **Fold:** T12 reruns T10 if that merge touches `src/lib/admin` or the admin CSS.

### 20. `correctness`, OWNER FORK: S1 needs corrections before it is ruled

**Location:** plan:42-51, 368; run-sheet.md:183.

The sheet gives this call to the conductor if it is reversible, with the reading listed in the PR's
`## Decisions`. The plan omits the `## Decisions` step. BACKLOG #238 calls it a product question, so
the sheet's row is the right one. "Defer ... saving 20 minutes" saves 10 on the path, since T8's 60
then sets the pair. "Trim" has no acceptance if chosen.

**Options:** warn, trim, or defer, as the plan frames them. **Recommendation:** warn, as the plan does.
**Fold:** add the `## Decisions` line and correct the saving.

### 21. `correctness`: #248's stated reason cites the wrong ruling

**Location:** plan:29-30; design:163; BACKLOG.md:83. "The sign-in ruling" is the Brief's email call,
whose "no new seam" concerns email. It says nothing about rate limits. The sound reasons are that the
sheet never scoped #248, that it fails the fold bar, and that its oracle question is open. The point
is flagged but sits in neither stop list and names no alternative. **Fold:** restate the reason in the
plan and the backlog, and add the alternative: bring it in, with a new option, a new outcome arm, and
the oracle decision.

### 22. `correctness`: "Editor pages and reproductions follow the screens" has no owner

**Location:** run-sheet.md:413; plan:446. T11 searches three strings only. `when-something-goes-wrong.md:56`
says other fields "are in the **Details** panel" and should reflect T7's new focus move. T2 has no page
step for nav and tags, though `manage-your-tag-vocabulary.md:9` carries a figure of Tags. **Fold:** T11
adds the changed screens' names to the search, per `.claude/rules/docs-with-code.md`, and reads the
Tags figure against T2.

### 23. `correctness`: three promised backlog items have no owning task

**Location:** design:27; plan:394, 500-504. The design says T8 files the class-name check; T8 does not
list it. The `e2e.yml:163` and class-name "Backlog item" lines sit in a seeds section no task reads.
**Fold:** T11 files them.

### 24. `optional`: the pair claim carries an inert clause

**Location:** plan:277, 251, 493. T4 and T5 are a pair, and both can edit `troubleshooting.md`. A
search found no GitHub failure string quoted there. **Fold:** drop the clause from T5's files.

### 25. `optional`: the 10-minute figure is written twice more with no link to its constant

**Location:** plan:223; design:69; `crypto.ts:68`. **Fold:** one unit assertion that `TOKEN_TTL_MS` is
ten minutes, beside the copy tests. Skip it if the copy tests already break on change.

### 26. `optional`: no scope verdict is recorded for two new public members

**Location:** plan:155, 359. `ContentFormFailure.field` and `content: 'empty'` on the published
`@glw907/cairn-cms-dev` are both justified, but CLAUDE.md asks for `cairn-judging-scope` before new
surface, and the plan cites none. **Fold:** one line each in `## Decisions`.

## Over-ceremony, by cost

### 27. `optional`: the same 42 images are read three times

**Location:** plan:430, 461-462, and T12 step 1. The executor reads all 42 in T10, reads them again in
T12 step 2, and `standards:visual-verifier` reads them too. That is the largest token cost in the
plan. The sheet requires one main-loop read and the verifier. **Fold:** T10 and T12 share one read in
the same session; T12 rereads only images changed since T10, plus the email.

### 28. `optional`: two of the four email PNGs prove nothing

**Location:** plan:238-239. The colors are fixed and no `prefers-color-scheme` rule exists, so
Playwright's dark render is the light render. It also does not imitate a client's inversion. **Fold:**
two PNGs, at 320 and 600. Hold them somewhere that survives the subagent's job, since T12 reads them
later.

### 29. `optional`: a reviewer's condition is already met

**Location:** plan:459-460. T3 changes `cloudflareSend` by construction, so the condition is always
true. **Fold:** either run `standards:cloudflare-workers-reviewer` unconditionally or cut it, since the
change is one logged result.

### 30. `optional`: a size criterion with no consequence

**Location:** plan:431. "Under 15 MB; past that, say so in the PR" cannot fail, and the sheet expects
about 9 MB. **Fold:** cut it.

## Checked and clean

- **Dependencies:** `AuthBranding` is gone from `src/lib`, #193 is closed, and pass 6 merged.
- **#96** is closed, so nothing rides the read.
- **Scope in the sheet with a task:** zero states (T1, T2), the viewport bar (T8, T10), sign-in and the
  email (T3, T4), the walk and Orca (T9), the cluster (T6), #180 claim 5 (T6), #182 (T4), #238 (T7),
  #255 (T3), #256 (T5).
- **Unrequested work:** no task builds anything the sheet or the five items did not ask for. Removing
  `expired` and the confirm branch serves #182, and `Save` hiding follows from replacing the card.
- **Arithmetic:** the path sums to 505, the 13 and 8 strings match their line numbers, and 42 images
  and the cut's 21 are right.
