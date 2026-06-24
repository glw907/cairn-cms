# Advisory validation and address collisions (editor-help Pass 3) design

The third pass of the editor-help initiative. It adds an internal advisory-notices channel in the
entry editor and the first server-computed notice that rides it: a cross-branch address-uniqueness
warning. Both are warn-and-allow, never a publish gate. The pass closes two friction-log items: the
editor has no place for a non-blocking advisory beyond the ad-hoc needs-alt alert, and a second entry
silently taking a live address is invisible until the wrong post is on the site.

This supersedes the Pass 3 sketch in
[`2026-06-23-cairn-editor-help-foundation.md`](../plans/2026-06-23-cairn-editor-help-foundation.md).

## Settled decisions (from the brainstorm)

- **A specific, internal advisory channel, not a public adapter seam.** No new adapter API. The channel
  is an internal notice shape plus one rendering region; it grows a new consumer by adding a notice, not
  by exposing a contract.
- **The address check runs at edit-load, full cross-branch**, and surfaces as an editor advisory notice
  while editing, consistent with how the existing needs-alt notice surfaces. A publish-time re-check
  keeps the override honest at the decisive moment.
- **Full unification.** The address-collision notice (server-computed) and the needs-alt notice
  (client-derived, live) both render through one advisory region and one notice shape. Regression tests
  pin needs-alt's count, focus actions, source-range jumps, and hero rows so the refactor cannot weaken
  the accessibility behavior.
- **Warn-and-allow, last-write-wins.** The collision never gates Publish. The warning makes the
  last-write-wins outcome visible instead of silent.

## Background: the two existing models this reuses

- **The needs-alt notice is client-derived and live.** `EditPage.svelte` computes
  `findMediaImagesNeedingAlt(body)` (from `markdown-format.ts`) as a `$derived`, recomputing as the
  author types; the count drops and the notice clears as each alt is filled. It also carries hero-field
  rows (a frontmatter image field whose hero needs alt) whose action focuses the field's input, and body
  rows whose action jumps to a CodeMirror source range. This computation stays client-side and live; the
  pass changes only how it is presented, routing it through the shared notice shape and region.
- **The cross-branch union pattern is `media/usage.ts`.** `buildUsageIndex(backend, token, concepts,
  manifest, { strict })` lists every open `cairn/*` branch, reads each, and unions the result with
  `main`. The address index mirrors this structure rather than reusing the media-keyed function.
- **The address (permalink) identity is `content/identity.ts` + `permalink.ts`.**
  `entryIdentity(descriptor, path, frontmatter)` returns `{ id, slug, date, permalink }`;
  `permalink(descriptor, { id, slug, date })` is the one resolver every reader shares. `main`'s manifest
  already carries each published entry's resolved `permalink`.

## Architecture

Three units, each independently testable.

### Unit 1: the advisory-notice shape and the cross-branch address index

A new module `src/lib/content/advisories.ts` (pure where it can be, with the branch read injected).

The notice shape, shared by every advisory surface:

```ts
export interface AdvisoryNotice {
  /** A stable discriminator, e.g. 'address-collision' | 'needs-alt'. */
  kind: string;
  severity: 'warn';
  /** The one-line author-facing message. */
  message: string;
  /** An optional running count for a notice that aggregates rows (needs-alt). */
  count?: number;
  /** Optional action rows. A server notice carries a link; a client notice carries a callback. */
  actions?: AdvisoryAction[];
}

export interface AdvisoryAction {
  label: string;
  /** A server notice points at a route; a client notice omits href and the host wires the callback. */
  href?: string;
}
```

The address index builder, modeled on `buildUsageIndex`:

```ts
/** Every entry's resolved address across main and the open edit branches, keyed by permalink. */
export type AddressIndex = Map<string, AddressEntry[]>; // permalink -> entries that resolve to it
export interface AddressEntry { concept: string; id: string; title: string; source: 'main' | 'branch'; }

export async function buildAddressIndex(
  backend, token, concepts, manifest,
): Promise<AddressIndex>;

/** The collision for one entry being edited: a different entry (concept+id) sharing its address. */
export function addressCollision(
  index: AddressIndex, self: { concept: string; id: string }, address: string,
): AddressEntry | null;
```

`buildAddressIndex` seeds from `manifest.entries` (each carries `concept`, `id`, `title`, `permalink`)
as `source: 'main'`, then lists `cairn/*` branches, reads each branch's one entry, resolves its
`permalink` via `entryIdentity`, and adds it as `source: 'branch'`. `addressCollision` returns the first
index entry at `address` whose `concept+id` differs from `self`, or `null`. A pending edit of an entry
that is also published on `main` is the same `concept+id`, so it never collides with itself.

The read degrades like `layoutLoad`'s pending read: a branch read failure is logged and skipped (the
advisory is best-effort, never fail the editor). It is **not** `strict`, because an advisory that fails
open is correct (a missed collision warning is a missed nicety, not a corrupted commit).

### Unit 2: the edit-load wiring, the publish re-check, and the log event

`EditData` gains `advisories: AdvisoryNotice[]` (built server-side; today only the address-collision
notice, an empty array otherwise). `editLoad` builds the address index, resolves the edited entry's
address, and pushes an `address-collision` notice when `addressCollision` returns a match. The message
names the other entry and the address and states the outcome: "Another post already uses the address
`/news/spring-update`. Publishing this one will replace it as the page visitors see." The notice's
action links to the other entry's edit page (`/admin/<concept>/<id>`).

