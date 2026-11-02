import { describe, it, expect } from 'vitest';
import * as admin from '../../lib/admin/index.js';
import * as pub from '../../lib/public/index.js';

describe('admin barrel', () => {
  it('exports exactly the three mountable components', () => {
    expect(Object.keys(admin).sort()).toEqual(['CairnAdmin', 'CairnAdminShell', 'CsrfField']);
  });

  it('does not export PreviewBanner, which moved to the /public barrel', () => {
    expect(admin).not.toHaveProperty('PreviewBanner');
  });
});

describe('public barrel', () => {
  it('exports exactly CairnHead and PreviewBanner', () => {
    expect(Object.keys(pub).sort()).toEqual(['CairnHead', 'PreviewBanner']);
  });
});
