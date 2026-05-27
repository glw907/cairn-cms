// cairn-core: the SvelteKit content-route server logic, extracted so each site's `admin/**`
// route files are thin shims (`export const load = (event) => editLoad(event, cairn)`).
//
// SvelteKit's filesystem routing requires the route *files* to live in each site's
// `src/routes/`, but their bodies are identical across sites. Only the adapter differs.
// These functions take the SvelteKit event (typed structurally, to avoid depending on the
// site-generated `App.*` ambient types) plus the site `CairnAdapter`, and throw
// `redirect`/`error` from `@sveltejs/kit` (a peer dependency, so the thrown objects share
// class identity with the host's runtime; otherwise the redirect 500s). Auth/session/manage-editors
// logic lives under `@glw907/cairn-cms/auth`; this module is content-only (list/edit/save).
import { redirect, error } from '@sveltejs/kit';
import matter from 'gray-matter';
import type { CairnUser } from '../auth/guard';
import {
  listMarkdown,
  readRaw,
  commitFile,
  installationToken,
  signingSelfTest,
  CommitConflictError,
  type RepoFile,
} from '../github';
import { serializeMarkdown } from '../content';
import { findCollection, frontmatterFromForm, type CairnAdapter, type CairnField } from '../adapter';

/** The `platform.env` bindings the content routes read. All optional; the handlers guard. */
export interface AdminEnv {
  GITHUB_APP_ID?: string;
  GITHUB_APP_INSTALLATION_ID?: string;
  GITHUB_APP_PRIVATE_KEY_B64?: string;
}

interface PlatformEvent {
  platform?: { env?: AdminEnv };
}

/**
 * Mint a GitHub App installation token for *reads* when the App is configured, else undefined
 * (reads then fall back to anonymous). Authenticated reads get the 5000/hr limit; anonymous
 * reads share GitHub's 60/hr-per-IP budget across Cloudflare's egress IPs, so they 403 in prod.
 * A mint failure degrades gracefully to anonymous rather than 500ing. Unlike the commit path,
 * where a missing App is fatal, a read can still succeed unauthenticated.
 */
async function readToken(env: AdminEnv | undefined): Promise<string | undefined> {
  if (!env?.GITHUB_APP_ID || !env.GITHUB_APP_INSTALLATION_ID || !env.GITHUB_APP_PRIVATE_KEY_B64) {
    return undefined;
  }
  try {
    return await installationToken({
      appId: env.GITHUB_APP_ID,
      installationId: env.GITHUB_APP_INSTALLATION_ID,
      privateKeyB64: env.GITHUB_APP_PRIVATE_KEY_B64,
    });
  } catch (err) {
    console.error('read token mint failed; falling back to anonymous read:', err);
    return undefined;
  }
}

// ── /admin layout ──────────────────────────────────────────────────────────

/** A collection reduced to what the sidebar nav needs (no plugin graph crosses to the client). */
export interface NavCollection {
  type: string;
  label: string;
}

export interface AdminLayoutData {
  user: CairnUser | null;
  siteName: string;
  pathname: string;
  collections: NavCollection[];
}

/**
 * Branding, session, and collection nav for every admin page. `siteName` and the collection
 * list flow from the adapter without pulling its plugin graph into client bundles (the import
 * stays server-side in the layout load; only `{type,label}` crosses). `pathname` lets the
 * shared shell highlight the active nav item without a `$app/*` import (those kit virtual
 * modules have no types outside a kit app); reading `event.url` also opts the layout load into
 * rerunning on navigation, keeping the active class correct.
 */
export function adminLayoutLoad(
  event: { locals: { user: CairnUser | null }; url: URL },
  adapter: CairnAdapter,
): AdminLayoutData {
  return {
    user: event.locals.user,
    siteName: adapter.siteName,
    pathname: event.url.pathname,
    collections: adapter.collections.map(({ type, label }) => ({ type, label })),
  };
}

// ── /admin/[collection] (entries list) ─────────────────────────────────────

/** One entry row: id (filename stem), display title, optional date, draft flag. */
export interface CollectionEntry {
  id: string;
  path: string;
  title: string;
  date: string | null;
  draft: boolean;
}

export interface CollectionListData {
  type: string;
  label: string;
  entries: CollectionEntry[];
  /** Set when the directory listing itself failed (rate limit, network). */
  error?: string;
  /** A create-flow error bounced back via `?error=` (an invalid or taken slug). */
  formError: string | null;
}

/** Coerce a frontmatter `date` (gray-matter may parse YAML dates to `Date`) to `YYYY-MM-DD`. */
function entryDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value;
  return null;
}

/**
 * List one collection's entries, reading each file's frontmatter for the display title, date,
 * and draft badge. Reads run in parallel; a single failed read degrades that row to the slug
 * (rather than failing the page), and a failed directory listing returns an inline `error`.
 * Collections are small here; the 1,000-entry / Git-Trees sharding concern is risk #11, deferred.
 */
