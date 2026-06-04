// Healthz endpoint shim at the site root, OUTSIDE /admin so a real site's auth guard does not
// gate it. Exercises the engine's signing self-test through the real PKCS#1 path. In the dev env
// there is no GITHUB_APP_PRIVATE_KEY_B64, so the check returns ok:false with a detail string. A
// live site with the secret returns ok:true. Always returns 200 JSON so the response is safe to
// assert in E2E and an operator can tell apart "key missing" from "server crashed".
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { healthLoad } from '@glw907/cairn-cms/sveltekit';
import { composeRuntime } from '@glw907/cairn-cms';
import { cairn, siteConfig } from '$lib/cairn.config.js';

// A site that defaults to prerender=true must force this dynamic, or it gets prerendered to a
// build-time ok:false and can 404 at runtime.
export const prerender = false;

const runtime = composeRuntime({ adapter: cairn, siteConfig });

export const GET: RequestHandler = async (event) => {
  try {
    return json(await healthLoad(event, runtime));
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return json({ ok: false, checks: { githubAppSigning: { ok: false, detail } } });
  }
};
