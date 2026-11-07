import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { verify, untar, diffTrees, judgeDiffs } from '../../../scripts/release/verify.mjs';

const NAMES = ['@glw907/cairn-cms', '@glw907/cairn-cms-dev', 'create-cairn-site'];
const fixture = (name: string) => readFileSync(new URL(`./fixtures/release-verify/${name}`, import.meta.url));
const RC2_RC3 = JSON.parse(fixture('rc2-rc3.json').toString('utf8'));

const tree = (files: Record<string, string>) => new Map(Object.entries(files).map(([k, v]) => [k, Buffer.from(v)]));

/** A minimal ustar archive with the `package/` prefix npm uses. */
function tgz(files: Record<string, string>): Uint8Array {
  const blocks: Buffer[] = [];
  for (const [path, text] of Object.entries(files)) {
    const body = Buffer.from(text);
    const header = Buffer.alloc(512);
    header.write(`package/${path}`, 0);
    header.write(body.length.toString(8).padStart(11, '0'), 124);
    header.write('0', 156);
    blocks.push(header, body, Buffer.alloc((512 - (body.length % 512)) % 512));
  }
  return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]));
}

describe('judgeDiffs on the captured rc.2 to rc.3 diffs', () => {
  it('fails the engine, naming a source path', () => {
    const { errors } = judgeDiffs('@glw907/cairn-cms', RC2_RC3['@glw907/cairn-cms']);
    expect(errors.join('\n')).toContain('dist/admin/EditPage.svelte');
  });

  it('fails create-cairn-site, naming a source path', () => {
    const { errors } = judgeDiffs('create-cairn-site', RC2_RC3['create-cairn-site']);
    expect(errors.join('\n')).toContain('src/cloudflare/deploy.mjs');
  });

  it('passes the dev package, whose only change is the version', () => {
    expect(judgeDiffs('@glw907/cairn-cms-dev', RC2_RC3['@glw907/cairn-cms-dev']).errors).toEqual([]);
  });
});

describe('diffTrees and judgeDiffs on a synthetic cut', () => {
  const engineBefore = {
    'package.json': '{\n  "name": "x",\n  "version": "0.99.0-rc.4",\n  "type": "module"\n}\n',
    'CHANGELOG.md': '# Changelog\n\n## 0.99.0-rc.4\n\nReleased 2026-11-01.\n\nBody stays.\n',
    'MIGRATION-NOTES.md': '# Notes\n\n## 0.99.0-rc.4\n\nSee [log](./CHANGELOG.md#0990-rc4).\n',
    'dist/index.js': 'export {};\n'
  };
  const engineAfter = {
    ...engineBefore,
    'package.json': engineBefore['package.json'].replace('0.99.0-rc.4', '0.99.0'),
    'CHANGELOG.md': '# Changelog\n\n## 0.99.0\n\nReleased 2026-11-05.\n\nBody stays.\n',
    'MIGRATION-NOTES.md': '# Notes\n\n## 0.99.0\n\nSee [log](./CHANGELOG.md#0990).\n'
  };

  it('passes edits to the version, template pins, VERSION, headings, Released line and anchor', () => {
    const engine = judgeDiffs('@glw907/cairn-cms', diffTrees(tree(engineBefore), tree(engineAfter)));
    expect(engine.errors).toEqual([]);
    const create = judgeDiffs(
      'create-cairn-site',
      diffTrees(
        tree({
          'package.json': '{\n  "version": "0.99.0-rc.4"\n}\n',
          'template/package.json': '{\n  "devDependencies": {\n    "@glw907/cairn-cms": "^0.99.0-rc.4"\n  }\n}\n',
          'template/.claude/cairn/VERSION': '0.99.0-rc.4\n'
        }),
        tree({
          'package.json': '{\n  "version": "0.99.0"\n}\n',
          'template/package.json': '{\n  "devDependencies": {\n    "@glw907/cairn-cms": "^0.99.0"\n  }\n}\n',
          'template/.claude/cairn/VERSION': '0.99.0\n'
        })
      )
    );
    expect(create.errors).toEqual([]);
  });

  it('fails a changed source line, an added file, and a reordered file', () => {
    const changed = judgeDiffs('@glw907/cairn-cms', diffTrees(tree(engineBefore), tree({ ...engineAfter, 'dist/index.js': 'export { a };\n' })));
    expect(changed.errors.join('\n')).toContain('dist/index.js');
    const added = judgeDiffs('@glw907/cairn-cms', diffTrees(tree(engineBefore), tree({ ...engineAfter, 'dist/new.js': '' })));
    expect(added.errors.join('\n')).toContain('dist/new.js is added');
    const reordered = judgeDiffs('@glw907/cairn-cms', diffTrees(tree({ 'a.js': 'x\ny\n' }), tree({ 'a.js': 'y\nx\n' })));
    expect(reordered.errors.join('\n')).toContain('a.js is reordered');
  });
});

