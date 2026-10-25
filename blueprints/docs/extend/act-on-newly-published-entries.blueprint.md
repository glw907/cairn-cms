---
page: Act on newly published entries
type: task guide
---

# Act on newly published entries

:::reader
**Who reads it.** A Svelte-fluent web developer building a site on cairn's seams. Their organization wants something to happen when a post goes live, such as an email to subscribers. They write TypeScript, run their site's deploy pipeline, and have an email or messaging provider.

**Why they arrive:**
- They want each new post announced once, and never again when an editor edits it. :fact[gkrell]
- They looked for a publish callback or webhook, and cairn has no such seam. The admin's publish calls no site function after its commit lands. :fact[ww1gv0]
- They want an editor to take a next step at the moment of publishing an entry, such as opening a screen to write the announcement. :fact[ohq7b9]

**What they already know.** TypeScript and Node, their deploy pipeline, the storage their platform offers, and their provider's sending API. The job needs no cairn knowledge beyond publishing from the admin. The next-step link also assumes the reader knows the site's adapter module and its `editor` group.

**Background.** An editor's publish commits the entry and its row in the content manifest, `src/content/.cairn/index.json`, to the default branch. The first publish that takes an entry live stamps the row with `publishedAt`, and later saves keep that stamp. :fact[vrue1g] :fact[gkrell]
That publish commit triggers the site's deploy, and the post reaches its public address through the build that deploy runs. A message that links to the post therefore belongs after the deploy. :fact[e69d0l] :fact[1mkckz]
The engine stamps the row and computes the diff. It sends no announcement, and the site keeps the prior manifest between deploys. :fact[xlj297] :fact[gkrell]

**What the page does for them.** The introduction opens on the reader's goal of announcing new posts and on the stamp as cairn's part in it. It states the task: write a job that runs after each deploy, diffs the deployed manifest against the one it stored last time, sends a message for each new post, and saves the deployed manifest. :fact[ix641z] :fact[xlj297]
It tells the reader who looked for a callback that code meant to follow a publish belongs in that job, or behind a link an editor follows. It names "Add a next-step link after publish" for the reader who wants that link. :fact[ww1gv0]

**What it leaves to other pages:**
- The `buildNewlyPublished` reference entry gives the whole rule, its purity, and `before: null`.
- The publish-actions seam in the SvelteKit reference gives the `PublishActionEntry` members, the placeholders, the concept filter, and the validation.
- Build the public routes covers feeds, for subscribers who pull new posts instead of being sent them.
- Architecture covers the write path from a save to the deploy.
- Sending the message belongs to the reader's email or messaging provider.
:::

:::constraints
- Name no CI service, deploy product, or pipeline syntax. The pipeline is the reader's.
- Frame the two KV functions in the job as illustrative storage, with Cloudflare's KV API reference beside them. Copy no namespace, binding, or token setup.
- Say that the admin checks `publishActions` when the module that calls `createCairnAdmin` loads, so a bad entry fails the build on a scaffolded site. Never say that `composeRuntime` checks it. :fact[sznajt]
- Name the adapter module by its role, and give `src/theme/cairn.config.ts` only as where a scaffolded site keeps it. :fact[7ym1ep]
- When the page describes what the job sends, speak only of posts published from the admin.
:::

## Before you begin

*Names what the job needs in place, so the reader can tell whether their site and pipeline can run it.*

- The job needs the following:
- A committed content manifest at `src/content/.cairn/index.json`. A scaffolded site already commits one, and a publish commit patches it. :fact[vrue1g] :fact[e69d0l]
- A deploy pipeline that can run a step after the deploy, in a checkout of the deployed commit. :fact[1mkckz]
- Node 22.18 or later, which strips the types from a `.ts` file and runs it. An older Node needs a TypeScript runner such as `tsx`. :fact[rh53a2]
- Storage the job reads and writes between runs. The example uses one Workers KV value, read and written through the Cloudflare REST API with an API token. :fact[z2h50k] :fact[3dyial]
- See [Workers KV values in the Cloudflare API](https://developers.cloudflare.com/api/resources/kv/subresources/namespaces/subresources/values/methods/get/).
- Code that sends one message for one entry, through your provider.

## Write the post-deploy job

*Gives the reader the job file whole, then the steps that adapt it to their site and run it.*

- The job imports `buildNewlyPublished`, `parseManifest`, and the `ManifestEntry` type from `@glw907/cairn-cms/delivery/data`. That subpath imports no SvelteKit and no Svelte, so a plain Node script can load it. :fact[tdbki1]
- See [`buildNewlyPublished`](../reference/delivery-data.md#buildnewlypublished) and [`parseManifest`](../reference/delivery-data.md#parsemanifest).
- To add the job, follow these steps:
1. In your site, create `scripts/announce-new-posts.ts` with the following contents. :fact[tdbki1] :fact[vrue1g]
- Code: the whole job file. It reads the deployed manifest from the checkout and loads the stored one from a Workers KV value. On the first run it stores a baseline and returns. Otherwise it diffs the manifests, sends each `posts` entry, and saves the deployed manifest last. The block typechecks against the built package. :fact[ix641z] :fact[gj96px] :fact[3dyial] :fact[2hwgg3]

```ts
/// <reference types="node" />
// scripts/announce-new-posts.ts
import { readFile } from 'node:fs/promises';
import { buildNewlyPublished, parseManifest, type ManifestEntry } from '@glw907/cairn-cms/delivery/data';

// Your send code: one message for one entry, through your email provider's API.
declare function sendNewPostEmail(entry: ManifestEntry): Promise<void>;

// Illustrative storage: one Workers KV value, read and written through the Cloudflare REST API.
const KV_VALUE_URL =
  `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}` +
  `/storage/kv/namespaces/${process.env.ANNOUNCE_KV_NAMESPACE_ID}/values/deployed-manifest`;
const auth = { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` };

