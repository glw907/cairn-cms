// The tool's honest cost picture, carried once at the top of a fresh run so an owner learns the
// whole story before typing a site name, not at the moment a bill arrives. Chapter 2's own
// admission (src/cloudflare/chapter2.mjs) restates the Workers Paid price at the moment it asks
// for it; this preamble is what lets that restatement stand on a floor the owner already has.
//
// No prompt lives here: nothing is decided at this point in the run, so there is nothing to ask.

/** The date every figure below is pinned to, since Email Sending is in beta and none of these
 * numbers is a hardcoded promise. */
const AS_OF = 'as of 2026-08-11';
/** Cloudflare's own Workers pricing page, backing the $5 Workers Paid figure. */
const WORKERS_PRICING_URL = 'https://developers.cloudflare.com/workers/platform/pricing/';
/** Cloudflare's own Registrar page, backing the domain-registration range. */
const REGISTRAR_URL = 'https://developers.cloudflare.com/registrar/';

/**
 * Build the cost preamble: the four things an owner needs to know about money before starting,
 * in order, each figure dated and linked.
 * @returns {string} the preamble, ready to print as one block
 */
export function costPreamble() {
  return [
    'Before you start, the honest cost picture.',
    '',
    'Building and running this site is free, and stays free.',
    '',
    'A domain name costs roughly $10 to $15 a year. You pay that to a registrar, not to ' +
      `Cloudflare, and it costs that from anyone (${AS_OF}, ${REGISTRAR_URL}).`,
    '',
    "Cloudflare's Workers Paid plan costs $5 US per month. It is what sends sign-in email, so " +
      'it is needed once anyone other than you signs in, and it is billed once per account, ' +
      `not once per site (${AS_OF}, ${WORKERS_PRICING_URL}).`,
    '',
    'All in, a small site on its own domain runs about $6 a month.',
  ].join('\n');
}

/**
 * Print the cost preamble, but only on a fresh run: a resumed run has already seen it, and
 * printing it again would be noise. `log` is the same injectable print seam every other hop in
 * this tool uses, so a test can capture the output without touching the real console.
 * @param {{ log: (line: string) => void, isFreshRun: boolean }} args
 * @returns {void}
 */
export function printCostPreamble({ log, isFreshRun }) {
  if (!isFreshRun) return;
  log(costPreamble());
}
