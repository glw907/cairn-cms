// The one-line App.Locals augmentation a consumer site imports from src/app.d.ts:
//
//   import '@glw907/cairn-cms/ambient';
//
// The guard sets `event.locals.editor`, and this declaration types it, so a site no longer
// hand-writes the `declare global` block. The field is optional: the engine's own structural
// event types read it as `editor?: Editor | null`, and a request the guard has not touched
// carries no editor at all.
//
// `backend` is the per-request content-store channel: the dev-backend handle sets it so the engine
// resolves it ahead of the real `githubApp` provider (`locals.backend ?? runtime.backend.connect`).
// Typing it here makes that seam a checked contract, so a mis-keyed write cannot silently fall
// through to the production provider. A production request never sets it.
import type { Editor } from './auth/types.js';
import type { Backend } from './github/backend.js';

declare global {
  namespace App {
    interface Locals {
      editor?: Editor | null;
      backend?: Backend;
    }
  }
}

export {};
