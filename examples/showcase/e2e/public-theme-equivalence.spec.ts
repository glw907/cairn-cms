import { test, expect, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The public theme's computed-value equivalence test. It pins what the built showcase computes for
// every custom property the chassis token system and Waymark's theme sheet declare, for daisyUI's
// own 29 theme keys, and for the elements the engine's public stylesheet styles (every
// `cairn-focus-ring` element on the pages loaded here, `pre.shiki`, the `.cairn-tok-*` classes,
// and `.table-scroll`). The values are read in three states: light, dark by OS preference with no
// cookie, and dark by explicit choice (`data-theme="cairn-dark"`). A stylesheet move that changes
// any computed value fails here and names the first key that differs.
//
// The committed expectation, `fixtures/public-theme-computed.json`, is the only source of the key
// list. Compare mode iterates that file's keys and never re-parses a stylesheet, so a key that
// leaves a stylesheet cannot leave the test with it.
//
// Update mode: run with `CAIRN_UPDATE_PUBLIC_THEME_EXPECTATIONS=1` to regenerate the expectation
// from the current tree instead of comparing against it, then review the diff. Update mode is the
// only place a stylesheet is parsed, to discover the key list. It refuses to run when `CI` is set,
// so a pipeline can never rewrite the expectation it is meant to enforce.

type State = 'light' | 'dark-os' | 'dark-explicit';

/** Computed values keyed by check name. */
type Values = Record<string, string>;

/** One state's capture: the root keys, the per-page focus rings, and the element checks. */
interface StateCapture {
  root: Values;
  focus: Values;
  elements: Values;
}

/** The committed expectation: one capture per state, plus the focus element count per page. */
interface Expectation {
  focusCounts: Record<string, number>;
  states: Record<State, StateCapture>;
}

const UPDATE = process.env.CAIRN_UPDATE_PUBLIC_THEME_EXPECTATIONS === '1';

const FIXTURE_URL = new URL('./fixtures/public-theme-computed.json', import.meta.url);
const CHASSIS_TOKENS_URL = new URL('../src/chassis/tokens.css', import.meta.url);
const THEME_CSS_URL = new URL('../src/theme/theme.css', import.meta.url);

const STATES: State[] = ['light', 'dark-os', 'dark-explicit'];

/** The page whose root custom properties are read. */
const ROOT_PAGE = '/';

/** Every page whose `cairn-focus-ring` elements are focused and read. */
const FOCUS_PAGES = ['/', '/styleguide', '/posts/the-reading-surface'];

/** The page that carries the code block, the highlighted tokens, and the scroll-wrapped table. */
const PROSE_PAGE = '/posts/the-reading-surface';

const FOCUS_PROPERTIES = ['outline-style', 'outline-width', 'outline-color', 'outline-offset'];

const TOKEN_CLASSES = ['keyword', 'string', 'comment', 'function', 'number', 'punct'];

/** Applies a state's color scheme, and the explicit theme attribute for the explicit-dark state. */
async function loadIn(page: Page, state: State, path: string): Promise<void> {
  await page.emulateMedia({ colorScheme: state === 'dark-os' ? 'dark' : 'light' });
  await page.goto(path);
  await expect(page.locator('main#main')).toBeVisible();
  if (state === 'dark-explicit') {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'cairn-dark'));
  }
}

/** Reads the named root properties. A key with no `--` prefix is read as a plain property. */
async function readRoot(page: Page, keys: string[]): Promise<Values> {
  return page.evaluate((names) => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name).trim()]));
  }, keys);
}

/**
 * Focuses every `cairn-focus-ring` element on the loaded page in document order and reads its
 * outline. A keypress first puts the page in keyboard modality, so `:focus-visible` matches. An
 * element that cannot take focus, or takes it without matching `:focus-visible`, reads as a
 * marker string instead of an outline, so the marker is itself part of the expectation.
 */
async function readFocus(page: Page, path: string): Promise<{ count: number; values: Values }> {
  await page.keyboard.press('Shift');
  const read = await page.evaluate((properties) => {
    const elements = [...document.querySelectorAll<HTMLElement>('.cairn-focus-ring')];
    return elements.map((el, index) => {
      const classes = [...el.classList].filter((name) => !name.startsWith('svelte-'));
      const label = `${el.tagName.toLowerCase()}.${classes.join('.')}`;
      el.focus();
      let value: string;
      if (document.activeElement !== el) value = 'not-focusable';
      else if (!el.matches(':focus-visible')) value = 'not-focus-visible';
      else {
        const style = getComputedStyle(el);
        value = properties.map((name) => `${name}: ${style.getPropertyValue(name)}`).join('; ');
      }
      el.blur();
      return { key: `${index} ${label}`, value };
    });
  }, FOCUS_PROPERTIES);
  return {
    count: read.length,
    values: Object.fromEntries(read.map((entry) => [`${path} #${entry.key}`, entry.value])),
  };
}

/** Reads the `pre.shiki`, `.cairn-tok-*`, and `.table-scroll` computed values on the prose page. */
async function readElements(page: Page): Promise<Values> {
  return page.evaluate((tokenClasses) => {
    const out: Record<string, string> = {};
    const read = (selector: string, properties: string[]): void => {
      const el = document.querySelector(selector);
      for (const property of properties) {
        out[`${selector} ${property}`] = el
          ? getComputedStyle(el).getPropertyValue(property)
          : 'absent';
      }
    };
    read('pre.shiki', ['background-color', 'color', 'border-color']);
    for (const name of tokenClasses) read(`.cairn-tok-${name}`, ['color']);
    read('.table-scroll', ['display', 'overflow-x']);
    return out;
  }, TOKEN_CLASSES);
}

