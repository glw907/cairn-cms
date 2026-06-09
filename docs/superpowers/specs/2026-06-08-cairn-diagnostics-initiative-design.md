# The cairn diagnostics initiative

Design spec, 2026-06-08. Status: drafted, pending review. Covers the initiative shape and the Pass 1
foundation in detail. Passes 2 and 3 draw on the companion spec
`2026-06-08-cairn-email-delivery-and-environment-preflight-design.md`.

## The principle: one condition, three surfaces

cairn keeps meeting the same shape of failure. A site is misconfigured, the failure is silent or
opaque, and a developer discovers it one broken behavior at a time. The filed findings are all this
shape: email sending not onboarded, HTTPS not forced at the edge, the `csrf: { checkOrigin: false }`
disable missing, observability not enabled. Each one was diagnosed by hand, and each grew its own
ad-hoc message.

The fix is a single model. Every environment requirement is one *condition* with a stable identity,
and that one condition renders to three surfaces that must agree:

- The **checklist** in the docs teaches a developer about it at setup.
- The **doctor** preflight detects it before deploy.
- The **runtime** path reports it, when it slips through, with the same name, the same remediation, and
  a consistent branded message.

The requirement is a 1:1:1 correspondence. One condition, one checklist entry, one doctor probe, one
runtime handler. The way to guarantee that is a single registry as the source of truth, with the three
surfaces rendering from it rather than restating it.

The 1:1:1 binds the registry-backed conditions. The checklist is a superset, because it also carries
the human prerequisite steps cairn cannot probe or trap at runtime, for example registering a domain
with Cloudflare or moving an existing one in. Those steps link out to Cloudflare and are marked as
setup, not as checked conditions. The readiness checklist starts a developer from a default 2026
Cloudflare account and names only the deltas a cairn site adds, pointing at Cloudflare's own docs for
the generic operations rather than reproducing them. The detail lives in the companion preflight spec,
Arm C.

## The condition model

A condition is a plain data record with a stable id and the human fields every surface needs.

```ts
interface CairnCondition {
  id: string;                       // 'edge.https-not-forced', stable and greppable
  severity: 'blocker' | 'warning';
  title: string;                    // 'Always Use HTTPS is off'
  why: string;                      // one or two sentences on why it bites
  remediation: string;              // the fix, often a command
  docsAnchor?: string;              // into the readiness checklist
  logEvent?: string;               // the log vocabulary event it correlates with
}
```

The registry maps each `id` to its condition, with a `condition(id)` lookup and an iterator over all of
them. The data model carries what all three surfaces need, so a single entry feeds the checklist
generator, the doctor probe, and the runtime renderer without any surface inventing its own copy.

The throw path is a `CairnError`. It extends `Error`, carries the `conditionId` and the resolved
`condition`, and accepts a `cause`. A catch site narrows on `err instanceof CairnError`, logs through
the existing logger from `err.condition`, and renders the operator or editor message from the same
fields. A failure that maps to a known condition stops being an opaque string.

The three renderers are thin and each has exactly one consumer:

- **Runtime renderer.** Turns a condition plus request context into a branded page or an inline
  message. This is what Pass 1 builds, by re-homing the two branded guard pages cairn already ships.
- **Doctor renderer.** Turns a condition plus a probe result into a table row. Lands in Pass 3 with the
  doctor.
- **Checklist renderer.** Turns the registry into the readiness checklist doc, gated by a
  `check:readiness` script the same way `check:reference` gates the reference pages. Lands in Pass 3.

The data model is designed for all three legs now. Only the runtime renderer ships in Pass 1, so the
foundation has real consumers and no interface sits unused.

## Module placement

The model lives in a new internal `src/lib/diagnostics/` module. It is exported from no public package
subpath at first, so the API stays free to grow, the same stance as `src/lib/log/`. Diagnostics and
logging stay distinct but linked. Logging records what happened and is the public-observable contract.
Diagnostics names a known failure mode and its fix. A condition references the log event it correlates
with through the optional `logEvent` field, so the two vocabularies cross-reference without merging.

