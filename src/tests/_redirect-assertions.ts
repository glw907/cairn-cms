// cairn-cms: shared redirect/HTTP-error assertion helpers for route-factory tests. Both the unit
// project (node) and the integration project (workerd) exercise SvelteKit actions that throw a
// `redirect()`/`error()` rather than returning a value, so both need the same typed unwrap; this
// module has no environment-specific import, so either project can pull it in directly.
import { isRedirect, isHttpError } from '@sveltejs/kit';

/** Run a handler that should throw a redirect; return its status and location. */
export async function expectRedirect(fn: () => Promise<unknown>): Promise<{ status: number; location: string }> {
  try {
    await fn();
  } catch (e) {
    if (isRedirect(e)) return { status: e.status, location: e.location };
    throw e;
  }
  throw new Error('expected a redirect, none thrown');
}

/** Run a handler that should throw an HTTP error; return its status. */
export async function expectHttpError(fn: () => Promise<unknown>): Promise<{ status: number }> {
  try {
    await fn();
  } catch (e) {
    if (isHttpError(e)) return { status: e.status };
    throw e;
  }
  throw new Error('expected an HTTP error, none thrown');
}
