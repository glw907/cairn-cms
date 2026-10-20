# Admin toolkit organization: harvest wave 1 and engine adoption (design)

Date: 2026-07-20. Status: approved in brainstorm; plan to follow.

Provenance: the three rulings recorded in aksailingclub-org's
`docs/2026-07-20-members-pass-harvest-findings.md` (subpath-inside-cairn, wave-by-graduation,
cairn-dogfoods), the ROADMAP "admin toolkit" entry (queued at ff0d3f34), the 2026-07-15 admin
UX audit's finding 11 (`docs/internal/2026-07-15-admin-ux-audit.md`), and the ASC toolkit's
contract docs (`aksailingclub-org/src/admin-club/toolkit/README.md`). The ASC Members pass has
landed; Geoff confirmed the components are usable and directed this pass 2026-07-20.

## Goal

Make cairn a first-class consumer of its own admin component library. One pass, three
movements:

1. Establish the `@glw907/cairn-cms/admin-toolkit` subpath surface.
2. Graduate the ASC-born components into it (engine pull is the trigger).
3. Sweep cairn's own admin screens onto the toolkit so no parallel bespoke implementation
   survives where a component fits.

The engine becomes the toolkit's second consumer, which is the shakedown the
wave-by-graduation ruling wants before a contract publishes. Done well, this also proves the
components themselves, and future developers inherit an admin idiom that is enforced
structurally rather than by diligence.

## Non-goals

- ASC's swap from local toolkit copies to subpath imports. That rides ASC's next screen pass,
  in ASC's own sessions.
- New admin features. Every screen keeps its behavior; this pass changes structure and
  converges idiom.
- A sibling npm package. The subpath ruling is settled; the toolkit publishes inside
  `@glw907/cairn-cms`.

## The surface

- Module layout: `src/lib/admin-toolkit/` holding the component files, `format.ts`, and an
  `index.ts` barrel. Engine screens import it internally; consumers import
  `@glw907/cairn-cms/admin-toolkit`.
- `package.json` gains the `./admin-toolkit` export (mirrored in `publishConfig` if the
  current export mechanics require it; verify against the real packaging at the first task
  that touches it, per the Plan 07 lesson).
- Doc gates pick up the surface: `check:reference` (new reference page), `check:package`
  (entry-point shape), `check:surface` with the regenerated `docs/internal/api-surface.md`
  committed in the same pass.

## The graduating cohort

Default cohort: **AdminTable, ListToolbar, Pagination, StatusChip, `format.ts`**, plus the
cairn-born **PageHeader** (below). These are near-certain engine pulls; the adoption survey
confirms.

**ExpandableRow is the deliberate exception.** Its own contract doc reserves reshaping at
ASC's Classes pass ("genre exists in four systems in different shapes, pick at the Classes
pass"). It graduates in this wave only if the engine survey pulls it; otherwise it stays
ASC-local until that shakedown, per the cost asymmetry the cadence ruling names (a wrong
contract published in cairn is a breaking change everywhere).

Cairn-born components: the finding-11 page-header convergence mints **PageHeader** (the
canonical page-header recipe as a component, so convergence is structural, not by-diligence).
EmptyState or a count device are minted only if the sweep shows the same repetition; the
survey decides, and anything not clearly repeated stays a recipe.

## Graduation is re-expression, not file copy

Same discipline as the legacy rule: port the proven contracts and logic, hold everything to
cairn's standards, prove with cairn's own tests.

- Comments to the TSDoc / `@component` standard; `check:comments` covers the `.ts` files.
- Tests land in cairn's suite: pure functions (`format.ts`, `computePageWindow`,
  `computeAppliedFilters`, `computeCountLine`) in the unit project; components in the
  real-browser component project. ASC's test cases are the seed; cairn's conventions govern.
- Each component meets the kit's hardened acceptance bar: its grammar encoded structurally
  (violating markup is never the caller's to write) and responsive-by-construction at the
  five-viewport bar (320 / 390 / 768 / 1440 / 2560).
- The invisible-craft floors (`check:invisible-craft`) and the Warm Stone idiom
  (`docs/internal/admin-design-system.md`) apply as to any admin component.

**Contract adjustments settle at graduation, before publication.** The one known case:
`formatTimestamp`'s `America/Anchorage` default is ASC's own, not a general default; published
in cairn it requires the zone or defaults neutrally (UTC), and ASC passes its zone. Any other
friction the port surfaces (a prop that only makes sense for ASC, a missing hook an engine
screen needs) is settled the same way: fix the contract now, while a change costs one edit.

## The dogfooding sweep

- **First task: the adoption survey.** Keyed to the audit's finding-11 inventory (page-header
  idiom five ways, counts three ways, search placement two), it walks every engine admin
  screen and produces the adoption map: which screen gets which component, which bespoke
  markup dies, where PageHeader lands, and whether ExpandableRow / EmptyState earn a pull.
  Candidate screens: ConceptList, ManageEditors, VocabularyAdmin, OfficeList,
  CairnMediaLibrary, plus whatever the survey adds.
