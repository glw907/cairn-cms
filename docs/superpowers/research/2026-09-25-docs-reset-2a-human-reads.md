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
4. Replace the two bracketed fill-ins in Sheet 1. `[ENTRY TITLE]` becomes the entry's title.
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
log into the Claude session running pass 2a, or save it verbatim in this checkout at
`docs/superpowers/research/human-reads-2a/sheet-1-editor.md` or
`docs/superpowers/research/human-reads-2a/sheet-2-evaluator.md`. The conductor reads both paths at
Task 8 and before owner stop 1, and records each log under "Logs" at the foot of this file. A log
that arrives after the audience review's fold still counts, because it goes to pass 2b as an input.

---

## Sheet 1: an editor task

**Where you start.** You're signed in to your club's site editor, as you would be to write a post.
You also have this link to the editor help pages:
[HELP LINK]

You can use the help pages and the editor's own screens. Please don't ask anyone for help until
you've finished or stopped, since the point is to find where the help pages fall short.

**Your task.** Open the entry called **[ENTRY TITLE]**.

1. Find out who last published it, and when.
2. Bring back the version from before that one, and read it in the editor.
3. Put everything back the way it was. The live site shouldn't change at any point, so don't
   publish anything.

**You're done when** you can say who published it last and when, you've seen the older version's
text in the editor, and the entry no longer shows any unpublished changes.

**Stop early** if you've spent 20 minutes, or if you've been stuck for 5 minutes. Stopping is
useful: write down where you stopped.

**What to write down as you go:**
- The time you start.
- Each thing you tried, where you looked (which help page and which heading, or which screen and
  which button), and whether it worked.
- Every time you got stuck. That means you paused for more than a minute, guessed, went back, or
  weren't sure something had worked.
- Any word or instruction you didn't understand, copied exactly.
- The time you finish or stop, and whether you finished.
- One sentence: what would have helped most.

**When you're done,** send your notes to Geoff in whatever way you usually reach him. Rough notes
are fine.

---

## Sheet 2: an evaluator task

**Where you start.** You have a web browser and 20 minutes. Go to https://cairn.pub/ and use only
cairn's own pages, including any pages they link to on GitHub. Don't install anything, and don't
search elsewhere.

**Who you are for this task.** You look after the website for a small volunteer organization,
such as a club or a nonprofit. A few people who aren't technical write its news and pages. You've
been asked whether cairn could run the site.

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
- If you're Geoff: one line on what you already knew that a newcomer wouldn't.

**When you're done,** send your notes and your four answers to Geoff.

---

## Logs

Filled in by the conductor during Task 8 as each log arrives. Each entry has the reader's role,
the date, whether the task finished, and the log as sent, unedited.

| Sheet | Reader | Sent | Log received | Finished | Routed to |
| --- | --- | --- | --- | --- | --- |
| 1 (editor) | | | | | |
| 2 (evaluator) | | | | | |
