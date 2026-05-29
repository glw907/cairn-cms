import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Smoke from './Smoke.svelte';

describe('component test project', () => {
  it('renders a Svelte 5 component and reacts to a click', async () => {
    const screen = render(Smoke, { label: 'clicks' });
    const button = screen.getByRole('button');
    await expect.element(button).toHaveTextContent('clicks: 0');
    await button.click();
    await expect.element(button).toHaveTextContent('clicks: 1');
  });
});
