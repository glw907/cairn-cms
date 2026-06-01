import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import IconPicker from '../../lib/components/IconPicker.svelte';

const icons = { snowflake: 'M10 10h20', leaf: 'M5 5h30' };

describe('IconPicker', () => {
  it('renders a radiogroup with a radio per icon and calls onChange with the picked name', async () => {
    const onChange = vi.fn();
    const screen = render(IconPicker, { icons, value: '', required: true, onChange });
    await expect.element(screen.getByRole('radiogroup')).toBeInTheDocument();
    await screen.getByRole('radio', { name: /snowflake/i }).click();
    expect(onChange).toHaveBeenCalledWith('snowflake');
  });

  it('marks the selected icon with aria-checked', async () => {
    const screen = render(IconPicker, { icons, value: 'leaf', required: true, onChange: () => {} });
    await expect.element(screen.getByRole('radio', { name: /leaf/i })).toHaveAttribute('aria-checked', 'true');
    await expect.element(screen.getByRole('radio', { name: /snowflake/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('offers a None choice only when not required', async () => {
    const onChange = vi.fn();
    const screen = render(IconPicker, { icons, value: 'leaf', required: false, onChange });
    await screen.getByRole('radio', { name: /none/i }).click();
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('omits the None choice when required', async () => {
    const screen = render(IconPicker, { icons, value: 'leaf', required: true, onChange: () => {} });
    await expect.element(screen.getByRole('radio', { name: /^none$/i })).not.toBeInTheDocument();
  });
});
