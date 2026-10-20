# Media Library direct upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an author upload a single image directly into the `/admin/media` Library; the bytes store to R2 and a new `media.json` row commits to `main` so the asset appears in the Library.

**Architecture:** Factor `uploadAction`'s store-and-derive body into a shared helper; add one `mediaLibraryUpload` action that calls it then commits the derived row to `main` (mirroring the safe-delete/rename commit pattern); wire the Library's two `Upload` buttons and the empty-state drop target to the editor's existing capture card and upload transport, posting to the new action; refresh via `goto('/admin/media?uploaded=1')`.

**Tech Stack:** SvelteKit form actions over a `text/plain` upload transport, the `GithubDouble` + miniflare test backends, vitest (unit/integration/component) + Playwright (showcase e2e).

**Design reference (authoritative):** `docs/superpowers/specs/2026-06-30-cairn-media-library-upload-design.md`. Where this plan and the spec disagree, the spec wins.

## Global Constraints

- **The client posts only the file** (plus name/alt/filename as `X-Cairn-*` headers, exactly as the editor upload does). The server derives every committed field; never commit a client-posted record.
- **The row commits directly to `main`** (`backend.defaultBranch`), mirroring `mediaDeleteAction` / `mediaUpdateAction`. No staging area, no branch.
- **Single-file only.** The drop target takes one file per gesture (reuse `firstImageFile`). No multi-file/batch (deferred).
- **A duplicate-hash upload is an idempotent no-op** (the row already exists; commit nothing, return success).
- **Reuse, do not fork:** `MediaCaptureCard`, `buildUploadRequest`/`sendUpload`/`uploadOutcome`, `upsertMediaEntry`/`serializeMediaManifest`, the safe-delete commit shape. No change to `uploadAction`'s behavior, delivery, or the manifest schema.
- **Additive, non-breaking, no consumer action.** No public export expected; `CHANGELOG.md` note under `## Unreleased`; `package.json` untouched; release held.
- **Tests live under `src/tests/{unit,integration,component}/`**, never co-located. Gate: `npm run check` 0/0, `npm test` exit 0, the doc gates.

---

## File structure

- **Modify** `src/lib/sveltekit/content-routes.ts` — extract `ingestAndStore` from `uploadAction` (steps 1-7, gates through the `MediaEntry` record at 2051-2068); add `mediaLibraryUpload`; add `'uploaded'` to the `mediaLibraryLoad` flash; return `mediaLibraryUpload` in the record at ~3309.
- **Modify** `src/lib/sveltekit/cairn-admin.ts` — register `mediaLibraryUpload: viewAction(['media'], ...)` beside `mediaUpload` (line 228).
- **Modify** `src/lib/components/CairnMediaLibrary.svelte` — wire the two `Upload` buttons (1297-1302, 1330-1335) + a page/empty-state drop target + the `MediaCaptureCard` + the upload-and-refresh flow; add the `'uploaded'` flash-strip copy; drop the `TODO(Task 7+)`.
- **Tests:** `src/tests/unit/content-routes-media.test.ts` (the `'uploaded'` flash), a new or extended integration test for `mediaLibraryUpload` (the commit + dedup + gates), `src/tests/component/CairnMediaLibrary.test.ts` (the UI flow), `examples/showcase/.../media-library.spec.ts` (the e2e).
- **Docs:** `docs/guides/manage-the-media-library.md`, `CHANGELOG.md`, `ROADMAP.md`, `docs/internal/docs-friction-log.md`.

