import { describe, it, expect } from 'vitest';
import { validateComponent } from '../../lib/render/component-validate.js';
import type { ComponentDef } from '../../lib/render/registry.js';

const base = { build: (n: unknown) => n, description: 'd', use: 'u' };
const alert: ComponentDef = {
  ...base, name: 'alert', label: 'Alert',
  attributes: [{ key: 'role', label: 'Role', type: 'select', required: true, options: ['info', 'warning'] }],
  slots: [{ name: 'body', label: 'Body', kind: 'markdown', required: true }],
} as ComponentDef;

describe('validateComponent', () => {
  it('accepts a well-formed directive', async () => {
    await expect(validateComponent(':::alert{role="warning"}\nWatch out.\n:::', alert)).resolves.toEqual({ ok: true });
  });

  it('rejects a value outside the select options', async () => {
    const r = await validateComponent(':::alert{role="danger"}\nx\n:::', alert);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.role).toMatch(/info, warning/);
  });

  it('rejects a missing required attribute', async () => {
    const r = await validateComponent(':::alert\nx\n:::', alert);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.role).toMatch(/required/i);
  });

  it('rejects an unknown attribute', async () => {
    const r = await validateComponent(':::alert{role="info" bogus="1"}\nx\n:::', alert);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.bogus).toMatch(/unknown/i);
  });

  it('rejects a missing required slot', async () => {
    const r = await validateComponent(':::alert{role="info"}\n:::', alert);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.body).toMatch(/required/i);
  });
});
