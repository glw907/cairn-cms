// The compile-time half of the adapter's config keys. `npm run check` is the assertion here: each
// `@ts-expect-error` turns into an unused-directive error if the keyed type goes away. The runtime
// assertions only keep the calls honest, and the throws for an untyped caller have their own tests.
import { describe, expect, expectTypeOf, it } from 'vitest';
import { defineAdapter } from '../../lib/content/adapter.js';
import { defineConcept } from '../../lib/content/concepts.js';
import { defineFieldset } from '../../lib/content/fieldset.js';
import { fields } from '../../lib/content/fields.js';
import type { AiPosture, CairnAdapter } from '../../lib/content/types.js';

const posts = defineConcept({
  dir: 'src/content/posts',
  fields: defineFieldset({ title: fields.text({ label: 'Title' }) }),
  summaryFields: ['title'],
});

// The required keys this file never inspects. Only `rendering` is read, by the island check.
const base = {
  backend: {},
  email: {},
  rendering: {},
} as unknown as Pick<CairnAdapter, 'backend' | 'email' | 'rendering'>;

const cairn = defineAdapter({ ...base, content: { posts } });

describe('defineConcept', () => {
  it('accepts a declared summaryFields key and refuses an unknown one', () => {
    expect(posts.summaryFields).toEqual(['title']);
    defineConcept({
      dir: 'src/content/pages',
      fields: defineFieldset({ title: fields.text({ label: 'Title' }) }),
      // @ts-expect-error 'nope' is not a declared field
      summaryFields: ['nope'],
    });
  });
});

describe('defineAdapter', () => {
  it('reads an unset optional key without a cast', () => {
    expectTypeOf(cairn.aiPosture).toEqualTypeOf<AiPosture | undefined>();
    expect(cairn.aiPosture).toBeUndefined();
  });

  it('keeps keyed access to a concept as its literal type', () => {
    expectTypeOf(cairn.content.posts.dir).toEqualTypeOf<'src/content/posts'>();
    expect(cairn.content.posts.dir).toBe('src/content/posts');
  });

  it('accepts a concept id and an engine screen, top-level and inside a section', () => {
    const adapter = defineAdapter({
      ...base,
      content: { posts },
      editor: {
        navLayout: [
          { screen: 'posts', label: 'Stories' },
          { label: 'Tools', children: [{ screen: 'media' }, { label: 'Reports', icon: 'table', href: '/admin/reports' }] },
        ],
      },
    });
    expect(adapter.editor.navLayout).toHaveLength(2);
  });

  it('refuses a misspelled screen at the top level', () => {
    defineAdapter({
      ...base,
      content: { posts },
      editor: {
        // @ts-expect-error 'postz' is neither a declared concept nor an engine screen
        navLayout: [{ screen: 'postz' }],
      },
    });
  });

  it('refuses a misspelled screen inside a section', () => {
    defineAdapter({
      ...base,
      content: { posts },
      editor: {
        // @ts-expect-error 'postz' is neither a declared concept nor an engine screen
        navLayout: [{ label: 'Content', children: [{ screen: 'postz' }] }],
      },
    });
  });
});