Order: T1 → T2 (uses T1's helper) → T3 (independent) → T4 (uses T2's endpoint + T3's flash) → T5 (e2e, needs T4) → T6 (docs).

---

## Task 1: Factor `uploadAction`'s store-and-derive into a shared helper

**Files:** Modify `src/lib/sveltekit/content-routes.ts` (the `uploadAction` body, 1957-2068)

**Interfaces:**
- Produces: `async function ingestAndStore(event: ContentEvent): Promise<ReturnType<typeof fail> | UploadResult>` — the current `uploadAction` body verbatim (gates 1-7, hash, put-first R2 store+dedup, the `MediaEntry` record, `mediaToken` reference, the `media.uploaded` log, `return { reference, record, reused, mismatch }`).
- `uploadAction` becomes `async function uploadAction(event) { return ingestAndStore(event); }`.

This is a pure refactor: no behavior change, proven by the existing suite.

- [ ] **Step 1: Run the existing upload tests green (baseline)**

Run: `npx vitest run src/tests/integration/media-upload.test.ts`
Expected: PASS (establishes the behavior the refactor must preserve).

- [ ] **Step 2: Extract the body**

Move the entire current `uploadAction` body (1957-2068) into a new `ingestAndStore(event)` with the same return type, and make `uploadAction` delegate to it. Keep every gate, header read, and the record fields identical.

- [ ] **Step 3: Re-run the tests**

Run: `npx vitest run src/tests/integration/media-upload.test.ts` and `npm run check`
Expected: PASS, 0/0. Any diff in behavior is a refactor bug.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sveltekit/content-routes.ts
git commit -m "refactor(media): extract uploadAction's store-and-derive into ingestAndStore"
```

---

## Task 2: The `mediaLibraryUpload` action (store + commit)

**Files:** Modify `src/lib/sveltekit/content-routes.ts`; Test `src/tests/integration/media-library-upload.test.ts` (new) or extend `content-routes-media.test.ts`

**Interfaces:**
- Consumes: `ingestAndStore` (Task 1); `parseMediaManifest`, `parseMediaJson`, `upsertMediaEntry`, `serializeMediaManifest` (from `src/lib/media/manifest.ts`); `backend.readFile`, `backend.commit`, `backend.defaultBranch`; `runtime.mediaManifestPath`; `commitFailure` / the log pattern.
- Produces: `async function mediaLibraryUpload(event: ContentEvent): Promise<ReturnType<typeof fail> | UploadResult>`, added to the `createContentRoutes` return object (~3309).

Shape (mirror the commit half of `mediaDeleteAction` 2170-2183 / `mediaUpdateAction` 2482-2494):

```ts
async function mediaLibraryUpload(event: ContentEvent): Promise<ReturnType<typeof fail> | UploadResult> {
  const result = await ingestAndStore(event);
  if (!('record' in result)) return result; // a fail envelope from the gates/store
  const editor = event.locals.editor!; // ingestAndStore already refused a missing session
  const manifest = parseMediaManifest(parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));
  if (manifest[result.record.hash]) return result; // idempotent: bytes+row already present, commit nothing
  const commitFields = { concept: 'media', id: result.record.hash, editor: editor.email };
  try {
    await backend.commit(
      backend.defaultBranch,
      [{ path: runtime.mediaManifestPath, content: serializeMediaManifest(upsertMediaEntry(manifest, result.record)) }],
      { name: editor.displayName, email: editor.email },
      `Upload media: ${result.record.slug}`,
    );
    log.info('commit.succeeded', commitFields);
  } catch (err) {
    log.warn('commit.failed', { ...commitFields, reason: 'conflict' });
    return fail(409, { error: 'The media manifest changed since you opened it. Reload and try again.' });
  }
  return result;
}
```

(Read the real `mediaDeleteAction` to match the exact `commitFailure`/logging idiom and the `ContentEvent`/`fail` imports; adapt the conflict arm to RETURN a `fail` envelope rather than throwing a redirect, because this action's client reads an envelope, not a redirect.)

- [ ] **Step 1: Write the failing integration test**

In a new `src/tests/integration/media-library-upload.test.ts` (model the setup on `content-routes-media.test.ts` / `media-upload.test.ts`: a `GithubDouble`, a media-on runtime, an editor session, the `text/plain` body + `X-Cairn-*` headers + CSRF header):

```ts
it('commits a new media.json row to main on upload', async () => {
  // ... build routes with a GithubDouble seeded with an empty media.json ...
  const res = await routes.mediaLibraryUpload(uploadEvent(pngBytes, { filename: 'first.png', alt: '' }));
  expect('record' in res).toBe(true);
  const committed = JSON.parse(await backend.readFile(runtime.mediaManifestPath, 'main'));
  expect(Object.values(committed)).toHaveLength(1);
  expect(committed[(res as UploadResult).record.hash].slug).toBe('first');
});

