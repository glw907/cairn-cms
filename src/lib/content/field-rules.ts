// cairn-cms: the shared field constraint rules the `fieldset` validator calls. They live apart from
// the validator as pure helpers, so the constraint wording and the first-failing-rule-wins order are
// stated once. No I/O and no clock reads, so the rules stay deterministic on Workers.

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
  constraints: { min?: number; max?: number; length?: number },
  label: string,
): string | null {
  const { min, max, length } = constraints;
  if (min != null && value.length < min) return `${label} must be at least ${min} characters`;
  if (max != null && value.length > max) return `${label} must be at most ${max} characters`;
  if (length != null && value.length !== length) return `${label} must be exactly ${length} characters`;
  return null;
}

/** Return the format violation message when a compiled pattern rejects the value, else null. */
export function patternError(value: string, compiled: RegExp | undefined, label: string): string | null {
  if (compiled && !compiled.test(value)) return `${label} is not in the expected format`;
  return null;
}

/** Return the first date-bounds violation message, or null when the value is within the bounds. */
export function dateBoundsError(value: string, constraints: { min?: string; max?: string }, label: string): string | null {
  const { min, max } = constraints;
  if (min != null && value < min) return `${label} must be on or after ${min}`;
  if (max != null && value > max) return `${label} must be on or before ${max}`;
  return null;
}
