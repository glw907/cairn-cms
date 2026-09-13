import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { stringify as devalueStringify } from 'devalue';
import ShareLinkPanel from '../../lib/components/ShareLinkPanel.svelte';

function mount() {
  return render(ShareLinkPanel, {
    conceptId: 'posts',
    entryId: '2026-06-01-hello',
    csrf: () => 'csrf-tok',
    previewMint: true,
  });
}

describe('ShareLinkPanel: the busy idiom (native disabled, no guarded marker)', () => {
  it('carries native disabled on the share button while minting, and no aria-disabled', async () => {
    let resolveFetch!: (res: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const spy = vi.fn(() => pending);
    vi.stubGlobal('fetch', spy);
    try {
      const screen = await mount();
      const shareButton = () => screen.container.querySelector<HTMLButtonElement>('button.btn-ghost');
      await screen.getByRole('button', { name: /share preview link/i }).click();
      await expect.poll(() => shareButton()?.disabled).toBe(true);
      expect(shareButton()?.hasAttribute('aria-disabled')).toBe(false);
      resolveFetch({
        type: 'basic',
        status: 200,
        text: async () =>
          JSON.stringify({ type: 'success', status: 200, data: devalueStringify({ url: 'https://x/p/1', expiresAt: 0 }) }),
      } as unknown as Response);
      await expect.poll(() => shareButton()?.disabled).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('ShareLinkPanel: the Clipboard-absent copy path', () => {
  it('selects the field instead of calling a nonexistent clipboard', async () => {
    const spy = vi.fn(async () => ({
      type: 'basic',
      status: 200,
      text: async () =>
        JSON.stringify({ type: 'success', status: 200, data: devalueStringify({ url: 'https://x/p/1', expiresAt: 0 }) }),
    }) as unknown as Response);
    vi.stubGlobal('fetch', spy);
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    try {
      const screen = await mount();
      await screen.getByRole('button', { name: /share preview link/i }).click();
      await expect.poll(() => screen.container.querySelector('#cairn-preview-share-url')).not.toBeNull();
      const input = screen.container.querySelector<HTMLInputElement>('#cairn-preview-share-url')!;
      const selectSpy = vi.spyOn(input, 'select');
      await screen.getByRole('button', { name: /^copy$/i }).click();
      expect(selectSpy).toHaveBeenCalled();
    } finally {
      Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true });
      vi.unstubAllGlobals();
    }
  });
});
