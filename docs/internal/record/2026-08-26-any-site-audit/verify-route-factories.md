# Fresh-context verification — route factories (`/sveltekit`)

Repo `main` @ HEAD. 83 items tested against the stated gate. 13 verdicts do not stand.

## Facts established first (they decide several items at once)

1. **All five factory returns are already `ReturnType<typeof …>`.** `auth-routes.ts:241`,
   `editors-routes.ts:162`, `nav-routes.ts` (tail), `content-routes.ts` (tail), `cairn-admin.ts:346`.
   There is **no hand-maintained interface and no idiom drift**. The reshape verdicts on ranks 66,
   69, 72 and 78 rest on a factual claim the code contradicts.
2. **The engine's own components import the declaring modules directly, not the barrel** (13 hits:
   `CairnAdmin.svelte`, `ConceptList.svelte`, `CairnMediaLibrary.svelte`, …), and every publicly
   exported component's `form` prop is the merged `ContentFormFailure`, never an arm
   (`CairnMediaLibrary.svelte:109-117`). The mass-retire of the failure arms is safe and correct.
3. **The public components' `data` props for the auth screens do not use the exported types at all.**
   `LoginPage.svelte:22` declares an inline `{ siteName; error; csrf; theme? }` — a superset of
   `LoginData`, which has no `theme`. Same for `ConfirmPage.svelte:17` and `ManageEditors.svelte:23`.
   Ranks 50–52 are already drifting from the components they nominally describe.
4. **`validateNavLayout` already runs on every declared layout at composition**
   (`content-routes-context.ts:280-287`), literal or dynamically built.
5. **`PreviewBanner`'s documented prop is `PreviewData['preview']`** (components.md:773) — the engine
   itself uses indexed access rather than a named member type, corroborating the ranking's
   `ListData['entries'][number]` reasoning for the element types.

---

## Ranks 1–13 — media-janitorial closure (`OrphanByteRow` … `MediaBulkDeleteResult`)

**All retires stand.** Verified each is reachable only by property access off an owner-only
maintenance action's result, and that `CairnMediaLibrary.svelte`'s only props are
`data: MediaLibraryData` and `form?: ContentFormFailure`. The types it imports beyond those
(`MediaReplacePreviewPlan`, `MediaBulkDeleteResult`, `BulkDeleteSkip`, …) type its internal
`deserialize()` calls, not its surface. Several also do not even live in
`content-routes-media.ts`: `MediaOrphanScanResult` is `media/orphan-scan.ts`, `BulkDeleteSkip` is
`media/bulk-delete-plan.ts`, `AltPlacement` is `content/media-rewrite.ts`, `UsageEntry` is
`media/usage.ts` — a provenance imprecision in the ranking that does not move any verdict, since
none of those homes is a public subpath either. `BranchRef` and `UsageEntry.origin` do leak
`cairn/<concept>/<id>` as claimed.

## Ranks 14–30 — `DictionaryAddResult`, tidy, and the failure arms

**All retires stand.** Six exported names for `{ error: string }` confirmed. `TidyKeyProbeResult`
reaches the barrel from `./tidy-key-health.js`, not `tidy-key-probe.ts` (ranking imprecision, no
verdict change). `TidyResult` does pin `usage.input_tokens`/`output_tokens`. `SaveFailure` and
`DeleteRefusal` are richer but still arrive through `ContentFormFailure`; `DeleteDialog`'s props
take `inboundLinks` and `inboundKind` as separate fields, never `DeleteRefusal` itself.

## Rank 31 `ContentFormFailure` — **reshape stands**

Verified `Partial<SaveFailure & … & TidyFailure>` (eleven-way) in `content-routes.ts`, and the
worked example at components.md:204. It genuinely cannot survive its arms' retirement as written.

## Rank 32 `RevertFailure` — **reshape stands**

The two self-admitted wrong names verified verbatim (`types.ts:130-135`, `:169-173`, both closing
"the field keeps its name for API stability"). Membership is stronger than the ranking allows:
`CairnHistory.svelte:33` declares `form?: RevertFailure | { error: string } | null`, and
`CairnHistory` is publicly exported, so a site mounting it writes the name.

## Rank 33 `TidyClient` — **reshape stands**

