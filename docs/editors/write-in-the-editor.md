# Write in the editor

This page shows you how to write a page or post in the editor. It covers starting an entry, formatting text, adding links, images, and blocks, checking your spelling, previewing the result, and changing an entry's settings. An entry is one item of content, such as a page or a post.

You need access to the editor, which [Welcome to the editor](welcome.md) describes. This page stops when your writing is ready. The page [Publish an entry and review its history](publish-and-history.md) covers saving, publishing, and getting an old version back. The page [Add an image](add-an-image.md) covers uploading pictures.

## Open or start an entry

The sidebar lists your site's content types, such as Posts or Pages. Select a type to see its entries.

```repro
story: editor/sidebar-list
width: wide
alt: Reproduction of the admin sidebar beside the Posts list, with a New Post button and a status chip on each entry.
caption: The list shows each entry's title, its date when the type has one, and a status chip. An entry with changes that aren't published yet carries the Edited chip.
```

Select an entry's title to open it. The list has a search box and two sets of filters. **All**, **Pending edits**, and **Published** filter by publish state, and **Shown** and **Hidden** filter by visibility. The status column uses the chips **New**, **Edited**, and **Published**. [Publish an entry and review its history](publish-and-history.md) explains what each one means.

To start a new entry, follow these steps:

1. At the top of the list, select the **New** button for the type, such as **New post**. The label follows the singular name your site gives the content type.
2. In the **Title** box, type the title. The **Address** box fills in as you type, so the title "Spring cleanup day" becomes the address `spring-cleanup-day`.
3. If you want a different address, edit the **Address** box. After you edit it, the box stops following the title. Some content types label this box **Name** because their entries have no public address.
4. If the dialog has a **Date** box, check the date. It starts as today's date. Leave the date out of the address.
5. Select **Create**.

The editor opens a blank entry with your title in place. The entry doesn't exist until you select **Save**, so you can change your mind and close the screen first. If the editor shows **An entry with that address already exists.**, change the address and try again.

## Find your way around the editing screen

An entry opens on the **Write** tab every time. The numbered list after the following figure names the parts of the screen.

```repro
story: editor/entry-screen
width: desktop
alt: Reproduction of the editing screen, with the title box above a formatting toolbar and the writing surface beneath it.
caption: The Write tab is selected. The screen is the same for every content type, though the boxes in the Details panel differ from site to site.
```

1. The title box holds the entry's title.
2. The toolbar holds the formatting and insert controls.
3. The **Write** and **Preview** tabs switch between typing and seeing the result.
4. The **Details** button opens the panel of settings for the entry.
5. The writing surface is where you type the entry's text.

The toolbar has three groups of controls. On wider screens, a small label names each group: Format, Structure, or Insert. On a narrow screen the toolbar scrolls sideways, and the **Write** and **Preview** tabs move into the **More formatting** menu.

At the right end of the toolbar, the **?** button, named **Markdown help**, opens a short reference and the list of keyboard shortcuts.

## Format text

Each toolbar button formats the text you have selected, and its label shows the keyboard shortcut. The following table lists the buttons.

| Button | Shortcut | What it does |
|---|---|---|
| **Bold** | Ctrl+B | Makes the selected text bold. |
| **Italic** | Ctrl+I | Makes the selected text italic. |
| **Strikethrough** | None | Crosses out the selected text. |
| **Inline code** | Ctrl+E | Sets the selected text in code style. |
| **Heading** | Ctrl+Alt+2 | Turns the line into a heading. |
| **Smaller heading** | Ctrl+Alt+3 | Turns the line into a smaller heading. |
| **Bulleted list** | Ctrl+Shift+8 | Starts a bulleted list. |
| **Numbered list** | Ctrl+Shift+7 | Starts a numbered list. |
| **Quote** | Ctrl+Shift+9 | Sets the line as a quotation. |
| **Table** | None | Inserts a table. |

The **More formatting** menu adds **Code block**, **Horizontal rule**, and **Task list**. When you press Enter at the end of a list item or a quote, the editor continues the list or the quote on the next line.

You can also type the formatting yourself. The editor shows this plain-text formatting, called markdown, as you type and previews the result. The following table shows the most common forms.

| Type this | What it makes |
|---|---|
| `## Heading` | A heading |
| `**bold**` | Bold text |
| `*italic*` | Italic text |
| `> quote` | A quote |
| `- item` | A bulleted list |
| `1. item` | A numbered list |
| `[text](url)` | A link |

The following table lists the keyboard shortcuts that work across the editor. Ctrl+/ shows the full list at any time.

| Action | Shortcut |
|---|---|
| Undo or redo | Ctrl+Z or Ctrl+Y |
| Save | Ctrl+S |
| Publish | Ctrl+Shift+S |
| Open or close the Details panel | Ctrl+. |
| Switch between Write and Preview | Ctrl+Alt+P |
| Turn on Focus mode | Ctrl+Shift+F |
| Turn on Zen | Ctrl+Shift+. |
| Fold or unfold a block | Ctrl+Shift+[ or ] |
| Go to the next or previous issue | F8 or Shift+F8 |

