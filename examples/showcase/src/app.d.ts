// See https://svelte.dev/docs/kit/types#app.d.ts
import type { D1Database, ExecutionContext } from '@cloudflare/workers-types';
// The binding-shaped types ship from the /sveltekit subpath (since 0.51); the app.d.ts Platform
// block intersects them rather than restating every engine binding by hand. CairnMediaBindings adds
// MEDIA_BUCKET, present only because this site turns media on.
import type { CairnPlatformBindings, CairnMediaBindings } from '@glw907/cairn-cms/sveltekit';
// App.Locals.editor (set by the engine's auth guard) ships with the engine.
import '@glw907/cairn-cms/ambient';

declare global {
  namespace App {
    interface Platform {
      env: CairnPlatformBindings &
        CairnMediaBindings & {
          // The developer's own D1 binding for the custom Signups admin screen (cairn never reads it).
          APP_DB: D1Database;
        };
      context: ExecutionContext;
      caches: CacheStorage & { default: Cache };
    }
  }
}

export {};
