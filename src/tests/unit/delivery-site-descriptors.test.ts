import { describe, it, expect } from 'vitest';
import { siteDescriptors } from '../../lib/delivery/site-descriptors.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { parseSiteConfig } from '../../lib/nav/site-config.js';
import { fieldset } from '../../lib/content/fieldset.js';
import type { CairnAdapter } from '../../lib/content/types.js';

const adapter = {
  content: {
    posts: { dir: 'src/content/posts', fields: fieldset({}) },
    pages: { dir: 'src/content/pages', fields: fieldset({}) },
  },
  backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
  email: { from: 'a@b.test' },
  rendering: { render: (md: string) => md },
} as unknown as CairnAdapter;

const config = parseSiteConfig('siteName: Test\n');

describe('siteDescriptors', () => {
  it('equals normalizeConcepts over the adapter content (URL policy now declared per concept)', () => {
    expect(siteDescriptors(adapter, config)).toEqual(normalizeConcepts(adapter.content));
  });
});
