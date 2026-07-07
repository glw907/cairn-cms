import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import OfficeList from '../../lib/components/OfficeList.svelte';

const rows = createRawSnippet(() => ({ render: () => '<table><tbody><tr><td>a row</td></tr></tbody></table>' }));
const action = createRawSnippet(() => ({ render: () => '<button type="button">New event</button>' }));

describe('OfficeList', () => {
  it('renders the eyebrow, title, subtitle, action, and the card content', async () => {
    const screen = render(OfficeList, {
      eyebrow: 'Club',
      title: 'Events',
      subtitle: '12 upcoming',
      action,
      children: rows,
    });
    await expect.element(screen.getByText('Club')).toBeInTheDocument();
    await expect.element(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
    await expect.element(screen.getByText('12 upcoming')).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'New event' })).toBeInTheDocument();
    await expect.element(screen.getByText('a row')).toBeInTheDocument();
  });

  it('omits the eyebrow and subtitle entirely when neither is passed', async () => {
    const screen = render(OfficeList, { title: 'Events', children: rows });
    await expect.element(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
    expect(screen.container.querySelector('header p')).toBeNull();
    expect(screen.container.querySelector('header span')).toBeNull();
  });
});
