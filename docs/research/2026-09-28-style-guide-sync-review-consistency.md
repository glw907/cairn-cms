# Style-guide sync spec: consistency review

Lens: consistency against ratified documents. Target:
`docs/superpowers/specs/2026-09-28-style-guide-sync-design.md` at `99535b08` (cited as SPEC).
Other short names follow the audit's table: R is `docs/internal/docs-register.md` on `draft-docs-0`
(identical at `b8bfd30f` and at the branch head `140e8208`), APP is the 2026-09-26 approach spec on
`draft-docs-0`, STD is the 2026-09-08 standard. Every finding was checked against the file, not
memory. The Google tone quote was checked against the live page on 2026-09-28.

Counts: 0 blocker, 8 major, 8 minor.

## Major

### M1. "Measured, not casual" is an override, not a tightening (SPEC:48-50)

- **Defect.** The live Google tone page says "Use a voice that's casual, natural, and approachable,
  not pedantic or pushy" and "aim for a conversational tone rather than a formal one." The delta
  "Measured, not casual" negates the first rule by name. SPEC's justification, that Google already
  rules out jokes and frivolity, covers only the frivolity half. Under SPEC's own ruling 2
  (SPEC:44-47) and the owner goal, overriding a guide rule needs a recorded-exception row. Tagging it
  a tightening gets around the mechanism this pass creates on its first use.
