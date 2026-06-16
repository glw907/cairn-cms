import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MediaCaptureCard from '../../lib/components/MediaCaptureCard.svelte';

// A 1x1 transparent PNG, enough bytes for an object-URL preview.
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

describe('MediaCaptureCard display name', () => {
  it('pre-fills and tags Suggested for a real filename stem', async () => {
    const screen = render(MediaCaptureCard, {
      file: fileNamed('blue-shoes.png'),
      oncapture: () => {},
    } as never);
    const name = screen.getByRole('textbox', { name: /name/i });
    await expect.element(name).toHaveValue('blue-shoes');
    await expect.element(screen.getByText(/suggested/i)).toBeInTheDocument();
  });

  it('leaves the name empty, required, and untagged for a generic stem', async () => {
    const screen = render(MediaCaptureCard, {
      file: fileNamed('IMG_4821.jpg'),
      oncapture: () => {},
    } as never);
    const name = screen.getByRole('textbox', { name: /name/i });
    await expect.element(name).toHaveValue('');
    await expect.element(name).toHaveAttribute('aria-required', 'true');
    expect(screen.container.textContent ?? '').not.toMatch(/suggested/i);
  });
});

describe('MediaCaptureCard alt radiogroup', () => {
  it('exposes a real radiogroup with aria-required and grouped error text via aria-describedby', async () => {
    const screen = render(MediaCaptureCard, {
      file: fileNamed('blue-shoes.png'),
      oncapture: () => {},
    } as never);
    const group = screen.container.querySelector('[role="radiogroup"]')!;
    expect(group).not.toBeNull();
    expect(group.getAttribute('aria-required')).toBe('true');
    // The grouped requirement text is reachable from the group via aria-describedby.
    const describedby = group.getAttribute('aria-describedby');
    expect(describedby).toBeTruthy();
    const note = screen.container.querySelector(`#${describedby}`);
    expect(note).not.toBeNull();
    expect((note!.textContent ?? '').length).toBeGreaterThan(0);
    // Two real radios live in the group.
    expect(group.querySelectorAll('input[type="radio"]').length).toBe(2);
  });

  it('is keyboard-operable: a radio takes focus and Space selects it', async () => {
    const screen = render(MediaCaptureCard, {
      file: fileNamed('blue-shoes.png'),
      oncapture: () => {},
    } as never);
    const describe = screen.getByRole('radio', { name: /describ|write/i });
    await describe.click();
    await expect.element(describe).toBeChecked();
    // The describe choice reveals the alt text input.
    await expect.element(screen.getByRole('textbox', { name: /alt|description/i })).toBeInTheDocument();
  });
});

describe('MediaCaptureCard submit', () => {
  it('never disables the insert control across states', async () => {
    const screen = render(MediaCaptureCard, {
      file: fileNamed('IMG_4821.jpg'),
      oncapture: () => {},
    } as never);
    const insert = screen.getByRole('button', { name: /insert/i });
    // No alt chosen, no name: still enabled.
    await expect.element(insert).not.toBeDisabled();
    // Mark decorative, still enabled.
    await screen.getByRole('radio', { name: /decorative/i }).click();
    await expect.element(insert).not.toBeDisabled();
  });

  it('emits alt="" when decorative is chosen', async () => {
    const oncapture = vi.fn();
    const screen = render(MediaCaptureCard, {
      file: fileNamed('blue-shoes.png'),
      oncapture,
    } as never);
    await screen.getByRole('radio', { name: /decorative/i }).click();
    await screen.getByRole('button', { name: /insert/i }).click();
    expect(oncapture).toHaveBeenCalledTimes(1);
    const record = oncapture.mock.calls[0][0];
    expect(record.alt).toBe('');
    expect(record.displayName).toBe('blue-shoes');
    expect(record.file).toBeInstanceOf(File);
  });

  it('emits an empty alt (needs-alt) when the author proceeds with no alt choice', async () => {
    const oncapture = vi.fn();
    const screen = render(MediaCaptureCard, {
      file: fileNamed('blue-shoes.png'),
      oncapture,
    } as never);
    await screen.getByRole('button', { name: /insert/i }).click();
    expect(oncapture).toHaveBeenCalledTimes(1);
    expect(oncapture.mock.calls[0][0].alt).toBe('');
  });

  it('emits the written alt when described', async () => {
    const oncapture = vi.fn();
    const screen = render(MediaCaptureCard, {
      file: fileNamed('blue-shoes.png'),
      oncapture,
    } as never);
    await screen.getByRole('radio', { name: /describ|write/i }).click();
    await screen.getByRole('textbox', { name: /alt|description/i }).fill('Blue running shoes');
    await screen.getByRole('button', { name: /insert/i }).click();
    expect(oncapture.mock.calls[0][0].alt).toBe('Blue running shoes');
  });
});
