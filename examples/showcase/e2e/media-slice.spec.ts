import { test, expect } from '@playwright/test';
import { parse as devalueParse } from 'devalue';

// The media Phase 2a vertical slice, end to end against the running showcase with the fake R2
// double on platform.env (hooks.server.ts) and the fake-github double recording commits. It proves
// the three legs Task 10 owns:
//
//   1. Ingest: the upload action stores a PNG under the fake R2 bucket and returns a `media:`
//      reference and a server-owned record, committing nothing to git.
//   2. Render: overlaying that record into a makeMediaResolver and rendering the inserted `media:`
//      reference through the site's own adapter render rewrites it to its delivery `/media/...`
//      path (the leg the /test/render-media fixture exercises).
//   3. Save: saving the entry with the body and the optimistic record commits the body and a
//      media.json carrying the row in one commit on the entry's branch.
//
// The delivery route's workerd behavior (304/206/headers) is proven by the engine integration
// suite (Task 4), not re-proven here.
//
// NOTE on the upload transport: the upload action is wired as a SvelteKit form action
// (admin.actions.upload). SvelteKit's action gate rejects a POST whose content-type is not a form
// content-type with a 415 before the action runs, so the body rides as `text/plain` (a CORS-safe
// form content-type the engine sniffs the real type from regardless of the declared one). This is
// the same transport the shipped client helper's buildUploadRequest sends. The showcase installs the
// fake-backend hook, not createAuthGuard, so this E2E proves the action+render+save legs; the
// guard's header-CSRF path is proven in the engine's auth-guard integration test.

// The server-owned MediaEntry the upload action returns and the save re-posts. The save's
// parseMediaEntries re-validates every field, so the whole record must survive the round trip.
interface MediaRecord {
  hash: string;
  sha256: string;
  slug: string;
  displayName: string;
  originalFilename: string;
  alt: string;
  ext: string;
  contentType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

// The seeded post on main.
const SEED = '2026-06-hello';

// The minimal valid PNG the engine integration suite uses: the 8-byte PNG signature plus four
// zero bytes. sniffMediaType reads only the magic, so this is enough to pass the type gate.
const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];

test('the media slice: upload stores and returns a reference, the record renders an <img>, and saving commits media.json', async ({ page, request }) => {
  await page.goto('/admin/posts');
  await page.locator(`a[href="/admin/posts/${SEED}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/admin/posts/${SEED}$`));

  // The edit page renders the double-submit token in the save form's hidden csrf field; the upload
  // action reads it back from the X-Cairn-CSRF header.
  const csrf = await page.locator('input[name="csrf"]').first().inputValue();
  expect(csrf).not.toBe('');

  // 1. Ingest. POST the raw PNG bytes to the upload action from the page context, so the request
  //    carries a same-origin Origin header and the session cookie. The page context returns the raw
  //    SvelteKit action envelope; the Node test context parses the devalue-encoded `data` field with
  //    the real devalue parser (a hand-rolled walker mis-reads a small integer field as an index).
  const uploadEnvelope = await page.evaluate(
    async ({ id, bytes, token }) => {
      const res = await fetch(`/admin/posts/${id}?/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'X-Cairn-CSRF': token,
          'X-Cairn-Filename': encodeURIComponent('seaside.png'),
          'X-Cairn-Alt': encodeURIComponent('A quiet shore'),
        },
        body: new Uint8Array(bytes),
      });
      // The SvelteKit action result envelope: { type, status, data } where data is a
      // devalue-stringified payload. Hand it back whole for the Node-side devalue parse.
      const payload = (await res.json()) as { type: string; data: string };
      return { status: res.status, type: payload.type, data: payload.data };
    },
    { id: SEED, bytes: PNG_BYTES, token: csrf },
  );

  expect(uploadEnvelope.status).toBe(200);
  expect(uploadEnvelope.type).toBe('success');
  const { reference, record } = devalueParse(uploadEnvelope.data) as {
    reference: string;
    record: MediaRecord;
  };
  // The reference is the canonical media: token over the server-derived slug and content hash.
  expect(reference).toMatch(/^media:seaside\.[0-9a-f]{16}$/);
  expect(record.slug).toBe('seaside');
  expect(record.ext).toBe('png');
  expect(record.contentType).toBe('image/png');
  expect(record.alt).toBe('A quiet shore');

  // 2. Render. Overlay the record into a fresh resolver and render a body that inserts the
  //    reference, through the site's own adapter render. The image src rewrites to the delivery
  //    path: <base>/<slug>.<hash>.<ext> under /media.
  const body = `An inline image: ![${record.alt}](${reference})\n`;
  const renderRes = await request.post('/test/render-media', { data: { body, record } });
  expect(renderRes.ok()).toBeTruthy();
  const { html } = (await renderRes.json()) as { html: string };
  const expectedSrc = `/media/${record.slug}.${record.hash}.${record.ext}`;
  expect(html).toContain('<img');
  expect(html).toContain(`src="${expectedSrc}"`);

  // 3. Save. Submit the editor form with the body and the optimistic record in the `media` field;
  //    the save commits the body and a media.json with the row in one commit on the entry's branch.
  await page.evaluate(
    async ({ id, token, bodyText, mediaJson }) => {
      const form = new FormData();
      form.set('csrf', token);
      form.set('title', 'Hello');
      form.set('date', '2026-06-01');
      form.set('body', bodyText);
      form.set('media', mediaJson);
      // Same-origin form POST: SvelteKit's action gate accepts the form content-type and the
      // origin check passes. redirect: 'manual' so the 303 to ?saved=1 does not navigate the page.
      await fetch(`/admin/posts/${id}?/save`, { method: 'POST', body: form, redirect: 'manual' });
    },
    { id: SEED, token: csrf, bodyText: body, mediaJson: JSON.stringify([record]) },
  );

  // The fake-github double records the .md commit on the entry's pending branch.
  const commit = await (await request.get('/test/last-commit')).json();
  expect(commit.branch).toBe(`cairn/posts/${SEED}`);
  expect(commit.path).toBe(`src/content/posts/${SEED}.md`);
  expect(commit.content).toContain(reference);

  // The media.json committed in the same commit carries the uploaded row, keyed by its hash.
  const mediaFile = await request.get(
    `/test/branch-file?branch=${encodeURIComponent(`cairn/posts/${SEED}`)}&path=${encodeURIComponent('src/content/.cairn/media.json')}`,
  );
  expect(mediaFile.ok()).toBeTruthy();
  const { content } = (await mediaFile.json()) as { content: string };
  const manifest = JSON.parse(content) as Record<string, { slug: string; ext: string }>;
  expect(manifest[record.hash]).toBeTruthy();
  expect(manifest[record.hash].slug).toBe('seaside');
  expect(manifest[record.hash].ext).toBe('png');
});