it('commits nothing when the hash already exists (idempotent)', async () => { /* seed manifest with the hash; assert no new commit */ });
it('refuses without a session / with a bad CSRF', async () => { /* inherited from ingestAndStore gates */ });
```

- [ ] **Step 2: Run it, verify it fails** — `mediaLibraryUpload` not defined.
- [ ] **Step 3: Implement** the action per the shape above and add it to the `createContentRoutes` return record (~3309).
- [ ] **Step 4: Run it, verify it passes.** Then `npm run check` 0/0.
- [ ] **Step 5: Commit**

```bash
git add src/lib/sveltekit/content-routes.ts src/tests/integration/media-library-upload.test.ts
git commit -m "feat(media): commit a media.json row on a Library-direct upload"
```

---

## Task 3: Register the action and add the `'uploaded'` flash

**Files:** Modify `src/lib/sveltekit/cairn-admin.ts` (line 228 area); Modify `src/lib/sveltekit/content-routes.ts` (`mediaLibraryLoad`, 960-1027); Test `src/tests/unit/content-routes-media.test.ts`

**Interfaces:**
- `cairn-admin.ts`: `mediaLibraryUpload: viewAction(['media'], (event) => content.mediaLibraryUpload(contentEvent(event, {}))),` beside the existing `mediaUpload` at line 228.
- `mediaLibraryLoad`: add `'uploaded'` to the `MediaLibraryData['flash']` union and the param read.

- [ ] **Step 1: Write the failing test** (in `content-routes-media.test.ts`, matching its `mediaLibraryLoad` cases):

```ts
it('reports the uploaded flash', async () => {
  const data = await routes.mediaLibraryLoad(loadEvent('/admin/media?uploaded=1'));
  expect(data.flash).toBe('uploaded');
});
```

- [ ] **Step 2: Run it, verify it fails.**
- [ ] **Step 3: Implement** — add `else if (event.url.searchParams.get('uploaded') === '1') flash = 'uploaded';` in `mediaLibraryLoad`, extend the `flash` union type to include `'uploaded'`, and add the `viewAction(['media'])` registration in `cairn-admin.ts`.
- [ ] **Step 4: Run it, verify it passes.** Then `npm run check` 0/0 (the union change is type-checked).
- [ ] **Step 5: Commit**

```bash
git add src/lib/sveltekit/cairn-admin.ts src/lib/sveltekit/content-routes.ts src/tests/unit/content-routes-media.test.ts
git commit -m "feat(media): register mediaLibraryUpload and add the uploaded flash"
```

---

## Task 4: Wire the Library UI (buttons, dropzone, capture, upload)

**Files:** Modify `src/lib/components/CairnMediaLibrary.svelte`; Test `src/tests/component/CairnMediaLibrary.test.ts`

**Interfaces:**
- Consumes: `MediaCaptureCard` (props `{ file: File; oncapture: (r: CaptureRecord) => void }`, `CaptureRecord = { file, displayName, alt, decorative }`); `ingestFile`, `buildUploadRequest`, `sendUpload` (from `client-ingest.js`); `uploadOutcome` (from `media-upload-outcome.js`); `firstImageFile` (the editor's drop guard); `goto`, `invalidateAll` from `$app/navigation`.
- The upload posts to `?/mediaLibraryUpload` (override `buildUploadRequest`'s URL, exactly as `runReplaceUpload` overrides it to `REPLACE_UPLOAD_URL`).

Wiring:
- A hidden `<input type="file" accept="image/*">`; both `Upload` buttons (1297-1302, 1330-1335) call `input.click()` on click.
- A drop target (the empty-state box, and/or the page) with `dragover`/`drop` handlers that take `firstImageFile(dataTransfer)` (one file per gesture).
- On a chosen/dropped file, open `MediaCaptureCard` with it.
- On `oncapture(record)`: `ingestFile(record.file)` → `buildUploadRequest({ ...headers from record.displayName/alt/filename, csrf })` with the URL replaced by `'?/mediaLibraryUpload'` → `sendUpload(url, init)` → `uploadOutcome(res)`. On `kind: 'inserted'`, `await goto('/admin/media?uploaded=1')` (re-runs the loader, shows the flash). On `kind: 'failed'`, show the retry card (reuse the Replace failure treatment). On `kind: 'session-expired'`, the generic session card.
- Remove the `TODO(Task 7+)` comment.

- [ ] **Step 1: Write the failing component test** (model on the Replace test in `CairnMediaLibrary.test.ts`; mock `ingestFile`/`sendUpload` from `client-ingest.js` and `goto` from `$app/navigation`):

```ts
it('uploads a chosen file from the Upload button and refreshes', async () => {
  // render CairnMediaLibrary with an empty assets set; mock ingestFile + sendUpload to a success envelope
  // click the header Upload button -> file input; dispatch a change with a File
  // fill the capture card name; submit
  // assert sendUpload was called with a url ending in '?/mediaLibraryUpload'
  // assert goto('/admin/media?uploaded=1') was called
});
it('accepts a dropped file on the empty-state dropzone', async () => { /* dispatch drop with an image file */ });
```

- [ ] **Step 2: Run it, verify it fails** (buttons unwired).
- [ ] **Step 3: Implement** the wiring above, including the `'uploaded'` flash-strip copy (add an `uploaded` case to the component's flash rendering, matching the `deleted`/`updated` copy grammar).
- [ ] **Step 4: Run it, verify it passes.** Then `npm run check` 0/0.
- [ ] **Step 5: Commit**

```bash
git add src/lib/components/CairnMediaLibrary.svelte src/tests/component/CairnMediaLibrary.test.ts
git commit -m "feat(media): wire the Library's direct upload buttons and drop target"
```

---

## Task 5: Showcase e2e

**Files:** Modify `examples/showcase/.../media-library.spec.ts` (find its exact path under `examples/showcase`)

- [ ] **Step 1: Add a UI-driven upload spec** — open `/admin/media`, click `Upload`, choose a fixture image, fill the name, submit, and assert the asset appears in the grid after the redirect. Match the existing spec's admin-session setup and selectors.
- [ ] **Step 2: Run it** — `npm --prefix examples/showcase run test:e2e` (or the repo's e2e command). Expected: PASS.
- [ ] **Step 3: Commit**

```bash
git add examples/showcase
git commit -m "test(media): e2e the Library direct upload"
```

---

## Task 6: Docs

**Files:** `docs/guides/manage-the-media-library.md`, `CHANGELOG.md`, `ROADMAP.md`, `docs/internal/docs-friction-log.md`

- [ ] **Step 1: Guide** — add a "Upload an image" step to `manage-the-media-library.md` (the buttons, drop target, the name/alt capture, that the asset lands unreferenced until placed).
- [ ] **Step 2: CHANGELOG** — under `## Unreleased`, an additive, no-consumer-action note: the Media Library gains direct single-file upload; the asset commits to `main` and appears as "No references found" until placed.
- [ ] **Step 3: ROADMAP** — mark the `## Next` item "Wire the Media Library's direct upload" done and prune it.
- [ ] **Step 4: Friction log** — record any friction the wiring surfaced (developer or editor perspective).
- [ ] **Step 5: Doc gates** — `npm run check:docs && npm run check:reference && npm run check:package`. Expected PASS.
- [ ] **Step 6: Commit**

