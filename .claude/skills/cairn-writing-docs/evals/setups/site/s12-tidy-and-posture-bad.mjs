// Known-bad for `S12-tidy-and-posture`: the switch and the model are right, but the 60-second
// deadline is written into the site config where nothing reads it, the posture is declared on the
// adapter with the robots route left as it was (so the served file does not change), and the
// Anthropic key is written into the Worker's committed vars.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FILES = {
  'src/theme/site.config.yaml': `siteName: Waymark
tidy:
  enabled: true
  model: claude-haiku-4-5
  timeoutMs: 60000
  conventions:
    oxfordComma: always
    smartQuotes: true
`,
  'src/theme/cairn.config.ts': `import { defineAdapter } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  aiPosture: 'decline',
});
`,
  'src/routes/robots.txt/+server.ts': `import type { RequestHandler } from './$types';
import { robotsResponse } from '@glw907/cairn-cms/delivery';
import { siteMeta } from '#chassis/content.js';

export const prerender = true;

export const GET: RequestHandler = () =>
  robotsResponse({ sitemapUrl: siteMeta.origin + '/sitemap.xml', disallow: ['/admin'] });
`,
  'wrangler.jsonc': `{
  "name": "cairn-showcase",
  "vars": {
    "PUBLIC_ORIGIN": "http://localhost:4173",
    "ANTHROPIC_API_KEY": "sk-ant-placeholder"
  }
}
`,
};

/** @param {string} root */
export default function bad(root) {
  for (const [rel, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
}
