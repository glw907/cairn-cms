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
// SDK. The dev content backend now rides event.locals.backend (set by the fenced devBackendHandle),
// so there is no token stub here. The block sits behind one build-foldable gate (a dev build, or
// the e2e's VITE_CAIRN_E2E=1 build), and the fake-anthropic import is dynamic, so a default
// production build folds the whole block out (DCE), keeping the dev package's bypass barrel out
// of the deployed bundle. A real deployment leaves `client` unset: the content routes build the
// real Anthropic client from ANTHROPIC_API_KEY, and the engine connects the real GitHub backend
// via its provider.
// /admin/editors runs against the in-memory AUTH_DB double in fake-auth-db.ts, which
// hooks.server.ts injects as platform.env.
let client: NonNullable<ContentRoutesDeps['tidy']>['client'] | undefined;
if ((dev || import.meta.env.VITE_CAIRN_E2E === '1') && process.env.CAIRN_DEV_BACKEND === '1') {
  const { createFakeAnthropic } = await import('@glw907/cairn-cms-dev');
  client = createFakeAnthropic();
}

export const admin = createCairnAdmin(runtime, { tidy: { client } });
