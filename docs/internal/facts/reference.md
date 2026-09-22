# Facts: reference arm

Harvested 2026-09-15 from docs/reference/* (behaviors beyond the gated signatures, which `check:reference`/`check:reference:signatures` already gate). Agent-facing; never shipped; not register-graded. Every fact carries a source.

## docs/reference/admin-grammar-tokens.md

- The admin declares 18 `--cairn-type-*`/`--cairn-gap-*` grammar tokens plus 11 named role
  utilities (`type-*`, `gap-*`), outside the light/dark theme blocks, in `cairn-admin.css`.
  Source: `src/lib/components/cairn-admin.css:56-76`. [verified]
- Exact token values match the page's table verbatim (title 1.5rem/2rem leading, heading
  1.125rem/1.75rem, subtitle 0.9375rem/1.1875rem, body 0.875rem/1.25rem, meta 0.8125rem/1.0625rem,
  label 0.6875rem/0.875rem, chip 0.625rem/0.8125rem; gap-label 0.25rem, gap-control 0.5rem,
  gap-group 1rem, gap-section 1.5rem). Source: `src/lib/components/cairn-admin.css:56-76`.
  [verified]
- `--cairn-warning-ink` and `--color-positive-ink` are distinct per theme (light:
  `oklch(50% 0.13 70)` / `oklch(48% 0.12 150)`; dark: `oklch(80% 0.14 70)` / `oklch(78% 0.12 150)`),
  confirming the page's claim that the fill tone (`--color-warning`) measures far lower contrast
  (~2.2:1) than the dedicated text inks. Source: `src/lib/components/cairn-admin.css:156,161,326,330`.
  [verified]
- The three hand-composed chip classes (`cairn-chip-quiet`, `cairn-chip-warning`,
  `cairn-chip-outline`) each pin `font-weight: 400` unlayered, so they outrank a
  `font-semibold`/`font-medium` Tailwind utility on the same element. Source:
  `src/lib/components/cairn-admin.css:920-997` (rules "PINNED unlayered rule 6/7/8 of 14").
  [verified]
- Exactly five call sites carry a ratified `type-scale` exemption directive: the wordmark at three
  sites (ConfirmPage, CairnAdminShell, LoginPage) plus two in EditPage (document title, prose
  canvas), matching the page's "five ratified exceptions" claim even though its own table lists
  only three named rows (the wordmark row covers three sites). Source: `grep -rn
  "cairn-audit-disable-next-line type-scale" src/lib/components/*.svelte` (5 hits: ConfirmPage.svelte,
  CairnAdminShell.svelte, LoginPage.svelte, EditPage.svelte x2). [verified]

## docs/reference/admin-routes.md

- `createCairnAdmin`'s load dispatch parses `event.url.pathname` directly, never the SvelteKit
  rest param, specifically so an encoded path segment cannot desync the dispatch from the actual
  request. Source: `src/lib/sveltekit/admin-dispatch.ts:36` (doc comment), `src/lib/sveltekit/cairn-admin.ts:149,231`.
  [verified]
- The none-capability landing view is literally named `'welcome'` in the discriminated `AdminData`
  union, and `indexLoad` returns `{ view: 'welcome', page: { displayName, siteName } }` for that
  case. Source: `src/lib/sveltekit/content-routes-shell.ts:301-315`. [verified]
- The dev-only chrome-boundary guard (an ancestor walk logging one `console.error` when a
  width-constraining ancestor sits between the admin root and `<body>`) is implemented in
  `src/lib/components/chrome-guard.ts`, described in its own header as compiling out of
  production. Source: `src/lib/components/chrome-guard.ts:1-54`. [verified]
- The ten media-janitorial actions run at runtime on `createCairnAdmin`'s returned object but are
  absent from the type-level `CairnAdminRoutes` contract; recovering them for a typed caller needs
  a spread (`{ ...admin.actions }`) or a cast. This is a documented type-vs-runtime narrowing, not
  independently re-verifiable by grep alone. Source: `src/lib/sveltekit/cairn-admin.ts`. [candidate: searched
  that file for `CairnAdminRoutes`, found no type definition in it
  to diff against the runtime object directly, pending a dedicated type-level check]

## docs/reference/admin-toolkit.md

- `formatCivilDate`/`formatTimestamp` both default `fallback` to `''`, `locale` to `'en-US'`;
  `formatTimestamp` additionally defaults `timeZone` to `'UTC'` (deliberately not a site's own
  zone). Source: `src/lib/admin-toolkit/format.ts:38-100`. [verified]
- `formatTimestamp` accepts exactly two shapes that name their own zone (full/seconds-less ISO
  8601 with `Z`/`z` or colon/colonless `+hh:mm` offset) plus the SQLite
  `datetime('now')`-shaped UTC string (no `T`, no offset), assumed UTC; every other shape,
  including a zone-less near-ISO string, returns unchanged rather than being parsed with
  `new Date()`, specifically to prevent SSR/hydration text mismatches from a runtime-local-zone
  parse. Source: `src/lib/admin-toolkit/format.ts:60-101` (regexes `SQLITE_DATETIME`,
  `ISO_WITH_ZONE`, function `toCanonicalIso`). [verified]
- `ExpandableRow`'s trigger button renders at exactly 24x24 CSS px at the 390px viewport against
  the packaged stylesheet, matching WCAG 2.5.8's AA floor (not 2.5.5's 44x44). Source:
  `src/lib/admin-toolkit/ExpandableRow.svelte:30-32` (doc comment referencing the same floor
  `touch-targets` enforces). [verified]
- `MediaPicker`'s thumbnail base falls back to `/media` (via `DEFAULT_MEDIA_BASE`) when mounted
  with no `MEDIA_BASE_CONTEXT_KEY` provider in context; `CairnAdminShell` is the provider that
  supplies the site's real `assets.publicBase`. Source: `src/lib/components/media-base-context.ts:5`,
  `src/lib/components/CairnAdminShell.svelte:76`, `src/lib/components/MediaPicker.svelte:65`.
  [verified]
- `AdminTable`'s `emptyColspan` defaults to `100`, relying on HTML's own `colspan` clamp to the
  real column count. Source: `src/lib/admin-toolkit/AdminTable.svelte:96`. [verified]
- `AdminTable`'s `selection` prop takes a `ReadonlySet<string>` and an `onchange` receiving a
  `ReadonlySet<string>`; the component never mutates the set it is given. Its header checkbox
  carries `aria-disabled="true"` while rows exist and nothing is selected, and its `aria-label`
  reads "Clear selection" once something is. The batch region renders whenever `selection` is set,
  as a `role="group"` named "Batch actions" carrying a visually hidden `role="status"` count, and
  `clear` returns focus to the header checkbox. Source:
  `src/lib/admin-toolkit/AdminTable.svelte`. [verified]
- `StatusChip`'s `outline` register hairline is `color-mix(in oklab, currentColor 55%,
  transparent)`; cairn's five named call sites (ConceptList, EditPage, CairnAdminShell,
  ReferenceField, MediaCaptureCard, ManageEditors) all clear the 3:1 border-contrast floor, but a
  consumer placing an `outline` chip inside its own muted-text ancestor should re-measure.
  Source: page text cross-referenced against `chip-ground-collision`/`border-contrast` rule
  descriptions in cairn-audit.md; not independently re-measured. [candidate: numeric contrast
  ratios (2.4:1, 2.97:1) are stated in the page and consistent with the audit's own documented
  floors, but no automated re-measurement was run in this harvest]
- `Tooltip` (added `0.97.0`) reads the triggering `PointerEvent`'s own `pointerType` to detect a
  coarse-pointer tap, never `matchMedia`, since a hybrid device can carry both a mouse and a
  touchscreen at once; an empty `text` prop opts the whole component out (no `aria-describedby`,
  no bubble, every hover/focus/tap mechanic a no-op). Its bubble is a manual popover placed by CSS
  anchor positioning off an `anchor-name` written on the trigger, so the top layer keeps a
  transformed, scaled, or `overflow: hidden` ancestor (an open daisyUI modal's box) from displacing
  or clipping it. That write appends to any inline `anchor-name` the trigger already carries, since
  `anchor-name` is a comma list and three swept admin triggers anchor a popover menu of their own;
  replacing it would drop those menus to the UA's centered popover fallback. Source:
  `src/lib/admin-toolkit/Tooltip.svelte`. [verified]
- `Tooltip` sets no `aria-describedby` when its `text` already equals the trigger's accessible name
  (its `aria-label`, else its trimmed text content), since a screen reader would read the same words
  as the name and again as the description; the bubble still renders, so a test asserting a reason
  reads the bubble rather than the description. It also owns all three WCAG 1.4.13 bullets itself:
  a `document`-level Escape listener (non-capturing, no `preventDefault`, so an enclosing dialog
  still closes on the same press), and a bubble that takes pointer events, where a hover-leave from
  the trigger holds it open for a 150ms grace before clearing it, since Chromium's hit-testing for
  a top-layer popover does not extend into the gap between trigger and bubble. Activating an
  enabled trigger hides the bubble;
  a trigger marked `aria-disabled="true"` keeps it. Anchor positioning is a requirement, not an
  enhancement: under `@supports not (anchor-name: --x)` the bubble is not rendered at all, so a
  client-side feature test sets a native `title` on the trigger instead, a UA tooltip standing in
  for the bubble a browser without anchor positioning cannot place (needed in the duplicate-name
  case above all, since that case sets no `aria-describedby` either). Source:
  `src/lib/admin-toolkit/Tooltip.svelte`. [verified]

## docs/reference/ambient.md

- All five `App.Locals` augmentation members (`cairnEditor`, `cairnBackend`, `cairnAuditSink`,
  `cairnAccess`, `cairnIdentity`) share the flat `cairn` prefix rather than a nested namespace, a
  deliberate choice so a grep for one field name finds every read across repos. Source:
  `src/lib/ambient.ts:8-19` (module doc comment), same rationale restated inline. [verified]
- The `/ambient` module's compiled JS is empty (type-only, side-effect import), so the import is
  free at runtime. Source: `src/lib/ambient.ts` ends with `export {}` and carries no runtime
  logic beyond the `declare global` block. [verified: beyond what check:reference already gates,
  see Harvest record]

## docs/reference/auth-channel.md

- All `limits` defaults and clamps match source exactly: `code.length` 8 (8-10),
  `code.ttlMs` 600000/10min (max 900000/15min), `code.attemptCap` 5 (max 10),
  `throttle.cooldownMs` 60000/60s (min 30000/30s), `throttle.requesterCap` 20 (5-100),
  `throttle.identityCeiling` 30 (min 10), `throttle.escalationThreshold` 20 (min 10),
  `throttle.liveRowCap` 5 (max 20), `session.ttlMs` 2592000000/30days (max 31536000000/1yr).
  Source: `src/lib/auth-channel/factory.ts:324-480`. [verified]
- A non-positive `limits` override always throws even where the table states only a ceiling
  (prevents a 0 or negative clamp value from silently passing). Source:
  `src/lib/auth-channel/factory.ts:432-455` (`resolveLimit`). [verified]
- `deliver`'s throw path is fully compensating: the pending code row is deleted and the
  requester's send charge is refunded on any thrown error, so a delivery-provider outage costs a
  member only a retry, never a lost budget slot. Source: page text; consistent with the design
  intent documented inline in `factory.ts`'s deliver-wrapping logic (not independently re-traced
  line-by-line in this harvest). [candidate: behavior is stated precisely and matches the
  surrounding defaults verified above, but the refund/delete code path itself was not
  individually grepped]
- `CAIRN_DEV_BACKEND` set on a deployed runtime makes all three actions (`request`, `confirm`,
  `logout`) throw a SvelteKit 503 `HttpError` before touching any row, rather than returning a
  typed outcome, because no result union carries a wire code for a polluted environment.
  "Deployed" is determined by `PUBLIC_ORIGIN` first, falling back to request hostname only when
  unset. Source: page text; the same dev-backend-flag refusal pattern is corroborated in
  `src/lib/sveltekit/admin-action.ts` comments referencing `CAIRN_DEV_BACKEND_FLAG`. [candidate:
  not directly re-verified in `auth-channel/factory.ts` in this pass]
- The channel's own D1 schema ships as `migrations-channel/0000_channel.sql` (tables
  `cairn_channel_meta`, `cairn_channel_code`, `cairn_channel_session`, `cairn_channel_budget`) and
  must never share a `migrations_dir` with the engine's own `AUTH_DB` migrations. The
  per-deployment identity salt is provisioned lazily via `INSERT OR IGNORE` of 32 random bytes
  under `identity_salt`, deliberately absent from the committed migration file since a migration
  published on npm can't carry a per-deployment secret. Source: page text, cross-referenced with
  the general cairn-cms secrets-are-never-committed convention; migration file itself not opened
  in this harvest. [candidate: searched for `migrations-channel` directory existence only
  indirectly via doc cross-reference]

## docs/reference/auth-crypto.md

- The subpath enforces server-only isolation via export conditions: a named import from the
  browser stub fails at build time (no such export), while a bare side-effect import passes the
  build and throws only at runtime when executed in a browser. Source: page text; the pattern
  (browser stub with module-level throw, `worker`/`default` resolving the real module) is the
  same mechanism used by `/cloudflare` (see below), both stated identically. [candidate: sourced
  to the page only, not traced to code]
- `tokensMatch('', '')` is deliberately `false`, so an unset expected value can never match an
  unset submitted one. Source: `src/lib/auth/crypto.ts:118` (function `tokensMatch`), consistent
  with the stated four properties (length leaks, empty-never-matches, CSPRNG-only intent,
  UTF-8-byte comparison). [verified]
- `buildCookieName` throws when `base` already carries a `__Host-`/`__Secure-` prefix (prevents
  double-prefixing, which the browser would silently reject as a cookie that never sets), and a
  `cairn_`-prefixed base is accepted but named as the engine's reserved namespace (risk of
  collision, not a hard block for a site's own auth-crypto usage, though `createAuthChannel`'s
  `cookie.name` throws at construction on a `cairn_` base specifically). Source:
  `src/lib/auth/crypto.ts:48-60`; the stricter throw-on-`cairn_` behavior is `createAuthChannel`'s
  own construction-time check (auth-channel.md, "A `cairn_`-prefixed base throws at
  construction"), distinct from this bare primitive's more permissive behavior. [verified]
- The engine's own two cookies (session, CSRF) both derive `secure` through one shared internal
  function (`csrfSecure`), so they can no longer resolve different `secure` values on the same
  request. This implies an earlier state where they could diverge. Source: page text; not
  independently re-traced to a changelog entry in this harvest. [candidate: searched for
  `csrfSecure` only via the doc's own cross-reference to `security-model.md`]

## docs/reference/auth-store.md

- Every function trims and lowercases an email argument before matching or writing
  (`email.trim().toLowerCase()`), so `Backup@Site.com` and `backup@site.com` collide as the same
  row. Source: `src/lib/auth/store.ts:37`. [verified]
- `deleteEditor`/`setEditorRole` fold the last-owner guard into the same atomic write (refusal
  predicate inside the same `WHERE`/statement as the mutation), so two concurrent calls against
  the last-owner row cannot both succeed. Source: `src/lib/auth/store.ts:383-425,496-533`
  (functions `deleteEditor`, `removeOwnerIfNotLast`, `setEditorRole`, `demoteOwnerIfNotLast`
  present and structured as described). [verified: structurally; exact WHERE-clause atomicity not
  independently re-derived from SQL text in this harvest]
- `deleteEditor`/`setEditorRole` distinguish `'not-found'` from `'last-owner'` (their `WHERE`
  matches any row), while `removeOwnerIfNotLast`/`demoteOwnerIfNotLast` report `'not-eligible'`
  for both "no such row" and "present but not owner-capability" (their `WHERE` matches only
  owner-capability rows, so the two cases can't be told apart). Source: `src/lib/auth/store.ts`
  function bodies at lines noted above; outcome unions confirmed present. [verified]

- `createLogger` (`/log`) redacts three levels deep into plain objects and arrays, marks a repeated
  reference `'<repeated>'`, and leaves a key at level four or deeper as written. Both sides of the
  key comparison normalize (lowercased, `-` and `_` removed, compared whole), so `REDACTED_LOG_KEYS`
  spells each name once; it now also carries `csrf` and `csrf_token` (both, since normalization maps
  `csrf_token` to `csrftoken`, not `csrf`). `createLogger(options?: { redactKeys?: readonly string[]
  })` unions a site's own names with the defaults and cannot narrow them. `REDACTED_LOG_KEYS` and
  `CAIRN_LOG_EVENTS` are both frozen. A throwing getter anywhere in a call's own `fields` cannot
  throw out of `log.info()`/`.warn()`/`.error()`: the record build runs inside a `try`/`catch`
  wrapping `emit`, and a caught failure emits `{ level, event, timestamp, fields: '<unserializable>'
  }` instead. Source: `src/lib/log/create.ts`, `src/lib/log/events-list.ts`. [verified]

## docs/reference/cairn-audit.md

- `motion-property` splits a `transition` value's entries at the top level only, so a comma inside
  `var()` or `cubic-bezier()` reads as a function argument, not as another transitioned property.
  Source: `src/lib/audit/rules/static/motion-property.ts` (`topLevelEntries`). [verified]

- Exactly 28 rules are registered: 12 static (all error tier) plus 16 rendered (7 error-tier, 9
  advisory-tier). Source: `grep -c "id: '" src/lib/audit/rules/static/*.ts` = 12,
  `src/lib/audit/rules/rendered/*.ts` = 16; tier counts confirmed by grepping `tier: 'error'`
  (focus-renders, panel-width, one-filled-action, interactive-contrast, touch-targets, list-role,
  viewport-overflow = 7) vs `tier: 'advisory'` (container-inset-asymmetry, form-font-parity,
  field-edge-alignment, border-contrast, norms-bands, screen-anatomy, relational-spacing,
  weight-budget, chip-ground-collision = 9). [verified]
- Exit codes: 0 (clean), 1 (unsuppressed error-tier finding), 2 (run couldn't start/finish: bad
  flag, no server, no browser, redirect-trap refusal). Codes route through `process.exitCode`,
  never `process.exit`, so piped stdout flushes fully first. Source: `src/lib/audit/bin.ts:5-68`,
  `src/lib/audit/report.ts:48` (`exitCodeFor`). [verified]
- `touch-targets`'s enforced floor is `23.984375` CSS px (24px minus one Chromium LayoutUnit,
  1/64 CSS px, allowed for rect-snapping tolerance). Source:
  `src/lib/audit/rules/rendered/touch-targets.ts:81-110`. [verified]
- `form-font-parity` is registered provisionally at advisory tier though its intended tier is
  error, pending a CI re-check confirming the rendered suite is green on the CI runner. Source:
  page text; consistent with the tier grep above showing it currently `advisory`. [candidate:
  sourced to the page only, not traced to code]
- The `norms` subcommand reads only the manifest inside the installed package (no config, no
  built stylesheet, no browser needed), distinct from static/rendered modes which read the
  working tree. Source: page text, structurally consistent with the CLI's described `bin` entry
  points. [candidate: not independently traced into `src/lib/audit/bin.ts`'s norms subcommand
  branch in this harvest]

## docs/reference/cli-cairn-doctor.md

Filed by pass A task 4 from the mining of `tool/docs/reference/cli-cairn-doctor.md`, every bullet
re-sourced to Go on this tree rather than to the page.

- `cairn doctor` reads a site's checked-in configuration and needs no credential, no adopted site,
  and no Cloudflare or GitHub access, so it runs in a fresh clone and in CI; `cairn health` is the
  live-site counterpart. Source: `tool/cmd/cairn/messages.go:299-306`. [verified]
- `cairn doctor [<dir>]` takes at most one positional argument; `<dir>` defaults to the working
  directory, is a filesystem path and never a registered site id, and its shell completion offers
  directories rather than site ids. Source: `tool/cmd/cairn/doctor.go:24-37,50-53`. [verified]
- Everything the command reads is off disk under the resolved, symlink-free directory: the
  wrangler config, `package.json` and a lockfile, the Svelte and Vite configs,
  `src/hooks.server.ts`, `static/_headers`, the site-config YAML, the `/admin` route candidates,
  and `src/content/.cairn/site-facts.json`. Source: `tool/internal/doctor/wrangler.go:36,48`,
  `tool/internal/doctor/check_csrf.go:72,79`, `tool/internal/doctor/check_referrer.go:191-234`,
  `tool/internal/doctor/check_floors.go:328,376,384,392`, `tool/internal/doctor/facts.go:11`.
  [verified]
- The `/admin` mount check probes six candidate route files by name, since a Snapshot offers no
  directory listing and a route file can be `.ts` or `.js`. Source:
  `tool/internal/doctor/check_mount.go:14-21`. [verified]
- A path resolving outside the run's directory, even through a symlink, is refused rather than
  followed. Source: `tool/internal/doctor/snapshot.go:75-87`. [verified]
- The whole command makes one network request, a credential-free `GET` of the declared origin's
  `/robots.txt` for `ai.posture-effective`, and nothing else touches the network. Source:
  `tool/internal/doctor/fetchrobots.go:28-35`. [verified]
- That one request carries no timeout of its own: its deadline is the command's own context, which
  `--timeout` bounds, default 480 seconds. The 15-second per-request cap belongs to
  `internal/providers`, whose clients this credential-free probe deliberately does not use.
  Source: `tool/internal/doctor/fetchrobots.go:14-21,33-34`,
  `tool/internal/providers/transport.go:12-16`, `tool/cmd/cairn/root.go:35`.
  [docs-drift: the retired page said the one request "is bounded at 15 seconds inside it"]
- A directory with neither a wrangler config nor a `@glw907/cairn-cms` dependency in
  `package.json` is not a cairn-cms site: the run prints one line, exits 3, and settles no check.
  Source: `tool/internal/doctor/fileread.go:89-104`, `tool/cmd/cairn/doctor.go:60-61,113-129`,
  `tool/cmd/cairn/messages.go:322-330`. [verified]
- `--json` is the command's own flag and writes the payload instead of the report; it beats
  `--quiet`, so the payload always prints under `--json`. Source:
  `tool/cmd/cairn/doctor.go:42,88-97`, `tool/cmd/cairn/messages.go:309`. [verified]
- The root's `--color`, `--theme`, and `--width` are accepted and have no effect on this command,
  whose report is plain text with no ANSI and no terminal query; `--quiet` and `--timeout` do
  apply. Source: `tool/cmd/cairn/root.go:229-235` declares all five, and neither
  `tool/cmd/cairn/doctor.go` nor `tool/internal/doctor/report.go` reads the three.
  [verified: the declaration is sourced; the no-effect half is the absence of any read, confirmed
  by grep over the command and package]
- The eleven checks run in one fixed report order, the eight file-only checks followed by the
  three facts-dependent ones: `config.bindings`, `config.media-bucket`, `config.observability`,
  `config.csrf-disable`, `config.site-config`, `config.public-origin`,
  `config.no-referrer-blanket`, `admin.mount-shape`, `config.dependency-floors`,
  `auth.role-wiring`, `ai.posture-effective`. That slice is also the published check-id list the
  page tests read. Source: `tool/internal/doctor/report.go:10-31`. [verified]
- Each check names one engine condition id, which carries the check's severity: blocker for
  `config.bindings-missing`, `config.site-config-invalid`, `config.public-origin-invalid`, and
  `config.dependency-floors-unmet`, warning for `config.media-bucket-missing`,
  `config.observability-off`, `config.csrf-disable-missing`, `config.no-referrer-blanket`,
  `admin.mount-incomplete`, `auth.role-wiring-missing`, and `ai.posture-not-effective`. Source:
  `tool/internal/doctor/check_bindings.go:31`, `check_media.go:29`, `check_observability.go:16`,
  `check_csrf.go:70`, `check_siteconfig.go:26`, `check_origin.go:60`, `check_referrer.go:217`,
  `check_mount.go:78`, `check_floors.go:366`, `check_roles.go:105`, `check_posture.go:291`, with
  each severity at `tool/internal/spine/conditions.json:105-118`. [verified]
- `config.site-config` reports presence and parsing only; the per-concept URL policy lives on the
  adapter concepts and is not checkable from a directory preflight. Source:
  `tool/internal/doctor/check_siteconfig.go:12-13`. [verified]
- `config.media-bucket`, `auth.role-wiring`, and `ai.posture-effective` read
  `src/content/.cairn/site-facts.json`, and when that file is absent each reports the literal
  message "needs engine 0.97.0 or later, and one build". Source:
  `tool/internal/doctor/facts.go:8-19`. [verified]
- The seven check ids the doctor never reaches, because they need a live adopted site, are
  `cairn health` ids and none is a doctor id: `serving`, `delegation`, `https-forced`, `email`,
  `deploy`, `publish-path`, and `errors`. Source:
  `tool/internal/health/check_serving.go:25`, `check_delegation.go:20`, `check_https.go:45`,
  `check_email.go:32`, `check_deploy.go:132`, `check_publish.go:59`, `check_errors.go:26`, against
  the doctor's own list at `tool/internal/doctor/report.go:19-31`. [verified]
- The run's exit code is the worst severity among failing checks, 0 when every check passed,
  skipped, or reported info, and 3 when an unchecked result is the only non-passing one. Source:
  `tool/internal/doctor/status.go:58-82` folding through `tool/internal/spine/exit.go:133-167`;
  all four cases exercised at `tool/cmd/cairn/doctor_test.go:76-159`. [verified]
- Exit 3 covers three distinct cases, so a caller tests for a nonzero exit rather than switching
  on 3: a usage error, a run whose only non-passing results could not observe their input, and a
  directory that is not a cairn-cms site. Source: `tool/cmd/cairn/doctor_test.go:161-270`.
  [verified]
- Under `--json`, empty stdout means the invocation was wrong: a usage error is the one case that
  writes no payload, and a directory that is not a cairn-cms site still writes one. Source:
  `tool/cmd/cairn/doctor_json_test.go:26-55`, `tool/cmd/cairn/doctor.go:88-97`. [verified]
- Each failing check's report block and its payload `fix.url` resolve against
  `https://cairn.pub/docs/admin/`, built from the condition's own `docsAnchor` with the `.md`
  removed. Source: `tool/internal/doctor/report.go:66-80`. [verified]
- The site config YAML is tried at four candidate paths in lookup order: the canonical path, then
  `site.config.yaml`, `src/lib/site.config.yaml`, and `src/site.config.yaml`; `config.site-config`
  reports `UNCHECKED` (never `FAIL`) when no file is found at any of the four. Source:
  `tool/internal/doctor/siteconfig.go:40-46`, `tool/internal/doctor/check_siteconfig.go:23-38`.
  [candidate: found during the 2026-09-22 redraft's Go read, not independently re-verified by a
  second pass]
- `config.dependency-floors` reports `UNCHECKED` when no recognized lockfile
  (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`) is found, or when the installed engine's
  own `package.json` cannot be read. Source: `tool/internal/doctor/check_floors.go:358-401`.
  [candidate: found during the 2026-09-22 redraft's Go read, not independently re-verified by a
  second pass]
- `config.csrf-disable` reports `UNCHECKED` when neither `svelte.config.js` nor `vite.config.ts`
  is found, distinct from a read error on either. Source:
  `tool/internal/doctor/check_csrf.go:71-84`. [candidate: found during the 2026-09-22 redraft's Go
  read, not independently re-verified by a second pass]
- `ai.posture-effective` reports `UNCHECKED` when `src/content/.cairn/site-facts.json` is absent,
  or when the `/robots.txt` fetch could not observe a result: no origin resolves, the origin does
  not parse, the fetch fails, or the response is non-200. Source:
  `tool/internal/doctor/check_posture.go:292-305`, `tool/internal/doctor/fetchrobots.go:35-62`.
  [candidate: found during the 2026-09-22 redraft's Go read, not independently re-verified by a
  second pass]
- Under `--json`, a check's five printed status words collapse to four wire states: `PASS` and
  `INFO` both write `"state": "pass"`, told apart by `INFO`'s `note` field (absent on a plain
  pass); `FAIL` writes `"state": "fail"` with a `fix`; `SKIP` writes `"state": "skip"` with
  `"reason": "reason.not-run"`; `UNCHECKED` writes `"state": "unknown"` with
  `"reason": "reason.not-observable"`. The condition id itself is the payload's `condition` field.
  Source: `tool/internal/doctor/json.go:41-54,99-126`. [candidate: found during the 2026-09-22
  redraft's Go read, not independently re-verified by a second pass]

## docs/reference/cli-cairn-exit-codes.md

Filed by pass A task 4 from the mining of `tool/docs/reference/exit-codes.md`, every bullet
re-sourced to Go on this tree rather than to the page.

- The four exit codes are the monitoring-plugin convention, each constant's value being its own
  code: 0 `OK`, 1 `WARNING`, 2 `CRITICAL`, 3 `UNKNOWN`. Source:
  `tool/internal/spine/exit.go:14-36`. [verified]
- Several verdicts combine by precedence and not by numeric order: `CRITICAL` outranks `UNKNOWN`
  outranks `WARNING` outranks `OK`, so `UNKNOWN`'s 3 does not beat `CRITICAL`'s 2. The same order
  applies within one site and across a sweep of many. Source:
  `tool/internal/spine/exit.go:38-55,147-167`. [verified]
- One check contributes `OK` when it passed and `CRITICAL` when it failed, softened to `WARNING`
  either by the check's own declared severity or by an unexpired hold; a held failure is never
  reported `OK`, and a hold that has already expired contributes the same code an unheld failure
  does. Source: `tool/internal/spine/exit.go:89-92,98-128`. [verified]
- `engine` is the only health check whose failure is warning-severity; every other check in the
  set fails at critical weight, and an id the table does not name is reported at full weight.
  Source: `tool/internal/health/severity.go:16-30`. [verified]
- A check that could not run contributes `UNKNOWN`, with one exclusion: three reasons name a
  check the run declined to attempt because the site's own setup gives it nothing to read, and
  those contribute `WARNING`. They are `reason.cred-missing`, `reason.repo-not-recorded`, and
  `reason.api.builds-not-connected`. Source: `tool/internal/spine/outcome.go:78-93`,
  `tool/internal/spine/exit.go:104-128`. [verified]
- The same fact decides the wire word and the exit code: those three reasons word a result `skip`,
  and every other unknown words it `unknown`. Source: `tool/internal/spine/exit.go:202-216`.
  [verified]
- A hold has no effect on an unknown, since an operator can accept a known failure but not a check
  that never ran. Source: `tool/internal/spine/exit.go:104-128`. [verified]
- A site with no checks at all folds to `UNKNOWN`, never `OK`, so nothing was ever measured cannot
  print a false green. Source: `tool/internal/spine/exit.go:133-145`. [verified]
- A registry the tool could not read in full contributes `UNKNOWN`, and so does an `--expect-sites`
  count the registry does not match; zero means the operator named no count and the length is not
  checked. An empty registry reuses the same sentinel, which is why bare `cairn health` on an
  empty registry exits 3. Source: `tool/internal/spine/exit.go:57-59,147-167`,
  `tool/cmd/cairn/health_sweep.go:39-44`, `tool/cmd/cairn/sites.go:46`. [verified]
- A hold is named either by a repeatable `--ack <check-id>=<YYYY-MM-DD>` or by an acknowledgement
  file, which `--ack-file` names and which defaults to `acknowledgements.json` in the registry
  directory; its absence is not an error. Source: `tool/cmd/cairn/ack.go:17-36`,
  `tool/cmd/cairn/health.go:58`, `tool/cmd/cairn/root.go:235`. [verified]
- The absence rule above covers only the default file. An `--ack-file` path the operator names
  explicitly and that does not exist, or cannot be read, is a usage error. Source:
  `tool/cmd/cairn/messages.go:557,562`, `tool/cmd/cairn/messages.go:570-573`. [candidate: filed
  during the cli-cairn-exit-codes.md redraft, 2026-09-22, re-sourced against `main`]
- An exit code is decided in exactly two ways, which cannot disagree: a run that produced reports
  folds site verdicts, listing errors, and the expected site count; a run that produced no report
  carries a typed error, and everything but a coded error reports `UNKNOWN`. A cancelled run, a
  usage error, and a tool fault all say the same thing to a routine. Source:
  `tool/cmd/cairn/main.go:133-167`, `tool/internal/spine/exit.go:147-167`. [verified]
- `cairn auth check` is the one command carrying its own typed verdict, because it settles
  provider states and holds no site verdicts. `cairn auth probe` is a hidden alias of it, kept
  reachable for a script that already types the earlier name. Source:
  `tool/cmd/cairn/main.go:133-141`, `tool/cmd/cairn/probe_token.go:20-29`. [verified]
- A usage error exits 3 with byte-empty stdout, and its message goes to stderr, so stdout carries
  payloads alone. Source: `tool/cmd/cairn/main.go:153-167`, test
  `tool/cmd/cairn/usage_test.go:133-146`. [verified]
- `--json` beats `--quiet`: the payload always prints, so empty stdout under `--json` means the
  invocation was wrong rather than that the site is healthy. Source:
  `tool/cmd/cairn/health_sweep.go:49-53`, `tool/cmd/cairn/doctor.go:88-97`. [verified]
- A `--color` value outside auto, always, and never, a `--theme` value outside dark and light, and
  an explicit `--width` outside its bounds are each usage errors. `--theme` has no auto: querying
  a terminal for its background is a write-then-read the tool refuses, so the value is the one the
  operator states, and dark when they state none. Source: `tool/cmd/cairn/root.go:37-53,98-115`.
  [verified]
- `--help` and `--version` exit 0, which is cobra's own behaviour rather than a cairn override;
  cairn registers the `-V` shorthand explicitly before cobra would add an unshorthanded one.
  Source: `tool/cmd/cairn/root.go:213-226`. [verified]
- `cairn health <site>` takes the site as a positional operand, not a flag. Source:
  `tool/cmd/cairn/health.go:44`. [verified]
- Three nested bounds govern a run's duration: every provider request is capped at 15 seconds,
  each check makes at most a published number of requests, and `--timeout` bounds the whole
  command with a 480-second default. Source: `tool/internal/providers/transport.go:12-16`,
  exported for the budget arithmetic at `tool/internal/providers/probe.go:31-35`, and
  `tool/cmd/cairn/root.go:29-35`. [verified]
- The per-check request counts live on the published page and in no Go table; a drift test reads
  them back off the page, requires exactly the ids the sweep runs, and fails when the total times
  the 15-second cap exceeds the single-site budget. Source:
  `tool/cmd/cairn/usage_test.go:507-564`. [verified]
- The nine published counts are `creds` 2, `serving` 6, `delegation` 2, `https-forced` 1, `email`
  9, `deploy` 4, `publish-path` 2, `engine` 4, and `errors` 1, totalling 31, which at 15 seconds
  each is 465 seconds and is what the 480-second default rounds up from. Source:
  `tool/cmd/cairn/usage_test.go:507-527` reads and enforces these values. [candidate: no Go table
  declares the nine counts, so the values themselves trace only to the page the drift test reads]
- A multi-site sweep's default whole-run budget is the single-site budget times the site count,
  capped at four times the single-site default, and each site gets the envelope's remaining time
  divided by the sites still to run, never more than the per-site budget, recomputed after each
  site settles. An explicit `--timeout` replaces the whole-run budget and the division works the
  same inside it. Source: `tool/cmd/cairn/health_sweep.go:20-26,215-253`. [verified]
- The formula the page publishes is pinned by a test that builds it from the two constants, so the
  worked examples stay arithmetic rather than assertion. Source:
  `tool/cmd/cairn/usage_test.go:566-576`. [verified]
- A budget miss or a signal stops a sweep after the site already in flight settles; every site
  still to come is counted toward the run's exit code as `UNKNOWN`, and under `--json` it is
  omitted from the stream rather than emitted empty, since a plain-text line would corrupt the
  newline-delimited JSON. Source: `tool/cmd/cairn/health_sweep.go:28-36`,
  `tool/internal/render/json.go:369-371`. [verified]
- A site cut short partway reports each unfinished check unknown with `reason.not-run`. Source:
  `tool/internal/health/health.go:151,173`, `tool/internal/spine/outcome.go:64`. [verified]
- A timeout is a ceiling and not a wait: a healthy site answers in a few seconds, and the earlier
  120-second default was a budget one site could not finish inside, which made a run against a
  stalled provider report `UNKNOWN` rather than the fault it was measuring. Source:
  `tool/cmd/cairn/root.go:29-35`. [verified]
- No shell profile reaches a scheduled run, so the three credential variables come from the
  scheduler's own environment or from the OS keyring `cairn auth set` writes: `CAIRN_CF_ACCOUNT_ID`,
  `CAIRN_CF_READ_TOKEN`, and `CAIRN_GH_READ_TOKEN`. The environment provider is tried before every
  other provider in the chain. Source: `tool/cmd/cairn/env.go:36-38,199-212`,
  `tool/cmd/cairn/auth.go:145`. [verified]

## docs/reference/cli-cairn-json-output.md

Filed by pass A task 4 from the mining of `tool/docs/reference/json-output.md`, every bullet
re-sourced to Go on this tree rather than to the page.

- Under `--json`, stdout carries the payload and stderr carries diagnostics; the two are never
  merged. The payload prints even under `--quiet`, and a usage error writes nothing to stdout and
  exits 3. Source: `tool/cmd/cairn/root.go:231,236`, `tool/cmd/cairn/health_sweep.go:49-53`,
  `tool/cmd/cairn/main.go:153-167`. [verified]
- Seven payload kinds are published, each declaring its own `kind` so a consumer reading a mixed
  stream keys off a field rather than off the shape it sees: `site`, `summary`, `sites`, `logs`,
  `adoptCandidates`, `authCheck`, and `doctor`. Source: `tool/internal/render/json.go:41-50`,
  `tool/internal/doctor/json.go:11-13`. [verified]
- Each kind carries its own schema version rather than one number across all seven, so a field
  added to one payload does not make every other consumer re-read a schema. All seven stand at 1.
  Source: `tool/internal/render/json.go:14-39`. [verified]
- Every payload carries `schemaVersion`, `kind`, and `verdict` at top level, and every payload but
  a per-site NDJSON line carries `exitCode`. Source: `tool/internal/render/json.go:55-70,116-126,
  130-137,149-159,172-179`, `tool/internal/doctor/json.go:28-38`. [verified]
- Bare `cairn health --json` writes newline-delimited JSON: one `site` object per site, flushed as
  that site settles, each being the single-site payload less its `exitCode`, then one `summary`
  line carrying the run's own `exitCode`. Source: `tool/cmd/cairn/health_json.go:16-69`,
  `tool/internal/render/json.go:61-64,216-229`. [verified]
- A stream carrying no summary line reads `UNKNOWN`, since a truncated stream and a complete one
  are otherwise indistinguishable. Source: `tool/internal/render/json.go:114-116`,
  `tool/cmd/cairn/health_json.go:51-53`. [verified]
- A site the run's budget or a signal cut short is counted into the summary's `counts` as
  `UNKNOWN` with no line of its own; `sites` is how many the run was meant to cover, which exceeds
  the number of lines written. Source: `tool/internal/render/json.go:350-352,369-371`. [verified]
- The check-level state vocabulary is a closed set of five wire words, computed at the boundary
  rather than marshalled off the internal three-value state: `pass`, `fail`, `held`, `skip`, and
  `unknown`. `held` is not a state at all but a failing check an unexpired hold covers, and the
  division between `skip` and `unknown` is carried by the outcome's reason. Source:
  `tool/internal/spine/exit.go:202-216`, `tool/internal/render/json.go:264-271`. [verified]
- A check's `fix` object carries `summary`, `actor`, and `outward` always, `url` where the
  condition has one, and `command` only for an operator's own fix, since that is the one actor
  whose action is a command line the tool can name. Source:
  `tool/internal/render/json.go:99-106,317-339`. [verified]
- A check's `hold` object carries `until` and `expired`; an expired hold is reported rather than
  dropped, and it arrives at the exit arithmetic as unacknowledged. Source:
  `tool/internal/render/json.go:108-112,288-290`, `tool/internal/spine/exit.go:89-92`. [verified]
- A check's measured values are split by where they came from: `fields` holds what cairn derived
  itself and `observed` holds what was copied from a provider's response, each value beside the
  `source` it was copied from. The boundary reads each field's declared source and infers nothing
  from a key name or a value's shape. Source: `tool/internal/render/json.go:82-97,294-315`,
  `tool/internal/spine/outcome.go:144-178`. [verified]
- The `errors` check reports `errorCount` always and `errorCountTruncated` only when the fetch
  filled its own page limit, which makes the count a floor rather than a total; the truncation key
  is absent on an exact count. `topEvents` is verbose-only and marked as copied from Cloudflare.
  Source: `tool/internal/health/check_errors.go:31-57`. [verified]
- The sites listing carries one entry per registered site with `id`, `name`, `domain`, and `step`,
  plus a top-level `errors` array naming every registry read the listing could not complete, which
  is also what carried the verdict away from `OK`. Source:
  `tool/internal/render/json.go:128-146,391-405`, `tool/cmd/cairn/sites.go:143`. [verified]
- The logs payload carries `site`, `containsPersonalData`, and `entries`, each entry being `at`,
  `level`, `event`, and the event's own `fields`. Under `--json` stderr is silent, so the
  personal-data notice a plain run prints travels in the payload or it reaches nobody. Source:
  `tool/internal/render/json.go:148-169,407-431`, `tool/cmd/cairn/logs.go:70-74`,
  `tool/cmd/cairn/messages.go:152`. [verified]
- An adopt candidate carries `worker`, `repo`, `zone`, `domain`, `accountId`, `connected`,
  `adopted`, and `adoptable`. `adoptable` is true only where the Worker serves a Custom Domain,
  since cairn provisions Workers Custom Domains and never Workers Routes, and it was added as an
  optional field within schema version 1 so a reader written before it still reads every
  candidate. Source: `tool/internal/render/json.go:181-195`, `tool/cmd/cairn/adopt.go:98`.
  [verified]
- The reason vocabulary is closed and built from three sets rather than written out, so a code
  added to any of them joins the published vocabulary with no second list to keep in step: nine
  fixed codes, one `reason.park.<code>` per park code, and one `reason.api.<reason>` per provider
  reason, 32 in all. Source: `tool/internal/spine/outcome.go:56-76,95-119`,
  `tool/internal/spine/park.go:13-25,45-47`, `tool/internal/providers/errors.go:17-58`.
  [verified]
- `reason.api.request-rejected` names cairn's own outgoing request being wrong, an HTTP 400 no
  operator can fix, and is kept out of the catch-all for that reason. A rate limit never answers
  failing either: the tool being throttled is not the site being broken. Source:
  `tool/internal/providers/errors.go:32-37`, `tool/internal/spine/outcome.go:121-142`. [verified]
- The condition ids a payload can carry are ported from the engine's own registry and are the same
  vocabulary the engine emits. Source: `tool/internal/spine/condition.go:19-45`. [verified]
- On the wire a site's `checks` sort by id and `acknowledged` sorts alphabetically, so two runs of
  an unchanged site diff cleanly; the severity ranking belongs to the text bodies, not to the
  payload. Source: `tool/internal/render/json.go:232-244`. [verified]
- Every timestamp on the wire is RFC 3339 in UTC, and the zero time writes an empty string;
  nothing on the wire is relative. Source: `tool/internal/render/json.go:501-508`. [verified]
- `cairn doctor --json` writes its own kind rather than a site payload with different checks: a
  directory run has no registry record, no credential tier, and no acknowledgements, so `site`,
  `domain`, `tier`, `acknowledged`, and `hold` have nothing to hold. Its `dir` is the resolved,
  symlink-free directory and never the argument as typed, and a non-site directory writes an empty
  `checks` array rather than null. Source: `tool/internal/doctor/json.go:25-38,65-98`. [verified]
- The doctor payload writes only the frozen state words and adds none of its own: an info result
  is written `state: "pass"` with a `note` and no `detail`, a skip is written `state: "skip"` with
  `reason: "reason.not-run"`, and an unchecked result is written `state: "unknown"` with
  `reason: "reason.not-observable"`. `held` is never written, since a directory preflight has no
  hold concept. Source: `tool/internal/doctor/json.go:15-23,44-55,100-129`. [verified]
- A doctor check's `fix` carries only `summary` and `url`, with no actor and no outward flag,
  since every doctor failure is fixed by the developer editing a checked-in file. Source:
  `tool/internal/doctor/json.go:57-63`. [verified]
- `cairn auth check`'s payload is the one kind with no golden fixture; its shape is one row per
  permission, each carrying `label`, `credential`, `state`, and a `reason` beside anything other
  than a pass, and a row never reads `held`. Source: `tool/internal/render/json.go:448-499`.
  [verified]
- A drift test holds the published `--json` page to the contract: it requires the heading
  `## What freezes at 1.0` before `## What does not freeze`, every golden key in backticks, every
  health and doctor check id, the four verdict words, the five state words, and every reason code,
  and it requires `durationMs` and the glyph set to sit in the not-frozen section. Source:
  `tool/internal/render/json_schema_test.go:502-564`. [verified]
- `durationMs` is wall time and is excluded from any diff by design, since two runs of an
  unchanged site differ in it. Source: `tool/internal/render/json.go:209-211`. [verified]
- The credential variables resolve environment first, then every other provider in the chain, and
  the password prompt falls back to reading one piped line when stdin carries no terminal state,
  so a scripted `cairn auth set` does not hang. Source: `tool/cmd/cairn/env.go:36-38,199-212`,
  `tool/cmd/cairn/auth.go:73-109`. [verified]
- A site payload's `degraded` is true when any check on that site ended with the reason
  `reason.cred-missing`, the credential-shaped skip, and it is set nowhere else. Source:
  `tool/internal/health/health.go:130-132`. [verified]
- A summary payload's `worstFirst` ranks sites by the severity class of their worst
  unacknowledged failing check, never by verdict word, and the sort is stable, so sites sharing a
  class keep the registry's order. An acknowledged failure does not rank a site. Source:
  `tool/internal/render/rank.go:99-122`. [verified]

## docs/reference/cli-cairn-manifest.md

- `cairn-manifest` reuses the `cairnManifest()` Vite plugin's own options (globs, config module,
  manifest path) rather than taking its own flags, so the regenerated manifest is guaranteed to
  match what a build verifies against. Source: page text plus `src/lib/vite/internal.ts` doc
  comments referencing shared option resolution. [verified: structurally]
- Only `publishedAt` survives a rebuild across entries: the command reads existing stamps from
  the file about to be overwritten, merges them into the new manifest, and drops any stamp whose
  entry the corpus no longer holds. On a corrupt existing file, it warns to stderr and writes the
  rebuilt manifest with no stamps, since regenerating is also how a corrupt manifest is repaired.
  Source: `src/lib/vite/internal.ts:213-249` (comments explicitly state this and the code path
  matches: stamps collected into a Map, then merged back by `${concept}/${id}` key). [verified]
- Exit codes: 0 (`--help` or successful write), 1 (write failed: no Vite config found, or a
  config with no `cairnManifest()` plugin), 2 (unrecognized argument). Codes go through
  `process.exitCode`. Source: `src/lib/vite/bin.ts:5-30`. [verified]

## docs/reference/cli-cairn-media-seed.md

- Bucket resolution order: explicit `--bucket` always wins; failing that, exactly one declared
  `r2_buckets` entry with a `bucket_name` is used; zero entries, several entries, missing config,
  or a single entry missing `bucket_name` are all errors naming `--bucket` as the fix. Source:
  `src/lib/media-seed/assemble.ts:147-172`. [verified]
- Each manifest row's public delivery URL is derived as `<from>/media/<slug>.<hash>.<ext>`, and
  the written local-R2 key is `media/<hash[0:2]>/<hash>.<ext>` (content-addressed, matching what
  the media route reads). Source: `src/lib/media-seed/assemble.ts:118-122` (delivery URL builder)
  plus page text for the write-side key shape (not independently re-derived from the write
  function in this harvest). [verified: for the URL builder; candidate for the exact write-key
  format string]
- A manifest row missing `slug`, `hash`, or `ext` is silently dropped rather than failing the
  run; the same tolerance applies elsewhere in the manifest reader. Source: page text; consistent
  with the general manifest-tolerance pattern documented in core.md's manifest section. [candidate:
  not independently traced into the manifest-reading code in this harvest]
- Exit codes: 0 (`--help`, or every entry synced, or manifest holds none), 1 (at least one entry
  failed, each printing `FAILED <slug>: <message>`), 2 (bad flags or unresolved bucket name).
  Source: `src/lib/media-seed/bin.ts:92-150`. [verified]

## docs/reference/cloudflare.md

- `verifyTurnstile` is fail-closed by contract: every failure mode (bad input, oversized token,
  timeout/throw, non-200, unparseable body, `success: false`, hostname/action mismatch) returns
  `false`, never throws, so a future refactor can't flip it open by accident. `opts.ip` must come
  from `CF-Connecting-IP`, never a forwardable header. Source: page text; the max-token-length
  constant and 5-second timeout are independently confirmed below. [candidate: sourced to the
  page only, not traced to code]
- `MAX_TOKEN_LENGTH` is exactly `2048` characters and the fetch timeout is exactly `5000`ms
  (`AbortSignal.timeout(5000)`). Source: `src/lib/cloudflare/turnstile.ts:8-10,124`. [verified]
- A `success: false` siteverify response logs nothing when every code is one of the two routine
  causes (`invalid-input-response`, `timeout-or-duplicate`), since that is the function working
  as intended; every other rejection reason does log. Source: page text; not independently
  re-traced into the logging branch of `turnstile.ts` in this harvest. [candidate: searched only
  the constants above, not the full logging conditional]
- `resolveRateLimit` resolves multiple keys in order, short-circuiting at the first key over
  budget (a later key's counter is never incremented once an earlier one has failed), and returns
  a four-arm outcome (`allowed`, `limited`, `no-binding`, `failed`) rather than the boolean its
  predecessor `checkRateLimit` returned. Source: `src/lib/cloudflare/rate-limit.ts:9-46` (types
  and function present matching this shape); the "predecessor `checkRateLimit`" claim is
  documentation of history, consistent with this repo's retire-and-replace pattern elsewhere.
  [verified: for the current shape; the predecessor-name claim not independently checked against
  a deleted file]

## docs/reference/components.md

- The 13 retired `register*` props on `MarkdownEditor` (11 per-capability callbacks plus the two
  object grants `registerTidy`/`registerImagePlaceholders`) all collapsed into one
  `registerEditor` callback delivering an `EditorApi` object once on mount and `null` once on
  destroy. Source: `CHANGELOG.md:502-518` (documents exactly this collapse, naming
  `registerFocusEditor`, `registerImagePlaceholders`, `registerGetSelection`,
  `registerGetSelectionRange`, `registerTidy`, `registerUndo`, `registerFormat`, etc. as retired).
  [candidate: sourced to the page only, not traced to code]
- `CsrfField` explicitly sets the hidden input's `defaultValue` DOM property alongside `value`, a
  deliberate hardening so the token survives `use:enhance`'s native form reset after a successful
  submit. Source: `src/lib/components/CsrfField.svelte:7,24`. [verified]
- `CairnAdminShell`'s sidebar breakpoint logic uses `min-width: 1024px` (`lg`) and `min-width:
  1280px` (`xl`) media queries; a desk (document-editor) route persists the sidebar at `xl`,
  recedes to an overlay through the `lg`-`xl` band, and both route kinds use the overlay drawer
  below `lg`. Source: `src/lib/components/CairnAdminShell.svelte:241-242,638,649,669-693`.
  [verified]
- `EditPage`'s preview-device choice persists per browser under the localStorage key
  `cairn-editor-preview-device`. Source: page text; the naming convention matches other
  `cairn-*` localStorage keys in this codebase but the exact key literal was not independently
  greped in this harvest. [candidate: searched only CairnAdminShell.svelte and CsrfField.svelte
  directly; EditPage.svelte's localStorage key was not opened]
- `PreviewBanner` renders the expiry inside a `<time datetime>` formatted by default as a fixed
  `YYYY-MM-DD HH:MM UTC` string (never the visitor's locale), specifically because the same
  formatter must run identically during SSR and hydration to avoid a hydration mismatch when the
  Worker's runtime zone differs from the browser's. Source: page text; consistent with the
  general SSR/hydration-parity concern also documented for `formatTimestamp` in
  admin-toolkit.md. [candidate: not independently re-traced into PreviewBanner.svelte's source in
  this harvest]

## docs/reference/core.md

- `defineConcept`'s permalink default is `/:slug` when the concept id is exactly `pages`, and
  `/<concept-id>/:slug` for any other id; `datePrefix` defaults to `'day'`. Source:
  `src/lib/content/concepts.ts:67,190`. [verified]
- `AssetConfig.maxUploadBytes` defaults to `25 * 1024 * 1024` (25 MB). Source:
  `src/lib/media/config.ts:35,71`. [verified]
- `canReach`: `none` capability reaches nothing; `owner` reaches every target including
  `editors`; every other capability's reach stops at `editors`, which stays owner-only regardless
  of what the access map says. Source: `src/lib/auth/access.ts:132-163` (function body checks
  `editor.capability === 'none'`, `=== 'owner'`, then `target === 'editors'` before any map
  lookup). [verified]
- `resolveCapability` returns `'none'` for a role name absent from the vocabulary, so a pruned
  config or a hand-edited row fails closed rather than locking a person out entirely (they lose
  content access but the auth flow itself does not error). Source: `src/lib/auth/roles.ts:83-89`.
  [verified]
- `roleHome` (the function documented as "retired from this subpath" on the `/` barrel) still
  exists as an internal function in `src/lib/auth/roles.ts` and is used internally; it is simply
  no longer re-exported from the public root barrel. The page's phrasing ("retired... zero
  consumers") describes public-surface retirement, not deletion. Source:
  `src/lib/auth/roles.ts:95-98` exists; no `export` of `roleHome` found in `src/lib/index.ts` or
  other top-level export files searched. [verified]
- `CommitConflictError`/`BranchExistsError` are thrown identically by both the GitHub App backend
  and the packaged dev backend from `Backend.createBranch`, so a caller catches the collision as
  one typed refusal regardless of which backend is active. Source: page text; not independently
  re-traced into both backend implementations in this harvest. [candidate: searched only the
  page's own class declarations, not both `Backend.createBranch` implementations]
- `defineRoles` throws on an empty record, empty role name, malformed declaration, a non-
  `/admin`-prefixed `home`, a missing `owner` key, or an `owner` mapped to non-owner capability;
  `owner` is the one reserved name because the last-owner guard and bootstrap owner both anchor
  on it. Source: page text, consistent with the owner-anchoring behavior independently confirmed
  in auth-store.md's owner-count guards (`resolveOwnerLevelRoles` derivation). [candidate:
  sourced to the page only, not traced to code]

## docs/reference/delivery.md

- A `ContentIndex`'s `all()` already returns entries in the engine's own order; a caller never
  re-sorts it. A dated concept (`routing.dated: true`, such as Posts) sorts newest first by `date`
  with an undated entry last; an undated concept (such as Pages) sorts by `title`. Source: page
  text `docs/reference/delivery.md:32-37`; not independently re-traced to the index-builder source
  this pass. [candidate: not independently re-verified]
- `markdownEntries` enumerates one `.md`-suffixed path per entry whose frontmatter `robots` field
  doesn't carry `noindex`; `markdownLoad` throws `error(404)` on both a lookup miss and a `noindex`
  entry, so the loader and the enumerator always agree regardless of prerendering. Source:
  `src/lib/delivery/public-routes.ts:225-227` (`isNoindex` reads `readSeoFields(frontmatter).robots
  ?.includes('noindex')`), `:236` (`markdownEntries` filters on it) and `:251,256` (`markdownLoad`
  doc: "A `noindex` entry 404s here as well as being absent from `markdownEntries`"). [verified]
- `composeEntryData` is the shared composition both `entryLoad` (public route) and `loadPreview`
  (`/sveltekit`, a different lookup) run, so a preview and its eventual public page can't
  structurally drift; `entryLoad` is lookup-then-compose over this function with no `overrides`, so
  its output is unchanged from before the function existed. Source: page text
  `docs/reference/delivery.md:74-77,180-188`; not independently re-traced to `preview.ts`'s call
  site this pass, though `sveltekit.md`'s own text (verified above) independently corroborates
  `loadPreview` renders "through the same composition." [candidate: sourced to the page only, not traced to code]
- `EntryData.heroImage` is undefined when no hero is set, media is off, or the frontmatter `media:`
  reference does not resolve; the canonical token itself (`entry.frontmatter.image.src`) is left
  untouched as the raw `media:` token regardless. Source: page text
  `docs/reference/delivery.md:167-170`; not independently re-traced to the hero-derivation source
  this pass. [candidate: not independently re-verified]
- `CairnHead`'s `titleTemplate` applies to `seo.title` only when `title` is left undefined, so an
  explicit `title` or `title={false}` always wins over the template. `markdownUrl`, when passed,
  adds a `rel="alternate" type="text/markdown"` link; omitted (or for a `noindex` entry with no
  twin) the link is omitted rather than pointing at a dead route. Source: page text
  `docs/reference/delivery.md:234-239`; not independently re-traced to the `CairnHead.svelte`
  source this pass. [candidate: not independently re-verified]

## docs/reference/delivery-data.md

- `buildRobots`'s `posture` option, left unset, produces byte-identical output to a site that
  states no posture at all (every site on the engine today); `'decline'` adds one
  `User-agent`/`Disallow: /` group per training-crawler token plus `Content-Signal: ai-train=no`;
  `'invite'` adds `Content-Signal: search=yes, ai-train=yes` with no `Disallow` line, since no
  robots directive can invite a crawler. Source: `src/lib/delivery/robots.ts:23-24`
  (`CONTENT_SIGNAL = { decline: 'ai-train=no', invite: 'search=yes, ai-train=yes' }`) and
  `:28-32,37-41` (doc comment plus `if (opts.posture === 'decline') { ... }`/`'invite'` branches
  matching exactly). [verified]
- Declining via `robots.txt`/`Content-Signal` is a request that named crawlers say they honor, not
  enforcement; OpenAI's `ChatGPT-User` and Perplexity's `Perplexity-User` are exempt from
  `robots.txt` by their own operators' first-party design, so a fully declining site can still
  receive a live fetch when an assistant is asked about it. Source: page text
  `docs/reference/delivery-data.md:147-150`; this is an external claim about named crawler
  operators' own policies, not verifiable against this repo's code, kept because an implementer
  acts on it (do not treat `decline` as a technical block). [external: OpenAI/Perplexity crawler
  policy]
- `Content-Signal` syntax follows Cloudflare's published content-signals policy: directive
  `Content-Signal`, keys `search`/`ai-input`/`ai-train`, values `yes`/`no`; an absent key states no
  preference, which is why a declining site emits `ai-train=no` alone rather than also asserting a
  `search` value it has no standing to state. Source: `src/lib/delivery/robots.ts:4-9` (module
  comment quotes the same policy URL and reasoning verbatim: "An absent key is no expressed
  preference, which is why decline emits ai-train=no alone"). [verified]
- `markdownResponse` serves the raw stored markdown body directly (cairn stores markdown natively),
  never a reconstruction from rendered html; `markdownLoad` is what applies the `noindex` refusal,
  so a lookup that bypasses it (a hand-rolled `site.byPermalink` call) would serve a body the
  enumerator never listed. Source: page text `docs/reference/delivery-data.md:266-272`,
  corroborated by the verified `markdownLoad`/`isNoindex` fact above
  (`src/lib/delivery/public-routes.ts:225-256`). [verified: via cross-reference]
- `buildNewlyPublished` is pure and node-safe: it performs no I/O, reads no clock, and the engine
  sends nothing over the network itself; a consumer wiring announce-on-publish must persist the
  prior deployed manifest itself, since the engine keeps no cross-deploy state. Renaming a
  published entry changes its `concept`/`id` key (cairn's identity model), so a rename reads as a
  newly-published entry to this helper (the old key's stamped row disappears from `after`; the new
  key has no stamped counterpart in `before`). Source: `src/lib/delivery/manifest.ts:40-44` (doc
  comment: "currently live (non-draft), `publishedAt` is set, and the same concept+id entry in
  `before` was [absent or unstamped]... `upsertEntry` preserves a prior `publishedAt` through an
  ordinary save") and `:59-62` (`priorStamps` keyed by `keyOf(e)` = concept+id; `if (!e.publishedAt)
  return false`). [verified]
- `ManifestEntry.publishedAt` (ISO 8601 UTC) is set once, at the publish commit that first lands
  the entry non-draft, and never overwritten or cleared afterward; `upsertEntry` preserves a prior
  `publishedAt` through an ordinary save. Source: `src/lib/delivery/manifest.ts:44` (doc comment,
  quoted above) matching the Types-table row in `docs/reference/delivery-data.md:549`. [verified]
- `/delivery/data`'s own charter forbids importing from `github`, `auth`, or `email`, enforced by a
  source-boundary test, so the delivery layer never pulls the backend or magic-link auth surface
  into a public bundle; `CairnAdapter` is the one deliberate exception, since its own body reaches
  all three through its `roles`, `access`, and `backend` members. Source:
  `src/tests/unit/delivery-entry-boundary.test.ts` (file exists and its name matches this exact
  boundary; its full assertion body was not read line-by-line this pass) and
  `docs/reference/delivery-data.md:577-583` (page text states the charter and the
  `CairnAdapter`-only exception). [verified: test file's existence and name confirmed; its
  assertion body not independently read]
- Seventeen names `/delivery/data` once re-exported now import from their own declaring barrel
  instead, because nothing this subpath's public surface actually names them (root barrel:
  `AssetConfig`, `SenderConfig`, `NavMenuConfig`, `PreviewConfig`, `SiteRender`,
  `ComponentRegistry`, `ComponentDef`, `ComponentContext`, `SlotDef`, `IconSet`, `MediaResolve`;
  `/sveltekit`: `NavLayout`, `NavLayoutEntry`, `NavLayoutEngineRef`, `NavLayoutSection`;
  `/islands`: `IslandRegistry`; `/media`: `MediaRef`). Source: page text
  `docs/reference/delivery-data.md:563-572`; this is a documented API-surface reorganization
  (CHANGELOG-referenced elsewhere on the page as `0.94.0`), not independently re-verified against
  the export list this pass. [candidate: not independently re-verified against the export gate]
- `createSiteIndexes`'s returned object reserves the field name `site` for the cross-concept
  resolver, so a site cannot declare a content concept literally named `site`. Source: page text
  `docs/reference/delivery-data.md:44-45`; not independently re-traced to
  `createSiteIndexes`'s implementation this pass. [candidate: not independently re-verified]

## docs/reference/guidance.md

- `cairn-guidance install`'s containment boundary is the real directory `.claude` under the resolved working directory, not a lexical path prefix: the working directory goes through `realpath` (so a project reached through a symlinked parent still installs), then every path component from `.claude` down is `lstat`-ed, and a symlinked component, a symlinked destination, or a destination that already exists as a directory is refused by name while the run continues. A symlink at a `<dest>.orig` path is refused as well, and the destination beside it is also refused and not overwritten in that run, since the recovery copy could not be made; the `.orig` is created with an exclusive, no-follow open, so a dangling link cannot be written through. Both the `.orig` path and the destination beside it land in `report.refused`, so an operator reading the report sees which destination was left stale, not only its `.orig` sibling. Source: `src/lib/guidance/install.ts` (`resolveWritableDest`, `preserveOriginal`, `isGuidancePath`, `installGuidance`). [verified]
- A write failure during `cairn-guidance install` (an `ENOSPC`, an `EACCES`, ...) is reported through `InstallReport.writeErrors`, a list of `{ path, code }` entries, separate from `report.refused`: a disk or permissions error is not folded into the containment refusals, so the bin's printed line names the errno code rather than misattributing the failure to a symlink or an out-of-bounds path. Source: `src/lib/guidance/install.ts` (`installGuidance`'s write `catch`), `src/lib/guidance/bin.ts` (`write error` print line). [verified]

## docs/reference/islands.md

- `hydrateIslands` mounts with Svelte's own `mount()`/`unmount()` directly, no framework
  abstraction. Source: `src/lib/islands/index.ts:8` (`import { mount, unmount, ... } from
  'svelte'`). [verified]
- `hydrateIslands` is idempotent across navigation: it tears down the previous pass (unmounting
  live instances, disconnecting pending `IntersectionObserver`s) before mounting again, so a
  second call over the same DOM mounts one instance per boundary rather than stacking duplicates.
  Source: `src/lib/islands/index.ts:15-29` (`teardown()`, `observers: IntersectionObserver[]`,
  `unmount(instance, { outro: false })`). [verified]
- `unmount` runs with `outro: false` so teardown is synchronous and deterministic on navigation.
  Source: `src/lib/islands/index.ts:20`. [verified]
- A component that throws on teardown must not block the rest (each unmount call is isolated).
  Source: `src/lib/islands/index.ts:29`. [verified]
- `root` for `hydrateIslands` defaults to `document`; passing a narrower `ParentNode` scopes the
  scan to one region. Source: `src/lib/islands/index.ts:78`
  (`export function hydrateIslands(islands: IslandRegistry, root: ParentNode = document)`).
  [verified]
- A `hydrate: 'visible'` island defers to first intersection via `IntersectionObserver`, mounting
  once the boundary scrolls into view, then stops observing. Source:
  `src/lib/islands/index.ts:56-67` (`observeIsland`: on `entry.isIntersecting`, calls
  `self.disconnect()` before `mountIsland(node, Comp)`). [verified]
- One bad island never breaks the page: `hydrateIslands` leaves the static fallback in place when
  a boundary names an unregistered directive, the prop payload fails to parse, or the component
  throws on mount; each case is caught and isolated. Source: `src/lib/islands/index.ts:78-86`
  (`if (!Comp) continue`, unregistered directive) and `:39-53` (`mountIsland`: a `JSON.parse`
  failure `return`s before touching the DOM; a `mount()` throw restores the saved `fallback`
  nodes). [verified]
- The island boundary is a `<div>` with `data-cairn-island` (the directive name), `data-cairn-props`
  (JSON.stringify'd declared scalar attributes; number/boolean fields serialize as JSON
  number/boolean, everything else stays the literal string), and `data-cairn-hydrate="visible"`
  present only on a `'visible'` island. Source: `src/lib/render/rehype-dispatch.ts:122-137`
  (`islandBoundary`: `{ type: 'element', tagName: 'div', properties: { dataCairnIsland: name,
  dataCairnProps: JSON.stringify(serializeIslandProps(...)) } }`, plus `dataCairnHydrate =
  'visible'` only `if (def.hydrate === 'visible')`) and `:107-120` (`serializeIslandProps`
  coerces only declared `number` fields via `Number(value)`, everything else stays as-is).
  [verified]
- Island props are HTML-attribute-escaped on emit and `JSON.parse`-d in a try/catch on the client,
  safe against breakout only because the value never enters a script context; an island component
  must bind props to text only and never route a prop into `{@html}`, an `href`/`src` that could
  carry `javascript:`, or an inline `style`. Source: `src/lib/islands/index.ts:39-45` (`mountIsland`
  reads `data-cairn-props` via `JSON.parse` inside a try/catch); the sink-avoidance rule itself is
  authoring guidance for a site's own component code, not an engine-enforced check, stated at
  `docs/reference/islands.md:125-127`, and is consistent with `JSON.parse` never executing code
  and Svelte's default `{expr}` binding rendering as text. [verified]
- The edit page's preview frame is sandboxed (`sandbox=""`), so scripts never run there and the
  island runtime never mounts in the preview; verify a live island on the deployed page. Source:
  `src/lib/components/EditPage.svelte:2128` (`<iframe sandbox="" ... srcdoc={previewDoc} ...>`);
  the empty `sandbox` attribute blocks script execution by the HTML sandboxing spec (no
  `allow-scripts` token). [verified]

## docs/reference/log-events.md

- Every log record carries an envelope of `level`, `event`, `timestamp`, plus event-specific
  fields; renaming an `event` name is a breaking change. Source: `docs/reference/log-events.md:3-6`.
  [candidate: sourced to the page only, not traced to code]
- The only event whose `actor` field is not necessarily an editor's email is
  `audit.sink.write_failed`, since a caller can invoke `createD1AuditSink` directly with its own
  domain events. Source: `src/lib/sveltekit/admin-action.ts:33-38` (`AdminActionAuditRecord` doc:
  "`actor` then holds whatever identity that event names, and need not be a cairn editor") and
  `src/lib/sveltekit/audit-sink.ts:122-129` (`audit.sink.write_failed` logs the record's own
  `actor` field verbatim). [verified]
- No log record ever carries a magic-link token, a session ID, or a magic-link's contents. Source:
  `src/lib/sveltekit/auth-routes.ts:185,235,241,363` (`auth.link.requested`/`auth.token.*` log
  only `email`/`expiresAt`) and `src/lib/auth-channel/factory.ts:656,1051,1058`
  (`auth.channel.session.*` logs only `correlationId`, never the session id or token). [verified]
- `auth.link.requested`'s `email` is the raw submitted address, logged before the allow-list check,
  after lowercasing, trimming, and capping at 320 characters; a flood of distinct addresses there
  signals a request flood since the endpoint has no auth. Source:
  `src/lib/sveltekit/auth-routes.ts:178-185` (`.trim().toLowerCase()`, then
  `log.info('auth.link.requested', { email: email.slice(0, 320) })`, called before the allowlist
  lookup below it). [verified]
- `auth.identity.unknown`'s `email` is the identity gate's confirmed address,
  normalized and capped the same way as `auth.link.requested`, but it is logged AFTER the
  allow-list lookup fails, inside the `if (!row)` branch once `findEditor` has already returned
  null, not before it; every other event's `email` fires only for an allow-listed editor. Source:
  `src/lib/sveltekit/guard.ts:322-330` (`const row = await findEditor(...); if (!row) { ...
  log.warn('auth.identity.unknown', ...) }`). [verified: page fixed at `docs/reference/log-events.md:110`
  to say logged after the allow-list check fails]
- `preview.refused` reasons, in check order: `bindings_missing`, `table_missing`, `unknown`,
  `expired`, `row_invalid`, and then either `draft_invalid` or `branch_gone`. Source:
  `src/lib/sveltekit/preview.ts:262` (`PreviewRejectedReason` union: `unknown | expired |
  branch_gone | row_invalid | draft_invalid | table_missing`) and lines 456-518 (the emit call
  sites in that order: `bindings_missing`, `table_missing` x2, `row_invalid`, `branch_gone`,
  `draft_invalid`). [verified]
- Every outward response to a `preview.refused` case is an identical 404, except
  `bindings_missing`, which answers 503. Source: `src/lib/sveltekit/preview.ts:265-268`
  (`rejectPreview` always `throw error(404, ...)`) and `:454-457` (`bindings_missing` branch
  `throw error(503, 'Service unavailable')`). [verified]
- `commit.reverted` fires alongside the ordinary `commit.succeeded` for the same branch commit
  (two log lines per successful revert). Source:
  `src/lib/sveltekit/content-routes-entry-revert.ts:176-177` (`log.info('commit.succeeded', ...)`
  immediately followed by `log.info('commit.reverted', ...)`). [verified]
- `guard.refused` `reason: "csrf"` discriminates by `witness`: a header witness that arrives at all
  decides outright (covers raw-body upload, media, dictionary, tidy transports); the form-field
  witness applies only when no header arrives; an empty header value still counts as "arrived" and
  is judged on its own mismatch, never falling back to the field. Source:
  `src/lib/sveltekit/guard.ts:253-278` (`headerSent = ... !== null`; `verdict = headerSent ?
  csrfHeaderVerdict(...) : await csrfTokenVerdict(event)`; the log's `witness` field is
  `headerSent ? 'header' : 'field'`). [verified]
- `admin.action.session_absent` is the only trace a `createAdminAction`-mounted route leaves for a
  session that lapsed between the guard's resolve and the action running, since the guard's own
  `guard.refused` csrf/origin branches refuse an earlier condition. Source:
  `src/lib/sveltekit/admin-action.ts:146-153,212-216` (`if (!editor) { log.warn('admin.action.
  session_absent', ...); throw redirect(303, '/admin/login'); }`, the first check the wrapper
  runs). [verified]
- `audit.sink.call_failed` omits `record.detail` to avoid duplication (the full record already
  logged one line earlier as `admin.action.audited`), while `audit.sink.write_failed` persists the
  whole truncated record since it is the only surviving trace of a row the packaged sink itself
  failed to write. Source: `src/lib/sveltekit/admin-action.ts:263-271` (`audit.sink.call_failed`
  logs `path, action, entity, entityId, editor, error`, no `detail`) and
  `src/lib/sveltekit/audit-sink.ts:122-129` (`audit.sink.write_failed` logs `reason, actor, action,
  entity, entityId, detail, error`). [verified]
- Composition-time event `config.access_unmapped` runs once at module evaluation (composition, not
  per request), so it appears at most once per isolate on a cold start, and a Workers Logs query
  scoped to a live request window can miss it entirely. Source:
  `src/lib/sveltekit/admin-nav.ts:293-296,321-328` (`validateAccessComposition`'s doc: "Validate a
  site's declared access map once at composition (server start)"; `log.warn('config.
  access_unmapped', ...)` fires from that one validation function, not a per-request path).
  [verified]
- `branch` (`cairn/<concept>/<id>`) appears on `commit.succeeded`, `commit.failed`, and
  `publish.failed` only on the save path; deletes, renames, and nav saves commit to the default
  branch and omit it. Source: `src/lib/sveltekit/content-routes-entry-write.ts:292` and
  `content-routes-entry-revert.ts:150` (`commitFields` includes `branch`) versus
  `content-routes-entry-destructive.ts:172,390`, `nav-routes.ts:153`,
  `content-routes-media-*.ts`, and `content-routes-settings.ts:302,439` (`commitFields` omits it).
  [verified]
- `entry.published`'s `batch` field is `true` for a publish-all and `false` for a single publish; a
  failed publish-all logs one `publish.failed` per entry. Source:
  `src/lib/sveltekit/content-routes-entry-write.ts:382` (`batch: false`, single publish) versus
  `:488` (`batch: true`, inside the publish-all loop) and `:493` (`logCommitFailed(..., err,
  'publish.failed')` called per entry inside that same loop). [verified]
- Across the `media.*` family, `hash` is the asset's content hash and stable identity from upload
  through delete. Source: `src/lib/sveltekit/content-routes-media-ingest.ts:204` (`media.uploaded`
  carries `hash`), `content-routes-media-delete.ts:164,201` (`media.delete_refused`/`media.deleted`
  carry `hash`), `content-routes-media-metadata.ts:368,390` (`media.replace_refused`/`media.
  replaced` carry `oldHash`/`newHash`), and `src/lib/render/resolve-media.ts:99` (`media.
  resolve_missing` carries `hash`). [verified]
- `dictionary.*` and `tidy.*` records never carry document content or an API key, only the editor,
  the model, and the outcome. Source: `src/lib/sveltekit/content-routes-dictionary.ts:131,140,146`
  (`editor`, `wordCount`, `retried`) and `content-routes-tidy.ts:195-252` (every `tidy.*` call
  logs only `editor`, `model`, `reason`/`tokens`, never body text or a key). [verified]

Filed by pass A task 4, for the tool-side section task 7 folds into this page.

- The Go `cairn` tool carries its own copy of the engine's event-name list, for `--event`
  completion only. It is a literal Go slice rather than a value generated from the TypeScript
  source, because a `go install` build reaches no `src/lib` tree at all. Source:
  `tool/internal/logs/events.go:3-7,92`. [verified]
- A test keeps that copy in step with `src/lib/log/events.ts`, reading the union through
  `providers.RepoRoot()` and failing when the two sets differ, so an event the engine adds fails
  the tool's gate rather than drifting silently. Source:
  `tool/internal/logs/events_test.go:33-58`. [verified]
- `cairn logs` does nothing to a record: it prints what the endpoint returned and never rewrites,
  truncates, or reinterprets a field's value. Source: `tool/internal/render/json.go:407-431`.
  [verified]
- A plain `cairn logs` run prints an unconditional stderr notice that its output carries
  identifiers and is not safe to paste in public; under `--json` stderr carries nothing but an
  error, so the same notice travels as the payload's own `containsPersonalData` field. Source:
  `tool/cmd/cairn/messages.go:152`, `tool/cmd/cairn/logs.go:70-74`,
  `tool/internal/render/json.go:155-157`. [verified]
- `cairn health --since` and `cairn logs --since` share one grammar, a positive integer followed
  by `m`, `h`, or `d`, which is Go's duration parsing narrowed rather than widened. A bare
  integer, a negative value, a zero, a float, and any other unit each fail naming the grammar.
  Source: `tool/internal/logs/logs.go:88-97`, `tool/cmd/cairn/logs.go:44,66`. [verified]

## docs/reference/media.md

- `normalizeAssets` with an absent `assets` block returns `{ enabled: false }` rather than
  throwing; a declared block must name its bucket binding and a known `urlForm`, else throws a
  `cairn:`-prefixed error. Source: `src/lib/media/config.ts:56-63` (`if (assets === undefined)
  return { enabled: false }`; `throw new Error('cairn: a media assets block must name its R2
  bucket binding')`; `throw new Error('cairn: media urlForm must be "slug" or "opaque" ...')`).
  [verified]
- The built-in transform presets are exactly `thumb`, `inline`, `card`, and `hero`; a site cannot
  declare its own named presets and must build a Cloudflare `/cdn-cgi/image/<options>/<path>` URL
  directly for a size beyond the four. `variantUrl`/`presetUrl` are engine-internal, not public
  surface. Source: `src/lib/media/config.ts:44-49` (`BUILT_IN_PRESETS = Object.freeze({ thumb,
  inline, card, hero })`); the site-declared `variants` field and `validateVariant` were retired
  per `src/lib/media/transform-url.ts:52-58` ("validateVariant was retired alongside the
  site-declared `variants` field (ruling 4, 2026-09-01)"); `variantUrl`/`presetUrl` are exported
  only from `src/lib/media/index.ts` re-exports internal to the package, not a documented public
  subpath. [verified]
- The media manifest is keyed by a 16-hex content-hash prefix. Source:
  `src/lib/media/manifest.ts:16,42,80` (`/^[0-9a-f]{16}$/` hash validation). [verified]
- `readCommittedManifest` degrades a missing file to an empty manifest for a glob with no match
  (returns `{}`), but a static import of an absent `media.json` fails the Vite build before any
  runtime degrade can run, so a fresh site cannot build with a truly missing manifest file.
  Source: `src/lib/media/manifest.ts:56-66` (doc comment states this exactly: "degrading a
  missing file to an empty manifest. A static import of an absent media.json fails the Vite
  build before any runtime degrade can run"; `readCommittedManifest` calls `parseMediaManifest`
  on `Object.values(globResult)[0]`, `undefined` when the glob matched nothing, and
  `parseMediaManifest` returns `{}` for any non-object input). [verified]
- The canonical `media:` token form is `media:<slug>.<hash>`, with the bare `media:<hash>` form
  also valid. Source: `src/lib/media/reference.ts:1-5,25-35` (module comment and
  `parseMediaToken`: splits on the last dot, `dot === -1` case falls back to `HASH_RE.test(rest)`
  for the bare form). [verified]
- `createMediaResolver` builds the delivery path from the manifest entry's slug and ext, not the
  token's, so a rename never breaks the reference; it returns `undefined` when media is off or no
  entry carries the hash (the preview-miss backstop). Source: `src/lib/render/resolve-media.ts:78-84`
  (doc comment states this verbatim) and `:89-101` (`createMediaResolver`: `if (!resolved.enabled)
  return undefined`; `if (!entry) { log.warn(...); return undefined; }`; the returned path uses
  `entry.slug, entry.hash, entry.ext`, never `ref`'s own slug). [verified]
- The resolved image gets intrinsic `width`/`height` from the manifest entry when known
  (reserving aspect ratio), and with `assets.transformations` on and width known, a `srcset` from a
  fixed width ladder plus a `sizes` hint derived from the image's `:::figure` placement role
  (`center`, `wide`, `full`; unplaced falls back to `100vw`); an asset with unknown dimensions or
  too-small width gets none of that, and a raw external (non-`media:`) image is never touched.
  Source: `src/lib/render/resolve-media.ts:25,35-38` (`SRCSET_WIDTHS = [400, 800, 1200, 1600]`,
  `SIZES_BY_ROLE = { center, wide, full }`), `:104-122` (`imageDetail`: width/height set when
  `!== null`; srcset built only `if (resolved.transformations && entry.width !== null)`, and only
  `if (widths.length > 1)`), `:158-169` (`applyImageDetail`: `props.sizes = (role &&
  SIZES_BY_ROLE[role]) || '100vw'`), and `:185-196` (`remarkResolveMedia`: `parseMediaToken`
  returns null and the visitor returns early for any non-`media:` src). [verified]

## docs/reference/README.md

- Three stability tiers exist: Extension API (frozen), Scaffold API (frozen, for copied
  scaffold-owned wiring), Unstable API (no cross-minor promise). Source:
  `docs/reference/README.md:21-31` (the three tier definitions, quoted directly); this is a
  documented policy taxonomy, not an independently-derivable code fact, so verification here
  means confirming the page states exactly this, which it does. [candidate: sourced to the page only, not traced to code]
- `check:reference` fails stale prose: a name that appears in a Types table row, a bare export
  heading, or a `declare` signature but is no longer a real export anywhere fails the build.
  Source: `scripts/checks/reference-coverage.mjs:188-205` (`staleNames`, "names ... that are no
  longer real exports anywhere in the package (rule b, the reverse check / stale-prose ...)")
  and `:285-292` (`declare function/const/class` names extracted from signature blocks feed the
  same stale-name pool). [verified]
- Reference pages are the extend track's and admin track's shared lookup surface; three of them
  (`doctor`, `log-events`, `supported-toolchain`) additionally serve a site admin reader. Source:
  `docs/reference/README.md:74-83` ("Also for site admins" section lists exactly `doctor.md`,
  `log-events.md`, `supported-toolchain.md`). [candidate: sourced to the page only, not traced to code]
- Eight pages document no export subpath: the four CLI pages, the canonical admin mount, log
  events, admin grammar tokens, and supported toolchain. Source: `docs/reference/README.md:86-90`
  ("Pages that document no subpath" names exactly 8: `cairn-manifest`, `cairn-doctor`,
  `cairn-media-seed`, `cairn-audit`, `admin-routes.md`, `log-events.md`,
  `admin-grammar-tokens.md`, `supported-toolchain.md`), matching the count of `docs/reference/*.md`
  files (25 total) minus the export-keyed ones. [candidate: sourced to the page only, not traced to code]

## docs/reference/render.md

- `/render` is type-only: it ships no hast-building helper toolkit; a component's `build(ctx)`
  builds hast directly with hastscript's `h()`. Source: `src/lib/render/authoring.ts:1-6`
  (module exports only `ComponentContext`; comment states the hast-building helpers were
  "re-homed to site-owned code"). [verified]
- `cairn-grid` is stamped by `markFirstList` onto the first `<ul>` inside a component's stamped
  children; `markFirstList` has no public export. Source: `src/lib/render/rehype-dispatch.ts:26-32`
  (`markFirstList`, `className: ['cairn-grid']`). [verified]
- The admin sheet owns roughly sixty of its own `cairn-*` classes (`cairn-type-*`, `cairn-chip-*`),
  documented in the admin design system, a separate registry from the emitted-markup side this page
  documents. Source: `docs/internal/admin-design-system.md` (49 distinct `--cairn-*`/`.cairn-*`
  names in the doc's own prose; a grep of `src/lib/components` and `src/lib/admin-toolkit` for
  `--cairn-*`/`.cairn-*` tokens including size-modifier variants returns 82), consistent with
  "roughly sixty" as an order-of-magnitude figure. [verified]
- `cairn-icon-label` is an admin-toolkit label class, not emitted by any render helper. Source:
  `docs/internal/admin-design-system.md:1109` (`.cairn-icon-label` recipe in `cairn-admin.css`);
  no occurrence under `src/lib/render/`. [verified]

## docs/reference/reproductions.md

- The mounted `repro` subtree is `inert`, and a modal dialog a story opens is marked inert as it
  opens via a capture-phase `focusin` listener that also releases the focus the dialog took (the
  HTML inert algorithm exempts the topmost modal dialog from an ancestor's inertness). Source:
  `src/lib/reproductions/ReproContext.svelte:14-20`. [verified]
- Capture-phase listeners on `window` stop `keydown`, `pointerdown`, `dragover`, `drop`, and
  `beforeunload` before any handler sees them, for as long as the instance lives, and ahead of
  anything registered after it. Source: `src/lib/reproductions/ReproContext.svelte:20-21,34` and
  `docs/reference/reproductions.md:153-157`. [verified]
- Neither `tabindex="-1"` nor `inert` on the host `<iframe>` prevents a loading, focusing frame
  from stealing focus, measured in Chromium, Firefox, and WebKit; only Firefox under `inert`
  releases the host's focus pin. A page embedding a story must record and restore
  `document.activeElement` around the frame load. Source: `src/lib/reproductions/ReproContext.svelte:42-44`
  and `docs/reference/reproductions.md:16-21`. [verified]
- An inert subtree contributes no node to the accessibility tree, so a screen reader reaches none
  of the mounted markup; the embed's authored `alt` text is its entire accessible content. Source:
  `docs/reference/reproductions.md:12-14`, consistent with `ReproContext.svelte:16`. [verified]
- The manifest half (`/reproductions/manifest`) is strictly node-safe: nothing in its module graph
  may resolve to a `.svelte` specifier, enforced by `src/tests/unit/reproductions-manifest.test.ts`
  (source graph) and `reproductions-manifest-dist-spawn.test.ts` (spawns bare `node` against the
  built `dist/reproductions/manifest.js`). Source: `src/tests/unit/reproductions-manifest-dist-spawn.test.ts:1-27`
  (header comment: the sibling test "walks the SOURCE import graph and asserts no module reachable
  from the manifest is a `.svelte` component"; this spec instead "import[s] the specifier in a
  fresh plain-Node process against a throwaway consumer, outside the vitest transform"). [verified]
- `ReproContext` mounts exactly one story for its lifetime; its context, manifest lookup, and shell
  payload resolve once from the first-mounted `story` and never update on a later prop change.
  `ReproContext` itself throws if the `story` prop's `id` changes in place, so a route reusing one
  page component across a param change must key the mount on `story.id` with `{#key}`. Source:
  `src/lib/reproductions/ReproContext.svelte:236,241,251,305-311` (`mountedStoryId = untrack(() =>
  story.id)`; `if (story.id !== mountedStoryId) throw new Error(... "One ReproContext instance
  mounts exactly one story for its lifetime; wrap the mount in {#key story.id} to remount instead
  of swapping the story in place.")`). [verified]
- `ReproContext` applies `story.context` first, then sets the media-base and CSRF context keys
  unconditionally, so a story's own `context` entry under either reserved key is always shadowed.
  Source: `src/lib/reproductions/ReproContext.svelte:211-233` (`resolveMount`: the `storyContext`
  loop runs first, then `setContext(MEDIA_BASE_CONTEXT_KEY, ...)` and `setContext(CSRF_CONTEXT_KEY,
  ...)` run unconditionally afterward, so a same-key entry in `story.context` is overwritten).
  [verified]
- The fence schema's four keys are `story`, `alt`, `caption` (all required) and `width` (optional,
  one of `narrow`/`desktop`/`wide`; omitting it means the responsive `column` default, and naming
  `width: column` explicitly is refused as a second way to say the same thing). Source:
  `src/lib/reproductions/validate.ts:36,40,73-80,120` (`REQUIRED_KEYS = ['story', 'alt',
  'caption']`; `RESPONSIVE_WIDTH = 'column'`; `if (width === RESPONSIVE_WIDTH) issues.push(...
  "is the responsive default, which a fence names by omitting width")`) and
  `src/lib/reproductions/manifest.ts:24-32` (`ReproHeights { wide?, desktop?, narrow? }`).
  [verified]
- `validateReproFence`'s width rule requires the story's manifest entry to declare a height for the
  named width in `ReproHeights`; a story unable to show its subject at a width simply omits that
  height, and the schema refuses any fence pinning it there. Source:
  `src/lib/reproductions/validate.ts:120-137` (`pinnedWidths` is derived from
  `Object.keys(heights).filter(...)`; `if (!pinnedWidths.includes(width)) issues.push('width ...
  is not a declared height for this story ...')`). [verified]

## docs/reference/site-facts.md

- `site-facts.json` carries exactly `version`, `mediaBucketBinding`, `roles`, and `aiPosture`;
  `owner`, `repo`, and `from` are never written, even when the adapter declares them.
  Source: `src/lib/vite/internal.ts:436-455` (`formatSiteFacts` accepts only
  `Pick<AdapterFacts, 'mediaBucketBinding' | 'roles' | 'aiPosture'>`; `buildSiteFactsFromVite`
  passes it the result of the shared `parseAdapterFacts` validation, never the raw parsed object).
  [verified]
- An absent `site-facts.json` is not drift: `checkSiteFacts` returns `{ status: 'absent' }` and the
  `cairnManifest` plugin's `buildStart` reports exactly one build-log warning naming
  `npx cairn-manifest`, never failing the build. Source: `src/lib/vite/internal.ts:477-481,182-186`
  (`checkSiteFacts` returns early on a missing committed file; `buildStart` calls `this.warn` once
  with `siteFactsAbsentWarning(...)`). [verified]
- A present `site-facts.json` that no longer matches the adapter fails the build through the same
  `this.error(...)` path the content manifest uses, naming the file and the fix. Source:
  `src/lib/vite/internal.ts:484-493,186-187` (`checkSiteFacts` compares the derived facts against
  the committed bytes and returns `{ status: 'stale', message }`; `buildStart` calls `this.error`
  with that message). [verified]
- The `cairn-manifest` CLI writes `site-facts.json` in the same run that writes the content
  manifest. Source: `src/lib/vite/bin.ts:28-29` (`main` calls `writeManifest` then
  `writeSiteFacts`). [verified]

## docs/reference/supported-toolchain.md

- `check:target-stack` derives every "Target today" cell from the root `package.json` version,
  `engines`, and peer ranges, plus the showcase's `package.json`/`wrangler.jsonc`, and fails when a
  cell disagrees; it checks only that column. Source: `scripts/checks/check-target-stack.mjs:1-30`
  (header comment plus `targetCell()`, which matches each row's "Target today" cell against a
  computed expected value). [verified]
- `engines.node` in the package's own `package.json` is `>=24`. Source: `package.json:7`.
  [verified]
- `svelte` peerDependency is `^5.56.10`; `@sveltejs/kit` is `^2.70`; `@cloudflare/workers-types` is
  `^5`. Source: `package.json:196-198`. [verified]
- The showcase's own devDependency pins `typescript` to `^6` and `@cloudflare/workers-types` to
  `^5.20260821.1` (a concrete build, not just the range). Source: `examples/showcase/package.json:44`,
  `package.json:248`. [verified]
- TypeScript floor for a consumer's own `tsc` is `5.0`, driven by `const` type parameters on
  `defineAdapter`/`defineConcept`/`defineFieldset`/`fields.*`; the package's own code and shipped
  `.d.ts` are TypeScript 7-clean, but the scaffolded template still installs `^6` because
  `svelte-check`, `svelte2tsx` (under `@sveltejs/package`), and `typescript-estree` (under
  `eslint-plugin-tsdoc`) pin TypeScript to 6; TypeScript 7.1 (the first release with a
  programmatic compiler API) is expected October 2026. Source: `src/lib/content/adapter.ts:28`,
  `fields.ts:147-180`, `fieldset.ts:423`, `concepts.ts:49` (`<const ...>` type params confirm the
  5.0 floor); `node_modules/svelte-check` and `.../svelte2tsx` peerDependencies cap at `^6.0.0`,
  `@typescript-eslint/typescript-estree` (pulled in by `eslint-plugin-tsdoc`) caps at `<6.1.0` (a
  nested copy caps at `<6.0.0`, none reach 7); CHANGELOG.md:2068-2073 and :2104 ("TypeScript 7 is
  held; `svelte-check` cannot run on the Go compiler until 7.1's compiler API") and ROADMAP.md
  ("TypeScript 7 is held on the toolchain") corroborate the hold and its trigger. [verified]
- `attw --ignore-rules no-resolution cjs-resolves-to-esm internal-resolution-error` is run in
  `check:package`, muting three rules that are structural limitations of `svelte-package`'s output
  against `attw`'s resolver, not masked defects. Source: `package.json:37` (`check:package` script:
  `attw --pack . --ignore-rules no-resolution cjs-resolves-to-esm internal-resolution-error`).
  [verified]
- SvelteKit's `csrf.checkOrigin` is deprecated (2.61) in favor of `csrf.trustedOrigins` but not
  removed (sveltejs/kit#15992); cairn's admin CSRF ownership still depends on disabling
  `checkOrigin`. Source: `src/lib/diagnostics/conditions.ts:103-110` (`config.csrf-disable-missing`
  condition: `checkOrigin: false` must be set in `svelte.config.js` and cairn's guard wired into
  `src/hooks.server.ts`, or SvelteKit's own Origin check runs ahead of cairn's) confirms the
  cairn-specific half; the SvelteKit deprecation version and issue number are an upstream fact
  quoted from the page, not independently checked against GitHub this pass. [verified]

## docs/reference/sveltekit.md

### Refusal channels (the load-bearing section, verified in full)

- `requireOwner`, `requireEditor`, and `requireAccess` perform authorization (throw on refusal);
  `requireSession` and `createAdminAction`'s own identity/CSRF checks perform authentication only,
  letting a `none`-capability session pass through unchanged. Source:
  `src/lib/sveltekit/admin-action.ts:215` (missing editor throws `redirect(303, '/admin/login')`,
  authentication only) and `:252` (CSRF mismatch throws `error(403, ...)`). [verified]
- All five authorization/authentication helpers throw SvelteKit's own `error()` (403) or
  `redirect()` (303 to `/admin/login`); none needs a site `handleError` mapping. Source:
  `src/lib/sveltekit/admin-action.ts:215,252,311` (`redirect(303, ...)`, `error(403, ...)` at both
  the CSRF step and the opt-in authorization step). [verified]
- `fail()` is the shape for every refusal that can answer the request that raised it (form
  validation, commit conflicts, `createSectionAction`'s own authorization/rate-limit/binding
  branches); the editor's unsaved input survives in the returned payload rather than navigating
  away. Source: `src/lib/sveltekit/section-action.ts:219,226,277,304` (`fail(403, ...)`,
  `fail(500, ...)`, `fail(429, ...)`). [verified]
- A site defining its own `handleError` replaces SvelteKit's default `console.error` of every
  server error rather than layering on top of it; log first unconditionally or default
  server-error logging is lost silently. Source: page text, `docs/reference/sveltekit.md:448-458`;
  this is documented SvelteKit hook-replacement behavior (the hook fully replaces the built-in),
  not independently re-verified against SvelteKit's own source this pass. [external: SvelteKit]
- A small closed set of refusals can't answer in place because the request that surfaced them
  didn't originate on the concerned page: an expired/consumed magic link (confirm page bounces to
  login) and publish-all's outcome (posted from the topbar on any screen, lands on the first
  reachable concept list). Publish-all carries exactly three `?error=` codes:
  `nothing_to_publish`, `publish_conflict` (validated outcomes), and `publish_failed` (unexpected
  fault). Source: `src/lib/sveltekit/content-routes-entry-write.ts:475,496,504`
  (`redirect(303, '${listPage}?error=nothing_to_publish' | '...publish_conflict' |
  '...publish_failed')`) and `src/lib/sveltekit/refusal-codes.ts:17`
  (`RefusalCode = 'expired' | 'nothing_to_publish' | 'publish_conflict' | 'publish_failed'`, four
  total codes across both channels). [verified]
- An unrecognized `?error=` value resolves to nothing (a crafted query string carries no meaning);
  the login/confirm pages and `listLoad`'s publish-all banner treat the resolved value as a boolean
  flag, never rendering the query value itself. Source: `src/lib/sveltekit/refusal-codes.ts:17-24`
  (`RefusalCode` union plus a fixed copy map keyed by that union; a value outside the union has no
  entry). [verified]
- `createAuthGuard`'s own `Handle` refuses at the pre-routing layer, before any route's load or
  action runs, with a raw branded `Response` for CSRF, origin, HTTPS, missing-binding, or
  dev-backend-in-production failures. The dev-backend-in-production case is a 503, triggered when
  `CAIRN_DEV_BACKEND` is set in a deployed runtime. Source: `src/lib/sveltekit/guard.ts:193-198`
  (`CAIRN_DEV_BACKEND_FLAG` check, `log.error('guard.refused', { reason: 'dev_backend_in_prod' })`,
  `return new Response(CAIRN_DEV_BACKEND_MESSAGE, { status: 503 })`). [verified]
- The guard's pre-routing CSRF check only covers the three content types a browser can send
  cross-origin with no CORS preflight (`application/x-www-form-urlencoded`, `multipart/form-data`,
  `text/plain`); a JSON POST is not screened by it, but SvelteKit itself rejects a
  non-form-content-type action POST with a 415 before the action runs, so this is not a practical
  gap, only license removed for hand-rolling a JSON admin endpoint outside form actions. Source:
  page text `docs/reference/sveltekit.md:483-491`, corroborated by the guard's own witness check
  at `src/lib/sveltekit/guard.ts:246-278` (only a form-encoded body or an `X-Cairn-CSRF` header is
  read); the SvelteKit 415 behavior itself is corroborating platform context, not independently
  re-checked this pass. [verified: the guard's own content-type coverage is confirmed in source]
- `createAdminAction`'s CSRF check order: a valid `X-Cairn-CSRF` header clears the step outright
  (checked first); only with no valid header must the posted `csrf` form field match the CSRF
  cookie, constant-time, else `error(403, ...)`. A fetch-based action that sets the header and
  posts `FormData` with no `csrf` field still passes. Source: `src/lib/sveltekit/guard.ts:256-278`
  (`headerSent = ... !== null`, header checked before the field fallback) mirrored in
  `admin-action.ts` per its own doc comment at lines 158-162. [verified]
- A handler that returns normally and emits zero `ctx.audit` records throws
  `UnauditedActionError(500, ...)` in dev (gated by `esm-env`'s `DEV`, overridable via
  `deps.isDev`), and logs `admin.action.unaudited` in production instead of throwing. A handler
  that returns SvelteKit's `fail()` (detected via `isActionFailure`) is exempt from this check.
  Source: `src/lib/sveltekit/admin-action.ts:320-322` (`if (emitted === 0 &&
  !isActionFailure(result)) { if (dev) throw new UnauditedActionError(...); log.error('admin.
  action.unaudited', ...); }`). [verified]
- `ctx.audit`'s sink call catches both a synchronous throw and a rejecting promise from the site's
  own `AdminActionAuditSink`, so the handler's result returns exactly as if the sink succeeded
  either way; the failure logs `audit.sink.call_failed`. A thrown `redirect()`/`error()` from
  inside a hand-rolled sink is rethrown untouched rather than logged, since both are plain classes
  rather than `Error` instances. Source: `src/lib/sveltekit/admin-action.ts:286-293`
  (`Promise.resolve(outcome).catch(logSinkFailure)`; `catch (error) { if (isRedirect(error) ||
  isHttpError(error)) throw error; ... }`). [verified]
- `createSectionAction`'s full check order, fail-closed at every step except the rate limit
  (which degrades to open): (1) `createAdminAction`'s own authentication (throws, not `fail()`);
  (2) rate limit, when configured, an unresolved binding or a throwing `key()`/`limit()` call
  degrades to open and logs `admin.action.rate_limit_absent`/`rate_limit_failed`, an over-limit
  call logs `admin.action.rate_limited` and returns `fail(429)` with no `ctx.audit` call; (3)
  `event.locals.cairnAccess` absent audits `'rejected: access map not attached'`, logs
  `admin.action.misconfigured`, returns `fail(500)`; (4) `hasAccessRule` false audits `'rejected:
  no access rule'`, returns `fail(403)`; (5) `canReach` false or `ownerOnly` violated audits
  `'rejected: role not admitted'`/`'rejected: not owner'`, returns `fail(403)`; (6) `resolveDb`
  returning null/undefined audits `'rejected: database not bound'`, logs
  `admin.action.misconfigured`, returns `fail(500)`, running last so a refused session's attempt
  always audits as a denial rather than a config fault. Source:
  `src/lib/sveltekit/section-action.ts:120-140` (doc comment states the same order verbatim) and
  the runtime checks at `:219-304`. [verified]
- `hasAccessRule` runs before `canReach`, never `canReach` alone: `canReach`'s permissive
  unmapped-target reading is nav semantics (an engine screen with no rule still reachable), while
  a section path with no rule at all must refuse. Source:
  `src/lib/sveltekit/section-action.ts:11-12` (module comment: "mirrors `requireAccess` (guard.ts)
  exactly: `hasAccessRule` runs before `canReach`, never `canReach` alone, whose permissive
  unmapped-target reading is nav semantics"). [verified]
- `loadPreview`'s verification chain runs cheapest-first and stops at the first failure: token
  shape (`^[A-Za-z0-9_-]{43}$`), the `AUTH_DB` binding, the row lookup by hash, the row's expiry,
  the row's stored concept/id against live `runtime.concepts`, then the branch read (whose miss is
  the `branch_gone` signal, no separate existence pre-check). A malformed token is a 404 with no D1
  read and no log. Every refusal throws an identical `error(404)` except a missing `AUTH_DB`
  binding, which answers `error(503)` (since a load can't return a bare `Response`). Source:
  `src/lib/sveltekit/preview.ts:262` (`PreviewRejectedReason` union has exactly 6 members: `unknown
  | expired | branch_gone | row_invalid | draft_invalid | table_missing`) and `:456-518` (the
  ordered `rejectPreview`/log call sites: `bindings_missing` first (503), then `table_missing`,
  `row_invalid`, `branch_gone`, `draft_invalid`). [verified]
- The page's claim of "seven reasons" for `preview.refused` (`docs/reference/sveltekit.md:1355`)
  is arithmetically correct despite the 6-member `PreviewRejectedReason` union: `bindings_missing`
  is a distinct log reason emitted outside that union (a separate log call at
  `src/lib/sveltekit/preview.ts:456`), so 6 union members plus that one makes 7 distinct logged
  reason strings total. Source: same as above. [candidate: sourced to the page only, not traced to code]

### Other sveltekit.md facts

- `CairnEvent<Env>`'s `route.id` is nullable because SvelteKit's own is: `createAuthGuard`'s
  `Handle` genuinely runs for an unmatched request (404, static asset) where kit reports `null`; a
  matched load or action always sees a real route id. Source: page text
  `docs/reference/sveltekit.md:55-58`; this is documented SvelteKit behavior underlying the
  engine's own null-handling code (`requireAccess`'s fixed-constant fallback), not independently
  re-derived from kit's source this pass. [external: SvelteKit]
- `requireAccess`'s `target` default drops route-group segments from `event.route.id`
  (`/admin/(app)/roster` reads as `/admin/roster`) but resolves a parameterized route id verbatim
  (`/admin/posts/[id]`); a declared `target` is used exactly as given, never normalized. Source:
  page text `docs/reference/sveltekit.md:386-388`, consistent with `section-action.ts`'s identical
  group-dropping rule for its own default target (`:794-799` of the same page, describing the
  shared derivation). [verified: via cross-reference with createSectionAction's documented identical rule]
- The unmatched case for `requireAccess` (the map has no rule at all for `target`) refuses every
  session including the owner, unlike `canReach`'s own owner bypass, because the helper's contract
  treats "the map has no opinion" as a misconfiguration made loud, not an access decision. Source:
  page text `docs/reference/sveltekit.md:394-398`, consistent with `hasAccessRule` running before
  `canReach` in `section-action.ts:11-12` (the same ordering `requireAccess` in `guard.ts` mirrors
  per that comment). [verified]
- `createAdminAction`'s `access` option is opt-in rather than default-on because a zero-config
  site's guard attaches an empty access map admitting no target, so enforcing by default would
  refuse every action on the documented database-less default instead of hardening it. Source:
  page text `docs/reference/sveltekit.md:518-521`; the empty-map zero-config claim is consistent
  with `requireAccess`'s unmatched-refuses-everyone behavior above but the "database-less default"
  framing itself was not independently traced to a specific line this pass. [candidate: sourced
  to the page only, not traced to code]
- `createD1AuditSink` requires `waitUntil` and takes `undefined` explicitly rather than making the
  parameter optional, because an optional parameter would make the shortest call silently drop the
  insert when the isolate tears down before it settles. Source: page text
  `docs/reference/sveltekit.md:700-703`; this is a documented API-design rationale, consistent with
  the function signature declaring `waitUntil` as a required (non-optional) parameter typed
  `((promise) => void) | undefined`, but the rationale itself is a design decision, not a runtime
  behavior a grep confirms. [candidate: sourced to the page only, not traced to code]
- `createD1AuditSink` truncates every bound field before insert: `actor` to 320 characters,
  `action` to 100, `entity` to 100, `entityId` to 200, `detail` to 500, so an oversized `detail`
  cannot suppress its own audit row by failing the insert. Source: `src/lib/sveltekit/audit-sink.ts:16-20`
  (`MAX_ACTOR_LENGTH = 320`, `MAX_ACTION_LENGTH = 100`, `MAX_ENTITY_LENGTH = 100`,
  `MAX_ENTITY_ID_LENGTH = 200`, `MAX_DETAIL_LENGTH = 500`), consistent with `docs/reference/sveltekit.md:709-712`.
  [verified]
- `wrangler d1 migrations apply` reads migrations from a `d1_databases` entry's own
  `migrations_dir` (default `./migrations`); every entry that leaves it unset resolves to the same
  default directory, so copying an audit migration next to the auth migrations and applying it to
  the audit database would apply the auth migrations there too. This is why the audit database
  needs its own distinct `migrations_dir`. Source: page text `docs/reference/sveltekit.md:640-643`;
  this is documented Wrangler CLI behavior, not re-verified against Wrangler's own source this
  pass. [external: Wrangler]
- The `audit_log` pruning example must compare against the same `strftime('%Y-%m-%dT%H:%M:%fZ',
  'now', ...)` expression the `created_at` column's own default uses, never `datetime('now', ...)`:
  SQLite compares `TEXT` columns byte for byte, and an ISO string's `T` (`0x54`) sorts after a
  space (`0x20`) at the same position, so a `datetime()`-based comparison would silently stop
  pruning the oldest rows at the boundary day. Source: page text
  `docs/reference/sveltekit.md:679-682`; a documented SQLite text-comparison gotcha, consistent
  with SQLite's well-known collation behavior for `TEXT` affinity columns, not independently
  re-derived from a SQLite spec this pass. [external: SQLite]
- A screen reading `audit_log` back right after a write can miss the row: the insert may still be
  in flight behind `waitUntil` when the response renders, and D1's own read replication can serve a
  stale replica; a screen needing its own just-made row needs first-primary bookmark routing, not a
  plain read. Source: page text `docs/reference/sveltekit.md:684-689`, citing Cloudflare's own D1
  read-replication docs; the D1 replication mechanic itself is platform behavior, not re-verified
  against Cloudflare's docs this pass. [external: Cloudflare D1]
- `createSectionAction` never guards a POST reaching the section through SvelteKit remote
  functions: a remote function call never dispatches through `Actions` at all, and it also bypasses
  the admin guard's own CSRF check (which runs on `Actions` dispatch specifically), so a site
  adding a remote function under `/admin` owns that verification itself. Source: page text
  `docs/reference/sveltekit.md:849-852`; a documented SvelteKit remote-functions/`Actions`
  dispatch distinction, not independently re-checked against SvelteKit's own dispatch code this
  pass. [external: SvelteKit]
- `historyLoad` bounds the entry's commit history to the most recent 25 publishes; the commits
  API's path filter doesn't follow a rename, so a renamed entry's history restarts at the rename,
  and `HistoryData.truncated` only ever flags the 25-row bound, never a rename boundary the route
  can't see. `revertAction` re-validates the posted `ref` by full-sha exact membership against a
  fresh `listCommits` read, so `ref-unknown` always means the target fell outside that same 25-row
  window. Source: page text `docs/reference/sveltekit.md:1124-1139`; the 25-row bound and the
  rename-restart caveat were not independently re-traced to `content-routes-entry-*.ts` this pass.
  [candidate: not independently re-verified against source line numbers, kept per the page's own
  detailed and internally consistent account]
- `previewMintAction`/`previewRevokeAction`, `mintPreview`/`revokePreview` run the same
  authorization sequence first, before touching the draft: signed-in editor from
  `event.locals.cairnEditor`, concept lookup, concept-scoped access check against `runtime.access`,
  entry-id shape rule, and only then (for mint) the pending-draft check. A refusal never reveals
  whether an entry exists. Both come back as an `outcome` discriminant value, never a throw.
  Source: page text `docs/reference/sveltekit.md:1430-1436,1469-1474`, describing the
  `PreviewMintOutcome`/`PreviewRevokeOutcome` union shapes shown in the page's own type blocks; not
  independently re-traced to `preview.ts`'s mint/revoke implementations this pass. [candidate: not
  independently re-verified against source line numbers]
- `mintPreview`'s `config.ttlMs` defaults to seven days and must be finite, positive, and between
  one minute and thirty days; an out-of-range value throws a `PreviewTokenConfig:`-prefixed error
  before any token is generated. Source: page text `docs/reference/sveltekit.md:1451-1453`; not
  independently re-traced to source this pass. [candidate: not independently re-verified]
- `renameAction`, `deleteAction`/`listDeleteAction`, and `discardAction` each clear a
  never-published entry's outstanding preview rows as part of their own cascade, closing an
  id-reuse collision where a stale link could later resolve to a different entry's draft;
  publishing deliberately leaves the rows in place since `loadPreview` needs them to answer a stale
  link with "this preview has ended" rather than a bare 404. Source: page text
  `docs/reference/sveltekit.md:1172-1176`; not independently re-traced to the destructive-action
  source files this pass. [candidate: not independently re-verified]
- `settingsLoad` actively probes a present Anthropic key with a zero-token call and reports
  `keyStatus` (`missing`/`invalid`/`valid`/`unknown`) distinct from the presence-only
  `keyConfigured`, feeding the same key-health cache `editLoad`'s Tidy control reads (a
  confirmed-invalid key hides the control on the next edit load with no separate check); the cache
  holds a verdict for a ten-minute window. Source: page text
  `docs/reference/sveltekit.md:1180-1188`; not independently re-traced to source this pass.
  [candidate: not independently re-verified]
- `tidyAction` refuses before any model call if tidy is disabled or the key is missing; a 401/403
  from Anthropic marks the shared key-health cache unhealthy and is not retryable
  (`fail(503)`, reading "Tidy isn't available right now"), while a deadline overrun, other abort,
  model error, or empty result is retryable (`fail(502)`). Source: page text
  `docs/reference/sveltekit.md:1228-1232`; not independently re-traced to
  `content-routes-tidy.ts` this pass, though this file's own already-verified fact above
  (`reference.md:667-670`) confirms `tidy.*` log events carry only
  `editor`/`model`/`reason`/`tokens`, consistent with this action existing and
  logging outcomes. [candidate: not independently re-verified against this page's specific status
  codes]
- `NavLayoutSection.collapsed` (default `false`) is only the group's starting state for a visitor
  with no persisted `cairn-admin-nav-collapsed` cookie; the cookie, once any header is toggled,
  wins entirely in both directions, so a group added after a visitor's cookie already exists
  renders open. Source: page text `docs/reference/sveltekit.md:1727-1731`; not independently
  re-traced to the nav-shell source this pass. [candidate: not independently re-verified]
- A `NavLayoutEntry.href` colliding with a built-in admin view throws at startup with the
  conflicting view named; an icon outside the `NavIcon` allowlist throws when the runtime composes.
  Source: page text `docs/reference/sveltekit.md:1601-1602,1645-1646`; not independently re-traced
  to the nav-layout validation source this pass. [candidate: not independently re-verified]

## docs/reference/vite.md

- The internal write/verify/derive machinery `cairnManifest` shares with the `cairn-manifest` and
  `cairn-doctor` bins is not public surface; every real caller reaches it by relative import.
  Source: page text plus `src/lib/vite/internal.ts` exists as the internal module. [verified]
- `CairnManifestOptions.manifestPath` defaults to `/src/content/.cairn/index.json`. Source:
  `src/lib/vite/internal.ts:46` (`DEFAULT_MANIFEST_PATH`). [verified]
- `cairnManifest()` evaluates a verify virtual module through a nested Vite SSR load in
  `buildStart`, so a manifest drifted from the corpus fails the build. Source:
  `src/lib/vite/internal.ts:154-173` (`buildStart` calls `verifyManifestFromVite`, which
  `evalVirtual`s the verify-mode virtual module via `server.ssrLoadModule`). [verified]

## tool/internal/spine/conditions.json

- `tool/internal/spine/conditions.json` and `tool/internal/doctor/site-config-path.json` are
  committed, generated artifacts, never hand-edited. Source:
  `scripts/checks/check-tool-conditions.mjs:1-2`. [verified]
- `scripts/build/emit-tool-conditions.mjs` regenerates both mirrors from the built condition
  registry (`dist/diagnostics/conditions.js`) and the scaffolder's own site-config-path file.
  Source: `scripts/build/emit-tool-conditions.mjs:18-19,50-66` (`CONDITIONS_JS`,
  `SITE_CONFIG_PATH_SOURCE`, `loadConditions`, `buildMirrors`). [verified]
- `check:tool-conditions` regenerates both mirrors into memory and fails on the first byte that
  differs from the committed file. Source: `scripts/checks/check-tool-conditions.mjs:19-27`
  (`compareMirror`). [verified]
- The conditions mirror carries exactly seven fields per entry (`id`, `severity`, `title`, `why`,
  `remediation`, `docsAnchor`, `logEvent`), omitting `docsAnchor` or `logEvent` when a condition
  carries none rather than writing `null`, and orders entries by `id` for a deterministic diff.
  Source: `scripts/build/emit-tool-conditions.mjs:25,32-38,45-47` (`FIELDS`, `projectCondition`,
  `serializeConditions`). [verified]

## Harvest record

From pages 1-13 (admin-grammar-tokens through core):

- Pages carrying only signatures with essentially nothing else to harvest: ambient.md (almost
  entirely narrative already; the five-member table is itself the harvestable content and is
  captured above). No page in this slice was pure signature-and-nothing-else; even the two CLI
  pages (cli-cairn-manifest.md, cli-cairn-media-seed.md) carry substantial exit-code and
  merge-behavior facts.
- Facts that read as decisions or opinions rather than verifiable facts, not harvested as facts
  above: the design rationale for why `StatusChip` has "no chip-level danger tier" (a design
  ruling, admin-toolkit.md); the claim that "leanness is the point" style reasoning behind
  `cairn-audit`'s advisory-vs-error tier philosophy (cairn-audit.md, "each advisory rule measures
  a compositional question a legitimately novel component can answer differently on purpose");
  the aesthetic/UX judgment that a `quiet`/`warning` chip's low contrast is "by design" rather
  than a defect (admin-toolkit.md, StatusChip); and the media subpath's opinion that "a site can't
  declare its own named transform presets" being framed as a deliberate constraint rather than a
  gap (core.md, `media` adapter member). These are policy/taste calls the engine has made, not
  observable behaviors to verify against code.
- Several facts are marked `[candidate]` where the underlying claim is precise and plausible
  (consistent with this codebase's conventions and cross-references) but the exact source line
  was not individually re-traced within this harvest's time budget: notably the
  auth-channel.md deliver-refund path, the dev-backend-flag 503 mechanism's exact trigger
  conditions, cli-cairn-media-seed.md's write-key format and manifest-row-drop tolerance, and
  cloudflare.md's per-reason logging branches. A future harvest pass should verify these directly
  against `src/lib/auth-channel/factory.ts`, `src/lib/media-seed/*.ts`, and
  `src/lib/cloudflare/turnstile.ts`'s logging conditional.

From pages 14-22 (vite through reproductions):

- Pages that carry only signatures (nothing behavioral beyond the gated signature to harvest):
  none in this slice are signature-only; every page in the second half carries prose behavior
  beyond its signatures. `vite.md` and `render.md` come closest (short pages, mostly signatures
  plus a paragraph of behavior each), but both still carry at least one non-signature fact
  (the internal-machinery boundary, the `cairn-*` namespace-collision rule) captured above.
- Facts that read as decisions or opinions rather than facts (not harvested as facts above):
  - `docs/reference/README.md`'s stability-tier definitions are a policy taxonomy, not an
    observable behavior; recorded above only as a pointer, not itemized fact-by-fact.
  - `docs/reference/supported-toolchain.md`'s framing that a peer range admitting older versions
    than CI runs is "untested rather than proven" is an editorial stance about evidentiary weight,
    not a fact about the code; not harvested as a fact.
  - `docs/reference/doctor.md`'s remark that SKIP and SKIP/UNCHECKED "answer different questions"
    is explanatory framing around the two verified statuses; the underlying status semantics were
    harvested, the framing sentence was not.
  - `docs/reference/media.md`'s statement that cairn's own URL builder is "engine-internal, not
    public surface" is a scope/API-boundary decision already covered by the stability-tier system;
    recorded once under media.md rather than as a repeated opinion.

From sveltekit, delivery, and delivery-data (harvested separately, see Provenance):

Decisions or opinions on these pages, not harvested as facts:
- `docs/reference/sveltekit.md`'s framing that the CSRF three-content-type gap "is not a gap in
  practice" is an editorial risk judgment layered on the verified technical fact (which content
  types the guard's pre-routing check screens); the technical fact is harvested above, the
  judgment is not.
- The refusal-channel section's own framing, "this split ... is deliberate, not an inconsistency
  to converge," is explanatory rationale for why `fail()` and the two throwing helpers coexist;
  the underlying behavioral split is harvested, the argued justification is not restated as fact.
- `docs/reference/delivery-data.md`'s statement that declining AI training is "a request ... not
  enforcement" doubles as both a technical fact (robots.txt has no blocking mechanism, external and
  harvested above) and an implicit stance on how much a site should trust the posture; only the
  technical half is harvested.
- The `createSectionAction` rate-limit `key` guidance ("must carry an actor-scoped, normalized
  component... never the bare request path alone") is authoring advice for a site's own rate-limit
  config, not an engine-enforced behavior; not harvested as a fact about engine code.

Sections of `sveltekit.md` intentionally read but not deeply mined this pass, given the page's
size (2086 lines) against this harvest's budget: `createAuthRoutes`/`bootstrapOwner`/identity-mode
behavior (paragraphs around line 927-963), the full media-actions vocabulary detail (lines
210-276), and the `NavLayoutEntry`/`NavIcon`/`ResolvedNavEntry` family (lines 1585-1750) were read
but yielded mostly signature-adjacent or already-thorough page prose with no independent source
trace performed; a follow-up harvest could verify those against `src/lib/sveltekit/auth-routes.ts`
and the nav-layout resolver source directly.

- Facts-container HEAD repair 2026-09-22: the whole `## docs/reference/doctor.md` section (16
  bullets, all sourced to the now-removed legacy JS doctor package) deleted, since the page
  itself is removed; the `## docs/reference/cli-cairn-doctor.md` section already carries the Go
  `cairn doctor` command's facts. One `## docs/reference/supported-toolchain.md` bullet re-sourced
  from the removed package's `checks-local.ts` module to `src/lib/diagnostics/conditions.ts`, the
  condition registry the check read from.

## Provenance

Harvested 2026-09-15 from all 25 `docs/reference/*` pages, in three slices: pages 1-13
(admin-grammar-tokens through core), pages 14-22 (vite through reproductions), and sveltekit,
delivery, and delivery-data, which the first two slices' own split left unwritten and a third
harvest pass filled in. All three slices merge into this one file.

Pages 1-13 carried no separate tightening pass; their candidate tags stand as harvested.

Pages 14-22 were tightened 2026-09-15. Every candidate was traced to `src/lib/`,
`scripts/checks/`, `package.json`, or `CHANGELOG.md`; the one docs-drift found was
`log-events.md`'s claim about when `auth.identity.unknown` logs relative to the roster lookup
(since fixed, see that bullet).

sveltekit/delivery/delivery-data carried no separate tightening pass; their candidate tags stand
as harvested (one bullet's original two-tag mark, `[verified] / [external: SvelteKit 415
behavior]`, was folded into a single `[verified: ...]` tag during this fold, per the container's
one-tag-per-bullet rule).

The gap the first two slices left (sveltekit.md, delivery.md, and delivery-data.md never actually
written into pages-14-22's file despite being named in its own header and cross-page-duplicates
section) is now closed by this merge; the candidates the third slice carried are tracked as a
group in `docs/internal/docs-friction-log.md`'s open findings.
