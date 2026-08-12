# T4b spike: the email half of chapter 2 (2026-08-12)

Task 1 of the T4b plan. Every claim below came from a real API response against the glw907
account on 2026-08-12, or from a dated finding in a prior spike doc. Nothing here is inferred
from a documentation page unless the entry says so.

The spike went better than planned. Six of the seven steps closed without a browser, because the
estate token turned out to carry Email Sending: Edit and because T4a's own spike had already
answered the permission question this plan filed as its one true unknown. **One browser glance
remains open: Step 3, the Advanced Certificate Manager line item.**

## Summary of answers

| Step | Question | Answer |
|---|---|---|
| 1 | The Email Sending permission group's name and scope | **ANSWERED by T4a's spike.** `Account > Email Sending > Edit`. The create-token template key is `email_sending`, already shipped in `prefill.mjs` and verified live. |
| 2 | Is the account on Workers Paid | **ANSWERED yes**, by a successful send from `ecxc.ski`. |
| 3 | Does an ACM line item appear | **OPEN.** The estate token cannot read certificate packs or billing. One browser glance. |
| 4 | Capture the success bodies | **DONE.** Create, list, and send captured verbatim. |
| 5 | Capture the failure bodies | **DONE, and it invalidates the plan's error model.** See below. |
| 6 | Does the create endpoint set the zone flag | **ANSWERED yes.** The create returns `enabled: true` with no dashboard visit. |
| 7 | Write the doc and fold the amendments | This document, plus the amendments section in the plan. |

## The finding that changes the plan: there are no `E_` codes on the REST surface

The plan's Task 4 and Task 5 are built on extracting an `E_`-prefixed code from the send
response, and on classifying `E_SENDER_DOMAIN_NOT_AVAILABLE`, `E_SENDER_NOT_VERIFIED`, and the
bare string `not a verified address`. **None of those appear.** The REST send returns a standard
v4 envelope carrying a numeric code and a dotted identifier:

```json
{ "success": false,
  "errors": [ { "code": 10203, "message": "email.sending.error.email.sending_disabled" } ],
  "messages": [], "result": null }
```

HTTP 403. The `E_` strings belong to the **Workers binding** surface (`env.EMAIL.send()`), which
is what `src/lib/email.ts:101` parses and what `CLAUDE.md`'s durable gotcha describes. This pass
calls the REST API, which is a different surface with a different error vocabulary. The plan
carried the binding's vocabulary across to the REST call by assumption.

**Worse for the design: the same code covers two different conditions.** A send from a domain
that was never onboarded and a send from a domain onboarded 25 seconds ago both return
`10203 / email.sending.error.email.sending_disabled`. There is no field that separates them.

The consequence is narrow and, as it happens, the plan already built the machinery for it: the
recorded `onboardedAt` moment and `PROPAGATION_WINDOW_MS` are the **only** discriminator between
"still settling" and "onboarding did not take". The window logic survives intact. Only the code
table feeding it changes.

Task 4's decision gate is otherwise satisfied: the send does return a v4 envelope, so the
seam's existing `ensureSuccess` and `throwMapped` plumbing applies unchanged.

## Propagation, measured for the first time

Onboarding at `08:12:02Z`. A send at 25 seconds failed, a send at 47 seconds failed, and a send
at **107 seconds** succeeded. So real propagation on a zone already on Cloudflare nameservers is
between 47 and 107 seconds.

Cloudflare's own documentation gives 5 to 15 minutes. The measured figure is an order of
magnitude faster, on the easiest possible case: a zone already active on Cloudflare nameservers.
A zone that has just been delegated may well be slower, and the 30-minute window the plan sets
stays the right safety margin. The documented range is what the owner-facing copy should quote,
since it is the vendor's promise; this measurement is why the park will rarely be seen.

## What the create actually does

`POST /zones/{id}/email/sending/subdomains` with `{"name":"carin-test.org"}` returned HTTP 200:

```json
{ "result": { "id": "fcf72bf1ef26439884d8110a1825e142",
    "tag": "fcf72bf1ef26439884d8110a1825e142", "name": "carin-test.org",
    "enabled": true, "preview_enabled": true,
    "return_path_domain": "cf-bounce.carin-test.org", "dkim_selector": "cf-bounce",
    "created": "2026-08-12T08:12:02.593597Z", "modified": "2026-08-12T08:12:02.593597Z" },
  "success": true, "errors": [], "messages": [] }
```

