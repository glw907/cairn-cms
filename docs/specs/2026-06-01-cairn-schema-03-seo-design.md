# cairn Schema Source of Truth (Plan 3): The Per-Entry SEO Head Consumer

**Date:** 2026-06-01
**Status:** Approved (design)
**Parent initiative:** schema source of truth, `docs/superpowers/specs/2026-06-01-cairn-schema-source-of-truth-design.md`
**Prior plans:** Plan 1 (the additive `defineFields` primitive), Plan 2 (the contract cutover, `0.13.0` on `main`)

## Summary

This is the third and last plan of the schema-source-of-truth initiative. It wires the per-entry SEO
fields into the public head. An author who declares `image`, `robots`, or `author` on a concept's
schema and fills them in for an entry gets the matching head tag on that entry's page, with a relative
image path resolved to an absolute URL. A site can set one default OG image that fills in for any entry
without its own.

The head builder `buildSeoMeta` already accepts and emits `image`, `robots`, and `article:author`. The
gap is the reader: `entryLoad` reads only `description` from frontmatter today, so the other three
fields never reach the head, and a relative image path would reach a builder that contractually expects
an absolute URL. This plan closes that gap and proves it with a production prerender.

## Why this rides the initiative

The backlog framed SEO hardening and typed reads as one Pass 2 item. The schema-source-of-truth
rework absorbed the typed reads, and this consumer is what makes the typing pay off in a visible
surface. One schema field declaration now drives the editor form, the validator, the normalized read,
and the head tag, so the SEO head is the end-to-end demonstration the initiative needed.

## The design decision: a site default for the image only

`description` already falls back to a site-level default, since every page needs a description for good
SEO and absence is a degraded state. The three fields this plan adds split on that same test.

- **image** degrades when absent: the social card drops to a plain summary with no art. A site-wide
  brand image is the right floor, so the engine offers a `defaultImage` dependency.
- **robots** is correct when absent: no directive means indexable, which is what almost every page
  wants. A site-wide robots default would stamp a directive on every page, so robots stays per-entry.
- **author** is meaningful when absent: no byline is a fine state, and a site default is useful only on
  a single-author site. It stays per-entry for now, with a `defaultAuthor` knob as a cheap symmetric
  addition later if a real site asks.

This matches the near-universal convention across comparable tools (Next.js, Astro, Hugo, Eleventy,
Gatsby, WordPress/Yoast, Nuxt SEO), where a site-wide default OG image is overridden per entry, robots
is per-page, and a site-default author is occasional.

## The read at the cross-concept boundary

`entryLoad` serves the catch-all `[...path]` route, so it resolves any concept by request path through
the `SiteIndex` resolver. A catch-all is cross-concept by nature, and a request path can land on any
concept, so the resolver returns an entry whose frontmatter is typed `Record<string, unknown>`. The read
coerces by name at that boundary through a small typed reader, rather than threading per-concept generics
through a resolver that would widen them at the resolution point anyway.

The typed payoff this plan proves is the full loop, not a statically typed catch-all. A schema field
declaration drives the editor form, the validator, and the normalized read stored on `.frontmatter`. The
per-concept `Infer` typing is Plan 2's, available on the showcase's typed `posts` export and gated there
by `expectTypeOf`.

## Components

### New: `src/lib/delivery/seo-fields.ts`

A pure, node-testable module holding the boundary reader and the image resolver, kept separate from the
head builder in `seo.ts` so that reading frontmatter and building the head stay distinct concerns.

```ts
/** The head fields a concept can carry in frontmatter. Each is optional and omitted when absent. */
export interface SeoFields {
  description?: string;
  image?: string;
  robots?: string;
  author?: string;
}

/** Read the known SEO head fields off an entry's frontmatter at the cross-concept boundary. Keeps a
 *  non-empty string and omits an absent, empty, or non-string value. */
export function readSeoFields(frontmatter: Record<string, unknown>): SeoFields;

/** Resolve an author-supplied image path to an absolute URL against the site origin. An absolute or
 *  protocol-relative URL passes through; a root-relative or bare path anchors to the origin; a
 *  malformed string returns undefined rather than throwing at build. */
export function resolveImageUrl(image: string, origin: string): string | undefined;
```

