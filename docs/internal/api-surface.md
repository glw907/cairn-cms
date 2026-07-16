GENERATED — run `npm run check:surface -- --update` to regenerate

## `.`

- `AssetConfig`: { bucketBinding: string; publicBase?: string; urlForm?: "slug" | "opaque"; maxUploadBytes?: number; allowedTypes?: string[]; variants?: Record<string, VariantSpec>; transformations?: boolean }
- `AuthBranding`: { siteName: string; from: string; replyTo?: string }
- `AuthEnv`: { AUTH_DB?: D1Database; PUBLIC_ORIGIN?: string; CAIRN_DEV_BACKEND?: string | boolean; EMAIL?: { send(message: { to: string; from: string; subject: string; html: string; text: string; cc?: EmailRecipient | EmailRecipient[]; bcc?: EmailRecipient | EmailRecipient[]; replyTo?: string; attachments?: EmailAttachment[] }): Promise<void> } }
- `Backend`: { defaultBranch: string; readFile: (path: string, ref: string) => Promise<string | null>; readEntries: (dir: string, ref: string) => Promise<RepoFile[]>; branchHead: (branch: string) => Promise<string | null>; listBranches: (prefix: string) => Promise<string[]>; commit: (branch: string, changes: FileChange[], author: CommitAuthor, message: string, expectedHead?: string) => Promise<string>; createBranch: (name: string, fromBranch: string) => Promise<void>; deleteBranch: (name: string) => Promise<void> }
- `BackendEnv`: { GITHUB_APP_PRIVATE_KEY_B64?: string }
- `BackendProvider`: { kind: string; branch: string; connect: (env: BackendEnv) => Backend }
- `CairnAdapter`: { content: { [x: string]: ConceptConfig<Fieldset<Record<string, FieldDescriptor>>> }; roles?: RolesDeclaration; backend: BackendProvider; email: SenderConfig; rendering: { render: SiteRender; components?: ComponentRegistry; icons?: IconSet; islands?: IslandRegistry }; media?: AssetConfig; editor?: { preview?: PreviewConfig; nav?: NavMenuConfig; supportContact?: string; adminNav?: AdminNavConfig; navLayout?: NavLayout; publishActions?: PublishActionsConfig } }
- `CairnRef`: { concept: string; id: string }
- `CairnRolesRegister`: { }
- `CairnRuntime`: { siteName: string; concepts: ConceptDescriptor[]; roles?: RolesDeclaration; backend: BackendProvider; sender: SenderConfig; supportContact?: string; render: (input: { body: string; concept?: string; frontmatter?: Record<string, unknown>; resolve?: LinkResolve; resolveMedia?: MediaResolve; resolveFragment?: FragmentResolve }) => Promise<string>; manifestPath: string; mediaManifestPath: string; dictionaryPath?: string; resolvedAssets: { enabled: false } | { enabled: true; bucketBinding: string; publicBase: string; urlForm: "slug" | "opaque"; maxUploadBytes: number; allowedTypes: string[]; variants: Record<string, VariantSpec>; transformations: boolean }; registry?: ComponentRegistry; icons?: IconSet; navMenu?: NavMenuConfig; adminNav?: AdminNavConfig; navLayout?: NavLayout; publishActions?: PublishActionsConfig; preview?: PreviewConfig; assets?: AssetConfig; spellcheckDictionary?: string; tidy?: TidyConfig; vocabulary: VocabularyEntry[] }
- `Capability`: "owner" | "editor" | "none"
- `CommitAuthor`: { name: string; email: string }
- `CommitConflictError`: typeof CommitConflictError
- `ComponentDef`: { name: string; label: string; description: string; insertTemplate?: string; build: (ctx: ComponentContext) => Element; hydrate?: boolean | "visible"; defaultIconByRole?: Record<string, string>; use?: string; attributes?: Record<string, FieldDescriptor>; behavior?: BehaviorTable; attributeSchema?: Fieldset<Record<string, FieldDescriptor>>; slots?: SlotDef[]; icon?: string; group?: string; hidden?: boolean; preview?: { attributes?: Record<string, string | boolean>; slots?: Record<string, string | string[]> } }
- `ComponentRegistry`: { defs: ComponentDef[]; names: string[]; get: (name: string) => ComponentDef; defaultIcon: (name: string, role?: string) => string; iconField: (name: string) => string }
- `ComposeInput`: { adapter: CairnAdapter; siteConfig: SiteConfig }
- `composeRuntime`: ({ adapter, siteConfig }: ComposeInput) => CairnRuntime
- `ConceptConfig`: { dir: string; label?: string; singular?: string; fields: S; routing?: "feed" | "page" | "embedded"; permalink?: string; datePrefix?: DatePrefix; summaryFields?: string[] }
- `ConceptDescriptor`: { id: string; label: string; singular: string; dir: string; routing: RoutingRule; permalink: string; datePrefix: "year" | "month" | "day"; fields: NamedField[]; schema: Fieldset<Record<string, FieldDescriptor>>; summaryFields: string[]; validate: (frontmatter: Record<string, unknown>, body: string) => ValidationResult }
- `ConceptUrlPolicy`: { permalink?: string; datePrefix?: DatePrefix }
- `createRenderer`: (registry?: ComponentRegistry, options?: RendererOptions) => { remarkPlugins: PluggableList; rehypePlugins: PluggableList; renderMarkdown: (content: string, opts?: { resolve?: LinkResolve; resolveMedia?: MediaResolve; resolveFragment?: FragmentResolve }) => Promise<string> }
- `DEFAULT_ROLES`: { owner: "owner"; editor: "editor" }
- `defineAdapter`: <const A extends CairnAdapter>(adapter: A) => A
- `defineComponent`: <const D extends ComponentDef>(def: D) => D & { attributeSchema: Fieldset<Record<string, FieldDescriptor>> }
- `defineConcept`: <const C extends ConceptConfig>(concept: C) => C
- `defineRegistry`: ({ components }: { components: ComponentDef[] }) => ComponentRegistry
- `defineRoles`: <const R extends RolesDeclaration>(roles: R) => R
- `Editor`: { email: string; displayName: string; role: "owner" | "editor"; capability: "owner" | "editor" | "none" }
- `EmailAttachment`: { content: string | ArrayBuffer | ArrayBufferView<ArrayBufferLike>; filename: string; type: string; disposition: "attachment" | "inline" }
- `EmailRecipient`: string | { email: string; name?: string }
- `extractMenu`: (config: SiteConfig, name: string, maxDepth: number) => NavNode[]
- `extractVocabulary`: (config: SiteConfig) => VocabularyEntry[]
- `FieldDescriptor`: TextField | TextareaField | NumberField | SelectField | MultiselectField | UrlField | EmailField | DateField | DatetimeField | BooleanField | IconField | ImageField | ObjectField | ReferenceField | ArrayField
- `fields`: { text: <const O extends Omit<TextField, "type">>(o: O) => TextField & O; textarea: <const O extends Omit<TextareaField, "type">>(o: O) => TextareaField & O; number: <const O extends Omit<NumberField, "type">>(o: O) => NumberField & O; select: <const O extends Omit<SelectField, "type">>(o: O) => SelectField & O; multiselect: <const O extends Omit<MultiselectField, "type">>(o: O) => MultiselectField & O; url: <const O extends Omit<UrlField, "type">>(o: O) => UrlField & O; email: <const O extends Omit<EmailField, "type">>(o: O) => EmailField & O; date: <const O extends Omit<DateField, "type">>(o: O) => DateField & O; datetime: <const O extends Omit<DatetimeField, "type">>(o: O) => DatetimeField & O; boolean: <const O extends Omit<BooleanField, "type">>(o: O) => BooleanField & O; icon: <const O extends Omit<IconField, "type">>(o: O) => IconField & O; image: <const O extends Omit<ImageField, "type">>(o: O) => ImageField & O; object: <const F extends Record<string, FieldDescriptor>, const O extends Omit<ObjectField, "type" | "fields">>(o: { fields: F } & O) => ObjectField & { fields: F } & O; reference: <const O extends Omit<ReferenceField, "type">>(o: O) => ReferenceField & O; array: <const I extends FieldDescriptor, const O extends Omit<ArrayField, "type" | "item">>(item: I, o?: O) => ArrayField & { item: I } & O }
- `fieldset`: <const R extends Record<string, FieldDescriptor>>(record: R, options?: FieldsetOptions) => Fieldset<R>
- `Fieldset`: { fields: R; behavior: { [x: string]: FieldBehavior }; validate: (frontmatter: Record<string, unknown>, body: string) => ValidationResult; ~standard: { readonly version: 1; readonly vendor: string; readonly validate: (value: unknown) => StandardResult<Record<string, unknown>>; readonly types?: { readonly input: StandardInput; readonly output: Record<string, unknown> } } }
- `FieldsetOptions`: { refine?: ((data: Record<string, unknown>, body: string) => Record<string, string>); behavior?: BehaviorTable }
- `FileChange`: { path: string; content: string | null }
- `FragmentResolve`: (id: string) => string
- `githubApp`: (config: { owner: string; repo: string; branch: string; appId: string; installationId: string }) => GithubAppProvider
- `GithubAppProvider`: { kind: "github-app"; owner: string; repo: string; appId: string; installationId: string; branch: string; connect: (env: BackendEnv) => Backend }
- `glyph`: (name: string, icons: IconSet) => Element
- `IconSet`: { [x: string]: string }
- `ImageValue`: { src: string; alt: string; caption?: string; decorative?: boolean }
- `InferFieldset`: S extends Fieldset<infer R extends Record<string, FieldDescriptor>> ? { [K in keyof ({ -readonly [K in keyof RemoveIndex<R> as RemoveIndex<R>[K] extends { required: true } ? K : never]: ValueOf<RemoveIndex<R>[K] extends FieldDescriptor ? RemoveIndex<R>[K] : never> } & { -readonly [K in keyof RemoveIndex<R> as RemoveIndex<R>[K] extends { required: true } ? never : K]?: ValueOf<RemoveIndex<R>[K] extends FieldDescriptor ? RemoveIndex<R>[K] : never> })]: ({ -readonly [K in keyof RemoveIndex<R> as RemoveIndex<R>[K] extends { required: true } ? K : never]: ValueOf<RemoveIndex<R>[K] extends FieldDescriptor ? RemoveIndex<R>[K] : never> } & { -readonly [K in keyof RemoveIndex<R> as RemoveIndex<R>[K] extends { required: true } ? never : K]?: ValueOf<RemoveIndex<R>[K] extends FieldDescriptor ? RemoveIndex<R>[K] : never> })[K] } : never
- `LinkResolve`: (ref: CairnRef) => string
- `MagicLinkMessage`: { to: string; from: string; subject: string; html: string; text: string; cc?: EmailRecipient | EmailRecipient[]; bcc?: EmailRecipient | EmailRecipient[]; replyTo?: string; attachments?: EmailAttachment[] }
- `Manifest`: { version: 1; entries: ManifestEntry[] }
- `NamedField`: FieldDescriptor & { name: string }
- `NavMenuConfig`: { configPath: string; menuName: string; label: string; maxDepth?: number }
- `NavNode`: { label: string; url?: string; children?: NavNode[] }
- `ownerLevelRoles`: (roles: RolesDeclaration) => string[]
- `parseMarkdown`: (source: string) => { frontmatter: Record<string, unknown>; body: string }
- `parseSiteConfig`: (raw: string) => SiteConfig
- `PreviewConfig`: { stylesheets: string[]; bodyClass?: string; containerClass?: string; byConcept?: Record<string, { bodyClass?: string; containerClass?: string }> }
- `RendererOptions`: { sanitizeSchema?: ((defaults: Schema) => Schema); unsafeDisableSanitize?: boolean; anchorRel?: string | false; tableScroll?: boolean; remarkPlugins?: PluggableList; rehypePlugins?: PluggableList }
- `RepoFile`: { id: string; name: string; path: string }
- `resolveCapability`: (roles: RolesDeclaration, role: string) => Capability
- `Role`: "owner" | "editor"
- `RoleDeclaration`: Capability | { capability: Capability; home?: string }
- `roleHome`: (roles: RolesDeclaration, role: string) => string
- `RolesDeclaration`: { [x: string]: RoleDeclaration }
- `SenderConfig`: { from: string; replyTo?: string }
- `SendMagicLink`: (env: AuthEnv, message: MagicLinkMessage) => Promise<void>
- `serializeManifest`: (manifest: Manifest) => string
- `SiteConfig`: { siteName: string; description?: string; author?: string; locale?: string; menus?: Record<string, unknown>; spellcheck?: { dialect?: string }; tidy?: TidyConfig; vocabulary?: VocabularyEntry[] }
- `SiteConfigError`: typeof SiteConfigError
- `SiteRender`: (input: { body: string; concept?: string; frontmatter?: Record<string, unknown>; resolve?: LinkResolve; resolveMedia?: MediaResolve; resolveFragment?: FragmentResolve }) => Promise<string>
- `StandardInput`: { frontmatter: { [x: string]: unknown }; body: string }
- `StandardSchemaV1`: { ~standard: { readonly version: 1; readonly vendor: string; readonly validate: (value: unknown) => StandardResult<Output>; readonly types?: { readonly input: Input; readonly output: Output } } }
- `ValidationIssue`: { path: (string | number)[]; message: string }
- `ValidationResult`: { ok: true; data: Record<string, unknown> } | { ok: false; errors: Record<string, string>; issues?: ValidationIssue[] }
- `verifyManifest`: (built: Manifest, committedRaw: string) => void
- `verifyReferences`: (manifest: Manifest) => void
- `VocabularyEntry`: { value: string; label: string }

