# Engine distribution, live preview, and extensibility readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the rebuilt `@glw907/cairn-cms` engine consumable and correct, prove it end to end through a permanent example-consumer app, publish it as `0.6.0-rc.0`, and confirm both extension modes are supported, without touching either live site.

**Architecture:** Three engine-side additions (packaging gates, the live preview with an engine-side DOMPurify floor, the `CairnExtension` contract) land in `src/lib`. A permanent sibling SvelteKit app at `examples/showcase/` consumes the engine through its public exports via a `file:` dependency, hosts the Playwright golden path and a non-cairn `/calendar` feature, and stands as the canonical thin-shim reference. The engine library's NodeNext build and the Plan 00 vitest projects stay untouched.

**Tech Stack:** SvelteKit 2 (classic load/actions), Svelte 5 runes, DaisyUI 5 + Tailwind 4, `dompurify` 3.x, `publint`, `@arethetypeswrong/cli`, `@playwright/test` 1.60.x, `@sveltejs/adapter-node`, vitest (node `unit` + workerd `integration` + browser `component`).

---

## Background

This is the first half of the original "distribution and site cutover" pass, split during brainstorming so the irreversible production cutover is its own later step. The full roadmap:

| Plan | Goal |
|---|---|
| 07 (this) | Engine readiness: packaging gates, preview + sanitize, `CairnExtension` contract, the example-consumer app, the golden-path E2E, RC publish. |
| 08 | Site cutover: both adapters and all `/admin` shims to the new API, repoint, merge `rebuild` to `main`. |
| 09 | `CairnExtension` machinery: site-registered admin panels, custom concept and field types. |
| 10 | `create-cairn-site` scaffolder and the first templates. |

The canonical source is the functional spec at `docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md` and the Plan 07 design at `docs/superpowers/specs/2026-05-29-cairn-rebuild-07-engine-distribution-design.md`.

### What already exists (do not rebuild)

- The three subpath exports (`.`, `/sveltekit`, `/components`), the source-to-`dist` `publishConfig` swap, the peer dependencies (`@sveltejs/kit`, `carta-md`, `svelte`), and the OIDC Trusted-Publishing workflow `.github/workflows/publish.yml` (Plan 00). The `files` array is `["dist", "src/lib"]`.
- `EditPage.svelte` with the preview toggle, the `previewHtml` state, and the `{@html previewHtml}` pane (Plan 05). `previewHtml` is never assigned today; that is the gap this plan closes.
- `MarkdownEditor.svelte`, the client-only Carta seam with `sanitizer: false` (Plan 05).
- `createRenderer` returning `renderMarkdown` plus the remark and rehype plugin arrays (Plan 04).
- `composeRuntime(adapter, extensions[])` and the `CairnExtension` interface with `content?` only; extension concepts already merge and are tested (Plan 02).
- `createContentRoutes` (`editLoad`, `saveAction` with the editor as author and `cairn-cms[bot]` as committer) and `createNavRoutes`; the unit tests `content-routes-save.test.ts` and `nav-routes-save.test.ts` already prove the save-to-commit author and committer contract (Plans 05, 06). This plan does not duplicate that proof.
- `healthLoad` / `/admin/healthz` signing self-test (Plan 05); `carta-boundary.test.ts`; the export-boundary tests `admin-exports`, `render-exports`, `nav-exports` (Plans 04 to 06).
- The admin theme `src/lib/components/cairn-admin.css`, scoped to `[data-theme="cairn-admin"]`.

### Design decisions locked for this plan

1. **The split.** Plan 07 is engine readiness and the RC publish only. No site is repointed; `main` is untouched.
2. **Engine-side DOMPurify is the sanitize floor.** The preview pane sanitizes every site's rendered HTML before the DOM, so a site or template cannot reintroduce the Plan 05 stored-XSS by forgetting to sanitize.
3. **Publish `0.6.0-rc.0` from the `rebuild` branch under the `rc` dist-tag.** The sites pin `^0.5.1` (caret excludes `0.6.x`) and `latest` keeps pointing at the live `0.5.1`.
4. **The example-consumer app is a permanent sibling at `examples/showcase/`** with its own SvelteKit config, consuming the engine through `file:..`, never published. It keeps the library's NodeNext build pristine and proves the exports as a true external consumer.
5. **Both extension modes are first-class.** Mode 1 (build outside) is proven now (the showcase `/calendar` plus the engine-isolation test). Mode 2 (extend the admin) gets its contract type-declared now and built in Plan 09; declaring types is an additive, non-breaking change.

### Shared shapes defined in this plan

`EditPage` gains a `renderPreview` prop, type `(md: string) => string | Promise<string>` (the same signature as `CairnRuntime.renderPreview`). The `CairnExtension` interface gains `adminPanels?: AdminPanel[]` and `fieldTypes?: FieldTypeDef[]`; `CairnRuntime` gains the optional carried fields `adminPanels?` and `fieldTypes?`.

---

## Task 1: Packaging gates (publint, attw, peer-dep contract)

Add the published-shape gates so a broken exports map or a mis-declared peer dependency fails CI before any site consumes the package.

**Files:**
- Modify: `package.json` (devDependencies, scripts)
- Create: `src/tests/unit/peer-deps.test.ts`
- Modify: `.github/workflows/test.yml`

- [ ] **Step 1: Install the gate tools**

Run:
```bash
npm install -D publint @arethetypeswrong/cli
```
Expected: both land in `devDependencies`.

- [ ] **Step 2: Write the failing peer-dep contract test**

The single-resolved-`@sveltejs/kit` guarantee starts at the package contract: Kit, Carta, and Svelte must be peer dependencies, never dependencies, so a consumer resolves exactly one copy and thrown `redirect`/`error` keep class identity. Create `src/tests/unit/peer-deps.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

describe('package peer-dependency contract', () => {
  const peers = ['@sveltejs/kit', 'carta-md', 'svelte'];

  it('declares the framework packages as peers', () => {
    for (const p of peers) expect(pkg.peerDependencies?.[p], `${p} must be a peer`).toBeTruthy();
  });

  it('never lists a framework package as a hard dependency', () => {
    for (const p of peers) expect(pkg.dependencies?.[p], `${p} must not be a dependency`).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run it to verify it passes (or surfaces a real defect)**

Run: `npx vitest run --project unit src/tests/unit/peer-deps.test.ts`
Expected: PASS. If it fails, the manifest mis-declares a peer; move the offending package from `dependencies` to `peerDependencies` and rerun.

- [ ] **Step 4: Add the `check:package` script**

In `package.json` `scripts`, add:
```json
    "check:package": "npm run package && publint --strict && attw --pack ."
