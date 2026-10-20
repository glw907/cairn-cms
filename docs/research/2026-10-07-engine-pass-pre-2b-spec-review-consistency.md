# Engine pass before stage 2b: spec review, consistency lens

Target: `docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md` at `32fd9b1c`. Code and
docs read at `draft-docs-2a` (`ccec538c`). Ratified inputs checked: the six owner rulings, the
`CLAUDE.md` charter, `docs/internal/what-cairn-is-and-is-not.md`, `docs/internal/engine-rulings.md`,
the functional spec, `ROADMAP.md`'s boundary-test entry, and the pass-core class table.

Findings flag only correctness gaps and unmet requirements. Line numbers in "Location" are the
spec's own unless a file is named.

## Summary

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 4 |
| Minor | 9 |

The lead's design is sound and well evidenced. The rulings for Geoff are real product forks. Every
decline passes the charter's premise test. The defects below are mostly records the pass breaks
without amending them, and one undisclosed break.

## Major

### M1. The lead leaves `runtime` optional, so the split it removes survives

- **Location:** 72-73, 77-79, 136-137.
- **Defect:** The spec says "the bug class disappears instead of being detected". The acceptance
  line still treats a bare `createAuthGuard()` as a legal call that the doctor keeps failing. Today
  both factories take a defaulted bag (`guard.ts:172`, `createAuthGuard(config: AuthGuardConfig =
  {})`; `editors-routes.ts:51`, `config: EditorRoutesConfig = {}`), and `devBackendHandle(config?)`
  is optional too. If `runtime` stays optional, a site that declares roles on the adapter and calls
  `createAuthGuard()` gets the same two-reader split, with `DEFAULT_ROLES` and `{}`. The spec also
  contradicts a ratified rule. `convention-parameter-bags`, amended 2026-09-08, says "`runtime` is a
  required member of the bag where the factory needs one", and a factory that needs it takes one
  parameter with no default.
- **Fold:** State that `runtime` is required on `createAuthGuard`, `devBackendHandle`, and
  `createEditorRoutes`, with no default bag. Cite the `convention-parameter-bags` amendment as
  evidence. On a current engine, the bare call becomes a type error. Re-scope the doctor's
  bare-call fail to sites on an older engine. The break is already declared, so this adds no
  `Consumers must:` cost.

### M2. Keep entries the pass falsifies get no annotation

- **Location:** 464-509. The spec proposes seven declines, one accept, and one Shape amendment.
- **Defect:** Several keep entries rest their recorded any-site case on wiring this pass deletes.
  Each entry's `Reopens on:` is "evidence against the recorded any-site case", and this pass is that
  evidence. Without an annotation, the ledger states things that are false after the close.
  - `audit-adapter-accessmap` and `audit-adapter-rolesdeclaration` say "a site declares the map
    once and imports it twice, into createAuthGuard and the adapter". After the lead it is imported
    once. Whether either type still earns a keep is a premise test the spec never runs. A site that
    declares its map in its own module still annotates it, so the keep likely holds, but the
    argument has to be written.
  - `audit-sveltekit-authguardoptions` (now `AuthGuardConfig`) says "any site declaring roles or an
    access map writes this object in hooks.server.ts". After the lead, it writes `{ runtime }`.
  - `audit-sveltekit-editorroutesoptions` says the hand-mounting site "passes its defineRoles output
    here; nothing else tells that screen the vocabulary". The `roles` member is removed.
  - `audit-adapter-canreach` calls the owner and editors carve-outs engine policy. A1 adds a third
    carve-out, for a `none` role named in a rule. The same entry's "single authority" claim also
    becomes true by construction, which is worth recording.
  - `audit-adapter-navmenuconfig` says "configPath and menuName bind it to YAML". D5 removes
    `configPath`.
  - `doctor-drop-github-app` names its gap as "a never-published site ... has no substitute signal
    until its first Publish attempt". Ruling 3's live check closes that gap.
  - `audit-log-github-unreachable` defines the event as a best-effort read that degrades (scopes
    `shell`, `help`, `publish_advisories`). The new `scope: 'health'` is a check verdict, so the
    event's meaning widens.
  - `access-semantics-documented-divergence` gets a Shape amendment. Its `Verified:` line names the
    test that says an href key "never counts toward coverage", and that assertion changes too.
