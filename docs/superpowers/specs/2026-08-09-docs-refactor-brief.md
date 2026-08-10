# Docs refactor: the pre-brainstorm brief

Input for the Fable brainstorm on the documentation refactor, drafted 2026-08-09 against the
`cleanup-artifacts` snapshot plus the in-flight cleanup branch's committed objects. This is
working material for the brainstorm, not a design; the decisions are listed at the end.

The instinct under examination came from Geoff's framing: cairn now has three distinct
audiences. A developer building a site on the engine, a developer working on the engine itself,
and the editors who write on the sites. The move to beta is what unblocked a structural pass, and
the question on the table is whether `docs/` should be restructured around those audiences.

## Settled ground (not for relitigation)

- The three audiences are the lens.
- cairn is moving to beta. The ROADMAP's pre-beta pass series runs toward `1.0.0-beta.1` as
  release two, and "churn stays free until the public beta" (Geoff, 2026-07-30, banked in
  `ROADMAP.md`) is standing policy. The refactor's timing is a live question; the beta move is
  settled.
- `CONTRIBUTING.md` exists. It is committed on the in-flight cleanup branch (commit `fa000874`,
  96 lines: setup, gates-as-authority, conventions, a rule-level repository map), with a routing
  sentence added to the root `README.md`. It has not merged to `main` yet, and `check:docs`
  already anticipates it in its root-file list.
- The docs-on-site pipeline rulings of 2026-07-18
  (`docs/superpowers/specs/2026-07-18-docs-on-site-pipeline-design.md`) were Geoff's explicit
  picks and shipped: in-package docs sourcing, cairn.pub rendering `/docs` and `/help` from the
  tarball, two sites, Topo and the docs.cairn.pub split later. Reopening any of these takes a
  deliberate decision.

## The evidence (what exists, and who it reaches)

### The published tree

`package.json` `files` ships `docs/README.md`, `docs/reference`, `docs/guides`,
`docs/explanation`, and `docs/tutorial`. `docs/internal/` and `docs/superpowers/` stay out of the
tarball. The shipped tree in the `cleanup-artifacts` snapshot:

| Arm | Pages | Notes |
| --- | --- | --- |
| `docs/reference/` | 24 + index | one page per export subpath, plus admin routes, log events, authoring syntax, toolchain |
| `docs/guides/` | 34 + index | 28 developer guides, 6 editor guides, grouped "For developers" / "For editors" in the index |
| `docs/explanation/` | 11 + index | architecture, security model, why-cairn, and the rest of the why |
| `docs/tutorial/` | 2 | no arm README; its index is `docs/README.md`, a mapping `check:arm-indexes` encodes explicitly |

That is 71 content pages plus three arm indexes plus the front door. The register standard's
header says "62 pages"; stale, worth a one-line fix in whatever pass touches it.

The six editor guides are `editor-welcome`, `write-in-the-editor`, `add-an-image`,
`publish-and-discard`, `manage-the-media-library`, and `manage-your-tag-vocabulary`. Six, not the
seven previously claimed: `share-a-draft-preview` is filed under "For developers" and is
developer-facing in fact, opening with a D1 migration and `wrangler` commands. One reference
page, `authoring-syntax.md`, calls itself the "author-facing home" for `cairn:`, `media:`, and
`::include`, so a sliver of editor-relevant material sits outside the guides grouping.
`editor-copyedit.md` in the explanation arm covers editor-facing copy but addresses a developer.

### The unshipped trees

`docs/internal/` holds 93 markdown files, 54 top-level entries plus `design/`, `feedback/`,
`history/`, and `probes/`. Its README indexes roughly 14 of them as "Live": the durable
engine-facing documents (`admin-design-system.md`, `code-idioms.md`, `api-surface.md`,
`what-cairn-is-and-is-not.md`, `docs-register.md`, `docs-maintenance.md`,
`public-design-system.md`, `admin-smoke-test.md`, and a few more). Roughly 35 dated process
artifacts sit unindexed beside them at the top level: pass briefs, harvest findings, calibration
ledgers, comparables research, post-mortems, review records. The prior observation that
`docs/internal/` conflates engine-developer documentation with project history and process is
confirmed, and the README's own index has not kept up with the accumulation.

`docs/superpowers/` holds 106 specs and 180 plans, the initiative record. It is process history
by design and nothing routes a newcomer into it.

