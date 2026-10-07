# Page plan: Debug your site

Page: `docs/extend/debug-your-site.md`. Page type: symptom row. Status: new page, no prior version
on disk (the harvest deleted the old page; its record is context only). Written 2026-10-07 by the
plan step of the docs page chain (stage 2a). The drafter drafts from this plan: it is the source of
the page's order, each section's claim, and each fact's placement. The structural edit seat reads
it before any prose exists. The plan is Google's outline written down (Google Technical Writing
Two, "Organizing large documents", https://developers.google.com/tech-writing/two/large-docs): the
outline is the document's narrative, and information arrives where it is most relevant to the
reader.

Inputs read: the outline entry in `docs/internal/outlines/extend.json` (slug `debug-your-site`:
job, covers, out-of-scope list, exemplars); "The page anatomies" and the developer drafting brief,
including "The introduction", "Voice", and "Tells", in `docs/internal/docs-register.md`; every
fact bullet named below in `docs/internal/facts/`; the two exemplars
(`operators/github-pages-troubleshoot-domains`, `operators/cloudflare-too-many-redirects`); the
harvest record `docs/internal/record/harvest/extend/debug-your-site.json`, for context only; the
page-inputs friction entries of 2026-10-07 in `docs/internal/docs-friction-log.md`; the reference
pages each link names (`docs/reference/log-events.md`, `docs/reference/log.md`,
`docs/reference/sveltekit.md` entries `createAuthGuard`, `createAdminAction`, `createD1AuditSink`,
and `createSectionAction`, `docs/reference/delivery.md` `PublicRoutesConfig`,
`docs/reference/core.md` `fields` and "Field types", `docs/reference/site-facts.md`,
`docs/reference/cli-cairn-manifest.md`, `docs/reference/cli-cairn-doctor.md`,
`docs/reference/cli-cairn-exit-codes.md`, `docs/reference/cli-cairn-json-output.md`); the sibling
pages that link here (`docs/extend/add-cairn-to-a-sveltekit-app.md`,
`docs/extend/add-a-custom-admin-screen.md`, `docs/extend/add-a-second-sign-in-group.md`,
`docs/extend/replace-magic-links-with-cloudflare-access.md`,
`docs/extend/rotate-the-github-app-key.md`, `docs/extend/theme-your-public-site.md`) and
`docs/extend/security-model.md` ("Access map coverage") and `docs/extend/architecture.md`
("Seams"); and the code the facts cite (`src/lib/sveltekit/section-action.ts`,
`src/lib/sveltekit/admin-action.ts`, `src/lib/sveltekit/guard.ts`,
`src/lib/sveltekit/workers-env.ts`, `src/lib/sveltekit/building.ts`, `src/lib/vite/internal.ts`,
`src/lib/vite/bin.ts`, `src/lib/delivery/public-routes.ts`, `tool/cmd/cairn/messages.go`).

Headings in this plan's section list are the page's headings, verbatim. A claim inventory
`section` names one of them. The introduction is the untitled text under the H1 and is named
`Introduction`.

## What the page argues

A developer who builds on cairn's seams meets two kinds of failure. Most of the engine's
developer-facing events fire from engine code running inside the site's extension points and
report site code that broke the seam's contract, so the record a failure leaves names both the
seam and the place the fix goes (`f:gy2h7p`). The rest leave no record at all: a Worker env read
that finds nothing or throws, a date that changes between days or machines, and a build check
that passes when it could not compare. The page's spine follows that split. It teaches the reader
to find a record first, gives one heading per event in which the event names the cause and the
fix, shows how a site writes records of its own in the same shape, and then covers the failures
no record names, ordered by how much the reader can see of each.

### The order, argued

1. **Read the structured logs** comes first (cover 1, its reading half). Every event row depends
   on it, and the reader needs to know where records land, and that an empty query proves nothing
   until observability is on, before any row helps. It keeps only what a reader sees in a record,
   the redaction outcomes included; cover 1's writing half moves (item 6).
2. **The `cairn` CLI moves up into "Find the records"** (cover 7). `cairn health`'s errors check is
   the alarm that most directly sends a reader here, and `cairn logs` is a reading surface, so both
   belong with the other surfaces. Left at the end, as the outline's covers order has it, they
   would arrive after the rows they lead into. `cairn help agents` rides with them as the contract
   for a program that runs those commands.
3. **The event rows regroup by seam** (cover 2). The outline lists them in `f:gy2h7p`'s order,
   which is an inventory. The groups follow the order in which the extend track's index builds
   each seam (concept fields at outline order 4-5, public routes at 12, custom admin screens at 16,
   site config and the access map at 17-20), so a reader who has just built a seam finds its
   events where the track left them. The exemplar take supplies the inner shape: H2 per cause
   category with the literal event string as each H3, as Cloudflare's redirect page groups its
   causes.
4. **Within "Admin action events", the rows follow the wrapper's check order** (`f:1b3ye3`):
   authentication, rate limit, access map, database binding, then the handler's audit and the
   sink it calls. The first event a request logs is the first check it failed, so the order
   doubles as a triage order, the Cloudflare exemplar's other take.
5. **Session and commit records close the event groups** (cover 6). They report no fault; they
   matter to a reader building a query or an alert, and they follow every row that does report one.
6. **"Log site events with `createLogger`" follows the session and commit records** (cover 1, its
   writing half). It is a task about writing records, not reading them, and no row depends on it.
   Under "Read the structured logs" it would put the `/log` exports and the `redactKeys` option
   between a reader with a symptom and the first row. Beside the session and commit records it
   serves the same reader, one building queries, alerts, or records of their own on the shared
   shape, and it closes the record half of the page before the failures that leave no record.
7. **The failures with no record follow the events, ordered by what the reader can see**:
   "Worker environment reads" (cover 3) surfaces as a thrown error, "Date-dependent output" (cover
   4) as a test that changed with no source change, and the `site-facts.json` check (cover 8) as
   nothing at all. "Worker environment reads" also precedes "Date-dependent output" because the
   fixed-today fix reads the env through the reader and the `building` guard that section
   introduces.
8. **Errors after an upgrade move into the introduction** (cover 5, link only). A reader whose
   failure began with an engine upgrade is routed to the upgrade pages before reading any row,
   which is the most relevant point, and a one-sentence H2 would be a heading with nothing under it
   but a link.
9. **See also** closes the page; see "Ending" for why.

### Departures from the outline's covers order, with the reason for each

