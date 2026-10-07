# Debug your site

A cairn site is a SvelteKit app running as a Cloudflare Worker, and the engine inside it writes
every operationally meaningful event as one JSON record through one internal chokepoint. The events
a developer meets most often fire from engine code running inside the site's extension points, such
as a concept's fieldset, a wrapped admin action, or a public route factory. Some come instead from
the engine's checks on the site's committed config. When such an event reports a fault, the fault
is site code that broke the seam's contract, never an engine bug, so its record names the seam and
the place the fix goes. Other failures leave no record, and a developer finds them by what the site
shows instead. Those include an error from a Worker env read, a test whose result changes with no
source change, and a build check that passes without comparing.

A developer building an organization's site on cairn's seams arrives at this page for one of the
following reasons:

- The site misbehaves under the development server or in production.
- A check in an extend guide failed, and the failure names an event or failure this page covers.
- The developer is building a query, an alert, or records of their own on the same record shape.

For each symptom, a developer matches the record it leaves, or the error or test result it shows,
to the change that fixes it. A row that needs no change says so. The rows
assume working knowledge of SvelteKit server code, including hooks, loads, and form actions, along
with the site's Wrangler config and whichever seams the site uses. Most rows link the reference
entry for the seam their fix changes.

The [log events](../reference/log-events.md) reference lists every event with its fields, and it
holds the rows for sign-in and access refusals and for a sign-in email the engine could not send,
which this page leaves out. An error that began with an engine upgrade belongs to [Upgrade
cairn](upgrade-cairn.md) and the [migration notes](migration-notes.md). Configuring cairn-audit
for a whole site belongs to [Run cairn-audit on your site](run-cairn-audit-on-your-site.md). Apart
from the records whose rows say no change is needed, a symptom that a site's operator can resolve
without changing code is outside this page's scope.

## Read the structured logs

Each engine record is one JSON object with a `level`, `event`, and `timestamp` envelope, and each
symptom on this page names the `event` to find. The event's fields follow the envelope. A query or
an alert keyed on an event name rests on a stable contract, since renaming an `event` is a breaking
change.

### Find the records

