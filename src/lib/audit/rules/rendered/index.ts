// The rendered rule registry, the counterpart to rules/static/index.ts: a rule module lives beside
// this file and exports one RenderedRule; adding it here is the whole registration. Empty today on
// purpose (Task 14 builds the harness only), Tasks 15 and 16 populate it with the eleven rendered
// rules spec 6.3 defines. `runRendered` refuses to run against an empty registry rather than
// reporting a silently clean audit, so an empty return here is a safe default: nothing runs until a
// caller explicitly supplies rules (as the harness's own tests do) or these rules ship.
import type { RenderedRule } from '../../rendered.js';

/**
 * The rendered rules a run executes, in report order. A fresh array per call, so a caller's
 * filtering mutates nothing shared.
 */
export function renderedRules(): RenderedRule[] {
  return [];
}
