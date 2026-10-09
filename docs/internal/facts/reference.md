# Facts: reference arm

Harvested 2026-09-15 from docs/reference/* (behaviors beyond the gated signatures, which `check:reference`/`check:reference:signatures` already gate). Agent-facing; never shipped; not register-graded. Every fact carries a source.

## docs/reference/admin.md

- `f:qmz20x` The 13 retired `register*` props on `MarkdownEditor` (11 per-capability callbacks plus the two
  object grants `registerTidy`/`registerImagePlaceholders`) all collapsed into one
  `registerEditor` callback delivering an `EditorApi` object once on mount and `null` once on
  destroy. Source: `src/lib/admin/MarkdownEditor.svelte:29,87-93` (`EditorApi` type,
  `registerEditor` prop doc), `:956-972` (mount: `registerEditor?.({...})`), `:987` (destroy:
  `registerEditor?.(null)`); a grep of the file for `registerFocusEditor`, `registerImagePlaceholders`,
  `registerGetSelection`, `registerGetSelectionRange`, `registerTidy`, `registerUndo`, and
  `registerFormat` finds none of them. [verified]
- `f:dr2k4a` `EditorApi.insert` is block insertion: it pads the block by exactly one blank line on each side that
  touches non-blank text, collapsing any blank lines already adjacent to the caret so they never
  double up; nothing is added at a document's start or end, though a document that ended with a
  newline keeps one. The indentation of a line that holds content (an indented code line, a nested
  list item) is never stripped, even when the caret sits inside it. The mounted CodeMirror path
  dispatches one change over only the whitespace the padding strips, isolated as its own history
  step, so a fold or an upload placeholder elsewhere in the document is left alone; the pre-mount
  textarea fallback calls `padInsertedBlock` and sets the whole value. Source:
  `src/lib/admin/insert-padding.ts#paddedInsertSpan`, `src/lib/admin/insert-padding.ts#padInsertedBlock`,
  `src/lib/admin/MarkdownEditor.svelte:1145-1159` (`insertAtCursor` on both paths). [verified]
- `f:9xm710` The admin barrel is the `./admin` subpath and its built files sit under `dist/admin/`, with the compiled
  sheet at `dist/admin/cairn-admin.css`; the `./components` export and the `dist/components/` path
  no longer exist, and `package.json` carries no `./components` key. The source folder is
  `src/lib/admin/`, and `docs/reference/admin.md` replaced `components.md`. A consumer changes
  every `@glw907/cairn-cms/components` import to `/admin` and any config or script path from
  `dist/components/` to `dist/admin/`. Source: `package.json:109-113` (the `./admin` export),
  `src/lib/audit/config.ts#DEFAULT_SHEET_CANDIDATES` (the sheet path), `src/tests/unit/admin-barrel-prune.test.ts`
  (the assertion that `./components` is gone). [verified]
- `f:mkx75z` `CsrfField` explicitly sets the hidden input's `defaultValue` DOM property alongside `value`, a
  deliberate hardening so the token survives `use:enhance`'s native form reset after a successful
  submit. Source: `src/lib/admin/CsrfField.svelte:7,24`. [verified]
- `f:iu46pv` `CairnAdminShell`'s sidebar breakpoint logic uses `min-width: 1024px` (`lg`) and `min-width:
  1280px` (`xl`) media queries; a desk (document-editor) route persists the sidebar at `xl`,
  recedes to an overlay through the `lg`-`xl` band, and both route kinds use the overlay drawer
  below `lg`. Source: `src/lib/admin/CairnAdminShell.svelte:241-242,638,649,669-693`.
  [verified]
- `f:9ntlzw` `EditPage`'s preview-device choice persists per browser under the localStorage key
  `cairn-editor-preview-device`. Source: `src/lib/admin/EditPage.svelte:381,384-389`
  (`deviceStorageKey = 'cairn-editor-preview-device'`; `localStorage.getItem`/`.setItem`).
  [verified]

## docs/reference/admin-grammar-tokens.md

- `f:lmcaon` The admin declares 18 `--cairn-type-*`/`--cairn-gap-*` grammar tokens plus 11 named role
  utilities (`type-*`, `gap-*`), outside the light/dark theme blocks, in `cairn-admin.css`.
  Source: `src/lib/admin/cairn-admin.css:56-76`. [verified]
- `f:rjcxh5` Exact token values match the page's table verbatim (title 1.5rem/2rem leading, heading
  1.125rem/1.75rem, subtitle 0.9375rem/1.1875rem, body 0.875rem/1.25rem, meta 0.8125rem/1.0625rem,
  label 0.6875rem/0.875rem, chip 0.625rem/0.8125rem; gap-label 0.25rem, gap-control 0.5rem,
  gap-group 1rem, gap-section 1.5rem). Source: `src/lib/admin/cairn-admin.css:56-76`.
  [verified]
- `f:cuio64` `--cairn-warning-ink` and `--color-positive-ink` are distinct per theme (light:
  `oklch(50% 0.13 70)` / `oklch(48% 0.12 150)`; dark: `oklch(80% 0.14 70)` / `oklch(78% 0.12 150)`),
  confirming the page's claim that the fill tone (`--color-warning`) measures far lower contrast
  (~2.2:1) than the dedicated text inks. Source: `src/lib/admin/cairn-admin.css:156,161,326,330`.
  [verified]
- `f:3ncib5` The three hand-composed chip classes (`cairn-chip-quiet`, `cairn-chip-warning`,
  `cairn-chip-outline`) each pin `font-weight: 400` unlayered, so they outrank a
  `font-semibold`/`font-medium` Tailwind utility on the same element. Source:
  `src/lib/admin/cairn-admin.css:920-997` (rules "PINNED unlayered rule 6/7/8 of 14").
  [verified]
- `f:6isecz` Exactly five call sites carry a ratified `type-scale` exemption directive: the wordmark at three
  sites (ConfirmPage, CairnAdminShell, LoginPage) plus two in EditPage (document title, prose
  canvas), matching the page's "five ratified exceptions" claim even though its own table lists
  only three named rows (the wordmark row covers three sites). Source: `grep -rn
  "cairn-audit-disable-next-line type-scale" src/lib/admin/*.svelte` (5 hits: ConfirmPage.svelte,
  CairnAdminShell.svelte, LoginPage.svelte, EditPage.svelte x2). [verified]

## docs/reference/admin-routes.md

- `f:29mwht` `createCairnAdmin`'s load dispatch parses `event.url.pathname` directly, never the SvelteKit
  rest param, specifically so an encoded path segment cannot desync the dispatch from the actual
  request. Source: `src/lib/sveltekit/admin-dispatch.ts:36` (doc comment), `src/lib/sveltekit/cairn-admin.ts:149,231`.
  [verified]
- `f:yixepm` The none-capability landing view is literally named `'welcome'` in the discriminated `AdminData`
  union, and `indexLoad` returns `{ view: 'welcome', page: { displayName, siteName } }` for that
  case. Source: `src/lib/sveltekit/content-routes-shell.ts:301-315`. [verified]
- `f:po1p8w` The dev-only chrome-boundary guard (an ancestor walk logging one `console.error` when a
  width-constraining ancestor sits between the admin root and `<body>`) is implemented in
  `src/lib/admin/chrome-guard.ts`, described in its own header as compiling out of
  production. Source: `src/lib/admin/chrome-guard.ts:1-54`. [verified]
- `f:1mgfhj` The ten media-janitorial actions run at runtime on `createCairnAdmin`'s returned object but are
  absent from the type-level `CairnAdminRoutes` contract; recovering them for a typed caller needs
  a spread (`{ ...admin.actions }`) or a cast. `mediaUpload` is deliberately excluded from the
  narrowed set: it stays in the declared type, wrapping the same `uploadAction` the kept `upload`
  action wraps, gated to the media view instead of the edit view. Source:
  `src/lib/sveltekit/cairn-admin.ts` (`CairnAdminRoutes` interface and the `actions` object).
  [verified]
- `f:6toyed` `previewMint` and `previewRevoke` are `edit`-gated actions present at runtime and kept
  (not narrowed away) in the declared `CairnAdminRoutes` type, alongside the other named actions;
  sveltekit.md's own `actions` table omitted both rows until this fact prompted their addition.
  Source: `src/lib/sveltekit/cairn-admin.ts:301-304,399-400`. [verified]
- `f:hjhp4w` Logout and publish-all always post to the fixed absolute `/admin?/logout` and
  `/admin?/publishAll` paths, both of which parse to the `index` view, never to the editor's
  current page URL. Source: `src/lib/admin/CairnAdminShell.svelte:12,1160`;
  `src/lib/sveltekit/cairn-admin.ts:260-262,279,340` (`authedViews`/`anyView`). [verified]
- `f:p3vmug` The showcase's admin route files differ from `admin-routes.md`'s "reproduced from the
  showcase" snippets in two ways: they import the composer through the showcase-internal
  `#chassis` subpath import (not `$lib`), and `+layout.svelte` imports a compiled `.cairn/admin.css`,
  present in both the showcase and the `create-cairn-site` scaffold template
  (`templates/waymark/src/routes/admin/+layout.svelte`). Source:
  `examples/showcase/src/routes/admin/+layout.server.ts`,
  `examples/showcase/src/routes/admin/+layout.svelte`,
  `templates/waymark/src/routes/admin/+layout.svelte`. [candidate: unclear whether the
  `.cairn/admin.css` import is required for the base single-mount admin to render, or only for a
  site that adds its own Tailwind-styled admin screens per the style-sheet seam ruling;
  `docs/extend/build-a-site-by-hand.md`'s hand-build walkthrough also omits it]

## docs/reference/admin-toolkit.md

- `f:54xd6u` The admin toolkit's components render inside the admin shell only: `CairnAdminShell.svelte` imports
  `cairn-admin.css`, which compiles the daisyUI classes the toolkit assembles, and the admin theme wrapper
  scopes the tokens they read. A toolkit component mounted outside `/admin` renders without that sheet, so a
  member area or any other surface outside the admin is the site's own, styled by the site; the engine does
  not ship the admin sheet for use outside `/admin`. Source: `src/lib/admin/CairnAdminShell.svelte:43`,
  `docs/reference/admin-toolkit.md` (the shell-only paragraph). [verified]
- `f:0vgrcx` `TextInput` and `SelectInput` shipped at `0.94.0` (renamed from admin-fields'
  `TextField`/`SelectField`); `FieldRow` was added later, at `0.95.0` (commit `68d622a1`,
  2026-08-07), not alongside the 0.94.0 merge. All three retired together in the retires pass,
  batch 1a. Source: `CHANGELOG.md:4404-4413` (0.94.0 merge entry, no FieldRow), `CHANGELOG.md:1836-1839`
  (retirement entry), commit `68d622a1` (FieldRow's introducing commit, first tagged at
  `v0.95.0-rc.1`). [verified]
- `f:i450hg` `ListToolbarFilter.display` is a three-way union, `'select' | 'segmented' | 'menu'`, not
  two-way: the `'menu'` display is a fully shipped facet (an in-control applied-value trigger
  folding onto `ToolbarDisclosure`, with its own ARIA-menu panel). Source:
  `src/lib/admin-toolkit/list-toolbar.ts:63`, `src/lib/admin-toolkit/ListToolbar.svelte:300-359`.
  [verified]
- `f:itlble` `formatCivilDate`/`formatTimestamp` both default `fallback` to `''`, `locale` to `'en-US'`;
  `formatTimestamp` additionally defaults `timeZone` to `'UTC'` (deliberately not a site's own
  zone). Source: `src/lib/admin-toolkit/format.ts:38-100`. [verified]
- `f:7obz98` `formatTimestamp` accepts exactly two shapes that name their own zone (full/seconds-less ISO
  8601 with `Z`/`z` or colon/colonless `+hh:mm` offset) plus the SQLite
  `datetime('now')`-shaped UTC string (no `T`, no offset), assumed UTC; every other shape,
  including a zone-less near-ISO string, returns unchanged rather than being parsed with
  `new Date()`, specifically to prevent SSR/hydration text mismatches from a runtime-local-zone
  parse. Source: `src/lib/admin-toolkit/format.ts:60-101` (regexes `SQLITE_DATETIME`,
  `ISO_WITH_ZONE`, function `toCanonicalIso`). [verified]
- `f:fjq594` `ExpandableRow`'s trigger button renders at exactly 24x24 CSS px at the 390px viewport against
  the packaged stylesheet, matching WCAG 2.5.8's AA floor (not 2.5.5's 44x44). Source:
  `src/lib/admin-toolkit/ExpandableRow.svelte:30-32` (doc comment referencing the same floor
  `touch-targets` enforces). [verified]
- `f:0tr2zx` `MediaPicker`'s thumbnail base falls back to `/media` (via `DEFAULT_MEDIA_BASE`) when mounted
  with no `MEDIA_BASE_CONTEXT_KEY` provider in context; `CairnAdminShell` is the provider that
  supplies the site's real `assets.publicBase`. Source: `src/lib/admin/media-base-context.ts:5`,
  `src/lib/admin/CairnAdminShell.svelte:76`, `src/lib/admin/MediaPicker.svelte:65`.
  [verified]
- `f:lmgnn2` `AdminTable`'s `emptyColspan` defaults to `100`, relying on HTML's own `colspan` clamp to the
  real column count. Source: `src/lib/admin-toolkit/AdminTable.svelte:96`. [verified]
- `f:8xmyft` `AdminTable`'s `selection` prop takes a `ReadonlySet<string>` and an `onchange` receiving a
  `ReadonlySet<string>`; the component never mutates the set it is given. Its header checkbox
  carries `aria-disabled="true"` while rows exist and nothing is selected, and its `aria-label`
  reads "Clear selection" once something is. The batch region renders whenever `selection` is set,
  as a `role="group"` named "Batch actions" carrying a visually hidden `role="status"` count, and
  `clear` returns focus to the header checkbox. Source:
  `src/lib/admin-toolkit/AdminTable.svelte`. [verified]
- `f:hdebf7` `StatusChip`'s `outline` register draws its border as `color-mix(in oklab, currentColor 55%, transparent)`, a hairline its own doc comment records as clearing 3:1 in both admin themes; inside the engine's own admin the `StatusChip` component itself has one outline call site, EditPage's Hidden chip (component-rendered, not hand-composed). Three more surfaces hand-compose the same `cairn-chip-outline` class directly rather than through the component: ManageEditors, ReferenceField, and MediaCaptureCard. Together that is four outline call sites in the engine, not through the component alone; a consumer placing an `outline` chip inside its own muted-text ancestor should re-measure. Source: `src/lib/admin-toolkit/StatusChip.svelte:22-24,129`, `src/lib/admin/EditPage.svelte:1456`, `src/lib/admin/ManageEditors.svelte`, `src/lib/admin/ReferenceField.svelte`, `src/lib/admin/MediaCaptureCard.svelte` (grep `cairn-chip-outline`). [verified]
- `f:ro7w36` `Tooltip` (added `0.97.0`) reads the triggering `PointerEvent`'s own `pointerType` to detect a
  coarse-pointer tap, never `matchMedia`, since a hybrid device can carry both a mouse and a
  touchscreen at once; an empty `text` prop opts the whole component out (no `aria-describedby`,
  no bubble, every hover/focus/tap mechanic a no-op). Its bubble is a manual popover placed by CSS
  anchor positioning off an `anchor-name` written on the trigger, so the top layer keeps a
  transformed, scaled, or `overflow: hidden` ancestor (an open daisyUI modal's box) from displacing
  or clipping it. That write appends to any inline `anchor-name` the trigger already carries, since
  `anchor-name` is a comma list and three swept admin triggers anchor a popover menu of their own;
  replacing it would drop those menus to the UA's centered popover fallback. Source:
  `src/lib/admin-toolkit/Tooltip.svelte`. [verified]
- `f:nj98xb` `Tooltip` sets no `aria-describedby` when its `text` already equals the trigger's accessible name
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

- `f:cz49sv` All five `App.Locals` augmentation members (`cairnEditor`, `cairnBackend`, `cairnAuditSink`,
  `cairnAccess`, `cairnIdentity`) share the flat `cairn` prefix rather than a nested namespace, a
  deliberate choice so a grep for one field name finds every read across repos. Source:
  `src/lib/ambient.ts:8-19` (module doc comment), same rationale restated inline. [verified]
- `f:v8nusa` The `/ambient` module's compiled JS is empty (type-only, side-effect import), so the import is
  free at runtime. Source: `src/lib/ambient.ts` ends with `export {}` and carries no runtime
  logic beyond the `declare global` block. [verified: beyond what check:reference already gates,
  see Harvest record]

## docs/reference/auth-channel.md

- `f:u3qhel` All `limits` defaults and clamps match source exactly: `code.length` 8 (8-10),
  `code.ttlMs` 600000/10min (max 900000/15min), `code.attemptCap` 5 (max 10),
  `throttle.cooldownMs` 60000/60s (min 30000/30s), `throttle.requesterCap` 20 (5-100),
  `throttle.identityCeiling` 30 (min 10), `throttle.escalationThreshold` 20 (min 10),
  `throttle.liveRowCap` 5 (max 20), `session.ttlMs` 2592000000/30days (max 31536000000/1yr).
  Source: `src/lib/auth-channel/factory.ts:326-482`. [verified]
- `f:ditn3e` `AuthChannelConfig.resolveDb` returns `ChannelDatabaseLike | undefined`, the structural
  subset of D1 the channel store calls (`prepare(...).bind(...).first()/run()`, `withSession('first-primary')`,
  and a session's `prepare` and `batch`); a real `D1Database` and `createChannelDb()`'s result both
  satisfy it with no cast, and `AuthChannel.revokeSessions` takes the same type. Source:
  `src/lib/auth-channel/store.ts#ChannelDatabaseLike`, `src/lib/auth-channel/factory.ts#AuthChannelConfig.resolveDb`.
  [verified]
- `f:vh76wt` A non-positive `limits` override always throws even where the table states only a ceiling
  (prevents a 0 or negative clamp value from silently passing). Source:
  `src/lib/auth-channel/factory.ts:434-457` (`resolveLimit`). [verified]
- `f:mk0zd8` `deliver`'s throw path is fully compensating: the pending code row is deleted and the
  requester's send charge is refunded on any thrown error, so a delivery-provider outage costs a
  member only a retry, never a lost budget slot. Source: `src/lib/auth-channel/factory.ts:271-274`
  (`deliver`'s doc comment: "A throw is scrubbed, logged, deletes the pending row, and refunds the
  send charge"), `:880-887` (the `deliverPromise` catch calls `consumeCode(...)` then
  `refund(session, fullRequesterBucket, REQUESTER_SEND_SCOPE, now)`). [verified]
- `f:0hkc8e` `CAIRN_DEV_BACKEND` set on a deployed runtime makes all three actions (`request`, `confirm`,
  `logout`) throw a SvelteKit 503 `HttpError` before touching any row, rather than returning a
  typed outcome, because no result union carries a wire code for a polluted environment.
  "Deployed" is determined by `PUBLIC_ORIGIN` first, falling back to request hostname only when
  unset. Source: `src/lib/auth-channel/factory.ts:118-127` (`assertNoDevBackendLeak`: `throw
  error(503, CAIRN_DEV_BACKEND_MESSAGE)`, called from `request`/`confirm`/`logout` at
  `:682,908,1071`), `src/lib/dev-flag.ts:83-93` (`isDeployedHost`: `PUBLIC_ORIGIN` consulted
  first, falls back to `event.url.hostname` when unset or unparseable). [verified]
- `f:lccuuc` The channel's own D1 schema ships as `migrations-channel/0000_channel.sql` (tables
  `cairn_channel_meta`, `cairn_channel_code`, `cairn_channel_session`, `cairn_channel_budget`) and
  must never share a `migrations_dir` with the engine's own `AUTH_DB` migrations. The
  per-deployment identity salt is provisioned lazily via `INSERT OR IGNORE` of 32 random bytes
  under `identity_salt`, deliberately absent from the committed migration file since a migration
  published on npm can't carry a per-deployment secret. Source: `migrations-channel/0000_channel.sql:19-46`
  (the four `CREATE TABLE` statements), `src/lib/auth-channel/store.ts:60-84` (`provisionSalt`:
  `INSERT OR IGNORE INTO cairn_channel_meta`, `randomHex(32)`), `examples/showcase/wrangler.jsonc:26-53`
  (each D1 binding declares its own `migrations_dir`, comment states why). [verified]

## docs/reference/auth-crypto.md

- `f:exqnwj` The subpath enforces server-only isolation via export conditions: a named import from the
  browser stub fails at build time (no such export), while a bare side-effect import passes the
  build and throws only at runtime when executed in a browser. Source: `package.json:170-181`
  (`./auth-crypto` and `./cloudflare` export conditions each declare `worker`/`browser`/`default`),
  `src/lib/auth-crypto/browser.ts:1-4`, `src/lib/cloudflare/browser.ts:1-4` (both files are a bare
  module-level `throw new Error(...)` with no named export). [verified]
- `f:m41mez` `tokensMatch('', '')` is deliberately `false`, so an unset expected value can never match an
  unset submitted one. Source: `src/lib/auth/crypto.ts:118` (function `tokensMatch`), consistent
  with the stated four properties (length leaks, empty-never-matches, CSPRNG-only intent,
  UTF-8-byte comparison). [verified]
- `f:bz7q3b` `buildCookieName` throws when `base` already carries a `__Host-`/`__Secure-` prefix (prevents
  double-prefixing, which the browser would silently reject as a cookie that never sets), and a
  `cairn_`-prefixed base is accepted but named as the engine's reserved namespace (risk of
  collision, not a hard block for a site's own auth-crypto usage, though `createAuthChannel`'s
  `cookie.name` throws at construction on a `cairn_` base specifically). Source:
  `src/lib/auth/crypto.ts:48-60`; the stricter throw-on-`cairn_` behavior is `createAuthChannel`'s
  own construction-time check (auth-channel.md, "A `cairn_`-prefixed base throws at
  construction"), distinct from this bare primitive's more permissive behavior. [verified]
- `f:9378z2` The engine's own two cookies (session, CSRF) both derive `secure` through one shared internal
  function (`csrfSecure`), so they can no longer resolve different `secure` values on the same
  request. This implies an earlier state where they could diverge. Source:
  `src/lib/auth/crypto.ts:22-26` (doc comment: "Both names now also share their `secure` INPUT:
  `csrf.ts`'s `csrfSecure`..."), `src/lib/sveltekit/csrf.ts:76,132,174,195` (`csrfSecure`,
  `csrfCookieName(csrfSecure(...))`), `src/lib/sveltekit/guard.ts:283,362`
  (`sessionCookieName(csrfSecure(...))`). [verified: the shared-function claim is confirmed; the
  earlier-divergence history is not independently re-traced to a changelog entry]

## docs/reference/auth-store.md

- `f:7m7txx` Every function trims and lowercases an email argument before matching or writing
  (`email.trim().toLowerCase()`), so `Backup@Site.com` and `backup@site.com` collide as the same
  row. Source: `src/lib/auth/store.ts:37`. [verified]
- `f:8y5fud` `deleteEditor`/`setEditorRole` fold the last-owner guard into the same atomic write (refusal
  predicate inside the same `WHERE`/statement as the mutation), so two concurrent calls against
  the last-owner row cannot both succeed. Source: `src/lib/auth/store.ts:383-425,496-533`
  (functions `deleteEditor`, `removeOwnerIfNotLast`, `setEditorRole`, `demoteOwnerIfNotLast`
  present and structured as described). [verified: structurally; exact WHERE-clause atomicity not
  independently re-derived from SQL text in this harvest]
- `f:y5qp8w` `deleteEditor`/`setEditorRole` distinguish `'not-found'` from `'last-owner'` (their `WHERE`
  matches any row), while `removeOwnerIfNotLast`/`demoteOwnerIfNotLast` report `'not-eligible'`
  for both "no such row" and "present but not owner-capability" (their `WHERE` matches only
  owner-capability rows, so the two cases can't be told apart). Source: `src/lib/auth/store.ts`
  function bodies at lines noted above; outcome unions confirmed present. [verified]
- `f:lml542` `deleteEditor` and `removeOwnerIfNotLast` cascade past session and magic-token rows to also
  delete every `preview_tokens` row the removed editor minted (a separate statement outside the
  atomic batch, swallowing only a "no such table" fault for a site with the preview migration
  unapplied). Source: `src/lib/auth/store.ts#deleteEditorPreviewTokens`, `src/lib/auth/store.ts:430-434`
  (`deleteEditor` call), `src/lib/auth/store.ts:469-473` (`removeOwnerIfNotLast` call). [verified]
- `f:pf69s2` The store's unexported auth-flow set (engine-internal to the magic-link guard, not proven
  consumer surface) is `findEditor`, `issueToken`, `recentlyIssued`, `consumeToken`, `rebindToken`,
  `createSession`, `resolveSession`, `deleteSession`; `insertOwnerIfEmpty` is separately demoted (a
  site seeds its first owner via `bootstrapOwner` instead, per `f:f2vudv`). Source:
  `src/lib/auth-store/index.ts:1-23`, `src/lib/auth/store.ts` (all named exports),
  `src/lib/sveltekit/auth-routes.ts:18-25`. [verified]

## docs/reference/cairn-audit.md

- `f:4g122y` `motion-property` splits a `transition` value's entries at the top level only, so a comma inside
  `var()` or `cubic-bezier()` reads as a function argument, not as another transitioned property.
  Source: `src/lib/audit/rules/static/motion-property.ts` (`topLevelEntries`). [verified]

- `f:mzqvrt` Exactly 28 rules are registered: 12 static (all error tier) plus 16 rendered (7 error-tier, 9
  advisory-tier). Source: `grep -c "id: '" src/lib/audit/rules/static/*.ts` = 12,
  `src/lib/audit/rules/rendered/*.ts` = 16; tier counts confirmed by grepping `tier: 'error'`
  (focus-renders, panel-width, one-filled-action, interactive-contrast, touch-targets, list-role,
  viewport-overflow = 7) vs `tier: 'advisory'` (container-inset-asymmetry, form-font-parity,
  field-edge-alignment, border-contrast, norms-bands, screen-anatomy, relational-spacing,
  weight-budget, chip-ground-collision = 9). [rejected: rule count grew after this fact was filed;
  the audit now registers 34 rules (17 static, 17 rendered), see `f:hqhp14`]
- `f:hqhp14` Exactly 34 rules are registered: 17 static (15 error tier, 2 advisory: `log-event-grammar`,
  `log-secret-field`) plus 17 rendered (7 error-tier, 10 advisory-tier). A literal-string grep for
  `id: '` undercounts only the rendered total by one, since `motion-reduced-delay.ts` declares
  `id: RULE_ID` rather than a literal string; the static grep already finds all 17. Count by the
  registry array or by tier grep instead. Source:
  `src/lib/audit/rules/static/index.ts` (`staticRules()`, 17-entry array), tier grep across
  `src/lib/audit/rules/static/*.ts` = 15 error / 2 advisory; `src/lib/audit/rules/rendered/index.ts`
  (`renderedRules()`, 17-entry array; header comment states the 7/10 tier split), tier grep across
  `src/lib/audit/rules/rendered/*.ts` = 7 error (focus-renders, panel-width, one-filled-action,
  interactive-contrast, touch-targets, list-role, viewport-overflow) / 10 advisory
  (container-inset-asymmetry, form-font-parity, field-edge-alignment, border-contrast, norms-bands,
  screen-anatomy, relational-spacing, weight-budget, chip-ground-collision, motion-reduced-delay).
  [rejected: rule count grew after this fact was filed; the audit now registers 35 rules (18 static, 17 rendered), see `f:yn6lst`]
- `f:3kvawo` Exit codes: 0 (clean), 1 (unsuppressed error-tier finding), 2 (run couldn't start/finish: bad
  flag, no server, no browser, redirect-trap refusal). Codes route through `process.exitCode`,
  never `process.exit`, so piped stdout flushes fully first. Source: `src/lib/audit/bin.ts:5-68`,
  `src/lib/audit/report.ts:55` (`exitCodeFor`). [verified]
- `f:djd62h` `touch-targets`'s enforced floor is `23.984375` CSS px (24px minus one Chromium LayoutUnit,
  1/64 CSS px, allowed for rect-snapping tolerance). Source:
  `src/lib/audit/rules/rendered/touch-targets.ts:81-110`. [verified]
- `f:0jarfk` `form-font-parity` is registered provisionally at advisory tier though its intended tier is
  error, pending a CI re-check confirming the rendered suite is green on the CI runner. Source:
  `src/lib/audit/rules/rendered/form-font-parity.ts:38-46` (comment: "Registered PROVISIONALLY at
  advisory. The intended tier is error..."), `:119` (`tier: 'advisory'`). [verified]
- `f:vhww6d` The `norms` subcommand reads only the manifest inside the installed package (no config, no
  built stylesheet, no browser needed), distinct from static/rendered modes which read the
  working tree. Source: `src/lib/audit/bin.ts:25-27` (comment: "The norms query answers from the
  shipped manifest, so it reads no consumer tree and needs no config, no built stylesheet, and no
  browser"), `:28-36` (`norms` calls `loadNormsManifest()`), `:62` (other modes call
  `loadConfig(process.cwd(), ...)`). [verified]

- `f:z1rbea` Exactly 38 rules are registered: 21 static (15 error tier, 6 advisory: `log-event-grammar`,
  `log-secret-field`, `radius-scale`, `public-literals`, `theme-conformance`, `theme-contrast`) plus
  17 rendered (7 error-tier, 10 advisory-tier). Count by the registry arrays or by tier grep, not by a literal-string grep, which
  undercounts the rendered total by one (`motion-reduced-delay.ts` declares `id: RULE_ID`). Source:
  `src/lib/audit/rules/static/index.ts#staticRules` (the 21-entry array),
  `src/lib/audit/rules/rendered/index.ts#renderedRules` (the 17-entry array).
  [rejected: the tier split moved when `0.98.0` promoted `log-event-grammar` and `log-secret-field`; the count stays 38, now 17 static error tier and 4 advisory, see `f:yn6lst`]
- `f:yn6lst` Exactly 38 rules are registered: 21 static (17 error tier, 4 advisory: `radius-scale`,
  `public-literals`, `theme-conformance`, `theme-contrast`) plus 17 rendered (7 error-tier,
  10 advisory-tier). `log-event-grammar`, `log-secret-field`, and the `cairn-btn-guarded`
  retirement arm of `stock-default-hazards` were promoted to error tier for the `0.98.0` window:
  each finding is `tier: 'error'`, no message names a promotion version, and the three
  `0.98.0` `*PROMOTION_VERSION` constants are deleted. The three retired-patch arms of
  `stock-default-hazards` stay advisory until `0.99.0`, as does `radius-scale`. Count by the
  registry arrays or by tier grep, not by a literal-string grep, which undercounts the rendered
  total by one (`motion-reduced-delay.ts` declares `id: RULE_ID`). Source:
  `src/lib/audit/rules/static/log-event-grammar.ts#logEventGrammar`,
  `src/lib/audit/rules/static/log-secret-field.ts#logSecretField`,
  `src/lib/audit/rules/static/stock-default-hazards.ts#stockDefaultHazards`,
  `src/lib/audit/rules/static/index.ts#staticRules` (the 21-entry array),
  `src/lib/audit/rules/rendered/index.ts#renderedRules` (the 17-entry array). [verified]
- `f:o4ctu5` `public-literals` resolves over the public scope (`publicScope: true` on the rule), as
  `theme-conformance` and `theme-contrast` also do: `.svelte` and `.css` files under `public.scope` (default
  `src/theme`, `src/chassis`, `src/routes`, `src/lib/public`, `src/lib/components`), minus
  `public.exclude` (default `src/routes/admin`, a configured list merges) and minus every admin
  root. It is advisory permanently for a consumer. The scope loads only when a selected rule sets
  `publicScope`; when it loads and matches no file the run fails naming `public.scope`, and a
  configured root the tree lacks throws while a missing default root is skipped. `public.themeRoots`
  (default `src/theme`, `src/chassis/tokens.css`) are where a custom-property definition is legal;
  `public.stylesheets` (default `src/theme/theme.css`) is the entry list `theme-conformance` and
  `theme-contrast` follow (`f:tbq6gh`, `f:lqtwdt`). The rule flags a color literal (hex, `rgb()`, `hsl()`, `hwb()`, `lab()`,
  `lch()`, `oklab()`, `oklch()`, `color()`, named colors) or an absolute font size (`px`, `pt`,
  `rem`, the `font` shorthand included) in a declaration, a `style=` value, a `style:` directive,
  or a Tailwind arbitrary value (`text-[#abc]`, `text-[14px]`); `em`, `%`, `var()` and `calc()`
  over tokens pass, and the root element's `font-size` is exempt. Nothing inside a quoted string
  or a `url()` argument is read (`content: "Issue #123"`, a quoted font-family name,
  `fill: url(#fade)`), a skip only the public scope opts into (`token-colors` still reads both,
  through `findColorLiteral` without `skipStrings`). A public `.svelte` file whose
  `<style lang="...">` block the Svelte parser rejects (Sass, Less) is parsed with that block
  blanked (`parseComponent`'s `tolerateStyleLang`, set only by `loadPublicScope`), and the rule
  raises one advisory "unparsed style block, not audited" finding at the opening tag, so the run
  and the error-tier admin rules continue; an admin-scope file still throws. Detection is the shared core
  `src/lib/audit/literals.ts`, which `token-colors` also reads while keeping its own narrower
  verdict set. The repo's own tree runs it from the showcase through
  `scripts/checks/public-scope.config.json`, which names the engine's `../../src/lib/public`,
  since the showcase's own config is emitted into every scaffolded site and a configured root the
  tree lacks throws. The two repo wrappers (`check-invisible-craft.mjs`,
  `check-admin-css-classes.mjs`) hand `runStatic` every rule except the public-scope ones.
  Source: `src/lib/audit/rules/static/public-literals.ts#publicLiterals`,
  `src/lib/audit/run.ts#loadPublicScope`, `src/lib/audit/config.ts#isPublicFile`,
  `src/lib/audit/literals.ts#findColorLiteral`, `src/lib/audit/markup.ts#parseComponent`. [verified]
- `f:tbq6gh` `theme-conformance` is a static advisory rule over the public scope (`publicScope: true`,
  `importChain: true`), built by `createThemeConformance(peers)` so a test injects the peer access.
  `runStatic` reads the `@import` chain of `public.stylesheets` once, through
  `src/lib/audit/import-chain.ts#loadImportChain`, only when a selected rule sets `importChain`, and
  hands it to those rules alone. The loader lists top-level `@import` statements through
  `sheet.ts#parseStatements` (a block-less at-rule that `parseSheet` drops at its `;`), follows
  relative paths from the importing file (an extensionless relative target such as `./tokens`
  reads `tokens.css` when that file exists and the bare path does not, as Tailwind resolves it)
  and package specifiers under the `style` export condition, then the `style` field, then the file path when the package has no `exports` field
  (never Node resolution, which sends `tailwindcss` to `dist/lib.js`). `tailwindcss` and remote URLs
  are not traversed; an import that cannot be resolved or read lands in `AuditReport.unreadImports`,
  which the report prints under "Unread imports", and never raises a finding; a target that is not
  `.css` is a finding and is never parsed. An entry the config names under `public.stylesheets`
  that the tree lacks throws naming the key (`run.ts#loadChain`, gated on
  `publicStylesheetsFromConfig`); the default entry a tree lacks is recorded as unread. The key list is the union of keys in `daisyui/theme/object`
  and the built-in names are its theme names, loaded lazily from the audited root by
  `src/lib/audit/peers.ts` (a missing `daisyui` or `tailwindcss` throws a message naming the peer and
  `npm install --save-dev <peer>`; an empty list, or one without `--color-base-100` or `--radius-box`,
  throws). A block named after a built-in theme is complete by merging; a hole in the default block
  (or the only block) reads as a runtime hole, one in a secondary block as a value the default fills.
  A `var(--x)` with no fallback resolves against declarations in the scope and the chain, the
  variables of `tailwindcss/theme.css` and the `--tw-` prefix, and the daisyUI keys only when some
  block is complete. The chassis-redeclare finding lists, per chassis file in the chain, the names
  `cairn-public.css` declares that the file sets on `:root`, `html`, `[data-theme]`, or in `@theme`
  (a class-scoped rule such as prose.css's `--flow-space` is not one). `parseSheet` now keeps the
  own declarations of a `@theme` or `@plugin` block that nests another block, since Tailwind's own
  theme file nests `@keyframes` in `@theme default`, and records each rule's enclosing style-rule
  selectors in `SheetRule.parents`, so a nested rule resolves against them. Source:
  `src/lib/audit/rules/static/theme-conformance.ts#createThemeConformance`,
  `src/lib/audit/import-chain.ts#loadImportChain`, `src/lib/audit/run.ts#loadChain`, `src/lib/audit/peers.ts#loadDaisyThemeKeys`,
  `src/lib/audit/sheet.ts#parseStatements`. [verified]
- `f:lqtwdt` `theme-contrast` is a static advisory rule over the public scope (`publicScope: true`,
  `importChain: true`), built by `createThemeContrast(peers)`. It measures, per daisyUI theme block
  in the chain, body text (`--color-base-content`) on `--color-base-100` and `--color-base-200`,
  `--color-primary` on `--color-base-100`, each role's `-content` on its fill, `--color-muted` on
  `--color-base-100` and `--color-base-200`, each `--cairn-<status>-ink` on `--color-base-100`,
  `--color-base-200`, and its callout tint (the highest-percentage
  `color-mix(in oklab, var(--color-<status>) N%, var(--color-base-100))` any chain declaration
  holds), and each `--cairn-code-*` role (ink, keyword, string, function, number, comment, punct)
  on `--cairn-code-bg`, at 4.5:1; and the focus-ring color `--color-primary` on `--color-base-100`
  and `--color-base-200` at 3:1 as a non-text pair (the ground label reads "as a focus ring"). Both
  gamuts, sRGB and display-p3, after clamping in OKLCH. The showcase's tints give 33 pairs per
  scheme (24 before the seven code roles and two focus-ring grounds). A status `color-mix()` over
  `--color-base-100` in another form (swapped operands, `in srgb`), or any status mix painted as a
  `background`, keeps that status's tint pair and marks it unmeasured, so the pair count never
  shrinks. A scheme is one named block (an unnamed block takes daisyUI's own default name,
  `custom-theme`): measured with `data-theme="<name>"`, the default block also with no
  `data-theme` on a light OS, and the `prefersdark` block (or the default block when none is) also
  with no `data-theme` on a dark OS. `src/lib/audit/schemes.ts#readThemeCascade` compiles each
  block the way daisyUI's plugin does (layer `base`; `[data-theme]` everywhere, `:where(<root>)`
  for the default, `<root>:not([data-theme])` under the dark media query for `prefersdark`, where
  `<root>` is the block's `root` option, `:root` by default); a `root` that is not the root element
  in every state (`.dark`) makes every state the block reaches unmeasured instead of dropping it.
  It completes a built-in-named block from `daisyui/theme/object`'s values, reads `@theme` as
  `:root` in layer `theme`, resolves a nested rule against `SheetRule.parents` (`&` as `:is()`
  over the parent, a group nested in a style rule applying to its selector), and ranks every
  root-matching custom property by importance, layer, specificity, and order. A media query
  applies when its only features are `prefers-color-scheme` tests beside an optional `screen` or
  `all` type; `print` and a `@supports not (...)` never apply; a positive `@supports` applies. A
  root declaration under any other condition, or on a selector whose subject compound names the
  root with a test the model does not read (`:root.dark`), is recorded by `unmodeledIn`, and every
  pair whose `var()` closure reads it is unmeasured, never passed. The resolver
  (`src/lib/audit/contrast.ts#resolveColor`) follows `var()` chains to a literal culori parses and
  evaluates only `color-mix(in oklab|oklch, A p%, B)` with exactly one percentage, through
  culori's `interpolateWithPremultipliedAlpha`; every other form resolves to a reason, and the rule
  reports it as "unmeasured", never a pass. One finding per failing foreground and floor per
  block, one per unmeasured reason per block, and one when the chain holds no block; each points
  at the block. It needs `daisyui` beside the site (`loadDaisyThemeKeys`, named error when
  missing). culori is a runtime dependency, and `daisyui` and `tailwindcss` are optional peers.
  Source: `src/lib/audit/rules/static/theme-contrast.ts#createThemeContrast`,
  `src/lib/audit/rules/static/theme-contrast.ts#contrastPairs`,
  `src/lib/audit/rules/static/theme-contrast.ts#calloutTints`,
  `src/lib/audit/schemes.ts#readThemeCascade`, `src/lib/audit/contrast.ts#resolveColor`,
  `package.json#peerDependenciesMeta`. [verified]
- `f:eri2g3` `resolveConfig` normalizes every configured path (posix `normalize`, then no trailing
  `/` and no leading `./`), so `./src`, `src/`, and `src//x` compare equal to `src` and `src/x`,
  no file lands in both scopes through a spelling, and a reported path carries no `./` or `//`; a
  path above the root keeps its `../`. When a configured `public.scope` names a default admin
  root, that root leaves the admin defaults unless a public exclusion covers it, so
  `public.scope: ["src/theme", "src/routes/admin", "src/routes/blog"]` keeps `src/routes/admin`
  under `token-colors`. A configured public root that is, or lies under, a `public.exclude` path
  throws naming both, unless an admin root (default or configured) reads it. Source:
  `src/lib/audit/config.ts#resolveConfig`, `src/lib/audit/config.ts#normalizePath`,
  `src/tests/unit/audit/public-scope.test.ts` (the "a config that names paths loosely" describe). [verified]
- `f:0nfxs2` `runStatic` reads the built admin stylesheet (`sheetPaths`) only when a selected rule is not a public-scope rule: a selection made only of `publicScope` rules (`public-literals`, `theme-conformance`, `theme-contrast`) runs with no built sheet and hands those rules an empty compiled sheet, which none of them reads (they parse their own files). The same condition skips the "static scan matched no files" error, since those rules never read the static scope. Any other selection, the full registry included, still throws "the built admin stylesheet is missing" when a named sheet source is absent. Before this, a public-only `--rule` run exited 2 on a tree with no built package. Source: `src/lib/audit/run.ts#runStatic`, `src/tests/unit/audit/public-scope.test.ts` (the "built admin stylesheet" describe). [verified]
- `f:eqsngu` `DEFAULT_STATIC_SCOPE` and `DEFAULT_ADMIN_SCOPE` are both `src/routes/admin`, `src/lib/admin`,
  `src/lib/admin-toolkit`; `src/lib/components` is no longer a default root. They stay two constants
  and two config keys (`static.scope`, `static.adminScope`) so a site can narrow one without the
  other. `DEFAULT_ADMIN_SCOPE` gained `src/lib/admin`, so the three `adminOnly` motion rules
  (`motion-property`, `motion-vocabulary`, `motion-hover-gate`) now read it. Restore form: a
  configured `static.scope` replaces the defaults (`asPathList` returns a configured list, normalized, never merged),
  and a configured root the tree lacks fails the run (`readScope` throws when `fromConfig` and the
  path is missing), so a site keeping custom components in `src/lib/components` lists the default
  roots it has plus `src/lib/components`; naming `src/lib/components` alone drops
  `src/routes/admin` from every static rule. A root a site names under `static.scope` or
  `static.adminScope` is an admin root: `resolveConfig` drops it from the public defaults, and
  `isPublicFile` never claims a file under any admin root (default or configured) or a file named
  in `static.cssFiles`, so no file answers to both grammars. The same holds the other way: an
  admin default a site names under `public.scope` leaves the admin defaults unless the admin
  lists are configured, and a wide `public.scope` (`src`) or a custom `public.exclude` never moves
  an admin file to the advisory public rule. The narrowing also removes a site's own
  `src/lib/components` from `stripe-trim-parity` and `unlayered-font-clobber`, which stay
  admin-only by owner ruling (Geoff, 2026-09-27). Source:
  `src/lib/audit/config.ts#DEFAULT_STATIC_SCOPE`, `src/lib/audit/config.ts#DEFAULT_ADMIN_SCOPE`,
  `src/lib/audit/config.ts:288-289` (`asPathList` calls), `src/lib/audit/run.ts:57`
  (`readScope`'s missing-root throw), `src/lib/audit/config.ts#isPublicFile`. [verified]
- `f:h4ztuy` `radius-scale` is a static rule at advisory tier that reads class tokens (through `utilityBase()`,
  so `md:rounded-lg` is caught) and raises one finding per offending token: a bare `rounded`, the
  fixed sizes `xs` through `4xl`, an arbitrary radius in either of Tailwind v4's forms
  (`rounded-[...]` and the `rounded-(--x)` shorthand), and each side or corner form of those. It
  passes `rounded-selector`, `rounded-field`, `rounded-box` and their side forms, `rounded-full`,
  `rounded-none`, and side zeros, except that `rounded-full` on an element carrying `badge` is
  flagged. The message names the replacement role class (`badge` to `rounded-selector`; `btn`,
  `input`, `select`, `textarea` to `rounded-field`; `card`, `modal-box`, `dropdown-content` to
  `rounded-box`) and `0.99.0`. A `border-radius` literal in a `<style>` block is outside it.
  Source: `src/lib/audit/rules/static/radius-scale.ts#radiusScale`,
  `src/lib/audit/rules/static/radius-scale.ts#RADIUS_SCALE_PROMOTION_VERSION`. [verified]
- `f:l882gl` `stock-default-hazards` has three retired-patch arms, each on an element carrying `btn` and each at
  advisory tier: the ink opener (`bg-neutral` or `bg-[var(--cairn-ink-hover)]` with no
  `btn-neutral`, names `btn btn-neutral`), the Publish tint (`bg-primary/10` with no `btn-soft`,
  names `btn btn-soft btn-primary`), and `shadow-none` (names nothing to add; the theme's depth is
  already zero). The arms compare `utilityBase()`, so a variant-prefixed patch is caught; an
  element without `btn` never fires one; a recipe arm takes precedence, and `shadow-none` stays
  silent where a recipe arm fired, so one retired recipe raises exactly one finding. The messages
  name `0.99.0`. Source: `src/lib/audit/rules/static/stock-default-hazards.ts#RETIRED_PATCH_PROMOTION_VERSION`,
  `src/lib/audit/rules/static/stock-default-hazards.ts#inkOpenerMessage`,
  `src/lib/audit/rules/static/stock-default-hazards.ts#publishTintMessage`. [verified]
- `f:37t8wk` `promotion-versions.test.ts` is the promotion tripwire. It reads every `*PROMOTION_VERSION = '<x>'`
  constant under `src/lib/audit` as source text (never a git ref, since CI checks out at depth 1)
  and `package.json`'s `version`; it asserts at least one constant exists, asserts
  `RADIUS_SCALE_PROMOTION_VERSION` and `RETIRED_PATCH_PROMOTION_VERSION` by name while the package
  version is below `0.99.0`, and fails when any constant's version is at or below the package
  version, naming the file, the constant, the version, and the choice owed: promote the finding to
  error and delete the constant, or re-date it with a disclosed changelog line. The three `0.98.0`
  constants (`log-event-grammar`, `log-secret-field`, the guarded-retirement arm) are decided and
  deleted, so it stays green through the `0.98.0` version commit and turns red at `0.99.0` unless
  `radius-scale` and the three retired-patch arms are promoted first. Source:
  `src/tests/unit/audit/promotion-versions.test.ts:27-83`. [verified]
- `f:2kja0n` `cairn-audit norms <role>` prints one `recipe:` line, and one indented line for the look it
  produces, under a role's header when a row of `ROLE_RECIPES` names that role; a role no recipe
  covers prints exactly as before. The recipe rows live outside the norms manifest, so the manifest
  and `norms:check` do not change, and `ROLE_RECIPES` adds no package export. Source:
  `src/lib/audit/norms.ts#formatNormsQuery`, `src/lib/audit/norms.ts#ROLE_RECIPES`,
  `docs/reference/cairn-audit.md:461-472`. [verified]
- `f:j5fb88` The rendered `viewport-overflow` rule waits for a stable layout after each `setViewportSize`
  before it measures: `document.documentElement.scrollWidth` and `clientWidth` must read the same on two
  consecutive animation frames while no finite CSS transition or animation is still running, bounded by
  a 500ms timeout. The animation half exists because an eased transition holds its first width for more
  than one frame, so equal width reads alone passed a layout that had not started moving; on the
  showcase admin the reads changed for about seven frames after a resize from desktop to 390. On timeout
  the rule measures anyway and every finding from that read ends with "the layout had not settled after
  500ms, so this read may be transient". A content origin (an element whose content is wider than its
  own box) is reported only when its right edge is past the viewport, so "overflows by -11px" no longer
  appears. Source: `src/lib/audit/rules/rendered/viewport-overflow.ts#waitForStableLayout`,
  `src/lib/audit/rules/rendered/viewport-overflow.ts#SETTLE_TIMEOUT_MS`,
  `src/lib/audit/rules/rendered/viewport-overflow.ts#findOverflowOrigins`. [verified]

## docs/reference/cli-cairn-doctor.md

Filed by pass A task 4 from the mining of `tool/docs/reference/cli-cairn-doctor.md`, every bullet
re-sourced to Go on this tree rather than to the page.

- `f:e1s8kh` `cairn doctor` reads a site's checked-in configuration and needs no credential, no adopted site,
  and no Cloudflare or GitHub access, so it runs in a fresh clone and in CI; `cairn health` is the
  live-site counterpart. Source: `tool/cmd/cairn/messages.go:296-303`. [verified]
- `f:rrwp1r` `cairn doctor [<dir>]` takes at most one positional argument; `<dir>` defaults to the working
  directory, is a filesystem path and never a registered site id, and its shell completion offers
  directories rather than site ids. Source: `tool/cmd/cairn/doctor.go:24-37,50-53`. [verified]
- `f:01iu5z` Everything the command reads is off disk under the resolved, symlink-free directory: the
  wrangler config, `package.json` and a lockfile, the Vite config (and `svelte.config.js`, only to see whether it remains),
  `src/hooks.server.ts`, `static/_headers`, the site-config YAML, the `/admin` route candidates,
  and `src/content/.cairn/site-facts.json`. Source: `tool/internal/doctor/wrangler.go:34,46`,
  `tool/internal/doctor/check_csrf.go:43,216`, `tool/internal/doctor/check_referrer.go:180,184`,
  `tool/internal/doctor/check_floors.go:317,339,356`, `tool/internal/doctor/facts.go:11`.
  [verified]
- `f:q01lkt` The `/admin` mount check probes six candidate route files by name, since a Snapshot offers no
  directory listing and a route file can be `.ts` or `.js`. Source:
  `tool/internal/doctor/check_mount.go:13-20`. [verified]
- `f:dg0xqg` A path resolving outside the run's directory, even through a symlink, is refused rather than
  followed. Source: `tool/internal/doctor/snapshot.go:84-88`,
  `tool/internal/doctor/fileread.go:17-37`. [verified]
- `f:8fhjud` The whole command makes one network request, a credential-free `GET` of the declared origin's
  `/robots.txt` for `ai.posture-effective`, and nothing else touches the network. Source:
  `tool/internal/doctor/fetchrobots.go:28-32`. [verified]
- `f:zrgny4` That one request carries no timeout of its own: its deadline is the command's own context, which
  `--timeout` bounds, default 480 seconds. The 15-second per-request cap belongs to
  `internal/providers`, whose clients this credential-free probe deliberately does not use.
  Source: `tool/internal/doctor/fetchrobots.go:14-21,30-31`,
  `tool/internal/providers/transport.go:12-16`, `tool/cmd/cairn/root.go:35`.
  [docs-drift: the retired page said the one request "is bounded at 15 seconds inside it"]
- `f:plng3z` A directory with neither a wrangler config nor a `@glw907/cairn-cms` dependency or
  devDependency in `package.json` is not a cairn-cms site: the run prints one line, exits 3, and
  settles no check. Source: `tool/internal/doctor/fileread.go:88-103`,
  `tool/cmd/cairn/doctor.go:60-61,112-128`, `tool/cmd/cairn/messages.go:320-328`. [verified]
- `f:ee48yi` `--json` is the command's own flag and writes the payload instead of the report; it beats
  `--quiet`, so the payload always prints under `--json`. Source:
  `tool/cmd/cairn/doctor.go:42,88-97`, `tool/cmd/cairn/messages.go:306`. [verified]
- `f:8our2s` The root's `--color`, `--theme`, and `--width` are accepted and have no effect on this command,
  whose report is plain text with no ANSI and no terminal query; `--quiet` and `--timeout` do
  apply. Source: `tool/cmd/cairn/root.go:232-238` declares all five, and neither
  `tool/cmd/cairn/doctor.go` nor `tool/internal/doctor/report.go` reads the three.
  [verified: the declaration is sourced; the no-effect half is the absence of any read, confirmed
  by grep over the command and package]
- `f:um228q` The eleven checks run in one fixed report order, the eight file-only checks followed by the
  three facts-dependent ones: `config.bindings`, `config.media-bucket`, `config.observability`,
  `config.csrf-trusted-origins`, `config.site-config`, `config.public-origin`,
  `config.no-referrer-blanket`, `admin.mount-shape`, `config.dependency-floors`,
  `auth.role-wiring`, `ai.posture-effective`. That slice is also the published check-id list the
  page tests read. Source: `tool/internal/doctor/check.go:120-134`,
  `tool/internal/doctor/docs_test.go:44`. [verified]
- `f:kjp61u` Each check names one engine condition id, which carries the check's severity: blocker for
  `config.bindings-missing`, `config.site-config-invalid`, `config.public-origin-invalid`, and
  `config.dependency-floors-unmet`, warning for `config.media-bucket-missing`,
  `config.observability-off`, `config.csrf-trusted-origins-wildcard`, `config.no-referrer-blanket`,
  `admin.mount-incomplete`, `auth.role-wiring-missing`, and `ai.posture-not-effective`. Source:
  `tool/internal/doctor/check_bindings.go:29`, `check_media.go:29`, `check_observability.go:16`,
  `check_csrf.go:214`, `check_siteconfig.go:25`, `check_origin.go:65`, `check_referrer.go:178`,
  `check_mount.go:75`, `check_floors.go:346`, `check_roles.go:104`, `check_posture.go:284`, with
  each severity at `tool/internal/spine/conditions.json:103-110`. [verified]
- `f:3sxgcl` `config.site-config` reports presence and parsing only; the per-concept URL policy lives on the
  adapter concepts and is not checkable from a directory preflight. Source:
  `tool/internal/doctor/check_siteconfig.go:12-13`. [verified]
- `f:6oopkt` `config.media-bucket`, `auth.role-wiring`, and `ai.posture-effective` read
  `src/content/.cairn/site-facts.json`, and when that file is absent each reports the literal
  message "needs engine 0.97.0 or later, and one build". Source:
  `tool/internal/doctor/facts.go:8-19`. [verified]
- `f:b7o2xd` The seven check ids the doctor never reaches, because they need a live adopted site, are
  `cairn health` ids and none is a doctor id: `serving`, `delegation`, `https-forced`, `email`,
  `deploy`, `publish-path`, and `errors`. Source:
  `tool/internal/health/check_serving.go:25`, `check_delegation.go:20`, `check_https.go:45`,
  `check_email.go:32`, `check_deploy.go:132`, `check_publish.go:59`, `check_errors.go:26`, against
  the doctor's own list at `tool/internal/doctor/check.go:122-134`. [verified]
- `f:re7sn7` The run's exit code is the worst severity among failing checks, 0 when every check passed,
  skipped, or reported info, and 3 when an unchecked result is the only non-passing one. Source:
  `tool/internal/doctor/result.go:86-110` folding through `tool/internal/spine/exit.go:133-167`;
  all four cases exercised at `tool/cmd/cairn/doctor_test.go:76-159`. [verified]
- `f:zb3izw` Exit 3 covers three distinct cases, so a caller tests for a nonzero exit rather than switching
  on 3: a usage error, a run whose only non-passing results could not observe their input, and a
  directory that is not a cairn-cms site. Source: `tool/cmd/cairn/doctor_test.go:161-270`.
  [verified]
- `f:s960z6` Under `--json`, empty stdout means the invocation was wrong: a usage error is the one case that
  writes no payload, and a directory that is not a cairn-cms site still writes one. Source:
  `tool/cmd/cairn/doctor_json_test.go:26-55`, `tool/cmd/cairn/doctor.go:88-97`. [verified]
- `f:svxuiv` Each failing check's report block and its payload `fix.url` resolve against
  `https://cairn.pub/docs/admin/`, built from the condition's own `docsAnchor` with the `.md`
  removed. Source: `tool/internal/doctor/report.go:8-22`. [verified]
- `f:xejl4n` The site config YAML is tried at four candidate paths in lookup order: the canonical path, then
  `site.config.yaml`, `src/lib/site.config.yaml`, and `src/site.config.yaml`; `config.site-config`
  reports `UNCHECKED` (never `FAIL`) when no file is found at any of the four. Source:
  `tool/internal/doctor/siteconfig.go:36-45`, `tool/internal/doctor/check_siteconfig.go:23-37`.
  [candidate: found during the 2026-09-22 redraft's Go read, not independently re-verified by a
  second pass]
- `f:a71nbo` `config.dependency-floors` reports `UNCHECKED` when no recognized lockfile
  (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`) is found, or when the installed engine's
  own `package.json` cannot be read. Source: `tool/internal/doctor/check_floors.go:344-373`.
  [candidate: found during the 2026-09-22 redraft's Go read, not independently re-verified by a
  second pass]
- `f:v2isa4` `config.csrf-trusted-origins` reports `UNCHECKED` when none of `vite.config.js`,
  `vite.config.ts`, and `vite.config.mts` is found, distinct from a read error on any of them. Source:
  `tool/internal/doctor/check_csrf.go:212-237`. [candidate: found during the 2026-09-22 redraft's Go
  read, not independently re-verified by a second pass]
- `f:b94uhy` `ai.posture-effective` reports `UNCHECKED` when `src/content/.cairn/site-facts.json` is absent,
  or when the `/robots.txt` fetch could not observe a result: no origin resolves, the origin does
  not parse, the fetch fails, or the response is non-200. Source:
  `tool/internal/doctor/check_posture.go:285-299`, `tool/internal/doctor/fetchrobots.go:32-59`.
  [candidate: found during the 2026-09-22 redraft's Go read, not independently re-verified by a
  second pass]
- `f:gilykt` Under `--json`, a check's five printed status words collapse to four wire states: `PASS` and
  `INFO` both write `"state": "pass"`, told apart by `INFO`'s `note` field (absent on a plain
  pass); `FAIL` writes `"state": "fail"` with a `fix`; `SKIP` writes `"state": "skip"` with
  `"reason": "reason.not-run"`; `UNCHECKED` writes `"state": "unknown"` with
  `"reason": "reason.not-observable"`. The condition id itself is the payload's `condition` field.
  Source: `tool/internal/doctor/json.go:41-54,100-129`. [candidate: found during the 2026-09-22
  redraft's Go read, not independently re-verified by a second pass]
- `f:0ms9c1` `auth.role-wiring` settles `INFO`, not only `PASS`/`FAIL`/`SKIP`/`UNCHECKED`, when
  `src/hooks.server.ts` is missing, when no `createAuthGuard` call is found in it, or when the
  call's argument is a bare identifier the check cannot read into; none of these is treated as a
  high-confidence `FAIL`. The page's checks table names only this check's `PASS`/`FAIL` condition,
  `SKIP`, and `UNCHECKED` cases, not its `INFO` settlements. Source:
  `tool/internal/doctor/check_roles.go:117-130`, `tool/internal/doctor/check_roles_test.go:31,40,49`.
  [verified]

## docs/reference/cli-cairn-exit-codes.md

Filed by pass A task 4 from the mining of `tool/docs/reference/exit-codes.md`, every bullet
re-sourced to Go on this tree rather than to the page.

- `f:olm8xt` The four exit codes are the monitoring-plugin convention, each constant's value being its own
  code: 0 `OK`, 1 `WARNING`, 2 `CRITICAL`, 3 `UNKNOWN`. Source:
  `tool/internal/spine/exit.go:14-36`. [verified]
- `f:2i8uqy` Several verdicts combine by precedence and not by numeric order: `CRITICAL` outranks `UNKNOWN`
  outranks `WARNING` outranks `OK`, so `UNKNOWN`'s 3 does not beat `CRITICAL`'s 2. The same order
  applies within one site and across a sweep of many. Source:
  `tool/internal/spine/exit.go:38-55,147-167`. [verified]
- `f:ncrqaw` One check contributes `OK` when it passed and `CRITICAL` when it failed, softened to `WARNING`
  either by the check's own declared severity or by an unexpired hold; a held failure is never
  reported `OK`, and a hold that has already expired contributes the same code an unheld failure
  does. Source: `tool/internal/spine/exit.go:89-92,98-128`. [verified]
- `f:oo8qdz` `engine` is the only health check whose failure is warning-severity; every other check in the
  set fails at critical weight, and an id the table does not name is reported at full weight.
  Source: `tool/internal/health/severity.go:16-30`. [verified]
- `f:zy25ex` A check that could not run contributes `UNKNOWN`, with one exclusion: three reasons name a
  check the run declined to attempt because the site's own setup gives it nothing to read, and
  those contribute `WARNING`. They are `reason.cred-missing`, `reason.repo-not-recorded`, and
  `reason.api.builds-not-connected`. Source: `tool/internal/spine/outcome.go:78-93`,
  `tool/internal/spine/exit.go:104-128`. [verified]
- `f:v8c3ws` The same fact decides the wire word and the exit code: those three reasons word a result `skip`,
  and every other unknown words it `unknown`. Source: `tool/internal/spine/exit.go:177-191`.
  [verified]
- `f:xolnw0` A hold has no effect on an unknown, since an operator can accept a known failure but not a check
  that never ran. Source: `tool/internal/spine/exit.go:104-128`. [verified]
- `f:l20z8y` A site with no checks at all folds to `UNKNOWN`, never `OK`, so nothing was ever measured cannot
  print a false green. Source: `tool/internal/spine/exit.go:133-145`. [verified]
- `f:tchzio` A registry the tool could not read in full contributes `UNKNOWN`, and so does an `--expect-sites`
  count the registry does not match; zero means the operator named no count and the length is not
  checked. An empty registry reuses the same sentinel, which is why bare `cairn health` on an
  empty registry exits 3. Source: `tool/internal/spine/exit.go:57-59,147-167`,
  `tool/cmd/cairn/health_sweep.go:40-45`, `tool/cmd/cairn/sites.go:46`. [verified]
- `f:igjau7` A hold is named either by a repeatable `--ack <check-id>=<YYYY-MM-DD>` or by an acknowledgement
  file, which `--ack-file` names and which defaults to `acknowledgements.json` in the registry
  directory; its absence is not an error. Source: `tool/cmd/cairn/ack.go:17-36`,
  `tool/cmd/cairn/health.go:58`, `tool/cmd/cairn/root.go:238`. [verified]
- `f:zlqdbn` The absence rule above covers only the default file. An `--ack-file` path the operator names
  explicitly and that does not exist, or cannot be read, is a usage error. Source:
  `tool/cmd/cairn/messages.go:549,554`, `tool/cmd/cairn/messages.go:561-564`. [candidate: filed
  during the cli-cairn-exit-codes.md redraft, 2026-09-22, re-sourced against `main`]
- `f:50ifoh` An exit code is decided in exactly two ways, which cannot disagree: a run that produced reports
  folds site verdicts, listing errors, and the expected site count; a run that produced no report
  carries a typed error, and everything but a coded error reports `UNKNOWN`. A cancelled run, a
  usage error, and a tool fault all say the same thing to a routine. Source:
  `tool/cmd/cairn/main.go:134-168`, `tool/internal/spine/exit.go:147-167`. [verified]
- `f:cwtfs7` `cairn auth check` is the one command carrying its own typed verdict, because it computes it
  with `spine.ExitCode` over its own permission rows and hands the result to main through
  `codedExit`. `cairn auth probe` is a hidden alias of it, kept reachable for a script that already
  types the earlier name. Source:
  `tool/cmd/cairn/main.go:134-142`, `tool/cmd/cairn/probe_token.go:20-29`. [verified]
- `f:hi5cw3` A usage error exits 3 with byte-empty stdout, and its message goes to stderr, so stdout carries
  payloads alone. Source: `tool/cmd/cairn/main.go:154-168`, test
  `tool/cmd/cairn/usage_test.go:125-138`. [verified]
- `f:mcjbpm` `--json` beats `--quiet`: the payload always prints, so empty stdout under `--json` means the
  invocation was wrong rather than that the site is healthy. Source:
  `tool/cmd/cairn/health_sweep.go:50-54`, `tool/cmd/cairn/doctor.go:88-97`. [verified]
- `f:8ow43o` A `--color` value outside auto, always, and never, a `--theme` value outside dark and light, and
  an explicit `--width` outside its bounds are each usage errors. `--theme` has no auto: querying
  a terminal for its background is a write-then-read the tool refuses, so the value is the one the
  operator states, and dark when they state none. Source: `tool/cmd/cairn/root.go:37-55,101-118`.
  [verified]
- `f:dbwe2j` `--help` and `--version` exit 0, which is cobra's own behaviour rather than a cairn override;
  cairn registers the `-V` shorthand explicitly before cobra would add an unshorthanded one.
  Source: `tool/cmd/cairn/root.go:216-229`. [verified]
- `f:h1x1i5` `cairn health <site>` takes the site as a positional operand, not a flag. Source:
  `tool/cmd/cairn/health.go:44`. [verified]
- `f:u9fpq8` Three nested bounds govern a run's duration: every provider request is capped at 15 seconds,
  each check makes at most a published number of requests, and `--timeout` bounds the whole
  command with a 480-second default. Source: `tool/internal/providers/transport.go:12-16`,
  exported for the budget arithmetic at `tool/internal/providers/probe.go:31-35`, and
  `tool/cmd/cairn/root.go:29-35`. [verified]
- `f:v2mrvq` The per-check request counts live on the published page and in no Go table; a drift test reads
  them back off the page, requires exactly the ids the sweep runs, and fails when the total times
  the 15-second cap exceeds the single-site budget. Source:
  `tool/cmd/cairn/usage_test.go:499-556`. [verified]
- `f:p8ie34` The nine published counts are `creds` 2, `serving` 6, `delegation` 2, `https-forced` 1, `email`
  9, `deploy` 4, `publish-path` 2, `engine` 4, and `errors` 1, totalling 31, which at 15 seconds
  each is 465 seconds and is what the 480-second default rounds up from. Source:
  `tool/cmd/cairn/usage_test.go:499-519` reads and enforces these values. [candidate: no Go table
  declares the nine counts, so the values themselves trace only to the page the drift test reads]
- `f:g4arh0` A multi-site sweep's default whole-run budget is the single-site budget times the site count,
  capped at four times the single-site default, and each site gets the envelope's remaining time
  divided by the sites still to run, never more than the per-site budget, recomputed after each
  site settles. An explicit `--timeout` replaces the whole-run budget and the division works the
  same inside it. Source: `tool/cmd/cairn/health_sweep.go:20-26,216-254`. [verified]
- `f:6tm5nr` The formula the page publishes is pinned by a test that builds it from the two constants, so the
  worked examples stay arithmetic rather than assertion. Source:
  `tool/cmd/cairn/usage_test.go:558-568`. [verified]
- `f:qgeq2i` A budget miss or a signal stops a sweep after the site already in flight settles; every site
  still to come is counted toward the run's exit code as `UNKNOWN`, and under `--json` it is
  omitted from the stream rather than emitted empty, since a plain-text line would corrupt the
  newline-delimited JSON. Source: `tool/cmd/cairn/health_sweep.go:28-37`,
  `tool/internal/render/json.go:369-371`. [verified]
- `f:wulqee` A site cut short partway reports each unfinished check unknown with `reason.not-run`. Source:
  `tool/internal/health/health.go:151,173`, `tool/internal/spine/outcome.go:64`. [verified]
- `f:yxdrdh` A timeout is a ceiling and not a wait: a healthy site answers in a few seconds, and the earlier
  120-second default was a budget one site could not finish inside, which made a run against a
  stalled provider report `UNKNOWN` rather than the fault it was measuring. Source:
  `tool/cmd/cairn/root.go:29-35`. [verified]
- `f:ka0ngc` No shell profile reaches a scheduled run, so the three credential variables come from the
  scheduler's own environment or from the OS keyring `cairn auth set` writes: `CAIRN_CF_ACCOUNT_ID`,
  `CAIRN_CF_READ_TOKEN`, and `CAIRN_GH_READ_TOKEN`. The environment provider is tried before every
  other provider in the chain. Source: `tool/cmd/cairn/env.go:36-38,198-211`,
  `tool/cmd/cairn/auth.go:145`. [verified]

## docs/reference/cli-cairn-json-output.md

Filed by pass A task 4 from the mining of `tool/docs/reference/json-output.md`, every bullet
re-sourced to Go on this tree rather than to the page.

- `f:i8y825` Under `--json`, stdout carries the payload and stderr carries diagnostics; the two are never
  merged. The payload prints even under `--quiet`, and a usage error writes nothing to stdout and
  exits 3. Source: `tool/cmd/cairn/root.go:234,239`, `tool/cmd/cairn/health_sweep.go:50-54`,
  `tool/cmd/cairn/main.go:154-168`. [verified]
- `f:i9rv5i` Seven payload kinds are published, each declaring its own `kind` so a consumer reading a mixed
  stream keys off a field rather than off the shape it sees: `site`, `summary`, `sites`, `logs`,
  `adoptCandidates`, `authCheck`, and `doctor`. Source: `tool/internal/render/json.go:41-50`,
  `tool/internal/doctor/json.go:11-13`. [verified]
- `f:p5qhgy` Each kind carries its own schema version rather than one number across all seven, so a field
  added to one payload does not make every other consumer re-read a schema. All seven stand at 1.
  Source: `tool/internal/render/json.go:14-39`. [verified]
- `f:iasib1` Every payload carries `schemaVersion`, `kind`, and `verdict` at top level, and every payload but
  a per-site NDJSON line carries `exitCode`. Source: `tool/internal/render/json.go:55-70,116-126,
  130-137,149-159,172-179`, `tool/internal/doctor/json.go:28-38`. [verified]
- `f:dzsdcf` Bare `cairn health --json` writes newline-delimited JSON: one `site` object per site, flushed as
  that site settles, each being the single-site payload less its `exitCode`, then one `summary`
  line carrying the run's own `exitCode`. Source: `tool/cmd/cairn/health_json.go:15-65`,
  `tool/internal/render/json.go:61-64,216-229`. [verified]
- `f:khcwri` A stream carrying no summary line reads `UNKNOWN`, since a truncated stream and a complete one
  are otherwise indistinguishable. Source: `tool/internal/render/json.go:114-116`,
  `tool/cmd/cairn/health_json.go:48-50`. [verified]
- `f:dm3u5v` A site the run's budget or a signal cut short is counted into the summary's `counts` as
  `UNKNOWN` with no line of its own; `sites` is how many the run was meant to cover, which exceeds
  the number of lines written. Source: `tool/internal/render/json.go:350-352,369-371`. [verified]
- `f:0yfm91` The check-level state vocabulary is a closed set of five wire words, computed at the boundary
  rather than marshalled off the internal three-value state: `pass`, `fail`, `held`, `skip`, and
  `unknown`. `held` is not a state at all but a failing check an unexpired hold covers, and the
  division between `skip` and `unknown` is carried by the outcome's reason. Source:
  `tool/internal/spine/exit.go:177-191`, `tool/internal/render/json.go:264-271`. [verified]
- `f:nv00ik` A check's `fix` object carries `summary`, `actor`, and `outward` always, `url` where the
  condition has one, and `command` only for an operator's own fix, since that is the one actor
  whose action is a command line the tool can name. Source:
  `tool/internal/render/json.go:99-106,317-339`. [verified]
- `f:bd0ubx` A check's `hold` object carries `until` and `expired`; an expired hold is reported rather than
  dropped, and it arrives at the exit arithmetic as unacknowledged. Source:
  `tool/internal/render/json.go:108-112,288-290`, `tool/internal/spine/exit.go:89-92`. [verified]
- `f:bn4bii` A check's measured values are split by where they came from: `fields` holds what cairn derived
  itself and `observed` holds what was copied from a provider's response, each value beside the
  `source` it was copied from. The boundary reads each field's declared source and infers nothing
  from a key name or a value's shape. Source: `tool/internal/render/json.go:82-97,294-315`,
  `tool/internal/spine/outcome.go:144-178`. [verified]
- `f:xk7j2v` The `errors` check reports `errorCount` always and `errorCountTruncated` only when the fetch
  filled its own page limit, which makes the count a floor rather than a total; the truncation key
  is absent on an exact count. `topEvents` is verbose-only and marked as copied from Cloudflare.
  Source: `tool/internal/health/check_errors.go:31-57`. [verified]
- `f:3pxhb9` The sites listing carries one entry per registered site with `id`, `name`, `domain`, and `step`,
  plus a top-level `errors` array naming every registry read the listing could not complete, which
  is also what carried the verdict away from `OK`. Source:
  `tool/internal/render/json.go:128-146,391-405`, `tool/cmd/cairn/sites.go:143`. [verified]
- `f:oegghv` The logs payload carries `site`, `containsPersonalData`, and `entries`, each entry being `at`,
  `level`, `event`, and the event's own `fields`. Under `--json` stderr is silent, so the
  personal-data notice a plain run prints travels in the payload or it reaches nobody. Source:
  `tool/internal/render/json.go:148-169,407-431`, `tool/cmd/cairn/logs.go:70-74`,
  `tool/cmd/cairn/messages.go:150`. [verified]
- `f:by9zcg` An adopt candidate carries `worker`, `repo`, `zone`, `domain`, `accountId`, `connected`,
  `adopted`, and `adoptable`. `adoptable` is true only where the Worker serves a Custom Domain,
  since cairn provisions Workers Custom Domains and never Workers Routes, and it was added as an
  optional field within schema version 1 so a reader written before it still reads every
  candidate. Source: `tool/internal/render/json.go:181-195`, `tool/cmd/cairn/adopt.go:98`.
  [verified]
- `f:1aej7q` The reason vocabulary is closed and built from three sets rather than written out, so a code
  added to any of them joins the published vocabulary with no second list to keep in step: nine
  fixed codes, one `reason.park.<code>` per park code, and one `reason.api.<reason>` per provider
  reason, 32 in all. Source: `tool/internal/spine/outcome.go:56-76,95-119`,
  `tool/internal/spine/park.go:11-23,26-28`, `tool/internal/providers/errors.go:16-65`.
  [verified]
- `f:oqkzuq` `reason.api.request-rejected` names cairn's own outgoing request being wrong, an HTTP 400 no
  operator can fix, and is kept out of the catch-all for that reason. A rate limit never answers
  failing either: the tool being throttled is not the site being broken. Source:
  `tool/internal/providers/errors.go:31-36`, `tool/internal/spine/outcome.go:121-142`. [verified]
- `f:y0ocr0` The condition ids a payload can carry are ported from the engine's own registry and are the same
  vocabulary the engine emits. Source: `tool/internal/spine/condition.go:19-44`. [verified]
- `f:0typfn` On the wire a site's `checks` sort by id and `acknowledged` sorts alphabetically, so two runs of
  an unchanged site diff cleanly; the severity ranking belongs to the text bodies, not to the
  payload. Source: `tool/internal/render/json.go:232-244`. [verified]
- `f:junfdz` Every timestamp on the wire is RFC 3339 in UTC, and the zero time writes an empty string;
  nothing on the wire is relative. Source: `tool/internal/render/json.go:501-508`. [verified]
- `f:wzavtn` `cairn doctor --json` writes its own kind rather than a site payload with different checks: a
  directory run has no registry record, no credential tier, and no acknowledgements, so `site`,
  `domain`, `tier`, `acknowledged`, and `hold` have nothing to hold. Its `dir` is the resolved,
  symlink-free directory and never the argument as typed, and a non-site directory writes an empty
  `checks` array rather than null. Source: `tool/internal/doctor/json.go:25-38,65-98`. [verified]
- `f:lkbuxg` The doctor payload writes only the frozen state words and adds none of its own: an info result
  is written `state: "pass"` with a `note` and no `detail`, a skip is written `state: "skip"` with
  `reason: "reason.not-run"`, and an unchecked result is written `state: "unknown"` with
  `reason: "reason.not-observable"`. `held` is never written, since a directory preflight has no
  hold concept. Source: `tool/internal/doctor/json.go:15-23,44-55,100-129`. [verified]
- `f:5hswlx` A doctor check's `fix` carries only `summary` and `url`, with no actor and no outward flag,
  since every doctor failure is fixed by the developer editing a checked-in file. Source:
  `tool/internal/doctor/json.go:57-63`. [verified]
- `f:xvdk04` `cairn auth check`'s payload is the one kind with no golden fixture; its shape is one row per
  permission, each carrying `label`, `credential`, `state`, and a `reason` beside anything other
  than a pass, and a row never reads `held`. Source: `tool/internal/render/json.go:448-499`.
  [verified]
- `f:lxemp0` A drift test holds the published `--json` page to the contract: it requires the heading
  `## What freezes at 1.0` before `## What does not freeze`, every golden key in backticks, every
  health and doctor check id, the four verdict words, the five state words, and every reason code,
  and it requires `durationMs` and the glyph set to sit in the not-frozen section. Source:
  `tool/internal/render/json_schema_test.go:502-564`. [verified]
- `f:ycj7pq` `durationMs` is wall time and is excluded from any diff by design, since two runs of an
  unchanged site differ in it. Source: `tool/internal/render/json.go:209-211`. [verified]
- `f:9x1w7n` The credential variables resolve environment first, then every other provider in the chain, and
  the password prompt falls back to reading one piped line when stdin carries no terminal state,
  so a scripted `cairn auth set` does not hang. Source: `tool/cmd/cairn/env.go:36-38,198-211`,
  `tool/cmd/cairn/auth.go:73-109`. [verified]
- `f:4wq7zj` A site payload's `degraded` is true when any check on that site ended with the reason
  `reason.cred-missing`, the credential-shaped skip, and it is set nowhere else. Source:
  `tool/internal/health/health.go:130-132`. [verified]
- `f:8137ac` A summary payload's `worstFirst` ranks sites by the severity class of their worst
  unacknowledged failing check, never by verdict word, and the sort is stable, so sites sharing a
  class keep the registry's order. An acknowledged failure does not rank a site. Source:
  `tool/internal/render/rank.go:99-122`. [verified]

## docs/reference/cli-cairn-manifest.md

- `f:fh6kod` `cairn-manifest` reuses the `cairnManifest()` Vite plugin's own options (globs, config module,
  manifest path) rather than taking its own flags, so the regenerated manifest is guaranteed to
  match what a build verifies against. The bin calls two internal functions in sequence,
  `writeManifest` and `writeSiteFacts`. Source: page text plus `src/lib/vite/internal.ts` doc
  comments referencing shared option resolution; `src/lib/vite/bin.ts:9` (header comment naming
  both functions) and `:27-29` (sequential calls). [verified: structurally]
- `f:6t5tzu` Only `publishedAt` survives a rebuild across entries: the command reads existing stamps from
  the file about to be overwritten, merges them into the new manifest, and drops any stamp whose
  entry the corpus no longer holds. On a corrupt existing file, it warns to stderr and writes the
  rebuilt manifest with no stamps, since regenerating is also how a corrupt manifest is repaired.
  Source: `src/lib/vite/internal.ts:213-249` (comments explicitly state this and the code path
  matches: stamps collected into a Map, then merged back by `${concept}/${id}` key). [verified]
- `f:l58buu` Exit codes: 0 (`--help` or successful write), 1 (write failed: no Vite config found, or a
  config with no `cairnManifest()` plugin), 2 (unrecognized argument). Codes go through
  `process.exitCode`. Source: `src/lib/vite/bin.ts:5-30`. [verified]

## docs/reference/cli-cairn-media-seed.md

- `f:f91jbb` Bucket resolution order: explicit `--bucket` always wins; failing that, exactly one declared
  `r2_buckets` entry with a `bucket_name` is used; zero entries, several entries, missing config,
  or a single entry missing `bucket_name` are all errors naming `--bucket` as the fix. Source:
  `src/lib/media-seed/assemble.ts:147-172`. [verified]
- `f:fs5tpa` Each manifest row's public delivery URL is derived as `<from>/media/<slug>.<hash>.<ext>`, and
  the written local-R2 key is `media/<hash[0:2]>/<hash>.<ext>` (content-addressed, matching what
  the media route reads). Source: `src/lib/media-seed/assemble.ts:118-122` (delivery URL builder);
  `src/lib/media/naming.ts:113-121` (`r2Key`, returning `` `media/${shortHash.slice(0, 2)}/${shortHash}.${ext}` ``,
  matching the write-side key shape exactly). [verified]
- `f:5a5oq0` A manifest row missing, or carrying a malformed, `slug`, `hash`, or `ext` is dropped rather than
  failing the run; the same tolerance applies elsewhere in the manifest reader. Source:
  `src/lib/media-seed/assemble.ts:80-105` (`normalizeManifest`: the guard requires each field be a
  string AND match its shape regexp, `SLUG_RE`/`HASH_RE`/`R2_EXT_RE`, so a present-but-malformed
  field is dropped the same as a missing one), `src/lib/media/manifest.ts:107` ("a failing element
  is dropped"). [verified]
- `f:4as382` Exit codes: 0 (`--help`, or every entry synced, or manifest holds none), 1 (at least one entry
  failed, each printing `FAILED <slug>: <message>`), 2 (bad flags or unresolved bucket name). The
  summary line (`cairn-media-seed: <ok> synced, <failed> failed, of <total> manifest entries`)
  prints on both exit 0 and exit 1, any run past flag parsing and bucket resolution; only the two
  exit-2 paths return before it. Source: `src/lib/media-seed/bin.ts:92-150` (summary print at
  :139-147, before the `process.exitCode` assignment; the two exit-2 returns at :106-108 and
  :129-133 precede it). [verified]

## docs/reference/cloudflare.md

- `f:69xbyh` `verifyTurnstile` is fail-closed by contract: every failure mode (bad input, oversized token,
  timeout/throw, non-200, unparseable body, `success: false`, hostname/action mismatch) returns
  `false`, never throws, so a future refactor can't flip it open by accident. `opts.ip` must come
  from `CF-Connecting-IP`, never a forwardable header. Source: `src/lib/cloudflare/turnstile.ts:1-3`
  (module comment: "Every failure mode below returns false rather than throwing"), `:17-21`
  (`ip` doc comment: "from `CF-Connecting-IP` and never a client-forwardable header"). [verified]
- `f:b857di` `MAX_TOKEN_LENGTH` is exactly `2048` characters and the fetch timeout is exactly `5000`ms
  (`AbortSignal.timeout(5000)`). Source: `src/lib/cloudflare/turnstile.ts:8-10,127`. [verified]
- `f:bpk8gc` A `success: false` siteverify response logs nothing when every code is one of the two routine
  causes (`invalid-input-response`, `timeout-or-duplicate`), since that is the function working
  as intended; every other rejection reason does log. Source: `src/lib/cloudflare/turnstile.ts:15`
  (`ROUTINE_ERROR_CODES`), `:153-158` (`isRoutine` check gates the `log.warn('turnstile.verify_failed',
  { reason: 'rejected', codes })` call). [verified]
- `f:thbxvf` `verifyTurnstile` logs `reason: 'missing_secret'` for a blank or non-string `secret`
  and `reason: 'invalid_input'` (with `tokenLength`) for a blank, non-string, or over-length
  `token`; the secret is checked first, so a call with both bad logs `missing_secret`. Both
  return `false` without calling fetch. Source: `src/lib/cloudflare/turnstile.ts:93-110`.
  [verified]
- `f:ndtmx8` `resolveRateLimit` resolves multiple keys in order, short-circuiting at the first key over
  budget (a later key's counter is never incremented once an earlier one has failed), and returns
  a four-arm outcome (`allowed`, `limited`, `no-binding`, `failed`) rather than the boolean its
  predecessor `checkRateLimit` returned. Source: `src/lib/cloudflare/rate-limit.ts:9-46` (types
  and function present matching this shape); the "predecessor `checkRateLimit`" claim is
  documentation of history, consistent with this repo's retire-and-replace pattern elsewhere.
  [verified: for the current shape; the predecessor-name claim not independently checked against
  a deleted file]

## docs/reference/core.md

- `f:hlk5jw` `previewMarkdown(def)` is a root export: it returns a component's `preview` sample as the directive markdown the renderer takes, or `undefined` when the component declares no `preview`. A site walks its registry through it to render one sample per component, which is how the scaffold's `/styleguide` builds its kit. Source: `src/lib/render/component-grammar.ts#previewMarkdown`, `src/lib/index.ts:99`, `docs/reference/core.md#previewmarkdown`. [verified]
- `f:eooeqm` `defineFieldset`'s Standard Schema `~standard.validate` returns `result.issues`
  unchanged, not a single-segment remap; a nested `object`/`array` field failure carries a
  multi-segment path (leaf key or row index appended), the same `ValidationIssue[]` `validate()`
  itself returns. Source: `src/lib/content/fieldset.ts:150-181` (`validateField` appends nested
  segments), `:491-499` (`~standard.validate` passes `result.issues` through). [verified]
- `f:1to3po` `defineConcept`'s permalink default is `/:slug` when the concept id is exactly `pages`, and
  `/<concept-id>/:slug` for any other id; `datePrefix` defaults to `'day'`. Source:
  `src/lib/content/concepts.ts:67,190`. [verified]
- `f:6kdagb` `AssetConfig.maxUploadBytes` defaults to `25 * 1024 * 1024` (25 MB). Source:
  `src/lib/media/config.ts:35,71`. [verified]
- `f:hazpim` `canReach`: `none` capability reaches a route-path target only when the matched map
  rule names its role, and reaches no screen id, unmapped href, or `editors`; `owner` reaches every
  target including `editors`; every other capability's reach stops at `editors`, which stays
  owner-only regardless of what the access map says. Source: `src/lib/auth/access.ts#canReach`
  (function body checks `editor.capability === 'none'`, `=== 'owner'`, then `target === 'editors'`
  before any map lookup). [verified]
- `f:8ia71i` `resolveCapability` returns `'none'` for a role name absent from the vocabulary, so a pruned
  config or a hand-edited row fails closed rather than locking a person out entirely (they lose
  content access but the auth flow itself does not error). Source: `src/lib/auth/roles.ts:83-89`.
  [verified]
- `f:rue4tl` `roleHome` (the function documented as "retired from this subpath" on the `/` barrel) still
  exists as an internal function in `src/lib/auth/roles.ts` and is used internally; it is simply
  no longer re-exported from the public root barrel. The page's phrasing ("retired... zero
  consumers") describes public-surface retirement, not deletion. Source:
  `src/lib/auth/roles.ts:95-98` exists; no `export` of `roleHome` found in `src/lib/index.ts` or
  other top-level export files searched. [verified]
- `f:qi5zbj` `CommitConflictError`/`BranchExistsError` are thrown identically by both the GitHub App backend
  and the packaged dev backend from `Backend.createBranch`, so a caller catches the collision as
  one typed refusal regardless of which backend is active. Source: `src/lib/github/backend.ts:141-147`
  (`createBranch` throws `CommitConflictError` on an unreadable source), `src/lib/github/branches.ts:53`
  (`createBranch` throws `BranchExistsError` on a name collision), `packages/cairn-cms-dev/src/fake-github.ts:805-811`
  (the dev backend's `createBranch` throws both, importing the same classes from
  `@glw907/cairn-cms`). [verified]
- `f:dbaklx` `defineRoles` throws on an empty record, empty role name, malformed declaration, a non-
  `/admin`-prefixed `home`, a missing `owner` key, or an `owner` mapped to non-owner capability;
  `owner` is the one reserved name because the last-owner guard and bootstrap owner both anchor
  on it. Source: `src/lib/auth/roles.ts:34-49` (`validateDeclaration`), `:58-74` (`defineRoles`:
  empty-record, empty-name, missing-owner, and owner-capability throws), `:108`
  (`resolveOwnerLevelRoles`), `src/lib/sveltekit/auth-routes.ts:45,202-203` (`bootstrapOwner`).
  [verified]
- `f:xbdb74` An `IconSet` path is filled shape data on a `0 0 256 256` box, never stroke data: `renderGlyph`
  sets the svg's `fill` to `currentColor` and sets no `stroke` anywhere, so a stroke-only path (one
  whose `d` encloses no area) renders invisible. Source: `src/lib/render/glyph.ts:16-23`
  (`renderGlyph`: `s('svg', { ..., fill: 'currentColor', ... }, [s('path', { d })])`, no `stroke`
  attribute anywhere in the call). [verified]

## docs/reference/delivery.md

- `f:upec9v` A `ContentIndex`'s `all()` already returns entries in the engine's own order; a caller never
  re-sorts it. A dated concept (`routing.dated: true`, such as Posts) sorts newest first by `date`
  with an undated entry last; an undated concept (such as Pages) sorts by `title`. Source:
  `src/lib/delivery/content-index.ts:139-141` (comment: "Dated concepts sort newest-first;
  undated concepts (Pages) sort by title"; `descriptor.routing.dated ? (b.date ?? '').localeCompare(a.date
  ?? '') : a.title.localeCompare(b.title)`), `:152` (`all` reads from the already-sorted array).
  [verified]
- `f:3r08v1` `markdownEntries` enumerates one `.md`-suffixed path per entry whose frontmatter `robots` field
  doesn't carry `noindex`; `markdownLoad` throws `error(404)` on both a lookup miss and a `noindex`
  entry, so the loader and the enumerator always agree regardless of prerendering. Source:
  `src/lib/delivery/public-routes.ts:225-227` (`isNoindex` reads `readSeoFields(frontmatter).robots
  ?.includes('noindex')`), `:236` (`markdownEntries` filters on it) and `:251,256` (`markdownLoad`
  doc: "A `noindex` entry 404s here as well as being absent from `markdownEntries`"). [verified]
- `f:umdf7r` `composeEntryData` is the shared composition both `entryLoad` (public route) and `loadPreview`
  (`/sveltekit`, a different lookup) run, so a preview and its eventual public page can't
  structurally drift; `entryLoad` is lookup-then-compose over this function with no `overrides`, so
  its output is unchanged from before the function existed. Source:
  `src/lib/delivery/public-routes.ts:139` (`composeEntryData` defined), `:213-217` (`entryLoad`:
  `composeEntryData(config, entry)`, no `overrides`), `src/lib/sveltekit/preview.ts:488,506`
  (`loadPreview`: `composeEntryData(config, ..., resolvers)`). [verified]
- `f:83gbov` `EntryData.heroImage` is undefined when no hero is set, media is off, or the frontmatter `media:`
  reference does not resolve; the canonical token itself (`entry.frontmatter.image.src`) is left
  untouched as the raw `media:` token regardless. Source: `src/lib/delivery/public-routes.ts:73-76`
  (doc comment), `:93-112` (`deriveHeroImage`: returns `undefined` when `resolveMedia` is absent,
  no `image` object, no `src`, an unparseable token, or an unresolved reference). [verified]
- `f:dvg5gn` `CairnHead`'s `titleTemplate` applies to `seo.title` only when `title` is left undefined, so an
  explicit `title` or `title={false}` always wins over the template. `markdownUrl`, when passed,
  adds a `rel="alternate" type="text/markdown"` link; omitted (or for a `noindex` entry with no
  twin) the link is omitted rather than pointing at a dead route. Source:
  `src/lib/delivery/CairnHead.svelte:5-8` (doc comment), `:35`
  (`title !== undefined ? title : titleTemplate ? titleTemplate(seo.title) : seo.title`), `:53-54`
  (`{#if markdownUrl}<link rel="alternate" type="text/markdown" ...>`). [verified]
- `f:qzcpzc` The showcase's four static-route servers reach four different `/delivery` response builders:
  `feed.xml` uses `rssResponse`, `feed.json` uses `jsonFeedResponse`, `sitemap.xml` uses
  `sitemapResponse`, and `robots.txt` uses `robotsResponse`. Source:
  `examples/showcase/src/routes/feed.xml/+server.ts:2`,
  `examples/showcase/src/routes/feed.json/+server.ts:2`,
  `examples/showcase/src/routes/sitemap.xml/+server.ts:2`,
  `examples/showcase/src/routes/robots.txt/+server.ts:2`. [verified]
- `f:bnt2wh` `PublicRoutesConfig.assetsEnabled` only diagnoses a forgotten `resolveMedia` wire-point (a
  one-time `media.resolver_absent` log at construction when media is on but no resolver was
  passed); it does not itself gate hero resolution, which `resolveMedia` alone controls. Source:
  `src/lib/delivery/public-routes.ts:39-50` (doc comment), `:202-210`
  (`if (assetsEnabled && !resolveMedia) { log.warn('media.resolver_absent'); }`). [verified]
- `f:g030q0` The showcase's catch-all `[...path]` route builds `createPublicRoutes` from one shared
  `publicRoutesConfig` binding (also used by the preview route and the markdown-twin route) and
  layers `withReferences` on `entryLoad`'s result before rendering through the theme's
  `ArticleView` component, not an inline `<article>{@html html}</article>`. Source:
  `examples/showcase/src/routes/(site)/[...path]/+page.server.ts:1-15`,
  `examples/showcase/src/chassis/public-routes.ts:11-24`,
  `examples/showcase/src/routes/(site)/[...path]/+page.svelte:1-9`. [verified]

## docs/reference/delivery-data.md

- `f:ehnc6s` `buildRobots`'s `posture` option, left unset, produces byte-identical output to a site that
  states no posture at all (every site on the engine today); `'decline'` adds one
  `User-agent`/`Disallow: /` group per training-crawler token plus `Content-Signal: ai-train=no`;
  `'invite'` adds `Content-Signal: search=yes, ai-train=yes` with no `Disallow` line, since no
  robots directive can invite a crawler. Source: `src/lib/delivery/robots.ts#CONTENT_SIGNAL`
  (`CONTENT_SIGNAL = { decline: 'ai-train=no', invite: 'search=yes, ai-train=yes' }`) and
  `src/lib/delivery/robots.ts#buildRobots` (doc comment plus `if (opts.posture === 'decline') { ... }`/`'invite'` branches
  matching exactly). [verified]
- `f:9q770t` Declining via `robots.txt`/`Content-Signal` is a request that named crawlers say they honor, not
  enforcement; OpenAI's `ChatGPT-User` and Perplexity's `Perplexity-User` are exempt from
  `robots.txt` by their own operators' first-party design, so a fully declining site can still
  receive a live fetch when an assistant is asked about it. Source: page text
  `docs/reference/delivery-data.md:147-150`; this is an external claim about named crawler
  operators' own policies, not verifiable against this repo's code, kept because an implementer
  acts on it (do not treat `decline` as a technical block). [external: OpenAI/Perplexity crawler
  policy]
- `f:vjk811` `Content-Signal` syntax follows Cloudflare's published content-signals policy: directive
  `Content-Signal`, keys `search`/`ai-input`/`ai-train`, values `yes`/`no`; an absent key states no
  preference, which is why a declining site emits `ai-train=no` alone rather than also asserting a
  `search` value it has no standing to state. Source: `src/lib/delivery/robots.ts:4-9` (module
  comment quotes the same policy URL and reasoning verbatim: "An absent key is no expressed
  preference, which is why decline emits ai-train=no alone"). [verified]
- `f:yjumtj` `markdownResponse` serves the raw stored markdown body directly (cairn stores markdown natively),
  never a reconstruction from rendered html; `markdownLoad` is what applies the `noindex` refusal,
  so a lookup that bypasses it (a hand-rolled `site.byPermalink` call) would serve a body the
  enumerator never listed. Source: page text `docs/reference/delivery-data.md:266-272`,
  corroborated by the verified `markdownLoad`/`isNoindex` fact above
  (`src/lib/delivery/public-routes.ts:225-256`). [verified: via cross-reference]
- `f:oduq77` `buildNewlyPublished` is pure and node-safe: it performs no I/O, reads no clock, and the engine
  sends nothing over the network itself; a consumer wiring announce-on-publish must persist the
  prior deployed manifest itself, since the engine keeps no cross-deploy state. Renaming a
  published entry changes its `concept`/`id` key (cairn's identity model), so a rename reads as a
  newly-published entry to this helper (the old key's stamped row disappears from `after`; the new
  key has no stamped counterpart in `before`). Source: `src/lib/delivery/manifest.ts:40-44` (doc
  comment: "currently live (non-draft), `publishedAt` is set, and the same concept+id entry in
  `before` was [absent or unstamped]... `upsertEntry` preserves a prior `publishedAt` through an
  ordinary save") and `:59-62` (`priorStamps` keyed by `keyOf(e)` = concept+id; `if (!e.publishedAt)
  return false`). [verified]
- `f:wv457z` `buildNewlyPublished`'s draft exclusion is a separate, necessary check, not implied by
  the stamp comparison: a drafted entry can carry a `publishedAt` stamp forward from a prior
  publish (`upsertEntry` preserves it through a re-draft), so without the explicit
  `if (e.draft) return false` check such an entry could read as newly published even though its
  stamp differs from `before`. Source: `src/lib/delivery/manifest.ts:38-46` (doc comment) and
  `:60-64` (draft check precedes the stamp comparison). [verified]
- `f:gkrell` `ManifestEntry.publishedAt` (ISO 8601 UTC) is set once, at the publish commit that first lands
  the entry non-draft, and never overwritten or cleared afterward; `upsertEntry` preserves a prior
  `publishedAt` through an ordinary save. Source: `src/lib/delivery/manifest.ts:44` (doc comment,
  quoted above) matching the Types-table row in `docs/reference/delivery-data.md:549`. [verified]
- `f:445jgb` `/delivery/data`'s own charter forbids importing from `github`, `auth`, or `email`, enforced by a
  source-boundary test, so the delivery layer never pulls the backend or magic-link auth surface
  into a public bundle; `CairnAdapter` is the one deliberate exception, since its own body reaches
  all three through its `roles`, `access`, and `backend` members. Source:
  `src/tests/unit/delivery-entry-boundary.test.ts` (file exists and its name matches this exact
  boundary; its full assertion body was not read line-by-line this pass) and
  `docs/reference/delivery-data.md:577-583` (page text states the charter and the
  `CairnAdapter`-only exception). [verified: test file's existence and name confirmed; its
  assertion body not independently read]
- `f:cxwijh` Seventeen names `/delivery/data` once re-exported now import from their own declaring barrel
  instead, because nothing this subpath's public surface actually names them (root barrel:
  `AssetConfig`, `SenderConfig`, `NavMenuConfig`, `PreviewConfig`, `SiteRender`,
  `ComponentRegistry`, `ComponentDef`, `ComponentContext`, `SlotDef`, `IconSet`, `MediaResolve`;
  `/sveltekit`: `NavLayout`, `NavLayoutEntry`, `NavLayoutEngineRef`, `NavLayoutSection`;
  `/islands`: `IslandRegistry`; `/media`: `MediaRef`). Source: `src/lib/delivery/data.ts:8-18`
  (comment: "the adapter-only members ... are NOT re-exported here: nothing this subpath publishes
  names them, so they resolve from their own canonical homes instead"); a grep of the file for
  all seventeen names finds none of them. [verified]
- `f:950l0z` `createSiteIndexes`'s returned object reserves the field name `site` for the cross-concept
  resolver, so a site cannot declare a content concept literally named `site`. Source:
  `src/lib/delivery/site-indexes.ts:23` (doc comment: "`site` is not supported, since `site` is
  the reserved resolver key"), `:49-51` (throws when `descriptor.id === 'site'`). [verified]

## docs/reference/guidance.md

- `f:vhxkab` `cairn-guidance install`'s containment boundary is the real directory `.claude` under the resolved working directory, not a lexical path prefix: the working directory goes through `realpath` (so a project reached through a symlinked parent still installs), then every path component from `.claude` down is `lstat`-ed, and a symlinked component, a symlinked destination, or a destination that already exists as a directory is refused by name while the run continues. A symlink at a `<dest>.orig` path is refused as well, and the destination beside it is also refused and not overwritten in that run, since the recovery copy could not be made; the `.orig` is created with an exclusive, no-follow open, so a dangling link cannot be written through. Both the `.orig` path and the destination beside it land in `report.refused`, so an operator reading the report sees which destination was left stale, not only its `.orig` sibling. Source: `src/lib/guidance/install.ts` (`resolveWritableDest`, `preserveOriginal`, `isGuidancePath`, `installGuidance`). [verified]
- `f:x5grdm` A write failure during `cairn-guidance install` (an `ENOSPC`, an `EACCES`, ...) is reported through `InstallReport.writeErrors`, a list of `{ path, code }` entries, separate from `report.refused`: a disk or permissions error is not folded into the containment refusals, so the bin's printed line names the errno code rather than misattributing the failure to a symlink or an out-of-bounds path. Source: `src/lib/guidance/install.ts` (`installGuidance`'s write `catch`), `src/lib/guidance/bin.ts` (`write error` print line). [verified]
- `f:h2wtin` The package ships exactly 4 bins total (`cairn-manifest`, `cairn-media-seed`, `cairn-audit`,
  `cairn-guidance`) plus a separate `./vite` export (the Vite plugin, `dist/vite/index.js`,
  distinct from the `cairn-manifest` bin at `dist/vite/bin.js`); relative to `cairn-guidance`
  itself, that is three other bins. Source: `package.json:198-203` (`bin` field),
  `package.json:182-185` (`./vite` export). [verified]
- `f:hiif6u` `cairn-guidance install` ships a fourth skill, `cairn-public`, for the public side of a site: a router `SKILL.md` within the 3,500-token packaged budget, and `references/` holding one catalogue page per public piece (each registry directive plus the built-in `figure` and `include`, each island, `CairnHead`, `PreviewBanner`, each `cairn-*` class the chassis `composition.css` defines, and six prose pages). `npm run check:public-skill` fails a source with no page, a snippet class absent from the showcase's compiled public sheet and the emitted-class registry, a named token that resolves nowhere, and a parser that matches nothing. Source: `skills/cairn-public/SKILL.md:1`, `scripts/checks/check-public-skill.mjs:1`. [verified]
- `f:qzsspl` The chassis `tokens.css` excludes the project-root `.claude/` from Tailwind's automatic source detection with `@source not "../../.claude"`. Tailwind resolves that path against the stylesheet that carries it, so the earlier `./.claude` excluded only a directory beside `src/chassis/`, and a utility used only in an installed skill's files reached a scaffolded site's compiled CSS. `check:public-skill` compiles a standalone copy to prove the exclusion. Source: `examples/showcase/src/chassis/tokens.css:55`, `scripts/checks/check-public-skill.mjs:1`. [verified]

## docs/reference/islands.md

- `f:ychaxj` `hydrateIslands` mounts with Svelte's own `mount()`/`unmount()` directly, no framework
  abstraction. Source: `src/lib/islands/index.ts:8` (`import { mount, unmount, ... } from
  'svelte'`). [verified]
- `f:42mh10` `hydrateIslands` is idempotent across navigation: it tears down the previous pass (unmounting
  live instances, disconnecting pending `IntersectionObserver`s) before mounting again, so a
  second call over the same DOM mounts one instance per boundary rather than stacking duplicates.
  Source: `src/lib/islands/index.ts:15-29` (`teardown()`, `observers: IntersectionObserver[]`,
  `unmount(instance, { outro: false })`). [verified]
- `f:0tsan7` `unmount` runs with `outro: false` so teardown is synchronous and deterministic on navigation.
  Source: `src/lib/islands/index.ts:20`. [verified]
- `f:nyuzyz` A component that throws on teardown must not block the rest (each unmount call is isolated).
  Source: `src/lib/islands/index.ts:29`. [verified]
- `f:bh6css` `root` for `hydrateIslands` defaults to `document`; passing a narrower `ParentNode` scopes the
  scan to one region. Source: `src/lib/islands/index.ts:78`
  (`export function hydrateIslands(islands: IslandRegistry, root: ParentNode = document)`).
  [verified]
- `f:exr3dd` A `hydrate: 'visible'` island defers to first intersection via `IntersectionObserver`, mounting
  once the boundary scrolls into view, then stops observing. Source:
  `src/lib/islands/index.ts:56-67` (`observeIsland`: on `entry.isIntersecting`, calls
  `self.disconnect()` before `mountIsland(node, Comp)`). [verified]
- `f:54yivg` One bad island never breaks the page: `hydrateIslands` leaves the static fallback in place when
  a boundary names an unregistered directive, the prop payload fails to parse, or the component
  throws on mount; each case is caught and isolated. Source: `src/lib/islands/index.ts:78-86`
  (`if (!Comp) continue`, unregistered directive) and `:39-53` (`mountIsland`: a `JSON.parse`
  failure `return`s before touching the DOM; a `mount()` throw restores the saved `fallback`
  nodes). [verified]
- `f:4kmm3i` The island boundary is a `<div>` with `data-cairn-island` (the directive name), `data-cairn-props`
  (JSON.stringify'd declared scalar attributes; number/boolean fields serialize as JSON
  number/boolean, everything else stays the literal string), and `data-cairn-hydrate="visible"`
  present only on a `'visible'` island. Source: `src/lib/render/rehype-dispatch.ts:122-137`
  (`islandBoundary`: `{ type: 'element', tagName: 'div', properties: { dataCairnIsland: name,
  dataCairnProps: JSON.stringify(serializeIslandProps(...)) } }`, plus `dataCairnHydrate =
  'visible'` only `if (def.hydrate === 'visible')`) and `:107-120` (`serializeIslandProps`
  coerces only declared `number` fields via `Number(value)`, everything else stays as-is).
  [verified]
- `f:j390f9` Island props are HTML-attribute-escaped on emit and `JSON.parse`-d in a try/catch on the client,
  safe against breakout only because the value never enters a script context; an island component
  must bind props to text only and never route a prop into `{@html}`, an `href`/`src` that could
  carry `javascript:`, or an inline `style`. Source: `src/lib/islands/index.ts:39-45` (`mountIsland`
  reads `data-cairn-props` via `JSON.parse` inside a try/catch); the sink-avoidance rule itself is
  authoring guidance for a site's own component code, not an engine-enforced check, stated at
  `docs/reference/islands.md:125-127`, and is consistent with `JSON.parse` never executing code
  and Svelte's default `{expr}` binding rendering as text. [verified]
- `f:7sc3pe` The edit page's preview frame is sandboxed (`sandbox=""`), so scripts never run there and the
  island runtime never mounts in the preview; verify a live island on the deployed page. Source:
  `src/lib/admin/EditPage.svelte:2189` (`<iframe sandbox="" ... srcdoc={previewDoc} ...>`);
  the empty `sandbox` attribute blocks script execution by the HTML sandboxing spec (no
  `allow-scripts` token). [verified]

## docs/reference/log.md

- `f:avc1a2` `createLogger` (`/log`) redacts three levels deep into plain objects and arrays, marks a repeated
  reference `'<repeated>'`, and leaves a key at level four or deeper as written. Both sides of the
  key comparison normalize (lowercased, `-` and `_` removed, compared whole), so `REDACTED_LOG_KEYS`
  spells each name once; it now also carries `csrf` and `csrf_token` (both, since normalization maps
  `csrf_token` to `csrftoken`, not `csrf`). `createLogger(options?: { redactKeys?: readonly string[]
  })` unions a site's own names with the defaults and cannot narrow them. `REDACTED_LOG_KEYS` and
  `CAIRN_LOG_EVENTS` are both frozen. A throwing getter anywhere in a call's own `fields` cannot
  throw out of `log.info()`/`.warn()`/`.error()`: the record build runs inside a `try`/`catch`
  wrapping `emit`, and a caught failure emits `{ level, event, timestamp, fields: '<unserializable>'
  }` instead. Source: `src/lib/log/create.ts`, `src/lib/log/events-list.ts`. [verified]

## docs/reference/log-events.md

- `f:pfy9cw` `content.field_unmarked` carries `concept` (the concept id) and `field` (the unmarked
  multiselect's name); `admin.action.session_absent` carries `path`; `admin.action.unaudited`
  carries `path` and `editor`; `admin.action.misconfigured` carries `path` and `reason`;
  `config.access_unmapped` carries `unmapped`, the sorted concept ids and fixed screens with no
  rule. Source: `src/lib/delivery/content-index.ts:101`, `src/lib/sveltekit/admin-action.ts:209,309`,
  `src/lib/sveltekit/section-action.ts:212`, `src/lib/sveltekit/admin-nav.ts:330-333`. [verified]
- `f:rkj7tn` Every log record carries an envelope of `level`, `event`, `timestamp`, plus event-specific
  fields; renaming an `event` name is a breaking change. Source: `src/lib/log/create.ts:10-12`
  (`LogRecord` type), `src/lib/log/events.ts:1-3` (comment: "it is public-observable API: renaming
  one is a breaking change"). [verified]
- `f:k085q0` The only event whose `actor` field is not necessarily an editor's email is
  `audit.sink.write_failed`, since a caller can invoke `createD1AuditSink` directly with its own
  domain events. Source: `src/lib/sveltekit/admin-action.ts:33-38` (`AdminActionAuditRecord` doc:
  "`actor` then holds whatever identity that event names, and need not be a cairn editor") and
  `src/lib/sveltekit/audit-sink.ts:122-129` (`audit.sink.write_failed` logs the record's own
  `actor` field verbatim). [verified]
- `f:wi766c` No log record ever carries a magic-link token, a session ID, or a magic-link's contents. Source:
  `src/lib/sveltekit/auth-routes.ts:186,236,242,364` (`auth.link.requested`/`auth.token.*` log
  only `email`/`expiresAt`) and `src/lib/auth-channel/factory.ts:658,1061,1068`
  (`auth.channel.session.*` logs only `correlationId`, never the session id or token). [verified]
- `f:pc9vix` `auth.link.requested`'s `email` is the raw submitted address, logged before the allow-list check,
  after lowercasing, trimming, and capping at 320 characters; a flood of distinct addresses there
  signals a request flood since the endpoint has no auth. Source:
  `src/lib/sveltekit/auth-routes.ts:179-186` (`.trim().toLowerCase()`, then
  `log.info('auth.link.requested', { email: email.slice(0, 320) })`, called before the allowlist
  lookup below it). [verified]
- `f:mjedcx` `auth.identity.unknown`'s `email` is the identity gate's confirmed address,
  normalized and capped the same way as `auth.link.requested`, but it is logged AFTER the
  allow-list lookup fails, inside the `if (!row)` branch once `findEditor` has already returned
  null, not before it; every other event's `email` fires only for an allow-listed editor. Source:
  `src/lib/sveltekit/guard.ts#createAuthGuard.handle` (`const row = await findEditor(...); if (!row) { ...
  log.warn('auth.identity.unknown', ...) }`). [verified: page fixed at `docs/reference/log-events.md:111`
  to say logged after the allow-list check fails]
- `f:2awy1w` `preview.refused` reasons, in check order: `bindings_missing`, `table_missing`, `unknown`,
  `expired`, `row_invalid`, and then either `draft_invalid` or `branch_gone`. Source:
  `src/lib/sveltekit/preview.ts:262` (`PreviewRejectedReason` union: `unknown | expired |
  branch_gone | row_invalid | draft_invalid | table_missing`) and lines 456-518 (the emit call
  sites in that order: `bindings_missing`, `table_missing` x2, `row_invalid`, `branch_gone`,
  `draft_invalid`). [verified]
- `f:rdwesf` Every outward response to a `preview.refused` case is an identical 404, except
  `bindings_missing`, which answers 503. Source: `src/lib/sveltekit/preview.ts:265-268`
  (`rejectPreview` always `throw error(404, ...)`) and `:454-457` (`bindings_missing` branch
  `throw error(503, 'Service unavailable')`). [verified]
- `f:vrdrrb` `commit.reverted` fires alongside the ordinary `commit.succeeded` for the same branch commit
  (two log lines per successful revert). Source:
  `src/lib/sveltekit/content-routes-entry-revert.ts:176-177` (`log.info('commit.succeeded', ...)`
  immediately followed by `log.info('commit.reverted', ...)`). [verified]
- `f:doq8s2` `guard.refused` `reason: "csrf"` discriminates by `witness`: a header witness that arrives at all
  decides outright (covers raw-body upload, media, dictionary, tidy transports); the form-field
  witness applies only when no header arrives; an empty header value still counts as "arrived" and
  is judged on its own mismatch, never falling back to the field. Source:
  `src/lib/sveltekit/guard.ts:264-283` (`headerSent = ... !== null`; `verdict = headerSent ?
  csrfHeaderVerdict(...) : await csrfTokenVerdict(event)`; the log's `witness` field is
  `headerSent ? 'header' : 'field'`). [verified]
- `f:v1jj2k` `admin.action.session_absent` is the only trace a `createAdminAction`-mounted route leaves for a
  session that lapsed between the guard's resolve and the action running, since the guard's own
  `guard.refused` csrf branch refuses an earlier condition. Source:
  `src/lib/sveltekit/admin-action.ts:146-153,207-211` (`if (!editor) { log.warn('admin.action.
  session_absent', ...); throw redirect(303, '/admin/login'); }`, the first check the wrapper
  runs). [verified]
- `f:yauo4m` `audit.sink.call_failed` omits `record.detail` to avoid duplication (the full record already
  logged one line earlier as `admin.action.audited`), while `audit.sink.write_failed` persists the
  whole truncated record since it is the only surviving trace of a row the packaged sink itself
  failed to write. Source: `src/lib/sveltekit/admin-action.ts:263-271` (`audit.sink.call_failed`
  logs `path, action, entity, entityId, editor, error`, no `detail`) and
  `src/lib/sveltekit/audit-sink.ts:122-129` (`audit.sink.write_failed` logs `reason, actor, action,
  entity, entityId, detail, error`). [verified]
- `f:mou1li` Composition-time event `config.access_unmapped` runs once at module evaluation (composition, not
  per request), so it appears at most once per isolate on a cold start, and a Workers Logs query
  scoped to a live request window can miss it entirely. Source:
  `src/lib/sveltekit/admin-nav.ts:283-297,330-333` (`validateAccessComposition`'s doc: "Validate a
  site's declared access map once at composition (server start)"; `log.warn('config.
  access_unmapped', ...)` fires from that one validation function, not a per-request path).
  [verified]
- `f:hdw91h` `branch` (`cairn/<concept>/<id>`) appears on `commit.succeeded`, `commit.failed`, and
  `publish.failed` only on the save path; deletes, renames, and nav saves commit to the default
  branch and omit it. Source: `src/lib/sveltekit/content-routes-entry-write.ts:292` and
  `content-routes-entry-revert.ts:150` (`commitFields` includes `branch`) versus
  `content-routes-entry-destructive.ts:172,390`, `nav-routes.ts:153`,
  `content-routes-media-*.ts`, and `content-routes-settings.ts:302,439` (`commitFields` omits it).
  [verified]
- `f:vyzrjo` `entry.published`'s `batch` field is `true` for a publish-all and `false` for a single publish; a
  failed publish-all logs one `publish.failed` per entry. Source:
  `src/lib/sveltekit/content-routes-entry-write.ts:382` (`batch: false`, single publish) versus
  `:488` (`batch: true`, inside the publish-all loop) and `:493` (`logCommitFailed(..., err,
  'publish.failed')` called per entry inside that same loop). [verified]
- `f:na2bn6` Across the `media.*` family, `hash` is the asset's content hash and stable identity from upload
  through delete. Source: `src/lib/sveltekit/content-routes-media-ingest.ts:204` (`media.uploaded`
  carries `hash`), `content-routes-media-delete.ts:164,201` (`media.delete_refused`/`media.deleted`
  carry `hash`), `content-routes-media-metadata.ts:368,390` (`media.replace_refused`/`media.
  replaced` carry `oldHash`/`newHash`), and `src/lib/render/resolve-media.ts:99` (`media.
  resolve_missing` carries `hash`). [verified]
- `f:z2joe0` `dictionary.*` and `tidy.*` records never carry document content or an API key, only the editor,
  the model, and the outcome. Source: `src/lib/sveltekit/content-routes-dictionary.ts:131,140,146`
  (`editor`, `wordCount`, `retried`) and `content-routes-tidy.ts:195-252` (every `tidy.*` call
  logs only `editor`, `model`, `reason`/`tokens`, never body text or a key). [verified]

Filed by pass A task 4, for the tool-side section task 7 folds into this page.

- `f:ulw0xh` The Go `cairn` tool carries its own copy of the engine's event-name list, for `--event`
  completion only. It is a literal Go slice rather than a value generated from the TypeScript
  source, because a `go install` build reaches no `src/lib` tree at all. Source:
  `tool/internal/logs/events.go:3-7,92`. [verified]
- `f:v35jst` A test keeps that copy in step with `src/lib/log/events.ts`, reading the union through
  `providers.RepoRoot()` and failing when the two sets differ, so an event the engine adds fails
  the tool's gate rather than drifting silently. Source:
  `tool/internal/logs/events_test.go:33-58`. [verified]
- `f:9aa96j` `cairn logs` does nothing to a record: it prints what the endpoint returned and never rewrites,
  truncates, or reinterprets a field's value. Source: `tool/internal/render/json.go:407-431`.
  [verified]
- `f:r5pqhd` A plain `cairn logs` run prints an unconditional stderr notice that its output carries
  identifiers and is not safe to paste in public; under `--json` stderr carries nothing but an
  error, so the same notice travels as the payload's own `containsPersonalData` field. Source:
  `tool/cmd/cairn/messages.go:150`, `tool/cmd/cairn/logs.go:70-74`,
  `tool/internal/render/json.go:155-157`. [verified]
- `f:fyosog` `cairn health --since` and `cairn logs --since` share one grammar, a positive integer followed
  by `m`, `h`, or `d`, which is Go's duration parsing narrowed rather than widened. A bare
  integer, a negative value, a zero, a float, and any other unit each fail naming the grammar.
  Source: `tool/internal/logs/logs.go:88-97`, `tool/cmd/cairn/logs.go:44,66`. [verified]

## docs/reference/media.md

- `f:r8vksa` `normalizeAssets` with an absent `assets` block returns `{ enabled: false }` rather than
  throwing; a declared block must name its bucket binding and a known `urlForm`, else throws a
  `cairn:`-prefixed error. Source: `src/lib/media/config.ts:56-63` (`if (assets === undefined)
  return { enabled: false }`; `throw new Error('cairn: a media assets block must name its R2
  bucket binding')`; `throw new Error('cairn: media urlForm must be "slug" or "opaque" ...')`).
  [verified]
- `f:ckuow3` The built-in transform presets are exactly `thumb`, `inline`, `card`, and `hero`; a site cannot
  declare its own named presets and must build a Cloudflare `/cdn-cgi/image/<options>/<path>` URL
  directly for a size beyond the four. `variantUrl`/`presetUrl` are engine-internal, not public
  surface. Source: `src/lib/media/config.ts:44-49` (`BUILT_IN_PRESETS = Object.freeze({ thumb,
  inline, card, hero })`); the site-declared `variants` field and `validateVariant` were retired
  per `src/lib/media/transform-url.ts:52-58` ("validateVariant was retired alongside the
  site-declared `variants` field (ruling 4, 2026-09-01)"); `variantUrl`/`presetUrl` are exported
  only from `src/lib/media/index.ts` re-exports internal to the package, not a documented public
  subpath. [verified]
- `f:rq0kcr` The media manifest is keyed by a 16-hex content-hash prefix. Source:
  `src/lib/media/manifest.ts:16,42,80` (`/^[0-9a-f]{16}$/` hash validation). [verified]
- `f:fhnvn8` `readCommittedManifest` degrades a missing file to an empty manifest for a glob with no match
  (returns `{}`), but a static import of an absent `media.json` fails the Vite build before any
  runtime degrade can run, so a fresh site cannot build with a truly missing manifest file.
  Source: `src/lib/media/manifest.ts:56-66` (doc comment states this exactly: "degrading a
  missing file to an empty manifest. A static import of an absent media.json fails the Vite
  build before any runtime degrade can run"; `readCommittedManifest` calls `parseMediaManifest`
  on `Object.values(globResult)[0]`, `undefined` when the glob matched nothing, and
  `parseMediaManifest` returns `{}` for any non-object input). [verified]
- `f:8c6on8` The canonical `media:` token form is `media:<slug>.<hash>`, with the bare `media:<hash>` form
  also valid. Source: `src/lib/media/reference.ts:1-5,25-35` (module comment and
  `parseMediaToken`: splits on the last dot, `dot === -1` case falls back to `HASH_RE.test(rest)`
  for the bare form). [verified]
- `f:c8c9ji` `createMediaResolver` builds the delivery path from the manifest entry's slug and ext, not the
  token's, so a rename never breaks the reference; it returns `undefined` when media is off or no
  entry carries the hash (the preview-miss backstop). Source: `src/lib/render/resolve-media.ts:78-84`
  (doc comment states this verbatim) and `:89-101` (`createMediaResolver`: `if (!resolved.enabled)
  return undefined`; `if (!entry) { log.warn(...); return undefined; }`; the returned path uses
  `entry.slug, entry.hash, entry.ext`, never `ref`'s own slug). [verified]
- `f:wdmlys` The resolved image gets intrinsic `width`/`height` from the manifest entry when known
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

## docs/reference/public-css.md

- `f:q8atv6` `.cairn-focus-ring:focus-visible` is a rule in `@layer components`, so it takes no variants and sits below utilities: a utility that sets `outline-*` on the same element wins, and so does a daisyUI component class that sets an outline, since daisyUI's own rules sit in a later layer. A copied `prose.css` whose links read the ring's keys (`--cairn-focus-ring-outline`, `--cairn-focus-ring-offset`) draws a visible outline once the sheet declares them; those keys were undeclared for a site that did not copy the ring, and the outline computed to nothing. Source: `src/lib/public/cairn-public.css:99-106`, `examples/showcase/src/chassis/prose.css:154-155`. [verified]
- `f:c4nnu9` The engine ships its public defaults as one CSS asset, `@glw907/cairn-cms/cairn-public.css`, built from `src/lib/public/cairn-public.css` and packed at `dist/public/cairn-public.css`. It holds four things: the roles in `@layer theme` on `:root, [data-theme]` (18 keys), two `@theme` colors (`--color-muted`, `--color-card-border`), `@layer components` rules with no design choice (`pre.shiki`, the six `.cairn-tok-*` classes, `.table-scroll`'s structural pair, `.cairn-focus-ring:focus-visible`), and one `@source` line over the public component directory. The subpath has no `.d.ts`, so `check:reference` excludes it (`SUBPATH_EXCLUSIONS`) and `src/tests/unit/cairn-public-surface.test.ts` holds `docs/reference/public-css.md` to the file: every key with its default, and no cairn key the file lacks. Source: `package.json:195` (`"./cairn-public.css": "./dist/public/cairn-public.css"`), `src/lib/public/cairn-public.css:21-111`, `scripts/checks/reference-coverage.mjs:536`. [verified]
- `f:w6pqic` The public sheet's derived defaults differ from the values a copied pre-export `tokens.css` carried. Each status ink is `color-mix(in oklab, var(--color-<status>) 50%, var(--color-base-content))` where it was the fill itself. `--color-muted` is `color-mix(in oklab, var(--color-base-content) 80%, var(--color-base-100))`, an opaque mix, where it was a 60 percent mix of `--color-base-content` with `transparent`. `--cairn-shadow` keeps its geometry (a 6 percent and a 12 percent layer) but mixes `black`, where it mixed `--color-base-content`. The 50 and 80 come from a Chromium measurement over the 35 stock daisyUI themes, Waymark, and the fixture theme, recorded with each theme's result. A theme that needs a fixed value sets the key itself, and Waymark does. Source: `src/lib/public/cairn-public.css:38-52,61`, `docs/superpowers/research/2026-09-29-theme-pass-c-ink-derivation.md` (the Result table). [verified]
- `f:7653l0` The two `@theme` colors do not recompute inside a nested `data-theme` region: Tailwind resolves them at `:root` and the region inherits the computed value. The roles do recompute, because the sheet declares them on `[data-theme]` as well as `:root`, so a derived ink inside a nested region mixes that region's own fill. A theme that nests a region sets `--color-muted` and `--color-card-border` in the nested block. A comma-bearing value such as `--cairn-shadow` does not survive daisyUI's option parser and goes in that scheme's `:root` block. `theme-contrast` measures the root element only, so it does not measure a nested region. Source: `src/lib/public/cairn-public.css:21-23,60-63` (`:root, [data-theme]` in `@layer theme`; `@theme` colors), `docs/reference/cairn-audit.md#what-theme-contrast-doesnt-cover` (the root-only bullet). [verified]

## docs/reference/public.md

- `f:6q5q05` `PreviewBanner` renders the expiry inside a `<time datetime>` formatted by default as a fixed
  `YYYY-MM-DD HH:MM UTC` string (never the visitor's locale), specifically because the same
  formatter must run identically during SSR and hydration to avoid a hydration mismatch when the
  Worker's runtime zone differs from the browser's. Source:
  `src/lib/public/PreviewBanner.svelte:45-49` (`defaultFormatExpiry`), `:55-61` (doc comment:
  hydration-mismatch rationale), `:71` (`<time datetime={preview.expiresAt}>`). [verified]

- `f:vvag2y` `@glw907/cairn-cms/public` (`./public`) is the barrel for built-in public components that render styled
  markup, and it carries `PreviewBanner` only. The membership rule: such a component lives here and
  never on `/admin`; a loader or a type belongs on `/sveltekit` or another data-only subpath; and
  `CairnHead` stays at `./delivery/head` because it renders only document-head tags. The compiled
  admin sheet's input scans `src/lib/admin` and `src/lib/admin-toolkit` but not `src/lib/public`, since the banner writes no utility class of its own.
  Source: `package.json:114-118` (the `./public` export), `src/lib/public/index.ts:1-6` (the
  membership rule and the one export), `scripts/build/admin-css.input.css:14,22` (the `@source` roots, `src/lib/admin` and `src/lib/admin-toolkit`).
  [verified]

## docs/reference/README.md

- `f:u1y47n` Three stability tiers exist: Extension API (frozen), Scaffold API (frozen, for copied
  scaffold-owned wiring), Unstable API (no cross-minor promise). Source:
  `scripts/checks/reference-coverage.mjs:68-91` (comment: "Extension and Scaffold API are the
  frozen contract, Unstable API marks a name..."; the check enforces the Stability cell reads one
  of exactly these three values). [verified]
- `f:vljn9d` `check:reference` fails stale prose: a name that appears in a Types table row, a bare export
  heading, or a `declare` signature but is no longer a real export anywhere fails the build.
  Source: `scripts/checks/reference-coverage.mjs:188-205` (`staleNames`, "names ... that are no
  longer real exports anywhere in the package (rule b, the reverse check / stale-prose ...)")
  and `:285-292` (`declare function/const/class` names extracted from signature blocks feed the
  same stale-name pool). [verified]
- `f:469b7m` Reference pages are the extend track's and admin track's shared lookup surface; two of them
  (`log-events`, `supported-toolchain`) additionally serve a site admin reader. `doctor.md` left
  this list when the doctor retirement deleted it, and the page that documents the replacement
  command, `cli-cairn-doctor.md`, is not in this list either. Source: `docs/reference/README.md:86-93`
  ("Also for site admins" section lists exactly `log-events.md`, `supported-toolchain.md`).
  [candidate: excluded, this is docs/reference/README.md's own editorial grouping of its pages;
  no check or code (searched `scripts/checks/reference-coverage.mjs`) enforces which pages count
  as "also for site admins", so there is no code line to trace it to]
- `f:yvusht` Eleven pages document no export subpath: the four npm CLI pages, the three `cairn` CLI
  contract pages, the canonical admin mount, log events, admin grammar tokens, and supported
  toolchain. Source: `docs/reference/README.md:95-104` ("Pages that document no subpath" names
  exactly 11: `cairn-manifest`, `cairn-guidance`, `cairn-media-seed`, `cairn-audit`,
  `cli-cairn-exit-codes.md`, `cli-cairn-json-output.md`, `cli-cairn-doctor.md`,
  `admin-routes.md`, `log-events.md`, `admin-grammar-tokens.md`, `supported-toolchain.md`); the
  old `doctor.md` page is gone, and `cli-cairn-doctor.md` (documenting the replacement `cairn
  doctor` command, a separate page rather than a rename) is one of the 11. [candidate: excluded,
  this is docs/reference/README.md's own editorial list of which pages document no subpath; no
  check (searched `scripts/checks/reference-coverage.mjs`) generates or enforces this specific
  list, so there is no code line to trace it to]

## docs/reference/render.md

- `f:mejght` `/render` is type-only: it ships no hast-building helper toolkit; a component's `build(ctx)`
  builds hast directly with hastscript's `h()`. Source: `src/lib/render/authoring.ts:1-6`
  (module exports only `ComponentContext`; comment states the hast-building helpers were
  "re-homed to site-owned code"). [verified]
- `f:mxsfpj` `cairn-grid` is stamped by `markFirstList` onto the first `<ul>` inside a component's stamped
  children; `markFirstList` has no public export. Source: `src/lib/render/rehype-dispatch.ts:26-32`
  (`markFirstList`, `className: ['cairn-grid']`). [verified]
- `f:uzducy` The admin sheet owns roughly sixty of its own `cairn-*` classes (`cairn-type-*`, `cairn-chip-*`),
  documented in the admin design system, a separate registry from the emitted-markup side this page
  documents. Source: `docs/internal/admin-design-system.md` (49 distinct `--cairn-*`/`.cairn-*`
  names in the doc's own prose; a grep of `src/lib/admin` and `src/lib/admin-toolkit` for
  `--cairn-*`/`.cairn-*` tokens including size-modifier variants returns 82), consistent with
  "roughly sixty" as an order-of-magnitude figure. [verified]
- `f:4d9ssv` `cairn-icon-label` is an admin-toolkit label class, not emitted by any render helper. Source:
  `docs/internal/admin-design-system.md:1109` (`.cairn-icon-label` recipe in `cairn-admin.css`);
  no occurrence under `src/lib/render/`. [verified]
- `f:x8y1hd` `renderGlyph` itself stamps only the `cairn-glyph` class; `cairn-head` and
  `cairn-icon`/`cairn-icon-secondary` are built by site (chassis) code, not by `renderGlyph` or
  any other engine export. Source: `src/lib/render/glyph.ts:16-22` (single `className:
  ['cairn-glyph']`), `examples/showcase/src/chassis/render.ts:20-23,28-33` (`makeIconRenderer`,
  `headRow` building `cairn-head`/`cairn-icon`). [verified]

- `f:5vw8k1` The emitted-class registry on `render.md` names `pre.shiki`, the six `cairn-tok-*` token classes, `cairn-place-center`, `cairn-place-wide`, `cairn-place-full`, and `table-scroll`, each with who styles it. The sheet styles `pre.shiki`, `cairn-tok-*`, and `table-scroll`'s structural pair; a theme must style `cairn-place-*`. `cairn-focus-ring` is styled by the sheet and is not in the registry, because the engine never writes it into markup. `cairn-public-surface.test.ts` asserts every class the sheet's component-layer rules style is in the registry, apart from that one. Source: `src/lib/render/highlight.ts:1-25` (the `pre.shiki` wrapper and token classes), `src/lib/render/remark-figure.ts:20,83-86` (the three placement roles), `src/lib/render/table-scroll.ts:52-58` (the `table-scroll` wrapper). [verified]

## docs/reference/reproductions.md

- `f:htc6yy` The mounted `repro` subtree is `inert`, and a modal dialog a story opens is marked inert as it
  opens via a capture-phase `focusin` listener that also releases the focus the dialog took (the
  HTML inert algorithm exempts the topmost modal dialog from an ancestor's inertness). Source:
  `src/lib/reproductions/ReproContext.svelte:14-20`. [verified]
- `f:fl39m3` Capture-phase listeners on `window` stop `keydown`, `pointerdown`, `dragover`, `drop`, and
  `beforeunload` before any handler sees them, for as long as the instance lives, and ahead of
  anything registered after it. Source: `src/lib/reproductions/ReproContext.svelte:20-21,34` and
  `docs/reference/reproductions.md:153-157`. [verified]
- `f:p5wg94` Neither `tabindex="-1"` nor `inert` on the host `<iframe>` prevents a loading, focusing frame
  from stealing focus, measured in Chromium, Firefox, and WebKit; only Firefox under `inert`
  releases the host's focus pin. A page embedding a story must record and restore
  `document.activeElement` around the frame load. Source: `src/lib/reproductions/ReproContext.svelte:42-44`
  and `docs/reference/reproductions.md:16-21`. [verified]
- `f:mpezqy` An inert subtree contributes no node to the accessibility tree, so a screen reader reaches none
  of the mounted markup; the embed's authored `alt` text is its entire accessible content. Source:
  `docs/reference/reproductions.md:12-14`, consistent with `ReproContext.svelte:16`. [verified]
- `f:qxd0bp` The manifest half (`/reproductions/manifest`) is strictly node-safe: nothing in its module graph
  may resolve to a `.svelte` specifier, enforced by `src/tests/unit/reproductions-manifest.test.ts`
  (source graph) and `reproductions-manifest-dist-spawn.test.ts` (spawns bare `node` against the
  built `dist/reproductions/manifest.js`). Source: `src/tests/unit/reproductions-manifest-dist-spawn.test.ts:1-27`
  (header comment: the sibling test "walks the SOURCE import graph and asserts no module reachable
  from the manifest is a `.svelte` component"; this spec instead "import[s] the specifier in a
  fresh plain-Node process against a throwaway consumer, outside the vitest transform"). [verified]
- `f:n9ngzl` `ReproContext` mounts exactly one story for its lifetime; its context, manifest lookup, and shell
  payload resolve once from the first-mounted `story` and never update on a later prop change.
  `ReproContext` itself throws if the `story` prop's `id` changes in place, so a route reusing one
  page component across a param change must key the mount on `story.id` with `{#key}`. Source:
  `src/lib/reproductions/ReproContext.svelte:236,241,251,305-311` (`mountedStoryId = untrack(() =>
  story.id)`; `if (story.id !== mountedStoryId) throw new Error(... "One ReproContext instance
  mounts exactly one story for its lifetime; wrap the mount in {#key story.id} to remount instead
  of swapping the story in place.")`). [verified]
- `f:09z8ya` `ReproContext` applies `story.context` first, then sets the media-base and CSRF context keys
  unconditionally, so a story's own `context` entry under either reserved key is always shadowed.
  Source: `src/lib/reproductions/ReproContext.svelte:211-233` (`resolveMount`: the `storyContext`
  loop runs first, then `setContext(MEDIA_BASE_CONTEXT_KEY, ...)` and `setContext(CSRF_CONTEXT_KEY,
  ...)` run unconditionally afterward, so a same-key entry in `story.context` is overwritten).
  [verified]
- `f:n4ugp4` The fence schema's four keys are `story`, `alt`, `caption` (all required) and `width` (optional,
  one of `narrow`/`desktop`/`wide`; omitting it means the responsive `column` default, and naming
  `width: column` explicitly is refused as a second way to say the same thing). Source:
  `src/lib/reproductions/validate.ts:36,40,73-80,120` (`REQUIRED_KEYS = ['story', 'alt',
  'caption']`; `RESPONSIVE_WIDTH = 'column'`; `if (width === RESPONSIVE_WIDTH) issues.push(...
  "is the responsive default, which a fence names by omitting width")`) and
  `src/lib/reproductions/manifest.ts:24-32` (`ReproHeights { wide?, desktop?, narrow? }`).
  [verified]
- `f:05hrwm` `validateReproFence`'s width rule requires the story's manifest entry to declare a height for the
  named width in `ReproHeights`; a story unable to show its subject at a width simply omits that
  height, and the schema refuses any fence pinning it there. Source:
  `src/lib/reproductions/validate.ts:120-137` (`pinnedWidths` is derived from
  `Object.keys(heights).filter(...)`; `if (!pinnedWidths.includes(width)) issues.push('width ...
  is not a declared height for this story ...')`). [verified]

## docs/reference/site-facts.md

- `f:ve30i2` `site-facts.json` carries exactly `version`, `mediaBucketBinding`, `roles`, and `aiPosture`;
  `owner`, `repo`, and `from` are never written, even when the adapter declares them.
  Source: `src/lib/vite/internal.ts:525-533,541-551` (`formatSiteFacts` writes only `version`,
  `mediaBucketBinding`, `roles`, and `aiPosture`; `buildSiteFactsFromVite`
  passes it the result of the shared `parseAdapterFacts` validation, never the raw parsed object).
  [verified]
- `f:vpk81e` An absent `site-facts.json` is not drift: `checkSiteFacts` returns `{ status: 'absent' }` and the
  `cairnManifest` plugin's `buildStart` reports exactly one build-log warning naming
  `npx cairn-manifest`, never failing the build. Source: `src/lib/vite/internal.ts:460-463,187-189`
  (`checkSiteFacts` returns early on a missing committed file; `buildStart` calls `this.warn` once
  with `siteFactsAbsentWarning(...)`). [verified]
- `f:eqlssz` A present `site-facts.json` that no longer matches the adapter fails the build through the same
  `this.error(...)` path the content manifest uses, naming the file and the fix. Source:
  `src/lib/vite/internal.ts:471-476,190-191` (`checkSiteFacts` compares the derived facts against
  the committed bytes and returns `{ status: 'stale', message }`; `buildStart` calls `this.error`
  with that message). [verified]
- `f:yio35u` The `cairn-manifest` CLI writes `site-facts.json` in the same run that writes the content
  manifest. Source: `src/lib/vite/bin.ts:28-29` (`main` calls `writeManifest` then
  `writeSiteFacts`). [verified]
- `f:z61ibp` `cairn-manifest`, the package's `bin`, uses the current working directory as the
  project root, so it runs from the directory holding `vite.config.ts`; the build's
  stale-`site-facts.json` error names the fix as ``Run `npx cairn-manifest` and commit the
  result.`` Source: `package.json:198-199`, `src/lib/vite/bin.ts:28-29`,
  `src/lib/vite/internal.ts:319-324,592-597`. [verified]

## docs/reference/supported-toolchain.md

- `f:0vkmhw` `check:target-stack` derives every "Target today" cell from the root `package.json` version,
  `engines`, and peer ranges, plus the showcase's `package.json`/`wrangler.jsonc`, and fails when a
  cell disagrees; it checks only that column. Source: `scripts/checks/check-target-stack.mjs:1-30`
  (header comment plus `targetCell()`, which matches each row's "Target today" cell against a
  computed expected value). [verified]
- `f:buh7cc` `engines.node` in the package's own `package.json` is `>=24`. Source: `package.json:7`.
  [verified]
- `f:xg1per` `svelte` peerDependency is `^5.57.1`; `@sveltejs/kit` is `^3`; `@cloudflare/workers-types` is
  `^5`. Source: `package.json:220-223`. [verified]
- `f:gjyk0p` The showcase's own devDependency pins `typescript` to `^6` and `@cloudflare/workers-types` to
  `^5.20261007.1` (a concrete build, not just the range). Source: `examples/showcase/package.json:37,57`.
  [verified]
- `f:isd7vq` TypeScript floor for a consumer's own `tsc` is `5.0`, driven by `const` type parameters on
  `defineAdapter`/`defineConcept`/`defineFieldset`/`fields.*`; the package's own code and shipped
  `.d.ts` are TypeScript 7-clean, but the scaffolded template still installs `^6` because
  `svelte-check`, `svelte2tsx` (under `@sveltejs/package`), and `typescript-estree` (under
  `eslint-plugin-tsdoc`) pin TypeScript to 6; TypeScript 7.1 (the first release with a
  programmatic compiler API) is expected October 2026. Source: `src/lib/content/adapter.ts:28`,
  `fields.ts:147-180`, `fieldset.ts:423`, `concepts.ts:49` (`<const ...>` type params confirm the
  5.0 floor); `node_modules/svelte-check` and `.../svelte2tsx` peerDependencies cap at `^6.0.0`,
  `@typescript-eslint/typescript-estree` (pulled in by `eslint-plugin-tsdoc`) caps at `<6.1.0` (a
  nested copy caps at `<6.0.0`, none reach 7); CHANGELOG.md:3201-3207 and :3238 ("TypeScript 7 is
  held; `svelte-check` cannot run on the Go compiler until 7.1's compiler API") and ROADMAP.md
  ("TypeScript 7 is held on the toolchain") corroborate the hold and its trigger. [verified]
- `f:5c9bwx` `attw --ignore-rules no-resolution cjs-resolves-to-esm internal-resolution-error` is run in
  `check:package`, muting three rules that are structural limitations of `svelte-package`'s output
  against `attw`'s resolver, not masked defects. Source: `package.json:37` (`check:package` script:
  `attw --pack . --ignore-rules no-resolution cjs-resolves-to-esm internal-resolution-error`).
  [verified]
- `f:256utj` SvelteKit's `csrf.checkOrigin` is deprecated (2.61) in favor of `csrf.trustedOrigins` but not
  removed (sveltejs/kit#15992); cairn's admin CSRF ownership still depends on disabling
  `checkOrigin`. Source: the SvelteKit deprecation version and issue number are an upstream fact
  quoted from the page, not independently checked against GitHub this pass. [rejected: SvelteKit 3
  removed `csrf.checkOrigin`, so a config that sets it fails the build, and cairn's admin
  no longer depends on disabling it; the showcase and template carry no `csrf` config,
  and the doctor's `config.csrf-disable-missing` condition retired]
- `f:aalmbd` The `@sveltejs/kit ^2.12` floor became an enforced peer range (rather than an advisory) in
  the `0.41.0` changelog entry, justified by the edit page reading `$app/state` (shipped in kit
  2.12.0); `0.51.0` is a separate, later entry that raises the `svelte` floor to `^5.56.3` and
  mentions `^2.12` only as a side note for a site still below it. Source: `CHANGELOG.md:7402-7405`
  (0.41.0 entry), `CHANGELOG.md:7291-7300` (0.51.0 entry). [verified]

## docs/reference/sveltekit.md

- `f:6rvhxl` `RequestOutcome`'s awaited-send behavior (`requestAction` awaiting the magic-link
  email before responding) dates to `0.38.0`, when the type was named `RequestResult` with a
  `status` discriminant (`sent`/`send_error`/`throttled`); the `0.97.0` outcome-idiom sweep
  renamed it to `RequestOutcome`, changed the discriminant key to `outcome`, and restated
  `send_error` as `send-error`, with the `sent` boolean unchanged throughout. Source:
  `CHANGELOG.md:7467-7475` (0.38.0), `CHANGELOG.md:2330-2334` (0.97.0). [verified]
- `f:yubpho` `CairnEvent`'s `locals` carries five optional keys: `cairnEditor`, `cairnBackend`,
  `cairnAuditSink`, `cairnAccess`, and `cairnIdentity` (set under identity mode). sveltekit.md's
  event-shape code sample and prose now list all five. Source: `src/lib/sveltekit/types.ts:85-91`.
  [verified]

### Refusal channels (the load-bearing section, verified in full)

- `f:howa1l` `requireOwner`, `requireEditor`, and `requireAccess` perform authorization (throw on refusal);
  `requireSession` and `createAdminAction`'s own identity/CSRF checks perform authentication only,
  letting a `none`-capability session pass through unchanged. Source:
  `src/lib/sveltekit/admin-action.ts:215` (missing editor throws `redirect(303, '/admin/login')`,
  authentication only) and `:252` (CSRF mismatch throws `error(403, ...)`). [verified]
- `f:bp22uq` All five authorization/authentication helpers throw SvelteKit's own `error()` (403) or
  `redirect()` (303 to `/admin/login`); none needs a site `handleError` mapping. Source:
  `src/lib/sveltekit/admin-action.ts:215,252,311` (`redirect(303, ...)`, `error(403, ...)` at both
  the CSRF step and the opt-in authorization step). [verified]
- `f:r6cz7z` `fail()` is the shape for every refusal that can answer the request that raised it (form
  validation, commit conflicts, `createSectionAction`'s own authorization/rate-limit/binding
  branches); the editor's unsaved input survives in the returned payload rather than navigating
  away. Source: `src/lib/sveltekit/section-action.ts:206,213,264` (`fail(403, ...)`,
  `fail(500, ...)`, `fail(429, ...)`). [verified]
- `f:ge9vwl` A site defining its own `handleError` replaces SvelteKit's default `console.error` of every
  server error rather than layering on top of it; log first unconditionally or default
  server-error logging is lost silently. Source: page text, `docs/reference/sveltekit.md:448-458`;
  this is documented SvelteKit hook-replacement behavior (the hook fully replaces the built-in),
  not independently re-verified against SvelteKit's own source this pass. [external: SvelteKit]
- `f:rn1oxh` A small closed set of refusals can't answer in place because the request that surfaced them
  didn't originate on the concerned page: an expired/consumed magic link (confirm page bounces to
  login) and publish-all's outcome (posted from the topbar on any screen, lands on the first
  reachable concept list). Publish-all carries exactly three `?error=` codes:
  `nothing_to_publish`, `publish_conflict` (validated outcomes), and `publish_failed` (unexpected
  fault). Source: `src/lib/sveltekit/content-routes-entry-write.ts:501,525,533`
  (`redirect(303, '${listPage}?error=nothing_to_publish' | '...publish_conflict' |
  '...publish_failed')`) and `src/lib/sveltekit/refusal-codes.ts:17`
  (`RefusalCode = 'expired' | 'nothing_to_publish' | 'publish_conflict' | 'publish_failed'`, four
  total codes across both channels). [verified]
- `f:70336r` An unrecognized `?error=` value resolves to nothing (a crafted query string carries no meaning);
  the login/confirm pages and `listLoad`'s publish-all banner treat the resolved value as a boolean
  flag, never rendering the query value itself. Source: `src/lib/sveltekit/refusal-codes.ts:17-24`
  (`RefusalCode` union plus a fixed copy map keyed by that union; a value outside the union has no
  entry). [verified]
- `f:0wvvih` `createAuthGuard`'s own `Handle` refuses at the pre-routing layer, before any route's load or
  action runs, with a raw branded `Response` for CSRF, origin, HTTPS, missing-binding, or
  dev-backend-in-production failures. The dev-backend-in-production case is a 503, triggered when
  `CAIRN_DEV_BACKEND` is set in a deployed runtime. Source: `src/lib/sveltekit/guard.ts:198-201`
  (`CAIRN_DEV_BACKEND_FLAG` check, `log.error('guard.refused', { reason: 'dev_backend_in_prod' })`,
  `return new Response(CAIRN_DEV_BACKEND_MESSAGE, { status: 503 })`). [verified]
- `f:hrvhnz` The guard's pre-routing CSRF check screens the requests SvelteKit 3's own CSRF check
  screens: an unsafe method with no `Content-Type` header at all, or with one of
  `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`, or
  `application/x-sveltekit-formdata`. The no-header case covers a cross-origin `no-cors` fetch of an
  untyped `Blob`, which sends no preflight and which SvelteKit passes for an origin in
  `trustedOrigins`. A JSON POST is not screened by it, but SvelteKit itself rejects a
  non-form-content-type action POST with a 415 before the action runs, so this is license removed
  only for hand-rolling a JSON admin endpoint outside form actions. Source:
  `src/lib/sveltekit/csrf.ts:13-18,83-88` (`FORM_CONTENT_TYPES`, `isUnsafeFormRequest`),
  `node_modules/@sveltejs/kit/src/runtime/server/csrf.js` (`is_csrf_forbidden`), page text
  `docs/reference/sveltekit.md:484-493`; the SvelteKit 415 behavior itself is corroborating
  platform context, not independently re-checked. [verified: the guard's content-type coverage is confirmed in source]
- `f:suk99b` `createAdminAction`'s CSRF check order: a valid `X-Cairn-CSRF` header clears the step outright
  (checked first); only with no valid header must the posted `csrf` form field match the CSRF
  cookie, constant-time, else `error(403, ...)`. A fetch-based action that sets the header and
  posts `FormData` with no `csrf` field still passes. Source: `src/lib/sveltekit/guard.ts:265-287`
  (`headerSent = ... !== null`, header checked before the field fallback) mirrored in
  `admin-action.ts` per its own doc comment at lines 158-162. [verified]
- `f:yi9vag` `createAdminAction` runs its CSRF check right after its session check, and a request
  that fails it logs `admin.action.csrf_refused` as a warning and gets SvelteKit's own
  `error(403, ...)`; `createSectionAction` composes onto `createAdminAction`, so its actions take
  the same check first. Source: `src/lib/sveltekit/admin-action.ts:207-240` (`log.warn(
  'admin.action.csrf_refused', ...); throw error(403, ...)`), `src/lib/sveltekit/section-action.ts:116-119,180`.
  [verified]
- `f:8yb3r1` A handler that returns normally and emits zero `ctx.audit` records throws
  `UnauditedActionError(500, ...)` in dev (gated by `esm-env`'s `DEV`, overridable via
  `deps.isDev`), and logs `admin.action.unaudited` in production instead of throwing. A handler
  that returns SvelteKit's `fail()` (detected via `isActionFailure`) is exempt from this check.
  Source: `src/lib/sveltekit/admin-action.ts:307-309` (`if (emitted === 0 &&
  !isActionFailure(result)) { if (dev) throw new UnauditedActionError(...); log.error('admin.
  action.unaudited', ...); }`). [verified]
- `f:e8r5f7` `ctx.audit`'s sink call catches both a synchronous throw and a rejecting promise from the site's
  own `AdminActionAuditSink`, so the handler's result returns exactly as if the sink succeeded
  either way; the failure logs `audit.sink.call_failed`. A thrown `redirect()`/`error()` from
  inside a hand-rolled sink is rethrown untouched rather than logged, since both are plain classes
  rather than `Error` instances. Source: `src/lib/sveltekit/admin-action.ts:266-282`
  (`Promise.resolve(outcome).catch(logSinkFailure)`; `catch (error) { if (isRedirect(error) ||
  isHttpError(error)) throw error; ... }`). [verified]
- `f:5ba9q8` `ctx.audit` calls the site's `event.locals.cairnAuditSink` synchronously inside the
  `ctx.audit` call and never awaits a promise the sink returns; it attaches only a rejection
  handler, so an async sink's later work is fire-and-forget. A site handler's audit therefore starts
  the sink while the handler runs. The one call outside the handler is the wrapper's own `deny`
  audit on a `deps.access` refusal, before the handler. Only the unaudited check runs after the
  handler returns. Source: `src/lib/sveltekit/admin-action.ts:245-283` (`audit(record) { ... const
  outcome = event.locals.cairnAuditSink?.(full); ... }`), `:296` (`ctx.audit({ action: 'deny', ...
  })`), `:302-310` (`const result = await handler(...)`, then the `emitted === 0` check). [verified]
- `f:1b3ye3` `createSectionAction`'s full check order, fail-closed at every step except the rate limit
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
- `f:jy9y3u` `hasAccessRule` runs before `canReach`, never `canReach` alone: `canReach`'s permissive
  unmapped-target reading is nav semantics (an engine screen with no rule still reachable), while
  a section path with no rule at all must refuse. Source:
  `src/lib/sveltekit/section-action.ts:11-12` (module comment: "mirrors `requireAccess` (guard.ts)
  exactly: `hasAccessRule` runs before `canReach`, never `canReach` alone, whose permissive
  unmapped-target reading is nav semantics"). [verified]
- `f:czkfg9` `loadPreview`'s verification chain runs cheapest-first and stops at the first failure: token
  shape (`^[A-Za-z0-9_-]{43}$`), the `AUTH_DB` binding, the row lookup by hash, the row's expiry,
  the row's stored concept/id against live `runtime.concepts`, then the branch read (whose miss is
  the `branch_gone` signal, no separate existence pre-check). A malformed token is a 404 with no D1
  read and no log. Every refusal throws an identical `error(404)` except a missing `AUTH_DB`
  binding, which answers `error(503)` (since a load can't return a bare `Response`). Source:
  `src/lib/sveltekit/preview.ts:262` (`PreviewRejectedReason` union has exactly 6 members: `unknown
  | expired | branch_gone | row_invalid | draft_invalid | table_missing`) and `:456-518` (the
  ordered `rejectPreview`/log call sites: `bindings_missing` first (503), then `table_missing`,
  `row_invalid`, `branch_gone`, `draft_invalid`). [verified]
- `f:rgvm81` The page's claim of "seven reasons" for `preview.refused` (`docs/reference/sveltekit.md:1356`)
  is arithmetically correct despite the 6-member `PreviewRejectedReason` union: `bindings_missing`
  is a distinct log reason emitted outside that union (a separate log call at
  `src/lib/sveltekit/preview.ts:456`), so 6 union members plus that one makes 7 distinct logged
  reason strings total. Source: `src/lib/sveltekit/preview.ts:261-262` (comment: "the missing-binding
  503 logs its own separately"; the 6-member `PreviewRejectedReason` union), `:456`
  (`log.warn('preview.refused', { reason: 'bindings_missing', ... })`, called outside the union).
  [verified]

### Other sveltekit.md facts

- `f:51jmo8` `CairnEvent<Env>`'s `route.id` is nullable because SvelteKit's own is: `createAuthGuard`'s
  `Handle` genuinely runs for an unmatched request (404, static asset) where kit reports `null`; a
  matched load or action always sees a real route id. Source: page text
  `docs/reference/sveltekit.md:55-58`; this is documented SvelteKit behavior underlying the
  engine's own null-handling code (`requireAccess`'s fixed-constant fallback), not independently
  re-derived from kit's source this pass. [external: SvelteKit]
- `f:06tmiv` `requireAccess`'s `target` default drops route-group segments from `event.route.id`
  (`/admin/(app)/roster` reads as `/admin/roster`) but resolves a parameterized route id verbatim
  (`/admin/posts/[id]`); a declared `target` is used exactly as given, never normalized. Source:
  page text `docs/reference/sveltekit.md:386-388`, consistent with `section-action.ts`'s identical
  group-dropping rule for its own default target (`:794-799` of the same page, describing the
  shared derivation). [verified: via cross-reference with createSectionAction's documented identical rule]
- `f:o015v8` The unmatched case for `requireAccess` (the map has no rule at all for `target`) refuses every
  session including the owner, unlike `canReach`'s own owner bypass, because the helper's contract
  treats "the map has no opinion" as a misconfiguration made loud, not an access decision. Source:
  page text `docs/reference/sveltekit.md:394-398`, consistent with `hasAccessRule` running before
  `canReach` in `section-action.ts:11-12` (the same ordering `requireAccess` in `guard.ts` mirrors
  per that comment). [verified]
- `f:j2xst9` `createAdminAction`'s `access` option is opt-in rather than default-on because a zero-config
  site's guard attaches an empty access map admitting no target, so enforcing by default would
  refuse every action on the documented database-less default instead of hardening it. Source:
  `src/lib/sveltekit/admin-action.ts:74-82` (`access` option doc: "Opt in to the access-map
  authorization... Omitted, `createAdminAction` authorizes nothing, its behavior for every existing
  caller"), `src/lib/sveltekit/guard.ts:357,377` (`event.locals.cairnAccess = access ?? {}`).
  [verified]
- `f:yfg97w` `createD1AuditSink` requires `waitUntil` and takes `undefined` explicitly rather than making the
  parameter optional, because an optional parameter would make the shortest call silently drop the
  insert when the isolate tears down before it settles. Source: `src/lib/sveltekit/audit-sink.ts:82-90`
  (doc comment: "Required, and explicitly accepting `undefined`: an optional parameter would make
  the shortest call the one that silently drops the insert..."), `:92-94`
  (`waitUntil: ((promise: Promise<unknown>) => void) | undefined`). [verified]
- `f:iwed0s` `createD1AuditSink` truncates every bound field before insert: `actor` to 320 characters,
  `action` to 100, `entity` to 100, `entityId` to 200, `detail` to 500, so an oversized `detail`
  cannot suppress its own audit row by failing the insert. Source: `src/lib/sveltekit/audit-sink.ts:16-20`
  (`MAX_ACTOR_LENGTH = 320`, `MAX_ACTION_LENGTH = 100`, `MAX_ENTITY_LENGTH = 100`,
  `MAX_ENTITY_ID_LENGTH = 200`, `MAX_DETAIL_LENGTH = 500`), consistent with `docs/reference/sveltekit.md:710-713`.
  [verified]
- `f:or9j9r` `wrangler d1 migrations apply` reads migrations from a `d1_databases` entry's own
  `migrations_dir` (default `./migrations`); every entry that leaves it unset resolves to the same
  default directory, so copying an audit migration next to the auth migrations and applying it to
  the audit database would apply the auth migrations there too. This is why the audit database
  needs its own distinct `migrations_dir`. Source: page text `docs/reference/sveltekit.md:641-644`;
  this is documented Wrangler CLI behavior, not re-verified against Wrangler's own source this
  pass. [external: Wrangler]
- `f:dqc8x0` The `audit_log` pruning example must compare against the same `strftime('%Y-%m-%dT%H:%M:%fZ',
  'now', ...)` expression the `created_at` column's own default uses, never `datetime('now', ...)`:
  SQLite compares `TEXT` columns byte for byte, and an ISO string's `T` (`0x54`) sorts after a
  space (`0x20`) at the same position, so a `datetime()`-based comparison would silently stop
  pruning the oldest rows at the boundary day. Source: page text
  `docs/reference/sveltekit.md:680-683`; a documented SQLite text-comparison gotcha, consistent
  with SQLite's well-known collation behavior for `TEXT` affinity columns, not independently
  re-derived from a SQLite spec this pass. [external: SQLite]
- `f:xmhbyv` A screen reading `audit_log` back right after a write can miss the row: the insert may still be
  in flight behind `waitUntil` when the response renders, and D1's own read replication can serve a
  stale replica; a screen needing its own just-made row needs first-primary bookmark routing, not a
  plain read. Source: page text `docs/reference/sveltekit.md:685-690`, citing Cloudflare's own D1
  read-replication docs; the D1 replication mechanic itself is platform behavior, not re-verified
  against Cloudflare's docs this pass. [external: Cloudflare D1]
- `f:gifz76` `createSectionAction` never guards a POST reaching the section through SvelteKit remote
  functions: a remote function call never dispatches through `Actions` at all, and it also bypasses
  the admin guard's own CSRF check (which runs on `Actions` dispatch specifically), so a site
  adding a remote function under `/admin` owns that verification itself. Source: page text
  `docs/reference/sveltekit.md:850-853`; a documented SvelteKit remote-functions/`Actions`
  dispatch distinction, not independently re-checked against SvelteKit's own dispatch code this
  pass. [external: SvelteKit]
- `f:uvhweb` `historyLoad` bounds the entry's commit history to the most recent 25 publishes; the commits
  API's path filter doesn't follow a rename, so a renamed entry's history restarts at the rename,
  and `HistoryData.truncated` only ever flags the 25-row bound, never a rename boundary the route
  can't see. `revertAction` re-validates the posted `ref` by full-sha exact membership against a
  fresh `listCommits` read, so `ref-unknown` always means the target fell outside that same 25-row
  window. Source: `src/lib/sveltekit/content-routes-shared.ts:156` (`HISTORY_LIMIT = 25`),
  `src/lib/sveltekit/content-routes-entry-read.ts:511-534` (`historyLoad`: `truncated`),
  `src/lib/sveltekit/content-routes-entry-revert.ts:81-106` (`revertAction`: fresh `listCommits`
  full-sha membership check, `ref-unknown`). [verified: the 25-row bound and the revert
  re-validation are confirmed in source; the commits-API rename-restart behavior is GitHub's own
  API mechanic, not re-verified against GitHub's own docs this pass]
- `f:u61eav` `previewMintAction`/`previewRevokeAction`, `mintPreview`/`revokePreview` run the same
  authorization sequence first, before touching the draft: signed-in editor from
  `event.locals.cairnEditor`, concept lookup, concept-scoped access check against `runtime.access`,
  entry-id shape rule, and only then (for mint) the pending-draft check. A refusal never reveals
  whether an entry exists. Both come back as an `outcome` discriminant value, never a throw.
  Source: `src/lib/sveltekit/preview.ts:128-151` (`mintPreview`: `requireEditor`, `findConcept`,
  `requireEngineAccess`, `isValidId`, then the pending-draft check), `:184-210` (`revokePreview`:
  doc comment states it "mirrors `mintPreview`'s authorization sequence exactly", same four checks,
  no draft check). [verified]
- `f:n0xz8f` `mintPreview`'s `config.ttlMs` defaults to seven days and must be finite, positive, and between
  one minute and thirty days; an out-of-range value throws a `PreviewTokenConfig:`-prefixed error
  before any token is generated. Source: `src/lib/sveltekit/preview.ts:61`
  (`DEFAULT_PREVIEW_TTL_MS = 7 * 24 * 60 * 60 * 1000`), `:75-85` (`resolveTtlMs`: finite/positive
  check, min/max bound check, `PreviewTokenConfig:`-prefixed throws). [verified]
- `f:esg0zx` `renameAction` and `deleteAction`/`listDeleteAction` clear an entry's outstanding
  preview rows unconditionally (regardless of publish state) as part of their own cascade;
  `discardAction` clears them only for a never-published entry (a live entry's discarded edit
  leaves its rows alone). All three close the same id-reuse collision, where a stale link could
  later resolve to a different entry's draft; publishing deliberately leaves the rows in place
  since `loadPreview` needs them to answer a stale link with "this preview has ended" rather than a
  bare 404. Source: `src/lib/sveltekit/content-routes-entry-destructive.ts:167,205` (`deleteEntry`,
  shared by `deleteAction`/`listDeleteAction`, calls `clearPreviewTokens` unconditionally on both
  the never-published and the published-then-committed exit), `:407` (`renameAction` calls
  `clearPreviewTokens` unconditionally, no never-published check),
  `src/lib/sveltekit/content-routes-entry-write.ts:537-543` (`discardAction` clears rows only for a
  never-published entry), `:406-410` (publish deliberately does not clear, comment states the
  `loadPreview` "this preview has ended" rationale). [verified]
- `f:3qexq3` `settingsLoad` actively probes a present Anthropic key with a zero-token call and reports
  `keyStatus` (`missing`/`invalid`/`valid`/`unknown`) distinct from the presence-only
  `keyConfigured`, feeding the same key-health cache `editLoad`'s Tidy control reads (a
  confirmed-invalid key hides the control on the next edit load with no separate check); the cache
  holds a verdict for a ten-minute window. Source: `src/lib/sveltekit/content-routes-settings.ts:52-64`
  (`keyConfigured`/`keyStatus` doc), `:234-256` (`settingsLoad`: `probeTidyKey`,
  `cachedProbeResult`), `src/lib/sveltekit/tidy-key-health.ts:5,19` (`TTL_MS = 10 * 60 * 1000`;
  "editLoad's tidy projection reads this cache only"). [verified]
- `f:n8qe9y` `tidyAction` refuses before any model call if tidy is disabled or the key is missing; a 401/403
  from Anthropic marks the shared key-health cache unhealthy and is not retryable
  (`fail(503)`, reading "Tidy isn't available right now"), while a deadline overrun, other abort,
  model error, or empty result is retryable (`fail(502)`); a missing `@anthropic-ai/sdk` peer and
  an Anthropic 400 `invalid_request_error` (typically an unsupported `tidy.model`) are two more
  non-retryable `fail(503)` causes, distinct from the disabled/missing-key and 401/403 cases
  already named. Source: `src/lib/sveltekit/content-routes-tidy.ts:111,130,135` (`tidyAction`:
  `fail(503)` before any model call when disabled or key missing), `:190-199` (`TidySdkMissingError`,
  `fail(503)`), `:200-211` (401/403 calls `markKeyUnhealthy()`, `fail(503)`, not retryable),
  `:212-222` (400 `invalid_request_error`, `fail(503)`, not retryable), `:223-231,249` (other
  errors `fail(502)`, retryable). [verified]
- `f:sd18xx` `NavLayoutSection.collapsed` (default `false`) is only the group's starting state for a visitor
  with no persisted `cairn-admin-nav-collapsed` cookie; the cookie, once any header is toggled,
  wins entirely in both directions, so a group added after a visitor's cookie already exists
  renders open. Source: `src/lib/admin/CairnAdminShell.svelte:192-218` (comment: "once any
  header is touched, the cookie carries the full collapsed set and wins entirely"; `collapsed`
  state derivation; `writeAdminCookie('cairn-admin-nav-collapsed', ...)`). [verified]
- `f:bc27j9` A `NavLayoutEntry.href` colliding with a built-in admin view throws at startup with the
  conflicting view named; an icon outside the `NavIcon` allowlist throws when the runtime composes.
  Source: `src/lib/sveltekit/admin-nav.ts:73-90` (`validateEntry`: icon-allowlist throw, href-collision
  throw naming the built-in view; doc comment: "fails at server start rather than rendering a
  broken or shadowing sidebar link"). [verified]
- `f:nv475y` The engine reads every Worker binding and `waitUntil` through one internal module, `src/lib/sveltekit/workers-env.ts`, its only `cloudflare:workers` import, which no Node-context entry (`.`, `/admin`, `/public`, `/vite`, `/cloudflare`, `/auth-crypto`, `/log`, the bins) reaches, so the module's `waitUntil` is always defined and `auth.channel.delivery_inline` retired. Source: `src/lib/sveltekit/workers-env.ts#waitUntil`, `src/tests/unit/workers-env-reach.test.ts`. [verified]
- `f:yivujb` `isBuilding` reads SvelteKit's `building` through `await import('$app/env')` inside `try`/`catch`, falling back to `false`, so the `/sveltekit` barrel carries no static `$app/env` import and a consumer test that mocks `$app/environment` no longer reaches it; `loadPreview`'s build refusal needs `$app/env` mocked. Source: `src/lib/sveltekit/building.ts#isBuilding`, `src/lib/sveltekit/preview.ts#loadPreview`. [verified]

## docs/reference/vite.md

- `f:t82l5d` The internal write/verify/derive machinery `cairnManifest` shares with the `cairn-manifest`
  bin is not public surface; every real caller reaches it by relative import. The `cairn-doctor`
  bin this bullet once named alongside it is retired; only the manifest bin imports this module
  today. Source: `src/lib/vite/internal.ts:1-11` (module header: "the lower-level functions the
  cairn-manifest bin and its unit tests import by relative path"). [verified]
- `f:mbragr` `CairnManifestOptions.manifestPath` defaults to `/src/content/.cairn/index.json`. Source:
  `src/lib/vite/internal.ts#DEFAULT_MANIFEST_PATH` (`DEFAULT_MANIFEST_PATH`). [verified]
- `f:skkvr2` `cairnManifest()` evaluates a verify virtual module in `buildStart`, so a manifest
  drifted from the corpus fails the build, and the start of `vite dev`. A build loads the module
  through a nested Vite SSR server, once per build although `buildStart` fires for each build
  environment, and a watch-mode change verifies afresh. The nested server drops adapter-cloudflare
  8's `vite-plugin-sveltekit-adapter-cloudflare-virtual-workers-module`, so a build starts no
  platform proxy (no workerd process) for the verify. A dev server loads the module, and the
  site-facts check's adapter module, through its SSR environment's module runner
  (`isRunnableDevEnvironment`, then `runner.import`, never the deprecated `ssrLoadModule`) and
  never creates a nested server: closing one runs the site's own plugins' `closeServer` hooks, and
  adapter-cloudflare 8's hook disposes the platform proxy the running server shares, after which
  every `cloudflare:workers` read throws. Only an SSR environment that is not runnable in Node
  falls back to the build's nested server, which SvelteKit 3's own dev server already refuses.
  Source: `src/lib/vite/internal.ts#cairnManifest` (`configureServer` captures the dev server;
  `buildStart` hands it to `runStartChecks`, memoized in `buildChecks` for a build; `watchChange`
  clears it), `src/lib/vite/internal.ts#loadFromDevServer`,
  `src/lib/vite/internal.ts#stripNestedServerPlugins`,
  `src/tests/unit/vite-manifest-dev-server.test.ts`,
  `src/tests/unit/vite-strip-nested-server-plugins.test.ts`. [verified]

## tool/internal/spine/conditions.json

- `f:9fr060` `tool/internal/spine/conditions.json` and `tool/internal/doctor/site-config-path.json` are
  committed, generated artifacts, never hand-edited. Source:
  `scripts/checks/check-tool-conditions.mjs:1-2`. [verified]
- `f:kloujy` `scripts/build/emit-tool-conditions.mjs` regenerates both mirrors from the built condition
  registry (`dist/diagnostics/conditions.js`) and the scaffolder's own site-config-path file.
  Source: `scripts/build/emit-tool-conditions.mjs:18-19,50-66` (`CONDITIONS_JS`,
  `SITE_CONFIG_PATH_SOURCE`, `loadConditions`, `buildMirrors`). [verified]
- `f:5wwdin` `check:tool-conditions` regenerates both mirrors into memory and fails on the first byte that
  differs from the committed file. Source: `scripts/checks/check-tool-conditions.mjs:19-27`
  (`compareMirror`). [verified]
- `f:mvs930` The conditions mirror carries exactly seven fields per entry (`id`, `severity`, `title`, `why`,
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
