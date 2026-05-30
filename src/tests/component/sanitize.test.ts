import { describe, it, expect } from 'vitest';
import { sanitizePreviewHtml } from '../../lib/render/sanitize.js';

describe('sanitizePreviewHtml', () => {
  it('keeps ordinary formatting', async () => {
    expect(await sanitizePreviewHtml('<p>Hello <strong>world</strong></p>')).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('strips a script element', async () => {
    expect(await sanitizePreviewHtml('<p>ok</p><script>alert(1)<\/script>')).not.toContain('alert');
  });

  it('strips an inline event handler', async () => {
    expect(await sanitizePreviewHtml('<img src=x onerror="alert(1)">')).not.toContain('onerror');
  });

  it('strips a javascript: link target but keeps the text', async () => {
    const out = await sanitizePreviewHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('click');
  });

  it('adds rel="noopener noreferrer" to target="_blank" anchors', async () => {
    const out = await sanitizePreviewHtml('<a href="https://x.test" target="_blank">x</a>');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('x');
  });
});
