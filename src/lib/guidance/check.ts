// cairn-guidance check: seven reports comparing a consumer's tree against what the installed
// package expects, each judged PASS or FIX, plus a recommendation block that never gates. Pure
// functions here take already-resolved content (a `readFile` callback and a `GuidanceSource`) so
// every judgment is unit-testable without touching a real filesystem; bin.ts wires the real reads.
import { posix } from 'node:path';
import {
  CAIRN_DIR,
  MANIFEST_DEST,
  flattenGuidanceTree,
  hashFileTree,
  removableFromManifest,
  type GuidanceSource,
} from './install.js';

/** Read a file under a consumer's cwd, or null when absent. Injected for tests. */
export type ReadFile = (relPath: string) => Promise<string | null>;

/** The `@.claude/cairn/CLAUDE.md` import line the bake writes into a scaffolded site's CLAUDE.md. */
export const IMPORT_LINE = '@.claude/cairn/CLAUDE.md';

/** One reported line's tree verdict; `stale` and `missing` are each a FIX. */
export type TreeStatus = 'fresh' | 'stale' | 'missing';
export type SourceExclusionStatus = 'excluded' | 'not-excluded';

/** Read the installed copy of every packaged destination, or null when none of them exist. */
export async function readInstalledTree(
  readFile: ReadFile,
  destPaths: string[]
): Promise<Record<string, string> | null> {
  const files: Record<string, string> = {};
  let found = false;
  for (const destPath of destPaths) {
    const text = await readFile(destPath);
    if (text !== null) {
      found = true;
      files[destPath] = text;
    }
  }
  return found ? files : null;
}

/** Judge an installed tree against the packaged one, by the same tree hash the install uses. */
export function judgeTree(
  installed: Record<string, string> | null,
  packaged: Record<string, string>
): TreeStatus {
  if (installed === null) return 'missing';
  return hashFileTree(installed) === hashFileTree(packaged) ? 'fresh' : 'stale';
}

/** True when a `.gitignore` line ignores the whole `.claude/` directory. */
export function gitignoreExcludesClaude(gitignore: string): boolean {
  return gitignore
    .split('\n')
    .map((line) => line.trim())
    .some((line) => line === '.claude' || line === '.claude/' || line === '/.claude' || line === '/.claude/');
}

