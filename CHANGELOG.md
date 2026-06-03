# Changelog

All notable changes to this project are recorded here, most recent first.

## 0.23.0

### Changed (breaking)
- A `date` field now validates a real `YYYY-MM-DD` calendar date. A site adopting this version whose
  committed content holds a malformed or impossible date will see it fail validation, which is the loud
  failure this restores.
- A `tags` field now enforces its declared `options` as a closed vocabulary. A committed value outside
  the list fails validation. Use a `freetags` field for free-form tags.
- `normalizeConcepts` now throws when a `summaryFields` key names no declared field, so a typo fails at
  config load instead of silently producing an empty list card.

### Changed
- `AttributeField.options` is now `readonly string[]`, so a site can share one frozen `as const`
  vocabulary across components. Read-only by use, so no call site changes.

## 0.22.0

### Added
- `ContentSummary.concept` and `EntryData.concept`: the read model carries its resolved concept id, so a
  list or page branches per concept without re-deriving it from `entry.date`.
- A `summaryFields` knob on a concept config surfaces named frontmatter keys on `ContentSummary.fields`,
  so a list card reads an authored field with no per-entry detail read.
- The package root re-exports the delivery route loaders (`createPublicRoutes`) and the response helpers
  (`rssResponse`, `jsonFeedResponse`, `sitemapResponse`, `robotsResponse`).

### Changed (breaking)
- `CairnHead` moved off the `@glw907/cairn-cms/delivery` barrel to its own `@glw907/cairn-cms/delivery/head`
  entry, so a node-environment data import from `/delivery` stays component-free. Update the import:
  `import { CairnHead } from '@glw907/cairn-cms/delivery/head'`.
