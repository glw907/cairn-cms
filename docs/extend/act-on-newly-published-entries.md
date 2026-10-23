# Act on newly published entries

An organization that publishes through cairn's admin often wants to announce each new post, by email to its subscribers or in a message to its members, and cairn's part in that work is a record of when each entry was first published.
The subscribers, the message, and its delivery belong to the site, because cairn confines itself to managing markdown content and the admin around it.
An editor's publish commits the entry to the default branch together with its row in the content manifest, the committed file at `src/content/.cairn/index.json`.
The first publish commit that lands an entry as a non-draft stamps its row with `publishedAt`, and every later save keeps that stamp unchanged.
The same commit triggers the site's deploy, and a new post reaches its public address only through the build that deploy runs, so a message that links to the post belongs after the deploy.
Because no later save changes a stamp, `buildNewlyPublished` can compare the manifests of two consecutive deploys and return each entry whose `concept`/`id` key carries a stamp in the later manifest and none in the earlier.
An edit to a live post's content leaves its stamp in place and never comes back as new.
[Architecture](architecture.md#write-path) describes the whole write path, from a save to the deploy.

The main task here is a job you write that runs after each deploy, finds the posts that deploy newly published, and hands each one to your send code before saving the deployed manifest for the next run.
A developer looking for a publish callback finds none: no site function runs once a publish commit lands, and the adapter's one publish-time member holds plain data.
Code that should follow a publish runs in that job, or behind a link an editor follows into a screen the site adds.
A site that wants an editor to take a next step at the moment of publishing an entry, with no job at all, adds next-step links beside that entry's publish confirmation, as [Add a next-step link after publish](#add-a-next-step-link-after-publish) describes.

The job assumes a TypeScript module your deploy pipeline can run with Node, the storage your platform offers, and your email or messaging code, and it needs no cairn knowledge beyond publishing from the admin.
The pipeline that runs it is yours, and this page names none.
The next-step link also assumes you know your site's adapter file and its `editor` block, which the [adapter's reference entry](../reference/core.md#defineadapter) describes.
This page leaves message delivery to your email or messaging provider's documentation.
Feeds, for subscribers who pull new posts instead of being sent them, are the subject of "Build the public routes."

> **Note:** The engine sends no announcement and keeps nothing between deploys: storing the previous manifest and delivering the message are your site's job.
> `buildNewlyPublished` is pure and node-safe, so the job runs as a plain Node script in your pipeline.

## Before you begin

The job needs a committed manifest, a pipeline step after the deploy, storage it can write between runs, and your send code.

- The site commits its content manifest at `src/content/.cairn/index.json`, and a publish commit patches it.
  A scaffolded site already has it, and a hand-built site commits it in [Index the content and commit its manifest](add-cairn-to-a-sveltekit-app.md#index-the-content-and-commit-its-manifest).
- Your deploy pipeline has a step that runs after the deploy, in a checkout of the deployed commit.
- The job has storage it reads and writes between runs, such as [Cloudflare KV](https://developers.cloudflare.com/kv/) or [Cloudflare R2](https://developers.cloudflare.com/r2/), and any store serves.
- You have code that sends one message for one entry.

With those in place, write the job.

## Write the post-deploy job

The job reads the deployed manifest, loads the previous one from your storage, diffs the two, sends each new post, and saves the deployed manifest.
`@glw907/cairn-cms/delivery/data` exports [`buildNewlyPublished`](../reference/delivery-data.md#buildnewlypublished), [`parseManifest`](../reference/delivery-data.md#parsemanifest), and the `Manifest` type without pulling in the engine's server code.
`buildNewlyPublished` returns `ManifestEntry` rows, and the [delivery data types table](../reference/delivery-data.md#types) lists the fields your send code can read from each one.

To add the job to your site, complete the following steps:

1. In your site, create `scripts/announce-new-posts.ts` with the following contents:

   ```ts
   // scripts/announce-new-posts.ts
   /// <reference types="node" />
   import { readFile } from 'node:fs/promises';
   import {
     buildNewlyPublished,
     parseManifest,
     type ManifestEntry,
   } from '@glw907/cairn-cms/delivery/data';

   // Your storage: the manifest text, kept in KV, R2, or another store.
   declare function readPriorManifest(): Promise<string | null>;
   declare function savePriorManifest(raw: string): Promise<void>;
   // Your send code: one message for one entry, through your email provider's API.
   declare function sendNewPostEmail(entry: ManifestEntry): Promise<void>;

   async function main(): Promise<void> {
     const raw = await readFile('src/content/.cairn/index.json', 'utf8');
     const after = parseManifest(raw);

     const prior = await readPriorManifest();
     if (prior === null) {
       // First run: record the deployed manifest and send nothing.
       await savePriorManifest(raw);
       return;
     }
     const before = parseManifest(prior);

     const newPosts = buildNewlyPublished(before, after).filter(({ concept }) => concept === 'posts');
     for (const entry of newPosts) {
       await sendNewPostEmail(entry);
     }

     await savePriorManifest(raw);
   }

   main().catch((error: unknown) => {
     console.error(error);
     process.exitCode = 1;
   });
   ```

2. In `scripts/announce-new-posts.ts`, replace the three `declare function` lines with your storage and send functions.
3. In your deploy pipeline, add a step after the deploy that runs `node scripts/announce-new-posts.ts` from the site's root.

   Node 22.18 or later runs TypeScript directly.
   On older Node, use a runner such as `tsx`.

The file does four things, in the order the code runs them:

- It reads the deployed manifest from the checkout and parses it as `after`.
- It loads the stored manifest, and on a first run with nothing stored, it saves the deployed one and sends nothing.
  Passing `null` as `before` there would send every live post instead, as [Backfill on the first run](#backfill-on-the-first-run) explains.
- It diffs the two manifests and keeps the entries whose `concept` is `posts`.
- It calls your send code once for each entry, then saves the deployed manifest for the next run.
  If a send throws, the job exits before that save.
  The next run diffs against the older stored manifest and sends every post from the failed run again, including those already sent.

A site whose posts concept has another id filters on that id.

The diff's rule decides which entries reach your send code.

## What counts as newly published

Every result the job produces follows from one rule that the diff applies to each entry.
`buildNewlyPublished` returns an entry from `after` only when all three of the following hold, checked in this order:

1. The entry is not a draft.
2. The entry carries a `publishedAt` stamp.
3. No entry at the same `concept`/`id` key in `before` carried a stamp.

The stamp is set at the first publish commit and kept through every later save, so an edit to a live post's content never reads as new.
The draft check runs first, and the stamp check does not imply it: an entry an editor takes back to draft keeps its stamp.
`buildNewlyPublished` never returns that entry while it stays a draft.

On its first run, your job records the manifest and sends nothing.
A backfill changes that run so it sends every live post once.

## Backfill on the first run

Pass `null` as `before` only for a first backfill.
With `before: null`, every stamped, non-draft entry in `after` comes back as newly published.
On every later run, pass the stored manifest: `null` on an ordinary run sends every live post again.

- In `scripts/announce-new-posts.ts`, replace the first-run branch and the `parseManifest(prior)` line after it with the following line.

<!-- snippet-check-skip: continues scripts/announce-new-posts.ts from "Write the post-deploy job" -->
```ts
const before = prior === null ? null : parseManifest(prior);
```

The save at the end of `main` still runs, so every later run diffs against the stored manifest.

With the first run settled, check the job before it emails anyone.

## Verify the job

Check the job in two passes, first offline and then against a real publish.

`buildNewlyPublished` does no I/O and reads no clock, and two literal manifests give it the same result on every run.
The offline check builds a `before` with one post still in draft and an `after` with that post live and stamped.

To run the offline check, complete the following steps:

1. In your site, save the following code as `scripts/check-announce.ts`:

   ```ts
   /// <reference types="node" />
   import { strictEqual } from 'node:assert';
   import { buildNewlyPublished, type Manifest } from '@glw907/cairn-cms/delivery/data';

   const draftPost = {
     id: 'hello-world',
     concept: 'posts',
     title: 'Hello world',
     permalink: '/posts/hello-world',
     draft: true,
     links: [],
   };

   const before: Manifest = { version: 1, entries: [draftPost] };
   const after: Manifest = {
     version: 1,
     entries: [{ ...draftPost, draft: false, publishedAt: '2026-10-12T09:00:00.000Z' }],
   };

   strictEqual(buildNewlyPublished(before, after).length, 1);
   strictEqual(buildNewlyPublished(after, after).length, 0);
   ```

2. From the site's root, run `node scripts/check-announce.ts`.

   It exits silently when both assertions pass: the first diff returns the post, and a manifest diffed against itself returns nothing.

After the job has run once and its storage holds a manifest, check it against a real publish:

1. In the admin, publish a new post.
2. After the deploy, in a checkout pulled from the default branch, open `src/content/.cairn/index.json`.

   The post's row carries `publishedAt`.

3. In the pipeline, let the job run after that deploy.

   Your send code runs once, for that post.

4. In the pipeline, run the job again with no new publish.

   It sends nothing, because the stored manifest now holds the post's stamp.

Some editor actions give results that look wrong until you know the rule.

## Expect renames and removals

If the job sends a post you expected it to skip, or stays silent about one, look at what the editor did to that entry.
A rename or a delete-then-recreate reads as a new post, and a removal reports nothing.
Each case follows from the `concept`/`id` key the rule matches on:

- A rename changes the entry's `concept`/`id` key, and the job sends the renamed post as new.
- A post deleted and then recreated under the same id, with a job run between the two, also reads as new: the deleted row took its stamp out of the prior manifest.
- A deleted post is never returned, and the job reports no removal.

If a post never reached your send code at all, work through two checks.

## Find a post the job did not send

When a post published from the admin never reaches your send code, check its manifest row and then its commit record:

1. In the deployed `src/content/.cairn/index.json`, check that the post's row carries `publishedAt` and that the post is not a draft.

   A row still marked as a draft was committed with its draft flag set, or taken back to draft.
   A missing row means the publish commit is not in that deploy.
   A non-draft row without the stamp was published before cairn recorded `publishedAt`, and the job never sends it.

2. For a publish that never committed, read the commit records in [Debug your site](debug-your-site.md#commitsucceeded-and-commitfailed).

For a post sent a second time after a rename, see [Expect renames and removals](#expect-renames-and-removals).

An editor who needs a next step at the moment of publishing is served by a different seam.

## Add a next-step link after publish

An `editor.publishActions` list on the adapter shows next-step links beside the publish-success strip, for the entry just published.
The list is plain data that the admin resolves on the server, and no site code runs when an editor publishes.
An adapter without it shows no links at the publish-success moment.
The adapter file is `src/theme/cairn.config.ts` on a scaffolded site and `src/lib/cairn.config.ts` on the [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) tutorial's site.

- In your adapter file, add `publishActions` to the `editor` block.

<!-- snippet-check-skip: elides the adapter's other required groups to focus on the editor.publishActions member -->
```ts
// src/theme/cairn.config.ts
import { defineAdapter } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  // content, backend, email, and rendering stay as they are
  editor: {
    publishActions: [
      { label: 'Announce', href: '/admin/team/announce?post={id}', concepts: ['posts'] },
    ],
  },
});
```

Each entry in the list takes three members:

- `label`: required, and unique across the list.
- `href`: a required template string.
  The admin replaces `{concept}` and `{id}` with the published entry's identity, verbatim and with no URL encoding.
  Any other brace token stays literal.
- `concepts`: optional concept ids that limit the link to those concepts.
  Without them, the link follows every concept's publish.

The admin checks the list once, at server start.
A missing label, a repeated label, a missing href, or an undeclared concept id throws there.
An `href` can open a [custom admin screen](add-a-custom-admin-screen.md) the site adds, such as a screen for writing the announcement.
The [publish-actions seam](../reference/sveltekit.md#the-publish-actions-seam) and [`PublishActionEntry`](../reference/sveltekit.md#publishactionentry) entries give the type.

When an editor publishes one entry from its edit page, the link appears beside the publish-success strip.
The confirmation after **Publish all** carries no links.

## See also

The following reference entries, guides, and concept pages cover these seams in more detail:

- [`buildNewlyPublished`](../reference/delivery-data.md#buildnewlypublished) and [`parseManifest`](../reference/delivery-data.md#parsemanifest), the two helpers the job calls
- The `Manifest` and `ManifestEntry` rows of the [delivery data types table](../reference/delivery-data.md#types), the manifest's shape
- [The publish-actions seam](../reference/sveltekit.md#the-publish-actions-seam), the reference for next-step links
- [Add a custom admin screen](add-a-custom-admin-screen.md), for a screen a next-step link can open
- [Architecture](architecture.md#write-path), for the path from a publish to the deploy
- [Content model](content-model.md#the-content-manifest), for the manifest's rows in full
