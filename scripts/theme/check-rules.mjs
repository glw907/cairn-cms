// The theme check's rules. Each rule reads one theme directory and returns its failures, `{ file,
// message }` pairs; the runner in check.mjs attaches the rule id. A rule never throws on a theme
// defect: a theme another rule already reports as broken (an unreadable manifest, a tokens build
// that cannot run) is skipped, so one defect fails exactly the rule that owns it.
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import semver from 'semver';
import { repoRoot } from '../repo-root.mjs';
import { buildTheme, orphanedOptionSheets, validateManifest, validateTokens } from './build-tokens.mjs';
import { CONTRACT, declaredByMode, filesUnder, globRegExp, picksOf } from './theme-contract.mjs';
import { layIn } from './lay-in.mjs';
import { makeShowcaseCopy } from '../lab/theme-fixture-copy.mjs';

const ROOT = repoRoot(import.meta.url);
const CHASSIS = path.join(ROOT, 'examples/showcase/src/chassis');
const ENGINE_PUBLIC_CSS = path.join(ROOT, 'src/lib/public/cairn-public.css');
const FONT_PAIRING_LIMIT = 400 * 1024;
/** The two forms an `engine` range may take, read from the manifest schema so the two never differ. */
const ENGINE_FORM = new RegExp(
  JSON.parse(readFileSync(path.join(ROOT, 'schema/cairn-theme-1.schema.json'), 'utf8')).properties.engine.pattern,
);

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

/** The one path `paths-unlisted` admits beyond contract 1's list: a README at the theme root. */
const THEME_README = 'README.md';

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

  'engine-range'({ manifest }) {
    // A range outside the two forms is `manifest-schema`'s to report, so this rule judges only the
    // engine version the range must admit. Plain precedence applies, so `>=0.99.0-0` admits a prerelease.
    // The range may instead admit only the next prerelease of this engine: a theme that needs this
    // repository's unreleased engine work publishes before that prerelease exists, and its manifest,
    // which is permanent, must not tell a site on the current release that it can run the theme.
    // Nothing later is admitted, so a range can never get ahead of the engine it ships beside.
    if (typeof manifest?.engine !== 'string' || !ENGINE_FORM.test(manifest.engine)) return [];
    const engine = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
    const admitted = [engine, semver.inc(engine, 'prerelease')];
    if (admitted.some((version) => semver.satisfies(version, manifest.engine, { includePrerelease: true }))) return [];
    return [{ file: MANIFEST, message: `engine "${manifest.engine}" does not admit this repository's engine ${engine}` }];
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
    // fonts/ belongs to the `fonts` rule, which says why a file there is refused. A README.md at the
    // theme root is admitted beside contract 1's paths, which do not list it: it is where a theme
    // tells a developer how to set it up, and lay-in copies it into the site's src/theme/, where
    // nothing imports it.
    return filesUnder(dir)
      .filter((file) => !file.startsWith('fonts/') && file !== THEME_README && !allowed.some((re) => re.test(file)))
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

  // A theme with options is audited once per value of each option, the other options at their
  // defaults, because each value's sheet sets its own colors and the site's chain never reads them:
  // the audit adds the value's sheet to the chain after theme.css. Each finding that names a daisyUI
  // block is prefixed with the value and the block's mode. A finding that names no block is
  // prefixed with the value, or reported once, unprefixed, when every value raises it. The notes give each value's measured and unmeasured pair counts per
  // mode, since a passing run must show it measured something under every value.
  async audit({ dir, manifest }) {
    const audit = await import('../../dist/audit/index.js');
    const copy = makeShowcaseCopy({ root: ROOT });
    try {
      layIn(dir, copy.dir);
      const picks = optionPicks(dir, manifest);
      if (picks.length === 0) return auditChain(audit, copy.dir, [THEME_SHEET]).map(({ failure }) => failure);
      const modeOf = new Map(Object.entries(manifest.colorModes ?? {}).map(([mode, block]) => [block, mode]));
      /** @type {Map<string, { failure: Failure, labels: string[] }>} */
      const unscoped = new Map();
      const failures = [];
      const notes = [];
      for (const { label, sheets } of picks) {
        const options = sheets.map((rel) => withoutHasSelectors(readFileSync(path.join(dir, rel), 'utf8'))).join('\n');
        writeFileSync(path.join(copy.dir, OPTIONS_SHEET), options);
        const chain = [THEME_SHEET, OPTIONS_SHEET];
        for (const { failure, block } of auditChain(audit, copy.dir, chain)) {
          if (block === undefined) {
            const key = `${failure.file}|${failure.message}`;
            const entry = unscoped.get(key) ?? { failure, labels: [] };
            entry.labels.push(label);
            unscoped.set(key, entry);
          } else {
            failures.push({ file: failure.file, message: `${label} ${modeOf.get(block) ?? block} ${failure.message}` });
          }
        }
        for (const [mode, count] of pairCounts(audit, copy.dir, chain, modeOf)) {
          notes.push(`${label} ${mode}: ${count.measured} pairs measured, ${count.unmeasured} unmeasured`);
        }
      }
      for (const { failure, labels } of unscoped.values()) {
        if (labels.length === picks.length) failures.push(failure);
        else for (const label of labels) failures.push({ file: failure.file, message: `${label} ${failure.message}` });
      }
      return { failures, notes };
    } finally {
      copy.remove();
    }
  },
};

