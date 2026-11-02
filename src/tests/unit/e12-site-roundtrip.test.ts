import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { parseMarkdown, serializeMarkdown } from '../../lib/content/frontmatter.js';

/** One way the wrapper disagrees with `gray-matter` on a source. */
interface Difference {
  kind: 'date' | 'other' | 'both-threw';
  key: string;
  detail: string;
  /** Set on a date difference whose value carries more than a day. */
  timeOfDay?: boolean;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);

/** Walk two parsed values, collecting each key where they differ. */
function compareValue(old: unknown, next: unknown, key: string, out: Difference[]): void {
  if (old instanceof Date && typeof next === 'string') {
    const iso = old.toISOString();
    const timeOfDay = !iso.endsWith('T00:00:00.000Z') || !/^\d{4}-\d{2}-\d{2}$/.test(next);
    out.push({ kind: 'date', key, detail: `${iso} became ${JSON.stringify(next)}`, timeOfDay });
    return;
  }
  if (Array.isArray(old) && Array.isArray(next) && old.length === next.length) {
    old.forEach((item, i) => compareValue(item, next[i], `${key}[${i}]`, out));
    return;
  }
  if (isRecord(old) && isRecord(next)) {
    for (const k of new Set([...Object.keys(old), ...Object.keys(next)])) {
      if (!(k in old) || !(k in next)) {
        out.push({ kind: 'other', key: `${key}.${k}`, detail: 'present on one side only' });
      } else compareValue(old[k], next[k], `${key}.${k}`, out);
    }
    return;
  }
  if (!Object.is(old, next)) {
    out.push({ kind: 'other', key, detail: `${JSON.stringify(old)} became ${JSON.stringify(next)}` });
  }
}

/** Compare the wrapper against `gray-matter` on one source, then the wrapper against a save and reread. */
function compareFile(source: string): Difference[] {
  const attempt = <T>(read: () => T): { value: T } | { error: string } => {
    try {
      return { value: read() };
    } catch (e) {
      return { error: String(e) };
    }
  };
  const old = attempt(() => matter(source, {}));
  const next = attempt(() => parseMarkdown(source));
  if ('error' in old && 'error' in next) {
    return [{ kind: 'both-threw', key: '(file)', detail: `${old.error} | ${next.error}` }];
  }
  if ('error' in old || 'error' in next) {
    const detail = 'error' in old ? `gray-matter threw ${old.error}` : `wrapper threw ${'error' in next ? next.error : ''}`;
    return [{ kind: 'other', key: '(file)', detail }];
  }

  const out: Difference[] = [];
  const { frontmatter, body } = next.value;
  compareValue(old.value.data, frontmatter, 'frontmatter', out);
  if (old.value.content !== body) out.push({ kind: 'other', key: '(body)', detail: 'body differs' });

  const trip = attempt(() => parseMarkdown(serializeMarkdown(frontmatter, body)));
  if ('error' in trip) return [...out, { kind: 'other', key: '(round trip)', detail: trip.error }];
  const tripped: Difference[] = [];
  compareValue(frontmatter, trip.value.frontmatter, 'round trip', tripped);
  // Any change a save makes to a value counts as a stop, a date included.
  out.push(...tripped.map((d) => ({ ...d, kind: 'other' as const })));
  const added = body.endsWith('\n') ? body : `${body}\n`;
  if (trip.value.body !== added) {
    out.push({ kind: 'other', key: '(round trip body)', detail: 'body changed by more than one newline' });
  }
  return out;
}

describe('compareFile', () => {
  it('reports a value the two parsers read differently as a non-date difference', () => {
    const diffs = compareFile('---\na: 10:30\n---\n');
    expect(diffs.map((d) => [d.kind, d.key])).toEqual([['other', 'frontmatter.a']]);
  });

  it('reports a bare date alone as a date difference', () => {
    const diffs = compareFile('---\na: 2024-01-01\n---\n');
    expect(diffs.map((d) => [d.kind, d.key, d.timeOfDay])).toEqual([['date', 'frontmatter.a', false]]);
  });
});

const roots = ['ecxc-ski', '907-life', 'aksailingclub-org', 'cairn-pub'].map((name) =>
  join(homedir(), 'Projects', name),
);
const skipped = new Set(['node_modules', '.git', '.svelte-kit', '.claude', 'build', 'dist', '.wrangler']);

function markdownFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return skipped.has(entry.name) ? [] : markdownFiles(path);
    return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
  });
}

describe.skipIf(roots.some((root) => !existsSync(root)))('every site file', () => {
  it('reads the same through the wrapper as through gray-matter, apart from dates', () => {
    const total = { files: 0, withFrontmatter: 0, dateFiles: 0, dateValues: 0, timeOfDay: 0, bothThrew: 0 };
    const failures: string[] = [];
    const notes: string[] = [];

    for (const root of roots) {
      const counts = { files: 0, withFrontmatter: 0, dateFiles: 0, dateValues: 0, timeOfDay: 0, bothThrew: 0 };
      for (const path of markdownFiles(root)) {
        const source = readFileSync(path, 'utf8');
        const diffs = compareFile(source);
        const name = relative(join(homedir(), 'Projects'), path);
        counts.files += 1;
        if (diffs.some((d) => d.kind === 'both-threw')) {
          counts.bothThrew += 1;
          notes.push(`both threw: ${name}`);
          continue;
        }
        const read = (() => {
          try {
            return parseMarkdown(source).frontmatter;
          } catch {
            return {};
          }
        })();
        if (Object.keys(read).length > 0) counts.withFrontmatter += 1;
        const dates = diffs.filter((d) => d.kind === 'date');
        if (dates.length > 0) counts.dateFiles += 1;
        counts.dateValues += dates.length;
        for (const d of dates) {
          if (!d.timeOfDay) continue;
          counts.timeOfDay += 1;
          notes.push(`time of day: ${name} ${d.key} ${d.detail}`);
        }
        for (const d of diffs) {
          if (d.kind === 'other') failures.push(`${name} ${d.key}: ${d.detail}`);
        }
      }
      console.log(`${relative(homedir(), root)}: ${JSON.stringify(counts)}`);
      for (const k of Object.keys(total) as (keyof typeof total)[]) total[k] += counts[k];
      expect(counts.withFrontmatter, root).toBeGreaterThan(0);
    }

    console.log(`total: ${JSON.stringify(total)}`);
    if (notes.length > 0) console.log(notes.join('\n'));
    expect(failures).toEqual([]);
  });
});
