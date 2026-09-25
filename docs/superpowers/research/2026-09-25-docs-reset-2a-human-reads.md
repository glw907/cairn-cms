# Docs reset pass 2a: human-read task sheets

Two short tasks for real readers. Their stall logs go into pass 2a's audience review, where they
are the only evidence that does not come from a model (spec §5, "Human reads"). They go to Geoff
with the plan approval, so the editor's read has lead time. The first section is Geoff's and is
never sent. Each sheet after it is sent whole, from its heading to the rule below it.

## For Geoff (not sent)

**Readers.**
- **Sheet 1:** one editor who already writes on a club site that runs on cairn. Pick someone other
  than yourself.
- **Sheet 2:** yourself or an outside reader. An outside reader is better, since you know cairn
  from the inside. If you take it, say so in the log.

**Before you send Sheet 1:**
1. Pick one published post or page on that editor's club site that has been published at least
   twice.
2. Check that nobody has unpublished changes on it, because a pending draft blocks the task.
3. Confirm that the editor can still sign in.
4. Replace the two bracketed fill-ins in Sheet 1. `[ENTRY TITLE]` becomes the post's or page's
   title.
   `[HELP LINK]` becomes the editor help pages at the engine version the club site runs, so a
   stall reads against the pages that match the editor's screens:

   | Club site | Engine (installed, 2026-09-25) | Help link |
   | --- | --- | --- |
   | ecxc-ski | 0.95.0 | https://github.com/glw907/cairn-cms/blob/v0.95.0/docs/editors/README.md |
   | aksailingclub-org | 0.96.0 | https://github.com/glw907/cairn-cms/blob/v0.96.0/docs/editors/README.md |
   | xcathletes-org | 0.96.0 | https://github.com/glw907/cairn-cms/blob/v0.96.0/docs/editors/README.md |

   If the site has upgraded since, use tag `v<installed version>` in the same address
   (`npm ls @glw907/cairn-cms` in the site repository prints it).

**Where each log goes.** The reader replies to you. Add one line on top naming the sheet, the
reader (or "Geoff"), and for Sheet 1 the club site and its engine version. Then either paste the
log into the Claude session running pass 2a, or save it verbatim at
`/var/home/glw907/Projects/cairn-cms/docs/superpowers/research/human-reads-2a/sheet-1-editor.md`
or
`/var/home/glw907/Projects/cairn-cms/docs/superpowers/research/human-reads-2a/sheet-2-evaluator.md`.
The conductor saves a pasted log verbatim at the matching path. At Task 8 and before owner stop 1,
a `sonnet` agent at `medium` checks both paths and copies each log under "Logs" at the foot of
this file, so the conductor never reads a log. A log that arrives after the audience review's fold
still counts, because it goes to pass 2b as an input.

---

## Sheet 1: an editor task

**Where you start.** You're signed in where you write your club website's posts (your site's
address followed by /admin). You also have this link to the editor help pages:
[HELP LINK]

The link opens the help pages on GitHub, a site that stores the project's files. Only the page
text matters. You can ignore the rest of the GitHub screen.

You can use the help pages and the editor's own screens. Please don't ask anyone for help until
you've finished or stopped. We're testing the help pages, not you, so every place you get stuck is
useful to know.

**Your task.** Open the post or page called **[ENTRY TITLE]**.

1. Find out who last published it, and when.
2. Open the text as it was before that publish, so you can read it in the editor.
3. Put everything back the way it was. The live site shouldn't change at any point, so don't
   publish anything. If you publish something by mistake, stop and tell Geoff right away.

**You're done when** you can say who published it last and when, you've read the older version's
text in the editor, and the post or page is back to exactly how it was when you started.

**Stop early** if you've spent 20 minutes, or if you've made no progress for 5 minutes. Stopping
early is still useful. Write down where you stopped.

**What to write down as you go:**
- The time you start.
- Each thing you tried, and whether it worked.
- Where you looked each time. Name the help page and its heading, or the screen and its button.
- Every time you got stuck. That means you paused for more than a minute, guessed, went back, or
  weren't sure something had worked.
- Any word or instruction you didn't understand, copied exactly.
- The time you finish or stop, and whether you finished.
- One sentence: what would have helped most.

**When you're done,** send your notes to Geoff in whatever way you usually reach him. Rough notes
are fine.

---

## Sheet 2: an evaluator task

**Where you start.** You have a web browser and 20 minutes. Go to https://cairn.pub/. Use only
the pages on cairn.pub and the pages they link to, including pages on GitHub. Don't install
anything, and don't search elsewhere. Please work on your own until you've finished.

**Who you are for this task.** You look after the website for a small volunteer organization,
such as a club or a nonprofit. A few people who aren't technical write its news and pages.

**Your task.** Decide whether cairn could run your organization's site. Write down:

1. Your answer: yes, no, or not sure.
2. The two strongest reasons for your answer.
3. What your organization would have to give up, or take on, to use it.
4. What you would need to do first if the answer were yes.

**You're done when** you've written down all four. If 20 minutes run out first, write down what
you have and where you were.

**What to write down as you go:**
- The time you start.
- Each page you read, in order, with its address.
- Every time you got stuck. That means you couldn't find something, a page assumed something you
  didn't know, or you weren't sure what to read next.
- Any claim you didn't believe or couldn't check, copied exactly.
- Any question the pages never answered.
- The time you finish.
- If you already know cairn well, one line on what you knew that a newcomer wouldn't.

**When you're done,** send your notes and your four answers to Geoff. Rough notes are fine.

---

## Logs

Filled in during Task 8 by the `sonnet` copier the conductor dispatches, as each log arrives. Each entry has the reader's role,
the date, whether the task finished, and the log as sent, unedited.

| Sheet | Reader | Sent | Log received | Finished | Routed to |
| --- | --- | --- | --- | --- | --- |
| 1 (editor) | | | | | |
| 2 (evaluator) | | | | | |
