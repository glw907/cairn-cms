# Add an image

[Write in the editor](./write-in-the-editor.md#images-and-the-media-library) introduces images and
the media library: one shared library, a picture reused across every page it appears on, and a short
description every image needs. It walks the mechanics of bringing a picture into a draft, describing
it, giving it a caption and placement, and setting an entry's hero image.

## Insert a picture

Click the toolbar's Insert image button and a popover opens with the library search below an upload
button. You can also paste a picture from the clipboard or drag one from the desktop; the popover then
opens straight to naming and describing it.

<!-- LIVE-UI: the insert popover, open in its chooser state -->

## Choose from the library, or upload

The popover's chooser leads with an Upload an image button and, below it, a search box over the
library. Type into the search and it filters by name and by alt text as you go. If your library holds
more than one kind of file, the picker adds a filter chip for each kind, Images, Documents, and so on,
alongside the search box. Pick a result and it drops into your draft at the cursor, carrying whatever
alt text you gave that picture the first time you described it.

Choosing Upload an image, or a file a paste or drag already handed over, opens a small form: a name
for the picture. The name is pre-filled from the filename when the filename reads as words:
`blue-shoes.png` becomes "blue-shoes," tagged Suggested. A camera's `IMG_4821.jpg` gets no guess, and
the field stays blank. Alongside the name sits the alt text choice, covered under [Write the alt
text](#write-the-alt-text), below.

cairn accepts JPEG, PNG, WebP, and GIF pictures, and it converts an iPhone's HEIC photo to a standard
format for you before it uploads. An animated GIF keeps its animation. Submitting the form places a
placeholder at your cursor at once, so you see the picture while it uploads, and swaps in the finished
reference the moment the upload completes. If the exact same bytes are already in the library under any
name, cairn reuses that entry instead of storing a duplicate, and says so briefly. A failed upload
leaves your draft exactly as it was, with a plain reason and a Retry button. If your session has
expired, it tells you and asks you to sign in again.

## Add a caption

A freshly inserted picture is a bare reference. It has no caption and no set placement, and it sizes to
the width of your text. To add either, put your cursor on the picture and click the Figure control in the
toolbar, next to Insert image. It stays dim until the cursor is actually on a picture, and its label
changes to say which case you're in: "Wrap the image at the cursor in a figure" for a bare one, "Edit
the figure at the cursor" once it already has one.

<!-- LIVE-UI: the figure dialog, caption field and placement control both visible -->

The dialog that opens asks for a caption and a placement. The caption is the line shown under the
picture for every reader, distinct from the alt text beneath it. Placement is one of four choices.
Measure keeps the picture at the width of your text. It's the default, and the right choice most of
the time. Center does the same, but centers a picture narrower than that width rather than
stretching it. Wide and Full let the picture spread beyond the column, wider, and then edge to
edge. How far depends on your site's own design.

Submitting wraps the picture in a figure, and the toolbar control becomes "Edit the figure at the
cursor" from then on: reopen it any time to change the caption or the placement, or to Unwrap it back to
a bare picture with the caption dropped. Your draft holds a figure as its own small block:

```md
:::figure{.wide}
![Two dinghies rounding the windward mark in light air](media:regatta.a1b2c3d4e5f60718)

The fleet at the first mark, Saturday's race.
:::
```

a frame around the picture and its caption, the same shape [other
components](./write-in-the-editor.md#how-a-block-works) use. You'll rarely need to edit it directly.
The Figure control writes and rewrites it for you.

The same dialog also shows the picture's alt status, either Described or Needs alt. If you've marked a
picture
decorative and still give it a caption, cairn flags the combination: a screen reader skips a decorative
picture, but it still reads the caption, so the two send readers different signals.

## Write the alt text

[Write in the editor](./write-in-the-editor.md#images-and-the-media-library) already covers why alt
text matters: a reader using a screen reader hears it in place of the picture, so it should carry what
the picture contributes in context.

Alt text is one of two choices you make the moment you name a picture, whether you're uploading it
fresh or setting the hero image below: write a description, or mark the picture decorative. Decorative
is the right call for a picture that carries no information of its own, a divider or a plain texture.
cairn records that choice and never flags that picture again. Leaving alt text unset without choosing
decorative is different: cairn keeps that picture on its checklist until you describe it.

A checklist at the top of the editor names every picture still missing a description, hero image
included, and shrinks as you fill each one in. For a picture in your draft, its row's Add alt text
action selects the picture's whole reference in the text, ready to retype with a description added:

```md
![](media:regatta.a1b2c3d4e5f60718)
```

becomes

```md
![Two dinghies rounding the windward mark in light air](media:regatta.a1b2c3d4e5f60718)
```

Keep the `media:` part exactly as it was, and put your words between the square brackets. For the hero
image, Add alt text opens the hero's own dialog instead, with the description field already focused and
ready to type.

Marking the hero image decorative sticks: cairn remembers the choice, and a decorative hero never comes
back onto the checklist. Marking a picture in the body of your draft
decorative doesn't persist the same way, because the plain `![]()` markdown has no place to record it.
Reload the entry later, and that picture reads as needing alt text again, even though you decided
otherwise. Leaving it that way is safe. The checklist reads a blank reference as an open item; it has no way to
see that you meant the picture to be decorative.

The description you give a picture the first time it's uploaded also becomes its entry in the library,
so picking that same picture again later, from the library rather than uploading it fresh, carries the
same alt text forward. Editing that stored description, or seeing everywhere else a picture is already
used, is the [media library](./manage-the-media-library.md)'s job, not this one.

## Set the hero image

Every post or page can carry one hero image, the picture that leads it and stands in as the card a
social network shows when someone shares the entry. [Write in the
editor](./write-in-the-editor.md#the-details-panel) lists it among the details panel's fields.

Open the [details panel](./write-in-the-editor.md#the-details-panel) (`Ctrl .`) and find Hero image.
Empty, it's a slim drop zone: drop a picture onto it, or click it to open the same chooser the insert
popover uses, and either upload a picture or pick one from the library. Once you set a hero, the row
shows its thumbnail, its name, and its alt status at a glance, with an Edit control beside it (or
Add, when the hero still needs alt text).

<!-- LIVE-UI: the hero image field, both its empty and its set states -->

Editing opens a dialog with a 16:9 preview, so you see the picture the way it actually appears, both as
the entry's lead and as its social card. Below the preview sits the same describe-or-decorative choice
as any other picture. A caption field sits beside it, shown under the hero only if your site's design
places it there. Replace and Remove change the picture itself.
