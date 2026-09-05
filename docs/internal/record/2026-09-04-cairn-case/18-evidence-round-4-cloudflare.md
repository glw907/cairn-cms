# Evidence, round 4: the Cloudflare leg

Research date 2026-09-05 (pages read that day unless a page carries its own date). Every URL
below was fetched directly; nothing here is from memory. Items the round-2 file already banks
(the capability table, the incident postmortems to 2026-02-20, the limits table) are referenced,
not repeated, except where a number moved or a wording was re-confirmed. The WebSearch budget ran
out mid-round, so anything not reachable at a known URL is recorded as not obtained.

## 1. Platform defaults at Free and Workers Paid

| Fact | Exact wording or number | Source | Date |
|---|---|---|---|
| Edge footprint | "348 cities · 8 regions"; "100+ countries" | https://www.cloudflare.com/network/ | read 2026-09-05 |
| Latency | "95% of the world's Internet-connected population is within 50 milliseconds of a Cloudflare data center" | same | same |
| Share of sites, Cloudflare's figure | "Cloudflare powers 1 in 5 sites on the Internet" | same | same |
| Traffic volume, Cloudflare's figure | "handling over 81 million HTTP requests per second on average ... more than 129 million ... at peak"; network "in 330 cities in over 125 countries/regions" (older count than the network page) | https://blog.cloudflare.com/radar-2025-year-in-review/ | data Jan 1 to Dec 2, 2025 |
| TLS | "Free, unshared, publicly trusted SSL certificates to all domains added to and activated on Cloudflare"; "Cloudflare handles issuance, renewal, and deployment automatically"; all plans. This settles the round-1 caveat on "unshared" | https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/ | read 2026-09-05 |
| DDoS | "Standard, unmetered DDoS protection (layers 3-7)", "Available on all plans", automatic detection and mitigation | https://developers.cloudflare.com/ddos-protection/ | same |
| WAF on Free | custom rules yes; rate limiting "Yes (one rule)"; managed rules "Free Managed Ruleset only"; attack score no; leaked-credentials detection "one field"; Security Events "sampled logs only" | https://developers.cloudflare.com/waf/ | same |
| WAF on Pro ($20 zone plan, not Workers Paid) | full WAF Managed Rules, rate limiting; attack score still no | same | same |
| Bots on Free | Bot Fight Mode: "Challenge detected bot traffic across your entire domain with a single toggle"; Super Bot Fight Mode is Pro and up; per-request bot scores Enterprise only | https://developers.cloudflare.com/bots/ | same |
| Workers Free | "100,000 per day" requests; "10 milliseconds of CPU time per invocation" | https://developers.cloudflare.com/workers/platform/pricing/ | page dated 2026-08-28 |
| Workers Paid | "$5 USD minimum per month"; "10 million included per month +$0.30 per additional million"; "30 million CPU milliseconds included per month +$0.02 per additional million" | same | same |
| Static assets | "Requests to static assets are free and unlimited"; cached at the nearest Cloudflare location | https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ ; https://developers.cloudflare.com/workers/static-assets/ | read 2026-09-05 |
| Workers Logs | enabled by `"observability": { "enabled": true }`; Free "200,000 per day", 3-day retention; Paid "20 million included per month +$0.60 per additional million", 7-day retention; head sampling 0 to 1 | https://developers.cloudflare.com/workers/observability/logs/workers-logs/ ; pricing page | same |
| D1 pricing | Free: "5 million / day" rows read, "100,000 / day" written, "5 GB (total)" storage; Paid: "First 25 billion / month included + $0.001 / million rows" read, "First 50 million / month included + $1.00 / million rows" written, "First 5 GB included + $0.75 / GB-mo"; "There are no data transfer (egress) or throughput (bandwidth) charges for data accessed from D1" | https://developers.cloudflare.com/d1/platform/pricing/ | same |
| D1 limits | 10 databases Free, 50,000 Paid; 500 MB per database Free, 10 GB Paid; "Each individual D1 database is inherently single-threaded, and processes queries one at a time"; 30 s query maximum; Time Travel "7 days (Free)", "30 days (Workers Paid)" | https://developers.cloudflare.com/d1/platform/limits/ | same |
| R2 pricing | Free "10 GB-month / month", "1 million requests / month" Class A, "10 million requests / month" Class B; $0.015 per GB-month, $4.50 per million Class A, $0.36 per million Class B; "Egressing directly from R2, including via the Workers API, S3 API, and r2.dev domains does not incur data transfer (egress) charges and is free" | https://developers.cloudflare.com/r2/pricing/ | same |
| R2 durability | "99.999999999% (eleven 9s) of annual durability"; "durability is not a guarantee of data availability" and "does not prevent intentional or accidental deletion of data"; no versioning or point-in-time recovery on the page | https://developers.cloudflare.com/r2/reference/durability/ | same |
| Email Sending | "Sending to arbitrary recipients requires the Workers Paid plan"; "3,000 included per month"; "$0.35 per 1,000 emails"; verified destinations free on all plans; product page still reads "Email Sending Beta for outbound transactional emails" | https://developers.cloudflare.com/email-service/platform/pricing/ ; https://developers.cloudflare.com/email-service/ | both pages dated 2026-06-09 |
| Registrar | "Only pay the registration and renewal fees charged by your registry"; "does not mark up domain prices at all"; free WHOIS redaction, DNSSEC, two-factor enforcement; no example prices on the page | https://www.cloudflare.com/products/registrar/ | read 2026-09-05 |
| Workers Builds | Free "3,000 per month" build minutes, 1 concurrent; Paid "6,000 per month (then, +$0.005 per minute)", 6 concurrent; 20-minute build timeout; GitHub and GitLab; build and deploy on push; preview URL per version | https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/ ; https://developers.cloudflare.com/workers/ci-cd/builds/ | same |

