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
  listEditors,
  setEditor,
  removeEditor,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  type Editor,
  type Role,
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

/**
 * Mint a GitHub App installation token for *reads* when the App is configured, else undefined
 * (reads then fall back to anonymous). Authenticated reads get the 5000/hr limit; anonymous
 * reads share GitHub's 60/hr-per-IP budget across Cloudflare's egress IPs, so they 403 in prod.
 * A mint failure degrades gracefully to anonymous rather than 500ing — unlike the commit path,
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

export interface AdminLayoutData {
  editor: Editor | null;
  siteName: string;
  pathname: string;
}

/**
 * Branding + session for every admin page. `siteName` flows from the adapter without pulling
 * its plugin graph into client bundles — the import stays server-side in the layout load.
 * `pathname` lets the shared shell highlight the active nav item without a `$app/*` import
 * (those kit virtual modules have no types outside a kit app, so they can't live in the
 * package); reading `event.url` here also opts the layout load into rerunning on navigation.
 */
export function adminLayoutLoad(
  event: { locals: { editor: Editor | null }; url: URL },
  adapter: CairnAdapter,
): AdminLayoutData {
  return { editor: event.locals.editor, siteName: adapter.siteName, pathname: event.url.pathname };
}

// ── /admin (content list) ────────────────────────────────────────────────────

export interface AdminCollectionList {
  type: string;
  label: string;
  files: RepoFile[];
  error?: string;
}

/** List every collection's markdown files. A failed listing degrades to an inline error. */
export async function adminListLoad(
  event: PlatformEvent,
  adapter: CairnAdapter,
): Promise<{ collections: AdminCollectionList[] }> {
  const token = await readToken(event.platform?.env);
  const collections = await Promise.all(
    adapter.collections.map(async ({ type, label, dir }): Promise<AdminCollectionList> => {
      try {
        return { type, label, files: await listMarkdown(adapter.backend, dir, token) };
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

// ── /admin/admins (owner-gated editor management) ────────────────────────────

/**
 * The privilege-escalation gate for the manage-admins surface: only `owner`s may load it or
 * run its actions. Returns the acting owner (so callers can guard self-targeted mutations).
 */
function requireOwner(event: { locals: { editor: Editor | null } }): Editor {
  const editor = event.locals.editor;
  if (!editor) throw error(401, 'Not signed in');
  if (editor.role !== 'owner') throw error(403, 'Owner access required');
  return editor;
}

/** Resolve AUTH_KV or fail loudly — the management surface is useless without it. */
function ownerKv(event: PlatformEvent): KVNamespace {
  const kv = event.platform?.env?.AUTH_KV;
  if (!kv) throw error(500, 'Editor allowlist is not configured');
  return kv;
}

export interface AdminsData {
  admins: Editor[];
  /** Acting owner's email, so the UI can disable self-targeted remove/demote. */
  self: string;
  saved: boolean;
  error: string | null;
}

/** List the allowlist for the manage-admins page. Owner-only. */
export async function adminsLoad(
  event: PlatformEvent & { locals: { editor: Editor | null }; url: URL },
): Promise<AdminsData> {
  const owner = requireOwner(event);
  const admins = await listEditors(ownerKv(event));
  return {
    admins,
    self: owner.email,
    saved: event.url.searchParams.get('saved') === '1',
    error: event.url.searchParams.get('error'),
  };
}

type AdminsActionEvent = PlatformEvent & {
  request: Request;
  locals: { editor: Editor | null };
};

function parseRole(value: unknown): Role {
  return value === 'owner' ? 'owner' : 'editor';
}

/** Add (or update) an allowlist entry. Owner-only. */
export async function addAdmin(event: AdminsActionEvent): Promise<never> {
  requireOwner(event);
  const kv = ownerKv(event);
  const form = await event.request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const name = String(form.get('name') ?? '').trim();
  if (!EMAIL_RE.test(email) || !name) {
    throw redirect(303, `/admin/admins?error=${encodeURIComponent('Enter a valid email and name')}`);
  }
  await setEditor(email, name, parseRole(form.get('role')), kv);
  throw redirect(303, '/admin/admins?saved=1');
}

/** Remove an allowlist entry. Owner-only; owners can't remove themselves (anti-lockout). */
export async function removeAdmin(event: AdminsActionEvent): Promise<never> {
  const owner = requireOwner(event);
  const kv = ownerKv(event);
  const form = await event.request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (email === owner.email) {
    throw redirect(303, `/admin/admins?error=${encodeURIComponent("You can't remove yourself")}`);
  }
  await removeEditor(email, kv);
  throw redirect(303, '/admin/admins?saved=1');
}

/** Change an editor's role. Owner-only; owners can't demote themselves (anti-lockout). */
export async function setAdminRole(event: AdminsActionEvent): Promise<never> {
  const owner = requireOwner(event);
  const kv = ownerKv(event);
  const form = await event.request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const role = parseRole(form.get('role'));
  if (email === owner.email && role !== 'owner') {
    throw redirect(303, `/admin/admins?error=${encodeURIComponent("You can't demote yourself")}`);
  }
  const existing = await lookupEditor(email, kv);
  if (!existing) {
    throw redirect(303, `/admin/admins?error=${encodeURIComponent('No such editor')}`);
  }
  await setEditor(email, existing.name, role, kv);
  throw redirect(303, '/admin/admins?saved=1');
}
