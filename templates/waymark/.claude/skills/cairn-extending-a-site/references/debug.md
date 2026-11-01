# Debug a running site

Contents:

- [Logs first](#logs-first)
- [Where records live](#where-records-live)
- [Admin action failures](#admin-action-failures)
- [Records that are not faults](#records-that-are-not-faults)
- [Content, reference, and include failures](#content-reference-and-include-failures)
- [Site records with createLogger](#site-records-with-createlogger)
- [Failures that leave no record](#failures-that-leave-no-record)

## Logs first

1. Read the structured records before you edit code or add a `console` call. The record usually
   names the seam and the fix.
2. Find the failing request's record by `event` and `path`, then look it up in
   `references/log-events.md` for what its `reason` means.
3. Fix where the record points, in site code or config. Do not add logging to find a cause a record
   already names.

## Where records live

- Deployed: Workers Logs, only when `wrangler.jsonc` sets `"observability": { "enabled": true }`.
  Without it the records go nowhere and `cairn logs` returns zero entries with no error, so an empty
  result proves nothing. `cairn doctor` reports it as `config.observability-off`.
- Live: `npx wrangler tail`. CLI: `cairn logs <site>`; `cairn health` fails its `errors` check above
  `--error-threshold` (5) error records in `--since` (24h).
- `vite dev` or `wrangler dev`: records print to the server terminal by level.
- A file of exported records (`.jsonl`): read it first, filter on `level: error` and on the path of
  the failing screen.

## Admin action failures

A custom screen's action wrapped in `createSectionAction` runs these checks in order, and the record
places the failure:

1. Session and CSRF: `admin.action.session_absent` (redirect to login), `admin.action.csrf_refused`
   (403; mount `CsrfField` from `@glw907/cairn-cms/admin` in the form).
2. Rate limit, only if configured: `admin.action.rate_limit_absent` or `_failed`, both degrade to
   open.
3. Access map attached: `admin.action.misconfigured` `reason: access_map_not_attached`.
4. Map authorization: `fail(403)` and `auth.access.refused`.
5. Database binding: `admin.action.misconfigured` `reason: db_not_bound`.

**`admin.action.misconfigured` with `db_not_bound`.** `resolveDb` returned null or undefined from
the Worker env. Do not add a database first. Check in this order:

1. Read the binding name the screen's `resolveDb` reads (`env?.SOME_DB`).
2. Read the `d1_databases[].binding` names in `wrangler.jsonc`.
3. If the database is bound under another name, change `resolveDb` to read that name. Adding a
   binding under the name the code reads creates a second, empty database.
4. Only if no binding exists for that data, declare one in `wrangler.jsonc`, create and migrate it,
   and regenerate the `Env` types.

A stale line in `worker-configuration.d.ts` can keep a wrong binding name type-checking; the
generated types are not proof the binding exists.

**`access_map_not_attached`.** A site hook set `locals.cairnEditor` without
`locals.cairnAccess = runtime.access ?? {}`. `createAuthGuard` and `devBackendHandle` always attach
it, so put the route behind the guard or attach the map in that hook.

**`admin.action.unaudited`.** A `createAdminAction` handler returned without calling `ctx.audit` on
a success path. Call it before every non-`fail()` return.

**`audit.sink.call_failed`** is the site's own sink throwing; `audit.sink.write_failed` is the
packaged `createD1AuditSink` failing (its `detail` is the only copy of the lost row).

## Records that are not faults

- `commit.failed` at `warn` with `reason: conflict` is a stale-edit collision (a 409): two edits to
  one entry, the engine refusing to clobber. It is not the cause of an unrelated failure.
- `admin.action.rate_limited` is the limit working.
- `auth.session.destroyed` fires only for a live row, so it undercounts sign-outs.
- `config.access_unmapped` is informational unless the map was meant to be exhaustive. It fires once
  per isolate at cold start.
- A commit record carries `concept` for an entry and `scope` for nav, settings, vocabulary, or media,
  never both. Filter on the one you mean.

## Content, reference, and include failures

| Symptom | Cause | Fix |
|---|---|---|
| `content.field_unmarked` | Tag-like multiselect, no `taxonomy: true` | Mark the field |
| `content.field_behavior_failed` | `behavior.validate` threw; value saved unchecked | Fix the validator named by `field` and `owner` |
| `config.invalid` | Committed site config broken (`scope` names where) | Fix the file from the message in `error` |
| `media.resolver_absent` | Public routes built with `assetsEnabled` and no `resolveMedia` | Pass `resolveMedia` to `createPublicRoutes` |
| Startup error naming a concept, a field, and an undeclared target | A reference field's `concept` names no concept | Fix the name or declare the concept |
| Build error naming a source entry, field, and missing target | A published reference points at a deleted entry | Pick another target or restore it |
| `cairn: fragment "<id>" not found` | Include names no file in the fragments dir | Use the fragment's filename without `.md` |
| Literal `::include{...}` on the page | `render` does not forward `resolveFragment` | Forward it |
| `include.missing` `empty_fragment` | Directive has no `fragment` attribute | Add the id; the build does not catch this |
| A build warning that the `site-facts.json` check was skipped | The adapter threw for another reason, so the check could not run | Fix the adapter error, run `npx cairn-manifest`, commit `site-facts.json` |

## Site records with createLogger

Log a site's own diagnosable paths through `createLogger` from `@glw907/cairn-cms/log`, never a bare
`console` call. Records share the engine's envelope and redaction: keys matching
`REDACTED_LOG_KEYS` are redacted three levels deep (deeper keys pass as written), repeated
references print `'<repeated>'`, a throwing getter yields `fields: '<unserializable>'`, and a log call
never throws. `redactKeys` widens the key list and cannot narrow it. Name events
`area[.subject].verb_phrase` and do not reuse a name `CAIRN_LOG_EVENTS` holds.

```ts
import { createLogger } from '@glw907/cairn-cms/log';

const log = createLogger({ redactKeys: ['memberToken'] });

log.warn('signup.reminder.send_failed', { signupId: 'abc', error: 'timeout' });
```

`cairn-audit`'s `log-event-grammar` and `log-secret-field` rules check these calls;
`references/audit.md` covers their limits.

## Failures that leave no record

- `event.platform` is undefined under `@sveltejs/adapter-cloudflare` 8 in every environment. Read
  bindings with `import { env } from 'cloudflare:workers'`; local-only values go in `.dev.vars`.
- Any `cloudflare:workers` `env` read throws while the build prerenders. Guard it with `building`
  from `$app/env`: `if (!building && env.AUDIT_DB)`.
- A date that differs a day between machines: formatting without `timeZone` uses the host zone. Format
  in UTC or one fixed zone, and pin test dates as explicit instants (`2026-08-29T00:00:00Z`).
- `new Date(malformed)` yields `Invalid Date` without throwing.
- A visual baseline that changes daily reads `Date.now()`. Read today through a site reader that
  takes a pin (such as `CAIRN_FIXED_TODAY`) from `.dev.vars`, never from deployed `vars`.
- A cross-site form POST refused by SvelteKit's origin check leaves only the Workers invocation
  record; see the last section of `references/log-events.md`.
