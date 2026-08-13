// Chapter 2's orchestrator: the guided path from `live` (chapter 1's finish line) through the
// admin's own domain and, since T4b, on to sending its own sign-in mail. It is the ONLY module in
// this chapter that writes `step` or calls the state store; every producer it drives (account.mjs,
// prefill.mjs, zone.mjs, records.mjs, hostname.mjs, email.mjs) is pure over an in-memory record
// and returns its outcome, exactly as the T4a plan requires. Modelled directly on chapter.mjs
// (T3's own orchestrator): the same runStep/runActions idiom carries the dry-run guarantee (a
// title always prints, a detail prints only under --dry-run, and execute never runs under
// --dry-run), and the same step-gated resume shape skips whatever a saved record already
// finished.
//
// New states, in order: zone-created -> records-carried -> delegated -> domain-live ->
// email-onboarded -> email-live. A wait-class outcome (delegation still pending, the hostname
// still propagating, the certificate still issuing, the sending domain not yet enabled, a test
// send still inside its propagation window) is RETURNED, never thrown, and never advances `step`:
// a re-run re-detects from the same recorded step. Only an act or ask-someone row throws.
// `domain-live` is not a stopping point for this function: once the domain half's own completion
// hop has printed, execution runs straight into the email half's own admission in the same call,
// the same way every hop above it already re-validates the token on a resumed record rather than
// treating domain-live as finished.
//
// TOKEN LIFECYCLE: the pasted API token is deleted at a TERMINAL step: `email-live`, or a recorded
// decline of the paid plan. domain-live and email-onboarded are NOT terminal, since T4b's email
// half continues from either and needs the same credential; deleting it there would strand that
// later work. TERMINAL_STEPS names the states that really are done; reaching one deletes the token
// by an explicit whole-record rebuild and save, since state.mjs's own updateSite merge can never
// express removing a key. T4a implemented the rule and its keep half (domain-live keeps the
// token); T4b exercises the delete half for real: a decline writes `step: 'paid-plan-declined'`
// and deletes the token at the moment it happens, and a LATER re-entry at that same terminal step
// (this module's own top-of-function short-circuit) re-offers with the row's reoffered copy
// rather than returning silently, since a decline is a choice an owner can still reconsider.
//
// T4b.1 adds a SCOPE-FAILURE half to the same lifecycle: a saved token that still passes
// validateToken's read (prefill.mjs's own listZones probe) but lacks a write permission was
// otherwise a dead end, since nothing ever cleared it once a later WRITE call came back
// token-scope-missing or token-invalid. From the token step onward, this function's own body runs
// inside one try/catch; either of those two exact codes deletes the saved token before the error
// surfaces, so the re-run the row already tells the owner to do actually re-collects one instead
// of silently reusing the bad one. Every other thrown row (a park, a decline, any other act row)
// is untouched. The catalogue survives only on `error.cause` here: runActions (runner.mjs) rewraps
// a thrown error with its action's title before it reaches this catch, the same rewrap this
// module's own tests already work around by asserting on the message rather than `err.catalogue`.
import { confirm as clackConfirm, text as clackText, select as clackSelect, isCancel } from '@clack/prompts';
import { resolveNs as systemResolveNs } from 'node:dns/promises';
import { exitOnCancel, promptSecret } from '../prompts.mjs';
import { defineAction, runActions } from '../runner.mjs';
import { loadSite, updateSite, saveSite } from '../state.mjs';
import { ensureAccountId } from './account.mjs';
import { ensureApiToken } from './prefill.mjs';
import { makeApi } from './api.mjs';
import { ensureZone, checkDelegation, delegationInstructions } from './zone.mjs';
import { readCurrentRecords, carryOverRecords } from './records.mjs';
import { cutOverHostname } from './hostname.mjs';
import { defaultFromAddress, ensureSendingDomain, sendTestMessage } from './email.mjs';
import { writeEmailFrom } from './config.mjs';
import { buildSite, deployWorker } from './deploy.mjs';
import { cloudflareError } from './catalogue.mjs';
import { openBrowser as defaultOpenBrowser } from '../github/open.mjs';

/**
 * The states this pass's own step machine writes, in order, so a resumed record's remaining work
 * can be found by comparing indexes rather than repeating a chain of `if` checks.
 */
