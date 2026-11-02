// The site-config path is declared once, by `editor.siteConfigPath`, and the nav editor, Settings,
// and the tag vocabulary all read and commit the file it names. An adapter that declares no path
// gets the scaffold's own, which a committed twin keeps equal to the file the scaffold bakes and the
// Go doctor embeds.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { composeRuntime, DEFAULT_SITE_CONFIG_PATH } from '../../lib/content/compose.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { createNavRoutes } from '../../lib/sveltekit/nav-routes.js';
import { GithubDouble } from './_github-double.js';
import { runtime as baseRuntime, contentEvent, expectRedirect } from './_content-harness.js';
import { testAdapter, testSiteConfig } from './_content-fixture.js';
import type { CairnAdapter } from '../../lib/content/types.js';

const MANIFEST_PATH = 'src/content/.cairn/index.json';
const ELSEWHERE = 'config/elsewhere.yaml';

afterEach(() => vi.restoreAllMocks());

/** The composed runtime for an adapter that declares the given `editor` block. */
function composed(editor?: CairnAdapter['editor']) {
  return composeRuntime({ adapter: { ...testAdapter, editor }, siteConfig: testSiteConfig });
}

describe('editor.siteConfigPath', () => {
  it('defaults to the path the scaffold bakes and the doctor embeds', () => {
    const canonical = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../../packages/create-cairn-site/src/site-config-path.json'), 'utf8'),
    ) as { path: string };
    expect(DEFAULT_SITE_CONFIG_PATH).toBe(canonical.path);
    expect(composed().siteConfigPath).toBe(canonical.path);
  });

  it('takes the adapter path when one is set', () => {
    expect(composed({ siteConfigPath: ELSEWHERE }).siteConfigPath).toBe(ELSEWHERE);
  });

  it('no longer lets the nav menu carry its own path', () => {
    const editor: CairnAdapter['editor'] = {
      // @ts-expect-error the nav menu names a menu, never the file
      nav: { configPath: 'x.yaml', menuName: 'primary', label: 'Navigation' },
    };
    expect(editor).toBeDefined();
  });
});

/** The routes an adapter's runtime drives, each seeded on one committed file. */
function routesFor(editor?: CairnAdapter['editor']) {
  const rt = composed(editor);
  const runtime = baseRuntime({
    concepts: [],
    navMenu: rt.navMenu,
    siteConfigPath: rt.siteConfigPath,
    manifestPath: MANIFEST_PATH,
    tidy: { enabled: true, model: 'claude-sonnet-5' },
  });
  return { content: createContentRoutes({ runtime }), nav: createNavRoutes({ runtime }), path: rt.siteConfigPath };
}

function seed(path: string) {
  const gh = new GithubDouble({
    main: {
      [path]: 'siteName: S\nmenus:\n  primary:\n    - label: Old\n',
      [MANIFEST_PATH]: JSON.stringify({ version: 1, entries: [] }),
    },
  });
  gh.install();
  return gh;
}

describe('the screens that read the site config', () => {
  it('Settings and Tags save to the default path for an adapter with no editor.nav', async () => {
    const gh = seed(DEFAULT_SITE_CONFIG_PATH);
    const { content } = routesFor();
    await expectRedirect(() =>
      content.settingsSaveAction(
        contentEvent({ url: 'https://t.example/admin/settings', form: { conventions: JSON.stringify({ smartQuotes: true }) } }),
      ),
    );
    await expectRedirect(() =>
      content.vocabularySaveAction(
        contentEvent({
          url: 'https://t.example/admin/vocabulary',
          form: { vocabulary: JSON.stringify([{ value: 'svelte', label: 'Svelte' }]) },
        }),
      ),
    );
    const committed = gh.read('main', DEFAULT_SITE_CONFIG_PATH)!;
    expect(committed).toContain('smartQuotes: true');
    expect(committed).toContain('value: svelte');
  });

  it('Settings, Tags, and the nav editor all route to editor.siteConfigPath when it names another file', async () => {
    const gh = seed(ELSEWHERE);
    const { content, nav } = routesFor({
      siteConfigPath: ELSEWHERE,
      nav: { menuName: 'primary', label: 'Navigation' },
    });
    await expectRedirect(() =>
      content.settingsSaveAction(
        contentEvent({ url: 'https://t.example/admin/settings', form: { conventions: JSON.stringify({ smartQuotes: true }) } }),
      ),
    );
    await expectRedirect(() =>
      content.vocabularySaveAction(
        contentEvent({
          url: 'https://t.example/admin/vocabulary',
          form: { vocabulary: JSON.stringify([{ value: 'svelte', label: 'Svelte' }]) },
        }),
      ),
    );
    await expectRedirect(() =>
      nav.navSaveAction(
        contentEvent({ url: 'https://t.example/admin/nav', form: { tree: JSON.stringify([{ label: 'Home', url: '/' }]) } }),
      ),
    );
    const committed = gh.read('main', ELSEWHERE)!;
    expect(committed).toContain('smartQuotes: true');
    expect(committed).toContain('value: svelte');
    expect(committed).toContain('label: Home');
    // Nothing was written to the default path, which holds no file in this seed.
    expect(gh.read('main', DEFAULT_SITE_CONFIG_PATH)).toBeNull();
  });
});
