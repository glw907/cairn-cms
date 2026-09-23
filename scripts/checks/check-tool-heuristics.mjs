// cairn-cms: the tool-heuristics tripwire. The Go tool's `cairn doctor` proves several checks by
// a text-read heuristic against the engine's own shape: it greps a site's source for a literal
// engine symbol name, never imports the engine into its process (a Go binary cannot import
// TypeScript). A rename or removal of one of those symbols on the engine side silently breaks the
// heuristic everywhere it runs, with no compiler to catch it, since nothing on the TypeScript
// side references the Go tool's regex. This gate is that missing compiler: it greps `src/lib` for
// the exact literal each heuristic keys on and fails, naming the site, the moment one goes
// missing.
//
// Scoped to `src/lib`, pinned to exact forms, never loose words: a substring match would pass a
// renamed symbol that happens to share a word, defeating the point of a tripwire. Each watched
// site below carries a co-located `// WATCH: check:tool-heuristics` comment, so the next editor
// sees the dependency before they touch the line.
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * @typedef {{
 *   file: string,
 *   heuristic: string,
 *   description: string,
 *   pattern: RegExp,
 *   minCount?: number,
 * }} HeuristicWatch
 */

/**
 * The four literals the Go tool's heuristics key on. Three are real engine symbols
 * (`CairnAdminShell`, `.shellLoad`, `createAuthGuard`); the fourth, `checkOrigin: false`, is a
 * SvelteKit config key the engine never exports, so the watch instead pins the literal the engine
 * tells every site to write, inside `config.csrf-disable`'s own `why`/`remediation` text.
 * @type {HeuristicWatch[]}
 */
export const WATCHES = [
  {
    file: 'src/lib/components/index.ts',
    heuristic: 'admin.mount-shape',
    description: "the CairnAdminShell component export, which the mount-shape heuristic matches by name",
    pattern: /export \{ default as CairnAdminShell \} from '\.\/CairnAdminShell\.svelte';/,
  },
  {
    file: 'src/lib/sveltekit/cairn-admin.ts',
    heuristic: 'admin.mount-shape',
    description: "the shellLoad member on CairnAdminRoutes, which the mount-shape heuristic proves the layout calls",
    pattern: /shellLoad: InternalCairnAdminRoutes\['shellLoad'\];/,
  },
  {
    file: 'src/lib/sveltekit/guard.ts',
    heuristic: 'auth.role-wiring',
    description: "the createAuthGuard export, whose argument shape the role-wiring heuristic reads",
    pattern: /export function createAuthGuard\(config: AuthGuardConfig = \{\}\): Handle \{/,
  },
  {
    file: 'src/lib/diagnostics/conditions.ts',
    heuristic: 'config.csrf-disable',
    description:
      "the checkOrigin: false literal in config.csrf-disable's why and remediation text, the engine telling every site to write the exact string the heuristic greps for",
    pattern: /checkOrigin: false/g,
    minCount: 2,
  },
];

/**
 * Every watch whose pattern no longer matches (or matches fewer than `minCount` times) in its
 * file, each entry naming the file and the heuristic it would silently break.
 * @param {string} root
 * @returns {HeuristicWatch[]}
 */
export function findBrokenWatches(root = ROOT) {
  const broken = [];
  for (const watch of WATCHES) {
    const text = readFileSync(join(root, watch.file), 'utf8');
    const count = watch.pattern.global
      ? (text.match(watch.pattern) ?? []).length
      : watch.pattern.test(text)
        ? 1
        : 0;
    if (count < (watch.minCount ?? 1)) broken.push(watch);
  }
  return broken;
}

function main() {
  const broken = findBrokenWatches();
  if (broken.length === 0) {
    console.log(`check-tool-heuristics: OK (${WATCHES.length} watched sites)`);
    return;
  }
  console.error(`check-tool-heuristics: ${broken.length} broken watch(es)\n`);
  for (const watch of broken) {
    console.error(
      `  ${watch.file}: the ${watch.heuristic} heuristic's watch broke: ${watch.description} no longer matches`,
    );
  }
  process.exitCode = 1;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
