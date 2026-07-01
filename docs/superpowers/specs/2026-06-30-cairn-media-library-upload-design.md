# Media Library direct upload design

A small media finish-up: let an author upload an image straight into the `/admin/media` Library, instead of
only by inserting one while editing an entry. Filed in `ROADMAP.md` `## Next` after the 2026-06-28
principle-adherence audit found the Library's two `Upload` buttons (header and empty state) shipped as unwired
shells.

Brainstormed and scope-approved with Geoff 2026-06-30. Subordinate to the charter; this is cairn's core job
(managing markdown content and its media), served by the existing media substrate.

## The gap

The Library screen lets an author browse, replace, safe-delete, and edit the alt/name of committed assets, but
there is no way to add a new asset there. The two `Upload` buttons and the empty-state drop target are inert.
An author's only path to a new image is the editor's insert flow, which stores the asset and commits its
`media.json` row *with the entry at Save*.

The subtlety the ROADMAP framing ("wire the buttons to `?/mediaUpload`") undercounts: `uploadAction`
(content-routes.ts:1957, step 7 "commit nothing") stores the bytes to R2 and returns the record, but does not
commit the `media.json` row. That is correct for the editor flow, where the row rides the entry's Save. A
Library-direct upload has no entry and no Save, so wiring the buttons to `?/mediaUpload` alone would store bytes
that never appear in the Library (which reads committed rows). The pass therefore adds a small server action, it
is not pure frontend wiring.

## Scope

**In scope**

1. Wire the two `Upload` buttons and the empty-state drop target to a single-file upload flow: choose or drop a
   file, name it and (optionally) describe it in the existing `MediaCaptureCard` (alt-as-debt), upload the
   bytes through the transport the Replace flow already uses, then commit the new `media.json` row to `main`.
2. A new admin action that commits the uploaded asset's row to `main` (the manifest read, the row insert, one
   `commitFiles` to `main`), registered at both composer sites. Model it on the existing safe-delete and
   rename/default-alt actions, which already commit `media.json` to `main`.
3. Refresh the Library so the new asset appears (the enhanced-form redirect re-runs `mediaLibraryLoad`).
4. Drop the stale `TODO(Task 7+)` marker.

**Out of scope**

- **Multi-file / batch upload.** The media initiative gates batch upload behind a batch-coalesced ingest (many
  R2 puts, one commit) that is not designed yet (2b open risk 5). This pass is single-file only; batch is a
  separate future pass, and the drop target accepts one file per gesture.
- **Any change to the editor insert flow, `uploadAction`, delivery, or the manifest schema.** The pass reuses
  all of them unchanged.
- **A new "pending uploads" staging concept.** The row commits directly to `main`, see below.

## Design

### The flow

The Library's `Upload` buttons and the empty-state dropzone open the same single-file capture the editor insert
uses:

