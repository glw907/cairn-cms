// cairn-cms: previewMint, the public entry point for issuing a preview link, and previewLoad, the
// public entry point for serving one (spec part 3, "Public preview for a non-editor"). previewMint
// carries the engine's own entry-scoped authorization itself, so every path to a minted token runs
// the same check the previewMint admin action (content-routes-core.ts) runs, and a caller reaching
// it from its own workflow route owns nothing beyond signing the editor in. previewLoad is the
// mint's counterpart: it needs no authorization at all, since the token itself is the credential,
// and it never reads locals.cairnEditor or locals.cairnAccess.
import { error } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { generateToken, hashToken } from '../auth/crypto.js';
import { insertPreviewToken, findPreviewToken, findPreviewTokenAnyExpiry, type PreviewTokenRow } from '../auth/preview-store.js';
import { requireEditor, requireEngineAccess } from './guard.js';
import { requireDb } from '../env.js';
import { CairnError } from '../diagnostics/index.js';
import { findConcept, FRAGMENTS_CONCEPT_ID } from '../content/concepts.js';
import { isValidId, filenameFromId } from '../content/ids.js';
import { pendingBranch } from '../content/pending.js';
import {
  emptyManifest,
  parseManifest,
  manifestEntryFromFile,
  upsertEntry,
  manifestLinkResolver,
  manifestFragmentResolver,
  type Manifest,
} from '../content/manifest.js';
import { parseMarkdown } from '../content/frontmatter.js';
import { createContentIndex } from '../delivery/content-index.js';
import { composeEntryData, type PublicRoutesConfig, type EntryData } from '../delivery/public-routes.js';
import type { SeoMeta } from '../delivery/seo.js';
import type { LinkResolve } from '../content/links.js';
import type { FragmentResolve } from '../render/resolve-include.js';
import { createMediaResolver, type MediaResolve } from '../render/resolve-media.js';
import { parseMediaManifest } from '../media/manifest.js';
import type { Backend } from '../github/backend.js';
import type { CairnEvent } from './types.js';
import type { CairnRuntime, ConceptDescriptor } from '../content/types.js';
import { log } from '../log/index.js';

/**
 * A site's preview-token configuration: how long a minted share link stays valid. Every field is
 * optional; an absent config resolves to the default TTL.
 */
export interface PreviewTokenConfig {
  /**
   * The minted link's lifetime in milliseconds. Defaults to seven days. Must be finite, positive,
   * and between one minute and thirty days inclusive; `previewMint` throws an actionable,
   * `PreviewTokenConfig:`-prefixed error otherwise.
   */
  ttlMs?: number;
}

/** The default preview-link lifetime: seven days, long enough to survive a weekend review. */
const DEFAULT_PREVIEW_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** The shortest allowed TTL: one minute. */
const MIN_PREVIEW_TTL_MS = 60 * 1000;

/** The longest allowed TTL: thirty days. */
const MAX_PREVIEW_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Resolve a `PreviewTokenConfig` to its effective TTL, validating it the same fail-fast,
 * descriptively-prefixed way `defineRoles` (`src/lib/auth/roles.ts`) validates a site's declared
 * role vocabulary: a misconfigured value throws here, before any token is generated or written,
 * rather than surfacing later as a silently-wrong expiry.
 */
function resolveTtlMs(config: PreviewTokenConfig): number {
  const ttlMs = config.ttlMs ?? DEFAULT_PREVIEW_TTL_MS;
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new Error(`PreviewTokenConfig: ttlMs must be a finite, positive number, got ${ttlMs}`);
  }
  if (ttlMs < MIN_PREVIEW_TTL_MS || ttlMs > MAX_PREVIEW_TTL_MS) {
    throw new Error(
      `PreviewTokenConfig: ttlMs must be between one minute and thirty days, got ${ttlMs}`,
    );
  }
  return ttlMs;
}

