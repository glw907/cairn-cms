# Render attribute-sink hardening (engine-hardening pass 2): design

**Status:** approved 2026-06-05, ready for a plan.
**Series:** engine-hardening, pass 2 of 3 (after surface-narrowing, before URL-identity consolidation),
sequenced before P4 so the scaffolder templates the hardened surface.
**Predecessor memory:** `cairn-render-sanitize-gap` (the residual this pass closes),
`cairn-engine-hardening-release-gate` (the series).

## Problem

The render-safety pass (0.17.0) put a `rehype-sanitize` floor in `createRenderer`. The floor runs after
`rehype-raw` and before the component dispatch, so it cleans author content (raw HTML, link URLs, slot
bodies) while the site's trusted `build()` output and inline SVG icons run after it untouched. That
placement is deliberate and correct for what it protects.

It leaves one residual. The component dispatch runs `build(ctx)` after the floor, and `build` reads
`ctx.attributes[key]`, the raw author-written attribute string. A `build()` that routes an attribute value
into a dangerous position re-opens the vector the floor closes. The sinks are URL-bearing attributes
(`href`, `src`, and kin), inline event handlers (`on*`), and `style`. The build *code* is trusted
site-developer code. Its *inputs* are author-controlled, so a malicious, compromised, or careless editor
can put `javascript:alert(1)` in an attribute that a `build()` writes to an `href`.

Today this is documented as a `build()` contract caveat. The planned sites route attribute values into
class positions only, so it has never been exercised, but the gap is real and it is release-gated before
the next publish. Cairn's trusted-editor model makes this a malicious-or-compromised-editor and
paste-mistake exposure, not anonymous input.

## Decision

Close the residual by construction, the same posture the floor already takes. Add one internal
post-dispatch rehype transform, `rehypeSinkGuard`, that walks the fully-built tree and neutralizes the
three sink classes regardless of which plugin or which site `build()` produced the node. The guard runs
last in the rehype chain and is gated by the same `unsafeDisableSanitize` flag as the floor, so one switch
governs the whole sanitize posture.

This was chosen over two alternatives. A second full `rehype-sanitize` pass after the dispatch would strip
the trusted SVG icons and any benign structure a `build()` emits, unless the schema re-enumerated
everything every site could produce, which is the coupling the pre-dispatch placement was built to avoid.
Pulling `hast-util-sanitize`'s URL utilities in per-attribute adds moving parts for the same result and
leaks library internals. The focused transform mirrors the `rehypeAnchorRel` transform already in
`sanitize-schema.ts`, stays narrow enough to spare trusted output, and is unit-testable element by element.

## What the guard neutralizes

The guard visits every element in the final hast tree.

**URL-bearing attributes.** The guarded set is `href`, `src`, `srcSet`, `xlinkHref`, `poster`, and
`formAction`. The value's scheme is normalized before the check: trim, strip control characters and
interior whitespace, lowercase. A relative or anchor URL has no scheme and is always safe. A scheme is
allowed when it is in the same allowlist the floor admits, the `hast-util-sanitize` `defaultSchema` safe
schemes plus `cairn:`. Any other scheme (`javascript:`, `data:`, `vbscript:`) means the attribute is
removed. `srcSet` is split into its candidate URLs; one unsafe candidate removes the whole attribute.

`data:` is stripped to match the floor exactly. No `data:image` exception lands this pass. Neither
production site uses `data:` URLs, and matching the floor beats a special case.

**Inline event handlers.** Any property whose name matches `/^on/i` (`onclick`, `onerror`, `onload`, and
the rest) is removed. The floor already strips these from author HTML; the guard catches a `build()` that
sets one.

**Inline style.** The `style` property is removed from every element. This is a blanket strip, matching
cairn's floor (which already strips author `style`) and the safe-by-default posture of the major
sanitizers (DOMPurify, sanitize-html, and Bleach all strip `style` by default, and admit it only behind a
CSS property allowlist, never a denylist token-scan). A denylist token-scan was considered and rejected as
the one industry-discouraged option, since CSS obfuscation defeats a regex denylist. Cairn's styling is
class-driven, and the `stagger` feature deliberately carries an inert `data-rise` ordinal so a floor can
drop `style`, so a `build()` emitting inline style already runs against the architecture. A site that
later needs build-driven dynamic styling gets a declared safe channel (an inert `data-*` ordinal or a
class) as a deliberate feature, not an open sanitizer hole now.

