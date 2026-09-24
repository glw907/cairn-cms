# Candidate dispositions, docs reset pass 1 Task 7

Task 7 triaged 159 `[candidate]` facts in five container files whose only source was an old docs page: admin 12, editors 2, extend 100, front-door 8, reference 37. It retained 137, retagged `[verified]` with a code source. It rejected 2, each deleted on a cited code line that proves it false. It excluded 20, each retagged `[candidate: excluded, <reason>]`. No id changed. One Sonnet agent triaged each file, and one Opus 5.5 read then checked the verdicts. That read upheld both rejects. It turned two extend retains into excludes (`f:icjjtd`, `f:zgdkq7`), because their only support was a docs page or an operational record. It swapped a docs-page source for a code line (`f:zpjl8k`), qualified six tags that overstated, and split a vendor price out of `f:aj9516` into a new `[vendor]` bullet, `f:wxe8fc`. It also refiled the true half of rejected `f:7l8ysb` as a new `[verified]` bullet, `f:hdebf7`. The plan counted 134 in scope, and the pre-flight counted 135. Those counts matched the literal `sourced to the page only` tag, and 11 of the 135 are front-door owner-tier bullets, which belong to lane A. The slices widened scope to every page-only candidate under any tag wording, which adds 35: extend `f:my9dgx`, front-door `f:8289h7`, `f:i74t7g`, `f:u705t5`, and `f:mf00hq`, and 30 reference bullets sourced to "page text".

| File | Found | Retained | Rejected | Excluded |
| --- | --- | --- | --- | --- |
| admin.md | 12 | 9 | 1 | 2 |
| editors.md | 2 | 0 | 0 | 2 |
| extend.md | 100 | 88 | 0 | 12 |
| front-door.md | 8 | 6 | 0 | 2 |
| reference.md | 37 | 34 | 1 | 2 |
| **Total** | **159** | **137** | **2** | **20** |

## admin.md

| id | verdict | detail |
| --- | --- | --- |
| `f:jzgztr` | RETAIN | New source: `src/lib/github/repo.ts:1` ("repo reads and the commit, over the GitHub REST API"), `src/lib/sveltekit/platform-bindings.ts:36` (`AUTH_DB: D1Database;`, the only required database binding, used solely for the magic-link auth store, never content). |
| `f:3jpoi3` | RETAIN | New source: `packages/create-cairn-site/src/cloudflare/secret.mjs:32` (`runWrangler(['secret', 'put', 'GITHUB_APP_PRIVATE_KEY_B64'], ...)`), `:45` ("regenerate it at the App's settings page on github.com and re-run this step"). Qualified `[verified: ...]`: the wrangler step and the settings-page access are code-traced; "the App can hold two keys at once" is GitHub's own platform behavior, not independently re-checked. |
| `f:58xph1` | EXCLUDE | Reason: a broad continuity/handoff claim about external GitHub and Cloudflare account ownership; no single code path proves those two accounts hold "everything needed", so it could not be traced either way. |
| `f:ogq0pm` | RETAIN | New source: `src/lib/sveltekit/auth-routes.ts:167-168` ("POST /admin/auth/request. Looks the email up in the allowlist; on a match, issues a token, emails the confirmation link"), `:185` (`log.info('auth.link.requested', { email: email.slice(0, 320) })`). |
| `f:pwzfrj` | RETAIN | New source: `src/lib/log/create.ts:26-42` (`REDACTED_LOG_KEYS`, including `session_id`, `session_token`, `auth_token`, `token`), `src/lib/sveltekit/content-routes-entry-write.ts:488` (`editor: editor.email`). Qualified `[verified: ...]`: the redaction constant and the editor-email pattern are traced; not exhaustively checked against every log call site. |
| `f:y4nzgp` | RETAIN | New source: `src/lib/sveltekit/commit-log.ts:33-39` (`logCommitFailed`: "a conflict is the expected last-writer-wins outcome... warns with a reason"), `src/lib/github/repo.ts:275-277` ("throws a `CommitConflictError` when the branch head is not `expectedHead` (a concurrent commit landed)... the editor's reload-and-reapply prompt"). |
| `f:bijnzl` | RETAIN | New source: `src/lib/sveltekit/commit-log.ts:39` (`log.warn(event, { ...fields, reason: 'conflict' })`), `:41` (`log.error(event, { ...fields, error: String(err) })`), `:61` (`return fail(409, payload)` on a conflict). |
| `f:hi9nim` | RETAIN | New source: `src/lib/components/CairnAdminShell.svelte:855` (`{#if pending && pending.length > 0}` gating the "Publish site (N)" button), `src/lib/sveltekit/content-routes-shell.ts:172-174` (`.catch((err) => { log.warn('github.unreachable', { scope: 'shell', error: String(err) }); return null; })`). |
| `f:4bazhe` | RETAIN | New source: `src/lib/sveltekit/guard.ts:355-361` (comment: "A role absent from the vocabulary... still authenticates at none capability; only the log names it"; `log.warn('auth.role.unknown', { email: editor.email, role: editor.role })`). |
| `f:n68dn6` | REJECT | Deleted. See "Rejected" below. Upheld by the Opus read; proving lines widened to `cairn-admin.ts:232,251,260` (below). |
| `f:71luk5` | RETAIN | New source: `src/lib/sveltekit/auth-routes.ts:358` (`log.warn('auth.link.refused', { reason: 'no_pending_cookie' })`), `src/lib/components/ConfirmPage.svelte:64` ("This browser has no pending sign-in"). |
| `f:s3kk8p` | EXCLUDE | Reason: a documentation/process convention (CHANGELOG.md format, CLAUDE.md Releases section); no code parses, enforces, or reads "Consumers must:" lines, so it could not be traced to src/tool/packages/scripts. |

### Rejected

**`f:n68dn6`**, full verbatim original text:

> `f:n68dn6` A custom admin screen's uncaught error is shown to the editor as a calm failure strip
> instead of a raw crash, logged as `admin.action.failed` with the error's message. Source:
> `docs/reference/log-events.md` `admin.action.failed` row. [candidate: sourced to the page only,
> not traced to code]

Original source: `docs/reference/log-events.md` `admin.action.failed` row.

Proving code lines: `src/lib/sveltekit/cairn-admin.ts:260` (the Opus read adds `:232`, where `viewAction` 404s any path outside its allowed views before the delegate runs, and `:251`, the only `admin.action.failed` call site in `src/lib`)

```
const authedViews = ['index', 'list', 'edit', 'history', 'editors', 'nav', 'media', 'settings', 'vocabulary', 'help'] as const;
```

`viewAction` (the function that catches an uncaught throw and logs `admin.action.failed`, per its
own doc comment at `cairn-admin.ts:211-212`, "anything else logs `admin.action.failed`...") is
called only with this `authedViews` list, the engine's own built-in admin views. A developer's own
custom admin screen, added through the `CairnAdminShell` custom-route seam
(`docs/extend/add-a-custom-admin-screen.md`), is the developer's own SvelteKit route, never
dispatched through this wrapper. The reference page itself confirms the scope, not just the
bullet's restatement of it: `docs/reference/log-events.md:78` reads "The single-mount admin's
action chokepoint catches an unexpected throw from an engine action" (an engine action, not a
custom admin screen's own action). A custom admin screen's own misconfiguration instead surfaces
as `admin.action.misconfigured` (`docs/extend/debug-your-site.md:28`), a different event. The
bullet's claim that a custom admin screen's error is what triggers `admin.action.failed` is false.

## editors.md

