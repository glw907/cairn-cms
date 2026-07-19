import { describe, it, expect } from 'vitest';
import { githubApp } from '../../lib/index.js';
import { composeRuntime } from '../../lib/content/compose.js';
import type { CairnAdapter, PreviewConfig } from '../../lib/content/types.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { testSiteConfig } from './_content-fixture.js';

function adapter(): CairnAdapter {
  return {
    content: { pages: { dir: 'src/content/pages', routing: 'page', fields: fieldset({}) } },
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
    email: { from: 'cms@test' },
    rendering: { render: ({ body }) => Promise.resolve(body) },
  };
}

describe('composeRuntime preview pass-through', () => {
  it('carries the adapter preview config onto the runtime untouched', () => {
    // The showcase shape: a hashed stylesheet URL from a Vite `?url` import plus theme roots,
    // with a per-concept wrapper override (the ecxc shape: posts wrap differently from pages).
    const preview: PreviewConfig = {
      stylesheets: ['/_app/immutable/assets/app.B3xJk2.css'],
      bodyClass: 'bg-base-100',
      containerClass: 'prose mx-auto',
      byConcept: { posts: { bodyClass: 'post-body', containerClass: 'post-module' } },
    };
    const runtime = composeRuntime({ adapter: { ...adapter(), editor: { preview } }, siteConfig: testSiteConfig });
    expect(runtime.preview).toBe(preview);
    expect(runtime.preview?.byConcept).toEqual({ posts: { bodyClass: 'post-body', containerClass: 'post-module' } });
  });

  it('leaves preview undefined when the adapter omits it', () => {
    expect(composeRuntime({ adapter: adapter(), siteConfig: testSiteConfig }).preview).toBeUndefined();
  });
});

describe('composeRuntime manifestPath', () => {
  it('defaults the manifest path', () => {
    expect(composeRuntime({ adapter: adapter(), siteConfig: testSiteConfig }).manifestPath).toBe('src/content/.cairn/index.json');
  });
});

describe('composeRuntime spellcheckDictionary', () => {
  it('defaults to the US English dictionary when the site config sets no dialect', () => {
    const runtime = composeRuntime({ adapter: adapter(), siteConfig: testSiteConfig });
    expect(runtime.spellcheckDictionary).toBe('dictionary-en-us.txt');
  });

  it('falls back to the default dictionary for an unknown configured dialect', () => {
    const runtime = composeRuntime({ adapter: adapter(), siteConfig: { ...testSiteConfig, spellcheck: { dialect: 'xx-ZZ' } } });
    expect(runtime.spellcheckDictionary).toBe('dictionary-en-us.txt');
  });
});

describe('composeRuntime resolvedAssets', () => {
  it('resolves to disabled media when the adapter declares no assets', () => {
    const runtime = composeRuntime({ adapter: adapter(), siteConfig: testSiteConfig });
    expect(runtime.resolvedAssets).toEqual({ enabled: false });
  });
  it('resolves a declared media block into a filled config', () => {
    const withMedia: CairnAdapter = { ...adapter(), media: { bucketBinding: 'MEDIA_BUCKET' } };
    const runtime = composeRuntime({ adapter: withMedia, siteConfig: testSiteConfig });
    expect(runtime.resolvedAssets.enabled).toBe(true);
    if (!runtime.resolvedAssets.enabled) throw new Error('expected enabled');
    expect(runtime.resolvedAssets.bucketBinding).toBe('MEDIA_BUCKET');
    expect(runtime.resolvedAssets.publicBase).toBe('/media');
    expect(runtime.resolvedAssets.transformations).toBe(false);
  });
});

describe('composeRuntime supportContact', () => {
  it('carries the adapter supportContact onto the runtime', () => {
    expect(
      composeRuntime({ adapter: { ...adapter(), editor: { supportContact: 'help@example.org' } }, siteConfig: testSiteConfig }).supportContact,
    ).toBe('help@example.org');
  });

  it('defaults to the hosted editor help when the adapter omits it', () => {
    expect(composeRuntime({ adapter: adapter(), siteConfig: testSiteConfig }).supportContact).toBe('https://cairn.pub/help');
  });

  it('passes an explicit empty string through untouched, since the default only covers nullish', () => {
    expect(
      composeRuntime({ adapter: { ...adapter(), editor: { supportContact: '' } }, siteConfig: testSiteConfig }).supportContact,
    ).toBe('');
  });
});

describe('composeRuntime mediaManifestPath', () => {
  it('defaults the media manifest path', () => {
    expect(composeRuntime({ adapter: adapter(), siteConfig: testSiteConfig }).mediaManifestPath).toBe('src/content/.cairn/media.json');
  });
});
