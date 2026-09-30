import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { dualGamutRatio } from '../../../../lib/audit/contrast.js';
import { loadImportChain } from '../../../../lib/audit/import-chain.js';
import { nodePeers } from '../../../../lib/audit/peers.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import {
  CONTRAST_FLOOR,
  createThemeContrast,
  measureThemeContrast,
  themeContrast,
} from '../../../../lib/audit/rules/static/theme-contrast.js';
import type { ChainFs } from '../../../../lib/audit/import-chain.js';
import type { PeerAccess } from '../../../../lib/audit/peers.js';
import type { Finding, StaticRuleContext } from '../../../../lib/audit/types.js';

const REPO = fileURLToPath(new URL('../../../../../', import.meta.url));
const read = (path: string) => readFileSync(`${REPO}${path}`, 'utf8');

/** The repository's own daisyUI, since the in-memory site at `/site` has no node_modules. */
const REAL_PEERS: PeerAccess = { ...nodePeers, resolve: (specifier) => nodePeers.resolve(specifier, REPO) };
const BUILT_IN = (() => {
  const loaded = REAL_PEERS.loadDefault(REAL_PEERS.resolve('daisyui/theme/object', REPO) ?? '');
  return loaded as Record<string, Record<string, string>>;
})();

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

/**
 * A light and a dark palette that pass every pair with the engine's derived inks and muted: the
 * showcase's own Waymark values with its hand-tuned inks and muted removed.
 */
const LIGHT: Record<string, string> = {
  'color-scheme': 'light',
  '--color-base-100': 'oklch(98.4% 0 0)',
  '--color-base-200': 'oklch(96.4% 0 0)',
  '--color-base-300': 'oklch(90.8% 0 0)',
  '--color-base-content': 'oklch(25% 0 0)',
  '--color-primary': 'oklch(45% 0.1 248)',
  '--color-primary-content': 'oklch(99% 0.01 248)',
  '--color-secondary': 'oklch(50% 0.02 75)',
  '--color-secondary-content': 'oklch(99% 0.005 75)',
  '--color-accent': 'oklch(52% 0.07 235)',
  '--color-accent-content': 'oklch(99% 0.01 235)',
  '--color-neutral': 'oklch(27% 0.013 72)',
  '--color-neutral-content': 'oklch(97% 0.003 75)',
  '--color-info': 'oklch(55% 0.1 235)',
  '--color-info-content': 'oklch(99% 0.01 235)',
  '--color-success': 'oklch(54% 0.12 150)',
  '--color-success-content': 'oklch(99% 0.01 150)',
  '--color-warning': 'oklch(80% 0.13 78)',
  '--color-warning-content': 'oklch(28% 0.05 78)',
  '--color-error': 'oklch(58% 0.19 27)',
  '--color-error-content': 'oklch(99% 0.01 27)',
};
const DARK: Record<string, string> = {
  'color-scheme': 'dark',
  '--color-base-100': 'oklch(24% 0 0)',
  '--color-base-200': 'oklch(20% 0 0)',
  '--color-base-300': 'oklch(32% 0 0)',
  '--color-base-content': 'oklch(92% 0 0)',
  '--color-primary': 'oklch(74% 0.1 248)',
  '--color-primary-content': 'oklch(22% 0.03 248)',
  '--color-secondary': 'oklch(72% 0.02 75)',
  '--color-secondary-content': 'oklch(22% 0.01 75)',
  '--color-accent': 'oklch(76% 0.08 235)',
  '--color-accent-content': 'oklch(22% 0.03 235)',
  '--color-neutral': 'oklch(86% 0.006 75)',
  '--color-neutral-content': 'oklch(22% 0.01 75)',
  '--color-info': 'oklch(70% 0.1 235)',
  '--color-info-content': 'oklch(24% 0.04 235)',
  '--color-success': 'oklch(66% 0.12 150)',
  '--color-success-content': 'oklch(24% 0.04 150)',
  '--color-warning': 'oklch(82% 0.13 78)',
  '--color-warning-content': 'oklch(25% 0.05 78)',
  '--color-error': 'oklch(66% 0.17 27)',
  '--color-error-content': 'oklch(24% 0.05 27)',
};

