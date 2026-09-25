import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyPlantedOverlay,
  applyScripterPlantedOverlay,
  DEVELOPMENT_JOBS,
  EVALUATOR_DOCS_SET,
  prepareValidationBatch,
  prepareValidationJob,
  validationContractPages,
  type DevelopmentJob,
} from '../../../scripts/docs-readers/prepare-validation.js';
import { CONTRACT_PAGES, DESIGNER_DOCS_SET, EXTENDER_DOCS_SET, OPERATOR_DOCS_SET } from '../../../scripts/docs-readers/prepare-baseline.js';
import {
  EXPORT_COMMIT_DATE,
  REPOSITORY_EXCLUDED_PATHS,
  assertOneCleanCommit,
  exportGitEnv,
  spawnRunner,
  type CommandRunner,
  type ContractPageSpec,
} from '../../../scripts/docs-readers/lib/prepare-class.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** A fresh scratch directory, removed by the caller. */
function tmp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `docs-readers-prepare-validation-${prefix}-`));
}

/** Write a small text file, creating its parent directories. */
function write(file: string, content: string): void {
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, content);
}

describe('applyPlantedOverlay', () => {
  it('copies every planted file onto its matching path, leaving an untouched control file alone', () => {
    const dest = tmp('dest');
    const planted = tmp('planted');
    try {
      write(join(dest, 'docs/guide.md'), 'control text\n');
      write(join(dest, 'docs/other.md'), 'unrelated control text\n');
      write(join(planted, 'docs/guide.md'), 'planted defect text\n');
      applyPlantedOverlay(planted, dest);
      expect(readFileSync(join(dest, 'docs/guide.md'), 'utf8')).toBe('planted defect text\n');
      expect(readFileSync(join(dest, 'docs/other.md'), 'utf8')).toBe('unrelated control text\n');
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });

  it('recurses into nested planted directories', () => {
    const dest = tmp('dest-nested');
    const planted = tmp('planted-nested');
    try {
      write(join(dest, 'docs/reference/schema/a.schema.json'), '{"version":1}');
      write(join(planted, 'docs/reference/schema/a.schema.json'), '{"version":2}');
      applyPlantedOverlay(planted, dest);
      expect(readFileSync(join(dest, 'docs/reference/schema/a.schema.json'), 'utf8')).toBe('{"version":2}');
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });

  it('throws when the planted directory does not exist', () => {
    const dest = tmp('dest-missing');
    try {
      expect(() => applyPlantedOverlay(join(dest, 'no-such-planted-dir'), dest)).toThrow(/does not exist/);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it('throws when the planted directory exists but holds no files', () => {
    const dest = tmp('dest-empty');
    const planted = tmp('planted-empty');
    try {
      mkdirSync(join(planted, 'docs'), { recursive: true });
      expect(() => applyPlantedOverlay(planted, dest)).toThrow(/is empty/);
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });

  it('throws, naming the missing target, when a planted path has no matching target in dest', () => {
    // A mistyped or misplaced plant (a path the control tree never carries) must fail loudly
    // rather than land as a stray new file.
    const dest = tmp('dest-no-target');
    const planted = tmp('planted-no-target');
    try {
      write(join(planted, 'docs/never-copied.md'), 'planted defect text\n');
      expect(() => applyPlantedOverlay(planted, dest)).toThrow(/no matching target/);
      expect(existsSync(join(dest, 'docs/never-copied.md'))).toBe(false);
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });

  it('throws when a docsSet is given and a planted path is not one of its pages', () => {
    const dest = tmp('dest-docsset');
    const planted = tmp('planted-docsset');
    try {
      write(join(dest, 'docs/guide.md'), 'control text\n');
      write(join(planted, 'docs/guide.md'), 'planted defect text\n');
      expect(() => applyPlantedOverlay(planted, dest, ['docs/other.md'])).toThrow(/not one of the job's own docsSet pages/);
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });

  it('passes when a docsSet is given and every planted path is one of its pages', () => {
    const dest = tmp('dest-docsset-ok');
    const planted = tmp('planted-docsset-ok');
    try {
      write(join(dest, 'docs/guide.md'), 'control text\n');
      write(join(planted, 'docs/guide.md'), 'planted defect text\n');
      applyPlantedOverlay(planted, dest, ['docs/guide.md']);
      expect(readFileSync(join(dest, 'docs/guide.md'), 'utf8')).toBe('planted defect text\n');
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });
});

describe('applyScripterPlantedOverlay', () => {
  const pages: ContractPageSpec[] = [
    { name: 'json-output', commit: 'HEAD', page: 'docs/reference/cli-cairn-json-output.md', schemas: ['docs/reference/schema/cairn-doctor.schema.json'] },
    { name: 'doctor', commit: 'HEAD', page: 'docs/reference/cli-cairn-doctor.md', schemas: ['docs/reference/schema/cairn-doctor.schema.json'] },
    { name: 'exit-codes', commit: 'HEAD', page: 'docs/reference/cli-cairn-exit-codes.md', schemas: [] },
  ];

  /** A bundle-shaped control tree, one subdirectory per page spec, each carrying its own page and schemas. */
  function writeBundle(dest: string): void {
    for (const spec of pages) {
      write(join(dest, spec.name, spec.page), `control ${spec.name} page\n`);
      for (const schema of spec.schemas) write(join(dest, spec.name, schema), `{"control":"${spec.name}"}`);
    }
  }

  it('copies a planted page into its own bundle subdirectory, leaving no top-level file', () => {
    const dest = tmp('scripter-dest');
    const planted = tmp('scripter-planted');
    try {
      writeBundle(dest);
      write(join(planted, 'docs/reference/cli-cairn-json-output.md'), 'planted json-output page\n');
      applyScripterPlantedOverlay(planted, dest, pages);
      expect(readFileSync(join(dest, 'json-output/docs/reference/cli-cairn-json-output.md'), 'utf8')).toBe('planted json-output page\n');
      expect(existsSync(join(dest, 'docs/reference/cli-cairn-json-output.md'))).toBe(false);
      // The other two subdirectories' own pages are untouched.
      expect(readFileSync(join(dest, 'doctor/docs/reference/cli-cairn-doctor.md'), 'utf8')).toBe('control doctor page\n');
      expect(readFileSync(join(dest, 'exit-codes/docs/reference/cli-cairn-exit-codes.md'), 'utf8')).toBe('control exit-codes page\n');
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });

  it('copies a planted schema into every subdirectory that shares it, still with no top-level file', () => {
    const dest = tmp('scripter-dest-schema');
    const planted = tmp('scripter-planted-schema');
    try {
      writeBundle(dest);
      write(join(planted, 'docs/reference/schema/cairn-doctor.schema.json'), '{"planted":true}');
      applyScripterPlantedOverlay(planted, dest, pages);
      expect(readFileSync(join(dest, 'json-output/docs/reference/schema/cairn-doctor.schema.json'), 'utf8')).toBe('{"planted":true}');
      expect(readFileSync(join(dest, 'doctor/docs/reference/schema/cairn-doctor.schema.json'), 'utf8')).toBe('{"planted":true}');
      expect(existsSync(join(dest, 'docs/reference/schema/cairn-doctor.schema.json'))).toBe(false);
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });

  it('throws, naming the path, when a planted file matches no bundle page or schema', () => {
    const dest = tmp('scripter-dest-mistyped');
    const planted = tmp('scripter-planted-mistyped');
    try {
      writeBundle(dest);
      write(join(planted, 'docs/reference/cli-cairn-typo.md'), 'planted defect text\n');
      expect(() => applyScripterPlantedOverlay(planted, dest, pages)).toThrow(/docs\/reference\/cli-cairn-typo\.md.*does not match/);
      for (const spec of pages) expect(existsSync(join(dest, spec.name, 'cli-cairn-typo.md'))).toBe(false);
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });

  it('throws when a matched subdirectory’s own copy of the planted path is missing', () => {
    const dest = tmp('scripter-dest-missing-target');
    const planted = tmp('scripter-planted-missing-target');
    try {
      // A bundle built without the doctor subdirectory's own page, the shape a stale or
      // partially built control tree would carry.
      write(join(dest, 'json-output/docs/reference/cli-cairn-json-output.md'), 'control page\n');
      write(join(planted, 'docs/reference/cli-cairn-doctor.md'), 'planted defect text\n');
      expect(() => applyScripterPlantedOverlay(planted, dest, pages)).toThrow(/no matching target/);
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(planted, { recursive: true, force: true });
    }
  });
});

describe('EVALUATOR_DOCS_SET', () => {
  it('matches batches/baseline.json’s own evaluator job docsSet', () => {
    const baseline = JSON.parse(readFileSync(join(ROOT, 'scripts/docs-readers/batches/baseline.json'), 'utf8')) as {
      jobs: Array<{ id: string; docsSet: string[] }>;
    };
    const evaluatorJob = baseline.jobs.find((job) => job.id === 'evaluator-1');
    expect(evaluatorJob).toBeDefined();
    expect([...EVALUATOR_DOCS_SET].sort()).toEqual([...(evaluatorJob?.docsSet ?? [])].sort());
  });
});

describe('validationContractPages', () => {
  it('pins every one of the baseline’s contract pages to the given commit, keeping every other field', () => {
    const pages = validationContractPages('3a7485dd');
    expect(pages).toHaveLength(CONTRACT_PAGES.length);
    for (const [index, spec] of pages.entries()) {
      expect(spec.commit).toBe('3a7485dd');
      expect(spec.name).toBe(CONTRACT_PAGES[index].name);
      expect(spec.page).toBe(CONTRACT_PAGES[index].page);
      expect(spec.schemas).toEqual(CONTRACT_PAGES[index].schemas);
    }
  });
});

/** Run git in `cwd` with the caller's own environment, returning trimmed stdout. */
function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd }).toString().trim();
}

/** Commit every file under `repoRoot`, initializing it first when needed, and return the commit id. */
function commitAll(repoRoot: string, message: string): string {
  if (!existsSync(join(repoRoot, '.git'))) {
    git(repoRoot, ['init', '-q']);
    git(repoRoot, ['config', 'user.email', 'source@example.com']);
    git(repoRoot, ['config', 'user.name', 'Source']);
  }
  git(repoRoot, ['add', '-A']);
  git(repoRoot, ['commit', '-q', '-m', message]);
  return git(repoRoot, ['rev-parse', 'HEAD']);
}

/** Run git against a prepared tree the way a reader would, isolated from any host config. */
function readerGit(dir: string, args: string[]): string {
  return execFileSync('git', args, { cwd: dir, env: exportGitEnv(dir) }).toString();
}

/** Every page any development job reads, plus the core developer's own entry page. */
const EVERY_PAGE = [
  ...new Set([
    ...EVALUATOR_DOCS_SET,
    ...OPERATOR_DOCS_SET,
    ...DESIGNER_DOCS_SET,
    ...EXTENDER_DOCS_SET,
    ...CONTRACT_PAGES.flatMap((spec) => [spec.page, ...spec.schemas]),
    'CONTRIBUTING.md',
  ]),
];

/** The text a page carries at the pinned commit, at the later HEAD commit, and in the uncommitted working tree. */
const pinnedText = (page: string): string => `pinned text of ${page}\n`;
const headText = (page: string): string => `head text of ${page}\n`;
const workingText = (page: string): string => `working-tree text of ${page}\n`;

/** Real git and tar; `npm ci` and `npm install` faked with a marker install. */
const fakeInstallRunner: CommandRunner = (command, args, options) => {
  if (command === 'npm' && (args[0] === 'ci' || args[0] === 'install')) {
    writeFileSync(join(mkdirp(join(options.cwd, 'node_modules/@glw907/cairn-cms/dist')), 'index.js'), 'export {};');
    return { status: 0, stdout: Buffer.alloc(0), stderr: '' };
  }
  if (command === 'npm') throw new Error(`unexpected npm call: ${args.join(' ')}`);
  return spawnRunner(command, args, options);
};

/** Create a directory and its parents, returning it. */
function mkdirp(dir: string): string {
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Every regular file's text under `dir`, skipping `.git`, `node_modules`, and the registry. */
function pageTexts(dir: string): string[] {
  const texts: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (['.git', 'node_modules', 'state'].includes(entry.name)) continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) texts.push(readFileSync(full, 'utf8'));
    }
  };
  walk(dir);
  return texts;
}

/** Every path under `dir`, `dir` included, whose own mtime is not the fixed instant. */
function offTimePaths(dir: string): string[] {
  const off: string[] = [];
  const walk = (current: string): void => {
    const stat = lstatSync(current);
    if (stat.mtimeMs !== Date.parse(EXPORT_COMMIT_DATE)) off.push(current);
    if (stat.isDirectory()) for (const name of readdirSync(current)) walk(join(current, name));
  };
  walk(dir);
  return off;
}

describe('the six development jobs', () => {
  let repoRoot = '';
  let pinned = '';
  let siteClone = '';
  let siteCommit = '';
  let work = '';

  beforeAll(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'docs-readers-six-source-'));
    write(join(repoRoot, 'templates/waymark/package.json'), JSON.stringify({ name: 'site', dependencies: {}, devDependencies: {} }));
    for (const page of EVERY_PAGE) write(join(repoRoot, page), pinnedText(page));
    pinned = commitAll(repoRoot, 'pinned');
    for (const page of EVERY_PAGE) write(join(repoRoot, page), headText(page));
    commitAll(repoRoot, 'later');
    for (const page of EVERY_PAGE) write(join(repoRoot, page), workingText(page));
    siteClone = mkdtempSync(join(tmpdir(), 'docs-readers-six-site-'));
    write(join(siteClone, 'wrangler.jsonc'), '{}');
    siteCommit = commitAll(siteClone, 'site');
    work = mkdtempSync(join(tmpdir(), 'docs-readers-six-work-'));
  });

  afterAll(() => {
    for (const dir of [repoRoot, siteClone, work]) rmSync(dir, { recursive: true, force: true });
  });

  /** The shared options every job build takes, at a given commit and destination. */
  function options(job: DevelopmentJob, commit: string, plantsDir: string, plantedDest?: string) {
    return {
      commit,
      controlDest: join(work, `${job}-control`),
      plantedDest,
      plantsDir,
      repoRoot,
      runner: fakeInstallRunner,
      tarballs: () => ({ engine: '/cache/engine.tgz', dev: '/cache/dev.tgz' }),
      site: { clone: siteClone, commit: siteCommit },
    };
  }

  it.each(DEVELOPMENT_JOBS)('%s: takes every page from the pinned commit, never HEAD or the working tree', (job) => {
    const opts = options(job, pinned, join(work, 'no-plants', job));
    prepareValidationJob(job, opts);
    const texts = pageTexts(opts.controlDest);
    expect(texts.some((text) => text.startsWith('pinned text of '))).toBe(true);
    expect(texts.filter((text) => text.startsWith('head text of ') || text.startsWith('working-tree text of '))).toEqual([]);
    rmSync(opts.controlDest, { recursive: true, force: true });
  });

  it.each(DEVELOPMENT_JOBS)('%s: refuses a HEAD pin and leaves no tree behind', (job) => {
    const opts = options(job, 'HEAD', join(work, 'no-plants', job));
    expect(() => prepareValidationJob(job, opts)).toThrow(/not a pinned commit id/);
    expect(existsSync(opts.controlDest)).toBe(false);
  });

  it.each(DEVELOPMENT_JOBS)('%s: builds a control-only tree when no planted directory exists', (job) => {
    const plantedDest = join(work, `${job}-planted`);
    const opts = options(job, pinned, join(work, 'no-plants', job), plantedDest);
    const result = prepareValidationJob(job, opts);
    expect(result.planted).toBe(false);
    expect(existsSync(opts.controlDest)).toBe(true);
    expect(existsSync(plantedDest)).toBe(false);
    expect(offTimePaths(opts.controlDest)).toEqual([]);
    rmSync(opts.controlDest, { recursive: true, force: true });
  });

  it.each([
    { job: 'core-developer' as const, page: 'CONTRIBUTING.md', at: 'CONTRIBUTING.md' },
    { job: 'scripter' as const, page: 'docs/reference/cli-cairn-doctor.md', at: 'doctor/docs/reference/cli-cairn-doctor.md' },
  ])('$job: a planted tree and its control each carry one clean commit with identical metadata, and no control text at the planted line', ({ job, page, at }) => {
    const plantsDir = join(work, 'plants', job);
    write(join(plantsDir, page), `planted line of ${page}\n`);
    const plantedDest = join(work, `${job}-planted`);
    const opts = options(job, pinned, plantsDir, plantedDest);
    const result = prepareValidationJob(job, opts);
    expect(result.planted).toBe(true);
    expect(readFileSync(join(plantedDest, at), 'utf8')).toBe(`planted line of ${page}\n`);
    expect(readFileSync(join(opts.controlDest, at), 'utf8')).toBe(pinnedText(page));
    const metadata = '--format=%an|%ae|%aI|%cn|%ce|%cI|%B';
    for (const tree of [opts.controlDest, plantedDest]) {
      expect(() => assertOneCleanCommit(tree)).not.toThrow();
      expect(offTimePaths(tree)).toEqual([]);
    }
    // Read before `git diff`, which refreshes the index the way a reader's own git would.
    const indexEntries = readerGit(plantedDest, ['ls-files', '--debug']).split('\n').filter((line) => line.includes('ino:'));
    expect(indexEntries.length).toBeGreaterThan(0);
    for (const line of indexEntries) expect(line).toMatch(/ino: 0\b/);
    expect(readerGit(plantedDest, ['log', metadata])).toBe(readerGit(opts.controlDest, ['log', metadata]));
    expect(readerGit(plantedDest, ['log', '--format=%B'])).not.toMatch(/planted|control/i);
    expect(readerGit(plantedDest, ['log', '-p', '--all'])).not.toContain(pinnedText(page).trim());
    expect(readerGit(plantedDest, ['diff', 'HEAD'])).toBe('');
    for (const tree of [opts.controlDest, plantedDest]) rmSync(tree, { recursive: true, force: true });
  });

  it('evaluator: a planted tree carries its overlay and the fixed mtime on every path', () => {
    const page = EVALUATOR_DOCS_SET[0];
    const plantsDir = join(work, 'plants', 'evaluator');
    write(join(plantsDir, page), `planted line of ${page}\n`);
    const plantedDest = join(work, 'evaluator-planted');
    const opts = options('evaluator', pinned, plantsDir, plantedDest);
    prepareValidationJob('evaluator', opts);
    expect(readFileSync(join(plantedDest, page), 'utf8')).toBe(`planted line of ${page}\n`);
    expect(offTimePaths(plantedDest)).toEqual([]);
    for (const tree of [opts.controlDest, plantedDest]) rmSync(tree, { recursive: true, force: true });
  });

  it('prepareValidationBatch: refuses a batch job with no commit before building anything', () => {
    const root = join(work, 'batch-no-commit');
    const batchPath = join(work, 'batch-no-commit.json');
    writeFileSync(batchPath, JSON.stringify({ jobs: [{ id: 'evaluator-control-1', prepared: join(root, 'evaluator-control') }] }));
    expect(() => prepareValidationBatch(batchPath, { repoRoot, runner: fakeInstallRunner })).toThrow(/must carry a commit/);
    expect(existsSync(root)).toBe(false);
  });

  it('prepareValidationBatch: refuses a named planted tree whose planted pages do not exist', () => {
    const root = join(work, 'batch-no-plants');
    const batchPath = join(work, 'batch-no-plants.json');
    writeFileSync(batchPath, JSON.stringify({ jobs: [{ id: 'evaluator-planted-1', prepared: join(root, 'evaluator-planted'), commit: pinned }] }));
    expect(() => prepareValidationBatch(batchPath, { repoRoot, runner: fakeInstallRunner, plantsRoot: join(work, 'no-plants') })).toThrow(/does not exist/);
    expect(existsSync(root)).toBe(false);
  });

  it('prepareValidationBatch: builds each named tree at its commit and records each job’s absent list', () => {
    const root = join(work, 'batch-ok');
    const plantsRoot = join(work, 'batch-plants');
    write(join(plantsRoot, 'core-developer', 'CONTRIBUTING.md'), 'planted line\n');
    const batchPath = join(work, 'batch-ok.json');
    const jobs = [
      { id: 'evaluator-control-1', prepared: join(root, 'evaluator-control'), commit: pinned },
      { id: 'core-developer-control-1', prepared: join(root, 'core-developer-control'), commit: pinned },
      { id: 'core-developer-planted-1', prepared: join(root, 'core-developer-planted'), commit: pinned },
    ];
    writeFileSync(batchPath, JSON.stringify({ name: 'fixture', jobs }));
    prepareValidationBatch(batchPath, { repoRoot, runner: fakeInstallRunner, plantsRoot });
    const written = JSON.parse(readFileSync(batchPath, 'utf8')) as { jobs: Array<{ id: string; absent?: string[]; commit: string }> };
    const evaluatorAbsent = written.jobs[0].absent ?? [];
    expect(evaluatorAbsent).toEqual(expect.arrayContaining(['CONTRIBUTING.md', 'templates/', 'docs/reference/']));
    for (const page of EVALUATOR_DOCS_SET) expect(evaluatorAbsent).not.toContain(page);
    const repositoryAbsent = REPOSITORY_EXCLUDED_PATHS.filter((entry) => !entry.includes('*'));
    expect(written.jobs[1].absent).toEqual(repositoryAbsent);
    expect(written.jobs[2].absent).toEqual(repositoryAbsent);
    expect(written.jobs.every((job) => job.commit === pinned)).toBe(true);
    expect(readFileSync(join(root, 'core-developer-planted/CONTRIBUTING.md'), 'utf8')).toBe('planted line\n');
    expect(readFileSync(join(root, 'evaluator-control', EVALUATOR_DOCS_SET[0]), 'utf8')).toBe(pinnedText(EVALUATOR_DOCS_SET[0]));
  });
});
