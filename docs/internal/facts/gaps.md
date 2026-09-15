# Gaps

This is the intake file for holes in the facts container: something a site pass needed from
`docs/internal/facts/` and didn't find, found wrong, or found only as an unverified candidate
worth a second look. It is not a backlog and not a wishlist; it exists to be worked down, not
accumulated.

## Entry shape

One bullet per gap:

```
- <what was needed>, hit while <what was being done>. <repo>, pass <N>, <date>, engine
  <version>. Status: <open | filed as a fact | moved to ROADMAP | closed>.
```

Name the repo, the pass, the date, and the installed cairn version, since a gap found against an
old engine version may already be closed by a newer one; a gap with no version attached can't be
told apart from a stale one.

## Triage rule

Complete-or-move, the same rule the docs friction log uses: an entry doesn't sit here
indefinitely. Resolve it into the facts arm it belongs to and mark it `filed as a fact`, move it
to `ROADMAP.md` if it's really a capability gap rather than a documentation one and mark it
`moved to ROADMAP`, or mark it `closed` if it turned out not to be a gap after all (the code
already covered it, or a later engine version fixed it). Verify against the code first: an entry
records what was true when written, not necessarily what's true now.

## Seeded gaps (from the 2026-09-15 harvest)

These came out of building this container, not out of a site pass; they're seeded here so the
first site pass to touch these areas doesn't have to rediscover them.

- The SvelteKit reference page (`docs/reference/sveltekit.md`) was read in full but three
  sections were not independently traced to source this pass, given the page's size (2086
  lines) against the harvest's budget: `createAuthRoutes`/`bootstrapOwner`/identity-mode behavior
  (paragraphs around line 927-963), the full media-actions vocabulary detail (lines 210-276), and
  the `NavLayoutEntry`/`NavIcon`/`ResolvedNavEntry` family (lines 1585-1750). cairn-cms, facts
  container harvest, 2026-09-15, engine 0.96.0. Status: open.
- `docs/extend/migrate-existing-content.md`'s claim that validating migrated entries means
  starting the dev server against the local double and opening each migrated entry in the admin,
  with a failing field showing its error inline, is a documented workflow recommendation composed
  of two cairn mechanisms (the dev backend, inline field validation) neither of which was traced
  to a specific symbol this pass. A follow-up should open `src/lib/components/EditPage.svelte`
  and the field-validation call sites directly. cairn-cms, facts container harvest (extend arm,
  second slice), 2026-09-15, engine 0.96.0. Status: open. [tracked as `extend.md`'s one remaining
  `[candidate]`]
- `docs/reference/sveltekit.md`, `delivery.md`, and `delivery-data.md` carry 11 candidate-tagged
  facts as a group, none independently re-traced to source this pass (the `historyLoad`/25-row
  bound and rename-restart caveat, the preview mint/revoke authorization sequence, `mintPreview`'s
  `ttlMs` bounds, the preview-row-clearing cascade on rename/delete/discard, `settingsLoad`'s Tidy
  key-health probe, `tidyAction`'s retryable-vs-not status codes, `NavLayoutSection.collapsed`'s
  cookie-wins behavior, the `NavLayoutEntry.href`/icon validation throws, `ContentIndex.all()`'s
  sort order, `EntryData.heroImage`'s undefined cases, and `CairnHead`'s `titleTemplate`/
  `markdownUrl` behavior). Kept because each reads as precise and internally consistent, not
  because it's confirmed. cairn-cms, facts container harvest (reference arm, third slice),
  2026-09-15, engine 0.96.0. Status: open.
