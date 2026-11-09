// The theme check's `render` rule: the viewer's headless run over every starter and conformance page,
// each option value in both color modes, at 1440. It is the one rule that builds a site, so it lives
// apart from the static rules and loads only when a run asks for it.
import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { repoRoot } from '../repo-root.mjs';
import { runHeadless } from './viewer/headless.mjs';
import { MISSING_ROUTE } from './viewer/site.mjs';

const ROOT = repoRoot(import.meta.url);
const WIDTH = 1440;

/**
 * The routes that answer 404 by design: the address no page serves, and each draft.
 * @returns {Set<string>}
 */
function notFoundRoutes() {
  const index = JSON.parse(readFileSync(path.join(ROOT, 'scripts/theme/conformance/src/content/.cairn/index.json'), 'utf8'));
  return new Set([MISSING_ROUTE, ...index.entries.filter((entry) => entry.draft).map((entry) => entry.permalink)]);
}

/**
 * Render a theme under every option value and both modes.
 * @param {{ dir: string, manifest: { options?: { key: string, values: { value: string }[] }[] } | null, pages?: string[] | 'all' }} ctx
 *   `pages` limits the run to the listed routes; every route the content serves when omitted
 * @returns {Promise<{ file: string, message: string }[]>}
 */
export async function renderRule({ dir, manifest, pages = 'all' }) {
  if (!manifest) return [];
  const options = Object.fromEntries((manifest.options ?? []).map((option) => [option.key, option.values.map((v) => v.value)]));
  const out = mkdtempSync(path.join(tmpdir(), 'cairn-theme-check-render-'));
  try {
    const shots = await runHeadless({ root: ROOT, theme: dir, pages, widths: [WIDTH], options, viewportOnly: true, outDir: out });
    if (shots.length === 0) return [{ file: 'theme', message: 'the render ran no page' }];
    const expectedMissing = notFoundRoutes();
    const failures = [];
    for (const shot of shots) {
      const where = `${shot.page} (${shot.mode}${Object.keys(shot.options).length ? `, ${JSON.stringify(shot.options)}` : ''})`;
      if (shot.status !== (expectedMissing.has(shot.page) ? 404 : 200)) {
        failures.push({ file: shot.page, message: `${where} answered ${shot.status}` });
      }
      for (const error of shot.consoleErrors) failures.push({ file: shot.page, message: `${where} logged a console error: ${error}` });
    }
    return failures;
  } catch (error) {
    return [{ file: 'theme', message: `the build or the render failed: ${String(error instanceof Error ? error.message : error).split('\n').slice(0, 6).join(' / ')}` }];
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}