Free-tier ceilings a small cairn site actually meets, in the order it meets them: Email Sending
to anyone but the owner (Paid); the 10 ms CPU limit per invocation on Free for server-rendered
pages (uncited as a measured hit; the scaffold moves to Paid at the email step anyway,
docs/admin/own-your-domain.md); 10 D1 databases per account on Free, which `create-cairn-site`
consumes two per site (packages/create-cairn-site/README.md, "The Cloudflare chapter"); 3-day
log retention on Free. A club's roster and a few thousand media files sit far inside 500 MB of
D1 and 10 GB of R2 (opinion on the sizing; the limits are the cited numbers).

## 2. The consolidation, as facts

One Cloudflare account and one bill carry: the Worker (compute and static assets), D1 (the auth
store and the site's own data), R2 (media), Email Sending (magic links), the zone (DNS), Universal
SSL, DDoS and the free WAF subset, Workers Logs, Workers Builds (optional), and the registrar
(optional). The showcase `wrangler.jsonc` declares exactly these bindings: `send_email` EMAIL,
`d1_databases` AUTH_DB and APP_DB, `r2_buckets` MEDIA_BUCKET, `assets`, `observability.enabled:
true` (examples/showcase/wrangler.jsonc). What the platform does instead of a component the team
would otherwise run, each to its page above: no server to patch (Workers runtime), no database
host (D1), no CDN contract (static assets cached at the edge, requests free), no mail relay
account (Email Sending), no certificate process (Universal SSL issues and renews), no separate
DDoS or WAF vendor (all plans), no CI service (Workers Builds). Registrar pricing is at registry
cost; the earlier round's "about $6 a month" (docs/admin/before-you-start.md, as of 2026-08-11)
holds against the pages read this round. The certificate charge question in before-you-start.md
is answered by the Universal SSL page: free on all plans, so no add-on charge for the apex and
first-level subdomains.

## 3. Agent-operable infrastructure

| Fact | Wording | Source | Date |
|---|---|---|---|
| Hosted MCP servers | 16 servers; the Cloudflare API server "provides access to the entire Cloudflare API", over 2,500 endpoints; Workers Bindings "Build Workers applications with storage, AI, and compute primitives"; Observability "Debug and get insight into your application's logs and analytics" | https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/ | read 2026-09-05 |
| What they let an agent do | "read configurations from your account, process information, make suggestions based on data, and even make those suggested changes for you"; create D1, R2, KV resources; read invocation logs to "isolate errors and trends quickly" | https://blog.cloudflare.com/thirteen-new-mcp-servers-from-cloudflare/ | 2025-05-01 |
| Agent setup docs | "Cloudflare provides Skills and MCP servers so your agent can seamlessly build on the Cloudflare platform"; agents listed: Claude Code, Codex, Cursor, GitHub Copilot, OpenCode, VS Code, Windsurf, Bionic; "Every agent listed supports Skills and MCP" | https://developers.cloudflare.com/agent-setup/ | read 2026-09-05 |
| `llms.txt` | banked round 1 | https://developers.cloudflare.com/llms.txt | round 1 |
| Agents SDK | banked round 1 | https://developers.cloudflare.com/agents/ | round 1 |
| Wrangler for scripts | `CLOUDFLARE_API_TOKEN`: "The API token for your Cloudflare account, can be used for authentication for situations like CI/CD, and other automation"; `CLOUDFLARE_ACCOUNT_ID` | https://developers.cloudflare.com/workers/wrangler/system-environment-variables/ | read 2026-09-05 |
| D1 export | `npx wrangler d1 export <database_name> --remote --output=./database.sql`; SQL text, "A running export will block other database requests"; virtual tables unsupported | https://developers.cloudflare.com/d1/best-practices/import-export-data/ | same |
| R2 S3 API | "R2 implements the S3 API to allow users and their applications to migrate with ease"; AWS CLI documented ("Use the aws CLI to interact with Cloudflare R2 via the S3-compatible API", endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`); rclone documented ("Rclone is a command-line tool which manages files on cloud storage") | https://developers.cloudflare.com/r2/api/s3/api/ ; https://developers.cloudflare.com/r2/examples/aws/aws-cli/ ; https://developers.cloudflare.com/r2/examples/rclone/ | same |

In-tree evidence of the same: this repo's `CLAUDE.md` names the Cloudflare MCP plugin and the
API token as the routine path ("Make routine changes directly"), and `create-cairn-site` holds no
Cloudflare credential of its own and "works entirely through wrangler's session"
(packages/create-cairn-site/README.md, "The Cloudflare chapter").

## 4. Reliability, with method

SLA. The Business plan SLA reads "100% Uptime. The Service will serve Customer Content 100% of
the time without qualification", remedy "Service Credits are Customer's sole and exclusive
remedy", credits capped at one month of fees a year, beta services excluded; it covers "Business
Level" customers, Enterprise has its own (https://www.cloudflare.com/business-sla/). The
self-serve agreement: services "ON AN 'AS IS' AND 'AS AVAILABLE' BASIS" and "WE WILL HAVE NO
LIABILITY FOR ANY HARM OR DAMAGE ARISING OUT OF OR IN CONNECTION WITH ANY FREE SERVICES"
(https://www.cloudflare.com/terms/). No SLA document covering Workers Paid was located;
https://www.cloudflare.com/sla/ returns 404. Finding: a $5 cairn site has no uptime commitment,
only the Business zone plan ($200 a month, not fetched this round) buys one.

Incident record. Cloudflare's own postmortems: three Workers-affecting incidents 2025-06-12,
2025-11-18, 2025-12-05 (banked, round 2). The outage tag lists no Cloudflare postmortem after
2026-02-20; the posts since are about other providers' disruptions and one titled "Code Orange:
Fail Small is complete. The result is a stronger Cloudflare network" dated 2026-05-01
(https://blog.cloudflare.com/tag/outage/, read 2026-09-05; the post's own URL was not resolved,
two slug guesses returned 404). The status API on 2026-09-05 held 33 incidents created
2026-08-21T06:40Z to 2026-09-04T21:10Z, twelve touching Workers-platform products (Workers
Builds twice, R2 four times including an HTTP/3 issue on custom domains 2026-08-31 to 09-03,
Durable Objects three times, D1 twice, Workers KV once), every one marked impact "minor", none
global (https://www.cloudflarestatus.com/api/v2/incidents.json). The status history page shows
about a week per page, so a twelve-month count from the primary feed was not obtained; the
honest statement is: three global or near-global Workers-affecting outages with postmortems in
the twelve months to 2026-09-05, none since 2025-12-05, plus a steady stream of regional
"minor" incidents on the status page (33 in fifteen days on the last read). Fail Small (posted
2025-12-19) committed to Health Mediated Deployments for all production configuration, failure-
mode reviews, and break-glass fixes "by the end of Q1"
(https://blog.cloudflare.com/fail-small-resilience-plan/), and the 2026-05-01 post declares it
complete.

Failure shape. When the network fails globally, every Cloudflare-hosted site fails together, and
the 2025-11-18 postmortem is the instance (banked). The multi-vendor shape fails in parts: a CMS
host, a mail relay, a DNS provider each on their own record. No primary source compares the
aggregate downtime of the two shapes for a small site; this stays an opinion either way.

## 5. Independent evidence

Found:
- W3Techs, 2026-09-05: "Cloudflare is used by 25.1% of all the websites, that is a reverse
  proxy service market share of 84.6%" (https://w3techs.com/technologies/overview/proxy); 18.1%
  of all websites as DNS server provider, the largest share
  (https://w3techs.com/technologies/overview/dns_server). Method: W3Techs surveys the top ten
  million sites by Tranco-type ranking, stated on its site.
- Cloudflare, Inc. is listed NYSE: NET; "Second quarter revenue totaled $696.1 million,
  representing an increase of 36% year-over-year" (press release 2026-08-06,
  https://www.cloudflare.com/press-releases/2026/cloudflare-announces-second-quarter-2026-financial-results/).

Not found or not obtained:
- No analyst or academic comparison of edge platforms was fetched; the Forrester Wave for edge
  development platforms is known to exist but was not verified this round (WebSearch budget
  exhausted; no press release on the current press page). Do not cite.
- No study of small-team operational burden by vendor count (round 1, Claim 2, still holds).
- No independent measurement of breach or incident rates for self-hosted or managed WordPress
  versus Worker-hosted sites. Patchstack (already cited, a vendor) counts disclosures, not
  breaches. Sucuri's reports index was fetched but the report bodies were not
  (https://sucuri.net/reports/); Sucuri is also a vendor. Say where the case says it now:
  nobody has measured it.

## 6. The honest counters, kept

- Email Sending: "Beta" on the product page (2026-06-09); Workers Paid required for arbitrary
  recipients; 3,000 a month included; quota starts conservative; sign-in depends on it.
- D1: one query at a time per database; 10 GB per database on Paid; export blocks other requests
  while running.
- Vendor tie and account ownership: no account-transfer feature exists; moving a zone between
  accounts means adding the domain in the new account, repointing nameservers, and "You must
  reissue SSL/TLS certificates and recreate and validate DNS records when transferring domains";
  a Registrar-held domain "require[s] a manual support request for transfer"
  (https://developers.cloudflare.com/fundamentals/manage-domains/move-domain/). Members can be
  added to an account under policies of actor, role, and scope
  (https://developers.cloudflare.com/fundamentals/manage-members/), so an organization-owned
  account with the developer as a member is available from the start.
- R2: eleven-nines durability, no versioning or point-in-time restore documented, durability
  "does not prevent intentional or accidental deletion".
- Outage record: three Workers-affecting global outages June to December 2025; none with a
  postmortem since; regional minor incidents continue weekly.
- No SLA at $5.

---

## Draft: Leg 3, strengthened

## Leg 3: one account carries hosting, data, mail, DNS, deploy, and edge protection

Front door: derivable, with every vendor number replaced by a link; tags marked internal cite a
consumer site's record through the evidence file.

**Claim.** One Cloudflare account supplies the compute, the static-asset cache, the sign-in
store, media storage, the magic-link sender, DNS, the TLS certificate, DDoS and WAF protection,
request logs, and, optionally, the deploy on push and the domain registration, on one bill
[verifiable: examples/showcase/wrangler.jsonc; the product pages in
docs/internal/record/2026-09-04-cairn-case/04-evidence-round-4.md, section 2]. The two-product
traditional shape assembles those from a CMS host, a database host or plugin store, a CDN, a mail
relay, a certificate process, a registrar, and a CI service, or pays a managed host to hide them
[uncited: checkable against the vendors' pages; opinion on the last clause]. Against a bundled
membership product that hosts the site, the portal, and the mail, the vendor count is equal and
the capability list is the product's [opinion]. Counting accounts, cairn's shape is Cloudflare,
GitHub, a payments provider if dues are collected, and organizational mail; the registrar folds
into Cloudflare when the domain moves there [opinion].

**Reasoning and evidence.** The platform is the same one the free plan gives every zone.
Cloudflare publishes 348 cities and 95% of the connected population within 50 ms of one
[verifiable: https://www.cloudflare.com/network/, read 2026-09-05]. Universal SSL issues,
renews, and deploys "free, unshared, publicly trusted" certificates on every plan [verifiable:
https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/]. DDoS protection is
"standard, unmetered" at layers 3 to 7 on every plan [verifiable:
https://developers.cloudflare.com/ddos-protection/]. The free WAF carries custom rules, one
rate-limiting rule, and the Free Managed Ruleset; the full managed rules are a $20 zone plan
[verifiable: https://developers.cloudflare.com/waf/]. Bot Fight Mode is a single toggle on the
free plan; per-request bot scores are Enterprise [verifiable:
https://developers.cloudflare.com/bots/]. Requests for static assets are "free and unlimited"
and cached at the nearest location [verifiable:
https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/]. Workers Logs
turn on with one config line and keep seven days on the paid plan; the engine writes one JSON
record per operational event into them [verifiable:
https://developers.cloudflare.com/workers/observability/logs/workers-logs/;
docs/reference/log-events.md]. Workers Builds deploys on push from GitHub or GitLab with 3,000
build minutes a month free [verifiable:
https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/]. The registrar
charges registry cost with no markup [verifiable:
https://www.cloudflare.com/products/registrar/]. The bill is $5 a month for Workers Paid, once
per account, plus the domain; D1, R2, and 3,000 emails a month sit inside that plan's included
quotas at a club's scale [verifiable: https://developers.cloudflare.com/workers/platform/pricing/,
dated 2026-08-28; https://developers.cloudflare.com/d1/platform/pricing/;
https://developers.cloudflare.com/r2/pricing/;
https://developers.cloudflare.com/email-service/platform/pricing/; opinion on the scale]. R2
egress is free, and D1 has no egress charge [verifiable: the two pricing pages]. The current
limits and prices live on those pages and move; read them there [opinion].

The setup cost of the platform is carried by cairn's tooling. The scaffold writes
`wrangler.jsonc` with its bindings, the two migration sets, and the doctor's readiness checks
[verifiable: docs/extend/what-the-scaffold-wrote.md, "Root"; docs/admin/is-it-working.md].
`create-cairn-site`, pre-release, walks the GitHub App creation, then creates the Worker, two D1
databases, and the R2 bucket on the free plan through the developer's own wrangler session, then
creates or adopts the zone and copies existing DNS records before the nameserver switch
[verifiable: packages/create-cairn-site/README.md, the three chapters;
docs/admin/own-your-domain.md; ROADMAP.md:573 for pre-release]. The developer runs the command,
switches nameservers at the registrar, turns on Workers Paid, and pastes two API tokens; the tool
writes the rest [verifiable: docs/admin/own-your-domain.md; docs/admin/before-you-start.md].

The platform is operable by an agent as well as by a person. Cloudflare hosts sixteen MCP
servers, one exposing "the entire Cloudflare API", over 2,500 endpoints, and publishes setup
pages for eight coding agents plus `llms.txt` for its docs [verifiable:
https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/;
https://developers.cloudflare.com/agent-setup/; https://developers.cloudflare.com/llms.txt].
Wrangler authenticates from `CLOUDFLARE_API_TOKEN` "for situations like CI/CD, and other
automation" [verifiable:
https://developers.cloudflare.com/workers/wrangler/system-environment-variables/]. This repo's
own operating instructions route routine Cloudflare changes through that token and the MCP plugin
[verifiable: CLAUDE.md, "Cloudflare / Wrangler"]. The case's fifth leg leans on this: a platform
an agent can read and change from documentation is part of what makes the shape work [opinion].

**Counter-evidence a skeptic cites.** No study isolates vendor count against a small team's
operational burden, so whether one account is less work is untested [verifiable:
docs/internal/record/2026-09-04-cairn-case/02-evidence.md, Claim 2]. Cloudflare published three
postmortems for outages that took Workers-hosted sites down between 2025-06-12 and 2025-12-05
[verifiable: the table in round 2, docs/internal/record/2026-09-04-cairn-case/03-evidence-round-2.md]:

| Date | Duration | Scope | Postmortem |
| --- | --- | --- | --- |
| 2025-06-12 | up to 2 h 28 min | Workers KV, Access, the dashboard | https://blog.cloudflare.com/cloudflare-service-outage-june-12-2025/ |
| 2025-11-18 | about 2 h 10 min globally, full restoration 17:06 UTC | CDN, Turnstile, Workers KV, Access, the dashboard | https://blog.cloudflare.com/18-november-2025-outage/ |
| 2025-12-05 | about 25 min | 28% of applications behind the network | https://blog.cloudflare.com/5-december-2025-outage/ |

None since carries a postmortem; the outage tag's later entries are other providers' incidents
and a 2026-05-01 post declaring the "Fail Small" plan complete [verifiable:
https://blog.cloudflare.com/tag/outage/, read 2026-09-05;
https://blog.cloudflare.com/fail-small-resilience-plan/ for the plan's commitments]. The status
feed on 2026-09-05 held 33 incidents from 2026-08-21, twelve touching Workers products, each
marked "minor" and regional [verifiable: https://www.cloudflarestatus.com/api/v2/incidents.json,
a rolling window]. A $5 site has no uptime commitment: the Business plan carries the 100% SLA
with service credits, and the self-serve terms say "as is" [verifiable:
https://www.cloudflare.com/business-sla/; https://www.cloudflare.com/terms/]. When the network
fails globally, a cairn site fails with it; the traditional shape fails in parts, and no source
compares the two shapes' aggregate downtime [verifiable: the 2025-11-18 postmortem; opinion on
the comparison].

Vendor tie is the plain case against one account. Its size is a fact to weigh, not to soften.
Cloudflare is a reverse proxy for 25.1% of all websites and 84.6% of the reverse-proxy market,
and the DNS provider for 18.1% of all websites, by W3Techs's survey [supported: W3Techs,
https://w3techs.com/technologies/overview/proxy and /dns_server, 2026-09-05]. It reports 81
million HTTP requests a second on average and is listed on the NYSE with $696.1 million of
revenue in the quarter to June 2026 [verifiable:
https://blog.cloudflare.com/radar-2025-year-in-review/;
https://www.cloudflare.com/press-releases/2026/cloudflare-announces-second-quarter-2026-financial-results/].
A site tied to this vendor is tied the way a site on a hyperscaler is tied [opinion].

**Drawbacks.** Email Sending is beta and paid, and sign-in depends on it [verifiable:
https://developers.cloudflare.com/email-service/, "Beta", 2026-06-09; the pricing page;
src/lib/email.ts:79-101]. Onboarding writes an apex DMARC record at `p=reject` [verifiable:
docs/admin/own-your-domain.md]. D1 processes one query at a time per database and caps at 10 GB
[verifiable: https://developers.cloudflare.com/d1/platform/limits/]. R2 documents eleven-nines
durability and no versioning or point-in-time restore; durability "does not prevent intentional
or accidental deletion" [verifiable: https://developers.cloudflare.com/r2/reference/durability/].
D1 offers Time Travel to any minute in 30 days on Workers Paid [verifiable:
https://developers.cloudflare.com/d1/platform/limits/]. The published cairn docs carry no backup
or restore procedure for either store [verifiable: `grep -rniE "backup|restore|d1 export"
docs/admin docs/extend docs/reference`, no procedure on any hit]. There is no account-transfer
feature: moving a zone to another account means re-adding the domain, repointing nameservers,
and reissuing certificates, and a Registrar-held domain needs a support request [verifiable:
https://developers.cloudflare.com/fundamentals/manage-domains/move-domain/]. In the production
case the account, the repository, and the GitHub App installation are the developer's [verifiable:
docs/internal/record/2026-09-04-cairn-case/03-evidence-round-2.md; internal]. Members can be
added to an account under scoped policies, so the organization can own the account from day one
and the developer can be a member [verifiable:
https://developers.cloudflare.com/fundamentals/manage-members/; opinion on the practice].

**Counterweight.** The tie is bounded by what the organization holds at each layer. It holds the
GitHub repository, every line of SvelteKit code in it (the theme, the chassis copy, its own
screens), and its content as markdown files [verifiable: docs/extend/what-the-scaffold-wrote.md;
docs/admin/before-you-start.md, "What you end up owning"]. Its D1 data exports to a SQL file with
one wrangler command [verifiable:
https://developers.cloudflare.com/d1/best-practices/import-export-data/]. Its R2 objects move
with the AWS CLI or rclone over the S3 API [verifiable:
https://developers.cloudflare.com/r2/api/s3/api/;
https://developers.cloudflare.com/r2/examples/aws/aws-cli/;
https://developers.cloudflare.com/r2/examples/rclone/]. The app is standard SvelteKit on
`@sveltejs/adapter-cloudflare`; leaving means an adapter change and rewriting every D1, R2, and
email binding the engine and the site reach, work this document does not size [verifiable:
examples/showcase/svelte.config.js:1; docs/internal/what-cairn-is-and-is-not.md]. cairn holds
none of it; the engine is an MIT package on npm [verifiable: package.json "license"]. The reader
weighs a single vendor of this size, with these exits, against a set of smaller vendors each
replaceable alone [opinion].
