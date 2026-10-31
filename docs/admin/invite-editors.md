# Invite editors

An editor on a cairn site is someone who signs in and writes, and the site's owner decides who is on that list. Adding a person takes one short form on the **Editors** screen. The person then signs themselves in with a link that cairn emails them. This page is for the owner who wants to add, remove, or change the role of the people who write on the site. The setup command, `create-cairn-site`, makes the person who ran it the first owner, as [Create your site](./create-your-site.md) shows.

## Prerequisites

Your site needs sign-in email turned on, which first needs a domain connected. Without it, you remain the only person who can sign in, and adding someone to the list changes nothing for them. [Turn on sign-in email](./own-your-domain.md#turn-on-sign-in-email) covers both.

## Owner, editor, and other roles

On a site set up with the setup command, everyone who can sign in is an **owner** or an **editor**. An owner can do everything an editor can, and also manages the list on this screen: adding people, removing them, and changing their roles. An editor writes and publishes but can't change who has access.

A developer can declare more roles for a site. If yours has, they appear as extra choices on this screen.

The site always keeps at least one owner. The screen refuses to remove or demote the last one, so you can't lock everyone out by accident.

## Add an editor

1. Sign in.
2. Go to `/admin/editors`.
3. At the bottom of the screen, enter the person's name and email address.
4. Choose their role. The default is editor.
5. Select **Add editor**.

The screen sends no email and has no separate invitation step. The person signs themselves in when they're ready: they go to your site's `/admin`, enter their email address, and cairn emails them a sign-in link.

## Remove an editor or change a role

The same screen lists everyone who can sign in, with a role label on each row.

1. Go to `/admin/editors`.
2. To change a role on a site with only owner and editor, select **Make owner** or **Make editor** on the person's row. On a site with more roles, choose a role from the list on the row and select **Change**.
3. To take a person off the list, select **Remove** on their row.

Your own row has both controls turned off, so you can't remove or demote yourself here.

## Verify the new editor

The new editor can go to your site's `/admin`, enter their email address, and receive a sign-in link. If nothing arrives, check these in order:

1. Confirm the person's address is on the list, spelled the way they type it.
2. Look in their spam folder. A domain that just started sending can take a while to earn delivery, as [Own your domain](./own-your-domain.md#turn-on-sign-in-email) explains.
3. See [Troubleshoot a live site](./troubleshooting.md#nobody-can-sign-in-or-one-person-cant) for the checks that apply to everyone.

## See also

- [Own your domain](./own-your-domain.md) turns on sign-in email.
- [Check that your site works](./is-it-working.md#provision-the-auth-store) covers a role the site doesn't declare.
- [Troubleshoot a live site](./troubleshooting.md) covers a live site that misbehaves.
