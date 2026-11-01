# When something goes wrong

This page explains the messages the editor shows when it refuses a request, and what to do next. It covers the sign-in link, saving and publishing, creating an entry, tags, a page that won't delete, and the links inside a draft.

This page doesn't explain how to write, save, or publish. For those, see [Write in the editor](write-in-the-editor.md) and [Publish an entry and review its history](publish-and-history.md). The messages for a refused image upload are in [Manage the media library](manage-the-media-library.md).

Every message below is quoted exactly as it appears, so you can match it to what you're seeing. Where a message names something of yours, such as a field or a post, the quote uses an example in its place.

## The sign-in link doesn't arrive

After you enter your email address, the admin shows a **Check your email** screen. That screen also says what to do if nothing arrives:

**"No link after a minute or two? Check your spam folder first. If it still hasn't arrived, the address may not match the one your site owner added."**

To find the link:

1. Wait a minute or two, and then check your spam folder.
1. Compare the address you typed with the one your site owner added for you.
1. If the address was wrong, select **Use a different email** and enter the right one.

Two other messages can appear on the sign-in page when you ask for a link:

<!-- vale Microsoft.We = NO -->
<!-- The bolded messages are quoted exactly as the product shows them, including its first-person plural. -->
- **"You requested a link recently. Check your inbox, or wait a minute and try again."** A link is already on its way. Look for it before you ask again.
- **"We're having trouble sending sign-in links right now. Please contact the site owner."** The site couldn't send the email. Waiting doesn't fix this. Tell your site owner.
<!-- vale Microsoft.We = YES -->

## The sign-in link doesn't work

The **Check your email** screen says to open the link within 10 minutes. The link works only in the browser where you asked for it. If you ask on a computer and open the email on your phone, the link fails.

Depending on what went wrong, you see one of these messages:

- **"That link expired. Request a new link below and open it in this browser."**
- **"This browser has no pending sign-in. Request a new link below and open it in this browser."**
- **"This sign-in link is invalid or expired."**

All three have the same fix:

1. Go to the sign-in page. If you see **This sign-in link is invalid or expired.**, select **Request a new link**.
1. Enter your email address and select **Send sign-in link**.
1. Open the new email in the same browser where you asked for the link.

## A save or publish is refused

When you select **Save** or **Publish** and the editor refuses, a message appears above your draft. The refusal doesn't discard your work. Your text stays in the editor exactly as you left it.

The following table lists the messages, what each one means, and what to do.

<!-- vale Microsoft.Contractions = NO -->
<!-- The bolded messages are quoted exactly as the product shows them, so a contraction rule cannot rewrite them. -->

