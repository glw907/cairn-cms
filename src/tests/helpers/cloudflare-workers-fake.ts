// A stand-in for the `cloudflare:workers` module, wired in by the unit and component projects'
// vite alias. The real module exists only inside workerd; the integration project runs on it
// natively. This fake keeps the same surface (`env`, `waitUntil`, `withEnv`) and runs in Node and
// in a browser, so it imports nothing from `node:*`: `withEnv` swaps and restores one module-level
// binding set rather than using `AsyncLocalStorage`.
//
// A setup file resets the fake before each test, so a test sets only what it needs.

let bindings: Record<string, unknown> = {};
let throwing = false;
let pending: Promise<unknown>[] = [];

const THROW_MESSAGE =
  'cloudflare:workers fake: env is unavailable (setFakeEnvThrowing is active until resetFakeEnv)';

function assertAvailable(): void {
  if (throwing) throw new Error(THROW_MESSAGE);
}

/** The binding set a request sees, backed by whatever {@link setFakeEnv} or {@link withEnv} last installed. */
export const env: Record<string, unknown> = new Proxy({} as Record<string, unknown>, {
  get(_target, key) {
    assertAvailable();
    return bindings[key as string];
  },
  set(_target, key, value) {
    assertAvailable();
    bindings[key as string] = value;
    return true;
  },
  has(_target, key) {
    assertAvailable();
    return key in bindings;
  },
  deleteProperty(_target, key) {
    assertAvailable();
    return delete bindings[key as string];
  },
  ownKeys() {
    assertAvailable();
    return Reflect.ownKeys(bindings);
  },
  getOwnPropertyDescriptor(_target, key) {
    assertAvailable();
    const descriptor = Reflect.getOwnPropertyDescriptor(bindings, key);
    return descriptor ? { ...descriptor, configurable: true } : undefined;
  },
});

/** Collect a promise the way the runtime would keep it alive, for {@link flushWaitUntil} to settle. */
export function waitUntil(promise: Promise<unknown>): void {
  pending.push(promise);
}

/**
 * Run `callback` with `newEnv` as the binding set, then restore the outer set, on a normal return,
 * a throw, and (for a promise result) after the promise settles.
 * @throws Error when {@link setFakeEnvThrowing} is active.
 */
export function withEnv<T>(newEnv: Record<string, unknown>, callback: () => T): T {
  assertAvailable();
  const outer = bindings;
  bindings = newEnv;
  const restore = (): void => {
    bindings = outer;
  };
  let result: T;
  try {
    result = callback();
  } catch (error) {
    restore();
    throw error;
  }
  if (result instanceof Promise) {
    return result.finally(restore) as T;
  }
  restore();
  return result;
}

/** Install `next` as the binding set the exported `env` reads. */
export function setFakeEnv(next: Record<string, unknown>): void {
  bindings = next;
}

/** Return the fake to its initial state: empty bindings, no collected promises, not throwing. */
export function resetFakeEnv(): void {
  bindings = {};
  pending = [];
  throwing = false;
}

/** Settle every promise handed to {@link waitUntil}, including any queued while settling. */
export async function flushWaitUntil(): Promise<void> {
  while (pending.length > 0) {
    const batch = pending;
    pending = [];
    await Promise.allSettled(batch);
  }
}

/**
 * Make every `env` access and every `withEnv` call throw until {@link resetFakeEnv}, mirroring the
 * adapter's behavior while a build prerenders.
 */
export function setFakeEnvThrowing(): void {
  throwing = true;
}
