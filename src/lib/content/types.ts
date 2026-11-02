// cairn-cms: the adapter contract a site implements, and the engine-internal descriptors
// the contract normalizes into.
//
// The adapter is the single seam the engine consumes. A site supplies a
// `CairnAdapter` at `src/lib/cairn.config.ts` declaring its backend repo, the content
// concepts it enables, its magic-link sender, and a design-accurate `render`. The
// engine never hard-codes a concept, directory, or field; it reads them here. Field
// descriptors are plain data so a `load` function can hand them across the server-to-client
// boundary to the editor form.
import type { ComponentRegistry } from '../render/registry.js';
import type { RenderInput } from '../render/pipeline.js';
import type { IconSet } from '../render/glyph.js';
import type { IslandRegistry } from '../islands/types.js';
import type { BackendProvider } from '../github/backend.js';
import type { DatePrefix } from './ids.js';
import type { Fieldset } from './fieldset.js';
import type { FieldDescriptor } from './fields.js';
import type { LinkResolve } from './links.js';
import type { RolesDeclaration } from '../auth/roles.js';
import type { AccessMap } from '../auth/access.js';
// A type-only import: it erases at compile, so it does not breach the content-must-not-import-sveltekit
// layering rule. The validation that needs parseAdminPath lives in the sveltekit layer, not here.
import type { NavLayout } from '../sveltekit/admin-nav.js';
// Also type-only, for the same layering reason: publishActions validates against the site's
// concepts in the sveltekit layer, not here.
import type { PublishActionEntry } from '../sveltekit/publish-actions.js';

/**
 * The stored value of an `image` field: a `media:` reference, a screen-reader description, and an
 *  optional caption.
 * @public
 */
export interface ImageValue {
  src: string;
  alt: string;
  caption?: string;
  /** An explicit decorative choice: an empty alt that is not debt. Omitted unless true. */
  decorative?: boolean;
}

/**
 * One validation failure located by a path: a top-level key, then a row index and/or a leaf sub-key.
 * @public
 */
export interface ValidationIssue {
  /** The path to the failing field, e.g. ['faq', 0, 'question'] or ['address', 'city'] or ['title']. */
  path: (string | number)[];
  /** The author-facing message, naming the field's label. */
  message: string;
}

/**
 * A validator's verdict. On success it carries the normalized frontmatter to commit; on failure it
 * carries field-keyed error messages (the empty key is a form-level error) and, additively, the
 * located `issues` with multi-segment paths so the form can route a nested-container error to the
 * right input. Invalid input bounces to the form and never reaches git.
 * @public
 */
export type ValidationResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errors: Record<string, string>; issues?: ValidationIssue[] };

/**
 * A field descriptor with its frontmatter key re-attached as `name`. This is the normalized form
 *  `ConceptDescriptor.fields` carries: `normalizeConcepts` derives it from a concept's `fieldset`
 *  record so every consumer (the editor form, the form decoder, the media extractor) iterates an
 *  array and reads `name` rather than the keyed record.
 * @public
 */
export type NamedField = FieldDescriptor & { name: string };

/**
 * Per-site configuration for one content concept. One `fields` fieldset, built with
 * `defineFieldset`, is the single source of truth for the editor form, the validator, and the
 * inferred frontmatter type. Generic over the fieldset so a concept's concrete type survives for
 * typed reads. A concept also declares its routing and URL policy here (`routing`, `permalink`,
 * `datePrefix`), resolved by `normalizeConcepts`.
 * @public
 */
