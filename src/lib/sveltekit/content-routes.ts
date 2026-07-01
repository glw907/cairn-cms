// The admin content routes: the load and action functions a site's /admin/** shims call.
// A factory closes over the composed runtime and the GitHub token mint, so the read and
// commit paths are unit-testable against a fetch double with an injected token, mirroring the
// email `send` injection in auth-routes. A shim stays one line: `export const load = routes.editLoad`.
import { redirect, error, fail } from '@sveltejs/kit';
import { findConcept } from '../content/concepts.js';
import { extractCairnLinks, formatCairnToken, rewriteCairnLink } from '../content/links.js';
import { extractReferenceEdges, rewriteFrontmatterReference } from '../content/references.js';
import { buildReferenceIndex } from '../content/reference-index.js';
import { frontmatterFromForm, formValues, parseMarkdown, dateInputValue, serializeMarkdown } from '../content/frontmatter.js';
import { initialValues } from '../content/fieldset.js';
import { resolveTaxonomyField, coerceTags } from '../content/taxonomy.js';
import { resolveAllowed, closeTaxonomyField, enforceTaxonomy, unlistedTags } from '../content/taxonomy-enforce.js';
import { deriveExcerpt } from '../content/excerpt.js';
import { asString, entryIdentity } from '../content/identity.js';
import { buildAddressIndex, mainAddressIndex, addressCollision, type AdvisoryNotice, type AddressEntry } from '../content/advisories.js';
import { isValidId, slugify, filenameFromId, composeDatedId, slugFromId, renameId } from '../content/ids.js';
import type { BackendEnv } from '../github/credentials.js';
import type { Backend } from '../github/backend.js';
import type { FileChange } from '../github/repo.js';
import { PENDING_PREFIX, pendingBranch, parsePendingBranch } from '../content/pending.js';
import { emptyManifest, manifestEntryFromFile, parseManifest, serializeManifest, upsertEntry, removeEntry, inboundLinks, inboundReferences, type Manifest, type LinkTarget, type InboundLink } from '../content/manifest.js';
import { deriveGettingStarted, type GettingStarted } from '../content/getting-started.js';
import { markdownReference, type MarkdownReferenceRow } from '../components/markdown-reference.js';
import { isConflict } from '../github/types.js';
import { log } from '../log/index.js';
import { dictionaryFileForDialect, DEFAULT_TIDY_MODEL, resolveTidyConventions, parseSiteConfig, setTidy, validateTidyConventions, TidyConventionsError, extractVocabulary, setVocabulary, validateVocabulary } from '../nav/site-config.js';
import type { TidyConventions, VocabularyEntry } from '../nav/site-config.js';
import { buildTagUsageIndex } from '../content/tag-usage-index.js';
import { buildTidyPrompt } from './tidy-prompt.js';
// Server-only: the Anthropic SDK ships the API-key path and never reaches a browser bundle. It is
// imported only here (a Worker module no component imports statically), and the server-only-deps test
// guards that boundary. The default export is the Anthropic client class; the structural TidyClient
// type below keeps the action's surface small and the test seam injectable, so the SDK's deep types
// never leak into a public signature.
import Anthropic from '@anthropic-ai/sdk';
import { parseDictionary, mergeDictionaryWords, serializeDictionary, isValidDictionaryWord } from '../content/site-dictionary.js';
import { issueCsrfToken, validateCsrfHeader } from './csrf.js';
import { requireSession, isPublicAdminPath } from './guard.js';
import { normalizeAdminNav, type ResolvedNavEntry } from './admin-nav.js';
import { sniffMediaType, isDeniedUpload, extForMediaType } from '../media/sniff.js';
import { hashBytes, shortHash, slugifyFilename, r2Key } from '../media/naming.js';
import { mediaToken } from '../media/reference.js';
import { r2Store } from '../media/store.js';
import { parseMediaEntries, parseMediaManifest, upsertMediaEntry, removeMediaEntry, serializeMediaManifest } from '../media/manifest.js';
import type { MediaEntry } from '../media/manifest.js';
import { mediaLibraryEntry } from '../media/library-entry.js';
import type { MediaLibrary, MediaLibraryEntry } from '../media/library-entry.js';
import { buildUsageIndex } from '../media/usage.js';
import type { UsageEntry } from '../media/usage.js';
import { runReconcile, MEDIA_KEY_RE, type ReconcileBucket } from '../media/reconcile.js';
import { buildOrphanScan, type OrphanScan } from '../media/orphan-scan.js';
import { repointMediaRef, fillAltForHash } from '../content/media-rewrite.js';
import type { RepointPlacement, AltPlacement } from '../content/media-rewrite.js';
import { planMediaRewrite } from '../media/rewrite-plan.js';
import type { BranchRef } from '../media/rewrite-plan.js';
import { planBulkDelete } from '../media/bulk-delete-plan.js';
import type { BulkDeleteSkip } from '../media/bulk-delete-plan.js';
import type { CookieJar, EventBase } from './types.js';
import type { CairnRuntime, ConceptDescriptor, NamedField, PreviewConfig, ResolvedPreview } from '../content/types.js';
import type { Editor, Role } from '../auth/types.js';
// R2Bucket is named only inside uploadAction to cast the raw binding for r2Store. It is a type-only
// import that never appears in an exported signature, so it does not reach the public `.d.ts`.
import type { R2Bucket } from '@cloudflare/workers-types';

// The advisory notice types are defined alongside the cross-branch address index in the content
// layer; re-export them here so EditData's advisories and the /sveltekit subpath carry one shape.
export type { AdvisoryNotice, AdvisoryAction } from '../content/advisories.js';

/** A sidebar concept entry: just enough to render the nav without shipping validators to the client. */
export interface NavConcept {
  id: string;
  label: string;
}

/**
 * The shared admin shell's data, produced by `shellPayload` and consumed by the CairnAdminShell
 *  component through `/admin/+layout.svelte`. A discriminated union: a public (login/auth) path
 *  carries only the site name and renders bare; an authed path carries the full admin payload, the
 *  site identity, the signed-in editor, the nav, the active path, the CSRF token, and the streamed
 *  pending entries, adds the developer's custom-nav entries, and streams the pending-publish set as
 *  a deferred promise so a custom route and the login page never block on a GitHub round-trip up
 *  front.
 */
export type AdminShellData =
  | { public: true; siteName: string }
  | {
      public: false;
      siteName: string;
      user: { displayName: string; email: string; role: Role };
      concepts: NavConcept[];
      /** The developer's custom sidebar entries, validated at construction and role-filtered here. */
      customNav: ResolvedNavEntry[];
      pathname: string;
      canManageEditors: boolean;
      /** The nav menu's label when the site configures one; gates the Navigation nav entry. Null otherwise. */
      navLabel: string | null;
      /** The admin theme resolved for SSR: the persisted cookie choice, or the light default. */
      theme: 'cairn-admin' | 'cairn-admin-dark';
      /** The nav group labels the user has collapsed, from the persisted cookie. Empty when none. */
      collapsedNav: string[];
      /** The session's CSRF double-submit token, handed to descendant forms through context. */
      csrf: string;
      /**
       * Every entry with unpublished edits (a `cairn/` ref), streamed so the shell never blocks on
       *  GitHub. Resolves to null when GitHub is unreachable, so the topbar hides the publish-all
       *  action rather than lying.
       */
      pendingEntries: Promise<{ concept: string; id: string }[] | null>;
    };

/** One row in a concept's list view. */
export interface EntrySummary {
  id: string;
  title: string;
  date: string | null;
  draft: boolean;
  /** Publish state derived from the ref set: live as-is, live with pending edits, or branch-only. */
  status: 'published' | 'edited' | 'new';
  /**
   * The row's one-line summary: the manifest's indexed excerpt for a published row, the branch
   *  frontmatter/body excerpt for a pending one, and null when neither yields text.
   */
  summary: string | null;
}

/** The concept list view's data. */
export interface ListData {
  conceptId: string;
  label: string;
  /**
   * The singular noun for the create affordances ("New post"); from the descriptor, which defaults
   *  it to `label`.
   */
  singular: string;
  /** Posts carry a date in the new-entry form; pages do not (concept routing, spec §7.2). */
  dated: boolean;
  entries: EntrySummary[];
  /** A listing failure degrades to an inline message rather than a thrown 500. */
  error: string | null;
  /** A create-form bounce error read from `?error`. */
  formError: string | null;
  /** The entry count from a publish-all redirect (`?publishedAll=`), for the list page's flash. */
  publishedAll: number | null;
}

/** The editor's data. `frontmatter` holds form-ready values (dates already `YYYY-MM-DD`). */
export interface EditData {
  conceptId: string;
  id: string;
  label: string;
  fields: NamedField[];
  frontmatter: Record<string, unknown>;
  body: string;
  title: string;
  isNew: boolean;
  saved: boolean;
  /** True after a successful rename redirect (`?renamed=1`), to confirm the new URL to the author. */
  renamed: boolean;
  error: string | null;
  /** The current URL slug (the date-stripped id for a dated concept), for the rename dialog prefill. */
  slug: string;
  /** The site's link targets, for the preview resolver and the link picker; from the committed manifest. */
  linkTargets: LinkTarget[];
  /**
   * The minimal media-resolver input the edit page builds its preview `resolveMedia` from, keyed by
   *  the 16-hex content hash and parallel to `linkTargets`. Empty when media is off or the read fails.
   */
  mediaTargets: Record<string, { slug: string; ext: string; contentType: string }>;
  /**
   * The picker's human layer for each stored asset, keyed by the 16-hex content hash and projected
   *  from the same committed media manifest read that populates `mediaTargets`. The `hash` field
   *  duplicates the key, so the picker can iterate `Object.values`. Empty when media is off or the
   *  read fails (the same degradation path as `mediaTargets`).
   */
  mediaLibrary: MediaLibrary;
  /** The entries that link to this one, for the delete guard. Empty when nothing links here. */
  inboundLinks: InboundLink[];
  /** True when the entry has a pending branch, so the body above came from that branch. */
  pending: boolean;
  /** True when the entry file exists on the default branch (the live site shows it). */
  published: boolean;
  /** True after a publish redirect (`?published=1`), for the confirmation strip. */
  publishedFlash: boolean;
  /** True after a discard redirect (`?discarded=1`), for the confirmation strip. */
  discardedFlash: boolean;
  /**
   * The adapter's preview knob resolved for this entry's concept (its `byConcept` override,
   *  when one exists, applied over the top-level values); null when the site sets none, which
   *  leaves the frame rendering unstyled markup behind a hint.
   */
  preview: ResolvedPreview | null;
  /**
   * The spellcheck dictionary file for the site's configured dialect (default US English), resolved
   *  once at compose. The editor resolves it to a real asset URL on the main thread and hands that URL
   *  to the spellcheck Worker's `init`, the same way `mediaLibrary` is threaded in. Just the filename,
   *  e.g. "dictionary-en-us.txt".
   */
  spellcheckDictionary: string;
  /**
   * The committed personal-dictionary words for the site (spec 1.6): the durable, shared, reviewable
   *  layer the editor seeds the spellcheck Worker's personal set from, the way `mediaLibrary` is handed
   *  in. Read from the git-committed `dictionary.txt` at editor load; empty when the file is absent or
   *  unreadable (the editor degrades to dialect-only). The dialect dictionary and the session ignore
   *  list are the other two layers; only this one is committed.
   */
  siteDictionary: string[];
  /**
   * The editor-tier tidy facts the review surface needs (spec 2.5): whether tidy is enabled, the model
   *  that runs (for the head pill), and the RESOLVED conventions (the only data source for a
   *  normalization's because-line and the local category inference). The API key never appears here, it
   *  is a Worker secret. `enabled` false hides the Tidy control.
   */
  tidy: { enabled: boolean; model: string; conventions: TidyConventions };
  /** Non-blocking editor advisories built server-side; today the cross-branch address collision. */
  advisories: AdvisoryNotice[];
  /**
   * The entry's prior tags that are not in the configured vocabulary, for the closed taxonomy
   *  picker's "not in your tag list" flag. Empty when the site configures no vocabulary, when the
   *  concept has no taxonomy field, or when every prior tag is in the vocabulary (the opt-in
   *  fallback). The picker keeps each orphan checked and removable; an unchecked save drops it.
   */
  orphanTags: string[];
}

/**
 * One asset's where-used overlay, kept separate from MediaLibraryEntry so the picker's shared
 *  projection stays decoupled from the Library-only usage facts.
 */
export interface MediaUsageInfo {
  /** Distinct content entries that reference the asset (count by distinct concept+id). */
  count: number;
  /** Every where-used row (published and edit-branch origins), for the detail's grouped list. */
  entries: UsageEntry[];
}

/**
 * The Media Library screen's data: the unioned assets, the per-hash usage overlay, and the
 *  degraded-load error. The usage overlay is keyed by content hash; an asset with no references
 *  simply has no key, which the screen renders as "no references found".
 */
export interface MediaLibraryData {
  assets: MediaLibraryEntry[];
  /** Per-hash usage overlay, kept separate from MediaLibraryEntry so the popover stays decoupled. */
  usage: Record<string, MediaUsageInfo>;
  /**
   * The degraded-load error: a failed token mint or media read. This slot is the failure of THIS
   *  load, distinct from a prior action's conflict error (see `flashError`), so a read failure and a
   *  redirected commit conflict never overwrite each other.
   */
  error: string | null;
  /**
   * The success flash a redirected action carries: `deleted` from `?deleted=1`, `updated` from
   *  `?updated=1`, `replaced` from `?replaced=1`, `altPropagated` from `?altPropagated=1`,
   *  `bulkDeleted` from `?bulkDeleted=1`, `orphansPurged` from `?orphansPurged=1`, `uploaded` from
   *  `?uploaded=1`, null otherwise. The component renders a polite success strip for each.
   */
  flash: 'deleted' | 'updated' | 'replaced' | 'altPropagated' | 'bulkDeleted' | 'orphansPurged' | 'uploaded' | null;
  /**
   * A redirected action's conflict error read from `?error=` (a commit-conflict bounce). Kept in
   *  its own slot rather than the degraded-load `error` above, so the two never collide.
   */
  flashError: string | null;
}

/**
 * The two-tier tidy settings load (spec 2.8, Task 15). The developer tier is read-only: `enabled`,
 *  `keyConfigured`, and `model`/`modelLabel` are deploy-time facts the editor sees but cannot change.
 *  The editor tier is the resolved `conventions` block, written back through the save. The visibility
 *  gate is truthful: `enabled` is true only when `tidy.enabled` is set AND the API key is present, so
 *  the screen renders the convention list only then and the honest gate note otherwise. The key is a
 *  Worker secret, so `keyConfigured` is the presence of `ANTHROPIC_API_KEY` in the load's env, never
 *  the key itself; nothing here returns or logs the secret.
 */
export interface SettingsData {
  /**
   * The truthful gate: tidy is enabled AND the API key is present. The screen renders the editor
   *  tier only when this is true, and the honest gate note (a labelled region, no disabled controls)
   *  otherwise.
   */
  enabled: boolean;
  /**
   * Whether `tidy.enabled` is set in the site config, independent of the key. The gate note's
   *  checklist reads this to show which deploy-time step is still open.
   */
  tidyEnabled: boolean;
  /** Whether the API key secret is present in the Worker env. A presence flag, never the key. */
  keyConfigured: boolean;
  /** The model id (a developer-tier fact, read-only on the screen). */
  model: string;
  /**
   * A plain-language label for the model id ("Claude Sonnet"), so the read-only fact is not a bare
   *  jargon token. Falls back to the raw id for an unknown model.
   */
  modelLabel: string;
  /**
   * The resolved editor-tier conventions: every field concrete, the screen's initial control state.
   *  Present only when the gate is open; the gate state needs no conventions.
   */
  conventions: TidyConventions;
  /** The success flash a redirected save carries (`?saved=1`). */
  saved: boolean;
  /** A redirected save's validation or conflict error read from `?error=`. */
  error: string | null;
}

/**
 * A refused settings save: a conflict bounce or a malformed conventions payload. Just the one-line
 *  summary; the save commits nothing on a refusal.
 */
export interface SettingsSaveFailure {
  error: string;
}

/**
 * The vocabulary admin screen's data: the committed tag vocabulary, a per-value cross-branch usage
 *  count, and the in-use-but-unlisted seed set. The usage overlay is best-effort, so it degrades to
 *  an empty `usage`/`unlisted` while the committed `vocabulary` stays visible when a read fails.
 */
export interface VocabularyLoadData {
  /** The committed `{ value, label }` entries, in config order. */
  vocabulary: VocabularyEntry[];
  /** Each vocabulary value to its cross-branch in-use count (main plus open cairn/* branches). */
  usage: Record<string, number>;
  /** Tags in use but absent from the vocabulary, with their count, sorted: the seed candidates. */
  unlisted: { value: string; count: number }[];
}

/**
 * The Help home's data: the derived getting-started progress, the full markdown reference (the
 *  component curates by group), and the optional support hand-off (rendered only when set).
 */
export interface HelpData {
  gettingStarted: GettingStarted;
  reference: MarkdownReferenceRow[];
  supportContact?: string;
}

/** The structural event the content routes read; a real SvelteKit RequestEvent satisfies it. */
export interface ContentEvent extends EventBase<BackendEnv> {
  params: Record<string, string>;
  /**
   * SvelteKit's cookie jar. The layout load reads the persisted admin theme and issues the CSRF
   *  token. Optional for non-route callers.
   */
  cookies?: CookieJar;
}

/** Injectable dependencies; tests stub the token mint to avoid signing a real key. */
/**
 * The minimal Anthropic client surface the tidy action uses, typed structurally so the SDK's deep
 *  generics never reach a public signature and so the integration test can inject a fake whose
 *  `messages.create` it stubs. The real factory builds `new Anthropic({ apiKey })`, which satisfies
 *  this shape. The success path reads only the text blocks, the model, the stop reason, and the usage
 *  counts.
 */
export interface TidyClient {
  messages: {
    create(
      body: {
        model: string;
        max_tokens: number;
        system: string;
        messages: { role: 'user'; content: string }[];
      },
      // The SDK signature is create(body, options). The abort signal belongs in the second argument
      // (RequestOptions), not the body, so the request actually cancels when the deadline fires.
      options?: { signal?: AbortSignal },
    ): Promise<{
      content: { type: string; text?: string }[];
      model: string;
      stop_reason: string | null;
      usage: { input_tokens: number; output_tokens: number };
    }>;
  };
}

export interface ContentRoutesDeps {
  /**
   * Override the resolved content backend. A test injects a live `Backend` (a `makeGithubBackend`
   *  over a fetch double, or an in-memory fake) so the read and commit paths run with no real token
   *  mint. When set it replaces the per-handler `locals.backend ?? runtime.backend.connect(env)`
   *  resolve; a production caller leaves it unset and the dev double rides `event.locals.backend`.
   */
  backend?: Backend;
  /**
   * Build the Anthropic client for the tidy action from the resolved API key. Defaults to the real
   *  SDK client. Injected in tests so `messages.create` is stubbed and no network call (or real key)
   *  is ever needed. The factory runs only after the key is read from the env, so a disabled or
   *  unconfigured site never constructs a client.
   */
  anthropic?: (opts: { apiKey: string }) => TidyClient;
  /**
   * The tidy action's own request deadline in milliseconds, set shorter than the platform limit so a
   *  slow model call becomes a clean retryable fail(502) rather than a platform timeout. Defaults to
   *  {@link DEFAULT_TIDY_TIMEOUT_MS}. Overridable in tests to assert the deadline path without waiting.
   */
  tidyTimeoutMs?: number;
}

/**
 * The successful tidy outcome (spec 2.1): the corrected markdown, the model that produced it, and the
 *  token usage. The diff is computed on the client (Task 12), so the server returns the plain text and
 *  commits nothing. Admin-internal: consumed by the editor's review surface, not on the package's
 *  sveltekit subpath, so it carries no reference page.
 */
