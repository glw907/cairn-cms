import { describe, it, expect } from 'vitest';
import { composeRuntime } from '../../lib/content/compose.js';
import type { CairnAdapter, CairnExtension } from '../../lib/content/types.js';
import { defineFields } from '../../lib/content/schema.js';

function adapter(): CairnAdapter {
  return {
    siteName: 'T',
    content: { pages: { dir: 'src/content/pages', schema: defineFields([]) } },
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    render: (md) => md,
  };
}

describe('composeRuntime extension carry-through', () => {
  it('carries extension admin panels and field types onto the runtime', () => {
    const ext: CairnExtension = {
      adminPanels: [{ id: 'calendar', label: 'Calendar', component: {} }],
      fieldTypes: [{ type: 'color' }],
    };
    const runtime = composeRuntime(adapter(), [ext]);
    expect(runtime.adminPanels).toEqual([{ id: 'calendar', label: 'Calendar', component: {} }]);
    expect(runtime.fieldTypes).toEqual([{ type: 'color' }]);
  });

  it('defaults the carried arrays to empty when no extension contributes', () => {
    const runtime = composeRuntime(adapter(), []);
    expect(runtime.adminPanels).toEqual([]);
    expect(runtime.fieldTypes).toEqual([]);
  });
});

describe('composeRuntime manifestPath', () => {
  it('defaults the manifest path', () => {
    expect(composeRuntime(adapter()).manifestPath).toBe('src/content/.cairn/index.json');
  });
  it('honors an adapter override', () => {
    expect(composeRuntime({ ...adapter(), manifestPath: 'content/.cairn/idx.json' }).manifestPath).toBe('content/.cairn/idx.json');
  });
});
