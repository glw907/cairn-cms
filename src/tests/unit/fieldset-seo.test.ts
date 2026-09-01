import { describe, it, expect } from 'vitest';
import { defineFieldset, fields } from '../../lib/index.js';

describe('fieldset SEO-image guard', () => {
  it('throws when two image fields both set seo: true', () => {
    expect(() =>
      defineFieldset({
        hero: fields.image({ label: 'Hero', seo: true }),
        cover: fields.image({ label: 'Cover', seo: true }),
      }),
    ).toThrow(/at most one SEO image/i);
  });

  it('names both offending keys in the error', () => {
    expect(() =>
      defineFieldset({
        hero: fields.image({ label: 'Hero', seo: true }),
        cover: fields.image({ label: 'Cover', seo: true }),
      }),
    ).toThrow(/"hero".*"cover"/);
  });

  it('allows one seo image plus other un-flagged images', () => {
    expect(() =>
      defineFieldset({
        hero: fields.image({ label: 'Hero', seo: true }),
        thumb: fields.image({ label: 'Thumb' }),
      }),
    ).not.toThrow();
  });

  it('allows zero seo images', () => {
    expect(() =>
      defineFieldset({
        thumb: fields.image({ label: 'Thumb' }),
      }),
    ).not.toThrow();
  });

  it('still allows one top-level seo image', () => {
    expect(() => defineFieldset({ hero: fields.image({ label: 'Hero', seo: true }) })).not.toThrow();
  });

  it('forbids an seo image inside an object (deferred this phase)', () => {
    expect(() => defineFieldset({ box: fields.object({ fields: { pic: fields.image({ label: 'Pic', seo: true }) } }) })).toThrow(/seo/i);
  });

  it('forbids an seo image inside an array', () => {
    expect(() => defineFieldset({ gallery: fields.array(fields.image({ label: 'Shot', seo: true })) })).toThrow(/seo/i);
  });
});

describe('fieldset container-nesting guard', () => {
  it('rejects an object nested in an object', () => {
    expect(() => defineFieldset({
      a: fields.object({ fields: { b: fields.object({ fields: { c: fields.text({ label: 'C' }) } }) } }),
    })).toThrow(/one level|leaf field/i);
  });

  it('rejects an array of arrays', () => {
    expect(() => defineFieldset({ a: fields.array(fields.array(fields.text({ label: 'T' }))) })).toThrow(/leaf or a flat object/i);
  });

  it('rejects a reference inside an object (deferred this phase)', () => {
    expect(() => defineFieldset({
      a: fields.object({ fields: { author: fields.reference({ concept: 'pages', label: 'Author' }) } }),
    })).toThrow(/reference/i);
  });

  it('rejects a field key containing a dot', () => {
    expect(() => defineFieldset({ 'og.image': fields.text({ label: 'X' }) })).toThrow(/dot/i);
  });

  it('still accepts a top-level array of references', () => {
    expect(() => defineFieldset({ related: fields.array(fields.reference({ concept: 'posts', label: '' })) })).not.toThrow();
  });
});
