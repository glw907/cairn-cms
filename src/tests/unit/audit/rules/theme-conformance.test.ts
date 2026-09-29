import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { loadImportChain } from '../../../../lib/audit/import-chain.js';
import { parseComponent } from '../../../../lib/audit/markup.js';
import { nodePeers } from '../../../../lib/audit/peers.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { createThemeConformance, themeConformance } from '../../../../lib/audit/rules/static/theme-conformance.js';
import type { ChainFs } from '../../../../lib/audit/import-chain.js';
import type { PeerAccess } from '../../../../lib/audit/peers.js';
import type { StaticRuleContext } from '../../../../lib/audit/types.js';

const REPO = fileURLToPath(new URL('../../../../../', import.meta.url));
const read = (path: string) => readFileSync(`${REPO}${path}`, 'utf8');

/** daisyUI's real key list, so a fixture block is complete or short by exactly what a test says. */
const KEYS = [
  'color-scheme',
  ...[
    'base-100', 'base-200', 'base-300', 'base-content', 'primary', 'primary-content', 'secondary',
    'secondary-content', 'accent', 'accent-content', 'neutral', 'neutral-content', 'info', 'info-content',
    'success', 'success-content', 'warning', 'warning-content', 'error', 'error-content',
  ].map((role) => `--color-${role}`),
  '--radius-selector', '--radius-field', '--radius-box', '--size-selector', '--size-field', '--border', '--depth', '--noise',
];

/** A daisyUI theme block, complete unless a key is omitted. */
function block(name: string, options: { isDefault?: boolean; omit?: string[]; extra?: string } = {}): string {
  const omit = new Set(options.omit ?? []);
  const lines = KEYS.filter((key) => !omit.has(key)).map((key) => `  ${key}: ${key === 'color-scheme' ? 'light' : 'oklch(50% 0 0)'};`);
  return `@plugin "daisyui/theme" {\n  name: "${name}";\n  default: ${options.isDefault ? 'true' : 'false'};\n${lines.join('\n')}\n${options.extra ?? ''}}\n`;
}

/** The repository's own daisyUI and Tailwind, since the in-memory site at `/site` has no node_modules. */
const REAL_PEERS: PeerAccess = { ...nodePeers, resolve: (specifier) => nodePeers.resolve(specifier, REPO) };

const ROOT = '/site';
const PUBLIC_CSS = '@glw907/cairn-cms/cairn-public.css';

/** The engine package as a site's node_modules holds it: the real stylesheet under its export. */
const ENGINE: Record<string, string> = {
  '/site/node_modules/@glw907/cairn-cms/package.json': JSON.stringify({
    name: '@glw907/cairn-cms',
    exports: { './cairn-public.css': './dist/public/cairn-public.css' },
  }),
  '/site/node_modules/@glw907/cairn-cms/dist/public/cairn-public.css': read('src/lib/public/cairn-public.css'),
};

interface Tree {
  /** The `src/theme/theme.css` entry text; the chain starts here. */
  theme: string;
  /** Extra files by root-relative path: CSS joins the scope, `.svelte` becomes a component. */
  files?: Record<string, string>;
  /** Extra absolute-path files the chain can read (packages). */
  packages?: Record<string, string>;
  /** Whether the engine package is installed for the chain. */
  engine?: boolean;
  entries?: string[];
}

/** Run the rule over an in-memory tree: the chain from the entries, the scope from the files. */
function run(tree: Tree, peers: PeerAccess = REAL_PEERS) {
  const files: Record<string, string> = { 'src/theme/theme.css': tree.theme, ...(tree.files ?? {}) };
  const memory: Record<string, string> = { ...(tree.engine === false ? {} : ENGINE), ...(tree.packages ?? {}) };
  for (const [path, source] of Object.entries(files)) memory[`${ROOT}/${path}`] = source;
  const fs: ChainFs = { readText: (path) => memory[path] };
  const config = resolveConfig(ROOT, null, () => true);
  const ctx: StaticRuleContext = {
    files: Object.entries(files)
      .filter(([path]) => path.endsWith('.svelte'))
      .map(([path, source]) => parseComponent(path, source)),
    sheet: parseSheet(''),
    config,
    cssFiles: Object.entries(files)
      .filter(([path]) => path.endsWith('.css'))
      .map(([file, source]) => ({ file, source })),
    chain: loadImportChain(ROOT, tree.entries ?? ['src/theme/theme.css'], fs),
  };
  return createThemeConformance(peers).check(ctx);
}

