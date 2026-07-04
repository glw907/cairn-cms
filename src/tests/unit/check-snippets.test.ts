import { describe, it, expect } from 'vitest';
import {
  extractBlocks,
  isPackageSpecifier,
  isRealSpecifier,
  rewriteLocalImports,
  stripGlobalAugmentations,
  svelteScript,
  isDeclarationOnly,
  typecheckUnits,
} from '../../../scripts/check-snippets.mjs';

describe('extractBlocks', () => {
  it('extracts a fenced ts block with its 1-based fence line', () => {
    const blocks = extractBlocks('intro\n\n```ts\nconst x = 1;\n```\n');
    expect(blocks).toEqual([{ lang: 'ts', fenceLine: 3, body: 'const x = 1;', skipReason: null }]);
  });

  it('extracts a fenced svelte block', () => {
    const blocks = extractBlocks('```svelte\n<script>1</script>\n```\n');
    expect(blocks[0].lang).toBe('svelte');
  });

  it('ignores a fenced bash or markdown block', () => {
    const blocks = extractBlocks('```bash\nnpm install\n```\n');
    expect(blocks).toEqual([]);
  });

  it('reads the opt-out reason from a skip comment directly above the fence', () => {
    const blocks = extractBlocks('<!-- snippet-check-skip: a deliberate fragment -->\n```ts\nx;\n```\n');
    expect(blocks[0].skipReason).toBe('a deliberate fragment');
  });

  it('finds the skip comment through blank lines', () => {
    const blocks = extractBlocks('<!-- snippet-check-skip: reason -->\n\n\n```ts\nx;\n```\n');
    expect(blocks[0].skipReason).toBe('reason');
  });

  it('leaves skipReason null with no comment above the fence', () => {
    const blocks = extractBlocks('some prose\n```ts\nx;\n```\n');
    expect(blocks[0].skipReason).toBeNull();
  });
});

describe('isPackageSpecifier', () => {
  it('matches the bare package name and a subpath', () => {
    expect(isPackageSpecifier('@glw907/cairn-cms')).toBe(true);
    expect(isPackageSpecifier('@glw907/cairn-cms/sveltekit')).toBe(true);
  });

  it('rejects an unrelated specifier', () => {
    expect(isPackageSpecifier('svelte')).toBe(false);
  });
});

describe('isRealSpecifier', () => {
  it('treats the package itself as real', () => {
    expect(isRealSpecifier('@glw907/cairn-cms')).toBe(true);
  });

  it('treats a relative specifier as local even if it happens to resolve', () => {
    expect(isRealSpecifier('./repo-root.mjs')).toBe(false);
  });

  it('treats a SvelteKit alias as local', () => {
    expect(isRealSpecifier('$lib/cairn.config.js')).toBe(false);
    expect(isRealSpecifier('$app/environment')).toBe(false);
  });

  it('treats a resolvable dependency of this package as real', () => {
    expect(isRealSpecifier('svelte')).toBe(true);
  });

  it('treats an unresolvable bare specifier as local', () => {
    expect(isRealSpecifier('@tailwindcss/vite')).toBe(false);
  });
});

describe('rewriteLocalImports', () => {
  it('stubs a local named import as declare const, one line for one line', () => {
    const out = rewriteLocalImports("import { cairn, siteConfig } from '$lib/cairn.config.js';");
    expect(out.split('\n')).toHaveLength(1);
    expect(out).toContain('declare const cairn: any;');
    expect(out).toContain('declare const siteConfig: any;');
  });

  it('stubs a type-only local import as a type alias', () => {
    const out = rewriteLocalImports("import type { PageServerLoad } from './$types';");
    expect(out).toBe('type PageServerLoad = any;');
  });

  it('stubs a default local import', () => {
    const out = rewriteLocalImports("import Converter from '$lib/islands/Converter.svelte';");
    expect(out).toBe('declare const Converter: any;');
  });

  it('leaves a real package import untouched', () => {
    const line = "import { defineAdapter } from '@glw907/cairn-cms';";
    expect(rewriteLocalImports(line)).toBe(line);
  });

  it('leaves a resolvable real dependency import untouched', () => {
    const line = "import { h } from 'hastscript';";
    expect(rewriteLocalImports(line)).toBe(line);
  });

  it('does not redeclare the same stubbed name twice in one block', () => {
    const out = rewriteLocalImports(
      ["import { cairn } from '$lib/cairn.config.js';", "import { cairn } from '$lib/cairn.config.js';"].join('\n'),
    );
    expect(out.match(/declare const cairn: any;/g)).toHaveLength(1);
  });

  it('stubs a side-effect-only local import as a comment', () => {
    const out = rewriteLocalImports("import '$lib/app.css';");
    expect(out).toContain('// snippet-check: stubbed side-effect import');
  });
});

