# Cairn engine hardening: design and scope

Status: design, 2026-06-26. The pre-cutover engine-hardening effort, prioritized ahead of the Contract
v2 cutover (Geoff's call: land the breaking cutover on a hardened engine, no hurry to cut over). Written
to the Google developer documentation style.

## Why this, now

Contract v2 Plan 1 (the additive `fields.*` foundation, shipped as `0.66.0`) surfaced four validator
carry-forwards, and a two-agent verification sweep of the wider backlog separated the genuinely open
engine debt from items that had already shipped or been killed. The sweep pruned five "backlog" items
that were already done (the manifest-bin `config.root` fix, the render attribute-sink hardening, the
automated admin-render DOM gate, the editor link-picker narrowing, the create-form slug preview) and
caught a stale append-only friction-log entry that resurfaced a killed feature (the point-of-typing
writing coach, discarded in the 2026-06-23 help-shell adversarial review as the Clippy pattern). The
verified, pruned inventory below is the scope.

A standing principle for this effort, the same way documentation is a pass dimension: each pass folds in
any engine-issue or DX finding it surfaces, captured to the friction log or a memory and triaged into the
work if cheap, or carried forward if not.

## Structure: two passes, then the cutover

The work splits along its two verification surfaces.

1. **Validator and fields parity + unification.** The cutover's spine, gated by a parity test matrix.
   Isolated first because the cutover removes the v1 validator and swaps to v2, so v2 must first be a
   proven drop-in replacement.
2. **Engine-misc hardening.** The accessibility, design-system, component-authoring, and gate-hygiene
   items, mostly independent of each other.

The Contract v2 cutover follows once both land.

## Pass 1: validator and fields parity + unification

Today two validators run in parallel: v1 (`content/validate.ts` `validateFields` plus `content/schema.ts`
`applyRules`/`compilePatterns`, driven by `defineFields`) and v2 (`content/fieldset.ts` `validateField`,
driven by `fieldset`). v2 enforces a strict subset, and the two have already drifted (v2 accepted
non-finite numbers that v1's type set never had, fixed in `0.66.0`).

The design is one shared coercion-and-constraint core, used by both validators, which closes the parity
gap and the drift surface in one move:

- **Extract a shared per-type coerce-and-constrain core.** A function over `(descriptor, rawValue,
  clock)` returning a normalized value or a field error, factored from v1's `applyRules`/`validateFields`
  and v2's `validateField`. Both validators call it; v1 adapts its `FrontmatterField` to the call, v2
  calls it directly. The cutover later deletes v1 and the adapter, leaving the core as v2's only path.
- **Reach full constraint parity in v2.** Through the shared core, v2 gains the text `min`/`max`/`length`/
  `pattern` and date `min`/`max` checks it lacks today, including the loud declaration-time pattern
  compilation `compilePatterns` does (a bad pattern fails at config time, not on every save). Fix the
  masking test fixture (`fieldset-validate.test.ts` declares a dead `max: 5`).
- **Parsed-YAML input symmetry.** The shared core reads a parsed value, not only a form string: a numeric
  `number`, an ISO `datetime`, the way the `date` arm already coerces a parsed `Date`.
- **The multiselect scalar decision: coerce a lone scalar to a single-element list.** A hand-edited
  scalar `tags: news` becomes `['news']`, matching author intent and cairn's forgiving-while-authoring
  posture, rather than dropping silently or mis-reporting a `required` error. (Chosen over a must-be-a-list
  error.)

**The gate is a parity test matrix.** Representative and randomized frontmatter inputs run through a v1
`defineFields` schema and an equivalent v2 `fieldset` over the overlapping types (text, textarea, date,
boolean, image), asserting identical `{ ok, data | errors }`. Because both call the shared core, they
agree by construction; the matrix proves it and guards against future drift. v2's new types (number, url,
email, select, multiselect, datetime) keep their own correctness tests. The existing unit, integration,
and component suites stay green.

## Pass 2: engine-misc hardening

Each item is independent and well-understood; the verification sweep located every one.

- **Component picker dialog sizing.** `ComponentInsertDialog.svelte`'s `modal-box` has no height cap and
  violates the admin design system's own rule (`max-height: min(content, 85vh)`, the box as scroll
  container, no page takeover). Add the cap per the design system; the picker and palette share the rule.
- **Error live-region re-announce.** The content-lifecycle errors in `ConceptList.svelte` use static
  `role="alert"` containers; a repeated identical error is not re-announced. Add a polite live region that
  re-announces, on the `MediaPicker` settle-cue precedent.
- **`ComponentDef.icon` guidance plus engine defaults.** The engine ships no default role-to-icon table
  (the ROADMAP wording assumed one). Add an engine default `defaultIconByRole`-style fallback table, plus
  the "logically representative, prefer distinct" guidance in the registry contract JSDoc, the picker
  spec, and `docs/reference/components.md`.
- **Empty `rehype-dispatch` JSDoc.** `isElement` and `strProp` (exported) carry empty `/** */` shells;
  give each a real one-line contract so the reference and jsdoc gates have substance, not just a passing
  shape.
- **Admin-prose gate blind spot.** `check:prose` skips `<script>`-level string arrays and `.ts` copy
  modules (`markdown-reference.ts`, `editor-shortcuts.ts`), so prose tells there rely on the
  `prose-voice-reviewer` agent, not a mechanical gate. Extend the extractor to cover them.
- **The owed `check:dev-package` gate.** A dedicated gate over `packages/**` (a tsc pass plus the comment
  lint), owed since the dev-package split, before Contract Part C publishes it.
- **Friction-log triage and prune.** Annotate the killed (the coach) and shipped (the five pruned items
  above) entries as resolved, so the append-only log stops reading heavier than the live backlog and
  stops resurfacing dead work.
- **Lockfile version sync.** `package-lock.json` self-version lags `package.json` (`0.64.0` vs `0.66.0`);
  sync it. Cosmetic, `npm ci` tolerates it, but it is accumulating.

Plus a standing watch (no action this pass): track SvelteKit's `checkOrigin` removal (#15992) and act
before a major lands.

## Out of scope

Feature initiatives, not hardening, each its own slot: the editor-help later slices (the screen-contextual
slide-over, the route-and-concept-keyed help manifest), a per-field advisory adapter seam with live slug
recompute, `supportContact` name-plus-contact personalization, the date-vs-publish field redesign, and the
Media Library direct upload. The point-of-typing writing coach stays killed.

## Execution

Per Geoff's call, this runs as a workflow. Pass 1's shared-core extraction and parity work is sequential
and correctness-critical, so it runs as a careful pipeline with the parity matrix as the verify stage.
Pass 2's items are independent and run with more parallelism. The main loop reviews each pass's diff and
clears the full gate (`npm run check` 0/0, `npm test` exit 0, the doc gates) before the cutover.
