GENERATED — run `npm run check:surface -- --update` to regenerate

## `.`

- `ArrayField`: { type: "array"; item: TextField | TextareaField | NumberField | SelectField | MultiselectField | UrlField | EmailField | DateField | DatetimeField | BooleanField | IconField | ImageField | ObjectField | ReferenceField | ArrayField; itemLabel?: string; label: string; help?: string; required?: boolean; default?: string | boolean }
- `AssetConfig`: { bucketBinding: string; publicBase?: string; urlForm?: "slug" | "opaque"; maxUploadBytes?: number; allowedTypes?: string[]; variants?: Record<string, VariantSpec>; transformations?: boolean }
- `AuthBranding`: { siteName: string; from: string; replyTo?: string }
- `AuthEnv`: { AUTH_DB?: D1Database; PUBLIC_ORIGIN?: string; CAIRN_DEV_BACKEND?: string | boolean; EMAIL?: { send(message: { to: string; from: string; subject: string; html: string; text: string }): Promise<void> } }
- `Backend`: { defaultBranch: string; readFile: (path: string, ref: string) => Promise<string | null>; readEntries: (dir: string, ref: string) => Promise<RepoFile[]>; branchHead: (branch: string) => Promise<string | null>; listBranches: (prefix: string) => Promise<string[]>; commit: (branch: string, changes: FileChange[], author: CommitAuthor, message: string, expectedHead?: string) => Promise<string>; createBranch: (name: string, fromBranch: string) => Promise<void>; deleteBranch: (name: string) => Promise<void> }
- `BackendEnv`: { GITHUB_APP_PRIVATE_KEY_B64?: string }
- `BackendProvider`: { kind: string; branch: string; connect: (env: BackendEnv) => Backend }
- `BehaviorTable`: { [x: string]: FieldBehavior }
- `BooleanField`: { type: "boolean"; label: string; help?: string; required?: boolean; default?: string | boolean }
- `buildComponentInsert`: (def: ComponentDef, values: ComponentValues) => Promise<ComponentInsert>
- `buildMagicLinkMessage`: (input: { to: string; branding: AuthBranding; link: string }) => MagicLinkMessage
- `CairnAdapter`: { content: { [x: string]: ConceptConfig<Fieldset<Record<string, FieldDescriptor>>> }; backend: BackendProvider; email: SenderConfig; rendering: { render: SiteRender; components?: ComponentRegistry; icons?: IconSet; islands?: IslandRegistry }; media?: AssetConfig; editor?: { preview?: PreviewConfig; nav?: NavMenuConfig; supportContact?: string; adminNav?: AdminNavEntry[] } }
- `CairnRef`: { concept: string; id: string }
- `CairnRuntime`: { siteName: string; concepts: ConceptDescriptor[]; backend: BackendProvider; sender: SenderConfig; supportContact?: string; render: (input: { body: string; concept?: string; frontmatter?: Record<string, unknown>; resolve?: LinkResolve; resolveMedia?: MediaResolve }) => Promise<string>; manifestPath: string; mediaManifestPath: string; dictionaryPath?: string; resolvedAssets: { enabled: false } | { enabled: true; bucketBinding: string; publicBase: string; urlForm: "slug" | "opaque"; maxUploadBytes: number; allowedTypes: string[]; variants: Record<string, VariantSpec>; transformations: boolean }; registry?: ComponentRegistry; icons?: IconSet; navMenu?: NavMenuConfig; adminNav?: AdminNavEntry[]; preview?: PreviewConfig; assets?: AssetConfig; spellcheckDictionary?: string; tidy?: TidyConfig }
- `cloudflareSend`: SendMagicLink
- `CommitAuthor`: { name: string; email: string }
- `CommitConflictError`: typeof CommitConflictError
- `ComponentDef`: { name: string; label: string; description: string; insertTemplate?: string; build: (ctx: ComponentContext) => Element; hydrate?: boolean | "visible"; defaultIconByRole?: Record<string, string>; use?: string; attributes?: Record<string, FieldDescriptor>; behavior?: BehaviorTable; attributeSchema?: Fieldset<Record<string, FieldDescriptor>>; slots?: SlotDef[]; icon?: string; group?: string; hidden?: boolean; preview?: { attributes?: Record<string, string | boolean>; slots?: Record<string, string | string[]> } }
- `ComponentInsert`: { ok: true; markdown: string } | { ok: false; errors: Record<string, string> }
- `ComponentRegistry`: { defs: ComponentDef[]; names: string[]; get: (name: string) => ComponentDef; defaultIcon: (name: string, role?: string) => string; iconField: (name: string) => string }
- `ComponentValidation`: { ok: true } | { ok: false; errors: Record<string, string> }
- `ComponentValues`: { attributes: { [x: string]: string | boolean }; slots: { [x: string]: string | string[] } }
- `composeDatedId`: (date: string, slug: string, datePrefix: DatePrefix) => string
- `ComposeInput`: { adapter: CairnAdapter; siteConfig: SiteConfig }
- `composeRuntime`: ({ adapter, siteConfig }: ComposeInput) => CairnRuntime
- `ConceptConfig`: { dir: string; label?: string; singular?: string; fields: S; routing?: "feed" | "page" | "embedded" | RoutingRule; permalink?: string; datePrefix?: DatePrefix; summaryFields?: string[] }
- `ConceptDescriptor`: { id: string; label: string; singular: string; dir: string; routing: RoutingRule; permalink: string; datePrefix: "year" | "month" | "day"; fields: NamedField[]; schema: Fieldset<Record<string, FieldDescriptor>>; summaryFields: string[]; validate: (frontmatter: Record<string, unknown>, body: string) => ValidationResult }
- `ConceptUrlPolicy`: { permalink?: string; datePrefix?: DatePrefix }
- `createRenderer`: (registry?: ComponentRegistry, options?: RendererOptions) => { remarkPlugins: PluggableList; rehypePlugins: PluggableList; renderMarkdown: (content: string, opts?: { resolve?: LinkResolve; resolveMedia?: MediaResolve }) => Promise<string> }
- `DateField`: { type: "date"; min?: string; max?: string; label: string; help?: string; required?: boolean; default?: string | boolean }
- `dateInputValue`: (value: unknown) => string
- `DatePrefix`: "year" | "month" | "day"
- `DatetimeField`: { type: "datetime"; min?: string; max?: string; label: string; help?: string; required?: boolean; default?: string | boolean }
- `defineAdapter`: <const A extends CairnAdapter>(adapter: A) => A
- `defineComponent`: <const D extends ComponentDef>(def: D) => D & { attributeSchema: Fieldset<Record<string, FieldDescriptor>> }
- `defineConcept`: <const C extends ConceptConfig>(concept: C) => C
- `defineRegistry`: ({ components }: { components: ComponentDef[] }) => ComponentRegistry
- `diffManifests`: (built: Manifest, committed: Manifest) => ManifestDiff
- `Editor`: { email: string; displayName: string; role: "owner" | "editor" }
- `EmailField`: { type: "email"; label: string; help?: string; required?: boolean; default?: string | boolean }
- `emptyManifest`: () => Manifest
- `emptyValues`: (def: ComponentDef) => ComponentValues
- `escapeLinkText`: (text: string) => string
- `extractCairnLinks`: (body: string) => CairnRef[]
- `extractMenu`: (config: SiteConfig, name: string, maxDepth: number) => NavNode[]
- `extractVocabulary`: (config: SiteConfig) => VocabularyEntry[]
- `FieldBehavior`: { validate?: ((value: unknown, siblings: Record<string, unknown>) => string | null); itemLabel?: ((item: Record<string, unknown>, index: number) => string) }
- `FieldDescriptor`: TextField | TextareaField | NumberField | SelectField | MultiselectField | UrlField | EmailField | DateField | DatetimeField | BooleanField | IconField | ImageField | ObjectField | ReferenceField | ArrayField
- `fields`: { text: <const O extends Omit<TextField, "type">>(o: O) => TextField & O; textarea: <const O extends Omit<TextareaField, "type">>(o: O) => TextareaField & O; number: <const O extends Omit<NumberField, "type">>(o: O) => NumberField & O; select: <const O extends Omit<SelectField, "type">>(o: O) => SelectField & O; multiselect: <const O extends Omit<MultiselectField, "type">>(o: O) => MultiselectField & O; url: <const O extends Omit<UrlField, "type">>(o: O) => UrlField & O; email: <const O extends Omit<EmailField, "type">>(o: O) => EmailField & O; date: <const O extends Omit<DateField, "type">>(o: O) => DateField & O; datetime: <const O extends Omit<DatetimeField, "type">>(o: O) => DatetimeField & O; boolean: <const O extends Omit<BooleanField, "type">>(o: O) => BooleanField & O; icon: <const O extends Omit<IconField, "type">>(o: O) => IconField & O; image: <const O extends Omit<ImageField, "type">>(o: O) => ImageField & O; object: <const F extends Record<string, FieldDescriptor>, const O extends Omit<ObjectField, "type" | "fields">>(o: { fields: F } & O) => ObjectField & { fields: F } & O; reference: <const O extends Omit<ReferenceField, "type">>(o: O) => ReferenceField & O; array: <const I extends FieldDescriptor, const O extends Omit<ArrayField, "type" | "item">>(item: I, o?: O) => ArrayField & { item: I } & O }
- `fieldset`: <const R extends Record<string, FieldDescriptor>>(record: R, options?: FieldsetOptions) => Fieldset<R>
- `Fieldset`: { fields: R; behavior: { [x: string]: FieldBehavior }; validate: (frontmatter: Record<string, unknown>, body: string) => ValidationResult; ~standard: { readonly version: 1; readonly vendor: string; readonly validate: (value: unknown) => StandardResult<Record<string, unknown>>; readonly types?: { readonly input: StandardInput; readonly output: Record<string, unknown> } } }
- `FieldsetOptions`: { refine?: ((data: Record<string, unknown>, body: string) => Record<string, string>); behavior?: BehaviorTable }
- `FileChange`: { path: string; content: string | null }
- `filenameFromId`: (id: string) => string
- `findConcept`: (concepts: ConceptDescriptor[], id: string) => ConceptDescriptor
- `formatCairnToken`: (ref: CairnRef) => string
- `frontmatterFromForm`: (fields: NamedField[], form: FormData) => Record<string, unknown>
- `generateComponentReference`: (registry: ComponentRegistry, opts: ReferenceOptions) => string
- `githubApp`: (config: { owner: string; repo: string; branch: string; appId: string; installationId: string }) => GithubAppProvider
- `GithubAppProvider`: { kind: "github-app"; owner: string; repo: string; appId: string; installationId: string; branch: string; connect: (env: BackendEnv) => Backend }
- `glyph`: (name: string, icons: IconSet) => Element
- `IconField`: { type: "icon"; label: string; help?: string; required?: boolean; default?: string | boolean }
- `IconSet`: { [x: string]: string }
- `idFromFilename`: (filename: string) => string
- `ImageField`: { type: "image"; seo?: boolean; label: string; help?: string; required?: boolean; default?: string | boolean }
- `ImageValue`: { src: string; alt: string; caption?: string; decorative?: boolean }
- `InboundLink`: { concept: string; id: string; title: string; permalink: string }
- `inboundLinks`: (manifest: Manifest, concept: string, id: string) => InboundLink[]
- `InboundReference`: { concept: string; id: string; title: string; permalink: string; fields: string[] }
- `InferFieldset`: S extends Fieldset<infer R extends Record<string, FieldDescriptor>> ? { [K in keyof ({ -readonly [K in keyof RemoveIndex<R> as RemoveIndex<R>[K] extends { required: true } ? K : never]: ValueOf<RemoveIndex<R>[K] extends FieldDescriptor ? RemoveIndex<R>[K] : never> } & { -readonly [K in keyof RemoveIndex<R> as RemoveIndex<R>[K] extends { required: true } ? never : K]?: ValueOf<RemoveIndex<R>[K] extends FieldDescriptor ? RemoveIndex<R>[K] : never> })]: ({ -readonly [K in keyof RemoveIndex<R> as RemoveIndex<R>[K] extends { required: true } ? K : never]: ValueOf<RemoveIndex<R>[K] extends FieldDescriptor ? RemoveIndex<R>[K] : never> } & { -readonly [K in keyof RemoveIndex<R> as RemoveIndex<R>[K] extends { required: true } ? never : K]?: ValueOf<RemoveIndex<R>[K] extends FieldDescriptor ? RemoveIndex<R>[K] : never> })[K] } : never
- `initialValues`: (fieldset: Fieldset<Record<string, FieldDescriptor>>, now?: Date) => Record<string, unknown>
- `isValidId`: (id: string) => boolean
- `LinkResolve`: (ref: CairnRef) => string
- `LinkTarget`: { concept: string; id: string; permalink: string; title: string; date?: string; draft: boolean }
- `MagicLinkMessage`: { to: string; from: string; subject: string; html: string; text: string }
- `Manifest`: { version: 1; entries: ManifestEntry[] }
- `ManifestDiff`: { added: ManifestEntry[]; removed: ManifestEntry[]; changed: ManifestEntryDiff[] }
- `ManifestEntry`: { id: string; concept: string; title: string; date?: string; permalink: string; summary?: string; draft: boolean; links: CairnRef[]; mediaRefs?: string[]; references?: ReferenceEdge[] }
- `ManifestEntryDiff`: { concept: string; id: string; fields: string[] }
- `manifestEntryFromFile`: (descriptor: ConceptDescriptor, file: { path: string; raw: string }) => ManifestEntry
- `manifestLinkResolver`: (targets: { concept: string; id: string; permalink: string }[]) => LinkResolve
- `MAX_NAV_NODES`: 200
- `MultiselectField`: { type: "multiselect"; options?: readonly string[]; creatable?: boolean; placeholder?: string; taxonomy?: boolean; label: string; help?: string; required?: boolean; default?: string | boolean }
- `NamedField`: FieldDescriptor & { name: string }
- `NavMenuConfig`: { configPath: string; menuName: string; label: string; maxDepth?: number }
- `NavNode`: { label: string; url?: string; children?: NavNode[] }
- `NavValidationError`: typeof NavValidationError
- `normalizeConcepts`: (content: Record<string, ConceptConfig<Fieldset<Record<string, FieldDescriptor>>>>) => ConceptDescriptor[]
- `NumberField`: { type: "number"; min?: number; max?: number; integer?: boolean; label: string; help?: string; required?: boolean; default?: string | boolean }
- `ObjectField`: { type: "object"; label?: string; fields: { [x: string]: FieldDescriptor }; help?: string; required?: boolean; default?: string | boolean }
- `parseCairnToken`: (href: string) => CairnRef | null
- `parseComponent`: (markdown: string, def: ComponentDef) => Promise<ComponentValues>
- `parseManifest`: (raw: string) => Manifest
- `parseMarkdown`: (source: string) => { frontmatter: Record<string, unknown>; body: string }
- `parseSiteConfig`: (raw: string) => SiteConfig
- `PreviewConfig`: { stylesheets: string[]; bodyClass?: string; containerClass?: string; byConcept?: Record<string, { bodyClass?: string; containerClass?: string }> }
- `ReferenceEdge`: { field: string; concept: string; id: string }
- `ReferenceField`: { type: "reference"; concept: string; label: string; help?: string; required?: boolean; default?: string | boolean }
- `ReferenceOptions`: { title: string; summary: string }
- `remarkDirectiveStamp`: (registry: ComponentRegistry) => (tree: Root) => void
- `removeEntry`: (manifest: Manifest, concept: string, id: string) => Manifest
- `RendererOptions`: { sanitizeSchema?: ((defaults: Schema) => Schema); unsafeDisableSanitize?: boolean; anchorRel?: string | false }
- `RepoFile`: { id: string; name: string; path: string }
- `requireOrigin`: (env: { PUBLIC_ORIGIN?: string }) => string
- `ResolvedPreview`: { stylesheets: string[]; bodyClass?: string; containerClass?: string }
- `ResolvedReference`: { id: string; concept: string; title: string; permalink: string; summary?: string }
- `Role`: "owner" | "editor"
- `RoutingRule`: { routable: boolean; dated: boolean; inFeeds: boolean }
- `SelectField`: { type: "select"; options: readonly string[]; label: string; help?: string; required?: boolean; default?: string | boolean }
- `SenderConfig`: { from: string; replyTo?: string }
- `SendMagicLink`: (env: AuthEnv, message: MagicLinkMessage) => Promise<void>
- `serializeComponent`: (def: ComponentDef, values: ComponentValues) => string
- `serializeManifest`: (manifest: Manifest) => string
- `serializeMarkdown`: (frontmatter: object, body: string) => string
- `setMenu`: (raw: string, name: string, tree: NavNode[]) => string
- `setVocabulary`: (raw: string, vocab: VocabularyEntry[]) => string
- `SiteConfig`: { siteName: string; description?: string; author?: string; locale?: string; menus?: Record<string, unknown>; spellcheck?: { dialect?: string }; tidy?: TidyConfig; vocabulary?: VocabularyEntry[] }
- `SiteConfigError`: typeof SiteConfigError
- `SiteRender`: (input: { body: string; concept?: string; frontmatter?: Record<string, unknown>; resolve?: LinkResolve; resolveMedia?: MediaResolve }) => Promise<string>
- `SlotDef`: { name: string; label: string; kind: "markdown" | "inline" | "repeatable"; required?: boolean; help?: string; itemFields?: Record<string, FieldDescriptor>; itemLabel?: ((item: Record<string, string | boolean>, index: number) => string) }
- `SlotKind`: "markdown" | "inline" | "repeatable"
- `slugFromId`: (id: string, datePrefix: DatePrefix | null) => string
- `slugify`: (title: string) => string
- `StandardInput`: { frontmatter: { [x: string]: unknown }; body: string }
- `StandardSchemaV1`: { ~standard: { readonly version: 1; readonly vendor: string; readonly validate: (value: unknown) => StandardResult<Output>; readonly types?: { readonly input: Input; readonly output: Output } } }
- `TextareaField`: { type: "textarea"; rows?: number; min?: number; max?: number; length?: number; pattern?: string; label: string; help?: string; required?: boolean; default?: string | boolean }
- `TextField`: { type: "text"; min?: number; max?: number; length?: number; pattern?: string; label: string; help?: string; required?: boolean; default?: string | boolean }
- `upsertEntry`: (manifest: Manifest, entry: ManifestEntry) => Manifest
- `UrlField`: { type: "url"; label: string; help?: string; required?: boolean; default?: string | boolean }
- `validateComponent`: (markdown: string, def: ComponentDef) => Promise<ComponentValidation>
- `validateNavTree`: (value: unknown, maxDepth: number) => NavNode[]
- `validateVocabulary`: (value: unknown) => VocabularyEntry[]
- `ValidationIssue`: { path: (string | number)[]; message: string }
- `ValidationResult`: { ok: true; data: Record<string, unknown> } | { ok: false; errors: Record<string, string>; issues?: ValidationIssue[] }
- `verifyManifest`: (built: Manifest, committedRaw: string) => void
- `verifyReferences`: (manifest: Manifest) => void
- `VocabularyEntry`: { value: string; label: string }

