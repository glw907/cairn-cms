# T4a domain spike (2026-08-11)

The plan's Task 1: rehearse chapter 2's platform premises by hand before any task is drafted
against a stale one. Every claim below carries the date it was observed and the output it was
observed from. Response bodies the chapter will consume are captured verbatim in the appendix,
and Task 3's fixtures are copied from there, never written from memory.

**Status: partially blocked.** Steps 1, 3, and 5 are answered. Steps 2 and 4 need a credential
and a domain this workstation does not have, both named under "The blocked half" below. Every
task the answered steps gate is cleared for dispatch; the tasks the blocked steps gate are not.

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

## Step 2: zone creation (PARTIALLY ANSWERED, two bodies blocked)

The success body and the 1061 zone-already-exists body are blocked (see below). Two error
bodies were captured, and one of them corrects the plan.

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

Steps 2 (the success and 1061 bodies) and 4 (routes, and what a proxied hostname with no matching
route serves) cannot be observed from this workstation. Two things are missing, and neither is
recoverable without Geoff:

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

Both collapse into one browser sitting: Geoff registers the scratch domain, then opens a prefilled
create-token URL (which validates Step 5's format in the same trip) and pastes back a token scoped
to create zones and edit DNS on that account.

## Amendments this spike makes to the plan

1. **Task 6** reads `wrangler whoami --json` and parses from the first `{`, rather than reading the
   table. The multi-account branch is proved against the fake.
2. **Task 5** maps insufficient scope on HTTP 403 regardless of `errors[].code`, since the
   account-scoped refusal reports code 0 rather than 9109. It surfaces the permission name from the
   message. It also handles `error_chain` nesting.
3. **Task 3's fake** reproduces `error_chain`, the code-0 403 shape, and the 9109 shape. Its
   random per-zone `name_servers` pair stays, but as a **test device rather than a platform
   truth**: the three zones observed on this account (`aksailingclub.org`, `907.life`,
   `cairn.pub`) all carry the same pair, `burt.ns.cloudflare.com` / `carlane.ns.cloudflare.com`, so
   Cloudflare's assignment is account-stable in practice. The fake randomizes so that a
   wrong-nameserver test can fail; the doc block should say that is why.
4. **Task 8** translates CAA between node's shape and Cloudflare's, and the carry-over gate copy
   gains the wildcard caveat alongside ruling 4's incompleteness caveat.
5. **Task 1's prerequisites** include the scratch domain and a zone-create-capable token, not just
   Task 13's.

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

### Pending capture (blocked)

- `POST /zones` success body: `name_servers`, `original_name_servers`, `status` vocabulary
  including `initializing`, `account.id`, `type`.
- `POST /zones` for a name the account already holds (the 1061 body), and specifically whether
  1061 distinguishes same-account ownership from foreign-account ownership. If it does not,
  Task 8's adopt-versus-error branch re-plans onto a zone-list lookup.
- The route-creation call, its duplicate-route error, and what a proxied hostname with no
  matching route serves.
