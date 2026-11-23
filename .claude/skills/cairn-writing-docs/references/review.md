# Fact-check a docs change and hand it over

Read this when a docs change is gated and ready for review. A docs pull request goes through the
hand-over in `building-from-specs`, "The pull request", so this page names only what is particular
to docs.

## Contents

1. Fact-check in a fresh context
2. Settle each finding
3. Land the pull request when no call is left
4. Ask each call under `## For Geoff`

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

The docs pull request needs no document of its own. Once CI is green, the pull request is ready for
Geoff's approval by number. Its body names each changed page and says in one plain sentence what the
pages now say.

## 4. Ask each call under `## For Geoff`

Each call goes under `## For Geoff` in the pull request body. The entry quotes the whole sentence
and states both readings: what the fact-check found, with its `source`, and why the author wrote
it. It then gives two options and recommends one, with the reason:

```markdown
**Keep "<the whole sentence>"?** The fact-check found <its reading>, from `<source>`. The author
wrote it because <the author's reading>.

- **Apply the fix**: the page says "<proposed>".
- **Keep the text**: the page stands as written.

Recommended: **<option>**, because <the reason>.
```

The page keeps the author's text until Geoff answers. He answers in his terminal, and his session
applies the answer on the branch before the merge, so an **Apply the fix** answer needs no
follow-up pull request.
