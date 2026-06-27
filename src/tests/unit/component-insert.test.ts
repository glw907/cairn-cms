import { describe, it, expect } from 'vitest';
import { buildComponentInsert } from '../../lib/render/component-insert.js';
import { defineComponent } from '../../lib/render/registry.js';
import { fields } from '../../lib/content/fields.js';

const base = { build: () => ({ type: 'element' as const, tagName: 'div', properties: {}, children: [] }), description: 'd', use: 'u' };
const callout = defineComponent({
  ...base, name: 'callout', label: 'Callout',
  attributes: { tone: fields.select({ label: 'Tone', required: true, options: ['note', 'warning'] }) },
  slots: [{ name: 'title', label: 'Title', kind: 'inline', required: true }, { name: 'body', label: 'Body', kind: 'markdown' }],
});

describe('buildComponentInsert', () => {
  it('returns serialized markdown when the values are valid', async () => {
    const r = await buildComponentInsert(callout, { attributes: { tone: 'note' }, slots: { title: 'Heads up', body: 'Read this.' } });
    expect(r).toEqual({ ok: true, markdown: ':::callout[Heads up]{tone="note"}\nRead this.\n:::' });
  });

  it('returns field errors when a required field is empty', async () => {
    const r = await buildComponentInsert(callout, { attributes: { tone: '' }, slots: { title: '', body: 'x' } });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.tone).toMatch(/required/i);
      expect(r.errors.title).toMatch(/required/i);
    }
  });
});
