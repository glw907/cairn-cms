// cairn-manifest's assembly: the argv parser, the bin's only knob beyond the write itself, and the
// pure report helpers. A thin split so the bin stays a shell, mirroring cairn-media-seed's assemble.ts.
import type { ManifestProblem } from '../content/manifest.js';

/** Printed for `--help` and on a rejected argument, at exit 0 and exit 2 respectively. */
export const USAGE = [
  'Usage: cairn-manifest [--help]',
  '',
  'Run from the project root. Reads the cairnManifest() plugin options from the Vite config, writes the',
  'content manifest to /src/content/.cairn/index.json and site-facts.json to its sibling,',
  'keeps each entry\'s publishedAt stamp, and prints a one-line summary. Exit codes: 0 written (or',
  '--help); 1 written with an invalid non-draft entry, or the write failed (message on stderr; no Vite',
  'config, or no cairnManifest() plugin in it); 2 an unrecognized argument.',
].join('\n');

/** The bin's parsed argv. `help` is the only recognized flag; the write path takes no others. */
export interface ManifestArgs {
  /** `--help` printed `USAGE` and exited, never reaching `writeManifest`. */
  help?: boolean;
}

/** Parse the bin's argv. Accepts only `--help`; throws with a usage line on anything else. */
export function parseArgs(argv: string[]): ManifestArgs {
  const args: ManifestArgs = {};
  for (const flag of argv) {
    if (flag === '--help') {
      args.help = true;
      continue;
    }
    throw new Error(`unknown argument ${flag}\n${USAGE}`);
  }
  return args;
}

/** What applying a regenerated manifest found, the input to {@link formatManifestSummary}. */
export interface ManifestReport {
  /** The rows the applied manifest holds. */
  entries: number;
  /** The rows added, removed, or altered against the committed file. */
  changed: number;
  /** Whether the file's bytes changed, which a reformatted file can do with no row changed. */
  written: boolean;
  /** The entries the build found wrong, in build order. */
  problems: ManifestProblem[];
  /**
   * Set when a dev start withheld the write because a published entry went invalid and its row would
   *  have been dropped, which loses its publish stamp. Then `entries` and `changed` count the
   *  committed file as it stays. Only a dev start holds; `cairn-manifest` always writes.
   */
  held?: true;
}

/** One problem as `concept/id: field: message`, naming its first error. */
function formatProblem(problem: ManifestProblem): string {
  const key = `${problem.concept}/${problem.id}`;
  const first = Object.entries(problem.errors)[0];
  return first ? `${key}: ${first[0]}: ${first[1]}` : key;
}

/** One group's clause: its count, its first problem, and how many more follow. */
function problemClause(problems: ManifestProblem[], one: string, many: string): string {
  const more = problems.length > 1 ? ` (+${problems.length - 1} more)` : '';
  return `${problems.length} ${problems.length === 1 ? one : many}: ${formatProblem(problems[0])}${more}`;
}

/**
 * Format a report as one line, such as
 *  `index.json: 15 entries, 2 changed; site-facts.json unchanged; 1 invalid: posts/hello: title: Title is required`.
 *  The site-facts clause is omitted when `factsChanged` is undefined, and a problem clause when no
 *  problem belongs in it.
 */
export function formatManifestSummary(report: ManifestReport, factsChanged?: boolean): string {
  const { entries, changed, problems } = report;
  const clauses = [`index.json: ${entries} ${entries === 1 ? 'entry' : 'entries'}, ${changed} changed`];
  if (factsChanged !== undefined) clauses.push(`site-facts.json ${factsChanged ? 'changed' : 'unchanged'}`);
  const live = problems.filter((p) => !p.draft);
  const drafts = problems.filter((p) => p.draft);
  if (report.held) clauses.push('held, not written: a published entry is invalid (fix it; cairn-manifest still writes)');
  if (live.length > 0) clauses.push(problemClause(live, 'invalid', 'invalid'));
  if (drafts.length > 0) clauses.push(problemClause(drafts, 'invalid draft', 'invalid drafts'));
  return clauses.join('; ');
}

/** The bin's exit code for a finished write: 1 when a non-draft entry has a problem, else 0. */
export function manifestExitCode(report: ManifestReport): 0 | 1 {
  return report.problems.some((p) => !p.draft) ? 1 : 0;
}
