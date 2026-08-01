# xcathletes engine seams: auth-store export and first-publish detection

> **For agentic workers:** execute task-by-task by dispatching each task to `cairn-implementer`
> (pinned Sonnet) per the repo's plan-execution defaults; the main loop reviews each diff and
> confirms the full gate between dispatches. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** land the two engine seams the xcathletes team platform's ratified requirements need:
a supported server-only export of the editor-provisioning store, and a first-publish stamp in
the content manifest with a pure diff helper, so announce-on-publish stays consumer-side.

**Authority:** `docs/internal/2026-08-01-xcathletes-consumer-brief.md` (this plan's input), which
traces to `ecxc-ski/docs/superpowers/specs/2026-07-30-team-platform-requirements.md` (§Broadcast,
ratified 2026-08-01). The brief's scope check found exactly these two gaps; nothing else in the
platform's requirements asks anything of the engine.

**Architecture:** Seam 1 is an export-map promotion of `src/lib/auth/store.ts` functions the
engine already trusts internally; no new logic. Seam 2 keeps the engine git-pure with no
networking: the engine stamps `publishedAt` into an entry's manifest record at the publish
commit and ships a pure manifest-diff helper on `./delivery/data`; the consumer owns the
post-deploy trigger and every send. Both are minor-sized public surface (new subpath, new
manifest field, new helper export).

**Tech stack:** existing only. TypeScript, svelte-package, Vitest, the `check:*` gate scripts.
No new dependencies.

## Global constraints

- Full gate per task before it reports done: targeted test green, `npm run check` ending
  `0 ERRORS 0 WARNINGS`, `npm test` exit 0.
- Public-surface gates for any task that touches the export map or a documented type:
  `npm run check:surface` (regenerate `docs/internal/api-surface.md` with `--update` and commit
  the diff), `npm run check:reference`, `npm run check:package`.
- TSDoc per the repo authoring standard (`npm run check:comments`); no em dash in comments.
- Reference-doc prose follows `docs/internal/docs-register.md` and the Google standard (Vale).
- Changelog entries accumulate under `## Unreleased`; no version bump in this pass
  (`cairn-release` decides the publish separately; a release is likely warranted at close
  because a consumer needs seam 1 now).
- The engine performs no network sends and gains no scheduler; anything resembling a broadcast
  belongs to the consumer (charter boundary; the brief's division of labor is ratified).
- Commit per task, specific files, imperative mood, `Co-Authored-By: Claude
  <noreply@anthropic.com>`.

---

### Task 1: `./auth-store` server-only export subpath

Deliverable count: five (entry module, export-map and coverage entries, contract test, surface
regen, reference page). Stated per the pass-sizing rule; the five are one promotion viewed from
five gates, not five features.

**Files:**
- Create: `src/lib/auth-store/index.ts`
- Modify: `package.json` (the `exports` map, imitating the 2-key `./vite` shape at
  package.json:114-118), `scripts/reference-coverage.mjs` (the subpath table at lines 298-311)
- Create: `docs/reference/auth-store.md` (imitate `docs/reference/vite.md`'s register: header
  naming the subpath, what is public vs internal, an import snippet, per-export sections with
  `Stability tier: Extension API.` and a fenced type signature)
- Create: `src/tests/unit/auth-store-exports.test.ts` (imitate the existing
  `src/tests/unit/*-exports.test.ts` pattern)
- Regenerate: `docs/internal/api-surface.md` (via `check:surface --update`)

**Interfaces:**
- Consumes: the existing exports of `src/lib/auth/store.ts` (verified 2026-08-01):
  `listEditors(db)`, `insertEditor(db, email, displayName, role, now)`,
  `deleteEditor(db, email)`, `setEditorRole(db, email, role)`,
  `removeOwnerIfNotLast(db, email, ownerRoles)`,
  `insertOwnerIfEmpty(db, email, displayName, now)`,
  `demoteOwnerIfNotLast(db, email, ownerRoles, newRole)`; the `EditorRow` type
  (store.ts:15) and `Role` (src/lib/auth/types.ts:19-24).
- Produces: the `@glw907/cairn-cms/auth-store` subpath re-exporting exactly those seven
  functions plus type-only `EditorRow` and `Role`. Server-only shape: `types` + `default`
  conditions, no `svelte` condition.

**Outcome and constraints:** a pure re-export module; zero new logic, zero signature changes.
The reference page states the `D1Database`-first-argument convention, that the engine's own
`editors-routes` remains the in-engine consumer of the same functions, and that the owner
guards are the same invariants the `ManageEditors` screen enforces (a consumer calling
`deleteEditor`/`setEditorRole` directly should prefer the guard variants for owner rows).

**Acceptance criteria:**
- [ ] Contract test asserts each of the seven exports is a function on the built subpath, in
      the same style as the sibling `*-exports.test.ts` files, and fails before the export
      map entry exists (test-first).
- [ ] `check:surface` passes with the regenerated golden committed; `check:reference` passes
      with the new page and coverage-table row; `check:package` (publint + attw) passes.
- [ ] Full gate green; commit.

---

### Task 2: `publishedAt` first-publish stamp in the manifest

**Files:**
- Modify: `src/lib/content/manifest.ts` (the `ManifestEntry` type at manifest.ts:17-52)
- Modify: `src/lib/sveltekit/content-routes-core.ts` (`publishAction` ~1175-1238 and
  `publishAllAction` ~1251-1321; the save path commits no manifest and therefore never stamps)
- Test: the existing manifest/publish unit suites (extend where the publish actions are
  already covered; add a dedicated file only if none fits)
- Modify: whichever reference page `check:reference` binds to the `ManifestEntry` type, adding
  the field row

**Interfaces:**
- Consumes: `manifestEntryFromFile` and `upsertEntry` (manifest.ts), the held pre-upsert
  manifest read via `ctx.readManifest` (content-routes-core.ts:1081).
- Produces: `ManifestEntry.publishedAt?: string` (ISO 8601 UTC), additive-optional, manifest
  `version` stays `1`. Task 3 consumes this field.

**Outcome and constraints (the stamp contract, exact):**
- Stamp `publishedAt` at the moment a publish commit lands a row non-draft whose prior
  committed row was absent or had `draft: true`. Both publish paths stamp identically.
- Every later publish carries the existing stamp forward unchanged; nothing ever overwrites
  or clears it. Immutability is the requirement the consumer's "edits never re-send" rides on.
- A pre-upgrade entry that is already non-draft but unstamped is never retro-stamped: its next
  edit-publish keeps it unstamped. This is deliberate; it is what keeps legacy entries on the
  two production sites from ever reading as newly published to Task 3's helper.
- `manifestEntryFromFile` cannot see the prior row (scouted 2026-08-01), so the transition
  detection and stamp belong at the publish-action call sites where both old and new state are
  in scope, not inside that function.

**Acceptance criteria:**
- [ ] Unit tests, written first, covering: draft entry published stamps; brand-new non-draft
      entry published stamps; edit-republish preserves the stamp byte-identical; legacy
      non-draft unstamped entry republished stays unstamped; a draft save produces no stamp
      until its publish.
- [ ] If `ManifestEntry` is part of a documented export surface, `check:surface` golden
      regenerated and `check:reference` green with the field documented.
- [ ] Full gate green; commit.

---

### Task 3: `newlyPublishedEntries` manifest-diff helper

**Files:**
- Create or extend: the helper beside the manifest projection code in `src/lib/delivery/`
  (`manifest.ts` there is the natural neighbor), exported through `./delivery/data` and the
  `/delivery` barrel like the other pure helpers
- Test: a unit test file in the style of the delivery suites
- Modify: `docs/reference/delivery-data.md` (a section under the pure helpers)
- Regenerate: `docs/internal/api-surface.md`

**Interfaces:**
- Consumes: `Manifest`, `ManifestEntry`, and `publishedAt` from Task 2; the same entry
  identity key `upsertEntry` uses.
- Produces: `newlyPublishedEntries(before: Manifest | null, after: Manifest):
  ManifestEntry[]`, pure and node-safe, no I/O.

**Outcome and constraints (the diff contract, exact):**
- Returns the `after` entries whose `publishedAt` is set and whose counterpart in `before`
  (matched by the `upsertEntry` identity key) is absent or unstamped.
- Given Task 2's stamp rules, presence-of-stamp is the whole signal: carried stamps never
  match, legacy unstamped entries never match, drafts never carry a stamp so never match.
- `before: null` means "no prior manifest is known" and returns every stamped entry; the
  reference section says plainly that a consumer wiring announce-on-publish must persist the
  prior manifest across deploys and pass `null` only when fan-out for every stamped entry is
  actually wanted.

**Acceptance criteria:**
- [ ] Unit tests, written first: newly stamped entry detected; carried stamp not detected;
      legacy unstamped entry never detected; draft never returned; `before: null` returns
      exactly the stamped set; an entry absent from `after` (deleted) is never returned.
- [ ] Reference section present; `check:surface` regenerated; `check:reference` and
      `check:package` green.
- [ ] Full gate green; commit.

---

### Task 4: announce-on-publish guide and pass docs

**Files:**
- Create: `docs/guides/announce-on-publish.md`
- Modify: `docs/guides/README.md` (index row), `CHANGELOG.md` (under `## Unreleased`),
  `ROADMAP.md` (file the shipped seams out of any live tier that mentions them; the consumer
  brief stays as history)

**Outcome and constraints:** the guide is the consumer-side how-to the seams exist for:
detect first publishes after a deploy completes and fan out from the consumer's own endpoint.
It shows the pattern with the diff helper (persist the prior manifest, fetch the deployed
manifest, diff, act), names the reserved-category filtering as consumer logic on the returned
entries' fields, and states the engine boundary (no sends, no scheduler, stamp-and-diff only).
Register per `docs/internal/docs-register.md`; Vale clean. The changelog entry is minor-sized
(`release-size: minor`: new subpath, new manifest field, new helper) and carries
`Consumers must: nothing` (both seams are additive; the stamp only appears on future
publishes).

**Acceptance criteria:**
- [ ] `check:docs`-adjacent gates green (`check:reference` unaffected, Vale clean on the new
      guide, guides index updated).
- [ ] Full gate green; commit.

---

## Self-review notes (done at authoring)

- Brief coverage: seam 1 = Task 1; seam 2 = Tasks 2 + 3; the brief's "reference doc and a
  contract test" ask is inside Task 1; the deadline-bearing seam (2) is fully specified by the
  stamp and diff contracts. No other asks exist in the brief (its own scope check).
- Type consistency: `publishedAt` (camelCase, matching `mediaRefs`) is the one name; the brief's
  `published_at` was a prose spelling, not a field commitment. `EditorRow`/`Role` names match
  the scouted declarations.
- The legacy-unstamped rule and the presence-of-stamp diff are one design decided together;
  Tasks 2 and 3 state it identically on purpose.

## Close-out

The `cairn-pass` pass-end ritual applies (reviewer fan-out including
`web-auth-security-reviewer` for Task 1's auth-adjacent surface, code-simplifier before the
final commits, STATUS update, post-mortem). A publish is likely warranted at close under the
consumer-needs trigger; that is `cairn-release`'s call, made then, not a pre-numbered promise.
