# cairn user-visible surface delta since 2026-08-15

Method: `0.96.0` is the last published npm version, cut 2026-08-22 (`0.95.0` cut 2026-08-19).
Everything after `0.96.0` lives under CHANGELOG's `## Unreleased` (2,567 lines, still unpublished
as of 2026-09-22 per `docs/STATUS.md`), which is therefore almost the entire delta window. `0.95.0`
(2026-08-19) is included too since it lands inside the window. Cross-checked against
`docs/internal/facts/{admin,editors,extend,front-door}.md` (harvested 2026-09-15, tool CLI facts
added 2026-09-21/22), `docs/extend/migration-notes.md`, `docs/HISTORY.md`, `docs/STATUS.md`, and
`docs/internal/record/` (extend-1, extend-2, sidebar-zen). Coverage checked by grepping `docs/` for
each key term.

Versions in the window: `0.95.0` (2026-08-19, reproduction seam + 6 release-debt fixes), `0.96.0`
(2026-08-22, dependency-floors release), then everything in `## Unreleased` (extend-1, extend-2,
internals/conformance/retires/conventions passes, chassis-A/B/B2, identity-seam, polish-11a/11b/C,
admin-motion, docs-to-facts, cairn-tool-a/B2, doctor retirement, draft-docs pass A).

---

## Editors (people writing in /admin)

1. **Command palette is now a real ARIA combobox** (role="combobox", listbox, keyboard nav,
   live-region announcements) and two keyboard conflicts with the editor are fixed (Ctrl/Cmd+B no
   longer also toggles the drawer; Ctrl/Cmd+K inside the editor opens the web-link dialog instead of
   stacking the palette). Landed: Unreleased (polish-11b-i/ii). Docs: **NONE** in
   `docs/editors/*` — `write-in-the-editor.md` names "command palette (Ctrl+K, not while editing)"
   only in the facts container's "shortcuts this page never documents" list; the editor-facing arm
   has no page describing what the palette does or how to use it. Reference-only coverage:
   `docs/reference/admin-routes.md`, `docs/reference/components.md`.

2. **Zen mode gains real motion**: the persistent frame margin now transitions (240ms in / 150ms
   out), topbar/title/editor-footer/mobile-bar fade in on return, first-paint restore from
   localStorage never animates. Landed: Unreleased (admin-motion). Docs: `write-in-the-editor.md`
   already describes Zen's existence and effect, but not its shortcut or its animation; no update
   needed for editors (motion detail is not editor-facing register content) but confirm the page
   still doesn't need updating for the "shortcut" gap noted in facts (pre-existing gap, not new).

3. **Media Library selection-action bar reflows on narrow viewports** (splits into two flex rows
   under `sm`) so button text and the "Delete N" label no longer overflow. Landed: Unreleased.
   Docs: `manage-the-media-library.md` covers the feature generally; this is a cosmetic fix, no
   doc update expected or needed.

4. **Hero image empty-state dropzone now paints a drag-over state.** Landed: Unreleased (Tooltip/
   polish pass). Docs: `add-an-image.md` covers the hero field generally; cosmetic, not gapped.

5. **New `Tooltip` admin-toolkit component** (replaces bare `title` attribute on icon-only
   controls) changes how icon-only buttons in admin screens (including built-in ones) show their
   label. Landed: Unreleased. Docs: extend-facing (`docs/reference/admin-toolkit.md`); no
   editor-facing behavior change worth a page.

6. **Admin transition curve changes** from Tailwind's default cubic-bezier to Carbon's productive
   curve (`--default-transition-duration`/`-timing-function` on the admin root); duration stays
   150ms. Purely visual polish (admin-motion pass, chassis-B/B2 harvest). Not editor-doc-worthy.

7. **Pressed-segment / focus-ring contrast fixes** (segmentTintClass active ring, checkbox/radio/
   input focus edges raised to meet WCAG 1.4.11). Landed: Unreleased. Cosmetic/accessibility fix,
   not a new behavior to document for editors.