`content-routes-context.ts:32-67` transcribes `max_tokens`, `output_config.effort`, `stop_reason`,
`usage.input_tokens`. Its own comment calls it "a consumer contract". A vendor rename is a cairn
break. The narrow-interface reshape does not cost the injectable-fake property (the engine wraps).

## Ranks 34–37, 39–46 — element and projection types

**All retires stand.** `FragmentPicker` (which names `FragmentTarget`) is **not** in the
`/components` barrel. `EntrySummary` is internal to `ConceptList`, not a prop. `MediaLibraryEntry`
does appear in a documented public prop (`MarkdownEditor.mediaLibrary`), but that prop sits in the
explicitly-Unstable wiring table that tells a site to expect it to move — not a contract.
`GettingStarted`'s hard-coded `total: 3` and `AdvisoryNotice.severity: 'warn'` confirmed.

## Rank 47 `InboundLink` — **retire does NOT stand → keep**

`DeleteDialog` **is** publicly exported (`components/index.ts`), and its documented prop signature
is `inboundLinks: InboundLink[]` (components.md:690), for exactly the audience components.md names:
"a site that builds its own per-route admin surface". `InboundLink` is exported from no other public
subpath (checked root, `/delivery/data`), so retiring it makes a public component's documented prop
unnameable — the same defect that earned `ContentFormFailure` its keep.

## Ranks 48, 49 — `LinkTarget`, `ResolvedPreview` — **retires stand**

`LinkTarget` appears only in `LinkPicker`, `FieldInput`, `EntryPicker`, `FragmentPicker` — none in
the barrel. `ResolvedPreview` appears only in `ComponentInsertDialog` (also unexported) and
`preview-doc.ts`. Root deliberately does not export `ResolvedPreview` despite exporting
`CairnRuntime`, so retiring it from `/sveltekit` restores consistency rather than breaking it.

## Ranks 50–52 `ConfirmData` / `LoginData` / `EditorsData` — **retires stand, strengthened**

See fact 3. `LoginData` already lacks the `theme` field the real `LoginPage` prop carries.

## Rank 54 `WelcomeData` — **keep stands (weak)**

`WelcomeView` is exported and components.md:579-581 shows the literal
`import type { WelcomeData } from '@glw907/cairn-cms/sveltekit'`. Note the tier disagreement:
components.md grades `WelcomeView` Unstable while sveltekit.md grades `WelcomeData` Extension.

## Rank 62 `PublishActionLink` — **keep does NOT stand → retire**

