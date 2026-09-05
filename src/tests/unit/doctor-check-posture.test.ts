import { describe, it, expect } from 'vitest';
import { postureEffective } from '../../lib/doctor/check-posture.js';
import { defaultChecks } from '../../lib/doctor/assemble.js';
import { buildRobots } from '../../lib/delivery/robots.js';
import { AI_CRAWLERS } from '../../lib/delivery/ai-crawlers.js';
import { condition } from '../../lib/diagnostics/index.js';
import type { DoctorContext } from '../../lib/doctor/types.js';

const ORIGIN = 'https://site.example';

function ctx(over: Partial<DoctorContext> = {}): DoctorContext {
  return {
    cwd: '/site',
    publicOrigin: ORIGIN,
    fetch: (() => {
      throw new Error('unexpected fetch');
    }),
    readFile: async () => null,
    ...over,
  };
}

function robotsResponse(body: string): typeof fetch {
  return (async () => new Response(body, { status: 200 })) as unknown as typeof fetch;
}

// Captured verbatim with `curl -sS https://ecxc.ski/robots.txt` on 2026-08-05: cairn's own
// output only, the clean single-group shape, from a site that states no AI posture.
const ECXC_CLEAN = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: https://ecxc.ski/sitemap.xml
`;

// Captured verbatim with `curl -sS https://907.life/robots.txt` on 2026-08-05: Cloudflare's
// managed content-signal block and ten crawler disallows, prepended ahead of cairn's own
// second "User-agent: *" group (Allow: / plus Disallow: /admin, no Content-Signal), from a
// site that likewise states no AI posture today.
const NINE_OH_SEVEN_MANAGED = `# As a condition of accessing this website, you agree to abide by the following
# content signals:

# (a)  If a Content-Signal = yes, you may collect content for the corresponding
#      use.
# (b)  If a Content-Signal = no, you may not collect content for the
#      corresponding use.
# (c)  If the website operator does not include a Content-Signal for a
#      corresponding use, the website operator neither grants nor restricts
#      permission via Content-Signal with respect to the corresponding use.

# The content signals and their meanings are:

# search:   building a search index and providing search results (e.g., returning
#           hyperlinks and short excerpts from your website's contents). Search does not
#           include providing AI-generated search summaries.
# ai-input: inputting content into one or more AI models (e.g., retrieval
#           augmented generation, grounding, or other real-time taking of content for
#           generative AI search answers).
# ai-train: training or fine-tuning AI models.
# use:      how AI systems may consume the content (immediate, reference, or full).

# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF
# RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790 ON COPYRIGHT
# AND RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.

# BEGIN Cloudflare Managed content

User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /

User-agent: Amazonbot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: CloudflareBrowserRenderingCrawler
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: meta-externalagent
Disallow: /

# END Cloudflare Managed Content

User-agent: *
Allow: /
Disallow: /admin

Sitemap: https://907.life/sitemap.xml
`;

