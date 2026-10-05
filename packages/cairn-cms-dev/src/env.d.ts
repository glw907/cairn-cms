// The engine ships the App.Locals.cairnEditor augmentation; one import applies it, the same way a
// consumer site's app.d.ts does. The dev backend's handle.ts mints event.locals.cairnEditor, so the
// isolated `tsc -p packages/cairn-cms-dev` type check needs the augmentation in scope; without
// this, App.Locals is the bare kit interface and `cairnEditor` reads as an excess property.
//
// The workers-types reference declares `cloudflare:workers`, which handle.ts imports. A consumer
// site gets that declaration from its own `wrangler types` output instead; this file is read only
// by the isolated check.
/// <reference types="@cloudflare/workers-types" />
import '@glw907/cairn-cms/ambient';