export interface TidyResult {
  corrected: string;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

/**
 * A refused tidy: `fail(403)` on a failed CSRF check, `fail(503)` when tidy is disabled or the API
 *  key is missing, `fail(413)` for an over-long body, `fail(502)` for a deadline overrun, abort, or
 *  model error (all retryable), `fail(422)` for a model refusal, `fail(400)` for a malformed body. Just
 *  the one-line summary; the action commits nothing, so a refusal can never corrupt the entry.
 */
export interface TidyFailure {
  error: string;
}

/**
 * The Worker-side request deadline for the tidy model call: 30 seconds. A tidy call to Sonnet on a
 *  full entry can run many seconds, so the action bounds it with an AbortSignal and maps the overrun to
 *  a retryable fail(502). This sits well under Cloudflare's per-request wall-clock ceiling (a Worker
 *  invocation can run far longer, but a single subrequest left open near that ceiling would surface as a
 *  platform timeout the action could not shape into a clean retry). 30s comfortably covers a proofread
 *  of the bounded input (see MAX_TIDY_CHARS) while leaving headroom under the platform limit.
 */
const DEFAULT_TIDY_TIMEOUT_MS = 30_000;

/**
 * The fallback site-config path when no nav menu names one: the convention every scaffolded site
 *  uses. The settings save edits the same committed YAML the nav editor does, so it resolves the path
 *  from the configured nav menu first and falls back to this default.
 */
const DEFAULT_SITE_CONFIG_PATH = 'src/lib/site.config.yaml';

/**
 * Plain-language labels for the known tidy models, so the read-only model fact reads as a name rather
 *  than a bare id. An unknown id falls back to itself.
 */
const TIDY_MODEL_LABELS: Record<string, string> = {
  'claude-sonnet-4-6': 'Claude Sonnet',
  'claude-haiku-4-5': 'Claude Haiku',
};

/** The display label for a tidy model id, falling back to the raw id for an unknown model. */
function tidyModelLabel(model: string): string {
  return TIDY_MODEL_LABELS[model] ?? model;
}

/**
 * The input cap for a single tidy request: 24000 characters (~6k input tokens). A proofread runs at
 *  roughly input length, so this stays comfortably inside the 30s deadline; a longer entry refuses with
 *  fail(413) and the author tidies a selection instead. The cap is enforced BEFORE the model call, so an
 *  over-long body never spends a token or risks the deadline.
 */
const MAX_TIDY_CHARS = 24_000;

/** A blocked save or publish: `fail(400)` when the body links to a target absent from main. */
export interface SaveFailure {
  /** The one-line human summary every content action failure carries. */
  error: string;
  /** The cairn tokens that resolve to no entry, for the editor's fix-it banner. */
  brokenLinks: string[];
  /** The author's edited markdown, so the editor reseeds with the unsaved work. */
  body: string;
}

/** A refused delete: `fail(409)` while other entries still link to this one. */
export interface DeleteRefusal {
  /** The one-line human summary every content action failure carries. */
  error: string;
  /** The entries whose bodies link to the refused one, for the blockers list. */
  inboundLinks: InboundLink[];
  /** The refused entry's id, so a list view marks the right row. */
  id: string;
}

/** A refused rename: `fail(400)` on a bad slug, `fail(409)` on a collision or pending edits. */
export interface RenameFailure {
  /** The one-line human summary every content action failure carries. */
  error: string;
}

/**
 * A refused media delete: `fail(404)` for an asset not committed on the default branch, or
 *  `fail(409)` when a fresh usage read finds the asset still in use and the typed-slug override
 *  was not given. `fail(503)` covers media-off or a missing bucket binding.
 */
export interface MediaDeleteRefusal {
  /** The one-line human summary every action failure carries. */
  error: string;
  /** The refused asset's content hash, so the dialog marks the right asset. */
  hash: string;
  /** The where-used rows (published first, then by branch) the in-use face lists; empty otherwise. */
  usage: UsageEntry[];
  /** The distinct-entry count behind the refusal; zero when the asset is uncommitted. */
  foundIn: number;
}

/**
 * A refused media metadata edit: `fail(404)` for an asset not committed on the default branch, or
 *  `fail(400)` for an invalid slug.
 */
export interface MediaUpdateFailure {
  /** The one-line human summary every action failure carries. */
  error: string;
}

/**
 * A refused media replace: `fail(409)` when a fresh usage read finds the asset still in use and the
 *  typed-slug override was not given, or `fail(503)` when usage cannot be verified (fail closed) or the
 *  bucket is unbound. Mirrors MediaDeleteRefusal: the asset hash, the where-used rows, and the count.
 */
export interface MediaReplaceFailure {
  error: string;
  hash: string;
  usage: UsageEntry[];
  foundIn: number;
}

/**
 * A refused media alt-propagation: `fail(503)` when usage cannot be verified across main and every
 *  open branch (fail closed), or the bucket is unbound. Just the one-line summary; alt fill has no
 *  typed-slug gate.
 */
export interface MediaAltPropagateFailure {
  error: string;
}

/**
 * The personal-dictionary add outcome (spec 1.6): the merged, canonical sorted word list after the
 *  add landed. The client reconciles its pending-additions set against this (a word now in the list is
 *  committed and dropped from pending). Admin-internal: exported for the editor host's reconcile, not
 *  on the package's sveltekit subpath, so it carries no reference page.
 */
export interface DictionaryAddResult {
  words: string[];
}

/**
 * A refused personal-dictionary add: `fail(403)` on a failed CSRF check, `fail(400)` on a body that
 *  carries no valid word. The client keeps its pending additions for the session and re-attempts on
 *  the next save, so the word is never silently dropped. Just the one-line summary.
 */
export interface DictionaryAddFailure {
  error: string;
}

/**
 * A refused media bulk delete or orphan purge: `fail(503)` for the fail-closed strict-usage refusal
 *  (the whole batch refuses) or media-off / a missing bucket binding. The per-item outcomes ride the
 *  returned summary, not a fail.
 */
export interface MediaBulkFailure {
  error: string;
}

/**
 * The bulk-delete outcome the component renders: the deleted hashes, the skipped rows from the
 *  partition (with their reason and where-used), and any per-object R2 delete failure. Admin-internal,
 *  not on the package subpath, so no reference page.
 */
export interface MediaBulkDeleteResult {
  deleted: string[];
  skipped: BulkDeleteSkip[];
  failed: { hash: string; error: string }[];
}

/**
 * The orphan-purge outcome: the purged R2 keys, the keys skipped because their hash was claimed by a
 *  manifest row since the scan, and any per-object delete failure. Admin-internal, no reference page.
 */
export interface MediaOrphanPurgeResult {
  purged: string[];
  skippedClaimed: string[];
  failed: { key: string; error: string }[];
}

/**
 * One entry the replace preview will rewrite, enriched with its display title and permalink from the
 *  content manifest (the planner's PlannedEntry carries neither). The screen lists these as the
 *  confirm dialog's where-touched preview, and the apply re-derives its own plan rather than trusting
 *  this. Admin-internal: exported from content-routes for the bundled Media Library component, not
 *  added to the package's sveltekit subpath, so it carries no reference page.
 */
export interface MediaReplacePreviewEntry {
  /** The concept id, e.g. "posts". */
  concept: string;
  /** The entry id (its filename stem). */
  id: string;
  /** The entry's display title, from the content manifest. */
  title: string;
  /** The entry's public permalink, from the content manifest. */
  permalink?: string;
  /** The per-reference diff for this entry: one placement per repointed `media:` token. */
  placements: RepointPlacement[];
}

/**
 * The replace preview plan: the affected main entries (enriched), the distinct affected count, and
 *  the report-only cross-branch delta (open cairn/* branches that reference the same bytes; an apply
 *  rewrites main only). Display-only: the apply re-derives a fresh plan and never trusts this.
 */
export interface MediaReplacePreviewPlan {
  affectedCount: number;
  entries: MediaReplacePreviewEntry[];
  branchDelta: BranchRef[];
}

/**
 * One entry the alt-propagation preview reports, enriched with its display title and permalink from
 *  the content manifest. Its placements carry every reference of the asset on this entry, each tagged
 *  with the bucket it falls in (a will-fill, a customized alt left as-is, or a decorative hero), so
 *  the screen can show what would change. Admin-internal: exported from content-routes for the bundled
 *  Media Library component, not added to the package's sveltekit subpath, so it carries no reference
 *  page.
 */
export interface MediaAltPreviewEntry {
  /** The concept id, e.g. "posts". */
  concept: string;
  /** The entry id (its filename stem). */
  id: string;
  /** The entry's display title, from the content manifest. */
  title: string;
  /** The entry's public permalink, from the content manifest. */
  permalink?: string;
  /** The per-reference diff for this entry: one placement per reference of the asset. */
  placements: AltPlacement[];
}

/**
 * The alt-propagation preview plan: every entry that references the asset (enriched), the report-only
 *  cross-branch delta, and the bucket counts aggregated across every placement. Display-only: the
 *  apply re-derives a fresh plan and never trusts this. The preview reports an entry even when its
 *  only placements are reported-but-unchanged (a kept custom alt, a decorative hero), so the screen
 *  can show every bucket; the apply commits only the entries it actually changes.
 */
export interface MediaAltPreviewPlan {
  entries: MediaAltPreviewEntry[];
  branchDelta: BranchRef[];
  /** The placement counts by bucket, summed across all entries. */
  counts: { willFill: number; customized: number; decorativeSkipped: number };
}

/**
 * What a route's single `form` export presents to a view component: whichever content action
 *  last failed, merged with every field optional. `error` is always set on a failure; the richer
 *  keys identify which guard refused. The media refusals ride here too, so the Media Library's one
 *  `form` prop carries a `?/mediaDelete`, `?/mediaUpdate`, `?/mediaReplace`, or `?/mediaAltPropagate`
 *  refusal without a second type.
 */
export type ContentFormFailure = Partial<
  SaveFailure & DeleteRefusal & RenameFailure & MediaDeleteRefusal & MediaUpdateFailure & MediaReplaceFailure & MediaAltPropagateFailure & MediaBulkFailure & TidyFailure
>;

/**
 * The successful upload's response (`uploadAction`). The server-owned `record` rides the editor's
 *  optimistic client state and commits with the entry at Save (the upload itself commits nothing).
 *  `reused` is true when identical bytes were already stored, so the second upload did no second put;
 *  `mismatch` flags an existing object whose stored content type differs from this sniff.
 */
export interface UploadResult {
  reference: string;
  record: MediaEntry;
  reused: boolean;
  mismatch: boolean;
}

/**
 * Resolve the effective preview for one concept: its `byConcept` override wins per key, with
 *  nullish coalescing so an override key that is present but undefined keeps the top-level value.
 *  Stylesheets are always shared, and the `byConcept` map never reaches the client.
 */
function resolvePreview(preview: PreviewConfig | undefined, conceptId: string): ResolvedPreview | null {
  if (!preview) return null;
  const override = preview.byConcept?.[conceptId];
  return {
    stylesheets: preview.stylesheets,
    bodyClass: override?.bodyClass ?? preview.bodyClass,
    containerClass: override?.containerClass ?? preview.containerClass,
  };
}

/** Look up the concept named by the `[concept]` route param, or a 404. */
function conceptOf(runtime: CairnRuntime, params: Record<string, string>): ConceptDescriptor {
  const concept = findConcept(runtime.concepts, params.concept ?? '');
  if (!concept) throw error(404, `Unknown content type: ${params.concept ?? ''}`);
  return concept;
}

/**
 *
 */
export function createContentRoutes(runtime: CairnRuntime, deps: ContentRoutesDeps = {}) {
  // Validate the developer's custom adminNav once at construction (server start), so a bad icon name
  // or a colliding href throws here rather than per request. The shell payload role-filters this set.
  const adminNav = normalizeAdminNav(runtime.adminNav, runtime.concepts);

  /**
   * Resolve the live content backend for one request. A test seam (`deps.backend`) wins, then the
   *  dev double's `event.locals.backend`, then the production `runtime.backend.connect(env)`. The
   *  GitHub provider mints and caches its installation token lazily behind `connect`, so a
   *  per-request resolve re-signs only on a cache miss.
   */
  function resolveBackend(event: ContentEvent): Backend {
    return deps.backend ?? event.locals.backend ?? runtime.backend.connect(event.platform?.env ?? {});
  }

  // The default Anthropic factory builds the real SDK client from the resolved key. Tests inject a fake
  // (deps.anthropic) so messages.create is stubbed and no network call or real key is ever needed. The
  // SDK client satisfies TidyClient structurally; the cast names that to the compiler.
  const anthropicClient =
    deps.anthropic ?? ((opts: { apiKey: string }) => new Anthropic({ apiKey: opts.apiKey }) as unknown as TidyClient);
  const tidyTimeoutMs = deps.tidyTimeoutMs ?? DEFAULT_TIDY_TIMEOUT_MS;

  /**
   * Main's manifest, parsed. A missing file starts empty (a fresh repo before the first commit).
   *  Always read from main: pending branches carry no manifest copy.
   */
  async function readManifest(backend: Backend): Promise<Manifest> {
    const raw = await backend.readFile(runtime.manifestPath, backend.defaultBranch);
    return raw === null ? emptyManifest() : parseManifest(raw);
  }

  /**
   * Parse a committed media.json body to a plain value for parseMediaManifest, degrading a missing
   *  or corrupt file to null (an empty manifest). The committed file is always our own serialization,
   *  so the catch only guards a hand-edited or truncated file rather than a normal path.
   */
  function parseMediaJson(raw: string | null): unknown {
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * The pending entry a `cairn/` ref names, or null for a ref the engine must ignore: a
   *  malformed name, an id that fails the slug rule (entry paths are built from it, so this is
   *  the path confinement), or a concept this site does not configure. Every ref consumer
   *  (the layout count, the list view, publish-all) applies this one predicate, so a stray
   *  hand-pushed ref cannot inflate a count it can never clear or reach a contents read.
   */
  function pendingEntryOf(name: string): { concept: ConceptDescriptor; id: string } | null {
    const ref = parsePendingBranch(name);
    if (!ref || !isValidId(ref.id)) return null;
    const concept = findConcept(runtime.concepts, ref.concept);
    return concept ? { concept, id: ref.id } : null;
  }

  /**
   * The shared admin shell's payload for one request, served through `/admin/+layout.server.ts`.
   *  A public (login/auth) path returns the bare `{ public: true }` shape and never resolves the
   *  backend, so the login page pays no GitHub round-trip. An authed path derives the nav, user,
   *  theme, and CSRF token synchronously, then streams the pending-publish set: `pendingEntries` is
   *  an unawaited promise, so the shell renders before the GitHub listing returns and a custom route
   *  never blocks on it. A synchronous token-mint throw, a network failure, or a non-ok response all
   *  degrade the promise to null, so the topbar hides the publish-all action rather than showing a
   *  wrong count.
   */
  function shellPayload(event: ContentEvent): { shell: AdminShellData } {
    if (isPublicAdminPath(event.url.pathname)) {
      return { shell: { public: true, siteName: runtime.siteName } };
    }
    const editor = requireSession(event);
    const cookieTheme = event.cookies?.get('cairn-admin-theme');
    const theme = cookieTheme === 'cairn-admin-dark' ? 'cairn-admin-dark' : 'cairn-admin';
    const cookieCollapsed = event.cookies?.get('cairn-admin-nav-collapsed');
    const collapsedNav = cookieCollapsed
      ? cookieCollapsed.split(',').map((part) => decodeURIComponent(part)).filter(Boolean)
      : [];
    // resolveBackend can throw synchronously (the token mint), which a bare `.catch()` would miss.
    // Defer the resolve into a Promise.resolve().then so a sync throw becomes a caught rejection
    // that degrades to null, the fail-safe the shell needs so a token or network failure hides the
    // publish-all action rather than throwing the whole shell.
    const pendingEntries = Promise.resolve()
      .then(() => resolveBackend(event).listBranches(PENDING_PREFIX))
      .then((names) =>
        names.flatMap((name) => {
          const entry = pendingEntryOf(name);
          return entry ? [{ concept: entry.concept.id, id: entry.id }] : [];
        }),
      )
      .catch((err): { concept: string; id: string }[] | null => {
        log.warn('github.unreachable', { scope: 'shell', error: String(err) });
        return null;
      });
    return {
      shell: {
        public: false,
        siteName: runtime.siteName,
        user: { displayName: editor.displayName, email: editor.email, role: editor.role },
        concepts: runtime.concepts.map((c) => ({ id: c.id, label: c.label })),
        // The developer's custom sidebar entries, role-filtered: an owner-only entry is hidden from a
        // non-owner. The validation already ran at construction, so this is a pure filter.
        customNav: adminNav.filter((e) => !e.ownerOnly || editor.role === 'owner'),
        pathname: event.url.pathname,
        canManageEditors: editor.role === 'owner',
        navLabel: runtime.navMenu?.label ?? null,
        theme,
        collapsedNav,
        csrf: event.cookies ? issueCsrfToken({ url: event.url, cookies: event.cookies }) : '',
        pendingEntries,
      },
    };
  }

  /**
   * Load the Help home: the getting-started progress derived from the committed manifest and the open
   *  pending branches, the markdown reference, and the runtime's support contact. A GitHub failure
   *  degrades to an empty corpus (0 of 3) rather than failing the screen, the same GitHub fail-safe the shell uses.
   */
  async function helpLoad(event: ContentEvent): Promise<HelpData> {
    requireSession(event);
    let manifest = emptyManifest();
    let pending: { concept: string; id: string }[] = [];
    try {
      const backend = resolveBackend(event);
      manifest = await readManifest(backend);
      const names = await backend.listBranches(PENDING_PREFIX);
      pending = names.flatMap((name) => {
        const entry = pendingEntryOf(name);
        return entry ? [{ concept: entry.concept.id, id: entry.id }] : [];
      });
    } catch (err) {
      log.warn('github.unreachable', { scope: 'help', error: String(err) });
    }
    return {
      gettingStarted: deriveGettingStarted(manifest, pending),
      reference: markdownReference,
      supportContact: runtime.supportContact,
    };
  }

  /** Redirect /admin to the first concept's list (spec §7.6: land on the first concept). */
  function indexRedirect(): never {
    const first = runtime.concepts[0];
    if (!first) throw error(404, 'No content types configured');
    throw redirect(307, `/admin/${first.id}`);
  }

  /**
   * Read a file's frontmatter for its list row, degrading to the id on any read failure. The
   *  repo defaults to main; a pending entry (edited or branch-only) passes its pending branch.
   */
  async function summarize(
    file: { id: string; path: string },
    backend: Backend,
    status: EntrySummary['status'],
    ref = backend.defaultBranch,
  ): Promise<EntrySummary> {
    try {
      const raw = await backend.readFile(file.path, ref);
      if (raw === null) return { id: file.id, title: file.id, date: null, draft: false, status, summary: null };
      const { frontmatter, body } = parseMarkdown(raw);
      const title = typeof frontmatter.title === 'string' && frontmatter.title.trim() ? frontmatter.title : file.id;
      const date = dateInputValue(frontmatter.date) || null;
      // Normalize an empty excerpt to null, so a pending row matches EntrySummary's `string | null`
      // contract (the published builder already coalesces with `?? null`).
      const summary = deriveExcerpt(body, { description: asString(frontmatter.description) }) || null;
      return { id: file.id, title, date, draft: frontmatter.draft === true, status, summary };
    } catch {
      return { id: file.id, title: file.id, date: null, draft: false, status, summary: null };
    }
  }

  /**
   * Read an entry's list row from its pending branch, so a pending title or draft change shows
   *  in the list instead of reading as a lost save. summarize degrades a failed or empty read to
   *  an id-only row, so a ghost ref still lists.
   */
  function pendingRow(concept: ConceptDescriptor, id: string, status: EntrySummary['status'], backend: Backend): Promise<EntrySummary> {
    return summarize({ id, path: `${concept.dir}/${filenameFromId(id)}` }, backend, status, pendingBranch(concept.id, id));
  }

  /**
   * The per-file crawl, kept only for a repo with no committed manifest yet: list main's files
   *  and read each one for its row, with edited and new rows reading branch-first.
   */
  async function crawlEntries(concept: ConceptDescriptor, pendingIds: Set<string>, backend: Backend): Promise<EntrySummary[]> {
    const files = await backend.readEntries(concept.dir, backend.defaultBranch);
    const entries = await Promise.all(
      files.map((f) => (pendingIds.has(f.id) ? pendingRow(concept, f.id, 'edited', backend) : summarize(f, backend, 'published'))),
    );
    // A ref with no main file is a never-published entry; its row reads from its branch.
    const listed = new Set(files.map((f) => f.id));
    const newRows = await Promise.all(
      [...pendingIds].filter((id) => !listed.has(id)).map((id) => pendingRow(concept, id, 'new', backend)),
    );
    return [...entries, ...newRows];
  }

  /**
   * List a concept's entries with their publish status. Published rows project straight from
   *  main's manifest, which publish, delete, and rename keep atomically in sync with main, so
   *  the listing costs one manifest read plus one branch read per pending entry rather than one
   *  read per file. A manifest row with a pending ref is `edited` and reads branch-first; a ref
   *  with no manifest row appends a `new` row read from its branch. A listing failure degrades
   *  to an inline error, not a thrown 500.
   */
  async function listLoad(event: ContentEvent): Promise<ListData> {
    requireSession(event);
    const concept = conceptOf(runtime, event.params);
    const formError = event.url.searchParams.get('error');
    const publishedAllRaw = event.url.searchParams.get('publishedAll');
    const publishedAll = publishedAllRaw !== null && /^\d+$/.test(publishedAllRaw) ? Number(publishedAllRaw) : null;
    const base = { conceptId: concept.id, label: concept.label, singular: concept.singular, dated: concept.routing.dated, formError, publishedAll };
    const backend = resolveBackend(event);
    try {
      const [manifestRaw, refs] = await Promise.all([
        backend.readFile(runtime.manifestPath, backend.defaultBranch),
        backend.listBranches(`${PENDING_PREFIX}${concept.id}/`),
      ]);
      const pendingIds = new Set(
        refs.flatMap((name) => {
          const entry = pendingEntryOf(name);
          return entry && entry.concept.id === concept.id ? [entry.id] : [];
        }),
      );
      // A repo with no committed manifest yet (a fresh site before its first publish) falls back
      // to the crawl; a manifest that parses but is empty is trusted as-is.
      if (manifestRaw === null) {
        return { ...base, entries: await crawlEntries(concept, pendingIds, backend), error: null };
      }
      // Newest id first, the same order the crawl's file listing produced.
      const rows = parseManifest(manifestRaw)
        .entries.filter((e) => e.concept === concept.id)
        .sort((a, b) => b.id.localeCompare(a.id));
      const entries = await Promise.all(
        rows.map((e) =>
          pendingIds.has(e.id)
            ? pendingRow(concept, e.id, 'edited', backend)
            : { id: e.id, title: e.title, date: e.date ?? null, draft: e.draft, status: 'published' as const, summary: e.summary ?? null },
        ),
      );
      const listed = new Set(rows.map((e) => e.id));
      const newRows = await Promise.all(
        [...pendingIds].filter((id) => !listed.has(id)).map((id) => pendingRow(concept, id, 'new', backend)),
      );
      return { ...base, entries: [...entries, ...newRows], error: null };
    } catch {
      return { ...base, entries: [], error: 'Could not load this content type from GitHub.' };
    }
  }

  /**
   * The admin Media Library load: union the media manifest across main and every open cairn/*
   *  branch (so a not-yet-published asset shows), project each row through the shared
   *  mediaLibraryEntry helper, and attach the cross-branch where-used overlay keyed by content
   *  hash. The assets union and the usage overlay degrade independently: a usage-build failure
   *  still lists the assets with an empty overlay, and a wholesale read failure degrades to the
   *  assets gathered so far rather than a thrown 500, mirroring listLoad's posture.
   */
  async function mediaLibraryLoad(event: ContentEvent): Promise<MediaLibraryData> {
    requireSession(event);
    // Read the flash flags a redirected action carried back, mirroring listLoad's `?error`/
    // `?publishedAll` grammar: a deleted/updated success flag and a commit-conflict error. The
    // conflict error rides its own slot so it never collides with the degraded-load `error` below.
    let flash: MediaLibraryData['flash'] = null;
    if (event.url.searchParams.get('deleted') === '1') flash = 'deleted';
    else if (event.url.searchParams.get('updated') === '1') flash = 'updated';
    else if (event.url.searchParams.get('replaced') === '1') flash = 'replaced';
    else if (event.url.searchParams.get('altPropagated') === '1') flash = 'altPropagated';
    else if (event.url.searchParams.get('bulkDeleted') === '1') flash = 'bulkDeleted';
    else if (event.url.searchParams.get('orphansPurged') === '1') flash = 'orphansPurged';
    else if (event.url.searchParams.get('uploaded') === '1') flash = 'uploaded';
    const flashError = event.url.searchParams.get('error');
    const backend = resolveBackend(event);

    // Union the media manifest by hash: main's rows first, then any branch hash not already present.
    // Identical bytes share one row, so a hash on both branches prefers main's row. A failed or
    // absent branch read degrades to no rows for that branch (the tolerant parse yields {} on null).
    // The branch list is taken ONCE here and handed to buildUsageIndex below, so the load path does
    // not enumerate the open branches twice (the per-page subrequest budget is tight at ~25+ branches).
    // The token mint is now lazy inside the first read, so a token or a network failure both land in
    // this one degrade rather than the old separate could-not-authenticate tier.
    const union = new Map<string, MediaEntry>();
    let branchNames: string[] = [];
    try {
      const mediaRaw = await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch);
      for (const [hash, e] of Object.entries(parseMediaManifest(parseMediaJson(mediaRaw)))) {
        union.set(hash, e);
      }
      const names = await backend.listBranches(PENDING_PREFIX);
      branchNames = names;
      const branchManifests = await Promise.all(
        names.map((name) =>
          backend.readFile(runtime.mediaManifestPath, name)
            .then((raw) => parseMediaManifest(parseMediaJson(raw)))
            .catch(() => ({}) as Record<string, MediaEntry>),
        ),
      );
      for (const manifest of branchManifests) {
        for (const [hash, e] of Object.entries(manifest)) {
          if (!union.has(hash)) union.set(hash, e);
        }
      }
    } catch {
      // A wholesale read failure leaves whatever rows were already unioned; the screen lists them
      // with no usage overlay rather than failing.
      return { assets: [...union.values()].map(mediaLibraryEntry), usage: {}, error: 'Could not load media.', flash, flashError };
    }
    const assets = [...union.values()].map(mediaLibraryEntry);

    // Build the where-used overlay from main's content manifest plus the open branches. A failure
    // here keeps the asset list intact with an empty overlay, since the screen still lists assets.
    let usage: Record<string, MediaUsageInfo> = {};
    try {
      const manifestRaw = await backend.readFile(runtime.manifestPath, backend.defaultBranch);
      const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);
      // Reuse the branch list from the media-union above; the Library DISPLAY keeps the default
      // best-effort behavior (a failed branch read degrades that one branch, not the screen).
      const index = await buildUsageIndex(backend, runtime.concepts, manifest, { branches: branchNames });
      for (const [hash, entries] of index) {
        usage[hash] = { count: distinctEntryCount(entries), entries };
      }
    } catch {
      usage = {};
    }

    return { assets, usage, error: null, flash, flashError };
  }

