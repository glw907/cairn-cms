# Admin self-styling foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the cairn admin's CSS from the engine, scoped and self-contained, so the admin styles itself with Tailwind and DaisyUI on any host with no host CSS.

**Architecture:** A build step compiles Tailwind utilities and DaisyUI components (built-in themes off, no global Preflight) plus the Warm Stone theme variables from the admin component source, scopes every rule under the admin `data-theme` with `postcss-prefix-selector`, and writes the sheet into `dist/components/cairn-admin.css` where the admin components already import it. The framework-free showcase proves it: the admin renders fully styled on a site that ships no Tailwind and no DaisyUI.

**Tech Stack:** `tailwindcss` 4, `@tailwindcss/postcss` 4, `daisyui` 5, `postcss`, `postcss-prefix-selector`; `@sveltejs/package`; Vitest.

**Scope note:** This is plan 1 of the "admin stands on its own" initiative (spec: `docs/superpowers/specs/2026-06-07-cairn-admin-stands-alone-design.md`). It lands the self-styling CSS pipeline only. The DaisyUI UX rebuild and dark mode (plan 2) and the chrome isolation (plan 3) follow, then the two site retrofits. The CSS pipeline scans the component source on every build, so it picks up whatever classes the later UX rebuild adds with no further build change.

**Mechanism is pre-verified.** The Tailwind v4 plus DaisyUI v5 compile and the `postcss-prefix-selector` scoping were proven empirically before this plan was written: utilities and component classes emit with no global Preflight, `themes: false` keeps the palette ours, the scope prefix `:where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark'])` leaks no global rule, and `@keyframes` step selectors stay intact. The code below is the verified shape. Task 1's spike re-runs it in the real repo before the rest leans on it.

**Key facts about this repo.** `@sveltejs/package` flattens `src/lib` to `dist`, so a component at `src/lib/components/X.svelte` ships at `dist/components/X.svelte`, and the admin stylesheet ships at `dist/components/cairn-admin.css`. The `package` script today is `svelte-package && chmod +x dist/vite/bin.js`. The admin components `AdminLayout.svelte`, `LoginPage.svelte`, and `ConfirmPage.svelte` import `./cairn-admin.css`. The showcase (`examples/showcase`) consumes the engine through its `svelte`/`default` export condition pointing at `dist`, and it ships no Tailwind and no DaisyUI of its own.

---

### Task 1: Add the build dependencies and confirm the mechanism in-repo

**Files:**
- Modify: `package.json` (devDependencies)

- [ ] **Step 1: Install the build dependencies**

Run from the repo root:

```bash
npm i -D tailwindcss@4 @tailwindcss/postcss@4 daisyui@5 postcss postcss-prefix-selector
```

- [ ] **Step 2: Confirm the compile-and-scope mechanism in this repo**

Create a throwaway proof at `/tmp/cairn-admin-mech.mjs` and run it. This re-runs the verified mechanism against the repo's own installed dependency versions before any real file leans on it.

```bash
cat > /tmp/cairn-admin-mech.mjs <<'EOF'
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import prefixSelector from 'postcss-prefix-selector';
const input = `
@layer theme, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
@plugin "daisyui" { themes: false; }
@source inline("btn drawer navbar menu input alert badge flex min-h-screen p-4 animate-spin");
[data-theme='cairn-admin'] { --color-primary: oklch(52% 0.2 293); }
`;
const compiled = await postcss([tailwind()]).process(input, { from: '/tmp/x.css' });
const scoped = await postcss([prefixSelector({
  prefix: ":where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark'])",
  transform(prefix, selector, prefixed) {
    if (selector.includes('[data-theme=')) return selector;
    if (selector === ':root' || selector === 'html' || selector === 'body') return prefix;
    return prefixed;
  },
})]).process(compiled.css, { from: undefined });
const css = scoped.css;
const classesOk = ['.btn','.drawer','.menu','.input','.alert','.badge','.flex','.min-h-screen','.p-4'].every((c) => css.includes(c));
const noLeak = !/(^|\})\s*(:root|html|body|\*)\s*\{/.test(css);
const keyframesOk = !/:where\([^{]*\)\s*(0%|100%|from|to)\s*\{/.test(css);
console.log('classesOk', classesOk, 'noLeak', noLeak, 'keyframesOk', keyframesOk);
process.exit(classesOk && noLeak && keyframesOk ? 0 : 1);
EOF
node /tmp/cairn-admin-mech.mjs
```

