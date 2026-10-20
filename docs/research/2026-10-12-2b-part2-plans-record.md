# Stage 2b part 2: the page plans, pass record (2026-10-12)

Executor session `draft-docs-2b-part2-plans`, branch `draft-docs-2b-part2-plans`. Plan:
`docs/plans/2026-10-12-draft-docs-2b-part2-plans.md`. The pass wrote 11 page plans in
drafter's plan format v1 and no page prose. This record holds the per-plan results, every format
finding with the date it went to `drafter-conductor`, the amendments that landed mid-run, and the
decisions the pass made.

## The plans

Every plan is at 0 errors from `drafter check-plan --facts docs/internal/facts` with both outlines
(`extend.json` and `claude-code.json`), and passes `check-leaks`. `scaffolded-site-files` links the
Claude Code page, which is in the outline and not yet on disk, so the validator reports one warning
for it, and it errors if that plan is checked against `extend.json` alone. The check script
`inventory.mjs` confirms that every outline and re-arm fact id is placed or disposed, never both,
with a reason on each disposition.

Counts are after T13. "Ids" is the outline's `factIds` plus the re-arm entry's facts. Each plan read
returned `fix` except `security-model`, which returned `accept`. One fold addressed each blocking
finding, and no plan had a second read.

| Plan | Type | Sections | Ids | Placed | Disposed |
|---|---|---|---|---|---|
| `extend/architecture` | concept | 16 | 67 | 50 | 17 |
| `extend/scaffolded-site-files` | reference | 31 | 90 | 59 | 34 |
| `extend/add-cairn-to-a-sveltekit-app` | tutorial | 41 | 100 | 87 | 23 |
| `extend/add-a-custom-admin-screen` | task guide | 14 | 103 | 82 | 31 |
| `extend/security-model` | concept | 29 | 105 | 89 | 20 |
| `extend/restrict-admin-access` | task guide | 13 | 49 | 52 | 17 |
| `extend/replace-magic-links-with-cloudflare-access` | task guide | 9 | 49 | 44 | 17 |
| `extend/add-a-second-sign-in-group` | task guide | 20 | 58 | 62 | 24 |
| `extend/debug-your-site` | symptom row | 30 | 44 | 35 | 14 |
| `extend/rotate-the-github-app-key` | task guide | 9 | 21 | 20 | 4 |
| `claude-code/using-claude-code-with-cairn` | task guide | 9 | 17 | 15 | 2 |

The Placed column counts `fact` items only; facts placed through `introduction.facts` add to it (`add-cairn-to-a-sveltekit-app` 90, `add-a-custom-admin-screen` 84). Placed counts above ids mean the author placed facts beyond the outline's list (see "Facts added
beyond the outline" below). The new outline is `docs/internal/outlines/claude-code.json`, one page,
17 fact ids.

## Decisions

- **Re-arm facts.** "Make sure the sections place its facts" is read narrowly (conductor-cairn-cms,
  2026-10-12): a plan places the facts that carry the change the re-arm entry's `done` text names.
  It disposes any other re-arm fact that is off the page's job, with a reason naming why and the
  page it belongs on. A re-arm fact whose `done` change cannot be placed gets a `gap:` friction
  entry. `architecture` placed 11 of its 22 re-arm facts and disposed 11 on this reading.
- **Facts added beyond the outline.** A plan may place a `[verified]` or `[external]` fact the outline
  does not list when the fact is on the page's job, and declares each addition in `friction`. The
  counts as the authors reported them: `add-a-second-sign-in-group` 28, `restrict-admin-access` 20,
  `add-cairn-to-a-sveltekit-app` 13, `add-a-custom-admin-screen` about 12, `debug-your-site` 5,
  `security-model` 4, `scaffolded-site-files` 3, `rotate-the-github-app-key` 3 (plus two
  `[external]` additions it could not place), and the Claude Code outline added 6. The other plans
  reported none. `drafter-conductor` is raising the cost of the friction form at 28 entries with
  Geoff.
