# Invite your editors

Get your writers in.

## Before you start

This needs [Workers Paid turned on and your sending domain onboarded](./own-your-domain.md#turn-on-sign-in-email).
Without it, only you can sign in; adding someone here doesn't change that; it's sign-in email
that lets anyone besides you actually get in.

## Owner, editor, or a role your site declares

On a site set up by `create-cairn-site`, every person who can sign in is either an **owner** or an
**editor**. (A developer can add other roles; if yours has, you'll see them as extra choices on
this screen.) An owner can do everything an editor can, and additionally manages the roster on
this page: adding, removing, and changing other people's roles. An editor writes and publishes
content, but can't touch who else has access. Your site always keeps at least one owner; the page
itself won't let you remove or demote the last one, so you can never accidentally lock yourself,
or everyone, out.

## Add an editor

Sign in and go to `/admin/editors`. At the bottom of the page, fill in their name, their email
address, and their role, then select **Add editor**. That's it: there's no email to send from
here, and no separate invitation step. The person you added signs themselves in whenever they're
ready, the same way you do: they go to your site's `/admin`, enter their email, and cairn sends
them their own sign-in link.

## Remove an editor, or change their role

The same `/admin/editors` page lists everyone who can currently sign in. Next to each row,
**Remove** takes that person off the roster entirely; the button beside their role changes their
role. On a site with only owner and editor, it reads **Make owner** or **Make editor** and moves
them between the two; if your site declares roles beyond that pair, you'll see a dropdown and a
**Change** button letting you pick among all of them instead. Your own row has both controls
turned off, so you can't remove or demote yourself from this screen.

## You know it worked when

The person you added can go to your site's `/admin`, enter their email, and receive a real
sign-in link. If they say nothing arrived, see
[Troubleshooting](./troubleshooting.md#nobody-can-sign-in-or-a-specific-person-cant) before
assuming anything is broken; a domain's mail can also take a little while to warm up right after
you first turn email sign-in on.