## `/ambient`

- `App.Locals`: { editor?: Editor | null; backend?: Backend }

## `/components`

- `CairnAdmin`: Component<Props, {}, "">
- `CairnAdminShell`: Component<Props, {}, "">
- `CairnMediaLibrary`: Component<Props, {}, "">
- `CairnTidySettings`: Component<Props, {}, "">
- `ComponentForm`: Component<Props, {}, "incomplete" | "values">
- `ComponentInsertDialog`: Component<Props, { open: () => void; editComponent: (def: ComponentDef, values: ComponentValues, range: { from: number; to: number }) => void }, "">
- `ConceptList`: Component<Props, {}, "">
- `ConfirmPage`: Component<Props, {}, "">
- `CsrfField`: Component<Props, {}, "">
- `DeleteDialog`: Component<Props, { open: () => void }, "">
- `EditPage`: Component<Props, {}, "">
- `HelpHome`: Component<$$ComponentProps, {}, "">
- `IconPicker`: Component<Props, {}, "">
- `LinkPicker`: Component<Props, { open: () => void }, "">
- `LoginPage`: Component<Props, {}, "">
- `ManageEditors`: Component<Props, {}, "">
- `MarkdownEditor`: Component<Props, {}, "value">
- `NavTree`: Component<Props, {}, "">
- `RenameDialog`: Component<Props, { open: () => void }, "">

