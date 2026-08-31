// The /admin guard, plus the per-load owner/session gates. A site's hooks.server.ts sets
// `export const handle = createAuthGuard()`. Events are typed structurally, so the engine
// stays free of a site's App.* ambient types.
import { redirect, error, type Handle } from '@sveltejs/kit';
import { resolveSession } from '../auth/store.js';
import { sessionCookieName } from '../auth/crypto.js';
import { isUnsafeFormRequest, originMatches, csrfHeaderVerdict, csrfTokenVerdict, csrfSecure } from './csrf.js';
import { applySecurityHeaders } from './admin-response.js';
import { renderConditionResponse, REASON_CONDITION } from './condition-response.js';
import { log } from '../log/index.js';
import { resolveCapability, DEFAULT_ROLES } from '../auth/roles.js';
import { canReach, hasAccessRule, targetFromRouteId } from '../auth/access.js';
import type { RolesDeclaration } from '../auth/roles.js';
import type { AccessMap } from '../auth/access.js';
import type { Editor } from '../auth/types.js';
import type { CairnEvent, CookieJar, HandleInput } from './types.js';

/** The login page and the auth endpoints are public; everything else under /admin is gated. */
export function isPublicAdminPath(pathname: string): boolean {
  return pathname === '/admin/login' || pathname.startsWith('/admin/auth/');
}

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

/**
 * Local development (`wrangler dev`) legitimately speaks http; a deployed host does not. The hostname
 * comes from the client `Host` header, so this is UX only: it decides whether to show the help page,
 * never whether to grant access. The session gate below runs regardless. Do not make it an auth check.
 */
function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.localhost')
  );
}

/** Configuration for `createAuthGuard`: the site's declared role vocabulary and access map. */
export interface AuthGuardOptions {
  /**
   * The site's declared role vocabulary (see `defineRoles`); omitted, the guard resolves every
   *  session against the implicit owner/editor pair, so a zero-config site sees no behavior change.
   */
  roles?: RolesDeclaration;
  /**
   * The site's declared access map (see `defineAccess`); omitted, the two enforcement points read
   *  it differently. The engine's own screens, gated through {@link requireEngineAccess}'s
   *  `canReach` check, stay open to any editor-capability session, so a zero-config site sees no
   *  behavior change there. A `requireAccess` call on a site's own route reads the opposite way:
   *  with no map at all, it has no opinion on any target and refuses every session, owner
   *  included, since that helper's contract is a route that opted in but found nothing.
   */
  access?: AccessMap;
  /**
   * Pin every sibling subdomain to HTTPS along with the admin host itself, on the
   * Strict-Transport-Security header the guard attaches to each admin response it returns.
   * Omitted or false, that header carries only `max-age`, so a zero-config site sees no behavior
   * change. `max-age` is sent either way: the admin surface is the one place the engine has
   * standing to insist on HTTPS, while pinning every sibling subdomain the engine knows nothing
   * about is a decision that belongs to whoever owns the domain, so it stays off unless the site
   * opts in.
   *
   * A rejection page and the login redirect carry no such header at all, deliberately: neither
   * receives this option, and a weaker header would replace a pinned policy rather than restate
   * it (see {@link applySecurityHeaders} and `brandedAdminPage`).
   */
  includeSubDomains?: boolean;
}

/**
 * The SvelteKit `Handle` that guards `/admin/**` and hardens admin responses.
 *
 * Annotated `: Handle`, kit's own type, under the interop carve-out
 * (`convention-interop-carve-out`): a host-ecosystem return type satisfies the engine's
 * contract-first-returns rule on its own, since the host ecosystem's convention wins over
 * cairn's `*Routes` grammar on a `Handle`-shaped return.
 */
