/**
 * The reader-class declaration schema and its loader.
 *
 * A class declaration is a JSON file under `scripts/docs-readers/classes/` that fixes everything a
 * reader of that class is given: what its directory holds, which built-in tools it has, which Bash
 * commands it may run, which extra environment variables it sees, and which egress allowlist its
 * proxy enforces. The runner derives the `claude` flags and the expected init `tools` list from
 * the declaration alone, so a class cannot widen at run time.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ClassDecl, EgressConfig } from './types.js';

const READERS_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The directory holding the class declarations. */
export const CLASSES_DIR = join(READERS_ROOT, 'classes');

/** The egress-proxy allowlists, keyed by egress class. */
export const EGRESS_CONFIG = join(READERS_ROOT, 'egress.json');

/**
 * The built-in tools a class may name. The web tools are absent on purpose: every reader runs
 * with `--disallowedTools WebFetch,WebSearch`, so no class can grant them.
 */
export const KNOWN_TOOLS = ['Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash'];

/** How a class fills its per-run directory: copied docs-set paths, or a prepared tree. */
export const CONTENTS_KINDS = ['docs-set', 'prepared'];

/** The permission modes a class may run under; neither lets a prompt through headless. */
export const PERMISSION_MODES = ['default', 'acceptEdits'];

/**
 * Environment names the runner owns. A class may not set them, since they carry the credential,
 * the proxy route, or a key that would change how the CLI authenticates.
 */
export const RESERVED_ENV = new Set([
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'CLAUDE_CODE_OAUTH_TOKEN',
  'HOME',
  'PATH',
  'HTTPS_PROXY',
  'HTTP_PROXY',
  'https_proxy',
  'http_proxy',
  'NO_PROXY',
  'no_proxy',
]);

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
const ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const FIELDS = [
  'name',
  'description',
  'contents',
  'tools',
  'bashAllowlist',
  'permissionMode',
  'env',
  'secretEnv',
  'egress',
];

/**
 * Whether a value is one of a list of names.
 * @param list - The allowed names.
 * @param value - A field from parsed JSON.
 * @returns True when the value is a string in the list.
 */
function oneOf(list: readonly string[], value: unknown): boolean {
  return typeof value === 'string' && list.includes(value);
}

/**
 * Check one class declaration against the schema.
 * @param raw - The parsed JSON declaration.
 * @param egressClasses - The egress class names the proxy config defines.
 * @returns The list of problems; empty when the declaration is valid.
 */
export function validateClass(raw: unknown, egressClasses: string[]): string[] {
  const problems: string[] = [];
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['declaration is not an object'];
  }
  const decl = raw as Record<string, unknown>;
  for (const key of Object.keys(decl)) {
    if (!FIELDS.includes(key)) problems.push(`unknown field "${key}"`);
  }
  if (typeof decl.name !== 'string' || !NAME_PATTERN.test(decl.name)) {
    problems.push('name must be a lowercase slug');
  }
  if (typeof decl.description !== 'string' || decl.description.trim() === '') {
    problems.push('description must be a non-empty string');
  }
  if (!oneOf(CONTENTS_KINDS, decl.contents)) {
    problems.push(`contents must be one of ${CONTENTS_KINDS.join(', ')}`);
  }
  if (!Array.isArray(decl.tools) || decl.tools.length === 0) {
    problems.push('tools must be a non-empty array');
  } else {
    for (const tool of decl.tools) {
      if (!KNOWN_TOOLS.includes(tool)) problems.push(`tool "${tool}" is not grantable`);
    }
    if (new Set(decl.tools).size !== decl.tools.length) problems.push('tools repeat a name');
  }
  if (!Array.isArray(decl.bashAllowlist) || decl.bashAllowlist.some((p: unknown) => typeof p !== 'string' || p.trim() === '')) {
    problems.push('bashAllowlist must be an array of non-empty command patterns');
  } else if (decl.bashAllowlist.length > 0 && !(Array.isArray(decl.tools) && decl.tools.includes('Bash'))) {
    problems.push('bashAllowlist is set but tools does not grant Bash');
  } else if (decl.bashAllowlist.some((p: string) => /[()]/.test(p))) {
    problems.push('bashAllowlist patterns name the command only; the runner adds Bash(...)');
  }
  if (!oneOf(PERMISSION_MODES, decl.permissionMode)) {
    problems.push(`permissionMode must be one of ${PERMISSION_MODES.join(', ')}`);
  }
  if (decl.env === null || typeof decl.env !== 'object' || Array.isArray(decl.env)) {
    problems.push('env must be an object of fixed string values');
  } else {
    for (const [key, value] of Object.entries(decl.env)) {
      if (!ENV_NAME_PATTERN.test(key)) problems.push(`env name "${key}" is invalid`);
      if (RESERVED_ENV.has(key)) problems.push(`env name "${key}" is reserved for the runner`);
      if (typeof value !== 'string') problems.push(`env "${key}" must be a string`);
    }
  }
  if (!Array.isArray(decl.secretEnv)) {
    problems.push('secretEnv must be an array of variable names');
  } else {
    for (const key of decl.secretEnv) {
      if (typeof key !== 'string' || !ENV_NAME_PATTERN.test(key)) problems.push(`secretEnv name "${key}" is invalid`);
      else if (RESERVED_ENV.has(key)) problems.push(`secretEnv name "${key}" is reserved for the runner`);
    }
  }
  if (!oneOf(egressClasses, decl.egress)) {
    problems.push(`egress must be one of ${egressClasses.join(', ')}`);
  }
  return problems;
}

