# Schema validation touch-ups (DX pass P2)

This is the second engine DX pass from the ecnordic `0.21` migration audit
(`docs/dx-backlog-ecnordic-migration.md`). The schema-source-of-truth cutover replaced a site's
hand-written validator with one `defineFields` declaration, and in doing so it dropped four validation
rules the old validator enforced. P2 restores them as intrinsic field-type behavior and does one type
widening so a site can share a frozen vocabulary across components. The organizing goal for the whole
DX sequence stays the `create-cairn-site` scaffolder, so the corrected validation surface here is what
the scaffolder template will later capture.

The pass covers backlog items 10 and 12. It tightens validation behavior and widens one type, and it
bumps the version to `0.23.0`. It runs on `main` directly with no site deploys.

## Background: what the primitive already has

The `defineFields` primitive (`src/lib/content/schema.ts`) already owns the rule machinery, so P2 is
filling gaps rather than building infrastructure. The baseline validator `validateFields`
(`src/lib/content/validate.ts`) coerces each field and enforces `required`. The `applyRules` step in
`schema.ts` enforces the opt-in per-field rules: `min`, `max`, `length`, and `pattern` for text and
textarea, and `min` and `max` for date. A `compilePatterns` step compiles each declared regex once at
declaration, so a malformed pattern fails loudly as a site-config error. A `refine` hook runs after the
per-field rules for cross-field and body-dependent checks.

The four rules the cutover dropped map to the gaps this way:

1. A real calendar date. `validateFields` coerces a parsed YAML `Date` to a string but never checks
   that a string-sourced date is a real date, so `2026-02-30` passes.
2. A date format. The canonical `YYYY-MM-DD` shape is never enforced on the string path.
3. The closed `tags` vocabulary. A `TagsField` carries `options`, and the inferred type is the option
   union, but `validateFields` does `value.map(String)` with no membership check, so an out-of-vocabulary
   tag passes.
4. An at-least-one-tag requirement. This one already works through `required: true` on a tags field
   (`validateFields` errors on an empty required tag list), so P2 adds nothing for it.

## Design decisions (settled in brainstorming)

Three forks were settled with the user, each grounded rather than defaulted.

**Date validation is strict by default, with no opt-in flag.** A `date` field always rejects a value
that is not a canonical `YYYY-MM-DD` calendar date. A typed `date` field that does not hold a date is the
kind of bug that should fail loud without configuration. The form already constrains input through
`<input type="date">`, so this guards the YAML and hand-edit paths. One built-in check closes both the
format gap and the real-date gap, which makes a custom `pattern` on a date field unnecessary, so that DX
sub-proposal is dropped as YAGNI.

**Closed `tags` membership is enforced by default, with no `enforced` flag.** A `tags` field declares a
controlled vocabulary through `options`, and the inferred type already promises the option union, so a
value outside the vocabulary is an error. The `freetags` field is the open escape hatch for free-form
tags, so an `enforced` flag on `tags` would duplicate the `tags`-versus-`freetags` split the type system
already draws.

**No tag count bounds.** At-least-one is covered by `required: true`. Numeric count bounds (a minimum or
maximum number of tags) are deferred until a site needs them.

## Item 10: the two intrinsic validator checks

Because both checks are strict-by-default, they are intrinsic to the field type rather than opt-in rules,
so they live in `validateFields` (`src/lib/content/validate.ts`) beside the coercion they extend, not in
the opt-in `applyRules` step. This placement also means a site running a bespoke validator over the
`validateFields` baseline (the engine-fat-rule pattern) inherits both checks for free.

### The date check

