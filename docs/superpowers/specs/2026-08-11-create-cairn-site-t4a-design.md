# create-cairn-site Pass T4a: the domain-and-email half of chapter 2 (design)

The fourth tool pass, planned in its own sitting per the T3 spec's ruling 1 and amended here.
Parent docs: the umbrella design (`2026-08-09-admin-setup-and-docs-reset-design.md`, Part 1
chapter 2), the T3 spec's T4 brief, and the T3 plan's post-mortem. The platform facts T3
verified live (id-less provisioning, no write-back, binding-name migrations, the teardown API
path) hold unchanged; nothing here re-litigates them.

## Rulings made this sitting (amend the T3 spec's T4 brief)

1. **T4 splits into T4a and T4b before planning, not after bursting.** The brief's full
   charge (chapter 2, Builds connect, the console's full form, plus the inherited defect
   list) is seven-plus deliverables, the accretion shape the sizing doctrine names and the
   same count that forced T3's three-way split. **T4a** is the domain-and-email half:
   token-prefill, zone and DNS for an admin-owned domain, the carry-over gate, email
   onboarding, the money framing, the console's full form, and account selection. **T4b**
   is Builds connect plus deploy-config reconciliation; its brief is at the end of this
   spec. The queue becomes T4a, T4b, T5, Pass D.
2. **T4a takes exactly one item from the inherited defect list**, the one its own path
   leans on: account selection (the prefill URL carries the account id, so a multi-account
   user blocks this chapter's spine). The `PUBLIC_ORIGIN` reconcile is T4b's, being the
   reconciliation deliverable itself. Slug collisions, wrangler output-string pinning,
   Windows, and the cross-package token contract test stay filed for a hardening pass. The
   Registrar stays retired.
3. **The live e2e uses a scratch domain** (Geoff, this sitting). A cheap throwaway TLD,
   registered outside the tool at any registrar, is delegated to Cloudflare for real: the
   only strategy that proves delegation re-detection and email onboarding end to end. The
   production domains stay untouchable. Registering it is an execution prerequisite the
   plan names, not a tool feature.
4. **The money framing is spike-gated, not inherited.** The T3 spike found
   verified-destination sends are free on any plan, and a cairn site's magic-link mail goes
   only to its own editors, an enumerable set. The plan's spike re-reads the current Email
   Service docs and answers: can chapter 2's email half run on the free plan with verified
   destinations? If yes, the money gate softens to "money only for arbitrary-recipient
   sending" and the chapter says so; if no, the umbrella's money-up-front framing stands.
   The repo `CLAUDE.md` email gotcha is rewritten from the same answer.

Standing rulings carried forward unchanged: no secret under the project directory; every
exit prints a next step; every wait prints a heartbeat; tokens opaque; `--dry-run` prints
the whole chapter and performs none of it; no suite may touch the operator's desktop (the
PATH-controlled pattern); every platform claim carries a date and the plan re-verifies its
own at implementation time.

## Scope

