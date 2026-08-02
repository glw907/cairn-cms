// The one-line App.Locals augmentation a consumer site imports from src/app.d.ts:
//
//   import '@glw907/cairn-cms/ambient';
//
// The four members share the flat `cairn` prefix (C2 breaking-window pass, R2 ruling) rather than
// a nested `locals.cairn.{}` namespace: a flat key costs a site one optional hop
// (`event.locals.cairnEditor`) instead of two, and `grep cairnEditor` finds every engine read of
// the field in any repo, this one included, with no namespace to peel back first.
//
// The guard sets `event.locals.cairnEditor`, and this declaration types it, so a site no longer
// hand-writes the `declare global` block. The field is optional: the engine's own structural
// event types read it as `cairnEditor?: Editor | null`, and a request the guard has not touched
// carries no editor at all.
//
// `cairnBackend` is the per-request content-store channel: the dev-backend handle sets it so the
// engine resolves it ahead of the real `githubApp` provider
// (`locals.cairnBackend ?? runtime.backend.connect`). Typing it here makes that seam a checked
// contract, so a mis-keyed write cannot silently fall through to the production provider. A
// production request never sets it.
//
// `cairnAuditSink` is the site-supplied persistence seam `adminAction` forwards audit records
// through. A site assigns it in its own hooks handle; typing it here means that assignment
// typechecks without the site hand-writing a `declare global` block for an engine-read field.
//
// `cairnAccess` is the site's declared access map, attached by `createAuthGuard` alongside
// `cairnEditor`. Typing it here means a custom route or a `createSectionAction` wrapper reads it
// with no cast, the same way `cairnEditor` already does.
import type { Editor } from './auth/types.js';
import type { Backend } from './github/backend.js';
import type { AdminActionAuditSink } from './sveltekit/admin-action.js';
import type { AccessMap } from './auth/access.js';

declare global {
  namespace App {
    interface Locals {
      cairnEditor?: Editor | null;
      cairnBackend?: Backend;
      cairnAuditSink?: AdminActionAuditSink;
      cairnAccess?: AccessMap;
    }
  }
}

export {};
