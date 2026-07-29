import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { transform, Features } from 'lightningcss';
// The build script is plain ESM under scripts/; this unit project runs in Node.
import { buildAdminCss } from '../../../scripts/build-admin-css.mjs';
import { parseSheet } from '../../lib/audit/sheet.js';
import type { SheetDeclaration } from '../../lib/audit/sheet.js';

// CONTRACT: the two ratified chip registers exist twice, once as cairn-admin.css's shared
// `.cairn-chip-bounded`/`.cairn-chip-quiet` classes (every OTHER admin surface that composes a
// chip by hand: EditPage, CairnAdminShell, ReferenceField, MediaCaptureCard, ManageEditors) and
// once as StatusChip's own scoped `.status-chip-bounded`/`.status-chip-quiet` (a Svelte scoped
// rule is unlayered by construction, so StatusChip never needed the shared classes). The bounded
// pair already drifted once (the global rule stated `background-color: transparent` explicitly;
// the scoped rule relied on badge-outline's own default), so this is a standing proof, not a
// one-time grep: any future edit to either recipe that is not mirrored to its twin fails here.
describe('chip register no-drift', () => {
  let adminCss: string;
  let statusChipStyle: string;
  beforeAll(async () => {
    adminCss = await buildAdminCss();
    const source = readFileSync(
      new URL('../../lib/admin-toolkit/StatusChip.svelte', import.meta.url),
      'utf8',
    );
    // Anchored to a `<style>` tag alone on its own line, never a bare substring match: the
    // @component doc comment above the script blocks names the literal text `<style>` in prose,
    // and a greedy match from there would swallow the whole script and markup in between.
    const match = source.match(/^<style>$([\s\S]*?)^<\/style>$/m);
    if (!match) throw new Error('expected a <style> block in StatusChip.svelte');
    // Run the extracted scoped block through the same lightningcss pass build-admin-css.mjs's own
    // stage 1b applies (minify: false), so a syntax-only difference (the literal keyword
    // `transparent` versus its canonical `#0000`) never registers as a drift the raw admin build
    // did not actually introduce.
    statusChipStyle = transform({
      filename: 'status-chip.css',
      code: Buffer.from(match[1]),
      include: Features.Nesting,
      minify: false,
    }).code.toString();
  }, 60_000);

  function declarationMap(declarations: SheetDeclaration[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const declaration of declarations) map.set(declaration.property, declaration.value);
    return map;
  }

  it('declares the same properties, in the same values, for the bounded register in both places', () => {
    const globalDeclarations = declarationMap(parseSheet(adminCss).declarations('cairn-chip-bounded'));
    const scopedDeclarations = declarationMap(parseSheet(statusChipStyle).declarations('status-chip-bounded'));
    expect(globalDeclarations.size).toBeGreaterThan(0);
    expect(scopedDeclarations).toEqual(globalDeclarations);
  });

  it('declares the same properties, in the same values, for the quiet register in both places', () => {
    const globalDeclarations = declarationMap(parseSheet(adminCss).declarations('cairn-chip-quiet'));
    const scopedDeclarations = declarationMap(parseSheet(statusChipStyle).declarations('status-chip-quiet'));
    expect(globalDeclarations.size).toBeGreaterThan(0);
    expect(scopedDeclarations).toEqual(globalDeclarations);
  });
});
