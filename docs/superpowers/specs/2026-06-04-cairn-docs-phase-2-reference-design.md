# Documentation Initiative Phase 2 Design: the Reference arm

**Initiative:** cairn-cms documentation initiative (spec
`docs/superpowers/specs/2026-06-04-cairn-docs-initiative-design.md`). This is the per-phase design
for Phase 2, the Reference arm. Phase 1 (legibility and split) landed on `main` 2026-06-04.

## Goal

Give an external adopter one hand-curated reference page per package export subpath, each accurate
against the TypeScript types and grounded in real `examples/showcase` usage. The arm answers "what
does this export do and how do I call it" for a developer who already knows they need it.

## Source of truth

The exported types in `src/lib` (and the built `.d.ts`) are authoritative. A reference page lists
the exported symbols, their signatures, and a worked usage. A public-API claim the code does not
support is a defect the accuracy gate must catch. No TypeDoc; the arm is hand-curated, per the
initiative spec.

## Pages

Seven pages live under `docs/reference/`, one per importable surface, plus an index.

| Page | Subpath | Surface | Export size |
|---|---|---|---|
| `core.md` | `.` | the engine: adapter contract, `defineFields`/`defineAdapter`, `createRenderer`, `composeRuntime`, the schema and id helpers | ~63 |
| `sveltekit.md` | `/sveltekit` | the server load and action logic | ~11 |
| `components.md` | `/components` | the admin Svelte UI | ~14 |
| `delivery.md` | `/delivery` (and `/delivery/head`) | the route loaders and their types, plus `CairnHead`; re-exports all of `/delivery/data` | 6 own + re-export |
| `delivery-data.md` | `/delivery/data` | the node-safe pure projections | ~23 |
| `vite.md` | `/vite` | the `cairnManifest()` plugin | ~7 |
| `cli-cairn-manifest.md` | the `cairn-manifest` bin | the manifest regenerate command | 1 |

`/delivery/head` holds one symbol (`CairnHead`), so it folds into `delivery.md` rather than taking
its own page. The bin is a distinct surface (a command, not an import), so it gets its own page.
`docs/reference/README.md` indexes the seven. Phase 2 flips the "Reference, forthcoming" line in
`docs/README.md` to link the arm.

`/delivery` re-exports the whole `/delivery/data` surface (`export * from './data'`) and adds the
SvelteKit-coupled route loaders on top: `createPublicRoutes` plus the `PublicRoutesDeps`, `ListData`,
`TagData`, `TagIndexData`, and `EntryData` types. So `delivery.md` documents only those additions and
`CairnHead`, then states that it re-exports all of `/delivery/data` and links `delivery-data.md` for
the pure projections. The two pages do not duplicate the 23 shared symbols.

## Per-page template

Every page follows one skeleton so a reader learns the shape once.

1. A one-line intro: what the subpath is, when to import it, and the import statement.
2. The exported symbols, functions and components first, then types.
3. Each primary symbol carries a signature, a short description, and a worked snippet. Params and
   the return value are called out where they are not obvious from the signature.
4. A type alias or interface carries a signature and a one-line meaning, with no example.

## Depth: tiered

Every exported symbol is listed and named, so the page covers its subpath completely. The primary
API (the functions, the components, the plugin, the bin) carries a worked example. A pure type alias
carries a signature and a sentence, no example. Core exposes about 63 symbols, many of them type
aliases, so an exhaustive example-per-symbol page would be long and low-value; the tiered rule keeps
the page complete without that cost.

## Worked snippets

Snippets come from `examples/showcase` where it imports the symbol. The showcase `src` imports from
`.`, `/sveltekit`, `/delivery`, `/components`, and `/delivery/head`, so those pages draw directly
from it. The `/vite` plugin and the `cairn-manifest` bin are exercised from `vite.config.ts` and the
package scripts, so those pages draw from there. Where the showcase exercises no symbol on a page, the
snippet is a minimal example that compiles against the real types.

## Accuracy gate: an export-coverage check

Manual cross-checking drifts the moment a later pass renames an export and nobody re-reads the page.
A small check rot-proofs it. The check enumerates the real exported names per subpath from the built
`.d.ts` and asserts each name appears in its reference page. A missing or renamed export fails the
gate. It runs alongside `prose-guard` (no blocking tell) and relative-link resolution (no dangling
link). The check is a repo script the phase adds, run per page and in the phase-end ritual.

The `/delivery` re-export needs one rule so the check does not force `delivery.md` to re-name all 23
`/delivery/data` symbols. For `/delivery`, the check asserts coverage of the names `delivery/index.ts`
declares itself (the route loaders and their types), and treats the `export *` surface as covered by
`delivery-data.md`. The delivery page still carries the re-export pointer so a reader is not stranded.

## Execution

Subagent-driven, one `cairn-implementer` per page, since the pages are independent and reading-heavy.
`core.md` runs on Opus for its size and judgment; the smaller pages fit the Sonnet default. The phase
is docs-only. It publishes nothing, touches no engine code (beyond adding the coverage-check script),
and carries no version bump.

## Friction log

Each page appends any design friction it surfaces to `docs/internal/docs-friction-log.md`: an awkward
export boundary, a symbol whose purpose the types do not convey, or a split that confuses a reader.
A finding is a candidate for the roadmap, not a blocker on the page that found it.

## Out of scope

The other three arms (explanation, guides, tutorial) land in later phases. The stale
`creating-a-cairn-site.md` is rewritten and split in those phases, not here. `SECURITY.md` keeps its
current links to `docs/data-architecture.md` and `docs/render-sanitize-floor.md`; Phase 3 repoints
them when the explanation arm lands.
