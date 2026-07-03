# Welcome, editors

## What cairn is

Your organization's website runs on a system called cairn: open-source software built to make it easy for small teams to manage websites together. Cairn sites run on [Cloudflare](https://www.cloudflare.com/), the infrastructure company that carries roughly 20% of all internet traffic, with a core focus on security and uptime. And unlike many comparable systems, cairn is focused on providing the best possible writing experience for its editors.

Most of the system works out of sight. The part that concerns you is the one it was built around: a writing environment where the people of your organization draft, revise, and publish the site's pages themselves, with no technician in the loop for the everyday work of writing. A developer set the site up once and remains behind it; from that point on, the words belong to the writers.

Two facts about the arrangement are worth holding from the start. Nothing you do while drafting can break the live site, since your work stays private until you deliberately publish it. And every save is kept, so no version of your work is ever lost. The rest of this page fills in what sits between those two facts: how you sign in, how the writing works, and what happens when you publish.

## Two roles

Cairn has exactly two roles, and they are the entire permission model. Editors write, save, and publish. Owners do everything editors do and also manage the editor list itself: adding a new colleague, removing a departed one, granting ownership to another. There are no finer-grained permissions to learn or administer, no workflows to configure, and no approval queues; a site of this scale runs on trust, and cairn's design assumes it.

## Signing in

Signing in happens entirely by email. Enter your address at your site's `/admin` page, and a sign-in link arrives in your inbox; following it signs you in on that device. There is no password; access rides on your email address, which means there is nothing to forget, nothing to reuse across sites, and nothing for an attacker to steal from a leaked list. If a link doesn't arrive within a minute or two, check spam, then confirm with your site's administrator that your address is on the editor list.

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

The editor itself is built for sustained writing, and it borrows deliberately from the desktop writing apps. Its default posture sets prose in a comfortable reading measure with generous type, and a second posture, one click away, shows the same text denser and closer to the markup, which is the better view for reworking tables or long link lists. Focus mode dims every paragraph except the one you're writing in. Typewriter scrolling keeps your current line vertically centered, so your eyes stay in one place while the page moves. Zen mode clears everything else away. None of these change your text, and you can ignore every one of them and type.

The preview beside your writing doesn't approximate your site's look; it renders your draft through the site's own machinery, typography and all. When you're deciding whether a heading breaks where it should or a quotation carries the weight you want, you're deciding against the real thing.

