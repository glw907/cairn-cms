// Structural subsets of SvelteKit's RequestEvent. A site passes its real event, which has
// these and more, so the engine never imports a site's generated App.* ambient types.
import type { Editor } from '../auth/types.js';
import type { AccessMap } from '../auth/access.js';
import type { Backend } from '../github/backend.js';
import type { AdminActionAuditSink } from './admin-action.js';
import type { CairnEnv } from '../env.js';

/** The options `CookieJar.set` takes: standard cookie attributes, `path` required. */
export interface CookieSetOptions {
  path: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  maxAge?: number;
}

export interface CookieJar {
  get(name: string): string | undefined;
  set(name: string, value: string, opts: CookieSetOptions): void;
  // `secure` is accepted on a delete, not just a set: SvelteKit's own delete defaults it on for
  // every host but `localhost` itself, and a browser discards a Secure Set-Cookie sent over http,
  // so a deletion over http dev only lands when the caller states the flag its setter used.
  delete(name: string, opts: { path: string; secure?: boolean }): void;
}

/**
 * The Cloudflare platform wrapper an event carries. The engine reads only `env`; a site's own
 * `App.Platform` type is free to carry `ctx` (or any other member) alongside it, since a real
 * SvelteKit `RequestEvent` has more than this structural subset and still satisfies it.
 */
export interface PlatformContext<Env> {
  env?: Env;
}

/**
 * The one structural event shape every engine load, action, and guard helper reads, parameterized
 * by the Worker env the surface needs: a real SvelteKit `RequestEvent` or `ServerLoadEvent`
 * carries every member here and more, and the engine never imports a site's generated `App.*`
 * ambient types, so any kit server event satisfies it with zero casts. It replaces five
 * separately-declared event shapes cairn used to carry, one per surface (the shared core, the
 * auth/editor routes, the content routes, the admin facade, and `adminAction`): three names for
 * one shape was the original defect, and a fourth only compounded it.
 *
 * `params` and `route` end the documented anti-idiom of reading route identity out of a form
 * body: a real kit event always carries both, so requiring them costs a compliant site nothing
 * and gives a seam like `SectionActionOptions.target` an honest derivation. `route.id` is
 * nullable because kit's own is: `Handle` genuinely runs for an unmatched request (a 404, a
 * static asset), where kit reports `null`; a matched `load` or form action always sees a real
 * route id. `cookies` and `setHeaders` are required for the same reason (every kit server event
 * has both), where the shapes this type replaces required them only inconsistently.
 *
 * Deliberately defaulted to `CairnEnv`, not left unconstrained with no default (env-genericity
 * sweep): a compile-only fixture
 * (`src/tests/unit/env-genericity.test.ts`) proves every engine factory built on this default
 * assigns clean into a site's own generated route event, under a realistic compliant
 * `App.Platform['env']` (`CairnPlatformBindings & CairnMediaBindings` plus a site binding, the
 * pattern `platform-bindings.ts` documents), with zero casts. `CairnPlatformBindings` shares
 * `AUTH_DB`/`EMAIL`/`PUBLIC_ORIGIN`/`GITHUB_APP_PRIVATE_KEY_B64` property names with `CairnEnv`,
 * which is exactly what keeps TypeScript's weak-type detection (TS2559) from rejecting the
 * assignment; a genuinely disjoint env (sharing no property names) still fails it, so the default
 * costs a compliant site nothing. A factory that genuinely needs its own env bindings (
 * `createSectionAction`) instantiates `CairnEvent<Env>` with an unconstrained, defaulted `Env` of
 * its own rather than widening this type itself.
 */
export interface CairnEvent<Env = CairnEnv> {
  url: URL;
  request: Request;
  params: Record<string, string>;
  route: { id: string | null };
  cookies: CookieJar;
  // Required so a site cannot silently drop the confirm page's Referrer-Policy header
  // (spec 7.1). A real SvelteKit RequestEvent always supplies it.
  setHeaders(headers: Record<string, string>): void;
  // The four members share the flat `cairn` prefix, so a grep for one name finds every engine
  // read in any repo with no namespace to peel back first.
  // `cairnBackend` is the per-request content store the dev-backend handle injects; the engine
  // resolves it ahead of the real provider, so typing it here makes the seam a checked contract
  // rather than a cast. A production request leaves it absent and the real `githubApp` provider
  // connects. `cairnAccess` is the site's declared access map, attached by the guard alongside
  // `cairnEditor`; it is internal (never serialized to a page payload) and exists only so
  // `requireAccess` needs no extra argument at the call site. `cairnAuditSink` is a site's
  // optional sink for `adminAction`'s audit records, wired the same way.
  locals: {
    cairnEditor?: Editor | null;
    cairnBackend?: Backend;
    cairnAuditSink?: AdminActionAuditSink;
    cairnAccess?: AccessMap;
  };
  platform?: PlatformContext<Env>;
}

