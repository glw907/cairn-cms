# Fact-check a docs change and hand it over

Read this when a docs change is gated and ready for review. A docs pull request goes through its
pass's normal hand-over. The `approval-packet` skill owns the document, its check, its send, and
the answer, so this page names only what is particular to docs.

## Contents

1. Fact-check in a fresh context
2. Settle each finding
3. Land the pull request when no call is left
4. Ask each call in the close packet

## 1. Fact-check in a fresh context

Commit and push the change first, so the pull request exists. Then dispatch the `docs-fact-checker`
agent with the Agent tool (`subagent_type: docs-fact-checker`). The agent starts with no context, so
the prompt names everything it reads:

```text
Repository: <absolute path of the worktree>. Base: <merge-base sha>. Commit: <pr head sha>.
Pages: <docs/path.md>, <docs/other.md>. Findings path: <absolute path>/findings.json.
```

The agent returns one JSON array, one element per claim in the changed lines:
`{file, line, claim, verdict, source, proposed}`. `verdict` is `holds`, `wrong`, `imprecise`, or
`unsupported`.

## 2. Settle each finding

| Finding | What you do |
| --- | --- |
| `holds` | Nothing. |
| `wrong` or `imprecise`, and you agree | Fix the sentence, commit, and push. |
| `wrong` or `imprecise`, and you dispute it | It is a call for Geoff. |
| `unsupported`, and the code cannot settle it | It is a call for Geoff. |

## 3. Land the pull request when no call is left

The docs pull request needs no document of its own. Once CI is green, run:

```bash
approval-queue land <owner/repo#n> "<one plain sentence on what the pages now say>"
```

Under a round conductor, the round report names each changed page.

## 4. Ask each call in the close packet

Each call is a `:::question` in the pass's close packet, a document of kind `merge` that you
write per the `approval-packet` skill. Under a conductor, the conductor sends it. The question
quotes the sentence and states both readings in the text: what the fact-check found, with its
`source`, and why the author wrote it. It gives two options:

```markdown
:::question <a few words naming the sentence>
- **Apply the fix**: the page says "<proposed>".
- **Keep the text**: the page stands as written.
:::
```

Mark one option `{recommended}` when you have a view, and give the reason in the text.

On approve, run `approval-queue merge <id>`. On send-back, read `approval-queue notes <id>`, answer
each thread with `approval-queue reply <id> <thread> <text.md>`, fix forward, and return the
document with `approval-queue send --returns <id> <doc.md>`.
