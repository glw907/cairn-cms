// Chapter 2's orchestrator: the guided path from `live` (chapter 1's finish line) to serving on
// the admin's own domain. It is the ONLY module in this chapter that writes `step` or calls the
// state store; every producer it drives (account.mjs, prefill.mjs, zone.mjs, records.mjs,
// hostname.mjs) is pure over an in-memory record and returns its outcome, exactly as the T4a plan
// requires. Modelled directly on chapter.mjs (T3's own orchestrator): the same runStep/runActions
// idiom carries the dry-run guarantee (a title always prints, a detail prints only under
// --dry-run, and execute never runs under --dry-run), and the same step-gated resume shape skips
// whatever a saved record already finished.
//
// New states, in order: zone-created -> records-carried -> delegated -> domain-live. A wait-class
// outcome (delegation still pending, the hostname still propagating, the certificate still
// issuing) is RETURNED, never thrown, and never advances `step`: a re-run re-detects from the
// same recorded step. Only an act or ask-someone row throws.
//
// TOKEN LIFECYCLE: the pasted API token is deleted at a TERMINAL step, not at domain-live.
// domain-live is this pass's last state, but it is not the chapter's last state: T4b's email half
// continues from here and needs the same credential, so deleting it at domain-live would strand
// that later work. TERMINAL_STEPS names the states that really are done (T4b's email-live and a
// recorded decline of the paid plan); reaching one deletes the token by an explicit whole-record
// rebuild and save, since state.mjs's own updateSite merge can never express removing a key. T4a
// implements the rule and its keep half (domain-live keeps the token); T4b exercises the delete
// half for real by adding those two states to TERMINAL_STEPS.
import { confirm as clackConfirm, text as clackText, select as clackSelect, isCancel } from '@clack/prompts';
import { resolveNs as systemResolveNs } from 'node:dns/promises';
import { exitOnCancel, promptSecret } from '../prompts.mjs';
import { defineAction, runActions } from '../runner.mjs';
import { updateSite, saveSite } from '../state.mjs';
import { ensureAccountId } from './account.mjs';
import { ensureApiToken } from './prefill.mjs';
import { makeApi } from './api.mjs';
import { ensureZone, checkDelegation, delegationInstructions } from './zone.mjs';
import { readCurrentRecords, carryOverRecords } from './records.mjs';
import { cutOverHostname } from './hostname.mjs';
import { cloudflareError } from './catalogue.mjs';
import { openBrowser as defaultOpenBrowser } from '../github/open.mjs';

/**
 * The states this pass's own step machine writes, in order, so a resumed record's remaining work
 * can be found by comparing indexes rather than repeating a chain of `if` checks.
 */
const STEP_ORDER = ['live', 'zone-created', 'records-carried', 'delegated', 'domain-live'];

/**
 * The step names that mean the chapter is fully done and the pasted token has no more work left
 * to do. Neither name is reachable through this pass's own step machine yet: T4b adds `email-live`
 * and a recorded decline of the paid plan. Named here, ahead of that work landing, so the delete
 * half of the token lifecycle rule is proven now by a synthesized record rather than guessed at
 * later.
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
 * directly, the same scrub `retireSite` already performs when a record is set aside.
 * @param {string} siteId the site id to save under
 * @param {object} record the current in-memory record, already carrying `cloudflare.apiToken`
 * @returns {Promise<void>}
 */
async function deleteApiToken(siteId, record) {
  if (!record?.cloudflare || !('apiToken' in record.cloudflare)) return;
  const { apiToken: _apiToken, ...cloudflareWithoutToken } = record.cloudflare;
  await saveSite(siteId, { ...record, cloudflare: cloudflareWithoutToken });
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

/**
 * @typedef {object} RunChapter2Input
 * @property {string} siteId the site's state-store id; the only id this module ever writes under
 * @property {object | null} record the site's current in-memory state record, already loaded by
 *  the caller (mirrors the `{ record, ... }` pure-step shape every producer above takes); `null`
 *  under --dry-run, chapter 1's own `dryRun ? null` precedent
 * @property {string} dir the scaffolded directory, used in printed copy; read independently of
 *  `record.dir` so a dry run with no record still has it
 * @property {{ yes: boolean, domain?: string }} args the parsed CLI flags this chapter reads:
 *  `yes` for an unattended run, `domain` carrying both the value and the unattended opt-in
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
 *  `'delegation-propagating'` | `'hostname-propagating'` | `'certificate-pending'` |
 *  `'domain-live'` | `'dry-run'`, or, for a record already at one of TERMINAL_STEPS, that step's
 *  own name. A delegation park also carries the row's own `state` and printed `message`
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
    await deleteApiToken(siteId, record);
    return { outcome: record.step };
  }

  let domain = record?.cloudflare?.domain;
  let accountId = record?.cloudflare?.accountId;
  let zoneId = record?.cloudflare?.zoneId;
  let nameServers = record?.cloudflare?.nameServers;
  let alreadyActive = record?.cloudflare?.alreadyActive ?? false;
  let token = record?.cloudflare?.apiToken;

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
  if (!hasReached(record?.step, 'records-carried')) {
    let declined = false;
    let carryOver;
    await runStep(
      frame,
      'Copy your current DNS records',
      "Looks up your domain's current DNS records and, once you confirm, copies them into the " +
        'new zone so nothing already working (like your mail) breaks when you switch over.',
      async () => {
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

  // --- Completion: reached once the cutover just succeeded or a resumed record was already at
  // `domain-live`. domain-live is not terminal (TERMINAL_STEPS above), so the token survives this.
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

  if (dryRun) {
    return { outcome: 'dry-run' };
  }
  return { outcome: 'domain-live', domain };
}
