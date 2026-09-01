# 4b usage map: consumer sweep of Tier 1 + routed symbols

Planning input for cairn-cms slice 4b. Sweep covers 39 unique symbols (25 Tier 1
retire candidates from `docs/internal/record/2026-08-30-r4-rederivation.md`, plus
16 routed symbols, 2 of which overlap the Tier 1 list) across five consumer
repos: ecxc-ski, 907-life, aksailingclub-org, xcathletes-org, cairn-pub.

## Engine version pins (staleness caveat)

No repo had `node_modules` installed at sweep time, so every version below is the
declared `package.json` range, not a verified installed version. A site far
behind `main` may under-report usage of newer surface: it cannot import what its
pinned engine does not ship.

| Repo | Declared pin | Staleness note |
|---|---|---|
| ecxc-ski | `^0.95.0` | Near-current |
| 907-life | `^0.84.4` | **Far behind**; most likely to under-report newer surface |
| aksailingclub-org | `^0.96.0` | Current |
| xcathletes-org | `^0.96.0` | Current |
| cairn-pub | `0.94.0-rc.1` (exact pin) | RC pin, slightly behind |

## 1. Summary table (symbols with any consumer hit)

| Symbol | Repos | Load-bearing? | Worst-case kind |
|---|---|---|---|
| `normalizeAssets` | ecxc-ski, 907-life, aksailingclub-org, xcathletes-org, cairn-pub | Yes (all 5) | Runtime call (public media resolver construction, every site's `cairn.config.ts`) |
| `strAttr` | ecxc-ski, aksailingclub-org, xcathletes-org, cairn-pub | Yes (all 4) | Runtime call (markdown component builders; 7 to 16 call sites per repo) |
| `StatusChip` (+ `StatusChipTone`) | aksailingclub-org, xcathletes-org | Yes (both) | Component render call + type annotation |
| `OfficeList` | aksailingclub-org | Yes | Component import/render across 5+ admin routes |
| `MediaEntry` | aksailingclub-org | Yes (test-only) | Type import + annotation in 2 test files |
| `AuthBranding` | aksailingclub-org | No | Comment mention only |
| `formatTimestamp` | xcathletes-org | No (false positive) | Locally defined function of the same name; not imported from cairn-cms |

## 2. Zero consumer usage (cheap retires)

32 swept symbols have no hits in any consumer repo.

All 25 Tier 1 symbols:

- `OrphanByteRow`
- `BrokenRefRow`
- `BulkDeleteSkip`
- `RepointPlacement`
- `AltPlacement`
- `BranchRef`
- `MediaOrphanScanResult`
- `MediaOrphanPurgeResult`
- `MediaAltPreviewEntry`
- `MediaAltPreviewPlan`
- `MediaReplacePreviewEntry`
- `MediaReplacePreviewPlan`
- `MediaReplaceFailure`
- `MediaBulkDeleteResult`
- `MediaAltPropagateFailure`
- `MediaBulkFailure`
- `MediaUpdateFailure`
- `MediaDeleteRefusal`
- `MediaUploadFailure`
- `UploadResult`
- `DictionaryAddResult`
- `TidyResult`
- `NavSaveFailure`
- `SettingsSaveFailure`
- `VocabularySaveFailure`

Plus 7 routed symbols:

- `PublishActionsConfig`
- `RevertFailure`
- `lastSavedAt`
- `TidyClient`
- `mintPreviewToken`
- `fixtureMediaBase`
- `UsageEntry`

Two further routed symbols hit only incidentally and carry no real usage:
`AuthBranding` (one explanatory comment in aksailingclub-org) and
`formatTimestamp` (a same-named local function in xcathletes-org, not an engine
import).

## 3. Per-repo hit details (verbatim)

### ecxc-ski (`^0.95.0`)

| Symbol | File | Line | Kind | Context |
|---|---|---|---|---|
| normalizeAssets | src/theme/cairn.config.ts | 5 | import | `import { normalizeAssets, buildMediaResolver, readCommittedManifest } from '@glw907/cairn-cms/media';` |
| normalizeAssets | src/theme/cairn.config.ts | 31 | call | `const resolvedAssets = normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' });` |
| strAttr | src/theme/markdown/components.ts | 25 | import | `import { cardShell, headRow, isElement, strAttr, type ComponentContext } from '@glw907/cairn-cms/render';` |
| strAttr | src/theme/markdown/components.ts | 52 | call | `const name = strAttr(ctx, 'icon');` |
| strAttr | src/theme/markdown/components.ts | 53 | call | `const role = strAttr(ctx, 'role');` |
| strAttr | src/theme/markdown/components.ts | 80 | call | `const label = strAttr(ctx, 'label') ?? '';` |
| strAttr | src/theme/markdown/components.ts | 81 | call | `const url = strAttr(ctx, 'url') ?? '';` |
| strAttr | src/theme/markdown/components.ts | 82 | call | `const variant = strAttr(ctx, 'variant') \|\| 'primary';` |
| strAttr | src/theme/markdown/components.ts | 118 | call | `const question = strAttr(ctx, 'question') ?? '';` |
| strAttr | src/theme/markdown/components.ts | 170 | call | `const variant = strAttr(ctx, 'variant');` |
| strAttr | src/theme/markdown/components.ts | 171 | call | `const icon = variant ? strAttr(ctx, 'icon') : undefined;` |
| strAttr | src/theme/markdown/components.ts | 209 | call | `const id = strAttr(ctx, 'id');` |
| strAttr | src/theme/markdown/components.ts | 280 | call | `const twoCol = strAttr(ctx, 'cols') === '2';` |
| strAttr | src/theme/markdown/components.ts | 325 | call | `const icon = strAttr(ctx, 'icon');` |
| strAttr | src/theme/markdown/components.ts | 326 | call | `const href = strAttr(ctx, 'href') ?? '#';` |
| strAttr | src/theme/markdown/components.ts | 327 | call | `const meta = strAttr(ctx, 'meta');` |
| strAttr | src/theme/markdown/components.ts | 328 | call | `const ctaLabel = strAttr(ctx, 'cta');` |
| strAttr | src/theme/markdown/components.ts | 329 | call | `const role = strAttr(ctx, 'role');` |
| strAttr | src/theme/markdown/components.ts | 349 | call | `const kind = strAttr(ctx, 'kind') ?? 'solo';` |
| strAttr | src/theme/markdown/components.ts | 350 | call | `const time = strAttr(ctx, 'time');` |

Sweep notes:

- Only 2 of the 38 specified symbols appear in ecxc-ski source: normalizeAssets (1 import + 1 call) and strAttr (1 import + 16 calls).
- normalizeAssets (line 31): LOAD-BEARING. Runtime call constructing the public media resolver that backs the public build.
- strAttr (lines 52-350): LOAD-BEARING. Runtime calls in the markdown component registry's build functions, extracting attributes from component contexts. Essential for component functionality.
- All other 36 symbols have zero hits in ecxc-ski source.
- node_modules/@glw907/cairn-cms is not installed; the installed version cannot be determined from this checkout.

### 907-life (`^0.84.4`)

| Symbol | File | Line | Kind | Context |
|---|---|---|---|---|
| normalizeAssets | src/theme/cairn.config.ts | 14 | import | `import { normalizeAssets, makeMediaResolver, readCommittedManifest } from '@glw907/cairn-cms/media';` |
| normalizeAssets | src/theme/cairn.config.ts | 38 | call | `const resolvedAssets = normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' });` |

Sweep notes:

- Installed node_modules not present; only package.json range available: ^0.84.4.
- normalizeAssets is load-bearing: imported from cairn-cms/media and called at config initialization to set up the public media resolver.
- All other 38 symbols have zero hits in 907-life source code.

### aksailingclub-org (`^0.96.0`)

| Symbol | File | Line | Kind | Context |
|---|---|---|---|---|
| MediaEntry | src/tests/home-images.test.ts | 2 | import | `import type { MediaEntry, MediaManifest } from '@glw907/cairn-cms/media';` |
| MediaEntry | src/tests/home-images.test.ts | 8 | type-annotation | `function entry(hash: string, alt: string): MediaEntry {` |
| MediaEntry | src/tests/post-cards.test.ts | 2 | import | `import type { MediaEntry, MediaManifest } from '@glw907/cairn-cms/media';` |
| MediaEntry | src/tests/post-cards.test.ts | 9 | type-annotation | `function mediaEntry(): MediaEntry {` |
| OfficeList | src/routes/admin/club/announce/[id]/+page.svelte | 27 | import | `import { FieldLabel, itemNoun, OfficeList, TextInput } from '@glw907/cairn-cms/admin-toolkit';` |
| OfficeList | src/routes/admin/club/assets/+page.svelte | 51 | import | `OfficeList,` |
| OfficeList | src/routes/admin/club/email/compose/+page.svelte | 80 | import | `import { EmptyState, FieldLabel, itemNoun, OfficeList, SelectInput, StatusChip, TextInput }` |
| OfficeList | src/routes/admin/club/email/+page.svelte | 28 | import | `import { EmptyState, OfficeList, Pagination, StatusChip, computeCountLine, itemNoun }` |
| OfficeList | src/routes/admin/club/members/+page.svelte | 38 | import | `OfficeList,` |
| StatusChip | src/admin-club/lib/events-store.ts | 26 | import | `import type { StatusChipTone } from '@glw907/cairn-cms/admin-toolkit';` |
| StatusChip | src/admin-club/lib/member-format.ts | 10 | import | `import type { StatusChipTone } from '@glw907/cairn-cms/admin-toolkit';` |
| StatusChip | src/routes/admin/club/announce/+page.svelte | 21 | import | `import { EmptyState, OfficeList, StatusChip, computeCountLine } from '@glw907/cairn-cms/admin-toolkit';` |
| StatusChip | src/routes/admin/club/assets/+page.svelte | 53 | import | `StatusChip,` |
| StatusChip | src/routes/admin/club/announce/+page.svelte | 79 | call | `<StatusChip tone="neutral" register="quiet" label="Announced" size="xs" />` |
| StatusChip | src/routes/admin/club/asset-requests/+page.svelte | 85 | call | `<StatusChip tone="neutral" register="quiet" label={row.kind === 'retention' ? 'Retention' : 'New'} size="xs" />` |
| StatusChip | src/routes/admin/club/assets/+page.svelte | 321 | call | `<StatusChip tone={standing.tone} register={standing.register} label={standing.label} size="xs" />` |
| normalizeAssets | src/theme/cairn.config.ts | 6 | import | `import { normalizeAssets, buildMediaResolver, readCommittedManifest } from '@glw907/cairn-cms/media';` |
| normalizeAssets | src/theme/cairn.config.ts | 150 | call | `const resolvedAssets = normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' });` |
| strAttr | src/theme/markdown/components.ts | 19 | import | `import { headRow, isElement, strAttr, type ComponentContext } from '@glw907/cairn-cms/render';` |
| strAttr | src/theme/markdown/components.ts | 62 | call | `const icon = strAttr(ctx, 'icon');` |
| strAttr | src/theme/markdown/components.ts | 104 | call | `const icon = strAttr(ctx, 'icon');` |
| strAttr | src/theme/markdown/components.ts | 152 | call | `const icon = strAttr(ctx, 'icon');` |
| strAttr | src/theme/markdown/components.ts | 153 | call | `const href = strAttr(ctx, 'href');` |
| strAttr | src/theme/markdown/components.ts | 290 | call | `const href = strAttr(ctx, 'href') ?? '#';` |
| strAttr | src/theme/markdown/components.ts | 348 | call | `const href = strAttr(ctx, 'href') ?? '#';` |
| strAttr | src/theme/markdown/components.ts | 349 | call | `const kind = strAttr(ctx, 'kind') ?? 'secondary';` |
| AuthBranding | src/admin-club/lib/club-email.ts | 13 | comment | `// \`@glw907/cairn-cms\` exports the Cloudflare Email Sending TYPES (\`AuthBranding\`,` |

Sweep notes:

- Cairn engine version: ^0.96.0 declared in package.json; node_modules not installed, so no installed version available.
- LOAD-BEARING HITS: MediaEntry (2 type annotations + 2 imports in tests), OfficeList (5+ imports across admin routes, 20+ component calls throughout), StatusChip (4+ imports, 30+ component calls), normalizeAssets (1 import + 1 runtime call in config), strAttr (1 import + 7 runtime calls in markdown components).
- INCIDENTAL HITS: AuthBranding appears only in a comment explaining that the engine exports types; MediaEntry also appears in 1 comment in +page.server.ts.
- NOT FOUND: 32 symbols had zero matches.

### xcathletes-org (`^0.96.0`)

| Symbol | File | Line | Kind | Context |
|---|---|---|---|---|
| formatTimestamp | src/routes/team/tokens/+page.svelte | 30 | other | `function formatTimestamp(iso: string \| null): string {` |
| formatTimestamp | src/routes/team/tokens/+page.svelte | 124 | call | `Token renewed. It's good until {formatTimestamp(renewed.expiresAt)}.` |
| formatTimestamp | src/routes/team/tokens/+page.svelte | 203 | call | `First seen {formatTimestamp(token.first_seen_at)} &middot; last used {formatTimestamp(` |
| formatTimestamp | src/routes/team/tokens/+page.svelte | 211 | call | `<p class="text-sm text-error">Revoked {formatTimestamp(token.revoked_at)}</p>` |
| formatTimestamp | src/routes/team/tokens/+page.svelte | 213 | call | `<p class="text-sm text-base-content/70">Expires {formatTimestamp(token.expires_at)}</p>` |
| StatusChip | src/routes/admin/team/[id]/+page.svelte | 14 | import | `import { FieldLabel, SelectInput, StatusChip, TextInput, formatPhone, type StatusChipTone } from '@glw907/cairn-cms/admin-toolkit';` |
| StatusChip | src/routes/admin/team/[id]/+page.svelte | 20 | type-annotation | `const WAIVER_CHIP: Record<RosterRow['waiverStatus'], { label: string; tone: StatusChipTone }> = {` |
| StatusChip | src/routes/admin/team/[id]/+page.svelte | 60 | call | `<StatusChip tone={WAIVER_CHIP[row.waiverStatus].tone} label={\`Waiver: ${WAIVER_CHIP[row.waiverStatus].label}\`} />` |
| StatusChip | src/routes/admin/team/+page.svelte | 6 | comment | `\`StatusChip\`, \`Pagination\`, \`EmptyState\`, \`TextInput\`, \`SelectInput\`) per the family's compiled-CSS` |
| StatusChip | src/routes/admin/team/+page.svelte | 28 | import | `StatusChip,` |
| StatusChip | src/routes/admin/team/+page.svelte | 32 | type-annotation | `type StatusChipTone,` |
| StatusChip | src/routes/admin/team/+page.svelte | 41 | type-annotation | `const WAIVER_CHIP: Record<RosterRow['waiverStatus'], { label: string; tone: StatusChipTone }> = {` |
| StatusChip | src/routes/admin/team/+page.svelte | 53 | type-annotation | `const REACHABILITY_CHIP: Record<Reachability, { label: string; tone: StatusChipTone }> = {` |
| StatusChip | src/routes/admin/team/+page.svelte | 149 | call | `<td><StatusChip tone={WAIVER_CHIP[row.waiverStatus].tone} label={WAIVER_CHIP[row.waiverStatus].label} /></td>` |
| StatusChip | src/routes/admin/team/+page.svelte | 150 | call | `<td><StatusChip tone={REACHABILITY_CHIP[row.reachability].tone} label={REACHABILITY_CHIP[row.reachability].label} /></td>` |
| normalizeAssets | src/theme/cairn.config.ts | 8 | import | `import { normalizeAssets, buildMediaResolver, readCommittedManifest } from '@glw907/cairn-cms/media';` |
| normalizeAssets | src/theme/cairn.config.ts | 371 | call | `const resolvedAssets = normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' });` |
| strAttr | src/theme/cairn.config.ts | 7 | import | `import { cardShell, headRow, strAttr } from '@glw907/cairn-cms/render';` |
| strAttr | src/theme/cairn.config.ts | 106 | call | `const name = strAttr(ctx, 'icon');` |
| strAttr | src/theme/cairn.config.ts | 107 | call | `const role = strAttr(ctx, 'role');` |
| strAttr | src/theme/cairn.config.ts | 146 | call | `const name = strAttr(ctx, 'name');` |
| strAttr | src/theme/cairn.config.ts | 176 | call | `const url = strAttr(ctx, 'url') ?? '';` |
| strAttr | src/theme/cairn.config.ts | 177 | call | `const title = strAttr(ctx, 'title') ?? '';` |
| strAttr | src/theme/cairn.config.ts | 216 | call | `const attribution = strAttr(ctx, 'attribution');` |
| strAttr | src/theme/cairn.config.ts | 243 | call | `const label = strAttr(ctx, 'label') ?? '';` |
| strAttr | src/theme/cairn.config.ts | 244 | call | `const url = strAttr(ctx, 'url') ?? '';` |
| strAttr | src/theme/cairn.config.ts | 245 | call | `const variant = strAttr(ctx, 'variant') \|\| 'primary';` |
| strAttr | src/theme/cairn.config.ts | 270 | call | `const label = strAttr(ctx, 'label') ?? '';` |
| strAttr | src/theme/cairn.config.ts | 271 | call | `const url = strAttr(ctx, 'url') ?? '';` |
| strAttr | src/theme/cairn.config.ts | 272 | call | `const note = strAttr(ctx, 'note');` |
| strAttr | src/theme/cairn.config.ts | 297 | call | `const question = strAttr(ctx, 'question') ?? '';` |
| strAttr | src/theme/cairn.config.ts | 334 | call | `const message = strAttr(ctx, 'message') ?? '';` |
| strAttr | src/theme/cairn.config.ts | 335 | call | `const expires = strAttr(ctx, 'expires');` |

Sweep notes:

- StatusChip: Load-bearing import from @glw907/cairn-cms/admin-toolkit. Used as component in admin roster and team pages. Runtime call paths.
- normalizeAssets: Load-bearing import from @glw907/cairn-cms/media. Called once at module level to configure asset resolution for media pipeline.
- strAttr: Load-bearing import from @glw907/cairn-cms/render. Called 14 times across component build functions to extract string attributes from component context.
- formatTimestamp: Not load-bearing for cairn engine. This is a locally-defined function in the tokens page (not imported from cairn-cms). It's used internally to format ISO timestamps for token metadata display.

### cairn-pub (`0.94.0-rc.1`, exact pin)

| Symbol | File | Line | Kind | Context |
|---|---|---|---|---|
| strAttr | src/theme/cairn.config.ts | 4 | import | `import { cardShell, headRow, strAttr } from '@glw907/cairn-cms/render';` |
| strAttr | src/theme/cairn.config.ts | 104 | call | `const name = strAttr(ctx, 'icon');` |
| strAttr | src/theme/cairn.config.ts | 105 | call | `const role = strAttr(ctx, 'role');` |
| strAttr | src/theme/cairn.config.ts | 144 | call | `const name = strAttr(ctx, 'name');` |
| strAttr | src/theme/cairn.config.ts | 174 | call | `const url = strAttr(ctx, 'url') ?? '';` |
| strAttr | src/theme/cairn.config.ts | 175 | call | `const title = strAttr(ctx, 'title') ?? '';` |
| strAttr | src/theme/cairn.config.ts | 214 | call | `const attribution = strAttr(ctx, 'attribution');` |
| strAttr | src/theme/cairn.config.ts | 241 | call | `const label = strAttr(ctx, 'label') ?? '';` |
| strAttr | src/theme/cairn.config.ts | 242 | call | `const url = strAttr(ctx, 'url') ?? '';` |
| strAttr | src/theme/cairn.config.ts | 243 | call | `const variant = strAttr(ctx, 'variant') \|\| 'primary';` |
| strAttr | src/theme/cairn.config.ts | 268 | call | `const label = strAttr(ctx, 'label') ?? '';` |
| strAttr | src/theme/cairn.config.ts | 269 | call | `const url = strAttr(ctx, 'url') ?? '';` |
| strAttr | src/theme/cairn.config.ts | 270 | call | `const note = strAttr(ctx, 'note');` |
| strAttr | src/theme/cairn.config.ts | 295 | call | `const question = strAttr(ctx, 'question') ?? '';` |
| strAttr | src/theme/cairn.config.ts | 332 | call | `const message = strAttr(ctx, 'message') ?? '';` |
| strAttr | src/theme/cairn.config.ts | 333 | call | `const expires = strAttr(ctx, 'expires');` |
| normalizeAssets | src/theme/cairn.config.ts | 5 | import | `import { normalizeAssets, buildMediaResolver, readCommittedManifest } from '@glw907/cairn-cms/media';` |
| normalizeAssets | src/theme/cairn.config.ts | 373 | call | `const resolvedAssets = normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' });` |

Sweep notes:

- cairn-cms version: 0.94.0-rc.1 (fixed version, not a range); node_modules not present, so installed version cannot be verified.
- strAttr: load-bearing runtime call path; imported from '@glw907/cairn-cms/render' and used extensively (15 calls) in component build functions to safely extract typed attributes from component contexts.
- normalizeAssets: load-bearing runtime call path; imported from '@glw907/cairn-cms/media' and called once in the adapter configuration to initialize the public media resolver backing committed content.
- All other 36 requested symbols had zero hits in the repo's own source; they are absent from cairn-pub.

## 4. Implications for 4b

**Tier 1 retires: no live consumers anywhere.** All 25 Tier 1 symbols
(including `MediaDeleteRefusal` and `MediaReplaceFailure`, which also appear in
the routed list) have zero hits across all five repos. The ratification gate
carries no consumer-breakage risk for the Tier 1 partition; these are the cheap
retires. The one caveat is the pin staleness above: 907-life at `^0.84.4` in
particular cannot exercise surface added after 0.84, so a Tier 1 symbol
introduced recently is unverifiable there. Given the Tier 1 set is being retired
precisely because nothing uses it, this caveat is theoretical, but the
ratification note should record it.

**Reshapes that touch public signatures with live consumers:**

- `normalizeAssets` (`/media`): every consumer calls it at config init with
  `{ bucketBinding: 'MEDIA_BUCKET' }`. Any signature or return-shape change is a
  five-site `Consumers must:` event.
- `strAttr` (`/render`): four repos, 7 to 16 call sites each, all the
  two-argument `(ctx, name)` form with `?? ` fallback idioms. Signature changes
  ripple widely; keep the nullable-string return contract.
- `StatusChip` + `StatusChipTone` (`/admin-toolkit`): aksailingclub-org and
  xcathletes-org render it with props `tone`, `label`, `register`, `size`, and
  annotate lookup tables with `StatusChipTone`. Prop renames or tone-set changes
  break both.
- `OfficeList` (`/admin-toolkit`): aksailingclub-org imports it across five-plus
  admin routes. Any reshape needs that repo in the upgrade list.
- `MediaEntry` (`/media`): aksailingclub-org's tests build fixture entries
  against the type. Field changes fail its test suite, not its runtime.

**Incidental only:** `AuthBranding` appears in one aksailingclub-org comment;
`formatTimestamp` in xcathletes-org is a same-named local function, not an
engine import. Neither constrains 4b.
