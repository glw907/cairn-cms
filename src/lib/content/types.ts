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

/** Common to every frontmatter field: the frontmatter key, the form label, and whether it is required. */
interface FieldBase {
  /** Frontmatter key and form input name. */
  name: string;
  /** Form label. */
  label: string;
  /** A required field fails validation when empty (spec §7.4). */
  required?: boolean;
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
  /** A regular-expression source string the value must match. Stored as a string so the field
   *  list stays plain serializable data; the validator compiles it. */
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
 * The discriminated union the per-concept frontmatter form is generated from. Adding a
 * field type is one variant here plus one decode arm in `frontmatterFromForm` and one in
 * `validateFields`.
 */
export type FrontmatterField =
  | TextField
  | TextareaField
  | DateField
  | BooleanField
  | TagsField
  | FreeTagsField;

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
  /** The concept's schema: the form projection, the generated validator, and the inferred type. */
  schema: S;
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

/** Reserved asset slot (seam 4). Typed and unused in the rebuild; R7/R9 read it later with no contract change. */
export interface AssetConfig {
  /** Repo-relative asset roots, e.g. ["static/images"]. */
  roots: string[];
  /** Public URL base, e.g. "/images". */
  publicBase: string;
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
  /** The site's one renderer: the editor preview and every public page call it (design decision 4).
   *  `resolve` rewrites cairn: links to live permalinks; the build passes a site-index resolver, the
   *  preview a manifest one. */
  render(md: string, opts?: { stagger?: boolean; resolve?: LinkResolve }): string | Promise<string>;
  /** Repo-relative path to the committed content manifest. Defaults to src/content/.cairn/index.json
   *  in composeRuntime. It sits outside any concept directory, so content enumeration never globs it. */
  manifestPath?: string;
  /** Directive component registry; the renderer and the future palette derive from it (seam 3). */
  registry?: ComponentRegistry;
  /** The site's glyph name to SVG path-data map, for the admin icon picker and the renderer. */
  icons?: IconSet;
  navMenu?: NavMenuConfig;
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
  dir: string;
  routing: RoutingRule;
  /** The resolved permalink pattern, defaulted by `normalizeConcepts`. */
  permalink: string;
  /** Filename date-prefix granularity for a dated concept; resolved by `normalizeConcepts`. */
  datePrefix: DatePrefix;
  fields: FrontmatterField[];
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
  /** The site's one renderer: the editor preview and every public page call it (design decision 4). */
  render(md: string, opts?: { stagger?: boolean; resolve?: LinkResolve }): string | Promise<string>;
  manifestPath: string;
  registry?: ComponentRegistry;
  /** The site's glyph name to SVG path-data map, for the admin icon picker and the renderer. */
  icons?: IconSet;
  navMenu?: NavMenuConfig;
  assets?: AssetConfig;
  /** Admin panels contributed by extensions (Mode 2). Empty until Plan 09 wires the dispatch route. */
  adminPanels?: AdminPanel[];
  /** Field types contributed by extensions (Mode 2). Empty until Plan 09 wires the form dispatch. */
  fieldTypes?: FieldTypeDef[];
}