/** The showcase's real theme and chassis files, laid out as a site holds them. */
function showcaseTree(): Tree {
  const files: Record<string, string> = {};
  for (const name of ['tokens.css', 'prose.css', 'composition.css']) {
    files[`src/chassis/${name}`] = read(`examples/showcase/src/chassis/${name}`);
  }
  return { theme: read('examples/showcase/src/theme/theme.css'), files };
}

/** A complete, clean theme: the import, one default block, one dark block. */
const IMPORTS = `@import "tailwindcss";\n@import "${PUBLIC_CSS}";\n`;
const CLEAN = `${IMPORTS}${block('acme', { isDefault: true })}${block('acme-night')}`;

describe('theme-conformance: registration', () => {
  it('registers as an advisory public-scope rule that reads the import chain', () => {
    expect(themeConformance.id).toBe('theme-conformance');
    expect(themeConformance.tier).toBe('advisory');
    expect(themeConformance.publicScope).toBe(true);
    expect(themeConformance.importChain).toBe(true);
    expect(themeConformance.adminOnly).toBeUndefined();
  });

  it('passes a complete two-block theme that imports the engine sheet', () => {
    expect(run({ theme: CLEAN })).toEqual([]);
  });
});

describe('theme-conformance: completeness', () => {
  it('flags a default block missing --radius-box as a runtime hole', () => {
    const findings = run({ theme: `${IMPORTS}${block('acme', { isDefault: true, omit: ['--radius-box'] })}` });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('"acme"');
    expect(findings[0].message).toContain('--radius-box');
    expect(findings[0].message).toContain('default block');
    expect(findings[0].message).toContain('runtime');
  });

  it('names the secondary block when a key is missing from that block only', () => {
    const findings = run({
      theme: `${IMPORTS}${block('acme', { isDefault: true })}${block('acme-night', { omit: ['--color-warning-content'] })}`,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('"acme-night"');
    expect(findings[0].message).toContain('--color-warning-content');
    expect(findings[0].message).toContain('secondary');
    expect(findings[0].message).not.toContain('runtime');
  });

  it('flags a block missing color-scheme', () => {
    const findings = run({ theme: `${IMPORTS}${block('acme', { isDefault: true, omit: ['color-scheme'] })}` });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('color-scheme');
  });

  it('lists every missing key of a block in one finding', () => {
    const findings = run({ theme: `${IMPORTS}${block('acme', { isDefault: true, omit: ['--radius-box', '--depth'] })}` });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('--radius-box');
    expect(findings[0].message).toContain('--depth');
  });

  it('passes a partial block named after a built-in theme, which daisyUI completes by merging', () => {
    const partial = '@plugin "daisyui/theme" {\n  name: "nord";\n  default: true;\n  --color-primary: oklch(50% 0.1 250);\n}\n';
    expect(run({ theme: `${IMPORTS}${partial}` })).toEqual([]);
  });

  it('flags a partial block with a custom name', () => {
    const partial = '@plugin "daisyui/theme" {\n  name: "nordic";\n  default: true;\n  --color-primary: oklch(50% 0.1 250);\n}\n';
    const findings = run({ theme: `${IMPORTS}${partial}` });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('"nordic"');
  });

  it('raises a finding when the scope holds no theme block', () => {
    const findings = run({ theme: `${IMPORTS}:root { --site-tint: red; }` });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toMatch(/no daisyUI theme block/);
    expect(findings[0].file).toBe('src/theme/theme.css');
  });

  it('finds a theme block in an imported file as well as in the scope', () => {
    const findings = run({
      theme: `${IMPORTS}@import "./palette.css";\n`,
      packages: { '/site/src/theme/palette.css': block('acme', { isDefault: true, omit: ['--radius-box'] }) },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].file).toBe('src/theme/palette.css');
  });
});

describe('theme-conformance: resolution', () => {
  const withRoute = (css: string) => ({ theme: CLEAN, files: { 'src/routes/+page.svelte': `<div class="x"></div>\n<style>\n${css}\n</style>\n` } });

  it('flags a var() naming a token nothing defines', () => {
    const findings = run(withRoute('.x { color: var(--typo-token); }'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('var(--typo-token)');
    expect(findings[0].file).toBe('src/routes/+page.svelte');
  });

  it('flags a Tailwind color step the theme does not declare', () => {
    const findings = run(withRoute('.x { color: var(--color-red-550); }'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('--color-red-550');
  });

  it('passes a Tailwind theme variable, a --tw- variable, and a daisyUI key of a complete block', () => {
    expect(run(withRoute('.x { color: var(--color-red-500); margin: var(--spacing); outline-color: var(--tw-ring-color); background: var(--color-base-200); }'))).toEqual([]);
  });

  it('passes a route-local token declared in a style block, a style attribute, or a style: directive', () => {
    const files = {
      'src/routes/+page.svelte': '<div style="--local: 1px" class="x"></div>\n<p style:--other="2px" class="y"></p>\n<style>\n.x { margin: var(--local); }\n.y { margin: var(--other); padding: var(--own); --own: 1px; }\n</style>\n',
    };
    expect(run({ theme: CLEAN, files })).toEqual([]);
  });

  it('passes a token an imported stylesheet declares', () => {
    const files = { 'src/routes/+page.svelte': '<i class="x"></i>\n<style>\n.x { color: var(--cairn-success-ink); }\n</style>\n' };
    expect(run({ theme: CLEAN, files })).toEqual([]);
  });

  it('flags a token the site reads from the engine sheet when the chain never imports it', () => {
    const files = { 'src/routes/+page.svelte': '<i class="x"></i>\n<style>\n.x { color: var(--cairn-success-ink); }\n</style>\n' };
    const findings = run({ theme: `@import "tailwindcss";\n${block('acme', { isDefault: true })}`, files });
    expect(findings.map((finding) => finding.message).join('\n')).toContain('var(--cairn-success-ink)');
    expect(findings.some((finding) => /does not import/.test(finding.message))).toBe(true);
  });

  it('skips a var() with a fallback and a name that is not a literal', () => {
    const files = { 'src/routes/+page.svelte': '<i class="x" style="color: var(--{name})"></i>\n<style>\n.x { color: var(--nowhere, red); margin: var(--ghost, var(--other-ghost)); padding: var(var(--x)); }\n</style>\n' };
    expect(run({ theme: CLEAN, files })).toEqual([]);
  });

  it('flags a var() written in a style attribute and in a Tailwind arbitrary value', () => {
    const inStyle = run({ theme: CLEAN, files: { 'src/routes/+page.svelte': '<i style="color: var(--ghost-a)"></i>' } });
    expect(inStyle).toHaveLength(1);
    expect(inStyle[0].message).toContain('--ghost-a');
    const inClass = run({ theme: CLEAN, files: { 'src/routes/+page.svelte': '<i class="text-[var(--ghost-b)]"></i>' } });
    expect(inClass).toHaveLength(1);
    expect(inClass[0].message).toContain('--ghost-b');
  });

  it('does not count a key an incomplete block defines as resolved', () => {
    const theme = `${IMPORTS}${block('acme', { isDefault: true, omit: ['--depth'] })}`;
    const files = { 'src/routes/+page.svelte': '<i class="x"></i>\n<style>\n.x { color: var(--color-primary); }\n</style>\n' };
    const findings = run({ theme, files });
    expect(findings).toHaveLength(2);
    expect(findings.some((finding) => finding.message.includes('missing --depth'))).toBe(true);
    expect(findings.some((finding) => finding.message.includes('var(--color-primary)'))).toBe(true);
  });
});

describe('theme-conformance: the three more findings', () => {
  it('flags a stylesheet chain that skips cairn-public.css', () => {
    const findings = run({ theme: `@import "tailwindcss";\n${block('acme', { isDefault: true })}` });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('cairn-public.css');
    expect(findings[0].file).toBe('src/theme/theme.css');
  });

  it('counts the import when the engine package is not installed, since the statement is there', () => {
    expect(run({ theme: CLEAN, engine: false })).toEqual([]);
  });

  it('flags a copied pre-pass tokens.css beside the new import (a stale chassis copy)', () => {
    const stale = readFileSync(new URL('../fixtures/theme/stale-tokens.css', import.meta.url), 'utf8');
    const findings = run({
      theme: `@import "../chassis/tokens.css";\n@import "${PUBLIC_CSS}";\n${block('acme', { isDefault: true })}`,
      files: { 'src/chassis/tokens.css': stale },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].file).toBe('src/chassis/tokens.css');
    expect(findings[0].message).toContain('redeclares');
    expect(findings[0].message).toContain('--cairn-success-ink');
    expect(findings[0].message).toContain('--color-muted');
  });

  it('stays silent on the new template chassis and theme', () => {
    expect(run(showcaseTree())).toEqual([]);
  });

  it('flags a --font-<name> face declared beside a --font-weight-<name> weight', () => {
    const theme = `${CLEAN}@theme {\n  --font-heading: Georgia, serif;\n  --font-weight-heading: 800;\n}\n`;
    const findings = run({ theme });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('--font-heading');
    expect(findings[0].message).toContain('--font-weight-heading');
  });

  it('passes a heading weight beside a differently named face', () => {
    const theme = `${CLEAN}@theme {\n  --font-display: Georgia, serif;\n  --font-weight-heading: 800;\n}\n`;
    expect(run({ theme })).toEqual([]);
  });
});

describe('theme-conformance: what the import chain resolves', () => {
  it('reads a package that exports CSS only under the style condition', () => {
    const packages = {
      '/site/node_modules/palette/package.json': JSON.stringify({ name: 'palette', exports: { '.': { style: './index.css', import: './x.mjs' } } }),
      '/site/node_modules/palette/index.css': block('acme', { isDefault: true, omit: ['--radius-box'] }),
    };
    const findings = run({ theme: `${IMPORTS}@import "palette";\n`, packages });
    expect(findings).toHaveLength(1);
    expect(findings[0].file).toBe('node_modules/palette/index.css');
  });

  it('records an uninstalled import as unread with no finding', () => {
    const theme = `${CLEAN}`.replace(IMPORTS, `${IMPORTS}@import "@fontsource-variable/fraunces/opsz.css";\n`);
    expect(run({ theme })).toEqual([]);
  });

  it('resolves a package with no exports field by file path, and tolerates layer() and source()', () => {
    const packages = {
      '/site/node_modules/fonts/package.json': JSON.stringify({ name: 'fonts' }),
      '/site/node_modules/fonts/face.css': '.face {}',
    };
    const theme = `@import "tailwindcss" layer(base) source(none);\n@import "${PUBLIC_CSS}" layer(theme);\n@import "fonts/face.css";\n${block('acme', { isDefault: true })}`;
    expect(run({ theme, packages })).toEqual([]);
  });

  it('names an import that resolves to a file that is not CSS, and never parses it', () => {
    const packages = {
      '/site/node_modules/lib/package.json': JSON.stringify({ name: 'lib', exports: { '.': { default: './dist/lib.js' } } }),
      '/site/node_modules/lib/dist/lib.js': '@plugin "daisyui/theme" { name: "js"; }',
    };
    const findings = run({ theme: `${IMPORTS}@import "lib";\n${block('acme', { isDefault: true })}`, packages });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('not a stylesheet');
    expect(findings[0].message).toContain('lib');
  });

  it('runs over the overlay layered after the theme, whose font package is not installed', () => {
    const tree = showcaseTree();
    const findings = run({
      ...tree,
      files: { ...tree.files, 'cairn.css': read('examples/cairn-theme/cairn.css') },
      entries: ['src/theme/theme.css', 'cairn.css'],
    });
    expect(findings).toEqual([]);
  });
});

describe('theme-conformance: the peers', () => {
  const missing = (peer: string): PeerAccess => ({
    ...REAL_PEERS,
    resolve: (specifier, root) => (specifier.startsWith(peer) ? undefined : REAL_PEERS.resolve(specifier, root)),
  });

  it('fails with a named message when daisyui is not installed', () => {
    expect(() => run({ theme: CLEAN }, missing('daisyui'))).toThrow(/daisyui is not installed.*npm install --save-dev daisyui/);
  });

  it('fails with a named message when tailwindcss is not installed', () => {
    expect(() => run({ theme: CLEAN }, missing('tailwindcss'))).toThrow(/tailwindcss is not installed.*npm install --save-dev tailwindcss/);
  });

  it('fails loudly on an empty key list, and on one lacking --radius-box', () => {
    const list = (themes: unknown): PeerAccess => ({ ...REAL_PEERS, loadDefault: () => themes });
    expect(() => run({ theme: CLEAN }, list({}))).toThrow(/empty/);
    expect(() => run({ theme: CLEAN }, list({ light: { 'color-scheme': 'light', '--color-base-100': 'white' } }))).toThrow(/--radius-box/);
  });
});
