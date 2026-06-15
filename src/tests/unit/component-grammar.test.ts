import { describe, it, expect } from 'vitest';
import { serializeComponent, parseComponent, componentRoundTripSafety } from '../../lib/render/component-grammar.js';
import type { ComponentDef } from '../../lib/render/registry.js';

const base = { build: (n: unknown) => n, description: 'd', use: 'u' };

const card: ComponentDef = {
  ...base, name: 'card', label: 'Card',
  attributes: [{ key: 'icon', label: 'Icon', type: 'icon' }],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline' },
    { name: 'body', label: 'Body', kind: 'markdown' },
  ],
} as ComponentDef;

describe('serializeComponent flat', () => {
  it('emits a title label, an attribute block, and the unmarked body', () => {
    const md = serializeComponent(card, {
      attributes: { icon: 'snowflake' },
      slots: { title: 'Lessons', body: 'All season long.' },
    });
    expect(md).toBe(':::card[Lessons]{icon="snowflake"}\nAll season long.\n:::');
  });

  it('omits an empty attribute and an empty title', () => {
    const md = serializeComponent(card, { attributes: { icon: '' }, slots: { title: '', body: 'Body only.' } });
    expect(md).toBe(':::card\nBody only.\n:::');
  });

  it('entity-encodes a double quote in an attribute value', () => {
    const md = serializeComponent(card, { attributes: { icon: 'a"b' }, slots: { title: '', body: 'x' } });
    expect(md).toBe(':::card{icon="a&quot;b"}\nx\n:::');
  });
});

describe('serializeComponent escaping', () => {
  it('round-trips an attribute value containing a backslash', async () => {
    const values = { attributes: { icon: 'a\\b' }, slots: { title: '', body: 'x' } };
    const md = serializeComponent(card, values);
    await expect(parseComponent(md, card)).resolves.toEqual(values);
  });

  it('round-trips an attribute value containing a backslash then a quote', async () => {
    const values = { attributes: { icon: 'a\\"b' }, slots: { title: '', body: 'x' } };
    const md = serializeComponent(card, values);
    await expect(parseComponent(md, card)).resolves.toEqual(values);
  });

  it('round-trips an attribute value containing a double quote', async () => {
    const values = { attributes: { icon: 'a"b' }, slots: { title: '', body: 'x' } };
    const md = serializeComponent(card, values);
    await expect(parseComponent(md, card)).resolves.toEqual(values);
  });

  it('round-trips an attribute value containing a literal entity-looking string', async () => {
    const values = { attributes: { icon: 'a&quot;b' }, slots: { title: '', body: 'x' } };
    const md = serializeComponent(card, values);
    await expect(parseComponent(md, card)).resolves.toEqual(values);
  });

  it('round-trips a title containing brackets', async () => {
    const values = { attributes: { icon: '' }, slots: { title: 'a [b] c', body: 'x' } };
    const md = serializeComponent(card, values);
    await expect(parseComponent(md, card)).resolves.toEqual(values);
  });

  it('round-trips a title containing an unbalanced bracket without losing the body', async () => {
    const values = { attributes: { icon: '' }, slots: { title: 'a [ b', body: 'x' } };
    const md = serializeComponent(card, values);
    await expect(parseComponent(md, card)).resolves.toEqual(values);
  });

  it('round-trips a markdown body that uses dash bullets without drifting to asterisks', async () => {
    const values = { attributes: { icon: '' }, slots: { title: '', body: '- one\n- two' } };
    const md = serializeComponent(card, values);
    const back = await parseComponent(md, card);
    expect(back.slots.body).toContain('- one');
    expect(back.slots.body).toContain('- two');
    expect(back.slots.body).not.toContain('* ');
  });

  it('round-trips a title containing a link without truncating its markdown', async () => {
    const values = { attributes: { icon: '' }, slots: { title: 'See [the docs](https://x.test)', body: 'x' } };
    const md = serializeComponent(card, values);
    await expect(parseComponent(md, card)).resolves.toEqual(values);
    await expect(componentRoundTripSafety(md, card)).resolves.toEqual({ safe: true });
  });

  it('round-trips a title containing bold without truncating its markdown', async () => {
    const values = { attributes: { icon: '' }, slots: { title: 'A **bold** word', body: 'x' } };
    const md = serializeComponent(card, values);
    await expect(parseComponent(md, card)).resolves.toEqual(values);
    await expect(componentRoundTripSafety(md, card)).resolves.toEqual({ safe: true });
  });

  it('round-trips a body that holds an inline directive without throwing', async () => {
    const values = { attributes: { icon: '' }, slots: { title: '', body: 'See :abbr[HTML] here.' } };
    const md = serializeComponent(card, values);
    const back = await parseComponent(md, card);
    expect(back.slots.body).toContain(':abbr[HTML]');
  });

  it('does not throw when a repeatable slot receives a string instead of an array', () => {
    const md = serializeComponent(cta, {
      attributes: { icon: '' },
      slots: { title: 'T', body: 'B', actions: '' },
    });
    expect(md).not.toContain(':::actions');
  });
});

