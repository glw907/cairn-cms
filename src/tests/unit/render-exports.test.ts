import { describe, it, expect } from 'vitest';
import {
  createRenderer,
  defineRegistry,
  glyph,
  splitHead,
  cardShell,
  markFirstList,
  iconSpan,
  strProp,
  isElement,
  remarkDirectiveStamp,
  rehypeDispatch,
} from '../../lib/index.js';

describe('engine entry render surface', () => {
  it('re-exports the render machinery the consumer sites import', () => {
    for (const fn of [
      createRenderer,
      defineRegistry,
      glyph,
      splitHead,
      cardShell,
      markFirstList,
      iconSpan,
      strProp,
      isElement,
      remarkDirectiveStamp,
      rehypeDispatch,
    ]) {
      expect(typeof fn).toBe('function');
    }
  });

  it('the re-exported createRenderer composes a working pipeline', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    expect(await renderMarkdown('# Hi')).toContain('<h1');
  });
});
