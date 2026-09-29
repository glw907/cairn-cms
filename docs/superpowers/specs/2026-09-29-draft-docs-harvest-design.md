# Draft docs harvest, then delete: design

**Date:** 2026-09-29. **Status:** approved by Geoff in the brainstorm, 2026-09-29; revised by the
spec-plan review fold the same day (record:
`docs/superpowers/research/2026-09-29-draft-docs-harvest-fold.md`).
**Parent:** `docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md`, "Amendment: harvest,
then delete". That amendment settled the scope, the order (harvest, then delete, then draft), and
that no input guard is built. This spec answers the four questions it left open and designs the
one pass that carries the harvest and the deletion. Where this spec departs from the parent's
text, the fold record lists the parent erratum owed.

## Rulings (this brainstorm)

| # | Ruling | Source |
| --- | --- | --- |
| H1 | Each old page's harvest is proven by an independent claim audit: a fresh agent that did no earlier harvest splits the page into atomic claims and disposes of every one, and a one-shot script verifies the ledgers, coverage included, before anything is deleted. | Geoff, 2026-09-29 |
| H2 | `docs/extend/migration-notes.md` and `docs/extend/upgrade-cairn.md` stay in place, outside the harvest and the deletion. They are per-version records, maintained every pass like the reference arm; the extend outline decides their final home. | Geoff, 2026-09-29 |
| H3 | The arm order stays as the parent spec has it: extend (2a pilot, then 2b), admin, editors, front door. | Geoff, 2026-09-29 |
| H4 | Outlines, page cards, and ledgers are agent scaffolding: their format is Claude's call, chosen for the agents that consume them, and they need not survive once their pages are built. | Geoff, 2026-09-29 |
| H5 | `docs/admin/is-it-working.md` is deleted with the rest, and `check:readiness` and the Go tool's `fixes_test.go` check live anchors against `scripts/checks/shipped-anchors.json` while the admin arm is empty. The arm READMEs and `docs/README.md` are deleted too. **Corrected by the review:** H5's third call, "no ordering constraint against theme pass C", rested on a false premise (file-disjointness). The unmerged theme lineage (passes B and C) edits four deletion-list pages, rewrites facts bullets in place, and renames reference pages (findings DR-2, CO-2, MF-3). The pass now orders after the theme lineage's merge; see "Timing". | Geoff approved the three flagged calls with the design, 2026-09-29; the third corrected by the review fold, 2026-09-29 |

`extend/choose-an-ai-posture.md` survives the deletion: it is already a rebuilt page with a brief
(draft docs pass 0+1, task 9), drafted from facts and never from the old page it replaced.

## Scope

**Deleted:** 49 pages, every `.md` file under `docs/admin/`, `docs/editors/`, and `docs/extend/`
(the three arm READMEs included), plus `docs/why-cairn.md` and `docs/README.md`, minus the
**kept set**: `docs/extend/migration-notes.md`, `docs/extend/upgrade-cairn.md`, and
`docs/extend/choose-an-ai-posture.md`. Both lists live in one committed file,
`docs/internal/record/harvest/deletion-list.json`, which the verifier and every narrowed gate
read.

The kept pages are never audited or deleted. Their outbound links into deleted pages are
repaired (link repair only). A changed sentence on `choose-an-ai-posture.md` changes its brief's
matching sentence in the same commit, per the facts README's "Edits after the chain" rule. The
reference arm, `docs/internal/`, `docs/superpowers/`, STATUS, HISTORY, and the repo-root files
change only where an inbound link is repaired.

No old page carries a figure, so the harvest has no visual assets to account for.

## The claim ledger

Each audited page gets one JSON ledger at `docs/internal/record/harvest/<arm>/<page>.json`, where
`<arm>` is `admin`, `editors`, `extend`, or `front-door`. A ledger records:

