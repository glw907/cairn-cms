// The rendered runner's finding vocabulary: every builder that turns a raw rule verdict or an
// allowlist-bookkeeping fact into the report's own `Finding` shape, plus `resolveRenderedFindings`,
// the pure resolver that reconciles raw findings against the allowlist. A live page carries no
// source text, so every finding here is positionless (`line`/`start`/`end` all zero); that is the
// one fact `positionless` writes down once for every builder in this file.
import type { Finding, Tier } from '../types.js';
import type { RenderedAllowlistEntry } from '../config.js';
import type { InteractionState, PageIdentity, RenderedPageVisit, ResolvedRenderedFinding, Theme } from './types.js';

const STALE_ALLOWLIST_RULE_ID = 'rendered.allowlist-stale';
const UNPROBEABLE_ALLOWLIST_RULE_ID = 'rendered.allowlist-unprobeable';
const DEAD_ALLOWLIST_RULE_ID = 'rendered.allowlist-dead';
const PAGE_IDENTITY_RULE_ID = 'rendered.page-identity-mismatch';
const STATE_UNREACHABLE_RULE_ID = 'rendered.state-unreachable';

/**
 * States whose unreachability gets its own report line, on top of {@link RenderedPageVisit.statesUnreached}
 * already recording it for the allowlist path. `menu-open` is deliberately absent: most admin pages
 * carry no menu trigger, and giving every one of those its own advisory line would drown the report
 * in noise nobody asked for; that stays the pre-existing, silent skip. `row-expanded` is different
 * because the whole reason it exists is `panel-width`'s motivating half, and a reader of a clean
 * report needs to know the panel half never got a chance to run on a page with no `ExpandableRow`,
 * rather than reading silence as "no panel defects here."
 */
export const SURFACED_UNREACHED_STATES = new Set<InteractionState>(['row-expanded']);

/**
 * The finding raised once per page when a state in {@link SURFACED_UNREACHED_STATES} was declared by
 * a registered rule but never reached there. Advisory: an ordinary page that carries no matching
 * component (no `ExpandableRow`, here) is not a defect, only a rule that ran on a subset of what a
 * fuller page set would cover.
 */
export function stateUnreachableFinding(pagePath: string, state: InteractionState): Finding {
  return positionless({
    ruleId: STATE_UNREACHABLE_RULE_ID,
    tier: 'advisory',
    file: pagePath,
    message:
      `the ${state} interaction state was never reached on this page, so a rule that reads only that ` +
      `state raised nothing here. That is expected on a page carrying no matching trigger, not a clean ` +
      `verdict from the rule itself.`,
  });
}

/**
 * A rendered finding in the report's own `Finding` shape. A live page carries no source text, so
 * every position is zero; this is the one place that fact is written down.
 */
export function positionless(finding: Pick<Finding, 'ruleId' | 'tier' | 'file' | 'message'>): Finding {
  return { ...finding, line: 0, start: 0, end: 0 };
}

/**
 * A rendered finding in the report's `Finding` shape. `exemptionHonored` is false for a rule-declared
 * exemption this resolver refused, which prints as a refusal rather than as an exemption: a reader
 * of a gating line needs to know a rule asked for silence and did not get it, and printing
 * `(exempt: ...)` beside a finding that gates would be a report contradicting itself.
 */
export function toFinding(rf: ResolvedRenderedFinding, exemptionHonored = true, allowlisted = false): Finding {
  // The exemption rides in the message rather than in a field of its own on `Finding`, because
  // the report's whole job with a suppressed line is to print it: an allowlisted finding's reason
  // lives in the config a reader can open, and a rule's own exception has no such file.
  let note = '';
  if (rf.exemption !== undefined) {
    if (exemptionHonored) {
      note = ` (exempt: ${rf.exemption})`;
    } else if (allowlisted) {
      // A refused exemption on a finding the ALLOWLIST then suppressed used to print "refused
      // because an error-tier finding gates" from under the report's `Suppressed:` header, which is
      // the report contradicting itself, the one thing this function exists to prevent. Where the
      // line actually ends up decides which sentence it carries.
      note = ` (the allowlist suppressed this; the rule's own exemption was refused, since an error-tier finding gates: ${rf.exemption})`;
    } else {
      note = ` (the rule claimed an exemption, refused because an error-tier finding gates: ${rf.exemption})`;
    }
  }
  return positionless({
    ruleId: rf.ruleId,
    tier: rf.tier,
    file: `${rf.page} [${rf.theme}, ${rf.state}]`,
    message: `${rf.selector}: ${rf.message}${note}`,
  });
}

