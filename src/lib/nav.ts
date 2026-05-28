// cairn-core: the navigation tree. Stored per named menu in D1 (see the store functions below)
// and read at runtime by the public layout via `loadNav`. The engine returns data only; each site
// renders the tree with its own header markup.

import type { D1Database } from '@cloudflare/workers-types';
import { parse as parseYaml } from 'yaml';

/** One navigation node. `url` omitted/empty is a label-only grouping header; `children` omitted is a leaf. */
export interface NavNode {
  label: string;
  url?: string;
  children?: NavNode[];
}

/** Total node cap across the whole tree, a guard against a runaway payload. */
export const MAX_NAV_NODES = 200;

export class NavValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NavValidationError';
  }
}

/**
 * Validate and normalize an untrusted value into a NavNode[]: arrays only, non-empty labels,
 * depth within `maxDepth` (1 = flat), bounded node count, and only the three known keys kept.
 * Throws NavValidationError on any violation. Used by `navSave` before writing.
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
      if (++count > MAX_NAV_NODES) throw new NavValidationError('Too many navigation items');
      const node: NavNode = { label };
      if (typeof item.url === 'string' && item.url.trim()) node.url = item.url.trim();
      if (item.children !== undefined) {
        const children = walk(item.children, depth + 1);
        if (children.length) node.children = children;
      }
      return node;
    });
  }

  return walk(value, 1);
}

/** Worker binding the nav store reads (a structural subset of `Platform.env`). */
export interface NavEnv {
  AUTH_DB?: D1Database;
}

/** Generous depth cap for trusting an already-validated stored tree on the public read path. */
const READ_DEPTH_CAP = 10;

/** Read the raw tree for a menu, or null when the row is absent. */
export async function readNavTree(db: D1Database, name: string): Promise<NavNode[] | null> {
  const row = await db
    .prepare('SELECT tree_json FROM nav_menu WHERE name = ?')
    .bind(name)
    .first<{ tree_json: string }>();
  if (!row) return null;
  return validateNavTree(JSON.parse(row.tree_json), READ_DEPTH_CAP);
}

/** Upsert a menu's tree. The caller validates against the menu's own maxDepth first. */
export async function writeNavTree(db: D1Database, name: string, tree: NavNode[]): Promise<void> {
  await db
    .prepare(
      'INSERT INTO nav_menu (name, tree_json, updated_at) VALUES (?, ?, ?) ' +
        'ON CONFLICT(name) DO UPDATE SET tree_json = excluded.tree_json, updated_at = excluded.updated_at',
    )
    .bind(name, JSON.stringify(tree), Date.now())
    .run();
}

/**
 * Public read for the site layout. Returns [] (never throws) when the binding or row is missing or
 * the stored JSON is unreadable, so a nav problem degrades to an empty header rather than a 500.
 */
export async function loadNav(env: NavEnv, name: string): Promise<NavNode[]> {
  if (!env.AUTH_DB) return [];
  try {
    return (await readNavTree(env.AUTH_DB, name)) ?? [];
  } catch (err) {
    console.error(`cairn nav: failed to read menu "${name}":`, err);
    return [];
  }
}

/**
 * Shape of the YAML site-config file. Unknown keys are ignored so the file can grow without
 * an engine change. Read at build time by the public site.
 */
export interface SiteConfig {
  siteName: string;
  description?: string;
  author?: string;
  url?: string;
  locale?: string;
  /** Named navigation menus, each a NavNode[] (normalized by extractMenu). */
  menus?: Record<string, unknown>;
  email?: { sender?: string; senderName?: string };
  footer?: { copyrightName?: string };
  settings?: {
    feedMaxItems?: number;
    homepageFeaturedCount?: number;
    postTags?: string[];
    [key: string]: unknown;
  };
}

export class SiteConfigError extends Error {
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