const STEP_ORDER = [
  'live',
  'zone-created',
  'records-carried',
  'delegated',
  'domain-live',
  'email-onboarded',
  'email-live',
];

/**
 * The step names that mean the chapter is fully done and the pasted token has no more work left
 * to do: `email-live` (the chapter's real finish line) and `paid-plan-declined` (an owner who
 * declined the paid plan, which is also a clean stop). Neither name appears in STEP_ORDER, since
 * reaching one short-circuits this function before any `hasReached` check ever runs against it.
 * @type {string[]}
 */
export const TERMINAL_STEPS = ['email-live', 'paid-plan-declined'];

/** Where a record without a recognized step falls in STEP_ORDER: treated as fresh, from `live`. */
function stepIndex(step) {
  const idx = STEP_ORDER.indexOf(step);
  return idx === -1 ? 0 : idx;
}

/**
 * True once a saved step has reached `target`, which is how each hop below decides whether a
 * resumed record already finished it. Each hop names the step it writes, so the guard reads as the
 * work it guards rather than as a position in STEP_ORDER.
 * @param {string | undefined} step the step on the record being resumed, if any
 * @param {string} target the step whose hop is about to run
 * @returns {boolean}
 */
function hasReached(step, target) {
  return stepIndex(step) >= STEP_ORDER.indexOf(target);
}

/** True once a step names a fully finished chapter, per TERMINAL_STEPS. */
function isTerminalStep(step) {
  return TERMINAL_STEPS.includes(step);
}

/**
 * Run one hop as a single-action batch through runActions, mirroring chapter.mjs's own `runStep`:
 * the hop's title always prints, its detail prints only under --dry-run, and `execute` never runs
 * under --dry-run.
 * @param {{ dryRun: boolean, log: (line: string) => void }} frame the run's dry-run frame and logger
 * @param {string} title the hop's title, always printed
 * @param {string} detail the hop's detail, printed only under --dry-run
 * @param {() => Promise<void>} execute the hop's real work; skipped under --dry-run
 * @returns {Promise<void>}
 */
async function runStep(frame, title, detail, execute) {
  await runActions([defineAction({ title, detail, execute })], frame);
}

/**
 * Delete the pasted API token from the state record: the terminal-state half of the token
 * lifecycle rule. `updateSite`'s merge can only add or overwrite a field, never remove one (its
 * own doc block), so this rebuilds the whole record without `cloudflare.apiToken` and saves it
 * directly, the same scrub `retireSite` already performs when a record is set aside. Always
 * reloads the record fresh from disk rather than trusting a caller's in-memory copy: this
 * function's callers below run after earlier hops in the same invocation may already have
 * written newer fields (a domain, a zoneId, a step) through `updateSite`, and a stale in-memory
 * record rebuilt here would silently discard them.
 * Exported for chapter3.mjs, which reuses this exact function rather than re-implementing the
 * reload-before-rebuild behavior above: chapter 2 already deletes its own saved token at ITS
 * terminal steps, so by the time chapter 3 runs there is nothing left for chapter 2's own callers
 * to accidentally double-delete, and chapter 3's own terminal steps need the identical rebuild.
 * @param {string} siteId the site id to save under
 * @returns {Promise<void>}
 */
export async function deleteApiToken(siteId) {
  const current = await loadSite(siteId);
  if (!current?.cloudflare || !('apiToken' in current.cloudflare)) return;
  const { apiToken: _apiToken, ...cloudflareWithoutToken } = current.cloudflare;
  await saveSite(siteId, { ...current, cloudflare: cloudflareWithoutToken });
}

/**
 * Ask for the domain until a non-empty answer comes back, the interactive counterpart of
 * `--domain`. An empty submit is nudged rather than accepted, since every hop after this one keys
 * off the name.
 * @param {typeof clackText} text the free-text prompt to ask through
 * @param {(line: string) => void} log receives the nudge printed after an empty submit
 * @returns {Promise<string>} the trimmed domain the admin entered
 */
async function askForDomain(text, log) {
  for (;;) {
    const answer = await text({
      message: 'Which domain do you want to connect? (for example, example.com)',
    });
    if (isCancel(answer)) exitOnCancel();
    const entered = (answer ?? '').trim();
    if (entered) return entered;
    log('Please enter a domain name.');
  }
}

