# cairn Delivery Robustness: Design

**Goal.** Harden the delivery surface against the misconfigurations and edge inputs a
migrating site can actually trip, before the ecnordic and 907 migrations lean on it. Five
small, mostly independent units across the delivery layer, all on `main`, additive to the
package surface.

This pass follows the completed schema-source-of-truth initiative (Plans 1 through 3, published
as `0.14.0`). It is the residual delivery follow-up STATUS sequenced before the site migrations.

## Already resolved (not in scope)

Two items from the original carried-follow-up list landed in schema Plan 2 and need no work here:

- **Normalized data on read.** `content-index.ts:109` already stores the validator's normalized
  `result.data` on `.frontmatter` for the success path. Only the failure path still casts raw,
  which Unit 1 addresses.
- **Skip drafts at the build gate.** `site-index.ts:38` already skips draft problems, so a
  half-finished draft no longer fails the build.

## Decisions locked (2026-06-01 brainstorm)

1. **Scope.** The four migration-relevant guards (the pure typed read, the glob guard, the
   reserved-`site`-key guard, the feed date guard) plus scoping feed autodiscovery to feed
   entries. The permalink impossible-date and the excerpt CJK word counting are deferred to the
   backlog as near-unreachable for the English sites being migrated.
2. **Glob guard.** An absent glob key for a declared concept throws at build. A present-but-empty
   record `{}` is allowed as the explicit opt-in to an empty concept.
3. **Failure-path typing.** The architecturally correct model, matching Astro, Velite,
   Contentlayer, and Keystatic: invalid content never enters the typed read. A validation-failed
   entry is excluded from the typed accessors and surfaced only through `problems()`. The
   `raw as F` cast is deleted.
4. **`validate: false`.** The escape hatch skips the build-halt but still excludes invalid
   entries, so the typed surface is always pure `F`. `validate: false` means "do not fail my
   build", not "ship raw content".

The competitor survey grounding decisions 3 and 4: every strong system treats validation as a
halt-or-exclude boundary that produces the typed value, never a side-check that leaves a degraded
value typed as valid. Astro returns the Zod parse output and fails the build on a schema error.
Velite and Contentlayer emit only validated output in their generated data and types. Sanity and
Payload validate at the write boundary in the studio, so the read side never meets invalid data,
which is the analogue of cairn's admin save path validating before commit.

## Units

### Unit 1: the typed read is pure by construction

**File:** `src/lib/delivery/content-index.ts`. **Tests:**
`src/tests/unit/delivery-content-index.test.ts`.

`createContentIndex` builds an entry per file, derives the cheap raw summary, and runs
`descriptor.validate(raw, body)`. Today a failure pushes a `ContentProblem` and still produces a
readable entry whose `frontmatter` is `(result.ok ? result.data : raw) as F` (`content-index.ts:109`).
The `: raw` branch is the unsound cast: raw frontmatter is unnormalized, so it does not match the
inferred `F`.