The publish action (`publishAction`) re-runs `buildAddressIndex` + `addressCollision` against the entry
being published. It does **not** gate; the publish proceeds (last-write-wins). When a collision exists it
emits a new log event, `publish.address_collision` (level `warn`), carrying the editor's email, the
`address`, and the displaced entry's `concept`/`id`. This joins the diagnostics vocabulary and is added
to [`docs/reference/log-events.md`](../../reference/log-events.md). No token or session id is logged, per
the log policy.

### Unit 3: the EditPage advisory region and needs-alt unification

A shared advisory-notices region in `EditPage.svelte`: a `{#snippet advisoryNotices(list)}` that renders
each `AdvisoryNotice` as one `alert alert-warning` row with its message, optional count, and optional
action rows, in a single `aria-live="polite"` container so a notice appearing is announced. The styling
reuses the existing needs-alt alert treatment, so the surface looks unchanged for needs-alt.

`EditPage` builds the merged list it feeds the region:

- The server notices: `data.advisories` (the address collision), mapped to the shape verbatim, their
  action `href` rendered as a link.
- The needs-alt notice: the existing `$derived` (`needsAltCount`, `needsAlt`, `heroRows`) is re-expressed
  as one `AdvisoryNotice` of `kind: 'needs-alt'` carrying its `count` and its action rows. Because a
  client action is a callback (focus a hero input, jump to a CodeMirror source range), the host renders
  the needs-alt rows with their existing `onclick` handlers rather than an `href`. The notice shape's
  `actions` is the render contract; the host supplies server links or client callbacks per notice.

The draft warning and the other existing EditPage banners (save-guard broken links, the delete guard's
inbound linkers, the rename refusal) stay as they are; they are guard/failure banners, not advisories.
Only needs-alt moves, because it is the one true advisory already present.

## Data flow

1. The author opens `/admin/<concept>/<id>`. `editLoad` reads the entry, builds the address index across
   `main` + open branches, and returns `advisories` (the address-collision notice when one exists).
2. `EditPage` renders the advisory region with the server notices plus the live, client-derived needs-alt
   notice. needs-alt updates as the author types; the address notice is static for the load.
3. The author publishes. `publishAction` re-checks the address; the publish proceeds regardless, and a
   collision emits `publish.address_collision`.

## Error handling and degradation

- A cross-branch read failure at edit-load logs and yields no address notice (fail open). The editor
  always renders.
- A `permalink` resolution that throws (a dated concept whose entry has no valid date) is caught
  per-entry and skipped, so one malformed sibling cannot suppress the whole index.
- The publish re-check failing to build the index logs and skips the event; it never blocks the publish.

## Testing

- **Unit** (`advisories.ts`): `addressCollision` over fixtures: collide with a published entry on `main`,
  collide with an entry on a sibling branch, no collision, the self-entry (same concept+id) is not a
  collision, a dated entry with no date is skipped not thrown. `buildAddressIndex` with a fake backend
  unioning main + two branches.
- **Integration** (workerd + miniflare): `editLoad` returns the `address-collision` advisory given a
  fake backend whose manifest holds a colliding published entry; `publishAction` emits
  `publish.address_collision` (assert via the captured log) and still commits.
- **Component** (`EditPage`): the advisory region renders a server address-collision notice with its
  link. The **needs-alt regression set** then pins the unification: the count matches the body's
  unlabelled images, filling an alt drops the count, a hero-field row focuses its input, and a body row
  jumps to source, all still working through the shared region.

## Review gate

`cloudflare-workers-reviewer` (the cross-branch read and the branch reads on the publish path),
`web-auth-security-reviewer` (the publish path), `svelte-reviewer` (the EditPage refactor and the runes),
`daisyui-a11y-reviewer` (the advisory region's `aria-live`, the action rows, and that needs-alt's
accessibility is unchanged). Plus `/code-review`.

## Documentation

- `docs/reference/log-events.md`: the new `publish.address_collision` row (trigger, fields).
- `CHANGELOG.md` + the version bump (a patch: this refines the existing `EditData` editor surface and
  adds one advisory; no new subsystem and no consumer action).
- `docs/internal/docs-friction-log.md`: the advisory-channel and the now-visible last-write-wins entries
  resolved.
- The `buildAddressIndex`/`addressCollision` builders stay internal (no package subpath). But because
  `EditData` is exported from `/sveltekit` and gains `advisories: AdvisoryNotice[]`, the `AdvisoryNotice`
  and `AdvisoryAction` types must be exported too (tsc will not emit a `.d.ts` for `EditData` that names
  a private type), so they ride `/sveltekit` and get a row in `docs/reference/sveltekit.md` to satisfy
  `check:reference`. The new `publish.address_collision` log event goes in
  [`docs/reference/log-events.md`](../../reference/log-events.md).

## Out of scope (deferred)

- A general per-field advisory adapter seam (a public contract for adapters to declare warn validators).
  Revisit if a second adapter-driven advisory appears.
- Live client-side recomputation of the address collision as the author retypes the slug. The notice is
  load-time; a save refreshes it. Live recomputation would need the taken-address set shipped to the
  client, deferred until asked for.
- The later editor-help slices (the recede-on-desk slide-over, the command-palette help, the corpus, the
  starter-content seed) remain per the initiative spec.
