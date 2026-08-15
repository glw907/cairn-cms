# Docs Diagram-Pages Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (dispatch `cairn-implementer` per task; the conductor reviews each diff and verifies the full
> gate between dispatches). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the diagram-bearing extend and admin pages against their per-page contracts,
authoring the pass's eleven mermaid diagrams and the scaffold directory tree, and land the
authored-source visuals gate; the branch merges only after the cairn diagram theme lands in
cairn-pub and the merge-gate proofs pass.

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
- **Scope fence.** Only the pages named in tasks below. Transcript blocks are OUT everywhere:
  no recorded fixtures exist (verified 2026-08-15; see the ROADMAP transcript-gate entry), so
  `is-it-working.md` is untouched and `create-your-site.md` gets ONLY its setup-journey diagram
  (Task 9); the capture pass adds that page's transcripts later as a second bounded edit, a
  deliberate exception to one-rewrite-per-page adopted at the 2026-08-15 adversarial review so
  the admin track's spine page is not held hostage to an unscheduled capture run. The editors
  track is OUT (blocked on the live-reproduction seam). No new diagrams beyond the inventory;
  ruling 3's five cuts stay cut.
- **The SVG escalation path is CLOSED for this pass.** The adversarial review proved ruling 2's
  "an SVG still renders everywhere markdown does" false on the surface that matters: the
  engine's sanitize floor admits no `svg` tag, `check:package` rejects docs paths outside the
  four arms, and cairn-pub's loader copies no sibling assets. If the marquee polish read fails
  a themed-mermaid draft, the response is a separate scoped pass that first proves an SVG
  delivery path end to end, never an in-place swap during this pass.
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
  admin mount, delivery routes), the engine, and the three stores (git, D1, R2). **The export
  map is 18 subpaths, not the contract's stale four** (verified 2026-08-15), so the diagram
  draws the engine as functional GROUPS, not subpaths: core/adapter (the root barrel), the
  SvelteKit layer, the admin UI (components, toolkit, islands), rendering, delivery, and the
  auth/platform group. The caption states that these are groupings and the full export map
  lives on the reference index. Re-verify grouping membership against `package.json` `exports`
  at authoring time. Shorten the second paragraph's export enumeration per the contract; keep
  its reasoning sentence.
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
- Modify: `package.json` (a `check:visuals` script entry; there is NO aggregate `check` script
  to fold into — `"check"` is `svelte-check`, and the check family runs as individual steps)
- Modify: `.github/workflows/test.yml` (add a `- run: npm run check:visuals` step beside the
  sibling checks at the existing check-family steps; the PR-gating workflows, re-derived
  2026-08-15, are `create-site.yml`, `design.yml`, `e2e.yml`, `scaffold.yml`, `test.yml`)

**Interfaces:**
- Consumes: Task 1's two fences as the first non-vacuous input.
- Produces: `npm run check:visuals`, exit 0 clean / exit 1 with one line per violation.
- Scope: this gate checks AUTHORED-SOURCE properties only. Ruling 1's containment proof
  (diagram scrolls in its figure at 320/390, no page-level horizontal scroll) can only run
  where the docs render; it is owned by the merge gate's themed read in cairn-pub (Task 10),
  and cairn-pub currently has no browser harness, so it is a recorded manual check unless the
  theme pass adds one.

