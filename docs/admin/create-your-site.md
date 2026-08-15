# Create your site

From nothing to signed in, and how to sign in again.

## Before you run it

You need a computer with [Node.js](https://nodejs.org) 22 or later installed, and a terminal.
Nothing else. The tool checks your Node version itself and tells you if it's too old, before it
asks you anything.

## Run the command

Open a terminal and run:

```
npx create-cairn-site
```

The tool prints the honest cost picture first, the same facts as
[Before you start](./before-you-start.md), so you see them before typing anything. Then it asks
four short questions: your site's name, an optional one-line description, an optional brand
color, and the folder to create it in. Press Enter to accept the shown default for any of them.

The tool scaffolds your site locally, then keeps going: it walks you through putting that site on
GitHub, and then onto Cloudflare, in the same run. Both stages ask before they do anything, so you
can stop and pick this back up later if you'd rather not finish it in one sitting.

## Getting your site onto GitHub

The tool explains what it's about to do, then asks: **Create the GitHub App and repository now?**
Say yes, and it creates a private GitHub repository for your content, and a GitHub App that
exists only for this site. That App is what lets the tool, and your writers, publish to your
repository without anyone needing a GitHub account of their own. GitHub doesn't allow an App's
permissions to be reduced after the fact, so this stays for as long as the App exists.

This step needs two trips to your browser: one to create the App, one to install it on your new
repository and sign you in to GitHub. The tool opens each page for you and waits.

If you're creating the App under an organization rather than your personal account, GitHub may
require an organization owner to approve the install before it continues. If that happens, the
tool tells you so and stops cleanly; nothing is lost, and re-running the same command later picks
up right where it left off, once someone with owner access approves it.

## Getting your site onto Cloudflare

Once your repository exists, the tool asks again: **Install, build, and deploy your site now?**
Say yes, and it installs your site's dependencies, signs in to Cloudflare (a third browser trip,
only if you aren't signed in already), and deploys. This creates, on your own Cloudflare account:

- One Worker running your site.
- Two databases: one for who's allowed to sign in, one that's yours for whatever a developer
  builds on your site later.
- One storage bucket for images.

All of this runs on Cloudflare's free plan; nothing in this step costs money. Your content itself
isn't in either database: it's the markdown files already sitting in the GitHub repository the
previous step created. The tool then moves
your GitHub App's private key off your machine and into a Cloudflare Worker secret, where it
stays, and asks for the email address you'll sign in with. Once you answer, it writes your owner
record straight into your new site's database and opens a sign-in page in your browser, its last
browser moment: click **Sign in there**, and you land in your own site's admin, signed in as its
owner.

**Browser moments, in order:** creating your GitHub App, installing it on your new repository,
signing in to Cloudflare if you aren't already, and the sign-in page the tool opens for you at
the end. Three or four, depending on that middle one.

## You know it worked when

Your terminal prints your site's live address, something like `https://your-site.workers.dev`,
and a note that you can sign in at `https://your-site.workers.dev/admin`. Open that admin address:
if you land there already signed in, from the link the tool just opened, setup finished. Building
and running this site costs nothing, and stays free, for as long as you are the only person who
signs in; see [the free-until boundary](./before-you-start.md#the-free-until-boundary) for what
changes once a second person needs their own sign-in.

Your site is now live on a Cloudflare-provided `workers.dev` address, which keeps working even
after you connect a domain of your own. That's the next page:
[Own your domain](./own-your-domain.md).

## Getting back in

The sign-in link the tool opens for you works for ten minutes. If you close that tab, wait too
long, or the link stops working for any other reason, run:

```
npx create-cairn-site --dir <the-folder-you-created> --sign-in
```

from the same machine that created the site, and the tool writes a fresh link straight into your
site's database and opens it, with no email involved. This works at any point after your site
first goes live, not only in the minutes right after setup. Once you're signed in through it, that
session lasts 30 days on its own, so this is a rare thing to need. If a step earlier than this one
failed or got interrupted before your site ever went live, see
[Setup recovery](./setup-recovery.md) instead.
