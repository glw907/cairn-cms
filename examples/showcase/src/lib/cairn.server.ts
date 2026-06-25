// The one server-side composition point. The runtime composes once here, and every server
// route that needs it (the /admin mount, /healthz) imports it instead of re-running
// composeRuntime per route.
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import type { ContentRoutesDeps } from '@glw907/cairn-cms/sveltekit';
import { dev } from '$app/environment';
import { cairn, siteConfig } from '$lib/cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });

// Under the dev backend the tidy action calls a deterministic stub instead of the real Anthropic
// SDK, so the showcase tidy E2E never makes a network call or needs a real key. The import sits
// behind a build-foldable gate (a dev build, or the e2e's VITE_CAIRN_E2E=1 build) and is dynamic,
// so a default production build folds it out (DCE), keeping the dev package's bypass barrel out of
// the deployed bundle. A real deployment leaves anthropic unset and the content routes build the
// real client from ANTHROPIC_API_KEY.
let anthropic: ContentRoutesDeps['anthropic'] | undefined;
if ((dev || import.meta.env.VITE_CAIRN_E2E === '1') && process.env.CAIRN_DEV_BACKEND === '1') {
  const { createFakeAnthropic } = await import('@glw907/cairn-cms-dev');
  anthropic = createFakeAnthropic();
}

// The dev-token stub pairs with the fake GitHub double in fake-github.ts and must never reach
// a deployed site; a real site mints installation tokens from its GitHub App key. /admin/editors
// runs against the in-memory AUTH_DB double in fake-auth-db.ts, which hooks.server.ts injects as
// platform.env. One mounted view still runs degraded under the fake backend: /admin/nav reads
// site.config.yaml through the GitHub API, which the double's seeded tree lacks, so the nav
// editor opens with an empty tree.
export const admin = createCairnAdmin(runtime, { mintToken: async () => 'dev-token', anthropic });
