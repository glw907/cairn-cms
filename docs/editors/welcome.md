# Welcome to the editor

The editor is the part of your site where you write and publish pages and posts. You open it in a web browser, and you sign in with a link that arrives in your email, so there is no password to remember. This page covers how to reach the editor, how to sign in, and what you see afterward.

Before you start, you need the address of your site and an email address that your site owner has added to the editor. Separate pages cover writing, publishing, and fixing problems, and the end of this page points you to them.

## Sign in

Each time you sign in, the editor emails you a link, and you finish by confirming in your browser. The steps are the same on a computer and on a phone.

1. In your browser, go to your site's address followed by `/admin`. For a site at `example.org`, that's `example.org/admin`. If you aren't signed in, the editor shows the sign-in page. Bookmark it, because it's where you return each time.
2. In the **Email** box, type your email address, and then select **Send sign-in link**.

```repro
story: auth/login
alt: Reproduction of the sign-in page with an Email box and a Send sign-in link button under a heading that names the site.
caption: The sign-in page asks for one thing, your email address. The link it sends works once and expires after 10 minutes.
```

3. Wait for the page to change to **Check your email**. The page shows this message whether your address is on the list or not, so it never reveals who has access.
4. Open the email whose subject is "Sign in to" followed by your site's name, and then select **Sign in** in the message. You have 10 minutes to use the link. If the email doesn't arrive within a minute or two, check your spam folder.
5. On the **Almost there** page, select **Confirm sign-in**.

```repro
story: auth/confirm
alt: Reproduction of the confirmation page with a heading, a line that names the site, and a Confirm sign-in button.
caption: Opening the link from the email shows this page and signs no one in yet. Sign-in finishes only when you select Confirm sign-in.
```

Open the link in the same browser where you asked for it. If you ask for a link on a computer and open the email on a phone, the editor can't match the two. It tells you to request a new link and open it in the browser you're using.

## Why there is a confirm step

Some email programs open every link in a message to check it. If the link signed you in on the first visit, that check would use it up before you did. The confirm button means that only a person selecting it finishes the sign-in.

Treat the email like a password, and don't forward it.

## What you see after you sign in

After you confirm, the editor opens on the list of your site's first content type, for example **Posts**. The sidebar lists everything else you can reach. At the bottom of the sidebar, **Sign out** ends your session. You stay signed in on that browser for up to 30 days.

If you see a screen that reads **Welcome** followed by your name, your account can sign in but has no content to manage yet. The screen suggests checking with whoever administers your site.

## Where to go next

To write a page or a post, continue to [Write in the editor](write-in-the-editor.md). If the sign-in link doesn't work or the editor shows an error, see [When something goes wrong](when-something-goes-wrong.md).
