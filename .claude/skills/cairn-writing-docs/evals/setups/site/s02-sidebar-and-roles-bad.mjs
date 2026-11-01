// Known-bad for `S02-sidebar-and-roles`: the Finance section goes into the sidebar for everyone,
// no treasurer role is declared, the access map has no rule for the route, and the screen's load
// gates nothing, so any editor sees the link and opens the page.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FILES = {
  'src/theme/cairn.config.ts': `import { defineAdapter } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  editor: {
    navLayout: [
      { label: 'Content', children: [{ screen: 'posts' }, { screen: 'pages' }] },
      {
        label: 'Finance',
        children: [{ label: 'Reports', icon: 'chart-bar', href: '/admin/finance/reports' }],
      },
    ],
  },
});
`,
  'src/routes/admin/finance/reports/+page.server.ts': `import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  return { reports: [] as string[] };
};
`,
  'src/routes/admin/finance/reports/+page.svelte': `<h1>Reports</h1>
`,
};

/** @param {string} root */
export default function bad(root) {
  for (const [rel, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
}
