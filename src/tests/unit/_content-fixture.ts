// A fixture adapter mirroring ecnordic's two concepts: the rich Posts form and the
// minimal Pages form. Shared across the content-model unit tests so the field shapes
// match what the editor and the validator rely on.
import type { CairnAdapter, FrontmatterField } from '../../lib/content/types.js';
import type { SiteConfig } from '../../lib/nav/site-config.js';
import { defineFields } from '../../lib/content/schema.js';

export const postFields: FrontmatterField[] = [
  { type: 'text', name: 'title', label: 'Title', required: true },
  { type: 'date', name: 'date', label: 'Date', required: true },
  { type: 'textarea', name: 'description', label: 'Description', required: true },
  { type: 'tags', name: 'tags', label: 'Tags', options: ['training', 'racing'] },
  { type: 'boolean', name: 'draft', label: 'Draft' },
];

export const pageFields: FrontmatterField[] = [
  { type: 'text', name: 'title', label: 'Title', required: true },
];

export const testAdapter: CairnAdapter = {
  siteName: 'Test',
  content: {
    // posts omits `label` to exercise the default; pages overrides it.
    posts: {
      dir: 'src/content/posts',
      schema: defineFields(postFields),
    },
    pages: {
      label: 'Site Pages',
      dir: 'src/content/pages',
      schema: defineFields(pageFields),
    },
  },
  backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'noreply@test.example' },
  render: (md) => md,
};

export const testSiteConfig: SiteConfig = { siteName: 'Test' };
