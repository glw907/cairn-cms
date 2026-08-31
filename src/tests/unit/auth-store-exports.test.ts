import { describe, it, expect } from 'vitest';
import * as authStore from '../../lib/auth-store/index.js';

describe('auth-store exports', () => {
  it('exposes the six editor-provisioning store functions', () => {
    for (const name of [
      'listEditors',
      'insertEditor',
      'deleteEditor',
      'setEditorRole',
      'removeOwnerIfNotLast',
      'demoteOwnerIfNotLast',
    ]) {
      expect(typeof (authStore as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('omits the auth-flow functions the subpath deliberately excludes, plus the demoted insertOwnerIfEmpty', () => {
    for (const name of [
      'findEditor',
      'issueToken',
      'recentlyIssued',
      'consumeToken',
      'createSession',
      'resolveSession',
      'deleteSession',
      // Demoted (retires pass, batch 1b): stays exported from `auth/store.ts`, since
      // `sveltekit/auth-routes.ts` still calls it internally for `bootstrapOwner`.
      'insertOwnerIfEmpty',
    ]) {
      expect(name in authStore).toBe(false);
    }
  });
});
