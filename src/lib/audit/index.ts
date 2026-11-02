// cairn-audit's barrel: the runner, the report, and the config behind one
// import path for the bin and its tests. The audit is internal (no public package subpath), so this
// stays free to combine those modules; it carries no logic.
export { runStatic, selectRules } from './run.js';
export { formatReport, exitCodeFor } from './report.js';
export {
  CONFIG_FILE,
  DEFAULT_PALETTE_CSS_FILES,
  DEFAULT_SHEET_CANDIDATES,
  DEFAULT_STATIC_SCOPE,
  loadConfig,
  parseArgs,
  resolveConfig,
  USAGE,
} from './config.js';
export { lineAt, parseComponent } from './markup.js';
export { negatedClassNames, parseSheet, selectorClassNames, splitSelectorList } from './sheet.js';
export { applySuppressions, parseDirectives, DIRECTIVE_MARKER, SUPPRESSION_RULE_ID } from './suppress.js';
export { staticRules } from './rules/static/index.js';
export { compositeOver, dualGamutRatio, resolveColor } from './contrast.js';
export type { GamutRatios, PropertyLookup, Resolution, ResolvedColor } from './contrast.js';
export { loadImportChain, nodeChainFs } from './import-chain.js';
export type { ChainFile, ChainFs, ChainImport, ImportChain, ImportStatus, UnreadImport } from './import-chain.js';
export { loadDaisyThemeKeys, loadTailwindVariables, nodePeers } from './peers.js';
export type { DaisyThemeKeys, PeerAccess } from './peers.js';
export { readThemeCascade } from './schemes.js';
export type { RootState, Scheme, ThemeBlock, ThemeCascade } from './schemes.js';
export {
  calloutTints,
  contrastPairs,
  CONTRAST_FLOOR,
  formatContrastTable,
  measureThemeContrast,
} from './rules/static/theme-contrast.js';
export type { ContrastMeasurement, ContrastPair, ContrastRow, SchemeContrast } from './rules/static/theme-contrast.js';
export type { AuditConfig, AuditFlags } from './config.js';
export type { ClassToken, ElementAttribute, ParsedComponent, SourceNode } from './markup.js';
export type { CompiledSheet, SheetDeclaration, SheetRule } from './sheet.js';
export type { Directive, DirectiveForm, SuppressionSource, SuppressionSplit } from './suppress.js';
export type { AuditReport, Finding, StaticRule, StaticRuleContext, Tier } from './types.js';
