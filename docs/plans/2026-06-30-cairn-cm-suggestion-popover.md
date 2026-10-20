# CodeMirror suggestion popover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the editor's skinned `@codemirror/lint` suggestion tooltip with cairn's own recipe DOM rendered through CodeMirror's public API, and give it the keyboard and screen-reader path it has never had.

**Architecture:** Keep `@codemirror/lint`'s `linter()` sources producing the diagnostics (the underline) but suppress their built-in tooltip with `tooltipFilter`. Render the suggestion popover through the public `showTooltip` facet, driven by a `StateField` that maps the caret onto the diagnostic under it via the public `forEachDiagnostic`. The popover DOM is a generic renderer over `Diagnostic.message` + `Diagnostic.actions`, so it serves both the spellcheck and objective-error diagnostics. A `check:cm-internals` allowlist gate (mirroring `check:custom-surface`) holds the editor theme's internal-class coupling to a by-name floor.

**Tech Stack:** SvelteKit, CodeMirror 6 (`@codemirror/view`, `/state`, `/lint`), Vitest (chromium `component` project, `vitest-browser-svelte`, the `expect.poll` idiom), Node ESM check scripts, GitHub Actions.

**Post-review note:** This plan was rewritten after a four-way clean-context adversarial review. The load-bearing corrections it carries: Escape is a native DOM listener (a CM keymap cannot fire on the popover button, which lives outside `contentDOM`); the field recomputes on `tr.effects.length` (lint publishes via an effect-only transaction); the keybinding is **Alt+Enter**, not `Mod-.` (which collides with the existing Ctrl+. Details-panel shortcut); the gate uses a stateless guard regex and a `.cm-cairn-`-exempt dynamic matcher, seeded from the real tree and wired into CI; the suppression test drives a hover; the tests use the `expect.poll(..., COLD_START)` + flat-props harness idiom; and Tasks 3–4 are main-loop (opus), not Sonnet.

## Global Constraints

