// Healthz endpoint shim: exercises the engine's signing self-test through the real PKCS#1
// path. In the dev env there is no GITHUB_APP_PRIVATE_KEY_B64, so the check returns ok:false
// with a detail string. A live site with the secret set returns ok:true (verified at Plan 08
// deploy time). Always returns 200 JSON so the response is safe to assert in E2E and the
// operator can tell apart "key missing" from "server crashed".
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { healthLoad } from '@glw907/cairn-cms/sveltekit';
import { composeRuntime } from '@glw907/cairn-cms';
import { cairn } from '$lib/cairn.config.js';

const runtime = composeRuntime(cairn);

export const GET: RequestHandler = async (event) => {
  try {
    const data = await healthLoad(event, runtime);
    return json(data);
  } catch (err) {
    // healthLoad is documented as never-throwing, but guard anyway so the endpoint stays
    // JSON-only (the operator reads it, and non-200 would break the runbook check step).
    const detail = err instanceof Error ? err.message : String(err);
    return json({ ok: false, checks: { githubAppSigning: { ok: false, detail } } });
  }
};