// A Tailwind entry: an import of `tailwindcss` or `tailwindcss/utilities[.css]` in either quote
// form, with any modifiers (a `layer(...)`, a `source(...)`) before the semicolon.
const ENTRY_IMPORT = /@import\s+(['"])tailwindcss(?:\/utilities(?:\.css)?)?\1([^;]*);/g;
const SOURCE_NOT = /@source\s+not\s+(['"])(.*?)\1/g;

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function isEntry(css: string): boolean {
  return [...css.matchAll(ENTRY_IMPORT)].some((m) => !(m[2] ?? '').includes('source(none)'));
}

/** True when a `@source not` in `css`, resolved against the stylesheet at `path`, names the root `.claude`. */
function excludesClaude(path: string, css: string): boolean {
  return [...css.matchAll(SOURCE_NOT)].some((m) => {
    const resolved = posix.normalize(posix.join(posix.dirname(path), m[2] ?? '')).replace(/\/+$/, '');
    return resolved === '.claude';
  });
}

/** The `@source not` line that excludes the root `.claude/` from a stylesheet at `path`. */
function exclusionLineFor(path: string): string {
  const rel = posix.relative(posix.dirname(path), '.claude');
  return `@source not "${rel.startsWith('..') ? rel : `./${rel}`}";`;
}

/**
 * Judge whether `.claude/` is excluded from the site's Tailwind build. A gitignored `.claude`
 * passes outright (Tailwind's scanner skips it), as does a site with no Tailwind entry. Otherwise
 * some listed stylesheet must carry a `@source not` that resolves, against that file, to the root
 * `.claude`; `@import` is not followed, so one file's exclusion counts for every entry. The
 * failing verdict names the first entry and the exact line for it.
 */
export async function judgeSourceExclusion(
  readFile: ReadFile,
  cssPaths: string[]
): Promise<{ status: SourceExclusionStatus; entry?: string; line?: string }> {
  const gitignore = await readFile('.gitignore');
  if (gitignore !== null && gitignoreExcludesClaude(gitignore)) return { status: 'excluded' };
  const files: { path: string; css: string }[] = [];
  for (const path of cssPaths) {
    const text = await readFile(path);
    if (text !== null) files.push({ path, css: stripComments(text) });
  }
  const entry = files.find((f) => isEntry(f.css));
  if (entry === undefined) return { status: 'excluded' };
  if (files.some((f) => excludesClaude(f.path, f.css))) return { status: 'excluded' };
  return { status: 'not-excluded', entry: entry.path, line: exclusionLineFor(entry.path) };
}

/** True when `package.json`'s `scripts` carries a `check:cairn` entry. */
export function judgeCheckCairnScript(packageJsonText: string | null): boolean {
  if (packageJsonText === null) return false;
  try {
    const pkg = JSON.parse(packageJsonText) as { scripts?: Record<string, unknown> };
    return typeof pkg.scripts?.['check:cairn'] === 'string';
  } catch {
    return false;
  }
}

/** One `.orig` line: every destination the packaged tree owns that carries a leftover `.orig`. */
export async function findOrigFiles(readFile: ReadFile, destPaths: string[]): Promise<string[]> {
  const found: string[] = [];
  for (const destPath of destPaths) {
    if ((await readFile(`${destPath}.orig`)) !== null) found.push(`${destPath}.orig`);
  }
  return found;
}

/** One line of the printed report. */
export interface ReportLine {
  /** True for a PASS line, false for a FIX line. */
  ok: boolean;
  detail: string;
}

/** The full seven-line report, plus the removable list and the strict-relevant tree status. */
export interface GuidanceCheckReport {
  tree: ReportLine & { status: TreeStatus; removable: string[] };
  importLine: ReportLine & { present: boolean };
  checkCairnScript: ReportLine & { present: boolean };
  auditConfig: ReportLine & { present: boolean };
  ciWorkflow: ReportLine & { present: boolean };
  sourceExclusion: ReportLine & { status: SourceExclusionStatus };
  orig: ReportLine & { paths: string[] };
}

/** Append a packaged snippet's body under a not-present detail line, when the package ships one. */
function withSnippet(detail: string, snippetKey: string, snippets: Record<string, string>): string {
  const body = snippets[snippetKey];
  return body === undefined ? detail : `${detail}\n${body}`;
}

/** Run every judgment against a consumer's cwd (through `readFile`) for a resolved source. */
export async function runGuidanceCheck(
  readFile: ReadFile,
  packaged: GuidanceSource,
  cssPaths: string[]
): Promise<GuidanceCheckReport> {
  const tree = flattenGuidanceTree(packaged);
  const destPaths = Object.keys(tree);

  const installed = await readInstalledTree(readFile, destPaths);
  const treeStatus = judgeTree(installed, tree);
  const removable = removableFromManifest(await readFile(MANIFEST_DEST), destPaths);

  const rootClaudeMd = await readFile('CLAUDE.md');
  const importPresent = rootClaudeMd !== null && rootClaudeMd.includes(IMPORT_LINE);

  const packageJsonText = await readFile('package.json');
  const checkCairnPresent = judgeCheckCairnScript(packageJsonText);

  const auditConfigPresent = (await readFile('cairn-audit.config.json')) !== null;
  const ciWorkflowPresent = (await readFile('.github/workflows/check.yml')) !== null;

  const sourceExclusion = await judgeSourceExclusion(readFile, cssPaths);
  const origPaths = await findOrigFiles(readFile, destPaths);

  return {
    tree: {
      ok: treeStatus === 'fresh',
      status: treeStatus,
      removable,
      detail:
        treeStatus === 'fresh'
          ? `the guidance tree at ${CAIRN_DIR} matches the installed package`
          : treeStatus === 'missing'
            ? 'the guidance tree is not installed; run npx cairn-guidance install'
            : `the guidance tree is stale; run npx cairn-guidance install to refresh it${removable.length > 0 ? ` (removable: ${removable.join(', ')})` : ''}`,
    },
    importLine: {
      ok: importPresent,
      present: importPresent,
      detail: importPresent
        ? `CLAUDE.md imports ${IMPORT_LINE}`
        : `CLAUDE.md is missing the import line; add ${IMPORT_LINE}`,
    },
    checkCairnScript: {
      ok: checkCairnPresent,
      present: checkCairnPresent,
      detail: checkCairnPresent
        ? 'package.json declares a check:cairn script'
        : withSnippet('package.json has no check:cairn script; see the snippet below', 'check-cairn.json', packaged.snippets),
    },
    auditConfig: {
      ok: auditConfigPresent,
      present: auditConfigPresent,
      detail: auditConfigPresent
        ? 'cairn-audit.config.json is present'
        : withSnippet('cairn-audit.config.json is missing; see the snippet below', 'cairn-audit.config.json', packaged.snippets),
    },
    ciWorkflow: {
      ok: ciWorkflowPresent,
      present: ciWorkflowPresent,
      detail: ciWorkflowPresent
        ? '.github/workflows/check.yml is present'
        : withSnippet('.github/workflows/check.yml is missing; see the snippet below', 'check.yml', packaged.snippets),
    },
    sourceExclusion: {
      ok: sourceExclusion.status === 'excluded',
      status: sourceExclusion.status,
      detail:
        sourceExclusion.status === 'excluded'
          ? '.claude/ is excluded from the Tailwind build'
          : `.claude/ is not excluded from the Tailwind build; add ${sourceExclusion.line} to ${sourceExclusion.entry} (Tailwind 4.1 or later)`,
    },
    orig: {
      ok: origPaths.length === 0,
      paths: origPaths,
      detail: origPaths.length > 0 ? `.orig files present: ${origPaths.join(', ')}` : 'no .orig files present',
    },
  };
}

/** The seven report lines in print order. */
function reportLines(report: GuidanceCheckReport): ReportLine[] {
  return [
    report.tree,
    report.importLine,
    report.checkCairnScript,
    report.auditConfig,
    report.ciWorkflow,
    report.sourceExclusion,
    report.orig,
  ];
}

/** True when `--strict` should exit 1: any line reports FIX. */
export function hasFixes(report: GuidanceCheckReport): boolean {
  return reportLines(report).some((line) => !line.ok);
}

/** The recommendation block, never counted against the seven reports above. */
export function formatRecommendations(): string {
  return [
    'Recommendations (not gated):',
    '  - Install the DaisyUI skill (the component reference for admin work).',
    '  - A free DaisyUI documentation MCP server: https://gitmcp.io/saadeghi/daisyui',
    '  - Blueprint is the paid DaisyUI MCP option, with a rules enforcer and quality inspector.',
  ].join('\n');
}

/** Render a full check run as plain text: PASS or FIX per line, the recommendations, then the count. */
export function formatCheckReport(report: GuidanceCheckReport): string {
  const all = reportLines(report);
  const fixes = all.filter((line) => !line.ok).length;
  return [
    ...all.map((line) => `${line.ok ? 'PASS' : 'FIX '}  ${line.detail}`),
    '',
    formatRecommendations(),
    '',
    `${all.length - fixes} passed, ${fixes} to fix`,
  ].join('\n');
}
