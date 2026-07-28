// cairn-audit's static runner: assemble the substrates once, hand every registered rule the same
// context, and return one report. The runner reads the filesystem; the rules do not, which is what
// keeps the rule core pure and testable against fixtures.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseComponent } from './markup.js';
import { parseSheet } from './sheet.js';
import { applySuppressions } from './suppress.js';
import { staticRules } from './rules/static/index.js';
import { CONFIG_FILE } from './config.js';
import type { Dirent } from 'node:fs';
import type { AuditConfig } from './config.js';
import type { ParsedComponent } from './markup.js';
import type { AuditReport, CssSource, Finding, StaticRule } from './types.js';

/** Every `.svelte` file under a directory, recursively, as paths relative to the audited root. */
function componentPaths(root: string, dir: string): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(resolve(root, dir), { withFileTypes: true });
  } catch {
    // A scan-scope path a given tree does not have. The default scope spans the library and a
    // consumer site, so an absent directory is the normal case rather than a misconfiguration.
    return [];
  }
  return entries.flatMap((entry) => {
    const relPath = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return componentPaths(root, relPath);
    return entry.name.endsWith('.svelte') ? [relPath] : [];
  });
}

function parseAll(config: AuditConfig): ParsedComponent[] {
  const seen = new Set<string>();
  const files: ParsedComponent[] = [];
  for (const dir of config.staticScope) {
    // A configured scan path is a promise the tree holds that directory. Honoring a misspelled one
    // as an empty scan is the silent green the spec rejected the ESLint route over: nothing was
    // audited and the exit code says everything passed.
    if (config.staticScopeFromConfig && !existsSync(resolve(config.root, dir))) {
      throw new Error(`${dir}: the configured static scan scope does not exist (${CONFIG_FILE}, static.scope)`);
    }
    for (const path of componentPaths(config.root, dir)) {
      if (seen.has(path)) continue;
      seen.add(path);
      files.push(parseComponent(path, readFileSync(resolve(config.root, path), 'utf8')));
    }
  }
  return files;
}

/** The standalone CSS files `config.staticCssFiles` names, read once for the whole run. */
function loadCssFiles(config: AuditConfig): CssSource[] {
  return config.staticCssFiles.map((path) => ({
    file: path,
    source: readFileSync(resolve(config.root, path), 'utf8'),
  }));
}

function byPosition(a: Finding, b: Finding): number {
  return a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file);
}

/**
 * Run the static audit. `rules` defaults to the shipped registry and is injectable so a test can
 * drive the pipeline with a rule of its own.
 */
export function runStatic(config: AuditConfig, rules: StaticRule[] = staticRules()): AuditReport {
  const sheetPath = resolve(config.root, config.sheetPath);
  let css: string;
  try {
    css = readFileSync(sheetPath, 'utf8');
  } catch {
    throw new Error(
      `${sheetPath}: the built admin stylesheet is missing. Build the package, or name the sheet in ${CONFIG_FILE}.`
    );
  }
  const sheet = parseSheet(css);
  const files = parseAll(config);
  const cssFiles = loadCssFiles(config);
  if (files.length === 0 && cssFiles.length === 0) {
    throw new Error(
      `the static scan matched no files under ${config.staticScope.join(', ')}. Name the scan scope in ${CONFIG_FILE} (static.scope).`
    );
  }
  const raised = rules.flatMap((rule) => rule.check({ files, sheet, config, cssFiles }));
  const split = applySuppressions(raised, [...files, ...cssFiles]);
  return {
    findings: [...split.findings].sort(byPosition),
    suppressed: [...split.suppressed].sort(byPosition),
    filesScanned: files.length,
    ruleIds: rules.map((rule) => rule.id),
  };
}
