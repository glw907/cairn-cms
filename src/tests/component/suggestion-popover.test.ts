import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import MarkdownEditor from '../../lib/components/MarkdownEditor.svelte';
import { makeFakeWorker, COLD_START } from './fake-spell-worker.js';

describe('suggestion popover', () => {
  it('renders no built-in lint tooltip on hover (it is suppressed by tooltipFilter)', async () => {
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the', 'ten'] });
    const { container } = render(MarkdownEditor, {
      value: 'teh cat', name: 'body', spellcheck: true,
      spellcheckTest: { createWorker: fake.create, assumeReady: true },
    });
    await expect.poll(() => container.querySelector('.cm-lintRange-info'), COLD_START).toBeTruthy();
    // Hover is the stock lint tooltip's trigger (see spellcheck.test.ts). Give it the hover delay, then
    // assert the stock action buttons never appear.
    await userEvent.hover(container.querySelector('.cm-lintRange-info')!);
    await new Promise((r) => setTimeout(r, 400));
    expect(document.querySelector('.cm-diagnosticAction')).toBeNull();
    expect(container.querySelector('.cm-tooltip-lint')).toBeNull();
  });
});
