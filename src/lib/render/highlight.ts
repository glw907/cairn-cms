// cairn-cms: build-time syntax highlighting for the shared render pipeline. It tokenizes fenced
// code with Shiki and emits a <pre class="shiki"> whose tokens carry semantic CLASS names from a
// fixed cairn ramp (cairn-tok-keyword, cairn-tok-string, ...), never an inline style and never a
// baked hex literal. The colors live in the site theme, so recoloring the theme recolors code with
// no markup change.
//
// CLASS-DRIVEN (load-bearing): the output is class-only, with no `style` attribute on the <pre>,
// the <code>, or any token <span>. cairn is class-driven by design (the sink guard in
// sanitize-schema.ts strips every inline `style` wholesale), and class output survives that floor
// naturally because `className` is already allowed on `*`. The highlighter therefore needs no
// special placement and no ordering invariant: it runs as an ordinary rehype plugin. Never weaken
// the sanitize floor or the sink guard to accommodate this step, and never add `style` to an
// allowlist; the point is that class-only output needs neither.
//
// THE .cairn-tok-* CLASS CONTRACT: the engine owns the token class names (below); the site owns the
// colors. This mirrors the engine's .cairn-place-* figure-placement contract: a site styles the
// classes in its own theme. The showcase binds each class to a --cairn-code-* role variable in
// examples/showcase/src/lib/theme.css, so the syntax palette re-skins with the rest of the theme.
//
//   .cairn-tok-keyword    a language keyword, storage class, or control word
//   .cairn-tok-string     a string or quoted literal
//   .cairn-tok-comment    a comment
//   .cairn-tok-function   a function name, tag name, or property key
//   .cairn-tok-number     a numeric, boolean, or other constant literal
//   .cairn-tok-punct      punctuation and operators
//
// Default text carries no token class and inherits the code block's foreground (--cairn-code-ink).
//
// SERVER/BUILD-ONLY: Shiki is loaded through a dynamic import so it stays out of the static client
// graph (a separate async chunk). The highlighter runs only inside the async pipeline, at
// render/prerender and in the Worker SSR. The highlighter is created once and its promise cached.
import type { Root, Element } from 'hast';
import { toString } from 'hast-util-to-string';
import type { Highlighter, ThemeRegistrationRaw, ShikiTransformer } from 'shiki';

// The curated language set Shiki preloads. Each id pulls its aliases too (loading `bash` also
// registers `sh`, `shell`, `zsh`; loading `js` registers `javascript`, `mjs`, `cjs`). A fence whose
// language is absent or outside this set falls back to plaintext rather than throwing.
const LANGS = [
  'js',
  'ts',
  'jsx',
  'tsx',
  'svelte',
  'html',
  'css',
  'json',
  'bash',
  'markdown',
  'python',
  'yaml',
  'sql',
] as const;

// The plaintext language id. Shiki special-cases it (and `plaintext`/`txt`/`ansi`) as always
// available, so it is the safe fallback for an unknown or absent fence language: it escapes the
// code text into the same <pre class="shiki"> wrapper with no token coloring.
const PLAINTEXT = 'text';

// Sentinel foreground colors, one per ramp slot. Shiki has no class-emitting mode, so the theme
// assigns each scope group a unique sentinel hex, then the transformer below maps the resolved
// sentinel back to its cairn-tok-* class and deletes the style. The sentinels never reach the
// output. They are arbitrary distinct values; only their uniqueness and exact round-trip matter.
const SENTINEL_INK = '#000000';
const SENTINEL_TO_CLASS: Record<string, string> = {
  '#000010': 'cairn-tok-comment',
  '#000020': 'cairn-tok-keyword',
  '#000030': 'cairn-tok-string',
  '#000040': 'cairn-tok-function',
  '#000050': 'cairn-tok-number',
  '#000060': 'cairn-tok-punct',
};

// The Shiki theme that drives the class mapping. Every scope group resolves to its sentinel color;
// the transformer turns the sentinel into a class. The background and default foreground are
// sentinels too, stripped from the <pre> by the transformer so the site theme owns the surround.
const CAIRN_CODE_THEME: ThemeRegistrationRaw = {
  name: 'cairn-roles',
  type: 'light',
  fg: SENTINEL_INK,
  bg: '#ffffff',
  settings: [
    { settings: { foreground: SENTINEL_INK, background: '#ffffff' } },
    {
      scope: ['comment', 'punctuation.definition.comment', 'string.comment'],
      settings: { foreground: '#000010' },
    },
    {
      scope: [
        'keyword',
        'keyword.control',
        'storage',
        'storage.type',
        'storage.modifier',
        'variable.language',
        'keyword.operator.new',
        'keyword.operator.expression',
      ],
      settings: { foreground: '#000020' },
    },
    {
      scope: ['string', 'string.quoted', 'string.template', 'constant.other.symbol'],
      settings: { foreground: '#000030' },
    },
    {
      scope: [
        'entity.name.function',
        'support.function',
        'meta.function-call',
        'entity.name.tag',
        'support.type.property-name',
      ],
      settings: { foreground: '#000040' },
    },
    {
      scope: [
        'constant.numeric',
        'constant.language',
        'constant.character',
        'constant.other',
        'keyword.other.unit',
      ],
      settings: { foreground: '#000050' },
    },
    {
      scope: ['punctuation', 'meta.brace', 'keyword.operator', 'meta.delimiter'],
      settings: { foreground: '#000060' },
    },
  ],
};

