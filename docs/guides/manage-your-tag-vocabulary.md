# Manage your tag vocabulary

Posts on your site carry tags, and every tag comes from one shared list rather than whatever
a writer happens to type that day. The Tags screen, in the admin sidebar beside Posts, Pages,
and Library, is where that list lives. This guide covers viewing it, adding a tag, renaming
one, retiring one, and what happens to a post that already carries a tag you retire.

- [Viewing your tags](#viewing-your-tags)
- [Adding a tag](#adding-a-tag)
- [Renaming a tag](#renaming-a-tag)
- [Retiring a tag](#retiring-a-tag)
- [What a retired tag leaves behind](#what-a-retired-tag-leaves-behind)
- [Adding a tag already in use](#adding-a-tag-already-in-use)
- [Saving your changes](#saving-your-changes)

## Viewing your tags {#viewing-your-tags}

<!-- LIVE-UI: the Tags screen's list, name/stored-as/in-use columns, one row highlighted -->

Open Tags and you see every entry in the shared list, one row each, with a count of how many
tags you have in total. Each row shows the display name, the short slug it's stored as
underneath, and how many posts currently carry it. A tag with no posts reads Unused.

The display name lives only on this screen. [A post's own details
panel](./write-in-the-editor.md#the-details-panel) shows and stores the slug directly, the same
string that's checked against a post and written into its file.

## Adding a tag {#adding-a-tag}

Type a name in the field at the top of the screen and press Add tag. As you type, the screen
shows the slug your name is stored as, derived automatically by lowercasing the name and
turning spaces and punctuation into hyphens: "Snow Report" becomes `snow-report`. You don't
choose the slug yourself.

A name built entirely from punctuation has nothing to derive a slug from, and the screen says
so rather than adding an empty entry. A name that would derive the same slug as a tag you
already have is also refused, since two rows storing the same slug would be indistinguishable
to a post that carries it. Either way, the space under the field explains the problem before
you press Add tag.

## Renaming a tag {#renaming-a-tag}

Click into a row's name and edit it directly, the same field the list already shows you. This
changes only the display name on this screen. The stored slug underneath never changes once a
tag exists. A post's own details panel and every post file keep showing and storing that same
slug, untouched by the rename. Renaming "Snow Report" to "Snow Reports" updates the label here,
on this screen, without touching a single post file or the tag picker editors use when tagging
a post.

## Retiring a tag {#retiring-a-tag}

<!-- LIVE-UI: a row with an active delete control beside one with the guarded, inactive version -->

Each row carries a delete control at its right edge, but it only works on a tag no post is
using. The moment a tag's count reads anything but zero, that control turns inactive, and its
label names the count. A post still points at that slug, and the screen will not delete a tag
while a post is using it. Remove the tag from every post that carries it first, in each post's
own details panel, and once its count reaches zero here, the delete control opens up.

## What a retired tag leaves behind {#what-a-retired-tag-leaves-behind}

Retiring a tag changes the shared list. It never reaches into a post and removes a tag already
checked there, and ordinarily you won't notice the difference, because the delete control
already refuses a tag any post is using. The gap is a post mid-edit: if a writer has a post
open with a tag checked but hasn't saved it even once, the Tags screen has no way to know that
post is using the tag, so retiring it there is still allowed. When that post is finally saved,
its tag doesn't vanish. The post's own details panel still shows the tag, checked, with a
small note that it isn't in your tag list anymore, and it stays exactly as checked as it was
until someone clears it.

## Adding a tag already in use {#adding-a-tag-already-in-use}

<!-- LIVE-UI: the "already on your posts" section beneath the main list, with its Add to list rows -->

A tag can end up on a post without going through this screen first, most often when your site
adopts the shared list after posts already carry free-typed tags of their own. Any such tag
shows up here, below your main list, under a heading naming it as already on your posts along
with how many carry it. Add to list turns it into an ordinary entry. cairn proposes a name from
the slug, turning its hyphens back into spaces and capitalizing the first letter, and you can
rename it right away if you'd rather call it something else.

## Saving your changes {#saving-your-changes}

Every add, rename, and retirement you make on this screen stays local to your screen until you
press Save changes at the bottom. Nothing is written to your site's configuration before that,
so the list you leave without saving reverts the next time you open Tags. Once you save, the
new list applies to every editor. Anyone tagging a post after that sees your additions, and the
tags you retired no longer appear in the picker.