  /** Create a new entry: validate the slug, compose a dated id when the concept is dated, refuse to clobber. */
  async function createAction(event: ContentEvent): Promise<never> {
    requireSession(event);
    const concept = conceptOf(runtime, event.params);
    const form = await event.request.formData();
    const slug = String(form.get('slug') ?? '').trim() || slugify(String(form.get('title') ?? ''));
    const date = String(form.get('date') ?? '').trim();
    const bounce = (msg: string): never => {
      throw redirect(303, `/admin/${concept.id}?error=${encodeURIComponent(msg)}`);
    };
    if (!isValidId(slug)) return bounce('Enter a valid slug: lowercase letters, numbers, and hyphens.');

    let id = slug;
    if (concept.routing.dated) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bounce('Pick a date for this entry.');
      if (/^\d{4}-/.test(slug)) {
        return bounce('Leave the date out of the slug; set it in the date field.');
      }
      id = composeDatedId(date, slug, concept.datePrefix);
    }

    const backend = resolveBackend(event);
    const existing = await backend.readFile(`${concept.dir}/${filenameFromId(id)}`, backend.defaultBranch);
    if (existing !== null) return bounce('An entry with that slug already exists.');
    // A pending branch is an entry too (saved but not yet published); refuse to clobber it.
    if ((await backend.branchHead(pendingBranch(concept.id, id))) !== null) {
      return bounce('An unpublished entry with that slug already exists.');
    }

