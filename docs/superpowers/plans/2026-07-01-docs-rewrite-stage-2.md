# Docs Rewrite Stage 2 Implementation Plan

> **For agentic workers:** Orchestrated from the main loop. The main loop drafts the
> voice-setting front doors itself; structured pages go to `cairn-implementer` dispatches with
> per-page briefs; the page fan-outs are workflow candidates at execution time (Geoff's
> standing opt-in covers suggesting them). Tasks specify outcomes, constraints, and acceptance
> criteria.

**Goal:** Execute the approved docs IA
(`docs/superpowers/specs/2026-07-01-docs-ia-design.md`) against the frozen contract: the
snippet gate first, then the rewrite in the IA's writing order, until the shipped tree matches
the IA's page inventory exactly.

**Sequencing:** Executes after the code polish pass merges (the docs snippets imitate the
polished idiom). Worktree off `main` (suggested branch: `docs-rewrite-1`).

## Global constraints

- **Standards:** Google developer style on all published pages and repo-root docs (Vale
  enforces; extend `.vale.ini` to cover `README.md` in Task 1). The friendly register per the
  IA: second person; callouts framed as the reader's next question, not generic Note/Warning;
  one celebratory line at each genuine tutorial payoff; functional emoji vocabulary of at most
  three marks, or none. Warmth concentrates at on-ramps and payoffs; reference stays precise.
- **Diagrams:** Mermaid only; every diagram carries the dark-mode init directive and adjacent
  prose that survives a failed render. The IA's diagram inventory is the complete set; no
  drive-by diagrams. Screenshots only in `set-up-the-github-app.md`.
- **Topo portability:** relative links within `docs/`, no GitHub-only rendering assumptions,
  assets referenced by relative path.
- **Authorship split (token economy + voice):** the main loop drafts `README.md`,
  `docs/README.md`, `explanation/why-cairn.md`, and the tutorial's framing prose (the
  voice-setting surfaces); implementer dispatches draft the structured pages against per-page
  briefs and the front doors as register exemplars. Every dispatch cites the IA and the two
  register paragraphs above verbatim.
- **Gates, throughout:** `check:docs`, `check:reference`, `check:reference:signatures`,
  `check:prose` where it applies, Vale error-tier clean, and the new snippet gate from Task 1.
  A page is not done until its inbound links are re-pointed (`grep -rn` the tree per the
  drift-hunting convention).
- No engine code changes except the snippet-gate script and `.vale.ini`; a docs defect that
  needs an engine fix files to STATUS carry-forwards instead.
- Conventional commits; one commit per task or coherent page group; docs-only commits skip
  `code-simplifier`.
