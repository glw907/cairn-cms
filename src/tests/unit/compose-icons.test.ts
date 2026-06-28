import { describe, it, expect } from 'vitest';
import { githubApp } from '../../lib/index.js';
import { composeRuntime } from '../../lib/content/compose.js';
import type { CairnAdapter } from '../../lib/content/types.js';
import { testSiteConfig } from './_content-fixture.js';

const base: CairnAdapter = {
  content: {},
  backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '1' }),
  email: { from: 'cms@example.com' },
  rendering: { render: ({ body }) => Promise.resolve(body) },
};

describe('composeRuntime icons', () => {
  it('carries the site IconSet onto the runtime', () => {
    const icons = { snowflake: 'M1 1h2', leaf: 'M3 3h4' };
    const runtime = composeRuntime({ adapter: { ...base, rendering: { ...base.rendering, icons } }, siteConfig: testSiteConfig });
    expect(runtime.icons).toEqual(icons);
  });

  it('leaves icons undefined when the adapter omits it', () => {
    const runtime = composeRuntime({ adapter: base, siteConfig: testSiteConfig });
    expect(runtime.icons).toBeUndefined();
  });
});
