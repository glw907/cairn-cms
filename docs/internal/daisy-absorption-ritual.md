# The daisy absorption ritual

The admin (`cairn-admin.css`) and the admin toolkit (`@glw907/cairn-cms/admin-toolkit`) both
assemble their markup from a curated blessed set of daisyUI 5 classes, compiled once by
`scripts/build-admin-css.mjs` from `src/lib/components/admin-css-safelist.ts` plus whatever class
the `.svelte` sources themselves reference. A daisy release can rename a class, drop one, or
change what a class renders, and the admin has no other signal that happened: a class the build
no longer compiles simply stops styling anything, silently, with no error. This ritual is the
maintainer's routine check against that risk, run against every daisy release Dependabot opens a
PR for (`.github/dependabot.yml`), not only a major.

## The ritual

1. **Read the daisy changelog** for the version Dependabot is proposing. Note any renamed,
   removed, or behavior-changed class, and any new component that looks useful (see below).
2. **Rebuild the admin sheet:** `npm run package`. This recompiles `dist/components/cairn-admin.css`
   against the new daisy version.
3. **Verify every blessed-set class still compiles.** The grep surface is two places:
   `src/lib/components/admin-css-safelist.ts` (the classes deliberately compiled ahead of any
   component referencing them) and each component's own **Exact class inventory** on [the
   admin-toolkit reference page](../reference/admin-toolkit.md) (`StatusChip`, `Pagination`,
   `AdminTable`, `ListToolbar`; `PageHeader` and `EmptyState` carry none). Between the two, every
   class the admin or the toolkit depends on is named somewhere greppable; confirm each one still
   appears in the rebuilt `dist/components/cairn-admin.css`. A class that vanished is the blast
   radius: trace it to the safelist entry or the component that assembles it before accepting the
   bump.
4. **Run the visual suite** in `examples/showcase`: `CI=1 npx playwright test admin-visual
   site-visual`. A daisy class that renders differently, rather than vanishing outright, shows up
   here as a pixel diff, not a missing selector.
5. **Note any new daisy component worth adopting.** A daisy release sometimes ships a primitive
   the admin or the toolkit could use (the way `status`, `join`, and the placement modifiers
   entered the blessed set ahead of a shipped consumer). File a candidate into
   `docs/internal/docs-friction-log.md` or `ROADMAP.md` rather than adopting it inline as part of
   the version bump; absorbing daisy and adopting a new primitive are two different changes and
   this ritual is scoped to the first.

Steps 2 to 4 are exactly steps 2 to 4 of [Rehearsing a DaisyUI or Tailwind
upgrade](./admin-design-system.md#rehearsing-a-daisyui-or-tailwind-upgrade), the heavier runbook a
scheduled watcher triggers for a daisy or Tailwind **major**. This ritual is the same check run at
every daisy release Dependabot proposes, patch and minor included, since a class can vanish or
misrender on a minor too.

## The safelist is the compile-side contract, not a cache of what is used today

`admin-css-safelist.ts` exists to compile a class ahead of any shipped component referencing it, so
a site-authored admin screen (or a future toolkit component) can reach for the blessed vocabulary
immediately rather than waiting on an engine consumer to unlock it. **Once a class enters the
blessed set, an engine component adopting it and later dropping that reference is never grounds to
prune the class from the safelist.** The safelist's scope is "blessed for the admin and the
toolkit to use," not "referenced by a shipped component today"; those are two different questions,
and only the first one governs pruning. Removing an entry is a deliberate call against the blessed
vocabulary itself (a class daisy retired, say), never a side effect of an unrelated component
change.