- `page`: the repo-relative path.
- `blob`: the page's git blob SHA when it was audited (`git hash-object <page>`).
- `claims`: every atomic claim on the page, in page order, never empty. An atomic claim is one
  statement a reader could check on its own. Each claim carries:
  - `lines`: its `[start, end]` span in the audited blob. Every non-blank line outside front
    matter falls inside some claim's span. A heading or a link-only line is a claim too (a
    `navigation` cut, or a slug fact).
  - a short paraphrase (never a copied sentence).
  - exactly one disposition:
    - `fact` with an existing id (`f:xxxxxx`) whose bullet states the claim. A claim the
      container already holds, or one repeated elsewhere on the old pages, is always `fact`.
    - `new-fact` with the id the auditor minted and filed for it.
    - `cut` with one reason from a fixed list: `navigation` (a link or pointer, nothing to
      check), `marketing` (a value judgment with no checkable content),
      `stance-without-owner-basis` (a stance the owner brief does not carry), `illustrative` (a
      snippet shaped for teaching that mirrors no real file), or `external-trivia` (a platform
      detail nobody acts on, per the container's own rule).

A false claim is a `fact` or `new-fact` disposition pointing at a `[rejected]` bullet, so it is
never re-harvested. Every code snippet is a claim: it becomes a fact sourced to the real file it
mirrors, or a cut as `illustrative`. A heading slug that a shipped binary, `conditions.ts`,
`conditions.json`, `shipped-anchors.json`, or a gate names is a claim too, recorded as a fact
naming the slug and what pins it, so the rebuilt arm's outline reproduces it verbatim.

The ledger paraphrases; it does not quote. Drafters never read `docs/internal/record/`, so the
ledger holds no framing a writer could absorb.

## The audit

The pages go to fresh Sonnet auditors in five batches (admin, editors, front door, and extend in
two halves), run as one rate-checkpoint batch and three parallel chains. An auditor never edits a
deletion-list page, and never edits the facts files outside its own pages' sections. The auditor:

1. Lists the page's claims, with their line spans, into its ledger.
2. Matches each to the arm's facts file (and the other facts files). When the only matching
   bullet is a `[candidate]` in a section another chain owns, it files a verified `new-fact` in
   its own section instead.
3. Files any missing fact with an id minted by `node scripts/checks/check-facts.mjs --mint`,
   verified against source under the container's own rules.
4. Resolves every `[candidate]` and `[docs-drift]` bullet in the sections of its deletion-list
   pages: a candidate becomes `[verified]` (retraced to source), `[rejected]`, or is deleted as a
   cut recorded in the ledger; a drift bullet is re-checked against the code and retagged
   `[verified]`, since the page it quoted is going away. The kept pages' sections are out of
   scope for this step.
5. Re-sources every bullet in its sections whose `Source:` names a deletion-list page, whether or
   not a claim maps to it. The page pointer is dropped where a code, vendor, or owner-brief
   source stands beside it; otherwise the bullet is retraced to such a source, or, if its claim
   is about the page's own wording, retagged `[rejected: describes a deleted page]`. A bullet it
   retags or re-sources drops any quotation of the old page.

One named batch (the second extend half) also runs step 5 over the kept pages' sections and any
bullet outside every page section, since no other batch owns them (`f:65atya` in the
`choose-an-ai-posture.md` section cites `docs/admin/is-it-working.md:338`).

The reviewer for each batch is `diff-reviewer` on Opus, which reads the ledgers and the facts
diff against this section. Its sample: five `fact` dispositions traced against claim and bullet
(a near-miss mapping), five `new-fact` bullets traced to source, five judgment cuts
(`marketing`, `illustrative`, `external-trivia`, `stance-without-owner-basis`), every
`[rejected]` retag the batch made, and every fact id three or more claims fan into.

The three pages with no section in the facts container today (`admin/README.md`,
`editors/README.md`, `extend/animate-a-custom-screen.md`) gain one in the audit.

## The verifier

A one-shot script, `scripts/oneshot/verify-harvest.mjs`, runs before the deletion. It reports
every failure in a run (not only the first), naming the ledger path and claim index, and passes
only when:

- `deletion-list.json` equals the tree: every `.md` under the three arms plus the two front-door
  files, minus the kept set;
- every page in scope has exactly one ledger, in a scoped run as much as a full one; no ledger
  names a page off the list; a ledger's `page` matches its file location; the record directory
  exists and every ledger parses;
- each ledger's `blob` matches the page as it stands, so a page edited after its audit fails;
- `claims` is non-empty and the claims' spans cover every non-blank line of the page outside
  front matter;
- every `fact` and `new-fact` id resolves to a bullet in the container, and every resolved
  bullet is `[verified]`, `[external]`, `[vendor]`, or `[rejected]`;
- no claim lacks a disposition, and every `cut` reason is on the list;
- no bullet anywhere in the container names a deletion-list page in its `Source:`.

It takes `--arm <admin|editors|extend|front-door>` and `--pages <path,...>` to scope a run; a
`--pages` path off the deletion list fails by name. It prints per-arm counts (claims, facts
reused, facts filed, cuts by reason). It never becomes a standing gate, since its subject is
deleted; its unit test runs on fixtures only, and the script and the ledgers stay in git as the
record. The pass record names the commit the full verifier passed on, so the result reproduces
with a checkout. `npm run check:facts` and `npm run check:provenance` stay green throughout.

## The deletion

After the verifier passes, the deletion runs in two steps.

**Gate narrowing** (before the pages go, test-first against fixtures). Every gate that pins an
old page is narrowed so it passes with the arms empty and still fails on its defect once an arm
is rebuilt: `check:package-files`, `check:arm-indexes`, `check:symbols` and its allowlist, the
slug-contract test, `check:readiness` with `fixes_test.go`, `check:editor-quotes`, `docs-links`,
`check:public-tokens`, `check:transcripts`, `check:visuals`, and `gate-tier`. Each arm has three
states, read from `deletion-list.json` through one shared function:

- **absent:** the directory is gone (admin and editors, since git keeps no empty directory);
- **kept-only:** the arm holds only kept-set pages (extend until stage 2a);
- **rebuilt:** the arm holds any page outside the kept set, which restores the full check.

The trigger is never "the directory or index exists". The shared function carries the three-state
test; each gate carries one test in its narrowed state, and the gates a contract rides on
(`check:arm-indexes`, `check:package-files`, `check:readiness` with `fixes_test.go`) are pinned in
all three.

- `check:readiness` and `fixes_test.go` check every live `docsAnchor` against
  `shipped-anchors.json` (already holding every live anchor, append-only) while `docs/admin/`
  holds no page. Once the admin arm holds any page, `docs/admin/is-it-working.md` must exist and
  every `shipped-anchors.json` entry must resolve on it, so a renamed or split checklist fails
  rather than disarming the gate. Fixture states: the list absent, empty, or malformed; a live
  anchor missing from the list; the admin arm regaining a page.
- `docs-links` permanently accepts links into deletion-list paths from dated records
  (`CHANGELOG.md`, `docs/internal/record/**`, `docs/internal/history/**`,
  `docs/internal/feedback/**`), and accepts a `LEGACY_PATH_MAP` entry whose target is on the
  deletion list until that arm is rebuilt.

**Delete and relink.** The 49 pages are deleted and every repo-relative inbound reference is
repaired:

- **Prose links** (repo `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CLAUDE.md`, `ROADMAP.md`,
  the example READMEs, the templates, the shipped `cairn-extend` skill, the reference arm, the
  kept pages) are retargeted to a reference page where one covers the same ground, or removed.
- **Code comments** that point at a deleted page are retargeted or trimmed the same way. The
  `AI_POSTURE_COMMENT_BLOCK` coupling moves in lockstep: the showcase config, the emitted
  template, `packages/create-cairn-site/src/substitute.mjs`, and its two tests.
- **Test fixtures** that use a real old path as sample data move to a path that still exists,
  or to a synthetic path where the test only needs a string.
- **Fact `Source:` fields** are never touched here; the audit already re-sourced them.

**Allowed residue** (references that stay, by class): every `https://cairn.pub/docs/...` URL with
the goldens, testdata, and design records that carry it (`tool/**/testdata/**`, `tool/docs/**`,
`tool/testdata/**`); shipped-contract constants and the tests that mirror them
(`tool/internal/doctor/check_referrer.go`'s repo-path constant, `tool/internal/spine/conditions.json`,
`scripts/checks/shipped-anchors.json`); the reference arm's pages documenting shipped URLs; the
facts files' page-path section headings; dated history (`CHANGELOG.md`, `docs/HISTORY.md`,
`docs/STATUS.md`, `docs/internal/record/**`, `docs/internal/history/**`,
`docs/internal/feedback/**`, historical entries in `migration-notes.md`); and `docs/superpowers/**`.

