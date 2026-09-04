// cairn-cms: the shared admin shell payload (shellLoad), the Help home (helpLoad), and the
// role-aware admin-root landing (indexLoad). createShellActions closes over the shared
// ContentRoutesContext (content-routes-context.ts), built once per createContentRoutesInternal
// call and passed to every sibling factory; the public createContentRoutes is only a thin wrapper
// around it.
import { redirect, error } from '@sveltejs/kit';
import { deriveGettingStarted, type GettingStarted } from '../content/getting-started.js';
import { markdownReference, type MarkdownReferenceRow } from '../components/markdown-reference.js';
import { DEFAULT_MEDIA_BASE } from '../components/media-base-context.js';
import { PENDING_PREFIX } from '../content/pending.js';
import { emptyManifest } from '../content/manifest.js';
import { log } from '../log/index.js';
import { requireSession, requireEditor, isPublicAdminPath } from './guard.js';
import { canReach } from '../auth/access.js';
import { resolveNavLayout, type ResolvedNavLayout, type ResolvedLayoutChild } from './admin-nav.js';
import { resolveRefusalCode, type RefusalCode } from './refusal-codes.js';
import { roleHome, type Capability } from '../auth/roles.js';
import { issueCsrfToken } from './csrf.js';
import { pendingEntryOf } from './content-routes-shared.js';
import type { ContentRoutesContext, AttentionItem } from './content-routes-context.js';
import type { CairnEvent } from './types.js';

/**
 * A sidebar concept entry: just enough to render the nav without shipping validators to the
 * client. Module-internal (the retires pass, Task 2 retired its export, a sanctioned
 * NavIcon-class leak); a consumer reads it structurally as
 * `Extract<AdminShellData, { public: false }>['concepts'][number]`.
 */
interface NavConcept {
  id: string;
  label: string;
}

/**
 * The shared admin shell's data, produced by `shellLoad` and consumed by the CairnAdminShell
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
      user: { displayName: string; email: string; role: string; capability: Capability };
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
      /**
       * The nav group labels the user has collapsed, decoded from the persisted cookie. Null
       *  when no cookie exists yet (the shell then seeds from each section's declared
       *  `collapsed: true` default); an array, including an empty one, means the cookie exists
       *  and its decoded set wins entirely, even over a declared default, in both directions.
       */
      collapsedNav: string[] | null;
      /** The session's CSRF double-submit token, handed to descendant forms through context. */
      csrf: string;
      /**
       * Every entry with unpublished edits (a `cairn/` ref), streamed so the shell never blocks on
       *  GitHub. Resolves to null when GitHub is unreachable, so the topbar hides the publish-all
       *  action rather than lying.
       */
      pendingEntries: Promise<{ concept: string; id: string }[] | null>;
      /**
       * Per-session pending-work counts from the site's own `deps.attention`, keyed by the visible
       *  nav href they decorate; an entry absent from the resolved-and-filtered `nav` (an engine
       *  door or a site entry alike) never appears here, so a count cannot leak to a role that
       *  cannot see it. Empty when the site configures no dep.
       */
      attention: Record<string, { count: number; label: string }>;
      /**
       * The delivery base every descendant media surface composes its thumbnail `src` under, resolved
       *  from the runtime's `assets.publicBase` when media is on, or the `/media` default otherwise.
       *  `CairnAdminShell` hands this down through the media-base context, so a site whose media lives
       *  at a non-default path gets working thumbnails without every reader threading the base itself.
       */
      mediaBase: string;
    };

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

/**
 * Build the shared admin shell load, the Help home load, and the role-aware admin-root landing,
 *  closed over the shared content-routes context.
 */
