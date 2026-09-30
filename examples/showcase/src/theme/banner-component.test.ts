import { describe, expect, it } from 'vitest';
import { banner } from './markdown-components.js';
import type { ComponentContext } from '@glw907/cairn-cms';

/** The slice of a component context the banner's `build` reads. */
function contextFor(attributes: Record<string, string>): ComponentContext {
  return {
    attributes: { ...attributes },
    attr: (key) => attributes[key],
    slot: () => [],
    items: () => [],
    node: { type: 'element', tagName: 'div', properties: {}, children: [] },
  };
}

describe('banner component build', () => {
  it('renders the message while the expiry date is ahead', () => {
    const ctx = contextFor({ message: 'The lot reopens in spring.', expires: '2999-01-01' });
    const built = banner.build(ctx);
    expect(JSON.stringify(built)).toContain('The lot reopens in spring.');
    expect(ctx.attributes).toEqual({
      message: 'The lot reopens in spring.',
      expires: '2999-01-01',
    });
  });

  it('keeps an expired message and date out of the markup and the island props', () => {
    const ctx = contextFor({ message: 'Registration has closed.', expires: '2020-01-01' });
    const built = banner.build(ctx);
    const markup = JSON.stringify(built);
    expect(markup).not.toContain('Registration has closed.');
    expect(markup).not.toContain('2020-01-01');
    // The engine serializes ctx.attributes into data-cairn-props after build returns, so a cleared
    // record is what keeps the message and date out of the island boundary.
    expect(ctx.attributes).toEqual({});
  });
});