Expected output: `classesOk true noLeak true keyframesOk true`, exit 0. If it does not pass, stop and resolve the mechanism (the spec's open question) before continuing, because the rest of the plan depends on it.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add the admin-CSS build dependencies"
```

---

### Task 2: Add the scoped reset to the theme partial

The theme partial `src/lib/components/cairn-admin.css` stays the one source of truth for the admin's variables. It gains a box-sizing reset scoped to the admin theme, which replaces the global Preflight the compile omits. The partial is plain CSS, so the engine's source-consuming tests still load it, and the compile folds it into the shipped sheet.

**Files:**
- Modify: `src/lib/components/cairn-admin.css`
- Test: `src/tests/unit/engine-isolation.test.ts` (existing, run only)

- [ ] **Step 1: Append the scoped reset**

Add this block at the end of `src/lib/components/cairn-admin.css`, after the closing `}` of the `[data-theme='cairn-admin']` variable block:

```css

/* The scoped reset that replaces global Preflight (which the admin sheet omits). It applies only
   inside the admin theme roots, so it never reaches the host's pages. The dark root has no variables
   yet (plan 2 adds them); naming it here is harmless and keeps the reset stable across both themes. */
[data-theme='cairn-admin'] *,
[data-theme='cairn-admin'] *::before,
[data-theme='cairn-admin'] *::after,
[data-theme='cairn-admin-dark'] *,
[data-theme='cairn-admin-dark'] *::before,
[data-theme='cairn-admin-dark'] *::after {
  box-sizing: border-box;
}
```

- [ ] **Step 2: Confirm the existing isolation test still passes**

The existing test asserts the partial is scoped and carries no bare global selector. The scoped reset uses `*` only after a `[data-theme=...]` prefix, so it does not trip the bare-global check.

Run: `npx vitest run src/tests/unit/engine-isolation.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/cairn-admin.css
git commit -m "Scope a box-sizing reset to the admin theme"
```

---

### Task 3: Add the compile input file

This file is the Tailwind entry the build compiles. It lives under `scripts/`, not `src/lib`, so `svelte-package` does not ship it. It imports the theme partial so the compiled sheet carries the variables and the scoped reset, and it points `@source` at the admin components so Tailwind emits exactly the classes in use.

**Files:**
- Create: `scripts/admin-css.input.css`

- [ ] **Step 1: Create the input file**

```css
/* Compile input for the cairn admin stylesheet. Not shipped. scripts/build-admin-css.mjs reads it,
   runs @tailwindcss/postcss over it, then scopes the output under the admin data-theme. Utilities
   and the theme tokens come in without Preflight; DaisyUI emits component classes with its built-in
   themes off, so the Warm Stone variables in the imported partial supply the palette. */
@layer theme, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
@plugin "daisyui" { themes: false; }
@source "../src/lib/components/**/*.{svelte,ts,js}";
@import "../src/lib/components/cairn-admin.css";
```

- [ ] **Step 2: Commit**

```bash
git add scripts/admin-css.input.css
git commit -m "Add the admin-CSS compile input"
```

---

### Task 4: Write the failing build-output test

**Files:**
- Create: `src/tests/unit/admin-css-build.test.ts`

- [ ] **Step 1: Write the test**

The test imports the build function (not yet written) and asserts the compiled sheet ships the classes the current admin uses, scopes every rule, and leaks no global selector. It asserts only classes the current admin components use, so it stays green before the UX rebuild adds more.

```ts
import { describe, it, expect } from 'vitest';
// The build script is plain ESM under scripts/; the unit project runs in Node.
import { buildAdminCss } from '../../../scripts/build-admin-css.mjs';