Change: a validation-failed entry is recorded in `problems()` exactly as today, and excluded from
the entries the read accessors (`all`, `byId`, `byTag`, `adjacent`) serve. Every readable
`ContentEntry<F>` then carries `result.data` as its frontmatter, so the `: raw` branch is gone and
the remaining `result.data as F` is sound (the descriptor is type-erased, so the cast stays, but
it now sits over the validator's normalized output, which conforms to `F` by construction).

Behavior consequences, all consistent with the locked decisions:

- A non-draft failure is still recorded and still throws at the `createSiteIndex` gate, so a
  normal build dies on invalid content as before.
- A valid draft (marked draft, passes validation) stays readable by `byId`, so valid-draft preview
  is preserved.
- An invalid draft is excluded from `byId`. It was already out of `all()`, `byTag`, and the
  permalink map (drafts are filtered there), so nothing real loses a read.
- Under `validate: false`, invalid entries are still excluded, so the typed surface is pure `F`
  whether the gate is on or off.

The raw-derived summary fields (`title`, `date`, `excerpt`, `permalink`, `wordCount`, `tags`,
`draft`) are unchanged. Only `frontmatter` depends on validation, and only valid entries are
readable.

**Tests.** A failed non-draft entry throws at the site gate (existing). A failed draft is absent
from `byId` and from `all({ includeDrafts: true })`. A valid draft is present in `byId`. The
invariant: with the gate on and with `validate: false`, no readable entry has frontmatter that
differs from its normalized `result.data` (assert a field the validator normalizes, such as a
trimmed or omitted optional, reads back normalized rather than raw).

### Unit 2: the glob guard

**File:** `src/lib/delivery/site-indexes.ts`. **Tests:**
`src/tests/unit/delivery-site-indexes.test.ts`.

`createSiteIndexes` reads each descriptor's glob record as `(globs)[descriptor.id] ?? {}`
(`site-indexes.ts:45`). A missing key falls through to `{}` silently, so a typo'd or omitted glob
makes a whole content type vanish with no signal.

Change: before the `?? {}` fallback, check whether the key is present on the `globs` object. An
absent key throws with a message naming the concept and listing the keys that were passed, so the
author sees the typo at build. A present key whose record is empty (`{}`) is allowed and builds an
empty index, since `import.meta.glob` over an empty content dir returns exactly `{}` and a
brand-new concept is a legitimate state.

Presence is tested with `Object.prototype.hasOwnProperty` on the `globs` object, not truthiness, so
a present-but-empty record reads as present.

**Tests.** An adapter with two concepts and a globs object missing one key throws, and the message
names the missing concept. A globs object with a present-but-empty record for a concept builds, and
that concept's index is empty.

### Unit 3: the reserved-`site`-key guard

**File:** `src/lib/delivery/site-indexes.ts`. **Tests:**
`src/tests/unit/delivery-site-indexes.test.ts`.

`createSiteIndexes` returns `{ ...byConcept, site } as SiteIndexes<A>` (`site-indexes.ts:51`). A
concept literally named `site` would have its index clobbered by the cross-concept resolver under
the same key. The type comment already calls this unsupported; nothing enforces it at runtime.

Change: if any descriptor's id is `site`, throw at build with a message explaining that `site` is
the reserved resolver key. The check runs in the descriptor loop, before the spread.

**Tests.** An adapter with a concept named `site` throws with the reserved-key message.

### Unit 4: the feed date guard

**File:** `src/lib/delivery/feeds.ts`. **Tests:** `src/tests/unit/delivery-feeds.test.ts`.

`FeedItem.date` is a required string, and `rfc822`/`iso` wrap it in `new Date(...)`
(`feeds.ts:41-48`). A missing or malformed date makes `rfc822` emit `Invalid Date` in the RSS
`<pubDate>`, and `iso` throw a `RangeError` from `toISOString`, which would kill the build. The
content index normalizes dates upstream, so the normal pipeline never feeds a bad date. The feed
builders are public pure functions a site can call with hand-built items, so the guard protects the
public API.

Change: make `FeedItem.date` optional. `rfc822` and `iso` return `string | undefined`, parsing the
date and returning `undefined` for an absent or unparseable input rather than emitting `Invalid
Date` or throwing. The RSS builder omits `<pubDate>` when the formatter returns `undefined`, and the
JSON builder omits `date_published`. Both elements are optional in RSS 2.0 and JSON Feed 1.1, so the
output stays valid.

**Tests.** An item with no date renders a feed with no `<pubDate>` and no `date_published`, and the
document is otherwise intact. An item with a malformed date string renders the same way and does not
throw. A dated item still renders the RFC-822 and ISO instants as before.

### Unit 5: feed autodiscovery scoped to feed entries

**File:** `src/lib/sveltekit/public-routes.ts`. **Tests:**
`src/tests/unit/public-routes-seo.test.ts`.

`entryLoad` passes `feeds` into `buildSeoMeta` for every entry (`public-routes.ts:86`), so an
undated Page advertises the post feed through `<link rel="alternate">` in its head. The feed is the
post stream, and a Page is not part of it.

Change: pass `feeds` to `buildSeoMeta` only for an entry that belongs to a feed, using `entry.date`
as the proxy. A dated entry is an article in the stream and keeps its autodiscovery links. An
undated Page passes no `feeds`, so it carries no feed `alternate` links. This matches the existing
article-versus-website type split in the same function.

**Tests.** A dated entry's head still contains the RSS and JSON `alternate` links. An undated Page's
head contains no feed `alternate` links.

## Deferred to the backlog

Logged, not implemented this pass:

- **Permalink impossible date.** `permalink.ts:12` and `content-index.ts:73` accept any
  shape-valid `YYYY-MM-DD`, so `2026-13-45` passes. Unreachable without a hand-malformed date file.
- **Excerpt word counting.** `excerpt.ts` splits on whitespace, so a CJK body word-counts wrong.
  The sites being migrated are English.

## Out of scope

OG-image generation, external redirects, i18n, rename and move lifecycle, and the auth-hardening
pass (the `__Host-` cookie prefix, `/admin` security headers, the rate limit, install-token KV
caching). Auth hardening is the next independent engine-backlog pass after this one.

## Testing strategy

Every unit is covered by the node `unit` project. No unit touches the Worker, D1, auth, session,
cookie, or DaisyUI surface, so the integration and component projects are unaffected, and no review
subagent beyond a general correctness pass applies. The showcase production build stays the
end-to-end check that the delivery surface still prerenders. The full gate per task: `npm run check`
0 errors 0 warnings, and `npm test` exits 0.

## Versioning

Additive to the package surface: an optional widening on `FeedItem.date`, two new build-time throws
in `createSiteIndexes`, a purer typed read, and a scoped feed-link emission. No export-condition
change. Bumps a minor to `0.15.0`, unpublished until the next release step.

## References

- `src/lib/delivery/content-index.ts:96` (validate and record), `:109` (the cast to remove),
  `:119` (summarize), `:128` (byId).
- `src/lib/delivery/site-index.ts:33` (siteProblems), `:52` (the gate), `:63` (the permalink map
  built from `all()`).
- `src/lib/delivery/site-indexes.ts:44` (the descriptor loop), `:45` (the `?? {}` fallback), `:51`
  (the spread).
- `src/lib/delivery/feeds.ts:41` (rfc822 and iso), `:51` (buildRssFeed), `:88` (buildJsonFeed).
- `src/lib/sveltekit/public-routes.ts:56` (the destructure), `:66` (entryLoad), `:86` (feeds passed
  to buildSeoMeta).
