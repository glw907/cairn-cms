# Welcome, editors

The tool you'll write in is called cairn. Nothing you do while drafting can break the live site, since your work stays private until you publish it, and every save is kept.

## Signing in

Signing in happens entirely by email. Enter your address at your site's `/admin` page, and a sign-in link arrives in your inbox; following it signs you in on that device. There is no password; access rides on your email address. If a link doesn't arrive within a minute or two, check spam, then confirm with your site's administrator that your address is on the editor list.

## Writing

You write in markdown, a convention for indicating structure in plain text that has become the standard for serious writing tools. It was designed in 2004 around one principle: a marked-up document should remain fully readable as ordinary text, because the marks mirror what they mean. Asterisks around a phrase emphasize it even before anything renders, a line beginning with `#` reads as the heading it is, and a bracketed phrase followed by an address is recognizably a link:

```
## A heading

Some words matter more than others, so you can make them **bold** or
give them *emphasis*. A blank line starts a new paragraph, and
[a link](https://example.com) is a bracketed phrase followed by its address.

- A list is lines that begin with a dash.
- Readers see them as proper bullets.

> A quotation is a line that begins with an angle bracket.
```

The toolbar enters the marks for you, the editor keeps a cheat-sheet for the rest, and a spellchecker runs as you type. The division of labor is deliberate: your marks say only what something is, a heading or an emphasis, and the site decides how everything looks, so every page you write stays consistent with the rest of the site.

The editor itself is built for sustained writing, and it borrows deliberately from the desktop writing apps. Its default posture sets prose in a comfortable reading measure with generous type, and a second posture, one click away, shows the same text denser and closer to the markup, which is the better view for reworking tables or long link lists. Focus mode dims every paragraph except the one you're writing in. Typewriter scrolling keeps your current line vertically centered, so your eyes stay in one place while the page moves. Zen mode clears everything else away. None of these change your text; they change how the room feels while you work, and you can ignore all of them and just type.

The preview beside your writing deserves a word of its own, because it makes a promise most writing tools can't. It doesn't approximate your site's look; it renders your draft through the site's own machinery, typography and all. What you see beside your draft is, to the pixel, what a reader will see on the published page. When you're deciding whether a heading breaks where it should or a quotation carries the weight you want, you're deciding against the real thing.

The convention is not peculiar to this tool. If you've written in iA Writer, Ulysses, or Bear, the marks will already look familiar, and if you haven't, you'll be learning the same convention those tools teach. Every version you save is kept, so earlier wording is never lost. Cairn is, at some level, trying to be that kind of tool for small teams publishing on the web.

The [writing guide](./write-in-the-editor.md) tours the whole surface: headings, links, images, the insert menu, spellcheck. The [images guide](./add-an-image.md) covers adding and describing pictures, and the [media library](./manage-the-media-library.md) is where all of a site's images live.

## Beyond plain text

Not everything on a page is plain text. A photo with a caption, a callout box, a pull quote, or a video arrives through the insert menu, which adds it to your draft as a small labeled block. In the plain text the block reads as what it is (a callout starts with `:::callout` and ends with `:::`), and in the preview it appears as the site's styled version. The set a site starts with covers callouts and alerts, figures with captions, pull quotes, collapsible question-and-answer blocks, video, and a time-limited announcement banner, and a site can add its own. The insert menu composes these: it asks for the block's particulars and writes the markup itself. A block can fold down to a single line from the marker in its margin, to keep a long draft readable, and a folded block unfolds itself the moment your typing or your cursor touches it, so you can never change text you can't see. Edit the words inside a block freely, and leave its marker lines as they are; if one is ever damaged, the insert menu can produce a fresh one.

## Images and the media library

Images arrive through the same insert flow as everything else. Choose a picture from your site's media library, or upload a new one on the spot, and the editor places it in your draft with a spot for a caption. Each image asks for a short written description as well; readers who use a screen reader hear that description in place of the picture, and writing a good one is part of the craft. The media library itself is shared across the site, so a photograph uploaded for one post is available to every other page, and replacing an image in the library updates it everywhere it appears.

## Tags

Posts carry tags, and the tags come from a single list the site maintains, rather than from whatever each writer types in the moment. When you tag a post, you pick from that list. The constraint is deliberate: one shared vocabulary means the site's archive pages, its topic feeds, and its navigation stay coherent as different people write over the years. If a tag you need is missing, the list can be extended in the admin; if an old post carries a tag that has since been retired, the editor flags it so you can decide what to do.

## Tidy, if your site has it

Some sites turn on tidy, an AI copy-editing tool built on Claude, Anthropic's language model. It reads your draft, or a passage you select, and proposes the kind of small fixes a copy editor would: spelling, punctuation, and the conventions that keep a site consistent when several people write for it. Cairn is a tool for humans writing prose, and tidy is scoped to match: it shows you each proposed fix, changes nothing until you accept it, and your text is never quietly rewritten. Run it over a full draft or a selected passage; sometimes it returns with nothing to fix, and says so. It is not meant to draft your prose, and it will not take your voice.

## Saving and publishing are separate steps

Save keeps your work private: a draft persists indefinitely, and readers never see it. You can save a half-formed thought on Tuesday and return to it in March; nothing expires, and nothing is published by accident. Publish is the deliberate step that puts words on the live site; until you take it, nothing changes for readers.

The entry list shows where everything stands. A published post reads as published; one with unpublished changes is marked Edited; a brand-new draft is marked New. The list is the honest inventory of the site's writing, including the half-finished pieces, which is worth more than it sounds when three people share the work. Publishing an entry also publishes exactly what its preview shows, and a draft you've thought better of can be discarded without a trace on the live site. The [publishing guide](./publish-and-discard.md) covers the details.

If someone else edited the same entry while you were writing, cairn refuses to save over their work. Neither of you can lose words to the other.

## When something looks wrong

Your site's administrator is the first call, and there is usually a support contact in the editor's help screen. Everything you publish is kept in the site's history, so the administrator can restore an earlier version if something goes wrong.
