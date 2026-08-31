import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import FieldLabel from '../../lib/admin-toolkit/FieldLabel.svelte';
import StackedFieldGrid from './_StackedFieldGrid.svelte';
import StackedCompactRow from './_StackedCompactRow.svelte';
// The stacked register's width hook lives only in the built sheet's dedicated unlayered rule, so
// this suite loads the real compiled artifact rather than the source partial the other tests here
// import.
import compiledAdminCss from '../../../dist/components/cairn-admin.css?inline';

describe('FieldLabel', () => {
  // No register prop, so this renders the 'stacked' default (design ratchet D2 item 6): the name
  // asserts only that the label text and the composed control both render, not their position.
  it('renders the label with its control', async () => {
    const control = createRawSnippet(() => ({ render: () => '<input name="x" />' }));
    const screen = await render(FieldLabel, { label: 'Instructor', children: control });
    await expect.element(screen.getByText('Instructor')).toBeInTheDocument();
    expect(screen.container.querySelector('input[name="x"]')).not.toBeNull();
  });

  // Design ratchet fix A2, item (2): the two registers used to render as separate {#if}/{:else}
  // branches, so a live register flip destroyed and recreated the label, including the composed
  // control, dropping the control's focus and any in-progress IME composition. This fails against
  // the two-branch shape (a new input element and a cleared document.activeElement) and passes
  // once FieldLabel renders one label with a conditional class list.
  it('keeps the control element and its focus across a live register flip', async () => {
    const control = createRawSnippet(() => ({ render: () => '<input name="x" />' }));
    const screen = await render(FieldLabel, { label: 'Instructor', children: control, register: 'inline' });
    const input = screen.container.querySelector('input[name="x"]') as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    await screen.rerender({ label: 'Instructor', children: control, register: 'stacked' });

    const inputAfter = screen.container.querySelector('input[name="x"]') as HTMLInputElement;
    expect(inputAfter).toBe(input);
    expect(document.activeElement).toBe(input);
    // Confirms the rerender actually applied the new register, so this test cannot pass vacuously
    // against a component that ignores the prop.
    const label = screen.container.querySelector('label')!;
    expect(label.className).toContain('cairn-field-stacked');
  });
});

// Design ratchet Task 3 (closes finding 3): the stacked register (label above control) is the
// default on FieldLabel, and its sheet hook forces a contained control to fill its grid cell
// rather than clamping to daisyUI's fixed 20rem default. This proves the register against the
// REAL compiled sheet, the same way AdminReset.test.ts proves the base layer. `TextInput` and
// `SelectInput` (both retired, the retires pass batch 1a) used to be the vehicles for this test;
// it is re-expressed here on FieldLabel plus a hand-rolled control, the composition both
// components wrapped, so the recipe stays proven independent of either component's lifetime.
describe('the stacked register', () => {
  let sheet: HTMLStyleElement;

  beforeAll(() => {
    document.documentElement.setAttribute('data-theme', 'cairn-admin');
    sheet = document.createElement('style');
    sheet.textContent = compiledAdminCss;
    document.head.appendChild(sheet);
  });

  afterAll(() => {
    document.documentElement.removeAttribute('data-theme');
    sheet.remove();
  });

  it('is the default: a bare FieldLabel renders the label above its control', async () => {
    const control = createRawSnippet(() => ({ render: () => '<input class="input input-sm" name="q" />' }));
    const screen = await render(FieldLabel, { label: 'Search', children: control });
    const label = screen.container.querySelector('label')!;
    expect(label.className).toContain('flex-col');
  });

  it('opts into the inline register explicitly', async () => {
    const control = createRawSnippet(() => ({ render: () => '<input class="input input-sm" name="q" />' }));
    const screen = await render(FieldLabel, { label: 'Search', children: control, register: 'inline' });
    const label = screen.container.querySelector('label')!;
    expect(label.className).toContain('items-center');
  });

  it('aligns two stacked controls sharing a grid column, regardless of label length, and fills the cell', async () => {
    const screen = await render(StackedFieldGrid);
    const inputs = Array.from(screen.container.querySelectorAll('input'));
    expect(inputs).toHaveLength(2);
    const [first, second] = inputs.map((el) => el.getBoundingClientRect());
    expect(first.left).toBeCloseTo(second.left, 1);
    expect(first.right).toBeCloseTo(second.right, 1);
    const column = screen.container.querySelector('.grid > div')!.getBoundingClientRect();
    expect(first.width).toBeCloseTo(column.width, 1);
    expect(first.width).toBeGreaterThan(320);
  });

  // Fix A2, item (1): the width hook's selector matched EVERY descendant control, so a
  // compact row nested inside a stacked label (two controls side by side, rather than one control
  // composing the label directly) had each control forced to `width: 100%` of the row, which
  // flex-shrink then had to fight over, instead of each control keeping daisyUI's own 20rem
  // preferred width. Scoping the hook to a direct child lets the nested row escape: with the fix,
  // both controls fit at their unshrunk ~320px default inside the harness's 900px container; with
  // the pre-fix descendant selector, the pair overflows the row and shrinks well past 400px each.
  it("lets a nested compact row keep daisyUI's default width instead of filling the label", async () => {
    const screen = await render(StackedCompactRow);
    const inputs = Array.from(screen.container.querySelectorAll('input'));
    expect(inputs).toHaveLength(2);
    for (const input of inputs) {
      const width = input.getBoundingClientRect().width;
      expect(width).toBeGreaterThan(250);
      expect(width).toBeLessThan(400);
    }
  });
});
