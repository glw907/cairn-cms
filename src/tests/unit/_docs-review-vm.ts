/**
 * Test-only harness for the R10 review page's own glue script: runs the exact script text an
 * assembled document carries, in a sandboxed vm context standing in for the browser, so a test
 * exercises the real page code rather than a reimplementation of it.
 */
import vm from 'node:vm';

interface FakeElement {
  outerHTML: string;
  textContent: string;
  innerHTML: string;
  hidden: boolean;
  disabled: boolean;
  value: string;
  addEventListener: () => void;
  closest: () => null;
  getAttribute: () => null;
}

function makeElement(overrides: Partial<FakeElement> = {}): FakeElement {
  return {
    outerHTML: '',
    textContent: '',
    innerHTML: '',
    hidden: false,
    disabled: false,
    value: '',
    addEventListener: () => {},
    closest: () => null,
    getAttribute: () => null,
    ...overrides,
  };
}

/** A minimal `sessionStorage`, backed by a plain map, seeded from `initial`. */
export function makeSessionStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string): string | null => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    /** A plain snapshot of every stored key, for seeding a later simulated reload. */
    snapshot: (): Record<string, string> => Object.fromEntries(store),
  };
}

export interface ArtifactStub {
  publish: (html: string) => Promise<unknown>;
}

export interface DocsReviewState {
  title: string;
  files: { path: string; markdown: string }[];
}

export interface ReviewTestHooks {
  getState: () => DocsReviewState;
  isReadOnly: () => boolean;
  buildDocument: (state: DocsReviewState) => string;
  save: () => Promise<void>;
  render: () => void;
}

export interface ReviewWindow {
  sessionStorage: ReturnType<typeof makeSessionStorage>;
  claude?: { use: (name: string) => Promise<unknown> };
  __cairnDocsReview?: ReviewTestHooks;
}

const GLUE_SCRIPT_ID_MARKER = 'id="cairn-docs-review-script"';
const GLUE_SCRIPT_END_MARKER = '// cairn-docs-review-script-end';

/**
 * Pulls the page's own inline glue script's content. Located by its own id (not the first
 * `<script>` after some other element) and its own end-of-script marker comment (not the next
 * closing tag in the document), so this stays correct regardless of what other elements or
 * scripts the document carries and regardless of what the glue script's own source contains.
 */
export function extractGlueScript(html: string): string {
  const openIdx = html.indexOf(GLUE_SCRIPT_ID_MARKER);
  if (openIdx === -1) throw new Error('no glue script found in document');
  const tagEnd = html.indexOf('>', openIdx);
  if (tagEnd === -1) throw new Error('no glue script found in document');
  const contentStart = tagEnd + 1;
  const endIdx = html.indexOf(GLUE_SCRIPT_END_MARKER, contentStart);
  if (endIdx === -1) throw new Error('no glue script end marker found in document');
  return html.slice(contentStart, endIdx);
}

/** Pulls the raw (still JSON-escaped) text of the embedded state script element. */
export function extractEmbeddedStateRaw(html: string): string {
  const marker = 'id="cairn-docs-review-state"';
  const openIdx = html.indexOf(marker);
  if (openIdx === -1) throw new Error('no embedded state found in document');
  const tagEnd = html.indexOf('>', openIdx);
  const closeIdx = html.indexOf('</script>', tagEnd);
  return html.slice(tagEnd + 1, closeIdx);
}

/**
 * Runs an assembled review page document's own glue script in a sandboxed vm context and returns
 * its `window`, once any async capability lookup the script's own init has settled.
 */
export async function runReviewPage(
  html: string,
  opts: { sessionStorage?: Record<string, string>; artifact?: ArtifactStub } = {},
): Promise<ReviewWindow> {
  const glueScript = extractGlueScript(html);
  const stateRaw = extractEmbeddedStateRaw(html);

  const document = {
    getElementById(id: string) {
      if (id === 'cairn-docs-review-state') return makeElement({ textContent: stateRaw });
      return makeElement();
    },
    currentScript: {
      outerHTML: `<script id="cairn-docs-review-script">${glueScript}${GLUE_SCRIPT_END_MARKER}\n</script>`,
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
  };

  const window: ReviewWindow = {
    sessionStorage: makeSessionStorage(opts.sessionStorage ?? {}),
  };
  if (opts.artifact) {
    const artifact = opts.artifact;
    window.claude = {
      use: async (name: string) => {
        if (name === 'artifact') return artifact;
        return { openComposer: async () => ({ opened: true }), anchorFor: async () => ({ path: '', x: 0, y: 0 }) };
      },
    };
  }

  const sandbox = { document, window };
  vm.createContext(sandbox);
  vm.runInContext(glueScript, sandbox);
  // The microtask queue drains fully before the next macrotask runs, so one `setImmediate` wait
  // is enough to settle init()'s awaited `claude.use` calls regardless of how many are chained.
  await new Promise((resolve) => setImmediate(resolve));
  return sandbox.window;
}
