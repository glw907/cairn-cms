// cairn-core: the SvelteKit route server logic, extracted so each site's `admin/**` route
// files are thin shims (`export const load = (event) => editLoad(event, cairn)`).
//
// SvelteKit's filesystem routing requires the route *files* to live in each site's
// `src/routes/`, but their bodies are identical across sites — only the adapter differs.
// These functions take the SvelteKit event (typed structurally, to avoid depending on the
// site-generated `App.*` ambient types) plus the site `CairnAdapter`, and throw
// `redirect`/`error` from `@sveltejs/kit`. That `@sveltejs/kit` is a peer dependency so the
// thrown objects share class identity with the host's runtime (else the redirect 500s).
import { redirect, error, type Cookies } from '@sveltejs/kit';
import type { KVNamespace } from '@cloudflare/workers-types';
import matter from 'gray-matter';
import {
  createMagicLink,
  redeemMagicToken,
  createSession,
  lookupEditor,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  type Editor,
} from '../auth';
import { sendMagicLink, type EmailSender } from '../email';
import { listMarkdown, readRaw, commitFile, installationToken, type RepoFile } from '../github';
import { serializeMarkdown } from '../content';
import { findCollection, frontmatterFromForm, type CairnAdapter, type CairnField } from '../adapter';

/** The `platform.env` bindings the admin routes read. All optional — the handlers guard. */
export interface AdminEnv {
  AUTH_KV?: KVNamespace;
  MAGIC_LINK_SECRET?: string;
  SESSION_SECRET?: string;
  EMAIL?: EmailSender;
  /** Overrides `url.origin` for the magic-link base (set in dev, unset in prod). */
  PUBLIC_ORIGIN?: string;
  GITHUB_APP_ID?: string;
  GITHUB_APP_INSTALLATION_ID?: string;
  GITHUB_APP_PRIVATE_KEY_B64?: string;
}

interface PlatformEvent {
  platform?: { env?: AdminEnv };
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// ── /admin layout ──────────────────────────────────────────────────────────

export interface AdminLayoutData {
  editor: Editor | null;
  siteName: string;
}

/**
 * Branding + session for every admin page. `siteName` flows from the adapter without pulling
 * its plugin graph into client bundles — the import stays server-side in the layout load.
 */
export function adminLayoutLoad(
  event: { locals: { editor: Editor | null } },
  adapter: CairnAdapter,
): AdminLayoutData {
  return { editor: event.locals.editor, siteName: adapter.siteName };
}

// ── /admin (content list) ────────────────────────────────────────────────────

export interface AdminCollectionList {
  type: string;
  label: string;
  files: RepoFile[];
  error?: string;
}

/** List every collection's markdown files. A failed listing degrades to an inline error. */
export async function adminListLoad(adapter: CairnAdapter): Promise<{ collections: AdminCollectionList[] }> {
  const collections = await Promise.all(
    adapter.collections.map(async ({ type, label, dir }): Promise<AdminCollectionList> => {
      try {
        return { type, label, files: await listMarkdown(adapter.backend, dir) };
      } catch (err) {
        // A failed listing (rate limit, network) shouldn't 500 the whole admin.
        return { type, label, files: [], error: err instanceof Error ? err.message : 'Failed to load' };
      }
    }),
  );
  return { collections };
}

// ── /admin/login ──────────────────────────────────────────────────────────────

export interface LoginData {
  sent: boolean;
  error: string | null;
}

export function loginLoad(event: { url: URL }): LoginData {
  return {
    sent: event.url.searchParams.get('sent') === '1',
    error: event.url.searchParams.get('error'),
  };
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
  event: { params: { type: string; id: string }; url: URL },
  adapter: CairnAdapter,
): Promise<EditData> {
  const collection = findCollection(adapter, event.params.type);
  if (!collection) throw error(404, 'Unknown collection');

  // Anonymous read — repos are public; the GitHub App token is commit-only (see saveCommit).
  const path = `${collection.dir}/${event.params.id}.md`;
  const raw = await readRaw(adapter.backend, path);
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

// ── /admin/auth/request (POST) ──────────────────────────────────────────────

export async function authRequest(
  event: PlatformEvent & { request: Request; url: URL },
  adapter: CairnAdapter,
): Promise<never> {
  const env = event.platform?.env;
  if (!env?.AUTH_KV || !env.MAGIC_LINK_SECRET || !env.EMAIL) {
    throw redirect(303, '/admin/login?error=config');
  }

  const form = await event.request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw redirect(303, '/admin/login?error=invalid');
  }

  const editor = await lookupEditor(email, env.AUTH_KV);
  if (!editor) {
    throw redirect(303, '/admin/login?error=denied');
  }

  const token = await createMagicLink(email, env.MAGIC_LINK_SECRET, env.AUTH_KV);
  // PUBLIC_ORIGIN overrides url.origin for local dev (where wrangler's custom-domain
  // route makes url.origin the production host); unset in prod → url.origin is correct.
  const origin = env.PUBLIC_ORIGIN || event.url.origin;
  const link = `${origin}/admin/auth/callback?token=${encodeURIComponent(token)}`;
  try {
    await sendMagicLink(env.EMAIL, email, link, adapter.siteName, adapter.sender);
  } catch (err) {
    console.error('magic-link send failed:', err);
    throw redirect(303, '/admin/login?error=config');
  }

  throw redirect(303, '/admin/login?sent=1');
}

// ── /admin/auth/callback (GET) ──────────────────────────────────────────────

export async function authCallback(
  event: PlatformEvent & { url: URL; cookies: Cookies },
): Promise<never> {
  const env = event.platform?.env;
  if (!env?.AUTH_KV || !env.MAGIC_LINK_SECRET || !env.SESSION_SECRET) {
    throw redirect(303, '/admin/login?error=config');
  }

  const token = event.url.searchParams.get('token') ?? '';
  const email = await redeemMagicToken(token, env.MAGIC_LINK_SECRET, env.AUTH_KV);
  if (!email) {
    throw redirect(303, '/admin/login?error=expired');
  }

  // Re-check the allowlist at redemption — membership may have changed since issue.
  const editor = await lookupEditor(email, env.AUTH_KV);
  if (!editor) {
    throw redirect(303, '/admin/login?error=denied');
  }

  const session = await createSession(editor, env.SESSION_SECRET);
  event.cookies.set(SESSION_COOKIE, session, {
    path: '/',
    httpOnly: true,
    secure: event.url.protocol === 'https:',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
  });

  throw redirect(303, '/admin');
}

// ── /admin/auth/logout (POST) ───────────────────────────────────────────────

export function logout(event: { cookies: Cookies }): never {
  event.cookies.delete(SESSION_COOKIE, { path: '/' });
  throw redirect(303, '/admin/login');
}

// ── /admin/save (POST) ──────────────────────────────────────────────────────

export async function saveCommit(
  event: PlatformEvent & { request: Request; locals: { editor: Editor | null } },
  adapter: CairnAdapter,
): Promise<never> {
  const editor = event.locals.editor;
  if (!editor) throw error(401, 'Not signed in');

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

  await commitFile(
    adapter.backend,
    `${collection.dir}/${id}.md`,
    markdown,
    { message: `Update ${collection.label.toLowerCase()}: ${id}`, author: { name: editor.name, email: editor.email } },
    token,
  );

  throw redirect(303, `/admin/edit/${type}/${id}?saved=1`);
}
