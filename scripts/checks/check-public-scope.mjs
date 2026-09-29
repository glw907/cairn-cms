// cairn-cms: the public-theme gate over cairn's own tree. It runs cairn-audit's three public-scope
// rules (public-literals, theme-conformance, theme-contrast) from the packaged audit over the
// showcase, then again with the cairn-theme identity overlay (examples/cairn-theme/cairn.css)
// layered after theme.css in the import chain, so an overlay retone is held to the same floor, then
// a third time over a temporary copy of the showcase with the fixture theme in place of theme.css.
//
// A consumer runs these rules at advisory tier. cairn's own tree holds itself to more: any
// unsuppressed finding at either tier fails this gate, so all three rules gate cairn's CI from the
// day they register. A suppressed finding is a reasoned exception and never fails it.
//
// The roots come from the repo-owned scripts/checks/public-scope.config.json, never the showcase's
// own config, which the template receives: that file adds the engine's src/lib/public as a public
// root and cairn-public.css as a theme root, both paths a scaffolded site does not have. The audit
// reads cairn-public.css through the showcase's installed engine, so the showcase's node_modules
// must be installed and the engine packaged (the npm script packages first). The fixture run reads
// the copy the theme-fixture harness makes, which sits one level below the repository root, so the
// two engine roots are retargeted from `../../` to `../` for it. The copy is removed when the run
// ends.
//
// Each run prints the audit's report, its scanned count, and each scheme's measured-pair count
// against the pair list's length. Wired as `npm run check:public-tokens`.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../repo-root.mjs';
import { makeShowcaseCopy } from '../lab/theme-fixture-copy.mjs';

/** @typedef {import('../../src/lib/audit/types.js').AuditReport} AuditReport */

const ROOT = repoRoot(import.meta.url);
const SHOWCASE = resolve(ROOT, 'examples/showcase');
const CONFIG = resolve(ROOT, 'scripts/checks/public-scope.config.json');
const FIXTURE_THEME = resolve(ROOT, 'scripts/lab/theme-fixture/theme.css');

/** The rules this gate runs: every rule that reads the public scope. */
export const PUBLIC_RULES = ['public-literals', 'theme-conformance', 'theme-contrast'];

/**
 * The three runs. The overlay run names a second entry stylesheet, relative to the showcase, so the
 * chain reads the overlay after the theme the way a site that imports it does. The fixture run
 * audits a temporary copy of the showcase whose theme.css is the fixture theme.
 * @type {{ label: string, stylesheets?: string[], fixture?: boolean }[]}
 */
export const VARIANTS = [
  { label: 'the showcase' },
  { label: 'the showcase with the cairn-theme overlay', stylesheets: ['src/theme/theme.css', '../cairn-theme/cairn.css'] },
  { label: 'the showcase copy with the fixture theme', stylesheets: ['src/theme/theme.css'], fixture: true },
];

/**
 * Retarget the repo-owned config's engine roots for a copy one level below the repository root:
 * the showcase reaches them through `../../`, the copy through `../`.
 * @param {string} path
 * @returns {string}
 */
function fromCopy(path) {
  return path.startsWith('../../') ? path.slice(3) : path;
}

/**
 * One run's outcome, as the exit logic reads it.
 * @typedef {object} PublicScopeRun
 * @property {Pick<AuditReport, 'findings' | 'filesScanned'>} report the audit's report: its
 *   unsuppressed findings and its scanned count
 * @property {{ name: string, expected: number, measured: number }[]} schemes each scheme's pair
 *   count against the pair list's length
 */

/**
 * The gate's exit code: 1 when any run left an unsuppressed finding at either tier, scanned no
 * file, measured no scheme, or measured a scheme short of its pair list; 0 otherwise. A suppressed
 * finding is not in `report.findings`, so it never fails the gate.
 * @param {PublicScopeRun[]} runs
 * @returns {number}
 */
export function publicScopeExitCode(runs) {
  const failed = runs.some(
    (run) =>
      run.report.findings.length > 0 ||
      run.report.filesScanned === 0 ||
      run.schemes.length === 0 ||
      run.schemes.some((scheme) => scheme.measured !== scheme.expected)
  );
  return failed ? 1 : 0;
}

async function main() {
  try {
    const audit = await import('../../dist/audit/index.js');
    const raw = JSON.parse(readFileSync(CONFIG, 'utf8'));
    /** @type {PublicScopeRun[]} */
    const runs = [];
    for (const variant of VARIANTS) {
      const copy = variant.fixture ? makeShowcaseCopy({ root: ROOT, themeFile: FIXTURE_THEME }) : undefined;
      try {
        const site = copy?.dir ?? SHOWCASE;
        const publicKeys = {
          ...raw.public,
          ...(copy && { scope: raw.public.scope.map(fromCopy), themeRoots: raw.public.themeRoots.map(fromCopy) }),
          ...(variant.stylesheets && { stylesheets: variant.stylesheets }),
        };
        const file = { ...raw, public: publicKeys };
        const config = audit.resolveConfig(site, file, (candidate) => existsSync(resolve(site, candidate)));
        const report = audit.runStatic(config, audit.selectRules(audit.staticRules(), PUBLIC_RULES));
        const chain = audit.loadImportChain(site, config.publicStylesheets);
        const { themes } = audit.loadDaisyThemeKeys(site, audit.nodePeers);
        const { schemes } = audit.measureThemeContrast(chain.files, themes, config.publicStylesheets[0]);
        console.log(`\n== ${variant.label} (${config.publicStylesheets.join(', ')}) ==`);
        console.log(audit.formatReport(report));
        console.log(`Scanned ${report.filesScanned} files.`);
        for (const scheme of schemes) {
          console.log(`theme-contrast: scheme "${scheme.name}" measured ${scheme.measured} of ${scheme.expected} pairs in each of ${scheme.states.length} states`);
        }
        runs.push({ report, schemes });
      } finally {
        if (copy) {
          copy.remove();
          console.log('The temporary copy was removed.');
        }
      }
    }
    const code = publicScopeExitCode(runs);
    console.log(`\ncheck:public-tokens: ${code === 0 ? 'PASS' : 'FAIL'}`);
    process.exitCode = code;
  } catch (err) {
    console.error(`check-public-scope: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
