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
import type { AuditReport, CssSource, Finding, SourceFile, StaticRule } from './types.js';

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

/**
 * Every component under one scope's directories, parsed once. Shared by `static.scope` and
 * `static.adminScope`, which carry the identical existence rule: a configured path the tree does
 * not have throws, since honoring a misspelled one as an empty scan is the silent green the spec
 * rejected the ESLint route over, while a default path a given tree does not have is skipped,
 * since the default spans the library and a consumer site.
 */
function parseScope(config: AuditConfig, dirs: string[], fromConfig: boolean, key: string): ParsedComponent[] {
  const seen = new Set<string>();
  const files: ParsedComponent[] = [];
  for (const dir of dirs) {
    if (fromConfig && !existsSync(resolve(config.root, dir))) {
      throw new Error(`${dir}: the configured static scan scope does not exist (${CONFIG_FILE}, ${key})`);
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

/** Every `.ts` and `.svelte` file under a directory, recursively, as paths relative to the audited root. */
function sourceFilePaths(root: string, dir: string): string[] {
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
    if (entry.isDirectory()) return sourceFilePaths(root, relPath);
    return entry.name.endsWith('.ts') || entry.name.endsWith('.svelte') ? [relPath] : [];
  });
}

/**
 * Every `.ts`/`.svelte` file under `config.sourceScope`, read once for the whole run: the
 * substrate the source-text-family static rules scan. Named the same existence rule as
 * `parseScope`: a configured scope path the tree does not have throws, since honoring a typo as
 * an empty scan would silently narrow the two rules that read this list to nothing.
 */
function loadSources(config: AuditConfig): SourceFile[] {
  const seen = new Set<string>();
  const sources: SourceFile[] = [];
  for (const dir of config.sourceScope) {
    if (config.sourceScopeFromConfig && !existsSync(resolve(config.root, dir))) {
      throw new Error(
        `${dir}: the configured source scan scope does not exist (${CONFIG_FILE}, static.sourceScope)`
      );
    }
    for (const path of sourceFilePaths(config.root, dir)) {
      if (seen.has(path)) continue;
      seen.add(path);
      sources.push({ file: path, source: readFileSync(resolve(config.root, path), 'utf8') });
    }
  }
  return sources;
}

/** Whether a root-relative path lies inside one of the given root directories. */
function isUnderRoots(path: string, roots: string[]): boolean {
  return roots.some((root) => path === root || path.startsWith(`${root}/`));
}

function byPosition(a: Finding, b: Finding): number {
  return a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file);
}

/**
 * Every compiled-class source `config.sheetPaths` names, concatenated into one CSS text. Each
 * source is read independently so a missing one names itself in the error rather than the whole
 * list failing anonymously; a config that believes a class is covered by a site source it
 * misspelled would otherwise silently fall back to the packaged sheet alone.
 */
function loadSheetSources(config: AuditConfig): string {
  return config.sheetPaths
    .map((path) => {
      const sheetPath = resolve(config.root, path);
      try {
        return readFileSync(sheetPath, 'utf8');
      } catch {
        throw new Error(
          `${sheetPath}: the built admin stylesheet is missing. Build the package, or name the sheet in ${CONFIG_FILE}.`
        );
      }
    })
    .join('\n');
}

/**
 * Narrow a rule registry to the ids `--rule` named, in registry order regardless of the order
 * `ids` lists them. Undefined or empty `ids` returns `rules` unchanged, the whole registry a
 * caller ran before `--rule` existed. Generic over both rule shapes (static and rendered) since
 * the narrowing logic is identical: an id that matches no registered rule throws, naming every
 * known id, since silently running a smaller registry than the one asked for is the ambiguity
 * `--rule` exists to remove.
 */
export function selectRules<T extends { id: string }>(rules: T[], ids: string[] | undefined): T[] {
  if (ids === undefined || ids.length === 0) return rules;
  const known = rules.map((rule) => rule.id);
  const unknown = ids.filter((id) => !known.includes(id));
  if (unknown.length > 0) {
    throw new Error(
      `unknown --rule id${unknown.length > 1 ? 's' : ''} ${unknown.join(', ')}. Known rule ids: ${known.join(', ')}`
    );
  }
  const wanted = new Set(ids);
  return rules.filter((rule) => wanted.has(rule.id));
}

/**
 * Run the static audit. `rules` defaults to the shipped registry and is injectable so a test can
 * drive the pipeline with a rule of its own.
 */
export function runStatic(config: AuditConfig, rules: StaticRule[] = staticRules()): AuditReport {
  const sheet = parseSheet(loadSheetSources(config));
  const files = parseScope(config, config.staticScope, config.staticScopeFromConfig, 'static.scope');
  const adminFiles = parseScope(config, config.adminScope, config.adminScopeFromConfig, 'static.adminScope');
  const cssFiles = loadCssFiles(config);
  const adminCssFiles = cssFiles.filter((cssFile) => isUnderRoots(cssFile.file, config.adminScope));
  const sources = loadSources(config);
  if (files.length === 0 && cssFiles.length === 0) {
    throw new Error(
      `the static scan matched no files under ${config.staticScope.join(', ')}. Name the scan scope in ${CONFIG_FILE} (static.scope).`
    );
  }
  const raised = rules.flatMap((rule) =>
    rule.adminOnly
      ? rule.check({ files: adminFiles, sheet, config, cssFiles: adminCssFiles, sources })
      : rule.check({ files, sheet, config, cssFiles, sources })
  );
  // A file `adminScope` and `staticScope` both cover (the two roots overlap by default) is
  // deduplicated by path so its suppression directives resolve once, never once per scope. The
  // source-text walk is spread first, so a component both it and the markup parse cover keeps
  // its parsed `nodes`: a source-text entry never carries `nodes`, and losing them would degrade
  // that file's suppression resolution from "next AST node" to "next non-blank line" for every
  // markup rule, not only the two new ones.
  const suppressionSources = new Map<string, ParsedComponent | CssSource>();
  for (const file of [...sources, ...files, ...adminFiles, ...cssFiles]) suppressionSources.set(file.file, file);
  // A `--rule`-scoped run passes a narrowed `rules`, so a directive naming a rule outside that
  // selection is judged against the ids this run actually executed, not the full registry, which
  // is what keeps a scoped run from reporting every ordinary out-of-scope directive as dead.
  const ranRuleIds = new Set(rules.map((rule) => rule.id));
  const split = applySuppressions(raised, [...suppressionSources.values()], ranRuleIds);
  return {
    findings: [...split.findings].sort(byPosition),
    suppressed: [...split.suppressed].sort(byPosition),
    filesScanned: files.length + sources.length,
    ruleIds: rules.map((rule) => rule.id),
  };
}
