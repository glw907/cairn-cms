# Theme identity pass B: the admin agent path and one public theme

**Status:** draft for review (brainstormed with Geoff, 2026-09-27). Sections 1 to 4 were approved
in conversation; this document awaits the adversarial review named under Review, then Geoff's read.

**Extends:** [`2026-09-26-theme-identity-design.md`](2026-09-26-theme-identity-design.md). Its
"G2: easy for agents" section and the "Pass B, the agent path" bullet under Delivery define chain 1
below. This spec adds nothing to that scope and restates it only by reference; where the two
disagree, the earlier spec governs chain 1.

**Folds in:** the ROADMAP "One public theme" initiative (Geoff, 2026-09-27), which sequences
before draft documentation resumes.

**Evidence:** two read-only research reports from this brainstorm, summarized where used: a harvest
of the five production sites' theme files (ecxc-ski, 907-life, aksailingclub-org, xcathletes-org,
cairn-pub), and an inventory of the Waymark chassis contract and its gates.

## Goals

Geoff's intent, from the brainstorm:

- Every production site will be rebuilt starting from the Waymark theme, as a test of whether it
  can be re-skinned to each site's personality. The public theme is therefore the surface a
  designer works in four times over, not a one-off.
- "cairn should be able to include a non-Waymark theme." The contract must be theme-independent.
  This initiative makes a second theme possible and proves it; shipping one is later work.
- "A cairn implementer [should] be able to add a new component to the library and have it easily
  access the theme values."
- "Our system [must not] box in a designer who wants a very different look-and-feel," and it must
  be "something a theoretical theme designer would be happy to work with."
- The system should be "clean, simple, logical, and flexible," following idiom without
  over-engineering. Geoff delegates the design-system shape to Claude.

## The governing principle

**The contract is a floor, never a ceiling.** It names what a theme must provide for cairn's own
parts to render. It never limits what a theme may add, replace, or skip. A theme may define any
tokens of its own, may replace or drop the chassis `prose.css` and `composition.css`, and may
restyle anything through the ordinary cascade. The guard polices literals, never vocabulary: it
checks that a value comes from a token, never which token.

Every section below is measured against this principle, and the review is told to attack it.

## Chain 1: the admin agent path

Unchanged from the theme identity spec: the `radius-scale` rule and the retired-patch arms on
`stock-default-hazards`, both advisory; the recipe field beside `RATIFIED_NORMS` as the one source
for the guidance tables, and `cairn-audit norms <role>` printing each recipe line; the shipped
guidance (`skills/cairn-admin-screens/SKILL.md` with a new exemplar built from the fixture screen,
`skills/cairn-extend/references/daisyui-first.md`, `claude/agents/cairn-extension-reviewer.md`);
the sync test between the guidance tables, the recipe source, and the fixture route; and the
admin agent-build probe. It depends on pass A's final class vocabulary and fixture screen.

## Chain 2: one public theme

### The contract

The public theme contract has two parts, and nothing else:

1. **daisyUI's theme variables:** the color roles, `--radius-selector`, `--radius-field`,
   `--radius-box`, `--size-selector`, `--size-field`, `--border`, `--depth`, and `--noise`. The key
   list is read from daisyUI's own theme object, the same source pass A's completeness test uses,
   so it tracks daisyUI upgrades. These are the only keys a theme must define; nothing defaults
   them.
2. **One engine-shipped stylesheet of defaults, `theme-tokens.css`.** It holds the design scale in
   `@theme` (the three faces, `--text-step-*`, `--spacing-*`, `--leading-*`, `--tracking-*`, the two
   measures, `--color-muted`, `--color-card-border`) and cairn's roles in `:root` (the four status
   inks, `--cairn-shadow`, the CTA set, the focus ring, the code ramp, `--flow-space`,
   `--cairn-caption-tracking`). Every key carries a working default. A theme overrides the ones it
   wants.

Names follow one rule: daisyUI's names for daisyUI's keys, Tailwind's `@theme` names for the scale,
and `--cairn-*` for cairn's roles. There are no aliases.

**Why the defaults move into the engine.** Today the chassis `tokens.css` is copied into a site at
scaffold and never updated. The harvest found all five sites on stale copies, each missing keys
added since (the focus-ring set, `--cairn-caption-tracking`). A copied default freezes. An engine
component that reads a newer key then fails silently on an older site, which defeats the
library-component goal. The idiom for a package's design defaults is to ship them in the package
and import them, as daisyUI and Tailwind do. So the defaults move to a new export subpath beside
the existing `./admin-sources.css`, and the chassis imports them.

The chassis `tokens.css` keeps what is not a default: the Tailwind import, the daisyUI plugin
activation, and the import of the engine defaults. The plan proves that `@theme` keys inside a
package stylesheet imported this way still generate their named utilities under the site's
Tailwind build, and names the fallback if they do not.

