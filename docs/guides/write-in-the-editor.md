# Write in the editor

Open any post or page from the admin and you land in the editor. The title sits at the top, large
and plain, and the body below it is where you write. Your page's details live in the column on the
right, and the bar at the top holds Save and Publish. This page walks through the writing surface
itself, from an editor's seat.

## The toolbar

Select some text and click a toolbar button to format it. Click the same button again and the
formatting comes off. The most common tools sit in the strip directly:

| Tool | What it does |
|---|---|
| Bold, Italic | Format the selected words. Ctrl+B and Ctrl+I work too (Cmd on a Mac). |
| Heading, Smaller heading | Turn the current line into a section heading or a subsection heading. |
| Bulleted list, Numbered list | Turn the selected lines into a list. |
| Quote | Set the selected lines off as a quotation. |

The "..." button at the end of the formatting group holds the rarer tools: strikethrough, inline
code, a code block, a starter table, a horizontal rule, and a task list with checkboxes. The table
tool drops a small empty grid into the page with your cursor in the first cell, so you can start
typing column names right away.

## Links

There are two link buttons, and the difference matters.

Web link (or Ctrl+K) is for addresses outside your site. It asks for the address and the text the
link should say, and if you selected a phrase first, that phrase is already filled in as the text.

Link to page is for your own posts and pages. It opens a search over everything on your site;
choose the page and the link lands at your cursor. Use it instead of pasting your own addresses,
because a link made this way keeps working even if the target page's address changes later.

## Insert block

Insert block adds one of your site's building blocks, such as a callout or a gallery, through a
short guided form. Fill in the form and the block lands at your cursor as a few lines of text
fenced by `:::` markers.

## The ::: lines and their rails

Some lines in your page start with `:::`. Those are layout blocks, the machinery behind the
building blocks described above. A thin colored rail runs down the left edge from a block's
opening line to its closing one, so you can see where the block begins and ends, and blocks
inside blocks draw a second rail beside the first. The block name on the opening line keeps its
color while the colons fade back; the plain text between the markers is yours. Edit that text
freely and leave the marker lines alone; hovering one shows a short reminder saying the same
thing. The block your cursor is sitting in draws its rail a little heavier, which is a handy way
to check which block you are about to type into.

## Write and Preview

The two tabs at the right end of the toolbar switch between writing and a preview of the finished
page, styled the way your site will show it. Formatting buttons rest while Preview is showing.
Switch back to Write and your text is exactly where you left it, cursor and all.

While Preview is showing, a width button sits beside the tabs. It starts at Desktop. Pick Tablet,
Phone, or Small phone to see the page the way a smaller screen will show it, and the editor
remembers your pick for next time. Links in the preview are just for looking; clicking one will
not carry you away from your edits.

## Prose and Markup

The bottom edge of the editor carries your writing setup. Two postures sit there, and the editor
remembers your pick. Prose, the everyday one, gives you a comfortable reading width and slightly
larger type, sized for paragraphs. Markup widens the page and tightens the type for the things
that need room: tables, layout blocks with long option lists, links with long addresses. Flip
between them any time; your text never changes, only the desk it sits on.

## Focus mode and typewriter scrolling

Two quiet helpers sit beside the postures on the editor's bottom edge, and the editor remembers
each choice the way it remembers your preview width.

Focus mode fades everything except the paragraph you are working on. The rest of the page stays
readable, just stepped back, and moving your cursor moves the spotlight with it. Flip it off the
same way you flipped it on and the whole page returns to full strength.

Typewriter scrolling keeps the line you are typing near the middle of the screen, the way a
typewriter holds the paper still and moves the carriage. Your eyes stay in one place while the
page scrolls underneath.

## Help and word count

The bottom edge of the editor shows a running word count, and the Markdown help link beside it
opens a one-screen cheat sheet of the formatting marks, handy when you would rather type `**bold**`
than reach for the mouse.

## Spell checking

The editor checks your spelling as you write, and a misspelled word picks up a quiet amber underline.
This is cairn's own checker, not your browser's, so it understands your page. It leaves your layout
blocks, links, code, and the settings at the top of the page alone, and only marks the words a reader
will actually see.

Click an underlined word and a small menu opens with the corrections. Pick one and it replaces the
word. The menu also offers two more choices:

- Add to dictionary, for a word that is spelled right but the checker does not know, such as a name
  or a place. The word stops being marked everywhere on the page, and cairn remembers it for next
  time. Your additions are shared with your fellow editors, so a name one person adds is known to all.
- Ignore, for a one-off you want left alone just for now. The word stops being marked until you reload
  the page, and nothing is remembered.

The same checker also catches a few slips that are not misspellings: a word typed twice in a row, a
double space inside a line, a stray run of punctuation. They underline the same way, and clicking
offers the fix.

A toggle on the bottom edge of the editor turns spell checking off if you would rather write without
it. The underlines vanish, and the editor remembers your choice for next time.

## Tidy

If your site has tidy turned on, a Tidy button sits in the editor and offers a light copy-edit of
your writing. It fixes the small things (a typo, a doubled word, a spacing slip) and applies any
writing conventions your site has set, such as the Oxford comma. It does not rewrite your sentences
or change your voice. If your site has not turned tidy on, the button is not there, and your developer
can enable it.

Run Tidy over the whole page, or select a passage first to tidy just that part. cairn reads your draft
and opens a review window showing every change it suggests: new words in green, removed words struck
through in red. Nothing changes in your page yet. The plain fixes come pre-checked. A judgment call
(a style change, a reworded phrase) is set aside for you to look at, with a short note saying why it
is suggested.

Go through the list with the keyboard (`j` and `k` to move, `a` and `r` to accept or reject the
current one) or with the buttons. Accept fixes takes all the plain fixes in one go and leaves the
judgment calls for you. When you are happy, Apply writes your accepted changes into the page as a
single step, so one Undo takes them all back if you change your mind. Cancel closes the window and
changes nothing.

Sometimes tidy comes back with nothing to fix, and it says so without opening the review. Now and
then it returns a result that changed more than the wording, and cairn discards it and tells you, so
your text is never quietly rewritten. A tidy never publishes on its own; it only proposes edits to
the page you are working on, and you still Save and Publish the usual way.

## Saving your work

The top bar always tells you where you stand. "Unsaved changes" appears the moment you edit
anything, and it settles to "Saved" once your work is stored. Press Save, or Ctrl+S, whenever you
like. If you try to leave the page with unsaved edits, the editor asks before letting you go.

Saving stores your work without changing the live site. Publishing is the separate, deliberate
step that puts it in front of visitors. [Publish and discard](./publish-and-discard.md) covers
that half of the flow.
