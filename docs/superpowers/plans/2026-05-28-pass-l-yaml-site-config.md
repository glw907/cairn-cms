# Pass L: Canonical YAML site-config (read side + migration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a git-committed `src/lib/site.config.yaml` the canonical source for each site's author-editable config (identity, nav menu, email sender, footer, settings), read at build time, with no user-visible change.

**Architecture:** The engine (`@glw907/cairn-cms`) gains `parseSiteConfig`/`extractMenu` plus a `SiteConfig` type (in `src/lib/nav.ts`, beside the kept `NavNode`/`validateNavTree`). Each site adds a YAML file, imports it with Vite's `?raw`, parses it once in `config.ts`, and re-exports the existing `SITE_*` constants plus a `PRIMARY_NAV` from the parsed object. `cairn.config.ts`, `Nav.svelte`, the footer, and the contact sender then read from that one source. Values are copied verbatim, so output is identical. This is the read side only: the nav editing UI and the D1-store teardown are Pass L2.

**Tech Stack:** TypeScript, SvelteKit, Vitest, the `yaml` package (eemeli/yaml), Vite `?raw` imports, npm workspaces (the sites consume the engine via the workspace symlink in dev).

**Spec:** `docs/superpowers/specs/2026-05-27-pass-l-yaml-site-config-design.md`

**Pass-end note:** The cairn-pass consolidation ritual (code-simplifier over the changed engine code, then the per-pass verification and the PLAN.md progress entry) runs after the last task. Per-task commits below do not each run code-simplifier.

---

## File Structure

**Engine (`/home/glw907/Projects/cairn/cairn-cms`):**
- Modify: `package.json` (add `yaml` dependency; add `sideEffects` for tree-shaking)
- Modify: `src/lib/nav.ts` (add `SiteConfig`, `SiteConfigError`, `parseSiteConfig`, `extractMenu`; keep everything already there)
- Create: `src/tests/site-config.test.ts`
- (No barrel change: `src/lib/index.ts` already does `export * from './nav'`.)

**ecnordic-ski (`/home/glw907/Projects/cairn/ecnordic-ski`):**
- Create: `src/lib/site.config.yaml`
- Modify: `src/lib/config.ts` (parse the YAML; re-export `SITE_*`, `POST_TAGS`, `siteConfig`, `PRIMARY_NAV`; keep `WELCOME_BLURB`)
- Modify: `src/lib/cairn.config.ts` (`siteName`/`sender` from `siteConfig`)
- Modify: `src/lib/components/Nav.svelte` (iterate `PRIMARY_NAV`)
- Modify: `src/routes/+layout.svelte` (footer credit from `siteConfig`)
- Modify: `src/lib/contact.remote.ts` (sender from `siteConfig`)

**907-life (`/home/glw907/Projects/cairn/907-life`):**
- Create: `src/lib/site.config.yaml`
- Modify: `src/lib/config.ts`
- Modify: `src/lib/cairn.config.ts`
- Modify: `src/lib/components/Nav.svelte` (literal links to `{#each PRIMARY_NAV}`)
- Modify: `src/routes/about/+page.server.ts` (sender from `siteConfig`)

---

## Task 1: Add the `yaml` dependency and enable tree-shaking (engine)

**Files:**
- Modify: `/home/glw907/Projects/cairn/cairn-cms/package.json`

`config.ts` is imported by client components (for `SITE_TITLE` in `<svelte:head>`), and it will import from the engine's main barrel. Adding `sideEffects` lets the bundler drop the unused barrel modules (render/github/etc.) instead of shipping them to the browser. The `.svelte`/`.css` entries keep component styles from being stripped.

- [ ] **Step 1: Add `yaml` to dependencies and the `sideEffects` field**

In `package.json`, add a top-level `"sideEffects"` key right after `"type": "module"`:

```json
  "type": "module",
  "sideEffects": [
    "**/*.svelte",
    "**/*.css"
  ],
```

And add `"yaml": "^2"` to the `dependencies` block:

```json
    "yaml": "^2"
```