/**
 * Read the egress allowlists.
 * @param file - The egress config path.
 * @returns A map from egress class to its `host:port` entries.
 */
export function loadEgress(file = EGRESS_CONFIG): EgressConfig {
  const config = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  for (const [name, entries] of Object.entries(config)) {
    if (!Array.isArray(entries) || entries.some((e: unknown) => typeof e !== 'string' || !/^[a-z0-9.-]+:\d+$/.test(e))) {
      throw new Error(`egress class "${name}" must list host:port entries`);
    }
  }
  return config as EgressConfig;
}

/**
 * Load and validate every class declaration in a directory.
 * @param dir - The directory of `*.json` declarations.
 * @param egress - The egress allowlists the declarations may name.
 * @returns A map from class name to its declaration.
 * @throws When any declaration fails the schema or two share a name.
 */
export function loadClasses(dir = CLASSES_DIR, egress = loadEgress()): Map<string, ClassDecl> {
  const classes = new Map<string, ClassDecl>();
  const egressClasses = Object.keys(egress);
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const decl = JSON.parse(readFileSync(join(dir, file), 'utf8')) as ClassDecl;
    const problems = validateClass(decl, egressClasses);
    if (problems.length > 0) throw new Error(`class ${file}: ${problems.join('; ')}`);
    if (classes.has(decl.name)) throw new Error(`class ${file}: name "${decl.name}" is declared twice`);
    classes.set(decl.name, decl);
  }
  return classes;
}

/**
 * The `claude` flags a class implies. The job text never appears here; it goes on stdin.
 * @param decl - A validated class declaration.
 * @param model - The reader model for this job.
 * @param reportSchema - The JSON schema the reader's structured report must match.
 * @returns The argument list after the `claude` executable.
 */
export function claudeArgs(decl: ClassDecl, model: string, reportSchema: object): string[] {
  const args = [
    '-p',
    '--safe-mode',
    '--restricted',
    '--strict-mcp-config',
    // The `=` form matters: --tools is variadic and would swallow a following argument.
    `--tools=${decl.tools.join(',')}`,
    '--disallowedTools=WebFetch,WebSearch',
    '--permission-prompts',
    'none',
    '--permission-mode',
    decl.permissionMode,
    '--output-format',
    'stream-json',
    '--verbose',
    '--no-session-persistence',
    '--model',
    model,
    '--json-schema',
    JSON.stringify(reportSchema),
  ];
  if (decl.bashAllowlist.length > 0) {
    // Variadic, so it goes last: one argument per pattern, and nothing follows it to swallow.
    args.push('--allowedTools', ...decl.bashAllowlist.map((p) => `Bash(${p})`));
  }
  return args;
}

/**
 * The init `tools` list a run of this class must show. The structured report adds the CLI's
 * `StructuredOutput` tool, and nothing else may appear.
 * @param decl - A validated class declaration.
 * @returns The sorted tool names.
 */
export function expectedTools(decl: Pick<ClassDecl, 'tools'>): string[] {
  return [...decl.tools, 'StructuredOutput'].sort();
}
