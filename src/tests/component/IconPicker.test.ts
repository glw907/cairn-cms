import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
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

  it('moves DOM focus to the newly selected radio on ArrowRight', async () => {
    // The parent owns value, so feed onChange back through rerender like ComponentForm does.
    let value = 'snowflake';
    const screen = render(IconPicker, {
      icons,
      value,
      required: true,
      onChange: (name: string) => {
        value = name;
        screen.rerender({ icons, value, required: true, onChange: () => {} });
      },
    });

    const first = screen.getByRole('radio', { name: /snowflake/i });
    await first.element().focus();
    await userEvent.keyboard('{ArrowRight}');

    const leaf = screen.getByRole('radio', { name: /leaf/i });
    await expect.element(leaf).toHaveAttribute('aria-checked', 'true');
    await expect.element(leaf).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(leaf.element());
  });

  it('selects the focused-relative neighbor, not the value-relative one, from an unselected required group', async () => {
    // Required group with no value: Tab lands on the first radio, ArrowRight must select the
    // second (focus-relative), never skip it by computing from the empty value.
    let value = '';
    const screen = render(IconPicker, {
      icons,
      value,
      required: true,
      onChange: (name: string) => {
        value = name;
        screen.rerender({ icons, value, required: true, onChange: () => {} });
      },
    });

    const first = screen.getByRole('radio', { name: /snowflake/i });
    await first.element().focus();
    await userEvent.keyboard('{ArrowRight}');

    // names = [snowflake, leaf]; from the focused first radio, ArrowRight lands on leaf.
    const leaf = screen.getByRole('radio', { name: /leaf/i });
    await expect.element(leaf).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(leaf.element());
  });

  it('uses a passed-in label as the group accessible name', async () => {
    const screen = render(IconPicker, {
      icons,
      value: '',
      required: true,
      onChange: () => {},
      label: 'Marker',
    });
    await expect.element(screen.getByRole('radiogroup', { name: 'Marker' })).toBeInTheDocument();
  });
});
