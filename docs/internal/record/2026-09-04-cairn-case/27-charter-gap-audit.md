# Charter-versus-engine gap audit (2026-09-07, fresh-context Opus read against main at fece567c)

Write-once record. Findings routed through docs/internal/docs-friction-log.md the same day.


Read-only research, cairn-cms `main` @ d565ab77, 2026-09-07. Sources read in full:
`docs/internal/what-cairn-is-and-is-not.md`, `CLAUDE.md` ("What cairn is", "The
extending-developer lens"), `docs/why-cairn.md`, `docs/extend/README.md`,
`docs/internal/extending-developer-lens.md`, plus `docs/internal/api-surface.md` (the generated
surface snapshot), the `/sveltekit` and auth sources, and `docs/internal/engine-rulings.md`
(535 `audit-*` rows).

## 1. The claims, numbered, with verdicts

| # | Claim (source) | Verdict | Evidence |
|---|---|---|---|
| 1 | "A developer can replace the admin auth with their own framework (cairn then mints no session and reads an owner/editor identity through a defined hand-off)", `what-cairn-is-and-is-not.md:61-64`; `CLAUDE.md:33` | **PROMISED WITHOUT A SEAM** | `AuthGuardOptions` carries only `roles`, `access`, `includeSubDomains` (`src/lib/sveltekit/guard.ts:33-62`). The guard hardcodes the store: `resolveSession(env.AUTH_DB, id, Date.now())` (`guard.ts:177-178`), and refuses every admin path without `AUTH_DB` (`guard.ts:125-132`). `createAuthChannel` builds a *second* audience's own login and admits nothing to `/admin` (`docs/extend/add-a-second-audience.md:17-24`). No extend page teaches replacing the editor login. Already logged: `docs/internal/docs-friction-log.md:27-42`. |
| 2 | "Override the default authorization through a thin seam", `what-cairn-is-and-is-not.md:63-64`; `CLAUDE.md:33` | **IMPLEMENTED AND DOCUMENTED (partial)** | `defineAccess`/`canReach` (`src/lib/auth/access.ts:15-80`), taught by `docs/extend/restrict-admin-access.md`, wired at `guard.ts:189-193`. Partial: the map is data, not a predicate. It only *narrows* by role name (`restrict-admin-access.md:7-9`, "It never widens what a capability already permits"), owner bypasses it entirely, and the authority function `canReach` is not replaceable. A per-entry or per-record rule ("an editor may only edit their own posts") has no seam. |
| 3 | "The defaults are floors, not ceilings", `what-cairn-is-and-is-not.md:61` | **PARTIAL** | True for roles (`defineRoles`, `RoleDeclaration.home`) and authorization (#2). False for authentication (#1) and for the identity store (#4). |
| 4 | The auth store is replaceable (implied by #1, "cairn mints no session") | **PROMISED WITHOUT A SEAM** | `/auth-store` exports only D1-typed helpers, every one taking `db: D1Database` (`api-surface.md:170-182`). `CairnEnv.AUTH_DB?: D1Database` is the only binding shape (`api-surface.md`, `.` section). `resolveSession` is an un-exported internal (`src/lib/auth/store.js`, imported by `guard.ts:5`). Same root cause as #1. |
| 5 | "Everything a site needs beyond [content and the admin frame] ... belongs to the developer, and cairn serves it with a thin seam", `what-cairn-is-and-is-not.md:55-57` | **IMPLEMENTED AND DOCUMENTED** | `CairnAdminShell` custom-route seam (`/components`), `navLayout` (`api-surface.md` `/sveltekit`), `locals.cairnEditor` (`src/lib/sveltekit/types.ts:82-87`), `createSectionAction` with the site's own `resolveDb` (`api-surface.md` `/sveltekit`), `requireAccess`. Pages: `docs/extend/add-a-custom-admin-screen.md`, `organize-your-admin-nav.md`, `restrict-admin-access.md`. |
| 6 | "cairn never names or models a domain actor; it only ever knows owner/editor", `what-cairn-is-and-is-not.md:67-68` | **CONTRADICTED (by omission)** | `/auth-channel` ships a whole second-audience identity subsystem: `createAuthChannel`, code TTL, attempt caps, identity-keyed throttling, challenge hook, session cookie, `revokeSessions` (`api-surface.md:152-161`); `docs/extend/add-a-second-audience.md` Path B teaches it; xcathletes-org runs member login on it in production. It does not *name* the actor, so it survives the letter of the rule, but the charter's own cautionary tale (`what-cairn-is-and-is-not.md:99-103`, the reverted member-login over-build) reads as forbidding exactly this shape, and the charter never mentions the subsystem that now exists. Adjudicated only in the ledger (`engine-rulings.md:3220-3260`, keep on adoption evidence), never folded back into the charter. |
| 7 | "The seams are a narrow, versioned, enforced contract ... a developer's work survives ordinary updates. A breaking change is a deliberate, signposted major-version event, not an everyday occurrence", `what-cairn-is-and-is-not.md:72-78`; `CLAUDE.md:31-32` | **CONTRADICTED (charter overclaims; the public docs are honest)** | `docs/extend/README.md:118-125` records two Extension-API-tier breaks inside minors (`AdminShellData`/`navFilter` at `0.86.0`; `NavLayoutEntry` rename at `0.94.0`); `docs/why-cairn.md:52-56` says the same. `check:surface` is a *snapshot-drift detector* over the built `.d.ts`, not a prevention gate ("regenerating the golden file is the deliberate disclosure moment", `scripts/checks/check-surface.mjs:1-12`); `check:version` enforces size markers, not breakage disclosure (`scripts/checks/check-version.mjs:1-7`). The charter carries no pre-1.0 caveat at all. |
| 8 | "Upgrade smoothly ... without hand-applying scattered `Consumers must` steps", lens diagnostic Q4, `extending-developer-lens.md` | **DOCUMENTED BUT NOT IMPLEMENTED** | `docs/extend/upgrade-cairn.md:24-38` is precisely hand-applying every crossed `Consumers must:` line, plus hand-running `wrangler d1 migrations apply`. `doctor` verifies a deploy, not a version crossing. The lens flags itself point-in-time, but the charter's "cheap to honor" claim rests on this. |
| 9 | "Content is markdown in git, a fixed set of first-class concepts (Posts, Pages) ... not open-ended collections", `what-cairn-is-and-is-not.md:22`; `CLAUDE.md:10` | **CONTRADICTED** | `docs/extend/declare-your-own-concept.md:9-12`: "Posts and pages aren't special names cairn reserves; they're just concepts a site happened to declare. The concept set is entirely yours." `defineConcept` accepts any `ConceptConfig`, `CairnAdapter.content` is an open record (`api-surface.md`, `.`). The concept *model* is fixed (a directory plus a fieldset); the concept *set* is open. The charter's wording says the opposite and could wrongly reject a legitimate proposal. |
| 10 | "Each site supplies ... its own `render(md)`, the one renderer the editor preview and every public page call", `CLAUDE.md:6-8`; `docs/extend/configure-rendering.md:9-14` | **IMPLEMENTED AND DOCUMENTED** | One slot: `CairnAdapter.rendering.render: SiteRender` (`src/lib/content/types.ts:212`, `:255`), consumed by preview and by `createPublicRoutes` (`src/lib/delivery/public-routes.ts:14-24`). A site can opt out of `createRenderer` entirely (any function of the `SiteRender` shape). Nothing *enforces* single-renderer-ness if a site hand-writes public routes that bypass cairn's delivery; the guarantee is structural (one slot), not gated. Acceptable as stated. |
| 11 | The GitHub backend is a seam ("the Backend interface" listed as a seam with a stability tier, `docs/extend/README.md:110-113`) | **IMPLEMENTED BUT UNDOCUMENTED, and doc-vs-doc contradicted** | `BackendProvider` is Extension API tier (`docs/reference/core.md:1040`); nothing in `src/lib` branches on `provider.kind` (grep found no `kind === 'github-app'`), so a custom provider is structurally admissible. But no extend page teaches writing one, and `docs/why-cairn.md:46-48` states flatly: "cairn has no abstraction layer that lets you swap Cloudflare for another host, or GitHub for another repository provider, later." Peripheral GitHub coupling remains (`CairnEnv.GITHUB_APP_PRIVATE_KEY_B64`, `healthLoad`'s `githubAppSigning` check, `docs/extend/rotate-the-github-app-key.md`, the `cairn/<concept>/<id>` branch model). |
| 12 | A site not on Cloudflare Email Sending can supply its own sender | **IMPLEMENTED BUT UNDOCUMENTED** | `SendMagicLink` is Extension API (`docs/reference/sveltekit.md:2050`), reachable through the composed facade as `CairnAdminConfig.auth.send` (Extension API, `docs/reference/sveltekit.md:1975`) even though `AuthRoutesConfig` itself is Unstable. No `docs/extend/*.md` page mentions it (grep for `send:` in the extend track returned nothing), and `SenderConfig` is documented as "Magic-link sender identity for Cloudflare Email Sending" (`docs/reference/core.md:1044`). |
| 13 | The audit/observability seam is the site's | **IMPLEMENTED AND DOCUMENTED** | `AdminActionAuditSink` via `event.locals.cairnAuditSink` (`src/lib/sveltekit/admin-action.ts:42-43`, `:279`), packaged default `createD1AuditSink` (`src/lib/sveltekit/audit-sink.ts:62-95`), taught in `docs/extend/add-cairn-to-a-sveltekit-app.md:116` and `docs/reference/ambient.md:50-54`, with its own failure events (`docs/reference/log-events.md:73`, `:81`). Genuinely replaceable, genuinely documented. Best-executed seam in the set. |
| 14 | Media: the library is cairn's, storage is the site's | **IMPLEMENTED (storage only), correctly scoped** | `AssetConfig.bucketBinding` is R2-only (`api-surface.md`, `.`; `CairnMediaBindings { MEDIA_BUCKET: R2Bucket }`). The `CairnMediaLibrary` component is not replaceable. Consistent with the charter's Cloudflare commitment; nothing promises otherwise. |
| 15 | "A second audience's members are the site's", `what-cairn-is-and-is-not.md:67-68`; `docs/why-cairn.md:70-75` | **IMPLEMENTED AND DOCUMENTED, by design** | `docs/extend/add-a-second-audience.md:17-24` states plainly that Path B's audience gets no `CairnAdminShell` integration and no admin-side visibility, and names the price. There is no admin-side member roster, and that is deliberate, not a gap. Sound. |
| 16 | "cairn-audit ships whole, as consumer product", `what-cairn-is-and-is-not.md:44-51` | **IMPLEMENTED; charter fact is stale** | The charter says "all 23 registered rules"; the tree and `docs/reference/cairn-audit.md` count 28. Already logged (`docs-friction-log.md:24-26`). |

## 2. Ranked gaps

Sizing is relative to the identity seam (#1), taken as the unit.

### Rank 1, the identity hand-off (claim #1 + #4). PROMISED WITHOUT A SEAM. Size: 1.0x (the unit).
The charter has promised this since it was written; neither code nor docs carry it. The lean shape,
matching the friction log's own reading: one optional `AuthGuardOptions.resolveEditor?: (event) =>
Promise<Editor | null>`. When set, the guard skips the cookie read, skips `resolveSession`, skips the
`AUTH_DB` refusal, and populates `locals.cairnEditor` from the site's answer; capability still
resolves through the declared vocabulary, so `requireEditor`/`requireOwner`/`requireAccess` and the
access map are untouched. That covers both a site's own auth framework and an Access-style header.
The roster screens (`/admin/editors`, `createEditorRoutes`) then need a documented posture (hide via
`navLayout`, or refuse), because the D1 roster stops being the source of truth. One guard change, one
option, one extend page, one reference row.

### Rank 2, the charter's stability claim is stronger than the engine's (claim #7). CONTRADICTED. Size: ~0.1x, prose only.
`why-cairn.md` and `extend/README.md` already state the honest version, with the two named minor
breaks. The charter states the aspirational version with no caveat, which means an agent reading the
charter first (as `CLAUDE.md` instructs) gets the wrong picture of what the surface guarantees. Fix
is a clause in `what-cairn-is-and-is-not.md:72-78` naming the pre-1.0 reality and pointing at
`extend/README.md#operate-across-versions`, plus a one-line correction to the "enforced" word:
`check:surface` detects and discloses drift, it does not prevent a break.

### Rank 3, "a fixed set of first-class concepts ... not open-ended collections" (claim #9). CONTRADICTED. Size: ~0.05x, prose only.
The charter and `CLAUDE.md` both say the concept *set* is fixed; the shipped seam and its own extend
page say it is entirely the site's. The risk is not user-facing (the docs are right), it is that this
sentence is quoted in scope adjudications. Fix: say the concept *model* is fixed (a directory of
markdown plus a fieldset, no runtime content database) and the set is the site's, with Posts and Pages
as the zero-config default.

### Rank 4, the upgrade contract (claim #8). DOCUMENTED BUT NOT IMPLEMENTED. Size: ~0.6x, and it is real engine work.
The lens's own Q4 is unmet and the charter leans on it ("survives ordinary updates", "cheap to
honor"). The leanest non-prose fix is a machine-readable `Consumers must:` record shipped in the
tarball plus a `doctor`-adjacent check that reads the installed version, the site's previous version,
and reports the crossed list, rather than a codemod. That is a real subsystem; it may well be right to
answer this one with prose (state the manual cost in the charter) until `1.0` approaches.

### Rank 5, the Backend seam's status is contradicted between two published docs (claim #11). Size: ~0.15x.
Either `why-cairn.md:46-48` is wrong (a custom `BackendProvider` is admissible and Extension-tier), or
the tier assignment overpromises. Pick one and make the docs agree. The cheap resolution: keep
`why-cairn`'s honesty about the *stack* commitment (D1, R2, Workers are genuinely unswappable) and
narrow its GitHub sentence to "no page teaches a non-GitHub backend, and the health check, the key
rotation flow, and the branch model all assume git", which is true and leaves the tier honest.

### Rank 6, the custom sender is undiscoverable (claim #12). IMPLEMENTED BUT UNDOCUMENTED. Size: ~0.1x.
`CairnAdminConfig.auth.send` is the answer for a site whose domain cannot use Cloudflare Email
Sending, and it exists at Extension tier, but the whole extend track never mentions it. A short
section in an existing page (`add-cairn-to-a-sveltekit-app.md`, beside the bindings) closes it.

### Rank 7, authorization can only narrow by role (claim #2). PARTIAL. Size: unknown; do not build yet.
No promise is broken (the charter says "override the default authorization", and the map does that),
but the seam cannot express any predicate that is not a role-name list: no per-entry ownership, no
per-request condition. Worth naming as a known ceiling rather than fixing speculatively; the charter's
own failure mode ("a reviewer asked to find gaps will always find some") applies directly here.

## 3. Reverse check: surface the leanness test would question

The 2026-08-26 any-site audit already ran a whole-surface leanness pass; `engine-rulings.md` carries
535 `audit-*` rows, one per export, so most of this list has an adjudicated row. What follows is the
subset where the charter's own text does not carry the answer.

| Surface | Ledger row | Standing |
|---|---|---|
| `/auth-channel` (`createAuthChannel`, code TTL, attempt caps, identity-keyed throttle, challenge hook, session, `revokeSessions`) | `audit-auth-createauthchannel` (`engine-rulings.md:3220`), reshape then **KEPT** on adoption evidence (Geoff, 2026-08-30), plus 8 family rows | The largest test of the boundary, and the charter never mentions it. Kept on "xcathletes runs it in production" plus the high-consequence-hand-roll argument, explicitly **not** on any-site breadth; leanness held by the opt-in subpath. The charter should say so, since read alone it forbids this shape. |
| `/cloudflare`: `verifyTurnstile`, `resolveRateLimit`, `VerifyTurnstileOptions` | `audit-cloudflare-verifyturnstile` (`:3400`), `audit-cloudflare-verifyturnstileoptions` (`:3367`), both **keep** | Generic host utilities, nothing to do with markdown content. Admitted as support for the auth surfaces above. Defensible only as long as `/auth-channel` stands. |
| `createSectionAction` + `SectionActionConfig.resolveDb` (the engine wrapping a site's own D1) | `audit-sveltekit-createsectionaction` (`:2471`) and 4 family rows, all **keep** | In tension with the lens's own standing rule ("the custom feature owns its own D1 binding directly; the backend interface never grows a `query()`"). It is a wrapper, not a data layer, so the rule holds; worth stating that distinction where the rule is written. |
| `/reproductions` and `/reproductions/manifest` (a story/reproduction module on a public export subpath) | Per-export rows exist (`:3983`, `:3995`, record `record/2026-08-26-any-site-audit/rank-reproductions.md`), but **no row admits the subpath itself** | The one publicly exported subsystem whose consumer audience is unstated in the charter. It is engine-development apparatus by shape; `cairn-audit` got an explicit charter paragraph settling the same question, this did not. |
| Tidy (`TidyConfig`, `TidyConventions` with `oxfordComma`/`numberStyle`/`measurements`, `TidyClient`, `CairnTidySettings`) | `audit-adapter-tidyconventions` (`:662`), `audit-adapter-tidyconfig` (`:669`), `audit-admin-cairntidysettings` (`:2743`), keep; `TidyClient` reshape (`:1730`) | Explicitly admitted by the charter ("it may use AI as an optional assist inside the editor", `what-cairn-is-and-is-not.md:30-31`). A house-style engine is a lot of surface for that clause, but the clause is real and the injectable `TidyClient` keeps it a seam. |
| `cairn-audit` (28 rules) | Charter paragraph, `what-cairn-is-and-is-not.md:44-51`, plus many CLI rows | Settled 2026-08-08 on evidence. Only the stale "23" needs fixing. |
| Nav editor (`NavMenuConfig`, `createNavRoutes`, a git-committed YAML site menu) and the vocabulary/tags screen | `audit-adapter-navmenuconfig` family, keep | Site information architecture, edited by editors, stored in git: inside "managing markdown content" by a reasonable reading. Not questioned. |
| `previewMint`/`previewRevoke`/`previewLoad` (share a draft preview) | audit rows exist | Part of the publish flow, on the core job. Sound. |
| `/admin-toolkit`, `/components`, `admin-grammar-tokens` | many keep rows | The charter names the admin skeleton as a committed opinion (`:41-43`). Sound. |

## 4. What was verified as sound

- The audit sink (#13): a real replaceable seam, with a packaged default, an extend page, a reference
  page, and its own failure log events. The model the identity seam should copy.
- The second-audience boundary (#15): the docs state the price of Path B plainly, including that
  nothing plugs into `CairnAdminShell` and that there is no admin-side member visibility. That is the
  charter working, not a gap.
- The custom admin screen seam (#5): `CairnAdminShell` + `navLayout` + `locals.cairnEditor` +
  `requireAccess` + `createSectionAction`, each with a reference row and an extend page. The
  `none`-capability contract (a `none` session still authenticates and passes through the shell
  untouched, `src/lib/sveltekit/guard.ts:246-252`) is the detail that makes Path A work.
- The single-render contract (#10): one adapter slot, consumed by both the preview and the delivery
  routes; no second path to keep in sync.
- The access map's fail-closed postures (#2): `requireAccess` refuses every session when no map exists
  (`AuthGuardOptions.access` doc comment, `guard.ts:38-47`), while `canReach` admits an unmapped
  target, and the two readings are documented as deliberate rather than drifting.
- Media (#14): storage is R2-only and nothing claims otherwise.
- The rulings ledger itself: 535 adjudicated export rows means the reverse check has very little
  genuinely unexamined surface. `/reproductions`'s subpath-level standing is the one real hole.