`resolveImageUrl` uses `new URL(image, origin).href`, which handles every case in one expression: an
absolute or protocol-relative URL ignores the base, and a root-relative or bare path anchors to the
origin. A throw on a malformed input is caught and returns `undefined`. Both `readSeoFields` and
`resolveImageUrl` are exported from `delivery/index.ts` and the package root.

### Modified: `src/lib/sveltekit/public-routes.ts`

`PublicRoutesDeps` gains one optional field.

```ts
  /** A site-wide default OG image, used when an entry declares none. Resolved to absolute like the
   *  canonical URL, so a relative path such as "/og/default.png" works. */
  defaultImage?: string;
```

`entryLoad` calls `readSeoFields(entry.frontmatter)` once, applies the fallback chains, resolves the
image, and passes the three new fields through to `buildSeoMeta` alongside the existing inputs. The
current `entry.frontmatter.description as string` cast is replaced by the reader's `description`.

`buildSeoMeta`, `SeoMeta`, and `CairnHead` are untouched.

## Data flow

All fallback chains live in `entryLoad` as policy, over the values the reader returns.

- **description:** `seo.description` then `entry.excerpt` then `deps.description`. Behavior is unchanged;
  the source moves to the reader.
- **image:** `seo.image` then `deps.defaultImage`, then `resolveImageUrl(raw, origin)`. The head emits
  `og:image` and `twitter:image` only when a value resolves.
- **robots:** `seo.robots`, otherwise omitted.
- **author:** `seo.author`, otherwise omitted. `buildSeoMeta` emits `article:author` only on the article
  type, so a dated entry carries the byline and a page does not.

## Testing

- **Unit, the reader and resolver (`seo-fields.test.ts`):** `readSeoFields` keeps present strings and
  omits absent, empty, and non-string values. `resolveImageUrl` covers an absolute pass-through, a
  protocol-relative URL, a root-relative `/og/x.png`, a bare `og/x.png`, and a malformed input that
  returns `undefined`.
- **Unit, the loader SEO wiring (`public-routes` SEO):** against a constructed `deps` and a small fake
  index, a per-entry image resolves absolute, `defaultImage` fills in when the entry omits one, `robots`
  emits, `author` emits on a dated entry and not on a page, and the description fallback chain holds.
- **Type-level, one assertion:** the showcase posts schema's `Infer` carries `image?: string`, so a
  declared SEO field reaches the inferred type. The heavy type proof is Plan 2's.
- **Showcase prerender, the end-to-end gate:** the showcase schema declares `image`, `robots`, and
  `author` as optional fields. One post sets an `image`, one page sets `robots: noindex`, and a post
  sets an `author`. The route deps pass a `defaultImage`. The production prerender asserts the post's
  own absolute `og:image`, the default `og:image` on an entry without one, the `robots` meta, and
  `article:author`.

## Scope

In scope: the reader and resolver, the `entryLoad` wiring, the `defaultImage` dependency, the showcase
schema fields, and the prerender gate.

Out of scope, as carried follow-ups: a site-default author or robots, OG-image generation, and external
redirects. The feed and excerpt robustness guards stay the separate small follow-up pass the parent spec
names.

Version: additive across the package surface, since the new dependency field is optional, the new
exports add to the existing entries, and `entryLoad` reads more fields without changing what it emitted
before. A minor bump to `0.14.0`, rolling on the unpublished window over `0.13.0`.

## Plan shape

Four tasks, each independently green, with the showcase prerender as the final proof.

1. The `seo-fields.ts` reader and resolver, with their unit tests and the package exports.
2. The `entryLoad` wiring and the `defaultImage` dependency, with the loader SEO unit tests.
3. The showcase schema fields, the entry values, and the `defaultImage` dep.
4. The prerender gate plus the one `Infer` type assertion, and the version bump.
