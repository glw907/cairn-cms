import { expect, test } from 'vitest';
import { devPackageReady } from './index.js';

test('the dev package resolves from the workspace', () => {
  expect(devPackageReady).toBe(true);
});