Every repaired link, narrowed assertion, and allowlist entry is recorded in
`docs/internal/record/harvest/relink.json`, one entry per item: the file, a short grep-able
context string, the old target, what was done, and the stage (`2a`, `2b`, `3`, `4`, `5`) that
restores or re-arms it. Each stage's outline consumes the entries keyed to it, which replaces the
parent spec's per-stage contract table for old paths (the redirect rows for cairn.pub come from
the same file).

The narrative-arm freeze language in `CLAUDE.md`, `docs/internal/facts/README.md`, and
`docs/internal/docs-register.md` gives way to a statement that the arms are empty until their
stages rebuild them. The same change in the user-scope `cairn-pass` and `site-pass` skills is an
owed erratum, listed in the fold record.

Released Go binaries print `https://cairn.pub/docs/admin/is-it-working#...`. cairn.pub pins
`0.94.0-rc.1` today (un-pinnable since `0.95.0`), and those URLs already return 404, so the
deletion breaks no live link. The exposure is the repin: if cairn.pub moves to a release cut
after the deletion merges, it relaunches its docs with the reference arm only. The **pin ceiling**
is the last release cut before the deletion merges; the close writes it into
`docs/internal/record/2026-09-22-cairn-pub-docs-handoff.md`, the record a cairn-pub pass reads.
The admin stage's outline carries the pinned slugs from the harvest's facts.

