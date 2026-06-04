# Documentation Initiative Phase 4 design spec: the Guides arm

> Design spec. Authored 2026-06-04. Part of the cairn-cms documentation initiative
> (`docs/superpowers/specs/2026-06-04-cairn-docs-initiative-design.md`). Audience for the docs being
> built: external adopters who install `@glw907/cairn-cms` and build their own sites. Delivery
> surface: markdown in-repo, rendered on GitHub and npm. No hosted docs site.

## Goal

Give an external adopter the task-oriented arm of the docs: seven how-to guides under `docs/guides/`
that answer a returning adopter's "how do I do X" questions, each linking the Phase 2 reference for
the exact signatures and the Phase 3 explanation arm for the reasoning. The arm runs on `main`,
publishes nothing, carries no version bump, and touches no engine code.

## Why this arm, now

Phase 2 documents the surface and Phase 3 explains the design. Neither walks an adopter through a
concrete task. A how-to guide is the arm that answers "I have a SvelteKit site, how do I wire the
delivery surface" or "how do I set up the GitHub App so saves commit." The Guides arm depends on the
reference pages existing, because a guide links a signature rather than restating it, so it comes
after Reference and Explanation and before the Tutorial. The Tutorial (Phase 5) then teaches a first
build end to end and cites these guides rather than repeating them.

## The scaffolder constraint

P4, the `create-cairn-site` scaffolder, is queued right after the documentation initiative. It will
emit the GitHub App wiring, the auth and D1 setup, a starting adapter, and the Cloudflare deploy
config. Four guides describe exactly that setup, so writing full manual procedures now risks documenting
a flow the scaffolder reshapes. The decision (Geoff, this brainstorm): the backend-plumbing guides stay
lean and link the authoritative ops docs, and depth is added when P4 makes the wiring concrete. The
engine-surface guides, which a developer writes and keeps editing regardless of scaffolding, get full
treatment now.

A second constraint sets the evidence base. `examples/showcase` runs `@sveltejs/adapter-node`, so it
has no Cloudflare Worker, no D1 auth store, and no GitHub App commit loop. The showcase validates the
engine-surface guides (adapter, schema, rendering, delivery), and it cannot validate the
backend-plumbing guides. Those draw their facts from the two production sites (ecnordic-ski, 907-life),
the engine source, and the existing ops docs, and the accuracy cross-check runs against the source and
the credentials model in `CLAUDE.md`, not against a showcase build.

## The guide set

Seven guides, sorted into three tiers by evidence base and depth.

**Lean setup guides (link the ops docs, Sonnet).** Goal, prerequisites, numbered steps, a verify
check, and a "see also" that points at the authoritative ops doc for depth. They do not duplicate the
ops doc.

