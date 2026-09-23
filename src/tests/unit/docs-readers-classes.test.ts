import { describe, it, expect } from 'vitest';
import {
  claudeArgs,
  expectedTools,
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
    expect(classes.get('repository')?.bashAllowlist).toEqual(['npm run check*', 'npm test', 'make -C tool check']);
    expect(classes.get('repository')?.egress).toBe('anthropic');
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
    expect(args.slice(args.indexOf('--allowedTools'))).toEqual([
      '--allowedTools',
      'Bash(npm run check*)',
      'Bash(npm test)',
      'Bash(make -C tool check)',
    ]);
    expect(claudeArgs(docsOnly, 'm', {})).not.toContain('--allowedTools');
  });

  it('expects the declared tools plus the structured-report tool in the init event', () => {
    expect(expectedTools(valid)).toEqual(['Glob', 'Grep', 'Read', 'StructuredOutput']);
  });
});