## `/admin-fields`

- `FieldLabel`: Component<Props, {}, "">
- `SelectField`: Component<Props, {}, "value">
- `SelectFieldOption`: { value: string; label: string }
- `TextField`: Component<Props, {}, "value">

## `/ambient`

- `App.Locals`: { editor?: Editor | null; backend?: Backend; auditSink?: AdminActionAuditSink }

## `/components`

- `CairnAdmin`: Component<Props, {}, "">
- `CairnAdminShell`: Component<Props, {}, "">
- `CairnMediaLibrary`: Component<Props, {}, "">
- `CairnTidySettings`: Component<Props, {}, "">
- `ConceptList`: Component<Props, {}, "">
- `ConfirmPage`: Component<Props, {}, "">
- `CsrfField`: Component<Props, {}, "">
- `DeleteDialog`: Component<Props, { open: () => void }, "">
- `EditPage`: Component<Props, {}, "">
- `HelpHome`: Component<$$ComponentProps, {}, "">
- `LoginPage`: Component<Props, {}, "">
- `ManageEditors`: Component<Props, {}, "">
- `MarkdownEditor`: Component<Props, {}, "value">
- `NavTree`: Component<Props, {}, "">
- `OfficeList`: Component<Props, {}, "">
- `RenameDialog`: Component<Props, { open: () => void }, "">