export async function collectionListLoad(
  event: PlatformEvent & { params: { collection: string }; url: URL },
  adapter: CairnAdapter,
): Promise<CollectionListData> {
  const collection = findCollection(adapter, event.params.collection);
  if (!collection) throw error(404, 'Unknown collection');

  const formError = event.url.searchParams.get('error');
  const token = await readToken(event.platform?.env);

  let files: RepoFile[];
  try {
    files = await listMarkdown(adapter.backend, collection.dir, token);
  } catch (err) {
    return {
      type: collection.type,
      label: collection.label,
      entries: [],
      error: err instanceof Error ? err.message : 'Failed to load',
      formError,
    };
  }

  const entries = await Promise.all(
    files.map(async (file): Promise<CollectionEntry> => {
      const fallback: CollectionEntry = { id: file.id, path: file.path, title: file.id, date: null, draft: false };
      try {
        const raw = await readRaw(adapter.backend, file.path, token);
        if (raw === null) return fallback;
        const { data } = matter(raw);
        return {
          id: file.id,
          path: file.path,
          title: typeof data.title === 'string' ? data.title : file.id,
          date: entryDate(data.date),
          draft: data.draft === true,
        };
      } catch {
        return fallback;
      }
    }),
  );

  return { type: collection.type, label: collection.label, entries, formError };
}

// ── /admin/edit/[type]/[id] ─────────────────────────────────────────────────

export interface EditData {
  type: string;
  id: string;
  label: string;
  fields: CairnField[];
  path: string;
  body: string;
  frontmatter: Record<string, unknown>;
  title: string;
  saved: boolean;
  error: string | null;
}

export async function editLoad(
  event: PlatformEvent & { params: { type: string; id: string }; url: URL },
  adapter: CairnAdapter,
): Promise<EditData> {
  const collection = findCollection(adapter, event.params.type);
  if (!collection) throw error(404, 'Unknown collection');

  const token = await readToken(event.platform?.env);
  const path = `${collection.dir}/${event.params.id}.md`;
  const raw = await readRaw(adapter.backend, path, token);
  if (raw === null) throw error(404, 'Content not found');

  // Split frontmatter from body server-side; the editor form binds to the frontmatter and
  // the Carta editor binds to the body, and /admin/save reassembles them on commit.
  const { data: frontmatter, content: body } = matter(raw);

  return {
    type: event.params.type,
    id: event.params.id,
    label: collection.label,
    fields: collection.fields,
    path,
    body,
    frontmatter,
    title: typeof frontmatter.title === 'string' ? frontmatter.title : event.params.id,
    saved: event.url.searchParams.get('saved') === '1',
    error: event.url.searchParams.get('error'),
  };
}

// ── /admin/save (POST) ──────────────────────────────────────────────────────

export async function saveCommit(
  event: PlatformEvent & { request: Request; locals: { user: CairnUser | null } },
  adapter: CairnAdapter,
): Promise<never> {
  const user = event.locals.user;
  if (!user) throw error(401, 'Not signed in');

  const env = event.platform?.env;
  if (!env?.GITHUB_APP_ID || !env.GITHUB_APP_INSTALLATION_ID || !env.GITHUB_APP_PRIVATE_KEY_B64) {
    throw error(500, 'GitHub App is not configured');
  }

  const form = await event.request.formData();
  const type = String(form.get('type') ?? '');
  const id = String(form.get('id') ?? '');
  const body = String(form.get('body') ?? '');
  const collection = findCollection(adapter, type);
  if (!collection || !id) throw error(400, 'Bad request');

  // Build frontmatter from the posted fields and validate against the collection's schema; a
  // bad field bounces back to the editor with the validator's message rather than 500ing.
  let frontmatter: object;
  try {
    frontmatter = collection.validate(frontmatterFromForm(collection, form), `${id}.md`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid frontmatter';
    throw redirect(303, `/admin/edit/${type}/${id}?error=${encodeURIComponent(message)}`);
  }

  const markdown = serializeMarkdown(frontmatter, body);
  const token = await installationToken({
    appId: env.GITHUB_APP_ID,
    installationId: env.GITHUB_APP_INSTALLATION_ID,
    privateKeyB64: env.GITHUB_APP_PRIVATE_KEY_B64,
  });

  try {
    await commitFile(
      adapter.backend,
      `${collection.dir}/${id}.md`,
      markdown,
      { message: `Update ${collection.label.toLowerCase()}: ${id}`, author: { name: user.name, email: user.email } },
      token,
    );
  } catch (err) {
    // Concurrent-edit 409 (C3): fail safe. Bounce back with a reload prompt; the editor reloads
    // the current version and reapplies. Any other error is unexpected, so rethrow.
    if (err instanceof CommitConflictError) {
      const message = 'This file changed since you opened it. Reload and reapply your edits.';
      throw redirect(303, `/admin/edit/${type}/${id}?error=${encodeURIComponent(message)}`);
    }
    throw err;
  }

  throw redirect(303, `/admin/edit/${type}/${id}?saved=1`);
}

// ── /admin/healthz (GET) ──────────────────────────────────────────────────────

export interface HealthData {
  ok: boolean;
  checks: { githubAppSigning: { ok: boolean; detail?: string } };
}

/**
 * Deploy-time health check (M2): signs a dummy App JWT to prove the GitHub App key loads and
 * the PKCS#1→PKCS#8 conversion still works, before an editor hits it on save. Behind the
 * `/admin` guard (signed-in editors only); returns ok/fail with no secret in the body.
 */
export async function healthLoad(event: PlatformEvent): Promise<HealthData> {
  const env = event.platform?.env;
  let githubAppSigning: { ok: boolean; detail?: string };
  if (env?.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY_B64) {
    githubAppSigning = await signingSelfTest(env.GITHUB_APP_ID, env.GITHUB_APP_PRIVATE_KEY_B64);
  } else {
    githubAppSigning = { ok: false, detail: 'GitHub App not configured' };
  }
  return { ok: githubAppSigning.ok, checks: { githubAppSigning } };
}
