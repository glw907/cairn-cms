GENERATED — run `npm run check:surface -- --update` to regenerate

## `.`

- `AccessMap`: { [x: string]: string[] }
- `AiPosture`: "invite" | "decline"
- `ArrayField`: { type: "array"; default?: undefined; item: TextField | TextareaField | NumberField | SelectField | MultiselectField | UrlField | DateField | BooleanField | IconField | ImageField | ObjectField | ReferenceField | ArrayField; itemLabel?: string; label: string; help?: string; required?: boolean }
- `Backend`: { defaultBranch: string; ephemeral?: true; readFile: (path: string, ref: string) => Promise<string | null>; readEntries: (dir: string, ref: string) => Promise<RepoFile[]>; branchHead: (branch: string) => Promise<string | null>; listBranches: (prefix: string) => Promise<string[]>; commit: (branch: string, changes: FileChange[], author: CommitAuthor, message: string, expectedHead?: string) => Promise<string>; listCommits: (path: string, ref: string, limit: number) => Promise<BackendCommit[]>; createBranch: (name: string, fromBranch: string) => Promise<string>; deleteBranch: (name: string) => Promise<void> }
- `BackendCommit`: { ref: string; author: { name: string; email: string }; date: string }
- `BackendProvider`: { kind: string; branch: string; connect: (env: CairnEnv) => Backend }
- `BehaviorTable`: { [x: string]: FieldBehavior }
- `BlockContext`: { attributes: { [x: string]: string | boolean }; slot: (name: string) => ElementContent[]; items: (name: string) => ElementContent[][]; attr: (key: string) => string | undefined; node: Element }
- `BlockDef`: { name: string; label: string; description: string; insertTemplate?: string; build: (ctx: BlockContext) => Element; hydrate?: boolean | "visible"; defaultIconByRole?: Record<string, string>; use?: string; attributes?: Record<string, FieldDescriptor>; behavior?: BehaviorTable; slots?: SlotDef[]; icon?: string; group?: string; hidden?: boolean; preview?: { attributes?: Record<string, string | boolean>; slots?: Record<string, string | string[]> } }
- `BlockRegistry`: { defs: BlockDef[]; names: string[]; get: (name: string) => BlockDef | undefined; defaultIcon: (name: string, role?: string) => string | undefined; iconField: (name: string) => string | undefined }
- `BooleanField`: { type: "boolean"; label: string; help?: string; required?: boolean; default?: boolean }
- `BranchExistsError`: typeof BranchExistsError
- `CairnAdapter`: { content: { [x: string]: ConceptConfig<Record<string, FieldDescriptor>> }; roles?: RolesDeclaration; access?: AccessMap; backend: BackendProvider; email: SenderConfig; rendering: { render: SiteRender; blocks?: readonly BlockDef[]; icons?: IconSet; islands?: IslandRegistry }; media?: MediaConfig; aiPosture?: AiPosture; editor?: { preview?: PreviewConfig; nav?: NavMenuConfig; supportContact?: string; navLayout?: NavLayout; publishActions?: PublishActionEntry[] } }
- `CairnEnv`: { AUTH_DB?: D1Database; PUBLIC_ORIGIN?: string; CAIRN_DEV_BACKEND?: string | boolean; EMAIL?: EmailSender; GITHUB_APP_PRIVATE_KEY_B64?: string }
- `CairnRef`: { concept: string; id: string }
- `CairnRuntime`: { siteName: string; concepts: ConceptDescriptor[]; roles?: RolesDeclaration; access?: AccessMap; backend: BackendProvider; email: SenderConfig; supportContact?: string; manifestPath: string; mediaManifestPath: string; dictionaryPath?: string; media: { enabled: false } | { enabled: true; bucketBinding: string }; navMenu?: NavMenuConfig; siteConfigPath: string; navLayout?: NavLayout; publishActions?: PublishActionEntry[]; preview?: PreviewConfig; spellcheckDictionary?: string; tidy?: TidyConfig; vocabulary: VocabularyEntry[] }
- `canReach`: (access: AccessMap | undefined, editor: Editor, target: string) => boolean
- `Capability`: "owner" | "editor" | "none"
- `CommitAuthor`: { name: string; email: string }
- `CommitConflictError`: typeof CommitConflictError
- `ComposeInput`: { adapter: CairnAdapter; siteConfig: SiteConfig }
- `composeRuntime`: ({ adapter, siteConfig }: ComposeInput) => CairnRuntime
- `ConceptConfig`: { dir: string; label?: string; singular?: string; fields: R; refine?: ((data: Record<string, unknown>, body: string) => Record<string, string> | undefined); behavior?: BehaviorTable; routing?: "dated" | "page" | "embedded"; permalink?: string; datePrefix?: DatePrefix; summaryFields?: string[] }
- `ConceptDescriptor`: { id: string; label: string; singular: string; dir: string; routing: RoutingRule; permalink: string; datePrefix: "year" | "month" | "day"; fields: NamedField[]; schema: Fieldset<Record<string, FieldDescriptor>>; summaryFields: string[]; validate: (frontmatter: Record<string, unknown>, body: string) => ValidationResult }
- `createGithubApp`: (config: { owner: string; repo: string; branch: string; appId: string; installationId: string }) => GithubAppProvider
- `createRenderer`: (config?: RendererConfig) => Renderer
- `DateField`: { type: "date"; min?: string; max?: string; label: string; help?: string; required?: boolean; default?: string }
- `DatePrefix`: "year" | "month" | "day"
- `defineAccess`: <const A extends AccessMap>(roles: RolesDeclaration | undefined, map: A) => A
- `defineAdapter`: <const A extends CairnAdapter>(adapter: A & { editor?: { navLayout?: KeyedNavLayout<keyof A["content"] & string> } }) => A & Omit<CairnAdapter, keyof A>
- `defineBlock`: <const D extends BlockDef>(def: D) => RegisteredBlock<D>
- `defineConcept`: <const C extends ConceptConfig>(concept: C & { summaryFields?: readonly (keyof C["fields"] & string)[] }) => C
- `defineRegistry`: ({ blocks }: { blocks: readonly BlockDef[] }) => BlockRegistry
- `defineRoles`: <const R extends RolesDeclaration>(roles: R) => R
- `DocHeading`: { id: string; text: string; depth: number }
- `Editor`: { email: string; displayName: string; role: string; capability: "owner" | "editor" | "none" }
- `EmailAttachment`: { content: string | ArrayBuffer | ArrayBufferView<ArrayBufferLike>; filename: string; type: string; disposition: "attachment" | "inline" }
- `EmailRecipient`: string | { email: string; name?: string }
- `EmailSender`: { send: (message: MagicLinkMessage) => Promise<unknown> }
- `FieldBehavior`: { validate?: ((value: unknown, siblings: Record<string, unknown>) => string | null) }
- `FieldDescriptor`: TextField | TextareaField | NumberField | SelectField | MultiselectField | UrlField | DateField | BooleanField | IconField | ImageField | ObjectField | ReferenceField | ArrayField
- `fields`: { text: <const O extends Omit<TextField, "type">>(o: O) => TextField & O; textarea: <const O extends Omit<TextareaField, "type">>(o: O) => TextareaField & O; number: <const O extends Omit<NumberField, "type">>(o: O) => NumberField & O; select: <const O extends Omit<SelectField, "type">>(o: O) => SelectField & O; multiselect: <const O extends Omit<MultiselectField, "type">>(o: O) => MultiselectField & O; url: <const O extends Omit<UrlField, "type">>(o: O) => UrlField & O; date: <const O extends Omit<DateField, "type">>(o: O) => DateField & O; boolean: <const O extends Omit<BooleanField, "type">>(o: O) => BooleanField & O; icon: <const O extends Omit<IconField, "type">>(o: O) => IconField & O; image: <const O extends Omit<ImageField, "type">>(o: O) => ImageField & O; object: <const F extends Record<string, FieldDescriptor>, const O extends Omit<ObjectField, "type" | "fields">>(o: { fields: F } & O) => ObjectField & { fields: F } & O; reference: <const O extends Omit<ReferenceField, "type">>(o: O) => ReferenceField & O; array: <const O extends Omit<ArrayField, "type">>(o: O) => ArrayField & O }
- `Fieldset`: { fields: R; behavior: { [x: string]: FieldBehavior }; validate: (frontmatter: Record<string, unknown>, body: string, owner?: string) => ValidationResult }
- `FileChange`: { path: string; content: string | null }
- `FragmentResolve`: (id: string) => string | undefined
- `GithubAppProvider`: { kind: "github-app"; owner: string; repo: string; appId: string; installationId: string; branch: string; connect: (env: CairnEnv) => Backend }
- `hasAccessRule`: (access: AccessMap | undefined, target: string) => boolean
- `IconField`: { type: "icon"; label: string; help?: string; required?: boolean; default?: string }
- `IconSet`: { [x: string]: string }
- `ImageField`: { type: "image"; default?: undefined; seo?: boolean; label: string; help?: string; required?: boolean }
- `ImageValue`: { src: string; alt: string; caption?: string; decorative?: boolean }
- `InferFieldset`: S extends Fieldset<infer R extends Record<string, FieldDescriptor>> ? { [K in keyof ({ -readonly [K in keyof RemoveIndex<R> as RemoveIndex<R>[K] extends { required: true } ? K : never]: ValueOf<RemoveIndex<R>[K] extends FieldDescriptor ? RemoveIndex<R>[K] : never> } & { -readonly [K in keyof RemoveIndex<R> as RemoveIndex<R>[K] extends { required: true } ? never : K]?: ValueOf<RemoveIndex<R>[K] extends FieldDescriptor ? RemoveIndex<R>[K] : never> })]: ({ -readonly [K in keyof RemoveIndex<R> as RemoveIndex<R>[K] extends { required: true } ? K : never]: ValueOf<RemoveIndex<R>[K] extends FieldDescriptor ? RemoveIndex<R>[K] : never> } & { -readonly [K in keyof RemoveIndex<R> as RemoveIndex<R>[K] extends { required: true } ? never : K]?: ValueOf<RemoveIndex<R>[K] extends FieldDescriptor ? RemoveIndex<R>[K] : never> })[K] } : S extends Record<string, FieldDescriptor> ? { [K in keyof ({ -readonly [K in keyof RemoveIndex<S> as RemoveIndex<S>[K] extends { required: true } ? K : never]: ValueOf<RemoveIndex<S>[K] extends FieldDescriptor ? RemoveIndex<S>[K] : never> } & { -readonly [K in keyof RemoveIndex<S> as RemoveIndex<S>[K] extends { required: true } ? never : K]?: ValueOf<RemoveIndex<S>[K] extends FieldDescriptor ? RemoveIndex<S>[K] : never> })]: ({ -readonly [K in keyof RemoveIndex<S> as RemoveIndex<S>[K] extends { required: true } ? K : never]: ValueOf<RemoveIndex<S>[K] extends FieldDescriptor ? RemoveIndex<S>[K] : never> } & { -readonly [K in keyof RemoveIndex<S> as RemoveIndex<S>[K] extends { required: true } ? never : K]?: ValueOf<RemoveIndex<S>[K] extends FieldDescriptor ? RemoveIndex<S>[K] : never> })[K] } : never
- `LinkResolve`: (ref: CairnRef) => string | undefined
- `MagicLinkMessage`: { to: string; from: string; subject: string; html: string; text: string; cc?: EmailRecipient | EmailRecipient[]; bcc?: EmailRecipient | EmailRecipient[]; replyTo?: string; attachments?: EmailAttachment[] }
- `Manifest`: { version: 1; entries: ManifestEntry[] }
- `ManifestEntry`: { id: string; concept: string; title: string; date?: string; permalink: string; excerpt?: string; draft: boolean; links: CairnRef[]; mediaRefs?: string[]; references?: ReferenceEdge[]; tags?: string[]; includes?: string[]; publishedAt?: string }
- `MediaConfig`: { bucketBinding: string }
- `MediaResolve`: (ref: MediaRef) => string | undefined
- `MultiselectField`: { type: "multiselect"; options?: readonly string[]; creatable?: boolean; placeholder?: string; taxonomy?: boolean; label: string; help?: string; required?: boolean; default?: readonly string[] }
- `NamedField`: FieldDescriptor & { name: string }
- `NavMenuConfig`: { menuName: string; label: string; maxDepth?: number }
- `NavNode`: { label: string; url?: string; children?: NavNode[] }
- `NumberField`: { type: "number"; min?: number; max?: number; integer?: boolean; label: string; help?: string; required?: boolean; default?: number }
- `ObjectField`: { type: "object"; label?: string; default?: undefined; fields: { [x: string]: FieldDescriptor }; help?: string; required?: boolean }
- `parseMarkdown`: (source: string) => { frontmatter: Record<string, unknown>; body: string }
- `parseSiteConfig`: (raw: string) => SiteConfig
- `PreviewConfig`: { stylesheets: string[]; containerClass?: string; byConcept?: Record<string, { containerClass?: string }> }
- `previewMarkdown`: (def: BlockDef) => string | undefined
- `readMenu`: (config: SiteConfig, name: string, maxDepth: number) => NavNode[]
- `readVocabulary`: (config: SiteConfig) => VocabularyEntry[]
- `ReferenceEdge`: { field: string; concept: string; id: string }
- `ReferenceField`: { type: "reference"; concept: string; label: string; help?: string; required?: boolean; default?: string }
- `RegisteredBlock`: D & { attributeSchema: Fieldset<Record<string, FieldDescriptor>> }
- `Renderer`: { render: (input: RenderInput) => Promise<string>; renderDocument: (input: RenderInput) => Promise<{ html: string; headings: DocHeading[] }> }
- `RendererConfig`: { blocks?: readonly BlockDef[]; resolveMedia?: MediaResolve; tableScroll?: boolean; remarkPlugins?: PluggableList; rehypePlugins?: PluggableList }
- `renderGlyph`: (name: string, icons: IconSet) => Element
- `RenderInput`: ResolveOptions & { body: string; concept?: string; frontmatter?: Record<string, unknown> }
- `RepoFile`: { id: string; name: string; path: string }
- `ResolveOptions`: { resolveLink?: LinkResolve; resolveMedia?: MediaResolve; resolveFragment?: FragmentResolve }
- `RoleDeclaration`: Capability | { capability: Capability; home?: string }
- `RolesDeclaration`: { [x: string]: RoleDeclaration }
- `RoutingRule`: { routable: boolean; dated: boolean }
- `SelectField`: { type: "select"; options: readonly string[]; label: string; help?: string; required?: boolean; default?: string }
- `SenderConfig`: { from: string; replyTo?: string }
- `SendMagicLink`: (env: CairnEnv, message: MagicLinkMessage) => Promise<void>
- `serializeMarkdown`: (frontmatter: object, body: string) => string
- `SiteConfig`: { siteName: string; description?: string; author?: string; locale?: string; menus?: Record<string, unknown>; tidy?: TidyConfig; vocabulary?: VocabularyEntry[] }
- `SiteConfigError`: typeof SiteConfigError
- `SiteRender`: (input: RenderInput) => Promise<string>
- `SlotDef`: { name: string; label: string; kind: "inline" | "markdown" | "repeatable"; required?: boolean; help?: string; itemFields?: Record<string, FieldDescriptor>; itemLabel?: ((item: Record<string, string | boolean>, index: number) => string) }
- `TextareaField`: { type: "textarea"; rows?: number; min?: number; max?: number; length?: number; pattern?: string; label: string; help?: string; required?: boolean; default?: string }
- `TextField`: { type: "text"; min?: number; max?: number; length?: number; pattern?: string; label: string; help?: string; required?: boolean; default?: string }
- `TidyConfig`: { enabled?: boolean; model?: string; conventions?: Partial<TidyConventions> }
- `TidyConventions`: { oxfordComma?: "always" | "complex-only" | "never"; numberStyle?: "under-ten" | "under-hundred" | "always-numerals"; measurements?: "abbreviate" | "spell-out"; percent?: "sign" | "word"; emDash?: "spaced" | "closed"; enDashRanges: boolean; ellipsis?: "single-char" | "three-dots"; timeFormat?: "5 PM" | "5pm" | "5 p.m."; smartQuotes: boolean; brandCaps: boolean }
- `UrlField`: { type: "url"; label: string; help?: string; required?: boolean; default?: string }
- `ValidationIssue`: { path: (string | number)[]; message: string }
- `ValidationResult`: { ok: true; data: Record<string, unknown> } | { ok: false; errors: Record<string, string>; issues?: ValidationIssue[] }
- `VocabularyEntry`: { value: string; label: string }

