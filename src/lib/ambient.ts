// The one-line App.Locals augmentation a consumer site imports from src/app.d.ts:
//
//   import '@glw907/cairn-cms/ambient';
//
// The guard sets `event.locals.editor`, and this declaration types it, so a site no longer
// hand-writes the `declare global` block. The field is optional: the engine's own structural
// event types read it as `editor?: Editor | null`, and a request the guard has not touched
// carries no editor at all.
import type { Editor } from './auth/types.js';

declare global {
  namespace App {
    interface Locals {
      editor?: Editor | null;
    }
  }
}

export {};
