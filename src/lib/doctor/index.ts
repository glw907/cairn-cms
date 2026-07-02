// cairn-doctor's barrel: aggregates the runner, the report formatter, and the assembly
// (flag parsing, context building, the default check registry) behind one import path for
// the bin and its tests. Doctor is internal-only (no public package subpath), so this stays
// free to combine those modules; it carries no logic of its own.
export { runDoctor } from './run.js';
export { formatReport } from './report.js';
export { parseArgs, contextFromEnv, deriveMissingInputs, defaultChecks } from './assemble.js';
export type { DoctorArgs, DerivationSources } from './assemble.js';
