# Docs Diagram-Pages Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (dispatch `cairn-implementer` per task; the conductor reviews each diff and verifies the full
> gate between dispatches). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the ten diagram-bearing extend and admin pages against their per-page
contracts, authoring the pass's ten mermaid diagrams and the scaffold directory tree, and land
the visuals gate; the branch merges only after the cairn diagram theme lands in cairn-pub.

**Architecture:** Docs-only page rewrites plus one gate script. Every page's content contract
lives in `docs/internal/record/2026-08-15-docs-outlines-with-visuals.md` as amended by
`docs/internal/record/2026-08-15-docs-visual-layer-rulings.md` (rulings 1 through 4 govern; the
inventory dispositions are ruling 3). The visuals rules a writer follows are the "Visuals"
section of `docs/internal/docs-register.md`. Diagrams are authored mermaid text, so their
content is theme-independent; the theme only styles the render, which is why this pass runs in
parallel with the cairn-pub theme work and merges behind it.

**Tech Stack:** Markdown + mermaid fences (with mermaid's native `accTitle`/`accDescr`
accessibility directives), Node check scripts under `scripts/checks/`, vitest, Vale (Google
package governs these two tracks).

## Global Constraints

- **Worktree.** All work in a fresh worktree off `main` (`superpowers:using-git-worktrees`);
  every edit targets the worktree path. The branch does NOT merge to `main` until the cairn
  diagram theme has landed in cairn-pub and each diagram page has passed a full-page themed
  render read (the one-check rule), with Geoff's polish read on the two marquee diagrams (the
  architecture block diagram and the ownership map).
- **Scope fence.** Only the pages named in tasks below. `create-your-site.md` and
  `is-it-working.md` are OUT: their transcript blocks have no recorded fixtures (verified
  2026-08-15; see the ROADMAP transcript-gate entry), and each page is rewritten once, so both
  ride the future capture pass, `create-your-site.md`'s setup-journey diagram included. The
  editors track is OUT (blocked on the live-reproduction seam). No new diagrams beyond the
  inventory; ruling 3's five cuts stay cut.
- **The diagram authoring convention (fixed for this pass, relayed to the theme session):**
  every mermaid fence carries mermaid's own `accTitle:` (the short accessible name, at most
  150 characters, naming the kind first, e.g. "Diagram of ...") and `accDescr:` (the gist);
  the first non-blank line after the closing fence is the caption, one emphasis paragraph
  (`*...*`) of complete sentences carrying the facts the page's contract assigns to the
  caption. The essential information a diagram carries also survives in body text (the
  two-part alternative); the contract's must-survive list is that text.
- **Fact survival.** Each page task verifies its contract's full "must survive" list against
  the rewritten page by grepping for each fact's key phrase before committing. A rewrite that
  drops one regresses a defect the production gate already paid to find.
- **Register.** Prose follows `docs/internal/docs-register.md` (both the track registers and
  the new Visuals section). The pass-end review fans out `cairn-register-editor` per rewritten
  page. Vale must stay clean on every touched page (`npm run check:vale`).
- **Complexity budget.** No diagram exceeds about 15 nodes. If a contract's diagram cannot fit,
  stop and raise it rather than shipping a bigger one.
- **Gate.** Every task ends with the repo gate green: targeted checks plus `npm run check` 0/0
  and `npm test` exit 0. The new `check:visuals` gate (Task 2) must be proven red once before
  it is trusted.
- **Docs dimension.** The pass close updates `CHANGELOG.md` under `## Unreleased`,
  `docs/STATUS.md`, and `ROADMAP.md` (the visual-layer Now entry), per the docs-is-a-pass-
  dimension rule. No version bump, no publish.

---

### Task 1: `docs/extend/architecture.md` (two diagrams)

**Files:**
- Modify: `docs/extend/architecture.md`

**Interfaces:**
- Produces: the first two mermaid fences in the corpus, used by Task 2 to prove the gate red,
  and the first real diagrams handed to the cairn-pub theme session.

