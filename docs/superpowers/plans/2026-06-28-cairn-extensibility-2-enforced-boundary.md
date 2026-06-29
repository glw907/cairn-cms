# Developer Extensibility Plan 2: Enforced Public Boundary and Upgrade

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public surface a narrow, versioned, *enforced* contract, not merely a documented one, so a developer's extension survives engine updates and a surface change is a loud, deliberate event. This is the enforcement half of the developer-extensibility redesign; Plan 1 shipped the capability (the custom-admin-screen seam). The two plans ship as one minor (`0.77.0`), cut after this plan lands.

**Architecture:** Three enforcement mechanisms plus one upgrade aid and one surface cleanup, all gate-or-doctor work over the surface Plan 1 created. A new `check:surface` emitter snapshots each exported subpath's built `.d.ts` (the **full declared shape** of every export, not just callable signatures) to a committed golden file; the gate fails on drift, and a deliberate regenerate is the disclosure moment. `check:reference` is extended to assert every export carries a stability-tier marker (Extension API or Scaffold API), so an untagged new export fails the gate. `cairn-doctor` gains a best-effort `/admin` mount-shape check that emits a non-blocking nudge. The dead `LayoutData` export is removed with a `Consumers must` line. The breaking-in-0.x signal lands in the release notes.

**Tech Stack:** TypeScript, the TypeScript compiler API (`checker.typeToString` for type-shape rendering), Node ESM build scripts, `svelte-package` (the `.d.ts` emitter), the existing `scripts/*.mjs` gate machinery (`reference-coverage.mjs`'s `enumerateExports`/`moduleExports`, `check-reference-signatures.mjs`'s `normalizeSignature`), the `cairn-doctor` bin and the `src/lib/diagnostics` condition registry, Vitest, GitHub Actions (`test.yml`).

## Global Constraints

