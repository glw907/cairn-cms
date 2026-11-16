import { describe, expect, it } from 'vitest';
import { splitHomeBanner } from './home-split.js';

const BANNER = '<div class="x" data-cairn-island="banner" data-cairn-props="{&#x22;message&#x22;:&#x22;Hi&#x22;}"><div class="banner">Hi</div></div>';

describe('splitHomeBanner', () => {
  it('lifts a leading banner and returns the rest', () => {
    const split = splitHomeBanner(`${BANNER}\n<p>Body</p>`);
    expect(split.banner).toBe(BANNER);
    expect(split.rest).toBe('<p>Body</p>');
  });

  it('returns a body with no leading banner whole', () => {
    const body = `<p>Body</p>${BANNER}`;
    expect(splitHomeBanner(body)).toEqual({ banner: '', rest: body });
  });

  it('returns a banner that never closes whole', () => {
    const body = '<div data-cairn-island="banner"><div>';
    expect(splitHomeBanner(body)).toEqual({ banner: '', rest: body });
  });

  it('does not end the banner at a </div> typed inside a quoted attribute value', () => {
    const attack = '<div data-cairn-island="banner" data-cairn-props="{&#x22;message&#x22;:&#x22;Sale > </div><img src=x onerror=alert(1)>&#x22;}"><div class="banner">Sale</div></div>';
    const split = splitHomeBanner(`${attack}<p>Body</p>`);
    expect(split.banner).toBe(attack);
    expect(split.rest).toBe('<p>Body</p>');
  });

  it('steps over a </div> in another tag attribute', () => {
    const banner = '<div data-cairn-island="banner"><p title="a > </div>">x</p></div>';
    expect(splitHomeBanner(`${banner}<p>Body</p>`).banner).toBe(banner);
  });
});
