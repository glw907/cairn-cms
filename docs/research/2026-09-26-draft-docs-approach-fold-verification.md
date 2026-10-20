# Draft docs approach spec: fold verification

**Target:** `docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md` at `1bd3ae13`.
**Fold record:** `2026-09-26-draft-docs-approach-fold.md`. Owner rulings R1 to R9 are taken as
authoritative, R8 in its confirmed form (30M working ceiling; the pilot checkpoint decides with
one combined question).

**Counts:** 0 blockers, 2 majors, 6 minors.

## 1. Did each major close?

Yes. No review raised a blocker. Every major (contract M1 to M7, mechanics M1 to M7, risk M1 to
M5, consistency M1 to M8) closes at the location the fold record cites. The spot checks:

- Consistency M1: the keep/retire ledger is at spec:62-84.
- Contract M6: stage 1 has a failing criterion at spec:221-223.
- Contract M7: the consistency record is at spec:246-250, and "Edits after the chain" is at
  spec:295-302.
- Risk M1, mechanics M5, and consistency M6: the anchors fold is at spec:188-193, 235-236, and
  the chain's `pinned` input.
- Risk M3: the claim inventory is at spec:264-274 and the carried-claim fact read at spec:282-284.
- Mechanics M1 and M2 fold into the Budget (spec:86-133, R8) and Testing 2 (spec:319-323).

Two closures introduce new defects (M1 and M2 below). The dropped `check:procedures` does not
return in any form.

Sources re-checked: the pass A figures (`docs/HISTORY.md:403-404`, `:416`; 2.64M / 24 = 110K);
the 40 percent figure (`2026-09-21-draft-docs-design.md:191-193`); `check-symbols.mjs:14-19`; the
flat `flags.json` written by `treeFlags` in `tool/cmd/cairn/flags_test.go`; the `writing-voice`
rule 2 text (`SKILL.md:74-76`); the REVISED ORDER (memory `one-release-then-model-sites`:27-30);
the anchors in `fixes.go` and `check_referrer.go:36`; and 25 `docsAnchor` values in
`tool/v1.1.0`'s `conditions.json`. All hold, with one exception (m4). The budget arithmetic
holds too: 21 + 6 + 5.5 + 4.5 + 3.5 + 1.5 = 42, and 24 - 17 = 7, which buys about 10 lean pages.

## Majors

### M1. Brief coverage keyed by arm cannot pass a stage 2a, 2, 3, or 4 merge

- **Location:** spec:184-187, spec:139-140, spec:255-257.
- **Defect:** The committed list names rebuilt *arms*, and it fails "any page under a listed arm
  that has no brief". It exempts only the per-version records and `docs/reference/`. Two
  planned states break this:
  - Stage 2a is a mergeable half. Adding extend at the 2a merge fails every 2b page that has
    not been rebuilt yet, since today no page has a brief (`docs/internal/briefs/` holds only
    its README).
  - Each arm README (`docs/extend/README.md` and the others) sits under its arm but gets its
    brief only in stage 5. So the merges for stages 2, 3, and 4 all go red.
- **Fold:** Key the list by page path, not by arm. Each stage merge appends the paths its chain
  rebuilt. The unit test plants a listed path that has no brief. This one change handles 2a/2b,
  the READMEs, and outline merges, and it needs no exemption list.

### M2. Stage 0 doubled in scope while its share still says "about six small items"

- **Location:** spec:118 and spec:150-215.
- **Defect:** Revision 1's stage 0 had seven items at 0.7M. Revision 2 has fourteen acceptance
  bullets at 1.5M, still costed as "about six small items". Seven of the fourteen are new
  instruments or instrument changes. At the spec's own 110K-per-agent basis, fourteen
  implementer and diff-reviewer chains cost about 3M, not 1.5M. That is small against 42M. The
  shape matters more than the size: the fold replaced one new check with a spread of
  instruments, and this is the accretion the `docs/HISTORY.md` lesson warns against.
- **Fold:** Apply the cut and shrink verdicts in section 4 (drop the ledger restore, derive the
  cross-regression flag). Then recount stage 0 honestly, at about 2.5M, and state its item
  count. Fold the owner-fact settling and the freeze-lift sweep into one task each.

## Minors

- **m1. spec:238-241 and spec:213-215. "Cross-regression" asks for a judgment no runner can
  make.** The spec defines it as "a new problem the redraft introduced". A reviewer asked again
  will usually find something, so "new versus missed" is noise. Define the flag mechanically
  instead: a reviewer that returned `accept` in round 1 returns `fix` in round 2. The record
  already stores both rounds' verdicts (`docs-page-chain.js`, `record.rounds[].reads`). This is
  also the right quantity for R8, because it counts exactly the blocking findings a lean chain
  would ship.
- **m2. spec:342. Two escalations in one arm should not go to Geoff.** A second `fix` is the
  conductor's decision under the global rule, and it resolves with tokens (upshift, re-dispatch,
  split). Change the trigger to "a conductor diagnosis, which asks Geoff only when it touches
  scope or taste".
