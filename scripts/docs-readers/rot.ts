#!/usr/bin/env -S npx tsx
/**
 * The facts container's exact-line rot measure.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/rot.ts
 *
 * `check-facts.mjs` accepts an anchor whose tokens appear anywhere in a ten-line window around a
 * `Source:` pointer's cited range, since this container's own anchors are often a paraphrase of a
 * multi-line block. That window forgives real drift: an anchor whose tokens sit five lines from
 * the line the pointer actually cites still passes. This script measures the narrower question
 * pass 1's baseline needs: of every anchored pointer, what share names tokens that do NOT sit on
 * the cited line itself (or, for a range, on any one line within it)? It reuses
 * `check-facts.mjs`'s own bullet, pointer, and path-resolution parsing directly, so a rot count
 * here is measured against exactly what the gate itself considers one pointer; the two small
 * helpers `check-facts.mjs` does not export (`expandLineSpec`, `anchorTokens`) are reproduced here
 * verbatim from its own logic, never reinvented.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBasenameIndex, extractBullets, extractPointers, factsFiles, resolvePointerPath, SKIPPED_SECTIONS } from '../checks/check-facts.mjs';
import { repoRoot } from '../repo-root.mjs';

/**
 * Every individual line number a pointer's line spec names, ranges expanded. Reproduced from
 * `check-facts.mjs`'s own (unexported) `expandLineSpec`.
 * @param lineSpec - `"22,63"` or `"296-297"` or `"22"`.
 * @returns Each named line number.
 */
function expandLineSpec(lineSpec: string): number[] {
  const lines: number[] = [];
  for (const part of lineSpec.split(',')) {
    const [start, end] = part.split('-').map(Number);
    const last = end ?? start;
    for (let n = start; n <= last; n++) lines.push(n);
  }
  return lines;
}

/**
 * Identifier-shaped tokens (3+ word characters) in an anchor snippet. Reproduced from
 * `check-facts.mjs`'s own (unexported) `anchorTokens`.
 * @param anchor - The anchor snippet quoted in a `Source:` pointer.
 * @returns The tokens the anchor names.
 */
function anchorTokens(anchor: string): string[] {
  return [...anchor.matchAll(/[A-Za-z_][A-Za-z0-9_]{2,}/g)].map((m) => m[0]);
}

/** One anchored `Source:` pointer's rot verdict. */
export interface RotFinding {
  /** The facts arm file the pointer's bullet lives in, repo-relative. */
  factsFile: string;
  /** The bullet's own starting line inside `factsFile`. */
  bulletLine: number;
  /** The pointer's own path, as written in the bullet. */
  path: string;
  /** The pointer's own line spec, as written in the bullet (for example `"22-24"`). */
  lineSpec: string;
  /** The anchor snippet, quoted verbatim. */
  anchor: string;
  /** True when every anchor token sits on the cited line, or on some line of the cited range. */
  onCitedLine: boolean;
  /** The anchor tokens that do not sit on the cited line(s), empty when `onCitedLine` is true. */
  missingTokens: string[];
}

/** The rot measure's full result: every anchored pointer's verdict, plus the summary counts. */
export interface RotReport {
  /** Every anchored `Source:` pointer found, across every facts arm file. */
  findings: RotFinding[];
  /** `findings.length`. */
  totalAnchored: number;
  /** How many findings are NOT on their cited line (`onCitedLine` false). */
  rotted: number;
  /** `rotted / totalAnchored`, `0` when there are no anchored pointers at all. */
  rotShare: number;
}

/**
 * Measure exact-line rot across every facts arm file: for each `Source:` pointer that carries a
 * quoted anchor, whether the anchor's tokens all sit on the pointer's own cited line (or, for a
 * range, all sit somewhere within the range, not necessarily the same line). A pointer whose path
 * does not resolve at all counts as rotted too, since its cited line cannot be checked.
 * @param root - The repo root the pointers resolve against.
 * @param factsDir - The facts container directory, defaulting to `docs/internal/facts` under `root`.
 * @returns The full report.
 */
export function measureRot(root: string, factsDir: string = `${root}/docs/internal/facts`): RotReport {
  const basenameIndex = buildBasenameIndex(root);
  const findings: RotFinding[] = [];

  for (const file of factsFiles(factsDir)) {
    const markdown = readFileSync(`${factsDir}/${file}`, 'utf8');
    const bullets = extractBullets(markdown).filter((b: { section: string | null }) => !SKIPPED_SECTIONS.has((b.section ?? '').trim().toLowerCase()));
    for (const bullet of bullets as Array<{ text: string; line: number }>) {
      const sourceIdx = bullet.text.indexOf('Source:');
      if (sourceIdx === -1) continue;
      const sourceField = bullet.text.slice(sourceIdx);
      for (const pointer of extractPointers(sourceField) as Array<{ path: string; lineSpec: string; anchor: string | null }>) {
        if (!pointer.anchor) continue;
        const resolved = resolvePointerPath(pointer.path, root, basenameIndex);
        if (!resolved) {
          findings.push({
            factsFile: file,
            bulletLine: bullet.line,
            path: pointer.path,
            lineSpec: pointer.lineSpec,
            anchor: pointer.anchor,
            onCitedLine: false,
            missingTokens: anchorTokens(pointer.anchor),
          });
          continue;
        }
        const fileLines = readFileSync(`${root}/${resolved}`, 'utf8').split('\n');
        const citedLines = expandLineSpec(pointer.lineSpec).filter((n) => n >= 1 && n <= fileLines.length);
        const citedText = citedLines.map((n) => fileLines[n - 1]).join('\n');
        const missingTokens = anchorTokens(pointer.anchor).filter((t) => !citedText.includes(t));
        findings.push({
          factsFile: file,
          bulletLine: bullet.line,
          path: pointer.path,
          lineSpec: pointer.lineSpec,
          anchor: pointer.anchor,
          onCitedLine: missingTokens.length === 0,
          missingTokens,
        });
      }
    }
  }

  const rotted = findings.filter((f) => !f.onCitedLine).length;
  return {
    findings,
    totalAnchored: findings.length,
    rotted,
    rotShare: findings.length === 0 ? 0 : rotted / findings.length,
  };
}

/**
 * The command-line entry point: run the measure against this checkout and print the counts.
 */
function main(): void {
  const root = repoRoot(import.meta.url);
  const report = measureRot(root);
  console.log(`docs-readers rot: ${report.totalAnchored} anchored pointer(s), ${report.rotted} not on their cited line`);
  console.log(`rot share: ${(report.rotShare * 100).toFixed(1)}%`);
  for (const finding of report.findings.filter((f) => !f.onCitedLine)) {
    console.log(`  ${finding.factsFile}:${finding.bulletLine}: ${finding.path}:${finding.lineSpec} names ${JSON.stringify(finding.missingTokens)}, not on the cited line`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
