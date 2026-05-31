// A fixture adapter mirroring ecnordic's two concepts: the rich Posts form and the
// minimal Pages form. Shared across the content-model unit tests so the field shapes
// match what the editor and the validator rely on.
import type { CairnAdapter, FrontmatterField } from '../../lib/content/types.js';

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
      fields: postFields,
      validate: (frontmatter) => ({ ok: true, data: frontmatter }),
    },
    pages: {
      label: 'Site Pages',
      dir: 'src/content/pages',
      fields: pageFields,
      validate: (frontmatter) => ({ ok: true, data: frontmatter }),
    },
  },
  backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'noreply@test.example' },
  render: (md) => md,
};