- **Fold.** Add a Google exception row for tone, quoting G-tone's "casual" and "conversational
  rather than formal" sentences, with the 2026-09-08 ruling as its evidence. This is the audit's own
  C2 recommendation. Alternatively, reword the delta so it only narrows ("friendly and respectful,
  conversational without asides"). Either reading is a product call. **OWNER FORK:** (a) record
  "measured" as an exception row; (b) reword it to a pure tightening that keeps Google's
  conversational register. Recommendation: (a), since the academic tone is what Geoff wants to keep
  and (b) quietly changes it.

### M2. An unrecorded loosening survives: metaphor in explanatory prose (R:49-51)

- **Defect.** R:49-51 allows "A metaphor may pass inside explanatory prose where it clarifies." The
  live Google tone page says "Avoid figurative language, which includes metaphors." That loosens
  Google on every Google arm. Neither the audit (C1-C8) nor SPEC's seed rows list it, so after R1 the
  register still carries a self-serve override. That breaks acceptance criterion 1's intent and
  ruling 2.
- **Fold.** Add it to R1's Google exception seed rows if Geoff keeps it, or narrow R:49-51 to Google's
  rule. **OWNER FORK:** (a) record an exception; (b) adopt Google's ban. Recommendation: (b). The
  register already bans metaphor in definitional positions, and nothing in the record cites evidence
  for the explanatory allowance.

### M3. R5's "step removal" is stale and conflicts with task 11's resolution (SPEC:129-130)

- **Defect.** SPEC says "the step removal STATUS already owes (fact `f:1ij5h5`) folds in." That debt
  comes from `main`'s STATUS:45-46. On `draft-docs-0` it was already discharged at `b8bfd30f`, the
  commit SPEC plans against (SPEC:8-9). That commit scoped the step to older scaffolds and kept its
  snippet deliberately (plan `2026-09-26-draft-docs-pass-0-1.md` close, lines 577-579: "keeping the
  step and its snippet only for an older scaffold"; HISTORY:60). An implementer who follows SPEC
  would delete a step that pass 0+1 ruled should stay.
- **Fold.** Strike the clause, or replace it with "the `f:1ij5h5` scoping from `b8bfd30f` stays."

### M4. R5 skips the approach spec's "Edits after the chain" rule (SPEC:128-131)

- **Defect.** `choose-an-ai-posture.md` is a chain-accepted page with a brief
  (`docs/internal/briefs/extend/choose-an-ai-posture.json`). APP:355-360 requires any edit to update
  the brief's `sentences` in the same change and send changed sentences through both reviews, the
  register editor and the fact read. R5 names only "the register chain with the new guide lens," and
  acceptance criterion 6 gates only the docs gate. Restructuring the verify and failure sections
  changes sentences, so `check:provenance` goes red, or the fact read is silently skipped.
- **Fold.** R5 states: update the brief, run the fact read on the changed sentences, and gate on
  `check:provenance` with the page's brief (the docs gate's `--brief`).

### M5. Branch stacking contradicts APP and `draft-docs-0`'s STATUS, and its premises are stale (SPEC:200-202, 230-231)

- **Defect.**
  - APP:160-161 says "Every pass has its own worktree and merges to `main` before the next starts."
  - `draft-docs-0`'s STATUS resume prompt says the stage 2a plan is authored "after `draft-docs-0`
    merges."
  - SPEC branches off `draft-docs-0`'s head and carries forward into stage 2a, citing theme passes B
    and C. That chaining rests on Geoff's pass-specific ruling (STATUS:35-38, 2026-09-27), and no
    matching ruling exists for draft docs.
  - SPEC's reason, that waiting for PR #91 "would hold stage 2a behind pass B," has no support in
    either STATUS. PR #91's merge waits on "Geoff's word" (`draft-docs-0` STATUS). Only stage 1's two
    deferred reference pages wait on pass B.
  - The precondition in SPEC:200-201 and the risk in SPEC:230-231 are already met: the close landed
    as `140e8208`, and PR #91 is open at that head.
- **Fold.** Name `140e8208` as the base, drop the stale risk, and either cite a ruling or ask for one.
  **OWNER FORK:** (a) stack on `draft-docs-0` and carry forward into 2a, which amends APP's
  merge-before-next rule for this chain; (b) merge PR #91 first and branch off `main`, per APP.
  Recommendation: (b) if Geoff can give the PR #91 word in the same sitting as spec approval. Its cost
  is one merge. Otherwise (a), with the APP exception recorded in the plan header.

### M6. R4's two-level rollout cannot be expressed as specified, and the Names analogy is wrong (SPEC:103-105, 122-126)

- **Defect.**
  - R2 promotes `Google.Headings` and `Microsoft.Headings` to error by `.vale.ini` glob. R4 says the
    same rules run at error on `--page` and at warning across the rest of the tree.
  - The docs gate passes `--page` to the same `vale --minAlertLevel=error` over the same config
    (`scripts/checks/docs-gate.mjs:62-66`), and CI runs that gate over the full tree (APP:230-236:
    "the chain gate and CI read one list"). A rule at error in `.vale.ini` therefore fails CI on
    every unswept page, and a rule at warning never fails `--page`.
  - The "existing sweep policy for Names" (R:245-247) is not a level policy. `Cairn.Names` is error
    tree-wide (R:236), and the sweep governs judgment-level renames only.
- **Fold.** Name the mechanism: per-path `.vale.ini` sections listing rebuilt pages (or
  `briefs-rebuilt.json`), a second config passed with `--page`, or a gate-side level map. Drop the
  Names analogy. Test the mechanism with a fixture in CI. The same question applies to markdownlint
  in R3, which has no warning tier of its own.

### M7. R4 leaves three surfaces without a promotion trigger, and HeadingForm collides with pinned anchors (SPEC:106-107, 122-124)

- **Defect.**
  - "Warning until each frozen arm reaches its own draft stage" covers only admin, editors, and
    extend.
  - The reference arm is not frozen (CLAUDE.md, "maintained every pass"), and its stage 1 already
    ran on `draft-docs-0`. The audit's `auth-store.md` heading-after-heading and -ing findings
    (audit section 5, item 5) therefore never reach error.
  - The root README is out of the draft-docs scope (APP:130), carries `## Getting started`, and has
    no stage either.
  - `Cairn.HeadingForm` at error on the admin arm would fail pinned headings that APP:220-228 and
    APP:283-285 require to stay verbatim. `docs/admin/is-it-working.md:1` is `# Is it working?`, a
    question heading outside editors. `:187` is `## You're not on this site's editor roster`, listed
    in `scripts/checks/shipped-anchors.json:23` and `src/lib/diagnostics/conditions.ts:238`. APP
    states that "no redirect can repair a renamed heading."
- **Fold.** Add to SPEC's open list: a pinned-slug exemption for `Cairn.HeadingForm`, sourced from
  `shipped-anchors.json` and the pinned list, and an explicit promotion trigger for reference and the
  root README. For example, reference promotes in this pass after a scoped sweep, and the README at
  stage 5.

### M8. The register rewrite has no meaning-preservation check, and SPEC leaves ratified text contradicting its rulings (SPEC:76-99)

- **Defect.** R1 rewrites the whole document into a new voice (SPEC:96-98). Acceptance criterion 8
  checks only that the register editor raises no blocking finding, and no criterion says ratified
  meanings survive. Several ratified passages either contradict the rulings or need care.
- **Owed errata.**
  1. R:65-69 says the academic voice governs "every published page on every track ... READMEs, the
     changelog, admin copy, and cairn.pub." Ruling 4 removes editors and ruling 5 removes admin copy.
     R1 must narrow this scope sentence explicitly, and neither R1 nor R6 names it. R:78 ("The editor
     track keeps its plainer Microsoft floor inside this voice") must go. R:482-483 (front door "at
     its fullest") stays, now under the Google exception row.
  2. Changelog and cairn.pub sit in the voice's scope but not in ruling 1's arm table. The charter
     (row "Changelog ... Google") already answers the changelog question. Add both to the table.
  3. The keystone's closing sentence (R:40-42, "it is the other way to fail") is the audit's 4f
     "capper" example. Its meaning, that flat prose is a failure, is load-bearing: R:523-524 ("The
     keystone cuts both ways") depends on it. A voice-only rewrite may re-phrase it but must not drop
     it. R:10 records that the keystone "carried over unchanged" across Pass D.
  4. The visuals bullet at R:145-152 calls the diagram 320/390 exemption "an evidenced, recorded
     deviation," borrowing the vocabulary of the clause C1 deletes. The deviation is from the family
     responsive standard (CLAUDE.md, "Authored docs diagrams are exempt"), not from Google or
     Microsoft, so it does not belong in either exceptions table. Keep it and cite the 2026-08-15
     record, so the rewriter neither drops it nor converts it.
  5. The Names section must keep its heading, because CLAUDE.md links
     `docs/internal/docs-register.md#names`. The table's quoted Google and Git text and the
     ratified-good specimen (R:505-508, Geoff's own words) are quotations and must not be revoiced.
  6. The vendor-link rule (R:93-105) and the Diátaxis ruling (R:85-88) change voice only.
- **Fold.** Add an acceptance criterion: a meaning diff of old and new R, read by `diff-reviewer` or
  a fresh Opus read, lists every ratified rule with "kept, reworded" or "changed by ruling N." The
  criterion also verifies the `#names` anchor and the quoted material byte for byte.

## Minor

### m1. R3's revival also crosses APP's "No new check is built" (APP:17), beyond `check:headings`

SPEC:118-120 acknowledges reviving `check:headings` and markdownlint against APP:88. APP's brief also
says "No new check is built," and five new Vale rules plus `check:markdown` are new checks. This is a
method call, not a product fork. **Fold:** one sentence stating that this pass supersedes APP:17 for
structural checks, on Geoff's 2026-09-28 direction.

### m2. STD's fixture rule requires the fixtures to run in CI, and no harness exists (SPEC:181-182)

STD:214-216 and :616-618 say "The must-fire Vale fixtures run on every CI run, not once, so a future
pin bump fails loudly." The repo has no Vale fixture runner (`scripts/checks/fixtures/` holds facts,
idioms, and provenance only), and `Cairn.TwoHeadedHeading` ships without one. Acceptance criterion 2
says "under the CI Vale pin" but not "in CI." **Fold:** criterion 2 names a fixture runner wired into
the docs gate or `test.yml`.

### m3. W4 leaves two workstation lines that contradict ruling 1

`~/.claude/skills/writing-voice/SKILL.md:24` routes "End-user and editor product copy, admin
walkthroughs" to Microsoft. In cairn, "admin" is the Google terminal arm, so an agent routing a
`docs/admin/` page lands on the wrong guide. `~/.claude/docs/voice/editor.md:5-6` also lists "setup
walkthroughs," beside the line:4 phrase W4 already fixes. **Fold:** W4 qualifies both lines to "a UI
walkthrough with no terminal step."

### m4. Ruling 6 skips the charter's agent-facing row (SPEC:64-67)

The charter (`authoring-charter.md:40`) and `writing-voice` (`SKILL.md:25`) route agent-facing files
to "Anthropic / Claude Code best practices" (`agent-facing.md`). SPEC reaches the Google combined
voice through Anthropic's "match your prompt style" guidance, which is consistent, but it never cites
the row it applies. The parenthetical "(recorded in `spec-plan-review`)" does not say what is
recorded or where. **Fold:** "Per the charter's agent-facing row, Anthropic's guidance picks the
output voice as the prompt voice," and drop or clarify the parenthetical.

### m5. Acceptance criterion 7 may over-tighten Microsoft against ruling 4 (SPEC:189-190)

M-steps, as quoted in the audit's C6, says "It's OK to combine short steps that occur in the same
place in the UI." The `editor.md:37-41` exemplar ("select your account picture, and then select
Change photo") is Microsoft's own inline form for short same-screen steps. Ruling 4 says "Microsoft's
voice unmodified." **Fold:** criterion 7 applies to procedures that cross screens or exceed M-steps'
combine allowance. Keep a short same-place exemplar, labeled as such.

### m6. Admin copy exceptions have no home (SPEC:61-63, 133-135)

Ruling 2 places exceptions in the register, whose tables cover doc arms. Ruling 5 puts admin UI copy
under Microsoft, and `admin-design-system.md` holds UI-copy rules that tighten Microsoft: the em-dash
ban at :741 and the "cairn/stacking metaphor" allowance at :1243, which Microsoft does not forbid.
Nothing conflicts with `check:prose`, which ports `prose-guard`'s general-tier tells and bans the em
dash, a tightening. R6 must also touch :1236 ("the repo's `writing-voice` standard"), which is
consistent but indirect. **Fold:** R6 states that admin UI copy uses the register's Microsoft
exceptions table, and names :1236.

### m7. R5 should cite its freeze warrant (SPEC:128-131)

CLAUDE.md on `draft-docs-0` (lines 117-123) says "no pass rewrites an arm's prose ahead of its stage
merge," and extend lifts at 2b. R5's restructure is legitimate under the deficiency clause in the
same paragraph, and the page is already chain-rebuilt. SPEC does not say so, and stage 2a's outline
needs to know the page is not open for rebuild. **Fold:** one line citing the clause, and a note for
the 2a outline that the page ships as rebuilt.

### m8. Audit line citations for `.vale.ini` are off

On `b8bfd30f` and `main`:
- `Google.FirstPerson` is at :24-26, not :25-27.
- The README exclamation sanction is at :37-41, not :43-45.
- The `docs/internal/**` exemption is at :51-52, not :59-60.
- The Vale pin comment is at :6-13, not :5-12.

The README carries no exclamation heading today, so the seed row records a dormant sanction. That is
fine, but the row should say so.

## Citations verified as stated

- The audit's R citations: :12-17, :19-33, :40-42, :44-105, :54-55, :65-78, :79-84, :93-105,
  :115-155, :162-205, :245-247, :258-263, :298/:323/:349, :434, :485-510.
- STD :214-216, :345, :425-438, :445, :483, :614-618, :1336-1352.
- APP :75-88 and :105-116.
- `package.json:50`, `docs-gate.mjs:63-66`, `admin-design-system.md:56`.
- EDITOR :27-30, :70-72, :97-99, :128-133; DRAFTER :32-34; CHAIN FINDING and `common`.
- Both trigger passages: `choose-an-ai-posture.md:99-103` and
  `rotate-the-github-app-key.md:99-102` at `b8bfd30f`.
- The vendored `Microsoft.Headings` level (suggestion) and `Microsoft.GeneralURL` level (warning).
- The CI Vale pin (3.15.1, `test.yml:94`) and the workstation Vale (3.23.0).
- Fact `f:1ij5h5` exists, but see M3.
- No `engine-rulings.md` entry concerns markdownlint, heading checks, or the docs voice, so R3
  contradicts no ledger ruling.
