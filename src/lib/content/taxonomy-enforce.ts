// cairn-cms: the pure core of the tag-vocabulary enforcement seam. These helpers compute the
// per-entry allowed set, close the taxonomy field into a vocabulary-sourced picker for render and
// decode, and gate a save against a genuinely new value. They deliberately do not touch the
// fieldset validator (so a concept's `refine` and `behavior` survive) and do no I/O.
import type { NamedField } from './types.js';
import { resolveTaxonomyField } from './taxonomy.js';

/**
 * The allowed tag set for one entry: the configured vocabulary unioned with the entry's own prior
 *  tags, deduped in first-seen order. The union is the orphan safety net, so a re-saved
 *  pre-existing tag passes even after it leaves the vocabulary.
 */
export function resolveAllowed(vocabularyValues: string[], priorTags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of [...vocabularyValues, ...priorTags]) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

/** The entry's prior tags that are not in the configured vocabulary: its orphan set. */
export function unlistedTags(vocabularyValues: string[], priorTags: string[]): string[] {
  return priorTags.filter((t) => !vocabularyValues.includes(t));
}

/**
 * A copy of `fields` whose taxonomy field is the closed picker `options: allowed`,
 *  `creatable: false`, so the render, decode, and validate paths all agree on the checkbox group.
 *  Every other field is untouched, and the input is returned unchanged when there is no taxonomy
 *  field (the opt-in fallback).
 */
export function closeTaxonomyField(fields: NamedField[], allowed: string[]): NamedField[] {
  const taxField = resolveTaxonomyField(fields);
  if (taxField === null) return fields;
  return fields.map((field) =>
    field.name === taxField ? { ...field, options: allowed, creatable: false } : field
  );
}

/**
 * A save gate over the submitted taxonomy values: the error message naming the first value not in
 *  the allowed set, or undefined when every value passes.
 */
export function enforceTaxonomy(submittedTags: string[], allowed: string[]): string | undefined {
  const unlisted = submittedTags.find((t) => !allowed.includes(t));
  if (unlisted === undefined) return undefined;
  return `"${unlisted}" is not in your tag list. Add it to your vocabulary first.`;
}
