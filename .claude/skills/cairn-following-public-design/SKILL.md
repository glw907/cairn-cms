---
name: cairn-following-public-design
description: Follows cairn's public design system when you work on the public reading theme (Waymark): its tokens, prose styles, and layout rules. Use when editing src/lib/public, public CSS, or a theme for the public pages of a site built on cairn.
paths:
  - "src/lib/public/**"
  - "templates/waymark/**"
---

# Following the public design

Read `references/public-design-system.md` before any public theme work. It describes Waymark, cairn's public reading theme, the counterpart to the admin's Warm Stone.

The library is design-agnostic: public output carries no look of its own, and each site brings its own `render` and its own theme. The design system governs the shipped starter and the tokens a site restyles, not a rule a site must follow.

## References

- `references/public-design-system.md`: the public design system.

For the admin interface, use the `cairn-following-admin-design` skill instead.
