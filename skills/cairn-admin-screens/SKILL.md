---
name: cairn-admin-screens
description: Build or review a screen inside a cairn site's /admin, to the register cairn's own admin holds itself to. Load before touching anything under /admin routes, admin-toolkit components, or cairn-admin.css. Points at cairn-audit's mechanical checks and cairn-audit norms rather than restating them.
---

# cairn admin screens

This skill teaches an agent to build or review a screen inside a cairn site's `/admin`, to the
same register cairn's own admin holds itself to. Load it before touching anything under `/admin`
routes, admin-toolkit components, or `cairn-admin.css`.

The rules a builder needs to hold in working memory are only the ones no tool can check. Every
mechanical rule already runs as a `cairn-audit` check; this file points at the check rather than
restating its formula, and `cairn-audit norms <selector-or-role>` answers "what does this
component usually measure" as data instead of inference from a screenshot.

## Tier map

`cairn-audit` (static: `npx cairn-audit`; rendered: `npx cairn-audit --rendered`, against a
running dev server, both themes) runs twenty rules across two modes: nine static, all error
tier, and eleven rendered, five error and six advisory. Full descriptions live in
[`docs/reference/cairn-audit.md`](../../docs/reference/cairn-audit.md).

**Static, error tier:** `no-uncompiled-class`, `type-scale`, `gap-scale`,
`stock-default-hazards`, `token-colors`, `grammar-boundary`, `focus-parity`, `motion-band`,
`reduced-motion`.

**Rendered, error tier:** `one-filled-action`, `focus-renders`, `interactive-contrast`,
`touch-targets`, `viewport-overflow`.

**Rendered, advisory tier** (a compositional question a legitimately novel component can answer
differently on purpose; reported, never gating): `chip-ground-collision`, `border-contrast`,
`weight-budget`, `norms-bands`, `screen-anatomy`, `relational-spacing`.

Two register rules the audit cannot check mechanically, because they need the builder's own
judgment about what the screen is for:

- **One filled action, chosen deliberately.** `one-filled-action` catches a second accent fill;
  it cannot tell you which control on a new screen deserves the one it allows.
- **Chip passivity.** `StatusChip` carries two registers: `bounded` (`register="bounded"`, the
  default) for a chip that must read as an object with a real boundary, and `quiet`
  (`register="quiet"`) for a settled or put-away state that should recede rather than announce
  itself. Use quiet for the state a list mostly sits in (Published, Closed); reserve bounded for
  a state that needs attention (Draft, Overdue, Pending).

## The done-gate

A screen is done, in order, only after:

1. **The static audit passes.** `npx cairn-audit` against the routes and components you touched.
2. **The rendered audit passes**, both themes, against your own running dev server:
   `npx cairn-audit --rendered`.
3. **For a derivation or any composition the toolkit doesn't already cover**, run the shipped
   grader prompt (`references/grader-prompt.md`) against your own multi-state captures, and fix
   what it finds.

Run all three before you call a screen finished, not only when someone else reviews it: the
rendered checks catch what static analysis cannot see, and running them for the first time at
review turns every one of their catches into the refinement round this skill exists to avoid.

A clean audit means the screen's vocabulary is correct. It does not mean the screen is done: a
screen can be vocabulary-clean and still not compose. Report a green audit as exactly that, never
as design-done.

If you added a suppression to get here, say so in your own report. A build that passes by
suppressing a finding is a disguised failure, not a pass.

## References

`references/` carries the material that does not need to load every time: the annotated
exemplars, the form-anatomy contract, the extension grammar, the craft chapter, and the grader
prompt. See `references/README.md` for what is there and when to reach for it.
