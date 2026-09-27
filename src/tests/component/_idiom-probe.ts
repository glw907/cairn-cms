// cairn-cms: the shared probe every cairn-idiom component test renders through. It mounts markup
// under a bare data-theme wrapper with the compiled admin sheet injected once (never the raw
// source partial, which declares utilities.cairn-idiom before utilities.daisyui and would reverse
// the pin), reads a computed style at rest, hover, focus-visible, or active through real input,
// and resolves a color expression the way an idiom test's oracle must: painted, never a
// hand-written color-mix(...)/var(...) string.
import { cdp, userEvent } from 'vitest/browser';
import compiledAdminCss from '../../../dist/components/cairn-admin.css?inline';

/** The two admin theme roots a cairn-idiom rule keys on. */
export type Theme = 'cairn-admin' | 'cairn-admin-dark';

/** The four interaction states an idiom rule's full state set covers. */
export type IdiomState = 'rest' | 'hover' | 'focus-visible' | 'active';

/** Where an extra host sheet lands relative to the admin sheet's own `<style>` element. */
export type HostOrder = 'before' | 'after';

/** Options {@link renderInTheme} accepts beside its markup and theme. */
export interface RenderInThemeOptions {
  /** An extra sheet to inject, standing in for a consumer's own compiled site CSS. */
  hostCss?: string;
  /** Where `hostCss` lands relative to the admin sheet's `<style>` element. Defaults to `'after'`. */
  hostOrder?: HostOrder;
}

/** What {@link renderInTheme} returns. */
export interface RenderedProbe {
  /** The bare `data-theme` wrapper `html` was mounted inside. */
  wrapper: HTMLElement;
  /** Removes the wrapper and any `hostCss` this render added. The shared admin sheet stays. */
  cleanup: () => void;
}

/**
 * The CDP session's protocol surface this file calls. Vitest exports `CDPSession` as an empty
 * interface, so the one method a test needs has to be declared where it is used, the same pattern
 * `reproductions-containment.test.ts` uses for its own accessibility-tree probe.
 */
type ProtocolSession = { send(method: string, params?: Record<string, unknown>): Promise<unknown> };

let adminSheetEl: HTMLStyleElement | null = null;

/** The compiled admin sheet's own `<style>` element, injected once and reused by every render. */
function ensureAdminSheet(): HTMLStyleElement {
  if (!adminSheetEl) {
    adminSheetEl = document.createElement('style');
    adminSheetEl.textContent = compiledAdminCss;
    document.head.appendChild(adminSheetEl);
  }
  return adminSheetEl;
}

/**
 * Mounts `html` under a bare `data-theme="theme"` wrapper appended to `document.body`, with the
 * compiled admin sheet injected once (shared across every call in the run) and, when
 * `opts.hostCss` is given, an extra sheet placed `opts.hostOrder` (default `'after'`) the admin
 * sheet's own `<style>` element, standing in for a consumer's site CSS at either cascade position.
 * @param html markup to mount inside the wrapper
 * @param theme the admin theme root to mount under
 * @param opts an extra host sheet and its cascade position
 * @returns the mounted wrapper and a cleanup function
 */
export function renderInTheme(html: string, theme: Theme, opts: RenderInThemeOptions = {}): RenderedProbe {
  const adminSheet = ensureAdminSheet();
  let hostStyle: HTMLStyleElement | null = null;
  if (opts.hostCss) {
    hostStyle = document.createElement('style');
    hostStyle.textContent = opts.hostCss;
    if (opts.hostOrder === 'before') adminSheet.insertAdjacentElement('beforebegin', hostStyle);
    else adminSheet.insertAdjacentElement('afterend', hostStyle);
  }
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-theme', theme);
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  return {
    wrapper,
    cleanup() {
      wrapper.remove();
      hostStyle?.remove();
    },
  };
}