- **Fold:** Add a list under "Declined, with proposed ledger entries" of dated annotations the
  close writes, one line each, and re-argue the keep for `AccessMap` and `RolesDeclaration`. Amend
  the `Verified:` line along with the Shape line.

### M3. Batched items with page caveats contradict the boundary test (OWNER FORK)

- **Location:** 611-614 and the batch rows at 644 (B11b), 652 (C6), 655 (C9), 663 (D3), 667 (D7),
  and 669 (D8b).
- **Defect:** `ROADMAP.md`'s boundary-test entry is a standing rule (Geoff, 2026-10-07). Its first
  clause reads: "Fix before the next docs stage any item whose fix would change what a written or
  outlined page tells the reader: a workaround, a caveat, or a step the page carries only because
  of the defect." Its third clause sends the remaining items into "whichever engine pass runs
  next". The spec batches several items to the final engine batch, and its own reasons say each
  leaves a caveat or workaround on a page:
  - B11b: "the page carries one Node command meanwhile".
  - D3: "a reference sentence meanwhile".
  - C6: "Reference sentence in the `guard.refused` row".
  - C9: "Reference: name the level words".
  - D8b: the run-cairn-audit page has to say that no `--json` report exists.

  Ruling 1, from the same day, allows "batch into the final engine batch" as a verdict and says a
  friction-log entry earns nothing. The spec never reconciles the two rulings, so the plan inherits
  a contradiction. A page drafted in 2b around a defect that the final batch then fixes gets
  rewritten after stage 5, when no docs stage remains to absorb the rewrite.
- **Owner fork:** Which rule governs an item that improves the product only marginally but leaves
  a page caveat?
- **Recommendation:** Let ruling 1 govern, since it is Geoff's later and pass-specific word. Then
  fold two things into this pass's ROADMAP rewrite (line 541). First, amend the boundary-test text
  so that clause 1 runs only after ruling 1's product test. Second, tag each batched item that
  carries a page caveat with its page in the Next tier's batched entry, so the final batch revises
  that page in the same pass. The spec's definition of "batch" (the final engine batch) also
  differs from the ROADMAP's clause 3 ("whichever engine pass runs next", which is now the pass
  before stage 4). The same amendment settles that.

### M4. D5 changes a documented default with no `Consumers must:` line

- **Location:** 431-438 and 556.
- **Defect:** Today Settings and Tags fall back to `src/lib/site.config.yaml`
  (`content-routes-settings.ts:124`). That default is documented at `docs/reference/sveltekit.md:1217`,
  `core.md:249,257`, `src/lib/content/types.ts:131`, and the functional spec's adapter contract
  (`2026-05-28-cairn-rebuild-functional-spec.md:390`). D5 moves the default to
  `src/theme/site.config.yaml`. A site that keeps its config at the documented path without a nav
  menu works today, and after D5 it gets "Site config not found" on both screens. The only
  `Consumers must:` line is "Move `editor.nav.configPath` to `editor.siteConfigPath`". The charter
  says every break is disclosed. This break is not.
- **Fold:** Add a `Consumers must:` line: "a site whose site config is at
  `src/lib/site.config.yaml` sets `editor.siteConfigPath`". Alternatively, keep the old default and
  have the scaffold set the path explicitly. Add the functional spec's line 390 to D5's docs, with
  a dated amendment as the 2026-10-06 one did.

## Minor

### m1. C7 misquotes the charter

- **Location:** 296-297.
- **Defect:** The spec says the charter's sentence "names the confirm page too". The sentence at
  `what-cairn-is-and-is-not.md:107` reads "An anonymous visitor reaches nothing behind `/admin`
  except the sign-in form." It names only the form. The ROADMAP filed this exact gap ("the owner
  brief names only the sign-in form as anonymous surface").
- **Fold:** Argue that the confirm page is the second half of the sign-in flow. Alternatively, have
  the close amend the charter sentence to "the sign-in form and its confirm page". The second is a
  one-word charter edit, so name it for Geoff's read.

### m2. C7's other records of `/admin/auth/*`

