#!/usr/bin/env node
// cairn-doctor: the environment preflight. A thin shell over index.ts (where the unit tests
// reach the logic): parse the flags, assemble the context with the real fetch and filesystem,
// run the default registry plus the opt-in live send, print the report. Bad flags go to
// stderr with exit 2; a failed check exits 1; a clean or all-skip run exits 0. The codes go
// through process.exitCode, never process.exit, so a piped stdout flushes the whole report
// before the process ends.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { liveProbeCheck } from './check-probe.js';
import { liveSendCheck } from './check-send.js';
import { readWranglerConfig } from './wrangler-config.js';
import {
	contextFromEnv,
	defaultChecks,
	deriveMissingInputs,
	formatReport,
	parseArgs,
	runDoctor,
} from './index.js';

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
	const readFileUnderCwd = async (relPath: string): Promise<string | null> => {
		try {
			return await readFile(resolve(cwd, relPath), 'utf8');
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
			throw err;
		}
	};
	// Fill inputs the flags and env left missing from the repo itself: from and repo off the
	// adapter (through the vite arm, which exists only on this bin path, never in a Worker)
	// and the account id off the wrangler config. The API token stays env-only.
	const derived = await deriveMissingInputs(contextFromEnv(process.env, args, cwd), {
		adapterFacts: async () => {
			const { readAdapterFacts } = await import('../vite/index.js');
			return readAdapterFacts(cwd);
		},
		wranglerAccountId: async () => (await readWranglerConfig(readFileUnderCwd))?.accountId,
	});
	const ctx = {
		...derived,
		fetch: globalThis.fetch,
		readFile: readFileUnderCwd,
	};

	const checks = defaultChecks();
	if (args.sendTest) checks.push(liveSendCheck(args.sendTest));
	// The probe is an opt-in network POST against a live site, so it joins only on --probe;
	// the bare flag hands the URL resolution (the PUBLIC_ORIGIN input) to the check itself.
	if (args.probe !== undefined) {
		checks.push(liveProbeCheck(args.probe === true ? undefined : args.probe));
	}

	const { results, failed } = await runDoctor(checks, ctx);
	console.log(formatReport(results));
	process.exitCode = failed > 0 ? 1 : 0;
}

await main();