## `/admin`

- `CairnAdmin`: Component<Props, {}, "">
- `CairnAdminShell`: Component<Props, {}, "">
- `CsrfField`: Component<Props, {}, "">

## `/admin-toolkit`

- `AdminTable`: Component<Props, {}, "">
- `AdminTableDensity`: "xs" | "sm"
- `EmptyState`: Component<Props, {}, "">
- `EmptyStateHeadingLevel`: "p" | "h1" | "h2" | "h3"
- `ExpandableRow`: $$IsomorphicComponent
- `FieldLabel`: Component<Props, {}, "">
- `formatCivilDate`: (iso: string | null | undefined, options?: FormatCivilDateOptions) => string
- `FormatCivilDateOptions`: { fallback?: string; locale?: string }
- `ItemLabel`: { one: string; many: string }
- `ListToolbar`: Component<Props, {}, "">
- `ListToolbarAction`: { label: string; onClick: () => void }
- `ListToolbarFilter`: { id: string; label: string; options: ListToolbarFilterOption[]; value: string; onChange: (value: string) => void; defaultValue?: string; promoted?: boolean; display?: "select" | "segmented" | "menu" }
- `ListToolbarFilterOption`: { value: string; label: string; count?: number }
- `MediaLibraryEntry`: { hash: string; slug: string; ext: string; contentType: string; displayName: string; alt: string; width: number | null; height: number | null; bytes: number; createdAt: string }
- `MediaPicker`: Component<Props, {}, "">
- `MediaSelection`: { entry: MediaLibraryEntry; ref: string; alt: string }
- `PageHeader`: Component<Props, {}, "">
- `Pagination`: Component<Props, {}, "">
- `StatusChip`: Component<Props, {}, "">
- `StatusChipRegister`: "quiet" | "warning" | "outline"
- `StatusChipSize`: "xs" | "sm"
- `ToolbarDisclosure`: Component<Props, {}, "">
- `ToolbarDisclosureAriaHaspopup`: "menu" | "listbox" | "dialog" | "grid" | "tree" | "true"
- `ToolbarDisclosurePanelAttrs`: { id: string; hidden: true | undefined }
- `ToolbarDisclosureTriggerAttrs`: { aria-expanded: boolean; aria-controls: string; aria-haspopup: ToolbarDisclosureAriaHaspopup | undefined; onclick: (event: MouseEvent) => void; [key: symbol]: Attachment<HTMLElement> }
- `Tooltip`: Component<Props, {}, "">