- **Location:** 293-299.
- **Defect:** "The engine serves one view there" holds for `createCairnAdmin`. The spec leaves
  three records that still teach the wider prefix:
  - The `createAuthRoutes` doc comments in source call request and logout handlers for "a site's
    `/admin/auth/*` routes" and label them `POST /admin/auth/request` and `POST /admin/auth/logout`
    (`auth-routes.ts:160,169,407`).
  - The functional spec's "Request a link" names `POST /admin/auth/request`.
  - The functional spec's "Guard" excludes "the login and auth endpoints".

  `audit-sveltekit-createauthroutes` keeps hand-mounting as the case. A hand-mounter who followed
  the source comments has a public request route that becomes guarded, and the `Consumers must:`
  line does cover that site. The records stay wrong.
- **Fold:** Add the three comments and a dated functional-spec amendment to C7's task.

### m3. Pass-class fit

- **Location:** 183-184, 316-320, 391-399, 569, 585, and 607-609.
- **Defects:**
  - **A5 is `paint`.** Pass-core says "a mixed pass runs the union of its tasks' classes at the
    close". `paint`'s settle is an owner glance at captures, a fresh-context `visual-verifier`
    read, and an owner sitting. Pass B's close (607-609) lists none of them. A5 is a template file
    of calm copy under the existing wrapper, so an owner sitting is ceremony that costs Geoff's
    attended time.
  - **B7 is classed `engine-logic`.** The triage table calls it "a security-relevant copy". The
    define decides whether a dev handle that mints an owner session compiles into production, and
    "respects a define the site already set" is precedence logic that a mutation proof would pin.
  - **Ruling 2's `create-cairn-site` half is classed `engine-logic`.** It edits D1 provisioning,
    `MIGRATION_DATABASES` and the `-app` rename. The class table lists "D1" under `auth-data`, and
    a mistake there breaks a new site's `AUTH_DB`.
  - **Pass B's header says "mixed classes".** "Mixed" is not a class. Pass-core wants one header
    class plus per-task lines.
  - **Pass A's header.** `auth-data` is right for pass A. Its engine-logic tasks (5, 7), its
    `tool` task (2), and its docs task (10) each need their own `Pass class:` line, or they inherit
    the mutation-proof mandate.
- **Fold:** Class A5 as `paint` with a settle the plan names: one `visual-verifier` read at pass B's
  close and the owner glance batched with Geoff's plan read. If an owner sitting for one error page
  is unwanted, reclass A5. Class B7 and the provisioning edit as `auth-data`. Give pass B a header
  class, `engine-logic`, with per-task lines.

### m4. The lead's docs list misses a row it invalidates

- **Location:** 116-119 and 142-146.
- **Defect:** The spec says the reference rows "are already correct (`sveltekit.md:827-831`,
  `log-events.md:81`)". Both rows name the current cause, "as `devBackendHandle` does when given no
  `access`", and give the fix "`devBackendHandle({ access })`". After the lead, both are wrong. The
  lead's docs bullet lists the `sveltekit.md` row. For `log-events.md` it lists only
  `config.access_unmapped`, so the `admin.action.misconfigured` row at `:81` goes stale with no
  gate to catch it. The `DevBackendConfig.access` doc comment (`handle.ts`) states the
  deliberate-undefined design that the lead reverses, and it needs a rewrite too.
- **Fold:** Replace "already correct" with "rewritten to the post-lead cause", and add
  `log-events.md:81` and the `handle.ts` comment to the lead's docs.

### m5. The `csrf-no-rotation-under-identity` reasoning is wrong