```
`npm run package` builds `dist` via `svelte-package`; `publint --strict` validates the exports map and module shape; `attw --pack` runs `npm pack` and checks type resolution across every export condition for both halves of the `publishConfig` swap.

- [ ] **Step 5: Run the package gate**

Run: `npm run check:package`
Expected: publint reports no errors and attw reports no problems across `.`, `/sveltekit`, `/components`. If either flags a real export or type-resolution issue, fix the exports map or the source until both pass. Do not suppress findings.

- [ ] **Step 6: Wire the gates into CI**

In `.github/workflows/test.yml`, replace the final `- run: npm run package` step with:
```yaml
      - run: npm run check:package
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/tests/unit/peer-deps.test.ts .github/workflows/test.yml
git commit -m "build(dist): gate the published shape with publint, attw, and the peer-dep contract"
```

---

## Task 2: The engine-side preview sanitizer

Add a DOMPurify-backed sanitizer the preview pane runs before `{@html}`. It loads DOMPurify with a dynamic import so the module never evaluates a DOM library on the server (Carta's pattern); the sanitize only runs in the browser.

**Files:**
- Modify: `package.json` (dependencies)
- Create: `src/lib/render/sanitize.ts`
- Test: `src/tests/component/sanitize.test.ts`

- [ ] **Step 1: Install DOMPurify**

Run:
```bash
npm install dompurify
```
Expected: `dompurify` (3.x) in `dependencies`. It ships its own types, so no `@types` package is needed.

- [ ] **Step 2: Write the failing test**

Create `src/tests/component/sanitize.test.ts` (the `component` project runs in a real browser, so a DOM exists):
```typescript
import { describe, it, expect } from 'vitest';
import { sanitizePreviewHtml } from '../../lib/render/sanitize.js';

