import { describe, it, expect } from 'vitest';
import { loadImportChain } from '../../../lib/audit/import-chain.js';
import type { ChainFs } from '../../../lib/audit/import-chain.js';

/** An in-memory tree: absolute path to text. */
function memory(files: Record<string, string>): ChainFs {
  return { readText: (path) => files[path] };
}

const ROOT = '/site';

const pkg = (json: object) => JSON.stringify(json);

describe('loadImportChain', () => {
  it('follows relative imports depth first, each file after the files it imports', () => {
    const fs = memory({
      '/site/src/theme/theme.css': '@import "../chassis/tokens.css";\n.theme { color: red }',
      '/site/src/chassis/tokens.css': '@import "./prose.css";\n:root { --a: 1 }',
      '/site/src/chassis/prose.css': '.prose { margin: 0 }',
    });
    const chain = loadImportChain(ROOT, ['src/theme/theme.css'], fs);
    expect(chain.files.map((file) => file.file)).toEqual([
      'src/chassis/prose.css',
      'src/chassis/tokens.css',
      'src/theme/theme.css',
    ]);
    expect(chain.files.find((file) => file.file === 'src/theme/theme.css')?.entry).toBe(true);
    expect(chain.unread).toEqual([]);
  });

  it('reads every statement through the stylesheet parser, never a commented import', () => {
    const fs = memory({
      '/site/a.css': '/* @import "./gone.css"; */\n@import "./b.css";\n',
      '/site/b.css': ':root { --b: 1 }',
      '/site/gone.css': ':root { --gone: 1 }',
    });
    const chain = loadImportChain(ROOT, ['a.css'], fs);
    expect(chain.files.map((file) => file.file)).toEqual(['b.css', 'a.css']);
  });

  it('tolerates layer() and source() modifiers and a url() target', () => {
    const fs = memory({
      '/site/a.css': '@import "./b.css" layer(base);\n@import url("./c.css") supports(display: grid) screen;\n@import "./d.css" source(none);',
      '/site/b.css': '.b {}',
      '/site/c.css': '.c {}',
      '/site/d.css': '.d {}',
    });
    const chain = loadImportChain(ROOT, ['a.css'], fs);
    expect(chain.files.map((file) => file.file)).toEqual(['b.css', 'c.css', 'd.css', 'a.css']);
  });

  it('never reads a file twice and survives an import cycle', () => {
    const fs = memory({
      '/site/a.css': '@import "./b.css";\n@import "./b.css";',
      '/site/b.css': '@import "./a.css";\n.b {}',
    });
    const chain = loadImportChain(ROOT, ['a.css'], fs);
    expect(chain.files.map((file) => file.file)).toEqual(['b.css', 'a.css']);
  });

  it('does not traverse tailwindcss and does not report it unread', () => {
    const fs = memory({ '/site/a.css': '@import "tailwindcss";\n@import "tailwindcss/theme.css";' });
    const chain = loadImportChain(ROOT, ['a.css'], fs);
    expect(chain.files.map((file) => file.file)).toEqual(['a.css']);
    expect(chain.imports.map((entry) => entry.status)).toEqual(['skipped', 'skipped']);
    expect(chain.unread).toEqual([]);
  });

  it('skips a remote stylesheet without reading or reporting it', () => {
    const fs = memory({ '/site/a.css': '@import url("https://fonts.example/x.css");\n@import "//cdn.example/y.css";' });
    const chain = loadImportChain(ROOT, ['a.css'], fs);
    expect(chain.imports.map((entry) => entry.status)).toEqual(['skipped', 'skipped']);
    expect(chain.unread).toEqual([]);
  });
});

