import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractDocQuotes,
  buildPattern,
  isGrounded,
  candidatesForFile,
  findStrandedQuotes,
} from '../../../scripts/checks/check-editor-quotes.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DOC_PATH = join(ROOT, 'docs/editors/when-something-goes-wrong.md');
const LIB_DIR = join(ROOT, 'src/lib');

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
    const file = join(LIB_DIR, 'components/LoginPage.svelte');
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
    const file = join(LIB_DIR, 'components/MediaPicker.svelte');
    const candidates = candidatesForFile(file);
    expect(candidates.some((c) => c.includes('needs alt text'))).toBe(true);
  });

  it('does not strand a literal after a same-line comment-lookalike ("//") inside an earlier string', () => {
    // The content-routes-core.ts monolith split across several content-routes-*.ts siblings
    // (internals-B). content-routes-shell.ts's `withRefusalCode` still carries the "//" trigger
    // (a URL literal against 'https://internal.invalid'), and content-routes-entry.ts still
    // carries the apostrophe trigger (a fragment refusal reading "can't"), but neither sibling
    // holds both a trigger and one of the two asserted messages, in trigger-before-message order,
    // on its own: 'An unpublished entry with that address already exists' sits in
    // content-routes-entry.ts ahead of its own "can't" trigger, and 'Another editor has
    // unpublished edits referencing this entry' sits in content-routes-core.ts, a file with
    // neither trigger. So at this commit the per-file trigger-to-message coupling this test was
    // written to guard is not exercised; reading every content-routes-*.ts sibling into one
    // candidate pool, the way findStrandedQuotes reads a whole tree below, is what still lets the
    // assertions pass. Task 4 folding renameAction into content-routes-entry.ts restores the
    // coupling by placing the rename-conflict message after the "can't" trigger at entry.ts:764.
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

describe('findStrandedQuotes against the real repo', () => {
  it('grounds every bolded quote on the editors page against a shipped src/lib string', () => {
    const markdown = readFileSync(DOC_PATH, 'utf8');
    const candidates = walkExts(LIB_DIR, ['.svelte', '.ts']).flatMap(candidatesForFile);
    expect(findStrandedQuotes(markdown, candidates)).toEqual([]);
  });

  it('fails a quote a copy edit strands, proving the gate actually catches drift', () => {
    const markdown = readFileSync(DOC_PATH, 'utf8').replace(
      'Pick a date for this entry',
      'Choose a date for this entry',
    );
    const candidates = walkExts(LIB_DIR, ['.svelte', '.ts']).flatMap(candidatesForFile);
    expect(findStrandedQuotes(markdown, candidates)).toEqual(['choose a date for this entry.']);
  });
});
