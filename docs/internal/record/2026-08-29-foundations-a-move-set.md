# Foundations A move set: the canonical-home rule, executed

Written 2026-08-29 by foundations A, Task 2, executing the any-site audit's R-0 and R-1
(`coherence-v2.md`, C1 and the R-0/R-1 recommendations). The ratification and the dissent it
overrules live in the rulings ledger as `read-from-the-source-rule` and `canonical-home-rule`; this
file is the executed detail, and it exists so foundations B can diff against it.

**What foundations B owes this file.** Its list (b) re-evaluates the whole R4 re-export set below
after `/sveltekit` narrows (audit R-2: narrowing `ContentRoutes` is what lets ~30 `/sveltekit`
leaves retire and re-derives the closure). Its list (c) diffs its own verdict flips against the
moved and unmoved names here, so a later keep-to-retire flip on a name this pass moved reads as
changelog churn rather than rework. **This pass claims no finality on the re-export set.** Sixty-two
of the 120 recorded re-exports sit on `/sveltekit` and exist only because `CairnRuntime` reaches
them; the narrowing is expected to strike many of them.

## How the population was derived

`docs/internal/api-surface.md` at `e9d7e29f` carried 411 exported names, of which 122 published
from two or more subpaths (63 from two, 10 from three, 44 from four, 5 from five). Cross-referenced
against the rulings ledger, those 122 split 114 keep, 3 reshape, 5 retire. Both counts reproduce
exactly; the plan's "410 exported names" is off by one and its pre-flight note already records that.

One discrepancy against the audit's own table, recorded rather than forced: `coherence-v2.md:85`
lists `SlotDef` as publishing from `.`, `/delivery`, `/delivery/data`, `/render`, and `/sveltekit`.
`/render` publishes only `ComponentContext` and the five hast builders, so `SlotDef` published from
four subpaths, not five. The finding is unaffected.

## The move rule as applied

- **Keep (114):** the name's canonical home is the subpath whose barrel declares it. Every other
  publication survives only where the R4 closure requires it on that subpath, and then as a
  recorded re-export naming the home and the requiring signature.
- **Reshape (3):** not moved. Their home settles when the conventions pass reshapes them; moving
  now would touch them twice.
- **Retire (5):** not moved. The retires pass deletes them where they stand.

Two determinations the plan did not settle, made here and open to challenge:

1. **Canonical home follows the publishing barrel, not the source directory.** The rule's one
   existing precedent already works this way: `MediaLibraryEntry` is declared in
   `src/lib/components/MediaPicker.svelte`, and the ledger nonetheless names `/admin-toolkit` its
   home, because that is the barrel publishing the component whose prop signature carries it. So
   the render tree's types (`ComponentDef`, `ComponentRegistry`, `SlotDef`, `IconSet`,
   `ComponentContext`) are homed at `.`, whose barrel publishes `defineComponent`,
   `defineRegistry`, `glyph`, and `createRenderer`; `/render` is a curated authoring-helper barrel
   that publishes none of them.