/**
 * What {@link previewMint} returns: the minted link's plaintext token and expiry, or the one
 * refusal the target could not clear. `unknown-concept` names a concept the runtime does not
 * declare, `invalid-id` an entry id outside the slug rule, and `no-draft` an entry with no pending
 * branch, so there is nothing to share. A session the engine's own access check refuses never
 * reaches any of these: it throws, the way every other engine content surface refuses.
 */
export type PreviewMintOutcome =
  | { outcome: 'minted'; token: string; expiresAt: number }
  | { outcome: 'unknown-concept' }
  | { outcome: 'invalid-id' }
  | { outcome: 'no-draft' };

/**
 * Mint a preview token for one entry's pending draft: authorize the signed-in editor for the
 * target concept, confirm the draft exists, then generate a fresh 256-bit token, store only its
 * hash (`hashToken`) in `AUTH_DB` alongside the entry it shares and the minting editor, and return
 * the plaintext once, since it is never stored and cannot be recovered later. The row carries a
 * numeric `expiresAt` (epoch milliseconds), matching `magic_token` and `session`.
 *
 * Minting converts one editor's read on a concept into an unauthenticated public read for anyone
 * holding the URL, so authorization runs FIRST and short-circuits, in the engine's own order:
 * `requireEditor` (the session the admin guard resolved), the concept lookup,
 * `requireEngineAccess` against `runtime.access`, the id shape rule, and only then the draft
 * check. A refusal therefore never reports whether an entry or its draft exists to a session that
 * was not allowed to ask. The `target` is the argument's, never the route's: this reads no route
 * param, so a site's own workflow route (an editorial queue emailing a reviewer on submit) mints
 * from anywhere the guard has run.
 *
 * The editor is the guard-resolved session's and cannot be supplied by the caller. The stored
 * `editor` column is that session's `email`, already normalized by the `editor`-table select, so
 * the editor-removal revocation cascade (`DELETE FROM preview_tokens WHERE editor = ?`,
 * `auth/store.ts`) always matches the rows a departing editor minted.
 * @throws Error prefixed `PreviewTokenConfig:` when `config.ttlMs` is invalid.
 * @throws HttpError 403 when the session is a `none` capability or the site's access map denies it
 *  the concept, and Redirect 303 to the login page when there is no session at all.
 */
export async function previewMint(
  runtime: CairnRuntime,
  config: PreviewTokenConfig,
  event: CairnEvent,
  target: { concept: string; entryId: string },
): Promise<PreviewMintOutcome> {
  const editor = requireEditor(event);
  const concept = findConcept(runtime.concepts, target.concept);
  if (!concept) return { outcome: 'unknown-concept' };
  requireEngineAccess(runtime.access, editor, concept.id);
  if (!isValidId(target.entryId)) return { outcome: 'invalid-id' };

  // Both config faults answer before any network read: a misconfigured TTL and a missing AUTH_DB
  // are site setup, not entry state, so neither waits on GitHub.
  const ttlMs = resolveTtlMs(config);
  const env = event.platform?.env ?? {};
  const db = requireDb(env);

  // A preview shares a draft; without one there is nothing to share. Reached through the same
  // `locals.cairnBackend ?? runtime.backend.connect(env)` seam previewLoad and every other engine
  // load ride, so a test needs no real GitHub token.
  const backend = event.locals.cairnBackend ?? runtime.backend.connect(env);
  if ((await backend.branchHead(pendingBranch(concept.id, target.entryId))) === null) {
    return { outcome: 'no-draft' };
  }

  const token = generateToken();
  const tokenHash = await hashToken(token);
  const expiresAt = Date.now() + ttlMs;
  await insertPreviewToken(db, {
    concept: concept.id,
    entryId: target.entryId,
    editor: editor.email,
    tokenHash,
    expiresAt,
  });
  return { outcome: 'minted', token, expiresAt };
}

/**
 * `previewLoad`'s public data shape: a public entry page's own data (`EntryData`, the exact shape
 *  `createPublicRoutes`'s `entryLoad` returns) plus the preview metadata a site's banner reads. A
 *  compile-time assertion in the test suite proves this adds no key beyond `preview`, so a future
 *  `EntryData` field breaks this build rather than a consuming site's.
 */
