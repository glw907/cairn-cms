# Act on newly published entries

An organization that publishes through cairn's admin often wants each new post announced once, by email to its subscribers or by another message, and never again when an editor later edits it. The content manifest is the committed file `src/content/.cairn/index.json`. An editor's publish commits the entry and its row in that manifest to the default branch. The first publish that takes an entry live stamps its row with `publishedAt`, and later saves keep that stamp unchanged.

When the site deploys each commit to its default branch, that publish commit starts a deploy, and the post reaches its public address only through the build that deploy runs. A message that links to the post therefore belongs after the deploy. The engine stamps the row and computes the diff between two manifests, but it sends no announcement and keeps no manifest between deploys. Your site does both in a job that runs after each deploy and diffs the deployed manifest against the one it stored on its previous run. The job sends a message for each post the diff returns and then saves the deployed manifest for the next run.

The admin offers no publish callback or webhook, and its publish calls no site function after the commit lands. Code meant to follow a publish belongs in that job, or behind a link an editor follows from the publish confirmation. An editor who should take a next step at the moment of publishing, such as opening a screen to write the announcement, needs that link instead. For more information, see [Add a next-step link after publish](#add-a-next-step-link-after-publish).

The job assumes you know TypeScript and Node, your deploy pipeline, the storage your platform offers, and your provider's sending API. It needs no cairn knowledge beyond publishing from the admin. The next-step link also assumes you know your site's adapter module, where a [`defineAdapter`](../reference/core.md#defineadapter) call declares the adapter, and its `editor` group. The [`buildNewlyPublished`](../reference/delivery-data.md#buildnewlypublished) reference entry gives the diff's whole rule. [The publish-actions seam](../reference/sveltekit.md#the-publish-actions-seam) documents the link's members and validation. This page doesn't cover feeds, for subscribers who pull new posts instead of being sent them; see [Build the public routes](build-the-public-routes.md). [Architecture](architecture.md#write-path) describes the write path from a save to the deploy.

## Before you begin

The job needs the following:

- A committed content manifest at `src/content/.cairn/index.json`. A scaffolded site already commits one, and a publish commit patches it. On a hand-built site, [Index the content and commit its manifest](add-cairn-to-a-sveltekit-app.md#index-the-content-and-commit-its-manifest) creates it.
- A deploy pipeline that can run a step after the deploy, in a checkout of the deployed commit.
- Node 24 or later, which cairn's package declares. That version strips the types from a `.ts` file and runs it.
- Storage the job reads and writes between runs. The example keeps one Workers KV value, read and written through the Cloudflare REST API with an API token.
- Code that sends one message for one entry, through your provider.

## Write the post-deploy job

The job imports `buildNewlyPublished`, `parseManifest`, and the `ManifestEntry` type from `@glw907/cairn-cms/delivery/data`. That subpath imports no SvelteKit and no Svelte, so a plain Node script can load it. The [`parseManifest`](../reference/delivery-data.md#parsemanifest) reference entry documents the parser.

To add the job, follow these steps:

1. In your site, create `scripts/announce-new-posts.ts` with the following contents:

   ```ts
   /// <reference types="node" />
   // scripts/announce-new-posts.ts
   import { readFile } from 'node:fs/promises';
   import { buildNewlyPublished, parseManifest, type ManifestEntry } from '@glw907/cairn-cms/delivery/data';

   // Your send code: one message for one entry, through your email provider's API.
   declare function sendNewPostEmail(entry: ManifestEntry): Promise<void>;

   // Illustrative storage: one Workers KV value, read and written through the Cloudflare REST API.
   const kvNamespaceId = 'your-kv-namespace-id'; // the namespace that holds the baseline
   const kvValueUrl =
     `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}` +
     `/storage/kv/namespaces/${kvNamespaceId}/values/deployed-manifest`;
   const auth = { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` };

   async function readPriorManifest(): Promise<string | null> {
     const res = await fetch(kvValueUrl, { headers: auth });
     if (res.status === 404) return null; // nothing stored yet: the first run
     if (!res.ok) throw new Error(`KV read failed with ${res.status}`);
     return res.text();
   }

   async function savePriorManifest(raw: string): Promise<void> {
     const res = await fetch(kvValueUrl, {
       method: 'PUT',
       headers: { ...auth, 'Content-Type': 'application/octet-stream' },
       body: raw,
     });
     if (!res.ok) throw new Error(`KV write failed with ${res.status}`);
   }

   async function main(): Promise<void> {
     const raw = await readFile('src/content/.cairn/index.json', 'utf8');
     const after = parseManifest(raw);

     const prior = await readPriorManifest();
     if (prior === null) {
       // First run: store the deployed manifest as the baseline and send nothing.
       await savePriorManifest(raw);
       return;
     }

     const newPosts = buildNewlyPublished(parseManifest(prior), after).filter(
       ({ concept }) => concept === 'posts',
     );
     for (const entry of newPosts) {
       await sendNewPostEmail(entry);
     }
     // Save last: a send that throws leaves the old baseline, so the next run sends this batch again.
     await savePriorManifest(raw);
   }

   main().catch((error: unknown) => {
     console.error(error);
     process.exitCode = 1;
   });
   ```

   The file reads the deployed manifest from the checkout and loads the stored one from a Workers KV value. On a first run, it stores the deployed manifest as a baseline and returns. On every later run, it diffs the two manifests, sends each `posts` entry, and saves the deployed manifest last. The two KV functions are illustrative storage. For the calls they make, see [Workers KV values in the Cloudflare API](https://developers.cloudflare.com/api/resources/kv/subresources/namespaces/subresources/values/methods/get/).

2. If your posts concept has an id other than `posts`, replace `'posts'` in the job's concept check with that id.

   The scaffold's posts concept is `posts`.

3. In the same file, replace the `declare function` line with a `sendNewPostEmail` that calls your provider.

   Each entry the diff returns is a `ManifestEntry`, and your send code reads fields such as `title` and `permalink` from it. The [delivery data types](../reference/delivery-data.md#types) list the row's fields.

4. If you use R2 or another store, replace `readPriorManifest` and `savePriorManifest` with functions for that store.

   The job stores the deployed manifest as one string, and it passes the string it reads from storage to `parseManifest`. A replacement read returns `null` when nothing is stored, as the KV read does.

5. If you keep the KV storage, replace the value of `kvNamespaceId` with the id of your KV namespace.
6. In your deploy pipeline, after the deploy step, add a step that runs `node scripts/announce-new-posts.ts` from the site's root.
7. If you keep the KV storage, in your pipeline's settings, set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` for that step.

## Order the send and the save

Given the same pair of manifests, the diff returns the same entries. The stored manifest therefore decides what the next run sends.

The example saves after it sends. If a send throws, the run ends before the save. The next run diffs against the old baseline and sends the whole batch again, including any post sent before the failure.

A job that saves before it sends loses the post whose send failed instead of repeating it. The next run diffs against a manifest that already holds that post's stamp, and no later run returns it.

If a missed message costs less than a repeated one, follow this step:

- In `main`, move the last `savePriorManifest(raw)` call before the send loop.

In either order, a run that fails exits with a nonzero status.

## Start from a stored baseline

On its first run, the job finds nothing stored, saves the deployed manifest as its baseline, and sends nothing.

Passing `null` as `before` makes `buildNewlyPublished` return every entry in `after` that is not a draft and carries a stamp. A first run with `null` therefore sends a message for each such post. On a later run, `null` would send each of those posts again, so every later run passes the stored manifest.

To backfill on the first run, follow these steps:

1. In `scripts/announce-new-posts.ts`, replace the first-run branch with the following line:

   <!-- snippet-check-skip: replaces the first-run branch inside main() in scripts/announce-new-posts.ts -->
   ```ts
   const before = prior === null ? null : parseManifest(prior);
   ```

2. In the `buildNewlyPublished` call, replace `parseManifest(prior)` with `before`.

The save at the end of `main` still runs, so the next run diffs against the stored manifest.

## Entries the diff returns

Which publishes reach your subscribers depends on the rule `buildNewlyPublished` applies. `buildNewlyPublished` returns an entry from `after` when the entry is not a draft and carries a `publishedAt` stamp. The same `concept`/`id` key must also have had no stamp in `before`.

A running job meets the following cases:

- An entry taken back to draft keeps its stamp. The draft check runs before the stamp comparison and excludes it.
- **Publish all** stamps entries the same way as a single publish, so the job sends posts published either way.
- A renamed post reads as new. The rename carries its stamp to a new `concept`/`id` key, and `before` has no stamp there.
- A post deleted and then recreated under the same id reads as new when a run saved the manifest between the two. If both land before the next run, the old stamp is still in `before`, and the job does not send the new post.
- A deleted post is never returned, and the job reports no removals.
- An entry that reached the default branch without an admin publish carries no stamp, and the job does not send it. The same holds for an entry that was already live before cairn stamped first publishes.

## Verify the job

After the job has run once and stored a baseline, check it against a real publish by following these steps:

1. In the admin, publish a new post.
2. In the deployed commit's `src/content/.cairn/index.json`, confirm that the post's row carries `publishedAt`.
3. In the pipeline's run for that deploy, confirm that your send code ran once, for that post.
4. In the pipeline, run the job again with no new publish.

   It sends nothing, because the stored manifest already holds the post's stamp.

## Add a next-step link after publish

An `editor.publishActions` list on the adapter shows links beside the publish-success strip for the entry just published. The list holds plain data, not a callback.

To add a link, follow this step:

- In the adapter module's `editor` group, add a `publishActions` list. On a scaffolded site, the adapter module is `src/theme/cairn.config.ts`.

  <!-- snippet-check-skip: one member of the adapter's editor group, inside the defineAdapter call -->
  ```ts
  // The adapter module (src/theme/cairn.config.ts on a scaffolded site), inside the editor group
  publishActions: [
    { label: 'Announce', href: '/admin/team/announce?post={id}', concepts: ['posts'] },
  ],
  ```

The example list holds one illustrative **Announce** link for `posts`, and its `href` opens an admin screen with the published entry's id.

The admin replaces `{id}` and `{concept}` in `href` with the published entry's id and concept. `concepts` shows the link only for entries of the listed concepts.

The admin checks the list when the module that calls `createCairnAdmin` loads. A missing label, a repeated label, a missing `href`, or an unknown concept id throws there. On a scaffolded site, that module loads during `vite build`, so a bad entry fails the build.

The links appear after an editor publishes one entry from its edit page. The confirmation after **Publish all** carries no links.

To check the link, follow these steps:

1. In the admin, publish a post from its edit page.
2. Confirm that **Announce** appears beside the publish-success strip.

[The publish-actions seam](../reference/sveltekit.md#the-publish-actions-seam) gives the members, the placeholders, and the validation. [Add a custom admin screen](add-a-custom-admin-screen.md) covers a screen a link can open.

## See also

The following pages cover the functions and seam this page uses, and related tasks:

- [`buildNewlyPublished`](../reference/delivery-data.md#buildnewlypublished)
- [`parseManifest`](../reference/delivery-data.md#parsemanifest)
- [The publish-actions seam](../reference/sveltekit.md#the-publish-actions-seam)
- [Add a custom admin screen](add-a-custom-admin-screen.md)
- [Build the public routes](build-the-public-routes.md)
- [The write path in Architecture](architecture.md#write-path)
