// cairn-doctor's live AI-posture probe: a plain GET against the deployed origin's
// /robots.txt, needing no credential, which is what lets it sit in defaultChecks() rather than
// behind a flag. It reports what the served file actually carries, distinct from what the
// adapter states, since only a live fetch can see a managed layer (Cloudflare's AI Crawl
// Control or its managed robots.txt) prepending its own rules ahead of cairn's own output; that
// prepend shape was measured on three of the four estate zones.
//
// One case fails: a site that declares an aiPosture the served file does not carry, since a
// stated stance crawlers never read is a broken deployment and a PASS line would bury it. A site
// that declares nothing passes, because absence is honest, and so does a managed layer prepending
// its own rules, because whether that is wanted belongs to the zone's owner and is unreadable
// from a robots.txt body. A run with no origin to reach, or a fetch that did not answer, skips:
// a doctor run offline must not read as an AI-posture problem. The report names the Cloudflare
// dashboard as where to look for cause and never asserts why a zone is configured as it is.
import { AI_CRAWLERS } from '../delivery/ai-crawlers.js';
import type { AiPosture } from '../content/types.js';
import { fail, pass, skip } from './types.js';
import type { CheckResult, DoctorCheck, DoctorContext } from './types.js';
import { readWranglerConfig } from './wrangler-config.js';

const NO_URL: CheckResult = skip(
  'set PUBLIC_ORIGIN in the wrangler vars, or set PUBLIC_ORIGIN in the environment'
);

const AI_TOKENS = new Set(AI_CRAWLERS.map((crawler) => crawler.token));

// The two Content-Signal values buildRobots ever emits, canonicalized (whitespace stripped,
// lowercased) so the comparison never hinges on comma-spacing: Cloudflare's managed robots.txt
// writes the same directive with no space after each comma, where cairn writes one.
const CANONICAL_DECLINE = 'ai-train=no';
const CANONICAL_INVITE = 'search=yes,ai-train=yes';

/** The live AI-posture probe: fetches /robots.txt off the deployed origin and reports it as-is. */
export const postureEffective: DoctorCheck = {
  id: 'ai.posture-effective',
  conditionId: 'ai.posture-not-effective',
  title: 'AI posture, effective',
  async run(ctx: DoctorContext): Promise<CheckResult> {
    // The wrangler vars hold the value the deployed Worker reads, so they beat the local
    // environment, the same precedence the public-origin and live-probe checks apply.
    const base = (await readWranglerConfig(ctx.readFile))?.publicOrigin ?? ctx.publicOrigin;
    if (base === undefined) return NO_URL;
    let origin: URL;
    try {
      origin = new URL(base);
    } catch {
      return skip(`probe URL does not parse: ${base}`);
    }
    const target = new URL('/robots.txt', origin);
    let res: Response;
    try {
      res = await ctx.fetch(String(target));
    } catch (err) {
      return skip(
        `could not reach ${target}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    if (res.status !== 200) {
      return skip(`GET /robots.txt returned ${res.status}, expected 200`);
    }
    return evaluate(ctx.aiPosture, await res.text(), target);
  },
};

interface ParsedRobots {
  /** How many `User-agent: *` lines the file carries; cairn's own output writes exactly one. */
  userAgentStarCount: number;
  /** A `Content-Signal` line present whose value matches neither of cairn's own two shapes. */
  foreignContentSignal: boolean;
  /** The one `Content-Signal` value that does match a cairn shape, canonicalized, if any. */
  contentSignal?: string;
  /** AI_CRAWLERS tokens carrying their own `User-agent: <token>` / `Disallow: /` pair. */
  declinedTokens: Set<string>;
}

/** Read the structural facts the case decision needs; tolerant of any well-formed robots.txt. */
function parseRobots(text: string): ParsedRobots {
  let userAgentStarCount = 0;
  let foreignContentSignal = false;
  let contentSignal: string | undefined;
  const declinedTokens = new Set<string>();
  let currentAgent: string | undefined;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const agent = /^user-agent:\s*(.+)$/i.exec(line);
    if (agent) {
      currentAgent = agent[1].trim();
      if (currentAgent === '*') userAgentStarCount += 1;
      continue;
    }
    const signal = /^content-signal:\s*(.+)$/i.exec(line);
    if (signal) {
      const canonical = signal[1].replace(/\s+/g, '').toLowerCase();
      if (canonical === CANONICAL_DECLINE || canonical === CANONICAL_INVITE) {
        contentSignal = canonical;
      } else {
        foreignContentSignal = true;
      }
      continue;
    }
    const disallow = /^disallow:\s*(.+)$/i.exec(line);
    if (
      disallow &&
      currentAgent !== undefined &&
      currentAgent !== '*' &&
      disallow[1].trim() === '/' &&
      AI_TOKENS.has(currentAgent)
    ) {
      declinedTokens.add(currentAgent);
    }
  }

  return { userAgentStarCount, foreignContentSignal, contentSignal, declinedTokens };
}

/** What the served file itself states, read off its Content-Signal or its per-crawler groups. */
function observedPosture(parsed: ParsedRobots): AiPosture | undefined {
  if (parsed.contentSignal === CANONICAL_INVITE) return 'invite';
  if (parsed.contentSignal === CANONICAL_DECLINE) return 'decline';
  if (AI_CRAWLERS.every((crawler) => parsed.declinedTokens.has(crawler.token))) return 'decline';
  return undefined;
}

/** Decide and report one of the three cases: no stance, a contradiction, or a managed override. */
function evaluate(declared: AiPosture | undefined, text: string, target: URL): CheckResult {
  const parsed = parseRobots(text);

  if (parsed.userAgentStarCount > 1 || parsed.foreignContentSignal) {
    const groups = `${parsed.userAgentStarCount} "User-agent: *" group${parsed.userAgentStarCount === 1 ? '' : 's'}`;
    const signal = parsed.foreignContentSignal ? ' and a Content-Signal directive cairn did not write' : '';
    return pass(
      `${target} carries ${groups}${signal}. A layer outside cairn, most likely the zone's ` +
        "Cloudflare AI Crawl Control or its managed robots.txt, appears to be prepending its own " +
        'rules ahead of (or instead of) cairn\'s own output. This check cannot see or assert why ' +
        "the zone is configured that way; look at the zone's robots.txt and AI Crawl Control " +
        'settings in the Cloudflare dashboard.'
    );
  }

  const observed = observedPosture(parsed);

  if (declared === undefined) {
    if (observed === undefined) {
      return pass(
        `no AI posture is stated (aiPosture is unset), and ${target} carries no AI-crawler ` +
          'directives, consistent with stating nothing.'
      );
    }
    return pass(
      `no AI posture is stated (aiPosture is unset), but ${target} carries directives ` +
        `consistent with '${observed}'. Set aiPosture explicitly if that is deliberate.`
    );
  }

  if (declared === observed) {
    return pass(`aiPosture is '${declared}', and ${target} carries directives consistent with it.`);
  }

  return fail(
    `aiPosture is '${declared}', but ${target} carries ` +
      (observed === undefined
        ? 'no directives consistent with it'
        : `directives consistent with '${observed}' instead`) +
      '.'
  );
}