This is a new public surface. From that point, renaming or removing a key in `theme-tokens.css` is
a disclosed contract change under the seam promise. Adding a key with a default is not breaking.

### Status inks derive by default

Each ink's default in `theme-tokens.css` is
`color-mix(in oklab, var(--color-<status>) N%, var(--color-base-content))`, one formula for both
schemes. Mixing toward the ink darkens in light mode and lightens in dark mode. `color-mix` is
already used throughout the chassis. Relative color syntax (`oklch(from …)`) would be tighter, but
it is not yet widely available, and nothing in the repo uses it. The plan picks `N` per status by
measurement so the derived ink clears AA on `base-100` in both Waymark schemes.

A theme can still hand-set an ink. Waymark keeps its current hand-tuned inks as overrides, so the
Waymark render does not change; derivation is what a new theme gets for free. The re-skin recipe's
step 6 in Waymark's `theme.css` header changes from "retune the ink with the fill" to "the ink
follows the fill; override it only to hand-tune."

### One class: `cairn-eyebrow`

The chassis gains one class, `cairn-eyebrow`, that sets uppercase and reads `--tracking-eyebrow`.
It is the only lever with real repetition behind it: eight hand-set eyebrow instances across three
sites, most bypassing the existing token with their own number. A theme restyles the class like any
other rule. No other lever is added. The harvest's other recurring traits (the link underline, the
rule style, a header band) each have a home already: the first two are single `prose.css` rules a
theme overrides in the cascade, and a header band is daisyUI's `neutral` or `base-200` role.

### The guard

`cairn-audit` gains a **public scope**, a sibling of the admin scope. Its default roots are
`src/theme`, `src/routes` minus `src/routes/admin`, and `src/lib/components`; over cairn's own
tree it also covers the engine's public component directories. A site overrides the roots in
`cairn-audit.config.json` the way it already overrides the admin scope. Three rules run in it:

- **`public-literals`** flags a color literal or an absolute font size in a CSS declaration, a
  `style=` attribute, or a Tailwind arbitrary value (`text-[#abc]`, `text-[14px]`). A literal is
  allowed in one place: as a custom-property value in a theme CSS file (`src/theme/**/*.css`),
  since defining a token is the theme's job. Tailwind's own utilities (`text-sm`, `bg-red-500`)
  are not flagged, because they are tokens a designer may choose. ecxc's component-local
  `--color-header` constants are the case this catches; they move to the theme file, where they
  are legal.
- **`theme-conformance`** checks that each named daisyUI theme block defines every daisyUI theme
  variable, and that every `var(--x)` in the public scope resolves to something the theme,
  `theme-tokens.css`, or daisyUI defines. It closes the hole the inventory found: `prose.css` reads
  `--radius-box`, `--radius-field`, `--radius-selector`, and `--border` with no fallback, and the
  current dangling-var check cannot see a theme that omits them.
- **`theme-contrast`** is the existing dual-gamut AA check, moved from the repo-only
  `scripts/checks/check-public-tokens.mjs` into the audit, and taught to resolve `var()` and
  `color-mix` through culori. The current parser matches only literal `oklch(` values and would
  crash on a derived ink. A re-skin is exactly when a site needs this check.

All three land at advisory tier, and the changelog names their promotion to error at the next
minor. After the move, `check-public-tokens.mjs` keeps only what the audit does not cover, or
retires, and `test:reskin` keeps calling the same contrast core. There is one implementation of
each check.

### Where the guidance lives

- **`docs/reference/theme-tokens.md`**, the reference page for the new export subpath. It carries
  the whole contract: daisyUI's variables, every `theme-tokens.css` key with its default, ink
  derivation, `cairn-eyebrow`, and the three audit rules. It opens with the governing principle and
  serves both a theme author and a component author. `check:reference` gates it.
- **`skills/cairn-extend/references/public-theme.md`**, the shipped agent guidance, beside
  `daisyui-first.md`. It carries the principle, a short job-to-token table (body ink, muted ink,
  status text, card edge, shadow, eyebrow, spacing step, type step), the minimal set of values that
  makes a new theme conform, and the recipe for a themed component. It links to the reference page
  for everything else. A test asserts every token its table names exists in `theme-tokens.css`.
- **`cairn-implementer`'s definition** gains one line: a public component under `src/lib` reads
  only contract tokens, and `theme-tokens.md` is the page to consult. `public-literals` over
  cairn's own tree enforces it.

## Proof

- **The Waymark render does not move.** Every default reproduces today's value, and Waymark keeps
  its hand-tuned inks, so `site-visual` baselines must not change. Any baseline diff is a finding.
