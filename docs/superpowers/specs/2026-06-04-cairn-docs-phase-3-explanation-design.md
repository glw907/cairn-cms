# Documentation Initiative Phase 3 design spec: the Explanation arm

> Design spec. Authored 2026-06-04. Part of the cairn-cms documentation initiative
> (`docs/superpowers/specs/2026-06-04-cairn-docs-initiative-design.md`). Audience for the docs being
> built: external adopters who install `@glw907/cairn-cms` and build their own sites. Delivery
> surface: markdown in-repo, rendered on GitHub and npm. No hosted docs site.

## Goal

Give an external adopter the understanding-oriented arm of the docs: four pages under
`docs/explanation/` that explain how cairn works and why, each linking to the Phase 2 reference for
the exact API surface. The arm runs on `main`, publishes nothing, carries no version bump, and
touches no engine code.

## Why this arm, now

Phase 2 landed the Reference arm, which answers "what is the exact surface." A reference page tells a
reader the signature of `composeRuntime`, not why the runtime and delivery permalinks derive from one
shared site config. Explanation is the arm that carries the design reasoning, the threat model, and
the rules that place a new decision. Until now that reasoning has lived scattered across five design
specs, the functional spec, the internal `ARCHITECTURE.md`, and the cairn memories. This arm becomes
the first single, current, public statement of the architecture.

## Organizing principle: explain and link

The arm follows the Diátaxis rule that keeps the four modes distinct and cross-links between them
rather than merging them on a page. An explanation page carries the why. It links the Phase 2
reference for an exact signature and never restates one. Where a detailed behavioral doc already
exists, the explanation page explains the reasoning and links the detail rather than absorbing it.
The worked example: `security-model.md` gives the render-safety threat model and the guarantee, then
links `render-sanitize-floor.md` for the keep, strip, and rewrite detail.

Public explanation pages stay self-contained. They link the reference pages and each other. They do
not make the `docs/superpowers/` design specs required reading; a sparse "design history" pointer is
the most an explanation page carries into that tree.

## The page set

Four pages plus an index, under `docs/explanation/`.

```
docs/explanation/
  architecture.md     the layered model, the engine/site line, the commit/publish flow,
                      the render-pipeline shape, distribution and versioning
  data-tiers.md       where each kind of state lives (git vs D1)   [relocated from data-architecture.md]
  security-model.md   auth, GitHub-App commit trust, render safety, origin and CSRF
  content-model.md    fixed concepts, URL identity, schema-as-truth, the content graph
  README.md           the arm index, mirrors reference/README.md
```

Three pages are new. `data-tiers.md` is the existing `docs/data-architecture.md`, relocated and
lightly refreshed, per the initiative spec.

## Per-page content

### architecture.md (new)

What cairn is, then the layered model, the engine/site line, and the seams. The seams are the adapter
contract, the slug codec, the frontmatter schema, the `render` method, and the `CairnExtension` seam.
The commit/publish flow follows: an editor save commits to `main` through the GitHub App (committer
`cairn-cms[bot]`, author the editor), which auto-deploys. A brief render-pipeline shape (markdown
through the unified pipeline, the component registry dispatch, the sanitize floor) links
`security-model.md` for the sanitize floor. The page closes
with distribution and versioning (the npm package, `0.x`, the subpath exports, a consumer pinning a
range). Two Mermaid diagrams: the layered model and the commit/publish flow. Source material: internal
`ARCHITECTURE.md`, `creating-a-cairn-site.md`, the functional spec.

### data-tiers.md (relocated and refreshed)

The governing test that places a kind of state, the three tiers (markdown content in git;
content-derived build-read structure in git; runtime admin state in D1), and the worked precedents.
The page is already good, so the refresh confirms it against the current engine (the content-graph
manifest and the editor allowlist are already covered) and repoints inbound links. `git mv` preserves
history.

### security-model.md (new)

The threat model and the design, in four parts.

- **Auth.** Self-owned magic-link login: single-use atomic D1 tokens, opaque D1 session rows, the
  `__Host-` cookie, owner and editor roles, the never-remove-the-last-owner rule, the per-email
  cooldown, the origin guard. Why magic-link: an editor needs no GitHub account and no password. The
  one clarifying rejected alternative is KV, because single-use enforcement needs the atomicity D1
  gives and KV's eventual consistency does not.
- **GitHub-App commit trust.** The bot committer and the editor author, the App's scoped permissions,
  and the PKCS#1-to-PKCS#8 key handling. Why a GitHub App rather than a personal access token.
- **Render safety.** The threat (author markdown carries raw HTML, delivered with `{@html}`), the
  guarantee (the sanitize floor on a GitHub-lineage allowlist, extend-only, the developer-only
  `unsafeDisableSanitize` escape), and a link to `render-sanitize-floor.md` for the detail. The page
  states the documented residual plainly. A component `build()` that routes a directive attribute
  value into an `href`, `src`, or `style` sink is not sanitized. If writing this section shows the
  sink is broader than site-developer-controlled code, escalate it to the engine-hardening gate
  sooner (see the release-gate note below).
