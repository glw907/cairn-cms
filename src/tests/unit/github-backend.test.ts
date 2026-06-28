import { describe, it, expect, afterEach, vi } from 'vitest';
import { githubApp, makeGithubBackend } from '../../lib/github/backend.js';
import { CairnError } from '../../lib/diagnostics/index.js';
import { GithubDouble } from './_github-double.js';

const CONFIG = {
  owner: 'glw907',
  repo: 'ecnordic-ski',
  branch: 'main',
  appId: '3847496',
  installationId: '135372268',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('githubApp provider', () => {
  it('exposes the github-app kind, branch, and identity fields', () => {
    const provider = githubApp(CONFIG);
    expect(provider.kind).toBe('github-app');
    expect(provider.branch).toBe('main');
    expect(provider.owner).toBe('glw907');
    expect(provider.repo).toBe('ecnordic-ski');
    expect(provider.appId).toBe('3847496');
    expect(provider.installationId).toBe('135372268');
  });

  it('connect(env) yields a Backend whose defaultBranch is the configured branch', () => {
    const provider = githubApp(CONFIG);
    const backend = provider.connect({ GITHUB_APP_PRIVATE_KEY_B64: 'a2V5' });
    expect(backend.defaultBranch).toBe('main');
  });

  it('throws the appCredentials CairnError on first token use when the key secret is unset', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const backend = githubApp(CONFIG).connect({});
    let thrown: unknown;
    try {
      await backend.branchHead('main');
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(CairnError);
    expect((thrown as CairnError).conditionId).toBe('github.app-unreachable');
  });
});

describe('makeGithubBackend live implementation', () => {
  it('reads a file through the contents API at the requested ref', async () => {
    const gh = new GithubDouble({ main: { 'src/content/posts/a.md': '# A' } });
    gh.install();
    const backend = makeGithubBackend(CONFIG, () => 'test-token');

    const raw = await backend.readFile('src/content/posts/a.md', 'main');
    expect(raw).toBe('# A');

    const read = gh.calls.find((c) => c.method === 'GET' && c.url.includes('/contents/'));
    expect(read?.url).toContain('/repos/glw907/ecnordic-ski/contents/src/content/posts/a.md');
    expect(read?.url).toContain('ref=main');
  });

  it('commits through the atomic Git Data sequence', async () => {
    const gh = new GithubDouble({ main: { 'a.md': 'old' } });
    gh.install();
    const backend = makeGithubBackend(CONFIG, () => 'test-token');

    const sha = await backend.commit(
      'main',
      [{ path: 'a.md', content: 'new' }],
      { name: 'Geoff', email: 'g@907.life' },
      'Update a',
    );

    expect(typeof sha).toBe('string');
    expect(gh.read('main', 'a.md')).toBe('new');
    const treePost = gh.calls.find((c) => c.method === 'POST' && /\/git\/trees$/.test(c.url));
    const commitPost = gh.calls.find((c) => c.method === 'POST' && /\/git\/commits$/.test(c.url));
    expect(treePost).toBeDefined();
    expect(commitPost).toBeDefined();
  });

  it('createBranch resolves the source head with a GET before the refs POST', async () => {
    const gh = new GithubDouble({ main: { 'a.md': 'x' } });
    gh.install();
    const backend = makeGithubBackend(CONFIG, () => 'test-token');

    await backend.createBranch('cairn/posts/hello', 'main');

    const getIdx = gh.calls.findIndex(
      (c) => c.method === 'GET' && /\/git\/ref\/heads\/main$/.test(c.url),
    );
    const postIdx = gh.calls.findIndex((c) => c.method === 'POST' && /\/git\/refs$/.test(c.url));
    expect(getIdx).toBeGreaterThanOrEqual(0);
    expect(postIdx).toBeGreaterThan(getIdx);
    expect(gh.branches.has('cairn/posts/hello')).toBe(true);
  });

  it('createBranch throws CommitConflictError when the source branch has no head', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const backend = makeGithubBackend(CONFIG, () => 'test-token');

    await expect(backend.createBranch('cairn/posts/x', 'missing')).rejects.toThrow(/unreadable source/);
  });
});