async function readPriorManifest(): Promise<string | null> {
  const res = await fetch(KV_VALUE_URL, { headers: auth });
  if (res.status === 404) return null; // nothing stored yet: the first run
  if (!res.ok) throw new Error(`KV read failed with ${res.status}`);
  return res.text();
}

async function savePriorManifest(raw: string): Promise<void> {
  const res = await fetch(KV_VALUE_URL, {
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
    (entry) => entry.concept === 'posts',
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

2. If your posts concept has an id other than `posts`, in the `filter` call, replace `'posts'` with that id. :fact[gj96px]
- The scaffold's posts concept is `posts`. :fact[gj96px]
3. In the same file, replace the `declare function` line with a `sendNewPostEmail` that calls your provider.
- Each entry the diff returns is a `ManifestEntry`, and the send code reads fields such as `title` and `permalink` from it. :fact[z2h50k]
- See [the delivery data types](../reference/delivery-data.md#types).
- The job stores the deployed manifest as one string and passes the string it reads back to `parseManifest`. :fact[z2h50k]
- To keep that string in R2 or another store, replace `readPriorManifest` and `savePriorManifest`. Return `null` from the read when nothing is stored. :fact[z2h50k]
4. In your pipeline's settings, set `CLOUDFLARE_ACCOUNT_ID`, `ANNOUNCE_KV_NAMESPACE_ID`, and `CLOUDFLARE_API_TOKEN` for the job's step. :fact[3dyial]
5. In your deploy pipeline, after the deploy step, add a step that runs `node scripts/announce-new-posts.ts` from the site's root. :fact[rh53a2] :fact[1mkckz]

## Order the send and the save

*Shows the reader what happens when a send throws, and has them pick the save's place on purpose.*

- Given the same pair of manifests, the diff returns the same entries. The stored manifest therefore decides what the next run sends. :fact[2hwgg3] :fact[pc3iy5]
- The example saves after it sends. If a send throws, the run ends before the save. The next run diffs against the old baseline and sends the whole batch, so a post sent before the failure gets a second message. :fact[2hwgg3]
- If the job saves before it sends, a failed send loses its post instead. The next run diffs against a manifest that already holds the post's stamp, and no later run returns it. :fact[2hwgg3]
- To trade a repeated message for a missed one, follow this step:
- If a missed message costs your subscribers less than a repeated one, in `main`, move the last `savePriorManifest(raw)` call from after the `for` loop to above it. :fact[2hwgg3]
- Whichever order the job uses, a failed run exits with code `1`. The example sets `process.exitCode` when `main` rejects.

## Start from a stored baseline

*Explains why the first run sends nothing, and when a backfill with `before: null` is the right first run.*

- On its first run the job finds nothing stored. It saves the deployed manifest as its baseline and sends nothing. :fact[3dyial]
- Passing `null` as `before` makes `buildNewlyPublished` return each entry in `after` that is not a draft and carries a stamp. On a first run, the job then sends a message for each such post. :fact[6cas58]
- Passing `null` on a later run would send each of those posts again. A later run passes the stored manifest instead. :fact[4wnm6o]
- To backfill on the first run, follow these steps:
1. In `scripts/announce-new-posts.ts`, replace the first-run branch with the following line. :fact[6cas58]
- Code: the line that replaces the first-run branch, which sets `before` to `null` when nothing is stored. :fact[6cas58]

<!-- snippet-check-skip: replaces the first-run branch inside main() in scripts/announce-new-posts.ts -->
```ts
const before = prior === null ? null : parseManifest(prior);
```

2. In the `buildNewlyPublished` call, replace `parseManifest(prior)` with `before`. :fact[6cas58]

- The save at the end of `main` still runs, so the next run diffs against the stored manifest. :fact[4wnm6o]

## Entries the diff returns

*Gives the rule in short and the cases a running job meets, and hands the full rule to its reference entry.*

- Which publishes reach subscribers depends on the rule `buildNewlyPublished` applies. :fact[ix641z]
- `buildNewlyPublished` returns an entry from `after` when it is not a draft and carries a `publishedAt` stamp. The same `concept`/`id` key must also have had no stamp in `before`. :fact[ix641z]
- An entry taken back to draft keeps its stamp. The draft check runs before the stamp comparison and excludes it. :fact[pm1osl] :fact[wv457z]
- **Publish all** stamps entries the same way as a single publish, so the job sends posts published either way. :fact[v5qalk]
- A renamed post reads as new. The rename carries its stamp to a new `concept`/`id` key, and `before` has no stamp there. :fact[df3hqw]
- A post deleted and then recreated under the same id reads as new when a run saved the manifest between the two. If both land before the next run, the old stamp is still in `before`, and the new post is not sent. :fact[w3m0ac]
- A deleted post is never returned, so the job reports no removals. :fact[u1mies]
- An entry that reached the default branch without an admin publish carries no stamp, and the job does not send it. The same holds for an entry that was already live before cairn stamped first publishes. :fact[nsandp]
- See [`buildNewlyPublished`](../reference/delivery-data.md#buildnewlypublished) for the whole rule.

## Verify the job

*Has the reader confirm the job against a real publish, after its first run has stored a baseline.*

- After the job has run once, check it against a real publish:
1. In the admin, publish a new post. :fact[e69d0l]
2. In the deployed commit, open `src/content/.cairn/index.json` and confirm that the post's row carries `publishedAt`. :fact[vrue1g] :fact[gkrell]
3. In the pipeline's run for that deploy, confirm that your send code ran once, for that post. :fact[ix641z]
4. In the pipeline, run the job again with no new publish, and confirm that it sends nothing. :fact[2hwgg3] :fact[ix641z]

## Add a next-step link after publish

*Gives the reader who wants an editor-facing next step the adapter member that adds one, and hands its details to the reference.*

- An `editor.publishActions` list on the adapter shows links beside the publish-success strip for the entry just published. The list holds plain data, not a callback. :fact[ohq7b9] :fact[ww1gv0]
- To add a link, follow this step:
- In the adapter module's `editor` group, add a `publishActions` list. :fact[k7pq3d] :fact[7ym1ep]
- Code: an illustrative `publishActions` list with one `Announce` link for `posts`, whose `href` opens an admin screen with the published entry's id. :source[/src/lib/sveltekit/publish-actions.ts#PublishActionEntry] :fact[r2vx8m] :fact[ohq7b9]

<!-- snippet-check-skip: one member of the adapter's editor group, inside the defineAdapter call -->
```ts
// The adapter module (src/theme/cairn.config.ts on a scaffolded site), inside the editor group
publishActions: [
  { label: 'Announce', href: '/admin/team/announce?post={id}', concepts: ['posts'] },
],
```

- The admin replaces `{id}` and `{concept}` in `href` with the published entry's id and concept. `concepts` shows the link only for entries of the listed concepts. :fact[ohq7b9]
- The admin checks the list when the module that calls `createCairnAdmin` loads. A missing label, a repeated label, a missing `href`, or an unknown concept id throws there. :fact[r2vx8m]
- On a scaffolded site, that module loads during `vite build`, so a bad entry fails the build. :fact[sznajt]
- The links appear after an editor publishes one entry from its edit page. The confirmation after **Publish all** carries no links. :fact[v5qalk]
- To check the link, publish a post from its edit page and confirm that **Announce** appears beside the publish-success strip. :fact[ohq7b9] :fact[v5qalk]
- See [the publish-actions seam](../reference/sveltekit.md#the-publish-actions-seam) for the members, the placeholders, and the validation.
- See [Add a custom admin screen](add-a-custom-admin-screen.md) for a screen a link can open.

## See also

*Points the reader to the reference entries behind the job and the link, and the pages around them.*

- The following pages cover the functions and seam this page uses, and related tasks:
- See [`buildNewlyPublished`](../reference/delivery-data.md#buildnewlypublished).
- See [`parseManifest`](../reference/delivery-data.md#parsemanifest).
- See [the publish-actions seam](../reference/sveltekit.md#the-publish-actions-seam).
- See [Add a custom admin screen](add-a-custom-admin-screen.md).
- See [Build the public routes](build-the-public-routes.md).
- See [the write path in Architecture](architecture.md#write-path).