const ADMISSION_DETAIL =
  'Connects a domain you already own (registered anywhere, not just at Cloudflare) to your ' +
  'site. This costs nothing: creating the Cloudflare zone and connecting your domain both run ' +
  "on the free plan. You'll paste a Cloudflare API token (one browser trip to create it) and " +
  "switch your domain's nameservers to Cloudflare at your registrar; that switch can take " +
  'anywhere from a few minutes to 48 hours to take effect. Your site keeps working at its ' +
  'workers.dev address the whole time.';

const CARRY_OVER_DETAIL =
  "Looks up your domain's current DNS records and, once you confirm, copies them into the new " +
  'zone so nothing already working (like your mail) breaks when you switch over.';

/** The carry-over hop's copy on the already-active path, printed in place of CARRY_OVER_DETAIL. */
const ALREADY_ACTIVE_DETAIL =
  "Your domain's nameservers already point at Cloudflare in this zone, so there's nothing to " +
  'copy: whatever DNS records this zone already serves are your existing records, and they ' +
  'stay untouched.';

/**
 * The email half's own admission, restating the price at the moment of the ask (T4b ruling 6):
 * chapter 1's consent copy already said nothing up to here costs money, and this is the point
 * where that stops being the whole story. Every figure carries its date and a link, since Email
 * Sending is in beta; the copy also says what the plan is not, since it is easy to mistake a
 * per-account subscription for a traffic-based upgrade.
 */
const EMAIL_ADMISSION_DETAIL =
  "Cloudflare's Workers Paid plan costs $5 US per month, as of 2026-08-11 " +
  '(https://developers.cloudflare.com/workers/platform/pricing/), billed once per Cloudflare ' +
  "account rather than once per site. It is what sends this site's sign-in email, so it is " +
  'needed once anyone other than you needs to sign in. It is not a scaling upgrade: your ' +
  "site's traffic has nothing to do with it.";

/**
 * @typedef {object} RunChapter2Input
 * @property {string} siteId the site's state-store id; the only id this module ever writes under
 * @property {object | null} record the site's current in-memory state record, already loaded by
 *  the caller (mirrors the `{ record, ... }` pure-step shape every producer above takes); `null`
 *  under --dry-run, chapter 1's own `dryRun ? null` precedent
 * @property {string} dir the scaffolded directory, used in printed copy; read independently of
 *  `record.dir` so a dry run with no record still has it
 * @property {{ yes: boolean, domain?: string, email?: boolean }} args the parsed CLI flags this
 *  chapter reads: `yes` for an unattended run, `domain` carrying both the value and the domain
 *  half's unattended opt-in, `email` the same for the email half's own admission
 * @property {(line: string) => void} log receives one printed line per call
 * @property {boolean} dryRun when true, every hop's title and detail print and nothing executes
 * @property {(url: string, log: (line: string) => void) => Promise<void>} [openBrowser] opens the
 *  admin's browser to the create-token page; defaults to open.mjs's own opener
 * @property {typeof clackConfirm} [confirm] the yes/no prompt; a test seam, defaulting to
 *  @clack/prompts' own
 * @property {typeof clackText} [text] the free-text prompt; the same kind of test seam as `confirm`
 * @property {typeof clackSelect} [select] the account picker prompt `ensureAccountId` uses; the
 *  same kind of test seam as `confirm` and `text`
 * @property {(message: string) => Promise<string>} [promptSecretFn] the token paste prompt,
 *  forwarded to `ensureApiToken`; a test seam defaulting to prompts.mjs's own `promptSecret`
 * @property {typeof makeApi} [makeApiFn] builds the Cloudflare API client; a test seam defaulting
 *  to api.mjs's own `makeApi`
 * @property {typeof fetch} [fetchImpl] the fetch implementation the cutover's confirm probes with;
 *  a test seam forwarded to `cutOverHostname`
 * @property {(domain: string) => Promise<string[]>} [resolveNs] the NS lookup forwarded to
 *  `checkDelegation`; a test seam defaulting to `node:dns/promises`' own `resolveNs`
 * @property {(servers?: string[]) => object} [resolve] the resolver factory forwarded to
 *  `readCurrentRecords`; a test seam, defaulting to that module's own
 * @property {Record<string, string | undefined>} [env] the environment `ensureApiToken` reads
 *  `CAIRN_CF_API_TOKEN` from under `yes`; defaults to `process.env`
 * @property {string[]} [argv] the argument vector `ensureApiToken` scans for a mistakenly-passed
 *  token; defaults to `process.argv.slice(2)`
 */

