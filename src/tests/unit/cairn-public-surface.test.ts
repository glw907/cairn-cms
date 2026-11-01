// cairn-cms: pins the public stylesheet's surface. The key set and the rule list are snapshotted, so
// a rename or a removal fails until the snapshot update discloses it, and every key must have a
// reader, so an entry nothing reads cannot sit in the stylesheet unnoticed. The stylesheet is parsed
// through the audit's own `parseSheet`, the one parser every reader of authored CSS shares. The
// emitted-class registry in the packaged styling skill is held to the same file.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseSheet } from '../../lib/audit/sheet.js';
import { EMITTED_REGISTRY_PAGE, parseEmittedRegistry } from '../../../scripts/checks/check-public-skill.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const PUBLIC_CSS = join(ROOT, 'src/lib/public/cairn-public.css');
const REGISTRY_PAGE = join(ROOT, EMITTED_REGISTRY_PAGE);

/**
 * Where a key's reader may live: the engine, and the site source the engine's own template is
 * built from (its chassis, theme chrome, and routes).
 */
const READER_ROOTS = ['src/lib', 'examples/showcase/src'];

const READER_EXTENSIONS = /\.(css|svelte|ts|js|mjs)$/;

const sheet = parseSheet(readFileSync(PUBLIC_CSS, 'utf8'));

/** A selector with its whitespace collapsed, so a wrapped selector list reads as one line. */
function normalized(selector: string): string {
  return selector.replace(/\s+/g, ' ').trim();
}

/** The custom properties a rule declares, in source order. */
function customProperties(selector: string): string[] {
  return sheet.rules
    .filter((rule) => normalized(rule.selector) === selector)
    .flatMap((rule) => rule.declarations.map((declaration) => declaration.property))
    .filter((property) => property.startsWith('--'));
}

/** Every reader-eligible source file's text under the reader roots. */
function readerSources(): string[] {
  return READER_ROOTS.flatMap((root) =>
    readdirSync(join(ROOT, root), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && READER_EXTENSIONS.test(entry.name))
      .filter((entry) => !/node_modules|\.svelte-kit/.test(entry.parentPath))
      .map((entry) => readFileSync(join(entry.parentPath, entry.name), 'utf8')),
  );
}

/** Whether the key's name appears in a position that reads it rather than declares it. */
function hasReader(key: string, sources: string[]): boolean {
  const reading = new RegExp(`${key}(?![A-Za-z0-9-])(?!\\s*:)`);
  return sources.some((source) => reading.test(source));
}

/** The value a rule declares for one custom property. */
function declaredValue(selector: string, property: string): string | undefined {
  return sheet.rules
    .filter((rule) => normalized(selector) === normalized(rule.selector))
    .flatMap((rule) => rule.declarations)
    .find((declaration) => declaration.property === property)?.value;
}

/**
 * The share of its fill each status ink keeps, as the derivation record measured it. A change to a
 * share is a change to every consumer's default ink, so it fails here until the record and this
 * table move together.
 */
const INK_SHARES = { success: 50, warning: 50, error: 50, info: 50 };

/**
 * The share of the body ink the muted default keeps over `base-100`, as the derivation record
 * chose it. It moves with the record the same way the ink shares do.
 */
const MUTED_SHARE = 80;

const ROLES = customProperties(':root, [data-theme]');
const THEME_COLORS = customProperties('@theme');