describe('admin css build', () => {
  it('ships the DaisyUI components and Tailwind utilities the admin uses', async () => {
    const css = await buildAdminCss();
    for (const cls of ['.btn', '.drawer', '.navbar', '.menu', '.input', '.alert', '.badge', '.checkbox', '.flex', '.min-h-screen', '.p-4']) {
      expect(css, `missing ${cls}`).toContain(cls);
    }
  });

  it('scopes every rule under the admin theme and leaks no global selector', async () => {
    const css = await buildAdminCss();
    expect(css).toContain("[data-theme='cairn-admin']");
    // No bare global :root/html/body/* rule that would reach the host's public pages.
    expect(css).not.toMatch(/(^|\})\s*(:root|html|body|\*)\s*\{/);
    // No global Preflight margin reset (the admin uses a scoped box-sizing reset instead).
    expect(css).not.toMatch(/\*\s*,[^{]*\{[^}]*margin:\s*0/);
  });

  it('keeps @keyframes step selectors intact', async () => {
    const css = await buildAdminCss();
    // A scoped keyframe step like ":where(...) 0% {" would be a scoping bug.
    expect(css).not.toMatch(/:where\([^{]*\)\s*(0%|100%|from|to)\s*\{/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tests/unit/admin-css-build.test.ts`
Expected: FAIL, cannot resolve `../../../scripts/build-admin-css.mjs` (the module does not exist yet).

---

### Task 5: Implement the build script

**Files:**
- Create: `scripts/build-admin-css.mjs`
- Test: `src/tests/unit/admin-css-build.test.ts` (from Task 4)

- [ ] **Step 1: Write the build script**

```js
// Compiles the cairn admin stylesheet: Tailwind utilities plus DaisyUI component classes (built-in
// themes off, no global Preflight) plus the Warm Stone theme variables, then scopes every rule under
// the admin data-theme so nothing leaks onto the host's pages. The admin components import the
// result at dist/components/cairn-admin.css, so the admin styles itself on any host with no host CSS.
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import prefixSelector from 'postcss-prefix-selector';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const repoRoot = new URL('../', import.meta.url);
const inputPath = fileURLToPath(new URL('scripts/admin-css.input.css', repoRoot));
const outDir = fileURLToPath(new URL('dist/components', repoRoot));
const outPath = fileURLToPath(new URL('dist/components/cairn-admin.css', repoRoot));

// Both admin theme roots, kept low-specificity with :where so the host can always override and the
// scoped utilities never outrank a host rule on equal class names.
const SCOPE = ":where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark'])";

export async function buildAdminCss() {
  const input = readFileSync(inputPath, 'utf8');
  // Stage 1: Tailwind and DaisyUI compile. `from` is the input path so @source and @import resolve
  // relatively and the plugins resolve from the repo's node_modules.
  const compiled = await postcss([tailwind()]).process(input, { from: inputPath });
  // Stage 2: scope every rule under the admin theme roots.
  const scoped = await postcss([
    prefixSelector({
      prefix: SCOPE,
      transform(prefix, selector, prefixed) {
        // A rule already rooted at a theme (the hand-authored variables and the reset) stays as-is.
        if (selector.includes('[data-theme=')) return selector;
        // Tailwind emits its theme tokens under :root (and :host); map those to the theme root.
        if (selector === ':root' || selector === 'html' || selector === 'body') return prefix;
        return prefixed;
      },
    }),
  ]).process(compiled.css, { from: undefined });
  return scoped.css;
}

// When run as a script, write the compiled sheet into dist, overwriting the variables-only partial
// that svelte-package copied there.
if (import.meta.url === `file://${process.argv[1]}`) {
  const css = await buildAdminCss();
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, css);
  console.log(`wrote ${outPath} (${css.length} bytes)`);
}
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npx vitest run src/tests/unit/admin-css-build.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 3: Commit**

```bash
git add scripts/build-admin-css.mjs src/tests/unit/admin-css-build.test.ts
git commit -m "Compile the scoped, self-contained admin stylesheet"
```

---

### Task 6: Wire the build into the package step and verify dist

**Files:**
- Modify: `package.json` (the `package` script)

- [ ] **Step 1: Add the build step to the package script**

Change the `package` script so the admin CSS compiles after `svelte-package` copies the source and before the bin is made executable.

From:

```json
"package": "svelte-package && chmod +x dist/vite/bin.js",
```

To:

```json
"package": "svelte-package && node scripts/build-admin-css.mjs && chmod +x dist/vite/bin.js",
```

- [ ] **Step 2: Run the package build**

Run: `npm run package`
Expected: the build prints `wrote .../dist/components/cairn-admin.css (NNNNN bytes)` with a size in the tens of kilobytes.

- [ ] **Step 3: Verify the shipped sheet is the compiled one, not the variables-only partial**

Run:

```bash
grep -c "\.btn" dist/components/cairn-admin.css
grep -c "@plugin\|@tailwind\|@import \"tailwindcss" dist/components/cairn-admin.css
grep -c "data-theme='cairn-admin'" dist/components/cairn-admin.css
```

Expected: the first count is at least 1 (component classes are present), the second is 0 (no raw directives survive the compile), and the third is at least 1 (the sheet is scoped).

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "Compile the admin stylesheet as part of the package build"
```

---

### Task 7: Prove the admin self-styles on the framework-free showcase

The showcase ships no Tailwind and no DaisyUI. With the compiled sheet in `dist`, the showcase admin must render fully styled, which is the end-to-end proof of self-styling. The login page needs no session, so it is the simplest deterministic proof, and it exercises the input, button, alert, and card styling.

**Files:**
- None (verification only)

- [ ] **Step 1: Start the showcase against the freshly built engine**

The engine `dist` was rebuilt in Task 6. Start the showcase preview in the background:

```bash
cd examples/showcase && npm run build && npm run preview &
```

Wait for the preview URL (default `http://localhost:4173`). If `npm run build` needs a manifest, run `npm run cairn:manifest` first, then rebuild.

- [ ] **Step 2: Screenshot the login page**

```bash
cat > /tmp/cairn-admin-shot.mjs <<'EOF'
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newContext({ viewport: { width: 1100, height: 800 } }).then((c) => c.newPage());
await p.goto('http://localhost:4173/admin/login', { waitUntil: 'networkidle' });
await p.screenshot({ path: '/tmp/cairn-admin-login.png' });
await b.close();
console.log('shot /tmp/cairn-admin-login.png');
EOF
cp /tmp/cairn-admin-shot.mjs ./tmp-shot.mjs && node ./tmp-shot.mjs; rm -f ./tmp-shot.mjs
```

- [ ] **Step 3: Confirm the page is styled**

Open `/tmp/cairn-admin-login.png`. Expected: a centered card on a tinted background, a styled email input and a primary button, not a stack of unstyled browser-default form controls. This confirms the engine's compiled DaisyUI and Tailwind classes reach a site that ships neither. Stop the preview process when done.

---

### Task 8: Version, changelog, and the full gate

**Files:**
- Modify: `package.json` (version)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Bump the version**

Set `package.json` `version` to `0.31.0` (a minor bump over the unpublished `0.30.0` on `main`).

- [ ] **Step 2: Add the changelog entry**

Add a `0.31.0` section at the top of the entries in `CHANGELOG.md`, following the file's existing format:

```markdown
## 0.31.0

The admin now ships its own stylesheet. The engine compiles the admin's Tailwind utilities and
DaisyUI component classes, scoped under the admin `data-theme`, and the admin styles itself on any
host with no Tailwind or DaisyUI of its own. The compiled sheet leaks no global rule, so it never
touches the host's pages.

Consumers may: remove any Tailwind `@source` entry that existed only to generate the admin's classes;
the admin no longer depends on the host's Tailwind or DaisyUI build. A host that already provides
DaisyUI globally keeps working, since the engine's scoped rules are low-specificity (`:where`) and
the class names match; a later pass moves the admin out of the host's chrome entirely.
```

- [ ] **Step 3: Run the full engine gate**

```bash
npm run check
npm test
npm run check:reference
npm run check:package
npm run check:docs
```

Expected: `npm run check` reports 0 errors and 0 warnings, `npm test` exits 0, and the three `check:*` commands exit 0. No public export changed, so `check:reference` needs no new reference page.

- [ ] **Step 4: Commit**

```bash
git add package.json CHANGELOG.md
git commit -m "Release 0.31.0: the admin ships its own scoped stylesheet"
```

---

## Self-review notes

- Spec coverage: this plan implements design section 1 (self-contained admin styling) end to end, including the dev dependencies, the `themes: false` DaisyUI compile with no global Preflight, the scope under both theme roots, the dist build wiring, the isolation assertions, and the framework-free showcase proof. It deliberately defers the UX rebuild and dark-mode variables and toggle (design section 2, plan 2), the dev guard and route docs (sections 3 and 4, plan 3), and the site retrofits.
- Type and name consistency: `buildAdminCss` is defined in `scripts/build-admin-css.mjs` (Task 5) and imported by the test (Task 4) and the `package` script (Task 6) under the same name. The scope string `:where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark'])` is identical in the script and the verified mechanism.
- The dark theme root appears in the scoped reset (Task 2) and the scope prefix (Task 5) before plan 2 adds its variables. A selector that matches no element is inert, so this is safe and avoids a later edit to the reset.
