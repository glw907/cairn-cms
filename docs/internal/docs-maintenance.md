# Docs maintenance

Three layers keep the docs current, in decreasing order of automation: the machine
gates, the pass rule, and a monthly drift routine. Each covers ground the one before
it can't reach.

## The machine layer

Every `check:*` script that touches docs, and the one thing each catches:

| Gate | What it catches |
| --- | --- |
| `check:reference` | Per exported subpath, checks each export name against its reference page three ways: the name appears on the page (missing), the page marks it with a stability tier (untagged), and any name the page mentions still exports for real (stale, the reverse check that catches an old name left behind after a rename). |
| `check:reference:signatures` | For each function or const-function export, renders its real signature through the TypeScript compiler API and compares it against the page's declared fenced-block signature. Catches a page whose export still exists but whose documented shape has drifted. |
| `check:snippets` | Extracts every fenced `ts`, `typescript`, and `svelte` block from `docs/tutorial`, `docs/guides`, and `docs/reference`, and typechecks each one standalone against the built package. Catches a snippet that teaches a retired export or a stale call signature. A block that cannot stand alone (a continued fragment, or markup-only prose) needs an explicit opt-out, an `<!-- snippet-check-skip: reason -->` comment on the line before the fence, naming why. The annotation is a per-block escape hatch, used sparingly; a page thick with them has stopped proving anything. |
| `check:docs` | Walks the published docs tree plus the root project files (`README.md`, `SECURITY.md`, `ROADMAP.md`, `CHANGELOG.md`, `CONTRIBUTING.md`), resolves every relative link and `#anchor`, and fails on a target that doesn't exist. Catches a moved or renamed page or heading a doc still points at. |
| `check:package` | Rebuilds the package, then runs `publint --strict` and `@arethetypeswrong/cli` against the packed tarball. Catches an entry-point or type-resolution defect a consumer would hit on install; not a prose gate, but the closest check to "does the shipped package match what the docs describe." |
| `check:surface` | Renders the full declared shape of every export, callable and non-callable, from the built `.d.ts` and diffs it against the committed golden file `docs/internal/api-surface.md`. Catches a renamed or retyped field on an interface, type alias, or const that the two reference gates can't see, since they check names and callable signatures, not full shape. |
| `check:consumers` | Runs the two real consumers of the package, `examples/showcase`'s `svelte-check` and `check:dev-package`'s `tsc` over `packages/cairn-cms-dev`, against the built package. Catches a public reshape that breaks a consumer silently, the gap a prior pass exposed before this gate existed. |
| Vale (Google package) | Lints prose style on the published arms (`reference`, `guides`, `explanation`, `tutorial`, the docs index, `README.md`) against the Google Developer Documentation Style Guide. Catches a style violation, not a factual one; Vale has no opinion on whether a claim is still true. |

Together these cover names, signatures, code blocks, links, package shape, and tiers. None of
them read a sentence for meaning.

## The pass layer

The machine layer only catches what's mechanically checkable. The rest is one human rule,
already standing in `cairn-cms/CLAUDE.md`: **a change is not done until its docs match.**
Concretely, when a pass renames or removes something, grep the docs tree for the old name
before calling the pass finished, and prune `ROADMAP.md` and
`docs/internal/docs-friction-log.md` of whatever the pass resolved, in the same pass, not
later. No gate replaces this rule; it's the discipline the gates assume.

## The drift layer

Neither layer catches semantic prose drift: a claim that was true when written and quietly
stopped being true, with no rename or removal to grep for. A monthly cloud routine (the
`schedule` skill, Sonnet) closes this gap: each run samples three published pages, adversarially
fact-checks every claim on them against the current code, and reports only confirmed drift with
file:line evidence. A clean run self-reports "no drift" in one line; it doesn't pad a report to
look busy.

Routine id: TBD at pass end.

## When Topo lands

Two more items join the machine layer when the Topo hosting pass lands, per the IA's Topo
constraints ledger: a docs-build link and anchor gate in CI (mirroring `check:docs` at hosting
time), and `llms.txt` (full and small) regeneration. Nothing about them is pre-documented here
beyond the pointer.
