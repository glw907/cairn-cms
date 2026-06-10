// The admin content routes: the load and action functions a site's /admin/** shims call.
// A factory closes over the composed runtime and the GitHub token mint, so the read and
// commit paths are unit-testable against a fetch double with an injected token, mirroring the
// email `send` injection in auth-routes. A shim stays one line: `export const load = routes.editLoad`.
import { redirect, error, fail } from '@sveltejs/kit';
import { findConcept } from '../content/concepts.js';
import { extractCairnLinks, formatCairnToken } from '../content/links.js';
import { frontmatterFromForm, parseMarkdown, dateInputValue, serializeMarkdown } from '../content/frontmatter.js';
import { isValidId, slugify, filenameFromId, composeDatedId, slugFromId, renameId } from '../content/ids.js';
import { rewriteCairnLink } from '../components/markdown-format.js';
import { appCredentials, type GithubKeyEnv } from '../github/credentials.js';
import { listMarkdown, readRaw, commitFiles, type FileChange } from '../github/repo.js';
import { branchHeadSha, createBranch, deleteBranch, listBranches } from '../github/branches.js';
import { PENDING_PREFIX, pendingBranch, parsePendingBranch } from '../content/pending.js';
import { cachedInstallationToken } from '../github/signing.js';
import { emptyManifest, manifestEntryFromFile, parseManifest, serializeManifest, upsertEntry, removeEntry, inboundLinks, type LinkTarget, type InboundLink } from '../content/manifest.js';
import { CommitConflictError } from '../github/types.js';
import { log } from '../log/index.js';
import { issueCsrfToken } from './csrf.js';
import type { CookieJar } from './types.js';
import type { CairnRuntime, ConceptDescriptor, FrontmatterField } from '../content/types.js';
import type { Editor, Role } from '../auth/types.js';

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
}

/** The concept list view's data. */
export interface ListData {
  conceptId: string;
  label: string;
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
}

/** The structural event the content routes read; a real SvelteKit RequestEvent satisfies it. */
export interface ContentEvent {
  url: URL;
  params: Record<string, string>;
  request: Request;
  locals: { editor?: Editor | null };
  platform?: { env?: GithubKeyEnv };
  /** SvelteKit's cookie jar. The layout load reads the persisted admin theme and issues the CSRF
   *  token. Optional for non-route callers. */
  cookies?: CookieJar;
}

/** Injectable dependencies; tests stub the token mint to avoid signing a real key. */
export interface ContentRoutesDeps {
  /** Mint a GitHub App installation token from the Worker env. Defaults to the real signer. */
  mintToken?: (env: GithubKeyEnv) => Promise<string>;
}

