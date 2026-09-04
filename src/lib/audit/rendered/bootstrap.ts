// The rendered run's own bootstrap: resolving BASE_URL (the run never starts a server, only checks
// one already answers), loading Playwright by dynamic import (deferred so a consumer install never
// pays for it unless a rendered run actually executes), parsing `CAIRN_AUDIT_COOKIES` into the extra
// cookies a browser context carries, and computing which interaction states the registered rules
// actually need. Everything here resolves once, before `runRendered` (in the parent module) opens a
// single page.
import type { InteractionState, PlaywrightModule, RenderedRule } from './types.js';

/** The preview server address a rendered run targets absent `BASE_URL`. */
export const DEFAULT_BASE_URL = 'http://localhost:4173';

/** The real reachability check `resolveBaseUrl` falls back to absent an injected one. */
export async function defaultIsReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    return res.status < 500;
  } catch {
    return false;
  }
}

/**
 * The BASE_URL a rendered run targets. The harness never starts a server, so this only checks that
 * one is already answering; a caller supplies `isReachable` to test the failure without a network
 * call.
 */
export async function resolveBaseUrl(
  isReachable: (url: string) => Promise<boolean> = defaultIsReachable
): Promise<string> {
  const baseUrl = process.env.BASE_URL || DEFAULT_BASE_URL;
  if (!(await isReachable(baseUrl))) {
    throw new Error(
      `no server answering at ${baseUrl}. The rendered audit never starts one: start the site's dev or ` +
        `preview server (set BASE_URL first if it is not at the default), then re-run.`
    );
  }
  return baseUrl;
}

/**
 * Parse `CAIRN_AUDIT_COOKIES` into the extra cookies a rendered run's browser context carries
 * alongside the theme cookie. The syntax is a Cookie header's: `name=value` entries separated by
 * `;`, each entry trimmed and split on its first `=`, so a value may itself contain one. An unset
 * or all-whitespace value configures none.
 *
 * A malformed entry throws rather than being skipped, holding `loadConfig`'s rule that a typo never
 * degrades into a silently narrower audit: a session cookie that quietly failed to parse would
 * produce a whole run of login-redirect failures blamed on the admin rather than on the env var. The
 * thrown message never echoes the entry itself, only its position among the `;`-separated entries: a
 * malformed entry is exactly the shape most likely to BE a mistyped session cookie, so printing it
 * back would land that value in a caller's log. An entry naming `cairn-admin-theme` is refused
 * outright, since `runRendered` owns that cookie per theme context; that refusal names the cookie's
 * NAME only, never a value, so it is unaffected by the redaction above.
 */
export function resolveExtraCookies(raw: string | undefined): { name: string; value: string }[] {
  if (raw === undefined || raw.trim() === '') return [];
  return raw.split(';').map((rawEntry, index) => {
    const entry = rawEntry.trim();
    const eq = entry.indexOf('=');
    if (eq === -1) {
      throw new Error(
        `CAIRN_AUDIT_COOKIES: malformed entry at position ${index + 1} (no "=" found), expected ` +
          `name=value. The entry itself is not shown, since it carries no name/value split to redact.`
      );
    }
    const name = entry.slice(0, eq).trim();
    const value = entry.slice(eq + 1);
    if (name === '') {
      throw new Error(
        `CAIRN_AUDIT_COOKIES: malformed entry at position ${index + 1} (the cookie name is empty), ` +
          `expected name=value. The value is not shown, since it may itself be a session cookie value.`
      );
    }
    if (name === 'cairn-admin-theme') {
      throw new Error(
        'CAIRN_AUDIT_COOKIES: cannot set "cairn-admin-theme"; the rendered run owns that cookie per ' +
          'browser context (one context per theme), and a caller override would silently invalidate ' +
          'the per-theme measurement.'
      );
    }
    return { name, value };
  });
}

/**
 * The real dynamic import `loadPlaywrightModule` falls back to absent an injected loader. Playwright
 * is never imported at the top level: `import('playwright')` resolves from wherever this file
 * executes, which is cairn's own devDependency during cairn's own tests but a CONSUMER's install
 * once this ships in dist and a site's own audit run imports it. That is the deliberate difference
 * from scripts/lab/generate-norms-manifest.mjs, which imports the ROOT `playwright` because it is
 * cairn's own build tool pinned by cairn's own lockfile; do not "harmonize" the two import styles,
 * they serve different trees on purpose.
 */
export async function defaultLoadPlaywright(): Promise<PlaywrightModule> {
  return (await import('playwright')) as unknown as PlaywrightModule;
}

/**
 * Load Playwright through `loader` (the real dynamic import by default, an injected one for a
 * test), turning any failure into the one-line install instruction. Wrapping happens here, once,
 * rather than inside `defaultLoadPlaywright`, so an injected loader's failure reads the same way a
 * real absent install would.
 */
export async function loadPlaywrightModule(loader: () => Promise<PlaywrightModule>): Promise<PlaywrightModule> {
  try {
    return await loader();
  } catch {
    throw new Error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
  }
}

/**
 * The interaction states every registered rule actually needs, `'rest'` always included since every
 * page is visited at rest regardless (rules aside, the allowlist staleness check needs it too).
 */
export function neededStates(rules: RenderedRule[]): InteractionState[] {
  const states = new Set<InteractionState>(['rest']);
  for (const rule of rules) for (const state of rule.states ?? ['rest']) states.add(state);
  return [...states];
}