describe('sanitizePreviewHtml', () => {
  it('keeps ordinary formatting', async () => {
    expect(await sanitizePreviewHtml('<p>Hello <strong>world</strong></p>')).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('strips a script element', async () => {
    expect(await sanitizePreviewHtml('<p>ok</p><script>alert(1)<\/script>')).not.toContain('alert');
  });

  it('strips an inline event handler', async () => {
    expect(await sanitizePreviewHtml('<img src=x onerror="alert(1)">')).not.toContain('onerror');
  });

  it('strips a javascript: link target but keeps the text', async () => {
    const out = await sanitizePreviewHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('click');
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run --project component src/tests/component/sanitize.test.ts`
Expected: FAIL. Cannot resolve `sanitize.js`.

- [ ] **Step 4: Create `src/lib/render/sanitize.ts`**

```typescript
// The live preview's sanitize floor. Carta runs with `sanitizer: false` behind the MarkdownEditor
// seam, so the admin preview pane is the one barrier between editor-authored markdown and the DOM
// (the Plan 05 locked High). DOMPurify needs a DOM, and the preview renders only in the browser
// after mount, so DOMPurify loads through a dynamic import: the module never evaluates a DOM library
// on the Worker, and a server import of this file pulls in nothing.
let purify: { sanitize(html: string): string } | null = null;

/**
 * Sanitize rendered preview HTML before it reaches `{@html}`. Strips scripts, inline event
 * handlers, and dangerous URL schemes (`javascript:`, `data:`) while keeping ordinary formatting.
 * Browser-only; resolves the same string DOMPurify would return.
 */
export async function sanitizePreviewHtml(html: string): Promise<string> {
  if (!purify) {
    const mod = await import('dompurify');
    purify = mod.default;
  }
  return purify.sanitize(html);
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run --project component src/tests/component/sanitize.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Confirm the carta boundary and full suite**

Run: `npx vitest run --project unit src/tests/unit/carta-boundary.test.ts && npm run check`
Expected: the carta boundary passes (the dynamic import keeps dompurify off any server module); svelte-check 0 errors, 0 warnings.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/render/sanitize.ts src/tests/component/sanitize.test.ts
git commit -m "feat(render): add the client-only DOMPurify preview sanitizer"
```

---

## Task 3: Wire the live preview into EditPage

Render the design-accurate preview through an injected `renderPreview`, debounced, and pass it through the sanitizer before the existing `{@html previewHtml}`.

**Files:**
- Modify: `src/lib/components/EditPage.svelte`
- Test: `src/tests/component/EditPage.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `src/tests/component/EditPage.test.ts` inside the `describe('EditPage', ...)` block:
```typescript
  it('renders sanitized preview HTML when the preview is shown', async () => {
    const props = { ...postProps({ body: 'Hello world' }), renderPreview: (md: string) => `<p>${md}</p>` };
    const screen = render(EditPage, props);
    await screen.getByRole('button', { name: /show preview/i }).click();
    await expect
      .poll(() => screen.container.querySelector('section[aria-label="Preview"]')?.innerHTML ?? '')
      .toContain('Hello world');
  });

  it('strips a dangerous payload from the rendered preview', async () => {
    const props = {
      ...postProps({ body: 'x' }),
      renderPreview: () => '<p>safe</p><img src=x onerror="alert(1)">',
    };
    const screen = render(EditPage, props);
    await screen.getByRole('button', { name: /show preview/i }).click();
    await expect
      .poll(() => screen.container.querySelector('section[aria-label="Preview"]')?.innerHTML ?? '')
      .toContain('safe');
    expect(screen.container.querySelector('section[aria-label="Preview"]')!.innerHTML).not.toContain('onerror');
  });
```
The existing tests pass `preview: []` and no `renderPreview`; the new prop is optional, so they keep passing unchanged.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run --project component src/tests/component/EditPage.test.ts`
Expected: FAIL. The preview pane stays empty (`previewHtml` is never assigned).

- [ ] **Step 3: Add the `renderPreview` prop and the render effect**

In `src/lib/components/EditPage.svelte`, add the sanitizer import below the existing imports:
```typescript
  import { sanitizePreviewHtml } from '../render/sanitize.js';
```
Add the prop to the `Props` interface, after `preview`:
```typescript
    /** The site's design-accurate render pipeline; the preview pane sanitizes its output. */
    renderPreview?: (md: string) => string | Promise<string>;
```
Destructure it:
```typescript
  let { data, registry, preview = [], renderPreview }: Props = $props();
```
Add the render effect after the existing `togglePreview` function:
```typescript
  // Render the design-accurate preview as the body changes, debounced, and sanitize before the DOM.
  // The sanitize is the one barrier between editor-authored markdown and the page (Carta is unsanitized).
  $effect(() => {
    if (!showPreview || !renderPreview) return;
    const md = body;
    const handle = setTimeout(async () => {
      const html = await renderPreview(md);
      previewHtml = await sanitizePreviewHtml(html);
    }, 150);
    return () => clearTimeout(handle);
  });
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project component src/tests/component/EditPage.test.ts`
Expected: PASS (the existing tests plus the two new ones).

- [ ] **Step 5: Full check and suite**

Run: `npm run check && npm test`
Expected: svelte-check 0 errors, 0 warnings; `npm test` exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/EditPage.svelte src/tests/component/EditPage.test.ts
git commit -m "feat(admin): render the live preview through renderPreview with a sanitize floor"
```

---

## Task 4: Engine isolation test (Mode 1 boundary)

Lock the boundary that lets a site build outside the admin without interference: the engine claims no routes, injects no unexpected global stylesheet, and keeps its theme scoped.

**Files:**
- Test: `src/tests/unit/engine-isolation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/engine-isolation.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const libDir = fileURLToPath(new URL('../../lib', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(libDir);

describe('engine isolation', () => {
  it('claims no SvelteKit routes (those are site code)', () => {
    const routeFiles = files.filter((f) => /[\\/]\+(page|layout|server|error)[.@]/.test(f));
    expect(routeFiles).toEqual([]);
  });

  it('imports only allowlisted stylesheets, so it injects no surprise global CSS', () => {
    const allow = ['./cairn-admin.css', '@rodrigodagostino/svelte-sortable-list/styles.css'];
    const cssImports = files
      .filter((f) => f.endsWith('.svelte') || f.endsWith('.ts'))
      .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/import\s+['"]([^'"]+\.css)['"]/g)].map((m) => m[1]));
    for (const imp of cssImports) expect(allow, `unexpected CSS import ${imp}`).toContain(imp);
  });

  it('keeps the admin theme scoped to its data-theme', () => {
    const css = readFileSync(join(libDir, 'components/cairn-admin.css'), 'utf8');
    expect(css).toContain('[data-theme="cairn-admin"]');
    // No bare global selectors that would reach a site's public pages.
    expect(css).not.toMatch(/(^|\})\s*(:root|html|body|\*)\s*\{/);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run --project unit src/tests/unit/engine-isolation.test.ts`
Expected: PASS. If the CSS-import assertion fails, a component pulled a new stylesheet; either scope it and add it to the allowlist with a comment, or remove the global import. If the scoped-theme assertion fails, a bare global selector crept into the admin theme; move it under `[data-theme="cairn-admin"]`.

- [ ] **Step 3: Commit**

```bash
git add src/tests/unit/engine-isolation.test.ts
git commit -m "test(engine): lock the namespace isolation that lets sites build outside the admin"
```

---

## Task 5: The CairnExtension contract (Mode 2 readiness)

Extend the reserved seam so a future extension can contribute admin panels and field types, carry both through composition, and document the contract. The machinery that dispatches them is Plan 09; this task declares the types and confirms the composition insertion point.

**Files:**
- Modify: `src/lib/content/types.ts`
- Modify: `src/lib/content/compose.ts`
- Test: `src/tests/unit/compose.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/tests/unit/compose.test.ts` (create the file if it does not exist; if it exists, append the new `it` blocks inside its top `describe`):
```typescript
import { describe, it, expect } from 'vitest';
import { composeRuntime } from '../../lib/content/compose.js';
import type { CairnAdapter, CairnExtension } from '../../lib/content/types.js';

function adapter(): CairnAdapter {
  return {
    siteName: 'T',
    content: { pages: { dir: 'src/content/pages', fields: [], validate: () => ({ ok: true, data: {} }) } },
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    renderPreview: (md) => md,
  };
}

describe('composeRuntime extension carry-through', () => {
  it('carries extension admin panels and field types onto the runtime', () => {
    const ext: CairnExtension = {
      adminPanels: [{ id: 'calendar', label: 'Calendar', component: {} }],
      fieldTypes: [{ type: 'color' }],
    };
    const runtime = composeRuntime(adapter(), [ext]);
    expect(runtime.adminPanels).toEqual([{ id: 'calendar', label: 'Calendar', component: {} }]);
    expect(runtime.fieldTypes).toEqual([{ type: 'color' }]);
  });

  it('defaults the carried arrays to empty when no extension contributes', () => {
    const runtime = composeRuntime(adapter(), []);
    expect(runtime.adminPanels).toEqual([]);
    expect(runtime.fieldTypes).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/compose.test.ts`
Expected: FAIL. `adminPanels`/`fieldTypes` are not on the type or the runtime.

- [ ] **Step 3: Declare the contract in `src/lib/content/types.ts`**

Add these interfaces above the existing `CairnExtension` interface:
```typescript
/**
 * A site-defined admin screen contributed by an extension (Mode 2). It gains a sidebar entry, the
 * `/admin` guard, and the session, and may commit through the same GitHub pipeline. The dispatch
 * route is built in Plan 09; the `load`/`actions`/`component` members are typed loosely here and
 * tightened when the machinery lands.
 */
export interface AdminPanel {
  /** Routes under `/admin/<id>`; also the sidebar key. */
  id: string;
  /** Sidebar label. */
  label: string;
  /** Owner-gated, like editor management. */
  owner?: boolean;
  /** Server load, behind the guard. Typed in Plan 09. */
  load?: (event: unknown) => unknown;
  /** Named form actions, which may use the commit pipeline. Typed in Plan 09. */
  actions?: Record<string, (event: unknown) => Promise<unknown>>;
  /** The panel UI, rendered inside the admin shell. Typed as a component in Plan 09. */
  component: unknown;
}

/**
 * A custom frontmatter field type contributed by an extension (Mode 2): a renderer plus a validator
 * dispatched alongside the built-in field union. The renderer and validator are typed in Plan 09
 * when the form dispatch becomes a registry; the `type` key reserves the discriminator now.
 */
export interface FieldTypeDef {
  /** The field-type discriminator, e.g. "color". */
  type: string;
}
```
Replace the existing `CairnExtension` interface body with:
```typescript
export interface CairnExtension {
  /** Additional concepts, merged after the adapter's. */
  content?: Record<string, ConceptConfig>;
  /** Site-defined admin panels (Mode 2). Carried onto the runtime now; dispatched in Plan 09. */
  adminPanels?: AdminPanel[];
  /** Custom field types (Mode 2). Carried onto the runtime now; dispatched in Plan 09. */
  fieldTypes?: FieldTypeDef[];
}
```
Add the carried fields to the `CairnRuntime` interface, after `assets?`:
```typescript
  /** Admin panels contributed by extensions (Mode 2). Empty until Plan 09 wires the dispatch route. */
  adminPanels?: AdminPanel[];
  /** Field types contributed by extensions (Mode 2). Empty until Plan 09 wires the form dispatch. */
  fieldTypes?: FieldTypeDef[];
```

- [ ] **Step 4: Carry them through in `src/lib/content/compose.ts`**

Update the import to include the new types:
```typescript
import type {
  AdminPanel,
  CairnAdapter,
  CairnExtension,
  CairnRuntime,
  ConceptConfig,
  FieldTypeDef,
} from './types.js';
```
Inside `composeRuntime`, extend the fold loop and the return:
```typescript
  const content: Record<string, ConceptConfig | undefined> = { ...adapter.content };
  const adminPanels: AdminPanel[] = [];
  const fieldTypes: FieldTypeDef[] = [];
  for (const extension of extensions) {
    if (extension.content) Object.assign(content, extension.content);
    if (extension.adminPanels) adminPanels.push(...extension.adminPanels);
    if (extension.fieldTypes) fieldTypes.push(...extension.fieldTypes);
  }
  return {
    siteName: adapter.siteName,
    concepts: normalizeConcepts(content),
    backend: adapter.backend,
    sender: adapter.sender,
    renderPreview: adapter.renderPreview,
    registry: adapter.registry,
    navMenu: adapter.navMenu,
    assets: adapter.assets,
    adminPanels,
    fieldTypes,
  };
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/compose.test.ts && npm run check`
Expected: PASS; svelte-check 0 errors, 0 warnings. The `adminPanels`/`fieldTypes` fields are optional on `CairnRuntime`, so the test runtimes built elsewhere keep type-checking.

- [ ] **Step 6: Export the new types**

In `src/lib/index.ts`, add `AdminPanel`, `FieldTypeDef` to the `CairnExtension`/content type re-exports (find the existing `export type { ... CairnExtension ... }` line and add the two names; if `CairnExtension` is not yet re-exported, add `export type { CairnExtension, AdminPanel, FieldTypeDef } from './content/types.js';`).

- [ ] **Step 7: Run the export boundary and commit**

Run: `npx vitest run --project unit && npm run check`
Expected: all unit tests pass; svelte-check clean.
```bash
git add src/lib/content/types.ts src/lib/content/compose.ts src/lib/index.ts src/tests/unit/compose.test.ts
git commit -m "feat(content): declare the CairnExtension admin-panel and field-type contract"
```

---

## Task 6: The example-consumer app skeleton

Stand up the permanent sibling SvelteKit app that consumes the engine through its public exports. It has its own standard SvelteKit config, isolated from the library's NodeNext build.

**Files:**
- Create: `examples/showcase/package.json`
- Create: `examples/showcase/svelte.config.js`
- Create: `examples/showcase/vite.config.ts`
- Create: `examples/showcase/tsconfig.json`
- Create: `examples/showcase/src/app.html`
- Create: `examples/showcase/src/app.d.ts`
- Create: `examples/showcase/src/routes/+layout.svelte`
- Create: `examples/showcase/src/routes/+page.svelte`
- Create: `examples/showcase/.gitignore`

- [ ] **Step 1: Create the app manifest**

`examples/showcase/package.json`:
```json
{
  "name": "cairn-showcase",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json"
  },
  "dependencies": {
    "@glw907/cairn-cms": "file:../.."
  },
  "devDependencies": {
    "@sveltejs/adapter-node": "^5",
    "@sveltejs/kit": "^2",
    "@sveltejs/vite-plugin-svelte": "^6",
    "svelte": "^5",
    "svelte-check": "^4",
    "typescript": "^5",
    "vite": "^7"
  }
}
```
Pin the `@sveltejs/*`, `svelte`, and `vite` versions to the same majors the engine's `package.json` uses; read them from the engine manifest and match, so the showcase resolves one Svelte and one Kit.

- [ ] **Step 2: Create the SvelteKit config**

`examples/showcase/svelte.config.js`:
```javascript
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: { adapter: adapter() },
};
```
`examples/showcase/vite.config.ts`:
```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  // The engine ships Svelte and TS source through its `svelte` export condition; let Vite process it.
  ssr: { noExternal: ['@glw907/cairn-cms'] },
});
```
`examples/showcase/tsconfig.json`:
```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

- [ ] **Step 3: Create the app shell**

`examples/showcase/src/app.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div>%sveltekit.body%</div>
  </body>
</html>
```
`examples/showcase/src/app.d.ts`:
```typescript
import type { Editor } from '@glw907/cairn-cms';

declare global {
  namespace App {
    interface Locals {
      editor: Editor | null;
    }
  }
}

export {};
```
If `Editor` is not exported from the package root, import it from `@glw907/cairn-cms/sveltekit` instead; confirm against the engine's `src/lib/index.ts` exports and adjust.

- [ ] **Step 4: Create the public home and layout**

`examples/showcase/src/routes/+layout.svelte`:
```svelte
<script lang="ts">
  let { children } = $props();
</script>

{@render children()}
```
`examples/showcase/src/routes/+page.svelte`:
```svelte
<!-- @component The showcase home: a public page proving the engine claims nothing outside /admin. -->
<h1>cairn showcase</h1>
<nav>
  <a href="/calendar">Calendar (a non-cairn feature)</a>
  <a href="/admin">Admin</a>
</nav>
```

- [ ] **Step 5: Ignore build artifacts**

`examples/showcase/.gitignore`:
```
node_modules
.svelte-kit
build
```

- [ ] **Step 6: Install and build**

Run:
```bash
cd examples/showcase && npm install && npm run build
```
Expected: install resolves `@glw907/cairn-cms` from `file:../..` and the build succeeds. If the build cannot resolve the engine's Svelte/TS source, confirm `ssr.noExternal` includes the package and that the engine's `exports` expose the `svelte` condition. Return to the repo root afterward.

- [ ] **Step 7: Confirm the engine suite is untouched**

Run (from the repo root): `npm test && npm run check`
Expected: the library's unit, integration, and component projects and svelte-check are all green; the showcase did not disturb them.

- [ ] **Step 8: Commit**

```bash
git add examples/showcase/package.json examples/showcase/svelte.config.js examples/showcase/vite.config.ts examples/showcase/tsconfig.json examples/showcase/src/app.html examples/showcase/src/app.d.ts examples/showcase/src/routes/+layout.svelte examples/showcase/src/routes/+page.svelte examples/showcase/.gitignore
git commit -m "feat(showcase): stand up the example-consumer SvelteKit app"
```

> Do not commit `examples/showcase/package-lock.json` unless the repo convention wants it; the `file:` dependency makes it machine-specific. The `.gitignore` already excludes `node_modules`.

---

## Task 7: The showcase adapter and the non-cairn /calendar feature

Give the showcase a fake adapter and a feature the engine knows nothing about, proving Mode 1 coexistence in a running app.

**Files:**
- Create: `examples/showcase/src/lib/cairn.config.ts`
- Create: `examples/showcase/src/lib/site.config.yaml`
- Create: `examples/showcase/src/routes/calendar/+page.svelte`
- Create: `examples/showcase/src/routes/calendar/Calendar.svelte`

- [ ] **Step 1: Write the fake adapter**

`examples/showcase/src/lib/cairn.config.ts`:
```typescript
// The showcase's adapter: the single seam the engine consumes. It declares one post-like concept,
// a trivial design-accurate renderPreview, and a backend the dev GitHub double answers for.
import type { CairnAdapter } from '@glw907/cairn-cms';

export const cairn: CairnAdapter = {
  siteName: 'Cairn Showcase',
  content: {
    posts: {
      dir: 'src/content/posts',
      label: 'Posts',
      fields: [
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'date', name: 'date', label: 'Date' },
      ],
      validate(frontmatter) {
        const title = typeof frontmatter.title === 'string' ? frontmatter.title.trim() : '';
        if (!title) return { ok: false, errors: { title: 'Title is required' } };
        return { ok: true, data: { ...frontmatter, title } };
      },
    },
  },
  backend: { owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'cms@showcase.test' },
  // Design-accurate enough for the preview: wrap each non-empty line in a paragraph.
  renderPreview: (md) =>
    md
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => `<p>${line}</p>`)
      .join(''),
  navMenu: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Navigation', maxDepth: 2 },
};
```

- [ ] **Step 2: Seed the site-config YAML**

`examples/showcase/src/lib/site.config.yaml`:
```yaml
siteName: Cairn Showcase
menus:
  primary:
    - label: Home
      url: /
```

- [ ] **Step 3: Build the non-cairn feature**

`examples/showcase/src/routes/calendar/Calendar.svelte`:
```svelte
<!-- @component A custom calendar that lives entirely outside cairn: it imports nothing from the engine. -->
<script lang="ts">
  interface Props {
    events: { date: string; title: string }[];
  }
  let { events }: Props = $props();
</script>

<ul aria-label="Events">
  {#each events as event (event.date + event.title)}
    <li>{event.date}: {event.title}</li>
  {/each}
</ul>
```
`examples/showcase/src/routes/calendar/+page.svelte`:
```svelte
<!-- @component The /calendar route: a site-owned feature beside /admin, proving cairn does not interfere. -->
<script lang="ts">
  import Calendar from './Calendar.svelte';
  const events = [
    { date: '2026-06-01', title: 'Season opener' },
    { date: '2026-06-08', title: 'Club race' },
  ];
</script>

<h1>Calendar</h1>
<Calendar {events} />
```

- [ ] **Step 4: Build to confirm coexistence**

Run: `cd examples/showcase && npm run build && cd ../..`
Expected: the build succeeds with `/`, `/calendar`, and the admin routes (added next task) coexisting.

- [ ] **Step 5: Commit**

```bash
git add examples/showcase/src/lib/cairn.config.ts examples/showcase/src/lib/site.config.yaml examples/showcase/src/routes/calendar/+page.svelte examples/showcase/src/routes/calendar/Calendar.svelte
git commit -m "feat(showcase): add the adapter and a non-cairn calendar feature"
```

---

## Task 8: The showcase admin shims and dev backend

Wire the real thin `/admin` shims to the engine's exports, and give the app a dev-only backend: a session injector (auth is proven elsewhere) and a GitHub fetch double that records commits.

**Files:**
- Create: `examples/showcase/src/hooks.server.ts`
- Create: `examples/showcase/src/lib/fake-github.ts`
- Create: `examples/showcase/src/routes/admin/+layout.server.ts`
- Create: `examples/showcase/src/routes/admin/+layout.svelte`
- Create: `examples/showcase/src/routes/admin/+page.server.ts`
- Create: `examples/showcase/src/routes/admin/[concept]/+page.server.ts`
- Create: `examples/showcase/src/routes/admin/[concept]/+page.svelte`
- Create: `examples/showcase/src/routes/admin/edit/[type]/[id]/+page.server.ts`
- Create: `examples/showcase/src/routes/admin/edit/[type]/[id]/+page.svelte`
- Create: `examples/showcase/src/routes/test/last-commit/+server.ts`

> Confirm the engine's actual route surface and the exact load/action export names before writing the shims: read `src/lib/sveltekit/index.ts` and `createContentRoutes`'s returned object. The shims below assume `layoutLoad`, `indexRedirect`, `listLoad`, `createAction`, `editLoad`, `saveAction` and the components `AdminLayout`, `ConceptList`, `EditPage`. Adjust paths and names to match the engine; the goal is that every `/admin` shim is one or two lines importing from `@glw907/cairn-cms/sveltekit` and `@glw907/cairn-cms/components`.

- [ ] **Step 1: Write the GitHub double**

`examples/showcase/src/lib/fake-github.ts`:
```typescript
// A dev-only GitHub double for the showcase. It intercepts api.github.com so a save reaches an
// in-memory repo instead of the real API, and records the last commit so the E2E can assert the
// author and committer. Installed once from hooks.server.ts; never part of the published engine.
interface RecordedCommit {
  path: string;
  author: { name: string; email: string };
  committer: unknown;
  content: string;
}

let lastCommit: RecordedCommit | null = null;
let installed = false;

const SEED_POST = 'src/content/posts/2026-06-hello.md';
const seededFiles = new Map<string, string>([
  [SEED_POST, '---\ntitle: Hello\ndate: 2026-06-01\n---\nThe original body.\n'],
]);

export function lastRecordedCommit(): RecordedCommit | null {
  return lastCommit;
}

export function installFakeGitHub(): void {
  if (installed) return;
  installed = true;
  const real = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes('api.github.com')) return real(input, init);

    const method = init?.method ?? 'GET';
    const accept = String((init?.headers as Record<string, string> | undefined)?.Accept ?? '');

    // List markdown via the Git Trees API.
    if (url.includes('/git/trees/')) {
      const tree = [...seededFiles.keys()].map((path) => ({ path, type: 'blob' }));
      return new Response(JSON.stringify({ tree, truncated: false }), { status: 200 });
    }

    // The contents API: raw read, sha lookup, or a commit.
    const match = decodeURIComponent(url).match(/\/contents\/([^?]+)/);
    const path = match ? match[1] : '';
    if (method === 'PUT') {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        content: string;
        author: { name: string; email: string };
        committer?: unknown;
      };
      const decoded = typeof atob === 'function' ? atob(body.content) : Buffer.from(body.content, 'base64').toString();
      seededFiles.set(path, decoded);
      lastCommit = { path, author: body.author, committer: body.committer ?? null, content: decoded };
      return new Response(JSON.stringify({ commit: { sha: 'showcase-sha' } }), { status: 200 });
    }
    if (seededFiles.has(path)) {
      if (accept.includes('raw')) return new Response(seededFiles.get(path), { status: 200 });
      return new Response(JSON.stringify({ sha: 'old-sha' }), { status: 200 });
    }
    return new Response('Not Found', { status: 404 });
  }) as typeof fetch;
}
```

- [ ] **Step 2: Write the dev hooks**

`examples/showcase/src/hooks.server.ts`:
```typescript
// Dev-only backend for the showcase. It injects a signed-in editor for /admin (the real auth flow
// is covered by the engine's integration tests) and installs the GitHub double. This file lives in
// the showcase, never in the engine, so the published package carries none of it.
import type { Handle } from '@sveltejs/kit';
import { installFakeGitHub } from '$lib/fake-github';

installFakeGitHub();

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname === '/admin' || event.url.pathname.startsWith('/admin/')) {
    event.locals.editor = { email: 'editor@showcase.test', displayName: 'Demo Editor', role: 'owner' };
  }
  return resolve(event);
};
```
Confirm the `Editor` shape (`email`, `displayName`, `role`) against the engine's `src/lib/auth/types.ts` and adjust the literal if a field differs.

- [ ] **Step 3: Write the admin shims**

Each shim imports the engine function or component and wires the adapter. Inject a dummy `mintToken` so no real key signing happens; the GitHub double answers the fetches. `examples/showcase/src/routes/admin/+layout.server.ts`:
```typescript
import { createContentRoutes } from '@glw907/cairn-cms/sveltekit';
import { composeRuntime } from '@glw907/cairn-cms';
import { cairn } from '$lib/cairn.config';

