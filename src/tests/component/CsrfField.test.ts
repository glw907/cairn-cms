import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CsrfField from '../../lib/components/CsrfField.svelte';

describe('CsrfField', () => {
  it('renders a hidden csrf input from the token prop', async () => {
    const screen = await render(CsrfField, { token: 'ABC' });
    const input = screen.container.querySelector('input[name="csrf"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute('type')).toBe('hidden');
    expect(input).toHaveValue('ABC');
  });

  it('renders an empty value when given no token and no context', async () => {
    const screen = await render(CsrfField, {});
    const input = screen.container.querySelector('input[name="csrf"]') as HTMLInputElement;
    expect(input).toHaveValue('');
  });

  it('survives a native form reset', async () => {
    const form = document.createElement('form');
    document.body.appendChild(form);
    const screen = await render(CsrfField, { target: form, props: { token: 'ABC' } });
    const input = form.querySelector('input[name="csrf"]') as HTMLInputElement;
    expect(input).toHaveValue('ABC');

    form.reset();

    expect(input).toHaveValue('ABC');
    await screen.unmount();
    form.remove();
  });

  // Invariant pin, not a regression proof: a hidden `<input>`'s `value`, `defaultValue`, and
  // `value` content attribute are all the same reflected state (verified in Chromium, both with
  // and without the component's own explicit `defaultValue` property assignment), so removing the
  // attribute clears all three at once and a subsequent `form.reset()` finds nothing left to
  // restore. The token does NOT survive this sequence, with or without the component's own
  // hardening; that hardening only pins the reflection explicitly (see `CsrfField`'s own doc
  // comment and docs/reference/components.md), it does not create an independent default value a
  // form-level attribute removal could still recover.
  it('does not survive an external value-attribute removal followed by a native form reset (a real limit of the defaultValue mirror, not covered by "survives a native form reset" above)', async () => {
    const form = document.createElement('form');
    document.body.appendChild(form);
    const screen = await render(CsrfField, { target: form, props: { token: 'ABC' } });
    const input = form.querySelector('input[name="csrf"]') as HTMLInputElement;
    expect(input).toHaveValue('ABC');

    input.removeAttribute('value');
    form.reset();

    expect(input).toHaveValue('');
    await screen.unmount();
    form.remove();
  });
});