- [ ] **Step 2: Install at the workspace root so `yaml` hoists for the symlinked source**

Run:
```bash
cd /home/glw907/Projects/cairn && npm install
```
Expected: completes without error. The sites resolve the engine's source through the workspace symlink, so the dep must be hoisted to the root `node_modules`.

Verify:
```bash
node -e "require('yaml'); console.log('yaml resolves')"
```
Expected: `yaml resolves`

- [ ] **Step 3: Commit**

```bash
cd /home/glw907/Projects/cairn/cairn-cms
git add package.json
git commit -m "$(cat <<'EOF'
feat(nav): add yaml dep and sideEffects for site-config parsing

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add `SiteConfig`, `parseSiteConfig`, and `extractMenu` (engine, TDD)

**Files:**
- Modify: `/home/glw907/Projects/cairn/cairn-cms/src/lib/nav.ts`
- Create: `/home/glw907/Projects/cairn/cairn-cms/src/tests/site-config.test.ts`

Keep all existing exports in `nav.ts` (`NavNode`, `MAX_NAV_NODES`, `NavValidationError`, `validateNavTree`, `NavEnv`, `readNavTree`, `writeNavTree`, `loadNav`). This task is purely additive; the D1 store stays for Pass L2 to rework.

- [ ] **Step 1: Write the failing test**

Create `src/tests/site-config.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseSiteConfig, extractMenu, SiteConfigError } from '../lib/nav';

const SAMPLE = `
siteName: Test Site
description: A test.
url: https://test.example
menus:
  primary:
    - { label: Home, url: / }
    - label: Group
      children:
        - { label: Child, url: /child }
settings:
  feedMaxItems: 20
`;

describe('parseSiteConfig', () => {
  it('parses a well-formed config', () => {
    const config = parseSiteConfig(SAMPLE);
    expect(config.siteName).toBe('Test Site');
    expect(config.url).toBe('https://test.example');
    expect(config.settings?.feedMaxItems).toBe(20);
  });

  it('throws on a non-mapping root', () => {
    expect(() => parseSiteConfig('- just\n- a list')).toThrow(SiteConfigError);
  });

  it('throws when siteName is missing', () => {
    expect(() => parseSiteConfig('description: no name')).toThrow(SiteConfigError);
  });
});