### Where each audience enters today

The site developer is well served. Root `README.md` and `docs/README.md` are both written to this
reader (the register standard names "the seasoned developer serving an organization" as the front
door's primary persona), the four arms are theirs, and the same tree renders at cairn.pub/docs.

The editor has a working delivery chain, which corrects the argument this brief tests (see part
2 below). The chain, end to end:

- The six guides ship in the tarball.
- cairn.pub reads the docs tree from `node_modules/@glw907/cairn-cms/docs` at build time and
  renders them publicly under `/help` (shipped 2026-07-18, from the `0.87.4` in-package tree).
- The admin's Help home (`/admin/help`, `src/lib/components/HelpHome.svelte`) carries a "Get
  help" hand-off whose default is `DEFAULT_SUPPORT_CONTACT = 'https://cairn.pub/help'`
  (`src/lib/content/compose.ts:18`).
- Both front-door READMEs route "If you write for a site built on cairn" to `editor-welcome` in
  the first screenful.

An editor reaches their docs from the admin, without a GitHub account or an npm install.

The engine contributor has the thinnest routing. `CONTRIBUTING.md` (in flight) is now their
front door, and it points into a `docs/internal/` where the ~14 documents a contributor needs sit
unindexed among ~35 dated artifacts and four subdirectories of record. `docs/README.md` gives
this audience one sentence, filed under "Project files": "Maintainer-facing material (the design
system, the smoke test, and superseded history) lives under internal/." The prior observation
that the docs front door "has no path for the engine contributor" overstates it slightly, since
that sentence exists. It is right in substance: the pointer is buried and framed as an aside, and
the directory it lands on does not separate its living documents from its sediment.

## The counter-argument, tested

The argument against restructuring `docs/` around audiences ran in three parts.

**Part 1, engine contributors are already separated by a stronger boundary than a directory.**
Holds. The `files` array is a physical boundary a directory rename cannot improve on, and
`CONTRIBUTING.md` is the conventional front door in the conventional place. Where the argument is
incomplete: the boundary solves exclusion, and the contributor's actual problem is findability
inside the excluded zone. The `docs/internal/` conflation is real, a `files`-array boundary does
nothing about it, and no published-tree restructure touches it either. The fix lives inside
`internal/`.

**Part 2, editors are a delivery problem, not a directory problem.** Half right, and the half
that was wrong inverts. The claim that editor guides ship into `node_modules` "where no editor
will ever look" treats the tarball as the destination. It is the transport: Geoff ratified
in-package docs sourcing on 2026-07-18 so cairn.pub could build `/help` from the installed
package, and that shipped. The delivery problem this part said should be solved instead *is
already solved*. cairn.pub/help is live, the admin links to it by default, and the docs.cairn.pub
split on Topo is the planned next step of an already-portable pipeline. What survives: whether
the editor corpus should live as a subsection of the developer guides arm is still open. One
tension to resolve first: the ratified pipeline derives sidebar, grouping, and prev/next from
each arm index's link order rather than from the filesystem, so a directory move buys register
separation and index ownership, and buys nothing `/help` cannot already render.

**Part 3, Diátaxis and audience are orthogonal axes.** The orthogonality observation holds, and
the numbers back the thinness claim: crossed fully, the 3x4 matrix is mostly empty. The editor
corpus is six guides plus a fraction of one reference page, with no editor tutorial, no editor
explanation, and no editor reference page. The contributor corpus is not Diátaxis-shaped at all
(a design system, an idiom charter, a generated API surface, standards, dated records). Only the
site developer fills all four cells. The appeal to authority in this part was wrong, though, and
in the direction that matters: Diátaxis does not say that wanting to split by audience signals
misfiled content. Its "Diátaxis in complex hierarchies" page explicitly contemplates "very
different user-types," allows separating contributors' material from user-facing material, and
says documentation "should be as complex as it needs to be" so long as the four forms stay
unmuddled. (The page has moved from `diataxis.fr/complex-hierarchies/`; the quoted text is from
its indexed copy, so re-verify the citation before it lands anywhere published.) Diátaxis is
permissive about audience partitions in complex cases, which counts mildly *for* the restructure
option rather than against it. What remains against it is the evidence, thin cells, and the
prices below.

## The question

Each audience already has a working channel, which narrows the question to:

**Which audience has a structural problem, which has a routing problem, and do any of the fixes
require moving files in the published tree before beta hardens the paths?**

By audience, the evidence reads: the site developer's structure works and the gates hold. The
editor's question is placement, since their corpus works but lives as a guest section inside a
developer arm, and the Topo split will force a decision on it eventually anyway. The
contributor's problem is structural and sits entirely in the unshipped `docs/internal/`, which no
gate, consumer, or external link constrains.

Beta timing bears on the published tree and only there. Before `1.0.0-beta.1`, churn is free by
standing policy and no external reader holds a cairn.pub/docs bookmark worth preserving; after
it, a moved path costs a redirect or a broken link. Whether that makes this window the moment to
move published files, or the reason to hand any move to the Topo migration, is decision 5.

## Options

These are not fully mutually exclusive. C composes with either A or B, and D constrains all
three.

### A. The audience-arm restructure

Reshape `docs/` around the three audiences: something like
`docs/developers/{tutorial,guides,reference,explanation}`, `docs/editors/`, and a contributor arm
(or `CONTRIBUTING.md` promoted to route a reorganized `internal/`).

What it buys: the top level of the tree states the engine's three-audience premise directly. The
editor corpus stops being a guest section in a developer arm. A reader navigates by who they are
before what they want to do, and a Topo-era sidebar could fall out of the directory tree rather
than out of index prose order. Diátaxis's complex-hierarchies guidance permits exactly this
shape, the four forms kept distinct within each partition.

What it costs: the full gate-rewiring bill (next section), the cairn.pub coupling, a breaking
release with a `Consumers must:` line, and link churn through `CHANGELOG.md`, `ROADMAP.md`, and
four production consumer sites. The contributor cell stays awkward, because contributor material
is not Diátaxis-shaped and mostly cannot ship, so the third arm is either a stub pointing at
`internal/` or a shipped set that does not yet exist. And the matrix thinness means the editor
arm holds six guides while the developer arm holds everything else.

### B. Keep Diátaxis, promote the editor corpus to its own arm

Leave the four developer arms as they are. Move the six editor guides (plus, judgment call, the
authoring-syntax material) to a fifth top-level arm, `docs/editor/` or similar, with its own
index and its own register line, shipped in `files` like the others. Sharpen both front doors to
route three audiences explicitly.

What it buys: the editor corpus gets structural first-class status at the scale of six files'
inbound links rather than the whole published tree's. The register standard's existing "editor
guides speak the editor's vocabulary" rule gets a directory boundary instead of a heading. The
developer guides index stops carrying a second audience, and cairn.pub's `/help` reads one arm's
index instead of a subsection of another's.

What it costs: the same gate and pipeline categories as A at smaller scale. Six files' inbound
links chased, one new `ARMS` entry, one `.vale.ini` line, the cairn-pub `/help` loader repointed,
one `Consumers must:` line. It also spends the pre-beta churn window on a move the Topo split
might have absorbed for free, and the pipeline's index-order design means the rendered `/help`
gains nothing visible.

### C. Reorganize the unshipped contributor zone, touch nothing published

Split `docs/internal/` into its two conflated halves: a curated contributor-docs set (the ~14
"Live" documents, indexed, routed from `CONTRIBUTING.md`) and the process record (dated
artifacts, joined with or paralleling `history/`; `docs/superpowers/` stays the initiative
archive it is). Front-door changes limited to routing prose, with `docs/README.md` gaining a real
third-audience sentence pointing at `CONTRIBUTING.md`.

What it buys: it fixes the confirmed structural problem for the audience whose zone carries no
release consequences. The contributor path becomes README to CONTRIBUTING to a curated set, and
the sediment stops burying the living documents.

What it costs: no release and no consumer impact, but not nothing. `check:docs` walks `docs/`
minus only `superpowers/`, so every `docs/internal/` move is inside the link gate, and
`CLAUDE.md`, `docs-maintenance.md`, `docs-register.md`, and the agent memories name internal
paths in prose that a move must chase. The option also needs a filing rule for new internal
documents, because without one the sediment reaccumulates and the README index falls behind
again. And it declines the editor-placement question, leaving the guest-section arrangement for
the Topo pass to inherit.

### D. Defer published-tree structure to the Topo / docs.cairn.pub pass

Do C now, and rule that any published-tree restructuring rides the docs.cairn.pub migration,
where the pipeline, sidebar derivation, and link rewriting get rebuilt anyway and one migration
absorbs both changes.