## `/components/spellcheck-worker`

- `createSpellcheckHandler`: (engine: SpellEngine) => { handle(message: HandlerMessage, post: Post): void }
- `OutboundMessage`: ReadyMessage | CheckResult | SuggestResult | ErrorResult
- `SpellEngine`: { check: (word: string) => boolean; suggest: (word: string) => string[] }

## `/delivery`

- `buildJsonFeed`: (channel: FeedChannel, items: FeedItem[]) => string
- `buildLinkResolver`: (site: SiteResolver) => LinkResolve
- `buildRobots`: (opts: { sitemapUrl: string; disallow?: string[] }) => string
- `buildRssFeed`: (channel: FeedChannel, items: FeedItem[]) => string
- `buildSeoMeta`: (input: SeoInput) => SeoMeta
- `buildSiteManifest`: <A extends CairnAdapter>(adapter: A, config: SiteConfig, globs: SiteGlobs<A>) => Manifest
- `buildSitemap`: (urls: SitemapUrl[]) => string
- `ConceptIndex`: { descriptor: ConceptDescriptor; index: ContentIndex<Record<string, unknown>> }
- `ContentEntry`: { frontmatter: F; body: string; concept: string; id: string; slug: string; permalink: string; title: string; date?: string; updated?: string; tags: string[]; excerpt: string; wordCount: number; draft: boolean; fields: { [x: string]: unknown } }
- `ContentIndex`: { all: (opts?: { includeDrafts?: boolean }) => ContentSummary[]; byId: (id: string) => ContentEntry<F>; byTag: (tag: string, opts?: { includeDrafts?: boolean }) => ContentSummary[]; allTags: () => { tag: string; count: number }[]; adjacent: (id: string) => { newer?: ContentSummary; older?: ContentSummary }; problems: () => ContentProblem[] }
- `ContentProblem`: { id: string; draft: boolean; errors: { [x: string]: string } }
- `ContentSummary`: { concept: string; id: string; slug: string; permalink: string; title: string; date?: string; updated?: string; tags: string[]; excerpt: string; wordCount: number; draft: boolean; fields: { [x: string]: unknown } }
- `createContentIndex`: <F = Record<string, unknown>>(files: RawFile[], descriptor: ConceptDescriptor) => ContentIndex<F>
- `createPublicRoutes`: (deps: PublicRoutesDeps) => { entryLoad: (event: { url: URL }) => Promise<EntryData>; entries: () => { path: string }[] }
- `createSiteIndexes`: <const A extends CairnAdapter>(adapter: A, config: SiteConfig, globs: SiteGlobs<A>, opts?: { validate?: boolean }) => SiteIndexes<A>
- `createSiteResolver`: (concepts: ConceptIndex[], opts?: { validate?: boolean }) => SiteResolver
- `deriveExcerpt`: (body: string, opts?: { description?: string; maxChars?: number }) => string
- `EntryData`: { concept: string; entry: ContentEntry<Record<string, unknown>>; html: string; canonicalUrl: string; seo: SeoMeta; newer?: ContentSummary; older?: ContentSummary; heroImage?: { url: string; absoluteUrl?: string; alt: string; caption?: string } }
- `FeedChannel`: { title: string; description: string; siteUrl: string; feedUrl: string; language?: string; author?: { name: string; email?: string } }
- `FeedItem`: { title: string; url: string; date?: string; updated?: string; summary: string; contentHtml?: string; tags?: string[] }
- `feedView`: (site: SiteResolver, descriptors: ConceptDescriptor[], origin: string) => FeedItem[]
- `fromGlob`: (record: Record<string, string>) => RawFile[]
- `jsonFeedResponse`: (channel: FeedChannel, items: FeedItem[]) => Response
- `jsonLdScript`: (data: Record<string, unknown>) => string
- `permalink`: (descriptor: ConceptDescriptor, entry: { id: string; slug: string; date?: string }) => string
- `PublicRoutesDeps`: { site: SiteResolver; render: (input: { body: string; concept?: string; frontmatter?: Record<string, unknown>; resolve?: LinkResolve; resolveMedia?: MediaResolve }) => Promise<string>; origin: string; siteName: string; description: string; feeds?: { rss?: string; json?: string }; defaultImage?: string; resolveMedia?: MediaResolve; assetsEnabled?: boolean }
- `RawFile`: { path: string; raw: string }
- `readSeoFields`: (frontmatter: Record<string, unknown>) => SeoFields
- `ResolvedReference`: { id: string; concept: string; title: string; permalink: string; summary?: string }
- `resolveImageUrl`: (image: string, origin: string) => string
- `resolveReferences`: (site: SiteResolver, descriptor: ConceptDescriptor, frontmatter: Record<string, unknown>) => Record<string, ResolvedReference | ResolvedReference[]>
- `robotsResponse`: (opts: { sitemapUrl: string; disallow?: string[] }) => Response
- `rssResponse`: (channel: FeedChannel, items: FeedItem[]) => Response
- `SeoFields`: { description?: string; image?: string; robots?: string; author?: string }
- `SeoInput`: { title: string; description: string; canonicalUrl: string; siteName: string; type?: "website" | "article"; published?: string; modified?: string; feeds?: { rss?: string; json?: string }; image?: string; imageAlt?: string; robots?: string; author?: string }
- `SeoMeta`: { title: string; meta: { name?: string; property?: string; content: string }[]; links: { rel: string; type?: string; href: string; title?: string }[]; jsonLd: { [x: string]: unknown } }
- `siteDescriptors`: (adapter: CairnAdapter, siteConfig: SiteConfig) => ConceptDescriptor[]
- `SiteGlobs`: { [K in keyof A["content"]]?: Record<string, string> }
- `SiteIndexes`: { [K in keyof A["content"]]: ContentIndex<NonNullable<A["content"][K]> extends ConceptConfig<infer S extends Fieldset<Record<string, FieldDescriptor>>> ? InferFieldset<S> : Record<string, unknown>> } & { readonly site: SiteResolver }
- `sitemapResponse`: (urls: SitemapUrl[]) => Response
- `SitemapUrl`: { loc: string; lastmod?: string }
- `sitemapView`: (site: SiteResolver, descriptors: ConceptDescriptor[], origin: string) => SitemapUrl[]
- `SiteResolver`: { byPermalink: (path: string) => ContentEntry<Record<string, unknown>>; adjacent: (entry: ContentSummary) => { newer?: ContentSummary; older?: ContentSummary }; entries: () => { path: string }[]; concept: (id: string) => ContentIndex<Record<string, unknown>>; all: () => ContentSummary[] }
- `wordCount`: (body: string) => number

