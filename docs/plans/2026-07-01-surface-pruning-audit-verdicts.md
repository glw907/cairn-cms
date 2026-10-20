# Surface-pruning audit: verdict tables (2026-07-01)

The raw output of the adversarial surface audit (19 agents: consumer-import evidence over the showcase, ecxc-ski, and 907-life; one prosecutor per export subpath; an Opus defender re-trying every contested verdict; three shape auditors). Verdicts are post-defense finals. This file is evidence for `2026-07-01-surface-pruning-pass.md`, not a maintained doc.

```

## .
NOTE: This barrel welds a small genuine construction API onto a large mass of content-graph internals. The earned public surface is: the adapter/schema constructors (defineAdapter, defineConcept, fields, fieldset, initialValues-maybe, composeRuntime, defineRegistry, defineComponent, createRenderer, githubApp, parseSiteConfig, glyph), the read helpers a consumer actually calls on their own routes (parseMarkdown, extractMenu, extractVocabulary), and the types that name those constructors' signatures (CairnAdapter, ConceptConfig, CairnRuntime, ComposeInput, SiteRender, Fieldset/InferFieldset/FieldDescriptor, ComponentDef/ComponentRegistry, IconSet, RendererOptions, SiteConfig/NavNode/VocabularyEntry, AuthEnv, the backend seam, the auth-send injection contract). Everything else (the id helpers, the `cairn:` token grammar, the whole manifest-op cluster, the component-grammar/insert helpers, the admin-form decoders frontmatterFromForm/dateInputValue/serializeMarkdown, the nav/vocab MUTATORS setMenu/validateNavTree/validateVocabulary/setVocabulary, initialValues, the magic-link builders, and their attendant internal types) is plumbing that composeRuntime, the /sveltekit admin, the /delivery read surface, and the /vite plugin already encapsulate. Three tells confirm it: (1) the doc itself labels manifestEntryFromFile/manifestLinkResolver/remarkDirectiveStamp/rehypeDispatch "Low-level ... not part of the supported surface" and ConceptDescriptor "engine-internal" yet exports them anyway, which at beta freeze converts each into a permanent support promise; (2) SenderConfig is exported but wired to nothing in src (a dead type); (3) the doc claims "118 names" "leaked through export *" but index.ts is ~90 explicit named exports, so the export-star framing that once excused the leak is stale and the "for completeness" disclaimer does not remove the freeze promise. ResolvedReference is a duplicate: showcase already imports it from /delivery, its real home. Recommend curating the barrel down to the construction API + signature-naming types and pushing the manifest/link/id/component-grammar internals behind the subpaths that own them (or unexporting) before the freeze.
KEEP defineAdapter
KEEP defineConcept
KEEP composeRuntime
KEEP createRenderer
KEEP defineRegistry
KEEP defineComponent
KEEP fields
KEEP fieldset
KEEP githubApp
KEEP parseSiteConfig
KEEP glyph
KEEP parseMarkdown
KEEP extractMenu
KEEP extractVocabulary
DEMOTE initialValues [prosecution: demote, HOLDS]
  defense: Engine new-entry seed only; createCairnAdmin owns the new-entry flow and the custom-admin seam adds screens rather than replacing the entry editor. No consumer imports it. Demoting removes it from core.md.
DEMOTE normalizeConcepts [prosecution: demote, HOLDS]
  defense: Seam-1 normalizer that composeRuntime calls; the doc itself says a site rarely calls it directly. No consumer imports it.
DEMOTE findConcept [prosecution: demote, HOLDS]
  defense: Trivial lookup over runtime.concepts (a kept ConceptDescriptor[]); a developer can .find() themselves. No consumer imports it.
DEMOTE frontmatterFromForm [prosecution: demote, HOLDS]
  defense: Admin save-path form decoder; saving runs through createCairnAdmin's action, not consumer code. No consumer imports it.
DEMOTE dateInputValue [prosecution: demote, HOLDS]
  defense: Internal admin-form date coercion. No consumer imports it.
DEMOTE serializeMarkdown [prosecution: demote, HOLDS]
  defense: The write inverse of parseMarkdown; committing is the engine's job. parseMarkdown (kept) covers the read side a custom route needs; nothing writes markdown outside the commit pipeline. No consumer imports it.
DEMOTE isValidId [prosecution: demote, HOLDS]
  defense: Content-graph id validity check; consumers read permalinks off /delivery resolved references, not raw id helpers. No consumer imports it.
DEMOTE idFromFilename [prosecution: demote, HOLDS]
  defense: Filename/id conversion internal to the content graph. No consumer imports it.
DEMOTE filenameFromId [prosecution: demote, HOLDS]
  defense: Id/filename conversion internal to the content graph. No consumer imports it.
DEMOTE slugify [prosecution: demote, HOLDS]
  defense: Title-to-stem helper the engine uses internally at create time. No consumer imports it.
DEMOTE slugFromId [prosecution: demote, HOLDS]
  defense: Date-prefix stripping; the URL-identity model is engine-internal and consumers get permalinks from /delivery. No consumer imports it.
DEMOTE composeDatedId [prosecution: demote, HOLDS]
  defense: Dated-id composition owned by the commit path. No consumer imports it.
DEMOTE parseCairnToken [prosecution: demote, HOLDS]
  defense: cairn: grammar internal to the editor link picker and render pipeline; createRenderer resolves cairn: links for consumers. No consumer imports it.
DEMOTE formatCairnToken [prosecution: demote, HOLDS]
  defense: Inverse grammar written by the editor link picker. No consumer imports it.
DEMOTE extractCairnLinks [prosecution: demote, HOLDS]
  defense: Used by the manifest builder internally. No consumer imports it.
DEMOTE escapeLinkText [prosecution: demote, HOLDS]
  defense: Editor link-text escaping helper. No consumer imports it.
KEEP serializeManifest [prosecution: demote, REFUTED]
  defense: REFUTED. The /vite cairnManifest plugin's generated virtual module (src/lib/vite/index.ts) imports serializeManifest from the root specifier '@glw907/cairn-cms' and evaluates it inside the CONSUMER's Vite build (write mode: serializeManifest(built)). Every consumer using cairnManifest (showcase, ecxc-ski, 907-life) resolves this from the root barrel, so demoting it breaks the manifest regenerate path for all of them. Load-bearing root export.
DEMOTE parseManifest [prosecution: demote, HOLDS]
  defense: Read side of manifest I/O internal to the build/delivery corpus; the /vite plugin does not import it from root. No consumer imports it.
DEMOTE emptyManifest [prosecution: demote, HOLDS]
  defense: Internal starting-point helper; not in the vite plugin's root import. No consumer imports it.
KEEP verifyManifest [prosecution: unsure, REFUTED]
  defense: REFUTED. Two live reasons: (1) the /vite plugin's generated virtual module imports verifyManifest from the root specifier and calls it in verify mode inside every consumer's build, so it is not redundant with the plugin, it IS the plugin's engine; (2) 907-life imports it directly in content.ts (grep ground truth). The /vite overlap the prosecution worried about is precisely this function being the plugin's implementation, not a competing pattern. Demoting breaks the plugin for all consumers.
KEEP verifyReferences [prosecution: demote, REFUTED]
  defense: REFUTED. The /vite plugin's generated verify-mode source imports verifyReferences from the root specifier and calls it (references have no prerender backstop, so this is their only build-time integrity gate, and the comment in vite/index.ts explains it must live in the evaluated string where `built` is in scope). Documented in guides/link-content-with-references.md and upgrade-cairn.md as the reference build gate. Demoting breaks the plugin.
DEMOTE diffManifests [prosecution: demote, HOLDS]
  defense: Internal drift report; not imported by the vite plugin from root, not by any consumer. Confirmed archetypal content-graph internal.
DEMOTE upsertEntry [prosecution: demote, HOLDS]
  defense: Save patch over a manifest owned by the engine save path. No consumer imports it.
DEMOTE removeEntry [prosecution: demote, HOLDS]
  defense: Delete patch over a manifest owned by the engine delete path. No consumer imports it.
DEMOTE inboundLinks [prosecution: demote, HOLDS]
  defense: Delete-guard helper internal to the admin delete flow. No consumer imports it.
DEMOTE manifestEntryFromFile [prosecution: demote, HOLDS]
  defense: The doc already lists it under Low-level (not the supported surface); internal manifest builder. No consumer imports it.
DEMOTE manifestLinkResolver [prosecution: demote, HOLDS]
  defense: The doc already lists it under Low-level; manifest-backed resolver for the admin preview. No consumer imports it.
DEMOTE emptyValues [prosecution: demote, HOLDS]
  defense: Seeds a blank component form for the engine editor palette. No consumer imports it.
DEMOTE serializeComponent [prosecution: demote, HOLDS]
  defense: Editor component-grammar round-trip; the engine owns the component palette and the custom-admin seam adds screens rather than a replacement palette. No consumer imports it.
DEMOTE parseComponent [prosecution: demote, HOLDS]
  defense: Directive-to-form grammar internal to the editor. No consumer imports it.
DEMOTE validateComponent [prosecution: demote, HOLDS]
  defense: Editor directive validation. No consumer imports it.
DEMOTE buildComponentInsert [prosecution: demote, HOLDS]
  defense: Editor insert-flow helper; insertion is engine-owned. No consumer imports it.
DEMOTE generateComponentReference [prosecution: demote, HOLDS]
  defense: llms-full doc-gen helper. A developer could plausibly want to generate an AI reference for their own registry, but no consumer uses it and it is easily out of scope for the frozen surface; leanness favors demote. No consumer imports it.
DEMOTE remarkDirectiveStamp [prosecution: demote, HOLDS]
  defense: The barrel comment and doc Low-level list both state createRenderer's safe plugin ordering is the only public path; createRenderer already composes it. No consumer imports it.
DEMOTE requireOrigin [prosecution: demote, HOLDS]
  defense: Safe-origin read internal to the auth layer. A custom-auth developer (a supported seam) could want the forged-Host protection, but it is a few lines over env.PUBLIC_ORIGIN and the prosecution's point that a custom route reads PUBLIC_ORIGIN directly is sound. Marginal; demote for the frozen surface. No consumer imports it.
DEMOTE buildMagicLinkMessage [prosecution: demote, HOLDS]
  defense: A consumer supplying a custom SendMagicLink receives an already-built MagicLinkMessage rather than building one; called only inside auth-routes. No consumer imports it.
DEMOTE cloudflareSend [prosecution: demote, HOLDS]
  defense: Applied as the `send ?? cloudflareSend` default, so a non-customizing consumer never imports it and a customizing one supplies its own. A wrap-the-default use is possible but marginal. No consumer imports it.
DEMOTE setMenu [prosecution: demote, HOLDS]
  defense: Nav-editor YAML write path; consumers read nav via the kept extractMenu at build and write through the engine nav editor. No consumer imports it.
DEMOTE validateNavTree [prosecution: demote, HOLDS]
  defense: Untrusted-nav validator on the engine save path. No consumer imports it.
DEMOTE validateVocabulary [prosecution: demote, HOLDS]
  defense: Untrusted-vocabulary validator on the tag-admin save path; consumers read via the kept extractVocabulary. No consumer imports it.
DEMOTE setVocabulary [prosecution: demote, HOLDS]
  defense: Tag-admin YAML write path. No consumer imports it.
DEMOTE MAX_NAV_NODES [prosecution: demote, HOLDS]
  defense: Internal node-cap constant for the demoted validateNavTree. No consumer imports it.
DEMOTE NavValidationError [prosecution: demote, HOLDS]
  defense: Thrown only by the demoted validateNavTree on the internal nav-editor path; no consumer catches it. Unlike CommitConflictError it guards no public peer-boundary seam.
KEEP CommitConflictError [prosecution: unsure, REFUTED]
  defense: REFUTED. It is thrown by Backend.commit's fail-closed path (expectedHead), and Backend/BackendProvider are the kept, documented seam for alternative stores. The doc explicitly states the error classes are defined in the package so instanceof is reliable across the peer boundary. A developer implementing or calling the public Backend seam (documented as GitLab/Gitea/plain-git extensible) catches it by instanceof. Deliberate seam contract, keep.
KEEP SiteConfigError
KEEP Role
KEEP Editor
KEEP AuthEnv
KEEP AuthBranding
KEEP MagicLinkMessage
KEEP SendMagicLink
KEEP CairnAdapter
KEEP ConceptConfig
KEEP NamedField
KEEP ImageValue
KEEP ValidationResult
KEEP ValidationIssue
KEEP SenderConfig [prosecution: demote, REFUTED]
  defense: REFUTED on fact. The prosecution's premise ('referenced nowhere except its re-export; wired to no adapter member') is false: content/types.ts types CairnAdapter.email: SenderConfig (a required adapter member every consumer configures) and CairnRuntime.sender: SenderConfig. It is the exact same category as PreviewConfig and AssetConfig, which the prosecution left kept. Keep for parity; a developer writing a typed adapter helper names it.
KEEP NavMenuConfig [prosecution: unsure, REFUTED]
  defense: REFUTED for parity. It types CairnAdapter.editor.nav and CairnRuntime.navMenu, the sibling of editor.preview: PreviewConfig (kept). It is a live adapter member that points the nav editor at a YAML menu, documented in core.md. Marginal but keeping PreviewConfig while cutting NavMenuConfig is inconsistent; keep both or neither, and PreviewConfig stays.
KEEP PreviewConfig
DEMOTE ResolvedPreview [prosecution: demote, HOLDS]
  defense: Unlike SenderConfig/NavMenuConfig this is NOT an adapter member a consumer sets; it is the engine-internal Omit<PreviewConfig,'byConcept'> shape editLoad ships to the client. Consumers set PreviewConfig (kept), never ResolvedPreview. No consumer imports it.
KEEP AssetConfig
KEEP RoutingRule
KEEP ConceptDescriptor
KEEP ConceptUrlPolicy
KEEP CairnRuntime
KEEP SiteRender
KEEP ComposeInput
KEEP StandardInput
KEEP StandardSchemaV1
KEEP FieldDescriptor
DEMOTE TextField [prosecution: demote, HOLDS]
  defense: Arm of the kept FieldDescriptor union; consumers use fields.text and structural narrowing on `kind`, neither of which needs the arm exported. FieldDescriptor's declaration stays valid via same-module inlining. No consumer imports it.
DEMOTE TextareaField [prosecution: demote, HOLDS]
  defense: FieldDescriptor arm covered by fields.textarea plus kind-narrowing. No consumer imports it.
DEMOTE NumberField [prosecution: demote, HOLDS]
  defense: FieldDescriptor arm covered by fields.number plus narrowing. No consumer imports it.
DEMOTE SelectField [prosecution: demote, HOLDS]
  defense: FieldDescriptor arm covered by fields.select plus narrowing. No consumer imports it.
DEMOTE MultiselectField [prosecution: demote, HOLDS]
  defense: FieldDescriptor arm covered by fields.multiselect plus narrowing. No consumer imports it.
DEMOTE UrlField [prosecution: demote, HOLDS]
  defense: FieldDescriptor arm covered by fields.url plus narrowing. No consumer imports it.
DEMOTE EmailField [prosecution: demote, HOLDS]
  defense: FieldDescriptor arm covered by fields.email plus narrowing. No consumer imports it.
DEMOTE DateField [prosecution: demote, HOLDS]
  defense: FieldDescriptor arm covered by fields.date plus narrowing. No consumer imports it.
DEMOTE DatetimeField [prosecution: demote, HOLDS]
  defense: FieldDescriptor arm covered by fields.datetime plus narrowing. No consumer imports it.
DEMOTE BooleanField [prosecution: demote, HOLDS]
  defense: FieldDescriptor arm covered by fields.boolean plus narrowing. No consumer imports it.
DEMOTE IconField [prosecution: demote, HOLDS]
  defense: FieldDescriptor arm covered by fields.icon plus narrowing. No consumer imports it.
DEMOTE ImageField [prosecution: demote, HOLDS]
  defense: FieldDescriptor arm covered by fields.image plus narrowing; the stored ImageValue (kept) is what consumers actually read. No consumer imports it.
DEMOTE ObjectField [prosecution: demote, HOLDS]
  defense: FieldDescriptor container arm covered by fields.object plus narrowing. No consumer imports it.
DEMOTE ReferenceField [prosecution: demote, HOLDS]
  defense: FieldDescriptor arm covered by fields.reference plus narrowing. No consumer imports it.
DEMOTE ArrayField [prosecution: demote, HOLDS]
  defense: FieldDescriptor container arm covered by fields.array plus narrowing. No consumer imports it.
KEEP Fieldset
KEEP InferFieldset
KEEP FieldsetOptions
DEMOTE BehaviorTable [prosecution: demote, HOLDS]
  defense: The per-field behavior map inside FieldsetOptions; consumers pass behavior inline and never name the table. No consumer imports it.
DEMOTE FieldBehavior [prosecution: demote, HOLDS]
  defense: One entry in the behavior table, declared inline. No consumer imports it.
DEMOTE DatePrefix [prosecution: demote, HOLDS]
  defense: Consumers write the 'year'|'month'|'day' literal on defineConcept (ConceptConfig types the field); the type need not be imported, and its only function anchors (composeDatedId/slugFromId) are demoted. No consumer imports it.
KEEP CairnRef
KEEP LinkResolve
KEEP Manifest [prosecution: demote, REFUTED]
  defense: REFUTED. It is the parameter type of the kept, vite-consumed verifyManifest/verifyReferences/serializeManifest and the return type of the documented buildSiteManifest (/delivery/data). It is the one manifest type that needs a public home so a developer can annotate `const m: Manifest = buildSiteManifest(...)` for a custom regenerate/inspect script. Keep this anchor; its internal projections below can go.
DEMOTE ManifestEntry [prosecution: demote, HOLDS]
  defense: Element type of Manifest.entries, reachable structurally through the kept Manifest; no consumer names it and the kept manifest operations take a whole Manifest, not per-entry values. Same-module inlining keeps Manifest's declaration portable. No consumer imports it.
DEMOTE ManifestDiff [prosecution: demote, HOLDS]
  defense: Return of the demoted diffManifests. No consumer imports it.
DEMOTE ManifestEntryDiff [prosecution: demote, HOLDS]
  defense: Nested inside the demoted ManifestDiff. No consumer imports it.
DEMOTE LinkTarget [prosecution: demote, HOLDS]
  defense: Minimal entry view for the preview resolver/picker (admin-internal). No consumer imports it.
DEMOTE InboundLink [prosecution: demote, HOLDS]
  defense: Return of the demoted inboundLinks delete-guard helper. No consumer imports it.
DEMOTE InboundReference [prosecution: demote, HOLDS]
  defense: Inbound-referencer view for the delete guard; the public read model is ResolvedReference on /delivery, not this raw index shape. No consumer imports it.
DEMOTE ReferenceEdge [prosecution: demote, HOLDS]
  defense: Raw frontmatter edge inside ManifestEntry; consumers read the resolved edge (ResolvedReference on /delivery) via resolveReferences, not the raw edge. Documented in upgrade-cairn.md as a barrel addition, so demoting means updating that note. No consumer imports it.
RESHAPE ResolvedReference [prosecution: reshape, HOLDS]
  proposal: Drop ResolvedReference from the root barrel; keep it exported only from /delivery, its resolver's home, which is where showcase already imports it.
  defense: AGREED. The root re-export is a straight duplicate of the /delivery/site-resolver export; showcase and ecxc-ski already import it from /delivery, its resolver's home. Dropping the root duplicate breaks no real consumer (none import it from root) and belongs to routes, which live on the delivery surface. Before beta the dedup is free.
  consumersMust: Import ResolvedReference from '@glw907/cairn-cms/delivery' instead of the package root (no current consumer imports it from root).
KEEP ComponentDef
KEEP ComponentRegistry
DEMOTE SlotKind [prosecution: demote, HOLDS]
  defense: Slot-kind union inlined in SlotDef; consumers declare kind literals in defineComponent slots. No consumer imports it.
DEMOTE SlotDef [prosecution: demote, HOLDS]
  defense: Reachable through the kept ComponentDef.slots but declared inline by consumers in defineComponent; same-module inlining keeps ComponentDef portable. No consumer imports it.
DEMOTE ComponentValues [prosecution: demote, HOLDS]
  defense: Parameter to the demoted component-grammar/insert helpers. No consumer imports it.
DEMOTE ComponentValidation [prosecution: demote, HOLDS]
  defense: Return of the demoted validateComponent. No consumer imports it.
DEMOTE ComponentInsert [prosecution: demote, HOLDS]
  defense: Return of the demoted buildComponentInsert. No consumer imports it.
DEMOTE ReferenceOptions [prosecution: demote, HOLDS]
  defense: Options for the demoted generateComponentReference. No consumer imports it.
KEEP IconSet
KEEP RendererOptions
KEEP RepoFile [prosecution: demote, REFUTED]
  defense: REFUTED. RepoFile is in the public Backend interface signature: Backend.readEntries(dir, ref): Promise<RepoFile[]>. Backend/BackendProvider is the kept, documented seam explicitly advertised for alternative stores (GitLab/Gitea/plain git supplying their own provider). A developer implementing that seam must name RepoFile to type readEntries. Not internal-only; keep.
KEEP CommitAuthor [prosecution: demote, REFUTED]
  defense: REFUTED. CommitAuthor is in the public Backend interface signature: Backend.commit(branch, changes, author: CommitAuthor, ...). Same public seam as RepoFile; a developer implementing a custom BackendProvider must name CommitAuthor to type commit. Keep.
KEEP Backend
KEEP BackendProvider
KEEP GithubAppProvider
KEEP BackendEnv
KEEP FileChange
KEEP NavNode
KEEP SiteConfig
KEEP VocabularyEntry

## ./sveltekit
NOTE: The subpath cleanly splits into two tiers of evidence. The single-mount facade (createCairnAdmin, createAuthGuard, requireSession/requireOwner, healthLoad, createMediaRoute) plus the full AdminData/AdminShellData satellite family are strongly proven: every one of the 3 production consumers wires them, and the shipped /components UI (CairnAdmin.svelte, EditPage.svelte, ConceptList.svelte, CairnMediaLibrary.svelte, NavTree.svelte, HelpHome.svelte, LoginPage.svelte) dogfoods nearly all the associated *Data/*Failure types internally, confirming they are real, load-bearing shapes and not speculative. The second tier — the four 'advanced per-route seam' factories (createAuthRoutes, createEditorRoutes, createContentRoutes, createNavRoutes) and their exclusive Deps/Config/Event types — has zero proof anywhere: not one of the 3 production consumers uses them, and source-level verification (scripts/emit-template.mjs) confirms cairn's own scaffolder emits only the single-mount wiring, directly contradicting the design spec's characterization of this family as 'Scaffold API... generated by create-cairn-site.' They are real, tested, internally-composed code (createCairnAdmin is literally built from them), so cutting them outright would be premature, but freezing them at beta as a fully-promised alternate integration path overstates a path nothing exercises; the leanest fix is either to make the scaffolder actually prove one real use of the seam, or to visibly downgrade the doc's claims about it before the contract locks. Two smaller, concrete defects surfaced independently of any single export: (1) VocabularyLoadData is documented in the Types table but not actually exported from src/lib/sveltekit/index.ts, so a consumer following the doc's own advice would get a compile error; (2) SettingsData is a real, dogfooded (CairnTidySettings.svelte) member of the proven AdminData union — exactly as load-bearing as ListData/EditData/MediaLibraryData/NavLoadData — yet has no Types-table row and is not exported at all, an inconsistency with every sibling view. Both should be resolved (export what's missing, or delete the stale VocabularyLoadData doc row) before the reference-coverage gate's one-directional check (exported→documented, never documented→exported) lets either drift further."
KEEP createAuthGuard
KEEP requireSession
KEEP requireOwner
DEMOTE isPublicAdminPath [prosecution: demote, HOLDS]
  defense: I tried to save this and could not. The only 'seam' rationale in the record is the extensibility design spec (line 127), which says shellLoad reuses the guard's isPublicAdminPath 'rather than re-deriving the rule (the guard exports it...)' — that is module-level sharing between guard.ts, content-routes.ts, and the shell load, not a public-subpath promise. A developer's own /admin route (added via the adminNav seam) is a separate route file that is always gated; it never renders login/auth and the guard classifies public-vs-gated before it runs, so it answers no question a hand-authored route asks about itself. Zero consumers import it. Demoting it to an internal cross-module symbol is non-breaking and is exactly the pre-beta hygiene the audience lens calls for.
KEEP createAuthRoutes [prosecution: reshape, HOLDS]
  proposal: Before freeze, either wire create-cairn-site to actually emit a per-route mount for one real scenario (proving the seam) or correct the doc to stop calling it scaffold-generated and instead label it explicitly as an unproven, hand-authored escape hatch with no scaffolder support, so a beta consumer doesn't expect tooling that doesn't exist.
  defense: The prosecution's substantive point is correct and I concede it: the 'Scaffold API' tier is defined in the 2026-06-28 design spec as 'generated by create-cairn-site,' but the scaffolder (scripts/emit-template.mjs) copies examples/showcase verbatim, and the showcase mounts createCairnAdmin (single mount) — it never emits a per-route mount. So the tier label overstates tooling that does not exist, and the doc even contradicts itself (tier says 'not hand-edited,' prose at lines 176-180 says 'a site that mounts routes by hand'). BUT that is a documentation defect, not an export defect. The function is real, tested, and is literally what createCairnAdmin is composed from; the per-route seam is a legitimate escape hatch for SvelteKit routing needs (per-route prerender/config) the single catch-all cannot express, and the prosecution itself says cutting is premature. The export holds unchanged; the fix is a non-breaking re-label from 'Scaffold API' to an honest 'advanced, hand-authored, not scaffolder-emitted' tier.
KEEP AuthRoutesConfig [prosecution: reshape, REFUTED]
  proposal: Bundle with the createAuthRoutes reshape; if that factory's promise is corrected/tempered, this config type moves with it.
  defense: Refuted. This is the required config parameter type of createAuthRoutes, which I am keeping public. A site on the documented hand-mount path calls createAuthRoutes({ branding, send }) and needs AuthRoutesConfig to type that argument object in its own route file. 'No independent proven use' is true but irrelevant for a companion type whose whole job is to name a kept export's signature — demoting it would leave createAuthRoutes' public parameter unnameable under declaration emit. It travels with the factory and stays.
KEEP RequestResult [prosecution: reshape, HOLDS]
  proposal: Type LoginPage.svelte's `form` prop as `RequestResult | null` directly instead of a hand-duplicated inline shape, so the shipped component proves and enforces the exported type before it's frozen.
  defense: The dogfooding gap is real and the proposed fix is good: requestAction returns Promise<RequestResult> (auth-routes.ts:59), yet the shipped LoginPage.svelte (line 22) hand-duplicates a looser inline shape `{ sent?: boolean; status?: 'sent'|'send_error'|'throttled' } | null` instead of typing its form prop as `RequestResult | null`, so nothing enforces the two stay in sync. Wiring LoginPage to the exported type is a strictly-internal, non-breaking improvement that makes the engine prove the contract before it freezes. The export itself is correct and stays; only the reference component's prop typing should change. Worth doing before beta precisely because it is free.
KEEP createEditorRoutes [prosecution: reshape, HOLDS]
  proposal: Same as createAuthRoutes: correct the 'scaffold-generated' claim or demonstrate it with a real scaffolded example before beta freeze.
  defense: Same disposition as createAuthRoutes. The evidence (zero consumer use, not scaffolder-emitted, only composed internally by createCairnAdmin) supports the doc-tier correction, not an export change. The editor-management per-route seam is a valid hand-mount escape hatch and the function is real, tested, composed code. Export holds; re-label the tier honestly (non-breaking, no consumersMust).
KEEP createContentRoutes [prosecution: reshape, HOLDS]
  proposal: Same as createAuthRoutes/createEditorRoutes. Given the size, this is the highest-priority one to either validate with a real scaffolded example or explicitly de-promise before beta.
  defense: Same disposition, with the caveat that this is the largest surface (26 methods) so the doc honesty matters most here. The 'Scaffold API' label is wrong for the same verified reason. But the export must stay: createCairnAdmin is built directly on it, and the single catch-all genuinely cannot express per-route SvelteKit config, so the hand-mount seam is real. I considered the aggressive-lean alternative — demoting the whole factory family and promising only createCairnAdmin — but that is a bigger cut than the prosecution made, and the doc-honesty fix resolves the actual defect without breaking the documented advanced seam. Export holds; correct the tier and reconcile the internal contradiction between the tier label and the 'mount by hand' prose.
KEEP createMediaRoute
KEEP createNavRoutes [prosecution: reshape, HOLDS]
  proposal: Same as createAuthRoutes/createEditorRoutes/createContentRoutes.
  defense: Same disposition as the other three factories: verified zero consumer use and no scaffolder emission support the doc-tier correction, not a demotion. The nav per-route seam is real and composed by createCairnAdmin. Export holds; re-label honestly (non-breaking).
KEEP NavLoadData
KEEP NavPageOption
DEMOTE NavRoutesDeps [prosecution: demote, HOLDS]
  defense: Conceded. Source-verified (nav-routes.ts:29-35): the interface's sole field is `backend?: Backend`, and its own doc says a test injects it 'so the read and commit paths run with no real token mint.' Unlike ContentRoutesDeps there is no production knob left after the test seam, and createCairnAdmin's CairnAdminDeps has no forwarding field for it, so no production path reaches it. A production hand-mounter calls createNavRoutes(runtime) with no deps; the optional second param stays structurally callable without the exported type. Pure test plumbing, zero consumers — demote to an internal test-support type. Non-breaking.
DEMOTE parseAdminPath [prosecution: demote, HOLDS]
  defense: I gave this the strongest hand-mount defense I could and it fails. cairn's supported extension model is: cairn owns /admin/[...path], and a developer adds SEPARATE /admin/<their-route> files, whose href is validated against parseAdminPath for collisions at compose time (admin-nav.ts). The developer therefore never calls parseAdminPath at runtime — the collision check runs inside the engine when the runtime composes. A single-mount site uses createCairnAdmin, which calls it internally; a hand-mount site uses SvelteKit's own file routing, not a shared parser. The one imagined use (a partial custom catch-all that delegates some paths to cairn) is undocumented and not the supported model. Extension-API tier or not, zero consumers import it. Demote (with AdminView). Non-breaking.
DEMOTE AdminView [prosecution: demote, HOLDS]
  defense: Conceded, travels with parseAdminPath. Its sole role is that function's return type; it appears in no other kept export's public signature (createCairnAdmin's returned types name AdminData, not AdminView). With parseAdminPath demoted, AdminView has no public purpose. Zero consumers. Demote alongside it. Non-breaking.
KEEP AdminNavEntry
KEEP AdminNavIcon
KEEP ResolvedNavEntry
KEEP createCairnAdmin
KEEP CairnAdminDeps
KEEP AdminData
KEEP healthLoad
KEEP HealthData
KEEP NavConcept
KEEP AdminShellData
KEEP EntrySummary
KEEP ListData
KEEP EditData
KEEP AdvisoryNotice
KEEP AdvisoryAction
KEEP HelpData
KEEP MediaUsageInfo
KEEP MediaLibraryData
KEEP ContentEvent [prosecution: reshape, REFUTED]
  proposal: Bundle with the createContentRoutes/createNavRoutes reshape; if that family's promise narrows, this type narrows with it rather than staying independently frozen.
  defense: Refuted. ContentEvent is the declared parameter type of every function returned by createContentRoutes AND createNavRoutes (content-routes.ts:340, used across listLoad/editLoad/saveAction/etc.). Since I am keeping both factories public, ContentEvent is structurally load-bearing: it names their public signatures under TypeScript declaration emit, so demoting it would make the kept factories' returned function types unnameable. That it is 'structural — a real RequestEvent satisfies it' is exactly why a consumer never constructs one, but it must still be exported so the .d.ts for the kept factories is self-consistent. It is not an independent test bridge like NavRoutesDeps; it is a signature type. Keep.
RESHAPE ContentRoutesDeps [prosecution: reshape, HOLDS]
  proposal: Remove `backend` from the publicly exported ContentRoutesDeps interface; keep it as an internal-only test seam (declared directly in content-routes.ts's own test-support code, not re-exported), while keeping `anthropic` and `tidyTimeoutMs` on the public type since those are proven, production-relevant knobs.
  defense: Conceded, and the split is correct. Verified: showcase imports this specifically to type `ContentRoutesDeps['anthropic']` (cairn.server.ts:6,21) — real, proven use of the anthropic knob on the canonical single-mount path, so the type earns keep. But `backend?: Backend` is a different animal: its own doc line says 'tests inject a Backend so the read and commit paths run with no real token mint,' and createCairnAdmin's CairnAdminDeps deliberately omits any backend override (the dev double rides event.locals.backend, not a dep), confirming no production path reaches it. Removing `backend` from the public interface — keeping it as an internal test-support declaration in content-routes.ts — is non-breaking (showcase uses ['anthropic'], no consumer touches ['backend']) and removes test plumbing from a frozen contract. Keep anthropic and tidyTimeoutMs; narrow the type.
KEEP SaveFailure
KEEP DeleteRefusal
KEEP RenameFailure
KEEP MediaDeleteRefusal
KEEP MediaUpdateFailure
KEEP MediaReplaceFailure
KEEP MediaAltPropagateFailure
KEEP MediaBulkFailure
KEEP ContentFormFailure
KEEP UploadResult
KEEP CookieJar
KEEP HandleInput
KEEP RequestContext
KEEP BackendEnv [prosecution: reshape, HOLDS]
  proposal: Correct the source comment/doc rationale to name the real justification (healthLoad's declared event-env parameter), and resolve the root-vs-/sveltekit duplication the same way proposed for AuthEnv.
  defense: The type earns keep — it is healthLoad's declared `event.platform.env` parameter type (health.ts / sveltekit.md:508-511), a kept export's signature — so I am not removing it. But the prosecution's narrower point is verified and I concede it: the source comment's stated rationale ('so the consumer's app.d.ts Platform block can name it') is not dogfooded — showcase's app.d.ts hand-declares GITHUB_APP_ID/INSTALLATION_ID/PRIVATE_KEY_B64 directly and never spreads BackendEnv. The honest rationale is 'names healthLoad's event env.' Correcting that comment and the root-vs-/sveltekit note is a non-breaking doc fix (no consumer imports BackendEnv from either subpath). Export holds at both subpaths; fix the stated reason.
KEEP AuthEnv [prosecution: reshape, HOLDS]
  proposal: Pick one canonical subpath for AuthEnv (recommend /sveltekit, alongside BackendEnv, since both exist specifically to serve app.d.ts Platform typing and healthLoad), keep the root copy only as an explicitly-documented compatibility alias, and state the canonical subpath unambiguously in both the core.md and sveltekit.md reference pages so downstream site comments stop diverging.
  defense: The ambiguity is real: AuthEnv is exported from BOTH root (src/lib/index.ts, alongside Role/Editor) and /sveltekit, showcase imports it from /sveltekit (and genuinely uses `AuthEnv['EMAIL']` in its Platform block), while ecxc-ski and 907-life import the identical type from root — and both sites carry contradictory comments each claiming its own subpath is canonical, one demonstrably wrong. That is worth resolving before the convention hardens. BUT the resolution must NOT remove either export: root serves ecxc-ski and 907-life, /sveltekit serves showcase, so dropping either copy breaks a live consumer, and the prosecution's own proposal already keeps the root copy as an alias. So no export changes and no consumer migrates. The dual export is a legitimate ergonomic (import from the subpath you are wiring); the actual defect is the contradictory comments in consumer code plus missing engine guidance. Keep both; state one recommended import site (/sveltekit, colocated with BackendEnv and healthLoad) unambiguously in core.md and sveltekit.md so downstream comments stop diverging. Non-breaking.

## ./components
NOTE: The barrel cleanly splits into two tiers the reference doc itself names: 'Page-level components' (11: CairnAdmin, CairnAdminShell, LoginPage, ConfirmPage, ConceptList, CairnMediaLibrary, EditPage, ManageEditors, NavTree, CairnTidySettings, HelpHome) and 'Composed components' (7: MarkdownEditor, ComponentInsertDialog, ComponentForm, IconPicker, LinkPicker, DeleteDialog, RenameDialog), plus CsrfField as a standalone seam. The page-level tier earns its place twice over: CairnAdmin/CairnAdminShell/CsrfField have real production usage across all three consumers, and the rest pair one-to-one with the public /sveltekit route factories (createAuthRoutes, createContentRoutes, createEditorRoutes, createNavRoutes) and named actions documented in admin-routes.md's actions-vocabulary table, so 'per-route mounting (advanced)' is a genuine, worked, charter-consistent second integration tier (the extending-developer lens's 'interpose on one surface'), not vestigial prose. The 'Composed components' tier is a different story: the doc's own heading text ('so you don't wire them directly... for completeness') is a confession, most have no route/action pairing and are used by exactly one parent internally (ComponentForm only inside ComponentInsertDialog, IconPicker only inside ComponentForm/FieldInput), and the engine deliberately keeps the adjacent toolbar component internal for the same composition reasons argued here for keeping these public, an inconsistency that undercuts the 'for completeness' rationale. The worst single item in the slice is undocumented entirely: docs/reference/components.md never mentions spellcheck, yet package.json ships `./components/spellcheck-worker` and two `./components/spellcheck-assets/*` binary-asset subpaths as frozen public exports. MarkdownEditor's own spellcheck.ts resolves the worker and both assets via a relative `new URL('./spellcheck-worker.js', import.meta.url)` construction, so no real consumer import of these subpaths is needed for the documented flow; the only usage found anywhere (showcase's src/routes/spike/spellcheck/+page.svelte) is leftover scaffolding from the original delivery go/no-go spike, not a production integration.
KEEP CairnAdmin
KEEP CairnAdminShell
KEEP LoginPage
KEEP ConfirmPage
KEEP CsrfField
KEEP ConceptList
KEEP CairnMediaLibrary
KEEP CairnTidySettings
KEEP HelpHome
KEEP EditPage
KEEP ManageEditors
KEEP NavTree
RESHAPE MarkdownEditor [prosecution: reshape, HOLDS]
  proposal: Keep MarkdownEditor exported for the bare-authoring-surface use case, but narrow the beta-stable contract to value, name, registerInsert, registerFormat, completionSources, focusMode, typewriter, and surface. Document the remaining EditPage-only wiring props as internal composition (not covered by the compatibility promise), or move them off the public prop signature entirely (a single non-exported options object EditPage passes internally) so a future EditPage change to its round-trip or media-library plumbing isn't a breaking change to the public component.
  defense: Grep truth: no consumer imports MarkdownEditor (all three sites import only CairnAdminShell/CairnAdmin/CsrfField from /components), and the sole internal caller is EditPage. But it is cairn's charter-named seam ('behind the MarkdownEditor seam') and is documented as a standalone bare authoring surface, both in components.md and repeatedly in the upgrade guide ('a site that renders MarkdownEditor directly, outside EditPage'). So a real-if-narrow standalone use is a first-class, documented promise, not an accident: keep it exported. The prosecution's real complaint survives, though: the ~dozen EditPage-wiring callbacks (registerReplaceRange, registerSelectRange, onComponentAtCaret, onMediaImageAtCaret, registerImagePlaceholders, registerInsertImage, onImageIngest, mediaLibrary, registerCaretCoords, registerFocusEditor, registerGetSelection, registerInsertLink) exist solely to let EditPage wire round-trip block editing, the media library, and the toolbar, and the doc itself concedes the toolbar is internal, yet stamps every one 'Extension API'. That over-commits a support tier on plumbing. Because EditPage imports MarkdownEditor by relative path (not the barrel) and is the ONLY caller, the reshape (collapse the wiring callbacks into a single non-exported internal composition object; keep value/name/registerInsert/registerFormat/completionSources/focusMode/typewriter/surface as the beta-frozen bare-surface contract) is entirely internal, breaks no consumer, gives the narrow standalone audience a comprehensible 8-prop surface, and is free to do now while breaking is cheap. The charter's leanness principle favors it and the migration cost is nil, so the reshape is worth doing before the freeze.
DEMOTE ComponentInsertDialog [prosecution: demote, HOLDS]
  defense: Grep confirms the only importer is EditPage.svelte; zero consumer imports across showcase, ecxc-ski, and 907-life. It is meaningful only paired with a live markdown-editor instance (an insert callback into caret position) plus the round-trip update seam, and the one editor to pair it with is itself internal-plumbing-heavy. The doc's own section header concedes 'These mount inside EditPage and its dialogs, so you don't wire them directly.' The 'custom admin surface' story cannot complete without rebuilding EditPage's toolbar, which the docs say stays internal, so there is no clean standalone integration. Per the charter this is engine internals, not a developer seam; the supported custom-admin seams are CairnAdminShell + adminNav + a custom route + CsrfField, none of which need this. Demote to internal before the freeze. No consumer imports it, so nothing breaks.
DEMOTE ComponentForm [prosecution: demote, HOLDS]
  defense: Grep confirms exactly one caller: ComponentInsertDialog.svelte. Zero consumer imports. It is plumbing two levels deep on the flat barrel, and its only justification in the doc is 'ComponentInsertDialog composes it.' With ComponentInsertDialog itself demoting, there is no scenario where a developer wants ComponentForm alone. Demote to internal. No consumer imports it, so nothing breaks.
DEMOTE IconPicker [prosecution: demote, HOLDS]
  defense: Grep confirms callers are ComponentForm.svelte and FieldInput.svelte only (FieldInput is not even exported). Zero consumer imports. It is a pure UI atom; cairn's model is that ComponentForm/FieldInput auto-render fields from the adapter's declared schema, so a developer never hand-assembles an icon field. Extra weight for demote: ROADMAP line 120 plans to merge FieldInput and IconPicker onto one leaf-field renderer, an internal refactor that a beta-frozen public IconPicker would obstruct. Demote to internal. No consumer imports it, so nothing breaks.
DEMOTE LinkPicker [prosecution: demote, HOLDS]
  defense: Grep confirms the only caller is EditPage.svelte; zero consumer imports. Like ComponentInsertDialog it needs a compatible live editor instance to do anything and ships with no route/action pairing. The decisive tell the prosecution flags is real: its sibling WebLinkDialog (also imported only by EditPage) is NOT exported from the barrel, so the barrel's own curation is inconsistent and LinkPicker's export was not a deliberate reusability decision. Demote to internal. No consumer imports it, so nothing breaks.
KEEP DeleteDialog
KEEP RenameDialog
DEMOTE ./components/spellcheck-worker (createSpellcheckHandler, OutboundMessage, SpellEngine) [prosecution: demote, HOLDS]
  proposal: Drop `./components/spellcheck-worker` from the public exports map (or mark it internal/unstable); MarkdownEditor already resolves the worker itself via a relative `new URL(..., import.meta.url)` that Vite picks up automatically in any consumer build.
  defense: Verified in src/lib/components/spellcheck.ts: MarkdownEditor builds the worker itself via createSpellWorker() = new Worker(new URL('./spellcheck-worker.js', import.meta.url)), the module-relative form Vite resolves inside dependencies, so no consumer ever needs this subpath. The only external reference is showcase's src/routes/spike/spellcheck/+page.svelte, a leftover go/no-go validation route, not production. It is absent from docs/reference/components.md AND escapes the check:reference gate entirely (the reference-coverage CONFIG lists /components but not /components/spellcheck-worker), so it is a frozen, undocumented, .d.ts-backed public subpath of Worker-internal message types. Pure implementation detail leaked at beta; drop it from the exports map (or mark internal). The only build that touches it is cairn's own showcase spike route.
  consumersMust: Delete or repoint the leftover showcase spike route src/routes/spike/spellcheck/+page.svelte, which is the only importer of the ./components/spellcheck-worker subpath.
DEMOTE ./components/spellcheck-assets/spellchecker-wasm.wasm [prosecution: demote, HOLDS]
  proposal: Drop this asset key from the public exports map, or mark it internal; the package resolves it itself, and if the showcase's spike route needs raw access to prove the build boundary, keep that on a private/dev-only path rather than a frozen public subpath.
  defense: Verified: resolveWasmUrl() resolves it internally via new URL('./spellcheck-assets/spellchecker-wasm.wasm', import.meta.url), so the package ships and resolves the asset itself. The only external touch is showcase's spike route. It is a raw binary asset key with no docs; being non-type-bearing it also escapes check:surface, leaving only publint/attw resolution. A raw WASM binary should not be a frozen public subpath. Drop it from the exports map (or keep the spike's raw access on a dev-only path).
  consumersMust: Delete or repoint the showcase spike route src/routes/spike/spellcheck/+page.svelte, the only importer of the spellchecker-wasm.wasm subpath.
DEMOTE ./components/spellcheck-assets/dictionary-en-us.txt [prosecution: demote, HOLDS]
  proposal: Drop this asset key from the public exports map, or mark it internal, for the same reason as the wasm asset key.
  defense: Verified: resolveDictionaryUrl() resolves it internally via new URL('./spellcheck-assets/dictionary-en-us.txt', import.meta.url) (the literal path is deliberately load-bearing to keep Vite/Rolldown from globbing the dist .svelte files). MarkdownEditor supplies the dictionary itself; the only external reference is showcase's spike route. Undocumented, non-type-bearing (escapes check:surface), and a raw dictionary text file should not be a frozen public subpath. Drop it from the exports map for the same reason as the wasm key.
  consumersMust: Delete or repoint the showcase spike route src/routes/spike/spellcheck/+page.svelte, the only importer of the dictionary-en-us.txt subpath.

## ./islands + ./render
NOTE: Both subpaths already reflect deliberate curation. /islands is a tight two-export pair (hydrateIslands + its IslandRegistry argument/adapter type) matching the one documented integration path exactly. /render reflects the 2026-06-05 render-authoring-surface-design pass, which explicitly reasoned about what to keep out (rehypeDispatch, plus the internal-only hast helpers strProp/markFirstList/dataAttrProp) and recorded that reasoning inline in authoring.ts. The remaining seven /render exports form a coherent 'toolkit a build() reaches for' story; the one export without a live consumer import today (isElement) still clears the bar on its documented origin (a real site's independently-duplicated helper) rather than reading as unused-by-default. Nothing on either subpath reads as engine-internal plumbing leaked for convenience, so this slice returns all keeps.
KEEP hydrateIslands
KEEP IslandRegistry
KEEP iconSpan
KEEP cardShell
KEEP headRow
KEEP isElement
KEEP strAttr
KEEP MakeIcon
KEEP ComponentContext

## ./delivery + ./delivery/head + ./delivery/data
NOTE: The three subpaths together read as one coherent surface with a genuinely confirmed golden path (createSiteIndexes -> createPublicRoutes/CairnHead + rssResponse/jsonFeedResponse/sitemapResponse/robotsResponse + buildLinkResolver/resolveReferences/siteDescriptors/buildSiteManifest), every one of which is directly imported by all three or by at least one production consumer. Underneath that golden path sit two structurally distinct problem groups. (1) A hand-assembly escape-hatch layer (createContentIndex, createSiteResolver, fromGlob, plus their RawFile/ConceptIndex types) that createSiteIndexes composes internally and that zero consumers touch directly; site-indexes.ts's own comment calls it 'the lower-level escape hatch,' but cairn's opinionated, Vite-glob-only content model gives no concrete scenario where a solo/small-team developer needs to re-assemble indexes by hand rather than call createSiteIndexes. (2) feedView/sitemapView, documented as the 'engine-provided' feed/sitemap projections but which the reference doc's own worked rssResponse/sitemapResponse examples bypass entirely (both hand-roll items via buildLinkResolver plus a manual .map instead), matching every real consumer's code; the ROADMAP already plans a proper engine-provided feed/sitemap view, so freezing this summary-only, no-render shape at beta risks locking in a partial answer to the exact gap the ROADMAP intends to fill better. A third, smaller group (readSeoFields, resolveImageUrl, permalink, wordCount, SeoFields) are 'pure helpers' whose only confirmed callers are other engine internals (public-routes.ts, content-index.ts) - plumbing pulled to the top level for code-sharing convenience between source files, not because a consumer needs to call them.
KEEP createSiteIndexes
KEEP type SiteGlobs
KEEP type SiteIndexes
DEMOTE createSiteResolver [prosecution: demote, HOLDS]
  defense: Confirmed unused by all three consumers (showcase/content.ts, ecxc-ski, 907-life all build content via createSiteIndexes; grep shows the only in-repo callers of createSiteResolver are site-indexes.ts and tests). siteDescriptors IS imported by showcase, but only to feed resolveReferences, never to hand-assemble a resolver. The golden path (createSiteIndexes) does the union, validation gate, and per-concept indexes; cairn's glob-only, no-portability content model gives no documented case for reassembling by hand, and neither the tutorial nor wire-the-delivery-surface guide reaches for it. Demoting is non-breaking for every real consumer.
DEMOTE type ConceptIndex [prosecution: demote, HOLDS]
  defense: Sole role is the input-list-item type for createSiteResolver (interface { descriptor; index }); it names no kept export's signature (createSiteIndexes returns SiteIndexes, not ConceptIndex[]) and no consumer app.d.ts or typed wrapper references it. Falls with createSiteResolver. Non-breaking.
KEEP type SiteResolver
DEMOTE createContentIndex [prosecution: demote, HOLDS]
  defense: Only in-repo callers are site-indexes.ts, manifest.ts, and tests; zero consumer usage. createSiteIndexes already returns each concept's ContentIndex on a named key (indexes.posts), so a developer never needs to build one concept's index in isolation. Non-breaking.
DEMOTE type RawFile [prosecution: demote, HOLDS]
  defense: Parameter type of createContentIndex and return type of fromGlob, both demoted. No kept export exposes RawFile in its signature, and no consumer names it. Carries no independent audience value. Non-breaking.
KEEP type ContentSummary
KEEP type ContentEntry
KEEP type ContentProblem
KEEP type ContentIndex
DEMOTE fromGlob [prosecution: demote, HOLDS]
  defense: A one-line Object.entries mapper (glob record to RawFile[]) used internally by site-indexes.ts and manifest.ts; its only public purpose was pairing with the demoted createContentIndex/createSiteResolver escape hatch. No consumer imports it. Non-breaking.
KEEP buildRssFeed
KEEP buildJsonFeed
KEEP type FeedChannel
KEEP type FeedItem
KEEP buildSitemap
KEEP type SitemapUrl
RESHAPE feedView [prosecution: reshape, HOLDS]
  proposal: Hold this export back from the beta freeze (or mark it clearly experimental/unstable) until it can accept a per-item render/resolve hook and produce full-content items directly, matching what every real site actually needs and currently hand-rolls; converge it with the planned ROADMAP feed/sitemap view work rather than freezing the summary-only shape now.
  defense: The export is summary-only by construction (views.ts omits contentHtml) and every real feed is full-content: all three sites and the reference doc's own rssResponse recipe, plus the tutorial and the wire-the-delivery-surface guide, hand-roll items via buildLinkResolver + a manual render map and bypass feedView entirely. My additive-rescue defense (a later optional render hook is non-breaking) does not save it: the risk is not blocking the roadmap but freezing a shape the docs actively steer away from, leaving a permanent beta tombstone the ROADMAP's real feed view (line 147-151) would ship beside under its own shape. Pre-beta, breaking is cheap: hold it back from the freeze or mark it experimental until the full-content shape is settled. Non-breaking for consumers (unused).
KEEP sitemapView [prosecution: reshape, REFUTED]
  proposal: Same as feedView: hold back from the beta freeze pending the ROADMAP's planned engine-provided sitemap view, or fold it into a single documented recipe that the doc's own rssResponse/sitemapResponse examples actually demonstrate using, so the export and the golden path agree.
  defense: Refuted. Unlike feedView, sitemapView is a COMPLETE shape: a sitemap needs only loc + lastmod, which it produces, and it correctly filters on routing.routable (the exact membership derivation the ROADMAP line 147-151 wanted engine-provided). The doc/tutorial examples hand-roll only because they prepend the homepage root URL and use site.all() instead of the routable filter, i.e. a pre-existing recipe that predates the view, not a defect in the view. There is no pending 'fill it differently' for sitemaps, so no tombstone risk. Correct fix is documentation: demonstrate sitemapView as the golden sitemap path (and note the ROADMAP item is partially delivered). Keep.
KEEP buildRobots
KEEP rssResponse
KEEP jsonFeedResponse
KEEP sitemapResponse
KEEP robotsResponse
KEEP buildSeoMeta
KEEP type SeoInput
KEEP type SeoMeta
KEEP buildSiteManifest
KEEP buildLinkResolver
KEEP resolveReferences
KEEP type ResolvedReference
KEEP deriveExcerpt
DEMOTE wordCount [prosecution: demote, HOLDS]
  defense: Confirmed: content-index.ts computes ContentSummary.wordCount by calling this on every entry at build, so each corpus entry already carries its count for free (unlike deriveExcerpt, which supports a genuinely different maxChars). No consumer imports it; EditPage.svelte's local wordCount is a separate in-component derived value, not this export. No scenario where a developer holds raw body text outside the indexed corpus and needs a count. Non-breaking.
DEMOTE permalink [prosecution: demote, HOLDS]
  defense: Every ContentSummary/ContentEntry already carries a computed .permalink, and the only source of the required ConceptDescriptor argument is siteDescriptors, so a developer would need two exports to recompute a path they already hold. All tutorial/guide 'permalink' references are .permalink property reads, never permalink() calls; no consumer invokes the function. Note it is also re-exported on core '.', so demoting the delivery/data re-export removes a redundant unused name from this surface. Non-breaking.
KEEP resolveImageUrl [prosecution: reshape, HOLDS]
  proposal: Cross-reference resolveImageUrl directly from buildSeoMeta's doc entry (and consider grouping it under 'SEO and manifest builders' rather than the catch-all 'Pure helpers' section) so its real audience use, preparing an absolute image URL for buildSeoMeta, is discoverable.
  defense: Agree with the prosecution's own conclusion: keep the export, fix the doc. It carries real non-trivial correctness a consumer would not reimplement well (the media:-token protocol guard at seo-fields.ts:47-49, plus the absolute/protocol-relative/root-relative resolution SeoInput.image requires), making it the natural companion to the kept buildSeoMeta for the 'build your own SEO head' custom-page case. The reshape is doc-only (cross-reference it from buildSeoMeta and move it under 'SEO and manifest builders' rather than the catch-all 'Pure helpers'), zero migration cost, non-breaking.
KEEP readSeoFields [prosecution: demote, REFUTED]
  defense: Refuted on coherence grounds. public-routes.ts runs the exact chain readSeoFields(frontmatter) -> resolveImageUrl -> buildSeoMeta (lines 122/128); it is the first step of the same custom-SEO-head recipe the prosecution keeps resolveImageUrl and buildSeoMeta for. Demoting only the middle reader leaves that documented seam with a hole: a developer reaching for the kept resolveImageUrl/buildSeoMeta must then hand-roll the frontmatter read. Either the custom-head chain is a supported seam (keep all three and document the recipe) or none of it is; splitting it is the incoherent outcome. Keep, contingent on documenting the three-step recipe. This is the weakest keep in the set, but the chain-coherence with the kept resolveImageUrl decides it. Non-breaking.
KEEP type SeoFields [prosecution: demote, REFUTED]
  defense: The return type of readSeoFields, which is kept; it names that kept export's signature, so it stays for the custom-SEO-head recipe. Keep.
KEEP jsonLdScript
KEEP siteDescriptors
KEEP createPublicRoutes
KEEP type PublicRoutesDeps
KEEP type EntryData
KEEP CairnHead

## ./media
NOTE: Real usage across all three consumers clusters tightly around one integration path: normalizeAssets(config) → makeMediaResolver(manifest, resolved) threaded into render()'s resolveMedia option, with readCommittedManifest(import.meta.glob(...)) as the recommended way to get the manifest (showcase, which is the live scaffold template, uses it; the two older production sites, ecxc-ski and 907-life, still use a bare `import mediaManifest from '.../media.json'` that predates this helper — a legacy-vs-current-template split worth reconciling in the scaffold/docs, not a signal against the export). Roughly half the barrel (manifest CRUD, hashing/naming, the media: token codec, and the raw transform-URL builders) is exercised only by the engine's own built-in admin upload/delete/preview pipeline (content-routes.ts, resolve-media.ts, the Media* admin components) and never by any of the three real consumers or by any documented guide/example; nothing internal to the package needs these re-exported from the public barrel either, since the engine's own modules import them by relative path, not through '@glw907/cairn-cms/media'. manifestMediaResolver is the clearest case: the reference doc already states outright that "a site does not call it directly," confirmed by the source (only EditPage.svelte calls it, via a relative import). Recommend narrowing the /media contract at beta to the config+resolve+read-manifest core plus the types needed to name those signatures, and dropping the ingest-only/engine-internal helpers from the public barrel (they can stay as unexported implementation detail, or move behind an explicitly internal path) before the surface freezes.
KEEP normalizeAssets
KEEP ResolvedAssetConfig
DEMOTE parseMediaManifest [prosecution: demote, HOLDS]
  defense: Confirmed engine-internal. readCommittedManifest (kept, used by showcase) wraps it for the Vite import.meta.glob path, and the documented resolver example passes a raw JSON import straight to makeMediaResolver, so no consumer needs the bare tolerant parser. Its only real callers are readCommittedManifest and content-routes.ts (relative import). Demote to internal; readCommittedManifest still works. If a documented non-Vite Node read path ever ships, reconsider re-exporting.
KEEP readCommittedManifest
DEMOTE findByHash [prosecution: demote, HOLDS]
  defense: Dedup lookup used only inside the engine's own ingest and render resolver via relative imports. A site never performs its own manifest lookups; makeMediaResolver does resolution internally. No consumer, guide, or tutorial use. Demote.
DEMOTE upsertMediaEntry [prosecution: demote, HOLDS]
  defense: Write-side manifest patch used only by content-routes.ts upload/edit actions (relative import). createMediaRoute plus the built-in admin own ingest end-to-end; per charter a site never writes its own manifest. No consumer imports it. Demote.
DEMOTE removeMediaEntry [prosecution: demote, HOLDS]
  defense: Write-side delete patch used only by the engine's safe-delete/bulk actions (relative import). No site-author write path exists or is needed. Demote.
DEMOTE serializeMediaManifest [prosecution: demote, HOLDS]
  defense: Canonical-serialize helper used only by the engine's commit-building code (relative import). A site never hand-assembles a manifest commit outside the built-in admin. Demote.
DEMOTE parseMediaEntries [prosecution: demote, HOLDS]
  defense: Validates the admin upload form's posted `media` field; used only inside content-routes.ts. With no supported custom-upload-form seam, no site builds its own upload against the manifest shape. Demote.
KEEP MediaEntry
KEEP MediaManifest
DEMOTE hashBytes [prosecution: demote, HOLDS]
  defense: Ingest-only content-hash minting from raw bytes; called only in the engine's upload action. Uploads and hashing are owned entirely by the admin per charter. Demote.
DEMOTE shortHash [prosecution: demote, HOLDS]
  defense: Paired ingest-only helper alongside hashBytes, same evidence: engine-only relative caller, no site mints its own asset hashes. Demote.
DEMOTE slugifyFilename [prosecution: demote, HOLDS]
  defense: Ingest filename-to-slug transform used only by the built-in upload action. A site never runs its own ingest. Demote.
DEMOTE r2Key [prosecution: demote, HOLDS]
  defense: Builds the R2 object key for the engine's store/delete. The module header already keeps all R2-touching pieces off /media; r2Key's only caller is the engine's own action. Keeping a raw R2-key builder on the node-safe surface contradicts the subpath's stated boundary. Demote.
DEMOTE publicPath [prosecution: demote, HOLDS]
  defense: makeMediaResolver already returns the fully built delivery URL for the one documented render pattern; the remaining callers are the engine's own admin components. An extending-developer needing an asset URL on their own route calls the kept resolver with a MediaRef, never hand-builds the path. No doc or consumer builds a path by hand. Demote.
DEMOTE presetUrl [prosecution: demote, HOLDS]
  defense: makeMediaResolver applies named presets via opts.preset; presetUrl's only caller is resolve-media.ts internally. No guide or consumer calls it directly. Demote. (Flag: a future responsive-srcset feature is the one plausible reason to re-export it or add a resolver srcset option; introduce it WITH docs when demonstrated, not as a speculative pre-beta promise.)
DEMOTE variantUrl [prosecution: demote, HOLDS]
  defense: Lower-level builder that presetUrl wraps; only caller is presetUrl. The 'build a srcset yourself' case is unsupported by any guide or consumer today, and rendering is design-agnostic/site-owned, so it is a valid out-of-scope-for-now. Demote alongside presetUrl; revisit together if responsive images become a documented seam.
KEEP VariantSpec
KEEP parseMediaToken [prosecution: demote, REFUTED]
  defense: Refuted. This is the only public bridge from the canonical `media:` string to a MediaRef, and MediaRef + makeMediaResolver are kept public. The extending-developer who stores a media token in their OWN data (a custom D1 row, a custom route) must turn that string into a MediaRef to resolve it via the kept resolver; without parseMediaToken they would reimplement the non-trivial grammar (last-dot split, hash/slug regexes, bare-hash form), which is exactly the reach-into-internals the charter's thin-seam contract exists to prevent. It is also already documented as the codec in authoring-syntax.md. Keep.
KEEP mediaToken [prosecution: demote, REFUTED]
  defense: Refuted as the documented inverse of parseMediaToken. The two are a published codec pair in authoring-syntax.md and round-trip the kept MediaRef type. An extending-developer persisting a reference to a cairn asset in their own data needs the canonical writer, and the canonical form carries real rules (the -img collision case and the bare-hash branch) a site should not hand-roll. Splitting the codec to keep only the reader would leave a half-seam. Keep the pair; this is the weaker half, so if a future audit finds the developer-owns-token workflow never materializes, demote both together.
KEEP MediaRef
KEEP makeMediaResolver
DEMOTE manifestMediaResolver [prosecution: demote, HOLDS]
  defense: Strongest demote of the set: the reference doc itself states 'The engine wires this for its own preview pane; a site does not call it directly,' and source confirms only EditPage.svelte calls it via relative import. An engine-internal preview helper that leaked onto the public barrel and whose own documentation disclaims site use. Demote and remove the reference entry.
KEEP MediaResolve

## ./vite
NOTE: The bins that supposedly justify this subpath's 'lower-level functions' (cairn-manifest's bin.ts, cairn-doctor's bin.ts) do not actually import them through the public `@glw907/cairn-cms/vite` subpath at all: both use relative same-package imports (`./index.js`, `../vite/index.js`), and the unit tests that exercise verifyManifestFromVite/buildManifestFromVite/stripCairnManifest/readAdapterFacts do the same (`../../lib/vite/index.js`). So the public exports-map entry for `./vite` is not load-bearing for any of that plumbing; the bins would build identically if those five names were never exported publicly. Only `cairnManifest` and `CairnManifestOptions` are touched by an actual out-of-package consumer (all three ground-truth sites import exactly `cairnManifest` from `/vite` in their vite.config.ts, passing an object shaped like CairnManifestOptions but never importing the type explicitly). Reshape proposal: keep `./vite` exporting only `cairnManifest` and `CairnManifestOptions`; move `writeManifest`, `readAdapterFacts`, `verifyManifestFromVite`, `buildManifestFromVite`, `stripCairnManifest`, and `AdapterFacts` into an unexported internal module (e.g. `src/lib/vite/internal.ts`) that the two bins and the unit tests import by relative path exactly as they already do today; this needs no call-site changes, only removing six names from the public surface and the reference doc's 'Lower-level functions' section. Separately noted: the reference doc's `AdapterFacts` shape (owner/repo/from only) has already drifted from the code, which also carries `mediaBucketBinding`; the doc should be reconciled or the section deleted as part of the reshape rather than patched in place, since the type is being demoted anyway.
KEEP cairnManifest
KEEP CairnManifestOptions
DEMOTE writeManifest [prosecution: demote, HOLDS]
  defense: The strongest defense is that the cairn-manifest CLI is a documented, in-charter workflow, so its underlying logic should stay public. That defense fails on inspection: the bin (src/lib/vite/bin.ts:5) imports writeManifest via the relative './index.js' path, not the '@glw907/cairn-cms/vite' subpath, and the only other caller is a unit test via a relative import. No consumer site (showcase, ecxc-ski, 907-life) imports it; all three run the documented `cairn:manifest` npm script instead. The tutorial, both guides, and the showcase import only cairnManifest from /vite. Its own doc says it exists 'so the write logic is testable apart from the CLI shell', a testability reason relative imports already satisfy. The documented regenerate workflow survives demotion untouched, so keeping it on the public surface only invites a fragile bypass of the bin's exit-code semantics. Demote to an internal module the bin and tests import relatively.
DEMOTE readAdapterFacts [prosecution: demote, HOLDS]
  defense: Consumed only by the cairn-doctor bin (src/lib/doctor/bin.ts:46-47) via a relative '../vite/index.js' import and by two unit tests via relative paths. No consumer site imports it, and its doc states it 'runs only on the CLI path, never in a Worker' and degrades to null on any failure, which is bin-internal best-effort plumbing, not a consumer seam. The doctor tool is the documented workflow (docs/reference/doctor.md), and it reaches this logic without the public subpath. Charter-wise this is engine-internal derivation, not a thin seam a developer builds on. Demote; not breaking for any real consumer.
DEMOTE AdapterFacts [prosecution: demote, HOLDS]
  defense: Its sole purpose is to name readAdapterFacts's return type; once that function demotes, the type has no independent public consumer. No consumer site imports it. The prosecution's staleness point is confirmed: the source (vite/index.ts:257) carries a mediaBucketBinding field that docs/reference/vite.md:145-150 omits, and the internal api-surface.md lists the fourth field while the published reference does not, so the public contract is already unmaintained. A type only survives a demotion if consumer code must name it in a signature; nothing here does. Demote alongside readAdapterFacts; not breaking.
DEMOTE verifyManifestFromVite [prosecution: demote, HOLDS]
  defense: Called only from cairnManifest's own buildStart in the same module (no import needed) and from one unit test via a relative path. Notably even the bin does not import it. No consumer site imports it. It is the plugin's internal verify machinery, and invoking it outside buildStart bypasses the plugin's `this.error(...)` build-error wiring, so exposing it is a footgun with no in-charter use. The plugin (cairnManifest) remains the public seam and continues to call this internally. Demote; not breaking.
DEMOTE buildManifestFromVite [prosecution: demote, HOLDS]
  defense: Its doc comment says 'The cairn-manifest bin (a later task) will call this', but the shipped bin calls writeManifest instead, which calls buildManifestFromVite via a same-module reference; the only external caller is one unit test using a relative import. The stale comment is evidence of provisional scaffolding, not a deliberate public API. No consumer site imports it. It stays reachable to the plugin and bin as an internal function. Demote; not breaking.
DEMOTE stripCairnManifest [prosecution: demote, HOLDS]
  defense: Deep recursion-avoidance mechanics used only inside evalVirtual (same module) and by one unit test via a relative import. No consumer site imports it, and there is no plausible in-charter reason a developer would hand-strip a named plugin from their plugins array; it is pure implementation detail of how the nested SSR verify server avoids re-entering its own buildStart. This is the clearest case of over-exposed internals. Demote; not breaking.

## ./ambient + ./package.json + the cairn-manifest and cairn-doctor CLIs
NOTE: This slice is not a typical named-export surface: /ambient has one side-effect module, ./package.json is the standard exports-map self-reference, and the two bins are the only truly public 'API' with real argument surface. All of it is genuinely used by all three consumers except the ./package.json subpath, which is used internally (by cairn-doctor's own dependency-floors check reading the installed engine's peerDependencies) rather than by any consumer import, but that is a legitimate in-charter use, not orphaned surface. The one structural defect is the Locals/Platform.env asymmetry: /ambient fully types App.Locals (the half the engine can enforce end-to-end) but leaves the seven cairn-owned Platform.env binding names (AUTH_DB, EMAIL, PUBLIC_ORIGIN, MEDIA_BUCKET, GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, GITHUB_APP_PRIVATE_KEY_B64) to be hand-typed by each consumer with only partial, informal cross-checking against the separately-exported AuthEnv type (which covers only three of the seven fields and is documented as living on '.'/'/sveltekit', not /ambient). All three production app.d.ts files hand-author this block from scratch; a misspelled binding name typechecks fine and fails only at runtime. Separately, package.json's `files: ["dist", "src/lib", "CHANGELOG.md"]` ships the entire TypeScript/Svelte source tree in the npm tarball even though the compiler has `sourceMap: true` but not `declarationMap: true`, so no shipped .d.ts ever points back into src/lib for a source-map jump; nothing about the built dist/ needs it. That inclusion predates the current exports map (present in the very first commits with a 'files' field) and looks like an un-pruned artifact of an early svelte-package template rather than a deliberate decision; no doc, changelog entry, or test references it. It should be removed before the contract freezes, since it is dead weight in every published tarball and a reachable-on-disk deep-import path (npm's `files` field is independent of the ESM `exports` restriction) that nothing tests or documents. Both CLI bins are otherwise cleanly scoped: cairn-manifest is deliberately zero-argument and cwd-driven, and cairn-doctor's four flags each map 1:1 to a documented, distinct operator need (declarative inputs, plus two clearly-labeled opt-in live checks).
KEEP ./ambient (side-effect import: types App.Locals.editor and App.Locals.backend) [prosecution: reshape, REFUTED]
  proposal: Extend /ambient (or add a sibling export consumers intersect in) to also carry a canonical binding-name type for the seven cairn-owned Platform.env members, so a consumer's Platform.env block is checked against cairn's real names instead of retyped strings. At minimum, fold AuthEnv's three covered fields plus the four uncovered ones (MEDIA_BUCKET, GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, GITHUB_APP_PRIVATE_KEY_B64) into one exported shape so the whole binding surface, not half of it, is a checked contract.
  defense: The reshape rests on a false premise: that ambient 'stops halfway' by typing Locals but not Platform.env's bindings. The source shows the opposite -- the omission is a deliberate charter decision, not an unfinished job. src/lib/sveltekit/media-route.ts:102 states outright that 'event.platform is App.Platform, which the engine does not declare (a site does)'. Locals.editor/backend are cairn-INTERNAL per-request state that cairn's own guard/handle are the sole writers of, so global-augmenting them is safe and correct. App.Platform.env is CO-OWNED territory: the developer's Worker declares its own bindings there (their D1, KV, R2, secrets, domain services) alongside cairn's, which is the exact 'own data, own auth, own domain logic' the charter assigns to the developer. Global-augmenting App.Platform.env would force fixed binding NAMES into an interface the developer also declares and cannot opt out of. The prosecution's own examples defeat it: MEDIA_BUCKET is a developer-CHOSEN binding name (content/types.ts:164, 'e.g. "MEDIA_BUCKET"'), so there is no canonical name to type; and the three GITHUB_APP_* values are the developer's Worker secrets read by the doctor from env (doctor/index.ts:78), not Platform.env members. cairn already offers the correct thin seam for the checkable half: AuthEnv is an exported named type ('a structural subset of Platform.env') a developer can intersect into their own App.Platform declaration on their terms -- reference-by-name, not a global augmentation of a co-owned interface. The residual concern (a mis-spelled binding fails only at runtime) is closed by cairn-doctor's preflight, which probes the actual live bindings, not by expanding a global type. Expanding this surface right before a beta freeze -- when consumers already carry conflicting comments about which subpath AuthEnv even lives on -- would add a binding-name support promise cairn cannot keep as sites reconfigure. Keep ambient exactly as-is; the Locals-only scope is the correct boundary.
KEEP ./package.json (exports-map self-reference subpath)
RESHAPE package.json `files` field: `src/lib` entry (ships the full TS/Svelte source tree alongside dist) [prosecution: reshape]
  proposal: Drop `src/lib` from the `files` array before the contract freezes, leaving `["dist", "CHANGELOG.md"]` (npm already includes README/LICENSE/package.json automatically). If a future need for shipped source surfaces (e.g. enabling declaration maps for consumer debugging), reintroduce it deliberately alongside `declarationMap: true`, not as an untouched default.
  reason: No doc, changelog entry, consumer import, or test references src/lib in the published tarball. tsconfig.json sets sourceMap but not declarationMap, so no shipped .d.ts ever points back into src/lib for a source-map jump; the exports map already gates every supported import through dist. git history shows this entry present since the file's earliest commits, unpruned as the exports map grew from one subpath to fourteen, which points to a stale svelte-package template leftover rather than a deliberate decision. npm's `files` field controls tarball contents independently of the ESM `exports` restriction, so shipping src/lib leaves a deep-import path reachable on disk (e.g. resolving straight into node_modules/@glw907/cairn-cms/src/lib/... via a relative path or a misconfigured bundler) that bypasses the exports map's subpath restriction, ships unbuilt TypeScript/Svelte the package never promises to support as an entry point, and inflates every published tarball for no benefit.
KEEP cairn-manifest (bin, zero arguments/flags)
KEEP cairn-doctor --from <address>
KEEP cairn-doctor --repo <owner/name>
KEEP cairn-doctor --send-test <address>
KEEP cairn-doctor --probe [url]


# SHAPE DIMENSIONS

## Consumer-facing contract shape (@glw907/cairn-cms) — pre-beta freeze
[blocker] No exported binding contract: consumers hand-copy the whole Platform.env block, so any binding cairn adds or renames drifts silently instead of failing at compile
  rec: Before freeze, export one required-shape interface (e.g. `CairnPlatformBindings`) covering every binding the engine reads (AUTH_DB, EMAIL, PUBLIC_ORIGIN, MEDIA_BUCKET, GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, GITHUB_APP_PRIVATE_KEY_B64) with the fields required (not `?`), and document the app.d.ts idiom as `interface Platform { env: CairnPlatformBindings & { /* the developer's own bindings */ } }`. This is additive (non-breaking) now, and lets a future required binding surface as a type error in every consumer rather than a runtime 500. Keep the doctor check as the wrangler-side backstop.
  evidence: examples/showcase/src/app.d.ts:11-26; src/lib/auth/types.ts:13 (AuthEnv, all-optional, covers AUTH_DB/EMAIL/PUBLIC_ORIGIN only); src/lib/github/credentials.ts BackendEnv (only GITHUB_APP_PRIVATE_KEY_B64 — omits GITHUB_APP_ID and GITHUB_APP_INSTALLATION_ID); src/lib/ambient.ts:17 (ambient augments Locals only, never Platform)
[blocker, BREAKING] ConceptConfig.routing leaks the engine-internal RoutingRule into the public union, so the shorthand set is open — freezing it makes every arbitrary {routable,dated,inFeeds} combo a beta support promise
  rec: Drop RoutingRule from the public `ConceptConfig.routing` union at freeze; expose only `'feed' | 'page' | 'embedded'` and keep RoutingRule internal to normalization. If an escape hatch is genuinely wanted, gate it behind a named opt-in later — but default the beta surface closed. Breaking now (tiny blast radius), non-negotiable-breaking later.
  evidence: src/lib/content/types.ts:81 (`routing?: 'feed' | 'page' | 'embedded' | RoutingRule`) contradicts src/lib/content/types.ts:262-263 (RoutingRule doc: "Concept-fixed routing ... Not in adapter config"); resolver at src/lib/content/concepts.ts:21-24
[should-fix] AssetConfig.transformations is a boolean on the adapter that mirrors external Cloudflare zone state the engine cannot read or control, so it silently drifts in both directions
  rec: Keep the field (removing it is breaking and the engine genuinely needs the answer), but add a doctor check that reads the zone/wrangler state and warns loudly when `transformations: true` cannot be corroborated, and vice-versa when variants are configured but transformations is false. Non-breaking. Consider renaming to make the mirror-of-external-state nature obvious (e.g. `imageTransformationsEnabledOnZone`) while names are still free to change.
  evidence: src/lib/content/types.ts:176-182; consumed at src/lib/media/config.ts:15-30 (ResolvedAssetConfig.transformations)
[should-fix, BREAKING] CairnAdminDeps is a grab-bag: it mixes magic-link auth identity (branding, send) with LLM/tidy plumbing (anthropic, tidyTimeoutMs) at one flat level
  rec: Regroup into cohesive nested bags before freeze: `auth?: { branding?, send? }` and `tidy?: { client?, timeoutMs? }`. Breaking now, cheap now, and it stops the tidy plumbing from advertising itself as top-level admin surface. If tidy injection is purely for tests, prefer the split in the next finding and drop it from the public facade entirely.
  evidence: src/lib/sveltekit/cairn-admin.ts:45-55 (branding, send, anthropic, tidyTimeoutMs all flat); forwarded at cairn-admin.ts:86-89
[should-fix, BREAKING] ContentRoutesDeps.backend is a documented test-injection seam exposed as public config, and createContentRoutes is a redundant lower-level export alongside the createCairnAdmin facade
  rec: At freeze, stop exporting createContentRoutes and ContentRoutesDeps from the public barrel (keep them internal for tests and for createCairnAdmin), or if the low-level factory must stay public, move the `backend` test seam out of the public deps type. Breaking now for anyone on the low-level path (the showcase is not).
  evidence: src/lib/sveltekit/content-routes.ts:378-385 (`backend?: Backend` — doc: "A test injects a live Backend ... so the read and commit paths run with no real token mint"); exported publicly at src/lib/sveltekit/index.ts:6 (createContentRoutes) and :20 (ContentRoutesDeps)
[should-fix, BREAKING] createMediaRoute takes runtime.resolvedAssets (a resolved internal type) instead of the runtime, forcing ResolvedAssetConfig across the public boundary and breaking the createX(runtime) convention
  rec: Change the signature to `createMediaRoute(runtime: CairnRuntime)` and read `runtime.resolvedAssets` inside, so the consumer passes the same `runtime` everywhere and ResolvedAssetConfig stops being load-bearing public surface. Breaking now, one-line consumer change, and it aligns the media route with the other factories before the convention freezes.
  evidence: src/lib/sveltekit/media-route.ts:59 (`createMediaRoute(resolved: ResolvedAssetConfig)`); consumer at examples/showcase/src/routes/media/[...path]/+server.ts:8 (`createMediaRoute(runtime.resolvedAssets)`); ResolvedAssetConfig is public via the /media subpath at src/lib/media/config.ts:15 and src/lib/media/index.ts:8
[should-fix] The cairn.config.ts / site.config.yaml boundary is enforced only by TypeScript on the adapter side; the YAML side silently ignores unknown keys, so a misplaced or typo'd editor-editable setting fails silently rather than loudly
  rec: Have parseSiteConfig warn (or, for a small closed set of known-misplaced keys, throw with 'this belongs in cairn.config.ts / site.config.yaml') on unrecognized top-level keys, and give composeRuntime one actionable failure path for the common mis-placements. Non-breaking (warnings/new throws on already-invalid input). This is the loud, boundary-teaching signal the split needs to be self-documenting.
  evidence: src/lib/content/compose.ts:31-32 (composeRuntime's only guard is `if (!siteConfig)`); src/lib/nav/site-config.ts:73 ("Unknown keys are ignored so the file can grow"); the one loud cross-check exists at site-config.ts:305-309 (throws when a retired per-concept URL policy is left in YAML)
[nice-to-have, BREAKING] CairnAdapter.editor bundles four unrelated knobs (preview, nav, supportContact, adminNav) and PreviewConfig sits three levels deep — a mild grab-bag among otherwise cohesive groups
  rec: Optional at freeze: either accept `editor` as the admin-experience catch-all (document it as such) or lift `adminNav` and `supportContact` to a sibling `admin` group to separate frame-extension from preview/nav. If touched, do it before freeze since it's breaking; otherwise leave it — not worth a breaking change on its own.
  evidence: src/lib/content/types.ts:237-257 (editor?: { preview, nav, supportContact, adminNav }); PreviewConfig at types.ts:130-149 reached as adapter.editor.preview.byConcept.<id>.bodyClass
[nice-to-have, BREAKING] Factory argument conventions are consistent except fields.array, the lone positional-plus-options constructor in an otherwise single-argument DSL
  rec: Leave as-is unless the DSL is being revised anyway; the positional item reads well and changing it is breaking for little gain. Flagged only for completeness of the argument-convention audit.
  evidence: src/lib/content/fields.ts:174-177 (`array(item, o?)` — two args) vs every other constructor being single-object, e.g. fields.ts:141 (`text(o)`); SiteRender is single named-object at src/lib/content/types.ts:193-199; fieldset/defineConcept/defineAdapter all single-arg

## First-hour on-ramp: walking the tutorial, showcase wiring, and guides as the extending developer
[blocker] Tutorial's admin mount is missing the shell layout pair, producing a chromeless/broken admin
  rec: Category (c) docs fix, urgent before beta: rewrite Milestone 8 'Mount the admin' to wire five files (composer + catch-all pair + shell layout pair), matching admin-routes.md, and correct the 'three files in all' sentence. Also correct deploy-to-cloudflare.md:75 ('Copy the two files and the composer'), which understates the same count (it defers to the canonical doc, so a careful reader lands right, but the prose is stale).
  evidence: docs/tutorial/build-your-first-cairn-site.md:624 ("one catch-all route pair plus a composer, three files in all") and :651-666; vs docs/reference/admin-routes.md:45-71 and examples/showcase/src/routes/admin/+layout.server.ts + admin/+layout.svelte
[blocker] Tutorial teaches the retired mintToken dep, which no longer exists on CairnAdminDeps (fails npm run check)
  rec: Category (c) docs fix, urgent before beta: change the tutorial to createCairnAdmin(runtime) (matching admin-routes.md:87), delete the mintToken comment, and note the dev content backend rides locals.backend. Meta: this is the second stale snippet found, evidence that tutorial/guide code blocks are not compiled or gated (see the doc-gate finding).
  evidence: docs/tutorial/build-your-first-cairn-site.md:627-635 (createCairnAdmin(runtime, { mintToken: async () => 'dev-token' })); vs src/lib/sveltekit/cairn-admin.ts:45-55 (CairnAdminDeps = branding | send | anthropic | tidyTimeoutMs) and examples/showcase/src/lib/cairn.server.ts:27 (createCairnAdmin(runtime, { anthropic }))
[should-fix] Hand-maintained App.Platform.env block silently degrades on a wrong import subpath; two real sites already hit it
  rec: Category (a) engine-absorb before the freeze: ship the cairn-owned env shape as an ambient/exported type the site extends (e.g. an ambient App.Platform.env baseline from the /ambient import, or an exported CairnPlatformEnv the site intersects with its own bindings), so the site declares only ITS OWN bindings (APP_DB, custom vars) and the wrong-subpath silent-error path is closed. This is an additive public export, so it should land before beta or be explicitly deferred with the risk logged.
  evidence: examples/showcase/src/app.d.ts:2-31 (hand-written Platform.env with AuthEnv & GitHub secrets); docs/guides/deploy-to-cloudflare.md:31-53 ("Copy this block verbatim" ... "skipLibCheck does not warn when the import is wrong, so a mistyped binding degrades to an error type in silence (the gap two site retrofits hit)")
[should-fix] rm static/robots.txt is a silent route shadow with no build-time detection
  rec: Category (a) engine-absorb before beta: have the cairnManifest() Vite plugin (which already runs a build-time verify outside the prerender lifecycle) detect a static file that shadows any cairn delivery route path (robots.txt, feed.xml, sitemap.xml, feed.json) and fail or warn loudly. Turns a silent SEO/hygiene miss into a caught one and removes a manual step.
  evidence: docs/tutorial/build-your-first-cairn-site.md:100-104 ("a static file of the same name would shadow that route, so delete the default now"); examples/showcase/src/routes/robots.txt/+server.ts (cairn's real robots route with sitemapUrl + disallow ['/admin'])
[should-fix] The on-ramp is ~15-18 hand-wired files with no scaffolder yet; tolerable as a tutorial, risky as the only beta on-ramp
  rec: Category (b): treat create-cairn-site as a beta gate, or if beta ships without it, explicitly frame the tutorial as the interim hand-wire path and log that the silent-failure steps (Platform.env, robots shadow, subpath import) are the highest-value ones for the scaffolder to generate correctly the first time. Do NOT try to absorb the route boilerplate into the engine; the per-site route shapes are correctly the developer's, and the leanest fix is generation, not a general feature.
  evidence: docs/tutorial/build-your-first-cairn-site.md (files: vite.config.ts, app.css, root +layout, app.d.ts, svelte.config.js, rm robots, cairn.config.ts, 3 content files, site.config.yaml, content.ts, home pair, [...path] pair, feed.xml/feed.json/sitemap.xml/robots.txt servers, hooks.server.ts, cairn.server.ts, admin route+layout files, healthz); ROADMAP.md:42 ("create-cairn-site ships ... rather than hand-copying")
[should-fix] Tutorial and guide code blocks are not compiled or gated, so they rot against the frozen surface
  rec: Category (a) tooling before beta: add an extract-and-typecheck gate over the tutorial and the admin-mount reference code blocks (compile them against the built package), so a rename in the frozen surface fails the doc that teaches the old shape. This is the mechanism that keeps the beta support promise honest as sibling reviews rename exports.
  evidence: Two stale snippets found this pass: docs/tutorial/build-your-first-cairn-site.md:635 (mintToken, a removed dep) and :624 (three-file admin claim). check:reference and check:package gate exports but not the prose that teaches them.
[nice-to-have] @types/node install exists only because the dev-backend gate reads process.env
  rec: Category (a), low priority: offer a cairn-provided dev-gate helper (or document reading the flag via import.meta.env, which Vite folds the same way) so the site does not need @types/node solely for the flag check. If kept, leave as-is; not worth churning the surface for before beta.
  evidence: docs/tutorial/build-your-first-cairn-site.md:44-48 ("a server hook that reads process.env, a Node global ... add them yourself"); examples/showcase/src/hooks.server.ts:13 (process.env.CAIRN_DEV_BACKEND === '1')
[nice-to-have] Hand-run cairn:manifest after on-disk edits is manual, though the stale-manifest failure is loud
  rec: Category (a), low priority: let the cairnManifest() plugin auto-regenerate on content-file change in dev (watch mode), keeping the loud verify for build. Leave the loud build gate exactly as-is; do not weaken it. Not a beta blocker.
  evidence: docs/tutorial/build-your-first-cairn-site.md:541-549 and :725-729 ("regenerate the manifest by hand: npm run cairn:manifest"); examples/showcase/src/lib/content.ts:3-4 (cairnManifest verifies, does not regenerate)
[nice-to-have] prerender handleHttpError:'warn' exists only because cairn's delivery routes are unlinked prerenderables
  rec: Category (b) scaffolder generates it, OR category (a) if the delivery helpers expose the feed/sitemap/robots paths as prerender entries the site adds to config.kit.prerender.entries, avoiding the blanket handleHttpError relaxation. Low priority; defer past beta.
  evidence: docs/tutorial/build-your-first-cairn-site.md:91-98 ("nothing on the site links to them, so the prerender crawler never reaches them ... treat an uncrawled prerenderable route as a warning"); examples/showcase/svelte.config.js (same policy)

## Upgrade & boundary enforcement (pre-beta contract audit)
[should-fix] checkOrigin removal is an unshipped, externally-triggered login landmine — land the fallback + doctor probe before beta, do not defer to 2.0
  rec: Before beta: (1) ship the Transform Rule recipe as documented, adopt-now guidance in deploy-to-cloudflare.md and the upgrade guide (not just a ROADMAP 'planned' note); (2) add a cairn-doctor / `--probe` assertion that an Origin header actually reaches /admin POSTs, so a site verifies readiness pre-emptively; (3) keep the scheduled kit#15992 watch as the trip-wire. Scope it explicitly as a pre-beta mitigation that survives the removal, not a deferred 2.0 break.
  evidence: ROADMAP.md:159-165; docs/internal/feedback/2026-06-09-907-0.36-retrofit.md:70-81; CHANGELOG.md:171 (0.35.0 mandates csrf:{checkOrigin:false})
[should-fix] The gate suite is structurally blind to behavioral / runtime-contract breaks; the CHANGELOG is the only backstop and nothing enforces it
  rec: Document explicitly (in the ROADMAP 1.0 checklist and the surface-gate header) that behavioral contracts are CHANGELOG-only and not machine-enforced, and add targeted contract tests for the load/resolver seams whose runtime shape is the real promise (entryLoad's throw/return contract, resolveMedia degradation, fieldset coercion). Treat the 'Consumers must' discipline as the load-bearing control it actually is.
  evidence: scripts/check-surface.mjs:1-11 (snapshots the DECLARED .d.ts shape only); CHANGELOG.md:83 (entryLoad now throws error(404) on a miss — identical signature to a null-returning loader); CHANGELOG.md:526 (0.57.0 resolveImageUrl 'now returns no URL for a non-http(s) value')
[should-fix] `/components/spellcheck-worker` is a code export frozen into the beta contract with no reference page and no stability tier
  rec: Decide deliberately: either document it with an explicit tier (and accept the constraint), or stop exporting it from package.json and mount the worker through a non-exported internal path. Do this now — after beta it is a breaking removal.
  evidence: package.json:75-78 (exports key with a real .d.ts); scripts/reference-coverage.mjs:172-185 (CONFIG omits the subpath, so no page and no tier requirement); docs/internal/api-surface.md:169-173 (check:surface DOES snapshot its 3 exports: createSpellcheckHandler, OutboundMessage, SpellEngine)
[should-fix] package.json ships 214 src/lib source files with zero sourcemaps referencing them — dead weight that exposes internals and invites deep-imports the exports map is meant to encapsulate
  rec: Drop 'src/lib' from the files array before beta. If sourcemap-based debugging is wanted instead, turn on sourcemap emission in svelte-package and ship the maps, not the raw source. Add a smoke test that a representative deep-import (e.g. '@glw907/cairn-cms/src/lib/...') throws ERR_PACKAGE_PATH_NOT_EXPORTED to lock the encapsulation.
  evidence: package.json:124-127 (files: ['dist','src/lib','CHANGELOG.md']); npm pack --dry-run: 214 src/lib entries, 0 .map files; `grep sourceMappingURL dist` and `grep /src/lib dist` both empty (nothing in dist resolves to src)
[should-fix] Stability tiers are hand-authored doc prose with only two 'build-on-this' buckets, no non-contract tier, and no derivation from code
  rec: Add an explicit 'Internal / no-stability-promise' tier (or an equivalent 'not part of the contract' marker) so an export can be present without being a promise, and require EVERY export — including undocumented subpaths like spellcheck-worker — to carry a tier (extend the gate to fail on any snapshot export with no tier anywhere, not just documented ones). Then audit the 339-name surface and demote or remove the non-contract names before the freeze.
  evidence: scripts/reference-coverage.mjs:52-53 (TIER_CELL/TIER_LINE recognize only 'Extension API' | 'Scaffold API'); reference-coverage.mjs:164-166 + main():223 (untagged DOCUMENTED exports fail — so tiering IS enforced, but only over exports that have a page)
[nice-to-have] reference-coverage checks export→page only, never page→export, so removed exports leave stale doc prose
  rec: Add a reverse check: flag any backticked `name` in a reference page's Types table / export headings that no longer appears in that subpath's enumerated exports. Cheap, and it closes the stale-prose gap the surface gate cannot see.
  evidence: scripts/reference-coverage.mjs:43-48 (missingNames: names not found in page text — one direction only); CHANGELOG.md:836 (archiveLoad/tagIndexLoad/tagLoad just removed in the Unreleased window)
[nice-to-have] Upgrades are 100% hand-read-and-apply; no doctor 'contract drift' check and no CHANGELOG↔upgrade-guide parity gate
  rec: Add a cairn-doctor 'contract' check that scans the site's imports of '@glw907/cairn-cms*' and flags any name not in the current exports (the surface snapshot is already the machine-readable source of truth). That turns the most mechanical part of an upgrade — the renames — from prose-reading into a checklist the tool prints. Optionally generate the upgrade guide's Consumers-must list from the CHANGELOG to kill the duplication.
  evidence: docs/guides/upgrade-cairn.md (thorough, 56 hand-written Consumers-must actions) vs CHANGELOG.md (30) with no linking gate (`grep upgrade-cairn scripts/` empty); src/lib/doctor/ (check-floors, checks-cloudflare, checks-github, checks-local — none diff a site's imports/adapter against the current surface)
[nice-to-have] The two raw asset export keys have no `types`, so both surface and reference gates skip them entirely
  rec: Add a tiny gate (or fold into check:package) asserting every non-typed asset export key resolves to a file that exists in dist, so a moved or renamed asset path fails CI instead of shipping a broken import string.
  evidence: package.json:79-80 (spellchecker-wasm.wasm and dictionary-en-us.txt export keys, no types field); scripts/check-surface.mjs:33-40 (only keys with a types field are snapshotted); scripts/reference-coverage.mjs:172-185 (CONFIG lists neither)```
