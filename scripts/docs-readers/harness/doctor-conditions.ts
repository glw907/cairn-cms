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
 * The condition ids `cairn doctor`'s own non-test Go sources raise: every `spine.ConditionXxx`
 * identifier those files reference, resolved through `condition.go`'s own declarations, excluding
 * `ConditionNone` (the one identifier with no dot in its id, doctor's placeholder for "no
 * condition applies", never a real title-bearing condition).
 * @param repoRoot - The checkout root.
 * @returns The set of condition ids (for example `config.bindings-missing`).
 */
export function doctorRaisedConditionIds(repoRoot: string): Set<string> {
  const conditionGo = readFileSync(join(repoRoot, 'tool/internal/spine/condition.go'), 'utf8');
  const idByIdentifier = parseConditionIdentifiers(conditionGo);
  const doctorDir = join(repoRoot, 'tool/internal/doctor');
  const ids = new Set<string>();
  for (const name of readdirSync(doctorDir)) {
    if (!name.endsWith('.go') || name.endsWith('_test.go')) continue;
    const source = readFileSync(join(doctorDir, name), 'utf8');
    for (const identifier of referencedConditionIdentifiers(source)) {
      const id = idByIdentifier.get(identifier);
      if (id && id.includes('.')) ids.add(id);
    }
  }
  return ids;
}
