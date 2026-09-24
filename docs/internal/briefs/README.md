# Page briefs

A brief records where every sentence of one published docs page comes from. It is agent-facing,
never shipped, and never register-graded. `npm run check:provenance`
(`scripts/checks/check-provenance.mjs`) reads every brief here and fails the build on any sentence
it cannot trace. Until the first brief lands, the check passes and prints "no page has a brief yet".

## Where briefs live

One brief per page, at `docs/internal/briefs/<track>/<page>.json`, where `<track>` is the page's
audience track (`admin`, `editors`, `extend`, `reference`, or `front-door`) and `<page>` is the
page's file name without `.md`. The brief for `docs/admin/is-it-working.md` is
`docs/internal/briefs/admin/is-it-working.json`. The check fails a brief whose file name differs
from its page's.

## The format

```json
{
  "page": "docs/admin/is-it-working.md",
  "sentences": [
    { "text": "Run `cairn doctor` in your site directory.", "id": "f:7k3q9x" },
    { "text": "The rest of this page walks through its output.", "id": "no-claim" }
  ]
}
```

- `page` is the page's path from the repository root.
- `sentences` lists every sentence of the page's prose, in page order, each copied exactly as the
  markdown writes it (code spans, emphasis, and links included).
- Each sentence carries `id`, either the fact id it rests on (a bullet in `docs/internal/facts/`)
  or the literal `"no-claim"` for a sentence that states no fact: a transition, a pointer to the
  next step, a table header.

Headings, fenced code blocks, images, HTML comments, and front matter are not sentences and stay
out of the list. Table cells and list items are sentences.

## The drafter writes it

The drafter writes the `sentences` list together with the page, in the same round, never after
it. A sentence that states two facts from two bullets is two sentences. A drafted sentence with
no fact to cite is either `no-claim`, because it claims nothing, or it goes back to the facts
container first, because a claim with no fact is the defect this check exists to catch.

## What the check fails

- A sentence with no `id`, or an `id` that is neither `f:` plus six base36 characters nor
  `"no-claim"`.
- A sentence on the page that the brief leaves out, or a brief sentence the page does not carry.
- An `id` that resolves to no fact bullet.
- A cited bullet tagged `[candidate]` (any qualifier, `[candidate: excluded, ...]` included),
  `[rejected]`, or `[docs-drift]`. `[verified]`, `[external]`, and `[vendor]` bullets are
  citable.
- A number, version, date, path, command, flag, or backticked export or config name in a
  sentence that its cited bullet does not contain, and an owner-tier key phrase (see
  `docs/internal/facts/README.md`) the cited bullet does not carry. A `no-claim` sentence
  holding any of these fails outright.

The extractor's classes and the list of what it cannot see are in the header of
`scripts/checks/check-provenance.mjs`. Whatever it cannot see, a reviewer reads with the brief
open beside the page.
