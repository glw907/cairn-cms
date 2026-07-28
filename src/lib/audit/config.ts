// cairn-audit's configuration: one optional consumer-side file, and the argv the bin parses.
// Everything defaults, so a site that has written no config still gets a meaningful run.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** The config file a consumer writes, read from the audited root. */
export const CONFIG_FILE = 'cairn-audit.config.json';

// Every surface that renders inside the admin theme, plus the site's own admin routes. The three
// library directories are the same roots the admin stylesheet build and the class-compilation gate
// scan. admin-fields joined those roots late, after its classes had ridden along on the components
// scan by coincidence until a migration removed the last shared token and a shipped class quietly
// resolved to nothing. A directory that renders admin markup belongs here even when it looks
// covered. A path that does not exist in a given tree is skipped, so a consumer inherits only what
// it actually has.
export const DEFAULT_STATIC_SCOPE = [
  'src/routes/admin',
  'src/lib/admin-toolkit',
  'src/lib/admin-fields',
  'src/lib/components',
];

// Where the built admin stylesheet is, first in the library's own tree and then in a consumer's
// installed package. The first candidate is the fallback when neither exists, so the run fails
// naming a path a developer can act on.
export const DEFAULT_SHEET_CANDIDATES = [
  'dist/components/cairn-admin.css',
  'node_modules/@glw907/cairn-cms/dist/components/cairn-admin.css',
];

// Declared palette declaration sites: the one CSS file per tree whose whole job is DEFINING the
// literal values a palette resolves to. `token-colors` (rules/static/token-colors.ts), the rule
// that polices a raw color literal bypassing the palette, cannot meaningfully apply to the
// declaration site itself, so it reads this list and skips every file named here, rather than
// carrying its own filename special case. Every other CSS-family rule still scans a file named
// here when `staticCssFiles` also names it: a declaration site carries real structure (a
// selector, a transition) those rules legitimately police. `cairn-admin.css` is the engine's own
// declaration site and so the one default; a site names its own theme file the same way
// (`static.paletteFiles`) to keep its own palette declaration outside `token-colors` too.
export const DEFAULT_PALETTE_CSS_FILES = ['src/lib/components/cairn-admin.css'];

/** One rendered-mode exemption. A live-page finding has no source line to co-locate a comment on. */
export interface RenderedAllowlistEntry {
  page: string;
  selector: string;
  reason: string;
}

/** A resolved run configuration: defaults filled, paths still relative to `root`. */
export interface AuditConfig {
  /** The directory every other path resolves against. */
  root: string;
  /** Directories the static scan reads components from, recursively. */
  staticScope: string[];
  /**
   * Whether the config file named `staticScope` itself. A default path a given tree does not have
   * is the normal case, since the default spans a library and a consumer site; a path a consumer
   * wrote down and misspelled is a typo, and a typo that quietly narrows the audit to nothing is
   * the silent-green failure this engine exists to avoid.
   */
  staticScopeFromConfig: boolean;
  /**
   * Standalone CSS files (paths relative to `root`) the CSS-family static rules also scan,
   * alongside every component's own scoped `<style>` block. Empty by default: a component's
   * `<style>` block is the only CSS surface an audited tree carries until a consumer names one
   * explicitly. Naming a declared palette site here too (see `paletteCssFiles`) is fine: only
   * `token-colors` skips it, so the rest of the CSS-family scan still covers it.
   */
  staticCssFiles: string[];
  /**
   * Declared palette declaration sites (paths relative to `root`) `token-colors`
   * (rules/static/token-colors.ts) never flags, since a raw color literal is the whole point of a
   * palette's own declaration site rather than a hazard. Defaults to the engine's own admin
   * stylesheet; a site names its own theme file here too.
   */
  paletteCssFiles: string[];
  /** The built admin stylesheet the class tokens resolve against. */
  sheetPath: string;
  /** The pages rendered mode visits. */
  renderedPages: string[];
  renderedAllowlist: RenderedAllowlistEntry[];
}

function fail(message: string): never {
  throw new Error(`${CONFIG_FILE}: ${message}`);
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (value === null || value === undefined) return {};
  if (typeof value !== 'object' || Array.isArray(value)) fail(`${field} must be an object`);
  return value as Record<string, unknown>;
}

function asPathList(value: unknown, field: string, fallback: string[]): string[] {
  if (value === undefined) return fallback;
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    fail(`${field} must be a list of paths`);
  }
  return value as string[];
}

