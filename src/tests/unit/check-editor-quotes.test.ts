import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import {
  extractDocQuotes,
  buildPattern,
  isGrounded,
  candidatesForFile,
  findStrandedQuotes,
  hasQuotesToCheck,
  editorQuotesReport,
} from '../../../scripts/checks/check-editor-quotes.mjs';
import { DELETION_LIST_PATH } from '../../../scripts/checks/arm-state.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const LIB_DIR = join(ROOT, 'src/lib');

// A page carrying one real shipped message, standing in for the editors page so these tests hold
// whatever state the editors arm is in.
const SAMPLE_PAGE = ['# When something goes wrong', '', '**"Pick a date for this entry."** This entry needs a date.', ''].join('\n');

function walkExts(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkExts(full, exts));
    else if (exts.some((ext) => name.endsWith(ext))) out.push(full);
  }
  return out;
}

describe('extractDocQuotes', () => {
  it('extracts each bolded double-quoted sentence, folded to lowercase with quotes stripped', () => {
    const markdown = [
      '**"That link expired. Request a new link below and open it in this browser."** on the sign-in',
      'page, or **"This link didn\'t work"** on the confirm page.',
      '',
      '**A delete is refused, naming what links to it.** No quotes here, so this is not extracted.',
    ].join('\n');
    expect(extractDocQuotes(markdown)).toEqual([
      'that link expired. request a new link below and open it in this browser.',
      'this link didnt work',
    ]);
  });

  it('folds a quote that wraps across a soft line break into one string', () => {
    const markdown = [
      '**"We\'re having trouble sending sign-in links right now. Please contact the site',
      'owner."** The editor could not send the email.',
    ].join('\n');
    expect(extractDocQuotes(markdown)).toEqual([
      'were having trouble sending sign-in links right now. please contact the site owner.',
    ]);
  });
});

describe('buildPattern and isGrounded', () => {
  it('grounds a doc quote against a plain literal candidate with no interpolation hole', () => {
    const quote = 'that link expired. request a new link below and open it in this browser.';
    const candidates = ['That link expired. Request a new link below and open it in this browser.'];
    expect(isGrounded(quote, candidates)).toBe(true);
  });

  it('grounds a doc quote naming one ternary branch against a template carrying both branches', () => {
    const template =
      "This page links to {x ? 'a page' : 'pages'} that no longer {x ? 'exists' : 'exist'}. Remove the broken {x ? 'link' : 'links'} and save again.";
    const singular = 'this page links to a page that no longer exists. remove the broken link and save again.';
    const plural = 'this page links to pages that no longer exist. remove the broken links and save again.';
    expect(isGrounded(singular, [template])).toBe(true);
    expect(isGrounded(plural, [template])).toBe(true);
  });

  it('grounds a doc quote whose placeholder text differs from the interpolated expression', () => {
    // taxonomy-enforce.ts wraps the interpolated tag in double quotes; the doc quote uses a
    // bracketed-free single-quoted placeholder instead. Neither side's quote style has to match.
    const template = '"${unlisted}" is not in your tag list. Add it to your vocabulary first.';
    const quote = 'x is not in your tag list. add it to your vocabulary first.';
    expect(isGrounded(quote, [template])).toBe(true);
  });

  it('does not vacuously ground a quote against an all-hole candidate below the literal-length floor', () => {
    expect(buildPattern('{#if draftWarning}')).toBeNull();
    expect(isGrounded('anything at all fits an empty pattern', ['{#if draftWarning}'])).toBe(false);
  });

  it('does not ground a quote whose wording no longer matches any candidate', () => {
    const quote = 'choose a date for this entry.';
    const candidates = ['Pick a date for this entry.'];
    expect(isGrounded(quote, candidates)).toBe(false);
  });

  it('does not vacuously ground a quote via an unrelated candidate that only shares a substring', () => {
    // An 8+ character fragment ("published", "fragment", "vocabulary") can appear inside an
    // unrelated candidate string without that candidate being the quote's real source. An
    // unanchored pattern.test(quote) call matches this as a substring hit; the anchored form
    // requires the candidate's literal parts to span the whole quote, so it does not.
    const quote = 'the draft has already been published elsewhere.';
    const candidates = ['This page links to unpublished pages.'];
    expect(isGrounded(quote, candidates)).toBe(false);
  });
});

