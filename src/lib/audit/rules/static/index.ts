// The static rule registry. A rule module lives beside this file and exports one StaticRule; adding
// it here is the whole registration, so the runner never names an individual rule and a new rule
// never edits run.ts. A fresh array per call, so a caller's filtering mutates nothing shared.
import { gapScale } from './gap-scale.js';
import { noUncompiledClass } from './no-uncompiled-class.js';
import { stockDefaultHazards } from './stock-default-hazards.js';
import { typeScale } from './type-scale.js';
import type { StaticRule } from '../../types.js';

/** The static rules a run executes, in report order. */
export function staticRules(): StaticRule[] {
  return [noUncompiledClass, typeScale, gapScale, stockDefaultHazards];
}
