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
});
