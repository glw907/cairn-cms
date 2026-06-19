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

## Replacing an image

Sometimes the picture is right but the file is wrong: a typo in a chart, a crop that needs redoing, a
photo you re-exported at a better quality. Replace swaps the file behind an image without you having
to revisit every page that uses it. Open the image, choose Replace, and upload the corrected version.

The review tells you the scope before anything changes. It counts how many published entries use the
image and names them, the same grouping the where-used list uses. The name stays the same and only
the file behind it changes, so every page that already shows the image picks up the new version. cairn
asks you to type the image's slug to confirm, because a replace rewrites your published pages in one
commit and could break a draft that was mid-edit.

Two things stay where they were. An edit held on its own branch keeps the old file until that edit is
republished, so a draft you have not published yet is never rewritten under you. And the old file is
not erased: it stays in your git history, so a replace you regret can be undone from the repository.
The review names any open edits that are still on the old file, so you know what to expect when they
publish.

## Filling in missing alt text

Alt text describes a picture for a reader who cannot see it, and it is easy to drop an image into a
page without writing any. Push alt fills those gaps from one place. The image's default alt, the
description you set in the Library, copies into every placement that has none. Open the image and
choose Push alt to start it.

By default it only fills the blanks and leaves any alt an author already wrote alone, because that
text is their words for that page. An opt-in lets you overwrite the placements that already have their
own alt too. It is off by default, since turning it on replaces what an author wrote, so reach for it
only when you mean to standardize on the Library's description.

A hero image marked decorative is skipped, because its empty alt is a deliberate choice rather than a
gap. The fill lands as one commit across every page it touches, and git keeps every version, so this
too can be walked back from history.

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

## Deleting several images at once

When you want to clear out a batch, you do not have to open each image and delete it one by one.
Select the ones you mean, in the grid or the list, and a bar appears along the bottom with the count
and a Delete button. Tick a tile or a row to add it, tick again to drop it, and the bar keeps a
running total of what you have picked.

Bulk delete runs the same safe check on every image you selected, all at once. cairn looks up where
each one is used, deletes the ones nothing points at, and leaves the rest alone. An image still in
use is skipped, not deleted, and the result tells you which ones it skipped and why. So you can
select a whole page of thumbnails without worrying that an in-use image slips through. The dialog is
a plain confirm with the count, no slug to type, because nothing in use can be removed this way.

A whole batch is one commit, the same as a single safe delete, so it is recoverable. The images'
records stay in your git history, and a delete you regret can be undone from the repository. If cairn
cannot work out usage for the batch (a branch it cannot read, say), it refuses the whole thing and
removes nothing, rather than guess.

## Cleaning up orphaned files

Over time a site collects stored files that nothing uses any more: an image you uploaded and never
placed, or one left behind when its only page changed. Find orphaned files, a control on the
toolbar, hunts these down. It compares what is stored against what your content actually references,
across the live site and every open edit, and reports back in two sections.

One section is "Orphaned files". These are stored files with no record in the library and no
reference anywhere in your content, on the live site or in any open edit. A file someone uploaded on
a branch but has not placed yet is left out of this list, because that branch still points at it. So
the files here really are unused bytes taking up room. You can purge them.

Purging these is the one media action you cannot undo. Everything else in the Library lives in git,
so a delete can be walked back from history. Raw files have no git record, so once purged they are
gone for good. Because of that, the purge asks you to type the number of files you are about to
remove, as a deliberate stop before an action with no undo. At the moment you confirm, cairn checks
again and re-derives the list fresh, so a file that gained a use since you ran the scan is dropped
from the purge and kept. It removes only files that are still orphaned right then.

The second section is "Broken references". These are the reverse case: a record in the library whose
stored file is missing. It is a read-only health readout, with no delete button, because there is
nothing to remove. A broken reference means a page is pointing at a file that is not there, so the
fix is to re-upload the file or remove the reference from the page. cairn shows you the list so you
know where to look.

If a scan cannot read one of your edit branches, it stops before reporting anything and offers you
Check again, rather than show a half-answer that might call an in-use file orphaned. A clean scan is
one cairn could run all the way through.

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
