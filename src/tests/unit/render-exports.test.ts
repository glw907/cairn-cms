import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRenderer, defineRegistry, renderGlyph } from '../../lib/index.js';
import * as engine from '../../lib/index.js';

describe('engine entry render surface', () => {
  it('keeps the core render entry points on the root barrel', () => {
    for (const fn of [createRenderer, defineRegistry, renderGlyph]) {
      expect(typeof fn).toBe('function');
    }
  });

  it('omits remarkDirectiveStamp from the root barrel but keeps it reachable from its module', async () => {
    expect('remarkDirectiveStamp' in engine).toBe(false);
    const directives = await import('../../lib/render/remark-directives.js');
    expect(typeof directives.remarkDirectiveStamp).toBe('function');
  });

  it('no longer exports the authoring helpers from the root entry', () => {
    for (const name of ['iconSpan', 'cardShell', 'headRow', 'rehypeDispatch']) {
      expect(name in engine).toBe(false);
    }
  });

  it('still hides the internal hast helpers from the root entry', () => {
    for (const name of ['isElement', 'strProp']) {
      expect(name in engine).toBe(false);
    }
  });

  it('publishes no render subpath; ComponentContext is a root type', () => {
    const { exports } = JSON.parse(readFileSync('package.json', 'utf8')) as { exports: Record<string, unknown> };
    expect('./render' in exports).toBe(false);
  });

  it('omits strAttr from the root entry; the reader moved onto ComponentContext.attr', () => {
    expect('strAttr' in engine).toBe(false);
  });

  it('keeps rehypeDispatch reachable from its module', async () => {
    const dispatch = await import('../../lib/render/rehype-dispatch.js');
    expect(typeof dispatch.rehypeDispatch).toBe('function');
  });

  it('keeps isElement reachable from its module', async () => {
    const dispatch = await import('../../lib/render/rehype-dispatch.js');
    expect(typeof dispatch.isElement).toBe('function');
  });

  it('the root createRenderer composes a working pipeline', async () => {
    const { render } = createRenderer();
    expect(await render({ body: '# Hi' })).toContain('<h1');
  });
});
