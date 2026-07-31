// The rendered rule registry, the counterpart to rules/static/index.ts: a rule module lives beside
// this file and exports one RenderedRule; adding it here is the whole registration. `runRendered`
// refuses to run against an empty registry rather than reporting a silently clean audit, so this
// list is what turns the rendered harness on.
//
// Fourteen rules are registered: five error-tier rules (`one-filled-action`, `focus-renders`,
// `interactive-contrast`, `touch-targets`, `viewport-overflow`; `chip-ground-collision` demoted
// out of this tier in design infrastructure Pass 3, pending its chroma repair, see ROADMAP), then
// nine advisory ones (`chip-ground-collision`, `border-contrast`, `weight-budget`, `norms-bands`,
// `screen-anatomy`, `relational-spacing`, `form-font-parity`, `field-edge-alignment`,
// `container-inset-asymmetry`), which report and never reach the exit code. `form-font-parity` is
// registered PROVISIONALLY at advisory (design ratchet Task 5): its own header names the intended
// promotion to error, gated on Task 6's CI re-check.
import { borderContrast } from './border-contrast.js';
import { chipGroundCollision } from './chip-ground-collision.js';
import { containerInsetAsymmetry } from './container-inset-asymmetry.js';
import { fieldEdgeAlignment } from './field-edge-alignment.js';
import { focusRenders } from './focus-renders.js';
import { formFontParity } from './form-font-parity.js';
import { interactiveContrast } from './interactive-contrast.js';
import { normsBands } from './norms-bands.js';
import { oneFilledAction } from './one-filled-action.js';
import { relationalSpacing } from './relational-spacing.js';
import { screenAnatomy } from './screen-anatomy.js';
import { touchTargets } from './touch-targets.js';
import { viewportOverflow } from './viewport-overflow.js';
import { weightBudget } from './weight-budget.js';
import type { RenderedRule } from '../../rendered.js';

/**
 * The rendered rules a run executes, in report order. A fresh array per call, so a caller's
 * filtering mutates nothing shared.
 */
export function renderedRules(): RenderedRule[] {
  return [
    oneFilledAction,
    focusRenders,
    interactiveContrast,
    touchTargets,
    viewportOverflow,
    chipGroundCollision,
    borderContrast,
    weightBudget,
    normsBands,
    screenAnatomy,
    relationalSpacing,
    formFontParity,
    fieldEdgeAlignment,
    containerInsetAsymmetry,
  ];
}
