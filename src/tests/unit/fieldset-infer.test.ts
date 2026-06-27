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

  it('infers an image field as an optional nested object', () => {
    const withHero = fieldset({
      title: fields.text({ label: 'Title', required: true }),
      image: fields.image({ label: 'Hero' }),
    });
    expectTypeOf<InferFieldset<typeof withHero>>().toEqualTypeOf<{
      title: string;
      image?: { src: string; alt: string; caption?: string; decorative?: boolean };
    }>();
  });

  it('infers a reference as string and an array(reference) as an optional string[]', () => {
    const withRefs = fieldset({
      author: fields.reference({ concept: 'pages', label: 'Author', required: true }),
      related: fields.array(fields.reference({ concept: 'posts', label: 'Post' }), { label: 'Related' }),
    });
    expectTypeOf<InferFieldset<typeof withRefs>>().toEqualTypeOf<{
      author: string;
      related?: string[];
    }>();
  });

  it('infers a flat object as a record of its leaf value types', () => {
    const fs = fieldset({
      address: fields.object({ fields: { street: fields.text({ label: 'Street', required: true }), zip: fields.text({ label: 'Zip' }) } }),
    });
    expectTypeOf<InferFieldset<typeof fs>>().toEqualTypeOf<{ address?: { street: string; zip?: string } }>();
  });

  it('infers an array of flat objects', () => {
    const fs = fieldset({
      faq: fields.array(fields.object({ fields: { q: fields.text({ label: 'Q', required: true }), a: fields.textarea({ label: 'A' }) } }), { label: 'FAQ' }),
    });
    expectTypeOf<InferFieldset<typeof fs>>().toEqualTypeOf<{ faq?: { q: string; a?: string }[] }>();
  });

  it('infers an array of a non-reference leaf', () => {
    const fs = fieldset({ aliases: fields.array(fields.text({ label: 'Alias' }), { label: 'Aliases' }) });
    expectTypeOf<InferFieldset<typeof fs>>().toEqualTypeOf<{ aliases?: string[] }>();
  });

  it('preserves a nested literal option union and a top-level object label', () => {
    const fs = fieldset({
      meta: fields.object({ label: 'Meta', fields: { kind: fields.select({ label: 'Kind', options: ['a', 'b'] }) } }),
    });
    expectTypeOf<InferFieldset<typeof fs>>().toEqualTypeOf<{ meta?: { kind?: 'a' | 'b' } }>();
  });
});
