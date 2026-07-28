// cairn-audit's barrel: the runner, the report, the config, and the two substrates behind one
// import path for the bin and its tests. The audit is internal (no public package subpath), so this
// stays free to combine those modules; it carries no logic of its own.
export { runStatic } from './run.js';
export { formatReport, exitCodeFor } from './report.js';
export { CONFIG_FILE, DEFAULT_SHEET_CANDIDATES, DEFAULT_STATIC_SCOPE, loadConfig, parseArgs, resolveConfig } from './config.js';
export { lineAt, parseComponent } from './markup.js';
export { negatedClassNames, parseSheet, selectorClassNames } from './sheet.js';
export { applySuppressions, parseDirectives, DIRECTIVE_MARKER, SUPPRESSION_RULE_ID } from './suppress.js';
export { staticRules } from './rules/static/index.js';
export type { AuditArgs, AuditConfig, RenderedAllowlistEntry } from './config.js';
export type { ClassToken, ElementAttribute, ParsedComponent, SourceNode } from './markup.js';
export type { CompiledSheet, SheetDeclaration, SheetRule } from './sheet.js';
export type { Directive, DirectiveForm, SuppressionSource, SuppressionSplit } from './suppress.js';
export type { AuditReport, Finding, StaticRule, StaticRuleContext, Tier } from './types.js';