Neutralization is silent. The dangerous value is removed, the element renders inert, and the build still
succeeds. This matches the floor and keeps one editor's bad paste from failing the whole site build.

## Placement and configuration

`rehypeSinkGuard` is added to the rehype plugin list in `createRenderer`, after `rehypeDispatch` and after
`rehypeAnchorRel`, so it inspects the final tree any other transform may have touched. It is conditional on
`!options.unsafeDisableSanitize`, the same gate as the floor, so the developer-only escape hatch turns the
floor and the guard off together. The guard takes no new public option. The protocol allowlist is derived
from `defaultSchema.protocols` plus `cairn`, the same source the schema builder uses, so the floor and the
guard cannot drift on what a safe scheme is.

The guard is internal. It lives in `src/lib/render/sanitize-schema.ts` beside `rehypeAnchorRel` and
`buildSanitizeSchema`, and it is not exported from any public barrel, so the pass adds no public surface to
the one just narrowed in pass 1.

## What stays untouched

The trusted SVG glyph emits `<svg>` and `<path d>` with no guarded attribute, so it passes through
unchanged (verified against `glyph.ts`). Neither the engine render code nor the showcase `build()`
functions route anything into a guarded sink today (verified by grep), so the guard strips nothing
legitimate in the current corpus. The directive markers (`data-primitive`, `data-slot`, `data-role`,
`data-rise`, and the `data-attr-<key>` stamps) are not guarded attributes, so the dispatch and the stagger
feature are unaffected. The `cairn:` link token is preserved; the resolver rewrites it, and an unresolved
one stays an inert visible signal.

## Edge cases the implementation must handle

- Missing or null properties are a no-op.
- Array-valued properties such as `className` are skipped; they are not URL attributes.
- Scheme detection is case-insensitive and resists whitespace and control-character obfuscation
  (`java\tscript:`, a leading space, mixed case).
- `srcSet` carries multiple URL candidates; any one unsafe candidate removes the attribute.
- Safe schemes and relative URLs (`http:`, `https:`, `mailto:`, `tel:`, `cairn:`, `/path`, `#anchor`) are
  preserved.

## Testing

Test-first, three layers.

- **Unit, on `rehypeSinkGuard` directly.** Feed hast elements carrying `javascript:`/`data:`/`vbscript:`
  in each guarded URL attribute, obfuscated schemes, `onclick`/`onerror`, an inline `style`, and a
  multi-URL `srcSet`. Assert each is neutralized. Feed the safe cases (`http`, relative, anchor, `mailto:`,
  `cairn:`) and assert they survive.
- **Integration, through `createRenderer`.** Register a component whose `build()` deliberately routes an
  attribute value into `href`, `src`, `style`, and an `on*` handler. Render markdown that uses it. Assert
  each sink is neutralized in the delivered output, and that `unsafeDisableSanitize: true` lets the raw
  value through (the hatch covers the guard too).
- **Regression, no behavior change for safe content.** A benign `build()` and the SVG glyph survive
  byte-for-byte, and the existing render-pipeline snapshot stays byte-identical (no `-u`).

## Documentation, version, gate

- Sharpen the `build()` contract in `docs/render-sanitize-floor.md` and the `createRenderer` reference: the
  attribute-sink rule is enforced now, not advised.
- Add a `CHANGELOG.md` entry describing the enforcement, with a behavior note naming the edge a site should
  check (a `build()` emitting a non-standard URL scheme, an `on*` handler, or inline style). This is a
  security fix and not a break for a legitimate consumer, so no `Consumers must:` line is required.
- Update the `cairn-render-sanitize-gap` memory to record the residual closed.
- Minor version bump to `0.28.0`, accumulating on `main` with the unpublished `0.27.0`.
- Pass-end review gate: the simplifier over the changed render files plus a high-effort `/code-review` with
  attention to the scheme-normalization edge cases. The Worker, auth, Svelte, and a11y reviewers and the
  live `/admin` smoke do not apply, since the pass changes no auth, Worker, or admin-UI surface. Run on
  `main` directly, the same as pass 1.

## Out of scope (logged, not built)

A typed `url` attribute field, validated at editor time and at content load through the
schema-source-of-truth model, would give an editor early feedback before a value ever reaches a sink. It is
a separate verification surface and a DX feature, so it is a follow-up for a later pass or P4, not part of
this enforcement floor.