The convention is not peculiar to this tool, and it has a longer history than its plain appearance suggests. Markdown was introduced in 2004 by John Gruber, working with Aaron Swartz, with the stated design goal that a formatted document remain "publishable as-is, as plain text" ([daringfireball.net](https://daringfireball.net/projects/markdown/)). The deeper idea predates the name by decades: document systems going back to the late seventies (Brian Reid's Scribe, Donald Knuth's TeX, the SGML standard) separated what a passage is from how it looks, and the scholarly case for that separation was put formally by Coombs, Renear, and DeRose in *Communications of the ACM* in 1987, who argued that descriptive markup lets authors "focus their attention on the content." Markdown is the everyday descendant of that tradition, light enough to learn in an afternoon.

Its popularity among writers, rather than programmers, has its own logic. Formatting through menus interrupts composition: hands leave the keys, attention leaves the sentence, and both have to find their way back. Markdown keeps both where they were, which is much of why the minimalist writing apps of the last fifteen years (iA Writer arrived in 2010) could exist at all: the convention did the structural work, so the app could shrink to a page and a cursor. The same marks now work in far more places than dedicated writing tools, since note-taking systems, message boards, and chat apps adopted the convention as it spread. And a markdown draft written today will open, unchanged, in whatever tool exists in twenty years, which is not something computing can promise about much else.

If you've written in [iA Writer](https://ia.net/writer), [Ulysses](https://ulysses.app/), or [Bear](https://bear.app/), the marks will already look familiar, and if you haven't, you'll be learning the same convention those tools teach. Cairn is, at some level, trying to be that kind of tool for small teams publishing on the web.

The [writing guide](./write-in-the-editor.md) tours the whole surface: headings, links, images, the insert menu, spellcheck. The [images guide](./add-an-image.md) covers adding and describing pictures, and the [media library](./manage-the-media-library.md) is where all of a site's images live.

## Beyond plain text

Not everything on a page is plain text. A photo with a caption, a callout box, a pull quote, or a video arrives through the insert menu, which adds it to your draft as a small labeled block. In the plain text the block reads as what it is (a callout starts with `:::callout` and ends with `:::`), and in the preview it appears as the site's styled version. The set a site starts with covers callouts and alerts, figures with captions, pull quotes, collapsible question-and-answer blocks, video, and a time-limited announcement banner, and a site can add its own. The insert menu composes these: it asks for the block's particulars and writes the markup itself. A finished callout, for example, looks like this in your draft:

```
:::callout[Bring a life jacket]{tone="tip"}
The club has loaners at the boathouse, but the ones that fit
best are the ones you own.
:::
```

Readers see a styled box with that title and that advice, in whatever visual form the site's design gives callouts. The `tone` controls the flavor (a note, a tip, a warning), and everything between the markers is ordinary markdown. A block can fold down to a single line from the marker in its margin, to keep a long draft readable, and a folded block unfolds itself the moment your typing or your cursor touches it, so you can never change text you can't see. Edit the words inside a block freely, and leave its marker lines as they are; if one is ever damaged, the insert menu can produce a fresh one.

## Images and the media library

Images arrive through the same insert flow as everything else. Choose a picture from your site's media library, or upload a new one on the spot, and the editor places it in your draft with a spot for a caption. Each image asks for a short written description as well; readers who use a screen reader hear that description in place of the picture, and writing a good one is part of the craft. The test is whether the description carries what the picture contributes in context: for a racing story, "two dinghies rounding the windward mark in light air" serves the reader; "sailboats on a lake" does not. The media library itself is shared across the site, so a photograph uploaded for one post is available to every other page, and replacing an image in the library updates it everywhere it appears.

## Tags

Posts carry tags, and the tags come from a single list the site maintains, rather than from whatever each writer types in the moment. When you tag a post, you pick from that list. The constraint is deliberate: one shared vocabulary means the site's archive pages, its topic feeds, and its navigation stay coherent as different people write over the years. A club site might hold its list to a dozen entries (Racing, Education, Events, Club News, and so on), and the discipline of choosing from twelve beats the entropy of everyone inventing near-duplicates: Race, Races, racing-2026. If a tag you need is missing, the list can be extended in the admin; if an old post carries a tag that has since been retired, the editor flags it so you can decide what to do.

## Tidy, if your site has it

Some sites turn on tidy, an AI copy-editing tool built on [Claude](https://www.anthropic.com/claude), Anthropic's language model. It reads your draft, or a passage you select, and proposes the kind of small fixes a professional copy editor would mark: a misspelling, a doubled word, a comma that splices two sentences, a subject and verb that lost agreement mid-revision, and the small conventions that keep a site consistent when several people write for it (one spelling of email, one style of dash, one way of writing dates).

Its remit stops where your choices begin. Word choice, sentence rhythm, structure, argument, and tone are yours; a stylistic decision is not an error, and tidy is instructed to leave it alone. Cairn is a tool for humans writing prose, and tidy is scoped to match. Mechanically, it is conservative in the same spirit: it shows you each proposed fix beside your original, changes nothing until you accept it, an accepted round can be undone in one step, and your text is never quietly rewritten. Sometimes it returns with nothing to fix, and says so. It is not meant to draft your prose, and it will not take your voice.

## Saving and publishing are separate steps

Save keeps your work private: a draft persists indefinitely, and readers never see it. You can save a half-formed thought on Tuesday and return to it in March; nothing expires, and nothing is published by accident. Publish is the deliberate step that puts words on the live site; until you take it, nothing changes for readers, and shortly after you take it, the live site carries the new page.

The entry list shows where everything stands. A published post reads as published; one with unpublished changes is marked Edited; a brand-new draft is marked New. The list is the honest inventory of the site's writing, including the half-finished pieces, which is worth more than it sounds when three people share the work. Publishing an entry also publishes exactly what its preview shows, and a draft you've thought better of can be discarded without a trace on the live site. The [publishing guide](./publish-and-discard.md) covers the details.

If someone else edited the same entry while you were writing, cairn refuses to save over their work. Neither of you can lose words to the other.

## When something looks wrong

Your site's administrator is the first call, and there is usually a support contact in the editor's help screen. Everything you publish is kept in the site's history, so the administrator can restore an earlier version if something goes wrong.
