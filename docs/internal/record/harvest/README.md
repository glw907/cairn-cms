# The harvest record

Agent-facing. This directory proves that every claim on the old narrative and front-door pages is
a fact in `docs/internal/facts/` or a recorded cut, so the pages can be deleted. The design is
`docs/superpowers/specs/2026-09-29-draft-docs-harvest-design.md`; where this file and the spec
disagree, the spec wins and this file is the bug. Drafters never read this directory: a ledger
holds paraphrases only, so it carries no framing a writer could absorb.

## Files

- `deletion-list.json`: `{ "deleted": [...], "kept": [...] }`, repo-relative page paths. `deleted`
  is the 49 pages (every `.md` under `docs/admin/`, `docs/editors/`, `docs/extend/`, plus
  `docs/why-cairn.md` and `docs/README.md`, minus the kept set). `kept` is the three pages that
  stay and are never audited: `docs/extend/migration-notes.md`, `docs/extend/upgrade-cairn.md`,
  `docs/extend/choose-an-ai-posture.md`. The verifier and every narrowed gate read this one file.
- `<arm>/<page>.json`: one ledger per deleted page. `<arm>` is `admin`, `editors`, `extend`, or
  `front-door`. The file name is the page's path inside its arm with `.md` swapped for `.json`
  (`docs/extend/README.md` is `extend/README.json`; `docs/why-cairn.md` is
  `front-door/why-cairn.json`).

## Ledger schema

```json
{
  "page": "docs/admin/example.md",
  "blob": "<git hash-object docs/admin/example.md, taken when audited>",
  "claims": [
    { "lines": [5, 5], "paraphrase": "Page heading.", "cut": "navigation" },
    { "lines": [7, 8], "paraphrase": "Sign-in mail needs a verified sender.", "fact": "f:abc123" },
    { "lines": [10, 12], "paraphrase": "The wrangler binding names.", "new-fact": "f:def456" }
  ]
}
```

- `page`: the repo-relative path. It must equal the path its file location implies, and it must be
  on the `deleted` list.
- `blob`: the page's git blob SHA when audited (`git hash-object <page>`). A page edited afterward
  fails by name, so a stale audit never passes.
- `claims`: every atomic claim on the page, in page order, never empty. An atomic claim is one
  statement a reader could check on its own. Claim indexes in the verifier's output are 0-based
  positions in this array (`claims[3]`).
  - `lines`: `[start, end]`, 1-based and inclusive, in the audited blob.
  - `paraphrase`: at most 25 words, and never a sentence copied from the page.
  - Exactly one disposition:
    - `fact`: an existing id (`f:xxxxxx`) whose bullet states the claim. A claim the container
      already holds, or one repeated elsewhere on the old pages, is always `fact`.
    - `new-fact`: the id the auditor minted (`node scripts/checks/check-facts.mjs --mint`) and filed
      for this claim.
    - `cut`: one reason from the list below.

A false claim is a `fact` or `new-fact` disposition pointing at a `[rejected]` bullet, so it is
never re-harvested. Every code snippet is a claim: a fact sourced to the real file it mirrors, or a
cut as `illustrative`. A heading slug that a shipped binary, `conditions.ts`, `conditions.json`,
`shipped-anchors.json`, or a gate names is a claim too, recorded as a fact naming the slug and what
pins it, so the rebuilt arm reproduces it verbatim.

## The span rule

Every non-blank line of the page outside front matter falls inside some claim's `lines`. Front
matter is the block between a leading `---` line and the next `---` line. A heading, a list item, a
fenced code line, and a link-only line each need a claim. Blank lines need none. The verifier
reports an uncovered run by line range (`uncovered lines 7-8`).

## Cut reasons

- `navigation`: a link or pointer, nothing to check.
- `marketing`: a value judgment with no checkable content.
- `stance-without-owner-basis`: a stance the owner brief does not carry. (A stance the owner brief
  does carry maps to an owner-tier fact with its verbatim key phrase.)
- `illustrative`: a snippet shaped for teaching that mirrors no real file.
- `external-trivia`: a platform detail nobody acts on, per the container's own rule.

## The audit, five steps

Each page goes to a fresh auditor that did no earlier harvest. It never edits a deletion-list page
and never edits the facts files outside its own pages' sections.

1. List the page's claims, with their line spans, into its ledger.
2. Match each to the arm's facts file (and the other facts files). When the only matching bullet
   is a `[candidate]` in a section another chain owns, file a verified `new-fact` in your own
   section instead.
3. File any missing fact with an id minted by `node scripts/checks/check-facts.mjs --mint`,
   verified against source under the container's own rules.
4. Resolve every `[candidate]` and `[docs-drift]` bullet in the sections of your deletion-list
   pages: a candidate becomes `[verified]` (retraced to source), `[rejected]`, or is deleted as a
   cut recorded in the ledger; a drift bullet is re-checked against the code and retagged
   `[verified]`, since the page it quoted is going away. The kept pages' sections are out of scope
   for this step.
5. Re-source every bullet in your sections whose `Source:` names a deletion-list page, whether or
   not a claim maps to it. Drop the page pointer where a code, vendor, or owner-brief source stands
   beside it; otherwise retrace the bullet to such a source, or, if its claim is about the page's
   own wording, retag it `[rejected: describes a deleted page]` with its ledger as `Source:`. A
   bullet you retag or re-source drops any quotation of the old page.

## The verifier

```
node scripts/oneshot/verify-harvest.mjs [--arm <admin|editors|extend|front-door>] [--pages <path,...>] [--root <dir>]
```

It reports every failure in a run, naming the ledger path and claim index, and passes only when:

- `deletion-list.json` equals the tree: every `.md` under the three arms plus the two front-door
  files, minus the kept set;
- every page in scope has exactly one ledger, in a scoped run as much as a full one; no ledger
  names a page off the list; a ledger's `page` matches its file location; the record directory
  exists and every ledger parses;
- each ledger's `blob` matches the page as it stands;
- `claims` is non-empty and its spans cover every non-blank line outside front matter;
- every `fact` and `new-fact` id resolves to a bullet in the container, and every resolved bullet
  is `[verified]`, `[external]`, `[vendor]`, or `[rejected]`;
- no claim lacks a disposition or carries two, and every `cut` reason is on the list;
- no bullet names a deletion-list page in its `Source:`: in a scoped run, the bullets in the scoped
  pages' own facts sections; in an unscoped run, the whole container.

Scoping: `--arm` selects one arm's pages and `--pages` a comma-separated list of repo-relative
paths (a path off the deletion list fails by name). A scoped run still fails on a missing ledger in
its scope. The structural checks (list versus tree, an unparseable or mislocated ledger anywhere,
two ledgers for one page, a ledger for a page off the list) run over every ledger file whatever the
scope; the per-page content rules and the `Source:` rule run over the scope only.

On success it prints per-arm counts: pages, claims, facts reused (`fact` dispositions), facts filed
(`new-fact` dispositions), and cuts by reason. Counts are per claim, so an id that three claims
share counts three times.

The verifier is a record, not a standing gate: its subject is deleted at the end of the pass, and
the list-versus-tree check fails by design afterward. The pass record names the commit the full
verifier passed on, so the result reproduces from a checkout.
