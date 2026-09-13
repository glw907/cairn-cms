// Task 6: the "working" role="status" region (MediaUploadDialog.svelte:264) must mount
// unconditionally so a later upload still announces (WCAG 4.1.3), with only its content gated on
// uploadStatus.kind === 'working'.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MediaUploadDialog from '../../lib/components/MediaUploadDialog.svelte';
import * as ingest from '../../lib/components/client-ingest.js';

vi.mock('../../lib/components/client-ingest.js', async () => {
  const actual = await vi.importActual<typeof import('../../lib/components/client-ingest.js')>(
    '../../lib/components/client-ingest.js',
  );
  return { ...actual, ingestFile: vi.fn(), sendUpload: vi.fn() };
});

// A 1x1 transparent PNG, enough bytes for an object-URL preview through the upload step.
const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

beforeEach(() => {
  vi.mocked(ingest.ingestFile).mockReset();
  vi.mocked(ingest.sendUpload).mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Choose a file through the shared hidden input, opening the dialog on the capture card. */
function chooseFile(container: HTMLElement): HTMLDialogElement {
  const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([PNG_BYTES], 'meadow.png', { type: 'image/png' });
  Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  return container.querySelector('[data-testid="cairn-library-upload-dialog"]') as HTMLDialogElement;
}

describe('MediaUploadDialog: the working status region', () => {
  it('mounts before any upload happens, empty, on the capture card step', async () => {
    const screen = await render(MediaUploadDialog);
    const dialog = chooseFile(screen.container);
    await expect.poll(() => dialog.open).toBe(true);
    const status = dialog.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.textContent).toBe('');
  });

  it('fills the same region, not a second one, once the upload is working', async () => {
    let resolveIngest: (v: Awaited<ReturnType<typeof ingest.ingestFile>>) => void = () => {};
    vi.mocked(ingest.ingestFile).mockReturnValue(
      new Promise((r) => {
        resolveIngest = r;
      }),
    );
    const screen = await render(MediaUploadDialog);
    const dialog = chooseFile(screen.container);
    await expect.poll(() => dialog.open).toBe(true);

    const nameInput = dialog.querySelector('input') as HTMLInputElement;
    nameInput.value = 'Meadow';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    const submit = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.getAttribute('type') === 'submit')!;
    submit.click();

    await expect.poll(() => dialog.querySelectorAll('[role="status"]').length).toBe(1);
    await expect.poll(() => dialog.textContent ?? '').toMatch(/uploading/i);

    resolveIngest({
      blob: new Blob([PNG_BYTES], { type: 'image/png' }),
      contentType: 'image/png',
      width: 1,
      height: 1,
    });
    vi.mocked(ingest.sendUpload).mockRejectedValue(new Error('network down'));
    await expect.poll(() => dialog.querySelector('[role="alert"]')).not.toBeNull();
  });
});
