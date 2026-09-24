/**
 * Enumerating the operator pages the harness covers: every `docs/admin/*.md` page whose own text
 * carries at least one runnable `cairn` procedure. The pattern is `docs/admin/*.md` itself, kept
 * tight by filtering through `extractProcedures` rather than a hand-maintained list, so a later
 * page that grows a `cairn` command block joins the harness the next time it runs, with no second
 * place to update.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractProcedures } from './extract.js';

/**
 * List the in-scope operator pages under one `docs/admin/` directory.
 * @param adminDir - The `docs/admin/` directory to scan.
 * @returns The in-scope pages' paths, relative to the docs root, sorted.
 */
export function listOperatorPages(adminDir: string): string[] {
  return readdirSync(adminDir)
    .filter((name) => name.endsWith('.md'))
    .filter((name) => extractProcedures(name, readFileSync(join(adminDir, name), 'utf8')).length > 0)
    .sort()
    .map((name) => `docs/admin/${name}`);
}