const routes = createContentRoutes(composeRuntime(cairn), { mintToken: () => Promise.resolve('dev-token') });
export const load = routes.layoutLoad;
```
> If the engine expects the raw adapter rather than a composed runtime, or exposes a different composition entry, match its real signature. Read `createContentRoutes`'s parameter type first.

`examples/showcase/src/routes/admin/+layout.svelte`:
```svelte
<script lang="ts">
  import { AdminLayout } from '@glw907/cairn-cms/components';
  let { data, children } = $props();
</script>

<AdminLayout {data}>{@render children()}</AdminLayout>
```
`examples/showcase/src/routes/admin/+page.server.ts`:
```typescript
import { createContentRoutes } from '@glw907/cairn-cms/sveltekit';
import { composeRuntime } from '@glw907/cairn-cms';
import { cairn } from '$lib/cairn.config';

const routes = createContentRoutes(composeRuntime(cairn), { mintToken: () => Promise.resolve('dev-token') });
export const load = routes.indexRedirect;
```
`examples/showcase/src/routes/admin/[concept]/+page.server.ts`:
```typescript
import { createContentRoutes } from '@glw907/cairn-cms/sveltekit';
import { composeRuntime } from '@glw907/cairn-cms';
import { cairn } from '$lib/cairn.config';