export interface ConceptConfig<S extends Fieldset = Fieldset> {
  /**
   * Repo-relative content directory, e.g. "src/content/posts": no leading or trailing slash. The
   *  engine uses it verbatim and never validates it. Entries sit directly in it, never in subfolders.
   *  An entry's id is its filename without `.md`, at `${dir}/${id}.md`; an id is lowercase ASCII
   *  letters, digits, and single hyphens. A dated concept's filename also carries a leading date
   *  prefix of the `datePrefix` granularity, which only the URL slug drops: the entry's date comes
   *  from its `date` field.
   */
  dir: string;
  /** Sidebar label; defaults from the concept id when omitted. */
  label?: string;
  /** The singular noun for the create affordances ("New post"); defaults to `label` when omitted. */
  singular?: string;
  /**
   * The concept's fieldset: the form projection, the generated validator, and the inferred type. An
   *  admin save writes the entry's frontmatter from the validator's output alone, so a key the
   *  fieldset does not declare is dropped from the file at its first admin save. The engine reads
   *  `title` (an entry without one falls back to its id), `date`, `updated`, `description`,
   *  `draft`, and the head fields `image`, `robots`, and `author` by literal name, so a site that
   *  wants one to survive declares it as a field. The validator also runs when the site builds its
   *  content indexes: unless the site passes `validate: false`, a non-draft entry whose frontmatter
   *  fails it fails the build.
   */
  fields: S;
  /**
   * This concept's routing: the `'feed'` (dated and in feeds), `'page'` (a routable static page), or
   *  `'embedded'` (not routable) shorthand. Omitted means `'page'`. Every routable concept's entries
   *  get a public page and a sitemap entry; a `'feed'` concept's permalink may also use the date
   *  tokens, and its index sorts newest first (an undated concept's sorts by title). An `'embedded'`
   *  concept has no public page and no sitemap entry, but keeps a directory, fields, and an admin list
   *  and editor, which label its identifier **Name** and offer **Rename** rather than **Change URL**.
   *  Which entries reach an RSS or JSON feed is the site's feed route's choice.
   */
  routing?: 'feed' | 'page' | 'embedded';
  /** The permalink pattern, root-relative, e.g. `/blog/:year/:slug`. Defaults by concept id. */
  permalink?: string;
  /** Date-prefix granularity for a dated concept's id-to-slug stripping. Defaults to `day`. */
  datePrefix?: DatePrefix;
  /**
   * Frontmatter keys to surface on each `ContentSummary.fields`, so a list card reads an authored
   *  field without a per-entry detail read. Defaults to none. `defineConcept` keys this list to the
   *  declared fields, and compose throws when a key from an untyped caller is not one.
   */
  summaryFields?: string[];
}

/**
 * A concept's URL policy, declared on the adapter concept itself (`ConceptConfig.permalink` and
 * `ConceptConfig.datePrefix`) since Contract v2. `permalink` is a `/`-prefixed pattern of literal
 * segments and the tokens `:slug`, `:year`, `:month`, `:day`. `datePrefix` is the filename
 * date-prefix granularity for a dated concept. Both default in `normalizeConcepts` when omitted.
 */
export interface ConceptUrlPolicy {
  permalink?: string;
  datePrefix?: DatePrefix;
}

/**
 * A site's stated stance toward AI training crawlers, read by `buildRobots`/`robotsResponse`
 * (`/delivery`). `'decline'` emits `Disallow: /` for every token in the engine's crawler table
 * plus `Content-Signal: ai-train=no`; `'invite'` emits an affirmative `Content-Signal` and no
 * `Disallow`. Unset (the default on every site today) emits neither: the engine states no
 * posture it was not told to state.
 *
 * Declining is a request that named crawlers say they honor, not enforcement; robots.txt has no
 * mechanism to block a fetch. OpenAI documents that robots.txt rules "may not apply" to its
 * `ChatGPT-User`, and Perplexity that `Perplexity-User` "generally ignores" them, since a user
 * initiated the fetch, so a fully declining site can still be fetched live when someone asks an
 * assistant about it.
 * @public
 */
export type AiPosture = 'invite' | 'decline';

/**
 * Magic-link sender identity for Cloudflare Email Sending.
 * @public
 */
export interface SenderConfig {
  /** The address the magic-link email is sent from. */
  from: string;
  /** The single address a reply to the magic-link email goes to. */
  replyTo?: string;
}

/**
 * A menu in the site-config YAML (the file `editor.siteConfigPath` names) that this site's nav
 *  editor manages.
 * @public
 */
export interface NavMenuConfig {
  /** Key within the file's menus map, e.g. "primary". */
  menuName: string;
  /** Sidebar label for the menu. */
  label: string;
  /** Max nesting depth allowed in the editor; defaults to 2. */
  maxDepth?: number;
}

