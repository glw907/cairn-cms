// Task 3 (admin access map): defineAccess validates a map's shape and role vocabulary at
// construction (auth-access.test.ts); validateAccessComposition is the second stage, needing the
// site's real concept list and engine-route table, so it fails loud at server start rather than
// silently never gating (or never being reachable) at request time. Mirrors
// nav-layout-validate.test.ts's own direct-call and wired-at-construction split.
import { describe, it, expect, vi } from 'vitest';
import { validateAccessComposition } from '../../lib/sveltekit/admin-nav.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { runtime } from './_content-harness.js';
import { log } from '../../lib/log/index.js';
import type { AccessMap } from '../../lib/auth/access.js';
import type { RolesDeclaration } from '../../lib/auth/roles.js';

const CONCEPT_IDS = ['posts', 'pages'];
const DEFAULT_ROLE_NAMES = ['owner', 'editor'];

describe('validateAccessComposition: construction throws', () => {
  it('rejects a screen-id key that names neither a concept nor a fixed engine screen', () => {
    const access: AccessMap = { bogus: ['owner'] };
    expect(() => validateAccessComposition(access, { conceptIds: CONCEPT_IDS, roleNames: DEFAULT_ROLE_NAMES })).toThrow(
      /access: "bogus" is neither a declared concept nor one of the fixed engine screens/,
    );
  });

  it('accepts a declared concept id', () => {
    const access: AccessMap = { posts: ['owner'] };
    expect(() => validateAccessComposition(access, { conceptIds: CONCEPT_IDS, roleNames: DEFAULT_ROLE_NAMES })).not.toThrow();
  });

  it('accepts every fixed engine screen this pass enforces', () => {
    const access: AccessMap = { media: ['owner'], vocabulary: ['owner'], nav: ['owner'], settings: ['owner'] };
    expect(() => validateAccessComposition(access, { conceptIds: CONCEPT_IDS, roleNames: DEFAULT_ROLE_NAMES })).not.toThrow();
  });

  it('rejects an href key that collides with a built-in admin route', () => {
    const access: AccessMap = { '/admin/media': ['owner'] };
    expect(() => validateAccessComposition(access, { conceptIds: CONCEPT_IDS, roleNames: DEFAULT_ROLE_NAMES })).toThrow(
      /access: href "\/admin\/media" collides with cairn's built-in "media" view/,
    );
  });

  it('accepts an href key that names no built-in route', () => {
    const access: AccessMap = { '/admin/money': ['owner'] };
    expect(() => validateAccessComposition(access, { conceptIds: CONCEPT_IDS, roleNames: DEFAULT_ROLE_NAMES })).not.toThrow();
  });
});

describe('validateAccessComposition: wired at admin construction', () => {
  it('throws building createContentRoutes from a runtime carrying a bad access map', () => {
    expect(() => createContentRoutes({ runtime: runtime({ access: { bogus: ['owner'] } }) })).toThrow(
      /access: "bogus" is neither a declared concept/,
    );
  });

  it('does not throw building createContentRoutes from a runtime carrying a valid access map', () => {
    expect(() => createContentRoutes({ runtime: runtime({ access: { posts: ['owner'], media: ['owner'] } }) })).not.toThrow();
  });

  it('skips validation entirely when access is undeclared, the common case', () => {
    expect(() => createContentRoutes({ runtime: runtime() })).not.toThrow();
  });
});

describe('validateAccessComposition: a rule naming an undeclared role', () => {
  // The shape a site leaves behind when it drops a role from defineRoles but not from its access
  // rules: a leftover roster row with the old role would otherwise reach the href rule.
  it.each([
    {
      name: 'a custom vocabulary that no longer declares the role',
      roleNames: ['owner', 'webmaster'],
      access: { '/admin/staff': ['staff'] } as AccessMap,
      message: 'access: "/admin/staff" names role "staff", which the role vocabulary does not declare; declare "staff" in defineRoles, or remove it from this rule',
    },
    {
      name: 'the default owner/editor pair',
      roleNames: DEFAULT_ROLE_NAMES,
      access: { posts: ['owner', 'staff'] } as AccessMap,
      message: 'access: "posts" names role "staff", which the role vocabulary does not declare; declare "staff" in defineRoles, or remove it from this rule',
    },
  ])('throws for $name', ({ roleNames, access, message }) => {
    expect(() => validateAccessComposition(access, { conceptIds: CONCEPT_IDS, roleNames })).toThrow(message);
  });

  it('accepts a declared custom none-capability role on an href rule', () => {
    const access: AccessMap = { '/admin/staff': ['staff'] };
    expect(() => validateAccessComposition(access, { conceptIds: CONCEPT_IDS, roleNames: ['owner', 'staff'] })).not.toThrow();
  });

  it('throws building createContentRoutes when the runtime declares no vocabulary and a rule names a custom role', () => {
    expect(() => createContentRoutes({ runtime: runtime({ access: { '/admin/staff': ['staff'] } }) })).toThrow(
      /access: "\/admin\/staff" names role "staff", which the role vocabulary does not declare/,
    );
  });

  it('throws building createContentRoutes when the declared vocabulary dropped a role a rule still names', () => {
    const roles: RolesDeclaration = { owner: 'owner', webmaster: 'editor' };
    expect(() => createContentRoutes({ runtime: runtime({ roles, access: { '/admin/staff': ['staff'] } }) })).toThrow(
      /access: "\/admin\/staff" names role "staff", which the role vocabulary does not declare/,
    );
  });

  it('reads the declared vocabulary, not the default pair, building createContentRoutes', () => {
    const roles: RolesDeclaration = { owner: 'owner', staff: 'none' };
    expect(() => createContentRoutes({ runtime: runtime({ roles, access: { '/admin/staff': ['staff'] } }) })).not.toThrow();
  });
});

describe('validateAccessComposition: the unmapped-screen warning (Task 10)', () => {
  it('warns naming every concept and fixed screen a partial map leaves unmapped', () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const access: AccessMap = { posts: ['owner'] };
    validateAccessComposition(access, { conceptIds: CONCEPT_IDS, roleNames: DEFAULT_ROLE_NAMES });
    expect(warnSpy).toHaveBeenCalledWith('config.access_unmapped', {
      unmapped: ['media', 'nav', 'pages', 'settings', 'vocabulary'],
    });
    warnSpy.mockRestore();
  });

  it('stays silent when the map covers every concept and every fixed screen', () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const access: AccessMap = {
      posts: ['owner'],
      pages: ['owner'],
      media: ['owner'],
      vocabulary: ['owner'],
      nav: ['owner'],
      settings: ['owner'],
    };
    validateAccessComposition(access, { conceptIds: CONCEPT_IDS, roleNames: DEFAULT_ROLE_NAMES });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('stays silent for a map of href keys alone, which declares nothing about the engine screens', () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const access: AccessMap = { '/admin/money': ['owner'] };
    validateAccessComposition(access, { conceptIds: CONCEPT_IDS, roleNames: DEFAULT_ROLE_NAMES });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('does not count an href key toward coverage once a screen key makes the map partial', () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const access: AccessMap = { '/admin/money': ['owner'], posts: ['owner'] };
    validateAccessComposition(access, { conceptIds: CONCEPT_IDS, roleNames: DEFAULT_ROLE_NAMES });
    expect(warnSpy).toHaveBeenCalledWith('config.access_unmapped', {
      unmapped: ['media', 'nav', 'pages', 'settings', 'vocabulary'],
    });
    warnSpy.mockRestore();
  });
});
