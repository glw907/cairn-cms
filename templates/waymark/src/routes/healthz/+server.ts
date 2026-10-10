// Healthz endpoint shim at the site root, OUTSIDE /admin so a real site's auth guard does not
// gate it. Exercises the engine's signing self-test through the real PKCS#1 path. Answers 200 when
// the check passes and 503 when it fails, so a deploy gate or uptime monitor reads the status code
// alone. In the dev env there is no GITHUB_APP_PRIVATE_KEY_B64, so the check returns ok:false with
// a detail string and a 503. A live site with the secret returns ok:true and a 200. The body is
// JSON in every case, and a crash inside the check answers 503 with a fixed detail, never the
// thrown message, since this route is anonymous; loadHealth has already logged the message as
// health.failed. Every answer carries cache-control: no-store, so no cache serves a stale verdict.
import type { RequestHandler } from './$types.js';
import { loadHealth } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '#chassis/cairn.server.js';

const NO_STORE = { 'cache-control': 'no-store' };

// A site that defaults to prerender=true must force this dynamic, or it gets prerendered to a
// build-time ok:false and can 404 at runtime.
export const prerender = false;

export const GET: RequestHandler = async (event) => {
  try {
    const health = await loadHealth(event, runtime);
    return Response.json(health, { status: health.ok ? 200 : 503, headers: NO_STORE });
  } catch {
    return Response.json(
      { ok: false, checks: { githubAppSigning: { ok: false, detail: 'health check failed' } } },
      { status: 503, headers: NO_STORE },
    );
  }
};
