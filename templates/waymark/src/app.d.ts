// See https://svelte.dev/docs/kit/types#app.d.ts
//
// The Worker's bindings are typed by worker-configuration.d.ts, which `wrangler types` generates from
// wrangler.jsonc and the secret names in .dev.vars.example; `cloudflare:workers` types its `env`
// export with that `Env`, and the workers-types reference supplies the runtime types it names.
// Regenerate it after any wrangler.jsonc change, with the command its first lines record.
/// <reference types="@cloudflare/workers-types" />
/// <reference path="../worker-configuration.d.ts" />
import type { NavNode } from '@glw907/cairn-cms';
// App.Locals.cairnEditor (set by the engine's auth guard) ships with the engine.
import '@glw907/cairn-cms/ambient';

declare global {
  namespace App {
    // The root layout server load's return shape, declared app-wide so a component mounted in
    // more than one route tree (SiteHeader, in the (site) layout and the root +error.svelte)
    // reads page.data without a cast. Optional members: an error page outside a load's reach
    // still type-checks against the empty default.
    interface PageData {
      nav?: NavNode[];
      footerNav?: NavNode[];
      siteName?: string;
      hasIslands?: boolean;
    }
  }
  namespace Cloudflare {
    interface Env {
      // The dev-backend opt-in src/chassis/dev-gate.ts reads. Optional because it is a dev-only
      // flag, absent from a deployed Worker, and `wrangler types` never generates it: it reaches
      // a worker only through `wrangler dev --var CAIRN_DEV_BACKEND:1`, never wrangler.jsonc.
      // The declaration only types the reads; it does not make the flag production configuration.
      CAIRN_DEV_BACKEND?: string;
    }
  }
}

export {};
