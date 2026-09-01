import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enumerateExports, moduleExports } from '../../../scripts/checks/reference-coverage.mjs';

// The four names the surface-pruning pass demotes from the /sveltekit barrel (Task 2), verbatim
// from `docs/superpowers/plans/2026-07-01-surface-pruning-pass.md`.
const DEMOTED = ['isPublicAdminPath', 'parseAdminPath', 'AdminView', 'NavRoutesDeps'];

// Six names this list once kept, retired from the /sveltekit barrel by the retires pass, Task 2:
// sanctioned NavIcon-class closure leaks (the F-1 hybrid ruling, r4-rederivation section 7). Each
// survives structurally inside a keep parent's rendered shape; the replacement expression per name
// is `docs/internal/record/2026-08-30-retires-move-record.md`.
const RETIRED_LEAKS = ['NavConcept', 'EntrySummary', 'AdvisoryNotice', 'AdvisoryAction', 'MediaUsageInfo', 'NavPageOption'];

// The five core arm shapes ContentFormFailure's Partial<> intersection once carried, retired from
// every barrel and subpath by the conventions pass, Task 5 (`audit-sveltekit-contentformfailure`'s
// prescribed flatten): every field folded into the flat, all-optional ContentFormFailure, which
// stays in KEPT below. DeleteRefusal survives structurally as ContentFormFailure's inboundLinks/
// inboundKind/id fields, the same F-1-class leak the six names above already establish.
const RETIRED_CORE_ARMS = ['SaveFailure', 'DeleteRefusal', 'RenameFailure', 'CreateFailure', 'PreviewMintFailure'];

// The keep list for the /sveltekit subpath, from the audit verdicts doc's `## ./sveltekit`
// section (`docs/superpowers/plans/2026-07-01-surface-pruning-audit-verdicts.md`), minus the
// four demotions above and the six retired leaks above.
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
  'AdminShellData',
  'ListData',
  'EditData',
  'HelpData',
  'MediaLibraryData',
  'ContentRoutesConfig',
  'MediaDeleteRefusal',
  'MediaUpdateFailure',
  'MediaReplaceFailure',
  'MediaAltPropagateFailure',
  'MediaBulkFailure',
  'ContentFormFailure',
  'UploadResult',
  'createNavRoutes',
  'NavLoadData',
  'NavIcon',
  'ResolvedNavEntry',
  'createCairnAdmin',
  'CairnAdminConfig',
  'AdminData',
  'healthLoad',
  'HealthData',
  'CairnEvent',
  'CookieJar',
  'HandleInput',
  'PlatformContext',
  'CairnEnv',
  'EmailSender',
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

  it('no longer resolves the retired leak names from the /sveltekit subpath', () => {
    const names = new Set(enumerateExports(DTS));
    const stillPresent = RETIRED_LEAKS.filter((name) => names.has(name));
    expect(stillPresent).toEqual([]);
  });

  it('no longer resolves the retired core-arm names from the /sveltekit subpath', () => {
    const names = new Set(enumerateExports(DTS));
    const stillPresent = RETIRED_CORE_ARMS.filter((name) => names.has(name));
    expect(stillPresent).toEqual([]);
  });

  it('still resolves every keep-list name from the /sveltekit subpath', () => {
    const names = new Set(enumerateExports(DTS));
    const missing = KEPT.filter((name) => !names.has(name));
    expect(missing).toEqual([]);
  });

  it('ContentRoutesConfig carries no backend member on the packaged type', () => {
    const { checker, symbols } = moduleExports(DTS);
    const symbol = symbols.find((s) => s.name === 'ContentRoutesConfig');
    expect(symbol, 'ContentRoutesConfig must still be exported').toBeDefined();
    const declared = symbol!.declarations?.[0];
    expect(declared, 'ContentRoutesConfig must have a declaration').toBeDefined();
    const type = checker.getTypeAtLocation(declared!);
    const memberNames = type.getProperties().map((p) => p.name);
    expect(memberNames).not.toContain('backend');
    // Surface-pruning Task 6: anthropic/tidyTimeoutMs regrouped into one `tidy` bag.
    expect(memberNames).not.toContain('anthropic');
    expect(memberNames).not.toContain('tidyTimeoutMs');
    // navFilter is the per-request custom-navLayout filter seam, added alongside `tidy`; attention
    // is the per-session pending-work seam (admin access-and-attention pass), added alongside it;
    // preview is the mint action's link-lifetime config (spec part 3, "Public preview for a
    // non-editor").
    expect(memberNames).toEqual(['tidy', 'navFilter', 'attention', 'preview']);
  });
});