## `/ambient`

- `App.Locals`: { cairnEditor?: Editor | null; cairnBackend?: Backend; cairnAuditSink?: AdminActionAuditSink; cairnAccess?: AccessMap; cairnIdentity?: { label: string; logoutUrl: string } }

## `/auth-crypto`

- `buildCookieName`: (base: string, secure: boolean) => string
- `compareTokens`: (a: string, b: string) => boolean
- `generateToken`: () => string
- `hashToken`: (token: string) => Promise<string>

## `/cloudflare`

- `RateLimitLike`: { limit: (options: { key: string }) => Promise<{ success: boolean }> }
- `RateLimitOutcome`: { outcome: "allowed" } | { outcome: "limited"; key: string } | { outcome: "no-binding" } | { outcome: "failed"; error: unknown }
- `resolveRateLimit`: (binding: RateLimitLike | undefined, keys: string | string[]) => Promise<RateLimitOutcome>
- `verifyTurnstile`: (token: string, secret: string, opts?: VerifyTurnstileOptions) => Promise<boolean>
- `VerifyTurnstileOptions`: { ip?: string; hostname?: string; action?: string }

## `/delivery`

- `buildExcerpt`: (body: string, opts?: { description?: string; maxChars?: number }) => string
- `buildJsonFeedResponse`: (channel: FeedChannel, items: FeedItem[]) => Response
- `buildMarkdownResponse`: (opts: { body: string }) => Response
- `buildRobotsResponse`: (opts: { sitemapUrl: string; disallow?: string[]; posture?: AiPosture }) => Response
- `buildRssResponse`: (channel: FeedChannel, items: FeedItem[]) => Response
- `buildSeoMeta`: (input: SeoInput) => SeoMeta
- `buildSiteDescriptors`: (adapter: CairnAdapter) => ConceptDescriptor[]
- `buildSiteManifest`: (adapter: CairnAdapter, files: Record<string, string>) => SiteManifestBuild
- `buildSitemapResponse`: (urls: SitemapUrl[]) => Response
- `buildSitemapView`: (site: UntypedSiteResolver, descriptors: ConceptDescriptor[], origin: string, extraRoutes?: string[]) => SitemapUrl[]
- `ContentEntry`: { frontmatter: F; body: string; concept: string; id: string; slug: string; permalink: string; title: string; date?: string; updated?: string; tags: string[]; excerpt: string; wordCount: number; draft: boolean; summaryFields: { [x: string]: unknown } }
- `ContentIndex`: { all: (opts?: { includeDrafts?: boolean }) => ContentSummary[]; byId: (id: string) => ContentEntry<F> | undefined; byTag: (tag: string, opts?: { includeDrafts?: boolean }) => ContentSummary[]; allTags: () => { tag: string; count: number }[]; adjacent: (id: string) => { newer?: ContentSummary; older?: ContentSummary }; problems: () => ContentProblem[] }
- `ContentProblem`: { id: string; draft: boolean; errors: { [x: string]: string } }
- `ContentSummary`: { concept: string; id: string; slug: string; permalink: string; title: string; date?: string; updated?: string; tags: string[]; excerpt: string; wordCount: number; draft: boolean; summaryFields: { [x: string]: unknown } }
- `createFragmentResolver`: (site: UntypedSiteResolver) => FragmentResolve
- `createLinkResolver`: (site: UntypedSiteResolver) => LinkResolve
- `createPublicRoutes`: <S extends SiteResolver>(config: PublicRoutesConfig<S>) => PublicRoutes<S>
- `createSiteResolver`: <const A extends CairnAdapter>(adapter: A, files: Record<string, string>) => SiteResolver<A>
- `EntryData`: S extends TypedSiteResolver<infer A extends CairnAdapter> ? { [K in keyof A["content"] & string]: ConceptEntryData<K, ConceptFrontmatter<A, K>> }[keyof A["content"] & string] : ConceptEntryData<string, Record<string, unknown>>
- `EntryRef`: { concept: string; id: string; title: string; permalink: string; excerpt?: string }
- `FeedChannel`: { title: string; description: string; siteUrl: string; feedUrl: string; language?: string; author?: { name: string; email?: string } }
- `FeedItem`: { title: string; url: string; date?: string; updated?: string; summary: string; contentHtml?: string; tags?: string[] }
- `ManifestProblem`: { concept: string; id: string; path: string; draft: boolean; errors: { [x: string]: string } }
- `PublicRoutes`: { entryLoad: (event: { url: URL }) => Promise<EntryData<S>>; entries: () => { path: string }[]; markdownEntries: () => { path: string }[]; markdownLoad: (event: { url: URL }) => Promise<{ body: string }> }
- `PublicRoutesConfig`: { site: S; render: (input: RenderInput) => Promise<string>; origin: string; siteName: string; description: string; feeds?: { rss?: string; json?: string }; defaultImage?: string; resolveMedia: MediaResolve | null }
- `readSeoFields`: (frontmatter: Record<string, unknown>) => SeoFields
- `resolveImageUrl`: (image: string, origin: string) => string | undefined
- `resolveReferences`: (site: UntypedSiteResolver, descriptor: ConceptDescriptor, frontmatter: Record<string, unknown>) => Record<string, EntryRef | EntryRef[]>
- `SeoFields`: { description?: string; image?: string; robots?: string; author?: string }
- `SeoInput`: { title: string; description: string; canonicalUrl: string; siteName: string; type?: "website" | "article"; published?: string; modified?: string; feeds?: { rss?: string; json?: string }; image?: string; imageAlt?: string; robots?: string; author?: string }
- `SeoMeta`: { title: string; meta: { name?: string; property?: string; content: string }[]; links: { rel: string; type?: string; href: string; title?: string }[]; jsonLd: { [x: string]: unknown } }
- `SiteManifestBuild`: { manifest: Manifest; problems: ManifestProblem[] }
- `SitemapUrl`: { loc: string; lastmod?: string }
- `SiteResolver`: string extends keyof A["content"] ? UntypedSiteResolver : TypedSiteResolver<A>
- `TypedSiteResolver`: { concept: <K extends keyof A["content"] & string>(id: K) => ContentIndex<NonNullable<A["content"][K]> extends ConceptConfig<infer S extends Record<string, FieldDescriptor>> ? InferFieldset<S> : Record<string, unknown>>; byPermalink: (path: string) => ContentEntry<Record<string, unknown>> | undefined; paths: () => { path: string }[]; all: () => ContentSummary[]; routable: (id: string) => boolean }
- `UntypedSiteResolver`: { byPermalink: (path: string) => ContentEntry<Record<string, unknown>> | undefined; paths: () => { path: string }[]; concept: (id: string) => ContentIndex<Record<string, unknown>> | undefined; all: () => ContentSummary[]; routable: (id: string) => boolean }

