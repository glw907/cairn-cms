# Write in the editor

Everything about writing and formatting a draft: opening an entry, the toolbar, links,
layout blocks, and the keyboard shortcuts. For images, see
[Add an image](./add-an-image.md). For what save and publish mean, see
[Publish and history](./publish-and-history.md).

## Opening or starting a draft

Sign in and you'll land on a sidebar naming each kind of thing you write, such as
**Posts** or **Pages**. Select one to see a list of everything that already exists,
each row showing its current status. Select any row to open that entry and start
writing.

To start something new, select **New post** (or whatever your site calls it) near the
top of the list. You're asked for a title, an address, and sometimes a date, then you
land straight in the editor with that entry open.

That address becomes part of where the entry lives once it's published. Leave it blank
and it fills in from your title as you type it, all lowercase with hyphens in place of
spaces and punctuation: `Spring cleanup day` becomes `spring-cleanup-day`. Type your own
instead if you'd rather choose it yourself, and you can still change it later from
Details.

## The screen

When you open an entry, its title sits in a large field at the top, and the writing
surface fills the rest of the screen. A toolbar sits above the text with two tabs:
**Write**, where you type, and **Preview**, which shows the entry roughly as it will
look on your site. Every entry opens on Write.

The text you type is plain text with some light formatting marks mixed in, sometimes
called markdown. The Write tab shows those marks as you type them; the toolbar buttons
below insert the right marks for you, so you rarely need to type them by hand. Paste
from a word processor or a web page, and your headings, bold, italic, links, and lists
come across already marked; anything else, such as a table or an image, arrives as plain
text for you to mark up yourself.

Preview carries a width control, so you can check how an entry looks as a phone or a
tablet shows it without needing one. Your choice is remembered on this device.

The rest of the entry's settings live behind a **Details** panel, opened from the icon
in the header. It holds things like whether it's hidden, what address it has, its tags,
its date, and its lead picture. Everyday writing happens in the main text; Details holds
what you set up once and don't touch again every time you write.

## The toolbar

The toolbar is grouped by what each button does.

**Format** turns selected text into:

| Button | Shortcut |
| --- | --- |
| Bold | Ctrl+B |
| Italic | Ctrl+I |
| Strikethrough | — |
| Inline code | Ctrl+E |

**Structure** turns a line, or the whole selection, into:

| Button | Shortcut |
| --- | --- |
| Heading | Ctrl+Alt+2 |
| Smaller heading | Ctrl+Alt+3 |
| Bulleted list | Ctrl+Shift+8 |
| Numbered list | Ctrl+Shift+7 |
| Quote | Ctrl+Shift+9 |
| Table | — |

A **More formatting** button next to Structure holds three less common tools: Code
block, Horizontal rule, and Task list.

**Insert** holds the tools covered below: a web link, a link to one of your own pages, an
image, and, on some sites, a fragment or a set of ready-made blocks.

## Links

Two different tools handle links, because they do different jobs.

**Web link** (Ctrl+K) links out to an ordinary web address. Select some text first if you
want that text to become the link; otherwise, type the address and the words for the
link separately in the dialog that opens.

**Link to page** searches your own site's entries and inserts a link to whichever one you
pick. Use this whenever you're linking to something else on your own site rather than an
outside page. The editor keeps a link made this way pointing at the right place even if
that page's address changes later, which a plain web link to the same page wouldn't do.
If you look at the underlying text of a link made this way, it starts with `cairn:`
rather than an ordinary web address. That's normal. Leave it as is; the editor turns it
into a real address when your site is published.

## Images