describe('verify', () => {
  interface Setup {
    tags?: Record<string, Record<string, string>>;
    provenance?: Record<string, boolean>;
    tarballs?: Record<string, Uint8Array>;
  }

  function deps(version: string, setup: Setup = {}) {
    const urls: string[] = [];
    const fetchFn = (async (url: string) => {
      urls.push(url);
      const pkg = [...NAMES].sort((a, b) => b.length - a.length).find((n) => url.includes(`/${n}`))!;
      if (url.endsWith('.tgz')) {
        const bytes = setup.tarballs?.[url];
        return bytes ? { ok: true, status: 200, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) } : { ok: false, status: 404 };
      }
      if (url.endsWith(`/${version}`)) {
        const attested = setup.provenance?.[pkg] ?? true;
        return { ok: true, json: async () => ({ dist: { attestations: attested ? { provenance: {} } : {} } }) };
      }
      return { ok: true, json: async () => ({ 'dist-tags': setup.tags?.[pkg] ?? { gate: version, latest: version, next: '0.99.0-rc.4' } }) };
    }) as unknown as typeof fetch;
    const runs: string[][] = [];
    return { fetchFn, urls, run: (cmd: string, args: string[]) => (runs.push([cmd, ...args]), { status: 0, stdout: '' }), runs };
  }

  it('passes a prerelease on gate and fetches no tarball', async () => {
    const d = deps('0.99.0-rc.4');
    const r = await verify(d, { version: '0.99.0-rc.4' });
    expect(r.ok).toBe(true);
    expect(d.urls.some((u) => u.endsWith('.tgz'))).toBe(false);
  });

  it('fails a prerelease with gate behind on one package', async () => {
    const d = deps('0.99.0-rc.4', { tags: { 'create-cairn-site': { gate: '0.99.0-rc.3' } } });
    const r = await verify(d, { version: '0.99.0-rc.4' });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('create-cairn-site: gate holds 0.99.0-rc.3, expected 0.99.0-rc.4');
  });

  it('fails a missing provenance attestation', async () => {
    const r = await verify(deps('0.99.0-rc.4', { provenance: { '@glw907/cairn-cms-dev': false } }), { version: '0.99.0-rc.4' });
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain('@glw907/cairn-cms-dev@0.99.0-rc.4: no provenance attestation');
  });

  it('checks latest for a stable', async () => {
    const d = deps('0.99.0', { tags: { '@glw907/cairn-cms': { latest: '0.98.0', next: '0.99.0-rc.4' } } });
    const r = await verify(d, { version: '0.99.0', from: '0.99.0-rc.4' });
    expect(r.errors).toContain('@glw907/cairn-cms: latest holds 0.98.0, expected 0.99.0');
  });

  it('runs the full fetch, extract, and diff path on the real dev tarballs', async () => {
    const rc2 = new Uint8Array(fixture('cairn-cms-dev-0.99.0-rc.2.tgz'));
    const rc3 = new Uint8Array(fixture('cairn-cms-dev-0.99.0-rc.3.tgz'));
    const before = untar(rc2);
    const after = untar(rc3);
    expect(before.size).toBe(30);
    expect([...before.values()].reduce((n, b) => n + b.length, 0)).toBe(129632);
    expect(Object.keys(diffTrees(before, after))).toEqual(['package.json']);

    const root = '0.99.0';
    const cut = (version: string) => tgz({ 'package.json': `{\n  "version": "${version}"\n}\n` });
    const reg = 'https://registry.npmjs.org';
    // The dev "stable" is the rc.3 tarball judged against the rc.2 "candidate".
    const d = deps(root, {
      tarballs: {
        [`${reg}/@glw907/cairn-cms-dev/-/cairn-cms-dev-0.99.0-rc.2.tgz`]: rc2,
        [`${reg}/@glw907/cairn-cms-dev/-/cairn-cms-dev-0.99.0.tgz`]: rc3,
        [`${reg}/@glw907/cairn-cms/-/cairn-cms-0.99.0-rc.2.tgz`]: cut('0.99.0-rc.2'),
        [`${reg}/@glw907/cairn-cms/-/cairn-cms-0.99.0.tgz`]: cut('0.99.0'),
        [`${reg}/create-cairn-site/-/create-cairn-site-0.99.0-rc.2.tgz`]: cut('0.99.0-rc.2'),
        [`${reg}/create-cairn-site/-/create-cairn-site-0.99.0.tgz`]: cut('0.99.0')
      }
    });
    const r = await verify(d, { version: root, from: '0.99.0-rc.2' });
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });
});