The `## Unreleased` changelog entry states that the narrative arms and the front door were
removed pending their rebuild, and that a release before the rebuild ships the reference arm
only. It carries one `Consumers must:` line: a site scaffolded with the `cairn-extend` skill
re-runs `npx cairn-guidance install`, so its copy drops links to the removed pages.

## Outline format (for stage 2a onward)

Per H4, each arm's outline is `docs/internal/outlines/<arm>.json`. Each page entry carries its
path, the reader's job in one sentence, the page type, the two assigned exemplars, a figure flag,
the fact ids it draws on, what it covers, and any pinned slugs. The arm level carries the term
list, the planned cross-links, and the redirects and re-arms taken from `relink.json`. The outline
feeds the page-inputs step directly. For Geoff's R10 review it is rendered to markdown cards; his
edits fold back into the JSON. It is deleted at its arm's merge. The `docs-page-chain.js` change
that reads it belongs to the stage 2a plan, not this pass.

## Timing

The theme lineage (passes B and C, unmerged) edits `docs/extend/architecture.md`,
`build-a-site-by-hand.md`, `share-a-draft-preview.md`, and `design-your-site.md`, rewrites about
57 `editors.md` bullets in place for the `components` to `admin` rename, and renames
`docs/reference/components.md` to `admin.md`. Auditing before it lands would audit code and
bullets that are about to change, and a harvest-first merge would leave B and C with
modify/delete conflicts on four pages that nobody's plan resolves.

So the verifier (task 1, no facts dependency) runs now. Every later task starts only after the
theme lineage has merged to `main` and `main` has been merged into this branch. STATUS already
orders pass C's `0.98.0` cut first, so `0.98.0` carries the old arms one last time and is the
likely pin ceiling.

## Budget

See the plan's derivation. The audit runs about 3.4 to 5.1M (7770 page lines at the pass-0+1
rate, plus the coverage spans and step 5); gate narrowing about 1M; delete and relink about
1.3M; the verifier, merge, and close about 2M. The planned total is about 7.8 to 9.5M, above the
approved 7M ceiling; the plan carries the ceiling as a ruling for Geoff. A checkpoint after the
admin batch re-projects the rest per page line.

## Acceptance

- The verifier passes over all 49 pages on a named commit, and its counts are in the pass record.
- The 49 pages are gone from `main`; the kept set remains, edited only for link repair.
- `relink.json` lists every repaired link, narrowed assertion, and allowlist entry with its
  restoring stage.
- The packed tarball's docs are exactly `docs/reference/**` plus the kept set.
- The full repo gate, the docs gate, `check:facts`, `check:provenance`, the create-cairn-site
  tests, `test:emit`, and `make -C tool check` are green.
- The pin ceiling is in the cairn-pub handoff record, the fold record's owed errata are an open
  decision in STATUS, and STATUS names the stage 2a plan as the next action.

## Out of scope

Drafting any page, writing any outline, changing `docs-page-chain.js`, bumping cairn.pub's pin,
and editing the parent spec or the user-scope skills (owed errata, listed in the fold record).
