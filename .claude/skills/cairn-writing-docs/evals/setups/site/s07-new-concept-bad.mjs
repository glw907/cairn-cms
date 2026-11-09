// Known-bad for S07-new-concept: the concept is declared in the adapter, but the committed manifest
// is never regenerated, the label has no singular, and the fieldset has no check on the end date.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** @param {string} root */
export default function setup(root) {
  mkdirSync(join(root, 'src/site'), { recursive: true });
  writeFileSync(
    join(root, 'src/site/cairn.config.ts'),
    `import { defineAdapter, defineConcept, fields } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  content: {
    events: defineConcept({
      dir: 'src/content/events',
      label: 'Events',
      fields: {
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Date' }),
        endDate: fields.date({ label: 'End date' }),
        location: fields.text({ label: 'Location' }),
      },
    }),
  },
});
`,
  );
}
