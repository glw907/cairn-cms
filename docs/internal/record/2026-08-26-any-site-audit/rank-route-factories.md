# Route factories (`/sveltekit`) — retroactive any-site audit

130 items, ranked weakest-to-strongest anonymous-consumer case. Repo `main` @ HEAD.
Sources: `src/lib/sveltekit/*`, `docs/reference/sveltekit.md`, `docs/reference/admin-routes.md`,
`docs/reference/components.md`, the two 2026-08-01 consumer briefs, `engine-harvest-candidates.md`,
git history.

## The one fact that governs half this bucket

`src/lib/sveltekit/index.ts` carries its own provenance in a comment:

> "The export-rule sweep (C2 breaking-window pass, R4 ruling): every type a route factory's return
> type names, down to its own nested shapes, becomes importable from this subpath."

and the commit that did it, `a6b72e22`:

> "Adopt the export rule: name every type a public signature references … **Reverses the 2026-07-01
> surface-pruning verdict for 22 of those root re-additions**, recorded in root-barrel-prune.test.ts."

So a large block of this bucket was not asked for by any consumer, family or otherwise. It was
produced mechanically by a nameability rule applied to `ContentRoutes = ReturnType<typeof
createContentRoutes>`, whose action vocabulary includes every media-janitorial action the engine's
own admin components drive. A prior pass had already pruned 22 of them; R4 put them back.

Two facts make retiring those leaves cheap rather than destructive:

1. The engine's own consumers do not go through this barrel. `content-routes.ts`: *"every existing
   importer (the public `/sveltekit` barrel **and the admin components that import this file
   directly**) sees the same names at the same path."*
2. The engine's own stability table already grades almost every one of them **Unstable API**, while
   the seams a site really touches are **Extension API**. The tiering and this ranking agree
   closely, which is corroboration, not coincidence.

**The naming test used throughout.** Does an anonymous consumer plausibly *write this name* in its
own source — in a route file, a component prop annotation, a callback signature, or an `app.d.ts`?
A value reachable only by property access (`data.assets[0].hash`) is inferred by TypeScript and
needs no exported name. Evidence for "yes" is the docs' own worked examples: `admin-routes.md`'s
route files, `components.md`'s prop signatures, `sveltekit.md`'s seam snippets.

## Collision items (flagged `"collision": true` in the input)

`EmailAttachment`, `NavLayoutEngineRef`, `NavLayoutEntry`, `SlotDef`. **None is a genuine
collision.** Each has exactly one definition in `src/lib`:

- `EmailAttachment` — `src/lib/auth/types.ts:31`, re-exported from root and `/sveltekit`.
- `NavLayoutEntry` / `NavLayoutEngineRef` — `src/lib/sveltekit/admin-nav.ts:53` and `:116`,
  re-exported from root (`src/lib/index.ts:135`) and `/delivery/data` (`src/lib/delivery/data.ts:60`).
- `SlotDef` — `src/lib/render/registry.ts:17`, re-exported from root (`:99`) and `/delivery/data` (`:54`).

The differing signature the extractor reported is alias-expansion depth at different barrels, not
two types. The real finding underneath is an **evenness** one: the same symbol is published from
three or four subpaths, so a developer has three importable names for one thing and no rule says
which is canonical. That is a whole-surface property, not a per-item defect, and it is recorded here
rather than charged against any one item's verdict.

---

## Rank 1. `OrphanByteRow`
- surfacedAt: `/sveltekit` · Stability: Unstable API
- **Provenance:** engine-internal. Added by `a6b72e22` ("Adopt the export rule…"). No brief, no site
  ask. Body is `{ key: string; hash: string }` — an R2 object key paired with its content hash.
- **Anonymous consumer:** none conceivable. The value exists only inside
  `mediaOrphanScanAction`'s result, which the engine's own `CairnMediaLibrary` renders. A site never
  calls the janitorial action and never writes this name.
- **Verdict: retire.** The weakest item in the bucket: an internal row shape published because a
  closure rule walked into it. Nothing a site can legally reach is at stake; the type stays declared,
  it just stops being exported. Counter-argument considered: R4 nameability. It does not survive
  fact (1) above — the engine's own components import the module directly.

## Rank 2. `BrokenRefRow`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** same `a6b72e22` closure sweep; `{ hash; slug; usage: UsageEntry[] }`, one row of
  the orphan scan's "referenced but absent" half.
- **Anonymous consumer:** none. Reachable only as `result.brokenRefs[i]`.
- **Verdict: retire.** Same reasoning as rank 1. Argued the other way: it is the one janitorial row
  a site *could* want if it built an out-of-band integrity report — but that site would read the
  media manifest through `/media`, not drive an admin action.

## Rank 3. `BulkDeleteSkip`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`. `{ hash; reason: 'still-referenced' | 'uncommitted'; usage }`.
- **Anonymous consumer:** none. The two `reason` literals are the engine's own refusal vocabulary
  for its own bulk-delete UI.
- **Verdict: retire.** Publishing an engine-internal refusal enum invites a site to switch on it,
  which would make a UI copy change a breaking change.

## Rank 4. `RepointPlacement`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`, closing over `MediaReplacePreviewEntry`. `{ kind; before; after }`.
- **Anonymous consumer:** none. A diff row inside the replace-preview modal.
- **Verdict: retire.**

## Rank 5. `AltPlacement`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`; the alt-propagation twin of rank 4, with an added
  `bucket: 'will-fill' | 'customized' | 'decorative-skipped'`.
- **Anonymous consumer:** none. Those three buckets are copy decisions in one engine modal.
- **Verdict: retire.** Note the two near-identical shapes (ranks 4 and 5) differing by one field:
  publishing both is an evenness cost as well as a membership one.

## Rank 6. `BranchRef`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `git log -S BranchRef` bottoms out in the media Pass B work (`3ca2a98a`, "Land
  media Pass B: replace-in-place and alt propagation"); exported by `a6b72e22`.
- **Anonymous consumer:** none. `{ branch; entries }` describes which `cairn/<concept>/<id>` branches
  a propagation would touch — an engine implementation detail (branch naming is not public grammar).
- **Verdict: retire.** Exporting it leaks the pending-branch layout into the public surface.

## Rank 7. `MediaOrphanScanResult`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22` ("Adopt the export rule"), preceded by `3dde3676` ("Rename the type-table
  bags and factory returns for the C2 grammar") — i.e. it was renamed for grammar before it had a
  consumer.
- **Anonymous consumer:** none. Returned by an owner-only maintenance action inside the engine's
  Media Library.
- **Verdict: retire.** The right form is for the janitorial actions to leave the public
  `ContentRoutes` type entirely; then this and ranks 1–13 fall out with it.

## Rank 8. `MediaOrphanPurgeResult`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`.
- **Anonymous consumer:** none. `{ purged; skippedClaimed; failed }` is the purge modal's result bag.
- **Verdict: retire.**

## Rank 9. `MediaAltPreviewEntry`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`.
- **Anonymous consumer:** none; a row inside rank 10's plan.
- **Verdict: retire.**

## Rank 10. `MediaAltPreviewPlan`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`.
- **Anonymous consumer:** none. The preview half of a two-step engine modal (preview, then apply).
- **Verdict: retire.**

## Rank 11. `MediaReplacePreviewEntry`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`.
- **Anonymous consumer:** none.
- **Verdict: retire.**

## Rank 12. `MediaReplacePreviewPlan`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`.
- **Anonymous consumer:** none. `{ affectedCount; entries; branchDelta }` — and `branchDelta` drags
  rank 6 into the public surface with it.
- **Verdict: retire.**

## Rank 13. `MediaBulkDeleteResult`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`.
- **Anonymous consumer:** none.
- **Verdict: retire.**

## Rank 14. `DictionaryAddResult`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`. Body is `{ words: string[] }`.
- **Anonymous consumer:** none. It is the spellcheck personal-dictionary action's echo, consumed by
  the editor component in the same process.
- **Verdict: retire.** A single-field wrapper over `string[]` is the clearest case in the bucket that
  the closure rule, not a need, produced the export.

