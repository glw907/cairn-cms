import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  profileFor,
  scanText,
  parseMarker,
  docCommentLines,
  runLeakCheck,
  formatFindings,
} from '../../../scripts/checks/check-leaks.mjs';

const T1 = profileFor('docs/reference/sveltekit.md')!;
const T2 = profileFor('skills/cairn-extend/SKILL.md')!;
const T3 = profileFor('docs/internal/facts/extend.md')!;
const TSDOC = profileFor('src/lib/admin-toolkit/format.ts')!;
const CHANGELOG = profileFor('CHANGELOG.md')!;

/** The `[class, severity]` pairs a text yields, in order. */
function hits(text: string, profile = T1): string[] {
  return scanText(text, profile, 'x.md').map((finding) => `${finding.cls}:${finding.severity}`);
}

describe('profileFor', () => {
  it('puts published docs in T1 with all four classes', () => {
    for (const path of [
      'README.md',
      'docs/README.md',
      'docs/why-cairn.md',
      'examples/showcase/README.md',
      'docs/extend/migration-notes.md',
      'docs/editors/write.md',
      'docs/admin/run.md',
    ]) {
      expect(profileFor(path), path).toEqual({ tier: 'T1', classes: ['C1', 'C2', 'C3', 'C4'], mode: 'whole' });
    }
  });

  it('puts shipped files in T2 and agent inputs in T3 without process vocabulary', () => {
    for (const path of [
      'skills/cairn-admin-screens/references/exemplar-list.md',
      'claude/CLAUDE.md',
      'examples/showcase/src/chassis/README.md',
      'src/lib/reproductions/fixtures.ts',
      'tool/cmd/cairn/messages.go',
      'templates/waymark/wrangler.jsonc',
    ]) {
      expect(profileFor(path)?.tier, path).toBe('T2');
    }
    for (const path of [
      'docs/internal/briefs/extend/x.plan.md',
      'docs/internal/outlines/extend.json',
      'docs/internal/facts/extend.md',
      'docs/internal/docs-register.md',
    ]) {
      expect(profileFor(path), path).toEqual({ tier: 'T3', classes: ['C1', 'C2', 'C4'], mode: 'whole' });
    }
  });

  it('scans src/lib TypeScript and Svelte as doc comments for C1 and C2, and CHANGELOG by section', () => {
    expect(profileFor('src/lib/admin/Thing.svelte')).toEqual({ tier: 'T2', classes: ['C1', 'C2'], mode: 'tsdoc' });
    expect(CHANGELOG.mode).toBe('changelog');
  });

  it('takes only seed content, the synced .claude copies, and LICENSE out of a template', () => {
    expect(profileFor('templates/waymark/src/content/posts/a.md')).toBeNull();
    expect(profileFor('templates/waymark/.claude/skills/x/SKILL.md')).toBeNull();
    expect(profileFor('templates/waymark/LICENSE')).toBeNull();
    expect(profileFor('LICENSE')).toBeNull();
    expect(profileFor('templates/waymark/src/chassis/README.md')?.tier).toBe('T2');
  });

  it('does not scan paths outside every tier, vendored directories, or binaries', () => {
    expect(profileFor('docs/superpowers/plans/x.md')).toBeNull();
    expect(profileFor('docs/internal/record/x.md')).toBeNull();
    expect(profileFor('skills/node_modules/x/README.md')).toBeNull();
    expect(profileFor('templates/waymark/static/logo.png')).toBeNull();
  });
});

describe('C1 identity', () => {
  it('flags a consumer site slug in any form', () => {
    for (const text of ['cairn health ecxc-ski-a1b2c3', 'see 907.life', 'the 907-life repo', 'aksailingclub-org', 'xcathletes-org', 'cairn-pub renders']) {
      expect(hits(text), text).toContain('C1:error');
    }
  });

  it('matches ASC case-sensitively and as a whole word', () => {
    expect(hits("ASC's grammar")).toEqual(['C1:error']);
    expect(hits('ORDER BY name asc')).toEqual([]);
    expect(hits('BASCULE')).toEqual([]);
  });

  it("flags the maintainer's name and other repos in T1 and T2, but not in T3", () => {
    expect(hits('Geoff named it')).toEqual(['C1:error']);
    expect(hits('see glw907/907-life')).toContain('C1:error');
    expect(hits('Geoff named it', T2)).toEqual(['C1:error']);
    expect(hits('Geoff named it', T3)).toEqual([]);
    expect(hits('glw907/some-site', T3)).toEqual([]);
  });

  it('lets the engine repo and the docs host through', () => {
    expect(hits('https://github.com/glw907/cairn-cms/blob/main/README.md')).toEqual([]);
    expect(hits('https://cairn.pub/docs/reference')).toEqual([]);
  });

  it('still flags a site slug in T3', () => {
    expect(hits('observed on ecxc-ski', T3)).toEqual(['C1:error']);
  });
});

