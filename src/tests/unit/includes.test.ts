import { describe, it, expect } from 'vitest';
import { extractIncludes, rewriteIncludeDirective } from '../../lib/content/includes.js';

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

describe('rewriteIncludeDirective', () => {
  it('rewrites the fragment attribute of a matching directive, leaving the rest untouched', () => {
    const doc = 'See.\n\n::include{fragment="welcome"}\n';
    expect(rewriteIncludeDirective(doc, 'welcome', 'new-welcome')).toBe(
      'See.\n\n::include{fragment="new-welcome"}\n',
    );
  });
  it('rewrites every matching occurrence, dedup not required', () => {
    const doc = '::include{fragment="a"}\n\n::include{fragment="a"}\n';
    expect(rewriteIncludeDirective(doc, 'a', 'b')).toBe('::include{fragment="b"}\n\n::include{fragment="b"}\n');
  });
  it('leaves a directive targeting a different fragment id untouched', () => {
    const doc = '::include{fragment="other"}\n';
    expect(rewriteIncludeDirective(doc, 'welcome', 'new-welcome')).toBe(doc);
  });
  it('leaves an include token inside a code span untouched', () => {
    const doc = 'Inline `::include{fragment="welcome"}` text.';
    expect(rewriteIncludeDirective(doc, 'welcome', 'new-welcome')).toBe(doc);
  });
  // The editor is raw markdown, so an author can hand-type any attribute form the grammar takes,
  // and extractIncludes accepts all of them. A rewrite that matched only the double-quoted form
  // would no-op silently here: the body would keep the old id, the re-derived manifest row would
  // agree with it, and the rename would land a dangling include that breaks the next build.
  it('rewrites a bare (unquoted) fragment attribute, normalizing it to the quoted form', () => {
    expect(rewriteIncludeDirective('::include{fragment=welcome}\n', 'welcome', 'greeting')).toBe(
      '::include{fragment="greeting"}\n',
    );
  });
  it('rewrites a single-quoted fragment attribute, normalizing it to the quoted form', () => {
    expect(rewriteIncludeDirective("::include{fragment='welcome'}\n", 'welcome', 'greeting')).toBe(
      '::include{fragment="greeting"}\n',
    );
  });
  it('keeps a sibling attribute exact while rewriting the fragment one', () => {
    expect(rewriteIncludeDirective('::include{fragment=welcome .lead}\n', 'welcome', 'greeting')).toBe(
      '::include{fragment="greeting" .lead}\n',
    );
  });
});
