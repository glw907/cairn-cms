import { describe, it, expect } from 'vitest';
import {
  createRenderer,
  defineRegistry,
  glyph,
  cardShell,
  markFirstList,
  iconSpan,
  strProp,
  isElement,
  remarkDirectiveStamp,
  rehypeDispatch,
} from '../../lib/index.js';
import * as engine from '../../lib/index.js';

describe('engine entry render surface', () => {
  it('re-exports the render machinery the consumer sites import', () => {
    for (const fn of [
      createRenderer,
      defineRegistry,
      glyph,
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

  it('no longer exports the retired splitHead heading-sniffing helper', () => {
    expect('splitHead' in engine).toBe(false);
  });

  it('the re-exported createRenderer composes a working pipeline', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    expect(await renderMarkdown('# Hi')).toContain('<h1');
  });
});
