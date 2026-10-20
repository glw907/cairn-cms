# URL-identity consolidation design (engine-hardening pass 3)

Pass 3 of the three-pass engine-hardening series, after surface-narrowing (`0.27.0`) and render
attribute-sink hardening (`0.28.0`). It is the last gate before the held window publishes and before P4,
the scaffolder, templates the surface.

## Goal

A content entry's URL identity is computed in two parallel places today, kept in agreement only by
comments. This pass collapses those into one shared unit so the agreement is a property of the code, and
it adds loud validation of the YAML URL policy so a malformed policy fails at build instead of rendering
a wrong or defaulted URL.

## The spread today

The ROADMAP names one URL spreading across the YAML policy, the catch-all route, and the frontmatter
`datePrefix`. Read against the code, the spread is two duplicate derivations plus an untyped policy.

1. **Entry identity, computed twice.** `createContentIndex` (`src/lib/delivery/content-index.ts:100-120`)
   and `manifestEntryFromFile` (`src/lib/content/manifest.ts:58-70`) each independently compute the same
   four values for an entry: `id` from the filename, `slug` through the
   `descriptor.routing.dated ? descriptor.datePrefix : null` rule, `date` coerced from frontmatter, and
   `permalink(descriptor, { id, slug, date })`. Each file also carries its own copy of the `asDate` and
   `asString` coercion helpers. The manifest file comments that it uses "the same slug rule content-index
   uses, so the manifest's permalink for an entry always equals content-index's permalink for it." That
   invariant is load-bearing: a `cairn:` link resolves through the manifest in the admin preview and
   through the content index in the public build, so the two permalinks must match. The invariant rests on
   a comment.

2. **Concept descriptors, derived twice.** `composeRuntime` (`src/lib/content/compose.ts:39`) and
   `siteDescriptors` (`src/lib/delivery/site-descriptors.ts:11`) each call
   `normalizeConcepts(content, urlPolicyFrom(siteConfig))`. The runtime and delivery permalinks "cannot
   diverge" by comment, not by sharing one path.

3. **The YAML `content:` URL policy is untyped and unvalidated.** `urlPolicyFrom`
   (`src/lib/nav/site-config.ts:115`) returns `config.content ?? {}`. `parseSiteConfig` ignores unknown
   keys. `normalizeConcepts` trusts the policy and defaults anything missing. A misspelled concept key, a
   `permalink` missing its leading `/`, an unknown `:token`, or an out-of-range `datePrefix` is silently
   defaulted or ignored until a page renders wrong.

## Approach

Two focused shared units plus targeted validation, chosen over a bundled forward-and-inverse identity
object and over reusing the frontmatter schema machinery for the YAML policy. The bundled object
over-couples the write path, whose create and rename inverse has its own needs and far less duplication.
The schema-machinery route couples this pass to the schema-source-of-truth initiative for a YAML surface
that validates differently from frontmatter.

### Unit 1: the entry-identity function

A new internal module `src/lib/content/identity.ts` owns a content entry's URL identity.

```ts
export interface EntryIdentity {
  id: string;
  slug: string;
  date?: string;
  permalink: string;
}

export function entryIdentity(
  descriptor: ConceptDescriptor,
  path: string,
  frontmatter: Record<string, unknown>,
): EntryIdentity;
```

It computes `id = idFromFilename(basename(path))`, applies the
`descriptor.routing.dated ? descriptor.datePrefix : null` slug rule through `slugFromId`, coerces `date`
from the frontmatter, and calls `permalink(descriptor, { id, slug, date })`. The shared coercion helpers
`asDate`, `asString`, and `asTags` move into this module from their two duplicate homes and are exported.
`createContentIndex` and `manifestEntryFromFile` both call `entryIdentity` for the `id`, `slug`, `date`,
and `permalink`, and both import the coercion helpers from here. Everything else each builder produces
(title, tags, excerpt, word count, cairn links) stays where it is. The caller still parses the markdown
once and passes the frontmatter in, so there is no double parse.

`identity.ts` sits one level above `ids.ts`. It imports `ids.ts` (the pure stem and slug string
operations) and `permalink.ts` (the slug-and-date to URL resolver). The inverse operations
`composeDatedId` and `renameId` stay in `ids.ts` unchanged.

### Unit 2: the concept-resolution function

`src/lib/content/concepts.ts` gains `resolveConcepts` beside `normalizeConcepts`.

