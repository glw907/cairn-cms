// cairn-cms: rebuilds the compiled admin sheet before the component project's tests run, so every
// component test reads a fresh dist/components/cairn-admin.css rather than one left over from a
// previous package build. Vitest 4.1 runs a project's own globalSetup once, in Node, before that
// project's test files start; an npm pre-step would not reach a direct `npx vitest run --project
// component <file>` invocation, but a project's own globalSetup does.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildAdminCss } from '../../../scripts/build/build-admin-css.mjs';

const outDir = fileURLToPath(new URL('../../../dist/components', import.meta.url));
const outPath = fileURLToPath(new URL('../../../dist/components/cairn-admin.css', import.meta.url));

/** Rebuilds and writes the compiled admin sheet before the component project's tests run. */
export default async function setup(): Promise<void> {
  const css = await buildAdminCss();
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, css);
}