/**
 * The top-level-viewport-space point CDP mouse input needs to land on `el`'s center. CDP input
 * coordinates are in top-level viewport space, but a browser-mode test runs in a child frame, so
 * the point is `el`'s own rect center offset by the child frame's own rect (`window.frameElement`,
 * read from the parent document), with any scale between the two frames applied.
 */
function topLevelPoint(el: Element): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  const frame = window.frameElement as HTMLIFrameElement | null;
  if (!frame) return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  const frameRect = frame.getBoundingClientRect();
  const scaleX = frame.clientWidth ? frameRect.width / frame.clientWidth : 1;
  const scaleY = frame.clientHeight ? frameRect.height / frame.clientHeight : 1;
  return {
    x: frameRect.left + (rect.left + rect.width / 2) * scaleX,
    y: frameRect.top + (rect.top + rect.height / 2) * scaleY,
  };
}

const STATE_PSEUDO: Record<Exclude<IdiomState, 'rest'>, string> = {
  hover: ':hover',
  'focus-visible': ':focus-visible',
  active: ':active',
};

/** Throws, naming `state`, when `el` does not match the pseudo-class that state stands for. */
function assertReached(el: Element, state: Exclude<IdiomState, 'rest'>): void {
  if (!el.matches(STATE_PSEUDO[state])) {
    throw new Error(`styleOf: the element never reached ${state} (${STATE_PSEUDO[state]} does not match).`);
  }
}

/**
 * The computed value of `prop` on `el` at `state`, reached through real input: `userEvent.hover`
 * for hover; a real keyboard Tab press followed by a direct focus call for focus-visible (the
 * press primes Chromium's focus-visible heuristic, and focusing `el` directly is deterministic
 * regardless of where Tab traversal itself would have landed); and a CDP mouse press held down,
 * released after the read, for active. Before reading a non-rest state it asserts `el` actually
 * matches that state's pseudo-class and throws naming the state otherwise.
 * @param el the element to read
 * @param prop a CSS property or custom property name, passed to `getPropertyValue`
 * @param state which interaction state to read
 * @returns the computed value of `prop` at `state`
 */
export async function styleOf(el: Element, prop: string, state: IdiomState): Promise<string> {
  if (state === 'rest') return getComputedStyle(el).getPropertyValue(prop);
  if (state === 'hover') {
    await userEvent.hover(el);
    assertReached(el, 'hover');
    return getComputedStyle(el).getPropertyValue(prop);
  }
  if (state === 'focus-visible') {
    await userEvent.tab();
    (el as HTMLElement).focus();
    assertReached(el, 'focus-visible');
    return getComputedStyle(el).getPropertyValue(prop);
  }
  const { x, y } = topLevelPoint(el);
  const session = cdp() as unknown as ProtocolSession;
  await session.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  try {
    assertReached(el, 'active');
    return getComputedStyle(el).getPropertyValue(prop);
  } finally {
    await session.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }
}

/**
 * Paints `expr` on a throwaway probe element and returns its computed color: the one color oracle
 * every idiom test uses in place of a hand-written `color-mix(...)`/`var(...)` string. When
 * `context` is given the probe mounts as `context`'s child, so a variable `context`'s own classes
 * set (for example `.alert-info`'s `--alert-color`) resolves the way it does there, through normal
 * custom-property inheritance; otherwise the probe mounts directly under a fresh `theme` wrapper,
 * where no such variable is set.
 * @param expr a CSS color value, typically a `var(...)` or `color-mix(...)` expression
 * @param theme the admin theme to resolve against when `context` is not given
 * @param context an already-mounted element to resolve the expression inside
 * @returns the resolved computed color
 */
export function resolveColor(expr: string, theme: Theme, context?: Element): string {
  const probe = document.createElement('span');
  probe.style.color = expr;
  let cleanup: (() => void) | null = null;
  if (context) {
    context.appendChild(probe);
  } else {
    const rendered = renderInTheme('', theme);
    rendered.wrapper.appendChild(probe);
    cleanup = rendered.cleanup;
  }
  const value = getComputedStyle(probe).color;
  probe.remove();
  cleanup?.();
  return value;
}
