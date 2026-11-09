import { describe, it, expect } from 'vitest';
import { defaultSchema } from 'hast-util-sanitize';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
import { buildSanitizeSchema } from '../../lib/render/sanitize-schema.js';

const render = (body: string) => createRenderer().render({ body });

/** The value of the first attribute `name` on the first tag that carries `marker`. */
function attrOf(html: string, marker: string, name: string): string | undefined {
  const tag = html.match(new RegExp(`<a[^>]*${marker}[^>]*>`))?.[0];
  return tag?.match(new RegExp(`${name}="([^"]*)"`))?.[1];
}

describe('footnote links after the sanitize step (#387)', () => {
  const body = 'Text[^1].\n\n[^1]: The note.\n';

  it('points the reference at the definition id', async () => {
    const html = await render(body);
    const href = attrOf(html, 'data-footnote-ref', 'href');
    const defId = html.match(/<li id="([^"]*)"/)?.[1];
    expect(defId).toBeTruthy();
    expect(href).toBe(`#${defId}`);
  });

  it('points the backref at the reference id', async () => {
    const html = await render(body);
    const href = attrOf(html, 'data-footnote-backref', 'href');
    const refId = attrOf(html, 'data-footnote-ref', 'id');
    expect(refId).toBeTruthy();
    expect(href).toBe(`#${refId}`);
  });

  it('still prefixes raw author ids and names', async () => {
    const html = await render('<p id="x">a</p>\n\n<p id="fn-1">b</p>\n\n<a name="x">c</a>\n');
    expect(html).toContain('id="user-content-x"');
    expect(html).toContain('id="user-content-fn-1"');
    expect(html).toContain('name="user-content-x"');
  });

  it('leaves a raw in-page link outside a footnote untouched', async () => {
    const html = await render('<a href="#fn-1">jump</a>\n');
    expect(html).toContain('href="#fn-1"');
  });

  it('keeps the sanitize schema clobber list and prefix at the defaults', () => {
    const schema = buildSanitizeSchema(defineRegistry({ blocks: [] }));
    expect(schema.clobber).toEqual(defaultSchema.clobber);
    expect(schema.clobberPrefix).toEqual(defaultSchema.clobberPrefix);
  });
});
