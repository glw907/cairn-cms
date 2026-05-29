# Content Model and Adapter Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build cairn's content model and the `CairnAdapter` contract: the fixed Posts and Pages concepts declared through `content: {}`, normalized into uniform descriptors, folded into a runtime through one aggregation point.

**Architecture:** Pure, I/O-free engine logic under `src/lib/content/`. The adapter is the single seam a site implements (spec §8). A normalizer turns each declared concept into a uniform descriptor with concept-fixed routing (seam 1); a composer folds the adapter and any future extensions into a `CairnRuntime` (seam 2); a reserved asset slot is typed but unused (seam 4); the directive component registry's type and factory land here so the adapter can reference them (seam 3, with Plan 04 building the renderer on top). Filename-based ids replace the legacy slug codec. Frontmatter form decoding, serialization, and a field-driven validation helper round out the model.

**Tech Stack:** TypeScript 6 (strict, NodeNext), `gray-matter` for frontmatter, vitest 4 unit project. No I/O, no Worker, no D1; every test runs in the node `unit` project.

---

## Spec mapping

This plan implements spec §6 seams 1, 2, and 4 (and the type half of seam 3), §7.2 (content model), §8 (the adapter contract), and the model-layer half of §7.4 (frontmatter form generation and server-side validation). The render pipeline (§7.5, seam 3's dispatch half) is Plan 04; reads, commits, and the 409 fail-safe (§7.3, the commit half of §7.4) are Plan 03; the admin list and editor surfaces (§7.6) are Plan 05; nav editing (§7.7) is Plan 06.

## File structure

New engine modules:

- `src/lib/render/registry.ts`: the directive component registry (`ComponentDef`, `ComponentRegistry`, `defineRegistry`), seam 3's single declaration. Ported from legacy. Plan 04's renderer derives its dispatch from this; the adapter references the type here.
- `src/lib/content/types.ts`: the adapter contract and the engine-internal descriptors (`CairnAdapter`, `ConceptConfig`, the `FrontmatterField` union, `ValidationResult`, `BackendConfig`, `SenderConfig`, `NavMenuConfig`, `AssetConfig`, `RoutingRule`, `ConceptDescriptor`, `CairnExtension`, `CairnRuntime`).
- `src/lib/content/ids.ts`: filename-based content ids (`isValidId`, `idFromFilename`, `filenameFromId`, `slugify`).
- `src/lib/content/frontmatter.ts`: form decoding and on-disk serialization (`frontmatterFromForm`, `dateInputValue`, `serializeMarkdown`, `parseMarkdown`).
- `src/lib/content/validate.ts`: the field-driven baseline validator a site's `validate` builds on (`validateFields`).
- `src/lib/content/concepts.ts`: seam 1 (`CONCEPT_ROUTING`, `normalizeConcepts`, `findConcept`).
- `src/lib/content/compose.ts`: seam 2 (`composeRuntime`).

Shared test fixture:

- `src/tests/unit/_content-fixture.ts`: `testAdapter`, `postFields`, `pageFields`, mirroring ecnordic's rich Posts form and minimal Pages form.

Modified:

- `src/lib/index.ts`: re-export the content model and adapter surface.

Tests (all in the `unit` project):

- `src/tests/unit/render-registry.test.ts`
- `src/tests/unit/content-types.test.ts`
- `src/tests/unit/content-ids.test.ts`
- `src/tests/unit/content-frontmatter.test.ts`
- `src/tests/unit/content-validate.test.ts`
- `src/tests/unit/content-concepts.test.ts`
- `src/tests/unit/content-compose.test.ts`

## Divergences from the spec's illustrative types, by design

The spec's §8 `FrontmatterField` union is illustrative and omits per-type detail the form needs. This plan preserves the legacy field detail that production relies on: `options` on `tags` (the closed vocabulary), `rows` on `textarea`, and `placeholder` on `freetags`. The spec's `validate(...)` returning a `ValidationResult` replaces legacy's throw-based `validate`, so invalid input bounces to the form rather than raising. The engine adds `validateFields` as the reusable baseline a site's validator calls, keeping sites thin (engine-fat rule).

---

## Task 1: Component registry type and factory (seam 3 declaration)

**Files:**
- Create: `src/lib/render/registry.ts`
- Test: `src/tests/unit/render-registry.test.ts`

The adapter's `registry?` slot needs a type, and the renderer (Plan 04) and the future component palette both derive from one declaration. That declaration is pure data, so it lands here; Plan 04 builds the render pipeline that consumes it. Ported from `legacy/src/lib/render/registry.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/render-registry.test.ts
import { describe, it, expect } from 'vitest';
import { defineRegistry, type ComponentDef } from '../../lib/render/registry.js';

const card: ComponentDef = {
  name: 'card',
  label: 'Card',
  description: 'A bordered card',
  insertTemplate: ':::card\n\n:::',
  build: (node) => node,
  defaultIconByRole: { caution: 'warning' },
};

describe('defineRegistry', () => {
  it('looks a component up by name', () => {
    const reg = defineRegistry({ components: [card] });
    expect(reg.get('card')).toBe(card);
    expect(reg.get('missing')).toBeUndefined();
  });

  it('lists the declared names', () => {
    expect(defineRegistry({ components: [card] }).names).toEqual(['card']);
  });

  it('resolves a role default icon, and undefined without a matching role', () => {
    const reg = defineRegistry({ components: [card] });
    expect(reg.defaultIcon('card', 'caution')).toBe('warning');
    expect(reg.defaultIcon('card')).toBeUndefined();
    expect(reg.defaultIcon('missing', 'caution')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- render-registry`
Expected: FAIL, cannot resolve `../../lib/render/registry.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/render/registry.ts
// cairn-cms: the directive component registry (seam 3). One declaration per component,
// carrying how it inserts in the editor and how it renders in rehype. The render pipeline
// (Plan 04) and the future component palette both derive from this single source, so the
// parser, the render dispatch, and the editor never drift apart. The adapter references
// `ComponentRegistry` from here.
import type { Element } from 'hast';

/** A site component: how it inserts (editor) and how it renders (rehype). */
export interface ComponentDef {
  /** Directive name, e.g. 'card' (matches `:::card`). */
  name: string;
  /** Palette label. */
  label: string;
  /** Palette description. */
  description: string;
  /** Markdown scaffold inserted at the cursor by the editor palette. */
  insertTemplate: string;
  /** Build the final hast element from the stamped directive element. */
  build: (node: Element, rise?: string) => Element;
  /** Optional role-to-default-icon, e.g. `{ caution: 'warning' }`. */
  defaultIconByRole?: Record<string, string>;
}

export interface ComponentRegistry {
  defs: ComponentDef[];
  names: string[];
  get(name: string): ComponentDef | undefined;
  defaultIcon(name: string, role?: string): string | undefined;
}

/**
 * Build a registry from a site's component definitions. The single source the render
 * pipeline (directive stamp plus rehype dispatch) and the editor palette both read.
 */
export function defineRegistry(input: { components: ComponentDef[] }): ComponentRegistry {
  const byName = new Map(input.components.map((c) => [c.name, c]));
  return {
    defs: input.components,
    names: input.components.map((c) => c.name),
    get: (name) => byName.get(name),
    defaultIcon: (name, role) => (role ? byName.get(name)?.defaultIconByRole?.[role] : undefined),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- render-registry`
Expected: PASS, three tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/render/registry.ts src/tests/unit/render-registry.test.ts
git commit -m "feat(content): add the directive component registry type and factory"
```

---

## Task 2: The adapter contract types and shared fixture

**Files:**
- Create: `src/lib/content/types.ts`
- Create: `src/tests/unit/_content-fixture.ts`
- Test: `src/tests/unit/content-types.test.ts`

These types are the public API a site author reads, so they carry exhaustive TSDoc (spec §12). The test is a typed fixture: it constructs a `CairnAdapter`, narrows the `FrontmatterField` union, and exercises the `ValidationResult` discriminant. Type errors surface in `npm run check`; the runtime assertions confirm the fixture is shaped right.

- [ ] **Step 1: Write the failing test and the shared fixture**

```ts
// src/tests/unit/_content-fixture.ts
// A fixture adapter mirroring ecnordic's two concepts: the rich Posts form and the
// minimal Pages form. Shared across the content-model unit tests so the field shapes
// match what the editor and the validator rely on.
import type { CairnAdapter, FrontmatterField } from '../../lib/content/types.js';

export const postFields: FrontmatterField[] = [
  { type: 'text', name: 'title', label: 'Title', required: true },
  { type: 'date', name: 'date', label: 'Date', required: true },
  { type: 'textarea', name: 'description', label: 'Description', required: true },
  { type: 'tags', name: 'tags', label: 'Tags', options: ['training', 'racing'] },
  { type: 'boolean', name: 'draft', label: 'Draft' },
];

export const pageFields: FrontmatterField[] = [
  { type: 'text', name: 'title', label: 'Title', required: true },
];

export const testAdapter: CairnAdapter = {
  siteName: 'Test',
  content: {
    // posts omits `label` to exercise the default; pages overrides it.
    posts: {
      dir: 'src/content/posts',
      fields: postFields,
      validate: (frontmatter) => ({ ok: true, data: frontmatter }),
    },
    pages: {
      label: 'Site Pages',
      dir: 'src/content/pages',
      fields: pageFields,
      validate: (frontmatter) => ({ ok: true, data: frontmatter }),
    },
  },
  backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'noreply@test.example' },
  renderPreview: (md) => md,
};
```

```ts
// src/tests/unit/content-types.test.ts
import { describe, it, expect } from 'vitest';
import type { FrontmatterField, ValidationResult } from '../../lib/content/types.js';
import { testAdapter, postFields } from './_content-fixture.js';

// A switch over the discriminant; if the union is wrong this fails to type-check under
// `npm run check`. The runtime body just proves each arm is reachable.
function widgetFor(field: FrontmatterField): string {
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'date':
      return 'input';
    case 'boolean':
      return 'checkbox';
    case 'tags':
      return `checkboxes:${field.options.length}`;
    case 'freetags':
      return 'csv';
  }
}

describe('adapter contract types', () => {
  it('declares the two concepts with their directories', () => {
    expect(testAdapter.content.posts?.dir).toBe('src/content/posts');
    expect(testAdapter.content.pages?.dir).toBe('src/content/pages');
  });

  it('narrows each field type to its widget', () => {
    expect(postFields.map(widgetFor)).toEqual(['input', 'input', 'input', 'checkbox', 'checkboxes:2']);
  });

  it('discriminates a ValidationResult', () => {
    const ok: ValidationResult = { ok: true, data: { title: 'X' } };
    const bad: ValidationResult = { ok: false, errors: { title: 'Title is required' } };
    expect(ok.ok ? ok.data.title : null).toBe('X');
    expect(bad.ok ? null : bad.errors.title).toBe('Title is required');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- content-types`
Expected: FAIL, cannot resolve `../../lib/content/types.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/content/types.ts
// cairn-cms: the adapter contract a site implements, and the engine-internal descriptors
// the contract normalizes into.
//
// The adapter is the single seam the engine consumes (spec §8). A site supplies a
// `CairnAdapter` at `src/lib/cairn.config.ts` declaring its backend repo, the content
// concepts it enables, its magic-link sender, and a design-accurate `renderPreview`. The
// engine never hard-codes a concept, directory, or field; it reads them here. Field
// descriptors are plain data so a `load` function can hand them across the server-to-client
// boundary to the editor form.
import type { ComponentRegistry } from '../render/registry.js';

/** Common to every frontmatter field: the frontmatter key, the form label, and whether it is required. */
interface FieldBase {
  /** Frontmatter key and form input name. */
  name: string;
  /** Form label. */
  label: string;
  /** A required field fails validation when empty (spec §7.4). */
  required?: boolean;
}

/** A single-line text input. */
export interface TextField extends FieldBase {
  type: 'text';
}
/** A multi-line text input. */
export interface TextareaField extends FieldBase {
  type: 'textarea';
  /** Visible rows; the editor picks a default when omitted. */
  rows?: number;
}
/** A `YYYY-MM-DD` date input. */
export interface DateField extends FieldBase {
  type: 'date';
}
/** A checkbox; absent means false. */
export interface BooleanField extends FieldBase {
  type: 'boolean';
}
/** A closed-vocabulary tag set, rendered as checkboxes (ecnordic). */
export interface TagsField extends FieldBase {
  type: 'tags';
  /** The controlled vocabulary. */
  options: readonly string[];
}
/** Free-form tags, edited as one comma-separated input (907). */
export interface FreeTagsField extends FieldBase {
  type: 'freetags';
  placeholder?: string;
}

/**
 * The discriminated union the per-concept frontmatter form is generated from. Adding a
 * field type is one variant here plus one decode arm in `frontmatterFromForm` and one in
 * `validateFields`.
 */
export type FrontmatterField =
  | TextField
  | TextareaField
  | DateField
  | BooleanField
  | TagsField
  | FreeTagsField;

/**
 * A validator's verdict. On success it carries the normalized frontmatter to commit; on
 * failure it carries field-keyed error messages (the empty key is a form-level error).
 * Invalid input bounces to the form and never reaches git (spec §7.4).
 */
export type ValidationResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> };

/**
 * Per-site configuration for one content concept (spec §8). Concept-fixed behavior such as
 * routability is not here; it lives in the engine's routing table (`CONCEPT_ROUTING`).
 */
export interface ConceptConfig {
  /** Repo-relative content directory, e.g. "src/content/posts". */
  dir: string;
  /** Sidebar label; defaults from the concept id when omitted. */
  label?: string;
  /** Drives the per-concept frontmatter form, in order. */
  fields: FrontmatterField[];
  /** Validate submitted frontmatter before any commit. */
  validate(frontmatter: Record<string, unknown>, body: string): ValidationResult;
}

/** The GitHub App backend a site reads from and commits to (spec §8). Plain data the GitHub engine (Plan 03) consumes. */
export interface BackendConfig {
  owner: string;
  repo: string;
  /** Commit target, e.g. "main". */
  branch: string;
  appId: string;
  installationId: string;
}

/** Magic-link sender identity for Cloudflare Email Sending. */
export interface SenderConfig {
  from: string;
  replyTo?: string;
}

/** A git-committed YAML menu this site's nav editor manages (Plan 06). */
export interface NavMenuConfig {
  /** Repo-relative path to the site-config YAML, e.g. "src/lib/site.config.yaml". */
  configPath: string;
  /** Key within the file's menus map, e.g. "primary". */
  menuName: string;
  /** Sidebar label for the menu. */
  label: string;
  /** Max nesting depth allowed in the editor; defaults to 2. */
  maxDepth?: number;
}

/** Reserved asset slot (seam 4). Typed and unused in the rebuild; R7/R9 read it later with no contract change. */
export interface AssetConfig {
  /** Repo-relative asset roots, e.g. ["static/images"]. */
  roots: string[];
  /** Public URL base, e.g. "/images". */
  publicBase: string;
}

/** The single seam the engine consumes. A site implements this at `src/lib/cairn.config.ts`. */
export interface CairnAdapter {
  siteName: string;
  /**
   * Which content concepts this site enables. A future `fragments?` key attaches here with
   * no reshape of the contract (seam 1). A site never has two of the same concept.
   */
  content: {
    posts?: ConceptConfig;
    pages?: ConceptConfig;
  };
  backend: BackendConfig;
  sender: SenderConfig;
  /** Design-accurate preview: the same render pipeline the site ships. */
  renderPreview(md: string): string | Promise<string>;
  /** Directive component registry; the renderer and the future palette derive from it (seam 3). */
  registry?: ComponentRegistry;
  navMenu?: NavMenuConfig;
  assets?: AssetConfig;
}

/**
 * Concept-fixed routing for a normalized concept (spec §7.2). Posts are dated feed entries;
 * pages are plain navigable structure. Not in adapter config.
 */
export interface RoutingRule {
  /** Routable as a standalone URL. A future Fragments concept is embedded, not routable. */
  routable: boolean;
  /** Carries a date (posts). */
  dated: boolean;
  /** Appears in feeds and the sitemap (posts). */
  inFeeds: boolean;
}

/**
 * The engine-internal, uniform view of one concept after normalization (seam 1). The admin
 * nav, the list views, and the editor all read this, never the raw config.
 */
export interface ConceptDescriptor {
  /** Concept id, the key under `content`, e.g. "posts". */
  id: string;
  label: string;
  dir: string;
  routing: RoutingRule;
  fields: FrontmatterField[];
  validate(frontmatter: Record<string, unknown>, body: string): ValidationResult;
}

/**
 * A future build-time extension (seam 2). It folds in the same way the adapter does and
 * contributes the same kinds of things. Reserved and unused in the rebuild; the shape is
 * fixed now so the extension contract is additive later.
 */
export interface CairnExtension {
  /** Additional concepts, merged after the adapter's. */
  content?: Record<string, ConceptConfig>;
  // Future: nav entries, route logic, components, field types, save hooks.
}

/**
 * The composed runtime the engine serves from (seam 2 output). The single aggregation point
 * (`composeRuntime`) folds the adapter and any extensions into this shape.
 */
export interface CairnRuntime {
  siteName: string;
  concepts: ConceptDescriptor[];
  backend: BackendConfig;
  sender: SenderConfig;
  renderPreview(md: string): string | Promise<string>;
  registry?: ComponentRegistry;
  navMenu?: NavMenuConfig;
  assets?: AssetConfig;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- content-types`
Expected: PASS, three tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/types.ts src/tests/unit/_content-fixture.ts src/tests/unit/content-types.test.ts
git commit -m "feat(content): add the adapter contract types"
```

---

## Task 3: Filename-based content ids

**Files:**
- Create: `src/lib/content/ids.ts`
- Test: `src/tests/unit/content-ids.test.ts`

A content entry's id is its markdown filename without `.md`; there is no slug codec (spec §7.2). `slugify` derives an editable filename stem from a title for the create-entry form. Ported from `legacy/src/lib/slug.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/content-ids.test.ts
import { describe, it, expect } from 'vitest';
import { isValidId, idFromFilename, filenameFromId, slugify } from '../../lib/content/ids.js';

describe('id and filename', () => {
  it('strips the .md suffix to get an id', () => {
    expect(idFromFilename('first-snow.md')).toBe('first-snow');
    expect(idFromFilename('about.md')).toBe('about');
  });

  it('appends .md to get a filename', () => {
    expect(filenameFromId('first-snow')).toBe('first-snow.md');
  });

  it('accepts a lowercase hyphenated id', () => {
    expect(isValidId('first-snow')).toBe(true);
    expect(isValidId('about')).toBe(true);
  });

  it('rejects uppercase, slashes, and edge hyphens', () => {
    expect(isValidId('First-Snow')).toBe(false);
    expect(isValidId('a/b')).toBe(false);
    expect(isValidId('-lead')).toBe(false);
    expect(isValidId('trail-')).toBe(false);
    expect(isValidId('')).toBe(false);
  });
});

describe('slugify', () => {
  it('lowercases and hyphenates a title', () => {
    expect(slugify('First Snow')).toBe('first-snow');
  });
  it('drops apostrophes without a spurious hyphen', () => {
    expect(slugify("Geoff's Notes")).toBe('geoffs-notes');
  });
  it('collapses non-alphanumeric runs and trims edges', () => {
    expect(slugify('  Hello, World!  ')).toBe('hello-world');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- content-ids`
Expected: FAIL, cannot resolve `../../lib/content/ids.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/content/ids.ts
// cairn-cms: filename-based content ids (spec §7.2). An entry's id is its markdown filename
// without `.md`, so there is no slug codec. `slugify` derives a filename-safe stem from a
// title for the create-entry form.

/** Lowercase alphanumerics with single internal hyphens: the on-disk filename stem rule. */
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** True when `id` is a valid filename stem: lowercase, no slashes, no leading or trailing hyphen. */
export function isValidId(id: string): boolean {
  return ID_RE.test(id);
}

/** A content entry's id from its filename: the basename without the `.md` suffix. */
export function idFromFilename(filename: string): string {
  return filename.replace(/\.md$/, '');
}

/** The on-disk filename for an id: the id plus `.md`. */
export function filenameFromId(id: string): string {
  return `${id}.md`;
}

/**
 * Lowercase a title into a filename-safe slug stem. Apostrophes are dropped so "Geoff's"
 * becomes "geoffs" (no spurious hyphen). All other non-alphanumeric runs collapse to a
 * single hyphen; leading and trailing hyphens are trimmed.
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- content-ids`
Expected: PASS, six tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/ids.ts src/tests/unit/content-ids.test.ts
git commit -m "feat(content): add filename-based content ids and slugify"
```

---

## Task 4: Frontmatter form decoding and serialization

**Files:**
- Create: `src/lib/content/frontmatter.ts`
- Test: `src/tests/unit/content-frontmatter.test.ts`

`frontmatterFromForm` decodes submitted form data one rule per field type; `dateInputValue` coerces a frontmatter date to what `<input type="date">` wants; `serializeMarkdown` and `parseMarkdown` are the on-disk read/write pair. Ported from `legacy/src/lib/adapter.ts`, `frontmatter.ts`, and `content.ts`, with the characterization tests carried over.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/content-frontmatter.test.ts
import { describe, it, expect } from 'vitest';
import matter from 'gray-matter';
import {
  frontmatterFromForm,
  dateInputValue,
  serializeMarkdown,
  parseMarkdown,
} from '../../lib/content/frontmatter.js';
import type { FrontmatterField } from '../../lib/content/types.js';
import { postFields, pageFields } from './_content-fixture.js';

describe('frontmatterFromForm', () => {
  it('decodes each field by type for a post', () => {
    const form = new FormData();
    form.set('title', 'First Snow');
    form.set('date', '2026-01-05');
    form.set('description', 'It snowed.');
    form.append('tags', 'training');
    form.append('tags', 'racing');
    form.set('draft', 'on');

    expect(frontmatterFromForm(postFields, form)).toEqual({
      title: 'First Snow',
      date: '2026-01-05',
      description: 'It snowed.',
      tags: ['training', 'racing'],
      draft: true,
    });
  });

  it('treats an absent checkbox as false and absent tags as empty', () => {
    const form = new FormData();
    form.set('title', 'Draft Off');
    form.set('date', '2026-01-05');
    form.set('description', 'x');

    const data = frontmatterFromForm(postFields, form);
    expect(data.draft).toBe(false);
    expect(data.tags).toEqual([]);
  });

  it('splits, trims, and de-duplicates a free-form tags field', () => {
    const fields: FrontmatterField[] = [{ type: 'freetags', name: 'tags', label: 'Tags' }];
    const form = new FormData();
    form.set('tags', ' alpha , beta,alpha , , gamma ');

    expect(frontmatterFromForm(fields, form)).toEqual({ tags: ['alpha', 'beta', 'gamma'] });
  });

  it('treats an empty free-form tags input as an empty list', () => {
    const fields: FrontmatterField[] = [{ type: 'freetags', name: 'tags', label: 'Tags' }];
    expect(frontmatterFromForm(fields, new FormData())).toEqual({ tags: [] });
  });

  it('reads only the declared field for a page', () => {
    const form = new FormData();
    form.set('title', 'About');
    form.set('date', 'ignored, not a page field');

    expect(frontmatterFromForm(pageFields, form)).toEqual({ title: 'About' });
  });
});

describe('dateInputValue', () => {
  it('formats a Date as YYYY-MM-DD with no timezone shift', () => {
    expect(dateInputValue(new Date('2026-05-14T00:00:00.000Z'))).toBe('2026-05-14');
  });
  it('slices an ISO datetime string to the date', () => {
    expect(dateInputValue('2026-05-14T10:30:00Z')).toBe('2026-05-14');
  });
  it('passes a bare YYYY-MM-DD string through', () => {
    expect(dateInputValue('2026-05-14')).toBe('2026-05-14');
  });
  it('returns empty for a missing, non-date, or invalid value', () => {
    expect(dateInputValue(undefined)).toBe('');
    expect(dateInputValue(null)).toBe('');
    expect(dateInputValue(42)).toBe('');
    expect(dateInputValue(new Date('nonsense'))).toBe('');
    expect(dateInputValue('not a date')).toBe('');
  });
});

describe('serialize and parse', () => {
  it('round-trips frontmatter and body', () => {
    const data = { title: 'Welcome', date: '2026-05-01', draft: false, tags: ['training'] };
    const body = '# Hello\n\nFirst post.\n';

    const out = serializeMarkdown(data, body);
    expect(out).toMatch(/^---\n/);

    const parsed = matter(out);
    expect(parsed.data).toEqual(data);
    expect(parsed.content.trim()).toBe(body.trim());
  });

  it('parses a file back into frontmatter and body', () => {
    const source = '---\ntitle: About\n---\n\nThe body.\n';
    expect(parseMarkdown(source)).toEqual({ frontmatter: { title: 'About' }, body: '\nThe body.\n' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- content-frontmatter`
Expected: FAIL, cannot resolve `../../lib/content/frontmatter.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/content/frontmatter.ts
// cairn-cms: frontmatter form decoding and on-disk serialization. `frontmatterFromForm`
// is the form-to-data half of the edit loop; `serializeMarkdown`/`parseMarkdown` are the
// on-disk write/read pair. Kept as one seam so a site owns its serialization contract
// (quoting, key order) without the save endpoint reaching for gray-matter directly.
import matter from 'gray-matter';
import type { FrontmatterField } from './types.js';

/** Decode submitted form data into raw frontmatter, one rule per field type. */
export function frontmatterFromForm(
  fields: FrontmatterField[],
  form: FormData,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    switch (field.type) {
      case 'boolean':
        data[field.name] = form.get(field.name) === 'on';
        break;
      case 'tags':
        data[field.name] = form.getAll(field.name).map(String);
        break;
      case 'freetags':
        // One comma-separated input to trimmed, de-duplicated, non-empty tags.
        data[field.name] = [
          ...new Set(
            String(form.get(field.name) ?? '')
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean),
          ),
        ];
        break;
      default:
        data[field.name] = form.get(field.name);
    }
  }
  return data;
}

/**
 * Coerce a frontmatter date value to the `YYYY-MM-DD` an `<input type="date">` wants.
 * gray-matter parses an unquoted YAML date into a JS Date, so a string-only read would
 * leave the input empty and drop the date on save. A parsed YAML date is UTC midnight, so
 * slicing the ISO string avoids a local-timezone shift.
 */
export function dateInputValue(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : '';
  }
  return '';
}

/** Reassemble a markdown file from frontmatter and body for committing. */
export function serializeMarkdown(frontmatter: object, body: string): string {
  return matter.stringify(body, frontmatter);
}

/** Parse a markdown file into its frontmatter and body: the read-side inverse of serialize. */
export function parseMarkdown(source: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const parsed = matter(source);
  return { frontmatter: parsed.data, body: parsed.content };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- content-frontmatter`
Expected: PASS, all decode, date, and serialize tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/frontmatter.ts src/tests/unit/content-frontmatter.test.ts
git commit -m "feat(content): add frontmatter form decoding and serialization"
```

---

## Task 5: The field-driven baseline validator

**Files:**
- Create: `src/lib/content/validate.ts`
- Test: `src/tests/unit/content-validate.test.ts`

`validateFields` is the reusable baseline a site's `validate` calls: required fields must be non-empty and each value coerces to its field's type, returning normalized data or field-keyed errors. This keeps the per-site validator thin (engine-fat rule). The differentiated post-versus-page field shape (spec §7.4) is what makes a post require a date while a page does not.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/content-validate.test.ts
import { describe, it, expect } from 'vitest';
import { validateFields } from '../../lib/content/validate.js';
import type { FrontmatterField } from '../../lib/content/types.js';
import { postFields, pageFields } from './_content-fixture.js';

describe('validateFields', () => {
  it('accepts a complete post and normalizes its values', () => {
    const result = validateFields(postFields, {
      title: 'First Snow',
      date: '2026-01-05',
      description: 'It snowed.',
      tags: ['training'],
      draft: true,
    });
    expect(result).toEqual({
      ok: true,
      data: {
        title: 'First Snow',
        date: '2026-01-05',
        description: 'It snowed.',
        tags: ['training'],
        draft: true,
      },
    });
  });

  it('flags each missing required field by name', () => {
    const result = validateFields(postFields, { title: '', date: '', description: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual({
        title: 'Title is required',
        date: 'Date is required',
        description: 'Description is required',
      });
    }
  });

  it('coerces an absent boolean to false and absent tags to an empty list', () => {
    const result = validateFields(postFields, { title: 'T', date: '2026-01-05', description: 'x' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.draft).toBe(false);
      expect(result.data.tags).toEqual([]);
    }
  });

  it('requires only a title for a page', () => {
    expect(validateFields(pageFields, { title: 'About' })).toEqual({ ok: true, data: { title: 'About' } });
    expect(validateFields(pageFields, { title: '' }).ok).toBe(false);
  });

  it('treats a missing required tags vocabulary as an error', () => {
    const fields: FrontmatterField[] = [
      { type: 'tags', name: 'tags', label: 'Tags', options: ['a'], required: true },
    ];
    const result = validateFields(fields, { tags: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.tags).toBe('Tags is required');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- content-validate`
Expected: FAIL, cannot resolve `../../lib/content/validate.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/content/validate.ts
// cairn-cms: the field-driven baseline validator. A site's `validate` calls this for the
// required-and-coerce baseline, then layers any bespoke rules on top, so the per-site
// validator stays thin (engine-fat rule). Saving runs the concept's validator on the
// server before any commit; invalid input bounces to the form (spec §7.4).
import type { FrontmatterField, ValidationResult } from './types.js';

/**
 * Validate raw frontmatter against a field list. Required text and date fields must be
 * non-empty; required tag fields must be non-empty lists. Booleans coerce to `true`/`false`
 * and tag fields to string arrays. Returns the normalized data, or field-keyed errors when
 * any required field is empty.
 */
export function validateFields(
  fields: FrontmatterField[],
  frontmatter: Record<string, unknown>,
): ValidationResult {
  const data: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = frontmatter[field.name];
    switch (field.type) {
      case 'boolean':
        data[field.name] = value === true;
        break;
      case 'tags':
      case 'freetags': {
        const list = Array.isArray(value) ? value.map(String) : [];
        if (field.required && list.length === 0) errors[field.name] = `${field.label} is required`;
        data[field.name] = list;
        break;
      }
      default: {
        const text = typeof value === 'string' ? value.trim() : '';
        if (field.required && text === '') errors[field.name] = `${field.label} is required`;
        data[field.name] = text;
      }
    }
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, data };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- content-validate`
Expected: PASS, five tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/validate.ts src/tests/unit/content-validate.test.ts
git commit -m "feat(content): add the field-driven baseline validator"
```

---

## Task 6: Concept normalization (seam 1)

**Files:**
- Create: `src/lib/content/concepts.ts`
- Test: `src/tests/unit/content-concepts.test.ts`

`normalizeConcepts` turns each declared concept into a uniform descriptor carrying its id, label, directory, concept-fixed routing, fields, and validator (seam 1). Concept-fixed routing lives in an engine table, not config. The routing table is injectable, so a contract test proves a third concept (Fragments) attaches with one key under `content` and one routing entry, with no reshape of the normalizer.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/content-concepts.test.ts
import { describe, it, expect } from 'vitest';
import { CONCEPT_ROUTING, normalizeConcepts, findConcept } from '../../lib/content/concepts.js';
import type { ConceptConfig, RoutingRule } from '../../lib/content/types.js';
import { testAdapter } from './_content-fixture.js';

describe('normalizeConcepts', () => {
  it('normalizes the declared concepts in declaration order', () => {
    const descriptors = normalizeConcepts(testAdapter.content);
    expect(descriptors.map((c) => c.id)).toEqual(['posts', 'pages']);
  });

  it('defaults the label from the id, and honors an explicit label', () => {
    const descriptors = normalizeConcepts(testAdapter.content);
    expect(descriptors.find((c) => c.id === 'posts')?.label).toBe('Posts');
    expect(descriptors.find((c) => c.id === 'pages')?.label).toBe('Site Pages');
  });

  it('attaches concept-fixed routing: posts are dated feed entries, pages are plain', () => {
    const descriptors = normalizeConcepts(testAdapter.content);
    expect(descriptors.find((c) => c.id === 'posts')?.routing).toEqual({
      routable: true,
      dated: true,
      inFeeds: true,
    });
    expect(descriptors.find((c) => c.id === 'pages')?.routing).toEqual({
      routable: true,
      dated: false,
      inFeeds: false,
    });
  });

  it('skips an undeclared concept', () => {
    const descriptors = normalizeConcepts({ posts: testAdapter.content.posts, pages: undefined });
    expect(descriptors.map((c) => c.id)).toEqual(['posts']);
  });

  // Seam 1 contract: a third concept attaches by adding one key under `content` and one
  // routing entry, with no reshape of the normalizer.
  it('attaches a Fragments concept additively without reshaping the contract', () => {
    const fragments: ConceptConfig = {
      dir: 'src/content/fragments',
      fields: [{ type: 'text', name: 'title', label: 'Title' }],
      validate: (frontmatter) => ({ ok: true, data: frontmatter }),
    };
    const routing: Record<string, RoutingRule> = {
      ...CONCEPT_ROUTING,
      fragments: { routable: false, dated: false, inFeeds: false },
    };
    const descriptors = normalizeConcepts({ ...testAdapter.content, fragments }, routing);

    expect(descriptors.map((c) => c.id)).toEqual(['posts', 'pages', 'fragments']);
    expect(descriptors.find((c) => c.id === 'fragments')?.routing.routable).toBe(false);
    // The existing concepts are untouched.
    expect(descriptors.find((c) => c.id === 'posts')?.routing.dated).toBe(true);
  });
});

describe('findConcept', () => {
  it('finds a normalized concept by id, undefined when absent', () => {
    const descriptors = normalizeConcepts(testAdapter.content);
    expect(findConcept(descriptors, 'pages')?.dir).toBe('src/content/pages');
    expect(findConcept(descriptors, 'events')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- content-concepts`
Expected: FAIL, cannot resolve `../../lib/content/concepts.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/content/concepts.ts
// cairn-cms: concept normalization (seam 1). The adapter declares concepts as
// `content: { posts?, pages? }`; this turns each declared key into a uniform descriptor
// (id, label, directory, concept-fixed routing, fields, validator) the admin reads. A
// future Fragments concept attaches by adding one key under `content` and one routing
// entry, with no reshape here.
import type { ConceptConfig, ConceptDescriptor, RoutingRule } from './types.js';

/**
 * Concept-fixed routing, keyed by concept id (spec §7.2). Posts are dated feed entries;
 * pages are plain navigable structure. Not in adapter config. A future Fragments adds one
 * entry here and one key under `content`.
 */
export const CONCEPT_ROUTING: Record<string, RoutingRule> = {
  posts: { routable: true, dated: true, inFeeds: true },
  pages: { routable: true, dated: false, inFeeds: false },
};

/** Routing for a concept with no table entry: a plain, non-feed, routable page. */
const DEFAULT_ROUTING: RoutingRule = { routable: true, dated: false, inFeeds: false };

/** Title-case a concept id for the default sidebar label, e.g. "posts" to "Posts". */
function defaultLabel(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

/**
 * Normalize an adapter's declared concepts into uniform descriptors (seam 1). Each declared
 * key under `content` becomes one descriptor; an undeclared (`undefined`) concept is
 * skipped. `routing` is injectable so a contract test can prove a new concept attaches
 * additively; production passes the default `CONCEPT_ROUTING`.
 */
export function normalizeConcepts(
  content: Record<string, ConceptConfig | undefined>,
  routing: Record<string, RoutingRule> = CONCEPT_ROUTING,
): ConceptDescriptor[] {
  const descriptors: ConceptDescriptor[] = [];
  for (const [id, config] of Object.entries(content)) {
    if (!config) continue;
    descriptors.push({
      id,
      label: config.label ?? defaultLabel(id),
      dir: config.dir,
      routing: routing[id] ?? DEFAULT_ROUTING,
      fields: config.fields,
      validate: config.validate,
    });
  }
  return descriptors;
}

/** Look up a normalized concept by id, or undefined when the site does not enable it. */
export function findConcept(
  concepts: ConceptDescriptor[],
  id: string,
): ConceptDescriptor | undefined {
  return concepts.find((concept) => concept.id === id);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- content-concepts`
Expected: PASS, all normalization and lookup tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/concepts.ts src/tests/unit/content-concepts.test.ts
git commit -m "feat(content): add concept normalization with concept-fixed routing"
```

---

## Task 7: Composition aggregation (seam 2)

**Files:**
- Create: `src/lib/content/compose.ts`
- Test: `src/tests/unit/content-compose.test.ts`

`composeRuntime` is the single aggregation point that folds the adapter and any extensions into a `CairnRuntime` (seam 2). Extensions merge their concepts after the adapter's, the same way a future `CairnExtension` will contribute nav entries, routes, components, field types, and save hooks. The asset slot (seam 4) passes through untouched.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/content-compose.test.ts
import { describe, it, expect } from 'vitest';
import { composeRuntime } from '../../lib/content/compose.js';
import type { CairnAdapter, CairnExtension, ConceptConfig } from '../../lib/content/types.js';
import { testAdapter } from './_content-fixture.js';

describe('composeRuntime', () => {
  it('folds the adapter into a runtime carrying the normalized concepts and backend', () => {
    const runtime = composeRuntime(testAdapter);
    expect(runtime.siteName).toBe('Test');
    expect(runtime.concepts.map((c) => c.id)).toEqual(['posts', 'pages']);
    expect(runtime.backend).toEqual(testAdapter.backend);
    expect(runtime.renderPreview('x')).toBe('x');
  });

  // Seam 2 contract: an extension folds in additively, the same way the adapter does.
  it('folds an extension concept in after the adapter concepts', () => {
    const fragments: ConceptConfig = {
      dir: 'src/content/fragments',
      fields: [{ type: 'text', name: 'title', label: 'Title' }],
      validate: (frontmatter) => ({ ok: true, data: frontmatter }),
    };
    const extension: CairnExtension = { content: { fragments } };
    const runtime = composeRuntime(testAdapter, [extension]);
    expect(runtime.concepts.map((c) => c.id)).toEqual(['posts', 'pages', 'fragments']);
  });

  // Seam 4 contract: the reserved asset slot passes through untouched.
  it('passes the reserved asset slot through, and omits it when absent', () => {
    expect(composeRuntime(testAdapter).assets).toBeUndefined();
    const withAssets: CairnAdapter = {
      ...testAdapter,
      assets: { roots: ['static/images'], publicBase: '/images' },
    };
    expect(composeRuntime(withAssets).assets).toEqual({ roots: ['static/images'], publicBase: '/images' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- content-compose`
Expected: FAIL, cannot resolve `../../lib/content/compose.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/content/compose.ts
// cairn-cms: composition aggregation (seam 2). One place folds the adapter and any
// extensions into the runtime the engine serves from. A future `CairnExtension` folds in
// the same way and contributes the same kinds of things: nav entries, route logic,
// concepts, components, field types, and save hooks. Shaped now so the extension contract
// is additive later.
import type { CairnAdapter, CairnExtension, CairnRuntime, ConceptConfig } from './types.js';
import { normalizeConcepts } from './concepts.js';

/**
 * Fold an adapter and any extensions into the composed runtime (seam 2). Extension concepts
 * merge after the adapter's. The asset slot (seam 4) passes through untouched.
 */
export function composeRuntime(
  adapter: CairnAdapter,
  extensions: CairnExtension[] = [],
): CairnRuntime {
  const content: Record<string, ConceptConfig | undefined> = { ...adapter.content };
  for (const extension of extensions) {
    Object.assign(content, extension.content);
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
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- content-compose`
Expected: PASS, three tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/compose.ts src/tests/unit/content-compose.test.ts
git commit -m "feat(content): add the composition aggregation point"
```

---

## Task 8: Wire the package exports and run the gate

**Files:**
- Modify: `src/lib/index.ts`

- [ ] **Step 1: Re-export the content model and adapter surface**

Replace `src/lib/index.ts`:
```ts
// Engine entry. Auth landed in Plan 01; the content model and adapter land in Plan 02;
// github, render, and nav follow.
export { requireOrigin } from './env.js';
export type { Role, Editor, AuthEnv } from './auth/types.js';
export type { AuthBranding, MagicLinkMessage, SendMagicLink } from './email.js';
export { buildMagicLinkMessage, cloudflareSend } from './email.js';

// Content model and adapter contract (Plan 02).
export type {
  CairnAdapter,
  ConceptConfig,
  FrontmatterField,
  TextField,
  TextareaField,
  DateField,
  BooleanField,
  TagsField,
  FreeTagsField,
  ValidationResult,
  BackendConfig,
  SenderConfig,
  NavMenuConfig,
  AssetConfig,
  RoutingRule,
  ConceptDescriptor,
  CairnExtension,
  CairnRuntime,
} from './content/types.js';
export { CONCEPT_ROUTING, normalizeConcepts, findConcept } from './content/concepts.js';
export { composeRuntime } from './content/compose.js';
export {
  frontmatterFromForm,
  dateInputValue,
  serializeMarkdown,
  parseMarkdown,
} from './content/frontmatter.js';
export { validateFields } from './content/validate.js';
export { isValidId, idFromFilename, filenameFromId, slugify } from './content/ids.js';
export { defineRegistry } from './render/registry.js';
export type { ComponentDef, ComponentRegistry } from './render/registry.js';
```

- [ ] **Step 2: Run the full gate**

Run:
```bash
npm run check
npm test
npm run package
```
Expected: `svelte-check` 0 errors (the one "no svelte input files" warning stays until Plan 05); both vitest projects pass, including every new content test; `svelte-package` builds `dist/` with the content and render-registry modules under the `.` subpath.

- [ ] **Step 3: Commit**

```bash
git add src/lib/index.ts
git commit -m "feat(content): export the content model and adapter surface"
```

---

## Task 9: Exit criteria

**Files:** none (verification only).

- [ ] **Step 1: Confirm the seam contract tests are present**

Each seam this plan touches maps to a passing contract test:

| Seam | Spec | Test |
|---|---|---|
| 1 content-concept normalization | §6.1, §7.2 | `content-concepts` (Fragments attaches additively) |
| 2 composition aggregation | §6.2 | `content-compose` (extension folds in additively) |
| 3 component registry declaration | §6.3 | `render-registry` (one declaration, derived lookups) |
| 4 asset/media config slot | §6.4 | `content-compose` (asset slot passes through) |

- [ ] **Step 2: Confirm the content acceptance scenarios this plan covers**

The model-layer half of the content scenarios (spec §10) maps to passing tests; the rest are deferred to their plans:

| Scenario | Coverage |
|---|---|
| 10 `/admin` lists the enabled concepts | `content-compose` runtime.concepts drives the nav; the list view is Plan 05 |
| 11 a post shows rich frontmatter, a page minimal | `content-types` plus `content-concepts` (the differentiated field config); the form UI is Plan 05 |
| 13 invalid frontmatter returns an error, writes nothing | `content-validate` (the validator verdict); the form round-trip is Plan 05 |
| 12 live preview, 14 commit attribution, 15 conflict | deferred to render (Plan 04) and github (Plan 03) |

- [ ] **Step 3: Confirm no `kind` discriminator or collections array crept in**

Run:
```bash
grep -rn "kind\b\|collections\b\|findCollection" src/lib/content && echo "LEAK" || echo "clean: concept-keyed content model only"
```
Expected: "clean: concept-keyed content model only".

- [ ] **Step 4: Confirm the full suite and gate are green**

Run:
```bash
npm run check
npm test
```
Expected: 0 errors; all unit and integration projects pass.

**Plan 02 is complete when every step passes.** The engine now owns the content model and the adapter contract: a site declares Posts and Pages through `content: {}`, the normalizer turns each into a uniform descriptor with concept-fixed routing (seam 1), the composer folds the adapter and any future extension into one runtime (seam 2), the asset slot is reserved (seam 4), and the component registry's declaration is in place for Plan 04's renderer (seam 3). Plan 03 builds the GitHub read-and-commit backend on `BackendConfig`, and Plan 04 builds the render engine on the registry.

---

## Self-review notes

- **Spec coverage.** §7.2 content model is Tasks 2 and 6; §8 the full adapter contract is Task 2; the §7.4 model half (form generation, server-side validation) is Tasks 4 and 5; seams 1, 2, and 4 are Tasks 6, 7, and 7; seam 3's declaration is Task 1. The render dispatch (seam 3's other half), reads/commits (§7.3, §7.4 commit half), the admin UI (§7.6), and nav editing (§7.7) are explicitly deferred to Plans 03 through 06.
- **Divergences are deliberate.** `validate` returns a `ValidationResult` rather than throwing, the field union keeps the legacy per-type detail the form needs, and `validateFields` is added as the engine baseline. All three are stated in the divergences section.
- **Seam discipline.** Every module is pure and I/O-free; nothing imports a Worker binding, D1, or a site's `App.*`. The adapter references only the registry type, not the render pipeline.
- **No forward references.** `render/registry.ts` (Task 1) defines `ComponentRegistry` before `content/types.ts` (Task 2) imports it; the types precede the modules that use them (Tasks 3 through 7); `normalizeConcepts` (Task 6) precedes `composeRuntime` (Task 7). The shared fixture lands in Task 2 with trivial validators, so Tasks 4 through 7 reuse it without depending on Task 5.
- **Deferred by design.** The Svelte forms, list views, and editor that consume this model arrive in Plan 05. The component palette that derives from the registry is deferred behind seam 3. The `CairnExtension` is reserved and unused; only its shape is fixed.
