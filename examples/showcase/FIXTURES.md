# Wayfinder review fixtures

This is the standing content-robustness fixture set for the Wayfinder final design review
(ROADMAP.md, "Wayfinder final design review", lens five: content robustness). It lives only on
the `wayfinder-review-fixtures` branch, is never merged to `main`, and is rebased onto `main` at
review time so the review always runs against the current template.

## What is here

Six hand-authored posts under `src/content/posts/`, each attacking one content-robustness failure
mode:

- `2026-07-04-long-title.md`: a ~140-character title, to stress the header and card typography.
- `2026-07-05-no-photos-this-week.md`: no hero or SEO image at all.
- `2026-07-06-one-long-paragraph.md`: a single unbroken ~400-word paragraph, no line breaks.
- `2026-07-07-full-gear-checklist.md`: a list nested four levels deep with mixed ordered and
  unordered markers, and an eleven-column comparison table.
- `2026-07-08-conditions-safety-and-conversions.md`: every directive component the showcase
  registry declares (`callout`, `alert`, `converter`) dropped mid-prose.
- `2026-07-09-fixing-the-gpx-timestamp-bug.md`: heavy inline code and three long fenced code
  blocks (bash, Python, XML).

Two pages under `src/content/pages/`:

- `minimal.md`: a title and one sentence, nothing else.
- `maximal-about-the-club.md`: headings at every level, nested lists, a table, a blockquote, a
  wide figure, a task list, and both link forms, in one page.

And an archive-scale corpus: `scripts/generate-review-fixtures.mjs` (repo root) emits 200 short,
varied posts dated across roughly two years, so the review can look at the template under real
pagination and archive density instead of the showcase's curated dozen. The script is
deterministic (a fixed PRNG seed), so re-running it reproduces the same corpus. Its output is
committed alongside it, under `src/content/posts/`.

## Regenerating

```
node scripts/generate-review-fixtures.mjs   # from the repo root
npm --prefix examples/showcase run cairn:manifest
```

Then verify the harness still builds:

```
npm --prefix examples/showcase run build
```

## Rules for this branch

- Never merge to `main`. Rebase onto `main` at review time instead, so the review always runs
  against the current template.
- The hand-authored fixtures should read like plausible small-site content (this showcase's trail
  club voice), not lorem ipsum: the review is judging typography, and lorem ipsum does not stress
  it the way real prose does.
- If a fixture breaks the build against a schema requirement, fix the fixture to be schema-valid.
  What the fixture looks like once rendered is the review's business, not this branch's.
