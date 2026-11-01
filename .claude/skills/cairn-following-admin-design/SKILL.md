---
name: cairn-following-admin-design
description: Follows cairn's admin design system when you create or change anything on the /admin interface: the Warm Stone tokens, type, component recipes, voice, and the DaisyUI-first rule. Use when editing src/lib/admin, src/lib/admin-toolkit, cairn-admin.css, or an admin screen in a site built on cairn.
paths:
  - "src/lib/admin/**"
  - "src/lib/admin-toolkit/**"
  - "scripts/build/admin-css*"
---

# Following the admin design

Read `references/admin-design-system.md` before any admin markup or style change. It holds the Warm Stone tokens, the type scale, the component recipes, the interface voice, and the load-bearing rules the markup does not show.

Two rules decide most reviews:

- `data-theme` goes on a bare wrapper element, never on a styled one. A styled element that carries it recolors its own border and background in ways the tokens do not predict.
- Use a stock DaisyUI component. A home-grown one needs a dated ruling in `docs/internal/engine-rulings.md` that records the DaisyUI defect forcing it. The `daisyui` skill is the component reference, and this design system wins where the two disagree.

## References

- `references/admin-design-system.md`: the design system. Read first.
- `references/daisyui-v5-hard-components.md`: researched DaisyUI v5 markup for timelines, detail two-panes, and similar hard components. Read when a screen needs one.
- `references/cm-editing-surface-alignment.md`: how the CodeMirror editing surface takes the Warm Stone language. Read when touching the editor surface.
- `references/daisy-absorption-ritual.md`: the check to run against each DaisyUI release that renames or drops a class the blessed set depends on. Read when a Dependabot PR bumps DaisyUI.

Keep the design system current when the design language changes. The audit rules in `src/lib/audit/` cite it, so a rename needs the citations repointed.
