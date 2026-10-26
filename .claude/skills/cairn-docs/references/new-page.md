# A new page or a restructure

Read this when the page does not exist yet, or when a page splits or moves.

## Contents

1. The premise test
2. The track and the page type
3. The outline
4. The introduction
5. Draft and check

## 1. The premise test

Run both questions before you write a sentence.

1. **Does the product have it?** Search the code for the thing the page would document:
   `git grep -n -i "<term>" -- src tool templates packages`. Search every spelling a reader or a
   request might use. When the code has nothing, the page documents something that does not exist.
   Stop. Reply that the product has no such thing, cite the search (the pattern and its empty
   result), and name the nearest real page. Create no file.
2. **Does a page already own it?** Search the docs: `git grep -l -i "<term>" -- docs`, and read the
   index of the track (`docs/extend/README.md` for the extend track). A job that a page covers gets
   an edit to that page, not a second page. A page serves one track or it is two pages.

## 2. The track and the page type

- The track follows the reader. `docs/internal/docs-register.md`, "The tracks", says who each track
  is for. `docs/editors/` is for people writing in `/admin` with no terminal. `docs/extend/` is for
  a developer building on the seams. `docs/reference/` is one page per export subpath and is gated.
- The page type follows the job: a task guide, a concept page, a reference entry, or a tutorial.
  The register's "The page anatomies" gives the shape each one takes. Diátaxis names the types
  (<https://diataxis.fr/>), but no published page cites Diátaxis or its terms.
- Names follow the register's "Names" section. A name the section retires fails the gate.

## 3. The outline

Write the outline before the prose, and put it in the pull request description. The register's
drafting brief for the track, "Structure", sets what it holds: the page's job; the introduction's
three parts; the sections in order, each with its heading, the one sentence a reader takes from it,
and its hand-off; and the ending the page's anatomy requires. Google calls an outline "the
narrative for your document" (<https://developers.google.com/tech-writing/two/large-docs>).

Every claim you plan to make needs a place in the code. Read that code now, and note the
`file:line` beside the section. A claim with no code behind it comes out of the outline.

## 4. The introduction

The register's "The introduction" section holds the questions an introduction answers. Answer them
from the outline: what the page covers, what the reader needs to know first, and what it leaves to
other pages.

## 5. Draft and check

1. Draft in the voice of the track: `docs/internal/docs-register.md`, "Voice" and "Tells" in the
   brief for the track, then `~/.claude/docs/voice/technical-doc-web.md` for developer pages or
   `~/.claude/docs/voice/editor.md` for editor pages.
2. Link the new page from its track's index and from the pages that hand a reader to it.
3. Run the checks in `SKILL.md`, then queue the review as `references/review.md` says.
