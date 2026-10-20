# Gates, tooling, and DX-hardening (0.56.0)

> Clears the live, non-scaffolder friction-log backlog. The task list is the output of a parallel
> verify sweep (2026-06-13) that re-checked every candidate against the tree; the specs below are
> what survived as live. Execute task-by-task: code/test tasks go to `cairn-implementer` (Sonnet)
> with the gate and a diff review between dispatches; the docs-only tasks run in the main loop. Each
> task ends on the full gate (targeted test green, `npm run check` 0/0, `npm test` exit 0; docs tasks
> run the doc gates).

**Verify-sweep outcome.** Of 14 candidates: 3 already done (the editor link picker already lists real
targets; render attribute-sink hardening already ships as `rehypeSinkGuard` in
`src/lib/render/sanitize-schema.ts`, tested; the docs already steer to the `cairn-manifest` bin), 2
partial, 9 live. The 11 live/partial are below.

## Ordering (conflict-aware)

`dx-authenv` before `docs-app-locals` (the deploy-guide block's import line depends on whether
`AuthEnv` ships from `/sveltekit`). Everything else is file-disjoint. `dx-concept-singular` overlaps
the office-list plan only on paper (that plan deferred the same field); this pass owns it.

---

### Task 1: re-export `AuthEnv` from `/sveltekit` (implementer)
- Files: `src/lib/sveltekit/index.ts`, `docs/reference/sveltekit.md`.
- `AuthEnv` is exported from the root but not `/sveltekit`, yet consumers import it there (and
  `skipLibCheck` hid the missing member through two retrofits). Add the type re-export to
  `src/lib/sveltekit/index.ts` (beside the other `export type` lines), and a `docs/reference/sveltekit.md`
  entry so `check:reference` covers it.
- Test: `npm run check:reference` green; full gate.

### Task 2: the deploy guide shows the `app.d.ts` Platform block verbatim (main loop, docs)
- Files: `docs/guides/deploy-to-cloudflare.md`.
- After Task 1, show the full `app.d.ts` Platform block verbatim, importing `AuthEnv` from
  `@glw907/cairn-cms/sveltekit`. Doc gates only.

### Task 3: optional `singular` concept label (implementer)
- Files: `src/lib/content/types.ts`, `src/lib/content/concepts.ts`,
  `src/lib/sveltekit/content-routes.ts`, `src/lib/components/ConceptList.svelte`,
  `docs/reference/core.md`, `src/tests/component/ConceptList.test.ts`.
- Add an optional `singular?: string` to the concept descriptor, defaulting to the label. Thread it to
  `ListData` (the way `label` reaches `ConceptList` today) and use it at the three create affordances:
  the header "New {label}" button, the trailing "New {label}" foot row, and the create dialog title,
  so they read "New post" not "New Posts". Reference entry in `core.md`. Component test that a concept
  with a `singular` renders the singular in the create controls and falls back to the label without one.
- Test: the new component test; full gate.

### Task 4: the manifest bin separates config-search dir, Vite root, and output base (implementer)
- Files: `src/lib/vite/index.ts`, `src/tests/unit/manifest-bin-root.test.ts`.
- In `writeManifest(cwd = process.cwd())`, keep `loadConfigFromFile(..., cwd)` as the config-search
  dir, but derive the authoritative Vite root from the LOADED config: read `loaded.config.root` and,
  when set, resolve it against the loaded config file's own directory (`dirname(loaded.path)`) the way
  Vite does, falling back to `cwd`. Pass that root (not `cwd`) to `buildManifestFromVite`/`createServer`
  and to the manifest output base, so running the bin from a non-root cwd or with a configured `root`
  writes to the right place.
- Test: a unit test covering a config with an explicit `root` and one without; full gate.

### Task 5: plain-Node dist-spawn test for `/delivery/data` node-safety (implementer)
- Files: `src/tests/unit/delivery-data-dist-spawn.test.ts`.
- Rot-proof the node-safety guarantee by importing the BUILT dist subpath in a fresh Node process
  (no vitest transform). Follow `src/tests/unit/doctor-bin.test.ts:152-181`: `existsSync` + `it.skipIf`
  so the suite passes without a prior `npm run package`; `spawnSync(process.execPath, ['--input-type=module','-e', script])`
  where `script` does `import(pathToFileURL('dist/delivery/data.js').href)`, asserts `buildSiteManifest`/
  `createSiteIndexes`/`buildRssFeed` are functions and `createPublicRoutes` is absent (the kit loader must
  not leak), prints a sentinel, and exits non-zero on failure. Comment why it differs from the
  source-static `delivery-entry-boundary.test.ts` (this exercises the emitted dist under Node's own ESM
  resolver).
