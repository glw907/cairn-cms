# Render attribute-sink hardening Implementation Plan (engine-hardening pass 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (one `cairn-implementer` per task) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Run on `main` directly (Geoff's call for this series, same as pass 1: an internal render change gated by check/test, no worktree).

**Goal:** close the render attribute-sink residual by construction, so a component `build()` that routes a raw author attribute value into an `href`, `src`, `style`, or `on*` sink can no longer emit an executable vector.

**Architecture:** add one internal post-dispatch rehype transform, `rehypeSinkGuard`, in `src/lib/render/sanitize-schema.ts` beside `rehypeAnchorRel`. It walks the fully-built tree and neutralizes unsafe URL schemes in URL-bearing attributes, inline `on*` handlers, and inline `style`, on every element regardless of which `build()` produced it. `createRenderer` runs it last in the rehype chain, gated by the same `unsafeDisableSanitize` flag as the floor. No public export changes.

**Tech Stack:** TypeScript, unified/rehype, `hast-util-sanitize` (`defaultSchema` protocol allowlist), `unist-util-visit`, vitest, the svelte-check and package gates (`npm run check`, `npm test`, `npm run check:reference`, `npm run check:package`).

**Design spec:** `docs/superpowers/specs/2026-06-05-cairn-render-sink-hardening-design.md`.

---

## Conventions for this plan

**The gate per task.** The code tasks (1, 2) clear the full gate: `npm run check` 0 errors and 0 warnings, `npm test` exits 0, `npm run check:reference` exits 0, and `npm run check:package` exits 0. The docs task (3) clears `npm run check:package` plus `prose-guard` on the changed prose.

**Test-first.** Each code task writes the failing test, confirms it fails for the right reason, then makes it pass. Do not weaken a test to pass.

**No behavior change for safe content.** The guard strips only dangerous sinks. The showcase components route attribute values into class positions only, so the render-pipeline snapshot must stay byte-identical (no `-u`). A snapshot change means the guard stripped something legitimate; investigate rather than update the snapshot.

**Prose.** Any changelog or doc prose follows the writing-voice standard (no em dashes, one idea per sentence, no banned openers). `prose-guard` gates the changed `.md` files.

**Models.** Task 1 and Task 2 are security-sensitive (the guard logic and its integration), so dispatch them `model: opus`. Task 3 (docs, changelog, version) fits the Sonnet default.

---

## Task 1: The `rehypeSinkGuard` transform and its unit tests

**Model:** Opus (the scheme-normalization and obfuscation edge cases carry the security weight).

**Files:**
- Modify: `src/lib/render/sanitize-schema.ts`
- Create: `src/tests/unit/render-sink-guard.test.ts`

- [ ] **Step 1: Write the failing unit test**

Create `src/tests/unit/render-sink-guard.test.ts` with the full suite below. It exercises the transform directly against a one-element tree.

