import { describe, it, expect, expectTypeOf } from 'vitest';
import { defineAdapter } from '../../lib/content/adapter.js';
import { fields } from '../../lib/content/fields.js';
import { fieldset, type InferFieldset } from '../../lib/content/fieldset.js';
import type { CairnAdapter } from '../../lib/content/types.js';

const adapter = defineAdapter({
  content: {
    posts: {
      dir: 'src/content/posts',
      routing: 'feed',
      fields: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Date' }),
      }),
    },
  },
  backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
  email: { from: 'noreply@test.example' },
  rendering: { render: (md) => md },
});

describe('defineAdapter', () => {
  it('returns the adapter unchanged at runtime', () => {
    expect(adapter.content.posts?.dir).toBe('src/content/posts');
    expect(Object.keys(adapter.content.posts?.fields.fields ?? {})).toEqual(['title', 'date']);
  });

  it('is assignable to CairnAdapter', () => {
    expectTypeOf(adapter).toMatchTypeOf<CairnAdapter>();
  });

  it('preserves the concrete schema type for inference', () => {
    expectTypeOf<InferFieldset<typeof adapter.content.posts.fields>>().toEqualTypeOf<{
      title: string;
      date?: string;
    }>();
  });
});
