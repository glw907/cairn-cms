// cairn-cms: the emitter does not read comments, and scripts/build/emit-template.mjs copies the
// showcase verbatim minus its .cairn-template.json exclusions, so an unguarded members fixture
// would ship a code-readback OTP oracle into every scaffolded site (spec
// docs/superpowers/specs/2026-08-04-auth-channel-consumer-proof-design.md, "The acceptance
// test"). This walks a real emission of examples/showcase and proves the emitted tree carries
// none of the fixture's forbidden tokens, that the marker-stripped wrangler.jsonc still parses
// with exactly the expected d1_databases membership, and that the manifest's own exclude list
// still points at real paths.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFile, mkdtemp, rm, readdir } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, relative } from 'node:path';
import { emitTemplate } from '../../../scripts/build/emit-template.mjs';
import { walk } from '../../../scripts/walk-files.mjs';

const ROOT = resolve(__dirname, '../../..');
const SHOWCASE = resolve(ROOT, 'examples/showcase');
const EXCLUDE_START = 'cairn-template:exclude-start';
const EXCLUDE_END = 'cairn-template:exclude-end';

// The showcase's own gitignored/build output dirs, the same set the emitter's own alwaysSkip
// names. node_modules holds the workspace-linked engine package, which symlinks back into
// examples/showcase itself (the worktree gotcha), so this set must be excluded from descent,
// never filtered after the fact, or a plain recursive walk loops forever on the self-reference.
const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.svelte-kit',
  'build',
  '.wrangler',
  'test-results',
  'playwright-report',
  '.git',
]);

/** Every file under `dir`, never descending into a directory named in SKIP_DIR_NAMES. */
async function walkSourceFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIR_NAMES.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walkSourceFiles(full)));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

/**
 * A minimal JSONC reader for this test's one file: strips `//` line comments outside string
 * literals, then trailing commas, then parses. wrangler.jsonc never uses block comments, so this
 * stays narrower than src/lib/doctor/wrangler-config.ts's own tolerant reader.
 */
function parseJsonc(text: string): Record<string, unknown> {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (ch === '\\') {
        i += 1;
        out += text[i] ?? '';
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      continue;
    }
    out += ch;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1')) as Record<string, unknown>;
}

/**
 * The showcase's demo member roster contacts, read straight from channel.ts's literal rather
 * than imported, so this test never needs to resolve the members fixture's own module graph.
 */
function rosterContacts(): string[] {
  const src = readFileSync(resolve(SHOWCASE, 'src/members/channel.ts'), 'utf8');
  return [...src.matchAll(/'([\w.-]+@showcase\.test)'/g)].map((match) => match[1]);
}

describe('the emitted template tree', () => {
  let emittedTo: string;

  beforeAll(async () => {
    emittedTo = await mkdtemp(join(tmpdir(), 'cairn-emit-template-'));
    await emitTemplate({
      from: SHOWCASE,
      to: emittedTo,
      engineSpec: 'file:/tmp/does-not-exist-cairn-cms.tgz',
      devSpec: 'file:/tmp/does-not-exist-cairn-cms-dev.tgz',
      name: 'emitted-test-site',
    });
  });

  afterAll(async () => {
    await rm(emittedTo, { recursive: true, force: true });
  });

  it('carries none of the forbidden fixture tokens, editor@showcase.test exempted', async () => {
    const contacts = rosterContacts().filter((contact) => contact !== 'editor@showcase.test');
    expect(contacts.length).toBeGreaterThan(0);
    const forbidden = ['MEMBER_DB', 'createAuthChannel', 'migrations-members', 'last-otp', 'cairn-template:', ...contacts];
    const hits: string[] = [];
    for (const filePath of walk(emittedTo, () => true)) {
      const content = await readFile(filePath, 'utf8').catch(() => null);
      if (content === null) continue;
      for (const token of forbidden) {
        if (content.includes(token)) hits.push(`${relative(emittedTo, filePath)}: ${token}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('emits a wrangler.jsonc that parses as JSONC with exactly AUTH_DB and APP_DB bound', async () => {
    const text = await readFile(join(emittedTo, 'wrangler.jsonc'), 'utf8');
    const config = parseJsonc(text);
    const databases = config.d1_databases as Array<{ binding: string }>;
    const bindings = databases.map((entry) => entry.binding).sort();
    expect(bindings).toEqual(['APP_DB', 'AUTH_DB']);
  });
});

describe('examples/showcase/.cairn-template.json', () => {
  it('every exclude entry matches a path that exists in the showcase', async () => {
    const manifest = JSON.parse(await readFile(resolve(SHOWCASE, '.cairn-template.json'), 'utf8')) as {
      exclude: string[];
    };
    expect(manifest.exclude.length).toBeGreaterThan(0);
    for (const entry of manifest.exclude) {
      expect(existsSync(resolve(SHOWCASE, entry)), entry).toBe(true);
    }
  });
});

describe('the showcase source tree', () => {
  it('has balanced cairn-template marker pairs', async () => {
    let starts = 0;
    let ends = 0;
    for (const filePath of await walkSourceFiles(SHOWCASE)) {
      const buffer = await readFile(filePath).catch(() => null);
      if (buffer === null || buffer.includes(0)) continue;
      const content = buffer.toString('utf8');
      starts += content.split(EXCLUDE_START).length - 1;
      ends += content.split(EXCLUDE_END).length - 1;
    }
    expect(starts).toBeGreaterThan(0);
    expect(starts).toEqual(ends);
  });
});
