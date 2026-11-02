import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../../../../lib/audit/config.js';
import { parseSheet } from '../../../../lib/audit/sheet.js';
import { publicRoutePrerender } from '../../../../lib/audit/rules/static/public-route-prerender.js';
import type { SourceFile } from '../../../../lib/audit/types.js';

const SHEET = parseSheet('');
const CONFIG = resolveConfig('/site', null, () => true);

function check(...sources: SourceFile[]) {
  return publicRoutePrerender.check({ files: [], sheet: SHEET, config: CONFIG, sources });
}

const PAGE: SourceFile = { file: 'src/routes/(site)/about/+page.svelte', source: '<h1>About</h1>\n' };

describe('public-route-prerender', () => {
  it('passes a page whose own +page.ts declares prerender', () => {
    const page: SourceFile = { file: 'src/routes/about/+page.svelte', source: '<h1>About</h1>\n' };
    const decl: SourceFile = { file: 'src/routes/about/+page.ts', source: 'export const prerender = true;\n' };
    expect(check(page, decl)).toEqual([]);
  });

  it('passes a page covered by a group layout above it', () => {
    const layout: SourceFile = {
      file: 'src/routes/(site)/+layout.ts',
      source: "import x from 'y';\nexport const prerender = true;\n",
    };
    expect(check(PAGE, layout)).toEqual([]);
  });

  it('passes a page covered by a server layout two levels up', () => {
    const page: SourceFile = { file: 'src/routes/(site)/blog/post/+page.svelte', source: '<h1>x</h1>\n' };
    const layout: SourceFile = { file: 'src/routes/(site)/+layout.server.ts', source: 'export const prerender = true;\n' };
    expect(check(page, layout)).toEqual([]);
  });

  it('does not count a declaration in a sibling directory', () => {
    const sibling: SourceFile = { file: 'src/routes/(site)/other/+page.ts', source: 'export const prerender = true;\n' };
    expect(check(PAGE, sibling)).toHaveLength(1);
  });

  it('passes prerender = false, the developer choosing request-time rendering', () => {
    const decl: SourceFile = { file: 'src/routes/(site)/about/+page.server.ts', source: 'export const prerender = false;\n' };
    expect(check(PAGE, decl)).toEqual([]);
  });

  it('flags a page no declaration reaches, once, at advisory tier', () => {
    const sibling: SourceFile = { file: 'src/routes/other/+layout.ts', source: 'export const prerender = true;\n' };
    const findings = check(PAGE, sibling);
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('public-route-prerender');
    expect(findings[0].tier).toBe('advisory');
    expect(findings[0].file).toBe(PAGE.file);
    expect(findings[0].message).toContain('export const prerender = true');
  });

  it('anchors on the first node past a leading comment', () => {
    const page: SourceFile = {
      file: 'src/routes/probe/+page.svelte',
      source: '<!-- @component\n  a note -->\n<h1>Hi</h1>\n',
    };
    const [finding] = check(page);
    expect(finding.line).toBe(3);
    expect(page.source.slice(finding.start)).toMatch(/^<h1>/);
  });

  it('never reads src/routes/admin', () => {
    const page: SourceFile = { file: 'src/routes/admin/thing/+page.svelte', source: '<h1>x</h1>\n' };
    expect(check(page)).toEqual([]);
  });

  it('reads a named-layout page and is advisory, so a run does not gate', () => {
    const page: SourceFile = { file: 'src/routes/blog/+page@.svelte', source: '<h1>x</h1>\n' };
    const findings = check(page);
    expect(findings).toHaveLength(1);
    expect(findings.every((finding) => finding.tier === 'advisory')).toBe(true);
  });
});
