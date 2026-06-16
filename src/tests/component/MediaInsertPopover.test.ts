import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import MediaInsertPopover from '../../lib/components/MediaInsertPopover.svelte';
import type { ImagePlaceholderApi } from '../../lib/components/editor-placeholder.js';
import type { MediaEntry } from '../../lib/media/manifest.js';
import type { UploadResult } from '../../lib/sveltekit/content-routes.js';
import * as ingest from '../../lib/components/client-ingest.js';
import { stringify as devalueStringify } from 'devalue';

// ESM module namespaces are not configurable in the browser pool, so the upload helpers cannot be
// spied directly. Mock the module: ingestFile and sendUpload are controllable mocks per test, while
// the pure helpers (buildUploadRequest, failureCard, ingestFailureKind) stay real so the loop maps a
// failure to its real card. buildUploadRequest must stay real, since the loop reads url/init from it.
vi.mock('../../lib/components/client-ingest.js', async () => {
  const actual = await vi.importActual<typeof import('../../lib/components/client-ingest.js')>(
    '../../lib/components/client-ingest.js',
  );
  return {
    ...actual,
    ingestFile: vi.fn(),
    sendUpload: vi.fn(),
  };
});

// A 1x1 transparent PNG, enough bytes for an object-URL preview in the capture card.
const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

function fileNamed(name: string): File {
  return new File([PNG_BYTES], name, { type: 'image/png' });
}

function record(overrides: Partial<MediaEntry> = {}): MediaEntry {
  return {
    hash: '0123456789abcdef',
    sha256: 'f'.repeat(64),
    slug: 'blue-shoes',
    displayName: 'Blue shoes',
    originalFilename: 'blue-shoes.png',
    alt: 'Blue running shoes',
    ext: 'webp',
    contentType: 'image/webp',
    bytes: 1234,
    width: 800,
    height: 600,
    createdAt: '2026-06-16T00:00:00.000Z',
    ...overrides,
  };
}

// A fake placeholder api that records the calls, so the test asserts the optimistic loop drives the
// seam (begin then resolveTo on success; cancel and never resolveTo on failure).
function fakePlaceholders() {
  const calls: { op: string; args: unknown[] }[] = [];
  let next = 1;
  const api: ImagePlaceholderApi = {
    begin(url) {
      calls.push({ op: 'begin', args: [url] });
      return next++;
    },
    progress(id, fraction) {
      calls.push({ op: 'progress', args: [id, fraction] });
    },
    resolveTo(id, alt, ref) {
      calls.push({ op: 'resolveTo', args: [id, alt, ref] });
    },
    cancel(id) {
      calls.push({ op: 'cancel', args: [id] });
    },
  };
  return { api, calls };
}

function fakeEditor(placeholders: ImagePlaceholderApi) {
  return {
    caretCoords: () => ({ left: 10, right: 12, top: 20, bottom: 36 }),
    focusEditor: vi.fn(),
    placeholders,
    insertImage: vi.fn(),
  };
}

// Serialize a SvelteKit form-action result the way the server does: the envelope is JSON, but its
// `data` field is a devalue-stringified string (deserialize runs devalue.parse on it).
function successBody(data: UploadResult): string {
  return JSON.stringify({ type: 'success', status: 200, data: devalueStringify(data) });
}
function failureBody(error: string): string {
  return JSON.stringify({ type: 'failure', status: 400, data: devalueStringify({ error }) });
}

function stubSend(body: string, type: ResponseType = 'basic', responseStatus = 200) {
  vi.mocked(ingest.sendUpload).mockResolvedValue({
    type,
    status: responseStatus,
    text: async () => body,
  } as unknown as Response);
}

// ingestFile touches createImageBitmap; stub it so the loop reaches the upload step deterministically.
function stubIngest() {
  vi.mocked(ingest.ingestFile).mockResolvedValue({
    blob: new Blob([PNG_BYTES], { type: 'image/png' }),
    contentType: 'image/png',
    width: 1,
    height: 1,
  });
}

beforeEach(() => {
  vi.mocked(ingest.ingestFile).mockReset();
  vi.mocked(ingest.sendUpload).mockReset();
});

