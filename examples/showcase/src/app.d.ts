// See https://svelte.dev/docs/kit/types#app.d.ts
import type { D1Database, ExecutionContext } from '@cloudflare/workers-types';
// The binding-shaped types ship from the /sveltekit subpath (since 0.51); the app.d.ts Platform
// block intersects them rather than restating every engine binding by hand. CairnMediaBindings adds
// MEDIA_BUCKET, present only because this site turns media on.
import type { CairnPlatformBindings, CairnMediaBindings } from '@glw907/cairn-cms/sveltekit';
import type { NavNode } from '@glw907/cairn-cms';
// App.Locals.cairnEditor (set by the engine's auth guard) ships with the engine.
import '@glw907/cairn-cms/ambient';

declare global {
  /**
   * The build-time half of the dev-backend gate, substituted as a literal by the Vite `define` in
   * vite.config.ts: `true` under `npm run dev` and under a `VITE_CAIRN_E2E=1` build, `false` in a
   * default production build. Declared once here because every call site names it directly, which
   * is what lets each branch fold locally (see src/chassis/dev-gate.ts).
   */
  const __CAIRN_DEV_BUILD__: boolean;

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
          // The optional Cloudflare Worker var mirroring CAIRN_DEV_BACKEND (also settable as an
          // OS var; see src/chassis/dev-gate.ts and guard.ts's own platform.env read). Declared
          // here rather than in the engine's own CairnPlatformBindings, since it is a
          // devDependency-gated convenience a site opts into, never a required binding.
          // Declaring it as an optional member is what lets devDelivery's and captureDeliver's
          // own generic constraint (`{ CAIRN_DEV_BACKEND?: string | boolean }`) assign against
          // this env without TypeScript's weak-type detection (TS2559) rejecting the call, the
          // same property-sharing discipline platform-bindings.ts documents for
          // CairnPlatformBindings itself.
          CAIRN_DEV_BACKEND?: string | boolean;
          // cairn-template:exclude-start
          // The showcase members fixture's own binding (docs/extend/add-a-second-audience.md);
          // cairn's engine never reads it. Excluded from every scaffolded site along with
          // src/members/, src/routes/members/, and the wrangler.jsonc MEMBER_DB block.
          MEMBER_DB: D1Database;
          // cairn-template:exclude-end
        };
      context: ExecutionContext;
      caches: CacheStorage & { default: Cache };
    }
  }
}

export {};
