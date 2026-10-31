# Invite editors

An editor on a cairn site is someone who signs in and writes, and the site's owner decides who is on that list. Adding a person takes one short form on the **Editors** screen. The person then signs themselves in, with a link that cairn emails them. This page is for the owner who wants to add, remove, or re-role the people who write on the site. An owner is whoever the setup command signed in at the end of [Create your site](./create-your-site.md).

## Prerequisites

Sign-in email must be on, which needs a domain of your own connected and sending turned on for it. Without it, you remain the only person who can sign in, and adding someone to the list changes nothing for them. [Turn on sign-in email](./own-your-domain.md#turn-on-sign-in-email) covers the setup.

## Owner, editor, and other roles

On a site set up by `create-cairn-site`, everyone who can sign in is an **owner** or an **editor**. An owner can do everything an editor can, and also manages the list on this screen: adding people, removing them, and changing their roles. An editor writes and publishes but can't change who has access.

A developer can declare more roles for a site. If yours has, they appear as extra choices on this screen.

The site always keeps at least one owner. The screen refuses to remove or demote the last one, so you can't lock everyone out by accident.

## Add an editor

1. Sign in and go to `/admin/editors`.
2. At the bottom of the screen, enter the person's name and email address.
3. Choose their role. The default is editor.
4. Select **Add editor**.

The screen sends no email and has no separate invitation step. The person signs themselves in when they're ready: they go to your site's `/admin`, enter their email address, and cairn emails them a sign-in link.

## Remove an editor or change a role

The same screen lists everyone who can currently sign in, with a role label on each row.

1. Go to `/admin/editors`.
2. To change a role on a site with only owner and editor, select **Make owner** or **Make editor** on the person's row. On a site with more roles, choose a role from the list on the row and select **Change**.
3. To take a person off the list, select **Remove** on their row.

Your own row has both controls turned off, so you can't remove or demote yourself here. The last-owner rule is what prevents a lockout, on this screen or anywhere else.

## Verify the new editor

The new editor can go to your site's `/admin`, enter their email address, and receive a real sign-in link. If nothing arrives, check these in order:

1. Confirm the person's address is on the list, spelled the way they type it.
2. Look in their spam folder. A domain that just started sending can take a while to earn delivery.
3. See [Troubleshooting](./troubleshooting.md#nobody-can-sign-in-or-one-person-cant) for the checks that apply to everyone.
