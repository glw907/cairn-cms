// cairn-guidance check: seven reports comparing a consumer's tree against what the installed
// package expects, plus a recommendation block that never gates. Pure functions here take
// already-resolved content (a `readFile` callback and a `GuidanceSource`) so every judgment is
// unit-testable without touching a real filesystem; bin.ts wires the real reads.
import {
  FRAGMENT_DEST,
  MANIFEST_DEST,
  flattenGuidanceTree,
  hashFileTree,
  isGuidancePath,
  type GuidanceSource,
} from './install.js';

/** Read a file under a consumer's cwd, or null when absent. Injected for tests. */
export type ReadFile = (relPath: string) => Promise<string | null>;

/** The `@.claude/cairn/CLAUDE.md` import line the bake writes into a scaffolded site's CLAUDE.md. */
export const IMPORT_LINE = '@.claude/cairn/CLAUDE.md';

/** The directive that excludes `.claude/` from a Tailwind build's automatic source detection. */
export const SOURCE_EXCLUSION_LINE = '@source not "./.claude";';

// The scaffold's own admin stylesheet path first (packages/create-cairn-site/scripts/bake-template.mjs),
// then one common alternative; `judgeSourceExclusion` reports unknown and names every path it
// looked at, including these, when it identifies neither.
const SOURCE_CSS_CANDIDATES = ['src/admin.css', 'src/theme/admin.css'];

/** One reported line's verdict; `stale` and `missing` are what `--strict` can fail on. */
export type TreeStatus = 'fresh' | 'stale' | 'missing';
export type SourceExclusionStatus = 'excluded' | 'not-excluded' | 'unknown';

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

/**
 * Judge whether `.claude/` is excluded from the site's own Tailwind build: a gitignored
 *  `.claude` passes outright (Tailwind's own scanner skips it), otherwise the candidate admin
 *  stylesheets are read in order and the first one that carries any `@source` directive at all
 *  decides the verdict; when neither signal is found the item reports unknown, naming every path
 *  it looked at.
 */
export async function judgeSourceExclusion(
  readFile: ReadFile
): Promise<{ status: SourceExclusionStatus; checked: string[] }> {
  const checked = ['.gitignore'];
  const gitignore = await readFile('.gitignore');
  if (gitignore !== null && gitignoreExcludesClaude(gitignore)) {
    return { status: 'excluded', checked };
  }
  for (const candidate of SOURCE_CSS_CANDIDATES) {
    checked.push(candidate);
    const content = await readFile(candidate);
    if (content === null || !content.includes('@source')) continue;
    return { status: content.includes(SOURCE_EXCLUSION_LINE) ? 'excluded' : 'not-excluded', checked };
  }
  return { status: 'unknown', checked };
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
  packaged: GuidanceSource
): Promise<GuidanceCheckReport> {
  const tree = flattenGuidanceTree(packaged);
  const destPaths = Object.keys(tree);

  const installed = await readInstalledTree(readFile, destPaths);
  const treeStatus = judgeTree(installed, tree);
  const manifestText = await readFile(MANIFEST_DEST);
  const manifestPaths = manifestText
    ? manifestText.split('\n').map((line) => line.trim()).filter(Boolean)
    : [];
  // A previous MANIFEST is an editable file in the site's own repo, and these lines get printed,
  // so a line naming anything outside .claude/ is dropped rather than shown as removable.
  const removable = manifestPaths.filter(
    (path) => !destPaths.includes(path) && isGuidancePath(path)
  );

  const rootClaudeMd = await readFile('CLAUDE.md');
  const importPresent = rootClaudeMd !== null && rootClaudeMd.includes(IMPORT_LINE);

  const packageJsonText = await readFile('package.json');
  const checkCairnPresent = judgeCheckCairnScript(packageJsonText);

  const auditConfigPresent = (await readFile('cairn-audit.config.json')) !== null;
  const ciWorkflowPresent = (await readFile('.github/workflows/check.yml')) !== null;

  const sourceExclusion = await judgeSourceExclusion(readFile);
  const origPaths = await findOrigFiles(readFile, destPaths);

  return {
    tree: {
      status: treeStatus,
      removable,
      detail:
        treeStatus === 'fresh'
          ? `the guidance tree at ${FRAGMENT_DEST.replace('/CLAUDE.md', '')} matches the installed package`
          : treeStatus === 'missing'
            ? 'the guidance tree is not installed; run npx cairn-guidance install'
            : `the guidance tree is stale; run npx cairn-guidance install to refresh it${removable.length > 0 ? ` (removable: ${removable.join(', ')})` : ''}`,
    },
    importLine: {
      present: importPresent,
      detail: importPresent
        ? `CLAUDE.md imports ${IMPORT_LINE}`
        : `CLAUDE.md is missing the import line; add ${IMPORT_LINE}`,
    },
    checkCairnScript: {
      present: checkCairnPresent,
      detail: checkCairnPresent
        ? 'package.json declares a check:cairn script'
        : withSnippet('package.json has no check:cairn script; see the snippet below', 'check-cairn.json', packaged.snippets),
    },
    auditConfig: {
      present: auditConfigPresent,
      detail: auditConfigPresent
        ? 'cairn-audit.config.json is present'
        : withSnippet('cairn-audit.config.json is missing; see the snippet below', 'cairn-audit.config.json', packaged.snippets),
    },
    ciWorkflow: {
      present: ciWorkflowPresent,
      detail: ciWorkflowPresent
        ? '.github/workflows/check.yml is present'
        : withSnippet('.github/workflows/check.yml is missing; see the snippet below', 'check.yml', packaged.snippets),
    },
    sourceExclusion: {
      status: sourceExclusion.status,
      detail:
        sourceExclusion.status === 'excluded'
          ? '.claude/ is excluded from the Tailwind build'
          : sourceExclusion.status === 'not-excluded'
            ? `.claude/ is not excluded from the Tailwind build; add ${SOURCE_EXCLUSION_LINE} (Tailwind 4.1 or later)`
            : `could not identify the Tailwind entry; checked ${sourceExclusion.checked.join(', ')}; add ${SOURCE_EXCLUSION_LINE} to your Tailwind entry CSS once you find it (Tailwind 4.1 or later)`,
    },
    orig: {
      paths: origPaths,
      detail: origPaths.length > 0 ? `.orig files present: ${origPaths.join(', ')}` : 'no .orig files present',
    },
  };
}

/** True when `--strict` should exit 1: the guidance tree is stale or missing. */
export function isStaleUnderStrict(report: GuidanceCheckReport): boolean {
  return report.tree.status !== 'fresh';
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

/** Render a full check run as plain text. */
export function formatCheckReport(report: GuidanceCheckReport): string {
  const lines = [
    report.tree.detail,
    report.importLine.detail,
    report.checkCairnScript.detail,
    report.auditConfig.detail,
    report.ciWorkflow.detail,
    report.sourceExclusion.detail,
    report.orig.detail,
    '',
    formatRecommendations(),
  ];
  return lines.join('\n');
}
