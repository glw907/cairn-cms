import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CsrfField from '../../lib/components/CsrfField.svelte';

describe('CsrfField', () => {
  it('renders a hidden csrf input from the token prop', () => {
    const screen = render(CsrfField, { token: 'ABC' });
    const input = screen.container.querySelector('input[name="csrf"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute('type')).toBe('hidden');
    expect(input).toHaveValue('ABC');
  });

  it('renders an empty value when given no token and no context', () => {
    const screen = render(CsrfField, {});
    const input = screen.container.querySelector('input[name="csrf"]') as HTMLInputElement;
    expect(input).toHaveValue('');
  });
});