Two things to carry. The create returns `enabled: true` **immediately**, which answers Step 6 and
means no dashboard visit is needed. And `preview_enabled` came back `true` here against `false`
on `ecxc.ski`, so it is not a constant and no fixture should assert it as one.

**This makes the `email-not-ready` park hard to reach**, the same shape as T4a's already-active
zone short-circuit. On an active zone the poll sees `enabled: true` on its first look. The row
and its fixture-driven test stay, because a zone that is not yet active is a real state the tool
must not crash on, but the live e2e should prove the **propagation** park instead, which is
reachable and which this spike hit twice.

### The success body differs from the documentation

The docs show `result.delivered` carrying the recipient. Live, a success returns a `message_id`
and three empty arrays:

```json
{ "success": true, "errors": [], "messages": [],
  "result": { "message_id": "<...@carin-test.org>",
    "delivered": [], "queued": [], "permanent_bounces": [] } }
```

Task 6's fixtures copy this, not the doc example.

## What onboarding writes, and what it leaves behind

The scratch zone held four seeded records before onboarding: two apex MX at priority 10 and 20,
an apex SPF TXT, and a 437-byte DKIM TXT at `spike._domainkey`.

Onboarding **added six records and modified none of the four**:

| Record | Name |
|---|---|
| TXT `"v=DMARC1; p=reject;"` | `_dmarc.carin-test.org` (apex) |
| MX x3 (`route1/2/3.mx.cloudflare.net`, priorities 62, 67, 78) | `cf-bounce.carin-test.org` |
| TXT `"v=spf1 include:_spf.mx.cloudflare.net ~all"` | `cf-bounce.carin-test.org` |
| TXT DKIM, 425 bytes | `cf-bounce._domainkey.carin-test.org` |

This confirms the spec's structural claim live on a second domain: the apex mail path is
untouched, and everything Cloudflare needs lives under `cf-bounce`. The one apex write is the
DMARC record, which is exactly the thing the closing copy has to disclose.

### Onboarding can be undone, but it leaves the DMARC record behind

`DELETE /zones/{id}/email/sending/subdomains/{id}` returns HTTP 200 and removes the entry. It
also removes the four `cf-bounce` records. **It does not remove the `_dmarc` record**, which
survives at `p=reject`. The zone was left holding five records where it started with four, and
the residue had to be deleted by hand to restore the baseline.

Two consequences, both real:

1. **Task 9's teardown changes.** The spec says to delete the zone, which takes the sending
   configuration with it. T4a's post-mortem already established that the scratch domain is a
   Cloudflare Registrar domain whose zone **cannot** be deleted. So teardown is the subdomain
   DELETE above, followed by deleting the `_dmarc` record. Both were verified working today.
2. **It sharpens the closing copy.** An owner who turns Email Sending off does not get their
   domain's mail policy back. A `p=reject` DMARC record with no matching sender rejects mail from
   anything else they later add, and removing Email Sending does not lift it. The disclosure the
   spec asks for is not only about adding a newsletter tool later; it is about a policy that
   outlives the feature that created it.

## The account entitlement condition was not reachable

The plan's Task 4 wants a refusal naming the account entitlement, mapped to `paid-plan-missing`
ahead of the operation fall-through. **That condition cannot be reached on this account**,
because the account is on Workers Paid, which is what Step 2 confirms. Reaching it would mean
finding or making an account without the plan, which is out of proportion to the question.

Per the plan's own fallback, the mapping therefore keys on the entitlement wording and its test
says so in its name. Note the risk this leaves: since `10203` covers the two conditions we
**can** observe, it is possible that a plan-less account also returns `10203`, in which case the
entitlement mapping never fires and the owner sees the fall-through row instead. That row prints
Cloudflare's own message, so the owner is not stranded, and this is recorded rather than solved.

## Evidence of the Workers Paid answer

A send from `no-reply@ecxc.ski`, an onboarded production domain, returned HTTP 200 with a
`message_id`. Email Sending is available only on the paid plan, so a successful send is
sufficient proof of the entitlement. The same call also proved that the estate token carries
`Email Sending: Edit`, which is why the rest of this spike needed no browser.

