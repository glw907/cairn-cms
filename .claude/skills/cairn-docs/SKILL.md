---
name: cairn-docs
description: Changes cairn-cms documentation the docs-as-code way: pages under docs/ change in the same PR as the code, pass the docs gate and a fresh fact-check, and go to Geoff as a docs review. Use when code changes documented behavior (renaming, adding, or removing an export, option, type, or CLI flag, or changing a default, a return value, or an error), when a docs page is wrong or missing something, when writing, splitting, or restructuring a page, or when queueing or answering a docs review. Not for CHANGELOG entries, code comments, specs, plans, or site content.
---

# Change cairn docs

The pages under `docs/` are the source. There is no facts file, blueprint, brief, or outline file to
update beside a page: change the page, check it against the code, run the gate. Pick the case, then
follow its steps in order.

| Case | Start here |
| --- | --- |
| Code changes behavior a page describes, or renames or removes a name | A |
| A page states something false, or lacks something a reader needs | B |
| A new page, a split, or a restructure | C, then `references/new-page.md` |

Every case ends the same way: gate, fact-check, review (`references/review.md`).

## A. Code changed, so the docs change with it

1. Find every page the change touches. Search the docs for the changed name and for the behavior's
   words, not the name alone: `git grep -n -w <old-name> -- docs README.md templates skills`, then
   `git grep -n -i "<phrase the page would use>" -- docs`. A page can describe a behavior without
   naming the symbol, and a search for the symbol alone misses it. When the search finds nothing,
   say so in your reply and show the command.
2. Skip history: released `CHANGELOG.md` sections, `docs/extend/migration-notes.md` below
   `## Unreleased`, and `docs/internal/record/`, `docs/specs/`, `docs/plans/`, and `docs/research/`
   say what was true at their date.
3. Edit each sentence the change makes false. Read the code before you write a claim, and keep the
   `file:line` that settles it for your reply. A rename repoints every hit. After your last docs
   edit, including one a gate failure forces, rerun the `git grep` of the old name in `docs/` and
   `README.md`, and show that every remaining hit is history or a different symbol.
4. A public name or option also moves its reference page under `docs/reference/` and its row in
   `docs/internal/option-map.json`. The gate fails on both.
5. Run `npm run check:surface -- --update` when the public surface changed, and commit
   `docs/internal/api-surface.md`. Add the `CHANGELOG.md` entry under `## Unreleased`, and for a
   breaking change a `Consumers must:` line there and in `docs/extend/migration-notes.md`. The
   `cairn-pass` skill owns those rules.
6. Run the checks in "Checks".

## B. A page is wrong or incomplete

1. Locate the claim on the page and the code it describes. Do not trust the report's account of
   what is true: a reader who says a page "doesn't match" has found a symptom, and the code decides
   the fix.
2. Read the code (`git grep`, then open the file). Write down the true statement and its
   `file:line`.
3. Change only the sentences the code contradicts. Leave other wording alone, since an edit Geoff
   did not ask for is one more line for him to read.
4. Name the `file:line` in your reply.
5. Run the checks in "Checks".

## C. A new page or a restructure

1. Run the premise test before any prose: does the product have the thing, and does a page already
   own it? A page for something the product lacks is wrong. Stop, say what the search found, and
   name the nearest real page. `references/new-page.md` has the test.
2. Choose the track and the page type, write the outline, and draft from it, all per
   `references/new-page.md`.
3. Run the checks in "Checks".

## Checks

1. Run `npm run check:docs-gate` through `cairn-run-gate`. Fix what it reports and rerun until it
   exits 0. A gate you did not run proves nothing about the page (Anthropic's guidance: give the
   agent a check to run, <https://code.claude.com/docs/en/best-practices>).
2. Dispatch `docs-fact-checker` in a fresh context, as `references/review.md` says. Do not
   fact-check your edit in the context that wrote it: a fresh context finds what the writing context cannot
   (<https://code.claude.com/docs/en/best-practices>, "A fresh context improves code review").
3. Queue the review as `references/review.md` says. Geoff approves or sends the page back.

## Where a correction lands

- Geoff's edit in the review is final. Keep it.
- A correction to wording goes through the `survey` skill, which logs it.
- A change to cairn's voice is a PR to `docs/internal/docs-register.md`.
- A change to a base standard (Google, Microsoft) is a PR to Survey.

## When the process misfires

When the docs process went wrong in a session (a page left stale, the gate skipped, the fact-check
not run), file a cairn `BACKLOG.md` item tagged `#docs-process` with the session id, through
`log-issue`.

## Sources to route to, never copy

- `docs/internal/docs-register.md`: "The tracks", "The page anatomies", "Names", and the drafting
  brief for the page's track.
- `~/.claude/docs/voice/technical-doc-web.md` for developer pages, and
  `~/.claude/docs/voice/editor.md` for editor pages.
