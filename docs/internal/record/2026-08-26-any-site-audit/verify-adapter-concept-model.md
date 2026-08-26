
# Fresh-context verification: adapter / concept model (51 items)

Method: read the ranking, then the code (`src/lib/**`), the built surface golden
(`docs/internal/api-surface.md`), the published reference and **extend guides**, the
2026-07-01 verdicts doc, the `root-barrel-prune.test.ts` gate, and the real import
ground truth across all six family artifacts (`~/Projects/{907-life,ecxc-ski,
aksailingclub-org,xcathletes-org,cairn-pub}`, `examples/showcase`).

## Verdicts that do NOT stand (2 of 51)

### 2. `DEFAULT_ROLES` — retire → **KEEP**

The ranking's any-site case ("none demonstrated ... `resolveCapability` already treats an
undefined vocabulary as `DEFAULT_ROLES`") is incomplete. It checked the three readers that
take `RolesDeclaration | undefined` and missed the one public function that does not:

```ts
export function defineAccess<const A extends AccessMap>(roles: RolesDeclaration, map: A): A
```
`src/lib/auth/access.ts` — `roles` is required, and every map value is validated against
`new Set(Object.keys(roles))`. A site that wants an access map but declares no custom
vocabulary has no way to pass the engine's default pair except this constant.

cairn's own published guide instructs exactly that, twice:

> If it doesn't, import `DEFAULT_ROLES` (docs/reference/core.md#defineroles) from
> `@glw907/cairn-cms` instead: the implicit `{ owner: 'owner', editor: 'editor' }` pair a
> site with no declared vocabulary already resolves against.
> — `docs/extend/restrict-admin-access.md:14` (repeated in the code block at :24)

That is a documented anonymous-consumer path, not family recurrence. And the hand-roll is
not equivalent: the site's literal copy is *validation input* to an engine function, so if
the engine ever widened its default vocabulary, `defineAccess` would reject a role name the
engine itself accepts while `resolveCapability` accepted it. Retiring the constant is only
correct together with a reshape of `defineAccess` to take `RolesDeclaration | undefined` and
default internally, which is the even shape (its three siblings all do). That is a
`defineAccess` decision (rank 94), not this row's. **Keep.**

### 21. `roleHome` — keep → **RETIRE**

The keep rests on one claim, and the claim is false:

> Re-deriving means reading `RoleDeclaration`'s two-arm union by hand, where a hand-roll
> crashes on `.home` of a string.

Property access on a string primitive returns `undefined` in JS; it does not throw. The
engine's own body is
`typeof decl === 'string' ? undefined : decl.home` (`src/lib/auth/roles.ts:95-101`), so the
naive hand-roll `roles?.[role]?.home` returns the identical answer on every input,
including the absent-role and bare-capability arms. There is no correctness trap.

What remains: zero importers across all six family artifacts; no closure requirement (a
function, not a type named in a signature); and the surface it supposedly reaches is
already served, since the engine performs the landing redirect itself
(`src/lib/sveltekit/content-routes-core.ts:724`, `roleHome(runtime.roles, editor.role)`).
The vocabulary is the site's own committed declaration, so this is a getter over the site's
own data. "The hand-roll is small" is the gate's own failure clause. Unexport from `.`;
keep internal to `roles.ts`. Its two co-documented siblings both earn their place
independently (`resolveCapability`: fail-closed policy plus two importers;
`ownerLevelRoles`: the last-owner guard's counting set plus two importers), so the rule
"export the readers whose policy a site cannot restate" cleanly keeps two and drops one.

## Verdicts that stand, with corrections to their stated evidence

- **1 `StandardSchemaV1` (retire) — stands, strengthened.** Confirmed the export rule does
  not close over it: `Fieldset` renders its `~standard` shape *inlined* and names the
  **unexported** helper `StandardResult` (`docs/internal/api-surface.md:54`). Additional
  ground the ranking missed: cairn's copy *narrows* the real spec (its `validate` returns a
  sync result only, where standardschema.dev permits `Result | Promise<Result>`), so the two
  are not interchangeable in the assignment direction. Publishing a narrowed copy under the
  spec's own name is worse than not publishing it.
