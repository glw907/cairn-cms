# Ambient types (`/ambient`)

A type-only module whose import side effect augments SvelteKit's `App.Locals` with the `editor`
field the auth guard sets and the `backend` field the dev-backend handle injects. A site imports it
once, in `src/app.d.ts`, instead of hand-writing the `declare global` block:

```ts
// src/app.d.ts
import '@glw907/cairn-cms/ambient';
```

The augmentation it applies:

```ts
declare global {
  namespace App {
    interface Locals {
      editor?: Editor | null;
      backend?: Backend;
    }
  }
}
```

`Editor` and `Backend` are [core](./core.md) exports of the same names. `editor` is optional because a
request the guard has not touched carries no editor; after `createAuthGuard()` runs, a signed-in request
holds the `Editor` and a signed-out one holds `null`. `backend` is the per-request content store: the
dev-backend handle sets it, and the engine resolves it ahead of the real `githubApp` provider. A
production request leaves it unset.

The subpath exports nothing at runtime (its JS module is empty), so the import is safe in a
declaration file and free everywhere else.
