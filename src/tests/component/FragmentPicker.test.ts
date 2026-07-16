import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FragmentPicker from '../../lib/components/FragmentPicker.svelte';
import type { FragmentTarget } from '../../lib/sveltekit/content-routes-core.js';

const targets: FragmentTarget[] = [
  { id: 'welcome', title: 'Welcome banner', body: 'Welcome body.' },
  { id: 'newsletter-cta', title: 'Newsletter CTA', body: 'CTA body.' },
];

function open(fragmentTargets: FragmentTarget[] | null = targets) {
  const calls: string[] = [];
  const screen = render(FragmentPicker, { fragmentTargets, insert: (text) => calls.push(text) });
  return { screen, calls };
}

describe('FragmentPicker', () => {
  it('opens the dialog from the trigger and lists fragment titles', async () => {
    const { screen } = open();
    await screen.getByRole('button', { name: /include a fragment/i }).click();
    const dialog = screen.container.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    const text = dialog.textContent ?? '';
    expect(text).toContain('Welcome banner');
    expect(text).toContain('Newsletter CTA');
  });

  it('filters by a case-insensitive title substring', async () => {
    const { screen } = open();
    await screen.getByRole('button', { name: /include a fragment/i }).click();
    await screen.getByRole('searchbox', { name: /search fragments/i }).fill('welcome');
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toContain('Welcome banner');
    expect(text).not.toContain('Newsletter CTA');
  });

  it('inserts the exact include directive for the picked fragment and closes', async () => {
    const { screen, calls } = open();
    await screen.getByRole('button', { name: /include a fragment/i }).click();
    await screen.getByRole('button', { name: /Welcome banner/ }).click();
    expect(calls).toEqual(['::include{fragment="welcome"}']);
    await expect.poll(() => screen.container.querySelector('dialog')!.open).toBe(false);
  });

  it('shows an honest empty state naming the next step when none are published', async () => {
    const { screen } = open([]);
    await screen.getByRole('button', { name: /include a fragment/i }).click();
    expect(screen.container.querySelector('dialog')!.textContent ?? '').toMatch(/publish a fragment first/i);
  });

  it('hides the trigger and mounts no dialog when no fragments concept is declared', async () => {
    const { screen } = open(null);
    await expect.element(screen.getByRole('button', { name: /include a fragment/i })).not.toBeInTheDocument();
    expect(screen.container.querySelector('dialog')).toBeNull();
  });
});