export interface PreviewData extends EntryData {
  preview: {
    /** `'draft'` while the shared branch is still open; `'published'` once it is gone. */
    state: 'draft' | 'published';
    /** ISO 8601, the moment the minted link stops resolving, regardless of state. */
    expiresAt: string;
    /**
     * The live permalink once the branch is gone and the entry is published there, else `null`.
     *  Set only in the `'published'` state; a discarded new entry's branch-gone case has nothing
     *  to point at and answers 404 instead of reaching this shape at all.
     */
    published: { permalink: string } | null;
  };
}

/** A 256-bit `generateToken` value, base64url with no padding: exactly 43 characters. */
const TOKEN_SHAPE_RE = /^[A-Za-z0-9_-]{43}$/;

/**
 * The one refusal body every rejection answers, malformed shape included: plain not-found wording
 *  that never names preview, so a probe cannot distinguish "no such token" from "no such page" and
 *  a shared link's failure mode teaches nothing about the feature that minted it. The distinguishing
 *  reason lives only in the `preview.rejected` log.
 */
const NOT_FOUND_MESSAGE = 'Not found';

/**
 * The header set every `previewLoad` response carries, refusals and the ended page included:
 *  `/preview` is not an admin path, so the admin guard's header layer never reaches it and this
 *  load owns its own. `x-frame-options: DENY` rather than a CSP `frame-ancestors`, so it never
 *  collides with a site's own kit-generated Content-Security-Policy header.
 */
const PREVIEW_HEADERS: Record<string, string> = {
  'x-robots-tag': 'noindex, nofollow',
  'cache-control': 'private, no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
};

/** The six token/row-verification refusal reasons; the missing-binding 503 logs its own separately. */
type PreviewRejectedReason = 'unknown' | 'expired' | 'branch_gone' | 'row_invalid' | 'draft_invalid' | 'table_missing';

/** Log `preview.rejected` and throw the one shared 404. Never called for the malformed-shape gate, which logs nothing. */
function rejectPreview(reason: PreviewRejectedReason, fields: Record<string, unknown> = {}): never {
  log.warn('preview.rejected', { reason, ...fields });
  throw error(404, NOT_FOUND_MESSAGE);
}

/**
 * True for a D1 error whose message names a missing table (SQLite's own "no such table" text).
 *  Mirrors content-routes-core.ts's own local copy; the check is a two-line regex, not worth
 *  sharing across a module boundary for.
 */
function isMissingTableError(err: unknown): boolean {
  return /no such table/i.test(String(err));
}