The **Insert image** button, and dragging or pasting a picture straight into the text,
both start the same flow. See [Add an image](./add-an-image.md) for the upload panel
itself. An entry can also carry its own lead picture, set from Details rather than the
text; see
[Setting an entry's lead picture](./add-an-image.md#setting-an-entrys-lead-picture).

Write alt text for what the picture contributes where it sits, not a full description of
everything in it. Mark an image decorative when it carries no information of its own,
such as a plain divider or background texture. An image left with neither stays flagged
as needing alt text until you describe it or mark it decorative.

If you mark a picture in your text decorative, then close the entry and reopen it, it
reads as needing alt text again. Nothing is wrong; there's simply nowhere in the text
itself to remember that choice. Leave it; marking it decorative still works when you
publish, it just doesn't stay checked the next time you look.

Once an image is in your draft, you can give it a caption and choose how it sits on the
page. Put your cursor on the image, then select the toolbar button whose tooltip reads
**Wrap the image at the cursor in a figure**. It stays dim until your cursor is on an
image, and once the image has a caption the same button reads **Edit the figure at the
cursor**. You'll get:

- A **caption**, the line of text shown under the image for everyone reading the page.
  This is different from alt text: a caption is always visible, and alt text is only read
  aloud by a screen reader or shown when the image itself can't load.
- A **placement**: Measure keeps the image at the same width as your text, Center suits an
  image narrower than the text column, and Wide or Full let it spread further across the
  page.

If an image is marked decorative and you also give it a caption, the editor tells you:
a decorative image is skipped by screen readers, so a caption on it would go unheard by
exactly the readers a caption is supposed to help. Describe the image instead, or drop
the caption.

## Fragments

If your site has a Fragments screen, you can reuse one piece of writing across several
entries: a notice, a standard paragraph, anything you don't want to retype and keep in
sync by hand. Write it once as a fragment, publish it, then use **Include a fragment**
from the toolbar wherever you want it to appear. The included text always reflects the
fragment's current published version, so updating the fragment once updates every entry
that includes it.

What lands in your text is a short line starting with `::include`. That's normal. Leave
it as is; the editor shows the fragment's real text in Preview and on your published
site.

If nothing has been published on the Fragments screen yet, the picker tells you so.

## Layout blocks

Some sites use fenced blocks of text, marked with lines of three colons (`:::`), to lay
out a section of the page, such as a callout or a set of steps. Your developer or
designer sets these up. You can freely edit the text inside a block; leave the `:::`
lines themselves alone, since they're what tells the editor where the block starts and
ends.

If your site offers a palette of these, the **Insert block** button opens it and walks
you through filling one in with a short form rather than typing the marks yourself.
Placing your cursor inside a block you already inserted and selecting the pencil icon
next to it reopens that same form so you can adjust it. If the pencil is grayed out, that
block can't be edited as a form; edit its text directly instead.

Every block starts out collapsed to a single line, so a block-heavy entry reads as
writing first when you open it. Select the control in the margin, or just put your cursor
inside a block, and it opens. You're never editing text you can't see.

## Markdown help and keyboard shortcuts

Two reference sheets live in the editor itself, and neither is anything you need to
remember:

- The **markdown help** sheet (the "?" button) is a one-screen table pairing each mark
  you might type with what it makes, from a heading to bold text to a list.
- The **keyboard shortcuts** sheet (Ctrl+/) lists every chord the editor recognizes, from
  Save and Publish to formatting and moving between spelling suggestions.

Typing the marks always works; the toolbar buttons and shortcuts are conveniences, never
requirements.

## Reading and writing comfortably

A few controls, in the editor's footer, change how the writing surface looks without
changing what you've written:

- **Focus mode** dims every paragraph except the one your cursor is in.
- **Typewriter** keeps your cursor near the middle of the screen as you type, instead of
  letting your text scroll up under it.
- **Zen** clears away the toolbar and every button, leaving just your writing. Press
  Escape, or the same shortcut, to bring the toolbar and buttons back.
- The **Prose / Wide** toggle switches between a comfortable reading width, sized for
  writing, and a wider view better suited to tables and long web addresses.

On a narrow screen, such as a phone, there's no footer strip. The same controls live
behind the toolbar's **More formatting** button.

These are personal preferences saved to your browser, not to the entry, so they carry
over between entries but don't affect anyone else.

## Spelling and style

The editor underlines words it doesn't recognize as you type. Select an underlined word
for suggestions, including an option to add it to your site's shared dictionary if it's a
word your site uses often (a place name, a product name) that shouldn't keep getting
flagged. You can turn this checking off from the editor's footer, or, on a narrow
screen, from the toolbar's **More formatting** button, if you'd rather write
without it.

The same underline also catches a doubled word ("the the"), a double space, and repeated
punctuation, each with a one-select fix. It never comments on your phrasing or style,
only on these mechanical slips.

If your site has an AI copy-edit tool turned on, a **Tidy** button appears in the
toolbar. It reads your draft, or just the text you've selected, and proposes a set of
small corrections: spelling, grammar, and light wording fixes. Nothing changes until you
review them. Each proposed change shows what it would remove and what it would add in
place, and some are marked **Review this** because they're a judgment call rather than an
objective fix. Accept or reject each one, or use **Accept fixes** to take every
straightforward correction at once. It leaves anything marked **Review this** alone, so a
judgment call is never applied without your say-so. **Reject all** clears everything.
Then select **Apply**. Tidy only changes what's in the editor: your
next save keeps it like any other edit, and one Undo takes the whole tidy back if you
change your mind right after applying it.

You can't type in the draft while a Tidy review is open, the same as on the Preview tab.
That's the editor protecting the review in progress, not a fault. Finish the review, or
select **Reject all**, and typing comes back. A very long draft can also outgrow what
Tidy takes in one pass; see [When something goes wrong](./when-something-goes-wrong.md)
for what that message means and how to work around it.

## Saving and publishing

Saving and publishing are covered fully in
[Publish and history](./publish-and-history.md). In short: **Save** keeps your changes
private while you keep working, and **Publish** makes them live on your site.

---

*Checked against the editor on 2026-08-14.*
