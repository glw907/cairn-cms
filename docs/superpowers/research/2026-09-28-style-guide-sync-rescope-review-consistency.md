# Style-guide sync re-scope review: consistency and domain risk

Lens: consistency with ratified documents, and domain risk to the register (ruling 16).
Targets at `e0d5f954`: the re-scoped spec and plan. Counts: 0 blocker, 5 major, 6 minor.

## What checks out

- **Verdict table.** Every Keep is kept, every Cut is cut, and every Walk back is walked back,
  with one exception: the "`vale test` pairs" Keep became a custom script (finding 1).
- **Freeze and the facts container.** J2's throwaway branch leaves the extend arm unchanged on
  `main`, and its freeze lifts at the 2b merge, so a draft that stage 2a may adopt is consistent
  with the repo `CLAUDE.md`. R9's `docs/internal/exemplars/` belongs to no arm. `.vale.ini:50-51`
  gives `[docs/internal/**]` an empty `BasedOnStyles`. `check-arm-indexes.mjs:33` walks
  `docs/internal` non-recursively, so the new subdirectory needs only the README that R9 already
  plans. No public behavior changes, so no facts bullet is owed. See finding 10 for J2's fact
  read.
- **Citations, all verified.**
  - `choose-an-ai-posture.md` at `8bbe78f5`: lines 6-8 hold the bold precondition, and lines
    23-26 hold the concept paragraph verbatim, matching the register. Lines 78-96 hold `## Verify
    the served file`, 97-108 hold `## Resolve a posture warning`, and 99-103 hold the prose
    procedure ("Check first ... If both hold, look for ..."). The page is 758 words.
  - `rotate-the-github-app-key.md:99-102` at `8bbe78f5` holds the prose-procedure paragraph under
    the killed heading "You know it worked when".
  - `admin-design-system.md:56` holds "slightly academic", `:1238` holds
    "friendly-but-professional", and `:1243` holds the stacking-metaphor line.
  - The W4 task in the `fb1aeba3` plan sits at lines 342-384, and its parity sentence sits at
    377-379.
- **Dependents of the walked-back pieces.** Outside W1's own files and
  `cairn-register-editor.md`, nothing in either tree names `q:`/`x:` markers,
  `promoted-docs.json`, `check:register-briefs`, or `docs-chain-render.mjs`. In the repo, only
  research records name them. `docs-page-chain.js:33`'s `promoted-docs.json` comment arrived in
  `79c5e23` and is absent at `d7f0581`, so the revert removes it. STATUS on `main` depends on
  none of them, and the stage 2a plan is not yet written.
- **Google license.** The claim is correct. The footer of `developers.google.com/style/procedures`
  reads: "Except as otherwise noted, the content of this page is licensed under the Creative
  Commons Attribution 4.0 License, and code samples are licensed under the Apache 2.0 License."
  Finding 5 covers the Microsoft claim, which is wrong.

## Findings

### 1. Major: R2 invents a script that Vale 3.23.0 already ships

