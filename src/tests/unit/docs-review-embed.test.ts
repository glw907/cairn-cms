import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  embedBatch,
  inlineRuntimeSource,
  TEMPLATE_PATH,
  RUNTIME_PATH,
} from '../../../scripts/docs-review/embed.mjs';
import {
  encodeState,
  decodeState,
  extractEmbeddedState,
  computeRestoredFiles,
  isReadOnlyRejection,
} from '../../../scripts/docs-review/runtime.mjs';
import { runReviewPage } from './_docs-review-vm.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const TEMPLATE_SOURCE = readFileSync(join(ROOT, 'scripts/docs-review/template.html'), 'utf8');
const RUNTIME_SOURCE = readFileSync(join(ROOT, 'scripts/docs-review/runtime.mjs'), 'utf8');

// Three files carrying every tricky construct the round trip must survive: a code fence, a
// table, a backtick span, a svelte fence containing a real <script>...</script> pair, an HTML
// comment, and non-ASCII text (curly quotes).
const FILES = [
  {
    path: 'docs/a.md',
    markdown: [
      '# Title A',
      '',
      'A paragraph with a `backtick span` inside it.',
      '',
      '```svelte',
      '<script>',
      '  let count = 0;',
      '</script>',
      '<button on:click={() => count++}>{count}</button>',
      '```',
      '',
    ].join('\n'),
  },
  {
    path: 'docs/b.md',
    markdown: [
      '# Title B',
      '',
      '| Col A | Col B |',
      '| --- | --- |',
      '| 1 | 2 |',
      '',
      '<!-- an html comment -->',
      '',
    ].join('\n'),
  },
  {
    path: 'docs/c.md',
    markdown: [
      '# “Curly quotes” title',
      '',
      'Some text using “fancy” punctuation, a curly apostrophe’s test, café.',
      '',
      '```js',
      'const x = 1;',
      '```',
      '',
    ].join('\n'),
  },
];

describe('docs-review round trip', () => {
  it('survives embed, the page\'s own regenerate, then extract, byte for byte', async () => {
    const embedded = embedBatch(TEMPLATE_SOURCE, RUNTIME_SOURCE, {
      title: 'Docs review',
      files: FILES,
    });

    const afterEmbed = extractEmbeddedState(embedded);
    expect(afterEmbed).not.toBeNull();
    expect(afterEmbed!.files).toEqual(FILES);

    // Run the page's own script and call its own regenerate function (the one save() calls
    // before publishing) on the state it just read back from the embed above.
    const page = await runReviewPage(embedded);
    const regenerated = page.__cairnDocsReview!.buildDocument(afterEmbed!);

    const afterRegenerate = extractEmbeddedState(regenerated);
    expect(afterRegenerate).not.toBeNull();
    expect(afterRegenerate!.files).toEqual(FILES);
  });

  it('fails loud when the template is missing its state placeholder', () => {
    const broken = TEMPLATE_SOURCE.replace('__CAIRN_REVIEW_STATE__', '');
    expect(() => embedBatch(broken, RUNTIME_SOURCE, { title: 't', files: [] })).toThrow(
      /state placeholder/,
    );
  });

  it('fails loud when the template is missing its runtime placeholder', () => {
    const broken = TEMPLATE_SOURCE.replace('/*__CAIRN_REVIEW_RUNTIME__*/', '');
    expect(() => embedBatch(broken, RUNTIME_SOURCE, { title: 't', files: [] })).toThrow(
      /runtime placeholder/,
    );
  });

  it('inlines the runtime source with the export keyword stripped, still defining every helper', () => {
    const inlined = inlineRuntimeSource(RUNTIME_SOURCE);
    expect(inlined).not.toMatch(/^export /m);
    const build = new Function(
      `${inlined}\nreturn { encodeState, decodeState, computeRestoredFiles, isReadOnlyRejection };`,
    ) as () => {
      encodeState: typeof encodeState;
      decodeState: typeof decodeState;
      computeRestoredFiles: typeof computeRestoredFiles;
      isReadOnlyRejection: typeof isReadOnlyRejection;
    };
    const helpers = build();
    // Same behavior as the imported module, proving the Node embed path and the inlined
    // browser path run one shared encode implementation, not two that merely happen to agree.
    const sample = { title: 'x', files: FILES };
    expect(helpers.decodeState(helpers.encodeState(sample))).toEqual(sample);
    expect(helpers.encodeState(sample)).toEqual(encodeState(sample));
    expect(helpers.computeRestoredFiles(null, FILES)).toEqual(computeRestoredFiles(null, FILES));
    expect(helpers.isReadOnlyRejection('not_writer')).toBe(isReadOnlyRejection('not_writer'));
  });

  it('points TEMPLATE_PATH and RUNTIME_PATH at the real files on disk', () => {
    expect(TEMPLATE_PATH.endsWith('template.html')).toBe(true);
    expect(RUNTIME_PATH.endsWith('runtime.mjs')).toBe(true);
  });
});

describe('runtime encode/decode', () => {
  it('escapes a literal </script> inside markdown so it cannot end the state element early', () => {
    const state = { title: 't', files: [{ path: 'x.md', markdown: '```\n</script>\n```' }] };
    const encoded = encodeState(state);
    expect(encoded).not.toContain('</script>');
    expect(decodeState(encoded)).toEqual(state);
  });
});
