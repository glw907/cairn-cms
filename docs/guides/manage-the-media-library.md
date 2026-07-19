# Manage the media library

Every image on your site lives in one shared library, separate from any single post or page.
The Library screen sits in the admin sidebar beside Posts and Pages and manages your site's
images in one place. This guide covers finding an image, uploading one, seeing where it is
used, fixing its name and its description, replacing it everywhere at once, and safely
deleting it.

- [Finding an image](#finding-an-image)
- [Uploading an image](#uploading-an-image)
- [The asset panel](#the-asset-panel)
- [Where an image is used](#where-an-image-is-used)
- [Replacing an image everywhere](#replacing-an-image-everywhere)
- [Pushing alt text to every placement](#pushing-alt-text-to-every-placement)
- [Deleting one image](#deleting-one-image)
- [Deleting several at once](#deleting-several-at-once)
- [Finding orphaned files](#finding-orphaned-files)

## Finding an image

<!-- LIVE-UI: the Library grid with the search box, the triage filter, and the density toggle -->

The screen opens on a grid of thumbnails. It shows your whole library at once. Click a tile, or
focus it and press Enter, to open its details.

Search sits at the top of the toolbar and matches an image's name or its alt text, over your
whole library rather than only the tiles on screen. Beside it, a filter narrows the grid to
**All**, **Needs alt**, or **No references found**, each with a live count. Needs alt lists
every image still missing its description. No references found lists every image the site
cannot currently trace to a page; treat it as a starting point rather than proof the image is
safe to delete.

A density toggle switches between the grid and a list. The grid shows each image as a
thumbnail, best when you recognize an image by sight. The list gives a compact row of name, alt
status, usage, and date that sorts by date added, which suits scanning a long library.

## Uploading an image

<!-- LIVE-UI: the Upload button opening the capture card, and the page-wide drop target -->

Add an image to the library directly, without opening a post first. The Upload button in the
header does it, and so does dropping a file anywhere on the page. Either way opens a card that
asks for the image's name, prefilled from the filename, and its alt text. Neither the name nor
the alt is required to finish the upload; an image saved without alt lands with its description
still owed, and you can add it later from its panel.

Uploading the same file a second time does no harm. cairn recognizes the bytes it already has
and keeps the one copy, so nothing is duplicated.

A freshly uploaded image is not placed anywhere yet, so it reads "no references found" until
you use it in a post or page.

## The asset panel

Opening a tile slides a panel in from the side, holding everything about that one image: a
large preview, its name and its `media:` reference (with a button to copy it), its alt text,
where it is used, its dimensions and file size, and the actions below.

The name and the alt text are editable right there. The alt field is the image's *default*,
the description it carries into a placement the next time you insert it; changing it here
never rewrites the alt already saved on a page that already uses the image, so an established
caption is never silently overwritten. Save applies the change without requiring an alt text,
so you can fill in the name now and the description later.

## Where an image is used

The panel's "Where used" section lists every post and page that carries the image, published
entries first, then anything still sitting in an unpublished edit with its branch named beside
it. Each row links straight to that entry. An image with no rows reads "No references found.
Deleting this changes nothing readers see," so the effect of a deletion or replacement is
visible before you act.

cairn can list these placements because every reference to an image is a plain line of text in
the entry's own file, so it searches the content directly instead of estimating usage.

## Replacing an image everywhere

<!-- LIVE-UI: the Replace dialog's upload step and its impact review -->

Sometimes you need to swap the file itself while the placement stays right, for instance when a
better photo of the same subject or an updated logo comes along. Replace swaps the file while
keeping everything about how it's used. Open an image's panel and choose **Replace image**,
then upload the new file.

cairn identifies an image by its content, not its filename, so a replacement gets a new
identity of its own. The review step that follows lists every published entry that uses the
current image and explains what changes: the name stays the same, only the underlying file
does, so every one of those entries is repointed to the new file in one step, and readers see
the new image once the site rebuilds. An edit still sitting on its own branch is
left alone and keeps the old file until it publishes again; the review names any such branch
so nothing is a surprise later.

Because a replacement touches everything at once, the confirmation is deliberate: type the
image's address (shown in the dialog) to apply it. If cairn cannot read every place the image
might be used, for instance because one edit's branch will not load, the review refuses to
guess and holds the replacement rather than risk missing a reference. The file you already
uploaded stays ready, and a "Check usage again" button re-runs the check once the branch is
reachable.

## Pushing alt text to every placement

An image's default alt (see [The asset panel](#the-asset-panel)) only fills in the next time
you insert the image. If the image is already used in a dozen places from before it had a good
description, **Push alt to placements** applies the current default retroactively.

The review sorts every placement into three groups. An empty alt gets filled automatically.
Existing custom text is left alone by default, listed but unchanged, unless you check a box to
overwrite it, the one destructive choice in this flow, so it needs a deliberate opt-in. A
decorative image marked that way on purpose is only reported, never overwritten. As with
Replace, an unverifiable placement holds the whole push rather than risk missing one.

## Deleting one image

<!-- LIVE-UI: the safe-delete dialog's in-use face, naming the entries it would break -->

Every image's panel carries a Delete action, and what it asks of you depends on whether the
image is still in use. For an image with no references found, the dialog asks for a plain
confirmation. For an image still used somewhere, the dialog lists every entry that deleting it
would break, published entries and open edits alike, and keeps the delete button disabled until
you type the image's address (shown in the dialog).

Deleting an image never destroys its history. The row is removed from the library, but every
version stays in git, so a developer can bring it back later if it turns out you needed it.

## Deleting several at once

The grid and the list both support multi-select: Space toggles a focused tile, a row's checkbox
does the same in the list, Shift with an arrow key extends a range, and Ctrl (or Cmd on a Mac)
plus A selects everything currently visible. Selecting anything raises an action bar at the
bottom of the screen with a live count and a Delete button.

That confirmation is itself a preview: it splits your selection into what has no references
and will be deleted, and what is still used and will be held back. Nothing you can still see in
use is removed by a bulk delete; every image is checked again, individually, at the moment it
deletes, and anything found in use between your selection and that moment is skipped and named
in the summary rather than silently dropped. As with a single delete, everything removed stays
in git history.

## Finding orphaned files

<!-- LIVE-UI: the orphan-scan result, its purge-bytes section beside the broken-references readout -->

A rarer, more technical control lives beside the density toggle: **Find orphaned files**. Where
the rest of this screen manages the library's records, this scans the site's raw storage
directly, looking for stored files no library record points to any longer, and separately, for
records whose stored file has gone missing. Most days there is nothing to find here, and it is
worth reaching for only when a developer asks you to check, or storage costs draw your
attention to it.

An orphaned file the scan finds can be purged, permanently. Unlike every other delete on this
page, a purge has no git history to fall back on, because it acts on raw storage bytes rather
than a tracked record, so cairn asks you to type the exact number of files you are about to
purge before it proceeds. If the scan cannot confirm every branch's usage, it refuses to report
a list at all rather than risk purging something still in use.

---

Once an image is placed on a page, [Add an image](./add-an-image.md) covers inserting it into a
draft, and [Write in the editor](./write-in-the-editor.md#images-and-the-media-library) covers
how a figure and its caption sit in your markdown.