- [ ] **Step 1:** Read the page's contract (outlines record, extend track item 1) and the
  rulings' global constraints. Author the system block diagram at the top: the site (adapter,
  admin mount, delivery routes), the engine's four subpaths (root/core, `/sveltekit`,
  `/components`, `/delivery`), the three stores (git, D1, R2). Verify the export map against
  the current `package.json` `exports` field before drawing, per the plan-assumptions rule.
  Shorten the second paragraph's export enumeration per the contract; keep its reasoning
  sentence.
- [ ] **Step 2:** Author the write-path sequence diagram in "The write path": editor, admin,
  GitHub App, holding branch (`cairn/<concept>/<id>`), main, the site's deploy, with the
  author/committer split labeled on the commit arrow. Shorten the mechanics sentences; the
  whys stay prose.
- [ ] **Step 3:** Both fences carry `accTitle`/`accDescr`; both get their caption paragraph;
  count nodes against the budget.
- [ ] **Step 4:** Grep the rewritten page for the contract's reasoning survivals (the
  three-way-split why; drafts-iterate/history-honest). Run `npm run check:vale` and the full
  gate.
- [ ] **Step 5:** Commit.

### Task 2: the `check:visuals` gate

**Files:**
- Create: `scripts/checks/check-visuals.mjs`
- Create: `src/tests/unit/check-visuals.test.ts`
- Modify: `package.json` (a `check:visuals` script, folded into `check`)
- Modify: the CI workflow that runs the check family (re-derive which workflows gate PRs with
  `grep -l pull_request .github/workflows/*`, per the CI-gates rule; wire the new check where
  its siblings run)

**Interfaces:**
- Consumes: Task 1's two fences as the first non-vacuous input.
- Produces: `npm run check:visuals`, exit 0 clean / exit 1 with one line per violation.

- [ ] **Step 1:** Write the failing test first: the checker over a fixture doc flags (a) a
  mermaid fence missing `accTitle` or `accDescr`, (b) a fence whose next non-blank line is not
  an emphasis-paragraph caption, (c) an `![...]` image with empty alt and no explicit
  decorative form, (d) alt text over 150 characters; and passes a compliant fixture.
- [ ] **Step 2:** Implement the checker over `docs/admin`, `docs/editors`, `docs/extend`,
  `docs/reference`, and the docs index. It must report, not silently skip, when it finds zero
  visuals in a tree it was told to scan only if the corpus is expected to carry them; scope it
  to flag violations, and print a scanned/found summary line so a vacuous run is visible.
- [ ] **Step 3:** Prove it red against the real corpus once: temporarily strip `accDescr` from
  one Task 1 fence, run `npm run check:visuals`, confirm exit 1 and the message names the file;
  restore.
- [ ] **Step 4:** Full gate green; commit.

### Task 3: `docs/extend/security-model.md` (one diagram, one cut)

**Files:**
- Modify: `docs/extend/security-model.md`

- [ ] **Step 1:** Author the trust-boundary diagram after "The threat model": editor's browser
  through the guard to the commit pipeline and the repo, then deploy, then the render pipeline
  to the visitor's browser, the two models labeled on their halves. Shorten the
  cross-referencing sentences per the contract.
- [ ] **Step 2:** Apply the guard-order CUT (ruling 3): the dense enumerating sentence in "The
  guard's request order" becomes an ordered list, one step per item with its rationale clause
  (dev tripwire, non-admin origin check, https help page, bindings check, CSRF, session
  resolve). Verify the order against `src/lib/` guard source before writing, not from memory.
- [ ] **Step 3:** Must-survive grep: every step logs a named `guard.rejected` reason.
  Convention, caption, budget, Vale, full gate.
- [ ] **Step 4:** Commit.

### Task 4: `docs/extend/data-tiers.md` (one diagram, one cut-to-table)

**Files:**
- Modify: `docs/extend/data-tiers.md`

