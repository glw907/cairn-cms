// The shipped guidance carries one recipe table in three files, and one exemplar of the kit quotes
// the /admin/theme-kit fixture route. This test reads the source copies under `skills/` and
// `claude/` (never the template's baked copies, which check:template binds to them) and holds three
// things together: the one-sentence model and the table rows in every copy against the RECIPE_MODEL
// and ROLE_RECIPES data below, each `svelte` fence of the exemplar against the fixture route, and
// every Write token against the admin sheet inventory or the fixture source.
//
// It collects every mismatch before it fails, so a change that breaks two copies reports both. It
// also refuses to pass on nothing: a copy without the `Write this, get this` heading, with an
// empty table, or with a malformed row fails naming the file (and the row), and an exemplar that
// no longer holds each of the seven kit topics fails naming the missing one.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

/** One recipe row the guidance prints: the classes to write and what they give. */
interface RoleRecipe {
  write: string;
  look: string;
}

/**
 * The one-sentence model every shipped guidance copy quotes verbatim: a screen writes the plain
 * class, and the theme layer, never the markup, carries the ratified look.
 */
const RECIPE_MODEL =
  'Write the plain daisyUI or cairn role class a screen needs; the theme layer, not the markup, carries the ratified look.';

// Every Write string here is copied verbatim from .claude/skills/cairn-following-admin-design/references/admin-design-system.md or from the
// /admin/theme-kit fixture route, never invented: the attestation test below checks every token
// against the committed admin sheet inventory or the fixture's source, so a hand-typed row cannot
// drift from what actually compiles.
const ROLE_RECIPES: readonly RoleRecipe[] = [
  {
    write: 'type-title font-[550] font-[family-name:var(--font-display)]',
    look: 'the page heading, 24px at weight 550, no bold, in the display face.',
  },
  {
    write: 'type-label font-semibold uppercase tracking-[0.08em] text-muted',
    look: 'an eyebrow: quiet, uppercase, tracked out.',
  },
  {
    write: 'font-medium text-subtle',
    look: 'a resting sidebar item; CairnAdminShell renders the nav itself, no screen writes one directly.',
  },
  {
    write: 'btn btn-primary',
    look: 'the one accent-filled commit action on a surface.',
  },
  {
    write: 'btn btn-ghost',
    look: 'a quiet button for chrome actions, toolbar controls, and row affordances.',
  },
  {
    write: 'input',
    look: 'a single-line text field.',
  },
  {
    write: 'select',
    look: 'a native select control.',
  },
  {
    write: 'card-shell card-shadow',
    look: 'a floating card surface: the box radius, a hairline edge, and elevation.',
  },
  {
    write: 'btn',
    look: 'the plain button: a hairline edge, no fill accent.',
  },
  {
    write: 'btn btn-neutral',
    look: 'the ink opener: a solid neutral fill, the first commit-adjacent step up from plain.',
  },
  {
    write: 'btn btn-soft btn-primary',
    look: 'the soft primary: a tinted act-on state, softer than the solid commit.',
  },
  {
    write: 'join-item btn btn-active',
    look: 'the selected segment in a join or segmented control: a neutral wash plus a state hairline.',
  },
  {
    write: 'rounded-selector',
    look: 'the corner for a chip, tag, count, or other small inline marker.',
  },
  {
    write: 'rounded-field',
    look: 'the corner for a control, button-like element, or small thumbnail.',
  },
  {
    write: 'rounded-box',
    look: 'the corner for a panel, card, tile, popover, sheet, or the brand tile.',
  },
];

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const HEADING = '## Write this, get this';

const GUIDANCE_FILES = [
  'skills/cairn-building-admin-screens/SKILL.md',
  'skills/cairn-extending-a-site/references/daisyui-first.md',
  'claude/agents/cairn-extension-reviewer.md',
];

const EXEMPLAR = 'skills/cairn-building-admin-screens/references/exemplar-kit.md';
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

  // The typo check: a hand-typed class in a Write string can drift from what the sheet actually
  // compiles or the fixture actually renders. Every token has to be attested by one of the two
  // sources a recipe row is allowed to come from, so a misspelled class fails here rather than
  // shipping silently into the guidance the table feeds.
  it('attests every Write token against the admin sheet inventory or the theme-kit fixture source', () => {
    const inventory = new Set(
      readFileSync(new URL('./fixtures/admin-sheet-inventory.txt', import.meta.url), 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    );
    const fixtureSource = read(FIXTURE);
    for (const recipe of ROLE_RECIPES) {
      for (const token of recipe.write.split(/\s+/)) {
        const attested = inventory.has(token) || fixtureSource.includes(token);
        expect(
          attested,
          `"${token}" in the Write string "${recipe.write}" is not in the admin sheet inventory or the theme-kit fixture`
        ).toBe(true);
      }
    }
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
});
