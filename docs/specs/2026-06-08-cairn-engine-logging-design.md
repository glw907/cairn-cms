# cairn engine logging: structured events behind one internal chokepoint

Design for cairn's first logging infrastructure. The engine emits a handful of operationally
meaningful events today (a magic link requested, a commit succeeded, a render error) and logs none of
them in a usable form. The only logging that exists is three bare `console.error` calls. This design
gives the engine structured, queryable diagnostics on the Cloudflare-first stack, and it makes two
forward-compatible decisions so the later admin-extension work can route logs without a rewrite.

The extensible admin functionality (the `CairnExtension` and `AdminPanel` seam) is not designed yet.
This design does not try to design it. It builds the engine's own logging and names the seams the
future work will attach to.

## What the stack gives us for free

Workers Logs reached general availability in 2025. A consumer sets `observability.enabled = true` in
`wrangler.jsonc`, and every `console` call from the Worker is ingested, indexed, and stored for seven
days, queryable in the dashboard and over a REST API. The platform indexes JSON fields with unlimited
cardinality, so a structured record filters on any field. Cloudflare and the wider Workers community
agree on one rule, to log a JSON object rather than a formatted string.

That decides the default sink. cairn writes structured JSON to `console`, and Workers Logs is the
query surface. No log-shipping dependency, no per-consumer setup beyond one config line.

## Scope: build the diagnostics, defer the extension affordances

One rule drives the split. A decision that is expensive to change later gets made now. Anything that
depends on the undesigned extension seam waits for that seam.

### Build now

cairn has about a dozen events worth emitting, all in code that already exists:

- `auth.link.requested`, `auth.link.send_failed`
- `auth.token.minted`, `auth.token.confirmed`
- `auth.session.created`, `auth.session.destroyed`
- `commit.succeeded`, `commit.failed`
- `render.failed`
- `guard.rejected` (with a `reason` field for CSRF, origin, or HTTPS)

Each becomes one structured record on `console`, at a severity that maps to `console.log`, `console.warn`,
or `console.error`. The operator gets a queryable diagnostics view from one line of config.

### Defer

Three affordances depend on how the admin-extension seam is shaped, so designing them now would be
guesswork:

- A context-bound logger on the admin request (`event.locals.cairn.log`), which depends on how Plan 09
  types the admin context.
- An `onEvent` subscribe hook on `CairnExtension`, whose shape follows the extension contract.
- Per-extension namespacing, where a panel's logger is pre-bound to the contributing extension. This
  one depends on how extensions are composed and dispatched.

The design records each as a named extension point with a one-line note on how the chokepoint
accommodates it, so the future work has a target and nobody re-opens the record shape.

## The record shape

One shape, fixed now, because retrofitting it later means rewriting every call site.

```json
{
  "level": "info",
  "event": "commit.succeeded",
  "timestamp": "2026-06-08T12:00:00.000Z",
  "sha": "a1b2c3d",
  "editor": "jo@site.com"
}
```

`level` is one of `info`, `warn`, `error`. `event` is a dotted name from the vocabulary above, and it
doubles as the stable type a future subscriber switches on. `timestamp` is an ISO 8601 string. Every
other key is event-specific structured context. A logger method takes the event name and a fields
object, so a call site reads `log.info('commit.succeeded', { sha, editor })`.

## The chokepoint

All engine logging routes through one small module, `src/lib/log/`. Nothing in the engine calls
`console` directly for diagnostics. The module owns the record assembly, the severity-to-`console`
mapping, and (today) the single console sink.

This is the decision that makes the deferred work additive. When the admin seam is designed, adding a
subscriber fan-out or a context-bound child logger is a change inside this one module. Every existing
call site keeps the same `log.info('event', fields)` shape and never moves. The internal API is the
stable contract, and the routing behind it can grow.

