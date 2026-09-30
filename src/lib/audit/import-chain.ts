// cairn-audit's import-chain loader: the stylesheets a site actually ships, read in the order the
// browser's cascade sees them. A rule that needs "what the public stylesheet really pulls in"
// (`theme-conformance`, and the contrast rule after it) starts from the entry stylesheets
// `public.stylesheets` names and follows each `@import`, so a token defined in a package a site
// imports counts and a file the site merely keeps beside its theme does not.
//
// Every file and every `@import` statement is read through `sheet.ts`, never a regex over raw
// text. A package specifier resolves the way a CSS bundler resolves it: the package's `exports`
// map under the `style` condition, then its `style` field, and the plain file path when the
// package has no `exports` field. It never uses Node's own resolution, which sends `tailwindcss`
// to `dist/lib.js` instead of `index.css`. An import that cannot be read is recorded as unread and
// never raises a finding, since a font package a site has not installed is not a conformance error.
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { parseSheet, parseStatements } from './sheet.js';
import type { CompiledSheet } from './sheet.js';

/** The one filesystem read the loader performs, injectable so a test needs no tree on disk. */
export interface ChainFs {
  /** The file's text, or undefined when it cannot be read. */
  readText(absPath: string): string | undefined;
}

/** The loader's default filesystem: the real one, with an unreadable path reading as absent. */
export const nodeChainFs: ChainFs = {
  readText(absPath) {
    try {
      return readFileSync(absPath, 'utf8');
    } catch {
      return undefined;
    }
  },
};

/** One stylesheet the chain read. */
export interface ChainFile {
  /** Path relative to the audited root, forward slashes; a file above the root starts with `..`. */
  file: string;
  /** Absolute path. */
  abs: string;
  source: string;
  sheet: CompiledSheet;
  /** The specifier that first imported the file, or null for an entry stylesheet. */
  specifier: string | null;
  /** Whether the file is one of the entry stylesheets. */
  entry: boolean;
}

/**
 * What became of one `@import` statement. `skipped` is an import the audit deliberately does not
 * follow (`tailwindcss`, whose variables the rule reads from its own theme file, and a remote URL);
 * `non-css` resolved to a file that is not a stylesheet and was never parsed.
 */
export type ImportStatus = 'read' | 'unread' | 'skipped' | 'non-css';

/** One `@import` statement of a chain file. */
export interface ChainImport {
  /** The chain file the statement sits in. */
  from: string;
  /** The specifier as written. */
  specifier: string;
  /** Character offset of the `@` in the importing file's source. */
  start: number;
  /** Character offset just past the statement. */
  end: number;
  status: ImportStatus;
  /** The resolved path relative to the root, for a `read` or `non-css` import. */
  resolved?: string;
}

/** An import the audit could not read, quoted in the report. */
export interface UnreadImport {
  /** The importing file, relative to the root. */
  file: string;
  specifier: string;
  /** Why it could not be read, in a phrase. */
  reason: string;
}

/** The loader's result. */
export interface ImportChain {
  /** Every stylesheet read, each after the stylesheets it imports, entries in the order named. */
  files: ChainFile[];
  /** Every `@import` statement met, in the order met. */
  imports: ChainImport[];
  /** The imports and entry stylesheets that could not be read. */
  unread: UnreadImport[];
}

/** The package `tailwindcss`, which the audit never traverses. */
const TAILWIND = 'tailwindcss';

/** The conditions a CSS `@import` resolves under: `style`, then the package's `default`. */
const STYLE_CONDITIONS = new Set(['style', 'default']);

/**
 * The target of an `@import` prelude: a quoted string or a `url()` argument, whichever the
 * statement opens with. The media, `layer()`, `source()`, and `supports()` modifiers that follow
 * are never read.
 */
