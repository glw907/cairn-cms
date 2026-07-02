# Code idioms

The agent-facing idiom charter: one obvious way per pattern, each rule anchored to the
best existing file (imitate the exemplar; the rule is a summary of it). Derived from the
2026-07-01 eleven-subsystem survey (`docs/superpowers/plans/2026-07-01-code-polish-survey.md`)
during the code polish pass. This is a standing pass dimension: a pass that changes an idiom
updates this file, the same as a reference page. Comments and TSDoc are gate-enforced
elsewhere (`check:comments`) and not restated here.

## Errors and results

- **E1. Config and declaration-time errors** (module load, `define*`, `fieldset()` time) throw
  a plain `Error` whose message starts `cairn: ` and reads `<subject> <verdict>`, naming the
  offending value. Exemplar: `src/lib/content/concepts.ts` (`resolveRouting`,
  `validateUrlPolicy`). Module-name prefixes (`permalink:`, `content manifest:`,
  `createSiteIndexes:`, `r2Key:`, `site resolver:`) and prefixless messages converge to this.
- **E2. Errors that map to a doctor condition** are `CairnError(conditionId, ...)`. Exemplar:
  `src/lib/env.ts` (`requireOrigin`/`requireDb`/`requireBucket`). A config-error subclass that
  wants its own name (`SiteConfigError`) extends `CairnError` instead of hand-mirroring it;
  no redundant `conditionId` re-declarations.
- **E3. Save-time user-input validation returns, never throws**: `ValidationResult` and its
  kin. Exemplar: `src/lib/content/fieldset.ts` (`validateField`). The dividing line is the
  audience: a developer's mistake throws at declaration; an author's input comes back as data.
- **E4. Route factories**: a form-action failure is `fail(status, {...} satisfies XFailure)`
  with a named `*Failure`/`*Refusal` interface carrying `error: string` plus context
  (exemplar: the `content-routes.ts` failure family, ~460-655). A hard end-of-request is
  `error(status, message)`. A `redirect(303, '?error=...')` bounce is only for a failure on a
  page whose reload restores safe state; never a substitute for `fail` inside a form action.
  Ad hoc `fail(400, { error })` literals and dropped `satisfies` annotations converge.
- **E5. GitHub transport failures** stay plain `Error` carrying the HTTP status AND the
  request path (exemplar: `src/lib/github/branches.ts`); the head-moved race stays
  `CommitConflictError`.
- **E6. Cross-branch index builders fail open per row for advisory consumers and expose
  `strict` for gate consumers** (exemplar: `src/lib/content/reference-index.ts`). Which
  callers get which is a design decision recorded at the call site, not a default.
- **E7. No bare `console.*` in `src/lib`.** Client editor/admin code surfaces failures as
  typed UI states (exemplar: `src/lib/components/client-ingest.ts`, the
  `IngestFailureKind`/`failureCard` taxonomy) or degrades silently by documented contract;
  server code speaks through the `src/lib/log` chokepoint. Scripts and bins print freely.

## Validation

- **V1.** Boundary validation lives at the top of the public function, one condition per
  branch, throw-per-E1/E2 (exemplar: `src/lib/env.ts`).
- **V2.** Wide flat config surfaces validate via small local helper closures
  (exemplar: `validateTidyConventions`, `src/lib/nav/site-config.ts:227`).
- **V3.** Untrusted re-posted client data is re-validated field-by-field exactly where it
  crosses the trust boundary (exemplar: `validateMediaEntry`, `src/lib/media/manifest.ts`).
- **V4.** All config validators throw on first violation; only author-input validation
  accumulates (E3).

## Factories

- **F1.** Declaration factories are `define*<const T extends Base>(x: T): T`,
  validate-and-return-unchanged (exemplar: `defineAdapter` + `defineConcept`).
- **F2.** Runtime factories are `create*` closures over injected deps returning an object of
  named functions (exemplar: `createNavRoutes`); a factory whose whole surface is one
  function returns the function. No classes in production code (the one `Error` subclass and
  test doubles excepted).
- **F3.** `build*` names a pure producer that returns data; `create*` names a factory that
  returns a closure surface (exemplar: the `delivery/` split, `buildRssFeed` vs
  `createContentIndex`). Existing public `make*` names are frozen surface and stay.
