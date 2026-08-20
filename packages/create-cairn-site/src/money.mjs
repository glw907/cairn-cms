// The tool's honest cost picture, carried once at the top of a fresh run so an owner learns the
// whole story before typing a site name, not at the moment a bill arrives. Chapter 2's own
// admission (src/cloudflare/chapter2.mjs) restates the Workers Paid price at the moment it asks
// for it; this preamble is what lets that restatement stand on a floor the owner already has.
//
// No prompt lives here: nothing is decided at this point in the run, so there is nothing to ask.

/** The date the pricing and registrar figures below are pinned to, since Email Sending is in
 * beta and none of these numbers is a hardcoded promise. */
const AS_OF = 'as of 2026-08-11';
/** Cloudflare's own Workers pricing page, backing the $5 Workers Paid figure. */
const WORKERS_PRICING_URL = 'https://developers.cloudflare.com/workers/platform/pricing/';
/**
 * Cloudflare's Registrar product page, which states the at-cost policy. Cloudflare publishes no
 * static price list anywhere, in docs or on the marketing site, because a domain's price is set
 * by its registry and is shown at purchase time. So this link backs the reason the range below
 * holds, which is that Cloudflare adds no markup, and never the range itself.
 */
const REGISTRAR_URL = 'https://www.cloudflare.com/products/registrar/';

/**
 * Build the cost preamble: the four things an owner needs to know about money before starting,
 * in order, each figure dated and linked, then the one line item nobody has confirmed. The
 * certificate question was open when the figures were researched and is open still, so the total
 * is stated as the sum of what is known rather than as the whole bill.
 * @returns {string} the preamble, ready to print as one block
 */
export function costPreamble() {
  return [
    'Before you start, the honest cost picture.',
    '',
    "Cloudflare's Workers Paid plan costs $5 US per month, billed once per account, not once " +
      `per site (${AS_OF}, ${WORKERS_PRICING_URL}). That runs your site on Cloudflare's own ` +
      'global network, from the day you deploy it.',
    '',
    'A domain name costs roughly $10 to $15 a year for the common endings. You pay that to a ' +
      'registrar, not to Cloudflare, and it costs about that from anyone. Cloudflare sells ' +
      `domains at cost, and shows you the exact price before you pay (${AS_OF}, ` +
      `${REGISTRAR_URL}).`,
    '',
    'Those two together come to about $6 a month for a small site on its own domain. The two ' +
      'databases this site uses, its storage bucket, and its GitHub repository cost nothing at ' +
      'this size, and stay free.',
    '',
    'One more item is not confirmed. Putting your site on your own domain issues a certificate ' +
      'for that domain, and Cloudflare does not say whether that certificate is included in your ' +
      `plan or charged as an add-on (${AS_OF}). Your first bill is where it would show up.`,
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