- **Then per-screen re-expression.** Each screen adopts the components that fit; its bespoke
  parallel markup is deleted in the same change. New engine admin surfaces reach for the
  toolkit first from here on (the dogfooding ruling).
- **Polish flows into the components.** Where cairn's shipped screens exceed a component's
  current finish (the emphasis ladder, type rules, the arc's devices), the polish moves into
  the component so every consumer inherits it. The toolkit absorbs the arc's idiom; adoption
  must not flatten it.
- The header convergence is a deliberate visual change. Before/after renders go to Geoff at
  pass end (the one-check rule), and the showcase visual baselines regenerate on CI.

## daisyUI leverage stays structural

- Components remain thin assemblies over daisy component classes; anything not
  daisy-guaranteed (padding, truncation, wrapper layout) lives in the component's own scoped
  `<style>` block. This is the ASC toolkit's compiled-CSS rule, kept verbatim, because it is
  what keeps the toolkit riding daisy's own development instead of forking it.
- The blessed-set safelist (`admin-css-safelist.ts`) stays the compile-side contract even
  where engine adoption now references classes organically. A consumer guarantee never
  depends on incidental engine usage.
- The absorption ritual lands in this pass: a Dependabot config watching `daisyui`, and the
  ritual documented (read the daisy changelog, rebuild, verify every blessed-set class still
  compiles into `cairn-admin.css`, run the visual suite, note new daisy components worth
  adopting). The per-component **exact class inventory** in the reference docs is the ritual's
  grep surface for a bump's blast radius.

## Documentation

- New reference page `docs/reference/admin-toolkit.md`: one entry per export, each carrying
  the ASC README's convention (the contract, the daisy assembly, the exact class inventory,
  the controlled-component convention). This imports the contract-doc convention along with
  the code.
- `docs/internal/admin-design-system.md` updates: component recipes that the toolkit now owns
  point at the component instead of describing markup to hand-write.
- Guides/tutorial touched only where they currently teach a recipe the toolkit replaces
  (grep for drift, per the pass ritual).
- CHANGELOG under `## Unreleased`: the new surface (no `Consumers must:`; nothing breaks) and
  a behavior-change note for the visible header convergence, mirrored in the upgrade guide.
- Docs friction the writing surfaces goes to the friction log; the ROADMAP "admin toolkit"
  entry is rewritten at close to reflect what shipped and what the next wave holds.

## Verification

- Full gate per task (`npm run check` 0/0, `npm test` exit 0), `check:comments`, the four doc
  gates, `check:surface`, and a from-scratch showcase consumer build before calling the pass
  releasable.
- Live admin smoke (real Worker, D1-minted session) since the whole pass is `/admin` surface.
- Review gate: `daisyui-a11y-reviewer` and `svelte-reviewer` fan-out, plus the standard
  simplifier step.
- Visual: the showcase visual suite's five-viewport CI matrix regenerates baselines; the
  main loop reads full-page renders; Geoff gets the header-convergence before/after.

## Release

The pass ends with a release cut, via the `cairn-release` skill: a 0.x **minor** (new public
surface), number derived at the cut after the free-number check. The trigger is the doctrine's
own: a coherent capability at its natural boundary, with ASC's next pass as the waiting
consumer. This re-sequences the principle-pages pass behind this one (Geoff, 2026-07-20);
STATUS records the new order.

## Acceptance criteria

1. `@glw907/cairn-cms/admin-toolkit` exists, exports the graduated cohort, and passes all
   doc and surface gates.
2. Every engine admin screen the adoption map names consumes the toolkit, with its bespoke
   parallel deleted; the finding-11 idiom spread (headers, counts, search placement) is
   converged onto canonical components/recipes.
3. Each graduated component meets the kit bar: structural grammar, five-viewport
   responsiveness, contract docs with exact class inventory.
4. The daisy absorption ritual is documented and Dependabot watches `daisyui`.
5. The full gate, the admin smoke, the visual suite, and the review fan-out are green; Geoff
   has seen the header before/after.
6. A minor release is cut and verified on npm `latest`.