describe('extractMenu', () => {
  it('returns a validated, nested menu', () => {
    const tree = extractMenu(parseSiteConfig(SAMPLE), 'primary', 2);
    expect(tree).toEqual([
      { label: 'Home', url: '/' },
      { label: 'Group', children: [{ label: 'Child', url: '/child' }] },
    ]);
  });

  it('returns [] for an absent menu', () => {
    expect(extractMenu(parseSiteConfig(SAMPLE), 'footer', 2)).toEqual([]);
  });

  it('throws when a node has no label', () => {
    const bad = parseSiteConfig('siteName: X\nmenus:\n  primary:\n    - { url: /x }');
    expect(() => extractMenu(bad, 'primary', 2)).toThrow();
  });

  it('throws when nesting exceeds maxDepth', () => {
    expect(() => extractMenu(parseSiteConfig(SAMPLE), 'primary', 1)).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd /home/glw907/Projects/cairn/cairn-cms && npx vitest run src/tests/site-config.test.ts
```
Expected: FAIL (`parseSiteConfig`/`extractMenu`/`SiteConfigError` are not exported yet).

- [ ] **Step 3: Implement the additions in `nav.ts`**

At the top of `src/lib/nav.ts`, below the existing `import type { D1Database } ...` line, add:

```ts
import { parse as parseYaml } from 'yaml';
```

At the end of `src/lib/nav.ts`, append:

```ts
/**
 * The site-config file shape (`src/lib/site.config.yaml`), the canonical home for a site's
 * author-editable config. Permissive: unknown keys are ignored, so the file can grow without an
 * engine change. Read at build time by the public site; nav is edited via the admin in Pass L2.
 */
export interface SiteConfig {
  siteName: string;
  description?: string;
  author?: string;
  url?: string;
  locale?: string;
  /** Named navigation menus, each a NavNode[] (normalized by extractMenu). */
  menus?: Record<string, unknown>;
  email?: { sender?: string; senderName?: string };
  footer?: { copyrightName?: string };
  settings?: {
    feedMaxItems?: number;
    homepageFeaturedCount?: number;
    postTags?: string[];
    [key: string]: unknown;
  };
}

export class SiteConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SiteConfigError';
  }
}

/** Parse the YAML site-config text into a typed object. Throws SiteConfigError on a malformed root. */
export function parseSiteConfig(raw: string): SiteConfig {
  const parsed = parseYaml(raw) as unknown;
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new SiteConfigError('Site config must be a YAML mapping');
  }
  const config = parsed as SiteConfig;
  if (typeof config.siteName !== 'string' || !config.siteName.trim()) {
    throw new SiteConfigError('Site config needs a siteName');
  }
  return config;
}

/**
 * Pull one named menu's nodes from a parsed config and validate them, returning [] when the menu is
 * absent. The public read path's normalization step (build-time, in the site's nav rendering).
 */
export function extractMenu(config: SiteConfig, name: string, maxDepth: number): NavNode[] {
  const menu = config.menus?.[name];
  if (menu === undefined) return [];
  return validateNavTree(menu, maxDepth);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
cd /home/glw907/Projects/cairn/cairn-cms && npx vitest run src/tests/site-config.test.ts
```
Expected: PASS (9 assertions across 2 suites).

- [ ] **Step 5: Commit**

```bash
cd /home/glw907/Projects/cairn/cairn-cms
git add src/lib/nav.ts src/tests/site-config.test.ts
git commit -m "$(cat <<'EOF'
feat(nav): add SiteConfig parse + menu extract for YAML site-config

parseSiteConfig/extractMenu read the build-time YAML site-config and
normalize a named menu via the existing validateNavTree. Additive; the
D1 nav store stays for the Pass L2 editing rework.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Verify the package still builds and tests green (engine)

**Files:** none (verification only).

- [ ] **Step 1: Run the full package test suite**

Run:
```bash
cd /home/glw907/Projects/cairn/cairn-cms && npx vitest run
```
Expected: all tests pass (the prior 83 plus the 9 new site-config assertions).

- [ ] **Step 2: Confirm `svelte-package` emits cleanly**

Run:
```bash
cd /home/glw907/Projects/cairn/cairn-cms && npm run package
```
Expected: completes without error. Quick check that the new API is emitted:
```bash
grep -l "parseSiteConfig" dist/nav.d.ts
```
Expected: `dist/nav.d.ts`

---

## Task 4: Capture characterization baselines (both sites)

**Files:** none (captures pre-migration build output for the verify tasks).

The engine change so far is additive and does not affect site output, so the baseline is valid. `feed.xml` concentrates every identity value (`SITE_TITLE`/`SITE_DESCRIPTION`/`SITE_URL`/`SITE_AUTHOR`); `index.html` carries the nav and footer.

- [ ] **Step 1: Build ecnordic and snapshot**

Run:
```bash
cd /home/glw907/Projects/cairn/ecnordic-ski && npm run build
mkdir -p /tmp/passL-char/ecnordic-before
cp .svelte-kit/cloudflare/index.html .svelte-kit/cloudflare/feed.xml /tmp/passL-char/ecnordic-before/
```
Expected: build succeeds; both files copied. If `feed.xml` is not at that path, locate it with `find .svelte-kit/cloudflare -name 'feed.xml'` and use that path consistently in Task 7.

- [ ] **Step 2: Build 907 and snapshot**

Run:
```bash
cd /home/glw907/Projects/cairn/907-life && npm run build
mkdir -p /tmp/passL-char/907-before
cp .svelte-kit/cloudflare/index.html .svelte-kit/cloudflare/feed.xml /tmp/passL-char/907-before/
```
Expected: build succeeds; both files copied.

---

## Task 5: ecnordic site.config.yaml + config.ts rework

**Files:**
- Create: `/home/glw907/Projects/cairn/ecnordic-ski/src/lib/site.config.yaml`
- Modify: `/home/glw907/Projects/cairn/ecnordic-ski/src/lib/config.ts`

- [ ] **Step 1: Create `src/lib/site.config.yaml`**

```yaml
siteName: EC Nordic
description: "REPLACE_WITH_VERBATIM_SITE_DESCRIPTION"
author: EC Nordic
url: https://ecnordic.ski
locale: en-US

menus:
  primary:
    - { label: About, url: /about }
    - { label: Training, url: /training }
    - { label: Volunteers, url: /volunteers }
    - { label: CrewLAB, url: /crewlab }
    - { label: Resources, url: /resources }
    - { label: Contact, url: /contact }

email:
  sender: noreply@ecnordic.ski
  senderName: ECN Nordic Contact

footer:
  copyrightName: East Community Nordic

settings:
  feedMaxItems: 20
  homepageFeaturedCount: 1
  postTags: [training, racing, results, events, camp, announcements]
```

**The `description` value (important):** set `description:` to the exact string currently assigned to `SITE_DESCRIPTION` in `src/lib/config.ts`, copied byte-for-byte (keep the surrounding double quotes). It contains an em-dash punctuation character; this plan shows the `REPLACE_WITH_VERBATIM_SITE_DESCRIPTION` marker only because the prose guard rejects that character inside this plan file. The Task 7 characterization diff on `feed.xml` fails if the copied value differs by even one character, so this is self-checking.

- [ ] **Step 2: Rework `src/lib/config.ts`**

Replace the whole file with:

```ts
import { parseSiteConfig, extractMenu } from '@glw907/cairn-cms';
import raw from './site.config.yaml?raw';

/** The site's canonical config, read from the git-committed YAML at build time (Pass L). */
export const siteConfig = parseSiteConfig(raw);

export const SITE_URL                = siteConfig.url ?? '';
export const SITE_TITLE              = siteConfig.siteName;
export const SITE_DESCRIPTION        = siteConfig.description ?? '';
export const SITE_AUTHOR             = siteConfig.author ?? '';
export const SITE_LOCALE             = siteConfig.locale ?? 'en-US';
export const FEED_MAX_ITEMS          = siteConfig.settings?.feedMaxItems ?? 20;
export const HOMEPAGE_FEATURED_COUNT = siteConfig.settings?.homepageFeaturedCount ?? 1;

/** Controlled tag vocabulary for posts. Frontmatter tags outside this set fail the build. */
export const POST_TAGS: readonly string[] = siteConfig.settings?.postTags ?? [];

/** The primary header navigation, read from the site config (Pass L). */
export const PRIMARY_NAV = extractMenu(siteConfig, 'primary', 2);

// cairn-cms: the backend repo and editable collections live in the site adapter
// (`src/lib/cairn.config.ts`), behind cairn-core's CairnAdapter seam (Pass D).

// Homepage welcome copy. This is prose content, not site config, so it stays here until it is
// modeled as a reusable markdown content fragment (see cairn-cms PLAN.md, reusable-content fragments).
export const WELCOME_BLURB =
  'East Community Nordic is a free, volunteer-run summer training group for ' +
  'Anchorage high school Nordic skiers and cross-country runners. We build the ' +
  'fitness, skills, and outdoor habits that carry kids through the ski season ' +
  'and past graduation.';
```

- [ ] **Step 3: Run svelte-check**

Run:
```bash
cd /home/glw907/Projects/cairn/ecnordic-ski && npm run check
```
Expected: 0 errors, 0 warnings. If the `./site.config.yaml?raw` import errors with "Cannot find module", add `/// <reference types="vite/client" />` as the first line of `src/app.d.ts`, then re-run (the project already uses `?raw` for posts, so this is usually already resolved).

- [ ] **Step 4: Commit**

```bash
cd /home/glw907/Projects/cairn/ecnordic-ski
git add src/lib/site.config.yaml src/lib/config.ts
git commit -m "$(cat <<'EOF'
feat(config): read site config from git-committed site.config.yaml

Identity, nav, email sender, footer, and settings now come from
src/lib/site.config.yaml, parsed once at build time via the cairn-cms
engine. Values copied verbatim; no user-visible change. WELCOME_BLURB
stays a constant (content, not config).

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: ecnordic, repoint the consumers (adapter, nav, footer, contact)

**Files:**
- Modify: `/home/glw907/Projects/cairn/ecnordic-ski/src/lib/cairn.config.ts`
- Modify: `/home/glw907/Projects/cairn/ecnordic-ski/src/lib/components/Nav.svelte`
- Modify: `/home/glw907/Projects/cairn/ecnordic-ski/src/routes/+layout.svelte`
- Modify: `/home/glw907/Projects/cairn/ecnordic-ski/src/lib/contact.remote.ts`

- [ ] **Step 1: `cairn.config.ts` siteName and sender from the config**

In `src/lib/cairn.config.ts`, change the `POST_TAGS` import line:

```ts
import { POST_TAGS, siteConfig } from './config';
```

and replace the two literal lines:

```ts
  siteName: 'EC Nordic',
  sender: 'noreply@ecnordic.ski',
```
with:
```ts
  siteName: siteConfig.siteName,
  sender: siteConfig.email?.sender ?? 'noreply@ecnordic.ski',
```

- [ ] **Step 2: `Nav.svelte` iterate `PRIMARY_NAV`**

In `src/lib/components/Nav.svelte`, add to the `<script>` imports (after the existing `import { page } ...` line):

```ts
  import { PRIMARY_NAV } from '$lib/config';
```

Delete the local `const navLinks = [ ... ];` block. Then change the desktop loop to:

```svelte
      {#each PRIMARY_NAV as link}
        <a
          href={link.url ?? '#'}
          class="nav-link"
          class:active={isActive(link.url ?? '')}
          aria-current={isActive(link.url ?? '') ? 'page' : undefined}
        >{link.label}</a>
      {/each}
```

and the mobile loop to:

```svelte
      {#each PRIMARY_NAV as link}
        <a
          href={link.url ?? '#'}
          class="mobile-link"
          class:active={isActive(link.url ?? '')}
          aria-current={isActive(link.url ?? '') ? 'page' : undefined}
          onclick={closeMobile}
        >{link.label}</a>
      {/each}
```

(All current items have a `url`, so the `?? '#'`/`?? ''` fallbacks never trigger; they only satisfy the optional `url` type.)

- [ ] **Step 3: `+layout.svelte` footer credit from the config**

In `src/routes/+layout.svelte`, import `siteConfig` in the `<script>` (add `import { siteConfig } from '$lib/config';`, or add `siteConfig` to an existing `$lib/config` import). Then change:

```svelte
  <p class="footer-name">© {new Date().getFullYear()} East Community Nordic</p>
```
to:
```svelte
  <p class="footer-name">© {new Date().getFullYear()} {siteConfig.footer?.copyrightName ?? 'East Community Nordic'}</p>
```

- [ ] **Step 4: `contact.remote.ts` sender from the config**

In `src/lib/contact.remote.ts`, add the import near the top:

```ts
import { siteConfig } from './config';
```

Change:
```ts
const SENDER = 'noreply@ecnordic.ski';
```
to:
```ts
const SENDER = siteConfig.email?.sender ?? 'noreply@ecnordic.ski';
```

and change the sender display name:
```ts
    msg.setSender({ name: 'ECN Nordic Contact', addr: SENDER });
```
to:
```ts
    msg.setSender({ name: siteConfig.email?.senderName ?? 'ECN Nordic Contact', addr: SENDER });
```

- [ ] **Step 5: Run svelte-check**

Run:
```bash
cd /home/glw907/Projects/cairn/ecnordic-ski && npm run check
```
Expected: 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
cd /home/glw907/Projects/cairn/ecnordic-ski
git add src/lib/cairn.config.ts src/lib/components/Nav.svelte src/routes/+layout.svelte src/lib/contact.remote.ts
git commit -m "$(cat <<'EOF'
refactor: source adapter, nav, footer, sender from site config

The adapter siteName/sender, the header nav, the footer credit, and the
contact sender now read from siteConfig, removing the duplicated
literals. Values unchanged.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: ecnordic verify (build + characterization)

**Files:** none (verification only).

- [ ] **Step 1: Build**

Run:
```bash
cd /home/glw907/Projects/cairn/ecnordic-ski && npm run build
```
Expected: build succeeds.

- [ ] **Step 2: feed.xml must be byte-identical**

Run:
```bash
diff /tmp/passL-char/ecnordic-before/feed.xml .svelte-kit/cloudflare/feed.xml && echo "FEED IDENTICAL"
```
Expected: `FEED IDENTICAL` (no diff output). A diff here means an identity value was not copied verbatim (most likely `description`); fix the YAML to match `SITE_DESCRIPTION` exactly.

- [ ] **Step 3: homepage must be byte-identical**

ecnordic's `Nav.svelte` already used `{#each}`, so swapping the data source does not change markup.
```bash
diff /tmp/passL-char/ecnordic-before/index.html .svelte-kit/cloudflare/index.html && echo "HOME IDENTICAL"
```
Expected: `HOME IDENTICAL`. If the only diff is the footer year (it uses `new Date()`), that is acceptable and means a date rollover between the two builds. Any nav or identity diff is a defect to fix.

---

## Task 8: 907 site.config.yaml + config.ts rework

**Files:**
- Create: `/home/glw907/Projects/cairn/907-life/src/lib/site.config.yaml`
- Modify: `/home/glw907/Projects/cairn/907-life/src/lib/config.ts`

- [ ] **Step 1: Create `src/lib/site.config.yaml`**

```yaml
siteName: 907.life
description: A personal blog by Geoffrey L. Wright
author: Geoffrey L. Wright
url: https://907.life
locale: en-US

menus:
  primary:
    - { label: Archives, url: /archives }
    - { label: About, url: /about }
    - { label: Contact, url: /about#contact }

email:
  sender: noreply@907.life
  senderName: Contact Form

settings:
  feedMaxItems: 20
  homepageFeaturedCount: 1
```

(907 has no controlled `postTags` and no footer `copyrightName`; its footer already renders `{SITE_TITLE}`, which now comes from the YAML.)

- [ ] **Step 2: Rework `src/lib/config.ts`**

Replace the whole file with:

```ts
import { parseSiteConfig, extractMenu } from '@glw907/cairn-cms';
import raw from './site.config.yaml?raw';

/** The site's canonical config, read from the git-committed YAML at build time (Pass L). */
export const siteConfig = parseSiteConfig(raw);

export const SITE_URL                = siteConfig.url ?? '';
export const SITE_TITLE              = siteConfig.siteName;
export const SITE_DESCRIPTION        = siteConfig.description ?? '';
export const SITE_AUTHOR             = siteConfig.author ?? '';
export const SITE_LOCALE             = siteConfig.locale ?? 'en-US';
export const FEED_MAX_ITEMS          = siteConfig.settings?.feedMaxItems ?? 20;  // 0 = include all posts
export const HOMEPAGE_FEATURED_COUNT = siteConfig.settings?.homepageFeaturedCount ?? 1;

/** The primary header navigation, read from the site config (Pass L). */
export const PRIMARY_NAV = extractMenu(siteConfig, 'primary', 2);
```

- [ ] **Step 3: Run svelte-check**

Run:
```bash
cd /home/glw907/Projects/cairn/907-life && npm run check
```
Expected: 0 errors, 0 warnings. (If the `?raw` import errors, add `/// <reference types="vite/client" />` to the top of `src/app.d.ts`; 907 already uses `?raw` for posts, so this is usually resolved.)

- [ ] **Step 4: Commit**

```bash
cd /home/glw907/Projects/cairn/907-life
git add src/lib/site.config.yaml src/lib/config.ts
git commit -m "$(cat <<'EOF'
feat(config): read site config from git-committed site.config.yaml

Identity, nav, email sender, and settings now come from
src/lib/site.config.yaml, parsed at build time via the cairn-cms engine.
Values copied verbatim; no user-visible change.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: 907, repoint the consumers (adapter, nav, contact)

**Files:**
- Modify: `/home/glw907/Projects/cairn/907-life/src/lib/cairn.config.ts`
- Modify: `/home/glw907/Projects/cairn/907-life/src/lib/components/Nav.svelte`
- Modify: `/home/glw907/Projects/cairn/907-life/src/routes/about/+page.server.ts`

- [ ] **Step 1: `cairn.config.ts` siteName and sender from the config**

In `src/lib/cairn.config.ts`, add the import after the `validatePostFrontmatter` import:

```ts
import { siteConfig } from './config';
```

and replace:
```ts
  siteName: '907.life',
  sender: 'noreply@907.life',
```
with:
```ts
  siteName: siteConfig.siteName,
  sender: siteConfig.email?.sender ?? 'noreply@907.life',
```

- [ ] **Step 2: `Nav.svelte` replace the literal links with `{#each PRIMARY_NAV}`**

In `src/lib/components/Nav.svelte`, add to the `<script>` imports (after `import { browser } ...`):

```ts
  import { PRIMARY_NAV } from '$lib/config';
```

Replace the three literal anchors:
```svelte
      <a href="/archives" class="nav-link">Archives</a>
      <a href="/about" class="nav-link">About</a>
      <a href="/about#contact" class="nav-link">Contact</a>
```
with:
```svelte
      {#each PRIMARY_NAV as link}
        <a href={link.url ?? '#'} class="nav-link">{link.label}</a>
      {/each}
```

- [ ] **Step 3: `about/+page.server.ts` sender from the config**

In `src/routes/about/+page.server.ts`, add the import with the other imports near the top:

```ts
import { siteConfig } from '$lib/config';
```

Replace:
```ts
    msg.setSender({ name: 'Contact Form', addr: 'noreply@907.life' });
```
with:
```ts
    msg.setSender({
      name: siteConfig.email?.senderName ?? 'Contact Form',
      addr: siteConfig.email?.sender ?? 'noreply@907.life',
    });
```

and replace:
```ts
    await sendEmail.send(new EmailMessage('noreply@907.life', contactEmail, msg.asRaw()));
```
with:
```ts
    await sendEmail.send(
      new EmailMessage(siteConfig.email?.sender ?? 'noreply@907.life', contactEmail, msg.asRaw()),
    );
```

- [ ] **Step 4: Run svelte-check**

Run:
```bash
cd /home/glw907/Projects/cairn/907-life && npm run check
```
Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
cd /home/glw907/Projects/cairn/907-life
git add src/lib/cairn.config.ts src/lib/components/Nav.svelte src/routes/about/+page.server.ts
git commit -m "$(cat <<'EOF'
refactor: source adapter, nav, sender from site config

The adapter siteName/sender, the header nav, and the contact sender now
read from siteConfig, removing the duplicated literals. Values unchanged.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: 907 verify (build + characterization)

**Files:** none (verification only).

- [ ] **Step 1: Build**

Run:
```bash
cd /home/glw907/Projects/cairn/907-life && npm run build
```
Expected: build succeeds.

- [ ] **Step 2: feed.xml must be byte-identical**

Run:
```bash
diff /tmp/passL-char/907-before/feed.xml .svelte-kit/cloudflare/feed.xml && echo "FEED IDENTICAL"
```
Expected: `FEED IDENTICAL`. A diff means an identity value was not copied verbatim; fix the YAML.

- [ ] **Step 3: homepage nav unchanged (whitespace-normalized)**

907's `Nav.svelte` changed from literal anchors to `{#each}`, which can shift inter-tag whitespace, so compare with whitespace between tags collapsed:

```bash
norm() { sed -E ':a;N;$!ba;s/>[[:space:]]+</></g' "$1"; }
diff <(norm /tmp/passL-char/907-before/index.html) <(norm .svelte-kit/cloudflare/index.html) && echo "HOME EQUIVALENT"
```
Expected: `HOME EQUIVALENT`. Then confirm each nav link is present and correct:
```bash
grep -o 'href="/archives" class="nav-link">Archives' .svelte-kit/cloudflare/index.html
grep -o 'href="/about" class="nav-link">About' .svelte-kit/cloudflare/index.html
grep -o 'href="/about#contact" class="nav-link">Contact' .svelte-kit/cloudflare/index.html
```
Expected: each prints its match. Any missing link or non-whitespace diff is a defect to fix.

---

## Task 11: Pass-end consolidation (cairn-pass ritual)

**Files:** `docs/PLAN.md` (progress entry).

- [ ] **Step 1: code-simplifier over the changed engine code**

Dispatch the `code-simplifier:code-simplifier` agent over the Task 2 additions in `src/lib/nav.ts` and `src/tests/site-config.test.ts`. Apply any refinements, re-run `npx vitest run`, and commit if it changed anything.

- [ ] **Step 2: Final gate recap**

Confirm and record: package `npx vitest run` green and `npm run package` clean; both sites `npm run check` 0/0 and `npm run build` succeed; both `feed.xml` byte-identical and both homepages unchanged (ecnordic byte-identical, 907 whitespace-normalized equivalent with all nav links present).

- [ ] **Step 3: Update `docs/PLAN.md`**

Append a "Pass L" progress entry to the Notes / progress log: what was built (the engine read layer; both sites sourcing identity/nav/email/footer/settings from `site.config.yaml`), the verification evidence (test counts, characterization results), and what stays for Pass L2 (the D1-store teardown, `navMenus` to `navMenu`, `navLoad`/`navSave` rework to read-and-commit the YAML, the `admin/nav` route, NavTree). Note the accepted residual: `config.ts` pulls the `yaml` parser (and a tree-shaken slice of the engine) into the client bundle; the `sideEffects` field keeps that minimal, and the bundle stays well under the size guard.

- [ ] **Step 4: Commit the plan/PLAN.md updates**

```bash
cd /home/glw907/Projects/cairn/cairn-cms
git add docs/PLAN.md
git commit -m "$(cat <<'EOF'
docs(plan): record Pass L (YAML site-config read side + migration)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Engine `SiteConfig`/`parseSiteConfig`/`extractMenu` + `yaml` dep: Tasks 1 to 3. ✓
- D1 store kept for L2 (additive, no teardown this pass): Task 2 note. ✓
- File `src/lib/site.config.yaml` on both sites with the agreed shape (identity, `menus` map, `email`, `footer`, `settings`; 907 minus postTags): Tasks 5, 8. ✓
- Repoint `config.ts`, `cairn.config.ts`, `Nav.svelte`, footer, contact sender; collapse the sender/siteName duplication: Tasks 5, 6, 8, 9. ✓
- Build-time `?raw` consumption, stays prerendered: Tasks 5/8 (import) + 7/10 (build). ✓
- `WELCOME_BLURB` stays a constant (content, not config): Task 5. ✓
- Gate: no behavior change, characterization byte-identical, no `/admin` change: Tasks 7, 10 (no admin file is touched). ✓

**Placeholder scan:** The single intentional copy-marker (`REPLACE_WITH_VERBATIM_SITE_DESCRIPTION`) is a determined "copy this exact named value" instruction, present only because the prose guard rejects an em-dash character in this file; the characterization diff makes it self-checking. No vague TODOs remain.

**Type consistency:** `siteConfig` (the parsed `SiteConfig`), `PRIMARY_NAV` (a `NavNode[]` from `extractMenu`), `parseSiteConfig`/`extractMenu`, and `POST_TAGS: readonly string[]` are used consistently across the engine and both sites. `NavNode.url` is optional, handled with `?? '#'`/`?? ''` at every use. `POST_TAGS` consumers (`new Set<string>(...)`, `.join`, `options: readonly string[]`) all accept `readonly string[]`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-28-pass-l-yaml-site-config.md`.