function asAllowlist(value: unknown, field: string): RenderedAllowlistEntry[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(`${field} must be a list`);
  const required = (row: Record<string, unknown>, key: string): string => {
    const entry = row[key];
    if (typeof entry !== 'string' || entry === '') fail(`each ${field} entry needs a ${key}`);
    return entry;
  };
  return value.map((entry) => {
    const row = asRecord(entry, field);
    return {
      page: required(row, 'page'),
      selector: required(row, 'selector'),
      reason: required(row, 'reason'),
    };
  });
}

/**
 * Resolve a parsed config file (or its absence) against the defaults. `sheetExists` decides which
 * stylesheet candidate the run uses, injected so the resolution is testable without a tree.
 */
export function resolveConfig(
  root: string,
  raw: unknown,
  sheetExists: (path: string) => boolean
): AuditConfig {
  const file = asRecord(raw, 'the config');
  const staticSection = asRecord(file.static, 'static');
  const renderedSection = asRecord(file.rendered, 'rendered');
  if (file.sheet !== undefined && typeof file.sheet !== 'string') fail('sheet must be a path');
  return {
    root,
    staticScope: asPathList(staticSection.scope, 'static.scope', DEFAULT_STATIC_SCOPE),
    staticScopeFromConfig: staticSection.scope !== undefined,
    staticCssFiles: asPathList(staticSection.cssFiles, 'static.cssFiles', []),
    paletteCssFiles: asPathList(staticSection.paletteFiles, 'static.paletteFiles', DEFAULT_PALETTE_CSS_FILES),
    sheetPath:
      (file.sheet as string | undefined) ??
      DEFAULT_SHEET_CANDIDATES.find((candidate) => sheetExists(candidate)) ??
      DEFAULT_SHEET_CANDIDATES[0],
    renderedPages: asPathList(renderedSection.pages, 'rendered.pages', []),
    renderedAllowlist: asAllowlist(renderedSection.allowlist, 'rendered.allowlist'),
  };
}

/**
 * Read the config for a run. An absent config file is the normal case, not an error; a malformed
 * one throws so a typo never degrades into a silently narrower audit.
 */
export function loadConfig(root: string, configPath?: string): AuditConfig {
  const path = resolve(root, configPath ?? CONFIG_FILE);
  let raw: unknown = null;
  if (existsSync(path)) {
    try {
      raw = JSON.parse(readFileSync(path, 'utf8'));
    } catch (err) {
      throw new Error(`${path}: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else if (configPath !== undefined) {
    throw new Error(`${path}: no such config file`);
  }
  return resolveConfig(root, raw, (candidate) => existsSync(resolve(root, candidate)));
}

/** The flags both invocations share. */
interface AuditFlags {
  rendered: boolean;
  config?: string;
}

/**
 * The bin's parsed argv. A union rather than an optional `term`, so the `norms` branch reaches its
 * term without a cast and a future subcommand cannot forget its own argument.
 */
export type AuditArgs =
  | ({ command: 'audit' } & AuditFlags)
  | ({ command: 'norms'; term: string } & AuditFlags);

const USAGE = [
  'Usage: cairn-audit [--rendered] [--config <path>]',
  '       cairn-audit norms <selector-or-role>',
].join('\n');

/**
 * Parse the bin's argv: one optional leading subcommand, then long flags. Throws with a usage line
 * on anything unexpected, since a mistyped argument that silently ran the default audit would
 * report a clean tree for a question nobody asked.
 */
export function parseArgs(argv: string[]): AuditArgs {
  let term: string | undefined;
  let rest = argv;
  if (rest[0] === 'norms') {
    term = rest[1];
    if (term === undefined || term.startsWith('--')) {
      throw new Error(`norms needs a selector or role\n${USAGE}`);
    }
    rest = rest.slice(2);
  }
  const flags: AuditFlags = { rendered: false };
  for (let i = 0; i < rest.length; ) {
    const flag = rest[i];
    if (flag === '--rendered') {
      flags.rendered = true;
      i += 1;
      continue;
    }
    if (flag === '--config') {
      const value = rest[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`--config needs a value\n${USAGE}`);
      }
      flags.config = value;
      i += 2;
      continue;
    }
    throw new Error(`unknown argument ${flag}\n${USAGE}`);
  }
  return term === undefined ? { command: 'audit', ...flags } : { command: 'norms', term, ...flags };
}