- **Charter, premise-checked.** This plan adds *enforcement, not surface*. No new developer-facing exports, no new runtime behavior, no new actor. The `cairn-doctor` check is the one task that adds engine behavior, and it stays a best-effort, non-blocking heuristic (cairn's own tool nudging a consumer), not a typed-validation surface. The charter (`what-cairn-is-and-is-not.md`) already describes the boundary as "an enforced, versioned public surface … across the kind-based export subpaths … not a single `./extend` subpath"; this plan delivers that enforcement. Source: `CLAUDE.md` "What cairn is" and `docs/internal/what-cairn-is-and-is-not.md`.
- **No `./extend` subpath.** The boundary is drawn by enforcement, not a curated re-export layer. Subpaths stay organized by kind. Do not create a `./extend` subpath.
- **attw `internal-resolution-error` stays MUTED.** The 23 `InternalResolutionError`s are `.svelte`/`.css` re-export specifiers attw's resolver cannot follow without the Svelte language plugin, a structural `svelte-package`-vs-`attw` limitation, not a leak. Do not un-mute it. Leave `check:package`'s existing `--ignore-rules no-resolution cjs-resolves-to-esm internal-resolution-error` set intact (confirmed sound by the boundary review). A genuine internal-`.ts`-leak lint is a separately-sized follow-up, out of scope.
- **One snapshot, committed, regenerate-to-disclose.** The `check:surface` golden snapshot is committed; the gate compares the freshly-emitted surface against it and fails on any drift. Regenerating it (`--update`) is the deliberate disclosure step a developer takes when they intend a surface change, and the diff is what a reviewer reads. The gate is build-time, so a surface change fails CI, not a consumer's install.
- **Release stays held until this plan lands.** The version is already `0.77.0` (Plan 1). This plan does not bump it again; it adds the enforcement under the same minor and the release ships after. The `LayoutData` removal is breaking, but it rides the same `0.77.0` `Consumers must` block.
- **Gate before done (each task):** the task's targeted test, then `npm run check` (svelte-check 0/0), then `npm test` (exit 0), then the relevant doc/surface gate. The worktree must `npm run package` before any gate that reads `dist` (`check:surface`, `check:reference`, `check:reference:signatures`, `check:package`). The full pass-end gate runs at pass close, plus the from-scratch consumer build + e2e and the live admin smoke owed from Plan 1.

## Decisions settled (no placeholders)

- **Snapshot format and location.** One committed text file at `docs/internal/api-surface.md`, a generated, human-readable Markdown table: one section per exported subpath, each listing its exported names with a normalized one-line **type shape**, sorted by name. A leading "GENERATED — run `npm run check:surface -- --update` to regenerate" banner. The shape rendering is the load-bearing decision (the adversarial review's central finding): the snapshot must record the **full declared shape** of every export, not only callable signatures.
  - **Subpath source:** drive the subpath set from `package.json` `exports` directly, every entry that carries a `types` field (`.`, `/sveltekit`, `/components`, `/components/spellcheck-worker`, `/islands`, `/render`, `/delivery`, `/delivery/head`, `/delivery/data`, `/media`, `/vite`, `/ambient`). Do NOT take the subpath list from `check-reference-signatures.mjs` (it omits `/components/spellcheck-worker`) and do NOT inherit `reference-coverage.mjs`'s `excludeDts` page-dedup filter (it drops the 39 re-exported `/delivery` names, which are real surface). Capture the full raw `enumerateExports(dts)` output per subpath, re-exports included.
  - **Shape rendering:** for each export, render via the resolved type. A callable export reuses `check-reference-signatures.mjs`'s `realSignatures()` path so the two gates agree on callable form; a non-callable export (interface, type alias, const, the `fields` namespace object) renders its resolved shape with `checker.typeToString(type)` (the checker is already available from `moduleExports`), then through `normalizeSignature()` so `import("…")` qualifiers, `| undefined` artifacts, and whitespace are canonical. This new non-callable branch lives in `check-surface.mjs`, not in `check-reference-signatures.mjs` (which legitimately stays callable-only for its narrower job).
  - **Zero-export / ambient subpaths:** a subpath whose `enumerateExports` returns `[]` still contributes surface. For `/ambient`, render its `declare global` `App.Locals` augmentation (the `editor?: Editor | null` and `backend?: Backend` fields, with the referenced names resolved) so a change to the ambient identity contract drifts the snapshot.
  - Rationale: a Markdown table diffs cleanly in a PR (the disclosure moment is a readable diff), it lives beside the other internal references, and rendering directly from the `.d.ts` keeps the surface gate independent of whether the reference docs stay current.
- **Tier marker token and carriers.** The exact token is `Stability tier: Extension API` or `Stability tier: Scaffold API`, the form Plan 1 already shipped in `sveltekit.md` (do not invent `**Stability:**`). Because most exports are documented as **Types-table rows**, not `###` sections, the marker has two carriers the gate checks per export, by name:
  - A heading-sectioned export (`### \`name\``) carries an inline `Stability tier: …` line within that export's window (heading to the next heading).
  - A Types-table export carries its tier in a new `Stability` column on that table (`| name | stability | signature | meaning |`), so a single table that mixes tiers marks each row.
  The gate's assertion is a new pure function that resolves, per exported name, whether a tier token is associated with it (its section window, or its table row), and fails the untagged ones, not a whole-page grep.
- **Tier classification rule.** Extension API = a developer hand-authors against it: `CairnAdminShell`, `CsrfField`, `requireSession`, `requireOwner`, `isPublicAdminPath`, `AdminShellData`, `AdminNavEntry`/`AdminNavIcon`/`ResolvedNavEntry`, `Editor`/`Role`, the `fields.*` vocabulary, `defineConcept`/`defineComponent`/`defineRegistry`, the render and delivery types a public page calls. Scaffold API = generated by `create-cairn-site`, stable but not hand-edited: `createCairnAdmin`, `createAuthGuard`, the per-surface route factories, `composeRuntime`, `healthLoad`. When a call is genuinely ambiguous, default to Extension API (the stricter promise) and note it.

---

## Task 1: The `check:surface` snapshot gate

A new emitter walks each exported subpath's built `.d.ts`, renders the full declared shape of every export, writes/compares the committed `docs/internal/api-surface.md`, and fails loud on drift.

**Files:**
- Create: `scripts/check-surface.mjs` (the emitter + the diff gate; a pure core function plus the CLI, mirroring `check-version.mjs`'s shape so the core is unit-testable). It imports `enumerateExports`/`moduleExports` from `reference-coverage.mjs` and `normalizeSignature` from `check-reference-signatures.mjs`; the non-callable type-shape rendering (`checker.typeToString`) is new here.
- Create: `docs/internal/api-surface.md` (the committed golden snapshot, generated by the first `--update` run).
- Modify: `package.json` (a `check:surface` script: `npm run package && node scripts/check-surface.mjs`). Wire it as a discrete `test.yml` step (next Files entry); the repo has no gate-chaining aggregate `check` script, so do not fold it into the svelte-check `check`.
- Modify: `.github/workflows/test.yml` (run `check:surface` alongside `check:reference`).
- Test: `src/tests/unit/check-surface.test.ts` (the core diff function).

**Steps:**
- [ ] **Step 1.** Build the canonical snapshot string per the "Snapshot format" decision: subpaths from `package.json` `exports` `types` entries; per subpath, the sorted export names each with their full type shape (callable via `realSignatures`, non-callable via `checker.typeToString` + `normalizeSignature`); the `/ambient` `declare global` augmentation; no `excludeDts` dedup. Confirm determinism: stable name sort, stable field order from the checker, normalized whitespace, so a no-op run is byte-identical.
- [ ] **Step 2.** Write the failing core test: `diffSurface(committed, emitted)` returns `{ ok: true }` on identical input and `{ ok: false, drift: [...] }` listing added/removed/changed exports per subpath. Include a case that a **changed field on an interface** (rename or retype a field on a `*Data` type) produces drift, not only an added/removed/renamed export or a changed callable signature, this is the central guarantee and must be tested explicitly.
- [ ] **Step 3.** Implement the core (pure function) + the CLI: without `--update`, emit the live surface, read the committed file, diff, exit non-zero on drift with an actionable message naming the subpath and the added/removed/changed lines. With `--update`, write the committed file.
- [ ] **Step 4.** Generate `docs/internal/api-surface.md` via `--update`; commit it as the baseline. Confirm a no-op `check:surface` run passes.
- [ ] **Step 5.** Prove the gate catches drift on a TYPE: temporarily add a field to an exported interface (e.g. `AdminShellData`), confirm `check:surface` fails and names it, then revert. Repeat for an added export.
- [ ] **Step 6.** Wire `package.json` + `test.yml` (a discrete step). Run the gate. Commit.

---

## Task 2: The `check:reference` tier-marker assertion + the tier labels

Extend the coverage gate to require every export carry a `Stability tier: Extension API|Scaffold API` marker, then label every export. Plan 1 already labeled the seam exports `Extension API` with this token; this task completes the rest and makes the marker work at table-row granularity.

**Files:**
- Modify: `scripts/reference-coverage.mjs` (a new per-export pure function asserting each export's tier marker; fail an untagged export, the same way an undocumented export fails today).
- Modify: every reference page under `docs/reference/` that documents an export without a tier marker (`core.md`, `sveltekit.md`, `components.md`, `delivery.md`, `delivery-data.md`, `delivery-head` if present, `media.md`, `render.md`, `islands.md`, `vite.md`, `ambient.md`, `doctor.md`), including adding the `Stability` column to each Types table.
- Test: `src/tests/unit/reference-coverage*.test.ts` (extend or add: a table row / section with no tier marker fails; a tagged one passes).

**Steps:**
- [ ] **Step 1.** Confirm Plan 1's shipped token is exactly `Stability tier: Extension API` / `Stability tier: Scaffold API` (in `sveltekit.md`) and adopt it verbatim. Define the two carriers per "Decisions settled": the inline line for `###` sections and a `Stability` column for Types tables.
- [ ] **Step 2.** Write the failing gate test: an export with no associated tier marker (a section without the line, a table row without a tier cell) fails `check:reference`.
- [ ] **Step 3.** Add the per-export marker check to `reference-coverage.mjs` as a new pure function that, for each exported name, resolves its marker from its section window or its table row, not a whole-page grep (a whole-page grep would pass a page that marks one export and not another). Run it; see every untagged export fail.
- [ ] **Step 4.** Label every export per the classification rule: add the `Stability` column and fill each row, add the inline line to each `###` section. Work page by page; default an ambiguous case to Extension API and note it. A per-page sub-agent dispatch is reasonable; the gate is the acceptance check.
- [ ] **Step 5.** Run `check:reference` to green. Run `check:docs` (the new column and lines must not break links or anchors). Commit.

---

## Task 3: `cairn-doctor` mount-shape check (best-effort, non-blocking)

`cairn-doctor` gains a check that the four-file `/admin` mount is present and wired, emitting an actionable nudge. Because the doctor has no advisory tier (`CheckStatus = pass | fail | skip`) and a `fail` is a hard exit-1 deploy gate, a best-effort heuristic must NOT `fail` on absence, it emits `skip`-with-guidance, so a legitimately-but-unconventionally-wired site never goes falsely red.

**Files:**
- Modify: the doctor checks (`src/lib/doctor/checks-local.ts` and siblings; confirm the path) to add the mount-shape check.
- Modify: `src/lib/diagnostics/conditions.ts` to register the condition the check references (a registered `conditionId` is required, or the check throws at report time), and `src/tests/unit/conditions.test.ts`.
- Modify: `docs/guides/cloudflare-readiness.md` (the readiness checklist the `check:readiness` gate pins every condition's `docsAnchor` against) and `docs/reference/doctor.md` (document the check, with a tier marker per Task 2).
- Test: the doctor check's unit test (a renamed-composer fixture still passes/skips and never fails; a definitively-absent mount skips with the guidance message).

**Steps:**
- [ ] **Step 1.** Register the condition. Prefer reuse of an existing registered `conditionId` if one fits (the `configMediaBucket`/`configTidyKey` precedent reuses rather than registering, to keep the readiness count stable); otherwise register one new condition `admin.mount-incomplete` with `severity: 'warning'`, `id/title/why/remediation`, and a `docsAnchor` into `cloudflare-readiness.md` (the `check:readiness` gate fails if the anchor is missing). Decide and pin this in Step 1, do not leave it to the implementer.
- [ ] **Step 2.** Write the failing test against a fixture tree: a site whose composer is named `cms` and wires `cms.shellLoad` must NOT fail (it is correctly wired); a site missing the layout pair entirely gets a `skip` with the guidance message.
- [ ] **Step 3.** Implement the check as a loose text/structure scan: detect a `.shellLoad` member-access on ANY identifier (a `/\.\s*shellLoad\b/`-style match, not a literal `admin.shellLoad`) plus a `CairnAdminShell` import/render anywhere under `/admin`, mirroring the existing loose `wiresCairnGuard` heuristic in `checks-local.ts` that deliberately tolerates a renamed or wrapped composer. On a definitively-absent catch-all pair (both `/admin/[...path]` route files missing) a `fail` is acceptable since that is unambiguous; the composer-name-dependent shell-layout absence emits `skip`-with-guidance, never `fail`. The detail line names the expected files and the one-line fix.
- [ ] **Step 4.** Document it in `doctor.md` (with a tier marker) and `cloudflare-readiness.md`. Run `check:readiness` + the doctor tests. Gate + commit.

---

## Task 4: Remove `LayoutData`; the breaking-in-0.x release signal

`LayoutData` is dead (replaced by `AdminShellData`) but still exported and documented. Remove it cleanly, including the surviving comparative prose, and add the breaking-in-0.x signal.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (delete the `LayoutData` interface and its export; reword the `AdminShellData` doc comment at ~content-routes.ts:101 that says "an authed path mirrors `LayoutData` field-for-field"), `src/lib/sveltekit/index.ts` (drop the re-export), `src/lib/sveltekit/cairn-admin.ts` (confirm no remaining import).
- Modify: `docs/reference/sveltekit.md` (remove the `LayoutData` Types-table row at ~558, AND reword the `AdminShellData` row description at ~559 that names `LayoutData`).
- Modify: `CHANGELOG.md` (add the `LayoutData` removal to the `0.77.0` `Consumers must` block; add a clear breaking-in-0.x banner to the entry), `docs/guides/upgrade-cairn.md` (the per-version entry).
- Test: `git grep LayoutData` returns nothing after the change; the surface gate (Task 1) regenerates to drop it.

**Steps:**
- [ ] **Step 1.** `git grep LayoutData` across `src/`, `docs/`, `examples/` to enumerate every reference. Remove the declaration, the export, and the Types-table row. Reword the two surviving comparative references (the `AdminShellData` TSDoc at content-routes.ts:101 and the `sveltekit.md` row description) so they describe the authed shape directly or say "the former layout payload", rather than deleting context.
- [ ] **Step 2.** Run `npm run check` + `npm test`; fix any straggler import. Re-run `git grep LayoutData` to confirm zero hits.
- [ ] **Step 3.** Regenerate the `check:surface` snapshot (`--update`); the diff shows the `LayoutData` removal, the disclosure moment.
- [ ] **Step 4.** Add the `Consumers must` line and the breaking-in-0.x banner to the `0.77.0` CHANGELOG entry and the upgrade guide. Run the doc gates. Commit.

---

## Task 5: Consolidation, release readiness, and the publish

The release covering Plan 1 + Plan 2 ships after this task. **Sequencing:** Task 1 establishes the snapshot baseline first; Task 4 is the only task that changes the export surface, so it regenerates the snapshot; Tasks 2 and 3 change docs and the doctor, not exports.

**Steps:**
- [ ] **Step 1.** Full pass-end gate: `code-simplifier` over the pass's changed code; `npm run check` 0/0; `npm test` exit 0; `check:comments`; all four doc gates (`check:reference`, `check:reference:signatures`, `check:docs`, `check:package`); `check:surface`; `check:readiness`; `check:version`.
- [ ] **Step 2.** Reviewer fan-out. The gate-script changes touch no runtime, so focus a fresh-context read on the `check:surface` emitter (determinism, the type-shape rendering) and the doctor check (the skip-not-fail tier, the loose match).
- [ ] **Step 3.** From-scratch consumer build + e2e (the worktree showcase install + full `npm run test:e2e`, or push for CI).
- [ ] **Step 4. Live admin smoke (owed from Plan 1).** Run the `wrangler dev` + minted-D1-session smoke per `docs/internal/admin-smoke-test.md` against the shared-shell admin and one custom screen. Record evidence.
- [ ] **Step 5.** Merge to `main`. Cut the `0.77.0` release covering both plans: the changelog window since `0.76.0`, every `Consumers must` line, the breaking-in-0.x banner. `gh release create v0.77.0 --target main` fires trusted publishing. Update `docs/STATUS.md` and the memory.

---

## Self-review

- **Spec coverage.** `check:surface` snapshot gate → Task 1; the `check:reference` tier-marker assertion + the Extension/Scaffold labels → Task 2; the `cairn-doctor` mount-shape check → Task 3; the `LayoutData` removal + the breaking-in-0.x signal → Task 4; the release covering both plans → Task 5. The muted attw rule stays muted. The `./extend` non-creation is honored.
- **Premise check.** Every task is enforcement or cleanup over the existing surface; the one behavioral addition (the doctor check) is a best-effort, non-blocking nudge, cairn's tool, not new developer surface.
- **Adversarial review folded (2026-06-28, 16 confirmed findings).** The central save: `check:surface` must render full type SHAPES, not just callable signatures (else interface/type drift, the developer's real guarantee, passes silently), via a new `checker.typeToString` branch; subpaths come from `package.json` `exports` (covering `/components/spellcheck-worker` and `/ambient`) with no `excludeDts` dedup (keeping the 39 `/delivery` re-exports); the tier marker works at Types-table-row granularity with the exact `Stability tier: …` token Plan 1 shipped; the doctor check emits `skip`-with-guidance (not a deploy-breaking `fail`), matches `.shellLoad` loosely, and registers a `warning`-severity diagnostics condition with a `docsAnchor`; and the `LayoutData` removal rewords the surviving comparative prose, not just the row. Seven findings were rejected (the attw decision confirmed sound; the charter lens's "Task 3 adds behavior" rejected as a best-effort nudge is cairn's job).
- **Risk.** Task 2 is the largest (labeling every export and adding the Stability column); mechanical and gate-driven, suitable for a per-page sub-agent dispatch. Task 1's type-shape rendering is the correctness-critical piece; its unit test must prove an interface-field change drifts the snapshot.