## Rank 15. `TidyKeyProbeResult`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `tidy-key-probe.ts`, added with the tidy settings screen; exported for
  `SettingsData.keyStatus`'s closure.
- **Anonymous consumer:** none. `'valid' | 'invalid' | 'unknown'` describes an Anthropic key probe
  the engine runs for its own settings screen. Tidy is an engine feature, not a seam.
- **Verdict: retire.** A site reading `data.keyStatus` gets the literal union inferred.

## Rank 16. `TidyResult`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`.
- **Anonymous consumer:** none. `{ corrected; model; tokens }` is what `tidyAction` hands its own
  editor component.
- **Verdict: retire.** Publishing `tokens.input_tokens`/`output_tokens` also pins an Anthropic SDK
  field naming into cairn's public surface, which the charter's "thin seam" posture argues against.

## Rank 17. `MediaAltPropagateFailure`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`, as an arm of `ContentFormFailure`.
- **Anonymous consumer:** none directly. `components.md` shows the union (`ContentFormFailure`), never
  the arm.
- **Verdict: retire.** Keep the union (rank 31); the arms are closure.

## Rank 18. `MediaBulkFailure`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`. Body is `{ error: string }`.
- **Anonymous consumer:** none. It is structurally identical to five siblings in this bucket.
- **Verdict: retire.** Six distinct exported names for `{ error: string }` is an evenness defect on
  its own.

## Rank 19. `MediaUpdateFailure`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`. Mentioned once in `components.md`, inside the `ContentFormFailure`
  prose, never as a prop type.
- **Anonymous consumer:** none. A site mounting `CairnMediaLibrary` types `form?: ContentFormFailure
  | null`, which is the union, not this arm.
- **Verdict: retire.**

## Rank 20. `MediaReplaceFailure`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`.
- **Anonymous consumer:** none, same as rank 19.
- **Verdict: retire.**

## Rank 21. `MediaDeleteRefusal`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`. One `components.md` mention, again inside the union's prose.
- **Anonymous consumer:** none. `{ error; hash; usage; foundIn }` is the engine's own "still
  referenced" refusal, rendered by the engine's own dialog.
- **Verdict: retire.**

## Rank 22. `MediaUploadFailure`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`. `{ error: string }` again.
- **Anonymous consumer:** none.
- **Verdict: retire.**

## Rank 23. `VocabularySaveFailure`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`, closing over `vocabularySaveAction`'s `ActionFailure`.
- **Anonymous consumer:** none. `{ error: string }`.
- **Verdict: retire.**

## Rank 24. `SettingsSaveFailure`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`. `{ error: string }`.
- **Anonymous consumer:** none.
- **Verdict: retire.**

## Rank 25. `NavSaveFailure`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** exported alongside `createNavRoutes`; `nav-routes.ts` documents it as "*A refused
  nav save: `fail(400)` on an invalid posted tree, `fail(409)` when the config's head moved*".
- **Anonymous consumer:** none. `{ error: string }`, and the nav editor is an engine screen.
- **Verdict: retire.** Argued the other way: a site hand-mounting `/admin/nav` would want to type the
  action's failure — but the doc's own worked example passes `data: NavLoadData` and lets kit's
  `ActionData` type the form.

## Rank 26. `RenameFailure`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `content-routes-core.ts`, exported as an arm of `ContentFormFailure`.
- **Anonymous consumer:** none. `{ error: string }`.
- **Verdict: retire.**

## Rank 27. `CreateFailure`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** same as rank 26. `{ error: string }`.
- **Anonymous consumer:** none.
- **Verdict: retire.**

## Rank 28. `PreviewMintFailure`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** same. `{ error: string }`.
- **Anonymous consumer:** none.
- **Verdict: retire.**

## Rank 29. `DeleteRefusal`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `content-routes-core.ts`; the inbound-link guard's refusal
  (`{ error; inboundLinks; inboundKind?; id }`).
- **Anonymous consumer:** none. It has more shape than its siblings, but it is still delivered to the
  engine's own delete dialog through the `form` prop as `ContentFormFailure`.
- **Verdict: retire.**

## Rank 30. `SaveFailure`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `content-routes-core.ts`; `{ error; brokenLinks; body }`, the broken-link save
  refusal that preserves the editor's draft body.
- **Anonymous consumer:** none by name. The strongest of the failure arms (a site *could* care that
  `body` round-trips), but the union is what the doc hands a component.
- **Verdict: retire.** Argued in both directions and it still fails the naming test.

## Rank 31. `ContentFormFailure`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** engine-internal, declared in `content-routes.ts` as
  `Partial<SaveFailure & DeleteRefusal & … & TidyFailure>`. It **is** named in a worked example:
  `components.md` line 204, `let { data, form }: { data: MediaLibraryData; form?: ContentFormFailure
  | null }`.
- **Anonymous consumer:** real. A site that mounts `CairnMediaLibrary` (or the entry editor) on its
  own concrete `/admin/` route must annotate the `form` prop, and this is the name the reference tells
  it to use.
- **Verdict: reshape.** Right membership, wrong form. Today it is a `Partial<>` over an eleven-way
  intersection of names ranks 17–30 retire, so it cannot survive their retirement as written, and its
  meaning ("whichever action last failed, every field optional") is not readable from the
  intersection. The right form is one flat declared interface with every field optional and each
  field documented against the action that sets it, with the eleven arms kept module-internal.

## Rank 32. `RevertFailure`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** engine-internal (`types.ts`), added with the history/revert feature.
- **Anonymous consumer:** thin but real. A discriminated `reason` union is the one failure shape in
  this bucket a site would branch on if it rendered its own history screen against
  `CairnEntryHistory`'s data.
- **Verdict: reshape.** The doc-comment records its own defect twice: *"`startedAt` names the head
  commit's own date, which moves on every save, so it reads as the draft's LAST SAVE, not when
  editing began; **the field keeps its name for API stability**"* — and `draftStartedAt` repeats it.
  Churn is free until beta, so the stability plea does not license the wrong name. Right form: rename
  both fields to `lastSavedAt` and drop the compensating prose.

## Rank 33. `TidyClient`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** engine-internal test seam. `content-routes-context.ts`: *"Injected in tests so
  `messages.create` is stubbed and no network call (or real key) is ever needed."*
- **Anonymous consumer:** weak. A site that wants tidy pointed at a proxy or a gateway would supply
  its own client, which is a genuine (if rare) scenario.
- **Verdict: reshape.** Membership is defensible; the form is not. It transcribes the Anthropic SDK's
  wire shape (`max_tokens`, `output_config.effort`, `stop_reason`, `usage.input_tokens`) into cairn's
  public surface, so a vendor field rename becomes a cairn breaking change. Right form: a narrow
  engine-owned interface — take a prompt and a system string, return corrected text plus a coarse
  usage record — with the SDK adapter internal.

## Rank 34. `FragmentTarget`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`, as `EditData.fragmentTargets`' element.
- **Anonymous consumer:** none. `{ id; title; body }` feeds the editor's fragment picker; a site
  mounting `CairnEntryEditor` passes `data` whole.
- **Verdict: retire.** Inline it into `EditData`.

## Rank 35. `MediaLibraryEntry`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`, as `MediaLibraryData.assets`' element. One `components.md` mention.
- **Anonymous consumer:** weak. A site building its own asset browser is rebuilding a screen the
  engine ships; a site rendering one asset row reaches it through `data.assets[i]` with the type
  inferred.
- **Verdict: retire.** It also duplicates `MediaEntry` (rank 100) minus three fields, which is the
  evenness cost of publishing both.

## Rank 36. `UsageEntry`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22`. `{ concept; id; title; permalink?; origin }`.
- **Anonymous consumer:** none by name. It is reached through `usage[hash].entries`.
- **Verdict: retire.** Its `origin: { kind: 'published' } | { kind: 'branch'; branch: string }` member
  publishes the pending-branch model, same leak as rank 6.

## Rank 37. `MediaUsageInfo`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `content-routes-media.ts`, exported with `MediaLibraryData`.
- **Anonymous consumer:** none. `{ count; entries }` is a per-hash overlay the engine's own library
  renders.
