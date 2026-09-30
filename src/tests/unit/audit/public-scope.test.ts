import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, resolveConfig } from '../../../lib/audit/config.js';
import { runStatic } from '../../../lib/audit/run.js';
import { exitCodeFor, formatReport } from '../../../lib/audit/report.js';
import { staticRules } from '../../../lib/audit/rules/static/index.js';
import { publicLiterals } from '../../../lib/audit/rules/static/public-literals.js';
import type { StaticRule, StaticRuleContext } from '../../../lib/audit/types.js';

/** The registry without the public-scope rules, for a tree that holds admin files only. */
const adminRules = () => staticRules().filter((rule) => !rule.publicScope);

/**
 * The two rules whose scope split these tests read. The theme rules read daisyUI and Tailwind from
 * the audited root, which a temporary fixture site does not install.
 */
const scopeSplitRules = () => staticRules().filter((rule) => rule.id === 'token-colors' || rule.id === 'public-literals');

const REPO = fileURLToPath(new URL('../../../../', import.meta.url));

let siteRoot: string;

/** Write a file under a temporary site, creating its directory. */
function put(root: string, path: string, source: string): void {
  mkdirSync(join(root, path, '..'), { recursive: true });
  writeFileSync(join(root, path), source);
}

/** A rule that resolves over the public scope and records the context it received. */
function publicProbe(seen: StaticRuleContext[]): StaticRule {
  return {
    id: 'probe-public',
    tier: 'advisory',
    publicScope: true,
    check(ctx) {
      seen.push(ctx);
      return [];
    },
  };
}

/** A rule over the admin static scope that records every component and CSS file it received. */
function staticProbe(seen: StaticRuleContext[]): StaticRule {
  return {
    id: 'probe-static',
    tier: 'advisory',
    check(ctx) {
      seen.push(ctx);
      return [];
    },
  };
}

beforeAll(() => {
  siteRoot = mkdtempSync(join(tmpdir(), 'cairn-audit-public-'));
  put(siteRoot, 'dist/admin/cairn-admin.css', '.card { border: 1px solid black }');
  put(siteRoot, 'src/routes/admin/posts/+page.svelte', '<div class="card"></div>\n<style>\n.a { color: #abc; }\n</style>\n');
  put(siteRoot, 'src/routes/+page.svelte', '<div class="card"></div>\n<style>\n.b { color: #def; }\n</style>\n');
  put(siteRoot, 'src/theme/theme.css', ':root { --site-tint: #abc; }\n');
  put(siteRoot, 'src/chassis/tokens.css', '@theme { --text-sm: 0.875rem; }\n');
  put(siteRoot, 'src/lib/admin/Shell.svelte', '<div class="card"></div>\n');
});

afterAll(() => {
  rmSync(siteRoot, { recursive: true, force: true });
});

