---
name: cairn-consult
description: Use when you have worked around a cairn engine behavior twice, or want something the documented seams do not reach at all. Writes a consultation brief instead of a third hand-roll, and either files it against the engine repo or hands you the brief to send yourself.
---

# cairn consult

This skill fires on the trigger `cairn-extend`'s own pre-flight names: worked around the engine
once, note it and move on; worked around it twice, or want something the documented seams do not
reach at all, that is this skill's trigger, not a third patch. It writes the brief cairn's own
maintainers need to weigh the any-site case against your own, and it never edits the cairn-cms
checkout itself.

## Before writing anything, run the standard

`references/the-standard.md` is a verbatim copy of the engine's own consultation standard. An
item reaches the engine only when the site cannot legally reach or patch the surface, or a
ratified, measured grammar has diverged from what the engine ships. Read it before drafting: an
item that fails the gate there is not worth filing, and the standard's own constraints (no
accept-by-default, the anonymous-consumer bar, shape not membership) shape how you write each
field, not just whether you write it at all.

## Write the brief

`references/brief-template.md` carries the four-field shape: what the pass builds, the engine
edge it presses (with `file:line` where the edge is a specific export), evidence for the
any-site case, and the site's fallback if declined, with its rough size. Save it under the site's
own docs, never inside a cairn-cms checkout you might have on disk; this skill does not touch
that repo.

## Filing is conditional, and never claimed when it did not happen

Read the installed `@glw907/cairn-cms` package's `package.json` `bugs.url` and check whether it
is reachable right now. Two outcomes, and only two:

- **Reachable:** file the brief there (for a GitHub `issues` URL, `gh issue create` against that
  repo, pasting the brief's own markdown as the body). Report the issue URL back.
- **Not reachable:** say so plainly, in exactly those words, to whoever you report to. The brief
  itself is the deliverable; hand it over by whatever channel the developer has (paste, attach,
  read aloud). Do not write or imply that an issue was filed when the filing step did not
  succeed or did not run.

This skill never claims an issue was filed unless the filing call itself returned success.

## After filing (or not)

The engine's own `engine-consult` skill and `engine-triage` agent do the triage on the far side;
nothing here waits on a verdict. If a verdict comes back and changes what you build, that is a
normal update to the site's own plan, not a reason to reopen this skill.