/** The signed-in editor the guard resolved, or a login redirect. Kept local to decouple event shapes. */
function sessionOf(event: ContentEvent): Editor {
  const editor = event.locals.editor;
  if (!editor) throw redirect(303, '/admin/login');
  return editor;
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

  /** Layout load for every admin page: the nav, the user, the active path, the resolved theme,
   *  and the pending entries behind the topbar's publish-all action. */
  async function layoutLoad(event: ContentEvent): Promise<LayoutData> {
    const editor = sessionOf(event);
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
      pendingEntries = names
        .map(parsePendingBranch)
        .filter((entry): entry is { concept: string; id: string } => entry !== null);
    } catch {
      pendingEntries = null;
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
   *  repo defaults to main; a branch-only (never published) entry passes its pending branch. */
  async function summarize(
    file: { id: string; path: string },
    token: string,
    status: EntrySummary['status'],
    repo = runtime.backend,
  ): Promise<EntrySummary> {
    try {
      const raw = await readRaw(repo, file.path, token);
      if (raw === null) return { id: file.id, title: file.id, date: null, draft: false, status };
      const { frontmatter } = parseMarkdown(raw);
      const title = typeof frontmatter.title === 'string' && frontmatter.title.trim() ? frontmatter.title : file.id;
      const date = dateInputValue(frontmatter.date) || null;
      return { id: file.id, title, date, draft: frontmatter.draft === true, status };
    } catch {
      return { id: file.id, title: file.id, date: null, draft: false, status };
    }
  }

  /** List a concept's entries with their publish status. Main's files carry `edited` when a
   *  pending ref exists, else `published`; a ref with no main file appends a `new` row read from
   *  its branch. A listing failure degrades to an inline error, not a thrown 500. */
  async function listLoad(event: ContentEvent): Promise<ListData> {
    sessionOf(event);
    const concept = conceptOf(runtime, event.params);
    const formError = event.url.searchParams.get('error');
    const publishedAllRaw = event.url.searchParams.get('publishedAll');
    const publishedAll = publishedAllRaw !== null && /^\d+$/.test(publishedAllRaw) ? Number(publishedAllRaw) : null;
    const base = { conceptId: concept.id, label: concept.label, dated: concept.routing.dated, formError, publishedAll };
    let token: string;
    try {
      token = await mintToken(event.platform?.env ?? {});
    } catch {
      return { ...base, entries: [], error: 'Could not authenticate with GitHub.' };
    }
    try {
      const [files, refs] = await Promise.all([
        listMarkdown(runtime.backend, concept.dir, token),
        listBranches(runtime.backend, `${PENDING_PREFIX}${concept.id}/`, token),
      ]);
      const pendingIds = new Set(
        refs.map(parsePendingBranch).flatMap((ref) => (ref && ref.concept === concept.id ? [ref.id] : [])),
      );
      const entries = await Promise.all(
        files.map((f) => summarize(f, token, pendingIds.has(f.id) ? 'edited' : 'published')),
      );
      // A ref with no main file is a never-published entry; its row reads from its branch, and
      // summarize already degrades a failed read to an id-only row.
      const listed = new Set(files.map((f) => f.id));
      const newRows = await Promise.all(
        [...pendingIds]
          .filter((id) => !listed.has(id))
          .map((id) =>
            summarize({ id, path: `${concept.dir}/${filenameFromId(id)}` }, token, 'new', {
              ...runtime.backend,
              branch: pendingBranch(concept.id, id),
            }),
          ),
      );
      return { ...base, entries: [...entries, ...newRows], error: null };
    } catch {
      return { ...base, entries: [], error: 'Could not load this content type from GitHub.' };
    }
  }

  /** Create a new entry: validate the slug, compose a dated id when the concept is dated, refuse to clobber. */
  async function createAction(event: ContentEvent): Promise<never> {
    sessionOf(event);
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
    sessionOf(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const isNew = event.url.searchParams.get('new') === '1';
    const token = await mintToken(event.platform?.env ?? {});
    const datePrefix = concept.routing.dated ? concept.datePrefix : null;
    const path = `${concept.dir}/${filenameFromId(id)}`;
    // A pending entry reads branch-first: the editor shows the unpublished edits. The manifest
    // (link targets and the inbound-link guard) always reads main, the authoritative copy, and a
    // pending entry adds a main read of its own path to derive its published state.
    const branch = pendingBranch(concept.id, id);
    const pending = (await branchHeadSha(runtime.backend, branch, token)) !== null;
    const [raw, manifestRaw, mainRaw] = await Promise.all([
      readRaw(pending ? { ...runtime.backend, branch } : runtime.backend, path, token),
      readRaw(runtime.backend, runtime.manifestPath, token),
      pending ? readRaw(runtime.backend, path, token) : Promise.resolve(null),
    ]);
    if (raw === null && !isNew) throw error(404, 'Entry not found');
    const published = pending ? mainRaw !== null : raw !== null;

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
      inboundLinks: inbound,
      pending,
      published,
      publishedFlash: event.url.searchParams.get('published') === '1',
      discardedFlash: event.url.searchParams.get('discarded') === '1',
    };
  }

  /** Match a commit conflict by class and by name (bundling can alias the class identity). */
  function isConflict(err: unknown): boolean {
    return err instanceof CommitConflictError || (err as { name?: string } | null)?.name === 'CommitConflictError';
  }

  /** Log a failed commit: a conflict is the expected last-writer-wins outcome, so it warns with a
   *  reason; any other error is unexpected and logs at error with the stringified cause. The caller
   *  still owns the redirect or rethrow, so control flow stays at the call site. Publish failures
   *  carry the same shape under their own event name. */
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

  /** Save an edit: validate, then commit to the entry's pending branch with the session editor
   *  as author. Main and its manifest stay untouched until publish. Fails safe on 409. */
  async function saveAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = sessionOf(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    // Confine the commit path to the concept dir, built from a validated id (the App token can
    // write anywhere in the repo). Reject before touching GitHub.
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
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

    // Read main's manifest (the authoritative one; pending branches carry no manifest copy) and
    // upsert this entry's row in memory, for the link guard only. The save commits no manifest
    // change; publish performs the upsert on main. A missing manifest starts empty (first save on
    // a fresh repo).
    const manifestRaw = await readRaw(runtime.backend, runtime.manifestPath, token);
    const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);
    const row = manifestEntryFromFile(concept, { path, raw: markdown });
    const upserted = upsertEntry(manifest, row);

    // Save guard: resolve the body's cairn links against main's manifest with this entry upserted,
    // so a self-link and a link to any published target resolves. A link to a target absent from
    // main hard-blocks the save (publishing this entry before its target would red the deploy
    // build); a link to a draft target commits with a warning, since it is valid and resolves once
    // the target is published.
    const byKey = new Map(upserted.entries.map((e) => [`${e.concept}/${e.id}`, e]));
    const absent: string[] = [];
    const draft: string[] = [];
    for (const ref of extractCairnLinks(body)) {
      // A self-link is valid by construction (the upserted manifest holds this very entry), so
      // skip it before classifying. Mirrors inboundLinks's self-exclusion.
      if (ref.concept === concept.id && ref.id === id) continue;
      const target = byKey.get(`${ref.concept}/${ref.id}`);
      if (!target) absent.push(formatCairnToken(ref));
      else if (target.draft) draft.push(formatCairnToken(ref));
    }
    if (absent.length) {
      return fail(400, { brokenLinks: absent, body });
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
    try {
      await commitFiles(
        { ...runtime.backend, branch },
        [{ path, content: markdown }],
        { message: `Update ${concept.label.toLowerCase()}: ${id}`, author: { name: editor.displayName, email: editor.email } },
        token,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      logCommitFailed(commitFields, err);
      if (isConflict(err)) {
        const message = 'This file changed since you opened it. Reload and reapply your edits.';
        throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent(message)}${suffix}`);
      }
      throw err;
    }
    const savedQuery = draft.length ? `saved=1&drafts=${encodeURIComponent(draft.join(','))}` : 'saved=1';
    throw redirect(303, `/admin/${concept.id}/${id}?${savedQuery}`);
  }

  /** Publish an entry's pending edits: copy the branch's entry file to main with the manifest row
   *  upserted, in one atomic commit, then delete the branch. A copy, never a merge, so a stale
   *  branch left by a crash between the commit and the delete re-publishes idempotently. */
  async function publishAction(event: ContentEvent): Promise<never> {
    const editor = sessionOf(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const path = `${concept.dir}/${filenameFromId(id)}`;
    const token = await mintToken(event.platform?.env ?? {});

    const bounce = (msg: string): never => {
      throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent(msg)}`);
    };
    const branch = pendingBranch(concept.id, id);
    if ((await branchHeadSha(runtime.backend, branch, token)) === null) {
      return bounce('Nothing to publish. This entry has no unpublished edits.');
    }
    const raw = await readRaw({ ...runtime.backend, branch }, path, token);
    if (raw === null) return bounce('Could not read the unpublished edits from GitHub.');

    // Main's manifest is the authoritative one (branches carry no manifest copy); the row derives
    // from the branch file, so publish lands the content and its index entry together.
    const manifestRaw = await readRaw(runtime.backend, runtime.manifestPath, token);
    const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);
    const next = upsertEntry(manifest, manifestEntryFromFile(concept, { path, raw }));

    const commitFields = { concept: concept.id, id, editor: editor.email };
    try {
      await commitFiles(
        runtime.backend,
        [
          { path, content: raw },
          { path: runtime.manifestPath, content: serializeManifest(next) },
        ],
        { message: `Publish ${concept.label.toLowerCase()}: ${id}`, author: { name: editor.displayName, email: editor.email } },
        token,
      );
      log.info('entry.published', { ...commitFields, batch: false });
    } catch (err) {
      logCommitFailed(commitFields, err, 'publish.failed');
      if (isConflict(err)) {
        const message = 'This file changed since you opened it. Reload and reapply your edits.';
        throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent(message)}`);
      }
      throw err;
    }
    // Only after the main commit lands: a failure above keeps the branch and its edits.
    await deleteBranch(runtime.backend, branch, token);
    throw redirect(303, `/admin/${concept.id}/${id}?published=1`);
  }

  /** Publish every pending entry site-wide: one atomic commit on main carrying each branch's
   *  entry file plus the manifest with every row upserted, then delete the consumed branches.
   *  Mounted on the concept list shim, but the topbar posts here from anywhere, so the route's
   *  concept param is ignored and the redirect lands on the first configured concept. */
  async function publishAllAction(event: ContentEvent): Promise<never> {
    const editor = sessionOf(event);
    const first = runtime.concepts[0];
    if (!first) throw error(404, 'No content types configured');
    const token = await mintToken(event.platform?.env ?? {});
    const listPage = `/admin/${first.id}`;

    // Each cairn/ ref names a pending entry. Skip a malformed name, an id that fails the slug
    // rule (the entry path is built from it, so this is the path confinement), and a concept
    // this site does not configure, rather than failing the whole batch on one stray ref.
    const names = await listBranches(runtime.backend, PENDING_PREFIX, token);
    const pending: { concept: ConceptDescriptor; id: string; branch: string; path: string }[] = [];
    for (const name of names) {
      const ref = parsePendingBranch(name);
      if (!ref || !isValidId(ref.id)) continue;
      const concept = findConcept(runtime.concepts, ref.concept);
      if (!concept) continue;
      pending.push({ concept, id: ref.id, branch: name, path: `${concept.dir}/${filenameFromId(ref.id)}` });
    }

    // Read each branch's entry file, and main's manifest once; fold every row in, so the batch
    // lands content and index together, the same shape as a single publish. A ghost ref whose
    // entry file is missing is skipped (discard can clean it up); it carries nothing to publish.
    const manifestRaw = await readRaw(runtime.backend, runtime.manifestPath, token);
    let next = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);
    const changes: FileChange[] = [];
    const published: { concept: string; id: string; branch: string }[] = [];
    for (const entry of pending) {
      const raw = await readRaw({ ...runtime.backend, branch: entry.branch }, entry.path, token);
      if (raw === null) continue;
      changes.push({ path: entry.path, content: raw });
      next = upsertEntry(next, manifestEntryFromFile(entry.concept, { path: entry.path, raw }));
      published.push({ concept: entry.concept.id, id: entry.id, branch: entry.branch });
    }
    if (published.length === 0) throw redirect(303, listPage);
    changes.push({ path: runtime.manifestPath, content: serializeManifest(next) });

    try {
      await commitFiles(
        runtime.backend,
        changes,
        { message: `Publish ${published.length} entries`, author: { name: editor.displayName, email: editor.email } },
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
    // Only after the main commit lands: a failure above keeps every branch and its edits. A
    // failed delete here leaves an idempotent straggler (re-publishing copies the same content),
    // so one failure does not abort the remaining deletes.
    for (const entry of published) {
      try {
        await deleteBranch(runtime.backend, entry.branch, token);
      } catch {
        // The entry is live; the straggler just shows as still pending until the next publish.
      }
    }
    throw redirect(303, `${listPage}?publishedAll=${published.length}`);
  }

  /** Discard an entry's pending edits: delete the branch (tolerant of already-gone) and return to
   *  the edit page when the entry lives on main, else to the list (the entry is gone entirely). */
  async function discardAction(event: ContentEvent): Promise<never> {
    const editor = sessionOf(event);
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
    const manifestRaw = await readRaw(runtime.backend, runtime.manifestPath, token);
    const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);
    const inbound = inboundLinks(manifest, concept.id, id);
    if (inbound.length) {
      return fail(409, { inboundLinks: inbound, id });
    }

    // Cascade to the pending branch before the main commit (tolerant of absence): the entry's
    // unpublished edits go with it. When the entry was never published (absent from main), the
    // branch delete is the whole operation; main has nothing to commit, so the only honest log
    // record is the discard of the pending edits.
    const onMain = await readRaw(runtime.backend, path, token);
    await deleteBranch(runtime.backend, pendingBranch(concept.id, id), token);
    if (onMain === null) {
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
      logCommitFailed(commitFields, err);
      if (isConflict(err)) {
        const message = 'This file changed since you opened it. Reload and try again.';
        throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent(message)}`);
      }
      throw err;
    }
    throw redirect(303, `/admin/${concept.id}`);
  }

  /** Delete an entry from its editor. The id comes from the route param. */
  async function deleteAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = sessionOf(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    return deleteEntry(event, concept, id, editor);
  }

  /** Delete an entry from the concept list. The id comes from the form body. */
  async function listDeleteAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = sessionOf(event);
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
    const editor = sessionOf(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const token = await mintToken(event.platform?.env ?? {});

    // Pending edits on the branch are keyed to the old id; renaming underneath them would strand
    // them, so refuse until the editor publishes or discards.
    if ((await branchHeadSha(runtime.backend, pendingBranch(concept.id, id), token)) !== null) {
      return fail(409, { renameError: 'This entry has unpublished edits. Publish or discard them, then rename.' });
    }

    const form = await event.request.formData();
    const newSlug = String(form.get('slug') ?? '').trim();
    if (!isValidId(newSlug)) {
      return fail(400, { renameError: 'Enter a valid slug: lowercase letters, numbers, and hyphens.' });
    }
    const datePrefix = concept.routing.dated ? concept.datePrefix : null;
    if (concept.routing.dated && /^\d{4}-/.test(newSlug)) {
      return fail(400, { renameError: 'Leave the date out of the slug.' });
    }
    if (newSlug === slugFromId(id, datePrefix)) {
      return fail(400, { renameError: 'That is already the slug.' });
    }
    const newId = renameId(id, newSlug, datePrefix);
    const oldPath = `${concept.dir}/${filenameFromId(id)}`;
    const newPath = `${concept.dir}/${filenameFromId(newId)}`;

    // Collision guard: refuse if a file already exists at the new path. This 409 covers two cases a
    // single readRaw cannot tell apart: a static collision with an existing entry, and a
    // concurrent-rename race where another editor renamed onto this path between load and submit.
    const clobber = await readRaw(runtime.backend, newPath, token);
    if (clobber !== null) {
      return fail(409, { renameError: 'An entry with that slug already exists.' });
    }

    const [entryRaw, manifestRaw] = await Promise.all([
      readRaw(runtime.backend, oldPath, token),
      readRaw(runtime.backend, runtime.manifestPath, token),
    ]);
    if (entryRaw === null) throw error(404, 'Entry not found');
    const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);

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
      logCommitFailed(commitFields, err);
      if (isConflict(err)) {
        const message = 'This file changed since you opened it. Reload and try again.';
        throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent(message)}`);
      }
      throw err;
    }
    throw redirect(303, `/admin/${concept.id}/${newId}?renamed=1`);
  }

  return { layoutLoad, indexRedirect, listLoad, createAction, editLoad, saveAction, publishAction, publishAllAction, discardAction, deleteAction, listDeleteAction, renameAction, mintToken };
}
