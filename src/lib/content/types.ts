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
import type { DatePrefix } from './ids.js';
import type { ConceptSchema } from './schema.js';
import type { LinkResolve } from './links.js';
import type { VariantSpec } from '../media/transform-url.js';

/** Common to every frontmatter field: the frontmatter key, the form label, and whether it is required. */
interface FieldBase {
  /** Frontmatter key and form input name. */
  name: string;
  /** Form label. */
  label: string;
  /** A required field fails validation when empty (spec §7.4). */
  required?: boolean;
  /**
   * One author-facing sentence shown under the field in the editor, in plain end-user language.
   * Optional; render nothing when absent. Not a validation rule.
   */
  description?: string;
}

/** A single-line text input. */
export interface TextField extends FieldBase {
  type: 'text';
  /** Minimum character length of a non-empty value. */
  min?: number;
  /** Maximum character length. */
  max?: number;
  /** Exact required character length. */
  length?: number;
  /**
   * A regular-expression source string the value must match. Stored as a string so the field
   *  list stays plain serializable data; the validator compiles it.
   */
  pattern?: string;
}
/** A multi-line text input. */
export interface TextareaField extends FieldBase {
  type: 'textarea';
  /** Visible rows; the editor picks a default when omitted. */
  rows?: number;
  /** Minimum character length of a non-empty value. */
  min?: number;
  /** Maximum character length. */
  max?: number;
  /** Exact required character length. */
  length?: number;
  /** A regular-expression source string the value must match. */
  pattern?: string;
}
/** A `YYYY-MM-DD` date input. */
export interface DateField extends FieldBase {
  type: 'date';
  /** Earliest allowed date, as `YYYY-MM-DD`. */
  min?: string;
  /** Latest allowed date, as `YYYY-MM-DD`. */
  max?: string;
}
/** A checkbox; absent means false. */
export interface BooleanField extends FieldBase {
  type: 'boolean';
}
/** A closed-vocabulary tag set, rendered as checkboxes (ecnordic). */
export interface TagsField extends FieldBase {
  type: 'tags';
  /** The controlled vocabulary. */
  options: readonly string[];
}
/** Free-form tags, edited as one comma-separated input (907). */
export interface FreeTagsField extends FieldBase {
  type: 'freetags';
  placeholder?: string;
}
/**
 * A hero image set in frontmatter. The stored value is the nested object
 * `{ src: string; alt: string; caption?: string }`, where `src` is a 2b `media:` reference, `alt`
 * is the screen-reader description, and `caption` is an optional line the site template may show.
 * One image serves two jobs: the template's lead image and the social-card image. The field feeding
 * the social card is the `seo`-flagged one, defaulting to the field named `image`; a concept declares
 * at most one SEO image field.
 */
export interface ImageField extends FieldBase {
  type: 'image';
  /** Whether this field feeds the social-card image. The field named `image` defaults to true. */
  seo?: boolean;
}

/**
 * The discriminated union the per-concept frontmatter form is generated from. A scalar field type
 * is one variant here plus one decode arm in `frontmatterFromForm` and one in `validateFields`. The
 * structured `image` field additionally needs a read-back arm in `formValues` and a type-inference
 * arm in `schema.ts`, since its value is a nested object rather than a single string.
 */
export type FrontmatterField =
  | TextField
  | TextareaField
  | DateField
  | BooleanField
  | TagsField
  | FreeTagsField
  | ImageField;

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

/**
 * A validator's verdict. On success it carries the normalized frontmatter to commit; on
 * failure it carries field-keyed error messages (the empty key is a form-level error).
 * Invalid input bounces to the form and never reaches git (spec §7.4).
 */
export type ValidationResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> };

/**
 * Per-site configuration for one content concept (spec §8). One `schema`, built with
 * `defineFields`, is the single source of truth for the editor form, the validator, and the
 * inferred frontmatter type. Generic over the schema so a concept's concrete type survives for
 * typed reads. Concept-fixed behavior such as routability is not here; it lives in the engine's
 * routing table (`CONCEPT_ROUTING`).
 */
export interface ConceptConfig<S extends ConceptSchema = ConceptSchema> {
  /** Repo-relative content directory, e.g. "src/content/posts". */
  dir: string;
  /** Sidebar label; defaults from the concept id when omitted. */
  label?: string;
  /** The singular noun for the create affordances ("New post"); defaults to `label` when omitted. */
  singular?: string;
  /** The concept's schema: the form projection, the generated validator, and the inferred type. */
  schema: S;
  /**
   * Frontmatter keys to surface on each `ContentSummary.fields`, so a list card reads an authored
   *  field without a per-entry detail read. Each key should also be declared in `schema`.
   */
  summaryFields?: string[];
}

/**
 * A concept's URL policy, set per concept in the YAML site-config (not the adapter). `permalink` is
 * a `/`-prefixed pattern of literal segments and the tokens `:slug`, `:year`, `:month`, `:day`.
 * `datePrefix` is the filename date-prefix granularity for a dated concept. Both default in
 * `normalizeConcepts` when omitted.
 */
export interface ConceptUrlPolicy {
  permalink?: string;
  datePrefix?: DatePrefix;
}

