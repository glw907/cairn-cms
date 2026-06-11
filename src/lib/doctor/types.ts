// The doctor's check model (diagnostics spec, Arm B). Each check is isolated: no check reads
// another's result. The conditionId ties the check to the registry entry whose why/remediation
// the report prints, keeping the doctor, the runtime errors, and the checklist on one identity.
export type CheckStatus = 'pass' | 'fail' | 'skip';

export interface CheckResult {
	status: CheckStatus;
	/** One line of evidence ("sending subdomain enabled", "wrangler.jsonc not found"). */
	detail: string;
}

export interface DoctorCheck {
	/** Stable id, e.g. 'email.sender-onboarded'. */
	id: string;
	/** The registry condition this check probes; the report prints its remediation on failure. */
	conditionId: string;
	title: string;
	run: (ctx: DoctorContext) => Promise<CheckResult>;
}

/** Everything a check may read, resolved once by the bin. Absent fields make checks skip. */
export interface DoctorContext {
	/** The site directory the doctor runs in. */
	cwd: string;
	/** The from-address (--from / CAIRN_FROM). */
	from?: string;
	/** owner/name (--repo / GITHUB_REPO). */
	repo?: string;
	/** CLOUDFLARE_API_TOKEN. */
	cfToken?: string;
	/** CLOUDFLARE_ACCOUNT_ID. */
	cfAccountId?: string;
	/** GITHUB_APP_ID / GITHUB_APP_INSTALLATION_ID / GITHUB_APP_PRIVATE_KEY_B64. */
	github?: { appId: string; installationId: string; privateKeyB64: string };
	/** Injected fetch for tests; defaults to global fetch. */
	fetch: typeof fetch;
	/** Read a file under cwd, or null when absent. Injected for tests. */
	readFile: (relPath: string) => Promise<string | null>;
}
