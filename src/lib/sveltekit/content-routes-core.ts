// cairn-cms: the core content-entry loads and actions (the admin shell payload, the Help home, the
// concept list, and the create/edit/save/publish/discard/delete/rename cycle for a single entry).
// createCoreActions closes over the shared ContentRoutesContext (content-routes-context.ts) built
// once by createContentRoutes, so a shim stays one line: `export const load = routes.editLoad`.
import { redirect, error, fail } from '@sveltejs/kit';
import { findConcept, FRAGMENTS_CONCEPT_ID } from '../content/concepts.js';
import { extractCairnLinks, formatCairnToken, rewriteCairnLink } from '../content/links.js';
import { extractIncludes, rewriteIncludeDirective } from '../content/includes.js';
import { extractReferenceEdges, rewriteFrontmatterReference } from '../content/references.js';
import { buildReferenceIndex } from '../content/reference-index.js';
import { frontmatterFromForm, formValues, parseMarkdown, dateInputValue, serializeMarkdown } from '../content/frontmatter.js';
import { initialValues } from '../content/fieldset.js';
import { resolveTaxonomyField, coerceTags } from '../content/taxonomy.js';
import { resolveAllowed, closeTaxonomyField, enforceTaxonomy, unlistedTags } from '../content/taxonomy-enforce.js';
import { deriveExcerpt } from '../content/excerpt.js';
import { asString, asDate, entryIdentity } from '../content/identity.js';
import { permalinkUsesDateToken } from '../content/url-policy.js';
import { buildAddressIndex, mainAddressIndex, addressCollision, type AdvisoryNotice, type AddressEntry } from '../content/advisories.js';
import { isValidId, slugify, filenameFromId, composeDatedId, slugFromId, renameId } from '../content/ids.js';
import type { Backend } from '../github/backend.js';
import type { FileChange } from '../github/repo.js';
import { PENDING_PREFIX, pendingBranch, parsePendingBranch } from '../content/pending.js';
import { emptyManifest, manifestEntryFromFile, parseManifest, serializeManifest, upsertEntry, removeEntry, inboundLinks, inboundReferences, inboundIncludes, type Manifest, type LinkTarget, type InboundLink } from '../content/manifest.js';
import { deriveGettingStarted, type GettingStarted } from '../content/getting-started.js';
import { markdownReference, type MarkdownReferenceRow } from '../components/markdown-reference.js';
import { isConflict } from '../github/types.js';
import { log } from '../log/index.js';
import { dictionaryFileForDialect, DEFAULT_TIDY_MODEL, resolveTidyConventions } from '../nav/site-config.js';
import type { TidyConventions } from '../nav/site-config.js';
import { keyKnownUnhealthy } from './tidy-key-health.js';
import { parseMediaEntries, parseMediaManifest, upsertMediaEntry, serializeMediaManifest } from '../media/manifest.js';
import { mediaLibraryEntry } from '../media/library-entry.js';
import type { MediaLibrary } from '../media/library-entry.js';
import { parseDictionary, mergeDictionaryWords } from '../content/site-dictionary.js';
import { issueCsrfToken } from './csrf.js';
import { requireSession, requireEditor, requireEngineAccess, isPublicAdminPath } from './guard.js';
import { canReach } from '../auth/access.js';
import { resolveNavLayout, type ResolvedNavLayout } from './admin-nav.js';
import { resolvePublishActions, type PublishActionLink } from './publish-actions.js';
import { roleHome, type Capability } from '../auth/roles.js';
import type { CairnRuntime, ConceptDescriptor, NamedField, PreviewConfig, ResolvedPreview } from '../content/types.js';
import type { Editor, Role } from '../auth/types.js';
import type { ContentRoutesContext, ContentEvent } from './content-routes-context.js';

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
 *  carries only the site name and the resolved theme (the cookie is not auth-bearing, so a
 *  signed-out visitor's theme choice still applies) and renders bare; an authed path carries the
 *  full admin payload, the site identity, the signed-in editor, the one resolved nav tree, the
 *  active path, the CSRF token, and the streamed pending entries, and streams the pending-publish
 *  set as a deferred promise so a custom route and the login page never block on a GitHub
 *  round-trip up front.
 */
export type AdminShellData =
  | { public: true; siteName: string; theme: 'cairn-admin' | 'cairn-admin-dark' }
  | {
      public: false;
      siteName: string;
      user: { displayName: string; email: string; role: Role; capability: Capability };
      concepts: NavConcept[];
      /**
       * The site's whole arranged, filtered sidebar for this request: a declared `navLayout`
       *  resolved and gated (engine capability, `ownerOnly`, declarative `roles`), or, absent one,
       *  today's default arrangement synthesized through the same resolver, then narrowed further
       *  by the site's own `deps.navFilter` when configured.
       */
      nav: ResolvedNavLayout;
      pathname: string;
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
  /**
   * Whether this concept is routable (`concept.routing.routable`), for the create form: a
   *  non-routable concept (the Fragments concept) has no permalink, so the form asks for a name
   *  rather than an address, matching the edit screen's own treatment.
   */
  routable: boolean;
  entries: EntrySummary[];
  /** A listing failure degrades to an inline message rather than a thrown 500. */
  error: string | null;
  /** A create-form bounce error read from `?error`. */
  formError: string | null;
  /** The entry count from a publish-all redirect (`?publishedAll=`), for the list page's flash. */
  publishedAll: number | null;
}

/**
 * One published fragment: enough for the picker's listing and the preview's include resolution.
 *  `body` is the fragment's raw markdown, read from the default branch only, never a pending
 *  branch's edits.
 */
export interface FragmentTarget {
  id: string;
  title: string;
  body: string;
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
  /**
   * The site's link targets, for the preview resolver and the link picker; from the committed
   *  manifest, excluding any non-routable concept's rows (a fragment's gated permalink 404s, so it
   *  is never offered as a link target; it is included, never linked).
   */
  linkTargets: LinkTarget[];
  /**
   * The published fragments this entry can include, for the preview's `resolveFragment` and the
   *  fragment picker. `null` when nothing here can include one: the site declares no fragments
   *  concept, or this entry is itself a fragment (a fragment cannot include a fragment). `[]` when
   *  fragments are includable but none are published. Each body is read from the default branch
   *  only, so a pending edit to a fragment never leaks into another entry's preview; a read failure
   *  degrades the affected fragment out rather than failing the whole load.
   */
  fragmentTargets: FragmentTarget[] | null;
  /**
   * Whether this entry's concept is routable (`concept.routing.routable`), for the Address
   *  fieldset: a non-routable concept (the Fragments concept) has no permalink, so the sidebar
   *  shows a bare name instead of a URL.
   */
  routable: boolean;
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
  /**
   * The site's publish-actions config, resolved for this entry: filtered to this concept and
   *  templated with this entry's id. Rendered as quiet next-step links only alongside
   *  `publishedFlash`; empty when the site declares no `publishActions` (today's rendering,
   *  unchanged).
   */
  publishActions: PublishActionLink[];
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
   *  is a Worker secret. `enabled` false hides the Tidy control, whether because the developer never
   *  turned tidy on or because a prior call already proved the key unhealthy (save-500-honest-errors,
   *  Task 5): this is a cache read only, never an inline probe, so an edit load pays no added latency,
   *  and a dead key is absent, not disabled, until the cache's TTL clears or a fresh call succeeds.
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
 * The Help home's data: the derived getting-started progress, the full markdown reference (the
 *  component curates by group), and the support hand-off. `composeRuntime` defaults an unset
 *  adapter `supportContact` to cairn's hosted help, so this reaches the view unset only through a
 *  caller that bypasses that composition; an explicitly empty string renders no hand-off.
 */
export interface HelpData {
  gettingStarted: GettingStarted;
  reference: MarkdownReferenceRow[];
  supportContact?: string;
}

/**
 * The welcome view's data: the calm, minimal screen a none-capability role with no declared `home`
 *  lands on at the admin root (spec section 4). Carries just enough for the greeting; the sign-out
 *  control already lives in the shell chrome.
 */
export interface WelcomeData {
  displayName: string;
  siteName: string;
}

/** A blocked save or publish: `fail(400)` when the body links to a target absent from main. */
export interface SaveFailure {
  /** The one-line human summary every content action failure carries. */
  error: string;
  /** The cairn tokens that resolve to no entry, for the editor's fix-it banner. */
  brokenLinks: string[];
  /** The author's edited markdown, so the editor reseeds with the unsaved work. */
  body: string;
}

/** A refused delete: `fail(409)` while other entries still link to (or include) this one. */
export interface DeleteRefusal {
  /** The one-line human summary every content action failure carries. */
  error: string;
  /** The entries whose bodies link to (or include) the refused one, for the blockers list. */
  inboundLinks: InboundLink[];
  /**
   * Which gate refused, so the admin copy names the real blocker. Absent reads as `'link'`. A
   *  fragment can be blocked by either gate, and the links gate runs first, so the concept alone
   *  does not identify the cause: only the refusing gate knows.
   */
  inboundKind?: 'link' | 'include';
  /** The refused entry's id, so a list view marks the right row. */
  id: string;
}

/** A refused rename: `fail(400)` on a bad slug, `fail(409)` on a collision or pending edits. */
export interface RenameFailure {
  /** The one-line human summary every content action failure carries. */
  error: string;
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

/**
 * The bad-slug refusal, naming what the form asked for. A non-routable concept's create and rename
 *  forms ask for a Name, so telling its author to fix an "address" names a thing the entry does not
 *  have and the form never showed them.
 */
function invalidIdMessage(concept: ConceptDescriptor): string {
  const noun = concept.routing.routable ? 'address' : 'name';
  return `Enter a valid ${noun}: lowercase letters, numbers, and hyphens.`;
}

/** Look up the concept named by the `[concept]` route param, or a 404. */
function conceptOf(runtime: CairnRuntime, params: Record<string, string>): ConceptDescriptor {
  const concept = findConcept(runtime.concepts, params.concept ?? '');
  if (!concept) throw error(404, `Unknown content type: ${params.concept ?? ''}`);
  return concept;
}

/**
 * The shared preamble for a single-entry action addressed by the `[id]` route param:
 *  authenticate, resolve the concept, and validate the id. Confines the id to the slug rule
 *  before any commit path is built from it (the App token can write anywhere in the repo), so a
 *  malformed id is rejected before touching GitHub. Shared by save, publish, discard, the
 *  editor's own delete, and rename; the concept list's delete reads its id from the posted form
 *  instead, a different shape left to validate inline.
 */
function requireEntryFromParams(runtime: CairnRuntime, event: ContentEvent): { editor: Editor; concept: ConceptDescriptor; id: string } {
  const editor = requireEditor(event);
  const concept = conceptOf(runtime, event.params);
  requireEngineAccess(runtime.access, editor, concept.id);
  const id = event.params.id ?? '';
  if (!isValidId(id)) throw error(400, 'Invalid entry id');
  return { editor, concept, id };
}

/**
 * Build the core content loads and actions (the admin shell payload, Help, the concept list, and
 *  the per-entry create/edit/save/publish/discard/delete/rename cycle), closed over the shared
 *  content-routes context.
 */
export function createCoreActions(ctx: ContentRoutesContext) {
  const { runtime } = ctx;

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
   *  wrong count. `nav` is awaited up front (never streamed): `resolveNavLayout` arranges and gates
   *  the declared (or default) tree first, then the site's `deps.navFilter`, if configured, narrows
   *  that already-gated `items` set, fresh every request.
   */
  async function shellPayload(event: ContentEvent): Promise<{ shell: AdminShellData }> {
    // The theme cookie carries no auth, so a public (login/auth) path reads and honors it too:
    // a signed-out visitor's dark-mode pick should not revert to light the moment they sign out.
    const cookieTheme = event.cookies?.get('cairn-admin-theme');
    const theme = cookieTheme === 'cairn-admin-dark' ? 'cairn-admin-dark' : 'cairn-admin';
    if (isPublicAdminPath(event.url.pathname)) {
      return { shell: { public: true, siteName: runtime.siteName, theme } };
    }
    const editor = requireSession(event);
    const cookieCollapsed = event.cookies?.get('cairn-admin-nav-collapsed');
    const collapsedNav = cookieCollapsed
      ? cookieCollapsed.split(',').map((part) => decodeURIComponent(part)).filter(Boolean)
      : [];
    // A none-capability session sees no publish surface (every engine content route already 403s
    // it, and the shell's "Publish site (N)" action has nothing for it to act on), so the count is
    // not theirs to read: skip the backend listing entirely rather than streaming a real pending
    // count into a dead button. resolveBackend can throw synchronously (the token mint), which a
    // bare `.catch()` would miss; deferring the resolve into a Promise.resolve().then turns a sync
    // throw into a caught rejection that degrades to null, the fail-safe the shell needs so a token
    // or network failure hides the publish-all action rather than throwing the whole shell.
    const pendingEntries =
      editor.capability === 'none'
        ? Promise.resolve([] as { concept: string; id: string }[])
        : Promise.resolve()
            .then(() => ctx.resolveBackend(event).listBranches(PENDING_PREFIX))
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
    // The whole arranged sidebar for this request: a declared navLayout resolves and gates as
    // written (engine capability, ownerOnly, declarative roles), or, absent one, the resolver
    // synthesizes today's default arrangement through the same code path, so the two can never
    // drift. The site's own navFilter, if configured, then narrows the arranged items only;
    // fallback is engine-only and already gated, so it never passes through that seam.
    const capability = editor.capability;
    const resolved = resolveNavLayout({
      layout: runtime.navLayout,
      adminNav: ctx.adminNav,
      concepts: runtime.concepts.map((c) => ({ id: c.id, label: c.label, routing: c.routing })),
      navMenuLabel: runtime.navMenu?.label ?? null,
      capability,
      role: editor.role,
    });
    const nav: ResolvedNavLayout = ctx.deps.navFilter
      ? { ...resolved, items: await ctx.deps.navFilter(resolved.items, { editor, event }) }
      : resolved;
    return {
      shell: {
        public: false,
        siteName: runtime.siteName,
        user: { displayName: editor.displayName, email: editor.email, role: editor.role, capability },
        concepts: capability === 'none' ? [] : runtime.concepts.map((c) => ({ id: c.id, label: c.label })),
        nav,
        pathname: event.url.pathname,
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
    requireEditor(event);
    let manifest = emptyManifest();
    let pending: { concept: string; id: string }[] = [];
    try {
      const backend = ctx.resolveBackend(event);
      manifest = await ctx.readManifest(backend);
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

  /**
   * The role-aware admin-root landing (spec section 4). A role with a declared `home` is sent
   *  there. Absent a `home`, an owner- or editor-capability role lands on the first concept's list,
   *  the default landing (spec §7.6); a none-capability role gets the calm welcome view instead of a
   *  dead-end redirect. The shell posts publishAll and logout to this exact path from every admin
   *  page, so an unexpected-failure `?error=` those actions bounce back with rides along on every
   *  redirect branch, keeping the editor-visible guarantee for the two actions that always land here.
   */
  function indexRedirect(event: ContentEvent): { view: 'welcome'; page: WelcomeData } {
    const editor = requireSession(event);
    const bounced = event.url.searchParams.get('error');
    const suffix = bounced ? `?error=${encodeURIComponent(bounced)}` : '';
    const home = roleHome(runtime.roles, editor.role);
    if (home) {
      throw redirect(303, `${home}${suffix}`);
    }
    if (editor.capability !== 'none') {
      const first = runtime.concepts[0];
      if (!first) throw error(404, 'No content types configured');
      throw redirect(307, `/admin/${first.id}${suffix}`);
    }
    return { view: 'welcome', page: { displayName: editor.displayName, siteName: runtime.siteName } };
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
      const title = asString(frontmatter.title) ?? file.id;
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
    const editor = requireEditor(event);
    const concept = conceptOf(runtime, event.params);
    requireEngineAccess(runtime.access, editor, concept.id);
    const formError = event.url.searchParams.get('error');
    const publishedAllRaw = event.url.searchParams.get('publishedAll');
    const publishedAll = publishedAllRaw !== null && /^\d+$/.test(publishedAllRaw) ? Number(publishedAllRaw) : null;
    const base = { conceptId: concept.id, label: concept.label, singular: concept.singular, dated: concept.routing.dated, routable: concept.routing.routable, formError, publishedAll };
    const backend = ctx.resolveBackend(event);
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

  /** Create a new entry: validate the slug, compose a dated id when the concept is dated, refuse to clobber. */
  async function createAction(event: ContentEvent): Promise<never> {
    const editor = requireEditor(event);
    const concept = conceptOf(runtime, event.params);
    requireEngineAccess(runtime.access, editor, concept.id);
    const form = await event.request.formData();
    const rawTitle = String(form.get('title') ?? '').trim();
    const slug = String(form.get('slug') ?? '').trim() || slugify(rawTitle);
    const date = String(form.get('date') ?? '').trim();
    const bounce = (msg: string): never => {
      throw redirect(303, `/admin/${concept.id}?error=${encodeURIComponent(msg)}`);
    };
    // The form asked a non-routable concept for a Name, so the bounce names the same thing back.
    if (!isValidId(slug)) return bounce(invalidIdMessage(concept));

    let id = slug;
    if (concept.routing.dated) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bounce('Pick a date for this entry.');
      if (/^\d{4}-/.test(slug)) {
        return bounce('Leave the date out of the address; set it in the date field.');
      }
      id = composeDatedId(date, slug, concept.datePrefix);
    }

    const backend = ctx.resolveBackend(event);
    const existing = await backend.readFile(`${concept.dir}/${filenameFromId(id)}`, backend.defaultBranch);
    if (existing !== null) return bounce('An entry with that address already exists.');
    // A pending branch is an entry too (saved but not yet published); refuse to clobber it.
    if ((await backend.branchHead(pendingBranch(concept.id, id))) !== null) {
      return bounce('An unpublished entry with that address already exists.');
    }

    // The raw typed title (before slugification) rides the redirect so editLoad can seed the
    // title field and the breadcrumb; an explicit address can diverge from the title, so the
    // slug alone is not enough to recover it. Omit the param for a blank title rather than
    // carrying an empty string through the URL.
    const titleParam = rawTitle ? `&title=${encodeURIComponent(rawTitle)}` : '';
    // The validated create-dialog date rides the redirect too, the same way the title does, so
    // editLoad seeds it into the fresh form instead of opening blank. A dated concept always has
    // a date here (the bounce above refuses an unparseable one); a non-dated concept carries none.
    const dateParam = concept.routing.dated ? `&date=${encodeURIComponent(date)}` : '';
    throw redirect(303, `/admin/${concept.id}/${id}?new=1${dateParam}${titleParam}`);
  }

  /** Open a file for editing. A `?new=1` miss yields a blank document; any other miss is a 404. */
  async function editLoad(event: ContentEvent): Promise<EditData> {
    const editor = requireEditor(event);
    const concept = conceptOf(runtime, event.params);
    requireEngineAccess(runtime.access, editor, concept.id);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const isNew = event.url.searchParams.get('new') === '1';
    const backend = ctx.resolveBackend(event);
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
      backend.readFile(ctx.dictionaryFilePath(), backend.defaultBranch).catch(() => null),
    ]);
    const pending = headSha !== null;
    const raw = pending ? await backend.readFile(path, branch) : mainRaw;
    if (raw === null && !isNew) throw error(404, 'Entry not found');
    const published = mainRaw !== null;

    const parsed = raw === null ? { frontmatter: {}, body: '' } : parseMarkdown(raw);
    // A fresh entry opens prefilled from each field's `default`, resolving a `'today'` date against a
    // request-time clock. The defaults sit under the empty parsed frontmatter, never over a real read.
    // The create dialog's typed title (carried on `?new=1&title=`) sits over the schema defaults and
    // under any parsed frontmatter, since a blank new doc has none and the seeded title should win.
    const seededTitle = isNew ? event.url.searchParams.get('title')?.trim() : null;
    // The create dialog's validated date rides the same seeding contract as the title: over the
    // schema defaults, under any parsed frontmatter. A malformed or absent param is ignored (a
    // dateless new entry still opens; the save-time guards below catch it before it can throw).
    const seededDateRaw = isNew ? event.url.searchParams.get('date') : null;
    const seededDate = seededDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(seededDateRaw) ? seededDateRaw : null;
    const loadFrontmatter = isNew
      ? {
          ...initialValues(concept.schema, new Date()),
          ...(seededTitle ? { title: seededTitle } : {}),
          ...(seededDate ? { date: seededDate } : {}),
          ...parsed.frontmatter,
        }
      : parsed.frontmatter;
    const title = asString(loadFrontmatter.title) ?? id;

    const manifest = manifestRaw !== null ? parseManifest(manifestRaw) : null;
    let linkTargets: LinkTarget[] = [];
    // A fragment's edit screen shows where it is used (spec §4) through the same inbound surface
    // every other concept rides for the delete guard, so no new panel is needed: for the fragments
    // concept the "linkers" are the entries that include it, not link to it.
    let inbound: InboundLink[] = [];
    if (manifest !== null) {
      // A non-routable concept's entries (the Fragments concept) are excluded from linkTargets:
      // their permalink 404s, so the link picker and the preview's resolveLink must never offer
      // one as a link target (spec §1's not-a-link-target backstop). A manifest row whose concept
      // is no longer declared keeps today's lenient behavior (no descriptor to gate on).
      linkTargets = manifest.entries
        .filter((e) => findConcept(runtime.concepts, e.concept)?.routing.routable ?? true)
        .map((e) => ({
          concept: e.concept,
          id: e.id,
          permalink: e.permalink,
          title: e.title,
          date: e.date,
          draft: e.draft,
        }));
      inbound =
        concept.id === FRAGMENTS_CONCEPT_ID ? inboundIncludes(manifest, id) : inboundLinks(manifest, concept.id, id);
    }

    // The published fragments this entry can include (Task 6/7): null when nothing here can include
    // one, so the fragment picker and the preview's resolveFragment read the same absence signal.
    // That covers two cases. A site with no fragments concept has none to offer. A fragment's OWN
    // edit screen cannot include one either (the save bounces a nested include), and resolving them
    // here would render a nested include in the preview that Save then refuses, so the preview
    // instead shows the literal-prose fallback the engine really ships. Skipping the batch there
    // also spares a fragment's every edit-load one read per published fragment.
    // When they are offered, ids and titles come from the committed manifest's fragments rows; each
    // body is a SECOND concurrent batch (read only after the manifest is parsed, since the per-id
    // paths derive from it), from the default branch only, so a fragment's own pending edits never
    // leak into another entry's preview. A read failure degrades that one target out rather than
    // failing the whole load (the mediaTargets shape).
    const fragmentsConcept = findConcept(runtime.concepts, FRAGMENTS_CONCEPT_ID);
    let fragmentTargets: EditData['fragmentTargets'] = null;
    if (fragmentsConcept && concept.id !== FRAGMENTS_CONCEPT_ID) {
      const rows = manifest?.entries.filter((e) => e.concept === FRAGMENTS_CONCEPT_ID) ?? [];
      const bodies = await Promise.all(
        rows.map(async (row): Promise<FragmentTarget | null> => {
          try {
            const raw = await backend.readFile(`${fragmentsConcept.dir}/${filenameFromId(row.id)}`, backend.defaultBranch);
            if (raw === null) return null;
            return { id: row.id, title: row.title, body: parseMarkdown(raw).body };
          } catch (e) {
            // A transport failure degrades this one target out, and downstream the preview then
            // renders the missing-fragment notice for a fragment that is committed and fine. Log
            // it, so an editor reporting "it says the fragment is missing" is diagnosable as a
            // read failure rather than a content problem.
            log.warn('include.read_failed', { fragment: row.id, error: e instanceof Error ? e.message : String(e) });
            return null;
          }
        }),
      );
      fragmentTargets = bodies.filter((b): b is FragmentTarget => b !== null);
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
    for (const [hash, e] of Object.entries(parseMediaManifest(ctx.parseMediaJson(mediaRaw)))) {
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
      fragmentTargets,
      routable: concept.routing.routable,
      mediaTargets,
      mediaLibrary,
      inboundLinks: inbound,
      pending,
      published,
      publishedFlash: event.url.searchParams.get('published') === '1',
      publishActions: resolvePublishActions(ctx.publishActions, { concept: concept.id, id }),
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
        enabled: (runtime.tidy?.enabled ?? false) && !keyKnownUnhealthy(),
        model: runtime.tidy?.model || DEFAULT_TIDY_MODEL,
        conventions: resolveTidyConventions(runtime.tidy?.conventions),
      },
      advisories,
      orphanTags,
    };
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
    const backend = ctx.resolveBackend(event);

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

    // A fragment can never include another fragment (the engine resolves an include only one
    // pass deep; see resolve-include.ts). Keyed on the concept being the fragments concept, not on
    // routability in general, since routability describes URL behavior and this is a fragments-only
    // nesting rule. The check runs extractIncludes, the same extraction the manifest builds its
    // includes row from, so the bounce and the where-used index agree on what counts as an include.
    if (concept.id === FRAGMENTS_CONCEPT_ID && extractIncludes(body).length > 0) {
      throw redirect(
        303,
        `/admin/${concept.id}/${id}?error=${encodeURIComponent("A fragment can't include another fragment.")}${suffix}`,
      );
    }

    // Belt and braces: normalizeConcepts already forces a date-token concept's `date` field to
    // required, so an ordinary validate() failure should have caught a missing date before this
    // point. A hand-rolled validate (or a descriptor built outside normalizeConcepts) could still
    // pass with no usable date, and manifestEntryFromFile's resolvePermalink below throws on
    // exactly that case. Catch it here with the same editor-voiced redirect bounce every other
    // save failure uses, rather than letting that throw escape as a raw 500.
    if (permalinkUsesDateToken(concept.permalink) && !asDate(result.data.date)) {
      throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent('Pick a date for this entry.')}${suffix}`);
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
        let mediaManifest = parseMediaManifest(ctx.parseMediaJson(baseRaw));
        for (const record of records) {
          mediaManifest = upsertMediaEntry(mediaManifest, record);
        }
        mediaChange = { path: runtime.mediaManifestPath, content: serializeMediaManifest(mediaManifest) };
      }
    }

    // Upsert this entry's row into main's manifest in memory, for the link guard here and for
    // the publish commit. The save commits no manifest change; publish lands the upsert on main.
    const manifest = await ctx.readManifest(backend);
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
      ctx.commitFailure(commitFields, err, `/admin/${concept.id}/${id}`,
        'This file changed since you opened it. Reload and reapply your edits.', { query: suffix });
    }
    return { path, markdown, branch, branchSha, manifest: upserted, draftLinks, referenceWarnings, backend, mediaChange };
  }

  /**
   * Save an edit: validate, then commit to the entry's pending branch with the session editor
   *  as author. Main and its manifest stay untouched until publish. Fails safe on 409.
   */
  async function saveAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const { editor, concept, id } = requireEntryFromParams(runtime, event);
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
    const { editor, concept, id } = requireEntryFromParams(runtime, event);
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
      ctx.commitFailure(commitFields, err, `/admin/${concept.id}/${id}`,
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
   *  concept param is ignored and the redirect lands on the first configured concept. This is
   *  the one engine action that spans every concept in a single call, so it cannot gate with a
   *  single `requireEngineAccess(runtime.access, editor, target)` call the way every other
   *  concept route does: instead each pending entry is filtered by `canReach` against its own
   *  concept id, so a role mapped away from a concept never has that concept's entries published
   *  on its behalf, the same deny-at-the-route guarantee applied per entry instead of per route.
   */
  async function publishAllAction(event: ContentEvent): Promise<never> {
    const editor = requireEditor(event);
    const first = runtime.concepts[0];
    if (!first) throw error(404, 'No content types configured');
    const backend = ctx.resolveBackend(event);
    const listPage = `/admin/${first.id}`;

    // Each cairn/ ref names a pending entry; the shared predicate skips a stray ref rather
    // than failing the whole batch on it. A concept the access map denies this editor is
    // skipped the same way: this batch only ever acts on entries the editor could also reach
    // one at a time through the concept's own publish action.
    const names = await backend.listBranches(PENDING_PREFIX);
    const pending = names.flatMap((name) => {
      const entry = pendingEntryOf(name);
      if (!entry || !canReach(runtime.access, editor, entry.concept.id)) return [];
      return [{ ...entry, branch: name, path: `${entry.concept.dir}/${filenameFromId(entry.id)}` }];
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
    let next = await ctx.readManifest(backend);
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
        ctx.logCommitFailed({ concept: entry.concept, id: entry.id, editor: editor.email }, err, 'publish.failed');
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
    const { editor, concept, id } = requireEntryFromParams(runtime, event);
    const backend = ctx.resolveBackend(event);

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
    const backend = ctx.resolveBackend(event);

    // An absent manifest degrades the inbound gate to "allow": with no manifest there is nothing to
    // check, and the build's cairn: backstop still catches any dangling token, mirroring saveAction.
    const manifest = await ctx.readManifest(backend);
    const inbound = inboundLinks(manifest, concept.id, id);
    if (inbound.length) {
      return fail(409, {
        error: `Cannot delete ${id}: ${inbound.length} ${inbound.length === 1 ? 'page links' : 'pages link'} to it.`,
        inboundLinks: inbound,
        id,
      } satisfies DeleteRefusal);
    }

    // The fragments-concept delete guard: a fragment id is unique within the fragments concept (the
    // only concept an ::include directive can target), so only this concept's entries need the check.
    // Same degrade-to-allow posture as the links gate above; a dangling include is the build's
    // include-resolver backstop, not this request-time gate.
    if (concept.id === FRAGMENTS_CONCEPT_ID) {
      const includers = inboundIncludes(manifest, id);
      if (includers.length) {
        return fail(409, {
          error: `Cannot delete ${id}: ${includers.length} ${includers.length === 1 ? 'entry includes' : 'entries include'} it. Remove the include first.`,
          inboundLinks: includers,
          inboundKind: 'include',
          id,
        } satisfies DeleteRefusal);
      }
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
      ctx.commitFailure(commitFields, err, `/admin/${concept.id}/${id}`,
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
    const { editor, concept, id } = requireEntryFromParams(runtime, event);
    return deleteEntry(event, concept, id, editor);
  }

  /** Delete an entry from the concept list. The id comes from the form body. */
  async function listDeleteAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = requireEditor(event);
    const concept = conceptOf(runtime, event.params);
    requireEngineAccess(runtime.access, editor, concept.id);
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
    const { editor, concept, id } = requireEntryFromParams(runtime, event);
    const backend = ctx.resolveBackend(event);

    // Pending edits on the branch are keyed to the old id; renaming underneath them would strand
    // them, so refuse until the editor publishes or discards.
    if ((await backend.branchHead(pendingBranch(concept.id, id))) !== null) {
      return fail(409, { error: 'This entry has unpublished edits. Publish or discard them, then rename.' } satisfies RenameFailure);
    }

    const form = await event.request.formData();
    const newSlug = String(form.get('slug') ?? '').trim();
    if (!isValidId(newSlug)) {
      return fail(400, { error: invalidIdMessage(concept) } satisfies RenameFailure);
    }
    const datePrefix = concept.routing.dated ? concept.datePrefix : null;
    if (concept.routing.dated && /^\d{4}-/.test(newSlug)) {
      return fail(400, { error: 'Leave the date out of the address.' } satisfies RenameFailure);
    }
    if (newSlug === slugFromId(id, datePrefix)) {
      return fail(400, { error: 'That is already the address.' } satisfies RenameFailure);
    }
    const newId = renameId(id, newSlug, datePrefix);
    const oldPath = `${concept.dir}/${filenameFromId(id)}`;
    const newPath = `${concept.dir}/${filenameFromId(newId)}`;

    // Collision guard: refuse if a file already exists at the new path. This 409 covers two cases a
    // single readRaw cannot tell apart: a static collision with an existing entry, and a
    // concurrent-rename race where another editor renamed onto this path between load and submit.
    const clobber = await backend.readFile(newPath, backend.defaultBranch);
    if (clobber !== null) {
      return fail(409, { error: 'An entry with that address already exists.' } satisfies RenameFailure);
    }

    const [entryRaw, manifest] = await Promise.all([
      backend.readFile(oldPath, backend.defaultBranch),
      ctx.readManifest(backend),
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
      hasInclude: boolean;
      fields: string[];
    }
    const repoints = new Map<string, InboundRepoint>();
    const linkerPathFor = (linkerConcept: ConceptDescriptor, linkerId: string): string =>
      `${linkerConcept.dir}/${filenameFromId(linkerId)}`;
    // The three loops below look like a jscpd near-dupe (same lookup-and-guard shape), but their
    // merge semantics diverge: a link or an include sets a boolean flag, a reference unions a
    // field-name set. Parameterizing the difference would need a callback per loop, which is not
    // simpler than the three short loops it would replace; left as is.
    for (const linker of inboundLinks(manifest, concept.id, id)) {
      const linkerConcept = findConcept(runtime.concepts, linker.concept);
      if (!linkerConcept) continue;
      const path = linkerPathFor(linkerConcept, linker.id);
      const existing = repoints.get(path);
      if (existing) existing.hasLink = true;
      else repoints.set(path, { concept: linker.concept, id: linker.id, hasLink: true, hasInclude: false, fields: [] });
    }
    for (const linker of inboundReferences(manifest, concept.id, id)) {
      const linkerConcept = findConcept(runtime.concepts, linker.concept);
      if (!linkerConcept) continue;
      const path = linkerPathFor(linkerConcept, linker.id);
      const existing = repoints.get(path);
      if (existing) existing.fields = [...new Set([...existing.fields, ...linker.fields])];
      else repoints.set(path, { concept: linker.concept, id: linker.id, hasLink: false, hasInclude: false, fields: linker.fields });
    }
    // A fragment id is unique across the site, so inboundIncludes only matters when the renamed
    // entry IS a fragment; gated the same way the delete guard gates its own inboundIncludes call.
    if (concept.id === FRAGMENTS_CONCEPT_ID) {
      for (const includer of inboundIncludes(manifest, id)) {
        const includerConcept = findConcept(runtime.concepts, includer.concept);
        if (!includerConcept) continue;
        const path = linkerPathFor(includerConcept, includer.id);
        const existing = repoints.get(path);
        if (existing) existing.hasInclude = true;
        else repoints.set(path, { concept: includer.concept, id: includer.id, hasLink: false, hasInclude: true, fields: [] });
      }
    }
    for (const [linkerPath, repoint] of repoints) {
      const linkerConcept = findConcept(runtime.concepts, repoint.concept);
      if (!linkerConcept) continue;
      let linkerRaw = await backend.readFile(linkerPath, backend.defaultBranch);
      if (linkerRaw === null) continue;
      if (repoint.hasLink) linkerRaw = rewriteCairnLink(linkerRaw, oldHref, newHref);
      if (repoint.hasInclude) linkerRaw = rewriteIncludeDirective(linkerRaw, id, newId);
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
      ctx.commitFailure(commitFields, err, `/admin/${concept.id}/${id}`,
        'This file changed since you opened it. Reload and try again.');
    }
    throw redirect(303, `/admin/${concept.id}/${newId}?renamed=1`);
  }

  return {
    shellPayload,
    helpLoad,
    indexRedirect,
    listLoad,
    createAction,
    editLoad,
    saveAction,
    publishAction,
    publishAllAction,
    discardAction,
    deleteAction,
    listDeleteAction,
    renameAction,
  };
}
