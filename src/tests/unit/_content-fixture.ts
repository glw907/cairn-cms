// A fixture adapter mirroring ecnordic's two concepts: the rich Posts form and the
// minimal Pages form. Shared across the content-model unit tests so the field shapes
// match what the editor and the validator rely on.
import type { CairnAdapter, NamedField } from '../../lib/content/types.js';
import type { Fieldset } from '../../lib/content/fieldset.js';
import type { SiteConfig } from '../../lib/nav/site-config.js';
import { fields } from '../../lib/content/fields.js';
import { fieldset } from '../../lib/content/fieldset.js';

export const postFieldset = fieldset({
  title: fields.text({ label: 'Title', required: true }),
  date: fields.date({ label: 'Date', required: true }),
  description: fields.textarea({ label: 'Description', required: true }),
  tags: fields.multiselect({ label: 'Tags', options: ['training', 'racing'] }),
  draft: fields.boolean({ label: 'Draft' }),
});

export const pageFieldset = fieldset({
  title: fields.text({ label: 'Title', required: true }),
});

/** Re-attach each fieldset record key to its descriptor as `name`, the normalized `NamedField[]`. */
function namedFields(schema: Fieldset): NamedField[] {
  return Object.entries(schema.fields).map(([name, descriptor]) => ({ name, ...descriptor }));
}

/** The normalized descriptor array a consumer iterating `ConceptDescriptor.fields` reads. */
export const postFields: NamedField[] = namedFields(postFieldset);
export const pageFields: NamedField[] = namedFields(pageFieldset);

export const testAdapter: CairnAdapter = {
  siteName: 'Test',
  content: {
    // posts omits `label` to exercise the default; pages overrides it.
    posts: {
      dir: 'src/content/posts',
      schema: postFieldset,
    },
    pages: {
      label: 'Site Pages',
      dir: 'src/content/pages',
      schema: pageFieldset,
    },
  },
  backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'noreply@test.example' },
  render: (md) => md,
};

export const testSiteConfig: SiteConfig = { siteName: 'Test' };
