/**
 * The condition ids `cairn doctor` actually raises, derived from its own Go sources rather than
 * hardcoded, so a title check built on this set tracks doctor's checks as they change. A sibling
 * command prints check names and detail text, never a registry title, and several conditions
 * carry no command at all yet, so neither one belongs in a check built only against what doctor's
 * own report prints.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Parse `tool/internal/spine/condition.go`'s own `ConditionXxx Condition = "some.id"`
 * declarations.
 * @param source - The file's raw Go source.
 * @returns A map from Go identifier (for example `ConditionBindingsMissing`) to its condition id
 *  string.
 */
export function parseConditionIdentifiers(source: string): Map<string, string> {
  const map = new Map<string, string>();
  const pattern = /\b(Condition[A-Za-z0-9]+)\s+Condition\s*=\s*"([^"]*)"/g;
  for (const match of source.matchAll(pattern)) map.set(match[1], match[2]);
  return map;
}

/**
 * Find every `spine.ConditionXxx` identifier a Go source references.
 * @param source - The file's raw Go source.
 * @returns The identifiers referenced, in no particular order, duplicates included.
 */
export function referencedConditionIdentifiers(source: string): string[] {
  return [...source.matchAll(/\bspine\.(Condition[A-Za-z0-9]+)\b/g)].map((m) => m[1]);
}

/**
 * Parse every top-level `type ConditionXxx` or `func ConditionXxx(` declaration in a Go source: a
 * name that shares the `Condition` prefix with the id constants but is not one of them (a type
 * such as `ConditionText`, or a function such as `Conditions`), so a doctor file's reference to it
 * is a known non-constant, never evidence of a moved id.
 * @param source - The file's raw Go source.
 * @returns The declared names.
 */
export function parseNonConstantConditionNames(source: string): Set<string> {
  const names = new Set<string>();
  for (const match of source.matchAll(/^(?:type|func)\s+(Condition[A-Za-z0-9]+)\b/gm)) names.add(match[1]);
  return names;
}

/**
 * The condition ids `cairn doctor`'s own non-test Go sources raise: every `spine.ConditionXxx`
 * identifier those files reference, resolved through `condition.go`'s own declarations, excluding
 * `ConditionNone` (the one identifier with no dot in its id, doctor's placeholder for "no
 * condition applies", never a real title-bearing condition) and every name the spine package's
 * own non-test sources declare as a type or a function rather than an id constant (`ConditionText`,
 * for example). A referenced identifier neither of those explains, or an empty result, throws
 * rather than let a title check built on this set pass silently with nothing to check: either one
 * means a moved constant or a changed declaration shape this parser no longer follows.
 * @param repoRoot - The checkout root.
 * @returns The set of condition ids (for example `config.bindings-missing`).
 * @throws When a referenced `spine.ConditionXxx` identifier resolves to neither an id constant nor
 *  a known non-constant declaration, or when no id resolves at all.
 */
export function doctorRaisedConditionIds(repoRoot: string): Set<string> {
  const spineDir = join(repoRoot, 'tool/internal/spine');
  const conditionGo = readFileSync(join(spineDir, 'condition.go'), 'utf8');
  const idByIdentifier = parseConditionIdentifiers(conditionGo);
  const nonConstantNames = new Set<string>();
  for (const name of readdirSync(spineDir)) {
    if (!name.endsWith('.go') || name.endsWith('_test.go')) continue;
    for (const declared of parseNonConstantConditionNames(readFileSync(join(spineDir, name), 'utf8'))) nonConstantNames.add(declared);
  }
  const doctorDir = join(repoRoot, 'tool/internal/doctor');
  const ids = new Set<string>();
  for (const name of readdirSync(doctorDir)) {
    if (!name.endsWith('.go') || name.endsWith('_test.go')) continue;
    const source = readFileSync(join(doctorDir, name), 'utf8');
    for (const identifier of referencedConditionIdentifiers(source)) {
      const id = idByIdentifier.get(identifier);
      if (id === undefined) {
        if (nonConstantNames.has(identifier)) continue;
        throw new Error(`doctor-conditions: ${name} references spine.${identifier}, which condition.go does not declare`);
      }
      if (id.includes('.')) ids.add(id);
    }
  }
  if (ids.size === 0) {
    throw new Error('doctor-conditions: no condition id resolved from tool/internal/doctor; the declaration shape may have changed');
  }
  return ids;
}