- Cover 1 splits. The envelope, the chokepoint, and the redaction outcomes a reader sees in a
  record stay first, in "Read the structured logs"; the `/log` exports and the `redactKeys`
  option move to "Log site events with `createLogger`", after the session and commit records, as
  item 6 argues.
- Cover 5 (upgrade link) moves into the introduction's scope paragraph, as item 8 argues.
- Cover 7 (the CLI) moves into "Find the records", as item 2 argues.
- Cover 2's events regroup by seam in the track's order, and the admin action rows take the
  wrapper's check order, as items 3 and 4 argue.
- Cover 6 joins the event groups as their last group, ahead of covers 3 and 4, as item 5 argues.
- Cover 8 keeps its last place among the symptoms, now argued by visibility (item 7).

### Exemplar takes, and where each lands

- **GitHub Pages, "Troubleshooting custom domains".** One heading per symptom, each holding cause
  and fix: every H3 below holds what the reader sees, what it means, and the fix, in that order.
  The verify-with tool named in the fix lands where a tool exists: `cairn logs` and Workers Logs in
  "Find the records", `npx cairn-manifest` in the `site-facts.json` section, `cairn doctor` for the
  observability setting. The log event each symptom correlates with, which the capture has no slot
  for, is each event row's heading and links `docs/reference/log-events.md`. Left behind: the DNS
  content and the "contact your provider" dead ends.
- **Cloudflare, "ERR_TOO_MANY_REDIRECTS".** The literal error or event string as the heading lands
  as every event H3 and as `CAIRN_FIXED_TODAY` yields `Invalid Date`. The cause list that doubles
  as a triage order lands as the numbered check order in "Admin action events". Left behind: the
  SSL-mode content and every dashboard-setting fix, since each fix here is a change to the site's
  code or config.

### Heading policy