A new pure helper `isCalendarDate(s: string): boolean` lives beside `dateInputValue` in
`src/lib/content/frontmatter.ts`, where the rest of the date-string logic already sits. It accepts a
string only when it is exactly ten characters in canonical zero-padded `YYYY-MM-DD` form and names a real
calendar date. It parses the three numeric parts, constructs a `Date`, and verifies the round-trip
(the constructed date's year, month, and day equal the parsed parts), so a JS date-rollover such as
`2026-02-30` becoming March 2 is caught and rejected. A non-padded value such as `2026-1-1` is rejected
too, since the canonical committed form is zero-padded and that is what the form and `dateInputValue`
emit.

In `validateFields`, the `date` case keeps its current coercion (a `Date` instance to `YYYY-MM-DD`, a
string trimmed) and its `required`-empty error. After coercing to a non-empty `text`, it calls
`isCalendarDate(text)` and on failure records the error `"${field.label} must be a valid date
(YYYY-MM-DD)"`.

The check runs before the `min` and `max` date rules in `applyRules`. A malformed date short-circuits in
`validateFields`, which returns its errors before `defineFields` reaches `applyRules`, so `min` and `max`
only ever compare well-formed dates. The existing lexicographic string comparison for `min` and `max`
becomes reliable precisely because the format is now guaranteed.

### The tags check

In `validateFields`, the `tags` case keeps its current coercion (an array mapped to strings, omitted when
empty) and its `required`-empty error. After building the `list`, it checks that every value is a member
of `field.options`. On the first out-of-vocabulary value it records `"${field.label} contains an unknown
value: ${bad}"`, naming the offender so an author can find it. The `freetags` case carries no `options`
and stays open, so it is untouched.

## Item 12: the `readonly` options widening

`AttributeField.options` in the component registry (`src/lib/render/registry.ts`) is a mutable
`string[]`, so a site cannot pass a shared frozen `as const` vocabulary without a type error. P2 widens
it to `readonly string[]`. `TagsField.options` is already `readonly string[]`, so it is the reference
shape.

The widening then sweeps the rest of the public adapter and registry surface for any other declared
option or vocabulary array that a site supplies, and widens each to `readonly` for consistency. Every
consumer of a widened array is checked, and any that assumed mutability is fixed. A vocabulary array is
read-only by use (membership tests and iteration, never mutation), so no behavior changes; this is a
type-level change only.

## Folded-in P1 follow-up: the `summaryFields` declaration check

P1 left `summaryFields` failing open: a concept can nominate a `summaryFields` key that is not a declared
field, and the index silently drops it with no signal. That silent miss is the same class of problem this
pass exists to close, so P2 folds in a declaration-time check.

The check throws at declaration rather than at validate time, mirroring how `compilePatterns` rejects a
malformed regex as a site-config error. The natural home is `normalizeConcepts`
(`src/lib/content/concepts.ts`), which already resolves `summaryFields` to its default and holds both the
declared field list (`config.schema.fields`) and the nominated keys. When a `summaryFields` key does not
match any declared field name, it throws `cairn: concept "${id}" summaryFields key "${key}" is not a
declared field`. A typo or a key not mirrored into the schema then fails loud at config time instead of
producing an empty list card at runtime.

## Testing

Test-first, one behavior per test, in the node `unit` project.

- **Date:** a valid `YYYY-MM-DD` passes; `2026-02-30` (real-date rollover) fails; `2026-13-01` (bad
  month) fails; `2026-1-1` (non-padded) fails; an empty optional date is still omitted; a parsed YAML
  `Date` still coerces and passes. `isCalendarDate` gets its own direct unit cases for the boundary
  inputs, and the `validateFields` and `defineFields` paths get end-to-end cases.
- **Tags:** an in-vocabulary tag set passes and normalizes; an out-of-vocabulary value fails and the
  error names it; a `freetags` field with the same value is unaffected; the `min`/`max` date rules still
  apply after the format check.
- **`summaryFields` declaration check:** `normalizeConcepts` throws on a nominated key absent from the
  schema, and a matching key resolves cleanly.
- **`readonly` widening:** a component def built with an `as const` options array type-checks, which is a
  compile-level assertion the `npm run check` gate enforces.

Unit coverage is the proof surface for the failing paths (the user's call). The showcase keeps a green
production build, which confirms its existing committed dates and tags already satisfy the stricter
checks; no deliberately-failing fixture is added to the showcase.

## Docs and version

- `docs/creating-a-cairn-site.md`: a note that a `date` field validates a real `YYYY-MM-DD` calendar date
  and a `tags` field enforces its declared vocabulary, and that a `summaryFields` key must name a declared
  field.
- `CHANGELOG.md`: a `0.23.0` entry recording the stricter validation behavior, the `readonly` options
  widening, and the `summaryFields` declaration check. The behavior change carries a migration note: a
  site adopting `^0.23.0` whose committed content holds a malformed date or an out-of-vocabulary tag will
  see it fail validation, which is the loud failure the pass restores.
- The version bumps to `0.23.0` (a tightened-validation and type-widening surface).

## Out of scope

- A `pattern` option on date fields (subsumed by the strict built-in check).
- An `enforced` flag on tags (subsumed by enforce-by-default and the `tags`-versus-`freetags` split).
- Numeric tag count bounds (deferred until a site needs them).
- The other DX backlog items, which belong to P3 (render and component authoring) and P4 (the scaffolder).

## Pass-end review gate

- `code-simplifier:code-simplifier` over the changed engine code.
- `svelte-reviewer` does not strictly apply (no Svelte component logic changes); run it only if a form
  component changes to surface the new errors.
- `cloudflare-workers-reviewer` and `web-auth-security-reviewer` do not apply (no Worker, auth, session,
  cookie, or D1 code).
- `daisyui-a11y-reviewer` does not apply (no DaisyUI markup changes).
- A high-effort `/code-review` over the branch diff, with attention to the date round-trip helper and the
  tags membership edge cases.
- Live `/admin` smoke does not apply (no `/admin` surface changed; the showcase runs `adapter-node`).
