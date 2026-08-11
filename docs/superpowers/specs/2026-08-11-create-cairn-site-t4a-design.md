# create-cairn-site Pass T4a: the domain half of chapter 2 (design)

The fourth tool pass, planned in its own sitting per the T3 spec's ruling 1 and amended
twice in that sitting: once at the design gate, once after a three-agent adversarial review
of this spec and its plan (findings and triage recorded in the plan). Parent docs: the
umbrella design (`2026-08-09-admin-setup-and-docs-reset-design.md`, Part 1 chapter 2), the
T3 spec's T4 brief, and the T3 plan's post-mortem. The platform facts T3 verified live
(id-less provisioning, no write-back, binding-name migrations, the teardown API path) hold
unchanged; nothing here re-litigates them.

## Rulings made this sitting (amend the T3 spec's T4 brief)

1. **The T4 charge splits into three passes, cut by the adversarial gate's arithmetic.**
   The first cut (T4a domain-and-email, T4b Builds) moved two deliverables of nine and left
   the condemned count in place; the reviewers caught it. The standing cut: **T4a** is the
   domain half alone, ending at a complete story (the site serving on the admin's own
   domain, records carried, `workers.dev` still answering), with terminal-only parks;
   **T4b** is email plus the console plus the money framing, including the umbrella's
   doctor-check and admin test-send commitments; **T4c** is Builds connect plus deploy-config
   reconciliation (the brief formerly labeled T4b). The queue becomes T4a, T4b, T4c, T5,
   Pass D. The T3 spec's ruling 2 ("the console takes its full form in T4") lands in T4b,
   whose console renders both long waits, T4a's delegation wait included, from the same
   state record.
2. **T4a takes exactly one item from the inherited defect list**, the one its own path
   leans on: account selection (the prefill URL carries the account id, so a multi-account
   user blocks this chapter's spine). Because chapter 2 starts at `live`, fixing chapter 1's
   multi-account deploy defect from inside chapter 2 is circular; the fix therefore lands in
   chapter 1's own deploy path in this pass (the saved account id exported into the wrangler
   spawn env), with the spawn seam growing the env plumbing it currently lacks. Accounts are
   enumerated through the wrangler session, which exists before any pasted token. The
   umbrella's WHOIS to-do and its doctor check retire with the Registrar. Slug collisions,
   wrangler output-string pinning, Windows, and the cross-package token contract test stay
   filed for a hardening pass.
3. **The live e2e uses a scratch domain** (Geoff, this sitting). A cheap throwaway TLD,
   registered outside the tool at any registrar, is delegated to Cloudflare for real: the
   only strategy that proves delegation re-detection end to end. The production domains
   stay untouchable. Registering it is an execution prerequisite the plan names. **The e2e
   seeds MX and a DKIM-shaped TXT record at the registrar before the run**, so the
   carry-over proof exercises records that exist; a bare parked domain proves nothing (the
   falsifiable-probe rule applied to a domain).
4. **DNS discovery is best-effort, and the tool says so.** DNS has no enumeration
   primitive, so the records read asks an explicit probe list (apex A/AAAA/MX/TXT/CAA/NS,
   `www`, `mail`, `autodiscover`, `_dmarc`, a named DKIM-selector list) and cannot see
   anything else. The carry-over gate's copy states this plainly and tells the admin to
   compare against their registrar's record list before confirming. The acceptance
   criterion is "every record the tool listed is present in the new zone, and the gate
   said the list may be incomplete," never "all records intact."
5. **A park is not a failure.** The chapter's parks (delegation pending) exit 0, print the
   re-entry command, and are wait-class catalogue rows that are returned, not thrown; only
   act and ask-someone rows throw and exit 1. The Cloudflare catalogue's error-kind type
   widens from its current act-only shape to carry this.

Standing rulings carried forward unchanged: no secret under the project directory; every
exit prints a next step; every wait prints a heartbeat; tokens opaque; `--dry-run` prints
the whole chapter and performs none of it; no suite may touch the operator's desktop (the
PATH-controlled pattern); every platform claim carries a date and the plan re-verifies its
own at implementation time.

## Scope

