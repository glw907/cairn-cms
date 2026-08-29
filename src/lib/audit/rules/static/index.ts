// The static rule registry. A rule module lives beside this file and exports one StaticRule; adding
// it here is the whole registration, so the runner never names an individual rule and a new rule
// never edits run.ts. A fresh array per call, so a caller's filtering mutates nothing shared.
import { focusParity } from './focus-parity.js';
import { gapScale } from './gap-scale.js';
import { grammarBoundary } from './grammar-boundary.js';
import { listRole } from './list-role.js';
import { motionBand } from './motion-band.js';
import { noUncompiledClass } from './no-uncompiled-class.js';
import { reducedMotion } from './reduced-motion.js';
import { stockDefaultHazards } from './stock-default-hazards.js';
import { stripeTrimParity } from './stripe-trim-parity.js';
import { tokenColors } from './token-colors.js';
import { typeScale } from './type-scale.js';
import { unlayeredFontClobber } from './unlayered-font-clobber.js';
import type { StaticRule } from '../../types.js';

/** The static rules a run executes, in report order. */
export function staticRules(): StaticRule[] {
  return [
    noUncompiledClass,
    typeScale,
    gapScale,
    stockDefaultHazards,
    tokenColors,
    grammarBoundary,
    focusParity,
    motionBand,
    reducedMotion,
    stripeTrimParity,
    unlayeredFontClobber,
    listRole,
  ];
}
