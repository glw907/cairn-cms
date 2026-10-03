# Page briefs

A brief records where every sentence of one published docs page comes from. It is agent-facing,
never shipped, and never register-graded. `npm run check:provenance`
(`scripts/checks/check-provenance.mjs`) reads every brief here and fails the build on any sentence
it cannot trace. It runs in CI (`.github/workflows/test.yml`). Until the first brief lands, the
check passes and prints "no page has a brief yet"; no brief is committed as of docs reset pass 1's
close.

Pass one or more brief paths to check only those briefs, leaving every other brief unchecked:
`npm run check:provenance -- <brief path>...`. Each path must exist and sit under
`docs/internal/briefs/`; a missing or outside path fails with a clear message. This is the mode a
page chain runs while a sibling page's brief is still in flight, so one page's gate never fails
on another page's draft. With no path given, the check runs every brief and also checks coverage
(below).

## Coverage: the rebuilt-page list

`docs/internal/briefs-rebuilt.json` is a committed, flat JSON array of page paths (from the
repository root, under `docs/`) that a stage has rebuilt. Each stage merge appends the paths its
chain rebuilt; the list starts empty (`[]`) and nothing is ever removed from it. In the check's
default, no-argument run only (the single-brief mode does not read this list), `check:provenance`
fails any listed path that no brief's `page` field names, matched by that field and never by a
brief's file name, so a page that lost its brief after a later rewrite is caught. That check runs
before the check decides whether any brief exists at all, so it still catches a coverage gap even
when the briefs directory is empty. A listed path whose page no longer exists on disk is reported
as a stale list entry, not as a missing brief; the list is itself invalid, and the run fails,
when it is absent, not valid JSON, or not a JSON array.

**The brief naming rule.** An arm's own `README.md` (`docs/admin/README.md`,
`docs/editors/README.md`, `docs/extend/README.md`, `docs/reference/README.md`) is briefed under
its own arm's track (`docs/internal/briefs/admin/README.json`, and so on), the same as any other
page in that arm. Only `docs/why-cairn.md` and `docs/README.md`, the two front-door pages, use the
`front-door` track. Because coverage matches a brief's `page` field, `front-door/README.json` (for
`docs/README.md`) never covers `docs/admin/README.md`; each arm README needs its own brief.

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
- Each sentence carries `id`, either the fact id it rests on (a bullet in `docs/internal/facts/`),
  a non-empty array of fact ids for a sentence that synthesizes several facts (each id is checked
  as a single id is, and a fact in the sentence must appear in at least one cited bullet), or the
  literal `"no-claim"` for a sentence that states no fact: a transition, a pointer to the next
  step, a table header. `"no-claim"` is not valid inside an array.
- `cuts` is optional: an array of `{ "id": "f:...", "reason": "..." }` mirroring the cut
  dispositions of the page's plan (see "The page plan" below). A fact the plan subordinates to the
  reference arm is a cut whose reason names the reference link. Each entry needs a fact id and a
  non-empty reason; the check does not resolve a cut id against the container.

Headings, fenced code blocks, images, HTML comments, and front matter are not sentences and stay
out of the list. Table cells and list items are sentences.

## The page plan

Beside a page's brief sits its plan, `docs/internal/briefs/<track>/<page>.plan.md`, a committed
artifact the chain writes before the draft. It holds the introduction's three parts; each section
in the order the plan argues for, with its heading, the one sentence a reader takes from it, the
fact ids it draws on, and its hand-off; the ending; and a disposition for every fact id in the
page's claim inventory: placed in a section, subordinated to a named reference link, or cut with a
reason. `check:provenance` reads only the `.json` briefs, never the plan; the review page
(`scripts/docs-review/`) shows the plan beside the page.

## The drafter writes it

The drafter (`cairn-docs-drafter`, run by the workstation's `docs-page-chain.js`) writes the
`sentences` list together with the page, in the same round, never after it. A sentence that states two facts from two bullets either splits into two sentences or cites both ids in an array. A drafted sentence with
no fact to cite is either `no-claim`, because it claims nothing, or it goes back to the chain's
page-inputs step first, because a claim with no fact is the defect this check exists to catch.

## What the check fails

- A sentence with no `id`, an empty `id` array, or an `id` that is neither `f:` plus six base36
  characters nor `"no-claim"`.
- A `cuts` entry that is not an object, whose `id` is not a fact id, or that has no `reason`.
- A sentence on the page that the brief leaves out, or a brief sentence the page does not carry.
- An `id` (any id of an array) that resolves to no fact bullet.
- A cited bullet tagged `[candidate]` (any qualifier, `[candidate: excluded, ...]` included),
  `[rejected]`, or `[docs-drift]`. `[verified]`, `[external]`, and `[vendor]` bullets are
  citable.
- A number, version, date, path, command, flag, or backticked export or config name in a
  sentence that none of its cited bullets contains, and an owner-tier key phrase (see
  `docs/internal/facts/README.md`) no cited bullet carries. A `no-claim` sentence
  holding any of these fails outright.

The extractor's classes and the list of what it cannot see are in the header of
`scripts/checks/check-provenance.mjs`. Whatever it cannot see, a reviewer reads with the brief
open beside the page.
