// cairn-cms: the pieces shared by every reproduction story that mounts `EditPage`, extracted out
// of ./editor.ts (Task A5a) once ./publish.ts (Task A5b) needed the same prop bag and the same
// hydration wait for a second story. The `EditPage`-specific fixture composition lives here; each
// story module still builds its own props object beyond what `editPageProps()` returns, and every
// non-`EditPage` fixture stays in its own story module.
import type { NamedField, SiteRender } from '../../content/types.js';
import { defineRegistry, type ComponentRegistry } from '../../render/registry.js';
import type { EditData } from '../../sveltekit/content-routes-core.js';
import { fixtureConcept, fixtureEntries, fixtureSiteName, fixtureTidyReview } from '../fixtures.js';

/** The entry every `EditPage` story opens: the first fixture post, the one `fixtureDeskPathname` names. */
export const ENTRY = fixtureEntries[0]!;

/**
 * How long a settle waits for a surface CodeMirror builds. The editor arrives through dynamic
 * imports in `onMount`, and the first one on a page pays the cold start, so this is sized like the
 * engine's own editor component tests rather than like a render tick.
 */
export const SETTLE_TIMEOUT_MS = 20_000;

/**
 * Wait for a selector to appear under the mounted root, the observable condition a settle or a pose
 * waits on rather than a fixed delay.
 * @param root - the mounted story's container
 * @param selector - what the contracted surface renders as once it exists
 * @param what - the surface's name, for the failure message a capture would otherwise report as a
 * blank frame
 * @returns the matched element
 * @throws when the surface never appears
 */
export async function waitFor(root: HTMLElement, selector: string, what: string): Promise<HTMLElement> {
  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  for (;;) {
    const found = root.querySelector<HTMLElement>(selector);
    if (found) return found;
    if (Date.now() > deadline) {
      throw new Error(`cairn reproductions: ${what} ("${selector}") never appeared under the mounted story`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

/**
 * The editing surface CodeMirror replaces the server render with. Until it lands, `MarkdownEditor`
 * is a hidden input, an empty div, and a fallback textarea, so every `EditPage` story waits here
 * before a capture reads the frame.
 * @param root - the mounted story's container
 */
export async function settleEditingSurface(root: HTMLElement): Promise<void> {
  await waitFor(root, '#cairn-pane-write .cm-content', 'the editing surface');
}

/** The one sample component the fold pill and the insert palette resolve their labels through. */
export const fixtureRegistry: ComponentRegistry = defineRegistry({
  components: [
    {
      name: 'two-up',
      label: 'Two-up layout',
      description: 'Two short passages side by side.',
      use: 'Use to set two short passages beside each other.',
      build: () => ({ type: 'element', tagName: 'div', properties: {}, children: [] }),
    },
  ],
});

/** The concept's frontmatter form: the title, the Hidden toggle, and the three Details fields. */
export const fixtureFields: NamedField[] = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'draft', label: 'Hidden', type: 'boolean' },
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'tags', label: 'Tags', type: 'multiselect', taxonomy: true, options: ['trail-guide', 'gear', 'community-news'] },
  { name: 'lead', label: 'Lead picture', type: 'image', seo: true },
];

/**
 * The entry body every `EditPage` story edits.
 *
 * It carries NO media image on purpose. The preview pane builds its resolver internally from
 * `data.mediaTargets` and takes `publicPath`'s hardcoded `/media` default, which no story can reach
 * past (the audit's "Out of fix 1's reach"), so an image here would ask the docs origin for the
 * production media bucket. The page contract for these rows is the screen and its tabs, never an
 * illustrated preview, so the omission costs the stories nothing.
 */
export const FIXTURE_BODY = [
  'The north ridge trailhead is twenty minutes off the highway, and the last mile of it is gravel.',
  '',
  '## Before you go',
  '',
  'Park in the upper lot. The lower one floods through early June and the tow notices are real.',
  '',
  '- Two litres of water each, more on a warm day',
  '- A layer for the ridge, which stays windy until midsummer',
  '- Boots you have already broken in',
  '',
  'The first mile climbs steadily through spruce before the trail opens onto the bench.',
].join('\n');

/**
 * The design-accurate preview the Preview tab renders, the one thing a site brings rather than the
 * engine. This is a story fixture, not a markdown pipeline: it turns the fixture body's blocks into
 * a small styled document, so the pane shows a page rather than unstyled markup. The style rides in
 * the returned html, which the preview frame's srcdoc carries, so the frame fetches nothing.
 * A real adapter's render is the floored engine pipeline, which sanitizes; this one escapes its
 * input instead, since the pane renders whatever the mounted editor holds and that is a live
 * surface, not only the fixture body.
 * @param input - the preview call's body and entry context; only the body is read here
 * @returns the html the preview frame renders
 */
export const fixtureRender: SiteRender = async (input) => {
  const text = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const blocks = input.body
    .split('\n\n')
    .map((block) => {
      if (block.startsWith('## ')) return `<h2>${text(block.slice(3))}</h2>`;
      if (block.startsWith('- ')) {
        const items = block
          .split('\n')
          .map((line) => `<li>${text(line.replace(/^- /, ''))}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }
      return `<p>${text(block)}</p>`;
    })
    .join('');
  const style = [
    'body{font-family:Georgia,serif;line-height:1.6;padding:2rem 1.5rem}',
    'article{max-width:34rem;margin:0 auto}',
    'h2{font-size:1.4rem;line-height:1.3;margin:2rem 0 .5rem}',
    'p,ul{margin:0 0 1rem}',
  ].join('');
  return `<style>${style}</style><article>${blocks}</article>`;
};

/**
 * One `EditPage` prop bag, fresh per story so several mounted editors never share a frontmatter
 * object. The shape is a real edit load's, so the component sees exactly what an admin route hands
 * it.
 * @returns the full prop bag `EditPage` takes
 */
export function editPageProps(): Record<string, unknown> {
  const data: EditData & { siteName: string } = {
    conceptId: fixtureConcept.id,
    id: ENTRY.id,
    label: fixtureConcept.label,
    fields: fixtureFields,
    frontmatter: {
      title: ENTRY.title,
      date: ENTRY.date,
      draft: false,
      tags: ['trail-guide'],
    },
    body: FIXTURE_BODY,
    title: ENTRY.title,
    isNew: false,
    saved: false,
    renamed: false,
    // The Address group shows the date-stripped id, the way a dated concept's edit load composes
    // it, so the pictured URL cannot drift from the entry the story opens.
    slug: ENTRY.id.replace(/^\d{4}-\d{2}-\d{2}-/, ''),
    linkTargets: [],
    fragmentTargets: null,
    routable: true,
    mediaTargets: {},
    mediaLibrary: {},
    inboundLinks: [],
    pending: false,
    published: true,
    publishedFlash: false,
    publishActions: [],
    discardedFlash: false,
    // Non-null with no stylesheets: the frame links nothing (a docs page fetches no site CSS), and
    // the "preview shows unstyled markup" hint an unset knob renders stays off a reader's screen.
    preview: { stylesheets: [] },
    spellcheckDictionary: 'dictionary-en-us.txt',
    siteDictionary: [],
    tidy: { enabled: true, model: 'claude-sonnet-4-6', conventions: fixtureTidyReview.conventions },
    advisories: [],
    orphanTags: [],
    siteName: fixtureSiteName,
  };
  return {
    data,
    registry: fixtureRegistry,
    render: fixtureRender,
    form: null,
    // Fix 3: no mounted editing surface starts a spellcheck Worker or fetches its wasm and
    // dictionary, whatever the reader's own stored preference says.
    spellcheckOverride: false,
  };
}
