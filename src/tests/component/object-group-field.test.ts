import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ObjectGroupField from '../../lib/components/ObjectGroupField.svelte';
import type { NamedField } from '../../lib/content/types.js';
import type { ObjectField } from '../../lib/content/fields.js';

// The shared pass-through props a container caller threads down; the media and reference props are
// empty here because these cases exercise the nested-name wiring, not the picker or an upload.
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

describe('ObjectGroupField', () => {
  it('renders each leaf under a dotted nested name and reads its value from the slice', async () => {
    const field = {
      type: 'object',
      name: 'meta',
      label: 'Meta',
      fields: { note: { type: 'text', label: 'Note' } },
    } as NamedField & ObjectField;
    render(ObjectGroupField, { field, name: 'meta', frontmatter: { note: 'hi' }, ...shared() });
    const input = document.querySelector<HTMLInputElement>('input[name="meta.note"]');
    expect(input).not.toBeNull();
    expect(input?.value).toBe('hi');
  });

  it('falls back to a humanized legend when the object carries no label', async () => {
    const field = {
      type: 'object',
      name: 'social_card',
      fields: { handle: { type: 'text', label: 'Handle' } },
    } as NamedField & ObjectField;
    render(ObjectGroupField, { field, name: 'social_card', frontmatter: {}, ...shared() });
    const legend = document.querySelector<HTMLElement>('legend')!;
    await expect.element(legend).toHaveTextContent('Social card');
  });
});
