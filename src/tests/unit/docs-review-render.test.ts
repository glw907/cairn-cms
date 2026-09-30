import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdown, selectMarkdownRenderer } from '../../../scripts/docs-review/runtime.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const TEMPLATE_SOURCE = readFileSync(join(ROOT, 'scripts/docs-review/template.html'), 'utf8');

/** Stands in for the two CDN globals, recording what each was asked to do. */
function fakeLibs() {
  const hooks: string[] = [];
  return {
    hooks,
    scope: {
      marked: { parse: (md: string) => `<parsed>${md}</parsed>` },
      DOMPurify: {
        sanitize: (html: string) => `<clean>${html}</clean>`,
        addHook: (name: string) => {
          hooks.push(name);
        },
      },
    },
  };
}

describe('selectMarkdownRenderer', () => {
  it('falls back to the built-in renderer when neither library loaded', () => {
    expect(selectMarkdownRenderer({})).toBe(renderMarkdown);
    expect(selectMarkdownRenderer(undefined)).toBe(renderMarkdown);
  });

  it('falls back when only one of the two libraries loaded', () => {
    const { scope } = fakeLibs();
    expect(selectMarkdownRenderer({ marked: scope.marked })).toBe(renderMarkdown);
    expect(selectMarkdownRenderer({ DOMPurify: scope.DOMPurify })).toBe(renderMarkdown);
  });

  it('falls back when a global is present but does not have the expected methods', () => {
    expect(selectMarkdownRenderer({ marked: {}, DOMPurify: {} })).toBe(renderMarkdown);
  });

  it('parses with marked and passes the result through DOMPurify when both loaded', () => {
    const { scope } = fakeLibs();
    const render = selectMarkdownRenderer(scope);
    expect(render).not.toBe(renderMarkdown);
    expect(render('- a')).toBe('<clean><parsed>- a</parsed></clean>');
  });

  it('makes sanitized links open outside the review page', () => {
    const { scope, hooks } = fakeLibs();
    selectMarkdownRenderer(scope);
    expect(hooks).toEqual(['afterSanitizeAttributes']);
  });
});

describe('template library tags', () => {
  it('loads pinned marked and DOMPurify builds from cdnjs before the page script', () => {
    const marked = TEMPLATE_SOURCE.indexOf(
      'https://cdnjs.cloudflare.com/ajax/libs/marked/18.0.14/lib/marked.umd.min.js',
    );
    const purify = TEMPLATE_SOURCE.indexOf(
      'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.4.16/purify.min.js',
    );
    const glue = TEMPLATE_SOURCE.indexOf('id="cairn-docs-review-script"');
    expect(marked).toBeGreaterThan(-1);
    expect(purify).toBeGreaterThan(-1);
    expect(marked).toBeLessThan(glue);
    expect(purify).toBeLessThan(glue);
  });
});