describe('package specifiers', () => {
  const site = (extra: Record<string, string>, spec: string) => {
    const fs = memory({ '/site/a.css': `@import "${spec}";`, ...extra });
    return loadImportChain(ROOT, ['a.css'], fs);
  };

  it('resolves under the style export condition, not plain Node resolution', () => {
    const chain = site(
      {
        '/site/node_modules/lib/package.json': pkg({
          name: 'lib',
          exports: { '.': { types: './t.d.ts', style: './index.css', require: './dist/lib.js', import: './dist/lib.mjs' } },
        }),
        '/site/node_modules/lib/index.css': '.lib { --lib: 1 }',
      },
      'lib'
    );
    expect(chain.files.map((file) => file.file)).toEqual(['node_modules/lib/index.css', 'a.css']);
    expect(chain.files[0].specifier).toBe('lib');
  });

  it('resolves a subpath through the exports map, then a pattern entry', () => {
    const chain = site(
      {
        '/site/node_modules/@scope/pkg/package.json': pkg({
          name: '@scope/pkg',
          exports: { './fonts/*.css': './css/*.css' },
        }),
        '/site/node_modules/@scope/pkg/css/opsz.css': '.f {}',
      },
      '@scope/pkg/fonts/opsz.css'
    );
    expect(chain.files.map((file) => file.file)).toEqual(['node_modules/@scope/pkg/css/opsz.css', 'a.css']);
  });

  it('prefers the more specific pattern key, as Node does', () => {
    const chain = site(
      {
        '/site/node_modules/fontpkg/package.json': pkg({
          name: 'fontpkg',
          exports: { './*': { default: './*.css' }, './*.css': { default: './*.css' } },
        }),
        '/site/node_modules/fontpkg/index.css': '.font {}',
      },
      'fontpkg/index.css'
    );
    expect(chain.files.map((file) => file.file)).toEqual(['node_modules/fontpkg/index.css', 'a.css']);
  });

  it('falls back to the style field for a bare specifier the exports map gives no style target', () => {
    const chain = site(
      {
        '/site/node_modules/lib/package.json': pkg({
          name: 'lib',
          style: 'dist/lib.css',
          exports: { '.': { import: './dist/lib.mjs' } },
        }),
        '/site/node_modules/lib/dist/lib.css': '.lib {}',
      },
      'lib'
    );
    expect(chain.files.map((file) => file.file)).toEqual(['node_modules/lib/dist/lib.css', 'a.css']);
  });

  it('falls back to the file path when the package has no exports field', () => {
    const chain = site(
      {
        '/site/node_modules/@fontsource/x/package.json': pkg({ name: '@fontsource/x', main: 'index.js' }),
        '/site/node_modules/@fontsource/x/index.css': '.x {}',
      },
      '@fontsource/x/index.css'
    );
    expect(chain.files.map((file) => file.file)).toEqual(['node_modules/@fontsource/x/index.css', 'a.css']);
  });

  it('finds a package installed above the audited root', () => {
    const fs = memory({
      '/ws/site/a.css': '@import "lib/x.css";',
      '/ws/node_modules/lib/package.json': pkg({ name: 'lib' }),
      '/ws/node_modules/lib/x.css': '.x {}',
    });
    const chain = loadImportChain('/ws/site', ['a.css'], fs);
    expect(chain.files.map((file) => file.file)).toEqual(['../node_modules/lib/x.css', 'a.css']);
  });

  it('records an uninstalled package as unread, with no finding-shaped failure', () => {
    const chain = site({}, '@fontsource-variable/fraunces/opsz.css');
    expect(chain.files.map((file) => file.file)).toEqual(['a.css']);
    expect(chain.unread).toEqual([
      { file: 'a.css', specifier: '@fontsource-variable/fraunces/opsz.css', reason: 'the package is not installed' },
    ]);
  });

  it('records an exports map with no matching subpath as unread', () => {
    const chain = site(
      { '/site/node_modules/lib/package.json': pkg({ name: 'lib', exports: { '.': './index.css' } }) },
      'lib/missing.css'
    );
    expect(chain.unread.map((entry) => entry.specifier)).toEqual(['lib/missing.css']);
  });

  it('records a resolved file that does not exist as unread', () => {
    const chain = site({ '/site/node_modules/lib/package.json': pkg({ name: 'lib' }) }, 'lib/gone.css');
    expect(chain.unread.map((entry) => entry.specifier)).toEqual(['lib/gone.css']);
  });

  it('records a missing relative import as unread', () => {
    const fs = memory({ '/site/a.css': '@import "./nope.css";' });
    expect(loadImportChain(ROOT, ['a.css'], fs).unread.map((entry) => entry.specifier)).toEqual(['./nope.css']);
  });

  it('names a non-CSS target and never parses it', () => {
    const chain = site(
      {
        '/site/node_modules/lib/package.json': pkg({ name: 'lib', exports: { '.': { default: './dist/lib.js' } } }),
        '/site/node_modules/lib/dist/lib.js': 'export default {}',
      },
      'lib'
    );
    expect(chain.files.map((file) => file.file)).toEqual(['a.css']);
    expect(chain.imports[0]).toMatchObject({ specifier: 'lib', status: 'non-css', resolved: 'node_modules/lib/dist/lib.js' });
    expect(chain.unread).toEqual([]);
  });

  it('records an entry stylesheet the tree lacks as unread', () => {
    const chain = loadImportChain(ROOT, ['src/theme/theme.css'], memory({}));
    expect(chain.files).toEqual([]);
    expect(chain.unread).toEqual([
      { file: 'src/theme/theme.css', specifier: 'src/theme/theme.css', reason: 'the entry stylesheet does not exist' },
    ]);
  });

  it('keeps each statement offset, so a finding can land on the import', () => {
    const css = '@import "tailwindcss";\n@import "lib";\n';
    const fs = memory({ '/site/a.css': css });
    const [, second] = loadImportChain(ROOT, ['a.css'], fs).imports;
    expect(css.slice(second.start, second.end)).toBe('@import "lib";');
    expect(second.from).toBe('a.css');
  });
});
