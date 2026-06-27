import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateComponent } from '../../lib/render/component-validate.js';
import { defineComponent } from '../../lib/render/registry.js';
import { fields } from '../../lib/content/fields.js';

const base = { build: () => ({ type: 'element' as const, tagName: 'div', properties: {}, children: [] }), description: 'd', use: 'u' };
const alert = defineComponent({
  ...base, name: 'alert', label: 'Alert',
  attributes: { role: fields.select({ label: 'Role', required: true, options: ['info', 'warning'] }) },
  slots: [{ name: 'body', label: 'Body', kind: 'markdown', required: true }],
});

describe('validateComponent', () => {
  it('accepts a well-formed directive', async () => {
    await expect(validateComponent(':::alert{role="warning"}\nWatch out.\n:::', alert)).resolves.toEqual({ ok: true });
  });

  it('rejects a value outside the select options', async () => {
    const r = await validateComponent(':::alert{role="danger"}\nx\n:::', alert);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.role).toMatch(/unknown value/i);
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

const link = defineComponent({
  ...base, name: 'link', label: 'Link',
  attributes: { href: fields.text({ label: 'Href', required: true }) },
  slots: [{ name: 'body', label: 'Body', kind: 'markdown', required: true }],
});

const patterned = defineComponent({
  ...base, name: 'patterned', label: 'Patterned',
  attributes: { href: fields.text({ label: 'Href', pattern: '^https://' }) },
  slots: [{ name: 'body', label: 'Body', kind: 'markdown' }],
});

describe('validateComponent pattern', () => {
  it('rejects a non-empty value that does not match the pattern', async () => {
    const r = await validateComponent(':::patterned{href="ftp://x.test"}\nGo.\n:::', patterned);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.href).toMatch(/not in the expected format/i);
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
    const def = defineComponent({
      ...base, name: 'cv', label: 'CV',
      attributes: { name: fields.text({ label: 'Name' }) },
      behavior: { name: { validate: () => 'No good.' } },
      slots: [{ name: 'body', label: 'Body', kind: 'markdown' }],
    });
    const r = await validateComponent(':::cv{name="x"}\nGo.\n:::', def);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.name).toBe('No good.');
  });

  it('treats a null return as valid', async () => {
    const def = defineComponent({
      ...base, name: 'cv', label: 'CV',
      attributes: { name: fields.text({ label: 'Name' }) },
      behavior: { name: { validate: () => null } },
      slots: [{ name: 'body', label: 'Body', kind: 'markdown' }],
    });
    const r = await validateComponent(':::cv{name="x"}\nGo.\n:::', def);
    expect(r).toEqual({ ok: true });
  });

  it('passes the value and the sibling record to the validator', async () => {
    const seen: Array<unknown> = [];
    const def = defineComponent({
      ...base, name: 'cv', label: 'CV',
      attributes: { min: fields.text({ label: 'Min' }), max: fields.text({ label: 'Max' }) },
      behavior: {
        max: {
          validate: (value, siblings) => {
            seen.push(value, siblings);
            return Number(value) < Number(siblings.min) ? 'Max below min.' : null;
          },
        },
      },
      slots: [{ name: 'body', label: 'Body', kind: 'markdown' }],
    });
    const r = await validateComponent(':::cv{min="5" max="3"}\nGo.\n:::', def);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.max).toBe('Max below min.');
    expect(seen[0]).toBe('3');
    expect((seen[1] as Record<string, unknown>).min).toBe('5');
  });

  it('treats a throwing validator as valid and does not crash', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const def = defineComponent({
      ...base, name: 'boom', label: 'Boom',
      attributes: { name: fields.text({ label: 'Name' }) },
      behavior: { name: { validate: () => { throw new Error('kaboom'); } } },
      slots: [{ name: 'body', label: 'Body', kind: 'markdown' }],
    });
    const r = await validateComponent(':::boom{name="x"}\nGo.\n:::', def);
    expect(r).toEqual({ ok: true });
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/name/);
  });

  it('reports the required error before running pattern or validate on an empty value', async () => {
    const def = defineComponent({
      ...base, name: 'req', label: 'Req',
      attributes: { name: fields.text({ label: 'Name', required: true, pattern: '^x' }) },
      behavior: { name: { validate: () => 'val' } },
      slots: [{ name: 'body', label: 'Body', kind: 'markdown' }],
    });
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

describe('validateComponent attribute vocabulary', () => {
  const counted = defineComponent({
    ...base, name: 'counted', label: 'Counted',
    attributes: { count: fields.number({ label: 'Count', min: 1 }) },
    slots: [{ name: 'body', label: 'Body', kind: 'markdown' }],
  });

  it('rejects a non-numeric value on a number attribute', async () => {
    const r = await validateComponent(':::counted{count="abc"}\nGo.\n:::', counted);
    expect(r.ok).toBe(false);
  });

  it('rejects a number attribute below its minimum', async () => {
    const r = await validateComponent(':::counted{count="0"}\nGo.\n:::', counted);
    expect(r.ok).toBe(false);
  });

  it('accepts a number attribute within its bound', async () => {
    const r = await validateComponent(':::counted{count="3"}\nGo.\n:::', counted);
    expect(r).toEqual({ ok: true });
  });
});
