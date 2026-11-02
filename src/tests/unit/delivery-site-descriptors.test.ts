import { describe, it, expect } from 'vitest';
import { createGithubApp } from '../../lib/index.js';
import { buildSiteDescriptors } from '../../lib/delivery/site-descriptors.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import type { CairnAdapter, ConceptDescriptor } from '../../lib/content/types.js';

const adapter = {
  content: {
    posts: { dir: 'src/content/posts', fields: {} },
    pages: { dir: 'src/content/pages', fields: {} },
  },
  backend: createGithubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'a@b.test' },
  rendering: { render: ({ body }: { body: string }) => Promise.resolve(body) },
} as unknown as CairnAdapter;


/**
 * Descriptors with `validate` nulled out and the schema reduced to its descriptors. Both are fresh
 * per normalize call (one binds the concept id as the field-behavior owner label, and the other is
 * built there), so the two paths agree in behavior under different function identities.
 */
const structural = (cs: ConceptDescriptor[]) => cs.map((c) => ({ ...c, validate: null, schema: c.schema.fields }));

describe('buildSiteDescriptors', () => {
  it('equals normalizeConcepts over the adapter content (URL policy now declared per concept)', () => {
    expect(structural(buildSiteDescriptors(adapter))).toEqual(structural(normalizeConcepts(adapter.content)));
  });
});
