// See https://svelte.dev/docs/kit/types#app.d.ts
import type { D1Database, ExecutionContext } from '@cloudflare/workers-types';
// The binding-shaped types ship from the /sveltekit subpath (since 0.51); the app.d.ts Platform
// block intersects them rather than restating every engine binding by hand. CairnMediaBindings adds
// MEDIA_BUCKET, present only because this site turns media on.
import type { CairnPlatformBindings, CairnMediaBindings } from '@glw907/cairn-cms/sveltekit';
import type { NavNode } from '@glw907/cairn-cms';
// App.Locals.editor (set by the engine's auth guard) ships with the engine.
import '@glw907/cairn-cms/ambient';

declare global {
  namespace App {
    // The root layout server load's return shape, declared app-wide so a component mounted in
    // more than one route tree (SiteHeader, in the (site) layout and the root +error.svelte)
    // reads page.data without a cast. Optional members: an error page outside a load's reach
    // still type-checks against the empty default.
    interface PageData {
      nav?: NavNode[];
      hasIslands?: boolean;
    }
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
