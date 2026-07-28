// The rendered rule registry, the counterpart to rules/static/index.ts: a rule module lives beside
// this file and exports one RenderedRule; adding it here is the whole registration. `runRendered`
// refuses to run against an empty registry rather than reporting a silently clean audit, so this
// list is what turns the rendered harness on.
//
// Eleven rules are registered: the six error-tier rules spec 6.3 defines, then the five advisory
// ones (`border-contrast`, `weight-budget`, `norms-bands`, `screen-anatomy`, `relational-spacing`),
// which report and never reach the exit code.
import { borderContrast } from './border-contrast.js';
import { chipGroundCollision } from './chip-ground-collision.js';
import { focusRenders } from './focus-renders.js';
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
  ];
}
