---
paths:
  - "src/lib/admin/**"
  - "src/lib/admin-toolkit/**"
  - "scripts/build/admin-css*"
---

Load the `cairn-following-admin-design` skill before you change the admin interface. `data-theme`
goes on a bare wrapper, never on a styled element. A home-grown component needs a dated ruling in
`docs/internal/engine-rulings.md` that records the DaisyUI defect forcing it.
