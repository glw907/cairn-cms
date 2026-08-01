# Announce on publish

cairn stamps the moment an entry first goes live, and can hand you the exact set of entries that
crossed that line since your last deploy. It sends nothing itself. Wiring a text, an email, or a
Slack post to a first publish is your deploy workflow's job, built on two engine seams: the
`publishedAt` stamp every publish action writes into the content manifest, and
[`newlyPublishedEntries`](../reference/delivery-data.md#newlypublishedentries), a pure diff over
two manifests.

This guide builds that pattern end to end.

## The pattern

A publish action stamps `publishedAt` on an entry the moment it first lands non-draft, and never
touches that stamp again. The committed manifest at your site's `manifestPath` (defaulting to
`/src/content/.cairn/index.json`, see [Vite](../reference/vite.md)) already records which
entries have gone live and when.
[`newlyPublishedEntries`](../reference/delivery-data.md#newlypublishedentries) compares the
manifest from two points in time and returns the entries whose stamp is new between them. It
reads no clock and touches no network, so both manifests are yours to supply.

```ts
import { newlyPublishedEntries, type Manifest } from '@glw907/cairn-cms/delivery/data';

declare function readPersistedManifest(): Promise<Manifest | null>;
declare function readDeployedManifest(): Promise<Manifest>;
declare function persistManifest(manifest: Manifest): Promise<void>;

const before: Manifest | null = await readPersistedManifest(); // your own storage
const after: Manifest = await readDeployedManifest(); // the manifest your site just shipped

const justPublished = newlyPublishedEntries(before, after);

await persistManifest(after); // becomes `before` on the next run
```

cairn keeps no history of its own across deploys, so persisting `before` is entirely on you: a KV
namespace, a D1 row, a cached file your CI keeps between runs. Write `after` back to that same
store once you've acted on `justPublished`, so the next deploy diffs against what this one just
shipped.

The first time you run this you have no prior manifest to diff against. Pass `null` and every
already-published entry in `after` comes back, a full backfill. Do that once, on purpose, then
start persisting the real manifest from that run on.

## Where the manifest comes from

Both `before` and `after` have to come from the same source: the committed manifest file at your
site's `manifestPath` (defaulting to `/src/content/.cairn/index.json`, see
[Vite](../reference/vite.md)), the file cairn's own publish commits write the `publishedAt` stamp
into. The preceding `readDeployedManifest` is your own fetch: read that file from wherever the deploy that
just shipped makes it reachable (your built site, a raw GitHub content fetch, whatever your deploy
pipeline already has access to), and hand the raw text to
[`parseManifest`](../reference/delivery-data.md#parsemanifest), re-exported from this same
subpath, rather than casting the fetched JSON yourself. It throws on a malformed or truncated file
instead of quietly feeding a broken shape into the diff.

```ts
import { parseManifest, type Manifest } from '@glw907/cairn-cms/delivery/data';

declare function fetchManifestFile(): Promise<string>;

async function readDeployedManifest(): Promise<Manifest> {
  return parseManifest(await fetchManifestFile());
}
```

[`buildSiteManifest`](../reference/delivery-data.md#buildsitemanifest) sits on the same export
line as `parseManifest` and reads like the obvious way to get a `Manifest`, but it is not a
substitute here. It derives every row fresh from your content files at build time, and no content
file carries the `publishedAt` stamp, so a manifest built that way is always `[]` when diffed
against here, silently, with no error. Only the committed manifest file, the one cairn's own
publish commits write the stamp into, carries what this pattern needs.

## Filter to what you actually want to announce

`justPublished` holds every entry that crossed into published, across every concept your site
declares. Restricting that to something narrower, such as a reserved "Team Announcement"
category, is ordinary filtering over the fields the entries already carry. If your site marks
that category with a tag, filter on `tags`:

```ts
import type { ManifestEntry } from '@glw907/cairn-cms/delivery/data';

declare const justPublished: ManifestEntry[];

const announcements = justPublished.filter((entry) => entry.tags?.includes('Team Announcement'));
```

cairn carries no notion of an announcement category. The filter reads
[`ManifestEntry`](../reference/delivery-data.md#types)'s own fields
(`concept`, `tags`, `title`, `permalink`, and the rest), the same fields every entry in
`justPublished` already carries. The engine's job stops at handing you the newly published set.

## Send from your own endpoint

cairn stamps and diffs. It never sends a message, schedules a job, or retries a failed send. Build
a small endpoint on your own site, a SvelteKit `+server.ts` route or a separate Worker, that runs
the preceding pattern and sends whatever `announcements` produces:

```ts
// src/routes/api/announce/+server.ts
import { newlyPublishedEntries, type Manifest, type ManifestEntry } from '@glw907/cairn-cms/delivery/data';
import type { RequestHandler } from './$types';

declare function requireDeploySecret(request: Request): void;
declare function readPersistedManifest(): Promise<Manifest | null>;
declare function readDeployedManifest(): Promise<Manifest>;
declare function sendTeamText(entry: ManifestEntry): Promise<void>;
declare function persistManifest(manifest: Manifest): Promise<void>;

export const POST: RequestHandler = async ({ request }) => {
  requireDeploySecret(request); // your own auth, not cairn's

  const before = await readPersistedManifest();
  const after = await readDeployedManifest();
  const announcements = newlyPublishedEntries(before, after).filter((entry) =>
    entry.tags?.includes('Team Announcement'),
  );

  for (const entry of announcements) {
    await sendTeamText(entry); // Twilio, or whatever your site already uses
  }

  await persistManifest(after);
  return new Response(null, { status: 204 });
};
```

Have your deploy workflow call that endpoint once the deploy has actually finished, not before.
That's also what makes a texted link resolve when the recipient opens it: a message sent while
the deploy is still in flight would carry a link to a page that isn't live yet. Your deploy
workflow's own "deploy succeeded" step is the one place that knows the new content is reachable,
so it's the step that pings this endpoint.

## Three things the stamp rules mean for you

- **An entry published before you upgraded to this cairn version stays unstamped only as long as
  nobody touches its Hidden checkbox.** The stamp lands on the transition into published, checked
  against the entry's own prior row, not against your upgrade date. Leave a pre-upgrade entry alone
  and it stays unstamped forever, so it never appears in `newlyPublishedEntries` and never
  announces. But checking Hidden and publishing, then unchecking Hidden and publishing again, takes
  that same entry through draft and back: the second publish sees a prior row with `draft: true` and
  stamps it with today's date, exactly like a real first publish. A years-old entry can announce
  itself this way after a routine hide-and-reshow.
- **Renaming a published entry reads as a new publish.** A rename changes the entry's `concept` or
  `id`, cairn's identity key. The old key's stamped row disappears from `after`, and the new key's
  stamped row has no stamped counterpart in `before`, so `newlyPublishedEntries` reports it as
  newly published. Expect a rename to trigger your announcement.
- **Deleting an entry and re-creating it under the same id re-stamps it.** A delete drops the row
  entirely, so a later publish under that same `concept`/`id` finds no prior stamp and lands a
  fresh one. The re-created entry announces again at its next publish.

## See also

- [Delivery data](../reference/delivery-data.md#newlypublishedentries) for
  `newlyPublishedEntries`'s full contract and the `ManifestEntry` type it returns.
- [The `cairn-manifest` CLI](../reference/cli-cairn-manifest.md) and
  [Vite](../reference/vite.md) for where the manifest lives and how it's regenerated.