T4a takes a site from `live` (chapter 1's finish line) to serving on the admin's own domain
with sign-in email working: zone created, records carried over, nameservers delegated,
email onboarded, `PUBLIC_ORIGIN` and the Worker's routes updated for the custom hostname.
Out of scope: Builds connect and repo reconciliation (T4b), the template repo and button
(T5), the Registrar (retired), any change to the engine's public API, and the deferred
defect list (ruling 2).

## The chapter's flow

The same architecture as T2 and T3: the step and state-machine idiom, one state record,
resumable at every hop. New states extend past `live`. The flow, in order:

1. **The admission question.** The chapter opens by naming what this half costs, from the
   spike's answer (ruling 4): the domain the admin already owns, and either nothing more or
   Workers Paid, stated plainly with the dashboard deep link. Declining parks cleanly;
   chapter 1's site keeps working on `workers.dev`.
2. **Account selection.** When the wrangler session sees more than one account, the tool
   lists them and asks; the choice lands in the state record. Single-account users never
   see the step. This also fixes the inherited chapter 1 defect: the deploy path reads the
   same saved account id, so a multi-account user can deploy at all.
3. **Token prefill.** The tool deep-links the dashboard's create-token page with a
   URL-prefilled template (Zone:Edit and DNS:Edit at minimum; the spike settles the exact
   parameter shape and whatever zone-creation itself requires). The admin pastes one token.
   It is stored 0600 in the state store, never under the project, and named in the record
   as the chapter's credential. Wrangler's own session keeps covering what it already
   covers; the pasted token exists because zone and DNS writes are outside wrangler's
   scopes (T3 spike A).
4. **Zone create and carry-over.** The tool creates the zone, queries the domain's current
   authoritative records, shows what it found, and carries MX and existing records over
   behind an explicit confirmation, because a botched delegation takes an organization's
   email down (the umbrella's gate, verbatim). Only after the confirmation do records
   write.
5. **Delegation.** Registrar-specific nameserver instructions for the top registrars, then
   park: the run exits cleanly with the state saved, and a re-run re-detects delegation
   rather than waiting on it. The console page for this wait carries the instructions and
   the current detection state.
6. **Email onboarding.** Deep link to the one step with no API, poll for its state, park
   and resume the same way. Free-plan verified destinations, if the spike confirms them,
   are offered first: the tool can verify the editors' addresses it already knows from the
   allowlist.
7. **The custom-hostname cutover.** `PUBLIC_ORIGIN` rewritten to the domain, the Worker's
   route added to the zone, a redeploy, and the confirm that the site answers on the new
   hostname. The `workers.dev` hostname keeps working.

Every step follows the T2/T3 error-catalogue discipline: literal message text per failure,
classified wait / act / ask-someone, each ending in one next command, triggered by tests
rather than read.

## The console (ruling 2 of the T3 spec, taking effect here)

The existing loopback server grows server-rendered progress pages: every consent, wait,
error, and resume in this chapter renders at `127.0.0.1`, and the terminal reduces to
"keep this window open" plus the same lines it prints today (the terminal remains complete
on its own; the console is a better view of the same state, not a second source of truth).
No framework, no build step, no state of its own: pages render from the state record. The
two long waits (delegation, onboarding) are the pages that justify the console's
existence; they auto-refresh their detection state. The GitHub chapter's existing pages
are retrofitted only where it comes free.

## State and resume

The state record gains the chapter's fields (account id, zone id, the token's presence,
per-step completion) under the same 0600, no-secret-under-the-project rules. The pasted
token is the one new secret; it lives in the state store for the chapter's lifetime and is
deleted at chapter completion, the key-move precedent applied to a credential the tool
cannot move anywhere safer. A later re-entry that needs zone or DNS writes re-runs the
prefill for a fresh token and says so. Every hop is resumable; `--start-over` keeps its
meaning; the two park states (delegation, onboarding) are first-class and print their
re-entry command.

## Testing

The suite stays on fake bins and API fixtures: a fake Cloudflare API for zone, DNS,
records, and onboarding states, in the T2/T3 fake-bin idiom, with the desktop-side-effect
constraint intact. The carry-over gate, the park-and-resume pairs, the account-selection
branch, and every catalogue row get triggered tests. The console pages get the same
CI-probed treatment as the T2 dev shim (a probe that must fail when the page breaks, per
the falsifiable-gates rule). The live e2e (main loop plus Geoff's browser moments) runs
the whole chapter against the scratch domain (ruling 3) with the T3-proven install
pattern, proves delegation re-detection and onboarding end to end, and tears down: zone
deleted, domain left parked, verified by listing.

## Documentation (a pass dimension)

The admin track gains the chapter 2 page (the two-door structure already anticipates it);
the package README gains the chapter's flags and the park-and-resume story; the changelog
extends under `## Unreleased`; the repo `CLAUDE.md` email gotcha is rewritten from the
spike's answer (ruling 4). No engine reference page changes, since the public API is
untouched.

## Acceptance criteria

A cold run on a site at `live`, with a domain the admin owns at an external registrar,
reaches: the site serving on that domain with `PUBLIC_ORIGIN` cut over and `workers.dev`
still answering; MX and existing records intact after the carry-over gate; sign-in email
arriving (on whichever plan the spike's answer names); both parks resuming by re-run with
no step repeated; the pasted token 0600 in the state store and absent from the project
tree; `--dry-run` printing the whole chapter with zero shell-outs and zero network; every
catalogue row triggered by a test; the console rendering every wait with the terminal
still complete on its own. The runtime library is untouched.

## The T4b brief (dated 2026-08-11, for its own sitting)

Builds connect plus deploy-config reconciliation. Connect the repo and trigger through the
Workers Builds API (connections and triggers endpoints, January 2026); the one manual part
is the one-time Cloudflare GitHub App authorization. Reconcile the deploy-learned config
into the repo, which Builds forces, since a Builds deploy builds from the repo rather than
the admin's disk: `PUBLIC_ORIGIN` (closing its silent-http gap), the account id, and
whatever the custom-hostname cutover wrote. Open for that sitting: whether Builds connect
rides the wrangler session's `workers:write` or needs the prefilled token (T3 spike B left
it unconfirmed); how the reconcile commit lands (through the site's own App, the natural
candidate, or as an admin instruction); and whether the chapter verifies a first Builds
deploy end to end or stops at the connected trigger. T4b follows T4a and precedes T5.