- **m3. spec:241-242 and spec:345-353. The pilot owner read and the pilot checkpoint question
  are two sittings.** Batch them into one, so Geoff reads the three pages and answers the
  ceiling-and-scope question together. That saves one execution sitting.
- **m4. spec:184. The citation is wrong.** `check-provenance.mjs:392` is the tag check inside
  citation resolution. The no-brief pass is at `:591` (`briefs.length === 0`) and `:458`.
- **m5. spec:14-16. The brief miscounts the extensions.** It says three existing checks gain an
  extension. Stage 0 also adds the `check:editor-quotes` floor, the docs gate script, and a
  restored counter. After section 4, say "four small check extensions".
- **m6. spec:188-193. The shipped-anchor sources overstate the gap.** `fixes.go`'s `Anchor`
  values are already pinned against the live headings by `tool/internal/health/fixes_test.go:146-177`,
  which runs under `make -C tool check`. `conditions.ts` is pinned by `check:readiness`.
  `tool/v1.1.0`'s anchor set equals today's `conditions.ts` set exactly (diffed). The only thing
  no layer catches is a heading renamed together with its registry entry, which leaves released
  binaries pointing at the old heading. So the list only needs to snapshot released-tag anchors
  plus `check_referrer.go`'s one. Keep the mechanism and shrink the stated sources.

## 2. Contradictions and stage order

The shares, the stops, the pilot, the stage flow, and the ledger agree once M1 is folded. Lean by
default, both re-reads in the pilot, and a possible restore at the checkpoint read the same way
in R8, spec:238-242, spec:286-289, spec:213-215, and spec:345-353. The 80 percent stop at 24M
fires inside stage 2b unless the pilot question resolves first. That is R8's intended form, not a
defect. The stage order builds: stage 0 lands the chain and gates before stage 1 uses the docs
gate, and stage 1 runs outside the chain. The one build failure is M1.

## 3. New mechanisms stated from memory

None is unsupported. Each new mechanism rests on a quoted or run source: the flag tree walk, the
provenance no-brief return, the anchor emitters, the exit-3 runs, `pinned` and `toolGate` in the
runner, and the ledger at `a8c57b4a^`. Two notes:

- The citation in m4 is wrong.
- "Stage 0 restores it from `a8c57b4a^`" understates the work. `session-ledger.ts` (381 lines)
  imports `./lib/ledger.js`, `./lib/transcript.js` (801 lines), and `./lib/types.js`, all deleted
  in the same commit. Restoring it means restoring the harness's library too.

## 4. Machinery check

| Mechanism | Verdict | Reason |
| --- | --- | --- |
| Per-command flag map in `flags.json` plus `check:symbols` | Keep | Exit 3 blinds every live run, so this is the only layer that catches a flag on the wrong command or an invented subcommand. It reuses the existing `treeFlags` walk over about seven commands, at small cost. |
| Brief coverage in `check:provenance` | Keep, re-keyed | Without it, the provenance promise passes with no briefs at all. Key it by page path (M1). |
| Shipped-anchor list in `check:readiness` | Keep, shrink sources | A data file that guards the one hole left, a heading renamed along with its registry entry. Drop the sources already pinned (m6). |
| Restored `session-ledger.ts` | Cut | It is a slice of the retired harness (381 lines plus an 800-line library). The global rule scores pass spend with `/cost`, and the pilot only needs one instrument used consistently from the pilot onward. Restore it only if `/cost` proves not to include the chain's agents. |
| Scoped re-review switch in `docs-page-chain.js` | Keep | R8 requires it, and it is a verdict filter of a few lines in `reads()`. |
| Cross-regression flag | Shrink | Derive it from the per-round verdicts the record already stores (r1 `accept` to r2 `fix`). Build no classifier (m1). |
| `check:editor-quotes` floor | Keep | One line. The Microsoft-register rebuild could restyle the bold quotes and turn the gate into a silent pass. |
| Aggregate `package.json` docs-gate script | Keep | Cheap, and it stops the chain gate from drifting below CI. Have `test.yml` call it, or it becomes a third list to keep in step. |
| Stage 1 per-page fact-read record | Keep | This is the check itself, not an instrument. |

## 5. Decisions and questions

- No unasked owner decision was found. The fold settled three things itself: `[verified]`
  filing at page inputs, the releasable-at-every-merge invariant, and the `docs/README.md`
  front-door reading. Each is a methodology call or an existing rule (memory
  `methodology-calls-are-claudes`, `CLAUDE.md` Releases).
- The fold record's item 6, which plans to flag the `docs/README.md` reading to Geoff under R1, is
  ceremonial. Take the reading as within R1 and do not ask.
- m2 (two escalations go to Geoff) is a ceremonial question. m3 (two pilot sittings) wastes
  attended time.
