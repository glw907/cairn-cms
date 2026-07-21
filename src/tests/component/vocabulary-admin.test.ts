import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import VocabularyAdmin from '../../lib/components/VocabularyAdmin.svelte';
import type { VocabularyLoadData } from '../../lib/sveltekit/content-routes.js';

// SAFE_TAG_VALUE is the engine's slug shape; the screen derives the same value on add.
const SAFE_TAG_VALUE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// A two-entry vocabulary: "Snow report" is in use (8 posts), "Gear" is unused. One unlisted seed
// candidate ("Trip reports", in use on 3 posts) sits in the seed section.
function data(over: Partial<VocabularyLoadData> = {}): VocabularyLoadData {
  return {
    vocabulary: [
      { value: 'snow-report', label: 'Snow report' },
      { value: 'gear', label: 'Gear' },
    ],
    usage: { 'snow-report': 8, gear: 0 },
    unlisted: [{ value: 'trip-reports', count: 3 }],
    error: null,
    ...over,
  };
}

// The posted working copy: the hidden `vocabulary` JSON field's parsed value.
function postedVocabulary(container: Element): { value: string; label: string }[] {
  const field = container.querySelector<HTMLInputElement>('input[name="vocabulary"]')!;
  return JSON.parse(field.value);
}

describe('VocabularyAdmin', () => {
  it('renders its header through the admin toolkit, meta line carrying the lede', async () => {
    // The admin-toolkit organization pass's T7 adoption sweep: the header band renders through
    // PageHeader, not a bespoke fork; the ledger below stays its own hand-rolled grid.
    const screen = render(VocabularyAdmin, { data: data() });
    const header = screen.container.querySelector('header.mb-10');
    expect(header).not.toBeNull();
    expect(header?.textContent).toContain('A tag groups related posts.');
  });

  it('renders each entry with its label and its in-use count', async () => {
    const screen = render(VocabularyAdmin, { data: data() });
    // The labels ride editable rename inputs, named by the immutable slug so the accessible name is
    // stable mid-edit; the in-use count reads on the in-use row.
    await expect.element(screen.getByLabelText('Tag name (snow-report)')).toHaveValue('Snow report');
    await expect.element(screen.getByLabelText('Tag name (gear)')).toHaveValue('Gear');
    expect(screen.container.textContent).toContain('8 posts');
  });

  it('flows a rename into the posted vocabulary JSON (the deep bind:value path)', async () => {
    const screen = render(VocabularyAdmin, { data: data() });
    const rename = screen.container.querySelector<HTMLInputElement>(
      'input[aria-label="Tag name (gear)"]',
    )!;
    await userEvent.fill(rename, 'Equipment');
    const posted = postedVocabulary(screen.container);
    // The slug stays immutable; only the label changes, and it reaches the posted payload.
    expect(posted).toContainEqual({ value: 'gear', label: 'Equipment' });
  });

  it('guards the in-use delete with aria-disabled (not native disabled), names the count, and does not remove the row', async () => {
    const screen = render(VocabularyAdmin, { data: data() });
    const guarded = screen.container.querySelector<HTMLButtonElement>(
      'button[aria-disabled="true"][data-value="snow-report"]',
    )!;
    // Guarded, not native-disabled: AT can still reach it and learn why.
    expect(guarded).not.toBeNull();
    expect(guarded.hasAttribute('disabled')).toBe(false);
    expect(guarded.getAttribute('aria-label')).toMatch(/8/);
    // Activating it appends nothing and removes nothing: the route would reject this delete. A direct
    // native click fires the onclick (Playwright's userEvent refuses an aria-disabled target as
    // not-enabled, which is itself the guard's keyboard/pointer signal); the handler must no-op.
    guarded.click();
    expect(postedVocabulary(screen.container).map((e) => e.value)).toContain('snow-report');
  });

  it('the unused delete is enabled and removes the row from the working copy', async () => {
    const screen = render(VocabularyAdmin, { data: data() });
    const del = screen.container.querySelector<HTMLButtonElement>('button[data-value="gear"]')!;
    expect(del.getAttribute('aria-disabled')).not.toBe('true');
    await userEvent.click(del);
    expect(postedVocabulary(screen.container).map((e) => e.value)).not.toContain('gear');
  });

  it('previews a clean slug and appends it on add', async () => {
    const screen = render(VocabularyAdmin, { data: data({ vocabulary: [], usage: {}, unlisted: [] }) });
    const input = screen.container.querySelector<HTMLInputElement>('input[name="new-label"]')!;
    await userEvent.fill(input, 'Trip Reports');
    // The live preview shows the derived slug.
    expect(screen.container.textContent).toContain('trip-reports');
    await userEvent.click(screen.getByRole('button', { name: /add tag/i }));
    const posted = postedVocabulary(screen.container);
    expect(posted).toEqual([{ value: 'trip-reports', label: 'Trip Reports' }]);
    expect(posted[0].value).toMatch(SAFE_TAG_VALUE);
  });

  it('rejects a label deriving to an empty or invalid slug and appends nothing', async () => {
    const screen = render(VocabularyAdmin, { data: data({ vocabulary: [], usage: {}, unlisted: [] }) });
    const input = screen.container.querySelector<HTMLInputElement>('input[name="new-label"]')!;
    const add = screen.getByRole('button', { name: /add tag/i });
    for (const bad of ['!!!', '   ']) {
      await userEvent.fill(input, bad);
      await userEvent.click(add);
      expect(postedVocabulary(screen.container)).toEqual([]);
    }
  });

  it('rejects a second label that collides with an existing value', async () => {
    const screen = render(VocabularyAdmin, { data: data({ vocabulary: [], usage: {}, unlisted: [] }) });
    const input = screen.container.querySelector<HTMLInputElement>('input[name="new-label"]')!;
    const add = screen.getByRole('button', { name: /add tag/i });
    await userEvent.fill(input, 'Trip Reports');
    await userEvent.click(add);
    // A distinct label that derives to the same slug ("trip reports" -> trip-reports) collides.
    await userEvent.fill(input, 'trip reports');
    await userEvent.click(add);
    expect(postedVocabulary(screen.container)).toEqual([{ value: 'trip-reports', label: 'Trip Reports' }]);
  });

  it('seeds an unlisted candidate into the posted vocabulary', async () => {
    const screen = render(VocabularyAdmin, { data: data() });
    expect(postedVocabulary(screen.container).map((e) => e.value)).not.toContain('trip-reports');
    const seed = screen.container.querySelector<HTMLButtonElement>('button[data-seed="trip-reports"]')!;
    await userEvent.click(seed);
    const posted = postedVocabulary(screen.container);
    expect(posted).toContainEqual({ value: 'trip-reports', label: 'Trip reports' });
    // A seeded candidate leaves the seed section (seedCandidates shrinks).
    await expect
      .poll(() => screen.container.querySelector('button[data-seed="trip-reports"]'))
      .toBeNull();
  });

  it('posts the working copy as a hidden vocabulary JSON field with a CSRF field to ?/saveVocabulary', async () => {
    const screen = render(VocabularyAdmin, { data: data() });
    const form = screen.container.querySelector<HTMLFormElement>('form[action="?/saveVocabulary"]')!;
    expect(form).not.toBeNull();
    expect(form.getAttribute('method')?.toUpperCase()).toBe('POST');
    expect(form.querySelector('input[name="csrf"]')).not.toBeNull();
    expect(form.querySelector('input[name="vocabulary"]')).not.toBeNull();
    expect(postedVocabulary(screen.container).map((e) => e.value)).toEqual(['snow-report', 'gear']);
  });

  it('the always-present role=status region narrates a change after an add and after a seed', async () => {
    const screen = render(VocabularyAdmin, { data: data({ vocabulary: [], usage: {}, unlisted: [{ value: 'trip-reports', count: 3 }] }) });
    const live = screen.container.querySelector<HTMLElement>('[data-testid="vocab-mutation-live"]')!;
    expect(live).not.toBeNull();
    expect(live.textContent?.trim()).toBe('');
    // An add narrates.
    const input = screen.container.querySelector<HTMLInputElement>('input[name="new-label"]')!;
    await userEvent.fill(input, 'Gear');
    await userEvent.click(screen.getByRole('button', { name: /add tag/i }));
    await expect.poll(() => live.textContent).toContain('Gear');
    // A seed narrates a fresh change.
    const seed = screen.container.querySelector<HTMLButtonElement>('button[data-seed="trip-reports"]')!;
    await userEvent.click(seed);
    await expect.poll(() => live.textContent).toContain('Trip reports');
  });

  it('carries no retired muted/subtle bracket token in the rendered markup', async () => {
    const screen = render(VocabularyAdmin, { data: data() });
    expect(screen.container.innerHTML).not.toContain('var(--color-muted)');
    expect(screen.container.innerHTML).not.toContain('var(--color-subtle)');
  });

  it('surfaces a redirected error read from ?error= (a validated save refusal or an unexpected action failure)', async () => {
    const screen = render(VocabularyAdmin, { data: data({ error: 'The site config changed since you opened it.' }) });
    const alert = screen.container.querySelector('.alert-error');
    expect(alert?.textContent).toContain('The site config changed since you opened it.');
  });
});