/**
 * How the edit page's preview frame reproduces the live site's content styling. The admin
 * deliberately never loads the site's CSS (chrome isolation), so a design-accurate preview needs
 * the site to name its stylesheets for the preview frame; without this knob the preview renders
 * unstyled markup. The frame's srcdoc paints the body with the site's `--color-base-100`, falling
 * back to white when no named stylesheet defines it, so a site whose stylesheet sets that variable
 * needs no body rule of its own.
 * @remarks
 * Reference each named sheet only through a Vite `?url` import, linked from the site layout's
 * `<svelte:head>`. A layout that also imports the same file statically folds it into the layout's CSS
 * chunk, whose basename differs between the client and server builds, so the URL the server-rendered
 * edit page hands the frame names a file the client build never serves. Even done right, the build
 * ships two hashed copies of the sheet (the page links the client copy, the frame the server copy);
 * that is by design. A `byConcept` override applies key by key over the top-level values: a missing
 * override key keeps the top-level value and only a string replaces it. `editLoad` ships the
 * already-resolved flat shape, so the map never reaches the client.
 * @public
 */
export interface PreviewConfig {
  /**
   * Absolute or root-relative URLs of the site's compiled stylesheets, linked inside the
   *  preview document. A Vite `?url` import of the site's CSS resolves the hashed asset URL.
   */
  stylesheets: string[];
  /** Class list applied to the preview document's body, for theme or typography roots. */
  bodyClass?: string;
  /**
   * Class list for a wrapper element around the rendered content, reproducing the site's
   *  content container (a prose or measure class). Omitted renders the content bare.
   */
  containerClass?: string;
  /**
   * Per-concept overrides of bodyClass and containerClass, keyed by concept id. An entry's
   *  preview resolves the override for its concept over the top-level values; stylesheets are
   *  always shared.
   */
  byConcept?: Record<
    string,
    {
      /** This concept's body class list, in place of the top-level `bodyClass`. */
      bodyClass?: string;
      /** This concept's content wrapper class list, in place of the top-level `containerClass`. */
      containerClass?: string;
    }
  >;
}

/**
 * The flat preview shape `editLoad` ships to the edit page: the top-level `PreviewConfig`
 *  values with the entry's concept override applied, and no `byConcept` map.
 */
export type ResolvedPreview = Omit<PreviewConfig, 'byConcept'>;

/**
 * A site's media configuration (seam 4). A site sets this to turn on R2-backed media: uploads,
 *  content-addressed storage, and Cloudflare Images variants. Omitting it leaves media off. The
 *  engine normalizes this into a `ResolvedAssetConfig`.
 * @public
 */
export interface AssetConfig {
  /** The R2 bucket binding name on the Worker, e.g. "MEDIA_BUCKET". Required when a site declares media. */
  bucketBinding: string;
  /** The delivery base path. Defaults to "/media". */
  publicBase?: string;
  /**
   * Whether the public URL carries the slug (`/media/<slug>.<hash>.<ext>`) or stays opaque
   *  (`/media/<aa>/<hash>.<ext>`). Defaults to "slug".
   */
  urlForm?: 'slug' | 'opaque';
  /** The maximum accepted upload size in bytes. Defaults to 25 MB. */
  maxUploadBytes?: number;
  /** The accepted upload MIME types. Defaults to the common web image types. */
  allowedTypes?: string[];
  /**
   * Whether Cloudflare Image Transformations are enabled for the zone (default false). The feature
   *  is a per-zone setting that the dashboard or API turns on; it cannot be flipped from a Worker. With
   *  it off, the media resolver serves the bare full-size delivery path, so
   *  thumbnails stay correct (full-size-but-correct) rather than pointing at a dead /cdn-cgi/image URL.
   *  It governs only the responsive `srcset` a rendered image gets beside its full-size `src`. Set it
   *  `true` only after enabling Transformations on the zone.
   */
  transformations?: boolean;
}

