// cairn-audit's public-route-prerender rule: a public `+page.svelte` that no `prerender` export
// reaches renders on every request, which on a content site is rarely the intent. The export may
// sit in the page's own `+page.ts` or `+page.server.ts`, or in a `+layout.ts` or
// `+layout.server.ts` at or above it (a group layout covers every page beneath it). Either value
// satisfies the rule: `false` is the developer choosing request-time rendering on purpose.
//
// The check is a line-anchored text match, so an export written on one line with other code, or
// re-exported from another module, is not seen. `src/routes/admin` is the admin frame's territory
// and is never read. The finding anchors on the first node past any leading `<!-- -->` comment, so
// a `cairn-audit-disable-next-line` placed above the page's markup can apply to it.
import { lineAt } from '../../markup.js';
import type { Finding, StaticRule } from '../../types.js';

const PAGE = /\+page(@[^/]*)?\.svelte$/;
const PRERENDER_FILE = /\+(page|layout)(\.server)?\.ts$/;
const PRERENDER = /^\s*export\s+const\s+prerender\b/m;
const ROUTES = 'src/routes';
const ADMIN = `${ROUTES}/admin`;

function normalize(path: string): string {
  return path.replaceAll('\\', '/');
}

function dirOf(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash === -1 ? '' : path.slice(0, slash);
}

/** Whether `path` is under `root` as a whole path segment. */
function under(path: string, root: string): boolean {
  return path.startsWith(`${root}/`) || path.includes(`/${root}/`);
}

/** Offset of the first node past any leading whitespace and `<!-- -->` comments. */
function firstNodeStart(source: string): number {
  let i = 0;
  for (;;) {
    while (i < source.length && /\s/.test(source[i])) i++;
    if (!source.startsWith('<!--', i)) return i;
    const close = source.indexOf('-->', i + 4);
    if (close === -1) return i;
    i = close + 3;
  }
}

export const publicRoutePrerender: StaticRule = {
  id: 'public-route-prerender',
  tier: 'advisory',
  check(ctx) {
    const sources = ctx.sources ?? [];
    const declaring = new Set<string>();
    for (const file of sources) {
      const path = normalize(file.file);
      if (PRERENDER_FILE.test(path) && PRERENDER.test(file.source)) declaring.add(path);
    }
    const covered = (page: string): boolean => {
      const dir = dirOf(page);
      if (['+page.ts', '+page.server.ts'].some((name) => declaring.has(`${dir}/${name}`))) {
        return true;
      }
      // Walk from the page's directory up to the routes root, checking each layout.
      let current = dir;
      for (;;) {
        for (const name of ['+layout.ts', '+layout.server.ts']) {
          if (declaring.has(`${current}/${name}`)) return true;
        }
        if (current === '' || current === ROUTES || current.endsWith(`/${ROUTES}`)) return false;
        current = dirOf(current);
      }
    };
    const findings: Finding[] = [];
    for (const file of sources) {
      const path = normalize(file.file);
      if (!PAGE.test(path) || !under(path, ROUTES) || under(path, ADMIN)) continue;
      if (covered(path)) continue;
      const start = firstNodeStart(file.source);
      findings.push({
        ruleId: 'public-route-prerender',
        tier: 'advisory',
        file: file.file,
        line: lineAt(file.source, start),
        start,
        end: Math.min(file.source.length, start + 1),
        message:
          'this route renders on every request, since no prerender export reaches it. Add ' +
          '`export const prerender = true` to its +page.ts or a layout above it, or `false` to ' +
          'choose request-time rendering on purpose.',
      });
    }
    return findings;
  },
};
