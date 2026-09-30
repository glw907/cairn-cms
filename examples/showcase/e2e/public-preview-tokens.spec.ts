import { test, expect, type Page } from '@playwright/test';

// The preview surfaces read the site's theme tokens, in every scheme Waymark ships. Two surfaces:
//
//   1. The public preview page's PreviewBanner, in its draft and ended states, under light, dark by
//      OS preference, and dark by explicit choice (`data-theme="cairn-dark"` on <html>). Its
//      computed ground and ink equal the computed values of the contract tokens, its text and link
//      clear 4.5:1 on that ground, and the two states paint different grounds.
//   2. The editor's preview frame. The frame document's <html> carries no `data-theme`, so only an
//      emulated OS color scheme reaches it; its body ground equals the frame's own resolved
//      `--color-base-100`.
//
// The banner flow mirrors preview.spec.ts: a disposable post is created through the admin UI, a
// preview link is minted, and a publish turns the same link into the ended state.

const HELLO_EDIT_PATH = '/admin/posts/2026-01-15-hello';

type Scheme = 'light' | 'dark-os' | 'dark-explicit';

const SCHEMES: Scheme[] = ['light', 'dark-os', 'dark-explicit'];

type BannerState = 'draft' | 'published';

/** The contract tokens each banner state reads for its ground, as `--color-*` custom properties. */
const GROUND_TOKEN: Record<BannerState, string> = {
  draft: '--color-base-200',
  published: '--color-base-100',
};

/** What one banner state measures to in one scheme, all as computed CSS strings or byte triples. */
interface BannerReading {
  background: string;
  backgroundToken: string;
  color: string;
  colorToken: string;
  ground: number[];
  text: number[];
  link: number[];
}

/** WCAG relative luminance of an sRGB byte triple. */
function luminance([r, g, b]: number[]): number {
  const channel = (byte: number): number => {
    const c = byte / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two sRGB byte triples. */
function contrast(a: number[], b: number[]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Applies a scheme to a loaded page: the explicit state sets the theme attribute on <html>. */
async function applyScheme(page: Page, scheme: Scheme, url: string): Promise<void> {
  await page.emulateMedia({ colorScheme: scheme === 'dark-os' ? 'dark' : 'light' });
  await page.goto(url);
  await expect(page.locator('.cairn-preview-banner')).toBeVisible();
  if (scheme === 'dark-explicit') {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'cairn-dark'));
  }
}

/**
 * Reads the banner's computed ground and ink beside the computed values of the tokens the two
 * are meant to equal. A token is read through a probe element in the banner's own parent, so the
 * probe sits in the same theme region and the browser serializes both values the same way. Color
 * strings reduce to sRGB bytes through a canvas, which parses any notation the browser reports.
 * The draft state has no link element, so a link is added under the banner's own scoping class
 * to read the rule's color.
 */
async function readBanner(page: Page, state: BannerState): Promise<BannerReading> {
  return page.evaluate((groundToken) => {
    const banner = document.querySelector('.cairn-preview-banner') as HTMLElement;
    const probe = (property: string, token: string): string => {
      const el = document.createElement('span');
      el.style.setProperty(property, `var(${token})`);
      (banner.parentElement as HTMLElement).appendChild(el);
      const value = getComputedStyle(el).getPropertyValue(property);
      el.remove();
      return value;
    };
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
    const bytes = (css: string): number[] => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000000';
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
    };

    let anchor = banner.querySelector('a');
    if (!anchor) {
      const paragraph = banner.querySelector('p') as HTMLElement;
      anchor = document.createElement('a');
      anchor.className = paragraph.className;
      anchor.href = '#';
      anchor.textContent = 'probe';
      paragraph.appendChild(anchor);
    }

    const style = getComputedStyle(banner);
    return {
      background: style.backgroundColor,
      backgroundToken: probe('background-color', groundToken),
      color: style.color,
      colorToken: probe('color', '--color-base-content'),
      ground: bytes(style.backgroundColor),
      text: bytes(style.color),
      link: bytes(getComputedStyle(anchor).color),
    };
  }, GROUND_TOKEN[state]);
}