- **8 `StandardInput` (keep) — stands, strengthened.** Unlike its companion it *is* named in
  the rendered public shape (`readonly types?: { readonly input: StandardInput ... }`,
  api-surface.md:54), and `fieldset.ts:478` swallows a wrong shape into empty defaults as
  claimed. The asymmetry between ranks 1 and 8 is correct.
- **3 `AuthBranding` (reshape) — stands.** Verified no root-public signature names it: its
  only readers are `buildMagicLinkMessage` (demoted 2026-07-01) and `/sveltekit`'s
  `AuthRoutesConfig.branding` (api-surface.md:517). ASC's `admin-club/lib/club-email.ts:13`
  names it in a comment about what the root exports and then does not import it, which is
  the decorative-export tell, not a counter-example.
- **4 `PublishActionsConfig` (reshape) — stands.** Confirmed a bare `type X = Y[]`
  (`src/lib/sveltekit/publish-actions.ts:23`). Tension considered and rejected: the adapter's
  `editor` block otherwise reads `PreviewConfig`/`NavMenuConfig`, but those are option
  *objects*; `NavLayout` already breaks the `*Config` convention for an array, so the even
  rule is "an option object gets a `*Config` name", which an entry array is not.
- **65 `PreviewConfig` (keep) — stands; provenance claim is false.** "Built family consumer:
  907-life declares `byConcept`" does not hold: **no** family repo declares `byConcept`, and
  907-life's config carries the comment *"Posts is the only concept, so no byConcept."*
  (`907-life/src/theme/cairn.config.ts:93`). The keep is stronger than claimed anyway: four
  sites declare `preview:`, and chrome isolation is verified in the source doc comment.
- **68 `VocabularyEntry` / 100 `extractVocabulary` (keep) — stand; cited evidence is
  misapplied.** The harvest passage about two ports hand-rolling `capitalizeTag` closes
  with *"Not an engine gap (nothing to land) ... the finding is for the theme-building
  tutorial"* (`docs/internal/pre-beta-harvest.md:490`). By this audit's own gate that is a
  discoverability problem an export would not fix. Both keeps hold on other grounds:
  `extractVocabulary` on nine measured call sites across five repos, `VocabularyEntry` on
  closure from it and from `SiteConfig.vocabulary`.
- **9 `RoutingRule` (keep) — stands; "demoted twice" overstates.** The 2026-07-01 verdicts
  doc reads `KEEP RoutingRule` (line 133); only Task 5 demoted it. One demotion, not two.
- **16 `EmailAttachment` (keep) — stands on closure, with a flagged defect one level up.**
  `MagicLinkMessage` carries `cc`/`bcc`/`replyTo`/`attachments` that cairn itself never
  sets; the widening served a site's *own* mail, which the charter assigns to the developer.
  The arm cannot be pulled while the member stands, so the question belongs to
  `MagicLinkMessage` (rank 87), outside this set.
- **19 `NavLayoutEntry` / 18 `NavLayoutEngineRef` (keep) — stand; an evenness wart found.**
  The 27-value icon union is carried by `NavIcon` (`admin-nav.ts:49`), which is exported
  from `/sveltekit` but **not** from `.` (api-surface.md:616 vs the root section). That is
  the actual cause of the "collision" flag: the union renders alias-resolved on one subpath
  and expanded on the other, hence the rotation. The keeps hold (the union reaches a
  consumer inline through the interface), but the root cannot name the icon type alone.
- **24-30 the seven `FieldDescriptor` arms (keep) — stand; per-arm scenarios are
  decorative.** Verified each arm's quoted constraint against `docs/reference/core.md:395-409`
  (datetime `min`/`max` unenforced, boolean unset normalization, icon "none", number
  `integer`, textarea `rows`) — all accurate. But the per-arm annotation stories
  (`contactEmail()`, a "description" convention) are thin. The uniform real case, which the
  ranking does not state, is that without the arms a per-`kind` handler in a site's own form
  renderer must be typed `Extract<FieldDescriptor, { kind: 'number' }>`. Same argument for
  all fifteen, which is exactly why the closed-set evenness verdict is right.