- **`f:i1dayf`** was retagged `[verified]` and placed in `debug-your-site`. Its bullet matched
  `section-action.ts#createSectionAction.wrap`, checked against the code in T13 (conductor-cairn-cms
  asked for this).
- **A re-arm cut whose home is another page** became a subordination to that page (`add-a-custom-admin-screen`:
  `f:7cv105`, `f:l3cxgc`). A cut means a fact goes nowhere.
- **Reader-state compromises.** Making steps `optional: true` made the walk warn where a required
  step needs a token only optional steps produce. The swap agents resolved each by listing the
  token in `preconditions` or dropping it from `requires`, where no step existed for the other
  route: `using-claude-code-with-cairn` (`guidance-tree`, `import-line`), `add-cairn-to-a-sveltekit-app`
  (`project`, `local-repo`, `repo-pushed`), `restrict-admin-access` (`s-apply-migration` requires
  `deployed-site`), and `replace-magic-links-with-cloudflare-access` (`s-deploy` no longer requires
  `cache-clear`). The cost is that the walk no longer proves those tokens are earned. The drafting
  run's plan read should look at them.
- **`replace-magic-links-with-cloudflare-access`** marks its 11 "Resolve" steps optional, and
  **`add-a-second-sign-in-group`** marks the whole role path optional (17 steps), because each is a
  route the reader may skip.
- **Plan reads are leads.** The `debug-your-site` read said refusals log no event, and the code logs
  `auth.access.refused`. A plan-read finding is checked against the code before it is folded.

## Deviations from the plan

- Pair worktrees skipped the cairn-pass setup, as stated. Each loaded `yaml` and `loadFactIndex` from
  the session worktree by absolute path.
- The session merged each pair without pushing, as stated, and pushes once at T15.
- Pairs ran in the order A, B, C, D, E with lane F beside pair A. The Agent tool ran the nested
  author, read, and fold dispatches asynchronously even when the prompt said foreground, so each
  pair waited on completion messages.
- The real validator (`drafter check-plan`) was installed partway through, so pairs A and the first
  batches ran only the stand-in `check-plan-lite`. Every plan was re-checked by the real validator
  before the final commit.
- T13 swapped each friction workaround for the field drafter F1 added (`introduction.facts`, `optional`,
  `anchor`, `facts` on `code` and `reason`, an omitted or URL `code.source`). Four swap agents did the
  edits, and the session ran both validators over the result.
- T15 step 5 (the `embed.mjs` ROADMAP entry) was already filed by `conductor-cairn-cms` as #121,
  "The docs review page can't show a YAML page plan". This pass adds none.
- The Claude Code outline carries a `crossLinks` array and omits `group`, `order`, and `batch`. A
  later commit corrected the outline's CI line (`--strict` alone cannot fail a job that has
  `continue-on-error: true`).

## Fact corrections applied (T13)

Applied to `docs/internal/facts/{extend,reference,front-door}.md`, each checked against the code: 40
bullets (shifted Source lines, overbroad claims narrowed, `f:3rb362` four places instead of three,
`f:ejuoh6` the confirming signal is `/healthz?live=1`, `f:5ohm23` and `f:jd54ph` narrowed, `f:thbxvf`
named the `turnstile.verify_failed` event, `f:u78zg6` and `f:cvzb8z` the dev handle's `cairnAccess`
line) and the part 1 drift items `f:hsk70g`, `f:x84fah`, `f:smbsa6`, `f:zyjzeg`. `check:facts` passes.

## Format findings sent to drafter-conductor

Eleven batches, one per page as its plan returned, plus one batch of setup notes. The replies and the
amendments that landed follow each batch in the log below. Each finding named its page and quoted
the plan item it hit. Dates are all 2026-10-12.


### 2026-10-12 batch 0 (setup, check-plan-lite)

1. Flow-style lists in `requires`/`produces`: the sheet example uses a flow list in `preconditions` but block lists elsewhere; unclear that flow is fine in step fields. Assumed yes.
2. Links: "A path must exist under the repo root" vs "resolve from the directory of page.path": the validator needs a stated repo-root rule (a `--root` flag), since a stand-in infers it from the plan file's location.
3. The plain-scalar rule's coverage of list items in `constraints` and `friction` is implied, not stated. My lite check flags them.
4. No mirror check that a `failure` with `from` points at a step with `canFail: true` (flag-only suggestion).

