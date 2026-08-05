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
import { CONTENT_SIGNAL } from '../delivery/robots.js';
import type { AiPosture } from '../content/types.js';
import { fail, pass, skip } from './types.js';
import type { CheckResult, DoctorCheck, DoctorContext } from './types.js';
import { readWranglerConfig } from './wrangler-config.js';

const NO_URL: CheckResult = skip(
  'set PUBLIC_ORIGIN in the wrangler vars, or set PUBLIC_ORIGIN in the environment'
);

// Lowercased token to its canonical spelling. RFC 9309 section 2.2.1 matches product tokens
// case-insensitively, so a file writing `gptbot` declines the same crawler `GPTBot` does.
const AI_TOKENS = new Map(AI_CRAWLERS.map((crawler) => [crawler.token.toLowerCase(), crawler.token]));

/** Strip whitespace and case so a comparison never hinges on comma-spacing. */
function canonicalizeSignal(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

// The two Content-Signal values buildRobots emits, read from the builder rather than transcribed.
// A copy that drifted from the builder would make cairn's own robots.txt read here as a file some
// other layer wrote, which is the one conclusion this check must never reach by accident.
const CANONICAL_DECLINE = canonicalizeSignal(CONTENT_SIGNAL.decline);
const CANONICAL_INVITE = canonicalizeSignal(CONTENT_SIGNAL.invite);

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

/**
 * Read the structural facts the case decision needs off any RFC 9309 shaped file, including ones
 * cairn did not write. Consecutive `User-agent` lines share one rule set (RFC 9309 section 2.2.1),
 * so a file naming seven agents above a single `Disallow: /` declines all seven; crediting only the
 * last would report a genuinely declining site as contradicting itself. Product tokens match
 * case-insensitively, as that same section requires.
 */
function parseRobots(text: string): ParsedRobots {
  let userAgentStarCount = 0;
  let foreignContentSignal = false;
  let contentSignal: string | undefined;
  const declinedTokens = new Set<string>();
  // The agents of the group being read, and whether a rule has closed it. A `User-agent` line
  // after a rule starts a new group; one directly after another joins the current group.
  let currentAgents: string[] = [];
  let groupHasRule = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const agent = /^user-agent:\s*(.+)$/i.exec(line);
    if (agent) {
      if (groupHasRule) {
        currentAgents = [];
        groupHasRule = false;
      }
      const token = agent[1].trim();
      currentAgents.push(token);
      if (token === '*') userAgentStarCount += 1;
      continue;
    }
    const signal = /^content-signal:\s*(.+)$/i.exec(line);
    if (signal) {
      const canonical = canonicalizeSignal(signal[1]);
      if (canonical === CANONICAL_DECLINE || canonical === CANONICAL_INVITE) {
        contentSignal = canonical;
      } else {
        foreignContentSignal = true;
      }
      groupHasRule = true;
      continue;
    }
    const disallow = /^disallow:\s*(.+)$/i.exec(line);
    if (!disallow) continue;
    groupHasRule = true;
    if (disallow[1].trim() !== '/') continue;
    for (const token of currentAgents) {
      const match = AI_TOKENS.get(token.toLowerCase());
      if (match !== undefined) declinedTokens.add(match);
    }
  }

  return { userAgentStarCount, foreignContentSignal, contentSignal, declinedTokens };
}

/**
 * What the served file itself states, read off its `Content-Signal` or its per-crawler groups. One
 * declined token is enough to read the file as declining. Requiring every token in the table would
 * mean a site's already-deployed file starts reading as a contradiction the day a release adds a
 * token to the table, without the site changing anything.
 */
function observedPosture(parsed: ParsedRobots): AiPosture | undefined {
  if (parsed.contentSignal === CANONICAL_INVITE) return 'invite';
  if (parsed.contentSignal === CANONICAL_DECLINE) return 'decline';
  if (parsed.declinedTokens.size > 0) return 'decline';
  return undefined;
}

/**
 * What the served file shows of a layer other than cairn writing into it, or undefined when it
 * shows none. Two `User-agent: *` groups is the shape Cloudflare's managed robots.txt produces,
 * since it prepends to the origin's file rather than replacing it. A single group carrying an
 * unfamiliar `Content-Signal` is not that shape, so it reports the directive without naming a
 * cause: a hand-written file expressing its own search preference lands here, and telling its
 * author to go hunting in the Cloudflare dashboard would send them after a setting that does not
 * exist.
 */
function describeOutsideLayer(parsed: ParsedRobots, target: URL): string | undefined {
  if (parsed.userAgentStarCount > 1) {
    const signal = parsed.foreignContentSignal
      ? ', along with a Content-Signal directive cairn did not write'
      : '';
    return (
      `${target} carries ${parsed.userAgentStarCount} "User-agent: *" groups${signal}, which is ` +
      "the shape Cloudflare's managed robots.txt produces when it prepends to the origin's own " +
      'file. This check cannot see or assert why the zone is configured that way; look at the ' +
      "zone's robots.txt and AI Crawl Control settings in the Cloudflare dashboard."
    );
  }
  if (parsed.foreignContentSignal) {
    return (
      `${target} carries a Content-Signal directive cairn did not write, so something other than ` +
      'this engine is writing directives into the served file. The file carries one ' +
      '"User-agent: *" group, so this is not the prepend shape a managed robots.txt produces, and ' +
      'this check cannot see what wrote it.'
    );
  }
  return undefined;
}

/**
 * Decide and report one of the three cases: no stance, a contradiction, or an outside layer.
 *
 * The declared posture is compared against the served file first, and an outside layer is reported
 * alongside that comparison rather than instead of it. Returning early on the managed shape would
 * bury the case this check exists for, since a site declaring `invite` under a managed robots.txt
 * that declines is exactly the incident that motivated it, and reporting only the managed layer
 * would never mention that the site's stated stance is not the served one.
 */
function evaluate(declared: AiPosture | undefined, text: string, target: URL): CheckResult {
  const parsed = parseRobots(text);
  const observed = observedPosture(parsed);
  const outside = describeOutsideLayer(parsed, target);
  const suffix = outside ? ` ${outside}` : '';

  if (declared !== undefined && declared !== observed) {
    return fail(
      `aiPosture is '${declared}', but ${target} carries ` +
        (observed === undefined
          ? 'no directives consistent with it'
          : `directives consistent with '${observed}' instead`) +
        `.${suffix}`
    );
  }

  if (declared !== undefined) {
    return pass(
      `aiPosture is '${declared}', and ${target} carries directives consistent with it.${suffix}`
    );
  }

  if (outside) {
    return pass(`no AI posture is stated (aiPosture is unset). ${outside}`);
  }

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