## `/islands`

- `hydrateIslands`: (islands: IslandRegistry, root?: ParentNode) => void
- `IslandRegistry`: { [x: string]: Component<Record<string, unknown>, {}, string> }

## `/log`

- `CAIRN_LOG_EVENTS`: readonly ["auth.link.requested", "auth.link.refused", "auth.link.send_failed", "auth.link.sent", "auth.token.minted", "auth.token.rebound", "auth.token.confirmed", "auth.session.created", "auth.session.destroyed", "auth.session.destroy_failed", "auth.rate_limited", "auth.rate_limit_failed", "commit.succeeded", "commit.failed", "commit.reverted", "config.invalid", "config.access_unmapped", "content.field_behavior_failed", "content.field_unmarked", "content.field_undeclared", "content.entry_invalid", "content.directive_unknown", "entry.published", "entry.discarded", "preview.token.minted", "preview.token.revoked", "preview.cleanup_failed", "preview.refused", "publish.failed", "publish.address_collided", "rename.address_collided", "entry.delete_refused", "entry.rename_refused", "entry.reference_check_failed", "entry.prior_read_failed", "github.unreachable", "health.failed", "guard.refused", "media.uploaded", "media.upload_failed", "media.delivery_failed", "media.orphans_reconciled", "media.resolve_missing", "include.missing", "include.read_failed", "media.deleted", "media.delete_refused", "media.bulk_deleted", "media.orphans_purged", "media.replaced", "media.replace_refused", "media.alt_propagated", "editor.added", "editor.removed", "editor.role_changed", "auth.role.unknown", "auth.identity.unknown", "auth.access.refused", "dictionary.added", "dictionary.add_conflict", "tidy.succeeded", "tidy.failed", "tidy.refused", "tidy.empty", "admin.attention_failed", "admin.action.audited", "admin.action.unaudited", "admin.action.session_absent", "admin.action.csrf_refused", "admin.action.failed", "admin.action.rate_limit_absent", "admin.action.rate_limit_failed", "admin.action.rate_limited", "admin.action.misconfigured", "audit.sink.call_failed", "turnstile.verify_failed", "audit.sink.write_failed"]
- `CairnLogEvent`: "auth.link.requested" | "auth.link.refused" | "auth.link.send_failed" | "auth.link.sent" | "auth.token.minted" | "auth.token.rebound" | "auth.token.confirmed" | "auth.session.created" | "auth.session.destroyed" | "auth.session.destroy_failed" | "auth.rate_limited" | "auth.rate_limit_failed" | "commit.succeeded" | "commit.failed" | "commit.reverted" | "config.invalid" | "config.access_unmapped" | "content.field_behavior_failed" | "content.field_unmarked" | "content.field_undeclared" | "content.entry_invalid" | "content.directive_unknown" | "entry.published" | "entry.discarded" | "preview.token.minted" | "preview.token.revoked" | "preview.cleanup_failed" | "preview.refused" | "publish.failed" | "publish.address_collided" | "rename.address_collided" | "entry.delete_refused" | "entry.rename_refused" | "entry.reference_check_failed" | "entry.prior_read_failed" | "github.unreachable" | "health.failed" | "guard.refused" | "media.uploaded" | "media.upload_failed" | "media.delivery_failed" | "media.orphans_reconciled" | "media.resolve_missing" | "include.missing" | "include.read_failed" | "media.deleted" | "media.delete_refused" | "media.bulk_deleted" | "media.orphans_purged" | "media.replaced" | "media.replace_refused" | "media.alt_propagated" | "editor.added" | "editor.removed" | "editor.role_changed" | "auth.role.unknown" | "auth.identity.unknown" | "auth.access.refused" | "dictionary.added" | "dictionary.add_conflict" | "tidy.succeeded" | "tidy.failed" | "tidy.refused" | "tidy.empty" | "admin.attention_failed" | "admin.action.audited" | "admin.action.unaudited" | "admin.action.session_absent" | "admin.action.csrf_refused" | "admin.action.failed" | "admin.action.rate_limit_absent" | "admin.action.rate_limit_failed" | "admin.action.rate_limited" | "admin.action.misconfigured" | "audit.sink.call_failed" | "turnstile.verify_failed" | "audit.sink.write_failed"
- `createLogger`: <Event extends string>(options?: { redactKeys?: readonly string[] }) => { info(event: Event, fields?: Record<string, unknown>): void; warn(event: Event, fields?: Record<string, unknown>): void; error(event: Event, fields?: Record<string, unknown>): void }
- `REDACTED_LOG_KEYS`: readonly string[]

