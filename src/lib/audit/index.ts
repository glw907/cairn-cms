// cairn-audit's barrel: the runner, the report, the config, and the two substrates behind one
// import path for the bin and its tests. The audit is internal (no public package subpath), so this
// stays free to combine those modules; it carries no logic of its own.
export { runStatic } from './run.js';
export { formatReport, exitCodeFor } from './report.js';
export {
  CONFIG_FILE,
  DEFAULT_PALETTE_CSS_FILES,
  DEFAULT_RENDERED_PAGES,
  DEFAULT_SHEET_CANDIDATES,
  DEFAULT_STATIC_SCOPE,
  loadConfig,
  parseArgs,
  resolveConfig,
  USAGE,
} from './config.js';
export {
  buildManifest,
  checkManifestDisciplines,
  formatNormsQuery,
  isTokenDerived,
  loadNormsManifest,
  queryNorms,
  unknownTermMessage,
  MIN_OBSERVATION_SITES,
  NORM_PRECISION,
  NORM_ROLES,
  NORMS_MANIFEST_PATH,
  OPEN_DESIGN_QUESTIONS,
  RATIFIED_NORMS,
} from './norms.js';
export { lineAt, parseComponent } from './markup.js';
export { negatedClassNames, parseSheet, selectorClassNames, splitSelectorList } from './sheet.js';
export { applySuppressions, parseDirectives, DIRECTIVE_MARKER, SUPPRESSION_RULE_ID } from './suppress.js';
export { staticRules } from './rules/static/index.js';
export { renderedRules } from './rules/rendered/index.js';
export {
  DEFAULT_BASE_URL,
  resolveBaseUrl,
  resolveColors,
  resolveExtraCookies,
  resolveRenderedFindings,
  runRendered,
} from './rendered.js';
export {
  composite,
  contrastRatio,
  cumulativeOpacity,
  describeColor,
  indeterminateFinding,
  relativeLuminance,
  resolveGround,
  sameColor,
  OPAQUE_WHITE,
  TRANSPARENT,
} from './color.js';
export type { GroundResolution, PaintLayer, Rgba } from './color.js';
export type { AuditArgs, AuditConfig, RenderedAllowlistEntry } from './config.js';
export type { ClassToken, ElementAttribute, ParsedComponent, SourceNode } from './markup.js';
export type {
  NormBand,
  NormEntry,
  NormFamily,
  NormFlag,
  NormKind,
  NormObservation,
  NormRole,
  NormsManifest,
  NormsQueryMatch,
  NormsSource,
  OpenDesignQuestion,
  RatifiedNorm,
} from './norms.js';
export type { CompiledSheet, SheetDeclaration, SheetRule } from './sheet.js';
export type { Directive, DirectiveForm, SuppressionSource, SuppressionSplit } from './suppress.js';
export type { AuditReport, Finding, StaticRule, StaticRuleContext, Tier } from './types.js';
export type {
  InteractionState,
  PlaywrightModule,
  RenderedBrowser,
  RenderedContext,
  RenderedDeps,
  RenderedFinding,
  RenderedPage,
  RenderedPageVisit,
  RenderedRule,
  RenderedRuleContext,
  ResolvedRenderedFinding,
  Theme,
} from './rendered.js';
