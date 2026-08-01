import { describe, it, expect } from 'vitest';
import * as authStore from '../../lib/auth-store/index.js';

describe('auth-store exports', () => {
  it('exposes the seven editor-provisioning store functions', () => {
    for (const name of [
      'listEditors',
      'insertEditor',
      'deleteEditor',
      'setEditorRole',
      'removeOwnerIfNotLast',
      'insertOwnerIfEmpty',
      'demoteOwnerIfNotLast',
    ]) {
      expect(typeof (authStore as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('omits the auth-flow functions the subpath deliberately excludes', () => {
    for (const name of [
      'findEditor',
      'issueToken',
      'recentlyIssued',
      'consumeToken',
      'createSession',
      'resolveSession',
      'deleteSession',
    ]) {
      expect(name in authStore).toBe(false);
    }
  });
});
