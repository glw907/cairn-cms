// cairn-cms: pins the public stylesheet's surface. The key set and the rule list are snapshotted, so
// a rename or a removal fails until the snapshot update discloses it, and every key must have a
// reader, so an entry nothing reads cannot sit in the stylesheet unnoticed. The stylesheet is parsed
// through the audit's own `parseSheet`, the one parser every reader of authored CSS shares.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseSheet } from '../../lib/audit/sheet.js';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const PUBLIC_CSS = join(ROOT, 'src/lib/public/cairn-public.css');

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

  it('gives every key a reader in the engine or the template source', () => {
    const sources = readerSources();
    const readerless = [...ROLES, ...THEME_COLORS].filter((key) => !hasReader(key, sources));
    expect(readerless).toEqual([]);
  });
});
