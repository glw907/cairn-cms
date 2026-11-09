// The theme check's rules. Each rule reads one theme directory and returns its failures, `{ file,
// message }` pairs; the runner in check.mjs attaches the rule id. A rule never throws on a theme
// defect: a theme another rule already reports as broken (an unreadable manifest, a tokens build
// that cannot run) is skipped, so one defect fails exactly the rule that owns it.
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import { repoRoot } from '../repo-root.mjs';
import { buildTheme, orphanedOptionSheets, validateManifest, validateTokens } from './build-tokens.mjs';
import { CONTRACT, declaredByMode, filesUnder, globRegExp, picksOf } from './theme-contract.mjs';
import { layIn } from './lay-in.mjs';
import { makeShowcaseCopy } from '../lab/theme-fixture-copy.mjs';

const ROOT = repoRoot(import.meta.url);
const CHASSIS = path.join(ROOT, 'examples/showcase/src/chassis');
const ENGINE_PUBLIC_CSS = path.join(ROOT, 'src/lib/public/cairn-public.css');
const FONT_PAIRING_LIMIT = 400 * 1024;

/**
 * What a rule reads.
 * @typedef {object} ThemeContext
 * @property {string} dir the theme directory
 * @property {object | null} manifest the parsed `cairn-theme.json`, or null when unreadable
 */

/**
 * One failure.
 * @typedef {{ file: string, message: string }} Failure
 */

/**
 * Read and parse a JSON file in the theme directory.
 * @param {string} dir
 * @param {string} rel
 * @returns {object | null} null when the file is absent or not JSON
 */
