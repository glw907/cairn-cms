# CodeMirror integration: aligning the editor chrome to cairn (design)

> Design spec for the CodeMirror integration pass. The goal is that the editor reads as a fully
> integrated part of cairn and shares the Warm Stone admin design language, while CodeMirror stays
> cheap to upgrade and its editing UX is left intact. Provenance: Geoff's steer (2026-06-30) reframed
> this as a deliberate initiative that must **start with a prior-art review**; that review is done and
> its conclusion is baked in below. Pre-spec framing:
> `docs/internal/cm-editing-surface-alignment.md`. Memory: `cairn-codemirror-integration-pass`.

## Goal and the three constraints

The pass holds three constraints that pull against each other. Holding all three is the work.

1. **Full integration, shared design language.** From the editor's point of view, its chrome
   (suggestion popovers, autocomplete, a search panel) should read as cairn admin surfaces, not
   bolted-on third-party widgets.
2. **Easy to upgrade.** Keep narrow seams against CodeMirror's public extension points, not deep
   overrides against its internal `.cm-*` classes. This is the upgrade-resilience discipline the admin
   re-expression sweep applied to DaisyUI and Tailwind.
3. **Do not subvert CodeMirror's editing UX for design purity.** Leverage CodeMirror's accumulated
   UI/UX lessons. Where design consistency would degrade editing (match-highlighting, keyboard
   navigation, IME, selection), consistency yields.

Two production sites depend on the package, and the editor is cairn's core job, so investing in its
integration is in-scope per the charter. The seam stays narrow.

## Prior art (the conclusion that drives the design)

Two research lines were run off the main loop: CodeMirror's own documentation and how major CM6
adopters integrate it. They converge on one pattern.

**Identity-through-facets.** Render cairn's own design-system DOM *through* CodeMirror's public
extension points (`showTooltip` / `hoverTooltip`, `showPanel` / `createPanel`, the completion
`info` / `addToOptions` hooks). Theme only the *documented* writing-surface classes. This is the
single approach that satisfies all three constraints at once: it preserves identity (full DOM
control), keeps upgrades cheap (facet contracts ride the official `^6.0.0` stability promise), and
stays additive rather than overriding CodeMirror's editing.

Load-bearing evidence:

- **Replit** renders "custom React components… in place of critical parts of the editor like the
  search panel, autocomplete tooltips, and context menu" by "passing in a function that returns a DOM
  node", and did it specifically to stop forking CodeMirror. Narrow seam, not deep fork.
- **A Svelte spellcheck demo on discuss.codemirror.net** is the closest precedent to cairn's stack:
  its suggestion popovers are "**not** CodeMirror Linter tooltips… Instead, they're **Svelte
  components** wrapped to function as standard DOM elements." The author (Marijn Haverbeke) raised only
  a correctness refinement: extract text from the syntax tree, not by stripping markup.
- **Obsidian** is the counter-example: because it *is* the app, it skins `.cm-*` internals via CSS, and
  its CM5→CM6 migration guide is the documented cost of that coupling. A redistributable library must
  avoid it.
- **Sourcegraph / Sandpack** confirm the writing-surface half: feed shared CSS variables into a
  `theme`, targeting only documented classes.

Two API limits are locked into the design because CodeMirror enforces them:

- The lint tooltip's outer scaffold (`.cm-tooltip-lint`) and its action buttons are internal.
  `Diagnostic.renderMessage` returns the message body only, not custom action DOM. A fully-recipe
  suggestion popover therefore means **driving our own `hoverTooltip` off the diagnostic state and
  suppressing the built-in lint tooltip** (the Svelte precedent's exact move).
- Autocomplete's dropdown container resists full structural replacement. Marijn deliberately blocks a
  per-option render override to protect match-highlighting. The sanctioned path is `tooltipClass` /
  `optionClass` / `addToOptions` / a custom `info` node, plus theming the container through an attached
  class. Autocomplete keeps a small, bounded internal-class dependency; it does not go to zero.

## The organizing rule (classify once)

Every in-editor CodeMirror surface is exactly one of:

- **Writing surface** — legitimately CodeMirror's text world. Theme it via `EditorView.theme` against
  the documented content classes (`.cm-content`, `.cm-line`, `.cm-cursor`, the gutters), plus cairn's
  own namespaced decoration classes (`.cm-cairn-*`, which are cairn's, not CodeMirror's). Keep the
  current approach; it is idiomatic and stable.
- **Chrome** — popovers, dropdowns, panels, hover cards. Render cairn's own recipe DOM through the
  public extension points. Do not skin CodeMirror's built-in widget internals.

Draw the line once and the whole editing surface gets one rule.

## Surface-by-surface design

### 1. Spellcheck and objective-error popover → recipe `hoverTooltip` (flagship)

Today `buildSpellDiagnostic` and `buildObjectiveDiagnostic` hand CodeMirror an `actions` array, and
CodeMirror renders the tooltip buttons itself (`spellcheck.ts:233`, "no custom popover code"). The
theme then patches `.cm-tooltip.cm-tooltip-lint`, `.cm-diagnostic-info`, and
`.cm-diagnosticAction:focus-visible` (`spellcheck.ts:487-498`). That is the drift: a stock widget in a
thin theme patch, wearing CodeMirror's layout, button chrome, and (until patched) its mono face.

Change:

- **Keep `@codemirror/lint` as the underline/marker mechanism.** The `linter()` sources
  (`spellcheck.ts:692`, `725`) still produce the diagnostics that drive the wavy underline and the
  focus rail. That locked decision holds.
- **Suppress the built-in lint tooltip** for these diagnostics (via the `linter()` `tooltipFilter`, or
  by not routing them to the lint tooltip) and **render cairn's own popover** through `hoverTooltip`
  (and a caret-in-range trigger so the popover is reachable without a pointer, preserving the current
  reachability). The tooltip source reads the diagnostic state for the range under the cursor and
  returns a `Tooltip` whose `create(view)` builds the recipe DOM.
- **Recipe DOM** matches `MediaInsertPopover.svelte`, the recipe sibling: `role="dialog"`,
  `--font-body`, DaisyUI `.btn` for the actions (suggestion, "Add to dictionary", "Ignore"),
  `--cairn-card-border`, `--cairn-shadow`, `--radius-box`. The action handlers dispatch the same view
  transactions the current actions do (apply the replacement, add the word, ignore the range).
- **Result:** the lint-tooltip internal classes (`.cm-tooltip-lint`, `.cm-diagnostic-info`,
  `.cm-diagnosticAction`) drop out of the theme entirely. This surface goes to **zero** internal-class
  coupling.

### 2. Autocomplete dropdown → align via public hooks (honestly bounded)

`autocompletion({ override: completionSources })` is wired for link completions
(`MarkdownEditor.svelte:660`). The dropdown renders with CodeMirror defaults today.

Change:

- Attach a cairn class to the dropdown via `tooltipClass`, and to each row via `optionClass`, then
  style through that scoped wrapper so the dropdown reads as cairn chrome (font, surface, border,
  shadow, selected-row treatment).
- Supply a custom `info` node if we show an info panel, and shape rows through `displayLabel` /
  `addToOptions` rather than overriding the option renderer.
- **Keep CodeMirror's match-highlighting and the completion keymap.** This is constraint 3 in action:
  do not trade the battle-tested completion UX for a purer DOM.
- **Residual coupling, documented:** a small set of completion classes stays in the theme because
  CodeMirror offers no public DOM replacement for the dropdown container. These are inventoried and
  held to a budget (see the gate), not driven to zero. Honesty over fake purity.

### 3. Find/replace search panel → recipe panel on `showPanel` (new capability)

Search is not currently in the editor. Geoff chose to add it in this pass, which also gives the
recipe-panel primitive a real consumer.

- Add `@codemirror/search`. Wire `searchKeymap` into the editor keymap.
- Provide `createPanel` so the panel is **cairn recipe DOM from day one**, never the stock `.cm-search`
  panel. Keep CodeMirror's search *state and commands* (`findNext`, `findPrevious`, `replaceNext`,
  `replaceAll`, the query effects). The one contract to honor: tag the focus field `main-field=true`.
- Recipe DOM: find and replace inputs, DaisyUI `.btn` controls (next / previous / replace /
  replace-all / close), the case-sensitive / whole-word / regex toggles, and a match-count readout, all
  in the admin design language.
- **Accessibility:** focus the main field on open; `Escape` closes and returns focus to `.cm-content`;
  label the controls; a live region announces the match count.

### 4. Writing surface → keep the theme, tune the underline

The wavy underline is locked to `--cairn-warning-ink` (`spellcheck.ts:469`, `482`), reserved so it
never collides with tidy's `--cairn-error-ink` red. Keep the token; tune only the underline's color
and weight so it reads intentionally. No re-architecture of the writing-surface theme.

## The reusable seam

A small internal `editor-chrome` module holds the two recipe primitives, so the popover and the search
panel share one pattern and one a11y contract:

- **`recipeTooltip`** — builds a cairn recipe popover as a `TooltipView` (`{dom, mount, destroy}`) from
  a render function, for the suggestion popover (and any future hover card).
- **`recipePanel`** — wraps `showPanel` / `createPanel` with recipe DOM and the panel a11y contract,
  for the search panel (and any future panel).

Because CodeMirror prescribes no ARIA for developer-supplied DOM, the seam **owns the a11y contract
explicitly**: role, keyboard access to actions, dismissal, focus discipline (hover cards do not steal
focus from `.cm-content`; panels focus their tagged main field on open and restore focus on close).
The module is internal (exported from no package subpath), so its API is free to grow; the observable
behavior is the contract.

