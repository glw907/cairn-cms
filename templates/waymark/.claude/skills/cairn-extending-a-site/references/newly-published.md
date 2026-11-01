# Act on newly published entries

To announce each new post once (email, a message), diff manifests in a job that runs after each
deploy. The admin has no publish callback, webhook, or hook that runs site code after a publish;
`editor.publishActions` is plain link data, not a callback. Do not wire a send into a form action,
a hook, a route, or the engine.

## The rule

The first publish that takes an entry live stamps its manifest row with `publishedAt`; later saves
keep the stamp. `buildNewlyPublished(before, after)` (from `@glw907/cairn-cms/delivery/data`, which
imports no SvelteKit or Svelte, so plain Node loads it) returns each `after` entry that is not a
draft, carries `publishedAt`, and had no stamp under the same `concept`/`id` in `before`. It spans
every concept and sends nothing. Decide newness with it, never with dates, git history, or mtimes.

- `before: null` returns every live stamped entry: the whole back catalogue. Never pass `null` on a
  first run unless a backfill is wanted.
- Re-drafted entries keep their stamp but are excluded. A rename reads as new (new key). A delete is
  never returned. An entry committed outside the admin has no stamp and is never returned.

## The job

1. Read the deployed manifest, `src/content/.cairn/index.json`, and parse it with `parseManifest`.
2. Read the stored baseline. If none exists (first run), save the deployed manifest as the baseline
   and send nothing.
3. Diff, then filter to the concept you announce (`concept === 'posts'`).
4. Send one message per returned entry.
5. Save the deployed manifest as the new baseline **after** the sends. A send that throws ends the
   run before the save, so the next run retries the batch. Saving first would lose a failed post
   forever. Exit nonzero on failure.

```ts
/// <reference types="node" />
// scripts/announce-new-posts.ts (Node 24 runs .ts directly)
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { buildNewlyPublished, parseManifest, type ManifestEntry } from '@glw907/cairn-cms/delivery/data';

declare function announcePost(entry: ManifestEntry): Promise<void>; // your send

const DEPLOYED = 'src/content/.cairn/index.json';
const BASELINE = '.deploy/last-manifest.json';

async function main(): Promise<void> {
  const raw = await readFile(DEPLOYED, 'utf8');
  if (!existsSync(BASELINE)) {
    await mkdir('.deploy', { recursive: true });
    await writeFile(BASELINE, raw); // first run: baseline only, no back catalogue
    return;
  }
  const before = parseManifest(await readFile(BASELINE, 'utf8'));
  const fresh = buildNewlyPublished(before, parseManifest(raw)).filter((e) => e.concept === 'posts');
  for (const entry of fresh) await announcePost(entry);
  await writeFile(BASELINE, raw); // last, so a failed send repeats next run
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

Swap the file reads for KV, R2, or any store that persists between pipeline runs; the read returns
nothing on the first run. Each entry carries the row's `title`, `permalink`, and the rest of
`ManifestEntry`.

**Exercise it.** Run once with no baseline (writes it, sends nothing). Add `publishedAt` to one post's
row in a copy of the manifest, or publish a post, and run again: exactly that post sends. Run a third
time: nothing sends.

## A next-step link instead

For an editor action at publish time (open an announce screen), add plain link data on the adapter's
`editor` group. `{id}` and `{concept}` are substituted; `concepts` limits where it shows. It shows
after a single publish from the edit page, never after Publish all. A missing or repeated label, a
missing `href`, or an unknown concept throws when the `createCairnAdmin` module loads, which fails the
build.

<!-- snippet-check-skip: one member of the adapter's editor group inside defineAdapter -->
```ts
publishActions: [{ label: 'Announce', href: '/admin/announce?post={id}', concepts: ['posts'] }],
```