const routes = createContentRoutes(composeRuntime(cairn), { mintToken: () => Promise.resolve('dev-token') });
export const load = routes.listLoad;
export const actions = { create: routes.createAction };
```
`examples/showcase/src/routes/admin/[concept]/+page.svelte`:
```svelte
<script lang="ts">
  import { ConceptList } from '@glw907/cairn-cms/components';
  let { data } = $props();
</script>

<ConceptList {data} />
```
`examples/showcase/src/routes/admin/edit/[type]/[id]/+page.server.ts`:
```typescript
import { createContentRoutes } from '@glw907/cairn-cms/sveltekit';
import { composeRuntime } from '@glw907/cairn-cms';
import { cairn } from '$lib/cairn.config';

const routes = createContentRoutes(composeRuntime(cairn), { mintToken: () => Promise.resolve('dev-token') });
export const load = routes.editLoad;
export const actions = { save: routes.saveAction };
```
`examples/showcase/src/routes/admin/edit/[type]/[id]/+page.svelte`:
```svelte
<script lang="ts">
  import { EditPage } from '@glw907/cairn-cms/components';
  import { cairn } from '$lib/cairn.config';
  let { data } = $props();
</script>

<EditPage data={{ ...data, siteName: cairn.siteName }} registry={cairn.registry} renderPreview={cairn.renderPreview} />
```
Match the real route param names (`[concept]`, `[type]`, `[id]`) and the components' actual prop contracts to the engine; correct any mismatch the build reports.

- [ ] **Step 4: Expose the recorded commit for the E2E**

`examples/showcase/src/routes/test/last-commit/+server.ts`:
```typescript
import { json } from '@sveltejs/kit';
import { lastRecordedCommit } from '$lib/fake-github';