- **Location:** spec 91-95, spec 153-155, and criterion 3; plan R2 (122-130).
- **Defect:** the spec says "Vale 3.23.0 has no `vale test` command" and has R2 build
  `scripts/checks/vale-rule-examples.mjs` to fill the gap. The premise is false, so the script is
  invented machinery that ruling 15 and G4 exclude. The leanness record's "Vale 3.x ships `vale
  test`" was right.
- **Evidence:**
  - The workstation's `vale --version` reports 3.23.0, the CI pin. `vale test --help` prints "Run
    the test cases kept beside a configuration's rules", and `--coverage` means "every rule found
    under the given paths has to produce an alert in at least one case."
  - The v3.23.0 release notes (https://github.com/vale-cli/vale/releases/tag/v3.23.0) say: "A rule
    can carry its own `tests:`, and `vale test --coverage` lists the rules without any." The test
    case schema has `input` plus either `expect` or `match`, which gives must-fire and
    must-stay-silent cases.
- **Fold:**
  - Put each rule's pass case and fail case in the rule YAML's `tests:` (`match: false` for pass,
    `match: true` for fail). The two `ProseProcedure` fail cases are the cited passages.
  - Have the docs gate's tree mode run `vale test` over the two rules.
  - Remove `vale-rule-examples.mjs` and its examples directory from R2's Files.
  - Correct the Sources bullet to cite the release notes.
  - The one-time demonstration in R2's acceptance becomes "a fail case edited clean makes `vale
    test` exit non-zero."

### 2. Major: "every quotation byte-identical" lost its definition and now collides with the trim

- **Location:** spec 131-132 (R1t), spec 250-252 (criterion 2), and plan 116 (R1t).
- **Defect:** the `fb1aeba3` spec defined the phrase at lines 192-194: "every quotation (the
  Names table's Google and Git text, the ratified-good specimen) byte for byte ... Anti-pattern
  specimens stay, fenced or quoted and tagged 'Killed:'." The re-scope drops the parenthetical and
  the anti-pattern clause. Read literally, "every quotation" now covers the 50 guide quotations in
  the briefs, which R1t's trim removes, and the 50 source-text cells of the "Guide quotes" table,
  which R1t turns into a links list. Criteria 1 and 2 then contradict each other, or an
  implementer keeps the quotations and misses the trim.
- **Related gap:** ruling 16 and the plan name "the `Killed:` specimen" in the singular. Ruling 8
  (`fb1aeba3`) keeps the "writing room" and "four arms" Killed specimens as illustrations. The
  register carries at least eight other Killed items, including the three killed headings (Geoff,
  2026-09-28) and the marketing, self-admiring, setup-colon, and two-headed specimens. A "short
  tell list" target puts them at risk.
- **Fold:** restore the `fb1aeba3` parenthetical in R1t and criterion 2, with the voice
  specimens added. Add "every anti-pattern specimen tagged Killed: stays, and counts as a
  specimen for the word count."

### 3. Major: the word cap is reachable only by removing the structure rules from every agent's input

- **Location:** spec 119-124 and criterion 1; plan R1t (110-111).
- **Defect:** per-bullet counts of the current developer brief (register 60-266, markers
  stripped, link URLs not counted) give these totals:

  | Content | Words |
  |---|---|
  | Brief as it stands | about 2,130 |
  | Voice specimens (concept paragraph, killed paragraph and its gloss, why-cairn block) | about 330 |
  | Verbatim guide quotations | about 400 |
  | Paraphrase of Google-only structure rules | about 300 |
  | Cairn-specific content, with every Google restatement removed | about 1,090 |

  The cairn-specific content breaks down as the vendor-link ruling (177), the Voice bullets and
  lead (321), the tells (342), the question-heading ban (54), Diátaxis (56), ordered checks (39),
  the length override (25), and the intros (74).

  Reaching "under 1,000" therefore needs every structural rule removed and also either the Killed
  lines counted as specimens (about 120 words) or a ratified rule compressed. The vendor ruling
  is the obvious target, which is the pressure ruling 16 forbids.
- **The deeper risk:** R1t removes whatever restates a rule that "the stock Vale package or the
  guide itself carries." The stock Google package does not check numbered procedures, one action
  per step, location first, list and table introductions, or notices. The "or the guide itself"
  clause removes those rules anyway. Neither agent can read the linked guide:
  `cairn-docs-drafter` and `cairn-register-editor` list Read, Write/Edit, Grep, Glob, and Bash,
  with no WebFetch. The R9 captures show anatomy, but they state no rule.
  - The pass's own target defect, prose procedures, would reach the drafter only through
    imitation.
  - Ruling 19's source, checklist-driven critique, assumes the editor holds a checklist.
  - The editor's first lens, per `4461c1f`'s `cairn-register-editor.md:47-50`, grades "the base
    guide's rules as the register's brief quotes them".
- **Fold:**
  - Drop the numeric cap, since it has no published source and G4 cuts a mechanism that has none.
  - Replace it with a structure checklist in each brief, one line per base-guide rule with no
    quotation and a link per line (about 150 words).
  - State the trim test as "no verbatim guide quotation, and no rule stated twice."
  - Point W3r's first lens at that checklist plus Vale's alerts.
  - The editor brief (about 500 words of cairn-specific content) was never at risk.

### 4. Major: W3r misstates ruling 2's tightening test

- **Location:** spec 199-200, inherited by plan W3r (161-164).
- **Defect:** the spec says "a register rule stricter than the guide that has no row in the
  deviations section is a finding." A stricter rule is a tightening. Ruling 2 says a tightening
  "needs none." The register's "The tightening test" (register 794-812) and `4461c1f`'s editor
  text (`cairn-register-editor.md:56-58`) both hold that only an override needs a row. As written,
  W3r would flag every tightening, including the imperatives rule, the question-heading ban, and
  every tell. J4's register-editor read would then fail the register against itself.
- **Fold:** reword to "a register rule that forbids a form the base guide prescribes or
  recommends, or permits a form it forbids, and has no row in the deviations section, is a
  blocking finding." That wording is ruling 2's own.

### 5. Major: the CC BY 4.0 claim is wrong for Microsoft Learn as a site

- **Location:** spec 103-104 (Sources) and 176-181 (R9); plan R9 (100-105).
- **Defect and evidence:**
  - The Microsoft Learn Terms of Use (https://learn.microsoft.com/en-us/legal/termsofuse) say:
    "You may not modify, copy, distribute, transmit, publicly display, perform, reproduce,
    publish, license, create derivative works from ... any information ... obtained from the
    Services (except for your own, personal, non-commercial use) without prior written consent
    from Microsoft." They add: "Certain documentation may be subject to explicit license terms
    separate from the terms contained here."
  - CC BY 4.0 reaches a Learn page only through its source repository's own `LICENSE`. For
    example, `MicrosoftDocs/azure-docs/LICENSE` is "Attribution 4.0 International", and
    `LICENSE-CODE` is MIT.
  - The Microsoft Writing Style Guide itself has no public CC-licensed repository.
- **Fold:**
  - R9 picks a Microsoft Learn procedure page whose source repository carries a CC BY 4.0
    `LICENSE`. The attribution line names that repository and its license file.
  - The spec's Sources bullet says "Microsoft Learn pages published from a CC BY 4.0 MicrosoftDocs
    repository."
  - The Google attribution also notes that code samples are Apache 2.0.

### 6. Minor: dead section references after R1t are outside review focus 3

- **Location:** plan 75-76 (review focus 3), W1r (145-151), and W3r (159-164).
- **Defect:** after R1t merges the tightening test and the exceptions sections into "Deviations
  from the base guides", several passages still name the old sections:
  - `cairn-register-editor.md:35` names `## Provenance`, `## The tightening test`, and both
    `## Recorded exceptions`.
  - After the revert, the chain's prompts read "the universal contract" (`d7f0581`
    `docs-page-chain.js:155` and `:285`), a section that R1 already removed.
  - The register's own opening paragraph (register 14-17) and "For reviewers" (register 945)
    name the removed sections.
  - The Provenance "Specimens" paragraph (register 873-877) promises the cut R1b specimen.

  Review focus 3 greps only for `docs-chain-render.mjs`, `q:`, and `source: guide`.