/**
 * The site's one renderer (design decision 4): the editor preview and every public page call it.
 *  Entry-aware so a custom renderer can vary output by concept or frontmatter; the default reads only
 *  `body` plus the resolvers. `resolveLink` rewrites cairn: links to live permalinks (the build passes a
 *  site-resolver-backed resolver, the preview a manifest-backed one); `resolveMedia` resolves media:
 *  references the same way. `resolveFragment` resolves an `::include` directive's fragment id to its
 *  raw markdown body, the same way; a site's render need not read it unless it wants to vary
 *  fragment resolution. `concept` and `frontmatter` carry the entry's context for an entry render and
 *  are absent for the standalone component-insert preview. The render must forward `resolveFragment`
 *  beside `resolve` and `resolveMedia`: one that drops it publishes each `::include` as literal text
 *  with no error.
 * @public
 */
export type SiteRender = (input: RenderInput) => Promise<string>;

/**
 * The single seam the engine consumes. A site implements this at `src/lib/cairn.config.ts`, in six
 * subsystem groups: the content concepts, the commit backend, the magic-link sender, the
 * render subsystem, the optional media stack, and the admin-experience knobs. The internal manifest
 * and dictionary paths are not here; `composeRuntime` defaults them by convention.
 * @public
 */
export interface CairnAdapter {
  /** The site's concepts, keyed by id. Posts and pages are the documented defaults; a site may add more. */
  content: Record<string, ConceptConfig>;
  /**
   * The site's role vocabulary, from `defineRoles({ ... })`. Absent, a site gets the implicit
   *  `{ owner: 'owner', editor: 'editor' }` pair with no behavior change. Maps the site's role
   *  names onto the engine's three capability levels; the guard and the editors routes read it
   *  through the composed runtime.
   */
  roles?: RolesDeclaration;
  /**
   * The site's declared access map, from `defineAccess({ ... })`. Absent, every engine screen and
   *  `requireAccess` call keeps today's any-editor-capability behavior. Re-validated at composition
   *  (`createContentRoutesContext`) against the site's real concepts and engine-route table, the same
   *  split the engine's internal nav-layout validation uses.
   */
  access?: AccessMap;
  /** The commit backend provider, from `createGithubApp({ ... })` (the GitHub App today). */
  backend: BackendProvider;
  /** The magic-link sender. */
  email: SenderConfig;
  /** The render subsystem: the one renderer, its directive vocabulary, and its icons. */
  rendering: {
    /**
     * The one renderer the editor preview and every public page call (design decision 4). `resolve`
     *  rewrites cairn: links to live permalinks; the build passes a site-resolver-backed one, the
     *  preview a manifest one. `resolveMedia` resolves media: references the same way.
     */
    render: SiteRender;
    /** Directive component registry; the renderer and the insert palette derive from it (seam 3). */
    components?: ComponentRegistry;
    /** The site's glyph name to SVG path-data map, for the admin icon picker and the renderer. */
    icons?: IconSet;
    /**
     * The live Svelte components for hydrated directives, keyed by directive name.
     *  Every component whose {@link ComponentDef.hydrate} is set needs an entry here, and every entry
     *  needs a matching `hydrate` component; `defineAdapter` checks both. The engine reads this
     *  registry for that check only: the site's root layout owns the gate that imports the island
     *  client runtime and the map it passes to `hydrateIslands`, and a name missing from that map
     *  mounts nothing, with no error.
     */
    islands?: IslandRegistry;
  };
  /** R2-backed media (seam 4): the bucket binding and image variants. Absent leaves media off. */
  media?: AssetConfig;
  /**
   * The site's stated stance toward AI training crawlers. Absent (the default) emits nothing: the
   *  engine states no posture the site did not declare. See {@link AiPosture} for what each value
   *  emits and why declining is a request, not enforcement.
   */
  aiPosture?: AiPosture;
  /** Admin-experience knobs: the preview frame, the nav menu, and the editor support contact. */
  editor?: {
    /**
     * The live site's content styling for the preview frame. The admin's chrome isolation keeps
     *  the site's CSS out of the admin document, so the preview frame links these instead.
     */
    preview?: PreviewConfig;
    /** Which menu in the site-config YAML the nav editor manages. */
    nav?: NavMenuConfig;
    /**
     * The repo-relative path of the committed site-config YAML, which the nav editor, Settings,
     *  and the tag vocabulary all read and write. Unset, it defaults to the scaffold's
     *  `src/theme/site.config.yaml`.
     */
    siteConfigPath?: string;
    /**
     * Optional contact a stuck editor is pointed to from the in-admin help (an email address, a URL,
     *  or a name and instruction). Unset, `composeRuntime` defaults it to cairn's hosted help
     *  (`https://cairn.pub/help`); an explicit value overrides that default and wins. An explicitly
     *  empty string (`''`) passes through untouched, since the default only covers the nullish case,
     *  and the Help home then renders no hand-off, the same self-serve state as an unset value would
     *  have been before the default existed.
     */
    supportContact?: string;
    /**
     * The whole sidebar, arranged as one ordered tree mixing the engine's screens with the
     *  site's entries (a concept id or a fixed utility-screen name as an engine reference, a
     *  developer's labeled `/admin/` link, or a one-level section of either). Absent leaves the
     *  sidebar to the default arrangement (today's built-in shape). `defineAdapter` keys each
     *  `screen` to the adapter's concepts and the engine's screens.
     */
    navLayout?: NavLayout;
    /**
     * Next-step links rendered on the publish-success moment (the `navLayout` site-entry grammar
     *  applied to after a publish): a plain-data `{label, href}` list, `href` a template string
     *  substituted with the published entry's concept and id, filterable to specific concepts. The
     *  engine validates each entry when it composes, so a blank field, a duplicate label, or an
     *  unknown concept fails at server start, and in `vite build` too, since SvelteKit's build
     *  analysis loads every route's server module. The links follow a single publish only: Publish
     *  all returns to the concept list, whose confirmation renders none. Absent renders the
     *  publish-success moment with no links.
     */
    publishActions?: PublishActionEntry[];
  };
}

