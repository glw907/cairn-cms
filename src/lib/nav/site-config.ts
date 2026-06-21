// The navigation tree and its YAML site-config. A menu lives in the site's git-committed config
// under `menus.<name>`, read at build time by the public layout and edited from /admin/nav, which
// commits the file back through the GitHub-App pipeline. This module is pure: parse, validate, and
// rewrite only. The engine returns data; each site renders the tree with its own markup.
import { parse as parseYaml, parseDocument } from 'yaml';
import type { ConceptUrlPolicy } from '../content/types.js';

/** One navigation node. An omitted or empty `url` is a label-only grouping header; no `children` is a leaf. */
export interface NavNode {
  label: string;
  url?: string;
  children?: NavNode[];
}

/** Total node cap across the whole tree, a guard against a runaway payload. */
export const MAX_NAV_NODES = 200;

/** Maximum character length for a node label. */
export const MAX_LABEL_LENGTH = 500;

/** Maximum character length for a node URL. */
export const MAX_URL_LENGTH = 2048;

/** Allowlist for safe URL schemes: site-relative, in-page anchors, http(s), mailto, and tel. */
const SAFE_URL = /^(\/|#|https?:\/\/|mailto:|tel:)/i;

export class NavValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NavValidationError';
  }
}

/**
 * Validate and normalize an untrusted value into a NavNode[]: arrays only, non-empty labels, depth
 * within `maxDepth` (1 is flat), a bounded node count, and only the three known keys kept. Throws
 * NavValidationError on any violation. Used by navSave before writing.
 */
export function validateNavTree(value: unknown, maxDepth: number): NavNode[] {
  let count = 0;

  function walk(nodes: unknown, depth: number): NavNode[] {
    if (!Array.isArray(nodes)) throw new NavValidationError('Navigation must be a list of items');
    if (depth > maxDepth) throw new NavValidationError(`Navigation is nested deeper than ${maxDepth} levels`);
    return nodes.map((raw) => {
      if (typeof raw !== 'object' || raw === null) throw new NavValidationError('Each item must be an object');
      const item = raw as Record<string, unknown>;
      const label = typeof item.label === 'string' ? item.label.trim() : '';
      if (!label) throw new NavValidationError('Each item needs a label');
      if (label.length > MAX_LABEL_LENGTH) throw new NavValidationError('Label is too long (max 500 characters)');
      if (++count > MAX_NAV_NODES) throw new NavValidationError('Too many navigation items');
      const node: NavNode = { label };
      if (typeof item.url === 'string' && item.url.trim()) {
        const url = item.url.trim();
        if (url.length > MAX_URL_LENGTH) throw new NavValidationError('URL is too long (max 2048 characters)');
        if (!SAFE_URL.test(url)) throw new NavValidationError('URL must start with /, #, http(s)://, mailto:, or tel:');
        node.url = url;
      }
      if (item.children !== undefined) {
        const children = walk(item.children, depth + 1);
        if (children.length) node.children = children;
      }
      return node;
    });
  }

  return walk(value, 1);
}

/**
 * Shape of the YAML site-config file. Unknown keys are ignored so the file can grow without an
 * engine change. Read at build time by the public site.
 */
export interface SiteConfig {
  siteName: string;
  description?: string;
  author?: string;
  url?: string;
  locale?: string;
  /** Named navigation menus, each a NavNode[] (normalized by extractMenu). */
  menus?: Record<string, unknown>;
  /** Per-concept URL policy: the permalink pattern and date-prefix granularity, keyed by concept id. */
  content?: Record<string, ConceptUrlPolicy>;
  /** The editor spellcheck settings. The dialect is declared once per site (spec 1.2), so a British
   *  site loads the British word list and "colour" reads as correct. Today only US English ships, so an
   *  unset or unknown dialect resolves to it. */
  spellcheck?: { dialect?: string };
  [key: string]: unknown;
}

/** The dialect string when a site sets none: US English, the only dictionary that ships today. */
export const DEFAULT_DIALECT = 'en-US';

// The dialect-to-dictionary map. Only US English ships now; a new locale adds one entry here and one
// committed dictionary file under spellcheck-assets, and the rest of the chain (the main-thread URL
// resolution, the worker fetch) needs no change. An unknown or unset dialect falls back to the default
// rather than throwing, so a typo or a future-locale config never breaks the editor.
const DICTIONARY_BY_DIALECT: Record<string, string> = {
  'en-US': 'dictionary-en-us.txt',
};

/**
 * The dictionary asset file for a site's configured dialect, defaulting to US English. The main thread
 * resolves this filename to a real URL (the spike's out-of-bundle asset) and hands it to the Worker in
 * the `init` message; the Worker never reads config. An unknown dialect falls back to the default file.
 */
export function dictionaryFileForDialect(dialect: string | undefined): string {
  const key = dialect ?? DEFAULT_DIALECT;
  return DICTIONARY_BY_DIALECT[key] ?? DICTIONARY_BY_DIALECT[DEFAULT_DIALECT]!;
}

export class SiteConfigError extends Error {
  /** The registered diagnostic condition a malformed site config maps to (mirrors CairnError). */
  readonly conditionId = 'config.site-config-invalid';

  constructor(message: string) {
    super(message);
    this.name = 'SiteConfigError';
  }
}

/** Parse the YAML site-config text into a typed object. Throws SiteConfigError on a malformed root. */
export function parseSiteConfig(raw: string): SiteConfig {
  const parsed = parseYaml(raw) as unknown;
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new SiteConfigError('Site config must be a YAML mapping');
  }
  const { siteName } = parsed as SiteConfig;
  if (typeof siteName !== 'string' || !siteName.trim()) {
    throw new SiteConfigError('Site config needs a siteName');
  }
  return parsed as SiteConfig;
}

/** Extract one named menu from a parsed config and validate it. Returns [] when the menu is absent. */
export function extractMenu(config: SiteConfig, name: string, maxDepth: number): NavNode[] {
  const menu = config.menus?.[name];
  if (menu === undefined) return [];
  return validateNavTree(menu, maxDepth);
}

/** The per-concept URL policy from a parsed config, or an empty policy when the `content` key is absent. */
export function urlPolicyFrom(config: SiteConfig): Record<string, ConceptUrlPolicy> {
  return config.content ?? {};
}

/**
 * Replace one named menu in the YAML site-config text and reserialize, preserving every other
 * top-level key (siteName, other menus, settings). Parses into a Document so the rest of the file
 * round-trips. YAML comments are not preserved (an accepted trade); data keys are. A leaf node
 * serializes without `url`/`children` keys.
 */
export function setMenu(raw: string, name: string, tree: NavNode[]): string {
  const doc = parseDocument(raw);
  if (doc.get('siteName') === undefined) {
    throw new SiteConfigError('Site config must be a mapping with a siteName');
  }
  doc.setIn(['menus', name], tree);
  return doc.toString();
}
