---
name: cairn-building-admin-screens
description: Build, gate, arrange, or review a screen inside a cairn site's /admin. Load before touching anything under src/routes/admin or src/lib/admin, the admin-toolkit or CsrfField, createSectionAction, createAdminAction, requireAccess, the adapter's access map or roles, editor.navLayout, navFilter, attention badges, the /admin mount or root layout, or when npm run check:cairn or cairn-audit reports a finding on an admin screen.
---

# cairn admin screens

A custom admin screen is a SvelteKit route under `src/routes/admin/` that renders inside
`CairnAdminShell`. The engine's TSDoc carries each export's contract; this skill carries the
recipes, the orderings, and the traps between exports. Open the reference for the job.

| Job | Open |
|---|---|
| Add a screen over your data or a tool with no data: gate, actions, audit, CSRF, dialog, row detail, fetch action | `references/custom-screen.md` |
| Put a screen in the sidebar, add a role, hide a section by role, deny a route, `navFilter`, badges | `references/sidebar-and-access.md` |
| Wire or repair the `/admin` mount, the chrome-free root layout, hooks order, `/healthz` | `references/admin-mount.md` |
| Fix a `cairn-audit` finding, configure the audit, run rendered mode, read a norms query | `references/audit-rules.md` |
| Lay out a list screen (table, toolbar, chips, expandable rows, pagination) | `references/exemplar-list.md` |
| Lay out a detail screen, a card stack, or a dialog | `references/exemplar-detail.md` |
| Write buttons, joins, alerts, controls, a chip, a field, or a card in plain classes | `references/exemplar-kit.md` |
| Lay out a form's labels, rows, and submit row | `references/form-anatomy.md` |
| Polish past correct: motion, weight, numerals, narrow-width rows and tables | `references/craft.md` |
| Build a component the toolkit does not ship | `references/extension-grammar.md` |
| Run the coherence read in the done-gate | `references/grader-prompt.md` |

## Tier map

`cairn-audit` (static: `npx cairn-audit`; rendered: `npx cairn-audit --rendered`, against a
running server, both themes) runs thirty-eight rules: twenty-one static, seventeen error tier and
four advisory, and seventeen rendered, seven error and ten advisory. Each rule's trigger and fix
is in `references/audit-rules.md`.

**Static, error tier:** `no-uncompiled-class`, `type-scale`, `gap-scale`,
`stock-default-hazards`, `token-colors`, `grammar-boundary`, `focus-parity`, `motion-band`,
`motion-property`, `motion-vocabulary`, `motion-hover-gate`, `reduced-motion`,
`stripe-trim-parity`, `unlayered-font-clobber`, `list-role`, `log-event-grammar`,
`log-secret-field`.

**Static, advisory tier:** `radius-scale` (promoted to error at 0.99.0), and three rules that
read the site's public files and stay advisory for a consumer: `public-literals`,
`theme-conformance`, `theme-contrast`.

**Rendered, error tier:** `one-filled-action`, `focus-renders`, `interactive-contrast`,
`touch-targets`, `viewport-overflow`, `panel-width`, `list-role`.

**Rendered, advisory tier** (a compositional question a novel component can answer differently
on purpose; reported, never gating): `chip-ground-collision`, `border-contrast`,
`weight-budget`, `norms-bands`, `screen-anatomy`, `relational-spacing`, `form-font-parity`,
`field-edge-alignment`, `container-inset-asymmetry`, `motion-reduced-delay`.

## Write this, get this

Write the plain daisyUI or cairn role class a screen needs; the theme layer, not the markup, carries the ratified look.

| Write | Get |
|---|---|
| `type-title font-[550] font-[family-name:var(--font-display)]` | the page heading, 24px at weight 550, no bold, in the display face. |
| `type-label font-semibold uppercase tracking-[0.08em] text-muted` | an eyebrow: quiet, uppercase, tracked out. |
| `font-medium text-subtle` | a resting sidebar item; CairnAdminShell renders the nav itself, no screen writes one directly. |
| `btn btn-primary` | the one accent-filled commit action on a surface. |
| `btn btn-ghost` | a quiet button for chrome actions, toolbar controls, and row affordances. |
| `input` | a single-line text field. |
| `select` | a native select control. |
| `card-shell card-shadow` | a floating card surface: the box radius, a hairline edge, and elevation. |
| `btn` | the plain button: a hairline edge, no fill accent. |
| `btn btn-neutral` | the ink opener: a solid neutral fill, the first commit-adjacent step up from plain. |
| `btn btn-soft btn-primary` | the soft primary: a tinted act-on state, softer than the solid commit. |
| `join-item btn btn-active` | the selected segment in a join or segmented control: a neutral wash plus a state hairline. |
| `rounded-selector` | the corner for a chip, tag, count, or other small inline marker. |
| `rounded-field` | the corner for a control, button-like element, or small thumbnail. |
| `rounded-box` | the corner for a panel, card, tile, popover, sheet, or the brand tile. |

Keep every file that holds admin markup under `src/routes/admin` or `src/lib/admin`. The site's
admin sheet (`src/admin.css`, compiled to `.cairn/admin.css` by the scaffold's `predev`,
`prebuild`, and `precheck` scripts) scans only those two roots, and the audit's static scope
covers them. A utility used only in a file elsewhere never compiles, so it renders unstyled.
While `npm run dev` runs, a class you add compiles only if the `dev:admin-css` watch script runs
beside it.

Toolkit components (`@glw907/cairn-cms/admin-toolkit`) assemble daisyUI classes and carry their
own scoped styles, and they render correctly only inside the admin shell, which loads the admin
sheet and theme. Outside `/admin` nothing supplies either. A component's `@component` comment
lists its class inventory. Before inventing a height or a padding, run
`npx cairn-audit norms <role>`.

## Register rules

The audit cannot judge these, because each needs to know what the screen is for:

- **One filled action, chosen deliberately.** `one-filled-action` catches a second accent fill;
  it cannot tell which control deserves the one it allows. When a screen has one primary action,
  put it in `PageHeader`'s `action` slot beside the `h1`, never in a row trailing the content.
- **Chip passivity.** `StatusChip` has three registers: `quiet` (the default) for the settled
  state a list mostly sits in (Published, Closed), `warning` for a state that needs attention
  (Draft, Overdue, Pending), and `outline` for a transient or reversible absence. Quiet and
  warning sit under the 1.5 ground-collision floor by design, so an advisory
  `chip-ground-collision` on them is expected, not a regression.
- **Facet quietness.** A filter is a facet: quiet bordered chrome showing only its name, picking
  up its primary tint only once its value departs the default. A facet never carries a fill.

## The done-gate

A screen is done, in order, only after:

1. **The static audit passes**: `npm run check:cairn` (it compiles the admin sheet first) or
   `npx cairn-audit`.
2. **The rendered audit passes**, both themes, against a running server:
   `npx cairn-audit --rendered`, with the screen named in `rendered.extraPages`.
3. **For a derivation or a composition the toolkit does not cover**, the grader prompt
   (`references/grader-prompt.md`) passes against your captures.

Run the static audit before the first edit and again after the fix. In the report, name each rule
id that fired (`list-role`, not "list semantics"), what it required, and the final exit code.

Fix a finding in the screen's markup. A suppression comment, an allowlist entry, or a config that
drops the screen from scope is for a finding you judge deliberate, with its reason, and you report
it. A build that passes by suppression is a disguised failure. A clean audit means the vocabulary
is correct, not that the screen composes; report it as exactly that.