/**
 * Run chapter 2: connect the admin's own domain to the already-deployed site. Re-entry reads the
 * step already reached on `record` and skips whatever hop that step already finished; a wait
 * outcome (still-pending delegation, a still-propagating hostname, a certificate not yet issued)
 * is returned rather than thrown, and never advances `step`, so the very next invocation
 * re-detects from the same recorded point. Only an act or ask-someone row throws.
 *
 * `domain-live` is this pass's own last step but is not treated as fully finished: re-entering at
 * it still re-validates (and, if needed, re-prefills) the API token, since T4b's email half
 * continues from here and needs it.
 * @param {RunChapter2Input} input the chapter's inputs
 * @returns {Promise<{ outcome: string, domain?: string, state?: string, message?: string }>} the
 *  outcome reached: `'admission-declined'` | `'carry-over-declined'` | `'delegation-pending'` |
 *  `'delegation-propagating'` | `'hostname-records-absent'` | `'certificate-pending'` |
 *  `'paid-plan-declined'` | `'email-not-ready'` | `'email-sender-propagating'` |
 *  `'email-daily-limit'` | `'email-live'` | `'dry-run'`, or, for a record already at one of
 *  TERMINAL_STEPS, that step's own name. A delegation park also carries the row's own `state` and
 *  printed `message`
 */
