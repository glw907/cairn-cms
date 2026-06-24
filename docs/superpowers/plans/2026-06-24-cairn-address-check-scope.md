# Plan: address-check scope (main-arm at edit-load)

Implements [`2026-06-24-cairn-address-check-scope-design.md`](../specs/2026-06-24-cairn-address-check-scope-design.md).
Narrows the edit-load cross-branch address check to the main arm (zero extra GitHub reads per editor
open), keeping the full cross-branch re-check at publish. Resolves the Pass 3 cloudflare carry-forward.

## Working context (read first)

- **Worktree:** `/home/glw907/Projects/cairn-cms-edit-load-address-scope` on branch
  `feat/edit-load-address-scope` off `main`. Run every command and make every edit in this worktree,
  never the `/home/glw907/Projects/cairn-cms` main checkout.
- **Dist is already built** (`npm run package` ran clean). Do not rebuild unless a `.svelte` file
  changes; none should. Before any `npm test`, dist must exist (it does), per the worktree dist-build
  gotcha.
- **The gate** (run from the worktree): `npm run check` (svelte-check, 0 errors / 0 warnings),
  `npm test` (must exit 0, check PIPESTATUS, not just the assertion count), and `npm run check:comments`
  (the ESLint TSDoc + em-dash gate over `src/lib`).
- **No public export changes.** `mainAddressIndex` is internal (`advisories.ts` is not exported from a
  subpath). `AdvisoryNotice`/`AdvisoryAction` already export, unchanged. This is a patch bump.

## Task 1: extract `mainAddressIndex`, compose `buildAddressIndex`

**Files:** `src/lib/content/advisories.ts`, `src/lib/content/advisories.test.ts`.

**Test first.** Add a `describe('mainAddressIndex')` to `advisories.test.ts`:
- Given a manifest with two entries that resolve to distinct permalinks, the index has both, each
  `source: 'main'`, keyed by permalink.
- Given two manifest entries resolving to the SAME permalink, the bucket holds both, so
  `addressCollision(index, { concept, id }, address)` returns the other entry.
- `mainAddressIndex` is synchronous (no `await`, no backend, no token): assert by calling it with the
  manifest alone.
- The existing `buildAddressIndex` full-union test (main + branches) and the `addressCollision` tests
  stay and must still pass after the refactor.

**Implement.** Add:

```ts
/**
 * The address index over main only: a synchronous reverse map of each manifest entry's resolved
 * permalink. No backend read, so an edit-load can build it for free from the manifest it already holds.
 */
export function mainAddressIndex(manifest: Manifest): AddressIndex {
  const index: AddressIndex = new Map();
  for (const entry of manifest.entries) {
    push(index, entry.permalink, { concept: entry.concept, id: entry.id, title: entry.title, source: 'main' });
  }
  return index;
}
```

Refactor `buildAddressIndex` to seed from it rather than re-walking the manifest inline: replace the
main-arm `for` loop with `const index = mainAddressIndex(manifest);`, then add the branch arm exactly as
today. `buildAddressIndex`'s signature, behavior, and the branch arm are unchanged. Update the module
doc comment at the top of the file to read "main arm at edit-load, full cross-branch at publish."

**Exit:** `npm run check` 0/0, `npm test` exit 0, `npm run check:comments` clean.

```
git add src/lib/content/advisories.ts src/lib/content/advisories.test.ts
git commit -m "refactor: extract mainAddressIndex from buildAddressIndex"
```

## Task 2: edit-load calls the main arm

**Files:** `src/lib/sveltekit/content-routes.ts`, and the editLoad integration test file that covers the
address advisory (find it: `grep -rln "address-collision\|advisories" src/lib/sveltekit/*.test.ts`).

**Test first.** Confirm the existing editLoad address-collision integration test asserts a collision with
a PUBLISHED entry (a manifest entry on `main`). It must stay green with the main-arm switch. Then search
test-wide for any assertion that depends on the removed behavior and adjust it:
- An editLoad test that expects a BRANCH-ONLY collision advisory (the colliding entry exists only on a
  sibling `cairn/*` branch, not in the manifest): this case no longer fires at edit-load by design.
  Re-point it to assert no advisory at edit-load for a branch-only collision, and that the publish
  re-check still detects it (the publishAction test already covers publish; do not duplicate).
