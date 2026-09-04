import { describe, it, expect, vi } from 'vitest';
import { existsSync, mkdtempSync, writeFileSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import {
  parseArgs,
  normalizeManifest,
  contentTypeForExt,
  downloadUrl,
  resolveBucket,
  seedMedia,
} from '../../lib/media-seed/index.js';
import type { MediaSeedArgs, SeedDeps, SeedItem } from '../../lib/media-seed/index.js';
import { stripControlChars } from '../../lib/media-seed/assemble.js';
import { readR2Buckets } from '../../lib/doctor/wrangler-config.js';

/** Narrows `parseArgs`' union return, since the `--help` shape never carries `headers`/`from`. */
function expectParsed(args: ReturnType<typeof parseArgs>): MediaSeedArgs {
  if ('help' in args) throw new Error('expected parsed args, got the --help shape');
  return args;
}

describe('parseArgs', () => {
  it('parses a bare --from', () => {
    expect(parseArgs(['--from', 'https://example.com'])).toEqual({
      from: 'https://example.com',
      headers: {},
    });
  });

  it('parses repeated --header flags into one object', () => {
    expect(
      parseArgs([
        '--from',
        'https://example.com',
        '--header',
        'CF-Access-Client-Id: abc',
        '--header',
        'CF-Access-Client-Secret: def',
      ])
    ).toEqual({
      from: 'https://example.com',
      headers: { 'CF-Access-Client-Id': 'abc', 'CF-Access-Client-Secret': 'def' },
    });
  });

  it('lets a later --header for the same name win', () => {
    const args = expectParsed(
      parseArgs(['--from', 'https://example.com', '--header', 'X-Token: one', '--header', 'X-Token: two'])
    );
    expect(args.headers).toEqual({ 'X-Token': 'two' });
  });

  it('parses --bucket', () => {
    expect(parseArgs(['--from', 'https://example.com', '--bucket', 'my-bucket'])).toEqual({
      from: 'https://example.com',
      headers: {},
      bucket: 'my-bucket',
    });
  });

  it('rejects a missing --from, printing usage', () => {
    expect(() => parseArgs([])).toThrowError(/--from is required/);
    expect(() => parseArgs([])).toThrowError(/Usage: cairn-media-seed/);
  });

  it('rejects a flag with a missing value', () => {
    expect(() => parseArgs(['--from'])).toThrowError(/--from needs a value/);
  });

  it('rejects an unknown flag, naming it', () => {
    expect(() => parseArgs(['--from', 'https://example.com', '--verbose'])).toThrowError(
      /unknown argument --verbose/
    );
  });

  it('rejects a --header with no colon', () => {
    expect(() =>
      parseArgs(['--from', 'https://example.com', '--header', 'not-a-header'])
    ).toThrowError(/--header must be 'Name: value'/);
  });

  it('rejects a --header with an empty name', () => {
    expect(() =>
      parseArgs(['--from', 'https://example.com', '--header', ': value'])
    ).toThrowError(/--header must be 'Name: value'/);
  });

  // --help short-circuits the otherwise-required --from, the same way the other three bins
  // answer --help before validating anything else.
  it('reads --help without requiring --from', () => {
    expect(parseArgs(['--help'])).toEqual({ help: true });
  });
});

describe('downloadUrl', () => {
  const item: SeedItem = { slug: 'sunset', hash: 'abcdef0123456789', ext: 'webp' };

  it('builds <from>/media/<slug>.<hash>.<ext>', () => {
    expect(downloadUrl('https://example.com', item)).toBe(
      'https://example.com/media/sunset.abcdef0123456789.webp'
    );
  });

  it('strips a trailing slash on from', () => {
    expect(downloadUrl('https://example.com/', item)).toBe(
      'https://example.com/media/sunset.abcdef0123456789.webp'
    );
  });
});

describe('contentTypeForExt', () => {
  it('maps the delivery extensions to their image types', () => {
    expect(contentTypeForExt('jpg')).toBe('image/jpeg');
    expect(contentTypeForExt('JPEG')).toBe('image/jpeg');
    expect(contentTypeForExt('png')).toBe('image/png');
    expect(contentTypeForExt('webp')).toBe('image/webp');
    expect(contentTypeForExt('avif')).toBe('image/avif');
  });

  it('falls back to octet-stream for an unknown extension', () => {
    expect(contentTypeForExt('bin')).toBe('application/octet-stream');
  });
});

describe('normalizeManifest', () => {
  it('projects the three fields this tool needs off each row', () => {
    const manifest = {
      abcdef0123456789: {
        hash: 'abcdef0123456789',
        sha256: 'x',
        slug: 'sunset',
        displayName: 'Sunset',
        originalFilename: 'sunset.jpg',
        alt: '',
        ext: 'webp',
        contentType: 'image/webp',
        bytes: 100,
        width: 10,
        height: 10,
        createdAt: '2026-01-01T00:00:00Z',
      },
    };
    expect(normalizeManifest(manifest)).toEqual([
      { slug: 'sunset', hash: 'abcdef0123456789', ext: 'webp' },
    ]);
  });

  it('degrades a missing manifest (null) to an empty list', () => {
    expect(normalizeManifest(null)).toEqual([]);
  });

  it('drops a row missing slug, hash, or ext instead of failing the whole run', () => {
    const manifest = {
      a: { hash: 'aaaaaaaaaaaaaaaa', slug: 'ok', ext: 'webp' },
      b: { hash: 'bbbbbbbbbbbbbbbb', ext: 'webp' },
      c: { hash: 'cccccccccccccccc', slug: 'no-ext' },
    };
    expect(normalizeManifest(manifest)).toEqual([{ slug: 'ok', hash: 'aaaaaaaaaaaaaaaa', ext: 'webp' }]);
  });

  // The security lens's blocking find: a manifest row whose hash or ext is shaped like a path
  // traversal must never reach seedMedia's write loop at all, the earliest choke point available.
  it('drops a row whose hash is shaped like a path traversal', () => {
    const manifest = {
      evil: { hash: '../../evil', slug: 'x', ext: 'webp' },
    };
    expect(normalizeManifest(manifest)).toEqual([]);
  });

  it('drops a row whose ext is shaped like a path traversal', () => {
    const manifest = {
      evil: { hash: 'aaaaaaaaaaaaaaaa', slug: 'x', ext: '../../evil' },
    };
    expect(normalizeManifest(manifest)).toEqual([]);
  });

  it('drops a row whose hash is not 16 lowercase hex chars', () => {
    const manifest = {
      short: { hash: 'abc', slug: 'x', ext: 'webp' },
    };
    expect(normalizeManifest(manifest)).toEqual([]);
  });

  it('drops a row whose ext is not a short alphanumeric', () => {
    const manifest = {
      bad: { hash: 'aaaaaaaaaaaaaaaa', slug: 'x', ext: 'toolongext' },
    };
    expect(normalizeManifest(manifest)).toEqual([]);
  });

  // The security lens's blocking find: slug was the one field r2Key never validates, and it is
  // interpolated straight into the credentialed download URL and the printed failure line.
  it('drops a row whose slug is shaped like a path traversal', () => {
    const manifest = {
      evil: { hash: 'aaaaaaaaaaaaaaaa', slug: '../../evil', ext: 'webp' },
    };
    expect(normalizeManifest(manifest)).toEqual([]);
  });

  it('drops a row whose slug carries an uppercase or non-hyphen-joined shape slugifyFilename never produces', () => {
    const manifest = {
      a: { hash: 'aaaaaaaaaaaaaaaa', slug: 'Sunset', ext: 'webp' },
      b: { hash: 'bbbbbbbbbbbbbbbb', slug: '-leading-hyphen', ext: 'webp' },
      c: { hash: 'cccccccccccccccc', slug: 'trailing-hyphen-', ext: 'webp' },
      d: { hash: 'dddddddddddddddd', slug: 'double--hyphen', ext: 'webp' },
    };
    expect(normalizeManifest(manifest)).toEqual([]);
  });
});

describe('stripControlChars', () => {
  it('leaves an ordinary slug unchanged', () => {
    expect(stripControlChars('sunset')).toBe('sunset');
  });

  // Defense in depth for the bin's printed failure line: a hostile slug reaching this far must
  // not be able to forge terminal escape sequences or extra output lines.
  it('strips C0 control characters and DEL, control chars never reaching the printed line', () => {
    expect(stripControlChars('evil\x1b[31mred\x1b[0m\x07\x7f')).toBe('evil[31mred[0m');
  });
});

describe('resolveBucket', () => {
  it('lets an explicit --bucket win over the wrangler config', () => {
    expect(resolveBucket('explicit-bucket', [{ binding: 'MEDIA_BUCKET', bucketName: 'other' }])).toEqual({
      value: 'explicit-bucket',
    });
  });

  it('uses the sole r2_buckets entry when no --bucket is given', () => {
    expect(
      resolveBucket(undefined, [{ binding: 'MEDIA_BUCKET', bucketName: 'site-media' }])
    ).toEqual({ value: 'site-media' });
  });

  it('errors when no wrangler config was found', () => {
    const result = resolveBucket(undefined, null);
    expect('error' in result).toBe(true);
    expect((result as { error: string }).error).toMatch(/--bucket/);
  });

  it('errors when no r2_buckets entries are declared', () => {
    const result = resolveBucket(undefined, []);
    expect((result as { error: string }).error).toMatch(/--bucket/);
  });

  it('errors and lists bindings when more than one r2_buckets entry is declared', () => {
    const result = resolveBucket(undefined, [
      { binding: 'MEDIA_BUCKET', bucketName: 'a' },
      { binding: 'OTHER', bucketName: 'b' },
    ]);
    const error = (result as { error: string }).error;
    expect(error).toMatch(/MEDIA_BUCKET/);
    expect(error).toMatch(/OTHER/);
    expect(error).toMatch(/--bucket/);
  });

  it('errors when the sole entry has no bucket_name', () => {
    const result = resolveBucket(undefined, [{ binding: 'MEDIA_BUCKET' }]);
    expect((result as { error: string }).error).toMatch(/--bucket/);
  });
});

describe('readR2Buckets', () => {
  function readFileFrom(files: Record<string, string>) {
    return async (relPath: string): Promise<string | null> => files[relPath] ?? null;
  }

  it('returns null when neither wrangler file exists', async () => {
    expect(await readR2Buckets(readFileFrom({}))).toBeNull();
  });

  it('reads binding and bucket_name from jsonc', async () => {
    const jsonc = `{
      "r2_buckets": [{ "binding": "MEDIA_BUCKET", "bucket_name": "site-media" }],
    }`;
    expect(await readR2Buckets(readFileFrom({ 'wrangler.jsonc': jsonc }))).toEqual([
      { binding: 'MEDIA_BUCKET', bucketName: 'site-media' },
    ]);
  });

  it('reads binding and bucket_name from toml', async () => {
    const toml = `[[r2_buckets]]\nbinding = "MEDIA_BUCKET"\nbucket_name = "site-media"\n`;
    expect(await readR2Buckets(readFileFrom({ 'wrangler.toml': toml }))).toEqual([
      { binding: 'MEDIA_BUCKET', bucketName: 'site-media' },
    ]);
  });

  it('reads several r2_buckets entries in order', async () => {
    const jsonc = `{
      "r2_buckets": [
        { "binding": "MEDIA_BUCKET", "bucket_name": "site-media" },
        { "binding": "OTHER" }
      ]
    }`;
    expect(await readR2Buckets(readFileFrom({ 'wrangler.jsonc': jsonc }))).toEqual([
      { binding: 'MEDIA_BUCKET', bucketName: 'site-media' },
      { binding: 'OTHER', bucketName: undefined },
    ]);
  });

  it('throws a clean message on an unparseable jsonc file', async () => {
    await expect(readR2Buckets(readFileFrom({ 'wrangler.jsonc': '{ not json' }))).rejects.toThrow(
      /did not parse/
    );
  });
});

// bin.ts's own readFileUnderCwd (:73-79), the internals-B docket item 5 WATCH discharge: its
// three call sites (wrangler.jsonc, wrangler.toml, the media manifest) are all hardcoded
// literals, so no caller today ever hands it a traversal-shaped relPath. The assert is defense
// in depth "regardless of where relPath came from" (its own comment), matching doctor/bin.ts's
// containment shape. bin.ts self-executes main() via a top-level await on import, so the closure
// is not independently importable; this forces a traversal-shaped relPath through the real
// closure by mocking readR2Buckets, the one function bin.ts hands readFileUnderCwd to as a
// callback, to call it with a hostile relPath instead of its own literal ones. The refusal
// rejects the whole bin module's evaluation, since nothing in main() catches it.
describe('bin.ts readFileUnderCwd containment', () => {
  it('refuses a relPath that resolves outside the project directory, naming it with the media-seed prefix', async () => {
    vi.resetModules();
    const originalArgv = process.argv;
    process.argv = [process.execPath, 'bin.js', '--from', 'https://example.com'];
    vi.doMock('../../lib/doctor/wrangler-config.js', () => ({
      readR2Buckets: async (readFile: (relPath: string) => Promise<string | null>) => {
        await readFile('../outside.json');
        return null;
      },
    }));
    try {
      await expect(import('../../lib/media-seed/bin.js')).rejects.toThrow(
        'cairn-media-seed: refusing to read outside the project directory: ../outside.json'
      );
    } finally {
      process.argv = originalArgv;
      vi.doUnmock('../../lib/doctor/wrangler-config.js');
      vi.resetModules();
    }
  });
});

// The security lens's blocking find: a textual prefix compare alone is defeated by a symlink
// planted between the nominal path and its real, on-disk location, both for a read under cwd and
// a write under the run's own temp dir. Each closure gets its own escape here, proving the
// realpath-based check that was added on top of the textual one.
describe('bin.ts readFileUnderCwd symlink escape', () => {
  it('refuses to read through a symlink under cwd that resolves outside it', async () => {
    vi.resetModules();
    const originalArgv = process.argv;
    process.argv = [process.execPath, 'bin.js', '--from', 'https://example.com'];
    const cwd = process.cwd();
    const outside = mkdtempSync(join(tmpdir(), 'cairn-media-seed-escape-'));
    writeFileSync(join(outside, 'secret.txt'), 'nope');
    const linkName = `cairn-media-seed-symlink-escape-${process.pid}`;
    const linkPath = join(cwd, linkName);
    symlinkSync(outside, linkPath, 'dir');
    vi.doMock('../../lib/doctor/wrangler-config.js', () => ({
      readR2Buckets: async (readFile: (relPath: string) => Promise<string | null>) => {
        await readFile(`${linkName}/secret.txt`);
        return null;
      },
    }));
    try {
      await expect(import('../../lib/media-seed/bin.js')).rejects.toThrow(
        `cairn-media-seed: refusing to read outside the project directory: ${linkName}/secret.txt`
      );
    } finally {
      process.argv = originalArgv;
      vi.doUnmock('../../lib/doctor/wrangler-config.js');
      vi.resetModules();
      rmSync(linkPath, { force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe('bin.ts realDeps.writeTempFile symlink escape', () => {
  it('refuses to write through a symlink planted inside the run temp dir that resolves outside it', async () => {
    vi.resetModules();
    // --help short-circuits main() before it ever touches process.exitCode, so importing the
    // module for its realDeps export never pollutes this test run's own exit code.
    const originalArgv = process.argv;
    process.argv = [process.execPath, 'bin.js', '--help'];
    let realDeps: (typeof import('../../lib/media-seed/bin.js'))['realDeps'];
    try {
      ({ realDeps } = await import('../../lib/media-seed/bin.js'));
    } finally {
      process.argv = originalArgv;
    }
    const deps = realDeps(process.cwd());
    const probe = deps.writeTempFile('probe.txt', new Uint8Array([1]));
    const dir = dirname(probe);
    const outside = mkdtempSync(join(tmpdir(), 'cairn-media-seed-escape-'));
    try {
      symlinkSync(outside, join(dir, 'escape'), 'dir');
      expect(() => deps.writeTempFile('escape/evil.bin', new Uint8Array([2]))).toThrow(
        'cairn-media-seed: refusing to write outside the temp directory: escape/evil.bin'
      );
    } finally {
      deps.cleanup();
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe('seedMedia', () => {
  const items: SeedItem[] = [
    { slug: 'sunset', hash: 'aa11223344556677', ext: 'webp' },
    { slug: 'sunrise', hash: 'bb11223344556677', ext: 'webp' },
  ];

  function makeDeps(overrides: Partial<SeedDeps> = {}): SeedDeps & {
    written: { name: string; bytes: Uint8Array }[];
    put: { bucket: string; key: string; filePath: string }[];
    cleaned: boolean;
  } {
    const written: { name: string; bytes: Uint8Array }[] = [];
    const put: { bucket: string; key: string; filePath: string; contentType: string }[] = [];
    const deps = {
      fetch: vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 })),
      writeTempFile: vi.fn((name: string, bytes: Uint8Array) => {
        written.push({ name, bytes });
        return `/tmp/${name}`;
      }),
      cleanup: vi.fn(() => {
        deps.cleaned = true;
      }),
      putObject: vi.fn((bucket: string, key: string, filePath: string, contentType: string) => {
        put.push({ bucket, key, filePath, contentType });
      }),
      written,
      put,
      cleaned: false,
      ...overrides,
    };
    return deps;
  }

  it('downloads and writes every item, reporting a clean summary', async () => {
    const deps = makeDeps();
    const result = await seedMedia(items, 'https://example.com', {}, 'site-media', deps);
    expect(result).toEqual({ total: 2, ok: 2, failed: 0, failures: [] });
    expect(deps.put).toEqual([
      {
        bucket: 'site-media',
        key: 'media/aa/aa11223344556677.webp',
        filePath: '/tmp/aa11223344556677.webp',
        contentType: 'image/webp',
      },
      {
        bucket: 'site-media',
        key: 'media/bb/bb11223344556677.webp',
        filePath: '/tmp/bb11223344556677.webp',
        contentType: 'image/webp',
      },
    ]);
    expect(deps.cleaned).toBe(true);
  });

  it('passes the given headers to every fetch', async () => {
    const deps = makeDeps();
    await seedMedia(items, 'https://example.com', { 'X-Token': 'secret' }, 'site-media', deps);
    for (const call of (deps.fetch as ReturnType<typeof vi.fn>).mock.calls) {
      expect(call[1]).toEqual({ headers: { 'X-Token': 'secret' } });
    }
  });

  it('counts a non-ok response as a failure without abandoning the other items', async () => {
    let calls = 0;
    const deps = makeDeps({
      fetch: vi.fn(async () => {
        calls += 1;
        if (calls === 1) return new Response(null, { status: 404 });
        return new Response(new Uint8Array([1]), { status: 200 });
      }),
    });
    const result = await seedMedia(items, 'https://example.com', {}, 'site-media', deps);
    expect(result.ok).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.failures).toEqual([{ slug: 'sunset', message: 'HTTP 404' }]);
    expect(deps.cleaned).toBe(true);
  });

  it('counts a putObject throw as a failure', async () => {
    const deps = makeDeps({
      putObject: vi.fn(() => {
        throw new Error('wrangler exited with code 1');
      }),
    });
    const result = await seedMedia(items, 'https://example.com', {}, 'site-media', deps);
    expect(result.ok).toBe(0);
    expect(result.failed).toBe(2);
    expect(result.failures[0].message).toBe('wrangler exited with code 1');
  });

  it('is idempotent: re-running the same items reports the same clean result', async () => {
    const deps = makeDeps();
    const first = await seedMedia(items, 'https://example.com', {}, 'site-media', deps);
    const second = await seedMedia(items, 'https://example.com', {}, 'site-media', makeDeps());
    expect(first).toEqual(second);
  });

  // The security lens's blocking find, defense in depth for a caller that reaches seedMedia
  // without going through normalizeManifest's screen: a hostile hash or ext must be refused
  // BEFORE any network call or byte is written, never after. This fails on HEAD, where
  // deps.fetch and writeTempFile both run before r2Key's validation.
  it('refuses a hostile hash before writing any byte, never calling fetch or writeTempFile', async () => {
    const hostile: SeedItem[] = [{ slug: 'evil', hash: '../../evil', ext: 'webp' }];
    const deps = makeDeps();
    const result = await seedMedia(hostile, 'https://example.com', {}, 'site-media', deps);
    expect(result).toEqual({
      total: 1,
      ok: 0,
      failed: 1,
      failures: [{ slug: 'evil', message: expect.stringContaining('hash') }],
    });
    expect(deps.fetch).not.toHaveBeenCalled();
    expect(deps.written).toEqual([]);
    expect(deps.put).toEqual([]);
  });

  it('refuses a hostile ext before writing any byte, never calling fetch or writeTempFile', async () => {
    const hostile: SeedItem[] = [{ slug: 'evil', hash: 'aa11223344556677', ext: '../../evil' }];
    const deps = makeDeps();
    const result = await seedMedia(hostile, 'https://example.com', {}, 'site-media', deps);
    expect(result.ok).toBe(0);
    expect(result.failed).toBe(1);
    expect(deps.fetch).not.toHaveBeenCalled();
    expect(deps.written).toEqual([]);
    expect(deps.put).toEqual([]);
  });
});

// The packaging lesson from cairn-doctor: prove the emitted bin runs under plain Node from
// dist. The unit suite must pass without a prior `npm run package`, so this spawns only when
// the built bin exists and skips (via skipIf) otherwise.
const BIN = resolve(process.cwd(), 'dist/media-seed/bin.js');
const built = existsSync(BIN);

describe('packaged bin (needs dist/media-seed/bin.js; run npm run package to unskip)', () => {
  it.skipIf(!built)('prints usage and exits 0 on --help, without requiring --from', () => {
    const out = spawnSync(process.execPath, [BIN, '--help'], {
      cwd: tmpdir(),
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
    });
    expect(out.status).toBe(0);
    expect(out.stdout).toContain('Usage: cairn-media-seed');
  });

  it.skipIf(!built)('prints usage to stderr and exits 2 on a missing --from', () => {
    const out = spawnSync(process.execPath, [BIN], {
      cwd: tmpdir(),
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
    });
    expect(out.status).toBe(2);
    expect(out.stderr).toContain('Usage: cairn-media-seed');
  });

  it.skipIf(!built)('prints usage to stderr and exits 2 on an unknown flag', () => {
    const out = spawnSync(process.execPath, [BIN, '--from', 'https://example.com', '--bogus'], {
      cwd: tmpdir(),
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
    });
    expect(out.status).toBe(2);
    expect(out.stderr).toContain('Usage: cairn-media-seed');
  });

  it.skipIf(!built)('exits 2 naming --bucket when no wrangler config is present', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cairn-media-seed-bin-'));
    const out = spawnSync(process.execPath, [BIN, '--from', 'https://example.com'], {
      cwd: dir,
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
    });
    expect(out.status).toBe(2);
    expect(out.stderr).toContain('--bucket');
  });

  it.skipIf(!built)('reports a clean zero-item summary and exits 0 from a bare site with a bucket flag', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cairn-media-seed-bin-'));
    const out = spawnSync(
      process.execPath,
      [BIN, '--from', 'https://example.com', '--bucket', 'site-media'],
      { cwd: dir, env: { PATH: process.env.PATH }, encoding: 'utf8' }
    );
    expect(out.status).toBe(0);
    expect(out.stdout).toContain('0 synced, 0 failed, of 0 manifest entries');
  });

  it.skipIf(!built)('resolves the sole r2_buckets entry from wrangler.jsonc with no --bucket flag', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cairn-media-seed-bin-'));
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
  });
});