describe('MediaInsertPopover routing', () => {
  it('open("chooser") leads with upload and shows the picker', async () => {
    const { api } = fakePlaceholders();
    const screen = render(MediaInsertPopover, {
      conceptId: 'posts',
      id: 'hello',
      library: {},
      editor: fakeEditor(api),
      onuploaded: () => {},
    } as never);
    (screen.component as unknown as { open: (s: string, f?: File) => void }).open('chooser');
    await tick();
    await expect.element(screen.getByRole('button', { name: /upload an image/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('open("capture", file) goes straight to the capture card', async () => {
    const { api } = fakePlaceholders();
    const screen = render(MediaInsertPopover, {
      conceptId: 'posts',
      id: 'hello',
      library: {},
      editor: fakeEditor(api),
      onuploaded: () => {},
    } as never);
    (screen.component as unknown as { open: (s: string, f?: File) => void }).open(
      'capture',
      fileNamed('blue-shoes.png'),
    );
    await tick();
    // The capture card's Insert image control is present, the chooser's Upload control is not.
    await expect.element(screen.getByRole('button', { name: /insert image/i })).toBeInTheDocument();
    expect(screen.container.querySelector('input[type="file"]')).toBeNull();
  });
});

describe('MediaInsertPopover focus restore', () => {
  it('restores focus to the editor on Escape', async () => {
    const { api } = fakePlaceholders();
    const editor = fakeEditor(api);
    const screen = render(MediaInsertPopover, {
      conceptId: 'posts',
      id: 'hello',
      library: {},
      editor,
      onuploaded: () => {},
    } as never);
    (screen.component as unknown as { open: (s: string) => void }).open('chooser');
    await tick();
    const panel = screen.container.querySelector('[role="dialog"]') as HTMLElement;
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await tick();
    expect(editor.focusEditor).toHaveBeenCalled();
    expect(screen.container.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe('MediaInsertPopover optimistic loop', () => {
  it('begins a placeholder then resolves it to the reference on a success envelope', async () => {
    stubIngest();
    stubSend(
      successBody({
        reference: 'media:blue-shoes.0123456789abcdef',
        record: record(),
        reused: false,
        mismatch: false,
      }),
    );
    const { api, calls } = fakePlaceholders();
    const onuploaded = vi.fn();
    const screen = render(MediaInsertPopover, {
      conceptId: 'posts',
      id: 'hello',
      library: {},
      editor: fakeEditor(api),
      onuploaded,
    } as never);
    (screen.component as unknown as { open: (s: string, f?: File) => void }).open(
      'capture',
      fileNamed('blue-shoes.png'),
    );
    await tick();
    await screen.getByRole('radio', { name: /describ|write/i }).click();
    await screen.getByRole('textbox', { name: /alt|description/i }).fill('Blue running shoes');
    await screen.getByRole('button', { name: /insert image/i }).click();
    await vi.waitFor(() => expect(calls.some((c) => c.op === 'resolveTo')).toBe(true));

    expect(calls[0].op).toBe('begin');
    const resolve = calls.find((c) => c.op === 'resolveTo')!;
    expect(resolve.args[1]).toBe('Blue running shoes');
    expect(resolve.args[2]).toBe('media:blue-shoes.0123456789abcdef');
    expect(calls.some((c) => c.op === 'cancel')).toBe(false);
    expect(onuploaded).toHaveBeenCalledTimes(1);
  });

  it('collapses a dedup reuse to "reused existing" and still resolves the reference', async () => {
    stubIngest();
    stubSend(
      successBody({
        reference: 'media:blue-shoes.0123456789abcdef',
        record: record(),
        reused: true,
        mismatch: false,
      }),
    );
    const { api, calls } = fakePlaceholders();
    const screen = render(MediaInsertPopover, {
      conceptId: 'posts',
      id: 'hello',
      library: {},
      editor: fakeEditor(api),
      onuploaded: () => {},
    } as never);
    (screen.component as unknown as { open: (s: string, f?: File) => void }).open(
      'capture',
      fileNamed('blue-shoes.png'),
    );
    await tick();
    await screen.getByRole('button', { name: /insert image/i }).click();
    await expect.element(screen.getByText(/reused an existing image/i)).toBeInTheDocument();
    expect(calls.some((c) => c.op === 'resolveTo')).toBe(true);
    expect(calls.some((c) => c.op === 'cancel')).toBe(false);
  });

  it('shows the typed card and cancels (never resolves) on a failure envelope', async () => {
    stubIngest();
    stubSend(failureBody('too-large'));
    const { api, calls } = fakePlaceholders();
    const editor = fakeEditor(api);
    const screen = render(MediaInsertPopover, {
      conceptId: 'posts',
      id: 'hello',
      library: {},
      editor,
      onuploaded: () => {},
    } as never);
    (screen.component as unknown as { open: (s: string, f?: File) => void }).open(
      'capture',
      fileNamed('blue-shoes.png'),
    );
    await tick();
    await screen.getByRole('button', { name: /insert image/i }).click();
    await expect.element(screen.getByText(/too large/i)).toBeInTheDocument();
    expect(calls.some((c) => c.op === 'cancel')).toBe(true);
    expect(calls.some((c) => c.op === 'resolveTo')).toBe(false);
    // A Retry control is offered.
    await expect.element(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    // The failure message is an assertive live region, so the transition announces (the capture-card
    // submit unmounted when the loop started).
    const failed = screen.container.querySelector('[data-testid="cairn-media-failed"]');
    expect(failed?.getAttribute('role')).toBe('alert');
    // Focus moves to the Retry button so the keyboard/SR user lands on the primary action.
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(screen.container.querySelector('[data-testid="cairn-media-failed"] .btn-primary')),
    );
  });

  it('shows the generic failed card and cancels (never resolves) on a non-envelope body', async () => {
    stubIngest();
    // An unexpected server error (a worker crash, OOM, or an edge timeout) returns an HTML error
    // page, not a devalue-encoded action result, so deserialize throws. The catch must route it
    // through the same fail() path: cancel the placeholder, show a generic card with a Retry, and
    // never insert into the source.
    stubSend('<!doctype html><html><body>500 Internal Server Error</body></html>', 'default', 500);
    const { api, calls } = fakePlaceholders();
    const onuploaded = vi.fn();
    const editor = fakeEditor(api);
    const screen = render(MediaInsertPopover, {
      conceptId: 'posts',
      id: 'hello',
      library: {},
      editor,
      onuploaded,
    } as never);
    (screen.component as unknown as { open: (s: string, f?: File) => void }).open(
      'capture',
      fileNamed('blue-shoes.png'),
    );
    await tick();
    await screen.getByRole('button', { name: /insert image/i }).click();
    await expect.element(screen.getByText(/could not be completed/i)).toBeInTheDocument();
    expect(calls.some((c) => c.op === 'cancel')).toBe(true);
    expect(calls.some((c) => c.op === 'resolveTo')).toBe(false);
    expect(editor.insertImage).not.toHaveBeenCalled();
    expect(onuploaded).not.toHaveBeenCalled();
    // A Retry control is offered.
    await expect.element(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('surfaces session-expired on a status-0 response and cancels the placeholder', async () => {
    stubIngest();
    stubSend('', 'opaqueredirect', 0);
    const { api, calls } = fakePlaceholders();
    const screen = render(MediaInsertPopover, {
      conceptId: 'posts',
      id: 'hello',
      library: {},
      editor: fakeEditor(api),
      onuploaded: () => {},
    } as never);
    (screen.component as unknown as { open: (s: string, f?: File) => void }).open(
      'capture',
      fileNamed('blue-shoes.png'),
    );
    await tick();
    await screen.getByRole('button', { name: /insert image/i }).click();
    await expect.element(screen.getByText(/session has expired/i)).toBeInTheDocument();
    expect(calls.some((c) => c.op === 'cancel')).toBe(true);
    expect(calls.some((c) => c.op === 'resolveTo')).toBe(false);
  });
});

describe('MediaInsertPopover picker path', () => {
  it('inserts a picked reference directly without an upload', async () => {
    const { api } = fakePlaceholders();
    const editor = fakeEditor(api);
    const screen = render(MediaInsertPopover, {
      conceptId: 'posts',
      id: 'hello',
      library: {
        '0123456789abcdef': {
          hash: '0123456789abcdef',
          slug: 'blue-shoes',
          ext: 'webp',
          contentType: 'image/webp',
          displayName: 'Blue shoes',
          alt: 'Blue running shoes',
          width: 800,
          height: 600,
          bytes: 1234,
        },
      },
      editor,
      onuploaded: () => {},
    } as never);
    (screen.component as unknown as { open: (s: string) => void }).open('chooser');
    await tick();
    await screen.getByRole('option', { name: /blue shoes/i }).click();
    expect(editor.insertImage).toHaveBeenCalledWith('Blue running shoes', 'media:blue-shoes.0123456789abcdef');
    expect(ingest.sendUpload).not.toHaveBeenCalled();
  });
});
