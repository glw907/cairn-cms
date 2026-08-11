# T4a domain spike (2026-08-11)

The plan's Task 1: rehearse chapter 2's platform premises by hand before any task is drafted
against a stale one. Every claim below carries the date it was observed and the output it was
observed from. Response bodies the chapter will consume are captured verbatim in the appendix,
and Task 3's fixtures are copied from there, never written from memory.

**Status: mostly answered, one thin blocked seam.** Steps 1, 3, and 5 are answered outright.
Steps 2 and 4 are answered on mechanism and shape by reading existing estate resources, which is
what a `GET` can prove without the ability to create anything; what remains blocked is narrow and
listed under "The blocked half" below. Eight amendments to the plan follow from the findings, and
two of them (the Custom Domain correction and the wrong-scope error code) would have shipped a
defect had the tasks been dispatched against the plan as written.

## Step 1: account enumeration before any token (ANSWERED)

**`wrangler whoami --json` exists and is the enumeration mechanism.** Observed on wrangler
4.97.0, 2026-08-11. Its help text: "Return user information as JSON. Exits with a non-zero
status if not authenticated." This retires the output-string risk T3 filed for this call: the
tool reads a structured `accounts` array instead of parsing the ASCII table.

Observed shape (an account-name value is the operator's own, and the account id is already
recorded in this repo's `CLAUDE.md`):

```json
{
  "loggedIn": true,
  "authType": "User API Token",
  "accounts": [
    {
      "id": "120c269ad6d3dfbe6d63a0bb53758ca0",
      "name": "glw907",
      "type": "standard",
      "settings": { "enforce_twofactor": false, "api_access_enabled": null,
                    "access_approval_expiry": null, "abuse_contact_email": null,
                    "oauth_app_access_enabled": true },
      "legacy_flags": { "enterprise_zone_quota": { "maximum": 0, "current": 0, "available": 0 } },
      "created_on": "2025-10-28T02:11:50.175294Z"
    }
  ]
}
```

**The parse hazard, and it is real: `--json` does not print only JSON.** The observed stdout
began with a non-JSON line before the opening brace:

```
Cloudflare agent skills are available for: Claude Code. Run wrangler in an interactive terminal to install them, or use `--install-skills` to install without prompting.
{
```

`JSON.parse(stdout)` throws on that. The reader must locate the first `{` and parse from there.
This particular line is emitted because wrangler detected an agent CLI, so a human admin may
never see it, but wrangler prints an update-available banner and other chatter on the same
stream, so parsing from the first brace is the rule regardless of this one line's origin.

Only one account exists on this workstation's session, so the multi-account branch was not
observed live. The array shape carries it (one element per account), and Task 6's multiple
branch is proved against the fake rather than the estate.

**`CLOUDFLARE_ACCOUNT_ID` in the spawn env selects the account, proven falsifiably.** With the
correct id, `wrangler d1 list --json` returned the account's databases. With
`CLOUDFLARE_ACCOUNT_ID=00000000000000000000000000000000` the same command failed, and the
failure names the bogus id in the request path, which is what proves the variable was honored
rather than ignored:

```
✘ [ERROR] A request to the Cloudflare API (/accounts/00000000000000000000000000000000/d1/database) failed.

  Authentication error [code: 10000]
```

**Gate for Tasks 2 and 6: cleared**, with one correction to Task 6 (read `whoami --json`, parse
from the first brace; do not parse the table).

## Step 2: zone creation (MOSTLY ANSWERED, one body blocked)

The 1061 zone-already-exists body is blocked (see below). Two error bodies were captured, one of
which corrects the plan, and **the zone object itself was captured verbatim from a `GET`**, which
is the same object `POST /zones` returns under `result`. That retires most of this step's
blockage: Task 3's fixtures can be copied from a real zone object rather than written from memory.

**The zone object, captured from `GET /zones?per_page=2&page=1` on 2026-08-11** (full body in the
appendix). The fields the chapter reads:

- `name_servers`: the assigned pair, `["burt.ns.cloudflare.com", "carlane.ns.cloudflare.com"]`.
- `original_name_servers`: the pre-delegation pair, here four `cloudns.net` servers. The
  delegation check can compare the live lookup against BOTH lists, which distinguishes "still at
  the registrar" from "wrong Cloudflare pair" without guessing.
- `original_registrar`: `"pdr ltd. d/b/a publicdomainreg (id: 303)"`. **This is a finding the plan
  did not anticipate: Cloudflare tells the tool who the registrar is**, so
  `registrarInstructions` can key off the zone object rather than asking the admin to name their
  registrar. The value is a free-text vendor string with an id suffix, so the table matches on a
  normalized substring, and the generic fallback stays for anything unmatched.
- `status`: `"active"` here. The `pending` and `initializing` values in the plan come from the
  vendor's own docs and were not observed live, since every zone on this account is long since
  active.
- `plan.name`: `"Free Website"`, which is the evidence for the chapter's "this costs nothing"
  admission copy.
- `permissions`: an in-band list of what the calling token may do on that zone
  (`"#dns_records:edit"` and friends). Useful as a cheap scope check after the paste, though it
  cannot speak to account-level zone creation.

Pagination on the list route, captured from the same call:

```json
{ "page": 1, "per_page": 2, "total_pages": 5, "count": 2, "total_count": 9 }
```

**The wrong-scope refusal is NOT 403/9109, which is what the plan assumed.** Attempting
`POST /zones` with the estate token returned HTTP 403 with `errors[0].code` of **0** and a
message naming the missing permission:

```json
{ "success": false,
  "errors": [ { "code": 0,
    "message": "Requires permission \"com.cloudflare.api.account.zone.create\" to create zones for the selected account" } ],
  "messages": [], "result": null }
```

Code 9109 ("Unauthorized to access requested resource") does exist, and was observed on
`GET /user/tokens` and `GET /user/tokens/permission_groups`, so both shapes are live. **Task 5's
mapping re-plans accordingly**: an insufficient-scope refusal is recognized by HTTP 403,
whatever `errors[].code` carries, since the account-scoped refusal reports 0. The permission
name in the message is worth surfacing in the `token-scope-missing` row, because it tells the
admin exactly which checkbox they missed.

**The malformed-token body confirms the plan's 400/6003 mapping, and adds a nested shape the
fake must carry.** Errors can nest through `error_chain`:

```json
{ "success": false,
  "errors": [ { "code": 6003, "message": "Invalid request headers",
    "error_chain": [ { "code": 6111, "message": "Invalid format for Authorization header" } ] } ],
  "messages": [], "result": null }
```
HTTP 400.

## Step 3: the records probe (ANSWERED)

Run 2026-08-11 with `node:dns/promises` `Resolver`, servers pinned to 1.1.1.1 and 8.8.8.8, against
`aksailingclub.org` (Google Workspace mail, so MX, SPF, DMARC, and a DKIM selector all exist).

**TXT chunking is real and the plan was right to call it out.** The DKIM value arrived in two
chunks:

```
google._domainkey.aksailingclub.org TXT: chunks=2 lengths=[255,155] joinedLength=410
```

`resolveTxt` returns `string[][]`. A value must be reassembled with `join('')` and no separator;
joining with a space corrupts the key. Every other TXT observed was a single chunk, so a test
that only covers short values proves nothing, which is why the e2e seeds a DKIM-shaped TXT.

**MX carries `priority` as its own field, plus an undocumented `type`:**

```json
[{"exchange":"aspmx.l.google.com","priority":1,"type":"MX"},
 {"exchange":"alt1.aspmx.l.google.com","priority":5,"type":"MX"}]
```

Cloudflare's DNS-record create call takes `priority` as a sibling of `content`, not inside it, so
the translation is direct.

**CAA does not translate directly, and this is a new finding.** `node:dns` returns the parsed
property as a key:

```json
[{"critical":0,"type":"CAA","issue":"pki.goog"}]
```

Cloudflare's create call wants `data: { flags, tag, value }`. The shapes do not line up: node
gives `issue` / `issuewild` / `iodef` as the key name where Cloudflare wants `tag` as a value.
Task 8 either writes the explicit translation (`critical` becomes `flags`, the present key name
becomes `tag`, its value becomes `value`) or drops CAA from the carry-over and says so in the
gate copy. **Recommendation: translate it.** A domain with CAA and no carried CAA record can fail
certificate issuance later, which is a worse failure than the extra branch.

**Absence and failure are distinguishable, as the plan requires.** Every not-present probe
returned `ENODATA` (the name resolves, no record of that type). `ENOTFOUND` is the NXDOMAIN
counterpart. Both mean authoritatively absent. Anything else (`SERVFAIL`, `ETIMEOUT`,
`ECONNREFUSED`) is a read failure and maps to `records-read-failed`.

**A caveat the gate copy should carry, found by accident.** On `aksailingclub.org`, the probes for
`mail` and `autodiscover` both returned the apex's Cloudflare proxy addresses rather than
`ENODATA`. On a domain answering with a wildcard, every probed subdomain "exists", so the probe
can list records that are wildcard artifacts rather than records the admin ever created. Carrying
those over turns a wildcard into a set of explicit records, which is a behavior change. Ruling 4's
"the list may be incomplete" caveat is necessary but not sufficient; the copy should also say the
list may show more than the admin created.

**Gate for Task 8: cleared**, with the CAA translation and the wildcard caveat added.

## Step 4: routes and the cutover (MECHANISM ANSWERED, call bodies blocked)

**The plan's premise is wrong, and the family's own production sites are the evidence.** The plan
says the cutover creates a Workers **Route**. Every cairn site in production is attached by a
Workers **Custom Domain** instead. Captured live from
`GET /accounts/:id/workers/domains` on 2026-08-11:

| hostname | service | zone |
|---|---|---|
| `907.life` | `907-life` | `907.life` |
| `ecxc.ski` | `ecxc` | `ecxc.ski` |
| `cairn.pub` | `cairn-pub` | `cairn.pub` |
| `dev.aksailingclub.org` | `asc-site` | `aksailingclub.org` |
| `staging.aksailingclub.org` | `asc-staging` | `aksailingclub.org` |

The object's keys: `id`, `zone_id`, `zone_name`, `hostname`, `service`, `environment`, `cert_id`,
`previews_enabled`, `enabled`.

The distinction matters because a plain Workers Route does not make a hostname resolve. A route is
a pattern match applied to traffic that already arrives at Cloudflare, so a route alone, with no
DNS record for the hostname, resolves to nothing and the cutover's confirm can never pass. The
plan's ordered flow (create the route, then confirm the deployment answers on the new hostname)
cannot work as written. A Custom Domain is the mechanism that matches the intent: per Cloudflare's
docs, "after you set up a Custom Domain for your Worker, Cloudflare will create DNS records and
issue necessary certificates on your behalf," which is exactly the missing half. The `cert_id` on
each row above is that certificate.

**Task 9 re-plans onto Custom Domains.** Two implementations are available and the choice is a
real design call:

1. **Through wrangler**, by writing `routes: [{ pattern: <domain>, custom_domain: true }]` into
   `wrangler.jsonc` and deploying. One mechanism, already spawned by this tool, no new token
   scope. Costs a second deploy, since attaching requires a deploy and the origin rewrite requires
   another.
2. **Through the API**, `PUT /accounts/:id/workers/domains`. Preserves the spec's ordering exactly
   (attach, confirm, write origin, redeploy once) at the cost of a token scope.

**Recommendation: the API.** It keeps the spec's rollback-safe ordering intact, which is the whole
point of that ordering, and one redeploy is the honest cost of the cutover.

**The credential split is settled, and it is cleaner than the plan assumed.** The wrangler OAuth
session's granted scopes, read from this workstation's own session file, include
`workers_routes:write`, `zone:read`, `ssl_certs:write`, and `workers:write`, but **not** zone
creation and **not** DNS writes. So the pasted token carries exactly what the session lacks: zone
creation and DNS editing. Whether the Custom Domain attach also needs a scope on the pasted token
(rather than riding the session) is the one open question, and it is blocked.

**What a hostname with no Worker serves, observed partially.** `mail.aksailingclub.org` is proxied
and answers HTTP 200; `autodiscover.aksailingclub.org` answers 200 with a SiteGround
"default server vhost" page. Neither is a Cloudflare error page, because both proxy to a real
origin, so these do not answer the exact question. They do establish the load-bearing point for
the confirm: **a 200 is not evidence the site is serving.** The marker pair the plan specifies
(`/` 200 AND `/admin` 303 to `/admin/login`) is necessary, and a status-only check would pass on
either hostname above. The clean observation, a proxied hostname on a zone with no matching Worker
at all, needs the scratch domain.

## Step 5: the prefill URL (FORMAT ANSWERED, contents pending Step 4)

The template-URL format is documented by Cloudflare, so the tool links the vendor rather than
guessing: <https://developers.cloudflare.com/fundamentals/api/how-to/account-owned-token-template/>.

User-token form:

```
https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=<url-encoded JSON>&accountId=*&zoneId=all&name=<name>
```

Account-token form:

```
https://dash.cloudflare.com/?to=/:account/api-tokens&permissionGroupKeys=<url-encoded JSON>&name=<name>
```

`permissionGroupKeys` is a URL-encoded JSON array of `{ "key": ..., "type": "read" | "edit" | ... }`.
The keys this chapter needs are `zone` (create the zone), `dns` (write the carried records), and,
if Step 4 says routes need the pasted token rather than the wrangler session, `workers_routes`.

The plan is right that this URL is authored last: **its final contents depend on Step 4's
credential answer**, which is blocked. What is settled now is the format and the fact that the
scope set is expressible in it.

## The blocked half, and what unblocks it

What remains unobservable from this workstation is the set of calls that CREATE something: a
zone's birth state, the duplicate-zone error, and the Custom Domain attach. Reading the estate
answered every shape question; only the write paths are left. Two things are missing, and neither
is recoverable without Geoff:

1. **A token that can create zones.** The estate token deliberately cannot. The canonical scope
   record (`~/.claude/docs/cloudflare-estate-inventory.md`) lists zone read, Zone.DNS Edit, and
   Zone Workers Routes as granted, and **API-token management as refused on purpose so the token
   cannot self-extend**. That refusal is correct and should stay; it just means the spike cannot
   mint its own. Observed live, not inferred: `POST /zones` returns the 403 above, and
   `GET /user/tokens` returns 9109.
2. **The scratch domain.** Step 4 needs an active zone under our control to create a route on and
   to observe what a proxied hostname with no matching route actually serves. The production zones
   are untouchable by the plan's own global constraint. **This is a correction to the plan, which
   named the scratch domain as a Task 13 prerequisite only: it is a Task 1 prerequisite too.**

Both collapse into one browser sitting: Geoff registers the scratch domain, then opens the
prefilled create-token URL below (which validates Step 5's format in the same trip) and pastes
back a token scoped to create zones and edit DNS on that account.

**The spike's token URL, deliberately broader than the shipped one will be.** It asks for `zone`,
`dns`, `workers_scripts`, and `ssl_certs` at edit, because the point of the remaining spike work
is to discover which of those the chapter actually needs. The shipped prefill URL carries only the
proven minimum, and this spike token is deleted afterward.

```
https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22zone%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22dns%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22ssl_certs%22%2C%22type%22%3A%22edit%22%7D%5D&accountId=%2A&zoneId=all&name=cairn+T4a+spike+%28delete+after%29
```

Opening that URL is itself the first observation Step 5 needs: whether the dashboard honors the
prefill, and which fields the admin still has to click. Record what it shows.

**Where the token goes when it comes back.** Per the workstation's secrets rule, a new long-lived
secret originates in the age store, never a loose file. This one is deliberately short-lived (it
exists to answer three questions and is then deleted), so it should be handed over in the session
rather than installed, and revoked at the dashboard as soon as the spike's remaining steps are
captured.

## Amendments this spike makes to the plan

1. **Task 6** reads `wrangler whoami --json` and parses from the first `{`, rather than reading the
   table. The multi-account branch is proved against the fake.
2. **Task 5** maps insufficient scope on HTTP 403 regardless of `errors[].code`, since the
   account-scoped refusal reports code 0 rather than 9109. It surfaces the permission name from the
   message. It also handles `error_chain` nesting.
3. **Task 3's fake** reproduces `error_chain`, the code-0 403 shape, and the 9109 shape. Its
   random per-zone `name_servers` pair stays, but as a **test device rather than a platform
   truth**. All **nine** zones on this account carry the identical pair,
   `burt.ns.cloudflare.com` / `carlane.ns.cloudflare.com`, across registrations spanning January
   to August 2026, so Cloudflare's assignment is account-stable rather than per-zone. The fake
   randomizes so that a wrong-nameserver test can fail; the doc block should say that is why.

   This changes what `delegation-wrong-nameservers` means in the field. It is not "you copied the
   wrong pair from the same account", since an account has one pair. It is "these are Cloudflare
   nameservers belonging to some other account", which is what happens when the domain sat on an
   agency's or a friend's Cloudflare before. The row's copy should say that, because the fix is
   different: the admin has to move the domain, not retype two hostnames.
4. **Task 8** translates CAA between node's shape and Cloudflare's, and the carry-over gate copy
   gains the wildcard caveat alongside ruling 4's incompleteness caveat.
5. **Task 1's prerequisites** include the scratch domain and a zone-create-capable token, not just
   Task 13's.
6. **Task 9 attaches a Workers Custom Domain, not a Workers Route** (Step 4). A route alone does
   not make a hostname resolve, so the plan's ordered flow could not have worked as written. The
   recommended implementation is `PUT /accounts/:id/workers/domains`, which preserves the spec's
   rollback-safe ordering with a single redeploy. The catalogue rows rename with it:
   `route-create-failed` becomes `custom-domain-failed`, and `route-not-serving` keeps its meaning
   but should be worded about the hostname rather than the route.
7. **Task 8's registrar instructions read `original_registrar` off the zone object** rather than
   asking the admin who their registrar is (Step 2). The value is free text with an id suffix, so
   the table matches a normalized substring and the generic fallback stays.
8. **The delegation check compares against `original_name_servers` as well as `name_servers`**
   (Step 2), which distinguishes "still at the registrar" from "some other Cloudflare pair" from
   evidence rather than inference.

## Appendix: captured bodies

Every body in this appendix was captured live on 2026-08-11 and is the source Task 3's fixtures
copy from.

### `POST /zones` without the zone-create permission (HTTP 403)

```json
{
  "success": false,
  "errors": [
    {
      "code": 0,
      "message": "Requires permission \"com.cloudflare.api.account.zone.create\" to create zones for the selected account"
    }
  ],
  "messages": [],
  "result": null
}
```

### `GET /zones` with a malformed bearer token (HTTP 400)

```json
{
  "success": false,
  "errors": [
    {
      "code": 6003,
      "message": "Invalid request headers",
      "error_chain": [
        { "code": 6111, "message": "Invalid format for Authorization header" }
      ]
    }
  ],
  "messages": [],
  "result": null
}
```

### `GET /user/tokens` with a valid token lacking token-management scope (HTTP 403)

```json
{
  "success": false,
  "errors": [ { "code": 9109, "message": "Unauthorized to access requested resource" } ],
  "messages": [],
  "result": null
}
```

### `GET /user/tokens/verify` (HTTP 200), the success envelope's shape

```json
{
  "result": { "id": "1d508f1ab69df49d3ef9572dc1917273", "status": "active" },
  "success": true,
  "errors": [],
  "messages": [ { "code": 10000, "message": "This API Token is valid and active", "type": null } ]
}
```

### `wrangler whoami --json` (exit 0)

Recorded in Step 1 above, including the non-JSON preamble line that precedes it.

### DNS probe results

Recorded in Step 3 above: MX with `priority` and `type`, TXT as `string[][]` with a
`[255, 155]` chunked DKIM value, CAA as `{ critical, type, issue }`, and `ENODATA` for every
absent record.

### The zone object (HTTP 200), from `GET /zones?per_page=2&page=1`

This is the same object `POST /zones` returns under `result`, and it is what Task 3's zone
fixtures copy from.

```json
{
  "id": "a7c2b9103ec7d835d72f356489072e5b",
  "name": "907.life",
  "status": "active",
  "paused": false,
  "type": "full",
  "development_mode": 0,
  "name_servers": ["burt.ns.cloudflare.com", "carlane.ns.cloudflare.com"],
  "original_name_servers": ["ns41.cloudns.net", "ns42.cloudns.net", "ns43.cloudns.net", "ns44.cloudns.net"],
  "original_registrar": "pdr ltd. d/b/a publicdomainreg (id: 303)",
  "original_dnshost": null,
  "modified_on": "2026-02-04T23:00:31.318867Z",
  "created_on": "2026-01-30T07:32:40.063286Z",
  "activated_on": "2026-01-31T16:41:53.359542Z",
  "vanity_name_servers": [],
  "vanity_name_servers_ips": null,
  "meta": { "step": 2, "custom_certificate_quota": 0, "page_rule_quota": 3, "phishing_detected": false },
  "owner": { "id": null, "type": "user", "email": null },
  "account": { "id": "120c269ad6d3dfbe6d63a0bb53758ca0", "name": "glw907" },
  "tenant": { "id": null, "name": null },
  "tenant_unit": { "id": null },
  "permissions": ["#zone:read", "#zone_settings:read", "#worker:edit", "#worker:read", "#dns_records:edit", "#dns_records:read"],
  "plan": {
    "id": "0feeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "name": "Free Website", "price": 0, "currency": "USD", "frequency": "",
    "is_subscribed": false, "can_subscribe": false,
    "legacy_id": "free", "legacy_discount": false, "externally_managed": false
  }
}
```

With `result_info`:

```json
{ "page": 1, "per_page": 2, "total_pages": 5, "count": 2, "total_count": 9 }
```

### A Workers Custom Domain (HTTP 200), from `GET /accounts/:id/workers/domains`

```json
{
  "id": "c377079217e7e9ca15d3ec295b6d8cef9e7e2b56",
  "zone_id": "a7c2b9103ec7d835d72f356489072e5b",
  "zone_name": "907.life",
  "hostname": "907.life",
  "service": "907-life",
  "environment": "production",
  "cert_id": "6dcb2140-79a8-4295-8b23-f8e743556577",
  "previews_enabled": false,
  "enabled": true
}
```

### A DNS record (HTTP 200), from `GET /zones/:id/dns_records?per_page=3`

```json
{
  "id": "b06a10399a71d15a4a5e1bc884493277",
  "name": "fm1._domainkey.907.life",
  "type": "CNAME",
  "content": "fm1.907.life.dkim.fmhosted.com",
  "proxiable": true,
  "proxied": false,
  "ttl": 1,
  "settings": { "flatten_cname": false },
  "meta": {},
  "comment": null,
  "tags": [],
  "created_on": "2026-01-30T07:32:48.595511Z",
  "modified_on": "2026-02-04T17:29:51.308199Z"
}
```

With `result_info`:

```json
{ "page": 1, "per_page": 3, "count": 3, "total_count": 16, "total_pages": 6 }
```

Two notes the carry-over depends on. `ttl: 1` is Cloudflare's "automatic", which is the value to
write for a carried record unless the source had an explicit TTL. And this record is a **DKIM
selector published as a CNAME**, not a TXT: Fastmail delegates DKIM that way where Google
publishes a TXT. The probe list must therefore query both TXT and CNAME for every selector, which
the spike's own probe script did and which Task 8 must keep.

### Pending capture (blocked)

- `POST /zones` success body. **Mostly retired**: the `result` object's shape is captured above
  from a `GET`. What is still unobserved is the `status` value a brand-new zone carries
  (`pending` or `initializing`) and whether `name_servers` is populated at creation or only after
  activation. Task 8's delegation check depends on the second of those.
- `POST /zones` for a name the account already holds (the 1061 body), and specifically whether
  1061 distinguishes same-account ownership from foreign-account ownership. If it does not,
  Task 8's adopt-versus-error branch re-plans onto a zone-list lookup.
- The Custom Domain attach call (`PUT /accounts/:id/workers/domains`), its duplicate error, which
  credential covers it, and what a proxied hostname with no matching Worker serves.