export function createAuthGuard(opts: AuthGuardOptions = {}): Handle {
  const vocabulary: RolesDeclaration = opts.roles ?? DEFAULT_ROLES;
  const access = opts.access;
  const includeSubDomains = opts.includeSubDomains;
  return async function handle({ event, resolve }: HandleInput): Promise<Response> {
    const { pathname } = event.url;

    // Fail closed if the dev-backend flag is set in a deployed runtime. Read both env sources: a
    // Cloudflare Worker var lands on platform.env, an adapter-node OS var on process.env. A correct
    // production build already eliminated the dev backend (the consumer gates it on a build-time
    // define named at each call site), so a set flag signals a polluted environment; refuse loudly.
    const platformFlag = event.platform?.env?.CAIRN_DEV_BACKEND;
    const processFlag =
      typeof process !== 'undefined' ? process.env?.CAIRN_DEV_BACKEND : undefined;
    if (platformFlag === '1' || platformFlag === true || processFlag === '1') {
      log.error('guard.rejected', { reason: 'dev_backend_in_prod', path: pathname });
      return new Response(
        'cairn: the dev backend flag is set in a deployed environment. Unset CAIRN_DEV_BACKEND.',
        { status: 503 },
      );
    }

    // Rule 2 - non-admin: restore the framework's strict Origin check the consumer disabled when
    // they set checkOrigin: false to hand cairn the admin CSRF authority.
    if (!isAdminPath(pathname)) {
      if (isUnsafeFormRequest(event.request) && !originMatches(event)) {
        log.warn('guard.rejected', { reason: 'origin', path: pathname });
        return renderConditionResponse('auth.csrf-origin-mismatch');
      }
      return resolve(event);
    }

    // A deployed admin request over http never works: the magic-link form POST would fail the
    // framework's CSRF guard with an opaque 403. Serve the help page instead, before resolve()
    // runs that check. This covers the public login/auth paths too, since that is where the form
    // posts. Local http (wrangler dev) is exempt.
    if (event.url.protocol === 'http:' && !isLocalHost(event.url.hostname)) {
      log.warn('guard.rejected', { reason: 'https', path: pathname });
      return renderConditionResponse('edge.https-not-forced', { url: event.url });
    }

    // No auth store binding means no admin path can work: the gated views cannot resolve a
    // session, and a login or confirm POST would die in its action with a raw 500. That is an
    // operator fault, not a sign-in problem, so name the condition on every admin path, the
    // public ones included, instead of rendering a login form that can never succeed.
    const env = event.platform?.env ?? {};
    if (!env.AUTH_DB) {
      log.error('guard.rejected', {
        reason: 'bindings',
        conditionId: REASON_CONDITION.bindings,
        path: pathname,
      });
      return renderConditionResponse(REASON_CONDITION.bindings);
    }

    // Rule 1 - admin: every unsafe form POST carries a valid double-submit token, else the branded
    // 403 before resolve() runs. This covers the public login/auth posts too. The header witness
    // decides outright when it was SENT at all, matching or not: a valid X-Cairn-CSRF header clears
    // the request without cloning the body, which is how the raw-body media upload (a text/plain
    // POST) passes CSRF, and a header that was sent but wrong (a stale value on a raw-body endpoint)
    // rejects on its own verdict rather than falling through to the field path, whose "no csrf field"
    // failure would misreport the real cause. A custom header cannot be set cross-origin without a
    // CORS preflight, so it is as strong a token witness as the form field. Only with NO header sent
    // at all does the form-field path run and clone the body to read the token, the unchanged path
    // for every ordinary admin form post.
    if (isUnsafeFormRequest(event.request)) {
      const headerSent = event.request.headers.get('x-cairn-csrf') !== null;
      const verdict = headerSent
        ? csrfHeaderVerdict({
            url: event.url,
            request: event.request,
            cookies: event.cookies,
            platform: event.platform,
          })
        : await csrfTokenVerdict(event);
      if (!verdict.ok) {
        // Presence-only: whether the session cookie was sent, never its value or a resolved
        // identity. This check runs before session resolution (below), so no editor is known yet.
        // The name derives through csrfSecure, the same call the CSRF pair uses (Task 6): a
        // coherence change here, since an http, non-local admin request never reaches this
        // point at all (the https-help-page check above already refused it).
        const hasSession =
          event.cookies.get(sessionCookieName(csrfSecure({ url: event.url, platform: event.platform }))) !==
          undefined;
        log.warn('guard.rejected', {
          reason: 'csrf',
          path: pathname,
          detail: verdict.detail,
          witness: headerSent ? 'header' : 'field',
          hasSession,
        });
        return renderConditionResponse('auth.csrf-token-invalid');
      }
    }

    if (!isPublicAdminPath(pathname)) {
      // Same csrfSecure derivation as the hasSession read above (Task 6): unreachable to differ
      // from the bare protocol check on a guarded admin path, since the https-help-page check
      // above already refused every http, non-local request before this line runs.
      const id = event.cookies.get(sessionCookieName(csrfSecure({ url: event.url, platform: event.platform })));
      const editor = id ? await resolveSession(env.AUTH_DB, id, Date.now()) : null;
      if (!editor) throw redirect(303, '/admin/login');
      // Resolve capability once per request, here, so every downstream load/action reads it off
      // locals.cairnEditor with no re-derivation. A role absent from the vocabulary (a pruned
      // config, a hand-edited row) still authenticates at none capability; only the log names it,
      // so a stale config never locks the person out of sign-in.
      if (!Object.hasOwn(vocabulary, editor.role)) {
        log.warn('auth.role.unknown', { email: editor.email, role: editor.role });
      }
      event.locals.cairnEditor = { ...editor, capability: resolveCapability(vocabulary, editor.role) };
      // access ?? {}, not access: canReach and hasAccessRule agree on undefined and {} in every
      // branch (both fail closed on an unmapped target the same way), so this is behavior-
      // identical for a zero-config site. It buys section-action.ts a real signal: an absent
      // locals.cairnAccess then only ever means the guard never ran on this route.
      event.locals.cairnAccess = access ?? {};
    }
    const response = await resolve(event);
    applySecurityHeaders(response.headers, { includeSubDomains });
    return response;
  };
}