/** Parse a committed media.json body, degrading a missing or corrupt file to null (an empty manifest). */
function safeParseJson(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** One includable fragment, as `manifestFragmentResolver` takes it: identity, title, raw body. */
type FragmentBody = { id: string; title: string; body: string };

/** The three resolvers `composeEntryData`'s `overrides` substitutes, built fresh per preview request. */
interface PreviewResolvers {
  resolveLink: LinkResolve;
  resolveFragment?: FragmentResolve;
  resolveMedia: MediaResolve;
}

/**
 * Build the preview's marking link/fragment resolvers and its request-time media resolver, mirroring
 *  `editLoad`'s own build (content-routes-core.ts) so the admin preview and the public preview agree
 *  on what a draft can reach. `manifest` is the default branch's manifest, with the draft's own
 *  re-derived row already upserted by the caller when previewing a draft; the ended page passes the
 *  plain default-branch manifest, since the previewed entry's own row already lives there.
 *  `mediaBranch` is the pending branch for a draft preview, or null for the ended page (whose branch
 *  is already gone), so the media read goes branch-first only when a branch still exists.
 */
async function buildPreviewResolvers(
  runtime: CairnRuntime,
  backend: Backend,
  manifest: Manifest,
  concept: ConceptDescriptor,
  mediaBranch: string | null,
): Promise<PreviewResolvers> {
  // Link targets: every manifest entry whose concept is routable, the same not-a-link-target
  // backstop editLoad applies (a fragment's gated permalink 404s, so it must never be offered).
  const linkTargets = manifest.entries
    .filter((e) => findConcept(runtime.concepts, e.concept)?.routing.routable ?? true)
    .map((e) => ({ concept: e.concept, id: e.id, permalink: e.permalink, title: e.title, date: e.date, draft: e.draft }));
  const resolveLink = manifestLinkResolver(linkTargets);

  // Fragment targets: mirrors editLoad's own build. A fragments concept must be declared and this
  // entry must not itself be a fragment (a fragment cannot include another); each candidate body
  // reads from the default branch only, so a fragment's own pending edits never leak into another
  // entry's preview. A read failure degrades that one target out rather than failing the load.
  const fragmentsConcept = findConcept(runtime.concepts, FRAGMENTS_CONCEPT_ID);
  let resolveFragment: FragmentResolve | undefined;
  if (fragmentsConcept && concept.id !== FRAGMENTS_CONCEPT_ID) {
    const rows = manifest.entries.filter((e) => e.concept === FRAGMENTS_CONCEPT_ID);
    const bodies = await Promise.all(
      rows.map(async (row): Promise<FragmentBody | null> => {
        try {
          const raw = await backend.readFile(`${fragmentsConcept.dir}/${filenameFromId(row.id)}`, backend.defaultBranch);
          if (raw === null) return null;
          return { id: row.id, title: row.title, body: parseMarkdown(raw).body };
        } catch (e) {
          log.warn('include.read_failed', { fragment: row.id, error: e instanceof Error ? e.message : String(e) });
          return null;
        }
      }),
    );
    const targets = bodies.filter((b): b is FragmentBody => b !== null);
    const fragmentResolver = manifestFragmentResolver(targets);
    // Never set previewTitle: that boundary cue is EditPage's own in-admin affordance (the
    // resolved fragment gets a quiet "From ..." eyebrow there), not a public-facing signal.
    // Wrapping the call in a plain arrow drops the property while keeping resolution identical.
    if (fragmentResolver) resolveFragment = (id) => fragmentResolver(id);
  }

  // Media: createMediaResolver, never manifestMediaResolver (whose hardcoded url form ignores a
  // site's publicBase, presets, and imageDetail, breaking twin-render equivalence). Branch-first
  // then default-branch fallback, so an upload newer than the site's last build still resolves;
  // branch-first is skipped for the ended page (mediaBranch null), whose branch is already gone.
  let resolveMedia: MediaResolve = () => undefined;
  if (runtime.resolvedAssets.enabled) {
    const branchRaw = mediaBranch
      ? await backend.readFile(runtime.mediaManifestPath, mediaBranch).catch(() => null)
      : null;
    const raw = branchRaw ?? (await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch).catch(() => null));
    resolveMedia = createMediaResolver(parseMediaManifest(safeParseJson(raw)), runtime.resolvedAssets);
  }

  return { resolveLink, resolveFragment, resolveMedia };
}

/**
 * Strip the entry's eventual public permalink out of a composed page's SEO data, for a preview
 *  render: the `canonical` link, the `og:url` meta tag, and `jsonLd.url`. A preview is `noindex`ed
 *  already ({@link PREVIEW_HEADERS}'s `x-robots-tag`), but a self-referential `canonical`/`og:url`
 *  pointing at a URL that is not yet live (or, for the ended page, already superseded) invites a
 *  crawler to consolidate the preview onto that URL anyway, and an unfurler that ignores
 *  `noindex` still reads these fields directly. This is about the page's own advertised identity,
 *  not the token: the token is the sole credential and lives only in the route path, never in the
 *  page.
 */
