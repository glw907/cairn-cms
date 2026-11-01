import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { exportTiers } from '../../../scripts/checks/check-tiers.mjs';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// Write each declaration file into a fresh temp directory; every file not named `*.svelte.d.ts` or
// `impl.d.ts` is one subpath. The fixtures are synthetic, never the real dist.
function fixture(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'check-tiers-'));
  dirs.push(dir);
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return Object.keys(files)
    .filter((name) => !name.includes('.svelte.') && name !== 'impl.d.ts')
    .map((name) => ({ subpath: name === 'index.d.ts' ? '.' : `/${name.replace('.d.ts', '')}`, dts: join(dir, name) }));
}

describe('exportTiers', () => {
  it('reads each tier tag and passes a fully tagged module', () => {
    const result = exportTiers(
      fixture({
        'index.d.ts': [
          '/** A seam. @public */',
          'export declare function defineThing(): void;',
          '/** Not committed. @beta */',
          'export interface Draft { a: string; }',
          '/** Copied wiring. @scaffold */',
          'export declare const wiring: string;',
        ].join('\n'),
      }),
    );
    expect(result.failures).toEqual([]);
    expect(result.entries.map((e) => `${e.name}=${e.tier}`).sort()).toEqual([
      'Draft=Unstable',
      'defineThing=Extension',
      'wiring=Scaffold',
    ]);
  });

  it('fails an untagged export, naming it and its subpath', () => {
    const result = exportTiers(
      fixture({
        'index.d.ts': '/** Tagged. @public */\nexport declare const ok: number;\n/** Documented, no tier. */\nexport declare const bare: number;',
      }),
    );
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain('bare');
    expect(result.failures[0]).toContain('subpath .');
  });

  it('fails an export carrying two different tiers', () => {
    const result = exportTiers(fixture({ 'index.d.ts': '/** Both. @public @beta */\nexport declare const both: number;' }));
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain('both');
  });

  it('takes a re-exported name and an export * name from the declaring symbol', () => {
    const result = exportTiers(
      fixture({
        'impl.d.ts': '/** Declared here. @beta */\nexport declare function helper(): void;\nexport declare const untagged: number;',
        'index.d.ts': "export { helper } from './impl.js';\n",
        'star.d.ts': "export * from './impl.js';\n",
      }),
    );
    const tiers = result.entries.map((e) => `${e.subpath}:${e.name}=${e.tier}`);
    expect(tiers).toEqual(expect.arrayContaining(['.:helper=Unstable', '/star:helper=Unstable', '/star:untagged=null']));
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain('untagged');
  });

  it("takes a component's tier from its component doc block", () => {
    const result = exportTiers(
      fixture({
        'Widget.svelte.d.ts': [
          'interface Props { label: string; }',
          '/**',
          ' * A widget a site mounts.',
          ' * @public',
          ' */',
          'declare const Widget: import("svelte").Component<Props, {}, "">;',
          'type Widget = ReturnType<typeof Widget>;',
          'export default Widget;',
        ].join('\n'),
        'index.d.ts': "export { default as Widget } from './Widget.svelte';\n",
      }),
    );
    expect(result.failures).toEqual([]);
    expect(result.entries).toEqual([expect.objectContaining({ name: 'Widget', tier: 'Extension' })]);
  });
});