## `/delivery/data`

- `buildJsonFeed`: (channel: FeedChannel, items: FeedItem[]) => string
- `buildLinkResolver`: (site: SiteResolver) => LinkResolve
- `buildRobots`: (opts: { sitemapUrl: string; disallow?: string[] }) => string
- `buildRssFeed`: (channel: FeedChannel, items: FeedItem[]) => string
- `buildSeoMeta`: (input: SeoInput) => SeoMeta
- `buildSiteManifest`: <A extends CairnAdapter>(adapter: A, config: SiteConfig, globs: SiteGlobs<A>) => Manifest
- `buildSitemap`: (urls: SitemapUrl[]) => string
- `ConceptIndex`: { descriptor: ConceptDescriptor; index: ContentIndex<Record<string, unknown>> }
- `ContentEntry`: { frontmatter: F; body: string; concept: string; id: string; slug: string; permalink: string; title: string; date?: string; updated?: string; tags: string[]; excerpt: string; wordCount: number; draft: boolean; fields: { [x: string]: unknown } }
- `ContentIndex`: { all: (opts?: { includeDrafts?: boolean }) => ContentSummary[]; byId: (id: string) => ContentEntry<F>; byTag: (tag: string, opts?: { includeDrafts?: boolean }) => ContentSummary[]; allTags: () => { tag: string; count: number }[]; adjacent: (id: string) => { newer?: ContentSummary; older?: ContentSummary }; problems: () => ContentProblem[] }
- `ContentProblem`: { id: string; draft: boolean; errors: { [x: string]: string } }
- `ContentSummary`: { concept: string; id: string; slug: string; permalink: string; title: string; date?: string; updated?: string; tags: string[]; excerpt: string; wordCount: number; draft: boolean; fields: { [x: string]: unknown } }
- `createContentIndex`: <F = Record<string, unknown>>(files: RawFile[], descriptor: ConceptDescriptor) => ContentIndex<F>
- `createSiteIndexes`: <const A extends CairnAdapter>(adapter: A, config: SiteConfig, globs: SiteGlobs<A>, opts?: { validate?: boolean }) => SiteIndexes<A>
- `createSiteResolver`: (concepts: ConceptIndex[], opts?: { validate?: boolean }) => SiteResolver
- `deriveExcerpt`: (body: string, opts?: { description?: string; maxChars?: number }) => string
- `FeedChannel`: { title: string; description: string; siteUrl: string; feedUrl: string; language?: string; author?: { name: string; email?: string } }
- `FeedItem`: { title: string; url: string; date?: string; updated?: string; summary: string; contentHtml?: string; tags?: string[] }
- `feedView`: (site: SiteResolver, descriptors: ConceptDescriptor[], origin: string) => FeedItem[]
- `fromGlob`: (record: Record<string, string>) => RawFile[]
- `jsonFeedResponse`: (channel: FeedChannel, items: FeedItem[]) => Response
- `jsonLdScript`: (data: Record<string, unknown>) => string
- `permalink`: (descriptor: ConceptDescriptor, entry: { id: string; slug: string; date?: string }) => string
- `RawFile`: { path: string; raw: string }
- `readSeoFields`: (frontmatter: Record<string, unknown>) => SeoFields
- `ResolvedReference`: { id: string; concept: string; title: string; permalink: string; summary?: string }
- `resolveImageUrl`: (image: string, origin: string) => string
- `resolveReferences`: (site: SiteResolver, descriptor: ConceptDescriptor, frontmatter: Record<string, unknown>) => Record<string, ResolvedReference | ResolvedReference[]>
- `robotsResponse`: (opts: { sitemapUrl: string; disallow?: string[] }) => Response
- `rssResponse`: (channel: FeedChannel, items: FeedItem[]) => Response
- `SeoFields`: { description?: string; image?: string; robots?: string; author?: string }
- `SeoInput`: { title: string; description: string; canonicalUrl: string; siteName: string; type?: "website" | "article"; published?: string; modified?: string; feeds?: { rss?: string; json?: string }; image?: string; imageAlt?: string; robots?: string; author?: string }
- `SeoMeta`: { title: string; meta: { name?: string; property?: string; content: string }[]; links: { rel: string; type?: string; href: string; title?: string }[]; jsonLd: { [x: string]: unknown } }
- `siteDescriptors`: (adapter: CairnAdapter, siteConfig: SiteConfig) => ConceptDescriptor[]
- `SiteGlobs`: { [K in keyof A["content"]]?: Record<string, string> }
- `SiteIndexes`: { [K in keyof A["content"]]: ContentIndex<NonNullable<A["content"][K]> extends ConceptConfig<infer S extends Fieldset<Record<string, FieldDescriptor>>> ? InferFieldset<S> : Record<string, unknown>> } & { readonly site: SiteResolver }
- `sitemapResponse`: (urls: SitemapUrl[]) => Response
- `SitemapUrl`: { loc: string; lastmod?: string }
- `sitemapView`: (site: SiteResolver, descriptors: ConceptDescriptor[], origin: string) => SitemapUrl[]
- `SiteResolver`: { byPermalink: (path: string) => ContentEntry<Record<string, unknown>>; adjacent: (entry: ContentSummary) => { newer?: ContentSummary; older?: ContentSummary }; entries: () => { path: string }[]; concept: (id: string) => ContentIndex<Record<string, unknown>>; all: () => ContentSummary[] }
- `wordCount`: (body: string) => number

