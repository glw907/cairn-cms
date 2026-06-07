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
import { cachedInstallationToken } from '../github/signing.js';
import { emptyManifest, manifestEntryFromFile, parseManifest, serializeManifest, upsertEntry, removeEntry, inboundLinks, type LinkTarget, type InboundLink } from '../content/manifest.js';
import { CommitConflictError } from '../github/types.js';
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
}

/** One row in a concept's list view. */
export interface EntrySummary {
  id: string;
  title: string;
  date: string | null;
  draft: boolean;
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
}

/** The structural event the content routes read; a real SvelteKit RequestEvent satisfies it. */
export interface ContentEvent {
  url: URL;
  params: Record<string, string>;
  request: Request;
  locals: { editor?: Editor | null };
  platform?: { env?: GithubKeyEnv };
  /** SvelteKit's cookie jar; the layout load reads the persisted admin theme. Optional for non-route callers. */
  cookies?: { get(name: string): string | undefined };
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

  /** Layout load for every admin page: the nav, the user, the active path, and the resolved theme. */
  function layoutLoad(event: ContentEvent): LayoutData {
    const editor = sessionOf(event);
    const cookieTheme = event.cookies?.get('cairn-admin-theme');
    const theme = cookieTheme === 'cairn-admin-dark' ? 'cairn-admin-dark' : 'cairn-admin';
    return {
      siteName: runtime.siteName,
      user: { displayName: editor.displayName, email: editor.email, role: editor.role },
      concepts: runtime.concepts.map((c) => ({ id: c.id, label: c.label })),
      pathname: event.url.pathname,
      canManageEditors: editor.role === 'owner',
      navLabel: runtime.navMenu?.label ?? null,
      theme,
    };
  }

  /** Redirect /admin to the first concept's list (spec §7.6: land on the first concept). */
  function indexRedirect(): never {
    const first = runtime.concepts[0];
    if (!first) throw error(404, 'No content types configured');
    throw redirect(307, `/admin/${first.id}`);
  }

  /** Read a file's frontmatter for its list row, degrading to the id on any read failure. */
  async function summarize(file: { id: string; path: string }, token: string): Promise<EntrySummary> {
    try {
      const raw = await readRaw(runtime.backend, file.path, token);
      if (raw === null) return { id: file.id, title: file.id, date: null, draft: false };
      const { frontmatter } = parseMarkdown(raw);
      const title = typeof frontmatter.title === 'string' && frontmatter.title.trim() ? frontmatter.title : file.id;
      const date = dateInputValue(frontmatter.date) || null;
      return { id: file.id, title, date, draft: frontmatter.draft === true };
    } catch {
      return { id: file.id, title: file.id, date: null, draft: false };
    }
  }

  /** List a concept's entries. A listing failure degrades to an inline error, not a thrown 500. */
  async function listLoad(event: ContentEvent): Promise<ListData> {
    sessionOf(event);
    const concept = conceptOf(runtime, event.params);
    const formError = event.url.searchParams.get('error');
    const base = { conceptId: concept.id, label: concept.label, dated: concept.routing.dated, formError };
    let token: string;
    try {
      token = await mintToken(event.platform?.env ?? {});
    } catch {
      return { ...base, entries: [], error: 'Could not authenticate with GitHub.' };
    }
    try {
      const files = await listMarkdown(runtime.backend, concept.dir, token);
      const entries = await Promise.all(files.map((f) => summarize(f, token)));
      return { ...base, entries, error: null };
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
    // The entry file and the manifest are independent reads sharing the token; fetch them together.
    const [raw, manifestRaw] = await Promise.all([
      readRaw(runtime.backend, `${concept.dir}/${filenameFromId(id)}`, token),
      readRaw(runtime.backend, runtime.manifestPath, token),
    ]);
    if (raw === null && !isNew) throw error(404, 'Entry not found');

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
    };
  }

  /** Match a commit conflict by class and by name (bundling can alias the class identity). */
  function isConflict(err: unknown): boolean {
    return err instanceof CommitConflictError || (err as { name?: string } | null)?.name === 'CommitConflictError';
  }

  /** Save an edit: validate, then commit with the session editor as author. Fails safe on 409. */
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

    // Read the committed manifest, upsert this entry's row, and commit content and manifest in one
    // commit. A missing manifest starts empty (first save on a fresh repo). The build regenerates
    // and verifies the manifest, so this incremental patch is the cheap request-time path. On a
    // 422 retry commitFiles re-sends this manifest blob last-writer-wins. A concurrent save can then
    // leave the committed manifest stale, which the next build rejects via verifyManifest; regenerate
    // it with npm run cairn:manifest to recover.
    const manifestRaw = await readRaw(runtime.backend, runtime.manifestPath, token);
    const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);
    const row = manifestEntryFromFile(concept, { path, raw: markdown });
    const upserted = upsertEntry(manifest, row);
    const nextManifest = serializeManifest(upserted);

    // Save guard: resolve the body's cairn links against the manifest with this entry upserted, so a
    // self-link and a link to any existing target resolves. A link to an absent target hard-blocks
    // the save (it would red the deploy build and the author would not see it); a link to a draft
    // target commits with a warning, since it is valid and resolves once the target is published.
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

    try {
      await commitFiles(
        runtime.backend,
        [
          { path, content: markdown },
          { path: runtime.manifestPath, content: nextManifest },
        ],
        { message: `Update ${concept.label.toLowerCase()}: ${id}`, author: { name: editor.displayName, email: editor.email } },
        token,
      );
    } catch (err) {
      if (isConflict(err)) {
        const message = 'This file changed since you opened it. Reload and reapply your edits.';
        throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent(message)}${suffix}`);
      }
      throw err;
    }
    const savedQuery = draft.length ? `saved=1&drafts=${encodeURIComponent(draft.join(','))}` : 'saved=1';
    throw redirect(303, `/admin/${concept.id}/${id}?${savedQuery}`);
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

    const nextManifest = serializeManifest(removeEntry(manifest, concept.id, id));
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
    } catch (err) {
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
    const token = await mintToken(event.platform?.env ?? {});

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

    try {
      await commitFiles(
        runtime.backend,
        changes,
        { message: `Rename ${concept.label.toLowerCase()}: ${id} to ${newId}`, author: { name: editor.displayName, email: editor.email } },
        token,
      );
    } catch (err) {
      if (isConflict(err)) {
        const message = 'This file changed since you opened it. Reload and try again.';
        throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent(message)}`);
      }
      throw err;
    }
    throw redirect(303, `/admin/${concept.id}/${newId}?renamed=1`);
  }

  return { layoutLoad, indexRedirect, listLoad, createAction, editLoad, saveAction, deleteAction, listDeleteAction, renameAction, mintToken };
}
