# Run cairn-audit and fix its findings

Contents:

- [Run and read](#run-and-read)
- [Fix a finding](#fix-a-finding)
- [Static rule ids](#static-rule-ids)
- [The log rules](#the-log-rules)
- [Scope and suppress](#scope-and-suppress)
- [The rendered pass](#the-rendered-pass)
- [Exit code 2](#exit-code-2)

## Run and read

1. Run the audit before the first edit, so the fix answers the findings it names:
   `npm run check:cairn` on a scaffolded site (it builds the admin sheet, then runs `cairn-audit`),
   or `npx cairn-audit` elsewhere. It needs `daisyui` and `tailwindcss` installed.
2. Read each finding line: file and line, tier, rule id, message. Look the rule id up below.
3. Gate on the exit code, never on the text (the line format is not a contract): `0` clean, `1` an
   unsuppressed finding at the gating tier (error by default; `--fail-on advisory` gates on both),
   `2` the run broke.
4. Rerun after the fix and report each rule id that fired, what it required, and the final exit code.

## Fix a finding

Fix the markup that raised it. An error finding on a screen the site just added is a defect, not a
reason to suppress, widen a scope, or edit the audit's rules, the engine's stylesheet, or
`node_modules`. Suppress only a finding that is deliberate, with a recorded reason. Adding a
`cairn-audit.config.json` to narrow the scope around a failing file is a scope change, not a fix.

Two findings a new admin list meets most:

- **`list-role`.** A `<ul>`, `<ol>`, or `<menu>` with no `role` whose marker is suppressed: `list-none`
  or `list-style: none`, or an item whose own class changes its display (`flex`, `grid`, `block`,
  `inline-flex`; daisyUI `.list-row` is `grid`). VoiceOver stops announcing it as a list. Fix: add
  `role="list"` to the list and `role="listitem"` to each item whose class changed its display. A
  hidden item (`hidden`) does not count, and a list with another explicit role is exempt. The static
  rule sees only an element's own classes; the rendered pass catches a parent selector such as
  `.menu :where(li)`.
- **`stock-default-hazards`.** A stock daisyUI pattern cairn's recipes replace. `badge-ghost` (any
  element) becomes a chip register: `StatusChip` from `@glw907/cairn-cms/admin-toolkit`, or the
  `cairn-chip-quiet`, `cairn-chip-warning`, or `cairn-chip-outline` class. A bare focus-driven
  `.dropdown` takes a `popover` attribute or an explicit `class:dropdown-open` toggle. A native
  `disabled` on a guarded button becomes `aria-disabled`. A flat `base-300` card border, and the retired
  `cairn-btn-guarded` class, each name their replacement in the message. Three advisory arms on a
  `btn` name `btn btn-neutral`, `btn btn-soft btn-primary`, or drop a `shadow-none`.

Keep the screen's behavior while fixing: the same rows, the same marker text on the same rows.

## Static rule ids

Error tier unless marked advisory. For the admin design register behind them, load
`cairn-building-admin-screens`.

| Rule | Flags |
|---|---|
| `no-uncompiled-class` | A class that compiles into neither the admin sheet nor the component's scoped `<style>` |
| `type-scale` | A text size not from a `--cairn-type-*` role |
| `gap-scale` | A bracket spacing literal off the gap roles and off Tailwind's half-step grid |
| `radius-scale` (advisory) | A corner that is not `rounded-selector`, `rounded-field`, or `rounded-box` |
| `stock-default-hazards` | See above |
| `token-colors` | A hex, `rgb()`, named, or zero-chroma color literal (files in `static.paletteFiles` exempt) |
| `grammar-boundary` | CSS redeclaring a grammar token |
| `focus-parity` | A hand-written `:hover` with no `:focus-visible` (or `:focus-within`) sibling |
| `motion-band` | A duration outside 70ms to 400ms, or `transition: all` |
| `motion-property` | A transitioned property off the motion allowlist |
| `motion-vocabulary` | A literal duration or easing instead of `--cairn-dur-*` and `--cairn-ease-*` |
| `motion-hover-gate` | A `:hover` transition outside `@media (hover: hover)` |
| `reduced-motion` | Motion with no `prefers-reduced-motion: reduce` counterpart |
| `stripe-trim-parity` | A zebra stripe beside an unconditioned first/last-child padding trim |
| `unlayered-font-clobber` | A scoped unlayered font declaration on an element that also carries a font utility |
| `list-role` | See above |
| `log-event-grammar` | See below |
| `log-secret-field` | See below |
| `public-literals` (advisory) | A color literal or absolute font size in a public file |
| `theme-conformance` (advisory) | A public theme block missing keys, or a `var()` that resolves nowhere |
| `theme-contrast` (advisory) | A public text pair under 4.5:1 or a focus ring under 3:1 |

The three public rules are `cairn-styling-public-pages` territory. `suppression` is the id of a bad
suppression directive.

## The log rules

Both scan `static.sourceScope` (default `src`), not the admin scope, and read only calls shaped
`<ident>.info(`, `.warn(`, or `.error(` whose first argument is a plain string literal. They cannot
tell a cairn logger from `console.info` or another library, and they never see a computed name, a
template literal, or a re-exported logger.

- `log-event-grammar`: the literal reuses a name `CairnLogEvent` reserves, or does not read as
  `area[.subject].verb_phrase`. Rename the event.
- `log-secret-field`: a key in the fields argument whole-matches (never a substring) a member of
  `REDACTED_LOG_KEYS`. Through `createLogger` the value is already redacted, but on a bare `console`
  call it ships as written; either way, keep the secret out of the message string too. Move the call
  to `createLogger` and drop the field.

A file reached only through `static.sourceScope` honors a suppression directive but skips the
honesty checks (reason required, dead directive), since a raw text walk cannot tell a real directive
from one inside a string or fixture.

## Scope and suppress

`cairn-audit.config.json` at the run directory (or `--config <path>`) replaces a scope, never merges:

- `static.scope` (default `src/routes/admin`, `src/lib/admin`, `src/lib/admin-toolkit`): list every
  root that holds admin components, defaults included. Keep custom admin components under
  `src/routes/admin` or `src/lib/admin`, which the admin sheet's `@source` also compiles.
- `static.adminScope`: same defaults; the three admin-only motion rules read only these.
- `static.cssFiles`: standalone CSS files the CSS rules also read.
- `static.sourceScope`: where the log rules walk.
- `sheet`: the compiled sheet or sheets classes resolve against. A missing path exits 2.

To suppress a deliberate finding, put the directive on the line before it, with the rule id and a
reason. A directive with no reason, or one that silences nothing, is itself an unsuppressible
`suppression` error. A suppressed finding still counts on the report's last line.

```text
<!-- cairn-audit-disable-next-line <rule id> -- <reason> -->
<the element the finding names>
```

## The rendered pass

`cairn-audit --rendered` drives Chromium over a running site in both themes.

1. `npm i -D playwright && npx playwright install chromium`; build and serve the site
   (`npm run preview`, port 4173 on the scaffold). Set `BASE_URL` if it serves elsewhere.
2. Sign in, copy `cairn_session` (`__Host-cairn_session` on https), and
   `export CAIRN_AUDIT_COOKIES='cairn_session=<id>'`. Without it the run refuses with exit 2 rather
   than audit the sign-in card. A `cairn-admin-theme` entry is refused.
3. The default pages are `/admin/posts`, `/admin/pages`, `/admin/vocabulary`, `/admin/media`,
   `/admin/editors`, `/admin/login`. A site with other concept names sets `rendered.pages` (keep
   `/admin/login` in it); `rendered.extraPages` adds custom screens. A page answering outside 2xx
   exits 2.
4. Exempt a deliberate rendered finding with a `rendered.allowlist` entry: `page`, `selector`,
   `reason`, and `rule`. Without `rule`, a stale or dead entry reports at error tier.

## Exit code 2

The message after `cairn-audit:` names the cause: a missing scope root, sheet, or config file; a
missing `daisyui` or `tailwindcss` peer; Playwright not installed; `BASE_URL` unreachable;
`CAIRN_AUDIT_COOKIES` missing or malformed; a page outside 2xx; a bad `--fail-on` value.
