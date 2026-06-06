import { describe, it, expect } from 'vitest';
import { createRenderer, defineRegistry, glyph, remarkDirectiveStamp } from '../../lib/index.js';
import * as engine from '../../lib/index.js';
import * as authoring from '../../lib/render/authoring.js';

describe('engine entry render surface', () => {
  it('keeps the core render entry points on the root barrel', () => {
    for (const fn of [createRenderer, defineRegistry, glyph, remarkDirectiveStamp]) {
      expect(typeof fn).toBe('function');
    }
  });

  it('no longer exports the authoring helpers from the root entry', () => {
    for (const name of ['iconSpan', 'cardShell', 'headRow', 'rehypeDispatch']) {
      expect(name in engine).toBe(false);
    }
  });

  it('still hides the internal hast helpers from the root entry', () => {
    for (const name of ['isElement', 'strProp', 'markFirstList']) {
      expect(name in engine).toBe(false);
    }
  });

  it('exposes the authoring toolkit from /render', () => {
    for (const fn of [authoring.iconSpan, authoring.cardShell, authoring.headRow, authoring.isElement, authoring.strAttr]) {
      expect(typeof fn).toBe('function');
    }
  });

  it('omits rehypeDispatch from /render but keeps it reachable from its module', async () => {
    expect('rehypeDispatch' in authoring).toBe(false);
    const dispatch = await import('../../lib/render/rehype-dispatch.js');
    expect(typeof dispatch.rehypeDispatch).toBe('function');
  });

  it('the root createRenderer composes a working pipeline', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    expect(await renderMarkdown('# Hi')).toContain('<h1');
  });
});
