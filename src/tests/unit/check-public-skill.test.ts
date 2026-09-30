import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ENGINE_BUILTIN_DIRECTIVES,
  PROSE_PAGES,
  checkBuiltinList,
  compileClaudeExclusion,
  compositionClasses,
  evaluate,
  expectedPages,
  pagePath,
  parseEmittedRegistry,
  parseReservedDirectives,
  runGate,
  snippetClasses,
  namedTokens,
} from '../../../scripts/checks/check-public-skill.mjs';

// The coverage gate's contract: every public piece cairn ships has a catalogue page, every class a
// snippet uses compiles, every token a snippet names resolves, and a parser that finds nothing
// fails loudly. Each assertion is proven here against a planted gap, so a gate that quietly stopped
// checking would turn a test red instead of staying green.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

type Context = Parameters<typeof evaluate>[0];

/** A page that carries an authoring form, one markup snippet, and one token. */
function page(authoring: string, classes: string, token: string): string {
  return [
    '# A page',
    '',
    `Authoring: \`${authoring}\``,
    '',
    '```html',
    `<p class="${classes}">text</p>`,
    '```',
    '',
    `Reads \`${token}\`.`,
    '',
  ].join('\n');
}

/** A small world in which every source has a page and the gate passes. */
function validContext(): Context {
  const directives = [
    { name: 'callout', previewMarkdown: ':::callout{tone="note"}\n:::' },
    { name: 'alert', previewMarkdown: undefined },
    { name: 'banner', previewMarkdown: ':::banner{message="x"}\n:::', hydrate: true },
  ];
  const pages: Record<string, string> = {
    'SKILL.md': '# Skill\n\nThe row for eyebrows reads `--tracking-eyebrow`.\n',
  };
  const sources = expectedPages({
    directives,
    builtins: ENGINE_BUILTIN_DIRECTIVES,
    components: ['PreviewBanner'],
    compositionClasses: ['cairn-card'],
  });
  for (const source of sources) {
    const authoring = source.kind === 'directive' ? `:::${source.name}` : source.name;
    pages[source.file] = page(authoring, 'callout', '--color-primary');
  }
  pages['references/README.md'] = sources.map((source) => `- [${source.name}](${source.file.replace('references/', '')})`).join('\n');
  return {
    directives,
    gateBuiltins: [...ENGINE_BUILTIN_DIRECTIVES],
    engineBuiltins: [...ENGINE_BUILTIN_DIRECTIVES],
    components: ['PreviewBanner'],
    compositionClasses: ['cairn-card'],
    pages,
    mentionsClass: (name: string) => ['callout', 'cairn-place-wide'].includes(name),
    registryClasses: new Set(['cairn-head']),
    resolvesToken: (name: string) => ['--color-primary', '--tracking-eyebrow'].includes(name),
  };
}

describe('the catalogue', () => {
  it('names 29 pages for the showcase registry, the engine built-ins, and the fixed pieces', () => {
    const sources = expectedPages({
      directives: ['callout', 'alert', 'icon', 'video', 'pull-quote', 'cta', 'micro-cta', 'faq', 'banner'].map(
        (name) => ({ name, previewMarkdown: undefined, hydrate: name === 'banner' })
      ),
      builtins: ENGINE_BUILTIN_DIRECTIVES,
      components: ['CairnHead', 'PreviewBanner'],
      compositionClasses: [
        'cairn-band',
        'cairn-card',
        'cairn-hero',
        'cairn-hero-lead',
        'cairn-hero-title',
        'cairn-section',
        'cairn-sidebar-layout',
        'cairn-site-main',
        'cairn-site-shell',
      ],
    });
    expect(sources).toHaveLength(29);
    expect(sources.filter((source) => source.kind === 'directive')).toHaveLength(11);
    expect(sources.filter((source) => source.kind === 'island')).toHaveLength(1);
    expect(sources.filter((source) => source.kind === 'component')).toHaveLength(2);
    expect(sources.filter((source) => source.kind === 'composition')).toHaveLength(9);
    expect(sources.filter((source) => source.kind === 'prose')).toHaveLength(PROSE_PAGES.length);
    expect(PROSE_PAGES).toHaveLength(6);
  });

  it('names a page from a source with one convention', () => {
    expect(pagePath('directive', 'pull-quote')).toBe('references/directive-pull-quote.md');
    expect(pagePath('component', 'CairnHead')).toBe('references/component-cairn-head.md');
    expect(pagePath('composition', 'cairn-hero-title')).toBe('references/composition-hero-title.md');
  });
});

