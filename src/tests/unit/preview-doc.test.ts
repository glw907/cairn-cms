import { describe, it, expect } from 'vitest';
import { buildPreviewDoc, previewDevices } from '../../lib/components/preview-doc.js';
import type { PreviewConfig } from '../../lib/content/types.js';

const preview: PreviewConfig = {
  stylesheets: ['/assets/site.css', 'https://cdn.example/theme.css'],
  bodyClass: 'site-body',
  containerClass: 'prose mx-auto',
};

describe('buildPreviewDoc', () => {
  it('links every stylesheet in the order the adapter names them', () => {
    const doc = buildPreviewDoc('<p>hi</p>', preview);
    const first = doc.indexOf('<link rel="stylesheet" href="/assets/site.css">');
    const second = doc.indexOf('<link rel="stylesheet" href="https://cdn.example/theme.css">');
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
  });

  it('places the pre-site reset before the stylesheet links so the site CSS wins', () => {
    const doc = buildPreviewDoc('<p>hi</p>', preview);
    const reset = doc.indexOf('<style>body{margin:0;background:#fff}</style>');
    const link = doc.indexOf('<link rel="stylesheet"');
    expect(reset).toBeGreaterThan(-1);
    expect(link).toBeGreaterThan(reset);
  });

  it('carries the charset and viewport metas under a doctype', () => {
    const doc = buildPreviewDoc('', preview);
    expect(doc.startsWith('<!doctype html>')).toBe(true);
    expect(doc).toContain('<meta charset="utf-8">');
    expect(doc).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
  });

  it('applies bodyClass to the body and wraps the html in the container class', () => {
    const doc = buildPreviewDoc('<p>hi</p>', preview);
    expect(doc).toContain('<body class="site-body">');
    expect(doc).toContain('<div class="prose mx-auto"><p>hi</p></div>');
  });

  it('renders the html bare without a containerClass and a plain body without a bodyClass', () => {
    const doc = buildPreviewDoc('<p>hi</p>', { stylesheets: ['/site.css'] });
    expect(doc).toContain('<body>');
    expect(doc).toContain('<p>hi</p>');
    expect(doc).not.toContain('<div class=');
  });

  it('renders a styleless document for a site without the preview knob', () => {
    const doc = buildPreviewDoc('<p>hi</p>', null);
    expect(doc).not.toContain('<link');
    expect(doc).toContain('<body>');
    expect(doc).toContain('<p>hi</p>');
  });

  it('escapes attribute values without touching the already-sanitized html', () => {
    const doc = buildPreviewDoc('<p class="keep">"quotes" stay</p>', {
      stylesheets: ['/a.css?x="y"&z=1'],
      bodyClass: 'a"b',
      containerClass: 'c<d',
    });
    expect(doc).toContain('href="/a.css?x=&quot;y&quot;&amp;z=1"');
    expect(doc).toContain('class="a&quot;b"');
    expect(doc).toContain('class="c&lt;d"');
    // The rendered html comes from the floored pipeline already sanitized; it embeds as-is.
    expect(doc).toContain('<p class="keep">"quotes" stay</p>');
  });
});

describe('previewDevices', () => {
  it('offers the four locked widths in menu order', () => {
    expect(previewDevices.map((d) => [d.id, d.label, d.width])).toEqual([
      ['desktop', 'Desktop', null],
      ['tablet', 'Tablet', 768],
      ['phone', 'Phone', 390],
      ['small', 'Small phone', 320],
    ]);
  });
});