```bash
git add docs/ ROADMAP.md CHANGELOG.md
git commit -m "docs(media): record the Library direct-upload finish-up"
```

---

## Self-review notes

- **Spec coverage:** the spec's four in-scope items map to Task 4 (button/dropzone wiring + capture + refresh), Task 2 (the commit action) built on Task 1 (the shared helper), Task 3 (registration + flash), and Task 6 (drop the TODO is in Task 4; docs in Task 6). Single-file-only and idempotent-dedup are enforced in Task 2/Task 4.
- **Type consistency:** `ingestAndStore` (Task 1) returns the same `ReturnType<typeof fail> | UploadResult` that `mediaLibraryUpload` (Task 2) branches on with `'record' in result`. `upsertMediaEntry`/`serializeMediaManifest` are the existing `manifest.ts` helpers. The `'uploaded'` flash value is added to the union in Task 3 and rendered in Task 4.
- **Security:** the client posts only the file; the server derives and commits the record (Task 2). No client-record trust path exists.
- **Owed:** a live admin smoke against a real Worker rides the next site cutover (it commits real content), consistent with the media passes' standing deferral; the showcase e2e + the workerd integration suite prove it meanwhile.

---

## Post-mortem (2026-07-01)

**Built.** All six tasks landed test-first on the `media-library-upload` worktree off `main`
(`9c806b4`), then a review-fix pass. The Media Library gains direct single-file upload: the two
`Upload` buttons and a page drop target open the reused `MediaCaptureCard`, the file posts to a new
`mediaLibraryUpload` action that shares `uploadAction`'s store-and-derive body (factored out as
`ingestAndStore`) then commits the derived `media.json` row to `main`, and the client refreshes to the
`uploaded` flash. Single-file, idempotent on a duplicate hash, client posts only the file. Commits:
`58d05c9` (ingestAndStore extraction), `6f56e14` (the action + commit), `2fd3458` (registration +
flash), `269b387` (UI wiring), `1234117` (e2e), `6112c15` (docs), `82ba0bd` (simplify), `e25f57e`
(review-gate fixes), `2c18502` (e2e label follow-up).

