# Docs-on-site pipeline: implementation plan

> **For agentic workers:** execute task-by-task via the repo's implementer dispatch flow
> (`cairn-implementer` for cairn-cms tasks, `site-implementer` for cairn-pub tasks); the
> main loop reviews each diff and confirms the full gate between dispatches.

**Goal:** /docs and /help render the published docs tree on cairn.pub with TOCs, fed by
docs shipped inside the npm package, with the three ratified engine additions published
as a minor release first.

**Spec:** `docs/superpowers/specs/2026-07-18-docs-on-site-pipeline-design.md` (ratified;
its decisions are binding on every task).

**Architecture:** three phases in strict order. Phase A adds the engine surface on a
feature worktree and publishes it (the site imports surface that must exist on the
registry first). Phase B builds the cairn-pub loader, routes, and page furniture against
the published version and deploys. Phase C closes the pass: docs, ROADMAP, STATUS,
memory, and the Topo next-pass prep.

## Global constraints

- The full cairn-cms gate per task: targeted tests, `npm run check` 0/0, `npm test` exit 0.
- Engine work on a feature worktree off `main` (`docs-on-site`); worktree gotchas apply
  (from-scratch showcase `npm install` before trusting a worktree e2e).
- No new engine surface beyond the spec's three items; tree walking and link rewriting
  stay site-side.
- TSDoc per the authoring charter; every new export gets its reference page
  (`check:reference` holds).
- CHANGELOG entries land under `## Unreleased` as each task finishes; the version number
  is derived only at the cut.
- cairn-pub deploys ride the one-check rule (main-loop full-page render read) and the
  five-viewport bar.

---

## Phase A: engine (cairn-cms, worktree `docs-on-site`)

### Task A1: heading collection on the renderer

**Files:** modify `src/lib/render/pipeline.ts` (+ a small collector plugin module beside
the other rehype plugins); test beside the existing pipeline tests; new reference page
for the addition; update the render reference page.

**Outcome:** the `createRenderer` result gains `renderDocument(content, opts)`, same
options as `renderMarkdown`, returning `{ html: string; headings: DocHeading[] }` where
`DocHeading = { id: string; text: string; depth: number }`. Headings are collected from
the final tree (after `rehypeSlug` and the site's own plugins), h1–h6, in document order,
with the plain-text content (backticks and inline markup flattened). `renderMarkdown` is
unchanged and stays the thin string form.

**Acceptance:** unit tests cover the shape, nested depths, inline-code headings, and the
duplicate-heading case (second occurrence gets the `-1` suffixed id, matching
github-slugger); `check:reference` passes with the new export documented.

### Task A2: the GitHub-slug contract test

**Files:** a dedicated test beside A1's; no production code expected.

**Outcome:** a test locks `renderDocument`'s heading ids to GitHub's slug algorithm over
representative corpus headings: backticked terms, punctuation (`?`, `.`, `/`, quotes),
mixed case, and the tutorial's real duplicate ("How it went" twice →
`how-it-went`/`how-it-went-1`). Cases are drawn from actual headings in
`docs/reference/` and `docs/tutorial/` and asserted against GitHub's known slugs. If any
case diverges, the fix is a pipeline configuration change, not a test adjustment; the
225 in-corpus anchors ride on this contract.

**Acceptance:** the test passes unmodified against A1's implementation, or the
divergence is fixed engine-side and documented in the task report.

### Task A3: ship the docs tree in the tarball

**Files:** modify `package.json` (`files`); extend the packaging check
(`check:package` or a small pack test) to assert the docs arms are present.

**Outcome:** the published tarball carries `docs/reference`, `docs/guides`,
`docs/explanation`, `docs/tutorial`, and `docs/README.md`, and does NOT carry
`docs/internal`, `docs/superpowers`, or `docs/STATUS.md`. A check asserts presence of
the four arm READMEs and absence of the internal trees in `npm pack --dry-run` output
(or json), so a future `files` edit cannot silently drop the docs.

**Acceptance:** the pack listing shows the arms; the check fails if an arm goes missing;
CHANGELOG notes the tarball addition and its approximate size cost.

### Task A4: `editor.supportContact` defaults to cairn.pub/help

**Files:** wherever the editor/support-contact config default resolves (locate it; it is
an existing documented seam); its tests; its reference page; CHANGELOG.

**Outcome:** when a site does not set `editor.supportContact`, it resolves to
`https://cairn.pub/help`; an explicit site value still wins; an explicit opt-out (if the
seam has one) still works. The reference page documents the new default.

**Acceptance:** tests cover default, override, and (if applicable) opt-out; CHANGELOG
carries a `Consumers must:`-adjacent note that the admin support link now has a default
destination.

