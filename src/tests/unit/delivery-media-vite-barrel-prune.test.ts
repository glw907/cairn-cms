import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enumerateExports } from '../../../scripts/reference-coverage.mjs';

// The seven names the surface-pruning pass demotes from the /delivery and /delivery/data barrels
// (Task 4), verbatim from `docs/superpowers/plans/2026-07-01-surface-pruning-pass.md`. `feedView`
// stays exported (it gets an `Unstable API` tier in Task 8, not a demotion); `sitemapView` is
// frozen and unaffected.
const DELIVERY_DEMOTED = [
  'createSiteResolver',
  'ConceptIndex',
  'createContentIndex',
  'RawFile',
  'fromGlob',
  'wordCount',
  'permalink',
];

// The /delivery/data keep list, from the audit verdicts doc's
// `## ./delivery + ./delivery/head + ./delivery/data` section, minus the seven demotions above.
const DATA_KEPT = [
  'createSiteIndexes',
  'SiteGlobs',
  'SiteIndexes',
  'SiteResolver',
  'ContentSummary',
  'ContentEntry',
  'ContentProblem',
  'ContentIndex',
  'buildRssFeed',
  'buildJsonFeed',
  'FeedChannel',
  'FeedItem',
  'buildSitemap',
  'SitemapUrl',
  'feedView',
  'sitemapView',
  'buildRobots',
  'rssResponse',
  'jsonFeedResponse',
  'sitemapResponse',
  'robotsResponse',
  'buildSeoMeta',
  'SeoInput',
  'SeoMeta',
  'resolveImageUrl',
  'readSeoFields',
  'SeoFields',
  'jsonLdScript',
  'siteDescriptors',
  'buildSiteManifest',
  'buildLinkResolver',
  'resolveReferences',
  'ResolvedReference',
];

// The names /delivery adds on top of the re-exported /delivery/data surface (the route-loader
// factory and its types), unaffected by this task.
const DELIVERY_ONLY_KEPT = ['createPublicRoutes', 'PublicRoutesDeps', 'EntryData'];

// The fourteen names the pass demotes from the /media barrel, verbatim from the plan's Task 4 and
// the audit verdicts doc's `## ./media` section.
const MEDIA_DEMOTED = [
  'parseMediaManifest',
  'findByHash',
  'upsertMediaEntry',
  'removeMediaEntry',
  'serializeMediaManifest',
  'parseMediaEntries',
  'hashBytes',
  'shortHash',
  'slugifyFilename',
  'r2Key',
  'publicPath',
  'presetUrl',
  'variantUrl',
  'manifestMediaResolver',
];

// The /media keep list, from the audit verdicts doc, minus the fourteen demotions above.
const MEDIA_KEPT = [
  'normalizeAssets',
  'ResolvedAssetConfig',
  'readCommittedManifest',
  'MediaEntry',
  'MediaManifest',
  'VariantSpec',
  'parseMediaToken',
  'mediaToken',
  'MediaRef',
  'makeMediaResolver',
  'MediaResolve',
];

// The six names the pass demotes from the /vite barrel; only `cairnManifest` and
// `CairnManifestOptions` remain.
const VITE_DEMOTED = [
  'writeManifest',
  'readAdapterFacts',
  'AdapterFacts',
  'verifyManifestFromVite',
  'buildManifestFromVite',
  'stripCairnManifest',
];

const VITE_KEPT = ['cairnManifest', 'CairnManifestOptions'];

const DELIVERY_DATA_DTS = resolve(
  fileURLToPath(new URL('../../../dist/delivery/data.d.ts', import.meta.url)),
);
const DELIVERY_DTS = resolve(
  fileURLToPath(new URL('../../../dist/delivery/index.d.ts', import.meta.url)),
);
const MEDIA_DTS = resolve(
  fileURLToPath(new URL('../../../dist/media/index.d.ts', import.meta.url)),
);
const VITE_DTS = resolve(
  fileURLToPath(new URL('../../../dist/vite/index.d.ts', import.meta.url)),
);

describe('delivery barrel prune', () => {
  it('resolves the packaged dist output', () => {
    expect(existsSync(DELIVERY_DATA_DTS), 'missing dist/delivery/data.d.ts; run "npm run package" first').toBe(
      true,
    );
    expect(existsSync(DELIVERY_DTS), 'missing dist/delivery/index.d.ts; run "npm run package" first').toBe(
      true,
    );
  });

  it('no longer resolves the demoted names from /delivery/data', () => {
    const names = new Set(enumerateExports(DELIVERY_DATA_DTS));
    const stillPresent = DELIVERY_DEMOTED.filter((name) => names.has(name));
    expect(stillPresent).toEqual([]);
  });

  it('no longer resolves the demoted names from /delivery', () => {
    const names = new Set(enumerateExports(DELIVERY_DTS));
    const stillPresent = DELIVERY_DEMOTED.filter((name) => names.has(name));
    expect(stillPresent).toEqual([]);
  });

  it('still resolves every keep-list name from /delivery/data', () => {
    const names = new Set(enumerateExports(DELIVERY_DATA_DTS));
    const missing = DATA_KEPT.filter((name) => !names.has(name));
    expect(missing).toEqual([]);
  });

  it('still resolves every keep-list name from /delivery, including its own additions', () => {
    const names = new Set(enumerateExports(DELIVERY_DTS));
    const missing = [...DATA_KEPT, ...DELIVERY_ONLY_KEPT].filter((name) => !names.has(name));
    expect(missing).toEqual([]);
  });
});

describe('media barrel prune', () => {
  it('resolves the packaged dist output', () => {
    expect(existsSync(MEDIA_DTS), 'missing dist/media/index.d.ts; run "npm run package" first').toBe(true);
  });

  it('no longer resolves the demoted names from /media', () => {
    const names = new Set(enumerateExports(MEDIA_DTS));
    const stillPresent = MEDIA_DEMOTED.filter((name) => names.has(name));
    expect(stillPresent).toEqual([]);
  });

  it('still resolves every keep-list name from /media', () => {
    const names = new Set(enumerateExports(MEDIA_DTS));
    const missing = MEDIA_KEPT.filter((name) => !names.has(name));
    expect(missing).toEqual([]);
  });
});

describe('vite barrel prune', () => {
  it('resolves the packaged dist output', () => {
    expect(existsSync(VITE_DTS), 'missing dist/vite/index.d.ts; run "npm run package" first').toBe(true);
  });

  it('no longer resolves the demoted names from /vite', () => {
    const names = new Set(enumerateExports(VITE_DTS));
    const stillPresent = VITE_DEMOTED.filter((name) => names.has(name));
    expect(stillPresent).toEqual([]);
  });

  it('resolves exactly the two keep-list names from /vite', () => {
    const names = enumerateExports(VITE_DTS);
    expect(names.sort()).toEqual([...VITE_KEPT].sort());
  });
});
