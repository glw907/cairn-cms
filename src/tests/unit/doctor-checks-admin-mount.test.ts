import { describe, it, expect } from 'vitest';
import { adminMountShape } from '../../lib/doctor/checks-local.js';
import type { DoctorContext } from '../../lib/doctor/types.js';

function ctx(files: Record<string, string>): DoctorContext {
  return {
    cwd: '/site',
    fetch: globalThis.fetch,
    readFile: async (relPath) => files[relPath] ?? null,
  };
}

// A four-file mount whose composer is renamed to `cms`: the shellLoad member-access lives on a
// non-default identifier, and the shared shell renders in the layout component. The loose match
// must detect both signals despite the rename.
const RENAMED_LAYOUT_SERVER = `import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '$lib/cairn';
const cms = createCairnAdmin(runtime);
export const load = cms.shellLoad;
`;

const SHELL_LAYOUT = `<script lang="ts">
  import { CairnAdminShell } from '@glw907/cairn-cms/components';
  let { data, children } = $props();
</script>

<CairnAdminShell {data}>
  {@render children()}
</CairnAdminShell>
`;

describe('admin.mount-shape', () => {
  it('passes a renamed composer that wires shellLoad and renders CairnAdminShell', async () => {
    const result = await adminMountShape.run(
      ctx({
        'src/routes/admin/+layout.server.ts': RENAMED_LAYOUT_SERVER,
        'src/routes/admin/+layout.svelte': SHELL_LAYOUT,
      })
    );
    expect(result.status).toBe('pass');
    expect(result.detail).toMatch(/shellLoad/);
    expect(result.detail).toMatch(/CairnAdminShell/);
  });

  it('skips with guidance when the mount files are all absent', async () => {
    const result = await adminMountShape.run(ctx({}));
    expect(result.status).toBe('skip');
    // The guidance detail names the expected files and the one-line fix.
    expect(result.detail).toMatch(/CairnAdminShell/);
    expect(result.detail).toMatch(/shellLoad/);
    expect(result.detail).toMatch(/\+layout/);
    expect(result.detail).toMatch(/\[\.\.\.path\]/);
  });

  it('never returns fail for any input (best-effort, non-blocking)', async () => {
    const inputs: Record<string, string>[] = [
      {},
      { 'src/routes/admin/+layout.server.ts': RENAMED_LAYOUT_SERVER },
      { 'src/routes/admin/+layout.svelte': SHELL_LAYOUT },
      { 'src/routes/admin/[...path]/+page.svelte': '<p>unrelated</p>' },
      {
        'src/routes/admin/+layout.server.ts': RENAMED_LAYOUT_SERVER,
        'src/routes/admin/+layout.svelte': SHELL_LAYOUT,
      },
    ];
    for (const files of inputs) {
      const result = await adminMountShape.run(ctx(files));
      expect(result.status).not.toBe('fail');
    }
  });

  it('detects the shell render from the catch-all page when the layout carries shellLoad', async () => {
    // The composer-rename tolerance plus the shell signal found in the [...path] catch-all.
    const result = await adminMountShape.run(
      ctx({
        'src/routes/admin/+layout.server.js': 'export const load = cms.shellLoad;',
        'src/routes/admin/[...path]/+page.svelte': SHELL_LAYOUT,
      })
    );
    expect(result.status).toBe('pass');
  });

  it('ties to the admin.mount-incomplete condition', () => {
    expect(adminMountShape.conditionId).toBe('admin.mount-incomplete');
  });
});