interface BlockOptions {
  isDefault?: boolean;
  prefersDark?: boolean;
  /** Values that replace or add to the palette. */
  set?: Record<string, string>;
  /** Keys left out of the block. */
  omit?: string[];
}

/** A daisyUI theme block over a palette. */
function block(name: string, palette: Record<string, string>, options: BlockOptions = {}): string {
  const values = { ...palette, ...(options.set ?? {}) };
  const omit = new Set(options.omit ?? []);
  const lines = Object.entries(values)
    .filter(([key]) => !omit.has(key))
    .map(([key, value]) => `  ${key}: ${value};`);
  return [
    '@plugin "daisyui/theme" {',
    `  name: "${name}";`,
    `  default: ${options.isDefault ? 'true' : 'false'};`,
    `  prefersdark: ${options.prefersDark ? 'true' : 'false'};`,
    ...lines,
    '}',
    '',
  ].join('\n');
}

const IMPORTS = `@import "tailwindcss";\n@import "${PUBLIC_CSS}";\n`;

/** A clean pair of blocks named apart from the showcase's: `acme` by default, `acme-night` for a dark OS. */
function acme(light: BlockOptions = {}, dark: BlockOptions = {}): string {
  return `${IMPORTS}${block('acme', LIGHT, { isDefault: true, ...light })}${block('acme-night', DARK, { prefersDark: true, ...dark })}`;
}

interface Tree {
  theme: string;
  /** Extra files by root-relative path, readable by the chain. */
  files?: Record<string, string>;
  entries?: string[];
}

/** The chain of an in-memory site, read the way a run reads it. */
function chainOf(tree: Tree) {
  const memory: Record<string, string> = { ...ENGINE };
  memory[`${ROOT}/src/theme/theme.css`] = tree.theme;
  for (const [path, source] of Object.entries(tree.files ?? {})) memory[`${ROOT}/${path}`] = source;
  const fs: ChainFs = { readText: (path) => memory[path] };
  return loadImportChain(ROOT, tree.entries ?? ['src/theme/theme.css'], fs);
}

/** Run the registered rule's check over an in-memory tree. */
function run(tree: Tree, peers: PeerAccess = REAL_PEERS): Finding[] {
  const ctx: StaticRuleContext = {
    files: [],
    sheet: parseSheet(''),
    config: resolveConfig(ROOT, null, () => true),
    cssFiles: [],
    chain: chainOf(tree),
  };
  return createThemeContrast(peers).check(ctx);
}

/** The measurement behind the rule, for the per-scheme counts. */
function measure(tree: Tree) {
  return measureThemeContrast(chainOf(tree).files, BUILT_IN);
}

/** The showcase's real theme and chassis files, laid out as a site holds them. */
function showcaseTree(theme = read('examples/showcase/src/theme/theme.css')): Tree {
  const files: Record<string, string> = {};
  for (const name of ['tokens.css', 'prose.css', 'composition.css']) {
    files[`src/chassis/${name}`] = read(`examples/showcase/src/chassis/${name}`);
  }
  return { theme, files };
}

/** Waymark with its four hand-tuned status inks removed from both daisyUI blocks. */
function strippedWaymark(): string {
  return read('examples/showcase/src/theme/theme.css').replace(/^\s*--cairn-(?:success|warning|error|info)-ink:[^;]*;\n/gm, '');
}

describe('theme-contrast: registration', () => {
  it('registers as an advisory public-scope rule that reads the import chain', () => {
    expect(themeContrast.id).toBe('theme-contrast');
    expect(themeContrast.tier).toBe('advisory');
    expect(themeContrast.publicScope).toBe(true);
    expect(themeContrast.importChain).toBe(true);
    expect(themeContrast.adminOnly).toBeUndefined();
  });

  it('measures at 4.5:1', () => {
    expect(CONTRAST_FLOOR).toBe(4.5);
  });

  it('passes a clean two-block theme that takes the derived inks', () => {
    expect(run({ theme: acme() })).toEqual([]);
  });
});