describe('C2 domain vocabulary', () => {
  it('flags the consumer domain words in every tier', () => {
    for (const word of ['households', 'Club', 'instructor', 'dues', 'athletes', 'boosters', 'coaches', 'regatta', 'moorings', 'sailing', 'skiing', 'Anchorage']) {
      for (const profile of [T1, T2, T3]) expect(hits(`a ${word} list`, profile), word).toEqual(['C2:error']);
    }
  });

  it('leaves the generic words alone', () => {
    expect(hits('class member roster team race trail season event signups')).toEqual([]);
  });
});

describe('C3 process', () => {
  it('flags rulings, dated attributions, fact ids, and pass jargon in T1 and T2', () => {
    for (const text of [
      'the owner ruling says',
      'a house ruling',
      '(Geoff, 2026-10-07)',
      'the owner, ratified 2026-07-05',
      'fact f:o4ur6y says',
      'the facts container',
      'the conductor decides',
      'at stage 2a',
    ]) {
      expect(hits(text).some((entry) => entry.startsWith('C3:')), text).toBe(true);
    }
    expect(hits('the facts container', T2)).toEqual(['C3:error']);
  });

  it('flags links and paths into maintainer docs and ledgers', () => {
    for (const text of [
      '[x](../internal/admin-design-system.md)',
      'see docs/internal/engine-rulings.md',
      '[x](../superpowers/research/a.md)',
      '[roadmap](../../ROADMAP.md)',
      'STATUS.md',
      '/var/home/someone/.config',
      '~/.dotfiles/x',
      '~/Projects/y',
    ]) {
      expect(hits(text), text).toContain('C3:error');
    }
  });

  it('lets an absolute GitHub link to a maintainer doc through', () => {
    expect(hits('[x](https://github.com/glw907/cairn-cms/blob/main/docs/internal/admin-design-system.md#motion)')).toEqual([]);
    expect(hits('[roadmap](https://github.com/glw907/cairn-cms/blob/main/ROADMAP.md)')).toEqual([]);
  });

  it('reports ratified prose as a warning, and skips it inside backticks', () => {
    expect(hits('the ratified recipe')).toEqual(['C3:warning']);
    expect(hits('the `ratified` provenance value')).toEqual([]);
  });

  it('is not checked in T3, where process vocabulary is expected', () => {
    expect(hits('Owner rulings (Geoff, 2026-10-07): see docs/internal/x.md and the facts container', T3)).toEqual([]);
  });

  it('is not checked in TSDoc, which is scanned for C1 and C2 only', () => {
    expect(hits('/** the owner ruling, see docs/internal/x.md */', TSDOC)).toEqual([]);
  });
});

describe('C4 personal data', () => {
  it('flags a real email address in every tier', () => {
    for (const profile of [T1, T2, T3]) expect(hits('write to jane@acme.io', profile)).toEqual(['C4:error']);
  });

  it('allows placeholder domains, subdomains of them, reserved suffixes, and no-reply senders', () => {
    for (const text of [
      'me@example.com',
      'cms@notes.example.com',
      'a@b.example.org',
      'x@host.test',
      'x@host.invalid',
      'x@thing.example',
      'noreply@github.com',
      'Backup@Site.com',
    ]) {
      expect(hits(text), text).toEqual([]);
    }
  });

  it('does not read a scoped package or a version pin as an email', () => {
    expect(hits('npm i @glw907/cairn-cms@1.2.3 and cairn-cms@1.2.3')).toEqual([]);
  });

  it('flags a UUID but allows a zero-padded placeholder', () => {
    expect(hits('db a47c56d2-25ef-4131-a505-8c9fd5a92f1f')).toEqual(['C4:error']);
    expect(hits('00000000-0000-0000-0000-000000000000')).toEqual([]);
    expect(hits('00000000-0000-0000-0000-000000000001')).toEqual([]);
  });

  it('flags a known account id by digest, without the gate file naming it', () => {
    expect(hits('account 120c269ad6d3dfbe6d63a0bb53758ca0')).toEqual(['C4:error']);
    expect(hits('account 120c269ad6d3dfbe6d63a0bb53758ca1')).toEqual([]);
    expect(hits('order 12345678')).toEqual([]);
  });
});

