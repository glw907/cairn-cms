// cairn's own admin tree and the shipped guidance's fences report zero radius-scale findings,
// zero findings from stock-default-hazards's three retired-patch arms, and zero error-tier
// stock-default-hazards findings. No gate runs either rule over the engine's own admin today
// (check:invisible-craft owns six rules, check:admin-css-classes one), so this is the direct
// proof that a real class token, not a description of one, has not reappeared in the shipped
// tree or the guidance a builder reads.
//
// A guidance fence is parsed after two normalizations a fence may legitimately rely on for
// readability: an elided expression `{...}` reads as `{_}`, and a line holding only `...` is
// dropped. Each fence is also prefixed with `<script lang="ts"></script>` so a TypeScript
// snippet parameter (`{#snippet panel(datum: HouseholdListRow)}`) parses. A fence that still
// does not parse fails this test naming its file and line; it is never skipped.
//
// One stated exemption: stock-default-hazards's guarded-retirement arm (identified by its own
// message, which names "cairn-btn-guarded") is not counted. At the time this test was written it
// fires four times in EditPage.svelte, because the engine keeps cairn-btn-guarded on those four
// controls by design (stock-default-hazards.ts's own comment on that arm). That arm's own
// promotion to error is still open, and it must retire those four sites first.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveConfig } from '../../../lib/audit/config.js';
import { parseComponent } from '../../../lib/audit/markup.js';
import { parseSheet } from '../../../lib/audit/sheet.js';
import { radiusScale } from '../../../lib/audit/rules/static/radius-scale.js';
import { stockDefaultHazards } from '../../../lib/audit/rules/static/stock-default-hazards.js';
import { walk } from '../../../../scripts/walk-files.mjs';
import type { ParsedComponent } from '../../../lib/audit/markup.js';
import type { Finding } from '../../../lib/audit/types.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SHEET = parseSheet('');
const CONFIG = resolveConfig('/site', null, () => true);

// The same roots the shipped static scope names for a library (src/lib/admin,
// src/lib/admin-toolkit) plus the showcase's own consumer-style admin route, so this reaches the
// only two places cairn's own repo keeps admin markup.
const ENGINE_SCAN_ROOTS = [
  'src/lib/admin',
  'src/lib/admin-toolkit',
  'examples/showcase/src/routes/admin',
];

const GUIDANCE_ROOTS = ['skills', 'claude/agents'];

function engineFiles(): ParsedComponent[] {
  return ENGINE_SCAN_ROOTS.map((dir) => resolve(ROOT, dir))
    .filter((dir) => existsSync(dir))
    .flatMap((dir) => walk(dir, (name) => name.endsWith('.svelte')))
    .map((path) => parseComponent(relative(ROOT, path), readFileSync(path, 'utf8')));
}

interface Fence {
  location: string;
  content: string;
}

const FENCE_START = /^```(svelte|html)\s*$/;

/** Every fenced `svelte` or `html` code block in one markdown file, indented or not. */
function extractFences(file: string): Fence[] {
  const lines = readFileSync(file, 'utf8').split('\n');
  const fences: Fence[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!FENCE_START.test(lines[i].trim())) continue;
    const startLine = i + 1;
    const content: string[] = [];
    i++;
    while (i < lines.length && lines[i].trim() !== '```') {
      content.push(lines[i]);
      i++;
    }
    fences.push({ location: `${relative(ROOT, file)}:${startLine}`, content: content.join('\n') });
  }
  return fences;
}

function guidanceFences(): Fence[] {
  return GUIDANCE_ROOTS.map((dir) => resolve(ROOT, dir))
    .filter((dir) => existsSync(dir))
    .flatMap((dir) => walk(dir, (name) => name.endsWith('.md')))
    .flatMap((file) => extractFences(file));
}

/** The two fence normalizations, applied before the script-tag prefix. */
function normalizeFence(content: string): string {
  const withoutEllipsisLines = content
    .split('\n')
    .filter((line) => line.trim() !== '...')
    .join('\n');
  return `<script lang="ts"></script>\n${withoutEllipsisLines.replace(/\{\.\.\.\}/g, '{_}')}`;
}

/** A fence parsed as a component, or a test failure naming the fence's own file and line. */
function parseFence(fence: Fence): ParsedComponent {
  try {
    return parseComponent(fence.location, normalizeFence(fence.content));
  } catch (err) {
    throw new Error(
      `${fence.location} does not parse after normalization: ` +
        (err instanceof Error ? err.message : String(err))
    );
  }
}

function isGuardedRetirementFinding(finding: Finding): boolean {
  return finding.message.includes('cairn-btn-guarded');
}

describe("radius-scale and stock-default-hazards over cairn's own tree and shipped guidance", () => {
  it('finds zero radius-scale findings and zero uncounted stock-default-hazards findings', () => {
    const engine = engineFiles();
    // Non-vacuity: a scan that reached no engine file proves nothing about the tree being clean.
    expect(engine.length).toBeGreaterThan(0);

    const fences = guidanceFences();
    // Non-vacuity: a fence count under the number this test was written against would mean the
    // walk missed a guidance file, not that the guidance got shorter.
    expect(fences.length).toBeGreaterThanOrEqual(13);
    const guidance = fences.map(parseFence);

    const files = [...engine, ...guidance];

    expect(radiusScale.check({ files, sheet: SHEET, config: CONFIG })).toEqual([]);

    const hazardFindings = stockDefaultHazards.check({ files, sheet: SHEET, config: CONFIG });
    const uncounted = hazardFindings.filter((finding) => !isGuardedRetirementFinding(finding));
    expect(uncounted).toEqual([]);
  });
});
