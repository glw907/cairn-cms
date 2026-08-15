# When something goes wrong

What to do when the editor refuses something, or shows a message you don't understand.
Every message below is quoted exactly as it appears, so you can match it to what you're
seeing.

## Signing in

**"We're having trouble sending sign-in links right now. Please contact the site
owner."** The editor couldn't send the email at all. This isn't something you can fix
from your end. Let your site owner know.

**"You requested a link recently. Check your inbox, or wait a minute and try again."**
You asked for a second link too soon after the first. Use the one already in your inbox,
or wait a minute before trying again.

**"That link expired. Request a new one below."**, or **"This link didn't work"** on the
confirm page: the link you opened is more than 10 minutes old, or has already been used.
Request a fresh one and open it right away.

**"This didn't work"** on the confirm page, with an error message: something unexpected
happened while confirming. Go back and sign in again.

**Nothing arrives at all.** Check your spam folder first. If it's still not there, the
address you're using may not be the one your site owner added for you. Ask them to
check.

## A save or publish is refused

The editor keeps your typing on screen whenever it refuses a save or a publish. You never
need to retype anything. Read the message, fix what it asks (if anything), and try
again.

**"This file changed since you opened it. Reload and reapply your edits."** Despite what
this says, don't reload the page. Your text is already right there in the editor. This
usually means another editor saved to this same entry around the same time you did. Read
through your draft, make sure it still says what you want, and save again.

**"Your edits are saved. Reload and publish again."** You'll see this only from
**Publish**, not Save, and it means something different: your edit did save privately,
but making it live ran into the same kind of conflict above. Nothing is lost. Select
Publish again.

**"This page links to a page that no longer exists. Remove the broken link and save
again."**, or, with more than one broken link, **"This page links to pages that no
longer exist. Remove the broken links and save again."** Either way you'll see a list of
addresses. A link in your draft points somewhere that doesn't exist on your site, maybe
because of a typo, or because the page it pointed to was renamed or removed. Each broken
link in the list has a **Remove link** button beside it. Fix the link yourself in the
text, or use the button to take it out, then save again.

**"Saved. Note: this page links to unpublished pages (their addresses), which will 404
until published."** Your save went through. One of the pages you linked to exists but
isn't live yet, so anyone reading your entry hits a dead end until you publish that page
too.

**"A fragment can't include another fragment."** You used **Include a fragment** inside
another fragment's own text. Take that inclusion back out and write the text directly
instead; a fragment can only be included, never itself include one.

**"Pick a date for this entry."** This entry needs a date, and none was set.

**"An entry with that address already exists."** Or: **"An unpublished entry with that
address already exists."** Something is already using the address you're trying to
create this entry at. Choose a different title or address.

<!-- vale Microsoft.Contractions = NO -->
<!-- Quoted verbatim from the editor's own refusal text; rewriting the contraction would misquote it. -->
**"'X' is not in your tag list. Add it to your vocabulary first."**
<!-- vale Microsoft.Contractions = YES -->
You tried to save a
tag that isn't in your site's shared tag list yet. See
[Manage your tag list](./manage-your-tag-vocabulary.md) to add it, or pick from what's
already there.

## Discarding, deleting, and renaming

**"This entry has unpublished edits. Publish or discard them, then rename."** You can't
change an entry's address while it has changes waiting to be published. Publish or
discard first.

**"Another editor has unpublished edits referencing this entry: [names]. Ask them to
publish or discard, then rename."** Someone else has a draft that links to this entry.
The message names who to ask. Renaming would break their link, so it's blocked until
they publish or discard their own changes.

**A delete is refused, naming what links to it.** You can't delete an entry that other
entries still link to or include. The message lists them, each linking to its own
editor, so you can go fix or remove those links first, then come back and delete again.

## Publishing everything at once

If you select **Publish site** to send every pending entry live together, one of these
can happen instead:

<!-- vale Microsoft.Contractions = NO -->
<!-- The third item quotes the editor's refusal text verbatim; rewriting its contraction would misquote it. -->
- **"Nothing to publish. Every entry is already live."** There was nothing waiting.
- **"The site changed while publishing. Reload and try again."** Something changed
  partway through. None of your entries with unpublished changes were lost. Reload and
  try again.
- **"Something went wrong and the site did not publish. Try again, and if it keeps
  failing, let your site developer know."** This is the rare, unexpected case. Try once
  more, and ask for help if it keeps happening.
<!-- vale Microsoft.Contractions = YES -->

## Reverting to an earlier version

**"[Editor] has a draft in progress, last saved [date]. Publish or discard it before
reverting."** Someone has unpublished changes on this entry right now. Reverting would
throw that work away, so it's blocked until they publish or discard it.

**"The history changed since this page loaded. Reload and try again."** Or: **"That
version is no longer in the recent list."** Something published on this entry between
loading this page and selecting Revert. Reload the version list and try again.

## Sharing a preview link

**"This entry has no unpublished draft to share. Save an edit first."** You tried to
share a preview link before saving anything. Save the entry, then try again.

## Signed out partway through something

If you were away for a while and your session ran out, an action you try will tell you:
for example, sharing a preview link says **"Your session expired. Sign in again to
share a preview link,"** and adding an image says **"Your session has expired. Please
sign in again to add an image."** Sign in again and pick up where you left off.

## An image won't add

<!-- vale Microsoft.Contractions = NO -->
<!-- The three quotes below are the editor's own upload-refusal text, verbatim; rewriting their
     contractions would misquote them. -->
**"This image format is not supported. Try a JPEG, PNG, WebP, or GIF."** The file you
picked isn't one the editor can read.

**"This image could not be converted. Try exporting it as a JPEG first."** The editor
tried to convert the file and couldn't. Save it as a JPEG from wherever it came from,
then try again.

**"This image is too large to add, even after shrinking it."** Your site limits how big
an uploaded picture's file can be. Export or save a smaller copy of the picture, then try
again.

**"The upload could not be completed. Please try again."** Something else interrupted
the upload, most often a connection problem. Try again.
<!-- vale Microsoft.Contractions = YES -->

## Using Tidy

**"This is too long to tidy at once. Select a passage and tidy that instead."** Your
draft is past what Tidy can review in one pass. Select a section of it and run Tidy on
that instead.

**The Tidy button isn't there anymore.** Something broke in your site's connection to
its copy-editing tool. The button comes back on its own once it's fixed; nothing you did
caused this. Tell your site owner.

## Nothing here matches what you're seeing

If a message you're looking at isn't covered above, or something looks broken in a way
no message explains, tell your site owner or developer what you were doing and copy the
exact message. They have tools to look into it further than this page can.

---

*Checked against the editor on 2026-08-14.*
