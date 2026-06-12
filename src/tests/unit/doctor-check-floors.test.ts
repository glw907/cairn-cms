import { describe, it, expect } from 'vitest';
import {
	configDependencyFloors,
	dependencyFloorsResult,
	readEnginePeers,
} from '../../lib/doctor/check-floors.js';
import type { DoctorContext } from '../../lib/doctor/types.js';

// The engine's real peer ranges as of this writing; the table cases pass explicit peers so the
// expected outcomes never drift with a future floor raise.
const PEERS = { '@sveltejs/kit': '^2.12', svelte: '^5.56.3' };

function lockV3(versions: Record<string, string>): string {
	const packages: Record<string, { version: string }> = { '': { version: '0.0.0' } };
	for (const [dep, version] of Object.entries(versions)) {
		packages[`node_modules/${dep}`] = { version };
	}
	return JSON.stringify({ name: 'site', lockfileVersion: 3, packages });
}

function lockV2(versions: Record<string, string>): string {
	const v3 = JSON.parse(lockV3(versions)) as Record<string, unknown>;
	// A v2 lockfile carries the legacy dependencies tree beside the packages map; the check
	// reads only the map, so the tree's content is irrelevant.
	return JSON.stringify({ ...v3, lockfileVersion: 2, dependencies: {} });
}

describe('dependencyFloorsResult', () => {
	const cases: {
		name: string;
		lock: string | null;
		peers: Record<string, string>;
		status: 'pass' | 'fail' | 'skip';
		detail: RegExp;
	}[] = [
		{
			name: 'passes naming both resolved versions when each is in range (v3)',
			lock: lockV3({ svelte: '5.56.3', '@sveltejs/kit': '2.61.1' }),
			peers: PEERS,
			status: 'pass',
			detail: /svelte 5\.56\.3/,
		},
		{
			name: 'passes against a v2 lockfile through the same packages map',
			lock: lockV2({ svelte: '5.57.0', '@sveltejs/kit': '2.12.0' }),
			peers: PEERS,
			status: 'pass',
			detail: /@sveltejs\/kit 2\.12\.0/,
		},
		{
			name: 'fails on a below-floor svelte, naming the dep, the version, and the floor',
			lock: lockV3({ svelte: '5.56.0', '@sveltejs/kit': '2.61.1' }),
			peers: PEERS,
			status: 'fail',
			detail: /svelte resolves to 5\.56\.0.*\^5\.56\.3/,
		},
		{
			name: 'fails on a below-floor kit, naming the dep, the version, and the floor',
			lock: lockV3({ svelte: '5.56.3', '@sveltejs/kit': '2.11.9' }),
			peers: PEERS,
			status: 'fail',
			detail: /@sveltejs\/kit resolves to 2\.11\.9.*\^2\.12/,
		},
		{
			name: 'fails on a major above the range, since the caret bounds both ends',
			lock: lockV3({ svelte: '6.0.0', '@sveltejs/kit': '2.61.1' }),
			peers: PEERS,
			status: 'fail',
			detail: /svelte resolves to 6\.0\.0.*\^5\.56\.3/,
		},
		{
			name: 'skips with the package-manager caveat when no lockfile exists',
			lock: null,
			peers: PEERS,
			status: 'skip',
			detail: /pnpm or yarn/,
		},
		{
			name: 'skips naming the dep when the lockfile carries no entry for it',
			lock: lockV3({ svelte: '5.56.3' }),
			peers: PEERS,
			status: 'skip',
			detail: /no node_modules\/@sveltejs\/kit entry/,
		},
		{
			name: 'skips on a v1 lockfile with no packages map',
			lock: JSON.stringify({ lockfileVersion: 1, dependencies: {} }),
			peers: PEERS,
			status: 'skip',
			detail: /packages map/,
		},
		{
			name: 'skips rather than guesses on a non-caret engine range',
			lock: lockV3({ svelte: '5.56.3', '@sveltejs/kit': '2.61.1' }),
			peers: { svelte: '>=5.56.3', '@sveltejs/kit': '^2.12' },
			status: 'skip',
			detail: /not a simple caret range/,
		},
		{
			name: 'skips rather than guesses on a prerelease resolved version',
			lock: lockV3({ svelte: '5.57.0-next.2', '@sveltejs/kit': '2.61.1' }),
			peers: PEERS,
			status: 'skip',
			detail: /5\.57\.0-next\.2/,
		},
	];

	for (const c of cases) {
		it(c.name, () => {
			const result = dependencyFloorsResult(c.lock, c.peers);
			expect(result.status).toBe(c.status);
			expect(result.detail).toMatch(c.detail);
		});
	}

	it('fails with a clean message on a lockfile that does not parse', () => {
		const result = dependencyFloorsResult('{ "packages": GARBAGE', PEERS);
		expect(result.status).toBe('fail');
		expect(result.detail).toBe('package-lock.json did not parse');
		expect(result.detail).not.toContain('GARBAGE');
	});

	it('fails (never skips) when one dep is below floor and the other is missing', () => {
		const result = dependencyFloorsResult(lockV3({ svelte: '5.56.0' }), PEERS);
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('svelte resolves to 5.56.0');
	});

	it('accepts the short ^x.y caret form the kit peer uses, treating the patch as 0', () => {
		const result = dependencyFloorsResult(
			lockV3({ svelte: '5.56.3', '@sveltejs/kit': '2.12.0' }),
			PEERS
		);
		expect(result.status).toBe('pass');
	});
});

describe('readEnginePeers', () => {
	it('reads the engine package.json peers, including the svelte floor', () => {
		const peers = readEnginePeers();
		expect(peers.svelte).toBe('^5.56.3');
		expect(peers['@sveltejs/kit']).toBe('^2.12');
	});
});

describe('config.dependency-floors', () => {
	function ctx(files: Record<string, string>): DoctorContext {
		return {
			cwd: '/site',
			fetch: globalThis.fetch,
			readFile: async (relPath) => files[relPath] ?? null,
		};
	}

	it('ties to the config.dependency-floors-unmet condition', () => {
		expect(configDependencyFloors.conditionId).toBe('config.dependency-floors-unmet');
	});

	it('passes a fixture site whose lockfile satisfies the real engine peers', async () => {
		const result = await configDependencyFloors.run(
			ctx({ 'package-lock.json': lockV3({ svelte: '5.56.3', '@sveltejs/kit': '2.61.1' }) })
		);
		expect(result.status).toBe('pass');
	});

	it('skips on a site with no package-lock.json', async () => {
		const result = await configDependencyFloors.run(ctx({}));
		expect(result.status).toBe('skip');
	});
});
