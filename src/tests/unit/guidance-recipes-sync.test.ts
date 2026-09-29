// The shipped guidance carries one recipe table in three files, and one exemplar of the kit quotes
// the /admin/theme-kit fixture route. This test reads the source copies under `skills/` and
// `claude/` (never the template's baked copies, which check:template binds to them) and holds four
// things together: the one-sentence model and the table rows in every copy against
// RECIPE_MODEL and ROLE_RECIPES, each `svelte` fence of the exemplar against the fixture route,
// and exactly one recipe row per ratified role.
//
// It collects every mismatch before it fails, so a change that breaks two copies reports both. It
// also refuses to pass on nothing: a copy without the `Write this, get this` heading, with an
// empty table, or with a malformed row fails naming the file (and the row), and an exemplar that
// no longer holds each of the seven kit topics fails naming the missing one.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { RATIFIED_NORMS, RECIPE_MODEL, ROLE_RECIPES } from '../../lib/audit/norms.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const HEADING = '## Write this, get this';

const GUIDANCE_FILES = [
  'skills/cairn-admin-screens/SKILL.md',
  'skills/cairn-extend/references/daisyui-first.md',
  'claude/agents/cairn-extension-reviewer.md',
];

const EXEMPLAR = 'skills/cairn-admin-screens/references/exemplar-kit.md';
const FIXTURE = 'examples/showcase/src/routes/admin/theme-kit/+page.svelte';