- `set-up-the-github-app.md`: register the App, install it, store the credentials (App ID, installation
  ID, the PKCS#1 private key), and confirm a commit. Links `github-app-key-rotation.md` for the key
  handling and `reference/core.md` for `appJwt`/`installationToken`/`commitFile`, and
  `explanation/security-model.md` for the commit-trust reasoning.
- `configure-auth-and-d1.md`: create the D1 database, bind it as `AUTH_DB`, apply the schema, and seed
  the first owner. Links `admin-smoke-test.md` for the session model and the local smoke, and
  `explanation/security-model.md` for the auth design.
- `deploy-to-cloudflare.md`: the Worker, the bindings and secrets, the build, and the commit-is-publish
  loop. Links `admin-route-structure.md` for the route shape and `explanation/architecture.md` for the
  commit/publish flow.

**Full engine-surface guides (validated against the showcase, Opus).** A worked example checked
against `examples/showcase`, linking the reference for signatures and the explanation arm for the why.

- `define-an-adapter-and-schema.md`: the adapter contract (`defineAdapter`), the concept set, the slug
  codec, and the schema (`defineFields`) as the source of truth for the form, the validator, and the
  inferred type. Links `reference/core.md` and `explanation/content-model.md`.
- `configure-rendering.md`: the renderer (`createRenderer`), the component registry, the directive
  grammar an author uses, and the sanitize floor. Links `reference/core.md`,
  `explanation/security-model.md`, and `render-sanitize-floor.md`.
- `wire-the-delivery-surface.md`: the delivery read model, the route loaders and response helpers, the
  catch-all `byPermalink` route, the feeds, and the manifest build wiring (the `cairnManifest()` Vite
  plugin and the `cairn-manifest` bin). Links `reference/delivery.md`, `reference/delivery-data.md`,
  `reference/vite.md`, and `explanation/content-model.md`.

**Relocated (Sonnet).**

- `upgrade-cairn.md`: `git mv` from the existing `docs/upgrading.md` with a light refresh, the same
  pattern Phase 3 used for `data-tiers`. The `0.x`-rename list stays; the refresh confirms each entry
  still reads true and fixes any relative path the move breaks.

## Format

Each guide is a Diátaxis how-to, not an explanation and not a reference dump:

- A one-line goal at the top: what the reader accomplishes.
- Prerequisites: what must already exist, and which sibling guide or the tutorial precedes it.
- Numbered task steps, practical and ordered.
- A verify step: how the reader confirms the task worked.
- A "see also" linking the reference for the exact surface and the explanation arm for the why.

A guide links the reference for a signature rather than restating it, and links the explanation arm
for reasoning rather than re-explaining. The guides stay distinct from the Phase 5 tutorial, which
teaches a first build once as a narrative; a guide answers one task for a reader who already has a
site.

## Mechanics

The arm adds a `docs/guides/` directory and an index, and it flips the `docs/README.md` How-to-guides
line from "Forthcoming" to the guides index. Task 1 relocates `upgrade-cairn.md` first so the later
guides and the index can link it. Tasks 2 through 7 are the six new guides; they cross-link each other,
and a forward link to a not-yet-written sibling resolves once that task lands, the within-phase pattern
Phase 3 used. Task 8 writes the index and flips the docs index, so it runs last. The relocation leaves
a transient dangling reference to `upgrading.md` in `docs/README.md` between Task 1 and Task 8, which
Task 8 clears; the phase-end ritual confirms none remain.

## Quality gates per guide

The page gate is the docs gate, the same as Phase 3, with one addition for the full guides:

- `prose-guard <guide>` shows no blocking tell. Advisory lines (passive, tricolon, burstiness,
  anaphora) are non-blocking; judge by the absence of a blocking tell, not the exit code.
- Every relative link in the guide resolves to a real file.
- The guide's steps and API claims are cross-checked by hand. The full guides cross-check their worked
  example against `examples/showcase`. The lean guides cross-check against the engine source, the named
  ops doc, and the credentials and bindings model in `CLAUDE.md`.

There is no automated coverage gate. Guides have no typed surface to enumerate, the same as Phase 3.
The arm changes no engine code and adds no test, so it does not run `npm run check` or `npm test`, and
no review subagent or `/admin` smoke applies.

## Docs-driven design feedback

Writing a guide is a design review. A setup step that needs too much tribal knowledge, an adapter shape
that is awkward to walk through, or a deploy flow with a sharp edge becomes a friction-log entry, held
from the developer or editor perspective. Findings land in `docs/internal/docs-friction-log.md` and feed
the ROADMAP and the backlog. A finding is a candidate for future work, not a blocker on the guide that
surfaced it. The lean setup guides are the most likely to surface scaffolder-shaped friction, which P4
then consumes.

## Tasks

1. Relocate `upgrade-cairn.md` from `docs/upgrading.md` (Sonnet).
2. `set-up-the-github-app.md`, lean (Sonnet).
3. `configure-auth-and-d1.md`, lean (Sonnet).
4. `define-an-adapter-and-schema.md`, full (Opus).
5. `configure-rendering.md`, full (Opus).
6. `wire-the-delivery-surface.md`, full (Opus).
7. `deploy-to-cloudflare.md`, lean (Sonnet).
8. `guides/README.md` index and the `docs/README.md` flip (Sonnet).

The order writes the relocation first and the index last. Tasks 2 through 7 follow the rough setup
sequence so most cross-links point at an already-written sibling.

## Out of scope

The Phase 5 tutorial (the end-to-end first build). Any engine change, including the three release-gated
hardening candidates. A version bump or publish. Full depth on the scaffolder-owned backend setup,
which the lean guides defer to P4. A hosted docs site.
