import { describe, it, expect } from 'vitest';
import { postureEffective } from '../../lib/doctor/check-posture.js';
import { defaultChecks } from '../../lib/doctor/assemble.js';
import { buildRobots } from '../../lib/delivery/robots.js';
import { condition } from '../../lib/diagnostics/index.js';
import type { DoctorContext } from '../../lib/doctor/types.js';

const ORIGIN = 'https://site.example';

function ctx(over: Partial<DoctorContext> = {}): DoctorContext {
  return {
    cwd: '/site',
    publicOrigin: ORIGIN,
    fetch: (() => {
      throw new Error('unexpected fetch');
    }) as never,
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
      expect(result.detail).toContain('Cloudflare dashboard');
      expect(result.detail).not.toContain('no AI posture is stated');
    });

    it('does not claim to know why the zone is configured that way', async () => {
      const result = await postureEffective.run(
        ctx({ fetch: robotsResponse(NINE_OH_SEVEN_MANAGED), aiPosture: 'decline' })
      );
      expect(result.status).toBe('pass');
      expect(result.detail).toContain('cannot see or assert why');
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
          }) as never,
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