| id | verdict | detail |
| --- | --- | --- |
| `f:h044k3` | EXCLUDE | Claim: a page-level Vale suppression comment notes that `Microsoft.Quotes` false-fires on this page under Vale 3.19.0 around a bold-close marker followed by a comma, and that CI's pinned 3.15.1 does not reproduce it. Original source: `docs/editors/when-something-goes-wrong.md` lines 451-454, in-file HTML comment. Reason: the claim describes a Vale-linting suppression comment authored on the doc page itself (an authoring artifact about the docs pipeline), not a product or engine behavior. There is no `src/`, `tool/`, `packages/`, `templates/`, `scripts/`, `examples/showcase/`, or config line that could confirm or refute it; the doc page itself has also since been rewritten past line 451-454 in this worktree (172 lines total), so even the page-only source no longer resolves. Retagged `[candidate: excluded, describes a Vale-suppression comment on the doc page itself, not a product or code behavior; no src/tool/packages/templates/scripts/showcase/config line to trace it to]`. |
| `f:7gpm8a` | EXCLUDE | Claim: several quoted refusal strings carry paired `Microsoft.Contractions = NO/YES` Vale suppressions because they quote the editor's literal UI text verbatim, per the docs-register rule that a quoted literal string is never rewritten to satisfy a linter. Original source: `docs/editors/when-something-goes-wrong.md` inline comments at lines 480-483, 509-518, 544-560; `docs/internal/docs-register.md` lines 142-185. Reason: same as `f:h044k3`, this is a claim about Vale-suppression authoring metadata on the doc page, not a product or engine behavior; nothing in code proves or disproves it, and the cited page has since shrunk to 172 lines so those line numbers no longer resolve either. Retagged `[candidate: excluded, describes Vale linting suppressions on the doc page itself, not a product or code behavior; no src/tool/packages/templates/scripts/showcase/config line to trace it to]`. |

## extend.md