/**
 * Concept-fixed routing for a normalized concept. Posts are dated feed entries;
 * pages are plain navigable structure. Not in adapter config.
 * @public
 */
export interface RoutingRule {
  /** Routable as a standalone URL: the entries get a public page and a sitemap entry. An embedded concept is not. */
  routable: boolean;
  /** Carries a date (posts). */
  dated: boolean;
  /** Set for the `'feed'` shorthand. The sitemap lists every routable concept whatever this says. */
  inFeeds: boolean;
}

/**
 * The engine-internal, uniform view of one concept after normalization (seam 1). The admin
 * nav, the list views, and the editor all read this, never the raw config.
 * @public
 */
export interface ConceptDescriptor {
  /** Concept id, the key under `content`, e.g. "posts". */
  id: string;
  label: string;
  /**
   * The singular noun for the create affordances ("New post"); resolved from `ConceptConfig.singular`,
   *  defaulting to `label` when the config omits it.
   */
  singular: string;
  dir: string;
  routing: RoutingRule;
  /** The resolved permalink pattern, defaulted by `normalizeConcepts`. */
  permalink: string;
  /** Filename date-prefix granularity for a dated concept; resolved by `normalizeConcepts`. */
  datePrefix: DatePrefix;
  /**
   * The concept's fields in normalized form: each descriptor with its record key re-attached as
   *  `name`, derived by `normalizeConcepts` from the concept's `fieldset` record. Every consumer
   *  (the editor form, the form decoder, the media extractor) iterates this array and reads `name`.
   */
  fields: NamedField[];
  /**
   * The concept's source fieldset, carried through so `editLoad` can resolve a create-form's
   *  initial values (a `default: 'today'` date) against a request-time clock via `initialValues`.
   */
  schema: Fieldset;
  /**
   * Frontmatter keys the index copies onto each summary's `fields` record. `normalizeConcepts`
   *  resolves it to `[]` when a concept omits `summaryFields`.
   */
  summaryFields: string[];
  validate(frontmatter: Record<string, unknown>, body: string): ValidationResult;
}

/**
 * The composed runtime the engine serves from. The single aggregation point (`composeRuntime`)
 * folds the adapter into this shape.
 * @public
 */
