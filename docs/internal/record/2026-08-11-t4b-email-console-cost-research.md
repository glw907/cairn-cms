# T4b research brief: email, the console, and honest cost (2026-08-11)

Banked ahead of the T4b design sitting, so that sitting starts from evidence rather than from a
blank page. Produced by a nine-agent research workflow (Geoff opted in): five research lenses, then
independent adversarial verification of every claim that was not directly observed, then synthesis.

**Read the verification result before the brief itself: six of the eight verified claims were
REFUTED or materially corrected.** That is the point of the adversarial pass, and it means the raw
research would have misled this pass badly. The corrections are folded into the brief below; where
a verdict contradicted a lens, the verdict won.

The headline correction: the research initially found a free path for magic-link mail (Cloudflare's
"verified destination addresses" are free on any plan). Verification established that it does not
fit cairn, because each editor must personally click a Cloudflare verification link, the cap is 200
addresses per account, and the sending domain must run Email Routing, which takes over the domain's
root MX records and so breaks any mail the owner already receives there. Plan on Workers Paid.

---

# T4b Research Brief: Email, Console, and Honest Cost

Prepared 2026-08-11 for the T4b design sitting. Every documented claim below carries a URL. Anything marked **inferred** is my reasoning, not a Cloudflare statement, and must not be built on without an empirical check.

---

## 1. The money answer

### Can a cairn site send magic-link email on the free plan?

**No.** Not in any form that works for real editors.

The governing sentence, from the Email Service pricing page (page states "Last updated Jun 9, 2026"):

> "Sending to arbitrary recipients requires the Workers Paid plan."

And the plan-comparison table row on the same page:

> `| **Outbound emails (Email Sending)** | Not available | 3,000 included per month, then $0.35 per 1,000 emails |`

