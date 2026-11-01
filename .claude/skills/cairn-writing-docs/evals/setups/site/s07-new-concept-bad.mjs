// Known-bad for S07-new-concept: the concept is declared in the adapter and its glob is read in the
// content module, but the Vite manifest plugin never learns the concept, the committed manifest is
// never regenerated, the label has no singular, and the fieldset has no check on the end date.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** @param {string} root */
export default function setup(root) {
  mkdirSync(join(root, 'src/theme'), { recursive: true });
  mkdirSync(join(root, 'src/chassis'), { recursive: true });
  writeFileSync(
    join(root, 'src/theme/cairn.config.ts'),
    `import { defineAdapter, defineConcept, defineFieldset, fields } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  content: {
    events: defineConcept({
      dir: 'src/content/events',
      label: 'Events',
      fields: defineFieldset({
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Date' }),
        endDate: fields.date({ label: 'End date' }),
        location: fields.text({ label: 'Location' }),
      }),
    }),
  },
});
`,
  );
  writeFileSync(
    join(root, 'src/chassis/content.ts'),
    `export const eventsRaw = import.meta.glob('/src/content/events/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});
`,
  );
}