// One marker per kit topic the exemplar must keep excerpting. A marker is a class attribute a
// fence holds only when it shows that topic, so deleting a section, or emptying the exemplar,
// cannot leave the fence comparison passing over nothing.
const KIT_TOPICS: readonly { topic: string; marker: RegExp }[] = [
  { topic: 'buttons', marker: /class="btn btn-primary"/ },
  { topic: 'joins', marker: /class="join"/ },
  { topic: 'alerts', marker: /class="alert/ },
  { topic: 'controls', marker: /class="toggle/ },
  { topic: 'a chip', marker: /class="badge"/ },
  { topic: 'a field', marker: /<label[^>]*>\s*<span[^>]*>[^<]*<\/span>\s*<input class="input"/ },
  { topic: 'a card', marker: /class="card-shell/ },
];

function read(path: string): string {
  return readFileSync(resolve(ROOT, path), 'utf8');
}

/** The table row the guidance prints for one recipe. */
function rowFor(recipe: { write: string; look: string }): string {
  return `| \`${recipe.write}\` | ${recipe.look} |`;
}

/**
 * Checks one guidance copy: the heading, the model sentence, and the table against the recipes.
 * Returns one message per problem, each naming the file.
 */
function checkCopy(file: string, text: string, expectedRows: readonly string[]): string[] {
  const problems: string[] = [];
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.trim() === HEADING);
  if (start === -1) {
    return [`${file}: missing the "${HEADING}" heading`];
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  const section = end === -1 ? rest : rest.slice(0, end);

  if (!section.some((line) => line === RECIPE_MODEL)) {
    problems.push(`${file}: the section under "${HEADING}" does not carry the model sentence: ${RECIPE_MODEL}`);
  }

  const tableLines = section.filter((line) => line.startsWith('|'));
  const dataLines = tableLines.filter(
    (line) => line !== '| Write | Get |' && !/^\|[-| ]+\|$/.test(line)
  );
  if (dataLines.length === 0) {
    problems.push(`${file}: the "${HEADING}" table has no rows`);
    return problems;
  }

  const rows: string[] = [];
  for (const line of dataLines) {
    if (!/^\| `[^`]+` \| .+ \|$/.test(line)) {
      problems.push(`${file}: malformed table row: ${line}`);
    } else {
      rows.push(line);
    }
  }

  for (const expected of expectedRows) {
    const found = rows.filter((row) => row === expected).length;
    if (found === 0) problems.push(`${file}: missing table row: ${expected}`);
    if (found > 1) problems.push(`${file}: table row appears ${found} times: ${expected}`);
  }
  for (const row of rows) {
    if (!expectedRows.includes(row)) {
      problems.push(`${file}: table row is not in ROLE_RECIPES: ${row}`);
    }
  }
  return problems;
}

/**
 * Reduces markup to what guidance and fixture must share: test hooks and HTML comments are
 * fixture notes, not guidance, and Prettier's wrapping (`</button\n>`) and the space left before
 * `>` or `/>` once a `data-testid` is removed carry no meaning.
 */
function normalizeMarkup(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+data-testid="[^"]*"/g, '')
    .replace(/\s+/g, ' ')
    .replace(/ ?(\/?)>/g, '$1>')
    .trim();
}

/** The `svelte` fences of a Markdown file, each with the line its opening fence sits on. */
function svelteFences(text: string): { body: string; line: number }[] {
  const fences: { body: string; line: number }[] = [];
  const pattern = /^```svelte\n([\s\S]*?)^```/gm;
  for (const match of text.matchAll(pattern)) {
    const line = text.slice(0, match.index).split('\n').length;
    fences.push({ body: match[1] ?? '', line });
  }
  return fences;
}

/** Checks the exemplar's fences against the fixture source and the seven kit topics. */
function checkExemplar(file: string, text: string, fixture: string): string[] {
  const problems: string[] = [];
  const fences = svelteFences(text);
  if (fences.length === 0) {
    return [`${file}: holds no svelte fences`];
  }
  const fixtureNormalized = normalizeMarkup(fixture);
  for (const fence of fences) {
    if (!fixtureNormalized.includes(normalizeMarkup(fence.body))) {
      const first = fence.body.split('\n').find((line) => line.trim() !== '') ?? '';
      problems.push(
        `${file}: the svelte fence at line ${fence.line} (opening: ${first.trim()}) is not in ${FIXTURE}`
      );
    }
  }
  const joined = fences.map((fence) => fence.body).join('\n');
  for (const { topic, marker } of KIT_TOPICS) {
    if (!marker.test(joined)) problems.push(`${file}: no fence excerpts ${topic}`);
  }
  return problems;
}

/** Checks that each ratified role has exactly one recipe row. */
function checkRoleRows(
  roles: readonly string[],
  recipes: readonly { role?: string }[]
): string[] {
  const problems: string[] = [];
  for (const role of roles) {
    const count = recipes.filter((recipe) => recipe.role === role).length;
    if (count !== 1) {
      problems.push(`ROLE_RECIPES: ratified role ${role} has ${count} recipe rows, expected exactly one`);
    }
  }
  return problems;
}

describe('guidance recipe sync', () => {
  const expectedRows = ROLE_RECIPES.map(rowFor);

  it('holds the model sentence and every table row in all three guidance copies', () => {
    const problems = GUIDANCE_FILES.flatMap((file) => checkCopy(file, read(file), expectedRows));
    expect(problems, problems.join('\n')).toEqual([]);
  });

  it("holds each of the exemplar's svelte fences in the fixture route", () => {
    const problems = checkExemplar(EXEMPLAR, read(EXEMPLAR), read(FIXTURE));
    expect(problems, problems.join('\n')).toEqual([]);
  });

  it('has exactly one recipe row for every ratified role', () => {
    const roles = [...new Set(RATIFIED_NORMS.map((norm) => norm.role))];
    expect(roles.length).toBeGreaterThan(0);
    const problems = checkRoleRows(roles, ROLE_RECIPES);
    expect(problems, problems.join('\n')).toEqual([]);
  });
});

describe('guidance recipe sync checks refuse to go vacuous', () => {
  const rows = ROLE_RECIPES.map(rowFor);
  const good = [HEADING, '', RECIPE_MODEL, '', '| Write | Get |', '|---|---|', ...rows, ''].join('\n');

  it('passes a well-formed copy', () => {
    expect(checkCopy('copy.md', good, rows)).toEqual([]);
  });

  it('fails a copy without the heading, naming the file and heading', () => {
    const problems = checkCopy('copy.md', good.replace(HEADING, '## Something else'), rows);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('copy.md');
    expect(problems[0]).toContain(HEADING);
  });

  it('fails an empty table, naming the file', () => {
    const empty = [HEADING, '', RECIPE_MODEL, '', '| Write | Get |', '|---|---|', ''].join('\n');
    const problems = checkCopy('copy.md', empty, rows);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('copy.md');
    expect(problems[0]).toContain('no rows');
  });

  it('fails a malformed row, naming the file and the row', () => {
    const problems = checkCopy('copy.md', `${good}| not a recipe row |\n`, rows);
    expect(problems).toEqual(['copy.md: malformed table row: | not a recipe row |']);
  });

  it('reports a missing row and an edited row together', () => {
    const [first, second] = rows;
    const edited = good.replace(first as string, (first as string).replace(/ \|$/, ' edited |')).replace(second as string, '');
    const problems = checkCopy('copy.md', edited, rows);
    expect(problems.some((p) => p.includes('missing table row') && p.includes(first as string))).toBe(true);
    expect(problems.some((p) => p.includes('missing table row') && p.includes(second as string))).toBe(true);
    expect(problems.some((p) => p.includes('not in ROLE_RECIPES'))).toBe(true);
  });

  it('fails a copy that lacks the model sentence, naming the file', () => {
    const problems = checkCopy('copy.md', good.replace(RECIPE_MODEL, 'Write something.'), rows);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('model sentence');
  });

  it('fails an exemplar with no fences, and one missing a kit topic', () => {
    expect(checkExemplar('ex.md', 'no fences', '<div></div>')).toEqual(['ex.md: holds no svelte fences']);
    const oneFence = '```svelte\n<div class="join"></div>\n```\n';
    const problems = checkExemplar('ex.md', oneFence, '<div class="join"></div>');
    expect(problems.some((p) => p.includes('no fence excerpts buttons'))).toBe(true);
    expect(problems.some((p) => p.includes('no fence excerpts a card'))).toBe(true);
  });

  it('normalizes a removed data-testid, a comment, and Prettier wrapping to the same markup', () => {
    const fixture = '<button class="btn" data-testid="x">Go</button\n><!-- note -->\n<input class="a" data-testid="y" />';
    const fence = '<button class="btn">Go</button>\n<input class="a"/>';
    expect(normalizeMarkup(fixture)).toBe(normalizeMarkup(fence));
  });

  it('fails a role with no recipe row and a role with two', () => {
    const problems = checkRoleRows(['a', 'b'], [{ role: 'b' }, { role: 'b' }]);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('role a has 0');
    expect(problems[1]).toContain('role b has 2');
  });
});
