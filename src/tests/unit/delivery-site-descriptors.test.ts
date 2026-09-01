import { describe, it, expect } from 'vitest';
import { githubApp } from '../../lib/index.js';
import { buildSiteDescriptors } from '../../lib/delivery/site-descriptors.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { parseSiteConfig } from '../../lib/nav/site-config.js';
import { defineFieldset } from '../../lib/content/fieldset.js';
import type { CairnAdapter } from '../../lib/content/types.js';

const adapter = {
  content: {
    posts: { dir: 'src/content/posts', fields: defineFieldset({}) },
    pages: { dir: 'src/content/pages', fields: defineFieldset({}) },
  },
  backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'a@b.test' },
  rendering: { render: ({ body }: { body: string }) => Promise.resolve(body) },
} as unknown as CairnAdapter;

const config = parseSiteConfig('siteName: Test\n');

describe('buildSiteDescriptors', () => {
  it('equals normalizeConcepts over the adapter content (URL policy now declared per concept)', () => {
    expect(buildSiteDescriptors(adapter, config)).toEqual(normalizeConcepts(adapter.content));
  });
});