export function createShellActions(ctx: ContentRoutesContext) {
  const { runtime } = ctx;

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
  async function shellLoad(event: CairnEvent): Promise<{ shell: AdminShellData }> {
    // The theme cookie carries no auth, so a public (login/auth) path reads and honors it too:
    // a signed-out visitor's dark-mode pick should not revert to light the moment they sign out.
    const cookieTheme = event.cookies?.get('cairn-admin-theme');
    const theme = cookieTheme === 'cairn-admin-dark' ? 'cairn-admin-dark' : 'cairn-admin';
    if (isPublicAdminPath(event.url.pathname)) {
      return { shell: { public: true, siteName: runtime.siteName, theme } };
    }
    const editor = requireSession(event);
    // `undefined` means no cookie was ever set (seed from the declared defaults); any other
    // value, including the empty string a visitor produces by reopening every declared-collapsed
    // section, means the cookie exists and its decoded set (however empty) wins outright. Do not
    // collapse this to a truthiness check: an empty string is a present, meaningful cookie value.
    const cookieCollapsed = event.cookies?.get('cairn-admin-nav-collapsed');
    const collapsedNav =
      cookieCollapsed === undefined
        ? null
        : cookieCollapsed.split(',').map((part) => decodeURIComponent(part)).filter(Boolean);
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
              // Filter by canReach, the same access authority publishAllAction applies to its
              // batch, so a restricted role never receives a denied id and the "Publish site (N)"
              // count never counts an entry publishAllAction would skip.
              names.flatMap((name) => {
                const entry = pendingEntryOf(runtime, name);
                if (!entry || !canReach(runtime.access, editor, entry.concept.id)) return [];
                return [{ concept: entry.concept.id, id: entry.id }];
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
      concepts: runtime.concepts.map((c) => ({ id: c.id, label: c.label, routing: c.routing })),
      navMenuLabel: runtime.navMenu?.label ?? null,
      access: runtime.access,
      editor,
    });
    const nav: ResolvedNavLayout = ctx.deps.navFilter
      ? { ...resolved, items: await ctx.deps.navFilter(resolved.items, { editor, event }) }
      : resolved;
    // The site's own attention dep, awaited exactly once (after nav resolution and navFilter, both
    // of which already ran above), then filtered against the same resolved-and-filtered visible
    // href set so a count can never leak past a nav entry the session cannot see: an unreachable
    // queue's item is dropped before any rendering or summing.
    const attentionRaw: AttentionItem[] = ctx.deps.attention ? await ctx.deps.attention({ editor, event }) : [];
    const visibleHrefs = collectVisibleHrefs(nav);
    const attention: Record<string, { count: number; label: string }> = {};
    for (const item of attentionRaw) {
      if (item.count <= 0) continue;
      if (!visibleHrefs.has(item.href)) continue;
      if (item.href in attention) continue; // first wins; a later duplicate is silently dropped
      attention[item.href] = { count: item.count, label: item.label?.trim() || 'pending items' };
    }
    return {
      shell: {
        public: false,
        siteName: runtime.siteName,
        user: { displayName: editor.displayName, email: editor.email, role: editor.role, capability },
        concepts:
          capability === 'none'
            ? []
            : runtime.concepts
                .filter((c) => canReach(runtime.access, editor, c.id))
                .map((c) => ({ id: c.id, label: c.label })),
        nav,
        pathname: event.url.pathname,
        theme,
        collapsedNav,
        // No fallback: cookies is required on CairnEvent, so the only caller that can reach a
        // missing jar here is an untyped one, and that caller should fail loudly rather than get
        // back a silent empty token that leaves every form permanently 403 with no readable cause.
        csrf: issueCsrfToken({ url: event.url, cookies: event.cookies, platform: event.platform }),
        pendingEntries,
        attention,
        mediaBase: runtime.resolvedAssets.enabled ? runtime.resolvedAssets.publicBase : DEFAULT_MEDIA_BASE,
      },
    };
  }

  /**
   * Every href a resolved nav renders as a clickable entry: each top-level child (a site entry or
   *  an engine door), each section's children, and the trailing `fallback` group of engine screens
   *  the tree never referenced (still rendered in the shell's foot slot, so still visible). The
   *  attention filter reads this set so a count never survives against an href the session cannot
   *  actually see.
   */
  function collectVisibleHrefs(nav: ResolvedNavLayout): Set<string> {
    const hrefs = new Set<string>();
    const visit = (child: ResolvedLayoutChild) => hrefs.add(child.href);
    for (const node of nav.items) {
      if ('children' in node) {
        for (const child of node.children) visit(child);
      } else {
        visit(node);
      }
    }
    for (const child of nav.fallback) visit(child);
    return hrefs;
  }

  /**
   * Load the Help home: the getting-started progress derived from the committed manifest and the open
   *  pending branches, the markdown reference, and the runtime's support contact. A GitHub failure
   *  degrades to an empty corpus (0 of 3) rather than failing the screen, the same GitHub fail-safe the shell uses.
   */
  async function helpLoad(event: CairnEvent): Promise<HelpData> {
    requireEditor(event);
    let manifest = emptyManifest();
    let pending: { concept: string; id: string }[] = [];
    try {
      const backend = ctx.resolveBackend(event);
      manifest = await ctx.readManifest(backend);
      const names = await backend.listBranches(PENDING_PREFIX);
      pending = names.flatMap((name) => {
        const entry = pendingEntryOf(runtime, name);
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
   * Append a resolved refusal code to a redirect target as `error=`, merging into any query the
   *  target already carries (a declared `home` may have one, e.g. `/admin/dash?tab=1`) rather than
   *  appending a second bare `?`, which would parse into the existing key's value and swallow the
   *  code (`/admin/dash?tab=1?error=expired` reads as `tab=1?error=expired`, not two params).
   */
  function withRefusalCode(path: string, code: RefusalCode | null): string {
    if (!code) return path;
    const url = new URL(path, 'https://internal.invalid');
    url.searchParams.set('error', code);
    return `${url.pathname}${url.search}`;
  }

  /**
   * The role-aware admin-root landing (spec section 4). A role with a declared `home` is sent
   *  there. Absent a `home`, an owner- or editor-capability role lands on the first concept's list,
   *  the default landing (spec §7.6); a none-capability role gets the calm welcome view instead of a
   *  dead-end redirect. A direct GET here can carry a `?error=` (an attacker-crafted link, or a
   *  bookmark), so the relay only ever forwards a code {@link resolveRefusalCode} recognizes and
   *  drops anything else, keeping the bounded vocabulary intact through the redirect.
   */
  function indexLoad(event: CairnEvent): { view: 'welcome'; page: WelcomeData } {
    const editor = requireSession(event);
    const bounced = resolveRefusalCode(event.url.searchParams.get('error'));
    const home = roleHome(runtime.roles, editor.role);
    if (home) {
      throw redirect(303, withRefusalCode(home, bounced));
    }
    if (editor.capability !== 'none') {
      // The first concept the session can reach, not the site-wide first: a role mapped away
      // from that one would otherwise land on a 403 dead-end.
      const first = runtime.concepts.find((c) => canReach(runtime.access, editor, c.id));
      if (!first) throw error(404, 'No content types configured');
      throw redirect(307, withRefusalCode(`/admin/${first.id}`, bounced));
    }
    return { view: 'welcome', page: { displayName: editor.displayName, siteName: runtime.siteName } };
  }

  return { shellLoad, helpLoad, indexLoad };
}