describe('severity by tier', () => {
  it('makes a hit an error in each of T1, T2, and T3', () => {
    for (const profile of [T1, T2, T3]) {
      expect(hits('ecxc-ski', profile)).toEqual(['C1:error']);
    }
  });

  it('scans only doc comments in src/lib', () => {
    const text = ['// ecxc here is a plain comment', 'const a = 1;', '/**', ' * A household list.', ' */', 'export const b = 2;'].join('\n');
    const found = scanText(text, TSDOC, 'f.ts');
    expect(found.map((finding) => finding.line)).toEqual([4]);
    expect(found[0].cls).toBe('C2');
  });

  it('reads a Svelte @component block as a doc comment', () => {
    const text = ['<!-- @component', 'An instructor picker.', '-->', '<p>ecxc</p>'].join('\n');
    expect([...docCommentLines(text)]).toEqual([1, 2, 3]);
    expect(scanText(text, TSDOC, 'f.svelte').map((finding) => finding.line)).toEqual([2]);
  });

  it('makes CHANGELOG hits errors under Unreleased and warnings in released sections', () => {
    const text = ['# Changelog', '', '## Unreleased', 'Fix for ecxc-ski.', '', '## 1.2.3', 'Fix for ecxc-ski.'].join('\n');
    const found = scanText(text, CHANGELOG, 'CHANGELOG.md');
    expect(found.map((finding) => [finding.line, finding.severity])).toEqual([
      [4, 'error'],
      [7, 'warning'],
    ]);
  });
});

describe('the allowlist', () => {
  it('excuses the next line only, with a reason (markdown form)', () => {
    const text = ['<!-- leak-ok: C1 -- the register quotes the leaked term to forbid it -->', 'ecxc-ski', 'ecxc-ski'].join('\n');
    expect(scanText(text, T1, 'x.md').map((finding) => finding.line)).toEqual([3]);
  });

  it('excuses the next line only, with a reason (code form)', () => {
    const text = ['// leak-ok: C2 -- the fixture names the standing on purpose', 'a household', 'a household'].join('\n');
    expect(scanText(text, T2, 'x.ts').map((finding) => finding.line)).toEqual([3]);
  });

  it('excuses only the classes it names', () => {
    const text = ['<!-- leak-ok: C1 -- reason -->', 'the ecxc household'].join('\n');
    expect(hits(text)).toEqual(['C2:error']);
  });

  it('stacks two markers over one line', () => {
    const text = ['<!-- leak-ok: C1 -- reason one -->', '<!-- leak-ok: C2 -- reason two -->', 'the ecxc household'].join('\n');
    expect(hits(text)).toEqual([]);
  });

  it('excuses a region, and the lines after it are checked again', () => {
    const text = [
      '<!-- leak-ok-begin: C1,C2 -- a quoted historical block -->',
      'ecxc household',
      'ecxc household',
      '<!-- leak-ok-end -->',
      'ecxc',
    ].join('\n');
    expect(scanText(text, T1, 'x.md').map((finding) => finding.line)).toEqual([5]);
  });

  it('does not scan a marker line, so its reason may quote the term', () => {
    expect(hits('<!-- leak-ok: C1 -- quotes ecxc on purpose -->\nplain')).toEqual([]);
  });

  it('treats a marker with no reason as an error and excuses nothing', () => {
    for (const marker of ['<!-- leak-ok: C1 -->', '<!-- leak-ok: C1 -- -->', '<!-- leak-ok: C1 --   -->']) {
      const found = scanText([marker, 'ecxc-ski'].join('\n'), T1, 'x.md');
      expect(found.map((finding) => finding.cls), marker).toEqual(['marker', 'C1']);
      expect(found[0].text).toMatch(/reason/);
    }
  });

  it('treats a marker with no class list, or an unknown class, as an error', () => {
    for (const marker of ['<!-- leak-ok -- reason -->', '<!-- leak-ok: -- reason -->', '<!-- leak-ok: C9 -- reason -->', '// leak-ok']) {
      const found = scanText([marker, 'ecxc-ski'].join('\n'), T2, 'x.md');
      expect(found.map((finding) => finding.cls), marker).toEqual(['marker', 'C1']);
    }
  });

  it('treats a region marker with no reason as an error and opens no region', () => {
    const found = scanText(['<!-- leak-ok-begin: C1 -->', 'ecxc-ski', '<!-- leak-ok-end -->'].join('\n'), T1, 'x.md');
    // The begin marker is rejected, so the line is still checked and the end marker is a stray.
    expect(found.map((finding) => finding.cls)).toEqual(['marker', 'C1', 'marker']);
  });

  it('flags an unterminated region and a stray end', () => {
    const open = scanText(['<!-- leak-ok-begin: C1 -- reason -->', 'plain'].join('\n'), T1, 'x.md');
    expect(open.map((finding) => finding.text)).toEqual(['leak-ok-begin with no leak-ok-end']);
    const stray = scanText('<!-- leak-ok-end -->', T1, 'x.md');
    expect(stray.map((finding) => finding.text)).toEqual(['leak-ok-end with no open leak-ok-begin']);
  });

  it('parses the three marker forms', () => {
    expect(parseMarker('<!-- leak-ok: C1,C3 -- reason -->')).toEqual({ kind: 'next', classes: ['C1', 'C3'], error: null });
    expect(parseMarker('// leak-ok: C2 -- reason')).toEqual({ kind: 'next', classes: ['C2'], error: null });
    expect(parseMarker('<!-- leak-ok-begin: C1 -- reason -->')).toEqual({ kind: 'begin', classes: ['C1'], error: null });
    expect(parseMarker('<!-- leak-ok-end -->')).toEqual({ kind: 'end', classes: [], error: null });
    expect(parseMarker('ordinary prose mentioning leak-ok')).toBeNull();
  });
});

