# Publish and history

How to move an entry between private and live, and how to get an earlier version back.

**Save** and **Publish** sit together near the top of an entry's screen. On a narrow
screen, like a phone, they sit instead in a bar fixed to the bottom. The overflow menu
beside them, covered below, holds **History**, **Discard changes**, and **Delete**.

## Save keeps your work, privately

Select **Save** and your changes are kept. Nobody sees them on the live site yet. Other
editors on this site can see a saved draft by opening the same entry. Nobody else can,
unless you deliberately share a preview link (below).

After a save, you'll see a note: "Saved. Your site keeps showing the published version
until you publish." Save as often as you like. It's how you keep your work from being
lost, not how you put it live.

## Publish makes it live

Select **Publish** and whatever is on screen right now goes live, including anything you
typed since your last save. Publish always saves first, so you never need to save and
then publish separately. The note that follows reads: "Published. The live site is
rebuilding," which usually takes a moment.

Publish stays available even when there's nothing new to send, though it's inactive
then, and its label explains why if you hover or focus it.

To see it for yourself, open the entry's own address on your site. A page usually lives
at your site's address followed by whatever address you gave it; other kinds of entries,
such as posts, usually live under their own section, like `/posts/`. Ask your site owner
if you're not sure where a particular kind of entry appears.

## Where an entry stands

Every entry carries one status:

- **New**—it has never been published.
- **Edited**—it's live, and you have unpublished changes sitting on top of it.
- **Published**—it's live, and matches exactly what you last published.

This is separate from **Hidden**, a checkbox in the Details panel. A hidden entry stays
off your site's lists and feeds even after you publish it, though it can still be reached
directly if someone has its address. Use Hidden for something you're not ready to
announce yet, or something meant to sit quietly rather than appear in a list.

## Changing an entry's address

Every entry that appears as its own page has an address on your site. Open Details and
select **Change URL** to give it a new one. This only works while the entry has no
unpublished changes, since renaming underneath an edit would strand it. Publish or
discard first, then rename.

## Discarding changes

If you want to throw away your unpublished changes and go back to what's live, open the
overflow menu next to Save and Publish and select **Discard changes**. If the entry has
been published before, this restores the live version. If it has never been published,
discarding it deletes it. Either way, the dialog tells you plainly, and there's no way to
get it back once you confirm.

## Deleting an entry

Deleting is in the same overflow menu. If nothing else on your site links to this entry
or includes it, you'll get a plain confirmation: this can't be undone, and any
unpublished changes go with it.

If something else does link to it, the editor won't let you delete it yet. It names what
would break and links you to each one, so you can remove or repoint those links first,
then come back and delete again.

## Publishing everything at once

If several entries have unpublished changes, a **Publish site** button appears near the
top of the editor, showing how many. Selecting it opens a list of every pending entry
grouped by type, so you can see exactly what's about to go live before you confirm.

## Sharing a draft before it's live

If your site has this turned on, you can let someone who isn't an editor read your
unpublished draft. Save it first, since there's nothing to share until a draft exists.
Open Details and select **Share preview link**. This creates a private web address
anyone holding it can open to read the draft, without signing in. It's shown once, so
copy it right away, and it shows its own expiry date beside it; after that it stops
working, and you can make a new one. **Revoke all links** turns off every link you've
created for that entry, which you should do once you no longer need people reading it
privately.

If you don't see **Share preview link** in Details, this feature isn't part of every
site. Ask your site owner.

## Getting an earlier version back

Open the overflow menu and select **History** to see this entry's past publishes, newest
first, each with who published it and when. If you have unpublished changes right now,
they show at the top of the list too, marked as a draft with no way to revert to them
from here since they aren't a version yet.

The list shows your 25 most recent publishes, and says so on screen when there are more
than that. If you changed the entry's address at some point, the list only goes back to
that change; for anything further back, ask your site's developer.

Select **Revert** on any earlier version, and that version's text loads back into the
editor as your private, unpublished draft, the same as if you'd just edited it yourself.
Nothing on the live site changes yet. Review it, then publish it like any other edit
when you're ready. If someone else already has unpublished changes on this same entry,
reverting is blocked until they publish or discard, so their work is never thrown away
by your revert.

If the version you're reverting to is old enough that a field or a tag it used has since
been removed from your site, the draft tells you so before you save: reverting keeps
only what the form in front of you shows, so check it before you publish.

---

*Checked against the editor on 2026-08-14.*