- **63 `ConceptDescriptor` (keep) — stands.** The "engine-internal" label is live in **both**
  the reference (`core.md:1036`) and the source doc comment (`content/types.ts:328`). Closure
  from root-public `CairnRuntime.concepts` decides it; the doc correction is owed in the
  same pass.

## Verdicts that stand as argued (unremarkable)

Closure verified in the built surface for every type keep in this set:
`ConceptConfig.datePrefix → DatePrefix`; `FieldsetOptions.behavior → BehaviorTable →
FieldBehavior`; `ManifestEntry.references → ReferenceEdge`; `SiteConfig.tidy → TidyConfig →
TidyConventions`; `ComponentDef.slots → SlotDef` (single declaration, `registry.ts:17`);
`CairnAdapter.aiPosture → AiPosture`; `ConceptDescriptor.fields → NamedField`;
`composeRuntime → ComposeInput`; `createRenderer → Renderer → ResolveOptions, DocHeading`;
`Editor.capability / resolveCapability → Capability`; `RolesDeclaration → RoleDeclaration`;
`CairnAdapter.editor.navLayout → NavLayout → its three arms`;
`editor.publishActions → PublishActionEntry`.

Import ground truth re-measured and confirming the ranking: `AccessMap` + `RolesDeclaration`
(ASC access.ts:38), `ImageValue` (ASC post-cards.ts:9 and its test), `ownerLevelRoles`
(xcathletes roster-admin.ts:12, ASC roles-vocabulary.test.ts:2), `resolveCapability` (ASC
_editor.ts:6, roles-vocabulary.test.ts:2), `canReach` (ASC access.test.ts:2,
roles-matrix.test.ts:2), `defineAccess` (ASC theme/access.ts, xcathletes cairn.access.ts),
`defineRoles` (ASC cairn.config.ts, xcathletes cairn.roles.ts), `DocHeading` (cairn-pub
loader.ts:13, types.ts:3), `EmailRecipient` (ecxc email-transport.ts:5), `extractVocabulary`
(nine call sites, five repos). `RendererOptions`' absorbed-divergence claim verified verbatim
at `docs/internal/pre-beta-harvest.md:398-406`. `hasAccessRule`'s non-restatable
deepest-path-segment-prefix matching, with the dynamic-segment ambiguity refusal, verified in
`matchHrefKey` (`access.ts`), which is internal, and `canReach` alone cannot distinguish
"no rule" from "allowed" — the decisive point, and it holds.

---

# Fresh-context verification — adapter / concept model (51 items)

Read 2026-08-26 against `main`. Ground truth: `src/lib`, `dist/**/*.d.ts` (emitted declarations),
`docs/reference/core.md`, and named-import greps across all six family artifacts.

## Verdicts that do NOT stand

**rank 21 `roleHome` — keep → RETIRE.** The ranking's decisive reason is factually false: it says
"a hand-roll crashes on `.home` of a string." In JS, `('owner').home` evaluates to `undefined`; it
does not throw. `roleHome` (`src/lib/auth/roles.ts:94-102`) is one ternary over the exported
`RoleDeclaration` union, and the engine already owns the whole landing policy at
`content-routes-core.ts:721-735`, where `roleHome` is only the first of three branches (home →
first reachable concept → welcome). A site copying just `roleHome` would not have the policy
anyway. Zero family importers. This is the same category the same ranking retires at rank 2
(`DEFAULT_ROLES`): data a site can write, not policy it cannot restate. Retiring both leaves the
roles surface MORE even, not less — the retained set (`defineRoles`, `resolveCapability`,
`ownerLevelRoles`, `canReach`, `hasAccessRule`) is exactly the set carrying engine policy.

## Corrections that do not flip a verdict

1. **rank 1 `StandardSchemaV1` — decisive evidence is wrong; verdict survives on its other leg.**
   The argument claims declaration emit "inlines" `StandardSchemaV1<StandardInput, …>['~standard']`.
   It does not: `dist/content/fieldset.d.ts:3` imports the name and `:39` renders the indexed access
   verbatim. So the export rule DOES close over it from root-public `Fieldset`. Retire still holds on
   the surviving ground (a verbatim vendored copy of a third party's spec, available from
   `@standard-schema/spec`, conformance being structural), but the reshapeNote is incomplete:
   executing it requires restating the `~standard` member inline on `Fieldset`, not just deleting a
   line from the barrel.

