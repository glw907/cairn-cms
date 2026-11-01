---
name: cairn-writing-engine-code
description: Writes cairn engine code to its idiom charter and avoids its known operational traps. Use when adding or changing code under src/lib, when a pass writes tests, or when a Cloudflare email error, a visual baseline mismatch, a consumer engine pin, or a Vite parse error of dist Svelte files appears.
paths:
  - "src/lib/**"
  - "src/tests/**"
---

# Writing engine code

Read `references/code-idioms.md` before writing a new pattern in `src/lib`. It sets one obvious way for each recurring pattern, and a pass checks its diff against it.

Read `references/durable-gotchas.md` when a symptom matches one of its anchors. It covers Cloudflare email (`E_SENDER_NOT_VERIFIED` also means an unverified destination), the consumer engine pin (`link:consumer`), a worktree showcase end-to-end run that proves the main checkout's engine until reinstalled, CI baselines this workstation's Chromium cannot reproduce, and Vite 8 parsing dist `.svelte` TypeScript as JavaScript.

Three rules apply to every change:

- Tests live under `src/tests/{unit,integration,component}/`. The Vitest config globs only those three directories, so a test beside its source never runs.
- Code comments follow TSDoc, enforced by `npm run check:comments`: write the contract and the why, never the type the signature states. The em dash is banned in code comments. An exported symbol keeps a one-line doc comment even when self-evident.
- A diagnosable code path gets an event in the log vocabulary (`src/lib/log/`), not a bare `console` call, and the table in `skills/cairn-extending-a-site/references/log-events.md` changes in the same pass.

## References

- `references/code-idioms.md`: the idiom charter.
- `references/durable-gotchas.md`: operational traps, by anchor.
