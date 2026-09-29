// cairn-audit's rule model. A rule is a pure function of the context the runner assembles, so the
// core stays free of process state and a later packaging (an ESLint plugin, a hosted service) is a
// wrapper decision rather than a rewrite. Every finding carries a source range, not only a line:
// the suppression idiom resolves a directive to the next AST NODE and suppresses matching findings
// anywhere in that node's range, which a line number alone cannot express.
import type { AuditConfig } from './config.js';
import type { ImportChain, UnreadImport } from './import-chain.js';
import type { ParsedComponent } from './markup.js';
import type { CompiledSheet } from './sheet.js';

/**
 * A rule's gating weight. `error` exits the bin nonzero; `advisory` reports and never gates, which
 * is where a compositional rule starts until measured evidence promotes it.
 */
export type Tier = 'error' | 'advisory';

/** One rule's verdict about one place in the source. */
export interface Finding {
  ruleId: string;
  tier: Tier;
  /** Path as the report prints it, relative to the audited root. */
  file: string;
  /** 1-based line of `start`. */
  line: number;
  /** Character offset of the flagged construct in the file's source. */
  start: number;
  /** Character offset just past the flagged construct. */
  end: number;
  /** What is wrong, in the terms the design system uses. */
  message: string;
}

/** One standalone CSS file the config names for the CSS-family static rules to scan. */
export interface CssSource {
  /** Path as the report prints it, relative to the audited root. */
  file: string;
  source: string;
}

/**
 * One `.ts` or `.svelte` file `config.sourceScope` names, read as plain text rather than parsed
 * markup: the substrate the source-text-family static rules (`log-event-grammar`,
 * `log-secret-field`) scan. Same shape as `CssSource` on purpose, so both are suppressible by
 * `cairn-audit-disable-next-line` the same way every other rule's source is.
 */
export type SourceFile = CssSource;

/** Everything a static rule may read, assembled once per run. */
export interface StaticRuleContext {
  files: ParsedComponent[];
  sheet: CompiledSheet;
  config: AuditConfig;
  /**
   * Standalone CSS files `config.staticCssFiles` names, outside any component. Optional: the
   * markup-family rules never read it, so their fixture contexts stay unchanged; the CSS-family
   * rules default it to an empty list when a caller omits it.
   */
  cssFiles?: CssSource[];
  /**
   * Every `.ts` and `.svelte` file under `config.sourceScope`, read as plain text. Optional: a
   * rule that never reads it (every markup- and CSS-family rule) keeps its existing fixture
   * contexts unchanged; the source-text-family rules default it to an empty list when a caller
   * omits it.
   */
  sources?: SourceFile[];
  /**
   * The import chain of the `public.stylesheets` entries, read once per run. Present only when a
   * selected rule sets `importChain`; a rule that sets it reads this, and every other rule never
   * sees it.
   */
  chain?: ImportChain;
}

/** A static rule: an id, a tier, and a pure check over the run's context. */
export interface StaticRule {
  /** Stable id, the name a suppression directive and the report both use. */
  id: string;
  tier: Tier;
  /**
   * Whether this rule resolves over `config.adminScope` instead of `config.staticScope`, for
   * both surfaces it reads (components under those roots and the `staticCssFiles` entries that
   * lie inside them). Absent or false runs over `staticScope` as every rule did before this
   * field existed, so a rule that only manages a site's own admin frame never reads a public
   * component tree it was never meant to police.
   */
  adminOnly?: boolean;
  /**
   * Whether this rule resolves over the public scope (`config.publicScope`, config.ts) instead of
   * `config.staticScope`: `ctx.files` and `ctx.cssFiles` hold the public scope's components and
   * standalone CSS. A run reads the public scope only when a selected rule sets this, and fails
   * with an actionable message when that scope matches no file. Absent or false, a rule never
   * reads a public file.
   */
  publicScope?: boolean;
  /**
   * Whether this rule reads `ctx.chain`, the `@import` chain of `config.publicStylesheets`. A rule
   * that sets it also sets `publicScope`: the chain is the stylesheet half of the public scope, and
   * the runner hands it over only in that scope's context.
   */
  importChain?: boolean;
  check(ctx: StaticRuleContext): Finding[];
}

/** One run's result: what gates, what was silenced, and how much ground was covered. */
export interface AuditReport {
  /** Findings no suppression directive covered. These drive the exit code. */
  findings: Finding[];
  /** Findings a directive silenced. Counted loudly, never gating. */
  suppressed: Finding[];
  filesScanned: number;
  /** The ids of the rules that ran, in registry order. */
  ruleIds: string[];
  /**
   * The `@import`s and entry stylesheets the chain loader could not read, when a rule that reads
   * the chain ran. Reported, never a finding: an uninstalled font package is not a conformance error.
   */
  unreadImports?: UnreadImport[];
}