`publish-actions.ts` exports three types; the site-written half is `PublishActionEntry` /
`PublishActionsConfig` (the adapter's `editor.publishActions`). `PublishActionLink` is only the
**resolved** form, produced by the unexported `resolvePublishActions` and read off
`EditData.publishActions`. The reference itself says "The edit page renders them"
(sveltekit.md:1837). No worked example imports the name. This is the identical position as
`FragmentTarget` (rank 34, retired) and `UsageEntry` (rank 36, retired): an `EditData` member's
element type reached by property access. The seam survives intact without it.

## Ranks 66, 69, 72, 78 — `AuthRoutes`, `EditorRoutes`, `NavRoutes`, `CairnAdminRoutes`

**All four reshapes do NOT stand → keep.** See fact 1. The stated defect ("a hand-written interface
duplicating the factory's real return, so the two can drift", "pick one idiom for all five") does
not exist: every one of the five is already `ReturnType<typeof …>`, the single idiom the reshape
asks for. Membership was already conceded by the ranking ("a factory's return should be nameable"),
so with the form objection refuted the verdict is keep, unchanged.

## Rank 74 `ContentRoutes` — **reshape stands**

The 30-key return verified. The facade (`cairn-admin.ts:300-328`) is the only caller of the
janitorial actions, so narrowing the exported type while `createContentRoutes` still returns the
full object is feasible, and it is the change that lets ranks 1–13 retire under R4 rather than
against it. One correction: the note says the admin components "already import [the actions]
directly" — they import **types** directly and post to `?/mediaBulkDelete` by form action. The
reshape is unaffected; the facade holds the internal type.

## Rank 38 `UploadResult` — **reshape does NOT stand → retire**

The proposed home is wrong. `media/index.ts`'s own header restricts `/media` to "the proven site
surface … node-safe pure projection", and explicitly excludes "the manifest CRUD … the engine's own
ingest/admin internals". `UploadResult` is an admin action's response bag — precisely what that
charter keeps off `/media`. The established convention runs the other way: `createMediaRoute` and
`CairnMediaBindings` live on `/sveltekit` *despite* being media vocabulary, with the reason recorded
in the barrel. Membership then has to carry the item alone, and it cannot: Unstable API, no worked
example names it, consumed in-process by `components/media-upload-outcome.ts` — the same shape as
`MediaBulkDeleteResult` and `MediaOrphanPurgeResult`, both retired. Evenness says they go together.

## Rank 100 `MediaEntry` — **reshape stands** (and is cleaner once rank 38 retires)

`UploadResult.record: MediaEntry` is `MediaEntry`'s only `/sveltekit` closure path. `/media` already
exports it (`media/index.ts`). Dropping the `/sveltekit` re-export then follows R4 rather than
fighting it.

## Rank 99 `SlotDef` — **reshape does NOT stand → keep**

`SlotDef` reaches `/sveltekit` as the R4 closure of `CairnRuntime`'s body, and `CairnRuntime` is a
`/sveltekit` export because every factory takes it. The proposed fix ("one canonical home, other
subpaths document where to import it from") would leave a site importing only from `/sveltekit`
unable to name a member of a type it holds — the exact condition R4 was ratified to remove. The
barrel treats deliberate closure re-export as the rule, with the reason written down each time
("Re-exported here, not just from root, so the app.d.ts Platform block can name it"). Substantive
audit still belongs to the render/registry bucket.

## Rank 101 `EmailAttachment` — **reshape does NOT stand → keep**

It is published from exactly two barrels, root and `/sveltekit`, which are exactly the two barrels
that publish `MagicLinkMessage` (`index.ts:21`, `sveltekit/index.ts:123`), whose `attachments?:
EmailAttachment[]` names it (`email.ts:27`). That is coherent closure, not a duplicate home. The
proposed fix would require moving `MagicLinkMessage`/`SendMagicLink` too, which `AuthRoutesConfig`
depends on. Compare rank 117 `RateLimitLike`, where the ranking accepted the identical pattern as
"an evenness cost … not a membership problem" — the two items must be judged the same way.

## Ranks 80, 81 — `AttentionItem`, `EngineScreenId` — **keeps stand**

`AttentionItem` `{ href; count; label? }` is the return type of a callback the **site authors**
(`ContentRoutesOptions.attention`), the same category as `ResolvedLayoutNode`; the engine drops
items whose href matches no visible nav entry, so the count cannot leak. `EngineScreenId` is
`NavLayoutEngineRef`'s member in a tree the site **writes**, which distinguishes it from the read-
payload element types retired at ranks 34–44; the `(string & {})` tail means it gates nothing, so
the keep is documentary, which is the standing objection the ranking already records.

## Ranks 82, 83, 84 — the nav resolver/validator — **all three reshapes do NOT stand → retire**

- **84 `validateNavLayout`:** the stated any-site case is false. `createContentRoutesContext`
  (`content-routes-context.ts:280-287`) already calls it on `runtime.navLayout` at composition,
  literal or dynamically built, and its thrown error already names the bad node. A site calling it
  by hand first buys nothing, and must re-derive `conceptIds`, `navMenuConfigured` and `roleNames`
  exactly as the engine does. That is a discoverability problem an export does not fix.
- **83 `resolveNavLayout`:** every caller is the engine (`content-routes-core.ts:606` in
  `shellLoad`); no doc worked example calls it. The ranking's own any-site case is "weak" and names
  cairn's real answer (`navFilter` + `AdminShellData.nav`). The proposed replacement — "a narrow,
  purpose-named function that validates and previews a navLayout" — is a **new export that does not
  exist**, half-duplicating rank 84. Inventing surface to justify surface fails the leanness rule.
- **82 `ResolveNavLayoutOptions`:** falls with 83. Its independent charge is also weaker than
  stated: a structural stand-in for the caller's own richer type is the engine's own documented
  convention (`CairnEvent`, `CookieJar`, `PlatformContext`, all kept and praised), and here it lets
  a caller pass `{ id, label }` literals instead of materializing full `ConceptDescriptor`s with
  `fields`, `schema` and `validate`.

## Rank 97 `mintPreviewToken` — **reshape stands**

The unguarded contract is verified (`preview.ts:1-8`), and the reference sanctions the direct call
for "a custom mint action" (sveltekit.md:1285), so membership holds. But an export whose signature
`(db, config, record)` carries a silent authorization obligation sits unmarked beside `previewLoad`,
whose contract is safe by construction. The name-or-signature fix is the right, cheap form.

## Rank 102 `CookieSetOptions` — **keep stands (weak)**

`CookieJar.set`'s parameter type; a site constructing a `CairnEvent` double satisfies it by
inference, so the name is rarely written. It survives on R4 closure of a type sites do construct,
which is the same ground rank 99 stands on.

## Ranks 108–113 — the `adminAction` family

- **108 `AdminActionOptions` — reshape does NOT stand → retire.** The ranking's own any-site case is
  "Essentially none", and the code agrees: `/** … every real caller takes the default */`
  (`admin-action.ts`). Reshape presupposes membership and asks only about form; an item with no
  membership fails the gate before form is reached. The note's own first branch ("fold the flag into
  the function's testing surface") *is* retirement from the public surface. Name it that.
- **109 `UnauditedActionError` — keep stands.** Exporting the class is what lets a site's own test
  assert on the dev-only signal rather than on a message string; that test is a realistic thing for
  any site with its own admin screens to write.
- **110–113 `AdminActionAudit` / `AuditRecord` / `Context` / `AuditSink` — keeps stand.** The
  four-field vocabulary (verb, entity, id, detail) carries no ASC domain; `AdminActionAuditRecord`'s
  split of `actor` out of the emit shape stops a handler forging an actor and the wrapper sets it
  from the verified editor (verified in `adminAction`'s `ctx.audit`); `AdminActionAuditSink` is the
  seam a site wires in `hooks.server.ts`, and the fail-open contract is implemented, not merely
  promised (the `then`-detection branch catches a rejecting async sink).

## Ranks 114–118, 120 — the section-action family — **keeps stand**

Family-originated with **no built consumer**, so tested hardest. The forcing fact is SvelteKit's,
not ASC's, and is verifiable in the module header: a matched form action never re-runs an ancestor
`load`, so the page looks gated and the POST is not. Any site adding one custom admin screen with
one form hits it. The config holds only `resolveDb` and an optional limiter; `target` exists because
"on a catch-all route the pathname is attacker-chosen while the route id is not" — a framework
property, the strongest evidence the shape was re-derived rather than transplanted. Check ordering
(authorization before binding resolution) is implemented as documented.

Two corrections that do not move the verdicts: `SectionActionConfig`'s stated any-site case ("must
name it to annotate `Env`") is not how the reference's own example does it — the example passes
explicit type arguments `createSectionAction<App.Platform['env'], D1Database>` and annotates
`resolveDb`'s parameter, never writing `SectionActionConfig`. Both it and `SectionActionOptions`
survive on R4 closure of a kept public function, not on the naming test. `SectionActionAudit` is
the weakest of the six: `ctx.audit({ entityId: id })` is an inferred literal.

## Rank 117 `RateLimitLike` — **keep stands**

Published from `/cloudflare` (its home, beside `checkRateLimit`), `/auth-channel`, and `/sveltekit`,
each because that barrel's own signatures name it. Coherent closure, judged the same way as rank 101
above.

## Rank 119 `createD1AuditSink` — **keep stands**

Tested against the charter's "a thin seam, not a built-in feature", since it ships a schema
migration into the site's database — the one place cairn touches site data, and the strongest
counter available. It survives because the *correct* hand-roll is not small: code-point truncation
and lone-surrogate replacement exist so an attacker-chosen `detail` cannot suppress its own audit
row, and the four-stage failure reasons plus fail-open-through-`waitUntil` are the class of thing a
site gets wrong silently. Same reasoning that carries `createMediaRoute`'s XSS headers.

## Rank 121 `adminAction` — **keep stands**

The load-bearing part is honest and verified: the guard already does CSRF, so the value is resolving
`ctx.editor` and turning "we should audit admin changes" into a dev-time build failure, with the
`fail()` exemption keeping it from training authors to emit noise.

---

## Cross-cutting note

The ranking's two closing observations hold. A third belongs beside them: **the barrel's R4 closure
re-exports are a stated rule, not drift.** Ranks 99 and 101 charge that rule as a defect while ranks
102 and 117 accept it, and the barrel documents it each time it applies it. Either the rule is
repealed for the whole surface or it governs every item under it; it cannot be a defect in three
places and a justification in three others.