- [ ] **Step 1:** Write the failing test first: the checker over a fixture doc flags (a) a
  mermaid fence missing `accTitle` or `accDescr`, (b) a fence whose next non-blank line is not
  an emphasis-paragraph caption (the concrete caption form the register's Visuals section now
  states), (c) a markdown image with empty alt (`![](...)`) — the decorative form, per the
  register, is an HTML `<img alt="" ...>` so the emptiness is visibly deliberate, and markdown
  image syntax always carries real alt, (d) alt text over 150 characters; and passes a
  compliant fixture.
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
- [ ] **Step 3:** Must-survive grep, in the page's own hedged form: "Every step **that refuses
  a request** logs" a named `guard.rejected` reason — the session resolve (step six) redirects
  to `/admin/login` WITHOUT logging (verified in `src/lib/sveltekit/guard.ts`), so the ordered
  list must not attach a reason to item six. Use the real reason strings from the source (the
  dev tripwire's is `dev_backend_in_prod`, not "dev"). Convention, caption, budget, Vale, full
  gate.
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
- [ ] **Step 3:** Must-survive grep: the ADAPTER member is `media`, scoped to adapter-facing
  labels only — the composed runtime member really is `assets` (`compose.ts`), and
  `architecture.md` legitimately names `AssetConfig`, so a repo-wide never-`assets` grep
  false-positives; the manifests' different keying (concept-and-id versus content hash) in the
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
- [ ] **Step 2:** The cross-branch index's strict failure (`buildReferenceIndex(...,
  { strict: true })`) is real in the source but NOT currently stated on the page, so the
  diagram would introduce it: state it in body text too (the two-part alternative requires the
  essential information in prose, not only in the drawing).
- [ ] **Step 3:** Must-survive grep: the byte-preserving rename fact; the
  build-gate-is-the-only-backstop sentence. Convention, budget, Vale, full gate.
- [ ] **Step 4:** Commit.

### Task 6: `docs/extend/render-safety.md`

**Files:**
- Modify: `docs/extend/render-safety.md`
- Modify: `docs/extend/configure-rendering.md` (the link in step 2 does not exist today;
  verified 2026-08-15)

- [ ] **Step 1:** Author the pipeline-order diagram in the VERIFIED source order
  (`src/lib/render/pipeline.ts`): parse, `rehype-raw`, the sanitize floor, component `build()`
  dispatch, slug/task-list/highlight, **anchor hardening (`rehypeAnchorRel`), THEN
  `rehypeSinkGuard`**, then table-scroll and site plugins. The contract's "sink guard, then
  anchor hardening" order is wrong. The `unsafeDisableSanitize` switch spans exactly the
  sanitize floor and the sink guard (verified). Draw the span with a flowchart `subgraph`. The
  order moves to the diagram; the whys and allowlist details stay prose.
- [ ] **Step 2:** Fix the page's own latent contradiction while rewriting: the shipped text
  says both that anchor `rel` forcing is "the last rehype step before a site's own additional
  plugins run" and that "`rehypeSinkGuard` runs last"; the first claim is false (sink guard and
  table-scroll follow it). The diagram and prose must agree with the source.
- [ ] **Step 3:** Add the `configure-rendering.md` link to this page's pipeline diagram (the
  contract asserts it exists; it does not).
- [ ] **Step 4:** Convention, budget, Vale, full gate. Commit.

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

- [ ] **Step 1:** Author the key-rotation overlap as a **gantt chart** (mermaid's `timeline`
  type cannot draw two overlapping validity bars and its `accTitle`/`accDescr` support is
  unconfirmed; gantt supports both, verified 2026-08-15): two overlapping bars with a milestone
  diamond at the swap point. It replaces the narrative half of "Why there's no downtime
  window"; the steps stay steps. Gantt carries known narrow-width quirks upstream, so the
  merge-gate 320/390 read checks this diagram specifically; the stated fallback if it fails
  there is a flowchart-based two-row representation, not a wider gantt. Convention, budget.
- [ ] **Step 2:** Generate the scaffold directory tree by running the scaffold locally: bake
  first with `node scripts/bake-template.mjs --to <tmp> --dev-spec '^0.1.0'` (the bake exits 2
  without `--dev-spec`; verified), then run `scaffold()` against a temp dir. Never hand-type
  the tree. Two fidelity notes: (a) a locally generated tree shows `.gitignore` and
  `.gitattributes`, which a tarball-installed scaffold currently does NOT ship (the standing
  release-one defect); since the docs ship at release one WITH that fix, keep those entries and
  add a `// re-verify at merge` note in the task log, and re-generate the tree at the merge
  gate if the fix has landed by then. (b) The generated tree carries entries the page's
  per-file map never lists (`tsconfig.json`, `README.md`, `scripts/`, `src/app.html`,
  `src/app.d.ts`, `src/hooks.server.ts`, `src/params/`, `src/chassis/`): do not grow the map;
  state in the map's intro that the tree is complete and the map covers the cairn-specific
  entries.
- [ ] **Step 3:** Must-survive grep: the `APP_DB`/`migrations-app/` rows and the
  `probe-craft/` disclosure (verified still emitted by the template). Vale, full gate.
- [ ] **Step 4:** Commit.

### Task 9: the admin pages: `docs/admin/before-you-start.md`, `docs/admin/own-your-domain.md`, and `docs/admin/create-your-site.md`

**Files:**
- Modify: `docs/admin/before-you-start.md`
- Modify: `docs/admin/own-your-domain.md`
- Modify: `docs/admin/create-your-site.md` (the setup-journey diagram ONLY; transcripts stay
  out per the scope fence)

- [ ] **Step 1:** Author the five-asset ownership map at the top of "What you end up owning":
  the content repository, the GitHub App, the Cloudflare account (one Worker, two databases,
  one bucket), the domain, and the sign-in database, each labeled as yours, the tool drawn as
  connector, never owner. The five bullets shorten to about a line each; connective clauses
  move into labels. This is a marquee diagram: flag it for Geoff's polish read at the merge
  gate.
- [ ] **Step 2:** Must-survive grep (`before-you-start.md`), against the page's ACTUAL text,
  which paraphrase-greps miss: "Cloning that repository is enough to leave with everything"
  (note the participle; grepping "clone" misses it); the "where your content lives on GitHub"
  gloss; every fact in "What it costs" stays entirely textual.
- [ ] **Step 3:** Author the one-domain-two-jobs diagram in `own-your-domain.md`'s "If this
  domain already has DNS records": one zone carrying the organization's existing mail records
  (unchanged) and cairn's own sending records (added at onboarding), the sign-in mail leaving
  from `no-reply@yourdomain`. The numbered conflation block shortens per the contract. The
  nameserver before/after diagram stays CUT (ruling 3); its prose stands.
