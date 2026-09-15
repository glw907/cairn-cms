# Animate a custom screen

**Contract:** any motion your own admin screen authors follows the same token vocabulary the
shipped admin uses, and `npx cairn-audit` checks it the same way it checks the engine's own
screens.

**Precondition:** [Add a custom admin screen](./add-a-custom-admin-screen.md), so you have a
route under `/admin` to animate.

**The design system's Motion section is canonical.** This page cites its rules by name rather
than restating them; see [the admin design
system](../internal/admin-design-system.md#motion) for the full token table, the DaisyUI vendor
disagreements, and the named limitations.

## The tokens you write

Eight custom properties, already declared on the two admin theme roots. Write these names in your
own screen's CSS or Tailwind arbitrary values rather than a literal duration or curve:

`--cairn-dur-instant` (`70ms`), `--cairn-dur-quick` (`110ms`), `--cairn-dur-base` (`150ms`),
`--cairn-dur-shift` (`240ms`), `--cairn-dur-settle` (`400ms`), `--cairn-ease-standard`,
`--cairn-ease-entrance`, `--cairn-ease-exit`.

A bare `transition` utility with no duration or timing class already resolves to
`--cairn-dur-base` and `--cairn-ease-standard`, since the admin root sets both as the CSS
transition defaults. You only need to reach for a token by name when a case wants a different
band or curve.

## The four rules

`npx cairn-audit` runs four rules over your admin screens, three at error tier and one advisory:

- **`motion-property`** fails a transition or animation naming a property outside the allowlist,
  or naming one of the nine layout properties named as errors (`width`, `height`, `top`, `left`,
  `right`, `bottom`, `margin`, `padding`, `font-size`). The fix message tells you to drop the
  property or move it onto the one frame-offset allowance below.
- **`motion-vocabulary`** fails a literal duration or easing value, `250ms` or a raw
  `cubic-bezier(...)`, where a `--cairn-dur-*` or `--cairn-ease-*` token belongs. The fix message
  names the nearest token.
- **`motion-hover-gate`** fails a hand-authored `:hover` rule that declares a transition or
  animation and is not wrapped in `@media (hover: hover)`. The fix message asks you to add the
  guard.
- **`motion-reduced-delay`** (advisory, rendered) flags a computed nonzero `transition-delay` or
  `animation-delay` under a reduced-motion emulation, since a delay that survives reduced motion
  makes an interface merely late rather than either moving or snapping.

All three static rules are `adminOnly`: they resolve over `static.adminScope`, not your site's
whole tree, so a transition in your marketing pages never trips them.

## The three join limits

The audit's class-join half, which reads Tailwind utility classes rather than authored CSS rules,
carries three limits worth knowing before you rely on it:

- **Vendor DaisyUI classes are exempt.** `motion-property` and `motion-vocabulary` do not convict
  `.btn`, `.modal`, `.drawer`, `.collapse`, and DaisyUI's other component classes, even where the
  vendor's own sheet disagrees with the language (see the design system's eleven vendor
  disagreements). The exemption also covers the six Tailwind transition utilities
  (`transition`, `transition-all`, `transition-colors`, `transition-opacity`, `transition-shadow`,
  `transition-transform`); an arbitrary form like `transition-[color]` is not exempt and is
  checked normally.
- **A bound or interpolated attribute value claims no allowance.** The frame-offset allowance
  (below) only recognizes `data-cairn-motion="frame-offset"` as a literal static string. A value
  built from a variable or an expression reads as absent.
- **The allowance is one element per screen, counted in document order.** A screen is one
  component file. The first element carrying the attribute passes; a second carrying element in
  the same file is convicted, so the allowance can't be spread across a file one element at a
  time.

## The frame-offset allowance

A frame offset is a page-level mode change where a persistent frame column collapses and your
content column's offset moves, the same shape as the admin's own zen mode. If your screen has one,
claim the one property allowance rather than reaching for a suppression comment.

Give the moving element `data-cairn-motion="frame-offset"`, and it may transition `margin-left`
and nothing else:

```svelte
<div data-cairn-motion="frame-offset" class="transition-[margin-left]" style:margin-left={offset}>
  ...
</div>
```

The exception is keyed on the attribute plus the property. There is no file key and no selector
key: a second layout property on the carrying element is a finding, and a second element carrying
the attribute on the same screen is a finding on that second element. At most one such element per
screen.

## Splitting a hover and focus selector list

The one non-obvious authoring step `motion-hover-gate` asks for: if your own rule pairs a hover
and focus state in one selector list, for example

```css
.my-control:hover, .my-control:focus-visible {
  border-color: var(--cairn-color-accent);
}
```

split the list before wrapping it in the hover guard. Wrapping the whole list would carry
`:focus-visible` into `@media (hover: hover)` and remove focus motion for a keyboard attached to a
touch device:

```css
@media (hover: hover) {
  .my-control:hover {
    border-color: var(--cairn-color-accent);
  }
}
.my-control:focus-visible {
  border-color: var(--cairn-color-accent);
}
```

`motion-hover-gate` ships a fixture that fires on a `:focus-visible` alternative left inside the
guard by mistake, so getting the split backward is itself detected.

## Configuration you may owe

Neither of these is required by default.

- **`static.cssFiles`** already reaches `token-colors`. If you want the CSS-family motion rules
  to read your own theme file too, name it here.
- **`static.adminScope`** defaults to `src/routes/admin` and `src/lib/admin-toolkit`. If your
  admin screens live somewhere else, name their roots here so the three static rules resolve over
  them.

## Reduced motion opt-back-in

Your screen's paint transitions may opt back in under reduced motion, restating the transition
inside the same `@media (prefers-reduced-motion: reduce)` guard with `!important`. This is a
permission, not something cairn's own admin does this pass: each restatement costs one allowlist
entry in your own `custom-surface-budget.json` (`check-custom-surface.mjs` compares the unlayered
rule list to the allowlist by length), so opt back in only where the paint carries information a
reader would otherwise lose, and budget for it. Layout and transform properties stay at the floor
regardless; there is no opt-back-in for those.

## You know it worked when

`npx cairn-audit` runs clean over your screen with no `motion-property`, `motion-vocabulary`, or
`motion-hover-gate` findings, and `motion-reduced-delay` reports nothing new under a
reduced-motion emulation.
