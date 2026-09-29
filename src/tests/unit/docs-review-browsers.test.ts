import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, firefox, type Browser, type Page } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { embedBatch } from '../../../scripts/docs-review/embed.mjs';

// The review page runs in the owner's own browser, and Firefox is the one the owner opens it in,
// so every control is clicked here in real Firefox (and in Chromium, for parity), with a
// `window.claude` stub shaped to the Artifact runtime contract: `use()` answers on a later task,
// never during the page's first synchronous run, with a frozen namespace or `null`. A control
// that works only in Chromium, or that goes quiet when a capability is missing, fails here.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const TEMPLATE_SOURCE = readFileSync(join(ROOT, 'scripts/docs-review/template.html'), 'utf8');
const RUNTIME_SOURCE = readFileSync(join(ROOT, 'scripts/docs-review/runtime.mjs'), 'utf8');

const FILES = [
  { path: 'docs/a.md', markdown: '# Alpha\n\nfirst file body\n' },
  { path: 'docs/b.md', markdown: '# Beta\n\nsecond file body\n' },
];

// The document skeleton the Artifact tool wraps a published page in, reset included.
const SKELETON_OPEN =
  '<!doctype html><html><head><meta charset=utf8><meta name=viewport ' +
  'content="width=device-width,initial-scale=1,viewport-fit=cover"><style>' +
  ':root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);' +
  'padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px -apple-system,' +
  'BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#fafafa}img{max-width:100%}' +
  '[hidden]{display:none!important}</style></head><body>';
const PAGE_HTML =
  SKELETON_OPEN +
  embedBatch(TEMPLATE_SOURCE, RUNTIME_SOURCE, { title: 'Docs review', files: FILES }) +
  '</body></html>';
const PAGE_URL = 'https://review.test/';

interface StubOptions {
  /** No `window.claude` at all, as in a copy of the page opened outside the viewer. */
  absent?: boolean;
  /** `use('artifact')` resolves `null`. */
  noArtifact?: boolean;
  /** `use('comments')` resolves `null`. */
  noComments?: boolean;
  /** How long `use()` takes to answer. */
  delayMs?: number;
  /** `publish` rejects with this error code. */
  publishRejects?: string;
  /** `openComposer` soft-refuses with `{ opened: false }`. */
  composerRefuses?: boolean;
}

interface RecordedCall {
  verb: string;
  html?: string;
  path?: string;
}

/** Installs the stub before any page script runs; every capability call lands on `__calls`. */
function installStub(opts: StubOptions): void {
  const w = window as unknown as { __calls: RecordedCall[]; __answered: number; claude?: unknown };
  w.__calls = [];
  w.__answered = 0;
  if (opts.absent) return;
  const artifact = Object.freeze({
    publish(html: string) {
      w.__calls.push({ verb: 'publish', html });
      return opts.publishRejects
        ? Promise.reject({ code: opts.publishRejects, message: opts.publishRejects })
        : Promise.resolve({ version: 'v2' });
    },
  });
  const comments = Object.freeze({
    openComposer(target: { element: Element }) {
      const heading = target.element.querySelector('h2');
      w.__calls.push({ verb: 'openComposer', path: heading ? heading.textContent ?? '' : '' });
      return Promise.resolve({ opened: !opts.composerRefuses });
    },
    anchorFor() {
      return Promise.resolve({ path: '', x: 0, y: 0 });
    },
  });
  const served: Record<string, unknown> = {
    artifact: opts.noArtifact ? null : artifact,
    comments: opts.noComments ? null : comments,
  };
  w.claude = Object.freeze({
    use(name: string) {
      return new Promise((done) =>
        setTimeout(() => {
          w.__answered += 1;
          done(served[name] ?? null);
        }, opts.delayMs ?? 20),
      );
    },
  });
}

const BROWSERS = { firefox, chromium } as const;

