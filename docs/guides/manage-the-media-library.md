# Manage the media library

The Media Library is its own screen in the admin, beside Posts and Pages under Content. Open it and
you see every image your site has, whether it is live or still riding along with an unpublished
edit. The screen does one job: it manages your media. You find an image, check where it is used,
fix its name and its description, and delete one you no longer need. This page walks through it from
an editor's seat.

## Finding an image

The screen opens on a grid of thumbnails, your full set of images at a glance. The grid is the
fastest way to recognize a picture, because you see the picture itself rather than a filename. Click
a tile, or press Space or Enter while it is focused, to open its details on the right.

Search sits at the top of the toolbar. Type a word and the grid narrows to images whose name or alt
text matches, so a half-remembered description finds the file. The match runs over every image, not
just the ones currently on screen.

Beside search is a grid-or-list toggle. The grid is best for spotting an image by sight. Switch to
the list for scanning by name and date, or when you want to sort. The list shows each image as a row
with its name, when it was added, its alt-text status, and where it is used, and you can sort by the
Added column. Your pick of grid or list is remembered for next time.

## Where an image is used

Open any image and the details panel tells you where it appears. This is the part most tools cannot
do, and cairn gets it from the way your content is stored in git.

The where-used list groups its answer in two. "Published on the site" lists the live pages that show
the image. "In an unpublished edit" lists pages where someone has placed the image in a held edit
that has not been published yet, and it names the edit so you can tell whose draft it is. Each entry
is a link straight to that page's editor, so checking a use is one click away.

The wording is careful on purpose. cairn finds references by reading your content, and an image
dropped into a raw-HTML block is something it cannot see. So the panel says "found in N entries" or
"no references found", never a flat "unused". An image with no references found is almost certainly
safe to remove, and the next section is built around that "almost".

## Fixing the name and the description

The details panel lets you edit two things about an image: its display name (and the slug that rides
its web address) and its default alt text. Change either and press Save, and cairn commits the
update. Renaming is cheap and safe. The pages that already use the image keep working, because cairn
looks an image up by its content, not by its name.

The alt text here is the default for the next time you place the image, not a rewrite of pages that
already use it. Each placement carries its own alt text, the words you wrote when you dropped the
image into that particular page. The public site shows that per-placement alt. Editing the alt in
the Library sets the value that fills in the next time someone inserts this image, and it leaves
every existing placement exactly as its author wrote it. The field is labeled as the default so the
distinction stays clear.

## Deleting an image safely

Delete is in the details panel, and it has two faces depending on whether the image is in use.

When the image is in use, the dialog names the pages that would break if you deleted it, grouped the
same way the where-used list is, published pages first and then unpublished edits. Deleting one
anyway is possible, but you have to mean it: the dialog asks you to type the image's slug to confirm.
That gate is there so a destructive delete is never one stray click.

When the image has no references found, the dialog is a calm confirm. It notes that the delete is
recoverable, because your content lives in git and the image's record stays in your history. So even
a delete you regret can be undone from the repository.

cairn checks usage fresh at the moment you confirm, not from what the screen showed a minute ago. If
someone placed the image into a draft while you had the dialog open, the delete is refused and the
dialog flips to its in-use face with the new list. The check fails closed: if cairn cannot confirm
the image is safe to remove, it does not remove it.

## One step to make where-used accurate

Where-used reads your published content from a small index cairn keeps beside your content, the
content manifest. For an existing site, that index does not record media references until you
regenerate it once. Run `cairn-manifest` and commit the result, and the "Published on the site" half
of where-used becomes accurate for everything already live. New saves keep it current from there.
Until you regenerate, the published half may read empty even for images that are in use, so do this
once at upgrade. The unpublished-edit half works without it.

## Where this fits

The Library manages images that are already in your site. Adding one happens in the editor, covered
by [Add an image](./add-an-image.md). Saving and publishing an entry, image and all, is in
[Publish and discard](./publish-and-discard.md).
