// cairn-cms: the adapter contract a site implements, and the engine-internal descriptors
// the contract normalizes into.
//
// The adapter is the single seam the engine consumes (spec §8). A site supplies a
// `CairnAdapter` at `src/lib/cairn.config.ts` declaring its backend repo, the content
// concepts it enables, its magic-link sender, and a design-accurate `render`. The
// engine never hard-codes a concept, directory, or field; it reads them here. Field
// descriptors are plain data so a `load` function can hand them across the server-to-client
// boundary to the editor form.
import type { ComponentRegistry } from '../render/registry.js';
import type { IconSet } from '../render/glyph.js';
import type { IslandRegistry } from '../islands/types.js';
import type { BackendProvider } from '../github/backend.js';
import type { DatePrefix } from './ids.js';
import type { Fieldset } from './fieldset.js';
import type { FieldDescriptor } from './fields.js';
import type { LinkResolve } from './links.js';
import type { VariantSpec } from '../media/transform-url.js';

/**
 * The stored value of an `image` field: a `media:` reference, a screen-reader description, and an
 *  optional caption.
 */
export interface ImageValue {
  src: string;
  alt: string;
  caption?: string;
  /** An explicit decorative choice: an empty alt that is not debt. Omitted unless true. */
  decorative?: boolean;
}

/** One validation failure located by a path: a top-level key, then a row index and/or a leaf sub-key. */
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
 * right input. Invalid input bounces to the form and never reaches git (spec §7.4).
 */
export type ValidationResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errors: Record<string, string>; issues?: ValidationIssue[] };

/**
 * A field descriptor with its frontmatter key re-attached as `name`. This is the normalized form
 *  `ConceptDescriptor.fields` carries: `normalizeConcepts` derives it from a concept's `fieldset`
 *  record so every consumer (the editor form, the form decoder, the media extractor) iterates an
 *  array and reads `name` rather than the keyed record.
 */
export type NamedField = FieldDescriptor & { name: string };

/**
 * Per-site configuration for one content concept (spec §8). One `fields` fieldset, built with
 * `fieldset`, is the single source of truth for the editor form, the validator, and the
 * inferred frontmatter type. Generic over the fieldset so a concept's concrete type survives for
 * typed reads. A concept also declares its own routing and URL policy here (`routing`, `permalink`,
 * `datePrefix`), resolved by `normalizeConcepts`.
 */
