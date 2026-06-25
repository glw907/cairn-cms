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
// SDK, and the commit path mints a stub `dev-token` to pair with the fake GitHub double in
// fake-github.ts. Both sit behind one build-foldable gate (a dev build, or the e2e's
// VITE_CAIRN_E2E=1 build), and the anthropic import is dynamic, so a default production build folds
// the whole block out (DCE), keeping the dev package's bypass barrel and the token stub out of the
// deployed bundle. A real deployment leaves both unset: the content routes build the real Anthropic
// client from ANTHROPIC_API_KEY, and the engine mints a real installation token via its default
// path (deps.mintToken ?? cachedInstallationToken). /admin/editors runs against the in-memory
// AUTH_DB double in fake-auth-db.ts, which hooks.server.ts injects as platform.env. One mounted view
// still runs degraded under the fake backend: /admin/nav reads site.config.yaml through the GitHub
// API, which the double's seeded tree lacks, so the nav editor opens with an empty tree.
let anthropic: ContentRoutesDeps['anthropic'] | undefined;
let mintToken: (() => Promise<string>) | undefined;
if ((dev || import.meta.env.VITE_CAIRN_E2E === '1') && process.env.CAIRN_DEV_BACKEND === '1') {
  const { createFakeAnthropic } = await import('@glw907/cairn-cms-dev');
  anthropic = createFakeAnthropic();
  mintToken = async () => 'dev-token';
}

export const admin = createCairnAdmin(runtime, { mintToken, anthropic });
