// Setup for S08-public-routes: a field-notes section is already declared, globbed, and committed
// to the manifest, so its entries have pages through the catch-all route. It has no archive page
// and no feed, and nothing links to either. One note is still a draft, so it must stay off both.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const NOTES = {
  '2026-08-02-creek-crossing.md': `---
title: Creek crossing is low
date: 2026-08-02
---
The creek below the ridge junction is ankle deep. Trail shoes are fine.
`,
  '2026-08-19-smoke-day.md': `---
title: A smoky afternoon
date: 2026-08-19
---
Haze from the north fires settled into the valley. Visibility on the upper loop was under a mile.
`,
  '2026-09-04-first-snow.md': `---
title: First snow above 6,000 feet
date: 2026-09-04
---
A dusting on the north faces this morning. Carry traction from here on.
`,
  '2026-09-10-trail-closure.md': `---
title: Upper loop closure
date: 2026-09-10
draft: true
---
Not announced yet. Hold until the district confirms the dates.
`,
};

/**
 * Replace `from` with `to` in a file, failing when `from` is absent so a drifted template is loud.
 * @param {string} root
 * @param {string} file
 * @param {string} from
 * @param {string} to
 */
function patch(root, file, from, to) {
  const path = join(root, file);
  const text = readFileSync(path, 'utf8');
  if (!text.includes(from)) throw new Error(`${file} no longer holds ${JSON.stringify(from)}`);
  writeFileSync(path, text.replace(from, to));
}

/** @param {string} root */
export default function setup(root) {
  const dir = join(root, 'src/content/notes');
  mkdirSync(dir, { recursive: true });
  for (const [name, text] of Object.entries(NOTES)) writeFileSync(join(dir, name), text);

  patch(
    root,
    'src/theme/cairn.config.ts',
    '    // The Fragments concept',
    `    notes: defineConcept({
      dir: 'src/content/notes',
      label: 'Notes',
      singular: 'note',
      routing: 'feed',
      fields: defineFieldset({
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Date' }),
      }),
    }),
    // The Fragments concept`,
  );
  patch(
    root,
    'src/chassis/content.ts',
    'const indexes =',
    `const notesRaw = import.meta.glob('/src/content/notes/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const indexes =`,
  );
  patch(root, 'src/chassis/content.ts', '  fragments: fragmentsRaw,\n', '  fragments: fragmentsRaw,\n  notes: notesRaw,\n');
  patch(root, 'src/chassis/content.ts', 'export const posts = indexes.posts;', 'export const posts = indexes.posts;\nexport const notes = indexes.notes;');
  patch(
    root,
    'vite.config.ts',
    "        fragments: '/src/content/fragments/*.md',\n",
    "        fragments: '/src/content/fragments/*.md',\n        notes: '/src/content/notes/*.md',\n",
  );
  execFileSync('npx', ['--no-install', 'cairn-manifest'], { cwd: root, stdio: 'pipe' });
}