describe('runLeakCheck over a tree', () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  function tree(files: Record<string, string>): string {
    const root = mkdtempSync(join(tmpdir(), 'check-leaks-'));
    roots.push(root);
    for (const [path, body] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), body);
    }
    return root;
  }

  it('passes a clean tree and fails planted leaks in a published page', () => {
    const clean = tree({ 'docs/reference/a.md': '# A\n\nA clean page about signups.\n' });
    expect(runLeakCheck(clean).findings).toEqual([]);

    for (const [plant, cls] of [
      ['Deploy ecxc-ski first.', 'C1'],
      ['Count the households.', 'C2'],
      ['Chosen (Geoff, 2026-10-07) as the default.', 'C3'],
    ]) {
      const planted = tree({ 'docs/reference/a.md': `# A\n\n${plant}\n` });
      const { findings } = runLeakCheck(planted);
      expect(findings.some((finding) => finding.cls === cls && finding.severity === 'error'), plant).toBe(true);
    }
  });

  it('skips seed content and LICENSE inside a template, and scans the rest', () => {
    const root = tree({
      'templates/waymark/src/content/posts/a.md': 'The Anchorage ecxc household.\n',
      'templates/waymark/LICENSE': 'Copyright Geoff Wright\n',
      'templates/waymark/src/chassis/README.md': 'plain\n',
    });
    expect(runLeakCheck(root).findings).toEqual([]);
    const leaked = tree({ 'templates/waymark/src/chassis/README.md': 'Modeled on 907.life.\n' });
    expect(runLeakCheck(leaked).findings.map((finding) => finding.cls)).toEqual(['C1']);
  });

  it('formats errors first and folds released-CHANGELOG warnings into one count line', () => {
    const root = tree({
      'docs/reference/a.md': 'ecxc-ski\n',
      'CHANGELOG.md': '## 1.0.0\necxc-ski\nhousehold\n',
    });
    const lines = formatFindings(runLeakCheck(root).findings);
    expect(lines[0]).toMatch(/^docs\/reference\/a\.md:1: error \[T1 C1\]/);
    expect(lines[1]).toBe('CHANGELOG.md: 2 warning(s) in released sections (run with --warnings to list)');
    expect(formatFindings(runLeakCheck(root).findings, true)).toHaveLength(3);
  });
});