function stripPreviewSeo(seo: SeoMeta): SeoMeta {
  return {
    ...seo,
    meta: seo.meta.filter((m) => m.property !== 'og:url'),
    links: seo.links.filter((l) => l.rel !== 'canonical'),
    jsonLd: Object.fromEntries(Object.entries(seo.jsonLd).filter(([key]) => key !== 'url')),
  };
}

/**
 * Serve a public preview link: verify the token, then render the shared draft (or, once the
 *  branch is gone, the ended page) through the site's own public composition, so a preview and a
 *  published page can never structurally drift. `config` is the site's own `PublicRoutesConfig`,
 *  the literal object it hands `createPublicRoutes`.
 *
 * The verification chain runs strictly in this order, cheapest first: the token's shape (a 404
 *  with no D1 read or log for spray traffic), the `AUTH_DB` binding, the row lookup by hash, the
 *  row's expiry, the row's stored concept and id against the live runtime, and finally the branch
 *  read, whose own miss is the branch-gone signal (there is no separate `branchHead` pre-check).
 *  Every refusal answers the identical `error(404, NOT_FOUND_MESSAGE)`; only the `preview.rejected`
 *  log distinguishes why, and it never carries the token or any attacker-supplied string.
 *
 * No cookie is read or set, and `locals.cairnEditor`/`locals.cairnAccess` are never read: the
 *  token itself is the sole credential, an unauthenticated read on one entry, so this load carries
 *  none of the admin guard's session machinery. The backend resolves through the same
 *  `locals.cairnBackend ?? runtime.backend.connect(env)` seam every other engine load uses
 *  (content-routes-context.ts's `resolveBackend`), so a test rides the same dev-backend seam with
 *  no real GitHub token.
 *
 * Deliberately no constant-time comparison anywhere on this path: the row lookup keys on
 *  `hashToken(token)`, a SHA-256 digest, and the attacker controls only the plaintext token, never
 *  the hash. Steering a chosen plaintext's digest to collide with a stored hash under a B-tree
 *  index scan would require a partial SHA-256 preimage, a problem timing a comparison does not
 *  make easier; `tokensMatch` (crypto.ts) is deliberately not used here.
 *
 * The returned `seo` ({@link stripPreviewSeo}) never carries `canonical`, `og:url`, or
 *  `jsonLd.url`: a preview render must not self-canonicalize while it is `noindex`ed, and must not
 *  let a crawler or unfurler consolidate onto a URL that is not yet live (or, for the ended page,
 *  already superseded). This is unrelated to the token, the sole credential, which lives only in
 *  the route path and never appears on the page at all.
 * @throws Error naming `export const prerender = false` when `building` (`$app/environment`) is
 *  true, so a site that lets this route prerender gets a red build instead of a token-bearing
 *  static asset. `$app/environment` is imported dynamically, at call time, rather than at module
 *  scope: this module is reachable through the `/sveltekit` barrel, and a barrel re-export pulls
 *  in every other export's own top-level imports, so a module-scope `$app/environment` import
 *  here would break a consumer that bundles a single barrel export (for example
 *  `createD1AuditSink`, for a Cloudflare Cron handler) with a plain, non-Vite esbuild pass that
 *  has no SvelteKit plugin to resolve the virtual module. The dynamic import is further wrapped in
 *  `try`/`catch`: esbuild resolves an unwrapped `import()` literal the same way it resolves a
 *  static import at bundle time, and still fails the same build even without a barrel re-export in
 *  the way. A `try`/`catch` around it is esbuild's own documented escape hatch, downgrading the
 *  unresolvable specifier to a runtime concern instead of a bundle-time error. Outside a real
 *  SvelteKit build the import always rejects (there is no `$app/environment` module to resolve),
 *  and `building` falls back to `false`: a `/preview/[token]` route carries a token in its own
 *  path and is never prerendered, so `false`, meaning "proceed, we are not prerendering," is the
 *  correct value for every context this fallback can run in.
 */
