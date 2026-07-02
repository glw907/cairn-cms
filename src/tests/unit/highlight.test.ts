import { describe, test, expect } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline.js';

const { renderMarkdown } = createRenderer();

describe('renderMarkdown: Shiki code-fence highlighting', () => {
  test('fenced code is highlighted at build time with semantic token classes', async () => {
    const html = await renderMarkdown('```js\nconst x = 1;\n```');
    // Shiki emits a <pre class="shiki ..."> wrapper at render time.
    expect(html).toMatch(/<pre[^>]*class="[^"]*shiki/);
    // Tokens carry the cairn-tok-* ramp classes, so the site theme colors them.
    expect(html).toMatch(/class="[^"]*cairn-tok-/);
    // The output is class-only: no inline style on the pre, code, or any token span. cairn is
    // class-driven, so the highlighted block survives the sink guard with no style to strip.
    expect(html).not.toMatch(/<(pre|code|span)[^>]*\sstyle=/);
    // No literal hex color is baked into the output; the colors live in the theme, not the markup.
    expect(html).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  test('an unknown-language fence does not throw and still yields a <pre>', async () => {
    const html = await renderMarkdown('```nosuchlang\nplain text\n```');
    expect(html).toMatch(/<pre/);
    expect(html).toContain('plain text');
  });

  test('a bare fence with no language does not throw and still yields a <pre>', async () => {
    const html = await renderMarkdown('```\njust text\n```');
    expect(html).toMatch(/<pre/);
    expect(html).toContain('just text');
  });
});