- **A second theme as a standing fixture.** `test:reskin` gains a theme file deliberately unlike
  Waymark: different faces, a square corner ladder, a dark-first palette, derived inks on all but
  one status, and one custom token of its own. The three audit rules must pass on it, and the
  showcase must build and render under it with no chassis edit. The existing hue-rotation case
  stays. This is the permanent guard on the governing principle.
- **Three acceptance probes at the pass close,** each a fresh Sonnet agent given only the shipped
  guidance and a one-line brief:
  1. An admin screen, as the theme identity spec defines it.
  2. A minimal new theme on the chassis, with its own chrome and one custom public component. The
     public scope must report zero findings.
  3. A throwaway engine public component, written by a `cairn-implementer`, that must render
     correctly under Waymark and under the fixture theme with no per-theme edit. The branch is
     discarded.
  A probe failure names the guidance gap, and the fix lands before the close.
- **Gates that stay green:** `npm run check`, `npm test`, `check:reference`, `check:facts`,
  `check:template`, `test:reskin`, `norms:check`, and the showcase e2e.

## Documentation and records

Facts bullets in `docs/internal/facts/` for each public behavior: the export subpath, derived inks,
`cairn-eyebrow`, and the three rules. `docs/reference/cairn-audit.md` gains both chains' rules.
`CHANGELOG.md` under `## Unreleased`, with one `Consumers must:` line: replace the copied
`chassis/tokens.css` defaults with the engine import. `docs/extend/migration-notes.md` carries the
one-line swap. ROADMAP marks "One public theme" done and removes it from the live tiers. Waymark's
`theme.css` header is re-emitted to `templates/waymark` by `npm run emit:template`.

## Delivery

**One pass, theme identity pass B, run as two parallel chains** through `pass-execute-chains`, with
the implementer, `diff-reviewer`, and gate chain inside each. The two chains share almost no files,
and the close's probes need both finished.

- **Chain 1** is the admin agent path, about five tasks.
- **Chain 2** is about seven tasks, in dependency order: the export subpath and the chassis import;
  ink derivation and `cairn-eyebrow`; the public scope with `public-literals`;
  `theme-conformance`; `theme-contrast` and the `check-public-tokens.mjs` reduction; the fixture
  theme; the reference page, the shipped guidance, the implementer line, and Waymark's header.
- **The close** runs the three probes and makes every edit to a shared file:
  `docs/reference/cairn-audit.md`, the facts, the changelog, the migration notes, and the ROADMAP.
  The one shared file inside the chains is the audit's rule registry, where each chain adds a line.

Segment boundaries fall every three or four tasks per chain. **The named split point:** if spend
reaches 80% of the ceiling, chain 1 closes alone as pass B and chain 2 becomes pass C with its own
close. Both halves are self-contained.

**Sequencing.** This spec and its review touch nothing in pass A's worktree. Plan authorship waits
for pass A's segment D, since chain 1 needs A's final vocabulary and fixture. Execution waits for
pass A to merge: chain 1's rules would flag cairn's unswept tree, and chain 2 edits the starter
`theme.css` that pass A's task 11 changes. Draft documentation resumes after pass B merges, and the
designer's theme guide is drafted against this contract.

**Release.** No version bump and no publish. The pass batches with pass A into the next
consumer-facing release.

## Review

Before Geoff's read, the spec runs through `spec-plan-review` with its three standard lenses plus
five added for this spec, each told to argue for cutting:

1. **Idiom:** does each piece follow Tailwind 4, daisyUI 5, and CSS custom-property convention,
   and where does it invent something the stack already has?
2. **Ease of theming:** how many values does a minimal conforming theme need, and what would a
   designer have to learn that is not plain CSS and daisyUI?
3. **Ease of adding a themed component:** can a `cairn-implementer` add a public component that is
   right under any theme by reading one page?
4. **Right-sized engineering:** which rule, test, class, or file could go without losing a
   stated goal?
5. **Theme ecosystems:** the spec compared against a neutral survey of theme systems with robust
   ecologies (WordPress `theme.json`, Ghost, Shopify, Hugo, Astro) and ones that struggled
   (Gatsby, Drupal, Jekyll), plus design-token component kits. Each comparison cites the survey
   and draws each system at its most competent.

Findings rank by consequence. The fold may refuse one whose fix costs more than the risk it
removes, and it records why.

## Open for the plan

Execution calls, not design calls:

- The export subpath's exact name and the `@theme` utility-generation proof.
- Each status's derivation percentage, set by measurement.
- The `public-literals` boundary's handling of a theme's Svelte components under `src/theme`
  (markup there is checked like any other markup; only CSS custom-property values are exempt).
- Whether `check-public-tokens.mjs` retires or keeps a residue.