/**
 * The `Handle` input `createAuthGuard` returns, chained to {@link CairnEvent}'s own `CairnEnv`
 * default, so it inherits that default's reasoning unchanged: a compile-only fixture proves the
 * returned `Handle` assigns into `sequence()` under a realistic compliant `App.Platform['env']`
 * with zero casts.
 */
export interface HandleInput {
  event: CairnEvent;
  resolve(event: CairnEvent): Promise<Response> | Response;
}

/**
 * One row in an entry's publish history, as `historyLoad` renders it: a version is a publish
 * (spec "Part 1: entry history"). `editor` renders what git recorded, degrading to the raw
 * commit-author name or its email, then to "unknown", rather than assuming a cairn editor: a
 * file's log on the default branch can also hold commits made outside cairn (a direct edit, a
 * migration).
 */
export interface HistoryEntry {
  /** The commit's full sha, the exact value revert validates a target ref against. */
  ref: string;
  /** The commit author's name, degraded to email, then to "unknown" when git recorded neither. */
  editor: string;
  /** ISO 8601: when the version landed on the default branch. */
  date: string;
}

/**
 * `historyLoad`'s data: the entry's bounded recent-publish list plus its open draft, when one
 * exists. The view's own label stays "recent versions", never a completeness claim: a rename
 * restarts the commits API's path filter, so `entries` can be shorter than the entry's real
 * lifetime even when `truncated` is false.
 */
export interface HistoryData {
  /** The most recent publishes, newest first, capped at the module's history-read bound. */
  entries: HistoryEntry[];
  /**
   * The pending branch's head commit, rendered as a synthetic top row, or null when the entry
   * carries no open draft. Never derived from a save; a draft's save-by-save history is
   * ephemeral by design and this field surfaces only its current head. `lastSavedAt` names the
   * head commit's own date, which moves on every save, so the view renders it under a "last
   * saved" label rather than "started".
   */
  draft: { editor: string; lastSavedAt: string } | null;
  /**
   * True when the backend's `limit + 1` probe found more publishes than the bound holds, so the
   * view can say "showing the most recent N" rather than paginating. An entry with exactly the
   * bound's own count of publishes is NOT truncated.
   */
  truncated: boolean;
  /**
   * The default branch's head commit sha at load time. The history screen's revert form carries
   * it as a hidden field alongside the target ref, so `revertAction` can refuse a stale revert
   * (`main` moved since this page rendered) rather than silently reverting over a publish it
   * never saw. Null only when the default branch itself carries no commits, a repository state
   * this engine otherwise never produces.
   */
  head: string | null;
}

/**
 * A refused revert (spec "Part 2: revert"): fail-closed, and stays on the page as an
 * `ActionFailure`, never a force path. `draft_exists` and `history_stale` answer `fail(409, ...)`;
 * `ref_unknown` answers `fail(404, ...)`. There is no fourth, "reverted content is invalid"
 * reason: schema drift in the old version warns on the edit screen after a successful revert, it
 * never refuses one.
 */
export type RevertFailure =
  | {
      /**
       * A pending branch already blocks this entry, from `revertAction`'s own fast pre-check or
       * from `createBranch`'s authoritative collision under a race with another save or revert.
       */
      reason: 'draft_exists';
      /** Who last saved the blocking draft, degraded the same way {@link HistoryEntry.editor} is. */
      draftEditor: string;
      /**
       * ISO 8601: when the blocking draft's branch head last landed, its most recent save, not
       * when the draft began. The refusal message renders it under a "last saved" label.
       */
      draftLastSavedAt: string;
    }
  | {
      /**
       * The posted ref is not a member of a freshly re-read recent-publish list: it named a
       * commit outside the bounded history window, or the window moved between page render and
       * submit.
       */
      reason: 'ref_unknown';
    }
  | {
      /**
       * The default branch's head moved since the history page rendered (the posted `head`
       * mismatches `branchHead(defaultBranch)`), so reverting now would silently undo a publish
       * this request never saw.
       */
      reason: 'history_stale';
    };
