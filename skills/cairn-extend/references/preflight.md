# Pre-flight

Run this before calling a piece of extension work done, whether it built a custom admin screen,
a login channel, or anything else that reaches into a cairn seam.

## 1. The boundary question

Cairn owns managing markdown content and the editor/admin frame, and little else; everything a
site needs beyond that, its own functionality, actors, auth, data, and domain logic, is the
site's own to build. Before adding a subsystem, an actor, or new surface, ask whether it is
cairn's job or yours. If it reads like cairn's job, that is the signal to reach for
`cairn-consult` instead of building it yourself: see step 4.

## 2. The DaisyUI question, again

Re-ask it at the end, not only at the start: does what got built read as a stock DaisyUI
component wearing custom classes, or a genuinely new shape? `references/daisyui-first.md` is the
current answer for the cases cairn's own admin has already worked through.

## 3. Name the seam

A reviewer, human or agent, should be able to find the atom your code calls, the seam it comes
from, and the pattern's source fact without guessing. `../SKILL.md`'s router table names the atom
and the fact for the two patterns it covers today; a pattern the table does not yet name still
deserves the same treatment in your own commit message or comment: name the atom, not just what
it does.

## 4. Two workarounds is the consultation trigger

Worked around the engine's own behavior once: note it and move on. Worked around it twice, or
want something the documented seams do not reach at all: that is the trigger for `cairn-consult`,
not a third patch. It writes the brief cairn's own maintainers need to weigh the any-site case
against your own.

## 5. Two habits, checked

- Every action with more than two outcomes returns a discriminated `outcome`, never a boolean.
- Every operationally meaningful event logs through `createLogger` (`/log`), never a bare
  `console` call.

## 6. Run the gates a site's own install wires up

A site installed through `cairn-guidance install` carries a `Stop` hook that runs
`npm run check:cairn --if-present`; let it run rather than skipping past a failure. If the change
touched anything under `/admin`, load the `cairn-admin-screens` skill and run its own done-gate
(the static and rendered `cairn-audit` passes) before calling the screen finished. If
`.claude/agents/cairn-extension-reviewer.md` is installed, run it over the diff: it is read-only,
asks whether a new component could have been a stock DaisyUI one and whether an action with more
than two outcomes uses the `outcome` grammar, and returns accept, fix, or escalate.
