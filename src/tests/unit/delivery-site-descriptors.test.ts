import { describe, it, expect } from 'vitest';
import { siteDescriptors } from '../../lib/delivery/site-descriptors.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { urlPolicyFrom, parseSiteConfig } from '../../lib/nav/site-config.js';
import { fieldset } from '../../lib/content/fieldset.js';
import type { CairnAdapter } from '../../lib/content/types.js';

const adapter = {
  siteName: 'Test',
  content: {
    posts: { dir: 'src/content/posts', schema: fieldset({}) },
    pages: { dir: 'src/content/pages', schema: fieldset({}) },
  },
  backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'a@b.test' },
  render: (md: string) => md,
} as unknown as CairnAdapter;

const config = parseSiteConfig('siteName: Test\n');

describe('siteDescriptors', () => {
  it('equals normalizeConcepts over the adapter content and the config URL policy', () => {
    expect(siteDescriptors(adapter, config)).toEqual(
      normalizeConcepts(adapter.content, urlPolicyFrom(config)),
    );
  });
});