describe('stripGlobalAugmentations', () => {
  it('leaves code with no global augmentation untouched', () => {
    const code = "import { defineAdapter } from '@glw907/cairn-cms';";
    expect(stripGlobalAugmentations(code)).toBe(code);
  });

  it('blanks a declare global block, preserving the line count', () => {
    const code = [
      "import type { CairnPlatformBindings } from '@glw907/cairn-cms/sveltekit';",
      "declare global {",
      "  namespace App {",
      "    interface Platform {",
      "      env: CairnPlatformBindings;",
      "    }",
      "  }",
      "}",
    ].join('\n');
    const out = stripGlobalAugmentations(code);
    expect(out.split('\n')).toHaveLength(code.split('\n').length);
    expect(out).toContain("import type { CairnPlatformBindings } from '@glw907/cairn-cms/sveltekit';");
    expect(out).not.toContain('interface Platform');
    expect(out).toContain('elided global augmentation');
  });

  it('leaves the import alongside an elided block intact, so a retired name still fails there', () => {
    const code = [
      "import type { NotARealExport } from '@glw907/cairn-cms/sveltekit';",
      'declare global {',
      '  namespace App {',
      '    interface Platform {',
      '      env: NotARealExport;',
      '    }',
      '  }',
      '}',
    ].join('\n');
    // The import itself, not the augmentation body, carries the checkable claim.
    expect(stripGlobalAugmentations(code)).toContain(
      "import type { NotARealExport } from '@glw907/cairn-cms/sveltekit';",
    );
  });
});

describe('the shared-program cross-block global augmentation regression', () => {
  it('does not let two units with differently-shaped App.Platform.env augmentations collide', () => {
    const unitA = {
      file: 'docs/reference/a.md',
      lineBase: 0,
      code: stripGlobalAugmentations(
        [
          "import type { CairnPlatformBindings } from '@glw907/cairn-cms/sveltekit';",
          'declare global {',
          '  namespace App {',
          '    interface Platform {',
          '      env: CairnPlatformBindings;',
          '    }',
          '  }',
          '}',
        ].join('\n'),
      ),
    };
    const unitB = {
      file: 'docs/guides/b.md',
      lineBase: 0,
      code: stripGlobalAugmentations(
        [
          "import type { CairnPlatformBindings, CairnMediaBindings } from '@glw907/cairn-cms/sveltekit';",
          'declare global {',
          '  namespace App {',
          '    interface Platform {',
          '      env: CairnPlatformBindings & CairnMediaBindings;',
          '    }',
          '  }',
          '}',
        ].join('\n'),
      ),
    };
    const problems = typecheckUnits([unitA, unitB]);
    expect(problems).toEqual([]);
  });
});

describe('svelteScript', () => {
  it('extracts the script body and the line offset before it', () => {
    const body = '<div>markup</div>\n<script lang="ts">\nconst x = 1;\n</script>\n';
    const result = svelteScript(body);
    expect(result?.code).toBe('const x = 1;');
    expect(result?.lineOffset).toBe(2);
  });

  it('returns null for a block with no script tag', () => {
    expect(svelteScript('<MarkdownEditor bind:value={body} />')).toBeNull();
  });
});

describe('isDeclarationOnly', () => {
  it('recognizes a declare function signature block', () => {
    expect(isDeclarationOnly('declare function f(a: string): number;')).toBe(true);
  });

  it('recognizes a bodyless overload signature with no declare keyword', () => {
    expect(isDeclarationOnly('function f(a: string): number;')).toBe(true);
  });

  it('recognizes an interface and a type alias', () => {
    expect(isDeclarationOnly('interface X { a: string }')).toBe(true);
    expect(isDeclarationOnly('type X = { a: string };')).toBe(true);
  });

  it('recognizes a bare Props destructure with no initializer', () => {
    expect(isDeclarationOnly('let { data, form }: { data: string; form: string };')).toBe(true);
  });

  it('recognizes a bare object-type block with no type alias wrapper', () => {
    expect(isDeclarationOnly('{\n  a?: string;\n  b?: number;\n}')).toBe(true);
  });

  it('rejects a real statement', () => {
    expect(isDeclarationOnly("const x = defineAdapter({ content: {} });")).toBe(false);
  });

  it('rejects an empty block', () => {
    expect(isDeclarationOnly('')).toBe(false);
  });

  it('does not exclude a multi-statement example that forgot $props()', () => {
    const code = "import { x } from 'svelte';\nlet { data }: { data: string };";
    expect(isDeclarationOnly(code)).toBe(false);
  });
});