describe('theme-contrast: failing fixtures, each raising exactly its finding', () => {
  it('flags a hand-set ink below AA', () => {
    const findings = run({ theme: acme({ set: { '--cairn-error-ink': 'oklch(72% 0.12 27)' } }) });
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('theme-contrast');
    expect(findings[0].tier).toBe('advisory');
    expect(findings[0].message).toContain('--cairn-error-ink');
    expect(findings[0].message).toContain('"acme"');
    expect(findings[0].message).not.toContain('"acme-night"');
    expect(findings[0].message).toContain('4.5:1');
  });

  it('flags a derived ink that passes in the light scheme and fails in the dark one', () => {
    const tree = { theme: acme({}, { set: { '--color-error': 'oklch(22% 0.08 27)', '--color-error-content': 'oklch(95% 0.01 27)' } }) };
    const findings = run(tree);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('--cairn-error-ink');
    expect(findings[0].message).toContain('"acme-night"');
    expect(findings[0].message).not.toContain('"acme"');
  });

  it('flags an ink that fails on the callout tint only', () => {
    const findings = run({
      theme: acme().replace(IMPORTS, `${IMPORTS}@import "./callouts.css";\n`),
      files: {
        'src/theme/callouts.css': '.callout-warning { background: color-mix(in oklab, var(--color-warning) 30%, var(--color-base-100)); }\n',
      },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('--cairn-warning-ink');
    expect(findings[0].message).toContain('callout tint');
    expect(findings[0].message).not.toContain('on --color-base-100');
    expect(findings[0].message).not.toContain('on --color-base-200');
  });

  it('flags a role on its -content below AA', () => {
    const findings = run({ theme: acme({ set: { '--color-primary-content': 'oklch(62% 0.04 248)' } }) });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('--color-primary-content on --color-primary');
    expect(findings[0].message).toContain('"acme"');
  });

  it('reports a relative color as unmeasured, never a pass or a crash', () => {
    // acme is the default block, so its value would reach acme-night through :where(:root) unless
    // acme-night sets its own.
    const findings = run({
      theme: acme(
        { set: { '--cairn-info-ink': 'oklch(from var(--color-info) calc(l - 0.2) c h)' } },
        { set: { '--cairn-info-ink': 'oklch(80% 0.1 235)' } }
      ),
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('unmeasured');
    expect(findings[0].message).toContain('--cairn-info-ink');
    expect(findings[0].message).toContain('"acme"');
  });

  it('reports a three-operand mix as unmeasured', () => {
    const findings = run({
      theme: acme({}, { set: { '--cairn-success-ink': 'color-mix(in oklab, var(--color-success) 30%, var(--color-base-content) 30%, white)' } }),
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('unmeasured');
    expect(findings[0].message).toContain('"acme-night"');
  });
});

describe('theme-contrast: the scheme model', () => {
  it('names the block a failing ink sits in, never a hard-coded scheme name', () => {
    // The warning ink is also the code ramp's number color, so it fails on the code ground too.
    const findings = run({ theme: acme({}, { set: { '--cairn-warning-ink': 'oklch(55% 0.1 76)' } }) });
    expect(findings).toHaveLength(2);
    expect(findings[1].message).toContain('--cairn-code-number on --cairn-code-bg');
    expect(findings[0].message).toContain('"acme-night"');
    expect(findings[0].message).not.toContain('"cairn');
    expect(findings[0].file).toBe('src/theme/theme.css');
  });

  it('fills a key a secondary block omits with the default block\'s value', () => {
    // acme-night leaves out its error-content, so the default block's near-white content sits on
    // the dark scheme's light error fill, and that is the pair the finding measures.
    const findings = run({ theme: acme({}, { omit: ['--color-error-content'] }) });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('--color-error-content on --color-error');
    expect(findings[0].message).toContain('"acme-night"');
    const { srgb } = dualGamutRatio(LIGHT['--color-error-content'], DARK['--color-error']);
    expect(findings[0].message).toContain(`${srgb.toFixed(2)}:1`);
  });

  it('applies a prefers-color-scheme rule to the dark block\'s system state', () => {
    const rule = '@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) {\n    --cairn-warning-ink: oklch(45% 0.1 76);\n  }\n}\n';
    expect(run({ theme: acme() })).toEqual([]);
    // The warning ink is also the code ramp's number color, so it fails on the code ground too.
    const findings = run({ theme: `${acme()}${rule}` });
    expect(findings).toHaveLength(2);
    expect(findings[1].message).toContain('--cairn-code-number on --cairn-code-bg');
    expect(findings[0].message).toContain('--cairn-warning-ink');
    expect(findings[0].message).toContain('"acme-night"');
    expect(findings[0].message).toContain('no data-theme');
  });

  it('completes a partial block named after a built-in theme from daisyUI\'s own values', () => {
    const theme = `${IMPORTS}@plugin "daisyui/theme" {\n  name: "nord";\n  default: true;\n  --color-primary: oklch(45% 0.1 248);\n}\n`;
    const measured = measure({ theme });
    expect(measured.schemes.map((scheme) => scheme.name)).toEqual(['nord']);
    expect(measured.schemes[0].measured).toBe(measured.schemes[0].expected);
  });

  it('raises one finding when the chain holds no theme block, since nothing was measured', () => {
    const findings = run({ theme: IMPORTS });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('no daisyUI theme block');
  });
});

/** One default block over the light palette on a pure white page, the only block in the chain. */
function solo(extra = '', set: Record<string, string> = {}): Tree {
  return { theme: `${IMPORTS}${block('acme', LIGHT, { isDefault: true, set: { '--color-base-100': '#ffffff', ...set } })}${extra}` };
}

/** The finding text for body text at #eeeeee on a pure white page. */
const PALE_ON_WHITE = '--color-base-content on --color-base-100 is 1.16:1';

describe('theme-contrast: daisyUI blocks the scheme model once dropped', () => {
  it('passes the single-block baseline the fixtures below build on', () => {
    expect(run(solo())).toEqual([]);
  });

  it("measures an unnamed block under daisyUI's own default name", () => {
    const unnamed = block('x', LIGHT, { isDefault: true, set: { '--color-base-100': '#ffffff', '--color-base-content': '#eeeeee' } }).replace(
      '  name: "x";\n',
      ''
    );
    const findings = run({ theme: `${IMPORTS}${unnamed}${block('acme-night', DARK, { prefersDark: true })}` });
    const own = findings.filter((finding) => finding.message.includes('"custom-theme"'));
    expect(own.some((finding) => finding.message.includes(PALE_ON_WHITE))).toBe(true);
  });

  it('measures a block whose root is html, the way it measures one on :root', () => {
    const html = block('acme-alt', LIGHT, { set: { '--color-base-100': '#ffffff', '--color-base-content': '#eeeeee' } }).replace(
      '  default: false;',
      '  root: "html";\n  default: false;'
    );
    const findings = run({ theme: `${solo().theme}${html}` });
    expect(findings.some((finding) => finding.message.includes('"acme-alt"') && finding.message.includes(PALE_ON_WHITE))).toBe(true);
  });

  it('reports a block whose root the model cannot read as unmeasured, never dropped', () => {
    const classed = block('acme-alt', LIGHT, { set: { '--color-base-content': '#eeeeee' } }).replace(
      '  default: false;',
      '  root: ".dark";\n  default: false;'
    );
    const measured = measure({ theme: `${solo().theme}${classed}` });
    expect(measured.schemes.map((scheme) => scheme.name)).toEqual(['acme', 'acme-alt']);
    const findings = run({ theme: `${solo().theme}${classed}` });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('"acme-alt"');
    expect(findings[0].message).toContain('unmeasured');
    expect(findings[0].message).toContain('.dark');
  });
});

describe('theme-contrast: root overrides outside the plain form', () => {
  it.each([
    ['a prefers-color-scheme media query nested inside :root', ':root {\n  @media (prefers-color-scheme: dark) {\n    --color-base-content: #eeeeee;\n  }\n}\n'],
    ['a screen media query that also tests prefers-color-scheme', '@media screen and (prefers-color-scheme: dark) {\n  :root {\n    --color-base-content: #eeeeee;\n  }\n}\n'],
    ['an all media query that also tests prefers-color-scheme', '@media all and (prefers-color-scheme: dark) {\n  :root {\n    --color-base-content: #eeeeee;\n  }\n}\n'],
    ['a data-theme test nested inside :root', ':root {\n  &[data-theme="acme"] {\n    --color-base-content: #eeeeee;\n  }\n}\n'],
  ])('applies %s', (_label, css) => {
    expect(run(solo(css)).some((finding) => finding.message.includes(PALE_ON_WHITE))).toBe(true);
  });

  it('confines a nested dark query to the dark state', () => {
    const findings = run(solo(':root {\n  @media (prefers-color-scheme: dark) {\n    --color-base-content: #eeeeee;\n  }\n}\n'));
    const pale = findings.find((finding) => finding.message.includes(PALE_ON_WHITE));
    expect(pale?.message).toContain(`${PALE_ON_WHITE} in sRGB and 1.16:1 in display-p3 (with no data-theme on a dark OS)`);
  });

  it.each([
    ['a width query', '@media (min-width: 40rem) {\n  :root {\n    --color-base-content: #eeeeee;\n  }\n}\n', 'min-width'],
    ['a width query nested inside :root', ':root {\n  @media (min-width: 40rem) {\n    --color-base-content: #eeeeee;\n  }\n}\n', 'min-width'],
    ['a class on the root', ':root.dark {\n  --color-base-content: #eeeeee;\n}\n', ':root.dark'],
    ['a container query', '@container (min-width: 40rem) {\n  :root {\n    --color-base-content: #eeeeee;\n  }\n}\n', '@container'],
  ])('reports a pair read under %s as unmeasured, never passed', (_label, css, named) => {
    const findings = run(solo(css));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('unmeasured');
    expect(findings[0].message).toContain(named);
    expect(findings[0].message).toContain('--color-base-content on --color-base-100');
  });

  it('reports a pair whose value reads an unmodeled property through a var() chain as unmeasured', () => {
    const findings = run(solo('@media (min-width: 40rem) {\n  :root {\n    --color-info: #eeeeee;\n  }\n}\n'));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('unmeasured');
    expect(findings[0].message).toContain('--cairn-info-ink on --color-base-100');
    expect(findings[0].message).toContain('--color-info-content on --color-info');
  });

  it('raises nothing for an unmodeled override of a property no pair reads', () => {
    expect(run(solo('@media (min-width: 40rem) {\n  :root {\n    --flow-space: 2rem;\n  }\n}\n'))).toEqual([]);
  });

  it('never applies a negated @supports block', () => {
    expect(run(solo('@supports not (color: oklch(0 0 0)) {\n  :root {\n    --color-base-content: #eeeeee;\n  }\n}\n'))).toEqual([]);
  });

  it('still applies a positive @supports block', () => {
    const findings = run(solo('@supports (color: oklch(0 0 0)) {\n  :root {\n    --color-base-content: #eeeeee;\n  }\n}\n'));
    expect(findings.some((finding) => finding.message.includes(PALE_ON_WHITE))).toBe(true);
  });

  it('never applies a print query', () => {
    expect(run(solo('@media print {\n  :root {\n    --color-base-content: #eeeeee;\n  }\n}\n'))).toEqual([]);
  });

  it('leaves a descendant of the root alone', () => {
    expect(run(solo(':root .card {\n  --color-base-content: #eeeeee;\n}\n'))).toEqual([]);
  });
});

describe('theme-contrast: callout tints outside the read form', () => {
  const tinted = (background: string): Tree => ({
    theme: acme().replace(IMPORTS, `${IMPORTS}@import "./callouts.css";\n`),
    files: { 'src/theme/callouts.css': `.callout-warning { background: ${background}; }\n` },
  });
  const readable = measure(tinted('color-mix(in oklab, var(--color-warning) 9%, var(--color-base-100))'));

  it.each([
    ['swapped operands', 'color-mix(in oklab, var(--color-base-100), var(--color-warning) 9%)'],
    ['an srgb mix', 'color-mix(in srgb, var(--color-warning) 9%, var(--color-base-100))'],
  ])('keeps the tint pair, unmeasured, for %s', (_label, background) => {
    const measured = measure(tinted(background));
    for (const [index, scheme] of measured.schemes.entries()) {
      expect(scheme.expected).toBe(readable.schemes[index].expected);
      expect(scheme.measured).toBe(readable.schemes[index].measured - 1);
    }
    const findings = run(tinted(background));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((finding) => finding.message.includes('unmeasured'))).toBe(true);
    expect(findings[0].message).toContain('--cairn-warning-ink on the warning callout tint');
  });
});

describe('theme-contrast: code roles and the focus ring', () => {
  it('measures each code role on the code ground', () => {
    const findings = run({ theme: acme({ set: { '--cairn-code-keyword': 'oklch(85% 0.05 248)' } }) });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('--cairn-code-keyword on --cairn-code-bg');
    expect(findings[0].message).toContain('4.5:1');
  });

  it('measures the focus ring on base-100 and base-200 at 3:1', () => {
    const findings = run({ theme: acme({ set: { '--color-primary': 'oklch(88% 0.05 248)', '--color-primary-content': 'oklch(20% 0.05 248)' } }) });
    const ring = findings.find((finding) => finding.message.includes('below 3:1'));
    expect(ring?.message).toContain('--color-primary on --color-base-100 as a focus ring');
    expect(ring?.message).toContain('--color-primary on --color-base-200 as a focus ring');
  });

  it('adds nine pairs to each scheme: seven code roles and two focus-ring grounds', () => {
    for (const scheme of measure({ theme: acme() }).schemes) {
      expect(scheme.expected).toBe(30);
      expect(scheme.measured).toBe(30);
    }
  });
});

describe('theme-contrast: the showcase', () => {
  it('passes Waymark in every scheme, measuring the full pair list in each', () => {
    const tree = showcaseTree();
    expect(run(tree)).toEqual([]);
    const measured = measure(tree);
    expect(measured.schemes.map((scheme) => scheme.name)).toEqual(['cairn', 'cairn-dark']);
    for (const scheme of measured.schemes) {
      // Two base-content grounds, primary on base-100, eight role/-content pairs, muted on two
      // grounds, four inks on two grounds, the three statuses prose.css tints, seven code roles on
      // the code ground, and the focus ring on two grounds.
      expect(scheme.expected).toBe(33);
      expect(scheme.measured).toBe(33);
    }
  });

  it('passes Waymark with its four ink overrides stripped, in both schemes', () => {
    const stripped = strippedWaymark();
    expect(stripped).not.toContain('--cairn-success-ink:');
    const tree = showcaseTree(stripped);
    expect(run(tree)).toEqual([]);
    for (const scheme of measure(tree).schemes) expect(scheme.measured).toBe(33);
  });

  it('passes the cairn-theme overlay layered after the theme', () => {
    const tree = showcaseTree();
    const overlay = { ...tree, files: { ...tree.files, 'cairn.css': read('examples/cairn-theme/cairn.css') }, entries: ['src/theme/theme.css', 'cairn.css'] };
    expect(run(overlay)).toEqual([]);
    for (const scheme of measure(overlay).schemes) expect(scheme.measured).toBe(33);
  });

  it('reads the overlay\'s important base ladder, so a failing overlay value is caught', () => {
    const tree = showcaseTree();
    const broken = read('examples/cairn-theme/cairn.css').replace(
      '--color-base-100: oklch(98.4% 0.0035 80) !important;',
      '--color-base-100: oklch(55% 0.0035 80) !important;'
    );
    const findings = run({ ...tree, files: { ...tree.files, 'cairn.css': broken }, entries: ['src/theme/theme.css', 'cairn.css'] });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((finding) => finding.message.includes('"cairn"'))).toBe(true);
  });
});

describe('theme-contrast: the peer', () => {
  it('fails with a named message when daisyui is not installed', () => {
    const missing: PeerAccess = { ...REAL_PEERS, resolve: (specifier, root) => (specifier.startsWith('daisyui') ? undefined : REAL_PEERS.resolve(specifier, root)) };
    expect(() => run({ theme: acme() }, missing)).toThrow(/daisyui is not installed.*npm install --save-dev daisyui/);
  });
});
