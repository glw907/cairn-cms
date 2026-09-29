# Draft docs harvest, then delete: design

**Date:** 2026-09-29. **Status:** approved by Geoff in the brainstorm, 2026-09-29.
**Parent:** `docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md`, "Amendment: harvest,
then delete". That amendment settled the scope, the order (harvest, then delete, then draft), the
release posture, and that no input guard is built. This spec answers the four questions it left
open and designs the one pass that carries the harvest and the deletion.

## Rulings (this brainstorm)

| # | Ruling | Source |
| --- | --- | --- |
| H1 | Each old page's harvest is proven by an independent claim audit: a fresh agent that did no earlier harvest splits the page into atomic claims and disposes of every one, and a one-shot script verifies the ledgers before anything is deleted. | Geoff, 2026-09-29 |
| H2 | `docs/extend/migration-notes.md` and `docs/extend/upgrade-cairn.md` stay in place, outside the harvest and the deletion. They are per-version records, maintained every pass like the reference arm; the extend outline decides their final home. | Geoff, 2026-09-29 |
| H3 | The arm order stays as the parent spec has it: extend (2a pilot, then 2b), admin, editors, front door. | Geoff, 2026-09-29 |
| H4 | Outlines, page cards, and ledgers are agent scaffolding: their format is Claude's call, chosen for the agents that consume them, and they need not survive once their pages are built. | Geoff, 2026-09-29 |
| H5 | `docs/admin/is-it-working.md` is deleted with the rest; `check:readiness`'s anchor assertion, and the Go tool's `fixes_test.go` heading scan, check a committed anchor list while the page is absent and re-arm against the page when the admin stage recreates it. The arm READMEs and `docs/README.md` are deleted too. The pass has no ordering constraint against theme pass C. | Geoff approved these three flagged calls with the design, 2026-09-29 |

`extend/choose-an-ai-posture.md` survives the deletion: it is already a rebuilt page with a brief
(draft docs pass 0+1, task 9), drafted from facts and never from the old page it replaced.

## Scope

**Deleted:** 49 pages, every `.md` file under `docs/admin/`, `docs/editors/`, and `docs/extend/`
(the three arm READMEs included), plus `docs/why-cairn.md` and `docs/README.md`, minus
`docs/extend/migration-notes.md`, `docs/extend/upgrade-cairn.md`, and
`docs/extend/choose-an-ai-posture.md`. The reference arm, `docs/internal/`, `docs/superpowers/`,
STATUS, HISTORY, and the repo-root files are untouched except where an inbound link is repaired.

No old page carries a figure, so the harvest has no visual assets to account for.

## The claim ledger

Each audited page gets one JSON ledger at `docs/internal/record/harvest/<arm>/<page>.json`, where
`<arm>` is `admin`, `editors`, `extend`, or `front-door`. A ledger records:

- `page`: the repo-relative path.
- `blob`: the page's git blob SHA when it was audited (`git hash-object <page>`).
- `claims`: every atomic claim on the page, in page order. An atomic claim is one statement a
  reader could check on its own. Each claim carries a short paraphrase (never a copied
  paragraph) and exactly one disposition:
  - `fact` with an existing id (`f:xxxxxx`) whose bullet states the claim.
  - `new-fact` with the id the auditor minted and filed for it.
  - `cut` with one reason from a fixed list: `navigation` (a link or pointer, nothing to check),
    `duplicate-of:<id>`, `marketing` (a value judgment with no checkable content),
    `stance-without-owner-basis` (a stance the owner brief does not carry), `illustrative` (a
    snippet shaped for teaching that mirrors no real file), or `external-trivia` (a platform
    detail nobody acts on, per the container's own rule).

A false claim is a `fact` or `new-fact` disposition pointing at a `[rejected]` bullet, so it is
never re-harvested. Every code snippet is a claim: it becomes a fact sourced to the real file it
mirrors, or a cut as `illustrative`. A heading slug that a shipped binary, `conditions.ts`, or a
gate names is a claim too, recorded as a fact naming the slug and what pins it, so the rebuilt
arm's outline reproduces it verbatim.

The ledger paraphrases; it does not quote. Drafters never read `docs/internal/record/`, so the
ledger holds no framing a writer could absorb.

## The audit

Each arm's pages go to a fresh Sonnet auditor, in four independent batches (admin, editors,
extend split in two halves, front door). The auditor:

1. Lists the page's claims into its ledger.
2. Matches each to the arm's facts file (and the other facts files, for duplicates).
3. Files any missing fact with an id minted by `node scripts/checks/check-facts.mjs --mint`,
   verified against source under the container's own rules.
4. Resolves every `[candidate]` and `[docs-drift]` bullet in its arm's facts file: a candidate
   becomes `[verified]` (retraced to source), `[rejected]`, or is deleted as a cut recorded in
   the ledger; a drift bullet is re-checked against the code and retagged `[verified]`, since
   the page it quoted is going away.

