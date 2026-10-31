# Manage the media library

The media library holds every image on your site. This page covers browsing the library, adding images, editing an image's name and default alt text, replacing an image everywhere it appears, and deleting images. It also gives the file types and size limit for uploads.

You need to be signed in to the admin. You don't need a draft open, because everything here happens on the library screen. To put an image into the draft you're writing, see [Add an image](add-an-image.md). If a message on this screen confuses you, see [When something goes wrong](when-something-goes-wrong.md).

## Open the library

Select **Library** in the sidebar. Your site can use a different label for it. The screen is titled **Media library**.

```repro
story: media/library
alt: Reproduction of the Media library screen in grid view, with an image count, a search box, view buttons, and three filters.
caption: Each tile shows the image, its name, a Described or Needs alt label, and either a used count or a Not referenced flag. The grid shows a limited number of images at a time, with a count of how many are showing and a Load more button.
```

1. The line under the title gives the number of images in the library, how many of them the site uses, and how much storage they take. Searching and filtering don't change these totals.
1. The search box finds images by name and by alt text.
1. The two icon buttons, **Grid view** and **List view**, switch the layout. List view adds columns for alt text status and use, a column you can sort by date added, and a delete button on each row.
1. The filter has three choices, each with a count: **All**, **Needs alt**, and **No references found**.

**Needs alt** shows the images that have no default alt text. **No references found** shows the images that no page and no unpublished edit points to.

That second filter needs care. The library finds an image only where a page's text or fields point to it. An image placed another way, such as one written directly into your site's code, doesn't count. When you choose **No references found**, the library reminds you of this. No references found isn't a guarantee that an image is unused, so check anything you're unsure about before you delete it.

## Add an image to the library

1. Select **Upload**. In an empty library, the screen also offers **Upload an image**. You can also drop a file anywhere on the page.
1. Choose the file. The **Upload an image** window opens with a preview.
1. In the **Name** field, type a name you'd recognize later.
1. Under **Alt text**, select **Write a description** and type a short description, or select **Mark as decorative**. You can add the description later.
1. Select **Upload image**.

The library shows **Asset uploaded.** when the upload finishes. [Add an image](add-an-image.md) explains how to choose between a description and decorative.

## Accepted image types

The admin accepts JPEG, PNG, WebP, and GIF files. An animated GIF stays animated. It also accepts HEIC photos, the format many phones use. The admin converts a HEIC photo to WebP in your browser before it uploads, so you don't convert it yourself.

The admin doesn't accept SVG files. Your site also sets a size limit for each file. Unless your developer changed it, the limit is 25 MB.

When the admin refuses a file, it shows one of these messages:

<!-- vale Microsoft.Contractions = NO -->
<!-- The bolded messages are quoted exactly as the product shows them, so a contraction rule cannot rewrite them. -->
- **"This image format is not supported. Try a JPEG, PNG, WebP, or GIF."**
- **"This image could not be converted. Try exporting it as a JPEG first."**
- **"This image is too large to add, even after shrinking it."**
- **"The upload could not reach the server. Check your connection and try again."**
<!-- vale Microsoft.Contractions = YES -->

## See an image's details

Select a tile in grid view, or a row in list view. The details panel opens beside the library. It stays open while you keep browsing. Select **Close details** or press Escape to close it.

```repro
story: media/details-panel
alt: Reproduction of the details panel for one image, with a preview, Name and Address fields, default alt text, and a Where used list.
caption: The default alt text note says the default applies the next time the image is placed and doesn't change alt text on pages that already use the image. Where used lists published pages and unpublished edits in separate groups, and each title opens that entry in the editor.
```

The panel holds the following:

- A preview of the image and its name.
- The **Name** field and the **Address** field. The address is the short name in the image's web address, in lowercase letters, numbers, and hyphens.
- **Default alt text**, with the choices **Describe it** and **Decorative**.
- **Where used**, which lists the entries that use the image.
- **Details**, which gives the dimensions, size, type, and date added.
- **Replace image**, **Push alt to placements**, and **Delete**.

To change the name, address, or default alt text, edit the field and select **Save**. **Changes saved.** confirms it.

The default alt text applies the next time someone places the image. Changing it doesn't change alt text already set on pages that use the image. To fill in the default on published pages where the image has no alt text, select **Push alt to placements**. The window it opens lets you choose whether to overwrite alt text that pages already have.

## Replace an image

Replace an image when you have a better version of the same picture. Every published page that uses the image then shows the new file, and the image keeps its name.

1. Select the image to open its details panel.
1. Select **Replace image**.
1. Select **Choose a file**, or drop the new image into the window.
1. Read the review screen. Its title says how many published entries change, and the list names them.
1. Type the image's address in the box. The label shows the address to type.
1. Select **Replace in** followed by the number of entries, such as **Replace in 3 entries**.

You always type the address, even when only one page uses the image. The button stays unavailable until what you type matches.

Readers see the new picture after the site finishes updating. The alt text on each page is left as it was. An edit that someone saved but hasn't published keeps the old picture until that edit is published again. The review screen lists those edits in a separate group. A developer can bring the old file back.

If the library can't read every place the image is used, the window says **Replace is on hold** and changes nothing. Select **Check usage again** to try once more.

## Select several images

Selecting lets you delete more than one image at a time. Tick the checkbox on each tile. In list view, tick the checkbox at the start of each row. A bar appears and gives the number you selected. It also says how many of those have no references and how many are still used.

```repro
story: media/bulk-selection
alt: Reproduction of the library with three images ticked and a selection bar showing a count, Select all, Clear, and Delete.
caption: The selection bar splits the chosen images into those with no references and those still used. Select all adds every image currently showing, and Clear empties the selection.
```

The bar has three buttons:

- **Select all** followed by a number, which selects every image showing.
- **Clear**, which empties the selection.
- **Delete** followed by a number, which starts the delete.

In grid view, you can also work from the keyboard:

- The arrow keys move between tiles.
- Space ticks or unticks the tile you're on.
- Shift with an arrow key extends the selection.
- Ctrl+A, or Command+A on a Mac, selects every image showing.
- Enter opens the details panel.

Those keys work in grid view only. Escape clears the selection in either view.

## Delete images

You can't undo a delete from the admin. The delete window says a developer can bring the image back later. If you delete something by mistake, ask your site developer.

### Delete several images

1. Select the images, and then select **Delete** followed by the number.
1. Read the review. It lists the images that will be deleted and the images that will be skipped because pages still use them.
1. Select the delete button in the review, such as **Delete 2, skip 1**.
1. Select **Done** when the summary appears.

A bulk delete never removes an image that pages still use. It checks each image again at the moment it deletes it and skips any that turned out to be in use. To delete one of the skipped images, follow the steps in the next section.

### Delete one image

1. Select **Delete** in the image's details panel. In list view, you can instead select the trash button at the end of the row.
1. Read the window. It says whether pages use the image.
1. If no page uses it, select **Delete it**.
1. If pages use it, check the list under **These would break**, type the address shown, and select **Delete anyway**.

**Delete anyway** stays unavailable until what you type matches the address. The typed address applies only when pages use the image. An image with no references needs only the **Delete it** button.

```repro
story: media/delete-in-use
alt: Reproduction of the delete confirmation for an image that pages still use, listing them and asking for the image's address.
caption: The window lists the entries that would break, with published pages and unpublished edits in separate groups. Delete anyway stays unavailable until the typed address matches the image's address.
```

After a delete, the library shows **Asset deleted.**
