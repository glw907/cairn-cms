import { test, expect } from '@playwright/test';
import { defineRoles, defineAccess, canReach } from '@glw907/cairn-cms';
import type { Editor, Role } from '@glw907/cairn-cms';

// The consumer proof for the admin access map (spec 2026-07-18-admin-access-and-attention-design.md,
// "Testing shape"). The engine's own unit suite (src/tests/unit/auth-access.test.ts) exercises
// defineAccess/canReach's mechanics against a relative import; this spec proves the same three
// functions behave identically through the PACKAGE's public surface, as `@glw907/cairn-cms`
// resolves it for a real site. The fixture below is a three-role vocabulary (one owner-capability
// role, two editor-capability roles) with a mapped concept id and a mapped custom /admin route, and
// the matrix covers every reachability question the spec calls out: the mapped concept, the
// unmapped concept, the mapped href, a deeper href under the mapped prefix, owner bypass, and a
// none-capability editor reaching nothing.
//
// canReach is pure, so no page or browser fixture is needed; these tests run alongside the browser
// specs in the same `test:e2e` run, with no extra CI wiring.

const roles = defineRoles({
  owner: 'owner',
  reviewer: 'editor',
  editor: 'editor',
});

// The showcase declares no `CairnRolesRegister` augmentation, so the unaugmented `Role` type stays
// the default 'owner' | 'editor' pair. The fixture's third role ('reviewer') needs the same cast the
// engine's own unit tests use for a custom vocabulary; a real site narrows `Role` via its own
// augmentation and needs no such cast.
function asRoles(...names: string[]): Role[] {
  return names as unknown as Role[];
}

function makeEditor(role: string, capability: Editor['capability']): Editor {
  return { email: 'editor@showcase.test', displayName: 'Test Editor', role: role as Role, capability };
}

const MAPPED_CONCEPT = 'posts';
const UNMAPPED_CONCEPT = 'pages';
const MAPPED_HREF = '/admin/finance';
const DEEPER_HREF = '/admin/finance/reports';

const access = defineAccess(roles, {
  [MAPPED_CONCEPT]: asRoles('reviewer'),
  [MAPPED_HREF]: asRoles('reviewer'),
});

const owner = makeEditor('owner', 'owner');
const reviewer = makeEditor('reviewer', 'editor');
const editor = makeEditor('editor', 'editor');
const noAccess = makeEditor('suspended', 'none');

test.describe('consumer access map: defineRoles + defineAccess + canReach through @glw907/cairn-cms', () => {
  test('the mapped concept admits only the role it names', () => {
    expect(canReach(access, reviewer, MAPPED_CONCEPT)).toBe(true);
    expect(canReach(access, editor, MAPPED_CONCEPT)).toBe(false);
  });

  test('the unmapped concept admits any editor-capability role', () => {
    expect(canReach(access, reviewer, UNMAPPED_CONCEPT)).toBe(true);
    expect(canReach(access, editor, UNMAPPED_CONCEPT)).toBe(true);
  });

  test('the mapped custom route admits only the role it names', () => {
    expect(canReach(access, reviewer, MAPPED_HREF)).toBe(true);
    expect(canReach(access, editor, MAPPED_HREF)).toBe(false);
  });

  test('a deeper path under the mapped route prefix inherits its rule', () => {
    expect(canReach(access, reviewer, DEEPER_HREF)).toBe(true);
    expect(canReach(access, editor, DEEPER_HREF)).toBe(false);
  });

  test('owner capability bypasses the map, mapped and unmapped alike', () => {
    expect(canReach(access, owner, MAPPED_CONCEPT)).toBe(true);
    expect(canReach(access, owner, UNMAPPED_CONCEPT)).toBe(true);
    expect(canReach(access, owner, MAPPED_HREF)).toBe(true);
    expect(canReach(access, owner, DEEPER_HREF)).toBe(true);
  });

  test('a none-capability editor reaches nothing, mapped or unmapped', () => {
    expect(canReach(access, noAccess, MAPPED_CONCEPT)).toBe(false);
    expect(canReach(access, noAccess, UNMAPPED_CONCEPT)).toBe(false);
    expect(canReach(access, noAccess, MAPPED_HREF)).toBe(false);
    expect(canReach(access, noAccess, DEEPER_HREF)).toBe(false);
  });
});
