// cairn-cms: the public `/ambient` barrel. The one-line augmentation a consumer site imports
// from src/app.d.ts: the App.Locals members and the `__CAIRN_DEV_BUILD__` global, and nothing
// else. A type a site consumes directly (CairnEnv, Editor,
// and so on) belongs on the root barrel or /sveltekit instead, even one this augmentation's
// members reference, since this module's whole contract is its import side effect, not a name a
// site imports from it.
//
//   import '@glw907/cairn-cms/ambient';
//
// The five members share the flat `cairn` prefix rather than
// a nested `locals.cairn.{}` namespace: a flat key costs a site one optional hop
// (`event.locals.cairnEditor`) instead of two, and `grep cairnEditor` finds every engine read of
// the field in any repo, this one included, with no namespace to peel back first.
//
// The guard sets `event.locals.cairnEditor`, and this declaration types it, so a site no longer
// hand-writes the `declare global` block. The field is optional: the engine's structural
// event types read it as `cairnEditor?: Editor | null`, and a request the guard has not touched
// carries no editor at all.
//
// `cairnBackend` is the per-request content-store channel: the dev-backend handle sets it so the
// engine resolves it ahead of the real `createGithubApp` provider
// (`locals.cairnBackend ?? runtime.backend.connect`). Typing it here makes that seam a checked
// contract, so a mis-keyed write cannot silently fall through to the production provider. A
// production request never sets it.
//
// `cairnAuditSink` is the site-supplied persistence seam `createAdminAction` forwards audit records
// through. A site assigns it in its hooks handle; typing it here means that assignment
// typechecks without the site hand-writing a `declare global` block for an engine-read field.
//
// `cairnAccess` is the site's declared access map, attached by `createAuthGuard` alongside
// `cairnEditor`. Typing it here means a custom route or a `createSectionAction` wrapper reads it
// with no cast, the same way `cairnEditor` already does.
//
// `cairnIdentity` is the site's identity-gate snapshot (`createAuthGuard`'s `identity` option),
// set on every `/admin/**` path under identity mode, the public login and auth paths included.
// `createAuthGuard` is the only writer; the value is validated once at construction and never
// re-read from the option per request.
import type { Editor } from './auth/types.js';
import type { Backend } from './github/backend.js';
import type { AdminActionAuditSink } from './sveltekit/admin-action.js';
import type { AccessMap } from './auth/access.js';

declare global {
  /**
   * The build-time half of the dev-backend gate. The `cairnManifest()` Vite plugin defines it as a
   *  literal: `true` under `vite dev` and under a `VITE_CAIRN_E2E=1` build, `false` in a default
   *  production build. Every call site names it directly, which is what lets each guarded branch
   *  fold where it is written.
   */
  const __CAIRN_DEV_BUILD__: boolean;

  namespace App {
    /**
     * The fields the engine reads and writes on admin requests, typed by importing
     * `@glw907/cairn-cms/ambient` once from `src/app.d.ts`. The import is type-only: its module
     * exports nothing at runtime.
     */
    interface Locals {
      /** The signed-in editor, set by `createAuthGuard` on a guarded `/admin/**` request; `null` when signed out, absent on a request the guard never touched. */
      cairnEditor?: Editor | null;
      /** The per-request content store the dev-backend handle injects, resolved ahead of the real provider (`locals.cairnBackend ?? runtime.backend.connect(env)`); a production request leaves it unset. */
      cairnBackend?: Backend;
      /** The site's persistence seam for `createAdminAction`'s audit records, assigned in a hooks handle. Left unassigned, every `ctx.audit` emit still logs `admin.action.audited`. */
      cairnAuditSink?: AdminActionAuditSink;
      /** The site's declared access map, attached by `createAuthGuard` beside `cairnEditor`; the engine never puts it in a page payload. A zero-config guard attaches an empty map, which admits nothing, so a `createAdminAction` that opts into `access` refuses until the site declares a rule for its target; one with no `access` option never reads the field. */
      cairnAccess?: AccessMap;
      /** The identity-gate snapshot from `createAuthGuard`'s `identity` option, set on every `/admin/**` path under identity mode, the public login and confirm paths included. The guard is its only writer, publishing the value validated once at construction; absent under the magic-link default. */
      cairnIdentity?: { label: string; logoutUrl: string };
    }
  }
}

export {};