/** The custom properties declared at a theme root or `@theme` level in a stylesheet's text. */
function rootLevelCustomProperties(css: string): string[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const found = new Set<string>();
  const stack: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '{') {
      stack.push(text.slice(start, i).trim());
      start = i + 1;
    } else if (char === '}' || char === ';') {
      const inRoot = /^(:root|@theme|@plugin)/.test(stack[stack.length - 1] ?? '');
      if (inRoot) {
        const match = /^\s*(--[a-z0-9-]+)\s*:/i.exec(text.slice(start, i));
        if (match) found.add(match[1]);
      }
      if (char === '}') stack.pop();
      start = i + 1;
    }
  }
  return [...found];
}

/** The key list update mode captures: both stylesheets' root properties plus daisyUI's own keys. */
async function discoverRootKeys(): Promise<string[]> {
  const { default: themes } = (await import('daisyui/theme/object')) as {
    default: Record<string, Record<string, string>>;
  };
  const daisyKeys = Object.keys(Object.values(themes)[0]);
  const declared = [CHASSIS_TOKENS_URL, THEME_CSS_URL].flatMap((url) =>
    rootLevelCustomProperties(readFileSync(url, 'utf8')),
  );
  return [...new Set([...daisyKeys, ...declared])].sort();
}

/** Captures one state on the built showcase, reading exactly `keys` from the root. */
async function capture(
  page: Page,
  state: State,
  keys: string[],
): Promise<{ capture: StateCapture; focusCounts: Record<string, number> }> {
  await loadIn(page, state, ROOT_PAGE);
  const root = await readRoot(page, keys);
  const focus: Values = {};
  const focusCounts: Record<string, number> = {};
  for (const path of FOCUS_PAGES) {
    await loadIn(page, state, path);
    const read = await readFocus(page, path);
    focusCounts[path] = read.count;
    Object.assign(focus, read.values);
  }
  await loadIn(page, state, PROSE_PAGE);
  return { capture: { root, focus, elements: await readElements(page) }, focusCounts };
}

/** The keys a capture is read for, taken from the committed expectation only. */
function expectedRootKeys(expected: Expectation, state: State): string[] {
  return Object.keys(expected.states[state].root);
}

test.describe('public theme computed-value equivalence', () => {
  if (UPDATE) {
    test('regenerates the committed expectation', async ({ page }) => {
      if (process.env.CI) throw new Error('update mode is refused when CI is set');
      const keys = await discoverRootKeys();
      const states = {} as Record<State, StateCapture>;
      let focusCounts: Record<string, number> = {};
      for (const state of STATES) {
        const read = await capture(page, state, keys);
        states[state] = read.capture;
        focusCounts = read.focusCounts;
      }
      const expectation: Expectation = { focusCounts, states };
      writeFileSync(FIXTURE_URL, `${JSON.stringify(expectation, null, 2)}\n`);
    });
    return;
  }

  test('a utility that sets outline on the same element beats cairn-focus-ring', async ({
    page,
  }) => {
    await page.goto(ROOT_PAGE);
    await expect(page.locator('main#main')).toBeVisible();
    await page.keyboard.press('Shift');
    // The utility joins the page's own `utilities` layer, the layer Tailwind declares after
    // `components`, where the engine's ring rule sits.
    const outlines = await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent =
        '@layer utilities { .probe-outline { outline: 4px dotted rebeccapurple; outline-offset: 7px; } }';
      document.head.append(style);
      const read = (className: string): string => {
        const button = document.createElement('button');
        button.className = className;
        document.body.append(button);
        button.focus();
        const computed = getComputedStyle(button);
        const focused = button.matches(':focus-visible');
        const value = `${focused} ${computed.outlineStyle} ${computed.outlineWidth} ${computed.outlineOffset}`;
        button.remove();
        return value;
      };
      return { ring: read('cairn-focus-ring'), both: read('cairn-focus-ring probe-outline') };
    });
    expect(outlines.ring).toBe('true solid 2px 2px');
    expect(outlines.both).toBe('true dotted 4px 7px');
  });

  const expected = JSON.parse(readFileSync(FIXTURE_URL, 'utf8')) as Expectation;

  for (const state of STATES) {
    test(`the computed values match the expectation (${state})`, async ({ page }) => {
      const want = expected.states[state];
      const read = await capture(page, state, expectedRootKeys(expected, state));

      for (const key of Object.keys(want.root)) {
        expect(read.capture.root[key], `${state} root ${key}`).toBe(want.root[key]);
      }
      expect(read.focusCounts, `${state} focus element counts`).toEqual(expected.focusCounts);
      for (const key of Object.keys(want.focus)) {
        expect(read.capture.focus[key], `${state} focus ${key}`).toBe(want.focus[key]);
      }
      for (const key of Object.keys(want.elements)) {
        expect(read.capture.elements[key], `${state} element ${key}`).toBe(want.elements[key]);
      }

      expect(JSON.stringify(read.capture, null, 2)).toBe(JSON.stringify(want, null, 2));
    });
  }
});