function importTarget(prelude: string): string | undefined {
  const text = prelude.trim();
  const quoted = /^(["'])(.*?)\1/.exec(text);
  if (quoted) return quoted[2];
  const url = /^url\(\s*(?:(["'])(.*?)\1|([^)\s]*))\s*\)/i.exec(text);
  if (url) return url[2] ?? url[3];
  return undefined;
}

/** A package specifier's package name and the subpath after it (empty, or beginning with `/`). */
function splitSpecifier(specifier: string): { name: string; subpath: string } {
  const parts = specifier.split('/');
  const nameLength = specifier.startsWith('@') ? 2 : 1;
  const rest = parts.slice(nameLength);
  return { name: parts.slice(0, nameLength).join('/'), subpath: rest.length > 0 ? `/${rest.join('/')}` : '' };
}

/** One `exports` target under the style conditions, or undefined when none applies. */
function resolveTarget(target: unknown): string | undefined {
  if (typeof target === 'string') return target;
  if (Array.isArray(target)) {
    for (const entry of target) {
      const resolved = resolveTarget(entry);
      if (resolved !== undefined) return resolved;
    }
    return undefined;
  }
  if (target !== null && typeof target === 'object') {
    for (const [condition, value] of Object.entries(target)) {
      if (!STYLE_CONDITIONS.has(condition)) continue;
      const resolved = resolveTarget(value);
      if (resolved !== undefined) return resolved;
    }
  }
  return undefined;
}

/** The `exports` map's target for a `./`-form key, exact entries first, then a `*` pattern. */
function resolveExports(exportsField: unknown, key: string): string | undefined {
  const isMap =
    exportsField !== null &&
    typeof exportsField === 'object' &&
    !Array.isArray(exportsField) &&
    Object.keys(exportsField).some((entry) => entry.startsWith('.'));
  const map: Record<string, unknown> = isMap ? (exportsField as Record<string, unknown>) : { '.': exportsField };
  if (key in map) return resolveTarget(map[key]);
  let best: { prefix: string; suffix: string; target: unknown } | undefined;
  let bestKey = '';
  for (const [pattern, target] of Object.entries(map)) {
    const star = pattern.indexOf('*');
    if (star === -1) continue;
    const prefix = pattern.slice(0, star);
    const suffix = pattern.slice(star + 1);
    if (!key.startsWith(prefix) || !key.endsWith(suffix) || key.length < prefix.length + suffix.length) continue;
    // Node's pattern order: the longer prefix wins, and at an equal prefix the longer whole key, so
    // `./*.css` beats `./*` for `./index.css`.
    const better = !best || prefix.length > best.prefix.length || (prefix.length === best.prefix.length && pattern.length > bestKey.length);
    if (better) {
      best = { prefix, suffix, target };
      bestKey = pattern;
    }
  }
  if (!best) return undefined;
  const matched = key.slice(best.prefix.length, key.length - best.suffix.length);
  return resolveTarget(best.target)?.replaceAll('*', matched);
}

/** A package resolution: the absolute path, or why there is none. */
type Resolution = { path: string } | { reason: string };

/**
 * Resolve a package specifier from a directory: the nearest installed package walking upward, then
 * its `exports` map under the style conditions, its `style` field, or the file path.
 */
function resolvePackage(fromDir: string, specifier: string, fs: ChainFs): Resolution {
  const { name, subpath } = splitSpecifier(specifier);
  let packageDir: string | undefined;
  let manifest: Record<string, unknown> | undefined;
  for (let dir = fromDir; ; dir = dirname(dir)) {
    const text = fs.readText(join(dir, 'node_modules', name, 'package.json'));
    if (text !== undefined) {
      try {
        manifest = JSON.parse(text) as Record<string, unknown>;
      } catch {
        return { reason: 'the package.json is not valid JSON' };
      }
      packageDir = join(dir, 'node_modules', name);
      break;
    }
    if (dirname(dir) === dir) break;
  }
  if (packageDir === undefined || manifest === undefined) return { reason: 'the package is not installed' };

  let target: string | undefined;
  if (manifest.exports !== undefined) {
    target = resolveExports(manifest.exports, subpath === '' ? '.' : `.${subpath}`);
    if (target === undefined && subpath === '' && typeof manifest.style === 'string') target = manifest.style;
  } else if (subpath !== '') {
    target = `.${subpath}`;
  } else if (typeof manifest.style === 'string') {
    target = manifest.style;
  } else if (typeof manifest.main === 'string' && manifest.main.endsWith('.css')) {
    target = manifest.main;
  }
  if (target === undefined) return { reason: 'the package exports no stylesheet under the style condition' };
  return { path: resolve(packageDir, target) };
}

/** Whether a specifier names a remote stylesheet, never read. */
function isRemote(specifier: string): boolean {
  return /^(https?:)?\/\//i.test(specifier) || specifier.startsWith('data:');
}

/** A path relative to the audited root, with forward slashes. */
function display(root: string, abs: string): string {
  return relative(root, abs).split('\\').join('/');
}

/**
 * Read the import chain of each entry stylesheet, in order. An entry, or an import, that cannot be
 * read is recorded in `unread` and never throws; a missing default entry is the normal case for a
 * site that has no public theme.
 */
export function loadImportChain(root: string, entries: string[], fs: ChainFs = nodeChainFs): ImportChain {
  const files: ChainFile[] = [];
  const imports: ChainImport[] = [];
  const unread: UnreadImport[] = [];
  const visited = new Set<string>();

  const visit = (abs: string, specifier: string | null, entry: boolean): boolean => {
    if (visited.has(abs)) return true;
    const source = fs.readText(abs);
    if (source === undefined) return false;
    visited.add(abs);
    const file = display(root, abs);
    for (const statement of parseStatements(source)) {
      if (statement.name !== 'import') continue;
      const target = importTarget(statement.prelude);
      if (target === undefined) continue;
      const record: ChainImport = { from: file, specifier: target, start: statement.start, end: statement.end, status: 'unread' };
      imports.push(record);
      const unreadBecause = (reason: string) => unread.push({ file, specifier: target, reason });

      if (isRemote(target)) {
        record.status = 'skipped';
        continue;
      }
      let resolved: string;
      if (target.startsWith('.') || target.startsWith('/')) {
        resolved = resolve(dirname(abs), target);
        // Tailwind resolves an extensionless relative import to its `.css` file.
        if (!/\.[^/]*$/.test(target) && fs.readText(resolved) === undefined && fs.readText(`${resolved}.css`) !== undefined) {
          resolved = `${resolved}.css`;
        }
      } else {
        if (splitSpecifier(target).name === TAILWIND) {
          record.status = 'skipped';
          continue;
        }
        const resolution = resolvePackage(dirname(abs), target, fs);
        if ('reason' in resolution) {
          unreadBecause(resolution.reason);
          continue;
        }
        resolved = resolution.path;
      }
      record.resolved = display(root, resolved);
      if (!resolved.endsWith('.css')) {
        record.status = 'non-css';
        continue;
      }
      if (visit(resolved, target, false)) record.status = 'read';
      else unreadBecause('the file does not exist');
    }
    files.push({ file, abs, source, sheet: parseSheet(source), specifier, entry });
    return true;
  };

  for (const entry of entries) {
    if (!visit(resolve(root, entry), null, true)) {
      unread.push({ file: entry, specifier: entry, reason: 'the entry stylesheet does not exist' });
    }
  }
  return { files, imports, unread };
}