export function GET() {
  return json(lastRecordedCommit());
}
```

- [ ] **Step 5: Build and smoke the admin manually**

Run:
```bash
cd examples/showcase && npm run build && npm run preview &
```
Then open `http://localhost:4173/admin` and confirm it renders the concept list without a login bounce, open the seeded post under `/admin/edit/posts/2026-06-hello`, toggle the preview, and confirm it renders. Stop the preview server afterward and return to the repo root. (The Playwright test in Task 9 automates this; this step is a manual confidence check.)

- [ ] **Step 6: Commit**

```bash
git add examples/showcase/src/hooks.server.ts examples/showcase/src/lib/fake-github.ts examples/showcase/src/routes/admin examples/showcase/src/routes/test
git commit -m "feat(showcase): wire the admin shims and a dev GitHub double"
```

---

## Task 9: The Playwright golden-path E2E

Drive the showcase through the one golden path and assert the commit, plus the Mode-1 coexistence.

**Files:**
- Modify: `examples/showcase/package.json` (devDependencies, script)
- Create: `examples/showcase/playwright.config.ts`
- Create: `examples/showcase/e2e/golden-path.spec.ts`
- Create: `.github/workflows/e2e.yml`

- [ ] **Step 1: Add Playwright**

Run:
```bash
cd examples/showcase && npm install -D @playwright/test && npx playwright install --with-deps chromium && cd ../..
```
Expected: `@playwright/test` in the showcase devDependencies and the Chromium browser installed.

- [ ] **Step 2: Configure Playwright against the built app**

`examples/showcase/playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:4173' },
});
```

- [ ] **Step 3: Add the `test:e2e` script**

In `examples/showcase/package.json` `scripts`, add:
```json
    "test:e2e": "playwright test"
```

- [ ] **Step 4: Write the golden-path test**

`examples/showcase/e2e/golden-path.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test('an editor edits a post, sees the preview, saves, and the commit carries the right author', async ({ page, request }) => {
  await page.goto('/admin/edit/posts/2026-06-hello');

  // Show the live preview and confirm it renders the design-accurate HTML.
  await page.getByRole('button', { name: /show preview/i }).click();
  await expect(page.locator('section[aria-label="Preview"]')).toContainText('original body');

  // Edit the body, then save through the ?/save action.
  const editor = page.locator('textarea[name="body"]');
  await editor.fill('An edited body line.');
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page).toHaveURL(/saved=1/);

  // The recorded commit carries the session editor as author and omits the committer (so GitHub
  // attributes it to cairn-cms[bot]).
  const commit = await (await request.get('/test/last-commit')).json();
  expect(commit.path).toContain('posts/2026-06-hello');
  expect(commit.author).toEqual({ name: 'Demo Editor', email: 'editor@showcase.test' });
  expect(commit.committer).toBeNull();
  expect(commit.content).toContain('An edited body line.');
});

test('a non-cairn feature coexists with the admin', async ({ page }) => {
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Events' })).toContainText('Season opener');
});
```
The `body` field is the `MarkdownEditor` seam; it mirrors its value to a hidden or backing `textarea[name="body"]`. If the selector does not match the real DOM Carta produces, inspect the rendered editor and target the actual editable surface; the engine guarantees a `name="body"` field carries the value for submit.

- [ ] **Step 5: Run the E2E**

