// Task 3 (extensible roles): the engine's content-editing loads and actions switched from bare
// requireSession to requireEditor, so a none-capability session (the spec's "none contract",
// section 4) is refused with 403. requireEditor throws synchronously before any backend read, so
// these fixtures need no working GitHub double: the 403 fires before saveAction or listLoad ever
// touches params, form data, or the content store.
import { describe, it, expect } from 'vitest';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { runtime } from './_content-harness.js';

/** A none-capability editor, the shape the guard produces for a role outside the site's declared
 *  vocabulary or one explicitly mapped to `none` (e.g. an ASC-shaped instructor with no `home`). */
const NONE_EDITOR = { email: 'inst@test', displayName: 'Inst', role: 'instructor', capability: 'none' };

/** A minimal event for a none-capability session; params/body are irrelevant since requireEditor
 *  refuses before either function reads them. */
function noneEvent(params: Record<string, string> = {}) {
  return {
    url: new URL('https://test.example/admin/posts'),
    params,
    request: new Request('https://test.example/admin/posts'),
    locals: { editor: NONE_EDITOR },
    platform: { env: {} },
  };
}

describe('the none contract: engine content surfaces refuse a none-capability session with 403', () => {
  it('listLoad refuses with 403', async () => {
    const routes = createContentRoutes(runtime());
    await expect(routes.listLoad(noneEvent({ concept: 'posts' }) as never)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('saveAction refuses with 403', async () => {
    const routes = createContentRoutes(runtime());
    await expect(
      routes.saveAction(noneEvent({ concept: 'posts', id: '2026-05-01-hello' }) as never),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('editLoad refuses with 403', async () => {
    const routes = createContentRoutes(runtime());
    await expect(
      routes.editLoad(noneEvent({ concept: 'posts', id: '2026-05-01-hello' }) as never),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('createAction refuses with 403', async () => {
    const routes = createContentRoutes(runtime());
    await expect(routes.createAction(noneEvent({ concept: 'posts' }) as never)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('publishAllAction refuses with 403', async () => {
    const routes = createContentRoutes(runtime());
    await expect(routes.publishAllAction(noneEvent() as never)).rejects.toMatchObject({ status: 403 });
  });
});
