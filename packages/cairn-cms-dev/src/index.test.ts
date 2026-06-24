import { expect, test } from 'vitest';
import {
  installFakeGitHub,
  createFakeAuthDb,
  createFakeR2,
  createFakeAnthropic,
} from './index.js';

// The workspace-resolves smoke, repointed from the Task 1 placeholder to the real surface: the
// four fake-backend factories must resolve from the package root, proving the re-exports and the
// workspace link are wired before any consumer imports them.
test('the dev package re-exports the four fake-backend factories from its root', () => {
  expect(installFakeGitHub).toBeTypeOf('function');
  expect(createFakeAuthDb).toBeTypeOf('function');
  expect(createFakeR2).toBeTypeOf('function');
  expect(createFakeAnthropic).toBeTypeOf('function');
});
