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
import { emptyManifest, manifestEntryFromFile, parseManifest, serializeManifest, upsertEntry, removeEntry, inboundLinks, type Manifest, type LinkTarget, type InboundLink } from '../content/manifest.js';
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

  /** Main's manifest, parsed. A missing file starts empty (a fresh repo before the first commit).
   *  Always read from main: pending branches carry no manifest copy. */
  async function readManifest(token: string): Promise<Manifest> {
    const raw = await readRaw(runtime.backend, runtime.manifestPath, token);
    return raw === null ? emptyManifest() : parseManifest(raw);
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
        refs.flatMap((name) => {
          const entry = pendingEntryOf(name);
          return entry && entry.concept.id === concept.id ? [entry.id] : [];
        }),
      );
      // An edited row reads branch-first like a new row, so a pending title or draft change
      // shows in the list instead of reading as a lost save.
      const entries = await Promise.all(
        files.map((f) =>
          pendingIds.has(f.id)
            ? summarize(f, token, 'edited', { ...runtime.backend, branch: pendingBranch(concept.id, f.id) })
            : summarize(f, token, 'published'),
        ),
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
    // (link targets and the inbound-link guard) always reads main, the authoritative copy.
    // Stage 1 runs the branch probe, the main-path read, and the manifest read concurrently,
    // so the probe does not serialize ahead of the other two; stage 2 adds the branch read
    // only when the probe found a branch, with the stage-1 main read serving as the published
    // signal either way.
    const branch = pendingBranch(concept.id, id);
    const [headSha, mainRaw, manifestRaw] = await Promise.all([
      branchHeadSha(runtime.backend, branch, token),
      readRaw(runtime.backend, path, token),
      readRaw(runtime.backend, runtime.manifestPath, token),
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
    let branchSha: string;
    try {
      branchSha = await commitFiles(
        { ...runtime.backend, branch },
        [{ path, content: markdown }],
        { message: `Update ${concept.label.toLowerCase()}: ${id}`, author: { name: editor.displayName, email: editor.email } },
        token,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      commitFailure(commitFields, err, `/admin/${concept.id}/${id}`,
        'This file changed since you opened it. Reload and reapply your edits.', { query: suffix });
    }
    return { path, markdown, branch, branchSha, manifest: upserted, draftLinks, token };
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
    const editor = sessionOf(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    const held = await saveToBranch(event, editor, concept, id);
    if (!('branchSha' in held)) return held;
    const { path, markdown, branch, branchSha, manifest, token } = held;

    const commitFields = { concept: concept.id, id, editor: editor.email };
    try {
      await commitFiles(
        runtime.backend,
        [
          { path, content: markdown },
          { path: runtime.manifestPath, content: serializeManifest(manifest) },
        ],
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
    const editor = sessionOf(event);
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
    const manifest = await readManifest(token);
    const inbound = inboundLinks(manifest, concept.id, id);
    if (inbound.length) {
      return fail(409, { inboundLinks: inbound, id });
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

  return { layoutLoad, indexRedirect, listLoad, createAction, editLoad, saveAction, publishAction, publishAllAction, discardAction, deleteAction, listDeleteAction, renameAction, mintToken };
}