- [ ] **Step 1:** Apply the three-tier-map CUT (ruling 3): the section-opening enumerations
  become one table, one row per tier (git, D1, R2) with columns for what it holds, how it is
  keyed, and its selection rule; per-tier reasoning stays prose. Verify the five D1 tables and
  the manifest keying against the current schema/source first.
- [ ] **Step 2:** Author the media-storage flow diagram in the R2 section: upload splitting
  into content-addressed bytes to R2 and a manifest row in git, meeting at the delivery URL.
  Shorten the mechanics sentences per the contract.
- [ ] **Step 3:** Must-survive grep: the adapter member is `media` (never `assets`) anywhere a
  label names it; the manifests' different keying (concept-and-id versus content hash) in the
  caption or table. Convention, budget, Vale, full gate.
- [ ] **Step 4:** Commit.

### Task 5: `docs/extend/link-content-with-references.md`

**Files:**
- Modify: `docs/extend/link-content-with-references.md`

- [ ] **Step 1:** Author the delete-guard decision diagram spanning "The delete guard" and
  "What blocks and what only warns": delete requested, manifest inbound check, the cross-branch
  index build with its strict failure, refuse or proceed. Shorten the blocks-versus-warns
  enumeration; the asymmetry's reasoning (a body `cairn:` link degrades visibly, a reference
  field does not) stays prose.
- [ ] **Step 2:** Must-survive grep: the byte-preserving rename fact; the
  build-gate-is-the-only-backstop sentence. Convention, budget, Vale, full gate.
- [ ] **Step 3:** Commit.

### Task 6: `docs/extend/render-safety.md`

**Files:**
- Modify: `docs/extend/render-safety.md`

- [ ] **Step 1:** Author the pipeline-order diagram: parse, `rehype-raw`, the sanitize floor,
  component `build()` dispatch, `rehypeSinkGuard`, anchor hardening, with the
  `unsafeDisableSanitize` switch drawn spanning exactly the sanitize floor and the sink guard
  (the span is the fact this diagram exists for; verify the switch's actual coverage against
  the render pipeline source before drawing). The order moves to the diagram; the whys and the
  allowlist details stay prose.
