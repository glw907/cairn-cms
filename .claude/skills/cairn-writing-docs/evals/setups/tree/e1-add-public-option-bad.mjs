// Known-bad for `E1-add-public-option`: the member is added and wired into the SEO head, and
// nothing else. No test proves the tag, no changelog entry records the addition, and the option's
// contract is recorded nowhere a gate reads, so the public option ships undisclosed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FILES = {
  'src/lib/delivery/public-routes.ts': `export interface PublicRoutesConfig {
  origin: string;
  siteName: string;
  description: string;
  feeds?: { rss?: string; json?: string };
  defaultImage?: string;
  twitterSite?: string;
}
`,
  'src/lib/delivery/seo.ts': `export interface SeoInput {
  title: string;
  twitterSite?: string;
}

export function twitterSiteMeta(input: SeoInput) {
  return input.twitterSite ? [{ name: 'twitter:site', content: input.twitterSite }] : [];
}
`,
};

/** @param {string} root */
export default function knownBad(root) {
  for (const [path, text] of Object.entries(FILES)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
}