- **Fold:** add `universal contract`, `## Provenance`, `The tightening test`, `Recorded
  exceptions`, and the R1b promise to review focus 3, and to the acceptance for W1r, W3r, and
  R1t.

### 7. Minor: the sitting's timing departs from ruling 14 without saying so

- **Location:** spec 59 and 224; plan 51-52 and 242.
- **Defect:** the spec restates ruling 14 as "Geoff's R5 read comes right after R5 lands," and
  then schedules one sitting after J2.
- **Fold:** record the change as the conductor's decision under ruling 7, as ruling 14 itself
  was, on the attended-time budget. The alternative is to start the sitting after J1 while J2
  runs.

### 8. Minor: J2 imitates an exemplar page that Geoff has not read

- **Location:** spec 133-135; plan 237-244.
- **Defect:** ruling 17's exemplar is the page as Geoff ratified it, the `8bbe78f5` version per
  the leanness record. Lines 97-108 of that version hold R2's own fail case. J2 branches after J1
  and so imitates J1's restructuring before Geoff reads it. That undercuts ruling 14's "takes its
  specimen only from text he has read".
- **Fold:** pin the exemplar "as J1 leaves it," and add "a rejected J1 diff also voids J2's run."

### 9. Minor: the editor track has one exemplar against a three-to-five source

- **Location:** spec 75-77 (ruling 18) and 135.
- **Defect:** the cited Anthropic guidance names three to five examples, and the editor brief gets
  one.
- **Fold:** state the gap in ruling 18. No editor page is drafted this pass, so it waits for the
  editors stage. This needs no new work.

### 10. Minor: the J2 fact read's harvest is stranded on the unmerged branch

- **Location:** plan 235-240.
- **Defect:** the chain's fact read will "fix or retag it [docs-drift] in the same chain" (`d7f0581`
  `docs-page-chain.js` fact prompt). That write lands in `docs/internal/facts/` on
  `style-guide-proof`, which never merges. The repo `CLAUDE.md` fix rule and the
  `docs-rebuild-not-edit` memory both expect the harvest in the container.
- **Fold:** J2 cherry-picks any `docs/internal/facts/` change to `style-guide-sync`, since the
  container is not frozen, and lists each change in its report.

### 11. Minor: two named sources carry no URL

- **Location:** spec 96-97.
- **Defect:** GitLab's and Grafana's writing guides are named without links, which G4's
  "published source" test needs.
- **Fold:** add the two style-guide URLs.

## Over-ceremony

The one instance found is finding 1's script. The rest of the plan's machinery traces to the
verdict table or to a standing ruling.