## `/delivery`

- `buildFragmentResolver`: (site: SiteResolver) => FragmentResolve
- `buildJsonFeed`: (channel: FeedChannel, items: FeedItem[]) => string
- `buildLinkResolver`: (site: SiteResolver) => LinkResolve
- `buildRobots`: (opts: { sitemapUrl: string; disallow?: string[] }) => string
- `buildRssFeed`: (channel: FeedChannel, items: FeedItem[]) => string
- `buildSeoMeta`: (input: SeoInput) => SeoMeta
- `buildSiteManifest`: <A extends CairnAdapter>(adapter: A, config: SiteConfig, globs: SiteGlobs<A>) => Manifest
- `buildSitemap`: (urls: SitemapUrl[]) => string
- `ContentEntry`: { frontmatter: F; body: string; concept: string; id: string; slug: string; permalink: string; title: string; date?: string; updated?: string; tags: string[]; excerpt: string; wordCount: number; draft: boolean; fields: { [x: string]: unknown } }
- `ContentIndex`: { all: (opts?: { includeDrafts?: boolean }) => ContentSummary[]; byId: (id: string) => ContentEntry<F>; byTag: (tag: string, opts?: { includeDrafts?: boolean }) => ContentSummary[]; allTags: () => { tag: string; count: number }[]; adjacent: (id: string) => { newer?: ContentSummary; older?: ContentSummary }; problems: () => ContentProblem[] }
- `ContentProblem`: { id: string; draft: boolean; errors: { [x: string]: string } }
- `ContentSummary`: { concept: string; id: string; slug: string; permalink: string; title: string; date?: string; updated?: string; tags: string[]; excerpt: string; wordCount: number; draft: boolean; fields: { [x: string]: unknown } }
- `createPublicRoutes`: (deps: PublicRoutesDeps) => { entryLoad: (event: { url: URL }) => Promise<EntryData>; entries: () => { path: string }[] }
- `createSiteIndexes`: <const A extends CairnAdapter>(adapter: A, config: SiteConfig, globs: SiteGlobs<A>, opts?: { validate?: boolean }) => SiteIndexes<A>
- `deriveExcerpt`: (body: string, opts?: { description?: string; maxChars?: number }) => string
- `EntryData`: { concept: string; entry: ContentEntry<Record<string, unknown>>; html: string; canonicalUrl: string; seo: SeoMeta; newer?: ContentSummary; older?: ContentSummary; heroImage?: { url: string; absoluteUrl?: string; alt: string; caption?: string } }
- `FeedChannel`: { title: string; description: string; siteUrl: string; feedUrl: string; language?: string; author?: { name: string; email?: string } }
- `FeedItem`: { title: string; url: string; date?: string; updated?: string; summary: string; contentHtml?: string; tags?: string[] }
- `feedView`: (site: SiteResolver, descriptors: ConceptDescriptor[], origin: string) => FeedItem[]
- `jsonFeedResponse`: (channel: FeedChannel, items: FeedItem[]) => Response
- `jsonLdScript`: (data: Record<string, unknown>) => string
- `PublicRoutesDeps`: { site: SiteResolver; render: (input: { body: string; concept?: string; frontmatter?: Record<string, unknown>; resolve?: LinkResolve; resolveMedia?: MediaResolve; resolveFragment?: FragmentResolve }) => Promise<string>; origin: string; siteName: string; description: string; feeds?: { rss?: string; json?: string }; defaultImage?: string; resolveMedia?: MediaResolve; assetsEnabled?: boolean }
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
- `sitemapView`: (site: SiteResolver, descriptors: ConceptDescriptor[], origin: string, extraRoutes?: string[]) => SitemapUrl[]
- `SiteResolver`: { byPermalink: (path: string) => ContentEntry<Record<string, unknown>>; adjacent: (entry: ContentSummary) => { newer?: ContentSummary; older?: ContentSummary }; entries: () => { path: string }[]; concept: (id: string) => ContentIndex<Record<string, unknown>>; all: () => ContentSummary[]; routable: (id: string) => boolean }
- `unlistedRoutes`: (routeIds: string[], listedPaths: string[]) => string[]