## `/delivery/head`

- `CairnHead`: Component<$$ComponentProps, {}, "">

## `/islands`

- `hydrateIslands`: (islands: IslandRegistry, root?: ParentNode) => void
- `IslandRegistry`: { [x: string]: Component<Record<string, unknown>, {}, string> }

## `/media`

- `findByHash`: (manifest: MediaManifest, hash: string) => MediaEntry
- `hashBytes`: (bytes: Uint8Array<ArrayBufferLike>) => Promise<string>
- `makeMediaResolver`: (manifest: MediaManifest, resolved: ResolvedAssetConfig, opts?: { preset?: string }) => MediaResolve
- `manifestMediaResolver`: (targets: Record<string, { slug: string; ext: string; contentType: string }>) => MediaResolve
- `MediaEntry`: { hash: string; sha256: string; slug: string; displayName: string; originalFilename: string; alt: string; ext: string; contentType: string; bytes: number; width: number | null; height: number | null; createdAt: string }
- `MediaManifest`: { [x: string]: MediaEntry }
- `MediaRef`: { slug: string | null; hash: string }
- `MediaResolve`: (ref: MediaRef) => string
- `mediaToken`: (ref: MediaRef) => string
- `normalizeAssets`: (assets: AssetConfig) => ResolvedAssetConfig
- `parseMediaEntries`: (value: unknown) => MediaEntry[]
- `parseMediaManifest`: (json: unknown) => MediaManifest
- `parseMediaToken`: (href: string) => MediaRef | null
- `presetUrl`: (publicPath: string, presetName: string, variants: Record<string, VariantSpec>) => string
- `publicPath`: (slug: string | null, shortHash: string, ext: string, urlForm: "slug" | "opaque", publicBase?: string) => string
- `r2Key`: (shortHash: string, ext: string) => string
- `readCommittedManifest`: (globResult: Record<string, unknown>) => MediaManifest
- `removeMediaEntry`: (manifest: MediaManifest, hash: string) => MediaManifest
- `ResolvedAssetConfig`: { enabled: false } | { enabled: true; bucketBinding: string; publicBase: string; urlForm: "slug" | "opaque"; maxUploadBytes: number; allowedTypes: string[]; variants: Record<string, VariantSpec>; transformations: boolean }
- `serializeMediaManifest`: (manifest: MediaManifest) => string
- `shortHash`: (full: string) => string
- `slugifyFilename`: (name: string) => string
- `upsertMediaEntry`: (manifest: MediaManifest, entry: MediaEntry) => MediaManifest
- `VariantSpec`: { width?: number; height?: number; quality?: number; fit?: "scale-down" | "contain" | "cover" | "crop" | "pad"; gravity?: string; format?: string }
- `variantUrl`: (publicPath: string, spec: VariantSpec) => string

