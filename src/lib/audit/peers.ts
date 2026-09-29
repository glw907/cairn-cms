// cairn-audit's optional peers: `daisyui` and `tailwindcss` are the two packages the theme rules
// read a fact from (daisyUI's theme key list, Tailwind's theme variables). Both resolve from the
// audited root at the moment a rule needs them, never at import, so a site missing one keeps its
// admin-only audit and only a run that selects a theme rule fails, with a message naming the peer
// and the command that installs it rather than a module-resolution stack.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseSheet } from './sheet.js';

/** How the peers are found and read, injectable so a test needs no uninstall. */
export interface PeerAccess {
  /** The absolute path `specifier` resolves to from `root`, or undefined when it is not installed. */
  resolve(specifier: string, root: string): string | undefined;
  /** The default export of an ES module at an absolute path. */
  loadDefault(path: string): unknown;
  /** A file's text, or undefined when it cannot be read. */
  readText(path: string): string | undefined;
}

/** The real peer access: Node resolution from the audited root and a synchronous module load. */
export const nodePeers: PeerAccess = {
  resolve(specifier, root) {
    try {
      return createRequire(join(root, 'package.json')).resolve(specifier);
    } catch {
      return undefined;
    }
  },
  loadDefault(path) {
    // The engine requires Node 24, where a synchronous require of an ES module is supported.
    const loaded = createRequire(import.meta.url)(path) as { default?: unknown };
    return loaded.default ?? loaded;
  },
  readText(path) {
    try {
      return readFileSync(path, 'utf8');
    } catch {
      return undefined;
    }
  },
};

/** The error a missing peer raises. */
function missingPeer(peer: 'daisyui' | 'tailwindcss', why: string): Error {
  return new Error(
    `${peer} is not installed, and the theme rules ${why}. Install it with "npm install --save-dev ${peer}".`
  );
}

/** daisyUI's theme keys and the names of its built-in themes. */
export interface DaisyThemeKeys {
  /** Every key a complete theme block defines: `color-scheme` and each `--` role. */
  keys: string[];
  /** The built-in theme names, which daisyUI completes by merging when a block reuses one. */
  builtInThemes: Set<string>;
}

/** The keys a list must hold before the rule trusts it, since a list missing them would pass everything. */
const REQUIRED_KEYS = ['--color-base-100', '--radius-box'];

/**
 * daisyUI's theme key list and built-in theme names, read from `daisyui/theme/object` resolved
 * from `root`. Throws a named error when `daisyui` is not installed, and a loud one when the list
 * is empty or lacks `--color-base-100` or `--radius-box`, so a shape change in a later daisyUI
 * fails the audit instead of quietly passing every theme block.
 */
export function loadDaisyThemeKeys(root: string, access: PeerAccess): DaisyThemeKeys {
  const path = access.resolve('daisyui/theme/object', root);
  if (path === undefined) throw missingPeer('daisyui', 'read its theme key list to check each theme block for completeness');
  const themes = access.loadDefault(path);
  const entries =
    themes !== null && typeof themes === 'object' ? Object.entries(themes as Record<string, unknown>) : [];
  const keys: string[] = [];
  for (const [, theme] of entries) {
    if (theme === null || typeof theme !== 'object') continue;
    for (const key of Object.keys(theme)) if (!keys.includes(key)) keys.push(key);
  }
  if (keys.length === 0) {
    throw new Error(`the daisyUI theme key list read from ${path} is empty; the theme rules cannot judge completeness`);
  }
  for (const required of REQUIRED_KEYS) {
    if (!keys.includes(required)) {
      throw new Error(`the daisyUI theme key list read from ${path} lacks ${required}; the theme rules refuse to judge against an incomplete list`);
    }
  }
  return { keys, builtInThemes: new Set(entries.map(([name]) => name)) };
}

/**
 * Every custom property `tailwindcss/theme.css` declares, resolved from `root`. Throws a named
 * error when `tailwindcss` is not installed, and a loud one when the file declares none.
 */
export function loadTailwindVariables(root: string, access: PeerAccess): Set<string> {
  const path = access.resolve('tailwindcss/theme.css', root);
  if (path === undefined) throw missingPeer('tailwindcss', 'read its theme variables to resolve a var() against them');
  const names = new Set<string>();
  for (const rule of parseSheet(access.readText(path) ?? '').rules) {
    for (const declaration of rule.declarations) {
      if (declaration.property.startsWith('--')) names.add(declaration.property);
    }
  }
  if (names.size === 0) {
    throw new Error(`${path} declares no theme variable; the theme rules cannot resolve a var() against tailwindcss`);
  }
  return names;
}
