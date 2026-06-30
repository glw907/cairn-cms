# Manage your tag vocabulary

Tags is its own screen in the admin, in the sidebar beside Posts, Pages, and Media. It holds your
site's tag vocabulary: the set of tags an editor can pick from when they write. The screen does three
jobs. You add a tag, rename the label readers and editors see, and remove a tag that nothing uses.
A fourth, calmer affordance seeds the list from tags your posts already carry. This page walks
through it from an editor's seat.

## How a tag is stored

Every tag has two parts. The label is the name you and your readers see, like "Trip reports". The
slug is the short, lowercase form the post stores, like `trip-reports`. You type the label, and cairn
derives the slug for you. The slug stays the same once a tag exists, so renaming the label is safe and
never rewrites a post.

The vocabulary lives in your site's configuration, so every editor shares one list. When you save the
screen, cairn commits the change, and your site picks it up on the next deploy.

## Add a tag

At the top of the screen, type the tag's name in the Add a tag box. As you type, a preview shows the
slug cairn stores, reading "Stored as `trip-reports`." Select Add tag, and the tag joins the list.

If the name can't make a valid slug, the preview turns into a short message and the tag isn't added.
That happens when the name has no letters or numbers (something like "!!!" or just spaces), or when it
would collide with a tag you already have. Adjust the name until the preview shows a clean slug, then
add it.

## Rename a tag's label

In the list, each tag shows its name in an editable field, its stored slug beside it, and how many
posts use it. To rename a tag, edit its name and select Save changes.

Renaming changes only the label. The slug stays the same, so your posts keep working and nothing is
rewritten. Use this when you want to reword how a tag reads without disturbing the posts that already
carry it.

## Delete an unused tag

You can delete a tag that no posts use. Its delete control is active, so select it to remove the tag
from the list, then select Save changes.

A tag that posts still use can't be deleted. Its delete control is turned off, and it tells you how
many posts use the tag. To remove a tag that's in use, first take it off those posts in the editor.
Once nothing uses it, its delete control turns on. This guard runs at save time too: cairn checks
across your live site and every unpublished edit, so a tag someone is still using is never dropped out
from under them.

## Seed from tags already on your posts

If your posts already carry tags that aren't in your list yet, the screen shows them in an Already on
your posts section, each with the number of posts that use it. Select Add to list to bring one into
your vocabulary, then select Save changes.

Seeding is the quick way to build your list from what you already write, instead of typing each tag
by hand. The section appears only when there are tags to seed, and a tag leaves it as soon as you add
it.

## Save your changes

Adds, renames, deletes, and seeds are all held on the screen until you select Save changes. That one
action commits the whole list at once. Until you save, nothing is committed, so you can adjust the
list freely and save when it reads the way you want.

## Where this fits

You apply tags to a post in the editor, covered by [Write in the editor](./write-in-the-editor.md).
The Tags screen manages the vocabulary those tags are drawn from.