| Message | What it means | What to do |
|---|---|---|
| **"Title is required"** | A field that must be filled in is empty. The message starts with the field's name. Yours may say something other than Title. Other field rules, such as a minimum length, name the field and the limit in the same way. | Fill in or fix the field, and then select **Save** or **Publish** again. Fields other than the title are in the **Details** panel. |
| **"Pick a date for this entry."** | The entry needs a date, and the date field is empty. | Choose a date in the date field in the **Details** panel, and then save again. |
| **"This file changed since you opened it. Re-read the draft and save again."** | The saved copy of the entry changed while your save was on its way. | Follow the steps in [An edit conflict stops your save](#an-edit-conflict-stops-your-save). |
| **"Your edits are saved. Publish again."** | The site changed while your publish was running. | Select **Publish** again. |
| **"Another entry already uses the address /posts/hello. Your edits are saved. Change the address of one of the two, then publish again."** | Another entry already has the address your entry would publish to. Yours may name a different address. Two entries can't share an address, so nothing was published. | Open the other entry and select **Change URL** in its **Details** panel. If that entry has unpublished edits, publish or discard them first. Then select **Publish** again. |
| **"This page includes a fragment that does not exist: welcome."** | The entry includes a fragment the site doesn't have. The message names the fragment. | Remove the **Include:** chip, or include a fragment that exists. Then save again. |
| **"An include is missing its fragment. Pick a fragment or remove the include."** | An **Include:** chip in the entry has no fragment chosen. | Remove the chip, or include a fragment again. Then save. |

<!-- vale Microsoft.Contractions = YES -->

A connection problem or an unexpected error can stop a request. You see this message:

<!-- vale Microsoft.Contractions = NO -->
<!-- The bolded messages are quoted exactly as the product shows them, so a contraction rule cannot rewrite them. -->
**"That did not go through. Your text is still here; please try again."**
<!-- vale Microsoft.Contractions = YES -->

Select **Save** or **Publish** again.

If your session ends while you work, you see this message:

**"Your session ended. Please sign in again in a new tab, then save. Your text is still here."**

To keep your work:

1. Select **Sign in** beside the message. The sign-in page opens in a new tab.
1. Sign in there, and then return to the first tab.
1. Select **Save**. Your text is waiting in the editor.

## An edit conflict stops your save

If your save runs into an edit conflict, you see this message:

**"This file changed since you opened it. Re-read the draft and save again."**

Your typing is safe. The editor keeps your text and shows it again after the refusal. Don't reload the page. Reloading brings back the last saved version of the draft and can lose what you typed since.

To recover:

1. Leave the page open and keep your text in place.
1. Select **Save** again.

If the message comes back, copy your text somewhere safe, and then tell your site owner.

## A tag isn't on the list

If your site keeps a tag list, you can add only tags from that list to an entry. Tags the entry already carries stay allowed. When a save includes a tag that isn't on the list, the editor refuses. The message puts the tag's name in quotation marks and then says:

<!-- vale Microsoft.Contractions = NO -->
<!-- The bolded messages are quoted exactly as the product shows them, so a contraction rule cannot rewrite them. -->
**"is not in your tag list. Add it to your vocabulary first."**
<!-- vale Microsoft.Contractions = YES -->

To fix it:

1. Open the **Tags** screen in a new browser tab and add the tag to the list. [Manage your tags](manage-your-tag-vocabulary.md) shows how.
1. Select **Save changes** on the **Tags** screen.
1. Return to the first tab, where your text is still in the editor, and select **Save** again.

The **Tags** screen appears only for people your site allows to change the list. If you don't see it, ask your site owner to add the tag.

## A new entry is refused

The refusals in this section come from the **New** dialog, which opens when you select the button at the top of an entry list, such as **New post**. The dialog closes, and a message appears above the list.

Three messages cover date and address problems:

- **"Pick a date for this entry."** The **Date** field was empty. Choose a date.
- **"Leave the date out of the address; set it in the date field."** The address starts with a year. Remove the year from the **Address** field. The **Date** field already records it.
- **"Enter a valid address: lowercase letters, numbers, and hyphens."** The **Address** field holds a space, a capital letter, or a symbol. Some kinds of entry have no web address, and for those the field and the message say name instead of address.

Two messages cover an address that's already taken:

- **"An entry with that address already exists."** A published entry already has this address. Choose a different address.
- **"An unpublished entry with that address already exists."** Someone saved an entry at this address and hasn't published it. Choose a different address, or ask the editors you work with whether one of them started it.

To try again after any of these refusals:

1. Select the same button at the top of the list.
1. Fix the field that the message names.
1. Select **Create**.

## A page won't delete

You can't delete a page while other pages link to it, because those links would lead nowhere. The refusal starts with the following message, where the word after This names the kind of entry:

<!-- vale Microsoft.Contractions = NO -->
<!-- The bolded message is quoted exactly as the product shows it, so a contraction rule cannot rewrite it. -->
**"This post could not be deleted."**
<!-- vale Microsoft.Contractions = YES -->

The line under it reads like this, with the number and the words matching what you have:

<!-- vale Cairn.ProseProcedure = NO -->
<!-- The bolded message is quoted exactly as the product shows it, and its instruction is the product's wording. -->
**"3 pages now link to it. Remove or repoint the links listed below, then delete again."**
<!-- vale Cairn.ProseProcedure = YES -->

To delete the page:

1. Select each title in the list to open that page.
1. Remove the link, or change it to point somewhere else.
1. Save and publish the page. For links in the text, the check looks at the published site, so a change you saved but didn't publish doesn't clear this message.
1. Open the page you want to delete and delete it again.

## A draft has a broken link

When a draft links to a page that no longer exists, or to one that has never been published, the editor refuses to save it. It shows this message above the draft:

**"This page links to a page that no longer exists. Remove the broken link and save again."**

Under the message, each broken link appears on a separate line with a **Remove link** button. To fix the draft:

1. Select **Remove link** beside a line. The words stay in your draft and only the link goes. The line disappears from the list.
1. Repeat for each line.
1. Select **Save**.

If you want to keep a link, point it at a page that exists instead.

A link to a page that has never been published gets the same refusal, because the live site has no such page yet. Publish that page first, or remove the link. A link to a published page that's marked **Hidden** doesn't stop the save. A warning appears after you save to say the link shows a page-not-found error until you clear **Hidden** on that page and publish it.

## A site-wide publish is refused

The **Publish site** button in the top bar publishes every entry that has unpublished changes. If it can't, you land on an entry list with one of these messages:

<!-- vale Microsoft.Contractions = NO -->
<!-- The bolded messages are quoted exactly as the product shows them, so a contraction rule cannot rewrite them. -->
- **"Nothing to publish. Every entry is already live."** Nothing was waiting. No action is needed.
- **"The site changed while publishing. Reload and try again."** Reload the page and select **Publish site** again.
- **"Something went wrong and the site did not publish. Try again, and if it keeps failing, let your site developer know."** Try again once. If it fails again, tell your site owner.
- **"Nothing was published. Two entries would share one address. Open the pending entries, change the address of one of the two, and publish again."** Two of the waiting entries have the same address. Use the **Pending edits** filter on a list to find them. Change the address of one, and then select **Publish site** again.
<!-- vale Microsoft.Contractions = YES -->

## A revert is refused

The **Revert** button on an entry's history saves an older version as a draft, so a refusal means no draft was created. The history screen shows the reason in a message over the list:

<!-- vale Microsoft.Contractions = NO -->
<!-- The bolded messages are quoted exactly as the product shows them, so a contraction rule cannot rewrite them. -->
- **"[Name] has a draft in progress, last saved [date]. Publish or discard it before reverting."** Someone has unpublished changes on this entry. Open the entry, then publish or discard the draft, and revert again.
- **"The history changed since this page loaded. Reload and try again."** Someone published while you had the history open. Reload the history and select **Revert** again.
- **"That version is no longer in the recent list."** The version you picked has dropped out of the list the history shows. Reload the history and pick a version from the new list.
<!-- vale Microsoft.Contractions = YES -->

## Where to go next

For the steps behind a save or a publish, see [Write in the editor](write-in-the-editor.md) and [Publish an entry and review its history](publish-and-history.md). For an upload that was refused, see [Manage the media library](manage-the-media-library.md). For a refused tag, see [Manage your tag vocabulary](manage-your-tag-vocabulary.md).