What it buys: one coordinated breaking change instead of two, and a restructure designed against
the real Topo navigation instead of guessed at.

What it costs: the Topo pass has no date, and beta does. If beta.1 ships before Topo, the
published paths harden with the editor corpus still under developer guides, and moving them then
costs what this window would have saved.

## The bill any published-tree option must price in

Every gate below encodes the current arm layout. None is prohibitive; all are real, and the list
is the checklist a plan would carry.

- `check:reference` (`scripts/checks/reference-coverage.mjs`): a `CONFIG` mapping subpaths to
  `docs/reference/` pages.
- `check:reference:signatures` (`scripts/checks/check-reference-signatures.mjs`): shares that
  CONFIG, and keeps a per-page simplification allowlist keyed by path.
- `check:docs` (`scripts/checks/docs-links.mjs`): walks `docs/` minus `superpowers/` plus the
  root files (including `CONTRIBUTING.md`). Every moved file's inbound links must chase. The
  inbound set includes `CHANGELOG.md` and `ROADMAP.md`, both large; derive the actual inbound
  link counts from `check:docs` before a plan commits to a move budget.
- `check:arm-indexes` (`scripts/checks/check-arm-indexes.mjs`): a hardcoded `ARMS` list,
  including the deliberate tutorial-index-is-the-front-door mapping.
- `check:snippets` (`scripts/checks/check-snippets.mjs`): extracts fenced blocks from
  `docs/tutorial`, `docs/guides`, `docs/reference` by path.
- `.vale.ini`: scopes the Google package to the four arm paths plus the docs index.
- The cairn.pub pipeline: the site reads the tree from the installed package at build time, and
  the ratified design makes each arm index's link order the sidebar, grouping, and prev/next
  source of truth (the guides' developer/editor grouping "lives in the guides index's prose
  order, per the ruling"). A restructure is a breaking change for cairn-pub, sequenced
  publish-first like any other, with a `Consumers must:` line.
- Anchor and path stability: cairn.pub/docs URLs mirror the tree, so moved files break external
  bookmarks, and anchor-fragment links across the corpus ride the github-slugger compatibility
  gate (225 anchors when the 2026-07-18 topo brief measured them; re-derive against the current
  tree). Four production sites read these docs, and the register doc, `docs-maintenance.md`,
  `CLAUDE.md`, and the `cairn-pass` ritual name arm paths in prose.

Also worth pricing: the monthly drift routine samples published pages by path, and the friction
log tags entries `developer:` / `editor:` / `operator:`, a three-way split that does not match
the three audiences (its "operator" is the running-site half of the developer). Any pass that
ratifies the audience taxonomy should reconcile the tags or say why not.

## Open decisions for Geoff

1. Where does the editor corpus live: a grouped section of `docs/guides/` (status quo), its own
   shipped arm (option B), or wherever the Topo migration puts it (option D)?
2. Is `docs/internal/` one thing or two? If two, where is the line between contributor
   documentation and project record, and does `docs/superpowers/` stay separate or fold into the
   record side?
3. What is the contributor's front door: `CONTRIBUTING.md` alone, or `CONTRIBUTING.md` plus a
   curated, indexed contributor set it routes into?
4. Does `docs/README.md` (and the root README) change to route three audiences explicitly, and
   does the front-door register standard change with it?
5. Does any published-tree move land inside the pre-beta churn window, or is published-tree
   structure explicitly ceded to the Topo / docs.cairn.pub pass?
6. Should the friction log's `operator` tag become a named sub-audience of the developer, or be
   retired into `developer:`? (This refines the three-audience premise rather than reopening it:
   operator-as-sub-audience keeps the count at three.)

## Verify at pass start

Four facts in this brief correct earlier inputs, and one correction is new; re-check each before
the brainstorm builds on them: the editor guide count is six (`share-a-draft-preview` is a
developer guide); the in-package docs tree is the deliberate delivery path to cairn.pub/help
rather than content stranded in `node_modules`; `docs/README.md` does carry a buried
engine-contributor pointer; `CONTRIBUTING.md` is committed on the cleanup branch (`fa000874`)
and should be confirmed merged; and Diátaxis's complex-hierarchies guidance permits audience
partitioning rather than warning against it, with the citation needing a fresh URL.
