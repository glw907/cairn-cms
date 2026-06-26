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
});
