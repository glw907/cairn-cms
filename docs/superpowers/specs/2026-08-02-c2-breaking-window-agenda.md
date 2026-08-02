# The C2 breaking-window agenda

**Status: ADJUDICATED 2026-08-02.** The C2 sitting ran on Fable and ruled on every in-window item
and every confirmed finding; the rulings and the execution plan live in
`docs/superpowers/plans/2026-08-02-c2-breaking-window.md`, which supersedes this document. This
spec stays as the historical input: the agenda as widened (Geoff signaled the widening
2026-08-02) plus the audit-sweep evidence the sitting adjudicated. Release one is the final
release a consumer absorbs breakage as one batch; at beta, compatibility-SemVer makes every
deferred item here a major version or a permanent resident.

**Sequencing:** the refusal-channel convergence pass landed first (it changed what `AdminActionError`
means, and the sitting should not name a symbol mid-change; merged as PR #18). The read-only
adversarial audit sweep ran 2026-08-02; its confirmed findings are appended under "Audit-sweep
evidence" at the end of this document, so the sitting adjudicates evidence rather than a session's
recollection. Next the sitting runs, on Fable, over `docs/internal/api-surface.md` (corrected by C1;
it records nullability for the first time) plus this agenda, the evidence section included.
Execution stays one pass, one diff, one `Consumers must:` list.

## In the window (adjudicate every item; silence is not a decision)

1. **The rename set.** The sitting's original charter: one deliberate read of every exported name,
   option key, subpath, and log event as a whole. The known asymmetries: the `create*` factory
   family beside the bare `adminAction` wrapper; anything the read surfaces.
2. **The `locals` namespace policy.** Four engine keys in the shared namespace (`editor`, `backend`,
   `auditSink`, `cairnAccess`), three unprefixed. Plausible shape already filed: engine keys take a
   `cairn` prefix, old names as deprecated aliases through the beta window, one `Consumers must:`
   line.
3. **Subpath taxonomy.** `./sveltekit` accretes toward a grab-bag while `./auth-store` and
   `./auth-crypto` stay precise. Membership is architecture, not naming, and this window is the only
   cheap time to move anything. The `./cloudflare` charter-line precedent (a stated membership rule
   in the barrel header and the reference page opening) is the form each subpath should get.
4. **The event-shape trio.** `RequestContext` pins `AuthEnv`, `ContentEvent` pins `BackendEnv`,
   `AdminEvent` pins both, and `AdminEvent` leaks shape-only into the public `.d.ts` (never exported
   by name). Three names for "the event your admin route receives," distinguished by nothing a
   consumer chooses. Decide: one generic event shape, or three ratified pins, and either way whether
   `AdminEvent` becomes a named export or disappears.
5. **The env story, whole.** The C1 carry-in plus the sharper framing: before deciding whether the
   route factories become generic over `Env` (not free; a site would write
   `createCairnAdmin<SiteEnv>(runtime)` explicitly), evaluate making cairn's binding types
   structurally accept the platform's own (`AuthEnv['EMAIL'].send` returns `Promise<void>` where
   `@cloudflare/workers-types`' `SendEmail.send` returns `Promise<EmailSendResult>`). Structural
   compatibility may dissolve the `CairnPlatformBindings` intersection requirement and the
   section-action bridge casts with no generics at all. The evidence anchor is the
   `@ts-expect-error` tripwire in `src/tests/unit/env-genericity.test.ts` (`BareWranglerSiteEnv`):
   if the fix works, that tripwire fails on TS2578 and gets removed, which is the proof.
6. **The log-event vocabulary.** Event names are the public-observable contract. Two known
   collisions: `admin.audit.sink_failed` (the packaged D1 sink's internal persist failure) beside
   `admin.action.audit_sink_failed` (a site's sink throwing at the engine's call site); and
   `guard.rejected` with `reason: 'csrf'` (the guard's pre-routing refusal) beside
   `admin.action.csrf_rejected` (the wrapper's defense-in-depth branch, added by the convergence
   pass). Renames are free only until the next publish. Read the whole vocabulary, not just the
   pairs.
7. **The deprecated-alias sweep.** Known: the platform wrapper's `context` alias for `ctx`
   (`src/lib/sveltekit/types.ts`). Sweep for others. Aliases retire while retirement costs one
   changelog line.
8. **`AdminActionError`'s residual identity.** After convergence it means exactly one thing: the
   dev-only unaudited-action defect signal. Decide whether the name still describes that (a candidate
   honest name exists in the obvious form) or whether it keeps its name for continuity. The declined
   `isAdminActionError` export stays declined unless the sitting overrules with a reason.
9. **`SectionActionConfig.resolveDb`'s shape.** C1's regen surfaced
   `(env: Env | undefined) => Db | undefined` on both `resolveDb` and `rateLimit.resolve`. The
   semantics are ratified (fail-closed / degrade-to-open); the question is whether the
   `Env | undefined` parameter shape is right or the callback should handle absence internally.
10. **The built-in actions' refusal pattern.** The engine's own mutating actions refuse by
    `redirect(303, '...?error=')` where kit's designed affordance is `fail()` plus the `form` prop.
    Either converge to `fail()` inside this window (behavioral, breaking-adjacent, consumer-visible
    UX) or ratify redirect-PRG as the house pattern with a recorded ruling. Silence freezes it by
    accident, which is what the function-color audit existed to prevent.
11. **Reserved vocabulary for the F features.** History, revert, and preview arrive next and ship in
    release one. Sketch their expected exported names (the entry-history read surface, the revert
    action, the preview token/URL surface) before settling conventions, so the conventions cover
    them and the features do not arrive under rules made without them.

## Deliberately out (not breaking; do not let them ride in)

- **The doctor migration probe** (teach `cairn-doctor` to compare the live schema against the
  installed engine's expected migrations and name the missing file). Additive; file for C/P and land
  before beta, but it does not belong in the breaking diff.
- **The kit#12987 mitigation** (streamed pending count flattens admin error statuses to 200).
  Internal behavior, needs a decision DATE before beta (stop streaming the count, or accept and
  document in operations docs), but not this window's diff.
- **The four-CI-gates consolidation** and other mechanical hardening (phase P).
- **The media-library split (P5), conditionally.** It stays out only if genuinely additive. Run the
  placement check before the window shapes: if the split moves exports, it is breaking and must pull
  forward into this window.

## Standing constraints the sitting inherits

- `Env extends AuthEnv` does not compile (TS2559, weak-type detection against the all-optional
  `AuthEnv`); any generic uses unconstrained `Env` with a default.
- The section-action bridge casts (`section-action.ts`) are load-bearing until item 5 resolves them.
- `check:reference:signatures` reads only fenced `ts` blocks; a signature stated only in a reference
  table is ungated (C1 carry-in). Whatever the sitting renames, the execution pass keeps the fenced
  blocks as the gated form.
- The changelog convention: every breaking change carries its `Consumers must:` line, and the whole
  window lands as one list.

## Audit-sweep evidence (2026-08-02)

A read-only adversarial audit sweep ran as a background workflow over the settled surface, covering
the `docs/internal/api-surface.md` snapshot, `src/lib`, the `package.json` exports map, and the
published docs arms. Five parallel lenses (SvelteKit idiom, API consistency, dead or accidental
surface, doc-versus-code drift, cruft) produced 46 raw findings, deduplicated to 42. Every one of the
42 then went to an independent verifier instructed to refute it against the actual files; 31 survived
and 11 were refuted. What follows is a record for the sitting to adjudicate, not an adjudication.
Where a verifier corrected a count or a claim, the corrected version is what is recorded here, and
where a verifier logged a reservation that limits a finding, the limit is carried with it. Items 5
and 11 drew no confirmed findings; the other nine in-window items each have evidence below.

### Item 1: the rename set

- **Three public mutation members drop the `*Action` suffix while 21 siblings keep it.** (API
  consistency; `src/lib/sveltekit/content-routes.ts:103`) `createContentRoutes` returns
  `settingsSave` (`content-routes.ts:103`) and `vocabularySave` (`:105`) beside 21 `*Action` members
  running from `createAction` (`:106`) to `tidyAction` (`:127`), and `createNavRoutes` returns
  `navSave` (`nav-routes.ts:145`, `api-surface.md:339`). All are SvelteKit form actions of identical
  kind, dispatched side by side through the admin facade (`cairn-admin.ts:313`, `:318`, `:321`), and
  no signature distinguishes them, since `settingsSave`/`vocabularySave`/`navSave` return
  `Promise<never>` and so do the suffixed `createAction`, `publishAllAction`, and `discardAction`.
  The read half is not uniform either, contrary to the finding as first filed: `shellPayload` (`:97`)
  and `indexRedirect` (`:99`) carry no `*Load` suffix, and `indexRedirect` returns
  `{ view: 'welcome'; page: WelcomeData }` rather than redirecting. The rename touches three exported
  member names across two factories plus the `check:surface` snapshot, and the facade's own
  `saveSettings`/`saveVocabulary` already use the opposite verb order. A site mounting the
  per-surface factories directly, the documented advanced seam at `docs/reference/sveltekit.md:8`,
  has to look up each member rather than derive it, and item 1 names the `create*`/`adminAction`
  asymmetry without naming this one.

- **Factory parameter bags split between `*Deps` and `*Config` on no principle, and the suffix does
  not track requiredness.** (API consistency; `src/lib/delivery/public-routes.ts:20`)
  `PublicRoutesDeps` (`public-routes.ts:20`) has five required members (`site`, `render`, `origin`,
  `siteName`, `description`), and `SeedDeps` (`src/lib/media-seed/run.ts:16`) is four all-required
  function seams, while `ContentRoutesDeps` (`content-routes-context.ts:99`), `CairnAdminDeps`
  (`cairn-admin.ts:58`), and `AdminActionDeps` (`admin-action.ts:80`) are all-optional injection bags
  under the same suffix. The alternative reading, that `Deps` means injected collaborators and
  `Config` means declarative settings, fails too, because `SectionActionConfig` (`section-action.ts:35`)
  contains only function seams (`resolveDb`, `rateLimit.resolve`) yet is named `Config`.
  `AuthRoutesConfig` (`auth-routes.ts:29`) carries the same `branding`/`send`/`bootstrapOwner` trio
  that `CairnAdminDeps.auth` re-declares (`cairn-admin.ts:59-71`), one as a `Config` and one nested
  inside a `Deps`. All seven types are public exports, the repo's idiom charter
  `docs/internal/code-idioms.md` covers parameter-bag suffixes in none of its naming, factory, or
  deliberately-not-standardized sections, and no gate checks type-name shape. Type names freeze at
  release one the same as function names, so a stated rule costs one rename batch now and a major
  later.

- **The three resolvers of one trio are built by two different verbs.** (API consistency;
  `src/lib/render/resolve-media.ts:89`) `SiteRender`'s input takes `resolve`/`resolveMedia`/
  `resolveFragment` together (`api-surface.md:77`). Two builders are `buildLinkResolver`
  (`src/lib/delivery/site-resolver.ts:191`) and `buildFragmentResolver` (`:205`) on `/delivery`; the
  third is `makeMediaResolver` (`src/lib/render/resolve-media.ts:89`) on `/media`, and the engine's
  own prose has assimilated the split at `public-routes.ts:37` ("builds the body resolver
  (`makeMediaResolver`)"). `makeMediaResolver` is the only `make*` export in the whole surface, where
  the factory-verb tally reads build 16, create 13, define 6, compose 1, make 1, and `/delivery`
  already runs `build*` as a coherent house prefix. A second convention independently indicts the
  name, since `manifestLinkResolver` (`content/manifest.ts:537`) pairs with `buildLinkResolver` while
  `manifestMediaResolver` (`resolve-media.ts:140`) pairs with `makeMediaResolver` instead of a
  parallel `buildMediaResolver`. The consumer receives all three as one parameter list
  (`examples/showcase/src/theme/cairn.config.ts:465-466`) though it does not invoke all three
  builders itself. The wider factory-verb set is exactly the class item 1 exists to catch and it is
  not on the list.

- **`NavLayoutEngineRef.hidden?: true` is a literal-true, so a site cannot compute the flag.** (API
  consistency; `src/lib/sveltekit/admin-nav.ts:213`) `hidden?: true` (`admin-nav.ts:213`) rejects
  `hidden: someCondition`, while its sibling in the same declared tree, `NavLayoutSection.collapsed?:
  boolean` (`:238`), accepts a computed boolean, and every other public optional flag on the surface
  is `?: boolean` (`ownerOnly`, `promoted`, `decorative`, `transformations`, `assetsEnabled`). An
  undocumented workaround exists and needs an `as const` to survive the spread
  (`{ screen: 'media', ...(assetsOn ? {} : { hidden: true as const }) }`), and no other seam
  substitutes, since omitting an engine ref sends it to the trailing `fallback` group (`:659-664`)
  and `navFilter` narrows `items` only (`content-routes-core.ts:470-471`). The runtime already treats
  a falsy `hidden` as not-hidden (`:626`), so the change is type-only. Two limits the verifier
  recorded: widening `true` to `boolean` in this input position is not source-breaking for layout
  authors, so it does not require the window, and
  `docs/guides/organize-your-admin-nav.md:180` frames `hidden: true` as retiring a door for good,
  which the literal may encode deliberately even though no comment or spec states that rationale.

- **`MakeIcon` is a dead exported type that no other signature names, and the root reference page
  documents it though only `/render` exports it.** (dead-or-accidental-surface;
  `src/lib/render/authoring.ts:6`) `MakeIcon` is declared at `src/lib/render/rehype-dispatch.ts:35`
  and re-exported on `/render` at `src/lib/render/authoring.ts:6`. No other exported signature names
  it, its former consumer `splitHead` survives only under `legacy/`, and its one textual use in the
  repo is an engine test (`src/tests/unit/render-pipeline-snapshot.test.ts:15`) that imports it
  through an internal relative path, so the public re-export has zero consumers.
  `examples/showcase/src/chassis/render.ts:20` declares the identical shape inline rather than
  importing it. It is listed at `docs/reference/core.md:1006` in the root `.` page's types table
  alongside 49 other names, every one of which is a root export, yet `src/lib/index.ts` and
  `dist/index.d.ts` do not export it, so `import type { MakeIcon } from '@glw907/cairn-cms'` fails.
  `check:reference` cannot catch this, because `scripts/reference-coverage.mjs` checks stale names
  against a package-wide export pool by design (`globalKnownNames`, lines 317-326). It survived the
  2026-07-01 pruning audit as a bare `KEEP MakeIcon` line
  (`docs/superpowers/plans/2026-07-01-surface-pruning-audit-verdicts.md:358`), and a developer
  following the reference hits a broken import today.

- **`ConceptUrlPolicy` is exported from the root barrel, named by no public signature, and used only
  inside one internal function.** (dead-or-accidental-surface; `src/lib/index.ts:28`) The type is
  declared at `src/lib/content/types.ts:104` and exported at `src/lib/index.ts:28`. No public
  signature names it, since `defineConcept` (`src/lib/content/concepts.ts:49-56`) passes an untyped
  object literal and `ConceptConfig`/`ConceptDescriptor` restate `permalink`/`datePrefix` inline
  (`api-surface.md:24-25`). `examples/showcase/src` never imports it, and its only uses in `src/lib`
  are the private `validateUrlPolicy` parameter (`concepts.ts:101`) and a local intermediate
  (`:176`). Its member type `DatePrefix` reaches no package subpath, so a consumer can use the type
  structurally but cannot name `DatePrefix` independently. The 2026-07-01 audit lists
  `KEEP ConceptUrlPolicy` (`surface-pruning-audit-verdicts.md:134`) with no recorded challenge or
  defense, while that same pass demoted `ResolvedPreview` as an engine-internal derived shape and
  demoted `DatePrefix` itself. Removal is breaking, free now, and permanent after beta; it carries
  three co-edits (`src/tests/unit/root-barrel-prune.test.ts:128`, `api-surface.md:26`,
  `docs/reference/core.md:981`).

- **`core.md` and the restrict-access guide both enumerate the fixed engine screen ids as three,
  omitting `nav`.** (doc-versus-code claims drift; `docs/reference/core.md:912`)
  `docs/reference/core.md:912-913` and `docs/guides/restrict-admin-access.md:14` both give a
  `defineAccess` target's fixed screens as `media`, `vocabulary`, `settings`. The code's set is four:
  `src/lib/sveltekit/admin-nav.ts:386` declares
  `const ACCESS_FIXED_SCREENS = ['media', 'vocabulary', 'nav', 'settings'] as const`, accepted by
  `validateAccessComposition` (`admin-nav.ts:401-423`, throw naming all four at `:419`) and asserted
  by `src/tests/unit/access-composition.test.ts:28`. The `nav` key is functionally enforced, not just
  validated, since `nav-routes.ts:58` (`navLoad`) and `:100` (`navSave`) both call
  `requireEngineAccess(runtime.access, editor, 'nav')`. No published page shows `nav` used as an
  access-map key. The separate six-id list at `docs/reference/sveltekit.md:1209` belongs to a
  different vocabulary (`ENGINE_SCREEN_IDS` for `navLayout`, `admin-nav.ts:193`) and is correct on
  its own terms. The access map's key vocabulary is frozen public surface, and a hand-maintained
  prose list has already failed once.

### Item 2: the `locals` namespace policy

- **The `/ambient` reference states the `App.Locals` augmentation and omits `cairnAccess`, the fourth
  engine key the sitting is about to rename.** (doc-versus-code claims drift;
  `docs/reference/ambient.md:16`) The page omits it in three places: the opening prose at lines 3-6
  enumerates only `editor`, `backend`, and `auditSink`; the fenced `declare global` block at lines
  16-24 declares those same three; and the walk-through prose at lines 27-36 explains those three.
  `src/lib/ambient.ts:27-36` declares four, adding `cairnAccess?: AccessMap` (type imported at line
  25, rationale comment at lines 19-21, shipped in `0.93.0`). `docs/internal/api-surface.md:131`
  carries the correct four-key shape, so the internal snapshot and the published page disagree. Three
  gates all miss it: `check-reference-signatures.mjs` scans fenced `ts` blocks only for
  `declare function NAME(` or `declare const NAME:` heads (`declaredSignature`, lines 200-209),
  `check-surface.mjs:143-150` renders the augmentation into `api-surface.md` only, and
  `check-snippets.mjs:164` blanks every top-level `declare global` block before typechecking. The
  only published mention of the addition is a per-release upgrade note
  (`docs/guides/upgrade-cairn.md:188`), so the reference page remains the only published statement of
  the whole shape and it is wrong. A `Consumers must:` list derived from this page would silently
  omit `cairnAccess`, and a site that hand-copies the block loses the typing `requireAccess` and
  `createSectionAction` depend on.

### Item 3: subpath taxonomy

- **`/components` publishes 9 of the 11 admin views, omitting `VocabularyAdmin` and `WelcomeView`,
  while the reference page sells per-view mounting as a supported seam.** (dead-or-accidental-surface;
  `src/lib/components/index.ts:3`) The barrel exports 16 names, and `AdminData`
  (`src/lib/sveltekit/cairn-admin.ts:95-109`) has 11 views. `CairnAdmin.svelte` imports
  `VocabularyAdmin` and `WelcomeView` at lines 20 and 22 and switches to them at lines 90 and 94,
  and neither is in the barrel. `docs/reference/components.md:6-7` states that "the per-view
  components below it stay public as the advanced seam for a site that mounts routes by hand." The
  data half of that seam is public for both omitted views (`vocabularyLoad`/`vocabularySave` at
  `docs/reference/sveltekit.md:725-726`, `saveVocabulary` at `docs/reference/admin-routes.md:142`,
  `indexRedirect` returning `WelcomeData` at `sveltekit.md:720`). Neither landing commit (`a85f8e1e`,
  `67aaf82c`) touched the barrel, so membership followed drift rather than a rule. The verifier
  limits the impact: a hand-mounting site is not blocked, since `CairnAdmin` is a pure `data.view`
  switcher whose two branches read only `data.page`, so the gap is an incomplete documented per-view
  path. Pruning the other nine view exports is breaking and cheap only now, so the membership rule is
  what the sitting should set.

- **Three subpaths carry "a site builds its own admin screen" surface, and two of them ship
  overlapping page-header primitives.** (dead-or-accidental-surface;
  `src/lib/components/OfficeList.svelte:3`) `/admin-fields` (4 exports), `/admin-toolkit` (33
  exports), and `/components` all carry it. `src/lib/components/OfficeList.svelte:3-8` describes
  itself as the shell "so a site's own custom `/admin/` screen gets the same office rhythm," a
  same-intent paraphrase of the `/admin-toolkit` charter at `src/lib/admin-toolkit/index.ts:2-5`, yet
  it ships from `/components`. `src/lib/admin-toolkit/PageHeader.svelte:4` calls itself "the
  `OfficeList` shape, generalized," and the showcase's one custom admin screen imports from both
  subpaths (`examples/showcase/src/routes/admin/signups/+page.svelte:6-7`). The two components are
  not interchangeable, contrary to the finding as filed: `PageHeader` is header-only and takes no
  `children`, `OfficeList` requires `children` and wraps them in a `.card-shell` div, and they differ
  in `mb-6` versus `mb-10`, `gap-0` versus `gap-0.5`, and a `subtitle` at `type-body` versus a `meta`
  at `type-meta`. The verifier also notes the choice between them is routed in the docs
  (`docs/guides/add-a-custom-admin-screen.md:133`, `skills/cairn-admin-screens/references/exemplar-list.md:32-34`)
  and that `docs/internal/admin-design-system.md:324` treats the three directories as deliberate
  co-equal scan roots. `ROADMAP.md:574-580` already files the spacing convergence as a later-major
  question; the unfiled move is the membership one, relocating `OfficeList` to `/admin-toolkit` and
  folding `/admin-fields` in, which is breaking and free only in this window.

- **`/admin-fields` and `/admin-toolkit` state the same charter, and neither subpath was covered by
  the only surface-pruning audit.** (cruft; `src/lib/admin-fields/index.ts:1`)
  `admin-fields/index.ts:1-5` and `admin-toolkit/index.ts:1-5` both state their audience as a site
  building its own `/admin/` screens, and neither carries an inclusion or exclusion rule of the kind
  `src/lib/cloudflare/index.ts:3-5` and `src/lib/auth-store/index.ts:4-5` both carry.
  `docs/reference/README.md:39-40` repeats the collision in two adjacent one-liners that differ by an
  adjective. The overlap is operative rather than merely verbal, since
  `src/lib/admin-toolkit/ListToolbar.svelte` hand-rolls `<label class="input">` and
  `<select class="select select-sm">` (lines 344-355, 428-437, 456-459) rather than composing
  `FieldLabel`/`SelectField`, while `docs/reference/admin-fields.md:24-27` names "a toolbar filter"
  as the canonical `register="inline"` case. Both postdate the audit (`admin-fields/index.ts`
  2026-07-06 in `4cc74bd2`, `admin-toolkit/index.ts` 2026-07-20 in `24b30c50`), and
  `docs/superpowers/plans/2026-07-01-surface-pruning-audit-verdicts.md` has zero occurrences of
  either name. The verifier corrects the framing: the audit covered all twelve subpaths that existed
  on 2026-07-01 and omitted nothing selectively, so five of today's sixteen code subpaths have never
  been pruned, `./auth-store`, `./auth-crypto`, and `./cloudflare` included. Merging the pair later
  is breaking, and nobody has yet asked whether they should be one subpath.

- **`auth-crypto.md` promises "three properties to design around" for `tokensMatch` and drops the
  fourth the source records as a caller precondition.** (doc-versus-code claims drift;
  `docs/reference/auth-crypto.md:88`) The page enumerates exactly three at lines 88-93 (it leaks
  length, `tokensMatch('','')` is false, it is only for fixed-length CSPRNG tokens and hex hashes).
  The source block at `src/lib/auth/crypto.ts:101-112` opens with the same three and appends a fourth
  at lines 108-111, that `TextEncoder` maps an unpaired surrogate to the replacement character, so
  two strings differing only in a lone surrogate compare equal, "which is exactly why this
  precondition is stated rather than guarded against." The verifier reproduced the behavior
  independently, since `encode('\uD800')` and `encode('\uDC00')` both produce `ef bf bd`. The
  precondition appears nowhere in the published docs, and commit `adde6e3c` introduced the drift by
  adding the sentence to `crypto.ts` while editing the same reference page for other corrections.
  `auth-crypto` is the newest server-only subpath and its pitch is that a site building a second
  audience's login reuses these primitives, so the one input class where `tokensMatch` returns true
  for unequal strings should be stated on the page that freezes with the subpath.

### Item 4: the event-shape trio

- **`AdminActionEvent` omits `params`, so both extension seams push authors off SvelteKit's route
  parameters, and both engine-authored examples read the route id out of the form body.**
  (sveltekit-idiom; `src/lib/sveltekit/admin-action.ts:48`) `AdminActionEvent<Env>` extends
  `EventBase<Env>` and adds only `cookies` and a narrowed `locals` (`admin-action.ts:48-51`), while
  `EventBase` declares only `url`, `request`, `locals`, `platform` (`types.ts:33-44`). No `params`,
  `route`, `setHeaders`, `fetch`, or `getClientAddress`. `ContentEvent` carries
  `params: Record<string, string>` (`content-routes-context.ts:38-39`) and the engine reads it freely
  (`content-routes-core.ts:371`, `:643`, `:690`, `:734`, `:1512`). A compile probe under `--strict`
  confirms `event.params.id` is a type error inside a wrapped handler and that widening the handler's
  own argument type is also rejected under `strictFunctionTypes` contravariance. The verifier limits
  the claim in two ways: the gap is typed-surface rather than capability, because `params` is present
  at runtime and an outer closure compiles cast-free (though no doc shows that pattern), and
  `SectionActionOptions.target`'s catch-all hazard (`section-action.ts:52-58`) is not an argument for
  `params`, since on a catch-all route `params` holds precisely the attacker-chosen segment and the
  field that hazard calls for is `event.route.id`, also absent. The visible cost is in cairn's own
  documentation, where both wrapper examples target an `[id]` route and both write
  `const id = String(form.get('id'))` (`admin-action.ts:127-131`, `section-action.ts:109-119`,
  `docs/guides/add-a-custom-admin-screen.md:284-291`). Adding `params` later is non-breaking, but
  changing `SectionActionOptions.target`'s derivation later is breaking, so the shape and the target
  derivation want one decision.

- **There are at least six public event shapes, not three: four named and two anonymous inline object
  types on exported functions.** (sveltekit-idiom, dead-or-accidental-surface;
  `src/lib/sveltekit/admin-action.ts:48`) The four named are `RequestContext` (`types.ts:57`, pins
  `AuthEnv`), `ContentEvent` (`content-routes-context.ts:38`, pins `BackendEnv`), `AdminEvent`
  (`cairn-admin.ts:48`, pins both, shape-only in the `.d.ts`), and `AdminActionEvent<Env = AuthEnv>`
  (`admin-action.ts:48`), the only one exported by name that is generic over `Env` and the only one
  documented as a type in `docs/reference/sveltekit.md:1568`. Two exported functions declare their
  event inline and anonymously, `healthLoad`'s `{ platform?: { env?: BackendEnv } }`
  (`health.ts:29-32`, `api-surface.md:347`) and `requireAccess`'s
  `{ locals: { editor?: Editor | null; cairnAccess?: AccessMap }; url: URL }` (`guard.ts:208-211`,
  `api-surface.md:371`); `requireSession` (`:149`), `requireOwner` (`:160`), and `requireEditor`
  (`:173`) declare one identical inline shape three times rather than three variants. `EventBase<Env>`
  (`types.ts:33`) is itself generic but internal and absent from the surface snapshot, which is what
  makes `AdminActionEvent` the only exported generic event shape. The structural-event doctrine
  already has one ratified exception, since `createMediaRoute` returns kit's own nominal
  `RequestHandler` (`media-route.ts:9`, `api-surface.md:338`) with its reasoning in the header
  comment. A grep of the agenda finds `AdminActionEvent`, `healthLoad`, `requireAccess`, and the
  `createMediaRoute` precedent nowhere in it, and consolidating event shapes is the most breaking
  change available in this window.

- **`AdminActionEvent` is a fourth admin event shape and the only generic one, which item 4's "three
  names" framing omits.** (dead-or-accidental-surface; `src/lib/sveltekit/admin-action.ts:48`) A
  second lens filed this independently against the same type. `admin-action.ts:48` declares
  `export interface AdminActionEvent<Env = AuthEnv> extends EventBase<Env>`, and unlike the other
  three it is exported by name (`src/lib/sveltekit/index.ts:68`, `api-surface.md:312`). Its `locals`
  slice differs from all three, declaring `{ editor, auditSink, cairnAccess }` at `:50` as an
  override that drops `backend` and adds `auditSink`, where `ContentEvent` (`api-surface.md:328`) and
  `RequestContext` (`:369`) both carry `backend` and neither carries `auditSink`. `adminAction` pins
  the default (`admin-action.ts:152-155`) while `createSectionAction` takes `AdminActionEvent<Env>`
  (`section-action.ts:126`, `:131`), so the one exported event type is used both pinned and generic,
  with the load-bearing bridge cast at `section-action.ts:139`. It is the one event shape a consumer
  actually imports by name and the extant working proof of the generic form item 4 is weighing, and
  its divergent `locals` slice is also evidence for item 2.

- **Forty engine-owned types leak shape-only into the public `.d.ts` with no named export anywhere,
  and item 4 names exactly one of them.** (dead-or-accidental-surface;
  `docs/internal/api-surface.md:329`) Cross-referencing every type identifier appearing in an
  api-surface entry body against the 303 exported names across all 16 subpaths yields 40 types
  declared in `src/lib` that no subpath exports, confirmed at the artifact level against
  `dist/index.d.ts`, `dist/sveltekit/index.d.ts`, and `dist/media/index.d.ts`. The load-bearing ones
  include `UsageEntry` (`src/lib/media/usage.ts:37`), which appears in four exported types
  (`ContentFormFailure` `api-surface:329`, `MediaDeleteRefusal` `:352`, `MediaReplaceFailure` `:354`,
  `MediaUsageInfo` `:356`); `InboundLink` (`src/lib/content/manifest.ts:446`) in three; `TidyConfig`
  (`src/lib/nav/site-config.ts:122`) on both `SiteConfig` `:75` and `CairnRuntime` `:15`; and
  `TidyConventions` (`site-config.ts:141`) on `SettingsData` `:389` and `EditData` `:342`, alongside
  `MediaLibraryEntry`, `LinkTarget`, `FragmentTarget`, `ResolvedPreview`, `TidyClient`,
  `TidyKeyProbeResult`, `CookieSetOptions`, the 13 `*Field` union arms in `src/lib/content/fields.ts`,
  and 7 result types that appear in `createCairnAdmin`'s own returned action map (`api-surface:334`).
  The 2026-07-01 pruning audit adjudicated only 9 of the 40 on a stated "reachable structurally"
  doctrine, and the rest postdate it with no recorded ruling. `docs/reference/sveltekit.md:1584-1596`
  publishes declarations naming `UsageEntry`, `TidyConventions`, `InboundLink`, and
  `TidyKeyProbeResult` to consumers who cannot import them, so a site rendering its own
  delete-refusal UI cannot name the type of the field it is reading.

- **`PlatformContext` and `CookieSetOptions` are named in the public surface but importable from no
  subpath.** (cruft; `src/lib/sveltekit/types.ts:22`) `interface PlatformContext<Env>`
  (`types.ts:22`) carries no `export` keyword, and the shipped `dist/sveltekit/types.d.ts` reproduces
  it unexported in a file terminated by `export {}`. It appears by name in three exported types,
  `AdminActionEvent` (`api-surface.md:312`), `ContentEvent` (`:328`), and `RequestContext` (`:369`),
  each as `platform?: PlatformContext<Env>`. `CookieSetOptions` (`types.ts:7`) and `EventBase`
  (`types.ts:33`) are exported from their module, but the `/sveltekit` barrel re-exports only
  `RequestContext`, `CookieJar`, `HandleInput` (`src/lib/sveltekit/index.ts:80`) and `package.json`
  publishes no deep subpath, so neither is importable; cairn's own tests reach `CookieSetOptions`
  through relative paths (`src/tests/unit/csrf.test.ts:8`) unavailable outside the repo. The verifier
  corrects the consequence: because the containing event types are exported, a consumer has
  drift-free indexed-access escapes such as `NonNullable<AdminActionEvent<Env>['platform']>`, so the
  cost is a leaked-but-unusable name plus an awkward workaround rather than forced structural
  re-declaration. This is the `AdminEvent` leak of item 4 replicated on three more names, so the
  pattern wants one ruling.

### Item 6: the log-event vocabulary

- **`log-events.md` documents field names for `media.uploaded` and `github.unreachable` that the emit
  sites never write.** (doc-versus-code claims drift; `docs/reference/log-events.md:30`)
  `log-events.md:30` lists `media.uploaded`'s fields as `editor`, `hash`, `bytes`, `ext`, while the
  sole emit site at `src/lib/sveltekit/content-routes-media.ts:574` writes
  `{ editor, hash, bytes, contentType: sniffed, reused }`. There is no `ext` field in the record;
  `ext` belongs to the `MediaEntry` manifest built at `:558-571`, which is plausibly how the doc
  drifted, and two emitted fields are undocumented. `log-events.md:28` says `github.unreachable`
  carries `scope` (`layout`), while the three emit sites write `scope: 'shell'`
  (`content-routes-core.ts:453`), `scope: 'help'` (`:547`), and `scope: 'publish-advisories'`
  (`:1230`); `layout` is emitted nowhere, and the row's "fires when" column no longer covers two of
  the three scopes. The event-name set is exactly in step (56 rows against 56 union members in
  `src/lib/log/events.ts`), and nothing gates the field and value columns, since no script or
  `package.json` entry reads this table. Fields and reason values are as observable as event names
  and are free to rename only until the next publish, so they belong in the same read.

- **The engine's log-record `reason` vocabulary is split between snake_case and kebab-case, and the
  kebab half is documented only in prose.** (doc-versus-code claims drift;
  `docs/reference/log-events.md:31`) snake_case reasons come from `guard.ts:64/75/86/97/116`
  (`dev_backend_in_prod`, `origin`, `https`, `bindings`, `csrf`), `turnstile.ts:98-167` (seven
  values), `section-action.ts:204/218`, `commit-log.ts:22` (`conflict`), `content-routes-tidy.ts`,
  and `audit-sink.ts`. The media family is entirely kebab-case, with
  `content-routes-media.ts:459-543` emitting `media-disabled`, `length-required`, `too-large`,
  `csrf`, `session-expired`, `access-denied`, `unsupported-type`, `binding-missing`,
  `hash-collision`, and `media-route.ts:129` emitting `binding-missing`. Every reason-bearing row in
  `docs/reference/log-events.md` lists its literals in backticks except the two media rows, where
  line 31 renders the nine upload reasons as English prose and omits `access-denied` altogether, and
  line 32 names `reason` without stating `binding-missing`. The verifier corrects the cost: the media
  reasons double as the client-facing failure payload (`fail(status, { error: reason })`,
  `content-routes-media.ts:461`) matched by `REFUSE_TO_FAILURE` in
  `components/media-upload-outcome.ts:48`, so unifying the casing is a wire-contract change reaching
  client components, and documenting the literals is the one-diff part. Deciding one casing, or
  ratifying the split, costs a diff now and a major version after beta.

- **`config.invalid`'s "fires when" describes only the nav editor, but two of its three emit sites are
  settings routes with different degrade behavior.** (doc-versus-code claims drift;
  `docs/reference/log-events.md:21`) The doc describes the nav editor's load degrading to an empty
  tree, which matches only `src/lib/sveltekit/nav-routes.ts:80`. There are three emit sites covering
  four call paths, all emitting the same two fields (`conditionId: 'config.site-config-invalid'`,
  `error`) with nothing to distinguish them. `content-routes-settings.ts:130`, inside
  `parseSiteConfigOrRedirect` (`:125-135`), does not degrade at all and throws
  `redirect(303, ...?error=)`, reached from two callers with different error paths (`settingsSave` at
  `:249`, `vocabularySave` at `:367`). `content-routes-settings.ts:301` (`vocabularyLoad`) degrades
  to an empty vocabulary rather than an empty tree. A further split the doc hides is that the two
  load-path sites swallow any thrown error while the redirect site logs only a `SiteConfigError` and
  rethrows anything else unlogged. `CLAUDE.md`'s stated diagnosis method is to map a symptom to its
  event through this table, so an operator whose settings save bounced is sent to the nav editor. The
  table already carries the disambiguation precedent at line 28, where `github.unreachable` uses
  `scope`.

### Item 7: the deprecated-alias sweep

- **`adminNav` is a live legacy seam superseded by `navLayout`, called legacy in code and in one
  buried reference line.** (cruft; `src/lib/sveltekit/admin-nav.ts:189`) `CairnAdapter.editor.adminNav`
  (`src/lib/content/types.ts:282`) and `editor.navLayout` (`:290`) both configure the admin sidebar,
  and `validateNavLayout` throws when both are declared (`admin-nav.ts:288-292`). `navLayout`'s node
  types are supersets (`NavLayoutEntry extends AdminNavEntry` plus `roles`, `:218`;
  `NavLayoutSection` adds `roles` and `collapsed`, `:228`). The source calls the older path legacy in
  seven comments (`189`, `426`, `481`, `671`, `673`, `674`, `676`), two locals (`:691-692`), and
  `CairnAdminShell.svelte:126-128`, and no `@deprecated` tag exists anywhere in `src/lib`. Three
  corrections from the verifier. The published docs are not wholly silent, since
  `docs/reference/sveltekit.md:1382` says "its normalized legacy `adminNav`," buried in a
  `ResolveNavLayoutOptions` field description. This is not an alias, so item 7 is a loose fit and
  item 1 may be the better home, because the guides draw a real behavioral distinction where
  `adminNav` is additive and `navLayout` replaces the whole sidebar
  (`docs/guides/add-a-custom-admin-screen.md:385-389`). Retirement is not one `Consumers must:` line,
  since it removes `normalizeAdminNav`, `filterNavByRole`, `AdminNavConfig`, `ResolvedNavItem`, and
  `ResolvedNavSection` from the public reference and forces a site wanting one extra sidebar link to
  declare its whole tree. The sharpest evidence is that `ROADMAP.md:25` lists "the data-only
  `adminNav`" among the seams whose stability gates 1.0 while the implementation calls it legacy in
  nine places, so one of the two documents is wrong.

- **The known `context`/`ctx` alias is dead on both sides, since the engine reads neither field.**
  (cruft; `src/lib/sveltekit/types.ts:25`) `PlatformContext` declares `ctx?: { waitUntil }`
  (`types.ts:24`) and `context?: { waitUntil }` (`:25`). No engine path reads either, because every
  `platform` read in `src/lib` goes through `platform?.env` (`auth-routes.ts:75/162/189`,
  `editors-routes.ts:59/79`, `guard.ts:60`, `content-routes-settings.ts:157/196`,
  `section-action.ts:158/217`, `health.ts:33`, `media-route.ts:124`), and `createD1AuditSink`
  receives the already-bound `waitUntil` as a parameter (`audit-sink.ts:92-95`). The two fields
  differ in retirement cost, contrary to the finding as filed. `context` appears nowhere else in the
  tree, with no test, showcase code, live doc page, or CHANGELOG line, so retiring it is a
  declaration-only edit. `ctx` is still constructed by the auth test harness
  (`src/tests/integration/_auth-harness.ts:73`) for the negative test at
  `src/tests/integration/auth-request.test.ts:96-111` and is named in live consumer docs
  (`docs/reference/sveltekit.md:462/488`, `docs/guides/add-a-custom-admin-screen.md:340`), though
  those snippets read `platform.ctx` off the site's own `App.Platform` and carry a
  `snippet-check-skip` saying so. The shape is not vestigial overall, since `env` is load-bearing and
  only the `ctx`/`context` pair is dead. The same condition was recorded as D4 in
  `docs/internal/history/2026-06-28-principle-adherence-audit.md:117` and deferred.

### Item 8: `AdminActionError`'s residual identity

- **The convergence docs call `adminAction`'s two refusals "authorization" branches four times, two
  paragraphs after stating it performs no authorization.** (doc-versus-code claims drift;
  `docs/reference/sveltekit.md:335`) `docs/reference/sveltekit.md:312-313` states flatly that
  "`adminAction` authenticates and verifies CSRF; it performs no authorization of its own," and
  `:241-244` draws the line correctly. The same page then calls the identical pair "Both preceding
  authorization branches" (`:335`), "`adminAction`'s two authorization branches" (`:341-342`), "Its
  own authorization guards" (`:539-540`), and, in the `AdminActionError` types-table row,
  "`adminAction`'s own authorization refusals" (`:1575`). The upgrade guide repeats the collision
  inside one section (`docs/guides/upgrade-cairn.md:129` against `:146`). The code agrees with the
  first framing, since `src/lib/sveltekit/admin-action.ts:157-183` checks only session presence and
  CSRF and its docblock names them "a missing editor session or a CSRF mismatch." Two internal docs
  carry the same phrasing (`docs/STATUS.md:39` and the write-once convergence plan), and the verifier
  found one related drift worth folding in, that `sveltekit.md:241-242` groups `requireSession` under
  functions that "all perform authorization" while `guard.ts:149-153` checks session presence only.
  Item 8 asks whether `AdminActionError`'s name still describes what it means, and the same question
  applies one level up, because the authentication/authorization line is exactly what separates
  `adminAction` from `requireAccess`/`createSectionAction` in the seam taxonomy being ratified.

### Item 9: `SectionActionConfig.resolveDb`'s shape

- **`createSectionAction` makes a call site declare the audit verbs twice, in two different shapes.**
  (API consistency; `src/lib/sveltekit/section-action.ts:47`) `SectionActionOptions.action`/`.entity`
  (`section-action.ts:49`, `:51`) are wrap-time audit verbs, documented as "reused as the audit
  `action`/`entity` on every denial too" and read only by the `deny` (`:145`) and `misconfigured`
  (`:152`) exits plus three rate-limit log lines. The handler independently restates the same two
  keys at runtime through `ctx.audit({ action, entity, entityId })` (`AdminActionAudit`,
  `admin-action.ts:23-32`), and nothing compares or seeds one from the other. The factory's own
  documented example writes `'approve'`/`'event'` in both places on one call site
  (`section-action.ts:117`, `:119`), and `docs/reference/sveltekit.md` repeats that snippet as the
  published idiom. `adminAction`, the layer underneath, has only the runtime form. The repo's own
  suite already diverges the two, since `src/tests/unit/section-action.test.ts` audits `test`/`test`
  from the handler (`:94`) under options `approve`/`event` (`:112-113`), and the assertion at `:144`
  confirms the emitted record carries the handler's pair, so a denial and a success on one call site
  audit under different verbs with no gate. The verifier notes one legitimate case that argues
  against blind unification, that a handler may audit a different entity when an action touches two
  rows. Item 9 already opens `SectionActionConfig`'s shape, and both are `SectionAction*`
  wrapper-signature changes.

### Item 10: the built-in actions' refusal pattern

- **Every content action is annotated `ReturnType<typeof fail>`, which ships `ActionFailure<unknown>`
  on 18 exported members and collapses the consumer's generated `ActionData` to `{}`.**
  (sveltekit-idiom; `src/lib/sveltekit/content-routes-core.ts:1175`) The engine's actions are
  hand-annotated `Promise<ReturnType<typeof fail> | never>` at 24 sites across
  `content-routes-core.ts` (`:998`, `:1175`, `:1195`, `:1399`, `:1504`, `:1510`, `:1526`),
  `-media.ts`, `-tidy.ts`, and `-dictionary.ts`. `ReturnType<typeof fail>` resolves kit's generic
  overload with `T` unresolved, so `dist/sveltekit/cairn-admin.d.ts` carries exactly 18
  `ActionFailure<unknown>` members and `dist/sveltekit/content-routes.d.ts:44-63` carries the same 18
  on `createContentRoutes`. Kit's `AwaitedActions` then reduces to `unknown` and wraps it in
  `OptionalUnion`, so the generated `ActionData` is `{}`, not `unknown`, which makes the consumer
  cost worse rather than milder: `form?.error` is an immediate TS2339, while `{}` stays assignable to
  any all-optional target, which is why the showcase's `<CairnAdmin {form} />` passes
  `npm run check` at 0/0 while delivering zero type information. Meanwhile nine precise failure
  shapes are exported through `./sveltekit` (`SaveFailure`, `RenameFailure`, `DeleteRefusal`,
  `MediaDeleteRefusal`, `MediaReplaceFailure`, `MediaUpdateFailure`, `MediaBulkFailure`,
  `MediaAltPropagateFailure`, and their union `ContentFormFailure`) and not one appears in any
  exported signature, though the engine builds them correctly at the `fail()` call sites via
  `satisfies`. The pattern is applied elsewhere, since `createEditorRoutes`, `createSectionAction`,
  and `addEditor`/`removeEditor`/`setRole` do ship precise `ActionFailure<{ error: string }>`. Ruling
  on item 10 without ruling on the return annotation freezes a `fail()` channel that cannot be
  consumed idiomatically; the finding's claim that every fix is breaking is its own judgment, which
  the verifier did not confirm, though it remains a public `.d.ts` change on 18 exported members.

- **The redirect-PRG refusal channel carries its full user-facing sentence in `?error=`, and eight
  loads render it verbatim in the admin's own alert.** (sveltekit-idiom;
  `src/lib/sveltekit/cairn-admin.ts:287`) `viewAction`'s catch-all bounce URL-encodes the entire
  editor-facing message into the query string (`cairn-admin.ts:287`, the constant a full sentence at
  `:199-200`), and the engine's validated refusals do the same with their own copy
  (`content-routes-core.ts:697`, `:1043`, `:1065`, `:1071`, `:1327`, `:1349`). Ten loads read the
  parameter back with no allow-list, no length cap, and no provenance check
  (`content-routes-core.ts:916`, `:645`, `:566`; `auth-routes.ts:134`, `:151`;
  `editors-routes.ts:85`; `nav-routes.ts:93`; `content-routes-settings.ts:210`, `:330`;
  `content-routes-media.ts:383`), and `guard.ts` inspects no query parameters. Eight of those reads
  render the value verbatim in cairn's own alert, including `EditPage.svelte:1693-1694`
  (`<div class="alert alert-error mb-4 type-body">{data.error}`), `ConceptList.svelte:299-302`,
  `NavTree.svelte:123-124`, `ManageEditors.svelte:63`, `CairnTidySettings.svelte:339-340`,
  `VocabularyAdmin.svelte:156-157`, and `CairnMediaLibrary.svelte:1427-1431`. The two exceptions are
  the auth pages, where `LoginPage.svelte:105-106` and `ConfirmPage.svelte:40-42` treat `data.error`
  as a boolean flag and print hardcoded copy. Any link of the form
  `/admin/posts/<id>?error=<arbitrary text>` therefore renders attacker-chosen prose inside cairn's
  branded error alert to a signed-in editor; Svelte escapes it, so this is credential-phishing
  surface rather than XSS, aimed at the population that can commit to the repo. If the sitting
  ratifies redirect-PRG, a bounded error channel resolved server-side is a shape change that breaks
  the `?error=` URLs and the `*Data.error` field type alike.

### New findings (no agenda item)

- **The flagship `./sveltekit` factories `createCairnAdmin` and `createAuthRoutes` ship empty
  placeholder doc blocks, and `createCairnAdmin`'s return type is unnamed and inferred.**
  (sveltekit-idiom, API consistency; `src/lib/sveltekit/cairn-admin.ts:111`) `createCairnAdmin`
  carries the literal three-line empty block `/**` / ` *` / ` */` at `cairn-admin.ts:111-113`
  immediately above its declaration on line 114, and `createAuthRoutes` carries the identical block
  at `auth-routes.ts:63-65`. Both satisfy `jsdoc/require-jsdoc` and `check:reference` because a block
  exists, and `jsdoc/informative-docs` flags only a comment that restates the symbol name, verified
  by running `npm run check:comments`, which reports `check:comments OK` with both blocks in place. A
  scan of `src/lib` finds ten such empty blocks, the other eight in `doctor/` and
  `components/markdown-format.ts`, while every other export in both files carries multi-paragraph
  contract prose, as do `cairn-admin.ts`'s own non-exported inner functions. `createCairnAdmin`
  declares no return type, so `api-surface.md:334` records the whole facade as one unnamed inline
  structural literal of 31 members whose `actions` record holds 29 keys, with no name a consumer can
  reference, and the allowlist comment at `scripts/check-reference-signatures.mjs:24` describing that
  type says "all fifteen methods" against an actual 29. The published reference page is not missing
  (`docs/reference/sveltekit.md:58` documents `createCairnAdmin` at length), so the gap is the
  editor-hover surface and the absent named return type. Item 1's read of every exported name would
  otherwise be done against tooltips that say nothing for the two names that matter most.

- **The `/admin-toolkit` formatters disagree on nullish tolerance with no stated rule.** (API
  consistency; `src/lib/admin-toolkit/format.ts:79`) Three of the four string-returning formatters
  disagree on absence. `formatCivilDate(iso: string | null | undefined, ...)` (`:51`) absorbs nullish
  and renders a `fallback` option defaulting to `'Not yet'` (`:32`, `:54`), while its near-twin
  `formatTimestamp(sqliteDatetime: string, ...)` (`:79`) and `formatPhone(phone: string)` (`:117`)
  refuse nullish and carry no fallback, as does `formatMoney(cents: number, ...)` (`:25`).
  `formatCivilDate` and `formatTimestamp` are otherwise the same function shape, both parsing a
  SQLite datetime string, both guarding NaN by returning the input unchanged (`:57`, `:82`), both
  returning a display string. Under `strict: true` a consumer rendering a nullable column must write
  `?? ''` for `formatTimestamp`, which then falls through the NaN guard to an empty cell rather than
  a fallback word. No cross-cutting nullish rule appears in `docs/reference/admin-toolkit.md`, the
  file header, or the graduation spec, which named the timezone default as its one settled contract
  adjustment. `ageFromBirthdate`'s `number | null` return (`:92`) is separately justified at
  `:88-90` and is not part of the inconsistency. Widening a parameter is non-breaking, but adding the
  matching `fallback` option changes the options interfaces, so the rule belongs in a deliberate
  window.

- **`doctor.md` says eighteen checks run by default and documents seventeen, so `auth.role-wiring`
  appears in no published doc.** (doc-versus-code claims drift; `docs/reference/doctor.md:69`)
  `docs/reference/doctor.md:69` claims "Eighteen checks run by default," `defaultChecks()` in
  `src/lib/doctor/assemble.ts:190-211` returns exactly eighteen, and
  `src/tests/unit/doctor-bin.test.ts:129-149` asserts that same list including `auth.role-wiring`.
  The table at `doctor.md:77-93` carries seventeen default rows plus the two opt-in rows and has no
  row for it. The check is shipped (`src/lib/doctor/checks-local.ts:354-386`,
  `conditionId: 'auth.role-wiring-missing'`, title "Guard role wiring"), reading
  `src/hooks.server.ts` and failing when a site declares custom roles without passing them to
  `createAuthGuard`. `grep` finds zero hits for `role-wiring` under any published arm, and the
  readiness guide's "Provision the auth store" section (`docs/guides/cloudflare-readiness.md:144-150`)
  enumerates "two more checks read the same table" while naming only `auth.role-vocabulary` and
  `auth.email-normalization`. No gate catches it, because `scripts/check-readiness.mjs` only asserts
  each condition's `docsAnchor` resolves to a real heading, and that heading exists. Two corrections
  from the verifier: eighteen is the correct count and the table is one row short, so the fix is
  adding the row; and an operator is not left with nothing, since
  `src/lib/diagnostics/conditions.ts:153-163` carries a full `why` and `remediation` that the doctor
  prints on failure. The gap is published-prose coverage plus a self-contradicting count.

- **`adminAction`'s reference walkthrough omits the `X-Cairn-CSRF` header witness the code checks
  first, and contradicts the log-events page on the same branch.** (doc-versus-code claims drift;
  `docs/reference/sveltekit.md:319`) `docs/reference/sveltekit.md:319-320` states step 2 as "the CSRF
  cookie and the posted `csrf` field must match, constant-time, else SvelteKit's own
  `error(403, ...)`". `src/lib/sveltekit/admin-action.ts:172-183` wraps that compare inside
  `if (!validateCsrfHeader(event))`, so a valid `X-Cairn-CSRF` header clears the check outright and
  the field compare never runs; `src/lib/sveltekit/csrf.ts:52-57` reads the token from the
  `x-cairn-csrf` request header, and `guard.ts:111-118` uses the same header-first order. The code
  comment at `admin-action.ts:167-171` names the consequence the reference drops, that "a
  fetch-based custom action that sets the header and posts FormData with no csrf field still passes
  this inner check." `docs/reference/log-events.md:58` already describes the header witness correctly
  for `admin.action.csrf_rejected`, so two published pages state different behavior for one branch,
  and `sveltekit.md` names `X-Cairn-CSRF` only for media and AI-assist fetch endpoints (`:779`,
  `:855`, `:866`, `:908`). Commit `f056a856` rewrote step 1 of that numbered list and carried step
  2's field-only wording forward unchanged. As written the page tells a site that a
  header-authenticated fetch POST will 403, which is false, and this is the wrapper contract the
  sitting is freezing.

- **`core.md` states `canReach`'s owner rule in a sentence that contradicts itself and the code on
  the `editors` screen.** (doc-versus-code claims drift; `docs/reference/core.md:948`)
  `docs/reference/core.md:947-950` and its source docblock `src/lib/auth/access.ts:96-99` both read
  "Owner capability reaches every target except the `editors` screen, which stays owner-only
  regardless of the map," whose two halves are opposites under a literal parse. The code and its test
  settle it, since `access.ts:111-113` returns true for `owner` capability before the
  `target === 'editors'` refusal at `:114-116`, and `src/tests/unit/auth-access.test.ts:86-89`
  asserts `canReach(access, editor('owner','owner'), 'editors') === true` alongside `false` for a
  `webmaster`. The fix is two files, and `admin-nav.ts:383` already carries the correct phrasing to
  copy. The verifier also found that "regardless of the map" understates the rule: a site cannot name
  `editors` in an access map at all, because `validateAccessComposition` (`admin-nav.ts:401-422`)
  admits only a declared concept id or one of `ACCESS_FIXED_SCREENS` and throws an actionable
  `access:`-prefixed error at server start otherwise, so the reference implies a site may map it and
  be silently ignored when that is not what happens. `canReach` is described on the same page as the
  one authority function every enforcement and visibility check reads, and the bare `'editors'`
  literal is hardcoded inside it (`access.ts:114`) as an unnameable special case while the
  neighbouring screen lists are named constants.