| id | verdict | detail |
| --- | --- | --- |
| `f:rurhey` | EXCLUDE | Reason: states the page's own worked `hooks.server.ts` composition example; no engine code asserts the `createAuthGuard`-before-`wireAuditSink` ordering requirement (`wireAuditSink` itself is the page's own example function, not shipped code). |
| `f:ff3l1u` | RETAIN | New source: `src/lib/sveltekit/audit-sink.ts:66` ("The sink is fail-open end to end: it returns synchronously, before the insert settles..."). |
| `f:lmtfkt` | RETAIN | New source: `src/lib/sveltekit/guard.ts:448-477` (`requireAccess`: `target` defaults to `event.route.id`, resolved per route; each route must call it explicitly, so a nested route's own rule is never inherited from a parent's call). |
| `f:rcpe0n` | RETAIN | New source: `src/lib/auth-channel/factory.ts:265` ("The channel's own D1 binding, never `AUTH_DB` (spec, decision 1: physical separation)"), `migrations-channel/0000_channel.sql` (its own migration path). |
| `f:pa2hqh` | RETAIN | New source: `src/lib/auth-channel/factory.ts:283-296` (`lookup`/`normalize`/`challenge` doc comments state the same three obligations almost verbatim). |
| `f:5f4kmk` | RETAIN | New source: `src/lib/github/types.ts:20`, `src/lib/github/repo.ts:262` (author/committer split, committer omitted so GitHub attributes to the App). Qualified: the literal name `cairn-cms[bot]` is GitHub's own App-naming convention, external to this repo. |
| `f:vpieos` | RETAIN | New source: `src/lib/env.ts:31` ("base64 of the PEM on one line, decoded with `atob()` before signing"), `src/lib/github/signing.ts:44,67,132`. |
| `f:if45on` | RETAIN | New source: `src/lib/env.ts:75-79` (`requireDb`, throws unless the site wires `AUTH_DB`). The `wrangler d1 create`/`migrations_dir` setup steps are external Wrangler CLI mechanics. |
| `f:rn62i1` | RETAIN | New source: `migrations/0000_auth.sql` (original CHECK, already `f:xkkt1o`), `migrations/0001_roles.sql` (lifts it), `migrations/0003_preview.sql:1-2` ("Opt-in: only a site that mints preview links..."). |
| `f:pkrwom` | EXCLUDE | Reason: the opt-in half traces to `migrations/0002_audit.sql`'s own header (already `f:wnvqlz`); the "commonly `AUDIT_DB`" naming convention and the write-contention rationale have no corresponding constant or comment anywhere in the engine. |
| `f:zcwf5i` | RETAIN | New source: `src/lib/github/backend.ts:87,104` ("the GitHub App's non-secret identity facts"; "the private key stays a Worker secret"). |
| `f:m0ouh8` | RETAIN | New source: `tool/internal/doctor/check_bindings.go:17-28` (`config.bindings` confirms `EMAIL`/`AUTH_DB`); no `github.app` check exists among the eleven `tool/internal/doctor/check_*.go` files. |
| `f:w3m0ac` | RETAIN | New source: `src/lib/delivery/manifest.ts:56-65` (`buildNewlyPublished`: `priorStamps` keyed only by `keyOf(e)`, no special case for delete-then-recreate; confirmed by direct inspection of the function body). |
| `f:xlj297` | RETAIN | New source: `src/lib/delivery/manifest.ts:47-53` ("The engine performs no network sends; a consumer diffs and then acts."). |
| `f:a7qx4m` | RETAIN | New source: `package.json:88-179` (`exports` map lists every named subpath). |
| `f:4esdoz` | RETAIN | New source: `src/lib/content/adapter.ts:26-29`, `src/lib/content/types.ts:226-274` (`CairnAdapter`, the single seam). Qualified `[verified: structurally ...]`: "never hard-codes" is the adapter pattern's design consequence, not one asserted line. |
| `f:cjonmm` | RETAIN | New source: `src/lib/content/pending.ts:1-11` (`pendingBranch`: `cairn/<conceptKey>/<id>`), `src/lib/sveltekit/content-routes-entry-write.ts:1-5` (module comment: save stops at the pending branch, publish reuses it), `src/lib/github/types.ts:20`. |
| `f:cng7dr` | RETAIN | New source: `src/lib/sveltekit/content-routes-entry-read.ts:1-4` (`editLoad`/`historyLoad` read GitHub directly), `src/lib/content/manifest.ts:473` (`inboundIncludes`, a manifest-backed corpus read). |
| `f:e69d0l` | RETAIN, claim corrected | The manifest is patched in the same commit as a **publish**, not the intermediate save (`content-routes-entry-write.ts:341-352`: "a save commits no manifest, so the moment an entry goes live is this [publish] commit"). Claim text rewritten in place; the page itself was not touched (frozen this pass). |
| `f:i87sd3` | RETAIN | New source: `src/lib/content/types.ts:226-274` (adapter fields), `src/lib/sveltekit/admin-nav.ts:300` (`navLayout`), `src/lib/github/backend.ts:78,162` (`BackendProvider`/`createGithubApp`). |
| `f:ez788q` | RETAIN | New source: same `src/lib/auth-channel/factory.ts:283-296` doc comments as `f:pa2hqh` (this bullet is its own verbatim duplicate). |
| `f:fx0jbj` | EXCLUDE | Reason: describes the tutorial page's own milestone diagram and section headers, not a code-level fact. |
| `f:yegr67` | RETAIN | New source: `package.json:283` (`"typescript": "^6.0.3"`). Opus read: qualifier rewritten to `[verified: the major-6 pin traces to package.json:283; the svelte-check and TypeScript 7 rationale, the sv create pin, and the 7-clean claim are not traced to code]`, since the Source cites no memory note. |
| `f:q13lck` | RETAIN | New source: `templates/waymark/wrangler.jsonc:6-9` (`main`/`assets` exactly as claimed). |
| `f:9mx680` | RETAIN | New source: `src/lib/dev-flag.ts:1-30` (runtime tripwire), `templates/waymark/package.json` (`@glw907/cairn-cms-dev` under `devDependencies` only, confirming the devDependency boundary). |
| `f:vvgpr5` | RETAIN, claim corrected | `App.Locals` carries **five** fields, not four (`src/lib/ambient.ts:41-49`: `cairnEditor`, `cairnBackend`, `cairnAuditSink`, `cairnAccess`, `cairnIdentity`). Claim text corrected in place; the page itself was not touched. |
| `f:pdgkex` | RETAIN | New source: `src/lib/delivery/site-indexes.ts:54-58` (the exact throw). |
| `f:f2vudv` | RETAIN | New source: `src/lib/sveltekit/auth-routes.ts:44,201-203` (`bootstrapOwner`, `insertOwnerIfEmpty`, `editor.bootstrapped`). |
| `f:d2jumm` | RETAIN | New source: `src/lib/sveltekit/csrf.ts:1`, `src/lib/diagnostics/conditions.ts:103-111`, `src/lib/sveltekit/guard.ts:204`. |
| `f:7bch04` | EXCLUDE | Reason: describes the tutorial page's own "3 files change" milestone summary, not a code-level invariant. |
| `f:3l7f56` | RETAIN | New source: `src/lib/content/types.ts:255,391` (`render: SiteRender`, one required field), `src/lib/components/EditPage.svelte:88-89,114` (preview uses the same `render` prop), `src/lib/delivery/public-routes.ts:184`. |
| `f:dmn2uu` | RETAIN | New source: `src/lib/render/pipeline.ts:86-105` (`createRenderer`, default empty registry). |
| `f:46edxb` | RETAIN | New source: `src/lib/content/ids.ts:1-3,18-20,44-58` (already used for `f:z68na4`/`f:grhib4`). |
| `f:zce3pt` | RETAIN | New source: `src/lib/content/ids.ts:44-58`, `src/lib/content/manifest.ts:141`, `src/lib/content/concepts.ts` (`validateUrlPolicy`, already `f:2i6u6o`). |
| `f:s2zbzm` | RETAIN | New source: `src/lib/content/concepts.ts:15-19` (`ROUTING_SHORTHANDS`). |
| `f:hdrzxd` | RETAIN | New source: `src/lib/sveltekit/content-routes-entry-write.ts:128,181` (`concept.validate` before commit). |
| `f:dccnyu` | RETAIN | New source: `src/lib/content/fieldset.ts:458-471` (the exact try/catch and log line). |
| `f:t5ebsr` | RETAIN, claim corrected | Same publish-not-save correction as `f:e69d0l`: `content-routes-entry-write.ts:341-352`. |
| `f:b6gquz` | RETAIN | New source: the three-tier summary is a composite of already-verified facts in this same file (`f:pzbmhq`, `f:wnvqlz`, `f:2hnxsr`, `f:lu67dk`); cited directly. |
| `f:4t707i` | RETAIN | New source: `src/lib/media/manifest.ts:1-5,16-18` (module comment states this almost verbatim). |
| `f:99x86q` | EXCLUDE | Reason: describes how the three doc-arm pages divide their own subject matter, not an engine code fact. |
| `f:gy2h7p` | RETAIN | New source: a composite of the already-verified individual log-event facts on this page (fieldset.ts, public-routes.ts, admin-action.ts, section-action.ts, log/events.ts). |
| `f:qdfs37` | RETAIN | New source: `src/lib/content/fieldset.ts:458-471` (the `log.warn` call, `field`/`owner`/`error`). |
| `f:r3l7eq` | RETAIN | New source: `src/lib/sveltekit/admin-action.ts:255-280` (`audit.sink.call_failed`), `src/lib/sveltekit/audit-sink.ts:66` (fail-open, catches its own failures first). |
| `f:r03vis` | RETAIN, claim corrected | Two engine conveniences do key on the literal ids `posts`/`pages` (`src/lib/content/concepts.ts:65-68`'s default-permalink special case, `src/lib/content/getting-started.ts:25-28`'s onboarding checklist), though a site can still rename or replace either concept freely. Claim text now names this nuance instead of an unqualified "not reserved." |
| `f:4mz4tp` | RETAIN | New source: same as `f:pdgkex`. |
| `f:6e06p2` | RETAIN | New source: same as `f:s2zbzm`. |
| `f:y3s3t9` | RETAIN | New source: `src/lib/content/concepts.ts:28,170-173` (`FRAGMENTS_CONCEPT_ID`). |
| `f:hkh101` | RETAIN | New source: `src/lib/content/types.ts:226-274` (required vs. optional `CairnAdapter` fields, exact match). |
| `f:twcsgm` | RETAIN | New source: `src/lib/github/backend.ts:87,104`, `src/lib/env.ts:31`, `src/lib/github/credentials.ts:18`. |
| `f:rxj43c` | RETAIN | New source: `templates/waymark/src/chassis/` (directory exists). Qualified `[verified: structurally ...]`. Opus read: qualifier rewritten to say the hand-built half rests on the page's own milestone scope, not code. |
| `f:vcthwj` | RETAIN | New source: `package.json:205,211-213` (`peerDependencies`/`peerDependenciesMeta`, `optional: true`). |
| `f:my9dgx` | EXCLUDE (retag only) | Already an honest self-described candidate; retagged to the container's standard `[candidate: excluded, ...]` form, same reasoning, cross-referenced to the friction log per this file's own Provenance note. |
| `f:zgdkq7` | EXCLUDE (changed by the Opus read from RETAIN) | The retain cited `CHANGELOG.md:5220`, which proves only that a `## 0.84.4` heading exists. The claim's substance, that `0.84.4` is the oldest range among the sites that currently depend on cairn, is an operational record dated to the `0.94.0` entry (`CHANGELOG.md:3449-3450`), and where `migration-notes.md` starts is the page's own editorial choice. Neither is code. |
| `f:2hmbla` | RETAIN | New source: `src/lib/vite/assemble.ts:4-17` (`USAGE`, `--help`-only argv parsing, exit 2 on anything else). |
| `f:rb5o81` | RETAIN | New source: `src/lib/sveltekit/content-routes.ts:174`, `src/lib/sveltekit/cairn-admin.ts:418` (both single-parameter signatures). |
| `f:tzr2v7` | RETAIN | New source: all six new type names found (`guard.ts:34`, `pipeline.ts:41`, `fieldset.ts:39`, `packages/cairn-cms-dev/src/handle.ts:26`, `nav-routes.ts:25`, `content-routes-settings.ts:86`); none of the six old names exist anywhere in the tree. |
| `f:9otso4` | RETAIN | New source: `src/lib/admin-toolkit/index.ts:30,43` (`AdminTable`/`PageHeader` present, `OfficeList` absent). |
| `f:sjo4cx` | RETAIN | New source: `package.json:6-7,204-208` (engines/peerDependencies, exact match). |
| `f:aj9516` | RETAIN, vendor clause split (Opus read) | New source: `packages/create-cairn-site/src/cloudflare/catalogue.mjs:543-544` ("a cairn site needs that plan from its first deploy"), `src/lib/sveltekit/content-routes-shell.ts:89` (`mediaBase: string`), `DeleteDialog.svelte:21`/`RenameDialog.svelte:21` (`singular: string`), `src/lib/nav/site-config.ts:80-90` (`SiteConfig`, no index signature). The "$5/month" figure left the bullet, which now carries a plain `[verified]`; the price moved to a new `[vendor: link, not a repo fact]` bullet, `f:wxe8fc`, sourced to `packages/create-cairn-site/src/money.mjs:11-12` (`WORKERS_PRICING_URL`), with the number not restated. |
| `f:5zun6z` | RETAIN | New source: `CHANGELOG.md:3443` (`## 0.94.0` section exists as the sole record). |
| `f:cjp7gj` | RETAIN | New source: `src/lib/admin-toolkit/FieldLabel.svelte:48` (`register = 'stacked'` default), `src/lib/audit/rules/rendered/one-filled-action.ts:1-20` (the geometry rule). |
| `f:0d5w2g` | RETAIN | New source: `src/lib/audit/rules/static/stock-default-hazards.ts:15,115` (near-verbatim match). |
| `f:bjpv4j` | RETAIN | New source: `content-routes-shell.ts:57` (`nav: ResolvedNavLayout`), `content-routes-context.ts:224-227` (`navFilter` over `ResolvedLayoutNode[]`); no trace of the old names anywhere. |
| `f:ys1iq1` | RETAIN | New source: `src/lib/content/types.ts:300,418` (`navLayout?`), `src/lib/sveltekit/admin-nav.ts:574-578` (the zero-config fallback synthesis). |
| `f:bvfs3e` | RETAIN | New source: same as the already-verified `f:yf1rrr` plus `guard.ts:448-477` (the real enforcement mechanism). |
| `f:zyjzeg` | RETAIN | New source: `src/lib/sveltekit/admin-nav.ts:59,69,465-467,533` (`ownerOnlyVisible`, visibility-only). |
| `f:ahbsu6` | EXCLUDE | Reason: describes the extend track's own page-organization scheme (which pages build an adapter), not an engine code fact. |
| `f:zm9tp4` | RETAIN | New source: `src/lib/sveltekit/admin-nav.ts:54` (`NavLayoutEntry`; `AdminNavEntry` nowhere in `src/lib`). |
| `f:3pposq` | RETAIN | New source: `src/lib/auth/roles.ts:12` (`Capability`), `src/lib/content/pending.ts:6-11` (holding branch); the remaining glossary terms name this repo's own types structurally. |
| `f:hr400i` | EXCLUDE | Reason: states which reference pages the admin and extend tracks share, a doc-arm organization fact rather than a code fact. |
| `f:p1xmp5` | RETAIN | New source: `src/lib/auth/roles.ts:12`, `src/lib/auth/access.ts:156-175` (`canReach`, capability checked before the map). |
| `f:0qb73i` | RETAIN | New source: `src/lib/auth/access.ts:160-161` (owner bypass), `src/lib/sveltekit/admin-nav.ts:280` (`ACCESS_FIXED_SCREENS`). |
| `f:zo034s` | RETAIN | New source: `src/lib/sveltekit/guard.ts:461-464` (unmatched route 403s everyone), `src/lib/auth/access.ts:173-174` (unmatched screen stays open); the exact asymmetry the claim describes. |
| `f:smbsa6` | RETAIN | New source: `src/lib/sveltekit/admin-action.ts:120-129` (`authorizeAdminTarget`, three ordered gates). |
| `f:3vndvj` | RETAIN | New source: `src/lib/sveltekit/content-routes-entry-destructive.ts:111-116` (fragment delete guard), `src/lib/content/manifest.ts:473` (`inboundIncludes`). |
| `f:i4fg3o` | RETAIN | New source: same `src/lib/env.ts:31` as `f:vpieos`. |
| `f:9ik061` | RETAIN | New source: `src/lib/sveltekit/csrf.ts:109-127` (`issueCsrfToken`, attributes and the two-moment rotation doc comment, near-verbatim match). |
| `f:2glcaf` | RETAIN | New source: same `guard.ts:285-293` identity branch as `f:fhit7f`; Cloudflare Access's own default/ceiling are external. |
| `f:gncd64` | RETAIN, claim corrected | The **site** sets `csrf: { checkOrigin: false }` in `svelte.config.js` (a build-time config file); `createAuthGuard` does not set this itself, only relies on and compensates for it (`guard.ts:203-210`: "the consumer disabled when THEY set checkOrigin: false"). Claim text corrected in place. |
| `f:vqh4a9` | RETAIN | New source: `src/lib/auth/access.ts:1-4` (module comment states this almost verbatim), `:163-165`. |
| `f:yzbvk4` | RETAIN | New source: `src/lib/sveltekit/admin-response.ts:35-46` (only `frame-ancestors`, no full CSP, already `f:ubuj1w`), `src/lib/render/sanitize-schema.ts` (the real XSS defense, already `f:z3a58a`). |
| `f:kkp5bi` | RETAIN | New source: `src/lib/github/signing.ts:1-5,49,67` (in-Worker per-request signing), `src/lib/env.ts:31`. |
| `f:gvim4v` | RETAIN | New source: `src/lib/sveltekit/preview.ts:385` (shared public composition), `:414-415,442-443` (the exact `prerender = false` throw and bearer-credential rationale). |
| `f:xssf06` | RETAIN | New source: `src/lib/components/PreviewBanner.svelte:25-32,90-97` (verbatim match on the four custom properties and the no-scoped-declaration design). |
| `f:pimnjy` | RETAIN | New source: `src/lib/sveltekit/content-routes-preview.ts:13-27,55-83,111-135` (`no-draft` refusal, idempotent revoke). |
| `f:v5ndhs` | RETAIN | New source: same `guard.ts:285-293` identity branch as `f:fhit7f`; runs in place of magic-link resolution with no partial mode. |
| `f:emrebl` | EXCLUDE | Reason: operational advice about which third-party IdP or login method to trust; cairn's own code has no visibility into or opinion on the IdP a site's gate chooses. |
| `f:k40l86` | RETAIN | New source: `guard.ts:285-293`'s roster lookup (already `f:fhit7f`) for the roster half; the Access-application admission decision is external Cloudflare configuration. |
| `f:qhmydf` | RETAIN | New source: `guard.ts:287-293` (identity branch never reaches `auth-routes.ts`), `auth-routes.ts:44,201-203` (`bootstrapOwner` lives only there). |
| `f:51uyqr` | EXCLUDE | Reason: pure Wrangler/Cloudflare configuration behavior (`workers_dev`/`preview_urls` interaction) with no cairn engine or tool code touchpoint; consistent with the doc's own "no tool checks this yet" admission. |
| `f:iaqcq6` | RETAIN | New source: an absence proof, grepped across every `tool/internal/doctor/*.go` file and `tool/cmd/cairn/doctor.go`: no `probe`, `workers_dev`, `preview_urls`, or login-probe check exists. Opus read: grep re-run; `probe` hits in `check_mount.go`, `check_posture.go`, and `fetchrobots.go` are unrelated. `tool/internal/spine/condition.go:44` declares `admin.login-probe-failed` but no check emits it; the Source now says so, and the qualifier marks "a later 1.x release" as roadmap intent. |
| `f:icjjtd` | EXCLUDE (changed by the Opus read from RETAIN) | The retain cited `docs/reference/sveltekit.md:2015-2018`, a reference-arm page, "gated by `reference-coverage.mjs` against the source-level stability tag." No such tag exists: `src/lib/sveltekit/guard.ts:76-110` declares the three interfaces with no stability marker, and `reference-coverage.mjs:72-73` checks only that a tier marker is present, not which tier. The tier lives only on the page, so the bullet is excluded with that reason. |
| `f:n1om0r` | RETAIN | New source: `src/lib/github/backend.ts:78,88,162`, `src/lib/index.ts:127-128` (the only `BackendProvider`-producing export). |
| `f:zyguyn` | RETAIN | New source: `tool/internal/doctor/check_bindings.go`, `check_siteconfig.go`; no D1/auth-store/GitHub-App check exists among the eleven check files. |
| `f:7rehzh` | RETAIN | New source: `templates/waymark/svelte.config.js:56` (exact match). |
| `f:xluud1` | RETAIN | New source: `templates/waymark/vite.config.ts:4,7-9,28,38` (`cairnManifest` plugin, `__CAIRN_DEV_BUILD__` define). |
| `f:4cet3p` | RETAIN | New source: `src/lib/delivery/public-routes.ts:201,236,256`, `templates/waymark/src/chassis/archive.ts` (file exists), `src/lib/delivery/robots.ts` (already `f:rh0xv5`). |
| `f:yef4lo` | RETAIN | New source: `src/lib/delivery/site-indexes.ts:38-58` (already used for `f:pdgkex`/`f:4mz4tp`). |
| `f:xafwcw` | RETAIN | New source: `src/lib/delivery/robots.ts` (already `f:rh0xv5`). |