- **F4.** New internal functions taking more than two logical inputs take one options object.
  Existing public signatures are frozen.

## Modules

- **M1.** Every module opens with a `// cairn-cms: <one-paragraph orientation>` header naming
  its job and the non-obvious rationale (exemplar: `src/lib/github/repo.ts`, which records
  why Trees-over-Contents). The stragglers (`pending.ts`, `fields.ts`, `env.ts`, two auth
  files) converge.
- **M2.** Bins are thin shells (argv + I/O) delegating to a logic module (exemplar:
  `src/lib/doctor/bin.ts`). Barrels exist only at public subpath entries and stay
  re-export-only; `doctor/index.ts` moves its resident logic out to honor this.
- **M3.** Internal re-export shims left over from moves are retired by retargeting their
  importers (`content/permalink.ts`).
- **M4.** Indentation is 2-space everywhere; the tab-indented `doctor/` tree and its test
  cluster converge, and an `.editorconfig` records it.

## Naming

- **N1.** Computed-value functions are verbNoun (`derive*`, `resolve*`, `extract*`,
  `build*`); internal bare-noun stragglers converge. Booleans are `is*`/`has*`
  (fix `altIsEdited`).
- **N2.** POST form-action handlers end in `Action`; loads and saves are `<subject>Load` /
  `<subject>Save`. The media-era handlers that dropped the suffix are a **filed
  surface-want** (their names appear in the public factory return type), not a sweep item.
- **N3.** CodeMirror extension factories are `cairn<Feature>`; the `register*`/`on*` seam
  vocabulary on `MarkdownEditor` is frozen by its documented contract.
- **N4.** Script entrypoints use `main()`; boolean helpers in scripts use `is*`.
- **N5.** Element ids in admin components follow `cairn-<component>-<element>`.
- **N6.** Test-helper modules that are not themselves tests carry the `_` filename prefix,
  in all three test projects.

## Async

- **A1.** async/await only; no `.then` chains. Sequential awaits for dependent work;
  `Promise.all` for genuinely independent fan-out.
- **A2.** The cross-branch fan-out-with-per-item-degrade shape becomes **one shared helper**
  (its four near-verbatim copies: `content/advisories.ts`, `content/reference-index.ts`,
  `content/tag-usage-index.ts`, mirroring `media/usage.ts`), carrying the `strict` and
  `branches` options and the workerd six-connection note. The strongest single reuse win in
  the codebase.
- **A3.** Latest-wins arbitration uses the extracted testable shape (exemplar:
  `arbitrateChecked`/`SeqArbiter`, `src/lib/components/spellcheck.ts:282`); the two inlined
  counter/flag variants converge.
- **A4.** Discarded fetch bodies are drained (`await res.body?.cancel()`), per
  `github/branches.ts`.
- **A5.** Catch-boundary stringification is the inline
  `err instanceof Error ? err.message : String(err)`; no helper.

## Logging

- **L1.** The `src/lib/log` chokepoint is the only emitter; event names are the public
  contract and never change in a polish pass. Pure layers stay silent; the one true IO glue
  point per flow logs counts, not payloads (exemplar: `media/reconcile.ts:runReconcile`).
- **L2.** Repeated log-emission at multiple call sites is factored into a tiny helper
  (exemplar: `content-routes.ts` `logCommitFailed`).
- **L3.** The `editors-routes.ts` gap (owner-gated mutations with no events) is a **filed
  decision** — new event names extend the documented vocabulary, so it is additive design,
  not sweep work.

## Tests

- **T1.** The content-routes/nav-routes unit cluster gets **one shared harness**
  (`src/tests/unit/_content-harness.ts`): `runtime(overrides)` plus the event builders,
  replacing ~30 files' hand-rolled copies. Modeled on `_auth-harness.ts`, the proven shape.
- **T2.** Redirect/HTTP-error assertions use the shared `expectRedirect`/`expectHttpError`
  (today in `_auth-harness.ts`; hoist them where unit tests can import them) — SvelteKit's
  own `isRedirect`/`isHttpError`, not hand-rolled try/catch.
- **T3.** Pure-function files use `describe('<symbol>: <one-line contract>')`; component
  tests describe by UI region; titles are present-tense sentences with no plan-task numbers.
