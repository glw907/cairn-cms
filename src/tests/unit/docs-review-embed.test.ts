import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  embedBatch,
  inlineRuntimeSource,
  planPathFor,
  loadReviewFile,
  TEMPLATE_PATH,
  RUNTIME_PATH,
} from '../../../scripts/docs-review/embed.mjs';
import {
  encodeState,
  decodeState,
  extractEmbeddedState,
  computeRestoredFiles,
  isReadOnlyRejection,
  planSectionHtml,
  renderMarkdown,
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

describe('runtime.mjs source safety', () => {
  it('never spells a literal script-boundary sequence in its own source', () => {
    // runtime.mjs's source is copied verbatim into the page's own inline script (its header
    // comment states this). An HTML parser ends a script element's raw text, or switches how it
    // tokenizes the rest of it, at these exact sequences wherever they appear in that raw text,
    // string and comment literals included, regardless of what the surrounding JavaScript means.
    // So this file must never spell one out as a contiguous literal, only ever assemble one (by
    // concatenation) where its own logic genuinely needs the value.
    expect(RUNTIME_SOURCE).not.toContain('</script>');
    expect(RUNTIME_SOURCE).not.toContain('<script');
    expect(RUNTIME_SOURCE).not.toContain('<!--');
    expect(RUNTIME_SOURCE).not.toContain('-->');
  });
});

describe('page plan on the review page', () => {
  const PLAN = '# Plan\n\n- Section one: states `x`.\n';

  it('finds a page\'s plan under its track in the briefs directory, front-door pages included', () => {
    const root = '/repo';
    expect(planPathFor('/repo/docs/extend/architecture.md', root)).toBe(
      '/repo/docs/internal/briefs/extend/architecture.plan.md',
    );
    expect(planPathFor('/repo/docs/why-cairn.md', root)).toBe(
      '/repo/docs/internal/briefs/front-door/why-cairn.plan.md',
    );
    expect(planPathFor('/repo/README.md', root)).toBeNull();
    expect(planPathFor('/repo/docs/extend/architecture.json', root)).toBeNull();
  });

  it('reads the plan beside the page when it exists, and carries no plan key when it does not', () => {
    const root = mkdtempSync(join(tmpdir(), 'cairn-docs-review-'));
    mkdirSync(join(root, 'docs/extend'), { recursive: true });
    mkdirSync(join(root, 'docs/internal/briefs/extend'), { recursive: true });
    writeFileSync(join(root, 'docs/extend/planned.md'), '# Planned\n');
    writeFileSync(join(root, 'docs/extend/unplanned.md'), '# Unplanned\n');
    writeFileSync(join(root, 'docs/internal/briefs/extend/planned.plan.md'), PLAN);

    const planned = loadReviewFile(join(root, 'docs/extend/planned.md'), root);
    expect(planned.plan).toBe(PLAN);
    expect(planned.markdown).toBe('# Planned\n');

    const unplanned = loadReviewFile(join(root, 'docs/extend/unplanned.md'), root);
    expect(unplanned.markdown).toBe('# Unplanned\n');
    expect('plan' in unplanned).toBe(false);
  });

  it('renders the plan as a collapsed section for a planned file and nothing for an unplanned one', () => {
    const planned = planSectionHtml({ path: 'docs/a.md', markdown: '# A', plan: PLAN }, renderMarkdown);
    expect(planned).toContain('<details class="doc-file-plan">');
    expect(planned).toContain('<summary>Page plan</summary>');
    expect(planned).toContain('<code>x</code>');
    expect(planSectionHtml({ path: 'docs/a.md', markdown: '# A' }, renderMarkdown)).toBe('');
    expect(planSectionHtml({ path: 'docs/a.md', markdown: '# A', plan: '  \n' }, renderMarkdown)).toBe('');
  });

  it('shows the plan in the page\'s own file section only when the file carries one, and keeps it through the round trip', async () => {
    const files = [
      { path: 'docs/a.md', markdown: '# A\n', plan: PLAN },
      { path: 'docs/b.md', markdown: '# B\n' },
    ];
    const embedded = embedBatch(TEMPLATE_SOURCE, RUNTIME_SOURCE, { title: 'Docs review', files });
    const page = await runReviewPage(embedded);
    const hooks = page.__cairnDocsReview!;
    expect(hooks.fileSectionHtml(files[0], 0)).toContain('class="doc-file-plan"');
    expect(hooks.fileSectionHtml(files[1], 1)).not.toContain('doc-file-plan');

    const regenerated = hooks.buildDocument(extractEmbeddedState(embedded)!);
    expect(extractEmbeddedState(regenerated)!.files).toEqual(files);
  });
});
