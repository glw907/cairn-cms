import { describe, it, expect } from 'vitest';
import { htmlToMarkdown } from '../../lib/components/paste-html-to-markdown.js';

describe('htmlToMarkdown', () => {
  it('converts a heading, bold, italic, and a link the way a web page pastes them', () => {
    const html =
      '<article><h2>Trail notes</h2><p>Some <strong>strong</strong> and <em>emphasis</em> text with a ' +
      '<a href="https://example.com/route">route link</a>.</p><ul><li>Water</li><li>Snacks</li></ul></article>';
    const markdown = htmlToMarkdown(html);
    expect(markdown).toContain('## Trail notes');
    expect(markdown).toContain('**strong**');
    expect(markdown).toContain('_emphasis_');
    expect(markdown).toContain('[route link](https://example.com/route)');
    expect(markdown).toContain('- Water');
    expect(markdown).toContain('- Snacks');
  });

  it('converts a numbered list and semantic bold/italic the way Word pastes them', () => {
    const html =
      '<p class=MsoNormal><b>Bold</b> and <i>italic</i> and a ' +
      '<a href="https://example.com">link</a>.</p>' +
      '<h1>Heading One</h1>' +
      '<ol><li>First step</li><li>Second step</li></ol>';
    const markdown = htmlToMarkdown(html);
    expect(markdown).toContain('**Bold**');
    expect(markdown).toContain('_italic_');
    expect(markdown).toContain('[link](https://example.com)');
    expect(markdown).toContain('# Heading One');
    expect(markdown).toContain('1. First step');
    expect(markdown).toContain('2. Second step');
  });

  it('reads Google Docs bold and italic from the style attribute, not a b or i tag', () => {
    // Google Docs wraps a copied selection in an outer <b style="font-weight:normal"> (which
    // cancels the tag's own bold) and carries every run's real weight and style on the span.
    const html =
      '<meta charset="utf-8">' +
      '<b style="font-weight:normal;" id="docs-internal-guid-1">' +
      '<p dir="ltr" style="line-height:1.38;">' +
      '<span style="font-weight:700;font-style:normal;">Bold run</span>' +
      '<span style="font-weight:400;font-style:italic;"> and an italic run</span>' +
      '</p></b>';
    const markdown = htmlToMarkdown(html);
    expect(markdown).toContain('**Bold run**');
    expect(markdown).toContain('italic run_');
    expect(markdown).toMatch(/_\S*and an italic run_/);
    // The outer <b style="font-weight:normal"> wrapper must not additionally bold the whole
    // paste; a stacked outer bold would show up as four consecutive asterisks.
    expect(markdown).not.toContain('****');
  });

  it('degrades a table to its plain cell text, without crashing or emitting table syntax', () => {
    const html = '<table><tr><th>Trail</th><th>Length</th></tr><tr><td>Ridge</td><td>4mi</td></tr></table>';
    const markdown = htmlToMarkdown(html);
    expect(markdown).not.toContain('|');
    expect(markdown).toContain('Trail');
    expect(markdown).toContain('Ridge');
  });

  it('degrades strikethrough, a blockquote, and a highlight to plain text', () => {
    const html = '<p>strike <del>gone</del> text</p><blockquote>A quote</blockquote><p><mark>marked</mark></p>';
    const markdown = htmlToMarkdown(html);
    expect(markdown).not.toContain('~~');
    expect(markdown).not.toContain('>');
    expect(markdown).toContain('gone');
    expect(markdown).toContain('A quote');
    expect(markdown).toContain('marked');
  });

  it('keeps only an image alt as plain text, with no image markup', () => {
    const html = '<p>Trailhead <img src="https://example.com/x.png" alt="a trail marker"> ahead.</p>';
    const markdown = htmlToMarkdown(html);
    expect(markdown).not.toContain('![');
    expect(markdown).toContain('a trail marker');
  });

  it('drops a horizontal rule and inline/block code without emitting their markup', () => {
    const html = '<p>a</p><hr><p>b <code>x = 1</code></p><pre><code>block code</code></pre>';
    const markdown = htmlToMarkdown(html);
    expect(markdown).not.toContain('---');
    expect(markdown).not.toContain('`');
    expect(markdown).toContain('x = 1');
    expect(markdown).toContain('block code');
  });

  it('drops Word fragment markers and conditional comments instead of leaving them as text', () => {
    const html = '<!--StartFragment--><p>kept text</p><!--[if !supportLists]-->skip<!--[endif]--><!--EndFragment-->';
    const markdown = htmlToMarkdown(html);
    expect(markdown).not.toContain('StartFragment');
    expect(markdown).not.toContain('supportLists');
    expect(markdown).toContain('kept text');
  });

  it('returns the empty string for markup with no convertible or plain-text content', () => {
    expect(htmlToMarkdown('<script>alert(1)</script>')).toBe('');
  });
});