### Amendment received 2026-10-12 (via conductor-cairn-cms, from drafter-conductor)
1. Flow and block lists equivalent. 2. Link root: --root, default the git top level of the first plan's directory; my stand-in infers the same root from the plan path (equivalent for worktrees). 3. Real validator flags only plain list items carrying " # "; lite check stays stricter (kept). 4. Mirror check deferred. No shape change; finished plans stay valid.

### 2026-10-12 batch 1 (using-claude-code-with-cairn): sent. Nine findings: introduction has no facts slot; either-or arrival (optional step); handledBy accepting a link target; deferred-run failures; use vs exclude; vendorLink on sentence/reason; checks wished (crossLinks vs links, narrow code excerpts); one fact placed in several sections; reference-only claims. Asked whether the installed drafter takes --root (it does).

### Replies received 2026-10-12 from drafter-conductor (answers to batch 1)
Installed drafter is the Pass 0 build (check-plan with --facts --outline --root --json). Accepted for a later follow-up (use workarounds now): introduction.facts; optional steps. Sheet clarified: handledBy may name any item kind; a later-triggered failure is free-standing (no from) with cause saying when; use is restrictive (no exclude); no fact-less claim field (link item plus friction is right); anchors checked by the real validator; path#L25-26 accepted in code.source; one fact in several sections allowed, each with its own use.

### 2026-10-12 batch 2 (architecture): sent. Thirteen findings: introduction facts; opens facts; table kind; link attach target; clause omission (use restrictive); list form; per-section never; re-arm ambiguity (22 facts, 11 placed, 11 disposed); targetStates on subordination; H2 with only H3 children; inventory completeness check; figure.source prose?; verbatim binding strength; sentence.facts vs placement.

### Replies received 2026-10-12 (answers to batch 2)
Queued for follow-up F1 (refused by installed check-plan now; keep workarounds): introduction.facts; optional text on link; a level-2 section may have empty items before a level-3. Answered without a field: fact behind opens is a fact item whose use names the opening sentence (intended, not duplicate); tables and lists said in use/text/constraint; clause omission stated in use; negative claim stays a constraint; re-arm disposal governed by the plan step's rules (stated in our pass plan: off-topic re-arm facts may be disposed with reason); no targetStates (file docs-drift); inventory completeness not check-plan's job; figure.source plain token; verbatim = word for word, claim = own words; sentence.facts cites but does not place.
Pass-plan rule on re-arm facts (conductor-cairn-cms): note in the PR body under decisions.

### 2026-10-12 batch 3 (scaffolded-site-files): sent. Thirteen findings: directory source on code; facts list on code; partial use of stale fact; facts outside inventory (no rule); sentence resting on a disposed fact; parent section filler (F1); link grouping; notCovered paths unchecked; cross-lane link needs --outline for every outline; subordination to stale target; cluster disposition with five repeated reasons (wanted facts list on a disposition); sentence claim vs reason for inference; anchors by drafter check-plan.
Pair A merged (architecture, scaffolded-site-files); lane F merged. Real validator over all three: 0 errors, 1 warning (expected cross-lane link).

### Replies received 2026-10-12 (answers to batch 3)
F1 additions: optional facts on code (until then ids stay in text); --outline repeatable. Answered: directory source allowed; stale half to friction + docs-drift; check-plan accepts any fact id the facts files carry, whether a plan may add facts beyond the outline is cairn's rule (decision recorded below); a sentence cites placed facts only; group of links = level-3 section or verbatim lead-in sentence; no notCovered path checking; no cluster disposition (repeated reason fine); an inference is a claim sentence whose facts lists what it follows from; a reason is a "why" the page must keep.
Decision (executor, for the PR body): a plan may place a [verified] fact beyond the outline's list when it is on the page's job; it declares the addition in friction.