- **Verdict: retire.** Its Extension-API tier is not earned; no seam takes or returns it.

## Rank 38. `UploadResult`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `uploadAction`'s return; documented as *"the `media:` reference the editor inserts,
  the server-owned manifest record, whether an identical asset was reused."*
- **Anonymous consumer:** thin. A site scripting an upload through the admin action could name it.
- **Verdict: reshape.** Membership is arguable; the *placement* is wrong. It is a media vocabulary
  word whose own body names `MediaEntry`, which lives at `/media`. Right form: declare it beside
  `MediaEntry` on `/media`, so a developer finds cairn's media types in one subpath instead of two.

## Rank 39. `NavPageOption`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `nav-routes.ts`, documented as *"One page option for the URL picker datalist."*
- **Anonymous consumer:** none. A datalist option inside one engine screen.
- **Verdict: retire.** "Datalist option" is a widget detail, not a contract.

## Rank 40. `NavConcept`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `content-routes-core.ts`; *"just enough to render the nav without shipping
  validators to the client."*
- **Anonymous consumer:** none. `{ id; label }` reached through `AdminShellData.concepts`. A site with
  nav ambitions uses the `navLayout` seam (ranks 81–93), not this projection.
- **Verdict: retire.**

## Rank 41. `GettingStarted`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `content/getting-started.ts`, re-exported here for `HelpData`'s closure.
- **Anonymous consumer:** none. `{ wrotePost; publishedPost; createdPage; doneCount; total: 3 }` is
  cairn's own onboarding checklist, with the literal `3` in the type.
- **Verdict: retire.** A hard-coded `total: 3` is the tell that this is engine copy, not a contract.

## Rank 42. `MarkdownReferenceRow`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `components/markdown-reference.ts`, re-exported for `HelpData`.
- **Anonymous consumer:** none. `{ syntax; makes; group }` is a cheat-sheet row the engine authors
  and renders.
- **Verdict: retire.**

## Rank 43. `HistoryEntry`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `types.ts`, with the history screen.
- **Anonymous consumer:** none by name; reached as `data.entries[i]`.
- **Verdict: retire.** Inline into `HistoryData` (rank 58), which is kept.

## Rank 44. `EntrySummary`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `content-routes-core.ts`, `ListData.entries`' element.
- **Anonymous consumer:** weak — a site rendering its own list row would map `data.entries` and get
  the element type inferred.
- **Verdict: retire.** Argued the other way: it is the most plausible element type in the bucket to
  name in a helper (`function badge(e: EntrySummary)`). That is a real scenario, but it is satisfied
  by `ListData['entries'][number]`, and the bar is not "someone might".

## Rank 45. `AdvisoryAction`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `15604d06` "feat: add the advisory-notice shape and the cross-branch address index"
  — engine-internal, for the editor's own warning region.
- **Anonymous consumer:** none. `{ label; href? }`.
- **Verdict: retire.**

## Rank 46. `AdvisoryNotice`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** same commit. `severity` is the single literal `'warn'`.
- **Anonymous consumer:** none. The engine both produces and renders every advisory; there is no seam
  for a site to contribute one.
- **Verdict: retire.** Argued the other way: a site-contributed advisory would be a plausible future
  seam, and this is the shape it would use. That is a reason to design the seam then, not to publish
  the type now — publishing it now advertises an extension point that does not exist.

## Rank 47. `InboundLink`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `content/manifest.ts`, re-exported here for `EditData`/`DeleteRefusal` closure.
- **Anonymous consumer:** none at `/sveltekit`. Its home is the content/manifest vocabulary.
- **Verdict: retire from this subpath.**

## Rank 48. `LinkTarget`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `content/manifest.ts`, same closure re-export.
- **Anonymous consumer:** none at `/sveltekit`.
- **Verdict: retire from this subpath.**

## Rank 49. `ResolvedPreview`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `content/types.ts`, re-exported for `EditData.preview`.
- **Anonymous consumer:** none. `{ stylesheets; bodyClass?; containerClass? }` is what the engine
  resolved *from* the site's own `preview` config; the site names the config type, not the resolution.
- **Verdict: retire from this subpath.**

## Rank 50. `ConfirmData`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `a6b72e22` named it: *"Names and exports three recurring anonymous load payloads
  (LoginData, ConfirmData, EditorsData), replacing the inline shapes createCairnAdmin's AdminData
  union used to carry."* Explicitly closure work, not a request.
- **Anonymous consumer:** none. The confirm page is engine-rendered; no `/components` example takes
  `ConfirmData`.
- **Verdict: retire.**

## Rank 51. `LoginData`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** same sentence of `a6b72e22`.
- **Anonymous consumer:** weak. A site rebranding the login page is plausible — but the engine's
  answer to that is `AuthRoutesConfig.branding`, not a hand-built login route.
- **Verdict: retire.**

## Rank 52. `EditorsData`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** same sentence of `a6b72e22`.
- **Anonymous consumer:** none. The editors roster is owner-only engine surface, and `components.md`
  never names this type.
- **Verdict: retire.**

## Rank 53. `HelpData`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal, but with a worked consumer example: `components.md` line 512,
  `let { data }: { data: HelpData }`.
- **Anonymous consumer:** a site that wants the markdown cheat-sheet on its own `/admin/help` route
  (or embedded in its own onboarding screen) mounts `CairnHelp` and annotates the prop with this name.
- **Verdict: keep.** Weakest keep in the bucket, and it survives only because the reference tells a
  developer to write the name. Its two member types (ranks 41, 42) do not survive with it.

## Rank 54. `WelcomeData`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal; `components.md` line 567 shows the prop annotation.
- **Anonymous consumer:** a site replacing the `/admin` landing screen with its own dashboard, while
  still rendering cairn's welcome block inside it, types the prop `WelcomeData`.
- **Verdict: keep.** `{ displayName; siteName }` is thin, and a keep here rests mostly on consistency
  with the other component-prop data types rather than on force.

## Rank 55. `VocabularyLoadData`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `content-routes-settings.ts`; named in `components.md` (3 mentions, including a
  prop annotation).
- **Anonymous consumer:** a site that puts tag management on its own route (beside its own taxonomy
  tooling) mounts the vocabulary screen and types `data`.
- **Verdict: keep.**

## Rank 56. `SettingsData`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `content-routes-settings.ts`; `components.md` line 486 prop annotation.
- **Anonymous consumer:** a site that folds cairn's tidy settings into its own combined settings page
  types the prop with this.
- **Verdict: keep.** Caveat carried to rank 15: its `keyStatus` member should inline rather than
  export a separate name.

