import { describe, it, expect, vi, afterEach } from 'vitest';
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

const link: ComponentDef = {
  ...base, name: 'link', label: 'Link',
  attributes: [{ key: 'href', label: 'Href', type: 'text', required: true }],
  slots: [{ name: 'body', label: 'Body', kind: 'markdown', required: true }],
} as ComponentDef;

const patterned: ComponentDef = {
  ...base, name: 'patterned', label: 'Patterned',
  attributes: [{ key: 'href', label: 'Href', type: 'text', pattern: { source: '^https://', message: 'Must start with https://.' } }],
  slots: [{ name: 'body', label: 'Body', kind: 'markdown' }],
} as ComponentDef;

describe('validateComponent pattern', () => {
  it('rejects a non-empty value that does not match the pattern', async () => {
    const r = await validateComponent(':::patterned{href="ftp://x.test"}\nGo.\n:::', patterned);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.href).toBe('Must start with https://.');
  });

  it('accepts a value that matches the pattern', async () => {
    const r = await validateComponent(':::patterned{href="https://x.test"}\nGo.\n:::', patterned);
    expect(r).toEqual({ ok: true });
  });

  it('does not run the pattern on an empty (non-required) value', async () => {
    const r = await validateComponent(':::patterned\nGo.\n:::', patterned);
    expect(r).toEqual({ ok: true });
  });
});

describe('validateComponent custom validate', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reports the string a validator returns as that field error', async () => {
    const def: ComponentDef = {
      ...base, name: 'cv', label: 'CV',
      attributes: [{ key: 'name', label: 'Name', type: 'text', validate: () => 'No good.' }],
      slots: [{ name: 'body', label: 'Body', kind: 'markdown' }],
    } as ComponentDef;
    const r = await validateComponent(':::cv{name="x"}\nGo.\n:::', def);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.name).toBe('No good.');
  });

  it('treats a null return as valid', async () => {
    const def: ComponentDef = {
      ...base, name: 'cv', label: 'CV',
      attributes: [{ key: 'name', label: 'Name', type: 'text', validate: () => null }],
      slots: [{ name: 'body', label: 'Body', kind: 'markdown' }],
    } as ComponentDef;
    const r = await validateComponent(':::cv{name="x"}\nGo.\n:::', def);
    expect(r).toEqual({ ok: true });
  });

  it('passes the value and the full values to the validator', async () => {
    const seen: Array<unknown> = [];
    const def: ComponentDef = {
      ...base, name: 'cv', label: 'CV',
      attributes: [
        { key: 'min', label: 'Min', type: 'text' },
        { key: 'max', label: 'Max', type: 'text', validate: (value, all) => {
          seen.push(value, all);
          return Number(value) < Number(all.attributes.min) ? 'Max below min.' : null;
        } },
      ],
      slots: [{ name: 'body', label: 'Body', kind: 'markdown' }],
    } as ComponentDef;
    const r = await validateComponent(':::cv{min="5" max="3"}\nGo.\n:::', def);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.max).toBe('Max below min.');
    expect(seen[0]).toBe('3');
    expect((seen[1] as { attributes: Record<string, unknown> }).attributes.min).toBe('5');
  });

  it('treats a throwing validator as valid and does not crash', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const def: ComponentDef = {
      ...base, name: 'boom', label: 'Boom',
      attributes: [{ key: 'name', label: 'Name', type: 'text', validate: () => { throw new Error('kaboom'); } }],
      slots: [{ name: 'body', label: 'Body', kind: 'markdown' }],
    } as ComponentDef;
    const r = await validateComponent(':::boom{name="x"}\nGo.\n:::', def);
    expect(r).toEqual({ ok: true });
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/boom/);
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/name/);
  });

  it('reports the required error before running pattern or validate on an empty value', async () => {
    const def: ComponentDef = {
      ...base, name: 'req', label: 'Req',
      attributes: [{ key: 'name', label: 'Name', type: 'text', required: true, pattern: { source: '^x', message: 'pat' }, validate: () => 'val' }],
      slots: [{ name: 'body', label: 'Body', kind: 'markdown' }],
    } as ComponentDef;
    const r = await validateComponent(':::req\nGo.\n:::', def);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.name).toMatch(/required/i);
  });
});

describe('validateComponent attribute-key detection', () => {
  it('accepts a text attribute value containing an equals sign', async () => {
    const r = await validateComponent(':::link{href="https://x.test/?a=b"}\nGo.\n:::', link);
    expect(r).toEqual({ ok: true });
  });

  it('rejects an unknown attribute that follows a value containing a closing brace', async () => {
    const r = await validateComponent(':::link{href="a}b" bogus="1"}\nGo.\n:::', link);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.bogus).toMatch(/unknown/i);
  });
});