1. **Choose or drop** one image file (a file input behind the buttons; the empty-state drop target accepts one
   file per drop, reusing the editor's `firstImageFile` guard).
2. **Capture** in `MediaCaptureCard`: the display name (prefilled from the filename) and the alt text
   (alt-as-debt, never blocking). This is the same component and alt model the insert popover uses.
3. **Upload and commit in one server step.** Post the file (the same `text/plain` transport `runReplaceUpload`
   uses via `buildUploadRequest` / `sendUpload`) to a new media-scoped action, overriding the endpoint to
   `?/mediaLibraryUpload`. The action stores the bytes to R2 and commits the derived `media.json` row to
   `main`, deriving every committed field server-side. It never trusts a client-posted record; the client
   posts only the file (and the name/alt as request headers, exactly as the editor upload already does). A
   content-hash dedup makes a re-upload of identical bytes an idempotent no-op (the row already exists),
   consistent with `uploadAction`'s put-first R2 dedup.
4. **Refresh.** On the success envelope the client calls `invalidateAll()` to re-run `mediaLibraryLoad` so the
   new asset shows in the grid, and surfaces the success through the component's existing feedback strip; the
   capture card closes. A commit conflict returns a failure envelope the capture step shows without losing the
   file (matching the Replace flow's retry card).

### The persistence model: commit directly to `main`

The uploaded row commits directly to `main` at upload time. This is the only model consistent with the Library,
which operates on `main` for every write it already does: safe-delete commits a row removal to `main`,
rename/default-alt commit a row edit to `main`, and Pass B's replace/alt-propagation commit to `main`. A
staging area or branch would be a new concept the Library does not otherwise have.

An uploaded asset that no author has placed yet is simply unreferenced. The Library's existing usage overlay
reads it as "No references found" (Pass C's model, a reversible git delete, never an irreversible purge), so an
unused upload is already a first-class, safe state. No new lifecycle is introduced.

### The new action

A single new content-routes action (working name `mediaLibraryUpload`; final name settled in the plan) that
stores the bytes AND commits the row in one server step, so the client posts only the file and the server
derives every committed field. Its store-and-derive half is exactly `uploadAction`'s (the gates, the
server-side hash, the put-first R2 dedup, the `MediaEntry` record it builds at content-routes.ts:2051-2068);
factor that shared body into an internal helper so the editor upload (store only) and the Library upload (store
then commit) both call it, rather than duplicating it or trusting a client record. Its commit half mirrors the
safe-delete / rename actions (content-routes.ts:2170-2183, 2482-2494): read `media.json` from
`backend.defaultBranch`, `upsertMediaEntry` the derived row, `serializeMediaManifest`, one `backend.commit` to
`main` with a clear message (`Upload media: ${record.slug}`), and route a conflict through `commitFailure`. A
hash already in the manifest short-circuits to a no-op success (idempotent re-upload). It registers at both
composer points (`createContentRoutes`'s returned record near content-routes.ts:3309 and a new
`viewAction(['media'])` entry in `cairn-admin.ts` beside the existing `mediaUpload`), the two-registration
gotcha Pass B recorded.

## Architecture and reuse

Everything but the new action and the button wiring is reuse:

- **Transport:** `buildUploadRequest` / `sendUpload` / the `?/mediaUpload` override, verbatim from the Replace
  flow.
- **Capture:** `MediaCaptureCard`, verbatim (display name + alt-as-debt).
- **Commit template:** the safe-delete and rename actions' manifest-read + `commitFiles`-to-`main` shape.
- **Manifest edit:** a pure helper that inserts a row into the parsed manifest (mirroring the pure transforms
  Pass B introduced), so the commit action stays thin and the row logic is unit-testable.

The new surface is small: one pure manifest-insert helper, one action, the two registrations, and the
component's upload state (the buttons, the dropzone handler, the capture-card wiring, the commit post).

## Testing

Test-first. The layers (tests live under `src/tests/{unit,integration,component}/`, never co-located):

- **Unit:** the pure manifest-insert helper (inserts a row; an existing-hash upload is a no-op; the row carries
  the record's fields).
- **Integration (workerd + miniflare):** the new commit action against a real manifest and GitHub double: an
  upload commits a new `media.json` row to `main`; a duplicate-hash upload commits nothing; the action refuses
  without a session / with a bad CSRF, matching the other media actions.
- **Component (real browser):** the Library `Upload` button opens the capture card; a chosen file uploads and
  the asset appears after the redirect; the empty-state dropzone accepts a dropped file; alt stays optional.
- **E2E:** extend `media-library.spec.ts` with a UI-driven upload that ends with the asset in the grid.
- **Gates:** `npm run check` 0/0, `npm test` exit 0, and the doc gates. A live admin smoke against a real Worker
  is owed at the next site cutover (it commits real content), consistent with the media passes' standing
  deferral; the showcase e2e plus the workerd integration suite prove it meanwhile.

## Consumers, docs, and release

- **Consumer impact: none.** The change is admin-side and additive; no public API, delivery, or manifest-schema
  change. An upgrading site gets the Library upload with no action.
- **New exports: expected none** beyond internal wiring; if a reusable helper is exported it gets a reference
  page. The new action is engine-internal (registered, not exported).
- **Docs:** extend `docs/guides/manage-the-media-library.md` with the direct-upload step; a `CHANGELOG.md`
  `## Unreleased` note (additive, no consumer action); mark the ROADMAP `## Next` item done and prune it; a
  friction-log entry for anything the writing surfaces.
- **Release:** held and batched per policy; `package.json` untouched. The pass does not cut a release.

## Decisions locked

- Single-file only; multi-file/batch stays deferred (needs the batch-coalesced ingest).
- The uploaded row commits directly to `main`; no staging area or branch.
- The client posts only the file (plus name/alt headers); the server derives every committed field. Factor
  `uploadAction`'s store-and-derive body into a shared helper the editor upload (store only) and the Library
  upload (store then commit) both call, rather than trusting a client-posted record.
- Reuse `MediaCaptureCard` and the Replace-flow transport unchanged; add only the combined store-and-commit
  action, the shared helper, the two registrations, and the button/dropzone wiring.
- A duplicate-hash upload is an idempotent no-op row.
- Additive, non-breaking, no consumer action; release held.

## Open questions for the plan

- The final action name and the exact flash keys (mirror the `?deleted`/`?updated` grammar the Library flash
  already uses).
- Whether the manifest-insert helper lives beside the existing pure media transforms (`content/media-rewrite.ts`
  and siblings) or in a new small module; an organization call for the plan.
