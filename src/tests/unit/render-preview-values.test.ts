import { describe, it, expect } from 'vitest';
import {
  emptyValues,
  previewValues,
  type ComponentDef,
} from '../../lib/render/registry.js';

const stub = (): ComponentDef['build'] => () => ({
  type: 'element',
  tagName: 'div',
  properties: {},
  children: [],
});

describe('ComponentDef picker fields', () => {
  it('accepts the new optional fields and a structured preview sample', () => {
    const def: ComponentDef = {
      name: 'callout',
      label: 'Callout',
      description: 'A highlighted note',
      icon: 'info',
      group: 'Content',
      hidden: false,
      build: stub(),
      preview: {
        attributes: { tone: 'note' },
        slots: { title: 'Heads up', body: 'A sample body' },
      },
    };
    expect(def.icon).toBe('info');
    expect(def.group).toBe('Content');
    expect(def.hidden).toBe(false);
    expect(def.preview?.attributes).toEqual({ tone: 'note' });
  });

  it('leaves the new fields undefined when omitted', () => {
    const def: ComponentDef = {
      name: 'plain',
      label: 'Plain',
      description: '',
      build: stub(),
    };
    expect(def.icon).toBeUndefined();
    expect(def.group).toBeUndefined();
    expect(def.hidden).toBeUndefined();
    expect(def.preview).toBeUndefined();
  });

  it('accepts pattern and validate on an attribute field', () => {
    const def: ComponentDef = {
      name: 'link',
      label: 'Link',
      description: '',
      build: stub(),
      attributes: [
        {
          key: 'href',
          label: 'URL',
          type: 'text',
          pattern: { source: '^https?://', message: 'Must be an http(s) URL' },
          validate: (value, all) =>
            value === all.attributes.href ? null : 'mismatch',
        },
      ],
    };
    const field = def.attributes![0];
    expect(field.pattern?.source).toBe('^https?://');
    expect(field.validate?.('x', emptyValues(def))).toBe('mismatch');
  });

  it('accepts itemLabel on a repeatable slot', () => {
    const def: ComponentDef = {
      name: 'list',
      label: 'List',
      description: '',
      build: stub(),
      slots: [
        {
          name: 'items',
          label: 'Item',
          kind: 'repeatable',
          itemLabel: (item, index) => String(item.title ?? `Item ${index + 1}`),
        },
      ],
    };
    expect(def.slots![0].itemLabel?.({ title: 'First' }, 0)).toBe('First');
    expect(def.slots![0].itemLabel?.({}, 2)).toBe('Item 3');
  });
});

describe('previewValues', () => {
  it('returns emptyValues output when the def declares no preview', () => {
    const def: ComponentDef = {
      name: 'plain',
      label: 'Plain',
      description: '',
      build: stub(),
      attributes: [{ key: 'tone', label: 'Tone', type: 'text', default: 'note' }],
      slots: [{ name: 'body', label: 'Body', kind: 'markdown' }],
    };
    expect(previewValues(def)).toEqual(emptyValues(def));
  });

  it('overlays the declared preview attributes and slots over the seeded base', () => {
    const def: ComponentDef = {
      name: 'callout',
      label: 'Callout',
      description: '',
      build: stub(),
      attributes: [
        { key: 'tone', label: 'Tone', type: 'text', default: 'note' },
        { key: 'dismissible', label: 'Dismissible', type: 'boolean' },
      ],
      slots: [
        { name: 'title', label: 'Title', kind: 'inline' },
        { name: 'body', label: 'Body', kind: 'markdown' },
      ],
      preview: {
        attributes: { tone: 'warning' },
        slots: { title: 'Heads up' },
      },
    };
    const values = previewValues(def);
    // overlaid
    expect(values.attributes.tone).toBe('warning');
    expect(values.slots.title).toBe('Heads up');
    // untouched seeded base
    expect(values.attributes.dismissible).toBe(false);
    expect(values.slots.body).toBe('');
  });

  it('carries a repeatable slot value through from preview.slots', () => {
    const def: ComponentDef = {
      name: 'steps',
      label: 'Steps',
      description: '',
      build: stub(),
      slots: [{ name: 'items', label: 'Item', kind: 'repeatable' }],
      preview: {
        slots: { items: ['One', 'Two'] },
      },
    };
    expect(previewValues(def).slots.items).toEqual(['One', 'Two']);
  });

  it('does not mutate the emptyValues base', () => {
    const def: ComponentDef = {
      name: 'callout',
      label: 'Callout',
      description: '',
      build: stub(),
      attributes: [{ key: 'tone', label: 'Tone', type: 'text', default: 'note' }],
      preview: { attributes: { tone: 'warning' } },
    };
    previewValues(def);
    expect(emptyValues(def).attributes.tone).toBe('note');
  });
});