Group headings are noun phrases; "Read the structured logs", its H3 "Find the records", and the
H2 "Log site events with `createLogger`" are task headings with a bare infinitive; each symptom
heading is the literal event string or what the reader sees,
per the exemplars. No heading is a question, and none uses "trap" or another figure (Tells, "No
figurative language"). No page links an anchor on this page today: every inbound link targets the
page itself (`docs/extend/add-a-custom-admin-screen.md:555`,
`docs/extend/add-a-second-sign-in-group.md:600`,
`docs/extend/add-cairn-to-a-sveltekit-app.md:562,792,1106,1214`,
`docs/extend/replace-magic-links-with-cloudflare-access.md:400`,
`docs/extend/rotate-the-github-app-key.md:131`, `docs/extend/theme-your-public-site.md:499`), so
every heading is free. "`commit.succeeded` and `commit.failed`" joins two event names with no
comma, so `Cairn.TwoHeadedHeading` does not fire, and it names one subject, the commit record
pair; this is the one contestable heading.

## The introduction, in Google's three parts

No heading. It opens on a statement, never an imperative, and frames the page from above before
the contract (register, "The introduction"). Two or three paragraphs. The intro-framing step
reasons the final wording. Content items, in order:

1. **The model (what the document covers, framed from above).** A cairn site is a SvelteKit app
   on Cloudflare's adapter, running as a Worker, and the engine writes every operationally
   meaningful event as one JSON record through one internal chokepoint, under an event vocabulary
   that is stable public contract (`f:eywrq8`, scoped to the chokepoint and the vocabulary;
   `f:rkj7tn`). The events a developer meets most fire from engine code running inside the site's
   extension points (a concept's fieldset, a wrapped admin action, a public route factory, the
   site's committed config), and each reports site code that broke the seam's contract, never an
   engine bug (`f:gy2h7p`). So a record names the seam and the place the fix goes. Some failures
   leave no record: a Worker env read, a date that depends on the clock or the host's zone, and the
   build's `site-facts.json` check. The page covers those by what the reader sees instead.
2. **Who and why, with the contract.** The reader is the developer building an organization's site
   on cairn's seams, arriving for one of three reasons: a site that misbehaves under the
   development server or in production, a failed check on a task guide whose failure names one of
   the events or failures this page covers, or a query or alert they are building on the records.
   Name each reason so each reader learns early that the page answers it (house ruling, "A page
   may serve several readers"). The second reason is bounded on purpose: task guides also route
   here failures that have no row on this page (friction entry 4), so the reason promises only
   the rows the sections hold, and item 4's routed-failures bullet sends the rest to their rows.
   The contract sentence, inside the framing: match a symptom to the record it leaves, or to the
   error or test result it shows, and make the code or config change that fixes it.
3. **Prior knowledge.** SvelteKit server code (hooks, loads, form actions), the site's Wrangler
   config, and whichever seams the site uses; each row links the reference entry for its seam, so
   the introduction names no seam API.
4. **What the page does not cover, with the page that does.** This sentence may name the page,
   since scope has no subject-first form.
   - The full event table, every event and field: `docs/reference/log-events.md`.
   - Configuring `cairn-audit`: `docs/extend/run-cairn-audit-on-your-site.md` (an outline page not
     yet on disk, so the link passes as pending).
   - An error that began with an engine upgrade: `docs/extend/upgrade-cairn.md` and
     `docs/extend/migration-notes.md` (cover 5, link only, no factual claim).
   - Sign-in and access failures that a task guide routes here and that have no row on this
     page: a refused request (`guard.refused`, the route from
     `docs/extend/replace-magic-links-with-cloudflare-access.md:400`), an access-map refusal
     (`auth.access.refused`, the 2026-10-03 friction entry), and a sign-in email the engine could
     not send (`auth.link.send_failed`, behind the routes from
     `docs/extend/add-cairn-to-a-sveltekit-app.md:1106,1214`). Point the reader at their rows in
     `docs/reference/log-events.md` (opened and confirmed: the table has a row for each of the
     three, with `guard.refused`'s reasons and `auth.link.send_failed`'s rejected send). Name the
     email case as a send the engine could not complete, never as every sign-in email that does
     not arrive: no fact on this page's list ties a missing email to that record. The sibling
     routes for the dev backend, the content build, and the other production failures get no
     line here; the bounded reason 2 promises none of them, and friction entry 4 records them.
   - Symptoms a site's operator resolves without changing code. State the bound with no link and
     no page name: the outline routes these to `docs/admin/troubleshooting.md`, which no committed
     outline plans, so `check:docs` refuses the link (friction entry 4). The checked-in
     configuration the site depends on can be named through `cairn doctor`'s checks,
     `docs/reference/cli-cairn-doctor.md#the-checks`, if the sentence needs a destination.

## Sections, in order

Each entry carries the page heading; **First sentence**, the one sentence a reader takes from the
section, which is the section's first sentence on the page (its claim is fixed here, its wording
may move to the register's voice; a sentence in a task section stays under 26 words, and a
symptom row's explanatory sentence may run longer only to keep one qualified claim whole);
**Facts**, the ids it draws on ("cited again" marks a fact whose primary home is another section);
the content; and **Hand-off**.

Every event row (an H3 named for an event) holds four parts in this order, per the symptom-row
anatomy: what the reader sees, the event and its fields, what it means, and the fix. Each event
row links `docs/reference/log-events.md` once, at its fields clause, since a reader can reach a row
by its anchor and read it alone. A row whose fix is a code change says so; a row that needs no
change says that instead.

### Read the structured logs

**First sentence:** Each engine record is one JSON object with a `level`, `event`, and `timestamp`
envelope, and each symptom below names the `event` to find.

**Facts:** `f:rkj7tn`, `f:eywrq8` (scoped), `f:wi766c`, `f:avc1a2` (scoped: the redaction
outcomes). Cited again: `f:gy2h7p`, `f:mreycz` (the engine's records and a site's share one
redaction).

Content:

- The envelope and the contract (`f:rkj7tn`): every record carries the envelope plus the event's
  own fields, and renaming an `event` is a breaking change, so a query or alert keyed on an event
  name rests on a stable contract.
- The chokepoint (`f:eywrq8`, scoped): the engine writes its records through one internal module,
  and event names follow `area[.subject].verb_phrase`, documented in
  `docs/reference/log-events.md`. Never state the bullet's clause that the logger is exported from
  no package subpath; "Log site events with `createLogger`" states what `/log` exports.
- What no record carries (`f:wi766c`): a magic-link token, a session ID, or a magic link's
  contents. Say nothing about whether a record is safe to paste (Drafting constraints).
- What redaction leaves in a record (`f:avc1a2`, scoped; `f:mreycz` for the engine's records and
  a site's sharing one redaction): it walks three levels deep into plain objects and arrays and
  leaves a deeper key as written; a repeated reference reads `'<repeated>'`; a throwing getter in
  a call's fields never throws out of the log call, and the record carries
  `fields: '<unserializable>'` instead. State these as what the reader finds in a record. The
  normalization rule, the frozen arrays, and the default key list stay behind
  `docs/reference/log.md#createlogger` (opened and confirmed: the page states normalization,
  depth, the union, and the key list). No `/log` export and no `redactKeys` here.

**Hand-off:** the records are useful only once the reader can reach them.

#### Find the records

**First sentence:** A deployed Worker's records reach Workers Logs only when its Wrangler config
sets `observability.enabled` to `true`.

**Facts:** `f:txgoyy`, `f:gzs6b8`, `f:q9ylqa`, `f:vg5zt8`, `f:vi9xh0`.

Content:

- The precondition (`f:txgoyy`): with `observability.enabled` not `true`, records go nowhere and a
  runtime failure leaves nothing to read. The fix is to set it in `wrangler.jsonc` and redeploy;
  `cairn doctor` reports it as `config.observability-off`, linked to
  `docs/reference/cli-cairn-doctor.md#the-checks` (opened and confirmed: the checks table exists
  under that heading).
- A complete sentence introducing a bulleted list of the reading surfaces, parallel and unordered:
  - Workers Logs in the Cloudflare dashboard (`f:gzs6b8`); link Cloudflare's Workers Logs page
    (https://developers.cloudflare.com/workers/observability/logs/workers-logs/) rather than
    copying its query interface.
  - `npx wrangler tail`, which streams the Worker's logs live while the reader reproduces the
    problem (`f:gzs6b8`); link the command reference
    (https://developers.cloudflare.com/workers/wrangler/commands/#tail).
  - `cairn logs <site>`, which reads the site's records from Workers Observability; a Worker with
    observability off answers with zero entries and no error, so an empty result is not proof the
    site is quiet (`f:q9ylqa`).
  - `cairn health`'s `errors` check, which passes while the `--since` window (default `24h`) holds
    at most `--error-threshold` of the engine's error-level records (default `5`) and fails above
    it (`f:vg5zt8`). A failed check is a reason to read those records with `cairn logs` and match
    each to its row on this page.
- One sentence after the list (`f:vi9xh0`): a script or an agent that runs these commands reads
  their contract from `cairn help agents`, which prints exit codes and their precedence, the
  stdout and stderr split, skip versus unknown, and the schema URLs from inside the binary, since
  `go install` installs no docs tree. Link `docs/reference/cli-cairn-exit-codes.md` and
  `docs/reference/cli-cairn-json-output.md` as the published forms of that contract.
- Say nothing about where a record appears under `vite dev` or `wrangler dev` (Drafting
  constraints; friction entry 2).

**Hand-off:** into the event groups, which begin with the first seam the track builds.

### Content field events

**First sentence:** A concept's fieldset logs these events while the engine builds the tag index or
validates a save, and each points at one field declaration.

**Facts:** Cited again: `f:gy2h7p` (the fieldset as an extension point).

**Hand-off:** the first row.

#### `content.field_unmarked`

**First sentence:** A concept that declares a multiselect named `tags`, `freetags`, or `categories`
but marks no field `taxonomy: true` gets an empty tag index and this warning.

**Facts:** `f:lbeeak`.

- Sees: an empty tag index for the concept. Event: `content.field_unmarked`, a warning; link the
  table for its fields.
- Means: the tag index reads only the field marked `taxonomy: true`, and there is no field-name
  default (`f:lbeeak`).
- Fix, a code change: add `taxonomy: true` to the concept's tag field. Link
  `docs/reference/core.md#fields-1` (the `fields` entry; opened and confirmed: it describes the
  top-level multiselect marked `taxonomy: true`; confirm the `-1` slug with `check:docs`, since the
  H3 "Fields" takes the bare slug).

**Hand-off:** the second field event fires on save rather than at index build.

#### `content.field_behavior_failed`

**First sentence:** A field's `behavior.validate()` that throws during a save is caught, the field
is treated as valid, and the value it should have refused is saved.

**Facts:** `f:qdfs37`.

- Sees: a saved value the field's validator exists to refuse. Event: `content.field_behavior_failed`,
  a warning; `field` names the field, `owner` the schema it belongs to, and `error` the exception's
  message; link the table.
- Means: the engine fails open on a throwing validator so one bug does not fail the whole save
  (`f:qdfs37`). State the consequence plainly; the page-inputs friction entry already records it.
- Fix, a code change: fix the throw that `error` names, in the `behavior.validate()` of the field
  `field` names, in the schema `owner` names. Link `docs/reference/core.md#field-types` (opened and
  confirmed: `FieldsetConfig` carries the `behavior` table, and `owner` reaches only this record).

**Hand-off:** the next seam the track builds is the public routes.

### Public route events

**First sentence:** The public route factory checks its wiring once, when it is built, so its one
event appears once and not on each request.

**Facts:** Cited again: `f:twqb0s` (once at construction), `f:gy2h7p` (the route factory as an
extension point).

**Hand-off:** the row.

#### `media.resolver_absent`

**First sentence:** Public images render as literal `media:` tokens when the adapter configures
media but no `resolveMedia` function reaches `createPublicRoutes`.

**Facts:** `f:twqb0s`.

- Sees: `media:` tokens in public pages where images belong. Event: `media.resolver_absent`, a
  warning logged once when the factory is built, with no fields; link the table.
- Means: every `media:` reference has nothing to resolve against (`f:twqb0s`).
- Fix, a code change: pass the site's `resolveMedia` to `createPublicRoutes`. Link
  `docs/reference/delivery.md#publicroutesconfig` (opened and confirmed: it names `resolveMedia`
  and the one-time `media.resolver_absent` warning).
- Do not claim a request-window query misses this record; no fact states it for this event.

**Hand-off:** the custom admin screen is the next seam, and its wrappers log the most events.

### Admin action events

**First sentence:** The wrappers around a custom screen's form actions, `createAdminAction` and
`createSectionAction`, log these events at the check that stopped or degraded the action.

**Facts:** `f:1b3ye3` (added, scoped). Cited again: `f:gy2h7p`.

Content:

- A complete sentence introducing a numbered list of the checks `createSectionAction` runs before
  its handler, in order (`f:1b3ye3`), each item naming the event or answer it produces:
  1. `createAdminAction`'s authentication, which redirects a request with no session
     (`admin.action.session_absent`).
  2. The rate limit, when one is configured, which degrades to open
     (`admin.action.rate_limit_absent`, `admin.action.rate_limit_failed`).
  3. The access map, which must be attached (`admin.action.misconfigured`).
  4. Authorization against the map, which refuses with 403 (`auth.access.refused`). Link
     `docs/extend/restrict-admin-access.md` (pending) for the map; this page carries no row for
     the refusal (the 2026-10-03 friction entry), and the event's row in
     `docs/reference/log-events.md` covers a wrapped action's 403 branch (opened and confirmed),
     the same destination the introduction's routed-failures bullet names.
  5. The database binding, which must resolve (`admin.action.misconfigured`).
- One sentence after the list: after the handler returns, `createAdminAction` requires a
  `ctx.audit` call, and the site's audit sink runs inside it (`admin.action.unaudited`,
  `audit.sink.call_failed`). The first event a request logs names the first check it failed.
- Link `docs/reference/sveltekit.md#createsectionaction` for the full contract (opened and
  confirmed).

**Hand-off:** the rows follow the list's order, starting with authentication.

#### `admin.action.session_absent`

**First sentence:** A wrapped action logs `admin.action.session_absent` and redirects to
`/admin/login` when the editor's session lapsed after the guard resolved it.

**Facts:** `f:v1jj2k`.

- Sees: a form submission that lands on `/admin/login`. Event: `admin.action.session_absent`, a
  warning carrying `path`; link the table.
- Means: the session lapsed between the guard's resolve and the action; this record is the only
  trace, since the guard's own CSRF refusal covers an earlier condition (`f:v1jj2k`).
- Fix: none in code; the editor signs in again. Say nothing about a route the guard never handles
  (Drafting constraints; friction entry 1).

**Hand-off:** with a session present, the rate limit runs next.

#### `admin.action.rate_limit_absent`

**First sentence:** `createSectionAction` logs `admin.action.rate_limit_absent` and runs the action
with no limit when `config.rateLimit.resolve` returns no limiter.

**Facts:** `f:cp0tek`.

- Sees: an action that is never rate limited. Event: `admin.action.rate_limit_absent`, a warning;
  link the table.
- Means: the check degrades to open on purpose and runs the action (`f:cp0tek`).
- Fix, a code or config change: make `resolve` return the rate-limit binding, declared in the
  site's Wrangler config under the name `resolve` reads. Link
  `docs/reference/sveltekit.md#createsectionaction` for the `rateLimit` members.

**Hand-off:** a limiter that resolves can still fail.

#### `admin.action.rate_limit_failed`

**First sentence:** `createSectionAction` logs `admin.action.rate_limit_failed` and runs the action
with no limit when the site's `key()` or the limiter's `limit()` throws.

**Facts:** `f:cp0tek`.

- Sees: an action that runs past its limit. Event: `admin.action.rate_limit_failed`, a warning
  whose `error` carries the throw; link the table.
- Means: the check degrades to open, except that a SvelteKit `redirect()` or `error()` thrown from
  either call is rethrown untouched, so a deliberate stop still stops (`f:cp0tek`).
- Fix, a code change: fix the throw that `error` names, in `key()` or in the limiter.
- Close with one sentence that keeps the expected case apart: an over-limit call logs
  `admin.action.rate_limited` and answers `fail(429)`, which is the limit working, not a fault
  (`f:cp0tek`).

**Hand-off:** past the rate limit, the access map and the binding must be present.

#### `admin.action.misconfigured`

**First sentence:** `createSectionAction` answers `fail(500)` and logs `admin.action.misconfigured`
when the action's access map or its database binding is missing.

**Facts:** `f:nup3og` (scoped), `f:3j02dk` (added). Cited again: `f:1b3ye3` (`fail(500)`).

- Sees: an action that fails with a server error. Event: `admin.action.misconfigured`, an error
  carrying `path` and `reason`; link the table.
- A complete sentence introducing a bulleted list, one item per `reason`, each with its meaning
  and fix:
  - `access_map_not_attached`: `event.locals.cairnAccess` was not set when the action ran
    (`f:nup3og`, scoped; see Drafting constraints). Fix, a code change: wire `createAuthGuard` in
    `hooks.server.ts`, the handle that attaches the access map on the `/admin` paths it gates;
    link `docs/reference/sveltekit.md#createauthguard` (opened and confirmed: it gates every
    `/admin/**` path, is wired in `hooks.server.ts`, and attaches the map to `locals.cairnAccess`).
  - `db_not_bound`: `resolveDb` returned `null` or `undefined` (`f:nup3og`). `resolveDb` reads
    the site's binding off the Worker env the engine takes from `cloudflare:workers` (`f:3j02dk`),
    so the binding it names is absent from that env. Fix, a config change: declare the D1 binding
    in the Wrangler config under the name `resolveDb` reads.

**Hand-off:** with every check passed, the handler runs and must audit.

#### `admin.action.unaudited`

**First sentence:** A `createAdminAction` route that returns without calling `ctx.audit` throws
`UnauditedActionError` in development and logs `admin.action.unaudited` in production.

**Facts:** `f:07efts`.

- Sees: `UnauditedActionError` under the development server; in production, a missing audit record
  and an error-level `admin.action.unaudited` carrying `editor` and `path`; link the table.
- Means: production logs instead of throwing, since an error response mid-request would be worse
  than a gap in the audit trail (`f:07efts`).
- Fix, a code change: call `ctx.audit` on every successful path of the handler before it returns.
  Link `docs/reference/sveltekit.md#createadminaction`. Keep this row consistent with
  `docs/extend/add-a-custom-admin-screen.md#resolve-a-missing-audit-record`, which states the same
  cause; do not link it here (it is in See also).

**Hand-off:** an audited action hands its record to the site's sink.

#### `audit.sink.call_failed`

**First sentence:** The site's own `event.locals.cairnAuditSink` threw or rejected after the action
completed, so the action's result stands and only its audit record was lost.

**Facts:** `f:r3l7eq`, `f:yauo4m`, `f:k085q0`.

- Sees: an action that succeeded with no audit row. Event: `audit.sink.call_failed`, an error
  whose `error` carries the sink's failure; link the table. "Own" stays: it marks the site's sink
  against the packaged one.
- Means: `ctx.audit` already ran and the action completed (`f:r3l7eq`). The record omits the
  audit record's `detail`, because `admin.action.audited` logged the full record one line earlier
  (`f:yauo4m`).
- Fix, a code change: fix the failure `error` names in the site's sink.
- The packaged sink (`f:r3l7eq`, `f:yauo4m`, `f:k085q0`): a site that wires `createD1AuditSink`
  reads `audit.sink.write_failed` instead, since that sink catches its own failures before this
  event can fire, and that record persists the whole truncated audit record. Its `actor` is not
  necessarily an editor's email when site code calls the sink directly with its own domain
  events, so a query filtered on editor addresses can miss those records. Link
  `docs/reference/sveltekit.md#created1auditsink`.

**Hand-off:** the next seam is the site's committed config.

### Site config events

**First sentence:** The engine logs these events when the site's committed config fails to parse
or its access map leaves a concept or engine screen without a rule.

**Facts:** Cited again: `f:8fyoha`, `f:mou1li`, `f:gy2h7p` (the committed config as an extension
point).

**Hand-off:** the first row.

#### `config.invalid`

**First sentence:** When the committed site config fails to parse or validate, the record's
`error` carries the parser's real message while the admin shows an empty list or generic copy.

**Facts:** `f:8fyoha`.

- Sees: an empty nav editor or tag-vocabulary screen, or a settings or vocabulary save that fails
  with generic copy. Event: `config.invalid`, an error carrying `scope` and `error`; link the
  table.
- Means (`f:8fyoha`): the two loads (`scope` `nav` and `vocabulary`) degrade to an empty result,
  and the two saves (`settings` and `vocabulary`) answer `fail(500)`.
- Fix, a code change: correct the committed config the record's `scope` names, using the message
  in `error`, and commit it. Name no file path; no fact on this page's list states one.

**Hand-off:** the second config event fires at composition, not on a request.

#### `config.access_unmapped`

**First sentence:** The engine checks the access map once, when the site composes, so
`config.access_unmapped` appears at most once per isolate, on a cold start.

**Facts:** `f:mou1li`.

- Sees: a warning that a request-window query may never show. Event: `config.access_unmapped`;
  link the table for its `unmapped` field.
- Means and how to read it (`f:mou1li`): a Workers Logs query scoped to a live request window can
  miss it entirely, so widen the query window to find it. What the warning reports, a map that
  covers some but not all of the concept ids and fixed engine screens, is subordinated to
  `docs/extend/security-model.md#allowlist-semantics-from-an-exhaustive-map` (opened and
  confirmed: it states that coverage and links the steps).
- Fix: a code change only when the map is meant to be exhaustive; add a rule for each target the
  warning names, following `docs/extend/restrict-admin-access.md` (pending link). An unmapped
  target is otherwise the documented default, so the row says no change is needed then.

**Hand-off:** the last event group reports no fault.

### Session and commit records

**First sentence:** These records report no fault, yet a query built on them miscounts unless it
allows for when each fires and which field it carries.

**Facts:** Cited again: `f:vih1k1`, `f:vq634h`, `f:vq8cta`.

**Hand-off:** the rows, each ending with the adjustment a query makes; no row needs a code change,
and each says so.

#### `auth.session.destroyed`

**First sentence:** Sign-out logs `auth.session.destroyed` only when the deleted session row was
still live, so a stale cookie or an expired row leaves no record.

**Facts:** `f:vih1k1`.

- Sees: fewer records than sign-outs. Event: `auth.session.destroyed`, carrying the row's `email`;
  link the table.
- Means and adjustment: an alert on it counts live sign-outs only (`f:vih1k1`).

**Hand-off:** a sign-in channel destroys its own sessions.

#### `auth.channel.session.destroyed`

**First sentence:** A sign-in channel logs `auth.channel.session.destroyed` on three paths, only
for a live row, and the record carries a `correlationId` in place of the roster subject.

**Facts:** `f:vq634h`.

- Sees: a destroyed-session record with no logout behind it, or one that names no member. Event:
  `auth.channel.session.destroyed`; link the table.
- Means (`f:vq634h`): a bulleted list of the three paths, introduced by a complete sentence: the
  channel's logout; a confirm clearing the session row an incoming cookie named; and
  `resolveSubject` revoking a session the site's `verify` hook refused. An expired row deletes
  with no record on all three.
- Adjustment: correlate by `correlationId`; how that pseudonym is derived stays behind the
  event's row in `docs/reference/log-events.md` (opened and confirmed: the row explains the
  pseudonym on each path). The channel itself is linked in See also.

**Hand-off:** commit records carry one of two fields.

#### `commit.succeeded` and `commit.failed`

**First sentence:** A commit record carries `concept` for an entry commit and `scope` for a nav,
settings, vocabulary, or media commit, never both.

**Facts:** `f:vq8cta`.

- Sees: a commit record with no `concept`. Events: `commit.succeeded` and `commit.failed`; link
  the table.
- Means: a site concept named `media` or `nav` cannot be confused with those surfaces
  (`f:vq8cta`).
- Adjustment: filter entry commits on `concept` and the other surfaces on `scope`.

**Hand-off:** a site's own events can take the same record shape.

### Log site events with `createLogger`

**First sentence:** The `/log` subpath exports `createLogger`, so a site's own events share the
engine's record shape and redaction.

**Facts:** `f:mreycz`. Cited again: `f:avc1a2` (the `redactKeys` option), `f:rkj7tn` (the
envelope a site's record takes).

Content:

- What `/log` exports (`f:mreycz`): `createLogger`, `REDACTED_LOG_KEYS`, `CAIRN_LOG_EVENTS`, and
  the `CairnLogEvent` type; the engine's own `log` instance stays internal.
- One sentence on the option (`f:avc1a2`): `redactKeys` unions the site's names with the defaults
  and cannot narrow them. A site's records take the redaction "Read the structured logs" states;
  name that section by its heading and restate none of it.
- Link `docs/reference/log.md#createlogger` for the signature, the normalization rule, and the
  default key list (opened and confirmed above).
- No code block: the reference entry carries the worked example, and this page links it.

**Hand-off:** the failures that follow leave no record.

### Worker environment reads

**First sentence:** A site on adapter-cloudflare 8 reads its Worker env from `cloudflare:workers`,
because the adapter passes no `platform` to a request.

**Facts:** Cited again: `f:swjwxb`, `f:i8pbhc`.

One sentence ties the group to the page: these failures surface as a thrown error or an absent
value, never as an engine record.

**Hand-off:** the first row is the one the reader meets first, under the development server.

#### `event.platform` is undefined

**First sentence:** Under adapter-cloudflare 8, `event.platform` is undefined in every environment,
so code that reads `event.platform.env` finds no bindings.

**Facts:** `f:swjwxb` (scoped), `f:o7mr6f` (cited here, primary in "A visual baseline changes
every day").

- Sees: code that reads `event.platform.env` fails on an undefined `platform`, under `vite dev`,
  under `wrangler dev`, and in production alike (`f:swjwxb`: everywhere, not only `vite dev`).
- Means: the adapter's worker passes no `platform` (`f:swjwxb`).
- Fix, a code change: import `env` from `cloudflare:workers`, which returns the Wrangler config's
  `vars` under `vite dev` and `wrangler dev` alike (`f:swjwxb`), with no `process.env` fallback.
  A local-only value goes in `.dev.vars`, which both development servers read and which never
  deploys (`f:o7mr6f`). Show the import inline, `import { env } from 'cloudflare:workers'`; no
  code block. Do not mention `CAIRN_FIXED_TODAY` here (Drafting constraints).

**Hand-off:** that import has one rule of its own, during the build.

#### A Worker env read throws during the build

**First sentence:** Every `cloudflare:workers` `env` read throws while the build prerenders, so code
that can run then checks `building` from `$app/env` first.

**Facts:** `f:i8pbhc`.

- Sees: a build that fails while it prerenders, on a read of the Worker env in a hook or a module.
- Means (`f:i8pbhc`): `building` is SvelteKit 3's flag, from `$app/env`, with `$app/environment`
  surviving only as a deprecated alias; the engine's own paths ask the same question through an
  internal helper a site does not call.
- Fix, a code change: guard the read, as in `if (!building && env.AUDIT_DB)`, the audit-sink
  hook's form. Link `docs/reference/sveltekit.md#created1auditsink` (opened and confirmed: its
  `hooks.server.ts` example guards with `building` from `$app/env`).

**Hand-off:** the next group reads the env through the same import and the same guard.

### Date-dependent output

**First sentence:** Output that reads the clock or the host's time zone can change between days and
between machines with no change to the source.

**Facts:** Cited again: `f:ogz5eu`, `f:2r6juw`.

**Hand-off:** the first row is the visible one, a baseline that fails a test.

#### A visual baseline changes every day

**First sentence:** A baseline that renders a component reading `Date.now()` drifts each day with
no source change, and the fix reads today through a pin the site sets.

**Facts:** `f:ogz5eu`, `f:o7mr6f`. Cited again: `f:i8pbhc`, `f:swjwxb`.

- Sees: a visual-regression baseline that fails daily with no source change (`f:ogz5eu`).
- Means: the component reads the live clock.
- Fix, a code change, in this order:
  - Read today through a fixed-today reader that takes the pin from the Worker env, as
    `CAIRN_FIXED_TODAY` through `cloudflare:workers`, and never call `Date.now()` directly in a
    rendered component (`f:ogz5eu`). State once that the reader and the variable's name are the
    site's own recipe: no engine code reads `CAIRN_FIXED_TODAY` (`f:ogz5eu`; page-inputs friction
    entry on the `CAIRN_` prefix).
  - Set a local-only pin in `.dev.vars`, never in `wrangler.jsonc` `vars`, which deploy with the
    Worker (`f:o7mr6f`). Link Cloudflare's local-development environment page
    (https://developers.cloudflare.com/workers/local-development/environment-variables/).
- At most one code block, at top level (never inside a list item, which `check:snippets` cannot
  see), framed as illustrative: a `today()` reader in a site module that imports `building` from
  `$app/env` and `env` from `cloudflare:workers`, returns `new Date(pin)` when the build is not
  prerendering and the pin is set, and returns `new Date()` otherwise (`f:i8pbhc` for the guard).
  It carries a `snippet-check-skip` comment whose reason is that `CAIRN_FIXED_TODAY` is declared
  only by the site's own generated `Env`, the reference's own wording for `AUDIT_DB`. No
  `process.env` fallback (`f:iw346n` is rejected). No validation logic beyond the next row's rule.
- Say nothing about how a CI job sets the pin (friction entry 3).

**Hand-off:** a malformed pin fails without an error.

#### `CAIRN_FIXED_TODAY` yields `Invalid Date`

**First sentence:** `new Date(env.CAIRN_FIXED_TODAY)` returns `Invalid Date` without throwing when
the value is malformed, so write the pin as an explicit instant.

**Facts:** `f:yomgrm` (its first clause).

- Sees: `Invalid Date` where the pinned date belongs.
- Means: the `Date` constructor does not throw on a malformed string (`f:yomgrm`).
- Fix, a config change: write the value as an explicit instant, such as `2026-08-29T00:00:00Z`.

**Hand-off:** a date-only pin parses, but it can still show the wrong day.

#### A date differs between machines

**First sentence:** Formatting without a `timeZone` option uses the host's time zone, so one
instant can format as different days on different machines.

**Facts:** `f:2r6juw`, `f:yomgrm` (its date-only clause).

- Sees: a baseline or a test that passes on one machine and fails on another, a day apart.
- Means: `Date`'s local-time accessors and `toLocale*String` without `timeZone` read the host's
  zone (`f:2r6juw`). A date-only pin parses as UTC midnight and formats as the previous local day
  on a machine west of UTC (`f:yomgrm`).
- Fix, a code change: format in UTC or in one fixed zone, and keep the pin an explicit instant.
  Link MDN's `toLocaleDateString` page
  (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString).

**Hand-off:** the last failure shows no signal at all.

### A stale `site-facts.json` passes the build

**First sentence:** The build fails when the committed `site-facts.json` no longer matches the
adapter, except when it cannot derive the facts, when it reports the file current.

**Facts:** `f:vs9g9e`, `f:eqlssz`, `f:yio35u`.

- The normal check (`f:eqlssz`): a present file that no longer matches the adapter fails the build
  with an error naming the file and the fix. What the file carries, and the absent-file warning,
  stay behind `docs/reference/site-facts.md#who-writes-it-and-who-verifies-it` (opened and
  confirmed: it states both outcomes and the three adapter fields).
- Sees: nothing; the build passes. Means (`f:vs9g9e`): when the build cannot derive the facts
  from the adapter, because the adapter throws for an unrelated reason, the check reports the
  committed file current, so a passing build is no proof the file matches.
- Fix, a code change and a commit: after changing the adapter's media bucket, roles, or AI
  posture, run `npx cairn-manifest`, which writes `site-facts.json` in the same run as the content
  manifest (`f:yio35u`), and commit the result. Link `docs/reference/cli-cairn-manifest.md`.
- Never claim what `cairn-manifest` prints or exits when the adapter throws, and never claim
  `cairn doctor` reads a stale file; no fact on this page's list states either. The page-inputs
  friction entry already records the silent degrade.

**Hand-off:** none; See also closes the page.

## Ending

### See also

The symptom-row anatomy in `docs/internal/docs-register.md` names no closing section, though the
same section's 2026-10-01 ruling requires one for every page type (friction entry 5). The page
borrows the task guide's item 6, a see-also section of related how-to guides and concept pages,
because the task guides' failure paths are what route readers here. It does not repeat the
introduction's routing links (`docs/reference/log-events.md`, the upgrade pages, the audit page),
on the same reasoning that keeps a task guide's recovery link out of its see-also list. One
introducing sentence, then a bulleted list, each item's link text naming its destination:

- `docs/extend/architecture.md#seams`, the seams whose events the rows name.
- `docs/extend/add-a-custom-admin-screen.md`, building a wrapped action and wiring its audit sink.
- `docs/extend/add-a-second-sign-in-group.md`, the sign-in channel whose session record the page
  reads.

## Dispositions, every fact id

`carried` names the section that holds the fact's primary placement. The outline's 26 fact ids and
the eleven the page inputs added are disposed below; the plan adds two container facts, each named
where it lands. Two ids are cut: one drifted, one subordinated.

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:gy2h7p | carried | Introduction (extension-point events report a site contract violation); cited again in the leads of Content field events, Public route events, Admin action events, and Site config events |
| f:lbeeak | carried | `content.field_unmarked` |
| f:qdfs37 | carried | `content.field_behavior_failed` |
| f:twqb0s | carried | `media.resolver_absent`; cited again in Public route events |
| f:07efts | carried | `admin.action.unaudited` |
| f:r3l7eq | carried | `audit.sink.call_failed` |
| f:i1dayf | cut | Drifted from code (`src/lib/sveltekit/section-action.ts:229-240` logs `rate_limit_failed` for a throwing `key()`); `f:cp0tek` carries the corrected claim, and the page-inputs friction entry records the drift |
| f:cp0tek | carried | `admin.action.rate_limit_absent` and `admin.action.rate_limit_failed` (primary: `admin.action.rate_limit_failed`, which also closes on `admin.action.rate_limited`) |
| f:nup3og | carried (scoped) | `admin.action.misconfigured`. The `access_map_not_attached` reason is stated as `cairnAccess` unset, without the parenthetical "the guard never ran" as a diagnosis (friction entry 1) |
| f:v1jj2k | carried | `admin.action.session_absent` |
| f:8fyoha | carried | `config.invalid`; cited again in Site config events |
| f:mou1li | carried | `config.access_unmapped`; cited again in Site config events |
| f:yauo4m | carried | `audit.sink.call_failed` (the omitted `detail`, and `write_failed`'s whole record) |
| f:k085q0 | carried | `audit.sink.call_failed` (the packaged sink's `actor`) |
| f:rkj7tn | carried | Read the structured logs; cited again in Introduction and in Log site events with `createLogger` |
| f:eywrq8 | carried (scoped) | Read the structured logs (chokepoint and vocabulary only); cited again in Introduction. Its clause that the logger is exported from no subpath is never stated; `f:mreycz` states `/log` |
| f:mreycz | carried | Log site events with `createLogger`; cited again in Read the structured logs (the engine's records and a site's share one redaction) |
| f:avc1a2 | carried (scoped) | Read the structured logs (depth, `'<repeated>'`, `'<unserializable>'`, as a reader finds them in a record); its `redactKeys` union cited again in Log site events with `createLogger`. Normalization, the frozen arrays, and the key list stay behind `docs/reference/log.md#createlogger`, which states them |
| f:ogz5eu | carried | A visual baseline changes every day |
| f:yomgrm | carried | `CAIRN_FIXED_TODAY` yields `Invalid Date` (malformed value, explicit instant); its date-only clause cited again in A date differs between machines |
| f:2r6juw | carried | A date differs between machines |
| f:o7mr6f | carried | A visual baseline changes every day (the pin's local home); cited again in `event.platform` is undefined |
| f:swjwxb | carried (scoped) | `event.platform` is undefined. Its tail on a `CAIRN_FIXED_TODAY` pin in `wrangler.jsonc` `vars` is never stated; `f:o7mr6f` places the pin in `.dev.vars`, since `f:f7tkkw` is rejected |
| f:i8pbhc | carried | A Worker env read throws during the build; cited again in A visual baseline changes every day (the reader's guard) |
| f:vg5zt8 | carried | Find the records |
| f:vi9xh0 | carried | Find the records |
| f:vih1k1 | carried | `auth.session.destroyed` |
| f:vq634h | carried | `auth.channel.session.destroyed` |
| f:vq8cta | carried | `commit.succeeded` and `commit.failed` |
| f:vs9g9e | carried | A stale `site-facts.json` passes the build |
| f:eqlssz | carried | A stale `site-facts.json` passes the build (the normal failing check the exception is stated against) |
| f:yio35u | carried | A stale `site-facts.json` passes the build (the fix: `npx cairn-manifest` writes the file) |
| f:vpk81e | cut | Subordinated to `docs/reference/site-facts.md` "Who writes it and who verifies it", which states that an absent file is not drift and the build warns once naming `npx cairn-manifest` (opened and confirmed); the warning's own message names its fix, so the page needs no row for it |
| f:wi766c | carried | Read the structured logs |
| f:gzs6b8 | carried | Find the records |
| f:q9ylqa | carried | Find the records |
| f:txgoyy | carried | Find the records |
| f:1b3ye3 | carried (added, scoped) | Admin action events (the check order and `fail(500)`); cited again in `admin.action.misconfigured` |
| f:3j02dk | carried (added) | `admin.action.misconfigured` (`resolveDb` reads the Worker env from `cloudflare:workers`) |

The page-inputs inventory also carried a link-only row (errors after an upgrade), placed in the
Introduction, and an option row (`createLogger.options.redactKeys`, `f:avc1a2`), placed in Log
site events with `createLogger`, which now follows Session and commit records. The structural
edit's revision added no fact id: the introduction's routed-failures bullet is a scope pointer to
`docs/reference/log-events.md`, opened and confirmed, and its one descriptive clause (a sign-in
email the engine could not send) restates that reference's `auth.link.send_failed` row. The rejected facts `f:f7tkkw`, `f:iw346n`, and `f:99x86q` stay off
the page through the drafting constraints below.

## Friction filed

The page-inputs step filed four entries on 2026-10-07 (the fail-open validator, the silent
`checkSiteFacts` degrade, the `CAIRN_` prefix on a site recipe, and the two drifted bullets), and
this plan does not refile them. The 2026-10-03 entry on the missing `auth.access.refused` row is
not refiled. This plan filed seven entries in `docs/internal/docs-friction-log.md` on 2026-10-07,
none blocking the page:

1. A `createSectionAction` route the guard never handles logs `admin.action.session_absent`, not
   `access_map_not_attached`, since the guard sets the editor and the access map together.
2. No fact or promise says where a record appears under `vite dev` or `wrangler dev`, and the
   sink is explicitly unpromised.
3. The fixed-today recipe's CI route is unverified, and a prerendered route that reads the pin
   meets the env read that throws during the build.
4. Sibling extend pages route five recoveries here that the outline does not cover, and the
   outline's admin troubleshooting route has no committed outline, so the link gate refuses it.
   The structural edit's revision bounds the introduction's second reason to the rows the page
   holds and sends the event-backed routes (`guard.refused`, `auth.access.refused`,
   `auth.link.send_failed`) to `docs/reference/log-events.md`; the entry stays open for the rest.
5. The register's symptom-row anatomy names no closing section.
6. The repo's `CLAUDE.md` calls a log record safe to paste, while `cairn logs` and the log
   reference say it is not.
7. `f:iwf4nu` says the guard attaches the access map on every request; it attaches it only on
   admin paths.

## Cross-page notes

- `docs/extend/add-a-custom-admin-screen.md:544-555` ("Resolve a missing audit record") states
  the `admin.action.unaudited` cause; this page's row agrees with it and adds the production
  severity and the sink row.
- Five sibling promises this page does not keep are friction entry 4; the page adds no row for
  them, since no fact on its list backs one. The introduction bounds its routed-reader reason to
  the rows it holds, and its doesn't-cover list sends the sign-in and access refusals and the
  failed sign-in send to their rows in `docs/reference/log-events.md`, so a reader routed from
  `docs/extend/replace-magic-links-with-cloudflare-access.md:400` or
  `docs/extend/add-cairn-to-a-sveltekit-app.md:1214` learns in the introduction where to go.
- `docs/reference/site-facts.md` describes two verification outcomes and omits the silent
  derivation degrade (`f:vs9g9e`). This page states it; the reference's gap rides the page-inputs
  friction entry on `checkSiteFacts`.

## Drafting constraints

- Never state that the logger is exported from no package subpath (`f:eywrq8`'s stale clause).
- Never say a throwing `key()` logs `admin.action.rate_limit_absent` (`f:i1dayf` drifted).
- Never name `admin.action.misconfigured` with `access_map_not_attached`, or
  `admin.action.session_absent`, as the signal for a route the guard never handles (friction entry
  1). State each reason as the code sets it.
- Never recommend `wrangler.jsonc` `vars` for `CAIRN_FIXED_TODAY` (`f:f7tkkw` is rejected), and
  never give a `process.env` fallback (`f:iw346n` is rejected).
- Say nothing about how a CI job sets the pin, or where a record appears under `vite dev` or
  `wrangler dev` (friction entries 2 and 3).
- Never call a record safe to paste or share; say only what no record carries (`f:wi766c`).
- Never say `cairn health` counts, or `cairn logs` completes, a site's own `createLogger` events;
  `f:vg5zt8` counts the engine's records.
- Never limit `event.platform`'s absence to `vite dev`; `f:swjwxb` says every environment.
- Never call `admin.action.rate_limited` a fault.
- Never use "trap" or another figure in a heading or in prose.
- Name no committed config file path in `config.invalid`, and no error string the build prints
  for a prerender env read; no fact on the list states either.
- Each event row links `docs/reference/log-events.md` once and restates no more of the event's
  fields than the row's diagnosis needs.
- `CAIRN_FIXED_TODAY` is named as the site's own variable once, in "A visual baseline changes every
  day".
- Code font for every event name, identifier, path, and command, headings included. Lowercase
  cairn; "the engine" for the package.
- Every section opens on the first sentence decided above. A step or fix names its location before
  its action, a conditional states its condition first, a reference names its target by heading,
  never by position, and every list is introduced by a complete sentence.
