// The site's public origin lives in two files: the record `cairn-site.json`, which the build reads
// for the feed, sitemap, and canonical links, and `wrangler.jsonc`, whose `PUBLIC_ORIGIN` is the
// Worker's value at run time. This test fails when they name different hosts, so a domain change
// made in one file cannot ship without the other.
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

/**
 * Remove comments and trailing commas from JSONC text, leaving string contents alone.
 * @param text - the text of a `.jsonc` file
 * @returns the text as plain JSON
 */
function stripJsonc(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j + 1;
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
    } else if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
    } else {
      out += c;
      i++;
    }
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

test('deploy.publicOrigin in cairn-site.json equals PUBLIC_ORIGIN in wrangler.jsonc', () => {
  const record = JSON.parse(readFileSync(new URL('../../cairn-site.json', import.meta.url), 'utf8')) as {
    deploy: { publicOrigin: string };
  };
  const wrangler = JSON.parse(
    stripJsonc(readFileSync(new URL('../../wrangler.jsonc', import.meta.url), 'utf8')),
  ) as { vars?: { PUBLIC_ORIGIN?: string } };
  const recorded = record.deploy.publicOrigin;
  const running = wrangler.vars?.PUBLIC_ORIGIN;
  if (recorded !== running) {
    throw new Error(
      `deploy.publicOrigin in cairn-site.json is ${recorded}, but PUBLIC_ORIGIN in wrangler.jsonc is ${running}`,
    );
  }
  expect(recorded).toBe(running);
});