describe('the public scope in a run', () => {
  it('hands a public-scope rule the public files and CSS, and never an admin file', () => {
    const seen: StaticRuleContext[] = [];
    runStatic(loadConfig(siteRoot), [publicProbe(seen)]);
    expect(seen).toHaveLength(1);
    expect(seen[0].files.map((file) => file.file)).toEqual(['src/routes/+page.svelte']);
    expect((seen[0].cssFiles ?? []).map((file) => file.file).sort()).toEqual([
      'src/chassis/tokens.css',
      'src/theme/theme.css',
    ]);
  });

  it('keeps a public file out of the static scope, so no file answers to two grammars', () => {
    const publicSeen: StaticRuleContext[] = [];
    const staticSeen: StaticRuleContext[] = [];
    runStatic(loadConfig(siteRoot), [publicProbe(publicSeen), staticProbe(staticSeen)]);
    const publicFiles = new Set(publicSeen[0].files.map((file) => file.file));
    for (const file of staticSeen[0].files) expect(publicFiles.has(file.file)).toBe(false);
    expect(staticSeen[0].files.map((file) => file.file).sort()).toEqual([
      'src/lib/admin/Shell.svelte',
      'src/routes/admin/posts/+page.svelte',
    ]);
  });

  it('counts public files in the report, on top of the static scan', () => {
    const withPublic = runStatic(loadConfig(siteRoot), [publicProbe([])]);
    const withoutPublic = runStatic(loadConfig(siteRoot), [staticProbe([])]);
    expect(withPublic.filesScanned - withoutPublic.filesScanned).toBe(3);
  });

  it('raises token-colors on an admin file and public-literals on a public file, never both on one', () => {
    const report = runStatic(loadConfig(siteRoot), scopeSplitRules());
    const pairs = report.findings
      .filter((finding) => finding.ruleId === 'token-colors' || finding.ruleId === 'public-literals')
      .map((finding) => `${finding.ruleId} ${finding.file}`);
    expect(pairs.sort()).toEqual([
      'public-literals src/routes/+page.svelte',
      'token-colors src/routes/admin/posts/+page.svelte',
    ]);
  });

  it('fails naming public.scope when a public rule runs over a tree with no public file', () => {
    const bare = mkdtempSync(join(tmpdir(), 'cairn-audit-public-empty-'));
    try {
      put(bare, 'dist/admin/cairn-admin.css', '.card { border: 1px solid black }');
      put(bare, 'src/routes/admin/+page.svelte', '<div class="card"></div>\n');
      expect(() => runStatic(loadConfig(bare), staticRules())).toThrow(/public\.scope/);
      expect(() => runStatic(loadConfig(bare), [publicProbe([])])).toThrow(/public scan matched no files/);
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });

  it('never raises the empty-scope error when no selected rule reads the public scope', () => {
    const bare = mkdtempSync(join(tmpdir(), 'cairn-audit-public-none-'));
    try {
      put(bare, 'dist/admin/cairn-admin.css', '.card { border: 1px solid black }');
      put(bare, 'src/routes/admin/+page.svelte', '<div class="card"></div>\n');
      const report = runStatic(loadConfig(bare), adminRules());
      expect(report.ruleIds).toHaveLength(adminRules().length);
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });

  it('skips a default public root the tree lacks, and throws on a configured one it lacks', () => {
    const seen: StaticRuleContext[] = [];
    // `src/lib/public` and `src/lib/components` are default roots this tree does not carry.
    expect(() => runStatic(loadConfig(siteRoot), [publicProbe(seen)])).not.toThrow();
    const configPath = join(siteRoot, 'missing-public-root.json');
    writeFileSync(configPath, JSON.stringify({ public: { scope: ['src/theme', 'src/nowhere'] } }));
    expect(() => runStatic(loadConfig(siteRoot, configPath), [publicProbe([])])).toThrow(/src\/nowhere/);
  });

  // The two configs that would move an admin file from the error-tier admin rules to the advisory
  // public one if the scopes could overlap: a custom exclusion, and a scope as wide as `src`.
  it.each([
    ['a custom public.exclude', { public: { exclude: ['src/elsewhere'] } }],
    ['public.scope set to src', { public: { scope: ['src'] } }],
  ])('leaves src/routes/admin under token-colors and out of public-literals with %s', (_label, raw) => {
    const configPath = join(siteRoot, 'wide-public.json');
    writeFileSync(configPath, JSON.stringify(raw));
    const report = runStatic(loadConfig(siteRoot, configPath), scopeSplitRules());
    const adminFindings = report.findings.filter((finding) => finding.file.startsWith('src/routes/admin'));
    expect(adminFindings.map((finding) => finding.ruleId)).toEqual(['token-colors']);
  });

  it('gives a file under both scopes\' configured roots to the admin rules alone', () => {
    const shared = mkdtempSync(join(tmpdir(), 'cairn-audit-public-shared-'));
    try {
      put(shared, 'dist/admin/cairn-admin.css', '.card { border: 1px solid black }');
      put(shared, 'src/lib/components/Widget.svelte', '<div class="card"></div>\n<style>\n.w { color: #abc; }\n</style>\n');
      put(shared, 'src/theme/theme.css', ':root { --site-tint: #abc; }\n');
      const configPath = join(shared, 'both.json');
      writeFileSync(
        configPath,
        JSON.stringify({
          static: { scope: ['src/lib/components'] },
          public: { scope: ['src/lib/components', 'src/theme'] },
        })
      );
      const report = runStatic(loadConfig(shared, configPath), scopeSplitRules());
      const forWidget = report.findings.filter((finding) => finding.file === 'src/lib/components/Widget.svelte');
      expect(forWidget.map((finding) => finding.ruleId)).toEqual(['token-colors']);
    } finally {
      rmSync(shared, { recursive: true, force: true });
    }
  });

  it('sends a root named only under public.scope to the public rule alone', () => {
    const named = mkdtempSync(join(tmpdir(), 'cairn-audit-public-named-'));
    try {
      put(named, 'dist/admin/cairn-admin.css', '.card { border: 1px solid black }');
      put(named, 'src/lib/admin-toolkit/Field.svelte', '<div class="card"></div>\n<style>\n.f { color: #abc; }\n</style>\n');
      put(named, 'src/routes/admin/+page.svelte', '<div class="card"></div>\n');
      const configPath = join(named, 'public-named.json');
      writeFileSync(configPath, JSON.stringify({ public: { scope: ['src/lib/admin-toolkit'] } }));
      const report = runStatic(loadConfig(named, configPath), scopeSplitRules());
      const forField = report.findings.filter((finding) => finding.file === 'src/lib/admin-toolkit/Field.svelte');
      expect(forField.map((finding) => finding.ruleId)).toEqual(['public-literals']);
    } finally {
      rmSync(named, { recursive: true, force: true });
    }
  });

  /** A public rule that asks for the import chain and records what it received. */
  function chainProbe(seen: StaticRuleContext[]): StaticRule {
    return { ...publicProbe(seen), id: 'probe-chain', importChain: true };
  }

  it('hands the import chain only to a rule that asks for it', () => {
    const asked: StaticRuleContext[] = [];
    const notAsked: StaticRuleContext[] = [];
    runStatic(loadConfig(siteRoot), [chainProbe(asked), publicProbe(notAsked)]);
    expect(asked[0].chain?.files.map((file) => file.file)).toEqual(['src/theme/theme.css']);
    expect(notAsked[0].chain).toBeUndefined();
  });

  it('reports an unread import beside the findings, and prints it without failing the run', () => {
    const site = mkdtempSync(join(tmpdir(), 'cairn-audit-public-unread-'));
    try {
      put(site, 'dist/admin/cairn-admin.css', '.card { border: 1px solid black }');
      put(site, 'src/routes/admin/+page.svelte', '<div class="card"></div>\n');
      put(site, 'src/theme/theme.css', '@import "@fontsource-variable/fraunces/opsz.css";\n:root { --site-tint: red; }\n');
      const report = runStatic(loadConfig(site), [chainProbe([])]);
      expect(report.findings).toEqual([]);
      expect(report.unreadImports).toEqual([
        { file: 'src/theme/theme.css', specifier: '@fontsource-variable/fraunces/opsz.css', reason: 'the package is not installed' },
      ]);
      expect(formatReport(report)).toContain('@fontsource-variable/fraunces/opsz.css (the package is not installed)');
      expect(exitCodeFor(report)).toBe(0);
    } finally {
      rmSync(site, { recursive: true, force: true });
    }
  });

  it('never loads the chain, or reports unread imports, when no selected rule reads it', () => {
    const report = runStatic(loadConfig(siteRoot), [publicProbe([])]);
    expect(report.unreadImports).toBeUndefined();
  });

  it('keeps an admin-only selection clear of the peers a theme rule needs', () => {
    const bare = mkdtempSync(join(tmpdir(), 'cairn-audit-public-peers-'));
    try {
      put(bare, 'dist/admin/cairn-admin.css', '.card { border: 1px solid black }');
      put(bare, 'src/routes/admin/+page.svelte', '<div class="card"></div>\n');
      // No node_modules here: daisyui and tailwindcss are unresolvable, and this run never needs them.
      expect(() => runStatic(loadConfig(bare), adminRules())).not.toThrow();
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });

  describe('the built admin stylesheet', () => {
    /** A theme-only tree: a public file and no admin stylesheet anywhere. */
    function sheetless(): string {
      const root = mkdtempSync(join(tmpdir(), 'cairn-audit-public-nosheet-'));
      put(root, 'src/routes/+page.svelte', '<p class="bg-[#abc]">x</p>\n');
      put(root, 'src/theme/theme.css', ':root { --site-tint: red; }\n');
      return root;
    }

    it('runs a public-only selection with no built stylesheet present', () => {
      const root = sheetless();
      try {
        const report = runStatic(loadConfig(root), [publicLiterals, publicProbe([])]);
        expect(report.ruleIds).toEqual(['public-literals', 'probe-public']);
        expect(report.findings.map((finding) => finding.ruleId)).toEqual(['public-literals']);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it('still fails naming the built stylesheet when a selected rule reads the static scope', () => {
      const root = sheetless();
      try {
        expect(() => runStatic(loadConfig(root), [publicProbe([]), staticProbe([])])).toThrow(
          /the built admin stylesheet is missing/
        );
        expect(() => runStatic(loadConfig(root), adminRules())).toThrow(/the built admin stylesheet is missing/);
        expect(() => runStatic(loadConfig(root), staticRules())).toThrow(/the built admin stylesheet is missing/);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it('hands a non-public rule the parsed sheet, so the full registry reads what it always read', () => {
      const seen: StaticRuleContext[] = [];
      runStatic(loadConfig(siteRoot), [staticProbe(seen)]);
      expect(seen[0].sheet.has('card')).toBe(true);
      const full = runStatic(loadConfig(siteRoot), staticRules().filter((rule) => rule.id !== 'theme-conformance' && rule.id !== 'theme-contrast'));
      expect(full.ruleIds).toContain('token-colors');
      expect(full.ruleIds).toContain('public-literals');
    });
  });

  it('honors a suppression directive in a public file once a public rule runs', () => {
    const quiet = mkdtempSync(join(tmpdir(), 'cairn-audit-public-suppress-'));
    try {
      put(quiet, 'dist/admin/cairn-admin.css', '.card { border: 1px solid black }');
      put(quiet, 'src/routes/admin/+page.svelte', '<div class="card"></div>\n');
      put(
        quiet,
        'src/routes/+page.svelte',
        '<!-- cairn-audit-disable-next-line public-literals -- the swatch is the content -->\n<p class="bg-[#abc]">x</p>\n'
      );
      const report = runStatic(loadConfig(quiet), [publicLiterals]);
      expect(report.findings).toEqual([]);
      expect(report.suppressed.map((finding) => finding.ruleId)).toEqual(['public-literals']);
    } finally {
      rmSync(quiet, { recursive: true, force: true });
    }
  });
});

// The repo-owned config (scripts/checks/public-scope.config.json) is how cairn's own tree runs the
// public scope from the showcase, since the showcase's own config is baked into every scaffolded
// site and a root the tree lacks throws.
describe('the repo-owned public scope over the showcase', () => {
  const showcase = join(REPO, 'examples/showcase');
  const configFile = join(REPO, 'scripts/checks/public-scope.config.json');
  let sheetDir: string;

  beforeAll(() => {
    sheetDir = mkdtempSync(join(tmpdir(), 'cairn-audit-public-sheet-'));
    writeFileSync(join(sheetDir, 'admin.css'), '.card { border: 1px solid black }');
  });

  afterAll(() => {
    rmSync(sheetDir, { recursive: true, force: true });
  });

  /** The showcase config the repo owns, with a stand-in sheet so the run needs no built package. */
  function repoConfig() {
    const raw = JSON.parse(readFileSync(configFile, 'utf8')) as Record<string, unknown>;
    return resolveConfig(showcase, { ...raw, sheet: join(sheetDir, 'admin.css') }, (path) => existsSync(resolve(showcase, path)));
  }

  it('scans the engine\'s public components, PreviewBanner included, and its public stylesheet', () => {
    const seen: StaticRuleContext[] = [];
    const report = runStatic(repoConfig(), [publicProbe(seen)]);
    expect(seen[0].files.map((file) => file.file)).toContain('../../src/lib/public/PreviewBanner.svelte');
    expect((seen[0].cssFiles ?? []).map((file) => file.file)).toContain('../../src/lib/public/cairn-public.css');
    expect(report.filesScanned).toBeGreaterThan(seen[0].files.length);
  });

  it('keeps every engine admin component out of the public scope', () => {
    const seen: StaticRuleContext[] = [];
    runStatic(repoConfig(), [publicProbe(seen)]);
    const scanned = [...seen[0].files.map((file) => file.file), ...(seen[0].cssFiles ?? []).map((file) => file.file)];
    expect(scanned.filter((path) => path.includes('src/lib/admin') || path.includes('src/routes/admin'))).toEqual([]);
  });

  it('reports no public-literals finding in the showcase or the engine\'s public tree', () => {
    const report = runStatic(repoConfig(), [publicLiterals]);
    expect(report.findings.map((finding) => `${finding.file}:${finding.line} ${finding.message}`)).toEqual([]);
  });
});