- Any test asserting `editLoad` logs `github.unreachable` with `scope: 'edit-advisories'`: remove it;
  that path no longer does a network read.

**Implement.** In `editLoad`, in the advisory block (around line 1078):
- Replace `const addressIndex = await buildAddressIndex(runtime.backend, token, runtime.concepts, manifest);`
  with `const addressIndex = mainAddressIndex(manifest);`.
- Update the import on line 11 to bring in `mainAddressIndex` (drop `buildAddressIndex` from the editLoad
  import only if no other use in the file remains; `publishAction` still imports and uses it, so keep it).
- Remove the `log.warn('github.unreachable', { scope: 'edit-advisories', error: String(err) });` line.
  Keep the surrounding `try`/`catch` (so an `entryIdentity` throw on a malformed-date entry degrades to no
  advisory), but the `catch` body is now empty or a terse comment; degrade silently to no advisory.
- Update the inline comment above the block (currently "Build it from the same manifest read above (no
  second read)...") to state the main-arm-only behavior and that publish re-checks full cross-branch.

Do not touch `publishAction`.

**Exit:** `npm run check` 0/0, `npm test` exit 0, `npm run check:comments` clean.

```
git add src/lib/sveltekit/content-routes.ts <the editLoad test file>
git commit -m "perf: build the edit-load address index from main only"
```

## Task 3: docs and version

**Files:** `CHANGELOG.md`, `docs/guides/upgrade-cairn.md`, `docs/reference/log-events.md`,
`docs/internal/docs-friction-log.md`, `package.json`.

- **`package.json`:** bump the patch version (`0.62.1` -> `0.62.2`). Run `npm run check:version` (expect
  `OK (patch)`).
- **`CHANGELOG.md`:** a new `## 0.62.2` entry at the top. State the behavior: the edit-load
  address-collision advisory now checks the published corpus only, so it fires for a collision with a
  published entry; the publish-time re-check stays full cross-branch and still emits
  `publish.address_collision`. No consumer action. Plain prose, no em dash (changelog register).
- **`docs/guides/upgrade-cairn.md`:** a per-version `0.62.2` entry, stating no consumer action.
- **`docs/reference/log-events.md`:** if the `github.unreachable` row enumerates an `edit-advisories`
  scope, drop it; keep `publish-advisories`. If scopes are not enumerated there, no change.
- **`docs/internal/docs-friction-log.md`:** flip the Pass 3 fan-out carry-forward (the "cross-branch
  fan-out now runs on every editor open" item) to resolved, naming this pass.

**Run all doc gates:** `npm run check:reference`, `npm run check:reference:signatures`,
`npm run check:package`, `npm run check:docs`. All must exit 0.

**Exit:** the four doc gates plus `check:version` exit 0.

```
git add CHANGELOG.md docs/guides/upgrade-cairn.md docs/reference/log-events.md \
        docs/internal/docs-friction-log.md package.json
git commit -m "docs: changelog, upgrade guide, friction log for the address-scope pass; bump 0.62.2"
```

## Verification gate (after all three tasks)

1. Full gate from the worktree: `npm run check` (0/0), `npm test` (exit 0 via PIPESTATUS),
   `npm run check:comments`, and the four doc gates above.
2. From-scratch consumer build: `rm -rf examples/showcase/{node_modules,package-lock.json}`, then a fresh
   `npm install` and `npm run build` in `examples/showcase`, exit 0. Restore the committed showcase
   lockfile after.
3. Review: `cloudflare-workers-reviewer` (the read-path change is the core of this pass). The publish path
   is untouched, so `web-auth-security-reviewer` is optional; no `.svelte` change, so the svelte and a11y
   reviewers do not apply.
4. No live admin smoke this pass (no new `/admin` surface; it rides the first site cutover with the Pass 3
   advisory smoke already owed).

## Out of scope

The publish-path branch arm (stays), live client-side recomputation (deferred), and dropping the branch
arm entirely (Option C, revisit later).