## `/render`

- `cardShell`: (classes: string[], body: ElementContent[]) => Element
- `ComponentContext`: { attributes: { [x: string]: string | boolean }; slot: (name: string) => ElementContent[]; items: (name: string) => ElementContent[][]; node: Element }
- `headRow`: (title: ElementContent[], icon?: Element, level?: number) => Element
- `iconSpan`: (glyphEl: Element, role?: string) => Element
- `isElement`: (node: ElementContent) => node is Element
- `MakeIcon`: (name: string, role?: string) => Element
- `strAttr`: (ctx: ComponentContext, key: string) => string

## `/sveltekit`

- `AdminData`: { view: "login"; page: { siteName: string; error: string | null; csrf: string } } | { view: "confirm"; page: { token: string; siteName: string; error: string | null; csrf: string } } | { view: "list"; page: ListData } | { view: "edit"; page: EditData } | { view: "editors"; page: { editors: Editor[]; self: string } } | { view: "nav"; page: NavLoadData } | { view: "media"; page: MediaLibraryData } | { view: "settings"; page: SettingsData } | { view: "help"; page: HelpData }
- `AdminNavEntry`: { label: string; icon: "list" | "anchor" | "calendar" | "clipboard-list" | "users" | "package" | "inbox" | "table" | "wrench"; href: string; ownerOnly?: boolean }
- `AdminNavIcon`: "list" | "anchor" | "calendar" | "clipboard-list" | "users" | "package" | "inbox" | "table" | "wrench"
- `AdminShellData`: { public: true; siteName: string } | { public: false; siteName: string; user: { displayName: string; email: string; role: Role }; concepts: NavConcept[]; customNav: ResolvedNavEntry[]; pathname: string; canManageEditors: boolean; navLabel: string | null; theme: "cairn-admin" | "cairn-admin-dark"; collapsedNav: string[]; csrf: string; pendingEntries: Promise<{ concept: string; id: string }[] | null> }
- `AdminView`: { view: "index" } | { view: "login" } | { view: "confirm" } | { view: "list"; concept: ConceptDescriptor } | { view: "edit"; concept: ConceptDescriptor; id: string } | { view: "editors" } | { view: "nav" } | { view: "media" } | { view: "settings" } | { view: "help" }
- `AdvisoryAction`: { label: string; href?: string }
- `AdvisoryNotice`: { kind: string; severity: "warn"; message: string; actions?: AdvisoryAction[] }
- `AuthEnv`: { AUTH_DB?: D1Database; PUBLIC_ORIGIN?: string; CAIRN_DEV_BACKEND?: string | boolean; EMAIL?: { send(message: { to: string; from: string; subject: string; html: string; text: string }): Promise<void> } }
- `AuthRoutesConfig`: { branding: AuthBranding; send?: SendMagicLink }
- `BackendEnv`: { GITHUB_APP_PRIVATE_KEY_B64?: string }
- `CairnAdminDeps`: { branding?: AuthBranding; send?: SendMagicLink; anthropic?: ((opts: { apiKey: string }) => TidyClient); tidyTimeoutMs?: number }
- `ContentEvent`: { params: { [x: string]: string }; cookies?: CookieJar; url: URL; request: Request; locals: { editor?: Editor | null; backend?: Backend }; platform?: PlatformContext<BackendEnv> }
- `ContentFormFailure`: { error?: string; brokenLinks?: string[]; body?: string; inboundLinks?: InboundLink[]; id?: string; hash?: string; usage?: UsageEntry[]; foundIn?: number }
- `ContentRoutesDeps`: { backend?: Backend; anthropic?: ((opts: { apiKey: string }) => TidyClient); tidyTimeoutMs?: number }
- `CookieJar`: { get: (name: string) => string; set: (name: string, value: string, opts: CookieSetOptions) => void; delete: (name: string, opts: { path: string }) => void }
- `createAuthGuard`: () => ({ event, resolve }: HandleInput) => Promise<Response>
- `createAuthRoutes`: (config: AuthRoutesConfig) => { loginLoad: (event: RequestContext) => { siteName: string; error: string | null; csrf: string }; requestAction: (event: RequestContext) => Promise<RequestResult>; confirmLoad: (event: RequestContext) => { token: string; siteName: string; error: string | null; csrf: string }; confirmAction: (event: RequestContext) => Promise<never>; logoutAction: (event: RequestContext) => Promise<never> }
- `createCairnAdmin`: (runtime: CairnRuntime, deps?: CairnAdminDeps) => { load: (event: AdminEvent) => Promise<AdminData>; actions: { request: (event: AdminEvent) => Promise<RequestResult>; confirm: (event: AdminEvent) => Promise<never>; logout: (event: AdminEvent) => Promise<never>; create: (event: AdminEvent) => Promise<never>; save: (event: AdminEvent) => Promise<ActionFailure<unknown>>; saveSettings: (event: AdminEvent) => Promise<never>; upload: (event: AdminEvent) => Promise<ActionFailure<unknown> | UploadResult>; publish: (event: AdminEvent) => Promise<ActionFailure<unknown>>; discard: (event: AdminEvent) => Promise<never>; rename: (event: AdminEvent) => Promise<ActionFailure<unknown>>; addDictionaryWord: (event: AdminEvent) => Promise<ActionFailure<unknown> | DictionaryAddResult>; tidy: (event: AdminEvent) => Promise<ActionFailure<unknown> | TidyResult>; delete: (event: AdminEvent) => Promise<ActionFailure<unknown>>; mediaDelete: (event: AdminEvent) => Promise<ActionFailure<unknown>>; mediaUpdate: (event: AdminEvent) => Promise<ActionFailure<unknown>>; mediaUpload: (event: AdminEvent) => Promise<ActionFailure<unknown> | UploadResult>; mediaReplacePreview: (event: AdminEvent) => Promise<ActionFailure<unknown> | MediaReplacePreviewPlan>; mediaReplace: (event: AdminEvent) => Promise<ActionFailure<unknown>>; mediaAltPreview: (event: AdminEvent) => Promise<ActionFailure<unknown> | MediaAltPreviewPlan>; mediaAltPropagate: (event: AdminEvent) => Promise<ActionFailure<unknown>>; mediaBulkDelete: (event: AdminEvent) => Promise<ActionFailure<unknown> | MediaBulkDeleteResult>; mediaOrphanScan: (event: AdminEvent) => Promise<ActionFailure<unknown> | OrphanScan>; mediaPurge: (event: AdminEvent) => Promise<ActionFailure<unknown> | MediaOrphanPurgeResult>; publishAll: (event: AdminEvent) => Promise<never>; addEditor: (event: AdminEvent) => Promise<ActionFailure<{ error: string }> | { ok: true }>; removeEditor: (event: AdminEvent) => Promise<ActionFailure<{ error: string }> | { ok: true }>; setRole: (event: AdminEvent) => Promise<ActionFailure<{ error: string }> | { ok: true }> }; shellLoad: (event: AdminEvent) => { shell: AdminShellData } }
- `createContentRoutes`: (runtime: CairnRuntime, deps?: ContentRoutesDeps) => { shellPayload: (event: ContentEvent) => { shell: AdminShellData }; helpLoad: (event: ContentEvent) => Promise<HelpData>; indexRedirect: () => never; listLoad: (event: ContentEvent) => Promise<ListData>; mediaLibraryLoad: (event: ContentEvent) => Promise<MediaLibraryData>; settingsLoad: (event: ContentEvent) => SettingsData; settingsSave: (event: ContentEvent) => Promise<never>; createAction: (event: ContentEvent) => Promise<never>; editLoad: (event: ContentEvent) => Promise<EditData>; saveAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>; publishAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>; publishAllAction: (event: ContentEvent) => Promise<never>; discardAction: (event: ContentEvent) => Promise<never>; deleteAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>; listDeleteAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>; renameAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>; uploadAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | UploadResult>; mediaDeleteAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>; mediaBulkDelete: (event: ContentEvent) => Promise<ActionFailure<unknown> | MediaBulkDeleteResult>; mediaOrphanScan: (event: ContentEvent) => Promise<ActionFailure<unknown> | OrphanScan>; mediaPurgeOrphans: (event: ContentEvent) => Promise<ActionFailure<unknown> | MediaOrphanPurgeResult>; mediaUpdateAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>; mediaReplacePreview: (event: ContentEvent) => Promise<ActionFailure<unknown> | MediaReplacePreviewPlan>; mediaReplaceApply: (event: ContentEvent) => Promise<ActionFailure<unknown>>; mediaAltPreview: (event: ContentEvent) => Promise<ActionFailure<unknown> | MediaAltPreviewPlan>; mediaAltApply: (event: ContentEvent) => Promise<ActionFailure<unknown>>; addDictionaryWord: (event: ContentEvent) => Promise<ActionFailure<unknown> | DictionaryAddResult>; tidyAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | TidyResult> }
- `createEditorRoutes`: () => { editorsLoad: (event: RequestContext) => Promise<{ editors: Editor[]; self: string }>; addEditorAction: (event: RequestContext) => Promise<ActionFailure<{ error: string }> | { ok: true }>; removeEditorAction: (event: RequestContext) => Promise<ActionFailure<{ error: string }> | { ok: true }>; setRoleAction: (event: RequestContext) => Promise<ActionFailure<{ error: string }> | { ok: true }> }
- `createMediaRoute`: (resolved: ResolvedAssetConfig) => RequestHandler
- `createNavRoutes`: (runtime: CairnRuntime, deps?: NavRoutesDeps) => { navLoad: (event: ContentEvent) => Promise<NavLoadData>; navSave: (event: ContentEvent) => Promise<never> }
- `DeleteRefusal`: { error: string; inboundLinks: InboundLink[]; id: string }
- `EditData`: { conceptId: string; id: string; label: string; fields: NamedField[]; frontmatter: { [x: string]: unknown }; body: string; title: string; isNew: boolean; saved: boolean; renamed: boolean; error: string | null; slug: string; linkTargets: LinkTarget[]; mediaTargets: { [x: string]: { slug: string; ext: string; contentType: string } }; mediaLibrary: { [x: string]: MediaLibraryEntry }; inboundLinks: InboundLink[]; pending: boolean; published: boolean; publishedFlash: boolean; discardedFlash: boolean; preview: ResolvedPreview | null; spellcheckDictionary: string; siteDictionary: string[]; tidy: { enabled: boolean; model: string; conventions: TidyConventions }; advisories: AdvisoryNotice[] }
- `EntrySummary`: { id: string; title: string; date: string | null; draft: boolean; status: "published" | "edited" | "new"; summary: string | null }
- `HandleInput`: { event: RequestContext; resolve: (event: RequestContext) => Response | Promise<Response> }
- `HealthData`: { ok: boolean; checks: { githubAppSigning: { ok: boolean; detail?: string } } }
- `healthLoad`: (event: { platform?: { env?: BackendEnv } }, runtime: CairnRuntime) => Promise<HealthData>
- `HelpData`: { gettingStarted: GettingStarted; reference: MarkdownReferenceRow[]; supportContact?: string }
- `isPublicAdminPath`: (pathname: string) => boolean
- `ListData`: { conceptId: string; label: string; singular: string; dated: boolean; entries: EntrySummary[]; error: string | null; formError: string | null; publishedAll: number | null }
- `MediaAltPropagateFailure`: { error: string }
- `MediaBulkFailure`: { error: string }
- `MediaDeleteRefusal`: { error: string; hash: string; usage: UsageEntry[]; foundIn: number }
- `MediaLibraryData`: { assets: MediaLibraryEntry[]; usage: { [x: string]: MediaUsageInfo }; error: string | null; flash: "deleted" | "updated" | "replaced" | "altPropagated" | "bulkDeleted" | "orphansPurged" | null; flashError: string | null }
- `MediaReplaceFailure`: { error: string; hash: string; usage: UsageEntry[]; foundIn: number }
- `MediaUpdateFailure`: { error: string }
- `MediaUsageInfo`: { count: number; entries: UsageEntry[] }
- `NavConcept`: { id: string; label: string }
- `NavLoadData`: { menu: { name: string; label: string; maxDepth: number }; tree: NavNode[]; pages: NavPageOption[]; saved: boolean; error: string | null }
- `NavPageOption`: { label: string; url: string }
- `NavRoutesDeps`: { backend?: Backend }
- `parseAdminPath`: (pathname: string, concepts: ConceptDescriptor[]) => AdminView | null
- `RenameFailure`: { error: string }
- `RequestContext`: { cookies: CookieJar; setHeaders: (headers: Record<string, string>) => void; url: URL; request: Request; locals: { editor?: Editor | null; backend?: Backend }; platform?: PlatformContext<AuthEnv> }
- `RequestResult`: { status: "sent"; sent: true } | { status: "send_error"; sent: false } | { status: "throttled"; sent: false }
- `requireOwner`: (event: { locals: { editor?: Editor | null } }) => Editor
- `requireSession`: (event: { locals: { editor?: Editor | null } }) => Editor
- `ResolvedNavEntry`: { label: string; iconName: "list" | "anchor" | "calendar" | "clipboard-list" | "users" | "package" | "inbox" | "table" | "wrench"; href: string; ownerOnly: boolean }
- `SaveFailure`: { error: string; brokenLinks: string[]; body: string }
- `UploadResult`: { reference: string; record: MediaEntry; reused: boolean; mismatch: boolean }

## `/vite`

- `AdapterFacts`: { owner?: string; repo?: string; from?: string; mediaBucketBinding?: string }
- `buildManifestFromVite`: (opts: CairnManifestOptions, root: string) => Promise<string>
- `cairnManifest`: (opts: CairnManifestOptions) => Plugin<any>
- `CairnManifestOptions`: { configModule: string; content: { [x: string]: string }; manifestPath?: string }
- `readAdapterFacts`: (cwd?: string) => Promise<AdapterFacts | null>
- `stripCairnManifest`: (plugins: PluginOption | PluginOption[]) => PluginOption[]
- `verifyManifestFromVite`: (opts: CairnManifestOptions, root: string) => Promise<void>
- `writeManifest`: (cwd?: string) => Promise<void>