```ts
export function resolveConcepts(
  content: Record<string, ConceptConfig | undefined>,
  siteConfig: SiteConfig,
): ConceptDescriptor[] {
  return normalizeConcepts(content, urlPolicyFrom(siteConfig));
}
```

`composeRuntime` calls `resolveConcepts(content, siteConfig)` with its extension-merged content.
`siteDescriptors` collapses to `return resolveConcepts(adapter.content, siteConfig)`. Both the runtime and
delivery descriptor derivations now take one path.

### Targeted validation

All URL-policy validation lands in `normalizeConcepts`, where the declared concepts and the policy meet,
in the same shape as the existing `summaryFields` guard that already throws there. It throws on:

- a `urlPolicy` key that names no declared concept, which catches a misspelled concept key;
- a `permalink` pattern that lacks a leading `/` or uses a token other than `:slug`, `:year`, `:month`,
  or `:day`, lifted from `permalink()`'s lazy per-entry check to one declaration-time check;
- a date token in a non-dated concept's pattern, which can never resolve because the concept has no date;
- a `datePrefix` outside `year`, `month`, or `day`, since the YAML is untyped at runtime.

`permalink()` keeps its per-entry check for a dated concept whose pattern needs a date when a given entry
has none, because that depends on the entry rather than the configuration. `parseSiteConfig` stays as it
is, because it parses the YAML before the declared concepts are known and cannot run the cross-check.

## Data flow after the change

```
site.config.yaml content:  ->  urlPolicyFrom  ->  normalizeConcepts (defaults + validation)
                                                       |
                                                  resolveConcepts
                                                   /          \
                                          composeRuntime    siteDescriptors
                                                                  |
                                                          createContentIndex --\
                                                          manifestEntryFromFile -> entryIdentity -> permalink
                                                                                       |
                                                                            byPermalink (catch-all route)
```

One forward derivation produces a descriptor, one function turns a file into an entry identity, and the
catch-all route reverses the permalink. The reverse map (`byPermalink`, `composeDatedId`, `renameId`)
stays where it is.

## Testing

Test-first per unit, against the existing suite as the acceptance contract.

- A new `src/tests/unit/content-identity.test.ts` covers `entryIdentity`: a dated concept, a non-dated
  concept, the date-coercion cases (an unquoted YAML date that parses as a JS `Date`, a string date, a
  missing date), and the slug strip for each `datePrefix`.
- A parity test locks the load-bearing invariant directly: for a shared fixture, the permalink
  `createContentIndex` produces equals the permalink `manifestEntryFromFile` produces. The invariant
  becomes a test rather than a comment.
- New throw-cases extend `src/tests/unit/content-concepts.test.ts`: the unknown-concept key, the bad
  pattern token, the missing leading slash, the date token on a non-dated concept, and the out-of-range
  `datePrefix`.
- The existing `content-index`, `manifest`, `content-compose`, `delivery-site-descriptors`, and
  `content-permalink` suites stay green with the internals swapped to the shared units. The change is
  behavior-preserving for a valid configuration.

## Scope boundaries

Out of scope: the deferred rename and delete content-lifecycle pass, the YAML settings web editor, any
new public export (the two units stay internal, consistent with the pass-1 narrowing), and the inverse
functions in `ids.ts`, which stay as they are.

## Versioning and release

Bumps `0.29.0`. The validation is a behavior change recorded in `CHANGELOG.md`: a site whose `content:`
URL policy was malformed and silently mis-defaulted now fails at build with a named error. The two
reference sites' valid policies pass unchanged (907 uses `day` with `/:year/:month/:day/:slug`, ecnordic
uses `month`, the showcase uses the defaults), so a valid configuration needs no consumer action and the
entry carries no `Consumers must:` line. Publishing stays held: `0.26.0` is the registry `latest`, and
`main` carries the unpublished `0.27.0` and `0.28.0`. The series publishes together after this pass, before
P4 consumes the surface.

## Execution

Subagent-driven, one `cairn-implementer` per task, on `main` directly, the same as passes 1 and 2. The
full suite is the safety net. The pass-end review gate is the simplifier over the changed files plus a
high-effort `/code-review` with attention to the permalink-parity invariant and the validation edges. The
Worker, auth, Svelte, and a11y reviewers and the live `/admin` smoke do not apply, because no auth,
Worker, or admin-UI surface changes.
