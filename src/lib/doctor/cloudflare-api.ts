// Shared plumbing for the doctor's Cloudflare API probes: the API base, the bearer-token
// request helpers, and the skip results for the credentials the checks share. Every request
// goes through ctx.fetch with the operator's CLOUDFLARE_API_TOKEN, so the tests script the
// API and the bin passes global fetch.
import { skip } from './types.js';
import type { CheckResult, DoctorContext } from './types.js';

export const CF_API = 'https://api.cloudflare.com/client/v4';

export const NO_TOKEN: CheckResult = skip('set CLOUDFLARE_API_TOKEN to run this check');

export const NO_FROM: CheckResult = skip(
  'pass --from, set CAIRN_FROM, or configure the cairnManifest plugin so the doctor can read the adapter'
);

export const NO_ACCOUNT: CheckResult = skip(
  'set CLOUDFLARE_API_TOKEN, and CLOUDFLARE_ACCOUNT_ID or a wrangler account_id, to run this check'
);

/**
 *
 */
export function cfGet(ctx: DoctorContext, path: string): Promise<Response> {
  return ctx.fetch(`${CF_API}${path}`, {
    headers: { authorization: `Bearer ${ctx.cfToken}` },
  });
}

/**
 *
 */
export function cfPost(ctx: DoctorContext, path: string, body: unknown): Promise<Response> {
  return ctx.fetch(`${CF_API}${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${ctx.cfToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}