## `/delivery/data`

- `buildFragmentResolver`: (site: SiteResolver) => FragmentResolve
- `buildJsonFeed`: (channel: FeedChannel, items: FeedItem[]) => string
- `buildLinkResolver`: (site: SiteResolver) => LinkResolve
- `buildRobots`: (opts: { sitemapUrl: string; disallow?: string[] }) => string
- `buildRssFeed`: (channel: FeedChannel, items: FeedItem[]) => string
- `buildSeoMeta`: (input: SeoInput) => SeoMeta
- `buildSiteManifest`: <A extends CairnAdapter>(adapter: A, config: SiteConfig, globs: SiteGlobs<A>) => Manifest
- `buildSitemap`: (urls: SitemapUrl[]) => string
- `ContentEntry`: { frontmatter: F; body: string; concept: string; id: string; slug: string; permalink: string; title: string; date?: string; updated?: string; tags: string[]; excerpt: string; wordCount: number; draft: boolean; fields: { [x: string]: unknown } }
- `ContentIndex`: { all: (opts?: { includeDrafts?: boolean }) => ContentSummary[]; byId: (id: string) => ContentEntry<F>; byTag: (tag: string, opts?: { includeDrafts?: boolean }) => ContentSummary[]; allTags: () => { tag: string; count: number }[]; adjacent: (id: string) => { newer?: ContentSummary; older?: ContentSummary }; problems: () => ContentProblem[] }
- `ContentProblem`: { id: string; draft: boolean; errors: { [x: string]: string } }
- `ContentSummary`: { concept: string; id: string; slug: string; permalink: string; title: string; date?: string; updated?: string; tags: string[]; excerpt: string; wordCount: number; draft: boolean; fields: { [x: string]: unknown } }
- `createSiteIndexes`: <const A extends CairnAdapter>(adapter: A, config: SiteConfig, globs: SiteGlobs<A>, opts?: { validate?: boolean }) => SiteIndexes<A>
- `deriveExcerpt`: (body: string, opts?: { description?: string; maxChars?: number }) => string
- `FeedChannel`: { title: string; description: string; siteUrl: string; feedUrl: string; language?: string; author?: { name: string; email?: string } }
- `FeedItem`: { title: string; url: string; date?: string; updated?: string; summary: string; contentHtml?: string; tags?: string[] }
- `feedView`: (site: SiteResolver, descriptors: ConceptDescriptor[], origin: string) => FeedItem[]
- `jsonFeedResponse`: (channel: FeedChannel, items: FeedItem[]) => Response
- `jsonLdScript`: (data: Record<string, unknown>) => string
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
- `sitemapView`: (site: SiteResolver, descriptors: ConceptDescriptor[], origin: string, extraRoutes?: string[]) => SitemapUrl[]
- `SiteResolver`: { byPermalink: (path: string) => ContentEntry<Record<string, unknown>>; adjacent: (entry: ContentSummary) => { newer?: ContentSummary; older?: ContentSummary }; entries: () => { path: string }[]; concept: (id: string) => ContentIndex<Record<string, unknown>>; all: () => ContentSummary[]; routable: (id: string) => boolean }
- `unlistedRoutes`: (routeIds: string[], listedPaths: string[]) => string[]

