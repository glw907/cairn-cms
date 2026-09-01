// cairn-manifest's assembly: the argv parser, the bin's only knob beyond the write itself. A thin
// split so the bin stays a shell, mirroring cairn-doctor's own assemble.ts.

/** Printed for `--help` and on a rejected argument, at exit 0 and exit 2 respectively. */
export const USAGE = 'Usage: cairn-manifest [--help]';

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
