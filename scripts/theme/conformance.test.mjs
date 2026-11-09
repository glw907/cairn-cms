import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildManifest } from './conformance/manifest.mjs';

const REPO = path.resolve(import.meta.dirname, '../..');
const SET = path.join(REPO, 'scripts/theme/conformance');
const CONTENT = path.join(SET, 'src/content');
const STATIC = path.join(SET, 'static');

/** Every file under a directory as a path relative to it, sorted; an absent directory is empty. */
async function walk(dir, base = dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, base)));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out.sort();
}

/** One markdown entry split into its frontmatter text, its top-level scalars, and its body. */
function parseEntry(raw) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  assert.ok(match, 'an entry opens with frontmatter');
  const data = {};
  for (const line of match[1].split('\n')) {
    const kv = /^([A-Za-z]+):[ ]?(.*)$/.exec(line);
    if (kv) data[kv[1]] = kv[2].trim();
  }
  return { front: match[1], data, body: match[2] };
}

/** Every entry of a concept as `{ id, raw, front, data, body }`. */
async function entries(concept) {
  const dir = path.join(CONTENT, concept);
  const files = (await walk(dir)).filter((f) => f.endsWith('.md'));
  return Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(dir, file), 'utf8');
      return { id: file.replace(/\.md$/, ''), raw, ...parseEntry(raw) };
    }),
  );
}

/** The values of a post's `topics:` block list. */
function topicsOf(entry) {
  const block = /^topics:\n((?: {2}- .*\n?)+)/m.exec(entry.front)?.[1] ?? '';
  return [...block.matchAll(/^ {2}- (.*)$/gm)].map((m) => m[1].trim());
}

const posts = await entries('posts');
const pages = await entries('pages');
const fragments = await entries('fragments');
const everything = [...posts, ...pages, ...fragments];
const page = (id) => pages.find((p) => p.id === id);

const archiveSource = await readFile(path.join(REPO, 'examples/showcase/src/chassis/archive.ts'), 'utf8');
const PAGE_SIZE = Number(/ARCHIVE_PAGE_SIZE\s*=\s*(\d+)/.exec(archiveSource)?.[1]);
const DIRECTIVES = Object.keys(
  JSON.parse(await readFile(path.join(REPO, 'examples/showcase/src/chassis/directives/classes.json'), 'utf8')),
);

/**
 * Every directive container in a body, with its name, its nesting depth, its attribute head, and the
 * text between its fences. A directive closes on the next bare fence of at least its own length.
 */
function directivesIn(body) {
  const found = [];
  const stack = [];
  for (const line of body.split('\n')) {
    const open = /^(:{3,})([a-z-]+)(.*)$/.exec(line);
    const close = /^(:{3,})\s*$/.exec(line);
    if (open) {
      const node = { name: open[2], depth: stack.length, head: open[3], inner: '' };
      found.push(node);
      stack.push({ node, colons: open[1].length });
    } else if (close && stack.length && close[1].length >= stack[stack.length - 1].colons) {
      stack.pop();
    } else {
      for (const frame of stack) frame.node.inner += `${line}\n`;
    }
  }
  return found;
}

test('the set has a README that names the routes with no content file', async () => {
  const readme = await readFile(path.join(SET, 'README.md'), 'utf8');
  for (const route of ['404', 'error', 'feed']) assert.match(readme, new RegExp(route, 'i'), route);
});

test('the set holds a manifest, site facts, and content under the mirrored layout', () => {
  for (const file of ['.cairn/index.json', '.cairn/site-facts.json']) {
    assert.ok(existsSync(path.join(CONTENT, file)), file);
  }
  assert.ok(posts.length > 0 && pages.length > 0 && fragments.length > 0);
});

test('the live posts make at least three archive pages and a last page shorter than the page size', () => {
  assert.ok(PAGE_SIZE > 0, 'the page size is read from the showcase archive module');
  const live = posts.filter((p) => p.data.draft !== 'true').length;
  assert.ok(Math.ceil(live / PAGE_SIZE) >= 3, `${live} live posts`);
  assert.ok(live % PAGE_SIZE !== 0, `${live} live posts leave a short last page`);
});

test('a page names a parent page that exists, and the parent links its child', () => {
  const child = pages.find((p) => p.data.parent);
  assert.ok(child, 'a page sets a parent');
  const parent = page(child.data.parent);
  assert.ok(parent, 'the parent page exists');
  assert.ok(parent.body.includes(`cairn:pages/${child.id}`), 'the parent links its child');
});

test('a post carries many topics', () => {
  assert.ok(posts.some((p) => topicsOf(p).length >= 8));
});

test('the set uses many distinct topics', () => {
  assert.ok(new Set(posts.flatMap(topicsOf)).size >= 15);
});

test('a post has a very long title', () => {
  assert.ok(posts.some((p) => p.data.title && p.data.title.length >= 120));
});

test('a post holds an unbroken string too long to wrap', () => {
  assert.ok(posts.some((p) => /[^\s:/()[\]]{70,}/.test(p.body)));
});

test('a post has no title', () => {
  assert.ok(posts.some((p) => !/^title:/m.test(p.front)));
});

test('a post draft stays hidden: one sets draft true', () => {
  assert.ok(posts.some((p) => p.data.draft === 'true'));
});

test('a post has no image at all', () => {
  assert.ok(posts.some((p) => !/^image:/m.test(p.front) && !/!\[|<img/.test(p.body)));
});

test('a post holds only an image', () => {
  assert.ok(posts.some((p) => /^!\[[^\]]*\]\([^)]+\)$/.test(p.body.trim())));
});

