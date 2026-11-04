import { expect, test } from '@playwright/test';
// The release gate's own publish routine, driven against the real editor. The scripts are plain
// ESM with JSDoc and no declaration files, so the import carries no types.
// @ts-expect-error untyped gate module
import { publishViaAdmin } from '../../../scripts/gate/browser.mjs';
// @ts-expect-error untyped gate module
import { PUBLISHED_ALERT } from '../../../scripts/gate/legs.mjs';

test('the gate publish lands on main and returns the published alert', async ({
  context,
  baseURL,
  request,
}) => {
  const marker = `gate-marker-${Date.now()}`;
  const result = await publishViaAdmin(context, {
    origin: baseURL,
    marker,
    adminPath: '/admin/pages/about',
    pauseMs: 100,
    alertWaitMs: 20_000,
  });
  expect(result.alertText).toBe(PUBLISHED_ALERT);

  const commit = await (await request.get('/test/last-commit')).json();
  expect(commit.branch).toBe('main');
  expect(commit.content).toContain(marker);
});
