# Fact-check a docs change and send it to Geoff

Read this when a docs change is gated and ready for a review, or when Geoff's decision comes back.
The authority is the Approval Queue README's "The docs kind" section
(`~/Projects/approval-queue/README.md`). This page is the session's checklist.

## Contents

1. Fact-check in a fresh context
2. Turn findings into notes
3. Write the description
4. Queue the review
5. Act on the decision

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
`unsupported`. Fix each `wrong` or `imprecise` claim you agree with, commit, push, and dispatch the
agent again on the new head. A finding you dispute becomes a note (below).

## 2. Turn findings into notes

Write a JSON array of notes. Each note has `id` (unique), `file` (a changed page), `kind` (`info`,
`decide`, or `question`), `anchor` (`quote`, with optional `prefix` and `suffix`), `title`, and `body`
(an array of paragraph strings). A note may add `was` and `now` together, `sides` (`{who, text}`
pairs), and `choices` (`{label, done}` pairs, where `done` says what you will do on that choice). A
`decide` or `question` note needs choices, and Approve stays locked until Geoff answers each.

| Finding | Note |
| --- | --- |
| Each page | One `info` note anchored on the page's first heading: how many claims were checked, how many held, and what was corrected. |
| A claim you corrected | An `info` note quoting the new text, with `was`, `now`, and the `source` line in the body. |
| A finding you dispute | A `decide` note quoting the text, with `sides` for `Fact check` and `Author`, and two choices: `Apply the fix` (done: "The session applies the proposed wording.") and `Keep the text` (done: "The page stands as written."). |
| An `unsupported` claim the code cannot settle | An `info` note naming what would settle it. |
| A claim that `holds` | No note. |

A quote that matches the page more than once is refused. Add a `prefix` or `suffix` to make it
unique. Check the file before you queue: `approval-queue notes --check <worktree> <notes.json>`
prints nothing and exits 0 when it passes.

A worked note:

```json
{
  "id": "N1",
  "file": "docs/extend/rotate-the-github-app-key.md",
  "kind": "info",
  "anchor": {"quote": "answers with status 503", "prefix": "The route ", "suffix": " when"},
  "title": "Fact check corrected the status code",
  "body": ["The page said 200. `src/lib/sveltekit/health.ts:188` answers a failed check with 503."],
  "was": "The route answers with status 200 even when the check fails",
  "now": "The route answers with status 503 when the check fails"
}
```

## 3. Write the description

Write a file with a background paragraph, then one or two summary paragraphs. The background places
the change: what came before and why it is in front of Geoff now. The summary says what the pages
now say and what approving does. Geoff reads on a phone and decides from this text, so follow
`~/.claude/docs/voice/approval-brief.md`. The title is sentence case, has no closing punctuation,
and runs at most 80 characters.

## 4. Queue the review

The worktree must be clean and at the pull request's head. Run the command in the background and
write its stdout to a decision file you watch:

```bash
setsid -f approval-queue docs <worktree> <owner/repo#n> "<title>" --description <description.md> \
  --notes <notes.json> > <decision.json> 2> <queue.log>
```

`--replies <replies.json>` answers the comments of an earlier send-back. The command refuses, with
one line on stderr and exit 2, a pull request that is already in a waiting item, a dirty worktree,
a worktree not at the pull request's head, a pull request that changes no `docs/**/*.md` page, and
a notes file with a quote that names no changed page or matches twice.

## 5. Act on the decision

Geoff may edit a page in the review. Each edit is a commit in the worktree named `Edit <path> in
review`.

- **Approve.** The decision carries `pr`, `head`, `commit`, and `calls` (each answered `decide`
  note as `{id, choice}`).
  1. Check `git rev-parse HEAD` prints `commit`. When `commit` is not `head`, push his edits:
     `git push origin HEAD:<branch>`.
  2. Wait for the repo's CI on `commit`: `ci-green <commit> --pr <n> --wait`, reissued on exit 75.
     A red is fixed forward, pushed, and queued again.
  3. Run `gh pr merge <n> -R <owner/repo> --merge --match-head-commit <commit>`.
  4. Bring the main checkout up to date as `pass-core` "Close" says.
  5. Answer each comment in the pull request thread. A change a comment asks for lands after the
     merge: a fix of one sentence or less as a `pass-core` direct change, anything larger as a
     follow-up docs pull request queued as a `docs` review.
- **Send back.** Push his edits first. Fix forward from the note, each `calls` entry, and each
  comment. Queue the same pull request again from the worktree at the new head, with `--replies`
  answering every comment (`done`, `kept`, or `answered`) and a description of what changed.
- **Defer.** Record the item id. A later session runs `approval-queue collect <id>` under
  `setsid -f`.
- **Refused approve.** The pull request head moved after the queue. Run `git pull --ff-only` in the
  worktree, check what moved, and queue again.
