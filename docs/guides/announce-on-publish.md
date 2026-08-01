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

## Filter to what you actually want to announce

`justPublished` holds every entry that crossed into published, across every concept your site
declares. Restricting that to something narrower, such as a reserved "Team Announcement"
category, is ordinary filtering over the fields the entries already carry. If your site marks
that category with a tag, filter on `tags`:

```ts
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
import { newlyPublishedEntries, type Manifest } from '@glw907/cairn-cms/delivery/data';
import type { RequestHandler } from './$types';

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

- **An entry published before you upgraded to this cairn version never retro-stamps.** The stamp
  only lands on the transition into published; an entry that was already live and unstamped before
  the upgrade stays unstamped forever, so it never appears in `newlyPublishedEntries` and never
  announces.
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