    throw redirect(303, `/admin/${concept.id}/${id}?new=1`);
  }

  /** Open a file for editing. A `?new=1` miss yields a blank document; any other miss is a 404. */
  async function editLoad(event: ContentEvent): Promise<EditData> {
    requireSession(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const isNew = event.url.searchParams.get('new') === '1';
    const backend = resolveBackend(event);
    const datePrefix = concept.routing.dated ? concept.datePrefix : null;
    const path = `${concept.dir}/${filenameFromId(id)}`;
    // A pending entry reads branch-first: the editor shows the unpublished edits. The manifest
    // (link targets and the inbound-link guard) always reads main, the authoritative copy.
    // Stage 1 runs the branch probe, the main-path read, and the manifest read concurrently,
    // so the probe does not serialize ahead of the other two; stage 2 adds the branch read
    // only when the probe found a branch, with the stage-1 main read serving as the published
    // signal either way.
    const branch = pendingBranch(concept.id, id);
    // The media manifest joins the concurrent batch only when media is on, read from the default
    // branch (pending branches carry no copy). A rejected media read degrades to null so the edit
    // never throws on a missing or unreadable media.json; the projection below treats null as empty.
    // The committed personal dictionary joins the concurrent batch, read from the default branch. A
    // rejected read degrades to null so the edit never throws on a missing or unreadable dictionary;
    // the projection below treats null as an empty word list (the editor falls back to dialect-only).
    const [headSha, mainRaw, manifestRaw, mediaRaw, dictionaryRaw] = await Promise.all([
      backend.branchHead(branch),
      backend.readFile(path, backend.defaultBranch),
      backend.readFile(runtime.manifestPath, backend.defaultBranch),
      runtime.resolvedAssets.enabled
        ? backend.readFile(runtime.mediaManifestPath, backend.defaultBranch).catch(() => null)
        : Promise.resolve(null),
      backend.readFile(dictionaryFilePath(), backend.defaultBranch).catch(() => null),
    ]);
    const pending = headSha !== null;
    const raw = pending ? await backend.readFile(path, branch) : mainRaw;
    if (raw === null && !isNew) throw error(404, 'Entry not found');
    const published = mainRaw !== null;

    const parsed = raw === null ? { frontmatter: {}, body: '' } : parseMarkdown(raw);
    // A fresh entry opens prefilled from each field's `default`, resolving a `'today'` date against a
    // request-time clock. The defaults sit under the empty parsed frontmatter, never over a real read.
    const loadFrontmatter = isNew
      ? { ...initialValues(concept.schema, new Date()), ...parsed.frontmatter }
      : parsed.frontmatter;
    const title = typeof parsed.frontmatter.title === 'string' && parsed.frontmatter.title.trim() ? parsed.frontmatter.title : id;

    const manifest = manifestRaw !== null ? parseManifest(manifestRaw) : null;
    let linkTargets: LinkTarget[] = [];
    let inbound: InboundLink[] = [];
    if (manifest !== null) {
      linkTargets = manifest.entries.map((e) => ({
        concept: e.concept,
        id: e.id,
        permalink: e.permalink,
        title: e.title,
        date: e.date,
        draft: e.draft,
      }));
      inbound = inboundLinks(manifest, concept.id, id);
    }

    // The address-collision advisory: warn-and-allow, never a gate. At edit-load it checks the
    // published corpus only, built synchronously from the same manifest read above (no extra GitHub
    // read per editor open); publishAction re-checks the full cross-branch index before it lands. The
    // try/catch degrades to no notice if entryIdentity throws on a malformed-date entry. Skip the build
    // with no manifest to index.
    let advisories: AdvisoryNotice[] = [];
    if (manifest !== null) {
      try {
        const identity = entryIdentity(concept, path, parsed.frontmatter);
        const addressIndex = mainAddressIndex(manifest);
        const other = addressCollision(addressIndex, { concept: concept.id, id }, identity.permalink);
        if (other) {
          const otherConcept = findConcept(runtime.concepts, other.concept);
          const label = otherConcept ? otherConcept.label : other.concept;
          advisories = [
            {
              kind: 'address-collision',
              severity: 'warn',
              message: `Another ${label} already uses the address ${identity.permalink}. Publish this one and it replaces the other at that address.`,
              actions: [{ label: `Open ${other.title}`, href: `/admin/${other.concept}/${other.id}` }],
            },
          ];
        }
      } catch {
        // A malformed-date entry that cannot resolve its permalink degrades to no advisory, fail open.
      }
    }

    // Project the one committed media manifest read two ways: the minimal resolver triple the preview
    // needs (`mediaTargets`) and the picker's full human layer (`mediaLibrary`), both keyed by hash.
    // A corrupt committed file degrades both to empty, not a throw.
    const mediaTargets: EditData['mediaTargets'] = {};
    const mediaLibrary: EditData['mediaLibrary'] = {};
    for (const [hash, e] of Object.entries(parseMediaManifest(parseMediaJson(mediaRaw)))) {
      mediaTargets[hash] = { slug: e.slug, ext: e.ext, contentType: e.contentType };
      mediaLibrary[hash] = mediaLibraryEntry(e);
    }

    // Tag-vocabulary enforcement, opt-in: only when the site configures a vocabulary AND this
    //  concept marks a taxonomy field. The closed field drives the checkbox picker (options sourced
    //  from the vocabulary unioned with the entry's own prior tags), and the orphan set flags any
    //  prior tag not in the vocabulary. There is no extra backend read: the vocabulary is the
    //  deployed runtime snapshot and the prior tags come from the already-parsed frontmatter.
    //  Otherwise the bare path runs: the open creatable multiselect an unadopted site has today.
    const vocabValues = runtime.vocabulary.map((v) => v.value);
    const taxField = resolveTaxonomyField(concept.fields);
    let editFields = concept.fields;
    let orphanTags: string[] = [];
    if (vocabValues.length > 0 && taxField !== null) {
      const priorTags = coerceTags(loadFrontmatter[taxField]);
      const allowed = resolveAllowed(vocabValues, priorTags);
      orphanTags = unlistedTags(vocabValues, priorTags);
      editFields = closeTaxonomyField(concept.fields, allowed);
    }

    return {
      conceptId: concept.id,
      id,
      label: concept.label,
      fields: editFields,
      frontmatter: formValues(editFields, loadFrontmatter),
      body: parsed.body,
      title,
      isNew,
      saved: event.url.searchParams.get('saved') === '1',
      renamed: event.url.searchParams.get('renamed') === '1',
      error: event.url.searchParams.get('error'),
      slug: slugFromId(id, datePrefix),
      linkTargets,
      mediaTargets,
      mediaLibrary,
      inboundLinks: inbound,
      pending,
      published,
      publishedFlash: event.url.searchParams.get('published') === '1',
      discardedFlash: event.url.searchParams.get('discarded') === '1',
      preview: resolvePreview(runtime.preview, concept.id),
      // composeRuntime always resolves this from the site config's dialect; default a hand-built
      // runtime that omits it to the US English dictionary so the editor always has a real filename.
      spellcheckDictionary: runtime.spellcheckDictionary ?? dictionaryFileForDialect(undefined),
      // The committed personal-dictionary words, normalized to the canonical sorted, deduplicated set
      // so the editor seeds the Worker's personal layer with a clean list. A missing or unreadable file
      // is an empty list (the dialect-only fallback).
      siteDictionary: mergeDictionaryWords(parseDictionary(dictionaryRaw), []),
      // The editor-tier tidy facts: the master switch, the model (for the head pill), and the resolved
      // conventions (the because-line and category inference read only these). The API key is never
      // exposed here. A site with no tidy block reads disabled with the default conventions.
      tidy: {
        enabled: runtime.tidy?.enabled ?? false,
        model: runtime.tidy?.model || DEFAULT_TIDY_MODEL,
        conventions: resolveTidyConventions(runtime.tidy?.conventions),
      },
      advisories,
      orphanTags,
    };
  }

  /**
   * The repo-relative personal-dictionary path, defaulting a hand-built runtime that omits it to the
   *  same `.cairn/` content root the manifests use. composeRuntime always fills `dictionaryPath`.
   */
  function dictionaryFilePath(): string {
    return runtime.dictionaryPath ?? 'src/content/.cairn/dictionary.txt';
  }

  /**
   * Log a failed commit: a conflict is the expected last-writer-wins outcome, so it warns with a
   *  reason; any other error is unexpected and logs at error with the stringified cause. Publish
   *  failures carry the same shape under their own event name.
   */
  function logCommitFailed(
    fields: { concept: string; id: string; editor: string },
    err: unknown,
    event: 'commit.failed' | 'publish.failed' = 'commit.failed',
  ): void {
    if (isConflict(err)) {
      log.warn(event, { ...fields, reason: 'conflict' });
    } else {
      log.error(event, { ...fields, error: String(err) });
    }
  }

  /**
   * The shared commit catch for the entry actions: log the failure, bounce a conflict back to
   *  `page` with `message` as the inline error, and rethrow anything else. `query` keeps any extra
   *  params the bounce must carry (saveAction's `&new=1`).
   */
  function commitFailure(
    fields: { concept: string; id: string; editor: string },
    err: unknown,
    page: string,
    message: string,
    opts: { event?: 'commit.failed' | 'publish.failed'; query?: string } = {},
  ): never {
    logCommitFailed(fields, err, opts.event);
    if (isConflict(err)) {
      throw redirect(303, `${page}?error=${encodeURIComponent(message)}${opts.query ?? ''}`);
    }
    throw err;
  }

  /**
   * The held outcome of a validated save: everything publish needs to copy the same markdown
   *  to main without re-reading the branch. `branchSha` is the branch commit saveToBranch just
   *  made, the guard for the post-publish branch delete; `manifest` is main's manifest with
   *  this entry's row upserted from the new markdown (the same last-writer-wins manifest race
   *  as delete and rename applies, caught by the build's fail-closed backstop).
   */
  interface SaveHold {
    path: string;
    markdown: string;
    branch: string;
    branchSha: string;
    manifest: Manifest;
    /** The draft-target tokens the body links to, for save's warning query. */
    draftLinks: string[];
    /** The absent-or-draft reference targets, for save's non-blocking reference warning. */
    referenceWarnings: string[];
    /** The backend this save resolved, so publish reuses it without a second resolve. */
    backend: Backend;
    /**
     * The merged media.json change this save committed to the branch, when media is on and the
     *  post carried records. Publish reuses it verbatim so the main commit promotes the exact same
     *  merged content (decision 1: the default-branch base is read once, here, not re-merged at
     *  publish). Absent when media is off or no records were posted.
     */
    mediaChange?: FileChange;
  }

  /**
   * The shared core of save and publish: parse the posted form, validate the frontmatter,
   *  guard the body's cairn links, ensure the pending branch, and commit the entry file there
   *  with the session editor as author. Returns the broken-link fail for the page to render,
   *  or the held state; throws the redirect bounces save has always thrown (invalid
   *  frontmatter, a branch-commit conflict). Main stays untouched.
   */
  async function saveToBranch(
    event: ContentEvent,
    editor: Editor,
    concept: ConceptDescriptor,
    id: string,
  ): Promise<ReturnType<typeof fail> | SaveHold> {
    const path = `${concept.dir}/${filenameFromId(id)}`;
    const form = await event.request.formData();
    const body = String(form.get('body') ?? '');
    const isNew = form.get('new') === '1';
    const suffix = isNew ? '&new=1' : '';

    // The backend is resolved up front: the branch-first prior-tags read below (the orphan union)
    //  needs it before the validate.
    const backend = resolveBackend(event);

    // Tag-vocabulary enforcement, opt-in: only when the site configures a vocabulary AND this
    //  concept marks a taxonomy field. Otherwise the bare path runs unchanged (the open creatable
    //  multiselect an unadopted site has today). When enforced, the allowed set is the vocabulary
    //  unioned with the entry's own prior committed tags, so a re-saved pre-existing orphan passes
    //  while a genuinely new value is rejected; the closed field drives the getAll decode.
    const vocabValues = runtime.vocabulary.map((v) => v.value);
    const taxField = resolveTaxonomyField(concept.fields);

    let decoded: Record<string, unknown>;
    let allowed: string[] | null = null;
    if (vocabValues.length === 0 || taxField === null) {
      decoded = frontmatterFromForm(concept.fields, form);
    } else {
      // Read the entry's prior tags branch-first, mirroring editLoad: the pending branch when its
      //  head is non-null, else the default branch. A create has no prior tags. A failed read
      //  degrades to no prior tags so it never blocks the save.
      let priorTags: string[] = [];
      if (!isNew) {
        try {
          const branch = pendingBranch(concept.id, id);
          const priorBranch = (await backend.branchHead(branch)) !== null ? branch : backend.defaultBranch;
          const priorRaw = await backend.readFile(path, priorBranch);
          if (priorRaw !== null) priorTags = coerceTags(parseMarkdown(priorRaw).frontmatter[taxField]);
        } catch {
          priorTags = [];
        }
      }
      allowed = resolveAllowed(vocabValues, priorTags);
      decoded = frontmatterFromForm(closeTaxonomyField(concept.fields, allowed), form);
    }

    const result = concept.validate(decoded, body);
    if (!result.ok) {
      const message = Object.values(result.errors)[0] ?? 'Invalid frontmatter';
      throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent(message)}${suffix}`);
    }

    if (allowed !== null && taxField !== null) {
      const tagError = enforceTaxonomy(coerceTags(decoded[taxField]), allowed);
      if (tagError) {
        throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent(tagError)}${suffix}`);
      }
    }

    const markdown = serializeMarkdown(result.data, body);

    // Merge the editor's optimistic media records into the media manifest, gated on media being on
    // and at least one valid record posted. The base is read from the default branch (never the
    // pending branch), so each save's union starts from main's committed rows, and decision 1's
    // last-writer-wins-by-hash race is the accepted trade. The merged file rides the branch commit
    // below and, carried on SaveHold, the publish commit, so both reuse the same content with no
    // second read. When media is off or no records arrive, nothing touches media.json.
    let mediaChange: FileChange | undefined;
    if (runtime.resolvedAssets.enabled) {
      const records = parseMediaEntries(form.get('media'));
      if (records.length > 0) {
        const baseRaw = await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch);
        let mediaManifest = parseMediaManifest(parseMediaJson(baseRaw));
        for (const record of records) {
          mediaManifest = upsertMediaEntry(mediaManifest, record);
        }
        mediaChange = { path: runtime.mediaManifestPath, content: serializeMediaManifest(mediaManifest) };
      }
    }

    // Upsert this entry's row into main's manifest in memory, for the link guard here and for
    // the publish commit. The save commits no manifest change; publish lands the upsert on main.
    const manifest = await readManifest(backend);
    const row = manifestEntryFromFile(concept, { path, raw: markdown });
    const upserted = upsertEntry(manifest, row);

    // Save guard: resolve the body's cairn links against main's manifest with this entry upserted,
    // so a self-link and a link to any published target resolves. A link to a target absent from
    // main hard-blocks the save (publishing this entry before its target would red the deploy
    // build); a link to a draft target commits with a warning, since it is valid and resolves once
    // the target is published.
    const byKey = new Map(upserted.entries.map((e) => [`${e.concept}/${e.id}`, e]));
    const absent: string[] = [];
    const draftLinks: string[] = [];
    for (const ref of extractCairnLinks(body)) {
      // A self-link is valid by construction (the upserted manifest holds this very entry), so
      // skip it before classifying. Mirrors inboundLinks's self-exclusion.
      if (ref.concept === concept.id && ref.id === id) continue;
      const target = byKey.get(`${ref.concept}/${ref.id}`);
      if (!target) absent.push(formatCairnToken(ref));
      else if (target.draft) draftLinks.push(formatCairnToken(ref));
    }
    if (absent.length) {
      const noun = absent.length === 1 ? 'page' : 'pages';
      return fail(400, {
        error: `This page links to ${absent.length} missing ${noun}.`,
        brokenLinks: absent,
        body,
      } satisfies SaveFailure);
    }

    // Frontmatter reference warning: classify each typed reference edge against the same upserted
    // manifest. This is best-effort against the committed (possibly stale) main manifest and advisory
    // like draftLinks, NEVER the integrity guarantee; references have no prerender re-resolve backstop,
    // so verifyReferences at the build is the only authority. A reference NEVER blocks the save: unlike
    // a body link, an absent or draft target only warns, since the build gate fails a true dangling.
    const referenceWarnings: string[] = [];
    for (const edge of extractReferenceEdges(result.data, concept.fields)) {
      if (edge.concept === concept.id && edge.id === id) continue;
      const target = byKey.get(`${edge.concept}/${edge.id}`);
      if (!target || target.draft) referenceWarnings.push(`${edge.concept}/${edge.id}`);
    }

    // Ensure the entry's pending branch exists (cut lazily from main's head on first save), then
    // commit only the entry file there. Main stays untouched until publish, so the branch differs
    // from main at exactly this entry's path.
    const branch = pendingBranch(concept.id, id);
    if ((await backend.branchHead(branch)) === null) {
      // The default-branch head read distinguishes a first save from a re-save; a null is the
      // unreadable-default-branch case the create cannot recover from, so fail with the 500.
      const mainHead = await backend.branchHead(backend.defaultBranch);
      if (mainHead === null) throw error(500, 'Cannot read the default branch');
      await backend.createBranch(branch, backend.defaultBranch);
    }

    const commitFields = { concept: concept.id, id, editor: editor.email, branch };
    let branchSha: string;
    try {
      branchSha = await backend.commit(
        branch,
        mediaChange ? [{ path, content: markdown }, mediaChange] : [{ path, content: markdown }],
        { name: editor.displayName, email: editor.email },
        `Update ${concept.label.toLowerCase()}: ${id}`,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      commitFailure(commitFields, err, `/admin/${concept.id}/${id}`,
        'This file changed since you opened it. Reload and reapply your edits.', { query: suffix });
    }
    return { path, markdown, branch, branchSha, manifest: upserted, draftLinks, referenceWarnings, backend, mediaChange };
  }

  /**
   * Save an edit: validate, then commit to the entry's pending branch with the session editor
   *  as author. Main and its manifest stay untouched until publish. Fails safe on 409.
   */
  async function saveAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = requireSession(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    // Confine the commit path to the concept dir, built from a validated id (the App token can
    // write anywhere in the repo). Reject before touching GitHub.
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const held = await saveToBranch(event, editor, concept, id);
    if (!('branchSha' in held)) return held;
    let savedQuery = held.draftLinks.length
      ? `saved=1&drafts=${encodeURIComponent(held.draftLinks.join(','))}`
      : 'saved=1';
    if (held.referenceWarnings.length)
      savedQuery += `&refs=${encodeURIComponent(held.referenceWarnings.join(','))}`;
    throw redirect(303, `/admin/${concept.id}/${id}?${savedQuery}`);
  }

  /**
   * Publish an entry: validate and hold the posted form exactly like save (the branch gets the
   *  same commit), then copy that markdown to main with the manifest row upserted in one atomic
   *  commit. Publish-what-you-see: the posted form is the published content, so text typed
   *  after the last save goes live too, and publish works regardless of prior branch state.
   *  The branch is deleted only when its head still matches the commit this action made; a
   *  concurrent save moved it, so the entry stays pending and the next publish picks it up.
   */
  async function publishAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = requireSession(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const held = await saveToBranch(event, editor, concept, id);
    if (!('branchSha' in held)) return held;
    const { path, markdown, branch, branchSha, manifest, backend, mediaChange } = held;

    // The publish commit reuses the exact merged media.json saveToBranch already built (decision 1:
    // no re-read or re-merge here). Promote it to main alongside the body and the content manifest
    // in one atomic commit, or commit those two alone when the save touched no media.
    const changes: FileChange[] = [
      { path, content: markdown },
      { path: runtime.manifestPath, content: serializeManifest(manifest) },
    ];
    if (mediaChange) changes.push(mediaChange);

    // The cross-branch address-collision re-check: warn-and-allow, last-write-wins, never a gate.
    // Resolve this entry's own address the way editLoad does and look it up in the index built from
    // the same manifest the publish carries. The read fails open: a thrown index build degrades to
    // no event and the publish proceeds, so a transient GitHub error never blocks a publish.
    let address = '';
    let collision: AddressEntry | null = null;
    try {
      const { frontmatter } = parseMarkdown(markdown);
      address = entryIdentity(concept, path, frontmatter).permalink;
      const addressIndex = await buildAddressIndex(backend, runtime.concepts, manifest);
      collision = addressCollision(addressIndex, { concept: concept.id, id }, address);
    } catch (err) {
      // Fail open, the same as editLoad: a thrown index build degrades to no event and the publish
      // proceeds. Log it so a persistently failing advisory build is diagnosable, not invisible.
      collision = null;
      log.warn('github.unreachable', { scope: 'publish-advisories', error: String(err) });
    }

    const commitFields = { concept: concept.id, id, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        changes,
        { name: editor.displayName, email: editor.email },
        `Publish ${concept.label.toLowerCase()}: ${id}`,
      );
      log.info('entry.published', { ...commitFields, batch: false });
      // Only after the publish lands: a diagnostic that a live address now has a new owner.
      if (collision) {
        log.warn('publish.address_collision', {
          editor: editor.email,
          address,
          displacedConcept: collision.concept,
          displacedId: collision.id,
        });
      }
    } catch (err) {
      // The branch already holds the just-committed edits, so a conflict here loses nothing.
      commitFailure(commitFields, err, `/admin/${concept.id}/${id}`,
        'Your edits are saved. Reload and publish again.', { event: 'publish.failed' });
    }
    // Only after the main commit lands, and only when the branch head is still the commit this
    // action made: a head that moved is a concurrent save, and deleting it would destroy edits.
    // No log event for the skip; the pending badge is the surface.
    if ((await backend.branchHead(branch)) === branchSha) {
      await backend.deleteBranch(branch);
    }
    throw redirect(303, `/admin/${concept.id}/${id}?published=1`);
  }

  /**
   * Publish every pending entry site-wide: one atomic commit on main carrying each branch's
   *  entry file plus the manifest with every row upserted, then delete the consumed branches.
   *  Mounted on the concept list shim, but the topbar posts here from anywhere, so the route's
   *  concept param is ignored and the redirect lands on the first configured concept.
   */
  async function publishAllAction(event: ContentEvent): Promise<never> {
    const editor = requireSession(event);
    const first = runtime.concepts[0];
    if (!first) throw error(404, 'No content types configured');
    const backend = resolveBackend(event);
    const listPage = `/admin/${first.id}`;

    // Each cairn/ ref names a pending entry; the shared predicate skips a stray ref rather
    // than failing the whole batch on it.
    const names = await backend.listBranches(PENDING_PREFIX);
    const pending = names.flatMap((name) => {
      const entry = pendingEntryOf(name);
      return entry ? [{ ...entry, branch: name, path: `${entry.concept.dir}/${filenameFromId(entry.id)}` }] : [];
    });

    // Read every branch in parallel, capturing each head sha BEFORE its file read: the sha
    // guards the post-publish delete, and probing first fails safe (a save landing between the
    // probe and the read moves the head past the capture, so the delete is skipped and the
    // entry stays pending). A ghost ref whose entry file is missing is skipped (discard can
    // clean it up); it carries nothing to publish.
    const reads = await Promise.all(
      pending.map(async (entry) => {
        const sha = await backend.branchHead(entry.branch);
        const raw = await backend.readFile(entry.path, entry.branch);
        return { ...entry, sha, raw };
      }),
    );

    // Fold main's manifest once over every row, so the batch lands content and index together,
    // the same shape as a single publish.
    let next = await readManifest(backend);
    const changes: FileChange[] = [];
    const published: { concept: string; id: string; branch: string; sha: string }[] = [];
    for (const entry of reads) {
      if (entry.raw === null || entry.sha === null) continue;
      changes.push({ path: entry.path, content: entry.raw });
      next = upsertEntry(next, manifestEntryFromFile(entry.concept, { path: entry.path, raw: entry.raw }));
      published.push({ concept: entry.concept.id, id: entry.id, branch: entry.branch, sha: entry.sha });
    }
    if (published.length === 0) {
      const message = 'Nothing to publish. Every entry is already live.';
      throw redirect(303, `${listPage}?error=${encodeURIComponent(message)}`);
    }
    changes.push({ path: runtime.manifestPath, content: serializeManifest(next) });

    const noun = published.length === 1 ? 'entry' : 'entries';
    try {
      await backend.commit(
        backend.defaultBranch,
        changes,
        { name: editor.displayName, email: editor.email },
        `Publish ${published.length} ${noun}`,
      );
      for (const entry of published) {
        log.info('entry.published', { concept: entry.concept, id: entry.id, editor: editor.email, batch: true });
      }
    } catch (err) {
      // One record per entry in the failed batch, so the log names what did not go live.
      for (const entry of published) {
        logCommitFailed({ concept: entry.concept, id: entry.id, editor: editor.email }, err, 'publish.failed');
      }
      if (isConflict(err)) {
        const message = 'The site changed while publishing. Reload and try again.';
        throw redirect(303, `${listPage}?error=${encodeURIComponent(message)}`);
      }
      throw err;
    }
    // Only after the main commit lands: a failure above keeps every branch and its edits. Each
    // branch deletes only when its head still matches the captured sha; a moved head is a
    // concurrent save, so the entry stays pending and the next publish picks it up (no log
    // event for the skip; the pending badge is the surface). A failed delete leaves an
    // idempotent straggler (re-publishing copies the same content), so one failure does not
    // abort the remaining deletes.
    for (const entry of published) {
      try {
        if ((await backend.branchHead(entry.branch)) === entry.sha) {
          await backend.deleteBranch(entry.branch);
        }
      } catch {
        // The entry is live; the straggler just shows as still pending until the next publish.
      }
    }
    throw redirect(303, `${listPage}?publishedAll=${published.length}`);
  }

  /**
   * Discard an entry's pending edits: delete the branch (tolerant of already-gone) and return to
   *  the edit page when the entry lives on main, else to the list (the entry is gone entirely).
   */
  async function discardAction(event: ContentEvent): Promise<never> {
    const editor = requireSession(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const backend = resolveBackend(event);

    await backend.deleteBranch(pendingBranch(concept.id, id));
    log.info('entry.discarded', { concept: concept.id, id, editor: editor.email });

    const onMain = await backend.readFile(`${concept.dir}/${filenameFromId(id)}`, backend.defaultBranch);
    if (onMain !== null) throw redirect(303, `/admin/${concept.id}/${id}?discarded=1`);
    throw redirect(303, `/admin/${concept.id}`);
  }

  /**
   * The shared delete core. Block-until-clean: refuse while inbound links exist (naming them), else
   *  commit the file removal and the manifest patch in one commit. The inbound recheck here is the
   *  authoritative gate, closing the load-to-delete race. Both the editor delete (id from params) and
   *  the list delete (id from the form body) call this with an already-validated id, so the guard is
   *  enforced once.
   */
  async function deleteEntry(
    event: ContentEvent,
    concept: ConceptDescriptor,
    id: string,
    editor: Editor,
  ): Promise<ReturnType<typeof fail> | never> {
    const path = `${concept.dir}/${filenameFromId(id)}`;
    const backend = resolveBackend(event);

    // An absent manifest degrades the inbound gate to "allow": with no manifest there is nothing to
    // check, and the build's cairn: backstop still catches any dangling token, mirroring saveAction.
    const manifest = await readManifest(backend);
    const inbound = inboundLinks(manifest, concept.id, id);
    if (inbound.length) {
      return fail(409, {
        error: `Cannot delete ${id}: ${inbound.length} ${inbound.length === 1 ? 'page links' : 'pages link'} to it.`,
        inboundLinks: inbound,
        id,
      } satisfies DeleteRefusal);
    }

    // Cross-branch reference gate (fail-closed). A strict reference index unions main's published edges
    // and every open cairn/* branch; unlike the main-only body-link gate above, it does NOT degrade to
    // allow when it cannot read, because the build's verifyReferences backstop only sees main. A
    // transient branch-read failure that looked like "no references" would let a delete strand an
    // inbound edge held in an unpublished draft, so refuse with a 503 rather than proceed.
    let refIndex: Awaited<ReturnType<typeof buildReferenceIndex>>;
    try {
      refIndex = await buildReferenceIndex(backend, runtime.concepts, manifest, { strict: true });
    } catch {
      return fail(503, {
        error: 'Could not verify where this entry is referenced. Try again.',
        inboundLinks: [],
        id,
      } satisfies DeleteRefusal);
    }
    const refRows = refIndex.get(`${concept.id}/${id}`) ?? [];
    if (refRows.length > 0) {
      // Carry each referencing entry into the InboundLink shape the blockers list renders. A branch row
      // has no permalink (the edit is unpublished), so default it to empty.
      const referencingEntries: InboundLink[] = refRows.map((row) => ({
        concept: row.concept,
        id: row.id,
        title: row.title,
        permalink: row.permalink ?? '',
      }));
      const n = referencingEntries.length;
      return fail(409, {
        error: `Cannot delete ${id}: ${n} ${n === 1 ? 'entry references' : 'entries reference'} it.`,
        inboundLinks: referencingEntries,
        id,
      } satisfies DeleteRefusal);
    }

    // When the entry was never published (absent from main), the branch delete is the whole
    // operation; main has nothing to commit, so the only honest log record is the discard of
    // the pending edits.
    const onMain = await backend.readFile(path, backend.defaultBranch);
    if (onMain === null) {
      await backend.deleteBranch(pendingBranch(concept.id, id));
      log.info('entry.discarded', { concept: concept.id, id, editor: editor.email });
      throw redirect(303, `/admin/${concept.id}`);
    }

    const nextManifest = serializeManifest(removeEntry(manifest, concept.id, id));
    const commitFields = { concept: concept.id, id, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [
          { path, content: null },
          { path: runtime.manifestPath, content: nextManifest },
        ],
        { name: editor.displayName, email: editor.email },
        `Delete ${concept.label.toLowerCase()}: ${id}`,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      commitFailure(commitFields, err, `/admin/${concept.id}/${id}`,
        'This file changed since you opened it. Reload and try again.');
    }
    // Cascade to the pending branch only after the removal lands on main, so a commit conflict
    // keeps the unpublished edits. A straggler ref left by a failure here is idempotent and
    // recoverable (it lists as a never-published row a discard can clean up), matching
    // publish's posture, so the entry's deletion still completes.
    try {
      await backend.deleteBranch(pendingBranch(concept.id, id));
    } catch {
      // The entry is gone from main; the straggler shows as a pending row until discarded.
    }
    throw redirect(303, `/admin/${concept.id}`);
  }

  /** Delete an entry from its editor. The id comes from the route param. */
  async function deleteAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = requireSession(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    return deleteEntry(event, concept, id, editor);
  }

  /** Delete an entry from the concept list. The id comes from the form body. */
  async function listDeleteAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = requireSession(event);
    const concept = conceptOf(runtime, event.params);
    const form = await event.request.formData();
    const id = String(form.get('id') ?? '');
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    return deleteEntry(event, concept, id, editor);
  }

  /**
   * Rename an entry: change its slug, move the file, and rewrite every inbound cairn token in one
   *  atomic commit, so no internal link breaks. The collision check and the inbound recompute here
   *  are the authoritative gate. The same last-writer-wins manifest race as save and delete applies,
   *  caught by the build's fail-closed backstop.
   */
  async function renameAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = requireSession(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const backend = resolveBackend(event);

    // Pending edits on the branch are keyed to the old id; renaming underneath them would strand
    // them, so refuse until the editor publishes or discards.
    if ((await backend.branchHead(pendingBranch(concept.id, id))) !== null) {
      return fail(409, { error: 'This entry has unpublished edits. Publish or discard them, then rename.' } satisfies RenameFailure);
    }

    const form = await event.request.formData();
    const newSlug = String(form.get('slug') ?? '').trim();
    if (!isValidId(newSlug)) {
      return fail(400, { error: 'Enter a valid slug: lowercase letters, numbers, and hyphens.' } satisfies RenameFailure);
    }
    const datePrefix = concept.routing.dated ? concept.datePrefix : null;
    if (concept.routing.dated && /^\d{4}-/.test(newSlug)) {
      return fail(400, { error: 'Leave the date out of the slug.' } satisfies RenameFailure);
    }
    if (newSlug === slugFromId(id, datePrefix)) {
      return fail(400, { error: 'That is already the slug.' } satisfies RenameFailure);
    }
    const newId = renameId(id, newSlug, datePrefix);
    const oldPath = `${concept.dir}/${filenameFromId(id)}`;
    const newPath = `${concept.dir}/${filenameFromId(newId)}`;

    // Collision guard: refuse if a file already exists at the new path. This 409 covers two cases a
    // single readRaw cannot tell apart: a static collision with an existing entry, and a
    // concurrent-rename race where another editor renamed onto this path between load and submit.
    const clobber = await backend.readFile(newPath, backend.defaultBranch);
    if (clobber !== null) {
      return fail(409, { error: 'An entry with that slug already exists.' } satisfies RenameFailure);
    }

    const [entryRaw, manifest] = await Promise.all([
      backend.readFile(oldPath, backend.defaultBranch),
      readManifest(backend),
    ]);
    if (entryRaw === null) throw error(404, 'Entry not found');

    // Cross-branch reference gate (fail-closed). A reference index unions main's published edges and
    // every open cairn/* branch; if it cannot be built (a transient branch read failure), refuse
    // rather than rename a still-referenced target and strand the inbound edge.
    let refIndex: Awaited<ReturnType<typeof buildReferenceIndex>>;
    try {
      refIndex = await buildReferenceIndex(backend, runtime.concepts, manifest, { strict: true });
    } catch {
      return fail(409, { error: 'Could not verify references. Try again.' } satisfies RenameFailure);
    }

    // Refuse when a THIRD-PARTY open branch holds an inbound reference (symmetric with the pending-edits
    // guard). The strict index unions main and every branch, so filter before refusing: gate
    // origin.kind === 'branch' FIRST (a published row has no .branch, so a bare branch-name compare would
    // trip on every main-side inbound and over-refuse), then exclude the entry's OWN pending branch
    // (already refused above and absent by construction here). Published (main) inbound rows are NOT
    // refused; they are repointed below.
    const ownBranch = pendingBranch(concept.id, id);
    const conflictBranches = (refIndex.get(`${concept.id}/${id}`) ?? [])
      .filter((row) => row.origin.kind === 'branch' && row.origin.branch !== ownBranch)
      .map((row) => `${row.concept}/${row.id}`);
    if (conflictBranches.length > 0) {
      const names = [...new Set(conflictBranches)].join(', ');
      return fail(409, { error: `Another editor has unpublished edits referencing this entry: ${names}. Ask them to publish or discard, then rename.` } satisfies RenameFailure);
    }

    const oldHref = formatCairnToken({ concept: concept.id, id });
    const newHref = formatCairnToken({ concept: concept.id, id: newId });

    // The moved file keeps its content, except a self-token rewrite and a self-reference rewrite.
    let movedRaw = rewriteCairnLink(entryRaw, oldHref, newHref);
    // The moved entry is excluded from inboundReferences, so it must repoint its OWN frontmatter
    // self-references (e.g. `related` listing its own old id), or the re-derived row would carry the
    // old id and verifyReferences would flag a dangling edge at the deploy gate.
    for (const f of concept.fields) {
      if (f.type === 'reference' || (f.type === 'array' && f.item.type === 'reference')) {
        movedRaw = rewriteFrontmatterReference(movedRaw, f.name, id, newId);
      }
    }
    // Re-derive its manifest row from the new path so the row carries the new id and permalink by
    // construction (and the rewritten self-reference edge at the new id).
    const changes: FileChange[] = [
      { path: oldPath, content: null },
      { path: newPath, content: movedRaw },
    ];
    let next = removeEntry(manifest, concept.id, id);
    next = upsertEntry(next, manifestEntryFromFile(concept, { path: newPath, raw: movedRaw }));

    // Repoint every inbound linker so its outbound edges point at the new id, both body `cairn:` links
    // and frontmatter reference fields. One entry can hold BOTH kinds at the same target, and the Git
    // Trees API resolves a duplicate path to the LAST entry, so a separate FileChange per kind would let
    // the second clobber the first. Union the two inbound sets keyed by linker PATH, read each file once
    // from main, apply every rewrite to the SAME buffer, then push ONE FileChange per path and re-derive
    // its row from the merged buffer. inboundReferences reads the committed (last-writer-wins stale)
    // manifest, so a real inbound edge not yet recorded there is left to verifyReferences at the deploy
    // gate; third-party open-branch inbounds were already refused above, so these are main-only.
    interface InboundRepoint {
      concept: string;
      id: string;
      hasLink: boolean;
      fields: string[];
    }
    const repoints = new Map<string, InboundRepoint>();
    const linkerPathFor = (linkerConcept: ConceptDescriptor, linkerId: string): string =>
      `${linkerConcept.dir}/${filenameFromId(linkerId)}`;
    for (const linker of inboundLinks(manifest, concept.id, id)) {
      const linkerConcept = findConcept(runtime.concepts, linker.concept);
      if (!linkerConcept) continue;
      const path = linkerPathFor(linkerConcept, linker.id);
      const existing = repoints.get(path);
      if (existing) existing.hasLink = true;
      else repoints.set(path, { concept: linker.concept, id: linker.id, hasLink: true, fields: [] });
    }
    for (const linker of inboundReferences(manifest, concept.id, id)) {
      const linkerConcept = findConcept(runtime.concepts, linker.concept);
      if (!linkerConcept) continue;
      const path = linkerPathFor(linkerConcept, linker.id);
      const existing = repoints.get(path);
      if (existing) existing.fields = [...new Set([...existing.fields, ...linker.fields])];
      else repoints.set(path, { concept: linker.concept, id: linker.id, hasLink: false, fields: linker.fields });
    }
    for (const [linkerPath, repoint] of repoints) {
      const linkerConcept = findConcept(runtime.concepts, repoint.concept);
      if (!linkerConcept) continue;
      let linkerRaw = await backend.readFile(linkerPath, backend.defaultBranch);
      if (linkerRaw === null) continue;
      if (repoint.hasLink) linkerRaw = rewriteCairnLink(linkerRaw, oldHref, newHref);
      for (const field of repoint.fields) {
        linkerRaw = rewriteFrontmatterReference(linkerRaw, field, id, newId);
      }
      changes.push({ path: linkerPath, content: linkerRaw });
      next = upsertEntry(next, manifestEntryFromFile(linkerConcept, { path: linkerPath, raw: linkerRaw }));
    }

    changes.push({ path: runtime.manifestPath, content: serializeManifest(next) });

    const commitFields = { concept: concept.id, id: newId, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        changes,
        { name: editor.displayName, email: editor.email },
        `Rename ${concept.label.toLowerCase()}: ${id} to ${newId}`,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      commitFailure(commitFields, err, `/admin/${concept.id}/${id}`,
        'This file changed since you opened it. Reload and try again.');
    }
    throw redirect(303, `/admin/${concept.id}/${newId}?renamed=1`);
  }

  /**
   * Ingest an uploaded image: the shared store-and-derive body for the upload endpoint (spec piece
   * 2, decisions 1 to 3) and, later, the Media Library's direct-upload action. The body is the raw
   * file bytes, read once; the human metadata travels in percent-encoded `X-Cairn-*` request
   * headers. The server owns every committed field and trusts no client value: it sniffs the real
   * type, screens the engine deny-list, re-hashes, re-derives the ext and slug, caps and sanitizes
   * the human fields, and clamps the advisory dimensions. It stores put-first to R2 with
   * content-addressed dedup (no second put for identical bytes, no compensating delete) and commits
   * nothing to git; a caller that wants a git-committed row derives one from the returned record.
   *
   * Session authority: behind `createAuthGuard` the guard is the production session gate. An
   * unauthenticated admin POST is redirected 303 by the guard before this action runs (an opaque,
   * status-0 response under the client's `redirect: 'manual'`), so the `fail(401, 'session-expired')`
   * below is a belt-and-suspenders for a direct or un-guarded call, not the primary path.
   */
  async function ingestAndStore(event: ContentEvent): Promise<ReturnType<typeof fail> | UploadResult> {
    // Read the editor up front for log attribution; the gate at step 4 enforces its presence. The
    // pre-session gates (1 to 3) may log with an undefined editor email, which is fine.
    const editor = event.locals.editor ?? null;
    const refuse = (status: number, reason: string): ReturnType<typeof fail> => {
      log.warn('media.upload_failed', { editor: editor?.email, reason });
      return fail(status, { error: reason });
    };

    // 1. Media on.
    const resolved = runtime.resolvedAssets;
    if (!resolved.enabled) return refuse(503, 'media-disabled');

    // 2. Content-Length before the body is read: an absent or non-positive-integer length is a 411,
    //    an oversize length is a 413. Both refuse before the bytes are buffered. The header is
    //    client-advisory, so the real DoS bound is the Worker request-size limit, not maxUploadBytes:
    //    a lying client still buffers up to the platform ceiling before the post-read recheck (step 5).
    const lengthHeader = event.request.headers.get('content-length');
    const length = lengthHeader === null ? NaN : Number(lengthHeader);
    if (!Number.isInteger(length) || length <= 0) return refuse(411, 'length-required');
    if (length > resolved.maxUploadBytes) return refuse(413, 'too-large');

    // 3. CSRF from the X-Cairn-CSRF header (no body clone): the action is the CSRF authority for the
    //    raw-body upload, since the guard runs its form-CSRF only on form content types.
    if (!event.cookies || !validateCsrfHeader({ url: event.url, request: event.request, cookies: event.cookies })) {
      return refuse(403, 'csrf');
    }

    // 4. JSON-aware session (belt-and-suspenders; see the docstring): behind the guard an
    //    unauthenticated POST is already 303'd before this runs. For a direct or un-guarded call,
    //    read the resolved editor directly and refuse with a 401 envelope rather than a 303 redirect.
    if (!editor) return refuse(401, 'session-expired');

    // 5. Read the body once. Content-Length is client-advisory, so a lying client could send more
    //    than it declared; recheck the real size against the cap after the read.
    const bytes = new Uint8Array(await event.request.arrayBuffer());
    if (bytes.length > resolved.maxUploadBytes) return refuse(413, 'too-large');

    // 6. Server re-derivation: trust nothing the client declared.
    const declaredType = event.request.headers.get('content-type') ?? undefined;
    const sniffed = sniffMediaType(bytes);
    if (isDeniedUpload(bytes, declaredType) || sniffed === null || !resolved.allowedTypes.includes(sniffed)) {
      return refuse(415, 'unsupported-type');
    }
    const ext = extForMediaType(sniffed);
    if (ext === null) return refuse(415, 'unsupported-type');

    const full = await hashBytes(bytes);
    const hash = shortHash(full);

    const decodedFilename = safeDecode(event.request.headers.get('x-cairn-filename'));
    const slug = slugifyFilename(decodedFilename);
    const originalFilename = sanitizeField(basename(decodedFilename), MAX_ORIGINAL_FILENAME);
    const alt = sanitizeField(safeDecode(event.request.headers.get('x-cairn-alt')), MAX_ALT);
    const displayNameRaw = sanitizeField(safeDecode(event.request.headers.get('x-cairn-display-name')), MAX_DISPLAY_NAME);
    const displayName = displayNameRaw || slug;
    const width = clampDimension(event.request.headers.get('x-cairn-width'));
    const height = clampDimension(event.request.headers.get('x-cairn-height'));

    // 7. Store put-first with R2-head dedup, commit nothing. The raw bucket binding lives on
    //    platform.env, which the engine reads through a structural cast (the engine does not declare
    //    App.Platform). r2Store wraps it as the narrow MediaStore seam; R2Bucket is named only for
    //    this cast and never in an exported signature.
    const platformEnv = (event.platform as { env?: Record<string, unknown> } | undefined)?.env ?? {};
    const rawBucket = platformEnv[resolved.bucketBinding];
    if (!rawBucket) return refuse(503, 'binding-missing');
    const store = r2Store(rawBucket as R2Bucket);

    const key = r2Key(hash, ext);
    const existing = await store.head(key);
    let reused: boolean;
    let mismatch = false;
    if (existing !== null) {
      // The key derives from the 16-hex short hash (64 bits), so a distinct file could in principle
      // collide on it. The put stores the full sha256 as custom metadata; verify it here. A stored
      // sha256 that differs from this upload's full hash is a genuine short-hash collision: refuse,
      // never serve the first file's bytes under the second's reference. A stored object with no
      // sha256 (a legacy or manually-put object we cannot verify) proceeds as a dedup hit, best effort.
      const storedSha = existing.customMetadata?.sha256;
      if (storedSha !== undefined && storedSha !== full) return refuse(409, 'hash-collision');
      // Identical bytes are already stored: skip the put. A second upload does no second put, so a
      // concurrent dedup-reuse is never clobbered. Flag a stored type that disagrees with this sniff.
      reused = true;
      mismatch = existing.httpMetadata?.contentType !== undefined && existing.httpMetadata.contentType !== sniffed;
    } else {
      await store.put(
        key,
        bytes,
        { contentType: sniffed, cacheControl: 'public, max-age=31536000, immutable' },
        { sha256: full },
      );
      reused = false;
    }

    const record: MediaEntry = {
      hash,
      sha256: full,
      slug,
      displayName,
      originalFilename,
      alt,
      ext,
      contentType: sniffed,
      bytes: bytes.length,
      width,
      height,
      createdAt: new Date().toISOString(),
    };
    const reference = mediaToken({ slug, hash });

    log.info('media.uploaded', { editor: editor.email, hash, bytes: bytes.length, contentType: sniffed, reused });
    return { reference, record, reused, mismatch };
  }

  /**
   * Wire contract: this is a SvelteKit form action, so for a JSON request SvelteKit serializes the
   * result into a 200 JSON envelope `{ type, status, data }`. A `fail(status, ...)` rides the
   * envelope's `status` field, NOT the HTTP response status (the HTTP status stays 200); a client
   * parses `type`/`status` from the body, never `Response.status`. Success returns a plain
   * `UploadResult` (also a 200 envelope). The action logs `media.upload_failed` on a refusal and
   * `media.uploaded` on success. Delegates to `ingestAndStore`, the shared store-and-derive body.
   */
  async function uploadAction(event: ContentEvent): Promise<ReturnType<typeof fail> | UploadResult> {
    return ingestAndStore(event);
  }

  /**
   * Upload straight into the Library: store the bytes and derive the record via `ingestAndStore`
   *  (the editor upload's shared body), then commit the row to `main` in the same step, since a
   *  Library-direct upload has no entry and no Save to ride. The client posts only the file; the
   *  server derives and commits every field, trusting nothing client-posted (`ingestAndStore`'s
   *  contract). A hash already present in the manifest is an idempotent no-op: the asset (and its
   *  row) already exist, so the upload commits nothing and still returns the success envelope.
   *  Mirrors the safe-delete/rename commit shape, but returns a `fail(409)` envelope on a conflict
   *  rather than a redirect, since this action's client reads a JSON envelope, not a bounce.
   */
  async function mediaLibraryUpload(event: ContentEvent): Promise<ReturnType<typeof fail> | UploadResult> {
    const result = await ingestAndStore(event);
    if (!('record' in result)) return result;
    const editor = event.locals.editor!; // ingestAndStore already refused a missing session.
    const backend = resolveBackend(event);

    // Read the head BEFORE the manifest, so this expectedHead is at-or-before the bytes the commit
    // sends; media.json has no regenerate-from-files backstop, so a concurrent upload fails closed
    // rather than last-writer-wins dropping a row.
    const head = await backend.branchHead(backend.defaultBranch);
    const manifest = parseMediaManifest(parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));
    if (manifest[result.record.hash]) return result; // Bytes and row already committed: nothing to do.

    const commitFields = { concept: 'media', id: result.record.hash, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [{ path: runtime.mediaManifestPath, content: serializeMediaManifest(upsertMediaEntry(manifest, result.record)) }],
        { name: editor.displayName, email: editor.email },
        `Upload media: ${result.record.slug}`,
        head ?? undefined,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      if (!isConflict(err)) {
        log.error('commit.failed', { ...commitFields, error: String(err) });
        throw err;
      }
      log.warn('commit.failed', { ...commitFields, reason: 'conflict' });
      return fail(409, { error: 'The media manifest changed since you opened it. Reload and try again.' });
    }
    return result;
  }

  /** A media slug is the same lowercase-alphanumeric-with-hyphens grammar the reference token uses. */
  const MEDIA_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  /** A 16-hex content-hash prefix, the immutable asset key. */
  const MEDIA_HASH_RE = /^[0-9a-f]{16}$/;

  /**
   * Safe-delete a committed media asset. The gate rechecks usage server-side against a FRESH index
   *  read at delete time (never a client-passed count), mirroring deleteEntry's authoritative inbound
   *  recheck. An in-use asset refuses unless the form carries the typed-slug override (the in-use
   *  alertdialog's type-to-confirm). When confirmed, the order is load-bearing: commit the manifest
   *  row removal FIRST, then delete the R2 object, so a failure after the commit leaves bytes with no
   *  row (a benign orphan) rather than a row pointing at deleted bytes (a broken delivery). Scope:
   *  3c deletes assets committed on the default branch; a branch-only upload is removed by discarding
   *  its draft, not here.
   *
   *  The published-usage side of the gate trusts the content manifest's mediaRefs (kept fresh by
   *  save/publish via manifestEntryFromFile), the same manifest-trust model the entry-delete gate
   *  uses; a raw git edit that adds a media reference without a save/publish or a manifest regenerate
   *  is not seen, matching the documented "regenerate after a raw edit" contract. The recheck reads
   *  in STRICT mode, so a transient branch-read failure fails the delete closed rather than mistaking
   *  a referenced asset for an orphan. There is an inherent stale-read window between the recheck and
   *  the commit (no sha-guard ties them); it is bounded because the resolver and the route key on the
   *  hash, so a reference added in that window still resolves to bytes that may be gone, the same
   *  delete-races-an-edit window every safe delete carries.
   */
  async function mediaDeleteAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = requireSession(event);
    const backend = resolveBackend(event);

    const form = await event.request.formData();
    const hash = String(form.get('hash') ?? '');
    if (!MEDIA_HASH_RE.test(hash)) throw error(400, 'Invalid media hash');

    // The asset must be committed on the default branch to be deletable here. A branch-only upload
    // (the common 2b case before publish) has no main row; removing it is a discard of the draft.
    const manifest = parseMediaManifest(parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));
    const row = manifest[hash];
    if (!row) {
      return fail(404, {
        error: 'That asset is not committed. Discard its draft to remove an unpublished upload.',
        hash,
        usage: [],
        foundIn: 0,
      } satisfies MediaDeleteRefusal);
    }

    // The authoritative gate: a fresh usage read, never a client count. The index spans main's
    // content manifest and every open cairn/* branch. STRICT mode rethrows a branch-read failure
    // (rather than the display path's degrade-and-skip), so a transient branch read failing does not
    // make a still-referenced asset look orphaned and skip the typed-slug confirm.
    let index: Awaited<ReturnType<typeof buildUsageIndex>>;
    try {
      index = await buildUsageIndex(backend, runtime.concepts, await readManifest(backend), { strict: true });
    } catch {
      // Fail closed: we could not verify every place the asset is used, so refuse rather than risk
      // deleting bytes a branch still references.
      return fail(503, {
        error: 'Could not verify where this asset is used. Try again.',
        hash,
        usage: [],
        foundIn: 0,
      } satisfies MediaDeleteRefusal);
    }
    const rows = index.get(hash) ?? [];
    const foundIn = distinctEntryCount(rows);

    if (rows.length > 0) {
      // In use: refuse unless the editor typed the slug to force it (the in-use face's confirmation).
      // An empty stored slug must never be satisfiable by the empty default, so a blank row.slug is
      // treated as never-confirmed: the typed confirm cannot be bypassed.
      const confirmSlug = String(form.get('confirmSlug') ?? '');
      if (row.slug === '' || confirmSlug !== row.slug) {
        log.warn('media.delete_blocked', { editor: editor.email, hash, foundIn });
        // Group published-first, then branch entries by branch name, so the list reads stably.
        const usage = [...rows].sort((a, b) => originRank(a) - originRank(b) || branchKey(a).localeCompare(branchKey(b)));
        return fail(409, {
          error: `Cannot delete ${row.slug}: found in ${foundIn} ${foundIn === 1 ? 'entry' : 'entries'}.`,
          hash,
          usage,
          foundIn,
        } satisfies MediaDeleteRefusal);
      }
    }

    // Resolve the R2 bucket before the commit, so a missing binding refuses before any write.
    const resolved = runtime.resolvedAssets;
    if (!resolved.enabled) {
      return fail(503, { error: 'Media is not enabled for this site.', hash, usage: [], foundIn } satisfies MediaDeleteRefusal);
    }
    const platformEnv = (event.platform as { env?: Record<string, unknown> } | undefined)?.env ?? {};
    const rawBucket = platformEnv[resolved.bucketBinding];
    if (!rawBucket) {
      return fail(503, { error: 'The media bucket is not bound.', hash, usage: [], foundIn } satisfies MediaDeleteRefusal);
    }
    const store = r2Store(rawBucket as R2Bucket);
    // Derive the R2 key BEFORE the commit. A corrupt ext throws here, so a bad key refuses before
    // any write rather than after the row is already removed (which would orphan the bytes).
    const objectKey = r2Key(hash, row.ext);

    // Commit the manifest row removal FIRST. The order is load-bearing (see the docstring).
    const commitFields = { concept: 'media', id: hash, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [{ path: runtime.mediaManifestPath, content: serializeMediaManifest(removeMediaEntry(manifest, hash)) }],
        { name: editor.displayName, email: editor.email },
        `Delete media: ${row.slug}`,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      commitFailure(commitFields, err, '/admin/media',
        'The media manifest changed since you opened it. Reload and try again.');
    }
    // THEN delete the object. An absent object is a no-op (the R2 contract), so a dead row clears.
    await store.delete(objectKey);
    log.info('media.deleted', { editor: editor.email, hash });
    throw redirect(303, '/admin/media?deleted=1');
  }

  /**
   * Bulk safe-delete a multi-select of committed media assets. This is mediaDeleteAction extended to
   *  many items, with the same safety primitives and one rule that defines the batch: the gate is ONE
   *  shared strict cross-branch usage index built per batch, never N per-item reads (N strict reads
   *  would blow the workerd connection budget at many open branches). The fail-closed posture is for
   *  the WHOLE batch: if that single strict index cannot complete, the action refuses everything and
   *  commits nothing, rather than risk deleting bytes a branch still references.
   *
   *  Skip-and-report, never force: the pure planBulkDelete partitions the selection against the strict
   *  index into deletable (no usage row, a committed manifest row exists), skipped-still-referenced (a
   *  usage row, carried for the where-used), and skipped-uncommitted (no manifest row). An in-use item
   *  is skipped and reported, never bulk-force-deleted; forced in-use deletion stays the single-item
   *  typed-slug path.
   *
   *  The order is load-bearing, mirroring single delete: ONE atomic commit removes every deletable row
   *  FIRST, then the R2 objects are deleted (commit-row-then-delete-R2). A failure after the commit
   *  leaves bytes with no row (a benign orphan) rather than a row pointing at deleted bytes. Each R2
   *  delete is best-effort and batch-resilient: a per-object error is reported in `failed` and never
   *  aborts the rest of the batch. The result is an itemized 207-style summary the component renders
   *  (deleted / skipped with reasons / failed); there is no success redirect.
   */
  async function mediaBulkDelete(event: ContentEvent): Promise<ReturnType<typeof fail> | MediaBulkDeleteResult> {
    const editor = requireSession(event);
    const backend = resolveBackend(event);

    // Read the selected hashes from the form. Accept the repeated `hash` field, falling back to a JSON
    // `hashes` array. Each value must match the 16-hex content-hash grammar; a malformed value is
    // dropped silently rather than surfaced as a skip (it was never a real selection).
    const form = await event.request.formData();
    let raw = form.getAll('hash').map(String);
    if (raw.length === 0) {
      const json = form.get('hashes');
      if (typeof json === 'string') {
        try {
          const parsed: unknown = JSON.parse(json);
          if (Array.isArray(parsed)) raw = parsed.map(String);
        } catch {
          raw = [];
        }
      }
    }
    const selected = raw.filter((h) => MEDIA_HASH_RE.test(h));

    // Read the fresh media manifest (the deletable rows come from here, by hash).
    const manifest = parseMediaManifest(parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));

    // Resolve the R2 bucket before any write, so a media-off site or a missing binding refuses before
    // the commit, exactly like single delete.
    const resolved = runtime.resolvedAssets;
    if (!resolved.enabled) {
      return fail(503, { error: 'Media is not enabled for this site.' } satisfies MediaBulkFailure);
    }
    const platformEnv = (event.platform as { env?: Record<string, unknown> } | undefined)?.env ?? {};
    const rawBucket = platformEnv[resolved.bucketBinding];
    if (!rawBucket) {
      return fail(503, { error: 'The media bucket is not bound.' } satisfies MediaBulkFailure);
    }
    const store = r2Store(rawBucket as R2Bucket);

    // THE fail-closed gate for the whole batch: one shared strict usage index. STRICT mode rethrows a
    // branch-read failure, so a transient branch read failing refuses the whole batch rather than
    // mistaking a still-referenced asset for an orphan. Build exactly one index, never one per item.
    let index: Awaited<ReturnType<typeof buildUsageIndex>>;
    try {
      index = await buildUsageIndex(backend, runtime.concepts, await readManifest(backend), { strict: true });
    } catch {
      return fail(503, { error: 'Could not verify where these assets are used. Try again.' } satisfies MediaBulkFailure);
    }

    // The pure partition: membership in the fresh strict index is the gate, never the display count.
    const plan = planBulkDelete(selected, index, manifest);
    // An all-skipped or empty batch is a no-op success: nothing committed, nothing deleted.
    if (plan.deletable.length === 0) {
      return { deleted: [], skipped: plan.skipped, failed: [] } satisfies MediaBulkDeleteResult;
    }

    // ONE atomic commit removing EVERY deletable row, folded over removeMediaEntry.
    let next = manifest;
    for (const hash of plan.deletable) next = removeMediaEntry(next, hash);
    const commitFields = { concept: 'media', id: 'bulk', editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [{ path: runtime.mediaManifestPath, content: serializeMediaManifest(next) }],
        { name: editor.displayName, email: editor.email },
        `Delete ${plan.deletable.length} media assets`,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      commitFailure(commitFields, err, '/admin/media',
        'The media manifest changed since you opened it. Reload and try again.');
    }

    // THEN delete each deletable hash's R2 object (the load-bearing order, see the docstring). Best
    // effort and batch-resilient: a thrown key derivation or a delete error is reported in `failed`
    // and the loop continues. An absent object is a no-op (the R2 contract).
    const deleted: string[] = [];
    const failed: { hash: string; error: string }[] = [];
    for (const hash of plan.deletable) {
      try {
        const row = manifest[hash];
        await store.delete(r2Key(row.hash, row.ext));
        deleted.push(hash);
      } catch (err) {
        failed.push({ hash, error: err instanceof Error ? err.message : String(err) });
      }
    }

    log.info('media.bulk_deleted', { editor: editor.email, deleted: deleted.length, skipped: plan.skipped.length });
    return { deleted, skipped: plan.skipped, failed } satisfies MediaBulkDeleteResult;
  }

  /**
   * The on-demand orphan scan: a read-only reconcile of stored R2 bytes against the manifest, joined
   *  with one strict cross-branch usage index for the broken-reference where-used. It runs only when
   *  requested, never on the loaded index, because it is heavier than the load path: a full R2 list
   *  plus a reconcile pass on top of the strict usage build.
   *
   *  Detection-time fail-closed: BOTH the reconcile and the strict usage build run inside one
   *  try/catch, and any throw refuses the whole scan with fail(503) rather than returning a partial
   *  result. The reconcile must not run on a half-listed bucket: a truncated R2 list would call
   *  still-stored bytes orphaned. The strict usage build must not run on a half-read branch set: an
   *  unread branch would make a branch-referenced asset look orphaned. A wrong orphan verdict here
   *  feeds the irreversible purge, so the scan refuses rather than risk it.
   *
   *  The result is the OrphanScan projection: orphanedBytes (stored keys with no manifest row, the
   *  purge surface) and brokenRefs (manifest rows whose bytes are gone, read-only, shown with their
   *  where-used so an operator can re-ingest rather than purge a still-referenced record).
   */
  async function mediaOrphanScan(event: ContentEvent): Promise<ReturnType<typeof fail> | OrphanScan> {
    requireSession(event);
    const backend = resolveBackend(event);

    // Resolve the R2 binding. The reconcile lists the raw bucket directly, so keep the raw binding;
    // the MediaStore seam carries no list. A media-off site or a missing binding refuses the scan.
    const resolved = runtime.resolvedAssets;
    if (!resolved.enabled) {
      return fail(503, { error: 'Media is not enabled for this site.' } satisfies MediaBulkFailure);
    }
    const platformEnv = (event.platform as { env?: Record<string, unknown> } | undefined)?.env ?? {};
    const rawBucket = platformEnv[resolved.bucketBinding];
    if (!rawBucket) {
      return fail(503, { error: 'The media bucket is not bound.' } satisfies MediaBulkFailure);
    }

    // Read the fresh media manifest for the reconcile's manifest side.
    const manifest = parseMediaManifest(parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));

    // THE detection-time fail-closed surface. The reconcile (an R2 list that must complete in full)
    // and the strict usage build (a branch read that must complete in full) are both unsafe to use
    // partially, so either throwing refuses the scan. A wrong orphan verdict from a partial read here
    // would feed the irreversible purge.
    let reconcile: Awaited<ReturnType<typeof runReconcile>>;
    let index: Awaited<ReturnType<typeof buildUsageIndex>>;
    try {
      reconcile = await runReconcile(rawBucket as unknown as ReconcileBucket, manifest);
      index = await buildUsageIndex(backend, runtime.concepts, await readManifest(backend), { strict: true });
    } catch {
      return fail(503, { error: 'Could not check where files are used, so the scan was not run. Try again.' } satisfies MediaBulkFailure);
    }

    return buildOrphanScan(reconcile, manifest, index);
  }

  /**
   * Purge orphaned R2 bytes: the one IRREVERSIBLE media action. Raw object bytes live only in R2, not
   *  in git, so a purged orphan cannot be recovered the way a deleted manifest row can be reverted in
   *  history. The whole action is built around that fact.
   *
   *  The typed-count confirm is the never-bypassable gate, the analogue of single delete's typed-slug
   *  check. The form's `confirm` must equal the count of selected keys (the approved rev.2 mockup's
   *  "Type N to purge these files for good"); an empty selection or a mismatched count deletes nothing.
   *
   *  Re-derive fresh is the safety crux. The selection came from an earlier scan, so the action does
   *  NOT trust it: the purge keys are client-posted, so the server cannot assume they came from a fresh
   *  scan. It reads the current media manifest AND rebuilds ONE strict cross-branch usage index, then
   *  for each selected key parses the hash from the key grammar. A key that does not match the grammar
   *  was never a real orphan key and is dropped silently. A key whose hash now has a manifest row OR is
   *  referenced on any open cairn/* branch survived the scan window (it was claimed by a row, or a
   *  draft started referencing those bytes), so it is skipped into skippedClaimed and its bytes survive.
   *  Only a key whose hash is STILL absent from both is purged. This closes the TOCTOU between scan and
   *  purge that could otherwise irreversibly delete a live draft's bytes.
   *
   *  Like the scan and the bulk delete, the strict index build is the fail-closed gate: a branch read
   *  that throws refuses the whole batch with fail(503) rather than mistaking an unverifiable reference
   *  for an absent one. The index is built exactly once for the batch, never once per key.
   *
   *  There is no commit. An orphan by definition has no manifest row to remove, so the purge deletes
   *  the R2 object directly. Each delete is best-effort and batch-resilient: a per-object error is
   *  reported in `failed` and the loop continues; an absent object is a no-op (the R2 contract).
   */
  async function mediaPurgeOrphans(event: ContentEvent): Promise<ReturnType<typeof fail> | MediaOrphanPurgeResult> {
    const editor = requireSession(event);
    const backend = resolveBackend(event);

    // Resolve the R2 binding, the same media-off / missing-binding refusals as the scan. The purge
    // deletes through the MediaStore seam, so wrap the raw binding.
    const resolved = runtime.resolvedAssets;
    if (!resolved.enabled) {
      return fail(503, { error: 'Media is not enabled for this site.' } satisfies MediaBulkFailure);
    }
    const platformEnv = (event.platform as { env?: Record<string, unknown> } | undefined)?.env ?? {};
    const rawBucket = platformEnv[resolved.bucketBinding];
    if (!rawBucket) {
      return fail(503, { error: 'The media bucket is not bound.' } satisfies MediaBulkFailure);
    }
    const store = r2Store(rawBucket as R2Bucket);

    // Read the selected R2 keys and the typed confirm.
    const form = await event.request.formData();
    const keys = form.getAll('key').map(String);
    const confirm = String(form.get('confirm') ?? '');

    // The irreversible gate: the confirm must equal the selected count, and the set must be non-empty.
    // A mismatch or an empty set refuses and deletes NOTHING.
    if (keys.length === 0 || confirm !== String(keys.length)) {
      return fail(400, { error: 'Type the number of files to confirm the purge.' } satisfies MediaBulkFailure);
    }

    // Re-derive fresh against the current manifest, so a key claimed since the scan is never purged.
    const manifest = parseMediaManifest(parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));

    // THE fail-closed gate for the whole batch: one shared strict cross-branch usage index, symmetric
    // with the scan and the bulk delete. STRICT mode rethrows a branch-read failure, so a transient
    // branch read refuses the irreversible purge rather than letting a possibly-referenced byte be
    // treated as a true orphan. Build exactly one index, never one per key.
    let index: Awaited<ReturnType<typeof buildUsageIndex>>;
    try {
      index = await buildUsageIndex(backend, runtime.concepts, await readManifest(backend), { strict: true });
    } catch {
      return fail(503, { error: 'Could not verify where these files are used. Try again.' } satisfies MediaBulkFailure);
    }

    const purged: string[] = [];
    const skippedClaimed: string[] = [];
    const failed: { key: string; error: string }[] = [];
    for (const key of keys) {
      const hash = MEDIA_KEY_RE.exec(key)?.[1];
      // A key that does not match the grammar was never a real orphan key: drop it silently.
      if (hash === undefined) continue;
      // A hash that now has a manifest row was claimed since the scan: its bytes are a live asset now.
      if (manifest[hash]) {
        skippedClaimed.push(key);
        continue;
      }
      // A hash referenced on any open cairn/* branch backs an in-progress draft: skip it claimed too.
      if (index.has(hash)) {
        skippedClaimed.push(key);
        continue;
      }
      // Still orphaned: delete the object directly. No commit, there is no manifest row.
      try {
        await store.delete(key);
        purged.push(key);
      } catch (err) {
        failed.push({ key, error: err instanceof Error ? err.message : String(err) });
      }
    }

    log.info('media.orphans_purged', { editor: editor.email, purged: purged.length });
    return { purged, skippedClaimed, failed } satisfies MediaOrphanPurgeResult;
  }

  /**
   * Edit a committed asset's metadata: its display name, slug, and default alt. A single media.json
   *  row commit, with NO reference rewrite: the resolver and the delivery route key on the hash, so a
   *  rename never breaks an existing `media:` reference. The default alt is the asset's value for the
   *  next placement, never a propagating edit of the alt already committed in existing placements.
   */
  async function mediaUpdateAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = requireSession(event);
    const backend = resolveBackend(event);

    const form = await event.request.formData();
    const hash = String(form.get('hash') ?? '');
    if (!MEDIA_HASH_RE.test(hash)) throw error(400, 'Invalid media hash');

    const manifest = parseMediaManifest(parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));
    const row = manifest[hash];
    if (!row) {
      return fail(404, { error: 'That asset is not committed.' } satisfies MediaUpdateFailure);
    }

    const displayName = sanitizeField(String(form.get('displayName') ?? ''), MAX_DISPLAY_NAME);
    const slug = String(form.get('slug') ?? '').trim();
    const alt = sanitizeField(String(form.get('alt') ?? ''), MAX_ALT);
    if (!MEDIA_SLUG_RE.test(slug)) {
      return fail(400, { error: 'Enter a valid slug: lowercase letters, numbers, and hyphens.' } satisfies MediaUpdateFailure);
    }

    const edited: MediaEntry = { ...row, displayName: displayName || slug, slug, alt };
    const commitFields = { concept: 'media', id: hash, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [{ path: runtime.mediaManifestPath, content: serializeMediaManifest(upsertMediaEntry(manifest, edited)) }],
        { name: editor.displayName, email: editor.email },
        `Update media: ${edited.slug}`,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      commitFailure(commitFields, err, '/admin/media',
        'The media manifest changed since you opened it. Reload and try again.');
    }
    throw redirect(303, '/admin/media?updated=1');
  }

  /**
   * Build the canonical `media:` token for a replacement, treating a slug that fails the grammar (or
   *  an empty one) as absent so the bare-hash form is used. The slug is cosmetic: the resolver keys on
   *  the hash, so a missing slug still resolves. Shared by the preview and apply token construction.
   */
  function replacementToken(slug: string, hash: string): string {
    return mediaToken({ slug: MEDIA_SLUG_RE.test(slug) ? slug : null, hash });
  }

  /**
   * Preview a replace-in-place: the display-only fetch action (the 2a transport). It plans the rewrite
   *  of every published main entry that references `oldHash` to the new asset's `media:` token, enriches
   *  each with its title and permalink, and returns the plan plus the report-only cross-branch delta.
   *  It commits nothing. The plan runs strict (fail-closed): an unverifiable usage read returns a 503
   *  rather than a partial plan, so the confirm dialog never shows a count it cannot stand behind.
   *
   *  Wire contract: a fetch POST with the JSON body `{ oldHash, newHash, slug }`, the CSRF token in
   *  the `X-Cairn-CSRF` header (the raw-body transport, no form-CSRF), and a `MediaReplacePreviewPlan`
   *  returned as the 200 ActionResult the client reads. A refusal rides a `fail(status, ...)` envelope
   *  with the MediaReplaceFailure shape (the same fail shape the apply uses), so the client reads
   *  `type`/`status` from the body, never the HTTP status.
   */
  async function mediaReplacePreview(event: ContentEvent): Promise<ReturnType<typeof fail> | MediaReplacePreviewPlan> {
    // CSRF first: this is a raw-body (JSON) POST, so the header witness is the authority, like the
    // upload action. A failed check refuses before the session read or any GitHub call.
    if (!event.cookies || !validateCsrfHeader({ url: event.url, request: event.request, cookies: event.cookies })) {
      return fail(403, { error: 'csrf', hash: '', usage: [], foundIn: 0 } satisfies MediaReplaceFailure);
    }
    requireSession(event);

    // Parse the JSON body. A malformed body or a hash that fails the 16-hex grammar refuses with a 400
    // before any GitHub read. The slug is the OLD asset's: a replace keeps the name and changes only the
    // content hash, so the repointed token carries the existing slug (an invalid slug falls back to a
    // bare-hash token below). It is cosmetic for the preview display; the apply re-derives it server-side.
    let payload: { oldHash?: unknown; newHash?: unknown; slug?: unknown };
    try {
      payload = JSON.parse(await event.request.text());
    } catch {
      return fail(400, { error: 'Could not read the replace request.', hash: '', usage: [], foundIn: 0 } satisfies MediaReplaceFailure);
    }
    const oldHash = String(payload.oldHash ?? '');
    const newHash = String(payload.newHash ?? '');
    const slug = String(payload.slug ?? '');
    if (!MEDIA_HASH_RE.test(oldHash) || !MEDIA_HASH_RE.test(newHash)) {
      return fail(400, { error: 'Invalid media hash.', hash: oldHash, usage: [], foundIn: 0 } satisfies MediaReplaceFailure);
    }

    const backend = resolveBackend(event);
    const contentManifest = await readManifest(backend);
    const newToken = replacementToken(slug, newHash);

    // Plan the rewrite. The planner runs buildUsageIndex in STRICT mode, so an unverifiable branch read
    // throws out of here rather than degrading to an absent reference; catch it and fail closed, the
    // same posture the delete gate takes.
    let plan: Awaited<ReturnType<typeof planMediaRewrite<RepointPlacement>>>;
    try {
      plan = await planMediaRewrite<RepointPlacement>({
        backend,
        concepts: runtime.concepts,
        contentManifest,
        hash: oldHash,
        transform: (md) => repointMediaRef(md, oldHash, newToken),
      });
    } catch {
      return fail(503, {
        error: 'Could not verify where this asset is used. Try again.',
        hash: oldHash,
        usage: [],
        foundIn: 0,
      } satisfies MediaReplaceFailure);
    }

    // Enrich each planned entry with its title and permalink from the content manifest (the planner
    // carries neither). A planned entry always has a manifest row (the usage index is built from the
    // manifest), so the lookup hits; an id-only fallback keeps the type total if a row is ever absent.
    const byKey = new Map(contentManifest.entries.map((e) => [`${e.concept}/${e.id}`, e]));
    const entries: MediaReplacePreviewEntry[] = plan.entries.map((e) => {
      const row = byKey.get(`${e.concept}/${e.id}`);
      return {
        concept: e.concept,
        id: e.id,
        title: row?.title ?? e.id,
        permalink: row?.permalink,
        placements: e.placements,
      };
    });

    return { affectedCount: plan.affectedCount, entries, branchDelta: plan.branchDelta };
  }

  /**
   * Apply a replace-in-place: rewrite every published main entry that references the old asset to the
   *  new asset's `media:` token, and add the new media.json row, in ONE atomic commit. The plan is
   *  re-derived here from a FRESH read (never a client-passed plan), so a concurrent edit between the
   *  preview and the apply is rewritten too. EVERY replace is gated behind the typed-slug confirm
   *  (unlike delete, which only gates an in-use asset): a replace silently repoints published content,
   *  so it always demands the type-to-confirm. An empty stored slug is never satisfiable, exactly like
   *  delete. The plan runs strict, so an unverifiable usage read fails the replace closed (commits
   *  nothing) rather than rewriting some references and leaving others.
   *
   *  No R2 operation: the new bytes were already stored put-first by the upload action, and the old
   *  bytes are KEPT (the old row stays in media.json), so this action writes only to git and never
   *  resolves the bucket binding. It guards `resolvedAssets.enabled` for the media-off case only.
   */
  async function mediaReplaceApply(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = requireSession(event);
    const backend = resolveBackend(event);

    const form = await event.request.formData();
    const oldHash = String(form.get('oldHash') ?? '');
    const newHash = String(form.get('newHash') ?? '');
    if (!MEDIA_HASH_RE.test(oldHash) || !MEDIA_HASH_RE.test(newHash)) throw error(400, 'Invalid media hash');
    const confirmSlug = String(form.get('confirmSlug') ?? '');

    // The new asset's optimistic record rides the post (the same untrusted-record contract as save).
    // Find the row for newHash; its absence is a malformed or missing replacement, a 400.
    const record = parseMediaEntries(form.get('media')).find((r) => r.hash === newHash);
    if (!record) {
      return fail(400, {
        error: 'The replacement upload is missing or invalid.',
        hash: oldHash,
        usage: [],
        foundIn: 0,
      } satisfies MediaReplaceFailure);
    }

    // The old asset must be committed on main to be replaceable here. A branch-only upload has no main
    // row; it is replaced by editing its draft, not here.
    const manifest = parseMediaManifest(parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));
    const row = manifest[oldHash];
    if (!row) {
      return fail(404, {
        error: 'That asset is not committed. Discard its draft to remove an unpublished upload.',
        hash: oldHash,
        usage: [],
        foundIn: 0,
      } satisfies MediaReplaceFailure);
    }

    // Media-enabled guard only: replace does no R2 write (the new bytes are already stored, the old
    // bytes are kept), so there is no bucket binding to resolve. Media-off still refuses before any
    // git write.
    if (!runtime.resolvedAssets.enabled) {
      return fail(503, { error: 'Media is not enabled for this site.', hash: oldHash, usage: [], foundIn: 0 } satisfies MediaReplaceFailure);
    }

    // Re-derive the plan from a FRESH content-manifest read (never trust a client plan). The planner
    // runs strict, so an unverifiable branch read throws; catch it and fail the replace closed (commit
    // nothing) rather than rewriting a partial set of references. The repointed token keeps the OLD
    // asset's slug (server-authoritative `row.slug`): a replace changes only the content hash, so the
    // name in every reference stays the same (the new bytes resolve by hash regardless of the slug).
    const newToken = replacementToken(row.slug, record.hash);
    let plan: Awaited<ReturnType<typeof planMediaRewrite<RepointPlacement>>>;
    try {
      plan = await planMediaRewrite<RepointPlacement>({
        backend,
        concepts: runtime.concepts,
        contentManifest: await readManifest(backend),
        hash: oldHash,
        transform: (md) => repointMediaRef(md, oldHash, newToken),
      });
    } catch {
      return fail(503, {
        error: 'Could not verify where this asset is used. Try again.',
        hash: oldHash,
        usage: [],
        foundIn: 0,
      } satisfies MediaReplaceFailure);
    }

    // The typed-slug gate, ALWAYS required for replace. A blank stored slug can never be satisfied by
    // the empty default, so it is treated as never-confirmed (the confirm cannot be bypassed).
    if (row.slug === '' || confirmSlug !== row.slug) {
      log.warn('media.replace_blocked', { editor: editor.email, hash: oldHash, foundIn: plan.affectedCount });
      return fail(409, {
        error: `Type ${row.slug} to confirm replacing it in ${plan.affectedCount} ${plan.affectedCount === 1 ? 'entry' : 'entries'}.`,
        hash: oldHash,
        usage: [],
        foundIn: plan.affectedCount,
      } satisfies MediaReplaceFailure);
    }

    // Commit atomically: every rewritten entry plus the new media.json row (the OLD row stays, so the
    // old bytes keep a row). One commit, the same conflict handling as delete.
    const changes: FileChange[] = plan.entries.map((e) => ({ path: e.path, content: e.newMarkdown }));
    changes.push({ path: runtime.mediaManifestPath, content: serializeMediaManifest(upsertMediaEntry(manifest, record)) });

    const commitFields = { concept: 'media', id: oldHash, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        changes,
        { name: editor.displayName, email: editor.email },
        `Replace media: ${row.slug}`,
      );
      log.info('media.replaced', { editor: editor.email, oldHash, newHash, affected: plan.affectedCount });
    } catch (err) {
      commitFailure(commitFields, err, '/admin/media',
        'The site changed since you opened it. Reload and try again.');
    }
    throw redirect(303, '/admin/media?replaced=1');
  }

  /**
   * Preview an alt-propagation: the display-only fetch action (the 2a transport). It plans filling the
   *  asset's default alt across every published main entry that references it, bucketing each placement
   *  (a will-fill empty alt, a customized alt left as-is, a decorative hero skipped), and returns the
   *  enriched entries, the report-only cross-branch delta, and the bucket counts. It commits nothing.
   *  The plan runs strict (fail-closed): an unverifiable usage read returns a 503 rather than a partial
   *  plan, so the dialog never shows a count it cannot stand behind.
   *
   *  Wire contract: a fetch POST with the JSON body `{ hash }`, the CSRF token in the `X-Cairn-CSRF`
   *  header (the raw-body transport, no form-CSRF), and a `MediaAltPreviewPlan` returned as the 200
   *  ActionResult the client reads. A refusal rides a `fail(status, ...)` envelope with the
   *  MediaAltPropagateFailure shape, so the client reads `type`/`status` from the body.
   */
  async function mediaAltPreview(event: ContentEvent): Promise<ReturnType<typeof fail> | MediaAltPreviewPlan> {
    // CSRF first: a raw-body (JSON) POST, so the header witness is the authority, like the upload and
    // replace-preview actions. A failed check refuses before the session read or any GitHub call.
    if (!event.cookies || !validateCsrfHeader({ url: event.url, request: event.request, cookies: event.cookies })) {
      return fail(403, { error: 'csrf' } satisfies MediaAltPropagateFailure);
    }
    requireSession(event);

    let payload: { hash?: unknown };
    try {
      payload = JSON.parse(await event.request.text());
    } catch {
      return fail(400, { error: 'Could not read the request.' } satisfies MediaAltPropagateFailure);
    }
    const hash = String(payload.hash ?? '');
    if (!MEDIA_HASH_RE.test(hash)) {
      return fail(400, { error: 'Invalid media hash.' } satisfies MediaAltPropagateFailure);
    }

    const backend = resolveBackend(event);
    // The default alt to propagate is the asset's manifest row value (set via mediaUpdateAction). An
    // asset with no committed row has no default alt to push, so refuse.
    const mediaManifest = parseMediaManifest(parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));
    const row = mediaManifest[hash];
    if (!row) {
      return fail(404, { error: 'That asset is not committed.' } satisfies MediaAltPropagateFailure);
    }

    // Plan the fill. The planner runs strict, so an unverifiable branch read throws out of here; catch
    // it and fail closed, the same posture replace and delete take.
    const contentManifest = await readManifest(backend);
    let plan: Awaited<ReturnType<typeof planMediaRewrite<AltPlacement>>>;
    try {
      plan = await planMediaRewrite<AltPlacement>({
        backend,
        concepts: runtime.concepts,
        contentManifest,
        hash,
        transform: (md) => fillAltForHash(md, hash, row.alt, { overwrite: false }),
      });
    } catch {
      return fail(503, { error: 'Could not verify where this asset is used. Try again.' } satisfies MediaAltPropagateFailure);
    }

    // Enrich each planned entry with its title and permalink from the content manifest (the planner
    // carries neither), and aggregate the bucket counts across every placement.
    const byKey = new Map(contentManifest.entries.map((e) => [`${e.concept}/${e.id}`, e]));
    const counts = { willFill: 0, customized: 0, decorativeSkipped: 0 };
    const entries: MediaAltPreviewEntry[] = plan.entries.map((e) => {
      for (const p of e.placements) {
        if (p.bucket === 'will-fill') counts.willFill += 1;
        else if (p.bucket === 'customized') counts.customized += 1;
        else counts.decorativeSkipped += 1;
      }
      const manifestRow = byKey.get(`${e.concept}/${e.id}`);
      return {
        concept: e.concept,
        id: e.id,
        title: manifestRow?.title ?? e.id,
        permalink: manifestRow?.permalink,
        placements: e.placements,
      };
    });

    return { entries, branchDelta: plan.branchDelta, counts };
  }

  /**
   * Apply an alt-propagation: fill the asset's default alt into every empty placement across the
   *  published corpus (and, on the `overwrite` opt-in, customized placements too), in ONE atomic
   *  commit. The plan is re-derived from a FRESH read (never a client plan). Three deliberate
   *  differences from replace: there is NO typed-slug gate (alt fill is reversible and frequent), there
   *  is NO media.json change (the default alt is READ from the row, never rewritten there), and a
   *  decorative hero is never written regardless of `overwrite` (enforced inside fillAltForHash). A run
   *  that changes nothing commits nothing and still redirects (a no-op success). It fails the operation
   *  closed on an unverifiable usage read, and writes only entry files in git (no R2 op).
   */
  async function mediaAltApply(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = requireSession(event);
    const backend = resolveBackend(event);

    const form = await event.request.formData();
    const hash = String(form.get('hash') ?? '');
    if (!MEDIA_HASH_RE.test(hash)) throw error(400, 'Invalid media hash');
    // The opt-in to also overwrite customized alts; absent (the default) leaves custom alts alone.
    const overwrite = form.get('overwrite') === 'on' || form.get('overwrite') === 'true';

    const mediaManifest = parseMediaManifest(parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));
    const row = mediaManifest[hash];
    if (!row) {
      return fail(404, { error: 'That asset is not committed.' } satisfies MediaAltPropagateFailure);
    }

    // Media-enabled guard only: alt fill does no R2 write, so there is no bucket binding to resolve.
    if (!runtime.resolvedAssets.enabled) {
      return fail(503, { error: 'Media is not enabled for this site.' } satisfies MediaAltPropagateFailure);
    }

    // Re-derive from a FRESH content-manifest read with the actual overwrite choice. Strict, so an
    // unverifiable branch read throws; catch it and fail closed (commit nothing).
    let plan: Awaited<ReturnType<typeof planMediaRewrite<AltPlacement>>>;
    try {
      plan = await planMediaRewrite<AltPlacement>({
        backend,
        concepts: runtime.concepts,
        contentManifest: await readManifest(backend),
        hash,
        transform: (md) => fillAltForHash(md, hash, row.alt, { overwrite }),
      });
    } catch {
      return fail(503, { error: 'Could not verify where this asset is used. Try again.' } satisfies MediaAltPropagateFailure);
    }

    // Commit only the entries the transform actually changed. A reported-but-unchanged placement (a
    // kept custom alt, a decorative hero) has after === before, so an entry with only those is a no-op
    // and is excluded. Nothing changed at all is a successful no-op: skip the commit, still redirect.
    const changed = plan.entries.filter((e) => e.placements.some((p) => p.after !== p.before));
    if (changed.length === 0) throw redirect(303, '/admin/media?altPropagated=1');

    const changes: FileChange[] = changed.map((e) => ({ path: e.path, content: e.newMarkdown }));
    const commitFields = { concept: 'media', id: hash, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        changes,
        { name: editor.displayName, email: editor.email },
        `Propagate alt: ${row.slug}`,
      );
      log.info('media.alt_propagated', { editor: editor.email, hash, overwrite, written: changed.length });
    } catch (err) {
      commitFailure(commitFields, err, '/admin/media',
        'The site changed since you opened it. Reload and try again.');
    }
    throw redirect(303, '/admin/media?altPropagated=1');
  }

  /**
   * The cap on a personal-dictionary word, matched by isValidDictionaryWord. A word is one line, so
   *  this bounds an abusive input; the real authority is the per-character validation, which rejects
   *  whitespace and control bytes so a body can never inject an extra line into the committed file.
   */
  const MAX_DICTIONARY_WORD = 64;
  /**
   * The cap on the words a single add request carries: an editor adds a handful at save time, never
   *  a flood. Past this the body is treated as abusive and the surplus is dropped.
   */
  const MAX_DICTIONARY_BATCH = 100;

  /**
   * Read the committed personal dictionary, merge the validated additions in sorted order, and commit
   *  the canonical file back. Shared by the first attempt and the post-conflict retry, so both re-read
   *  the head and re-merge the same additions; the merge is order-independent, so a concurrent editor's
   *  word that already landed is preserved and the result is the same sorted set regardless of order.
   *  Returns the merged word list. Throws CommitConflictError (via backend.commit) when the branch
   *  moves under the commit, which the caller catches to retry once.
   */
  async function mergeAndCommitDictionary(backend: Backend, additions: string[], editor: Editor): Promise<string[]> {
    const path = dictionaryFilePath();
    // The existing file as its canonical sorted set, so a no-op add is detected against the same
    // normalization the commit would write (an already-sorted file never re-commits just to reorder).
    const canonicalExisting = mergeDictionaryWords(parseDictionary(await backend.readFile(path, backend.defaultBranch)), []);
    const merged = mergeDictionaryWords(canonicalExisting, additions);
    // Nothing new (every addition was already present): skip the commit so an idempotent add never
    // pushes an empty commit that would redeploy the site. The merged set is still returned so the
    // client reconciles its pending additions away.
    if (merged.length === canonicalExisting.length) return merged;
    await backend.commit(
      backend.defaultBranch,
      [{ path, content: serializeDictionary(merged) }],
      { name: editor.displayName, email: editor.email },
      `Add to dictionary: ${additions.join(', ')}`,
    );
    return merged;
  }

  /**
   * The repo-relative site-config path the settings save reads and commits. It is the same committed
   *  YAML the nav editor edits, so it comes from the configured nav menu first and falls back to the
   *  scaffold default when no menu is configured.
   */
  function siteConfigPath(): string {
    return runtime.navMenu?.configPath ?? DEFAULT_SITE_CONFIG_PATH;
  }

  /**
   * Read whether the Anthropic API key secret is present in the load's env. A presence flag for the
   *  truthful visibility gate, never the key itself: the key is a Worker secret, so this only reports
   *  that a non-empty `ANTHROPIC_API_KEY` exists and the value never leaves the server.
   */
  function keyConfigured(event: ContentEvent): boolean {
    const env = (event.platform?.env ?? {}) as Record<string, unknown>;
    return typeof env.ANTHROPIC_API_KEY === 'string' && env.ANTHROPIC_API_KEY.length > 0;
  }

  /**
   * Load the two-tier tidy settings (spec 2.8, Task 15). The developer tier (enabled, key, model) is
   *  read-only; the editor tier is the resolved conventions block. The visibility gate is truthful: the
   *  `enabled` flag is true only when `tidy.enabled` is set AND the key is present, so the screen renders
   *  the convention list only then and the honest gate note otherwise. No secret is returned: only a
   *  presence flag for the key. The conventions come straight from the runtime config (the same source
   *  the tidy action's prompt reads), so the screen and the prompt can never diverge.
   */
  function settingsLoad(event: ContentEvent): SettingsData {
    requireSession(event);
    const tidy = runtime.tidy;
    const tidyEnabled = tidy?.enabled === true;
    const keyPresent = keyConfigured(event);
    const model = tidy?.model || DEFAULT_TIDY_MODEL;
    return {
      enabled: tidyEnabled && keyPresent,
      tidyEnabled,
      keyConfigured: keyPresent,
      model,
      modelLabel: tidyModelLabel(model),
      conventions: resolveTidyConventions(tidy?.conventions),
      saved: event.url.searchParams.get('saved') === '1',
      error: event.url.searchParams.get('error'),
    };
  }

  /**
   * Save the editor-tier tidy conventions: validate the posted block, then read-modify-commit it into
   *  the same committed YAML the nav editor writes, with the session editor as author. The transport is
   *  the nav save's exactly: a form POST carrying the conventions JSON, a head-guarded
   *  `backend.commit`, and a stale-head `isConflict` bounced back as a reload prompt. Only the conventions
   *  block is written (setTidy leaves `tidy.enabled` and `tidy.model` untouched), so an editor's save can
   *  never flip the developer-tier deploy facts. The save refuses before any commit when tidy is not
   *  enabled, so the gate state's absent editor tier can never be saved past.
   */
  async function settingsSave(event: ContentEvent): Promise<never> {
    const editor = requireSession(event);
    // The editor tier does not exist when tidy is off, so a save in that state is a 404 (no editable
    // surface to commit), the server half of the truthful gate.
    if (runtime.tidy?.enabled !== true) throw error(404, 'Tidy is not enabled for this site');

    const form = await event.request.formData();
    let conventions: TidyConventions;
    try {
      conventions = validateTidyConventions(JSON.parse(String(form.get('conventions') ?? '{}')));
    } catch (err) {
      const message = err instanceof TidyConventionsError ? err.message : 'Invalid tidy settings';
      throw redirect(303, `/admin/settings?error=${encodeURIComponent(message)}`);
    }

    const path = siteConfigPath();
    const backend = resolveBackend(event);
    // Read the head BEFORE the content, so this expectedHead is at-or-before the bytes the commit
    // merges. The settings write lands on the default branch and triggers a deploy, so it is
    // fail-closed: a concurrent commit to the config moves the head off this value and the commit
    // throws a conflict, surfacing the reload-and-reapply prompt below rather than a last-writer-wins.
    const head = await backend.branchHead(backend.defaultBranch);
    const raw = await backend.readFile(path, backend.defaultBranch);
    if (raw === null) throw error(404, 'Site config not found');
    // Parse first so a malformed file fails before the write rather than committing onto a broken base.
    parseSiteConfig(raw);

    const commitFields = { concept: 'settings', id: 'tidy', editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [{ path, content: setTidy(raw, conventions) }],
        { name: editor.displayName, email: editor.email },
        'Update tidy settings',
        head ?? undefined,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      if (isConflict(err)) {
        log.warn('commit.failed', { ...commitFields, reason: 'conflict' });
        const message = 'The site config changed since you opened it. Reload and reapply your edits.';
        throw redirect(303, `/admin/settings?error=${encodeURIComponent(message)}`);
      }
      log.error('commit.failed', { ...commitFields, error: String(err) });
      throw err;
    }

    throw redirect(303, '/admin/settings?saved=1');
  }

  /**
   * Load the tag-vocabulary admin screen (Plan 3): the committed vocabulary plus a per-value
   *  cross-branch usage count and the in-use-but-unlisted seed set. The committed list is read on the
   *  default branch and degrades to `[]` on a read or parse failure, mirroring navLoad, so the screen
   *  still opens. The usage overlay is best-effort and separate, mirroring mediaLibraryLoad: the
   *  manifest read and the non-strict buildTagUsageIndex share one try/catch that degrades `usage` to
   *  `{}` and `unlisted` to `[]` on any failure, keeping the committed vocabulary visible. The safety
   *  boundary is the strict gate on vocabularySave, never this load, so degrading here is correct.
   */
  async function vocabularyLoad(event: ContentEvent): Promise<VocabularyLoadData> {
    requireSession(event);
    const backend = resolveBackend(event);

    let vocabulary: VocabularyEntry[] = [];
    let raw: string | null = null;
    try {
      raw = await backend.readFile(siteConfigPath(), backend.defaultBranch);
    } catch {
      // An unreadable config degrades to an empty vocabulary; the first save writes a clean list.
      raw = null;
    }
    if (raw !== null) {
      try {
        vocabulary = extractVocabulary(parseSiteConfig(raw));
      } catch (err) {
        // A malformed config keeps the same degrade rather than failing the screen closed; the
        // swallow names the operator fault in the log, as navLoad does.
        log.error('config.invalid', {
          conditionId: 'config.site-config-invalid',
          error: String(err),
        });
        vocabulary = [];
      }
    }

    // The usage overlay is best-effort: a transient manifest or branch-list failure must keep the
    // committed vocabulary visible, never 500 the whole screen (the dispatcher has no load-level
    // try/catch, and the non-strict index still rethrows a listBranches failure). The strict gate on
    // the save is the safety boundary, not this read.
    let usage: Record<string, number> = {};
    let unlisted: { value: string; count: number }[] = [];
    try {
      const manifestRaw = await backend.readFile(runtime.manifestPath, backend.defaultBranch);
      const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);
      const usageIndex = await buildTagUsageIndex(backend, runtime.concepts, manifest, {});
      const listed = new Set(vocabulary.map((entry) => entry.value));
      usage = Object.fromEntries(vocabulary.map((entry) => [entry.value, usageIndex.get(entry.value)?.length ?? 0]));
      unlisted = [...usageIndex]
        .filter(([value]) => !listed.has(value))
        .map(([value, rows]) => ({ value, count: rows.length }))
        .sort((a, b) => a.value.localeCompare(b.value));
    } catch {
      usage = {};
      unlisted = [];
    }

    return { vocabulary, usage, unlisted };
  }

  /**
   * Save the tag vocabulary (Plan 3): validate the posted list, gate a delete on cross-branch usage
   *  failing closed, then read-modify-commit the `vocabulary` key into the same committed YAML the
   *  nav and settings saves write. The transport is settingsSave's exactly: a form POST carrying the
   *  vocabulary JSON, a head-guarded backend.commit, and a stale-head isConflict bounced back as a
   *  reload prompt. The delete gate is the safety boundary: a removed value still in use anywhere the
   *  strict index reads (main plus open cairn/* branches) is rejected by name, so a still-used tag can
   *  never be deleted out from under a draft. Rename (label change, same value) and add always commit.
   */
  async function vocabularySave(event: ContentEvent): Promise<never> {
    const editor = requireSession(event);

    const form = await event.request.formData();
    let posted: VocabularyEntry[];
    try {
      posted = validateVocabulary(JSON.parse(String(form.get('vocabulary') ?? '[]')));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid vocabulary';
      throw redirect(303, `/admin/vocabulary?error=${encodeURIComponent(message)}`);
    }

    const path = siteConfigPath();
    const backend = resolveBackend(event);
    // Read the head BEFORE the content, so this expectedHead is at-or-before the bytes the commit
    // merges. The vocabulary write lands on the default branch and triggers a deploy, so it is
    // fail-closed: a concurrent commit to the config moves the head off this value and the commit
    // throws a conflict, surfacing the reload-and-reapply prompt below rather than a last-writer-wins.
    const head = await backend.branchHead(backend.defaultBranch);
    const raw = await backend.readFile(path, backend.defaultBranch);
    if (raw === null) throw error(404, 'Site config not found');

    // The delete gate: any value in the current vocabulary but absent from the posted one is being
    // removed, and a removed value still in use anywhere the strict index reads must block the save.
    const current = extractVocabulary(parseSiteConfig(raw));
    const postedValues = new Set(posted.map((entry) => entry.value));
    const removed = current.filter((entry) => !postedValues.has(entry.value)).map((entry) => entry.value);
    if (removed.length > 0) {
      const manifestRaw = await backend.readFile(runtime.manifestPath, backend.defaultBranch);
      const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);
      // strict: a transient branch-read failure must not read a still-used value as free, so it
      // rethrows and the save fails rather than deleting an in-use tag.
      const usageIndex = await buildTagUsageIndex(backend, runtime.concepts, manifest, { strict: true });
      const inUse = removed.find((value) => (usageIndex.get(value)?.length ?? 0) > 0);
      if (inUse !== undefined) {
        const message = `The tag "${inUse}" is still in use, so it cannot be deleted. Remove it from your content first.`;
        throw redirect(303, `/admin/vocabulary?error=${encodeURIComponent(message)}`);
      }
    }

    const commitFields = { concept: 'vocabulary', id: 'site-config', editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [{ path, content: setVocabulary(raw, posted) }],
        { name: editor.displayName, email: editor.email },
        'Update tag vocabulary',
        head ?? undefined,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      if (isConflict(err)) {
        log.warn('commit.failed', { ...commitFields, reason: 'conflict' });
        const message = 'The site config changed since you opened it. Reload and reapply your edits.';
        throw redirect(303, `/admin/vocabulary?error=${encodeURIComponent(message)}`);
      }
      log.error('commit.failed', { ...commitFields, error: String(err) });
      throw err;
    }

    throw redirect(303, '/admin/vocabulary?saved=1');
  }

  /**
   * Add a word (or batch) to the git-committed personal dictionary (spec 1.6). The transport mirrors
   *  the media raw-body actions exactly: a `text/plain` POST, the CSRF token in `X-Cairn-CSRF` validated
   *  by validateCsrfHeader (CSRF first, then the session), and a small JSON body `{ word }` or
   *  `{ words }`. It reads the current file from the default branch, inserts the validated words in
   *  sorted order if absent (idempotent), and commits through the GitHub-App pipeline.
   *
   *  The commit is SHA-guarded with commit-and-retry: backend.commit throws CommitConflictError when the
   *  branch moved under it, which is caught here to re-read the new head, re-merge the same additions
   *  (the sorted insert is order-independent, so a concurrent editor's word is preserved), and retry
   *  once. The response is the merged word list, so the client drops the now-committed words from its
   *  pending set; a refusal rides a `fail` envelope the client reads by `type`/`status`.
   *
   *  Input validation is load-bearing here: this commits to the repo from request input, so every word
   *  is length-bounded and rejected if it carries whitespace or control characters (a word is one
   *  line), and the batch is capped. A body that yields no valid word refuses with a 400 and commits
   *  nothing, so the committed file can never gain an injected or empty line.
   */
  async function addDictionaryWord(event: ContentEvent): Promise<ReturnType<typeof fail> | DictionaryAddResult> {
    // CSRF first: a raw-body (JSON) POST, so the header witness is the authority, like the upload and
    // media actions. A failed check refuses before the session read or any GitHub call.
    if (!event.cookies || !validateCsrfHeader({ url: event.url, request: event.request, cookies: event.cookies })) {
      return fail(403, { error: 'csrf' } satisfies DictionaryAddFailure);
    }
    const editor = requireSession(event);

    let payload: { word?: unknown; words?: unknown };
    try {
      payload = JSON.parse(await event.request.text());
    } catch {
      return fail(400, { error: 'Could not read the dictionary request.' } satisfies DictionaryAddFailure);
    }

    // Collect the candidate words from `word` and/or `words`, keep only the strings, validate each
    // against the one-line word grammar, dedupe, and cap the batch. A body with no valid word refuses.
    const raw = [
      ...(typeof payload.word === 'string' ? [payload.word] : []),
      ...(Array.isArray(payload.words) ? payload.words.filter((w): w is string => typeof w === 'string') : []),
    ];
    const additions = [...new Set(raw.filter((w) => isValidDictionaryWord(w, MAX_DICTIONARY_WORD)))].slice(0, MAX_DICTIONARY_BATCH);
    if (additions.length === 0) {
      return fail(400, { error: 'No valid word to add to the dictionary.' } satisfies DictionaryAddFailure);
    }

    const backend = resolveBackend(event);
    const commitFields = { concept: 'dictionary', id: additions[0]!, editor: editor.email };
    try {
      const words = await mergeAndCommitDictionary(backend, additions, editor);
      log.info('dictionary.added', { editor: editor.email, words: additions });
      return { words };
    } catch (err) {
      if (!isConflict(err)) throw err;
      // The branch moved under the commit. Re-read the new head and re-merge the same additions, then
      // retry once. The merge is order-independent, so a concurrent editor's word that landed in the
      // window is preserved and the two adds converge on the same sorted set.
      try {
        const words = await mergeAndCommitDictionary(backend, additions, editor);
        log.info('dictionary.added', { editor: editor.email, words: additions, retried: true });
        return { words };
      } catch (retryErr) {
        if (!isConflict(retryErr)) throw retryErr;
        // A second conflict: give up rather than loop. The client keeps the words in its pending set
        // for the session and re-attempts on the next save, so the word is never silently dropped.
        log.warn('dictionary.add_conflict', { editor: editor.email, words: additions });
        return fail(409, { error: 'The dictionary changed while saving. It will retry on the next save.' } satisfies DictionaryAddFailure);
      }
    }
  }

  /**
   * Tidy: a light LLM copy-edit of the author's markdown (spec 2.1). The first remote model call in
   *  the library, so this is the highest-blast-radius server action: untrusted content and the Anthropic
   *  API key. The transport mirrors the media raw-body actions (a `text/plain` POST carrying JSON
   *  `{ text, scope }`, the CSRF token in `X-Cairn-CSRF`, the response deserialized by the client), with
   *  abort/timeout/deadline the media calls did not need: a tidy call to Sonnet on a full entry can run
   *  many seconds.
   *
   *  Gate order (every refusal happens before the next step, so a refused request spends nothing):
   *    1. validateCsrfHeader FIRST (the header witness is the authority for a raw-body POST).
   *    2. requireSession (an expired session throws the manual-redirect 303 the client reads as status-0).
   *    3. Read the key and config; refuse fail(503) if tidy is disabled or the key is missing.
   *    4. Parse and bound the body; refuse fail(400) on malformed JSON, fail(413) on an over-long text.
   *    5. Only then build the prompt and call the model, bounded by the Worker deadline.
   *
   *  The untrusted text rides as the user message, never interpolated into the system prompt; the
   *  prompt's injection framing (Task 10) treats it as data. The API key never leaves the action: it is
   *  not returned and not logged, and the log line carries no content. The action commits NOTHING, so a
   *  failed, aborted, or refused tidy can never corrupt the entry; the diff is computed on the client
   *  (Task 12), so the server stays a thin model-call boundary.
   */
  async function tidyAction(event: ContentEvent): Promise<ReturnType<typeof fail> | TidyResult> {
    // CSRF first: a raw-body (JSON) POST, so the header witness is the authority. A failed check refuses
    // before the session read and before any model call.
    if (!event.cookies || !validateCsrfHeader({ url: event.url, request: event.request, cookies: event.cookies })) {
      return fail(403, { error: 'csrf' } satisfies TidyFailure);
    }
    const editor = requireSession(event);

    // Fail-fast: refuse before any model call if tidy is off or the key is missing. The model is read
    // from config (a stated fact in this tier); a missing key is the "not enabled" refusal. No secret is
    // ever returned or logged.
    const tidy = runtime.tidy;
    if (!tidy?.enabled) {
      return fail(503, { error: 'Tidy is not enabled for this site.' } satisfies TidyFailure);
    }
    const env = (event.platform?.env ?? {}) as Record<string, unknown>;
    const apiKey = typeof env.ANTHROPIC_API_KEY === 'string' ? env.ANTHROPIC_API_KEY : '';
    if (!apiKey) {
      return fail(503, { error: 'Tidy is not configured: the Anthropic API key is missing.' } satisfies TidyFailure);
    }

    // Parse and bound the body before the call. A malformed body refuses 400; an over-long text refuses
    // 413 (tidy a selection instead), so no over-long input ever spends a token or risks the deadline.
    let payload: { text?: unknown; scope?: unknown };
    try {
      payload = JSON.parse(await event.request.text());
    } catch {
      return fail(400, { error: 'Could not read the tidy request.' } satisfies TidyFailure);
    }
    const text = typeof payload.text === 'string' ? payload.text : '';
    if (text.length === 0) {
      return fail(400, { error: 'No text to tidy.' } satisfies TidyFailure);
    }
    if (text.length > MAX_TIDY_CHARS) {
      return fail(413, { error: 'This is too long to tidy at once. Select a passage and tidy that instead.' } satisfies TidyFailure);
    }

    // Build the system prompt from the resolved conventions (Task 10). The prompt is built from config,
    // never from the author's text, so the untrusted text cannot reshape the instructions.
    const system = buildTidyPrompt(resolveTidyConventions(tidy.conventions));
    const model = tidy.model || DEFAULT_TIDY_MODEL;
    // max_tokens sized to comfortably exceed the input token count: a proofread runs at roughly input
    // length, never lowballed. The character cap is ~6k input tokens, so this leaves generous headroom.
    const maxTokens = 16_000;

    // Bound the model call with the Worker's own deadline (shorter than the platform limit), so a slow
    // call becomes a retryable fail(502) rather than a platform timeout. The client also drives its own
    // AbortController (Cancel + a bounded timeout, Task 14); this action accepts an aborted request
    // cleanly by mapping any abort to the same fail(502).
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), tidyTimeoutMs);
    let message: Awaited<ReturnType<TidyClient['messages']['create']>>;
    try {
      const client = anthropicClient({ apiKey });
      message = await client.messages.create(
        {
          model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: text }],
        },
        // The signal rides the request options, so the deadline timer above actually cancels the call.
        { signal: controller.signal },
      );
    } catch (err) {
      // A deadline overrun, a client abort, or a model error (rate limit, overload, 5xx) all map to the
      // retryable fail(502). The error string is not surfaced to the client (it may carry internal
      // detail); the log line carries the editor and the kind, never the key or the content.
      log.warn('tidy.error', { editor: editor.email, model, aborted: controller.signal.aborted });
      return fail(502, { error: 'Tidy could not finish. Try again.' } satisfies TidyFailure);
    } finally {
      clearTimeout(timer);
    }

    // A model refusal (the streaming-classifier intervention) is a clean fail(422): the author's text is
    // untouched, so the editor can leave it as-is.
    if (message.stop_reason === 'refusal') {
      log.warn('tidy.refused', { editor: editor.email, model });
      return fail(422, { error: 'Tidy declined to edit this text.' } satisfies TidyFailure);
    }

    // Read the output as plain text: concatenate the text blocks (a normal response is one). An empty
    // result is treated as a model error rather than silently returning an empty document.
    const corrected = message.content
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text ?? '')
      .join('');
    if (corrected.length === 0) {
      log.warn('tidy.empty', { editor: editor.email, model });
      return fail(502, { error: 'Tidy returned nothing. Try again.' } satisfies TidyFailure);
    }

    log.info('tidy.done', { editor: editor.email, model: message.model, usage: message.usage });
    return { corrected, model: message.model, usage: message.usage };
  }

  return { shellPayload, helpLoad, indexRedirect, listLoad, mediaLibraryLoad, settingsLoad, settingsSave, vocabularyLoad, vocabularySave, createAction, editLoad, saveAction, publishAction, publishAllAction, discardAction, deleteAction, listDeleteAction, renameAction, uploadAction, mediaLibraryUpload, mediaDeleteAction, mediaBulkDelete, mediaOrphanScan, mediaPurgeOrphans, mediaUpdateAction, mediaReplacePreview, mediaReplaceApply, mediaAltPreview, mediaAltApply, addDictionaryWord, tidyAction };
}