export interface CairnRuntime {
  siteName: string;
  concepts: ConceptDescriptor[];
  /**
   * The site's declared role vocabulary, carried through from the adapter by `composeRuntime`.
   *  Absent, the guard and the editors routes resolve every session against the implicit
   *  owner/editor pair.
   */
  roles?: RolesDeclaration;
  /**
   * The site's declared access map, carried through from the adapter by `composeRuntime`. Absent,
   *  every engine screen and `requireAccess` call keeps today's any-editor-capability behavior.
   */
  access?: AccessMap;
  /** The commit backend provider, carried through from the adapter by `composeRuntime`. */
  backend: BackendProvider;
  sender: SenderConfig;
  /** The support contact passed through from the adapter; the in-admin help reads it. Optional. */
  supportContact?: string;
  /**
   * The site's one renderer: the editor preview and every public page call it (design decision 4).
   *  The build passes a site-resolver-backed `resolve`/`resolveMedia` pair, the preview manifest-backed
   *  ones.
   */
  render: SiteRender;
  manifestPath: string;
  /** The repo-relative path to the committed media manifest, defaulted in composeRuntime. */
  mediaManifestPath: string;
  /**
   * The repo-relative path to the committed personal dictionary file (one word per line, sorted),
   *  defaulted in composeRuntime to src/content/.cairn/dictionary.txt: the same `.cairn/` content root
   *  the manifests use. The edit load reads it and threads its words onto EditData; the
   *  dictionaryAdd action reads, merges, and commits it. Optional on the runtime so a hand-built
   *  runtime need not set it; composeRuntime always fills it, and the edit load and the action default
   *  a missing value to the same content-root path.
   */
  dictionaryPath?: string;
  /**
   * The adapter's asset config resolved once at compose: `{ enabled: false }` for a no-media site,
   *  otherwise the filled config the upload, storage, delivery, and resolver paths read.
   */
  resolvedAssets: import('../media/config.js').ResolvedAssetConfig;
  registry?: ComponentRegistry;
  /** The site's glyph name to SVG path-data map, for the admin icon picker and the renderer. */
  icons?: IconSet;
  navMenu?: NavMenuConfig;
  /**
   * The repo-relative path of the site-config YAML the nav editor, Settings, and Tags read and
   *  write, resolved once at compose from `editor.siteConfigPath`.
   */
  siteConfigPath: string;
  /**
   * The raw navLayout config, passed through from the adapter unvalidated (validation needs
   *  parseAdminPath, a sveltekit symbol, so it runs at admin construction, not here, checking
   *  screen ids and roles against the site's real concepts and vocabulary). Optional.
   */
  navLayout?: NavLayout;
  /**
   * The raw publish-actions config, passed through from the adapter unvalidated (validation runs
   *  at admin construction, the same as `navLayout`, since it checks each entry's `concepts` filter
   *  against the site's real concepts). Optional.
   */
  publishActions?: PublishActionEntry[];
  /** The live site's content styling for the preview frame; passed through from the adapter. */
  preview?: PreviewConfig;
  assets?: AssetConfig;
  /**
   * The editor's spellcheck dictionary file, resolved once at compose from the site config's
   *  `spellcheck.dialect` (defaulting to US English). The edit load threads it onto EditData and the
   *  editor resolves it to a real asset URL on the main thread, so the Worker receives the URL and
   *  never reads config. Just the filename, e.g. "dictionary-en-us.txt". Optional on the runtime so a
   *  hand-built runtime need not set it; composeRuntime always fills it, and the edit load defaults a
   *  missing value to the US English dictionary.
   */
  spellcheckDictionary?: string;
  /**
   * The editor tidy (LLM copy-edit) settings, passed through from the site config. Optional on the
   *  runtime so a hand-built runtime need not set it; composeRuntime threads it from
   *  `siteConfig.tidy`. The tidy action reads `enabled` and `model` at call time, and builds its prompt
   *  from `conventions`. Absent (or `enabled` false) means tidy is off, and the action refuses with a
   *  fail(503) before any model call.
   */
  tidy?: import('../nav/site-config.js').TidyConfig;
  /**
   * The editor-owned tag vocabulary, validated and threaded from the site config's `vocabulary` key.
   *  Always present (empty when the config omits the key), so the taxonomy enforcement seam reads it
   *  the same deployed-snapshot way it reads {@link tidy}, with no per-request config read. Empty means
   *  the taxonomy field stays the open creatable multiselect: enforcement is opt-in.
   */
  vocabulary: import('../nav/site-config.js').VocabularyEntry[];
}