- **Origin and CSRF.** The origin check on form actions.

`SECURITY.md` repoints its render-and-auth-detail link here.

### content-model.md (new)

How content is modeled, in four parts.

- **Fixed concepts, not generic collections.** Posts and Pages as first-class concepts, multiplicity
  by distinct concept. The clarifying rejected alternative is the open-ended `collections[]` array
  that an earlier design carried and dropped.
- **URL identity.** The id is the full stem, the slug is the date-stripped stem, the date is
  frontmatter-canonical, and `datePrefix` is per-concept. The URL policy lives in the YAML site config
  and a site-level catch-all `byPermalink` route serves it. The page notes that this spreads one URL
  across three places, a complexity the diagram earns.
- **Schema as the source of truth.** One `defineFields` declaration drives the editor form, the
  validator, and the inferred frontmatter type, with Standard Schema conformance.
- **The content graph.** Files are the truth, the manifest is the build-verified projection. The
  `cairn:<concept>/<id>` token gives rot-proof internal links (not wikilinks), the editor offers a
  picker, and delete and rename stay safe through atomic content-plus-manifest commits with a
  build-fail backstop. Why the manifest lives in git and not D1 links `data-tiers.md`. An optional
  third Mermaid diagram (files to manifest to resolver) sits here if the diagram budget allows.

## Diagrams

Two to three Mermaid diagrams total across the arm. GitHub renders Mermaid natively. The anchors are
the layered model and the commit/publish flow in `architecture.md`; a third in `content-model.md` or
`data-tiers.md` is optional. Diagrams have no accuracy gate, so the arm stays prose-first and a diagram
appears only where it clearly beats prose.

## Depth

Each page explains how the design works and the reasoning behind it, and names the one rejected
alternative where it clarifies the choice. The arm carries no full decision ledger. The internal
`ARCHITECTURE-CRITIQUE.md` and the design specs stay internal history.

## Mechanics

- **The relocation.** `git mv docs/data-architecture.md docs/explanation/data-tiers.md`, a light
  refresh, and repoint every referrer. Drop `data-architecture.md` from the `docs/README.md` "Current
  pages" list.
- **The index flip.** Add `docs/explanation/README.md`, the arm index. Flip the Explanation line in
  `docs/README.md` from the "`data-architecture.md` is the current writeup until the arm lands"
  placeholder to the explanation index. Mirrors Phase 2's final task.
- **SECURITY.md.** Confirm or repoint its detail link to `explanation/security-model.md`.
- **Functional-spec reconciliation.** When `architecture.md` lands, add a one-line pointer from the
  functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`) marking the
  explanation arm as the current architecture statement and the spec as the locked design record with
  known drift (it predates the Carta-to-CodeMirror swap and the `renderPreview`-to-`render` rename).
  This keeps the two from competing as the current architecture source.

## Quality gates per page

The page gate is the docs gate, not the unit suite, because the arm changes no engine code.

- `prose-guard` clean of any blocking tell (the advisory tier is non-blocking and not chased).
- Every relative link resolves.
- Architecture and API claims cross-checked by hand against `src/lib`, the functional spec, and
  `examples/showcase`. There is no automated coverage gate here, because explanation has no typed
  surface to enumerate, unlike Reference.

## Docs-driven design feedback

The arm appends what it surfaces to `docs/internal/docs-friction-log.md`, per the initiative's
docs-as-design-review rule. The Phase 3 brainstorm already surfaced and captured three engine
candidates, now gated to land before the next `0.x` publish (`ROADMAP.md`, "Engine hardening before
the next release"): narrow the public export surface (also ahead of the scaffolder), harden render
attribute sinks, and consolidate the URL-identity model. The friction log holds the audit trail and a
project memory holds the gate.

## Tasks

Subagent-driven, one `cairn-implementer` per page, in order.

1. **data-tiers.md.** Relocate `data-architecture.md`, light refresh, repoint inbound links. Sonnet.
2. **architecture.md.** New, the synthesis page, two Mermaid diagrams. Opus.
3. **security-model.md.** New, the threat-model framing, repoint `SECURITY.md`. Opus.
4. **content-model.md.** New, the synthesis across the concept, URL, schema, and content-graph work.
   Opus.
5. **explanation/README.md and the wiring.** The arm index, the `docs/README.md` Explanation flip,
   drop `data-architecture.md` from Current pages, and the functional-spec reconciliation pointer.
   Sonnet. Runs last.

The three new synthesis pages run on Opus for the why framing and the rejected-alternative judgment.
The relocation and the wiring run on Sonnet.

## Out of scope

The guides and the tutorial arms (later phases). Any engine change, including the three release-gated
hardening candidates (separate engine passes after the docs initiative). A full decision ledger or a
public airing of the internal critique. Moving `render-sanitize-floor.md` into the Reference arm (a
friction-log candidate, not this phase). A hosted docs site.
