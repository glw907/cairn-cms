// Task 3 (admin access map): defineAccess validates a map's shape and role vocabulary at
// construction (auth-access.test.ts); validateAccessComposition is the second stage, needing the
// site's real concept list and engine-route table, so it fails loud at server start rather than
// silently never gating (or never being reachable) at request time. Mirrors
// nav-layout-validate.test.ts's own direct-call and wired-at-construction split.
import { describe, it, expect } from 'vitest';
import { validateAccessComposition } from '../../lib/sveltekit/admin-nav.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { runtime } from './_content-harness.js';
import type { AccessMap } from '../../lib/auth/access.js';

const CONCEPT_IDS = ['posts', 'pages'];

describe('validateAccessComposition: construction throws', () => {
  it('rejects a screen-id key that names neither a concept nor a fixed engine screen', () => {
    const access: AccessMap = { bogus: ['owner'] };
    expect(() => validateAccessComposition(access, { conceptIds: CONCEPT_IDS })).toThrow(
      /access: "bogus" is neither a declared concept nor one of the fixed engine screens/,
    );
  });

  it('accepts a declared concept id', () => {
    const access: AccessMap = { posts: ['owner'] };
    expect(() => validateAccessComposition(access, { conceptIds: CONCEPT_IDS })).not.toThrow();
  });

  it('accepts every fixed engine screen this pass enforces', () => {
    const access: AccessMap = { media: ['owner'], vocabulary: ['owner'], nav: ['owner'], settings: ['owner'] };
    expect(() => validateAccessComposition(access, { conceptIds: CONCEPT_IDS })).not.toThrow();
  });

  it('rejects an href key that collides with a built-in admin route', () => {
    const access: AccessMap = { '/admin/media': ['owner'] };
    expect(() => validateAccessComposition(access, { conceptIds: CONCEPT_IDS })).toThrow(
      /access: href "\/admin\/media" collides with cairn's built-in "media" view/,
    );
  });

  it('accepts an href key that names no built-in route', () => {
    const access: AccessMap = { '/admin/money': ['owner'] };
    expect(() => validateAccessComposition(access, { conceptIds: CONCEPT_IDS })).not.toThrow();
  });
});

describe('validateAccessComposition: wired at admin construction', () => {
  it('throws building createContentRoutes from a runtime carrying a bad access map', () => {
    expect(() => createContentRoutes(runtime({ access: { bogus: ['owner'] } }))).toThrow(
      /access: "bogus" is neither a declared concept/,
    );
  });

  it('does not throw building createContentRoutes from a runtime carrying a valid access map', () => {
    expect(() => createContentRoutes(runtime({ access: { posts: ['owner'], media: ['owner'] } }))).not.toThrow();
  });

  it('skips validation entirely when access is undeclared, the common case', () => {
    expect(() => createContentRoutes(runtime())).not.toThrow();
  });
});