## `/delivery/head`

- `CairnHead`: Component<$$ComponentProps, {}, "">

## `/islands`

- `hydrateIslands`: (islands: IslandRegistry, root?: ParentNode) => void
- `IslandRegistry`: { [x: string]: Component<Record<string, unknown>, {}, string> }

## `/media`

- `makeMediaResolver`: (manifest: MediaManifest, resolved: ResolvedAssetConfig, opts?: { preset?: string }) => MediaResolve
- `MediaEntry`: { hash: string; sha256: string; slug: string; displayName: string; originalFilename: string; alt: string; ext: string; contentType: string; bytes: number; width: number | null; height: number | null; createdAt: string }
- `MediaManifest`: { [x: string]: MediaEntry }
- `MediaRef`: { slug: string | null; hash: string }
- `MediaResolve`: (ref: MediaRef) => string
- `mediaToken`: (ref: MediaRef) => string
- `normalizeAssets`: (assets: AssetConfig) => ResolvedAssetConfig
- `parseMediaToken`: (href: string) => MediaRef | null
- `readCommittedManifest`: (globResult: Record<string, unknown>) => MediaManifest
- `ResolvedAssetConfig`: { enabled: false } | { enabled: true; bucketBinding: string; publicBase: string; urlForm: "slug" | "opaque"; maxUploadBytes: number; allowedTypes: string[]; variants: Record<string, VariantSpec>; transformations: boolean }
- `VariantSpec`: { width?: number; height?: number; quality?: number; fit?: "scale-down" | "contain" | "cover" | "crop" | "pad"; gravity?: string; format?: string }

## `/render`

- `cardShell`: (classes: string[], body: ElementContent[]) => Element
- `ComponentContext`: { attributes: { [x: string]: string | boolean }; slot: (name: string) => ElementContent[]; items: (name: string) => ElementContent[][]; node: Element }
- `headRow`: (title: ElementContent[], icon?: Element, level?: number) => Element
- `iconSpan`: (glyphEl: Element, role?: string) => Element
- `isElement`: (node: ElementContent) => node is Element
- `MakeIcon`: (name: string, role?: string) => Element
- `strAttr`: (ctx: ComponentContext, key: string) => string

## `/sveltekit`