- **Location:** 481-484.
- **Defect:** "No cairn sign-in or sign-out event occurs" is false for sign-out. Under `identity`,
  `logoutAction` still deletes every cookie, the CSRF pair included (`auth-routes.ts`, the
  logout doc comment). The page the entry cites says the same (`security-model.md:411-415`: "until
  a cairn logout deletes the cookie").
- **Fold:** "No cairn sign-in occurs, and a gate-side identity change is invisible to cairn. A cairn
  logout still clears the value."

### m6. Two proposed entries restate rulings already in the ledger

- **Location:** 466-467, 475-480, 489-493, and 499-501.
- **Defect:** The spec's own rule is that "the two items an existing ruling already settles get no
  new entry". Two more items qualify:
  - **C12.** `audit-log-content-field-behavior-failed` already records the fail-open posture and
    its reason ("the engine deliberately keeps the save working ... so the log is the entire
    signal").
  - **D13.** `log-export`'s Shape already reads "`log` itself, the sink, and every documented event
    field stay internal".
  - **A11.** The reference already has a "Refusal channels" section (`sveltekit.md:413`). The
    channel model was ruled in the pre-beta C1 pass (`2026-08-01-pre-beta-c1-seam-shape.md`,
    Task 5). The new entry should cite that record, and "the reference gets one table" may already
    be done.
- **Fold:** Drop the C12 and D13 entries and cite the existing ones. Keep A11's entry with the C1
  plan as its `Record:`, and scope the reference work to whatever the existing section lacks.

### m7. The `dev-flag-strict-read` premise is misstated

- **Location:** 494-498.
- **Defect:** "Accepts exactly `'1'`" is wrong. `isDevBackendFlagSet` returns
  `raw === '1' || raw === true` (`src/lib/dev-flag.ts`, the function under the doc comment at
  `:25-29`). The entry also skips the neighboring ruling `dev-backend-flag-refusal`.
- **Fold:** Write "accepts exactly `'1'` or the boolean `true`" and cross-reference
  `dev-backend-flag-refusal`.

### m8. The optional 2b start between passes contradicts the spec's own ordering

- **Location:** 598-601 against 566-567.
- **Defect:** "Stage 2b could start between them if Geoff chose" contradicts "Both land before stage
  2b". It also contradicts boundary-test clause 1, because pass B changes 2b pages: D5, D6, and
  ruling 5's add-cairn caveat.
- **Fold:** Drop the option, or mark it as an owner fork that waives clause 1 for named pages.

### m9. Citation drift

- **Location:** see each item below.
- **Defects:**
  - **D8a (446).** `report.ts:60-62` cites lines past the end of a 57-line file. The exit logic is
    `exitCodeFor` at `report.ts:55`.
  - **D5 (438).** `sveltekit.md:1207` should be `:1217`.
  - **B6 (389).** `guidance.md:28` is the agents line. `VERSION` is at `:30`, and the
    source-exclusion prose is at `:136`.
  - **Ruling 2 (181).** `README.md:28` lists "member signups" as something a developer builds. It
    makes no claim that a scaffold ships the screen, so it may need no edit.
  - **The lead's evidence (89-92).** "The guard and `createEditorRoutes` are the two outliers" is
    wrong: `createAuthRoutes` also takes no `runtime` (`auth-routes.ts:165`).
  - **Sizing (566).** "Past the twelve-task line" cites a rule that neither pass-core nor
    model-economy states.
- **Fold:** Correct each citation.

## Checks that passed

- **Owner rulings.** All six are reflected. Ruling 4 correctly places no arm setup in an engine
  pass (`arm-state.mjs` reads an unregistered arm as `absent`). Ruling 6 is honored. The release
  shape matches the boundary-test entry and the rulings' "settled elsewhere" list. The two rulings
  for Geoff are real product forks: the save target under ruling 5 is genuinely ambiguous ("edits
  the site's real content files, saving to a local stand-in"), and the fingerprint adds scope that
  ruling 3 did not pick.
- **Ruling 1 and the charter on fixes.** Every fix improves a product outcome: data loss,
  security, a wrong signal, or a broken first-run step. None adds an actor or a subsystem. The new
  surface is narrow: `content`, `siteConfigPath`, `--fail-on`, and an optional `HealthData` member.
- **The 13 declines.** A9, A11, A12, B4, C2, C3, C4, C10, C12, D12, D13, the Claude Code arm, and the
  `2f4ef9d8` entries each pass the premise test. A9 and C3 rest on the charter's "a site's domain is
  the site's". C4 and C10 correctly cite `login-csrf-no-same-browser-binding` (the unbound-row
  escape hatch) and `identity-seam` ("the first owner seeded out of band"). None conflicts with an
  existing entry, apart from the redundancies in m6.
- **Ledger fidelity.** `read-from-the-source-rule`, `audit-adapter-canreach`, and
  `access-semantics-documented-divergence` are quoted accurately. The narrowed
  `config.access_unmapped` still detects the partial screen map that the divergence entry's
  `Reopens on:` names. D4 correctly leaves `audit-adapter-fieldbehavior` intact.
- **Pass classes.** Pass A as `auth-data` is right: the lead, A1, C1, C7, A3, ruling 3's signing, C11,
  and D1 sit on auth or the commit path. C5 as `auth-data` is a justified upshift for a security
  floor.

## Citation spot-check (over 60 checked, 7 defective)

The table lists each citation and its result at `draft-docs-2a`.

| Cited | Result |
| --- | --- |
| `compose.ts:41` | ok (`access: adapter.access`) |
| `content-routes-media-library.ts:67` | ok |
| `content-routes-shell.ts:187` | ok |
| `content-routes-shell.ts:304` | ok |
| `guard.ts:348,368,479` | ok |
| `guard.ts:174` | ok |
| `guard.ts:364-367` | ok |
| `guard.ts:28-29` | ok |
| `guard.ts:59-63` | ok |
| `guard.ts:170` | ok, approximate (the WATCH pin; the signature is at `:172`) |
| `section-action.ts:275` | ok |
| `section-action.ts:129-130` | ok |
| `templates/waymark/src/hooks.server.ts:20,22` | ok |
| `cairn.config.ts:214` | ok |
| `cairn.config.ts:116` | ok |
| `cairn-admin.ts:118` | ok |
| `cairn-admin.ts:105-110` | ok |
| `cairn-admin.ts:236-251` | ok |
| `cairn-admin.ts:34` | ok |
| `access.ts:3-4` | ok |
| `access.ts:107-127` | ok |
| `access.ts:157-159` | ok |
| `index.ts:21-23` | ok |
| `core.md:1020` | ok |
| `sveltekit.md:131,1046` | ok |
| `sveltekit.md:827-831` | ok |
| `log-events.md:81` | ok |
| `admin-nav.ts:295-299` | ok |
| `content-routes-context.ts:191` | ok |
| `nav-routes.ts:46` | ok |
| `media-route.ts:74` | ok |
| `store.ts:20-31` | ok |
| `store.ts:263-273` | ok |
| `content-routes-tidy.ts:124` | ok |
| `content-routes-dictionary.ts:106` | ok |
| `admin-dispatch.ts:87` | ok |
| `what-cairn-is-and-is-not.md:107` | **misquoted** (m1) |
| `turnstile.ts:92-104` | ok |
| `channel-db.ts:26-29` | ok |
| `EditPage.svelte:199` | ok |
| `EditPage.svelte:1689` | ok |
| media delete and metadata commit lines | ok |
| `media-ingest.ts:238-249` | ok |
| `media-refs.ts:45-52` | ok |
| `media-rewrite.ts:164-171` | ok |
| `fieldset.ts:28` | ok |
| `fieldset.ts:388-419` | ok |
| `fieldset.ts:459-471` | ok |
| `conditions.ts:198` and `conditions.json:199` | ok; no code reads either env name, verified |
| `.dev.vars.example:7-8` | ok |
| `secret.mjs:25-28,43-46` | ok |
| `cairn-cms-dev/package.json:20-24` | ok |
| `manifest.ts:373-377` | ok |
| `check.ts:21,73-88` | ok |
| `vite.config.ts:22-33` | ok |
| `feed.ts:20` | ok |
| `sanitize-schema.ts:22-24,62` | ok |
| `internal.ts:586-590` | ok |
| `content-routes-settings.ts:124,198-200` | ok |
| `seo-fields.ts:18,27` | ok |
| `CairnAdminShell.svelte:43` | ok |
| `health.ts:24` | ok |
| `signing.ts:66,121` | ok |
| `deploy.mjs:175` | ok |
| `chapter.mjs:119` and `config.mjs:115` | ok (both under `src/cloudflare/`) |
| `security-model.md:324,411-415` | ok |
| the 2026-10-03 SvelteKit 3 spec, "Evidence" | ok (Node under `vite dev` through the platform proxy) |
| `report.ts:60-62` | **wrong** (m9) |
| `sveltekit.md:1207` | **wrong** (m9) |
| `guidance.md:28` | **wrong** (m9) |
| `README.md:28` | **does not support the claim** (m9) |
| "two outliers" | **incomplete** (m9) |
| `isDevBackendFlagSet` "exactly '1'" | **wrong** (m7) |
