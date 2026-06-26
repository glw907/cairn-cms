import { describe, it, expectTypeOf } from 'vitest';
import { fields } from '../../lib/content/fields.js';
import { fieldset, type InferFieldset } from '../../lib/content/fieldset.js';

const fs = fieldset({
  title:  fields.text({ label: 'Title', required: true }),
  count:  fields.number({ label: 'Count' }),
  status: fields.select({ label: 'Status', options: ['draft', 'published'] }),
  tags:   fields.multiselect({ label: 'Tags', options: ['a', 'b'] }),
});
type T = InferFieldset<typeof fs>;

describe('Infer', () => {
  it('maps required/optional and value types', () => {
    expectTypeOf<T>().toEqualTypeOf<{
      title: string;
      count?: number;
      status?: 'draft' | 'published';
      tags?: ('a' | 'b')[];
    }>();
  });
});
