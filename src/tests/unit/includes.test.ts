import { describe, it, expect } from 'vitest';
import { extractIncludes } from '../../lib/content/includes.js';

describe('extractIncludes', () => {
  it('collects a fragment id from a leaf include directive', () => {
    expect(extractIncludes('See this.\n\n::include{fragment="callout"}\n\nMore text.')).toEqual([
      'callout',
    ]);
  });
  it('collects multiple ids in document order, deduped', () => {
    const body = [
      '::include{fragment="a"}',
      '',
      '::include{fragment="b"}',
      '',
      '::include{fragment="a"}',
    ].join('\n');
    expect(extractIncludes(body)).toEqual(['a', 'b']);
  });
  it('ignores a container directive of the same name shape', () => {
    const body = ':::include\nfragment="callout"\n:::';
    expect(extractIncludes(body)).toEqual([]);
  });
  it('ignores a text directive named include', () => {
    const body = 'inline :include[x]{fragment="callout"} text';
    expect(extractIncludes(body)).toEqual([]);
  });
  it('ignores a directive with a missing fragment attribute', () => {
    expect(extractIncludes('::include')).toEqual([]);
  });
  it('ignores a directive with an empty fragment attribute', () => {
    expect(extractIncludes('::include{fragment=""}')).toEqual([]);
  });
  it('ignores an include token inside a code span or fence', () => {
    const body = 'Inline `::include{fragment="x"}` and\n\n```\n::include{fragment="y"}\n```\n';
    expect(extractIncludes(body)).toEqual([]);
  });
  it('ignores an unrelated leaf directive', () => {
    expect(extractIncludes('::figure{src="x.png"}')).toEqual([]);
  });
  it('returns an empty array for a body with no directives', () => {
    expect(extractIncludes('Just prose.')).toEqual([]);
  });
});