- `adminAction`: <T>(handler: (args: { event: AdminActionEvent; form: FormData; ctx: AdminActionContext }) => Promise<T>, deps?: AdminActionDeps) => (event: AdminActionEvent) => Promise<T>
- `AdminActionAudit`: { action: string; entity: string; entityId?: string | number; detail?: string }
- `AdminActionAuditRecord`: AdminActionAudit & { editor: string }
- `AdminActionAuditSink`: (record: AdminActionAuditRecord) => void
- `AdminActionContext`: { editor: Editor; audit: (record: AdminActionAudit) => void }
- `AdminActionDeps`: { isDev?: boolean }
- `AdminActionError`: typeof AdminActionError
- `AdminActionEvent`: { cookies: CookieJar; locals: { editor?: Editor | null; auditSink?: AdminActionAuditSink }; url: URL; request: Request; platform?: PlatformContext<AuthEnv> }
- `AdminData`: { view: "login"; page: { siteName: string; error: string | null; csrf: string } } | { view: "confirm"; page: { token: string; siteName: string; error: string | null; csrf: string } } | { view: "list"; page: ListData } | { view: "edit"; page: EditData } | { view: "editors"; page: { editors: Editor[]; self: string; error: string | null; vocabulary: { role: string; capability: Capability }[] } } | { view: "nav"; page: NavLoadData } | { view: "media"; page: MediaLibraryData } | { view: "settings"; page: SettingsData } | { view: "vocabulary"; page: VocabularyLoadData } | { view: "help"; page: HelpData } | { view: "welcome"; page: WelcomeData }
- `AdminNavConfig`: (AdminNavEntry | AdminNavSection)[]
- `AdminNavEntry`: { label: string; icon: "anchor" | "calendar" | "clipboard-list" | "list" | "users" | "package" | "inbox" | "table" | "wrench"; href: string; ownerOnly?: boolean }
- `AdminNavIcon`: "anchor" | "calendar" | "clipboard-list" | "list" | "users" | "package" | "inbox" | "table" | "wrench"
- `AdminNavSection`: { label: string; children: AdminNavEntry[] }
- `AdminShellData`: { public: true; siteName: string } | { public: false; siteName: string; user: { displayName: string; email: string; role: "owner" | "editor"; capability: Capability }; concepts: NavConcept[]; nav: ResolvedNavLayout; pathname: string; theme: "cairn-admin" | "cairn-admin-dark"; collapsedNav: string[]; csrf: string; pendingEntries: Promise<{ concept: string; id: string }[] | null> }
- `AdvisoryAction`: { label: string; href?: string }
- `AdvisoryNotice`: { kind: string; severity: "warn"; message: string; actions?: AdvisoryAction[] }
- `AuthEnv`: { AUTH_DB?: D1Database; PUBLIC_ORIGIN?: string; CAIRN_DEV_BACKEND?: string | boolean; EMAIL?: { send(message: { to: string; from: string; subject: string; html: string; text: string; cc?: EmailRecipient | EmailRecipient[]; bcc?: EmailRecipient | EmailRecipient[]; replyTo?: string; attachments?: EmailAttachment[] }): Promise<void> } }
- `AuthRoutesConfig`: { branding: AuthBranding; send?: SendMagicLink; bootstrapOwner?: { email: string; displayName: string } }
- `BackendEnv`: { GITHUB_APP_PRIVATE_KEY_B64?: string }
- `CairnAdminDeps`: { auth?: { branding?: AuthBranding; send?: SendMagicLink; bootstrapOwner?: { email: string; displayName: string } }; tidy?: { client?: ((opts: { apiKey: string }) => TidyClient); timeoutMs?: number }; navFilter?: ((items: ResolvedLayoutNode[], ctx: { editor: Editor; event: ContentEvent }) => ResolvedLayoutNode[] | Promise<ResolvedLayoutNode[]>) }
- `CairnMediaBindings`: { MEDIA_BUCKET: R2Bucket }
- `CairnPlatformBindings`: { AUTH_DB: D1Database; EMAIL: { send(message: { to: string; from: string; subject: string; html: string; text: string; cc?: EmailRecipient | EmailRecipient[]; bcc?: EmailRecipient | EmailRecipient[]; replyTo?: string; attachments?: EmailAttachment[] }): Promise<void> }; PUBLIC_ORIGIN: string; GITHUB_APP_PRIVATE_KEY_B64: string; ANTHROPIC_API_KEY?: string }
- `ContentEvent`: { params: { [x: string]: string }; cookies?: CookieJar; url: URL; request: Request; locals: { editor?: Editor | null; backend?: Backend }; platform?: PlatformContext<BackendEnv> }
- `ContentFormFailure`: { error?: string; brokenLinks?: string[]; body?: string; inboundLinks?: InboundLink[]; id?: string; hash?: string; usage?: UsageEntry[]; foundIn?: number }
- `ContentRoutesDeps`: { tidy?: { client?: ((opts: { apiKey: string }) => TidyClient); timeoutMs?: number }; navFilter?: ((items: ResolvedLayoutNode[], ctx: { editor: Editor; event: ContentEvent }) => ResolvedLayoutNode[] | Promise<ResolvedLayoutNode[]>) }
- `CookieJar`: { get: (name: string) => string; set: (name: string, value: string, opts: CookieSetOptions) => void; delete: (name: string, opts: { path: string }) => void }
- `createAuthGuard`: (opts?: { roles?: RolesDeclaration }) => ({ event, resolve }: HandleInput) => Promise<Response>
- `createAuthRoutes`: (config: AuthRoutesConfig) => { loginLoad: (event: RequestContext) => { siteName: string; error: string | null; csrf: string }; requestAction: (event: RequestContext) => Promise<RequestResult>; confirmLoad: (event: RequestContext) => { token: string; siteName: string; error: string | null; csrf: string }; confirmAction: (event: RequestContext) => Promise<never>; logoutAction: (event: RequestContext) => Promise<never> }
- `createCairnAdmin`: (runtime: CairnRuntime, deps?: CairnAdminDeps) => { load: (event: AdminEvent) => Promise<AdminData>; actions: { request: (event: AdminEvent) => Promise<RequestResult>; confirm: (event: AdminEvent) => Promise<never>; logout: (event: AdminEvent) => Promise<never>; create: (event: AdminEvent) => Promise<never>; save: (event: AdminEvent) => Promise<ActionFailure<unknown>>; saveSettings: (event: AdminEvent) => Promise<never>; saveVocabulary: (event: AdminEvent) => Promise<never>; upload: (event: AdminEvent) => Promise<ActionFailure<unknown> | UploadResult>; publish: (event: AdminEvent) => Promise<ActionFailure<unknown>>; discard: (event: AdminEvent) => Promise<never>; rename: (event: AdminEvent) => Promise<ActionFailure<unknown>>; addDictionaryWord: (event: AdminEvent) => Promise<ActionFailure<unknown> | DictionaryAddResult>; tidy: (event: AdminEvent) => Promise<ActionFailure<unknown> | TidyResult>; delete: (event: AdminEvent) => Promise<ActionFailure<unknown>>; mediaDelete: (event: AdminEvent) => Promise<ActionFailure<unknown>>; mediaUpdate: (event: AdminEvent) => Promise<ActionFailure<unknown>>; mediaUpload: (event: AdminEvent) => Promise<ActionFailure<unknown> | UploadResult>; mediaLibraryUpload: (event: AdminEvent) => Promise<ActionFailure<unknown> | UploadResult>; mediaReplacePreview: (event: AdminEvent) => Promise<ActionFailure<unknown> | MediaReplacePreviewPlan>; mediaReplace: (event: AdminEvent) => Promise<ActionFailure<unknown>>; mediaAltPreview: (event: AdminEvent) => Promise<ActionFailure<unknown> | MediaAltPreviewPlan>; mediaAltPropagate: (event: AdminEvent) => Promise<ActionFailure<unknown>>; mediaBulkDelete: (event: AdminEvent) => Promise<ActionFailure<unknown> | MediaBulkDeleteResult>; mediaOrphanScan: (event: AdminEvent) => Promise<ActionFailure<unknown> | OrphanScan>; mediaPurge: (event: AdminEvent) => Promise<ActionFailure<unknown> | MediaOrphanPurgeResult>; publishAll: (event: AdminEvent) => Promise<never>; addEditor: (event: AdminEvent) => Promise<ActionFailure<{ error: string }> | { ok: true }>; removeEditor: (event: AdminEvent) => Promise<ActionFailure<{ error: string }> | { ok: true }>; setRole: (event: AdminEvent) => Promise<ActionFailure<{ error: string }> | { ok: true }> }; shellLoad: (event: AdminEvent) => Promise<{ shell: AdminShellData }> }
- `createContentRoutes`: (runtime: CairnRuntime, deps?: ContentRoutesDeps) => { shellPayload: (event: ContentEvent) => Promise<{ shell: AdminShellData }>; helpLoad: (event: ContentEvent) => Promise<HelpData>; indexRedirect: (event: ContentEvent) => { view: "welcome"; page: WelcomeData }; listLoad: (event: ContentEvent) => Promise<ListData>; mediaLibraryLoad: (event: ContentEvent) => Promise<MediaLibraryData>; settingsLoad: (event: ContentEvent) => Promise<SettingsData>; settingsSave: (event: ContentEvent) => Promise<never>; vocabularyLoad: (event: ContentEvent) => Promise<VocabularyLoadData>; vocabularySave: (event: ContentEvent) => Promise<never>; createAction: (event: ContentEvent) => Promise<never>; editLoad: (event: ContentEvent) => Promise<EditData>; saveAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>; publishAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>; publishAllAction: (event: ContentEvent) => Promise<never>; discardAction: (event: ContentEvent) => Promise<never>; deleteAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>; listDeleteAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>; renameAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>; uploadAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | UploadResult>; mediaLibraryUploadAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | UploadResult>; mediaDeleteAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>; mediaBulkDeleteAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | MediaBulkDeleteResult>; mediaOrphanScanAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | OrphanScan>; mediaPurgeOrphansAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | MediaOrphanPurgeResult>; mediaUpdateAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>; mediaReplacePreviewAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | MediaReplacePreviewPlan>; mediaReplaceApplyAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>; mediaAltPreviewAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | MediaAltPreviewPlan>; mediaAltApplyAction: (event: ContentEvent) => Promise<ActionFailure<unknown>>; addDictionaryWordAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | DictionaryAddResult>; tidyAction: (event: ContentEvent) => Promise<ActionFailure<unknown> | TidyResult> }
- `createEditorRoutes`: (opts?: { roles?: RolesDeclaration }) => { editorsLoad: (event: RequestContext) => Promise<{ editors: Editor[]; self: string; error: string | null; vocabulary: { role: string; capability: Capability }[] }>; addEditorAction: (event: RequestContext) => Promise<ActionFailure<{ error: string }> | { ok: true }>; removeEditorAction: (event: RequestContext) => Promise<ActionFailure<{ error: string }> | { ok: true }>; setRoleAction: (event: RequestContext) => Promise<ActionFailure<{ error: string }> | { ok: true }> }
- `createMediaRoute`: (runtime: CairnRuntime) => RequestHandler
- `createNavRoutes`: (runtime: CairnRuntime) => { navLoad: (event: ContentEvent) => Promise<NavLoadData>; navSave: (event: ContentEvent) => Promise<never> }
- `DeleteRefusal`: { error: string; inboundLinks: InboundLink[]; id: string }
- `EditData`: { conceptId: string; id: string; label: string; fields: NamedField[]; frontmatter: { [x: string]: unknown }; body: string; title: string; isNew: boolean; saved: boolean; renamed: boolean; error: string | null; slug: string; linkTargets: LinkTarget[]; mediaTargets: { [x: string]: { slug: string; ext: string; contentType: string } }; mediaLibrary: { [x: string]: MediaLibraryEntry }; inboundLinks: InboundLink[]; pending: boolean; published: boolean; publishedFlash: boolean; publishActions: PublishActionLink[]; discardedFlash: boolean; preview: ResolvedPreview | null; spellcheckDictionary: string; siteDictionary: string[]; tidy: { enabled: boolean; model: string; conventions: TidyConventions }; advisories: AdvisoryNotice[]; orphanTags: string[] }
- `EngineScreenId`: "help" | "media" | "vocabulary" | "nav" | "settings" | "editors" | (string & {})
- `EntrySummary`: { id: string; title: string; date: string | null; draft: boolean; status: "published" | "edited" | "new"; summary: string | null }
- `HandleInput`: { event: RequestContext; resolve: (event: RequestContext) => Response | Promise<Response> }
- `HealthData`: { ok: boolean; checks: { githubAppSigning: { ok: boolean; detail?: string } } }
- `healthLoad`: (event: { platform?: { env?: BackendEnv } }, runtime: CairnRuntime) => Promise<HealthData>
- `HelpData`: { gettingStarted: GettingStarted; reference: MarkdownReferenceRow[]; supportContact?: string }
- `ListData`: { conceptId: string; label: string; singular: string; dated: boolean; entries: EntrySummary[]; error: string | null; formError: string | null; publishedAll: number | null }
- `MediaAltPropagateFailure`: { error: string }
- `MediaBulkFailure`: { error: string }
- `MediaDeleteRefusal`: { error: string; hash: string; usage: UsageEntry[]; foundIn: number }
- `MediaLibraryData`: { assets: MediaLibraryEntry[]; usage: { [x: string]: MediaUsageInfo }; error: string | null; flash: "deleted" | "updated" | "replaced" | "altPropagated" | "bulkDeleted" | "orphansPurged" | "uploaded" | null; flashError: string | null }
- `MediaReplaceFailure`: { error: string; hash: string; usage: UsageEntry[]; foundIn: number }
- `MediaUpdateFailure`: { error: string }
- `MediaUsageInfo`: { count: number; entries: UsageEntry[] }
- `NavConcept`: { id: string; label: string }
- `NavLayout`: (NavLayoutEntry | NavLayoutEngineRef | NavLayoutSection)[]
- `NavLayoutEngineRef`: { screen: "help" | "media" | "vocabulary" | "nav" | "settings" | "editors" | (string & {}); label?: string; hidden?: true }
- `NavLayoutEntry`: { roles?: ("owner" | "editor")[]; label: string; icon: "anchor" | "calendar" | "clipboard-list" | "list" | "users" | "package" | "inbox" | "table" | "wrench"; href: string; ownerOnly?: boolean }
- `NavLayoutSection`: { label: string; children: (NavLayoutEntry | NavLayoutEngineRef)[]; roles?: ("owner" | "editor")[] }
- `NavLoadData`: { menu: { name: string; label: string; maxDepth: number }; tree: NavNode[]; pages: NavPageOption[]; saved: boolean; error: string | null }
- `NavPageOption`: { label: string; url: string }
- `PublishActionEntry`: { label: string; href: string; concepts?: string[] }
- `PublishActionLink`: { label: string; href: string }
- `PublishActionsConfig`: PublishActionEntry[]
- `RenameFailure`: { error: string }
- `RequestContext`: { cookies: CookieJar; setHeaders: (headers: Record<string, string>) => void; url: URL; request: Request; locals: { editor?: Editor | null; backend?: Backend }; platform?: PlatformContext<AuthEnv> }
- `RequestResult`: { status: "sent"; sent: true } | { status: "send_error"; sent: false } | { status: "throttled"; sent: false }
- `requireEditor`: (event: { locals: { editor?: Editor | null } }) => Editor
- `requireOwner`: (event: { locals: { editor?: Editor | null } }) => Editor
- `requireSession`: (event: { locals: { editor?: Editor | null } }) => Editor
- `ResolvedEngineNavEntry`: { screen: "help" | "media" | "vocabulary" | "nav" | "settings" | "editors" | (string & {}); label: string; href: string; dated?: boolean }
- `ResolvedLayoutChild`: ResolvedNavEntry | ResolvedEngineNavEntry
- `ResolvedLayoutNode`: ResolvedLayoutChild | ResolvedLayoutSection
- `ResolvedLayoutSection`: { label: string; children: ResolvedLayoutChild[] }
- `ResolvedNavEntry`: { label: string; iconName: "anchor" | "calendar" | "clipboard-list" | "list" | "users" | "package" | "inbox" | "table" | "wrench"; href: string; ownerOnly: boolean }
- `ResolvedNavItem`: ResolvedNavEntry | ResolvedNavSection
- `ResolvedNavLayout`: { items: ResolvedLayoutNode[]; fallback: ResolvedLayoutChild[] }
- `ResolvedNavSection`: { label: string; children: ResolvedNavEntry[] }
- `resolveNavLayout`: (opts: ResolveNavLayoutOptions) => ResolvedNavLayout
- `ResolveNavLayoutOptions`: { layout: NavLayout; adminNav: ResolvedNavItem[]; concepts: { id: string; label: string; routing?: { dated: boolean } }[]; navMenuLabel: string | null; capability: "owner" | "editor" | "none"; role: string }
- `SaveFailure`: { error: string; brokenLinks: string[]; body: string }
- `UploadResult`: { reference: string; record: MediaEntry; reused: boolean; mismatch: boolean }
- `validateNavLayout`: (layout: NavLayout, ctx: { conceptIds: string[]; navMenuConfigured: boolean; roleNames: string[]; hasAdminNav: boolean }) => void
- `WelcomeData`: { displayName: string; siteName: string }

## `/vite`

- `cairnManifest`: (opts: CairnManifestOptions) => Plugin<any>
- `CairnManifestOptions`: { configModule: string; content: { [x: string]: string }; manifestPath?: string }