/** The theme's entry stylesheet in a site, the first link of the chain the audit reads. */
const THEME_SHEET = 'src/theme/theme.css';
/** Where a site keeps the option sheets it loads, the file the audit writes each value's sheet to. */
const OPTIONS_SHEET = 'src/site/theme-options.css';

/**
 * Each option value the audit measures: the value's label and the option sheets its run loads,
 * that value's sheet beside each other option's default. Empty for a theme with no options, and
 * for a theme whose manifest or sheets other rules report as broken.
 * @param {string} dir
 * @param {any} manifest
 * @returns {{ label: string, sheets: string[] }[]}
 */
function optionPicks(dir, manifest) {
  const options = Array.isArray(manifest?.options) ? manifest.options : [];
  const sheet = (key, value) => `options/${key}/${value}.css`;
  const picks = options.flatMap((option) =>
    (option.values ?? []).map(({ value }) => ({
      label: `${option.key}=${value}`,
      sheets: options.map((other) => sheet(other.key, other.key === option.key ? value : other.default)),
    })),
  );
  // A missing sheet is `paths-required`'s to report.
  if (picks.some((pick) => pick.sheets.some((rel) => !existsSync(path.join(dir, rel))))) return [];
  return picks;
}

/**
 * An option sheet with every selector that holds `:has(` dropped, and each rule left with none
 * removed. The audit's scheme model cannot place a `:has()` selector and would record each pair it
 * sets as unmeasured, while the same rule's `:where(:root)` and `[data-theme]` selectors carry the
 * same declarations, so dropping them loses no value the audit should measure.
 * @param {string} css
 * @returns {string}
 */
function withoutHasSelectors(css) {
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    const kept = rule.selectors.filter((selector) => !selector.includes(':has('));
    if (kept.length === 0) rule.remove();
    else rule.selectors = kept;
  });
  return root.toString();
}

/**
 * Run the audit's public rules over a site copy with the given public stylesheet chain. Each
 * failure carries the daisyUI block a `theme-contrast` finding names, when it names one.
 * @param {any} audit the `dist/audit` module
 * @param {string} siteDir
 * @param {string[]} stylesheets
 * @returns {{ failure: Failure, block?: string }[]}
 */
function auditChain(audit, siteDir, stylesheets) {
  const raw = JSON.parse(readFileSync(path.join(ROOT, 'scripts/checks/public-scope.config.json'), 'utf8'));
  const retarget = (p) => (p.startsWith('../../') ? p.slice(3) : p);
  const file = { ...raw, public: { ...raw.public, scope: raw.public.scope.map(retarget), themeRoots: raw.public.themeRoots.map(retarget) } };
  // The chain is set on the resolved config, not in the file, so a missing theme.css stays an
  // unread entry, which `paths-required` reports, rather than a configured path the run throws on.
  const config = { ...audit.resolveConfig(siteDir, file, (candidate) => existsSync(path.join(siteDir, candidate))), publicStylesheets: stylesheets };
  const rules = audit.selectRules(audit.staticRules(), ['theme-contrast', 'theme-conformance', 'public-literals']);
  const report = audit.runStatic(config, rules);
  const out = report.findings.map((finding) => ({
    failure: { file: finding.file, message: `${finding.ruleId} line ${finding.line}: ${finding.message}` },
    block: finding.ruleId === 'theme-contrast' ? /^theme "([^"]+)":/.exec(finding.message)?.[1] : undefined,
  }));
  if (!report.measured.some((entry) => entry.themes.length > 0)) {
    out.push({ failure: { file: 'theme.css', message: 'the audit measured nothing: no daisyUI theme block was read' } });
  }
  return out;
}

/**
 * The contrast pairs measured and unmeasured in every root state, summed per color mode. A block
 * the manifest's `colorModes` does not name counts under its own name.
 * @param {any} audit the `dist/audit` module
 * @param {string} siteDir
 * @param {string[]} stylesheets
 * @param {Map<string, string>} modeOf each daisyUI block name's color mode
 * @returns {Map<string, { measured: number, unmeasured: number }>}
 */
function pairCounts(audit, siteDir, stylesheets, modeOf) {
  const chain = audit.loadImportChain(siteDir, stylesheets);
  const { themes } = audit.loadDaisyThemeKeys(siteDir, audit.nodePeers, 'read its built-in theme values to count the measured pairs');
  const counts = new Map();
  for (const scheme of audit.measureThemeContrast(chain.files, themes, stylesheets[0]).schemes) {
    const mode = modeOf.get(scheme.name) ?? scheme.name;
    const count = counts.get(mode) ?? { measured: 0, unmeasured: 0 };
    count.measured += scheme.measured;
    count.unmeasured += scheme.expected - scheme.measured;
    counts.set(mode, count);
  }
  return counts;
}

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