- **Outline gate for the open-shape documents (Geoff, 2026-07-02).** Before any prose, the
  ~twelve documents whose structure is genuinely open get heading-plus-one-liner outlines:
  the two front doors and `why-cairn` (Task 2), the tutorial's milestone-level outline with
  payoff and diagram placements (Task 3), the seven new/replaced pages (Task 4's three new
  guides and the thin upgrade guide; Task 7's `docs-maintenance` and showcase README), and
  the two explanation restructures (Task 5's `security-model` and `media-storage`). All
  outlines are reviewed in ONE batched adversarial pass (a single Opus reviewer against the
  IA inventory, the comparables' leanness lessons, and the register rules — including
  cross-page duplication, the failure mode that produced the render-safety overlap), the
  main loop rules on findings, and only then does prose begin. Survivor pages and
  defect-list rewrites skip the gate; their shapes are already settled.

---

### Task 1: The snippet gate, born catching real defects

**Dispatch:** `cairn-implementer`.

**Outcome:** `npm run check:snippets` extracts fenced TypeScript/Svelte code blocks from
`docs/tutorial`, `docs/guides`, and `docs/reference` and typechecks them against the built
package. Mechanism is the implementer's (extraction script + a generated typecheck project is
the expected shape), with these requirements: an explicit per-block opt-out annotation for
deliberate fragments (documented in the script header and used sparingly — a page full of
opt-outs defeats the gate); the gate wired into CI alongside the other doc gates; and a
demonstration in the report that it catches both defect classes the audit found (a
retired-dep snippet and a wrong-signature snippet — reproduce each transiently, watch it fail,
revert). Getting the gate green requires fixing the tutorial's two mechanical blockers in this
task (the `createCairnAdmin` deps shape; the five-file admin mount snippet) — the tutorial's
full rewrite is Task 3; this task fixes only what the gate catches.

**Acceptance:** gate red on the two demonstrations, green on the corpus after the mechanical
fixes; CI updated; `.vale.ini` extended to `README.md`; full doc-gate suite green.

- [ ] Gate mechanism test-first, demonstrations, mechanical tutorial fixes, CI wiring, commit

### Task 2: Front doors (main loop)

**Files:** `README.md`, `docs/README.md`, `docs/explanation/why-cairn.md` (new).

**Outcome:** The three voice-setting pages, drafted in the main loop. README: the npm and
GitHub front door — positioning paragraphs survive in substance (the corpus graded them the
strongest asset), stale `ecnordic.ski` fixed, funnels to the docs rather than inlining them,
no ToC. `docs/README.md`: audience routing in the first paragraph (developer vs editor), the
reading path, the vocabulary section (six-to-eight terms). `why-cairn.md`: the positioning
page — who cairn is for and not for, absorbing the public-worthy content of
`docs/internal/what-cairn-is-and-is-not.md` (which stays, internal-facing, but published
pages stop linking into it).

**Acceptance:** all three pass the gates; no published page links into `docs/internal/`
after this task (grep-proven); `prose-voice-reviewer` findings on these three folded in
before the task commits (these pages are the register exemplars every dispatch cites, so
they get their voice review early, not at pass end).

- [ ] Draft, voice-review, fix inbound links, commit

### Task 3: The tutorial

**Dispatch:** `cairn-implementer`, with the main loop supplying the framing prose and
reviewing closely.

**Outcome:** `build-your-first-cairn-site.md` rewritten on its surviving ten-milestone
skeleton: every snippet current against the frozen surface (the gate now proves this), the
bindings idiom (`CairnPlatformBindings`), correct scaffolder status with the IA's
"fastest path" seam for the future quickstart link, payoff moments at first save, first
publish, and first deploy, and the save → holding branch → publish flow diagram placed at
the milestone where the model becomes real.

**Acceptance:** snippet gate green over the page; the register matches the front doors;
milestone structure intact; `docs/README.md`'s reading path points at it correctly.

- [ ] Brief, draft, main-loop voice pass, gates, commit

### Task 4: Developer guides — rewrites, replacements, and the three new pages

**Dispatch:** implementer dispatches (workflow candidate: the pages are independent).

**Outcome:** (a) The rewrite-source set fixed per the corpus grades' per-page defect lists:
`define-an-adapter-and-schema` (the `githubApp(...)` and `defineConcept(...)` snippet
defects), `link-content-with-references` and `structured-fields` (defineConcept snippets;
structured-fields' explanation content moves to Task 5's merge),
`configure-auth-and-d1` (a public verify path replaces the two links into
`docs/internal/admin-smoke-test.md`), `deploy-to-cloudflare` (the five-file mount),
`rotate-the-github-app-key` (de-personalized secrets paths). (b) `upgrade-cairn.md` replaced
by the thin process guide per IA ruling 2 (the version-mirror content deleted; CHANGELOG is
the history). (c) New: `migrate-existing-content`, `add-authors` (the
declare-your-own-concept + `fields.reference` pattern, framed as the answer to the "does
cairn support X?" class), `troubleshooting` (symptom → log event → fix, on the doctor and
`log-events.md`). (d) The guides index gains the For-developers / For-editors grouping (IA
ruling 1).

**Acceptance:** every page's defect list closed; the killed version-mirror actually gone;
new pages in the index; snippet gate and doc gates green; register consistent with the
exemplars.

- [ ] Dispatch per page group, review diffs, gates, commit

### Task 5: Explanation consolidation

**Dispatch:** implementer dispatches with tight briefs; the security restructure reviewed by
the main loop against the auth-library research.

**Outcome:** The IA's arm reshape: `security-model.md` restructured per the ownership rule
(hub owns guarantee/residual/why per boundary; the duplicated render-safety section shrinks
to guarantee + residual + link), gaining the "cairn handles / your site handles" table, the
trust-boundary Mermaid diagram, and the closing disclosure pointer; `structured-fields.md`
merges into `content-model.md`; `media-storage.md` rescoped to why (reference-grade detail
moves to `reference/media.md`), gaining the bytes/reference split diagram; `data-tiers.md`
trimmed of the design-log flavor; `why-cairn.md` already landed in Task 2; the explanation
index updated; `docs/internal/extending-developer-lens.md`'s stale baseline section
refreshed (internal, but carried by the IA).

**Acceptance:** nine pages exactly, per the IA inventory; the render-safety duplication gone
(grep-proven); diagrams carry the dark-mode directive and adjacent prose; gates green.

- [ ] Dispatch, main-loop review of the security restructure, gates, commit

### Task 6: Reference restructures and the editor-guides register sweep

**Dispatch:** implementer dispatches.

**Outcome:** `components.md`'s MarkdownEditor wiring-props wall becomes a table;
`sveltekit.md` reorganized internally (clear per-factory sections; still one page);
`log-events.md` prose trimmed. The five editor guides swept for register consistency against
the front-door exemplars (they graded strong; this is a polish, not a rewrite). The
For-editors group lands in the guides index if Task 4 did not already place it.

**Acceptance:** `check:reference` + signatures green (restructures must not break the
name/tier/signature anchors); the wiring-props table carries every prop the current page
lists; editor guides read in one voice.

- [ ] Dispatch, gates, commit

### Task 7: Repo health, kills, the staleness sweep, and pass consolidation

**Outcome:** `examples/showcase/README.md` (new, short: the Wayfinder template and the
tutorial's companion); the stray `docs/cairn-dx-feedback-2026-06-09-*.md` moves to
`docs/internal/history/`; **a repo-wide stale-docs sweep** (Geoff, 2026-07-02): every file
under `docs/internal/` (and any doc outside the published arms) is graded current, superseded,
or history — superseded design docs move to `docs/internal/history/` per the established
archive convention; internal docs whose public-worthy content the rewrite absorbed (starting
with `what-cairn-is-and-is-not.md` → `why-cairn.md`) gain a one-line pointer header naming
their successor; every internal doc that published pages used to link into is either public
now or unreferenced; the friction log is pruned of items this pass resolves. Exempt by
convention: `docs/superpowers/` plans and specs, post-mortems, and everything already under
`history/` — those are write-once records, not staleness. The sweep is graded work
(implementer inventories and proposes, main loop rules on each disposition), not a bulk
delete; ROADMAP updates — the docs-rewrite Next entry marked done and
removed, the community-file triggers filed (CONTRIBUTING + templates when PRs are solicited;
CODE_OF_CONDUCT when a community space exists; the SECURITY.md go-public toggle+trim as a
timed item on the go-public pass); CHANGELOG entry under `## Unreleased` (docs overhaul,
no `Consumers must:`); the friction log's resolved docs items closed. Then the `cairn-pass`
end ritual for a docs pass: full doc-gate suite plus the snippet gate, a
`prose-voice-reviewer` fan-out over the pass's pages, post-mortem with both budget numbers,
STATUS roll, merge decision.

**Also in this task — the standing hygiene model (Geoff, 2026-07-02: "once these docs are
built, they need to stay up-to-date"):** ship `docs/internal/docs-maintenance.md`, the short
doc that makes docs freshness a system rather than an intention, with three layers stated
plainly: (1) the machine layer — the full gate inventory and what each catches
(`check:reference` + tiers + reverse stale-name, `check:reference:signatures`,
`check:snippets`, `check:docs`, `check:surface`, Vale), which after this pass covers names,
signatures, code blocks, links, and tiers; (2) the pass layer — the existing
docs-is-a-pass-dimension convention (a change is not done until its docs match; grep for the
old name; prune ROADMAP and the friction log as you go), restated as the one human rule the
gates cannot replace; (3) the drift layer — semantic prose drift is the one thing neither
gates nor pass discipline catches (a claim that was true when written and quietly stopped
being true), so pass end creates a **monthly docs-freshness routine** (schedule skill, cloud
agent, Sonnet): sample three published pages per run, adversarially fact-check every claim
against the current code, report only confirmed drift with file:line evidence, and
self-report "no drift" in one line otherwise. The Topo-era additions (docs-build link gate in
CI, llms.txt regeneration) stay in the IA's constraints ledger and join this doc when Topo
lands.

**Acceptance:** the shipped tree matches the IA inventory exactly — every inventory page
exists and does its stated job, every kill is gone (this is the pass's definition of done);
all gates green; ROADMAP and friction log consistent; `docs-maintenance.md` shipped and the
freshness routine created and recorded there by id.

- [ ] Repo-health files, kills, ROADMAP/CHANGELOG, ritual, merge decision

---

## Self-review notes

- Task 1 fixes two tutorial snippets that Task 3 then rewrites; this is deliberate (the gate
  cannot land red, and Task 3's rewrite is voice-and-structure work on a mechanically-correct
  base), stated here so the overlap reads as sequencing, not duplication.
- SECURITY.md's rewrite is intentionally NOT in this pass: the IA times it to the go-public
  flip (the toggle cannot be enabled while private); Task 7 files the trigger.
- The quickstart is intentionally absent (IA ruling 3); Task 3's "fastest path" seam is its
  future mount point.