- **Bind to CodeMirror's public API, never its internal `.cm-*` classes.** The popover uses `showTooltip`, `getTooltip`, `forEachDiagnostic`, `EditorView.theme`, `keymap`. The only sanctioned internal-class touch is one neutralizing override of `.cm-tooltip` (CodeMirror force-adds that class to every tooltip); it is allow-listed by name.
- **`@codemirror/lint` stays the underline mechanism.** Do not remove the `linter()` sources or the `.cm-lintRange-info` underline. Suppress only the built-in tooltip.
- **Lazy CodeMirror only.** `spellcheck.ts` and the new popover module must not value-import an `@codemirror/*` package at module scope (a static value import pulls CodeMirror into a consumer's server bundle, which the editor-boundary test forbids). Reuse the modules `cairnSpellcheck` already holds (`viewMod`, `stateMod`, `lintMod`).
- **The underline token is locked to `--cairn-warning-ink`.** Keep it; tune only color and weight.
- **The action keybinding is `Alt-Enter`** (the IntelliJ Quick-Fix idiom). Do NOT use `Mod-.`/`Ctrl+.` — it is already the Details-panel shortcut (`editor-shortcuts.ts:25`, `EditPage.svelte:279`) and would double-fire.
- **Accessibility is a deliverable.** The current tooltip has zero keyboard/screen-reader reachability; this pass creates it. Caret-in-range shows the popover without stealing focus and announces availability through a polite live region; `Alt-Enter` moves focus into the popover; `Escape` (a native DOM listener on the popover, not a CM keymap) returns focus to `.cm-content`. The popover is `role="group"` with an `aria-label` (a non-modal labeled group of native buttons; the live region does the announcing). No `aria-modal`, no focus trap, no auto-focus on caret movement.
- **Test in the chromium `component` project** with the flat-props form the existing tests use (`render(MarkdownEditor, { value, name, spellcheck: true, spellcheckTest: {...} })`, NOT `{ props: {...} }`), the shared fake-Worker helper, and `expect.poll(fn, COLD_START)` (`COLD_START = { timeout: 20000 }`) for every wait on the editor/lint pipeline. Assert computed structure and tokens, not pixels.
- **Full gate before every commit:** `npm run check` (0 errors / 0 warnings), `npm test` (exit 0), `npm run check:cm-internals`, `npm run check:custom-surface`, `npm run check:comments`. This is not optional; the per-task steps below name the targeted test, but the Commit step runs the full gate first.
- Commit specific files, imperative mood, footer `Co-Authored-By: Claude <noreply@anthropic.com>`.
- **Executor model:** Tasks 1, 2, 6, 7, 8 are `cairn-implementer` (Sonnet) dispatches. **Tasks 3 and 4 carry novel correctness-critical CM interaction logic and run in the main loop (or `model: opus`)**, per CLAUDE.md. The frontend-design step (Task 3 Step 1) and the `schedule` routine (Task 7 Step 3) are main-loop, not implementer dispatches.

---

## File Structure

- `scripts/check-cm-internals.mjs` — **create.** The allowlist gate: scans an enumerated editor file set for raw `.cm-*` tokens, fails on any chrome token not in the by-name allowlist, on any un-enumerated `src/lib/components` file containing `.cm-`, and on any dynamically-composed non-cairn `.cm-…${}` selector.
- `scripts/cm-internals-allowlist.json` — **create.** The writing-surface allowlist, the `.cm-cairn-` prefix rule, the chrome floor, and the enumerated file set, all derived from the real greps.
- `src/tests/unit/check-cm-internals.test.ts` — **create.** Unit-tests `evaluate`/`collectCmTokens`/the dynamic matcher and the guard's statelessness.
- `.github/workflows/test.yml` — **modify.** Add a `npm run check:cm-internals` step next to the other `check:*` steps.
- `src/tests/component/fake-spell-worker.ts` — **create.** The shared fake-Worker helper (extracted from `spellcheck.test.ts`), imported by both test files.
- `src/lib/components/editor-suggestion-popover.ts` — **create.** The recipe popover: the `showTooltip` `StateField` (recomputing on `effects` too), the DOM builder over `Diagnostic.message`/`.actions` with the native Escape listener and focus-return-on-action, the `Alt-Enter` keymap, and the polite live-region `ViewPlugin`.
- `src/lib/components/spellcheck.ts` — **modify.** Add `tooltipFilter: () => []` to both `linter()` calls; strip the chrome rules from `lockedUnderlineTheme` and add the `.cm-tooltip` neutralize + `.cairn-cm-suggest` styling; append `cairnSuggestionPopover(...)`; tune the underline.
- `src/tests/component/suggestion-popover.test.ts` — **create.** The component tests.
- `src/tests/unit/codemirror-public-api.test.ts` — **create.** The upgrade tripwire.
- `package.json` — **modify.** Add `check:cm-internals`.
- `docs/internal/cm-editing-surface-alignment.md`, `docs/internal/admin-design-system.md`, `ROADMAP.md` — **modify** in Task 8.

---

## Task 1: The `check:cm-internals` allowlist gate

**Files:**
- Create: `scripts/check-cm-internals.mjs`, `scripts/cm-internals-allowlist.json`
- Test: `src/tests/unit/check-cm-internals.test.ts`
- Modify: `package.json`, `.github/workflows/test.yml`

**Interfaces:**
- Produces: `export function collectCmTokens(source: string): string[]`; `export function evaluate(files: {path,source}[], allow: Allowlist): {pass, failures}`. `Allowlist = { writingSurface: string[], cairnPrefix: string, chromeFloor: string[], enumeratedFiles: string[] }`.

- [ ] **Step 1: Reconcile the seed against the real tree FIRST**

Run and record the truth before writing the allowlist:
```bash
grep -rlE '\.cm-[a-z]' src/lib/components            # the files that actually contain .cm-
grep -rhoE '\.cm-cairn-[a-zA-Z-]+|\.cm-[a-zA-Z-]+' src/lib/components | sort -u   # the real token set
```
Expected today: three files (`spellcheck.ts`, `MarkdownEditor.svelte`, `EditPage.svelte`), and the non-cairn tokens `.cm-content .cm-cursor .cm-editor .cm-focused .cm-gutterElement .cm-gutters .cm-line .cm-lintRange-info .cm-tooltip .cm-tooltip-lint .cm-diagnostic-info .cm-diagnosticAction`. Use exactly what the grep prints; do not hand-guess.

- [ ] **Step 2: Write the failing test**

```ts
// src/tests/unit/check-cm-internals.test.ts
import { describe, it, expect } from 'vitest';
import { collectCmTokens, evaluate } from '../../../scripts/check-cm-internals.mjs';

const allow = {
  writingSurface: ['.cm-content', '.cm-lintRange-info'],
  cairnPrefix: '.cm-cairn-',
  chromeFloor: ['.cm-tooltip'],
  enumeratedFiles: ['a.ts'],
};

describe('collectCmTokens', () => {
  it('splits a composite selector key into individual tokens', () => {
    expect(collectCmTokens("'.cm-tooltip.cm-tooltip-lint': {}")).toEqual(
      expect.arrayContaining(['.cm-tooltip', '.cm-tooltip-lint']),
    );
  });
});

describe('evaluate', () => {
  it('passes when every cm class is writing-surface, cairn-prefixed, or the chrome floor', () => {
    const files = [{ path: 'a.ts', source: "'.cm-content': {}; '.cm-cairn-x': {}; '.cm-tooltip': {}" }];
    expect(evaluate(files, allow).pass).toBe(true);
  });

  it('fails on an unsanctioned chrome class, naming it', () => {
    const { pass, failures } = evaluate([{ path: 'a.ts', source: "'.cm-tooltip-lint': {}" }], allow);
    expect(pass).toBe(false);
    expect(failures.join('\n')).toContain('.cm-tooltip-lint');
  });

  it('exempts cairn-prefixed interpolation but catches chrome interpolation', () => {
    expect(evaluate([{ path: 'a.ts', source: '`.cm-cairn-depth-${d}`' }], allow).pass).toBe(true);
    expect(evaluate([{ path: 'a.ts', source: '`.cm-tooltip-${x}`' }], allow).pass).toBe(false);
    expect(evaluate([{ path: 'a.ts', source: 'const s = `.cm-${name}`;' }], allow).pass).toBe(false);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/check-cm-internals.test.ts`
Expected: FAIL — the script does not exist.

- [ ] **Step 4: Write the gate (note the THREE distinct regexes — do not reuse one global regex)**

```js
// scripts/check-cm-internals.mjs
// cairn-cms: the CodeMirror internal-class ratchet. The editor themes CodeMirror through EditorView.theme
// object keys; a chrome `.cm-*` class (a built-in widget's internal structure) is fragile across a CM
// major, so this gate holds the editor theme's chrome coupling to a by-name floor. Writing-surface content
// classes and cairn's own `.cm-cairn-*` decorations are allow-listed; the sole sanctioned chrome touch is a
// neutralize of `.cm-tooltip` (CM force-adds that class to every tooltip). Wired as `npm run check:cm-internals`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Three regexes with three jobs. TOKEN is GLOBAL (for matchAll) and must never be reused for `.test()`
// (a global regex's .test() advances lastIndex and is stateful across calls). HAS_CM is the stateless
// boolean for the staleness guard. DYNAMIC catches a dynamically composed CHROME name; cairn's own
// `.cm-cairn-*` decorations (which legitimately interpolate, e.g. `.cm-cairn-depth-${depth}`) are exempt
// via the negative lookahead, so the gate does not false-positive on sanctioned rail selectors.
const TOKEN = /\.cm-[a-zA-Z][a-zA-Z-]*/g;
const HAS_CM = /\.cm-[a-zA-Z]/;
const DYNAMIC = /\.cm-(?!cairn-)[a-zA-Z-]*\$\{/;

/** Every `.cm-*` token in a source, composite keys (`.cm-a.cm-b`) split into individual tokens. */
export function collectCmTokens(source) {
  return [...source.matchAll(TOKEN)].map((m) => m[0]);
}

function walk(dir, keep) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, keep));
    else if (keep(name)) out.push(full);
  }
  return out;
}

/**
 * Evaluate the enumerated editor files against the allowlist.
 * @param {{path: string, source: string}[]} files
 * @param {{writingSurface: string[], cairnPrefix: string, chromeFloor: string[], enumeratedFiles: string[]}} allow
 */
export function evaluate(files, allow) {
  const failures = [];
  const sanctioned = new Set([...allow.writingSurface, ...allow.chromeFloor]);
  for (const { path, source } of files) {
    if (DYNAMIC.test(source)) failures.push(`dynamically composed .cm- chrome selector in ${path}`);
    for (const token of collectCmTokens(source)) {
      if (token.startsWith(allow.cairnPrefix)) continue;
      if (sanctioned.has(token)) continue;
      failures.push(`unsanctioned chrome class: ${token} (${path})`);
    }
  }
  return { pass: failures.length === 0, failures };
}

function main() {
  const allow = JSON.parse(readFileSync(resolve(ROOT, 'scripts/cm-internals-allowlist.json'), 'utf8'));
  const enumerated = new Set(allow.enumeratedFiles);
  const failures = [];
  // Staleness guard: any file under src/lib/components that mentions `.cm-` MUST be enumerated. HAS_CM is
  // stateless, so this cannot skip a file the way a reused global .test() would.
  for (const file of walk(resolve(ROOT, 'src/lib/components'), (n) => n.endsWith('.ts') || n.endsWith('.svelte'))) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if (HAS_CM.test(readFileSync(file, 'utf8')) && !enumerated.has(rel)) {
      failures.push(`un-enumerated file contains .cm-: ${rel}`);
    }
  }
  const files = allow.enumeratedFiles.map((rel) => ({ path: rel, source: readFileSync(resolve(ROOT, rel), 'utf8') }));
  const all = [...failures, ...evaluate(files, allow).failures];
  if (all.length === 0) {
    console.log('cm-internals: PASS');
    process.exit(0);
  }
  console.error('cm-internals: FAIL');
  for (const f of all) console.error(`  ${f}`);
  process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
```

- [ ] **Step 5: Write the allowlist from Step 1's greps (seed the current chrome classes; Task 5 ratchets them out)**

```json
{
  "writingSurface": [
    ".cm-content", ".cm-cursor", ".cm-editor", ".cm-focused",
    ".cm-gutterElement", ".cm-gutters", ".cm-line", ".cm-lintRange-info"
  ],
  "cairnPrefix": ".cm-cairn-",
  "chromeFloor": [".cm-tooltip", ".cm-tooltip-lint", ".cm-diagnostic-info", ".cm-diagnosticAction"],
  "enumeratedFiles": [
    "src/lib/components/spellcheck.ts",
    "src/lib/components/MarkdownEditor.svelte",
    "src/lib/components/EditPage.svelte"
  ]
}
```
If Step 1's greps show any token or file this seed misses, add it — the seed must equal the grep, not this template.

- [ ] **Step 6: Wire the script into package.json AND CI**

`package.json` scripts: `"check:cm-internals": "node scripts/check-cm-internals.mjs",`
`.github/workflows/test.yml`: add a step `- run: npm run check:cm-internals` alongside the existing `check:*` steps (there is no aggregate `check` script; each `check:*` is its own CI step). Confirm placement by opening the workflow.

- [ ] **Step 7: Run the unit test and the gate**

Run: `npx vitest run --project unit src/tests/unit/check-cm-internals.test.ts` → Expected: PASS.
Run: `node scripts/check-cm-internals.mjs` → Expected: `cm-internals: PASS` (the seed matches the current tree, and DYNAMIC exempts the `.cm-cairn-depth-${depth}` rail selector in `MarkdownEditor.svelte`).

- [ ] **Step 8: Commit** (run the full gate first)

```bash
git add scripts/check-cm-internals.mjs scripts/cm-internals-allowlist.json src/tests/unit/check-cm-internals.test.ts package.json .github/workflows/test.yml
git commit -m "feat(gate): add check:cm-internals allowlist ratchet, wired into CI"
```

---

## Task 2: Suppress the built-in lint tooltip

**Files:**
- Create: `src/tests/component/fake-spell-worker.ts` (extract the fake from `spellcheck.test.ts`)
- Modify: `src/lib/components/spellcheck.ts` (both `linter()` calls)
- Test: `src/tests/component/suggestion-popover.test.ts`

**Interfaces:**
- Produces: `export function makeFakeWorker(config): { create, added }` (moved verbatim from `spellcheck.test.ts`, plus `export const COLD_START = { timeout: 20000 }`). No built-in `.cm-tooltip-lint`/`.cm-diagnosticAction` renders on hover.

- [ ] **Step 1: Extract the shared fake-Worker helper**

Move `makeFakeWorker` (and its `FakeWorkerConfig` type) out of `src/tests/component/spellcheck.test.ts` into `src/tests/component/fake-spell-worker.ts`, `export` it, add `export const COLD_START = { timeout: 20000 };`, and import it back into `spellcheck.test.ts`. Run `npx vitest run --project component src/tests/component/spellcheck.test.ts` to confirm the extraction is behavior-neutral (still green).

- [ ] **Step 2: Write the failing test (drive the HOVER trigger the stock tooltip actually uses)**

```ts
// src/tests/component/suggestion-popover.test.ts
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import MarkdownEditor from '../../lib/components/MarkdownEditor.svelte';
import { makeFakeWorker, COLD_START } from './fake-spell-worker.js';

describe('suggestion popover', () => {
  it('renders no built-in lint tooltip on hover (it is suppressed by tooltipFilter)', async () => {
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the', 'ten'] });
    const { container } = render(MarkdownEditor, {
      value: 'teh cat', name: 'body', spellcheck: true,
      spellcheckTest: { createWorker: fake.create, assumeReady: true },
    });
    const mark = await expect.poll(() => container.querySelector('.cm-lintRange-info'), COLD_START).toBeTruthy();
    // Hover is the stock lint tooltip's trigger (see spellcheck.test.ts). Give it the hover delay, then
    // assert the stock action buttons never appear.
    await userEvent.hover(container.querySelector('.cm-lintRange-info')!);
    await new Promise((r) => setTimeout(r, 400));
    expect(document.querySelector('.cm-diagnosticAction')).toBeNull();
    expect(container.querySelector('.cm-tooltip-lint')).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run --project component src/tests/component/suggestion-popover.test.ts`
Expected: FAIL — on hover the stock `.cm-diagnosticAction` buttons render.

- [ ] **Step 4: Add `tooltipFilter` to both linters**

Spellcheck `source` config gains `tooltipFilter` beside `needsRefresh`:
```ts
  }, {
    needsRefresh: (update) =>
      update.transactions.some((tr) => tr.effects.some((e) => e.is(relintEffect))),
    // Suppress @codemirror/lint's built-in tooltip; cairn renders its own recipe popover via showTooltip
    // (editor-suggestion-popover.ts). Every diagnostic here is cairn's, so filter to none. markerFilter is
    // untouched, so the underline stays.
    tooltipFilter: () => [],
  });
```
The `objectiveSource`, which has no config today, gains one:
```ts
  const objectiveSource = linter((view) => {
    const { text, spans } = visibleProseSpans(view);
    return objectiveErrors(text, spans).map(buildObjectiveDiagnostic);
  }, { tooltipFilter: () => [] });
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run --project component src/tests/component/suggestion-popover.test.ts` → Expected: PASS.

- [ ] **Step 6: Commit** (full gate first)

```bash
git add src/lib/components/spellcheck.ts src/tests/component/fake-spell-worker.ts src/tests/component/spellcheck.test.ts src/tests/component/suggestion-popover.test.ts
git commit -m "feat(editor): suppress the built-in @codemirror/lint suggestion tooltip"
```

---

## Task 3 (MAIN LOOP / opus): The recipe popover DOM via `showTooltip`

**Files:**
- Create: `src/lib/components/editor-suggestion-popover.ts`
- Modify: `src/lib/components/spellcheck.ts` (append to the returned array)
- Test: `src/tests/component/suggestion-popover.test.ts`

**Interfaces:**
- Consumes: `cairnSpellcheck`'s already-loaded modules (`viewMod`, `stateMod`, `lintMod`).
- Produces: `export function cairnSuggestionPopover(modules: { view, state, lint }): Extension`; the exported `diagnosticAtCaret` and `buildPopoverDom` helpers Task 4 reuses. The popover is `role="group"` with an `aria-label`, the `message`, and one `<button class="btn btn-sm">` per `Diagnostic.actions` entry; each button runs `action.apply(view, from, to)` then `view.focus()`; `Escape` on the popover DOM returns focus to the editor.

- [ ] **Step 1: (main loop) Produce the popover visual through the frontend-design loop**

Run the frontend-design loop for one artifact: the suggestion popover. Criteria: match `MediaInsertPopover.svelte`'s visual recipe and the `admin-design-system.md` popover recipe; Warm Stone tokens only; action buttons are DaisyUI `.btn.btn-sm`; a clear message line; hover/selected states carry a non-color cue and clear the contrast floors. The a11y attributes below are fixed regardless of the visual; the loop fills only the class list and DOM order.

- [ ] **Step 2: Write the failing tests (render + apply a suggestion + add-to-dictionary end-to-end + ignore scope)**

```ts
  const props = (fake: ReturnType<typeof makeFakeWorker>) => ({
    value: 'teh teh', name: 'body', spellcheck: true,
    spellcheckTest: { createWorker: fake.create, assumeReady: true },
  });
  const openPopover = async (container: Element) => {
    await expect.poll(() => container.querySelector('.cm-lintRange-info'), COLD_START).toBeTruthy();
    await userEvent.click(container.querySelector('.cm-lintRange-info')!);
    return expect.poll(() => container.querySelector('.cairn-cm-suggest'), COLD_START).toBeTruthy();
  };

  it('renders a recipe popover (role=group, message, action buttons) and applies a suggestion', async () => {
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the', 'ten'] });
    const { container } = render(MarkdownEditor, props(fake));
    const popover = (await openPopover(container)) as HTMLElement;
    expect(popover.getAttribute('role')).toBe('group');
    expect(popover.getAttribute('aria-label')).toContain('teh');
    expect([...popover.querySelectorAll('button')].map((b) => b.textContent)).toEqual(
      expect.arrayContaining(['the', 'ten', 'Add to dictionary', 'Ignore']),
    );
    await userEvent.click(popover.querySelector('button')!); // the first suggestion, "the"
    await expect.poll(() => container.querySelector('input[name="body"]')?.value, COLD_START).toBe('the teh');
  });

  it('adds a word to the dictionary and clears every underline (survives relint)', async () => {
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
    const { container } = render(MarkdownEditor, props(fake));
    const popover = (await openPopover(container)) as HTMLElement;
    const add = [...popover.querySelectorAll('button')].find((b) => b.textContent === 'Add to dictionary')!;
    await userEvent.click(add);
    await expect.poll(() => fake.added.has('teh'), COLD_START).toBe(true);
    await expect.poll(() => container.querySelectorAll('.cm-lintRange-info').length, COLD_START).toBe(0);
  });

  it('ignores a word for the session and clears its underline', async () => {
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
    const { container } = render(MarkdownEditor, props(fake));
    const popover = (await openPopover(container)) as HTMLElement;
    const ignore = [...popover.querySelectorAll('button')].find((b) => b.textContent === 'Ignore')!;
    await userEvent.click(ignore);
    await expect.poll(() => container.querySelectorAll('.cm-lintRange-info').length, COLD_START).toBe(0);
  });
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run --project component src/tests/component/suggestion-popover.test.ts`
Expected: FAIL — no `.cairn-cm-suggest` element.

- [ ] **Step 4: Write the popover module**

```ts
// src/lib/components/editor-suggestion-popover.ts
// cairn-cms: the recipe suggestion popover. Renders cairn's own DOM through CodeMirror's public showTooltip
// facet for the diagnostic under the caret, instead of skinning @codemirror/lint's built-in tooltip. A pure
// StateField maps the caret onto the diagnostic (via the public forEachDiagnostic) and provides the Tooltip;
// the DOM is a generic renderer over Diagnostic.message + Diagnostic.actions, so it serves both the
// spellcheck and objective-error diagnostics. The keyboard model (Alt-Enter) and the polite announcement
// live in the exports Task 4 adds.
import type { Extension } from '@codemirror/state';
import type { EditorView, Tooltip } from '@codemirror/view';
import type { EditorState } from '@codemirror/state';
import type { Diagnostic } from '@codemirror/lint';

/** The already-loaded CodeMirror modules the editor hands in, so the popover never value-imports at module scope. */
export interface PopoverModules {
  view: typeof import('@codemirror/view');
  state: typeof import('@codemirror/state');
  lint: typeof import('@codemirror/lint');
}

/** The diagnostic under the caret with its live range, or null when the caret sits outside every diagnostic. */
export function diagnosticAtCaret(
  state: EditorState,
  forEachDiagnostic: typeof import('@codemirror/lint').forEachDiagnostic,
): { diagnostic: Diagnostic; from: number; to: number } | null {
  const head = state.selection.main.head;
  let hit: { diagnostic: Diagnostic; from: number; to: number } | null = null;
  forEachDiagnostic(state, (diagnostic, from, to) => {
    if (!hit && head >= from && head <= to) hit = { diagnostic, from, to };
  });
  return hit;
}

/** Build the recipe popover DOM for one diagnostic. `role="group"` (non-modal, labeled): shown without
 *  taking focus; Alt-Enter (Task 4) moves focus into these native buttons; Escape returns focus here. */
export function buildPopoverDom(view: EditorView, diagnostic: Diagnostic, from: number, to: number): HTMLElement {
  const dom = document.createElement('div');
  dom.className = 'cairn-cm-suggest';
  dom.setAttribute('role', 'group');
  dom.setAttribute('aria-label', diagnostic.message);

  const message = document.createElement('p');
  message.className = 'cairn-cm-suggest__msg';
  message.textContent = diagnostic.message;
  dom.append(message);

  const actions = document.createElement('div');
  actions.className = 'cairn-cm-suggest__actions';
  for (const action of diagnostic.actions ?? []) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-sm';
    button.textContent = action.name;
    button.addEventListener('click', () => {
      // CodeMirror's own actions take the diagnostic's live range; use the field's from/to so a suggestion
      // never overwrites the wrong span after an edit. Return focus to the editor after any action (add and
      // ignore close the popover, so the focused button would otherwise vanish and drop focus to <body>).
      action.apply(view, from, to);
      view.focus();
    });
    actions.append(button);
  }
  dom.append(actions);

  // Escape must be a NATIVE listener here, not a CodeMirror keymap: CM's keydown handler lives on
  // contentDOM, and this popover DOM is outside .cm-content, so a CM keymap would never see the Escape
  // pressed while focus is on a button.
  dom.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      view.focus();
    }
  });
  return dom;
}

export function cairnSuggestionPopover(modules: PopoverModules): Extension {
  const { showTooltip } = modules.view;
  const { StateField } = modules.state;
  const { forEachDiagnostic } = modules.lint;

  function tooltipFor(state: EditorState): Tooltip | null {
    const hit = diagnosticAtCaret(state, forEachDiagnostic);
    if (!hit) return null;
    return {
      pos: hit.from,
      end: hit.to,
      above: true,
      create: (view) => ({ dom: buildPopoverDom(view, hit.diagnostic, hit.from, hit.to) }),
    };
  }

  const popoverField = StateField.define<Tooltip | null>({
    create: (state) => tooltipFor(state),
    // Recompute on selection/doc changes AND on effect-bearing transactions: @codemirror/lint publishes
    // fresh diagnostics via a setDiagnostics EFFECT with no doc/selection change, so without `tr.effects`
    // the popover would go stale after add/ignore and miss first paint under a resting caret. A focus-loss
    // blur dispatches an empty update (no doc/selection/effects), so it returns the prior value and the
    // mounted, focused popover is preserved (CM reuses the view when the Tooltip value is unchanged).
    update: (value, tr) => (tr.docChanged || tr.selection || tr.effects.length ? tooltipFor(tr.state) : value),
    provide: (f) => showTooltip.from(f),
  });

  return [popoverField];
}
```

- [ ] **Step 5: Bundle it into `cairnSpellcheck`'s returned array**

In `spellcheck.ts`, add the import and append the extension (the module handles are non-null at the return):
```ts
import { cairnSuggestionPopover } from './editor-suggestion-popover.js';
// …
  return [
    source,
    objectiveSource,
    lockedUnderlineTheme(EditorView),
    cairnSuggestionPopover({ view: viewMod!, state: stateMod!, lint: lintMod! }),
  ];
```

- [ ] **Step 6: Run to verify it passes**

Run: `npx vitest run --project component src/tests/component/suggestion-popover.test.ts` → Expected: PASS (render, apply, add-to-dictionary, ignore).

- [ ] **Step 7: Commit** (full gate first)

```bash
git add src/lib/components/editor-suggestion-popover.ts src/lib/components/spellcheck.ts src/tests/component/suggestion-popover.test.ts
git commit -m "feat(editor): render the suggestion popover as recipe DOM via showTooltip"
```

---

## Task 4 (MAIN LOOP / opus): The keyboard entry point and the announcement

**Files:**
- Modify: `src/lib/components/editor-suggestion-popover.ts` (add the `Alt-Enter` keymap + the live-region ViewPlugin)
- Test: `src/tests/component/suggestion-popover.test.ts`

**Interfaces:**
- Consumes: `popoverField`, `diagnosticAtCaret`, `getTooltip`.
- Produces: `Alt-Enter` focuses the first popover button; a polite `aria-live` region announces "…N suggestions; press Alt+Enter…" when the caret enters a diagnostic. (Escape is already handled by the native listener from Task 3.)

- [ ] **Step 1: Write the failing tests**

```ts
  it('moves focus into the popover on Alt-Enter and restores it on Escape', async () => {
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
    const { container } = render(MarkdownEditor, props(fake));
    await openPopover(container);
    await userEvent.keyboard('{Alt>}{Enter}{/Alt}');
    await expect.poll(() => document.activeElement?.closest('.cairn-cm-suggest'), COLD_START).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => document.activeElement?.closest('.cm-content'), COLD_START).toBeTruthy();
  });

  it('announces availability through a polite live region when the caret enters a misspelling', async () => {
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
    const { container } = render(MarkdownEditor, props(fake));
    await openPopover(container);
    const live = await expect
      .poll(() => container.querySelector('[aria-live="polite"].cairn-cm-suggest-live'), COLD_START)
      .toBeTruthy();
    expect((live as HTMLElement).textContent?.toLowerCase()).toContain('suggestion');
    expect((live as HTMLElement).textContent).toContain('Alt+Enter');
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run --project component src/tests/component/suggestion-popover.test.ts`
Expected: FAIL — no keymap, no live region.

- [ ] **Step 3: Extend the module — the keymap and the live-region plugin**

At the top of `cairnSuggestionPopover`, also destructure `keymap`, `getTooltip`, `ViewPlugin` from `modules.view`, then add:

```ts
  // Move focus into the popover shown for the caret's diagnostic. Returns false when none is shown, so the
  // binding is inert elsewhere. This is the ONLY focus move; caret-in-range never auto-focuses. Alt-Enter,
  // NOT Mod-. — Ctrl+. is the Details-panel shortcut and would double-fire.
  const focusPopover = (view: EditorView): boolean => {
    const tip = view.state.field(popoverField, false);
    if (!tip) return false;
    const button = getTooltip(view, tip)?.dom.querySelector<HTMLButtonElement>('button');
    if (!button) return false;
    button.focus();
    return true;
  };
  const popoverKeymap = keymap.of([{ key: 'Alt-Enter', run: focusPopover }]);

  // A single visually-hidden polite live region; when the caret enters a NEW diagnostic range, announce the
  // word, the suggestion count, and the key that opens the popover. Recompute on the same triggers as the
  // field (doc/selection/effects) so a diagnostic landing under a resting caret still announces.
  const liveRegion = ViewPlugin.fromClass(
    class {
      dom: HTMLElement;
      lastKey = '';
      constructor(view: EditorView) {
        this.dom = document.createElement('div');
        this.dom.className = 'cairn-cm-suggest-live';
        this.dom.setAttribute('aria-live', 'polite');
        this.dom.setAttribute('aria-atomic', 'true');
        this.dom.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);';
        view.dom.append(this.dom);
        this.announce(view);
      }
      update(update: import('@codemirror/view').ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.transactions.some((tr) => tr.effects.length))
          this.announce(update.view);
      }
      announce(view: EditorView) {
        const hit = diagnosticAtCaret(view.state, forEachDiagnostic);
        const key = hit ? `${hit.from}:${hit.to}` : '';
        if (key === this.lastKey) return;
        this.lastKey = key;
        if (!hit) return;
        const count = hit.diagnostic.actions?.length ?? 0;
        this.dom.textContent = `${hit.diagnostic.message} ${count} suggestion${count === 1 ? '' : 's'}; press Alt+Enter to open.`;
      }
      destroy() {
        this.dom.remove();
      }
    },
  );

  return [popoverField, popoverKeymap, liveRegion];
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run --project component src/tests/component/suggestion-popover.test.ts` → Expected: PASS (all cases).

- [ ] **Step 5: Commit** (full gate first)

```bash
git add src/lib/components/editor-suggestion-popover.ts src/tests/component/suggestion-popover.test.ts
git commit -m "feat(editor): give the suggestion popover an Alt-Enter keyboard path and a live-region announcement"
```

---

## Task 5: Theme surgery + ratchet the gate to the floor

**Files:**
- Modify: `src/lib/components/spellcheck.ts` (`lockedUnderlineTheme`), `scripts/cm-internals-allowlist.json`

- [ ] **Step 1: Apply the frontend-design classes and strip the chrome rules**

Rewrite `lockedUnderlineTheme`: keep the underline, drop the three chrome rules, add the `.cm-tooltip` neutralize and the `.cairn-cm-suggest` recipe styling (visual values from the Task 3 mockup):
```ts
function lockedUnderlineTheme(EditorViewMod: typeof import('@codemirror/view').EditorView): Extension {
  return EditorViewMod.theme({
    '.cm-lintRange-info': {
      backgroundImage: 'none',
      textDecoration: 'underline wavy var(--cairn-warning-ink, oklch(50% 0.13 70))',
      textDecorationSkipInk: 'none',
      textUnderlineOffset: '0.2em',
    },
    // The one sanctioned internal-class touch: CodeMirror force-adds `.cm-tooltip` and paints a border and
    // background; neutralize it so the recipe DOM owns the surface. Allow-listed by name in the gate.
    '.cm-tooltip': { border: 'none', backgroundColor: 'transparent', padding: '0' },
    // The recipe popover surface (cairn's own class, not a CodeMirror internal). Visual values from the
    // frontend-design mockup; the structure is the admin popover recipe.
    '.cairn-cm-suggest': {
      fontFamily: 'var(--font-body)',
      background: 'var(--color-base-100)',
      border: '1px solid var(--cairn-card-border)',
      borderRadius: 'var(--radius-box)',
      boxShadow: 'var(--cairn-shadow)',
      padding: '0.5rem',
    },
  });
}
```

- [ ] **Step 2: Ratchet the allowlist to the floor**

In `scripts/cm-internals-allowlist.json`, set `"chromeFloor": [".cm-tooltip"]`.

- [ ] **Step 3: Run the gate and the tests**

Run: `node scripts/check-cm-internals.mjs` → Expected: `cm-internals: PASS` (only `.cm-tooltip` remains).
Run: `npx vitest run --project component src/tests/component/suggestion-popover.test.ts` → Expected: PASS.

- [ ] **Step 4: Prove the ratchet bites (then revert)**

Temporarily re-add `'.cm-tooltip-lint': {}` to `lockedUnderlineTheme`, run `node scripts/check-cm-internals.mjs`, confirm it FAILS naming `.cm-tooltip-lint`, then remove it.

- [ ] **Step 5: Commit** (full gate first)

```bash
git add src/lib/components/spellcheck.ts scripts/cm-internals-allowlist.json
git commit -m "refactor(editor): strip the lint-tooltip theme chrome; ratchet cm-internals to the .cm-tooltip floor"
```

---

## Task 6: Tune the underline

**Files:**
- Modify: `src/lib/components/spellcheck.ts` (`.cm-lintRange-info`)
- Test: `src/tests/component/suggestion-popover.test.ts` (reuse the proven `pinWarningInk` assertion)

- [ ] **Step 1: Write the failing test (match the existing spellcheck.test.ts computed-style assertion)**

Import/reuse the `pinWarningInk()` and `WARNING_INK` helpers from the existing spellcheck test (extract them into `fake-spell-worker.ts` or a shared test util if not already shared). The assertion asserts color + style, not just "underline":
```ts
  it('draws the misspelling underline in the locked amber token, wavy', async () => {
    pinWarningInk();
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
    const { container } = render(MarkdownEditor, props(fake));
    const mark = await expect.poll(() => container.querySelector('.cm-lintRange-info'), COLD_START).toBeTruthy();
    const style = getComputedStyle(mark as HTMLElement);
    expect(style.textDecorationColor).toBe(WARNING_INK);
    expect(style.textDecorationStyle).toBe('wavy');
  });
```

- [ ] **Step 2: Run** — Expected: PASS (the token already resolves). If the tune below changes the property, adjust the assertion to the tuned property, not away from color/style.

- [ ] **Step 3: Apply the tune** (keep the token; add weight and offset)

```ts
    '.cm-lintRange-info': {
      backgroundImage: 'none',
      textDecoration: 'underline wavy var(--cairn-warning-ink, oklch(50% 0.13 70))',
      textDecorationThickness: '1px',
      textDecorationSkipInk: 'none',
      textUnderlineOffset: '0.22em',
    },
```
(Refine thickness/offset from the frontend-design mockup if it specified them.)

- [ ] **Step 4: Run** — `npx vitest run --project component src/tests/component/suggestion-popover.test.ts` → PASS.

- [ ] **Step 5: Commit** (full gate first)

```bash
git add src/lib/components/spellcheck.ts src/tests/component/suggestion-popover.test.ts
git commit -m "style(editor): tune the misspelling underline weight and offset"
```

---

## Task 7: The upgrade tripwire

**Files:**
- Create: `src/tests/unit/codemirror-public-api.test.ts`
- Main-loop step: a scheduled routine via the `schedule` skill.

- [ ] **Step 1: Write the public-API-shape test**

```ts
// src/tests/unit/codemirror-public-api.test.ts
import { describe, it, expect } from 'vitest';
import * as view from '@codemirror/view';
import * as lint from '@codemirror/lint';
import * as state from '@codemirror/state';

// The public CodeMirror surface the recipe popover binds to. A major that renames or drops one of these
// fails here deterministically, in-repo, rather than surfacing as a runtime break in the editor.
describe('CodeMirror public API the suggestion popover depends on', () => {
  it('exposes the tooltip facet and helpers we use', () => {
    expect(typeof view.showTooltip).toBe('object'); // a Facet
    expect(typeof view.getTooltip).toBe('function');
    expect(typeof view.keymap).toBe('object'); // a Facet
    expect(typeof view.ViewPlugin.fromClass).toBe('function');
    expect(typeof view.EditorView.theme).toBe('function');
  });
  it('exposes forEachDiagnostic and linter', () => {
    expect(typeof lint.forEachDiagnostic).toBe('function');
    expect(typeof lint.linter).toBe('function');
  });
  it('exposes StateField.define', () => {
    expect(typeof state.StateField.define).toBe('function');
  });
});
```

- [ ] **Step 2: Run** — `npx vitest run --project unit src/tests/unit/codemirror-public-api.test.ts` → PASS.

- [ ] **Step 3: (main loop) Create the scheduled upgrade routine via the `schedule` skill**

Create a routine that, monthly, bumps the `@codemirror/*` ranges in a throwaway branch, runs `npm run check && npm test && npm run check:cm-internals`, and pings only on failure (mirror the kit#15992 watcher). Not a `cairn-implementer` task.

- [ ] **Step 4: Commit** (full gate first)

```bash
git add src/tests/unit/codemirror-public-api.test.ts
git commit -m "test(editor): assert the CodeMirror public API the popover binds to"
```

---

## Task 8: Documentation and roadmap

**Files:**
- Modify: `docs/internal/cm-editing-surface-alignment.md`, `docs/internal/admin-design-system.md`, `ROADMAP.md`

- [ ] **Step 1: Record the seam.** Update `cm-editing-surface-alignment.md` to the shipped design (writing-surface/chrome rule, `showTooltip` + `forEachDiagnostic`, `tooltipFilter`, the `.cm-tooltip` floor, `check:cm-internals`, the Alt-Enter/Escape a11y model), or retire it and fold the durable content into the design-system doc — one home, not two.

- [ ] **Step 2: Document the editor popover recipe.** Add the `.cairn-cm-suggest` popover to `docs/internal/admin-design-system.md` as the editor variant of the popover recipe (this is a definite update — the pass adds a real recipe, and CLAUDE.md mandates reading that doc before editor-surface work).

- [ ] **Step 3: Prune the roadmap.** Remove the **CodeMirror integration: the suggestion popover** bullet from the `## Now` tier of `ROADMAP.md`. Leave the follow-ons (editor a11y hardening, find/replace, autocomplete) untouched.

- [ ] **Step 4: Run the docs gate.** `npm run check:docs` → PASS.

- [ ] **Step 5: Commit.**

```bash
git add docs/internal/cm-editing-surface-alignment.md docs/internal/admin-design-system.md ROADMAP.md
git commit -m "docs(editor): record the shipped CM popover seam and prune the roadmap"
```

---

## Self-Review

**Spec coverage.** Every spec section maps to a task, with the adversarial-review corrections folded in: `showTooltip` + caret `StateField` + `forEachDiagnostic` (Task 3), the field recomputing on `tr.effects.length` so diagnostic changes are not missed (Task 3), `tooltipFilter` suppression validated against the real hover trigger (Task 2), the recipe DOM matching MediaInsertPopover's visual but NOT its modal behavior (Task 3), the keyboard model with `Alt-Enter` (not the colliding `Mod-.`) and a NATIVE Escape listener (not a dead CM keymap), the polite live region, no `aria-modal`/no auto-focus (Tasks 3–4), the writing-surface underline tune with the proven `pinWarningInk` assertion (Task 6), the honest coupling metric with the `.cm-tooltip` floor (Task 5), the allowlist gate with a stateless staleness guard, a `.cm-cairn-`-exempt dynamic matcher, the composite split, and CI wiring (Task 1), component-test verification with the shared fake-Worker and `expect.poll(..., COLD_START)` (Tasks 2–6), and the upgrade tripwire as a committed test plus a scheduled routine (Task 7). Token resolution stays a documented dependency (no task changes the tooltip parent).

**Spec deviations recorded (see the companion spec edits).** (1) Keybinding is `Alt-Enter`, not `Mod-.`, because Ctrl+. is the existing Details-panel shortcut. (2) The popover is `role="group"` + a polite live region throughout, not role-follows-focus-to-dialog: a non-modal labeled group of native buttons reached by Alt-Enter and announced by the live region is simpler and more correct than a dynamically switched dialog role, and we explicitly do not want modal semantics.

**Placeholder scan.** The one deferred visual (the popover's exact classes) is produced by the frontend-design loop in Task 3 Step 1 before the DOM is wired; the a11y structure and behavior are concrete.

**Type consistency.** `cairnSuggestionPopover(modules)` is called with `{ view, state, lint }` from `cairnSpellcheck`'s handles; `popoverField`, `diagnosticAtCaret`, and `buildPopoverDom` (defined in Task 3) are consumed by the keymap and live region in Task 4; `Diagnostic.actions[].apply(view, from, to)` matches the existing builders. `props`/`openPopover` test helpers are defined once and reused across Tasks 3–6.

**Sequencing note.** Task 2 (suppress) precedes Task 3 (recipe), so between those commits the editor has no suggestion popover; suppress-first is deliberate (it avoids a double tooltip on hover). Acceptable because the pass merges as one feature branch; do not partial-merge Task 2 alone.

---

## Post-mortem (2026-06-30)

**Shipped.** All 8 tasks landed on the `cm-suggestion-popover` worktree (off `main` @ `18b519b`), plus a review-fix. Commits: `ea0a692` (gate), `ef939a4` (suppress), `6d5b83e` (recipe DOM), `a62df09` (keyboard + live region), `6af3c72` (theme + ratchet), `c4facb9` (underline tune), `3375648` (tripwire test), `e4dc79e` (docs + roadmap), `1b4b8af` (import tidy), `4b64ade` (focus-stability fix). Held unmerged, no publish.

**Verified.** Full gate green at pass end: `npm run check` 0/0 (1252 files), `npm test` exit 0 (2882 tests, 275 files), `check:cm-internals` PASS (floor = `.cm-tooltip`), `check:custom-surface` both trees PASS, `check:comments` OK, `check:docs` OK. The popover renders cairn's recipe DOM through `showTooltip`; the built-in lint tooltip is suppressed; the underline stays. Keyboard path (Alt-Enter in, native Escape out), the polite live region, and focus stability under background lint effects are all covered (7 component tests + 3 unit stability tests + the public-API tripwire).

**Corrections made during execution (the plan draft's assumptions that did not hold):**
- `tooltipFilter: () => []` does NOT suppress the built-in tooltip on `@codemirror/lint` 6.9.7: an empty array is JS-truthy and `lintTooltip` gates on `!found`, so it mounts an empty `.cm-tooltip-lint`. The filter must return `null` (a cast, since the type is non-nullable). Verified against the installed source.
- The `showTooltip` field MUST memoize its `Tooltip`. CM's reconciler reuses a mounted tooltip only when the new Tooltip's `create` is reference-identical, so a fresh object per recompute lets a background lint effect (a late or stale `setDiagnostics`) rebuild the DOM and drop focus from a focused button. The a11y review caught this (its one real finding, W1); fixed and guarded by a headless facet-stability test.
- The component fixture `'teh teh'` is a doubled word, so the objective-error linter adds a third underline that add/ignore cannot clear. Use two non-adjacent occurrences (`'teh cat teh dog'`).
- The extracted `fake-spell-worker.ts` had no `ignoreWord` handler, so an ignored word never became correct on relint.
- `.append()` resolves to a wrong overload in this file's type context; `appendChild` is the repo idiom.
- `expect.poll(...).toBeTruthy()` resolves to void, so it cannot return the element; re-query after the poll (the repo's poll-to-wait / re-query-to-get idiom).
- The live-region announcement drops the action count: the generic renderer cannot tell a spelling suggestion from a management action, so a raw `actions.length` announced "Add to dictionary" and "Ignore" as suggestions (a11y review S2).

**a11y review verdict.** Accessibility-correct within the locked non-modal `role="group"` model; the one real focus hole is fixed. S3 (the message renders literal backticks into the `aria-label`) belongs to the message string in `spellcheck.ts`, one seam over, and is logged in the friction log.

**Carried follow-ups:**
- **Schedule routine DEFERRED to merge** (Geoff, 2026-06-30). The monthly CodeMirror-upgrade-watch cloud routine runs `check:cm-internals`, which is not on `origin/main` until this branch merges and pushes. Create it then: monthly (`0 8 1 * *`), Default env, Sonnet, ping-on-failure, mirroring the kit#15992 watcher. The committed public-API tripwire test is the in-repo guard meanwhile.
- **Live admin smoke: N/A this pass.** No `/admin` auth or Worker path changed; the popover is covered by real-browser component tests.
- **Backtick-in-message polish** (friction log, editor perspective): parse the backtick into a `<code>`/emphasis span in the diagnostic message, a future editor-copy refinement.

**Next.** The CodeMirror integration initiative continues on the deferred surfaces (autocomplete, find/replace) and the editor a11y hardening, a brainstorm-first pass per `docs/internal/cm-editing-surface-alignment.md` ("What remains deferred") and the ROADMAP "Later" tier. The identity-through-facets pattern this pass proved (recipe DOM through a public extension point, the internal-class allowlist ratchet) is the template to reuse.
