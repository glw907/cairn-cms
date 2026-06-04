import { describe, it, expect } from 'vitest';
import { composeRuntime } from '../../lib/content/compose.js';
import type { CairnAdapter } from '../../lib/content/types.js';
import { testSiteConfig } from './_content-fixture.js';

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
    const runtime = composeRuntime({ adapter: { ...base, icons }, siteConfig: testSiteConfig });
    expect(runtime.icons).toEqual(icons);
  });

  it('leaves icons undefined when the adapter omits it', () => {
    const runtime = composeRuntime({ adapter: base, siteConfig: testSiteConfig });
    expect(runtime.icons).toBeUndefined();
  });
});