```ts
import { describe, it, expect } from 'vitest';
import type { Root, Element } from 'hast';
import { h } from 'hastscript';
import { rehypeSinkGuard } from '../../lib/render/sanitize-schema.js';

// Run the guard over a single element and return it for inspection.
function guard(el: Element): Element {
  const tree: Root = { type: 'root', children: [el] };
  rehypeSinkGuard()(tree);
  return tree.children[0] as Element;
}

function keys(el: Element): string[] {
  return Object.keys(el.properties ?? {});
}

describe('rehypeSinkGuard', () => {
  it('drops a javascript: href', () => {
    const el = guard(h('a', { href: 'javascript:alert(1)' }, 'x'));
    expect(el.properties?.href).toBeUndefined();
  });

  it('drops a data: src', () => {
    const el = guard(h('img', { src: 'data:text/html,<script>alert(1)</script>' }));
    expect(el.properties?.src).toBeUndefined();
  });

  it('drops a vbscript: href', () => {
    const el = guard(h('a', { href: 'vbscript:msgbox(1)' }, 'x'));
    expect(el.properties?.href).toBeUndefined();
  });

  it('drops a scheme obfuscated with a control character', () => {
    const el = guard(h('a', { href: 'java\tscript:alert(1)' }, 'x'));
    expect(el.properties?.href).toBeUndefined();
  });

  it('drops a scheme with leading whitespace and mixed case', () => {
    const el = guard(h('a', { href: '  JaVaScRiPt:alert(1)' }, 'x'));
    expect(el.properties?.href).toBeUndefined();
  });

  it('removes every on* event handler', () => {
    const el = guard(h('div', { onClick: 'steal()', onError: 'x' }, 'y'));
    expect(keys(el).some((k) => /^on/i.test(k))).toBe(false);
  });

  it('removes inline style wholesale', () => {
    const el = guard(h('div', { style: 'color:red' }, 'y'));
    expect(el.properties?.style).toBeUndefined();
  });

  it('drops a srcset whose one candidate is unsafe', () => {
    const el = guard(h('img', { srcSet: 'https://ok.test/a 1x, javascript:alert(1) 2x' }));
    expect(el.properties?.srcSet).toBeUndefined();
  });

  it('keeps a safe http href', () => {
    const el = guard(h('a', { href: 'https://ok.test/x' }, 'x'));
    expect(el.properties?.href).toBe('https://ok.test/x');
  });

  it('keeps a relative href', () => {
    const el = guard(h('a', { href: '/posts/x' }, 'x'));
    expect(el.properties?.href).toBe('/posts/x');
  });

  it('keeps an anchor href', () => {
    const el = guard(h('a', { href: '#section' }, 'x'));
    expect(el.properties?.href).toBe('#section');
  });

  it('keeps a mailto href', () => {
    const el = guard(h('a', { href: 'mailto:a@b.test' }, 'x'));
    expect(el.properties?.href).toBe('mailto:a@b.test');
  });

  it('keeps the cairn: token href', () => {
    const el = guard(h('a', { href: 'cairn:posts/x' }, 'x'));
    expect(el.properties?.href).toBe('cairn:posts/x');
  });

  it('keeps a srcset whose candidates are all safe', () => {
    const el = guard(h('img', { srcSet: 'https://ok.test/a 1x, https://ok.test/b 2x' }));
    expect(el.properties?.srcSet).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm test -- src/tests/unit/render-sink-guard.test.ts`
Expected: FAIL, because `rehypeSinkGuard` is not exported from `sanitize-schema.ts` yet (import error or "not a function").

- [ ] **Step 3: Implement the transform**

In `src/lib/render/sanitize-schema.ts`, the existing imports already cover what the transform needs (`defaultSchema` from `hast-util-sanitize`, `Root` and `Element` from `hast`, `visit` from `unist-util-visit`). Append the following after the existing `rehypeAnchorRel` function:

```ts
// URL-bearing hast properties the post-dispatch guard checks. hast camelCases attribute
// names (srcset -> srcSet, xlink:href -> xlinkHref, formaction -> formAction).
const URL_PROPS = new Set(['href', 'src', 'srcSet', 'xlinkHref', 'poster', 'formAction']);

// The safe URL schemes: the union of every protocol list in defaultSchema, plus cairn. The
// floor admits these and strips the rest, so deriving from the same source keeps the floor and
// this guard from drifting on what a safe scheme is. javascript:/data:/vbscript: are never in
// defaultSchema, so they are never safe.
const SAFE_SCHEMES: Set<string> = (() => {
  const protocols = defaultSchema.protocols ?? {};
  const schemes = new Set<string>(['cairn']);
  for (const list of Object.values(protocols)) {
    for (const scheme of list ?? []) schemes.add(String(scheme).toLowerCase());
  }
  return schemes;
})();

// Read a URL value's scheme for the safety check, defeating the whitespace and control-character
// tricks a browser ignores inside a scheme (java\tscript:, a leading space). A value with no
// scheme (relative, anchor, query) returns undefined and is always safe.
function urlScheme(value: string): string | undefined {
  const cleaned = value.replace(/[\x00-\x20]+/g, '');
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(cleaned);
  return match ? match[1].toLowerCase() : undefined;
}

function isSafeUrl(value: string): boolean {
  const scheme = urlScheme(value);
  return scheme === undefined || SAFE_SCHEMES.has(scheme);
}

// srcset is "url descriptor, url descriptor, …". hast may store it as a string or, because
// property-information marks it comma-separated, as a string array. One unsafe candidate makes
// the whole attribute unsafe.
function isSafeSrcset(value: unknown): boolean {
  const candidates = Array.isArray(value)
    ? value.map(String)
    : typeof value === 'string'
      ? value.split(',')
      : [];
  return candidates.every((candidate) => {
    const url = candidate.trim().split(/\s+/)[0];
    return url === '' || isSafeUrl(url);
  });
}

/**
 * Post-dispatch safety floor over the fully-built tree. The pre-dispatch rehype-sanitize floor
 * cleans author content, but a component build() runs after it and can route a raw author
 * attribute value into a sink. This guard runs last and neutralizes those sinks on every element
 * no matter which plugin or which build() produced it: an unsafe URL scheme in a URL-bearing
 * attribute, an inline on* event handler, or an inline style (stripped wholesale, matching the
 * floor and cairn's class-driven styling). It is gated by the same unsafeDisableSanitize switch as
 * the floor.
 */
export function rehypeSinkGuard() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const props = node.properties;
      if (!props) return;
      for (const key of Object.keys(props)) {
        if (/^on/i.test(key) || key === 'style') {
          delete props[key];
          continue;
        }
        if (!URL_PROPS.has(key)) continue;
        const value = props[key];
        const safe = key === 'srcSet' ? isSafeSrcset(value) : typeof value !== 'string' || isSafeUrl(value);
        if (!safe) delete props[key];
      }
    });
  };
}
```