- Test: `npm run package && npm test -- delivery-data-dist-spawn`; confirm it still passes (skipped) after
  `rm -rf dist`; full gate.

### Task 6: admin-shell DOM check (implementer)
- Files: `src/tests/component/AdminLayout.test.ts`.
- Add cases asserting the admin shell is laid out as a nested structure, not just styled (the failure
  mode of the shipped `display:block` drawer): render `AdminLayout` on a list route and assert
  `.drawer > .drawer-content` and `.drawer > .drawer-side` exist (use `:scope >` for the parent/child
  relationship), the `.navbar` lives inside `.drawer-content`, and the sidebar `nav` lives inside
  `.drawer-side`. No component change. Prove the assertions bite (temporarily unnest a region, see it
  fail, revert).
- Test: the new cases; full gate.

### Task 7: signature-currency gate for the reference pages (implementer)
- Files: `scripts/check-reference-signatures.mjs` (new),
  `scripts/reference-coverage.mjs` (export `CONFIG`/`enumerateExports` for reuse),
  `package.json` (a `check:reference:signatures` script), `.github/workflows/test.yml`,
  `docs/reference/README.md`, `scripts/check-reference-signatures.test.mjs` (new).
- `check:reference` only checks a page EXISTS per export, not signature currency, so a stale declared
  signature inside a page passes (this is how the auth pages drifted). Add a gate that compares each
  reference page's DECLARED `ts`-block signature against the export's REAL type via the TypeScript
  compiler API (reuse `reference-coverage.mjs`'s `enumerateExports` pattern; do not add ts-morph, do not
  regex the `.d.ts`). Render the real signature with `checker.typeToString(...)`; normalize both forms
  (`declare function name(args): ret` vs the `(args) => ret` arrow form) before comparing; print one RED
  line per mismatch and exit 1. Cover function/const-function exports first; support an ALLOWLIST keyed
  `${subpath}#${name}` (mirror `check-readiness.mjs`); skip exports with no declared block (that gap is
  `reference-coverage.mjs`'s job). Wire `"check:reference:signatures": "npm run package && node scripts/check-reference-signatures.mjs"`
  and add the CI step after the existing `check:reference`. Note the authoring contract in
  `docs/reference/README.md` (declared signatures are now gated, copy them from the real type).
- Test: `scripts/check-reference-signatures.test.mjs` for the pure normalize/compare helpers (matching
  arrow vs declare form, a drifted arg/return, an allowlisted name); end-to-end the gate exits 0 on the
  current docs. Full gate.

### Task 8: the docs sweep (main loop, docs)
- `docs-preview-dual-emission`: in `docs/reference/core.md` (the preview adapter member) and
  `docs/guides/define-an-adapter-and-schema.md`, document that the `?url` imports in the layout and the
  adapter emit two differently-hashed copies of the sheet (page links the client copy, frame the server
  copy; both ship), so a developer diffing build output does not read it as a defect.
- `docs-doctor-derivation`: in `docs/guides/deploy-to-cloudflare.md` (the Verify bullet), state that a
  repo wiring the `cairnManifest` plugin can run bare `npx cairn-doctor` (it derives from-address and
  repo off the adapter), with `--from`/`--repo` as the fallback. Do not edit `doctor.md` (already covers it).
- `docs-prerender-flag`: in `docs/guides/wire-the-delivery-surface.md`, name the
  `prerender.handleHttpError` policy where the feeds/sitemap/robots are introduced (a current SvelteKit
  fails the build on the uncrawled routes without it).
- `docs-security-interim`: in `SECURITY.md`, add an interim contact fallback while the repo is private
  (GitHub private vulnerability reporting is unavailable on a private repo).
- Run the doc gates: `check:reference`, `check:package`, `check:docs`, `check:prose`, `check:readiness`.

---

## Pass end (cairn-pass ritual)
1. Simplifier over the pass's changed code (`code-simplifier:code-simplifier`, opus).
2. Full gate at the tip, first-hand: `npm run check` 0/0, `npm test` exit 0, the five doc/readiness
   gates, the new `check:reference:signatures`, showcase E2E.
3. Review gate: `svelte-reviewer` over the component/test changes; fold findings. No worker/auth change,
   so those reviewers sit out.
4. Live admin smoke: judge proportionality (additive `singular`, new tests, a docs sweep, a CI gate; no
   server/auth/action change). Record the judgment.
5. Version bump `0.56.0` + the changelog and upgrade-guide entry (additive; the `singular` field is
   optional, so no consumer action).
6. Mark the cleared items resolved in `docs/internal/docs-friction-log.md` triage; post-mortem here;
   STATUS updated on `main`. Queue after this: the gallery brainstorm, then P4.
