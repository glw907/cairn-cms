---
paths: ["src/lib/**", "packages/**", "templates/**", "tool/cmd/**", "tool/internal/**"]
---

If this change alters a public export, option, type, CLI flag, default, return value, or error,
or any behavior a page could describe (what an action commits, writes, or refuses), load the
`cairn-docs` skill and change the affected pages under `docs/` in the same PR. A fix with no API
change can still make a page false, so before you decide no page changes, search `docs/` for the
behavior's words and show the command in your reply.