## The three passes

The initiative is sequenced foundation first. Each pass is bounded by a distinct verification surface,
and each adds one leg of the 1:1:1 so the model is always proven against a real consumer.

1. **Pass 1, the foundation.** The registry, the `CairnError` primitive, the runtime renderer, and the
   migration of the two existing branded guard pages onto the model. No new feature. It proves the
   runtime leg by re-homing code that already exists.
2. **Pass 2, email delivery observability.** The original ecxc bug's runtime arm, consuming the model.
   The awaited send maps `E_SENDER_NOT_VERIFIED` to the `email.sender-not-onboarded` condition, the log
   carries the `code`, and the `LoginPage` `send_error` state renders that condition's message. It
   threads all three legs on one real case. Detail in the companion preflight spec, Arm A.
3. **Pass 3, the doctor and the readiness checklist.** The doctor and the generated, gated checklist,
   both driven by the registry. Each setup condition gains a probe, and the 1:1:1 closes. Detail in the
   companion preflight spec, Arms B and C.

The ecxc production outage is already fixed live (the sending domain was onboarded on 2026-06-08), so
nothing in this sequence is time-critical, which is what lets the foundation come first.

## Pass 1 in detail: the foundation

### What it builds

- `src/lib/diagnostics/` with the `CairnCondition` type, the registry (`condition(id)` and an iterator),
  and the `CairnError` class.
- The runtime renderer, a `renderConditionPage(condition, ctx)` that produces the branded static page
  from the shared shell the `0.34.0` and `0.35.0` work already extracted.
- Registry entries for the conditions the existing pages and guard reasons represent: `edge.https-not-forced`
  for the HTTPS-required page, and two CSRF-family entries, one for the admin `__Host-cairn_csrf`
  token rejection and one for the strict `Origin` rejection. The guard distinguishes these two in its
  `reason` already, so they map to two conditions, not one.

### What it migrates

The two branded pages cairn already serves move onto the model with no behavior change:

- `src/lib/sveltekit/https-required-page.ts`, the deployed-http help page, becomes a render of its
  condition entry.
- The branded CSRF 403 page in the auth guard becomes a render of its condition entry.

The guard's `guard.rejected` log already carries a `reason` of `csrf`, `origin`, or `https`. Pass 1
maps each reason to its own condition id, so the `csrf` and `origin` reasons become two separate
CSRF-family conditions and `https` maps to the HTTPS condition. The log event and the rendered page
draw from one entry per reason. The pages render the same output as before. The change is the source of
that output, not its appearance.

### Scope discipline

Pass 1 builds only the runtime renderer, because the two pages are its only consumers. The doctor
renderer and the checklist renderer wait for Pass 3, where their consumers arrive. The condition data
model is complete from the start, so Pass 3 adds probes and renderers without reshaping the registry.

### Testing

- Unit tests for the registry (`condition(id)` resolves, the iterator covers every entry) and for
  `CairnError` (it carries the id and the resolved condition, and `instanceof` narrows).
- A snapshot test pinning that the HTTPS-required and CSRF pages render the same output after the
  migration as before it, so the re-home is provably behavior-preserving.
- A test asserting each migrated `guard.rejected` reason maps to a registered condition id.

### Security review

The `web-auth-security-reviewer` confirms the migration changes no guard ordering and no rejection
behavior, that the rendered pages escape the same values they did before, and that a `CairnError` and
its condition fields carry no secret.

## Out of scope for the initiative

- Consumer-registered custom conditions through the undesigned `CairnExtension` seam. The registry is
  internal and closed for now.
- Edge rate-limiting of the unauthenticated auth route, which stays the existing engine carry-forward.

## Open questions

- Whether `renderConditionPage` stays SvelteKit-shaped (a `Response`) or returns a string the caller
  wraps, which would let the doctor reuse it for a terminal rendering later.