describe('the public stylesheet surface', () => {
  it('pins the key set and the rule list', () => {
    expect({
      roles: [...ROLES].sort(),
      themeColors: [...THEME_COLORS].sort(),
      rules: sheet.rules.map((rule) => ({
        selector: normalized(rule.selector),
        conditions: rule.conditions,
      })),
    }).toMatchInlineSnapshot(`
      {
        "roles": [
          "--cairn-code-bg",
          "--cairn-code-border",
          "--cairn-code-comment",
          "--cairn-code-function",
          "--cairn-code-ink",
          "--cairn-code-keyword",
          "--cairn-code-number",
          "--cairn-code-punct",
          "--cairn-code-string",
          "--cairn-error-ink",
          "--cairn-focus-ring-offset",
          "--cairn-focus-ring-outline",
          "--cairn-focus-ring-radius",
          "--cairn-info-ink",
          "--cairn-shadow",
          "--cairn-success-ink",
          "--cairn-warning-ink",
          "--flow-space",
        ],
        "rules": [
          {
            "conditions": [
              "@layer theme",
            ],
            "selector": ":root, [data-theme]",
          },
          {
            "conditions": [],
            "selector": "@theme",
          },
          {
            "conditions": [
              "@layer components",
            ],
            "selector": "pre.shiki",
          },
          {
            "conditions": [
              "@layer components",
            ],
            "selector": ".cairn-tok-keyword",
          },
          {
            "conditions": [
              "@layer components",
            ],
            "selector": ".cairn-tok-string",
          },
          {
            "conditions": [
              "@layer components",
            ],
            "selector": ".cairn-tok-comment",
          },
          {
            "conditions": [
              "@layer components",
            ],
            "selector": ".cairn-tok-function",
          },
          {
            "conditions": [
              "@layer components",
            ],
            "selector": ".cairn-tok-number",
          },
          {
            "conditions": [
              "@layer components",
            ],
            "selector": ".cairn-tok-punct",
          },
          {
            "conditions": [
              "@layer components",
            ],
            "selector": ".table-scroll",
          },
          {
            "conditions": [
              "@layer components",
            ],
            "selector": ".cairn-focus-ring:focus-visible",
          },
        ],
        "themeColors": [
          "--color-card-border",
          "--color-muted",
        ],
      }
    `);
  });

  it.each(Object.entries(INK_SHARES))(
    'derives the %s ink from its fill at the recorded share',
    (status, share) => {
      expect(declaredValue(':root, [data-theme]', `--cairn-${status}-ink`)).toBe(
        `color-mix(in oklab, var(--color-${status}) ${share}%, var(--color-base-content))`,
      );
    },
  );

  it('derives the muted color from the body ink at the recorded share', () => {
    expect(declaredValue('@theme', '--color-muted')).toBe(
      `color-mix(in oklab, var(--color-base-content) ${MUTED_SHARE}%, var(--color-base-100))`,
    );
  });

  // The role layer sits after Tailwind's `@theme` output at equal specificity, so a declaration of
  // either color there would silently beat a theme's own `@theme` override of it.
  it.each(['--color-muted', '--color-card-border'])(
    'declares %s in @theme only, never in the role layer',
    (key) => {
      expect(customProperties('@theme')).toContain(key);
      expect(ROLES).not.toContain(key);
    },
  );

  it('gives every key a reader in the engine or the template source', () => {
    const sources = readerSources();
    const readerless = [...ROLES, ...THEME_COLORS].filter((key) => !hasReader(key, sources));
    expect(readerless).toEqual([]);
  });
});

/** The classes the sheet styles that the engine never writes into markup. */
const STYLED_BUT_NOT_EMITTED = new Set(['cairn-focus-ring']);

describe('the emitted-class registry', () => {
  const page = readFileSync(REGISTRY_PAGE, 'utf8');
  // The parser keeps bare class names only, so the element-qualified `pre.shiki` row is read here.
  const entries = [...parseEmittedRegistry(page), ...(page.includes('| `pre.shiki` |') ? ['pre.shiki'] : [])];

  /** The classes the sheet's component-layer selectors style. */
  const styled = [
    ...new Set(
      sheet.rules
        .filter((rule) => rule.conditions.includes('@layer components'))
        .flatMap((rule) => [...normalized(rule.selector).matchAll(/\.([A-Za-z_][\w-]*)/g)])
        .map((match) => match[1]),
    ),
  ];

  /** Whether an entry names the class, exactly, by element-qualified form, or by prefix wildcard. */
  function registered(className: string): boolean {
    return entries.some((entry) => {
      const bare = entry.replace(/^[a-z]+\./, '');
      return (
        entry === className ||
        bare === className ||
        (entry.endsWith('*') && className.startsWith(entry.slice(0, -1)))
      );
    });
  }

  it('finds the classes the sheet styles', () => {
    expect(styled.length).toBeGreaterThan(0);
  });

  it('names every emitted class the sheet styles', () => {
    const missing = styled
      .filter((className) => !STYLED_BUT_NOT_EMITTED.has(className))
      .filter((className) => !registered(className));
    expect(missing).toEqual([]);
  });
});