export async function runChapter2({
  siteId,
  record,
  dir,
  args,
  log,
  dryRun,
  openBrowser = defaultOpenBrowser,
  confirm = clackConfirm,
  text = clackText,
  select = clackSelect,
  promptSecretFn = promptSecret,
  makeApiFn = makeApi,
  fetchImpl = fetch,
  resolveNs = systemResolveNs,
  resolve,
  env = process.env,
  argv = process.argv.slice(2),
}) {
  const frame = { dryRun, log };

  if (!dryRun && isTerminalStep(record?.step)) {
    await deleteApiToken(siteId);
    // A re-entry at a recorded decline is not silently ignored: the owner can still change their
    // mind, and this is the one place that later re-run would ever be told so. `email-live`
    // prints nothing here, since its own completion hop already said everything once, on the run
    // that reached it; bin.mjs's own closing print covers a later re-entry there.
    if (record.step === 'paid-plan-declined') {
      log(cloudflareError('paid-plan-declined', { dir, reoffered: true }).message);
    }
    return { outcome: record.step };
  }

  let domain = record?.cloudflare?.domain;
  let accountId = record?.cloudflare?.accountId;
  let zoneId = record?.cloudflare?.zoneId;
  let nameServers = record?.cloudflare?.nameServers;
  let alreadyActive = record?.cloudflare?.alreadyActive ?? false;
  let token = record?.cloudflare?.apiToken;
  const ownerEmail = record?.ownerEmail;

  // --- Admission: consent, then the domain itself. Only asked from `live`; a resumed record past
  // it already answered both, and re-asking would repeat a browser-adjacent decision for nothing.
  if (!hasReached(record?.step, 'zone-created')) {
    let consented = false;
    await runStep(frame, 'Connect your own domain', ADMISSION_DETAIL, async () => {
      log(ADMISSION_DETAIL);
      if (args.yes && !args.domain) {
        log(
          'Skipping the domain chapter: --yes was given with no --domain. Re-run with --domain ' +
            '<name> (for example --domain example.com) to connect one unattended, or without ' +
            '--yes to be asked.',
        );
        consented = false;
        return;
      }
      if (args.yes && args.domain) {
        consented = true;
        domain = args.domain;
        return;
      }
      const answer = await confirm({ message: 'Connect a domain you own to this site now? (Free.)' });
      if (isCancel(answer)) exitOnCancel();
      if (!answer) {
        consented = false;
        log(`No domain connected. Re-run npx create-cairn-site --dir ${dir} any time to connect one.`);
        return;
      }
      consented = true;
      domain = args.domain || (await askForDomain(text, log));
    });
    if (!dryRun && !consented) {
      return { outcome: 'admission-declined' };
    }
  }

  // --- Account selection: cheap and silent when chapter 1 already saved an id (the common case),
  // per account.mjs's own zero-enumeration branch. Runs on every invocation, including a resumed
  // one, since it costs nothing when nothing changed.
  await runStep(
    frame,
    'Find your Cloudflare account',
    'Confirms the Cloudflare account your site already deployed to.',
    async () => {
      const result = await ensureAccountId({ record, dir, yes: args.yes, prompt: select, log });
      accountId = result.accountId;
      if (result.learned && !dryRun) {
        await updateSite(siteId, { cloudflare: { accountId } });
      }
    },
  );

  // Wrapped in one try/catch from the token step onward (T4b.1): every call in this block
  // that can raise token-scope-missing or token-invalid, starting with the token step itself,
  // must clear the saved token before the error surfaces. A plain try/catch, not an extracted
  // function, so every `return` below still returns from runChapter2 itself.
  try {
    // --- Token: resolved (and, if needed, re-prefilled) on every invocation, including a resumed
    // one, so a re-entry at `domain-live` still leaves a working credential for T4b's email half.
    await runStep(
      frame,
      'Get a Cloudflare API token',
      "Opens Cloudflare's create-token page with the permissions this chapter needs already " +
        'filled in, and asks you to paste the token back.',
      async () => {
        token = await ensureApiToken({ record, log, openBrowser, yes: args.yes, promptSecretFn, env, argv });
        if (!dryRun && token !== record?.cloudflare?.apiToken) {
          await updateSite(siteId, { cloudflare: { apiToken: token } });
        }
      },
    );

    const api = makeApiFn({ token, accountId, dir });

    // --- Zone create: only from `live`/pre-`zone-created`; a resumed record already carries
    // zoneId/nameServers.
    if (!hasReached(record?.step, 'zone-created')) {
      await runStep(
        frame,
        'Create your Cloudflare zone',
        'Creates a Cloudflare zone for your domain, or reuses one this account already holds.',
        async () => {
          const result = await ensureZone({ record: { dir, cloudflare: { domain } }, api, log });
          zoneId = result.zoneId;
          nameServers = result.nameServers;
          alreadyActive = result.alreadyActive;
        },
      );
      if (!dryRun) {
        await updateSite(siteId, {
          step: 'zone-created',
          cloudflare: { domain, zoneId, nameServers, alreadyActive },
        });
      }
    }

    // --- Records read + carry-over gate: only from `zone-created`. A decline is recorded by its
    // own printed copy and never silently advances; the next invocation re-shows the same gate.
    // When the zone arrived already active (the Cloudflare-registrar path, or any domain this
    // account already holds and serves), there is nothing to carry over: the zone's own records
    // already ARE the admin's records. readCurrentRecords refuses to run past that point anyway
    // (its own guard: a probe would read this tool's own writes), so this skips both the read and
    // the gate entirely rather than letting that refusal surface as a developer-facing exception.
    if (!hasReached(record?.step, 'records-carried')) {
      let declined = false;
      // carryOver.outcome is 'carried' when records were copied, or 'not-needed' when the zone
      // arrived already active. A decline leaves this undefined: that path returns before reaching
      // updateSite, so the gate re-shows on the next invocation instead.
      let carryOver;
      await runStep(
        frame,
        'Copy your current DNS records',
        alreadyActive ? ALREADY_ACTIVE_DETAIL : CARRY_OVER_DETAIL,
        async () => {
          if (alreadyActive) {
            log(ALREADY_ACTIVE_DETAIL);
            carryOver = { outcome: 'not-needed', at: new Date().toISOString() };
            return;
          }
          const { records, lowConfidence } = await readCurrentRecords({ domain, dir, resolve });
          const result = await carryOverRecords({
            api,
            zoneId,
            records,
            lowConfidence,
            confirm: async (message) => {
              log(message);
              if (args.yes) {
                // An unattended run copies the list, because NOT copying is what breaks an admin's
                // mail once the domain switches over. It refuses only when the read itself was
                // unreliable: a recursive resolver can answer "no such record" from a cache that
                // has not expired yet, and a list quietly missing its MX rows looks exactly like a
                // domain with no mail. Copying that without a human reading it first would break
                // mail and report success, which is the failure this whole gate exists to prevent.
                if (lowConfidence) throw cloudflareError('records-unverified', { dir, domain });
                log('Unattended run: copying the records found above automatically.');
                return true;
              }
              const answer = await confirm({ message: 'Copy these records into the new zone?' });
              if (isCancel(answer)) exitOnCancel();
              return answer;
            },
            log,
          });
          if (result.outcome === 'declined') {
            declined = true;
            log(cloudflareError('carry-over-declined', { dir }).message);
            return;
          }
          carryOver = {
            outcome: 'carried',
            at: new Date().toISOString(),
            count: result.count,
            types: result.types,
          };
        },
      );
      if (!dryRun && declined) {
        return { outcome: 'carry-over-declined' };
      }
      if (!dryRun) {
        await updateSite(siteId, { step: 'records-carried', cloudflare: { carryOver } });
      }
    }

    // --- Delegation: only from `records-carried`. Pending or still-propagating parks with the
    // instructions printed; wrong nameservers is an act row, thrown; only `active` advances.
    if (!hasReached(record?.step, 'delegated')) {
      let delegationOutcome;
      let waitError;
      await runStep(
        frame,
        'Wait for your domain to switch to Cloudflare',
        "Checks whether your domain's nameservers have switched to Cloudflare yet, and shows the " +
          'pair to set at your registrar if not.',
        async () => {
          const state = await checkDelegation({
            record: { cloudflare: { zoneId, nameServers, domain, alreadyActive } },
            api,
            resolveNs,
          });
          if (state === 'active') {
            delegationOutcome = 'active';
            return;
          }
          if (state === 'propagating') {
            // Distinct from delegation-pending, and deliberately not given the registrar
            // instructions: the nameservers are already correct here, so the admin has nothing to
            // do. Printing "go change your nameservers" would send someone who did the work
            // correctly back to undo it.
            waitError = cloudflareError('delegation-propagating', { dir, domain, nameServers });
            log(waitError.message);
            delegationOutcome = state;
            return;
          }
          if (state === 'wrong-nameservers') {
            // checkDelegation already did its own NS lookup to reach this state but reports only
            // the state name, not what it found (zone.mjs's own contract); a second lookup here is
            // the cost of naming the actual pair in the row's copy rather than leaving it blank.
            const actual = await resolveNs(domain).catch(() => []);
            throw cloudflareError('delegation-wrong-nameservers', { dir, domain, nameServers, actual });
          }
          // 'pending': the domain has not been repointed yet, so this is the one delegation state
          // where the admin still has work to do at their registrar. delegationInstructions prints
          // the how-to; the row's own message (logged next) carries the re-run next step.
          log(delegationInstructions(nameServers));
          waitError = cloudflareError('delegation-pending', { dir, domain, nameServers });
          log(waitError.message);
          delegationOutcome = state;
        },
      );
      if (!dryRun && delegationOutcome !== 'active') {
        return {
          // The park names the row the admin actually saw, so a pending wait and a propagating one
          // are distinguishable by a caller and in a log, not just in the printed copy.
          outcome: waitError?.catalogue?.code ?? 'delegation-pending',
          domain,
          state: delegationOutcome,
          message: waitError?.message,
        };
      }
      if (!dryRun) {
        await updateSite(siteId, { step: 'delegated' });
      }
    }

    // --- Cutover: only from `delegated`. Still-propagating or certificate-pending parks; anything
    // else that is not `live` (resolved-but-wrong-site, the attach itself, the redeploy) throws.
    if (!hasReached(record?.step, 'domain-live')) {
      let cutoverOutcome;
      await runStep(
        frame,
        'Connect your domain to your site',
        'Connects your domain to your already-deployed site, confirms it answers there, then ' +
          "switches your site's own address over and redeploys once.",
        async () => {
          const result = await cutOverHostname({
            record: {
              dir,
              cloudflare: {
                domain,
                zoneId,
                workerName: record?.cloudflare?.workerName,
                accountId,
                url: record?.cloudflare?.url,
              },
            },
            api,
            fetchImpl,
            log,
          });
          cutoverOutcome = result.outcome;
        },
      );
      if (!dryRun && cutoverOutcome !== 'live') {
        // cutOverHostname itself returns only the outcome name, the same pure-step contract every
        // other producer in this chapter follows; this is the one place that turns a wait outcome
        // into the row an admin actually reads, the same way the delegation park above does.
        const parkError = cloudflareError(cutoverOutcome, { dir, domain });
        log(parkError.message);
        return { outcome: cutoverOutcome, domain, message: parkError.message };
      }
      if (!dryRun) {
        await updateSite(siteId, { step: 'domain-live' });
      }
    }

    // --- Domain completion: reached once the cutover just succeeded or a resumed record was
    // already at `domain-live`. domain-live is not terminal (TERMINAL_STEPS above): execution below
    // continues straight into the email half's own admission rather than stopping here.
    await runStep(
      frame,
      'Finish connecting your domain',
      'Prints your domain and its admin sign-in link.',
      async () => {
        log(
          `${domain} is now live and connected to your site. Sign in at https://${domain}/admin. ` +
            'Your workers.dev address keeps working too.',
        );
      },
    );

    // --- Email admission: the price, restated at the moment of the ask (T4b ruling 6). Only asked
    // while step has not yet reached email-onboarded; once onboarding has actually succeeded, this
    // is never re-asked. A decline writes the terminal step directly (rather than going through
    // TERMINAL_STEPS' own short-circuit, which only fires on a LATER re-entry) and deletes the
    // token at the point it happens, per the terminal-state token rule.
    if (!hasReached(record?.step, 'email-onboarded')) {
      let emailConsented = false;
      const reoffered = Boolean(record?.cloudflare?.emailDeclinedAt);
      await runStep(frame, 'Turn on email sign-in', EMAIL_ADMISSION_DETAIL, async () => {
        log(EMAIL_ADMISSION_DETAIL);
        if (args.yes && !args.email) {
          log(
            'Skipping email sign-in: --yes was given with no --email. Re-run with --email to turn ' +
              'it on unattended, or without --yes to be asked.',
          );
          emailConsented = false;
          return;
        }
        if (args.yes && args.email) {
          emailConsented = true;
          return;
        }
        const answer = await confirm({
          message: "Turn on Cloudflare's Workers Paid plan now, so anyone besides you can sign in?",
        });
        if (isCancel(answer)) exitOnCancel();
        emailConsented = Boolean(answer);
      });
      if (!dryRun && !emailConsented) {
        const declineErr = cloudflareError('paid-plan-declined', { dir, reoffered });
        log(declineErr.message);
        await updateSite(siteId, {
          step: 'paid-plan-declined',
          cloudflare: { emailDeclinedAt: new Date().toISOString() },
        });
        await deleteApiToken(siteId);
        return { outcome: 'paid-plan-declined' };
      }
    }

    // --- Onboard the sending domain, then poll once. Only from before email-onboarded; a resumed
    // record past it already carries emailOnboardedAt, read below regardless of which run set it.
    let onboardedAt = record?.cloudflare?.emailOnboardedAt;
    if (!hasReached(record?.step, 'email-onboarded')) {
      let onboardEnabled = false;
      await runStep(
        frame,
        'Onboard your domain for email',
        'Turns on Cloudflare Email Sending for your domain, reading first so a resumed run never ' +
          'onboards it twice.',
        async () => {
          const result = await ensureSendingDomain({ api, zoneId, domain, record });
          onboardEnabled = result.enabled;
          if (result.enabled) {
            onboardedAt = result.onboardedAt;
            return;
          }
          log(cloudflareError('email-not-ready', { dir, domain }).message);
        },
      );
      if (!dryRun && !onboardEnabled) {
        return { outcome: 'email-not-ready', domain };
      }
      if (!dryRun) {
        await updateSite(siteId, { step: 'email-onboarded', cloudflare: { emailOnboardedAt: onboardedAt } });
      }
    }

    // --- Test send: proves the sending path before the redeploy, on purpose, since a redeploy is
    // pointless when the sender path itself is broken. Unconditional past this point: a resumed
    // record repeats this call every time, which is both cheap and the point, proving acceptance
    // again on every re-run rather than only the first. Acceptance is all a send call can ever
    // observe; Cloudflare returns 200 the moment it takes the message, well before any receiver
    // decides whether to deliver it.
    const from = defaultFromAddress(domain);
    let sendWaitError;
    await runStep(
      frame,
      'Send a test sign-in email',
      `Sends one message from ${from} to your saved sign-in address, proving Cloudflare accepts ` +
        'a message from that address.',
      async () => {
        try {
          await sendTestMessage({ api, from, to: ownerEmail, onboardedAt });
        } catch (err) {
          // email.mjs classifies a send failure with no `dir` in hand (its own interface omits it
          // and `record`); this rebuilds each of its three reclassified rows with this chapter's
          // real `dir` (and `domain`, where the row takes one) before it is ever printed or
          // returned, the same "classify now, name later" split hostname.mjs's own wait outcomes
          // already use. Anything else (including api.mjs's own email-send-failed fall-through,
          // which already carries the real dir since api.mjs built it) is rethrown as-is.
          const code = err?.catalogue?.code;
          if (code === 'email-sender-propagating' || code === 'email-daily-limit') {
            sendWaitError = cloudflareError(code, { dir });
            log(sendWaitError.message);
            return;
          }
          if (code === 'email-sender-unavailable') {
            throw cloudflareError(code, { dir, domain });
          }
          throw err;
        }
      },
    );
    if (!dryRun && sendWaitError) {
      return { outcome: sendWaitError.catalogue.code, domain, message: sendWaitError.message };
    }

    // --- Sender address, then one deploy. Both skip when the address is already correct, so a
    // park-and-resume never buys a second deploy; cairn.config.ts is bundled at build time (unlike
    // writePublicOrigin's wrangler.jsonc var, which is read at runtime), so the redeploy needs a
    // fresh build first.
    let addressChanged = false;
    await runStep(
      frame,
      'Update your sign-in email address',
      `Writes ${from} into your site's config as its sign-in sender, then builds and redeploys so ` +
        'the running site carries it. Skipped once the address is already correct.',
      async () => {
        addressChanged = await writeEmailFrom(dir, from);
        if (!addressChanged) return;
        await buildSite({ dir, log });
        await deployWorker({ dir, log, accountId });
      },
    );
    if (!dryRun) {
      await updateSite(siteId, { cloudflare: { emailFrom: from } });
    }

    // --- Completion: email-live is recorded and the token is deleted, the terminal step this
    // chapter was building toward.
    await runStep(
      frame,
      'Finish setting up email',
      'Prints your sign-in sender address and how to check it again later.',
      async () => {
        log(
          `Cloudflare accepted a real test message sent from ${from}, your site's own sign-in ` +
            "sender. Change that address any time by editing email: { from: '...' } in " +
            'src/theme/cairn.config.ts and redeploying.\n' +
            'A domain this new has no sending history yet. As of 2026-08-12, that means mail ' +
            'providers can take a while to trust it enough to deliver its first messages. That ' +
            'trust builds on its own as the domain keeps sending. If a sign-in link does not ' +
            'arrive yet, this warm-up period is the usual reason.\n' +
            `Onboarding also wrote a DMARC policy at _dmarc.${domain}, set to reject mail that ` +
            "isn't from Cloudflare's own sending infrastructure. That record stays in place even " +
            'if you turn Email Sending off again, so if you add a newsletter tool or mailing list ' +
            'to this domain later, add it to that record too, or its mail will be rejected.\n' +
            `Run npx cairn-doctor --from ${from} --send-test <you@example.com> to check the ` +
            'sending path any time, without running this installer.\n' +
            'One more step is available: run npx create-cairn-site --dir ' +
            `${dir} --connect to connect this repository to Cloudflare Workers Builds, so every ` +
            'future commit to your default branch deploys itself, no laptop required.',
        );
      },
    );

    if (!dryRun) {
      await updateSite(siteId, { step: 'email-live' });
      await deleteApiToken(siteId);
    }

    if (dryRun) {
      return { outcome: 'dry-run' };
    }
    return { outcome: 'email-live', domain };
  } catch (error) {
    // The catalogue survives only on `error.cause`: runActions (runner.mjs) rewraps a thrown
    // error with its action's title before it ever reaches this catch (this module's own tests
    // already work around the same rewrap by asserting on the message, not `err.catalogue`).
    const code = error?.cause?.catalogue?.code;
    if (!dryRun && (code === 'token-scope-missing' || code === 'token-invalid')) {
      // A re-run re-collects a token instead of silently reusing one that fails the same way
      // again; every other thrown row (a park, a decline, any other act row) is untouched.
      await deleteApiToken(siteId);
    }
    throw error;
  }
}
