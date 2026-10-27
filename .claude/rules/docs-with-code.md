---
paths: ["src/lib/**", "packages/**", "templates/**", "tool/cmd/**", "tool/internal/**"]
---

If this change alters a public export, option, type, CLI flag, default, return value, or error,
or any behavior a page could describe (what an action commits, writes, or refuses), load the
`cairn-docs` skill and follow its case A to the end, including the fresh `docs-fact-checker` run.
A fix with no API change can still make a page false. Before you decide no page changes, search
`docs/` for the action's name and for what it writes, read every hit outside history, and show the
command in your reply.