/**
 * The cap, in characters, on the stored alt text. The human fields are display copy, not content,
 *  so a generous cap rejects only abuse-scale input.
 */
const MAX_ALT = 160;
/** The cap, in characters, on the stored display name. */
const MAX_DISPLAY_NAME = 120;
/** The cap, in characters, on the stored original filename. */
const MAX_ORIGINAL_FILENAME = 120;
/** The largest pixel dimension kept; anything larger is treated as bogus and clamped to null. */
const MAX_DIMENSION = 60000;

/**
 * Decode a percent-encoded header value, yielding `''` on a malformed sequence or an absent header,
 *  so a hostile `X-Cairn-*` value cannot throw past the gate.
 */
function safeDecode(value: string | null): string {
  if (value === null) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

/**
 * The basename of a decoded filename: the final path segment after any `/` or `\`. A client value
 *  of `../../evil.png` yields `evil.png`, so no path component reaches the stored record.
 */
function basename(name: string): string {
  const parts = name.split(/[/\\]/);
  return parts[parts.length - 1];
}

/**
 * Sort key for a where-used row's origin: published rows rank before branch rows, so the in-use
 *  refusal lists "Published on the site" first, then the edit-branch references.
 */
function originRank(entry: UsageEntry): number {
  return entry.origin.kind === 'published' ? 0 : 1;
}

/**
 * A where-used row's branch name for the secondary sort (the empty string for a published row,
 *  which sorts ahead of any branch by `originRank` already).
 */
function branchKey(entry: UsageEntry): string {
  return entry.origin.kind === 'branch' ? entry.origin.branch : '';
}

/**
 * The distinct-entry count behind a where-used set: a published use and an edit-branch edit of the
 *  same entry are two rows but one distinct entry, so count by concept/id.
 */
function distinctEntryCount(rows: UsageEntry[]): number {
  return new Set(rows.map((e) => `${e.concept}/${e.id}`)).size;
}

/**
 * Strip control characters from a human field and cap it at `max` characters. Control characters
 *  (C0 and DEL) never belong in display copy and could corrupt a log line or a committed JSON.
 */
function sanitizeField(value: string, max: number): string {
   
  return value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
}

/**
 * Parse an advisory pixel dimension header. A valid integer in `[1, MAX_DIMENSION]` is kept; an
 *  absent, non-numeric, or out-of-range value becomes null (MediaEntry dimensions are `number | null`).
 */
function clampDimension(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_DIMENSION) return null;
  return n;
}