8. **A magic link now only signs in the browser that requested it** (login-CSRF hardening,
   binds the confirm to the requesting browser's cookie). Landed: Unreleased (CSRF hardening
   pass, 2026-08-29). Docs: **covered** — `docs/admin/troubleshooting.md` and
   `docs/editors/when-something-goes-wrong.md` already state "A sign-in link only works in the
   browser that requested it" per facts `admin.md:91`. Confirm this line's phrasing still matches;
   it does per the facts harvest.

9. **Doctor's login probe / CSRF and role-wiring copy fixes**: not editor-facing (operator surface,
   see below).

No entirely new editor-facing screen shipped since 08-15 (tags, media library, tidy, previews,
history all pre-date the window and are already documented). The command palette gap (#1) is the
one real hole: it went from an unlabeled trigger to a fully reworked, discoverable UI component and
the editors track still has zero prose about it.

---

## Site admins / operators (no code)

1. **The `cairn` Go operator CLI reaches 1.0 (then 1.1.0)**: `cairn health` (nine checks, four
   verdicts OK/WARNING/CRITICAL/UNKNOWN from five per-check words pass/fail/skip/unknown/held),
   `cairn logs`, `cairn adopt`, `cairn auth set`/`auth check`, `--ack` to hold a known failure,
   `--json` on every command (six/seven published schemas). Ships as a separate Go module under
   `tool/`, **never installed by `@glw907/cairn-cms` or npm** — `go install
   github.com/glw907/cairn-cms/tool/cmd/cairn@latest` or a release archive (`tool/v1.0.1`, then
   `tool/v1.1.0`). Landed: Unreleased (cairn-tool-a, cairn-tool-b2, tool-1-1-0), tagged/released
   2026-09-21/22. Docs: **well covered** — `docs/admin/before-you-start.md`, `is-it-working.md`,
   `troubleshooting.md`, `what-to-run-and-when.md` (updated by the tool harvest 2026-09-21) plus a
   full reference arm (`docs/reference/cli-cairn-*.md`, `docs/reference/schema/*.json`), shipped
   inside the npm tarball (draft-docs pass A, 2026-09-22).

2. **`cairn-doctor` (the old JS/npm doctor) is fully retired from the engine.** `src/lib/doctor/`
   (16 files) and the `cairn-doctor` bin are deleted; every doctor duty (health checks, config
   checks, CSRF/role/dependency-floor checks) moves to the Go tool's `cairn doctor` and `cairn
   health`. Landed: Unreleased (retire-2a, merged `688aba41`, 2026-09-22); retire-2b (records/
   changelog close) still pending as of this snapshot. Docs: `docs/reference/doctor.md` (the old npm
   doctor's reference page) is **retired**; `docs/reference/cli-cairn-doctor.md` is the new home
   and is covered. `docs/admin/is-it-working.md`, `setup-recovery.md`, `troubleshooting.md`,
   `what-to-run-and-when.md` were fixed in the same pass to point at the Go tool. `cairn-doctor`
   also separately lost `--fix` and the `skill.admin-screens` check earlier in the window (folded
   into `cairn-guidance`, see below) before being removed outright.

3. **New `cairn-guidance` CLI/bin** installs and freshness-checks the package's shipped Claude
   skills, the read-only review agent, and a `CLAUDE.md` fragment for a scaffolded site (`npx
   cairn-guidance install` / `check`). Replaces `cairn-doctor --fix` and
   `skill.admin-screens`/`skill.admin-screens-stale`. Landed: Unreleased (extend-2). Docs: covered
   — `docs/reference/guidance.md`. **Consumer action**: run `npx cairn-guidance install` after
   bumping past this point.

4. **`create-cairn-site` now bakes agent-facing guidance into every new scaffold**: a real
   `.github/workflows/check.yml` CI workflow, `npm run check:cairn`, and a "hand-over text" naming
   both, shown right after scaffolding (not in the fixed transcript blocks the page quotes).
   Landed: Unreleased. Docs: `docs/admin/create-your-site.md` already has a note (per facts
   `admin.md:33-34`) that the fixed transcripts predate this and the info now shows only in the
   live hand-over text — flagged as a known transcript/prose gap in the facts container itself,
   not fully resolved on the page.

5. **`create-cairn-site`'s cost copy no longer offers Workers Paid as optional** when it is
   actually required for the step being described (email onboarding). Landed: Unreleased
   (bugfix). Docs: `docs/admin/before-you-start.md`/`own-your-domain.md` already state the Workers
   Paid requirement per facts; confirm no stale "optional" wording remains (not independently
   re-checked here).

6. **New `config.media-bucket-missing` and `config.no-referrer-blanket` doctor conditions** (now
   under the Go `cairn doctor`), and the doctor's status vocabulary widens to four states
   (PASS/FAIL/SKIP/INFO/UNCHECKED, actually five words) plus a third exit code (3, for
   "UNCHECKED, nothing failed"). `config.dependency-floors` now also reads pnpm/yarn locks.
   Landed: Unreleased (conventions pass Task 10, then re-landed in the Go tool). Docs: covered —
   `docs/reference/cli-cairn-doctor.md` and `docs/admin/is-it-working.md`. **Consumer action for a
   CI job**: branch on exit 3 (unchecked) vs 1 (real failure) if it wants to distinguish them.

7. **`site-facts.json` contract**: every site's `cairn-manifest` run now also writes
   `src/content/.cairn/site-facts.json` (media bucket binding, role vocabulary, AI-crawler
   posture) so the Go tool can read adapter-derived facts without parsing TypeScript. Landed:
   Unreleased. Docs: covered — `docs/reference/site-facts.md`. **Consumer action**: run `npx
   cairn-manifest` once and commit the new file.

8. **A magic link now only signs in the browser that requested it** — operator-visible via
   `docs/admin/troubleshooting.md` (already covered, see editors #8) and via the required
   migration `0004_login_nonce.sql` (see Extend #below and "Retired/removed").

No new setup/scaffold/domain/invite flow shipped in this window beyond the above; `create-cairn-site`
chapters (GitHub App, Cloudflare, domain, Workers Builds) are unchanged in shape.

---

## Extending developers (new seams, exports, removed/renamed surface)

### New seams and exports

1. **The identity seam**: `createAuthGuard` gains an `identity` option so a site behind its own
   gate (Cloudflare Access or any origin that can prove an email) signs editors into `/admin`
   using the organization's own identity instead of magic-link, with owner/editor roster
   authorization unchanged. New Unstable-tier types `IdentityResolver`, `ResolvedIdentity`,
   `IdentityRefusal`; new diagnostic conditions `auth.identity-unresolved`/`auth.identity-unknown`;
   `LoginData` becomes a discriminated union. Landed: Unreleased (identity-seam pass, merged
   `ac0d4d52`, 2026-09-08). Docs: **covered** — `docs/extend/sign-in-through-your-organization.md`
   (new page), referenced from `docs/why-cairn.md` and `docs/extend/security-model.md`.

2. **`previewRevoke`/`revokePreview` (`/sveltekit`)** completes the preview-mint/-revoke pair for
   a site's own workflow route (was previously only reachable via the engine's own route). Landed:
   Unreleased. Docs: covered — `docs/extend/share-a-draft-preview.md`,
   `docs/reference/sveltekit.md`.

3. **New `/log` subpath**: exports `createLogger` (generic factory), `CAIRN_LOG_EVENTS`,
   `REDACTED_LOG_KEYS` (with a documented redaction algorithm: 3-level recursion, key-name
   normalization, frozen arrays, an optional `redactKeys` union). Landed: Unreleased. Docs:
   covered — `docs/reference/log.md`, `docs/reference/log-events.md`.

4. **New `/admin-sources.css` subpath**: ships the engine's Tailwind `@source` manifest as one
   importable line, replacing the old five-line form every site (and the scaffold template) had to
   hand-author. Landed: Unreleased (extend-1/extend-2). Docs: covered —
   `docs/reference/cairn-audit.md`, `docs/reference/README.md`. No behavior change (byte-identical
   compiled output); no `Consumers must:` line.

5. **New admin-toolkit exports**: `MediaPicker` (+ `MediaSelection`, `MediaLibraryEntry`) now
   publishes from `/admin-toolkit`; `ToolbarDisclosure` (extracted disclosure primitive);
   `ExpandableRow` gains `data-cairn-inert-cell` for interactive summary cells; `AdminTable` gains
   two additive props for batch selection; `Tooltip` is new. Landed: Unreleased. Docs: covered —
   `docs/extend/add-a-custom-admin-screen.md`, `docs/reference/admin-toolkit.md`.

6. **`cairn-audit` gains many new rules** (motion-vocabulary/-property/-hover-gate/-reduced-delay,
   log-event-grammar, log-secret-field, stripe-trim-parity, unlayered-font-clobber, list-role,
   panel-width) plus a `--rule <id>` CLI filter and a `sheet` config key accepting multiple
   compiled-CSS sources. Landed: Unreleased (extend-1, motion enforcement pass). Docs: covered —
   `docs/reference/cairn-audit.md`.

7. **New packaged skills `cairn-extend` and `cairn-consult`** route an extending developer to the
   matching seam doc / trigger an engine consultation. Landed: Unreleased (extend-2). Docs:
   covered via `docs/reference/guidance.md` and the skill files themselves (not register-graded).

8. **`docs/internal/facts/` (the facts container)** is a new internal mechanism (not a consumer
   surface) gated by `check:facts`; mentioned here because it is the source most of this inventory
   draws from. No public-docs page describes it (by design — internal only).

### Removed / retired

1. **`cairn-doctor` (npm/JS) removed entirely**, see Operators #2 above. Also earlier in the
   window lost `--fix` and `skill.admin-screens`/`-stale` (folded into `cairn-guidance`).

2. **`OfficeList` (`/admin-toolkit`) retired.** Replace with `PageHeader` + `AdminTable` inside a
   bare `overflow-hidden card-shell card-shadow` div; a worked replacement snippet ships in the
   CHANGELOG. Docs: covered — `docs/extend/migration-notes.md`; confirm
   `add-a-custom-admin-screen.md`'s own worked example still doesn't reference `OfficeList`.

3. **`iconSpan`, `cardShell`, `headRow` (`/render`) removed.** `/render` is now type-only
   (`ComponentContext` alone); each function's body is given inline in the CHANGELOG for a site to
   re-home into its own chassis. Affects `ecxc-ski`, `xcathletes-org`, `cairn-pub`,
   `aksailingclub-org` directly (named in the changelog). Docs: covered —
   `docs/reference/render.md`, `docs/reference/core.md`, `docs/extend/migration-notes.md`.

4. **`AssetConfig.variants` / `VariantSpec` retired** (ruling 4, 2026-09-01). Docs: check
   `docs/extend/` media/asset pages for a stale reference (not independently verified this pass).

5. **Roughly 25+ renamed exports/parameter-bag types** across `/sveltekit`, `.`, `/delivery`,
   `/delivery/data`, `/auth-crypto`, `/auth-channel`, `/media`, `/cloudflare` under the
   `convention-verb-rules`/`convention-bare-noun-functions`/`convention-parameter-bags`/`outcome`-
   idiom rulings (e.g. `createContentRoutes`/`createCairnAdmin`/`createNavRoutes`/
   `createMediaRoute` collapse to one config-bag parameter; `serializeManifest`→`formatManifest`;
   `cookieName`→`buildCookieName`; `githubApp`→`createGithubApp`; `adminAction`→
   `createAdminAction`; `previewMint`→`mintPreview`, `previewLoad`→`loadPreview`, `healthLoad`→
   `loadHealth`; `RequestResult`→`RequestOutcome`; `checkRateLimit`/`checkRateLimitKeys`→
   `resolveRateLimit`; `EditorRow`→`UnresolvedEditor`; six `*Options`→`*Config` type renames; six
   log events renamed onto a consistent `refused`/area vocabulary). All breaking, all
   `Consumers must:`-flagged, all name-only (no behavior change). Docs: **fully covered and
   consolidated** — `docs/extend/migration-notes.md`'s `## Unreleased` section exists specifically
   to save a reader from re-deriving this list from the CHANGELOG.

6. **`createAuthChannel`'s event/options shape changes**: `AuthChannelEvent` → `CairnEvent`;
   `ttl: {...}` → `limits: { <group>: {...} }`; `lookup`/`verify` gain a `{ env }` context param;
   the packaged channel migration SQL replaces any hand-transcribed `CHANNEL_SCHEMA_SQL` copy.
   Docs: covered — `docs/extend/add-a-second-audience.md`, `migration-notes.md`.

7. **Migration `0004_login_nonce.sql` is now required** before deploying (backs the
   browser-bound magic-link fix); an unmigrated `AUTH_DB` is a total login outage. Docs: covered
   — `docs/admin/is-it-working.md` facts confirm the doctor/health check for this; migration-notes
   states the required action.

### Not new, but reconfirm docs match

- `MarkdownEditor`'s 13 `register*` props collapsed (internal refactor pass, Task 7) — check
  `docs/extend/` if any page still shows the old prop names for a custom `MarkdownEditor` mount
  (not verified this pass; low risk since `MarkdownEditor` is documented as a seam elsewhere).
- `content-routes-entry.ts` / `content-routes-media.ts` internal module splits — no public surface
  change, no doc action.

---

## Front door / why-cairn (evaluator-facing)

`docs/internal/facts/front-door.md` (harvested 2026-09-15) is largely stable prose about scope and
positioning; nothing in the Unreleased window changes its claims except:
- "The current published version is `0.96.0`" (CLAUDE.md) is now stale relative to work landed
  since, though no new version number exists to replace it (still unpublished as of 2026-09-22).
- The identity seam (Cloudflare Access sign-in) is already referenced at `docs/why-cairn.md:20`
  and its seam page now exists (was previously a forward reference to an unread page per the
  facts container's own tag).

---

## Summary of uncovered / partially-covered items

1. **Command palette has no editors-track documentation at all** — the single biggest editor-facing
   gap. It went from a bare, unlabeled trigger to a fully reworked ARIA combobox with its own
   distinct behavior (Ctrl+K opens it only outside the editor, live announcements, keyboard nav),
   and `docs/editors/write-in-the-editor.md` still only lists it as an "additional shortcut this
   page never documents."
2. **`create-your-site.md`'s three fixed transcript blocks are known-stale** against the new
   scaffold hand-over text (CI workflow, `check:cairn`); the facts container flags this explicitly
   but the page itself carries only a narrow note, not a full fix.
3. **`AssetConfig.variants`/`VariantSpec` retirement** — not independently confirmed clean in the
   extend media docs; worth a targeted grep before the outline ships.
4. Everything else identified above (identity seam, `cairn` Go tool, `cairn-guidance`,
   `site-facts.json`, `/log`, `/admin-sources.css`, admin-toolkit exports, `OfficeList`/`iconSpan`/
   `cardShell`/`headRow` removals, the ~25 renames, doctor retirement) already has matching,
   gate-checked documentation (reference arm via `check:reference`, migration-notes.md, or the
   relevant admin/extend narrative page), per the grep pass in this file's method section.