### 2026-10-12 batch 4 (add-a-custom-admin-screen): sent. Eleven items: optional sections evidence; illustrative code snippet source; handledBy order/section; failure on a missing precondition; belongsOn on a cut; drift field (fifth page); stable slug (anchor:) on sections; does use override the bullet; handoff vs sentence; introduction links; cross-plan anchor check candidate.
Merged: add-a-custom-admin-screen (pair B, T5). Fact corrections for T13 in findings/add-a-custom-admin-screen.md.

### Replies received 2026-10-12 (answers to batch 4)
F1: step optional: true (conditional section = its steps optional; walk warns when a required step requires a token only optional steps produce); optional anchor on a section (until then keep the constraint). Answered, now in the sheet: illustrative snippet points at the modeled file and text says illustrative; handler may sit anywhere; failure from missing state is free-standing with cause naming the state; a fact whose home is another page is subordinated with that page as reference, NOT cut (cut = goes nowhere); drift = friction; a use taking only the correct half is intended (file the stale half as drift); a cross-reference sentence is a link item, a handoff is a section's closing turn; introduction links go in the first section as link items; cross-plan anchor check belongs to the consistency read.

### 2026-10-12 batch 5 (add-cairn-to-a-sveltekit-app): sent. Five items: disclosure blocks; either-or requires (requiresAny); gaps list for unplaceable re-arm claims; repeated lead-in boilerplate (lead: per section); evidence that orderReason works when the order departs from covers.
Merged: add-cairn-to-a-sveltekit-app (T4). Pair B complete. Fact corrections in findings/add-cairn-to-a-sveltekit-app.md.

### Replies received 2026-10-12 (answers to batch 5)
Nothing new for F1. Disclosure stays a constraint. Either-or input: let both routes produce the same token (sender-ready), optional once F1 lands, no requiresAny. friction is the list surfaced to the facts pass: prefix "gap:" for a claim the page needs and cannot have yet. Repeated lead-in items may be replaced by one constraint (optional tidy; T13 may apply to add-cairn).

### 2026-10-12 batch 6 (restrict-admin-access): sent. Nine items: two-cause failure; ordered diagnostic list; expect field vs a sentence after the step; clause-level use; stale outline covers (departures list); code.source modeled on two; facts whose home page does not exist (cut loses the pointer; reference to an unplanned path errors); subordination to stale pre-2b targets; intro-backing lint.
Merged: restrict-admin-access (T7). Fact corrections in findings/restrict-admin-access.md.

### Replies received 2026-10-12 (answers to batch 6)
No F1 change. Two causes = two failures; verbatim lead-in plus free-standing failures in prose order is the ordered-list carrier; a step's expected result is a sentence item after the step (no expect); a deliberate departure from an outline cover goes in orderReason plus a friction entry prefixed "departure:"; a planned home page can take a subordination if an outline lists it (--outline; not-on-disk is a warning); unlisted home = cut with the home named in reason (fallback); stale targets = docs-drift friction; no intent lint.

### 2026-10-12 batch 7 (security-model): sent. Seven items: intro links duplicate Related resources (serves: introduction); split-fact uses disjoint check; handoff verbatim vs instruction; does check-plan enforce sentence facts placed; restrictive vs descriptive use wording; anchor stability at scale/redirects; "Do not carry forward" constraints as real vocabulary.
Merged: security-model (T6). Pair C complete. Fact corrections in findings/security-model.md.

### Replies received 2026-10-12 (answers to batch 7)
F1 adds: an id-integrity error when a sentence/code/introduction `facts` names a disposed fact (plan-internal). Answered: keep one link item per target (Related resources) and carry "these links also render in the introduction's not-covered list" as a constraint, so the sc-out-* duplicates may be dropped; no coverage check on split uses; a handoff's text says what the turn must do and the drafter writes the sentence (verbatim sentence for a copy); a restricting use starts with "only" or "omit"; old-slug redirects are the outline's job; "Do not carry forward" constraints are the right home.

### Notice 2026-10-12 (conductor-cairn-cms): Pass 0 merged; reference is ~/Projects/drafter/docs/plan-format.md (interim sheet keeps batch 1-7 conventions; read both). Run drafter check-plan per plan per outline; record the per-outline run for scaffolded-site-files in the PR body. introduction.facts, step.optional, link.text, empty H2 items refused until F1.