### Task A5: gate, merge, push

Main loop: full gate on the worktree, `code-simplifier` over the changed engine code,
merge `docs-on-site` to `main`, push. CHANGELOG's `## Unreleased` window now carries
A1–A4.

### Task A6: release

Main loop via the `cairn-release` skill: verify the next number is free
(`npm view @glw907/cairn-cms versions --json`; expected 0.88.0 — a minor: new public
surface), finalize the window, cut with `gh release create --target main`, confirm the
publish workflow and that the registry serves the version and its tarball carries the
docs arms.

---

## Phase B: site (cairn-pub)

### Task B1: dependency bump

**Files:** `package.json`, lockfile.

**Outcome:** `@glw907/cairn-cms` at `^0.88.0` (the published A6 version), fresh install,
`npm run build` and `npm run check` green before any new code.

### Task B2: the docs loader

**Files:** create a `src/lib/docs/` module in cairn-pub (loader + link policy +
navigation derivation, split by responsibility); build-time tests or assertions per the
repo's idiom.

**Interfaces (produces, for B3):** an enumeration of every docs page keyed by route path
(`/docs/...` for the four arms; the editor-guide subset additionally under `/help/...`
per the guides index's editor grouping), each entry carrying: title (the page's H1),
rendered `html` and `headings` (via the site pipeline's `renderDocument`), breadcrumb
(arm + index), prev/next (the arm index's link order, which is the grouping's source of
truth), and source path (for an edit-on-GitHub link).

**Outcome:** the loader reads `node_modules/@glw907/cairn-cms/docs` at build time only.
Link policy per the spec: in-tree links → site routes with anchors preserved;
`examples/`, `internal/`, and repo-root files → GitHub blob URLs pinned at
`v<installed version>`; `cairn:`/`media:` mentions never auto-linked. A build-time link
check walks every rendered page: every in-tree href resolves to an enumerated route and
every fragment matches a collected heading id on the target page — this is the
225-anchor compatibility proof and it fails the build on any miss.

**Acceptance:** the link check passes over the full corpus; the duplicate-heading page
resolves both anchors; the mermaid pages and the two H4-bearing reference pages load
without error.

### Task B3: routes and page furniture

**Files:** create the `/docs/[...path]` route pair (+ `/docs` index) and the
`/help/[...guide]` route in cairn-pub's `(site)` group; TOC rail, breadcrumb, and
prev/next components in the site's component idiom; a lazy mermaid renderer component;
the `/docs` index page content (replacing the GitHub-link stub).

**Outcome:** every enumerated page prerenders (a render failure fails the build, never a
runtime 500); pages show title, breadcrumb, prose, TOC rail (h2/h3 from `headings`),
prev/next; the hand-adapted `/help` landing is preserved and now links into the rendered
editor guides; mermaid loads client-side only on pages whose content has a mermaid
fence; the new `/docs` index and any touched copy get the site-side register pass (the
killed specimens — "the four arms", "writing room" — do not survive). Styling follows
the site's existing chrome and the cairn theme; no new design language.

**Acceptance:** build prerenders the full corpus; `npm run check` green; spot renders of
one page per arm read correctly.

### Task B4: verification sweep

Main loop, workflow-assisted: the five-viewport matrix (320/390/768/1440/2560) over
representative pages (one per arm, the longest reference page, a mermaid page, the
/docs index, the /help landing), composed-at-extremes judgment, plus
`cairn-register-editor` over the rebuilt /docs and /help copy. Findings fold before
deploy.

### Task B5: deploy

Main loop: build, `wrangler deploy` (the route-sync auth error at the end is expected
and benign — verify the upload succeeded), live full-page render read of /docs, a
reference page, and /help (the one-check rule), then commit and push cairn-pub.

---

## Phase C: pass close (cairn-cms)

### Task C1: docs, roadmap, status, memory

Reference pages verified against `check:reference`; ROADMAP: the supportContact
candidate comes off, the docs-effectiveness Topo-era item annotated (search and the
upgrade page remain Topo-pass work); STATUS rewritten to the pass result and the next
action; the template-effort memory updated; the deploy-token zone-scope wrinkle recorded
as a follow-up watch item.

### Task C2: Topo next-pass prep

The ruled inspiration review (VitePress, Fumadocs, Mintlify as polish reference, with
fresh popularity data) run as a research fan-out; findings synthesized into a Topo
next-pass brief (what each system is beloved for, which devices Topo absorbs, the
Starlight-anatomy recap) plus mockup candidates for Geoff's async review. Banked under
`docs/internal/`, pointed at from STATUS.