export function staleFinding(entry: RenderedAllowlistEntry, tier: Tier): Finding {
  return positionless({
    ruleId: STALE_ALLOWLIST_RULE_ID,
    tier,
    file: entry.page,
    message:
      `the rendered allowlist names ${entry.selector} on ${entry.page}, but nothing there matched it in ` +
      `any captured theme or state. A stale entry is how a real finding disappears: fix the selector or ` +
      `remove the entry. (reason on file: ${entry.reason})`,
  });
}

/**
 * The finding an allowlist entry raises when the browser could not parse its selector at all. A
 * refused selector is not evidence of staleness, so reporting it as one both misnames the problem
 * and, because the staleness finding gates, lets an ADVISORY rule reach the exit code: an
 * adversarial pass demonstrated exactly that, allowlisting an advisory finding whose selector
 * carried a Tailwind variant class (`div.flex.lg:ml-56`) and getting `exit 1`. This one is
 * advisory, so no suppression a developer writes can turn a non-gating rule into a gating one.
 */
export function unprobeableFinding(entry: RenderedAllowlistEntry): Finding {
  return positionless({
    ruleId: UNPROBEABLE_ALLOWLIST_RULE_ID,
    tier: 'advisory',
    file: entry.page,
    message:
      `the rendered allowlist names ${entry.selector} on ${entry.page}, but the browser refused to parse it ` +
      `as a CSS selector, so neither a match nor a staleness verdict is possible. Escape the selector ` +
      `(CSS.escape covers Tailwind's \`:\` and \`[]\` class syntax) so the entry can be checked. ` +
      `(reason on file: ${entry.reason})`,
  });
}

/**
 * The finding an allowlist entry raises when its selector still matches an element but no rule
 * raised anything for it. The staleness check keys on the SELECTOR, so a fix that removed the
 * finding while the element stayed put leaves an entry that suppresses nothing and can never be
 * reported: it reads as a legitimate exemption forever, and the next real finding on that selector
 * disappears into it. `suppress.ts` calls the static twin of this a dead directive and errors on it
 * for the same reason. Tiered like the staleness finding, so a dead entry covering an advisory rule
 * cannot become the path by which a non-gating rule reaches the exit code.
 */
export function deadFinding(entry: RenderedAllowlistEntry, tier: Tier): Finding {
  return positionless({
    ruleId: DEAD_ALLOWLIST_RULE_ID,
    tier,
    file: entry.page,
    message:
      `the rendered allowlist names ${entry.selector} on ${entry.page}, and it still matches an element, but ` +
      `nothing there raised a finding for it in any captured theme or state, so the entry suppresses nothing. ` +
      `An exemption that has outlived its finding is where the next real one goes to hide: remove the entry. ` +
      `(reason on file: ${entry.reason})`,
  });
}

/**
 * The finding an allowlist entry raises when its selector still matches but the run could not reach
 * every interaction state the rules declare, so "nothing raised a finding for it" is a claim about
 * an incomplete run rather than about the page. Advisory and worded as a withheld verdict, because
 * the remedy {@link deadFinding} prescribes, removing the entry, is the WRONG move here: the next
 * run that does reach the state would then gate on the real finding the entry covers.
 *
 * `runRendered` produces exactly this subset on any page with no popup trigger, which the default
 * page list includes, so the gating verdict had to be conditional on coverage rather than on the
 * caller doing something unusual.
 */
export function unreachedStateFinding(entry: RenderedAllowlistEntry, unreached: InteractionState[]): Finding {
  return positionless({
    ruleId: DEAD_ALLOWLIST_RULE_ID,
    tier: 'advisory',
    file: entry.page,
    message:
      `the rendered allowlist names ${entry.selector} on ${entry.page}, and it still matches an element, but ` +
      `nothing raised a finding for it in what this run reached. The run never reached ${unreached.join(', ')} ` +
      `on that page, so whether the entry is dead cannot be decided here: check it against a page that reaches ` +
      `that state before removing it. (reason on file: ${entry.reason})`,
  });
}

/**
 * The finding an allowlist entry raises when the page-identity guard refused its named page
 * entirely: no rule ran and no selector was ever probed, so stale and dead are both the wrong
 * verdict, only withheld. Advisory for the same reason {@link unreachedStateFinding} is: the remedy
 * a stale or dead finding prescribes, removing the entry, is wrong here too, since the entry may
 * still be exactly right once the route's hydration is fixed. It reuses the dead-allowlist rule id
 * anyway, the same reuse {@link unreachedStateFinding} makes, so a consumer filtering on the
 * allowlist-hygiene ids still sees it; the advisory tier and the wording carry the withholding.
 */
export function identityRefusedFinding(entry: RenderedAllowlistEntry): Finding {
  return positionless({
    ruleId: DEAD_ALLOWLIST_RULE_ID,
    tier: 'advisory',
    file: entry.page,
    message:
      `the rendered allowlist names ${entry.selector} on ${entry.page}, but the page-identity guard refused to ` +
      `audit that route in this run (see the rendered.page-identity-mismatch finding), so whether the entry is ` +
      `stale or dead cannot be decided here. (reason on file: ${entry.reason})`,
  });
}