**Verified.** Final gate at HEAD: `npm run check` 0/0 (1256 files), `npm test` exit 0 (278 files,
2908 tests), `check:comments` OK, all four doc gates (`check:docs`, `check:reference`,
`check:reference:signatures`, `check:package`). The `media-library.spec.ts` e2e passes in real
Chromium against a fresh `dist` build (8 passed). New tests: 4 integration cases for the commit
(new-row, idempotent no-op, no-session, bad-CSRF), 2 for the `expectedHead` guard (5th-arg spy + a
simulated concurrent-uploader 409), component cases for the button/drop/refresh flow and the
dragover gate, plus the e2e.

**Decisions locked.** The row commits directly to `main`, no staging. `ingestAndStore` is the shared
store-and-derive seam; the editor upload stores only, the Library upload stores then commits. The
commit is fail-closed via `expectedHead` (read the head before the manifest), matching
`settingsSave`/`vocabularySave`, so the advertised `fail(409)` reload prompt is real and a concurrent
upload cannot last-writer-wins a row off the backstop-less `media.json`. `MediaCaptureCard` gained an
optional `submitLabel` (default `"Insert image"`; the Library passes `"Upload image"`). The page drop
target gates `preventDefault` on `dataTransfer.types.includes('Files')` (the only readable signal in
dragover's protected mode) and stands down while any `dialog[open]` is present.

**Review gate.** Four reviewers (svelte, daisyui-a11y, cloudflare-workers, an adversarial Opus
correctness pass) found nine issues; seven were folded (`e25f57e`): a real-browser drop blocker the
tests masked, a repeat-upload staleness bug (confirmed twice, restored the spec's `invalidateAll`),
the concurrency `expectedHead` guard, a phantom file-input tab stop, the drop-guard dialog gap, the
capture-card label, and a misleading light-dismiss comment. Three low findings were deferred to the
friction log: the `fail(409)` message collapsing to the generic card (Retry recovers), a
failed-state focus move (sibling-consistent), and non-image-drop feedback.

**Owed / carried.** The live admin smoke against a real Worker rides the next site cutover (standing
media-pass deferral). The three deferred review findings are in `docs/internal/docs-friction-log.md`.

**Release.** Held. `package.json` untouched at `0.78.1`; the `## Unreleased` CHANGELOG entry is
finalized. Batches with the CM a11y passes and `starter-template-1`.
