// cairn-cms: the shared field constraint rules. Both the v1 `defineFields` validator and the v2
// `fieldset` validator call these pure helpers, so the two validators cannot drift on the
// constraint wording or the first-failing-rule-wins order. No I/O and no clock reads, so the
// rules stay deterministic on Workers.

/** Compile a field pattern once, throwing a labeled error when the source is not a valid regex. */
export function compilePattern(source: string, label: string): RegExp {
  try {
    return new RegExp(source);
  } catch (cause) {
    throw new Error(`cairn: field "${label}" has an invalid pattern: ${source}`, { cause });
  }
}

/** Return the first string-length violation message, or null when the value satisfies the bounds. */
export function stringLengthError(
  value: string,
  c: { min?: number; max?: number; length?: number },
  label: string,
): string | null {
  if (c.min != null && value.length < c.min) return `${label} must be at least ${c.min} characters`;
  if (c.max != null && value.length > c.max) return `${label} must be at most ${c.max} characters`;
  if (c.length != null && value.length !== c.length) return `${label} must be exactly ${c.length} characters`;
  return null;
}

/** Return the format violation message when a compiled pattern rejects the value, else null. */
export function patternError(value: string, compiled: RegExp | undefined, label: string): string | null {
  if (compiled && !compiled.test(value)) return `${label} is not in the expected format`;
  return null;
}

/** Return the first date-bounds violation message, or null when the value is within the bounds. */
export function dateBoundsError(value: string, c: { min?: string; max?: string }, label: string): string | null {
  if (c.min != null && value < c.min) return `${label} must be on or after ${c.min}`;
  if (c.max != null && value > c.max) return `${label} must be on or before ${c.max}`;
  return null;
}
