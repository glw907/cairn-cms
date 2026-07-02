// npm pack --json can print a real document with unrelated text ahead of it. On npm 10.x
// (bundled with Node 22, the version pinned in CI), `--ignore-scripts` does not suppress the
// `prepare` lifecycle script when npm pack targets the local project itself: prepare re-runs
// `npm run package`, and svelte-package's own build notices ("src/lib -> dist" and its
// packaging diagnostics) land on stdout ahead of the `--json` manifest. `--loglevel=silent`
// does not help, since that output is the script's own stdout, not an npm log line. This
// helper tolerates the pollution by scanning for the earliest bracket that begins a complete,
// parseable JSON document, rather than assuming the whole stream is JSON.
export function parsePackManifest(stdout: string): unknown {
	for (let i = 0; i < stdout.length; i++) {
		const ch = stdout[i];
		if (ch !== '[' && ch !== '{') continue;
		try {
			return JSON.parse(stdout.slice(i));
		} catch {
			// Not the real document's start: a bracket in the pollution text, or a nested
			// bracket that does not open the top-level document. Keep scanning.
		}
	}
	throw new SyntaxError('no parseable JSON document found in npm pack output');
}
