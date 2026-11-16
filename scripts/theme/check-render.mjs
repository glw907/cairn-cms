// The theme check's `render` rule: the viewer's headless run over every starter and conformance page
// at 1440, under every option value in the light mode and each option's default in the other modes.
// It is the one rule that builds a site, so it lives apart from the static rules and loads only when
// a run asks for it.
import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { repoRoot } from '../repo-root.mjs';
import { combinations, runHeadless } from './viewer/headless.mjs';
import { MISSING_ROUTE } from './viewer/site.mjs';

const ROOT = repoRoot(import.meta.url);
const WIDTH = 1440;
const FIRST_MODE = 'light';

/**
 * The routes that answer 404 by design: the address no page serves, and each draft.
 * @returns {Set<string>}
 */
function notFoundRoutes() {
  const index = JSON.parse(readFileSync(path.join(ROOT, 'scripts/theme/conformance/src/content/.cairn/index.json'), 'utf8'));
  return new Set([MISSING_ROUTE, ...index.entries.filter((entry) => entry.draft).map((entry) => entry.permalink)]);
}

/**
 * The `runHeadless` requests a render run makes, each the option values it builds and the modes it
 * builds them in.
 *
 * A full run builds every option value in the light mode, then each option's default in the other
 * modes, rather than every value in every mode. An option sheet changes color only, and this rule
 * judges status codes and console errors, which color cannot move; the contrast of each value in
 * each mode is the `audit` rule's to measure. A quick run, which the tests use to prove a failure
 * reaches this rule, builds each default in the light mode only.
 * @param {{ colorModes?: Record<string, string>, options?: { key: string, default: string, values: { value: string }[] }[] }} manifest
 * @param {boolean} [quick]
 * @returns {{ options: Record<string, string[]>, modes: string[] }[]}
 */
function renderRuns(manifest, quick = false) {
  const defaults = Object.fromEntries((manifest.options ?? []).map((option) => [option.key, [option.default]]));
  if (quick) return [{ options: defaults, modes: [FIRST_MODE] }];
  const every = Object.fromEntries((manifest.options ?? []).map((option) => [option.key, option.values.map((v) => v.value)]));
  const others = Object.keys(manifest.colorModes ?? {}).filter((mode) => mode !== FIRST_MODE);
  return [{ options: every, modes: [FIRST_MODE] }, ...(others.length ? [{ options: defaults, modes: others }] : [])];
}

/**
 * Each site build a render run makes, in build order: one option choice in one mode.
 * @param {Parameters<typeof renderRuns>[0]} manifest
 * @param {boolean} [quick]
 * @returns {{ options: Record<string, string>, mode: string }[]}
 */
export function renderBuilds(manifest, quick = false) {
  return renderRuns(manifest, quick).flatMap((run) =>
    combinations(manifest, run.options).flatMap((options) => run.modes.map((mode) => ({ options, mode }))),
  );
}

/**
 * Render a theme under the builds `renderBuilds` lists.
 * @param {{ dir: string, manifest: Parameters<typeof renderRuns>[0] | null, pages?: string[] | 'all', quick?: boolean }} ctx
 *   `pages` limits the run to the listed routes, every route the content serves when omitted; `quick`
 *   renders each option's default in the light mode only
 * @returns {Promise<{ file: string, message: string }[]>}
 */
export async function renderRule({ dir, manifest, pages = 'all', quick = false }) {
  if (!manifest) return [];
  const out = mkdtempSync(path.join(tmpdir(), 'cairn-theme-check-render-'));
  try {
    const shots = [];
    for (const { options, modes } of renderRuns(manifest, quick)) {
      shots.push(...(await runHeadless({ root: ROOT, theme: dir, pages, widths: [WIDTH], modes, options, viewportOnly: true, outDir: out })));
    }
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