describe('the coverage assertion', () => {
  it('passes a context in which every source has a page', () => {
    expect(evaluate(validContext())).toEqual([]);
  });

  it('fails a directive with no page, naming the directive and the file it wants', () => {
    const ctx = validContext();
    delete ctx.pages[pagePath('directive', 'callout')];
    const problems = evaluate(ctx);
    expect(problems.some((p) => p.includes('callout') && p.includes('references/directive-callout.md'))).toBe(true);
  });

  it('fails a registry directive with no preview and no page', () => {
    const ctx = validContext();
    delete ctx.pages[pagePath('directive', 'alert')];
    const problems = evaluate(ctx);
    expect(problems.some((p) => p.includes('alert') && p.includes('directive'))).toBe(true);
  });

  it('fails an engine built-in with no page', () => {
    const ctx = validContext();
    delete ctx.pages[pagePath('directive', 'include')];
    expect(evaluate(ctx).some((p) => p.includes('include'))).toBe(true);
  });

  it('fails an island, a component, a composition class, and a prose page with none', () => {
    for (const [kind, name] of [
      ['island', 'banner'],
      ['component', 'PreviewBanner'],
      ['composition', 'cairn-card'],
      ['prose', PROSE_PAGES[0]],
    ] as const) {
      const ctx = validContext();
      delete ctx.pages[pagePath(kind, name)];
      expect(evaluate(ctx).some((p) => p.includes(pagePath(kind, name))), `${kind} ${name}`).toBe(true);
    }
  });

  it('fails a page the reader index does not link', () => {
    const ctx = validContext();
    ctx.pages['references/README.md'] = ctx.pages['references/README.md'].replace('directive-callout.md', 'gone.md');
    expect(evaluate(ctx).some((p) => p.includes('README') && p.includes('directive-callout.md'))).toBe(true);
  });

  it('fails a directive page that never shows its authoring form', () => {
    const ctx = validContext();
    ctx.pages[pagePath('directive', 'callout')] = ctx.pages[pagePath('directive', 'callout')].replace(':::callout', 'callout');
    expect(evaluate(ctx).some((p) => p.includes('callout') && p.includes(':::callout'))).toBe(true);
  });

  it('fails a preview whose markdown does not open the directive it belongs to', () => {
    const ctx = validContext();
    ctx.directives = ctx.directives.map((d) => (d.name === 'callout' ? { ...d, previewMarkdown: ':::other\n:::' } : d));
    expect(evaluate(ctx).some((p) => p.includes('callout') && p.includes('preview'))).toBe(true);
  });
});

describe('the class assertion', () => {
  it('fails a snippet class the compiled sheet does not carry and the registry does not name', () => {
    const ctx = validContext();
    const file = pagePath('directive', 'callout');
    ctx.pages[file] = ctx.pages[file].replace('class="callout"', 'class="callout zz-not-compiled"');
    const problems = evaluate(ctx);
    expect(problems.some((p) => p.includes('zz-not-compiled') && p.includes(file))).toBe(true);
  });

  it('passes a snippet class only the emitted-class registry names', () => {
    const ctx = validContext();
    const file = pagePath('directive', 'callout');
    ctx.pages[file] = ctx.pages[file].replace('class="callout"', 'class="callout cairn-head"');
    expect(evaluate(ctx)).toEqual([]);
  });

  it('reads classes from fenced blocks only', () => {
    const text = ['Prose says class="prose-only".', '', '```html', '<p class="a b">x</p>', '<i class="c {dynamic}"></i>', '```'].join('\n');
    expect(snippetClasses(text).map((c: { token: string }) => c.token)).toEqual(['a', 'b']);
  });
});

describe('the token assertion', () => {
  it('fails a token a page names that resolves nowhere', () => {
    const ctx = validContext();
    const file = pagePath('directive', 'callout');
    ctx.pages[file] += '\nSet `--not-a-token` to retune it.\n';
    const problems = evaluate(ctx);
    expect(problems.some((p) => p.includes('--not-a-token') && p.includes(file))).toBe(true);
  });

  it('fails a token the router table names that resolves nowhere', () => {
    const ctx = validContext();
    ctx.pages['SKILL.md'] += '\n| rules | `--color-rule` |\n';
    expect(evaluate(ctx).some((p) => p.includes('--color-rule') && p.includes('SKILL.md'))).toBe(true);
  });

  it('reads a token from a fence and from an inline span, and skips a name that ends in a hyphen', () => {
    const text = ['Use `--a-b` here.', '', '```css', 'x { color: var(--c-d); }', '```', 'The `--cairn-` prefix.'].join('\n');
    expect(namedTokens(text).map((t: { token: string }) => t.token)).toEqual(['--a-b', '--c-d']);
  });

  it('skips a flag on a command line, in a fence or an inline span, and keeps a token beside it', () => {
    const text = [
      'Run `node scripts/lab/theme-fixture.mjs --arm template --probe <route>` for `--kept`.',
      '',
      '```bash',
      'npx cairn-audit --rule public-literals --rule theme-contrast',
      '$ npm run x -- --flag',
      '```',
    ].join('\n');
    expect(namedTokens(text).map((t: { token: string }) => t.token)).toEqual(['--kept']);
  });
});