No extend bullet was rejected. Five retains carry a claim-text correction the code showed was needed: `f:e69d0l` and `f:t5ebsr` (a publish, not a save, patches the manifest), `f:vvgpr5` (five ambient fields, not four), `f:r03vis` (two conveniences key on `posts`/`pages`), and `f:gncd64` (the site sets `checkOrigin: false`, not the guard).

## front-door.md

| id | verdict | detail |
| --- | --- | --- |
| `f:8289h7` | RETAIN | Claim: behind Cloudflare Access, an editor can instead sign in with the organization's Google or Microsoft account. New source: `src/lib/sveltekit/guard.ts:64-68`, the `identity?: IdentityResolver` config field, "Replace magic-link session resolution with the site's own identity gate (Cloudflare Access or any other reverse proxy that authenticates the request before it reaches this Worker)"; `docs/extend/sign-in-through-your-organization.md`, the Google Workspace/Microsoft Entra ID recipe built on that seam. Retagged `[verified]`. Opus read: tag qualified, since the seam traces to `guard.ts:64-68` but which identity providers an Access application offers (Google, Microsoft) is Cloudflare configuration. |
| `f:dl1trb` | RETAIN | Claim: the live preview renders through the exact function the public site uses. New source: `examples/showcase/src/chassis/public-routes.ts:14`, `render: cairn.rendering.render`; `examples/showcase/src/routes/admin/[...path]/+page.svelte:26`, `render={cairn.rendering.render}`, the identical binding threaded to both the public route (via `createPublicRoutes`) and the admin edit route (`CairnAdmin`). Retagged `[verified]`. |
| `f:i74t7g` | EXCLUDE | Claim: every production cairn site the author runs is hosted on Cloudflare. Original source: `docs/why-cairn.md:40` (owner brief, first-person claim). Reason: this is an operational claim about the author's own currently-deployed infrastructure; no `src/`, `tool/`, `packages/`, `templates/`, `scripts/`, `examples/showcase/`, or config line in this repo can confirm or refute where a site is actually hosted today. Retagged `[candidate: excluded, an operational claim about the author's own live deployed infrastructure, outside anything this repo's code can confirm]`. |
| `f:zpjl8k` | RETAIN, source replaced (Opus read) | The slice's paid-plan support was `docs/admin/before-you-start.md:52`, a docs page. The setup command states it in code: `packages/create-cairn-site/src/cloudflare/catalogue.mjs:543-544`, the declined-plan message "a cairn site needs that plan from its first deploy." The docs citation was dropped. The GitHub and Cloudflare halves keep `oauth.mjs:67` and `account.mjs:47`. Tag `[verified]`. |
| `f:u705t5` | RETAIN | Claim: `create-cairn-site` scaffolds a complete starter called Waymark; a second template, Topo, is planned but not shipped. New source: `packages/create-cairn-site/package.json:4`, `"description": "Create a cairn CMS site: scaffold a branded Waymark starter and run it locally."`; `packages/create-cairn-site/src/prompts.mjs:15`, `const DEFAULTS = { name: 'Waymark', description: '', brandColor: '' };`; `find . -iname "*topo*"` (excluding `node_modules`) matched only spec and record docs under `docs/superpowers/specs/` and `docs/internal/record/`, no package or directory under `packages/` or `examples/`. Retagged `[verified]`. Opus read: tag qualified, since "planned" rests on the specs and ROADMAP.md, not code. |
| `f:4sxnxp` | EXCLUDE | Claim: cairn is pre-1.0 and runs in production on two sites today, ecxc.ski and 907.life. Original source: CLAUDE.md credentials section. Reason: the pre-1.0 half traces cleanly to `package.json:3` (`"version": "0.97.0"`), but "runs in production on ecxc.ski and 907.life today" is an operational deployment claim; nothing in this repo's code confirms a site is currently live there (the closest code fact, `f:9093mg`, only confirms a Cloudflare Access installation id covers both site names, not that either is presently deployed in production). Retagged `[candidate: excluded, the pre-1.0 half traces to package.json:3 but "runs in production on ecxc.ski and 907.life today" is an operational deployment claim this repo's code cannot confirm]`. |
| `f:3utth1` | RETAIN | Claim: the published version, unpublished window, and next action live in `docs/STATUS.md`. New source: `docs/STATUS.md:8`, "Published: **`0.97.0`** on npm `latest`..."; `docs/STATUS.md:19`, "## Immediate next action". Retagged `[verified]`. Opus read: kept; the claim is about `docs/STATUS.md`'s own contents, so STATUS.md is the right source. |
| `f:mf00hq` | RETAIN | Claim: visual e2e baselines are CI-canonical, regenerated by `e2e.yml`'s `update_snapshots` job; this workstation's local Chromium renders a few surfaces a few pixels differently than the CI runner's. New source: `.github/workflows/e2e.yml:11`, the `update_snapshots` `workflow_dispatch` input; `.github/workflows/e2e.yml:130`, `npm --prefix examples/showcase run test:e2e -- e2e/admin-visual.spec.ts e2e/site-visual.spec.ts --update-snapshots`, gated on that input; `docs/internal/durable-gotchas.md:44`, the chassis-B2 example (20 files from commit `4de378ec`). Retagged `[verified]`. Opus read: source widened to `e2e.yml:121-130` ("baselines are CI-canonical and a workstation render is never an acceptable substitute"); tag qualified, since the workstation's pixel difference and the local-green rule are an operational observation recorded only in `durable-gotchas.md`. |

### Skipped: owner-tier bullets (lane A)

Left untouched, per the task boundary (another lane adds key phrases to owner-tier bullets):

- `f:wvediq` (`docs/why-cairn.md` section), sourced solely to the owner brief.
- `f:9xthnq` (`docs/why-cairn.md` section), sourced solely to the owner brief.
- `f:h0xykj` (`docs/why-cairn.md` section), sourced solely to the owner brief.
- `f:zzc2m5` (`docs/why-cairn.md` section), sourced solely to the owner brief.
- `f:99f221` (`docs/why-cairn.md` section), sourced solely to the owner brief.
- `f:kn5rze` (`README.md` section), sourced solely to the owner brief.
- `f:k6aopn` (`README.md` section), sourced to both the owner brief and CLAUDE.md; both cited sources are doc pages, and the owner brief is one of them, so treated as owner-tier and skipped.
- `f:bhyvqg` (owner-brief section), sourced to the owner brief itself.
- `f:y3ljm0` (owner-brief section), sourced to the owner brief itself.
- `f:nguseg` (owner-brief section), sourced to the owner brief itself.
- `f:k27p36` (owner-brief section), sourced to the owner brief itself.
- `f:xh2mwb` (owner-brief section), sourced to the owner brief itself.

## reference.md

| id | verdict | detail |
| --- | --- | --- |
| `f:7l8ysb` | REJECT | Claim (verbatim): "`StatusChip`'s `outline` register hairline is `color-mix(in oklab, currentColor 55%, transparent)`; cairn's five named call sites (ConceptList, EditPage, CairnAdminShell, ReferenceField, MediaCaptureCard, ManageEditors) all clear the 3:1 border-contrast floor, but a consumer placing an `outline` chip inside its own muted-text ancestor should re-measure." Original source: "page text cross-referenced against `chip-ground-collision`/`border-contrast` rule descriptions in cairn-audit.md; not independently re-measured." Proving code: `grep -rn "register=.\{0,3\}outline" src/lib/components/*.svelte src/lib/admin-toolkit/*.svelte` finds exactly one call site, `src/lib/components/EditPage.svelte:1456: <StatusChip label="Hidden" register="outline" />`; `grep -rn "StatusChip" src/lib/components/CairnAdminShell.svelte src/lib/components/ReferenceField.svelte src/lib/components/MediaCaptureCard.svelte` returns nothing (none of the three import or use `StatusChip` at all); `src/lib/components/ConceptList.svelte:428-430` uses `StatusChip` with no `register` prop (the default, not `outline`); `src/lib/components/ManageEditors.svelte:12` states in its own comment that "`StatusChip` does not apply" to it. The claimed six call sites (the bullet says "five" but names six) collapse to exactly one real usage of the `outline` register. Bullet deleted from the container. Upheld by the Opus read. The bullet's true half (the 55% hairline, which the component's own doc comment records as clearing 3:1) is refiled as a new `[verified]` bullet, `f:hdebf7`, sourced to `StatusChip.svelte:22-24,129` and `EditPage.svelte:1456`. |
| `f:mk0zd8` | RETAIN | Claim: `deliver`'s throw path is fully compensating (deletes the pending code row, refunds the send charge). New source: `src/lib/auth-channel/factory.ts:269-272` (doc comment: "A throw is scrubbed, logged, deletes the pending row, and refunds the send charge"), `:880-887` (the `deliverPromise` catch calls `consumeCode(...)` then `refund(session, fullRequesterBucket, REQUESTER_SEND_SCOPE, now)`). Retagged `[verified]`. |
| `f:0hkc8e` | RETAIN | Claim: `CAIRN_DEV_BACKEND` on a deployed runtime throws a 503 before touching any row for all three actions; "deployed" resolves `PUBLIC_ORIGIN` first, request hostname otherwise. New source: `src/lib/auth-channel/factory.ts:118-130` (`assertNoDevBackendLeak`: `throw error(503, CAIRN_DEV_BACKEND_MESSAGE)`, called from `request`/`confirm`/`logout` at `:686,912,1075`), `src/lib/dev-flag.ts:108-114` (`isDeployedHost`: `PUBLIC_ORIGIN`-first, hostname fallback). Retagged `[verified]`. |
| `f:lccuuc` | RETAIN | Claim: the channel's D1 schema ships as `migrations-channel/0000_channel.sql` with four named tables; the identity salt is lazily provisioned via `INSERT OR IGNORE` of 32 random bytes; the channel database must never share a `migrations_dir` with `AUTH_DB`. New source: `migrations-channel/0000_channel.sql:19-46` (the four `CREATE TABLE` statements), `src/lib/auth-channel/store.ts:60-84` (`provisionSalt`: `INSERT OR IGNORE INTO cairn_channel_meta`, `randomHex(32)`), `examples/showcase/wrangler.jsonc:26-53` (each D1 binding declares its own `migrations_dir`, comment states why). Retagged `[verified]`. |
| `f:exqnwj` | RETAIN | Claim: `/auth-crypto` enforces server-only isolation via export conditions, matching `/cloudflare`'s mechanism. New source: `package.json:157-168` (`./auth-crypto` and `./cloudflare` both declare `worker`/`browser`/`default`), `src/lib/auth-crypto/browser.ts:1-4`, `src/lib/cloudflare/browser.ts:1-4` (both a bare module-level `throw new Error(...)` with no named export). Retagged `[verified]`. |
| `f:9378z2` | RETAIN | Claim: the engine's session and CSRF cookies both derive `secure` through one shared function, `csrfSecure`. New source: `src/lib/auth/crypto.ts:22-26` (doc comment naming the shared function), `src/lib/sveltekit/csrf.ts:72,122,164,185` (`csrfSecure`; `csrfCookieName(csrfSecure(...))`), `src/lib/sveltekit/guard.ts:274,353` (`sessionCookieName(csrfSecure(...))`). Retagged `[verified: the shared-function claim is confirmed; the earlier-divergence history is not independently re-traced to a changelog entry]`. |
| `f:0jarfk` | RETAIN | Claim: `form-font-parity` is registered provisionally at advisory tier though its intended tier is error, pending a CI re-check. New source: `src/lib/audit/rules/rendered/form-font-parity.ts:38-46` (comment: "Registered PROVISIONALLY at advisory. The intended tier is error..."), `:119` (`tier: 'advisory'`). Retagged `[verified]`. |
| `f:vhww6d` | RETAIN | Claim: the `norms` subcommand reads only the shipped manifest, no config, no browser, distinct from static/rendered which read the working tree. New source: `src/lib/audit/bin.ts:25-27` (comment), `:28-36` (`norms` calls `loadNormsManifest()`), `:62` (other modes call `loadConfig(process.cwd(), ...)`). Retagged `[verified]`. |
| `f:5a5oq0` | RETAIN | Claim: a manifest row missing `slug`, `hash`, or `ext` is silently dropped rather than failing the run, and the same tolerance applies elsewhere in the manifest reader. New source: `src/lib/media-seed/assemble.ts:80-101` (`normalizeManifest`: a shape-failing row is not pushed), `src/lib/media/manifest.ts:107` ("a failing element is dropped"). Retagged `[verified]`. |
| `f:69xbyh` | RETAIN | Claim: `verifyTurnstile` is fail-closed by contract; `opts.ip` must come from `CF-Connecting-IP`. New source: `src/lib/cloudflare/turnstile.ts:1-3` (module comment), `:17-21` (`ip` doc comment). Retagged `[verified]`. |
| `f:bpk8gc` | RETAIN | Claim: a `success: false` siteverify response logs nothing when every error code is one of two routine causes; every other reason does log. New source: `src/lib/cloudflare/turnstile.ts:15` (`ROUTINE_ERROR_CODES`), `:146-156` (`isRoutine` gates the `log.warn` call). Retagged `[verified]`. |
| `f:qmz20x` | RETAIN | Claim: 13 retired `register*` props collapsed into one `registerEditor` callback delivering `EditorApi` on mount and `null` on destroy. New source: `src/lib/components/MarkdownEditor.svelte:29,85-91` (`EditorApi` type, `registerEditor` doc), `:946-949` (mount call), `:980` (destroy call); a grep for all seven named retired props finds none of them in the file. Retagged `[verified]`. |
| `f:9ntlzw` | RETAIN | Claim: `EditPage`'s preview-device choice persists under the localStorage key `cairn-editor-preview-device`. New source: `src/lib/components/EditPage.svelte:381,384-389` (`deviceStorageKey`, `localStorage.getItem`/`.setItem`). Retagged `[verified]`. |
| `f:6q5q05` | RETAIN | Claim: `PreviewBanner` renders expiry as a fixed `YYYY-MM-DD HH:MM UTC` string by default, for SSR/hydration parity. New source: `src/lib/components/PreviewBanner.svelte:42-46` (`defaultFormatExpiry`), `:52-58` (hydration-mismatch rationale), `:68` (`<time datetime={preview.expiresAt}>`). Retagged `[verified]`. |
| `f:qi5zbj` | RETAIN | Claim: `CommitConflictError`/`BranchExistsError` are thrown identically by both the GitHub App backend and the packaged dev backend's `createBranch`. New source: `src/lib/github/backend.ts:141-147`, `src/lib/github/branches.ts:53`, `packages/cairn-cms-dev/src/fake-github.ts:805-811` (the dev backend imports and throws the same classes from `@glw907/cairn-cms`). Retagged `[verified]`. |
| `f:dbaklx` | RETAIN | Claim: `defineRoles` throws on an empty record, empty role name, malformed declaration, non-`/admin` home, missing `owner` key, or `owner` mapped to non-owner capability. New source: `src/lib/auth/roles.ts:34-49` (`validateDeclaration`), `:58-74` (`defineRoles`), `:108` (`resolveOwnerLevelRoles`), `src/lib/sveltekit/auth-routes.ts:44,201-202` (`bootstrapOwner`). Retagged `[verified]`. |
| `f:upec9v` | RETAIN | Claim: `ContentIndex.all()` returns entries already sorted; dated concepts newest-first with undated entries last, undated concepts sort by title. New source: `src/lib/delivery/content-index.ts:139-141` (sort comment and implementation), `:152` (`all` reads from `sorted`). Retagged `[verified]`. |
| `f:umdf7r` | RETAIN | Claim: `composeEntryData` is the shared composition both `entryLoad` and `loadPreview` run; `entryLoad` passes no `overrides`. New source: `src/lib/delivery/public-routes.ts:139,213-217`, `src/lib/sveltekit/preview.ts:505,523`. Retagged `[verified]`. |
| `f:83gbov` | RETAIN | Claim: `EntryData.heroImage` is undefined when no hero, media off, or an unresolved `media:` reference; the raw token stays untouched. New source: `src/lib/delivery/public-routes.ts:73-76,93-112` (`deriveHeroImage`). Retagged `[verified]`. |
| `f:dvg5gn` | RETAIN | Claim: `CairnHead`'s `titleTemplate` applies only when `title` is undefined; `markdownUrl` adds the alternate link when passed, omits it otherwise. New source: `src/lib/delivery/CairnHead.svelte:5-8,35,53-54`. Retagged `[verified]`. |
| `f:cxwijh` | RETAIN | Claim: seventeen names once re-exported from `/delivery/data` now resolve from their own declaring barrel. New source: `src/lib/delivery/data.ts:8-18` (comment states the cut); a grep of the file for all seventeen names finds none of them. Retagged `[verified]`. |
| `f:950l0z` | RETAIN | Claim: `createSiteIndexes` reserves the field name `site` for the cross-concept resolver. New source: `src/lib/delivery/site-indexes.ts:23,49-51` (throws when `descriptor.id === 'site'`). Retagged `[verified]`. |
| `f:rkj7tn` | RETAIN | Claim: every log record carries a `level`/`event`/`timestamp` envelope; renaming an event name is a breaking change. New source: `src/lib/log/create.ts:10-12` (`LogRecord` type), `src/lib/log/events.ts:1-3` (comment: "renaming one is a breaking change"). Retagged `[verified]`. |
| `f:u1y47n` | RETAIN | Claim: three stability tiers exist (Extension API, Scaffold API, both frozen; Unstable API, no cross-minor promise). New source: `scripts/checks/reference-coverage.mjs:68-91` (comment names the same three-tier taxonomy; the check enforces the Stability cell reads one of exactly these three values). Retagged `[verified]`. |
| `f:469b7m` | EXCLUDE | Claim: reference pages are the extend/admin tracks' shared surface; `log-events` and `supported-toolchain` additionally serve a site admin reader; `doctor.md` left this list and its replacement page is not in it either. Reason: this is `docs/reference/README.md`'s own editorial grouping of its pages (confirmed current at `docs/reference/README.md:86-93`, but that is the same page the bullet was already sourced to). No code (`scripts/checks/reference-coverage.mjs` searched for "site admin"/"Also for") generates or enforces which pages count as "also for site admins," so there is no code line to trace the claim to. Retagged `[candidate: excluded, this is docs/reference/README.md's own editorial grouping of its pages; no check or code enforces which pages count as "also for site admins", so there is no code line to trace it to]`. |
| `f:yvusht` | EXCLUDE | Claim: eleven pages document no export subpath, named exactly. Reason: this is `docs/reference/README.md`'s own editorial list (confirmed current at `docs/reference/README.md:95-104`, the same page already cited). No check (`scripts/checks/reference-coverage.mjs` searched) generates or enforces this specific eleven-page list from the export surface, so there is no code line to trace it to. Retagged `[candidate: excluded, this is docs/reference/README.md's own editorial list of which pages document no subpath; no check generates or enforces this specific list, so there is no code line to trace it to]`. |
| `f:rgvm81` | RETAIN | Claim: the page's "seven reasons" for `preview.refused` is arithmetically correct (6-member union plus one out-of-union log call). New source: `src/lib/sveltekit/preview.ts:261-262,456`. Retagged `[verified]`. |
| `f:j2xst9` | RETAIN | Claim: `createAdminAction`'s `access` option is opt-in because a zero-config site's guard attaches an empty access map admitting no target. New source: `src/lib/sveltekit/admin-action.ts:74-82`, `src/lib/sveltekit/guard.ts:348,368` (`event.locals.cairnAccess = access ?? {}`). Retagged `[verified]`. |
| `f:yfg97w` | RETAIN | Claim: `createD1AuditSink` requires `waitUntil` and takes `undefined` explicitly rather than optional, so a caller can't silently drop the insert. New source: `src/lib/sveltekit/audit-sink.ts:82-90,92-94`. Retagged `[verified]`. |
| `f:uvhweb` | RETAIN | Claim: `historyLoad` bounds history to 25 publishes; `revertAction` re-validates `ref` by full-sha membership against a fresh `listCommits` read. New source: `src/lib/sveltekit/content-routes-shared.ts:156` (`HISTORY_LIMIT = 25`), `src/lib/sveltekit/content-routes-entry-read.ts:511-534`, `src/lib/sveltekit/content-routes-entry-revert.ts:81-106`. Retagged `[verified: the 25-row bound and the revert re-validation are confirmed in source; the commits-API rename-restart behavior is GitHub's own API mechanic, not re-verified against GitHub's own docs this pass]`. |
| `f:u61eav` | RETAIN | Claim: `mintPreview`/`revokePreview` run the same authorization sequence first (editor, concept, access, id-shape), mint alone adding the pending-draft check. New source: `src/lib/sveltekit/preview.ts:128-151,184-210`. Retagged `[verified]`. |
| `f:n0xz8f` | RETAIN | Claim: `mintPreview`'s `config.ttlMs` defaults to seven days, must be finite/positive/one-minute-to-thirty-days. New source: `src/lib/sveltekit/preview.ts:61,75-85`. Retagged `[verified]`. |
| `f:esg0zx` | RETAIN | Claim: `renameAction`, `deleteAction`/`listDeleteAction`, and `discardAction` each clear a never-published entry's preview rows; publish deliberately does not. New source: `src/lib/sveltekit/content-routes-entry-destructive.ts:167,205,407`, `src/lib/sveltekit/content-routes-entry-write.ts:406-410,537-543`. Retagged `[verified]`. |
| `f:3qexq3` | RETAIN | Claim: `settingsLoad` actively probes the Anthropic key with a zero-token call, reporting `keyStatus` distinct from `keyConfigured`, cached for ten minutes. New source: `src/lib/sveltekit/content-routes-settings.ts:52-64,234-256`, `src/lib/sveltekit/tidy-key-health.ts:5,19` (`TTL_MS = 10 * 60 * 1000`). Retagged `[verified]`. |
| `f:n8qe9y` | RETAIN | Claim: `tidyAction` refuses before any model call if disabled/key missing; 401/403 is non-retryable `fail(503)` marking the key unhealthy; other errors are retryable `fail(502)`. New source: `src/lib/sveltekit/content-routes-tidy.ts:111,130,135,200-209,223-231,249`. Retagged `[verified]`. |
| `f:sd18xx` | RETAIN | Claim: `NavLayoutSection.collapsed`'s default is only the starting state absent a persisted cookie; the cookie wins entirely once toggled. New source: `src/lib/components/CairnAdminShell.svelte:192-218`. Retagged `[verified]`. |
| `f:bc27j9` | RETAIN | Claim: a colliding `NavLayoutEntry.href` and an out-of-allowlist icon each throw at startup/composition. New source: `src/lib/sveltekit/admin-nav.ts:73-90` (`validateEntry`). Retagged `[verified]`. |

### Skipped: already sourced to code

These 8 `[candidate]` bullets already cite a real `src/`/`tool/` path with line numbers; their
qualifier ("found during the 2026-09-22 redraft's Go read, not independently re-verified by a
second pass," or similar) flags an unconfirmed second pass, not an unsourced claim, so they fall
outside this task's "sourced only to a page" boundary and were left untouched:

- `f:1mgfhj`, Source: `src/lib/sveltekit/cairn-admin.ts` (a code file, no page).
- `f:xejl4n`, Source: `tool/internal/doctor/siteconfig.go:40-46`, `check_siteconfig.go:23-38`.
- `f:a71nbo`, Source: `tool/internal/doctor/check_floors.go:358-401`.
- `f:v2isa4`, Source: `tool/internal/doctor/check_csrf.go:71-84`.
- `f:b94uhy`, Source: `tool/internal/doctor/check_posture.go:292-305`, `fetchrobots.go:35-62`.
- `f:gilykt`, Source: `tool/internal/doctor/json.go:41-54,99-126`.
- `f:zlqdbn`, Source: `tool/cmd/cairn/messages.go:557,562,570-573`.
- `f:p8ie34`, Source: `tool/cmd/cairn/usage_test.go:507-527`.

## `[docs-drift]` bullets, for resolution before any page cites them

- admin.md `f:4x6s6a`: email onboarding writes a DMARC `_dmarc` record set to reject (`packages/create-cairn-site/src/cloudflare/chapter2.mjs:801`). The page's "persists even if Email Sending is turned off again later" has no code path behind it.
- extend.md `f:guiavc`: a scaffolded site carries `.github/workflows/check.yml` and `cairn-audit.config.json`, which the page's file-tree diagram omits.
- reference.md `f:zrgny4`: the retired doctor page said the robots probe "is bounded at 15 seconds". `tool/internal/doctor/fetchrobots.go`'s request has no timeout of its own and rides the command's `--timeout` context (default 480 seconds).
- editors.md and front-door.md carry none.

## Flagged, outside candidate scope (not fixed)

- **front-door.md `f:ab9kzr`** is a `[verified]` bullet that says the current published version is `0.96.0`, sourced to `package.json:3`. That line reads `"version": "0.97.0"`, and `docs/STATUS.md:8` records `0.97.0` as published. The bullet is stale against its own cited line.
- **extend.md `f:75hawi`** (`[external: Cloudflare]`, line 104) says everything through Milestone 4 of `build-a-site-by-hand.md` runs on Cloudflare's free tier. `CHANGELOG.md:2974-2975` (`0.95.0`) records that a default site's Worker exceeds the 3 MiB Workers Free script limit. The setup command also tells every site it needs Workers Paid from its first deploy (`catalogue.mjs:543-544`, now cited by `f:aj9516` and `f:zpjl8k`). A hand-built site's bundle may still stay under 3 MiB, but nobody has measured it, so treat the free-tier claim as probable docs drift until someone does.
- **`docs/why-cairn.md:41`** says the free tier "actually stays free for a small site's real traffic." The same page's line 84 says setup needs "a paid Cloudflare plan from the first deploy" (the front-door slice's note). No container bullet harvests line 41.

## Opus read

1. **Both rejects are upheld.**
   - `f:n68dn6`: `admin.action.failed` is logged only at `src/lib/sveltekit/cairn-admin.ts:251`, inside `viewAction`. At `:232`, `viewAction` 404s any path whose parsed view is outside its allowed list, and every wrapper passes a list drawn from the engine's built-in views (`:260` `authedViews`). A custom admin screen is the developer's own route, so this chokepoint never catches its errors. `createAdminAction` and `createSectionAction` log other events, never this one.
   - `f:7l8ysb`: a grep of `src/lib` finds one `register="outline"` call site, `EditPage.svelte:1456`. `CairnAdminShell`, `ReferenceField`, and `MediaCaptureCard` do not use `StatusChip` at all. `ConceptList.svelte:428-430` uses the default register. `ManageEditors.svelte:12` says `StatusChip` does not apply. The "five" (six named) call sites are false. Deleting the bullet would lose the true hairline half, so the read refiled it as `f:hdebf7` from `StatusChip.svelte:22-24,129`.
2. **Retains citing a doc, STATUS, a record, or CHANGELOG.**
   - Kept `f:3utth1`, because the claim is about STATUS.md's own contents.
   - Kept `f:5zun6z` under its qualifier, because the claim is about CHANGELOG.md's own `0.94.0` section.
   - Kept `f:2hmbla`, because CHANGELOG only corroborates code (`src/lib/vite/assemble.ts:4-17`).
   - `f:zpjl8k`: the docs page was its only paid-plan support, but the claim is in code (`catalogue.mjs:543-544`), so the read re-sourced it.
   - `f:mf00hq`: re-sourced to `e2e.yml:121-130`, with the durable-gotchas half qualified.
   - `f:8289h7`: keeps its docs citation beside code, as the README allows, with the IdP half qualified.
   - Excluded `f:icjjtd` (reference page only; the "source-level stability tag" does not exist) and `f:zgdkq7` (operational CHANGELOG record, dated).
   - The admin, editors, and reference retains all cite code only.
3. **All five extend corrections are confirmed.**
   - `f:e69d0l` and `f:t5ebsr`: `content-routes-entry-write.ts:234-235` ("The save commits no manifest change; publish lands the upsert on main") and `:341-352`.
   - `f:vvgpr5`: `src/lib/ambient.ts:45-49` declares five `Locals` fields.
   - `f:r03vis`: `concepts.ts:66-67` (`id === 'pages'`) and `getting-started.ts:25-28`.
   - `f:gncd64`: `guard.ts:203-210` names the consumer as the one who sets `checkOrigin: false`, and `templates/waymark/svelte.config.js:56` sets it.
4. **Composite and qualified retains: 11 checked.**
   - Upheld as written: `f:4esdoz`, `f:b6gquz`, `f:gy2h7p` (anchors land: `fieldset.ts:466`, `public-routes.ts:47`, `admin-action.ts:321-322`), `f:3pposq`, `f:k40l86`, `f:5zun6z`, and reference `f:9378z2` and `f:uvhweb`.
   - Rewritten because the tag overstated: `f:yegr67` (it cited a "memory note" absent from its Source), `f:rxj43c`, and `f:iaqcq6`.
5. **Vendor clause split.** The tag vocabulary says a vendor figure is never restated. `f:aj9516` keeps the code-backed "Workers Paid from its first deploy" (`catalogue.mjs:543-544`) under a plain `[verified]`. The price moved to the new `f:wxe8fc`, `[vendor: link, not a repo fact]`, which cites the pricing URL at `money.mjs:11-12`.
6. **About 55 other retain anchors were spot-checked across all five files.** Each named file:line was read for its key token. Every anchor landed on its cited line or range, and each claim matched. The checked retains:
   - admin: all 9.
   - reference: `f:mk0zd8`, `f:0hkc8e`, `f:lccuuc`, `f:exqnwj`, `f:0jarfk`, `f:vhww6d`, `f:69xbyh`, `f:bpk8gc`, `f:9ntlzw`, `f:6q5q05`, `f:upec9v`, `f:950l0z`, `f:rkj7tn`, `f:n0xz8f`, `f:rgvm81`, `f:3qexq3`, `f:uvhweb`, `f:bc27j9`.
   - front-door: `f:dl1trb`, `f:u705t5`.
   - extend: `f:q13lck`, `f:s2zbzm`, `f:y3s3t9`, `f:vpieos`, `f:0qb73i`, `f:sjo4cx`, `f:9otso4`, `f:9ik061`, `f:xssf06`, `f:gvim4v`, `f:7rehzh`, `f:aj9516`.

   No mismatch was found. `node scripts/checks/check-facts.mjs` reports OK.
