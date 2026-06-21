// Regression guard for editor-preference isolation between component tests.
//
// The editor keeps per-browser preferences (zen, focus mode, typewriter, surface posture, preview
// device) in localStorage. The component project runs the whole suite in one browser on one origin,
// so without isolation a value one test writes leaks into every later test and across files. zen is
// load-bearing: EditPage gates its toolbar behind `{#if !zen}`, so a leaked zen=true makes a later
// EditPage render come up with no toolbar. That was an order- and timing-dependent CI failure on the
// CairnAdmin edit view and EditPage-insert (the toolbar/insert button never appeared, matcher timed
// out), green locally where the file order happened to be benign. The fix is `localStorage.clear()`
// in the component setup file's beforeEach; this test fails if that isolation is removed.
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EditPage from './EditPageDesk.svelte';
import type { FrontmatterField } from '../../lib/content/types.js';
import type { LinkTarget } from '../../lib/content/manifest.js';

function postProps() {
  return {
    data: {
      conceptId: 'posts',
      id: '2026-05-hello',
      label: 'Posts',
      fields: [{ type: 'text', name: 'title', label: 'Title', required: true }] satisfies FrontmatterField[],
      frontmatter: { title: 'Hello', date: '2026-05-01', draft: false },
      body: 'The body.',
      title: 'Hello',
      isNew: false,
      saved: false,
      renamed: false,
      error: null,
      slug: 'hello',
      linkTargets: [] as LinkTarget[],
      mediaTargets: {},
      mediaLibrary: {},
      inboundLinks: [],
      pending: false,
      published: true,
      publishedFlash: false,
      discardedFlash: false,
      preview: null,
      spellcheckDictionary: 'dictionary-en-us.txt',
      siteDictionary: [],
      tidy: { enabled: false, model: 'claude-sonnet-4-6', conventions: { fixes: true, enDashRanges: false, smartQuotes: false, brandCaps: false } },
      siteName: 'Test Site',
    },
    registry: undefined,
  };
}

describe('editor preference isolation', () => {
  it('leaves zen enabled in localStorage (the pollution a prior test can cause)', () => {
    localStorage.setItem('cairn-editor-zen', 'true');
  });

  it('renders the next EditPage with its toolbar, because localStorage is cleared between tests', async () => {
    const screen = render(EditPage, postProps());
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    expect(screen.container.querySelector('[role="toolbar"]')).not.toBeNull();
  });
});
