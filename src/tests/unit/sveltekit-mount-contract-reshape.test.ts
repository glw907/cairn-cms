import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enumerateExports, moduleExports } from '../../../scripts/reference-coverage.mjs';
import type { CairnPlatformBindings, CairnMediaBindings } from '../../lib/sveltekit/index.js';

const SVELTEKIT_DTS = resolve(fileURLToPath(new URL('../../../dist/sveltekit/index.d.ts', import.meta.url)));
const MEDIA_DTS = resolve(fileURLToPath(new URL('../../../dist/media/index.d.ts', import.meta.url)));

/**
 * An exported interface's member names, split into the full set and the required (non-optional)
 *  subset. Resolves through the export alias to the interface's own declared type: `getTypeAtLocation`
 *  on the barrel's `export { type X } from ...` specifier is unreliable (it answers for some
 *  specifier shapes and not others), while `getAliasedSymbol` always reaches the real declaration.
 */
function memberNames(dtsPath: string, name: string): { names: string[]; required: string[] } {
  const { checker, symbols } = moduleExports(dtsPath);
  const symbol = symbols.find((s) => s.name === name);
  expect(symbol, `${name} must be exported`).toBeDefined();
  const aliased = checker.getAliasedSymbol(symbol!);
  const type = checker.getDeclaredTypeOfSymbol(aliased);
  const props = type.getProperties();
  return {
    names: props.map((p) => p.name),
    required: props.filter((p) => (p.flags & ts.SymbolFlags.Optional) === 0).map((p) => p.name),
  };
}

describe('mount contract shape (surface-pruning Task 6)', () => {
  it('resolves the packaged dist output for both subpaths', () => {
    expect(existsSync(SVELTEKIT_DTS), 'missing dist/sveltekit/index.d.ts; run "npm run package" first').toBe(true);
    expect(existsSync(MEDIA_DTS), 'missing dist/media/index.d.ts; run "npm run package" first').toBe(true);
  });

  it('ResolvedAssetConfig no longer resolves from /sveltekit but stays on /media', () => {
    const sveltekitNames = new Set(enumerateExports(SVELTEKIT_DTS));
    const mediaNames = new Set(enumerateExports(MEDIA_DTS));
    expect(sveltekitNames.has('ResolvedAssetConfig')).toBe(false);
    expect(mediaNames.has('ResolvedAssetConfig')).toBe(true);
  });

  it('createMediaRoute takes the runtime, not a bare ResolvedAssetConfig', () => {
    const { checker, symbols } = moduleExports(SVELTEKIT_DTS);
    const symbol = symbols.find((s) => s.name === 'createMediaRoute');
    expect(symbol, 'createMediaRoute must be exported').toBeDefined();
    const decl = symbol!.valueDeclaration ?? symbol!.declarations?.[0];
    const type = checker.getTypeOfSymbolAtLocation(symbol!, decl!);
    const sig = type.getCallSignatures()[0];
    expect(sig, 'createMediaRoute must be callable').toBeDefined();
    const paramType = checker.typeToString(checker.getTypeOfSymbol(sig!.parameters[0]!));
    expect(paramType).toBe('CairnRuntime');
  });

  it('CairnAdminDeps regroups into auth and tidy bags, with no flat branding/send/anthropic/tidyTimeoutMs', () => {
    const { names } = memberNames(SVELTEKIT_DTS, 'CairnAdminDeps');
    expect(names).toEqual(['auth', 'tidy']);
  });

  it('CairnPlatformBindings names every always-on engine binding as required, ANTHROPIC_API_KEY optional', () => {
    const { names, required } = memberNames(SVELTEKIT_DTS, 'CairnPlatformBindings');
    const expectedNames = ['AUTH_DB', 'EMAIL', 'PUBLIC_ORIGIN', 'GITHUB_APP_PRIVATE_KEY_B64', 'ANTHROPIC_API_KEY'];
    const expectedRequired = ['AUTH_DB', 'EMAIL', 'PUBLIC_ORIGIN', 'GITHUB_APP_PRIVATE_KEY_B64'];
    expect(names.sort()).toEqual(expectedNames.sort());
    expect(required.sort()).toEqual(expectedRequired.sort());
  });

  it('CairnMediaBindings names MEDIA_BUCKET as required, split from the always-on bindings', () => {
    const { names, required } = memberNames(SVELTEKIT_DTS, 'CairnMediaBindings');
    expect(names).toEqual(['MEDIA_BUCKET']);
    expect(required).toEqual(['MEDIA_BUCKET']);
  });

  it('a text-only site declares Platform.env from CairnPlatformBindings alone, no MEDIA_BUCKET required', () => {
    type SiteEnv = CairnPlatformBindings & { APP_DB: string };
    const env: SiteEnv = {
      AUTH_DB: {} as never,
      EMAIL: {} as never,
      PUBLIC_ORIGIN: 'https://example.com',
      GITHUB_APP_PRIVATE_KEY_B64: 'z',
      APP_DB: 'db',
    };
    expect(env).toBeDefined();
  });

  it('a missing engine binding on the app.d.ts intersection fails to typecheck', () => {
    type SiteEnv = CairnPlatformBindings & { APP_DB: string };
    // @ts-expect-error GITHUB_APP_PRIVATE_KEY_B64 is missing from the intersection
    const env: SiteEnv = {
      AUTH_DB: {} as never,
      EMAIL: {} as never,
      PUBLIC_ORIGIN: 'https://example.com',
      APP_DB: 'db',
    };
    expect(env).toBeDefined();
  });

  it('a media-enabled site adds CairnMediaBindings to the intersection', () => {
    type SiteEnv = CairnPlatformBindings & CairnMediaBindings & { APP_DB: string };
    const env: SiteEnv = {
      AUTH_DB: {} as never,
      EMAIL: {} as never,
      PUBLIC_ORIGIN: 'https://example.com',
      MEDIA_BUCKET: {} as never,
      GITHUB_APP_PRIVATE_KEY_B64: 'z',
      APP_DB: 'db',
    };
    expect(env).toBeDefined();
  });
});
