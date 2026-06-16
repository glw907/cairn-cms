// The admin content routes: the load and action functions a site's /admin/** shims call.
// A factory closes over the composed runtime and the GitHub token mint, so the read and
// commit paths are unit-testable against a fetch double with an injected token, mirroring the
// email `send` injection in auth-routes. A shim stays one line: `export const load = routes.editLoad`.
import { redirect, error, fail } from '@sveltejs/kit';
import { findConcept } from '../content/concepts.js';
import { extractCairnLinks, formatCairnToken, rewriteCairnLink } from '../content/links.js';
import { frontmatterFromForm, parseMarkdown, dateInputValue, serializeMarkdown } from '../content/frontmatter.js';
import { deriveExcerpt } from '../content/excerpt.js';
import { asString } from '../content/identity.js';
import { isValidId, slugify, filenameFromId, composeDatedId, slugFromId, renameId } from '../content/ids.js';
import { appCredentials, type GithubKeyEnv } from '../github/credentials.js';
import { listMarkdown, readRaw, commitFiles, type FileChange } from '../github/repo.js';
import { branchHeadSha, createBranch, deleteBranch, listBranches } from '../github/branches.js';
import { PENDING_PREFIX, pendingBranch, parsePendingBranch } from '../content/pending.js';
import { cachedInstallationToken } from '../github/signing.js';
import { emptyManifest, manifestEntryFromFile, parseManifest, serializeManifest, upsertEntry, removeEntry, inboundLinks, type Manifest, type LinkTarget, type InboundLink } from '../content/manifest.js';
import { isConflict } from '../github/types.js';
import { log } from '../log/index.js';
import { issueCsrfToken, validateCsrfHeader } from './csrf.js';
import { requireSession } from './guard.js';
import { sniffMediaType, isDeniedUpload, extForMediaType } from '../media/sniff.js';
import { hashBytes, shortHash, slugifyFilename, r2Key } from '../media/naming.js';
import { mediaToken } from '../media/reference.js';
import { r2Store } from '../media/store.js';
import { parseMediaEntries, parseMediaManifest, upsertMediaEntry, serializeMediaManifest } from '../media/manifest.js';
import type { MediaEntry } from '../media/manifest.js';
import type { CookieJar, EventBase } from './types.js';
import type { CairnRuntime, ConceptDescriptor, FrontmatterField, PreviewConfig, ResolvedPreview } from '../content/types.js';
import type { Editor, Role } from '../auth/types.js';
// R2Bucket is named only inside uploadAction to cast the raw binding for r2Store. It is a type-only
// import that never appears in an exported signature, so it does not reach the public `.d.ts`.
import type { R2Bucket } from '@cloudflare/workers-types';

/** A sidebar concept entry: just enough to render the nav without shipping validators to the client. */
export interface NavConcept {
  id: string;
  label: string;
}

/** The admin layout's data: site identity, the signed-in user, the nav, the active path, and theme. */
export interface LayoutData {
  siteName: string;
  user: { displayName: string; email: string; role: Role };
  concepts: NavConcept[];
  pathname: string;
  canManageEditors: boolean;
  /** The nav menu's label when the site configures one; gates the Navigation nav entry. Null otherwise. */
  navLabel: string | null;
  /** The admin theme resolved for SSR: the persisted cookie choice, or the light default. */
  theme: 'cairn-admin' | 'cairn-admin-dark';
  /** The nav group labels the user has collapsed, from the persisted cookie. Read at SSR so a
   *  collapsed group renders collapsed with no flash. Empty when none are collapsed. */
  collapsedNav: string[];
  /** The session's CSRF double-submit token, rendered as a hidden field in every admin form. */
  csrf: string;
  /** Every entry with unpublished edits (a `cairn/` ref), for the topbar's publish-all action.
   *  Null when GitHub is unreachable, so the topbar hides the action rather than lying. */
  pendingEntries: { concept: string; id: string }[] | null;
}

/** One row in a concept's list view. */
export interface EntrySummary {
  id: string;
  title: string;
  date: string | null;
  draft: boolean;
  /** Publish state derived from the ref set: live as-is, live with pending edits, or branch-only. */
  status: 'published' | 'edited' | 'new';
  /** The row's one-line summary: the manifest's indexed excerpt for a published row, the branch
   *  frontmatter/body excerpt for a pending one, and null when neither yields text. */
  summary: string | null;
}

