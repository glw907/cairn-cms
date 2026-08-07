import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { test, expect, type Page } from '@playwright/test';

// The preview pass's e2e proof (spec part 3, "Public preview for a non-editor"): the whole chain,
// end to end, against the real previewMint/previewRevoke admin actions and the real previewLoad
// route, wired to the SAME fake AUTH_DB and in-memory GitHub double the rest of the showcase's e2e
// suite runs against (packages/cairn-cms-dev's handle.ts now reaches /preview/[token] as well as
// /admin and /media, and fake-auth-db.ts's dispatch table carries the preview_tokens SQL
// preview-store.ts issues).
//
// The twin-render tests (equivalence, computed style, island hydration) depend on ONE fixture the
// dev backend seeds byte-identical to the real on-disk corpus: `2026-01-15-hello.md`
// (packages/cairn-cms-dev/src/fake-github.ts's seedPreviewTwin), permalink /posts/hello. Every other
// entry these tests touch is a disposable, self-contained post created through the admin UI, the
// same isolation idiom golden-path.spec.ts uses (a unique slug per run).

const HELLO_ID = '2026-01-15-hello';
const HELLO_EDIT_PATH = `/admin/posts/${HELLO_ID}`;
const HELLO_PUBLIC_PATH = '/posts/hello';

/** The seeded body, parameterized on the one word the twin-render test edits ("first"/"initial"). */
function helloBody(word: string): string {
  return `This is the ${word} post in the cairn showcase.

See the [about page](cairn:pages/about) for more.

:::alert{role=caution}
[Heads up]

This note proves the role default reaches the build.
:::

:::banner{message="New waymarks post to the trail log every Friday." expires="2999-01-01"}
:::`;
}

/** The five headers previewLoad sets on every response, refusals and the ended page included. */
const PREVIEW_HEADERS: Record<string, string> = {
  'x-robots-tag': 'noindex, nofollow',
  'cache-control': 'private, no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
};

function assertPreviewHeaders(headers: Record<string, string>): void {
  for (const [name, value] of Object.entries(PREVIEW_HEADERS)) {
    expect(headers[name], `expected header ${name}`).toBe(value);
  }
}

/** Select every character of the CodeMirror body editor and retype it, waiting for the hidden
 *  input the form submits to catch up (the mirror-input idiom every other spec in this suite uses). */
async function setBody(page: Page, text: string): Promise<void> {
  const editor = page.locator('.cm-content');
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type(text);
  await expect(page.locator('input[name="body"]')).toHaveValue(text, { timeout: 5000 });
}

async function save(page: Page): Promise<void> {
  await page.locator('.navbar').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });
}

async function publish(page: Page): Promise<void> {
  await page.locator('.navbar').getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page).toHaveURL(/published=1/, { timeout: 10_000 });
}

/**
 * discardAction redirects to the entry's own edit page with `?discarded=1` when the file still
 * exists on main (an edit of a live entry), or straight to the concept's list when it does not (a
 * never-published entry's draft: there is nothing left to show at its own edit URL). `expectEnded`
 * selects which redirect this call site expects.
 */
async function discard(page: Page, expectEnded: boolean): Promise<void> {
  await page.locator('.navbar').getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  const dialog = page.locator('dialog[aria-labelledby="cairn-discard-dialog-title"]');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Discard', exact: true }).click();
  await expect(page).toHaveURL(expectEnded ? /discarded=1/ : /\/admin\/posts$/, { timeout: 10_000 });
}

/** Every field but the title lives behind the Details slide-over (closed by default); open it once,
 *  idempotent against a page that already has it open. */
