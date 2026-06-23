// The manifest bin's root derivation, split out so it is unit-testable without widening the public
// /vite surface (only src/lib/vite/index.ts is the package subpath; this sibling is internal).
import { dirname, isAbsolute, resolve } from 'node:path';

/**
 * The shape of `loadConfigFromFile`'s result that the root derivation reads: the config file's own
 *  path and its `root` field. Typed structurally so the helper is testable without a real load.
 */
export interface LoadedViteConfig {
  /** The resolved path of the config file Vite loaded. */
  path: string;
  /** The user config, of which only `root` is read here. */
  config: { root?: string };
}

/**
 * The authoritative Vite root for the manifest bin, derived from the loaded config the way Vite
 *  resolves a relative `root`: against the config file's own directory, not cwd. An absolute `root`
 *  stands as given, and no `root` falls back to `cwd` (the directory the bin was run from). This
 *  separates the config-search dir (cwd) from the Vite root, so a non-root cwd or a config that
 *  sets `root` reads and writes the manifest under the real app root.
 */
export function resolveViteRoot(loaded: LoadedViteConfig, cwd: string): string {
  const root = loaded.config.root;
  if (!root) return cwd;
  if (isAbsolute(root)) return root;
  return resolve(dirname(loaded.path), root);
}
