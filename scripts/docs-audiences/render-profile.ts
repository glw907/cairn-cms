#!/usr/bin/env -S npx tsx
/**
 * Prints an audience profile's rendered `profile` string: the plain-text block the docs drafter
 * chain embeds in its prompt (spec 2026-09-25-docs-reset-pass-2a-design.md, section 4, 4a). Reads
 * one profile markdown file's frontmatter, validates it against
 * docs/internal/audiences/profile.schema.json, then writes the rendered text to stdout in the
 * schema's own property order.
 *
 * Usage:
 *   npx tsx scripts/docs-audiences/render-profile.ts PROFILE_MD
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { validateAgainstSchema, type JsonSchema } from './lib/profile-schema.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const SCHEMA_PATH = resolve(REPO_ROOT, 'docs/internal/audiences/profile.schema.json');

/** The two keys the rendered profile names on its first line, never as their own block. */
const FIRST_LINE_KEYS = new Set(['id', 'persona']);

/** `arrivalStates` to `Arrival states`: a camelCase key split at its case boundary and title-cased. */
function labelFor(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/**
 * Render one schema-declared value as its `Key:` label line, plus hyphen-bullet lines for a list
 * or nested labeled lines for an object (`vocabulary`'s `use`/`avoid`), recursing through
 * `schema`'s own property order. A scalar's value sits on the label line itself.
 */
function renderValue(key: string, value: unknown, schema: JsonSchema, indent: string): string[] {
  const label = `${indent}${labelFor(key)}:`;
  if (Array.isArray(value)) {
    return [label, ...value.map((item) => `${indent}- ${String(item)}`)];
  }
  if (value !== null && typeof value === 'object' && schema.properties) {
    const nested = value as Record<string, unknown>;
    const lines = [label];
    for (const [subKey, subSchema] of Object.entries(schema.properties)) {
      if (subKey in nested) lines.push(...renderValue(subKey, nested[subKey], subSchema, `${indent}  `));
    }
    return lines;
  }
  return [`${label} ${String(value)}`];
}

/**
 * Render `data` (a profile's parsed frontmatter) as the chain's plain-text `profile` string, per
 * `schema`'s declared property order. `id` and `persona` name the first line; every other present
 * schema key becomes its own block, one blank line apart. A schema key absent from `data` (only
 * `provisionalReason` when the profile is not provisional) is skipped rather than rendered empty.
 */
export function renderProfile(data: Record<string, unknown>, schema: JsonSchema): string {
  const lines: string[] = [`${String(data.id)}: ${String(data.persona)}`];
  for (const [key, keySchema] of Object.entries(schema.properties ?? {})) {
    if (FIRST_LINE_KEYS.has(key) || !(key in data)) continue;
    lines.push('', ...renderValue(key, data[key], keySchema, ''));
  }
  return lines.join('\n');
}

/**
 * The command-line entry point: reads the named profile file, validates it against the schema,
 * and writes the rendered profile string to stdout.
 * @param args - The arguments after the script name.
 * @returns The process exit code.
 */
function main(args: string[]): number {
  const [profilePath] = args;
  if (!profilePath) {
    process.stderr.write('usage: npx tsx scripts/docs-audiences/render-profile.ts PROFILE_MD\n');
    return 2;
  }
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as JsonSchema;
  const { data } = matter(readFileSync(resolve(profilePath), 'utf8'));
  const errors = validateAgainstSchema(data, schema);
  if (errors.length > 0) {
    process.stderr.write(`${profilePath} fails its schema:\n${errors.map((e) => `  ${e}`).join('\n')}\n`);
    return 1;
  }
  process.stdout.write(`${renderProfile(data, schema)}\n`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
