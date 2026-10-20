# Draft docs approach: data-integrity and failure-risk review

**Target:** `docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md` at `e00fcf70`.
**Input:** `docs/internal/record/2026-09-26-docs-approach-handoff.md`. **Lens:** what can be lost,
silently corrupted, or shipped wrong. Findings are ranked by consequence. Style is out of scope.

**Counts:** 0 blocker, 5 major, 5 minor, 1 owner fork.

## Major

### M1. Heading anchors printed by shipped binaries are not covered by redirect rows, and the gates hide the break

- **Location:** spec `:86-90` (outline lists page renames "each with a redirect row"), `:164-165`
  (redirects are cairn.pub's input); stage 3 rebuilds `docs/admin/is-it-working.md` "from a fresh
  outline".
- **Evidence:** the binary prints fragment URLs, not only page URLs:
  `tool/internal/render/layout.go:24` (`fixAnchorBase = docsBase + "admin/is-it-working#"`),
  `tool/internal/doctor/report.go:70-74`, `tool/internal/health/fixes.go:62-76`, and 25
  `docsAnchor` values at `src/lib/diagnostics/conditions.ts:40-247`, mirrored into the Go tool via
  `tool/internal/spine/conditions.json`. Tags `tool/v1.0.0`, `v1.0.1`, `v1.1.0` already ship them.
  A URL fragment never reaches the server, so no cairn.pub redirect can repair a renamed heading.
  Meanwhile `check:readiness` (`scripts/checks/check-readiness.mjs:3-6`) and
  `tool/internal/health/fixes_test.go:146-168` only pin *today's* registry to *today's* headings.
  A rebuild that renames headings will turn them red, the implementer updates `conditions.ts` and
  `fixes.go` to match, the gates go green, and every installed binary's fix links silently land on
  the page top. The handoff calls this URL shape a frozen contract (handoff `:60-62`; cairn-pub
  handoff `:45-52`).
- **Fold:** add to stage 0 a committed ledger of every anchor any shipped tool tag prints (derive
  it from `conditions.json` and `fixes.go` at each `tool/v*` tag), and extend `check:readiness` to
  require every ledgered anchor to still resolve in `is-it-working.md`. The admin outline then
  either keeps those heading slugs or carries an explicit legacy anchor per renamed heading (a raw
  `<a id>` that `docs-links.mjs` and cairn.pub's renderer both honor; verify both). State in the
  spec that the outline's rename table covers anchors, not only pages.

### M2. "Merging is safe" assumes no release mid-initiative, and no invariant keeps each merge releasable

- **Location:** spec `:47-49`, `:166`.
- **Evidence:** releases fire when "a consumer site needs the change now" (`CLAUDE.md`, Releases).
  The spec places a site round after each draft (`:13`), and site rounds are exactly what produce
  engine asks, so a cut with extend rebuilt and admin/editors old is the likely case, not an edge
  case. What then ships wrong, ungated:
  - Code-span path references in tarball content, which `check:docs` skips because it ignores
    code spans (`scripts/checks/docs-links.mjs:11-12`): `skills/cairn-extend/SKILL.md:29-30`,
    `skills/cairn-admin-screens/SKILL.md:22,46,65`, `claude/CLAUDE.md:21-29`
    (`node_modules/@glw907/cairn-cms/docs/...`), and scaffold template comments
    (`packages/create-cairn-site/template/svelte.config.js:53`,
    `.../src/theme/cairn.config.ts:159`, `.../src/routes/admin/signups/+page.server.ts:3`). A
    renamed extend page strands every consumer agent that follows the packaged skill; these
    paths are filesystem paths, so a cairn.pub redirect does not help.
  - Removed or renamed pages get no `CHANGELOG.md` line, so the cut's `Consumers must:` list is
    silent about them.
  - Nothing mechanical ensures the outline's redirect rows are complete.
- **Fold:** stage 0 adds (a) a check that every doc path published in the last release tarball
  either still exists or has a row in a committed redirect ledger, (b) a scan of code-span
  `docs/<arm>/...` and `cairn-cms/docs/...` paths in `skills/`, `claude/`, and
  `packages/create-cairn-site/template/` against the tree. Each stage's merge writes a
  `## Unreleased` entry listing renamed and removed doc paths. State the invariant: every stage
  merge leaves `main` releasable. See also the owner fork below.

### M3. Omissions are undetectable, and external facts have no harvest path

- **Location:** spec `:108-112` (page inputs), `:117-119` (fact read checks present claims only).
- **Evidence:** every check in the chain verifies what the page says; none detects what it
  dropped. Pass A's 40 percent gap was an omission gap. The per-page harvest says a missing fact is
  "found in code or config", but the admin arm is mostly Cloudflare and GitHub procedure with no
  code line to cite: `docs/internal/facts/admin.md` holds 0 `[external]` bullets, and a durable
  gotcha like `E_SENDER_NOT_VERIFIED` (`CLAUDE.md`, Durable gotchas) is absent from `admin.md`.
  Under `check:provenance` such a sentence must cite a citable fact or be `no-claim`; the gate
  cannot see a claim with no extractable token (`scripts/checks/check-provenance.mjs:44-53`). So a
  vendor step is either dropped silently or shipped as an unverified `no-claim` sentence.
- **Fold:** the page-inputs step also harvests `[external]` facts sourced to a vendor doc URL. After
  the draft, one cheap step compares the old page's claim inventory (a list of claims, not prose,
  which ruling 1 permits as job provenance) against the new brief, and marks each old claim carried,
  dropped with a reason, or filed. The dropped list goes in the per-page record so the owner read
  and the site round can see it.

### M4. Concurrent doc writes between the site round and a stage worktree are unruled

- **Location:** spec `:28-30`, `:67-72`, `:147-148`.
- **Evidence:** memory `one-release-then-model-sites` records two rules to overturn, the freeze
  *and* `CLAUDE.md`'s "a site-pass agent never edits the cairn-cms checkout" with the
  `site-docs/<site>-<pass>` batching, and says "the write path for site agents (a branch and PR per
  site pass was the conductor's suggestion, unruled)". Stage 0 acceptance updates only the freeze
  text and says nothing about the checkout rule or the write path. With a site round after each
  draft, site agents fix arm N while stage N+1 rebuilds another arm, and a later site pass may touch
  an arm whose rebuild is in flight. A rebuild replaces whole files, so a conflict resolves by
  taking the rebuilt page and the site's fix vanishes. The fact behind it never entered the
  container, so the rebuild cannot recover it. Separately, any site edit to a rebuilt page must keep
  its brief in sync or `check:provenance` goes red in CI (`.github/workflows/test.yml:83`), and the
  edit bypasses the fact read.
- **Fold:** Stage 0 rules the write path: a branch and PR per site pass off `main`, gated by the
  full docs gate. It also updates the `CLAUDE.md` checkout rule. A site agent fixing a rebuilt page
  updates its brief and cites or files the fact. While an arm's stage is in flight, site agents
  file divergences on that arm, never fix them, and the filings feed that stage's page inputs. A
  stage rebases on `main` before its consistency read.

### M5. The per-page cost has no evidence, and a miss strands the largest spend in an unmerged worktree

- **Location:** spec `:52-63`, `:157-160`.
- **Evidence:** the 350K-per-page basis cites no measurement. The only measured figure is about
  900K per page over three rounds (handoff `:106-107`). The new chain adds a per-page harvest and a
  second parallel reviewer while dropping one round. Stage 1 edits in place and never runs the
  chain, so extend (11M, 55 percent of the budget) is the first stage that measures it, and it
  measures only at its own close. At 700K per page, extend alone is about 23M. The 80 percent stop
  then fires mid-extend with no narrative arm merged, and every page drafted so far sits in an
  unmerged worktree. Also, the shares sum to exactly 20M. Stages 0-3 total 16M, so the 80 percent
  global stop fires at the start of stage 4 even when every stage lands on budget.
- **Fold:** put an in-stage checkpoint after a pilot batch of three to five extend pages that
  measures real per-page cost and runs the first owner read before the rest are dispatched. Plan
  the 2a/2b split up front as a mergeable 2a (with its own consistency read and link repair), not
  as a contingency. Keep a reserve line in the share table so the planned total sits below the 80
  percent stop.

## Minor

### m1. Edits after review skip the fact read, and a stale fact is never corrected

- **Location:** spec `:92-97`, `:117-119`.
- **Evidence:** the consistency batch, the owner fold "across the whole arm", and site-round fixes
  change sentences after the fact read ran. They pass only the static gate. When the fact read finds
  a cited fact that no longer matches its source, the spec does not say to fix or retag the bullet,
  so the next page cites the same stale bullet. `check:facts` checks only that a `path:line` points
  inside the file, so line drift passes it.
- **Fold:** a sentence whose fact id changes, or whose text changes and carries a fact id, gets a
  fact read scoped to the changed sentences. A stale finding fixes or retags the bullet
  (`[docs-drift]` makes it uncitable) in the same chain, under `check:facts`.

### m2. The chain's gate list omits the gates that pin specific arm pages

- **Location:** spec `:115-116`.
- **Evidence:** CI also runs `check:readiness`, `check:editor-quotes`, `check:transcripts` (per-page
  floors at `scripts/checks/transcript-blocks.mjs:32-34`), `check:target-stack`, `check:symbols`,
  `check:snippets`, `check:arm-indexes`, and `check:visuals`, plus the Go tests reading
  `is-it-working.md` and the three contract pages (`.github/workflows/tool.yml:12-24`). Failures
  surface only at merge, after the owner read and fold. `check:editor-quotes` hard-codes
  `docs/editors/when-something-goes-wrong.md` (`:30`) and passes vacuously when a rebuilt page stops
  bolding its quotes, so the "quoted exactly" promise can lose its only guard silently.
- **Fold:** the chain runs the whole docs gate family on each page. The outline's rename table also
  lists every gate that hard-codes a renamed path. Stage 0 gives `check:editor-quotes` a nonzero
  quote floor.

### m3. `check:procedures` classifies read-only commands too loosely and has a version skew

- **Location:** spec `:139-146`.
- **Evidence:** `--json` does not imply offline. `cairn health [<site>]` and `cairn logs <site>` are
  read-only but need a deployed site and provider credentials (`docs/reference/cli-cairn-doctor.md`
  intro). Run "for real" in CI, they fail or get quietly skipped. The spec also does not say which
  binary runs: a `tool/` build at HEAD can accept flags no released tag has, yet operators run a
  released tag.
- **Fold:** run for real only an explicit offline allowlist (`doctor`, `--help`, `version`); verify
  every other command against `--help`. Build the binary from `tool/` at HEAD, and have any page
  whose commands exceed the latest tool tag say which version it describes.

### m4. Facts sourced only to the page being rebuilt become self-verifying

- **Location:** spec `:108-112`, `:117-119`.
- **Evidence:** 23 fact bullets cite only an arm page as their source (19 in `extend.md`, for
  example `f:58xph1`, which cites `docs/admin/invite-editors.md`). After a rebuild, the fact read
  checks the claim against the new page, which drew on the claim. A rename also breaks the pointer
  under `check:facts` (`scripts/checks/check-facts.mjs:336-341`), which fails loudly.
- **Fold:** page inputs retrace any cited fact whose only source is an arm page to code, config, or
  a vendor doc before citing it. An untraceable fact is retagged `[candidate]`.

### m5. The arm READMEs belong to stage 5, but stages 2-4 must edit them

- **Location:** spec `:59`, `:38`.
- **Evidence:** `check:arm-indexes` requires each arm README to link every page in its directory
  (`scripts/checks/check-arm-indexes.mjs:1-5`), so any stage that adds, renames, or removes a page
  must edit a README that stays frozen until stage 5.
- **Fold:** say that each stage owns link maintenance in its own arm README (and in `docs/README.md`
  links into its arm) as an in-place fix, and that stage 5 rebuilds the READMEs' prose.

## Owner fork

### F1. Release policy while arms are mixed

A release cut between stage merges ships a tarball with some arms rebuilt and some old, in two
registers and with uneven depth. cairn.pub renders that mix at its next pin bump.

- **(a)** Hold every release until stage 5 merges. The site round would then run on unreleased
  engine fixes through `link:consumer`.
- **(b)** Allow releases at any stage boundary, under M2's releasable-at-every-merge invariant.
- **(c)** Allow releases, but hold cairn.pub's pin bump until stage 5.

**Recommendation:** (b). The site round needs releases, and M2's checks make each merge safe to
ship. A mixed-register tarball is a polish cost; broken paths and anchors are correctness costs,
and (b) plus M1 and M2 remove the correctness costs.