async function openDetails(page: Page) {
  const details = page.getByRole('region', { name: 'Entry details' });
  if (!(await details.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Details', exact: true }).click();
  }
  await expect(details).toBeVisible();
  return details;
}

/** Mint a preview link from the currently-open editor and return its URL and bare token. */
async function mintPreview(page: Page): Promise<{ url: string; token: string }> {
  const details = await openDetails(page);
  await details.getByRole('button', { name: 'Share preview link' }).click();
  const urlInput = page.locator('#cairn-preview-share-url');
  await expect(urlInput).toBeVisible({ timeout: 10_000 });
  const url = await urlInput.inputValue();
  const token = new URL(url).pathname.replace(/^\/preview\//, '');
  return { url, token };
}

/** Revoke every outstanding link for the currently-open editor. */
async function revokeAll(page: Page): Promise<void> {
  const details = await openDetails(page);
  await details.getByRole('button', { name: 'Revoke all links' }).click();
  await expect(details.getByText(/Revoked \d+|No preview links to revoke/)).toBeVisible({ timeout: 10_000 });
}

/**
 * Delete a post from the list by its exact title, tolerating the row already being gone (a
 * never-published entry's own discard already removes it). Every disposable post this file creates
 * is deleted at the end of its test: the showcase's admin list is a single shared, unbounded corpus
 * across the whole e2e run (`reuseExistingServer`, one in-memory backend for the process lifetime),
 * and a spec that runs alphabetically after this one (spellcheck.spec.ts, tidy.spec.ts) assumes its
 * own seeded entry stays within the list's first page.
 */
async function deleteFromList(page: Page, title: string): Promise<void> {
  await page.goto('/admin/posts');
  const button = page.getByRole('button', { name: `Delete ${title}`, exact: true });
  if ((await button.count()) === 0) return;
  await button.click();
  await expect(page.getByRole('link', { name: title, exact: true })).toHaveCount(0);
}

/** Create a fresh, self-contained post through the admin UI, save it (a pending draft, never
 *  published), and leave the editor open on it. Returns the entry's id. */
async function createDraftPost(page: Page, opts: { slug: string; title: string; body: string }): Promise<string> {
  await page.goto('/admin/posts');
  await page.locator('header').getByRole('button', { name: 'New post' }).click();
  const createDialog = page.locator('dialog[aria-labelledby="cairn-create-dialog-title"]');
  await expect(createDialog).toBeVisible();
  await createDialog.locator('input[name="title"]').fill(opts.title);
  await createDialog.locator('input[name="slug"]').fill(opts.slug);
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/new=1/, { timeout: 10_000 });
  const id = new URL(page.url()).pathname.split('/').pop() ?? '';
  await page.locator('input[name="title"]').fill(opts.title);
  await setBody(page, opts.body);
  await save(page);
  return id;
}

/** Open the seeded twin-render fixture, apply the one-word edit, and save it. Idempotent: calling
 *  this more than once across tests just resaves the same body. */
async function ensureHelloDraft(page: Page): Promise<void> {
  await page.goto(HELLO_EDIT_PATH);
  await setBody(page, helloBody('initial'));
  await save(page);
}

/** The `<article class="prose">...</article>` fragment of a rendered page's HTML, the portion the
 *  twin-render comparison cares about (independent of `<head>` differences the preview flag adds). */
function articleFragment(html: string): string {
  const match = html.match(/<article class="prose">[\s\S]*?<\/article>/);
  expect(match, 'expected an <article class="prose"> fragment').toBeTruthy();
  return match![0];
}

test.describe('public preview for a non-editor', () => {
  test('twin-render equivalence: a minted preview equals the public page modulo the one-word edit', async ({
    page,
    request,
  }) => {
    const publicRes = await request.get(HELLO_PUBLIC_PATH);
    expect(publicRes.status()).toBe(200);
    const publicHtml = await publicRes.text();
    const publicArticle = articleFragment(publicHtml);

    await ensureHelloDraft(page);
    const { url } = await mintPreview(page);

    const previewRes = await request.get(url);
    expect(previewRes.status()).toBe(200);
    const previewHtml = await previewRes.text();
    const previewArticle = articleFragment(previewHtml);

    // "initial" appears exactly once (the one-word edit); substituting it back reproduces the
    // public article byte for byte, proving every other pixel of the render pipeline (the hero, the
    // component, the island fallback, the cairn: link, the meta line) is identical.
    expect(previewArticle.replace('initial', 'first')).toBe(publicArticle);

    // The preview page suppresses the credential-shaped emissions the guide's contract requires; the
    // public page carries all three, proving the suppression is preview-specific, not a regression.
    expect(previewHtml).not.toContain('rel="canonical"');
    expect(previewHtml).not.toMatch(/property="og:url"/);
    expect(previewHtml).not.toContain('type="text/markdown"');
    expect(publicHtml).toContain('rel="canonical"');
    expect(publicHtml).toMatch(/property="og:url"/);
    expect(publicHtml).toContain('type="text/markdown"');
  });

  test('computed style on the alert component matches between the preview and the public page', async ({ page }) => {
    await page.goto(HELLO_PUBLIC_PATH);
    const publicStyle = await page.locator('.alert.alert-caution').first().evaluate((el) => {
      const s = getComputedStyle(el);
      return { border: s.border, borderRadius: s.borderRadius, background: s.backgroundColor, padding: s.padding, color: s.color };
    });

    await ensureHelloDraft(page);
    const { url } = await mintPreview(page);
    await page.goto(url);
    const previewStyle = await page.locator('.alert.alert-caution').first().evaluate((el) => {
      const s = getComputedStyle(el);
      return { border: s.border, borderRadius: s.borderRadius, background: s.backgroundColor, padding: s.padding, color: s.color };
    });

    expect(previewStyle).toEqual(publicStyle);
  });

  test('the banner island hydrates live on the preview page', async ({ page }) => {
    await ensureHelloDraft(page);
    const { url } = await mintPreview(page);
    await page.goto(url);
    const live = page.getByTestId('banner-live');
    await expect(live).toHaveCount(1);
    await expect(live).toContainText('New waymarks post to the trail log every Friday.');
  });

  test('a minted preview never leaks an unrelated pending draft, and only carries the layout data every visitor gets', async ({
    page,
    request,
  }) => {
    const sentinel = `LEAK-SENTINEL-${Date.now()}`;
    const slug = `leak-sentinel-${Date.now()}`;
    await createDraftPost(page, { slug, title: 'Leak sentinel draft', body: sentinel });

    await ensureHelloDraft(page);
    const { url } = await mintPreview(page);
    const raw = await (await request.get(url)).text();
    expect(raw).not.toContain(sentinel);

    // The (site) group's own parent layout load runs unauthenticated on the preview route too, and
    // its data reaches the serialized page payload the same way it reaches any public page's: this
    // is the documented boundary (a site with privileged layout data branches on the route or mounts
    // preview in a sibling group), not a leak this engine plugs. Assert it reaches BOTH surfaces
    // identically, proving what an anonymous preview holder legitimately receives.
    expect(raw).toContain('cairn-showcase-site-layout');
    const publicRaw = await (await request.get(HELLO_PUBLIC_PATH)).text();
    expect(publicRaw).toContain('cairn-showcase-site-layout');

    await deleteFromList(page, 'Leak sentinel draft');
  });

  test('every preview response carries the five security headers, including refusals and the ended page', async ({
    page,
    request,
  }) => {
    await ensureHelloDraft(page);
    const { url } = await mintPreview(page);
    const success = await request.get(url);
    expect(success.status()).toBe(200);
    assertPreviewHeaders(success.headers());

    const malformed = await request.get('/preview/not-a-real-token');
    expect(malformed.status()).toBe(404);
    assertPreviewHeaders(malformed.headers());

    const unknown = await request.get(`/preview/${'A'.repeat(43)}`);
    expect(unknown.status()).toBe(404);
    assertPreviewHeaders(unknown.headers());

    const slug = `headers-ended-${Date.now()}`;
    await createDraftPost(page, { slug, title: 'Headers ended', body: 'A throwaway body for the headers check.' });
    const { url: endedUrl } = await mintPreview(page);
    await publish(page);
    const ended = await request.get(endedUrl);
    expect(ended.status()).toBe(200);
    assertPreviewHeaders(ended.headers());

    await deleteFromList(page, 'Headers ended');
  });

  test('discard distinguishes a never-published draft from a discarded edit of a live entry, and publish also ends the preview', async ({
    page,
    request,
  }) => {
    // A brand-new entry's draft, discarded before it ever published: branch_gone, a plain 404 with
    // no ended-page state (main never had the file).
    const newSlug = `discard-new-${Date.now()}`;
    await createDraftPost(page, { slug: newSlug, title: 'Discard new', body: 'Never published.' });
    const { url: newUrl } = await mintPreview(page);
    await discard(page, false);
    expect((await request.get(newUrl)).status()).toBe(404);

    // A live entry: publish first, then edit again, mint the new draft, and discard that edit. The
    // file exists on main, so the ended page renders, and its copy claims only that the preview
    // ended, never that the discarded edit went live.
    const liveSlug = `discard-live-${Date.now()}`;
    await createDraftPost(page, { slug: liveSlug, title: 'Discard live', body: 'The published body.' });
    await publish(page);
    await setBody(page, 'An edit that will be discarded.');
    await save(page);
    const { url: liveUrl } = await mintPreview(page);
    await discard(page, true);
    const afterDiscardLive = await request.get(liveUrl);
    expect(afterDiscardLive.status()).toBe(200);
    const discardHtml = await afterDiscardLive.text();
    expect(discardHtml).toContain('This preview has ended.');
    expect(discardHtml).not.toContain('went live');
    await deleteFromList(page, 'Discard live');

    // Publish (not discard) also ends the preview once the branch is gone.
    const publishedSlug = `published-ended-${Date.now()}`;
    await createDraftPost(page, { slug: publishedSlug, title: 'Published ended', body: 'A body that will publish.' });
    const { url: publishedUrl } = await mintPreview(page);
    await publish(page);
    const afterPublish = await request.get(publishedUrl);
    expect(afterPublish.status()).toBe(200);
    expect(await afterPublish.text()).toContain('This preview has ended.');
    await deleteFromList(page, 'Published ended');
  });

  test('a draft linking a target since removed renders 200 with the link marked broken, never 500', async ({
    page,
    request,
  }) => {
    // saveAction's own link guard refuses to COMMIT a body linking to a target absent from the
    // manifest at save time (a helpful typo catch for an editor), so a genuinely broken link can
    // only exist in an already-saved draft when its target existed at save time and vanished
    // afterward: publish a sibling, link a draft to it (a save that succeeds), then delete the
    // sibling. previewLoad's marking resolver, unlike the build's throwing one, must still render
    // the now-stale draft rather than 500 on it.
    const siblingSlug = `broken-link-sibling-${Date.now()}`;
    const siblingId = await createDraftPost(page, {
      slug: siblingSlug,
      title: 'Broken link sibling',
      body: 'A page that will be deleted.',
    });
    await publish(page);

    const slug = `broken-link-${Date.now()}`;
    await createDraftPost(page, {
      slug,
      title: 'Broken link draft',
      body: `See the [missing page](cairn:posts/${siblingId}) for nothing.`,
    });
    const { url } = await mintPreview(page);

    await page.goto('/admin/posts');
    await page.getByRole('button', { name: 'Delete Broken link sibling', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Broken link sibling' })).toHaveCount(0);

    const res = await request.get(url);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('cairn-broken-link');

    await deleteFromList(page, 'Broken link draft');
  });

  test('mint, revoke, fetch: the revoked link 404s', async ({ page, request }) => {
    await ensureHelloDraft(page);
    const { url } = await mintPreview(page);
    expect((await request.get(url)).status()).toBe(200);
    await revokeAll(page);
    expect((await request.get(url)).status()).toBe(404);
  });

  test('the build produced no prerendered output for /preview/[token]', () => {
    const prerenderedDir = resolve(process.cwd(), '.svelte-kit', 'output', 'prerendered');
    if (!existsSync(prerenderedDir)) return; // nothing prerendered at all is trivially compliant
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else found.push(full);
      }
    };
    walk(prerenderedDir);
    const relativePaths = found.map((f) => relative(prerenderedDir, f));
    expect(relativePaths.some((f) => /(^|[/\\])preview([/\\]|\.)/.test(f))).toBe(false);
  });
});