## `/media`

- `createMediaResolver`: (media: MediaConfig | undefined, manifest: MediaManifest, opts?: { strict?: boolean }) => MediaResolve
- `formatMediaToken`: (ref: MediaRef) => string
- `MediaEntry`: { hash: string; sha256: string; slug: string; displayName: string; originalFilename: string; alt: string; ext: string; contentType: string; bytes: number; width: number | null; height: number | null; createdAt: string }
- `MediaManifest`: { [x: string]: MediaEntry }
- `MediaRef`: { slug: string | null; hash: string }
- `parseMediaToken`: (href: string) => MediaRef | null
- `readCommittedManifest`: (globResult: Record<string, unknown>) => MediaManifest

## `/public`

- `CairnHead`: Component<$$ComponentProps, {}, "">
- `PreviewBanner`: Component<Props, {}, "">

## `/reproductions`

- `getStory`: (id: string) => ReproStory
- `ReproContext`: Component<Props, {}, "">
- `ReproStory`: { id: string; component: Component<Record<string, unknown>, {}, string>; host: "shell" | "bare"; shellData?: Partial<{ public: false; siteName: string; user: { displayName: string; email: string; role: string; capability: Capability }; concepts: NavConcept[]; nav: ResolvedNavLayout; pathname: string; theme: "cairn-admin" | "cairn-admin-dark"; collapsedNav: string[] | null; csrf: string; pendingEntries: Promise<{ concept: string; id: string; title: string }[] | null>; contentEphemeral?: true; attention: Record<string, { count: number; label: string }> }>; props: { [x: string]: unknown }; context?: Record<string | symbol, unknown>; settle?: ((root: HTMLElement) => Promise<void>); pose?: ((root: HTMLElement, instance: ReproInstance) => Promise<void>); markers?: { n: number; anchor: string; key: string }[] }