### 2026-10-12 batch 8 (replace-magic-links-with-cloudflare-access): sent. Ten items: figure placement and empty source; external code source; raw <a id> anchors (drafter anchors wished); long requires (summary token); step facts via a fact item; later-surfacing failure; handledBy redo; failure handled by a section on another page; negative claim vs code sample; See also duplicate rule.
Merged: replace-magic-links-with-cloudflare-access (T8). Fact corrections in findings/replace-magic-links-with-cloudflare-access.md.

### Replies received 2026-10-12 (answers to batch 8)
Drafter is main 140bc00. An introduction figure goes in the first section; omit source when there is no id (an empty value is refused). F1: code.source may be an http(s) URL. Later: drafter anchors, raw <a id>. Summary token for long requires; a step's fact is a fact item right after it; failure/handler patterns (6 to 8) work; page-level review owns negative-claim vs code; plan Related resources as a section (the drafter drops links the body carries).

### 2026-10-12 batch 9 (add-a-second-sign-in-group): sent. Seven items: where a failure renders; from vs free-standing for a missing migration; sentence cites facts placed in later sections; reason items cannot cite facts; "only/omit" rule arrived mid-run (19 rewrites); illustrative code with no model file; scale of additions (28 beyond the outline).
Merged: add-a-second-sign-in-group (T9). Pair D complete.

### Replies received 2026-10-12 (answers to batch 9)
F1 (drafter-f1, launched 16:40) full list: facts on introduction, code and reason; step.optional with optional-only warning; link.text; empty H2 items before H3s; section.anchor; code.source as http(s) URL or omitted; repeatable --outline; error when a facts list cites a disposed fact. Answered: a failure renders where its item sits (a closing Resolve section is valid); free-standing with cause for a skipped-route state; a fact may be placed anywhere (citing a later one is fine); sheet example now shows `use: Only ...`; added: refused for now (being raised with Geoff; keep per-plan counts of additions).

### 2026-10-12 batch 10 (rotate-the-github-app-key): sent. Nine items: conditional precondition; one failure with two remedies; shared handler; repeated procedure under new tokens; mixed include/omit use; re-arm facts missing from inputs (f:h252kb, f:1pb077, f:s90j7l); [external] placement confirmation; friction prefix vocabulary; crossLink purpose coverage.
Merged: rotate-the-github-app-key (T11). Additions: rotate 3 declared (plus f:s90j7l, f:z97ilc [external]).

### Replies received 2026-10-12 (answers to batch 10)
No new fields. One cause with two remedies = two failures with the same symptom, `cause` says which situation picks which; a repeat procedure is a constraint; [external] places like [verified]; friction prefixes fixed: gap: / departure: / drift: / crossLink: / format: (use "drift:" for "docs drift:"); cross-plan anchor and crossLink purpose checks belong to the consistency read.

### 2026-10-12 batch 11 (debug-your-site): sent. Eight items: facts on failure.cause; symptom-fact-fix position order; fact split over two rows; link to a page on disk but in no outline; target in no outline and not on disk (admin troubleshooting); one fact placed twice in a section; sentence citing a fact in another section; plan read can be wrong about code (a lead, not an authority). Fact finding: f:i1dayf looks mis-tagged [docs-drift], matches code.
Merged: debug-your-site (T10). All 11 plans merged.

### Replies received 2026-10-12 (answers to batch 11)
facts on failure queued after F1 (use the fact item beside the failure); failure, backing fact, fix step in prose order is fine; outline-coverage items (page on disk but in no outline, planned in none) belong to the outline pass; plan-read claims about code are leads; f:i1dayf tag question passed to conductor-cairn-cms.