- **T4.** Error assertions: `toThrow(class-or-regex)` for sync, `rejects.toThrow` for async,
  try/catch capture only when asserting error *fields* — three situations, not three styles.
- **T5.** Component queries prefer `getByRole`/`getByLabelText`; `querySelector` only for
  structural assertions semantics cannot express; `getByTestId` retires.
- **T6.** Combinatorial pure functions use table-driven cases (exemplar:
  `doctor-check-floors.test.ts`).

## Svelte components

- **S1.** Multi-prop components declare `interface Props` with TSDoc per field, destructured
  once (exemplar: `FieldInput.svelte`); a single obvious prop may inline its type. `$derived`
  for computed values, `$state` for genuine local mutability, never `$effect` for derivation.
- **S2.** Modals are the native `<dialog class="modal">` recipe (exemplar:
  `MarkdownHelpDialog.svelte`). A standalone dialog component exports `open()` as its
  contract (exemplar: `DeleteDialog.svelte`) rather than hosts reaching through `bind:this`.
  Destructive confirms declare `role="alertdialog"` explicitly; non-destructive dialogs rely
  on native semantics plus `aria-labelledby` without redundant role/aria-modal.
- **S3.** The repeated in-file idioms extract to one home each, `src/lib/components/`
  internals (not the public barrel): the check-and-tint segmented-control class helper
  (7 copies), the typed-confirm gate (5 copies), the fetch + devalue-deserialize +
  stale-guard client action round-trip (7 copies across `CairnMediaLibrary` and `EditPage`,
  exemplar for the shape: `runReplacePreview`), origin-refocus dialog lifecycle.
- **S4.** Error surfacing in admin screens follows `ConceptList.svelte`'s live-region shape
  (the one variant that re-announces repeated identical errors).

## Structural decisions (this pass)

- **`content-routes.ts` decomposes, bounded.** The 2,664-line factory body splits into
  per-domain internal modules (media actions, tidy, settings/vocabulary, dictionary, core
  content actions), each a function over one shared closure-context object, composed by
  `createContentRoutes` whose public return is byte-identical (`check:surface` proves it).
  It is the most heavily tested area of the codebase (~25 test files), which is what makes
  this safe; the sweep runs the full gate immediately after this cluster, not on the
  every-second-cluster cadence.
- **`CairnMediaLibrary.svelte` is NOT split this pass.** Component splits couple template,
  state, and focus behavior (the phase-3a lesson); the S3 extractions remove several hundred
  script lines instead, and a component split is filed to ROADMAP as its own future pass.
- **Showcase**: the near-identical `feed.xml`/`feed.json` routes share one items helper in
  `$lib`; the five-times-copied dev-gate boolean becomes one named `$lib` helper;
  `fake-app-db.ts` joins the dev package barrel; showcase components converge on S1.

## Deliberately not standardized

- The two lazy CodeMirror loading shapes (batch-in-onMount vs cached-module import) — each
  correct for its call pattern; both documented where they live.
- Radiogroup vs plain-list arrow-key navigation — semantically different widgets, not a fork.
- Public `make*` factory names and `createDevBackend` — frozen or aptly named.
- Doctor shared-skip-constants vs bespoke skip messages — bespoke stays where the message is
  input-specific.
- SCREAMING_SNAKE for module-local allowlist constants vs camelCase elsewhere — contextual.

## Sweep clusters (Task 4 partition, riskiest first)

1. `sveltekit-routes` — the content-routes decomposition + E4 convergence (full gate
   immediately after).
2. `tests` — T1 harness, T2 hoist, T3/T4/T6 fixes, N6 renames.
3. `components-admin` — S2/S3/S4, N5 ids.
4. `components-editor` — the ActionResult dedup (into the S3 helper), A3 convergence, E7.
5. `content` + `nav-config` — A2 shared builder, E1/E2 convergence, M1/M3, N1.
6. `media` + `delivery` — E1 prefixes, F3 codification residue.
7. `auth-github` + `tooling` + `scripts` — M1/M2/M4 (tabs), N4, A5, phantom transitive
   dependencies declared (lockfile committed in the same commit).
8. `showcase-dev` — the Structural-decisions showcase items + S1 convergence.
