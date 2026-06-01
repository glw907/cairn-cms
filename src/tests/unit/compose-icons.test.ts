import { describe, it, expect } from 'vitest';
import { composeRuntime } from '../../lib/content/compose.js';
import type { CairnAdapter } from '../../lib/content/types.js';

const base: CairnAdapter = {
  siteName: 'Demo',
  content: {},
  backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '1' },
  sender: { from: 'cms@example.com' },
  render: (md) => md,
};

describe('composeRuntime icons', () => {
  it('carries the site IconSet onto the runtime', () => {
    const icons = { snowflake: 'M1 1h2', leaf: 'M3 3h4' };
    const runtime = composeRuntime({ ...base, icons });
    expect(runtime.icons).toEqual(icons);
  });

  it('leaves icons undefined when the adapter omits it', () => {
    const runtime = composeRuntime(base);
    expect(runtime.icons).toBeUndefined();
  });
});