function readJson(dir, rel) {
  try {
    return JSON.parse(readFileSync(path.join(dir, rel), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Read a theme directory's manifest for the rules that need it.
 * @param {string} dir
 * @returns {ThemeContext}
 */
export function themeContext(dir) {
  return { dir: path.resolve(dir), manifest: readJson(dir, 'cairn-theme.json') };
}

/** The manifest's own file name, for failures about it. */
const MANIFEST = 'cairn-theme.json';

/**
 * What a rule returns: its failures, or its failures with notes the report prints beside them.
 * @typedef {Failure[] | { failures: Failure[], notes: string[] }} RuleResult
 */

/** @type {Record<string, (ctx: ThemeContext) => RuleResult | Promise<RuleResult>>} */
export const STATIC_RULES = {
  'manifest-schema'({ manifest }) {
    if (!manifest) return [{ file: MANIFEST, message: 'the manifest is missing or is not JSON' }];
    return validateManifest(manifest)
      .filter((message) => !message.startsWith(`${MANIFEST}/contract `))
      .map((message) => ({ file: MANIFEST, message }));
  },

  'contract-version'({ manifest }) {
    if (!manifest || manifest.contract === CONTRACT.contract) return [];
    return [{ file: MANIFEST, message: `contract ${manifest.contract} is not the version this check reads (${CONTRACT.contract})` }];
  },

  'tokens-schema'({ dir }) {
    // An absent file is `paths-required`'s to report; a file that is there and is not JSON is this rule's.
    const unreadable = ['tokens/tokens.json', 'tokens/resolver.json']
      .filter((rel) => existsSync(path.join(dir, rel)) && readJson(dir, rel) === null)
      .map((rel) => ({ file: rel, message: 'the file is not JSON' }));
    if (unreadable.length) return unreadable;
    const tokens = readJson(dir, 'tokens/tokens.json');
    const resolver = readJson(dir, 'tokens/resolver.json');
    if (!tokens || !resolver) return [];
    return validateTokens({ tokens, resolver }).map((message) => ({ file: 'tokens', message }));
  },

  'resolver-options'({ dir, manifest }) {
    const resolver = readJson(dir, 'tokens/resolver.json');
    if (!manifest || !resolver || !Array.isArray(manifest.options)) return [];
    const failures = [];
    const modifiers = Object.entries(resolver.modifiers ?? {}).filter(([name]) => name !== 'mode');
    const options = new Map(manifest.options.map((option) => [option.key, option]));
    for (const [name, modifier] of modifiers) {
      const option = options.get(name);
      if (!option) {
        failures.push({ file: 'tokens/resolver.json', message: `modifier "${name}" has no option in the manifest` });
        continue;
      }
      const contexts = Object.keys(modifier.contexts ?? {});
      for (const value of option.values) {
        if (!contexts.includes(value.value)) {
          failures.push({ file: 'tokens/resolver.json', message: `option "${name}" value "${value.value}" has no resolver context` });
        }
      }
      for (const context of contexts) {
        if (!option.values.some((value) => value.value === context)) {
          failures.push({ file: 'tokens/resolver.json', message: `modifier "${name}" context "${context}" is not a value of the manifest option` });
        }
      }
    }
    for (const key of options.keys()) {
      if (!modifiers.some(([name]) => name === key)) {
        failures.push({ file: MANIFEST, message: `option "${key}" has no resolver modifier` });
      }
    }
    return failures;
  },

  'paths-required'({ dir, manifest }) {
    const named = manifest
      ? [
          ...(manifest.fonts ?? []).flatMap((font) => font.files ?? []),
          ...(manifest.screenshots ?? []).map((shot) => shot.path),
          ...(manifest.options ?? []).flatMap((option) => (option.values ?? []).map((v) => `options/${option.key}/${v.value}.css`)),
        ]
      : [];
    return [...new Set([...CONTRACT.paths.required, ...named])]
      .filter((rel) => !existsSync(path.join(dir, rel)))
      .map((rel) => ({ file: rel, message: 'a required path is missing' }));
  },

  'paths-unlisted'({ dir }) {
    const allowed = CONTRACT.paths.allowed.map(globRegExp);
    // fonts/ belongs to the `fonts` rule, which says why a file there is refused.
    return filesUnder(dir)
      .filter((file) => !file.startsWith('fonts/') && !allowed.some((re) => re.test(file)))
      .map((file) => ({ file, message: 'the file is not a path contract 1 lists' }));
  },

  async 'tokens-stale'({ dir }) {
    let outputs;
    try {
      outputs = await buildTheme(dir);
    } catch {
      return [];
    }
    const stale = Object.entries(outputs)
      .filter(([rel, text]) => !existsSync(path.join(dir, rel)) || readFileSync(path.join(dir, rel), 'utf8') !== text)
      .map(([rel]) => ({ file: rel, message: 'the built file is stale: run scripts/theme/build-tokens.mjs' }));
    const orphaned = orphanedOptionSheets(dir, outputs).map((rel) => ({ file: rel, message: 'no option value builds this sheet: delete it' }));
    return [...stale, ...orphaned];
  },

  'tokens-required'({ dir, manifest }) {
    if (!manifest?.colorModes || !Array.isArray(manifest.options)) return [];
    const failures = [];
    const seen = new Set();
    for (const pick of picksOf(manifest)) {
      let modes;
      try {
        modes = declaredByMode(dir, manifest, pick);
      } catch {
        return [];
      }
      const label = Object.entries(pick).map(([key, value]) => `${key}=${value}`).join(', ');
      for (const [mode, declared] of Object.entries(modes)) {
        for (const name of CONTRACT.tokens.required) {
          if (declared.has(name)) continue;
          const message = `${name} is not declared in ${mode} mode${label ? ` with ${label}` : ''}`;
          if (!seen.has(message)) failures.push({ file: 'tokens/tokens.css', message });
          seen.add(message);
        }
      }
    }
    return failures;
  },

  'directive-styled'({ dir }) {
    const classes = JSON.parse(readFileSync(path.join(CHASSIS, 'directives/classes.json'), 'utf8'));
    const sheets = styleSheets(dir);
    const failures = [];
    const notes = [];
    for (const [block, cls] of Object.entries(classes)) {
      const sheet = sheets.find((candidate) => candidate.selectors.some((selector) => hasClass(selector, cls)));
      if (sheet) notes.push(`.${cls} (${block}) is styled by ${sheet.name}`);
      else failures.push({ file: 'site.css', message: `the ${block} block's class .${cls} is styled by no sheet the theme loads` });
    }
    return { failures, notes };
  },

  fonts({ dir, manifest }) {
    const failures = [];
    const fontsDir = path.join(dir, 'fonts');
    const fonts = Array.isArray(manifest?.fonts) ? manifest.fonts : [];
    const named = new Map(fonts.flatMap((font) => (font.files ?? []).map((file) => [file, font])));
    if (existsSync(fontsDir)) {
      for (const file of filesUnder(fontsDir).map((f) => `fonts/${f}`)) {
        if (file === 'fonts/fonts.css') continue;
        if (!file.endsWith('.woff2')) failures.push({ file, message: 'a font file must be woff2' });
        else if (!named.has(file)) failures.push({ file, message: 'no manifest font names the file, so it has no license' });
      }
    }
    for (const font of fonts) {
      if (typeof font.license !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9.+() -]*$/.test(font.license)) {
        failures.push({ file: MANIFEST, message: `font "${font.name}" has no SPDX license` });
      }
    }
    // The manifest has no option that selects fonts, so the theme's faces are one pairing.
    const bytes = fonts
      .flatMap((font) => font.files ?? [])
      .reduce((sum, rel) => sum + (existsSync(path.join(dir, rel)) ? statSync(path.join(dir, rel)).size : 0), 0);
    if (bytes > FONT_PAIRING_LIMIT) failures.push({ file: 'fonts', message: `the fonts total ${Math.ceil(bytes / 1024)} KB, over the 400 KB limit for a pairing` });
    return failures;
  },

  'external-host'({ dir }) {
    const failures = [];
    for (const rel of filesUnder(dir)) {
      const file = path.join(dir, rel);
      if (rel.endsWith('.css')) {
        const root = postcss.parse(readFileSync(file, 'utf8'));
        root.walkAtRules('import', (rule) => {
          const url = /^(?:url\()?["']?([^"')\s]+)/.exec(rule.params)?.[1];
          if (url && isExternal(url)) failures.push({ file: rel, message: `@import of ${url} reaches another host` });
        });
        root.walkDecls((decl) => {
          for (const match of decl.value.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
            if (isExternal(match[1])) failures.push({ file: rel, message: `url(${match[1]}) reaches another host` });
          }
        });
      } else if (rel.endsWith('.svelte') || (rel.startsWith('components/') && rel.endsWith('.ts'))) {
        for (const match of readFileSync(file, 'utf8').matchAll(/\b(src|href)\s*=\s*["']([^"']+)["']/g)) {
          if (isExternal(match[2])) failures.push({ file: rel, message: `${match[1]}="${match[2]}" reaches another host` });
        }
      }
    }
    return failures;
  },

  async audit({ dir }) {
    const audit = await import('../../dist/audit/index.js');
    const raw = JSON.parse(readFileSync(path.join(ROOT, 'scripts/checks/public-scope.config.json'), 'utf8'));
    const copy = makeShowcaseCopy({ root: ROOT });
    try {
      layIn(dir, copy.dir);
      const retarget = (p) => (p.startsWith('../../') ? p.slice(3) : p);
      const file = { ...raw, public: { ...raw.public, scope: raw.public.scope.map(retarget), themeRoots: raw.public.themeRoots.map(retarget) } };
      const config = audit.resolveConfig(copy.dir, file, (candidate) => existsSync(path.join(copy.dir, candidate)));
      const rules = audit.selectRules(audit.staticRules(), ['theme-contrast', 'theme-conformance', 'public-literals']);
      const report = audit.runStatic(config, rules);
      const failures = report.findings.map((finding) => ({
        file: finding.file,
        message: `${finding.ruleId} line ${finding.line}: ${finding.message}`,
      }));
      const measured = report.measured.filter((entry) => entry.themes.length > 0);
      if (measured.length === 0) failures.push({ file: 'theme.css', message: 'the audit measured nothing: no daisyUI theme block was read' });
      return failures;
    } finally {
      copy.remove();
    }
  },
};

/**
 * Whether a URL reaches another host: it has a scheme or starts with `//`.
 * @param {string} url
 * @returns {boolean}
 */
function isExternal(url) {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(url.trim());
}

/**
 * Whether a selector names a class as a whole token.
 * @param {string} selector
 * @param {string} cls
 * @returns {boolean}
 */
function hasClass(selector, cls) {
  return new RegExp(`\\.${cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`).test(selector);
}

/**
 * The selectors of every sheet a theme's pages load: the chassis sheets, the engine's public sheet,
 * and each CSS file in the theme directory, each with the name a failure report can cite.
 * @param {string} dir
 * @returns {{ name: string, selectors: string[] }[]}
 */
function styleSheets(dir) {
  const files = [
    ...filesUnder(CHASSIS).filter((rel) => rel.endsWith('.css')).map((rel) => path.join(CHASSIS, rel)),
    ENGINE_PUBLIC_CSS,
    ...filesUnder(dir).filter((rel) => rel.endsWith('.css')).map((rel) => path.join(dir, rel)),
  ];
  return files.map((file) => {
    /** @type {string[]} */
    const selectors = [];
    postcss.parse(readFileSync(file, 'utf8')).walkRules((rule) => selectors.push(rule.selector));
    return { name: path.relative(ROOT, file), selectors };
  });
}
