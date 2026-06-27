import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FieldInput from '../../lib/components/FieldInput.svelte';
import type { NamedField } from '../../lib/content/types.js';

// The shared pass-through props a container caller threads down. The reference targets and the media
// library are empty here; these cases exercise the name-prefix and the nested image-name contracts,
// not the reference picker or an upload.
function shared() {
  return {
    targets: [],
    markFieldsDirty: () => {},
    mediaLibrary: {},
    conceptId: 'posts',
    id: '2026-05-hello',
    heroFieldRefs: {},
    onuploaded: () => {},
    onheroneedsalt: () => {},
  };
}

describe('FieldInput name-prefix contract', () => {
  it('uses the prefixed name on a leaf input and reads its value from the slice', async () => {
    const field: NamedField = { type: 'text', name: 'q', label: 'Q' };
    render(FieldInput, { field, name: 'faq.0.q', frontmatter: { q: 'hi' }, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="faq.0.q"]');
    expect(input).not.toBeNull();
    expect(input?.value).toBe('hi');
  });

  it('builds the image hidden inputs off the prefixed name (gallery.0.src)', async () => {
    const field: NamedField = { type: 'image', name: 'photo', label: 'Photo' };
    render(FieldInput, { field, name: 'gallery.0', frontmatter: {}, ...shared() });
    const src = document.querySelector('input[name="gallery.0.src"]');
    expect(src).not.toBeNull();
  });
});
