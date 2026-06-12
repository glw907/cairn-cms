// cairn-doctor's assembly: the flag parser, the context builder, and the default check
// registry, all pure functions so the bin shell stays a thin wrapper like cairn-manifest's.
// The module is internal; no public subpath exports it, and the bin is its only consumer.
import type { DoctorCheck, DoctorContext } from './types.js';
import {
	configBindings,
	configObservability,
	configCsrfDisable,
	configSiteConfig,
	configPublicOrigin,
} from './checks-local.js';
import { emailSenderOnboarded, edgeHttpsForced, edgeHsts, authStore } from './checks-cloudflare.js';
import { githubApp } from './checks-github.js';

export { runDoctor } from './run.js';
export { formatReport } from './report.js';

const USAGE = 'Usage: cairn-doctor [--from <address>] [--repo <owner/name>] [--send-test <address>]';

export interface DoctorArgs {
	from?: string;
	repo?: string;
	sendTest?: string;
}

const FLAGS: Record<string, keyof DoctorArgs> = {
	'--from': 'from',
	'--repo': 'repo',
	'--send-test': 'sendTest',
};

/** Parse the bin's argv (long flags only). Throws with a usage line on anything unexpected. */
export function parseArgs(argv: string[]): DoctorArgs {
	const args: DoctorArgs = {};
	for (let i = 0; i < argv.length; i += 2) {
		const flag = argv[i];
		const key = FLAGS[flag];
		if (!key) throw new Error(`unknown argument ${flag}\n${USAGE}`);
		const value = argv[i + 1];
		if (value === undefined || value.startsWith('--')) {
			throw new Error(`${flag} needs a value\n${USAGE}`);
		}
		args[key] = value;
	}
	return args;
}

/**
 * Build the doctor's context from the environment and the parsed flags. A flag beats its env
 * variable, and github assembles only when the whole credential trio is present, so the GitHub
 * check skips with one remediation line instead of failing on a partial setup. fetch and
 * readFile stay with the bin, which injects the real ones.
 */
export function contextFromEnv(
	env: Record<string, string | undefined>,
	args: DoctorArgs,
	cwd: string
): Omit<DoctorContext, 'fetch' | 'readFile'> {
	const { GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, GITHUB_APP_PRIVATE_KEY_B64 } = env;
	return {
		cwd,
		from: args.from ?? env.CAIRN_FROM,
		repo: args.repo ?? env.GITHUB_REPO,
		cfToken: env.CLOUDFLARE_API_TOKEN,
		cfAccountId: env.CLOUDFLARE_ACCOUNT_ID,
		publicOrigin: env.PUBLIC_ORIGIN,
		github:
			GITHUB_APP_ID && GITHUB_APP_INSTALLATION_ID && GITHUB_APP_PRIVATE_KEY_B64
				? {
						appId: GITHUB_APP_ID,
						installationId: GITHUB_APP_INSTALLATION_ID,
						privateKeyB64: GITHUB_APP_PRIVATE_KEY_B64,
					}
				: undefined,
	};
}

/**
 * The default registry: the five local-config checks, the four Cloudflare checks, and the
 * GitHub App chain. The live send is opt-in (--send-test) and never sits here; the bin appends
 * it. A fresh array per call, so that append mutates nothing shared.
 */
export function defaultChecks(): DoctorCheck[] {
	return [
		configBindings,
		configObservability,
		configCsrfDisable,
		configSiteConfig,
		configPublicOrigin,
		emailSenderOnboarded,
		edgeHttpsForced,
		edgeHsts,
		authStore,
		githubApp,
	];
}
