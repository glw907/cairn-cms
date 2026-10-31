# Manage your tag vocabulary

Your tag vocabulary is the shared list of tags the whole site picks from. This page shows how to add a tag to the list, rename one, remove one that nothing uses, and bring in tags that entries already carry. Everyone who writes on the site sees the same list, so a change here reaches every editor.

You need to be signed in with a role that can use the **Tags** screen. Owners always can, and your site can limit the screen to certain roles. If **Tags** isn't in your sidebar, ask your site owner. This page doesn't cover putting a tag on an entry. You do that in the entry's **Details** panel, and [Write in the editor](write-in-the-editor.md) covers the editor. If the editor refuses a tag, see [When something goes wrong](when-something-goes-wrong.md).

## Open the Tags screen

Select **Tags** in the sidebar.

```repro
story: tags/screen
alt: Reproduction of the Tags screen, with an Add a tag field, a list of tags with their stored forms and counts, and a Save changes button.
caption: A tag that entries use shows how many entries use it, counting entries with unpublished edits, and its remove button is faded and unavailable. A tag no entry uses has an active remove button.
```

1. The **Add a tag** field is where you type a new tag's name.
1. The **Your tags** list shows each tag's name, how it's stored, and how many entries use it.
1. The trash button appears active only beside a tag that no entry uses.
1. The section called **Already on your entries** lists tags that entries carry but your list doesn't have yet.
1. **Save changes** applies everything you did on the screen.

Nothing you change takes effect until you select **Save changes**.

## Add a tag

1. In the **Add a tag** field, type the tag's name, such as Snow report.
1. Read the line under the field. It says how the tag will be stored, such as **snow-report**. Editors see the name you typed, and entries keep the stored form.
1. Select **Add tag**, or press Enter.
1. Select **Save changes**.

The stored form is the name in lowercase, with hyphens between the words. Two messages can appear under the field instead:

- **"That name has no letters or numbers to make a tag from."** Type a name with at least one letter or number.
- **A tag is already stored as** followed by the stored form in quotation marks. Your list already has a tag that stores the same way. Use that tag, or type a different name.

## Rename a tag

Rename a tag when you want to fix a spelling or change how it reads.

1. In the **Your tags** list, select the name you want to change.
1. Type the new name.
1. Select **Save changes**.

A rename is safe because the stored form never changes. Entries already tagged keep the tag, and they show the new name.

## Remove a tag nothing uses

1. In the **Your tags** list, find a tag marked **Unused**.
1. Select the trash button beside it.
1. Select **Save changes**.

A tag that entries use shows how many, such as 3 entries. Its trash button is faded and doesn't work. Pointing at it explains that you need to take the tag off those entries first. The count includes entries with edits that someone saved but hasn't published.

If someone starts using a tag while you remove it, **Save changes** refuses and says the tag is still in use. Take the tag off those entries, and then try again.

## Add tags that entries already have

Entries sometimes carry tags that aren't on your list. The **Already on your entries** section appears when that happens. It shows each tag with the number of entries that use it.

1. Find the tag in the **Already on your entries** section.
1. Select **Add to list** beside it.
1. Repeat for each tag you want to keep.
1. Select **Save changes**.

Each tag you add moves up into **Your tags**, with a name made from its stored form. Rename it if you want a different name.

## If Save changes is refused

If the site's configuration changes while you work on the list, **Save changes** refuses and shows this message:

<!-- vale Microsoft.Contractions = NO -->
<!-- The bolded message is quoted exactly as the product shows it, so a contraction rule cannot rewrite it. -->
**"The site config changed since you opened it. Re-read the config and reapply your edits."**
<!-- vale Microsoft.Contractions = YES -->

Reload the screen to see the current list, make your changes again, and select **Save changes**.