If `Root`, `Element`, `defaultSchema`, or `visit` is not already imported in the file, add the missing import; the floor code already uses all four, so they should be present.

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- src/tests/unit/render-sink-guard.test.ts`
Expected: PASS, all cases green.

- [ ] **Step 5: Run the full gate**

```bash
npm run check
npm test
npm run check:reference
npm run check:package
```

Expected: `npm run check` 0 errors and 0 warnings, `npm test` exits 0, `npm run check:reference` exits 0, `npm run check:package` exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/render/sanitize-schema.ts src/tests/unit/render-sink-guard.test.ts
git commit -m "Add rehypeSinkGuard: neutralize build-routed render sinks

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Wire the guard into `createRenderer` and prove it end to end

**Model:** Opus (the integration is the security boundary; the malicious-build test is the real proof).

**Files:**
- Modify: `src/lib/render/pipeline.ts`
- Modify: `src/tests/unit/render-sanitize.test.ts`

- [ ] **Step 1: Write the failing integration tests**

Append this `describe` block to `src/tests/unit/render-sanitize.test.ts`. The file already imports `createRenderer`, `defineRegistry`, `describe`, `it`, and `expect`; add the `hastscript` import at the top if it is not already present (`import { h } from 'hastscript';`).

```ts
describe('render sink guard (post-dispatch)', () => {
  // A deliberately unsafe component: it routes attribute values into href and src and sets a
  // constant on* handler and inline style, the exact residual the guard closes.
  const sinkRegistry = () =>
    defineRegistry({
      components: [
        {
          name: 'sink',
          label: '',
          description: '',
          build: (ctx) =>
            h(
              'a',
              {
                href: typeof ctx.attributes.url === 'string' ? ctx.attributes.url : undefined,
                onClick: 'steal()',
                style: 'color:red',
              },
              [
                h('img', { src: typeof ctx.attributes.img === 'string' ? ctx.attributes.img : undefined }),
                ...ctx.slot('body'),
              ],
            ),
          attributes: [
            { key: 'url', label: 'URL', type: 'text' },
            { key: 'img', label: 'Image', type: 'text' },
          ],
          slots: [{ name: 'body', label: 'Body', kind: 'markdown' }],
        },
      ],
    });

  it('neutralizes a javascript: url a build routes from an attribute value', async () => {
    const html = await createRenderer(sinkRegistry()).renderMarkdown(
      ':::sink{url="javascript:alert(1)" img="javascript:alert(2)"}\nbody\n:::',
    );
    expect(html).not.toContain('javascript:');
    expect(html.toLowerCase()).not.toContain('onclick');
    expect(html).not.toContain('style=');
    expect(html).toContain('body');
  });

  it('keeps a safe url a build routes from an attribute value', async () => {
    const html = await createRenderer(sinkRegistry()).renderMarkdown(
      ':::sink{url="https://ok.test/x" img="https://ok.test/i.png"}\nbody\n:::',
    );
    expect(html).toContain('href="https://ok.test/x"');
    expect(html).toContain('src="https://ok.test/i.png"');
  });

  it('unsafeDisableSanitize lets a build-routed javascript: url through (developer-only hatch)', async () => {
    const html = await createRenderer(sinkRegistry(), { unsafeDisableSanitize: true }).renderMarkdown(
      ':::sink{url="javascript:alert(1)"}\nbody\n:::',
    );
    expect(html).toContain('javascript:');
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npm test -- src/tests/unit/render-sanitize.test.ts`
Expected: the first new test FAILS (the `javascript:` url survives, because the guard is not wired into the pipeline yet). The `unsafeDisableSanitize` test may pass already; the first test failing is the signal.

- [ ] **Step 3: Wire the guard into the pipeline**

In `src/lib/render/pipeline.ts`, add `rehypeSinkGuard` to the import from `./sanitize-schema.js`:

```ts
import { buildSanitizeSchema, rehypeAnchorRel, rehypeSinkGuard } from './sanitize-schema.js';
```

Then, after the `rehypeAnchorRel` push and before the `processor` is built, add the guard as the final rehype plugin, gated by the same flag as the floor. The relevant region becomes:

```ts
  const rel = options.anchorRel ?? 'noopener noreferrer';
  const rehypePlugins: PluggableList = [
    rehypeRaw,
    ...floor,
    [rehypeDispatch, registry, options.stagger],
    rehypeSlug,
  ];
  if (rel !== false) rehypePlugins.push([rehypeAnchorRel, rel]);
  // The sink guard runs last, over the fully-built tree, so it neutralizes a sink a component
  // build() emitted after the floor. Gated by the same switch as the floor.
  if (!options.unsafeDisableSanitize) rehypePlugins.push(rehypeSinkGuard);
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npm test -- src/tests/unit/render-sanitize.test.ts`
Expected: PASS, all cases green including the three new ones.

- [ ] **Step 5: Confirm no behavior change for safe content**

Run the render-pipeline snapshot without updating it:

```bash
npm test -- src/tests/unit/render-pipeline-snapshot.test.ts
```

Expected: PASS, byte-identical (no snapshot rewrite). The showcase components route attribute values into class positions only, so the guard strips nothing. If the snapshot fails, the guard stripped a legitimate attribute; investigate rather than run with `-u`.

- [ ] **Step 6: Run the full gate**

```bash
npm run check
npm test
npm run check:reference
npm run check:package
```

Expected: `npm run check` 0 errors and 0 warnings, `npm test` exits 0, `npm run check:reference` exits 0, `npm run check:package` exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/render/pipeline.ts src/tests/unit/render-sanitize.test.ts
git commit -m "Run the sink guard last in createRenderer, gated with the floor

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Documentation, changelog, and version bump

**Model:** Sonnet (mechanical doc and version changes).

**Files:**
- Modify: `docs/render-sanitize-floor.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json`

- [ ] **Step 1: Sharpen the `build()` contract in the sanitize-floor doc**

Read `docs/render-sanitize-floor.md` first to match its structure and voice. Find the section describing the `build()` attribute-sink residual (the caveat that a `build()` must coerce an attribute value before a URL or handler position). Rewrite it to state that the rule is now enforced, not advised. Cover these facts, in the doc's own prose:

- A post-dispatch guard (`rehypeSinkGuard`) runs last in the pipeline and inspects the fully-built tree.
- It neutralizes unsafe URL schemes (`javascript:`, `data:`, `vbscript:`) in `href`, `src`, `srcSet`, `xlinkHref`, `poster`, and `formAction`, removes inline `on*` event handlers, and strips inline `style` wholesale.
- Safe schemes, relative URLs, anchors, and the `cairn:` token are preserved.
- The guard is gated by `unsafeDisableSanitize`, the same switch as the floor.
- A `build()` no longer needs to coerce an attribute value by hand for safety, though routing untrusted input into a sink is still discouraged. A `build()` that needs dynamic styling should use a class or an inert `data-*` attribute, since inline `style` is stripped.

- [ ] **Step 2: Add the changelog entry**

Read the top of `CHANGELOG.md` to match its format, then add a `0.28.0` entry. This is a security fix and not a break for a legitimate consumer, so it carries no `Consumers must:` line. Use this content, adapting the formatting to the file's house style:

```markdown
## 0.28.0

Closed the render attribute-sink residual by construction. A new post-dispatch guard runs last in
`createRenderer` and neutralizes the sinks a component `build()` could route a raw author attribute
value into: unsafe URL schemes (`javascript:`, `data:`, `vbscript:`) in `href`, `src`, `srcSet`,
`xlinkHref`, `poster`, and `formAction`, inline `on*` event handlers, and inline `style` (stripped
wholesale). Safe schemes, relative URLs, anchors, and the `cairn:` token are preserved. The guard is
gated by the existing `unsafeDisableSanitize` switch.

Behavior note: a site whose component `build()` emits a non-standard URL scheme, an `on*` handler, or
inline `style` will see that output neutralized. Route dynamic styling through a class or an inert
`data-*` attribute instead.
```

- [ ] **Step 3: Bump the version**

In `package.json`, change `"version": "0.27.0"` to `"version": "0.28.0"` (a minor bump; `0.x` breaks between minors).

- [ ] **Step 4: Verify and commit**

```bash
prose-guard docs/render-sanitize-floor.md
prose-guard CHANGELOG.md
npm run check:package
```

Expected: no blocking tell on either file (advisory lines are non-blocking; do not chase them), `check:package` exits 0.

```bash
git add docs/render-sanitize-floor.md CHANGELOG.md package.json
git commit -m "Bump 0.28.0 and document the enforced attribute-sink guard

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task ordering

Sequence: **1, 2, 3.** Task 1 builds and unit-tests the guard in isolation. Task 2 wires it into the pipeline and proves it neutralizes a malicious `build()` end to end. Task 3 records the enforcement in the docs, the changelog, and the version. All three run on `main`.

## Phase-end ritual

After all tasks commit, before declaring the pass done:

- [ ] `npm run check` 0/0, `npm test` exits 0, `npm run check:reference` exits 0, `npm run check:package` exits 0 on `main`.
- [ ] The render-pipeline snapshot stayed byte-identical (no `-u` across the pass).
- [ ] `CHANGELOG.md` carries the `0.28.0` entry and `package.json` reads `0.28.0`.
- [ ] Run the code-simplifier over the changed `src/lib/render` files before the final commit (per the repo git convention).
- [ ] Review gate: a high-effort `/code-review` with attention to the scheme-normalization and `srcSet` edge cases. The Worker, auth, Svelte, and a11y reviewers and the live `/admin` smoke do not apply (no auth, Worker, or admin-UI surface change).
- [ ] Append the post-mortem to this plan and update `docs/STATUS.md`: render attribute-sink hardening landed as `0.28.0` (unpublished), the next pass is URL-identity consolidation (pass 3 of the series), publishing held until the series and the P4 sequencing decision.
- [ ] Refresh the `cairn-render-sanitize-gap` memory (residual closed) and the `cairn-engine-hardening-release-gate` memory (pass 2 of 3 landed).

## Self-review notes (already applied)

- The plan covers every spec move: the guard transform with its scheme/handler/style behavior (Task 1), the post-dispatch placement gated with the floor (Task 2), the no-behavior-change-for-safe-content proof via the snapshot (Task 2 Step 5), and the docs/changelog/version record (Task 3).
- The guard is internal (added to `sanitize-schema.ts`, not exported from any barrel), so the pass adds no public surface and `check:reference`/`check:package` stay green without a reference-page edit. This matches the design's "no public surface" decision.
- The safe-scheme allowlist is derived from the same `defaultSchema.protocols` the floor uses plus `cairn`, so the floor and the guard cannot drift, the spec's stated invariant.
- The integration test's `sink` component routes attribute values into `href`/`src` and sets a constant `on*`/`style`, so it proves both the attribute-value residual and the build-emitted handler/style strip in one component.
- Blanket `style` strip is the locked design decision; the guard removes `style` unconditionally, with no CSS parser or denylist token-scan.

---

## Post-mortem (2026-06-05)

Render attribute-sink hardening landed on `main` as `0.28.0`, unpublished. The pass ran subagent-driven,
one `cairn-implementer` per task, on `main` directly. Tasks 1 and 2 ran on Opus, Task 3 on the Sonnet
default. A review fold-in and a simplifier pass also ran on `main`.

**Commits.**

- `dcd3c5a` Task 1: the internal `rehypeSinkGuard` transform and its 14-case unit suite.
- `310a85c` Task 2: the guard wired last in `createRenderer`, gated with the floor, plus three
  integration tests proving a malicious `build()` end to end.
- `cde9e27` Task 3: the `0.28.0` bump, the changelog entry, and the sanitize-floor doc rewrite.
- `f176e9a` simplifier: extracted `isSafeUrlProp` from the visitor body for readability, behavior
  unchanged.
- `701ddab` review fold-in: fixed the `xLinkHref` casing bug and added the `action`, `data`, and
  `background` sinks, with six regression tests and the docs and changelog updated to match.

**What was built.** `rehypeSinkGuard` walks the fully-built hast tree and neutralizes the sinks a
component `build()` can route a raw author attribute value into. It scheme-checks the URL-bearing
properties (`href`, `src`, `srcSet`, `xLinkHref`, `poster`, `formAction`, `action`, `data`, and
`background`), removes every inline `on*` handler, and strips inline `style` wholesale. The safe-scheme
set is derived from `defaultSchema.protocols` plus `cairn`, so the floor and the guard cannot drift on
what a safe scheme is. Scheme detection strips whitespace and control characters first, so
`java\tscript:` and a leading-space scheme are caught. The guard runs last, after the dispatch and
`rehypeAnchorRel`, and it is gated by the same `unsafeDisableSanitize` switch as the floor. It is added
to no public barrel, so the surface is unchanged.

**Verified.** Gate green at the tip `701ddab`: `npm run check` 787 files 0/0, `npm test` 115 files /
684 tests exit 0, `npm run check:reference` exit 0, `npm run check:package` exit 0. The render-pipeline
snapshot stayed byte-identical across the whole pass, so the guard strips nothing from the showcase
components, which route attribute values into class positions only.

**Review gate.** The simplifier made one refinement (`f176e9a`). A high-effort `/code-review` found one
real bug and a set of same-mechanism gaps, each empirically confirmed against `property-information`
before folding in. The `URL_PROPS` set listed `xlinkHref`, but `property-information` camelCases
`xlink:href` to `xLinkHref` with a capital L, so the SVG xlink entry was dead code that never matched a
real tree, and an SVG anchor carrying a `javascript:` `xlink:href` from a `build()` would have survived.
The set also covered `formAction` but not the form-level `action`, and it missed `<object>`'s `data` and
`background`, all URL sinks the existing scheme check handles. The fold-in corrected the casing and added
the three properties. It confirmed that `data-*` attributes camelCase to `dataFoo`, so adding `data`
catches only the genuine `<object data>` and leaves cairn's `data-attr-*` dispatch routing untouched; a
regression test pins that. The Worker, auth, Svelte, and a11y reviewers and the live `/admin` smoke did
not apply, as the plan scoped, because no auth, Worker, or admin-UI surface changed.

**Boundary (documented, not a defect).** The guard scheme-checks URL attributes and strips `on*`
handlers and inline `style`. It does not remove a `build()`-emitted raw `<script>`, `<style>`, or
`<iframe srcdoc>` element node, since a component `build()` that emits those is running site-developer
code, and author markdown is cleaned by the pre-dispatch floor. The anchor `ping` beacon is left out as
a lower-severity exfiltration sink rather than a script vector. Both facts are recorded in
`docs/render-sanitize-floor.md` and carried forward in STATUS.

**Next.** Pass 3, URL-identity consolidation, is the last of the three-pass engine-hardening series.
Publishing stays held: `0.26.0` is the registry `latest`, and `main` carries the unpublished `0.27.0`
and now `0.28.0`. The series publishes before P4 consumes the hardened surface.
