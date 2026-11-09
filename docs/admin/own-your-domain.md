# Own your domain

A cairn site serves from a domain that is active on Cloudflare, and setup connects that domain for you. This page gets a domain you already own onto Cloudflare before you run setup, explains what setup then does with it, and states what the sign-in email it turns on does to your domain's mail. You can stop after any part.

The page is for the person who is about to run setup, or already has, and wants to use a domain registered somewhere else. It leaves the run itself to [Create your site](./create-your-site.md), and a part that stalls to [Recover a setup that stopped](./setup-recovery.md).

## Prerequisites

- A domain that is already registered, at any registrar. This page connects a domain you own and doesn't sell you one. To buy one, [register it with Cloudflare](https://developers.cloudflare.com/registrar/get-started/register-domain/) and skip to [Choose the site's address](#choose-the-sites-address), because a domain registered there is active already.
- Access to the domain's DNS settings and its nameservers at your registrar. If you don't control the domain's DNS yourself, stop here and talk to whoever does: an agency, a previous developer, or an IT contact. Guessing or forcing past this risks your organization's existing mail.
- A domain that is active under your own Cloudflare account. A domain already active under someone else's account doesn't appear in yours, so setup reports that your account has no domains. The fix is for that person to remove it from their account.

## Add your domain to Cloudflare

Cloudflare calls the settings and records it holds for your domain a zone, and a nameserver is the server that answers questions about your domain. Your domain keeps using its old nameservers until you change them, and the change is the step that takes time. Setup checks that the zone is active, and it stops with a note that the domain is still being added when it isn't.

1. In the Cloudflare dashboard, add your domain, following [Cloudflare's guide to adding a domain](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/). Adding it creates the zone and gives you a pair of nameservers.
2. Review the DNS records Cloudflare lists for the zone before you continue. [Carry over existing DNS records](#carry-over-existing-dns-records) explains why.
3. At your registrar, the company where you bought the domain, replace the domain's nameservers with the pair Cloudflare gave you.
4. Wait until Cloudflare shows the domain as active.

The change spreads across the internet gradually, which is called propagation, and it can take hours. If you run setup before then, it stops at the first Cloudflare check, creates nothing, and resumes when you run it again.

### Carry over existing DNS records

DNS records are the entries that tell the internet where your domain's web traffic and mail go. Your domain probably carries records that have nothing to do with cairn, and mail records are the most common. Setup never edits or deletes a record your zone already holds. It refuses an address that already has DNS records or a Worker, and it adds only the records the site needs.

Cloudflare, not setup, brings records into a new zone when you add a domain, and its scan can miss a record. Compare the list with what you know before you switch nameservers, since mail that depends on a record the zone lacks stops working when the switch takes effect. An owner with live mail is the most exposed here, so read [Turn on sign-in email](#turn-on-sign-in-email) as well.

### You know it worked when

Cloudflare shows the domain as active, and setup's first Cloudflare check passes with no stop about a pending domain. A domain you registered through Cloudflare is active at once, with nothing to copy.

## Choose the site's address

Setup serves the site at your bare domain and its `www` form, such as `example.com` and `www.example.com`. On the summary, you can change this to a subdomain of the domain, such as `blog.example.com`, which gets no `www`. Setup checks the address in the opening and again when you change it, and it refuses one that already points somewhere else. If the account has several active domains, setup asks which to use.

When the site's HTTPS certificate is ready, setup confirms that your address answers over HTTPS. This can take up to 15 minutes. If it takes longer, setup stops with the work kept, and running it again resumes at that step.

## Turn on sign-in email

You don't turn sign-in email on yourself, because setup does it. It onboards your site's address for Cloudflare's email sending, and the admin sends each sign-in link from `no-reply@` that address. Everyone other than you signs in through such a link, so [Invite editors](./invite-editors.md) depends on it.

```mermaid
flowchart LR
  accTitle: Diagram of one Cloudflare zone carrying two unrelated record groups
  accDescr: One Cloudflare zone holds two unrelated groups of records. Your organization's existing mail records sit beside cairn's sending records. Only cairn's records carry the sign-in mail from no-reply@yourdomain.

  subgraph zone["Your domain's Cloudflare zone"]
    existing["Existing mail records<br/>left unchanged"]
    added["cairn's sending records<br/>added at email onboarding"]
  end

  added -->|sends| signin["no-reply@yourdomain<br/>sign-in mail"]
```

*One zone holds both groups of records. Setup leaves the existing mail records unchanged. When the domain has no DMARC policy yet, Cloudflare adds one for the whole domain, so it also governs mail your organization sends.*

Two different things share this one domain, and they are easy to conflate:

- The address your site sends sign-in mail from is `no-reply@yourdomain`. It uses Cloudflare's sending service.
- Your organization's existing mail on the domain stays as it is and has nothing to do with the site's sign-in mail.

A DMARC record is a mail-policy entry at `_dmarc.yourdomain`. When your domain has none, Cloudflare's onboarding adds one with the policy `p=reject`, and when it already has one, onboarding keeps it unchanged. A `p=reject` policy asks receivers to reject mail that claims to come from your domain without authenticating, and it covers every sender on the domain, not only cairn. Before you run setup, list the services that already send as your domain, such as a newsletter tool, a ticketing system, or a mailing list. Follow each one's instructions for authenticating against your domain's mail records, and do the same for any you add afterward. Otherwise a receiver rejects its mail.

A new domain has no sending history, so mail providers can take a while to trust it. If someone's first sign-in link doesn't arrive at once, this delay is the usual reason. It isn't a sign that anything is broken.

The running site reads none of your SPF, DKIM, or DMARC records, so a broken record never shows up as a site error. Only `cairn doctor` looks at them. It checks that a DMARC record with a real policy exists, that an SPF record names Cloudflare's mail servers, and that a DKIM record answers under one of a short list of common selector names. A DKIM record under any other name goes unseen, so a missing result there doesn't prove the record is absent.

### You know it worked when

Setup emails your first sign-in link to the address you gave it, and the done screen says so. [Invite editors](./invite-editors.md) covers getting other people signed in.

## See also

- [Before you start](./before-you-start.md) covers the cost of a domain and of sign-in email.
- [Invite editors](./invite-editors.md) adds the people who sign in with the new email.
- [Recover a setup that stopped](./setup-recovery.md) covers a domain step that stalls.
