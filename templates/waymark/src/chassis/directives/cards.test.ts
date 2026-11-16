import { describe, expect, it } from 'vitest';
import { createRenderer } from '@glw907/cairn-cms';
import { vocabulary } from './vocabulary.js';

const cards = vocabulary.cards();
const renderer = createRenderer({ blocks: [cards] });

const IMAGE = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=720';

/** A cards block holding `items`, one list line each, with an optional opener attribute list. */
function block(items: string[], attrs = ''): string {
  const list = items.length > 0 ? [':::items', ...items.map((item) => `- ${item}`), ':::'] : [];
  return [`::::cards${attrs}`, ...list, '::::'].join('\n');
}

/** The rendered HTML of a cards block. */
async function render(items: string[], attrs = ''): Promise<string> {
  return renderer.render({ body: block(items, attrs) });
}


describe('the cards build', () => {
  it('renders an image, a linked title, and the text that follows', async () => {
    const html = await render([
      `![A trail map](${IMAGE}) [Junior program](/programs/junior) Ages 10 to 16. *Saturdays.*`,
    ]);
    expect(html).toBe(
      '<div class="cards cards-cols-3" role="list" data-rise="0"><div class="cards-item" role="listitem">' +
        `<img src="${IMAGE}" alt="A trail map" class="cards-image">` +
        '<div class="cards-body">' +
        '<p class="cards-title"><a href="/programs/junior">Junior program</a></p>' +
        '<p class="cards-text">Ages 10 to 16. <em>Saturdays.</em></p>' +
        '</div></div></div>',
    );
  });

  it('opens an imageless card among imaged ones on its title, with no image element', async () => {
    const html = await render([
      `![A trail map](${IMAGE}) [Junior program](/programs/junior) Ages 10 to 16.`,
      '[Map night](/map-night) Second Tuesday.',
    ]);
    expect(html.match(/<img/g)).toHaveLength(1);
    expect(html).toContain(
      '<div class="cards-item" role="listitem"><div class="cards-body"><p class="cards-title"><a href="/map-night">',
    );
  });

  it('sets a leading strong run as a plain title and keeps a later link in the text', async () => {
    const html = await render(['**Where we ski** Kincaid Park chalet. [Map](/map)']);
    expect(html).toContain(
      '<p class="cards-title">Where we ski</p>' +
        '<p class="cards-text">Kincaid Park chalet. <a href="/map">Map</a></p>',
    );
  });

  it('gives a card with no link and no strong run no title', async () => {
    const html = await render(['Plain text only, no title.']);
    expect(html).toContain(
      '<div class="cards-body"><p class="cards-text">Plain text only, no title.</p></div>',
    );
    expect(html).not.toContain('cards-title');
  });

  it('renders an image-only card as the image alone', async () => {
    const html = await render([`![A trail map](${IMAGE})`]);
    expect(html).toBe(
      '<div class="cards cards-cols-3" role="list" data-rise="0"><div class="cards-item" role="listitem">' +
        `<img src="${IMAGE}" alt="A trail map" class="cards-image">` +
        '</div></div>',
    );
  });

  it.each([1, 9])('renders one card per item for %i items', async (count) => {
    const items = Array.from({ length: count }, (_, i) => `[Card ${i}](/c/${i}) Text ${i}.`);
    const html = await render(items, '{columns="4"}');
    expect(html.match(/class="cards-item"/g)).toHaveLength(count);
    expect(html).toContain('class="cards cards-cols-4"');
  });

  it.each([
    ['2', 'cards-cols-2'],
    ['4', 'cards-cols-4'],
    ['7', 'cards-cols-3'],
  ])('maps columns="%s" to %s', async (columns, modifier) => {
    const html = await render(['Text.'], `{columns="${columns}"}`);
    expect(html).toContain(`class="cards ${modifier}"`);
  });

  it('lays out three columns when columns is absent', async () => {
    expect(await render(['Text.'])).toContain('class="cards cards-cols-3"');
  });

  it('renders an empty block as a grid with no children', async () => {
    expect(await renderer.render({ body: ':::cards{columns="3"}\n:::' })).toBe(
      '<div class="cards cards-cols-3" role="list" data-rise="0"></div>',
    );
  });
});
