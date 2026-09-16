# Facts container: structure and mechanics review

Lens: bullet grammar, source-pointer truth, tag vocabulary, duplicates/contradictions, gate
implementability, gaps.md as a filing target. Read-only pass over
`docs/internal/facts/` at `main` (`b9282369` plus the motion merge).

Method: parsed all seven files into 817 bullets (722 with a `Source:` clause), reconciled the
README index, classified every trailing tag, resolved all 506 `file:line` pointers for existence
and range, and quote-matched 81 of them against the cited line. Spot-read 32 pointers by hand
against source.

## Findings, ranked

1. **91 bullets in `## Cross-page duplicates` / `## Harvest notes` / `## Harvest summary` carry
   neither `Source:` nor a tag.** The README's grammar states no section-scoping rule, so a naive
   `^- ` gate rejects all 91 today. `admin.md:109`

2. **116 facts are sourced only to a docs arm page or to bare "page text", and 63 of those are
   tagged `[verified]`.** When the arms leave the tree those pointers dangle, and "verified"
   against the page whose claim the bullet restates is circular by the README's own definition
   ("traced to a specific source file, symbol, line, or constant"). `extend.md:18`

3. **About 52 tags use a space qualifier the README does not define** (`[verified via
   log-events cross-reference]`, `[verified against page's own worked config]`, `[verified
   structurally]`) rather than the documented `[verified: ...]` colon form. A strict parser rejects
   every one. `extend.md:18`, `reference.md:202`

4. **Source line pointers already drift.** 9 of 81 quote-anchored pointers name a line the quoted
   text does not occupy; hand-checking found a further cluster: `CairnAdminShell.svelte:760`
   (actual 850), `:1078` (1152), `editor-shortcuts.ts:29` (34 and 31), `:39` (42).
   `editors.md:52`, `editors.md:20`, `extend.md:91`

5. **Three tags sit outside the vocabulary, and one bullet carries two brackets** (explicitly
   banned by the README's "never a second bracket"): `[note: ...]` at `editors.md:21`,
   `[see docs-drift: ...]` at `:26`, `[not a docs-drift: ...]` at `:85`.

6. **gaps.md under-accounts the open candidates.** Its third entry says 11 candidates across
   `sveltekit.md`/`delivery.md`/`delivery-data.md`; the real count in those three is 13, with 12
   more spread over nine other reference sections and 5 in `front-door.md`. 17 of 31 open
   candidates have no gap entry. `gaps.md:49`

7. **One bullet puts its tag at the start of the line instead of the end**, so both a
   "ends with exactly one tag" check and a human scan miss it. `reference.md:604`

8. **gaps.md's own seeded entries do not match its declared entry shape.** None carries the
   required `pass <N>` (all say "facts container harvest"), and entry 2 appends a
   `[tracked as ...]` bracket after `Status:`, a field the shape does not have. `gaps.md:41`

9. **The README index reconciles only if non-vocabulary tags are silently counted as verified.**
   `editors.md` is listed at 79 verified; the file has 76 `[verified]` plus the three odd tags from
   finding 5. `reference.md` is listed 148/25 against a countable 149/24. `README.md:75`

10. **The proposed "links resolve" check has nothing to resolve.** The container contains zero
    markdown links across all seven files; every pointer is an inline backticked path. The check
    must parse backticked `path[:line]` spans, and resolving a *line* requires re-reading the
    target, which is what finding 4 shows is needed. `README.md:20`

11. **A tag qualifier is being used to smuggle a non-fact.** `extend.md:17` is tagged
    `[verified: general SvelteKit constraint, page's ordering claim is a design recommendation]`;
    the vocabulary has no state for "part fact, part recommendation", so it lands as verified.

12. **One fact is stated three times.** `reference.md:541` and `:542` are adjacent bullets making
    the same `unmount ... outro: false` claim against the same file, and `extend.md:47` repeats it
    verbatim. The only cross-file exact duplicate in the container, but within-file duplication is
    unguarded. `reference.md:542`

## What is healthy

- Fact-bullet counts reconcile exactly with the README index per arm (86/83/335/42/181 = 727).
- All 506 `file:line` pointers name a file that exists, at a line in range: no dangling paths.
- The 32 hand-read pointers all substantively support their claim; the failures above are pointer
  precision, not fabricated facts. Sampled checks against `guard.ts:206/281`, `run.ts:38-43`,
  `ids.ts:44-58`, `pipeline.ts:108-117`, `prefill.mjs:31-37`, `catalogue.mjs:277-285`,
  `store.ts:37`, `crypto.ts:63,66-67`, `AdminTable.svelte:54` all land.
- The no-em-dash rule holds: zero em dashes anywhere in the container.
- Cross-file duplication is near zero (one pair), and no contradiction between files surfaced.
- `reference.md`'s section headings map 1:1 onto the 25 `docs/reference/*.md` pages, so an
  "every export has an entry" check has a key to join on after the move.

## What the gate would have to reject today

Run as specified (every bullet a source, one tag, links resolve), a `check:facts` over the tree as
it stands fails on roughly 260 bullets: 91 section-meta bullets, ~52 space-qualifier tags, 4
vocabulary or placement violations, and ~116 bullets whose only source is a page the same pass
deletes. None of those is a defect in the *facts*; all four are defects in the grammar's
specification. The grammar needs three things the README does not yet say: which sections hold
facts, the exact tag regex (`[tag]` or `[tag: qualifier]`, one bracket, at end of bullet), and
what counts as a resolvable source once the arms are gone.

## Verdict

The grammar is close but not gate-ready. The bullet shape is remarkably consistent for 727
hand-written facts, the pointers are real, and the sampled claims hold up against source, so the
container's substance is sound. What is not ready is the specification: the README describes a
grammar the files do not actually follow in four systematic ways, each of which a check must
either accept or the files must be normalized to. The two that matter are structural rather than
cosmetic. The `## Cross-page duplicates` / `## Harvest notes` sections mean a fact bullet and a
non-fact bullet are indistinguishable by shape alone, so the check needs a section allowlist or
those sections need a different marker. And 116 facts whose only source is a doc arm page become
unsourced the moment the docs-to-facts pass removes those arms, which turns a green gate red on
the same commit that ships it. Line-precision drift is the slower problem: 11% of the pointers I
could machine-check already name the wrong line one day after the harvest, and the only check that
catches that is one that re-reads the cited line for a quoted anchor, which argues for making the
quoted snippet a required part of the pointer form rather than an optional courtesy. Tighten the
README to describe what the files do, normalize the four tag-form violations, re-source the
arm-only facts to code before the arms are deleted, and the gate becomes a straightforward
regex-plus-file-resolve script.