### Notice 2026-10-12 (conductor-cairn-cms): drafter F1 landed (glw907/drafter#6), reinstalled 16:50; reference ~/Projects/drafter/docs/plan-format.md (interim sheet retired). Accepted now: facts on introduction/code/reason, optional on step, link.text, empty H2 items before H3, section.anchor, code.source URL or omitted. facts on failure still refused. New error: a facts list citing a disposed fact. A citation needs no fact item (reference); lite check's "sentence facts must be placed" is stricter than the validator (ignore). T13: four sonnet agents swap workarounds for the real fields (swap-prompt.md); conductor's 16:52 run on the working tree: 0 errors, 1 warning (scaffolded-site-files:151 expected).


## Found, not done

- **Stale pages contradict the corrected facts** (docs drift, not fact bullets; each rebuilds with its
  page in 2b part 2): `docs/extend/restrict-admin-access.md:111-132`, `docs/extend/scaffolded-site-files.md`
  (lines 160-166, 255, 274-276, 282-288, 325-345, 366-371), `docs/extend/debug-your-site.md:197-200`,
  `docs/extend/upgrade-cairn.md:103-104`, `docs/extend/add-cairn-to-a-sveltekit-app.md` (454, 527-540,
  1145), `docs/extend/security-model.md`, `docs/extend/add-a-second-sign-in-group.md`
  (98-115, 156, 188, 559), `docs/extend/migration-notes.md:45-46` (unchecked against sv),
  `docs/reference/sveltekit.md` (1019-1021 and the `loadHealth` 5 versus 5.5 seconds),
  `docs/reference/site-facts.md:40-48`, `docs/reference/cairn-audit.md:248`,
  `docs/reference/cloudflare.md`, and the reference pages the findings name as partial
  (`admin-toolkit.md:30`, `auth-crypto.md:161`, `cli-cairn-doctor.md`). Disposition: defer to the
  rebuild of each page or the reference-arm corrections item in 2b part 2.
- **The outline's debug-your-site cover 8** says the site-facts check reports `current` when the
  adapter cannot derive facts. The code returns `skipped` (`src/lib/vite/internal.ts:633-636`).
  Disposition: defer to the outline pass.
- **Fact gaps the plans filed as `gap:` friction**, for the facts pass: the dev backend wires no audit
  sink; what `cairn-extension-reviewer` reviews; `VERSION` after `install`; exit 2 on bad args;
  the `.orig` copy; `check`'s snippet output; `[vendor]` facts for the Claude Code `Stop` hook timing
  and GitHub's `continue-on-error`; the turnstile and channel facts (`unavailable` outcome,
  `insecureTestChallenge`, `ChannelDatabaseLike`, the challenge signature, `auth.channel.requested`
  outcomes); a no-fingerprint failure row for rotate-the-github-app-key; `f:s90j7l` and `f:z97ilc`
  as outline fact ids. Disposition: defer to the facts pass.
- **Mixed tags**: `f:0gltjq`, `f:2glcaf`, `f:33upyd`, and `f:ejuoh6` (which now also carries a cairn code claim about `/healthz?live=1`) are tagged `[verified]` or `[external]` but half of each
  claim is external Cloudflare behavior; the plans restrict each with `use`. Disposition: defer to
  the facts pass.
- **Not folded, non-blocking plan-read findings**, recorded in each findings file under
  `$HOME/.cache/cairn-2b-part2/findings/` (not committed): for example the signups markup in
  `add-a-custom-admin-screen`, the three route-file code items in `add-cairn-to-a-sveltekit-app`, and
  the `src/chassis/` section in `scaffolded-site-files`. Disposition: defer to the drafting run's
  plan read.
- **Admin-track homes.** Facts whose home is the admin track (`f:gcuj1j`, `f:vfpai6`, `f:xw0bit`,
  `f:hwffph`, `f:bw5uk0`) are cut with the home named in the reason, because no outline lists an admin
  page. Disposition: defer; they become subordinations when that arm's outline exists.
- **Cross-plan checks** (an anchor one plan links against the heading another plan plans; a crossLink's
  purpose against the target page) belong to the consistency read. Disposition: defer to 2b part 2's
  consistency read.
- **Plan format asks still open** (drafter's follow-ups, not cairn's): `facts` on `failure`, an
  `added` list for facts beyond the outline, `drafter anchors`, raw `<a id>` anchors.