- [ ] **Step 2:** Confirm `configure-rendering.md` links here rather than duplicating (the
  contract's standing rule); add the link if absent.
- [ ] **Step 3:** Convention, budget, Vale, full gate. Commit.

### Task 7: `docs/extend/build-a-site-by-hand.md`

**Files:**
- Modify: `docs/extend/build-a-site-by-hand.md`

- [ ] **Step 1:** Author the milestone map at the top: the five milestones with what runs after
  each, the dev-backend fence drawn across milestones 2 through 4, the real-credentials swap at
  5. Shorten the intro's second paragraph and milestone 4's expectation-setting to a sentence
  pointing at the map. Milestone 5 links `architecture.md`'s write-path sequence rather than
  duplicating it.
- [ ] **Step 2:** Must-survive grep: the no-`svelte.config.js` fact and its doctor-skip
  consequence; the `__CAIRN_DEV_BUILD__` inlining rule; the `ORIGIN` rebake step. Convention,
  budget, Vale, full gate.
- [ ] **Step 3:** Commit.

### Task 8: `docs/extend/rotate-the-github-app-key.md` and `docs/extend/what-the-scaffold-wrote.md`

**Files:**
- Modify: `docs/extend/rotate-the-github-app-key.md`
- Modify: `docs/extend/what-the-scaffold-wrote.md`

- [ ] **Step 1:** Author the key-rotation timeline: the old and new keys' validity overlapping,
  the swap point marked. It replaces the narrative half of "Why there's no downtime window";
  the steps stay steps. Convention, budget.
- [ ] **Step 2:** Generate the scaffold directory tree by running the scaffold locally
  (`packages/create-cairn-site`'s scaffold path against a temp dir), and place the real tree as
  a plain fenced block at the top of `what-the-scaffold-wrote.md`. Never hand-type the tree;
  a generated tree is the page's no-invented-output analogue.
- [ ] **Step 3:** Must-survive grep: the `APP_DB`/`migrations-app/` rows and the
  `probe-craft/` disclosure. Vale, full gate.
- [ ] **Step 4:** Commit.

### Task 9: the admin pages: `docs/admin/before-you-start.md` and `docs/admin/own-your-domain.md`

**Files:**
- Modify: `docs/admin/before-you-start.md`
- Modify: `docs/admin/own-your-domain.md`

- [ ] **Step 1:** Author the five-asset ownership map at the top of "What you end up owning":
  the content repository, the GitHub App, the Cloudflare account (one Worker, two databases,
  one bucket), the domain, and the sign-in database, each labeled as yours, the tool drawn as
  connector, never owner. The five bullets shorten to about a line each; connective clauses
  move into labels. This is a marquee diagram: flag it for Geoff's polish read at the merge
  gate.
- [ ] **Step 2:** Must-survive grep (`before-you-start.md`): the leave-with-a-clone paragraph;
  the "where your content lives on GitHub" gloss; every fact in "What it costs" stays entirely
  textual.
- [ ] **Step 3:** Author the one-domain-two-jobs diagram in `own-your-domain.md`'s "If this
  domain already has DNS records": one zone carrying the organization's existing mail records
  (unchanged) and cairn's own sending records (added at onboarding), the sign-in mail leaving
  from `no-reply@yourdomain`. The numbered conflation block shortens per the contract. The
  nameserver before/after diagram stays CUT (ruling 3); its prose stands.
- [ ] **Step 4:** Must-survive grep (`own-your-domain.md`): the stop-and-talk-to-whoever-runs-
  your-DNS branch, verbatim in force; the token-scope warning stays a warning in words.
  Convention, budget, Vale, full gate.
- [ ] **Step 5:** Commit.

### Task 10: pass close

**Files:**
- Modify: `CHANGELOG.md` (an `## Unreleased` docs line)
- Modify: `docs/STATUS.md`, `ROADMAP.md` (at merge time, on `main`)

- [ ] **Step 1:** Run `code-simplifier` over `scripts/checks/check-visuals.mjs` (the pass's
  only code); apply and re-gate.
- [ ] **Step 2:** Fan out `cairn-register-editor` over each rewritten page; fold findings;
  re-run the full gate.
- [ ] **Step 3:** Verify every contract's must-survive list once more across the whole diff
  (grep per fact, per the fold-verification lesson in STATUS).
- [ ] **Step 4:** Push the branch and hand its name to the cairn-pub theme session: the ten
  authored diagrams are the theme's representative styling set. HOLD the merge.
- [ ] **Step 5 (at the merge gate, after the theme lands):** render every diagram page through
  themed cairn-pub, read each full page in the main loop, get Geoff's before/after on the two
  marquee diagrams, then merge, update STATUS/ROADMAP/CHANGELOG on `main`, and run the
  `cairn-pass` close ritual including the cold-start prep.

## Self-review notes

- Coverage: rulings 3's twelve survivors minus the save-publish loop (rides the editors
  rewrite) and the setup-journey diagram (rides the capture pass with `create-your-site.md`)
  equals the ten diagrams in Tasks 1 through 9, plus the Task 8 directory tree, which the
  rulings class as plain text. The five cuts: two are in-task edits (Tasks 3 and 4), three
  require no page change (`content-model.md`, `wire-the-delivery-surface.md`, the nameserver
  prose), consistent with ruling 3's dispositions.
- The `accTitle`/`accDescr` convention needs one render-proof on the cairn-pub side (the SVG
  must carry `<title>`/`<desc>`); that proof rides the theme landing and is noted in the
  merge-gate step. If mermaid's directives fail there, the fallback is the loader-side hidden
  description cairn-pub already ships, and the gate's fence check is the authoring contract
  either way.
- Deliverable count: ten diagrams, one tree, one gate script, nine page rewrites across two
  tracks. At the second in-flight task split, propose splitting the pass, per the standing
  sizing rule.
