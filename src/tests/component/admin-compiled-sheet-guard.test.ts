// cairn-cms: guards the component project's redirect of the source admin partial to the compiled
// sheet (the `compiledAdminSheet` plugin in vitest.config.ts). The source partial is not
// browser-ready: its daisyUI theme variables live in `@plugin "daisyui/theme"` blocks a browser
// drops, and it declares `utilities.cairn-idiom` ahead of `utilities.daisyui`, which would
// reverse the sublayer pin if it loaded beside the compiled sheet. This file injects no sheet of
// its own, so everything it reads comes through CairnAdminShell's own `./cairn-admin.css` import.
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import CairnAdminShell from '../../lib/admin/CairnAdminShell.svelte';
import { resolveNavLayout } from '../../lib/sveltekit/admin-nav.js';

const child = createRawSnippet(() => ({
  render: () => '<div><button class="btn btn-primary" type="button">Publish</button></div>',
}));

/** An owner's authed shell payload on the light theme, the minimum the shell renders from. */
function data() {
  const concepts = [{ id: 'posts', label: 'Posts' }];
  const editor = { displayName: 'Ed', email: 'ed@example.com', role: 'owner' as const, capability: 'owner' as const };
  return {
    public: false as const,
    siteName: 'Test Site',
    user: editor,
    concepts,
    nav: resolveNavLayout({ layout: undefined, concepts, navMenuLabel: null, editor }),
    pathname: '/admin/posts',
    theme: 'cairn-admin' as const,
    collapsedNav: null as string[] | null,
    csrf: 'test-csrf-token',
    pendingEntries: Promise.resolve(null) as Promise<{ concept: string; id: string }[] | null>,
    attention: {},
    mediaBase: '/media',
  };
}

describe("CairnAdminShell's own sheet import in a component test", () => {
  it('brings the compiled sheet: the plugin-block palette resolves and an idiom rule wins', async () => {
    await render(CairnAdminShell, { data: data(), children: child });
    const root = document.querySelector<HTMLElement>("[data-theme='cairn-admin']")!;
    expect(root).not.toBeNull();
    // The light theme's primary, declared only in the daisyUI theme block, which exists in the
    // document only if the compiled sheet does.
    expect(getComputedStyle(root).getPropertyValue('--color-primary')).toBe('oklch(52% .2 293)');
    // The primary button's warm lift, a cairn-idiom rule that outranks daisyUI's own --btn-shadow
    // only while utilities.cairn-idiom registers after utilities.daisyui.
    const button = root.querySelector('.btn-primary')!;
    expect(getComputedStyle(button).getPropertyValue('--btn-shadow')).toBe('0 1px 2px -1px oklch(35% .04 75 / .35)');
  });

  it('never loads the source partial into the document', async () => {
    await render(CairnAdminShell, { data: data(), children: child });
    const sourceSheets = [...document.querySelectorAll('style[data-vite-dev-id]')].filter((el) =>
      el.getAttribute('data-vite-dev-id')!.endsWith('/src/lib/admin/cairn-admin.css'),
    );
    expect(sourceSheets).toEqual([]);
  });
});