describe.each(['firefox', 'chromium'] as const)('docs-review page in %s', (browserName) => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await BROWSERS[browserName].launch();
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
  });

  /** Opens the page with the given stub; `errors` collects every uncaught page error. */
  async function openPage(opts: StubOptions): Promise<{ page: Page; errors: string[] }> {
    const page = await browser.newPage();
    // A control that goes quiet fails its wait in seconds, well inside the test timeout.
    page.setDefaultTimeout(5_000);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.route(PAGE_URL, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: PAGE_HTML }),
    );
    await page.addInitScript(installStub, opts);
    await page.goto(PAGE_URL);
    return { page, errors };
  }

  async function calls(page: Page): Promise<RecordedCall[]> {
    return page.evaluate(() => (window as unknown as { __calls: RecordedCall[] }).__calls);
  }

  /** Waits until the page's status line is showing and its text matches `pattern`. */
  async function statusMatching(page: Page, pattern: RegExp): Promise<string> {
    const status = page.locator('#cairn-docs-review-banner');
    await page.waitForFunction(
      ([source, flags]) => {
        const el = document.getElementById('cairn-docs-review-banner');
        return !!el && !el.hidden && new RegExp(source, flags).test(el.textContent ?? '');
      },
      [pattern.source, pattern.flags] as const,
    );
    return (await status.textContent()) ?? '';
  }

  function section(page: Page, index: number) {
    return page.locator('.doc-file').nth(index);
  }

  it('toggles each file into edit mode and back, then saves every edit and comments on each file', async () => {
    const { page, errors } = await openPage({});
    await page.waitForFunction(() => document.querySelectorAll('.doc-file').length === 2);

    for (const [index, file] of FILES.entries()) {
      const doc = section(page, index);
      const edit = doc.locator('[data-action="edit"]');
      await edit.click();
      await expect(doc.locator('.doc-file-editor').isVisible()).resolves.toBe(true);
      await expect(doc.locator('.doc-file-preview').isVisible()).resolves.toBe(false);
      expect(await edit.textContent()).toBe('Preview');

      await doc.locator('.doc-file-editor').fill(`# Edited ${file.path}\n\nnew body\n`);
      await edit.click();
      await expect(doc.locator('.doc-file-preview').isVisible()).resolves.toBe(true);
      expect(await doc.locator('.doc-file-preview h1').textContent()).toBe(`Edited ${file.path}`);
      expect(await edit.textContent()).toBe('Edit');
    }

    await page.locator('#cairn-docs-review-save').click();
    await statusMatching(page, /saved/i);
    const publishes = (await calls(page)).filter((call) => call.verb === 'publish');
    expect(publishes).toHaveLength(1);
    expect(publishes[0]!.html!.startsWith('<!doctype html>')).toBe(true);
    for (const file of FILES) expect(publishes[0]!.html).toContain(`# Edited ${file.path}`);

    for (const index of FILES.keys()) {
      await section(page, index).locator('[data-action="comment"]').click();
    }
    await page.waitForFunction(
      () =>
        (window as unknown as { __calls: RecordedCall[] }).__calls.filter(
          (call) => call.verb === 'openComposer',
        ).length === 2,
    );
    const composers = (await calls(page)).filter((call) => call.verb === 'openComposer');
    expect(composers.map((call) => call.path)).toEqual(FILES.map((file) => file.path));
    expect(errors).toEqual([]);
  });

  it('waits for a capability still resolving when a control is clicked early, instead of ignoring the click', async () => {
    const { page, errors } = await openPage({ delayMs: 1_500 });
    await page.waitForFunction(() => document.querySelectorAll('.doc-file').length === 2);
    await page.locator('#cairn-docs-review-save').click();
    await section(page, 0).locator('[data-action="comment"]').click();
    await statusMatching(page, /connecting/i);
    await page.waitForFunction(
      () => (window as unknown as { __calls: RecordedCall[] }).__calls.length === 2,
    );
    const verbs = (await calls(page)).map((call) => call.verb).sort();
    expect(verbs).toEqual(['openComposer', 'publish']);
    expect(errors).toEqual([]);
  });

  it('says so when the shell refuses a save or does not open the comment box', async () => {
    const { page, errors } = await openPage({ publishRejects: 'upstream_error', composerRefuses: true });
    await page.waitForFunction(() => document.querySelectorAll('.doc-file').length === 2);

    await page.locator('#cairn-docs-review-save').click();
    expect(await statusMatching(page, /did not go through/i)).toContain('upstream_error');
    await expect(page.locator('#cairn-docs-review-save').isDisabled()).resolves.toBe(false);

    await section(page, 1).locator('[data-action="comment"]').click();
    await statusMatching(page, /comment box did not open/i);
    expect(errors).toEqual([]);
  });

  for (const [label, opts] of [
    ['use() resolves null', { noArtifact: true, noComments: true }],
    ['no window.claude exists', { absent: true }],
  ] as const) {
    it(`disables save, edit, and comment and says why when ${label}`, async () => {
      const { page, errors } = await openPage(opts);
      // Both lookups have settled once every Save, Edit, and Comment control is off.
      await page.waitForFunction(
        () => Array.from(document.querySelectorAll('button')).every((button) => button.disabled),
      );
      const text = await statusMatching(page, /unavailable/i);
      expect(text).toMatch(/sav/i);
      expect(text).toMatch(/comment/i);
      await expect(page.locator('#cairn-docs-review-save').isDisabled()).resolves.toBe(true);
      for (const index of FILES.keys()) {
        await expect(section(page, index).locator('[data-action="edit"]').isDisabled()).resolves.toBe(true);
        await expect(section(page, index).locator('[data-action="comment"]').isDisabled()).resolves.toBe(true);
      }
      expect(await calls(page)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  it('keeps commenting live and says saving is unavailable when only the artifact capability is missing', async () => {
    const { page, errors } = await openPage({ noArtifact: true });
    // Both use() calls have answered, so the status line is final before it is read.
    await page.waitForFunction(
      () => (window as unknown as { __answered: number }).__answered === 2,
    );
    const text = await statusMatching(page, /unavailable/i);
    expect(text).toMatch(/sav/i);
    expect(text).not.toMatch(/comment/i);
    await expect(page.locator('#cairn-docs-review-save').isDisabled()).resolves.toBe(true);
    await section(page, 0).locator('[data-action="comment"]').click();
    await page.waitForFunction(
      () => (window as unknown as { __calls: RecordedCall[] }).__calls.length === 1,
    );
    expect((await calls(page))[0]!.verb).toBe('openComposer');
    expect(errors).toEqual([]);
  });
});
