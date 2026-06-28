// scripts/check-extension-surface.mjs
// Snapshots the ./extend public surface (exported names from dist/extend/index.d.ts) and fails when it
// drifts from the committed baseline. A drift is either an intended contract change (regenerate the
// snapshot in the same commit, which makes the change reviewable in the diff) or an accident (the gate
// caught it). See the extensibility spec, "A loud-failure gate that classifies the change".
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DTS = 'dist/extend/index.d.ts';
const SNAP = 'docs/internal/extension-surface.snapshot';
const write = process.argv.includes('--write');

if (!existsSync(DTS)) {
  console.error(`check:extension-surface: ${DTS} missing; run npm run package first.`);
  process.exit(1);
}
const src = readFileSync(DTS, 'utf8');
const names = [...src.matchAll(/export (?:declare )?(?:const|function|type|interface|class) (\w+)/g)]
  .map((m) => m[1])
  .concat([...src.matchAll(/export \{([^}]*)\}/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean)))
  .sort();
const current = names.join('\n') + '\n';

if (write) {
  writeFileSync(SNAP, current);
  console.log(`check:extension-surface: wrote ${names.length} symbols to ${SNAP}`);
  process.exit(0);
}
const baseline = existsSync(SNAP) ? readFileSync(SNAP, 'utf8') : '';
if (current !== baseline) {
  console.error('check:extension-surface: ./extend surface changed.\nIf intended, run `node scripts/check-extension-surface.mjs --write` and commit the snapshot with the change marked in the commit.\n--- expected\n' + baseline + '--- actual\n' + current);
  process.exit(1);
}
console.log(`check:extension-surface: ${names.length} symbols match the baseline.`);
