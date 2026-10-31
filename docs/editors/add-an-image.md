# Add an image

This page shows how to add an image to an entry. You can upload a new image into the text, reuse one the site already has, or set the entry's lead image in the **Details** panel. It also covers how to name an image and how to describe it for readers who can't see it.

You need an entry open in the editor. The page doesn't cover the file types the admin accepts or the size limit, and it doesn't cover working on images outside a draft. For those, see [Manage the media library](manage-the-media-library.md). For writing the draft itself, see [Write in the editor](write-in-the-editor.md).

## Insert an image into the text

Start by opening the **Insert image** panel.

1. Put the cursor where you want the image.
1. Select **Insert image** in the toolbar. It's the button with a small image on it.

The panel opens next to your cursor.

```repro
story: media/insert-panel
alt: Reproduction of the Insert image panel, with an Upload an image button and a search box that lists the site's existing images.
caption: The Insert image panel opens next to the cursor with Upload an image above a search box and the list of the site's images.
```

You can also skip the panel. When you paste an image or drag an image file into the draft, the editor opens the upload form directly.

## Reuse an image the site already has

Reuse an image when the image is already in the media library. You don't upload it again.

1. In the **Insert image** panel, select the box labeled **Search the media library**.
1. Type part of the image's name or its alt text. The list narrows as you type.
1. Select the image you want. The editor inserts it at your cursor and closes the panel.

A reused image brings along the alt text saved with it in the library. A row marked **Needs alt** has none yet. If the list says **No images in the library yet.**, the site has no images to reuse. Use the steps in [Upload a new image](#upload-a-new-image).

## Upload a new image

1. In the **Insert image** panel, select **Upload an image**.
1. Choose the file in the window that opens. The upload form appears with a small preview of your image.
1. In the **Name** field, type a name you'd recognize later. The library lists the image under this name.
1. Under **Alt text**, select **Write a description** and type a short description, or select **Mark as decorative**.
1. Select **Insert image**.

The **Name** field starts with the file's name and a **Suggested** mark. A name from a camera or screenshot tool, such as IMG_4821, gets no suggestion, so the field starts empty.

The image appears in your draft right away while it uploads, and the editor swaps in the finished image when the upload completes. Save the draft as usual to keep it.

```repro
story: media/upload-form
alt: Reproduction of the upload form, with a preview, a Name field marked Suggested, and two Alt text choices.
caption: The upload form shows a preview, the Name field with its Suggested mark, and the two Alt text choices, with Insert image available before either is chosen.
```

If the file is one the site already has, the editor inserts the existing image and shows **Reused an existing image.** Select **Done** to close the panel. If the upload fails, the panel says what went wrong and offers **Retry** and **Cancel**. Your draft stays as it was.

### Choose between a description and decorative

Alt text is a short description of an image. Screen readers read it aloud to people who can't see the image. Say what the image shows.

- Select **Write a description** for an image that carries meaning, such as a photo of a product.
- Select **Mark as decorative** for an image that adds nothing to the words around it, such as a divider or an ornament. Screen readers skip it.

You can insert an image without choosing either one. The editor then warns you about images that have no alt text, but the warning never stops you from saving. The editor doesn't remember a decorative choice for an image in the text, so it can still list that image as needing alt text after you reload the draft.

## Set the lead image

The lead image is a single image that belongs to the entry as a whole and not to its text. Your site's template decides where the lead image appears and whether it also serves as the image shown when someone shares the entry. Its field sits in the **Details** panel, and your site names it, so the label may differ from **Lead picture**.

1. Open the **Details** panel.
1. In the lead image field, select **Add** followed by the field's name, such as **Add lead picture**.
1. Drop an image into the window, or select **Choose a file**. To reuse an image instead, search under **or pick from the library**.
1. Check the preview. Then select **Describe it** and type a short description, or select **Decorative**. The **Caption** box is optional.
1. Select **Use this image**.
1. Select **Save** so the entry keeps the image.

```repro
story: media/lead-picture-dialog
alt: Reproduction of the lead image dialog, with a wide preview, Replace and Remove links, alt text choices, and a Caption box.
caption: The lead image dialog shows a wide preview with Replace and Remove links, the Describe it and Decorative choices, and the optional Caption box. Replace returns to the choices, and Remove clears the field. The caption appears under the image only if the site's template uses it, and it isn't the alt text.
```

**Use this image** places the image in the field but doesn't save the entry. The field then shows a thumbnail, the name, and a status of **Described**, **Needs alt**, or **Decorative**. The button beside it reads **Edit**, or **Add** while the image still needs alt text. Select it to reopen the dialog.

## Where to go next

To browse, rename, replace, or delete the images your site holds, see [Manage the media library](manage-the-media-library.md). To keep writing, see [Write in the editor](write-in-the-editor.md). If a save or an upload is refused, see [When something goes wrong](when-something-goes-wrong.md).