2. **`/delivery` over `/delivery/data` is one home, not two.** They are a dependency-axis pair over
   a single source tree: `/delivery` is `/delivery/data` plus the SvelteKit route loaders, and its
   `export *` is the documented superset. The audit itself praises that split as reasoned and
   test-held (`coherence-v2.md:808`, item 7), and the reference gate already dedups the pair the
   same way (`reference-coverage.mjs`'s `excludeDts` for `/delivery`). Treating them as two homes
   would have stripped ~40 names off `/delivery` and rewritten the shipped `waymark` template's
   route files for a break the audit never asked for. Recorded in the gate as a `layeredBarrels`
   pair, which still fails a `/delivery` duplicate of a name `/delivery/data` does not export.

The R4 closure was judged against the PRE-narrowing surface and under the union of two readings: a
name counts as required on a subpath when it appears in that subpath's declared source signatures
OR in the structurally expanded shape the surface snapshot records. The two readings disagree (the
snapshot expands a type alias, so `CairnRuntime.render: SiteRender` renders as the inlined function
type naming `LinkResolve`), and taking the union drops only what neither reading justifies.

## Moved names (18)

Each lost a publication no signature on that subpath required. Canonical home unchanged; the
publication that went away is the second one.

| Name | Canonical home | Publications before | Publications after |
|---|---|---|---|
| `AssetConfig` | `.` | `.`, `/delivery`, `/delivery/data`, `/media`, `/sveltekit` | `.`, `/media`, `/sveltekit` |
| `ComponentContext` | `.` | `.`, `/delivery`, `/delivery/data`, `/render`, `/sveltekit` | `.`, `/render`, `/sveltekit` |
| `ComponentDef` | `.` | `.`, `/delivery`, `/delivery/data`, `/sveltekit` | `.`, `/sveltekit` |
| `ComponentRegistry` | `.` | `.`, `/delivery`, `/delivery/data`, `/sveltekit` | `.`, `/sveltekit` |
| `IconSet` | `.` | `.`, `/delivery`, `/delivery/data`, `/sveltekit` | `.`, `/sveltekit` |
| `IslandRegistry` | `/islands` | `.`, `/delivery`, `/delivery/data`, `/islands` | `.`, `/islands` |
| `MediaRef` | `/media` | `.`, `/delivery`, `/delivery/data`, `/media`, `/sveltekit` | `.`, `/delivery`, `/media`, `/sveltekit` |
| `MediaResolve` | `.` | `.`, `/delivery`, `/delivery/data`, `/media`, `/sveltekit` | `.`, `/delivery`, `/media`, `/sveltekit` |
| `NavLayout` | `/sveltekit` | `.`, `/delivery`, `/delivery/data`, `/sveltekit` | `.`, `/sveltekit` |
| `NavLayoutEngineRef` | `/sveltekit` | `.`, `/delivery`, `/delivery/data`, `/sveltekit` | `.`, `/sveltekit` |
| `NavLayoutEntry` | `/sveltekit` | `.`, `/delivery`, `/delivery/data`, `/sveltekit` | `.`, `/sveltekit` |
| `NavLayoutSection` | `/sveltekit` | `.`, `/delivery`, `/delivery/data`, `/sveltekit` | `.`, `/sveltekit` |
| `NavMenuConfig` | `.` | `.`, `/delivery`, `/delivery/data`, `/sveltekit` | `.`, `/sveltekit` |
| `PreviewConfig` | `.` | `.`, `/delivery`, `/delivery/data`, `/sveltekit` | `.`, `/sveltekit` |
| `SenderConfig` | `.` | `.`, `/delivery`, `/delivery/data`, `/sveltekit` | `.`, `/sveltekit` |
| `SiteRender` | `.` | `.`, `/delivery`, `/delivery/data` | `.`, `/delivery` |
| `SlotDef` | `.` | `.`, `/delivery`, `/delivery/data`, `/sveltekit` | `.`, `/sveltekit` |
| `VariantSpec` | `/media` | `.`, `/delivery`, `/delivery/data`, `/media`, `/sveltekit` | `.`, `/media`, `/sveltekit` |

`SiteRender`, `MediaResolve`, and `MediaRef` are the one place the layered pair diverges:
`PublicRoutesConfig.render` and its `resolveMedia` name all three, so `/delivery` now exports them
directly instead of inheriting them from `/delivery/data`.

The other 96 keeps did not move. Every publication each of them carries is required by the R4
closure on that subpath, judged pre-narrowing, and is now recorded rather than merely present. That
is the honest result of executing R-1 before R-2: the closure is what justifies the duplication,
and narrowing the closure is foundations B's job, not this pass's.

## Unmoved by verdict

**Reshape (3), home settles when the conventions pass reshapes them:** `AuthBranding`
(`audit-adapter-authbranding`), `PublishActionsConfig` (`audit-adapter-publishactionsconfig`),
`MediaEntry` (`audit-sveltekit-mediaentry`).

**Retire (5), deleted in place by the retires pass:** `AI_CRAWLERS`, `AI_CRAWLERS_REVIEWED`,
`AiCrawler`, `feedView`, `unlistedRoutes`. All five publish only from the `/delivery` pair, so the
layered-pair record covers them and no per-name entry was written.

## The recorded R4 re-export set (120)

The machine-readable copy is `scripts/checks/check-surface-reexports.json`, which the gate reads;
this table is the same data for a reader. `check:surface` fails an unrecorded duplicate, an entry
whose subpath no longer publishes the name, and an entry whose stated `home` is not the subpath the
surface leaves declaring it, so the set shrinks as later slices narrow rather than outliving them
and the `home` column stays a checked claim rather than a comment.

Two of the 120 carry no R4 justification: `PublishActionsConfig` and `PublishActionEntry` on
`/delivery/data`, which survive on the move rule that holds a reshape in place rather than on the
closure. They are named as such in their own rows, so a later reader does not have to rediscover
that the closure never asked for them.

| Name | Canonical home | Re-exporting subpath | Why it survives |
|---|---|---|---|
| `IslandRegistry` | `/islands` | `.` | R4 closure: `CairnAdapter` names it on this subpath. |
| `MediaRef` | `/media` | `.` | R4 closure: `MediaResolve` names it on this subpath. |
| `NavLayout` | `/sveltekit` | `.` | R4 closure: `CairnAdapter`, `CairnRuntime` name it on this subpath. |
| `NavLayoutEngineRef` | `/sveltekit` | `.` | R4 closure: `NavLayout`, `NavLayoutSection` name it on this subpath. |
| `NavLayoutEntry` | `/sveltekit` | `.` | R4 closure: `NavLayout`, `NavLayoutSection` name it on this subpath. |
| `NavLayoutSection` | `/sveltekit` | `.` | R4 closure: `NavLayout` names it on this subpath. |
| `PublishActionEntry` | `/sveltekit` | `.` | R4 closure: `PublishActionsConfig` names it on this subpath. |
| `PublishActionsConfig` | `/sveltekit` | `.` | R4 closure: `CairnAdapter`, `CairnRuntime` name it on this subpath. Reshape audit-adapter-publishactionsconfig is open, so its home is provisional. |
| `VariantSpec` | `/media` | `.` | R4 closure: `AssetConfig`, `CairnRuntime` name it on this subpath. |
| `RateLimitLike` | `/cloudflare` | `/auth-channel` | R4 closure: `AuthChannelConfig` names it on this subpath. |
| `MediaRef` | `/media` | `/delivery` | R4 closure: `MediaResolve` names it on this subpath. |
| `MediaResolve` | `.` | `/delivery` | R4 closure: `PublicRoutesConfig`, `EntryDataOverrides`, `SiteRender` name it on this subpath. |
| `SiteRender` | `.` | `/delivery` | R4 closure: `PublicRoutesConfig` names it on this subpath. |
| `AiPosture` | `.` | `/delivery/data` | R4 closure: `buildRobots`, `robotsResponse` name it on this subpath. |
| `ArrayField` | `.` | `/delivery/data` | R4 closure: `FieldDescriptor` names it on this subpath. |
| `BehaviorTable` | `.` | `/delivery/data` | R4 closure: `Fieldset` names it on this subpath. |
| `BooleanField` | `.` | `/delivery/data` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `CairnRef` | `.` | `/delivery/data` | R4 closure: `LinkResolve`, `ManifestEntry` name it on this subpath. |
| `ConceptConfig` | `.` | `/delivery/data` | R4 closure: `ConceptDescriptor`, `SiteIndexes` name it on this subpath. |
| `ConceptDescriptor` | `.` | `/delivery/data` | R4 closure: `resolveReferences`, `siteDescriptors`, `feedView` name it on this subpath. |
| `DateField` | `.` | `/delivery/data` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `DatePrefix` | `.` | `/delivery/data` | R4 closure: `ConceptConfig`, `ConceptDescriptor` name it on this subpath. |
| `DatetimeField` | `.` | `/delivery/data` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `EmailField` | `.` | `/delivery/data` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `FieldBehavior` | `.` | `/delivery/data` | R4 closure: `Fieldset`, `BehaviorTable` name it on this subpath. |
| `FieldDescriptor` | `.` | `/delivery/data` | R4 closure: `ConceptDescriptor`, `NamedField`, `ObjectField` name it on this subpath. |
| `Fieldset` | `.` | `/delivery/data` | R4 closure: `ConceptConfig`, `ConceptDescriptor`, `InferFieldset` name it on this subpath. |
| `FragmentResolve` | `.` | `/delivery/data` | R4 closure: `buildFragmentResolver` names it on this subpath. |
| `IconField` | `.` | `/delivery/data` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `ImageField` | `.` | `/delivery/data` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `InferFieldset` | `.` | `/delivery/data` | R4 closure: `SiteIndexes` names it on this subpath. |
| `LinkResolve` | `.` | `/delivery/data` | R4 closure: `buildLinkResolver` names it on this subpath. |
| `Manifest` | `.` | `/delivery/data` | R4 closure: `buildSiteManifest`, `newlyPublishedEntries`, `parseManifest` name it on this subpath. |
| `ManifestEntry` | `.` | `/delivery/data` | R4 closure: `newlyPublishedEntries`, `Manifest` name it on this subpath. |
| `MultiselectField` | `.` | `/delivery/data` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `NamedField` | `.` | `/delivery/data` | R4 closure: `ConceptDescriptor` names it on this subpath. |
| `NumberField` | `.` | `/delivery/data` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `ObjectField` | `.` | `/delivery/data` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `PublishActionEntry` | `/sveltekit` | `/delivery/data` | Not closure-justified either: it rides the held `PublishActionsConfig` below. Both leave this subpath when that reshape lands. |
| `PublishActionsConfig` | `/sveltekit` | `/delivery/data` | **Not closure-justified.** Nothing this subpath publishes names it; it survives on the move rule that holds a reshape in place (`audit-adapter-publishactionsconfig` is open). Its removal belongs to that reshape. |
| `ReferenceEdge` | `.` | `/delivery/data` | R4 closure: `ManifestEntry` names it on this subpath. |
| `ReferenceField` | `.` | `/delivery/data` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `RoutingRule` | `.` | `/delivery/data` | R4 closure: `ConceptDescriptor` names it on this subpath. |
| `SelectField` | `.` | `/delivery/data` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `SiteConfig` | `.` | `/delivery/data` | R4 closure: `createSiteIndexes`, `siteDescriptors`, `buildSiteManifest` name it on this subpath. |
| `TextareaField` | `.` | `/delivery/data` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `TextField` | `.` | `/delivery/data` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `TidyConfig` | `.` | `/delivery/data` | R4 closure: `SiteConfig` names it on this subpath. |
| `TidyConventions` | `.` | `/delivery/data` | R4 closure: `TidyConfig` names it on this subpath. |
| `UrlField` | `.` | `/delivery/data` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `ValidationIssue` | `.` | `/delivery/data` | R4 closure: `ValidationResult` names it on this subpath. |
| `ValidationResult` | `.` | `/delivery/data` | R4 closure: `ConceptDescriptor`, `Fieldset` name it on this subpath. |
| `VocabularyEntry` | `.` | `/delivery/data` | R4 closure: `SiteConfig` names it on this subpath. |
| `AssetConfig` | `.` | `/media` | R4 closure: `normalizeAssets` names it on this subpath. |
| `MediaResolve` | `.` | `/media` | R4 closure: `buildMediaResolver` names it on this subpath. |
| `ComponentContext` | `.` | `/render` | R4 closure: `strAttr` names it on this subpath. |
| `AccessMap` | `.` | `/sveltekit` | R4 closure: `AuthGuardOptions`, `ResolveNavLayoutOptions`, `CairnEvent` name it on this subpath. |
| `ArrayField` | `.` | `/sveltekit` | R4 closure: `FieldDescriptor` names it on this subpath. |
| `AssetConfig` | `.` | `/sveltekit` | R4 closure: `CairnRuntime` names it on this subpath. |
| `AuthBranding` | `.` | `/sveltekit` | R4 closure: `AuthRoutesConfig` names it on this subpath. Reshape audit-adapter-authbranding is open, so its home is provisional. |
| `Backend` | `.` | `/sveltekit` | R4 closure: `CairnEvent`, `BackendProvider` name it on this subpath. |
| `BackendProvider` | `.` | `/sveltekit` | R4 closure: `CairnRuntime` names it on this subpath. |
| `BehaviorTable` | `.` | `/sveltekit` | R4 closure: `Fieldset`, `ComponentDef` name it on this subpath. |
| `BooleanField` | `.` | `/sveltekit` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `CairnEnv` | `.` | `/sveltekit` | R4 closure: `requireSession`, `requireOwner`, `requireEditor` name it on this subpath. |
| `CairnRef` | `.` | `/sveltekit` | R4 closure: `LinkResolve` names it on this subpath. |
| `CairnRuntime` | `.` | `/sveltekit` | R4 closure: `createContentRoutes`, `previewLoad`, `createMediaRoute` name it on this subpath. |
| `Capability` | `.` | `/sveltekit` | R4 closure: `EditorsData`, `AdminShellData`, `RoleDeclaration` name it on this subpath. |
| `CommitAuthor` | `.` | `/sveltekit` | R4 closure: `Backend` names it on this subpath. |
| `ComponentContext` | `.` | `/sveltekit` | R4 closure: `ComponentDef` names it on this subpath. |
| `ComponentDef` | `.` | `/sveltekit` | R4 closure: `ComponentRegistry` names it on this subpath. |
| `ComponentRegistry` | `.` | `/sveltekit` | R4 closure: `CairnRuntime` names it on this subpath. |
| `ConceptDescriptor` | `.` | `/sveltekit` | R4 closure: `CairnRuntime` names it on this subpath. |
| `DateField` | `.` | `/sveltekit` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `DatetimeField` | `.` | `/sveltekit` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `Editor` | `.` | `/sveltekit` | R4 closure: `requireSession`, `requireOwner`, `requireEditor` name it on this subpath. |
| `EmailAttachment` | `.` | `/sveltekit` | R4 closure: `MagicLinkMessage` names it on this subpath. |
| `EmailField` | `.` | `/sveltekit` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `EmailRecipient` | `.` | `/sveltekit` | R4 closure: `MagicLinkMessage` names it on this subpath. |
| `EmailSender` | `.` | `/sveltekit` | R4 closure: `CairnEnv`, `CairnPlatformBindings` name it on this subpath. |
| `FieldBehavior` | `.` | `/sveltekit` | R4 closure: `Fieldset`, `BehaviorTable` name it on this subpath. |
| `FieldDescriptor` | `.` | `/sveltekit` | R4 closure: `NamedField`, `ConceptDescriptor`, `ObjectField` name it on this subpath. |
| `Fieldset` | `.` | `/sveltekit` | R4 closure: `ConceptDescriptor`, `ComponentDef` name it on this subpath. |
| `FileChange` | `.` | `/sveltekit` | R4 closure: `Backend` names it on this subpath. |
| `FragmentResolve` | `.` | `/sveltekit` | R4 closure: `CairnRuntime` names it on this subpath. |
| `IconField` | `.` | `/sveltekit` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `IconSet` | `.` | `/sveltekit` | R4 closure: `CairnRuntime`, `ComponentDef` name it on this subpath. |
| `ImageField` | `.` | `/sveltekit` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `LinkResolve` | `.` | `/sveltekit` | R4 closure: `CairnRuntime` names it on this subpath. |
| `MagicLinkMessage` | `.` | `/sveltekit` | R4 closure: `SendMagicLink`, `EmailSender` name it on this subpath. |
| `MediaEntry` | `/media` | `/sveltekit` | R4 closure: `UploadResult` names it on this subpath. Reshape audit-sveltekit-mediaentry is open, so its home is provisional. |
| `MediaLibraryEntry` | `/admin-toolkit` | `/sveltekit` | R4 closure: `EditData`, `MediaLibraryData` name it on this subpath. |
| `MediaRef` | `/media` | `/sveltekit` | R4 closure: `MediaResolve` names it on this subpath. |
| `MediaResolve` | `.` | `/sveltekit` | R4 closure: `CairnRuntime` names it on this subpath. |
| `MultiselectField` | `.` | `/sveltekit` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `NamedField` | `.` | `/sveltekit` | R4 closure: `EditData`, `ConceptDescriptor` name it on this subpath. |
| `NavMenuConfig` | `.` | `/sveltekit` | R4 closure: `CairnRuntime` names it on this subpath. |
| `NavNode` | `.` | `/sveltekit` | R4 closure: `NavLoadData` names it on this subpath. |
| `NumberField` | `.` | `/sveltekit` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `ObjectField` | `.` | `/sveltekit` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `PreviewConfig` | `.` | `/sveltekit` | R4 closure: `CairnRuntime`, `ResolvedPreview` name it on this subpath. |
| `RateLimitLike` | `/cloudflare` | `/sveltekit` | R4 closure: `SectionActionConfig` names it on this subpath. |
| `ReferenceField` | `.` | `/sveltekit` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `RepoFile` | `.` | `/sveltekit` | R4 closure: `Backend` names it on this subpath. |
| `RoleDeclaration` | `.` | `/sveltekit` | R4 closure: `RolesDeclaration` names it on this subpath. |
| `RolesDeclaration` | `.` | `/sveltekit` | R4 closure: `AuthGuardOptions`, `EditorRoutesOptions`, `CairnRuntime` name it on this subpath. |
| `RoutingRule` | `.` | `/sveltekit` | R4 closure: `ConceptDescriptor` names it on this subpath. |
| `SelectField` | `.` | `/sveltekit` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `SenderConfig` | `.` | `/sveltekit` | R4 closure: `CairnRuntime` names it on this subpath. |
| `SendMagicLink` | `.` | `/sveltekit` | R4 closure: `AuthRoutesConfig` names it on this subpath. |
| `SlotDef` | `.` | `/sveltekit` | R4 closure: `ComponentDef` names it on this subpath. |
| `TextareaField` | `.` | `/sveltekit` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `TextField` | `.` | `/sveltekit` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `TidyConfig` | `.` | `/sveltekit` | R4 closure: `CairnRuntime` names it on this subpath. |
| `TidyConventions` | `.` | `/sveltekit` | R4 closure: `EditData`, `SettingsData`, `TidyConfig` name it on this subpath. |
| `UrlField` | `.` | `/sveltekit` | R4 closure: `FieldDescriptor`, `ArrayField` name it on this subpath. |
| `ValidationIssue` | `.` | `/sveltekit` | R4 closure: `ValidationResult` names it on this subpath. |
| `ValidationResult` | `.` | `/sveltekit` | R4 closure: `ConceptDescriptor`, `Fieldset` name it on this subpath. |
| `VariantSpec` | `/media` | `/sveltekit` | R4 closure: `CairnRuntime`, `AssetConfig` name it on this subpath. |
| `VocabularyEntry` | `.` | `/sveltekit` | R4 closure: `VocabularyLoadData`, `CairnRuntime` name it on this subpath. |

Plus one layered pair, which needs no per-name entries: `/delivery` over `/delivery/data`, one home
over one source tree.

## The gate can go red (demonstrated, 2026-08-29)

A gate nobody has watched fail is a gate nobody has tested. Appending
`export type { SiteRender } from '../content/types.js';` to `src/lib/media/index.ts` and running
`npm run check:surface` against that tree exits 1 with:

```
check-surface: the canonical-home rule failed.
  + duplicate SiteRender publishes from ., /media with no recorded home
```

Removing the line returns the gate to `check-surface: OK (surface matches the committed snapshot)`,
exit 0.

The `--update` regeneration is gated by the same rule, so a duplicate cannot be written into the
golden and left for the next plain run to find. With the same injected line, `npm run check:surface
-- --update` exits 1 with the same message, and `git status docs/internal/api-surface.md` reports
the golden unchanged.

The record's own `home` field is checked against the surface, not taken on trust. Editing the
`MediaResolve` entry at `/media` to claim `"home": "/media"` and running the gate exits 1 with:

```
check-surface: the canonical-home rule failed.
  ~ misfiled  MediaResolve is recorded with home /media but . is the subpath that declares it
```

Every injection was reverted; nothing from the demonstrations is committed. The unit tests
in `src/tests/unit/check-surface.test.ts` cover the rest of the rule's shape against a crafted
model: the pass case, a third publication of an already-recorded name, the layered pair and the
wider-only duplicate it does not excuse, a record entry the surface has outlived, a wrong `home`
string, a name whose every publication is recorded so nothing is left to be the home, and the
dropped name that is charged as stale once rather than twice.

## Known adjacent drift, not fixed here

`docs/reference/delivery-data.md`'s types table carries about fifteen rows for names
`/delivery/data` does not export and did not export before this pass (`AccessMap`, `Backend`,
`BackendProvider`, `CairnEnv`, `EmailSender`, `RolesDeclaration`, `RoleDeclaration`, `Capability`,
`RepoFile`, `CommitAuthor`, `FileChange`, `MagicLinkMessage`, `EmailAttachment`, `EmailRecipient`,
`PublishActionsConfig`'s neighbours). The reference-coverage gate is one-directional, so it does not
see them. Left for Task 3's drift sweep rather than folded in here, so the move set's diff stays
readable.
