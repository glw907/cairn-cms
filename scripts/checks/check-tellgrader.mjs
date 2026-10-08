// cairn-cms: the tellgrader gate. `tellgrader` (a workstation binary) grades prose for cadence
// tells; under the repo's docs-register profile (.tellgrader.json) it gates on exactly one finding,
// `trailing-hinge-run`: a paragraph whose consecutive sentences each end in a comma-hinged tail
// (", since ...", ", which ...", ", so ..."). This script runs it over every published docs page
// and fails when any file gates, printing each gating finding as `file:line: excerpt`.
//
// CI has no tellgrader. When the binary is absent the check prints one skip line and passes, so
// absence never fails a build.
//
// Interface: `node scripts/checks/check-tellgrader.mjs [<page> ...]`. With no arguments it scans
// the published tree; with paths it scans only those (a page-chain gate passes `--page`).
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve, dirname, relative, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// Directories under docs/ that are not published pages, and the two rolling ledgers beside them.
const UNPUBLISHED_DIRS = new Set(["internal", "superpowers"]);
const UNPUBLISHED_FILES = new Set(["docs/STATUS.md", "docs/HISTORY.md"]);

/**
 * Every published Markdown page under docs/, as repo-relative paths in sorted order.
 * @param {string} [root] repository root
 * @returns {string[]}
 */
export function publishedPages(root = ROOT) {
  /** @type {string[]} */
  const pages = [];
  /** @param {string} dir */
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      const rel = relative(root, full);
      if (entry.isDirectory()) {
        if (dir === join(root, "docs") && UNPUBLISHED_DIRS.has(entry.name))
          continue;
        walk(full);
      } else if (entry.name.endsWith(".md") && !UNPUBLISHED_FILES.has(rel)) {
        pages.push(rel);
      }
    }
  };
  walk(join(root, "docs"));
  return pages.sort();
}

/**
 * The gating findings in one tellgrader report, formatted `file:line: excerpt`.
 * @param {{ path?: string, findings?: { line: number, excerpt: string, gate?: boolean }[] }} report
 * @returns {string[]}
 */
export function gatingLines(report) {
  return (report.findings ?? [])
    .filter((finding) => finding.gate)
    .map((finding) => `${report.path}:${finding.line}: ${finding.excerpt}`);
}

function main() {
  const probe = spawnSync("tellgrader", ["--help"], { encoding: "utf8" });
  if (probe.error) {
    console.log(
      "check:tellgrader: skipped, tellgrader is not installed (workstation tool)",
    );
    return;
  }
  const pages =
    process.argv.length > 2 ? process.argv.slice(2) : publishedPages();
  /** @type {string[]} */
  const failures = [];
  for (const page of pages) {
    const run = spawnSync("tellgrader", ["--register", "docs", page], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
    if (run.status === 0) continue;
    if (run.status !== 2) {
      console.error(
        `check:tellgrader: tellgrader failed on ${page}: ${run.stderr.trim()}`,
      );
      process.exitCode = 1;
      return;
    }
    failures.push(...gatingLines(JSON.parse(run.stdout)));
  }
  if (failures.length === 0) {
    console.log(`check:tellgrader: OK (${pages.length} page(s))`);
    return;
  }
  for (const line of failures) console.error(line);
  console.error(`check:tellgrader: ${failures.length} gating finding(s)`);
  process.exitCode = 1;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
