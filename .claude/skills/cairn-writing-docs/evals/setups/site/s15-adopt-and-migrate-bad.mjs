// Known-bad for `S15-adopt-and-migrate`: cairn is wired, but the old files are copied in as they
// are and the build is made to pass instead of the entries made valid. The concept declares no
// draft or tags field, the Jekyll `layout` key and the off-shape filename come along, the winter
// post keeps the timestamp's UTC day, `validate: false` silences the failing entries, and no
// manifest is committed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FILES = {
  'vite.config.ts': `import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit({ adapter: adapter() })],
});
`,
  'src/lib/cairn.config.ts': `import { defineAdapter, defineConcept, defineFieldset, fields } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  content: {
    posts: defineConcept({
      dir: 'src/content/posts',
      label: 'Posts',
      singular: 'post',
      routing: 'feed',
      fields: defineFieldset({
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Date' }),
      }),
    }),
  },
});
`,
  'src/lib/content.ts': `import { createSiteIndexes } from '@glw907/cairn-cms/delivery';
import { cairn } from './cairn.config.js';

const posts = import.meta.glob('/src/content/posts/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const site = createSiteIndexes(cairn, {}, { posts }, { validate: false }).site;
`,
  'src/content/posts/2024-03-12-Winter_Gear Guide.md': `---
layout: post
title: "Winter gear: what to pack"
date: 2024-03-13
summary: What to carry when the trail is snowed in.
tags: [Travel Notes, Gear]
---
Pack a shell, a spare layer, and a headlamp. The short days arrive before the cold does.
`,
  'src/content/posts/2024-04-02-draft-trip.md': `---
layout: post
title: Draft trip
date: 2024-04-02
published: false
tags: [Travel Notes]
---
Notes for a trip that is not planned yet.
`,
};

/** @param {string} root */
export default function bad(root) {
  for (const [rel, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
}
