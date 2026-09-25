import { describe, it, expect } from 'vitest';
import {
  claudeArgs,
  expectedTools,
  judgeKindForClass,
  loadClasses,
  loadEgress,
  validateClass,
} from '../../../scripts/docs-readers/lib/class-schema.js';

const egressNames = Object.keys(loadEgress());

const valid = {
  name: 'docs-only',
  description: 'The docs set, read with the file tools.',
  contents: 'docs-set',
  tools: ['Read', 'Grep', 'Glob'],
  bashAllowlist: [],
  permissionMode: 'default',
  env: {},
  secretEnv: [],
  egress: 'anthropic',
};

describe('class declarations', () => {
  it('loads the docs-only and repository classes from the classes directory', () => {
    const classes = loadClasses();
    expect(classes.get('docs-only')?.tools).toEqual(['Read', 'Grep', 'Glob']);
    // Read-only git subcommands only, each listed bare and with arguments.
    expect(classes.get('repository')?.bashAllowlist).toEqual(['npm run check*', 'npm test', 'git log', 'git log *', 'git status', 'git status *', 'git diff', 'git diff *', 'git show', 'git show *', 'git ls-files', 'git ls-files *', 'git grep', 'git grep *']);
    expect(classes.get('repository')?.egress).toBe('anthropic');
  });

  it('loads all four reader classes and the three judge classes, each with a non-empty neutral sentence', () => {
    const classes = loadClasses();
    expect([...classes.keys()].sort()).toEqual([
      'docs-and-binary', 'docs-and-site', 'docs-only', 'judge-adjudicator', 'judge-agreement', 'judge-catch', 'repository',
    ]);
    for (const decl of classes.values()) expect(decl.description.trim().length).toBeGreaterThan(0);
  });

  it('scopes docs-and-site to its own npm scripts and docs-and-binary to read-only cairn subcommands', () => {
    const classes = loadClasses();
    const docsAndSite = classes.get('docs-and-site');
    const docsAndBinary = classes.get('docs-and-binary');
    expect(docsAndSite).toMatchObject({ contents: 'prepared', tools: ['Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash'], egress: 'anthropic' });
    expect(docsAndSite?.bashAllowlist).toEqual(['npm run *', 'npm install*']);
    expect(docsAndBinary).toMatchObject({ contents: 'prepared', tools: ['Read', 'Grep', 'Glob', 'Bash'], egress: 'operator' });
    expect(docsAndBinary?.bashAllowlist).toEqual([
      'cairn sites list',
      'cairn health*',
      'cairn logs*',
      'cairn doctor*',
      'cairn auth list',
      'cairn auth check*',
    ]);
  });

  it('gives docs-and-binary a reader-local state directory and the two scoped credential names', () => {
    const docsAndBinary = loadClasses().get('docs-and-binary');
    expect(docsAndBinary?.env).toMatchObject({ CAIRN_STATE_DIR: '/reader/job/state', CAIRN_CF_ACCOUNT_ID: '120c269ad6d3dfbe6d63a0bb53758ca0' });
    expect(docsAndBinary?.secretEnv).toEqual(['CAIRN_CF_READ_TOKEN', 'CAIRN_GH_READ_TOKEN']);
  });

  it('accepts a valid declaration', () => {
    expect(validateClass(valid, egressNames)).toEqual([]);
  });

  it('refuses a web tool, a Bash allowlist without Bash, a reserved variable, and an unknown egress class', () => {
    expect(validateClass({ ...valid, tools: ['Read', 'WebFetch'] }, egressNames)).toContain('tool "WebFetch" is not grantable');
    expect(validateClass({ ...valid, bashAllowlist: ['npm test'] }, egressNames)).toContain(
      'bashAllowlist is set but tools does not grant Bash',
    );
    expect(validateClass({ ...valid, env: { ANTHROPIC_API_KEY: 'x' } }, egressNames)).toContain(
      'env name "ANTHROPIC_API_KEY" is reserved for the runner',
    );
    expect(validateClass({ ...valid, secretEnv: ['CLAUDE_CODE_OAUTH_TOKEN'] }, egressNames)).toContain(
      'secretEnv name "CLAUDE_CODE_OAUTH_TOKEN" is reserved for the runner',
    );
    expect(validateClass({ ...valid, egress: 'open' }, egressNames).join()).toMatch(/egress must be one of/);
  });

  it('builds the confined headless flags, with the variadic allowlist last', () => {
    const classes = loadClasses();
    const repo = classes.get('repository');
    const docsOnly = classes.get('docs-only');
    if (!repo || !docsOnly) throw new Error('the repository and docs-only classes must be declared');
    const args = claudeArgs(repo, 'claude-opus-5-5', { type: 'object' });
    for (const flag of ['-p', '--safe-mode', '--restricted', '--strict-mcp-config', '--verbose', '--no-session-persistence']) {
      expect(args).toContain(flag);
    }
    expect(args).toContain('--tools=Read,Write,Edit,Grep,Glob,Bash');
    expect(args).toContain('--disallowedTools=WebFetch,WebSearch');
    expect(args[args.indexOf('--permission-prompts') + 1]).toBe('none');
    expect(args[args.indexOf('--output-format') + 1]).toBe('stream-json');
    expect(args.slice(args.indexOf('--allowedTools'))).toEqual(['--allowedTools', 'Bash(npm run check*)', 'Bash(npm test)', 'Bash(git log)', 'Bash(git log *)', 'Bash(git status)', 'Bash(git status *)', 'Bash(git diff)', 'Bash(git diff *)', 'Bash(git show)', 'Bash(git show *)', 'Bash(git ls-files)', 'Bash(git ls-files *)', 'Bash(git grep)', 'Bash(git grep *)']);
    expect(claudeArgs(docsOnly, 'm', {})).not.toContain('--allowedTools');
  });

  it('expects the declared tools plus the structured-report tool in the init event', () => {
    expect(expectedTools(valid)).toEqual(['Glob', 'Grep', 'Read', 'StructuredOutput']);
  });

  it('gives each judge class no Bash and no secrets, mountable through the same prepared-contents pathway', () => {
    const classes = loadClasses();
    for (const name of ['judge-catch', 'judge-adjudicator', 'judge-agreement']) {
      const decl = classes.get(name);
      expect(decl, name).toMatchObject({ contents: 'prepared', tools: ['Read', 'Grep', 'Glob'], bashAllowlist: [], secretEnv: [], egress: 'anthropic' });
    }
  });

  it('maps each judge class name to its manifest model key, and an ordinary class to none', () => {
    expect(judgeKindForClass('judge-catch')).toBe('catchJudge');
    expect(judgeKindForClass('judge-adjudicator')).toBe('adjudicator');
    expect(judgeKindForClass('judge-agreement')).toBe('agreement');
    expect(judgeKindForClass('docs-only')).toBeUndefined();
  });
});
