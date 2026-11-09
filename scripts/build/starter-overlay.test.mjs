// The starter overlay: the content every emitted template ships in place of the showcase's trail
// demo. These tests keep the demo out of the template, keep the starter pages self-contained, and
// hold the starter set to its design (each block once, a fixed list of routes). The build that
// proves each route prerenders runs in the showcase's own test run, where its dependencies exist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitTemplate, STARTER_OVERLAY_DIR } from './emit-template.mjs';
import {
  EXPECTED_STARTER_ROUTES,
  OVERLAY_CONTENT_DIR,
  SHOWCASE_CONTENT_DIR,
  directiveCounts,
  engineDirectiveNames,
  externalImageSources,
  markdownFilesUnder,
} from './starter-content.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const showcaseContent = markdownFilesUnder(SHOWCASE_CONTENT_DIR);
const overlayContent = markdownFilesUnder(OVERLAY_CONTENT_DIR);

test('the showcase keeps its fixtures', () => {
  assert.ok(showcaseContent.includes('pages/the-trail-crew.md'));
  assert.ok(showcaseContent.includes('fragments/trail-safety-notice.md'));
  assert.ok(showcaseContent.includes('posts/2026-04-05-the-reading-surface.md'));
  assert.ok(showcaseContent.filter((file) => file.startsWith('posts/')).length >= 14);
});

/**
 * Assert that a content tree holds no showcase file: a path only the showcase has must be absent,
 * and a path both have (the About page) must carry the overlay's text.
 * @param {string} dir the tree's `src/content`
 * @param {string} label what the tree is, named in a failure
 */
async function assertNoShowcaseContent(dir, label) {
  const files = markdownFilesUnder(dir);
  for (const file of showcaseContent) {
    if (!files.includes(file)) continue;
    assert.ok(overlayContent.includes(file), `${label} holds the showcase file ${file}`);
    const theirs = await readFile(path.join(dir, file), 'utf8');
    const showcase = await readFile(path.join(SHOWCASE_CONTENT_DIR, file), 'utf8');
    assert.notEqual(theirs, showcase, `${label} holds the showcase's text of ${file}`);
  }
  assert.ok(!files.some((file) => file.includes('trail')), `${label} has a file named for the trail demo`);
}

test('no showcase content is in the starter overlay or the committed template', async () => {
  await assertNoShowcaseContent(OVERLAY_CONTENT_DIR, 'the overlay');
  await assertNoShowcaseContent(path.join(repoRoot, 'templates', 'waymark', 'src', 'content'), 'templates/waymark');
});

test('an emitted template carries the overlay content and none of the showcase content', async () => {
  const to = await mkdtemp(path.join(tmpdir(), 'cairn-starter-emit-'));
  try {
    await emitTemplate({
      from: path.join(repoRoot, 'examples', 'showcase'),
      to,
      engineSpec: '^1.0.0',
      devSpec: '^1.0.0',
      starterOverlay: STARTER_OVERLAY_DIR,
    });
    const content = path.join(to, 'src', 'content');
    assert.deepEqual(markdownFilesUnder(content), overlayContent);
    await assertNoShowcaseContent(content, 'the emit');
    assert.ok(existsSync(path.join(to, 'static', 'images', 'starter-cairn.svg')));
    const manifest = JSON.parse(await readFile(path.join(content, '.cairn', 'index.json'), 'utf8'));
    assert.ok(manifest.entries.length > 0);
    assert.ok(!manifest.entries.some((entry) => entry.id.includes('trail')));
  } finally {
    await rm(to, { recursive: true, force: true });
  }
});

test('externalImageSources finds each way a page can load an image from another host', () => {
  const markdown = [
    '---',
    'image:',
    '  src: https://images.unsplash.com/photo-1?w=1200',
    '---',
    '![A path](https://images.unsplash.com/photo-2)',
    '<img src="//cdn.example.com/a.png" alt="">',
    '![Local](/images/starter-cairn.svg)',
  ].join('\n');
  assert.deepEqual(externalImageSources(markdown), [
    'https://images.unsplash.com/photo-2',
    '//cdn.example.com/a.png',
    'https://images.unsplash.com/photo-1?w=1200',
  ]);
});

test('no starter page links an image from another host', async () => {
  for (const file of overlayContent) {
    const text = await readFile(path.join(OVERLAY_CONTENT_DIR, file), 'utf8');
    assert.deepEqual(externalImageSources(text), [], `${file} loads an image from another host`);
  }
});

test('every image a starter page references ships in the overlay', async () => {
  for (const file of overlayContent) {
    const text = await readFile(path.join(OVERLAY_CONTENT_DIR, file), 'utf8');
    for (const [, src] of text.matchAll(/!\[[^\]]*\]\((\/[^)\s]+)\)/g)) {
      assert.ok(existsSync(path.join(STARTER_OVERLAY_DIR, 'static', src)), `${file} references ${src}, which the overlay lacks`);
    }
  }
});

test('directiveCounts counts a directive where it runs and skips one shown in a code fence', () => {
  const markdown = [
    ':::cta{label="a" url="https://example.com"}',
    ':::',
    '```md',
    ':::cta{label="b" url="https://example.com"}',
    '```',
    '::::callout[T]{tone="note"}',
    '::::',
    '::include{fragment="x"}',
  ].join('\n');
  const counts = directiveCounts(markdown, ['cta', 'callout', 'include', 'faq']);
  assert.deepEqual([...counts], [['cta', 1], ['callout', 1], ['include', 1], ['faq', 0]]);
});

test('each directive in the engine list appears exactly once across the starter content', async () => {
  const names = await engineDirectiveNames();
  assert.ok(names.includes('figure') && names.includes('include') && names.includes('callout'));
  const totals = new Map(names.map((name) => [name, 0]));
  for (const file of overlayContent) {
    const text = await readFile(path.join(OVERLAY_CONTENT_DIR, file), 'utf8');
    for (const [name, count] of directiveCounts(text, names)) totals.set(name, totals.get(name) + count);
  }
  for (const [name, count] of totals) assert.equal(count, 1, `the directive "${name}" appears ${count} times`);
});

test('the starter routes are the overlay manifest\'s routes, and each has a content file', async () => {
  const manifest = JSON.parse(await readFile(path.join(OVERLAY_CONTENT_DIR, '.cairn', 'index.json'), 'utf8'));
  const routed = manifest.entries.filter((entry) => entry.concept !== 'fragments');
  assert.deepEqual(
    routed.map((entry) => entry.permalink).sort(),
    EXPECTED_STARTER_ROUTES.filter((route) => route !== '/').sort(),
  );
  const files = manifest.entries.map((entry) => `${entry.concept}/${entry.id}.md`).sort();
  assert.deepEqual(files, overlayContent);
  assert.ok(routed.every((entry) => entry.draft === false));
});