/** The GitHub App backend a site reads from and commits to (spec §8). Plain data the GitHub engine (Plan 03) consumes. */
export interface BackendConfig {
  owner: string;
  repo: string;
  /** Commit target, e.g. "main". */
  branch: string;
  appId: string;
  installationId: string;
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

/** The single seam the engine consumes. A site implements this at `src/lib/cairn.config.ts`. */
export interface CairnAdapter {
  siteName: string;
  /**
   * Which content concepts this site enables. A future `fragments?` key attaches here with
   * no reshape of the contract (seam 1). A site never has two of the same concept.
   */
  content: {
    posts?: ConceptConfig;
    pages?: ConceptConfig;
  };
  backend: BackendConfig;
  sender: SenderConfig;
  /**
   * The site's one renderer: the editor preview and every public page call it (design decision 4).
   *  `resolve` rewrites cairn: links to live permalinks; the build passes a site-resolver-backed
   *  one, the preview a manifest one. The trailing `resolveMedia` is additive and optional: the build
   *  passes a site-resolver-backed media resolver, the preview a manifest-backed one.
   */
  render(
    md: string,
    opts?: {
      stagger?: boolean;
      resolve?: LinkResolve;
      resolveMedia?: import('../render/resolve-media.js').MediaResolve;
    },
  ): string | Promise<string>;
  /**
   * Repo-relative path to the committed content manifest. Defaults to src/content/.cairn/index.json
   *  in composeRuntime. It sits outside any concept directory, so content enumeration never globs it.
   */
  manifestPath?: string;
  /**
   * Repo-relative path to the committed media manifest. Defaults to src/content/.cairn/media.json,
   *  applied in composeRuntime. Sits outside any concept directory, like the content manifest.
   */
  mediaManifestPath?: string;
  /**
   * Repo-relative path to the committed personal dictionary file. Defaults to
   *  src/content/.cairn/dictionary.txt, applied in composeRuntime: the same `.cairn/` content root the
   *  manifests use, so the spec's `content/.cairn/dictionary.txt` resolves the same configurable way the
   *  manifest paths do. One word per line, sorted, comment lines allowed (see site-dictionary.ts).
   */
  dictionaryPath?: string;
  /** Directive component registry; the renderer and the future palette derive from it (seam 3). */
  registry?: ComponentRegistry;
  /** The site's glyph name to SVG path-data map, for the admin icon picker and the renderer. */
  icons?: IconSet;
  navMenu?: NavMenuConfig;
  /**
   * The live site's content styling for the preview frame. The admin's chrome isolation keeps
   *  the site's CSS out of the admin document, so the preview frame links these instead.
   */
  preview?: PreviewConfig;
  assets?: AssetConfig;
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
  fields: FrontmatterField[];
  /**
   * Frontmatter keys the index copies onto each summary's `fields` record. `normalizeConcepts`
   *  resolves it to `[]` when a concept omits `summaryFields`.
   */
  summaryFields: string[];
  validate(frontmatter: Record<string, unknown>, body: string): ValidationResult;
}

/**
 * A site-defined admin screen contributed by an extension (Mode 2). It gains a sidebar entry, the
 * `/admin` guard, and the session, and may commit through the same GitHub pipeline. The dispatch
 * route is built in Plan 09; the `load`/`actions`/`component` members are typed loosely here and
 * tightened when the machinery lands.
 */
export interface AdminPanel {
  /** Routes under `/admin/<id>`; also the sidebar key. */
  id: string;
  /** Sidebar label. */
  label: string;
  /** Owner-gated, like editor management. */
  owner?: boolean;
  /** Server load, behind the guard. Typed in Plan 09. */
  load?: (event: unknown) => unknown;
  /** Named form actions, which may use the commit pipeline. Typed in Plan 09. */
  actions?: Record<string, (event: unknown) => Promise<unknown>>;
  /** The panel UI, rendered inside the admin shell. Typed as a component in Plan 09. */
  component: unknown;
}

/**
 * A custom frontmatter field type contributed by an extension (Mode 2): a renderer plus a validator
 * dispatched alongside the built-in field union. The renderer and validator are typed in Plan 09
 * when the form dispatch becomes a registry; the `type` key reserves the discriminator now.
 */
export interface FieldTypeDef {
  /** The field-type discriminator, e.g. "color". */
  type: string;
}

/**
 * A future build-time extension (seam 2). It folds in the same way the adapter does and
 * contributes the same kinds of things. Reserved and unused in the rebuild; the shape is
 * fixed now so the extension contract is additive later.
 */
export interface CairnExtension {
  /** Additional concepts, merged after the adapter's. */
  content?: Record<string, ConceptConfig>;
  /** Site-defined admin panels (Mode 2). Carried onto the runtime now; dispatched in Plan 09. */
  adminPanels?: AdminPanel[];
  /** Custom field types (Mode 2). Carried onto the runtime now; dispatched in Plan 09. */
  fieldTypes?: FieldTypeDef[];
}

/**
 * The composed runtime the engine serves from (seam 2 output). The single aggregation point
 * (`composeRuntime`) folds the adapter and any extensions into this shape.
 */
export interface CairnRuntime {
  siteName: string;
  concepts: ConceptDescriptor[];
  backend: BackendConfig;
  sender: SenderConfig;
  /**
   * The site's one renderer: the editor preview and every public page call it (design decision 4).
   *  The trailing `resolveMedia` is additive and optional: the build passes a site-resolver-backed
   *  media resolver, the preview a manifest-backed one.
   */
  render(
    md: string,
    opts?: {
      stagger?: boolean;
      resolve?: LinkResolve;
      resolveMedia?: import('../render/resolve-media.js').MediaResolve;
    },
  ): string | Promise<string>;
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
  /** Admin panels contributed by extensions (Mode 2). Empty until Plan 09 wires the dispatch route. */
  adminPanels?: AdminPanel[];
  /** Field types contributed by extensions (Mode 2). Empty until Plan 09 wires the form dispatch. */
  fieldTypes?: FieldTypeDef[];
}