/**
 * Fail loudly (throw) rather than fall back to a soft `fail(403)` when an untyped caller passes
 * no cookie jar at all. `CairnEvent.cookies` is already typed `CookieJar` (non-nullable), so this
 * only fires for a caller outside the type system; narrows the return to a definite `CookieJar`
 * so the caller's own CSRF check needs no further guard (`convention-auth-loud-postures`). The
 * exported CSRF helpers keep their strict, non-nullable `cookies: CookieJar` parameter type
 * deliberately: widening it to accept `undefined` would trade this compile-time contract for a
 * runtime throw, the inverse of the platform convention. The thrown message names only the jar,
 * never a cookie value.
 */
export function requireCookieJar(event: { cookies: CookieJar }): CookieJar {
  if (!event.cookies) throw new Error('cairn: no cookie jar on this event');
  return event.cookies;
}

/**
 * For a protected load/action: the session the guard already resolved, or a login redirect.
 *  Takes {@link CairnEvent}, so every engine load/action and a site's own real event satisfy it.
 */
export function requireSession(event: CairnEvent): Editor {
  const editor = event.locals.cairnEditor;
  if (!editor) throw redirect(303, '/admin/login');
  return editor;
}

/**
 * For the management surface: a signed-in owner, or 403 for anyone else.
 */
export function requireOwner(event: CairnEvent): Editor {
  const editor = requireSession(event);
  if (editor.capability !== 'owner') throw error(403, 'Owner access required');
  return editor;
}

/**
 * For the engine's own content and admin-mutation surfaces: a signed-in owner or editor, or 403
 * for a none-capability session. The none contract (spec section 4): a none session still
 * authenticates and carries a populated `locals.cairnEditor`, so it passes through the
 * `CairnAdminShell` custom-route seam untouched; only the engine's own content and roster loads
 * and actions call this and refuse it.
 */
export function requireEditor(event: CairnEvent): Editor {
  const editor = requireSession(event);
  if (editor.capability === 'none') throw error(403, 'Editor access required');
  return editor;
}

/**
 * For one of the engine's own content or admin-mutation surfaces, beside its existing
 * `requireEditor` call: refuse with 403 when the site's declared access map denies this session's
 * role for `target` (a concept id or one of the fixed engine screens `validateAccessComposition`
 * enforces). A target absent from the map, or no map at all, always admits (`canReach`'s
 * zero-config floor), so a site that declares nothing sees no behavior change. Every denial emits
 * `auth.access.denied` with the editor's email, role, and `target`, the same shape `requireAccess`
 * emits. Unlike `requireAccess`, an unmapped target is never a fail-closed misconfiguration here:
 * an engine screen's own route is always a legitimate destination, mapped or not.
 */
export function requireEngineAccess(access: AccessMap | undefined, editor: Editor, target: string): void {
  if (canReach(access, editor, target)) return;
  log.warn('auth.access.denied', { email: editor.email, role: editor.role, target });
  throw error(403, 'Access denied');
}

/**
 * For a site's custom route, the one-line authorization story: the session the guard already
 * resolved, checked against the site's declared access map (attached to `locals.cairnAccess`
 * alongside `editor`), or a 403. `target` defaults to `event.route.id`, never
 * `event.url.pathname`: on a catch-all route the request path is attacker-chosen while the route
 * id is not (the same reasoning `createSectionAction`'s `SectionActionOptions.target` follows, so
 * a route's load and its own POST action agree on what they are checking). The derived default
 * drops route-group segments (`/admin/(app)/roster` reads as `/admin/roster`), so a map stays
 * keyed by URL shape, and resolves a parameterized route id verbatim (`/admin/posts/[id]`), so a
 * map keyed by its prefix still matches; a declared `target` is used exactly as given, never
 * normalized. So the common call is still `const editor = requireAccess(event);`. Every denial,
 * mapped or unmatched, emits `auth.access.denied` with the editor's email, role, and the resolved
 * (normalized) target.
 *
 * The unmatched case (the map has no rule at all for `target`) 403s every session, owner
 * included: this helper's contract is "this route opted into the map and the map has no opinion
 * on it," a misconfiguration made loud rather than an access decision, so `canReach`'s owner
 * bypass does not apply here. A route that wants the zero-config any-editor behavior should not
 * call this helper for that path. A null `event.route.id` (an unmatched request; a dispatched
 * load or action never actually sees one) falls back to a fixed constant that matches no
 * access-map key, never to the request path, so it fails closed the same way. A route with a
 * dynamic or rest parameter (`[id]`, `[...rest]`) also 403s every session, owner included, when
 * the map holds a key deeper than the parameter: the deeper key's literal text can never equal
 * the parameter's, so it can never be reached, and admitting through the shallower key instead
 * would silently make the deeper rule dead code (see `matchHrefKey`, `auth/access.ts`). A site
 * relying on such a route must declare `target` explicitly, the same warning
 * `SectionActionOptions.target` carries for its own POST half.
 */
export function requireAccess(event: CairnEvent, target?: string): Editor {
  const editor = requireSession(event);
  const resolvedTarget = target ?? targetFromRouteId(event.route.id);
  const access = event.locals.cairnAccess;
  if (!hasAccessRule(access, resolvedTarget) || !canReach(access, editor, resolvedTarget)) {
    log.warn('auth.access.denied', { email: editor.email, role: editor.role, target: resolvedTarget });
    throw error(403, 'Access denied');
  }
  return editor;
}