export async function previewLoad(runtime: CairnRuntime, config: PublicRoutesConfig, event: CairnEvent): Promise<PreviewData> {
  event.setHeaders(PREVIEW_HEADERS);

  let building = false;
  try {
    ({ building } = await import('$app/environment'));
  } catch {
    building = false;
  }
  if (building) {
    throw new Error(
      'cairn: previewLoad ran during the build. A preview link is a bearer credential; prerendering ' +
        'it would ship a token in a static asset. Add `export const prerender = false;` to this route.',
    );
  }

  const token = event.params.token ?? '';
  if (!TOKEN_SHAPE_RE.test(token)) throw error(404, NOT_FOUND_MESSAGE);

  const env = event.platform?.env ?? {};
  let db: D1Database;
  try {
    db = requireDb(env);
  } catch (err) {
    if (err instanceof CairnError && err.conditionId === 'config.bindings-missing') {
      log.warn('preview.rejected', { reason: 'bindings_missing', binding: 'AUTH_DB' });
      throw error(503, 'Service unavailable');
    }
    throw err;
  }

  const tokenHash = await hashToken(token);
  let row: PreviewTokenRow | null;
  try {
    row = await findPreviewToken(db, tokenHash);
  } catch (err) {
    if (isMissingTableError(err)) rejectPreview('table_missing');
    throw err;
  }
  if (row === null) {
    let reason: 'unknown' | 'expired' = 'unknown';
    try {
      const anyRow = await findPreviewTokenAnyExpiry(db, tokenHash);
      if (anyRow !== null && anyRow.expiresAt <= Date.now()) reason = 'expired';
    } catch (err) {
      if (isMissingTableError(err)) rejectPreview('table_missing');
      throw err;
    }
    rejectPreview(reason);
  }

  const concept = findConcept(runtime.concepts, row.concept);
  if (!concept || !isValidId(row.entryId)) {
    rejectPreview('row_invalid', { concept: row.concept, id: row.entryId });
  }

  const backend = event.locals.cairnBackend ?? runtime.backend.connect(env);
  const path = `${concept.dir}/${filenameFromId(row.entryId)}`;
  const branch = pendingBranch(concept.id, row.entryId);

  const manifestRaw = await backend.readFile(runtime.manifestPath, backend.defaultBranch);
  const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);

  const draftRaw = await backend.readFile(path, branch);

  if (draftRaw === null) {
    // The not-found read IS the branch-gone signal: publish and discard both delete the branch.
    // Distinguish "went live" from "discarded before it ever published" with a live read of the
    // default branch, never the site's own (possibly stale) build-time index.
    const mainRaw = await backend.readFile(path, backend.defaultBranch);
    const publishedEntry = mainRaw !== null ? createContentIndex([{ path, raw: mainRaw }], concept).byId(row.entryId) : undefined;
    if (!publishedEntry) rejectPreview('branch_gone', { concept: concept.id, id: row.entryId });

    const resolvers = await buildPreviewResolvers(runtime, backend, manifest, concept, null);
    const data = await composeEntryData(config, publishedEntry, resolvers);
    return {
      ...data,
      seo: stripPreviewSeo(data.seo),
      preview: {
        state: 'published',
        expiresAt: new Date(row.expiresAt).toISOString(),
        published: { permalink: publishedEntry.permalink },
      },
    };
  }

  const draftEntry = createContentIndex([{ path, raw: draftRaw }], concept).byId(row.entryId);
  if (!draftEntry) rejectPreview('draft_invalid', { concept: concept.id, id: row.entryId });

  const draftRow = manifestEntryFromFile(concept, { path, raw: draftRaw });
  const upsertedManifest = upsertEntry(manifest, draftRow);
  const resolvers = await buildPreviewResolvers(runtime, backend, upsertedManifest, concept, branch);
  const data = await composeEntryData(config, draftEntry, resolvers);
  return {
    ...data,
    seo: stripPreviewSeo(data.seo),
    preview: {
      state: 'draft',
      expiresAt: new Date(row.expiresAt).toISOString(),
      published: null,
    },
  };
}
