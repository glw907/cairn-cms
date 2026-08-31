# Announce on publish

Detect the entries a deploy just carried across their first publish, and fan out from your own
endpoint: a social post, a newsletter trigger, a webhook to wherever you actually want to
announce.

The engine sends nothing over the network on its own. It ships the diffing logic that tells you
which entries are newly public; what you do with that list, and when your code runs it, is
entirely yours to build.

## The seam

[`diffNewlyPublished`](../reference/delivery-data.md#diffnewlypublished) diffs two
manifests down to the entries that crossed the first-publish transition between them:

```ts
import { diffNewlyPublished, parseManifest, type Manifest } from '@glw907/cairn-cms/delivery/data';

declare function fetchDeployedManifest(): Promise<string>;
declare function fetchPriorManifest(): Promise<string | null>;

async function announceNewPublishes() {
  const priorRaw = await fetchPriorManifest();
  const prior: Manifest | null = priorRaw ? parseManifest(priorRaw) : null;
  const deployed = parseManifest(await fetchDeployedManifest());

  for (const entry of diffNewlyPublished(prior, deployed)) {
    // Fan out however you want: post, email, webhook. The engine has already done the
    // detection work; everything past this point is your own code.
  }
}
```

An entry counts as newly published when it's live (not a draft) in `after`, carries a
`publishedAt` stamp there, and its same-identity counterpart in `before` was either absent or
itself unstamped. An entry that carried its stamp forward, and one that was already live but never
stamped, both fail to match, since neither changes the stamp between the two manifests you pass
in. A draft fails to match too, but for a different reason: the draft check runs first and
excludes it outright, whether or not its stamp changed, since a currently unpublished entry can
still carry a stamp forward from an earlier publish. An entry deleted from `after` never comes
back through this seam, so a removal is silent here by design.

The helper is pure: no I/O, no clock read. You supply both manifests and get a deterministic
result, which is what makes it safe to run this diff anywhere, in a deploy hook, a scheduled
worker, a one-off script, without the engine's own opinion about when or how often.

## Persisting the prior manifest is your job

The engine keeps no state across deploys. `before: null` means no prior manifest exists at all,
and every stamped entry in `after` comes back at once, a full fan-out; that's the right call for
a first backfill run, not for an ordinary deploy. For every deploy after that, persist the
manifest you diffed against last time (a KV entry, an R2 object, whatever your own infrastructure
already gives you) and pass it back in as `before` on the next run.

## Renames read as new publishes

Renaming a published entry changes its identity, `concept` and `id` together, cairn's own
identity model for content. `diffNewlyPublished` reads that as a new publish: the old key's
stamped row disappears from `after`, and the new key's row has no stamped counterpart in
`before`. A site that renames published entries and doesn't want a rename to re-announce needs to
filter that case out itself; the helper has no way to distinguish "genuinely new" from "renamed"
from the manifest alone, since both look identical at the identity level it diffs on.

## Deleting and recreating an entry reads as new too

The same "no stamped counterpart in `before`" rule catches more than a rename. Deleting a
published entry drops its manifest row, stamp included; publishing a new entry created under
that same id afterward finds no prior row to carry a stamp forward from, so it re-announces
exactly like a first publish, even if the deleted entry was years old. The general rule behind
both cases: a row only keeps its original publish stamp while it keeps existing and stays
published, so anything that leaves a publish with no still-existing, already-stamped
predecessor reads as new, not only a rename.

## You know it worked when

A fresh publish shows up in the loop exactly once, on the deploy immediately after it goes live,
and never again on a later deploy where nothing changed. A rename shows up too, unless you've
added your own filter for that case; a deletion never does.
