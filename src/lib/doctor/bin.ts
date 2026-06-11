#!/usr/bin/env node
// cairn-doctor: the environment preflight. A thin shell over index.ts (where the unit tests
// reach the logic): parse the flags, assemble the context with the real fetch and filesystem,
// run the default registry plus the opt-in live send, print the report. Bad flags go to
// stderr with exit 2; a failed check exits 1; a clean or all-skip run exits 0. The codes go
// through process.exitCode, never process.exit, so a piped stdout flushes the whole report
// before the process ends.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { liveSendCheck } from './check-send.js';
import { contextFromEnv, defaultChecks, formatReport, parseArgs, runDoctor } from './index.js';

async function main(): Promise<void> {
	let args: ReturnType<typeof parseArgs>;
	try {
		args = parseArgs(process.argv.slice(2));
	} catch (err) {
		console.error(err instanceof Error ? err.message : String(err));
		process.exitCode = 2;
		return;
	}

	const cwd = process.cwd();
	const ctx = {
		...contextFromEnv(process.env, args, cwd),
		fetch: globalThis.fetch,
		readFile: async (relPath: string): Promise<string | null> => {
			try {
				return await readFile(resolve(cwd, relPath), 'utf8');
			} catch (err) {
				if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
				throw err;
			}
		},
	};

	const checks = defaultChecks();
	if (args.sendTest) checks.push(liveSendCheck(args.sendTest));

	const { results, failed } = await runDoctor(checks, ctx);
	console.log(formatReport(results));
	process.exitCode = failed > 0 ? 1 : 0;
}

await main();