The one production-domain touch in this spike was that single message, to Geoff's own address. It
mutated nothing.

## Still open

**Step 3, the ACM line item.** Given four Workers Custom Domains on Free-plan zones on this
account, does an Advanced Certificate Manager charge appear on the bill? The estate token is
refused by `/accounts/{id}/subscriptions`, `/accounts/{id}/billing/profile`, and
`/zones/{id}/ssl/certificate_packs` (code 9109), so this cannot be answered from the API.

It affects one line of the money preamble. The copy currently assumes no ACM charge, which is
the expected answer, since a Workers Custom Domain provisions its certificate through the
platform rather than through ACM, and ACM is a separate opt-in product. If the glance finds a
charge, the preamble gains a line and the "about $6 a month" figure changes.

## Appendix: the captured bodies, verbatim (Task 6's fixtures)

Copy these into `test/fake-cloudflare.mjs` rather than hand-writing them. Each is the exact
response body, with only the account's own identifiers left as they were returned.

**Create, `POST /zones/{id}/email/sending/subdomains` with `{"name":"carin-test.org"}`, HTTP 200:**

```json
{"result":{"id":"fcf72bf1ef26439884d8110a1825e142","tag":"fcf72bf1ef26439884d8110a1825e142","name":"carin-test.org","enabled":true,"preview_enabled":true,"return_path_domain":"cf-bounce.carin-test.org","dkim_selector":"cf-bounce","created":"2026-08-12T08:12:02.593597Z","modified":"2026-08-12T08:12:02.593597Z"},"success":true,"errors":[],"messages":[]}
```

**List immediately after the create, HTTP 200** (the same entry, already `enabled: true`):

```json
{"result":[{"id":"fcf72bf1ef26439884d8110a1825e142","tag":"fcf72bf1ef26439884d8110a1825e142","name":"carin-test.org","enabled":true,"preview_enabled":true,"return_path_domain":"cf-bounce.carin-test.org","dkim_selector":"cf-bounce","created":"2026-08-12T08:12:02.593597Z","modified":"2026-08-12T08:12:02.593597Z"}],"success":true,"errors":[],"messages":[]}
```

**List on a zone with no sending subdomain, HTTP 200:**

```json
{"result":[],"success":true,"errors":[],"messages":[]}
```

**A second onboarded entry, for a `preview_enabled: false` fixture** (`ecxc.ski`, onboarded
2026-06-09):

```json
{"id":"02b29178254d48fab3a5a85b38f56126","tag":"02b29178254d48fab3a5a85b38f56126","name":"ecxc.ski","enabled":true,"preview_enabled":false,"return_path_domain":"cf-bounce.ecxc.ski","dkim_selector":"cf-bounce","created":"2026-06-09T06:26:41.226901Z","modified":"2026-06-09T06:26:41.226901Z"}
```

**Send success, `POST /accounts/{id}/email/sending/send`, HTTP 200:**

```json
{"success":true,"errors":[],"messages":[],"result":{"message_id":"<lQGT3PVeEuGfGBb7ykKdFeEdh7ztvmGEchGM@carin-test.org>","delivered":[],"queued":[],"permanent_bounces":[]}}
```

**Send refused, both for a never-onboarded domain and for one still propagating, HTTP 403.**
These two conditions are byte-identical, which is amendment 2:

```json
{"success":false,"errors":[{"code":10203,"message":"email.sending.error.email.sending_disabled"}],"messages":[],"result":null}
```

**Subdomain delete, `DELETE /zones/{id}/email/sending/subdomains/{id}`, HTTP 200:**

```json
{"result":null,"success":true,"errors":[],"messages":[]}
```

---

## The live e2e (2026-08-12, Task 9)

A site was scaffolded, pushed, deployed, connected to `carin-test.org`, and taken through both
email hops end to end. `runChapter2` exited 0 at `email-live`. Everything below was read back from
the platform or from disk, never inferred from the tool's own output.