/** The concept list view's data. */
export interface ListData {
  conceptId: string;
  label: string;
  /** The singular noun for the create affordances ("New post"); from the descriptor, which defaults
   *  it to `label`. */
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
  fields: FrontmatterField[];
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
  /** The minimal media-resolver input the edit page builds its preview `resolveMedia` from, keyed by
   *  the 16-hex content hash and parallel to `linkTargets`. Empty when media is off or the read fails. */
  mediaTargets: Record<string, { slug: string; ext: string; contentType: string }>;
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
  /** The adapter's preview knob resolved for this entry's concept (its `byConcept` override,
   *  when one exists, applied over the top-level values); null when the site sets none, which
   *  leaves the frame rendering unstyled markup behind a hint. */
  preview: ResolvedPreview | null;
}

/** The structural event the content routes read; a real SvelteKit RequestEvent satisfies it. */
export interface ContentEvent extends EventBase<GithubKeyEnv> {
  params: Record<string, string>;
  /** SvelteKit's cookie jar. The layout load reads the persisted admin theme and issues the CSRF
   *  token. Optional for non-route callers. */
  cookies?: CookieJar;
}

/** Injectable dependencies; tests stub the token mint to avoid signing a real key. */
export interface ContentRoutesDeps {
  /** Mint a GitHub App installation token from the Worker env. Defaults to the real signer.
   *  A bare string works too; the routes await whatever comes back. */
  mintToken?: (env: GithubKeyEnv) => string | Promise<string>;
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

/** What a route's single `form` export presents to a view component: whichever content action
 *  last failed, merged with every field optional. `error` is always set on a failure; the richer
 *  keys identify which guard refused. */
export type ContentFormFailure = Partial<SaveFailure & DeleteRefusal & RenameFailure>;

/** The successful upload's response (`uploadAction`). The server-owned `record` rides the editor's
 *  optimistic client state and commits with the entry at Save (the upload itself commits nothing).
 *  `reused` is true when identical bytes were already stored, so the second upload did no second put;
 *  `mismatch` flags an existing object whose stored content type differs from this sniff. */
export interface UploadResult {
  reference: string;
  record: MediaEntry;
  reused: boolean;
  mismatch: boolean;
}

/** Resolve the effective preview for one concept: its `byConcept` override wins per key, with
 *  nullish coalescing so an override key that is present but undefined keeps the top-level value.
 *  Stylesheets are always shared, and the `byConcept` map never reaches the client. */
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

export function createContentRoutes(runtime: CairnRuntime, deps: ContentRoutesDeps = {}) {
  const mintToken =
    deps.mintToken ?? ((env: GithubKeyEnv) => cachedInstallationToken(appCredentials(runtime.backend, env)));

  /** Main's manifest, parsed. A missing file starts empty (a fresh repo before the first commit).
   *  Always read from main: pending branches carry no manifest copy. */
  async function readManifest(token: string): Promise<Manifest> {
    const raw = await readRaw(runtime.backend, runtime.manifestPath, token);
    return raw === null ? emptyManifest() : parseManifest(raw);
  }

  /** Parse a committed media.json body to a plain value for parseMediaManifest, degrading a missing
   *  or corrupt file to null (an empty manifest). The committed file is always our own serialization,
   *  so the catch only guards a hand-edited or truncated file rather than a normal path. */
  function parseMediaJson(raw: string | null): unknown {
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /** The pending entry a `cairn/` ref names, or null for a ref the engine must ignore: a
   *  malformed name, an id that fails the slug rule (entry paths are built from it, so this is
   *  the path confinement), or a concept this site does not configure. Every ref consumer
   *  (the layout count, the list view, publish-all) applies this one predicate, so a stray
   *  hand-pushed ref cannot inflate a count it can never clear or reach a contents read. */
  function pendingEntryOf(name: string): { concept: ConceptDescriptor; id: string } | null {
    const ref = parsePendingBranch(name);
    if (!ref || !isValidId(ref.id)) return null;
    const concept = findConcept(runtime.concepts, ref.concept);
    return concept ? { concept, id: ref.id } : null;
  }

  /** Layout load for every admin page: the nav, the user, the active path, the resolved theme,
   *  and the pending entries behind the topbar's publish-all action. */
  async function layoutLoad(event: ContentEvent): Promise<LayoutData> {
    const editor = requireSession(event);
    const cookieTheme = event.cookies?.get('cairn-admin-theme');
    const theme = cookieTheme === 'cairn-admin-dark' ? 'cairn-admin-dark' : 'cairn-admin';
    const cookieCollapsed = event.cookies?.get('cairn-admin-nav-collapsed');
    const collapsedNav = cookieCollapsed
      ? cookieCollapsed.split(',').map((part) => decodeURIComponent(part)).filter(Boolean)
      : [];
    // Any failure here (the token mint, the network, a non-ok response) degrades to null rather
    // than failing the whole admin shell or showing a wrong publish-all count.
    let pendingEntries: { concept: string; id: string }[] | null = null;
    try {
      const token = await mintToken(event.platform?.env ?? {});
      const names = await listBranches(runtime.backend, PENDING_PREFIX, token);
      pendingEntries = names.flatMap((name) => {
        const entry = pendingEntryOf(name);
        return entry ? [{ concept: entry.concept.id, id: entry.id }] : [];
      });
    } catch (err) {
      pendingEntries = null;
      log.warn('github.unreachable', { scope: 'layout', error: String(err) });
    }
    return {
      siteName: runtime.siteName,
      user: { displayName: editor.displayName, email: editor.email, role: editor.role },
      concepts: runtime.concepts.map((c) => ({ id: c.id, label: c.label })),
      pathname: event.url.pathname,
      canManageEditors: editor.role === 'owner',
      navLabel: runtime.navMenu?.label ?? null,
      theme,
      collapsedNav,
      csrf: event.cookies ? issueCsrfToken({ url: event.url, cookies: event.cookies }) : '',
      pendingEntries,
    };
  }

  /** Redirect /admin to the first concept's list (spec §7.6: land on the first concept). */
  function indexRedirect(): never {
    const first = runtime.concepts[0];
    if (!first) throw error(404, 'No content types configured');
    throw redirect(307, `/admin/${first.id}`);
  }

  /** Read a file's frontmatter for its list row, degrading to the id on any read failure. The
   *  repo defaults to main; a pending entry (edited or branch-only) passes its pending branch. */
  async function summarize(
    file: { id: string; path: string },
    token: string,
    status: EntrySummary['status'],
    repo = runtime.backend,
  ): Promise<EntrySummary> {
    try {
      const raw = await readRaw(repo, file.path, token);
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

  /** Read an entry's list row from its pending branch, so a pending title or draft change shows
   *  in the list instead of reading as a lost save. summarize degrades a failed or empty read to
   *  an id-only row, so a ghost ref still lists. */
  function pendingRow(concept: ConceptDescriptor, id: string, status: EntrySummary['status'], token: string): Promise<EntrySummary> {
    return summarize({ id, path: `${concept.dir}/${filenameFromId(id)}` }, token, status, {
      ...runtime.backend,
      branch: pendingBranch(concept.id, id),
    });
  }

  /** The per-file crawl, kept only for a repo with no committed manifest yet: list main's files
   *  and read each one for its row, with edited and new rows reading branch-first. */
  async function crawlEntries(concept: ConceptDescriptor, pendingIds: Set<string>, token: string): Promise<EntrySummary[]> {
    const files = await listMarkdown(runtime.backend, concept.dir, token);
    const entries = await Promise.all(
      files.map((f) => (pendingIds.has(f.id) ? pendingRow(concept, f.id, 'edited', token) : summarize(f, token, 'published'))),
    );
    // A ref with no main file is a never-published entry; its row reads from its branch.
    const listed = new Set(files.map((f) => f.id));
    const newRows = await Promise.all(
      [...pendingIds].filter((id) => !listed.has(id)).map((id) => pendingRow(concept, id, 'new', token)),
    );
    return [...entries, ...newRows];
  }

  /** List a concept's entries with their publish status. Published rows project straight from
   *  main's manifest, which publish, delete, and rename keep atomically in sync with main, so
   *  the listing costs one manifest read plus one branch read per pending entry rather than one
   *  read per file. A manifest row with a pending ref is `edited` and reads branch-first; a ref
   *  with no manifest row appends a `new` row read from its branch. A listing failure degrades
   *  to an inline error, not a thrown 500. */
  async function listLoad(event: ContentEvent): Promise<ListData> {
    requireSession(event);
    const concept = conceptOf(runtime, event.params);
    const formError = event.url.searchParams.get('error');
    const publishedAllRaw = event.url.searchParams.get('publishedAll');
    const publishedAll = publishedAllRaw !== null && /^\d+$/.test(publishedAllRaw) ? Number(publishedAllRaw) : null;
    const base = { conceptId: concept.id, label: concept.label, singular: concept.singular, dated: concept.routing.dated, formError, publishedAll };
    let token: string;
    try {
      token = await mintToken(event.platform?.env ?? {});
    } catch {
      return { ...base, entries: [], error: 'Could not authenticate with GitHub.' };
    }
    try {
      const [manifestRaw, refs] = await Promise.all([
        readRaw(runtime.backend, runtime.manifestPath, token),
        listBranches(runtime.backend, `${PENDING_PREFIX}${concept.id}/`, token),
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
        return { ...base, entries: await crawlEntries(concept, pendingIds, token), error: null };
      }
      // Newest id first, the same order the crawl's file listing produced.
      const rows = parseManifest(manifestRaw)
        .entries.filter((e) => e.concept === concept.id)
        .sort((a, b) => b.id.localeCompare(a.id));
      const entries = await Promise.all(
        rows.map((e) =>
          pendingIds.has(e.id)
            ? pendingRow(concept, e.id, 'edited', token)
            : { id: e.id, title: e.title, date: e.date ?? null, draft: e.draft, status: 'published' as const, summary: e.summary ?? null },
        ),
      );
      const listed = new Set(rows.map((e) => e.id));
      const newRows = await Promise.all(
        [...pendingIds].filter((id) => !listed.has(id)).map((id) => pendingRow(concept, id, 'new', token)),
      );
      return { ...base, entries: [...entries, ...newRows], error: null };
    } catch {
      return { ...base, entries: [], error: 'Could not load this content type from GitHub.' };
    }
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

    const token = await mintToken(event.platform?.env ?? {});
    const existing = await readRaw(runtime.backend, `${concept.dir}/${filenameFromId(id)}`, token);
    if (existing !== null) return bounce('An entry with that slug already exists.');
    // A pending branch is an entry too (saved but not yet published); refuse to clobber it.
    if ((await branchHeadSha(runtime.backend, pendingBranch(concept.id, id), token)) !== null) {
      return bounce('An unpublished entry with that slug already exists.');
    }

    throw redirect(303, `/admin/${concept.id}/${id}?new=1`);
  }

  /** Coerce parsed frontmatter to the form-ready values the editor inputs expect. */
  function formValues(fields: FrontmatterField[], frontmatter: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const field of fields) {
      const value = frontmatter[field.name];
      if (field.type === 'date') out[field.name] = dateInputValue(value);
      else if (field.type === 'boolean') out[field.name] = value === true;
      else if (field.type === 'tags' || field.type === 'freetags') out[field.name] = Array.isArray(value) ? value.map(String) : [];
      else out[field.name] = typeof value === 'string' ? value : value == null ? '' : String(value);
    }
    return out;
  }

  /** Open a file for editing. A `?new=1` miss yields a blank document; any other miss is a 404. */
  async function editLoad(event: ContentEvent): Promise<EditData> {
    requireSession(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const isNew = event.url.searchParams.get('new') === '1';
    const token = await mintToken(event.platform?.env ?? {});
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
    const [headSha, mainRaw, manifestRaw, mediaRaw] = await Promise.all([
      branchHeadSha(runtime.backend, branch, token),
      readRaw(runtime.backend, path, token),
      readRaw(runtime.backend, runtime.manifestPath, token),
      runtime.resolvedAssets.enabled
        ? readRaw(runtime.backend, runtime.mediaManifestPath, token).catch(() => null)
        : Promise.resolve(null),
    ]);
    const pending = headSha !== null;
    const raw = pending ? await readRaw({ ...runtime.backend, branch }, path, token) : mainRaw;
    if (raw === null && !isNew) throw error(404, 'Entry not found');
    const published = mainRaw !== null;

    const parsed = raw === null ? { frontmatter: {}, body: '' } : parseMarkdown(raw);
    const title = typeof parsed.frontmatter.title === 'string' && parsed.frontmatter.title.trim() ? parsed.frontmatter.title : id;

    let linkTargets: LinkTarget[] = [];
    let inbound: InboundLink[] = [];
    if (manifestRaw !== null) {
      const manifest = parseManifest(manifestRaw);
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

    // Project the committed media manifest to the minimal resolver input: only the three fields the
    // preview resolver needs, keyed by hash. A corrupt committed file degrades to empty, not a throw.
    const mediaTargets: EditData['mediaTargets'] = {};
    if (mediaRaw !== null) {
      let mediaJson: unknown;
      try {
        mediaJson = JSON.parse(mediaRaw);
      } catch {
        mediaJson = null;
      }
      for (const [hash, e] of Object.entries(parseMediaManifest(mediaJson))) {
        mediaTargets[hash] = { slug: e.slug, ext: e.ext, contentType: e.contentType };
      }
    }

    return {
      conceptId: concept.id,
      id,
      label: concept.label,
      fields: concept.fields,
      frontmatter: formValues(concept.fields, parsed.frontmatter),
      body: parsed.body,
      title,
      isNew,
      saved: event.url.searchParams.get('saved') === '1',
      renamed: event.url.searchParams.get('renamed') === '1',
      error: event.url.searchParams.get('error'),
      slug: slugFromId(id, datePrefix),
      linkTargets,
      mediaTargets,
      inboundLinks: inbound,
      pending,
      published,
      publishedFlash: event.url.searchParams.get('published') === '1',
      discardedFlash: event.url.searchParams.get('discarded') === '1',
      preview: resolvePreview(runtime.preview, concept.id),
    };
  }

  /** Log a failed commit: a conflict is the expected last-writer-wins outcome, so it warns with a
   *  reason; any other error is unexpected and logs at error with the stringified cause. Publish
   *  failures carry the same shape under their own event name. */
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

  /** The shared commit catch for the entry actions: log the failure, bounce a conflict back to
   *  `page` with `message` as the inline error, and rethrow anything else. `query` keeps any extra
   *  params the bounce must carry (saveAction's `&new=1`). */
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

  /** The held outcome of a validated save: everything publish needs to copy the same markdown
   *  to main without re-reading the branch. `branchSha` is the branch commit saveToBranch just
   *  made, the guard for the post-publish branch delete; `manifest` is main's manifest with
   *  this entry's row upserted from the new markdown (the same last-writer-wins manifest race
   *  as delete and rename applies, caught by the build's fail-closed backstop). */
  interface SaveHold {
    path: string;
    markdown: string;
    branch: string;
    branchSha: string;
    manifest: Manifest;
    /** The draft-target tokens the body links to, for save's warning query. */
    draftLinks: string[];
    token: string;
    /** The merged media.json change this save committed to the branch, when media is on and the
     *  post carried records. Publish reuses it verbatim so the main commit promotes the exact same
     *  merged content (decision 1: the default-branch base is read once, here, not re-merged at
     *  publish). Absent when media is off or no records were posted. */
    mediaChange?: FileChange;
  }

  /** The shared core of save and publish: parse the posted form, validate the frontmatter,
   *  guard the body's cairn links, ensure the pending branch, and commit the entry file there
   *  with the session editor as author. Returns the broken-link fail for the page to render,
   *  or the held state; throws the redirect bounces save has always thrown (invalid
   *  frontmatter, a branch-commit conflict). Main stays untouched. */
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

    const result = concept.validate(frontmatterFromForm(concept.fields, form), body);
    if (!result.ok) {
      const message = Object.values(result.errors)[0] ?? 'Invalid frontmatter';
      throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent(message)}${suffix}`);
    }

    const markdown = serializeMarkdown(result.data, body);
    const token = await mintToken(event.platform?.env ?? {});

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
        const baseRaw = await readRaw(runtime.backend, runtime.mediaManifestPath, token);
        let mediaManifest = parseMediaManifest(parseMediaJson(baseRaw));
        for (const record of records) {
          mediaManifest = upsertMediaEntry(mediaManifest, record);
        }
        mediaChange = { path: runtime.mediaManifestPath, content: serializeMediaManifest(mediaManifest) };
      }
    }

    // Upsert this entry's row into main's manifest in memory, for the link guard here and for
    // the publish commit. The save commits no manifest change; publish lands the upsert on main.
    const manifest = await readManifest(token);
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

    // Ensure the entry's pending branch exists (cut lazily from main's head on first save), then
    // commit only the entry file there. Main stays untouched until publish, so the branch differs
    // from main at exactly this entry's path.
    const branch = pendingBranch(concept.id, id);
    if ((await branchHeadSha(runtime.backend, branch, token)) === null) {
      const mainHead = await branchHeadSha(runtime.backend, runtime.backend.branch, token);
      if (mainHead === null) throw error(500, 'Cannot read the default branch');
      await createBranch(runtime.backend, branch, mainHead, token);
    }

    const commitFields = { concept: concept.id, id, editor: editor.email, branch };
    let branchSha: string;
    try {
      branchSha = await commitFiles(
        { ...runtime.backend, branch },
        mediaChange ? [{ path, content: markdown }, mediaChange] : [{ path, content: markdown }],
        { message: `Update ${concept.label.toLowerCase()}: ${id}`, author: { name: editor.displayName, email: editor.email } },
        token,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      commitFailure(commitFields, err, `/admin/${concept.id}/${id}`,
        'This file changed since you opened it. Reload and reapply your edits.', { query: suffix });
    }
    return { path, markdown, branch, branchSha, manifest: upserted, draftLinks, token, mediaChange };
  }

  /** Save an edit: validate, then commit to the entry's pending branch with the session editor
   *  as author. Main and its manifest stay untouched until publish. Fails safe on 409. */
  async function saveAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = requireSession(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    // Confine the commit path to the concept dir, built from a validated id (the App token can
    // write anywhere in the repo). Reject before touching GitHub.
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const held = await saveToBranch(event, editor, concept, id);
    if (!('branchSha' in held)) return held;
    const savedQuery = held.draftLinks.length
      ? `saved=1&drafts=${encodeURIComponent(held.draftLinks.join(','))}`
      : 'saved=1';
    throw redirect(303, `/admin/${concept.id}/${id}?${savedQuery}`);
  }

  /** Publish an entry: validate and hold the posted form exactly like save (the branch gets the
   *  same commit), then copy that markdown to main with the manifest row upserted in one atomic
   *  commit. Publish-what-you-see: the posted form is the published content, so text typed
   *  after the last save goes live too, and publish works regardless of prior branch state.
   *  The branch is deleted only when its head still matches the commit this action made; a
   *  concurrent save moved it, so the entry stays pending and the next publish picks it up. */
  async function publishAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = requireSession(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const held = await saveToBranch(event, editor, concept, id);
    if (!('branchSha' in held)) return held;
    const { path, markdown, branch, branchSha, manifest, token, mediaChange } = held;

    // The publish commit reuses the exact merged media.json saveToBranch already built (decision 1:
    // no re-read or re-merge here). Promote it to main alongside the body and the content manifest
    // in one atomic commit, or commit those two alone when the save touched no media.
    const changes: FileChange[] = [
      { path, content: markdown },
      { path: runtime.manifestPath, content: serializeManifest(manifest) },
    ];
    if (mediaChange) changes.push(mediaChange);

    const commitFields = { concept: concept.id, id, editor: editor.email };
    try {
      await commitFiles(
        runtime.backend,
        changes,
        { message: `Publish ${concept.label.toLowerCase()}: ${id}`, author: { name: editor.displayName, email: editor.email } },
        token,
      );
      log.info('entry.published', { ...commitFields, batch: false });
    } catch (err) {
      // The branch already holds the just-committed edits, so a conflict here loses nothing.
      commitFailure(commitFields, err, `/admin/${concept.id}/${id}`,
        'Your edits are saved. Reload and publish again.', { event: 'publish.failed' });
    }
    // Only after the main commit lands, and only when the branch head is still the commit this
    // action made: a head that moved is a concurrent save, and deleting it would destroy edits.
    // No log event for the skip; the pending badge is the surface.
    if ((await branchHeadSha(runtime.backend, branch, token)) === branchSha) {
      await deleteBranch(runtime.backend, branch, token);
    }
    throw redirect(303, `/admin/${concept.id}/${id}?published=1`);
  }

  /** Publish every pending entry site-wide: one atomic commit on main carrying each branch's
   *  entry file plus the manifest with every row upserted, then delete the consumed branches.
   *  Mounted on the concept list shim, but the topbar posts here from anywhere, so the route's
   *  concept param is ignored and the redirect lands on the first configured concept. */
  async function publishAllAction(event: ContentEvent): Promise<never> {
    const editor = requireSession(event);
    const first = runtime.concepts[0];
    if (!first) throw error(404, 'No content types configured');
    const token = await mintToken(event.platform?.env ?? {});
    const listPage = `/admin/${first.id}`;

    // Each cairn/ ref names a pending entry; the shared predicate skips a stray ref rather
    // than failing the whole batch on it.
    const names = await listBranches(runtime.backend, PENDING_PREFIX, token);
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
        const sha = await branchHeadSha(runtime.backend, entry.branch, token);
        const raw = await readRaw({ ...runtime.backend, branch: entry.branch }, entry.path, token);
        return { ...entry, sha, raw };
      }),
    );

    // Fold main's manifest once over every row, so the batch lands content and index together,
    // the same shape as a single publish.
    let next = await readManifest(token);
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
      await commitFiles(
        runtime.backend,
        changes,
        { message: `Publish ${published.length} ${noun}`, author: { name: editor.displayName, email: editor.email } },
        token,
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
        if ((await branchHeadSha(runtime.backend, entry.branch, token)) === entry.sha) {
          await deleteBranch(runtime.backend, entry.branch, token);
        }
      } catch {
        // The entry is live; the straggler just shows as still pending until the next publish.
      }
    }
    throw redirect(303, `${listPage}?publishedAll=${published.length}`);
  }

  /** Discard an entry's pending edits: delete the branch (tolerant of already-gone) and return to
   *  the edit page when the entry lives on main, else to the list (the entry is gone entirely). */
  async function discardAction(event: ContentEvent): Promise<never> {
    const editor = requireSession(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const token = await mintToken(event.platform?.env ?? {});

    await deleteBranch(runtime.backend, pendingBranch(concept.id, id), token);
    log.info('entry.discarded', { concept: concept.id, id, editor: editor.email });

    const onMain = await readRaw(runtime.backend, `${concept.dir}/${filenameFromId(id)}`, token);
    if (onMain !== null) throw redirect(303, `/admin/${concept.id}/${id}?discarded=1`);
    throw redirect(303, `/admin/${concept.id}`);
  }

  /** The shared delete core. Block-until-clean: refuse while inbound links exist (naming them), else
   *  commit the file removal and the manifest patch in one commit. The inbound recheck here is the
   *  authoritative gate, closing the load-to-delete race. Both the editor delete (id from params) and
   *  the list delete (id from the form body) call this with an already-validated id, so the guard is
   *  enforced once. */
  async function deleteEntry(
    event: ContentEvent,
    concept: ConceptDescriptor,
    id: string,
    editor: Editor,
  ): Promise<ReturnType<typeof fail> | never> {
    const path = `${concept.dir}/${filenameFromId(id)}`;
    const token = await mintToken(event.platform?.env ?? {});

    // An absent manifest degrades the inbound gate to "allow": with no manifest there is nothing to
    // check, and the build's cairn: backstop still catches any dangling token, mirroring saveAction.
    const manifest = await readManifest(token);
    const inbound = inboundLinks(manifest, concept.id, id);
    if (inbound.length) {
      return fail(409, {
        error: `Cannot delete ${id}: ${inbound.length} ${inbound.length === 1 ? 'page links' : 'pages link'} to it.`,
        inboundLinks: inbound,
        id,
      } satisfies DeleteRefusal);
    }

    // When the entry was never published (absent from main), the branch delete is the whole
    // operation; main has nothing to commit, so the only honest log record is the discard of
    // the pending edits.
    const onMain = await readRaw(runtime.backend, path, token);
    if (onMain === null) {
      await deleteBranch(runtime.backend, pendingBranch(concept.id, id), token);
      log.info('entry.discarded', { concept: concept.id, id, editor: editor.email });
      throw redirect(303, `/admin/${concept.id}`);
    }

    const nextManifest = serializeManifest(removeEntry(manifest, concept.id, id));
    const commitFields = { concept: concept.id, id, editor: editor.email };
    try {
      await commitFiles(
        runtime.backend,
        [
          { path, content: null },
          { path: runtime.manifestPath, content: nextManifest },
        ],
        { message: `Delete ${concept.label.toLowerCase()}: ${id}`, author: { name: editor.displayName, email: editor.email } },
        token,
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
      await deleteBranch(runtime.backend, pendingBranch(concept.id, id), token);
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

  /** Rename an entry: change its slug, move the file, and rewrite every inbound cairn token in one
   *  atomic commit, so no internal link breaks. The collision check and the inbound recompute here
   *  are the authoritative gate. The same last-writer-wins manifest race as save and delete applies,
   *  caught by the build's fail-closed backstop. */
  async function renameAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = requireSession(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const token = await mintToken(event.platform?.env ?? {});

    // Pending edits on the branch are keyed to the old id; renaming underneath them would strand
    // them, so refuse until the editor publishes or discards.
    if ((await branchHeadSha(runtime.backend, pendingBranch(concept.id, id), token)) !== null) {
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
    const clobber = await readRaw(runtime.backend, newPath, token);
    if (clobber !== null) {
      return fail(409, { error: 'An entry with that slug already exists.' } satisfies RenameFailure);
    }

    const [entryRaw, manifest] = await Promise.all([
      readRaw(runtime.backend, oldPath, token),
      readManifest(token),
    ]);
    if (entryRaw === null) throw error(404, 'Entry not found');

    const oldHref = formatCairnToken({ concept: concept.id, id });
    const newHref = formatCairnToken({ concept: concept.id, id: newId });

    // The moved file keeps its content, except a self-token rewrite. Re-derive its manifest row from
    // the new path so the row carries the new id and permalink by construction.
    const movedRaw = rewriteCairnLink(entryRaw, oldHref, newHref);
    const changes: FileChange[] = [
      { path: oldPath, content: null },
      { path: newPath, content: movedRaw },
    ];
    let next = removeEntry(manifest, concept.id, id);
    next = upsertEntry(next, manifestEntryFromFile(concept, { path: newPath, raw: movedRaw }));

    // Rewrite every inbound linker's body and re-derive its row, so its outbound edge points at the
    // new id. A linker missing from the repo is skipped; the build backstop catches any drift.
    for (const linker of inboundLinks(manifest, concept.id, id)) {
      const linkerConcept = findConcept(runtime.concepts, linker.concept);
      if (!linkerConcept) continue;
      const linkerPath = `${linkerConcept.dir}/${filenameFromId(linker.id)}`;
      const linkerRaw = await readRaw(runtime.backend, linkerPath, token);
      if (linkerRaw === null) continue;
      const rewritten = rewriteCairnLink(linkerRaw, oldHref, newHref);
      changes.push({ path: linkerPath, content: rewritten });
      next = upsertEntry(next, manifestEntryFromFile(linkerConcept, { path: linkerPath, raw: rewritten }));
    }

    changes.push({ path: runtime.manifestPath, content: serializeManifest(next) });

    const commitFields = { concept: concept.id, id: newId, editor: editor.email };
    try {
      await commitFiles(
        runtime.backend,
        changes,
        { message: `Rename ${concept.label.toLowerCase()}: ${id} to ${newId}`, author: { name: editor.displayName, email: editor.email } },
        token,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      commitFailure(commitFields, err, `/admin/${concept.id}/${id}`,
        'This file changed since you opened it. Reload and try again.');
    }
    throw redirect(303, `/admin/${concept.id}/${newId}?renamed=1`);
  }

  /**
   * Ingest an uploaded image: the JSON/fetch endpoint with the untrusted-input contract (spec piece
   * 2, decisions 1 to 3). The body is the raw file bytes, read once; the human metadata travels in
   * percent-encoded `X-Cairn-*` request headers. The server owns every committed field and trusts no
   * client value: it sniffs the real type, screens the engine deny-list, re-hashes, re-derives the
   * ext and slug, caps and sanitizes the human fields, and clamps the advisory dimensions. It stores
   * put-first to R2 with content-addressed dedup (no second put for identical bytes, no
   * compensating delete) and commits nothing to git. Every non-success path returns `fail(status,
   * data)` (an HTTP error a `fetch` caller reads as JSON) and logs `media.upload_failed`; success
   * returns an HTTP 200 plain object and logs `media.uploaded`.
   */
  async function uploadAction(event: ContentEvent): Promise<ReturnType<typeof fail> | UploadResult> {
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
    //    an oversize length is a 413. Both refuse before the bytes are buffered.
    const lengthHeader = event.request.headers.get('content-length');
    const length = lengthHeader === null ? NaN : Number(lengthHeader);
    if (!Number.isInteger(length) || length <= 0) return refuse(411, 'length-required');
    if (length > resolved.maxUploadBytes) return refuse(413, 'too-large');

    // 3. CSRF from the X-Cairn-CSRF header (no body clone): the action is the CSRF authority for the
    //    raw-body upload, since the guard runs its form-CSRF only on form content types.
    if (!event.cookies || !validateCsrfHeader({ url: event.url, request: event.request, cookies: event.cookies })) {
      return refuse(403, 'csrf');
    }

    // 4. JSON-aware session: read the resolved editor directly. requireSession throws a 303 a fetch
    //    caller silently follows, so an expired session must surface as a 401 JSON instead.
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
      // Identical bytes are already stored: skip the put. A second upload does no second put, so a
      // concurrent dedup-reuse is never clobbered. Flag a stored type that disagrees with this sniff.
      reused = true;
      mismatch = existing.httpMetadata?.contentType !== undefined && existing.httpMetadata.contentType !== sniffed;
    } else {
      await store.put(key, bytes, { contentType: sniffed, cacheControl: 'public, max-age=31536000, immutable' });
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

  return { layoutLoad, indexRedirect, listLoad, createAction, editLoad, saveAction, publishAction, publishAllAction, discardAction, deleteAction, listDeleteAction, renameAction, uploadAction, mintToken };
}

/** The cap, in characters, on the stored alt text. The human fields are display copy, not content,
 *  so a generous cap rejects only abuse-scale input. */
const MAX_ALT = 160;
/** The cap, in characters, on the stored display name. */
const MAX_DISPLAY_NAME = 120;
/** The cap, in characters, on the stored original filename. */
const MAX_ORIGINAL_FILENAME = 120;
/** The largest pixel dimension kept; anything larger is treated as bogus and clamped to null. */
const MAX_DIMENSION = 60000;

/** Decode a percent-encoded header value, yielding `''` on a malformed sequence or an absent header,
 *  so a hostile `X-Cairn-*` value cannot throw past the gate. */
function safeDecode(value: string | null): string {
  if (value === null) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

/** The basename of a decoded filename: the final path segment after any `/` or `\`. A client value
 *  of `../../evil.png` yields `evil.png`, so no path component reaches the stored record. */
function basename(name: string): string {
  const parts = name.split(/[/\\]/);
  return parts[parts.length - 1];
}

/** Strip control characters from a human field and cap it at `max` characters. Control characters
 *  (C0 and DEL) never belong in display copy and could corrupt a log line or a committed JSON. */
function sanitizeField(value: string, max: number): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
}

/** Parse an advisory pixel dimension header. A valid integer in `[1, MAX_DIMENSION]` is kept; an
 *  absent, non-numeric, or out-of-range value becomes null (MediaEntry dimensions are `number | null`). */
function clampDimension(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_DIMENSION) return null;
  return n;
}
