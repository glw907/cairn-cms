# Ambient types (`/ambient`)

A type-only module whose import side effect augments SvelteKit's `App.Locals` with the four
fields the engine reads and writes on every admin request, and nothing else: a type a site
consumes directly, `CairnEnv`, `Editor`, and so on, belongs on [Core](./core.md) or
[SvelteKit](./sveltekit.md) instead, even one this augmentation's own members reference, since
this module's whole contract is its import side effect, not a name a site imports from it. A site
imports it once, in `src/app.d.ts`, instead of hand-writing the `declare global` block:

```ts
// src/app.d.ts
import '@glw907/cairn-cms/ambient';
```

The augmentation it applies:

```ts
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
```

All four members share the flat `cairn` prefix rather than a nested `locals.cairn.{}` namespace:
a flat key costs a site one optional hop (`event.locals.cairnEditor`) instead of two, and a grep
for `cairnEditor` finds every engine read of the field in any repo, this one included, with no
namespace to peel back first.

`Editor`, `Backend`, `AdminActionAuditSink`, and `AccessMap` are exports of the same names:
`Editor`, `Backend`, and `AccessMap` from [core](./core.md), and `AdminActionAuditSink` from
[sveltekit](./sveltekit.md#adminactionauditsink).

- **`cairnEditor`** is the signed-in admin identity. `createAuthGuard` sets it on every
  `/admin/**` request; it's optional because a request the guard hasn't touched carries no editor
  at all, and a signed-in request holds the `Editor` while a signed-out one holds `null`.
  `requireSession`, `requireOwner`, `requireEditor`, and `requireAccess` (all
  [sveltekit](./sveltekit.md) exports) read it so a custom route rarely needs the raw field.

- **`cairnBackend`** is the per-request content-store channel. The dev-backend handle
  (`@glw907/cairn-cms-dev`) sets it so the engine resolves it ahead of the real `githubApp`
  provider (`locals.cairnBackend ?? runtime.backend.connect(env)`); a production request never
  sets it, and the real provider connects instead.

- **`cairnAuditSink`** is the site-supplied persistence seam
  [`adminAction`](./sveltekit.md#adminaction) forwards every audit record through, and a site's own
  domain code may also call it directly with its own events. A site that wants its own audit trail
  assigns it in a hooks handle; a site that never assigns it still logs `admin.action.audited` on
  every `ctx.audit` emit. [`createD1AuditSink`](./sveltekit.md#created1auditsink) is the packaged
  implementation of this seam.

- **`cairnAccess`** is the site's declared access map, attached by `createAuthGuard` alongside
  `cairnEditor`. It's internal, never serialized to a page payload, and exists so
  `requireAccess` and [`createSectionAction`](./sveltekit.md#createsectionaction) need no extra
  argument to reach it at the call site.

The subpath exports nothing at runtime (its JS module is empty), so the import is safe in a
declaration file and free everywhere else.