2. **The C2 closure is NOT mechanically complete, contra standing finding #1.** Three live leaks
   found from the root barrel: `NavLayoutEntry.icon` names `NavIcon` and `NavLayoutEngineRef.screen`
   names `EngineScreenId` (`admin-nav.ts:50, 104`), both exported from `/sveltekit` only
   (`sveltekit/index.ts:75,77`) while their holders are root-exported; and `SlotDef.kind` names
   `SlotKind` (`registry.ts:11`), exported from nowhere. The closure claim is the sole ground the
   ranking gives for keeping ~22 low-ranked names, so it should not be stated as settled.

3. **rank 19 `NavLayoutEntry`'s stated reason is the wrong type.** The 27-value icon allowlist is
   supplied by `NavIcon`, not by `NavLayoutEntry`. The keep survives on the cannot-patch limb
   (engine-rendered sidebar) and on `CairnAdapter.editor.navLayout` closure.

4. **The fifteen field arms are stronger than "closure doctrine."** `fields.text` is typed
   `<const O extends Omit<TextField,'type'>>(o: O): TextField & O` (`fields.ts:147`), so ANY consumer
   that exports a field constant under `declaration: true` emits the arm name. Unexporting produces
   TS4023 ("cannot be named") for an anonymous consumer, with no family knowledge involved. This is a
   mechanical any-site case the ranking never made; all seven arms verified here keep on it.

5. **rank 46 `ResolveOptions` and rank 57 `DocHeading` are mechanically required too.**
   `createRenderer` has no explicit return annotation, so its emitted signature
   (`dist/render/pipeline.d.ts:69-78`) spells `ResolveOptions` and `DocHeading` inline. A consumer
   exporting a composed renderer names both. "One refactor away from real" understates it.

6. **rank 45 `Renderer` shape wart.** `Renderer = ReturnType<typeof createRenderer>`
   (`pipeline.ts:183`), and because `createRenderer` carries no return annotation the emitted
   signature never references `Renderer`. `core.md:550`'s prose is accurate; the surface is not as
   tidy as the prose implies.

7. **Consumer-count corrections.** `AiPosture`: only `xcathletes-org` declares `aiPosture`
   (`cairn.config.ts:566`); the showcase carries it as a COMMENT only (`:458-460`). `PreviewConfig`:
   the "907-life declares byConcept" claim is false — 907-life's config says "Posts is the only
   concept, so no byConcept" (`:93`); the keep is nonetheless STRONGER than argued, since all six
   family configs declare `preview:`. `NavLayout*`: four declarers (ASC, xcathletes, cairn-pub,
   showcase), not two — and ASC imports `NavLayout` from `/sveltekit`, not root, so the root export
   rests entirely on `CairnAdapter.editor.navLayout` (`content/types.ts:303`).

8. **rank 8 `StandardInput` loses its closure cover if rank 1 executes.** Its only root-public namer
   is the same `Fieldset['~standard']` annotation. It keeps on its own merit — the silent-swallow at
   `fieldset.ts:478` (`(value ?? {}) as Partial<StandardInput>`) is verified — but it becomes a naked
   export the moment `StandardSchemaV1` goes, which the reshape notes should say.

9. **rank 4 `PublishActionsConfig` reshape is right and under-scoped.** `publish-actions.ts:23`
   is the `X[]` alias; `:29` is a SECOND redundant alias (`ResolvedPublishAction = PublishActionEntry`),
   the identical defect on `/sveltekit`. Retiring one and leaving the other is the evenness cost the
   audit exists to catch.

10. **rank 23 `hasAccessRule` is stronger than argued.** Beyond deepest-prefix matching, `access.ts:92-99`
    documents a dynamic-segment rule (a matched prefix whose next target segment is `[id]`) that no
    object lookup reproduces. Keep is comfortable.

11. **rank 63 `ConceptDescriptor`.** Confirmed `core.md:1036` still labels it "engine-internal"
    while exporting it. The ranking's call (the label is the defect) is right; the doc fix is owed
    and unbooked.