Run: `cd examples/showcase && npm run test:e2e && cd ../..`
Expected: both tests pass. If the save path errors, confirm the dev hooks inject the editor and the GitHub double is installed (the `installFakeGitHub()` call runs at module load in `hooks.server.ts`).

- [ ] **Step 6: Add the CI job**

`.github/workflows/e2e.yml`:
```yaml
name: e2e

on:
  push:
    branches: [main, rebuild]
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
      - run: npm ci
      - run: npm install --prefix examples/showcase
      - run: npx --prefix examples/showcase playwright install --with-deps chromium
      - run: npm --prefix examples/showcase run test:e2e
```

- [ ] **Step 7: Commit**

```bash
git add examples/showcase/package.json examples/showcase/playwright.config.ts examples/showcase/e2e/golden-path.spec.ts .github/workflows/e2e.yml
git commit -m "test(showcase): add the Playwright golden-path and coexistence E2E"
```

---

## Task 10: Operational guards and the key-rotation runbook

Close the remaining Workers guards and document key rotation.

**Files:**
- Create: `examples/showcase/e2e/healthz.spec.ts`
- Create: `docs/runbooks/github-app-key-rotation.md`

- [ ] **Step 1: Confirm healthz through the showcase**

Add a showcase shim for healthz if not already present, then assert it. Create `examples/showcase/src/routes/admin/healthz/+server.ts`:
```typescript
import { json } from '@sveltejs/kit';
import { healthLoad } from '@glw907/cairn-cms/sveltekit';
import { composeRuntime } from '@glw907/cairn-cms';
import { cairn } from '$lib/cairn.config';

export async function GET(event) {
  return json(await healthLoad(composeRuntime(cairn), event));
}
```
Match `healthLoad`'s real signature (read `src/lib/sveltekit/health.ts`); it may take `(runtime, event)` or `(event)` with the runtime closed over. Adjust accordingly.

- [ ] **Step 2: Write the healthz E2E**

`examples/showcase/e2e/healthz.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test('healthz signs a dummy JWT through the real signing path', async ({ request }) => {
  const res = await request.get('/admin/healthz');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body).toHaveProperty('ok');
});
```
The signing self-test needs a key in the environment; if `healthz` reports a signing failure because the dev environment has no `GITHUB_APP_PRIVATE_KEY_B64`, assert the shape of the failure response instead of `ok: true`, and note that the live signing check runs in each site's deployment (Plan 08).

- [ ] **Step 3: Document the bundle-and-startup guard**

The per-site `wrangler deploy --dry-run` guard lands with each site's CI in Plan 08. For Plan 07, the showcase's `npm run build` is the standing bundle sanity check; the e2e CI job already runs it. No new code; this step is the explicit decision, recorded here and in the runbook.

- [ ] **Step 4: Write the key-rotation runbook**

`docs/runbooks/github-app-key-rotation.md`:
```markdown
# GitHub App private key rotation

The engine signs installation-token requests with the GitHub App private key, stored as
`GITHUB_APP_PRIVATE_KEY_B64` (base64 of the PEM) in each site's Worker secrets.

## When to rotate

On suspected exposure, on a maintainer change, or on a routine schedule.

## Steps

1. In the GitHub App settings, generate a new private key. GitHub issues PKCS#1 PEM.
2. Base64-encode the PEM to a single line: `base64 -w0 new-key.pem`.
3. Set the new value on each consuming site's Worker: `npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64`.
4. Hit `/admin/healthz` on each site and confirm the signing self-test passes.
5. Delete the old key in the GitHub App settings.
6. Shred the local PEM files.

## Verification

`/admin/healthz` signs a dummy JWT through the real PKCS#1-to-PKCS#8 path, so a green healthz
confirms the new key works end to end before the old one is removed.
```

- [ ] **Step 5: Run the E2E and commit**

Run: `cd examples/showcase && npm run test:e2e && cd ../..`
Expected: the golden-path, coexistence, and healthz tests pass.
```bash
git add examples/showcase/src/routes/admin/healthz examples/showcase/e2e/healthz.spec.ts docs/runbooks/github-app-key-rotation.md
git commit -m "test(showcase): assert healthz; docs: add the key-rotation runbook"
```

---

## Task 11: Release-candidate publish preparation

Prepare and verify the publish, then hand the outward-facing publish to the owner.

**Files:**
- Modify: `package.json` (version)
- Modify: `.github/workflows/publish.yml`

- [ ] **Step 1: Bump the version**

In the engine `package.json`, set:
```json
  "version": "0.6.0-rc.0",
```

- [ ] **Step 2: Publish under the prerelease dist-tag**

In `.github/workflows/publish.yml`, change the publish step so a prerelease never becomes `latest`:
```yaml
      - run: npm publish --access public --tag rc
```
Add a comment above it noting that the `rc` tag keeps `latest` on the live `0.5.x` and that a stable release at cutover (Plan 08) drops the `--tag rc`.

- [ ] **Step 3: Verify the publishable artifact locally**

Run:
```bash
npm run check:package && npm pack --dry-run
```
Expected: publint and attw pass; `npm pack --dry-run` lists `dist/**` and `src/lib/**` and nothing from `examples/`, `src/routes`, or `src/tests`. If `examples/` or test files appear, fix the `files` array.

- [ ] **Step 4: Commit the release prep**

```bash
git add package.json .github/workflows/publish.yml
git commit -m "release: prepare 0.6.0-rc.0 with the rc dist-tag"
```

- [ ] **Step 5: Owner-run publish (manual, outward-facing)**

Publishing to the public registry is irreversible, so it is a human step. The owner must, once:

1. Confirm the npm Trusted-Publisher entry for `@glw907/cairn-cms` allows this workflow on the `rebuild` branch (npmjs.com, package Settings, Trusted Publisher).
2. Trigger `.github/workflows/publish.yml` via `workflow_dispatch` on the `rebuild` branch.
3. Confirm `npm view @glw907/cairn-cms dist-tags` shows `rc: 0.6.0-rc.0` and `latest` still on `0.5.1`.

Record the published version and the dist-tags as the evidence for this task. Do not run the publish from an agent; stop here and report readiness.

---

## Self-review

**Spec coverage (Plan 07 design):**
- Packaging gates (publint, attw, single-Kit): Task 1.
- Live preview wired with the engine-side DOMPurify floor: Tasks 2 and 3.
- E2E golden path against an in-repo example consumer: Tasks 6 through 9. Realized as the sibling `examples/showcase/` app (own SvelteKit config) rather than the library's own `src/routes`, because the engine's NodeNext library tsconfig and the Plan 00 vitest config make an in-package app invasive; the sibling app meets every goal the design set (dogfoods the public exports as a true consumer, hosts the golden path and the Mode-1 example, stands as the canonical thin-shim reference) and keeps the library build pristine.
- Extensibility Mode 1 proven and tested: Task 4 (isolation) and Task 7 (the `/calendar` feature), asserted live in Task 9.
- Extensibility Mode 2 contract designed and type-declared, composition insertion point confirmed: Task 5. The nav and field-dispatch insertion points are confirmed by inspection and the carried runtime fields; their full wiring is Plan 09, as the design states.
- Operational guards and key rotation: Task 10. The save-to-commit author and committer proof is not duplicated; it already exists in `content-routes-save.test.ts` and `nav-routes-save.test.ts` and is re-exercised live by the Task 9 E2E.
- RC publish `0.6.0-rc.0` under the `rc` dist-tag from the `rebuild` branch: Task 11, with the outward-facing publish handed to the owner.

