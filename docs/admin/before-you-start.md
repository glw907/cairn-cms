# Before you start

What you are getting into, what it costs, and what stays yours.

## What you end up owning

```mermaid
flowchart LR
  accTitle: Diagram of create-cairn-site connecting five assets you own
  accDescr: create-cairn-site sits outside a group of five assets it creates or connects: the GitHub repository, the GitHub App, the Cloudflare account it signs in to rather than creates, a domain if you add one, and the sign-in database. The group is labeled as yours, not cairn's.

  tool["create-cairn-site"]

  subgraph yours["Yours, not cairn's"]
    repo["GitHub repository<br/>your content, as markdown"]
    app["GitHub App<br/>created for this site"]
    domain["Domain<br/>if you connect one"]
    subgraph cf["Cloudflare account<br/>1 Worker, 2 databases, 1 bucket"]
      authdb["Sign-in database"]
    end
  end

  tool -->|creates| repo
  tool -->|creates| app
  tool -->|signs in to| cf
  tool -->|connects| domain
  tool -->|writes to| authdb
```

*`create-cairn-site` creates or connects each of these once, then holds none of them.*

`create-cairn-site` builds and connects five things, and every one of them belongs to you, not
to cairn:

- **A private GitHub repository**, where your content lives on GitHub, holding your site's code
  and everything anyone writes.
- **A GitHub App** that publishes on your writers' behalf, so nobody needs a GitHub account of
  their own.
- **A Cloudflare account of your own**, running one Worker, two databases, and a storage bucket
  for images.
- **A domain**, if you connect one.
- **A database of who can sign in**, yours to control.

Nothing here is rented from cairn. If you stopped using cairn tomorrow, your repository still
holds every word anyone wrote, in plain markdown a text editor can open. Cloning that repository
is enough to leave with everything.

## What it costs

Three things stand between you and a finished setup, and two of them are money.

1. **Cloudflare's Workers Paid plan, $5 a month.** That's what running a cairn site on
   Cloudflare costs, from your first deploy: your site runs on Cloudflare's own global network,
   and Workers Paid is how you pay for it. It's billed once per Cloudflare account, not once per
   site, so a second site on the same account adds nothing
   ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), as of
   2026-08-11).
2. **A payment method, only if you connect your own domain.** A domain name costs roughly $10 to
   $15 a year for the common endings, paid to whichever registrar you buy it from. Cloudflare
   sells domains at cost and shows the exact price before you pay
   ([Cloudflare Registrar](https://www.cloudflare.com/products/registrar/), as of 2026-08-11); if
   you already own a domain, there is nothing new to buy.
3. **A Cloudflare API token you create yourself, at no cost, but read every row before you save
   it.** You aren't asked for one during your first run; it's the domain step,
   [Own your domain](./own-your-domain.md), that first opens Cloudflare's own "create token" page
   with the permissions it needs already selected, and asks you to paste the finished token back.
   If you later connect to [Workers Builds](./own-your-domain.md#connect-to-workers-builds), that
   step asks for a second, wider token of its own. Either time, Cloudflare's page can render one
   of those permission rows as an empty, unselected control instead of an error when something
   goes wrong on its end, and a token missing a permission still gets accepted here: it only fails
   later, at the specific step that needed the missing permission. Before you click Create Token,
   glance down the list and confirm every row it asked for is actually filled in.

Those two come to about $6 a month for a small site on its own domain: the $5 Workers Paid plan,
plus roughly $1 a month averaged over a year's domain renewal. One more item is not confirmed.
Putting your site on your own domain issues a certificate for that domain, and Cloudflare does not
say whether that certificate is included in your plan or charged as an add-on (as of 2026-08-11).
Your first bill is where it would show up. The tool prints these same figures before it asks you
anything.

## What a second editor needs

Adding an editor, a co-owner, anyone besides you, takes two things beyond what your site already
has: a domain of your own connected, and Cloudflare's Email Sending turned on for it. Sign-in mail
sends from that domain, so a site still living only at its `workers.dev` address has nowhere to
send it from yet. Until you're ready to add someone, skip both: your site works exactly the same
either way, you just stay the only one who can sign in. [Own your domain](./own-your-domain.md) is
where you connect a domain and turn sign-in email on together, when you're ready.
[Invite your editors](./invite-editors.md) picks up from there.

## What needs a developer

Everything above, you do yourself, with no code. A few things genuinely need someone who can
write and ship code:

- **Rotating the GitHub App's private key.** This is a terminal-and-`wrangler` task; see
  [Rotate the GitHub App key](../extend/rotate-the-github-app-key.md).
- **Updating the cairn engine itself** to pick up a new release. See
  [Upgrade cairn](../extend/upgrade-cairn.md).
- **Adding functionality beyond what cairn ships**: custom admin screens, a second kind of
  sign-in, anything specific to your organization. That whole world is
  [the extend track](../extend/README.md); hand a developer that link.

[Is it working?](./is-it-working.md) routes several more conditions to "Ask a developer." Most of
those only show up on a site someone has customized or built by hand, not on the default site
`create-cairn-site` gives you; that page says which is which as it covers each one.

Everything else in this track, from first setup through day-to-day running, is yours to do
alone.

## Handing this off, or leaving with your content

Two accounts hold everything: GitHub and Cloudflare. Add a successor as a collaborator on the
GitHub repository directly through GitHub, and add them to your Cloudflare account the same way.
Add them as an editor on the site itself through [Invite your editors](./invite-editors.md), so
they can sign in and write once they have access to both.

Because every entry is a plain markdown file in a git repository, with no database that only
cairn can read, leaving is never more complicated than cloning that repository.
