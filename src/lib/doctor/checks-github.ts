// The doctor's GitHub App check: the full reachability chain (the key parses and signs, the
// installation token mints, the repository answers a read), built from the engine's own
// credential and signing path so the doctor proves the exact code the save action runs. The
// signing chain is Web Crypto plus atob/btoa, all Node 20+ globals, so it runs in a CLI
// unchanged. One wrinkle the tests mirror: installationToken fetches through the global
// fetch, so only the repo read routes through ctx.fetch.
import { appCredentials } from '../github/credentials.js';
import { installationToken, signingSelfTest } from '../github/signing.js';
import type { CheckResult, DoctorCheck, DoctorContext } from './types.js';

const API = 'https://api.github.com';

export const githubApp: DoctorCheck = {
	id: 'github.app',
	conditionId: 'github.app-unreachable',
	title: 'GitHub App',
	async run(ctx: DoctorContext): Promise<CheckResult> {
		if (!ctx.github) {
			return {
				status: 'skip',
				detail:
					'set GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, and GITHUB_APP_PRIVATE_KEY_B64 to run this check',
			};
		}
		if (!ctx.repo) {
			return { status: 'skip', detail: 'pass --repo or set GITHUB_REPO to run this check' };
		}
		const creds = appCredentials(
			{ appId: ctx.github.appId, installationId: ctx.github.installationId },
			{ GITHUB_APP_PRIVATE_KEY_B64: ctx.github.privateKeyB64 }
		);
		// Stage 1: the key parse and sign, through the deploy-time self-test. Its detail is a
		// fixed classifier, so a bad key can never echo key bytes into the report.
		const signed = await signingSelfTest(creds.appId, creds.privateKeyB64);
		if (!signed.ok) {
			return { status: 'fail', detail: `the App key failed to parse or sign: ${signed.detail}` };
		}
		// Stage 2: the token mint, through the uncached primitive. A one-shot CLI gains nothing
		// from the Worker-lifecycle cache, and the probe should reach GitHub for real.
		let token: string;
		try {
			token = await installationToken(creds);
		} catch (err) {
			return { status: 'fail', detail: `App authentication failed: ${String(err)}` };
		}
		// Stage 3: the repo read, with the engine's standard GitHub headers.
		try {
			const res = await ctx.fetch(`${API}/repos/${ctx.repo}`, {
				headers: {
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${token}`,
					'User-Agent': 'cairn-cms',
					'X-GitHub-Api-Version': '2022-11-28',
				},
			});
			if (!res.ok) {
				return { status: 'fail', detail: `repo ${ctx.repo} returned ${res.status}` };
			}
			return { status: 'pass', detail: `the App reads ${ctx.repo}` };
		} catch (err) {
			return { status: 'fail', detail: String(err) };
		}
	},
};