describe('candidatesForFile', () => {
  it('reads both the <script> string literals and the markup text nodes of a .svelte file', () => {
    const file = join(LIB_DIR, 'admin/LoginPage.svelte');
    const candidates = candidatesForFile(file);
    expect(candidates.some((c) => c.includes('having trouble sending sign-in links'))).toBe(true);
  });

  it('reads the string and template literals of a plain .ts file', () => {
    const file = join(LIB_DIR, 'content/taxonomy-enforce.ts');
    const candidates = candidatesForFile(file);
    expect(candidates.some((c) => c.includes('is not in your tag list'))).toBe(true);
  });

  it('reads string literals from every <script> block, not just the first one', () => {
    // MediaPicker.svelte leads with a `<script module>` block (type-only, no string literals of
    // interest) before its main `<script>` block. A single `.match` against
    // `/<script[\s\S]*?<\/script>/i` is non-greedy and stops at the FIRST `</script>`, so it
    // captures only the module block and silently drops every literal in the main script,
    // including this one, which lives nowhere in the rendered markup ("Needs alt" is the markup's
    // own, differently worded, string).
    const file = join(LIB_DIR, 'admin/MediaPicker.svelte');
    const candidates = candidatesForFile(file);
    expect(candidates.some((c) => c.includes('needs alt text'))).toBe(true);
  });

  it('does not strand a literal after a same-line comment-lookalike ("//") inside an earlier string', () => {
    // The apostrophe trigger (a fragment refusal reading "can't") lives in
    // content-routes-entry-write.ts's saveToBranch. The rename-conflict message ('Another editor
    // has unpublished edits referencing this entry') lives in content-routes-entry-destructive.ts's
    // renameAction, and the create-conflict message ('An unpublished entry with that address
    // already exists') lives in content-routes-entry-read.ts's createAction, so all three pieces
    // this test guards sit in three separate content-routes-*.ts siblings; content-routes-shell.ts's
    // `withRefusalCode` carries a separate "//" trigger (a URL literal against
    // 'https://internal.invalid') with neither asserted message in its own file. Reading every
    // content-routes-*.ts sibling into one candidate pool, the way findStrandedQuotes reads a
    // whole tree below, is what lets each conflict message register despite sitting in a
    // different file from its own file's trigger.
    const files = readdirSync(join(LIB_DIR, 'sveltekit'))
      .filter((name) => name.startsWith('content-routes-') && name.endsWith('.ts'))
      .map((name) => join(LIB_DIR, 'sveltekit', name));
    const candidates = files.flatMap(candidatesForFile);
    expect(
      candidates.some((c) => c.includes('An unpublished entry with that address already exists')),
    ).toBe(true);
    expect(
      candidates.some((c) => c.includes('Another editor has unpublished edits referencing this entry')),
    ).toBe(true);
  });
});

describe('findStrandedQuotes against the real src/lib', () => {
  it('grounds a real shipped message quoted on a page', () => {
    const candidates = walkExts(LIB_DIR, ['.svelte', '.ts']).flatMap(candidatesForFile);
    expect(findStrandedQuotes(SAMPLE_PAGE, candidates)).toEqual([]);
  });

  it('fails a quote a copy edit strands, proving the gate actually catches drift', () => {
    const markdown = SAMPLE_PAGE.replace('Pick a date for this entry', 'Choose a date for this entry');
    const candidates = walkExts(LIB_DIR, ['.svelte', '.ts']).flatMap(candidatesForFile);
    expect(findStrandedQuotes(markdown, candidates)).toEqual(['choose a date for this entry.']);
  });
});

describe('hasQuotesToCheck (the zero-quote floor)', () => {
  it('is true for a page carrying a bolded quote', () => {
    expect(hasQuotesToCheck(SAMPLE_PAGE)).toBe(true);
  });

  it('is false for a page stripped of every bolded quote, so the gate cannot pass vacuously', () => {
    const markdown = SAMPLE_PAGE.replace(/\*\*"[^"]+"\*\*/g, 'a message');
    expect(extractDocQuotes(markdown)).toEqual([]);
    expect(hasQuotesToCheck(markdown)).toBe(false);
  });
});

// The gate runs only while the editors arm is rebuilt (arm-state.mjs). Once the arm holds any page,
// the pinned page must exist and carry a grounded quote, so a stage that renames or drops it fails
// here instead of disarming the gate.
describe('editorQuotesReport, by editors-arm state', () => {
  const PAGE = 'docs/editors/when-something-goes-wrong.md';
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  function tree(files: Record<string, string>, { list = true } = {}): string {
    const root = mkdtempSync(join(tmpdir(), 'cairn-editor-quotes-'));
    roots.push(root);
    const all: Record<string, string> = {
      'src/lib/messages.ts': "export const DATE_MISSING = 'Pick a date for this entry.';\n",
      ...files,
    };
    if (list) all[DELETION_LIST_PATH] = JSON.stringify({ deleted: [PAGE], kept: [] });
    for (const [path, content] of Object.entries(all)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content);
    }
    return root;
  }

  it('skips, naming the state, while the editors arm is absent', () => {
    const report = editorQuotesReport(tree({}));
    expect(report.ok).toBe(true);
    expect(report.lines.join('\n')).toMatch(/editors arm is absent/);
  });

  it('fails a rebuilt editors arm that no longer carries the pinned page', () => {
    const report = editorQuotesReport(tree({ 'docs/editors/welcome.md': '# Welcome\n' }));
    expect(report.ok).toBe(false);
    expect(report.lines.join('\n')).toContain(`${PAGE} does not exist`);
  });

  it('fails a rebuilt page with no bolded quote', () => {
    const report = editorQuotesReport(tree({ [PAGE]: '# When something goes wrong\n' }));
    expect(report.ok).toBe(false);
    expect(report.lines.join('\n')).toMatch(/0 bolded quotes/);
  });

  it('fails a rebuilt page whose quote no shipped string grounds', () => {
    const report = editorQuotesReport(tree({ [PAGE]: SAMPLE_PAGE.replace('Pick', 'Choose') }));
    expect(report.ok).toBe(false);
    expect(report.lines.join('\n')).toContain('choose a date for this entry.');
  });

  it('passes a rebuilt page whose quote a shipped string grounds', () => {
    expect(editorQuotesReport(tree({ [PAGE]: SAMPLE_PAGE }))).toEqual({
      ok: true,
      lines: ['check-editor-quotes: OK (1 quotes grounded)'],
    });
  });

  it('fails closed without the deletion list', () => {
    expect(() => editorQuotesReport(tree({ [PAGE]: SAMPLE_PAGE }, { list: false }))).toThrow(/deletion-list\.json does not exist/);
  });

  it('passes on the real tree', () => {
    expect(editorQuotesReport(ROOT).ok).toBe(true);
  });
});