## Fragility inventory and the `check:cm-internals` gate

Convert the watch into a failing test, the gold standard this repo already favors
(`check:custom-surface`, `check:reference`).

1. **Inventory** every internal `.cm-*` selector the editor theme touches, split into writing-surface
   (documented, legitimate) and chrome (the fragility surface).
2. **`scripts/check-cm-internals.mjs`** (mirroring `scripts/check-custom-surface.mjs`) scans the editor
   theme sources for chrome `.cm-*` selectors and holds them to a **seeded budget**. It fails if the
   count grows. The popover conversion seeds the lint-tooltip classes at **0**. Autocomplete's residual
   classes are the documented, budgeted remainder. Cairn's own `.cm-cairn-*` classes and the documented
   writing-surface classes are allow-listed, not counted.
3. Wire it into the `check:*` script family and the pass gate.

The success metric is the chrome budget trending toward only the content classes: lint tooltip 0,
autocomplete a small named set, everything else routed through recipe DOM.

## Upgrade rehearsal

Mirror the admin sweep's rehearsal. A checked step bumps `@codemirror/lint`, `@codemirror/autocomplete`,
`@codemirror/search`, and `@codemirror/view` independently (they version separately) and re-validates
the public-API calls and the recipe surfaces (popover, autocomplete alignment, search panel). This is
the tripwire for the one thing that can break: a public-API shift, which is far rarer than an
internal-class shift and is covered by the `^6.0.0` promise.

## Visual finalization through frontend-design

Route the three visual artifacts through the frontend-design loop with explicit criteria, not main-loop
web research (`design-taste-research-via-frontend-design`):

- the suggestion popover composition,
- the aligned autocomplete dropdown (row, selected state, info panel),
- the search/replace panel layout.

**Criteria:** match `MediaInsertPopover.svelte` and the `admin-design-system.md` recipes; use only the
Warm Stone tokens; `data-theme` on a bare wrapper; scoped overrides in `@layer components`; preserve
CodeMirror's editing affordances. This is the first implementation step for each surface, so the plan
carries an approved visual target before the code.

## Testing

- **Unit:** the diagnostic→tooltip bridge (a diagnostic at a range yields the recipe popover with the
  right actions; the actions dispatch the right transactions); the search query wiring (panel inputs
  drive `setSearchQuery`; the commands run); the a11y contract (focus, dismissal).
- **e2e / visual:** new admin-visual baselines for the popover, the aligned autocomplete, and the search
  panel, the same discipline Phase 6 used. Existing editor baselines regenerate; any pixel change is
  intended and reviewed.

## Scope boundary and non-goals

- **No editing-UX override.** Selection, IME, key handling, and completion match-highlighting stay on
  CodeMirror's defaults. Design consistency yields to editing quality.
- **The writing-surface theme stays.** Only the underline is tuned.
- **Leanness.** The seam is two small primitives with real consumers (popover, search panel). No
  general chrome framework, no speculative primitives without a consumer.

## Documentation (a pass dimension)

- Update `docs/internal/admin-design-system.md` if the popover / panel recipes gain an editor variant.
- Record the CodeMirror seam (the writing-surface / chrome rule, the public-API hooks, the fragility
  budget, the upgrade rehearsal) as the durable internal reference; fold or retire
  `cm-editing-surface-alignment.md` once this ships.
- If any surface gains a diagnosable code path, give it a log event and update the reference table.
- Prune the ROADMAP "Later" CM item on ship.

## Rough phasing (for the plan, written just-in-time)

0. Inventory the `.cm-*` surface; land `check:cm-internals` with the seeded budget; run the
   frontend-design loop for the three visual targets.
1. Build the `editor-chrome` seam (`recipeTooltip`) and convert the spellcheck/objective popover; drive
   the lint-tooltip budget to 0.
2. Align the autocomplete dropdown; seed its residual-class budget.
3. Add `@codemirror/search` and the recipe search panel (`recipePanel`); commit the regenerated
   showcase and root lockfiles in the same commit (dep-graph change).
4. Tune the underline; wire the upgrade rehearsal; update docs; prune the roadmap.

Each phase clears the full gate (`check` 0/0, `npm test`, `check:cm-internals`, `check:custom-surface`,
`check:comments`, showcase e2e) before the next, per the cairn method: dispatch each well-specified task
to `cairn-implementer`, review the diff, verify the gate.

## Self-review notes

- Adding `@codemirror/search` is a dependency-graph change; the same-commit lockfile discipline
  (`cairn-root-lockfile-drift-npm-ci`, `cairn-worktree-stale-node-modules`) applies.
- The autocomplete budget is deliberately non-zero. If review finds the residual classes are actually
  avoidable through `addToOptions`, tighten the budget; do not pretend zero is reachable up front.
- The popover trigger must preserve keyboard reachability (caret-in-range), not only pointer hover, or
  it regresses accessibility relative to the current lint tooltip.
