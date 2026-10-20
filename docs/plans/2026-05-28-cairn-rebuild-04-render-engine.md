# Render Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port cairn's generic, directive-driven markdown to HTML render machinery into the rebuilt engine (`src/lib/render/`), proving byte-identical output against characterization snapshots.

**Architecture:** The engine owns the machinery; each site owns its component registry, builders, class names, icon set, and CSS. `createRenderer(registry, options)` composes a `unified` pipeline that runs `remarkParse`, remark-gfm, `remark-directive`, a stamp plugin parameterized by the registry's component names, `remark-rehype` with `allowDangerousHtml`, `rehype-raw`, a dispatcher that runs each stamped element through its registry `build` fn, `rehype-slug`, and stringify. Sites compose their builders from shared structural helpers (`splitHead`, `cardShell`, `markFirstList`, `iconSpan`, `glyph`). The component registry landed in Plan 02; this plan adds the four machinery modules, the barrel, the engine-entry exports, and the snapshot lock.

**Tech Stack:** TypeScript, `unified`/`remark`/`rehype`, `hastscript`, `mdast-util-directive`, `unist-util-visit`, vitest (node `unit` project).

---

## Background

The render engine already exists, complete and production-proven, under `legacy/src/lib/render/`. Both consumer sites run it. ecnordic composes its directive registry from it (`createRenderer`, `splitHead`, `cardShell`, `markFirstList`, `iconSpan`, `glyph`, `MakeIcon`, `strProp`, `isElement`), and 907-life uses `defineRegistry` with an empty component set. The work here is a faithful port into the rebuilt tree, file by file, each guarded by a test, with a final characterization-snapshot task that locks byte-identical HTML output.

Already in place from Plan 02 (do not re-port):
- `src/lib/render/registry.ts` provides `defineRegistry`, `ComponentDef`, and `ComponentRegistry`.
- `src/tests/unit/render-registry.test.ts` covers the registry.
- `src/lib/index.ts` already exports `defineRegistry`, `ComponentDef`, and `ComponentRegistry`.

What this plan adds, in dependency order:
- `src/lib/render/glyph.ts`, the site icon-set glyph builder.
- `src/lib/render/remark-directives.ts`, the directive-stamp remark plugin.
- `src/lib/render/rehype-dispatch.ts`, the dispatcher plus the structural helpers.
- `src/lib/render/pipeline.ts`, the `createRenderer` factory.
- `src/lib/render/index.ts`, the render barrel.
- the render exports in `src/lib/index.ts`.
- `src/tests/unit/render-pipeline-snapshot.test.ts`, the byte-identical characterization lock.