/**
 * The finding the runner raises when a page's post-hydration DOM no longer matches the identity its
 * SSR response carried: a named harness finding, not a rule finding, since no rule ever got to look
 * at this page. Error tier: an admin route that hydrates into unrelated chrome is a real defect, not
 * a compositional judgment a rule might reasonably differ on, and a harness that reported clean here
 * anyway is the trust failure this guard exists to close (the two ASC edit desks were measured this
 * way, silently, for 58 findings against the wrong page).
 */
export function pageIdentityMismatchFinding(pagePath: string, theme: Theme, ssr: PageIdentity, hydrated: PageIdentity): Finding {
  const describe = (identity: PageIdentity) =>
    `"${identity.title}"${identity.landmark ? ` (landmark ${identity.landmark})` : ''}`;
  return positionless({
    ruleId: PAGE_IDENTITY_RULE_ID,
    tier: 'error',
    file: `${pagePath} [${theme}]`,
    message:
      `${pagePath} served ${describe(ssr)} from the server, but settled into ${describe(hydrated)} after ` +
      `hydration. The rules never ran here: this route is reported unmeasurable rather than audited under the ` +
      `wrong page's identity. Fix the client-side mismatch, or drop the route from rendered.pages if it ` +
      `genuinely cannot render stably.`,
  });
}

/**
 * Resolve raw rendered findings against the allowlist: an exact page+selector match suppresses, and
 * every allowlist entry that never matched anything the run actually visited becomes its own
 * finding rather than silently doing nothing. An entry whose selector the browser refused to parse
 * is reported separately and advisory, since "unreadable" is a different claim from "stale" (see
 * {@link unprobeableFinding}), and an entry that still matches an element while suppressing nothing
 * is reported as dead (see {@link deadFinding}).
 *
 * An ADVISORY rule may also exempt its own finding by giving it a reason
 * ({@link RenderedFinding.exemption}), which suppresses it here rather than inside the rule. The
 * routing is deliberately the same one the allowlist takes: an exception is a finding that was
 * raised, counted, and printed, never a branch a rule took before constructing one. On an
 * `error`-tier finding the reason is refused and the finding still gates, so no rule can write
 * itself out of the exit code.
 *
 * A stale entry is reported at the tier of the rule it names, which `ruleTiers` supplies, and at
 * `error` when it names none. Without that, suppressing an ADVISORY finding gated the build the
 * moment its selector churned, which is the one path by which a non-gating rule could reach the
 * exit code.
 *
 * This is a pure function over already-collected data, so the allowlist contract is testable
 * without a browser.
 */
export function resolveRenderedFindings(
  raw: ResolvedRenderedFinding[],
  visits: RenderedPageVisit[],
  allowlist: RenderedAllowlistEntry[],
  ruleTiers: Map<string, Tier> = new Map()
): { findings: Finding[]; suppressed: Finding[] } {
  const findings: Finding[] = [];
  const suppressed: Finding[] = [];
  const spent = new Set<RenderedAllowlistEntry>();
  for (const rf of raw) {
    // EVERY matching entry is spent, not just the first. Marking one left a duplicated row, an
    // ordinary result of a hand edit or a config merge, falling into the dead branch and gating the
    // build with a message asserting nothing raised a finding for that selector, one line under the
    // finding that had just been raised and suppressed for it.
    const matches = allowlist.filter((candidate) => candidate.page === rf.page && candidate.selector === rf.selector);
    for (const entry of matches) spent.add(entry);
    const allowlisted = matches.length > 0;
    const selfExempt = rf.exemption !== undefined && rf.tier !== 'error';
    const destination = allowlisted || selfExempt ? suppressed : findings;
    destination.push(toFinding(rf, selfExempt, allowlisted));
  }
  for (const entry of allowlist) {
    if (spent.has(entry)) continue;
    const visit = visits.find((candidate) => candidate.page === entry.page);
    if (visit?.identityRefused) {
      findings.push(identityRefusedFinding(entry));
      continue;
    }
    const tier = (entry.rule === undefined ? undefined : ruleTiers.get(entry.rule)) ?? 'error';
    if (visit?.selectorsSeen.has(entry.selector)) {
      const unreached = [...(visit.statesUnreached ?? [])].sort();
      findings.push(unreached.length > 0 ? unreachedStateFinding(entry, unreached) : deadFinding(entry, tier));
      continue;
    }
    findings.push(
      visit?.selectorsUnprobeable?.has(entry.selector) ? unprobeableFinding(entry) : staleFinding(entry, tier)
    );
  }
  return { findings, suppressed };
}