const cta: ComponentDef = {
  ...base, name: 'cta', label: 'CTA',
  attributes: [{ key: 'icon', label: 'Icon', type: 'icon' }],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline' },
    { name: 'body', label: 'Body', kind: 'markdown' },
    { name: 'actions', label: 'Actions', kind: 'repeatable', itemFields: [{ key: 'text', label: 'Item', type: 'text' }] },
  ],
} as ComponentDef;

describe('serializeComponent nested slots', () => {
  it('uses a four-colon outer fence and nests a repeatable slot as a markdown list', () => {
    const md = serializeComponent(cta, {
      attributes: { icon: 'snowflake' },
      slots: { title: 'Book a lesson', body: 'All season long.', actions: ['Beginner-friendly', 'Gear included'] },
    });
    expect(md).toBe(
      '::::cta[Book a lesson]{icon="snowflake"}\n' +
        'All season long.\n\n' +
        ':::actions\n- Beginner-friendly\n- Gear included\n:::\n' +
        '::::',
    );
  });

  it('omits an empty repeatable slot but still nests when another slot is present', () => {
    const passage: ComponentDef = {
      ...base, name: 'passage', label: 'Passage',
      slots: [
        { name: 'body', label: 'Body', kind: 'markdown' },
        { name: 'aside', label: 'Aside', kind: 'markdown' },
      ],
    } as ComponentDef;
    const md = serializeComponent(passage, { attributes: {}, slots: { body: 'Main.', aside: 'Note.' } });
    expect(md).toBe('::::passage\nMain.\n\n:::aside\nNote.\n:::\n::::');
  });
});

describe('parseComponent round-trips serializeComponent', () => {
  const cases: { def: ComponentDef; values: Parameters<typeof serializeComponent>[1] }[] = [
    { def: card, values: { attributes: { icon: 'snowflake' }, slots: { title: 'Lessons', body: 'All season.' } } },
    { def: card, values: { attributes: { icon: '' }, slots: { title: '', body: 'Body only.' } } },
    { def: cta, values: { attributes: { icon: 'snowflake' }, slots: { title: 'Book', body: 'Soon.', actions: ['One', 'Two'] } } },
  ];
  for (const [i, c] of cases.entries()) {
    it(`recovers values for case ${i}`, async () => {
      const md = serializeComponent(c.def, c.values);
      await expect(parseComponent(md, c.def)).resolves.toEqual(c.values);
    });
  }
});

describe('componentRoundTripSafety', () => {
  it('is safe for a canonical serialized block', async () => {
    const md = serializeComponent(cta, {
      attributes: { icon: 'snowflake' },
      slots: { title: 'Book', body: 'Soon.', actions: ['One', 'Two'] },
    });
    await expect(componentRoundTripSafety(md, cta)).resolves.toEqual({ safe: true });
  });

  it('is safe for an authored-but-equivalent block (different whitespace and formatting)', async () => {
    // Same content as canonical, but hand-typed: extra blank lines, no attribute, a title, and a
    // nested list authored without the canonical spacing. The values it parses to are stable.
    const md = '::::cta[Book]\n\nSoon.\n\n:::actions\n\n- One\n- Two\n\n:::\n\n::::';
    await expect(componentRoundTripSafety(md, cta)).resolves.toEqual({ safe: true });
  });

  it('fails unknown-attribute when the block carries an undeclared attribute key', async () => {
    const md = '::::cta[Book]{icon="snowflake" rogue="x"}\nSoon.\n::::';
    await expect(componentRoundTripSafety(md, cta)).resolves.toEqual({
      safe: false,
      reason: 'unknown-attribute',
    });
  });

  it('fails undeclared-child when the root holds a child container the def does not declare', async () => {
    const md = '::::cta[Book]\nSoon.\n\n:::note\nAn aside the schema never modeled.\n:::\n::::';
    await expect(componentRoundTripSafety(md, cta)).resolves.toEqual({
      safe: false,
      reason: 'undeclared-child',
    });
  });

  it('fails not-idempotent when slot content the form cannot represent stably is present', async () => {
    // A repeatable item is a single string in the form. A multi-paragraph authored item parses to
    // "a\n\nnested para", which re-serializes flat and re-parses to drop the second paragraph, so
    // the round-trip is not idempotent.
    const md = '::::cta[Book]\nSoon.\n\n:::actions\n- a\n\n  nested para\n:::\n::::';
    await expect(componentRoundTripSafety(md, cta)).resolves.toEqual({
      safe: false,
      reason: 'not-idempotent',
    });
  });

  it('fails not-a-component when no matching component is present', async () => {
    await expect(componentRoundTripSafety('Just some prose.\n', cta)).resolves.toEqual({
      safe: false,
      reason: 'not-a-component',
    });
  });
});