## Rank 57. `NavLoadData`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `nav-routes.ts`; `components.md` line 460 prop annotation.
- **Anonymous consumer:** a site mounting the drag-to-reorder nav editor on its own route (common when
  a site's public menu is edited beside other site settings).
- **Verdict: keep.**

## Rank 58. `HistoryData`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `types.ts`; `components.md` line 340 prop annotation (4 mentions).
- **Anonymous consumer:** a site placing per-entry version history on its own screen types
  `data: HistoryData`.
- **Verdict: keep**, with rank 43 inlined into it and rank 32's field rename applied.

## Rank 59. `ListData`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `content-routes-core.ts`; `components.md` line 179/191 worked example imports it
  from `@glw907/cairn-cms/sveltekit` by name.
- **Anonymous consumer:** a site that mounts `CairnEntryList` at its own `/admin/posts` (to add a
  filter bar above it) annotates the prop with this exact import.
- **Verdict: keep.**

## Rank 60. `MediaLibraryData`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `content-routes-media.ts`; `components.md` line 204/229 worked example.
- **Anonymous consumer:** a site mounting `CairnMediaLibrary` on its own route, alongside its own
  non-image asset tooling, types `data` with this.
- **Verdict: keep.**

## Rank 61. `EditData`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `content-routes-core.ts`; `components.md` line 243 shows the prop as
  `EditData & { siteName: string }`, and line 321 imports the name.
- **Anonymous consumer:** a site that wraps the entry editor in its own route shell (a domain sidebar
  beside the editor) must name this type to declare the merged prop.
- **Verdict: keep.** The prop being `EditData & { siteName: string }` rather than a declared type is a
  small form wart worth noting, not enough to downgrade the verdict.

## Rank 62. `PublishActionLink`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `2ae22833` "feat(sveltekit): add the publish-actions seam". Family-shaped: the seam
  exists for ASC's Announce screen (the ASC brief's scope check mentions *"the publish-lifecycle gap
  behind ASC's Announce screen"*).
- **Anonymous consumer:** real and general. Any site with a post-publish workflow (send a newsletter,
  ping a channel, open an analytics page) declares `publishActions` and reads the resolved
  `{ label; href }` back on `EditData.publishActions`. The template-string design (`{concept}`, `{id}`
  substituted server-side) is deliberately callback-free, so it survives the publish redirect.
- **Verdict: keep.** Shape is right and site-agnostic: it is plain data with no ASC domain in it.

## Rank 63. `HealthData`
- surfacedAt: `/sveltekit` · Scaffold API (function tier)
- **Provenance:** engine-internal, from the original spec (§7.8) — `5edb3871` "feat(admin): healthz
  load via the App signing self-test".
- **Anonymous consumer:** an operator wiring `/admin/healthz` into an uptime check needs the payload
  shape to assert on. `{ ok; checks: { githubAppSigning } }`.
- **Verdict: keep.** Narrow, but it is the response contract of a route the site itself mounts, so the
  site legitimately names it.

## Rank 64. `healthLoad`
- surfacedAt: `/sveltekit` · Scaffold API
- **Provenance:** engine-internal, spec §7.8. Predates the rebuild (`d2ad1df4` "Pass ROBUST: … signing
  healthz").
- **Anonymous consumer:** concrete. A PKCS#1-to-PKCS#8 key conversion mistake is invisible until the
  first publish fails; every cairn site signs GitHub App JWTs, so every site benefits from a route that
  proves the key decodes before an editor discovers it.
- **Verdict: keep.** The signature is unusual — `(event, runtime)` rather than the closed-over factory
  shape every sibling uses — which is an evenness blemish, not a membership problem, and it reads
  fine at a route shim.

## Rank 65. `RequestResult`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `auth-routes.ts`, from the original magic-link spec.
- **Anonymous consumer:** a site rendering its own login form (the one auth screen a site most often
  rebrands beyond `branding`) branches on `form.status` to show "check your email", "try again", or
  "wait a moment". The doc-comment records that `sent` is retained *"for a site rendering its own form
  against `form.sent`"* — evidence a real consumer did exactly this.
- **Verdict: keep.** The membership-hiding design (neutral and send-ok both return
  `{ status: 'sent' }`) is a security property a site must not have to re-derive.

## Rank 66. `AuthRoutes`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** engine-internal; the named return of `createAuthRoutes`.
- **Anonymous consumer:** thin. A site hand-mounting auth holds the object; TypeScript infers it.
- **Verdict: reshape.** Right membership (a factory's return should be nameable), wrong form: it is a
  hand-maintained interface duplicating the factory's actual return, so the two can drift.
  `ContentRoutes` next door already uses `ReturnType<typeof createContentRoutes>`. Right form: pick one
  idiom for all four factory returns and apply it to all four.

## Rank 67. `AuthRoutesConfig`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** engine-internal, plus a later addition (`bootstrapOwner`) that removes a hand-run
  `wrangler d1 execute` INSERT.
- **Anonymous consumer:** any site declaring a config object in `cairn.server.ts` and annotating it, or
  supplying a custom `send` (a site on a non-Cloudflare mailer). `CairnAdminOptions.auth` is
  `Partial<AuthRoutesConfig>`, so the name is reachable from the recommended path too.
- **Verdict: keep.**

## Rank 68. `createAuthRoutes`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** engine-internal; one of the four original per-route factories.
- **Anonymous consumer:** a site that does not want cairn's catch-all owning `/admin/login` — because
  its login page must live at its own URL, or must render inside its own marketing shell — wires
  `loginLoad`/`requestAction`/`confirmLoad`/`confirmAction`/`logoutAction` onto its own routes.
- **Verdict: keep.** The reference is honest that this is the road less travelled: *"The four factories
  below are the advanced per-route seam. `createCairnAdmin` wraps them, so a site on the single mount
  never calls them directly."* An advanced escape hatch that the recommended path is built from is
  exactly the leanest form, not a parallel feature.

## Rank 69. `EditorRoutes`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** engine-internal, the named return of `createEditorRoutes`.
- **Anonymous consumer:** thin, same as rank 66.
- **Verdict: reshape.** Same idiom-consistency point as rank 66.

## Rank 70. `EditorRoutesOptions`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** added with the roles work; `{ roles?: RolesDeclaration }`.
- **Anonymous consumer:** a site with a declared role vocabulary that hand-mounts the roster screen
  passes its `defineRoles` output here.
- **Verdict: keep.** One optional field is thin, but it is the only place the roster screen learns the
  site's vocabulary, and a positional argument would be worse.

## Rank 71. `createEditorRoutes`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** engine-internal. The ASC brief cites its actions as the in-engine model for the
  section-action seam: *"The engine's own `editors-routes` actions are the in-engine proof of the shape."*
- **Anonymous consumer:** a site that puts editor management inside its own people-admin screen (where
  cairn editors are a subset of a larger roster) mounts these four actions on its own route.
- **Verdict: keep.** The anti-lockout rule it enforces ("never below one owner", *"enforced in the store
  by an atomic guarded write"*) is precisely the thing a site must not hand-roll.

## Rank 72. `NavRoutes`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** engine-internal factory return.
- **Anonymous consumer:** thin.
- **Verdict: reshape.** Same idiom point as ranks 66 and 69.

## Rank 73. `createNavRoutes`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** engine-internal, with the site-config nav menu.
- **Anonymous consumer:** a site whose public menu is edited beside its own settings mounts
  `navLoad`/`navSaveAction` on its own route. The factory reads and commits through the same backend
  seam as the content routes, so the site does not re-implement the config commit.
- **Verdict: keep.** Narrower than its siblings (it only exists when the site configures a menu:
  *"The nav surface exists only when the site configures a menu; without one its view is a 404"*),
  which is the correct lean behavior.

## Rank 74. `ContentRoutes`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** engine-internal; `ReturnType<typeof createContentRoutes>`.
- **Anonymous consumer:** thin by name, but consequential: this type is the reason two dozen janitorial
  types in ranks 1–13 are public at all.
- **Verdict: reshape.** Right membership, wrong form. Today it is the full 30-key action vocabulary,
  including maintenance actions no site drives. Right form: split the public return into the loads and
  actions a hand-mounting site actually wires, and keep the media-janitorial actions on an
  engine-internal shape the engine's own components import directly (which is already how they reach
  them). That reshape is the single change that lets ranks 1–13 retire.

## Rank 75. `ContentRoutesOptions`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** mixed. `tidy` is a test seam; `navFilter` came from `26ba4b15` "Add a per-request
  navFilter seam to ContentRoutesDeps"; `attention` from `f63896ee`; `preview` with the preview
  lifetime work.
- **Anonymous consumer:** real for `navFilter` and `attention`. A site whose authorization lives
  outside cairn (roles in its own database) needs `navFilter` to stop teasing links its own routes then
  refuse; a site with a work queue needs `attention` to badge it.
- **Verdict: keep.** The bag mixes a test-injection knob (`tidy`) with two genuine seams, which is a
  cohesion smell worth watching, but each member is individually justified and the bag is how
  `createCairnAdmin` forwards them.

## Rank 76. `createContentRoutes`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** engine-internal, one of the four original factories.
- **Anonymous consumer:** a site hand-mounting `/admin` route-by-route (because its admin URLs must
  match an existing information architecture) wires `editLoad`, `saveAction`, `publishAction` and the
  rest onto its own files.
- **Verdict: keep.** It carries the engine's whole content job — branch-per-entry save, publish,
  revert, link integrity — which is the definition of cairn's own core work.

## Rank 77. `AdminData`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal, from the single-mount facade (`f90d1021` "Add the createCairnAdmin
  load facade for the single-mount admin"); its arms were named later by `a6b72e22`.
- **Anonymous consumer:** every site on the canonical mount. `admin-routes.md`'s reproduced route file
  is literally `let { data, form }: { data: AdminData; form: ActionData } = $props();`.
- **Verdict: keep.** One of exactly two data types the recommended wiring makes a developer write.

## Rank 78. `CairnAdminRoutes`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal; the facade's return type.
- **Anonymous consumer:** a site annotating the `admin` export in `cairn.server.ts`.
- **Verdict: reshape.** Same idiom-consistency issue as ranks 66/69/72, and it matters more here
  because this is the recommended path's type. Pick one derivation for all five factory returns.

## Rank 79. `CairnAdminOptions`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal facade bag; `navFilter` forwarding added by `f201819a` "Forward
  navFilter through the single-mount CairnAdminDeps facade".
- **Anonymous consumer:** any site that overrides a seam on the recommended mount — a custom mailer, a
  role filter over the sidebar, attention badges, a preview lifetime.
- **Verdict: keep.** The doc-comment's own framing is the right one: *"Injectable dependencies, grouped
  into the two cohesive bags a site actually overrides."*

## Rank 80. `AttentionItem`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `f63896ee` "feat(admin): per-session attention items in the shell payload". Family
  motivation (an ASC-style queue), no filed brief item; no built anonymous consumer.
- **Anonymous consumer:** general. Any site with a pending-work queue behind a custom admin screen
  (unreviewed submissions, unread messages) wants a badge on the nav entry rather than a screen the
  editor must remember to visit.
- **Verdict: keep.** The shape is re-derived correctly for any site rather than transplanted:
  `{ href; count; label? }` is keyed by the href the site already declared, and the engine drops items
  the session cannot see (*"a count never leaks to a role that cannot see its nav entry (counts are
  information; CWE-200)"*) rather than trusting the site to filter.

## Rank 81. `EngineScreenId`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `admin-nav.ts`, with the navLayout seam (the 0.77.0 lean-extensibility redesign).
- **Anonymous consumer:** a site declaring `navLayout` writes `{ screen: 'media' }`, and the
  `(string & {})` tail keeps concept ids assignable while preserving completion on the fixed screens.
- **Verdict: keep.** Argued the other way: the `(string & {})` trick is a TypeScript idiom leaking into
  a public type, and a site never writes the alias's *name* — it writes the literal. That is a real
  objection; the keep rests on the alias being the documented vocabulary of the fixed screens, which a
  site does need to see somewhere. Marked as resting partly on the absence of a stronger objection.

## Rank 82. `ResolveNavLayoutOptions`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `3866f358` "feat(admin-nav): resolve navLayout into one arranged, filtered tree".
- **Anonymous consumer:** thin. `resolveNavLayout` is called by the engine's own shell load; a site
  reaches the result through `AdminShellData.nav`.
- **Verdict: reshape.** Its `concepts` member is a structural stand-in
  (`{ id; label; routing?: { dated } }[]`) for `ConceptDescriptor`, which is already public — so the
  public surface carries two shapes for one idea. Right form: take the real descriptor type, or keep
  the resolver internal (see rank 83).

## Rank 83. `resolveNavLayout`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `23573a18` / `3866f358`; built so the declared and default paths *"can never drift"*.
- **Anonymous consumer:** weak. A site rendering its own sidebar chrome could resolve the tree itself —
  but a site doing that has left `CairnAdminShell`, and cairn's answer for it is `navFilter` plus the
  resolved `nav` payload.
- **Verdict: reshape.** Membership is defensible for testing a declared layout; the right form is a
  narrow, purpose-named export (validate-and-preview a `navLayout` against this site's concepts) rather
  than the engine's internal resolver with its internal options bag.

## Rank 84. `validateNavLayout`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** same seam. It is what makes *"A bad icon, a colliding href, an unknown screen, or an
  unresolvable role fails the build rather than rendering a broken or silently wrong sidebar."*
- **Anonymous consumer:** a site that builds its `navLayout` dynamically (from its own config or a
  plugin list) wants the same startup validation the engine applies to a literal.
- **Verdict: reshape.** Right membership, awkward form: it returns `void` and throws, and its `ctx`
  requires the caller to assemble `conceptIds`, `navMenuConfigured`, and `roleNames` by hand — three
  facts the composed runtime already holds. Right form: take the runtime (or the adapter) and the
  layout, so the call site cannot assemble the context wrongly.

## Rank 85. `ResolvedLayoutSection`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** navLayout seam.
- **Anonymous consumer:** a `navFilter` implementation that drops or reorders a whole group narrows on
  `'children' in node` and needs this name to type the branch.
- **Verdict: keep.** It is a member of the `navFilter` callback's own parameter type, which is the
  category a site genuinely writes by hand.

## Rank 86. `ResolvedLayoutChild`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** navLayout seam; `ResolvedNavEntry | ResolvedEngineNavEntry`.
- **Anonymous consumer:** the other branch of the same `navFilter` narrowing.
- **Verdict: keep.**

## Rank 87. `ResolvedLayoutNode`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** navLayout seam; it is `navFilter`'s parameter and return element type.
- **Anonymous consumer:** direct and concrete. A site writing
  `navFilter: (items: ResolvedLayoutNode[], ctx) => …` in its own `cairn.server.ts` writes this exact
  name; nothing infers it, because the site is authoring the function.
- **Verdict: keep.** Strongest of the resolved-nav types for that reason.

## Rank 88. `ResolvedEngineNavEntry`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** navLayout seam.
- **Anonymous consumer:** a `navFilter` that keeps a site's own entries and hides engine doors for a
  given role discriminates on the presence of `screen` and needs this name.
- **Verdict: keep.**

## Rank 89. `ResolvedNavEntry`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** navLayout seam.
- **Anonymous consumer:** the site-entry half of the same narrowing.
- **Verdict: keep.**

## Rank 90. `ResolvedNavLayout`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** navLayout seam; it is `AdminShellData.nav`, and is named once in `components.md`.
- **Anonymous consumer:** a site rendering its own shell chrome around cairn's resolved tree, or
  writing a helper over `data.shell.nav`.
- **Verdict: keep.** The `items` / `fallback` split (the trailing group of engine screens a layout never
  referenced) is real public grammar a site must understand to lay the sidebar out.

## Rank 91. `NavIcon`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** navLayout seam. A closed allowlist of 27 bundled glyph names.
- **Anonymous consumer:** any site declaring one `navLayout` entry picks an icon; the alias is what
  gives completion and what fails the build on a typo.
- **Verdict: keep.** The closed allowlist is the right lean shape: it keeps the icon set inside the
  bundle rather than opening an asset seam.

## Rank 92. `NavLayoutEngineRef` — **collision-flagged**
- surfacedAt: `/sveltekit` (also root, `/delivery/data`) · Extension API
- **Provenance:** `admin-nav.ts:116`, navLayout seam. Single definition; see the collision note above.
- **Anonymous consumer:** a site that wants one extra link beside the built-ins declares a layout, and
  the doc's own answer depends on this node kind: *"declare `navLayout` with that one entry, and every
  engine screen the declaration omits lands in the trailing fallback group automatically."* Relabeling
  ("Articles" instead of "Posts") and `hidden: true` are both common, ordinary needs.
- **Verdict: keep.** The comment that nav placement is never authorization (*"the route itself stays
  live"*) is the correct, honest framing and belongs in the type's doc where it is.

## Rank 93. `NavLayoutEntry` — **collision-flagged**
- surfacedAt: `/sveltekit` (also root, `/delivery/data`) · Extension API
- **Provenance:** `admin-nav.ts:53`. Single definition.
- **Anonymous consumer:** the most-written type in this bucket after `CairnEvent`. Every site that adds
  one custom admin screen writes a `NavLayoutEntry` to put a door on it.
- **Verdict: keep.** Shape is site-agnostic plain data with a declarative `roles` gate and a cosmetic
  `ownerOnly`, and the doc states the safety rule plainly: *"the flag is cosmetic, so the route itself
  must still gate server-side."*

## Rank 94. `AdminShellData`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal, from the shell split; `mediaBase` was a later required addition
  (`docs/extend/migration-notes.md` records it as a breaking change).
- **Anonymous consumer:** every site on the canonical mount. `admin-routes.md`'s `+layout.svelte`:
  `let { data, children }: { data: { shell: AdminShellData }; children: Snippet } = $props();`
- **Verdict: keep.** The second of exactly two data types the recommended wiring makes a developer
  write. The `public: true | false` discriminant is load-bearing (a login path must render bare), so the
  union shape is right rather than a bag of optionals.

## Rank 95. `PreviewData`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `65737bf5` "Add previewLoad, the public preview page's server load".
- **Anonymous consumer:** the site owns the preview page's markup (it is a public page in the site's own
  design), so it must type the load's return to render it.
- **Verdict: keep.** The division is right: the engine resolves the draft, the links, the media and the
  SEO block; the site renders it in its own theme.

## Rank 96. `PreviewTokenConfig`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `preview.ts`, with the share-link lifecycle.
- **Anonymous consumer:** a site whose review cycle is not seven days (a newsroom wanting 24 hours, a
  slow committee wanting thirty) sets `ttlMs`.
- **Verdict: keep.** One optional field, but it is a policy knob about link exposure, which is exactly
  the kind of decision that belongs to the site rather than the engine.

## Rank 97. `mintPreviewToken`
- surfacedAt: `/sveltekit` · Unstable API
- **Provenance:** `0ebf3188` "Add mintPreviewToken, the previewMint/previewRevoke actions, and
  lifecycle cleanup".
- **Anonymous consumer:** a site that mints a share link from its own workflow (an editorial queue that
  emails a reviewer on submit) rather than from the editor's Share button.
- **Verdict: reshape.** Membership is defensible; the form is dangerous. The module's own header says
  it plainly: *"this function itself performs no authorization or draft-existence check of its own, so a
  caller that reaches it directly owns both."* An export whose contract is "you own authorization"
  should not sit unmarked beside `previewLoad`. Right form: either take the resolved editor and perform
  the entry-scoped check the admin action performs, or make the caller's obligation part of the name
  and the signature rather than a header comment.

## Rank 98. `previewLoad`
- surfacedAt: `/sveltekit` · Scaffold API
- **Provenance:** `65737bf5`; scaffolded into the getting-started site.
- **Anonymous consumer:** every site that lets a non-editor see an unpublished draft — a client, a board
  member, a copy editor without an account. The engine resolves the draft off its pending branch, which
  a site cannot do without reimplementing the branch model.
- **Verdict: keep.** Correct division of labor: *"it needs no authorization at all, since the token
  itself is the credential"* is the right, stated contract for a public page.

## Rank 99. `SlotDef` — **collision-flagged**
- surfacedAt: `/delivery`, `/delivery/data`, `/sveltekit` · Extension API
- **Provenance:** `src/lib/render/registry.ts:17`, part of the component-registry vocabulary; it reaches
  `/sveltekit` only through the R4 closure of `CairnRuntime`'s body.
- **Anonymous consumer:** real — a site declaring a custom markdown component writes slot definitions —
  but that developer is reading `/delivery` or the root barrel, not the route-factory subpath.
- **Verdict: reshape.** The item belongs in the engine; its presence on a fourth barrel does not. Right
  form: one canonical home for the registry vocabulary, with the other subpaths documenting where to
  import it from instead of re-publishing it. Its substantive audit belongs to the render/registry
  bucket.

## Rank 100. `MediaEntry`
- surfacedAt: `/media`, `/sveltekit` · Extension API
- **Provenance:** `src/lib/media/manifest.ts`; surfaces here through `UploadResult`'s closure.
- **Anonymous consumer:** real at `/media` (the manifest record is the media vocabulary's core noun);
  none at `/sveltekit` once rank 38 moves.
- **Verdict: reshape.** Keep it in the engine, at `/media`; drop the `/sveltekit` re-export. Its
  substantive audit belongs to the media bucket.

## Rank 101. `EmailAttachment` — **collision-flagged**
- surfacedAt: `/sveltekit` (also root) · Extension API
- **Provenance:** `src/lib/auth/types.ts:31`. Single definition; the flagged collision is an
  alias-expansion artifact, not two types.
- **Anonymous consumer:** a site supplying a custom `SendMagicLink` needs the message shape — but
  `/sveltekit` is the route-factory subpath, and the mail vocabulary's home is the auth/email surface.
- **Verdict: reshape.** Same duplicate-home problem as ranks 99 and 100: publish it once, from the
  subpath that owns the mail contract, and let the barrel comment point at it. Its substantive audit
  belongs to the email/auth bucket.

## Rank 102. `CookieSetOptions`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal; `types.ts` declares `CookieJar` structurally so *"the engine never
  imports a site's generated App.* ambient types."*
- **Anonymous consumer:** thin on its own. A site writing a test double for `CairnEvent` types the
  `set` signature; otherwise it is reached through `CookieJar`.
- **Verdict: keep.** It is a member of a type a site does construct (rank 103), and inlining it would
  make `CookieJar` harder to read. Weak keep, resting largely on there being no objection to it rather
  than on a scenario that demands the name.

## Rank 103. `CookieJar`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal, part of the structural-event design.
- **Anonymous consumer:** concrete. A site unit-testing its own `adminAction`-wrapped handler builds a
  fake event, and `cookies` is required on `CairnEvent`, so the fake must satisfy this interface.
- **Verdict: keep.** The structural-subset approach is the right lean shape: it lets any real kit event
  satisfy the engine with zero casts and no dependency on the site's generated ambients.

## Rank 104. `PlatformContext`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal; `{ env?: Env }`.
- **Anonymous consumer:** a site building a test event, or reasoning about why its own `App.Platform`
  (which carries `ctx` and more) still satisfies cairn.
- **Verdict: keep.** The doc-comment earns it: *"a site's own `App.Platform` type is free to carry `ctx`
  (or any other member) alongside it, since a real SvelteKit `RequestEvent` has more than this
  structural subset and still satisfies it."* That is the contract a site needs stated somewhere.

## Rank 105. `HandleInput`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal, `types.ts`.
- **Anonymous consumer:** a site writing its own `Handle` that wraps or sequences cairn's guard types
  the `{ event, resolve }` argument with this.
- **Verdict: keep.** Every site with its own hook (analytics, a redirect table, a second auth audience)
  sequences around the guard, which is the common case, not an exotic one.

## Rank 106. `CairnMediaBindings`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `eacf3f29`-era surface work; the barrel records the decision: *"The binding-shaped
  types a site's app.d.ts intersects into its own Platform.env; /sveltekit is their canonical home
  (decision: surface-pruning Task 6)."*
- **Anonymous consumer:** every media-enabled site writes
  `env: CairnPlatformBindings & CairnMediaBindings & { … }` in `app.d.ts`.
- **Verdict: keep.** The two-way split is the right shape: a text-only site is not forced to declare a
  bucket binding it does not have.

## Rank 107. `CairnPlatformBindings`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** same decision.
- **Anonymous consumer:** every cairn site. `platform-bindings.ts` states the payoff concretely: *"a
  binding a site forgets to wire fails `app.d.ts` at compile time rather than surfacing as a runtime
  `config.bindings-missing` error."*
- **Verdict: keep.** It is also correctly framed as optional (*"A recommended convenience preset, not a
  requirement"*), so a site on a `wrangler types`-generated env is not shut out.

## Rank 108. `AdminActionOptions`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal test seam. Its own doc: *"Injectable dependencies for `adminAction`,
  **so a test can drive both branches** of the unaudited path"*, and *"every real caller takes the
  default."*
- **Anonymous consumer:** essentially none. The engine's own comment says no real caller passes it.
- **Verdict: reshape.** Membership is thin but not zero (a site testing its own wrapped handler under a
  dev-only throw). The form is wrong: a bag named "Options" whose only member is an injected build flag
  advertises configuration that does not exist. Right form: fold the flag into the function's own
  testing surface, or name it for what it is rather than as the wrapper's options.

## Rank 109. `UnauditedActionError`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal, with the Part C admin-extension seams (`4cc74bd2`).
- **Anonymous consumer:** a site whose `handleError` or test harness distinguishes this dev-only signal
  from a real failure. The reference is explicit that it needs no production mapping.
- **Verdict: keep.** The value is that it makes the "a mutating action must audit" rule loud at
  authoring time. Exporting the class is what lets a site's test assert on it rather than on a message
  string.

## Rank 110. `AdminActionAudit`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** ASC brief seam 5's neighborhood; the seam itself predates the brief (*"`adminAction`
  calls a site-supplied `event.locals.auditSink` (`AdminActionAuditSink`, **already a public type** on
  `./sveltekit`)"*). No built anonymous consumer yet.
- **Anonymous consumer:** every handler wrapped by `adminAction` writes `ctx.audit({ action, entity,
  entityId })`, so the site writes the shape's fields directly and names the type when it factors a
  helper.
- **Verdict: keep.** The four-field vocabulary (verb, entity, id, detail) is domain-neutral: it carries
  no ASC concept, and the doc's own examples span an event approval and a season rollover.

## Rank 111. `AdminActionAuditRecord`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** same seam; `AdminActionAudit & { actor: string }`.
- **Anonymous consumer:** a site that writes its own sink (to its own logging service, or its own
  table) declares `(record: AdminActionAuditRecord) => void` and names this type.
- **Verdict: keep.** Splitting `actor` out of the emit shape is the right modeling: a handler must not
  be able to forge an actor, and the wrapper sets it from the verified editor.

## Rank 112. `AdminActionContext`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** same seam.
- **Anonymous consumer:** it is a callback parameter type a site writes by hand in two places — a
  factored handler (`async function approve({ ctx }: { ctx: AdminActionContext })`) and
  `SectionActionConfig.rateLimit.key(ctx)`.
- **Verdict: keep.**

## Rank 113. `AdminActionAuditSink`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** predates the ASC brief and is cited by it as already public.
- **Anonymous consumer:** direct. A site wires `event.locals.cairnAuditSink = mySink` in
  `hooks.server.ts` and types `mySink` with this.
- **Verdict: keep.** The seam-not-implementation posture is exactly the charter's *"serves it with a
  thin seam, not a built-in feature"*, and the fail-open contract (*"a throw … must never turn that
  completed write into a failed action"*) is a property a site should not have to discover.

## Rank 114. `SectionActionAudit`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** ASC brief seam 2; **no built consumer yet** — `engine-harvest-candidates.md`: *"the ASC
  retrofits (deleting `club-action.ts`, `portal-action.ts`, …) are queued in ASC's STATUS and have not
  run."*
- **Anonymous consumer:** a handler that touches two entities in one call overrides `entity` on the
  second emit and needs this defaulting shape's name.
- **Verdict: keep.** The defaulting (action/entity inherited from the call site's options) removes the
  repetition that made hand-rolled audits drift, and it is a general property, not an ASC one.

## Rank 115. `SectionActionContext`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** ASC brief seam 2; no built consumer yet.
- **Anonymous consumer:** a site factoring a wrapped handler out of the actions record annotates
  `ctx: SectionActionContext<D1Database>` by hand.
- **Verdict: keep.** `db: NonNullable<Db>` is the whole point — the wrapper has already refused the
  unbound-binding case, so the handler body has no null check. That is the hand-roll being deleted.

## Rank 116. `SectionActionOptions`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** ASC brief seam 2; no built consumer yet.
- **Anonymous consumer:** every wrapped call site writes `{ action, entity }` and, on a parameterized or
  catch-all route, `target`.
- **Verdict: keep.** The `target` field is the strongest single piece of evidence in this bucket that
  the shape was re-derived rather than transplanted: it exists because *"on a catch-all route the
  pathname is attacker-chosen while the route id is not"*, a property of SvelteKit, not of ASC.

## Rank 117. `RateLimitLike`
- surfacedAt: `/auth-channel`, `/cloudflare`, `/sveltekit` · Extension API
- **Provenance:** ASC brief seam 4 (*"a rate-limit wrapper with the degrade-to-open convention … Every
  site with a public form re-decides that policy, and the wrapper carries no ASC domain."*). No built
  consumer yet.
- **Anonymous consumer:** a site writing `rateLimit.resolve` must name the return type, and the
  structural definition means a test can pass a fake and a non-Cloudflare host can pass its own limiter.
- **Verdict: keep.** The reference states the reason for the structural shape: *"any conforming limiter
  serves, so the surface takes no dependency on `@cloudflare/workers-types`."* That is the leanest form.
  The triple re-export is the evenness cost noted in the collision section, not a membership problem.

## Rank 118. `SectionActionConfig`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** ASC brief seam 2; no built consumer yet.
- **Anonymous consumer:** every site using the seam writes this object once per section, and must name
  it to annotate `Env` (the doc warns `Env` does not infer from `resolveDb` alone).
- **Verdict: keep.** The config holds *only* what the engine cannot know — the binding resolver and the
  optional limiter — which is the correct minimal split.

## Rank 119. `createD1AuditSink`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** ASC brief seam 5, verbatim: *"Ask: a packaged `audit_log` migration plus a sink factory
  (`createD1AuditSink(db, waitUntil?)`) a site wires in one `hooks.server.ts` line."* Filed with a
  built ASC implementation behind it (`src/admin-club/lib/audit-sink.ts`), but the ASC retrofit onto the
  engine version has not run, so no built consumer of the engine export exists.
- **Anonymous consumer:** any site on Workers that wants its admin mutations persisted rather than only
  logged. Cloudflare Workers Logs expire; an audit trail that answers "who changed this in March" needs
  a table.
- **Verdict: keep.** The brief's own generality test is met and quoted: *"the implementation that closed
  it is fully generic: one `audit_log` table, a `waitUntil`-kept fire-and-forget insert, fail-open so a
  persist failure never fails the audited action."* The engine's version adds the hardening a site would
  not think of (code-point truncation, lone-surrogate replacement) precisely so an attacker-chosen
  `detail` cannot suppress its own row — a re-derivation, not a transplant. Note the harvest doc's open
  question (2b): whether calling the sink directly with domain events is sanctioned is still
  undocumented, which is a docs gap, not a membership one.

## Rank 120. `createSectionAction`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** ASC brief seam 2, with measured duplication: *"ASC hand-rolled the composition twice:
  `src/admin-club/lib/club-action.ts` … and `src/member-portal/lib/portal-action.ts` … xcathletes
  platform Task 5 puts roster management in a custom admin screen and will write the third copy."*
  Third consumer named but unbuilt; ASC retrofit queued, not run.
- **Anonymous consumer:** strong and framework-shaped. The forcing fact is SvelteKit's, not ASC's:
  *"SvelteKit dispatches a matched action directly and never re-runs an ancestor layout's `load`, so a
  section's own POST cannot lean on its page's authorization check."* Any site that adds one custom
  admin screen with one form hits this, and the failure mode is silent — the page looks gated and the
  POST is not.
- **Verdict: keep.** Shape is re-derived, not transplanted: it composes onto `adminAction` and adds only
  the binding resolver and the optional limiter, deliberately doing *"no schema validation and no domain
  work."* The check ordering (authorization before binding resolution, so a refused session learns
  nothing about deployment) is the kind of correctness a third hand-rolled copy would have gotten wrong.

## Rank 121. `adminAction`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal, `4cc74bd2` "feat(engine): add the Part C admin extension seams",
  shaped by an ASC scaffold read (the module header names it) rather than by a filed ask.
- **Anonymous consumer:** the base case of rank 120, and it serves the larger population: a custom admin
  screen with a form but no database binding. The module is honest about which part is load-bearing —
  the guard already does CSRF, so *"this wrapper's real value is resolving the signed-in editor as a
  typed `ctx.editor` and requiring an audit emit for a mutating action, which the engine has no other
  hook for."*
- **Verdict: keep.** The required-audit rule is the strongest single design decision in this bucket: it
  turns "we should log admin changes" from a discipline into a build failure, and the `fail()` exemption
  keeps it from training authors to emit noise.

## Rank 122. `createMediaRoute`
- surfacedAt: `/sveltekit` · Scaffold API
- **Provenance:** `6ff13feb` "Add the media delivery route and requireBucket (media 2a task 4)";
  engine-internal, scaffolded.
- **Anonymous consumer:** every media-enabled site mounts `/media/[...path]`, and the route carries
  security properties a site would not reliably reproduce: a closed extension allowlist, a validated
  16-hex hash before any R2 read, and *"The load-bearing XSS control"* headers (`nosniff`,
  `Content-Disposition: inline`, `default-src 'none'; sandbox`).
- **Verdict: keep.** A site serving user-uploaded bytes from its own origin without those headers has an
  XSS hole; this is exactly the class of thing that must not be a hand-roll. The barrel also documents
  why it lives here rather than on `/media` (*"it reads `platform.env`, which pulls `@sveltejs/kit` into
  its graph"*), so the placement is reasoned.

## Rank 123. `AuthGuardOptions`
- surfacedAt: `/sveltekit` · Scaffold API
- **Provenance:** engine-internal, grown with roles (`opts.roles`), access maps (`opts.access`), and HSTS
  (`opts.includeSubDomains`).
- **Anonymous consumer:** any site declaring roles or an access map writes this object in
  `hooks.server.ts`.
- **Verdict: keep.** Each member is a decision only the site can make, and `includeSubDomains` is
  correctly defaulted off with the reason stated: pinning sibling subdomains *"is a decision that
  belongs to whoever owns the domain."*

## Rank 124. `requireOwner`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal, from the original spec's management-surface gate.
- **Anonymous consumer:** a site adding a destructive admin operation (a bulk import, a data purge)
  gates its load with one line instead of re-deriving what "owner" means from a role string.
- **Verdict: keep.** It reads `capability`, not a role name, so a site with a custom vocabulary
  (`admin`, `steward`) gets the right answer without mapping.

## Rank 125. `requireEditor`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal; the `none`-capability contract came with the roles work.
- **Anonymous consumer:** a site whose custom screen is content-adjacent gates on "can edit content"
  rather than on a role list.
- **Verdict: keep.** The stated `none` contract is load-bearing and non-obvious: a `none` session *"still
  authenticates and carries a populated `locals.cairnEditor`, so it passes through the `CairnAdminShell`
  custom-route seam untouched"* — which is what lets a site have admin users who are not cairn editors.

## Rank 126. `requireSession`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal, from the original spec.
- **Anonymous consumer:** every custom admin screen's `load`. It is the one-line answer to "who is
  signed in", and it redirects rather than erroring, which is the behavior a lapsed session needs.
- **Verdict: keep.** A site cannot reach this correctly on its own: the session lives in an engine-owned
  cookie resolved against the engine's own D1 store.

## Rank 127. `requireAccess`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** `2d766263` "feat(auth): requireAccess and the access-denial event", engine-internal
  with the access-map design. The ASC brief cites it as *not* composing for the POST case, which is what
  motivated rank 120.
- **Anonymous consumer:** a site with more than two kinds of admin user gates its own route in one line
  against the map it already declared, and gets the denial log for free.
- **Verdict: keep.** The fail-closed reading on an unmapped target is a deliberate, documented inversion
  (*"this helper's contract is 'this route opted into the map and the map has no opinion on it,' a
  misconfiguration made loud rather than an access decision"*), and deriving the target from
  `event.route.id` rather than the pathname is the same attacker-chosen-value defense rank 116 carries.

## Rank 128. `createCairnAdmin`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal (`f90d1021`, `1b8f4729`), built to collapse the four per-route
  factories into one mount.
- **Anonymous consumer:** the recommended path for every site. `admin-routes.md`: *"A cairn site mounts
  the whole `/admin` surface with two route pairs … so the site restates no route table and wires no
  action names by hand."*
- **Verdict: keep.** It is the clearest instance of the charter's own posture — the engine owns the admin
  frame, the site owns everything else — and it composes the advanced factories rather than duplicating
  them, so there is one implementation and two doors.

## Rank 129. `createAuthGuard`
- surfacedAt: `/sveltekit` · Scaffold API
- **Provenance:** engine-internal, from the original spec; hardened repeatedly since (dev-backend
  fail-closed, the HTTPS help page, the bindings check, the CSRF header witness).
- **Anonymous consumer:** every cairn site, one line in `hooks.server.ts`. It carries five things a site
  cannot reach and must not re-derive: session resolution against the engine's store, the double-submit
  CSRF authority the site handed over by setting `checkOrigin: false`, capability resolution once per
  request, the security headers, and the refusal to run with a dev backend flag set in production.
- **Verdict: keep.** The second-strongest item, behind only the type every one of its callers must name.

## Rank 130. `CairnEvent`
- surfacedAt: `/sveltekit` · Extension API
- **Provenance:** engine-internal, and explicitly a consolidation: *"It replaces the five
  separately-declared event shapes cairn carried before the C2 breaking-window pass … three names for one
  shape was the original defect, and a fourth only compounded it."*
- **Anonymous consumer:** the strongest case in the bucket, on two counts. Every other export in this
  subsystem names it, so a site annotating any handler, helper, or test double writes it; and the
  structural design is what makes cairn usable at all — *"a real SvelteKit `RequestEvent` or
  `ServerLoadEvent` carries every member here and more, and the engine never imports a site's generated
  `App.*` ambient types, so any kit server event satisfies it with zero casts."* A site cannot supply
  this: it is the engine's own contract with the framework.
- **Verdict: keep.** Argued the other way as required: the `CairnEnv` default is a compatibility trick
  resting on shared property names defeating TS2559 weak-type detection, which is subtle enough that a
  site could be surprised by it. The mitigation already exists as a compile-only fixture
  (`src/tests/unit/env-genericity.test.ts`), so the subtlety is gated rather than hoped for. Keep, with
  no reshape.

---

## Summary

- **retire: 48** — almost entirely the R4 closure of the media-janitorial and per-action failure
  vocabulary, plus the element and projection types reachable only by property access.
- **reshape: 17** — the four factory-return aliases (idiom drift), `ContentRoutes` itself (the change
  that unlocks the retirements), `ContentFormFailure`, `RevertFailure`, `TidyClient`, `UploadResult`,
  `mintPreviewToken`, `AdminActionOptions`, the nav-resolver pair, and the three cross-barrel duplicate
  re-exports (`SlotDef`, `MediaEntry`, `EmailAttachment`).
- **keep: 65** — the guard and its four gates, the single-mount facade, `CairnEvent` and the structural
  event vocabulary, the binding presets, the `adminAction`/`createSectionAction`/audit-sink family, the
  navLayout seam, the attention and publish-actions seams, the preview pair, the media route, the four
  per-route factories with their configs, and the dozen view-data types the reference's own worked
  examples make a developer write by name.

Two cross-cutting observations for the whole surface, recorded here because they are properties of the
bucket rather than of any item:

1. **The R4 nameability ruling is over-applied.** It was ratified as "every type a public signature
   names is importable", but it was executed against `ReturnType<typeof createContentRoutes>`, a type
   that includes actions no site drives. Narrowing the public factory return, not repealing the ruling,
   is the fix — and it is the one change that lets 30-odd items retire at once.
2. **The engine's own stability tiers already encode most of this audit.** Nearly every retire lands on
   an item the reference grades Unstable API, and nearly every keep on Extension or Scaffold API. The
   exceptions are the interesting ones: `MediaUsageInfo`, `NavConcept`, `NavPageOption`, `GettingStarted`,
   `MarkdownReferenceRow`, `AdvisoryNotice`, `AdvisoryAction`, `HistoryEntry`, `EntrySummary` and
   `ResolvedPreview` all carry Extension API today and do not earn it.
