// cairn-cms: rot-proof cairn-media-seed's bucket resolution against the EMITTED dist, the same
// gap delivery-data-dist-spawn.test.ts closes for /delivery/data. media-seed.test.ts's own
// "packaged bin" describe block already spawns dist/media-seed/bin.js for the flag-parsing and
// no-config paths; this file adds the one path those specs do not cover, resolving a real
// r2_buckets entry from a fixture site's wrangler.jsonc, under plain Node outside the vitest
// transform, so a packaging regression in the bin's own import of the copied wrangler-config
// module surfaces as a non-zero spawn. It needs dist/media-seed/bin.js, so it skips (via
// skipIf) when the package has not been built, the same precedent as
// delivery-data-dist-spawn.test.ts.
import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const BIN = resolve(process.cwd(), 'dist/media-seed/bin.js');
const built = existsSync(BIN);

describe('packaged media-seed bin resolves a real r2_buckets entry (needs dist/media-seed/bin.js; run npm run package to unskip)', () => {
  it.skipIf(!built)('reads the sole r2_buckets bucket_name from a fixture wrangler.jsonc and seeds zero manifest entries', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cairn-media-seed-dist-spawn-'));
    try {
      writeFileSync(
        join(dir, 'wrangler.jsonc'),
        '{ "r2_buckets": [{ "binding": "MEDIA_BUCKET", "bucket_name": "site-media" }] }'
      );
      mkdirSync(join(dir, 'src/content/.cairn'), { recursive: true });
      writeFileSync(join(dir, 'src/content/.cairn/media.json'), '{}');
      const out = spawnSync(process.execPath, [BIN, '--from', 'https://example.com'], {
        cwd: dir,
        env: { PATH: process.env.PATH },
        encoding: 'utf8',
      });
      expect(out.status).toBe(0);
      expect(out.stdout).toContain('0 synced, 0 failed, of 0 manifest entries');
      expect(out.stderr).toBe('');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
