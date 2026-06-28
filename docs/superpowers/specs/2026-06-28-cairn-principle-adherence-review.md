# cairn principle-adherence review pass

Status: pass brief, 2026-06-28. Executable from clean context. Read the charter first: the
`## What cairn is` block in `CLAUDE.md` and `docs/internal/what-cairn-is-and-is-not.md`. This pass
reviews the **existing** engine through that charter lens and unwinds what doesn't fit. It does **not**
redesign extensibility (that is a separate, later pass).

## Why this pass exists

A developer-extensibility effort misread cairn's purpose and grew an identity/permissions substrate
(a principal model, scopes, an `admin`/`member` trust tier, an `authorize` callback, a session-minting
`signIn`, member login) into the engine. It was caught and the merge reverted (`f8359cc`); `main` is back
to a clean `0.76.0`. The corrected understanding is the charter. This pass makes the rest of the engine
answer to it: finish the unwind, audit the whole engine through the lens, and correct the docs that still
teach the wrong model.

## The lens (what the charter asks of every subsystem)

For each piece of the engine, ask:

1. **Is this cairn's job?** cairn owns managing markdown content and the editor/admin frame. Does this
   reach into the developer's domain (their functionality, actors, auth, data) instead of providing a
   thin seam for it?
2. **Is it the leanest form?** Is there over-built abstraction, speculative generality, or indirection
   whose only purpose is a cleaner-but-unneeded design? Is there code written for a design that is no
   longer needed (a rip-out candidate)?
3. **Does it model a domain actor or own domain functionality** that belongs to the developer?
4. **Does it own auth/identity/permissions beyond owner/editor + magic-link?**
5. **Is the public surface wider than it needs to be?** (exports, the adapter contract.)
6. **Is it a portability layer** abstracting across frameworks or hosts (forbidden, lean into
   Svelte + Cloudflare)?

## Part A — unwind the incorrect code

1. **Verify the phase-1 revert is complete.** Confirm no residual phase-1 artifacts remain (auth
   principal/scopes/tier/authorize/signIn, the `./extend` surface, `auth_rate`, the member machinery).
   `git diff` against the pre-phase-1 `0.76.0` tree; full gate green.
2. **Remove the pre-existing inert extension scaffolding.** It predates phase 1 and was reserved for a
   register-components-into-the-admin model the charter rejects. Remove `CairnExtension`, `AdminPanel`,
   `FieldTypeDef` (`src/lib/content/types.ts`), the `adminPanels`/`fieldTypes` collection in
   `composeRuntime` (`src/lib/content/compose.ts`) and the `CairnRuntime` slots, the hardcoded sidebar
   "extension" stubs (`src/lib/components/AdminLayout.svelte`'s `extensionGroups`), and any other
   reserved-but-inert register-components plumbing the grep surfaces. Drop the now-dead exports from the
   root barrel. Gate: `npm run check` 0/0, `npm test` exit 0, the doc/package gates green.

## Part B — whole-engine adherence audit (the centerpiece)

A multi-agent `Workflow` fans reviewers across the engine's subsystems; each reads the charter and its
slice and reports adherence and drift. Subsystems (one reviewer each, adjust to the real tree):

- `auth` + the SvelteKit guard/admin mount (`src/lib/auth`, `src/lib/sveltekit`)
- the content + adapter contract (`src/lib/content`: `defineAdapter`, `defineConcept`, the `fields.*`
  library, `compose`, `types`)
- render + delivery (`src/lib/render`, `src/lib/delivery`)
- islands (`src/lib/islands`)
- media (`src/lib/media`)
- the backend seam (`src/lib/github`, the `Backend` interface)
- diagnostics + doctor (`src/lib/diagnostics`, `src/lib/doctor`)
- the admin UI components (`src/lib/components`)
- the vite plugin + build glue (`src/lib/vite`), the log chokepoint (`src/lib/log`)
- the public export surface (`package.json` `exports` + the barrels)

**The critical calibration (do not skip).** The charter warns that a gap-hunting reviewer always finds
gaps and induces over-engineering. So this audit is inverted: it hunts **only for things to remove,
simplify, or narrow** toward lean. A finding that proposes **adding** anything, more abstraction, more
features, more defensive code, a new seam, is itself a charter violation and is rejected. Each reviewer is
told this explicitly.

**Guard against false positives.** Substantial does not mean over-built. cairn's deliberate, charter-aligned
investments, the `fields.*` library, islands, the R2 media stack, the GitHub-App backend, the Cloudflare-first
primitives, are core to its job and are **not** drift merely for being large. The verification step rejects
any finding that misreads a deliberate lean/opinionated choice as drift.

**Verification.** Each blocker/high finding is verified by independent skeptics asking: is this genuine
drift outside cairn's core job (or genuine speculative over-build), AND does it argue for *less*? Default
to rejecting; keep only findings that survive.

**Output.** A prioritized adherence report (committed to `docs/internal/`): what aligns, what drifts
(ranked by severity × confidence), each with the specific code and a concrete remove/simplify/narrow
recommendation.

## Part C — correct the wrong-model footprint in docs/memory

Most of these are done in the pre-bake; verify and finish:

- `docs/STATUS.md` — the immediate-next-action points at this pass (done in pre-bake).
- `ROADMAP.md` — the extensibility entry reflects the revert + this pass + the later lean redesign.
- `docs/internal/extending-developer-lens.md` and its memory — corrected toward the charter, or retired
  if the charter subsumes them; decide during the pass.
- The old extensibility design spec and the phase-1 plan carry a SUPERSEDED header pointing at the charter.
- `MEMORY.md` index line updated.

## Triage and gate

Fix in this pass: Part A removals, and the clear, high-confidence Part B drift (safe removals and
simplifications). Defer larger or lower-confidence findings to a triaged backlog in the report, some of
which inform the later lean redesign. Every code change clears the full gate (`npm run check` 0/0,
`npm test` exit 0, the doc/package gates). Run `code-simplifier` over changed code. Merge to `main`.
**No release.**

## Out of scope (but queued next)

The lean extensibility **redesign** (the new spec, plan, implementation) is a separate pass, not part of
this one. Do not start it here. But per Geoff (2026-06-28) it is the **immediate next pass** after this one
completes, against the charter and from clean context. This pass leaves the engine lean and charter-adherent
and leaves a clear report; the redesign builds directly on that.