| Claim | Evidence |
|---|---|
| Reaches `email-live` | state record read back through `loadSite()` |
| Token deleted at the terminal state | zero occurrences in the raw file bytes; mode still `0600` |
| Token nowhere else | swept the scaffold and state dir; the sweep was proven able to fail with a planted canary first |
| Sender address written and deployed | `emailFrom: no-reply@carin-test.org`; the deploy's own binding list shows `PUBLIC_ORIGIN https://carin-test.org` and `env.EMAIL` |
| Hop order | onboard, then test send, then address rewrite, then deploy |
| Closing copy | names the address, the one-line override, the `p=reject` consequence including that it survives turning Email Sending off, and the doctor command |
| The domain's own records survive | all four seeded records sha256-identical before, during, and after, including the 437-byte DKIM TXT |
| Teardown restores the fixture | zone back to exactly four records; Worker, both D1 databases, R2 bucket, repo, and state record all gone |

### The message did not arrive, and that is the finding

Cloudflare accepted every send (HTTP 200 with a `message_id`), the recipient is not on the
account's suppression list, and all four records Cloudflare wrote resolve from an outside
resolver. **No message ever reached the inbox.** An established domain on the same account
(`ecxc.ski`), through the same sending path, to the same inbox, delivered in seconds that morning.

Two hypotheses were tested and both are refuted:

1. **Greylisting.** Thirty minutes of polling, nothing. Greylisting does not hold that long.
2. **SPF PERMERROR.** The seeded apex SPF points at `_spf.example.com`, which NXDOMAINs, against
   `ecxc.ski`'s working `include:_spf.mx.cloudflare.net`. The apex SPF was repointed at Cloudflare,
   a fresh message sent, and still nothing arrived. The fixture was then restored and re-verified.

What remains is the variable that cannot be changed: the domain was registered roughly 18 hours
earlier. **This is ordinary for the industry rather than a cairn defect.** Amazon SES puts every new
account in a sandbox that can only reach verified addresses until a manual review grants production
access. Resend and Postmark both document a warm-up in which a new domain has no reputation and
mail is rejected or filtered, quoting four to eight weeks to full deliverability. A brand-new domain
carrying `p=reject` with no sending history is exactly what a receiver silently drops.

**This vindicates the spec's ruling 8 with evidence rather than assumption:** delivery is not
observable by the CLI, and a send that returns 200 is the strongest signal the tool can honestly
get. It also exposes a copy problem, recorded below.

### Two platform findings that correct this document's own earlier conclusions

**Sending authorization is sticky.** Deleting a zone's sending subdomain does not stop sends. After
the subdomain was deleted and the list read back empty, a send from that domain still returned 200.
So a domain onboarded once stays able to send, which is why this run's test send succeeded
instantly: the spike had already onboarded the domain hours earlier.

**There is a second refusal code, and this pass never saw it.** A domain that was never onboarded
can return `10204 email.sending.error.email.sender_not_configured`, not the `10203
email.sending.error.email.sending_disabled` this document recorded as the only code. Both were
observed today across account domains. The distinction does not correlate with the subdomain list:
two domains with no entry returned different codes, so hidden platform state decides it.

The shipped classification is defensible but was not a deliberate choice: `email.mjs` keys the
propagation park on `10203` and lets anything else fall through to the act row, so a `10204`
surfaces Cloudflare's own message rather than parking. That is the right outcome, reached by luck.
A pass that touches this should decide it on purpose.

### What Step 3 did and did not prove

The propagation park was **not** exercised through the tool. The park's underlying condition was
observed live during the spike (sends at 25s and 47s after onboarding refused, at 107s accepted),
but the tool's own branch could not be reached afterward, because sending authorization is sticky
and this domain is now permanently authorized. A deliberate fault injection (deleting the subdomain,
rewinding the record to `email-onboarded` inside the window) failed to reproduce it for the same
reason. Reaching it live needs a domain that has never been onboarded, and the only such domains on
this account are production ones the pass may not touch. The branch remains covered by tests on both
sides of the boundary.

### The copy overclaims, which is the one product change this run argues for

The closing copy says "Your site now sends its own sign-in email." On a domain registered that day,
that sentence is not reliably true, and the owner has no way to know. cairn cannot check delivery,
and should not try. What it can do is set the expectation the industry already sets: a brand-new
domain takes time before receivers trust it, so an editor who gets no link on the first day is
looking at a normal warm-up rather than a broken setup. The `cairn-doctor --send-test` line the copy
already carries is the right instrument; it just needs the expectation beside it.