## Add a link

The editor has two kinds of link. A web link points to another website. A link to a page points to another entry on your site.

To add a web link, follow these steps:

1. Select the text you want to turn into a link, or place the cursor where the link should go.
2. In the toolbar, select **Web link (Ctrl+K)**.
3. In the **Add a web link** dialog, type the address in the **Web address** box. The **Text** box starts with your selected text, and you can change it to the words the link should show.
4. Select **Add link**.

To link to another page or post on your site, follow these steps:

1. Place the cursor where the link should go.
2. In the toolbar, select **Link to page**.
3. In the **Link to a page** dialog, search by title, and then select the entry.

You can also type `[[` followed by a few letters of the title. A list of matching entries appears, and choosing one inserts the link.

The editor writes a link to page as `cairn:` followed by the entry's type and name. The link follows the entry, so it keeps working if you later change that entry's address. If other entries link to an entry, the editor refuses to delete it until you remove those links.

If you link to an entry that no longer exists, or one that has never been published, the editor refuses the save. It lists the broken links and puts a **Remove link** button beside each one. If you link to a published entry that's marked **Hidden**, the save goes through with a warning. The warning says the link shows a page-not-found error until you clear **Hidden** on that entry and publish it.

## Add images and figures

The **Insert image** button in the toolbar adds an image. [Add an image](add-an-image.md) walks through uploading a new image or reusing one from the media library.

A figure is an image with a visible caption and a choice of width. To make one, follow these steps:

1. Place the cursor on the image. The figure button then reads **Wrap the image at the cursor in a figure**.
2. Select that button to open the **Wrap in a figure** form.
3. Set the parts of the form that the following table describes, and then select **Wrap in figure**.

After the image is in a figure, the same button reads **Edit the figure at the cursor**, and the form opens as **Edit figure**.

The following table describes the parts of the form.

| Part | What it does |
|---|---|
| **Caption** | Sets the visible line under the image. Everyone sees it, and it isn't the alt text. |
| **Alt text** | Shows **Described** or **Needs alt** for the image. |
| **Placement** | Offers **Measure**, **Center**, **Wide**, and **Full**. Center suits an image narrower than the text column, and Measure keeps an image at the column width. |
| **Wrap in figure**, **Update figure** | Applies your choices. |
| **Unwrap** | Returns the figure to a plain image. |

### Write alt text

Alt text is a short description of an image for readers who can't see it, such as people who use a screen reader. Describe what the image shows and why it's there. Leave out opening words such as image of, because a screen reader already announces an image.

When images in your text have no alt text, a notice under the header counts them. It reads **1 image needs alt text** for one image and **2 images need alt text** for two. Each image has an **Add alt text** button that jumps to that image in the text. The notice doesn't stop you from saving or publishing.

Some images are decoration only. You can mark the lead image as **Decorative** in the Details panel. The editor remembers that choice, so the notice clears. An image in the text of an entry can't keep that mark. It stays in the notice after you save and reload, even if you chose **Decorative** when you added it.

<a id="add-components-and-fragments"></a>

## Add blocks and fragments

A block is a ready-made piece of content that your site defines, such as a two-column layout. In your text, a block sits between two lines that start with `:::`. If your site has blocks, the toolbar shows two more buttons. The following table describes them.

| Button | What it does |
|---|---|
| **Insert block** | Opens a dialog where you browse the blocks, choose one, fill in its form, and select **Insert**. A site with many blocks also gets a search box. |
| The edit button, next to **Insert block** | Reopens the form for the block where your cursor is. |

When the cursor is outside a block, the edit button is dimmed and does nothing. Hover over it to see why. For a block that has no form, it reads **This block can't be edited in the form. Edit it as markdown.**

A fragment is a reusable piece of content that you write once on the **Fragments** screen and include in many entries. If your site has fragments, the toolbar shows **Include a fragment**. To include one, follow these steps:

1. In the toolbar, select **Include a fragment**.
2. In the picker, choose a fragment.

The editor adds a line that it displays as a chip reading **Include:** followed by the fragment's title. When no fragment is published, the picker says **No fragments published yet.** and there is nothing to include. To change the shared text, edit the fragment itself.

## Collapse blocks

Edit the text inside a block, and leave the `:::` lines alone. A figure is a block too.

When you open an entry, the editor collapses each block to a pill, which makes the surrounding text easier to read.

```repro
story: editor/collapsed-layout-block
alt: Reproduction of an entry with a collapsed block shown as a pill between two paragraphs, with a fold control in the margin.
caption: The pill names the block, shows its title in quotation marks, and counts the lines it holds.
```

Selecting a collapsed block's pill opens it. The arrow in the margin does the same, and its tooltip reads **Unfold this section** or **Fold this section**. Ctrl+Shift+[ folds the block at the cursor, and Ctrl+Shift+] opens it. If you move the cursor into a collapsed block or edit it, the block opens again.

## Check spelling and style

The editor underlines possible misspellings, doubled words, and repeated spaces as you type. The footer shows how many items are waiting, for example **2 to review**, or **Nothing to review** when the text is clean.

To work through the underlined items, follow these steps:

1. Press F8 to move to the next item. Shift+F8 moves to the previous one.
2. Press Alt+Enter to open the suggestions for the item under the cursor.
3. Choose a suggested word. For a repeated word or space, select **Fix**. For a correct word, select **Add to dictionary** to stop the flag for good, or **Ignore** to skip it this time.

If your site allows it, the **Spellcheck** button in the footer turns the underlines on and off.

### Tidy your text

If your site offers it, the toolbar has a **Tidy** button, described as a light copy-edit you review before accepting. Select it to open the **Review tidy** window, which lists each proposed change beside the original text.

```repro
story: editor/tidy-review
alt: Reproduction of the Review tidy window with a tally of kept and to-review changes, Accept fixes and Reject all buttons, and the proposed changes.
caption: Two changes, a doubled word and a misspelling, start as kept. The third adds a clause, so it carries Review this and stays undecided until you choose. The Apply button counts only the changes that are kept.
```

The window sorts changes by how safe they are. Fixes for spelling, doubled words, spacing, and punctuation start as kept. A change that needs your judgment carries **Review this** and starts undecided. To work through the window, follow these steps:

1. Decide on the changes in one of these ways:
   - On each change, select **Accept** or **Reject**. The keys J and K move between changes, and A and R accept or reject the current one.
   - To keep every fix at once, select **Accept fixes**. It never accepts a change marked **Review this**. You decide each of those yourself.
   - To drop every change, select **Reject all**.
2. Select the button that reads **Apply** followed by the number of kept changes, such as **Apply 2 changes**.

To leave without changing your text, select **Cancel** instead.

While the review is open, you can't type in the entry. After you apply the changes, a **Tidy applied** label appears with an **Undo tidy** button. One Undo, with Ctrl+Z, takes back the whole tidy. The changes affect the text in the editor only, and your next save keeps them like any other edit.

<!-- vale Microsoft.Contractions = NO -->
<!-- The bolded string is the exact on-screen heading. -->
If Tidy can't run, the editor shows **Tidy could not run** with the reason, and your text stays as it was.
<!-- vale Microsoft.Contractions = YES -->

## Preview your entry

The **Preview** tab shows the entry the way your site displays it. It uses your site's page design and shows your latest typing, saved or not. Select **Write** to return to typing. While Preview is open, the formatting and insert controls are dimmed.

```repro
story: editor/preview-tab
width: desktop
alt: Reproduction of the Preview tab, with a Preview width button beside the tabs and the rendered entry below.
caption: The Preview tab is selected. The width button beside the tabs reads Desktop, the formatting and insert controls are dimmed, and the entry appears below in your site's design.
```

To see how the entry looks on a smaller screen, select **Preview width** and choose Desktop, Tablet at 768 pixels, Phone at 390 pixels, or Small phone at 320 pixels. The editor remembers your choice on this device. Links in the preview don't open, so you can read the page without leaving the editor.

## Change an entry's settings

The **Details** button in the header, or Ctrl+., opens the Details panel. **Close details** puts it away. On a narrow screen, **Details** is in the **More actions** menu.

```repro
story: editor/details-panel
alt: Reproduction of the Details panel open beside an entry, with boxes for date, tags, and lead picture, then Visibility and Address groups.
caption: The Details panel opens beside the entry. Date, Tags, and Lead picture are this site's boxes, and Visibility, Address, and Share preview follow them.
```

The following table describes the panel's groups, from the settings you change most often to the ones you usually set once.

| Group | What it holds |
|---|---|
| The boxes at the top | Settings your site defines, such as a date, tags, or the **Lead picture**. Your site decides which boxes appear. |
| **Visibility** | The **Hidden** checkbox. A hidden entry stays off the site's lists and feeds, even after you publish it. |
| **Address** | The entry's address and a **Change URL** button. Links from other entries update automatically. The button reads **Rename** for a type that has no public address. |
| **Share preview** | **Share preview link** creates a private link that lets someone who isn't an editor read your saved draft before it's published. **Revoke all links** turns off every link for the entry. |

**Change URL** needs an entry with no unpublished edits. If the entry has some, the editor tells you to publish or discard them, and then rename. **Share preview link** needs a saved draft.

## Use the writing controls

The footer at the bottom of the editor shows a word count and your issue count. It also holds switches that change how the writing surface behaves. The editor remembers each switch on this device. The following table describes them.

| Switch | What it does |
|---|---|
| **Prose** | Sets your text in a narrower, centered column. |
| **Wide** | Fills the width of the editor. |
| **Focus mode** | Dims every paragraph except the one with your cursor. |
| **Typewriter** | Keeps the line you're typing in the vertical center of the screen. |
| **Spellcheck** | Turns the underlines on and off. Your site can remove this switch. |
| **Zen** | Hides the toolbar, footer, and title box, so only your text remains. **Exit zen**, or Esc, brings them back. |

On a narrow screen the footer doesn't appear. Its switches and the word count move into the **More formatting** menu.

## Where to go next

When your writing is ready, continue to [Publish an entry and review its history](publish-and-history.md). To add pictures, see [Add an image](add-an-image.md).
