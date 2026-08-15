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
| `check:snippets` | Extracts every fenced `ts`, `typescript`, and `svelte` block from `docs/reference`, `docs/extend`, `docs/admin`, and `docs/editors`, and typechecks each one standalone against the built package. Catches a snippet that teaches a retired export or a stale call signature. A block that cannot stand alone (a continued fragment, or markup-only prose) needs an explicit opt-out, an `<!-- snippet-check-skip: reason -->` comment on the line before the fence, naming why. The annotation is a per-block escape hatch, used sparingly; a page thick with them has stopped proving anything. |
| `check:docs` | Walks the published docs tree plus the root project files (`README.md`, `SECURITY.md`, `ROADMAP.md`, `CHANGELOG.md`, `CONTRIBUTING.md`), resolves every relative link and `#anchor`, and fails on a target that doesn't exist. Catches a moved or renamed page or heading a doc still points at. `CHANGELOG.md` gets one exception, a `LEGACY_PATH_MAP` translating a retired path to the page that inherited its job, since a release record's past links stay pointed at paths that were real when they shipped; `CONTRIBUTING.md` documents the map's contributor-facing mechanics. |
| `check:arm-indexes` | For each published arm plus `docs/internal`, checks that every `.md` page in the arm's directory is linked from the arm's own index page. Catches a page that exists on disk but is unreachable from its track's front door. It parses no prose and does no counting; a page missing a link is the only thing this checks. |
| `check:readiness` | Loads the built condition registry (`dist/diagnostics/conditions.js`) and pins it against `docs/admin/is-it-working.md`: every condition needs a `docsAnchor`, and that `docsAnchor` must name both a real file (`docs/admin/is-it-working.md` itself) and a real heading in it. Catches a condition added with no checklist section, and a checklist that got renamed or moved out from under the registry that points at it. |
| `check:symbols` | Extracts every code-voice token (an inline span or fenced block) from the published tracks and the two front doors, classifies it into one of five kinds (a CLI flag, an environment variable, an imported export, a repository file path, or a log event/condition/doctor-check id), and resolves each against its real source of truth. Catches a hallucinated symbol, the class of error where a doc names something plausible-sounding that the code does not actually carry. |
| `check:package` | Rebuilds the package, then runs `publint --strict` and `@arethetypeswrong/cli` against the packed tarball, followed by `check-package-files.mjs` (confirms the four published docs tracks land in the tarball and nothing outside them leaks in) and `check-skill-budget.mjs`. Catches an entry-point or type-resolution defect a consumer would hit on install, and a docs payload that drifted from what actually ships. |
| `check:surface` | Renders the full declared shape of every export, callable and non-callable, from the built `.d.ts` and diffs it against the committed golden file `docs/internal/api-surface.md`. Catches a renamed or retyped field on an interface, type alias, or const that the two reference gates can't see, since they check names and callable signatures, not full shape. |
| `check:consumers` | Runs the two real consumers of the package, `examples/showcase`'s `svelte-check` and `check:dev-package`'s `tsc` over `packages/cairn-cms-dev`, against the built package. Catches a public reshape that breaks a consumer silently, the gap a prior pass exposed before this gate existed. |
| `check:vale` | Runs Vale at error tier only (`vale --minAlertLevel=error`) over `docs`, `README.md`, and `examples/showcase/README.md`. `docs/editors/` grades under the Microsoft style package, every other published track and the front doors under Google; `.vale.ini` scopes each package per directory, and `docs/internal/` and `docs/superpowers/` carry no style package at all. Warnings and suggestions stay advisory and are not gated. Catches a style violation, not a factual one; Vale has no opinion on whether a claim is still true. |

Together these cover names, signatures, code blocks, links, arm reachability, package shape,
tiers, symbol claims, and style. None of them read a sentence for meaning.

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

Routine id: `trig_015UPQostYVisXuExTHTH2vu` (created 2026-07-04; monthly, first of the month).

## When Topo lands

Two more items join the machine layer when the Topo hosting pass lands, per the IA's Topo
constraints ledger: a docs-build link and anchor gate in CI (mirroring `check:docs` at hosting
time), and `llms.txt` (full and small) regeneration. Nothing about them is pre-documented here
beyond the pointer.
