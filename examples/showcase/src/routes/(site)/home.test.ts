import { describe, expect, it } from 'vitest';
import { splitAtLastRule } from './home.js';

describe('splitAtLastRule', () => {
  it('keeps the whole body before the list when there is no rule', () => {
    const html = '<p>First.</p>\n<p>Second.</p>\n';
    expect(splitAtLastRule(html)).toEqual({ before: html, after: '' });
  });

  it('splits at one top-level rule and drops it', () => {
    expect(splitAtLastRule('<p>Intro.</p>\n<hr>\n<p>Outro.</p>\n')).toEqual({
      before: '<p>Intro.</p>',
      after: '<p>Outro.</p>\n',
    });
  });

  it('splits at the second of two top-level rules', () => {
    expect(splitAtLastRule('<p>A.</p>\n<hr>\n<p>B.</p>\n<hr>\n<p>C.</p>')).toEqual({
      before: '<p>A.</p>\n<hr>\n<p>B.</p>',
      after: '<p>C.</p>',
    });
  });

  it('leaves after empty when the rule is the last element', () => {
    expect(splitAtLastRule('<p>Intro.</p>\n<hr>\n')).toEqual({
      before: '<p>Intro.</p>',
      after: '',
    });
  });

  it('treats a rule only inside a blockquote as no rule', () => {
    const html = '<p>Intro.</p>\n<blockquote>\n<p>quoted</p>\n<hr>\n</blockquote>\n';
    expect(splitAtLastRule(html)).toEqual({ before: html, after: '' });
  });

  it("treats a rule inside a block's markup as no rule", () => {
    const html = '<div class="callout"><section><p>Note.</p><hr></section></div>\n<p>After.</p>';
    expect(splitAtLastRule(html)).toEqual({ before: html, after: '' });
  });

  it('holds its depth across a > inside an attribute value', () => {
    // Read unquoted, the tag would end at the value's `/>` and look self-closing, which would
    // leave the nested rule at the top level.
    const html = '<div data-x=\'c/>\' title="a > b"><hr></div>\n<p>Tail.</p>';
    expect(splitAtLastRule(html)).toEqual({ before: html, after: '' });
  });

  it('holds its depth across void elements', () => {
    const html = '<p>Line<br>break <img src="a.png" alt="a"></p><hr><blockquote><hr></blockquote>';
    expect(splitAtLastRule(html)).toEqual({
      before: '<p>Line<br>break <img src="a.png" alt="a"></p>',
      after: '<blockquote><hr></blockquote>',
    });
  });

  it('holds its depth across a self-closing tag in inline SVG', () => {
    const html =
      '<p><svg viewBox="0 0 1 1"><path d="M0 0" /><circle r="1"/></svg></p><hr/><p>Tail.</p>';
    expect(splitAtLastRule(html)).toEqual({
      before: '<p><svg viewBox="0 0 1 1"><path d="M0 0" /><circle r="1"/></svg></p>',
      after: '<p>Tail.</p>',
    });
  });

  it('holds its depth across an HTML comment', () => {
    const html = '<p>A.</p><!-- <div> <hr> --><hr><p>B.</p>';
    expect(splitAtLastRule(html)).toEqual({
      before: '<p>A.</p><!-- <div> <hr> -->',
      after: '<p>B.</p>',
    });
  });
});