Conventions to match (verified in the current tree):
- Unit tests live at `src/tests/unit/<name>.test.ts` and import implementation as `../../lib/render/<file>.js` (the `.js` extension on a `.ts` source path is the project's ESM/NodeNext convention; see `render-registry.test.ts`).
- Source modules import siblings with the `.js` extension too (e.g. `import { rehypeDispatch } from './rehype-dispatch.js'`). The legacy files use extensionless sibling imports, so add `.js` when porting to match the rebuilt tree's `content/` and `github/` modules.
- Comments follow the surrounding TypeScript idiom (the legacy files already do; keep them).

---

## Task 1: Glyph builder

**Files:**
- Create: `src/lib/render/glyph.ts`
- Test: `src/tests/unit/render-glyph.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/render-glyph.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { glyph } from '../../lib/render/glyph.js';

const SET = { flag: 'M1 2 3 4Z' };

describe('glyph', () => {
  it('builds an ec-glyph svg hast node with the path for the named icon', () => {
    const node = glyph('flag', SET);
    expect(node.tagName).toBe('svg');
    expect(node.properties?.className).toEqual(['ec-glyph']);
    expect(node.properties?.viewBox).toBe('0 0 256 256');
    const path = node.children[0];
    expect(path).toMatchObject({ tagName: 'path', properties: { d: 'M1 2 3 4Z' } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/unit/render-glyph.test.ts`
Expected: FAIL, cannot resolve `../../lib/render/glyph.js` (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/render/glyph.ts`:

```typescript
import { s } from 'hastscript';
import type { Element } from 'hast';

/** A glyph name to SVG path-data map (the site owns the icon set). */
export type IconSet = Record<string, string>;

/** Inline SVG glyph as a real hast node: class ec-glyph, 256 viewBox, currentColor fill. */
export function glyph(name: string, icons: IconSet): Element {
  return s(
    'svg',
    { className: ['ec-glyph'], viewBox: '0 0 256 256', fill: 'currentColor', ariaHidden: 'true' },
    [s('path', { d: icons[name] })],
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/unit/render-glyph.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/render/glyph.ts src/tests/unit/render-glyph.test.ts
git commit -m "feat(render): port the site icon-set glyph builder"
```

---

## Task 2: Remark directive-stamp plugin

The stamp plugin walks the mdast tree and marks each known container directive (`:::name`) with `data-primitive`, `data-icon`, and `data-role` properties, resolving a role's default icon from the registry. It also restores accidental prose colons to literal source text. The vocabulary is container-only, so a text directive (`:name`) or a leaf directive (`::name`) is always an accidental colon in prose like "9:30" that micromark tokenized as a directive.

**Files:**
- Create: `src/lib/render/remark-directives.ts`
- Test: `src/tests/unit/render-remark-directives.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/render-remark-directives.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkDirectiveStamp } from '../../lib/render/remark-directives.js';
import { defineRegistry } from '../../lib/render/registry.js';

const reg = defineRegistry({
  components: [
    { name: 'card', label: '', description: '', insertTemplate: '', build: (n) => n },
    {
      name: 'alert',
      label: '',
      description: '',
      insertTemplate: '',
      build: (n) => n,
      defaultIconByRole: { caution: 'warning' },
    },
  ],
});

async function run(md: string) {
  const f = await unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(remarkDirectiveStamp, reg)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify)
    .process(md);
  return String(f);
}

describe('remarkDirectiveStamp', () => {
  it('stamps a known container directive with data-primitive/icon/role', async () => {
    const html = await run(':::card{icon=flag role=secondary}\n## H\n:::');
    expect(html).toContain('data-primitive="card"');
    expect(html).toContain('data-icon="flag"');
    expect(html).toContain('data-role="secondary"');
  });
  it('applies the role default icon for alert', async () => {
    const html = await run(':::alert{role=caution}\n## H\n:::');
    expect(html).toContain('data-icon="warning"');
  });
  it('leaves an unknown container directive unstamped', async () => {
    const html = await run(':::mystery\n## H\n:::');
    expect(html).not.toContain('data-primitive');
  });
  it('restores an accidental prose colon (text directive) verbatim', async () => {
    const html = await run('meet at 9:30 today');
    expect(html).toContain('9:30');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/unit/render-remark-directives.test.ts`
Expected: FAIL, cannot resolve `../../lib/render/remark-directives.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/render/remark-directives.ts`:

```typescript
import type { Paragraph, PhrasingContent, Root, Text } from 'mdast';
import type { ContainerDirective, LeafDirective, TextDirective } from 'mdast-util-directive';
import { visit } from 'unist-util-visit';
import type { ComponentRegistry } from './registry.js';

// Reconstruct a directive's authored attribute block (`{#id .class key="value"}`).
// Accidental prose directives carry none, so this is almost always empty.
function serializeAttributes(attributes?: Record<string, string | null | undefined> | null): string {
  if (!attributes) return '';
  const tokens: string[] = [];
  for (const [key, value] of Object.entries(attributes)) {
    if (value == null) tokens.push(key);
    else if (key === 'id') tokens.push(`#${value}`);
    else if (key === 'class') for (const c of value.split(/\s+/).filter(Boolean)) tokens.push(`.${c}`);
    else tokens.push(`${key}="${value}"`);
  }
  return tokens.length ? `{${tokens.join(' ')}}` : '';
}

// The vocabulary is container-only (`:::name`). A text directive (`:name`) or
// leaf directive (`::name`) is therefore always an accidental colon in prose
// ("4:00", "9:30", "ratio 16:9") that micromark tokenized as a directive.
// Restore it to its literal source text so prose renders verbatim.
function restoreLiteral(node: TextDirective | LeafDirective): PhrasingContent[] {
  const marker = node.type === 'leafDirective' ? '::' : ':';
  const attrs = serializeAttributes(node.attributes);
  if (node.children.length === 0) {
    return [{ type: 'text', value: marker + node.name + attrs }];
  }
  const open: Text = { type: 'text', value: `${marker}${node.name}[` };
  const close: Text = { type: 'text', value: `]${attrs}` };
  return [open, ...(node.children as PhrasingContent[]), close];
}

// Stamp each registered container directive with data-* markers carrying its
// component name, icon, and role. No structure is built here; the rehype
// dispatcher rewrites the marked elements once their children are hast.
// Text and leaf directives are restored to literal text (accidental prose colons).
export function remarkDirectiveStamp(registry: ComponentRegistry) {
  const known = new Set(registry.names);
  return (tree: Root) => {
    visit(tree, 'containerDirective', (node: ContainerDirective) => {
      if (!known.has(node.name)) return;
      const attrs = node.attributes ?? {};
      const role = attrs.role || undefined;
      let icon = attrs.icon || undefined;
      if (!icon && role) icon = registry.defaultIcon(node.name, role);

      const properties: Record<string, string> = { dataPrimitive: node.name };
      if (icon) properties.dataIcon = icon;
      if (role) properties.dataRole = role;

      const data = node.data ?? (node.data = {});
      data.hName = 'div';
      data.hProperties = properties;
    });

    visit(tree, ['textDirective', 'leafDirective'], (node, index, parent) => {
      if (!parent || index == null) return;
      const literal = restoreLiteral(node as TextDirective | LeafDirective);
      if (node.type === 'leafDirective') {
        // Leaf directives sit at block level; wrap the restored text in a paragraph.
        const paragraph: Paragraph = { type: 'paragraph', children: literal };
        parent.children.splice(index, 1, paragraph);
      } else {
        parent.children.splice(index, 1, ...literal);
      }
      return index;
    });
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/unit/render-remark-directives.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/render/remark-directives.ts src/tests/unit/render-remark-directives.test.ts
git commit -m "feat(render): port the directive-stamp remark plugin"
```

---

## Task 3: Rehype dispatcher and structural helpers

The dispatcher walks the hast tree and runs each stamped element (`data-primitive`) through its registry `build` fn, recursing into nested primitives first. Top-level primitives get a document-order rise stagger when a `rise` formula is supplied; nested ones do not. The structural helpers (`isElement`, `strProp`, `iconSpan`, `splitHead`, `cardShell`, `markFirstList`) are the shared toolkit a site's builders compose from, and `MakeIcon` is the site-supplied icon-factory type.

**Files:**
- Create: `src/lib/render/rehype-dispatch.ts`
- Test: `src/tests/unit/render-rehype-dispatch.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/render-rehype-dispatch.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { h } from 'hastscript';
import type { Root } from 'hast';
import { rehypeDispatch, splitHead, cardShell, markFirstList } from '../../lib/render/rehype-dispatch.js';
import { defineRegistry } from '../../lib/render/registry.js';

const reg = defineRegistry({
  components: [
    {
      name: 'card',
      label: '',
      description: '',
      insertTemplate: '',
      build: (node, rise) => {
        const { head, rest } = splitHead(node);
        return cardShell(['card'], rise, [head, h('div', { className: ['section-body'] }, rest)]);
      },
    },
  ],
});

describe('rehypeDispatch', () => {
  it('dispatches a stamped element through its registry build fn', () => {
    const tree: Root = {
      type: 'root',
      children: [h('div', { dataPrimitive: 'card' }, [h('h2', ['Title']), h('p', ['Body'])])],
    } as Root;
    rehypeDispatch(reg)(tree);
    const section = tree.children[0] as never as {
      tagName: string;
      children: { children: { properties: { className: string[] } }[] }[];
    };
    expect(section.tagName).toBe('section');
    // section > div.card-body > [div.ec-head, div.section-body]
    const cardBody = section.children[0];
    expect(cardBody.children[0].properties.className).toContain('ec-head');
  });

  it('applies a rise stagger to top-level primitives only', () => {
    const tree: Root = {
      type: 'root',
      children: [h('div', { dataPrimitive: 'card' }, [h('h2', ['T'])])],
    } as Root;
    rehypeDispatch(reg, (i) => `--rise:${i}`)(tree);
    const section = tree.children[0] as never as { properties: { style?: string } };
    expect(section.properties.style).toBe('--rise:0');
  });

  it('markFirstList tags the first <ul> with ec-grid', () => {
    const ul = h('ul', [h('li', ['a'])]);
    const out = markFirstList([h('p', ['x']), ul]);
    expect(out?.properties?.className).toContain('ec-grid');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/unit/render-rehype-dispatch.test.ts`
Expected: FAIL, cannot resolve `../../lib/render/rehype-dispatch.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/render/rehype-dispatch.ts`:

```typescript
import type { Root, Element, ElementContent, Properties } from 'hast';
import { h } from 'hastscript';
import type { ComponentRegistry } from './registry.js';

export function isElement(node: ElementContent | undefined): node is Element {
  return !!node && node.type === 'element';
}

// hast Properties values are PropertyValue (string | number | boolean | array | null).
// Directive markers (dataIcon/dataRole/dataPrimitive) are always stamped as strings;
// this reads them back with that guarantee instead of casting at each call site.
export function strProp(node: Element, name: string): string | undefined {
  const value = node.properties?.[name];
  return typeof value === 'string' ? value : undefined;
}

/** Wrap a pre-built glyph in an ec-icon span; secondary role adds the modifier. */
export function iconSpan(glyphEl: Element, role?: string): Element {
  const className = role === 'secondary' ? ['ec-icon', 'ec-icon-secondary'] : ['ec-icon'];
  return h('span', { className }, [glyphEl]);
}

/** A site's icon factory: turn a stamped icon name + role into a hast element. */
export type MakeIcon = (name: string, role?: string) => Element;

// Pull the section's <h2> out, retag it .card-title, and build the .ec-head row
// (optional icon + heading). Returns the head plus the remaining body children.
// `makeIcon` (site-supplied) turns the stamped data-icon into an element; omit it
// for a head with no icon.
export function splitHead(node: Element, makeIcon?: MakeIcon): { head: Element; rest: ElementContent[] } {
  const children = node.children as ElementContent[];
  const i = children.findIndex((c) => isElement(c) && c.tagName === 'h2');
  const h2 = children[i] as Element;
  h2.properties = { ...h2.properties, className: ['card-title'] };
  const rest = children.filter((_, j) => j !== i);
  const icon = strProp(node, 'dataIcon');
  const role = strProp(node, 'dataRole');
  const headKids: ElementContent[] = [];
  if (makeIcon && icon) headKids.push(makeIcon(icon, role));
  headKids.push(h2);
  return { head: h('div', { className: ['ec-head'] }, headKids), rest };
}

/** Section wrapper: `<section class=…><div class="card-body">…</div></section>`,
 *  with an optional inline rise style. */
export function cardShell(classes: string[], rise: string | undefined, body: ElementContent[]): Element {
  const properties: Properties = { className: classes };
  if (rise) properties.style = rise;
  return h('section', properties, [h('div', { className: ['card-body'] }, body)]);
}

/** Tag the first <ul> among children with `ec-grid` and strip its whitespace-only
 *  text nodes so the bare list serializes without newlines. Returns that <ul>. */
export function markFirstList(children: ElementContent[]): Element | undefined {
  const ul = children.find((c) => isElement(c) && c.tagName === 'ul') as Element | undefined;
  if (ul) {
    ul.properties = { ...ul.properties, className: ['ec-grid'] };
    ul.children = (ul.children as ElementContent[]).filter(
      (c) => !(c.type === 'text' && /^\s*$/.test(c.value)),
    );
  }
  return ul;
}

// Recurse into a node's children, transforming any nested primitive sections
// (a grid inside a card, panels inside a split) WITHOUT a rise stagger.
function transformChildren(children: ElementContent[], registry: ComponentRegistry): ElementContent[] {
  return children.map((c) => {
    if (isElement(c) && c.properties?.dataPrimitive) return transformNode(c, registry);
    if (isElement(c)) c.children = transformChildren(c.children as ElementContent[], registry);
    return c;
  });
}

function transformNode(node: Element, registry: ComponentRegistry, rise?: string): Element {
  node.children = transformChildren(node.children as ElementContent[], registry);
  const name = strProp(node, 'dataPrimitive');
  const def = name ? registry.get(name) : undefined;
  return def ? def.build(node, rise) : node;
}

/** Rehype transformer: dispatch each stamped element through its registry `build`
 *  fn. Top-level primitives get a document-order rise stagger when `rise` is
 *  supplied (a site's per-index motion formula); nested ones don't. Non-primitive
 *  content (lede, intro paragraphs, the page-toc nav) passes through untouched. */
export function rehypeDispatch(registry: ComponentRegistry, rise?: (idx: number) => string) {
  return (tree: Root) => {
    let idx = 0;
    tree.children = (tree.children as ElementContent[]).map((child) => {
      if (isElement(child) && child.properties?.dataPrimitive) {
        return transformNode(child, registry, rise ? rise(idx++) : undefined);
      }
      if (isElement(child)) child.children = transformChildren(child.children as ElementContent[], registry);
      return child;
    });
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/unit/render-rehype-dispatch.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/render/rehype-dispatch.ts src/tests/unit/render-rehype-dispatch.test.ts
git commit -m "feat(render): port the rehype dispatcher and structural helpers"
```

---

## Task 4: createRenderer pipeline

`createRenderer(registry, options)` composes the full `unified` pipeline and returns `renderMarkdown` plus the `remarkPlugins`/`rehypePlugins` arrays, so the Carta editor preview can reuse the exact same plugin set the published site uses (the preview-fidelity guarantee from spec section 7.4).

**Files:**
- Create: `src/lib/render/pipeline.ts`
- Test: `src/tests/unit/render-pipeline.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/render-pipeline.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';

describe('createRenderer', () => {
  it('empty-registry renderer renders plain markdown', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    expect(await renderMarkdown('# Hi\n\nText')).toContain('<h1');
  });

  it('exposes the remark/rehype plugin arrays for Carta wiring', () => {
    const r = createRenderer(defineRegistry({ components: [] }));
    expect(Array.isArray(r.remarkPlugins)).toBe(true);
    expect(Array.isArray(r.rehypePlugins)).toBe(true);
  });

  it('renders a registered component and applies the rise stagger', async () => {
    const reg = defineRegistry({
      components: [
        {
          name: 'box',
          label: '',
          description: '',
          insertTemplate: '',
          build: (node, rise) => {
            node.tagName = 'section';
            node.properties = { className: ['box'], ...(rise ? { style: rise } : {}) };
            return node;
          },
        },
      ],
    });
    const { renderMarkdown } = createRenderer(reg, { rise: (i) => `--rise:${i}` });
    const html = await renderMarkdown(':::box\ncontent\n:::');
    expect(html).toContain('class="box"');
    expect(html).toContain('--rise:0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/unit/render-pipeline.test.ts`
Expected: FAIL, cannot resolve `../../lib/render/pipeline.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/render/pipeline.ts`:

```typescript
import { unified, type PluggableList } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import { remarkDirectiveStamp } from './remark-directives.js';
import { rehypeDispatch } from './rehype-dispatch.js';
import type { ComponentRegistry } from './registry.js';

export interface RendererOptions {
  /** A site's per-index motion formula for the top-level rise stagger
   *  (e.g. ecnordic's `(i) => '--rise:' + …`). Omit for no stagger. */
  rise?: (idx: number) => string;
}

/** Compose a site's render pipeline from its component registry: directive syntax to
 *  stamped markers to registry-built hast. Returns `renderMarkdown` plus the remark/
 *  rehype plugin arrays (so the Carta editor preview can reuse the exact same set). */
export function createRenderer(registry: ComponentRegistry, options: RendererOptions = {}) {
  const remarkPlugins: PluggableList = [remarkDirective, [remarkDirectiveStamp, registry]];
  const rehypePlugins: PluggableList = [rehypeRaw, [rehypeDispatch, registry, options.rise], rehypeSlug];
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkPlugins)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypePlugins)
    .use(rehypeStringify);
  return {
    remarkPlugins,
    rehypePlugins,
    renderMarkdown: async (content: string): Promise<string> => String(await processor.process(content)),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/unit/render-pipeline.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/render/pipeline.ts src/tests/unit/render-pipeline.test.ts
git commit -m "feat(render): port the createRenderer pipeline factory"
```

---

## Task 5: Render barrel and engine-entry exports

Add the `src/lib/render/index.ts` barrel and surface the render API from the engine entry (`src/lib/index.ts`, the `.` export). The consumer sites import `createRenderer`, `glyph`, `splitHead`, `cardShell`, `markFirstList`, `iconSpan`, `strProp`, `isElement`, and the `MakeIcon`/`IconSet` types directly from `@glw907/cairn-cms` (verified against ecnordic's `components.ts` and `render.ts`). `defineRegistry`, `ComponentDef`, and `ComponentRegistry` are already exported from Plan 02; the barrel re-exports them so the render namespace is whole.

**Files:**
- Create: `src/lib/render/index.ts`
- Modify: `src/lib/index.ts`
- Test: `src/tests/unit/render-exports.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/render-exports.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  createRenderer,
  defineRegistry,
  glyph,
  splitHead,
  cardShell,
  markFirstList,
  iconSpan,
  strProp,
  isElement,
  remarkDirectiveStamp,
  rehypeDispatch,
} from '../../lib/index.js';

describe('engine entry render surface', () => {
  it('re-exports the render machinery the consumer sites import', () => {
    for (const fn of [
      createRenderer,
      defineRegistry,
      glyph,
      splitHead,
      cardShell,
      markFirstList,
      iconSpan,
      strProp,
      isElement,
      remarkDirectiveStamp,
      rehypeDispatch,
    ]) {
      expect(typeof fn).toBe('function');
    }
  });

  it('the re-exported createRenderer composes a working pipeline', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    expect(await renderMarkdown('# Hi')).toContain('<h1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/unit/render-exports.test.ts`
Expected: FAIL, `createRenderer`, `glyph`, and the rest are not exported from `../../lib/index.js`.

- [ ] **Step 3: Write the render barrel**

Create `src/lib/render/index.ts`:

```typescript
// cairn-cms render engine: a directive-driven markdown to HTML pipeline whose
// component vocabulary is supplied by a site's component registry. The site owns the
// component builders, class names, icon set, and CSS; the engine owns the machinery.
export * from './registry.js';
export * from './glyph.js';
export * from './remark-directives.js';
export * from './rehype-dispatch.js';
export * from './pipeline.js';
```

- [ ] **Step 4: Wire the engine entry**

In `src/lib/index.ts`, replace the two existing render lines:

```typescript
export { defineRegistry } from './render/registry.js';
export type { ComponentDef, ComponentRegistry } from './render/registry.js';
```

with the full render surface, grouped under a render comment to match the file's section style:

```typescript
// Render engine (Plan 04): generic directive pipeline; sites own the component registry.
export { defineRegistry } from './render/registry.js';
export type { ComponentDef, ComponentRegistry } from './render/registry.js';
export { glyph } from './render/glyph.js';
export type { IconSet } from './render/glyph.js';
export { remarkDirectiveStamp } from './render/remark-directives.js';
export {
  rehypeDispatch,
  isElement,
  strProp,
  iconSpan,
  splitHead,
  cardShell,
  markFirstList,
} from './render/rehype-dispatch.js';
export type { MakeIcon } from './render/rehype-dispatch.js';
export { createRenderer } from './render/pipeline.js';
export type { RendererOptions } from './render/pipeline.js';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/tests/unit/render-exports.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/render/index.ts src/lib/index.ts src/tests/unit/render-exports.test.ts
git commit -m "feat(render): export the render engine from the package entry"
```

---

## Task 6: Byte-identical characterization snapshot

Lock the engine's HTML output against a representative directive document, so any future change to the machinery that alters output is caught. The fixture registry exercises every moving part, including `splitHead` with a site icon (glyph plus `iconSpan` plus `MakeIcon`), `cardShell`, `markFirstList`, a nested primitive (a grid inside a card, which gets no rise on the inner one), the top-level rise stagger, and an accidental prose colon restored verbatim. This is the spec section 9 characterization-snapshot requirement for byte-identical output. The fixture stands in for a site's registry, so the lock lives in the engine suite and depends on no consumer.

**Files:**
- Create: `src/tests/unit/render-pipeline-snapshot.test.ts`

- [ ] **Step 1: Write the snapshot test**

Create `src/tests/unit/render-pipeline-snapshot.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { h } from 'hastscript';
import type { Element } from 'hast';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
import { glyph } from '../../lib/render/glyph.js';
import { splitHead, cardShell, markFirstList, iconSpan, type MakeIcon } from '../../lib/render/rehype-dispatch.js';

// A representative fixture registry. Stands in for a site's registry so the
// byte-identical lock lives in the engine suite with no consumer dependency.
const ICONS = { flag: 'M16 16 240 16 240 240 16 240Z' };
const makeIcon: MakeIcon = (name, role) => iconSpan(glyph(name, ICONS), role);

const registry = defineRegistry({
  components: [
    {
      name: 'card',
      label: 'Card',
      description: '',
      insertTemplate: '',
      build: (node, rise) => {
        const { head, rest } = splitHead(node, makeIcon);
        return cardShell(['card'], rise, [head, h('div', { className: ['section-body'] }, rest)]);
      },
    },
    {
      name: 'grid',
      label: 'Grid',
      description: '',
      insertTemplate: '',
      build: (node, rise) => {
        const children = node.children as Element['children'];
        markFirstList(children as never);
        const { head, rest } = splitHead(node, makeIcon);
        return cardShell(['grid'], rise, [head, h('div', { className: ['section-body'] }, rest)]);
      },
    },
  ],
});

const DOC = [
  'Intro paragraph with an accidental colon at 9:30 today.',
  '',
  ':::card{icon=flag role=secondary}',
  '## Card heading',
  '',
  'Card body text.',
  ':::',
  '',
  ':::grid',
  '## Grid heading',
  '',
  '- one',
  '- two',
  ':::',
  '',
].join('\n');

describe('render pipeline characterization', () => {
  it('produces byte-identical HTML for a representative directive document', async () => {
    const { renderMarkdown } = createRenderer(registry, { rise: (i) => `--rise:${i}` });
    const html = await renderMarkdown(DOC);
    expect(html).toMatchSnapshot();
  });

  it('is stable across renders (no per-run nondeterminism)', async () => {
    const { renderMarkdown } = createRenderer(registry, { rise: (i) => `--rise:${i}` });
    const a = await renderMarkdown(DOC);
    const b = await renderMarkdown(DOC);
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 2: Generate and inspect the snapshot**

Run: `npx vitest run src/tests/unit/render-pipeline-snapshot.test.ts`
Expected: PASS (2 tests), writing `src/tests/unit/__snapshots__/render-pipeline-snapshot.test.ts.snap` on first run.

Open the generated `.snap` file and read the captured HTML by eye. Confirm it shows the expected structure before trusting it as the lock:
- the intro paragraph contains the literal `9:30` (accidental colon restored),
- the card renders as `<section class="card" style="--rise:0">` with `<div class="card-body">`, a `<div class="ec-head">` holding a `<span class="ec-icon ec-icon-secondary">` (secondary role) wrapping an `<svg class="ec-glyph">`, and an `<h2 class="card-title">`,
- the grid renders as `<section class="grid" style="--rise:1">` with its `<ul class="ec-grid">`,
- heading slugs are present (`id="card-heading"`, `id="grid-heading"`) from `rehype-slug`.

If the structure is wrong, fix the fixture or investigate the machinery before committing. A snapshot is only a lock if you verified what it captured.

- [ ] **Step 3: Re-run to confirm the snapshot matches**

Run: `npx vitest run src/tests/unit/render-pipeline-snapshot.test.ts`
Expected: PASS (2 tests), snapshot matched (not written).

- [ ] **Step 4: Commit**

```bash
git add src/tests/unit/render-pipeline-snapshot.test.ts src/tests/unit/__snapshots__/render-pipeline-snapshot.test.ts.snap
git commit -m "test(render): lock byte-identical output with a characterization snapshot"
```

---

## Definition of done

- [ ] `src/lib/render/` holds `registry.ts` (Plan 02), `glyph.ts`, `remark-directives.ts`, `rehype-dispatch.ts`, `pipeline.ts`, and `index.ts`.
- [ ] The engine entry (`src/lib/index.ts`) exports the full render surface the consumer sites import, including `createRenderer`/`RendererOptions`, `glyph`/`IconSet`, `remarkDirectiveStamp`, `rehypeDispatch`, `isElement`, `strProp`, `iconSpan`, `splitHead`, `cardShell`, `markFirstList`, `MakeIcon`, plus the Plan-02 `defineRegistry`/`ComponentDef`/`ComponentRegistry`.
- [ ] A characterization snapshot locks byte-identical HTML for a representative directive document.
- [ ] `npm run check` passes (svelte-check, no type errors).
- [ ] `npm test` passes (the unit and integration projects); the new render tests run in the node `unit` project.

## Consolidation ritual (cairn-pass)

After the tasks land, before declaring the plan done:

1. **Simplify.** Dispatch `code-simplifier:code-simplifier` over the ported render modules. The port is verbatim from proven legacy code, so expect little; apply only behavior-preserving refinements and re-run the suite.
2. **Check and test.** `npm run check` and `npm test`, both green.
3. **Review gate.** This plan touches no auth, Worker, DaisyUI, or Svelte component code; it is pure render machinery. A general `/code-review` pass is enough; the specialized review subagents do not apply. Note the skip in the post-mortem.
4. **Live admin smoke.** Not applicable; this plan does not touch the `/admin` surface.
5. **Update tracking.** Append the post-mortem to this plan file and update the `cairn-rebuild-initiative` memory (machinery ported, snapshot locked, test count, any decisions). Carry forward Plan 03's follow-ups; they land in Plan 05.
6. **Commit.** Already committed per task on branch `rebuild`; push only when the user asks.

---

## Self-review notes

- **Spec coverage.** Section 7.5 (createRenderer plus stamp plus dispatch plus structural helpers, the exact pipeline order) maps to Tasks 1 through 4. Section 9 ("render pipeline against characterization snapshots … byte-identical output") maps to Task 6. Section 7.4 preview fidelity (Carta reuses the same plugin arrays) maps to the `remarkPlugins`/`rehypePlugins` return in Task 4, asserted in Task 4 step 1. Acceptance scenario 12 (preview matches published output) rests on the same plugin-array reuse; the admin wiring that consumes it is Plan 05, out of scope here.
- **Registry already ported.** Plan 02 created `registry.ts`, `render-registry.test.ts`, and the entry's `defineRegistry` export; this plan does not duplicate them, only re-exports through the barrel and widens the entry's render section.
- **Import convention.** Every ported source and test uses the `.js` sibling and `../../lib` extension that the rebuilt tree requires (NodeNext), not the legacy extensionless form. Called out in Background and applied in every code block.
- **No placeholders.** Every code step carries the full file content; every run step names the command and the expected outcome.

---

## Post-mortem (executed 2026-05-28)

Plan executed task-by-task with subagent-driven development. All six tasks landed on branch `rebuild`.

**Built.** Four render-machinery modules ported verbatim from `legacy/src/lib/render/` into `src/lib/render/`: `glyph.ts`, `remark-directives.ts`, `rehype-dispatch.ts`, `pipeline.ts`. A render barrel (`index.ts`) and the widened package-entry render exports. A byte-identical characterization snapshot over a representative two-component fixture (card with a secondary-role icon, grid with a list). Only the `.js` import extensions the rebuilt tree's NodeNext resolution requires changed from the legacy source, plus 2-space indentation and the `→`-to-`to` comment edit the prose voice calls for.

**Verified.**
- Unit project: 21 files, 94 tests green (15 new across six render test files).
- Full suite (unit plus integration in workerd): 28 files, 126 tests green.
- `npm run check` (svelte-check): 0 errors, 1 benign warning (the pre-existing "no svelte input files" note).
- The snapshot was generated, read by eye, and confirmed: accidental colon `9:30` restored verbatim, card at `--rise:0` with the `ec-glyph` SVG inside an `ec-icon ec-icon-secondary` span and an `h2.card-title#card-heading`, grid at `--rise:1` with its `ul.ec-grid` and inter-item whitespace stripped, heading slugs from `rehype-slug`.

**Reviewed.** Per-task spec-compliance and code-quality review subagents, then a final correctness pass over the whole diff (two parallel finders plus the cairn-pass gate). No regressions introduced by the port. Export boundary checked against both consumer sites: every symbol ecnordic and 907-life import from `@glw907/cairn-cms` is present in the new entry. Specialized review subagents (svelte, workers, auth, a11y) do not apply; this plan is pure render machinery with no auth, Worker, DaisyUI, or component code. No live admin smoke (no `/admin` surface touched).

**Commits.** `c22bd90` glyph, `0e02854` remark stamp, `f22ef89` rehype dispatch, `49858fc` pipeline, `e9d8123` package-entry exports, `bf5d9f6` snapshot, `337e448` snapshot-fixture cast cleanup (from the simplifier). Not pushed; push at the user's word.

**Carried follow-ups (render hardening, a future plan).** Both are latent defects inherited verbatim from the legacy engine, not regressions, and neither is reachable under the current sites' content conventions (card and grid always carry an `## ` heading, and authored icons are always in the set). Left as-is to keep the port faithful and the snapshot stable; fixing them adds engine behavior the legacy code never had, so it belongs in a deliberate hardening pass.
- `splitHead` (`rehype-dispatch.ts`) dereferences `children[-1]` when a component has no `<h2>`, throwing a `TypeError`. Its `rest` filter (`j !== -1`) also retains every child in that case. Guard the no-heading path.
- `glyph` (`glyph.ts`) passes `icons[name]` straight to the SVG `path` `d` attribute, so an unknown icon name serializes `d="undefined"` with no error. Validate the name or fail loudly.

**Decisions locked.** Render machinery is generic and engine-owned; the component registry, builders, class names, icon set, and CSS stay site-owned. `createRenderer` returns the `remarkPlugins`/`rehypePlugins` arrays so the Carta preview reuses the exact published pipeline (the §7.4 preview-fidelity contract; the admin wiring that consumes it is Plan 05). A byte-identical snapshot lives in the engine suite against a generic fixture, depending on no consumer.