(https://developers.cloudflare.com/email-service/platform/pricing/)

A magic-link CMS mails whoever the owner adds as an editor. Those are arbitrary recipients by definition. The plan gate is therefore hit on day one, at zero volume, before any per-email cost exists.

### The free path exists and does not fit

The same pricing page also says:

> "Sending to verified destination addresses in your account is free on all plans, including when only Email Routing is configured."

The limits page corroborates it:

> "Sends to verified destination addresses are always free: they do not count toward your monthly quota or your daily sending limits, on any plan, including when only Email Routing is configured. You can only send from your routing domains."

(https://developers.cloudflare.com/email-service/platform/limits/)

This looked, at first read, like it exactly matched cairn's shape, because a cairn site's editor roster is a small known list. Adversarial review refuted that reading on three independent grounds, any one of which is fatal:

1. **Verification is by the recipient, not the admin.** The routing-addresses page: "Cloudflare sends a verification email to that address. Open the email and select **Verify email address** to activate it." The site owner cannot enroll an editor on their behalf. Every editor would receive a Cloudflare verification email in a product they have never heard of, before cairn could ever mail them a magic link. There is also a first-editor chicken-and-egg.

2. **The free path seizes the domain's inbound mail.** "You can only send from your routing domains," and Email Routing installs MX records on the **root** domain. The domains page states flatly: "Email Routing requires Cloudflare MX records", "Remove or update existing MX records", "**Cannot use Email Routing with external mail servers**" (https://developers.cloudflare.com/email-service/configuration/domains/). A non-technical owner who already receives mail at that domain through Google Workspace, Fastmail, or an ISP would lose it. This is the binding constraint for cairn's actual user, and it is worse than the plan question.

3. **The docs contradict themselves on Workers Free.** The prose says "free on all plans." The table one paragraph below says "Not available" for Workers Free, with no footnote or carve-out. Reconciling those requires reading the table cell as scoped to the metered product, which is an inference nobody at Cloudflare has written down.

**Design consequence:** treat the verified-destination path as a possible future optimization requiring an empirical spike, never as chapter 3's foundation. Chapter 3's story is Workers Paid.

### What chapter 3's admission copy must say, before the owner starts

Stated plainly, in the owner's language, at the top of the chapter and not after a failure:

- Sign-in email costs money. The floor is **$5 US per month** for the Cloudflare Workers Paid plan. That is a plan subscription, not a per-email charge, and it applies whether the site sends five emails a month or five hundred.
- This is not a scaling upgrade. Without it, nobody can sign in to the CMS at all.
- The domain name is a separate annual cost the owner pays regardless of who hosts the site, roughly $10 to $15 a year for a `.com`.
- Everything else on a small site sits inside free allowances.
- Realistic all-in: **about $5 per month, plus about $1 per month amortized for the domain.**

The copy must also not promise 3,000 emails in month one. The limits page:

> "New accounts start with a conservative daily quota and scale up over time based on your sending behavior, deliverability rates, and account standing. Limits are applied per account and may be adjusted automatically as your reputation improves."

No starting number is published. The Workers API defines `E_DAILY_LIMIT_EXCEEDED` ("Daily sending quota reached"). Say "3,000 a month once your account is established" or say nothing numeric.

Finally, Email Sending is **Beta** (product index lists it "Beta for outbound transactional emails"; public beta announced 2026-04-16). Render every price in the CLI as an "as of 2026-08-11" figure with a link, never as a hardcoded promise.

### Full cost table

All figures documented at the cited URLs unless marked.

| Resource | Free allowance | What it costs past that | URL |
|---|---|---|---|
| Domain registration | none, always paid | Cloudflare Registrar sells "at cost": "You only pay what is charged by registries and ICANN. No markup. No surprise fees." Roughly $10.46/yr for `.com` today, rising to roughly $11.17/yr after a reported Nov 1 2026 Verisign increase. **Dollar figures are aggregator-sourced, inferred, not from a Cloudflare page.** | developers.cloudflare.com/registrar/ |
| Cloudflare zone (DNS, Universal SSL, CDN, DDoS) | Free plan, no documented time limit | $0 | cloudflare.com/plans/ |
| Workers Custom Domain + its auto-issued Advanced Certificate | **Unresolved. See below.** | Advanced Certificate Manager is listed as a "Paid add-on" on Free/Pro/Business/Enterprise, widely reported at $10/month per domain | developers.cloudflare.com/workers/configuration/routing/custom-domains/ and /ssl/edge-certificates/advanced-certificate-manager/ |
| Workers requests | 100,000 per day (Free) | Paid: $5/mo minimum, 10 million requests included, then $0.30 per additional million | developers.cloudflare.com/workers/platform/pricing/ |
| Workers CPU time | **10 ms per HTTP request** (Free) | Paid: 30 s default, up to 5 min; 30 million CPU-ms included per month, then $0.02 per additional million | developers.cloudflare.com/workers/platform/limits/ |
| D1 rows read | 5 million per day (Free) | Paid: 25 billion/month included, then $0.001 per million | developers.cloudflare.com/d1/platform/pricing/ |
| D1 rows written | 100,000 per day (Free) | Paid: 50 million/month included, then $1.00 per million | same |
| D1 storage | 5 GB total | $0.75 per GB-month past 5 GB | same |
| R2 storage | 10 GB-month (Standard class only) | $0.015 per GB-month | developers.cloudflare.com/r2/pricing/ |
| R2 Class A ops | 1 million/month | $4.50 per million | same |
| R2 Class B ops | 10 million/month | $0.36 per million | same |
| Email Sending, outbound | **Not available on Workers Free** | Paid: 3,000 per account per month "aligned with your Cloudflare subscription billing cycle", then $0.35 per 1,000 | developers.cloudflare.com/email-service/platform/pricing/ |
| Email Routing, inbound | Unlimited, Free and Paid | $0 | same |

Quota accounting detail worth stating once in the copy: "Emails that hard-bounce or are otherwise accepted by Email Service count toward the quota. Emails rejected at the API boundary, including sends blocked by the suppression list, do not count toward the quota."

### The certificate question is the one open number, and it is $10/month if it goes the wrong way

The Workers docs say: "Creating a Custom Domain will also generate an Advanced Certificate on your target zone for your target hostname." No price, no plan note. The ACM docs list ACM as a paid add-on across all plans and never mention Workers Custom Domains. I fetched both pages today and neither cross-references the other. Community and third-party sources say custom domains work on the free plan with certificates "issued on your behalf" at no extra cost, which is consistent with every real deployment, but no Cloudflare page states it.

**This is a one-glance human check, not a research problem.** Someone with dashboard access opens Billing and Subscriptions on an account already running a Workers Custom Domain on a Free-plan zone (the estate already has ecxc.ski and 907.life) and reads whether an Advanced Certificate Manager line item exists. Do that before chapter 3 states a number. My inference is that the auto-issued certificate is bundled and free, but I will not put an inference in owner-facing money copy.

### The second, quieter cost story

Even setting email aside, the Workers Free plan's **10 ms CPU per request** is the most plausible first wall a cairn site hits, and it produces an error, not a bill. **Inferred:** a SvelteKit SSR render doing markdown-to-HTML plus JSON parsing can exceed 10 ms of pure compute on a cold request, yielding Error 1102. I have no measurement of a cairn page's actual CPU time and none of the research produced one. If that inference holds, Workers Paid is forced by reliability as well as by email, which strengthens rather than weakens the chapter's honest framing. Worth one measurement during the pass, not worth asserting in copy until measured.

### Realistic monthly bill, small site, few hundred visitors a day

**$5.00.** Requests, CPU, D1 rows, and email volume all sit deep inside the Paid plan's included allowances at that scale. Add roughly $0.90/month if the owner amortizes a `.com`. Add $10/month only if the certificate question resolves against us.

---

## 2. Email onboarding as a chapter

### Prerequisites the chapter inherits or must enforce

1. **The domain is a Cloudflare zone using Cloudflare DNS.** Documented as a hard requirement: "You must be using Cloudflare DNS to use Email Service" (https://developers.cloudflare.com/email-service/get-started/send-emails/). Chapter 2 delivers this. The email chapter should verify it rather than assume it.
2. **The account is on Workers Paid.** Not automatable. See the human gate below.

### The steps, and which are API-driven

**Step A. Confirm Workers Paid. Forces a browser click.**

Nothing in the API or CLI subscribes an account to Workers Paid. This is a dashboard billing action with a credit card. It is the chapter's one unavoidable `ask-someone`/`act` handoff. Design the chapter so this is the *first* step and so the owner learns the price before any work happens, not after a send fails.

**Inferred, needs checking:** whether the account's plan is readable through the API so the CLI can detect the state rather than asking. I did not find a documented account-plan-read endpoint in this research, and the sandbox blocked my attempt to query the live account. Treat "can the CLI detect Workers Paid" as unverified.

**Step B. Onboard the sending domain. Fully API-driven.**

This is the single most important build finding, and it contradicts both Cloudflare's own prose docs and one of cairn's two in-repo guides.

The wrangler command group is real and live. I ran it today against `wrangler@latest`:

```
wrangler email sending list [domain]      List Email Sending subdomains  [open beta]
wrangler email sending settings <domain>  Get Email Sending settings for a domain  [open beta]
wrangler email sending enable <domain>    Enable Email Sending for a zone or subdomain  [open beta]
wrangler email sending disable <domain>   Disable Email Sending for a zone or subdomain  [open beta]
wrangler email sending send               Send an email using the Email Sending builder  [open beta]
wrangler email sending send-raw           Send a raw MIME email message  [open beta]
wrangler email sending dns                Manage Email Sending DNS records  [open beta]
```

`wrangler email sending settings --help` takes a required `domain` positional and an optional `--zone-id` ("Zone ID (optional, skips zone lookup if provided)"). Every line is tagged `[open beta]`.

Cloudflare's rendered prose docs describe onboarding as dashboard-only ("In the Cloudflare dashboard, go to Compute > Email Service > Email Sending. Select **Onboard Domain**...") and the wrangler commands reference page does not list an email section at all. **The prose is behind the product.** Build against the CLI and the API, not the prose.

The underlying REST endpoint, confirmed from the API reference today:

- **`POST /zones/{zone_id}/email/sending/subdomains`**, body `{ "name": string }`, where `name` is "The subdomain name. Must be within the zone."
- The SDK's own doc comment (cloudflare-typescript, Stainless-generated from the OpenAPI spec) states: "Creates a new sending subdomain or re-enables sending on an existing subdomain that had it disabled. If zone-level Email Sending has not been enabled yet, the zone flag is automatically set when the entitlement is present."

Posting the apex domain name onboards the zone and the subdomain in one call. There is no separate `domains` resource; `/api/resources/email_sending/subresources/domains/` returns 404.

**Step C. Cloudflare writes the DNS records. Automatic, no owner action.**

The get-started page lists what onboarding adds:

> "MX records to route bounce emails to Cloudflare" / "TXT record for SPF to authorize sending emails" / "TXT record for DKIM to provide authentication for emails sent from your domain" / "TXT record for DMARC on `_dmarc.yourdomain.com`"

Placement matters and is documented: the MX, SPF, and DKIM records go on a **`cf-bounce.` subdomain**, not the apex. DMARC goes at `_dmarc` on the apex. Because the zone is already Cloudflare-authoritative, Cloudflare writes them into its own zone. Two things follow. First, the owner is never asked to paste a record anywhere. Second, this does **not** take over the owner's inbound mail, unlike the Email Routing path in section 1.

The DMARC record is auto-created with a strict default. The domains page shows example content `v=DMARC1; p=reject;` as something Cloudflare "automatically configures." **Surface this to the owner.** A strict reject policy silently drops legitimate mail if they later add another sending source on the same domain, such as a newsletter tool. That is a real future support burden created by a step cairn ran on their behalf.

Timing, documented: "DNS changes can take up to 24 hours to propagate globally, but usually complete within 5-15 minutes for domains using Cloudflare DNS." The troubleshooting section repeats it: "Cloudflare domains propagate faster than external domains." **This matters for section 4:** the email chapter's wait is minutes, not days.

**Step D. Poll for readiness. API-driven.**

`GET /zones/{zone_id}/email/sending/subdomains/{subdomain_id}`, or `wrangler email sending settings <domain>`.

**Step E. Rewrite the sender address in the scaffolded site. Local file edit.**

The scaffold ships `email: { from: 'cms@showcase.test' }` at `template/src/theme/cairn.config.ts:454`, and nothing in chapter 1 or the in-flight chapter 2 rewrites it. A site deployed through both chapters today still has a placeholder sender. The precedent to mirror is `writePublicOrigin` in `packages/create-cairn-site/src/cloudflare/config.mjs`, called from `chapter.mjs:231`, which rewrites `PUBLIC_ORIGIN` after deploy. This is a live unaddressed gap, not new scope.

**Step F. Test send. API-driven, from the CLI process itself.**

`POST /accounts/{account_id}/email/sending/send` with `{ from, to, subject, text }`. Precedent already in the repo at `src/lib/doctor/check-send.ts`, with an in-file note that the endpoint and payload were "re-verified against the Cloudflare API reference, 2026-07-07." The get-started page confirms the same path.

**Step G. Redeploy.** The `send_email` binding named `EMAIL` is already declared in both `examples/showcase/wrangler.jsonc:25` and `template/wrangler.jsonc:25`. Nothing to add.

### Credentials, per step

| Step | Credential | Confidence |
|---|---|---|
| Workers Paid subscription | Dashboard login, payment method | Certain, no API |
| Onboard sending domain | Cloudflare API token with zone access plus an Email Sending permission | Path is zone-scoped and standard Bearer auth. **The permission-group name is inferred.** |
| Poll status | Same token | Same |
| Test send | Same token, account-scoped path | Documented endpoint, permission name inferred |
| Redeploy | Existing wrangler auth from chapter 1 | Certain |

On the permission name: third-party sources consistently say the dashboard shows **"Email Sending: Edit"**, and one describes it grouped under an "Email & Messaging" sub-scope. I could not find it in Cloudflare's own `fundamentals/api/reference/permissions/` page, and the API reference page for the subdomains-create method lists no required permissions. **Confirm by minting a scoped token in the dashboard and reading the generated permission group before the CLI hardcodes a scope request.** Note also the scope ambiguity: the subdomains path is zone-scoped but the permission may be account-scoped, and the send endpoint is account-scoped.

### The complete status vocabulary

**There is no status enum.** This is the finding that most changes what the chapter should be built to do.

The `SubdomainGetResponse`, `SubdomainCreateResponse`, and `SubdomainListResponse` types are identical and contain no `status` field:

```
{ enabled: boolean; name: string; tag: string; created?: string;
  dkim_selector?: string; modified?: string; return_path_domain?: string;
  preview_enabled?: boolean }
```

The paired DNS endpoint `GET /zones/{zone_id}/email/sending/subdomains/{subdomain_id}/dns` returns a plain list of `{ content?, name?, priority?, ttl?, type? }` with no per-record status.

The dashboard's only onboarding-adjacent badge is Locked/Unlocked, and the docs say both mean success: "Each record shows either a Locked or Unlocked status. Both states indicate the record is configured correctly; the status reflects whether Email Service is managing the record." For Email Sending specifically, records stay Locked: "Email Sending records on the cf-bounce subdomain stay managed by Email Service for the lifetime of the domain configuration."

So the complete observable state space, at rest, is three values:

1. No subdomain resource exists for the domain.
2. Subdomain exists, `enabled: false`.
3. Subdomain exists, `enabled: true`.

**A design that assumes a richer pending/verifying/failed vocabulary is building against a fiction.** The rest of the state has to come from send-time errors.

### Send-time error codes, and the recommended kind mapping

Documented on https://developers.cloudflare.com/email-service/api/send-emails/workers-api/ ("Last updated Jun 25, 2026"), verbatim rows collected across the research:

| Code | Documented meaning | Documented cause |
|---|---|---|
| `E_SENDER_NOT_VERIFIED` | Sender domain not verified | Attempting to send from unverified domain |
| `E_SENDER_DOMAIN_NOT_AVAILABLE` | Domain not available for sending | Domain not onboarded to Email Service |
| `E_RECIPIENT_NOT_ALLOWED` | Recipient not in allowed list | Recipient address not in `allowed_destination_addresses` |
| `E_TOO_MANY_RECIPIENTS` | Combined recipients exceed 50 limit | More than 50 across to/cc/bcc |
| `E_DAILY_LIMIT_EXCEEDED` | Daily sending quota reached | Per-account daily ramp |

**I could not enumerate this table exhaustively.** The rows above were harvested across several lenses' fetches of the same page and there may be codes none of them quoted. Fetch the full table once during implementation and treat mine as a partial.

Recommended mapping onto the CLI's existing three-kind catalogue taxonomy (`'wait' | 'act' | 'ask-someone'`, per `packages/create-cairn-site/src/cloudflare/catalogue.mjs`):

| Condition | Kind | Next line |
|---|---|---|
| Zone not on Cloudflare DNS | `act` | Finish chapter 2 first |
| Account not on Workers Paid | `act`, or `ask-someone` when a different person holds billing | Open the dashboard, upgrade, re-run |
| Token lacks Email Sending permission | `act` | Re-mint the token with the named permission |
| Subdomain absent after a create call | `act` | Re-run; the CLI creates it |
| Subdomain present, `enabled: false` | `wait` | Re-run in a few minutes |
| `E_SENDER_DOMAIN_NOT_AVAILABLE` or `E_SENDER_NOT_VERIFIED` shortly after onboarding | `wait` first, escalating to `act` after a bounded number of attempts | DNS is still settling; docs say 5 to 15 minutes on Cloudflare DNS |
| Same errors well past the propagation window | `act` | Onboarding did not take; re-run enable, then check the dashboard |
| `E_DAILY_LIMIT_EXCEEDED` | `wait` | New accounts ramp; try again tomorrow, or request an increase |
| `E_TOO_MANY_RECIPIENTS` | Not reachable for magic-link mail | Ignore |
| `E_RECIPIENT_NOT_ALLOWED` | Not reachable | cairn does not set `allowed_destination_addresses`; if this ever fires, something else is wrong |

The `'wait'` precedent already exists in the catalogue and should be copied verbatim in tone: `delegation-pending` (catalogue.mjs:352-365) and `hostname-propagating` (catalogue.mjs:383-393) both reassure "Your site is untouched and still working" and exit 0 telling the owner to re-run later.

### The in-repo documentation contradiction this pass must close

Two shipped guides disagree, and one is now provably wrong:

- `docs/guides/cloudflare-readiness.md:106-113`: "Onboard it once with `wrangler email sending enable <domain>`, then redeploy."
- `docs/guides/deploy-to-cloudflare.md:160-166`: "Email Sending has no create command: onboard the sending domain from the dashboard instead, under **Compute > Email Service > Email Sending > Onboard Domain**..."

The first is correct as of today's live `--help`. The second must be corrected in this pass. Note that the second guide's description of the records it adds ("the `cf-bounce` MX, SPF, DKIM, and DMARC records") is accurate and should be kept.

---

## 3. The Routing versus Sending correction

### What is actually true

Email Sending and Email Routing are two products under one Email Service umbrella, separately onboarded and separately plan-gated. Sending is outbound and needs Workers Paid. Routing is inbound, free on both plans.

The project's durable note in CLAUDE.md is wrong or imprecise on three points.

**Point one, the shared error string.** The note says an un-onboarded sending domain and an unverified destination throw the identical string `E_SENDER_NOT_VERIFIED`. Current docs list three distinct codes, and the one whose *documented* cause is non-onboarding is `E_SENDER_DOMAIN_NOT_AVAILABLE`, not `E_SENDER_NOT_VERIFIED`. But the note's substance survives, because Cloudflare's docs name **no error code at all** for sending to an address that is not a verified Email Routing destination. Field reports of exactly this trap quote a human-readable payload, `{"error": "Failed to process request", "debug_reason": "destination address is not a verified address"}`, while identifying the real fault as the un-onboarded *sender* domain. So the confusion is real; the shared surface is the human-readable "not a verified address" message, not the code. `src/lib/email.ts:101` already handles this correctly with `errorCode(err) === 'E_SENDER_NOT_VERIFIED' || String(err).includes('not a verified address')`. **Keep that defensive OR.** Do not "simplify" it away on the strength of the three-code table, and do not use `E_RECIPIENT_NOT_ALLOWED` to detect an unverified destination, because that code is documented only for the opt-in wrangler `allowed_destination_addresses` allowlist, which cairn does not set.

**Point two, `EmailMessage` is not Routing's forward call.** `forward()` takes a plain string address: `await message.forward("team@example.com")`. `EmailMessage` is a raw RFC 5322 MIME wrapper used in two unrelated places, the legacy `env.EMAIL.send(new EmailMessage(...))` form for Sending, and as the argument to `message.reply(new EmailMessage(...))` for Routing. cairn's magic-link path uses `env.EMAIL.send()` with the structured object form and should never touch `EmailMessage`.

**Point three, the note omits the DNS placement difference**, which is the practically important one. Sending writes MX, SPF, and DKIM under `cf-bounce.<domain>` plus DMARC at `_dmarc`, and leaves the apex mail alone. Routing writes MX and SPF on the **apex** plus DKIM at `cf2024-1._domainkey`, and cannot coexist with an external mail server. That is the difference that can break an owner's inbox.

### Replacement paragraph, ready to paste

> **Durable gotcha (Cloudflare email).** Email *Sending* and Email *Routing* are separate products under one Email Service umbrella. Sending is outbound, uses `env.EMAIL.send({to, from, subject, html, text})`, requires the Workers Paid plan for arbitrary recipients, and requires the `from` domain to be onboarded, which `wrangler email sending enable <domain>` does today (open beta, confirmed live 2026-08-11) despite Cloudflare's prose docs describing the step as dashboard-only. Onboarding writes MX, SPF, and DKIM records under a `cf-bounce.` subdomain plus a strict `p=reject` DMARC record at `_dmarc`, and leaves the apex mail untouched. Routing is inbound, is free on any plan, forwards with `message.forward("addr")` taking a plain string, and takes over the domain's **apex** MX records, so it cannot coexist with an external mail provider on the same domain. Sending to an already-verified Routing destination is free on any plan and exempt from quota, but the recipient must click a Cloudflare verification link first, so it is not a usable path for editor sign-in. The failure modes share a confusing surface: a send from an un-onboarded domain can surface an error whose message speaks of a non-verified *address* even though the fault is the *sender* domain, which is how the ecxc outage hid. The documented codes are `E_SENDER_NOT_VERIFIED` ("Sender domain not verified"), `E_SENDER_DOMAIN_NOT_AVAILABLE` ("Domain not onboarded to Email Service"), and `E_RECIPIENT_NOT_ALLOWED`, which applies only to the opt-in `allowed_destination_addresses` wrangler allowlist that cairn does not set. Cloudflare documents no code for the unverified-Routing-destination case, so `src/lib/email.ts` keeps its `|| String(err).includes('not a verified address')` fallback deliberately.

---

## 4. The console

### What `loopback.mjs` already provides

At `packages/create-cairn-site/src/github/loopback.mjs`:

- `server.listen(0, '127.0.0.1', ...)`, an ephemeral port bound to loopback only.
- `waitFor(pathname, { timeoutMs, landingHtml })`, which matches one exact literal pathname, resolves once, times out, and closes.
- `serveForm`, a single-shot form-serving builder.
- Clean lifecycle management around all of the above.

Callers pass fixed strings like `'/callback'` and `'/manifest'` (`src/github/oauth.mjs:105`, `src/github/manifest.mjs`, `install.mjs:120`).

### What it precisely does not provide

1. No unguessable-path generation. Paths are caller-supplied literals.
2. No `Host` header validation. Nothing in the file reads `req.headers.host`.
3. No `Origin` validation. Nothing reads `req.headers.origin`.
4. No CSRF or state token of its own. The state check is done by the caller: `src/github/oauth.mjs:104,125` generates `randomBytes(16).toString('hex')` and rejects a mismatched `state` on return.
5. Only one `pendingWait` slot at a time. Sequential, not concurrent multi-route serving.
6. Plain HTTP only. Fine on loopback.
7. `waitFor` and `serveForm` are single-shot builders, not a routing table. A multi-page console needs new routing logic layered on `http.createServer`, not a bent `waitFor`.

### What a console needs on top

A route table over `http.createServer`. An unguessable path prefix generated per run, which works structurally because `waitFor`'s matching is exact-string. A `Host` header guard, since DNS rebinding is the realistic attack on a loopback server that holds nothing but is nonetheless driving privileged CLI actions. A status surface that updates without the owner reloading, which is either server-sent events or a meta-refresh. And a rendering of the same state machine the CLI already prints, so the two never disagree.

### Should it retrofit the GitHub chapter's pages?

**No, not in this pass.** The GitHub pages are one-shot OAuth and manifest callbacks whose entire job is to catch a redirect, say "you can close this tab," and shut down. A console is a long-lived status surface that must survive polls and re-renders. Different lifecycle, different security surface, different failure modes. Retrofitting the GitHub pages onto a console framework is a cosmetic consistency pass that belongs after the console exists and has proven its shape, not before.

### The recommendation, and a challenge to the console's premise

**The console's justifying wait is not email onboarding.**

Email onboarding on a Cloudflare-DNS domain is documented as "usually complete within 5-15 minutes," with the records written by Cloudflare into its own zone rather than pasted by the owner into a registrar. That is a spinner with a poll loop, not a come-back-tomorrow experience. The genuinely long, genuinely blocking wait in this CLI's life is **nameserver delegation in chapter 2**, which runs hours to days and already has a catalogue row (`delegation-pending`) built around re-running the CLI later.

So the honest shape is one of two, and the design sitting should pick deliberately:

**Option A, recommended.** Build the email chapter with an in-terminal poll loop and no console. Ship the `'wait'` catalogue rows that already work. Defer the console to its own pass, scoped explicitly to the delegation wait, where it has a real justification.

**Option B.** Build the console now, but scope it to delegation and let the email chapter reuse it incidentally. This costs more and lands a new HTTP surface in the same pass as a new provisioning chapter.

If the console is built, the shape is a new module, not an extension of `loopback.mjs`. Extract the port-binding and lifecycle idiom into a shared helper, then build a small route table on top of `http.createServer` in something like `src/console/`. Give it a per-run random path prefix, a `Host` guard that accepts only `127.0.0.1:<port>` and `localhost:<port>`, and a single long-poll or SSE status endpoint. Leave `loopback.mjs`'s existing single-shot API untouched so the GitHub chapter does not move.

---

## 5. What the pass must NOT assume

Blunt list. Every item here is either unresolved, inferred, or a place the vendor documentation contradicts itself.

**Cost and plan**

1. **Do not assume the free verified-destination path is viable.** It requires the recipient to click a Cloudflare verification link, it requires Email Routing on the domain, and Email Routing seizes the apex MX records. The Workers Free question is separately unsettled because the pricing page's prose and its own table disagree on the same page on the same day. If the design wants this path, it needs an empirical spike on a throwaway Workers Free account before any task depends on it.
2. **Do not state a certificate cost.** Whether the Advanced Certificate auto-issued by a Workers Custom Domain triggers the Advanced Certificate Manager add-on charge is undocumented in both directions. Neither Cloudflare page cross-references the other. Resolve with one dashboard billing glance before chapter 3 ships copy.
3. **Do not assume the $0.35-per-1,000 email overage bills on top of the $5 minimum rather than drawing it down.** The Workers pricing page's $5-minimum sentence enumerates Workers, Pages Functions, Workers KV, Hyperdrive, and Durable Objects, and never mentions email. Additive is my inference. No page states it.
4. **Do not promise a new account 3,000 emails in month one.** The daily quota ramp is real, published as qualitative only, and has an escape hatch in a Limit Increase Request Form. No starting number exists in the docs.
5. **Do not treat Email Sending prices as stable.** The product is Beta. Quote with a date and a link.
6. **Do not assume the domain price.** The at-cost model is Cloudflare-documented; the `$10.46` and `$11.17` figures are aggregator-sourced and one reflects a reported Nov 2026 increase. Cloudflare's live per-TLD price list was not located; the URL tried returned 404.
7. **Do not assume a SvelteKit SSR render exceeds 10 ms CPU.** That inference drives a real claim about Workers Free being unusable for reasons beyond email, and nobody has measured it.
8. **Do not assume R2 is a line item.** Whether a cairn site uses R2 at all today was not established. If it does not, saying so is more honest than listing its free tier.
9. **Do not assume the Free plan permits unlimited zones.** Not confirmed. Probably irrelevant for one site, relevant if the CLI ever handles several.

**Onboarding mechanics**

10. **Do not trust the rendered Cloudflare prose docs on onboarding.** They say dashboard-only. The CLI disagrees and the CLI is right today. But equally, do not assume the CLI is stable: every subcommand is `[open beta]` and none appears on the public wrangler commands reference page. Pin a wrangler version range and re-run `--help` before any cairn release that touches this flow.
11. **Do not assume `wrangler email sending settings <domain>` returns anything richer than `enabled`.** Its output shape was not observable from `--help` and no authenticated run was made. Confirm against a live domain before parsing it.
12. **Do not assume `wrangler email sending enable <domain>` is synchronous, or that it returns only after the state is queryable.** Unmeasured. The "5-15 minutes" figure may be generic boilerplate carried over from external-DNS scenarios rather than a measured figure for Cloudflare-to-Cloudflare same-zone record writes.
13. **Do not assume POSTing the apex name to the subdomains endpoint behaves identically to the dashboard's Onboard Domain button.** The SDK comment implies parity ("the zone flag is automatically set when the entitlement is present") but this was not observed against a real account, and a brand-new account without the entitlement may behave differently.
14. **Do not hardcode an API token permission scope.** "Email Sending: Edit" comes from third-party sources only. It does not appear in Cloudflare's own permissions reference, and the API method page lists no permissions. Mint a real token and read the generated permission group.
15. **Do not assume the CLI can detect the account's Workers Paid status.** No account-plan-read endpoint was confirmed in this research.
16. **Do not assume `/accounts/{id}/email/sending/limits` or `/accounts/{id}/email/sending/suppression` exist.** They appear in the vendored Cloudflare plugin skill but not in the Stainless-generated cloudflare-typescript SDK tree, which is derived from the OpenAPI spec. One of the two is stale.
17. **The Workers-binding error table above is partial.** It was assembled from several partial fetches of one page. Fetch the whole table once.

**Error and status semantics**

18. **Do not build a rich status state machine.** There is no status enum. `enabled: boolean` is the only signal, and the DNS listing carries no per-record status.
19. **Do not read the dashboard's Locked/Unlocked as pending-versus-done.** Both mean correctly configured.
20. **Do not remove the `|| String(err).includes('not a verified address')` fallback in `src/lib/email.ts`.** The three-code table does not cover the case that fallback catches, because Cloudflare documents no code for it.
21. **Do not use `E_RECIPIENT_NOT_ALLOWED` to detect an unverified destination.** It is documented only for the opt-in wrangler allowlist, which cairn does not set.
22. **Do not assume `message.forward()` to an unverified destination throws a specific string.** Three sources give three different behaviors: an official doc describing only the dashboard-rule case (rule stays disabled), community reports of a thrown "destination address not verified," and the vendored skill claiming it "fails silently." Resolve by test if any code depends on it. Note that cairn's magic-link path does not use `forward()` at all, so this may be a non-issue.
23. **Do not assume content limits are plan-invariant.** The limits table has no plan column, which is an absent statement, not a documented invariance.
24. **Do not build on the 25 MiB verified-destination message size.** The limits table lists it, but the Workers binding, REST, and SMTP reference pages each state 5 MiB flatly, and SMTP documents protocol-level enforcement (`250-SIZE 5242880`, `552 5.3.4 Message exceeds the 5 MiB SIZE limit`) that cannot vary by recipient. The docs contradict themselves. Irrelevant for magic links; assume 5 MiB if it ever matters.
25. **Note the misleading observability surface:** "Emails sent from a Worker using the send_email binding appear in the Email Routing summary as **dropped**, even when they were delivered successfully." A CLI verification step that checks the wrong dashboard surface will report a false failure.

**Repo state**

26. **Do not assume T4a's `cloudflare` state shape is final.** As of this research the worktree branch is `t4a-domain-chapter` with the API seam (`cloudflare/api.mjs`), widened catalogue, and account-id threading landed, but no `src/cloudflare/domain.mjs` and no zone/DNS/custom-domain step wired into `chapter.mjs`. The memory index and `docs/STATUS.md` were already stale relative to the worktree's git history. Re-verify both rather than trusting them. Also verify no live executor is working this worktree before dispatching anything into it.
27. **Do not assume `updateSite` will merge a new top-level `email` key.** `state.mjs:101-111` deep-merges only `github` and `cloudflare`; any other top-level patch key replaces wholesale. Either nest email state under `cloudflare` to inherit the merge, or extend `updateSite` with a third branch, and decide which explicitly in the plan.
28. **Do not assume the sender-address rewrite is out of scope.** `template/src/theme/cairn.config.ts:454` still ships `cms@showcase.test` and nothing rewrites it. A site that completes chapters 1 and 2 today has a placeholder sender.
29. **Do not look for a `docs/reference` page to update.** create-cairn-site chapters are CLI behavior, not exported library API. The docs obligation is `docs/guides/cloudflare-readiness.md` and `docs/guides/deploy-to-cloudflare.md`, which currently contradict each other on onboarding method, plus whatever cost page chapter 3's copy lives behind.
30. **Do not assume a worktree e2e proves the worktree's engine.** `examples/showcase/node_modules` symlinks back to the main checkout. Reinstall from scratch in the worktree's showcase or rely on CI.

**Unanswered product questions the design sitting must answer**

31. What default from-address does the chapter choose? Same domain as `PUBLIC_ORIGIN` with a fixed local part, or a prompt? Nothing in the code answers this.
32. Does the chapter send its verification test to the owner's own address, and what does it do while waiting for the owner to confirm receipt?
33. Does the chapter refuse to proceed when the owner declines Workers Paid, or does it complete and leave sign-in broken with a clear explanation?
34. Where does the cost admission live: a chapter-3 preamble, a chapter-1 preamble, or both? The owner arguably deserves the number before they scaffold anything.

---

## 6. Recommended pass shape

### Split it. T4b carries email plus cost; the console goes to its own pass.

**Reasoning.**

The three things bundled into "T4b" have nothing in common except adjacency. Email onboarding is a well-bounded provisioning chapter following an idiom the repo already has: `runStep` calls wrapping `defineAction`, each persisting its hop through `updateSite`, with catalogue rows for the failure kinds. It is maybe six to eight steps, one of which is a human billing gate. The cost framing is prose that touches chapters 1, 2, and 3 and one unresolved dollar figure. The console is a new long-lived HTTP surface with its own security requirements, a routing layer `loopback.mjs` does not have, and, critically, **no established justifying wait inside the email chapter**, since email onboarding on a Cloudflare-DNS domain is documented as minutes.

Adding the console to the email pass is textbook accretion by adjacency. It joins because it sits next to the chapter that was thought to need it, and the research says that chapter does not need it. The wait that does justify a console is nameserver delegation, which belongs to chapter 2.

There is a second, independent reason to split. The email chapter's real risk is not code, it is that four of its mechanisms are only verifiable by running them against a live account on a paid plan with a real domain: the `settings` output shape, the create-endpoint-versus-dashboard parity, the token permission name, and the propagation timing. That is a spike-then-build shape. A console task sitting in the same pass would idle behind it or, worse, get built against assumptions while the spike runs.

**Proposed carve.**

- **T4b, email plus honest cost.** The spike (four live checks above, one dashboard billing glance for the certificate question), the email chapter step machine, the sender-address rewrite mirroring `writePublicOrigin`, the new catalogue rows with the wait/act/ask-someone mapping, the corrected durable note in CLAUDE.md, the two contradicting guides reconciled, and chapter 3's cost admission copy. Roughly four to five deliverables. That is already at the top of a comfortable size.
- **T4c, the console.** Scoped to the chapter-2 delegation wait, which is the wait that actually runs hours. Extract the port-binding idiom from `loopback.mjs` into a shared helper, build a route table on `http.createServer`, add the unguessable path prefix and `Host` guard, and leave the GitHub chapter's one-shot pages alone. Retrofitting those is a later cosmetic pass, if ever.

If the design sitting concludes the console must ship with email regardless, then say so explicitly and cut something else from T4b, rather than letting it be a fourth thing that arrived by adjacency.

### Execution prerequisites a human must satisfy before the pass runs

These are blockers. The pass cannot verify its own core mechanisms without them.

1. **A scratch domain, already a Cloudflare zone on Cloudflare DNS, whose inbound mail is expendable.** The T4a queue note already calls for a seeded scratch domain. Confirm it is on Cloudflare nameservers, and confirm nobody is receiving mail at it, since the spike may test the Routing path.
2. **The test account on Workers Paid.** $5. Without it, the email chapter's happy path cannot be exercised at all, and the spike returns only failure modes. Decide whether this is the main `glw907` account (which may already be Paid, worth checking first) or a throwaway.
3. **If the free-path spike is wanted, a second account on Workers Free.** Only needed if the design wants to settle open question 1. If the design accepts the Workers Paid framing, skip it.
4. **A Cloudflare API token minted through the dashboard with whatever the Email Sending permission is actually called, with the generated permission group name recorded.** This is both a prerequisite and one of the spike's answers. Follow the workstation secret flow: `secret-set.sh`, registry entry, no loose files.
5. **One dashboard glance at Billing and Subscriptions** on an account already running a Workers Custom Domain on a Free-plan zone, reporting whether an Advanced Certificate Manager line item exists. This unblocks the cost table and takes a minute.
6. **A decision on whether T4a is merged or still in flight,** and confirmation that no other executor is live in the `t4a-domain-chapter` worktree. T4b's state shape depends on T4a's `cloudflare` object, and the status docs were already stale when this research ran.
7. **A product decision on the default from-address** and on what the chapter does when the owner declines the $5. Neither is answerable from code.
