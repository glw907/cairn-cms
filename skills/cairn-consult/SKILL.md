---
name: cairn-consult
description: Write a consultation brief when you have worked around a cairn engine behavior twice, or want something the documented seams do not reach at all. Load instead of a third hand-roll; either files the brief against the engine repo or hands it to you to send yourself.
---

# cairn consult

Write the brief cairn's own maintainers need to weigh the any-site case against your own. Never
edit a cairn-cms checkout, even if one happens to be on disk.

## Before writing anything, run the standard

`references/the-standard.md` carries the gate the engine applies to every consultation. An item
reaches the engine only when the site cannot legally reach or patch the surface, or a ratified,
measured grammar has diverged from what the engine ships. Read it before drafting: an item that
fails the gate there is not worth filing. The standard's own constraints shape how you write each
field, not just whether you write it at all.

## Write the brief

`references/brief-template.md` carries the four-field shape: what the pass builds, the engine
edge it presses (with `file:line` where the edge is a specific export), evidence for the
any-site case, and the site's fallback if declined, with its rough size. Save it under the site's
own docs, never inside a cairn-cms checkout you might have on disk; this skill does not touch
that repo.

## Filing is conditional, and never claimed when it did not happen

Read the installed `@glw907/cairn-cms` package's `package.json` `bugs.url` and check whether it
is reachable right now. A missing or unauthenticated `gh` counts the same as an unreachable URL.
Two outcomes, and only two:

- **Reachable:** file the brief there (for a GitHub `issues` URL, `gh issue create` against that
  repo, pasting the brief's own markdown as the body). Report the issue URL back.
- **Not reachable:** say this to whoever you report to: "The brief could not be filed
  automatically; here it is to send yourself." The brief itself is the deliverable; hand it over
  by whatever channel the developer has (paste, attach, read aloud). Do not write or imply that
  an issue was filed when the filing step did not succeed or did not run.
