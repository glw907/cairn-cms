// The engine ships the App.Locals.principal augmentation; one import applies it, the same way a
// consumer site's app.d.ts does. The dev backend's handle.ts mints event.locals.principal, so the
// isolated `tsc -p packages/cairn-cms-dev` type check needs the augmentation in scope; without
// this, App.Locals is the bare kit interface and `principal` reads as an excess property.
import '@glw907/cairn-cms/ambient';
