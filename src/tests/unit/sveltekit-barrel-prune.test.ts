import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enumerateExports, moduleExports } from '../../../scripts/reference-coverage.mjs';

// The four names the surface-pruning pass demotes from the /sveltekit barrel (Task 2), verbatim
// from `docs/superpowers/plans/2026-07-01-surface-pruning-pass.md`.
const DEMOTED = ['isPublicAdminPath', 'parseAdminPath', 'AdminView', 'NavRoutesDeps'];

// The keep list for the /sveltekit subpath, from the audit verdicts doc's `## ./sveltekit`
// section (`docs/superpowers/plans/2026-07-01-surface-pruning-audit-verdicts.md`), minus the
// four demotions above.
const KEPT = [
  'createAuthGuard',
  'requireSession',
  'requireOwner',
  'createAuthRoutes',
  'AuthRoutesConfig',
  'RequestResult',
  'createEditorRoutes',
  'createContentRoutes',
  'createMediaRoute',
  'NavConcept',
  'AdminShellData',
  'EntrySummary',
  'ListData',
  'EditData',
  'AdvisoryNotice',
  'AdvisoryAction',
  'HelpData',
  'MediaUsageInfo',
  'MediaLibraryData',
  'ContentEvent',
  'ContentRoutesDeps',
  'SaveFailure',
  'DeleteRefusal',
  'RenameFailure',
  'MediaDeleteRefusal',
  'MediaUpdateFailure',
  'MediaReplaceFailure',
  'MediaAltPropagateFailure',
  'MediaBulkFailure',
  'ContentFormFailure',
  'UploadResult',
  'createNavRoutes',
  'NavLoadData',
  'NavPageOption',
  'AdminNavEntry',
  'AdminNavIcon',
  'ResolvedNavEntry',
  'createCairnAdmin',
  'CairnAdminDeps',
  'AdminData',
  'healthLoad',
  'HealthData',
  'RequestContext',
  'CookieJar',
  'HandleInput',
  'BackendEnv',
  'AuthEnv',
];

const DTS = resolve(
  fileURLToPath(new URL('../../../dist/sveltekit/index.d.ts', import.meta.url)),
);

describe('sveltekit barrel prune', () => {
  it('resolves the packaged dist output', () => {
    expect(existsSync(DTS), 'missing dist/sveltekit/index.d.ts; run "npm run package" first').toBe(true);
  });

  it('no longer resolves the demoted names from the /sveltekit subpath', () => {
    const names = new Set(enumerateExports(DTS));
    const stillPresent = DEMOTED.filter((name) => names.has(name));
    expect(stillPresent).toEqual([]);
  });

  it('still resolves every keep-list name from the /sveltekit subpath', () => {
    const names = new Set(enumerateExports(DTS));
    const missing = KEPT.filter((name) => !names.has(name));
    expect(missing).toEqual([]);
  });

  it('ContentRoutesDeps carries no backend member on the packaged type', () => {
    const { checker, symbols } = moduleExports(DTS);
    const symbol = symbols.find((s) => s.name === 'ContentRoutesDeps');
    expect(symbol, 'ContentRoutesDeps must still be exported').toBeDefined();
    const declared = symbol!.declarations?.[0];
    expect(declared, 'ContentRoutesDeps must have a declaration').toBeDefined();
    const type = checker.getTypeAtLocation(declared!);
    const memberNames = type.getProperties().map((p) => p.name);
    expect(memberNames).not.toContain('backend');
    // Surface-pruning Task 6: anthropic/tidyTimeoutMs regrouped into one `tidy` bag.
    expect(memberNames).not.toContain('anthropic');
    expect(memberNames).not.toContain('tidyTimeoutMs');
    expect(memberNames).toEqual(['tidy']);
  });
});