export interface ConceptConfig<S extends Fieldset = Fieldset> {
  /** Repo-relative content directory, e.g. "src/content/posts". */
  dir: string;
  /** Sidebar label; defaults from the concept id when omitted. */
  label?: string;
  /** The singular noun for the create affordances ("New post"); defaults to `label` when omitted. */
  singular?: string;
  /** The concept's fieldset: the form projection, the generated validator, and the inferred type. */
  fields: S;
  /**
   * This concept's routing. A named shorthand (`'feed'` dated and in feeds, `'page'` a routable
   *  static page, `'embedded'` not routable) or an explicit rule. Omitted means `'page'`.
   */
  routing?: 'feed' | 'page' | 'embedded' | RoutingRule;
  /** The permalink pattern, root-relative, e.g. `/blog/:year/:slug`. Defaults by concept id. */
  permalink?: string;
  /** Date-prefix granularity for a dated concept's id-to-slug stripping. Defaults to `day`. */
  datePrefix?: DatePrefix;
  /**
   * Frontmatter keys to surface on each `ContentSummary.fields`, so a list card reads an authored
   *  field without a per-entry detail read. Each key should also be declared in `fields`.
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

/** Magic-link sender identity for Cloudflare Email Sending. */
export interface SenderConfig {
  from: string;
  replyTo?: string;
}

/** A git-committed YAML menu this site's nav editor manages (Plan 06). */
export interface NavMenuConfig {
  /** Repo-relative path to the site-config YAML, e.g. "src/lib/site.config.yaml". */
  configPath: string;
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
 * unstyled markup. The frame's srcdoc pins a white body background as a deliberately overridable
 * default, so a site whose ground is not white should state its body background in its own
 * stylesheet.
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
  byConcept?: Record<string, { bodyClass?: string; containerClass?: string }>;
}

/**
 * The flat preview shape `editLoad` ships to the edit page: the top-level `PreviewConfig`
 *  values with the entry's concept override applied, and no `byConcept` map.
 */
export type ResolvedPreview = Omit<PreviewConfig, 'byConcept'>;

/**
 * A site's media configuration (seam 4). A site sets this to turn on R2-backed media: uploads,
 *  content-addressed storage, and Cloudflare Images variants. Omitting it leaves media off. The
 *  engine normalizes this into a `ResolvedAssetConfig` and merges the named variants over the
 *  built-in thumb, inline, card, and hero presets.
 */
export interface AssetConfig {
  /** The R2 bucket binding name on the Worker, e.g. "MEDIA_BUCKET". Required when a site declares media. */
  bucketBinding: string;
  /** The delivery base path. Defaults to "/media". */
  publicBase?: string;
  /** Whether the public URL carries the slug ("slug") or stays opaque ("opaque"). Defaults to "slug". */
  urlForm?: 'slug' | 'opaque';
  /** The maximum accepted upload size in bytes. Defaults to 25 MB. */
  maxUploadBytes?: number;
  /** The accepted upload MIME types. Defaults to the common web image types. */
  allowedTypes?: string[];
  /** Named transform presets, merged over the built-in thumb/inline/card/hero presets. */
  variants?: Record<string, VariantSpec>;
  /**
   * Whether Cloudflare Image Transformations are enabled for the zone (default false). The feature
   *  is a per-zone setting that the dashboard or API turns on; it cannot be flipped from a Worker. With
   *  it off, the media resolver serves the bare full-size delivery path and ignores any preset, so
   *  thumbnails stay correct (full-size-but-correct) rather than pointing at a dead /cdn-cgi/image URL.
   */
  transformations?: boolean;
}

/**
 * The site's one renderer (design decision 4): the editor preview and every public page call it.
 *  Entry-aware so a custom renderer can vary output by concept or frontmatter; the default reads only
 *  `body` plus the resolvers. `resolve` rewrites cairn: links to live permalinks (the build passes a
 *  site-resolver-backed resolver, the preview a manifest-backed one); `resolveMedia` resolves media:
 *  references the same way. `concept` and `frontmatter` carry the entry's context for an entry render
 *  and are absent for the standalone component-insert preview.
 */
export type SiteRender = (input: {
  body: string;
  concept?: string;
  frontmatter?: Record<string, unknown>;
  resolve?: LinkResolve;
  resolveMedia?: import('../render/resolve-media.js').MediaResolve;
}) => Promise<string>;

/**
 * The single seam the engine consumes. A site implements this at `src/lib/cairn.config.ts`, in six
 * subsystem groups (spec §8): the content concepts, the commit backend, the magic-link sender, the
 * render subsystem, the optional media stack, and the admin-experience knobs. The internal manifest
 * and dictionary paths are not here; `composeRuntime` defaults them by convention.
 */
export interface CairnAdapter {
  /** The site's concepts, keyed by id. Posts and pages are the documented defaults; a site may add more. */
  content: Record<string, ConceptConfig>;
  /** The commit backend provider, from `githubApp({ ... })` (the GitHub App today). */
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
     * The live Svelte components for hydrated directives, keyed by directive name (phase 4b islands).
     *  Every component whose {@link ComponentDef.hydrate} is set needs an entry here, and every entry
     *  needs a matching `hydrate` component; `defineAdapter` checks both. Absent leaves the site
     *  static, and the island client runtime is never imported.
     */
    islands?: IslandRegistry;
  };
  /** R2-backed media (seam 4): the bucket binding and image variants. Absent leaves media off. */
  media?: AssetConfig;
  /** Admin-experience knobs: the preview frame, the nav menu, and the editor support contact. */
  editor?: {
    /**
     * The live site's content styling for the preview frame. The admin's chrome isolation keeps
     *  the site's CSS out of the admin document, so the preview frame links these instead.
     */
    preview?: PreviewConfig;
    /** Which git-committed YAML menu the nav editor manages. */
    nav?: NavMenuConfig;
    /**
     * Optional contact a stuck editor is pointed to from the in-admin help (an email address, a URL,
     *  or a name and instruction). The help renders the hand-off only when this is set. Plain string,
     *  passed through verbatim.
     */
    supportContact?: string;
  };
}

/**
 * Concept-fixed routing for a normalized concept (spec §7.2). Posts are dated feed entries;
 * pages are plain navigable structure. Not in adapter config.
 */
export interface RoutingRule {
  /** Routable as a standalone URL. A future Fragments concept is embedded, not routable. */
  routable: boolean;
  /** Carries a date (posts). */
  dated: boolean;
  /** Appears in feeds and the sitemap (posts). */
  inFeeds: boolean;
}

/**
 * The engine-internal, uniform view of one concept after normalization (seam 1). The admin
 * nav, the list views, and the editor all read this, never the raw config.
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
 */
export interface CairnRuntime {
  siteName: string;
  concepts: ConceptDescriptor[];
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
   *  addDictionaryWord action reads, merges, and commits it. Optional on the runtime so a hand-built
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
}