T4a takes a site from `live` (chapter 1's finish line) to serving on the admin's own
domain: zone created under a prefilled pasted token, discovered records shown and carried
over behind an explicit confirmation, nameservers delegated with the park re-detected on
re-run, and the custom-hostname cutover with `workers.dev` still answering. This chapter
costs the admin no money: the zone and the cutover ride the free plan, and the money
question belongs to T4b, where email raises it. Out of scope: email onboarding, the
console, and the money framing (T4b); Builds connect and repo reconciliation (T4c); the
template repo and button (T5); the Registrar (retired); any change to the engine's public
API; and the deferred defect list (ruling 2).

## The chapter's flow

The same architecture as T2 and T3: the step and state-machine idiom, one state record,
one writer. New states extend past `live`:
`zone-created` → `records-carried` → `delegated` → `domain-live` (final for T4a). The
carry-over gate has its own recorded state because it is the chapter's most consequential
act; a decline is recorded distinctly and never silently advances. The flow, in order:

1. **Admission.** The chapter opens by naming what it needs (a domain the admin already
   owns, at any registrar) and what it costs (nothing). Declining parks cleanly; chapter
   1's site keeps working on `workers.dev`.
2. **Account selection.** Accounts enumerate through the wrangler session (which exists
   before any token). Single account: saved silently. Multiple: one prompt, saved. The
   saved id is also exported into the wrangler spawn env on every chapter 1 deploy from
   here on (ruling 2's fix).
3. **Token prefill.** The tool deep-links the dashboard's create-token page with a
   URL-prefilled template covering every call this chapter makes (the spike settles the
   exact scope set and parameter shape, and authors the URL last among its steps so no
   later-discovered scope invalidates it). The admin pastes one token through a hidden
   prompt. It lives 0600 in the state store, never under the project, is scrubbed from any
   retired record, and never passes through argv (unattended runs supply it by env var
   only).
4. **Zone create and carry-over.** The tool creates the zone (or adopts one this account
   already holds), saves the zone id and its assigned per-zone nameserver pair, reads the
   domain's current records by the probe list (ruling 4), shows what it found with the
   stated caveat, and writes only after explicit confirmation. MX arrives with its
   priority intact; long TXT values survive chunking. Confirming records
   `records-carried`; declining records the decline and exits with a next step.
5. **Delegation.** Registrar-specific nameserver instructions (a named table for the top
   registrars with a generic fallback) print the zone's own assigned pair. The park exits
   0 at `records-carried`; a re-run re-detects. Detection distinguishes four states:
   still the registrar's nameservers (pending), Cloudflare nameservers but not this
   zone's pair (an act row naming the correct two), correct pair with the zone still
   pending Cloudflare's check (propagating), and active.
6. **The custom-hostname cutover**, ordered so nothing is broken on failure: create the
   route first, confirm the existing deployment answers on the new hostname with a
   site-specific marker (the T3 live-check idiom: `/` 200 and `/admin` 303 to
   `/admin/login`), and only then rewrite `PUBLIC_ORIGIN` and redeploy, confirming again.
   Any failure after the origin write restores the `workers.dev` value on disk. A
   resolves-but-not-this-site answer is an act row, never wait-class; still-propagating
   DNS is the wait row. Success records `domain-live`; `workers.dev` keeps serving.
7. **Completion.** The pasted token is deleted from the state record (an explicit rebuild
   and save, asserted against a disk re-read), the closing copy names the domain and the
   admin URL, and a later re-entry that needs zone or DNS writes re-runs the prefill for a
   fresh token and says so.

Every step follows the T2/T3 error-catalogue discipline: literal message text per row,
classified wait / act / ask-someone under ruling 5's exit semantics, each ending in one
next command, triggered by tests rather than read.

## State and resume

The state record gains the chapter's fields: `accountId`, `zoneId`, `domain`,
`nameServers` (the zone's assigned pair, which the instructions and the wait output
print), `apiToken`, and the carry-over's own recorded outcome. `updateSite` grows a deep
merge for `cloudflare` (today only `github` merges; a per-hop whole-object write would
silently drop sibling fields), with a regression test proving a two-hop partial write
preserves both fields, and an explicit non-merge save path for the token's deletion.
**Only the chapter orchestration writes `step` or persists the record; every step
function is pure over an in-memory record and returns its outcome.** Every hop is
resumable; `--start-over` from a chapter-2 step refuses with a next step naming what
exists (a zone, records, a live Worker) rather than silently re-scaffolding.

## Testing

The suite stays on fake bins and API fixtures. The fake Cloudflare API's fixtures are
copied verbatim from response bodies the spike captured, never written from memory (the
T3 fake-shape lesson): the v4 envelope with `success: false` arriving under HTTP 200,
error codes as the discriminator, pagination on accounts and records, and a random
per-zone nameserver pair. The spawn seam's env plumbing and the fake-bin's env capture
make the account-id export assertable. The carry-over gate, the park-and-resume pairs,
the decline path, the four delegation states, the cutover's rollback, the account
branches, and every catalogue row get triggered tests. The live e2e (main loop plus
Geoff's browser moments) runs the whole chapter against the seeded scratch domain
(ruling 3) with the T3-proven install pattern, proves delegation re-detection end to
end, and tears down: teardown re-runs the prefill for a fresh token (completion deleted
the working one by design), deletes the zone via the API, leaves the domain parked, and
verifies by listing.

## Documentation (a pass dimension)

The admin track gains the domain chapter's page, stating the chapter's browser-moment
count as measured by the e2e; the package README gains the chapter's flags and the
park-and-resume story, including the token's lifecycle (prefilled, pasted, deleted); the
changelog extends under `## Unreleased`; chapter 1's closing copy stops promising "domain
and email arrive with the next chapter" in favor of the standing truth. The `CLAUDE.md`
email gotcha rewrite moves to T4b with the email spike. No engine reference page changes,
since the public API is untouched.

## Acceptance criteria

A cold run on a site at `live`, with a domain the admin owns at an external registrar,
reaches: the site serving on that domain with the marker checks passing and `workers.dev`
still answering; every record the tool listed present in the new zone, the gate having
said the list may be incomplete; both parks exiting 0 and resuming by re-run with no
repeated writes (asserted per hop through the fakes' invocation logs); a declined gate
recorded and never silently advanced; the pasted token 0600 in the state store during the
chapter, absent from the record, every retired record, argv, log lines, error text, and
console output after completion; `--dry-run` printing the whole chapter with zero
shell-outs and zero network; every catalogue row triggered by a test; a multi-account
user deploying successfully in chapter 1 with the saved account id. The runtime library
is untouched.

## The T4b brief (dated 2026-08-11, for its own sitting)

Email plus the console plus the money framing. The spike re-reads the current Email
Service docs and answers ruling 4 of the first draft of this spec: can a site send
magic-link mail to verified editor addresses on the free plan, and what does an onboarded
sending domain require; the admission copy and the `CLAUDE.md` gotcha rewrite both come
from that answer, and the answer also names the e2e's plan prerequisite before dispatch.
Email onboarding is deep-link plus a single poll per run, park-and-resume, with an
exhaustive status mapping whose default is an act row printing the raw status, never a
park; the umbrella's doctor-check bound and the admin test-send land here (the umbrella
demoted email delivery to exactly those two). The console takes its full form here (the
T3 spec's ruling 2): server-rendered pages on a loopback whose lifecycle the chapter
owns, at an unguessable path with a Host guard, rendering both long waits from the state
record, T4a's delegation wait included, with the CI probe in the create-site workflow and
the test glob carrying the new directory. The console serves during a run only, and both
the page and the park's last line say so. Open for that sitting: which credential the
onboarding status poll rides; whether the console retrofits the GitHub chapter's pages
(only if free). T4b follows T4a and precedes T4c.

## The T4c brief (dated 2026-08-11, for its own sitting; formerly the T4b brief)

Builds connect plus deploy-config reconciliation. Connect the repo and trigger through
the Workers Builds API (connections and triggers endpoints, January 2026); the one
manual part is the one-time Cloudflare GitHub App authorization. Reconcile the
deploy-learned config into the repo, which Builds forces, since a Builds deploy builds
from the repo rather than the admin's disk: `PUBLIC_ORIGIN` (closing its silent-http
gap), the account id, and whatever the custom-hostname cutover wrote. The `--connect`
flag name is reserved for this pass. Open for that sitting: whether Builds connect rides
the wrangler session's `workers:write` or needs a prefilled token (T3 spike B left it
unconfirmed); how the reconcile commit lands (through the site's own App, the natural
candidate, or as an admin instruction); and whether the chapter verifies a first Builds
deploy end to end or stops at the connected trigger. T4c follows T4b and precedes T5.
