// cairn-cms: regenerates the two neutral mirrors the Go tool reads without a Node runtime.
// tool/internal/spine/conditions.json carries the condition registry's text (title, why,
// remediation, docsAnchor), the half TestConditionsMatchRegistry does not read: that Go test pins
// only the id set by scraping conditions.ts's REGISTRY keys with a regex, and stays canonical for
// the id set through this pass and retire-1. This mirror is canonical for the text instead.
// tool/internal/doctor/site-config-path.json is unrelated to conditions; it just rides the same
// generator since both are small, deterministic JSON mirrors with the same regenerate-and-compare
// gate (check-tool-conditions.mjs).
//
// Reads the registry the way check-readiness.mjs does: resolve the built dist, never a regex over
// the .ts source, so the mirror always reflects what the engine actually exports, not a
// source-text approximation that could drift from a build-time transform.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CONDITIONS_JS = 'dist/diagnostics/conditions.js';
const SITE_CONFIG_PATH_SOURCE = 'packages/create-cairn-site/src/site-config-path.json';

export const CONDITIONS_OUT = 'tool/internal/spine/conditions.json';
export const SITE_CONFIG_PATH_OUT = 'tool/internal/doctor/site-config-path.json';

/** The seven fields the Go tool's mirror carries, and no others, in this exact key order. */
const FIELDS = ['id', 'severity', 'title', 'why', 'remediation', 'docsAnchor', 'logEvent'];

/**
 * Project one condition down to the mirror's fixed field set, omitting an optional field the
 * condition carries none of rather than writing it as null.
 * @param {{ id: string, severity: string, title: string, why: string, remediation: string, docsAnchor?: string, logEvent?: string }} condition
 */
function projectCondition(condition) {
  const out = {};
  for (const field of FIELDS) {
    if (condition[field] !== undefined) out[field] = condition[field];
  }
  return out;
}

/**
 * Serializes the conditions mirror deterministically: entries sorted by id, two-space indent,
 * one trailing newline, so regeneration is byte-identical run to run.
 * @param {{ id: string }[]} conditions
 */
export function serializeConditions(conditions) {
  const sorted = [...conditions].sort((a, b) => a.id.localeCompare(b.id));
  return `${JSON.stringify(sorted.map(projectCondition), null, 2)}\n`;
}

async function loadConditions() {
  const distPath = resolve(ROOT, CONDITIONS_JS);
  if (!existsSync(distPath)) {
    throw new Error(`missing ${CONDITIONS_JS}; run "npm run package" first`);
  }
  const { allConditions } = await import(pathToFileURL(distPath).href);
  return allConditions();
}

/** Regenerates both mirrors' contents in memory, without touching disk. */
export async function buildMirrors() {
  const conditions = await loadConditions();
  const siteConfigPath = readFileSync(resolve(ROOT, SITE_CONFIG_PATH_SOURCE), 'utf8');
  return {
    [CONDITIONS_OUT]: serializeConditions(conditions),
    [SITE_CONFIG_PATH_OUT]: siteConfigPath,
  };
}

async function main() {
  const mirrors = await buildMirrors();
  for (const [path, contents] of Object.entries(mirrors)) {
    writeFileSync(resolve(ROOT, path), contents);
    console.log(`emit-tool-conditions: wrote ${path}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
