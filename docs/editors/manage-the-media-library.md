# Manage the media library

Every image ever added to your site lives in one place: the media library. This is where
you work on those images directly, with no draft entry open.

## Finding what you need

The library shows a count of how many images you have, how many are actually used on the
site, and how much storage they take up. A search box filters by name or by alt text. A
grid view shows thumbnails; a list view shows more detail in rows. Switch between them
with the two buttons above the list.

Three filters narrow what you're looking at:

- **All**—everything.
- **Needs alt**—images with no alt text set yet.
- **No references found**—images the editor couldn't find in use anywhere on your site
  right now. This isn't a guarantee an image is truly unused, since a real use can be
  written in a way the editor can't see. Check before deleting one.

## Selecting an image

Select an image to open its details: a larger preview, its name, its address on your
site, and where it's used, if anywhere, each linking back to the entry it's in. Below
that, a **Default alt text** field lets you write or update the description used the
next time this image is placed somewhere new. Changing it here doesn't change the alt
text already set on pages that already use the image.

Selecting **Save** on this panel keeps your changes.

## Accepted image types

The library accepts JPEG, PNG, WebP, and GIF pictures directly. It also accepts HEIC, the
format many phone cameras use, and converts it for you automatically.

## Replacing an image

If you need to swap out an image's picture without touching every place that uses it, select
**Replace image** from its details. You'll choose a new file, and the editor shows you
what would change everywhere the image appears before it applies anything. If the new
picture would break how it displays somewhere, you'll see that up front rather than
after the fact.

## Pushing alt text everywhere it's missing

**Push alt to placements** takes the default alt text you've set for an image and writes
it into every place on your site where that image is used but has no alt text of its
own yet. It only fills gaps: a placement with its own alt text already set is left
alone unless you choose to overwrite it. You'll see exactly what would change before
anything is applied.

## Deleting an image

Select **Delete** from an image's details. If nothing on your site currently uses it,
you'll get a plain confirmation. If something does use it, deleting would break how that
appears, so you're shown exactly what would break and asked to type the image's address
to confirm you understand before it lets you continue. Deleting removes the picture
itself, not just its entry in the library. Nobody can put it back for you afterward, so
keep your own copy of anything you might want again.

## Finding orphaned files

Some sites accumulate stored files that never made it into the library, left behind by
an interrupted upload or other cleanup. A **Find orphaned files** control, near the
search box, scans for these. What it finds can then be deleted for good: you're asked to
type the number of files to confirm, and that deletion can't be undone by anyone. This is
a housekeeping tool for whoever manages your site's storage, not something you need for
everyday writing. If you're not sure whether to use it, ask your site owner or developer
first.

---

*Checked against the editor on 2026-08-14.*
