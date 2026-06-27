import { describe, it, expect } from 'vitest';
import { fieldset, fields } from '../../lib/index.js';

describe('fieldset SEO-image guard', () => {
  it('throws when two image fields both set seo: true', () => {
    expect(() =>
      fieldset({
        hero: fields.image({ label: 'Hero', seo: true }),
        cover: fields.image({ label: 'Cover', seo: true }),
      }),
    ).toThrow(/at most one SEO image/i);
  });

  it('names both offending keys in the error', () => {
    expect(() =>
      fieldset({
        hero: fields.image({ label: 'Hero', seo: true }),
        cover: fields.image({ label: 'Cover', seo: true }),
      }),
    ).toThrow(/"hero".*"cover"/);
  });

  it('allows one seo image plus other un-flagged images', () => {
    expect(() =>
      fieldset({
        hero: fields.image({ label: 'Hero', seo: true }),
        thumb: fields.image({ label: 'Thumb' }),
      }),
    ).not.toThrow();
  });

  it('allows zero seo images', () => {
    expect(() =>
      fieldset({
        thumb: fields.image({ label: 'Thumb' }),
      }),
    ).not.toThrow();
  });

  it('still allows one top-level seo image', () => {
    expect(() => fieldset({ hero: fields.image({ label: 'Hero', seo: true }) })).not.toThrow();
  });

  it('forbids an seo image inside an object (deferred this phase)', () => {
    expect(() => fieldset({ box: fields.object({ fields: { pic: fields.image({ label: 'Pic', seo: true }) } }) })).toThrow(/seo/i);
  });

  it('forbids an seo image inside an array', () => {
    expect(() => fieldset({ gallery: fields.array(fields.image({ label: 'Shot', seo: true })) })).toThrow(/seo/i);
  });

  it('still rejects two top-level seo images', () => {
    expect(() => fieldset({
      a: fields.image({ label: 'A', seo: true }),
      b: fields.image({ label: 'B', seo: true }),
    })).toThrow(/at most one/i);
  });
});

describe('fieldset container-nesting guard', () => {
  it('rejects an object nested in an object', () => {
    expect(() => fieldset({
      a: fields.object({ fields: { b: fields.object({ fields: { c: fields.text({ label: 'C' }) } }) } }),
    })).toThrow(/one level|leaf field/i);
  });

  it('rejects an array of arrays', () => {
    expect(() => fieldset({ a: fields.array(fields.array(fields.text({ label: 'T' }))) })).toThrow(/leaf or a flat object/i);
  });

  it('rejects a reference inside an object (deferred this phase)', () => {
    expect(() => fieldset({
      a: fields.object({ fields: { author: fields.reference({ concept: 'pages', label: 'Author' }) } }),
    })).toThrow(/reference/i);
  });

  it('rejects a field key containing a dot', () => {
    expect(() => fieldset({ 'og.image': fields.text({ label: 'X' }) })).toThrow(/dot/i);
  });

  it('still accepts a top-level array of references', () => {
    expect(() => fieldset({ related: fields.array(fields.reference({ concept: 'posts', label: '' })) })).not.toThrow();
  });
});
