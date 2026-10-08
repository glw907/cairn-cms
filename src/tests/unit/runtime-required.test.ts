// The three factories that read the site's declared roles or access map take the composed runtime
// as a required member of their one bag parameter. This file is compile-only: `npm run check`
// type-checks it, and each `@ts-expect-error` turns into an error the moment a call without a
// `runtime` starts to compile. The calls sit in a function that is never invoked.
import { it, expect } from 'vitest';
import { createAuthGuard } from '../../lib/sveltekit/guard.js';
import { createEditorRoutes } from '../../lib/sveltekit/editors-routes.js';
import type { devBackendHandle } from '../../../packages/cairn-cms-dev/src/handle.js';
import type { AccessMap } from '../../lib/auth/access.js';

declare const access: AccessMap;
declare const devBackend: typeof devBackendHandle;

/** Never invoked: the assertions are the compiler's. */
function compileOnly(): void {
  // @ts-expect-error runtime is required
  createAuthGuard();
  // @ts-expect-error the access option is gone; runtime is required
  createAuthGuard({ access });
  // @ts-expect-error runtime is required
  devBackend();
  // @ts-expect-error runtime is required
  createEditorRoutes();
}

it('keeps the compile-only assertions out of the runtime', () => {
  expect(typeof compileOnly).toBe('function');
});