A deployed Worker's records reach Workers Logs only when its Wrangler config sets
`observability.enabled` to `true`. With the setting absent or not `true`, the records go nowhere and
a runtime failure leaves nothing to read. Setting it to `true` in `wrangler.jsonc` and redeploying
fixes that, and [`cairn doctor`](../reference/cli-cairn-doctor.md#the-checks) reports the missing
setting as `config.observability-off`.

A developer reads the records through the following surfaces:

- Workers Logs shows the Worker's structured logs in the Cloudflare dashboard, as [Cloudflare's
  Workers Logs
  documentation](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
  describes.
- `npx wrangler tail` streams the Worker's logs live while the developer reproduces the problem, as
  the [Wrangler commands reference](https://developers.cloudflare.com/workers/wrangler/commands/#tail)
  describes.
- `cairn logs <site>` reads the site's records from Workers Observability, where `<site>` is the
  site id that `cairn sites list` prints.
- `cairn health` fails its `errors` check when the engine's error-level records within the `--since`
  window, `24h` by default, exceed `--error-threshold`, `5` by default.

A Worker with observability off answers `cairn logs` with zero entries and no error, so an empty
result is no proof the site is quiet. A failed `errors` check is the cue to read those records with
`cairn logs` and match each one to its row on this page. A script or an agent that runs these
commands reads their contract from `cairn help agents`. The `cairn` CLI prints that contract itself,
because `go install` installs no docs tree. That contract covers the exit codes and their
precedence, stdout for payload with stderr for diagnostics, skip versus unknown, and the schema
URLs. The [exit codes](../reference/cli-cairn-exit-codes.md) and [JSON
output](../reference/cli-cairn-json-output.md) references are its published form.

### Record contents

The engine writes every record through one internal module, which names each event
`area[.subject].verb_phrase`, the vocabulary the [log events](../reference/log-events.md) reference
documents. An engine record takes the same redaction a site's records take through `/log`. No record
carries a sign-in token, a session id, or a sign-in link's contents.

Redaction walks three levels deep into plain objects and arrays, and it leaves a key at level four
or deeper as written. A repeated reference appears as `'<repeated>'`. A getter that throws inside a
call's fields never throws out of the log call. The record then carries
`fields: '<unserializable>'` in place of the event's fields. The
[`createLogger`](../reference/log.md#createlogger) entry gives the key-matching rule and the default
key list.

## Content field events

A concept's fieldset logs these events while the engine builds the tag index or validates a save,
and each one points at a single field declaration.

### `content.field_unmarked`

A concept that declares a multiselect named `tags`, `freetags`, or `categories` but marks no field
`taxonomy: true` gets an empty tag index, and the engine logs `content.field_unmarked` as a warning.
The record's `concept` names the concept and its `field` the unmarked multiselect, as the [log
events](../reference/log-events.md) reference lists. The tag index reads only the field marked
`taxonomy: true`, and no field name stands in as a default. The fix is a code change that adds
`taxonomy: true` to the concept's tag field, as the [concept fields
reference](../reference/core.md#fields-1) describes.

### `content.field_behavior_failed`

The engine catches a field's `behavior.validate()` that throws during a save, treats the field as
valid, and saves the value it should have refused. The engine logs `content.field_behavior_failed`
as a warning, with the fields the [log events](../reference/log-events.md) reference lists. Its
`field` names the field, `owner` the schema it belongs to, and `error` the exception's message. The
engine fails open on a throwing validator so that one bug does not fail the whole save. The fix is a
code change that stops the named field's `behavior.validate()` from throwing the error in `error`.
The [field types](../reference/core.md#field-types) reference documents a field's behavior.

## Public route events

`createPublicRoutes` checks its wiring once, when it is built, so its one event appears once and
not on each request.

### `media.resolver_absent`

Public images render as literal `media:` tokens when the site's content carries `media:` tokens but
the site passes no `resolveMedia` to `createPublicRoutes`. When the site also passes `assetsEnabled:
true`, the engine logs `media.resolver_absent` as a warning once, when the factory is built, as the
[log events](../reference/log-events.md) reference lists. Without that flag, the tokens appear with
no record. The fix is a code change that passes the site's `resolveMedia` to `createPublicRoutes`,
as the [`PublicRoutesConfig`](../reference/delivery.md#publicroutesconfig) entry describes.

## Admin action events

The wrappers around a custom screen's form actions, `createAdminAction` and `createSectionAction`,
log these events at the check that stopped or degraded the action.

`createSectionAction` runs the following checks before its handler, in this order:

1. The session and CSRF checks that `createAdminAction` runs, which log
   `admin.action.session_absent` or `admin.action.csrf_refused`.
2. The rate limit, when one is configured, which degrades to open and logs
   `admin.action.rate_limit_absent` or `admin.action.rate_limit_failed`.
3. The access map, which must be attached, or the action answers `fail(500)` and logs
   `admin.action.misconfigured`.
4. The authorization against the map that [Restrict admin access](restrict-admin-access.md)
   describes, which answers `fail(403)` and logs
   [`auth.access.refused`](../reference/log-events.md).
5. The database binding, which must resolve, or the action answers `fail(500)` and logs
   `admin.action.misconfigured`.

The handler must call `ctx.audit` before it returns, and the site's audit sink runs inside that
call. Each event in this list places the request at the check that logged it.
For `admin.action.misconfigured`, the record's `reason` tells check 3 from check 5. The
[`createSectionAction`](../reference/sveltekit.md#createsectionaction) entry states the full
contract.

### `admin.action.session_absent`

A wrapped action logs `admin.action.session_absent` and redirects to `/admin/login` when the
editor's session lapsed after the guard resolved it. The editor sees a form submission land on the
sign-in page. The record is a warning whose `path` names the action's route, as the [log
events](../reference/log-events.md) reference lists. This record is the only trace of the lapse,
since the guard's CSRF refusal covers an earlier condition. The row needs no code change, and the
editor signs in again.

### `admin.action.csrf_refused`

A wrapped action logs `admin.action.csrf_refused` and answers SvelteKit's `error(403, ...)` when
the post fails the CSRF check. The record is a warning whose fields the [log
events](../reference/log-events.md) reference lists. `devBackendHandle` runs no CSRF check, so under
the dev backend this record is the first trace of a form that posts without a token. Behind the
guard, the same post stops earlier at `guard.refused` with reason `csrf`. The fix is a code change
that mounts `CsrfField` from `@glw907/cairn-cms/admin` in each form that posts to the action.

### `admin.action.rate_limit_absent`

`createSectionAction` logs `admin.action.rate_limit_absent` and runs the action with no limit when
`config.rateLimit.resolve` returns no limiter. The record is a warning whose fields the [log
events](../reference/log-events.md) reference lists. The check degrades to open on purpose. The fix
is a code or config change that makes `resolve` return the rate-limit binding. The site's Wrangler
config declares that binding under the name `resolve` reads. The
[`createSectionAction`](../reference/sveltekit.md#createsectionaction) entry lists the `rateLimit`
members.

### `admin.action.rate_limit_failed`

`createSectionAction` logs `admin.action.rate_limit_failed` and runs the action with no limit when
the site's `key()` or the limiter's `limit()` throws. The record is a warning whose `error` carries
the throw, with its other fields in the [log events](../reference/log-events.md) reference. The
check degrades to open, except that a SvelteKit `redirect()` or `error()` thrown from either call is
rethrown untouched, so a deliberate redirect or error still takes effect. The fix is a code change
to `key()` or to the limiter, wherever the throw in `error` began. An over-limit call logs
`admin.action.rate_limited` and answers `fail(429)`, which is the limit working and not a fault.

### `admin.action.misconfigured`

`createSectionAction` answers `fail(500)` and logs `admin.action.misconfigured` when the action's
access map or its database binding is missing. The record is an error carrying `path` and `reason`,
as the [log events](../reference/log-events.md) reference lists. Each `reason` value names the
missing piece:

- `access_map_not_attached` means `event.locals.cairnAccess` was not set when the action ran.
- `db_not_bound` means `resolveDb` returned `null` or `undefined` from the Worker env the engine
  takes from `cloudflare:workers`.

For `access_map_not_attached`, the cause is a hook that set the editor without attaching the map.
[`createAuthGuard`](../reference/sveltekit.md#createauthguard) attaches the map on every admin path
where it signs an editor in, so behind the guard this reason does not occur. The dev backend's
`devBackendHandle` attaches the map only when its config carries `access`. The fix is a code change
in the site's server hooks that passes the guard's map as `devBackendHandle({ access })`. [Restrict
admin access](restrict-admin-access.md) describes the map.

For `db_not_bound`, the binding that `resolveDb` names is missing from that env. The fix is a config
change that declares the D1 binding in the Wrangler config under the name `resolveDb` reads.

### `admin.action.unaudited`

A `createAdminAction` route that returns without calling `ctx.audit`, other than through SvelteKit's
`fail()`, throws `UnauditedActionError` in development and logs `admin.action.unaudited` in
production. The production record is an error carrying `editor` and `path`, as the [log
events](../reference/log-events.md) reference lists, and the action leaves no audit record.
Production logs instead of throwing, since an error response mid-request would be worse than a gap
in the audit trail. The fix is a code change in the handler that calls `ctx.audit` on every
successful path before it returns, as the
[`createAdminAction`](../reference/sveltekit.md#createadminaction) entry describes.

### `audit.sink.call_failed`

The site's `event.locals.cairnAuditSink` threw or rejected after the action's change completed, so
the action's result stands and only its audit record was lost. The engine logs `audit.sink.call_failed`
as an error whose `error` carries the sink's failure, with its other fields in the [log
events](../reference/log-events.md) reference. The record omits the audit record's `detail`,
because the `admin.action.audited` record logged before it carries the full audit record. The fix is
a code change to the site's sink, at the failure that `error` names.

A site that wires [`createD1AuditSink`](../reference/sveltekit.md#created1auditsink) reads
`audit.sink.write_failed` instead, since that sink catches its own failures before
`audit.sink.call_failed` can fire. That record carries the audit record itself, truncated, because
it is the only surviving trace of a row the packaged sink failed to write. Its `actor` need not be
an editor's email when site code calls the sink directly with the site's domain events, so a query
filtered on editor addresses can miss those records.

## Site config events

The engine logs these events when the site's committed config fails to parse or validate, and when
a declared access map leaves a concept or a fixed engine screen without a rule.

### `config.invalid`

When the committed site config fails to parse or validate, the record's `error` carries the parser's
real message while the admin shows an empty list or generic copy. The engine logs `config.invalid`
as an error carrying `scope` and `error`, and the [log events](../reference/log-events.md) reference
lists its fields. The two loads, with `scope` set to `nav` or `vocabulary`, leave the nav editor or
the tag-vocabulary screen empty. The two saves, with `scope` set to `settings` or `vocabulary`,
answer `fail(500)` with generic copy. The fix is a code change that corrects the committed config
the record's `scope` names, using the message in `error`, and commits it.

### `config.access_unmapped`

The engine checks the access map once, when the site composes, so `config.access_unmapped` appears
at most once per isolate, on a cold start. A Workers Logs query scoped to a live request window can
miss the warning entirely, so finding it takes a wider window. The record's `unmapped` field lists
the targets with no rule, as the [log events](../reference/log-events.md) reference describes. The
[Security model](security-model.md#allowlist-semantics-from-an-exhaustive-map) page sets out what
the warning reports and when a map is meant to be exhaustive. For a map meant to be exhaustive, the
fix is a code change that adds a rule for each target the warning names. [Restrict admin
access](restrict-admin-access.md) describes the rules. A map that is not meant to be exhaustive
needs no change.

## Session and commit records

These records report no fault, yet a query built on them miscounts unless it allows for when each
one fires and which field it carries. No row in this group needs a code change.

### `auth.session.destroyed`

Sign-out logs `auth.session.destroyed` only when the deleted session row was still live, so a stale
cookie or an expired row leaves no record. The record carries the row's `email`, as the [log
events](../reference/log-events.md) reference lists. An alert built on it counts live sign-outs
only, so it can report fewer records than sign-outs.

### `auth.channel.session.destroyed`

An auth channel logs `auth.channel.session.destroyed` on three paths, only for a live row, and the
record carries a `correlationId` in place of the roster subject. The record fires on the following
paths:

- The channel's logout action.
- A confirm that clears the session row an incoming cookie named.
- A revocation by `resolveSubject` of a session the site's `verify` hook refused.

On all three paths, an expired row is deleted with no record. A query correlates these records by
`correlationId`, and the event's row in the [log events](../reference/log-events.md) reference
explains how that pseudonym is derived on each path.

### `commit.succeeded` and `commit.failed`

A commit record carries `concept` for an entry commit and `scope` for a nav, settings, vocabulary,
or media commit, never both. A commit record with no `concept` is therefore a commit to one of those
surfaces, and the [log events](../reference/log-events.md) reference lists both events' fields.
Because of that split, a site concept named `media` or `nav` cannot be confused with those surfaces.
A query filters entry commits on `concept` and the other surfaces on `scope`.

## Site records with `createLogger`

The `/log` subpath exports `createLogger`, so a site's own events share the engine's record shape
and redaction. It also exports `REDACTED_LOG_KEYS`, `CAIRN_LOG_EVENTS`, and the `CairnLogEvent`
type, while the engine's `log` instance stays internal. The `redactKeys` option unions a site's
field names with the default keys and cannot narrow them. A site's records take the redaction that
[Record contents](#record-contents) describes. The
[`createLogger`](../reference/log.md#createlogger) entry gives the signature, the key-matching rule,
the default key list, and a worked example.

## Worker environment reads

A site on `@sveltejs/adapter-cloudflare` 8 reads its Worker env from `cloudflare:workers`, because
the adapter passes no `platform` to a request. These failures surface as a thrown error or an absent
value, never as an engine record.

### `event.platform` is undefined

Under `@sveltejs/adapter-cloudflare` 8, `event.platform` is undefined in every environment,
`vite dev`, `wrangler dev`, and production alike, so code that reads the env through
`event.platform` finds no bindings. The fix is a code change that reads the env through
`import { env } from 'cloudflare:workers'`. That import returns the Wrangler config's `vars` under
`vite dev` and `wrangler dev` alike, so the site needs no `process.env` fallback. A value meant only
for local development goes in `.dev.vars`, which both development servers read and which never
deploys.

### A Worker env read throws during the build

Every `cloudflare:workers` `env` read throws while the build prerenders, so a read in a hook or at
module scope fails the build. Code that can run then checks `building` from `$app/env` first.
`building` is SvelteKit 3's flag, and `$app/environment` survives only as a deprecated alias. The
engine's paths ask the same question through an internal helper that a site does not call. The fix
is a code change that guards the read, as the audit-sink hook in the
[`createD1AuditSink`](../reference/sveltekit.md#created1auditsink) entry does with `if (!building &&
env.AUDIT_DB)`.

## Date-dependent output

Output that reads the clock or the host's time zone can change between days and between machines
with no change to the source.

### A visual baseline changes every day

A baseline that renders a component reading `Date.now()` fails each day although the source has not
changed, because the component reads the live clock. The fix is a reader and a `CAIRN_FIXED_TODAY`
variable that the site owns, since no engine code reads that variable. The following steps set up
the reader and the variable, in order:

1. In a site module, read today through a fixed-today reader that takes `CAIRN_FIXED_TODAY` from the
   Worker env, never through `Date.now()` in a rendered component.
2. In `.dev.vars`, set `CAIRN_FIXED_TODAY` to an explicit instant, never in the Wrangler config's
   `vars`, which deploy with the Worker.
3. In `.dev.vars.example`, add `CAIRN_FIXED_TODAY = ""`, then regenerate `worker-configuration.d.ts`
   with the command its first lines record, so the generated `Env` declares it. A scaffolded site
   records `npx wrangler types --env-file=.dev.vars.example --include-runtime=false`.

Cloudflare's [local development environment
variables](https://developers.cloudflare.com/workers/local-development/environment-variables/) page
describes `.dev.vars`. The following reader is illustrative:

<!-- snippet-check-skip: reads env.CAIRN_FIXED_TODAY, which only the site's own generated Env declares -->
```ts
// src/lib/today.ts
import { building } from '$app/env';
import { env } from 'cloudflare:workers';

export function today(): Date {
  // The Worker env is unreadable while the build prerenders.
  const pin = building ? undefined : env.CAIRN_FIXED_TODAY;
  return pin ? new Date(pin) : new Date();
}
```

The `building` check keeps the reader off the env while the build prerenders, as [A Worker env read
throws during the build](#a-worker-env-read-throws-during-the-build) explains.

### `CAIRN_FIXED_TODAY` yields `Invalid Date`

`new Date(env.CAIRN_FIXED_TODAY)` returns `Invalid Date` without throwing when the value is
malformed. The site shows `Invalid Date` where the pinned date belongs. The fix is a config change
that writes the value as an explicit instant, such as `2026-08-29T00:00:00Z`.

### A date differs between machines

Formatting without a `timeZone` option uses the host's time zone, so one instant can format as
different days on different machines. A baseline or a test passes on one machine and fails on
another, a day apart. `Date`'s local-time accessors and `toLocale*String` without `timeZone` read
the host's zone. A date-only pin parses as UTC midnight and formats as the previous local day on a
machine west of UTC. The fix is a code change that formats in UTC or in one fixed zone and keeps the
pin an explicit instant. MDN's
[`toLocaleDateString()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString)
page describes the `timeZone` option.

## A stale `site-facts.json` passes the build

The build fails when the committed `site-facts.json` no longer matches the adapter, but when the
build cannot derive the facts from the adapter, it reports the file current. In the normal case, the
build error names the file and the fix. The [`site-facts.json`
contract](../reference/site-facts.md#who-writes-it-and-who-verifies-it) describes what the file
carries and the warning for an absent file.

When the adapter throws for an unrelated reason, the build cannot derive the facts and reports the
file current with no signal, so a passing build does not show that the file matches. After a change
to the adapter's media bucket binding, its `roles`, or its `aiPosture`, the following steps bring
the file current:

1. In the directory that holds the site's `vite.config.ts`, run `npx cairn-manifest`, which writes
   `site-facts.json` in the same run as the content manifest.
2. In the site's repository, commit the regenerated `site-facts.json`.

The [`cairn-manifest`](../reference/cli-cairn-manifest.md) reference describes the command.

## See also

The following pages cover the seams and tasks this page's events come from:

- [Architecture](architecture.md#seams) describes the seams whose events the rows name.
- [Add a custom admin screen](add-a-custom-admin-screen.md) describes how to build a wrapped action
  and wire its audit sink.
- [Add a second sign-in group](add-a-second-sign-in-group.md) describes the auth channel whose
  session record this page reads.