describe('ai.posture-effective', () => {
  it('is registered in the default check registry', () => {
    expect(defaultChecks()).toContain(postureEffective);
  });

  it('carries the id and conditionId the report resolves by', () => {
    expect(postureEffective.id).toBe('ai.posture-effective');
    expect(postureEffective.conditionId).toBe('ai.posture-not-effective');
    // The report resolves a failed check's conditionId against the registry and throws on a miss,
    // so an unregistered id would turn the one failing case into a crash.
    expect(condition(postureEffective.conditionId).remediation).toBeTruthy();
  });

  describe('case 1: no stance stated', () => {
    it('passes, naming the absence, against ecxc.ski\'s clean single-group file', async () => {
      const result = await postureEffective.run(
        ctx({ fetch: robotsResponse(ECXC_CLEAN), aiPosture: undefined })
      );
      expect(result.status).toBe('pass');
      expect(result.detail).toContain('no AI posture is stated');
      expect(result.detail).toContain('no AI-crawler directives');
    });
  });

  describe('case 3: a managed layer overriding what cairn emitted', () => {
    it('passes, naming the dashboard, against 907.life\'s two-group managed-prepend file', async () => {
      const result = await postureEffective.run(
        ctx({ fetch: robotsResponse(NINE_OH_SEVEN_MANAGED), aiPosture: undefined })
      );
      expect(result.status).toBe('pass');
      expect(result.detail).toContain('2 "User-agent: *" groups');
      expect(result.detail).toContain('Content-Signal directive cairn did not write');
      expect(result.detail).toContain('AI Crawl Control settings are where to look first');
      // The unset posture and the managed layer are both named. Reporting only the layer would
      // leave the operator unable to tell which of the two facts the check actually observed.
      expect(result.detail).toContain('no AI posture is stated');
    });

    it('does not claim to know why the zone is configured that way', async () => {
      const result = await postureEffective.run(
        ctx({ fetch: robotsResponse(NINE_OH_SEVEN_MANAGED), aiPosture: 'decline' })
      );
      expect(result.status).toBe('pass');
      expect(result.detail).toContain('cannot see what or assert why');
    });

    it('carries none of the honesty-banned "blocks AI training" phrasing', async () => {
      const clean = await postureEffective.run(ctx({ fetch: robotsResponse(ECXC_CLEAN) }));
      const managed = await postureEffective.run(
        ctx({ fetch: robotsResponse(NINE_OH_SEVEN_MANAGED), aiPosture: 'decline' })
      );
      for (const result of [clean, managed]) {
        expect(result.detail.toLowerCase()).not.toContain('blocks ai training');
      }
    });
  });

  describe('case 2: a stated stance the live site contradicts', () => {
    it('fails, naming the mismatch, when decline is stated but the live file carries nothing', async () => {
      const result = await postureEffective.run(
        ctx({ fetch: robotsResponse(ECXC_CLEAN), aiPosture: 'decline' })
      );
      expect(result.status).toBe('fail');
      expect(result.detail).toContain("aiPosture is 'decline'");
      expect(result.detail).toContain('no directives consistent with it');
    });

    it('fails, naming the mismatch, when invite is stated but the live file declines', async () => {
      const declineBody = buildRobots({
        sitemapUrl: 'https://site.example/sitemap.xml',
        disallow: ['/admin'],
        posture: 'decline',
      });
      const result = await postureEffective.run(
        ctx({ fetch: robotsResponse(declineBody), aiPosture: 'invite' })
      );
      expect(result.status).toBe('fail');
      expect(result.detail).toContain("aiPosture is 'invite'");
      expect(result.detail).toContain("consistent with 'decline' instead");
    });

    it('passes, confirming a match, when decline is stated and the live file declines', async () => {
      const declineBody = buildRobots({
        sitemapUrl: 'https://site.example/sitemap.xml',
        disallow: ['/admin'],
        posture: 'decline',
      });
      const result = await postureEffective.run(
        ctx({ fetch: robotsResponse(declineBody), aiPosture: 'decline' })
      );
      expect(result.status).toBe('pass');
      expect(result.detail).toContain('carries directives consistent with it');
    });
  });

  describe('offline skip', () => {
    it('skips, naming the failure, when fetch rejects', async () => {
      const rejecting = (async () => {
        throw new Error('getaddrinfo ENOTFOUND site.example');
      }) as unknown as typeof fetch;
      const result = await postureEffective.run(ctx({ fetch: rejecting }));
      expect(result.status).toBe('skip');
      expect(result.detail).toContain('could not reach');
      expect(result.detail).toContain('ENOTFOUND');
    });

    it('skips when the response is not 200', async () => {
      const notFound = (async () => new Response('', { status: 404 })) as unknown as typeof fetch;
      const result = await postureEffective.run(ctx({ fetch: notFound }));
      expect(result.status).toBe('skip');
      expect(result.detail).toContain('404');
    });
  });

  describe('no-origin skip', () => {
    it('skips with a remediation line naming the missing input', async () => {
      const result = await postureEffective.run(
        ctx({
          publicOrigin: undefined,
          fetch: (() => {
            throw new Error('unexpected fetch');
          }),
        })
      );
      expect(result.status).toBe('skip');
      expect(result.detail).toContain('PUBLIC_ORIGIN');
    });
  });

  it('prefers the wrangler-config origin over the environment, like the live probe', async () => {
    const wranglerJsonc = JSON.stringify({ vars: { PUBLIC_ORIGIN: 'https://from-wrangler.example' } });
    const calls: string[] = [];
    const fetchSpy = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response(ECXC_CLEAN, { status: 200 });
    }) as unknown as typeof fetch;
    await postureEffective.run(
      ctx({
        publicOrigin: 'https://from-env.example',
        readFile: async (relPath) => (relPath === 'wrangler.jsonc' ? wranglerJsonc : null),
        fetch: fetchSpy,
      })
    );
    expect(calls).toEqual(['https://from-wrangler.example/robots.txt']);
  });
});