- [ ] **Step 4:** Must-survive grep (`own-your-domain.md`), against the page's ACTUAL text:
  "If you don't personally control this domain's DNS" (the shipped phrasing; "stop and talk"
  is a record-side paraphrase that greps empty), kept in force; the token-scope warning stays a
  warning in words. Convention, budget, Vale, full gate.
- [ ] **Step 5:** Author the setup-journey diagram in `create-your-site.md`: scaffold, GitHub,
  Cloudflare, sign-in, with the browser moments flagged on the path (a flowchart, using a
  `subgraph` if a stage grouping needs it). *Caption carries* the conditional count ("Three or
  four, depending on that middle one"). Touch nothing else on the page: no paraphrase-to-
  transcript conversion, no other prose edits; the capture pass owns the rest.
- [ ] **Step 6:** Must-survive grep (`create-your-site.md`): the GitHub and Cloudflare account
  prerequisites with the signs-in-doesn't-create sentence; the App-permissions disclosure
  ("including deleting it"); the "Getting back in" section untouched. Convention, budget, Vale,
  full gate.
- [ ] **Step 7:** Commit.

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
- [ ] **Step 4:** Push the branch and hand its name to the cairn-pub theme session: the eleven
  authored diagrams are the theme's representative styling set. The handoff carries three
  REQUIREMENTS for the theme side, found at the 2026-08-15 adversarial review:
  (a) `DocsMermaid.svelte`'s `describeForAssistiveTech()` currently OVERRIDES authored
  `accTitle`/`accDescr` unconditionally (`aria-label="Diagram"` plus raw-source
  `aria-describedby` outrank the SVG's own `<title>`/`<desc>`), so it must honor authored
  directives when present and fall back to the generic label only when absent, with a unit
  test; (b) ruling 1's containment proof (in-figure scroll at 320/390, no page-level
  horizontal scroll) is owned by cairn-pub, as a browser check if the theme pass adds one or
  as a recorded manual check at this merge gate otherwise; (c) the theme styles the authoring
  convention as shipped: `accTitle`/`accDescr` in the fence, one emphasis-paragraph caption
  after it. HOLD the merge.
- [ ] **Step 5 (at the merge gate, after the theme lands):** pack this branch and install the
  tarball into cairn-pub locally (its pin is exact, so the loader otherwise reads the old
  payload; Pass D's 81-page proof is the precedent), render every diagram page through themed
  cairn-pub, and read each full page in the main loop. Verify the accessibility handoff
  end-to-end on one rendered diagram: the SVG's computed accessible name is the authored
  `accTitle`, not "Diagram", and its description is the authored `accDescr`, not raw source.
  Check the gantt (Task 8) at 320/390 specifically. Get Geoff's before/after on the two
  marquee diagrams.
- [ ] **Step 6 (merge hygiene):** the branch was authored against a `main` that may have
  moved: re-run the full must-survive grep set, and re-verify the four code-derived diagrams
  (export groups, guard order, pipeline order, D1/manifest facts) against `main`'s CURRENT
  source, not the state they were authored from. Then merge, update STATUS/ROADMAP/CHANGELOG
  on `main`, and run the `cairn-pass` close ritual including the cold-start prep. The capture
  pass branches from `main` only after this merge.

## Self-review notes (amended at the 2026-08-15 adversarial review)

- Coverage: ruling 3's twelve survivors minus the save-publish loop (rides the editors
  rewrite) equals the eleven diagrams in Tasks 1 through 9 (the setup-journey diagram moved
  INTO this pass at the review; only its page's transcripts wait for the capture pass), plus
  the Task 8 directory tree, which the rulings class as plain text. The five cuts: two are
  in-task edits (Tasks 3 and 4), three require no page change (`content-model.md`,
  `wire-the-delivery-surface.md`, the nameserver prose), consistent with ruling 3's
  dispositions.
- The accessibility handoff is a verified defect, not a deferred proof: cairn-pub's shim
  discards authored `accTitle`/`accDescr` today, so the Task 10 handoff requirement (a) and
  the merge-gate end-to-end check are load-bearing, and the "loader-side fallback" is not an
  acceptable end state (it announces every diagram as "Diagram" described by raw source).
- The adversarial review's full reports are in the session record; the corrections they forced
  are folded inline above (export map 18 not 4; no aggregate `check` script; pipeline order
  anchor-then-sink-guard; the guard's sixth step logs nothing; gantt not timeline; the bake's
  `--dev-spec` requirement; the two paraphrase greps; the SVG escalation closure).
- Deliverable count: eleven diagrams, one tree, one gate script, eleven pages touched (ten
  rewrites plus `configure-rendering.md`'s link) across two tracks. At the second in-flight
  task split, propose splitting the pass, per the standing sizing rule.