## `/reproductions/manifest`

- `fixtureMediaFiles`: string[]
- `manifest`: ReproManifestEntry[]
- `ReproHeights`: { column?: number; wide?: number; desktop?: number; narrow?: number }
- `ReproManifestEntry`: { id: string; heights: ReproHeights; markerKeys: string[]; pose: boolean; host: "shell" | "bare"; ownThemeRoot: boolean }
- `validateReproFence`: (body: string, manifest: ReproManifestEntry[], options?: ValidateReproFenceOptions) => { issues: string[] }
- `ValidateReproFenceOptions`: { altPrefix?: RegExp; maxAltLength?: number; extraKeys?: string[] }

## `/sveltekit`

- `AdminActionAudit`: { action: string; entity: string; entityId?: string | number; detail?: string }
- `AdminActionAuditRecord`: AdminActionAudit & { actor: string }
- `AdminActionAuditSink`: (record: AdminActionAuditRecord) => void
- `AdminActionContext`: { editor: Editor; audit: (record: AdminActionAudit) => void }
- `AdminData`: { view: "login"; page: LoginData } | { view: "confirm"; page: ConfirmData } | { view: "list"; page: ListData } | { view: "edit"; page: EditData } | { view: "history"; page: HistoryData } | { view: "editors"; page: EditorsData } | { view: "nav"; page: NavData } | { view: "media"; page: MediaLibraryData } | { view: "settings"; page: SettingsData } | { view: "vocabulary"; page: VocabularyData } | { view: "help"; page: HelpData } | { view: "welcome"; page: WelcomeData }
- `AdminShellData`: { public: true; siteName: string; theme: "cairn-admin" | "cairn-admin-dark" } | { public: false; siteName: string; user: { displayName: string; email: string; role: string; capability: Capability }; concepts: NavConcept[]; nav: ResolvedNavLayout; pathname: string; theme: "cairn-admin" | "cairn-admin-dark"; collapsedNav: string[] | null; csrf: string; pendingEntries: Promise<{ concept: string; id: string; title: string }[] | null>; contentEphemeral?: true; attention: Record<string, { count: number; label: string }> }
- `AttentionItem`: { href: string; count: number; label?: string }
- `AuthGuardConfig`: { runtime: { roles?: RolesDeclaration; access?: AccessMap }; identity?: IdentityResolver }
- `AuthRoutesConfig`: { runtime: CairnRuntime; send?: SendMagicLink; rateLimit?: ((env: Readonly<Record<string, unknown>>) => RateLimitLike | undefined) }
- `CairnAdminConfig`: { runtime: CairnRuntime; auth?: Pick<AuthRoutesConfig, "send" | "rateLimit">; tidy?: { client?: ((opts: { apiKey: string }) => TidyClient); timeoutMs?: number }; navFilter?: ((items: ResolvedLayoutNode[], ctx: { editor: Editor; event: CairnEvent }) => ResolvedLayoutNode[] | Promise<ResolvedLayoutNode[]>); attention?: ((ctx: { editor: Editor; event: CairnEvent }) => AttentionItem[] | Promise<AttentionItem[]>) }
- `CairnAdminRoutes`: { load: (event: CairnEvent) => Promise<AdminData>; shellLoad: (event: CairnEvent) => Promise<{ shell: AdminShellData }>; actions: { tidy: (event: CairnEvent) => Promise<TidyResult | ActionFailure<TidyFailure> | ActionFailure<{ error: string }>>; request: (event: CairnEvent) => Promise<LoginRequestOutcome | ActionFailure<{ error: string }>>; confirm: (event: CairnEvent) => Promise<ActionFailure<{ error: string }>>; logout: (event: CairnEvent) => Promise<ActionFailure<{ error: string }>>; create: (event: CairnEvent) => Promise<ActionFailure<ContentFormFailure> | ActionFailure<{ error: string }>>; save: (event: CairnEvent) => Promise<ActionFailure<ContentFormFailure> | ActionFailure<{ error: string }>>; settingsSave: (event: CairnEvent) => Promise<ActionFailure<SettingsSaveFailure> | ActionFailure<{ error: string }>>; vocabularySave: (event: CairnEvent) => Promise<ActionFailure<VocabularySaveFailure> | ActionFailure<{ error: string }>>; upload: (event: CairnEvent) => Promise<UploadResult | ActionFailure<MediaUploadFailure> | ActionFailure<{ error: string }>>; publish: (event: CairnEvent) => Promise<ActionFailure<ContentFormFailure> | ActionFailure<{ error: string }>>; discard: (event: CairnEvent) => Promise<ActionFailure<{ error: string }>>; rename: (event: CairnEvent) => Promise<ActionFailure<ContentFormFailure> | ActionFailure<{ error: string }>>; previewMint: (event: CairnEvent) => Promise<ActionFailure<ContentFormFailure> | { url: string; expiresAt: number } | ActionFailure<{ error: string }>>; previewRevoke: (event: CairnEvent) => Promise<ActionFailure<ContentFormFailure> | { count: number } | ActionFailure<{ error: string }>>; revert: (event: CairnEvent) => Promise<ActionFailure<RevertOutcome> | ActionFailure<{ error: string }>>; dictionaryAdd: (event: CairnEvent) => Promise<DictionaryAddResult | ActionFailure<DictionaryAddFailure> | ActionFailure<{ error: string }>>; delete: (event: CairnEvent) => Promise<ActionFailure<ContentFormFailure> | ActionFailure<{ error: string }>>; mediaUpload: (event: CairnEvent) => Promise<UploadResult | ActionFailure<MediaUploadFailure> | ActionFailure<{ error: string }>>; mediaLibraryUpload: (event: CairnEvent) => Promise<UploadResult | ActionFailure<MediaUploadFailure> | ActionFailure<{ error: string }>>; publishAll: (event: CairnEvent) => Promise<ActionFailure<{ error: string }>>; editorAdd: (event: CairnEvent) => Promise<{ ok: true } | ActionFailure<EditorActionFailure> | ActionFailure<{ error: string }>>; editorRemove: (event: CairnEvent) => Promise<ActionFailure<EditorActionFailure> | { ok: true } | ActionFailure<{ error: string }>>; editorSetRole: (event: CairnEvent) => Promise<ActionFailure<EditorActionFailure> | { ok: true } | ActionFailure<{ error: string }>> } }
- `CairnEvent`: { url: URL; request: Request; params: { [x: string]: string }; route: { id: string | null }; cookies: CookieJar; setHeaders: (headers: Record<string, string>) => void; locals: { cairnEditor?: Editor | null; cairnBackend?: Backend; cairnAuditSink?: AdminActionAuditSink; cairnAccess?: AccessMap; cairnIdentity?: { label: string; logoutUrl: string } } }
- `CairnMediaBindings`: { MEDIA_BUCKET: { get(key: string): Promise<unknown>; head(key: string): Promise<unknown>; put(key: string, value: ArrayBuffer): Promise<unknown>; delete(keys: string | string[]): Promise<void> } }
- `CairnPlatformBindings`: { AUTH_DB: D1Database; EMAIL: EmailSender; PUBLIC_ORIGIN: string; GITHUB_APP_PRIVATE_KEY_B64: string; ANTHROPIC_API_KEY?: string }
- `ContentFormFailure`: { error: string; brokenLinks?: string[]; body?: string; inboundLinks?: EntryRef[]; inboundKind?: "link" | "include"; id?: string; hash?: string; usage?: UsageEntry[]; foundIn?: number; field?: string }
- `ContentRoutesConfig`: { runtime: CairnRuntime; tidy?: { client?: ((opts: { apiKey: string }) => TidyClient); timeoutMs?: number }; navFilter?: ((items: ResolvedLayoutNode[], ctx: { editor: Editor; event: CairnEvent }) => ResolvedLayoutNode[] | Promise<ResolvedLayoutNode[]>); attention?: ((ctx: { editor: Editor; event: CairnEvent }) => AttentionItem[] | Promise<AttentionItem[]>) }
- `CookieJar`: { get: (name: string) => string | undefined; set: (name: string, value: string, opts: CookieSetOptions) => void; delete: (name: string, opts: { path: string; secure?: boolean }) => void }
- `CookieSetOptions`: { path: string; httpOnly?: boolean; secure?: boolean; sameSite?: "none" | "lax" | "strict"; maxAge?: number }
- `createAuthGuard`: (config: AuthGuardConfig) => Handle
- `createCairnAdmin`: (config: CairnAdminConfig) => CairnAdminRoutes
- `createD1AuditSink`: (db: D1Database, waitUntil: ((promise: Promise<unknown>) => void) | undefined) => AdminActionAuditSink
- `createMediaRoute`: (config: MediaRouteConfig) => RequestHandler
- `createSectionAction`: { <Env, Db>(config: SectionActionConfig<Env, Db>): SectionAction<Env, Db>; <Env = unknown>(config: Omit<SectionActionConfig<Env, unknown>, "resolveDb"> & { resolveDb?: undefined }): PlainSectionAction }
- `EditData`: { conceptId: string; id: string; label: string; singular: string; fields: NamedField[]; frontmatter: { [x: string]: unknown }; body: string; title: string; isNew: boolean; flash: "published" | "saved" | "renamed" | "discarded" | null; slug: string; linkTargets: LinkTarget[]; fragmentTargets: FragmentTarget[] | null; routable: boolean; mediaTargets: { [x: string]: { slug: string; ext: string; contentType: string } }; mediaLibrary: { [x: string]: MediaLibraryEntry }; inboundLinks: EntryRef[]; pending: boolean; published: boolean; publishActions: PublishActionLink[]; preview: ResolvedPreview | null; spellcheckDictionary: string; siteDictionary: string[]; tidy: { enabled: boolean; model: string; conventions: TidyConventions }; advisories: AdvisoryNotice[]; orphanTags: string[] }
- `EngineScreenId`: "help" | "settings" | "media" | "vocabulary" | "nav" | "editors" | (string & {})
- `HandleInput`: { event: CairnEvent; resolve: (event: CairnEvent) => Response | Promise<Response> }
- `HealthData`: { ok: boolean; checks: { githubAppSigning: { ok: boolean; detail?: string; fingerprint?: string }; githubAppToken?: { ok: boolean; detail?: string } } }
- `HelpData`: { gettingStarted: GettingStarted; reference: MarkdownReferenceRow[]; supportContact?: string }
- `HistoryData`: { entries: HistoryEntry[]; draft: { editor: string; lastSavedAt: string } | null; truncated: boolean; head: string | null }
- `IdentityFailure`: { ok: false; reason: string }
- `IdentityResolver`: { resolve: (event: CairnEvent) => Promise<ResolvedIdentity | IdentityFailure>; logoutUrl: string; label?: string }
- `ListData`: { conceptId: string; label: string; singular: string; dated: boolean; routable: boolean; entries: EntrySummary[]; error: string | null; formError: string | null; publishedAll: number | null }
- `loadHealth`: (event: CairnEvent, { runtime }: { runtime: CairnRuntime }) => Promise<HealthData>
- `loadPreview`: <S extends SiteResolver>(event: CairnEvent, { runtime, publicRoutes }: { runtime: CairnRuntime; publicRoutes: PublicRoutesConfig<S> }) => Promise<PreviewData<S>>
- `LoginRequestOutcome`: { outcome: "sent" } | { outcome: "send-error" } | { outcome: "throttled" }
- `MediaLibraryData`: { assets: MediaLibraryEntry[]; usage: { [x: string]: MediaUsageInfo }; error: string | null; flash: "deleted" | "updated" | "replaced" | "altPropagated" | "bulkDeleted" | "orphansPurged" | "uploaded" | null }
- `MediaRouteConfig`: { runtime: CairnRuntime }
- `NavData`: { menu: { name: string; label: string; maxDepth: number }; tree: NavNode[]; pages: NavPageOption[]; saved: boolean }
- `NavIcon`: "anchor" | "banknote" | "bell" | "calendar" | "clipboard-list" | "file-pen" | "files" | "graduation-cap" | "image" | "inbox" | "key-round" | "life-buoy" | "list" | "list-ordered" | "mail" | "megaphone" | "menu" | "package" | "puzzle" | "send" | "settings" | "shield-check" | "table" | "tags" | "users" | "users-round" | "wrench"
- `NavLayout`: (NavLayoutEntry | NavLayoutEngineRef | NavLayoutSection)[]
- `NavLayoutEngineRef`: { screen: "help" | "settings" | "media" | "vocabulary" | "nav" | "editors" | (string & {}); label?: string; hidden?: boolean; icon?: "anchor" | "banknote" | "bell" | "calendar" | "clipboard-list" | "file-pen" | "files" | "graduation-cap" | "image" | "inbox" | "key-round" | "life-buoy" | "list" | "list-ordered" | "mail" | "megaphone" | "menu" | "package" | "puzzle" | "send" | "settings" | "shield-check" | "table" | "tags" | "users" | "users-round" | "wrench" }
- `NavLayoutEntry`: { label: string; icon: "anchor" | "banknote" | "bell" | "calendar" | "clipboard-list" | "file-pen" | "files" | "graduation-cap" | "image" | "inbox" | "key-round" | "life-buoy" | "list" | "list-ordered" | "mail" | "megaphone" | "menu" | "package" | "puzzle" | "send" | "settings" | "shield-check" | "table" | "tags" | "users" | "users-round" | "wrench"; href: string; ownerOnly?: boolean; roles?: string[] }
- `NavLayoutSection`: { label: string; children: (NavLayoutEntry | NavLayoutEngineRef)[]; roles?: string[]; collapsed?: boolean }
- `NO_PENDING_REQUEST_ERROR`: "no-pending-request"
- `PlainSectionAction`: <T>(handler: (args: { event: CairnEvent; form: FormData; ctx: Omit<SectionActionContext<unknown>, "db"> }) => Promise<T>, opts: SectionActionOptions) => (event: CairnEvent) => Promise<T | ActionFailure<{ error: string }>>
- `PreviewData`: EntryData<S> & { preview: { state: "draft" | "published"; expiresAt: string; published: { permalink: string } | null } }
- `PublishActionEntry`: { label: string; href: string; concepts?: string[] }
- `requireAccess`: (event: CairnEvent, target?: string) => Editor
- `requireOwner`: (event: CairnEvent) => Editor
- `requireSession`: (event: CairnEvent) => Editor
- `ResolvedEngineNavEntry`: { screen: "help" | "settings" | "media" | "vocabulary" | "nav" | "editors" | (string & {}); label: string; href: string; dated?: boolean; iconName?: "anchor" | "banknote" | "bell" | "calendar" | "clipboard-list" | "file-pen" | "files" | "graduation-cap" | "image" | "inbox" | "key-round" | "life-buoy" | "list" | "list-ordered" | "mail" | "megaphone" | "menu" | "package" | "puzzle" | "send" | "settings" | "shield-check" | "table" | "tags" | "users" | "users-round" | "wrench" }
- `ResolvedIdentity`: { ok: true; email: string; displayName?: string }
- `ResolvedLayoutChild`: ResolvedNavEntry | ResolvedEngineNavEntry
- `ResolvedLayoutNode`: ResolvedLayoutChild | ResolvedLayoutSection
- `ResolvedLayoutSection`: { label: string; children: ResolvedLayoutChild[]; collapsed?: boolean }
- `ResolvedNavEntry`: { label: string; iconName: "anchor" | "banknote" | "bell" | "calendar" | "clipboard-list" | "file-pen" | "files" | "graduation-cap" | "image" | "inbox" | "key-round" | "life-buoy" | "list" | "list-ordered" | "mail" | "megaphone" | "menu" | "package" | "puzzle" | "send" | "settings" | "shield-check" | "table" | "tags" | "users" | "users-round" | "wrench"; href: string; ownerOnly: boolean }
- `ResolvedNavLayout`: { items: ResolvedLayoutNode[]; fallback: ResolvedLayoutChild[] }
- `RevertOutcome`: { outcome: "draft-exists"; draftEditor: string; draftLastSavedAt: string } | { outcome: "ref-unknown" } | { outcome: "history-stale" }
- `SectionAction`: <T>(handler: (args: { event: CairnEvent; form: FormData; ctx: SectionActionContext<Db> }) => Promise<T>, opts: SectionActionOptions) => (event: CairnEvent) => Promise<T | ActionFailure<{ error: string }>>
- `SectionActionAudit`: { action?: string; entity?: string; entityId?: string | number; detail?: string }
- `SectionActionConfig`: { resolveDb: (env: Env | undefined) => Db | undefined; rateLimit?: { resolve: (env: Env | undefined) => RateLimitLike | undefined; key: (ctx: AdminActionContext) => string; message?: string } }
- `SectionActionContext`: Omit<AdminActionContext, "audit"> & { audit: (record: SectionActionAudit) => void; db: NonNullable<Db> }
- `SectionActionOptions`: { action: string; entity: string; target?: string; ownerOnly?: boolean; deniedMessage?: string }
- `SettingsData`: { enabled: boolean; tidyEnabled: boolean; keyConfigured: boolean; keyStatus: TidyKeyProbeResult | "missing"; model: string; modelLabel: string; conventions: TidyConventions; saved: boolean }
- `TidyClient`: { tidy: (request: { model: string; system: string; text: string; effort?: TidyEffort }, options?: { signal?: AbortSignal }) => Promise<{ corrected: string; refused: boolean; tokens: { input: number; output: number } }>; models?: { list(params?: { limit?: number }, options?: { signal?: AbortSignal }): Promise<unknown> } }
- `TidyEffort`: "low" | "medium" | "high" | "xhigh" | "max"
- `UnauditedActionError`: typeof UnauditedActionError
- `VocabularyData`: { vocabulary: VocabularyEntry[]; usage: { [x: string]: number }; unlisted: { value: string; count: number }[]; saved: boolean }
- `WelcomeData`: { displayName: string; siteName: string }

## `/vite`

- `cairnManifest`: (opts: CairnManifestOptions) => Plugin<any>
- `CairnManifestOptions`: { configModule: string }

