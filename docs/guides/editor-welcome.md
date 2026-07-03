# Welcome, editors

The tool you'll write in is called cairn. Your words are saved as ordinary files that belong to your organization, not to cairn and not to any company, and nothing you do while drafting can break the live site, since your work stays private until you publish it.

## Signing in

Go to your site's `/admin` page and type your email address. A sign-in link arrives in your inbox, and clicking it signs you in on this device. There is no password to forget. If the link doesn't arrive within a minute or two, check spam, then ask the person who runs your site to confirm your address is on the editor list.

## Writing

You write in plain text and add formatting with a few punctuation marks. This way of writing is called markdown, and a little of it goes a long way:

```
## A heading

Some words matter more than others, so you can make them **bold** or
give them *emphasis*. A blank line starts a new paragraph, and
[a link](https://example.com) is a bracketed phrase followed by its address.
```

The marks were chosen to look like what they mean, the toolbar types them for you, and there's a cheat-sheet in the editor for the rest. The editor also has a Zen mode that hides everything except your words. It might look unusual at first, but the preview beside your writing shows your words exactly as readers see them, in the site's real styling. The site decides how everything looks, so your marks only ever say what something is, a heading or an emphasis, and every page you write stays consistent with the rest of the site.

Markdown is also not a quirk of this tool. The writing apps many authors swear by (iA Writer, Ulysses, Bear) store their documents this way, documentation teams at large software companies write in it, and researchers who need work to stay readable for decades choose plain text deliberately, because it survives every change of tool and never locks words inside an app. Your site keeps your writing in the same durable form, and cairn is, at some level, trying to be that kind of tool for small teams publishing on the web.

The [writing guide](./write-in-the-editor.md) tours the whole surface: headings, links, images, the insert menu, spellcheck. The [images guide](./add-an-image.md) covers adding and describing pictures, and the [media library](./manage-the-media-library.md) is where all of a site's images live.

## Pictures, callouts, and other pieces

Not everything on a page is plain text. A photo with a caption, a callout box, a pull quote, or a video arrives through the insert menu, which adds it to your draft as a small labeled block. In the plain text the block reads as what it is (a callout starts with `:::callout` and ends with `:::`), and in the preview it appears as the site's styled version. You never have to build these by hand; the insert menu asks a couple of questions and writes the block for you. A block can fold down to a single line from the marker in its margin, to keep a long draft readable, and a folded block unfolds itself the moment your typing or your cursor touches it, so you can never change text you can't see. Edit the words inside a block freely, and leave its marker lines as they are; if one ever gets tangled, the insert menu can build a fresh one.

## Tidy, if your site has it

Some sites turn on tidy, a button that offers a light copy-edit of your draft: spelling, punctuation, and the small conventions that keep a site consistent when several people write for it. Cairn is a tool for humans writing prose, and tidy is scoped to match. It proposes small fixes, shows you each one, and changes nothing until you accept it, so your text is never quietly rewritten. It is not meant to draft your prose, and it will not take your voice.

## Saving and publishing are separate steps

Save keeps your work privately. A saved draft waits for you, and readers never see it. Publish is the step that puts your words on the live site, and until you press it, nothing changes for readers. The [publishing guide](./publish-and-discard.md) covers the details, including how to discard a draft.

If someone else edited the same entry while you were writing, cairn refuses to save over their work. Neither of you can lose words to the other.

## When something looks wrong

Ask the person who runs your site. There is usually a support contact in the editor's help screen. Everything you publish is kept in the site's history, so the person who runs your site can restore an earlier version if something goes wrong.