/** Every field but the title lives behind the Details slide-over; open it once, idempotently. */
async function openDetails(page: Page) {
  const details = page.getByRole('region', { name: 'Entry details' });
  if (!(await details.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Details', exact: true }).click();
  }
  await expect(details).toBeVisible();
  return details;
}

test.describe('preview surfaces read the theme tokens', () => {
  test('PreviewBanner paints contract tokens, legibly and distinctly, in every Waymark scheme', async ({
    page,
  }) => {
    const slug = `preview-tokens-${Date.now()}`;
    const title = 'Preview tokens';

    await page.goto('/admin/posts');
    await page.locator('header').getByRole('button', { name: 'New post' }).click();
    const createDialog = page.locator('dialog[aria-labelledby="cairn-create-dialog-title"]');
    await expect(createDialog).toBeVisible();
    await createDialog.locator('input[name="title"]').fill(title);
    await createDialog.locator('input[name="slug"]').fill(slug);
    await createDialog.getByRole('button', { name: 'Create' }).click();
    await expect(page).toHaveURL(/new=1/, { timeout: 10_000 });
    await page.locator('input[name="title"]').fill(title);
    const editor = page.locator('.cm-content');
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('A throwaway body for the banner tokens.');
    await expect(page.locator('input[name="body"]')).toHaveValue(
      'A throwaway body for the banner tokens.',
      { timeout: 5000 },
    );
    await page.locator('.navbar').getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/saved=1/, { timeout: 10_000 });

    const editUrl = page.url();
    const details = await openDetails(page);
    await details.getByRole('button', { name: 'Share preview link' }).click();
    const urlInput = page.locator('#cairn-preview-share-url');
    await expect(urlInput).toBeVisible({ timeout: 10_000 });
    // The share URL's origin is the configured PUBLIC_ORIGIN, which need not be the port this run
    // serves on; the path alone reaches the server under test.
    const url = new URL(await urlInput.inputValue()).pathname;

    const grounds: Record<BannerState, Partial<Record<Scheme, string>>> = {
      draft: {},
      published: {},
    };

    const check = async (state: BannerState): Promise<void> => {
      for (const scheme of SCHEMES) {
        await applyScheme(page, scheme, url);
        const reading = await readBanner(page, state);
        const label = `${state} banner, ${scheme}`;
        expect(reading.background, `${label}: ground equals ${GROUND_TOKEN[state]}`).toBe(
          reading.backgroundToken,
        );
        expect(reading.color, `${label}: text equals --color-base-content`).toBe(
          reading.colorToken,
        );
        expect(
          contrast(reading.text, reading.ground),
          `${label}: text contrast on its ground`,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrast(reading.link, reading.ground),
          `${label}: link contrast on its ground`,
        ).toBeGreaterThanOrEqual(4.5);
        grounds[state][scheme] = reading.background;
      }
    };

    await check('draft');

    await page.goto(editUrl);
    await page.locator('.navbar').getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page).toHaveURL(/published=1/, { timeout: 10_000 });

    await check('published');

    for (const scheme of SCHEMES) {
      expect(
        grounds.draft[scheme],
        `the draft and published grounds differ under ${scheme}`,
      ).not.toBe(grounds.published[scheme]);
    }

    await page.goto('/admin/posts');
    const remove = page.getByRole('button', { name: `Delete ${title}`, exact: true });
    if ((await remove.count()) > 0) {
      await remove.click();
      await expect(page.getByRole('link', { name: title, exact: true })).toHaveCount(0);
    }
  });

  test("the editor preview frame's body paints the frame's own --color-base-100 under each OS scheme", async ({
    page,
  }) => {
    await page.goto(HELLO_EDIT_PATH);
    await page.getByRole('tab', { name: 'Preview' }).click();
    await expect(page.locator('#cairn-pane-preview')).toBeVisible({ timeout: 2000 });
    const frame = page.frameLocator('#cairn-pane-preview iframe[title="Page preview"]');
    await expect(frame.locator('.site-main')).toBeVisible();

    const read = () =>
      frame.locator('body').evaluate((body) => {
        const probe = document.createElement('span');
        probe.style.backgroundColor = 'var(--color-base-100)';
        body.appendChild(probe);
        const token = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return { ground: getComputedStyle(body).backgroundColor, token };
      });

    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await expect
        .poll(
          async () => {
            const { ground, token } = await read();
            return ground === token && token !== '';
          },
          { message: `frame body ground equals --color-base-100 under ${scheme}` },
        )
        .toBe(true);
      if (scheme === 'dark') {
        const { ground } = await read();
        expect(ground, 'the dark frame ground is not the pinned white').not.toBe(
          'rgb(255, 255, 255)',
        );
      }
    }
  });
});
