// cairn-cms: rot-proof the /delivery/data node-safety guarantee against the EMITTED dist.
// delivery-entry-boundary.test.ts walks the SOURCE import graph statically and asserts no module
// reachable from the data barrel names @sveltejs/kit or a .svelte component. That source walk would
// pass vacuously if svelte-package later rewrote, inlined, or re-pathed an import in a way that drags
// a kit/browser-only dependency into the built data.js: the .ts graph is clean while the .js graph is
// not. This test closes that gap by importing the built dist subpath in a fresh plain-Node process,
// outside the vitest transform, so Node's own ESM resolver does the work and a packaging regression
// surfaces as a non-zero spawn. It needs dist/delivery/data.js, so it skips (via skipIf) when the
// package has not been built, the same precedent as doctor-bin.test.ts.
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const BUILT = resolve(process.cwd(), 'dist/delivery/data.js');
const built = existsSync(BUILT);

describe('packaged /delivery/data node-safety (needs dist/delivery/data.js; run npm run package to unskip)', () => {
	it.skipIf(!built)('imports cleanly under plain Node with the pure projections and no kit loader', () => {
		const url = pathToFileURL(BUILT).href;
		const script = `const d = await import(${JSON.stringify(url)}); if (typeof d.buildSiteManifest !== 'function' || typeof d.createSiteIndexes !== 'function' || typeof d.buildRssFeed !== 'function') { console.error('missing export'); process.exit(3); } if ('createPublicRoutes' in d) { console.error('kit loader leaked'); process.exit(4); } console.log('DATA_BARREL_OK');`;
		const out = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
			cwd: tmpdir(),
			env: { PATH: process.env.PATH },
			encoding: 'utf8',
		});
		expect(out.status).toBe(0);
		expect(out.stdout).toContain('DATA_BARREL_OK');
		expect(out.stderr).toBe('');
	});
});