test('a post sets a hero image from the set\'s own static files', () => {
  assert.ok(posts.some((p) => /^image:/m.test(p.front) && /^ {2}src: \//m.test(p.front)));
});

test('right-to-left text appears in the set', () => {
  assert.ok(everything.some((e) => /[\u0590-\u06FF]{4,}/.test(e.body)), 'Hebrew or Arabic');
});

test('non-ASCII text outside right-to-left scripts appears in the set', () => {
  assert.ok(everything.some((e) => /[\u00C0-\u024F]/.test(e.body) && /[\u3040-\u30FF\u4E00-\u9FFF]/.test(e.body)));
});

test('a body includes a fragment, and each included fragment exists', () => {
  const included = everything.flatMap((e) => [...e.body.matchAll(/^::include\{fragment="([^"]+)"\}/gm)].map((m) => m[1]));
  assert.ok(included.length > 0, 'an include directive appears');
  assert.ok(included.every((id) => fragments.some((f) => f.id === id)), 'each included fragment exists');
});

for (const name of DIRECTIVES) {
  const all = () => everything.flatMap((e) => directivesIn(e.body)).filter((d) => d.name === name);
  test(`${name} appears empty`, () => {
    assert.ok(all().some((d) => d.inner.trim() === ''));
  });
  test(`${name} appears long`, () => {
    assert.ok(all().some((d) => d.inner.length + d.head.length >= 400));
  });
  test(`${name} appears nested inside another directive`, () => {
    assert.ok(all().some((d) => d.depth >= 1));
  });
}

const LAYER_PAGES = {
  'commonmark-blocks': [/^#{1,6} /m, /^.+\n={3,}$/m, /^(?:---|\*\*\*|___)$/m, /^ {4}\S/m, /^```/m, /^~~~/m, /^> /m, /^\d+\. /m, /^- /m, /^\[[^\]]+\]: \S+/m],
  'commonmark-inlines': [/`[^`]+`/, /\*\*[^*]+\*\*/, /(?<!\*)\*[^*\s][^*]*\*(?!\*)/, /\[[^\]]+\]\([^)]+\)/, /\[[^\]]+\]\[[^\]]+\]/, /<https?:\/\/[^>]+>/, / {2}\n/, /\\\*/, /&amp;/],
  gfm: [/^\|.+\|\n\|[ :|-]+\|/m, /^- \[[ x]\] /m, /~~[^~]+~~/, /www\.[a-z.]+/, /\[\^[^\]]+\](?!:)/, /^\[\^[^\]]+\]: /m],
  directives: [/^:::/m],
  'raw-html': [/<details>/, /<kbd>/, /<marquee>/, /stripped/i],
};
for (const [id, patterns] of Object.entries(LAYER_PAGES)) {
  test(`the ${id} layer page exists and covers its layer`, () => {
    const found = page(id);
    assert.ok(found, `pages/${id}.md exists`);
    for (const pattern of patterns) assert.match(found.body, pattern, String(pattern));
  });
}

test('the directives layer page uses every directive the showcase registers', () => {
  const used = new Set(directivesIn(page('directives')?.body ?? '').map((d) => d.name));
  for (const name of DIRECTIVES) assert.ok(used.has(name), name);
});

test('no markdown image, raw img, or raw source names a remote URL', () => {
  const remote = /^(?:https?:)?\/\//i;
  const offenders = [];
  for (const e of everything) {
    for (const m of e.raw.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g)) if (remote.test(m[1])) offenders.push(`${e.id}: ${m[1]}`);
    for (const m of e.raw.matchAll(/<(?:img|source)\b[^>]*?\b(?:src|srcset)\s*=\s*["']?\s*([^"'\s>]+)/gi)) {
      if (remote.test(m[1])) offenders.push(`${e.id}: ${m[1]}`);
    }
    for (const m of e.front.matchAll(/^\s+src:\s*(\S+)/gm)) if (remote.test(m[1])) offenders.push(`${e.id}: ${m[1]}`);
  }
  assert.deepEqual(offenders, []);
});

test('every local asset the content names is shipped under static', async () => {
  const shipped = new Set(await walk(STATIC));
  const missing = [];
  for (const e of everything) {
    const refs = [
      ...e.raw.matchAll(/!\[[^\]]*\]\(\s*<?(\/[^)\s>]+)/g),
      ...e.raw.matchAll(/\bsrc:\s*(\/\S+)/g),
      ...e.raw.matchAll(/<(?:img|source)\b[^>]*?\bsrc\s*=\s*["'](\/[^"']+)/gi),
    ];
    for (const m of refs) if (!shipped.has(m[1].replace(/^\//, ''))) missing.push(`${e.id}: ${m[1]}`);
  }
  assert.deepEqual(missing, []);
});

test('no content or asset file of the set appears under templates/ or the starter overlay', async () => {
  // The generated `.cairn/` manifest files are the one mirrored path: every content set has its own.
  const files = [
    ...(await walk(path.join(SET, 'src'))).filter((f) => !f.startsWith('content/.cairn/')).map((f) => `src/${f}`),
    ...(await walk(STATIC)).map((f) => `static/${f}`),
  ];
  assert.ok(files.length > 0);
  const homes = [path.join(REPO, 'templates'), path.join(REPO, 'scripts/build/starter-overlay')];
  const collisions = [];
  for (const home of homes) for (const f of files) if (existsSync(path.join(home, f))) collisions.push(`${path.basename(home)}/${f}`);
  assert.deepEqual(collisions, []);
});

test('the committed manifest and site facts agree with the content', async () => {
  const built = await buildManifest(CONTENT);
  for (const file of ['index.json', 'site-facts.json']) {
    const committed = await readFile(path.join(CONTENT, '.cairn', file), 'utf8');
    assert.equal(committed, built[file], `${file} is stale: run node scripts/theme/conformance/manifest.mjs`);
  }
});
