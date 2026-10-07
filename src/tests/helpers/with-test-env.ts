// Run one call with a binding set layered over the Worker env, through the `withEnv` that
// `cloudflare:workers` exports. The unit and component projects resolve that module to the fake in
// `cloudflare-workers-fake.ts`; the integration project runs on the native one in workerd. One
// helper serves all three, so a test reads the same in every project.
import { env, withEnv } from 'cloudflare:workers';

/**
 * Call `call` with `bindings` spread over the current Worker env, so a test names only what it
 * changes. Set a binding to `undefined` to remove it for the call.
 */
export function withTestEnv<T>(bindings: Record<string, unknown>, call: () => T): T {
  return withEnv({ ...(env as unknown as Record<string, unknown>), ...bindings }, call) as T;
}
