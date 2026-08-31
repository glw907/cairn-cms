import { test, expect } from '@playwright/test';
import { captureDeliver, resetCapture, readCapture } from '../src/members/capture-transport.js';

// captureDeliver carries devDelivery's own in-body refusal (retires pass, CHANGELOG.md's
// migration line): the showcase's own pin on the pattern, since `npm run test:e2e`'s webServer
// always sets CAIRN_DEV_BACKEND=1 (playwright.config.ts), so no browser-driven spec in this suite
// ever exercises the unset case. These two assertions call the transport directly, no page or
// server needed.
test.describe('captureDeliver refusal', () => {
  test.beforeEach(() => {
    resetCapture();
  });

  test('refuses when CAIRN_DEV_BACKEND is not 1', async () => {
    await expect(
      captureDeliver('refusal@showcase.test', '12345678', { env: {}, waitUntil: () => {} }),
    ).rejects.toThrow(/CAIRN_DEV_BACKEND/);
    expect(readCapture('refusal@showcase.test')).toBeNull();
  });

  test('delivers when CAIRN_DEV_BACKEND is 1', async () => {
    await expect(
      captureDeliver('delivers@showcase.test', '12345678', {
        env: { CAIRN_DEV_BACKEND: '1' },
        waitUntil: () => {},
      }),
    ).resolves.toBeUndefined();
    expect(readCapture('delivers@showcase.test')).toEqual({ code: '12345678', count: 1 });
  });
});