// Read the `color:#rrggbb` hex out of a token span's inline style, lowercased for the sentinel map.
function styleColor(style: unknown): string | undefined {
  if (typeof style !== 'string') return undefined;
  const match = /color:(#[0-9a-fA-F]{6})/.exec(style);
  return match ? match[1].toLowerCase() : undefined;
}

// Append a class to a hast element's class list, building the string form Shiki uses.
function addClass(node: Element, className: string): void {
  const existing = node.properties?.class;
  const prefix = typeof existing === 'string' && existing.length > 0 ? `${existing} ` : '';
  (node.properties ??= {}).class = `${prefix}${className}`;
}

// The transformer that converts Shiki's sentinel-colored inline styles into the cairn-tok-* classes
// and strips every style attribute, so the output is class-only. The <pre> loses its
// background/foreground style (the site theme owns the surround); each token <span> trades its
// sentinel color for the matching class, and a default-foreground span is left unclassed.
const cairnTokenClasses: ShikiTransformer = {
  name: 'cairn-token-classes',
  pre(node) {
    if (node.properties) delete node.properties.style;
  },
  code(node) {
    if (node.properties) delete node.properties.style;
  },
  span(node) {
    const hex = styleColor(node.properties?.style);
    if (node.properties) delete node.properties.style;
    const className = hex ? SENTINEL_TO_CLASS[hex] : undefined;
    if (className) addClass(node, className);
  },
};

// The cached highlighter. Created once on first use and reused for every render. The dynamic import
// keeps Shiki off the static client graph; the promise is cached so the WASM grammar load and the
// theme registration happen at most once per process.
let highlighterPromise: Promise<Highlighter> | undefined;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then((shiki) =>
      shiki.createHighlighter({ themes: [CAIRN_CODE_THEME], langs: [...LANGS] }),
    );
  }
  return highlighterPromise;
}

// Read the fenced language off a <code> element's class list. Markdown emits the language as a
// `language-<id>` class on the inner <code>. An empty or missing language returns undefined, which
// the caller maps to plaintext.
function codeLanguage(code: Element): string | undefined {
  const className = code.properties?.className;
  const classes = Array.isArray(className) ? className.map(String) : [];
  const langClass = classes.find((c) => c.startsWith('language-'));
  const lang = langClass?.slice('language-'.length);
  return lang && lang.length > 0 ? lang : undefined;
}

// A fenced-code <pre> is a <pre> whose single element child is a <code>. Inline code (a bare <code>
// with no <pre> parent) and any other <pre> are left untouched.
function fencedCode(pre: Element): Element | undefined {
  const child = pre.children.find((c): c is Element => c.type === 'element');
  return child?.tagName === 'code' ? child : undefined;
}

// One pending highlight: the original <pre> to replace, the inner <code> to read text from, and the
// fenced language. The <pre> is rewritten in place (mutated to become Shiki's <pre>) after the async
// tokenize, which keeps the parent-children typing uniform across Root and Element.
interface Job {
  pre: Element;
  code: Element;
  lang: string;
}

// Descend the tree and collect every fenced-code <pre>. The walk is synchronous and gathers the
// targets up front, because the highlight itself is async (unist-util-visit cannot await).
function collectFencedCode(node: Root | Element, jobs: Job[]): void {
  for (const child of node.children) {
    if (child.type !== 'element') continue;
    if (child.tagName === 'pre') {
      const code = fencedCode(child);
      if (code) {
        jobs.push({ pre: child, code, lang: codeLanguage(code) ?? PLAINTEXT });
        continue;
      }
    }
    collectFencedCode(child, jobs);
  }
}

/**
 * The Shiki rehype plugin. Highlights every fenced-code block into a `<pre class="shiki">` whose
 * tokens carry the cairn-tok-* classes (no inline style), then leaves the rest of the tree
 * untouched. It runs as an async transformer because Shiki tokenizes asynchronously. Because the
 * output is class-only it needs no special placement; it is safe anywhere after `remarkRehype`.
 * @returns A unified transformer that mutates the hast tree in place.
 */
export function rehypeCairnHighlight() {
  return async (tree: Root): Promise<void> => {
    const jobs: Job[] = [];
    collectFencedCode(tree, jobs);
    if (jobs.length === 0) return;

    const highlighter = await getHighlighter();
    const loaded = new Set(highlighter.getLoadedLanguages());

    for (const job of jobs) {
      // Fall back to plaintext for any language outside the preloaded set so Shiki never throws on
      // an unknown fence. Plaintext still produces the <pre class="shiki"> wrapper with escaped text.
      const lang = loaded.has(job.lang) ? job.lang : PLAINTEXT;
      const result = highlighter.codeToHast(toString(job.code), {
        lang,
        theme: 'cairn-roles',
        transformers: [cairnTokenClasses],
      });
      const pre = result.children.find(
        (c): c is Element => c.type === 'element' && c.tagName === 'pre',
      );
      if (!pre) continue;
      // Rewrite the original <pre> into Shiki's <pre> in place: adopt its tag, properties, and
      // children. Mutating the existing node avoids reindexing the parent's children array.
      job.pre.tagName = pre.tagName;
      job.pre.properties = pre.properties;
      job.pre.children = pre.children;
    }
  };
}