cairn owns the module rather than depending on LogTape or Pino. LogTape is a strong edge-native
alternative, and it carries the child-logger and sink machinery this design describes. cairn still
hand-rolls, for the same reason it owns its auth, its GitHub-App JWT signing, and its sanitize floor.
The surface is small, roughly 150 lines, and owning the API keeps the call site exactly
`log.info('event', fields)` with cairn's own request context, rather than adapting a third-party
category model. The cost is a small amount of code. The benefit is no imposed dependency on every
consumer Worker, and no third-party API leaking into cairn's public contract.

## What this deliberately does not build

- A log viewer inside `/admin`. Workers Logs already gives the developer a queryable view. An
  editor-facing history is a feature with a schema, retention, and a read path, and it can be built
  later on the deferred `onEvent` seam by a site that needs it.
- A durable audit sink (D1 or Analytics Engine). The same reasoning holds. The seam will allow it,
  and the engine does not ship it.
- A log-shipping integration (Sentry, Honeycomb, Axiom). A consumer wires a Tail Worker or an OTLP
  destination at the platform level without the library's involvement.

## Public surface and versioning

The logger type and the event vocabulary become public API the moment a consumer can observe them,
which is immediately, because the records appear in the consumer's Workers Logs. Renaming an event is
therefore a breaking change. The event list gets a reference page under `docs/reference/`, and it
carries the same versioning discipline as every other export. The record envelope (`level`, `event`,
`timestamp`) is the stable contract, and event-specific fields can be added without a break.

The logger module stays internal for this pass. Nothing outside the engine calls it yet, and exporting
a `@glw907/cairn-cms/log` subpath would commit to an API before its consumer (the admin seam) exists.
The reference page documents the emitted events, which is the part a consumer actually observes.

## Documentation

Logging is a public-facing capability the day it ships, because the records land in a consumer's
Workers Logs. Documentation is a standing pass dimension, so this pass produces three docs aimed at the
site developer and operator who run the Worker. Content editors are not an audience here, since they
never read logs.

A how-to guide, `docs/guides/read-cairn-logs.md`, in the maintain group of the guides arm. It states
the one setup step (`observability.enabled = true` in `wrangler.jsonc`), shows the dashboard query for
filtering by `event` or `editor`, and walks one worked example end to end (a failed commit, from the
`commit.failed` record to the cause). It points at the reference page for the full event list and links
the Cloudflare Workers Logs docs for the platform side.

A reference page, `docs/reference/log-events.md`, listing every emitted event with its level, its
trigger, and its event-specific fields. This page is the stable contract a future subscriber reads, so
the existing `check:reference` and `check:docs` gates keep it honest, and any new or renamed event
updates it in the same pass.

An explanation note folded into `docs/explanation/security-model.md`, recording what cairn logs and
what it withholds. The events carry an editor identity for attribution and never carry a token, a
session id in the clear, or magic-link contents. This makes the redaction stance reviewable, not
implicit in the code.

When the deferred admin-extension seam lands, the read-cairn-logs guide gains an "emit from your admin
module" section and the reference page documents the `onEvent` hook. The pass that builds those
affordances owns that documentation, the same as any other public-API change.

## Testing

- A unit suite over the log module: each level maps to the right `console` method, the record carries
  the event name and an ISO timestamp, and the fields object merges without clobbering the envelope
  keys.
- A redaction check on the events that carry an identity, so a later change cannot widen a record to
  leak a token or a session id. The minted-token and session events log an id or a hash, never the
  secret.
- Call-site coverage folds into the existing auth, commit, and render suites. Each event is asserted
  through the console sink on both its success and its failure path.

No live `wrangler` smoke is proportionate. The only runtime change is structured `console` output,
which Workers Logs ingests with no cairn-side behavior to verify beyond the unit level.

## Forward-compatibility, stated plainly

The forward-compatibility guarantee reduces to two invariants this design locks:

1. Every log is a structured record with a dotted event name, from the first call. The shape that is
   expensive to retrofit is correct now.
2. All logging routes through one module. The place the extension work will attach is one file, and
   the attachment is additive.

Everything that depends on the not-yet-designed admin seam waits for it, and slots into the chokepoint
when that seam arrives.