describe('the empty-parse guard', () => {
  it('fails a reserved-name parse that matches nothing', () => {
    expect(() => parseReservedDirectives('const x = 1;')).toThrow(/reserved/i);
  });

  it('fails a composition parse that matches nothing', () => {
    expect(() => compositionClasses('/* .cairn-only-a-comment */ .plain { color: red }')).toThrow(/composition/i);
  });

  it('fails a registry parse that matches nothing', () => {
    expect(() => parseEmittedRegistry('# Render\n\nNo emitted section here.')).toThrow(/emitted/i);
  });

  it('fails when no page carries a snippet class', () => {
    const ctx = validContext();
    for (const file of Object.keys(ctx.pages)) ctx.pages[file] = ctx.pages[file].replace(/class="[^"]*"/g, '');
    expect(evaluate(ctx).some((p) => /no class/i.test(p))).toBe(true);
  });

  it('fails when no page names a token', () => {
    const ctx = validContext();
    for (const file of Object.keys(ctx.pages)) ctx.pages[file] = ctx.pages[file].replace(/`--[a-z-]+`/g, 'a token');
    expect(evaluate(ctx).some((p) => /no token/i.test(p))).toBe(true);
  });

  it('fails an empty directive list', () => {
    const ctx = validContext();
    ctx.directives = [];
    expect(evaluate(ctx).some((p) => /no directive/i.test(p))).toBe(true);
  });
});

describe('the engine built-in list', () => {
  it('reads the reserved names off the engine source', () => {
    const source = readFileSync(resolve(ROOT, 'src/lib/render/registry.ts'), 'utf8');
    expect(parseReservedDirectives(source).sort()).toEqual([...ENGINE_BUILTIN_DIRECTIVES].sort());
  });

  it('fails a built-in the gate names and the engine lacks, and the reverse', () => {
    expect(checkBuiltinList(['figure', 'include'], ['figure', 'include'])).toBeUndefined();
    expect(checkBuiltinList(['figure', 'include', 'gallery'], ['figure', 'include'])).toMatch(/gallery/);
    expect(checkBuiltinList(['figure'], ['figure', 'include'])).toMatch(/include/);
  });

  it('surfaces the drift through the gate as a problem', () => {
    const ctx = validContext();
    ctx.engineBuiltins = ['figure', 'include', 'gallery'];
    expect(evaluate(ctx).some((p) => p.includes('gallery'))).toBe(true);
  });
});

// The compile tests need the showcase's installed Tailwind, which CI installs after the engine's own
// unit run, so they skip when it is absent. `check:public-skill` runs the same compile after that
// install, so the skip never leaves the assertion unrun in CI.
const showcaseInstalled = existsSync(resolve(ROOT, 'examples/showcase/node_modules/.bin/tailwindcss'));

describe.skipIf(!showcaseInstalled)('the .claude exclusion', () => {
  it('keeps a utility used only under .claude/skills/cairn-public out of a scaffolded site sheet', () => {
    const result = compileClaudeExclusion(ROOT);
    expect(result.control).toBe(true);
    expect(result.leaked).toBe(false);
  }, 60_000);

  it('would fail on the earlier stylesheet-relative exclusion, so the compile can catch a leak', () => {
    const result = compileClaudeExclusion(ROOT, { exclusionLine: '@source not "./.claude";' });
    expect(result.control).toBe(true);
    expect(result.leaked).toBe(true);
  }, 60_000);
});

describe.skipIf(!showcaseInstalled || !existsSync(resolve(ROOT, 'dist/audit/index.js')))('the gate on the real tree', () => {
  it('passes over the shipped skill', async () => {
    const result = await runGate(ROOT);
    expect(result.problems).toEqual([]);
    expect(result.pageCount).toBe(29);
  }, 120_000);
});
