# Pass I: neutral self-contained admin theme ("Warm Stone", R6)

**Date:** 2026-05-27
**Initiative:** cairn-cms (see `docs/PLAN.md`)
**Spec:** `docs/superpowers/specs/2026-05-26-admin-ui-design.md` §R6
**Sequence:** first of the New Admin UI passes, ahead of J (nav) and K (editing).

## Goal

The shared admin chrome must look identical on every host site, decoupled from the
host's DaisyUI theme and fonts. Today it inherits them: ecnordic renders the admin in
its `ecn` crimson theme and Alegreya Sans, and 907 renders it in `silk`/`dim` and
Spectral serif. That violates the locked "Admin theme: neutral, fully self-contained"
decision. This pass re-skins `/admin` neutrally regardless of host config, light-only.

## Approach: fully self-contained (decision (b)), via custom-property inheritance

DaisyUI v5 reads `var(--color-*)` at the point of use, and CSS custom properties inherit
down the DOM subtree. So we do not need a compiled `data-theme` (the package cannot force
a host's Tailwind/DaisyUI build to compile one). Instead:

1. Put a wrapper class `cairn-admin` on both of `AdminLayout`'s root elements (the
   signed-in drawer shell and the signed-out login shell).
2. In a scoped `<style>`, set the full DaisyUI v5 token set, `font-family`, and
   `color-scheme: light` on `.cairn-admin`.

Every descendant inherits these values from the nearest ancestor that sets them, which is
now `.cairn-admin`. That includes the child components rendered through `{@render
children()}` (`AdminList`, `EditPage`, `LoginPage`, `ManageAdmins`, `ConfirmPage`). The
inherited values override the host theme's `:root`/`[data-theme]` values for the whole
subtree. Inheritance does the work, not specificity, so Svelte scoping is not a problem:
only the setting selector (`.cairn-admin`, an element in this component) needs the scope
hash, and the inherited values flow to unscoped descendants normally.

Verified preconditions on both sites: DaisyUI v5, and neither site sets bare global
`h1/h2` font rules (their display-font rules are class-scoped), so a `font-family` on the
admin root cascades cleanly to admin headings without a `:global` reset.

## "Warm Stone" palette (light-only)

Warm-gray neutrals (a touch of hue near 75), violet accent, system-ui font. All values
OKLCH, per the design-system rule (no hex or rgb).

| Token | Value | Role |
|---|---|---|
| `--color-base-100` | `oklch(98.5% 0.004 75)` | page / cards |
| `--color-base-200` | `oklch(96% 0.005 75)` | sunken surfaces |
| `--color-base-300` | `oklch(92% 0.008 75)` | borders / lines |
| `--color-base-content` | `oklch(28% 0.012 75)` | warm near-black text |
| `--color-primary` | `oklch(52% 0.20 293)` | violet: the one action |
| `--color-primary-content` | `oklch(98% 0.012 293)` | |
| `--color-secondary` | `oklch(45% 0.02 75)` | warm slate (structural) |
| `--color-secondary-content` | `oklch(98% 0.004 75)` | |
| `--color-accent` | `oklch(58% 0.16 300)` | lighter violet accent |
| `--color-accent-content` | `oklch(98% 0.012 300)` | |
| `--color-neutral` | `oklch(32% 0.012 75)` | dark warm gray UI |
| `--color-neutral-content` | `oklch(96% 0.004 75)` | |
| `--color-info` | `oklch(60% 0.12 240)` | |
| `--color-info-content` | `oklch(98% 0.01 240)` | |
| `--color-success` | `oklch(58% 0.12 150)` | |
| `--color-success-content` | `oklch(98% 0.01 150)` | |
| `--color-warning` | `oklch(75% 0.15 70)` | |
| `--color-warning-content` | `oklch(25% 0.02 70)` | |
| `--color-error` | `oklch(58% 0.20 25)` | destructive (remove editor) |
| `--color-error-content` | `oklch(98% 0.01 25)` | |

Geometry tokens, so the admin does not inherit the host's radius and border feel:
`--radius-selector: 0.5rem`, `--radius-field: 0.5rem`, `--radius-box: 0.75rem`,
`--size-selector: 0.25rem`, `--size-field: 0.25rem`, `--border: 1px`.

Font: `system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`.

## Files

`src/lib/components/AdminLayout.svelte`: add `cairn-admin` to both root divs, add the
scoped `<style>`, update the header comment. One file in the package, no contract change,
no new export, no per-site edit.

## Verification

- Package: `svelte-package` emits cleanly, `vitest` green (no logic touched).
- Both sites: `svelte-check` 0/0, Cloudflare `npm run build` OK (workspace symlink).
- `wrangler dev` smoke on both sites (the real neutrality test, since the host themes
  differ): `/admin/login` renders Warm Stone, not the host palette or fonts.
- Visual confirmation in Firefox (user step): the admin looks identical on ecnordic and
  907, warm-gray with violet, system-ui, regardless of each host's theme.

## Release

Ships as a cairn-cms minor (the established Pass P pattern): publish via OIDC, both sites
repoint and regenerate lockfiles, both CI deploys green. The code lands and is verified
locally this pass; the publish folds with the next admin-UI release.