// The cases Review B proved reachable: each one is a served file a real operator could produce on
// which the check previously misreported. They are grouped apart from the three headline cases
// because each exists to pin a specific misreport, not to describe the check's normal shape.
describe('ai.posture-effective, served files the check used to misread', () => {
  it('fails, naming both facts, when a declared invite meets a managed layer that declines', async () => {
    // The incident this check exists for. Reporting only the managed layer would never tell the
    // operator their stated stance is not the served one, which is the whole gap being surfaced.
    const result = await postureEffective.run(
      ctx({ fetch: robotsResponse(NINE_OH_SEVEN_MANAGED), aiPosture: 'invite' })
    );
    expect(result.status).toBe('fail');
    expect(result.detail).toContain("aiPosture is 'invite'");
    expect(result.detail).toContain("consistent with 'decline' instead");
    expect(result.detail).toContain('AI Crawl Control settings are where to look first');
  });

  it('reads consecutive User-agent lines as one group, per RFC 9309', async () => {
    // A hand-written declining file. Crediting only the last agent would report this genuinely
    // declining site as contradicting its own declared posture.
    const grouped = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      '',
      ...AI_CRAWLERS.map((c) => `User-agent: ${c.token}`),
      'Disallow: /',
      '',
      'Sitemap: https://site.example/sitemap.xml',
      '',
    ].join('\n');
    const result = await postureEffective.run(
      ctx({ fetch: robotsResponse(grouped), aiPosture: 'decline' })
    );
    expect(result.status).toBe('pass');
    expect(result.detail).toContain('consistent with it');
  });

  it('matches a crawler token case-insensitively, per RFC 9309', async () => {
    const lowercased = [
      'User-agent: *',
      'Allow: /',
      '',
      'User-agent: gptbot',
      'Disallow: /',
      '',
      'Sitemap: https://site.example/sitemap.xml',
      '',
    ].join('\n');
    const result = await postureEffective.run(
      ctx({ fetch: robotsResponse(lowercased), aiPosture: 'decline' })
    );
    expect(result.status).toBe('pass');
  });

  it('does not blame Cloudflare for a single-group file carrying its own Content-Signal', async () => {
    // One group is not the prepend shape, so sending this operator to the dashboard would send
    // them after a setting that does not exist. cairn emits ai-train=no alone, so any site also
    // expressing a search preference lands here.
    const ownSignal = [
      'User-agent: *',
      'Content-Signal: search=yes, ai-train=no',
      'Allow: /',
      'Disallow: /admin',
      '',
      'Sitemap: https://site.example/sitemap.xml',
      '',
    ].join('\n');
    const result = await postureEffective.run(ctx({ fetch: robotsResponse(ownSignal) }));
    expect(result.status).toBe('pass');
    expect(result.detail).toContain('cairn did not write');
    expect(result.detail).not.toContain('Cloudflare');
    expect(result.detail).toContain('not the prepend shape');
  });

  it('still reads a file as declining when it covers only some of the table', async () => {
    // A site's deployed file does not change when a release adds a token to the table, so
    // requiring full coverage would fail it retroactively on the developer's next upgrade.
    const partial = [
      'User-agent: *',
      'Allow: /',
      '',
      `User-agent: ${AI_CRAWLERS[0].token}`,
      'Disallow: /',
      '',
      'Sitemap: https://site.example/sitemap.xml',
      '',
    ].join('\n');
    const result = await postureEffective.run(
      ctx({ fetch: robotsResponse(partial), aiPosture: 'decline' })
    );
    expect(result.status).toBe('pass');
  });

  it("recognizes the builder's own invite output, so cairn never reads its own file as foreign", async () => {
    // CANONICAL_INVITE derives from the builder rather than a transcription, and this is the
    // round trip that holds the two together.
    const body = buildRobots({
      sitemapUrl: 'https://site.example/sitemap.xml',
      disallow: ['/admin'],
      posture: 'invite',
    });
    const result = await postureEffective.run(ctx({ fetch: robotsResponse(body), aiPosture: 'invite' }));
    expect(result.status).toBe('pass');
    expect(result.detail).toContain('consistent with it');
    expect(result.detail).not.toContain('cairn did not write');
  });
});