**Placeholder scan:** No TBD or TODO. The shim and signature confirmations (Tasks 8 and 10) are explicit "read the real export and match it" instructions with concrete fallbacks, not deferred work.

**Type consistency:** `renderPreview` keeps the signature `(md: string) => string | Promise<string>` in the EditPage prop and the showcase adapter. `CairnExtension` gains `adminPanels?: AdminPanel[]` and `fieldTypes?: FieldTypeDef[]`, carried onto `CairnRuntime` as the same optional types and returned by `composeRuntime`. `sanitizePreviewHtml` is async everywhere it is called (the EditPage effect awaits it, the tests await it). The showcase shims import `createContentRoutes`, `composeRuntime`, `healthLoad`, and the components by the names the engine exports, with an explicit instruction to reconcile against the real exports.

**Legacy discipline:** no legacy code is ported here; the showcase shims are the rebuilt thin-shim contract, written fresh against the new engine API, not copied from the better-auth-era site routes.

**Deferred, with reason:** the per-site `wrangler deploy --dry-run` guard, the live signing check, and the full-site coexistence proof ride with each site's CI in Plan 08; the `CairnExtension` machinery is Plan 09; the scaffolder and templates that generate these shims are Plan 10.

---

## Execution post-mortem

Eleven tasks landed on `rebuild`, plus two review-gate fixups. Final gate: `npm run check` 0 errors
and 0 warnings, `npm test` 236 tests exit 0, `npm run check:package` exit 0, and the showcase
Playwright suite 3 passed.

### What was built

- Packaging gates: `peer-deps.test.ts`, a `check:package` script (publint + attw), and CI wiring
  (`60f4b29`).
- A client-only DOMPurify preview sanitizer (`5d102b9`), wired into `EditPage` through an injected
  `renderPreview` (`61d142c`).
- An engine-isolation guard for extension Mode 1 (`9e024b4`), plus the `CairnExtension` admin-panel
  and field-type contract for Mode 2 (`47e2c2d`).
- A permanent example consumer at `examples/showcase/`: the SvelteKit skeleton (`a53cbb4`), an
  adapter and a non-cairn `/calendar` feature (`1aab375`), thin `/admin` shims with a dev session
  injector and an in-memory GitHub double (`8e5a223`), a Playwright golden-path and coexistence E2E
  (`8cb431d`), and a healthz endpoint plus a key-rotation runbook (`9ad2ef2`).
- Release prep: version `0.6.0-rc.0` and the publish workflow under `--tag rc` (`25c64e3`).
- Review fixups on shipped code. Round one added a latest-wins guard and a try/catch to the preview
  effect, `aria-expanded`/`aria-controls` on the toggle, and a `rel="noopener noreferrer"` hook in
  the sanitizer (`937d069`). Round two dropped the now-redundant `aria-pressed`, gated the showcase
  dev backend behind a `SHOWCASE_FAKE_BACKEND` env flag so the example cannot ship a live auth
  bypass, guarded the dompurify server boundary in `carta-boundary.test.ts`, and added
  `check:package` to the publish job (`0f7cfca`).

### Decision changed from the plan

The plan locked "source exports for dev plus a `publishConfig.exports` swap to `dist` on publish."
That does not work: an `npm pack` test on npm 11.15 showed the packed manifest kept the source `.ts`
exports and left `publishConfig` in place, so the swap never applies. Instead, `exports` now point at
`dist/` directly, and a `"prepare": "svelte-package"` script builds `dist` for a git or file consumer
like the showcase. Because svelte-package ships the `.svelte` components as source behind the `svelte`
condition, a Vite consumer still compiles them, so Task 6's source-consumption model holds. This keeps
the original intent (ship dist on publish) on a mechanism that functions. Each attw ignore rule
(`no-resolution`, `cjs-resolves-to-esm`, `internal-resolution-error`) is inherent to an ESM-only
Svelte component library, not a masked defect.

### Real engine names the showcase shims wired (for Plan 08)

`createContentRoutes(runtime, deps)` takes `deps` of `{ mintToken?: (env) => Promise<string> }` and
returns `layoutLoad`, `indexRedirect`, `listLoad`, `createAction`, `editLoad`, and `saveAction`.
Components `AdminShell`, `ConceptList`, and `EditPage` come from `/components`. An `Editor` is
`{ email, displayName, role }`. `composeRuntime(adapter)` accepts a single argument.
`healthLoad(event, runtime)` puts the event first, returns `{ ok, checks }`, and does not throw on a
missing key (dev healthz returns `ok: false`). A save redirects with `?saved=1`. Although the edit
route dir is `edit/[type]/[id]`, the engine reads `params.concept`, so the shim aliases `params.type`
to `params.concept`. For the E2E, the Carta editable surface is the SSR
`textarea[aria-label="Markdown source"]`, which mirrors into a hidden `input[name="body"]` carried on
submit.

### Review gate

Four reviewers ran read-only: security, svelte, and a11y returned PASS_WITH_NITS, workers PASS. None
raised a Critical or Important finding. Both fixup rounds folded the nits in (`937d069`, `0f7cfca`).
A scope note carries to Plan 08: the preview sanitize floor protects the editor's own browser, while
each site's published render path runs through that site's own server pipeline and must sanitize or be
trusted by construction.

### Process incident

An API overload during the Task 1 dispatch led to several blind retries. When the overload cleared,
seven implementer agents ran Task 1 at once. Git serialized them into three linear commits with no
merge corruption, and a soft reset collapsed them into one clean commit (`60f4b29`) since the branch
was unpushed. Lesson: do not blind-retry an agent dispatch on overload; run one at a time and verify
each commit before the next.

### Carried follow-ups

- The owner-run RC publish is still pending: confirm the npm Trusted-Publisher entry for the `rebuild`
  branch, trigger `publish.yml` via `workflow_dispatch`, and confirm `npm view @glw907/cairn-cms
  dist-tags` shows `rc: 0.6.0-rc.0` with `latest` still on `0.5.1`.
- Plan 08 (cutover) repoints both site adapters and all `/admin` shims to the new API using the names
  above, wires each site's `configPath` and nav shim, adds a `wrangler deploy --dry-run` guard and a
  live signing check per site, and merges `rebuild` to `main`.
- The `rebuild` branch sits 50+ commits ahead of `origin/rebuild` and is unpushed; push at the user's
  request.