The reviewer for each batch is `diff-reviewer` on Opus, which reads the ledgers and the facts
diff against this section and spot-traces a sample of new facts to source.

The three pages with no section in the facts container today (`admin/README.md`,
`editors/README.md`, `extend/animate-a-custom-screen.md`) gain one in the audit.

## The verifier

A one-shot script, `scripts/oneshot/verify-harvest.mjs`, runs before the deletion and passes only
when:

- every page on the deletion list has a ledger, and no ledger names a page off the list;
- each ledger's `blob` matches the page as it stands, so a page edited after its audit fails;
- every `fact` and `new-fact` id resolves to a bullet in the container;
- every resolved bullet is `[verified]`, `[external]`, `[vendor]`, or `[rejected]`;
- no claim lacks a disposition, and every `cut` reason is on the list.

It prints per-arm counts (claims, facts reused, facts filed, cuts by reason). It never becomes a
standing gate, since its subject is deleted; the script and the ledgers stay in git as the
record. `npm run check:facts` stays green throughout.

## The deletion

After the verifier passes, one task deletes the 49 pages and repairs every inbound reference so
that every repo gate stays green with the arms empty:

- **Prose links** (repo `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CLAUDE.md`, the example
  READMEs, the templates, the shipped `cairn-extend` skill) are retargeted to a reference page
  where one covers the same ground, or removed.
- **Code comments** that point at a deleted page are retargeted or trimmed the same way.
- **Test fixtures** that use a real old path as sample data move to a path that still exists,
  or to a synthetic path where the test only needs a string.
- **Gates** that pin an old page (`check:package-files`, `check:arm-indexes`, the symbol
  allowlist, the slug-contract test, `check:readiness`, `check:editor-quotes`, `docs-links`,
  `check:public-tokens`, `gate-tier`) are narrowed so they pass on an empty arm. A narrowed
  assertion is scoped to the arm's absence (it re-applies once the arm has pages again),
  never deleted outright, wherever the gate's shape allows it.

Every removed link and every narrowed assertion is recorded in
`docs/internal/record/harvest/relink.json`, one entry per item: the file and line, the old
target, what was done, and the stage that restores or re-arms it. Each stage's outline consumes
the entries keyed to it, which replaces the parent spec's per-stage contract table for old paths
(the redirect rows for cairn.pub come from the same file).

Released Go binaries link to `https://cairn.pub/docs/admin/is-it-working#...`, and cairn.pub stays
pinned to `0.97.0`'s docs until the rebuilt arms ship, so no shipped link breaks. The admin
stage's outline carries the pinned slugs from the harvest's facts. While the page is absent,
`check:readiness` and `tool/internal/health/fixes_test.go` check every live `docsAnchor` against a
committed anchor list (built from `scripts/checks/shipped-anchors.json` plus today's live anchors)
rather than skipping, so the contract stays enforced; each re-arms against the page once it exists.

The `## Unreleased` changelog entry states that the narrative arms and the front door were removed
pending their rebuild and that a release before the rebuild ships the reference arm only. It
carries no `Consumers must:` line: no consumer imports a doc path, and cairn.pub's pin shields
readers.

## Outline format (for stage 2a onward)

Per H4, each arm's outline is `docs/internal/outlines/<arm>.json`. Each page entry carries its
path, the reader's job in one sentence, the page type, the two assigned exemplars, a figure flag,
the fact ids it draws on, what it covers, and any pinned slugs. The arm level carries the term
list, the planned cross-links, and the redirects and re-arms taken from `relink.json`. The outline
feeds the page-inputs step directly. For Geoff's R10 review it is rendered to markdown cards; his
edits fold back into the JSON. It is deleted at its arm's merge. The `docs-page-chain.js` change
that reads it belongs to the stage 2a plan, not this pass.

## Timing

The pass is file-disjoint from theme pass C except for facts-file appends, and fact ids never
collide across worktrees, so it runs with no ordering constraint. If it merges before pass C cuts
`0.98.0`, that release ships the reference arm only, as the parent amendment already allows; if it
merges after, `0.98.0` carries the old arms one last time.

## Budget

About 3 to 4.5M for the audit (49 pages at 60 to 90k tokens each), about 1M for the deletion,
about 1M for review and the close. Ceiling 7M, with a checkpoint after the first audit batch that
re-projects the rest from its measured per-page rate.

## Acceptance

- The verifier passes over all 49 pages, and its counts are in the pass record.
- The 49 pages are gone from `main`; `migration-notes.md`, `upgrade-cairn.md`, and
  `choose-an-ai-posture.md` remain.
- `relink.json` lists every removed link and narrowed assertion with its restoring stage.
- The full repo gate, the docs gate, `check:facts`, and `make -C tool check` are green.
- The parent spec's amendment points here, and STATUS names the stage 2a plan as the next action.

## Out of scope

Drafting any page, writing any outline, changing `docs-page-chain.js`, and bumping cairn.pub's pin.
